---
id: RULE-codex-sandbox-env-001
project: horadric
type: rule
module: codex
level: must
tags:
  - codex
  - sandbox
  - path
  - config
  - shell-environment-policy
  - host-integration
---

# El sandbox de Codex NO interpola variables: no declarar `set.PATH` ni esperar `$CLAUDE_PROJECT_DIR`

## What

En `config.toml` de Codex (global o repo-local):

- **NO declarar `[shell_environment_policy.set] PATH`.** Codex pasa el valor **literal**, sin interpolar. Un `PATH = "/algo/bin:${PATH}"` deja el token `${PATH}` como texto y el sandbox arranca sin `/bin` ni `/usr/bin`. Con `inherit = "core"` y sin el bloque, el PATH heredado ya resuelve `bash`, `sed`, `grep`, `find` y el node de nvm.
- Si por alguna razon hay que declararlo, **no hardcodear una version de node** (`.nvm/versions/node/v22.22.2/bin` se rompe al actualizar) ni rutas especificas de una maquina en un archivo commiteado.
- **`$CLAUDE_PROJECT_DIR` no existe en Codex.** Solo hay compat de `CLAUDE_PLUGIN_ROOT` / `CLAUDE_PLUGIN_DATA`, y el import del `.claude/settings.json` (`external_migration`) esta apagado. Todo comando o hook portado desde Claude Code necesita resolver su propio path.

## Why

El sintoma es `env: bash: No such file or directory`, `sed: command not found` y similares al invocar cualquier `./commands/dkc-*` dentro de Codex. Durante meses se documento como una limitacion del sandbox de Codex y se prescribio un workaround (reintentar con PATH explicito en cada invocacion). Era un bug de configuracion propio, de una linea.

La leccion generalizable: cuando el bug es "una config declara algo roto", la primera opcion a evaluar es **borrar la declaracion**, no reemplazarla por un valor mejor. El primer fix de HOR-129 hardcodeo una lista absoluta de 7 rutas; funcionaba, pero pineaba node y recortaba el PATH del dev de 45 entradas a 7. Borrar el bloque fue estrictamente mejor.

## Where

- `.codex/config.toml` de cualquier repo que use DKC desde Codex
- `~/.codex/config.toml` del usuario
- `AGENTS.md`, seccion "Compatibilidad shell en Codex"

## When

Al configurar Codex para un repo, al diagnosticar comandos que no resuelven binarios, y al portar hooks o wrappers desde Claude Code.

## Verificacion

```bash
codex sandbox macos -- /bin/sh -c 'echo $PATH'   # no debe aparecer el literal ${PATH}
codex sandbox macos -- /bin/sh -c 'command -v bash; node -v'
```
