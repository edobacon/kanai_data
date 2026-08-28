---
id: SPEC-object-manager-hu5-getversionchain
project: up1
ticket: TICKET-040
status: done
---

# SPEC — HU-5: Query `getVersionChain` (Ladrillo 3 del versionamiento)

# SPEC — HU-5: Query `getVersionChain` (Ladrillo 3 del versionamiento)

## Executive summary — lo que estas aprobando

> *Diseñada para revision rapida. El detalle tecnico vive en Requirements y Tasks. Si te basta el Executive summary para decidir, ese es el objetivo.*

**Que se quiere**: una query GraphQL nueva, de **solo lectura**, `getVersionChain(objectType, instanceId): [VersionChainItem!]!`, en el backend `object-manager`. Dada cualquier instancia de una cadena de versiones, reconstruye el **linaje completo** siguiendo el FK reflexivo declarado en `versioningConfig.versioning.linkageField` (en Activity: `previousVersionId`), lo devuelve ordenado por `versionField` (Int) ascendente, y marca por instancia `isLatest` y `versionNumber`. Respeta RBAC y rechaza objetos no versionables con `OBJECT_NOT_VERSIONABLE`. Es la pieza de **lectura** del versionamiento: HU-3/HU-4 dejaron escribiendo y declarando versiones; HU-5 las expone para que la UI muestre el historial.

**Decisiones criticas que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| A | Tipo de retorno **nuevo** `VersionChainItem { id, data: JSON, isLatest, versionNumber }` en vez de reusar `InstanceResult` o un inexistente `type Instance` (DEC-LOCAL-01) | No existe `type Instance` generico en el SDL; el patron del proyecto para instancias genericas es `data: JSON`. Crear un tipo dedicado evita contaminar `InstanceResult` (compartido por otras queries) con flags que solo aplican al linaje. |
| B | Reconstruccion del linaje por **walk en memoria** (atras por `linkageField` hasta la raiz + adelante por hijos), NO CTE recursivo (DEC-LOCAL-02) | H1 del intake: un linaje tipico tiene 1-5 versiones (≤10). Un walk simple es suficiente y legible en SP3; el CTE recursivo es optimizacion prematura. |
| C | RBAC a nivel fila via `getBusinessContextFilter` aplicado sobre una query unica `id IN (linaje)` + `withObjectAuth('view')` a nivel objeto (DEC-LOCAL-03) | "RBAC respetado" exige las dos capas: `withObjectAuth` ya es el patron canonico de gate por tipo; el filtro de contexto de negocio (como en `listInstances`) recorta filas que el user no puede ver. `getInstance` no lo aplica — getVersionChain queda en el medio y debe elegir; elige el de `listInstances` por devolver una coleccion. |
| D | El **happy-path contra DB real** (linaje de un objeto realmente versionable) queda **gated por HU-8** (TICKET-043); HU-5 valida con unit tests sobre Prisma mockeado + test de rechazo (DEC-LOCAL-04) | Hoy ningun objeto declara `metadata.versioning` en su JSON (HU-4 DEC-LOCAL-04 lo difirio), asi que la DB no tiene objetos versionables. La logica se prueba 100% con mocks; la verificacion e2e real es trabajo de HU-8. |

**Riesgos principales y como los mitigamos**:
- *Ciclo en el FK reflexivo* (data corrupta encadenando A→B→A) colgaria el walk → guard de `Set` de ids visitados que corta al re-visitar.
- *`isLatest`/`versionNumber` se computan sobre el set ya filtrado por RBAC* → puede diferir del linaje fisico si el user no ve la cabeza real; se documenta como semantica intencional (flags relativos a lo visible), alineado al pseudo-codigo del diseño.
- *Branch de core en `develop`* → DET-30 obliga crear `UPONE-1206` antes de codear (S1.T0 implicito en setup del execute).

**Que NO se hace**:
- NO se declara `metadata.versioning` en `activity.json` ni se corre seed (eso es HU-8).
- NO se implementa ordering por linaje ni `versionStrategy: user-provided` ni `version` String (SP4).
- NO se agrega paginacion ni cache (linajes chicos, H1).
- NO se modifica `getInstance`/`listInstances` existentes.

**Tamaño estimado**: 1 SP · 3 sessions livianas. La mas riesgosa es **S2** (RBAC + rechazo) — gate fuerte.

**Como vas a saber que funciona**: unit tests verdes que (a) devuelven el linaje ordenado por version ascendente, (b) marcan `isLatest` en la ultima y `versionNumber` secuencial, (c) rechazan un objeto sin `versioning` con `OBJECT_NOT_VERSIONABLE`, (d) aplican el filtro de contexto de negocio cuando el rol lo define.

## Purpose

Exponer el linaje de versiones de una instancia versionable como una query GraphQL generica de solo lectura. **Actor**: dev de mod / frontend que necesita renderizar el historial de versiones de un objeto. **Valor**: cierra el ciclo de lectura del versionamiento SP3 (Ladrillo 3) — sin esta query los datos de versionado que HU-3/HU-4 producen no son consultables como cadena.

## Requirements

### REQ-01: Query `getVersionChain` en el SDL

> **Que cambia**: el schema GraphQL expone una query nueva `getVersionChain(objectType, instanceId)` que devuelve una lista de items de version con flags. Antes no habia forma de pedir "todas las versiones de esto".
> **Por que**: la UI de historial de versiones necesita un endpoint unico que devuelva la cadena completa, no N llamadas a `getInstance`.

El sistema MUST exponer en `object-manager/src/graphql/typeDefs/static.js` la query `getVersionChain(objectType: String!, instanceId: ID!): [VersionChainItem!]!` y el tipo `VersionChainItem { id: ID!, data: JSON, isLatest: Boolean!, versionNumber: Int! }`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: SDL valida
- **GIVEN** el SDL estatico con el nuevo type y query
- **WHEN** se mergea el schema (`typeDefsIndex.js`) y arranca el server
- **THEN** el schema compila sin error y `getVersionChain` aparece en introspeccion

</details>

**Acceptance**: introspeccion del schema muestra `getVersionChain` con la firma exacta.

### REQ-02: Rechazo de objeto no versionable

> **Que cambia**: si pides el linaje de un tipo que no declara versionamiento, recibes un error claro `OBJECT_NOT_VERSIONABLE` en vez de una lista vacia ambigua o un crash.
> **Por que**: distingue "no versiona" (config ausente) de "versiona pero sin historial" (lista vacia legitima).

El sistema MUST leer `core_ObjectDefinition.versioningConfig?.versioning` para el `objectType` y, si es `null`/ausente, MUST lanzar `throw new Error('OBJECT_NOT_VERSIONABLE')` antes de tocar datos.

<details><summary>Scenarios de validacion</summary>

#### Scenario: objeto sin config
- **GIVEN** un `objectType` cuyo `versioningConfig.versioning` es null
- **WHEN** se invoca `getVersionChain`
- **THEN** lanza `OBJECT_NOT_VERSIONABLE` y no ejecuta queries de datos

#### Scenario: objeto versionable
- **GIVEN** un `objectType` con `versioning: { linkageField, versionField }` valido
- **WHEN** se invoca `getVersionChain`
- **THEN** procede a reconstruir el linaje (no lanza)

</details>

**Acceptance**: query sobre tipo no versionable retorna error `OBJECT_NOT_VERSIONABLE`.

### REQ-03: Reconstruccion del linaje completo

> **Que cambia**: desde cualquier version de la cadena (no solo la raiz o la cabeza) obtienes TODAS las versiones del linaje.
> **Por que**: el consumidor puede tener el id de una version intermedia; debe poder ver la cadena entera sin saber cual es la raiz.

El sistema MUST reconstruir el linaje siguiendo `linkageField` hacia atras (hasta `linkageField === null`, la raiz) y hacia adelante (instancias cuyo `linkageField` apunta a un id ya en el linaje), partiendo de `instanceId`. MUST cortar si detecta un ciclo (id ya visitado).

<details><summary>Scenarios de validacion</summary>

#### Scenario: arranque desde version intermedia
- **GIVEN** linaje v1←v2←v3 y `instanceId = v2.id`
- **WHEN** se invoca `getVersionChain`
- **THEN** el resultado contiene v1, v2 y v3

#### Scenario: ciclo en los datos (edge)
- **GIVEN** datos corruptos donde v1.linkageField = v2.id y v2.linkageField = v1.id
- **WHEN** se reconstruye el linaje
- **THEN** el walk termina (no loop infinito) gracias al guard de ids visitados

</details>

**Acceptance**: arrancando desde cualquier nodo del linaje se obtienen todos los nodos.

### REQ-04: Orden canonico por `versionField` Int ascendente

> **Que cambia**: la lista vuelve siempre ordenada de la version mas vieja a la mas nueva por el numero de version, no por fecha de creacion.
> **Por que**: `createdAt` es incoherente si un draft viejo se retoma; el numero de version es el orden real (invariante del intake).

El sistema MUST ordenar el linaje por `versionField` (Int) ascendente. `createdAt` MAY usarse solo como tiebreaker.

<details><summary>Scenarios de validacion</summary>

#### Scenario: orden por version, no por createdAt
- **GIVEN** v3 con `createdAt` anterior a v2 (draft retomado) pero `version` 3 > 2
- **WHEN** se invoca `getVersionChain`
- **THEN** el orden es [v1, v2, v3] (por `version`), no por `createdAt`

</details>

**Acceptance**: el array resultante esta ordenado por `version` ascendente.

### REQ-05: Flags computed `isLatest` y `versionNumber`

> **Que cambia**: cada item del linaje trae `isLatest` (si es la cabeza visible) y `versionNumber` (su posicion 1-based en el linaje visible).
> **Por que**: la UI marca "version actual" y numera las versiones sin recalcular en el cliente.

El sistema MUST computar, sobre el set ordenado y filtrado por RBAC: `isLatest = true` para el item con mayor `versionField` (el ultimo del array ordenado) y `false` para el resto; `versionNumber = indice + 1` (posicion en el linaje visible).

<details><summary>Scenarios de validacion</summary>

#### Scenario: flags correctos
- **GIVEN** linaje visible [v1, v2, v3] ordenado
- **WHEN** se computan los flags
- **THEN** v3.isLatest = true, v1/v2.isLatest = false; versionNumber = 1,2,3 respectivamente

</details>

**Acceptance**: el ultimo item tiene `isLatest: true`, el resto `false`; `versionNumber` es secuencial 1-based.

### REQ-06: RBAC respetado

> **Que cambia**: solo ves las versiones del linaje que tu rol permite ver; si no tienes permiso de `view` sobre el tipo, la query es rechazada.
> **Por que**: el versionamiento no debe ser un bypass del control de acceso por fila/tipo.

El sistema MUST envolver el resolver en `withObjectAuth('view', ...)` (gate por tipo) y MUST aplicar `getBusinessContextFilter(user, objectType, prisma, selectedRole)` sobre la query del linaje (recorte por fila), igual que `listInstances`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: filtro de contexto de negocio aplicado
- **GIVEN** un rol con `businessContextFilter` no vacio que limita a ciertas filas
- **WHEN** se invoca `getVersionChain`
- **THEN** el `where` de la query del linaje incluye el filtro (`AND`) y solo devuelve filas visibles

#### Scenario: gate por tipo
- **GIVEN** un user sin permiso `view` sobre `objectType`
- **WHEN** se invoca `getVersionChain`
- **THEN** `withObjectAuth` rechaza antes de ejecutar el resolver

</details>

**Acceptance**: con un filtro de contexto activo, las filas no visibles no aparecen en el resultado.

## Resolvers

Esta HU agrega un resolver de Query custom al backend core (no a un mod). Se registra dentro de `instanceQuery` en `instance.resolver.js`, consistente con `getInstance`/`listInstances`.

| name | type | auth | capabilities | input | output | Notas |
|------|------|------|-------------|-------|--------|-------|
| getVersionChain | Query | withObjectAuth('view') | — (gate por objeto + business context filter) | objectType: String!, instanceId: ID! | [VersionChainItem!]! | Solo lectura; reconstruye linaje por linkageField |

### Resolver: getVersionChain

**Schema GraphQL** (en `static.js`, dentro del `type Query` monolitico + nuevo type):
```graphql
type VersionChainItem {
  id: ID!
  data: JSON
  isLatest: Boolean!
  versionNumber: Int!
}

type Query {
  # ... queries existentes
  getVersionChain(objectType: String!, instanceId: ID!): [VersionChainItem!]!
}
```

**Input:**
| field | type | required | description |
|-------|------|----------|-------------|
| objectType | String! | si | Nombre PascalCase del tipo de objeto (ej: Activity) |
| instanceId | ID! | si | Id de cualquier instancia del linaje (no necesariamente la raiz) |

**Output:**
| field | type | description |
|-------|------|-------------|
| id | ID! | Id de la instancia |
| data | JSON | Registro completo de la instancia (shape del modelo dinamico) |
| isLatest | Boolean! | true si es la cabeza del linaje visible (mayor version) |
| versionNumber | Int! | Posicion 1-based en el linaje visible ordenado |

**Logica de referencia** (pseudo-codigo de implementacion):
```js
getVersionChain: withObjectAuth('view', async (_, { objectType, instanceId }, ctx) => {
  const { prisma, user, selectedRole } = ctx;
  // 1. Config + rechazo
  const objDef = await prisma.core_ObjectDefinition.findUnique({
    where: { name: objectType }, select: { versioningConfig: true },
  });
  const versioning = objDef?.versioningConfig?.versioning ?? null;
  if (!versioning) throw new Error('OBJECT_NOT_VERSIONABLE');
  const { linkageField, versionField } = versioning;

  // 2. Accesor dinamico
  const modelName = objectType.charAt(0).toLowerCase() + objectType.slice(1);
  const model = prisma[modelName];
  if (!model || typeof model.findUnique !== 'function') {
    throw new Error(`Object type ${objectType} not found`);
  }

  // 3. Walk del linaje (atras + adelante) con guard de ciclo
  const start = await model.findUnique({ where: { id: instanceId } });
  if (!start) return []; // instancia inexistente/no visible -> linaje vacio (DEC-LOCAL-05)
  const ids = new Set([start.id]);
  let cur = start;
  while (cur && cur[linkageField]) {
    const prev = await model.findUnique({ where: { id: cur[linkageField] } });
    if (!prev || ids.has(prev.id)) break;
    ids.add(prev.id); cur = prev;
  }
  const queue = [...ids];
  while (queue.length) {
    const id = queue.shift();
    const children = await model.findMany({ where: { [linkageField]: id } });
    for (const c of children) if (!ids.has(c.id)) { ids.add(c.id); queue.push(c.id); }
  }

  // 4. RBAC fila + orden en una query
  const businessFilter = await getBusinessContextFilter(user, objectType, prisma, selectedRole);
  const where = { id: { in: [...ids] } };
  if (Object.keys(businessFilter).length > 0) where.AND = [businessFilter];
  const visible = await model.findMany({ where, orderBy: { [versionField]: 'asc' } });

  // 5. Flags
  const latest = visible[visible.length - 1];
  return visible.map((v, i) => ({
    id: v.id, data: v,
    isLatest: latest ? v.id === latest.id : false,
    versionNumber: i + 1,
  }));
});
```

## Tasks

### Session 1 — SDL + resolver + computed flags [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar `type VersionChainItem` y la query `getVersionChain` al SDL estatico | REQ-01 | developer | — | object-manager/src/graphql/typeDefs/static.js | server arranca + introspeccion muestra la query (manual) | git revert del hunk en static.js | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T2 | Implementar resolver `getVersionChain` en `instanceQuery`: read config, walk linaje, orden, flags | REQ-02, REQ-03, REQ-04, REQ-05 | developer | S1.T1 | object-manager/src/graphql/resolvers/instance.resolver.js | vitest unit (orden + flags) verde | git revert del bloque del resolver | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T3 | Unit tests: linaje ordenado por version asc, isLatest en la ultima, versionNumber secuencial, arranque desde nodo intermedio, guard de ciclo | REQ-03, REQ-04, REQ-05 | developer | S1.T2 | object-manager/tests/unit/resolvers/get-version-chain.test.js | vitest run del archivo verde (assertions con valores concretos) | borrar el archivo de test | DET-7, DET-1 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) | — | reviewer | S1.T3 | projects/up1/tickets/ticket-040.md | gate persistido + vitest --coverage del area verde | n/a | DET-20, DET-23 | done | 1 |

### Session 2 — RBAC + error OBJECT_NOT_VERSIONABLE + tests [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Aplicar `withObjectAuth('view')` + `getBusinessContextFilter` sobre la query del linaje (recorte por fila) | REQ-06 | developer | S1.GATE | object-manager/src/graphql/resolvers/instance.resolver.js | vitest unit (filtro inyectado en where) verde | revert del wrapper/filtro | DET-5, DET-8, DET-10, DET-11 | done | 2 |
| S2.T2 | Asegurar rechazo `OBJECT_NOT_VERSIONABLE` cuando `versioningConfig.versioning` es null | REQ-02 | developer | S1.GATE | object-manager/src/graphql/resolvers/instance.resolver.js | vitest unit (rechaza) verde | revert del guard | DET-5, DET-8 | done | 2 |
| S2.T3 | Tests: RBAC filter aplicado al where, gate por tipo, objeto no versionable rechazado | REQ-02, REQ-06 | developer | S2.T1, S2.T2 | object-manager/tests/unit/resolvers/get-version-chain.test.js | vitest run del archivo verde | revert de los casos agregados | DET-7, DET-4 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2, ⚑ fuerte: RBAC respetado + no-versionable rechazado) | — | reviewer | S2.T3 | projects/up1/tickets/ticket-040.md | gate persistido + vitest --coverage verde + checklist RBAC | n/a | DET-20, DET-23 | done | 2 |

### Session 3 — Cierre [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Quality review (10 dimensiones tier light) + commits granulares DET-27 (repo up1/submodulo object-manager + repo dkc) | REQ-01 | reviewer | S2.GATE | object-manager/, projects/up1/ | quality review pass + commits creados | n/a (revert por commit) | DET-13, DET-14, DET-27 | done | 3 |
| **S3.GATE** | Gate de cierre Session 3 (tier: T1) + teach-close | — | reviewer | S3.T1 | projects/up1/tickets/ticket-040.md | vitest run del modulo verde + teach-close generado | n/a | DET-20, DET-22 | done | 3 |

## Technical reference

- **SDL estatico**: `object-manager/src/graphql/typeDefs/static.js` — `type Query` monolitico (~linea 845), `type InstanceResult` (~linea 1121). Merge en `typeDefsIndex.js`.
- **Resolver host**: `instance.resolver.js` exporta `instanceQuery`; `getInstance` (withObjectAuth('view')) y `listInstances` son los ejemplos de referencia. `listInstances` aplica `getBusinessContextFilter` (~linea 1259).
- **Config versioning**: `core_ObjectDefinition.versioningConfig` (Json?) — shape `{ versioning: { linkageField, versionField, versionStrategy, ... }, prefillFrom }`. Lectura de referencia en `instance.resolver.js:2222`.
- **RBAC**: `withObjectAuth` en `src/services/auth/withAuth.js:122`; `getBusinessContextFilter` en `src/services/auth/businessContextFilter.js:45`.
- **Accesor dinamico**: `prisma[modelName]`, `modelName = objectType[0].toLowerCase() + objectType.slice(1)`.
- **Errores**: `throw new Error('CODIGO_STRING')` (sin clases custom).
- **Tests**: vitest; `tests/unit/resolvers/`; mock pass-through de `withObjectAuth`; `mockPrisma` con `findUnique`/`findMany`/`core_ObjectDefinition`.

## Constraints

- RULE-dev-004: trabajo `layer:core` de la epica va en rama unica `UPONE-1206`; commits con id externo `UPONE-1211`; merge a develop gated por revision team up1 (NO lo hace el cierre DKC).
- DET-20: tasks particionadas en 3 sessions con `S{N}.GATE` por session.
- DET-27: commits granulares por tipo al cierre de cada session, en repo de codigo (submodulo object-manager) + repo dkc.
- DET-30 (autopilot super): guarda de inicio (rama != develop), reviewer aislado en gates, teach-close MUST.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HU-4 / TICKET-038 (SPEC-object-manager-hu4-versioning-declarative) | internal | Declara y persiste `versioningConfig.versioning` (linkageField/versionField) | Cerrada — sin riesgo |
| HU-8 / TICKET-043 (adopcion en Activity) | internal | Declara `metadata.versioning` en activity.json + seed → habilita objetos versionables reales | Abierta — bloquea SOLO el happy-path de integracion contra DB real (no la logica, cubierta por unit tests) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Ciclo en el FK reflexivo (datos corruptos) cuelga el walk | low | high | Guard de `Set` de ids visitados que corta al re-visitar (REQ-03 edge scenario) |
| `isLatest` confunde por computarse sobre el set filtrado por RBAC | medium | low | Documentado como semantica intencional (flags relativos a lo visible); alineado al pseudo-codigo del diseño |
| Branch de core ausente (`UPONE-1206`) y repo en develop | high | medium | Crear la rama en el submodulo object-manager antes de codear (guarda de inicio DET-30) |
| `versionNumber` (posicional) se confunde con `versionField` (valor crudo) | medium | low | DEC-LOCAL-06 documenta que `versionNumber` es la posicion en el linaje visible, no el valor de `version` |

## Open questions

> Ninguna abierta. Las decisiones de retorno, walk, RBAC, scope de tests, instancia inexistente y semantica de versionNumber quedaron cerradas en Decisions (autopilot super: decidir + documentar).

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Tipo de retorno `VersionChainItem` nuevo
- **Contexto**: el SDL no tiene `type Instance`; el generico es `InstanceResult { id, data, extended, cloneMap }`.
- **Drivers**: claridad del contrato, no contaminar un tipo compartido, alinear con el patron `data: JSON`.
- **Opcion elegida**: type nuevo `VersionChainItem { id, data: JSON, isLatest, versionNumber }`.
- **Alternativas**: (a) reusar `InstanceResult` + flags → contamina tipo compartido; (b) crear `type Instance` generico → over-engineering fuera de scope.
- **Consecuencias**: contrato explicito; un type mas en el SDL.
- **Session**: design.

### DEC-LOCAL-02: Walk en memoria, no CTE recursivo
- **Contexto**: reconstruir el linaje desde un nodo intermedio.
- **Drivers**: H1 (linajes ≤10), legibilidad, scope SP3.
- **Opcion elegida**: walk atras + BFS adelante con guard de ciclo.
- **Alternativas**: CTE recursivo en SQL crudo → optimizacion prematura, acopla a Postgres.
- **Consecuencias**: O(n) findUnique/findMany por linaje chico; aceptable. Si un linaje crece mucho (improbable), revisar en SP4.
- **Session**: design.

### DEC-LOCAL-03: RBAC fila via getBusinessContextFilter
- **Contexto**: getInstance no filtra por fila; listInstances si.
- **Drivers**: getVersionChain devuelve coleccion → debe recortar filas como listInstances.
- **Opcion elegida**: `withObjectAuth('view')` + `getBusinessContextFilter` en el where del linaje.
- **Alternativas**: solo withObjectAuth (gate por tipo) → no recorta filas, viola "RBAC respetado" por fila.
- **Consecuencias**: consistencia con listInstances; una llamada extra a getBusinessContextFilter.
- **Session**: design.

### DEC-LOCAL-04: Happy-path integracion gated por HU-8
- **Contexto**: ningun objeto declara `metadata.versioning` (HU-4 DEC-LOCAL-04 lo difirio).
- **Drivers**: no hay seed versionable; HU-8 lo habilita.
- **Opcion elegida**: cubrir con unit tests (Prisma mock) + test de rechazo; documentar e2e como trabajo de HU-8.
- **Alternativas**: declarar versioning en activity.json aqui → invade scope de HU-8.
- **Consecuencias**: cobertura logica completa; happy-path real diferido.
- **Session**: design.

### DEC-LOCAL-05: Instancia inexistente/no visible → linaje vacio
- **Contexto**: `instanceId` que no existe o el user no puede ver.
- **Drivers**: no filtrar existencia (info leak), contrato simple.
- **Opcion elegida**: devolver `[]` (lista vacia) en vez de lanzar.
- **Alternativas**: throw `INSTANCE_NOT_FOUND` → leak de existencia + no pedido por el spec.
- **Consecuencias**: lista vacia es legitima; el consumidor distingue vacio de error de tipo (OBJECT_NOT_VERSIONABLE).
- **Session**: design.

### DEC-LOCAL-06: `versionNumber` es posicional
- **Contexto**: AC no define si versionNumber = valor de `version` o posicion.
- **Drivers**: pseudo-codigo del diseño usa `i + 1`.
- **Opcion elegida**: posicion 1-based en el linaje visible ordenado.
- **Alternativas**: usar el valor crudo de `versionField` → puede no ser contiguo / confunde con `data.version`.
- **Consecuencias**: `versionNumber` siempre 1..N contiguo sobre lo visible; `data.version` mantiene el valor crudo.
- **Session**: design.

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-01..REQ-06 pasan (10 unit TC verdes)
- [x] **Tests**: unit tests de orden, flags, walk, rechazo y RBAC escritos y verdes (assertions con valores concretos)
- [x] **Rules**: `withObjectAuth` + `getBusinessContextFilter` aplicados (patron del modulo); errores con `throw new Error('CODIGO')`
- [x] **Integration**: no rompe `getInstance`/`listInstances` (490/490 resolvers verde)
- [x] **Branch**: trabajo en `UPONE-1206`; commits `UPONE-1211-S1` ea3c54f / `UPONE-1211-S2` 6be0789
- [x] **Docs**: teach-close generado al cierre (teach-close.html validado)
