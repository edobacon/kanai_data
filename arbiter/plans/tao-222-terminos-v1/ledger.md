---
plan_id: tao-222-terminos-v1
created: 2026-10-11T13:37:44.612Z
updated: 2026-10-11T13:37:44.612Z
tags:
  projects:
    - taomangalam
  repos:
    - taomangalam
  tickets:
    - TAO-222
    - GH-93
  branches:
    - epic/EP-03a-cuenta-dispositivo
  folders:
    - docs/legal
    - app/assets/legal
    - server/legal
    - server/src/test/legal
  labels:
    - legal
    - terminos
---

# Arbiter: tao-222-terminos-v1

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| tao-222-terminos-v1-r1 | 2026-10-11T00:10:00Z | worktree | aprobable_con_reservas | 0 / 0 / 1 / 2 / 2 | 6/6 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| tao-222-terminos-v1-r1/f1 | S2 | intent_gap | docs/legal/terminos-v1.0.md:30 | El resumen dice que eliminar la cuenta se confirma escribiendo BORRAR, pero para cuenta completa DEC-054 exige codigo por correo y confirmacion final |  |
| tao-222-terminos-v1-r1/f2 | S3 | maintainability | docs/legal/terminos-v1.0.md:80 | Excepciones del bloqueo por version pendiente omiten el manifiesto que lista DEC-225 |  |
| tao-222-terminos-v1-r1/f3 | S3 | maintainability | server/src/test/legal/lectura-empaquetada.test.ts:36 | El fixture de lectura-empaquetada conserva vigenteDesde 2026-10-01 mientras el texto vigente_desde es 2026-11-01 |  |
| tao-222-terminos-v1-r1/f4 | consulta | maintainability | docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1759 | El backlog EP-03a sigue describiendo terminos-v1.0.md como fixture tecnico de ingenieria |  |
| tao-222-terminos-v1-r1/f5 | consulta | maintainability | docs/legal/terminos-v1.0.md:190 | El texto fija 12 meses de inactividad aunque DEC-224 lo declara clave de configuracion |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
