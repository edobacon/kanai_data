---
id: RULE-curriculum-design-034
project: up1
type: rule
module: curriculum-design
tags:
  - requirement
  - arbol-y-o
  - grupo-vacio
  - vias
  - pool-electivo
  - evaluador
  - huerfano
  - seed
  - atomicidad
  - mod
---

# Ningún `Group` de requirement puede quedar sin hojas: un grupo vacío es falso-satisfecho y anula el requisito

## What

Todo `Group` del árbol de `requirement` (contenedor OR de vías, `Group(AND)` de una vía, o pool electivo `Group(OR, minToSatisfy=K)`) MUST tener al menos una hoja normativa descendiente (`RecordState`/`MetricThreshold` con `isHardRule !== false`). Un `Group` sin hojas es un **huérfano prohibido**: no debe crearse ni sobrevivir.

Aplica a TODA vía de creación de árbol:
- **Seed** (`seed/_data-requirement.js`): un pool/grupo se siembra CON sus hojas o no se siembra (skip si no hay insumos, ej. `<2` cursos para un electivo). Prohibido sembrar un `Group(OR, K)` sin cursos.
- **Alta por vía** (UI `submitAdd` y Elric `cd_manage_requirement create` con `via`): la orquestación crea el `Group(AND)` de la vía ANTES de la hoja; si la hoja falla, el alta MUST hacer rollback seguro del/los grupo(s) que quedaron SIN hijos (nunca de un grupo que envolvió una hoja existente por reparent, ni del OR con raíces reparentadas).
- **Borrado**: al borrar una hoja, la cascada (`computeDeleteCascade`) MUST eliminar bottom-up los `Group` ancestros que queden vacíos.

Defensa en profundidad de la UI: `pruneEmptyGroups` descarta grupos vacíos del RENDER (no del dato) — es red visual, no reemplaza el rollback/cascada que limpian el dato.

## Why

El evaluador (`evaluateGroup`, `evaluateRequirementTree.logic.ts`) trata un `Group` sin hijos normativos como `satisfied: true` (vacuo, por diseño para grupos advisory-only). En consecuencia, una vía `AND` vacía dentro del OR cuenta como rama satisfecha → el OR (cualquier vía) queda **siempre satisfecho** → el requisito se **anula silenciosamente**. No es cosmético: corrompe la evaluación de la malla (REQ-14). Casos reales (UPONE-1378): el seed creaba "Electivo de Especialización" `Group(OR, K=4)` sin cursos (2 pools huérfanos en UPU); y una vía `AND` quedó vacía en TIR101 por un alta/borrado no atómico.

## Where

- `mods/curriculum-design/seed/_data-requirement.js` — el pool electivo se siembra con N hojas `RecordState` (Activities reales, `K=min(4,N)`); skip si `<2` cursos.
- `mods/curriculum-design/modsComponents/RequirementEditor/RequirementEditorElement.vue` — `submitAdd`: rollback seguro de grupos de vía sin hijos ante fallo de hoja.
- `mods/curriculum-design/modsComponents/RequirementEditor/requirementEditor.logic.ts` — `pruneEmptyGroups` (render), `computeDeleteCascade` (borrado).
- `up1-mcp/src/mods/curriculum-design/requirement-write.ts` — `cd_manage_requirement`: rollback en create-con-`via` + cascada en delete (`requirement-tree-ops.ts`).
- `mods/curriculum-design/modsComponents/CurriculumMesh/evaluateRequirementTree.logic.ts:~246` — el `satisfied:true` vacuo que hace peligroso el grupo vacío.

## When

Siempre que se cree, edite o borre cualquier nodo del árbol de `requirement`, en cualquier superficie (seed, UI, Elric/MCP, o futuras). Al revisar un PR que toque estas superficies, verificar que ninguna ruta pueda dejar un `Group` sin hojas.

## Verification

- Query de auditoría (por tenant): ningún `Group` con 0 hijos —
  `SELECT r.id FROM "requirement" r JOIN "rt__Group__requirement" g ON g."requirementId"=r.id WHERE (SELECT count(*) FROM "requirement" ch WHERE ch."parentId"=r.id)=0` debe devolver 0 filas.
- Tests: `computeDeleteCascade` (borra ancestros vacíos), `pruneEmptyGroups` (render), rollback de alta (grupo de vía sin hijos se borra ante fallo de hoja).

## Source

- TICKET-101 / UPONE-1378, learn L13 (seed pool vacío + evaluador vacuo), S17 (`pruneEmptyGroups` + limpieza TIR101), S18 (cascada Elric), S19 (fix seed), review dredd (rollback seguro en alta).
- Follow-up de atomicidad completa: `specs-external/sp7/UPONE-1378-out-of-scope-followups.md` §8.
