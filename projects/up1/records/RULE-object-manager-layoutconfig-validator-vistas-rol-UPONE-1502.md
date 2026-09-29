---
id: RULE-object-manager-layoutconfig-validator-vistas-rol-UPONE-1502
project: up1
type: rule
module: object-manager
level: must
tags:
  - UPONE-1502
  - sp11
  - layouts
  - vistas
---

Las vistas de rol no aparecian en uP1 Manager y un layoutConfig mal formado se podia guardar sin validar. src/services/layoutConfigValidator.js (validateLayoutConfig / coerceLayoutConfig) valida la estructura y los campos de sistema antes de aceptar o mostrar un layoutConfig.

sourceRef: af6d9c5d src/services/layoutConfigValidator.js:194
