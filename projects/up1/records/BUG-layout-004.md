---
id: BUG-layout-004
project: up1
type: bug
module: layout
---

# relationDisplayFields con formato incorrecto (array o string en vez de objeto)

## Symptom

El campo `relationDisplayFields` en layouts usa formato de array de strings o string plano en vez del objeto `{ ObjectName: 'field' }` esperado. Ocurrencias: `curriculum-mapping/config/layouts/cm-profile-entry-list.json:14-15` usa `["CmCompetency.name"]`; `assessment-matrix/config/layouts/ca-matrix-view.json:40` y `ca-matrix-list.json:17` usan string `"CaLevelScheme.name"`.

## Expected behavior

Formato objeto key→field: `{ "CmCompetency": "name" }` o `{ "CaLevelScheme": "name" }`, según RULE-layout-002.

## Root cause

Documentación inicial de mods permitía ambos formatos. RULE-layout-002 formalizó solo el objeto, pero los mods creados en TICKET-002 y TICKET-005 no fueron actualizados.

## Impact

En producción, el renderer muestra UUIDs crudos en las celdas FK en vez del nombre human-readable. Afecta UX en listados y vistas.

## Reproduction

Abrir `cm-profile-entry-list` — columna CmCompetency muestra UUIDs. Mismo resultado en `ca-matrix-view` para la relación CaLevelScheme.

## Workaround

Ninguno limpio — requiere fix directo del JSON.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-curriculum-mapping, SPEC-mods-assessment-matrix
- **Tickets**: TICKET-002
