---
id: DOC-kb-sp11-CD-04-pre-intake
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - pre-intake
  - cd-plan
  - CD-04
---

# CD-04 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CD-04. Material human-read, no va a Jira. Contrato en [CD-04-detalle](CD-04-cascada-groups-vacios).

## Enfoque
Post-delete cleanup en `requirementCategoryDelete.resolver.js`: tras borrar una hoja/rama de requisito, detectar y borrar los Groups que quedaron sin hijos, en cascada multinivel, dentro de la misma transacción.

## Origen (verificado)
- lógica cliente -> requirementEditor.logic.ts:214-238 (`computeDeleteCascade`)
- resolver de borrado -> logic/requirementCategoryDelete.resolver.js

## Consideraciones
- Es higiene de datos (no seguridad): el objetivo es que el resultado por MCP coincida con el de la pantalla.
- Cuidar la cascada multinivel: un Group padre puede quedar vacío tras borrar su único hijo.
- Todo en la misma transacción del borrado.

## Hipótesis a validar
- La definición de "Group vacío" y el orden de la cascada según `computeDeleteCascade`.

## Decisiones técnicas
- Cleanup en el resolver de delete (N0), sin tool nueva.
