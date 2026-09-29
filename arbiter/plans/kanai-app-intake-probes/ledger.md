---
plan_id: kanai-app-intake-probes
created: 2026-09-25T15:59:57.734Z
updated: 2026-09-25T16:12:17.371Z
tags:
  projects:
    - kanai
  repos:
    - kanai-app
  tickets: []
  branches:
    - feat/intake-probes
  folders:
    - server/probes
    - skills/claude
  labels:
    - sondas
    - intake
---

# Arbiter: kanai-app-intake-probes

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| probes-r1 | 2026-09-25T13:20:00-03:00 | 9279062 | iterar | 0 / 0 / 2 / 5 / 1 | 48/62 completos, 10 sin leer |
| probes-r2 | 2026-09-25T13:55:00-03:00 | worktree | aprobable_con_reservas | 0 / 0 / 1 / 5 / 1 | 46/63 completos, 15 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| probes-r2/g1 | S2 | correctness | server/repo/probeCards.ts:144 | Una tarjeta ya resuelta nunca se da de baja al re-correr las sondas con otros objetos: la variante vieja sigue exigiendo su REQ y entrando al prompt |  |
| probes-r2/g2 | consulta | intent_gap | server/repo/probeCards.ts:117 | El reuso de decisiones entre tickets exige el mismo conjunto exacto de objetos, no el mismo objeto |  |
| probes-r2/g3 | S3 | correctness | server/probes/metrics.ts:187 | Las metricas cuentan tarjetas dropped como reales: inflan tarjetas por ticket y convierten huecos en tarjetas sin implementar |  |
| probes-r2/g4 | S3 | unfulfilled_phase | app/pages/specs/[id].vue:44 | El override probesAck existe en el endpoint web pero la pantalla de aprobacion no lo envia |  |
| probes-r2/g5 | S3 | performance | server/probes/recheck.ts:175 | La cache del recheck no cubre el resultado vacio: cada re-gate sin hallazgos vuelve a correr las sondas dos veces |  |
| probes-r2/g6 | S3 | correctness | server/probes/recheck.ts:135 | El recheck compara contra origin/defaultRef, no contra la base de la rama del ticket |  |
| probes-r2/g7 | S3 | correctness | server/llm/guide.ts:447 | La regla probes_maintenance matchea cualquier pedido con la palabra sonda antes de implement/fix: rutea a kn-probes sin ticket |  |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| probes-r1/f1 | S2 | server/dispatch/planner.ts:83 | Con KANAI_INTAKE_PROBES apagado el prompt del planner ya no es byte-identico: suma un salto de linea | re-chequeo: corregido |
| probes-r1/f2 | S2 | server/repo/probeCards.ts:105 | Una decision previa se reusa aunque la evidencia actual incluya archivos nuevos que no estaban en sus sources | re-chequeo: corregido |
| probes-r1/f3 | S3 | server/probes/intake.ts:69 | skipProbes descarta del prompt las variantes ya decididas cuando queda alguna tarjeta pendiente | re-chequeo: corregido |
| probes-r1/f4 | S3 | server/probes/recheck.ts:155 | El comentario del cache del recheck dice que reusa el texto, pero recalcula todo y solo evita re-registrar la decision | re-chequeo: corregido |
| probes-r1/f5 | S3 | server/probes/metrics.ts:196 | La eficacia exige que el id de cada sonda en probes.yaml coincida con el enum de categorias de kn-tassadar, sin declararlo ni validarlo | re-chequeo: corregido |
| probes-r1/f6 | S3 | skills/claude/kn-probes/SKILL.md:52 | kn-probes bootstrap paso 4 pide validar el borrador con run_probes, pero run_probes solo lee el probes.yaml ya registrado | re-chequeo: corregido |
| probes-r1/f7 | S3 | server/dispatch/amendmentPlanner.ts:102 | El fixHint de DET-45 manda a enmendar con un REQ variant, pero el prompt del amendmentPlanner solo ofrece requirement\|enforcement | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
