---
plan_id: kanai-mejoras-epicas-ep03a-ep06-2026-10-11
created: 2026-10-11T18:37:34.483Z
updated: 2026-10-11T18:52:29.085Z
tags:
  projects:
    - kanai
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/epics
    - server/dispatch
    - server/repo
    - docs
  labels:
    - epicas
    - gate
    - metricas
    - harness
---

# Arbiter: kanai-mejoras-epicas-ep03a-ep06-2026-10-11

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| kanai-mejoras-epicas-r1 | 2026-10-11T19:40:00Z | 7b5395a061dbffcd9a14a8b20ca2cd65f7785a69 | iterar | 0 / 1 / 3 / 1 / 1 | 20/25 completos, 0 sin leer |
| kanai-mejoras-epicas-r2 | 2026-10-11T20:20:00Z | f86bf057e2976de544cff0461eb632b4a7eb4e49 | iterar | 0 / 0 / 3 / 1 / 0 | 15/15 completos, 0 sin leer |
| kanai-mejoras-epicas-r3 | 2026-10-11T20:55:00Z | 470ac9ec | aprobable_con_nits | 0 / 0 / 0 / 1 / 0 | 8/8 completos, 0 sin leer |
| kanai-mejoras-epicas-r4 | 2026-10-11T21:20:00Z | b9fc6ed9 | aprobado | 0 / 0 / 0 / 0 / 0 | 5/5 completos, 0 sin leer |

## Abiertos (ultima corrida)

Ninguno.

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| kanai-mejoras-epicas-r1/f1 | S1 | server/epics/bridge.ts:21 | La pausa por casos sin evidencia indica reanudar con humanChecks defer, pero humanChecks solo se fija al iniciar | re-chequeo: corregido |
| kanai-mejoras-epicas-r1/f2 | S2 | server/epics/accessChecks.ts:18 | Docs y skill dicen que next/integrate toman la sesion fijada al reanudar, pero resume no actualiza run.harnessSessionId | re-chequeo: corregido |
| kanai-mejoras-epicas-r1/f3 | S2 | server/repo/qualityConfig.ts:82 | quality.verify no se vuelve a filtrar al leerlo: un config.yaml editado a mano corre cualquier comando de una linea en cada gate | re-chequeo: corregido |
| kanai-mejoras-epicas-r1/f4 | S2 | server/epics/metrics.ts:41 | comparisons mezcla la linea base del host con valores kanai-derived sin mirar la fuente | re-chequeo: corregido |
| kanai-mejoras-epicas-r1/f5 | S3 | server/epics/service.ts:387 | epicView (epic_get y GET /api/epics/:id) muestra tokens en null mientras la operacion metrics muestra el derivado | re-chequeo: corregido |
| kanai-mejoras-epicas-r2/f1 | S2 | server/epics/bridge.ts:21 | La pausa por casos sin evidencia manda a iniciar una corrida nueva sin cancelar la actual, y start la rechaza | re-chequeo: corregido |
| kanai-mejoras-epicas-r2/f2 | S2 | skills/claude/kn-epic/SKILL.md:165 | kn-epic SKILL.md indica repetir la comprobacion de accesos y luego cambiar la sesion con harness, pero harness borra esa comprobacion | re-chequeo: corregido |
| kanai-mejoras-epicas-r2/f3 | S2 | server/dispatch/projectVerify.ts:61 | La config de calidad muestra como verify por defecto del gate un comando editado a mano que el filtro al leer descarta | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
