---
id: RULE-curriculum-design-activity-create-draft-UPONE-1757
project: up1
type: rule
module: curriculum-design
---

El path generico de createInstance no corria `assertActivityEvaluationsOnPublish` (gate que solo existe en updateInstance), por lo que un create con `status:'Active'` se colaba sin validar el arbol de evaluacion. Fix: `validateSectionCreate` dispatch para `objectType==='Activity'` fuerza `data.status='Draft'` (y `data.extended.status` si existe) in-place antes de persistir; publicar queda unicamente como transicion via updateInstance. Complementa la RULE-curriculum-design-004 (cambios de estado de Activity por el motor de enum de core + gate de publish en el override del mod).

**sourceRef:** a70c3ab + logic/sectionValidation.resolver.js:233-241 (validateSectionCreate, ACTIVITY_INITIAL_STATE).
