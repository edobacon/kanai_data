---
id: DECISION-suite-tenants-runtime-configmap-up1-tenants-UPONE-1977
project: up1
type: decision
module: suite
tags:
  - UPONE-1977
  - tenants
  - runtime-config
---

server/plugins/tenants.ts toma UP1_TENANTS_YAML (clave tenants.yaml del ConfigMap up1-tenants), proyecta solo las entradas suite: true con una whitelist de campos públicos y la inyecta en runtimeConfig.public.tenants en cada request. El manifiesto crudo es una env privada porque incluye admins. Si falta o es inválido se usa la lista compilada de config/tenants.ts y se loguea la razón; nunca se cae a lista vacía porque invalidaría todas las URLs de tenant. Las funciones de config/tenants.ts ahora reciben la lista por parámetro (app: useTenants(); server: getEventTenants()).

Fuente: ee41b2e config/tenants.ts:138; server/utils/tenantManifest.ts:1; server/plugins/tenants.ts.
