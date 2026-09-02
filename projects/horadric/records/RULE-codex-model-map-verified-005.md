---
id: RULE-codex-model-map-verified-005
project: horadric
type: rule
module: codex
level: must
tags:
  - codex
  - delegation
  - models
  - tiers
  - drift
  - verification
---

# El mapeo tier a modelo se verifica contra el CLI instalado, no contra un catalogo leido una vez

## What

Todo mapeo de tier a modelo de un proveedor externo se valida con **`./commands/dkc-model-map-check`** antes de usarse, y la fuente de verdad es lo que `codex debug models` lista con `visibility: list` **en esta instalacion**.

Dos condiciones sobre el instrumento, agregadas el 2026-08-01 despues de `BUG-codex-binary-resolution-stale-app-003`:

1. **El binario se resuelve por evidencia, no por ruta escrita a mano**: `./commands/dkc-resolve-codex` elige la version mas alta entre las instalaciones presentes (`CODEX_BIN` la fuerza). Una cascada fija ya resolvio `Codex.app` (`0.131.0-alpha.9`) mientras el CLI vigente viajaba en `ChatGPT.app` (`0.146.0-alpha.9.2`).
2. **El veredicto nombra contra que se emitio**: la salida dice `CLI medido: <ruta> (<version>)` y el JSON lo trae en `cli`. Un exit 0 sin esa referencia no distingue "el mapeo esta bien" de "el mapeo esta bien contra un CLI que ya nadie corre".

Corolario: quien valide y quien ejecute usan **el mismo** binario resuelto. `dkc-delegate` llama al mismo resolver que el checker; si corriera en otro, la validacion previa no valdria nada.

Existir server-side no es ser invocable: `codex exec -m gpt-5.6-sol` devuelve `400 invalid_request_error: "The 'gpt-5.6-sol' model requires a newer version of Codex"` en ~4 segundos, y **no hay degradacion silenciosa** al modelo por defecto — el CLI falla con exit distinto de 0.

Exit codes del validador: `0` sin drift, `2` drift (nombra tier y slug, y sugiere candidatos por la `priority` del catalogo), `3` error de entorno (sin CLI, sin `python3`, catalogo ilegible). El `3` no asume nada: sin CLI no se puede saber que es invocable.

## Why

HOR-129 S6 mapeo `balanced: gpt-5.6-terra` y `reasoning: gpt-5.6-sol` leyendolos de `~/.codex/models_cache.json`. **Al dia siguiente ninguno de los dos funcionaba**: cualquier delegacion por tier habria fallado en el primer intento, y el KB decia lo contrario con total seguridad.

El patron es el mismo que `RULE-codex-capability-audit-003` documenta para las features (que algo figure `stable` no dice si hay via de configuracion habilitada): un dato observado una vez y escrito en el KB envejece sin avisar. La diferencia entre un catalogo y un guardarrail es que el guardarrail se ejecuta.

## Where

- `prompts/agent-tiers.md`, seccion del proveedor `openai-codex`
- `commands/dkc-model-map-check`
- `commands/dkc-resolve-codex` (unica implementacion de la resolucion del binario)
- `commands/dkc-delegate` (invoca el checker antes de gastar cuota, y el mismo resolver)
- `dkc_install_check("agent")` y `dkc_capabilities` (corren el checker y reportan binario + version)

## When

Al configurar o revisar tiers de un proveedor externo, al diagnosticar un `400` de modelo, **despues de cualquier update de la app del proveedor** (el 2026-08-01 un update movio el CLI de bundle y cambio el catalogo entero), y en cada gate de un ticket que delegue.

## Verificacion

```bash
./commands/dkc-model-map-check          # exit 0 esperado, y revisar la linea "CLI medido:"
./commands/dkc-model-map-check --json   # para consumo programatico (campo `cli`)
./commands/dkc-resolve-codex --json     # que instalaciones hay y cual gana
```
