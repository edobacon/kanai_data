---
id: SPEC-curriculum-design-fix-curriculum-recordtype-create
project: up1
ticket: TICKET-070
status: done
---

# Fix: crear Plan (Curriculum con RecordType) desde la UI delegando en `createInstance` de core

# Fix: crear Plan (Curriculum con RecordType) desde la UI delegando en `createInstance` de core

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements / Fix scope / Tasks. Si esto te basta, alcanza para aprobar.*

**Que se quiere**: hoy crear un Plan de estudios (`Curriculum` con `recordType = Plan`) desde la UI falla siempre — el formulario manda los campos propios del tipo Plan a la tabla base `curriculum`, donde no existen, y Prisma rechaza con *Unknown argument `progression`*. Queremos que ese form cree el registro correctamente (fila base + fila de extensión `rt__Plan__curriculum`) sin cambiar el formulario ni el picker de dueño, y 100% mod-only (sin tocar core).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Camino **D-delegar**: una mutation del mod (`createCurriculumWithRecordType`) que arma el alias `rt__<rt>__curriculum` y **delega** en `createInstance` de core | Reusa el split base/rt/extensión que core ya hace; cero lógica duplicada. Decisión del dev (2026-06-17), no se re-abre. |
| 2 | `customEndpoint` con `inputVariable: "data"` + `JSON!` + **campos enumerados** (no `source: "formData"` whole-object) | L1: el engine NO soporta whole-form; este es el único camino mod-only que produce un `data: JSON!`. |
| 3 | El resolver **reshapa** `InstanceResult { id, data }` → `{ id, ...data }` | `createInstance` no devuelve un `Curriculum` plano (RULE-mods-027); sin reshape el `customEndpoint` no lee `name`. |

**Riesgos principales y como los mitigamos**:

- **El dynamic import del `createInstance` de core falla desde el resolver del mod** → usamos el helper ya probado `loadGenericInstanceMutation` (dual-path) de `sectionValidation.resolver.js`; si presenta fricción de contexto/auth, se escala a camino B (Open question OQ-1).
- **El resolver acumula lógica de negocio y diverge del MCP** → invariante: adapter *thin*, solo traduce y delega; unit test verifica que no hay `prisma.create` propios.
- **Regression silenciosa en el path programático** (MCP/REST crean por el alias) → REQ-REGRESSION-01 + TC-3 verifican `createInstance(rt__Plan__curriculum)` directo intacto.

**Que NO se hace en este ticket**:

- Arreglar el caso latente `Activity/Service` de uengagement (mismo patrón) → backlog B2, se reporta a uengagement (DET-16).
- Promover el split base→alias dentro de `createInstance` de core (camino B, estructuralmente mejor) → backlog B1.
- Tocar el wizard RT-aware nativo del front (camino A) → fuera de scope mod-only.

**Tamano estimado**: 1 session (S1), ~1.5-2.5h efectivas. Riesgo concentrado en el primer hito (el resolver que delega).

**Como vas a saber que funciona**:

- Abro la suite, creo un **Plan** con campos Plan-only (progresión, créditos) y se crea sin error, con modal de éxito.
- En DB veo una fila en `curriculum` y una en `rt__Plan__curriculum`, con `totalCredits`/`totalPeriods` como enteros.
- Crear un **Minor** (sin campos propios) sigue funcionando, y crear por el alias directo (path MCP) no se rompe.

---

## Purpose

Corregir la creación de `Curriculum` con RecordType desde la UI ruteando el form genérico a una mutation del mod que delega en el `createInstance` genérico de core con el alias `rt__<recordType>__curriculum`. El fix es mod-only (curriculum-design): un resolver thin + su schema + un bloque `customEndpoint` en el layout de create existente. Reusa el split/validación/eventos/audit de core; no introduce lógica de negocio ni datos nuevos.

## Diagnostico

- **Causa raíz**: el form de create submitea `createInstance({ objectType: 'Curriculum', data: {...} })` (tabla base). El RT early-return de core (`instance.resolver.js:2508-2682`) que separa base/rt/extensión **solo** entra si `objectType` matchea el alias `rt__…` (`parseRecordTypeFileName`, `:2509`). Con `Curriculum` no entra → `prisma.curriculum.create()` plano → `Unknown argument progression` (campo de `rt__Plan__curriculum`).
- **Hipótesis** (ver Triage del ticket): H1 ✓, H2 ✓, H3 ✓ confirmadas; H4 ✗ refutada durante diseño (L1 — el engine no soporta `source: "formData"` whole-object).
- **Impacto**: todo usuario que intenta crear un Curriculum con un RecordType que declara campos propios (Plan). Minor (sin campos propios) podría no fallar, pero pasa por el mismo path corregido.

## Requirements

### REQ-FIX-01: crear Plan desde la UI persiste base + extensión

> **Que cambia**: al crear un Plan desde el formulario de Currículos, el registro se guarda sin error en vez de mostrar *«…Ubicación: > Progression»*.
> **Por que**: hoy los campos del tipo Plan se mandan a la tabla base y Prisma los rechaza.

El sistema MUST crear, al submitear el form de `Curriculum` con `recordType = Plan`, una fila en la tabla base `curriculum` y una fila en la tabla de extensión `rt__Plan__curriculum`, delegando en el `createInstance` de core con `objectType = rt__Plan__curriculum`.

**Actor**: admin
**Layers**: frontend (layout customEndpoint), backend (resolver del mod → core)

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear Plan con campos Plan-only
- **GIVEN** tenant UPU, rol Admin, layout `default_Curriculum_create` con `customEndpoint`
- **WHEN** el admin completa Tipo=Plan + nombre/código/estado/institución/dueño + progresión/créditos y guarda
- **THEN** se crea la fila base y la fila `rt__Plan__curriculum`, sin error Prisma, con modal de éxito

#### Scenario: error de tipo sin alias (regresión negativa que el fix elimina)
- **GIVEN** el form ruteado por `customEndpoint`
- **WHEN** se submitea un Plan
- **THEN** la mutation NO es `createInstance(Curriculum)` sino `createCurriculumWithRecordType` → no aparece `Unknown argument progression`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea un Plan desde la suite y ve el registro creado sin el modal de error.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Crear Plan UI | UPU/Admin, layout con customEndpoint | Tipo=Plan + campos, Guardar | fila base + fila rt creadas | sin error; modal éxito (TC-1) |

### REQ-FIX-02: enteros del RecordType se persisten como integer

> **Que cambia**: `totalCredits` y `totalPeriods` quedan guardados como número, no como texto `"1"`.
> **Por que**: el form los manda como string; core los castea solo cuando crea por el alias (`coerceRtFields`).

El sistema MUST persistir `totalCredits` y `totalPeriods` como integer en `rt__Plan__curriculum`, vía el `coerceRtFields` del path de alias de core (`instance.resolver.js:2656`).

**Actor**: system
**Layers**: backend, database

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Ints persistidos | TC-1 ejecutado | inspeccionar fila rt | valores int | `totalCredits`/`totalPeriods` integer, no string (TC-4) |

### REQ-REGRESSION-01: el path programático por alias sigue intacto

> **Que cambia**: nada — se verifica que crear por `createInstance(rt__Plan__curriculum)` directo (MCP/REST/n8n) no se rompe.
> **Por que**: el fix no debe tocar el path genérico; el MCP crea RTs por el mismo alias (`typedRecordName`).

El sistema MUST mantener funcionando `createInstance({ objectType: 'rt__Plan__curriculum', data })` invocado directamente (sin pasar por la mutation del mod), creando base + extensión como antes.

**Actor**: system
**Layers**: backend

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Alias directo | object-manager up | mutation `createInstance` al alias | crea base + rt | sin regresión (TC-3) |

### REQ-REGRESSION-02: crear Minor (sin campos propios) sigue funcionando

> **Que cambia**: crear un tipo sin campos RT propios (Minor) por el mismo form/customEndpoint no se rompe.
> **Por que**: el resolver es genérico sobre `recordType`; Minor debe rutear igual y crear OK.

El sistema MUST crear un `Curriculum` con `recordType = Minor` desde la UI por el mismo `customEndpoint`, sin error (Minor no declara campos propios — la fila de extensión puede estar vacía o ausente según el modelo, pero la creación no falla).

**Actor**: admin
**Layers**: frontend, backend

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Crear Minor UI | UPU/Admin | Tipo=Minor + campos comunes, Guardar | creado OK | sin error (TC-2) |

### REQ-PRESERVE-01: el picker polimórfico de dueño se conserva

> **Que cambia**: nada — el `ownerType`/`ownerId` con `autoPopulate` (`useOwnerIdOptions`) sigue funcionando igual.
> **Por que**: D-delegar conserva el form autorado precisamente para no romper el picker (H3).

El sistema MUST preservar el comportamiento del picker de dueño (autoPopulate por `ownerType`) — el `customEndpoint` cambia a dónde submitea el form, no el schema autorado del layout.

**Actor**: admin
**Layers**: frontend

## Fix scope

### Antes (comportamiento actual)
El form `default_Curriculum_create` submitea `createInstance({ objectType: 'Curriculum', data })`. Core no separa los campos del RecordType → `prisma.curriculum.create()` plano falla en `progression`.

### Despues (comportamiento esperado)
El form submitea `createCurriculumWithRecordType(data: $data)` (mutation del mod). El resolver lee `data.recordType`, arma `rt__<recordType>__curriculum` y delega en `createInstance` de core con ese `objectType`. Core hace el split y crea base + extensión. El resolver reshapa el `InstanceResult` a `{ id, ...data }` para el `customEndpoint`.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `mods/curriculum-design/logic/curriculum-create.schema.graphql` | **nuevo** — `extend type Mutation { createCurriculumWithRecordType(data: JSON!): Curriculum! }` | agrega 1 mutation al schema del mod; sin colisión con core |
| `mods/curriculum-design/logic/curriculum-create.resolver.js` | **nuevo** — adapter thin: lee `recordType`, arma alias, delega vía `loadGenericInstanceMutation`, reshapa | export `curriculumCreateMutation` (nombre con `Mutation` → RULE-mods-004); no toca core |
| `mods/curriculum-design/config/layouts/default_Curriculum_create.json` | **modificado** — agregar bloque `customEndpoint` (inputVariable `data` JSON! + campos) | el form rutea a la mutation del mod en vez de `createInstance`; schema autorado intacto |
| `mods/curriculum-design/logic/__tests__/curriculum-create.resolver.test.js` (o ubicación de tests del mod) | **nuevo** — unit del adapter | cobertura de DET-7 |

## Tasks

### Session 1 — Implementar D-delegar (resolver thin + schema + customEndpoint) y validar create de Plan en vivo [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `curriculum-create.schema.graphql` + `curriculum-create.resolver.js` (adapter thin: lee `recordType`, arma alias `rt__<rt>__curriculum`, delega vía `loadGenericInstanceMutation`, reshapa `InstanceResult`→`{id,...data}`) | REQ-FIX-01 | developer | — | `mods/curriculum-design/logic/curriculum-create.schema.graphql`, `mods/curriculum-design/logic/curriculum-create.resolver.js` | unit (S1.T3) + lint | git revert (borrar 2 archivos) | DET-2, DET-8, RULE-mods-002, RULE-mods-004, RULE-mods-006, RULE-mods-027 | done | 1 |
| S1.T2 | Agregar bloque `customEndpoint` a `default_Curriculum_create.json` (`inputVariable: "data"`, `inputVariableType: "JSON!"`, `responseFields: ["id","name"]`, campos enumerados con `source: "formData.<campo>"`) | REQ-FIX-01 | developer | S1.T1 | `mods/curriculum-design/config/layouts/default_Curriculum_create.json` | smoke UI (S1.T4) | git revert (quitar bloque) | DET-8, RULE-mods-001 | done | 1 |
| S1.T3 | Unit test del resolver: arma alias correcto por `recordType`, delega con `objectType` alias, reshapa el retorno; verificar que NO hace `prisma.create` propio (adapter thin) | REQ-FIX-01, REQ-REGRESSION-01 | developer | S1.T1 | `mods/curriculum-design/logic/__tests__/curriculum-create.resolver.test.js` | vitest del mod verde | git revert | DET-7, DET-4 | done | 1 |
| S1.T4 | `npm run sync` + smoke UI en suite (Playwright): crear Plan (TC-1, TC-4) y Minor (TC-2); verificar alias directo (TC-3); inspeccionar filas base + `rt__Plan__curriculum` + ints | REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION-02 | developer | S1.T2, S1.T3 | suite, object-manager, DB | TC-1..TC-4 verdes + evidence (screenshots/payload) | revert sync (regenerar desde mod) | DET-7, DET-13, DET-25 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir resultados en `## Sessions` del ticket (Template de Gate), correr regresión del módulo + quality review (DET-23) + mutation gate async (DET-31), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + TC-1..TC-4 verdes + reviewer pass + regresión sin caída | (no aplica — cierre de session) | DET-13, DET-20, DET-23, DET-31 | done | 1 |

### Task contract — detalle

```
Task S1.T1: schema + resolver thin
- source_ref: REQ-FIX-01
- agent: developer
- files: mods/curriculum-design/logic/curriculum-create.{schema.graphql,resolver.js}
- precondition: ninguna (archivos nuevos)
- expected_output: mutation createCurriculumWithRecordType registrada; resolver delega y reshapa
- validation: vitest (S1.T3) + lint + npm run sync sin error
- rollback: borrar los 2 archivos y re-sync
- rules: [DET-2, DET-8, RULE-mods-002, RULE-mods-004, RULE-mods-006, RULE-mods-027]
- nota: el export DEBE llamarse con sufijo Mutation (RULE-mods-004); schema usa `extend type Mutation` (RULE-mods-006); par schema+resolver mismo basename (RULE-mods-002); el retorno de createInstance es InstanceResult (RULE-mods-027) → reshape obligatorio

Task S1.T2: customEndpoint en layout
- source_ref: REQ-FIX-01
- agent: developer
- files: mods/curriculum-design/config/layouts/default_Curriculum_create.json
- precondition: S1.T1 (la mutation debe existir)
- expected_output: el form submitea createCurriculumWithRecordType con data: JSON!
- validation: smoke UI (S1.T4)
- rollback: quitar el bloque customEndpoint (el form vuelve a createInstance base)
- rules: [DET-8, RULE-mods-001]

Task S1.T3: unit del adapter
- source_ref: REQ-FIX-01, REQ-REGRESSION-01
- agent: developer
- files: __tests__ del mod
- validation: vitest verde; assertions sobre alias armado y delegación (mock de loadGenericInstanceMutation)
- rollback: git revert
- rules: [DET-7, DET-4]

Task S1.T4: sync + smoke UI + TCs
- source_ref: REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION-02
- agent: developer
- precondition: S1.T2, S1.T3
- expected_output: TC-1..TC-4 ejecutados con evidencia inline en el ticket (DET-25)
- validation: registros creados en DB; ints verificados; alias directo OK
- rollback: regenerar sync desde mod
- rules: [DET-7, DET-13, DET-25]
```

## Constraints

- **RULE-mods-001** (must): nunca modificar archivos synced en core — editar solo en `mods/curriculum-design/logic/` y `config/`. El resolver vive en el mod; el sync lo copia.
- **RULE-mods-002** (must): el resolver custom necesita su par `.schema.graphql` con el mismo basename.
- **RULE-mods-004** (must): el nombre del `export const` debe contener `Mutation`/`Query` o el auto-loader lo ignora.
- **RULE-mods-006** (must): el `.schema.graphql` usa `extend type Mutation` — nunca redefinir.
- **RULE-mods-027** (must): `createInstance` retorna `InstanceResult { id, data, extended }` — el adapter reshapa para el customEndpoint.
- **RULE-dev-004** (must): este ticket es `layer: mod` — solo edita `mods/curriculum-design/`; NO toca core (lo invoca por delegación). Branch del mod (épica curriculum-design), no `develop`.
- **DET-32 (necessity/reuse)**: el reuso del split de core es el centro del diseño — delegar, no reimplementar.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `createInstance` de core (`object-manager`) | internal | el adapter delega en él vía dynamic import dual-path | si la firma o el path cambian, el import falla → mitigado por el helper ya probado en `sectionValidation.resolver.js` |
| seed curriculum-design en UPU | internal | `rt__Plan__curriculum` debe existir | si no, el alias no resuelve — verificado: existe |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Dynamic import de `createInstance` falla desde el resolver del mod (contexto/auth) | low | alto (bloquea el fix) | reusar `loadGenericInstanceMutation` dual-path probado; si falla, escalar a camino B (OQ-1) |
| El resolver acumula lógica → diverge del MCP | medium | medio | invariante adapter thin; unit verifica ausencia de `prisma.create` propios |
| `recordType` en `data` rompe el split del alias | low | medio | core setea el discriminador en el path de alias (`:2636`); verificar empíricamente en TC-1; si molesta, strip de `recordType` antes de delegar |
| Regresión en path programático (MCP) | low | alto | REQ-REGRESSION-01 + TC-3 |

## Open questions

- [ ] **OQ-1**: ¿el `createInstance` de core delega sin fricción de contexto/auth desde un resolver del mod? — se confirma en S1.T1/S1.T4. Si presenta fricción, escalar a camino B (split en core). Patrón ya existe en `sectionValidation` → riesgo bajo.

## Decisions

### DEC-LOCAL-01: customEndpoint con `inputVariable: "data"` + campos enumerados (no whole-form)
- **Contexto**: el ticket proponía `variables: { data: { source: "formData", type: "JSON!" } }` (objeto completo).
- **Drivers**: el engine (`RecordDetail.vue:3697-3705`) no soporta `source: "formData"` whole-object — lo envía como literal. Necesitamos un `data: JSON!` mod-only sin tocar el engine.
- **Opcion elegida**: `inputVariable: "data"` + `inputVariableType: "JSON!"` + enumerar cada campo del form con `source: "formData.<campo>"` (patrón de `serviceaccount-create.json`). El engine empaqueta los campos en `{ data: {...} }`.
- **Alternativas**: (a) extender el engine para soportar whole-form → toca `layer: core`/front (camino A), fuera de scope; (b) mapear args individuales (sin JSON) → no escala, verbose.
- **Consecuencias**: gana mod-only + funcional equivalente; pierde el "zero-touch por campo nuevo" (un campo nuevo = 1 línea en variables, simétrico al schema del form). Refuerza por qué B escala mejor (backlog B1).
- **Session**: diseño (pre-S1). Detectado como L1.

### DEC-LOCAL-02: tier T3 para S1 (uptick desde T2 preplaneado)
- **Contexto**: el plan del intake marcó T2.
- **Drivers**: el cambio es user-facing (form de create) y la validación exige smoke UI (Playwright) + regresión del módulo → eso es T3 por definición.
- **Opcion elegida**: T3.
- **Consecuencias**: validación más honesta; sin costo extra (el smoke UI ya estaba en el gate criteria).
- **Session**: diseño.

## Technical reference

- Error actual: `Invalid prisma.curriculum.create(): Unknown argument 'progression'`.
- RT early-return de core: `object-manager/src/graphql/resolvers/instance.resolver.js:2508-2682` (split en 4 buckets; `:2636` discriminador; `:2656` `coerceRtFields`).
- `parseRecordTypeFileName`: `object-manager/src/services/fileParsing.js:172-176` — `^rt__(.+)__(.+)$`.
- Patrón de delegación: `mods/curriculum-design/logic/sectionValidation.resolver.js:51-67` (`loadGenericInstanceMutation` dual-path) + `:113-118` (delegate).
- customEndpoint engine: `layout/src/layouts/RecordDetail.vue:3660-3762` (`inputVariable`/`inputVariableType` en `:3734-3737`).
- Referencia `inputVariable`: `mods/object-manager-editor/config/layouts/serviceaccount-create.json:30-31`.

## Acceptance checkpoints

- [ ] **Funcional**: REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION-01/02, REQ-PRESERVE-01 verificados
- [ ] **Tests**: unit del resolver verde; TC-1..TC-4 ejecutados con evidencia
- [ ] **Rules**: RULE-mods-001/002/004/006/027 respetadas; adapter thin (sin lógica de negocio)
- [ ] **Integration**: regresión del módulo curriculum-design sin caída; path por alias directo intacto
- [ ] **Docs**: ticket actualizado (sessions, TCs, learns); teach-close generado
