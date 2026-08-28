---
id: TICKET-125
project: up1
type: ticket
status: closed
work_type: fix
module: mods/curriculum-design
autopilot: manual
---

# Follow-up UPONE-1539 (TICKET-124): créditos reales en el co-add del alta en lote

## Request

Al agregar en lote un curso gateado por un requisito de créditos (MetricThreshold Credits >= N) JUNTO con los cursos que aportan esos créditos, el chequeo no los detectaba: las entries sintéticas del co-add se creaban con 0 créditos, así que el umbral nunca se cumplía en un alta conjunta y bloqueaba con un falso "faltan créditos". El curso gateado tampoco llegaba a colocarse en el nivel correspondiente. Es la faceta de créditos del co-add de REQ-1, que había quedado fuera del fix original.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix (lógica pura de prereqCheck + wiring en el componente) |
| Tipo de cambio | fix de lógica pura (`prereqCheck`) + wiring del caller |
| Modulo principal | mods/curriculum-design |
| Modulos afectados | — |

## Causa raíz

`buildCoAddedEntries` (`prereqCheck.logic.ts`) ponía `credits: 0` en las entries sintéticas de los co-agregados del lote. Aguas abajo, `aggregateCreditsBefore` (en `evaluateRequirementTree`) sumaba 0 por cada una de esas entries, por lo que un umbral `MetricThreshold Credits >= N` nunca se satisfacía en un alta conjunta, aunque los cursos que aportaban los créditos viajaran en el mismo lote.

## Fix

Las entries sintéticas del co-add pasan a portar los créditos reales mediante un nuevo parámetro `creditsByActivity`. El caller `checkPrereqsForBatch` construye el mapa `id -> créditos` desde el catálogo (`activityCreditsById`) y se lo pasa a `buildCoAddedEntries`. Un id sin crédito en el mapa cae a 0 (comportamiento por defecto seguro). El evaluador (`findMissingPrereqs` / `evaluateRequirementTree`) no se modifica.

**Limitación conocida**: el scope `category` no suma co-agregados (su `categoryId` queda null hasta la colocación efectiva), por lo que un umbral por categoría no se satisface en el alta conjunta. Queda documentado como límite del fix.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El co-add del alta en lote tenía dos facetas: la presencia del prereq-curso (REQ-1) y los créditos que aportan los co-agregados. La faceta de créditos se descubrió probando en runtime. Las entries sintéticas del co-add deben portar TODA la data que el evaluador consume (período centinela y créditos), no solo la presencia. | runtime smoke S1 | 1 | refined | RULE-curriculum-design-batch-coadd-carries-real-credits |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Session 1 — 2026-08-11 — Créditos reales en el co-add del alta en lote [tipo: 🔧 fix] [tier: T1]

**Tasks completadas:**

- [x] S1.T1 — Créditos reales en el co-add del alta en lote (`buildCoAddedEntries` + `findMissingPrereqsForBatch` + `activityCreditsById`) + 3 tests (REQ-7)
- [x] S1.GATE — Gate de sync (tier T1): persistir, quality review del fix de REQ-7, decidir continue/iterate/escalate

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 1 cerrada. REQ-7 (faceta de créditos del co-add). Suite mod 1543 -> 1546 (+3) verde, vue-tsc limpio, runtime verificado (Electivo Modular D). Commit local 69c48bf sin push. Habilita request-close.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-7 | co-add con créditos sin faltante / sin mapa de créditos bloquea / créditos insuficientes bloquea | unit (`prereqCheck.logic.spec.ts`, 3 tests) | verde |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC1 | co-add con créditos satisface el umbral | REQ-7 | unit | umbral Credits>=N, co-agregados aportan >=N | agregar gateado + aportantes en lote con `creditsByActivity` | umbral cumplido, no reporta faltante | umbral cumplido | prereqCheck.logic.spec.ts | ✓ verde |
| TC2 | sin mapa de créditos bloquea | REQ-7 | unit | umbral Credits>=N, sin `creditsByActivity` | co-agregados caen a 0 créditos | reporta faltante de créditos | reporta faltante | prereqCheck.logic.spec.ts | ✓ verde |
| TC3 | créditos insuficientes bloquea | REQ-7 | unit | umbral Credits>=N, co-agregados aportan <N | agregar gateado + aportantes insuficientes | reporta faltante de créditos | reporta faltante | prereqCheck.logic.spec.ts | ✓ verde |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| prereqCheck.logic.spec.ts | unit | S1.T1 | REQ-7 | vitest |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| suite mod | npx vitest run | 1543 | 1546 | +3 verde |

## Summary

Follow-up local de UPONE-1539 (sobre TICKET-124), cerrado en 1 session gateada con `continue`. Cubre la faceta de créditos del co-add de REQ-1, que había quedado fuera del fix original.

**Entregado (REQ-7):**
- Las entries sintéticas del co-add del alta en lote portan los créditos reales (nuevo param `creditsByActivity`); el caller `checkPrereqsForBatch` arma el mapa `id -> créditos` desde el catálogo (`activityCreditsById`). Un umbral `MetricThreshold Credits >= N` ahora se satisface en un alta conjunta cuando los cursos que aportan los créditos viajan en el mismo lote, y el curso gateado se coloca en el nivel correspondiente. Un id sin crédito cae a 0. Limitación conocida: el scope `category` no suma co-agregados (`categoryId` null hasta la colocación).

**Calidad:** 3 tests nuevos en `prereqCheck.logic.spec.ts` (co-add con créditos sin faltante / sin mapa bloquea / insuficientes bloquea); suite del mod 1543 -> 1546 (+3) verde; `vue-tsc` limpio.

**Runtime:** verificado en el plan `smoke1539-mod-plan` con "Electivo Modular D" (Credits>=45, plan base 40 créditos). Agregar D sola bloquea ("40 de 45"); agregar D + B (+5, 45 exactos) o D + B + C (+10) agrega todo y ubica D en Nivel 4 (nivel superior donde se acumulan los créditos). Capturas en scratchpad (124-13..16).

**Rule creada:** `RULE-curriculum-design-batch-coadd-carries-real-credits` (en `rules/mods/curriculum-design/`), refina el hallazgo (learn L1 refinado). 0 learns raw.

**Commit LOCAL** en `feat/UPONE-1539-modular-mesh` (sin push):
- `69c48bf` — REQ-7 créditos reales en el co-add del chequeo de prereqs del alta en lote + 3 tests

Fixture y guía de sp8 actualizados (Electivo Modular D + sección C.6.4).

**Push pendiente de OK del dev:** el commit `69c48bf` queda local en la rama; el push espera confirmacion explicita.

**Verificación adicional (OR / K-de-N en el flujo guiado):** a pedido del dev se revisó si el flujo guiado auto-agregaba las opciones de un requisito OR. Se confirmó que NO es un bug: un OR (ej. Electivo Modular A = OR{B, C}) cae al bloqueo "Una de dos (OR)" con botones Cancelar/Volver y obliga a elegir una opción a mano; el guiado solo auto-agrega cadenas DETERMINISTAS (un prereq `Before` concreto como AGR-5, o un AND donde todos los hijos son obligatorios, que sí corresponde agregar completos). `resolveChain`/`partitionMissing` cortan con `eligible:false` apenas un nivel tiene un faltante de alternativa (`type:'Group'`). Verificado en runtime por el dev y por smoke (capturas 125-01 OR bloquea / 125-02 determinista AGR-4 agrega su único prereq). Sin cambios de código por este punto.
