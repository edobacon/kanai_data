---
id: RULE-codex-capability-audit-003
project: horadric
type: rule
module: codex
level: should
tags:
  - codex
  - capabilities
  - verificacion
  - features
  - hooks
  - subagentes
  - host-integration
---

# Las capabilities de Codex se auditan con 3 comandos locales, y `stable` no implica configurable

## What

Antes de planificar sobre una capability de Codex, verificarla con estos tres comandos, que son **locales y no gastan cuota de modelo**:

| Comando | Que responde |
|---------|--------------|
| `codex features list` | Que features estan habilitadas, con su stage y estado efectivo |
| `codex debug prompt-input "x"` | Que se inyecta de verdad al contexto (instrucciones, skills, paths) |
| `codex sandbox macos [-c ...] -- <cmd>` | Como se comporta un comando dentro del sandbox real, con la config del repo |

Complementos: `codex mcp list` (servers MCP y su estado) y `codex debug models`.

**El corolario importante: que una feature figure como `stable  true` no dice nada sobre que via de configuracion esta habilitada.** Los hooks de Codex son `stable`, el motor existe con sus 8 eventos, y sin embargo ninguna via de declaracion disponible dispara (ver `BUG-codex-hooks-sin-via-declaracion-001`). Feature habilitada y feature usable son dos cosas distintas.

Igual de importante: **un literal en el binario no es una capability.** `list_agents` aparece en los strings del binario y no esta expuesta como tool.

## Why

HOR-129 nacio de un plan escrito por una sesion de Codex que afirmaba 4 capabilities. Tres eran ciertas, una tenia la causa raiz equivocada, y el nombre de la tool de subagentes estaba mal (`multi_agent_v1.spawn_agent` en vez de `functions.spawn_agent`). Verificar las 4 con estos comandos costo minutos y evito construir sobre supuestos, incluido uno mio: puse en duda la ruta de skills basandome en la ausencia de documentacion, y la prueba de 3 minutos me refuto.

Una contraevidencia por ausencia de docs no refuta nada. La prueba barata decide.

## Where

- `docs/codex-pack.md`, seccion "Verificacion (sin gastar cuota)"
- Cualquier intake que asuma una capability del host

## When

En intake, antes de que una precondicion operativa pase de `assumed` a `confirmed` (DET-1), y al diagnosticar por que algo no funciona en Codex.
