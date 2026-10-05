# F1 — Resultado: las políticas del ticket sobreviven al rearme

Fecha: 2026-10-05. Cierre de la fase F1 del plan. Los números salen de rearmar (`db:rebuild --fresh`)
**sobre copias** del store real, nunca sobre el vivo.

## Qué se cambió

| Pieza | Cambio |
|---|---|
| Esquema | Columna `verification_policy` en `tickets` (`ask` \| `required`, default `ask`) + migración 0054 |
| Superficie | `set_ticket_config` acepta y muestra la política; el endpoint web de config también |
| Texto (ida) | El frontmatter del ticket lleva las **cuatro** políticas como estado, al lado de `autopilot` |
| Texto (vuelta) | El importador las **lee** (con default ante ausencia o valor corrupto) |
| Autopilot | El mapa dejó de degradar los valores nativos: `autonomous`/`per_session` hacen ida y vuelta |
| Re-render | Setear la config **reescribe el `.md`**, por las dos vías (antes no lo hacía) |
| Backfill | Se re-renderizaron los 56 `.md` afectados del store vivo (56 reescritos, 0 fallos) |

## El antes y el después (medido)

| Medición | Antes | Después |
|---|---|---|
| Políticas no-default que sobreviven al rearme | **0 de 56** | **56 de 56** |
| Tickets cuyo `autopilot` se degrada | **51** (48 `autonomous`, 3 `per_session`) | **0** |
| Proyectos nativos (sin DKC detrás) | **0 %** (0 de 40) | **100 %** (taomangalam 37/37, kn_bench 2/2, kanai_self 1/1, kanai_test 2/2) |

Testigo de punta a punta: `KT-002` (proyecto nativo `kanai_test`) conservó sus cinco valores tras el
rearme. En los proyectos con DKC detrás el resultado "verde" no prueba nada: el rearme los re-migra.

## La causa raíz (por qué se perdía)

1. El frontmatter solo escribía `autopilot`; `teach`/`draft`/`review` nunca llegaban al texto.
2. El importador traducía `autopilot` solo con las claves de DKC (`super`/`strict`/`true`/`manual`), así
   que un `autonomous` nativo caía al `?? 'manual'`: la ida y la vuelta no eran idempotentes.
3. Al cambiar la config, el `.md` no se re-renderizaba: el texto quedaba viejo.

## Lo que faltaba y se agregó (decisión del dev)

El arreglo materializa el estado **al cambiarlo** y **al crear** el ticket, pero no reescribe el pasado:
los 606 `.md` del store no tenían las políticas. Se hizo un **backfill acotado** a los 56 afectados (los
que tienen política no-default; 4 además con el autopilot desalineado), con verificación real por archivo.
Sin ese paso, el rearme seguía devolviendo esas 56 políticas a su default aunque el mecanismo ya estuviera
correcto.

## Estado

- Suite completa: 354 archivos / 2776 tests en verde. `pnpm typecheck`: 0 errores.
- Migración aplicada sobre el store vivo y verificada por hash; los 606 tickets quedaron en el default.
- Respaldo previo del store: `/Users/edobacon/.kanai/backups/kanai_data-20261004-221204` (190 MB,
  `integrity_check` ok, 606 tickets, fuera de todo repo git).
- Pendiente de F1 para cerrar: solo las dos corridas de comando a cargo del dev (typecheck y el test de
  config), que el plan exige con `executed_by: dev`.
