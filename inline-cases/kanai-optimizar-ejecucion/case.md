# Caso inline: Optimizar la ejecución de tickets en Kanai (caso base TAO-192)

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Reducir rebotes, tokens y tiempo de calendario al ejecutar tickets cuyo alcance ya está fijado, cambiando solo el cómo (base del diff del gate integral, verificación real en sandbox, rondas del gate N3, contexto del gate, seguimiento de tiempos), con los cambios implementados en kanai-app y validados con un ticket de prueba en KT y con la repetición del gate N3 de TAO-192, sin modificar el alcance de ningún ticket existente.
**Tags:** repos: kanai-app · tickets: TAO-192, TAO-191 · labels: kanai, ejecucion, gates, optimizacion
**Etapa:** cerrado

## Falta

- Nada que bloquee.

## Avisos

- Sin avisos.

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| kanai-app | configurada | setup (existe) | feat/optimizar-ejecucion | Código de Kanai: gates, sandbox, ejecución por sesiones. Aquí se implementan los cambios. |

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
- 2026-10-06: Eduardo autoriza ejecutar todo, un commit por fase y un único juez Arbiter al final. Los comandos los ejecuta el agente y se reportan como tales. Copia aislada desde setup para preservar cambios ajenos.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| arbiter-final.md | revision | Arbiter final | Aprobado por único juez;20/20archivos y595líneas cubiertos; sin hallazgos, eficienciaLLM no demostrada. |
| causas-confirmadas.md | analisis | Causas confirmadas | Frontera de ticket, selección full, cobertura vigente y consumo acumulado; pausa y fuga descartadas sin evidencia. |
| comparacion-final.md | analisis | Comparación final contra la línea base | Final:408489char de código primer pase,2946tests verdes y coberturaTAO2pases; ahorroLLM no medido. |
| completitud-contenido.md | registro | Completitud del contenido antes del dictamen final | UNREAD_FILE pasa a parcial y N3 exige contenido completo; KT regresión y TAO2pases comprobados. |
| correcciones-juicio-final.md | registro | Correcciones durante el único juicio final | Límites de tamaño, Dart y deuda de consumidores corregidos; TAO cobertura en2pases deterministas, tokens LLM no medidos. |
| ensayo-aislado.md | registro | Ensayo aislado KT y TAO-192 | KT sandbox real verde; TAO diff188→154, contexto22587→49669; cobertura completa tras10 pases simulados, eficiencia pendiente. |
| linea-base-tao-192.md | analisis | Línea base de ejecución: TAO-192 vs TAO-191 | Métricas de TAO-192 (76 runs, 27,4M tokens, 5 rebotes del gate N3) y causas probables a confirmar. |
| linea-base-validada.md | analisis | Línea base validada | Totales validados; cuatro N2 sí corrieron, siete N3 no; límite de 50 y consumo acumulado aclarados. |

## Plan

7 de 7 fases cerradas. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-optimizar-ejecucion/plan.md
