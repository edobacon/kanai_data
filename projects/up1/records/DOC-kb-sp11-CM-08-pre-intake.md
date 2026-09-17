---
id: DOC-kb-sp11-CM-08-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - pre-intake
  - cm-plan
  - CM-08
---

# CM-08 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CM-08. Material human-read, no va a Jira. Contrato en [CM-08-detalle](CM-08-guia-deuda-documental).

## Enfoque
- **Contratos/fieldDocs** de los satélites sin tool propia (RubricDimension, RubricDescriptor, CompetencyNodeDevelopmentLevel, CompetencyNodeOwnerUnit, CompetencyNodeScopeUnit) en `mods/curriculum-mapping/ai/` (contenido hint que sirve `get_create_guide`).
- **Deuda documental:** actualizar CLAUDE.md (agregar UPONE-1756 CompetencyAlignment y 1769) y corregir `.ai/PATTERNS.md:39` (el filtrado de tools genéricas por objectType para escritura lo resolvió la rama del fix).

## Consideraciones
- Estos satélites se escriben dentro de las compuestas (no tienen tool propia), así que su guía es para que el agente entienda la forma del objeto al leer/interpretar, no para invocarlos sueltos.
- Coordinar con CM-01..CM-07: los contratos de objetos con tool se hacen en su ticket; aquí solo lo que queda.

## Decisiones técnicas
- Contenido hint separado del enforced (governedObjects va en CM-09).
