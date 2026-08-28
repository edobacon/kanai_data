---
id: TICKET-053
project: up1
type: ticket
status: closed
work_type: tactic
external: UPONE-1219
module: core
autopilot: manual
---

# Enforcement de unicidad scoped también en updateInstance (Gap 1 de TICKET-051)

## Request

Gap 1 anotado en el cierre de **TICKET-051** (B5): el enforcement de unicidad scoped (`uniqueScopedBy`) generalizado config-driven corre solo en `createInstance`. Un `update` que renombra/edita un campo único puede crear un duplicado dentro del scope `[ownerId, recordType]` sin ser rechazado. Extender el mismo helper `enforceScopedUniqueness` al path RT de `updateInstance`, excluyendo el propio registro. Asociado a **UPONE-1219** (Track 0 Core, mismo layer/Historia que B5; épica UPONE-1206).

## KB consulted

> DET-11 — lookup obligatorio antes de tocar código.

- **Rules**: `RULE-core-008` (CRUD genérico — confirma firma `updateInstance(objectType, id, data)`); `RULE-core-020` (TICKET-050 — patrón de "un check upstream del branch RT" en el resolver, consistente con dónde vive el enforcement; el check de unicidad es ortogonal al de capability, no colisionan). `RULE-core-013` (pre-fetch de `previousRecord`) aplica solo al path no-RT — el branch RT de update NO tiene pre-fetch reusable, se cargan los registros actuales localmente. n/a bloqueante.
- **Bugs**: `bugs/mods/`, `bugs/platform/` — sin bug abierto sobre updateInstance/unicidad. n/a.
- **Specs**: `SPEC-core-improve-clone-polish` (TICKET-051) — Gap 1 documentado ahí como out-of-scope + open question "¿extender a updateInstance?". Este ticket lo resuelve. Sin conflicto.

## Discoveries / decisions

- **D1**: el branch RT de `updateInstance` ([instance.resolver.js:3261-3334]) arma `baseFields`/`rtFields` **parciales** (solo lo que viene en el payload). Chequear solo el payload haría que un rename de `name` sin reenviar `ownerId`/`recordType` salte el check → enforcement casi nunca dispararía. Por eso se mergea el registro actual con el payload (`{...current, ...payload}`) para chequear el **estado efectivo post-update**.
- **M1 (micro-decision)**: se merge el estado actual (2 `findUnique`: base + RT) en vez de solo el payload. Cubre rename (campo único cambia, scope igual) Y cambio de scope (ownerId/recordType cambia, campo único igual) de forma natural. Excede el "mínimo" (chequear solo payload) pero el mínimo era casi inútil. Sigue siendo tactic (1 archivo de resolver + helper + test, bajo riesgo).
- **M2 (micro-decision)**: el helper gana un param opcional `excludeId` (default `null`). En create no se pasa → comportamiento idéntico (no puede colisionar consigo mismo). En update se pasa el id del registro → se excluye del `findFirst` (`id: { not }` en base; `<base>Id: { not }` en RT). Backward-compatible.

## Sessions

### Session 1 — 2026-06-04 — enforcement scoped en updateInstance [phase: tactic]

**Objetivo**: extender `enforceScopedUniqueness` al branch RT de `updateInstance` con exclusión de self + merge de estado actual.

**Tasks completadas**:
- [x] T1: `excludeId` en `enforceScopedUniqueness` + invocación en branch RT de `updateInstance` ([instance.resolver.js:3311], [scoped-uniqueness.js]).
      Cambio: el enforcement de uniqueScopedBy (solo create) ahora corre también en update, mergeando estado actual + payload y excluyendo el propio registro ·
      Validado: helper 11/11 (TC-09 excluye self, TC-10 no suprime colisión real, TC-11 back-compat) + suite resolvers 528/528 sin regresión ·
      → commit `d59cac4`

#### Commits

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| d59cac4 | T1 | UPONE-1219-tactic feat(object-manager): enforcement de unicidad scoped en updateInstance (Gap 1) | helpers/scoped-uniqueness.js, instance.resolver.js, tests/.../scoped-uniqueness.test.js |

## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

**Que se hizo**:
- T1 + `d59cac4`: `updateInstance` (branch RT) ahora aplica el enforcement de unicidad scoped via el helper `enforceScopedUniqueness`, que ganó un param opcional `excludeId` (excluye el propio registro del `findFirst`: base por `id`, RT por `<base>Id`). El payload de update es parcial → se mergea el estado actual (base + RT) con el payload para chequear el estado efectivo post-update. Cubre rename (campo único cambia, scope igual) y cambio de scope (ownerId/recordType cambia). `createInstance` no pasa `excludeId` → comportamiento idéntico (back-compat).

**Como se valido**: helper `scoped-uniqueness.test.js` 11/11 (incl. TC-09 exclusión de self en base+RT, TC-10 colisión real con otro registro sigue lanzando, TC-11 sin excludeId no agrega exclusión); suite completa de resolvers **528/528** sin regresión. No requiere `npm run sync` (la persistencia de `uniqueScopedBy` ya existe desde TICKET-051; update solo la lee).

**Que NO se hizo** (out-of-scope):
- Push del commit `d59cac4` en `UPONE-1206` — pendiente, gated por review team up1 (RULE-dev-004).
- Cierra el Gap 1 de TICKET-051; el Gap 2 (label i18n exacto del RT en B6) sigue abierto como mejora cosmética.
