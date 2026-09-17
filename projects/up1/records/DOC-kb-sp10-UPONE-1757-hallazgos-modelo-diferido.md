---
id: DOC-kb-sp10-UPONE-1757-hallazgos-modelo-diferido
project: up1
type: doc
module: curriculum-design
tags:
  - ticket-145
  - UPONE-1757
  - hallazgos-modelo
  - diferido
  - server-side
---

# UPONE-1757 F6 — Hallazgos de modelo diferido (unique/indices A-CD-2/A-CD-5)

> Endurecimientos de **esquema/modelo** que TICKET-145 (UPONE-1757) DEJÓ FUERA a propósito (REQ-12: solo lógica, sin cambios de esquema ni migraciones). Cada invariante quedó sostenido por guard aplicativo; acá se registra la recomendación concreta de modelo y su riesgo residual, para un análisis posterior.

## H-MODELO-1 · Unicidad (planId, activityId) — A-CD-2 (F1)
- **Hoy:** guard aplicativo `planEntryUniquenessGuard.js` (detecta duplicado contra lo persistido + dedupe intra-lote). Sin constraint de DB.
- **Recomendación:** `@@unique([planId, activityId])` en el modelo de planEntry, con su índice de soporte.
- **Riesgo residual sin constraint:** ventana de carrera bajo concurrencia (dos requests casi simultáneas pasan ambas el check antes de escribir) → duplicado posible. Sin índice de cobertura, la detección puede degradar a scan por plan en lotes grandes. Además, el invariante depende de que TODO write pase por el override: un write directo a la DB o un path futuro que saltee el override queda sin cubrir.
- **Semántica de NULL:** en Postgres un `@@unique` trata los NULL como distintos, así que si `activityId` pudiera ser NULL, el constraint NO impediría múltiples filas con activityId nulo (el guard aplicativo actual sí puede tratarlas según su lógica). Confirmar que `activityId` es NOT NULL antes de aplicar el unique, o definir la semántica esperada para NULL.
- **Precondición antes de aplicar `@@unique`:** relevar duplicados existentes en datos reales de UPU (`group by planId, activityId having count > 1`). **No se relevó en este ticket** (no se mutaron ni consultaron datos vivos de UPU); queda como dato a obtener, no como decisión tomada.

## H-MODELO-2 · Índice de apoyo al renumerado (planId, period, position) — A-CD-5 (F3)
- **Hoy:** `movePlanEntry` renumera 0-based dentro de una transacción; sin índice ni constraint.
- **Recomendación:** `@@index([planId, period, position])` (y evaluar unicidad del triple) como apoyo al renumerado y al orden.
- **Riesgo residual sin constraint:** dos `movePlanEntry` concurrentes sobre el mismo period bajo Read Committed pueden intercalar sus lecturas y producir un renumerado inconsistente entre sí (cada transacción sigue atómica; nunca deja una fila a medio escribir).

## Hallazgos NO-bug / de alcance (no requieren cambio de modelo; trazabilidad)
- **A-CD-4 / electividad derivada:** la electividad se DERIVA de `blockId != null` (`deriveElectivity.js`); no hay flag `isElective` persistido. "electiva=true Y blockId=null" es hoy irrealizable por los callers reales; el guard cubre la rama efectiva (bloque vacío) y soporta un `isElective` opcional (documentado en test `[hallazgo]`, no cierra por sí solo ese caso; no afecta a callers actuales).
- **A-CD-3 / modo modular:** el guard de borrado evalúa por período real y NO distingue el modo modular (`modularPlacedPeriod`/`modularOwnerPeriod`). Ningún guard server-side existente lo maneja. Decisión de alcance, no bug.
- **A-CD-3 / twin JS del evaluador:** `logic/` se sincroniza a object-manager (Node plano sin transpile TS), no puede importar `evaluateRequirementTree.logic.ts`. Se creó twin JS `evaluateRequirementTree.js` (patrón de twin ya existente `buildRequirementTree.js`/`.ts`). **Riesgo:** drift twin JS ↔ `.ts`; conviene guard de paridad o nota de mantenimiento.
- **A-CD-7 / shape del payload:** `assertProgressionChangeAllowed` lee `data?.progression` top-level, no `data.extended`. Consistente con el shape plano actual; un caller que anide `progression` en `data.extended` lo esquivaría. Preexistente, fuera de alcance de R0.
- **A-CD-6 / sanitizador por regex:** sanitizador server-side JS propio por whitelist (sin lib server-safe como dependencia de runtime). Replica 1:1 la whitelist del cliente y pasó los vectores XSS (script/onerror/javascript:/data:/entidad-ofuscada). **Riesgo residual:** un sanitizador por regex es más frágil que una lib probada; mitigado por paridad con el cliente + defensa en profundidad del render client-side. Evaluar migrar a lib vetada si se acepta el footprint en object-manager.
