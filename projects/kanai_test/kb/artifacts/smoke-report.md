# Smoke DKC -> kn — reporte

Fecha: 2026-08-22T18:43:34.313Z
Totales: **24 PASS · 0 FAIL · 0 SKIP** (24 checks)

| Area | Check | Estado | Evidencia |
| --- | --- | --- | --- |
| Adapters | disponibilidad Claude Code | ✅ PASS | available |
| Adapters | disponibilidad Codex | ✅ PASS | available |
| Adapters | disponibilidad LLM local | ✅ PASS | available |
| Adapters | chat real (Codex) | ✅ PASS | text="pong" usage={"tokensIn":24269,"tokensOut":5} |
| Adapters | run() schema-out real (Codex) | ✅ PASS | summary="Simulación completada: se tocó 1 archivo y 1 test." tests=1 |
| Motor | transicion legal ticket in_progress->ready_to_close | ✅ PASS | aplicada |
| Motor | transicion ilegal rechazada | ✅ PASS | illegal_transition |
| Guards | DET-13 bloquea cierre sin acceptance | ✅ PASS | El cierre exige evidencia: payload.acceptanceVerified debe s |
| Guards | DET-8 bloquea task->done sin rollback | ✅ PASS | Documenta el rollback en el payload (payload.rollback) antes |
| Guards | DET-38 bloquea spec->approved sin juez | ✅ PASS | Falta la pre-aprobacion del juez de spec (spec-judge). Corre |
| Guards | dryRunGuards reporta bloqueos sin aplicar | ✅ PASS | bloquean: DET-13, DET-28, DET-22 |
| Guards | catalogo 41 DETs + registrados | ✅ PASS | 41 DETs, 11 guards registrados |
| MCP | tools registradas | ✅ PASS | 17 tools |
| MCP | create_record valida shape (Zod) | ✅ PASS | rechaza type invalido |
| MCP | export_markdown (D.1) render canonico | ✅ PASS | kanai_test/artifacts/K1-export.md |
| Skills | /learn inserta learn raw | ✅ PASS | LEARN-1787424102701 |
| Skills | /teach genera artefacto HTML (habilita DET-22) | ✅ PASS | TEACH-K1-close -> kanai_test/artifacts/K1-teach-close.html |
| Skills | /sync anexa prosa al ticket | ✅ PASS | ok |
| Dispatch | resolveKb (DET-34) resuelve refs del modulo | ✅ PASS | RULE:RULE-x, SPEC:K1-SP |
| Dispatch | ContextPack tipado desde el store | ✅ PASS | Ticket: K1 — Smoke ticket |
| Chat nivel 2 | parseActions extrae kanai:action | ✅ PASS | advance_task |
| Dual-judge | gate real (Codex) | ✅ PASS | decision=escalate rounds=1 |
| Migracion | normTicketStatus DKC->FSM | ✅ PASS | backlog->open, active->in_progress |
| Migracion | parsers inline (hyp/tc/dec) | ✅ PASS | hyp=1 tc=1 dec=1 |

SKIP = backend sin credenciales/proceso (no es fallo). Artefactos generados: K1-export.md, K1-teach-close.html.