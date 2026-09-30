---
plan_id: kanai-capacidades-memoria-2026-09-29
created: 2026-09-30T00:47:33.100Z
updated: 2026-09-30T01:02:59.930Z
tags:
  projects:
    - kanai_self
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/repo
    - server/data
    - server/dispatch
    - server/mcp
    - docs
  labels:
    - memoria
    - entrega
    - data-repo
    - seguimientos
    - gate
    - calidad
---

# Arbiter: kanai-capacidades-memoria-2026-09-29

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-20260929 | 2026-09-29T21:52:00Z | 9adcec9 | iterar | 0 / 0 / 4 / 2 / 0 | 39/50 completos, 5 sin leer |
| r2-20260929 | 2026-09-29T22:10:00Z | 223954b | aprobable_con_reservas | 0 / 0 / 1 / 1 / 0 | 12/12 completos, 0 sin leer |
| r3-20260929 | 2026-09-29T22:20:00Z | c6d426d | aprobable_con_reservas | 0 / 0 / 1 / 2 / 1 | 2/2 completos, 0 sin leer |
| r4-20260929 | 2026-09-29T22:27:00Z | d417d0e | aprobable_con_reservas | 0 / 0 / 1 / 1 / 1 | 2/2 completos, 0 sin leer |
| r5-20260929 | 2026-09-29T22:34:00Z | 53b2ca9 | aprobable_con_nits | 0 / 0 / 0 / 1 / 1 | 3/3 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r5-20260929/j1 | S3 | correctness | server/repo/deliveryStatus.ts:298 | El filtro por 'D' tambien descarta entradas sin fusionar (UD/DU) cuyo archivo existe y pudo cambiar despues del arranque |  |
| r5-20260929/m4 | consulta | correctness | server/repo/deliveryStatus.ts:291-297 | Descartar cambios despues del arranque no se detecta: el MCP corre codigo que ya no esta en disco | arrastrado de r4-20260929/m4 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| r1-20260929/f1 | S2 | docs/data-workspace.md | La doc dice que el data repo se auto-commitea 'solo' al aprobar gate y cerrar ticket, pero tambien se commitea al tocar seguimientos y config de calidad | re-chequeo: corregido |
| r1-20260929/f2 | S2 | server/dispatch/gate.ts:340-341 | El aviso de ids internos se documenta como 'default on', pero solo corre con KANAI_GATE_LEVELS=on (que viene apagado por defecto) | re-chequeo: corregido |
| r1-20260929/f3 | S2 | server/dispatch/gateDecision.ts:48 | El hallazgo de cobertura baja sigue diciendo 'ajustable con KANAI_COVERAGE_FLOOR' aunque ahora manda el piso del proyecto | re-chequeo: corregido |
| r1-20260929/f4 | S2 | server/dispatch/gateChecks.ts:104-112 | La conexion de la config de calidad dentro de runTargetRepoChecks (checks de CI + flaky por repo) no tiene test | re-chequeo: corregido |
| r1-20260929/f5 | S3 | server/llm/resume.ts | Al retomar un ticket no se muestran los seguimientos del proyecto que no tienen ticket, ni siquiera como conteo | re-chequeo: corregido |
| r1-20260929/f6 | S3 | server/repo/deliveryStatus.ts | restartNeeded solo mira commits: el codigo del server editado y sin commitear no marca que hay que reiniciar el MCP | re-chequeo: corregido |
| r2-20260929/n1 | S2 | server/repo/deliveryStatus.ts:302 | uncommittedCode afirma que el MCP no usa los cambios sin commitear, aunque se hayan hecho antes de arrancar | re-chequeo: corregido |
| r2-20260929/n2 | S3 | server/repo/deliveryStatus.ts:302 | uncommittedCode traga el error de git y reporta 0 en vez de 'no se pudo contar' | re-chequeo: corregido |
| r3-20260929/m1 | S2 | server/repo/deliveryStatus.ts:293-295 | Una carpeta nueva sin trackear se mide por el mtime de la carpeta: una edicion posterior al arranque dentro de ella no se cuenta | re-chequeo: corregido |
| r3-20260929/m2 | S3 | server/repo/deliveryStatus.ts:295 | Todo error de statSync cuenta como 'no editado', no solo el archivo borrado | re-chequeo: corregido |
| r3-20260929/m3 | S3 | server/repo/deliveryStatus.ts:289-290 | El docstring de codeChangedSinceBoot quedo encima de la funcion nueva: dos JSDoc seguidos | re-chequeo: corregido |
| r4-20260929/k1 | S2 | server/repo/deliveryStatus.ts:299 | La nueva rama 'error de lectura distinto de ENOENT cuenta como editado' no tiene test | re-chequeo: corregido |
| r4-20260929/k2 | S3 | server/repo/deliveryStatus.ts:299 | Rutas que git entrecomilla en porcelain dan ENOENT y se cuentan como 'no editado' | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
