---
id: BUG-platform-011
project: up1
type: bug
module: platform
tags:
  - platform
  - vueform
  - modal
  - C3
---

# modalStackManager no expuesto a custom Vueform elements

## Symptom

Los custom Vueform elements (definidos via @vueform/vueform `defineElement`) no tienen acceso al `modalStackManager` del platform LayoutOrchestrator. Esto fuerza a los mods a implementar modales caseros para flows de edit/create que se invocan desde un custom element.

## Expected behavior

Cualquier custom Vueform element del mod debe poder invocar el LayoutOrchestrator stack standard (`modalStackManager.open({layoutId, mode, instanceId})`) para abrir modales de edit/create de un objeto especifico, heredando: validaciones declarativas, i18n, RBAC field-level, dirty tracking, atoms del design system, layouts persistentes.

## Root cause

El LayoutOrchestrator inyecta `modalStackManager` solo en su scope Vue interno. El defineElement de Vueform usa un setup distinto al defineComponent standard y no recibe el provide/inject del Orchestrator.

## Impact

Los mods que necesitan flows write desde custom elements deben implementar form modal casero (CompositeSectionTreeElement.vue del mod curriculum-design es ejemplo). Esto duplica logica del platform, no honora i18n/validations/RBAC/dirty tracking/atoms, y es deuda tecnica permanente. Item C3 del refactor TICKET-010 documentado al cierre.

## Reproduction

1. Crear un custom Vueform element via `defineElement({ ... })` en `mods/<mod>/modsComponents/<X>/`.
2. Intentar inyectar `modalStackManager` desde el setup() del element via inject('modalStackManager').
3. Resultado esperado: modalStackManager funcional. Resultado actual: undefined.
4. Sin acceso al stack manager el mod tiene que implementar modal/form casero.

## Workaround

Implementar form modal casero dentro del SFC del custom element + llamar mutations Apollo directo (createInstance/updateInstance). Limitaciones: no honora validations declarativas del platform, i18n/lang, RBAC field-level, dirty tracking, atoms del design system. Documentado en CompositeSectionTreeElement.vue lineas 29-31.

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-010 item C3
