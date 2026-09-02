---
id: RULE-workflow-review-context-includes-callers-014
project: horadric
type: rule
module: workflow
level: should
tags:
  - det-35
  - det-34
  - review
  - dual-judge
  - gate
  - readpaths
  - kb-injection
  - caller-context
  - false-positive
---

# Un gate de review adversarial debe recibir el contexto de los consumidores/callers, no solo el archivo cambiado en aislamiento

## What

Cuando se corre un gate dual-judge (DET-35) o cualquier review adversarial sobre un cambio, el contexto entregado a los jueces (`readPaths` / `kb_refs` del handoff) debe incluir los **consumidores/callers** del codigo bajo review, no solo el archivo cambiado en aislamiento. En particular, si el archivo es un modulo puro con dependencias inyectadas (`createFn`, `updateFn`, mutaciones pasadas por el caller), hay que incluir el caller donde vive el manejo real (error-handling, rollback, transaccionalidad, validacion), porque ese comportamiento no es observable en el modulo puro.

## Why

Evidencia empirica (trial del acelerador DET-35, 2026-07-29): revisando `requirementCreate.logic.ts` (curriculum-design, up1) en aislamiento, **ambos** jueces marcaron como bloqueante la falta de rollback en la secuencia multi-step de mutaciones. El rollback existia y era correcto, pero vivia en el caller `RequirementEditorElement.vue` (commit `9a54f34`, "safe partial rollback on via-create leaf failure"), fuera del `readPath` entregado. Sin ese contexto, un finding valido-en-su-altitud se convierte en **falso bloqueante**.

Esto refina DET-34 (KB injection): no basta con inyectar rules/bugs/spec del ticket; para un review de codigo hay que agregar los consumidores del cambio. Un modulo puro juzgado sin sus callers produce findings sobre responsabilidades que viven una capa mas arriba.

## Where

- Al construir el handoff del gate en `prompts/steps/request-execute/session-gate.md` (loop dual-judge), o al armar `args.readPaths` del acelerador `deckard/workflows/det35-dual-judge.js`.
- `dkc-resolve-kb` resuelve los KB records (rules/bugs/spec); el orquestador debe ADEMAS agregar los callers/consumidores del codigo cambiado (grep de referencias al simbolo/modulo modificado).

## When

En todo gate T2/T3 que revise codigo que (a) tenga dependencias inyectadas cuyo manejo real vive en el caller, o (b) sea consumido por otros modulos donde reside la logica de error-handling/rollback/validacion. Para cambios genuinamente autocontenidos (sin callers relevantes) no aplica.
