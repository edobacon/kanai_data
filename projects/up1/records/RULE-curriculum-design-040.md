---
id: RULE-curriculum-design-040
project: up1
type: rule
module: curriculum-design
tags:
  - delete
  - preview
  - fail-safe
  - motor
  - deleteinstance
  - deletebulkinstances
  - validacion
  - singular-vs-bulk
---

# El preview de delete debe correr el motor completo para TODOS los objetos (fail-safe), no gatearse por "declara hijos"

## What

`deleteImpactPreview` MUST ejecutar el motor de borrado **completo** para todos los objetos, no solo para los que declaran hijos. Es la única barrera aplicativa consistente contra borrar algo referenciado en el path singular.

## Why

En TICKET-104 se detectó que `deleteInstance` (singular) NO revalida referencias por su cuenta cuando el motor no aplica (`applied:false`), a diferencia de `deleteBulkInstances` que llama `validateBulkDelete`. Para los consumidores del path singular (MCP `delete_object` / `cd_delete_section` vía `api.delete`), la única barrera es el preview. Si el preview se gatea por "declara hijos", un objeto referenciado sin hijos declarados se puede borrar sin aviso. La inconsistencia `deleteInstance` vs `deleteBulkInstances` es preexistente (fuera de scope P5), lo que refuerza que el preview sea fail-safe por diseño.

## Where

`deleteImpactPreview` (motor), consumidores del path singular (`deleteInstance`, MCP `delete_object`/`cd_delete_section`).

## When

Al implementar/revisar el preview de borrado o cualquier consumidor del delete singular.
