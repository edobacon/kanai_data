---
id: RULE-layout-017
project: up1
type: rule
module: layout
tags:
  - recordlist
  - rowActions
  - navigation
  - silently-broken
---

# `rowActions[]` con `type: "navigate"` no funciona — usar `associatedLayoutConfigs`

## What

Si un `rowAction` solo necesita abrir el layout view/edit del registro, **NO declararlo como `rowActions[]` con `type: "navigate"`**. La plataforma renderiza el item en el menu pero el handler queda como no-op (silently broken). Tipos validos en mods reales: `"modal"`.

Forma correcta (la plataforma autogenera "Ver" + "Editar"):

```json
"layoutConfig": {
  "canEdit": true,
  "associatedLayoutConfigs": {
    "view": { "layoutId": "default_AcademicActivity_view" },
    "edit": { "layoutId": "default_AcademicActivity_edit" }
  }
}
```

NO:

```json
"rowActions": [
  {
    "id": "view-detail",
    "label": "Ver detalle",
    "type": "navigate",
    "targetLayoutId": "default_AcademicActivity_view"
  }
]
```

## Why

- El `type: "navigate"` no es manejado por el runtime de RecordList — el item aparece en el menu pero al hacer click no pasa nada (silently broken, sin error en consola).
- La plataforma ya autogenera "Ver" desde `associatedLayoutConfigs.view` y "Editar" desde `canEdit: true` + `associatedLayoutConfigs.edit`.
- Declarar ambos produce items duplicados ("Ver detalle" + "Ver"), uno funcional y otro no — confunde al usuario.
- Mantener solo `associatedLayoutConfigs` reduce JSON, evita el bug, y es el patron usado por mods en produccion.

## Where

- **Files**: `mods/*/config/layouts/*_list.json`
- **Layers**: config (layout JSON)

## When

- Cuando el `rowAction` solo navega al layout view o edit del mismo objeto: usar `associatedLayoutConfigs` y omitir `rowActions[]`.
- Si necesitas una accion custom (modal con titulo dinamico, link externo, modificacion de estado, mutacion GraphQL): declarar `rowActions[]` con `type: "modal"` (ver `engagement-mis-eventos-list.json` como referencia).

## Verification

- Grep en layouts del mod por `"type": "navigate"` — no debe aparecer.
- Validacion empirica en UI: el menu de acciones por fila no tiene items duplicados ni rotos.

## Source

- **Discovered in**: TICKET-007, Session 2
- **Evidence**: `default_AcademicActivity_list.json` declaraba `rowActions[].view-detail` con `type: "navigate"`. La UI renderizaba 3 items: "Ver detalle" (no funcional), "Ver" (autogenerada, funciona), "Editar" (autogenerada). Eliminar el bloque `rowActions[]` dejo el menu en "Ver" + "Editar" sin perdida de funcionalidad. Verificado contra `engagement-mis-eventos-list.json:79-97` que usa `type: "modal"` para acciones custom.
- **Related**: RULE-layout-010 (default layouts naming)
