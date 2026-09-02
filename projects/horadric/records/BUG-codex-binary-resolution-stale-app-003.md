---
id: BUG-codex-binary-resolution-stale-app-003
project: horadric
type: bug
module: codex
status: fixed
severity: high
tags:
  - codex
  - delegation
  - models
  - binary-resolution
  - false-negative
  - guardrail
---

# El guardarrail del mapeo media una instalacion vieja de Codex y daba verde sin saberlo

## Symptom

`./commands/dkc-model-map-check` devolvia **exit 0, `drift: []`** el 2026-08-01, con el mapeo `fast: gpt-5.4-mini`, `balanced: gpt-5.4`, `reasoning: gpt-5.5`. El veredicto era correcto para el binario que el comando eligio, pero **no para el CLI que el dev estaba usando**: el catalogo vigente ya no listaba `gpt-5.3-codex` ni `gpt-5.2` (ambos documentados como invocables) y si listaba los tres `gpt-5.6-*` que HOR-130 habia descartado por no invocables.

## Expected

Que el guardarrail mida la instalacion **vigente** y que su salida diga cual midio. Un exit 0 que no nombra el binario no es auditable: no se distingue "el mapeo esta bien" de "el mapeo esta bien contra un CLI que ya nadie corre".

## Impact

Falso negativo de un guardarrail `must` (`RULE-codex-model-map-verified-005`), que es la peor clase de falla: el KB afirma con seguridad algo que no verifico. Alcance real:

- `dkc-model-map-check`: veredicto contra el CLI equivocado (exit 0 falso).
- `dkc-delegate`: **la misma cascada duplicada**, asi que la delegacion podia invocar el binario viejo. Con el mapeo de entonces no se rompio de casualidad (los tres slugs existian en las dos instalaciones), pero cualquier remapeo a `gpt-5.6-*` habria fallado en el primer intento, que es exactamente lo que HOR-130 vino a evitar.
- `dkc_capabilities` / `dkc_install_check("agent")`: reportaban `binary` con la ruta vieja y `model_map` en verde.

## Root cause

Tres copias de la misma cascada fija: `CODEX_BIN` > `command -v codex` > `/Applications/Codex.app/Contents/Resources/codex` (en `commands/dkc-model-map-check`, `commands/dkc-delegate` y `server/src/deckard_cain/tools/project.py`).

En esta maquina `codex` **no esta en el PATH**, asi que la cascada caia siempre al tercer escalon. Y el CLI vigente ya no vive ahi: el update de la app lo movio adentro de `ChatGPT.app`.

| ruta | version | fecha del binario |
|------|---------|-------------------|
| `/Applications/Codex.app/Contents/Resources/codex` (la que resolvia) | `0.131.0-alpha.9` | 16 may |
| `/Applications/ChatGPT.app/Contents/Resources/codex` (la que corre, vista en `ps`) | `0.146.0-alpha.9.2` | 31 jul |

Confirmado con `ps aux`: los procesos vivos de Codex salen de `ChatGPT.app`, y `~/.codex/models_cache.json` se refrescaba minuto a minuto mientras el binario de `Codex.app` seguia con mtime de mayo.

## Reproduction

```bash
# Antes del fix: verde contra el CLI viejo, sin decir que era el viejo.
command -v codex                                    # vacio: no esta en el PATH
./commands/dkc-model-map-check                      # exit 0, "sin drift"
/Applications/Codex.app/Contents/Resources/codex --version        # 0.131.0-alpha.9
/Applications/ChatGPT.app/Contents/Resources/codex --version      # 0.146.0-alpha.9.2
ps aux | grep -c "ChatGPT.app/Contents/Resources/codex"           # el que corre de verdad
```

## Fix

Una sola implementacion de la resolucion, en **`commands/dkc-resolve-codex`**: junta los candidatos (`CODEX_BIN`, PATH, `ChatGPT.app`, `Codex.app`, `~/.codex/bin`, homebrew, `/usr/local/bin`), les pregunta `--version` y **elige la mas alta** (release por encima del prerelease del mismo core). `CODEX_BIN` es override explicito y no compite. Con `--json` devuelve `binary`, `version`, `reason` y todos los candidatos evaluados.

Consumidores migrados a ese comando (cero cascadas duplicadas):

- `commands/dkc-model-map-check`: ademas reporta `CLI medido: <ruta> (<version>, <como se resolvio>)` y el campo `cli` en el JSON. La resolucion va **despues** del `--self-test` para que el self-test siga corriendo sin CLI.
- `commands/dkc-delegate`: mismo binario que valido el checker. Si delegara en otro, la validacion previa no valdria nada.
- `server/.../tools/project.py` (`_resolve_codex`): `dkc_capabilities` agrega `version` del backend; si el comando no esta, cae a `shutil.which` en vez de a una ruta fija.

Verificado el 2026-08-01, los dos caminos:

```bash
./commands/dkc-model-map-check           # exit 0, "CLI medido: .../ChatGPT.app/... (0.146.0-alpha.9.2)"
CODEX_BIN=/Applications/Codex.app/Contents/Resources/codex ./commands/dkc-model-map-check
                                         # exit 2: DRIFT en los 3 tiers, y dice que midio 0.131.0-alpha.9
```

## Corolario general

Un guardarrail que se ejecuta puede fallar de una forma que el catalogo escrito no podia: **midiendo el objeto equivocado**. `RULE-codex-model-map-verified-005` cerro "el dato envejece"; esto cierra el nivel de abajo, "el instrumento apunta a otra cosa". De ahi las dos consecuencias que quedan como regla: la resolucion de un binario externo se decide por evidencia (version observada), no por una ruta escrita a mano; y todo veredicto de un guardarrail nombra **contra que** se emitio.

Corolario operativo: si un guardarrail depende de un binario externo, la deteccion del binario es parte del guardarrail. Duplicarla en tres lugares garantiza que envejezcan por separado.
