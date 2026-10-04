# Validación del plan y del modelo de lectura de la vista

Fecha: 2026-10-04.

## Registro

Se creó el plan estructurado del caso mediante el flujo sancionado. La validación previa y la creación devolvieron cero bloqueos, cero advertencias, cero inferencias y cero contenido sin interpretar. Las citas al KB están resueltas.

## Compatibilidad comprobada

Se revisaron los esquemas de fases/tareas/criterios y el modelo de lectura de la vista de Kanai. Se invocó directamente, sólo en lectura, `caseDetail` y `caseKb` de `server/inlinePlan/readModel.ts` con el almacén real del caso configurado para esa invocación. Resultado: 8 fases, 31 tareas, 25 criterios, todas las fases Pendiente, cuatro documentos de contexto previos a este registro, cero líneas corruptas del plan.

El primer intento con el ejecutor tsx tuvo una restricción de IPC del sandbox; se resolvió usando Node con import tsx, sin escalación ni cambios de permisos. La ruta de datos se seleccionó explícitamente para leer el mismo caso que el MCP. No se modificó código de Kanai ni se editó a mano el almacén.

Esta comprobación valida la estructura y carga del modelo que alimenta la vista; no es una inspección visual del navegador. Las vistas case.md/plan.md son generadas por Kanai, no archivos manuales sustitutos del plan.

## Estado y siguiente paso

Tener el plan hace que el caso figure en etapa de ejecución, pero ninguna fase fue iniciada ni marcada cumplida. El siguiente paso es resolver las políticas y arquitectura pendientes de F0. No se modificaron skill/scripts de up1 ni se corrieron comandos futuros del plan.

La versión final es 1.1. La documentación v1 se conserva como baseline 348ea29 y las nuevas referencias/guía/comparación tienen tareas y criterios propios en F6.
