---
id: DECISION-012
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - multi-tenant
  - tenants
  - infraestructura
  - decision-final
  - fase-1
  - fase-2
---

# DECISION-012: Rollout en 2 fases — Fase 1 valida modelo en `UPU` solo; Fase 2 (post-SP1) separa por tenant

## Resumen ejecutivo

**Fase 1 (SP1)**: Cargar TODOS los datos del mod (Univalle + AIEP) en un unico tenant `UPU`. Validar que el modelo, layouts, RecordTypes y funcionalidades funcionan correctamente. **NO** validar aislamiento multi-tenant.

**Fase 2 (post-SP1)**: Replicar separando por tenant. Decidir en su momento entre tenants dedicados (UNIVALLE/AIEP) o usar TEST/UPU divididos. Esa fase tendra contexto adicional sobre infra y comportamiento real del modelo.

Esta decision **supersede** DECISION-011 para SP1 — pero mantiene su intent estrategico (eventualmente habra separacion por tenant).

## Contexto y razonamiento del usuario

Cita: _"primero quiero ejecutar y revisar que el modelo y las funcionalidades funcionan en UPU, sin importar el seed de datos. Hasta ahora no estamos usando diferencias de tenant, mas alla de los datos que se cargan, pero no hay extensiones o capacidades propias de cada tenant. Si funciona todo ok, y logramos cumplir con lo esperado de los tickets, entonces podemos abarcar el replicar separando por tenant. Eso nos dara tiempo para averiguar mas sobre la infra de esos casos."_

## Cadena completa de reconsideraciones (todas el 2026-04-28)

| Hora | Decision | Postura | Estado |
|------|----------|---------|--------|
| 2026-04-27 | DECISION-003 | UNIVALLE + AIEP dedicados | superseded |
| ~10:00 | DECISION-009 | TEST + UPU (sugerido en reunion) | superseded |
| ~14:00 | DECISION-010 | revertir a UNIVALLE + AIEP (asume deuda) | superseded |
| ~17:00 | DECISION-011 | TEST + UPU (analisis tecnico de coexistencia) | superseded |
| **~18:30** | **DECISION-012** (esta) | **Fase 1: solo UPU; Fase 2: separar despues** | **accepted** |

## Drivers que justifican el plan de 2 fases

1. **SP1 NO usa capacidades por tenant**:
   - Sin Extensions per-tenant (`ext__<client>__<base>.json` postergadas)
   - Sin layouts per-tenant (todos globales por DECISION-007)
   - Sin i18n especifico per-tenant
   - Sin themes especifico per-tenant
   - Sin lógica condicional `if (tenantId === 'X')`
   - **La unica diferencia entre tenants es: que datos se ven**

2. **Validar primero "el modelo funciona", despues "es aislable"**:
   - Es mas eficiente confirmar que los 4 objetos + RTs + layouts + seed funcionan en un solo tenant antes de complicar con multi-tenant.
   - Si algo se rompe en multi-tenant, sera por aislamiento o por config — no por modelo.

3. **Tiempo para investigar infra**:
   - Aun no esta claro si crear UNIVALLE/AIEP dedicados es viable (working tree sucio, rama, coordinacion con Juan Diego, Phase 9 modifica Dockerfile).
   - Posponer la decision permite resolver bloqueos en paralelo sin demorar SP1.

4. **Reduce riesgo en SP1**:
   - Sin tenant:create. Sin reset de TEST. Sin coordinacion adicional.
   - El alcance de validacion se reduce a "modelo + funcionalidad", no incluye "aislamiento multi-tenant".

## Que se valida en Fase 1 (SP1)

### Validable con un solo tenant (UPU)

- ✅ Los 4 JSON Schema declarados correctamente
- ✅ Codegen genera Prisma + GraphQL sin errores
- ✅ FK polimorfica (`ownerType` + `ownerId`) funciona
- ✅ Self-FK (`previousVersionId`) funciona
- ✅ `workflowState` enum minimo funciona
- ✅ `externalId` nullable funciona
- ✅ `BibliographyReference.rawCitation` unico requerido funciona
- ✅ Seed carga sin errores (coexiste con seed core "uPlanner University" usando upsert)
- ✅ Listado de AcademicActivity renderiza con 2 cursos (Ecuaciones Diferenciales + Introduccion a las Redes)
- ✅ Detail renderiza secciones por RT
- ✅ RecordTypes globales ([DECISION-007](DECISION-007-recordtypes-global.md))
- ✅ Layout por RT funciona ([RISK-001](../specs/curriculum-design/risks/layouts-recordtype-untested.md) POC)
- ✅ Variabilidad visual: navegando entre los 2 cursos se ve 1 vs 13 Modalities (stress visual del layout)
- ✅ CustomSection schema fijo
- ✅ "Habilitacion" semana 18 como Session normal
- ✅ Coexistencia con seed core de UPU (uPlanner University intacta)

### NO validable con un solo tenant (postergado a Fase 2)

- ❌ Filtrado automatico por `tenantId` (BR-TNT-001) — solo aplicable con multi-tenant real
- ❌ Aislamiento entre tenants — no aplica
- ❌ Layouts globales sirven a multiples tenants — no se prueba
- ❌ Mod aparece en sidebar de varios tenants
- ❌ Switch de tenant cambia el listado
- ❌ Datos de un tenant no visibles desde otro

**Importante**: el modelo SI sera multi-tenant ready (codegen agrega `tenantId` automatico al schema). Solo no se valida en runtime hasta Fase 2.

## Configuracion de Fase 1

### `app.json` del mod

```json
{
  "name": "curriculum-design",
  "tenants": ["UPU"],
  ...
}
```

### Estructura del seed

```
mods/curriculum-design/seed/
├── seed.js               ← entrypoint, carga ambos data sets en UPU
├── data-univalle.js      ← carga curso aa-uv-1124 con tenantId='UPU'
└── data-aiep.js          ← carga curso aa-aiep-14757 con tenantId='UPU'
```

`seed.js` carga AMBOS data sets en UPU sin condicional por tenant. Idempotencia con `upsert` para cada Institution + AcademicActivity.

### Identificacion visual de Univalle vs AIEP en mismo tenant

Como ambos cursos comparten `tenantId='UPU'`, la diferenciacion visual es por **contenido del registro**:

| Identificador | "Univalle" (en UPU) | "AIEP" (en UPU) |
|---------------|----|----|
| `AcademicActivity.name` | `"Ecuaciones Diferenciales"` | `"Introduccion a las Redes"` |
| `AcademicActivity.externalId` | `aa-uv-1124` | `aa-aiep-14757` |
| `AcademicActivity.code` | (codigo Univalle real) | (codigo AIEP real) |
| `Institution` (via Bibliography) | `code='UV'`, `name='Universidad del Valle'` | `code='AIEP'`, `name='AIEP'` |
| Volumen Modality | 1 | 13 |
| Volumen LearningOutcome | 3 | 40 |
| Volumen Sessions | 18 | (sin Sessions) |
| Volumen Content | (sin Content) | 3 |

**Listado en `UPU`**: muestra **2 filas** (los 2 cursos). Tester valida visualmente:
- Fila 1: "Ecuaciones Diferenciales" → click → detail con 1 Modality
- Fila 2: "Introduccion a las Redes" → click → detail con 13 Modalities

**Stress visual de RISK-001 sigue siendo valido**: comparar el detail de los 2 cursos muestra la diferencia de 1 vs 13 Modalities, que es lo que probamos.

## Plan de Fase 2 (post-SP1)

Cuando se decida activar el aislamiento multi-tenant:

1. **Re-evaluar opciones** con contexto adicional:
   - Si la infra acepta tenants nuevos sin friccion → crear `UNIVALLE` y `AIEP` (Opcion G)
   - Si conviene reutilizar existentes → dividir TEST/UPU (Opcion A)
2. **Acciones de migracion**:
   - Mover Univalle de `tenantId='UPU'` al tenant destino (re-seed limpio)
   - Mover AIEP idem
   - Actualizar `tenants[]` en `app.json` del mod
   - Re-validar TCs de aislamiento (TC-006-17, 18; TC-007-09, 10; TC-009-25, 26 — todos marcados como Fase 2)
3. **Test cases adicionales** que se activan en Fase 2:
   - Aislamiento logico entre tenants
   - Switch de tenant cambia el listado
   - Mod visible en sidebar de ambos tenants
4. **Comunicar al equipo** antes de la migracion

## Consecuencias positivas

- Cero overhead de infra en SP1.
- Validacion del modelo desacoplada de aislamiento multi-tenant — bugs mas faciles de aislar.
- Tiempo para investigar la opcion correcta de Fase 2 (UNIVALLE/AIEP vs TEST/UPU).
- SP1 no se bloquea por los 4 issues de pre-flight (working tree, rama, etc.).
- Datos del mod se cargan en UPU (tenant estable, demo oficial) — minimo riesgo de perdida.

## Consecuencias negativas

- TICKET-007 y TICKET-009 cubren parcialmente el alcance multi-tenant — algunos TCs quedan postergados explicitamente.
- BR-TNT-001 (aislamiento por tenant) se valida solo a nivel modelo (codegen agrega tenantId), no a nivel runtime.
- Si en Fase 2 se descubre un bug de aislamiento, requerira fix retroactivo.
- Convivencia de datos del mod con seed core "uPlanner University" en UPU — manejable por upsert defensivo, pero amplia el alcance del demo de UPU para quien lo use.

## Comunicacion al equipo

Texto sugerido para Juan Diego:

> "Edu: Para SP1 voy a cargar todo en UPU y validar el modelo + funcionalidades primero. Multi-tenant lo separamos en una fase 2 — eso nos da tiempo para definir la mejor opcion (crear UNIVALLE/AIEP dedicados o dividir TEST/UPU). Hoy SP1 no usa Extensions ni layouts per-tenant, asi que validar aislamiento multi-tenant ahora seria validar algo que no aporta. ¿Te hace sentido?"

## Que cubre y NO cubre

### Cubre
- Decision sobre tenants en SP1: solo `UPU`.
- Estructura del seed: ambos data sets cargan en UPU.
- Identificacion visual por contenido (no por tenant).
- Postergacion explicita de TCs multi-tenant a Fase 2.

### NO cubre
- Decision final de Fase 2 (UNIVALLE/AIEP dedicados vs TEST/UPU divididos) — se reabre en su momento.
- Plan de migracion detallado de Fase 1 → Fase 2 — se prepara cuando arranque Fase 2.
- Timeline de Fase 2 — depende de SP1 + investigacion de infra.

## Referencias

- Cadena de decisiones previas: DECISION-003, DECISION-009, DECISION-010, DECISION-011 (todas superseded por esta)
- Investigacion sobre proposito de TEST/UPU (sesion fb88318a) — confirmo que UPU es estable, default, demo oficial
- DECISION-007 RTs globales (sigue aplicando)
- DECISION-006 CustomSection RT fijo (sigue aplicando)
