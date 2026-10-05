# F0: baseline v1 congelada y preservación del checkout

Fecha: 2026-10-05. Tomado en macOS, repo up1, rama feat/dredd-update (HEAD 348ea29, base develop 374db48, igual a origin/develop).

## Documentos v1 congelados (commit 348ea29)

| Archivo | Blob git | SHA-256 | Líneas |
|---|---|---|---|
| docs/reference/dredd-v1.md | 57a2661df56bb29744ca0ff9dfd7c9bd3b07d78b | 44b80985cbe289ff3fbef714043befd3010c0f6d8bce7856c24f353aa817e0fe | 122 |
| docs/guides/dredd-operacion-v1.md | ac32aa749069c136c36c40195b3513d62f2c037d | a166b891fd3eeefcc2b4ef4cb29d6a346d53d13da0548bd4515d426f5a3157c2 | 845 |

Comprobación (F6.4 y F6.C2), debe imprimir los mismos blobs:

```sh
git rev-parse HEAD:docs/reference/dredd-v1.md HEAD:docs/guides/dredd-operacion-v1.md
```

Cualquier diferencia de blob es un fallo de F6.C2, no un ajuste menor.

## Skill v1 al inicio

`.claude/skills/dredd/`: SKILL.md (1680 líneas) y scripts bb.sh (67), dredd-guard.py (285), dredd-progress.py (498), dredd-progress-notify.py (190), dredd-statusline.py (153). Sin cambios frente a develop. No existe carpeta de tests.

## Cambios ajenos al caso (no tocar)

Foto de `git status --porcelain=v1` al iniciar F0: 8 líneas, SHA-256 de la salida 2ac64f44a016cd3f17d02980a819701bd54b9cf0b5a1de0587d9bf7d4bd9eab6.

- M package-lock.json
- ?? coverage/
- ?? mods/.nits-v2-wt/, mods/ai-agent/, mods/retention-wellbeing/, mods/uengagement-up1/
- ?? object-manager__wt1740/, object-manager__wtdevelop/

## Estrategia de preservación (verificable)

1. Trabajar en el mismo checkout (la rama ya está ahí; un worktree aparte exigiría cambiar de rama el checkout principal).
2. Stage solo con rutas explícitas: `git add -- .claude/skills/dredd docs/reference/dredd-v1.1.md docs/guides/dredd-operacion-v1.1.md docs/reference/dredd-v1-a-v1.1.md` (y el índice que defina F6). Prohibido `git add -A`, `git add .`, `git commit -a`, `git stash`, `git clean`, `git reset --hard` y `git checkout -- <ruta ajena>`.
3. Antes de cada commit: `git diff --cached --name-only` debe listar solo rutas del caso.
4. Al cerrar cada fase: las 8 líneas ajenas siguen presentes con el mismo estado. Comando de control: `git status --porcelain=v1 -- package-lock.json coverage mods/.nits-v2-wt mods/ai-agent mods/retention-wellbeing mods/uengagement-up1 object-manager__wt1740 object-manager__wtdevelop` debe dar las mismas 8 líneas.
5. Tests: repos git y hogares temporales (`tempfile`), nunca el checkout real ni `~/.dredd` del usuario; `DREDD_HOME` apunta al temporal.
6. Hooks globales (`~/.claude/hooks`, `~/.claude/settings.json`): no se modifican.

## Entorno observado (no establece mínimos)

- git 2.54.0 (Apple Git-157). Claude Code 2.1.278.
- Python disponibles: /usr/bin/python3 3.9.6 (sistema), /opt/homebrew/bin/python3 3.14.4 (también 3.9, 3.10, 3.13), pyenv shims python3 3.10.12. En la terminal interactiva `python3` es un alias a 3.9.25. Los hooks se invocan como `python3 <ruta>` sin alias, así que resuelven por PATH: el intérprete real depende del entorno del proceso de Claude Code.
