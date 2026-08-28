---
id: RULE-curriculum-design-023
project: up1
type: rule
module: curriculum-design
tags:
  - layouts
  - recordtype
  - required
  - create
  - edit
  - embedding
  - mod
---

# Un campo base requerido sin `static_default` debe estar en los layouts create/edit del RecordType

## What

Al declarar los layouts de un RecordType (`config/layouts/default_rt__<RT>__<obj>_{create,edit}.json`), todo campo del **objeto base** que sea requerido (`not_null:true` + en `required[]`) y NO tenga `static_default` debe incluirse como elemento editable (ej. `select`/`text` con `rules: "required"`) en los layouts `create` y `edit`. Si no, el usuario no tiene cómo setearlo y **todo create del RT falla** en la capa de persistencia.

Excepción: los campos que el **contexto de embedding inyecta** automáticamente — típicamente `ownerType`/`ownerId` (FK polimórfica del owner) y `recordType` (lo fija el tab/sección padre). Esos NO van en el layout (precedente `LearningOutcome`/`CurricularSection`). La distinción: ¿el valor es elección de dominio por registro (→ va al layout) o lo determina el contenedor (→ inyectado, se omite)?

## Why

Caso real (TICKET-083): el objeto base `requirement` declara `effect` (`not_null` + `required`, sin `static_default`). Los 9 layouts RT iniciales no lo incluían (se copió el patrón de `LearningOutcome`, que no tiene un equivalente requerido). El reviewer aislado de S3 detectó que cualquier create de un `rt__*__requirement` habría fallado: no había widget para setear `effect` ni default que lo cubriera, a diferencia de `ownerType`/`ownerId`/`recordType` que el embedding sí inyecta. Fix: `effect` agregado como `select` `rules:"required"` en create/edit + `text` en view.

## Where

- Layouts de RT: `mods/curriculum-design/config/layouts/default_rt__<RT>__<obj>_{create,edit,view}.json`.
- El schema base que lista los requeridos: `objects/<obj>.json` (`required[]` + `static_default` por campo).
- Evidencia: `default_rt__{Group,RecordState,MetricThreshold}__requirement_{create,edit}.json` incluyen `effect`.

## When

Al crear o copiar layouts para un RecordType nuevo. Checklist: cruzar el `required[]` del objeto base contra los elementos del layout create/edit — cada requerido sin `static_default` y no-inyectado-por-contexto debe estar presente con `rules:"required"`.

## Verification

Para cada campo en `objects/<obj>.json` `required[]` sin `static_default`: confirmar que aparece en `default_rt__<RT>__<obj>_create.json` y `_edit.json` con `rules:"required"`, salvo que sea inyectado por el embedding (`ownerType`/`ownerId`/`recordType`). Empíricamente: un create del RT vía UI/MCP completando solo los campos del layout debe persistir sin error de campo requerido faltante.

## Source

TICKET-083 (MC-03 / UPONE-1346), learn L8 — `effect` faltante detectado por el reviewer aislado en S3.GATE; fix en `f277b84`.
