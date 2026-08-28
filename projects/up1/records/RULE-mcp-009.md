---
id: RULE-mcp-009
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - contract
  - output
  - hygiene
---

# Higiene de salida: lectura y escritura podan el shape DB y conservan solo ids + FKs + campos de dominio

## What

Las tools de lectura (`list_objects`/`get_object`/`eng_get_*`/etc.) no devuelven el shape crudo de la DB. Aplican un criterio determinista de 3 niveles: (1) poda mecánica de campos `_*` (`_createdVia`, `_versionSourceId`) y ecos relacionales `{id}` vía helper genérico `publicFields`; (2) conservar siempre `id` + FKs + campos de dominio (los ids son necesarios para encadenar llamadas); (3) clasificar los campos grises en un `pick()` explícito por tool de dominio.

El mismo principio aplica al camino de **escritura**: previews, confirmaciones y errores de negocio pasan por un helper `preview()` centralizado (no JSON crudo con ids/FKs/`recordType`/`rt__`/`ext__`); los errores se presentan como mensajes de negocio, no como el nombre de la mutation GraphQL o el throw crudo; las confirmaciones identifican por nombre, no por id/tipo interno; los campos "grises" (enums de negocio como `programLevel`) se humanizan vía `enumLabels`, igual que ya se hace con `status`.

## Why

Fugar el shape DB completo al humano es ruido y expone internals; pero ocultar los ids rompería el encadenado de tools del LLM. El objetivo no es ocultar datos al agente, sino no fugarlos al usuario, preservando los ids para el flujo. Diagnóstico S20: `...i.data` / `...inst.data` fugaban el shape completo.

**Nota (2026-08-03)**: barrida sin ticket (6 commits, 2026-07-14: d216b7b, c9da9dc, fd13bc6, 0dd6b22, e9513cc, cc9e034 + 1396f06) extendió el mismo principio al camino de escritura, antes fuera de esta rule: helper `preview()` (`src/tools/preview.ts:104`) reemplaza JSON crudo duplicado en 10 archivos; errores de negocio en vez de throws con nombre de mutation; `programLevel` humanizado vía `enumLabels` (bug de paridad con `status`, hallado en prueba en vivo).

## Where

- **Files**: helper `publicFields` (núcleo, lectura), `pick()` en tools de dominio (`eng_get_offering`/`eng_get_service`, etc.); helper `preview()` (`src/tools/preview.ts:104`, escritura); tools de "quien" (`attendance`/`enrollments`/`bulk_enroll`/`analytics`) que resuelven `studentName`/`recordName` en batch.
- **Layers**: backend del MCP (capa de presentación/serialización), tanto lectura como escritura.

## When

Al implementar o modificar cualquier tool de lectura O escritura que devuelva texto/objetos al LLM: previews, confirmaciones, mensajes de error y desambiguación incluidos.

## Verification

- La salida de las tools de lectura no contiene `_createdVia`, `_versionSourceId` ni ecos `{id}` anidados.
- Los ids y FKs necesarios para encadenar siguen presentes.

## Source

- **Discovered in**: TICKET-080; origen plan MCP S20 (A+C). Ampliación a escritura: barrida sin ticket, 2026-07-14 (ver nota arriba).
- **Evidence**: S20 - `objects.ts:80/103`, `uengagement/tools.ts:89/137`, `instances.ts:56`; helper `publicFields` implementado. Escritura: `src/tools/preview.ts:104` (verificado).
- **Related**: [[RULE-mcp-008]] (no fugar surface de desarrollo - nombres de tools/objetos/campos internos; RULE-mcp-009 es un nivel más abajo: cómo podar el shape de los valores que SÍ se muestran, en lectura y ahora también escritura. No hay solapamiento de contrato, son capas complementarias de la misma capa de presentación). Descartada opción B (resolver FK→nombre, costo N+1).
