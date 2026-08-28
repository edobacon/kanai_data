---
id: TICKET-090
project: up1
type: ticket
status: closed
work_type: tactic
module: up1-mcp
autopilot: manual
---

# MCP: alinear `progression` a enum {Sequential, Modular} en el contrato de Curriculum

## Request

Tras cerrar `rt__Plan__curriculum.progression` a enum `["Sequential","Modular"]` en up1 (TICKET-081 / UPONE-1344), el MCP de up1 sigue declarando `progression` como string libre en su contrato hardcodeado (`registry.ts` + `curriculum-write.ts`). El MCP no introspecciona el backend, así que no "entiende" el enum: no ofrece las opciones en `get_field_options`/`get_create_guide` y `validateEnums` no valida el valor → forwardea cualquier string y el backend lo rechaza. Alinear el contrato al enum espejando exactamente `periodType`.

## KB consulted

> DET-11 — lookup obligatorio antes de tocar codigo.

- **Rules**: [RULE-mcp-010](../rules/mcp/RULE-mcp-010-semantic-resolution-config-driven.md) — enums config-driven en `enumLabels` (etiquetas + sinónimos), resolución vía `core/resolve.ts`; el cambio debe declarar `progression` en `enums` + `enumLabels`. [RULE-mcp-005](../rules/mcp/RULE-mcp-005-generic-contract-aware.md) — el contrato es la única superficie para agregar capacidad sin tocar el núcleo. [RULE-mcp-003](../rules/mcp/RULE-mcp-003-no-modificar-up1.md) — el cambio es en el repo del MCP, NO toca up1 (P3 respetada).
- **Bugs**: n/a
- **Specs**: [SPEC-mcp-surface-and-contracts](../specs/SPEC-mcp-surface-and-contracts.md) — define el shape del contrato (enums/enumLabels/fieldDocs); el cambio es aditivo, no lo contradice.

## Discoveries / decisions

- D1: `periodType` es el precedente exacto en el mismo contrato — está en `enums` (`PERIOD_TYPES`), `enumLabels` (con sinónimos) y `fieldDocs.periodType.type="enum"`; y en `curriculum-write.ts` se tipa `z.enum(PERIOD_TYPES)`. `progression` se alinea 1:1.
- M1 (micro-decision): en `curriculum-write.ts` se usa `z.enum(PROGRESSION_TYPES)` (no `z.string()`) — es el patrón de `periodType` en las tools de dominio; la resolución de sinónimos por lenguaje de negocio vive en la capa de contrato/`get_field_options` (RULE-mcp-010), no en el zod de la tool de dominio.

## Sessions

### Session 1 — 2026-06-25 — alinear progression a enum en el contrato del MCP [phase: tactic]

**Objetivo**: declarar `progression` como enum `{Sequential, Modular}` en el contrato de Curriculum del MCP, espejando `periodType`.

**Tasks completadas**:

- [x] T1: declarar `progression` como enum en el contrato de Curriculum (`registry.ts`) + tipar la entrada de las tools de escritura (`curriculum-write.ts`).
      Cambio: `progression` string libre → enum `["Sequential","Modular"]` (const + `enums` + `enumLabels` con sinónimos + `fieldDocs.type="enum"`; `z.enum(PROGRESSION_TYPES)` en create/update) ·
      Validado: `tsc` build PASS + `vitest run` 83/83 PASS (incl. contracts.test.ts 21) ·
      → commit `77be85c`

#### Commits

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| `77be85c` | T1 | TICKET-090-tactic feat(curriculum-design): progression enum {Sequential, Modular} en contrato MCP | src/contracts/registry.ts, src/mods/curriculum-design/curriculum-write.ts |

## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

**Que se hizo**:
- T1 + `77be85c`: `progression` pasó de string libre a enum `["Sequential","Modular"]` en el contrato de Curriculum del MCP, espejando `periodType`. Tocó `registry.ts` (const `PROGRESSION_TYPES` + `enums.progression` + `enumLabels.progression` con sinónimos es + `fieldDocs.progression.type="enum"`) y `curriculum-write.ts` (`z.string()` → `z.enum(PROGRESSION_TYPES)` en create y update).

**Resultado**: ahora `describe_object`/`get_create_guide`/`get_field_options` exponen `progression` como enum con opciones Secuencial|Modular, y `validateEnums` + el zod de las tools de dominio rechazan valores fuera del enum client-side (antes forwardeaba cualquier string → rechazo crudo del backend).

**Como se valido**: `npm run build` (tsc) PASS sin errores; `npx vitest run` = 83/83 tests PASS (incl. `contracts.test.ts` que valida coherencia enums/enumLabels/fieldDocs). Commit local `77be85c` en rama `UPONE-1267-sp5` del repo MCP — push pendiente de OK del dev.

**Que NO se hizo** (out-of-scope):
- Push de la rama del MCP (gated, requiere OK).
- El MCP no introspecciona el backend: el contrato es la fuente. Si up1 agrega un tercer valor al enum, hay que reflejarlo aquí también (mismo modelo que `periodType`).
- Depende de que TICKET-081 sincronice el enum en up1 (backlog B1) para que el rechazo end-to-end aplique; el contrato del MCP ya queda alineado de antemano.
