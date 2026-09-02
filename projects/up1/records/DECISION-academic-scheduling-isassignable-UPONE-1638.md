---
id: DECISION-academic-scheduling-isassignable-UPONE-1638
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1638
  - sp9
  - academic-scheduling
  - ScenarioSection
---

(UPONE-1638) El flag ScenarioSection.isAssignable permite excluir secciones de runScenario; se agrega la columna con default + tests de RBAC y la decision de edit-modal.

sourceRef (verificado por diff): academic-scheduling 49ebb78 modsComponents/.../ScenarioDetailPanelElement.vue + lang/{en,es,pt}/common.i18n.json (exclude sections from runScenario via ScenarioSection.isAssignable), 8a991f8 (identify assignable sections), e0f90a4 (default + RBAC tests).
