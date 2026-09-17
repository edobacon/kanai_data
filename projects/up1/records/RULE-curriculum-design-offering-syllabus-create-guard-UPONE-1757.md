---
id: RULE-curriculum-design-offering-syllabus-create-guard-UPONE-1757
project: up1
type: rule
module: curriculum-design
---

El silabo ES un Offering con `recordType='Syllabus'`; un create via el path generico saltaba las reglas de dominio (Activity anclada debe ser recordType=Course; unicidad de code scoped por activityLineId+termId) que solo vivian en `createSyllabusOffering`. Fix: helper puro compartido `offeringGuard.js` (assertActivityIsCourse, assertOfferingCodeUnique) consumido por ambos caminos; el dispatch generico se scopea a `recordType==='Syllabus'` para no afectar los ServiceOffer de engagement (mismo objectType Offering, otro camino).

**sourceRef:** a70c3ab + logic/sectionValidation.resolver.js:249-269 (validateSectionCreate) y logic/helpers/offeringGuard.js.
