---
id: SPEC-object-manager-polymorphic-children-derived
project: up1
ticket: TICKET-049
status: done
---

# Derived genérico en el motor de versionado — remap declarativo de FKs internas entre hijos clonados (polymorphicChildrenDerived)

# Derived genérico en el motor de versionado — remap declarativo de FKs internas entre hijos clonados (polymorphicChildrenDerived)

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes. Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: cuando se versiona un objeto, el motor ya clona sus hijos polimórficos y remapea el dueño y el self-ref. Pero las FK que un hijo tiene hacia *otro* hijo clonado (ej. un `CurricularLink` que apunta a dos `CurricularSection`) hoy las remapea un hook + flow n8n escrito a mano en curriculum-design. Esto generaliza ese remap a una capacidad declarativa del motor: el objeto declara un bloque `polymorphicChildrenDerived` y el motor remapea las FK genéricamente, vía el `cloneMap` que ya construye. Al terminar, el hook + flow por-módulo se retiran y cualquier objeto futuro obtiene el remap sin código a medida.

**Decisiones criticas que necesitan tu OK** (racional en `## Decisions`):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Consumir el bloque **directo del JSON** en el resolver (vía `readObjectMetadataBlock`), **sin** sync al registry (`versioningConfig`) | RULE-core-019 (should): si el consumer es por-resolver, no se sincroniza al registry. Consistente con cómo `polymorphicChildren` ya se consume. Refina la suposición tentativa del intake (H2: persistir en `versioningConfig`) |
| 2 | Fase derived **síncrona in-engine** (en `finalizeCreate`, tras `deepClone`), retirando el flow n8n + la mutación GraphQL | Elimina el lag eventual y la infra por-módulo; el `cloneMap` ya está en scope. Resuelve H4 a favor de sync. Cierra la deuda completa (hook **y** flow) |
| 3 | Validar el bloque en **build-time** (codegen) contra los campos FK reales del objeto | Falla temprano (deploy) en vez de en runtime con un FK inexistente. Patrón de `validate-polymorphic-children.js` |

**Riesgos principales y como los mitigamos**:

- **Regresión silenciosa del versionado de Activity** (el comportamiento que hoy da el hook) → S4.T3 corre la suite e2e completa de object-manager + verifica explícitamente que los links se remapean vía la config genérica antes de retirar el hook; el hook se retira en la misma session que valida su reemplazo.
- **Quitar la mutación GraphQL deja un typeDef colgante** (RULE-core-018) → S4.T2 retira el typeDef en `typeDefs/mods.js` junto con el resolver; check de arranque del server.
- **FK cross-owner que cae fuera del cloneMap** (no hay constraint FK en DB — BR-VER-002) → la fase derived es defensiva por diseño (REQ-03): skip + warn, nunca crea un link huérfano (paridad exacta con el hook actual).

**Que NO se hace en este ticket** (limites del scope):

- **No** se añade columna ni tabla nueva (el bloque es metadata JSON; persiste como config en el JSON del objeto).
- **No** se generaliza B1 (codegen ignora `targetField`) — relacionado pero es otro ticket de SP4.
- **No** se migran otros mods: solo curriculum-design (único consumidor actual del hook). Otros objetos lo adoptan declarando el bloque cuando lo necesiten.

**Tamano estimado**: 4 sessions ejecutables (S1–S4), ~6–9h efectivas. La más riesgosa es **S4** (migración multi-repo: retira hook + flow + typeDef + tests del mod y corre regresión completa).

**Como vas a saber que funciona**:

- Versionar una `Activity` con `CurricularLink` produce links nuevos apuntando a las secciones **clonadas** (no a las viejas) — sin el hook por-módulo presente.
- Un objeto **distinto** a Activity, con un bloque `polymorphicChildrenDerived` declarado, versiona y remapea sus FK internas sin una línea de código por-mod.
- `npm test` en object-manager queda verde; el directorio del hook + flow en curriculum-design ya no existe.

---

## Purpose

Generalizar el remap de FK internas entre hijos clonados —hoy resuelto por un hook + flow n8n por-módulo (HU-8b)— a una capacidad declarativa del motor de versionado de object-manager. Para el dev de un mod: declarar `metadata.polymorphicChildrenDerived` en el JSON del objeto basta para que el motor remapee sus FK internas al versionar, sin escribir código. Extiende HU-0d (deepClone + `polymorphicChildren`) con una fase "derived" que consume el `cloneMap` existente.

## Requirements

### REQ-01: Bloque declarativo `polymorphicChildrenDerived` validado en build-time

> **Que cambia**: el dev de un objeto puede declarar en su JSON un bloque `polymorphicChildrenDerived` que lista qué hijos derivados tienen FK internas a otros hijos clonados. El codegen lo valida al generar el schema.
> **Por que**: sin validación build-time, un `via` con un campo FK inexistente fallaría recién en runtime al versionar; el patrón de `polymorphicChildren` ya valida en build-time y este bloque debe ser consistente.

El sistema MUST validar `metadata.polymorphicChildrenDerived` en build-time (codegen) y abortar la generación si algún entry es inválido. Cada entry tiene la forma `{ object: string, via: string, remapTo: string }` donde `via` es una lista separada por coma de campos escalares FK (ej. `"sourceSectionId,targetSectionId"`), `object` es el nombre del hijo derivado y `remapTo` es el `name` de un alias de `polymorphicChildren` cuyo tipo clonado es el destino de las FK.

**Actor**: system (codegen, build-time)
**Layers**: config, backend (codegen)

<details><summary>Scenarios de validacion</summary>

#### Scenario: bloque válido genera sin error
- **GIVEN** un objeto con `polymorphicChildrenDerived: [{ object: "CurricularLink", via: "sourceSectionId,targetSectionId", remapTo: "sections" }]` y esos campos existen como FK en `CurricularLink`
- **WHEN** corre el codegen
- **THEN** la generación completa sin error y el bloque queda disponible para el motor

#### Scenario: `via` con campo inexistente aborta
- **GIVEN** un entry cuyo `via` lista un campo que no existe (o no es FK) en `object`
- **WHEN** corre el codegen
- **THEN** la generación aborta con un error claro indicando el objeto, el entry y el campo inválido

#### Scenario: `remapTo` sin alias correspondiente aborta
- **GIVEN** un entry cuyo `remapTo` no matchea ningún `name` de `polymorphicChildren` del objeto
- **WHEN** corre el codegen
- **THEN** la generación aborta indicando que `remapTo` no resuelve a un alias declarado

</details>

#### Acceptance
**El usuario puede verificar que funciona**: declarar un bloque con un campo FK falso y correr el codegen → ve el deploy bloqueado con el error puntual.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | bloque válido | entry con FK reales | codegen | sin error | exit 0 |
| 2 | via inválido | `via` con campo inexistente | codegen | aborta | error menciona objeto+campo |
| 3 | remapTo huérfano | `remapTo` sin alias | codegen | aborta | error menciona remapTo |

### REQ-02: Fase derived genérica que remapea FKs internas vía cloneMap

> **Que cambia**: al versionar cualquier objeto que declare el bloque, el motor —después de clonar los hijos primarios— re-crea los hijos derivados con sus FK internas apuntando a los hijos ya clonados, leyendo el bloque directo del JSON.
> **Por que**: hoy ese remap solo existe para `CurricularLink` y vive fuera del motor (hook + flow); generalizarlo elimina el código por-mod y lo da gratis a objetos futuros.

El sistema MUST, tras clonar los hijos polimórficos primarios durante el versionado, leer `polymorphicChildrenDerived` del JSON del objeto (vía `readObjectMetadataBlock`, mismo patrón que `polymorphicChildren`) y, por cada entry, localizar las filas del hijo derivado cuyas FK (`via`) caen dentro del `cloneMap` y re-crearlas con los ids remapeados al hijo clonado correspondiente. El remap MUST ser genérico sobre `object` y los campos de `via` — sin nombres hardcoded de objeto o campo.

**Actor**: system (motor de versionado, runtime)
**Layers**: backend (deep-clone engine + instance resolver)

<details><summary>Scenarios de validacion</summary>

#### Scenario: remap genérico de un objeto cualquiera
- **GIVEN** un objeto `O` con `polymorphicChildren` (hijos primarios `P`) y `polymorphicChildrenDerived: [{ object: "D", via: "aId,bId", remapTo: "ps" }]`, y filas de `D` cuyas `aId`/`bId` apuntan a filas de `P`
- **WHEN** se versiona una instancia de `O`
- **THEN** se crean filas nuevas de `D` cuyas `aId`/`bId` apuntan a los `P` **clonados** (vía `cloneMap`), sin código específico de `O` ni de `D`

#### Scenario: paridad con el comportamiento de Activity/CurricularLink
- **GIVEN** una `Activity` con `CurricularSection` y `CurricularLink`, migrada al bloque declarativo
- **WHEN** se versiona la Activity
- **THEN** los `CurricularLink` clonados apuntan a las `CurricularSection` clonadas (mismo resultado que daba el hook HU-8b)

#### Scenario: objeto sin bloque derived no cambia
- **GIVEN** un objeto sin `polymorphicChildrenDerived`
- **WHEN** se versiona
- **THEN** el clonado se comporta exactamente como hoy (no hay fase derived) — REQ-PRESERVE

</details>

#### Acceptance
**El usuario puede verificar que funciona**: versionar un objeto con bloque derived y consultar los hijos derivados nuevos → sus FK apuntan a los hijos clonados, no a los originales.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | remap genérico | objeto D con via aId,bId | versionar | FK → clonados | ids nuevos en aId,bId |
| 2 | paridad Activity | Activity+Links migrada | versionar | links → sections clonadas | igual que hook |
| 3 | sin bloque | objeto sin derived | versionar | sin fase derived | comportamiento intacto |

### REQ-03: Defensa — skip + warn cuando una FK cae fuera del cloneMap

> **Que cambia**: si un hijo derivado tiene una FK hacia algo que no se clonó (un link cross-owner), el motor lo omite y loguea, en vez de crear un registro roto.
> **Por que**: no hay constraint de FK en DB (BR-VER-002); sin esta defensa un link cross-owner crearía un huérfano. El hook actual ya se comporta así y hay que preservarlo.

El sistema MUST, por cada fila derivada, verificar que **todas** sus FK de `via` están en el `cloneMap`; si alguna no lo está, MUST omitir la creación de esa fila y emitir un `console.warn` con el id de la fila y el campo fuera de mapa. El sistema MUST NOT crear filas derivadas con FK sin remapear.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: FK fuera del cloneMap → skip
- **GIVEN** una fila derivada con una FK que apunta a un hijo NO clonado (cross-owner)
- **WHEN** corre la fase derived
- **THEN** la fila se omite, se loguea un warn, y `skipped` se incrementa — no se crea fila huérfana

#### Scenario: contador de remapped/skipped observable
- **GIVEN** un conjunto mixto de filas (algunas remapeables, otras no)
- **WHEN** corre la fase derived
- **THEN** se remapean solo las válidas y el resultado reporta `{ remapped, skipped }`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: versionar un objeto con un link cross-owner → el link no se duplica y aparece un warn en logs; los links válidos sí se remapean.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | skip cross-owner | FK fuera del map | fase derived | skip + warn | no se crea fila; skipped+1 |
| 2 | mixto | válidas + inválidas | fase derived | solo válidas | remapped=N, skipped=M |

### REQ-04: Migración de curriculum-design a la config declarativa

> **Que cambia**: la `Activity` de curriculum-design declara el bloque `polymorphicChildrenDerived`; el hook resolver, su typeDef GraphQL, el flow n8n y los tests del hook se retiran.
> **Por que**: es el objetivo del ticket — reemplazar las ~93 líneas + flow por config; sin retirar el hook, el remap correría dos veces.

El sistema MUST declarar `polymorphicChildrenDerived` en el JSON de `Activity` y MUST retirar: el resolver `activity.versioning-hook.resolver.js` (ambas copias: `mods/curriculum-design/logic/` y el mirror en `object-manager/.../mods/curriculum-design/`), la entry de typeDef `remapVersionedCurricularLinks` en `typeDefs/mods.js`, el flow `flows/versioning-remap.json`, y los tests del hook (`tests/unit/activity.versioning-hook.test.js`).

**Actor**: system / dev de mod
**Layers**: config (Activity JSON), backend (resolver, typeDef), infra (flow n8n), tests

<details><summary>Scenarios de validacion</summary>

#### Scenario: versionado sigue funcionando vía config
- **GIVEN** la Activity migrada (bloque declarado, hook+flow retirados)
- **WHEN** se versiona una Activity con links
- **THEN** los links se remapean por la fase derived genérica — sin el hook

#### Scenario: el server arranca sin el typeDef colgante
- **GIVEN** el resolver y su typeDef retirados juntos
- **WHEN** arranca el GraphQL server
- **THEN** no hay error de schema (RULE-core-018: no queda mutation declarada sin resolver)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el directorio del hook + flow ya no existe, el server arranca, y versionar una Activity remapea los links.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | versionado vía config | Activity migrada | versionar | links remapeados | sin hook presente |
| 2 | server arranca | typeDef+resolver retirados | start server | sin error schema | boot ok |

### REQ-05: Preservación — no romper el versionado existente (regression)

> **Que cambia**: nada, explícitamente — el versionado de objetos sin bloque derived y el clonado de hijos primarios se comportan idéntico.
> **Por que**: la fase derived es aditiva; no debe alterar el path actual de clonado (owner + self-ref).

El sistema MUST preservar el comportamiento existente del clonado de hijos polimórficos (remap de owner + self-ref) y MUST NOT alterar el versionado de objetos que no declaran `polymorphicChildrenDerived`. La suite existente de object-manager MUST quedar verde.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: suite existente verde
- **GIVEN** los cambios de S1–S4 aplicados
- **WHEN** corre `npm test` en object-manager
- **THEN** todas las suites existentes (deep-clone-polymorphic, clone-activity-polymorphic, version-asnewversion, validate-polymorphic-children, syncVersioningConfigToRegistry) quedan verdes

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `npm test` en object-manager pasa sin regresiones.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | regression | cambios aplicados | npm test | verde | 0 fallos nuevos |

## Artifacts

### Models (config — no schema migration)

El "modelo de datos" es metadata declarativa, no una tabla. No hay migración Prisma. Ver draft aprobado: [`TICKET-049.draft/data-model.prisma`](../../tickets/TICKET-049.draft/data-model.prisma).

**Bloque `metadata.polymorphicChildrenDerived`** (array de entries en el JSON del objeto):

| Campo | Tipo | Nullable | Descripcion |
|-------|------|----------|-------------|
| object | string | no | Nombre del hijo derivado cuyas FK internas se remapean (ej. `CurricularLink`) |
| via | string | no | Lista separada por coma de campos escalares FK a remapear (ej. `sourceSectionId,targetSectionId`). Campo escalar, no el accessor lowercase Prisma (RULE-platform-007) |
| remapTo | string | no | `name` de un alias de `polymorphicChildren` cuyo tipo clonado es el destino de las FK |

**Persistencia**: el bloque vive en el JSON del objeto y se consume **directo en runtime** vía `readObjectMetadataBlock(objectType, tenant, 'polymorphicChildrenDerived')` — **sin** sync al registry (RULE-core-019; ver DEC-LOCAL-01). El codegen solo lo **valida** en build-time.

### GraphQL resolver (METASPEC-graphql-resolver)

Este ticket **retira** la mutación `remapVersionedCurricularLinks` (resolver + typeDef) — el remap pasa a ser in-engine, no una mutación expuesta. No se crea ningún resolver nuevo.

#### Checklist de calidad por artefacto

- [x] **Configuracion declarativa, no hardcoded**: el bloque es config en el JSON del objeto; el motor lo consume genérico, sin nombres hardcoded de objeto/campo (REQ-02). El reemplazo del hook ELIMINA el hardcode actual (`curricularLink`, `sourceSectionId`).
- [x] **Cada artefacto tiene consumidor concreto en este sprint**: el bloque lo consume la fase derived (S2/S3); el primer consumidor real es la Activity migrada (S4).
- [x] **Heuristicas se reemplazan con specs explicitas**: la fase derived NO infiere FK por nombre — las lee de `via` (spec explícita en la config).

## Tasks

> Numeración del plan (DET-20): el ticket no tiene `### Session N` previas → el plan empieza en **S1**.

parallelization-assessment: not-applicable (ver registro observable). Autopilot ejecuta tasks de forma secuencial (un solo developer-loop); ninguna session tiene 2+ tasks pesadas independientes que justifiquen break-even. Dependencias duras: S1.T1→T2, S2.T1→T2→T3, S3.T1→T2, S4.T1→T2→T3. Las pocas disjuntas (ej. S1.T3 reader vs S1.T1 validator) son triviales — paralelizar no compensa.

### Session 1 — Bloque declarativo + validator codegen + reader helper [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear validator `validate-polymorphic-children-derived.js` (shape `{object,via,remapTo}`, `via` campos FK reales, `remapTo` matchea alias de polymorphicChildren) siguiendo el patrón de `validate-polymorphic-children.js` | REQ-01 | developer | — | object-manager/src/services/codegen/helpers/validate-polymorphic-children-derived.js | vitest tests/unit/services/codegen | git revert | DET-1, DET-2, DET-8 | done | 1 |
| S1.T2 | Cablear el validator en `generatePrismaSchema.js` (validateAll, abortar build si inválido) + unit tests del validator | REQ-01 | developer | S1.T1 | object-manager/src/services/codegen/generatePrismaSchema.js, object-manager/tests/unit/services/codegen/validate-polymorphic-children-derived.test.js | vitest tests/unit/services/codegen | git revert | DET-5, DET-8, RULE-core-016 | done | 1 |
| S1.T3 | Reader helper `readPolymorphicChildrenDerived(objectType, tenant)` en `deep-clone-polymorphic.js` (mismo patrón que `readPolymorphicChildren` → `readObjectMetadataBlock`) | REQ-02 | developer | — | object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js | vitest tests/unit/resolvers | git revert | DET-2, RULE-core-019 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, correr vitest del área + coverage, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Fase derived genérica en el motor + unit [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Implementar `applyDerivedRemap({ prisma, derived, cloneMap, ... })` en `deep-clone-polymorphic.js`: por cada entry, findMany del hijo derivado, remapear FK de `via` vía cloneMap (filtrado por type de `remapTo`), re-crear filas. Genérico sobre object/campos | REQ-02 | developer | S1.GATE | object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js | vitest tests/unit/resolvers | git revert | DET-5, DET-8, DET-16, RULE-platform-007 | done | 2 |
| S2.T2 | Añadir defensa skip+warn: si alguna FK de una fila no está en cloneMap → omitir + console.warn, retornar `{ remapped, skipped }` | REQ-03 | developer | S2.T1 | object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js | vitest tests/unit/resolvers | git revert | DET-5, DET-8 | done | 2 |
| S2.T3 | Unit tests de `applyDerivedRemap`: remap genérico multi-campo, skip cross-owner, conjunto mixto, sin bloque (no-op) | REQ-02, REQ-03 | developer | S2.T2 | object-manager/tests/unit/resolvers/derived-remap.test.js | vitest --coverage tests/unit/resolvers | git revert | DET-7, DET-13, RULE-core-016 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** — persistir, vitest unit + coverage delta del motor, quality review exhaustive, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Wire en finalizeCreate + e2e genérico [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Invocar `applyDerivedRemap` desde `finalizeCreate` tras `deepClonePolymorphicChildren` (reusa el `cloneMap` en scope, lee el bloque vía reader). Síncrono in-engine | REQ-02 | developer | S2.GATE | object-manager/src/graphql/resolvers/instance.resolver.js | vitest tests/integration | git revert | DET-5, DET-8, DET-10, RULE-core-019 | done | 3 |
| S3.T2 | Test e2e genérico: objeto distinto de Activity con bloque derived versiona y remapea sus FK internas sin código por-mod (fixture nueva) | REQ-02 | developer | S3.T1 | object-manager/tests/e2e/derived-remap-generic.test.js | vitest tests/e2e | git revert | DET-7, DET-13 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — persistir, vitest integration + e2e, quality review exhaustive, decidir continue/iterate | — | reviewer | S3.T1, S3.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Migración curriculum-design + regresión + cierre [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Declarar `polymorphicChildrenDerived: [{ object: "CurricularLink", via: "sourceSectionId,targetSectionId", remapTo: "sections" }]` en el JSON de Activity (curriculum-design) | REQ-04 | developer | S3.GATE | mods/curriculum-design/objects/Activity.json | codegen build (validator verde) | git revert | DET-2, DET-16, RULE-platform-006 | done | 4 |
| S4.T2 | Retirar hook + flow + typeDef + tests del mod: `activity.versioning-hook.resolver.js` (ambas copias), entry `remapVersionedCurricularLinks` en `typeDefs/mods.js`, `flows/versioning-remap.json`, `tests/unit/activity.versioning-hook.test.js` | REQ-04 | developer | S4.T1 | mods/curriculum-design/logic/activity.versioning-hook.resolver.js, object-manager/src/graphql/resolvers/mods/curriculum-design/activity.versioning-hook.resolver.js, object-manager/src/graphql/typeDefs/mods.js, mods/curriculum-design/flows/versioning-remap.json, mods/curriculum-design/tests/unit/activity.versioning-hook.test.js | server boot + vitest | git revert | DET-16, RULE-core-018 | done | 4 |
| S4.T3 | Regresión completa: `npm test` object-manager + verificar versionado de Activity remapea links vía config (e2e existente version-asnewversion) | REQ-05 | reviewer | S4.T2 | object-manager/tests/ | npm test (vitest run) | git revert | DET-7, DET-13, DET-14 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — persistir, regresión completa verde, quality review exhaustive, acceptance checkpoints, decidir continue/cierre | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket | gate persistido + acceptance | (no aplica) | DET-20, DET-23 | done | 4 |

### Task contract (detalle de las tasks de mayor riesgo)

```
Task S2.T1: applyDerivedRemap genérico
- source_ref: REQ-02
- agent: developer
- files: object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js
- precondition: reader helper (S1.T3) + bloque validado (S1.T2)
- expected_output: función exportada que, dado prisma + derived block + cloneMap, re-crea hijos derivados con FK remapeadas; genérica sobre object/campos
- validation: vitest tests/unit/resolvers (remap multi-campo, sin nombres hardcoded)
- rollback: git revert
- rules: [DET-5, DET-8, DET-16, RULE-platform-007]
```

```
Task S4.T2: retirar hook + flow + typeDef + tests
- source_ref: REQ-04
- agent: developer
- files: (ver tabla — 5 paths en 2 repos)
- precondition: fase derived genérica wired (S3.GATE) y verificada con e2e genérico
- expected_output: hook resolver (x2), typeDef entry, flow json y test del mod eliminados; server arranca sin error de schema
- validation: server boot + vitest (no quedan refs colgantes a remapVersionedCurricularLinks)
- rollback: git revert (restaura los 5 archivos)
- rules: [DET-16, RULE-core-018]
```

## Constraints

- RULE-core-019: keys declarativas per-capacidad — validar build-time, consumir directo del JSON en el resolver, sin sync al registry si el consumer es por-resolver. **Driver central de DEC-LOCAL-01** (no se usa `versioningConfig`).
- RULE-platform-007: relaciones FK se consumen lowercase (codegen `replace(/Id$/,'').toLowerCase()`). La fase derived opera sobre el **campo escalar** `*Id`, no el accessor — sin impacto.
- RULE-core-018: un campo/mutation no se expone si el typeDef no lo declara (Apollo lo descarta). Al retirar el resolver del hook, retirar también su typeDef (S4.T2).
- RULE-core-016: tests de object-manager viven en `tests/`, no en `src/**/__tests__/`.
- RULE-platform-006: objects/layouts/resolver types en PascalCase.
- RULE-dev-004: trabajo en core va en rama única por épica (`UPONE-1206`), revisión del team antes de develop.
- DET-19: artefactos del repo (commits, branches) usan `UPONE-1219` (external del ticket), no `TICKET-049`.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-object-manager-hu4-versioning-declarative | internal | El motor de versionado declarativo (deepClone + polymorphicChildren) sobre el que se monta la fase derived | Ya implementado (HU-0d/HU-4) — sin riesgo |
| n8n (flow runtime) | external | El flow actual de versioning-remap se retira; no se introduce dependencia nueva | Bajo — se elimina, no se agrega |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresión del versionado de Activity al retirar el hook | medium | high | S4 valida el reemplazo (e2e) ANTES de retirar; regresión completa en S4.T3; hook se retira en la misma session que prueba la paridad |
| typeDef colgante tras retirar la mutación | low | medium | S4.T2 retira resolver+typeDef juntos; check de server boot (RULE-core-018) |
| FK cross-owner crea huérfano | medium | medium | REQ-03 defensa skip+warn (paridad con hook); test dedicado S2.T3 |
| Doble remap (hook + fase derived a la vez) durante migración | low | high | El bloque se declara (S4.T1) y el hook se retira (S4.T2) en la misma session, en orden; nunca coexisten en un deploy |

## Open questions

(ninguna abierta — las dos del draft se resolvieron en REQ-01 con recomendación: `via` se valida contra FK reales; `remapTo` debe matchear un alias de `polymorphicChildren`)

## Decisions

### DEC-LOCAL-01: Consumir el bloque directo del JSON (sin sync al registry) + fase síncrona in-engine
- **Contexto**: el intake dejó abierta H4 (sync in-engine vs hook genérico async) y recomendó tentativamente persistir el bloque en `versioningConfig` (H2). Al diseñar, RULE-core-019 aplica directamente.
- **Drivers**: RULE-core-019 (should) — si el consumer es por-resolver, validar build-time + consumir directo del JSON, sin sync al registry. `polymorphicChildren` ya sigue este patrón exacto (`readObjectMetadataBlock`). El `cloneMap` ya está en scope en `finalizeCreate`. Eliminar la infra n8n + GraphQL reduce superficie y lag.
- **Opcion elegida**: (a) leer `polymorphicChildrenDerived` directo del JSON vía `readObjectMetadataBlock` en runtime; (b) fase derived **síncrona** dentro de `finalizeCreate` tras `deepClone`; (c) retirar el flow n8n + la mutación.
- **Alternativas**: persistir en `versioningConfig` y/o mantener el patrón evento→consumer genérico async. Descartadas: el sync al registry es innecesario para un consumer por-resolver (RULE-core-019) e inconsistente con `polymorphicChildren`; el async mantiene lag e infra sin beneficio aquí.
- **Consecuencias**: +consistencia con el bloque hermano, −infra (se retira n8n+GraphQL), +transaccionalidad. Refina (supersede) la suposición tentativa del intake de persistir en `versioningConfig`. El draft `data-model.prisma` documentó la persistencia en `versioningConfig` como tentativa; esta decisión la reemplaza por lectura directa del JSON.
- **Session**: design-feature (autopilot super — decide+documenta, HOR-103)

### DEC-LOCAL-02: Fase derived como función dedicada `applyDerivedRemap` en deep-clone-polymorphic.js
- **Contexto**: dónde ubicar la lógica de remap derived.
- **Drivers**: testabilidad en aislamiento (como `buildRemapAPI`), cohesión del helper de clonado, reuso del `cloneMap`.
- **Opcion elegida**: función exportada `applyDerivedRemap` en `deep-clone-polymorphic.js`, invocada desde `finalizeCreate`.
- **Alternativas**: inline en `finalizeCreate` (descartado: menos testeable) o nueva fase dentro de `deepClonePolymorphicChildren` (descartado: el derived necesita el cloneMap COMPLETO de todos los aliases, más claro como paso posterior).
- **Consecuencias**: unit-testeable sin DB-resolver completo; separación clara primario vs derived.
- **Session**: design-feature

### DEC-LOCAL-03: FK nullable = relación opcional (pasa tal cual); type-check en el remap
- **Contexto**: revisión aislada de S2 (reviewer fresco) detectó dos puntos en `applyDerivedRemap`: (a) divergencia con el hook HU-8b ante FK null, (b) posible remap silencioso a un clon de type equivocado cuando el cloneMap es mixto (varios aliases).
- **Drivers**: el motor es genérico (no solo CurricularLink, cuyos FK son `not_null`). El hook skipeaba null porque `!newSourceId` conflactaba "null" con "fuera del map".
- **Opción elegida**: (a) **null FK = relación opcional → se deja como está** (Option B): el motor separa null (válido, pasa) de fuera-del-map (cross-owner, skip). (b) En el loop de remap, validar `mapped.type === targetType` (cuando hay `remapTypeByAlias`): un id presente en el cloneMap pero de otro type se trata como cross-owner (skip+warn), no se remapea silenciosamente.
- **Alternativas**: (a) paridad exacta con el hook (skip en null) — descartada: incorrecta para FK nullable legítimas en objetos genéricos. Para CurricularLink (not_null) ambas dan el mismo resultado, así que no afecta la regresión.
- **Consecuencias**: comportamiento genérico correcto + defensa de type reforzada; warn ahora identifica campo+valor. Tests TC-2.3 (cross-type) + assert de `created` agregados.
- **Session**: S2 (iterate por quality review aislado)

## Technical reference

- `deep-clone-polymorphic.js`: `deepClonePolymorphicChildren` (:143), `buildRemapAPI` (:221-237), `readObjectMetadataBlock`/`readPolymorphicChildren` (:36-61). `cloneMap` = `Map<oldId,{newId,type}>`.
- `instance.resolver.js`: `finalizeCreate` invoca deepClone en :2984; `cloneMap` disponible en :3005.
- Codegen: `syncVersioningConfigToRegistry` (:2522, NO se usa para este bloque), `validateAllPolymorphicChildren` (:54), RULE-platform-007 lowercase (:381).
- Hook a retirar: `activity.versioning-hook.resolver.js` (93 líneas, lógica :52-76), typeDef `typeDefs/mods.js:228`, flow `versioning-remap.json`, test `tests/unit/activity.versioning-hook.test.js`.

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-01..REQ-05 pasan (unit + e2e, DB real)
- [x] **Tests**: unit (validator 18, applyDerivedRemap 9) + e2e 7/7 + regresión 1631 unit; verdes
- [x] **NFRs**: n/a (sin NFRs relevantes — feature de motor, no endpoint de alto volumen)
- [x] **Rules**: RULE-core-019, RULE-platform-007, RULE-core-018, RULE-core-016, RULE-platform-006 respetadas
- [x] **Integration**: versionado existente (owner+self-ref) y objetos sin bloque derived intactos — e2e verde
- [x] **Docs**: hook + flow retirados; sin refs colgantes a `remapVersionedCurricularLinks` (grep limpio)
