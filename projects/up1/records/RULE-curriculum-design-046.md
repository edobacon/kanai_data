---
id: RULE-curriculum-design-046
project: up1
type: rule
module: curriculum-design
tags:
  - requirement
  - arbol-y-o
  - evaluador
  - render
  - via-unica
  - normalizacion
  - contrato-de-datos
  - atribucion
  - mod
---

# Las normalizaciones que hace el render del árbol de requisitos NO las heredan sus otros consumidores: cada uno necesita la suya

## What

Cuando el render del árbol de `requirement` normaliza una forma del dato para que sea legible (colapsar la vía única, podar grupos vacíos, prefijar el verbo del label), esa normalización vive en la capa de presentación y NO llega a los demás consumidores del mismo árbol. Todo consumidor nuevo o modificado —evaluador de la malla, banner de violaciones, modal de bloqueo, exportadores, MCP— MUST resolver por su cuenta las mismas formas, o documentar por qué no le aplican.

Formas del dato que hoy exigen normalización propia:
- **Vía única**: el editor envuelve todo requisito en un `Group[OR]` de un solo hijo. El render lo colapsa (`collapseSingleVia`); el evaluador lo colapsa en su atribución del faltante. Un consumidor que no lo colapse habla del envoltorio, no del requisito.
- **Grupo sin hojas**: el render lo poda (`pruneEmptyGroups`); el evaluador lo trata como satisfecho vacuo (ver [RULE-curriculum-design-034](rule-curriculum-design-034.md)).
- **Verbo del label**: lo prefija el render (ver [RULE-curriculum-design-045](rule-curriculum-design-045.md)); quien muestre el label sin pasar por ese render lo obtiene crudo.

## Why

El árbol de `requirement` tiene varios consumidores sobre el MISMO dato, y las normalizaciones se escribieron donde apretaba primero: la vista. Un consumidor nuevo hereda la estructura cruda, no las decisiones de lectura, así que reproduce el problema que la vista ya había resuelto — y el síntoma aparece en otro lugar, donde nadie lo asocia con la vista.

Caso concreto (TICKET-116): el modal de prerrequisitos reportaba el `Group[OR]` envoltorio, así que el usuario leía siempre "Cualquiera de las vías — 0 de 1 cursos" sin saber qué le faltaba, mientras el árbol renderizado —que sí colapsaba la vía única— se leía correcto. El fix fue darle al evaluador su equivalente de `collapseSingleVia`, no cambiar el dato ni el render.

## Where

- `mods/curriculum-design/modsComponents/ReglaUnificadaView/` — `collapseSingleVia`, prefijo del verbo: las normalizaciones de lectura.
- `mods/curriculum-design/modsComponents/RequirementEditor/requirementEditor.logic.ts` — `pruneEmptyGroups`.
- `mods/curriculum-design/modsComponents/CurriculumMesh/evaluateRequirementTree.logic.ts` — atribución del faltante (colapso de vía única + descenso en AND puro).
- `mods/curriculum-design/modsComponents/CurriculumMesh/PrereqBlockModal.ts` y el banner mesh-wide de `CurriculumMeshElement.vue` — consumidores del contrato `MissingPrereqItem[]`.
- `up1-mcp/src/mods/curriculum-design/` — `cd_get_prereqs`: consumidor fuera del frontend.

## When

Al agregar un consumidor del árbol de `requirement`, o al cambiar uno existente de forma que produzca texto para el usuario. Al revisar un PR: si el cambio recorre el árbol, verificar que la vía única no llegue al mensaje final y que los grupos vacíos no se cuenten como requisitos reales.

## Verification

- Test por consumidor: un `Group[OR]` con un solo hijo que falla debe producir el nombre de la hoja, nunca el label del envoltorio.
- Runtime: el mensaje del consumidor no debe contener "Cualquiera de las vías" cuando el requisito tiene una sola vía.

## Source

- TICKET-116 / UPONE-1378, learn L3. Verificado en runtime en UPU: modal de alta y banner mesh-wide nombrando la condición que falla (`≥ 60 créditos`, `Calculo III`, `Metodos Numericos`) en vez del contenedor.
