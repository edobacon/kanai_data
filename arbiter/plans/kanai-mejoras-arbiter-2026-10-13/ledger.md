---
plan_id: kanai-mejoras-arbiter-2026-10-13
created: 2026-10-13T13:12:16.831Z
updated: 2026-10-13T13:17:22.755Z
tags:
  projects:
    - kanai_self
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/arbiter
    - server/review
    - server/repo
    - skills/claude/arbiter
    - docs
  labels:
    - mejoras-arbiter
---

# Arbiter: kanai-mejoras-arbiter-2026-10-13

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| kanai-mejoras-arbiter-r1 | 2026-10-13T13:15:00Z | 82826e8326a30f3b8bf22a4ff4566ac358d6f856 | iterar | 0 / 0 / 6 / 2 / 0 | 16/22 completos, 0 sin leer |
| kanai-mejoras-arbiter-r2 | 2026-10-13T13:45:00Z | 7f1ed91de558ae2da114f33103be8f7db16b43cd | aprobable_con_reservas | 0 / 0 / 1 / 0 / 1 | 16/18 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| kanai-mejoras-arbiter-r2/g1 | S2 | correctness | server/arbiter/validate.ts:158 | coverage null avisa 'sin coverage' pero validateRun igual la rechaza con error; el espejo Python la acepta |  |
| kanai-mejoras-arbiter-r2/g2 | consulta | maintainability | skills/claude/kn-dredd/phases/preenvio.md:168 | preenvio.md: la segunda llamada a review_scope (Resumen) no repite projects |  |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| kanai-mejoras-arbiter-r1/f1 | S2 | server/repo/qualityConfig.ts:171 | reviewExclude no valida los globs: una llave sin cerrar cuelga el servidor en un loop infinito | re-chequeo: corregido |
| kanai-mejoras-arbiter-r1/f2 | S2 | server/arbiter/ledger.ts:38 | 'Piden una decision' nunca lista nada en planes de varios repos | re-chequeo: corregido |
| kanai-mejoras-arbiter-r1/f3 | S2 | server/mcp/tools.ts:483 | Los textos dicen que kn-dredd no juzga los reviewExclude, pero kn-dredd no pasa projects ni plan_id a review_scope | re-chequeo: corregido |
| kanai-mejoras-arbiter-r1/f4 | S2 | skills/claude/arbiter/SKILL.md:198 | Textos que siguen diciendo que el servidor no valida family_rounds y que el coordinador marca sweep_missed_by_executor | re-chequeo: corregido |
| kanai-mejoras-arbiter-r1/f5 | S2 | server/arbiter/service.ts:114 | Sin test del cableado de reviewExclude en arbiter_save_run ni de projects en review_scope | re-chequeo: corregido |
| kanai-mejoras-arbiter-r1/f6 | S2 | skills/claude/arbiter/scripts/arbiter-metrics.py:131 | validate_head_ref y el aviso sin coverage del espejo Python no tienen test | re-chequeo: corregido |
| kanai-mejoras-arbiter-r1/f7 | S3 | server/arbiter/validate.ts:157 | Una corrida sin coverage devuelve dos avisos por la misma causa | re-chequeo: corregido |
| kanai-mejoras-arbiter-r1/f8 | S3 | server/arbiter/validate.ts:426 | TS y Python difieren con head_ref null o numerico y con coverage null | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
