---
id: DOC-kb-vigencia-documentos-p15-13-impacto
project: up1
type: doc
module: curriculum-design
tags:
  - vigencia
  - workflow
  - estados
  - versionamiento
  - sp12
---

# Vigencia 15: 13 Impacto en el código actual

> Grupo: Parte técnica · Parte 15 de 17 · Líneas 1334 a 1355 del original · [Índice](00-indice.md)

**Ver en HTML (mismo estilo del original):** [p15-13-impacto.html](p15-13-impacto.html)

## Qué dice esta parte

Lista qué se reemplaza (tres guards por un bloqueo único, `isCurrent` pasa a calculado, `versionableFromStates` pasa a 'solo la última versión') y qué se reutiliza (`documentDependents.js`, `isInForceOn`, subido al core). Propone migración del enum en dos fases: primero equivalencias (Active=Vigente, Deprecated=En extinción, Archived=Cerrado) y después sacar los valores del enum.

## Dónde se habló en la reunión (6 oct 2026)

No se trató por separado en la reunión. Transcripción: `TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment` (records).

## Verificado contra el código (8 oct 2026)

- Confirmado: `documentDependents.js` e `isInForceOn` existen en `curriculum-design` y `curriculum-mapping`.
- Posibles solapamientos en Jira: UPONE-1340 (versión actual) y UPONE-1771 (tributación, indicadores y versionado del plan), ambos Backlog.

## Decisiones y preguntas ligadas

Orden de la migración en dos fases: sin ticket.

## Fragmento del documento (texto del artefacto)

```text
13 · Impacto en el código actual
Qué se reemplaza y qué se reutiliza
Pieza actual | Cambio
Enum status (Curriculum, Activity, Matrix) | Fase 1: Active=Vigente, Deprecated=En extinción, Archived=Cerrado, sin romper nada. Fase 2: salen del enum
planEntryPlanStatusGuard.js, requirementActivityGuard.js, alignmentRules.js | Se reemplazan por el bloqueo único del core; desaparecen las tres listas
Activity.isCurrent | Pasa a "abierta a ingreso", calculado. Corrige las dos versiones en true
versionableFromStates | Pasa a "solo la última versión del linaje, con vigencia"
documentDependents.js | Se reutiliza para calcular En extinción y Cerrado
validateMatrixAdoption.js (isInForceOn) | Sube al core como definición única de "vigente en una fecha"
updateBulkInstances | Debe pasar por el bloqueo del core
cm_set_matrix_status e instrucciones del MCP | Se ajustan al estado de vigencia
Layouts y row actions con status in [Approved, Active] | Se migran a validityStatus
```
