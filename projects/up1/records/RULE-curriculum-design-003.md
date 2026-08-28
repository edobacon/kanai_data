---
id: RULE-curriculum-design-003
project: up1
type: rule
module: curriculum-design
tags:
  - mutations
  - validation
  - graphql
  - crud-generic
  - workflow
  - convention
  - llm-guidance
  - retired
---

# Workflow mutations: usar *Validated, NUNCA las CRUD generic auto-generadas

> **RETIRADA (UPONE-1459 / TICKET-114, 2026-07-22).** Los 4 objetos workflow (`Workflow`,
> `WorkflowStatus`, `WorkflowTransition`, `WorkflowTransitionHistory`), sus resolvers
> `createWorkflow*Validated` + schemas graphql, los error codes `WORKFLOW_*` y el seed
> `_data-workflow-objects.js` se **eliminaron** del mod y del core
> (`object-manager/objects/business/Base/workflow*.json`). El subsistema quedo como codigo muerto
> tras migrar el estado de `Activity` al motor de enum de core (UPONE-1381/P4); SS-423 removio la
> ultima FK externa (uEngagement). Esta rule ya no tiene objetos ni mutations que gobernar: se
> conserva como registro historico. El estado de los objetos operativos hoy se rige por
> `RULE-curriculum-design-004` (motor de enum de core). El texto de abajo describe el subsistema tal
> como existio hasta su retiro.

## What

Cualquier creacion/modificacion de los 4 objetos workflow (workflow, workflowStatus, workflowTransition, workflowTransitionHistory) DEBE ir por las mutations custom `createWorkflowValidated`, `createWorkflowTransitionValidated`, `createWorkflowTransitionHistoryValidated`. Las mutations CRUD generic auto-generadas por el codegen (`createWorkflow`, `createWorkflowStatus`, `createWorkflowTransition`, `createWorkflowTransitionHistory`, mas sus `update*` y `delete*`) NO deben usarse para escritura desde clientes ni desde LLM-generated code. Lectura (`workflow(...)`, `workflowList(...)`, etc.) sigue siendo CRUD generic — no aplica esta regla.

## Why

Las constraints declarativas de Prisma no cubren las invariantes del modelo workflow (Confluence v1.10): (1) partial-unique `(institutionId, scopeType, isDefault=true)` que Prisma 6 no expresa sin extension SQL, (2) no-self-transitions (`fromStatusId !== toStatusId`), (3) FK polimorfica de `workflowTransitionHistory.entityId+entityType` que apunta a objetos sin FK declarada en schema, (4) reglas futuras de transicion validas (HU2-HU5). Si un cliente o LLM llama directo la CRUD generic, salta toda esa validacion y deja data inconsistente que pasa Prisma pero rompe el modelo de negocio. La defensa runtime esta centralizada en las `*Validated` con 10 error codes (`WORKFLOW_*`) — ver `mods/curriculum-design/.ai/PATTERNS.md` seccion `Mutations validated vs CRUD generic`.

## Where

Aplica a: (1) componentes Vue del mod en `mods/curriculum-design/components/`, (2) resolvers/services adicionales en `mods/curriculum-design/logic/`, (3) seeds en `mods/curriculum-design/seed/` SALVO el seed de demos huerfanos de `workflowTransitionHistory` que necesita bypass de la validacion de existencia y usa `prisma.workflowTransitionHistory.create` directo (caso documentado), (4) cualquier LLM que genere queries/mutations GraphQL contra el backend para estos 4 objetos. NO aplica a: codegen del core platform UP1 (out of mod scope), lecturas generic (`workflow(...)`, listing, etc.), ni a otros objetos del mod que no tengan validaciones runtime asociadas.

## When

Vigente desde TICKET-018 (HU3 SP2, 2026-05-13) **hasta UPONE-1459 / TICKET-114 (2026-07-22)**, cuando el subsistema completo se retiro (los objetos y sus `*Validated` ya no existen). Mientras estuvo vigente, aplicaba a toda escritura de los 4 objetos workflow. Ya no es exigible: no queda nada que gobernar.

### Estado actual del codegen UP1 (verificado SP2 — 2026-05-13)

Verificado via introspeccion GraphQL durante el smoke S9.T3 (TICKET-018):

- **CRUD generic GraphQL NO existe** para los 4 objetos workflow declarados en `mods/curriculum-design/objects/*.json`. El codegen UP1 actual no auto-expone `workflowList`, `createWorkflow`, `updateWorkflow`, `deleteWorkflow` (ni equivalentes para los otros 3 objetos) en el GraphQL schema. Solo expone las 3 mutations custom `*Validated` definidas en `mods/curriculum-design/logic/*.schema.graphql`.
- **Prisma client SI tiene el modelo** — `prisma.workflow.create()`, `prisma.workflow.update()`, etc. estan disponibles desde codigo Node directo (resolvers, scripts, seeds, workers BullMQ).

**Implicacion practica de esta rule**:

| Camino al modelo | Hoy (SP2) | Bloqueado por la rule? |
|------------------|-----------|------------------------|
| GraphQL `createWorkflowValidated(input)` | ✅ Disponible | NO — es el camino correcto |
| GraphQL `createWorkflow(input)` (generic) | ❌ NO existe en GraphQL | N/A — no existe, no se puede usar |
| Node `prisma.workflow.create({data})` | ✅ Disponible desde codigo Node | **SI** — viola la rule excepto en seed dev-controlled |
| Node `prisma.workflow.update(...)` / `.delete(...)` | ✅ Disponible | **SI** — no hay validacion runtime |

La rule es **preventiva** para:

1. **Codigo Node directo** (resolvers, scripts, workers, jobs) que use `prisma.workflow.*` saltandose las `*Validated`.
2. **Futuro caso** en que platform team habilite auto-expose CRUD generic en GraphQL para objetos de mods — la rule ya esta en vigencia y bloquea el caso inmediatamente.
3. **Excepcion unica documentada**: seed de history demos huerfanos (`_data-workflow-objects.js:upsertHistoryDemos`) usa `prisma.workflowTransitionHistory.create` directo para saltar `WORKFLOW_HISTORY_ENTITY_NOT_FOUND` con entityIds `demo-*`.

## Verification

(1) Code review: grep en `mods/curriculum-design/**/*.{js,ts,vue}` por strings `mutation { create(Workflow|WorkflowStatus|WorkflowTransition|WorkflowTransitionHistory)(` SIN el sufijo `Validated` debe retornar 0 matches (excepto en el seed de history demos donde se documenta el bypass). (2) JSDoc warning headers presentes en `workflow.resolver.js`, `workflowTransition.resolver.js`, `workflowTransitionHistory.resolver.js` apuntando a esta rule. (3) PATTERNS.md del mod tiene seccion `Mutations validated vs CRUD generic` con tabla de 10 error codes. (4) CLAUDE.md del mod (`mods/curriculum-design/CLAUDE.md`) tiene seccion `Mutations: usar *Validated`. (5) Tests E2E (S9) intentando ejecutar `createWorkflow` (generic) con `isDefault=true` duplicado pasan — NO porque la regla bloquee runtime, sino porque documentan el gap conocido entre generic y validated (caso de regression que justifica esta rule).

## Template

- [TMPL-mod-resolver-validated](../../templates/TMPL-mod-resolver-validated.js.tmpl) — patron canonical de mutation custom validated (createXxxValidated, updateXxxValidated, transitionXxxValidated) con error codes consistentes + delegacion al CRUD generic post-validacion

## Source

- **Discovered in**: TICKET-018
