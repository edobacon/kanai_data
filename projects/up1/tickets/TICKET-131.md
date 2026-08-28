---
id: TICKET-131
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1608
module: object-manager
autopilot: manual
---

# Backend: la maquina de estados debe resolver el alias RecordType a la PK base (`getValidTransitions` + `previewBulkTransition`)

## Request

Los resolvers de la maquina de estados de ciclo de vida (`getValidTransitions` y `previewBulkTransition`, en `object-manager/src/graphql/resolvers/objectDefinition.resolver.js`) consultan el registro con `where: { id }`, asumiendo que todo modelo tiene columna `id`. Cuando el `objectName` es un alias de RecordType (`rt__<Rt>__<base>`, cuya PK real es la FK `<base>Id`), Prisma lanza `Unknown argument 'id'` (`INTERNAL_SERVER_ERROR`) y la vista no puede operar las transiciones.

Es la misma clase de defecto que UPONE-1608 caso A (previews de borrado): un alias de RecordType no resuelto a su PK base. El borrado real (UPONE-1479) y los previews (caso A, [[TICKET-129]]) ya lo resuelven; la maquina de estados quedo como isla sin ese tratamiento.

Caso B de la extension de alcance de UPONE-1608. Consume el helper `resolveRecordTypeToBaseObject` que entrega [[TICKET-129]] (de ahi `depends_on`).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (core, object-manager) |
| Modulo principal | object-manager |
| Modulos afectados | ninguno (comportamiento generico de la maquina de estados; el mod `curriculum-mapping` es solo el primer consumidor que lo destapa) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `getValidTransitions` lee el registro con `findUnique({ where: { id } })` sin distinguir RecordType; sobre un alias `rt__*__<base>` (PK `<base>Id`) Prisma rechaza el `where` | ✓ confirmada | `objectDefinition.resolver.js` `getValidTransitions` (~L645), lectura en ~L668 `findUnique({ where: { id: coerceId(recordId) } })`. Error real reportado: `Unknown argument 'id'. Available: competencynodeId, ...` sobre `rt_Matrix__competencynode.findUnique` (fuente: BUG-core-getvalidtransitions-rt-keying) |
| H2 | `previewBulkTransition` tiene el mismo defecto en la transicion masiva | ✓ confirmada | `objectDefinition.resolver.js` `previewBulkTransition` (~L726), lectura en ~L743 `findMany({ where: { id: { in: recordIds.map(coerceId) } } })` |
| H3 | El fix consistente es keyear por `<baseLower>Id` cuando el objeto es RT, reusando el parser que ya existe en el archivo, no un `startsWith('rt__')` | ✓ confirmada | En el mismo archivo ya existe `parseRecordTypeParentName(objectName)` (~L52) sin usar en estos dos resolvers; `instance.resolver.js` ya aplica el patron (`rt__(.+)__(.+)$` L1575-1577, lectura por `[baseObjectLower]Id` L4551) |

### Context found

- **Fuente del bug**: `kb/sp8/BUG-core-getvalidtransitions-rt-keying.md`. Reportado por el dev armando la vista de edicion de matrices de competencia (`default_CompetencyNode_edit`, `rt__Matrix__competencynode`, mod `curriculum-mapping`, contexto UPONE-1537).
- **Trade-off observado**: si el layout apunta al RT, la metadata y el `status` cargan bien pero la maquina de estados crashea; si apunta al objeto base, no crashea pero se pierden metadata y `status` (viven en el RT, no en el base). O sea, no hay workaround por el base: la data gobernada vive en la proyeccion.
- **Patron a reusar (ya en core)**: `instance.resolver.js` deteccion `rt__(.+)__(.+)$` (L1575-1577), comentario "RecordType models use `{baseObject}Id` as PK instead of `id`" (L2153), lectura por PK RT (L4551). El helper compartido `resolveRecordTypeToBaseObject` que extrae [[TICKET-129]] es el punto canonico a consumir aca.
- **Regla canonica**: [[RULE-core-043]] (el nombre de un RecordType es un alias de presentacion; resolver a base antes de aplicar la politica). Nacio de UPONE-1479.
- **Nota de correctitud (del BUG)**: la PK de estos RT es string tipo cuid; `coerceId` ya lo respeta (`Number(cuid)` = NaN devuelve el string), asi sirve para RT (string) y base (id numerico). El `include` de la extension `ext__<client>__<rtModel>` ya funciona; el unico punto roto es el `where`.
- **Propagacion (DET-16)**: este ticket cierra los dos resolvers de la maquina de estados. Queda como pregunta abierta si hay otros `findUnique/findMany({ where: { id } })` en resolvers que puedan recibir un alias `rt__` (barrido transversal, fuera de este scope acotado; anotar si aparece).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | (a crear) `UPONE-1608-om-statemachine-rt-keying` |
| Base branch | develop |
| DB state | tenant real (BD real): la lectura depende del shape real de la proyeccion RT; unit con Prisma mockeado da falso verde |
| Services | object-manager |
| Test data | RecordType con campo gobernado por maquina de estados (ej. `rt__Matrix__competencynode` con `status` y `transitions`, tenant UPU, mod `curriculum-mapping`) |

### Reproduction steps

1. Tenant UPU, mod `curriculum-mapping` activo.
2. Abrir el detalle/edicion de una matriz de competencias (layout sobre `rt__Matrix__competencynode`).
3. La UI pide las transiciones validas del `status` actual: `getValidTransitions` revienta con `Unknown argument 'id'` sobre `rt_Matrix__competencynode.findUnique`.
4. Esperado: `getValidTransitions` devuelve las transiciones validas leyendo el registro por `competencynodeId`; `previewBulkTransition` idem para seleccion masiva.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

1 session prevista. El detalle final (tasks, gate criteria) lo completa `design-fix` al generar el spec `SPEC-object-manager-fix-statemachine-rt-keying`.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | RT-aware `where` en `getValidTransitions` y `previewBulkTransition` (consume `resolveRecordTypeToBaseObject` de TICKET-129), cobertura de integracion real-DB y doc | 1 | T2 | ~4 (fix 2 resolvers, integration test real-DB, doc record-types.md) | ⚑ fuerte | AC verdes contra BD real (tenant UPU); sin regresion en objetos base; revision team up1 antes de merge (RULE-dev-004) |

**Notas**:
- Depende de [[TICKET-129]]: consume el helper compartido. Si 129 aun no expone el helper, S1 lo referencia por su firma acordada y sincroniza al mergear.
- Tier T2: multi-resolver + validacion en BD real ([[RULE-core-034]]). No sube a T3 (backend, no UI visible directa).
- `layer: core`: merge a develop solo tras revision del team up1 (RULE-dev-004). El cierre DKC no implica merge.

## Acceptance

- [ ] `getValidTransitions` sobre un alias de RecordType devuelve las transiciones validas del `status` actual sin excepcion de Prisma.
- [ ] `previewBulkTransition` sobre una seleccion de aliases de RecordType devuelve el preview de transicion masiva sin excepcion.
- [ ] El resultado por alias coincide con el esperado leyendo el registro real (mismo `status`, mismas transiciones que declara el RT).
- [ ] Objetos base (con columna `id`) siguen comportandose igual (sin regresion).
- [ ] Verificado contra BD real (no solo unit con Prisma mockeado). Sin artefactos de sync commiteados. Commits/PR con id `UPONE-1608`.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|

### Test cases

| # | Case | Tipo | Momento | Esperado |
|---|------|------|---------|----------|
| TC-1 | Reproduce: `getValidTransitions` sobre alias RT (`rt__Matrix__competencynode`) | integration | ROJO hoy -> verde con fix | transiciones validas, sin excepcion |
| TC-2 | Reproduce: `previewBulkTransition` sobre seleccion de aliases RT | integration | ROJO hoy -> verde con fix | preview valido, sin excepcion |
| TC-3 | Paridad: transiciones devueltas == las declaradas por el RT para ese `status` | integration | verde con fix | conjunto igual |
| TC-4 | No regresion: objeto base con `id` numerico | integration | verde | igual que hoy |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|

## Resolution — superseded por UPONE-1566 (no ejecutado)

Durante el intake (design-fix, verificacion del diagnostico contra codigo real, DET-4/DET-11) se descubrio que el bug ya estaba corregido:

- **Codigo actual RT-aware**: `getValidTransitions` (`objectDefinition.resolver.js:859`) y `previewBulkTransition` (`:923`) ya NO leen con `findUnique({ where: { id } })`; leen via `loadTransitionRecords` (`:280-315`), que para un alias `rt__<Rt>__<base>` consulta la satelite por la relacion (`where: { [baseObjectLower]: { id: { in: ids } } }`), incluye la base y devuelve registros aplanados con `id: base.id`. No hay `where:{id}` sobre la proyeccion.
- **UPONE-1566** (estado Listo, reportado por Francisco Navarro) es exactamente este bug (mismos resolvers, mismo `rt__Matrix__competencynode`, mismo `Unknown argument 'id'`). Fix `33b54103` (Reland UPONE-1566) mergeado a develop el 2026-08-10, ancestro de HEAD.
- **El BUG doc del KB nacio stale**: `kb/sp8/BUG-core-getvalidtransitions-rt-keying.md` se escribio el 2026-08-11, un dia despues del merge del fix. Reflejaba el codigo previo.
- **Tests existentes VERDE**: `tests/unit/resolvers/objectDefinition.transitions.rt.test.js` 30/30 pass.

Accion: DET-32 drop. UPONE-1608 revertido a solo el Caso A (previews de borrado, [[TICKET-129]], 2 SP). El teach-intake generado queda como registro del analisis. No se genero spec ni se ejecuto nada.

## Summary
