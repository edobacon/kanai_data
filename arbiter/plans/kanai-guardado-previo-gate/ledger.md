---
plan_id: kanai-guardado-previo-gate
created: 2026-10-05T22:09:34.739Z
updated: 2026-10-05T22:21:19.673Z
tags:
  projects: []
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/dispatch
    - server/repo
  labels:
    - guardado-previo
    - gate
    - kanai-ejecucion-ticket
---

# Arbiter: kanai-guardado-previo-gate

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| kanai-guardado-previo-gate-r1 | 2026-10-05T22:10:30Z | 51deac35f94c459c048b37b562f4134f9512981f | iterar | 0 / 0 / 3 / 2 / 0 | 10/12 completos, 2 sin leer |
| kanai-guardado-previo-gate-r2 | 2026-10-05T22:23:30Z | 9aa721d | aprobable_con_reservas | 0 / 0 / 1 / 0 / 0 | 5/7 completos, 2 sin leer |
| kanai-guardado-previo-gate-r3 | 2026-10-05T22:26:30Z | e9ce41b | aprobado | 0 / 0 / 0 / 0 / 0 | 1/1 completos, 0 sin leer |

## Abiertos (ultima corrida)

Ninguno.

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| kanai-guardado-previo-gate-r1/f1 | S2 | server/dispatch/gate.ts:384 | Si el guardado previo falla en una re-entrada, el gate ve solo lo sin commitear y pierde los commits anteriores de la sesion | re-chequeo: corregido |
| kanai-guardado-previo-gate-r1/f2 | S2 | server/repo/preGate.ts:395 | El docstring de repoChangedFiles todavia dice que el gate commitea recien al aprobar | re-chequeo: corregido |
| kanai-guardado-previo-gate-r1/f3 | S2 | server/dispatch/sessionCommit.ts:206 | commitBeforeIntegralGate no exige que las sesiones de trabajo esten cerradas y puede atribuir trabajo en curso a otra sesion | re-chequeo: corregido |
| kanai-guardado-previo-gate-r1/f4 | S3 | server/dispatch/sessionCommit.ts:213 | commitBeforeIntegralGate elige la ultima sesion de codigo con un criterio propio en vez de sessionPolicy, sin excluir sesiones reemplazadas | re-chequeo: corregido |
| kanai-guardado-previo-gate-r1/f5 | S3 | server/dispatch/gateOutcome.ts:140 | Al aprobar, todo resto se rotula 'ajustes al cerrar el gate' aunque no haya habido guardado previo | re-chequeo: corregido |
| kanai-guardado-previo-gate-r2/f1 | S2 | server/repo/preGate.ts:344 | El comentario de reposOnWorkBranch dice que los commits de la sesion se resuelven SOLO con el arbol limpio, y el delta ahora tambien los resuelve con el arbol sucio | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
