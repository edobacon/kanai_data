# Baseline del flujo actual (congelado)

Fecha de congelamiento: 2026-10-04. Fuente: lectura del store vivo (kanai.db, agent_runs y gate_runs) más los informes del MCP. Caso: kanai-pre-epica, tarea F0.2.

## 1. Foto del corpus

| Dato | Valor |
|---|---|
| Tickets creados | 44 |
| Cerrados | 31 |
| Listos para cerrar | 1 (TAO-181) |
| En curso | 1 (TAO-182) |
| Abiertos | 11 |
| Con spec materializado | 34 |
| Sin planificar | 10 (TAO-183, 184, 185, 187, 188, 189, 190, 191, 192, 193) |
| Ejecuciones de agente registradas | 1684 |
| Tokens registrados en ejecuciones | 361055325 |

## 2. Completitud de telemetría (F0.1)

Sobre 1684 ejecuciones: **63% con duración** y **67% con tokens**.

| Backend | Ejecuciones | Con duración | Con tokens | Tokens |
|---|---|---|---|---|
| OpenCode | 785 | 65% | 76% | 312511762 |
| Claude Code | 822 | 61% | 57% | 43658008 |
| Codex | 47 | 85% | 85% | 4881760 |
| LLM local | 19 | 68% | 68% | 3795 |
| motor | 11 | 0% | 0% | 0 |

Hallazgo: la duración se completa en el servidor cuando el host no la informa (`subagentReport.ts`: `durationMs = input.durationMs ?? Date.now() - run.createdAt`), así que el hueco real son los **tokens** en los hosts sin plugin que los informe. OpenCode los informa con el plugin del instalador; DSH no tiene plugin equivalente y su API de puente MCP no permite inyectar argumentos, así que el cierre es del host, no de kanai-app.

## 3. Gasto por tipo de ejecución

| Rol / tipo | Ejecuciones | Tokens | Con tokens | Duración acumulada |
|---|---|---|---|---|
| developer | 862 | 281585703 | 61% | 177046932 ms |
| reviewer | 544 | 41525824 | 70% | 16369863 ms |
| researcher | 198 | 19875679 | 73% | 10826808 ms |
| tester | 4 | 14550395 | 100% | 1504937 ms |
| scribe | 1 | 2672333 | 100% | 149151 ms |
| chat | 65 | 845391 | 100% | 1526501 ms |
| motor | 10 | 0 | 0% | 0 ms |

## 4. Tickets de referencia

| Ticket | Ejecuciones | Tokens | Con tokens | Duración acumulada | Gates (tokens) |
|---|---|---|---|---|---|
| TAO-181 | 31 | 10591542 | 100% | 10720255 ms | 5 (859223) |
| TAO-182 | 14 | 9315779 | 100% | 7243622 ms | 4 (359648) |

Por tipo, dentro de esos dos tickets:

| Ticket | Rol / tipo | Ejecuciones | Tokens |
|---|---|---|---|
| TAO-181 | developer | 22 | 9386931 |
| TAO-181 | reviewer | 7 | 999192 |
| TAO-181 | researcher | 2 | 205419 |
| TAO-182 | developer | 10 | 8956131 |
| TAO-182 | reviewer | 4 | 359648 |

Top de tickets por tokens:

| Ticket | Ejecuciones | Tokens |
|---|---|---|
| TAO-171 | 44 | 71771620 |
| TAO-172 | 34 | 26035322 |
| TAO-166 | 41 | 20935105 |
| TAO-174 | 21 | 18752361 |
| TAO-175 | 23 | 18141640 |
| TAO-179 | 31 | 17830710 |
| TAO-165 | 32 | 16511408 |
| TAO-164 | 19 | 15047826 |

## 5. Lectura del baseline

- El gasto se concentra en las ejecuciones de developer: es el 73% de los tokens de TAO-181 (medido en el diagnóstico del caso).
- La telemetría de tokens falta en los backends sin plugin: sin cerrarla, la comparación del piloto queda ciega justo en los hosts donde corre.
- Nada de este baseline se obtuvo mutando el store ni los tickets: todas las consultas son de lectura (PRAGMA query_only).
