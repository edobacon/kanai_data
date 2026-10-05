# F1 — Resultado: las políticas del ticket sobreviven al rearme

Fecha: 2026-10-05. **Fase cerrada** (juez de fase: aprobable_con_nits). Los números salen de rearmar
(`db:rebuild --fresh`) **sobre copias** del store real, nunca sobre el vivo.

## Qué se cambió

| Pieza | Cambio |
|---|---|
| Esquema | Columna `verification_policy` en `tickets` (`ask` \| `required`, default `ask`) + migración 0054 |
| Superficie | `set_ticket_config` acepta y muestra la política; el endpoint web de config también |
| Texto (ida) | El frontmatter del ticket lleva las **cuatro** políticas como estado, al lado de `autopilot` |
| Texto (vuelta) | El importador las **lee** (con default ante ausencia o valor corrupto) |
| Autopilot | El mapa dejó de degradar los valores nativos: `autonomous`/`per_session` hacen ida y vuelta |
| Re-render | Setear la config **reescribe el `.md`**, por las dos vías (antes no lo hacía) |
| Backfill | Se re-renderizaron y **se commitearon** los 56 `.md` afectados del store vivo |

## El antes y el después (medido)

| Medición | Antes | Después |
|---|---|---|
| Políticas no-default que sobreviven al rearme | **0 de 56** | **56 de 56** |
| Tickets cuyo `autopilot` se degrada | **51** | **0** |
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
que tienen política no-default; 4 además con el autopilot desalineado), con verificación real por archivo
y **commiteado en el data repo** (`6a59bb7`). Sin ese paso, el rearme seguía devolviendo esas 56 políticas
a su default aunque el mecanismo ya estuviera correcto.

## Estado del cierre

- Código: `d9d485b` (el arreglo), `9155af2` (nits del primer juez), `ecf94b4` (quitar la promesa de un
  guard que todavía no existe). Data repo: `6a59bb7` (backfill), `c0c2463` (registros del cierre).
- Verificación: `pnpm typecheck` exit 0 (corrido por el dev); test de config 13/13; suite completa
  **354 archivos / 2777 tests en verde**.
- Migración aplicada al store vivo y verificada por hash; los 606 tickets quedaron en el default `ask`
  (ninguno cambió de comportamiento). Respaldo previo:
  `/Users/edobacon/.kanai/backups/kanai_data-20261004-221204`.
- **Alcance honesto**: en esta fase la política se persiste; **ningún consumidor la lee todavía**. La
  exigencia efectiva al cerrar llega en F2 (el motivo estructurado) y F3 (el guard del cierre). Quien fije
  `required` hoy no verá bloquearse nada.
- Lo que sigue: F2, el motivo estructurado del ítem no ejecutado y su reporte.
