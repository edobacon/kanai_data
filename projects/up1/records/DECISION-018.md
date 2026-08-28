---
id: DECISION-018
project: up1
type: decision
module: report-builder
tags:
  - report-builder
  - codegen
  - schema
  - ext
  - flatten
  - migration
---

# DECISION-018: Aplanar `ext__uplanner__report` a la tabla base `Report`

## Contexto

El objeto `Report` tenía sus campos de contenido en el modelo extendido `ext__uplanner__report` (patrón estándar per-tenant). UPONE-1375/1376 ya habían detectado y guardado contra referencias huérfanas a ese modelo extendido, y agregado un opt-in `baseRelation.onDelete` para cascade Prisma en Extended JSON. UPONE-1377 fue un paso más allá: eliminó por completo el modelo extendido para `Report`, moviendo todos sus campos (incluidos `createdById`/`updatedById`, ahora tipados) a la tabla base.

## Decisión

Todos los campos de contenido de `Report` viven en la tabla base `Report`; el directorio `objects/business/Extended/` para este objeto fue removido. `getBlockedReportCodes` y demás consumidores usan `prisma.report.findMany` directo (`object-manager/src/graphql/resolvers/instance.resolver.js:1254,1271`), sin pasar por el modelo satélite. La migración SQL que mueve los datos existentes ya fue aplicada.

## Alternativas descartadas

- **Mantener `ext__uplanner__report` con guardas contra huérfanos** (UPONE-1376, paso intermedio): resolvía el síntoma inmediato (registros huérfanos) pero no la causa: seguía habiendo dos tablas para un mismo dominio de negocio, con el riesgo de divergencia que motivó el aplanado final.
- **Migrar a un objeto Extended nuevo con mejor gobernanza**: descartada porque `Report` no tiene necesidad real de variación per-tenant en su forma; el patrón `ext__` está pensado para custom fields de cliente, no para el modelo canónico completo de un objeto.

## Impacto / reversibilidad

Afecta `report-builder` (schema Prisma, resolvers de reporte) y cualquier consumidor de `Report` vía GraphQL (el shape del tipo no cambia hacia afuera, pero la persistencia sí). Reversibilidad **limitada**: la migración de datos ya se aplicó; revertir requeriría una migración inversa que reconstruya el modelo extendido y remapee los datos, con riesgo de pérdida si hubo escrituras en el intervalo.
