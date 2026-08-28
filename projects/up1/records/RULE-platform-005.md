---
id: RULE-platform-005
project: up1
type: rule
module: platform
tags:
  - bd
  - postgres
  - naming
  - sql
---

# BD UP1 usa columnas camelCase quoted — queries SQL DEBEN usar comillas dobles

## What

Las tablas y columnas de la BD UP1 (Postgres) usan convencion **camelCase quoted**, no snake_case. Esto es consistente con Prisma ORM (genera columnas con el nombre del field del schema preservado en quotes).

Ejemplos reales (TICKET-025):
- Tabla `up1_layen_layout` (snake_case en parte del prefijo) con columnas `id`, `name`, `objectName` (camelCase), `layoutType` (camelCase), `createdAt`, `updatedAt`
- Tabla `workflowTransitionHistory` (camelCase del object name) con columnas `entityType`, `entityId`, `transitionId`, `userId`, `comment`, `createdAt`
- Tabla `core_Capability` con columnas `id`, `name`, `description`, `riskLevel`, `applicableContextTypes`, `objectDefinitionId`, `fieldDefinitionId`, `createdAt`, `updatedAt`
- Tabla `core_RoleCapability` con columnas `roleId`, `capabilityId`, `defaultValue`

**Queries SQL DEBEN usar comillas dobles** en nombres de columna camelCase:

```sql
-- ✅ Correcto
SELECT id, name, "objectName", "layoutType" FROM up1_layen_layout;
SELECT DISTINCT "entityType" FROM "workflowTransitionHistory";

-- ❌ Falla con `column "layouttype" does not exist`
SELECT id, name, objectName, layoutType FROM up1_layen_layout;
SELECT DISTINCT entityType FROM workflowTransitionHistory;
```

## Why

Postgres folder identifiers a lowercase por default. Sin comillas, `layoutType` se interpreta como `layouttype`. Como Prisma preserva el casing en el schema generado, las columnas viven en BD con su case original — requiere quoting explicito.

Confundir esto causa errores cripticos tipo `column "x" does not exist. HINT: Perhaps you meant to reference the column "y"` que el dev pierde tiempo debuggeando.

## Where

- **Files**: cualquier `.sql` script + queries ad-hoc via `psql` / `docker exec pg psql`
- **Tables**: TODAS las tablas managed por Prisma en object-manager + workspaces que generen schema via codegen
- **Layers**: database (Postgres), scripts (migrations, cleanup, audit queries)

## When

Aplica siempre que escribas SQL ad-hoc:
- Verificacion BD post-migracion
- Scripts cleanup
- Queries de auditoria
- Debugging de datos en `psql` interactivo

NO aplica para queries via Prisma client (`prisma.X.findMany()`) ni via GraphQL — esas APIs abstraen el casing.

## Verification

Comando rapido para inspeccionar columnas reales de una tabla:

```bash
docker exec pg psql -U pg -d uplanner_upu -c '\d "TableName"'
```

Si la salida muestra columnas con mayusculas (`objectName`, `layoutType`), las queries posteriores requieren quoting. Si todo es lowercase (raro en UP1), no.

## Source

- **Discovered in**: TICKET-025, Session 1 (S1.T3 script SQL cleanup BD UPU)
- **Evidence**: Query inicial `SELECT id, name, "objectName", layout_type FROM up1_layen_layout` fallo con `ERROR: column "layout_type" does not exist. HINT: Perhaps you meant to reference the column "up1_layen_layout.layoutType"`. Aprendizaje L7 del ticket. Script SQL final usa `"layoutType"` quoted correctamente
- **Related**: RULE-platform-004 (schema capabilities — mismo patron camelCase quoted)
