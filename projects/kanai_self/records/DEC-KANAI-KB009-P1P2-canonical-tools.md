---
id: DEC-KANAI-KB009-P1P2-canonical-tools
project: kanai_self
type: decision
module: dispatch
---

## Contexto
Continuacion de KANAI-KB009 tras P0. El hueco central: no habia tools MCP para varios registros, lo que forzaba editar el store a mano. Se cerraron los principales + defectos + enforcement.

## Entregado (esta sesion)
### P1.1 - Enforcement (advisory -> enforced)
Hook PreToolUse (scripts/hooks/kanai-block-store-writes.mjs) que BLOQUEA Bash/Edit/Write sobre ~/.kanai/data/** (o KANAI_DATA_ROOT). Lecturas permitidas. Instalacion manual documentada (docs/store-enforcement-hook.md); no se auto-instala (modifica settings.json global). Commit cb23fef.

### P1.2 - Tools MCP que evitan tocar el store a mano (trilogia)
- manage_learn (add/refine/discard, DET-39) - commit 3ba86f5.
- manage_test_case (alta/actualizar estado/actual/evidencia, DET-25) + migracion 0029 (test_cases.actual/evidence) - commit 08d1fa4.
- register_teach (intake/close sin dispatch LLM, DET-21/22) - commit 454345a.
Cada mutacion persiste sidecar del data repo + emite evento (flujo en vivo); no-op de disco en tests.

### P2.1 - Defecto
refine_spec ya no duplica tasks al reenviar la misma enmienda (dedup por desc). Commit 65bf176.

## Verificacion
Suite 388/388, typecheck limpio. Tools verificadas E2E via /api/tools/*. Se registro en el propio ticket, por el camino canonico, un learn (hallazgo del agente que no siembra spec), un test case (aceptacion P0, pass, con evidencia) y esta decision.

## Pendiente (con caveats)
- P1.2 restante: amendar la PROSA del spec (Artifacts/Decisions/etc.) - refine_spec solo toca REQs/tasks estructurados.
- P1.4 export-rules --global: escribir reglas de Kanai al CLAUDE.md GLOBAL (reemplazando DKC) - modifica config global del usuario, requiere OK.
- P1.5 git/PR: integracion Bitbucket - grande y externa (credenciales, API).
- P2.2 test-cases basura desde headers de ## Testing: no se ubico el sitio del parser (no esta en el path de display actual).
- P2.3 robustez ante escritura concurrente del store (SQLITE_BUSY).
- Bloqueante de fondo: el agente de diseno de run_process no siembra un spec en una corrida (candidato a ticket propio).
