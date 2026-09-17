---
id: DOC-kb-sp11-CD-06-pre-intake
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - pre-intake
  - cd-plan
  - CD-06
---

# CD-06 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CD-06. Material human-read, no va a Jira. Contrato en [CD-06-detalle](CD-06-guia-fielddocs).

## Enfoque
Escribir contratos/fieldDocs (contenido hint) en `mods/curriculum-design/ai/` para los objetos sin guía, derivándolos del schema real (`objects/*.json`) y de las reglas server-side (incluidas las que cierran CD-01..CD-04).

## Prioridad de objetos
Primero los más usados por el asistente: activity (Course), planEntry, requirement, requirementCategory, Curriculum. Después catálogos/relaciones (AcademicProgram, BibliographyReference, CurricularLink, InstructionalComponentType, PlanEnrollment, ProgramEnrollment, CurricularSection, Offering).

## Origen (verificado)
- objetos -> mods/curriculum-design/objects/*.json (los 13)
- reglas server -> los overrides N0 (sectionValidation/polymorphicUpdate/requirementCategoryDelete) + los guards de CD-01..CD-04

## Consideraciones
- No inventar campos: derivar del schema y de las reglas verificadas.
- Reflejar las reglas recién cerradas (prereq, K<=N) en la guía para que el agente las respete al llenar.

## Decisiones técnicas
- Contenido hint en ai/. Priorizar los objetos de escritura frecuente.
