---
id: DECISION-academic-scheduling-bre-lee-businessrule-del-tenant-UPONE-1949
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1949
  - rules-engine
  - schedule
---

breRanker.js arma el contexto con loadRuleContext: tenantId del request y Scenario.ruleSetId (contexto RuleSet de RuleActivation) para activar o ponderar reglas por conjunto. Sin tenant el motor cae a su comportamiento sin reglas del tenant. Las reglas de producto para ScenarioSectionAssignment se siembran en seed/minimal/config-business-rules.js. En el superrepo mods, el rules-engine se registra en mods.json como mod activo de tipo artifact (6ea3493, 7cf591b) para que sus objetos lleguen al object manager.

Fuente: 77c83cd logic/schedule/breRanker.js:130-148; a7823f1 seed/minimal/config-business-rules.js; 6ea3493 mods.json.
