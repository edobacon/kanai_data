---
id: DOC-kb-sp10-UPONE-1757-F6-cierre-coordinacion
project: up1
type: doc
module: curriculum-design
tags:
  - ticket-145
  - UPONE-1757
  - cierre
  - coordinacion
  - blockGenericMutation
  - core-extensions
---

# UPONE-1757 F6 — Cierre y coordinación (veredicto N0, Core Extensions, advertencias)

## 1. Veredicto de `blockGenericMutation` por objeto (camino B)
Con cada invariante alojado en el **override del resolver del mod** (N3), el objeto queda en **N0** y el motor genérico del MCP pasa por el gate. Verificado por la matriz cross-client (REQ-10, 18/18 celdas: UI / genérico rt__ / up1_*_object rechazan con el mismo code de dominio).

| Objeto | Estado | blockGenericMutation |
|---|---|---|
| planEntry | N0 (estado/unicidad/forma/borrado/move en el único override) | innecesario |
| CustomSection | N0 (sanitización en create/update) | innecesario |
| Curriculum (progression) | N0 (guard extendido al path rt) | innecesario |
| Offering (createSyllabusOffering) | N0 (withObjectAuth) | innecesario |

**Ningún objeto quedó fuera de N0.** cd **NO necesita camino B**; no hay que coordinar `blockGenericMutation` con UPONE-1758 para este ticket. `planEntry` es objeto BASE sin alias `rt__`, así que no hay vía genérica separada que rodee el override.

## 2. Core Extensions detectados para core (NO implementados aquí)
Fuera del alcance de mod, para el equipo de core (`object-manager`):
- **`requiresComment`**: enforcement del comentario obligatorio a nivel motor.
- **Enum `RecordType`**: endurecimiento del enum a nivel core.

Se registran como detección; el diff no toca object-manager (REQ-11). Coordinar por el carril de Core Extensions.

## 3. Advertencias de alcance
- **Notificación al PO (PENDIENTE):** UPONE-1757 está declarado como **diagnóstico + spike** ("NO migra código productivo"). Este ticket **ejecutó la migración real** por decisión del dev (assignee). Acción pendiente: avisar al PO (Esteban Cortes) que 1757 pasó a ejecutar la migración, o formalizar el ticket de ajuste en Jira.
- **Gate F0:** 5 casos ambiguos → C (deriveLevel, guidedAdd, editEntryModal-resto, blockSelect); `recalcPeriodPosition` es A pero ya cubierto por A-CD-5. **0 reclasificados C→A** (sin alcance excedido).
- **Higiene de test (UPONE-1748):** se actualizó una aserción de `layouts-declared.test.ts` (tenants UPU→UPU/TEST) desactualizada tras UPONE-1748. Fix de higiene atribuible a UPONE-1748, incluido en esta rama por conveniencia; no es alcance funcional de 1757.
- **Tests de RBAC de syllabus:** los 7 tests de `syllabusOffering.test.js` se actualizaron para reflejar el nuevo gate `withObjectAuth` (aprobado por el dev); reflejan el contrato nuevo, no debilitan assertions.
- **Duplicados en UPU:** NO se relevó el conteo de duplicados (planId, activityId) en datos vivos (no se mutaron ni consultaron datos reales). Dato pendiente para el análisis de modelo, no decisión de este ticket.
- **Hallazgos de modelo diferido:** ver DOC `UPONE-1757-hallazgos-modelo-diferido` (`@@unique([planId, activityId])` de A-CD-2, `@@index([planId, period, position])` de A-CD-5, con riesgo residual de concurrencia).

## 4. Estado de regresión al cierre
- Suite mod curriculum-design: **2000 pass / 0 fail / 1 skip** preexistente (`profileBaselineEquivalence`).
- E2E del MCP: **verde** (read-back + 4 fronteras en paridad).
- Frontera de diff: no toca `prisma/**/schema.prisma` ni migraciones, no toca `mcp` ni `object-manager`, sin capability/superficie MCP nueva; los 6 `.logic.ts` migrados intactos.
