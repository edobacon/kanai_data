---
id: RULE-mcp-016
project: up1
type: rule
module: mcp
tags:
  - mcp
  - delete
  - cascade
  - recordtype
  - alias
---

# Borrar por el objeto base, no por el alias RecordType, para enganchar el motor de cascada

## What

Las tools de borrado del MCP MUST operar sobre el objeto BASE (ej. `CurricularSection`), nunca sobre el alias del RecordType (`rt__<RT>__...`). Base y RT comparten el mismo id, pero el motor de cascada/restrict del core solo engancha cuando se invoca desde la base; invocado desde el alias no ve los hijos.

## Why

`cd_delete_section` borra por `SECTION_BASE = "CurricularSection"` y no por el typed record, precisamente porque el alias RT no declara hijos y dejaría el árbol de cascada ciego. El mismo patrón habilita `deleteImpactPreview`/`summarizeDeleteImpact` (preview de impacto sin mutar) sobre el objeto correcto. Ver [[BUG-mcp-001]] (mismo patrón base-vs-alias, aplicado a requisitos en vez de borrado).

## Where

- `src/core/instances.ts` (`deleteImpactPreview`, `summarizeDeleteImpact`, comentario UPONE-1382 en línea 68 y 246)
- `src/mods/curriculum-design/sections-write.ts` (`SECTION_BASE` línea 16; uso en `deleteImpactPreview` línea 253-257)

## When

Al implementar o revisar cualquier tool de borrado (`delete_object`, `cd_delete_section` u otras futuras) que opere sobre objetos con proyección RT.
