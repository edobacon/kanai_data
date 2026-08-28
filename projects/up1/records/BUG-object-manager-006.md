---
id: BUG-object-manager-006
project: up1
type: bug
module: object-manager
tags:
  - drift
  - tenant-baseline
  - model-v2
  - offeringenrollment
  - attendance
  - engagement
  - mcp-limitation
---

# Drift del schema de UPU: `OfferingEnrollment`/`Attendance` híbridos (userId Int NOT NULL viejo + studentId nuevo) bloquean la escritura de engagement

## Symptom

En el tenant UPU, `OfferingEnrollment` y `Attendance` tienen un schema **híbrido**: conservan `userId` (Int, NOT NULL) del modelo viejo y a la vez `studentId` (String?) de model-v2. Crear una inscripción per model-v2 (`{offeringId, studentId}`) falla porque Prisma exige `user` (NOT NULL). Hay además `@@unique([offeringId, userId, role])` viejo.

## Expected behavior

Per model-v2, la identidad de inscripción/asistencia es `studentId → Student` (sin `userId`). El schema del tenant debería reflejar model-v2 limpio para permitir la escritura de engagement.

## Root cause

- **File**: schema generado de UPU (`schema.prisma` del tenant) — baseline no regenerado a model-v2.
- **Cause**: drift de DATO/baseline del tenant (no del código): el baseline de UPU quedó a medio camino entre el modelo viejo (userId) y model-v2 (studentId).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | escritura de engagement (enroll/unenroll/bulk/mark_attendance) en UPU |
| Data affected | OfferingEnrollment, Attendance |
| Modules affected | object-manager (baseline del tenant), uengagement, up1-mcp |
| Frequency | siempre en escritura de inscripción/asistencia en UPU |

## Reproduction

### Steps
1. `OfferingEnrollment.create({offeringId, studentId})` en UPU.
2. Falla: Prisma exige `user` (userId NOT NULL en el schema híbrido).

## Workaround

Ninguno desde el código (el MCP quedó correcto per model-v2 a propósito — ver DEC-023). La escritura se desbloquea al regenerar el baseline de UPU a model-v2 limpio.

## Solution

Regenerar el baseline del tenant UPU a model-v2 (eliminar `userId`/`@@unique` viejos en `OfferingEnrollment`/`Attendance`). Trabajo del object-manager / operaciones de tenant, NO del MCP (P3). NO usar `--accept-data-loss` (regenerar baseline).

## Related

- **Rules**: [[RULE-mcp-003]] (no modificar up1; el MCP no adapta al drift).
- **Decisions**: [[DEC-023]] (re-anclar a model-v2 sin adaptar al drift).
- **Specs**: SPEC-mcp-architecture (§11).
- **Origen**: descubierto en la build del MCP (S24, 2026-06-12); registrado vía TICKET-080.
