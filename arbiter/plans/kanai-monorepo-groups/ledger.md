---
plan_id: kanai-monorepo-groups
created: 2026-10-07T23:46:18.272Z
updated: 2026-10-07T23:46:18.272Z
tags:
  projects: []
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders: []
  labels:
    - monorepos
    - epicas
---

# Arbiter: kanai-monorepo-groups

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| monorepo-groups-r1 | 2026-10-07T23:50:00.000Z | 871c9f78d8f4ff05e0ebc1cf086ebb28bb21ed33 | iterar | 0 / 0 / 3 / 2 / 1 | - |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| monorepo-groups-r1/f1 | S2 | maintainability | docs/monorepos.md:46 | docs/monorepos.md dice que update emite repo_resolved y no lo hace |  |
| monorepo-groups-r1/f2 | S2 | maintainability | server/dispatch/sessionCommit.ts:98 | unstageGroupSyncOutput sin test |  |
| monorepo-groups-r1/f3 | S2 | maintainability | server/repo/preGate.ts:192 | ticketBranchRanges por grupo sin test |  |
| monorepo-groups-r1/f4 | S3 | correctness | server/dispatch/sessionCommit.ts:101 | carpeta agrupada inexistente en la rama con config de sync rompe el commit de la raiz |  |
| monorepo-groups-r1/f5 | S3 | correctness | server/epics/store.ts:58 | assertAvailable compara repo sin grupos |  |
| monorepo-groups-r1/f6 | consulta | breaking_change | server/repo/dependencyIntegration.ts:139 | dependencias fuera de epica verifican contra la defaultRef de la raiz |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
