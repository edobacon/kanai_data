---
id: RULE-dredd-per-run-progress-ledger-004
project: horadric
type: rule
module: dredd
level: must
tags:
  - dredd
  - pr-review
  - progress-ledger
  - guard
  - statusline
  - hooks
  - concurrency
  - session-id
  - portable
---

# El ledger de avance de dredd es POR CORRIDA (uno por sesion de Claude), keyed por CLAUDE_CODE_SESSION_ID

## What

El estado de una corrida de dredd (ledger de avance + marcador del guard) vive en
`~/.dredd/runs/<session_id>.json` — **uno por sesion de Claude**, no un unico
`~/.dredd/active.json` global. La clave es la env var `CLAUDE_CODE_SESSION_ID`.

Los cuatro componentes resuelven ese mismo path:

- `dredd-progress.py`: `write_marker()` escribe siempre el path per-sesion; `read_marker()`
  lee el per-sesion y **cae al legacy `~/.dredd/active.json` solo-lectura** si no existe el
  per-sesion (transicion: no orfanar una corrida abierta con el esquema viejo). `save()` nunca
  escribe el legacy. `close` borra el archivo que `read_marker()` uso.
- `dredd-statusline.py` y `dredd-progress-notify.py`: leen el ledger de SU sesion
  (`CLAUDE_CODE_SESSION_ID` por env, con respaldo al `session_id` del payload del hook).
- `dredd-guard.py`: **opcion A** — se arma solo en la sesion que tiene la corrida
  (`session_run(sid)`); una sesion sin corrida no se bloquea aunque otro chat tenga un dredd
  activo. **Fallback B** (`all_active_runs()`, union de `runs/*.json` + legacy) SOLO cuando no
  se resuelve el `session_id`, para no perder el blindaje nunca. El `check_write` del guard
  compara contra el/los clone(s) de la(s) corrida(s) en alcance, no contra uno global.

Dato que lo hace posible: **el subagente de analisis hereda identico el `CLAUDE_CODE_SESSION_ID`
del parent** (mismo id, mismo PID; verificado). Por eso init/close/wait (parent) y
plan/phase/say/note/end (subagente) resuelven el MISMO archivo sin pasar el run-id por el prompt
de delegacion.

## Why

Con un unico `~/.dredd/active.json` global, dos dredd en chats distintos se pisaban: el `init`
del segundo **sobrescribia** el ledger del primero, los `phase`/`say` de un subagente escribian
sobre la corrida del otro, y el hook `PostToolUse` (global) leia ese unico archivo y hacia que el
narrador de un chat **cantara las fases/target del otro**. No era timing: el estado no estaba
namespaced por corrida. Namespacear por `session_id` da aislamiento exacto sin acoplar los
componentes ni tocar el protocolo del skill.

La opcion A ademas **mejora** el comportamiento previo del guard: antes un marcador global
bloqueaba lecturas de binarios / egress en CUALQUIER sesion; ahora solo en la que corre dredd.

## Where

- **Scripts (dos copias que se mantienen en sync)**: activas en `~/.claude/hooks/`
  (`dredd-guard.py`, `dredd-progress-notify.py`, `dredd-statusline.py`) y portables en
  `deckard/commands/` (esas tres + `dredd-progress.py`, que vive solo en `commands/` y lo invoca
  el skill por ruta absoluta).
- **Doc**: `deckard/commands/dkc-dredd.md` (seccion "Avance en vivo" del ledger; Paso 0c del
  guard; comando de rescate "Desarmar sin desinstalar").
- **Estado en disco**: `~/.dredd/runs/<session_id>.json` (per-corrida) + `~/.dredd/notify.log`
  (debug del canal). Legacy `~/.dredd/active.json` solo se lee como fallback.

## When

Siempre que corra cualquier variante de dredd (el comando `dkc-dredd` o el skill portable). El
aislamiento aplica a TODA corrida, no solo cuando hay concurrencia: cada sesion escribe su propio
archivo por defecto.

## Verification

- Dos sesiones con `CLAUDE_CODE_SESSION_ID` distintos producen `runs/<A>.json` y `runs/<B>.json`
  separados; el notify hook y la statusline de cada una muestran SU propio `repo#pr`.
- Guard: sesion con corrida DENY al leer binario; sesion sin corrida allow; sesion A NO bloquea
  writes en el clone de B (opcion A) pero SI en el propio; sin `session_id` en el env, el fallback
  B deniega binario y writes contra cualquier clone activo.
- `close` de una sesion borra solo su archivo; no afecta la corrida de la otra.
- TTL 3h por archivo: un marcador colgado no bloquea el trabajo normal ni ensucia la statusline.

## Source

- **Discovered in**: sesion de refuerzo a dredd (2026-08-21), a pedido del dev, que reporto que
  al correr varios dredd en chats distintos el notificador de avance "se enreda y confunde entre
  ejecuciones". Sin ticket DKC formal (capturado como rule directa, igual que las dredd-00x).
- **Evidence**: los cuatro componentes leian/escribian el unico `~/.dredd/active.json`; el
  `PostToolUse` global emitia `systemMessage` para cualquier `dredd-progress.py` de cualquier
  sesion. Se verifico via subagente que `CLAUDE_CODE_SESSION_ID` es identico entre parent y
  subagente (mismo id/PID), habilitando la clave per-sesion sin threading por prompt.
- **Related**: [[RULE-dredd-multi-ticket-commit-attribution-001]];
  [[RULE-dredd-proactive-missing-doc-002]]; [[RULE-dredd-doc-normative-levels-003]].
