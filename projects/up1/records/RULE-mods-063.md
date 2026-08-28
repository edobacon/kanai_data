---
id: RULE-mods-063
project: up1
type: rule
module: mods
tags:
  - rbac
  - auth
  - reconciliation
  - vocabulario
  - up1-manager
---

# up1-manager: mutations de rol/capability requieren guarda de auth explícita, reconciliaciones diffean (nunca delete+recreate), vocabularios de backend no se hardcodean en layouts

## What

En `up1-manager`, tres constraints relacionados:
1. Toda mutation que toque `core_Capability` o asignaciones de rol MUST envolverse con `withAuth`/`requireCapability`, nunca exponerse sin guarda.
2. Las reconciliaciones de asignaciones (N:M) MUST diffear contra las filas existentes (borrar solo lo que ya no aplica, crear solo lo nuevo), nunca hacer delete+recreate completo, cuando existan columnas de mapeo adicionales que se perderían (ej. `modRoleId`).
3. Los vocabularios que viven en el backend (`VALID_FIELD_TYPES`, enums) NO se hardcodean como lista estática en un layout JSON; se resuelven en runtime via `autoPopulate` + un composable dedicado.

## Why

(1) `getObjectRoleCapabilities` y `manageObjectRoles` no tenían ninguna guarda de autorización hasta que se envolvieron con `requireCapability('mod/up1-manager/objectdefinition:view', ...)` y `withAuth(['mod/up1-manager/objectdefinition:create', 'mod/up1-manager/objectdefinition:edit'], ...)` - ver [[BUG-mods-017]] (SEC-01).

(2) `manageAppRoles` hacía `deleteMany` + `create` completo de `up1_suite_app_role` en cada reconciliación, perdiendo el `modRoleId` (mapeo a rol interno) de las filas que se mantenían sin cambios. Se corrigió a diff contra el estado previo (comentario explícito en el código: "so assignments that stay keep their internal-role mapping"). Ver [[BUG-mods-018]].

(3) `fielddefinition-create.json`/`fielddefinition-edit.json` dejaron de declarar `items` estático para `fieldType` y pasaron a resolver el vocabulario via `autoPopulate` + composable `useFieldTypeVocabulary`. El desacople no fue perfecto de inmediato: el layout siguió comparando por string literal contra el valor viejo, lo que produjo [[BUG-mods-019]] (mismatch de casing).

## Where

- Auth guard: `mods/up1-manager/logic/objectRoles.resolver.js:71,129`
- Diff de reconciliación: `mods/up1-manager/logic/appRoles.resolver.js:44-45,76-90` (comentarios explícitos "Diffs against existing rows instead of delete-and-recreate")
- Vocabulario runtime: `mods/up1-manager/config/layouts/fielddefinition-create.json:49-53`, `fielddefinition-edit.json:45-49` (`autoPopulate.composable: "useFieldTypeVocabulary"`)

## When

Al escribir cualquier mutation nueva de RBAC (roles/capabilities) en up1-manager, al implementar cualquier reconciliación N:M con columnas de mapeo propias, y al construir cualquier layout que exponga un select cuyo dominio de valores vive en el backend.
