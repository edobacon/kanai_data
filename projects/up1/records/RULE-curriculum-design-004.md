---
id: RULE-curriculum-design-004
project: up1
type: rule
module: curriculum-design
tags:
  - validation
  - graphql
  - activity
  - enum-transitions
  - status
  - migration
  - llm-guidance
  - convention
---

# Cambios de estado del `Activity` van por el motor de enum de core (`updateInstance` + `enforceEnumTransitions`); el gate de publish vive en el override del mod

> **Reescrita en TICKET-106 (2026-07-15).** La version original (TICKET-019 / SPEC-004, HU4 SP2) describia dos mutations custom del mod — `transitionActivityValidated` (coordinador de transicion sobre el workflow relacional) y `updateActivityValidated` (wrapper que enforzaba readonly de `currentStatusId`). Ambas fueron **retiradas** en la migracion **UPONE-1381/P4**: el estado de `Activity` paso del workflow relacional del mod al **motor de enum de core**. Esta rule refleja el patron vigente. La hermana `RULE-curriculum-design-003` (objetos workflow) quedo **retirada en UPONE-1459 / TICKET-114**: los 4 objetos y sus `*Validated` se eliminaron del mod y del core (codigo muerto tras esta migracion). Ya no hay workflow relacional al que bindear `Activity`.

## What

El estado de una instancia de `Activity` se representa en el campo enum `status` (`Draft | InReview | Approved | Active | Deprecated | Archived`), declarado en `mods/curriculum-design/objects/activity.json`. Las transiciones permitidas se declaran ahi mismo, en el bloque `transitions` del campo, y las valida el **motor de enum de core**.

1. **Cambios de `status`** (transiciones de estado): DEBEN ir por la mutation generica `updateInstance`, que corre `enforceEnumTransitions` — valida que la arista `from → to` este declarada, evalua `conditions`, enforce `requiredCapabilities` (semantica OR, capability por arista, ej. `activity:publish` en `Approved → Active`) y emite `onTransition`. No escribir `status` por caminos que salten ese guard.
2. **Cualquier otro campo editable** del activity: por el CRUD generic / `updateInstance` estandar, sin tratamiento especial. Nota: `currentStatusId` (y `workflowId`) ya NO son el mecanismo de estado de Activity. Los campos FK se **eliminaron de la definicion** de `objects/activity.json` en **UPONE-1459 / TICKET-114**; el drop de columnas lo materializa el codegen al regenerar el schema (aplicado en UPU, los demas tenants en deploy). No escribir `currentStatusId` desde codigo productivo.

**NO hacer**:
- Reintroducir `transitionActivityValidated` ni `updateActivityValidated` — fueron retiradas; su codigo ya no existe (solo sobreviven comentarios de migracion que documentan la retirada). Cualquier PR que las recree revive el workflow relacional dropeado y crashea contra columnas inexistentes.
- Reintroducir el workflow relacional del mod (`currentStatusId` → `WorkflowStatus`, `WorkflowTransition`) como camino de estado de `Activity`.
- Escribir `status` por un path que no pase por `enforceEnumTransitions` (ej. un resolver custom que llame `prisma.activity.update({ status })` directo saltando el guard de core).

**Gate de negocio al PUBLICAR (mod-owned)**: al llevar `status` a `Active` (publicar), el arbol de evaluacion del Activity debe sumar exacto (cada padre `===` suma de sus hijos, I1 / TICKET-061). El motor de enum de core valida la **legalidad** de la transicion (`from/to`, capabilities), pero NO tiene hook para reglas de negocio por transicion — por eso este pre-check vive en el **unico override de `updateInstance` del mod**: `logic/polymorphicUpdate.resolver.js::assertActivityEvaluationsOnPublish` (dispara cuando `status → Active`, rechaza con `EVALUATION_WEIGHT_MISMATCH`). Los clientes pueden anticiparlo con la query read-only `validateActivityEvaluations(activityId)` antes de publicar.

**`requiresComment`**: algunas transiciones lo declaran como metadata en `transitions`, pero el enum engine de core **aun NO lo enforce** (D-S5-2). Hoy lo lee el MCP; lo consumira el futuro sistema de cambio manual de estado. No asumir que el comment se valida server-side.

**Excepcion documentada (unica)**: seeds dev-controlled del mod (`seed/_data-univalle.js`, `seed/_data-aiep.js`, y el seed de migracion legacy) siembran `status` inicial directo via `prisma.activity.create` / `update`. El seed asume responsabilidad del caller (remap legacy S5.T3: `BOR→Draft`, `EDIT/REV-DEC→InReview`, `PUB→Active`, `DIS→Archived`). NO replicar el bypass en runtime productivo.

## Why

1. **El motor de transiciones es responsabilidad de core, declarativo y versionado con el mod.** Las aristas viven en el JSON del objeto (`transitions`), el codegen las persiste en `core_FieldDefinition.properties.transitions` y `updateInstance` las enforce. Se elimina el workflow relacional por-institucion (tablas `Workflow`/`WorkflowStatus`/`WorkflowTransition`) como mecanismo de estado de `Activity`: menos superficie, flujo versionado junto al mod, sin configuracion manual post-sync. Documentado en `object-manager/docs/enum-transitions.md` (AP-01 codegen, AP-02 runtime, AP-03 UI, AP-04 editor).
2. **Un solo camino de escritura de estado, gateado.** `enforceEnumTransitions` corre en ambos paths de escritura de `updateInstance` (base y early-return de RecordType), despues de auth y antes de `prisma.update`. Saltarlo permite estados y saltos ilegales sin validacion de capabilities ni emision de eventos.
3. **Reglas de negocio por-transicion que core no cubre.** El weighted-sum al publicar es una constraint de dominio del mod, no expresable en el motor generico. Mantenerla en el override de `updateInstance` del mod la aplica en el mismo punto que las reglas de `core_ObjectValidation`, sin tocar core (cero core).
4. **Consistencia para LLM-generated code y consumers.** Codigo generado que aun "recuerde" el patron viejo (mutations `*Validated`, campo `currentStatusId`) produciria llamadas a mutations inexistentes o a una columna dropeada. La rule fija el patron vigente como gate.

## Where

Aplica a:

1. **Frontend del mod / suite**: componentes que muten `status` de `Activity`. El selector de UI (AP-03) ya consume `getValidTransitions` y ofrece solo estados alcanzables; la escritura va por `updateInstance`.
2. **Resolvers/services del mod**: cualquier resolver custom que toque `status` de activities debe pasar por `updateInstance` (no `prisma.activity.update({ status })` directo).
3. **Otros mods consumers** que operen sobre el estado de `Activity`.
4. **LLM-generated code** que escriba mutaciones GraphQL para cambiar el estado de `Activity`.

NO aplica a:

- **Lecturas**: `activity(...)`, `activityList(...)`, `validateActivityEvaluations(...)`, etc.
- **Otros campos** del activity sin regla de negocio asociada.
- **Objetos workflow** (`Workflow`, `WorkflowStatus`, `WorkflowTransition`, `WorkflowTransitionHistory`) — se **retiraron por completo** en UPONE-1459 / TICKET-114 (`RULE-curriculum-design-003` quedo retirada). Ya no existen en el mod ni en el core.
- **Codegen del core platform** (fuera del scope del mod).

## When

Vigente desde la migracion **UPONE-1381/P4** (el estado de `Activity` migra al motor de enum de core). Reescrita bajo **TICKET-106 (2026-07-15)** tras detectar en intake que la rule seguia describiendo el patron retirado.

Permanecera mientras el motor de enum de core sea el mecanismo de transicion de estado. Cambiaria si core entregara:

a) **Hook de reglas de negocio por transicion** (`onBeforeTransition` per-objeto declarable en metadata) que permitiera mover el gate de publish (weighted-sum) fuera del override de `updateInstance` del mod.

b) **Enforcement de `requiresComment`** a nivel del enum engine (hoy solo metadata declarada, D-S5-2), lo que retiraria la responsabilidad del MCP / futuro sistema de cambio manual.

## Verification

(1) **grep de simbolos retirados**: `transitionActivityValidated` / `updateActivityValidated` NO deben aparecer como mutations vivas en `mods/curriculum-design/logic/**/*.{js,graphql}` — solo se permiten en comentarios de migracion que documentan la retirada. `activity.schema.graphql` expone unicamente la query `validateActivityEvaluations`.

(2) **Campo legacy retirado**: `currentStatusId`/`workflowId` no deben aparecer como campos de escritura de `Activity` en codigo productivo. Los campos FK se eliminaron de la definicion en UPONE-1459 / TICKET-114; el drop de columnas se aplica al regenerar el schema (UPU hecho, resto en deploy). Referencias validas solo en comentarios historicos/seed de migracion.

(3) **Gate de publish**: el pre-check weighted-sum vive en `logic/polymorphicUpdate.resolver.js::assertActivityEvaluationsOnPublish` (dispara en `status → Active`, lanza `EVALUATION_WEIGHT_MISMATCH`). La query `validateActivityEvaluations` permite anticiparlo.

(4) **Transiciones declaradas**: `objects/activity.json` declara el enum `status` con su bloque `transitions` (capabilities por arista); el codegen las persiste y `enforceEnumTransitions` las enforce en `updateInstance`.

## Source

- **Rewritten in**: TICKET-106 (2026-07-15) — hygiene de KB post-migracion.
- **Migracion**: UPONE-1381/P4 (Activity: workflow relacional del mod → motor de enum de core).
- **Original**: TICKET-019 (HU4) / SPEC-004-rename-activity-workflow — patron previo (`transitionActivityValidated` + `updateActivityValidated`), retirado.
- **Evidencia**: `mods/curriculum-design/logic/activity.resolver.js:4-27` (header de migracion), `logic/polymorphicUpdate.resolver.js:383-416` (gate reubicado), `objects/activity.json` (enum `status` + `transitions`), `object-manager/docs/enum-transitions.md` (motor de core, AP-01..AP-04).
- **Hermano**: `RULE-curriculum-design-003` (objetos workflow, retirada en UPONE-1459 / TICKET-114).
