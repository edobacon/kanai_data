---
id: RULE-layout-032
project: up1
type: rule
module: layout
tags:
  - layout-json
  - associated-layouts
  - rename
  - cascade
---

# JSON layouts pueden tener refs internas cross-mode (`canCreateLayoutId`, `associatedLayoutConfigs.layoutId`) — enumerar todas cuando se renombra el ancestor

## What

Los JSON layouts del mod pueden contener referencias internas a OTROS layouts del mismo grupo (ej. el list referencia view + edit + create). Estas refs viven en campos especificos del `layoutConfig`:

- **`canCreateLayoutId`**: string con el `id` del layout `create` cuando el list permite crear
- **`associatedLayoutConfigs.<mode>.layoutId`**: string con el `id` del layout target del mode (`view`, `edit`, etc.) — usado para resolver embeds o navegacion drill-down

**Cuando se renombra el `id` de un layout** (ej. rename del object name, fix de naming, refactor), TODAS estas refs internas deben actualizarse en cascada — NO solo el `id`/`name` del archivo renombrado.

Ejemplo real (TICKET-025 — rename Path B `default_AcademicActivity_* → default_activity_*`):

```json
// default_activity_list.json (post-rename)
{
  "id": "default_activity_list",       // <- renombrado
  "name": "default_activity_list",     // <- renombrado
  "layoutConfig": {
    "canCreateLayoutId": "default_activity_create",  // <- TAMBIEN renombrado (era default_AcademicActivity_create)
    "associatedLayoutConfigs": {
      "view": { "layoutId": "default_activity_view" },  // <- TAMBIEN renombrado
      "edit": { "layoutId": "default_activity_edit" }   // <- TAMBIEN renombrado
    }
  }
}
```

## Why

Si solo se renombra el `id`/`name` del JSON file pero las refs internas quedan con el nombre legacy, el sistema falla silenciosamente:

- **`canCreateLayoutId` apunta al id legacy**: el modal de crear nuevo abre "Layout not found" o cae al fallback
- **`associatedLayoutConfigs.layoutId` apunta al id legacy**: la navegacion drill-down (clickear una row del list para abrir view) falla con warning silencioso en console

`LayoutOrchestrator.vue` resuelve primero por `id` (GraphQL `getInstance`) y fallback a `name` (filter EQUALS). Si el `id` legacy ya no existe en BD post-rename + el fallback `name` tampoco lo encuentra → "Layout not found".

## Where

- **Files**: `mods/<mod>/config/layouts/*.json` (cualquier list layout que tenga `canCreateLayoutId` o `associatedLayoutConfigs`)
- **Layers**: frontend (LayoutOrchestrator resolution chain), database (`up1_layen_layout`)

## When

Aplica cuando:

- Renombras el `id` de un layout (rename completo Path B — TICKET-025)
- Renombras el object name del mod (rename cross-monorepo)
- Movieras un layout entre mods (improbable pero posible)

NO aplica cuando solo renombras el `name` preservando `id` (rename cosmetico Path A — el id legacy persiste como FK).

## Verification

**Pre-rename**: grep exhaustivo cross-monorepo para detectar refs:

```bash
grep -rn "default_AcademicActivity_" mods/ suite/ layout/ --include="*.json"
# Reportar TODAS las matches — luego actualizar cada uno
```

**Post-rename**: verificar 0 matches del legacy + smoke en UPU navegando flow que usa el embed/drill-down:

```bash
grep -rn "default_AcademicActivity_" mods/<mod>/config/layouts/
# Expected: 0 matches
```

**Empirico**: post-deploy, smoke en UPU abrir el list + clickear "Crear nuevo" + clickear una row para drill-down a view. Ambos deben funcionar sin "Layout not found" warning en console.

## Source

- **Discovered in**: TICKET-025, Session 1 (S1.T1 grep cross-mod + S1.T2 rename completo)
- **Evidence**: Al renombrar los 4 layouts de activity Path B (id+name), el `default_activity_list.json` (renombrado del legacy `default_AcademicActivity_list.json`) tenia 3 refs internas que apuntaban al id legacy:
  - Linea 22: `canCreateLayoutId: "default_AcademicActivity_create"` → renombrado
  - Linea 28: `associatedLayoutConfigs.view.layoutId: "default_AcademicActivity_view"` → renombrado
  - Linea 29: `associatedLayoutConfigs.edit.layoutId: "default_AcademicActivity_edit"` → renombrado
  - Sin update en cascada, "Crear nuevo" y drill-down view/edit habrian fallado silenciosamente
  - Researcher Explore cross-monorepo confirmo 0 embeds cross-mod (Categoria B vacia), pero las refs internas dentro del list propio si existian
- **Aprendizaje L2 del ticket**. Commit `831ecf4` curriculum-design
- **Related**: RULE-layout-010 (layouts requieren id/name/tenants), RULE-layout-025 (associatedLayoutConfigs resuelve por nombre con fallback)
