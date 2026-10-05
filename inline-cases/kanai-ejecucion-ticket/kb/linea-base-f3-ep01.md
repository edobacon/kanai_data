# Línea base de F3.1 y F3.2: los gates de EP-01 (TAO-181 y TAO-182), congelados

Fecha de la foto: 2026-10-05, leída del store en solo lectura (tablas `gate_runs` y `gate_findings`).

## Estado del piloto al congelar

- La corrida `cfaec5f3` de EP-01 integró TAO-181 y TAO-182 en `epic/EP-01` (TAO-182 a las 00:41 del 2026-10-05), se pausó por fin de jornada y se canceló a las 12:42 por reemplazo del plan.
- La épica se partió: **EP-01** quedó con TAO-181 y TAO-182 (versión 44, aprobada, sin corrida) y **EP-01a** con TAO-183 a TAO-188 (versión 4, sin aprobar, sin corrida, 14 hitos de dependencia configurados).
- Con eso **F2.pre2 se cumple**: no hay corrida en curso que contaminar.
- Decisión del dev (2026-10-05): **opción A**. El "antes" son los gates de EP-01; el "después" es EP-01a corrida con el modo exigente de evidencia y el refutador encendidos.

## Configuración vigente durante el "antes"

| Interruptor | Valor |
|---|---|
| `KANAI_JUDGE_EVIDENCE` | `measure` (pide la cita, no la exige) |
| `KANAI_JUDGE_REFUTER` | sin definir (apagado) |
| `KANAI_JUDGE_CANARY_RATE` | `0.2` |
| `KANAI_SESSION_SCOPE` | `on` |
| `KANAI_TASK_REVIEW` | sin definir |

## Los 15 gates y su clasificación

| Ticket | Alcance | Nivel | Decisión | Hora (UTC) | Clase |
|---|---|---|---|---|---|
| TAO-181 | S1 | N2 | approve | 10-04 07:20 | válido |
| TAO-181 | S2 | N2 | approve | 10-04 12:08 | válido |
| TAO-181 | S3 | N2 | approve | 10-04 15:26 | válido |
| TAO-181 | S4 | N2 | approve | 10-04 17:44 | válido |
| TAO-181 | integral | N3 | iterate | 10-04 17:46 | válido (REQ-10 en tablet, hallazgo real) |
| TAO-182 | S1 | N2 | approve | 10-04 18:40 | válido |
| TAO-182 | S2 | N2 | iterate | 10-04 20:40 | válido (cobertura de goldens incompleta) |
| TAO-182 | S2 | N1 | iterate | 10-04 20:42 | válido (mismo hallazgo, sin corregir aún) |
| TAO-182 | S2 | N1 | approve | 10-04 21:13 | válido |
| TAO-182 | S3 | N2 | approve | 10-05 00:33 | válido |
| TAO-182 | integral | N3 | iterate | 10-05 00:33 | **artefacto**: "la rama no tiene cambios respecto de su base" |
| TAO-182 | integral | N3 | iterate | 10-05 00:35 | **artefacto**: mismo motivo |
| TAO-181 | integral | N3 | iterate | 10-05 13:50 | **artefacto**: diff invertido (borra 12.557 líneas, incluida la suite de goldens de TAO-182) |
| TAO-181 | integral | N3 | iterate | 10-05 13:55 | **artefacto**: mismo diff invertido |
| TAO-181 | integral | N3 | iterate | 10-05 14:00 | **artefacto**: diff vacío |

## Números del "antes"

| Medida | Valor |
|---|---|
| Gates válidos | 10 (9 de sesión, 1 integral) |
| Iterate en gates válidos | 3 de 10 (**30%**) |
| Iterate en gates de sesión | 2 de 9 (22%) |
| Iterate en el integral válido | 1 de 1 |
| Hallazgos del refutador | 0 (estaba apagado) |
| Gates artefacto (excluidos) | 5 de 15 (33%) |

Los hallazgos de tipo `spec-judge` (revisión del spec, no del código) no entran en la muestra.

## Hallazgo aparte: el gate integral post-integración mide el diff equivocado

Cinco de los 15 gates son integrales corridos **después** de integrar el ticket en la rama acumuladora. Comparan la rama del ticket contra una base que ya contiene su propio trabajo (diff vacío) o el trabajo de otro ticket posterior (diff invertido, que se lee como "borra la suite de goldens"). El juez reporta hallazgos críticos que no existen.

Impacto en F3: si el "después" de EP-01a incluye integrales de este tipo, la tasa de iterate sube por el artefacto y no por el modo exigente ni por el refutador. **Regla de lectura para el "después"**: excluir todo gate cuyo diff esté vacío o cuyo `created_at` sea posterior al `ticket_integrated` de su ticket.

Los tres integrales de TAO-181 del 2026-10-05 entre las 13:50 y las 14:00 se corrieron con EP-01 ya cerrada; no está claro desde qué sesión. Queda anotado para revisar.

## Cómo reproducir

```
sqlite3 -readonly ~/.kanai/data/kanai_data/kanai.db "select ticket_id, session_id, level, decision, judge_count, tokens_in, tokens_out, datetime(created_at,'unixepoch') from gate_runs where ticket_id in ('TAO-181','TAO-182') order by created_at;"
```
