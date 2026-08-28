---
id: RULE-dev-014
project: up1
type: rule
module: dev
tags:
  - det-19
  - jira
  - ids
  - comments
  - commits
  - hygiene
  - up1
  - cleanup
---

# En artefactos del repo up1 solo van ids de Jira, nunca ids internos de DKC

## What

En **cualquier artefacto de los repos de up1** (comentarios de codigo, mensajes de commit, nombres de rama, descripciones de PR, titulos y comentarios de test) se usa **solo el id externo de Jira** (`UPONE-NNNN` / `UPU-NNNN`). Nunca un id interno de DKC:

- `TICKET-NNN` -> reemplazar por el `UPONE-NNNN` equivalente (campo `external` del frontmatter del ticket DKC). Si un comentario cita solo `TICKET-NNN`, resolver el externo y dejar ese.
- `RULE-<mod>-NNN`, `DECISION-NNN`, `DEC-LOCAL-NN`, `DET-NN` -> **no tienen equivalente Jira**: son conceptos del KB. No se citan por id en el codigo; se **reformula** el comentario explicando la restriccion o la decision en lenguaje llano (igual que el comentario de un PR para un dev que no tiene DKC). Si hace falta trazabilidad, se referencia el `UPONE` del ticket que la introdujo, no el id del record.

Los **records de DKC** (todo lo bajo `projects/up1/` en el repo deckard: specs, rules, decisions, bugs, learns, tickets) siguen usando `ticket_id` y los ids de KB entre si: esta regla es **solo para los repos de codigo de up1**, no para el KB.

Es DET-19 (external id en artefactos del repo) aplicado a up1, mas la aclaracion de que hacer con los ids de KB que no mapean a Jira.

## Why

Los demas devs de up1 no tienen DKC ni el KB: un `TICKET-050` o un `RULE-mods-037` en un comentario es ruido inutil para quien lo lee, y `DEC-LOCAL-01` no le dice nada a nadie fuera del ticket. En TICKET-117 se filtro `TICKET-117` en un comentario de test (`hard-delete-cascade.integration.test.js`), cazado por la Fase 2.8 de dredd. Un barrido de up1 mostro que **no es un caso aislado**: 468 ocurrencias en 175 archivos (334 `TICKET-`, 62 `DEC-LOCAL`, 54 `RULE-*`, 13 `DECISION`, 5 `DET`), la mayoria en `mods/` (305), tambien `layout/src` (69) y `object-manager/src` (68). El commit/rama/PR de este mismo ticket ya cumplen (usan `UPONE-1479`); el gap es el legado y los comentarios.

## Where

- Todos los repos de codigo de up1: `object-manager`, `layout`, `suite`, `flow`, `report-builder`, `up1-mcp` y cada `mods/<mod>`.
- NO aplica a `deckard/projects/up1/**` (el KB, que conserva sus ids).

## When

- **Forward** (bloqueante): en todo write nuevo a artefactos del repo. Ya lo verifica dredd (Fase 2.8) sobre el diff; un `TICKET-`/`RULE-`/`DECISION-`/`DEC-LOCAL-`/`DET-` en lineas agregadas es un hallazgo de hygiene.
- **Retroactivo** (limpieza legado): es un refactor transversal cross-repo (468 hits / 175 archivos, ramas `develop` protegidas, estrategias distintas por tipo). No se hace inline dentro de otro ticket: va como **su propio ticket**, en fases por repo, respetando el scope vigente (empezar por core + curriculum-design; otros mods segun se abran). Plan sugerido por fase:
  1. `TICKET-NNN (UPONE-XXXX ...)` -> quitar el `TICKET-NNN`, dejar el `UPONE` (mecanico, revisable).
  2. `TICKET-NNN` suelto -> resolver el `external` del ticket y reemplazar; si no mapea, marcar para reformular.
  3. `RULE-*`/`DECISION-*`/`DEC-LOCAL-*`/`DET-*` -> reformular el comentario en lenguaje llano (no mecanico; revision humana por comentario).

## Verification

- Forward: dredd Fase 2.8 sobre el diff. Opcional: un check de repo (grep en pre-commit / CI) que falle ante `\b(TICKET-[0-9]+|DET-[0-9]+|RULE-[a-z]+-[0-9]+|DECISION-[0-9]+|DEC-LOCAL-[0-9]+)\b` en `*.js|ts|vue|json` fuera de `node_modules`/`generated`.
- Retroactivo: por fase, `grep` de conteo antes/despues por repo (baseline actual: 468 / 175 archivos).

## Source

- TICKET-117 (UPONE-1479), review dredd 2026-08-03: `TICKET-117` filtrado en un test + barrido de legado.
- Aplica DET-19 a up1.
