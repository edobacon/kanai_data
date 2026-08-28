---
id: BUG-core-004
project: up1
type: bug
module: core
tags:
  - versionado
  - recordtype
  - curriculum
  - object-manager
  - sp5
  - sp6
---

# Versionar Curriculum no arrastra la extension RecordType (rt__Plan__curriculum)

## Symptom

Al versionar un Curriculum(Plan), el payload de prisma.curriculum.create omite rt__Plan__curriculum; la v2 nacería sin progression/totalCredits/totalPeriods/periodType.

## Expected behavior

La v2 conserva los campos de la extensión RecordType del plan (progression, totalCredits, totalPeriods, periodType).

## Root cause

El versionado corre con objectType=Curriculum (base) → el RecordType early-return de instance.resolver.js (único path que crea base+RT+ext) NO dispara (solo si objectType es rt__*). Versionar por el alias rt__Plan__curriculum lo bloquea el guard AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE (version-from-source.js). cloneChildProjections copia la proyección RT de los HIJOS, no del PADRE versionado.

## Impact

La v2 nace sin sus campos temporales → malla rota. Bloqueante de la Épica E (versionado/clonado con hijos). Aun arreglando BUG-core-003 (el crash del ext), la v2 quedaría incompleta.

## Reproduction

Probado en vivo 2026-06-23 (mismo run que BUG-core-003): el create payload observado de prisma.curriculum.create no incluye rt__Plan__curriculum ni los campos temporales.

## Workaround

Ninguno necesario a nivel funcional: mitigado en el mod (ver Solution).

## Solution

**Mitigado a nivel MOD** (UPONE-1270 / TICKET-075, mergeado — confirmado en TICKET-111/UPONE-1450 S1.T1). El hook `inheritRecordTypeExtensionOnVersion` (`mods/curriculum-design/logic/sectionValidation.resolver.js:186-210`, wired en `sectionValidationMutation.createInstance`) copia la fila `rt__<RT>__curriculum` del source a la v2 post-create. El path REAL del usuario (row action `create-new-version` → `createInstance` genérico → override del mod) dispara el hook, así que la v2 conserva progression/totalCredits/totalPeriods/periodType. REQ-02 de UPONE-1450 satisfecho.

Estado `fixed` se refiere al **síntoma original** (la v2 nacía sin sus campos de RecordType): resuelto por el hook mod, verificado en 1450.

**Residual (nuevo, menor — NO el síntoma original)**: el hook corre FUERA del `$transaction` del versionado base (post-delegate), por lo que la herencia del RT del padre NO es atómica con la creación de la v2 (un fallo del hook no revierte la v2). El fix atómico en core (aplicar `cloneChildProjections` al PADRE versionado dentro del `$transaction`, o path RT atómico) queda como mejora futura de core, NO requerida por el AC de 1450 — trackeado como follow-up, no reabre este bug.

## Related

- **Specs**: specs/up1/sp5/auditoria-viabilidad_2026-06-23.md §5.ter (H-3); projects/up1/specs/SPEC-curriculum-design-plan-version-deep-clone.md
- **Tickets**: UPONE-1270 (mitigación mod), TICKET-111 / UPONE-1450 (confirmación + versionado profundo)
- **Rules**: RULE-core-032 (directChildrenDerived), RULE-core-027 (deepClone config-driven)
