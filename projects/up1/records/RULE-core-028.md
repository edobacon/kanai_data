---
id: RULE-core-028
project: up1
type: rule
module: core
tags:
  - metadata
  - core_ObjectDefinition
  - frontend
  - mcp
  - deploy-boundary
  - single-source
  - architecture
---

# La `metadata` de objeto NO llega al FE, y BE↔FE no comparten runtime: una semántica de dominio compartida vive como constante por capa (o codegen), no como config leída cross-capa

## What

Dos límites de plataforma que, juntos, impiden que una semántica derivada de un objeto (p.ej. "qué `status` son editables / publicados") sea una **fuente única cross-capa** sin cambiar core:

1. **El core NO expone la `metadata` del objeto al FE.** El tipo GraphQL `core_ObjectDefinition` es un **allowlist cerrado** (`label`, `labelPlural`, `gender`, `description`, `defaultLayoutType`, `hoverFields`, ids/timestamps). No hay campo `metadata: JSON` ni query de introspección de metadata para el cliente. En el registry DB solo aterrizan `metadata.versioning`+`metadata.prefillFrom` (columna `versioningConfig`, decisión D25 "no blob genérico") y las 5 keys nombradas; **cualquier `metadata.*` nuevo NO llega al FE**. El BE **sí** puede leer la `metadata` cruda del JSON del objeto vía los helpers ya exportados (`getObjectToFileMap`/`findObjectFile` + `JSON.parse`).
2. **BE y FE son deploys separados vía sync.** `logic/` (resolvers) se sincroniza a `object-manager` y `modsComponents/` (Vue/TS) a `suite` — procesos/bundles distintos que **no comparten un `import` en runtime**. No existe hoy un módulo compartido entre ambos.

**Consecuencia / patrón por defecto:** si un mod necesita la misma política/enum de dominio en BE y FE (ej. `canEdit` en FE ↔ guard de mutación en BE), NO intentar "leerla de una config" en el FE (imposible sin cambio de core). Mantener **una constante por capa derivada del enum canónico** del objeto (`objects/<X>.json` `status.enum`), documentada como espejo. La unificación real requiere (a) un paso de **codegen** que derive ambas de una fuente, o (b) **exponer `metadata` al FE** (cambio de core: agregar `metadata: JSON` / query `describeObject`, o una columna nombrada + su sync).

## Why

TICKET-089 (MC-09) pidió que el criterio editable(`Draft`)/publicado(`Active`) se leyera de config y no estuviera hardcodeado. La auditoría confirmó que el FE **no puede** leer `metadata` del objeto sin tocar core, y que BE/FE no comparten runtime → una "fuente única cross-capa" no es alcanzable zero-touch. Se resolvió con constante por capa derivada del enum (`EDITABLE_STATUSES` en FE, `PUBLISHED_STATUSES` en BE), espejo del enum de `Curriculum.json`. Registrar esto evita que trabajo futuro (p.ej. TICKET-099, cobertura MCP) asuma que el FE puede leer metadata o que existe un import compartido, y encuadra la exposición de metadata al FE como un cambio de core con costo real.

## Where

- Allowlist FE: `object-manager/src/graphql/typeDefs/static.js` (`type core_ObjectDefinition`) + `objectDefinition.resolver.js` (`getObjectDefinitions`/`getObjectFields`).
- Sync de metadata al registry: `object-manager/src/services/codegen/generatePrismaSchema.js` (`addNewObjectsToRegistry` — 5 keys; `syncVersioningConfigToRegistry` — solo `versioning`/`prefillFrom`).
- Lectura BE de metadata cruda (soportada): `object-manager/src/services/fileParsing.js` (`getObjectToFileMap`/`findObjectFile`) + `JSON.parse`.
- Consumidores del patrón: mods con política de dominio en ambas capas, ej. `mods/curriculum-design/modsComponents/CurriculumMesh/curriculumMesh.logic.ts` (`EDITABLE_STATUSES`) ↔ `logic/helpers/requirementActivityGuard.js` (`PUBLISHED_STATUSES`).

## When

Al necesitar la misma constante/política/enum de dominio en BE y FE de un mod, o antes de asumir que el FE puede consultar la `metadata` de un objeto por la API. También al planear cobertura MCP que dependa de metadata del objeto (el MCP FE-side hereda el mismo límite; el MCP BE-side sí puede leer el JSON).

## Verification

`describe_object` / `getObjectDefinitions` devuelven solo campos allowlisted — no hay `metadata` en la respuesta. Un intento de seleccionar `metadata` en la query del cliente no tiene campo. Confirmado en vivo (2026-07-01): `query_records`/`describe_object` de los objetos de malla no exponen `metadata`, aunque sí los campos derivados del enrichment de lectura (que es otra cosa: se calcula en el resolver de lectura).

## Source

TICKET-089 (MC-09 / UPONE-1352), learns L1+L2 — auditoría de fuente única de estados editable/publicado (2026-07-01). Habilita el encuadre de TICKET-099 (cobertura MCP de la malla): exponer metadata/guards al FE es Fase A/cambio de core.
