---
id: BUG-mcp-001
project: up1
type: bug
module: mcp
tags:
  - mcp
  - requirement
  - recordtype
  - alias
  - prisma
  - cycle-guard
---

# Crear/recorrer requisitos por el objeto base `requirement` perdía campos del subtipo y dejaba ciego el guard de ciclos

## Symptom

Crear o listar nodos del árbol de requisitos (`cd_manage_requirement`) usando el objeto base `requirement` fallaba con error de Prisma al crear, y en `action:view` el árbol se listaba sin `targetType`/`mustBe`/`timing` (sin objetivo ni combinador visibles). El guard de ciclos (`wouldFormRequirementCycle`) quedaba ciego porque no veía los campos reales del nodo.

## Root cause

- **File**: `src/mods/curriculum-design/requirement-write.ts:34-37` (verificado)
- **Cause**: los campos del subtipo (`MetricThreshold.metric/operator/value/scope`, `targetType`, `mustBe`, `timing`) viven en `rt__<RT>__requirement` (el alias del RecordType), NO en el objeto base `requirement`. Crear o listar por el base los deja top-level sin proyectar esos campos: Prisma rechaza el create (columnas inexistentes en el modelo base) y el guard de ciclos, al no ver `targetType`, no puede evaluar el grafo real.

## Fix

Rutear la creación y el recorrido del árbol por el alias tipado (`typedRequirementName(recordType)` en `requirement-write.ts:37`), mismo patrón ya usado en `cd_create_section` (ver [[RULE-mcp-016]]). `action:view` enriquece cada nodo con los campos del alias antes de armar el árbol (`requirement-write.ts:265`).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier flujo que cree o consulte requisitos/prerrequisitos vía MCP |
| Data affected | nodos `Group`/`RecordState`/`MetricThreshold` del árbol de requisitos |
| Modules affected | mcp (`requirement-write.ts`), curriculum-design (mismo patrón base/alias que sections) |
| Frequency | siempre que se creaba o recorría un requisito por el objeto base |

## Related

- Causa raíz cazada por smoke E2E, no por unit tests mockeados - mismo patrón que [[feedback_verify_real_write_entry_path]] (memoria global).
- Mismo patrón base-vs-alias que motivó [[RULE-mcp-016]] (borrado de secciones).
