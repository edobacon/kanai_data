# Protocolo de medición del experimento (preparación de F4)

Fecha: 2026-10-04. Caso: kanai-ejecucion-ticket. Esto **no ejecuta** el experimento: fija de antemano qué se
mide, con qué instrumento, cómo se comparan las patas y qué resultado lleva a qué decisión, para que F4 no
tenga que decidirlo el día que se pueda correr.

## Las tres patas

| Pata | Qué es | Estado |
|---|---|---|
| **P** | Por tarea: un subagente en frío por dispatch (lo que hace el piloto) | **Ya medible**: TAO-182 S1/S2/S3 |
| **E** | Encadenada por el motor: la sesión en un solo agente con checkpoint por tarea (lo que construye F2, detrás de bandera) | No existe todavía |
| **T** | Testigo inline: la forma del camino de casos inline | Caracterizado en F1: útil pero **no verificado contra Git** |

## El confusor que hay que declarar en cada pata

La granularidad del dispatch **no es la misma** entre patas ni dentro de P. El motor de épicas despacha por
**hoja**, así que una sesión con subtareas paga más arranques que una sin ellas:

| Sesión de TAO-182 | Tareas de primer nivel | Hojas | Corridas | Entrada | Agente |
|---|---|---|---|---|---|
| S1 | 4 | 4 | 4 | 2,56 M | 33,6 min |
| S2 | 2 | 4 | 5 | 5,92 M | 83,3 min |
| S3 | 4 | 7 | 4 de 7 | 4,04 M | 37,7 min |

**Regla: toda comparación se hace contra la cantidad de dispatches, no contra la cantidad de tareas.** Sin
eso, una sesión con subtareas parece más lenta solo por tener más hojas, y E podría "ganar" únicamente por
cambiar la unidad de dispatch. F2 tiene que declarar su unidad explícitamente para que la comparación sea
legible.

## Qué se mide, y de dónde sale

| Métrica | Fuente | Comando |
|---|---|---|
| Utilización (min de agente / min de reloj), del ticket y por sesión | `agent_runs` | `pnpm tsx scripts/metrics-ticket-timeline.mts <ticket> --idle 15` |
| Tokens de entrada y salida, y su relación | `agent_runs` | igual |
| Traspasos (huecos de 1 a 15 min / activo) | `agent_runs` | igual |
| Dispatches por sesión y hojas por sesión | `agent_runs` + `tasks` | consulta por sesión (ver el registro `pata-por-tarea-piloto.md`) |
| Gates por sesión y vueltas de gate | `gate_runs` | `close_gate` deja su corrida y su decisión |
| Hallazgos reales por gate y su severidad | `gate_findings` | `roadmap_metrics` |
| Casos citados y promovidos | `test_cases` | `get_coverage` |
| Completitud de telemetría de la ventana | `agent_runs` | `pnpm tsx scripts/metrics-baseline.mts --all --since <inicio>` |

**El instrumento ya está y es el mismo para las tres patas** (F0). Eso es lo que hace comparable la medición:
misma vara, misma ventana declarada.

## Controles de comparabilidad

1. **Misma ventana declarada** en las tres patas, y completitud de telemetría por encima del piso en esa
   ventana (si no, la comparación no vale y hay que decirlo).
2. **Mismo tipo de sesión**: si P se mide en una sesión con subtareas, E se mide en una sesión con
   subtareas. Comparar P-con-subtareas contra E-sin-subtareas no dice nada.
3. **Contigüidad**: sesiones del mismo ticket o de tickets del mismo módulo, en días seguidos.
4. **Muestra declarada**: cuántas sesiones por pata. Con una sesión por pata, el resultado es una
   observación, no una conclusión, y así hay que presentarlo.
5. **Lo que no se atribuye**: si E mejora, no se le atribuye a la sesión única todo el delta: parte es la
   unidad de dispatch y parte es menos re-descubrimiento. Se separan con la tabla de dispatches y hojas.

## La guarda de calidad (sin esto el ahorro no se expande)

- Hallazgos reales por gate: no debe subir la tasa de aprobaciones con hallazgos.
- Escapes: enmiendas post-cierre y reaperturas desde `ready_to_close` (métrica M10 del roadmap).
- Casos citados y promovidos: no deben caer.
- Tickets de la pata E que habrían cerrado con menos evidencia que los de P.

## Regla de decisión, escrita antes de medir

| Resultado | Decisión |
|---|---|
| E baja tokens y reloj por dispatch sin empeorar la calidad | Activar E por defecto, con la unidad de dispatch declarada |
| E baja el reloj pero no los tokens | Evaluar: el reloj es el dolor declarado; aceptar con la revisión reforzada de F3 |
| E no mejora a P | **Adoptar la forma del testigo** (ejecución en caliente con el agente que conduce) en vez de construir otra cosa |
| E mejora pero la calidad empeora | Revertir; la comparación no se expande |
| La muestra no alcanza para decidir | No expandir y decirlo: preferible a atribuir causalidad sin muestra (regla del roadmap 10) |

## Lo que ya está y lo que falta

- **P**: disponible y medible; falta el gate de S3 para cerrar cada sesión como unidad.
- **E**: no existe; es F2, detrás del piloto.
- **T**: caracterizado, con su hueco de medición declarado (cero tokens registrados en el camino inline).
