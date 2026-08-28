---
id: SPEC-curriculum-design-fix-recordtype-fields-in-read
project: up1
ticket: TICKET-075
status: done
---

# Fix: el read de Curriculum tipado resuelve la extensión de RecordType (ver / editar-precarga / clonar)

# Fix: el read de Curriculum tipado resuelve la extensión de RecordType (ver / editar-precarga / clonar)

## Executive summary — lo que estas aprobando

> Revision rapida. El detalle tecnico vive en Requirements / Fix scope / Tasks.

**Que se quiere**: un plan de estudios (`Curriculum` tipo `Plan`) se crea pidiendo 4 campos del tipo (progression, totalCredits, totalPeriods, periodType) que se guardan bien, pero al **ver el detalle** no aparecen y al **clonar** no se prellenan. Esos campos viven en la tabla satélite `rt__Plan__curriculum`, y el read genérico —que opera sobre la base `"Curriculum"`— no la resuelve. El create y el edit ya rutean por el alias (TICKET-074); falta cerrar el lado **lectura**. Se arregla **mod-only**, sin tocar core ni el front.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Resolver el read overrideando `Query.getInstance` y `Query.listInstances` en el mod (no mutation nueva + customEndpoint como create/edit) | El front no tiene customEndpoint en lectura: usa `getInstance`/`listInstances` genéricos. La única vía mod-only es interceptar esos resolvers (gana por el spread `...dynamicResolvers.queries` al final de `resolverIndex.js`) |
| 2 | Estrategia "traducir base→alias y delegar al genérico" (no replicar el split) | Reusa el branch RT del genérico (include {curriculum}+flatten / enriquecido por fila) → deuda de mantenimiento mínima. El delegate-con-alias ya quedó probado en el edit (TICKET-074 TC-6) |

**Riesgos principales y como los mitigamos**:

- **RBAC del alias**: delegar con el alias hace que el auth chequee `rt__Plan__curriculum:view` en vez de `curriculum:view` → re-verificar runtime con un rol real en S1 (TC-6). Indicio fuerte de que está OK: el edit ya delega por alias en modify y pasó E2E.
- **Romper el read de otros objetos**: el override delega al genérico para todo lo que no sea `"Curriculum"` → regresión explícita (TC-5).
- **listInstances es multi-tipo (Plan/Minor)**: enriquecer por fila leyendo `recordType` de cada una; data-driven, sin hardcodear el tipo.

**Que NO se hace en este ticket**:

- **Versionar arrastrar la extensión RT en la v2** — confirmado roto (TICKET-074 S2/TC-5: v1 totalCredits=240 → v2 NULL), pero es trabajo de **core** (path RT atómico en el versionado), frente B1 / pendiente de formalizar. Ortogonal a este fix de read.
- Tocar core (object-manager) o el front (layout). Mod-only.

**Tamano estimado**: 1 session ejecutable (S1), ~2-3h. La parte de riesgo es la re-verificación RBAC en runtime + la E2E (requiere auth Clerk del dev).

**Como vas a saber que funciona**:

- Abro el detalle de un Plan y veo progression/totalCredits/totalPeriods/periodType con sus valores.
- Edito un Plan y el form llega precargado con esos valores.
- Clono (Duplicar) un Plan y el modal se prellena con esos campos (code vacío).
- Un Minor no rompe ni muestra campos espurios; listar/ver objetos no-Curriculum no cambia.

---

## Purpose

Cerrar la asimetría create/edit (ya resueltos por alias) vs read (aún por base) para objetos `Curriculum` tipados. Overridear `Query.getInstance` y `Query.listInstances` en el mod `curriculum-design` para que, cuando el `objectType`/`name` es `"Curriculum"`, resuelvan la extensión `rt__<recordType>__curriculum` delegando al branch RT del resolver genérico. Mod-only, backward-compatible (delega sin tocar para todo lo no-Curriculum).

## Requirements

### REQ-FIX-01: El detalle y la precarga de edición muestran los campos del RecordType

> **Que cambia**: al ver/editar un Curriculum tipo Plan, los campos progression/totalCredits/totalPeriods/periodType aparecen con sus valores (hoy llegan vacíos).
> **Por que**: el `getInstance` genérico con `objectType="Curriculum"` no incluye la extensión `rt__Plan__curriculum`; el dato existe pero no se lee.

El sistema MUST, al resolver `getInstance(objectType="Curriculum", id)`, devolver en `data` los campos de la extensión `rt__<recordType>__curriculum` del registro (resuelto por el discriminador `recordType`), además de los campos base. Para `objectType` distinto de `"Curriculum"` MUST delegar al resolver genérico sin alterar el resultado.

**Actor**: system (resolver de lectura), gatillado por user que abre detalle/edición desde la suite
**Layers**: backend (mod resolver)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ver un Plan trae los 4 campos
- **GIVEN** un Curriculum tipo Plan con `rt__Plan__curriculum` poblada (totalCredits=240, periodType=Semester, …)
- **WHEN** el front llama `getInstance(objectType="Curriculum", id)`
- **THEN** `data` incluye progression/totalCredits/totalPeriods/periodType con sus valores
- **AND** incluye los campos base (name, code, recordType, …)

#### Scenario: Minor no expone campos Plan-only
- **GIVEN** un Curriculum tipo Minor (sin campos de Plan)
- **WHEN** `getInstance(objectType="Curriculum", id)`
- **THEN** devuelve los campos del Minor sin error; no aparecen campos espurios de Plan

#### Scenario: objeto no-Curriculum sin cambios
- **GIVEN** cualquier objeto base distinto de Curriculum
- **WHEN** `getInstance`
- **THEN** el resultado es idéntico al del resolver genérico (delega sin tocar)

</details>

### REQ-FIX-02: El prefill del clon arrastra los campos del RecordType

> **Que cambia**: al Duplicar un Plan, el modal de create se prellena con progression/totalCredits/… (hoy llegan vacíos).
> **Por que**: el clon (prefilledModal) se prellena desde la fila del listado, y `listInstances` con `name="Curriculum"` no trae la extensión `rt__` → el prefill no tiene qué copiar.

El sistema MUST, al resolver `listInstances(name="Curriculum")`, incluir en cada fila los campos de su extensión `rt__<recordType>__curriculum` (de forma que el prefill del clon —que ya copia `rt__*` anidado o scalars top-level— los tome). Para `name` distinto de `"Curriculum"` MUST delegar sin alterar el resultado.

**Actor**: system (resolver de lista), gatillado por user que clona desde la suite
**Layers**: backend (mod resolver)

<details><summary>Scenarios de validacion</summary>

#### Scenario: clonar un Plan prellena los campos
- **GIVEN** un Plan con `rt__Plan__curriculum` poblada
- **WHEN** el user dispara la row action "Duplicar"
- **THEN** el modal de create aparece prellenado con progression/totalCredits/totalPeriods/periodType (code vacío por `uniqueFields`)

#### Scenario: lista mixta Plan/Minor
- **GIVEN** el listado con Plans y Minors
- **WHEN** `listInstances(name="Curriculum")`
- **THEN** cada fila trae los campos de su propia extensión según su `recordType`; ninguna rompe

</details>

### REQ-FIX-03: Versionar un Curriculum hereda su extensión de RecordType

> **Que cambia**: al crear una nueva versión de un Plan, la v2 hereda progression/totalCredits/totalPeriods/periodType del original (antes nacía sin ellos).
> **Por que**: el versionado base (`asNewVersion`) de core crea la fila base pero NO arrastra la extensión `rt__<RT>__curriculum` (frente B1, TICKET-074 S2). Sin esto la v2 pierde los datos del Plan. (Scope-expansion aprobado por el dev — antes diferido a core, resuelto mod-only.)

El sistema MUST, al versionar un Curriculum (`createInstance` con `asNewVersion` + `prefillFrom.source`), copiar la fila de extensión `rt__<recordType>__curriculum` del source a la nueva versión mediante un post-create hook en el override `sectionValidation.createInstance` (mod-only). MUST ser idempotente (no pisar si la v2 ya tiene extensión) y degradar graceful (un fallo de la copia NO revierte la v2 base). Los flags `asNewVersion`/`source` MUST capturarse ANTES del delegate (el `generic.createInstance` muta `args.data`).

**Actor**: system (override de create), gatillado por user que versiona desde la suite
**Layers**: backend (mod resolver)

<details><summary>Scenarios de validacion</summary>

#### Scenario: versionar un Plan hereda los campos
- **GIVEN** un Plan con `rt__Plan__curriculum` poblada
- **WHEN** el front versiona (`createInstance` asNewVersion + prefillFrom)
- **THEN** la v2 tiene su propia fila `rt__Plan__curriculum` con los mismos campos del source
- **AND** ver/editar la v2 muestra los datos heredados

#### Scenario: idempotencia / degradación
- **GIVEN** una v2 que ya tiene extensión, o un source sin extensión (Minor)
- **WHEN** corre el hook
- **THEN** no pisa la v2 existente / no-op si el source no tiene extensión; un error de la copia no revierte la v2

</details>

### REQ-REGRESSION-01: Lecturas existentes intactas

> **Que cambia**: nada para objetos no-Curriculum ni para los flujos ya resueltos (create/edit).
> **Por que**: DET-7 — el override no debe alterar el comportamiento del resto.

El sistema MUST mantener el shape y comportamiento del `getInstance`/`listInstances` genérico para todo `objectType`/`name` distinto de `"Curriculum"`, y MUST NO alterar create (`createCurriculumWithRecordType`) ni edit (`updateCurriculumWithRecordType`).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: regresión read genérico
- **GIVEN** un objeto cualquiera no-Curriculum
- **WHEN** get/list
- **THEN** resultado idéntico al baseline (delega)

#### Scenario: RBAC preservado
- **GIVEN** un rol con `curriculum:view`
- **WHEN** abre el detalle de un Plan (delegate-con-alias → check `rt__Plan__curriculum:view`)
- **THEN** sin auth error (la cap del alias resuelve, verificado runtime)

</details>

## Necessity assessment (DET-32 — light)

| Item | Veredicto | Razón |
|------|-----------|-------|
| Override `Query.getInstance` (mod) | **build** | (1) necesita existir: el read por base no resuelve la extensión RT; (2) no existe en KB; (3) el framework no lo da (el branch RT del genérico requiere el alias, y el front pasa la base); (4) no se reduce a config. Build mínimo: adapter "traducir base→alias + delegar" |
| Override `Query.listInstances` (mod) | **build** | Mismo racional para el prefill del clon. Reusa el genérico + enriquece por fila |
| Schema graphql del mod | **reduce** | Solo declara los overrides si hace falta SDL; `getInstance`/`listInstances` ya existen en el schema de core → probablemente no requiere SDL nuevo (verificar en S1) |
| Tocar core / front | **drop** | Restricción mod-only; el mecanismo de override mod→core ya existe |

## Fix scope

### Antes (comportamiento actual)
`getInstance("Curriculum", id)` y `listInstances("Curriculum")` operan sobre la base y solo incluyen `ext__uplanner__curriculum` (custom fields), nunca `rt__<recordType>__curriculum`. El detalle, la precarga de edit y el prefill del clon llegan sin los 4 campos del tipo.

### Despues (comportamiento esperado)
Ambos resolvers, para `Curriculum`, resuelven la extensión del RecordType (delegando al branch RT del genérico vía el alias / enriqueciendo cada fila). Ver/editar muestran los campos; clonar los prellena. Resto de objetos sin cambios.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `mods/curriculum-design/logic/curriculum-read.resolver.js` | NUEVO — exporta `curriculumReadQuery = { getInstance, listInstances }` con override "Curriculum → alias/enriquecido, resto delega" | Gana sobre `instanceQuery` de core por el spread final en `resolverIndex.js`. Afecta solo lecturas de Curriculum |
| `mods/curriculum-design/logic/curriculum-read.schema.graphql` | NUEVO si requiere SDL (probable: no, get/list ya existen) | — |
| `mods/curriculum-design/tests/unit/curriculum-read.test.js` | NUEVO — unit del override (Curriculum→alias, no-Curriculum→delega, Minor) | — |
| `mods/curriculum-design/tests/integration/curriculum-read.test.js` | NUEVO — integration get/list contra Prisma | — |

## Tasks

> DET-20: 1 session (S1). Cadena T1→T2→T3→T4 (read get → read list → tests → verificación). Tasks copiadas al ticket al abrir S1 (DET-28).

### S1.T1 — Override `getInstance` (ver + precarga edit)
- **source_ref**: REQ-FIX-01
- **agent**: developer
- **contract**: crear `curriculum-read.resolver.js` con `curriculumReadQuery.getInstance`: si `objectType==="Curriculum"`, leer `recordType` del registro base, armar alias `rt__<recordType>__curriculum`, delegar `generic.getInstance(... objectType: alias ...)`; else delegar sin tocar. Dynamic import dual-path del genérico (patrón de `curriculum-create.resolver.js`).
- **validation**: unit verde (Curriculum→trae extensión; no-Curriculum→delega).
- **rollback**: borrar el export `getInstance` del file (queda el genérico de core).

### S1.T2 — Override `listInstances` (prefill del clon)
- **source_ref**: REQ-FIX-02
- **agent**: developer
- **depends_on**: S1.T1
- **contract**: agregar `curriculumReadQuery.listInstances`: delegar al genérico para `name==="Curriculum"`, luego enriquecer cada fila con los campos de `rt__<recordType>__curriculum` (lectura batch por ids o por fila). Else delegar sin tocar.
- **validation**: unit verde (fila Plan trae campos; lista mixta Plan/Minor; no-Curriculum delega).
- **rollback**: borrar el export `listInstances`.

### S1.T3 — Tests unit + integration
- **source_ref**: REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION-01
- **agent**: developer
- **depends_on**: S1.T2
- **contract**: unit (mocks del genérico/prisma) + integration (Prisma real) cubriendo TC-1..TC-5. Assertions con valores concretos (totalCredits=240, etc.).
- **validation**: suite del mod = baseline + nuevos verdes; sin regresión.
- **rollback**: n/a (tests).

### S1.T4 — Verificación runtime + E2E
- **source_ref**: REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION-01 (RBAC)
- **agent**: developer
- **depends_on**: S1.T3
- **contract**: reiniciar OM con el mod cargado; verificar a nivel datos (get/list por base traen la extensión) y E2E en la suite (ver/editar/clonar Plan, Minor sin romper) — auth Clerk del dev (dependencia humana). Re-verificar RBAC del alias (TC-6).
- **validation**: TC-1..TC-6 con evidencia (datos + screenshots).
- **rollback**: n/a (verificación).

## Backlog

| # | Item | Priority | Status | Razón |
|---|------|----------|--------|-------|
| — | Versionar arrastra la extensión RT en la v2 (path RT atómico en versionado) | n/a (no es de este ticket) | deferred | Trabajo de **core** (object-manager, `$transaction` en finalizeCreate). Frente B1 confirmado en TICKET-074 S2/TC-5. Pendiente de formalizar como ticket/backlog de core — NO bloquea el cierre de TICKET-075 |

## Status

| Task | Status |
|------|--------|
| S1.T1 | done |
| S1.T2 | done |
| S1.T3 | done |
| S1.T4 | done |
| S1.T5 | done (scope-expansion — versionado hereda extensión, REQ-FIX-03) |
| S2.T1 | done (scope-expansion — UX lista: versionar→detalle + ocultar Eliminar, REQ-FIX-04) |
