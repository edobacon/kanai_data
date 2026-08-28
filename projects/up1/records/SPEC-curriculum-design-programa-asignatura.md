---
id: SPEC-curriculum-design-programa-asignatura
project: up1
type: doc
module: curriculum-design
status: draft
tags:
  - curriculum-design
  - programa-asignatura
  - modelo-objetos
  - agregado
---

# Programa de asignatura — Modelo del agregado

## Multi-tenancy: rollout en 2 fases

> **Decision final SP2** ([DECISION-012](../../decisions/DECISION-012-two-phase-tenant-rollout.md), 2026-04-28): rollout en 2 fases.
> - **Fase 1 (SP2)**: cargar todo en `UPU` solo. Validar modelo + funcionalidad. NO se prueba aislamiento multi-tenant.
> - **Fase 2 (post-SP2)**: separar por tenant. Decidir entonces entre UNIVALLE/AIEP dedicados o dividir TEST/UPU.
>
> Razon: SP2 NO usa capacidades por tenant (sin Extensions, sin layouts/i18n/themes per-tenant, sin lógica condicional). La unica diferencia entre tenants seria los datos, asi que validar aislamiento ahora no aporta. Ver "Trazabilidad" al final.

### Tenant unico para SP2 (Fase 1)

| TENANT_ID | Datos del mod cargados | Notas |
|-----------|------------------------|-------|
| **`UPU`** | **Ambos**: Universidad del Valle (`aa-uv-1124`) + AIEP (`aa-aiep-14757`) | Convive con seed core "uPlanner University" |

**Por que UPU y no TEST**:
- UPU es estable, no se resetea. TEST es sandbox volatil (default `tenant:reset` lo soporta).
- UPU es el default en docker-compose, Storybook, batch-processor — el ambiente "vivo".
- TEST esta semanticamente reservado para laboratorio tecnico (Experiment, LabEquipment).

**Por que ambos en mismo tenant en SP2**:
- SP2 NO usa Extensions ni capabilities por tenant. La unica diferencia tenant-a-tenant seria los datos.
- Validar aislamiento multi-tenant en SP2 no aporta — se difiere a Fase 2 cuando haya capacidades distintivas.
- Reduce overhead: sin `tenant:create`, sin coordinacion con plataforma, sin riesgos de pre-flight.

### Pre-requisito (NO requiere crear tenants)

`UPU` ya esta operativo. ❌ NO ejecutar `npm run tenant:create`.

Validar antes de iniciar TICKET-006:
- `up1/object-manager/objects/tenants/UPU/` existe
- `.env` tiene `DATABASE_URL_UPU`

### Coexistencia con seed core de UPU — robusta en 4 capas

| Capa | Mecanismo | Resultado |
|------|-----------|-----------|
| 1. Tablas DB | Los 4 objetos del mod son nuevos (`Activity`, `CurricularSection`, `CurricularLink`, `BibliographyReference`). NO existian en UPU. | Postgres genera tablas nuevas. Cero solapamiento de filas con seed core (uPlanner University). |
| 2. Sidebar UP1 | Cada mod tiene su propio item de menu | "Curriculum Design" muestra solo objetos del mod. No mezcla con `Person`/`Faculty`/`Course` del demo de UPU. |
| 3. Listados/details | Query filtra por objeto + `tenantId` | Listado de Activity en UPU muestra los 2 cursos del mod, sin datos del demo core. |
| 4. Tabla `Institution` (compartida) | El seed del mod usa `upsert` con `code='UV'` y `code='AIEP'` | NO destruye instancias preexistentes ("uPlanner University"). Crea 2 filas adicionales para "Universidad del Valle" y "AIEP". |

**Unico ruido visible**: la tabla `Institution` en UPU tiene 2 filas extras (UV + AIEP) junto a la "uPlanner University" del seed core.

### Identificacion visual: ¿estoy viendo Univalle o AIEP?

Ambos cursos comparten `tenantId='UPU'`. La diferenciacion es por **contenido del registro**:

| Identificador | "Univalle" (en UPU) | "AIEP" (en UPU) |
|---------------|---------------------|----|
| `Activity.name` | `"Ecuaciones Diferenciales"` | `"Introduccion a las Redes"` |
| `Activity.externalId` | `aa-uv-1124` | `aa-aiep-14757` |
| `Activity.code` | (codigo Univalle real) | (codigo AIEP real) |
| `Institution.name` (FK desde Bibliography) | `"Universidad del Valle"` | `"AIEP"` |
| `Institution.code` | `UV` | `AIEP` |
| Volumen Modality | **1** | **13** ← delta visual claro |
| Volumen LearningOutcome | 3 | 40 |
| Volumen Sessions | 18 (incluye semana 18 "habilitacion") | (sin Sessions) |
| Volumen Content | (sin Content) | 3 |

**Listado en UPU muestra 2 filas** (ambos cursos). El tester valida visualmente:
- Click en "Ecuaciones Diferenciales" → detail con 1 Modality, 3 LO, 18 Sessions, 8 EvalComp, 9 Bib, 2 CustomSection
- Click en "Introduccion a las Redes" → detail con 13 Modalities, 40 LO, 3 Content, 1 EvalComp

**Stress visual de RISK-001 (1 vs 13 Modalities) sigue siendo valido** comparando los 2 details.

### Activacion del mod en `app.json` — Fase 1

```json
{
  "name": "curriculum-design",
  "tenants": ["UPU"],
  ...
}
```

Si la lista esta vacia, el mod **no aparece en el sidebar** ([rule-mods-007](../../rules/mods/rule-mods-007.md)).

En Fase 2 esto cambiara a `["UPU", "TEST"]` o `["UNIVALLE", "AIEP"]` segun la opcion elegida.

### Estructura del seed del mod (Fase 1)

```
mods/curriculum-design/seed/
├── seed.js               ← entrypoint, carga ambos data sets en UPU sin condicional
├── data-univalle.js      ← carga curso aa-uv-1124 con tenantId='UPU', upsert defensivo
└── data-aiep.js          ← carga curso aa-aiep-14757 con tenantId='UPU', upsert defensivo
```

**Idempotencia obligatoria**: cada insercion usa `upsert`. Critico para `Institution` (compartido con seed core de UPU).

```js
// data-univalle.js
const institution = await prisma.institution.upsert({
  where: { code: 'UV' },
  create: { code: 'UV', name: 'Universidad del Valle', country: 'CO', tenantId: 'UPU' },
  update: {}  // si ya existe, no la modifica
});

const programa = await prisma.academicActivity.upsert({
  where: { externalId: 'aa-uv-1124' },
  create: { externalId: 'aa-uv-1124', name: 'Ecuaciones Diferenciales', tenantId: 'UPU', /* ... */ },
  update: {}
});
```

En Fase 2, los archivos `data-univalle.js` y `data-aiep.js` se reutilizan cambiando `tenantId` al destino correcto.

### Que es global vs per-tenant en este mod

| Capa | Granularidad | Detalle |
|------|-------------|---------|
| Schema de los 4 objetos base | 🌐 Global | UN archivo `Activity.json` que sirve a TODOS los tenants (incluso si en SP2 solo hay 1) |
| RecordTypes declarados (TICKET-009) | 🌐 Global ([DECISION-007](../../decisions/DECISION-007-recordtypes-global.md)) | UN archivo `rt__Modality__curricularsection.json`. NO hay RTs duplicados per-tenant. |
| Datos (instancias) | 🏢 Per-tenant | En Fase 1: ambos cursos en UPU. En Fase 2: separar por tenant. Filtrado automatico por `tenantId`. |
| Layouts | 🌐 Global por defecto | El mismo layout sirve a todos. Si se requiere per-tenant en Fase 2: campo `tenants[]` en el JSON del layout |
| Extensions (futuras) | 🏢 Per-tenant | NO se usan en SP2. En Fase 2 se podria agregar `ext__<tenant>__<base>.json`. **Personalizaciones por cliente irian por aqui, NO via RTs** ([DECISION-006](../../decisions/DECISION-006-custom-section-fixed-rt.md)) |
| i18n (terminologia) | 🏢 Per-tenant | NO se usa per-tenant en SP2 |
| CSS / theming | 🏢 Per-tenant | NO se usa per-tenant en SP2 |

### Implicancia en el desarrollo (Fase 1 SP2)

- **TICKET-006**: el seed carga ambos data sets en UPU. `upsert` defensivo en `Institution` (UV + AIEP coexisten con "uPlanner University" del core).
- **TICKET-007**: el listado se prueba en UPU. Mostrar 2 filas (Ecuaciones Diferenciales + Introduccion a las Redes). Identificacion por `name`. **TCs de aislamiento entre tenants → Fase 2**.
- **TICKET-009**: el detail se prueba con ambos cursos en UPU para validar variabilidad (1 Modality del curso Univalle vs 13 Modalities del curso AIEP estresa el layout). El RISK-001 POC sigue valido.

### Trazabilidad de la decision

Cadena completa de reconsideraciones (todas el 2026-04-28):

| Hora | Decision | Motivacion | Estado |
|------|----------|-----------|--------|
| 2026-04-27 | [DECISION-003](../../decisions/DECISION-003-tenant-ids.md) — UNIVALLE + AIEP | Convencion uppercase, mapeo limpio cliente↔tenant | superseded |
| ~10:00 | [DECISION-009](../../decisions/DECISION-009-use-existing-tenants.md) — TEST + UPU | Sugerencia Juan Diego: evitar overhead infra | superseded |
| ~14:00 | [DECISION-010](../../decisions/DECISION-010-revert-to-dedicated-tenants.md) — revertir a UNIVALLE + AIEP | Asumi convivencia generaba deuda creciente | superseded |
| ~17:00 | [DECISION-011](../../decisions/DECISION-011-final-use-test-upu.md) — TEST + UPU (analisis coexistencia)
