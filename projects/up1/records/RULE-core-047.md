---
id: RULE-core-047
project: up1
type: rule
module: core
tags:
  - multi-tenant
  - security
  - clerk
  - tenant-isolation
---

# La membresia de tenant se verifica contra el claim firmado de Clerk antes de resolver el cliente Prisma

## What

Un request cuyo `X-Tenant-ID` no corresponde a un tenant al que el usuario autenticado pertenece MUST rechazarse antes de resolver el cliente Prisma de ese tenant. La membresia se lee del claim `up1Tenants` del session token de Clerk (`publicMetadata.up1Tenants`), escribible solo desde el backend (`syncUser` es el unico escritor). El header `X-Tenant-ID` por si solo nunca autoriza: solo selecciona cual tenant, la pertenencia la decide el claim.

## Why

Sin esta verificacion, cualquier usuario autenticado podia apuntar `X-Tenant-ID` a un tenant ajeno y el gate de aislamiento multi-tenant dependia solo de que el codigo de mas abajo filtrara por `tenantId`, sin confirmar antes que el usuario tuviera derecho a ese tenant. El rollout es seguro por diseno: solo un claim no vacio que **omite** el tenant deniega, para no romper usuarios cuyo claim todavia no esta poblado durante la migracion.

Source_ref: `object-manager/src/services/auth/userExtractor.js` (funcion `isTenantAccessAllowed`, lee `payload?.up1Tenants` y compara contra `tenantId`; `grantTenantMembership` es el unico escritor de `publicMetadata.up1Tenants`), `object-manager/src/index.js`.

## Where

`object-manager/src/services/auth/userExtractor.js`, punto de entrada de todo request GraphQL en `src/index.js`. Aplica a cualquier flujo que resuelva el cliente Prisma tenant-scoped a partir de `X-Tenant-ID`.

## When

Al revisar o extender el middleware de autenticacion, o al depurar un caso de aislamiento de tenant roto: verificar primero si el claim `up1Tenants` del usuario incluye el tenant solicitado, no asumir que el header alcanza.
