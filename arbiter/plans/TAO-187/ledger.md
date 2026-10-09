---
plan_id: TAO-187
created: 2026-10-09T13:02:05.323Z
updated: 2026-10-09T13:02:05.323Z
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

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| TAO-187-r1-taomangalam/f1 | S3 | correctness | app/lib/features/app_update/presentation/recommended_update_dialog.dart:99 | Si se toca Actualizar y la plataforma no abre la tienda, el aviso se cierra sin explicacion y la eleccion se registra como mas_tarde |  |
| TAO-187-r1-taomangalam/f2 | consulta | intent_gap | app/lib/features/app_update/application/recommended_update_coordinator.dart:43 | La espera por el modal introductorio es solo un contrato (introModalVisibleProvider) que nadie publica en la app |  |
| TAO-187-r1-taomangalam/f3 | S3 | maintainability | app/lib/features/app_update/application/recommended_update_policy.dart:32 | VersionCheckOffline nunca se produce en produccion: la falta de red llega como VersionCheckError |  |
| TAO-187-r1-taomangalam/b2-f1 | S3 | maintainability | app/test/update/recommended_update_flow_test.dart:339 | Mas tarde cierra el aviso y la vista anfitriona queda interactiva no prueba que la vista reciba toques |  |
| TAO-187-r1-taomangalam/b2-f2 | S3 | maintainability | app/test/update/recommended_update_flow_test.dart:300 | En el test sin conexion, expect(server.versionRequests, 0) es tautologico y el caso el servicio no responde no se ejercita |  |
| TAO-187-r1-taomangalam/b2-f3 | S3 | maintainability | app/test/update/recommended_update_flow_test.dart:174 | El flow test usa LiveTestWidgetsFlutterBinding con esperas de reloj real en vez de tester.runAsync |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
