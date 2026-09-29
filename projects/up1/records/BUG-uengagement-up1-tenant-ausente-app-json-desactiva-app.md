---
id: BUG-uengagement-up1-tenant-ausente-app-json-desactiva-app
project: up1
type: bug
module: uengagement-up1
tags:
  - sp11
  - multi-tenant
  - layouts
---

El mapa tenants de config/app.json no listaba ECS, y isActiveForTenant lo usa como gate: toda la app (ofertas, journal, retencion) quedaba inactiva para ese tenant sin error visible. Ademas varios layouts de retencion (CRUD de RiskFactor, Student_view, dashboards de salud y postmortem) estaban fijos en ['UPU'], asi que agregar el tenant a app.json no alcanzaba: cada layout retention_* necesita su arreglo de tenants actualizado.

sourceRef: 9da2f30 config/app.json:1, config/layouts/retention_RiskFactor_create.json:2; 3e82f0d (layouts de ProgramEnrollment restantes)
