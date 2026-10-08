---
id: RULE-object-manager-rules-engine-write-gate-flag-UPONE-1949
project: up1
type: rule
module: object-manager/rules-engine
level: must
tags:
  - UPONE-1949
  - rules-engine
  - write-gate
---

Las reglas BusinessRule se evalúan en cada escritura genérica (validateInstanceWithObjectValidations) solo si RULE_ENGINE_WRITE_GATE_ENABLED=true. RULE_ENGINE_URL por sí sola sigue habilitando únicamente los rankings de asignación académica. El gate usa su propio timeout RULE_ENGINE_WRITE_GATE_TIMEOUT_MS (fallback a RULE_ENGINE_TIMEOUT_MS y luego 5000 ms). Un objeto sin BusinessRule habilitadas no paga ninguna llamada HTTP (un count decide).

Fuente: 45aef9d5 src/services/validation/ruleEngineGate.js:41,136; c20e3ac3 src/services/validateInstance.js:98-101.
