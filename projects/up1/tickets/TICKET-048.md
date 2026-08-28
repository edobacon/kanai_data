---
id: TICKET-048
project: up1
type: ticket
status: closed
work_type: improvement
module: object-manager
autopilot: manual
---

# Validar e2e el FLUJO COMPLETO de clonacion (polimorfico + remap hook + UI) — PARKEADO

## Request

> Residual de cobertura de **UPONE-1208 / TICKET-037** (HU-2, cerrado), bajo la epica **UPONE-1206**. **DESBLOQUEADO 2026-06-04** (TICKET-043/044/045 cerrados). **RE-SCOPEADO a opcion A** (ver Re-scope abajo).

Validar **end-to-end el flujo completo de clonacion/versionamiento desde un estado CANONICO LIMPIO**. Las validaciones previas fueron iterativas sobre cambios en caliente (DB mutada por pruebas manuales); este ticket confirma que **todo el flujo compone de cero**: reset canonico de DB → re-sync (mods→core) → ejercitar el flujo real (clonar/versionar un Activity con sus CurricularSections + CurricularLinks internos) y verificar el resultado, autocontenido.

### Re-scope (2026-06-04) — opcion A

La premisa original esta **desactualizada**: el "hook de remap por-modulo HU-8b" fue **reemplazado** por `applyDerivedRemap` generico en codegen (TICKET-049 / UPONE-1219), que ya tiene e2e (`tests/e2e/derived-remap-generic.test.js`). Cobertura por-pieza ya existente:

| Pieza | Test existente | Estado |
|-------|----------------|--------|
| Clone polimorfico (Activity→secciones, jerarquia+ownerId) | `tests/e2e/clone-activity-polymorphic.test.js` | ✓ |
| Remap CurricularLinks internos (reemplazo de HU-8b) | `tests/e2e/derived-remap-generic.test.js` | ✓ |
| Clone FK directa + self-ref recursivo + teardown sentinel | `tests/e2e/clone-direct-children.test.js` | ✓ |
| asNewVersion (rollback/commit $transaction) | `tests/e2e/version-asnewversion.test.js` | ✓ |
| getVersionChain / prefill / version-from-source / derived-remap | unit tests dedicados | ✓ |
| UI: row action HU-10 + seccion Versiones HU-11 | TICKET-044 / TICKET-045 (045 validado in-vivo) | ✓ |

**Delta genuino de 048 (lo que NO esta cubierto):** validacion **integrada desde estado limpio** — (1) reset canonico + re-sync, (2) correr la suite e2e de clone/version desde cero (verde), (3) ejercitar el flujo REAL via UI (row action "Crear nueva version" sobre un Activity seed → verificar en DB arbol clonado + links remapeados + version nueva), (4) DB consistente. Las piezas estan verdes aisladas; 048 confirma la integracion de punta a punta sin residuo de pruebas en caliente.

### Criterios de aceptacion (a refinar cuando se desbloquee)

- [ ] e2e que ejercita el flujo real: clonar un Activity con sus CurricularSections + CurricularLinks internos, via el camino que usa la UI / la capability, contra la DB real.
- [ ] Asserts: hijos clonados con jerarquia, **referencias internas (CurricularLinks) remapeadas correctamente** por el hook (HU-8b), sin punteros a ids viejos.
- [ ] Autocontenido: genera su caso real y restaura la DB al estado previo (teardown / reset canonico). Sin residuo.
- [ ] Regresion verde.

### Cambio vs actual

- Cobertura del flujo de clonacion **integrado** (no solo el primitivo aislado de HU-2).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement (cobertura de test, integracion) |
| Tipo de cambio | multi (object-manager resolver + mod CD hook + layout/UI) |
| Modulo principal | object-manager |
| Modulos afectados | object-manager, curriculum-design (hook HU-8b), layout/suite (row action UI) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | (valida UI existente, no crea) |
| Data model | no | (caso real efimero, restaurado) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El flujo completo solo es testeable e2e cuando HU-8b (TICKET-043, hook remap), HU-10 (TICKET-044, row action) y HU-11 (TICKET-045, seccion Versiones) esten implementados | ✓ confirmada (bloqueante) | Sin el hook de remap, los CurricularLinks clonados apuntan a ids viejos; sin la UI, no hay punto de entrada real del flujo |
| H2 | El primitivo polimorfico (deepClone + mapa) ya esta validado aislado, asi que este ticket valida la INTEGRACION, no el primitivo | ✓ confirmada | `tests/e2e/clone-activity-polymorphic.test.js` (verde) cubre el resolver; falta el hook + UI |

### Context found

- **Origen**: UPONE-1208 (TICKET-037) — el resolver expone `cloneMap` (`oldId→{newId,type}`) para que el hook del mod lo consuma; ese hook es HU-8b (TICKET-043), aun no implementado.
- **Dependencias de implementacion** (bloquean este ticket — DET-17 lifecycle): TICKET-043 (HU-8b hook), TICKET-044 (HU-10 row action), TICKET-045 (HU-11 seccion Versiones).
- **Patron e2e**: `tests/e2e/clone-activity-polymorphic.test.js` + el e2e de relacion directa de TICKET-047.
- **DB**: Docker `pg`; reset canonico disponible para caso efimero.

## Setup

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (al desbloquear; commits prefijo TICKET-048 por DET-19) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` (multi-repo: object-manager + mods/curriculum-design + layout/suite) |
| DB state | Docker `pg`; reset canonico para caso efimero |
| Services | object-manager, postgres, mod curriculum-design, suite/layout |

> **Bloqueante de arranque**: NO iniciar execute hasta que TICKET-043 (HU-8b), TICKET-044 (HU-10) y TICKET-045 (HU-11) esten cerrados/integrados. Al retomar: re-evaluar Triage + intake-explore + plan de sessions.

## Sessions

### Plan de sessions

> Ejecutado pragmaticamente en modo conversacional (dev dirigiendo): re-scope opcion A → reset/seed canonico → suite e2e → TC-02 UI-driven → cleanup de huerfanos → cierre.

### Session 1 — 2026-06-04 — Validacion clean-state del flujo clone/version [phase: execute]

**Tipo**: ⚑ fuerte (validacion empirica multi-capa) · **Tier**: T3

**Hecho**:
- Re-scope a opcion A (premisa HU-8b obsoleta → reemplazada por applyDerivedRemap generico, TICKET-049).
- Estado canonico de UPU via `tenant:create -- UPU --resume` (el `setup:reset` full quedo bloqueado por drift de base — atribuido a develop, no a SP3).
- **Suite e2e 7/7** (`npm run test:e2e`): clone-activity-polymorphic, clone-direct-children (+recursivo+teardown), derived-remap-generic, version-asnewversion.
- **TC-02 UI-driven**: row action "Nueva versión" sobre TIR101 v1 → modal confirmacion cascada → confirmar → v3 creada (prev=v1, max+1), 57 secciones clonadas (0 ids compartidos = clon real), redirige a edit.
- Restauracion: re-seed + cleanup de huerfanos (481 secciones + 481 rt__ borradas) → UPU canonico sin residuo (2 Activities, 0 huerfanos).

**Gate decision:** (approvedBy: dev)

- [x] continue → flujo clone/version validado e2e + UI; drift atribuido a base/develop (no SP3); DB restaurada. → cierre.
- [ ] iterate
- [ ] escalate
- [ ] standby

## Test cases

| # | Case | REQ | Affects UI | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|-----------|--------|----------|--------|---------|---------|
| TC-01 | Clonar Activity completo (sections + links remapeados) | REQ-IMPROVE | no | secciones clonadas (clon real) via UI; links remapeados via cloneMap | `derived-remap-generic.test.js` + TC-02 | **pass** | S1 | — |
| TC-02 | Flujo via row action UI (HU-10/HU-11) end-to-end | REQ-IMPROVE | yes | TIR101 v1 → "Nueva versión" → v3 (prev=v1, max+1) + 57 secciones clonadas (0 ids compartidos) + redirect a edit | smoke tc02-after-create (screenshots TICKET-048.screenshots) | **pass** | S1 | — |
| TC-03 | DB restaurada / sin residuo | REQ-PRESERVE | no | teardown sentinel (e2e) + cleanup manual de huerfanos post-validacion (0 huerfanos) | `clone-direct-children.test.js` + verificacion DB | **pass** | S1 | — |

## Summary

**Resultado**: flujo completo de clonacion/versionamiento **validado** desde estado canonico limpio.
- **Suite e2e 7/7** (clone polimorfico, clone FK directa + recursivo + teardown, derived-remap generico, asNewVersion).
- **TC-02 UI-driven PASS**: "Nueva versión" sobre TIR101 v1 → v3 creada (prev=v1, max+1) + 57 secciones clonadas (clon real, 0 ids compartidos) + redirect a edit.
- DB restaurada a canonico (re-seed + cleanup de 481 secciones huerfanas; 0 residuo).

**Hallazgo clave (no bloqueante para 048, item de core)**: el `setup:reset` full quedo bloqueado por un **falso positivo del drift detector** con Modality (7 errores). Atribuido con git a **base/develop, NO a SP3** (las 3 precondiciones — detector que keyea por title + no carga RecordTypes, catalogo standalone Modality, mod rt__Modality homonimo — existen en develop). Runtime/DB/e2e OK. Fix del detector → Backlog B-1 (core, UPONE-1206, team).

**Re-scope**: la premisa original (validar el "hook HU-8b por-modulo") quedo obsoleta — reemplazada por `applyDerivedRemap` generico (TICKET-049), ya con e2e. 048 valido la integracion + el flujo real UI.

**SP**: no aplica heuristica DET-26 (sin `external`).

## Backlog

| # | Item | Priority | Status | Notas |
|---|------|----------|--------|-------|
| B-1 | **CORE — fix del drift detector** (`object-manager/scripts/detect-schema-drift.js`): no carga `objects/business/RecordTypes/` y keyea por `schema.title` → colisiona RecordTypes con Base objects homonimos (Modality). Fix: cargar RecordTypes + keyear RTs por nombre canonico `rt__X__Y`. Item de core (UPONE-1206), team | should | open | Falso positivo de 7 errores Modality. Atribuido a base/develop (las 3 precondiciones estan en develop), NO a SP3. Bloquea el `setup:reset` full |
| B-2 | **Snapshot tenant Base no aplana campos de RecordType**: `tenant:create` no propaga los campos de `rt__X` al snapshot `tenants/{t}/Base/{x}.json`. Gap de tooling de core | could | open | Detectado al intentar cerrar el drift via tenant:create --resume |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | **El drift de Modality NO lo causa SP3** — las 3 precondiciones (detector buggy aa37696, catalogo standalone Modality, mod rt__Modality con title "Modality") existen en develop. Es bug del detector (no carga RecordTypes + keyea por title corto → colisiona RecordType con Base homonimo). Runtime/DB/e2e OK; solo falso positivo del gate estricto del setup:reset | smoke + git attribution | S1 | refined | Backlog B-1 (fix core) |
| L2 | **`npm run seed UPU` NO recrea las Activities de curriculum** (esas vienen del MOD seed `mods/curriculum-design/seed/`, aplicado por sync Phase 8 / tenant:create). El seed prisma borra Activities+BibliographyReference pero deja secciones huerfanas. Para restaurar curriculum usar `tenant:create -- UPU --resume` (incluye mod seed), no `seed UPU` | restauracion post-TC02 | S1 | refined | [[reference_up1_mod_seed_runs_during_sync]] |
| L3 | **identidad canonica de RecordType = `rt__X__Y`** (DECISION-007 + GraphQL `type rt__Modality__curricularsection` + tabla DB + layouts). El `title` corto es solo etiqueta; usarlo como key produce colisiones | investigacion drift | S1 | refined | RULE-mods-045 |

## Teaching — Intake

**Status**: skipped
**Razon**: ticket de validacion/cobertura ejecutado pragmaticamente en modo conversacional (autopilot false, dev dirigiendo cada paso). Aprendizaje capturado inline (Re-scope opcion A + Triage + Learns L1-L3 + investigacion de drift).

## Teaching — Close

**Status**: skipped
**Razon**: idem intake; la historia (validacion clean-state + atribucion del drift a base + cleanup) quedo en Session 1 + Summary + Learns. Modo conversacional permite skip con razon (DET-22).
