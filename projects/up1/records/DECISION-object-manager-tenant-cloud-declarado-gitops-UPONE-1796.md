---
id: DECISION-object-manager-tenant-cloud-declarado-gitops-UPONE-1796
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1796
  - sp11
  - tenants
  - gitops
---

Antes habia que agregar a mano DATABASE_URL_<ID> y APP_DB_PASSWORD_<ID> en el ExternalSecret. Ahora, solo en dev (staging y prod siguen con el par manual), basta agregar el slug en minuscula a la linea $connected de externalsecret-object-manager.yaml (la plantilla compone DATABASE_URL_<UPPER(slug)>) y el bloque de metadata del tenant, con sus admins, en configmap-tenants.yaml. CI valida que ambos archivos sean consistentes.

sourceRef: a751b41d docs/guides/provisioning-a-cloud-tenant.md
