---
id: BR-VER-002
project: up1
type: spec
module: curriculum-design
category: versionamiento
status: in-spec
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: [CAP-CUR-022]
external_refs: []
tags: [business-rule, versionamiento, clonacion, curriculum-design]
---

# BR-VER-002: Clonacion

## Texto verbatim

- La clonacion genera nuevos identificadores para todas las entidades copiadas
- El clon nace siempre en estado Borrador
- Se registra el origen de la clonacion cuando aplica, para trazabilidad
- La clonacion masiva es una operacion asincrona con tracking de progreso y reporte de resultados

## Aplicacion en Programa de asignatura

- Clonar un programa = clonar `Activity` + todas sus `CurricularSection` (recursivo) + sus `CurricularLink` internos. `BibliographyReference` NO se clona (es compartida).
- El clon nace `workflowState=Draft`.
- "Origen de clonacion" = campo separado de `previousVersionId`. La clonacion NO es versionamiento.
- Clonacion masiva: job BullMQ, notificacion al user al finalizar (ver BR-NOT-001).

## SP2

Fuera de scope (CAP-CUR-022 es Should priority, no en SP2).

## Referencias

- [BR-VER-001](BR-VER-001.md) (versionamiento — distinto a clonacion)
- CAP-CUR-022
