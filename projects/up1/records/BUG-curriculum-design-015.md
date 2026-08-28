---
id: BUG-curriculum-design-015
project: up1
type: bug
module: curriculum-design
tags:
  - requirement-editor
  - curriculum-mesh
  - prereq-attribution
  - evaluator
---

# El modal de prerrequisito faltante reportaba el wrapper Group[OR] en vez del nodo que realmente falla

## Symptom

Al evaluar un `requirement` de malla (via el mantenedor Y/O de UPONE-1378), el modal de prerrequisito faltante siempre reportaba el nodo envolvente `Group[OR]` (mostrando "0 de 1 cursos") en vez del requisito específico que realmente no se cumplía. Esto enmascaraba la atribución real: el usuario veía el wrapper, no la causa.

## Root cause

- **File**: `modsComponents/CurriculumMesh/evaluateRequirementTree.logic.ts` (commit e699e40, verificado)
- **Cause**: el editor envuelve todo requisito en un `Group[OR]` de una sola vía (single-via), y el evaluador reportaba siempre ese wrapper como el nodo fallante en vez de descender al hijo real que causaba el fallo.

## Fix

`evaluateRequirementTree.logic.ts` ahora desciende a los hijos fallantes en AND puro y en alternativas de un solo hijo; sigue reportando el grupo cuando hay una elección real (OR / K-de-N / `creditsRequired` propio) o un negate, y lista las ramas pendientes como opciones para que el usuario sepa cómo satisfacerlo. Las descripciones de rama omiten lo ya satisfecho. Ajustes acompañantes en `CurriculumMeshElement.vue` y `PrereqBlockModal.ts`.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | usuarios editando/consultando malla con requisitos vía mantenedor Y/O |
| Data affected | ninguno (solo presentación del modal) |
| Modules affected | curriculum-design (`CurriculumMesh`) |
| Frequency | siempre que el requisito fallante estuviera envuelto en el Group[OR] de vía única |

## Related

- **Ticket**: UPONE-1378 (mantenedor Y/O de requisitos, cierre S1 del 31-jul)
- **Doc evergreen pendiente**: `docs/architecture/curriculum-mesh-guards-prereqs.md` no cubre esta lógica de atribución al nodo fallante (gap detectado en recon, no corregido por este record).
