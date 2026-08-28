---
id: TICKET-036
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1207
module: object-manager
autopilot: autonomous
---

# HU-1 | prefillFrom param en createInstance (Ladrillo 1 — primitivo transversal de clonacion)

## Request

> Contenido literal del ticket Jira [UPONE-1207](https://u-planner.atlassian.net/browse/UPONE-1207) (Historia, parent epic UPONE-1206 "Core | Capacidad de clonación de objetos"). Reporter/Assignee: Eduardo Bacon.

### Descripción

Que `createInstance` acepte `prefillFrom: { sourceId, includeRelations? }` para crear una instancia pre-llenada desde otra del mismo tipo, sin resolver custom (primitivo de clonación, transversal).

### Criterios de aceptación

* `prefillFrom` opcional; no rompe los callers existentes.
* Valida que el source existe y es del mismo `objectType`; combina campos (lo explícito pisa al source).
* Default `exclude`: `id, createdAt, updatedAt, createdBy`.
* Errores: `PREFILL_SOURCE_NOT_FOUND`, `PREFILL_SOURCE_TYPE_MISMATCH`.

### Dependencias

HU-0j (config-storage) — ver Track 0 Core (UPONE-1219 → TICKET-033).

### Cambio vs actual

Ninguno de fondo; solo se anota la dependencia de config-storage.

## Contexto operativo del plan SP3

### P2.2 — HU-1 · prefillFrom param en createInstance (Fase 2) · [transversal/clonacion] · `P1`

- **Meta**: implement · ~2 SP · certeza confirmado (resolver extensible) · rollback git revert (arg opcional gated) · riesgo bajo si esta gated
- **Contexto**: el primitivo transversal. Extiende el resolver generico para crear una instancia pre-llenada desde otra del mismo tipo, sin resolver custom, reusando validacion/RBAC/hooks. Args opcionales **gated** para no romper los 64 callers.
- **Que se realiza**: `createInstance(objectType, data, prefillFrom?)`; con `prefillFrom`: lee `sourceId`, valida existencia + mismo tipo, combina campos (explicit pisa source), aplica default `exclude` (`id, createdAt, updatedAt, createdBy`); errores `PREFILL_SOURCE_NOT_FOUND`/`PREFILL_SOURCE_TYPE_MISMATCH`.
- **Depende de**: HU-0j (TICKET-033 cierra primero — el resolver lee `objectDefinition.versioningConfig` para `prefillFrom` declarado, aunque la version basica del param no requiere config-storage activo).
- **Investigar**: confirmar gating por presencia de param (sin `prefillFrom` → comportamiento identico al actual; con `prefillFrom` → branch nueva).
- **Prueba**: `unit` prefill basico, override explicito, source inexistente, cross-type rechazado.

## Material internalizado — HU detallada

### HU-1 · prefillFrom param en createInstance

**Sprint:** SP3 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** que `createInstance` acepte `prefillFrom: { sourceId, includeRelations? }`
**Para** crear una instancia pre-llenada desde otra del mismo tipo, sin resolver custom.

**Estado actual verificado:** `createInstance(objectType, data)` (`instance.resolver.js:2145`), extensible con args opcionales sin romper callers.

**Criterios de aceptacion:**

- [ ] `createInstance(objectType: String!, data: JSON!, prefillFrom: PrefillFromInput)` — `prefillFrom` opcional, no rompe llamadas existentes.
- [ ] Con `prefillFrom`: lee `sourceId`, valida que existe y es del mismo `objectType`, combina campos del source con los explicitos (explicit pisa source).
- [ ] Default `exclude`: `id`, `createdAt`, `updatedAt`, `createdBy`.
- [ ] Errores: `PREFILL_SOURCE_NOT_FOUND`, `PREFILL_SOURCE_TYPE_MISMATCH`.
- [ ] Tests: prefill basico, override explicito, source inexistente, cross-type rechazado.

**Dependencias:** Ninguna directa para la implementacion del param; HU-0j habilita lectura de `prefillFrom` declarado en JSON (HU-2 cierra eso).

## Material internalizado — Decisiones de diseno

### Ladrillo 1 (diseno §7.1) — `prefillFrom` en `createInstance`

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **No.** Extension del generico. Reusa `core_ObjectValidation`, RBAC, hooks. |
| Parametros | `prefillFrom: { sourceId: ID!, includeRelations: Boolean = false }`. JSON: `"prefillFrom": { "exclude": [string], "deepClone": [string] }`. Default `exclude`: `id, createdAt, updatedAt, createdBy`. `deepClone`: Prisma relations o `polymorphicChildren` (IMP-4, HU-0d en TICKET-033). |
| Eventos | Hooks de create normales + metadata `createdVia: "prefill"` (HU-6 en TICKET-041). |

## Material internalizado — Discovery (gap con archivo:linea)

### §2.1 Resolver generico `createInstance` (estado verificado)

- Firma real: `createInstance(objectType: String!, data: JSON!): InstanceResult` — resolver en `object-manager/src/graphql/resolvers/instance.resolver.js:2145`; SDL en `object-manager/src/graphql/typeDefs/static.js:1145-1150`.
- **Es el unico punto de creacion CRUD de la plataforma** (no hay `createXxx` por tipo). Dispatch dinamico via `prisma[objectType]`.
- Consumidores (≥12, 4 capas):
  - frontend/layout: `RecordDetail.vue:1590`, `CalendarLayout.vue:941`, `ImportTaskList.vue:348`, `CreateViewWizard.vue:1008`, `useEnrollment.ts:54`
  - mods (varios)
  - nodo n8n `flow/.../Up1FormObject/CreateItem/CreateItem.node.ts` (mutation hardcodeada `$objectType, $data`)
  - internos: `instance.resolver.js:3312,4721,4783`
- `withObjectAuth`/RBAC lee solo `args.objectType` (`withAuth.js:122,129`) → **insensible a args nuevos** (no rompe).
- Etapas compartidas inevitables: `prepareLayoutCreationData` (:2161), validacion JSON (:2307), lookup `objectDefinition` (:2313) — agnosticas al origen.

## Material internalizado — Shape canonico

### Firma GraphQL post-HU-1

```graphql
input PrefillFromInput {
  sourceId: ID!
  includeRelations: Boolean = false
}

type Mutation {
  createInstance(
    objectType: String!,
    data: JSON!,
    prefillFrom: PrefillFromInput
  ): InstanceResult
}
```

### Comportamiento del resolver

```js
// Pseudo-codigo del flujo gated
async function createInstance(objectType, data, prefillFrom = null) {
  // ... etapas compartidas existentes (prepareLayoutCreationData, validacion, lookup)
  if (prefillFrom?.sourceId) {
    const source = await prisma[objectType].findUnique({ where: { id: prefillFrom.sourceId } });
    if (!source) throw new Error('PREFILL_SOURCE_NOT_FOUND');
    if (source._objectType !== objectType) throw new Error('PREFILL_SOURCE_TYPE_MISMATCH');
    // Combinar: explicit > source > default exclude
    const exclude = new Set(['id', 'createdAt', 'updatedAt', 'createdBy']);
    const prefilled = Object.fromEntries(
      Object.entries(source).filter(([k]) => !exclude.has(k))
    );
    data = { ...prefilled, ...data };
  }
  // ... resto del flujo de create (igual al actual)
}
```

> **Gating estricto**: si `prefillFrom` es `null`/`undefined`, el codigo nuevo NO se ejecuta → los 64 callers existentes ven comportamiento identico.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | single (1 resolver + typeDefs + tests) |
| Modulo principal | object-manager |
| Modulos afectados | object-manager (resolver + GraphQL types) |
| Layer | core (RULE-dev-004) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | no | — |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | n/a |
| Version aprobada | — |
| Path | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El resolver es extensible con args opcionales sin romper los ~12+ consumers de ≥4 capas | ✓ confirmada | `withObjectAuth` lee solo `objectType` (`withAuth.js:122,129`); RBAC insensible a args nuevos |
| H2 | El gating por presencia del param hace que callers existentes vean comportamiento identico | ✓ confirmada | Patron tipico de Apollo Server; nullable param → branch ignorada si null |
| H3 | El `deepClone` declarativo en el JSON (HU-2 + HU-0d) se construye encima de este param. En este ticket solo el param basico — no implementa deepClone declarativo todavia | ✓ confirmada | HU-2 cierra el bloque JSON; HU-0d cierra polymorphicChildren. Ambos otros tickets |

### Context found

- **Rules del modulo**: RULE-dev-004 (codigo core).
- **Bugs abiertos**: ninguno.
- **Specs relacionados DKC**: ninguno previo.
- **Docs relevantes del repo**:
  - `object-manager/src/graphql/resolvers/instance.resolver.js` (`createInstance:2145`)
  - `object-manager/src/graphql/typeDefs/static.js` (SDL :1145-1150)
  - `object-manager/src/middleware/withAuth.js` (RBAC :122,129)
- **Warnings**:
  - **Branch core**: `UPONE-1206`.
  - **Gating estricto**: probar que callers existentes no ven cambio (regression de los 64+ callers).

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (epica core) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU recreada via reset canonico 2026-05-28 |
| Services | object-manager (4000), postgres local |
| Test data | seeds UPU |

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-06-01T12:47:02Z | false → super | dev trigger `super autopilot` al arrancar 036 | proximo gate (teach-intake) |

### Plan de sessions

3 sessions previstas (~1 SP). Esqueleto de `intake-explore`, refinado por `design-feature` (spec `SPEC-object-manager-hu1-prefillfrom-createinstance`).

> **Numeracion**: ticket sin sessions previas → plan empieza en S1.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | HU-1 — `input PrefillFromInput` + 3er arg opcional en SDL + guard gated en resolver (lookup con tenantId, errores, merge con exclude) | execute | T2 | S1.T1-T3 | auto | gated; TC-01..04 verdes |
| S2 | HU-1 — tests exhaustivos (override, cross-type, source inexistente, otro tenant, exclude) + regression callers existentes | execute | T2 | S2.T1-T3 | ⚑ fuerte | sin regression en callers; tenant isolation OK |
| S3 | Cierre — quality review + commits DET-27 + teach-close | execute | T1 | S3.T1 | auto | suite verde; teach-close validado |

> Sessions ejecutadas se materializan via `dkc-execute-task open-session N` (DET-29). El plan vive aqui; cada Session ejecutada se agrega como `### Session N` debajo.

### Session 1 — 2026-06-01 — resolver + SDL prefillFrom [phase: execute]

**Tipo:** auto (super autopilot — reviewer aislado DET-30)
**Validation tier:** T2
**Objetivo:** implementar el pre-llenado de campos propios del source en `createInstance`. **Pivote vs plan (L1)**: NO requirio cambio de SDL — `prefillFrom` ya existe dentro de `data` (033/HU-0d). Se extrajo la logica a un helper testeable `prefill-from-source.js` y se llama desde el resolver. Tests basicos verdes.

**Tasks completadas**:

- [x] S1.T1 — Confirmar mecanismo existente `data.prefillFrom` (033) + ubicar insercion; sin cambio de SDL (L1)
- [x] S1.T2 — Helper `prefill-from-source.js` (lookup tenant-scoped, errores NOT_FOUND/TYPE_MISMATCH, merge con exclude) + llamada en `instance.resolver.js:2196`, preservando rama `deepClone` de 033
- [x] S1.T3 — Suite `prefill-from-source.test.js`: 10/10 verde (TC-01..09b)
- [x] S1.GATE — Gate de sync S1 (tier T2): quality review DET-23, persistir, decidir continue

**Validacion del tier**: T2 — `vitest run tests/unit/resolvers/prefill-from-source.test.js` → 10/10 passed (6ms). `node --check` helper + resolver: syntax OK.

#### Quality review (DET-23)

Reviewer aislado (DET-30) — `recommendation: approve`.

| Dimension | Estado | Nota |
|-----------|--------|------|
| Calidad | pass | helper puro, aditivo, sin duplicar 033 |
| Lint | pass | proyecto sin ESLint; estilo consistente con repo |
| Tipado | warn | JS plano; JSDoc narrativo sin `@typedef` para `prefillFrom` anidado (finding menor) |
| Testing | pass | 10/10 TCs cubren los 5 REQs |
| Escalabilidad | pass | O(campos) merge; sin queries extra mas alla del findUnique |
| Mantenibilidad | pass | logica aislada en helper testeable |
| Claridad | pass | nombres + comentarios en espanol, intencion clara |
| A11y | n/a | backend |
| Storybook | n/a | backend |
| Error handling | pass | errores explicitos NOT_FOUND/TYPE_MISMATCH |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Findings menores (no bloquean, → S2): (1) agregar `@typedef` de `prefillFrom`; (2) TC defensivo para `exclude` no-array (ya manejado por `Array.isArray`, sin TC). Scope OK: todos los cambios en `object-manager/`.

**Commit DET-27**: `b1d8322` feat(object-manager) + `7e95f5f` test(object-manager) — en rama UPONE-1206 (object-manager). Records DKC en deckard `up1-sp3-w2`.

### Session 2 — 2026-06-01 — tests exhaustivos + regression [phase: execute]

**Tipo:** ⚑ fuerte (super autopilot — reviewer aislado; gate de regression)
**Validation tier:** T2
**Objetivo:** cobertura exhaustiva (override explicito, cross-type rechazado, source inexistente, source de otro tenant, exclude de auditoria) + regression de callers existentes (sin `prefillFrom` y con `prefillFrom={}` → comportamiento identico) + verificar `includeRelations:true` no-op.

**Tasks completadas**:

- [x] S2.T1 — Tests exhaustivos (override, cross-type, inexistente, default+caller exclude, coercion) + defensivo TC-11 (exclude no-array) + @typedef
- [x] S2.T2 — Regression: suite resolvers 457/457 verde; callers sin prefillFrom intactos (cambio gated/aditivo)
- [x] S2.T3 — Rama `deepClone` de 033 intacta (REQ-05): deep-clone-polymorphic.test.js verde dentro del suite
- [x] S2.GATE — Gate de sync S2 (tier T2, ⚑ fuerte): quality review DET-23 (reviewer aislado), cero regression, decidir continue

**Validacion del tier**: T2 — `npx vitest run --root <object-manager> tests/unit/resolvers/` → 457/457 passed (12 files, 1.68s). Suite prefill: 11/11.

#### Quality review (DET-23)

Reviewer aislado (DET-30, gate ⚑ fuerte) — `recommendation: approve`. regression_ok=true (457/457, 0 fail), scope_ok=true (delta solo en object-manager/), delta_as_expected=true (@typedef + TC-11). Sin findings. Los 2 findings menores de S1 (tipado/test defensivo) quedaron cerrados en S2.

**Commit DET-27**: `db1604c` test(object-manager) — rama UPONE-1206. Records DKC en deckard `up1-sp3-w2`.

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-01 — cierre [phase: execute]

**Tipo:** auto (super autopilot — reviewer aislado auto-aprueba)
**Validation tier:** T1
**Objetivo:** cierre del ticket — quality review final consolidado, verificacion de acceptance checkpoints, teach-close (DET-22), validacion de cierre reforzada (DET-30), status closed.

**Tasks completadas**:

- [x] S3.T1 — Acceptance checkpoints + commits DET-27 consolidados (S1/S2 ya committeados)
- [x] S3.GATE — Gate de cierre S3 (tier T1): validacion reforzada DET-30, teach-close, status closed

**Validacion del tier**: T1 — acceptance: 5/5 REQ cubiertos (TC-01..11); regression 457/0 (incl. deep-clone-polymorphic, REQ-05).

#### Quality review (DET-23)

Validacion de cierre reforzada (DET-30, reviewer aislado) — `recommendation: approve`. DET-13 (spec match) pass, DET-16 (propagacion) pass (cambio aditivo, sin propagacion pendiente), scope_ok (solo object-manager/), branch_ok (UPONE-1206), 457/0, 5/5 REQ pass. Sin findings.

**Acceptance checkpoints**: Funcional 5/5 REQ · Coverage 5/5 (TC-01..11) · Tests 11/11 + regression 457/0 · Multi-tenant REQ-04 (client scoped) · Rules (gating + tenant) ok · Docs teach-close.html validado.

**Commit DET-27**: n/a — session de cierre doc-only (codigo S1/S2 ya committeado: b1d8322/7e95f5f/db1604c). Records del cierre en deckard `up1-sp3-w2`.

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Commits

> Trazabilidad DET-27. Repo object-manager en rama `UPONE-1206`; records DKC en deckard `up1-sp3-w2`.

| Hash | Fecha | Header | Tasks | Repo |
|------|-------|--------|-------|------|
| b1d8322 | 2026-06-01 | UPONE-1207-S1 feat(object-manager): prefill de campos propios desde source en createInstance | S1.T2 | object-manager |
| 7e95f5f | 2026-06-01 | UPONE-1207-S1 test(object-manager): unit prefill-from-source (10 casos) | S1.T3 | object-manager |
| db1604c | 2026-06-01 | UPONE-1207-S2 test(object-manager): cobertura defensiva prefillFrom + @typedef | S2.T1 | object-manager |

## Test cases

> DET-25: registrados inline al ejecutar. Suite unit del helper `prefill-from-source.js` (`tests/unit/resolvers/prefill-from-source.test.js`). Affects UI: no (core resolver, sin UI directa).

| TC | REQ | Escenario | Actual | Evidence | Status | Session | Cambios gatillados |
|----|-----|-----------|--------|----------|--------|---------|--------------------|
| TC-01 | REQ-01 | sin `prefillFrom` → data intacta (gating, misma referencia) | data sin cambios | vitest verde (10/10) | pass | S1 | — |
| TC-02 | REQ-01/05 | `prefillFrom` con `deepClone` sin `source` → no pre-llena, 0 lookups | no lookup, data intacta | vitest verde | pass | S1 | — |
| TC-03 | REQ-03 | prefill basico → hereda name/status/credits del source | hereda campos | vitest verde | pass | S1 | — |
| TC-04 | REQ-03 | override explicito → `data` pisa source | name=Override, status heredado | vitest verde | pass | S1 | — |
| TC-05 | REQ-03 | default exclude → id/createdAt/updatedAt/createdBy no heredados | 4 campos ausentes | vitest verde | pass | S1 | — |
| TC-06 | REQ-03 | exclude del caller → campo extra excluido | credits ausente | vitest verde | pass | S1 | — |
| TC-07 | REQ-02 | source inexistente → `PREFILL_SOURCE_NOT_FOUND` | throw correcto | vitest verde | pass | S1 | — |
| TC-08 | REQ-02 | objectType sin modelo → `PREFILL_SOURCE_TYPE_MISMATCH` | throw correcto | vitest verde | pass | S1 | — |
| TC-09 | REQ-04 | coercion id numerico en `where` del lookup | `{where:{id:42}}` | vitest verde | pass | S1 | — |
| TC-09b | REQ-04 | id no numerico se mantiene string | `{where:{id:'abc-1'}}` | vitest verde | pass | S1 | — |
| TC-10 | REQ-01/05 | regression: callers existentes sin `prefillFrom` no cambian | suite resolvers verde | 457/457 tests (12 files), incl. deep-clone-polymorphic (033) | pass | S2 | — |
| TC-11 | REQ-03 | defensivo: `exclude` no-array se ignora (Array.isArray), default exclude sigue | credits heredado, id excluido | vitest verde (11/11) | pass | S2 | — |

## Backlog

> Vacio.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | `prefillFrom` YA existe en `createInstance` (`instance.resolver.js:2185`), introducido por 033/HU-0d fase 2 (REQ-06). Vive **dentro de `data`** (no es arg GraphQL), shape `{ source, deepClone[], exclude[] }`, y solo clona **hijos polimorficos** post-create (expone `cloneMap`). HU-1 es la mitad complementaria: pre-llenar los **campos propios** del source. El intake/spec asumio mal que prefillFrom era nuevo y seria arg GraphQL → sin cambio de SDL. | developer | 1 | refined | DEC-LOCAL-02 + teach-close |
| L2 | Tenancy en object-manager es por **client Prisma tenant-scoped** del `context` (dirs `prisma/{TENANT}/`), NO por columna `tenantId` en tabla compartida. El lookup `prisma[modelName].findUnique({where:{id}})` ya es tenant-safe. REQ-04 se cumple usando `context.prisma`, no agregando `tenantId` al where. | developer | 1 | refined | DEC-LOCAL-01 |
| L5 | HC infiere `SessionStatus` por la presencia de un **bloque `**Gate decision:**` cerrado**, NO por los checkboxes de tasks. Materializar bloques `### Session N` futuros al init (S2/S3 con tasks `[ ]` y sin gate decision) hace que HC los muestre `in_progress` falsamente. Correcto: **lazy** — solo la session activa tiene bloque; las futuras viven en `### Plan de sessions` y se materializan con `open-session N`. Fix: removido el bloque S3 hasta su apertura. | dev | 2 | refined | teach-close (candidato a RULE de workflow DKC) |
| L4 | `projects/up1/specs` era un **symlink a `/Users/edobacon/Workspace/uplanner/specs/up1`** (fuera de git) → los specs DKC de up1 (033/034/035/036…) nunca se versionaron. Fix: dir real tracked en deckard solo para specs DKC (con `ticket:`, ~26 migrados); info externa read-only via `specs-external` symlink. Regla: [[RULE-dev-005]]. | dev | 1 | refined | RULE-dev-005 |
| L3 | El tipo de objeto **es la tabla** (`prisma[modelName]`), sin discriminador `objectType` en el row (esa columna solo esta en tablas de audit/tag). Cross-type: un `sourceId` de otro tipo no existe en la tabla del target → resuelve como NOT_FOUND. TYPE_MISMATCH solo es distinguible si el id existe en otra tabla conocida; se implementa con validacion de formato/registry, no por columna. | developer | 1 | refined | spec REQ-02 / OQ-1 |

## Teaching — Intake

**Status**: done
**Archivo**: tickets/TICKET-036.teach/teach-intake.html (v2 HTML)
**Bloques**: tldr, callout, concept-card, invariant, flow (mermaid), code, two-col-compare, timeline, study-qa, tag
**Cobertura 4 ejes**: que sucede (intro/TL;DR) · por que (TL;DR/tags) · que cambia (code/flow) · por que se propone (study-qa Q4 — extender generico vs resolver custom)
**Validado**: dkc-validate Teach → valid, 0 errors, 0 warnings

## Teaching — Close

**Status**: done
**Archivo**: tickets/TICKET-036.teach/teach-close.html (v2 HTML)
**Bloques**: tldr, case (la historia/pivote), code (shape final), comparison-table (decisiones), flow (evolucion hipotesis), invariant (gating preservado), timeline (lecciones L1-L5), study-qa
**Cobertura**: que se realizo · decisiones cerradas (DEC-LOCAL-01/02) · evolucion hipotesis (H1-H3 + pivote) · lessons learned (L1-L5) · residuales (OQ-1, ticket-030 SPEC-012)
**Validado**: dkc-validate Teach → valid, 0 errors, 0 warnings

## Summary

**HU-1 `prefillFrom` en `createInstance`** (UPONE-1207) — cerrado 2026-06-01.

**Que se entrego**: pre-llenado de campos propios del source en el resolver generico `createInstance`, via helper testeable `prefill-from-source.js` (object-manager), gated por `data.prefillFrom.source`. Cumple los 4 criterios del Jira: opcional/no rompe callers (REQ-01), valida existencia+tipo con errores `PREFILL_SOURCE_NOT_FOUND`/`PREFILL_SOURCE_TYPE_MISMATCH` (REQ-02), merge explicit>source con default exclude (REQ-03), tenant-safe (REQ-04). Coexiste con la rama `deepClone` de 033 (REQ-05).

**Pivote clave (L1)**: el intake asumio un arg GraphQL nuevo; en S1 se descubrio que `prefillFrom` ya existia dentro de `data` (033/HU-0d). Se extendio ese mecanismo en vez de competir con el → sin cambio de SDL. Spec reorientado y revalidado.

**Evidencia**: 11 TCs propios (prefill, override, exclude, errores, coercion, defensivo) + regresion 457/457 de `tests/unit/resolvers/` verde. 2 reviewers aislados (S2.GATE ⚑ fuerte + cierre reforzado DET-30) → approve. Sin findings bloqueantes.

**Commits** (rama `UPONE-1206`, object-manager): `b1d8322` feat, `7e95f5f` test S1, `db1604c` test S2. Records DKC en deckard `up1-sp3-w2`. **Sin push** (super difiere push; merge a develop gated por team up1 — RULE-dev-004).

**Trabajo de infra colateral** (descubierto durante, ajeno a HU-1): migracion de specs DKC de symlink externo a dir real tracked (28 specs) + `RULE-dev-005`; hardening de permisos (CLAUDE.md Runtimes + hook anti-nvm + allowlist).

**Pendientes / residuales**:
- OQ-1: cross-type colapsa a NOT_FOUND (decision pragmatica); revisar si se quiere check de tipo explicito.
- ticket-030 (cerrado) referencia `SPEC-012-fix-casing-audit-chain-pascalcase` inexistente — ref colgante pre-existente, spawneada como tarea aparte.
- HU-2 (prefillFrom declarado en JSON) y HU-6 (metadata createdVia) construyen sobre este helper.

**SP**: estimated 1 · executed 2 (manual; heuristica 3 menos infra ajena a HU-1).
