# Caso inline: Medir con corridas reales las mejoras de ejecución de Kanai

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Integrar en kanai-app (rama local desde setup, sin push) los cambios del caso kanai-optimizar-ejecucion y medir con corridas reales de LLM, en KT, si bajan los rebotes del gate N3, los tokens por gate y el tiempo, contra la línea base de TAO-192, TAO-191 y TAO-186, con las metas: sandbox que corre, cero hallazgos por diff heredado, N3 en 2 rondas o menos y menos de 1M de tokens por gate; sin modificar el alcance de ningún ticket existente ni la ejecución del ticket real TAO-192.
**Tags:** repos: kanai-app, kanai-app-codex · tickets: TAO-192, TAO-191, TAO-186 · labels: kanai, ejecucion, gates, medicion
**Etapa:** cerrado

## Falta

- Nada que bloquee.

## Avisos

- Sin avisos.

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| kanai-app | configurada | setup (existe) | feat/medir-ejecucion-real | Checkout principal de Kanai (el que corre el MCP): aquí se integran los cambios en una rama local desde setup, sin push. |
| kanai-app-codex | configurada | setup (existe) | feat/optimizar-ejecucion | Copia aislada de la sesión de Codex con los 8 commits del caso kanai-optimizar-ejecucion; solo se lee, es el origen de los cambios a integrar. |

## Ambientes

- KT: Proyecto de pruebas de Kanai: aquí corren las corridas reales con LLM.
- taomangalam: Proyecto con TAO-192, TAO-191 y TAO-186 (solo lectura: no se re-ejecuta ningún gate sobre tickets reales).

## Personas

- Eduardo Bacon: responsable y quien aprueba cada fase

## Enlaces

- Sin enlaces.

## Notas

- Caso sucesor de kanai-optimizar-ejecucion: allí se dejó sin medir el ahorro de tokens y las rondas del N3 porque no hubo corrida con LLM.
- Decisión 1: integrar los commits de la copia de Codex en kanai-app/setup como rama local, sin push, y reiniciar el MCP.
- Decisión 2: la corrida real del N3 de TAO-192 se hace sobre una copia en KT con el mismo diff; el ticket real no se toca.
- kanai-app tiene cambios ajenos sin commitear (docs/README.md, docs/analisis-persistencia.md) que no entran en ningún commit del caso.
- Los comandos los ejecuta el dev; el push siempre requiere pedido explícito.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| arbiter-ronda-1.md | revision | Arbiter ronda 1 sobre feat/medir-ejecucion-real: veredicto iterar | Arbiter con juez opus y re-verify sonnet sobre 22 archivos y 668 lineas: 1 S1, 2 S2, 6 S3 y 4 consultas; veredicto iterar; la causa de las citas fuera del diff sigue sin explicar. |
| f3-no-aplica-y-pendientes.md | decision | F3 sin ajustes y pendientes detectados por las corridas | Decision del dev de cerrar F3 como No aplica: ninguna corrida confirmo un defecto de los cambios medidos y las citas fuera del diff quedan sin confirmar; 4 pendientes aparte con su causa y como investigarlos. |
| medidas-kt-017.md | registro | Medidas reales de KT-017 (dependencia en rama acumuladora) | KT-017 con el codigo nuevo: sandbox corrio en 2 de 3 gates de sesion (el otro omitido por diseno, sin cambios de codigo), N3 aprobado en 1 ronda con 57,7k tokens; subagentes sin tokens en los runs. |
| medidas-kt-018.md | registro | Medidas reales de KT-018 (consumidor con dependencia integrada) y tabla de F1 | KT-018 con diff de 5 a 3 archivos al excluir KT-017, N3 en 2 rondas (82k y 55k tokens), sandbox corrio en 3 de 4 gates; un hallazgo real y uno sin explicar. |
| medidas-kt-019.md | registro | Medidas reales de KT-019 (consume dos tickets integrados) y comparacion de F2 | KT-019 con el diff del N3 de 7 a 3 archivos al excluir KT-017 y KT-018, N3 en 1 ronda con 51,6k tokens, sin hallazgos heredados; comparacion con TAO-192 con la escala como limite. |
| punto-de-partida.md | referencia | Punto de partida y metas de la medición real | Línea base de TAO-192, TAO-191 y TAO-186, lo ya medido sin LLM y las metas que faltan por comprobar. |
| tabla-final-contra-metas.md | analisis | Tabla final contra las metas de la medicion real | Cada meta como cumplida, parcial, en riesgo o no medida con su evidencia; arbiter en 3 rondas (iterar, iterar, aprobable con reservas), correcciones de F5 y F7, hallazgos que quedan, pendientes y estado de la entrega. |

## Plan

9 de 9 fases cerradas. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-medir-ejecucion-real/plan.md
