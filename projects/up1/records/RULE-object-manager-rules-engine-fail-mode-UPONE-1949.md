---
id: RULE-object-manager-rules-engine-fail-mode-UPONE-1949
project: up1
type: rule
module: object-manager/rules-engine
level: must
tags:
  - UPONE-1949
  - rules-engine
  - fail-mode
---

Si el motor no responde (timeout), devuelve HTTP no 2xx (un 404 con reglas habilitadas en el tenant cuenta como no disponible) o una regla falla al evaluarse (validity_type error), el gate no bloquea por fallo duro: con RULE_ENGINE_WRITE_GATE_FAIL_MODE=open (default) el write procede con warning; con closed se rechaza con validation.system.ruleEngineUnavailable. Solo las reglas hard que fallan de verdad devuelven VALIDATION_FAILED; las soft solo se loguean.

Fuente: 45aef9d5 src/services/validation/ruleEngineGate.js:45,81,151.
