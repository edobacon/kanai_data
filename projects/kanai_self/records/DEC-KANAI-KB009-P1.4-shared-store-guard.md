---
id: DEC-KANAI-KB009-P1.4-shared-store-guard
project: kanai_self
type: decision
module: enforcement
tags:
  - KANAI-KB009
  - setup
  - enforcement
  - store
---

Decision: la logica que bloquea escrituras directas al store (KANAI-KB009 P1.1) se factorizo a un core agnostico del harness, reusado por wrappers finos.

- `scripts/hooks/store-guard.mjs` expone `evaluateWrite({path,command})` (dependency-free, bare-node): decide si una escritura toca el store (~/.kanai/data/** o KANAI_DATA_ROOT). `decideBlock` (forma Claude tool_name/tool_input) es un adaptador sobre ese core.
- Claude Y Codex comparten el MISMO wrapper `kanai-block-store-writes.mjs`: ambos usan el contrato de I/O identico del hook PreToolUse (stdin tool_name/tool_input; output hookSpecificOutput/permissionDecision:"deny"). Se registra en settings.json (Claude) y config.toml (Codex).
- opencode NO tiene hook por proceso: usa un plugin `tool.execute.before` que traduce sus tools (write/edit/bash) al core y hace `throw` para denegar; import dinamico file:// con degradacion a advisory si no resuelve.
- Se agrego `apply_patch` al detector de escrituras (BASH_WRITE) para cubrir el editor de archivos de Codex, que se entrega como comando de shell.

sourceRef: scripts/hooks/store-guard.mjs (evaluateWrite, BASH_WRITE +apply_patch), scripts/hooks/kanai-block-store-writes.mjs (wrapper Claude+Codex), scripts/install/opencode.ts (pluginSource). Commits 7e644a8, dabcdbd, 7a9ff07 (rama setup).
