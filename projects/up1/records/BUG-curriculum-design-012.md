---
id: BUG-curriculum-design-012
project: up1
type: bug
module: curriculum-design
tags:
  - hard-delete
  - cascada
  - false-restrict
  - casing
  - core
  - UPONE-1382
---

# false-Restrict al borrar un Curriculum con requirementCategory por casing heterogeneo de las claves de subarbol

## Symptom

Borrar un `Curriculum` (recordType Plan) que tiene al menos una `requirementCategory` asociada queda bloqueado: la mutacion `deleteBulkInstances("Curriculum", [planId])` devuelve `plan.status = 'restricted'` con `errors[].type = DELETE_RESTRICTED` y el mensaje "«<nombre>» esta en uso por N Categorias de requisito. Resuelvelo antes de eliminar." El modal (CriticalWarningModal) y el MCP bloquean el borrado. La `requirementCategory` es un hijo poseido exclusivo del plan: deberia caer en cascada, no bloquear.

## Expected behavior

El borrado del `Curriculum` cascada: elimina el plan y sus `requirementCategory` (hijos directos via FK `curriculumId`), sin Restrict. Solo debe haber Restrict si la categoria (o el plan) esta referenciada por algo EXTERNO al subarbol. Ver REQ-FIX-01 de SPEC-curriculum-design-fix-delete-casing.

## Root cause

Las claves de `plan.nodeMap` se construyen con casing heterogeneo: los nodos root usan el `objectType` (PascalCase, ej. `Curriculum:C1`) mientras los hijos directos usan el `object` de la metadata verbatim, que `Curriculum.json` declara en minuscula (`"object": "requirementCategory"` → clave `requirementCategory:RC1`). `detectRestrictions` arma `subtreeKeys` desde esas claves y `findIncomingReferences.filterExternal` consulta el set con el `PascalName` del modelo Prisma (`RequirementCategory:RC1`). El casing no matchea, la categoria (que ES hijo del subarbol) se cuenta como referencia externa y el plan pasa a `restricted`.

- **File**: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` (clave de nodo en `walkDirectChildren`; `subtreeKeys` en `detectRestrictions`; `filterExternal` en `findIncomingReferences`)
- **Cause**: comparacion de pertenencia al subarbol sensible a mayusculas/minusculas — `PascalName` crudo contra la clave de metadata

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier usuario que borre un Plan con >=1 requirementCategory (path RecordList o MCP) |
| Data affected | ninguna corrupcion; el borrado se BLOQUEA (no se pierde data), pero la operacion valida es imposible |
| Modules affected | object-manager (motor core), curriculum-design (Curriculum/requirementCategory), consumidores UI/MCP del preview |
| Frequency | siempre que el Plan tenga al menos una requirementCategory |

## Reproduction

### Environment
| Campo | Valor |
|-------|-------|
| Environment | dev (tenant UPU, BD uplanner_upu) |
| Data conditions | un Curriculum (Plan) con >=1 requirementCategory (curriculumId apuntando al plan), sin refs externas |

### Steps
1. Precondicion: existe un Curriculum Plan con una requirementCategory asociada.
2. Ejecutar `deleteBulkInstances("Curriculum", [planId])` (path real de RecordList) o `deleteImpactPreview`.
3. Resultado observado: `plan.status = 'restricted'`, `errors[].type = DELETE_RESTRICTED`; el modal/MCP bloquean. Esperado: cascada sin bloqueo.

## Workaround

Ninguno por el path de la UI. (Antes del fix, no habia forma de borrar el plan sin borrar manualmente cada categoria por otra via.)

## Solution

Normalizar el segmento de tipo de la clave (`objectType:id`) a lower-case al comparar la pertenencia al subarbol, en ambos sitios: al construir `subtreeKeys` y al consultar en `filterExternal` (helper `normalizeSubtreeKey`). Las claves reales de `nodeMap` (edges, historyKey) NO se alteran — solo la comparacion se hace casing-insensitive. Se descarto el parche de solo cambiar el JSON a PascalCase porque dejaba la comparacion fragil para el proximo hijo declarado en minuscula (ver DEC-LOCAL-01 del spec). Fixed en `a0f65cb`.

Cobertura: unit `R-CASING` (ejercita `detectRestrictions`, bite-verificada: roja sin el fix) + integration TC-2/TC-2b/TC-3 contra BD real.

## Related

- **Rules**: RULE-core-031 (comparar claves de subarbol por identidad normalizada, no por PascalName crudo)
- **Decisions**: DEC-050 (asimetria preview vs delete); la eleccion normalizar-vs-parche vive en DEC-LOCAL-01 del spec
- **Specs**: SPEC-curriculum-design-fix-delete-casing
- **Related bugs**: BUG-curriculum-design-003 (diseno defensivo del motor ante metadata incompleta)
