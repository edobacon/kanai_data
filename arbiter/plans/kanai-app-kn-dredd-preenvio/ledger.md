---
plan_id: kanai-app-kn-dredd-preenvio
created: 2026-09-29T20:16:23.911Z
updated: 2026-09-29T20:28:26.539Z
tags:
  projects:
    - kanai
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - skills/claude/kn-dredd
    - skills/claude/arbiter
  labels:
    - kn-dredd
    - pre-envio
    - severidad-informativa
---

# Arbiter: kanai-app-kn-dredd-preenvio

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| 7006954a-kn-dredd-preenvio-r1 | 2026-09-29T20:25:00Z | 2396cfa | iterar | 0 / 0 / 7 / 3 / 0 | 20/23 completos, 2 sin leer |
| 7006954a-kn-dredd-preenvio-r2 | 2026-09-29T20:55:00Z | 3e47750 | iterar | 0 / 0 / 2 / 1 / 0 | 13/13 completos, 0 sin leer |
| 7006954a-kn-dredd-preenvio-r3 | 2026-09-29T21:10:00Z | 964e39c | aprobado | 0 / 0 / 0 / 0 / 0 | 3/3 completos, 0 sin leer |

## Abiertos (ultima corrida)

Ninguno.

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| 7006954a-kn-dredd-preenvio-r1/f1 | S2 | skills/claude/kn-dredd/scripts/dredd-case.py:320 | verificador sube S3 a S2 y apply-round deja el expediente invalido | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r1/f2 | S2 | skills/claude/arbiter/SKILL.md:128 | tope de arbiter no calculable: get_plan solo trae completa la ultima corrida | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r1/f3 | S2 | skills/claude/kn-dredd/phases/preenvio.md:150 | pre-envio no define correcciones sin commitear: interdiff entre commits queda vacio | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r1/f4 | S2 | skills/claude/kn-dredd/scripts/dredd-case.py:534 | era_falso repetido deja el ciclo en iterar sin tope | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r1/f5 | S2 | skills/claude/kn-dredd/phases/preenvio.md:105 | preenvio.md define closable sin el conflicto bloqueante | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r1/f6 | S2 | skills/claude/kn-dredd/phases/preenvio.md:176 | no se exige que ids de new en round.json coincidan con findings_detail de la metrica de cierre | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r1/f7 | S2 | skills/claude/arbiter/scripts/arbiter-metrics.py:120 | validacion nueva de judge_scope/loop_action sin tests | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r1/f8 | S3 | skills/claude/kn-dredd/scripts/dredd-case.py:1 | dredd-case.py con 740 lineas (limite ~400) | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r1/f9 | S3 | skills/claude/kn-dredd/scripts/dredd-case.py:132 | dedupe de huellas depende del orden: S3 antes de S1 igual invalida el expediente | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r1/f10 | S3 | skills/claude/kn-dredd/scripts/dredd-metrics-validate.py:641 | validador exige rol check en ronda de cierre aunque solo aplique decisiones | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r2/f1 | S2 | skills/claude/kn-dredd/phases/closure.md:42 | closure.md pide mechanism solo si falta, el codigo lo exige tambien si viene del titulo | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r2/f2 | S2 | skills/claude/kn-dredd/scripts/dredd_case_rounds.py:33 | regla check no pisa mechanism explicito sin test | re-chequeo: corregido |
| 7006954a-kn-dredd-preenvio-r2/f3 | S3 | skills/claude/kn-dredd/SKILL.md:422 | ejemplo de pre_send.checks se lee como lista; el validador exige entero | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
