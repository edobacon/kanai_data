---
id: DOC-kb-sp11-CD-05-pre-intake
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - pre-intake
  - cd-plan
  - CD-05
---

# CD-05 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CD-05. Material human-read, no va a Jira. Contrato en [CD-05-detalle](CD-05-lectura-malla-requisitos).

## Enfoque
Dos frentes:
1. **Construir** los resolvers de query de dominio en cd: uno para la malla curricular agregada de un plan, otro para el árbol de requisitos agregado. Hoy no existen; la agregación se arma en el cliente.
2. **Exponer** ambos como tools de lectura (fichas `operation:"query"`) en `mods/curriculum-design/ai/tools.js`, con su contrato de resultado (coordinar con CD-06).

## Origen (verificado)
- lógica de armado hoy en cliente -> CurriculumMesh/* (malla), RequirementEditor/* + evaluateRequirementTree.js (árbol)
- tools existentes (patrón de ficha query) -> mods/curriculum-design/ai/tools.js (cd_validate_activity_evaluations es query)
- soporte de tools de lectura en el motor -> up1/mcp/src/mods/types.js:14 (operation:"query")

## Consideraciones
- Es el ticket más caro de cd porque hay que CONSTRUIR la agregación, no solo exponerla (diferencia clave con cm).
- Reproducir la semántica del cliente para que el agregado coincida con la pantalla (bloques, posiciones, vías del árbol).
- El twin `evaluateRequirementTree.js` ya existe: la query del árbol puede apoyarse en el loader `requirementTreeLoader.js`.
- Definir el alcance con el PO antes de construir (mueve 3 a 6 SP).

## Hipótesis a validar
- Si conviene una query monolítica de malla o varias (materias, bloques, requisitos) componibles.
- Reuso del loader del árbol de requisitos ya existente.

## Decisiones técnicas
- Resolvers de query en logic/ + fichas de lectura en ai/. Alcance a decidir con PO.
