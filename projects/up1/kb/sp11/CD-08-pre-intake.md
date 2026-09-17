---
id: DOC-kb-sp11-CD-08-pre-intake
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - pre-intake
  - cd-plan
  - CD-08
---

# CD-08 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CD-08. Material human-read, no va a Jira. Contrato en [CD-08-detalle](CD-08-ergonomia-move-requirement-tools).

## Enfoque
Dos tools de dominio en `mods/curriculum-design/ai/`:
- `cd_move_plan_entry`: ficha que expone la mutation `movePlanEntry` ya existente (renumera position/period atómicamente). Barato: la mutation existe.
- Tools del Requirement Editor: exponer las operaciones de armado/edición/borrado de requisitos, apoyadas en los resolvers endurecidos por CD-03 (ensamblado) y CD-04 (cascada). Más caro; puede ir por registerExtra si orquesta varios pasos.

## Origen (verificado)
- movePlanEntry -> logic (movePlanEntry, computeMoveRenumbering, assertValidMoveDestination)
- Requirement Editor -> logic (resolver de requirement) + CD-03/CD-04
- patrón de ficha -> mods/curriculum-design/ai/tools.js

## Consideraciones
- Es opcional: cd llega a 1:1 sin esto (el genérico N0 reproduce las orquestaciones). Priorizar solo si sobra capacidad.
- movePlanEntry es la opción "tool dedicada" de la decisión abierta de CD-07.

## Decisiones técnicas
- movePlanEntry por ficha; Requirement Editor por ficha o registerExtra según orquestación.
