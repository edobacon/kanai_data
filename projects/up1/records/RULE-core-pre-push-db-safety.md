---
id: RULE-core-pre-push-db-safety
project: up1
type: rule
module: object-manager
tags:
  - pre-push
  - sp9
  - db
  - core
---

Regla de seguridad de BD en el pre-push (object-manager). (1) Cuarentena de tablas no gestionadas para tenants non-prod que hacen opt-in; (2) reconciliar adiciones de unique constraint antes del db push; el scratch schema no necesita grant, up1_app es dueno de las tenant DBs. Relevante al flujo lazarus: el db push destructivo (--accept-data-loss) sobre BASEMODEL/UPU es el paso manual asociado cuando el sync topa un cambio destructivo.

sourceRef (verificado por diff): object-manager 1c03fd4d scripts/pre-push-migrations.js (quarantine unmanaged tables), daafa562 scripts/pre-push-migrations.js + scripts/sync/SyncManager.js:~27 (reconcile unique constraint additions before db push), 72d5f8e6/0ab20963 docs pre-push.
