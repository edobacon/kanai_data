---
id: BUG-curriculum-design-001
project: up1
type: bug
module: curriculum-design
tags:
  - audit
  - changelog
  - withEventPublish
  - updateActivityValidated
  - mcp-limitation
---

# `updateActivityValidated` no emite `withEventPublish` → los updates de campos de programa (Activity) no generan ChangeLog

## Symptom

Editar campos de un programa de asignatura (Activity) vía `updateActivityValidated` NO genera una entrada en `ChangeLog`. Un rename en vivo no aparece en el historial: `get_change_history` sigue mostrando solo los Creates. Los creates/deletes/transiciones y los updates de **sección** SÍ auditan; solo los **updates de programa** no.

## Expected behavior

Los updates de campos de Activity deberían auditarse en `ChangeLog` (transaccional en el resolver), como el resto de operaciones, para tener trazabilidad completa de cambios de programa.

## Root cause

- **File**: `activity.resolver.js:259-290` (mod curriculum-design) — `updateActivityValidated` hace `prisma.activity.update()` directo.
- **Cause**: no envuelve la mutación con `withEventPublish('update', …)`, por lo que el worker n8n audit-capture nunca se dispara para este path.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | auditoría/trazabilidad de cambios de programa |
| Data affected | ChangeLog (faltan entradas de update de Activity) |
| Modules affected | curriculum-design (resolver), flow (n8n audit-capture) |
| Frequency | siempre en updates de campos de Activity |

## Reproduction

### Steps
1. `updateActivityValidated` para renombrar un Activity.
2. `get_change_history(Activity, id)` → no aparece el update (solo Creates).

## Workaround

`up1-mcp` dejó un stopgap de auditoría COMENTADO (no activo) — activarlo arriesga doble-write. El fix definitivo va en el mod/core. (S5.)

## Solution

Envolver `updateActivityValidated` con `withEventPublish('update', …)` + evento `Activity-update` (auditoría transaccional en el resolver). Decidir mod vs core. Trabajo de up1 (P3). Relacionado con `recordAuditEvent` (contrato solo-n8n).

## Related

- **Rules**: [[RULE-mcp-003]] (reglas/fixes de up1 fuera del MCP).
- **Specs**: SPEC-mcp-architecture (§11 auditoría).
- **Origen**: descubierto en la build del MCP (S5, 2026-06-06); registrado vía TICKET-080. Ver también memoria del dev sobre el gap de auditoría de Activity update.
