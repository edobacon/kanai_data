---
plan_id: TAO-187
created: 2026-10-09T13:02:05.323Z
updated: 2026-10-09T13:14:26.942Z
tags:
  projects:
    - taomangalam
  repos:
    - taomangalam
  tickets:
    - TAO-187
    - GH-65
  branches:
    - epic/EP-01a
  folders:
    - app/lib/features/app_update
    - app/test/update
    - app/widgetbook
  labels:
    - HU-01-19
---

# Arbiter: TAO-187

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| TAO-187-r1-taomangalam | 2026-10-09T10:20:00-03:00 | 474578d19f4529bd5c8a2b4f1c3af61c75648fc2 | aprobable_con_nits | 0 / 0 / 0 / 5 / 1 | 18/22 completos, 0 sin leer |
| TAO-187-r2-taomangalam | 2026-10-09T10:15:00-03:00 | 40bfb8a62f64a4b3aac04217e0776583137d6f84 | aprobable_con_reservas | 0 / 0 / 1 / 1 / 1 | 4/6 completos, 0 sin leer |
| TAO-187-r3-taomangalam | 2026-10-09T10:40:00-03:00 | e7948bc0b84bb2c5ef1011ee3308c363b7abddb4 | aprobable_con_nits | 0 / 0 / 0 / 0 / 1 | 3/7 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| TAO-187-r3-taomangalam/c1 | consulta | intent_gap | app/lib/features/app_update/application/recommended_update_coordinator.dart:49 | La espera por el modal introductorio es solo un contrato (introModalVisibleProvider) que nadie publica en la app | arrastrado de TAO-187-r2-taomangalam/c1 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| TAO-187-r1-taomangalam/f1 | S3 | app/lib/features/app_update/presentation/recommended_update_dialog.dart:99 | Si se toca Actualizar y la plataforma no abre la tienda, el aviso se cierra sin explicacion y la eleccion se registra como mas_tarde | re-chequeo: corregido |
| TAO-187-r1-taomangalam/f3 | S3 | app/lib/features/app_update/application/recommended_update_policy.dart:32 | VersionCheckOffline nunca se produce en produccion: la falta de red llega como VersionCheckError | re-chequeo: corregido |
| TAO-187-r1-taomangalam/b2-f1 | S3 | app/test/update/recommended_update_flow_test.dart:339 | Mas tarde cierra el aviso y la vista anfitriona queda interactiva no prueba que la vista reciba toques | re-chequeo: corregido |
| TAO-187-r1-taomangalam/b2-f2 | S3 | app/test/update/recommended_update_flow_test.dart:300 | En el test sin conexion, expect(server.versionRequests, 0) es tautologico y el caso el servicio no responde no se ejercita | re-chequeo: corregido |
| TAO-187-r1-taomangalam/b2-f3 | S3 | app/test/update/recommended_update_flow_test.dart:174 | El flow test usa LiveTestWidgetsFlutterBinding con esperas de reloj real en vez de tester.runAsync | re-chequeo: corregido |
| TAO-187-r2-taomangalam/f1 | S2 | app/lib/features/app_update/application/recommended_update_observability.dart:14 | El docstring de recommendedUpdateChoiceUpdate dice 'con la tienda abierta' pero el valor tambien se emite con updateFailed | re-chequeo: corregido |
| TAO-187-r2-taomangalam/f2 | S3 | app/test/update/recommended_update_flow_test.dart:361 | La asercion hitTestable con el aviso abierto no prueba el velo: pasaria tambien sin velo | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
