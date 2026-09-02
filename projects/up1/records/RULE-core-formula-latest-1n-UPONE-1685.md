---
id: RULE-core-formula-latest-1n-UPONE-1685
project: up1
type: rule
module: object-manager
tags:
  - UPONE-1685
  - sp9
  - formula
  - core
---

Los campos formula soportan relaciones 1:N con LATEST(). Gating del lookup de formula en getInstance + hoist de invariantes fuera del loop por fila; export gating y batch acotado. FormulaMaker (up1-manager) lo soporta en la UI.

sourceRef (verificado por diff): object-manager 8e75d9ab src/services/formulaValidator.js + src/graphql/resolvers/instance.resolver.js + docs/design/formula-relaciones-1-n.md (feat formula 1:N via LATEST), cdf35a53 src/graphql/resolvers/instance.resolver.js (gate getInstance formula lookup + hoist invariantes), 727d4271 (export gating + batch acotado); up1-manager 0eb16b4 (FormulaMaker 1:N).
