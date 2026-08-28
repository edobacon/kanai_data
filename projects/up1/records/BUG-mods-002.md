---
id: BUG-mods-002
project: up1
type: bug
module: mods
---

# applicationId hardcodeado en default_StudyNote_list viola RULE-mods-009

## Symptom

`config/layouts/default_StudyNote_list.json:8` declara `applicationId: "study-notes"` explícito. El layout nav-visible debe omitir ese campo para que el sync (Phase 6) lo asigne dinámicamente.

## Expected behavior

El campo `applicationId` debe estar ausente del JSON. El sync asigna el id del app basado en el nombre del mod durante la inserción en BD.

## Root cause

Copia del patrón antiguo de documentación (pre-RULE-mods-009). El POC no fue actualizado tras la formalización de la regla.

## Impact

Si el id del app cambia en BD (por re-sync u otra operación), el layout queda huérfano. No aparece en navegación silenciosamente.

## Reproduction

Revisar `config/layouts/default_StudyNote_list.json` — presencia del campo `applicationId`.

## Workaround

Remover manualmente el campo antes de `npm run sync`.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-study-notes
- **Tickets**: TICKET-001
