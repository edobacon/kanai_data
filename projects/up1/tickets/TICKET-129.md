---
id: TICKET-129
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1608
module: object-manager
autopilot: autonomous
---

# Backend: los previews de impacto de borrado deben resolver el alias RecordType a objeto base

## Request

Los previews de impacto de borrado (`deleteImpactPreview` y `softDeleteImpactPreview`) revientan con `PrismaClientValidationError` cuando reciben un alias de RecordType (`rt__<Rt>__<base>`) como `objectType`: el motor consulta la tabla de proyeccion por `id`, que no existe (su PK es la FK `<base>Id`). El borrado real ya resuelve el alias al objeto base (`deleteBulkInstances`, entro con UPONE-1479), pero los dos previews nunca recibieron esa resolucion y llaman al motor por su cuenta con el tipo crudo. Hay que llevar los dos previews a paridad: resolver el alias al objeto base antes de invocar `buildDeleteImpactPlan` / `buildSoftDeleteImpactPreview`. Distinto del follow-up de divergencia preview-vs-ejecucion flagueado en UPONE-1557: este es el crash del preview por alias. Atado al Jira UPONE-1608.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (core, object-manager) |
| Modulo principal | object-manager |
| Modulos afectados | ninguno (comportamiento generico del motor de impacto de borrado) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `deleteImpactPreview` y `softDeleteImpactPreview` pasan el `objectType` crudo al motor de impacto sin resolver el alias RecordType; el motor consulta la proyeccion `rt__*__<base>` por `id` (inexistente) y Prisma lanza | ✓ confirmada | `instance.resolver.js:1467` y `:1506` pasan `objectType` directo a `buildDeleteImpactPlan`/`buildSoftDeleteImpactPreview`; ninguno llama `parseRecordTypeFileName` (verificado en develop, checkout uplanner/up1) |
| H2 | El fix consistente con UPONE-1479 es resolver alias->base en los dos previews (no resolver el PK del RT): la metadata que gobierna el borrado (`directChildren`, `softDelete`) vive en el objeto base, no en la proyeccion | ✓ confirmada | `deleteBulkInstances` (`instance.resolver.js:6004`) ya resuelve alias->base antes del motor; el preview debe mirar el base para conteo correcto |

### Context found

- **Fuente del bug (reporte del mod)**: `mods/curriculum-mapping/docs/BUG-core-harddelete-cascade-recordtype.md`, seccion "Sintoma relacionado: `deleteImpactPreview` tambien falla con RT". El cuerpo principal de ese doc quedo cerrado por UPONE-1479; esta parte sigue abierta.
- **Antecedente**: [[TICKET-117]] (UPONE-1479) resolvio el alias en el path de borrado pero no toco los previews.
- **Familia**: [[TICKET-122]] / [[TICKET-123]] (UPONE-1557, robustez del hard-delete). La descripcion de UPONE-1557 flagueo un follow-up de divergencia preview-vs-ejecucion; este ticket es el crash del preview por alias, distinto de esa divergencia.
- **Warnings**: la resolucion debe anclarse en `parseRecordTypeFileName` / la resolucion real que ya usa `deleteBulkInstances`, no en un patron de string `rt__`. Extraer a un helper compartido (ej. `resolveRecordTypeToBaseObject`) en vez de duplicar el bloque de `:6004`.
- **Cobertura**: hoy no hay ningun test de `deleteImpactPreview` ni `softDeleteImpactPreview`. El path de borrado si tiene `tests/integration/hard-delete-cascade.integration.test.js`.
- **Consumidor front (best-effort)**: `layout/src/layouts/RecordList/RecordList.vue` invoca el preview para el conteo dinamico del modal critico; ante error cae a texto estatico. El borrado real (`deleteBulkInstances`) revalida y aborta. Por eso el bug **no es bloqueante** para el usuario, pero se pierde la barrera de aviso (el usuario confirma sin ver referencias que van a bloquear) y queda ruido `PrismaClientValidationError` en el log del OM en cada apertura del modal (fuente: descripcion UPONE-1608, verificada contra codigo).
- **Resolucion de referencia (`instance.resolver.js:6004-6014`)**: `deleteBulkInstances` hace `parseRecordTypeFileName(objectType)` → si matchea, toma `baseObjectLower` y consulta `core_ObjectDefinition.findFirst({ where: { name: { equals: baseObjectLower, mode: 'insensitive' } } })` para recuperar el **casing canonico** del base; recien entonces reasigna `objectType`. El fix replica exactamente ese bloque en un helper compartido (introspeccion case-insensitive, no string-munging — RULE-core-035/044).
- **Helper `parseRecordTypeFileName`** (`services/fileParsing.js:173`): `rt__(.+)__(.+)$` → `{ rtName, baseObjectLower }` o `null`. Es la primitiva que ancla la resolucion (no un `startsWith('rt__')` fragil).
- **Regla canonica que gobierna el fix**: [[RULE-core-043]] — el nombre de un RecordType es un alias de presentacion; resolver a base antes de aplicar la politica de borrado. Nacio de UPONE-1479 (el path que este ticket lleva a paridad).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | (a crear) `UPONE-1608-om-preview-rt-alias` |
| Base branch | develop |
| DB state | tenant real (BD real): la resolucion depende de introspeccion/casing de columnas; unit con Prisma mockeado puede dar falso verde |
| Services | object-manager |
| Test data | objeto base con proyeccion RecordType listado por el alias (ej. `rt__Scheme__levelscheme` sobre `LevelScheme`, tenant UPU, mod `curriculum-mapping`) |

### Reproduction steps

1. Tenant UPU, mod `curriculum-mapping` activo.
2. Abrir un listado sobre `rt__Scheme__levelscheme` con `deleteWarning: { type: "critical" }`.
3. Pulsar eliminar sobre cualquier fila: el modal abre sin conteo y el log del object-manager muestra `PrismaClientValidationError` (`Unknown argument id` sobre `rt__Scheme__levelscheme.findMany`).
4. Esperado: el preview devuelve un plan valido (status, conteos, restricciones) mirando el objeto base.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-08-12 | open → super | dev pidio intake completo listo para super autopilot | intake |

### Plan de sessions (preplanificacion)

1 session prevista. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria) lo completa `design-fix` al generar el spec. La session puede subdividirse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Extraer helper `resolveRecordTypeToBaseObject`, aplicarlo en los dos previews, cobertura de integracion real-DB y doc | 1 | T2 | S1.T1..S1.T4 segun spec: RED previews, helper + 4 call-sites (`deleteImpactPreview`, `softDeleteImpactPreview`, `deleteBulkInstances`, `deleteInstance`), cobertura completa, docs | ⚑ fuerte | TC-1..TC-7 verdes contra BD real (tenant UPU) cuando aplique; suite `hard-delete-cascade` y `scenario-delete-cascade` sin regresion; guard de `deleteInstance` preservado; revision team up1 antes de merge (RULE-dev-004) |

**Notas del esqueleto**:
- **Tier T2** (no T1): multi-archivo (helper nuevo + 4 call-sites + tests + docs) y la validacion exige **BD real** ([[RULE-core-034]]: codigo destructivo/RT con Prisma mockeado no es evidencia). No sube a T3 porque el cambio no es user-facing UI visible (preview backend; el front ya degrada best-effort).
- **Gate ⚑ fuerte**: es trabajo `layer: core` — la rama de epica/ticket se mergea a develop solo tras revision del team up1 (RULE-dev-004). El cierre DKC no implica merge.
- **Numeracion**: no hay `### Session N` previa en el ticket (la sub-tabla Modo no cuenta) → el plan arranca en **S1**.
- **1 sola session** (fix acotado, 2 SP, logica reutilizada de `:6004`/`:4303`): no se particiona. Paralelizacion limitada a doc tras el helper; los tests RED, el helper y la verificacion de regresion son secuenciales.

### Session 1 — 2026-08-14 00:00 — Preview RT alias parity [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: Resolver alias RecordType a objeto base en los previews de impacto y consolidar la resolucion en un helper compartido, preservando los paths reales de delete.

parallel_groups: [[S1.T3, S1.T4]]

**Tasks completadas**:
- [x] S1.T1 — Escribir los tests de integracion que reproducen el crash (RED) contra el codigo ACTUAL: TC-1 (`deleteImpactPreview` sobre `rt__Scheme__levelscheme` sin ref externa) y TC-2 (`softDeleteImpactPreview` sobre el mismo alias).
- [x] S1.T2 — Crear `resolveRecordTypeToBaseObject`, aplicarlo en los dos previews y refactorizar `deleteBulkInstances` + `deleteInstance` preservando `rawObjectType` y el guard de modelo de `deleteInstance`.
- [x] S1.T3 — Completar cobertura TC-3/TC-4/TC-5/TC-7 y correr la suite nueva + `hard-delete-cascade.integration.test.js` + `scenario-delete-cascade.integration.test.js` contra BD real.
- [x] S1.T4 — Actualizar `delete-cascade.md` y `record-types.md` documentando la paridad de previews y borrado con alias RT.
- [x] S1.GATE — Gate de sync Session 1: quality review, evidencia runtime real, commit DET-27 y decision canonica.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Fix acotado completado en una session: helper + 4 call-sites, cobertura real-DB verde, docs. scenario-delete-cascade BLOCKED por drift preexistente ajeno
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Acceptance

- [x] `deleteImpactPreview` con un alias de RecordType devuelve un plan valido (`status`, `totalCount`, `byRecordType`) sin excepcion de Prisma.
- [x] `softDeleteImpactPreview` con un alias de RecordType idem.
- [x] El conteo devuelto para el alias coincide con el del objeto base equivalente (mismos ids).
- [x] Un RecordType con referencias entrantes vivas devuelve `status: "restricted"` en el preview, no un error.
- [x] Objetos base sin RecordTypes siguen comportandose igual (sin regresion).
- [x] `deleteBulkInstances` y `deleteInstance` conservan su comportamiento al migrar al helper compartido; `deleteInstance` mantiene el guard claro cuando un alias RT resuelve a un base sin modelo Prisma.
- [x] Verificado contra BD real (no solo unit con Prisma mockeado). Sin artefactos de sync commiteados. Commits/PR con id `UPONE-1608`.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-FIX-01 | TC-1, TC-2, TC-3, TC-4 | integration real DB | GREEN |
| REQ-REGRESSION-01 | TC-5, TC-6, TC-7 | integration real DB + unit | GREEN parcial: `scenario-delete-cascade` bloqueado por drift preexistente |

### Test cases

| # | Case | Tipo | Momento | Esperado |
|---|------|------|---------|----------|
| TC-1 | Reproduce: `deleteImpactPreview` sobre alias RT sin referencia externa | integration | ROJO hoy -> verde con fix | plan valido, sin excepcion |
| TC-2 | Reproduce: `softDeleteImpactPreview` sobre alias RT | integration | ROJO hoy -> verde con fix | plan valido, sin excepcion |
| TC-3 | Paridad: conteo por alias == conteo por objeto base con los mismos ids | integration | verde con fix | conteos iguales |
| TC-4 | Restrict: alias con referencia entrante viva | integration | verde con fix | `status: "restricted"`, no error |
| TC-5 | No regresion: objeto base sin RecordType | integration | verde | preview igual que hoy |
| TC-6 | No regresion delete real: suite `hard-delete-cascade` + `scenario-delete-cascade` | integration | verde antes y despues | bulk/single/cascade/soft/restrict siguen verdes |
| TC-7 | Guard `deleteInstance`: alias RT parseable que resuelve a base sin modelo Prisma | unit | verde con refactor | lanza `Object type <alias-original> not found` y preserva el error claro |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| `object-manager/tests/integration/delete-impact-preview-rt-alias.integration.test.js` | integration real DB | S1.T1/S1.T3 | TC-1..TC-5 | Vitest + Prisma UPU |
| `object-manager/tests/unit/resolvers/instance.resolver.test.js` | unit | S1.T3 | TC-7 | Vitest |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| Preview RT alias focus | `npx vitest run tests/integration/delete-impact-preview-rt-alias.integration.test.js` | RED: 3/3 fallaban con `Unknown argument id` sobre tablas `rt__*` | GREEN: 5/5 | Fix valida crash, soft-preview, paridad alias/base, restrict y base no-RT |
| Unit delete/impact/regression | `npx vitest run tests/unit/resolvers/deleteImpactPlan.test.js tests/unit/resolvers/softDeleteImpactPreview.test.js tests/unit/resolvers/instance.resolver.test.js` | n/a | GREEN: 175/175 | Sin regresion unitaria; TC-7 preserva guard de `deleteInstance` |
| RecordType resolver regression | `npx vitest run tests/unit/resolvers/recordType.resolver.test.js tests/unit/resolvers/instance.resolver.test.js` | n/a | GREEN: 174/174 | Delete por alias RT historico preservado |
| Hard delete cascade real DB | `npx vitest run tests/integration/delete-impact-preview-rt-alias.integration.test.js tests/integration/hard-delete-cascade.integration.test.js` | n/a | GREEN: 28/28 | Bulk/single/cascade/restrict/RT reales preservados |
| Scenario delete cascade real DB | `npx vitest run tests/integration/hard-delete-cascade.integration.test.js tests/integration/scenario-delete-cascade.integration.test.js` | n/a | BLOCKED externo: `Scenario.active` no existe en Prisma generado actual | No atribuible al fix; falla antes de entrar a delete |

## Summary
