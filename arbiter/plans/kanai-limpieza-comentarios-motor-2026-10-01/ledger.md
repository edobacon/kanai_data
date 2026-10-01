---
plan_id: kanai-limpieza-comentarios-motor-2026-10-01
created: 2026-10-01T15:02:31.242Z
updated: 2026-10-01T15:48:57.584Z
tags:
  projects:
    - kanai
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/cleaner
    - server/mcp
    - skills/claude/kn-cleaner
  labels:
    - kn-cleaner
    - comment-cleanup
---

# Arbiter: kanai-limpieza-comentarios-motor-2026-10-01

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| kanai-limpieza-motor-2026-10-01-r1-kanai-app | 2026-10-01T12:05:00-03:00 | bd9f91c | iterar | 0 / 1 / 7 / 4 / 3 | 30/30 completos, 0 sin leer |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app | 2026-10-01T12:50:00-03:00 | 352af32 | iterar | 0 / 1 / 8 / 4 / 1 | 24/25 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b1-f1 | S1 | correctness | server/cleaner/tsTokens.ts:63 | El tokenizador marca como comentario texto JSX y regex mal desambiguadas, y la huella no lo ve: borrarlo pasa la verificacion |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b1-f2 | S2 | correctness | server/cleaner/lines.ts:23 | El analisis por lineas no cubre bloques literales YAML en listas, strings multilinea entre comillas ni comillas escapadas |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b1-f3 | S2 | correctness | server/cleaner/lines.ts:76 | Fuera de py/yaml el analisis por lineas no sigue heredocs ni strings multilinea |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b1-f4 | S2 | correctness | server/cleaner/lines.ts:105 | Un .vue sin <script> reconocible cae al analisis por lineas con // y /* activos sobre el template |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b1-f5 | S2 | correctness | server/cleaner/apply.ts:43 | isCommentText acepta un /* sin cierre y la huella no lo ve si lo que sigue son comentarios o EOF |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b2-f1 | S2 | correctness | server/cleaner/run.ts:189 | El reintento automatico tras un fallo casi nunca se dispara (no se engancha al cierre de sesiones especiales como el N3) |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b2-f2 | S2 | maintainability | docs/kn-cleaner.md:44 | Doc y skill prometen un N3 sobre el codigo limpio que con KANAI_GATE_LEVELS=off (default) no corre, y nadie verifica lo aplicado |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b2-f3 | S2 | correctness | server/cleaner/resolve.ts:49 | La auditoria comment_cleanup registra actor human aunque la confirmacion la haya declarado el agente |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b2-f4 | S2 | correctness | server/mcp/cleanupTools.ts:21 | apply y run de comment_cleanup escriben y commitean sin reservar el ticket |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/b1-f5 | S3 | correctness | server/cleaner/inventory.ts:44 | La heuristica de codigo comentado marca prosa con parentesis, '=' o '=>' (camino sin modelo) | arrastrado de kanai-limpieza-motor-2026-10-01-r1-kanai-app/b1-f5 |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/b1-f6 | S3 | correctness | server/cleaner/apply.ts:119 | Un archivo con fines de linea mezclados se reescribe entero en CRLF | arrastrado de kanai-limpieza-motor-2026-10-01-r1-kanai-app/b1-f6 |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b2-f5 | S3 | correctness | server/mcp/cleanupTools.ts:29 | El binding de la confirmacion no identifica la propuesta |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b2-f6 | S3 | maintainability | skills/claude/kn-cleaner/SKILL.md:132 | SKILL.md describe los cambios como repo/archivo:linea y la propuesta usa repo:ruta:linea |  |
| kanai-limpieza-motor-2026-10-01-r2-kanai-app/r2-b1-f7 | consulta | maintainability | server/cleaner/tsTokens.ts:26 | El fallback sin typescript solo se avisa por console.warn; no llega al reporte |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
