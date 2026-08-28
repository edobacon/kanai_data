---
id: RULE-mcp-008
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - contract
  - confidentiality
  - conversational
  - output
---

# El MCP no fuga el surface de desarrollo al usuario (nombres de tools/objetos/campos internos, recordType, cuids, estructura)

## What

En el texto que el LLM transcribe al usuario, el MCP no expone artefactos de desarrollo: nombres internos de tools (`cd_search_programs`, `query_records`, `view_create`), nombres de objetos/campos internos (`recordType`, `currentStatusId`, `executionUnitId`), ids cuid, ni la estructura de `layoutConfig`. Se distinguen **3 clases de texto**: (a) input schemas/descriptions — solo las lee el LLM, se mantienen técnicas; (b) strings de OUTPUT que el LLM transcribe — en lenguaje de uso; (c) prosa del LLM — gobernada por la directiva de CONFIDENCIALIDAD en `instructions` (condensada a 1 línea en `instructions` + detalle en topic `conventions`).

## Why

El usuario es de negocio, no un desarrollador del MCP. Fugar nombres internos confunde y rompe la ilusión de una herramienta de dominio. Se reprodujo en vivo (S23): el LLM transcribió `recordType=Course`, `currentStatusId` y los nombres de tools, alimentado por `filtering.more` y el bloque FILTROS de `instructions`.

## Where

- **Files**: `instructions` del servidor (directiva CONFIDENCIALIDAD), strings de OUTPUT de las tools, topic `conventions` de `get_documentation`.
- **Layers**: backend del MCP (capa de presentación).

## When

Al redactar cualquier string de output o `instructions`, y al diseñar la prosa que el LLM mostrará. Auditoría F1–F10 (S23) como referencia de puntos de fuga.

## Verification

- Smoke conversacional: pedir una consulta filtrada y verificar que la respuesta no menciona nombres de tools/objetos/campos internos.
- Grep de strings de OUTPUT por términos técnicos (`recordType`, `cuid`, `layoutConfig`).

## Source

- **Discovered in**: TICKET-080; origen plan MCP S23 (D-S23-A), auditoría F1–F10.
- **Evidence**: fuga reproducida en vivo 2026-06-11 (`programs.ts:126-130`, `index.ts:57-63`).
- **Related**: [[RULE-mcp-009]] (higiene de salida), [[SPEC-mcp-surface-and-contracts]].
