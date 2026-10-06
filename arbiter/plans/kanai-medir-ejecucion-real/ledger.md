---
plan_id: kanai-medir-ejecucion-real
created: 2026-10-06T20:40:25.956Z
updated: 2026-10-06T21:26:54.565Z
tags:
  projects: []
  repos:
    - kanai-app
  tickets:
    - TAO-192
    - TAO-191
    - TAO-186
  branches:
    - feat/medir-ejecucion-real
  folders: []
  labels:
    - kanai
    - ejecucion
    - gates
    - medicion
---

# Arbiter: kanai-medir-ejecucion-real

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| kanai-medir-ejecucion-real-r1 | 2026-10-06T20:42:00Z | 12c18ca23f7cc17f0ff65c45e32e4ea686e344d3 | iterar | 0 / 1 / 2 / 6 / 4 | 22/22 completos, 0 sin leer |
| kanai-medir-ejecucion-real-r2 | 2026-10-06T21:12:00Z | f56f74e6ac1cecf4a85161fc84758c60de0e9bf4 | iterar | 0 / 0 / 3 / 11 / 4 | 26/26 completos, 0 sin leer |
| kanai-medir-ejecucion-real-r3 | 2026-10-06T21:34:00Z | a555940 | aprobable_con_reservas | 0 / 0 / 1 / 10 / 5 | 8/8 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| kanai-medir-ejecucion-real-r3/h1 | S2 | maintainability | server/dispatch/sessionDiff.ts:121 | Los docstrings de DiffStats y de isIntegralReviewComplete siguen diciendo que todo binario es un asset que no bloquea |  |
| kanai-medir-ejecucion-real-r3/h2 | S3 | correctness | server/dispatch/sessionDiff.ts:104 | TEXT_FILE es una lista blanca de extensiones: Dockerfile, Makefile, .env, .svg, .ini, .tf marcados binarios pasan como asset |  |
| kanai-medir-ejecucion-real-r3/h3 | S3 | maintainability | server/dispatch/sessionDiff.ts:80 | Un archivo de codigo binario llega al juez como cortado y no en la nota de binarios |  |
| kanai-medir-ejecucion-real-r3/g4 | S3 | correctness | server/dispatch/integralReview.ts:60 | Una foto que treeDelta no puede leer bloquea la aprobacion, mientras una foto ausente no | arrastrado de kanai-medir-ejecucion-real-r2/g4 |
| kanai-medir-ejecucion-real-r3/g5 | S3 | performance | server/dispatch/integralReview.ts:25 | Atribucion de hallazgos previos por subcadena y por repo | arrastrado de kanai-medir-ejecucion-real-r2/g5 |
| kanai-medir-ejecucion-real-r3/g7 | S3 | correctness | server/dispatch/gateLevels.ts:292 | Un consumidor incompleto deja DiffStats.complete en false aunque ningun repo fallo | arrastrado de kanai-medir-ejecucion-real-r2/g7 |
| kanai-medir-ejecucion-real-r3/g8 | S3 | scope_creep | docs/worklog-2026-10-05-plan-partido-sqlite-busy.md:1 | El worklog de SQLITE_BUSY no pertenece a ninguna fase del plan | arrastrado de kanai-medir-ejecucion-real-r2/g8 |
| kanai-medir-ejecucion-real-r3/f7 | S3 | correctness | server/repo/ticketReviewBase.ts:14 | El marcador del ref no esta anclado al inicio del subject | arrastrado de kanai-medir-ejecucion-real-r2/f7 |
| kanai-medir-ejecucion-real-r3/f8 | S3 | performance | server/repo/ticketReviewBase.ts:11 | git log --first-parent recorre toda la historia con maxBuffer de 16MB y timeout de 15s | arrastrado de kanai-medir-ejecucion-real-r2/f8 |
| kanai-medir-ejecucion-real-r3/f9 | S3 | maintainability | server/dispatch/gateLevels.ts:105 | La foto del N3 sale de reposOnWorkBranch que exige package.json | arrastrado de kanai-medir-ejecucion-real-r2/f9 |
| kanai-medir-ejecucion-real-r3/f11 | S3 | correctness | server/dispatch/gateLevels.ts:281 | impactRoots de un repo que ya no se recorre nunca se limpia | arrastrado de kanai-medir-ejecucion-real-r2/f11 |
| kanai-medir-ejecucion-real-r3/c1 | consulta | correctness | server/dispatch/integralReview.ts:23 | La reutilizacion compara el contenido del arbol, no la base del diff |  |
| kanai-medir-ejecucion-real-r3/c2 | consulta | correctness | docs/gate-niveles.md:15 | Como se destraba un N3 bloqueado por un archivo de codigo marcado -diff de forma permanente o borrado |  |
| kanai-medir-ejecucion-real-r3/f2 | consulta | correctness | server/dispatch/integralReview.ts:45 | El contexto de consumidores entra al juez sin hunks y el chequeo de evidencia no lo indexa | arrastrado de kanai-medir-ejecucion-real-r2/f2 |
| kanai-medir-ejecucion-real-r3/f4 | consulta | correctness | server/repo/ticketReviewBase.ts:16 | La frontera usa el commit propio identificado mas antiguo | arrastrado de kanai-medir-ejecucion-real-r2/f4 |
| kanai-medir-ejecucion-real-r3/f5 | consulta | correctness | server/repo/ticketReviewBase.ts:25 | Una rama acumuladora sin commits propios hace fallar ticketBranchRanges entero | arrastrado de kanai-medir-ejecucion-real-r2/f5 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| kanai-medir-ejecucion-real-r1/f1 | S1 | server/dispatch/gateLevels.ts:312 | reviewComplete queda en false para siempre si el ticket incluye un binario | re-chequeo: corregido |
| kanai-medir-ejecucion-real-r1/f3 | S2 | server/dispatch/gateContext.ts:197 | En el rerun el juez no recibe la lista de archivos reutilizados y codeScope sigue diciendo rama completa | re-chequeo: corregido |
| kanai-medir-ejecucion-real-r1/f6 | S2 | server/repo/preGate.ts:129 | ticketBranchDiff se documenta como fail-open pero ticketBranchRanges ahora propaga errores | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
