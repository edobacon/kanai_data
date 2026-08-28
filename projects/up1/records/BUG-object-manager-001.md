---
id: BUG-object-manager-001
project: up1
type: bug
module: object-manager
tags:
  - updateInstance
  - recordtype-alias
  - fk-cast
  - coerce
  - create-update-asymmetry
  - curriculum
  - org-spine
---

# updateInstance vía alias RecordType no castea FK base ni coerciona campos tipados como createInstance (asimetría create/update)

## Symptom

Editar un Curriculum tipo Plan desde el form generico de la suite falla con 'Invalid value for argument `InstitutionId`'; al cubrir ese campo, el error salta al siguiente campo tipado (totalCredits, etc.). El friendly-error muestra PascalCase porque useFriendlyErrors.ts:503 capitaliza el nombre para display — el campo real es lowercase (institutionId, totalCredits). Surfaceado por la reduccion del org-spine en TICKET-076.

## Expected behavior

Editar deberia persistir igual que CREAR: createInstance castea la FK escalar base a operacion de relacion `{connect}` y coerciona los campos tipados del RecordType (coerceRtFields). El path de edicion deberia hacer lo mismo.

## Root cause

Asimetria create-vs-update en object-manager. `createInstance` castea las FK escalares de la base a `{relation:{connect}}` y coerciona los campos tipados del RecordType. El path de UPDATE via ALIAS RecordType de `updateInstance` (rama rt__<RT>__<base>, instance.resolver.js ~3600) NO aplica el mismo casteo/coercion a la FK base: el fix de TICKET-074 (commit 98590c0) que convierte FK escalar->connect quedo en la rama NO-RT de updateInstance (~3798), no en la rama RT-alias que usa Curriculum. Ademas el form manda `data: JSON!` sin coercion GraphQL -> los Int llegan como string.

## Impact

Curriculum (recordType Plan/Minor) y, en general, cualquier objeto con FK base requerida + extension RecordType editado via alias. Tres flujos a cubrir: guardar edicion, clonar, versionar. Bloquea la edicion de planes de estudio en la UI.

## Reproduction

Editar un Curriculum recordType=Plan en la suite -> guardar -> 'Invalid value' por campo. NO reproducible headless (el import del resolver de plataforma cuelga) ni con los stubs de la suite (pasa 748/748); solo se ve en UI/DB real (como los casos DB-gated).

## Workaround

Mod-side en curriculum-design: el adapter updateCurriculumWithRecordType stripea institutionId del payload de UPDATE (commit 36383df) — tapa el caso institutionId (es FK set-once derivable del owner) pero NO los demas campos tipados. Fix completo mod-only (los 3 flujos) + revert coordinado de 98590c0: TICKET-077.

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-077
