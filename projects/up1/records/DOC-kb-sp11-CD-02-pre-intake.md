---
id: DOC-kb-sp11-CD-02-pre-intake
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - pre-intake
  - cd-plan
  - CD-02
---

# CD-02 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CD-02. Material human-read, no va a Jira. Contrato en [CD-02-detalle](CD-02-consistencia-k-de-n).

## Enfoque
Invariante server-side en el dispatch de requirement (override N0): al crear/editar un requisito K-de-N, contar los hijos normativos (N) y rechazar si `minToSatisfy` (K) > N.

## Origen (verificado)
- lógica cliente que solo reporta -> curriculumMesh.logic.ts:557-561 (`deriveMinToSatisfy`)
- schema solo exige minToSatisfy>=1 (no valida K<=N)
- override de requirement -> dispatch por RT en el resolver de cd (polymorphicUpdate/sectionValidation)

## Consideraciones
- Definir "hijos normativos" con la misma semántica que usa `deriveMinToSatisfy` en el cliente, para no divergir.
- Cubrir tanto el alta como la edición que baja N por debajo de K.

## Hipótesis a validar
- Dónde exactamente en el dispatch de requirement corre la validación de forma (para colgar el invariante ahí).

## Decisiones técnicas
- Invariante en el resolver, sin tool nueva.
