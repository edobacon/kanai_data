---
id: RULE-core-032
project: up1
type: rule
module: core
tags:
  - versionado
  - clonado
  - cascada
  - deepClone
  - directChildrenDerived
  - core
  - sp6
---

# Cross-refs internas entre hijos DIRECTOS ya clonados se remapean con `directChildrenDerived` (UPDATE-based)

## What

Cuando al clonar/versionar hay una FK interna **entre dos hijos DIRECTOS del mismo padre** (ej. `planEntry.categoryId → requirementCategory`, ambos `directChildren` del `Curriculum`), declarar `metadata.directChildrenDerived: [{ object, via, remapTo }]` en el JSON del padre. El motor core (`applyDirectChildrenDerivedRemap` en `deep-clone-direct.js`) **actualiza** (`UPDATE`) la FK `via` de las filas ya clonadas, reapuntandola al clon del `remapTo` via el `cloneMap`. Es el espejo de `polymorphicChildrenDerived`/`applyDerivedRemap`, con una diferencia de mecanismo clave (ver Why). El hijo derivado y su `remapTo` deben estar ambos en `prefillFrom.deepClone`.

## Why

`applyDerivedRemap` (polimorfico) **crea** filas nuevas (findMany source → create), porque sus derivados (ej. `CurricularLink`) NO se clonan como primarios (no tienen FK-owner directa). Un hijo directo derivado (ej. `planEntry`) SI se clona como primario (`deepCloneDirectChildren` re-apunta su FK-owner `planId` al nuevo padre) → reusar `applyDerivedRemap` lo **duplicaria**. Por eso el remap directo es UPDATE-based, no create-based. Ademas el `remapTo` debe estar en `deepClone`: si falta, la cross-ref queda apuntando a la version origen (solo `console.warn`, sin fallar).

## Where

`objects/<contenedor>.json` → `metadata.directChildrenDerived` (config declarativa). El motor vive en `object-manager/src/graphql/resolvers/helpers/deep-clone-direct.js` (`readDirectChildrenDerived` + `applyDirectChildrenDerivedRemap`), invocado en la fase DERIVED de `instance.resolver.js` junto al remap polimorfico. No tocar salvo gap real.

## When

Al versionar/clonar un objeto cuyos hijos directos se referencian entre si (ej. `Curriculum` Plan: `planEntry.categoryId → requirementCategory`). FK `via` nullable se deja como esta; FK fuera del `cloneMap` o de type distinto al `remapTo` se deja + warn (no rompe la fila).

## Verification

Declarar `directChildrenDerived` + los aliases COMPLETOS en `deepClone`; verificar que ningun hijo directo de la v2 referencia ids del original. Test: `object-manager/tests/e2e/clone-plan-mesh-derived.test.js` (integration BD real: `planEntry.categoryId` → categoria de la v2, 0 refs a v1) + `tests/unit/resolvers/direct-children-derived-remap.test.js`.

## Source

- **Discovered in**: TICKET-111 / UPONE-1450 (versionado profundo del Plan), S2.T2 + S3.T2.
- **Related**: RULE-core-027 (deepClone config-driven), RULE-core-023 (`.newId` en cloneMap), BUG-core-004 (RT base del padre — mitigado en mod).
