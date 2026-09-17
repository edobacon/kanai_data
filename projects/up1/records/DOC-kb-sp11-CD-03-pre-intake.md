---
id: DOC-kb-sp11-CD-03-pre-intake
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - pre-intake
  - cd-plan
  - CD-03
---

# CD-03 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CD-03. Material human-read, no va a Jira. Contrato en [CD-03-detalle](CD-03-ensamblado-arbol-requisitos).

## Enfoque
Portar el ensamblado "por vías" del cliente a una mutation de dominio server (`createRequirementCondition`) y exponerla como tool:
- El cliente hoy arma: contenedor OR -> un grupo AND por vía -> hojas (`ensureOrContainer`, `resolveTargetGroup`, `createViaGroup`).
- La mutation server recibe las vías y sus hojas y arma esa estructura de forma atómica, en el resolver de requirement de cd.

## Origen (verificado)
- lógica cliente -> RequirementEditor/requirementCreate.logic.ts
- resolvers de requirement (dispatch por RT) -> logic (sectionValidation/polymorphicUpdate)
- tools existentes (patrón de ficha) -> mods/curriculum-design/ai/tools.js

## Consideraciones
- Es portabilidad MEDIA: la lógica de armado es no trivial (vías, contenedores). Reproducir exactamente la semántica del cliente para que el evaluador (CD-01/CD-05) interprete igual.
- Opcional: validar la forma del árbol en create/update individual como endurecimiento; el 1:1 se logra con la mutation de ensamblado.

## Hipótesis a validar
- La forma exacta del árbol que espera el evaluador (`evaluateRequirementTree.js`).
- Si conviene una sola mutation de ensamblado o una por nivel (contenedor/grupo/hoja) orquestadas.

## Decisiones técnicas
- Mutation de dominio en el resolver de cd + ficha en ai/. Escritura gobernada.
