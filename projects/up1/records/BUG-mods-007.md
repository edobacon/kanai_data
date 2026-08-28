---
id: BUG-mods-007
project: up1
type: bug
module: mods
---

# CSS tokens sin fallback a --up1-* en múltiples mods (incluye inline dark-theme en CompetencyTree)

## Symptom

Múltiples mods declaran CSS custom tokens sin fallback a `var(--up1-*)`: `study-notes/css/1-theme/study-notes.css:9-16` (`--study-notes-badge-*`), `curriculum-mapping/css/1-theme/curriculum-mapping.css:9-15` (`--cm-level-*`), y parcial en assessment-matrix. Adicionalmente, `assessment-matrix/modsComponents/CompetencyTree/CompetencyTreeElement.vue:246-287` tiene `<style>` inline con colores dark-mode hardcoded (`#1a1a2e`, `#16213e`, `#0f0f23`) que entran en conflicto con `css/competency-tree.css` (que usa tokens correctamente).

## Expected behavior

Todos los tokens de mod con patrón `var(--mod-token, var(--up1-token, fallback-literal))`. CompetencyTreeElement sin `<style>` inline — el CSS del archivo externo debe ser suficiente.

## Root cause

Copy-paste de patrones sin revisar RULE-layout-006. En CompetencyTree, el inline dark-theme parece haber sido un prototipo temprano que no se limpió.

## Impact

Theming multi-tenant roto. El mod ignora el theme del tenant y muestra colores fijos (dark-mode en CompetencyTree, colores arbitrarios en badges/levels).

## Reproduction

Cambiar theme del tenant — los tokens de mod no responden. En CompetencyTree, el fondo dark aparece siempre.

## Workaround

Overriding manual de tokens a nivel tenant CSS (frágil).

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-assessment-matrix, SPEC-mods-curriculum-mapping, SPEC-mods-study-notes
- **Tickets**: TICKET-005
