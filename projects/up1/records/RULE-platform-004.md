---
id: RULE-platform-004
project: up1
type: rule
module: platform
tags:
  - bd
  - schema
  - capabilities
  - rbac
---

# Schema BD UP1: capabilities normalizado en tablas `core_Capability` + `core_RoleCapability` (FK `capabilityId`), no campo flat

## What

El sistema RBAC de UP1 almacena capabilities en schema **normalizado**:

- **`core_Capability`** (entidad de capability): columnas `id` (int PK), `name` (text, ej. `activity:audit`), `description`, `riskLevel`, `applicableContextTypes` (jsonb), `objectDefinitionId` (FK), `fieldDefinitionId` (FK), `createdAt`, `updatedAt`
- **`core_RoleCapability`** (assignment role → capability): columnas `id`, `roleId` (FK `core_Role`), `capabilityId` (FK `core_Capability`), `defaultValue` (text), timestamps. UNIQUE composite `(roleId, capabilityId)`

NO existe campo `capability` flat (string) en `core_RoleCapability`. Cualquier query SQL que asuma `WHERE capability LIKE '...'` directo sobre `core_RoleCapability` falla con `column "capability" does not exist`.

## Why

Schema normalizado permite:

1. **Reuso de capability definitions**: 1 entrada en `core_Capability` puede asignarse a N roles via `core_RoleCapability`
2. **Metadata enriquecida**: capability tiene description, riskLevel, applicableContextTypes
3. **Integridad referencial**: FK cascade ON DELETE garantiza que assignments huerfanas se limpian al borrar capability
4. **Auditoria**: timestamps en assignment permiten trazar cuando se asigno

Confundirlo con un flat field es error comun cuando se escribe SQL ad-hoc — costo: query falla, dev pierde tiempo debuggeando.

## Where

- **Files**:
  - Migrations Prisma: `up1/object-manager/prisma/schema.prisma` (modelos `core_Capability`, `core_RoleCapability`, `core_Role`, `core_RoleAssignment`)
- **Tables**: `core_Capability`, `core_RoleCapability`, `core_Role`, `core_RoleAssignment`
- **Layers**: database (Postgres schema), backend (queries SQL ad-hoc)

## When

Aplica cuando:

- Escribis queries SQL ad-hoc verificando RBAC (ej. "¿este role tiene X capability?")
- Auditoria post-migracion verifica que capabilities estan correctamente asignadas
- Tests integration validan setup de roles + capabilities

NO aplica para queries GraphQL — el resolver del object-manager abstrae el JOIN.

## Verification

**Query empirica para verificar capabilities de un patron**:

```sql
SELECT c.name, COUNT(rc.id) AS assignment_count
FROM "core_Capability" c
LEFT JOIN "core_RoleCapability" rc ON rc."capabilityId" = c.id
WHERE c.name LIKE 'activity:%'
GROUP BY c.name
ORDER BY c.name;
```

NO escribir `SELECT * FROM "core_RoleCapability" WHERE capability LIKE 'activity:%'` — falla con `column "capability" does not exist`.

## Source

- **Discovered in**: TICKET-025, Session 1 (S1.T4 verificacion BD UPU post-rename)
- **Evidence**: Query inicial `SELECT COUNT(*) FILTER (WHERE capability LIKE 'activity:%') FROM "core_RoleCapability"` fallo con `ERROR: column "capability" does not exist. HINT: Perhaps you meant to reference the column "core_RoleCapability.capabilityId"`. Schema real verificado con `\d "core_RoleCapability"` y `\d "core_Capability"`. Aprendizaje L6 del ticket
- **Related**: RULE-mods-037 (capabilities sin prefix `mod/` para object-level)
