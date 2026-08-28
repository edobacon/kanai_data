---
id: DEC-KANAI-KB009-P0-backend-selection
project: kanai_self
type: decision
module: dispatch
---

## Contexto
Ejecutando up1/UPONE-1530, el LLM abandono el camino canonico de Kanai y registro editando el store a mano. Causa raiz P0 (verificada en codigo): run_process sin backend hacia normalizeBackend(undefined) -> 'local' (server/dispatch/adapters/index.ts), y el adapter local necesita un LLM en KANAI_LOCAL_URL que no corre -> "fetch failed". refine_spec/review_spec funcionaban porque hardcodean backend:'claude'.

## Decision
Endurecer la seleccion de backend en run_process para que NUNCA caiga a un default roto y para que registre/refleje su estado:
- Sin backend elegido: PREGUNTA entre los LLM favoritos del usuario (modelo + su backend), reusando el contrato waiting_for_input/resume_process (se ve en el flujo en vivo). Si no hay favoritos, ofrece los backends usables (claude/codex).
- Backend explicito desconocido: error con fix-hint claro, no fetch generico.
- Default de ejecucion por proyecto en config.yaml (executionBackend/executionModel); la eleccion del prompt se persiste como default. Arreglado el clobber de logProject (ahora MERGE, no reescribe).
- Errores del job no silenciosos: si corta por timeout, al terminar persiste agent_run + audit event.
- Regla de contrato 'no improvisar' en el bootstrap always-on: si la via canonica no esta, frenar y avisar; nunca editar el store a mano.
- Favoritos reales del usuario server-readable (.kanai.local.yaml) + API /api/model-favorites + sync del composable useModelFavs.

## Commits (repo kanai-app)
3958d0c (P0.1 seleccion de backend), 3d5e8fa (P0.1b default por proyecto + P0.1c errores + P0.2 regla), 2ca3567 (favoritos reales).

## Aceptacion P0
[x] run_process sin backend PREGUNTA entre favoritos; no cae a 'local' ni error generico.
[x] Nocion de LLM favoritos (reales) + default de ejecucion por proyecto.
Verificado E2E via /api/tools/run_process y /api/model-favorites; suite 372/372.

## Alcance NO cubierto (P1/P2, sesiones aparte)
Hook de enforcement (~/.kanai/data), tools MCP faltantes (test cases/learns/teach/prosa de spec), export de reglas al global, integracion git/PR; defectos: refine_spec duplica tasks, TCs basura, robustez concurrente.

## Nota de proceso
El registro canonico del propio ticket (spec -> aprobar -> avanzar) quedo pendiente: sembrar el primer spec solo existe via run_process/agente anidado, que en esta corrida no materializo un spec. Por el contrato del ticket (no improvisar) no se fabrico a mano. Ref: KANAI-KB009.
