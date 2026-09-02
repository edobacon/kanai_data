---
id: RULE-workflow-super-gate-config-freno-026
project: horadric
type: rule
module: workflow
level: must
tags:
  - autopilot
  - permissions
  - harness
  - security
---

# La config de permisos del harness (`~/.claude/settings.json` + `hooks/**`) nunca se auto-aprueba, aun en `execute_scope`

## What

El gate de super autopilot (`dkc-autopilot-gate.py`, HOR-139) NO auto-aprueba ediciones a `~/.claude/settings.json`, `~/.claude/settings.local.json` ni `~/.claude/hooks/**`, **aunque esos paths esten dentro del `execute_scope` del ticket**. Caen a `{}` (flujo normal → pregunta). Aplica a los tools de escritura (`Edit`/`Write`/`MultiEdit`) y a comandos Bash con operador de escritura (`>`, `tee`, `sed -i`, `cp`, `install`) sobre esos paths.

Corolario operativo: Claude Code tiene un guard **"sensitive file" propio** sobre `~/.claude/**`, **independiente del allowlist y de los PreToolUse hooks**. Un hook que devuelva `permissionDecision: allow` NO garantiza suprimir ese prompt. Por eso el diseño elige NO intentar abrir esos paths (coincide con el guard nativo en vez de pelearlo).

## Why

Esos archivos DEFINEN la frontera de seguridad: `settings.json` es el allowlist/denylist + el registro de hooks, y `hooks/**` son los guards mismos. Auto-aprobar ediciones a los propios guardrails bajo una ejecucion autonoma dejaria que un run reescriba sus reglas de permiso sin supervision — exactamente lo que la red de seguridad (DET-30) evita. Surfaceado en dogfooding de HOR-139: editar el propio hook disparo el guard "sensitive file" del harness.

## Where

- **Files**: `~/.claude/hooks/dkc-autopilot-gate.py` (`CONFIG_GUARD`, `hits_config_guard`, `CONFIG_PATH_RE`/`CONFIG_WRITE_RE`)
- **Layers**: config / harness

## When

Siempre que un ticket corra en `autopilot: super` con el gate activo y su `execute_scope` incluya paths de `~/.claude/`. La restriccion tambien vale como recordatorio de diseño: no asumir que un hook `allow` sobreescribe el guard sensitive-file del harness.

## Verification

- Test: `~/.claude/hooks/tests/test_dkc_autopilot_gate.py` casos `CONFIG Edit settings.json`, `CONFIG Edit hook file`, `CONFIG Bash sed -i settings`, `CONFIG in-scope non-config still allow`.
- Grep: `grep -n "CONFIG_GUARD\|hits_config_guard" ~/.claude/hooks/dkc-autopilot-gate.py`.

## Source

- **Discovered in**: HOR-139, Session 1 (post-gate, dogfooding)
- **Evidence**: editar `~/.claude/hooks/dkc-autopilot-gate.py` durante execute disparo "Claude requested permissions ... which is a sensitive file", revelando un guard del harness independiente de hooks/allowlist.
- **Related**: DEC-LOCAL-05 (del spec), DET-30 (red de seguridad autopilot), RULE-workflow-agent-pack-enforcement-020 (enforcement a nivel harness)
