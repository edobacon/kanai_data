# Caso inline: Medir con corridas reales las mejoras de ejecución de Kanai

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Integrar en kanai-app (rama local desde setup, sin push) los cambios del caso kanai-optimizar-ejecucion y medir con corridas reales de LLM, en KT, si bajan los rebotes del gate N3, los tokens por gate y el tiempo, contra la línea base de TAO-192, TAO-191 y TAO-186, con las metas: sandbox que corre, cero hallazgos por diff heredado, N3 en 2 rondas o menos y menos de 1M de tokens por gate; sin modificar el alcance de ningún ticket existente ni la ejecución del ticket real TAO-192.
**Tags:** repos: kanai-app, kanai-app-codex · tickets: TAO-192, TAO-191, TAO-186 · labels: kanai, ejecucion, gates, medicion
**Etapa:** ejecucion

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
| medidas-kt-017.md | registro | Medidas reales de KT-017 (dependencia en rama acumuladora) | KT-017 con el codigo nuevo: sandbox corrio en 2 de 3 gates de sesion (el otro sin cambios de codigo), N3 aprobado en 1 ronda con 57,7k tokens; subagentes sin tokens en los runs. |
| punto-de-partida.md | referencia | Punto de partida y metas de la medición real | Línea base de TAO-192, TAO-191 y TAO-186, lo ya medido sin LLM y las metas que faltan por comprobar. |

## Plan

1 de 5 fases cerradas, fase actual F1. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-medir-ejecucion-real/plan.md
