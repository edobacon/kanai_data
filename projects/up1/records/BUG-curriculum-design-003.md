---
id: BUG-curriculum-design-003
project: up1
type: bug
module: curriculum-design
tags:
  - versionado
  - clone
  - curriculum
  - planEntry
  - requirementCategory
  - directChildren
  - malla
  - UPONE-1270
  - latente
---

# Versionar/clonar un Curriculum (Plan) NO cascadea su malla (planEntry / requirementCategory)

## Symptom

Al versionar (`asNewVersion`) o clonar un `Curriculum` (Plan), la nueva versión/clon **no arrastra** los hijos de la malla: `planEntry` (asignaturas colocadas) ni `requirementCategory` (líneas de formación). La vN+1 nace sin malla.

## Expected behavior

Versionar/clonar un Plan debería resolver explícitamente qué pasa con su malla — típicamente **cascadear** planEntry + requirementCategory (deep-clone) al nuevo Plan, o al menos ser una decisión consciente (no una pérdida silenciosa).

## Root cause

`objects/Curriculum.json` declara `metadata.versioning` pero **no** declara `metadata.directChildren` (ni `polymorphicChildren`) para `planEntry`/`requirementCategory`. El path de deepClone/versioning del object-manager solo cascadea los hijos declarados en esa metadata (ver RULE-core-023: clasificación por mecanismo de FK). Sin la declaración, el subárbol de la malla queda fuera del clone. No es bug de la lógica de versionado — es una relación de hijos no declarada.

## Impact

**Latente** (aún no ejercitado a fondo en SP5): en cuanto se versione/clone un Plan con malla poblada, la nueva versión pierde sus entradas y líneas. Relevante para UPONE-1270 (versioning). Sin impacto retroactivo mientras no se versionen planes con malla.

## Reproduction

1) Tomar un `Curriculum` (Plan) con `planEntry` + `requirementCategory`. 2) Ejecutar "Nueva versión" (`createInstance asNewVersion`, objectType=Curriculum) o clonar. 3) Leer la vN+1 → no tiene planEntry ni requirementCategory.

## Workaround

Recrear la malla manualmente en la nueva versión (o vía MCP CRUD). Fix real: declarar `planEntry` y `requirementCategory` como hijos clonables del Curriculum en `metadata.directChildren`/`polymorphicChildren` según su FK (planEntry.planId, requirementCategory.curriculumId son FK directas → `directChildren`), validando contra RULE-core-023 y corriendo la regression de deepClone/versioning. Requiere decidir la semántica de `blockId`/`sourceEntryId` y las FK internas al re-puntear (cloneMap).

## Solution

Pendiente. Candidato a ticket de versioning de la malla (UPONE-1270 / SP siguiente).

## Related

- **Rules**: RULE-curriculum-design-027 (directChildren vs embedding), RULE-core-023 (clasificación de hijos clonables)
- **Tickets**: TICKET-093 (learn L2), UPONE-1270 (versioning)
