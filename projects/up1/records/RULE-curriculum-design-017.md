---
id: RULE-curriculum-design-017
project: up1
type: rule
module: curriculum-design
tags:
  - resolver
  - graphql
  - mod
  - read-enrichment
  - platform-constraint
---

# Un mod NO puede registrar field resolvers de tipo GraphQL — usar read-enrichment

## What

Un mod de up1 **no puede** entregar campos derivados con `.schema.graphql` `extend type X { campo }` + un resolver de campo: devolverían siempre `null`. Los campos derivados de lectura se entregan **enriqueciendo `item.data`** desde un override de `Query.getInstance`/`Query.listInstances` que despacha por `objectType` (patrón `curriculum-read.resolver.js`: `enrichCurriculumRows` / `enrichPlanEntryRows` / `enrichRequirementCategoryRows`).

## Why

El scanner del platform (`object-manager/src/graphql/resolverIndex.js: loadResolversFromDirectory`) solo recolecta exports cuyo nombre incluye `query`/`mutation` (case-insensitive) y los spreadea en `Query`/`Mutation`. NO hay mecanismo para registrar resolvers de tipo desde un mod — el único type resolver es `core_FieldDefinition`, hardcoded en core. Un `extend type` sin resolver de campo cableado → el campo resuelve `null`.

## Where

- `object-manager/src/graphql/resolverIndex.js` (scanner `loadResolversFromDirectory` + composición `Query`/`Mutation`).
- Patrón correcto: `mods/curriculum-design/logic/curriculum-read.resolver.js` (override de getInstance/listInstances que enriquece `item.data` por objectType, con batch findMany).

## When

Al diseñar/implementar cualquier campo **derivado de lectura** en un objeto de un mod (calculado, no persistido). Ejemplos: `effectiveCredits` (`credits ?? Activity.credits`), `isElective` (`blockId != null`), `currentCredits` (suma de efectivos). NO aplica a campos persistidos (esos van en el JSON del objeto).

## Verification

Grep: no debe existir `.schema.graphql` de un mod con `extend type <objeto-del-mod>` que dependa de un resolver de campo del mod. El enrichment debe estar en el override de getInstance/listInstances. Verificable: el campo derivado aparece en `item.data` al leer vía GraphQL (no null).

## Source

TICKET-082 (MC-02 / UPONE-1345), learn L1 — descubierto al implementar los campos derivados de `planEntry`/`requirementCategory`. Invalidó el plan original (field resolvers) y reformó S1.T2/S2.T3.
