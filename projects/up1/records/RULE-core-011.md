---
id: RULE-core-011
project: up1
type: rule
module: core
---

# Resolvers custom que reciben un ID de entidad deben validar ownership explícita

## What

Todo resolver custom que recibe un ID de entidad como argumento (por ejemplo `matrixId`, `instanceId`) DEBE validar explícitamente que ese registro pertenece al `context.tenantId` antes de operar. Formas aceptadas: (a) filtrar `where: { id, tenantId: context.tenantId }` en la primera query; (b) hacer un `findUnique` y comparar `record.tenantId === context.tenantId`, lanzando `ForbiddenError` si no coincide.

## Why

Aunque el Prisma client per-tenant opera sobre un esquema aislado (RULE-core-009), si el routing de client no es estricto o si un resolver por error usa el client global, un usuario autenticado en tenant A podría operar sobre registros de tenant B conociendo el ID. La validación explícita de ownership es una defensa en profundidad que sobrevive a errores de routing.

## Where

En todo archivo `logic/*.resolver.js` de mods cuyo resolver acepta como argumento un ID de entidad del dominio.

## When

Al implementar o revisar un resolver custom que recibe IDs de entidades (transiciones de estado, aprobaciones, mutaciones sobre registros específicos).

## Verification

Grep del resolver muestra filtro `tenantId: context.tenantId` en el `where` de `findUnique`/`findFirst`/`update`/`delete`, o un check explícito `record.tenantId === context.tenantId` previo a la operación. Test que simule acceso cross-tenant falla.

## Source

- **Discovered in**: TICKET-005
