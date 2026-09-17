---
id: DEC-KANAI-KB009-P1.4-harness-agnostic
project: kanai_self
type: decision
module: install
tags:
  - KANAI-KB009
  - setup
  - harness
  - mcp
---

Decision: Kanai se integra a cualquier harness por su MCP; la glue especifica de cada harness es un adaptador fino, no una reimplementacion.

- Fuente unica de verdad: el MCP server `kanai` (tools + `instructions` con el contrato de comportamiento + `kanai_bootstrap`/`kanai_guide`/`get_skill` para onboarding portable) y el guard del store compartido.
- Cada harness = un modulo en `scripts/install/<harness>.ts` que registra el MCP + deja la puerta de entrada (`AGENTS.md`) + instala el enforcement en el formato del harness. `kanai:install` es un dispatcher `--harness` (default: detecta los presentes).
- Harness soportados: claude (path historico intacto: skills + reglas en ~/.claude/CLAUDE.md + hook en settings.json), codex (~/.codex/config.toml), opencode (~/.config/opencode/opencode.json + plugin).
- El boot del MCP ya NO asume Claude: `ensureClaudeSkills` quedo gateado por presencia de `~/.claude`. Las skills igual viajan por MCP (`get_skill`).

sourceRef: scripts/install/common.ts, scripts/install/claude.ts, scripts/install/codex.ts, scripts/install/opencode.ts; scripts/kanai-install.mts; server/mcp/server.ts (gate ensureClaudeSkills). Commits 7e644a8, dabcdbd, 7a9ff07 (rama setup).
