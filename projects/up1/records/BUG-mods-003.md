---
id: BUG-mods-003
project: up1
type: bug
module: mods
---

# Layouts de curriculum-mapping no siguen naming convention default_ObjectName_mode

## Symptom

Ningún layout del mod curriculum-mapping sigue el patrón `default_{ObjectName}_{mode}`. Los principales usan nombres como `cm-matrix-list`, `cm-profile-list`, `cm-competency-list`, `cm-matrix-view`, etc. (ver `config/layouts/*.json`).

## Expected behavior

Layouts principales por objeto deben llamarse `default_CmCompetencyMatrix_list`, `default_CmCompetencyMatrix_view`, `default_CmGraduationProfile_list`, `default_CmCompetency_list`, etc. Los auxiliares (filtrados por enum, embebidos, etc.) pueden usar nombres libres con `applicationId: null`.

## Root cause

El mod se diseñó con nombres semánticos pre-RULE-layout-008 (formalizada después del POC study-notes).

## Impact

Rompe el mecanismo de fallback de resolución de layouts. Cuando otro layout referencia el objeto sin nombre explícito, el sistema busca `default_{Object}_{mode}` y no lo encuentra — falla silenciosamente. Afecta UX en navegación entre vistas.

## Reproduction

Desde `cm-matrix-list`, click en una fila para ir al detalle sin layout explícito — el sistema no resuelve el default view.

## Workaround

Especificar siempre el `layoutName` explícito en todo row action / embedded list del mod.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-curriculum-mapping
- **Tickets**: TICKET-002
