---
id: DECISION-suite-customhome-i18n-UPONE-1630
project: up1
type: decision
module: suite
tags:
  - UPONE-1630
  - UPONE-1716
  - sp9
  - suite
---

customHome declarable por app: contrato (schema + resolver) y aterrizaje en runtime (UPONE-1630); ademas se valida customHome en el sync (object-manager) y getAppsFiltered deja las apps gated por profile sin caer abiertas. Precarga de los namespaces i18n por-objeto que la nav renderiza (UPONE-1716).

sourceRef (verificado por diff): suite 8bfa29b logic/app.resolver.js + logic/app.schema.graphql + objects/up1_suite_app.json (contrato customHome), 1fef8e3 (aterrizaje runtime), 13ad970 (getAppsFiltered profile-gated), 32f9ecc (precarga namespaces i18n nav); object-manager e134773c scripts/sync/dbSync.js (validar customHome en el sync).
