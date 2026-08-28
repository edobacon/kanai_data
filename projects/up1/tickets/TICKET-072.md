---
id: TICKET-072
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1270
module: layout
autopilot: autonomous
---

# Implement: primitivo `prefilledModal` + `deepClone` en el clone del layout-engine (opción A de D5)

## Request

Pre-construir y de-riesgar el **primitivo de core** que el clone profundo de Curriculum (UPONE-1270, TICKET-065) necesitará el próximo sprint, validándolo **ahora** sobre un objeto existente que ya tiene hijos (no se puede usar Curriculum porque `planEntry` aún no existe).

Hoy `cloneStrategy: "prefilledModal"` abre un modal de creación con el campo único vacío pero **copia solo campos escalares** (`RecordList.vue:2720-2738`) → **no clona hijos**. El path de `deepClone` (que sí clona hijos) crea inmediato, **sin** modal/campo vacío. No se pueden tener ambos (tensión D5 #1). La **opción A** (decisión 2026-06-11, `sp4/ongoing.md` D5): extender `prefilledModal` para que, **al guardar**, dispare un `createInstance` que incluya `prefillFrom.deepClone` → backend clona padre + hijos atómicamente. El motor `deepClone` server-side **ya existe** (lo usan el clone de CurricularSection y el version de activity); falta el **cableado** en `layout/`.

**Requisito explícito del dev**: implementar el fix + una **modificación temporal de prueba** sobre un objeto existente para validar el caso end-to-end, y al terminar **dejar el objeto de prueba exactamente como estaba originalmente** (revertir el andamio).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement (nuevo primitivo de clonado en el layout-engine) |
| Tipo de cambio | single-core (`layout/`), con andamio temporal en `mods/curriculum-design/config/layouts/default_Activity_list.json` (se revierte) |
| Módulo principal | layout (layer: core) |
| Módulos afectados | layout (`RecordList.vue`/`RecordDetail.vue` — disparo del deepClone en el submit del prefilledModal). curriculum-design SOLO como **banco de prueba temporal** (rowAction de clone en activity), revertido al cierre. object-manager: motor `deepClone` ya existe (se reusa, no se modifica). |

## Creation scope

Ambos `false`: no crea UI nueva (extiende el comportamiento de un primitivo existente) ni modela datos nuevos.

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | no | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `prefilledModal` hoy copia solo escalares + campos `rt__` y no dispara `deepClone` | ✓ confirmada | `RecordList.vue:2720-2738` (`typeof v !== 'object'` + flatten de `rt__`; sin manejo de hijos). D5 #1 (`sp4/ongoing.md`). |
| H2 | El motor `deepClone` transaccional ya existe server-side y se reusa (no se reimplementa) | **confirmada PARCIAL (gap)** | Motor existe y es genérico: bloque deepClone `instance.resolver.js:3174-3238` (poly + direct + derived). PERO es **atómico solo en el path `asNewVersion`** (`$transaction` Serializable, L3257-3258); el path de **clone puro** (sin `asNewVersion`) corre `finalizeCreate(prisma)` **sin transacción** (L3260). Ver Discovery D-01. |
| H3 | La opción A = el submit del `prefilledModal` incluye `prefillFrom.deepClone` → un solo `createInstance(prefillFrom:{source, deepClone:[...]}, data:{<unique>: nuevo})` atómico | **refutada parcial** | El `createInstance` con `prefillFrom.deepClone` SIN `asNewVersion` NO es atómico (L3260) y NO setea el estado workflow inicial. La atomicidad + estado inicial solo existen hoy en el path `asNewVersion` (que además encadena versión: linkage + bump — semántica incorrecta para un clon independiente). Ver D-01/D-02. |
| H4 | Objetos workflow-backed (activity) requieren `currentStatusId` inicial; el path `prefilledModal` lo setea vía `getInitialStatus`, el `deepClone` directo no (tensión D5 #4) — el primitivo debe preservar el estado inicial | **confirmada (gap real)** | `activity.json:28-32` pone `currentStatusId` en `prefillFrom.exclude` → en clone puro NO se hereda del source. `prepareVersionData` (que lo resetea a `source.workflow.initialStatusId`, `version-from-source.js`) **solo corre si `asNewVersion`** (`instance.resolver.js:2502-2506`). En clone puro el clon nace con `currentStatusId` nulo. `getInitialStatus` es un helper del **mod** (`mods/curriculum-design/logic/helpers/`), NO lo importa el core. Ver D-02. |

### Discoveries (inmutables — DET-6)

| # | Timestamp | Discovery | Evidencia | Impacto |
|---|-----------|-----------|-----------|---------|
| D-01 | 2026-06-18 | El motor `deepClone` del core es **atómico solo en el path `asNewVersion`**. El clone puro (`prefillFrom.deepClone` sin `asNewVersion`) crea padre + hijos **sin transacción** → un fallo a mitad deja un clon huérfano con hijos parciales. | `instance.resolver.js:3257-3260` (`if (asNewVersion) $transaction(...)` else `finalizeCreate(prisma)`). | TC-1 exige "atómico, un solo createInstance". El cableado en `layout/` solo NO logra atomicidad — requiere cambio en core (object-manager). |
| D-02 | 2026-06-18 | El estado workflow inicial (`currentStatusId`) en el clon **solo se resuelve en el path `asNewVersion`** (vía `prepareVersionData` → `source.workflow.initialStatusId`). En clone puro, `currentStatusId` está en `exclude` (no se hereda) y nada lo resetea → el clon de un objeto workflow-backed nace **sin estado**. | `instance.resolver.js:2502-2506`; `helpers/version-from-source.js`; `activity.json:28-32`. | H4/tensión D5 #4 CONFIRMADA como gap real. El primitivo necesita setear el estado inicial en el path de clone, lo que hoy NO existe en core. |
| D-03 | 2026-06-18 | El **RT early-return** (`instance.resolver.js:2510-2682`) retorna ANTES del bloque deepClone (L2681) → para objectTypes RT-projected (`rt__*`, ej. clone de Modality/CurricularSection-as-RT) el `prefillFrom.deepClone` se **ignora silenciosamente**. `activity` se crea como objectType base `Activity` (no RT-projected) → SÍ alcanza el bloque deepClone, por eso el banco de prueba activity es válido para el path no-RT. | `instance.resolver.js:2509-2682` (early-return) vs 3174 (deepClone). | Limita el alcance del primitivo: el clone profundo NO funciona para RT-projections sin un fix adicional al early-return. Fuera de alcance de este ticket (anotarlo). |
| D-04 | 2026-06-18 | El **target real (Curriculum)** del próximo sprint **NO es workflow-backed**: su `versioning` no tiene `initialStateField`; el estado es el campo `status` con `static_default: "Draft"` (se setea solo al crear) y está en `prefillFrom.exclude`. → El gap de estado workflow (D-02/H4) **NO aplica a Curriculum**; es un artefacto exclusivo del banco de prueba `activity`. El gap de **atomicidad (D-01) sí aplica a ambos**. Hoy Curriculum tiene `polymorphicChildren: []` / `directChildren: []` (planEntry aún no existe). | `curriculum.json` (versioning sin initialStateField; `status static_default "Draft"`; children vacíos). | Reframe del ticket: elegir activity como banco fuerza resolver un problema (estado workflow inicial) que el target real no tiene. Lo genuinamente compartido y de-riesgable es: (a) el cableado layout prefilledModal→deepClone, (b) la **atomicidad** del clone puro. |

### Context found

- **Specs/decisiones**: `projects/up1/sp4/ongoing.md` (D3/D4/D5/D6 — diseño del clone/version del Plan); `sp4/implementation-guide.md` (UPONE-1270 + follow-up deep clone).
- **Banco de prueba**: `activity` ya declara `prefillFrom.deepClone: ["sections"]` + `versioning` + es workflow-backed + tiene `code` (`mods/curriculum-design/objects/activity.json:27-31`) y tiene **secciones reales en el seed** → misma forma que tendrá `curriculum+planEntry`. `CurricularSection` (`deepClone: ["children"]`) es alternativa sin workflow.
- **Code refs**: `layout/src/layouts/RecordList.vue:2720-2738` (prefilledModal solo-escalares), `RecordDetail.vue:handleSubmit` (post TICKET-067, ya filtra campos virtuales). Motor: `object-manager/.../instance.resolver.js` (deepClone existente).
- **Warnings**:
  - **TICKET-044**: `activity` se dejó **version-only** a propósito para evitar la combinación version+deepClone+workflow+unicidad. Usar activity aquí es **andamio de prueba**, NO un feature a shippear en activity → **revert obligatorio** (REQ-REVERT).
  - **RULE-dev-004**: layer:core → el trabajo de `layout/` va en la rama de épica core (no `develop`), merge-gated por el team up1.
  - **TICKET-067** (dependency): el fix de payload de `RecordDetail.handleSubmit` debe estar presente para que el clone vía prefilledModal no mande campos virtuales.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | rama de épica core de `layout/` (la vigente, ej. `UPONE-1271-recorddetail-payload-fix` o una nueva `UPONE-1270-*`) — NO `develop` (RULE-dev-004) |
| Base branch | develop |
| DB state | tenant UPU con seed (activity con secciones); reset limpio reciente |
| Services | object-manager (`:4000`) + suite (`:3000`) |
| Test data | una `activity` (recordType Course) con ≥1 `CurricularSection` en el seed |

## Solución propuesta (opción A de D5)

1. **Core `layout/`**: extender el handler de `cloneStrategy: "prefilledModal"` para que, al guardar el modal, emita un `createInstance` que incluya `prefillFrom: { source, deepClone: [...] }` (tomando los `deepClone` declarados en el objeto) + `data: { <uniqueField>: <valor nuevo> }`. Preservar el estado inicial workflow (H4). Sin reimplementar el motor `deepClone` (reuso, DET-16/DET-11).
2. **Andamio de prueba (temporal)**: agregar un rowAction de clone (`prefilledModal` + `deepClone`) a `default_Activity_list.json` para validar end-to-end sobre activity+secciones.
3. **Validación**: clonar una activity con secciones → modal con `code` vacío → guardar → nueva activity (Draft) + secciones clonadas atómicamente. Regresión: AcademicProgram clone (sin hijos) y activity version (asNewVersion) siguen OK.
4. **REVERT (REQ-REVERT, bloqueante de cierre)**: restaurar `default_Activity_list.json` a su estado original (sin el rowAction de prueba). `git diff` de curriculum-design debe quedar **sin residuos** del andamio.

## Testing

### Test cases (preliminares — se ejecutan en execute, DET-25)

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Status |
|---|------|-----|------|------------|-------------|-------|----------|--------|
| TC-1 | Clone profundo vía prefilledModal sobre activity+secciones | REQ-IMPL-01 | manual | yes | activity con ≥1 sección; andamio de prueba activo | rowAction clone → modal code vacío → completar → guardar | nueva activity Draft + secciones clonadas (ids nuevos), atómico, un solo createInstance | pending |
| TC-2 | Regresión: AcademicProgram clone (prefilledModal sin hijos) sigue OK | REQ-PRESERVE-01 | manual | yes | layout con 067 | clonar academicProgram | clon OK, sin hijos, code vacío→nuevo | pending |
| TC-3 | Regresión: activity version (asNewVersion) sigue OK | REQ-PRESERVE-02 | manual | yes | — | "Crear nueva versión" en activity | v+1 encadenada, mantiene code, arrastra secciones | pending |
| TC-4 | Estado workflow inicial correcto en el clon (H4) | REQ-IMPL-01 | manual | no | TC-1 ejecutado | inspeccionar `currentStatusId` del clon | estado inicial vía getInitialStatus (no copiado del source) | pending |
| TC-5 | **REVERT**: activity_list.json restaurado a original | REQ-REVERT | auto | no | TC-1..TC-4 ejecutados | revertir andamio + `git diff` | sin residuos del rowAction de prueba en curriculum-design | pending |

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-18 | false → super | dev trigger `super autopilot` | S1 (proximo gate) |

### Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Implementar opción A (core layout: prefilledModal dispara deepClone al guardar) + andamio de prueba en activity + validar TC-1..TC-4 + revertir andamio (TC-5) | 1 | T3 | wiring en RecordList/RecordDetail; rowAction temporal en activity_list; smoke UI clone profundo; regresiones; revert | ⚑ fuerte | TC-1..TC-5 verdes + reviewer pass + andamio revertido sin residuos |

**Notas del plan**: layer:core (rama de épica de layout, no develop). El motor deepClone se reusa (no se reimplementa). H4 (estado workflow) es el riesgo principal — validar temprano. Andamio de prueba en activity es temporal (TICKET-044 lo dejó version-only) → REQ-REVERT bloquea el cierre si queda residuo.

> **S1 NO EJECUTADA (ticket diferido — 2026-06-18).** No se abrió session ni se escribió código. La investigación de pre-design (lectura de `instance.resolver.js`, `activity.json`, `curriculum.json`, `RecordList.vue`, `RecordDetail.vue`) produjo los discoveries D-01..D-04 que refutaron la premisa y motivaron el diferimiento. Ningún TC ejecutado (todos quedan `pending` → no aplican; se re-evaluarán contra el objeto real en el follow-up B1).

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Construir+aplicar el primitivo a Curriculum (`deepClone: ["planEntry"]`) cuando exista planEntry | nuevo | sp4/ongoing.md D3/D5 | nada construido (072 diferido); discoveries D-01..D-04 como base | próximo sprint con planEntry: (a) **core object-manager** — atomicidad del clone puro (`$transaction`), object-agnóstico [D-01]; (b) **layout** — plomería de `prefillFrom.source` en submit del prefilledModal (`RecordList.vue`+`RecordDetail.vue`); (c) **mod** — `prefillFrom.deepClone:["planEntry"]` en `curriculum.json` + rowAction; (d) e2e en curriculum (NO workflow → estado-workflow D-02 no aplica). Banco = objeto real, no activity. | should (próximo sprint) |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|

## Teaching — Intake

**Status**: skipped
**Razon**: cerrado como diferido antes de design/execute — sin implementación; el conocimiento son los discoveries D-01..D-04 ya registrados en el ticket

## Teaching — Close

**Status**: skipped
**Razon**: idem — sin ejecución que enseñar

## Summary

**Cerrado como DIFERIDO — no cubierto en SP4 (2026-06-18).** No se produjo código ni spec.

El ticket buscaba pre-construir el primitivo `prefilledModal` + `deepClone` validándolo sobre `activity` (banco de prueba). La investigación de pre-design refutó la premisa central:

- **Lo que cambia en cada capa (verificado):** layout = plomería de `prefillFrom.source` en el submit del modal (2 archivos: `RecordList.vue` + `RecordDetail.vue`), workflow-agnóstico; mod = un rowAction declarativo en `default_Activity_list.json`; el `deepClone: ["sections"]` lo une el backend desde `activity.json` (L2426). **Layout y mod NO tocan workflow.**
- **El gap real está en object-manager (no fenceable):** el clone puro (sin `asNewVersion`) **no es atómico** (D-01) y **no setea estado workflow inicial** (D-02). El primitivo "solo-layout" NO produce un clon correcto para objetos workflow-backed.
- **El target real (Curriculum) no es workflow-backed** (D-04) → el banco `activity` valida un caso (estado workflow) que el objetivo no necesita; lo genuinamente compartido es el cableado + la atomicidad.

**Decisión del dev:** no tomarlo en SP4. La forma final del objeto que lo usará (Curriculum + planEntry) no existe aún → implementarlo ahora es adivinar el contrato (YAGNI, alineado con D3). Se retoma vía **Backlog B1** cuando `planEntry` exista, usando el objeto real como banco. El estimado del follow-up debe incluir el cambio de core (object-manager), no solo layout.

**Conocimiento preservado:** discoveries D-01..D-04 (en este ticket) + corrección anotada en `sp4/ongoing.md` §D5 (la "semántica transaccional resuelta" era incorrecta para el clone puro).

**Teach intake/close:** skipped (ticket diferido sin ejecución — sin implementación que enseñar).
