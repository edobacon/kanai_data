---
id: RULE-curriculum-design-045
project: up1
type: rule
module: curriculum-design
tags:
  - requirement
  - recordstate
  - label
  - verbo-canonico
  - mustbe
  - timing
  - seed
  - render
  - editor
  - reproducibilidad
  - mod
---

# Los nodos `RecordState` de requirement se crean con el verbo canónico en el label y con `timing` explícito alcanzable desde el editor

## What

Todo nodo `RecordState` del árbol de `requirement`, creado por cualquier vía (seed, UI, Elric/MCP, fixtures), MUST cumplir dos condiciones:

1. **Label con verbo canónico y sin la condición.** El label empieza con el verbo que corresponde a su `mustBe` (`Aprobar …` para `Approved`, `Cursar …` para `Taken`) y NO incluye la condición ni marcas de estado (nada de `(advisory)`, `(recomendado)`, `(antes)`). El resto del label es el nombre del target, nada más.
2. **`timing` explícito.** No se omite `timing` confiando en el default del evaluador. El valor MUST pertenecer a las combinaciones que el editor ofrece: `Approved` + `Before` (prerrequisito), `Taken` + `Either` (correquisito recomendado), `Taken` + `Concurrent` (correquisito estricto).

## Why

Son dos contratos distintos con la misma consecuencia: dato que la UI no puede producir ni mostrar bien.

- **Label**: el render de `ReglaUnificadaView` **prefija** el verbo derivado de `mustBe` cuando el label no empieza con `aprobar|cursar`. Un label en prosa se lee con el verbo duplicado (patrón `Cursar Haber visto X`). La condición tampoco va en el label porque el render ya la muestra como badge aparte: duplicarla en el texto produce ruido y desalinea el nodo de sus hermanos.
- **`timing`**: `mustBe: Taken` sin `timing` lo lee el evaluador como `Before`. Esa combinación **no existe en el editor**, cuyas 3 condiciones son `approvedBefore`, `takeEither` y `takeConcurrent`. Un dato así no es reproducible por el usuario: no puede recrearlo ni entender por qué su edición cambia el comportamiento. En un seed demo el daño es mayor, porque el dataset es la referencia de lo que el producto "sabe hacer".

Regla general detrás de ambos: **el dato sembrado o creado por API debe ser expresable por el editor y legible por el render**. Si no lo es, el dato está mal, no la UI.

## Where

- `mods/curriculum-design/seed/_data-requirement.js` — nodos del árbol demo (`Aprobar X`, `Cursar X` + `timing`).
- `mods/curriculum-design/modsComponents/ReglaUnificadaView/` — el render que prefija el verbo y muestra la condición como badge.
- `mods/curriculum-design/modsComponents/RequirementEditor/` — las 3 condiciones que el editor ofrece; define qué combinaciones son alcanzables.
- `mods/curriculum-design/modsComponents/CurriculumMesh/evaluateRequirementTree.logic.ts` — el default `Before` que hace ambigua la omisión de `timing`.
- `up1-mcp/src/mods/curriculum-design/requirement-write.ts` — `cd_manage_requirement`: misma exigencia al crear por MCP.

## When

Al crear o editar cualquier nodo `RecordState` de `requirement` en seed, fixtures, resolvers, MCP o UI. Al revisar un PR que agregue nodos: leer el label y verificar que no dependa del prefijo del render, y que `timing` esté presente y sea una de las 3 combinaciones del editor.

## Verification

- Query de auditoría (por tenant): ningún `RecordState` con `mustBe='Taken'` y `timing IS NULL` —
  `SELECT rs."requirementId" FROM "rt__RecordState__requirement" rs WHERE rs."mustBe"='Taken' AND rs.timing IS NULL` debe devolver 0 filas.
- Query de labels: ningún label de `RecordState` que empiece por algo distinto de `Aprobar`/`Cursar`, ni que contenga `(advisory)`.
- Runtime: abrir el tab Requisitos de la actividad y confirmar que el nodo se lee con un solo verbo y la condición como badge.

## Source

- TICKET-116 / UPONE-1456, learns L1 y L2. Verificado en runtime en UPU: `Cursar Fundamentos de Programacion` + badges `Cursado · Antes o concurrente` y `Recomendado`.
- Relacionado: [RULE-curriculum-design-034](rule-curriculum-design-034.md) (ningún `Group` sin hojas) — misma familia de invariantes del árbol de `requirement`.
