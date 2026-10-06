# Caso inline: Optimizar la ejecución de tickets en Kanai (caso base TAO-192)

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Reducir rebotes, tokens y tiempo de calendario al ejecutar tickets cuyo alcance ya está fijado, cambiando solo el cómo (base del diff del gate integral, verificación real en sandbox, rondas del gate N3, contexto del gate, seguimiento de tiempos), con los cambios implementados en kanai-app y validados con un ticket de prueba en KT y con la repetición del gate N3 de TAO-192, sin modificar el alcance de ningún ticket existente.
**Tags:** repos: kanai-app · tickets: TAO-192, TAO-191 · labels: kanai, ejecucion, gates, optimizacion
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- la rama de trabajo feat/optimizar-ejecucion todavía no existe en kanai-app (se crea al empezar el trabajo)

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| kanai-app | configurada | setup (existe) | feat/optimizar-ejecucion (por crear) | Código de Kanai: gates, sandbox, ejecución por sesiones. Aquí se implementan los cambios. |

## Ambientes

- KT: Proyecto de pruebas de Kanai: aquí vive el ticket de prueba del caso.
- taomangalam: Proyecto con el caso real TAO-192 (solo lectura; su alcance no se modifica).

## Personas

- Eduardo Bacon: responsable y quien aprueba cada fase

## Enlaces

- Sin enlaces.

## Notas

- Los tickets existentes no se modifican: solo cambia el cómo se ejecutan.
- Los comandos del plan los ejecuta el dev; el push siempre requiere pedido explícito.
- Cambios de Kanai: reiniciar el MCP para que apliquen.
- Hay cambios sin commitear ajenos en kanai-app (docs/README.md, docs/analisis-persistencia.md) que no son de este caso.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| linea-base-tao-192.md | analisis | Línea base de ejecución: TAO-192 vs TAO-191 | Métricas de TAO-192 (76 runs, 27,4M tokens, 5 rebotes del gate N3) y causas probables a confirmar. |

## Plan

0 de 5 fases cerradas, fase actual F0. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-optimizar-ejecucion/plan.md
