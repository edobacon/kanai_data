---
id: TICKET-040
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1211
module: object-manager
autopilot: autonomous
---

# HU-5 | Query getVersionChain (Ladrillo 3)

## Request

> Contenido literal del ticket Jira [UPONE-1211](https://u-planner.atlassian.net/browse/UPONE-1211) (Historia, parent epic UPONE-1206).

### Descripción

Query genérica `getVersionChain(objectType, instanceId)` que retorna el linaje completo de versiones.

### Criterios de aceptación

* Retorna instances ordenadas por `version` ascendente (Int); flags `isLatest`/`versionNumber`.
* RBAC respetado; sin `linkageField` → `OBJECT_NOT_VERSIONABLE`.

### Dependencias

HU-4 (TICKET-038).

### Cambio vs actual

Ninguno de fondo.

## Contexto operativo del plan SP3

### P2.6 — HU-5 · Query getVersionChain (Fase 2) · [dominio-CD/versionamiento] · `P1`

- **Meta**: implement · ~2 SP · certeza confirmado · rollback git revert (query nueva) · riesgo bajo
- **Contexto**: para mostrar el historial de versiones. Query generica que sigue la cadena por `linkageField`.
- **Que se realiza**: `getVersionChain(objectType, instanceId): [Instance!]!`; ordena por `version` ascendente (Int); flags computed `isLatest`/`versionNumber`; RBAC respetado; sin `linkageField` → `OBJECT_NOT_VERSIONABLE`.
- **Depende de**: HU-4 (TICKET-038 — bloque `versioning` declarado y persistido).
- **Investigar**: nada.
- **Prueba**: `unit` linaje ordenado, `isLatest` correcto, RBAC, no-versionable rechazado.

## Material internalizado — HU detallada

### HU-5 · Query getVersionChain

**Sprint:** SP3 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** una query `getVersionChain(objectType, instanceId)` que retorne el linaje completo
**Para** mostrar el historial de versiones.

**Criterios de aceptacion:**

- [x] `getVersionChain(objectType: String!, instanceId: ID!): [Instance!]!`. (entregado como `[VersionChainItem!]!` — DEC-LOCAL-01)
- [x] Lee `versioning.linkageField`. Sin el → `OBJECT_NOT_VERSIONABLE`.
- [x] Retorna instances ordenadas por **`version` ascendente** (Int post-IMP-1).
- [x] Cada instance con `isLatest: Boolean` y `versionNumber: Int`.
- [x] Orden canonico por `version` Int (`increment`, unica strategy en SP3). (Cuando se habilite `user-provided` + String en SP4: ordenar por linaje `linkageField`, `createdAt` solo tiebreaker.)
- [x] RBAC respetado. (withObjectAuth('view') + getBusinessContextFilter)
- [x] Tests: linaje en orden, isLatest correcto, RBAC, no versionable rechazado. (10 unit verdes)

**Dependencias:** HU-4.

> Nota v5: el ordering usa el linaje (`linkageField`), no `createdAt`, para evitar orden incoherente cuando un draft viejo se retoma. `createdAt` queda como tiebreaker.

## Material internalizado — Decisiones de diseno

### Ladrillo 3 (diseno §7.3) — Query `getVersionChain`

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **Si.** Query generica nueva. |
| Firma | `getVersionChain(objectType: String!, instanceId: ID!): [Instance!]!` |
| Comportamiento | Lee `versioning.linkageField`. Sigue la cadena en ambas direcciones. Ordena por `version` (Int) ascendente. Flags computed `isLatest`, `versionNumber`. RBAC respetado. |

## Material internalizado — Shape canonico

### Firma GraphQL

```graphql
type Query {
  getVersionChain(
    objectType: String!,
    instanceId: ID!
  ): [Instance!]!
}

type Instance {
  # ... campos existentes
  isLatest: Boolean
  versionNumber: Int
}
```

### Comportamiento (pseudo-codigo)

```js
async function getVersionChain(objectType, instanceId, context) {
  const objectDef = await prisma.core_ObjectDefinition.findUnique({ where: { name: objectType } });
  if (!objectDef.versioningConfig?.versioning?.linkageField) {
    throw new Error('OBJECT_NOT_VERSIONABLE');
  }
  const { linkageField, versionField } = objectDef.versioningConfig.versioning;

  // Construir cadena: arrancar del instanceId, seguir hacia atras (previousVersionId) y hacia adelante (FK reflexivo)
  // Retornar TODAS las versiones ordenadas por versionField ascendente
  const chain = await prisma[objectType].findMany({
    where: { /* misma raiz: walk recursivo o query CTE */ },
    orderBy: { [versionField]: 'asc' }
  });

  // RBAC: filtrar las que el user puede ver
  const visible = await applyRBAC(chain, context, objectType);

  // Computed flags
  const latest = visible[visible.length - 1];
  return visible.map((v, i) => ({
    ...v,
    isLatest: v.id === latest.id,
    versionNumber: i + 1
  }));
}
```

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | single (query nueva + SDL) |
| Modulo principal | object-manager |
| Modulos afectados | object-manager (query + SDL) |
| Layer | core |

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
| H1 | Walk recursivo de un linaje pequeño (≤10 versiones) no requiere optimizacion especial (CTE) en SP3 | ✓ confirmada (asumida) | Activity tipica tiene 1-5 versiones; query simple suficiente |
| H2 | RBAC se aplica con el patron existente (`withObjectAuth` + filtros post-fetch) | ✓ confirmada | Patron canonico del project |

### Context found

- **Rules del modulo**: RULE-dev-004 (core).
- **Bugs abiertos**: ninguno.
- **Specs relacionados DKC**: TICKET-038 (HU-4 config versioning).
- **Docs relevantes del repo**:
  - `object-manager/src/graphql/typeDefs/static.js` (SDL — agregar query)
  - `object-manager/src/graphql/resolvers/` (resolver de query nuevo)
- **Warnings**:
  - **Branch core**: `UPONE-1206`.
  - **Depende de HU-4**: sin la config persistida, esta query no puede leer el `linkageField`.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU con bloque `versioning` activo (post-TICKET-038 + TICKET-043) |
| Services | object-manager (4000) |

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-06-02T10:10:51-0400 | false → super | dev trigger "super autopilot" en `/dkc up1 040 continue super autopilot` | proximo gate (teach-intake) |

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | HU-5 — agregar query `getVersionChain` (SDL + resolver) + computed flags `isLatest`/`versionNumber` | execute | T2 | SDL + resolver + tests unit | auto | tests verdes |
| S2 | HU-5 — RBAC + error `OBJECT_NOT_VERSIONABLE` + tests | execute | T2 | RBAC + tests | ⚑ fuerte | RBAC respetado; objeto sin config rechazado |
| S3 | Cierre — commits + teach-close | execute | T1 | review + commit DET-27 | auto | tests verdes |

### Session 1 — 2026-06-02 — SDL + resolver getVersionChain + computed flags [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Agregar `type VersionChainItem` y la query `getVersionChain` al SDL estatico, implementar el resolver (read config, walk linaje, orden por version asc, flags `isLatest`/`versionNumber`) y unit tests de orden y flags.

**Tasks completadas**:
- [x] S1.T1 — Agregar `type VersionChainItem` y query `getVersionChain` al SDL (static.js)
- [x] S1.T2 — Implementar resolver `getVersionChain` en `instanceQuery` (config, walk, orden, flags)
- [x] S1.T3 — Unit tests: linaje ordenado, isLatest, versionNumber, arranque intermedio, guard de ciclo
- [x] S1.GATE — Gate de sync Session 1 (tier T2)

**Validacion del tier**: T2 — `npx vitest run tests/unit/resolvers/` → 16 files / 485 tests passed (incluye 5 nuevos de get-version-chain.test.js). Sin regresion.

**Reviewer**: aislado (sub-agente sonnet, contexto limpio, read-only)
**Tier de revision**: standard (T2)
**Resultado global**: pass

#### Quality review (DET-23)

| # | Dimension | Estado | Nota |
|---|-----------|--------|------|
| 1 | Calidad de codigo | pass | resolver ~84 lineas, dentro de limite; guard defensivo de businessFilter |
| 2 | Lint/estilo | pass | patron modelName PascalCase→camelCase consistente con createInstance |
| 3 | Tipado | n/a | JS puro, sin `any` |
| 4 | Testing | pass | 5 TC con assertions de valores concretos (orden, flags, walk, ciclo, vacio) |
| 5 | Escalabilidad | pass | walk O(n) aceptable para linajes ≤10 (H1 / DEC-LOCAL-02) |
| 6 | Mantenibilidad | pass | comentarios ES / codigo EN; helper de modelName candidato a backlog (B1) |
| 7 | Claridad | pass | secciones 1-5 alineadas con spec; coercion idValue correcta |
| 8 | a11y | n/a | backend |
| 9 | Storybook | n/a | backend |
| 10 | Error handling | pass | OBJECT_NOT_VERSIONABLE + not-found + `!start` → [] (DEC-LOCAL-05) |

> Reviewer recommendation: **approve**. Warn revisado: `data: rest` excluye `id` del payload `data` — verificado que es **intencional y consistente con `getInstance`** (sibling canonico: `{ id, data: restOfData }`, id en raiz, data sin id; InstanceResult convention). NO se cambia. Warns menores diferidos: mock de `getBusinessContextFilter` a `Promise.resolve({})` y test de linaje de 1 nodo → S2.T3; extraccion de helper modelName → Backlog B1.

**Commit DET-27**: `ea3c54f` (object-manager) (ver tabla ## Commits)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-06-02 — RBAC + error OBJECT_NOT_VERSIONABLE + tests [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Aplicar `withObjectAuth('view')` + `getBusinessContextFilter` (recorte por fila), asegurar el rechazo `OBJECT_NOT_VERSIONABLE` para objetos sin config, y tests de RBAC + rechazo.

**Tasks completadas**:
- [x] S2.T1 — Aplicar withObjectAuth + getBusinessContextFilter sobre la query del linaje
- [x] S2.T2 — Asegurar rechazo OBJECT_NOT_VERSIONABLE cuando versioning es null
- [x] S2.T3 — Tests: RBAC filter aplicado, gate por tipo, objeto no versionable rechazado
- [x] S2.GATE — Gate de sync Session 2 (tier T2, ⚑ fuerte)

**Validacion del tier**: T2 — `npx vitest run tests/unit/resolvers/` → 16 files / 490 tests passed (10 de get-version-chain). Sin regresion.

**Reviewer**: aislado (sub-agente sonnet, contexto limpio, read-only)
**Tier de revision**: standard (T2, gate ⚑ fuerte)
**Resultado global**: pass

#### Quality review (DET-23)

| # | Dimension | Estado | Nota |
|---|-----------|--------|------|
| 1 | Calidad de codigo | pass | guard de rechazo antes del accesor dinamico |
| 2 | Lint/estilo | pass | consistente con el modulo |
| 3 | Tipado | n/a | JS puro |
| 4 | Testing | pass | REQ-02 (rechazo + no-data-touch) y REQ-06 (filter inyectado, recorte, isLatest visible) con assertions concretas; anti-tautologia reforzada (toHaveBeenLastCalledWith del where.AND) |
| 5 | Escalabilidad | pass | sin cambios sobre S1 |
| 6 | Mantenibilidad | pass | — |
| 7 | Claridad | pass | — |
| 8 | a11y | n/a | backend |
| 9 | Storybook | n/a | backend |
| 10 | Error handling | pass | OBJECT_NOT_VERSIONABLE verificado pre-datos |

> Reviewer recommendation: **approve** (gate ⚑ fuerte: RBAC respetado + no-versionable rechazado). WARN-1 (test RBAC tautologico) **resuelto** en S2.T3: assertion `toHaveBeenLastCalledWith` sobre `where.AND` que prueba el contrato del resolver, no el override del test. WARN-2 (gate-por-tipo sin caso propio): **acknowledged** — el comportamiento de `withObjectAuth('view')` es responsabilidad del modulo `withAuth.js` (tests propios); el mock pass-through es el patron canonico para unit tests del resolver. No bloqueante.

**Commit DET-27**: `6be0789` (object-manager) (ver tabla ## Commits)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-02 — Cierre: quality review + commits DET-27 + teach-close [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (unit area)

**Objetivo**: Quality review (10 dimensiones tier light), commits granulares DET-27 (submodulo object-manager + repo dkc) y teach-close.

**Tasks completadas**:
- [x] S3.T1 — Quality review + commits granulares DET-27
- [x] S3.GATE — Gate de cierre Session 3 (tier T1) + teach-close

**Validacion del tier**: T1 — `npx vitest run tests/unit/resolvers/` → 490/490 verde (area HU-5). Suite `tests/unit/` completa: 3 archivos preexistentes fallan fuera de scope (L4), no relacionados con getVersionChain.

**Reviewer**: inline light (tier T1, cierre; las 2 sessions de codigo ya tuvieron reviewer aislado — proporcionalidad HOR-079)
**Tier de revision**: light (T1)
**Resultado global**: pass

#### Quality review (DET-23)

| # | Dimension | Estado | Nota |
|---|-----------|--------|------|
| 1 | Calidad de codigo | pass | sin cambios de codigo en S3 (cierre); S1/S2 ya revisadas por reviewer aislado |
| 7 | Claridad | pass | teach-close generado y validado; learns L1-L4 registrados; acceptance checkpoints verificados |

> Cierre del ticket: 6 REQs entregados, 8 TC verdes, teach-intake + teach-close validados. teach-close (DET-22) generado: `tickets/TICKET-040.teach/teach-close.html`.

**Commit DET-27**: n/a — session de cierre, sin codigo de producto nuevo (records dkc en commit de cierre del ticket)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Commits

| Hash | Fecha | Header | Tasks | REQs |
|------|-------|--------|-------|------|
| ea3c54f | 2026-06-02 | UPONE-1211-S1 feat(versioning): getVersionChain query (SDL + resolver + unit tests) | S1.T1, S1.T2, S1.T3 | REQ-01, REQ-03, REQ-04, REQ-05 |
| 6be0789 | 2026-06-02 | UPONE-1211-S2 test(versioning): getVersionChain RBAC + rechazo OBJECT_NOT_VERSIONABLE | S2.T1, S2.T2, S2.T3 | REQ-02, REQ-06 |

> Repo: object-manager (submodulo), rama `UPONE-1206`. Modo: convencion del repo (`UPONE-{ticket}-S{N}`). Push gated por revision team up1 (NO en cierre DKC).

## Test cases

| TC | source_ref | Descripcion | Actual | Evidence | Status | Session | Cambios gatillados |
|----|-----------|-------------|--------|----------|--------|---------|--------------------|
| TC-01 | REQ-04 | Linaje ordenado por `version` asc (no por `createdAt`) | [1,2,3] por version | get-version-chain.test.js TC REQ-04 verde | pass | S1 | — |
| TC-02 | REQ-05 | `isLatest` en la ultima + `versionNumber` 1-based secuencial | [false,false,true] / [1,2,3] | get-version-chain.test.js TC REQ-05 verde | pass | S1 | — |
| TC-03 | REQ-03 | Arranque desde version intermedia reconstruye todo el linaje | [1,2,3] | get-version-chain.test.js TC REQ-03 verde | pass | S1 | — |
| TC-04 | REQ-03 | Ciclo en FK reflexivo termina (guard de Set) | [1,2] sin loop | get-version-chain.test.js TC REQ-03 edge verde | pass | S1 | — |
| TC-05 | REQ-02/DEC-LOCAL-05 | Instancia inexistente -> linaje vacio | [] | get-version-chain.test.js TC DEC-LOCAL-05 verde | pass | S1 | — |
| TC-06 | REQ-02 | Objeto sin `versioning` -> `OBJECT_NOT_VERSIONABLE` (y no consulta datos) | throw + findUnique/findMany no llamados | get-version-chain.test.js S2 TC REQ-02 (x2) verde | pass | S2 | — |
| TC-07 | REQ-06 | Filtro de contexto de negocio inyectado al `where` (AND) recorta filas; filtro vacio no recorta | [1,2] con filtro lte:2 (isLatest→v2); [1,2,3] sin filtro | get-version-chain.test.js S2 TC REQ-06 (x2) verde | pass | S2 | — |
| TC-08 | REQ-05 | Linaje de un solo nodo: isLatest true, versionNumber 1 | {id:1,isLatest:true,versionNumber:1} | get-version-chain.test.js verde | pass | S2 | — |

> Affects UI: no (query backend; sin componente visual en este ticket).

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|------------|--------------|-----------|
| B1 | Extraer helper privado para resolver el accesor dinamico de Prisma (PascalCase→camelCase fallback) | nuevo | descubierto en S1 (review DET-23) | El patron se repite en `getInstance`, `createInstance` y `getVersionChain` de `instance.resolver.js` | Crear `resolveModelAccessor(prisma, objectType)` que retorne `{ modelName, model }` o lance `Object type X not found`; reemplazar los 3 call-sites; correr `vitest run tests/unit/resolvers/` | could |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El acceso dinamico a modelos Prisma en object-manager es inconsistente: `getInstance` (linea ~2053) minusculiza la inicial sin fallback, pero `createInstance` (linea ~2327) prueba PascalCase primero y cae a camelCase. El client real expone PascalCase (`prisma.Activity`). `getVersionChain` adopto el patron robusto de createInstance (try PascalCase → fallback camelCase). | developer | S1 | refined | BUG-core-002 |
| L2 | Tests que mockean el almacenamiento pueden volverse tautologicos: un override de `findMany` que aplica el recorte RBAC dentro del test no prueba que el RESOLVER construya el `where.AND`. Mitigacion: assertion directa sobre los args de la llamada real (`toHaveBeenLastCalledWith(where.AND ...)`) ademas de la assertion sobre el resultado. | reviewer | S2 | refined | RULE-core-025 |
| L3 | El gate-por-tipo de RBAC (`withObjectAuth('view')`) NO se testea en el unit del resolver (mock pass-through): su comportamiento es responsabilidad del modulo `withAuth.js`, que tiene tests propios. El unit del resolver cubre el recorte por fila (`getBusinessContextFilter`), no el gate por tipo. | reviewer | S2 | refined | RULE-core-025 |
| L4 | La suite `tests/unit/` completa de object-manager tiene 3 archivos con fallos PREEXISTENTES no relacionados con HU-5: `services/validation/evaluator.test.js`, `scripts/sync/SyncManager.test.js` (relacionado a los `schema.prisma` DEMO01-10 dirty en el working tree desde tickets previos) y `services/auth/rbacRecordType.integration.test.js`. Ninguno referencia getVersionChain. El area `tests/unit/resolvers/` (la tocada por HU-5) esta 490/490 verde. Reportados, no corregidos (fuera de scope, requiere aprobacion). | developer | S3 | discarded | consolidacion Fase D — no reusable/especifico del ticket |

## Teaching — Intake

**Status**: done
**Archivo**: `tickets/TICKET-040.teach/teach-intake.html` (v2 HTML, validado)
**Bloques**: tldr, callout (3), concept-card (5), code, flow, invariant, timeline, study-qa (4), tag. Cobertura 3 direcciones (bases/entorno/adelante) + 4 ejes intake.

## Teaching — Close

**Status**: done
**Archivo**: `tickets/TICKET-040.teach/teach-close.html` (v2 HTML, validado)
**Bloques**: tldr, callout (4, que se realizo), concept-card (hipotesis + lessons), comparison-table (decisiones), code, invariant, timeline (highlights por session), study-qa (4 preguntas). Cubre 5to eje (que se realizo) + evolucion de hipotesis + lessons.
