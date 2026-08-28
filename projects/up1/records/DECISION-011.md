---
id: DECISION-011
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - multi-tenant
  - tenants
  - infraestructura
  - decision-final
---

# DECISION-011: DECISION FINAL — Usar tenants existentes `TEST` y `UPU`. Datos Univalle/AIEP conviven con seed core sin conflicto.

> ⚠️ **SUPERSEDED por [DECISION-012](DECISION-012-two-phase-tenant-rollout.md)** (2026-04-28).
>
> Investigacion posterior sobre el proposito de TEST/UPU (TEST=sandbox volatil, UPU=demo oficial) y el hecho que SP1 NO usa capacidades por tenant llevaron al usuario a decidir un rollout de 2 fases: Fase 1 (SP1) carga todo en UPU sin probar aislamiento multi-tenant; Fase 2 (post-SP1) separa por tenant cuando haya mas contexto sobre infra. DECISION-012 es la decision **final para SP1**.
>
> Esta decision se mantiene como referencia historica del razonamiento "TEST/UPU divididos coexisten bien" — sigue siendo valida y puede aplicarse en Fase 2 si esa es la opcion elegida.

## Resumen ejecutivo

**Tenants para SP1: `TEST` y `UPU` (existentes).** NO se crean tenants dedicados. Los datos del mod `curriculum-design` (Univalle/AIEP) conviven con el seed core de cada tenant en la misma DB sin generar conflicto tecnico ni deuda significativa.

Esta decision **cierra** la cadena DECISION-003 → DECISION-009 → DECISION-010, tras tres reconsideraciones el mismo dia (2026-04-28) impulsadas por informacion incremental.

## Contexto y trazabilidad

| Hora | Decision | Motivacion | Estado |
|------|----------|-----------|--------|
| 2026-04-27 | [DECISION-003](DECISION-003-tenant-ids.md) — UNIVALLE + AIEP | Convencion uppercase, mapeo limpio cliente↔tenant | superseded |
| 2026-04-28 ~10:00 | [DECISION-009](DECISION-009-use-existing-tenants.md) — TEST + UPU | Sugerencia de Juan Diego en reunion: evitar overhead infra | superseded |
| 2026-04-28 ~14:00 | [DECISION-010](DECISION-010-revert-to-dedicated-tenants.md) — revertir a UNIVALLE + AIEP | Investigacion reveló que TEST/UPU tienen seed core con datos pre-existentes; asumi convivencia generaba deuda creciente | superseded |
| 2026-04-28 ~17:00 | **DECISION-011** (esta) — TEST + UPU | Analisis tecnico mostro que el supuesto "deuda creciente" estaba sobreestimado. Coexistencia es robusta. | **accepted** |

## Que cambio el analisis tecnico

DECISION-010 asumio que los datos del mod se mezclarian con los del seed core. **Investigacion posterior demostro que el aislamiento es robusto en 4 capas**:

### Capa 1: Tablas distintas (sin colision a nivel DB)

Los 4 objetos del mod son nuevos — no existian en TEST ni UPU:

| Tenant | Objetos del seed core | Objetos del mod (nuevos) |
|--------|----------------------|--------------------------|
| **TEST** | Experiment, LabEquipment, Service, Person... | AcademicActivity, CurricularSection, CurricularLink, BibliographyReference |
| **UPU** | Person (100), Campus (3), Faculty, Career, Course (existente)... | AcademicActivity, CurricularSection, CurricularLink, BibliographyReference |

Postgres genera tablas nuevas. Cero solapamiento de filas con datos del core.

### Capa 2: Sidebar separa visualmente los mods

Cada mod tiene su propio item en el sidebar de UP1. Click en "Curriculum Design" → solo objetos del mod. El usuario nunca ve `Experiment` al lado de `AcademicActivity`.

### Capa 3: Listados filtran por objeto + tenantId

```sql
SELECT * FROM academic_activity WHERE tenantId = 'TEST'
```
→ devuelve solo el programa Univalle. No mezcla con `experiment` ni `lab_equipment`.

### Capa 4: Unico punto de contacto — tabla `Institution` (compartida)

`BibliographyReference.institutionId` apunta al objeto core `Institution`. El seed del mod necesita crear instancias adicionales:

```js
// mods/curriculum-design/seed/univalle-data.js — corre sobre tenant TEST
await prisma.institution.upsert({
  where: { code: 'UV' },
  create: { code: 'UV', name: 'Universidad del Valle', country: 'CO', tenantId: 'TEST' },
  update: {}  // si ya existe, no la modifica
});
```

**Resultado en `Institution` del tenant TEST**:
- `(lo que tenga el seed core de TEST)` ← preexistente
- `UV` / "Universidad del Valle" ← agregada por el mod

Ese es el unico "ruido" real, confinado a 1 tabla compartida.

## Mapeo simbolico Univalle/AIEP → TEST/UPU

| Tenant | Datos del mod cargados | Origen legacy |
|--------|------------------------|---------------|
| **`TEST`** | Universidad del Valle | `aa-uv-1124` Ecuaciones Diferenciales |
| **`UPU`** | AIEP | `aa-aiep-14757` Introduccion a las Redes |

Mapeo elegido: TEST→Univalle (laboratorio core es relativamente vacio), UPU→AIEP (uPlanner University core es mas complejo, alineado con AIEP que tambien es mas voluminoso). Razonamiento simetrico — pero ambos asignaciones funcionan.

## Como identificar visualmente los datos durante validacion

Como el TENANT_ID NO refleja al cliente real, los testers necesitan **identificar por contenido**, no por tenant.

### Identificadores por capa

| Capa | Univalle (en TEST) | AIEP (en UPU) |
|------|--------------------|----|
| TENANT_ID (header / URL) | `TEST` | `UPU` |
| `AcademicActivity.name` | "Ecuaciones Diferenciales" | "Introduccion a las Redes" |
| `AcademicActivity.code` | (codigo Univalle real) | (codigo AIEP real) |
| `AcademicActivity.externalId` | `aa-uv-1124` | `aa-aiep-14757` |
| `Institution.name` (FK desde Bibliography) | "Universidad del Valle" | "AIEP" |
| `Institution.code` | `UV` | `AIEP` |
| Volumen Modality | 1 | 13 |
| Volumen LearningOutcome | 3 | 40 |
| Volumen Sessions | 18 | (sin Sessions en seed AIEP) |
| Volumen Content | (sin Content en seed Univalle) | 3 |

### Convencion de validacion en tests

Los test cases NO identifican datos por TENANT_ID. Identifican por **contenido distintivo**:

```js
// ❌ MAL — asume mapeo TENANT==cliente
expect(tenant).toBe('UNIVALLE');

// ✅ BIEN — verifica contenido distintivo
const programa = await fetchAcademicActivity(tenantId);
expect(programa.name).toBe('Ecuaciones Diferenciales');
expect(programa.externalId).toBe('aa-uv-1124');
```

### Estrategia de aislamiento en tests

Cada test case especifica:
1. **Tenant del header**: `TEST` o `UPU`
2. **Programa esperado**: por `name` o `externalId` (no por tenant)
3. **Volumen esperado**: cantidad de cada RT (1 vs 13 Modalities, etc.)

## Acciones inmediatas (alineadas con DECISION-011)

Reemplaza el pre-requisito de DECISION-010:

❌ ~~Coordinar con Juan Diego para crear UNIVALLE/AIEP~~
❌ ~~Ejecutar `npm run tenant:create UNIVALLE/AIEP`~~

Acciones reales:

1. **NO ejecutar `tenant:create`**. TEST y UPU ya estan operativos.
2. En `mods/curriculum-design/config/app.json` declarar:
   ```json
   {
     "name": "curriculum-design",
     "tenants": ["TEST", "UPU"],
     ...
   }
   ```
3. Crear seed del mod en `mods/curriculum-design/seed/`:
   ```
   seed/
   ├── seed.js                   ← entrypoint que detecta tenant activo
   ├── data-univalle.js          ← carga si tenant === TEST
   └── data-aiep.js              ← carga si tenant === UPU
   ```
   Usar `upsert` en cada insercion para idempotencia (no destruye seed core).
4. `npm run sync` (desde `up1/`) → Phase 7 ejecuta el seed del mod sin tocar seed core.

## Consideraciones para otros equipos

Otros equipos que usen TEST o UPU como sandbox veran:
- 2 instancias adicionales de `Institution` ("Universidad del Valle" en TEST, "AIEP" en UPU)
- 4 nuevos mods/objetos en su navegacion: AcademicActivity, CurricularSection, CurricularLink, BibliographyReference

Si esto causa fricción con algún equipo, evaluar:
- Filtros visuales por `code` o `tenantId` en sus pruebas
- Documentar claramente que TEST/UPU son ambientes compartidos con datos de varios mods

Comunicar a Juan Diego la decision via mensaje corto antes de iniciar TICKET-006:

> "Edu: Tras analizar bien la coexistencia, vamos a usar TEST y UPU como sugeriste — los datos del mod conviven sin conflicto con el seed core (tablas distintas + filtros por objeto + Institution con upsert). El unico ruido es 2 Institutions extras. Si tu equipo o algún otro depende de Institution en TEST/UPU, dejame saber. Procedo con el seed del mod."

## Consecuencias positivas (vs DECISION-010 / crear UNIVALLE/AIEP)

- Cero overhead de infra. No `tenant:create`.
- Working tree del repo up1 NO se ensucia con archivos generados en `objects/tenants/UNIVALLE/`, `prisma/UNIVALLE/`, `Dockerfile`, `mod JSONs` (Phase 9 NO se dispara).
- No requiere coordinar con plataforma para crear DBs.
- Sin riesgo de fallar `tenant:create` con working tree sucio.

## Consecuencias negativas

- TENANT_ID no refleja al cliente real → mapeo mental sostenido (TEST=Univalle, UPU=AIEP).
- Tabla `Institution` en TEST y UPU tendran instancias adicionales que otros equipos podrian ver.
- Si en futuro arranca piloto real Univalle o AIEP, requerira migrar datos a tenants dedicados (cost: re-seed en tenants nuevos).

## Que cubre y NO cubre

### Cubre
- Decision final sobre tenants para SP1.
- Mapeo simbolico Univalle/AIEP → TEST/UPU.
- Estrategia de identificacion en tests (por contenido, no por TENANT_ID).
- Proceso de carga de seed via `mods/curriculum-design/seed/`.

### NO cubre
- Decision sobre tenants para piloto real productivo (postergada).
- Estructura interna del seed.js del mod (a definir en TICKET-006).
- Mecanismo de validacion si otro equipo reporta fricción (caso a caso).

## Referencias

- [DECISION-003](DECISION-003-tenant-ids.md), [DECISION-009](DECISION-009-use-existing-tenants.md), [DECISION-010](DECISION-010-revert-to-dedicated-tenants.md) — toda la cadena queda documentada como historico
- Reunion 2026-04-28 — origen de la sugerencia TEST/UPU
- Investigacion Explore 2026-04-28 sobre seed core de TEST/UPU (4774 lineas en UPU, 353 en TEST)
- Analisis de coexistencia post-DECISION-010 (sesion fb88318a)
