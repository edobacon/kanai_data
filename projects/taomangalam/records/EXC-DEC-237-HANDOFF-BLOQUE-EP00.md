---
id: EXC-DEC-237-HANDOFF-BLOQUE-EP00
project: taomangalam
type: decision
module: EP-00
tags:
  - kanai
  - handoff
  - DEC-237
  - excepcion
  - EP-00
---

## Contexto

DEC-237 ("GitHub como backlog y ejecución selectiva en Kanai") establece que una persona
desarrolladora crea en Kanai **solo el issue que va a ejecutar**, y declara explícitamente fuera de
alcance "crear preventivamente todos los tickets en Kanai". El handoff (doc 26 §11) es por issue
elegido.

## Decisión (excepción autorizada por el dev)

Se autoriza traer en **bloque** los 6 issues de EP-00 que están `Ready` y con dependencias cerradas,
en lugar de uno por vez:

- GH-15 · HU-00-12 · Widgetbook (orden 14, 3 pts, P1)
- GH-16 · HU-00-14 · Railway staging (orden 15, 5 pts, P1) — con pendiente externo (proyecto Railway + token staging)
- GH-17 · HU-00-11 · Build instalable por PR (orden 16, 3 pts, P1)
- GH-18 · HU-00-16 · Docs validada en CI (orden 17, 3 pts, P2)
- GH-19 · HU-00-10 · Workflows main/nightly/CodeQL (orden 18, 3 pts, P2)
- GH-20 · HU-00-19 · Dev Container + panel dev (orden 19, 5 pts, P2)

No se traen #21 (HU-00-15) ni #22 (HU-00-18): no están `Ready` por dependencias abiertas
(#21←#17, #22←#18). Se traerán al ir a ejecutarlos.

## Motivo

El dev decide anticipar la carga de los 6 tickets disponibles en una sola pasada. Cada ticket
conserva su ID documental en el título, `GH-<n>` como referencia externa, la URL canónica en el
cuerpo, módulo `EP-00`, tipo `implement` y los puntos publicados como estimación externa.

## Consecuencias / riesgo

- Se asume el costo que DEC-237 buscaba evitar: dos colas operativas (GitHub y Kanai) con estados
  que pueden divergir. GitHub sigue siendo la fuente del estado hasta que cada ticket entre en
  ejecución.
- El intake/sondas/spec se hacen igualmente por ticket, al momento de ejecutarlo; esta decisión no
  preescribe sesiones, tareas, tier ni estimación interna.

## Pendiente

- Si la práctica se repite, corresponde enmendar DEC-237 en el repo `taomangalam` (no solo dejar el
  registro aquí).
