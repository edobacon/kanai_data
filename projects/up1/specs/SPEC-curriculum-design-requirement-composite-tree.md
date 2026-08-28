---
id: SPEC-curriculum-design-requirement-composite-tree
project: up1
ticket: TICKET-083
status: done
---

# Malla — objeto `requirement` (Composite, 3 RecordTypes) + bloque electivo

# Malla — objeto `requirement` (Composite, 3 RecordTypes) + bloque electivo

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: crear el objeto `requirement` del mod `curriculum-design`: un **árbol de reglas** (patrón Composite por `parentId`) que modela las condiciones de la malla — prerrequisitos, electivos K-de-N y umbrales de crédito. Base polimórfica (`ownerType`/`ownerId` → curriculum/activity/offering) + 3 RecordTypes: `Group` (combinador AND/OR), `RecordState` (estado de un curso) y `MetricThreshold` (umbral de métrica). Enums cerrados. SP5 **solo persiste y lee** el árbol — sin motor de evaluación (eso es SP6). El "bloque electivo" (Should) no es un objeto nuevo: es un `requirement(Group, ownerType=curriculum, OR)` + una derivación sobre `planEntry.blockId` (MC-02). Mod-only, aditivo, copiando el patrón `CurricularSection`. Habilita MC-04 (MCP), MC-05/06 (malla lee bloques/prereqs), MC-08/09 y SP6.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Enums cerrados (REQ-03) y `label` obligatorio (REQ-04) se enforcean por **JSON schema** (`enum`/`required`), NO por resolver | **CONSTRAINT H7**: solo UN override de `createInstance` por mod, ya tomado por `sectionValidation.resolver.js`. El create genérico del platform enforcea `enum`/`required` — mismo mecanismo que CurricularSection. Sin tocar resolvers |
| 2 | Validación `ownerType↔ownerId` (REQ-06) = **convención documentada**, no resolver nuevo | CurricularSection NO valida la pareja polimórfica (`ownerId` sin FK real); TC-05 permite "(o doc convención)". Alineado al patrón, sin código nuevo ni colisión H7 |
| 3 | "Reconstruir el árbol" (REQ-05) es un concern de **lectura flat** (`listInstances` por `ownerId`/`parentId`) + un helper puro de ensamblado (copia de `buildTree.ts`), NO un resolver de árbol en backend | CurricularSection no tiene resolver de tree; usa CRUD genérico + ensamblado. Como `creates_visual:false`, TC-01 se verifica con un unit test del helper sobre fixtures EST200 |
| 4 | **NO se soporta UPDATE de `rt__*__requirement` en SP5** → backlog forward-compatible | Ningún REQ/TC lo pide (REQ-05 = persistir+reconstruir = create+read). Soportarlo exigiría extender el `RT_PATTERN` de `polymorphicUpdate.resolver.js` (código compartido → riesgo de regresión de CurricularSection). Se difiere a cuando MC-05/06 necesite edición por UI |
| 5 | `requirement` y sus RT **NO van al menú de objetos** (REQ-07): sin `_list`, layouts por RT `RecordDetail` con `applicationId:null` | Es sub-estructura embebida bajo su owner (igual que los 7 RT de CurricularSection y planEntry/requirementCategory de MC-02). El menú lo gobiernan los `RecordList` con `showInNav` (TICKET-093) |

**Riesgos principales y como los mitigamos**:

- **El sync/seed contra UPU podría chocar con drift de BASEMODEL** → S1 corre codegen/sync (additivo); si choca, workaround `SYNC_AUTO_APPLY_SCHEMA=false` (memoria up1) o regenerar baseline; nunca `--accept-data-loss`.
- **Agregar layouts rompe `tests/integration/layouts-declared.test.ts`** (afirma conteo exacto) → S3 actualiza el conteo esperado al agregar los layouts de requirement; `recordtypes-declared.test.ts` exige el trío layout+lang por RT (se cubre en S3).
- **Copiar mal la convención del RT** (FK `requirementId`, `baseObject`, naming) → S1 valida con `recordtypes-declared.test.ts` (auto-falla si un RT no encaja).

**Que NO se hace en este ticket** (limites explicitos del scope):

- Motor de evaluación / degree-audit (recorrer y evaluar el árbol) → SP6.
- UPDATE de los RT de requirement → backlog (decisión #4); SP5 = create + read.
- RecordTypes futuros (`AttributeMatch`, etc.): `recordType` se documenta extensible (REQ-08), no se implementan.
- `RecordState.targetType` ≠ `activity` y `MetricThreshold.metric` ≠ `Credits`: enums cerrados a un solo valor en SP5.
- Componentes Vue nuevos (`creates_visual:false`): solo layouts por RT copiando el patrón.
- Commit de artefactos generados por sync/seed (Base, schema Prisma, typeDefs, lang sincronizado al core) — solo source del mod (RULE-curriculum-design-013).

**Tamano estimado**: 4 sessions (~7 SP, piso). S1 (objeto base + 3 RT + sync) T2 ⚑ fuerte, S2 (lectura del árbol + doc convención) T2, S3 (layouts + lang + no-menú) T3 ⚑ fuerte, S4 (seed EST200 + bloque electivo + derivación + doc) T2. La más riesgosa es S1 (codegen/sync del primer multi-RT polimórfico nuevo del sprint). El bloque electivo (S4) es Should: si el núcleo se infla, se recorta primero.

**Como vas a saber que funciona**:

- Crear un `RecordState` con `targetType` ≠ activity, un `MetricThreshold` con `metric` ≠ Credits, o un `requirement` sin `label`, es rechazado por el backend (enums/required).
- Persistir el árbol EST200 (Group AND → {Group OR → {Group AND → MAT110,MAT120}, MAT210}, MetricThreshold≥60cr, RecordState PROG101) y leerlo reconstruye la misma jerarquía y combinadores.
- El bloque "Electivo de Especialización" se lee como Group OR, minToSatisfy=4, creditsRequired=24, ownerType=curriculum; 2 planEntries con `blockId` se derivan electivos y 1 sin `blockId`, obligatorio.
- Abrir el detalle de un `rt__RecordState__requirement` usa el layout del RT (no el base); `requirement` NO aparece en el menú de objetos tras el sync.

---

## Purpose

Crear el objeto `requirement` del mod `curriculum-design`: un árbol de reglas (Composite por `parentId`) con base polimórfica (`ownerType`/`ownerId`) y 3 RecordTypes (`Group`, `RecordState`, `MetricThreshold`) que modela las condiciones de la malla (prerrequisitos, electivos, umbrales). SP5 solo persiste y lee el árbol (sin motor de evaluación). Cambio mod-only, aditivo, copiando el patrón `CurricularSection`. Es el insumo directo de MC-04 (contrato MCP), MC-05/06 (malla lee bloques y prereqs), MC-08/09 y SP6 (motor de evaluación).

## Requirements

### REQ-01: objeto `requirement` base (Composite)

> **Que cambia**: aparece un objeto que representa un nodo de un árbol de reglas, colgando de un curriculum, una activity o una offering, con anidamiento por `parentId`.
> **Por que**: es el contenedor de toda condición de la malla; sin él no hay dónde expresar prerrequisitos ni electivos.

El sistema MUST definir `objects/requirement.json` con: `ownerType` (enum `{curriculum, activity, offering}`, requerido), `ownerId` (string requerido, FK polimórfica sin integridad DB — REQ-06), `parentId?` (self-FK con `isForeignKey`/`references: requirement`/`targetField: id` — árbol, anida solo bajo Group), `recordType` (enum `{Group, RecordState, MetricThreshold}`, requerido — REQ-08 extensible), `effect` (enum `{EligibilityToEnroll, ProgressGate, Completion, DiplomaAward}`, requerido), `label` (string requerido — REQ-04), `isHardRule` (boolean, `static_default: "true"`), `negate` (boolean, `static_default: "false"`), `overrideMode?` (string opcional, solo válido cuando ownerType=offering — valores no fijados en SP5, sin enum cerrado), `position?` (Int), timestamps (auto-codegen). `metadata.directChildren` (self-FK recursiva por `parentId`), `metadata.indexes` (`ownerType, ownerId, recordType` + `parentId`), `defaultLayoutType` apropiado. Patrón copiado de `CurricularSection`.

**Actor**: diseñador curricular (admin); system (sync)
**Layers**: schema (objects), backend (codegen/sync)

<details><summary>Scenarios de validacion</summary>

#### Scenario: create válido
- **GIVEN** un curriculum existente
- **WHEN** se crea un `requirement` con `ownerType=curriculum`, `ownerId`, `recordType=Group`, `effect`, `label`
- **THEN** se persiste sin error

#### Scenario: árbol anidado
- **GIVEN** un `requirement` Group raíz
- **WHEN** se crea un hijo con `parentId = raíz.id`
- **THEN** se persiste y la relación parent/children queda reconstruible

</details>

#### Acceptance
**El usuario puede verificar que funciona**: puede crear un requirement raíz de tipo Group sobre un currículo y anidarle hijos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | create válido + árbol | curriculum | crear Group + hijo parentId | persiste, reconstruible | TC-01 |

### REQ-02: 3 RecordTypes con campos propios

> **Que cambia**: cada nodo del árbol es de uno de tres tipos, y cada tipo guarda sus propios campos (un Group combina; un RecordState exige un curso; un MetricThreshold mide créditos).
> **Por que**: las tres formas de condición tienen datos distintos; el RecordType es el patrón up1 para sub-tipar un objeto base.

El sistema MUST definir 3 RecordTypes (convención `objects/RecordTypes/rt__<RT>__requirement.json`, `baseObject: "requirement"`, solo props propias):
- `rt__Group__requirement`: `combinator` (enum `{AND, OR}`, requerido), `minToSatisfy?` (Int), `creditsRequired?` (Int).
- `rt__RecordState__requirement`: `targetType` (enum `{activity}`, requerido — REQ-03), `targetId` (string requerido), `mustBe` (enum `{Approved, Taken}`, requerido), `thresholdMinGrade?` (Float — `threshold{minGrade}` aplanado), `timing?` (enum `{Before, Concurrent, Either}`).
- `rt__MetricThreshold__requirement`: `metric` (enum `{Credits}`, requerido — REQ-03), `scope?` (enum `{plan, category}`), `scopeId?` (string), `operator` (enum, ver REQ-03, requerido), `value` (Float, requerido).

**Actor**: diseñador curricular (admin)
**Layers**: schema (objects/RecordTypes)

<details><summary>Scenarios de validacion</summary>

#### Scenario: RT con campos propios
- **GIVEN** los 3 RT declarados
- **WHEN** se crea un `rt__Group__requirement` con `combinator=OR`, `minToSatisfy=4`
- **THEN** se persiste con esos campos en la tabla del RT (1:1 al base por `requirementId`)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: cada tipo de nodo guarda sus campos propios y `recordtypes-declared.test.ts` reconoce los 3 RT.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | RT declarados | 3 rt JSON | test integration | 3 RT con baseObject correcto | recordtypes-declared |

### REQ-03: enums cerrados y acotados

> **Que cambia**: los tipos, combinadores, operadores y métricas solo aceptan valores de una lista fija; en SP5 `targetType` solo admite `activity` y `metric` solo `Credits`.
> **Por que**: el modelo es la base de un motor de evaluación futuro; valores libres lo harían imposible de razonar.

El sistema MUST declarar todos los enums cerrados: `ownerType`, `recordType`, `effect`, `Group.combinator`, `RecordState.targetType` (solo `activity`), `RecordState.mustBe`, `RecordState.timing`, `MetricThreshold.metric` (solo `Credits`), `MetricThreshold.scope`, `MetricThreshold.operator`. El `operator` modela los símbolos `>=, >, =, <, <=` (valores del enum según convención del mod; en JSON pueden ser literales de símbolo o nombres mapeados a label i18n). El enforcement de enum es por JSON schema (create genérico del platform), NO por resolver (CONSTRAINT H7).

**Actor**: diseñador curricular (admin); system
**Layers**: schema (objects), i18n (labels de enum)

<details><summary>Scenarios de validacion</summary>

#### Scenario: targetType inválido
- **GIVEN** un create de `rt__RecordState__requirement`
- **WHEN** `targetType="course"` (fuera del enum)
- **THEN** el backend lo rechaza

#### Scenario: metric inválido
- **GIVEN** un create de `rt__MetricThreshold__requirement`
- **WHEN** `metric="GPA"` (fuera del enum)
- **THEN** el backend lo rechaza

</details>

#### Acceptance
**El usuario puede verificar que funciona**: guardar un `targetType` ≠ activity o un `metric` ≠ Credits no es posible.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | targetType ≠ activity | objeto | crear RecordState targetType=course | rechazado | TC-02 |
| 2 | metric ≠ Credits | objeto | crear MetricThreshold metric=GPA | rechazado | TC-03 |

### REQ-04: `label` obligatorio

> **Que cambia**: todo nodo del árbol lleva una etiqueta de dominio obligatoria (que además es el nombre visible del bloque electivo).
> **Por que**: sin etiqueta, un requirement es ininteligible para el diseñador; el bloque electivo necesita un nombre ("Electivo de Especialización").

El sistema MUST declarar `requirement.label` como `type: string, not_null: true` (y en `required`). Enforcement por JSON schema (no resolver — CONSTRAINT H7).

**Actor**: diseñador curricular (admin)
**Layers**: schema (objects)

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin label
- **GIVEN** un create de `requirement`
- **WHEN** se omite `label`
- **THEN** el backend lo rechaza (campo requerido)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intentar guardar un requirement sin etiqueta no es posible.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | label requerido | objeto | crear sin label | rechazado | TC-04 |

### REQ-05: el árbol persiste y se reconstruye

> **Que cambia**: una jerarquía de reglas (AND que contiene OR que contiene cursos) se guarda y se vuelve a leer con la misma estructura.
> **Por que**: es la capacidad central del objeto; sin reconstrucción fiel no sirve para nada aguas abajo.

El sistema MUST persistir y reconstruir el árbol por `parentId` (anidamiento solo en `Group`). La persistencia usa el create genérico (raíz primero, hijos con `parentId = raíz.id`). La reconstrucción es un concern de **lectura flat** (`listInstances` filtrable por `ownerId`/`ownerType`/`parentId`) + un **helper puro de ensamblado** `logic/helpers/buildRequirementTree.js` (copia del patrón `buildTree.ts` de CurricularSection, con detección de ciclos). El seed incluye el árbol EST200.

**Actor**: diseñador curricular; system (lectura)
**Layers**: schema (objects), backend (helper puro), seed

<details><summary>Scenarios de validacion</summary>

#### Scenario: EST200 round-trip
- **GIVEN** el árbol EST200: Group[AND]{ Group[OR]{ Group[AND]{MAT110, MAT120}, MAT210 }, MetricThreshold(≥60cr), RecordState(PROG101, advisory) }
- **WHEN** se persiste y se lee el requirement raíz de act_EST200
- **THEN** se reconstruye la jerarquía completa con esos combinadores

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el árbol EST200 sembrado se lee con su jerarquía y combinadores intactos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | persist/read EST200 | fixtures/seed EST200 | reconstruir | árbol idéntico | TC-01 |

### REQ-06: FK polimórfica + validación en capa app

> **Que cambia**: un requirement "pertenece" a un curriculum, activity u offering vía la pareja `ownerType`/`ownerId`, sin una FK real por tipo.
> **Por que**: una FK polimórfica evita 3 columnas y permite extender owners; el costo es que la integridad la cuida la app, no la DB.

El sistema MUST modelar `ownerId` SIN integridad referencial en DB (convención, igual que `CurricularSection.ownerId` y `Curriculum.ownerId`). El resolver DEBERÍA validar `ownerType↔ownerId`, PERO en SP5 se resuelve por **convención documentada** (no resolver nuevo): CurricularSection no la valida, y añadir validación exigiría extender el override singleton de `createInstance` (CONSTRAINT H7). Se documenta la convención en el objeto y en `docs/`.

**Actor**: diseñador curricular (admin); system
**Layers**: schema (objects), docs

<details><summary>Scenarios de validacion</summary>

#### Scenario: ownerId inexistente
- **GIVEN** un create con `ownerType=activity` y `ownerId` inexistente
- **WHEN** se crea
- **THEN** la app NO bloquea por FK (convención documentada; el owner se valida en capa de aplicación / al evaluar, fuera de SP5)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el modelo acepta la pareja owner sin FK DB, y la convención queda documentada (no hay integridad referencial en la base).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | owner sin FK | resolver | crear ownerId inexistente | aceptado; convención documentada | TC-05 |

### REQ-07: layouts por RecordType (sin menú)

> **Que cambia**: cada tipo de nodo tiene su propio formulario de ver/editar/crear, y `requirement` NO aparece en el menú de objetos.
> **Por que**: se edita embebido bajo su owner, igual que las secciones de un programa; ponerlo en el menú confundiría al usuario con un objeto "suelto".

El sistema MUST declarar layouts por RecordType (`config/layouts/default_rt__<RT>__requirement_{view,edit,create}.json`) copiando el patrón CurricularSection: `layoutType: "RecordDetail"`, `applicationId: null`, `tenants: ["UPU"]`, `id`==`name`==filename. `resolveDefaultLayout` los resuelve por convención. El sistema MUST NO declarar ningún `_list` para `requirement` ni sus RT (sub-estructura embebida). Si el codegen genera un list por defecto, setearle `showInNav: false`. Actualizar el conteo esperado en `tests/integration/layouts-declared.test.ts`.

**Actor**: diseñador curricular (admin); system (suite)
**Layers**: config (layouts), i18n (lang)

<details><summary>Scenarios de validacion</summary>

#### Scenario: layout del RT
- **GIVEN** layouts de RT declarados y sincronizados
- **WHEN** se abre el RecordDetail de un `rt__RecordState__requirement`
- **THEN** usa el layout del RT (no el del base)

#### Scenario: ausente del menú
- **GIVEN** el sync aplicado
- **WHEN** se abre el menú de objetos
- **THEN** `requirement` no aparece (sin `_list` con showInNav)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el detalle de cada tipo usa su layout; `requirement` no está en el menú lateral de objetos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | layout por RT | layouts | abrir RecordDetail RecordState | layout del RT | TC-08 |
| 2 | no-menú | sync | abrir menú | requirement ausente | TC-09 |

### REQ-08: `recordType` extensible (documentado)

> **Que cambia**: el modelo deja la puerta abierta a tipos de regla futuros (p.ej. coincidencia por atributo) sin implementarlos ahora.
> **Por que**: anticipa SP6+ sin inflar SP5; documentar la extensibilidad evita que un futuro dev crea que el enum es definitivo.

El sistema MUST documentar que `recordType` es un enum extensible (futuros: `AttributeMatch`, etc.) sin implementarlos en SP5. Nota en el objeto/`docs/`.

**Actor**: diseñador curricular; dev futuro
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: la documentación del objeto explica que `recordType` se ampliará en el futuro y cómo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | nota presente | doc | leer | extensibilidad documentada | inspección |

### REQ-09: bloque electivo = Group sobre el plan (SHOULD)

> **Que cambia**: un "bloque electivo" (ej. "Electivo de Especialización: elige 4, suma 24 créditos") se expresa como un nodo Group OR colgando del currículo.
> **Por que**: reusa el árbol de reglas para los electivos en vez de inventar un objeto aparte; el nombre del bloque es el `label`.

El sistema SHOULD permitir modelar un bloque electivo como `requirement(recordType=Group, ownerType=curriculum, combinator=OR, minToSatisfy/creditsRequired)`; el nombre del bloque = `label`. El seed §2.6 incluye "Electivo de Especialización" (OR, minToSatisfy=4, creditsRequired=24, ownerType=curriculum).

**Actor**: diseñador curricular (admin)
**Layers**: schema (reuse), seed

<details><summary>Scenarios de validacion</summary>

#### Scenario: bloque electivo sembrado
- **GIVEN** el seed §2.6
- **WHEN** se lee el bloque "Electivo de Especialización"
- **THEN** es Group OR, minToSatisfy=4, creditsRequired=24, ownerType=curriculum

</details>

#### Acceptance
**El usuario puede verificar que funciona**: existe un bloque electivo sembrado con su nombre, combinador OR y umbrales.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | bloque electivo | seed | leer | Group OR, minToSatisfy=4, creditsRequired=24 | TC-06 |

### REQ-10: electividad derivada de membresía (SHOULD)

> **Que cambia**: si una asignatura del plan pertenece a un bloque (`planEntry.blockId != null`) es electiva; si no, obligatoria. No hay un flag independiente.
> **Por que**: la electividad es una propiedad de la pertenencia al bloque; un flag aparte se desincronizaría (mismo principio que REQ-04 de MC-02).

El sistema SHOULD derivar la electividad de un curso del plan de `planEntry.blockId` (`== null` → obligatorio; `!= null` → electivo). "Electivos de una línea" = entries con `blockId != null` agrupados por `categoryId`. Se entrega como query/helper de derivación documentado (no objeto nuevo). Reutiliza `planEntry` (MC-02).

**Actor**: diseñador curricular; system (lectura)
**Layers**: backend (query/helper), docs

<details><summary>Scenarios de validacion</summary>

#### Scenario: derivar electividad
- **GIVEN** 3 planEntries: 2 con `blockId` set, 1 con `blockId=null`
- **WHEN** se deriva la electividad
- **THEN** las 2 con blockId = electivas; la sin blockId = obligatoria

</details>

#### Acceptance
**El usuario puede verificar que funciona**: las asignaturas con bloque aparecen como electivas y las sin bloque, obligatorias.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | derivación blockId | 3 entries blockId null/X/Y | derivar | 2 electivas / 1 obligatoria | TC-07 |

## Artifacts

### Models (objeto nuevo + 3 RecordTypes)

**`objects/requirement.json`** (REQ-01,03,04,06):

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `ownerType` | enum `[curriculum,activity,offering]` | no | — | Tipo de owner (FK polimórfica) |
| `ownerId` | string | no | — | ID del owner; SIN FK enforced (REQ-06, convención) |
| `parentId` | string (self-FK→requirement) | sí | — | Árbol Composite (REQ-05); anida solo en Group |
| `recordType` | enum `[Group,RecordState,MetricThreshold]` | no | — | Discriminador (REQ-08 extensible) |
| `effect` | enum `[EligibilityToEnroll,ProgressGate,Completion,DiplomaAward]` | no | — | Efecto de la regla |
| `label` | string | no | — | Etiqueta de dominio (REQ-04); nombre del bloque electivo |
| `isHardRule` | boolean | sí | `true` | Regla dura vs advisory |
| `negate` | boolean | sí | `false` | Negación de la condición |
| `overrideMode` | string | sí | — | Solo válido si ownerType=offering; valores no fijados en SP5 (sin enum cerrado) |
| `position` | integer | sí | — | Orden entre hermanos |

`metadata.directChildren` (recursiva por `parentId`), `metadata.indexes`: `ownerType, ownerId, recordType` + `parentId`.

**`objects/RecordTypes/rt__Group__requirement.json`** (REQ-02):

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `combinator` | enum `[AND,OR]` | no | Combinador de hijos |
| `minToSatisfy` | integer | sí | K-de-N |
| `creditsRequired` | integer | sí | Créditos mínimos del grupo |

**`objects/RecordTypes/rt__RecordState__requirement.json`** (REQ-02,03):

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `targetType` | enum `[activity]` | no | Único soportado en SP5 |
| `targetId` | string | no | ID del curso objetivo |
| `mustBe` | enum `[Approved,Taken]` | no | Estado exigido |
| `thresholdMinGrade` | number (Float) | sí | Nota mínima (`threshold{minGrade}` aplanado) |
| `timing` | enum `[Before,Concurrent,Either]` | sí | Momento de la exigencia |

**`objects/RecordTypes/rt__MetricThreshold__requirement.json`** (REQ-02,03):

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `metric` | enum `[Credits]` | no | Único soportado en SP5 |
| `scope` | enum `[plan,category]` | sí | Alcance de la métrica |
| `scopeId` | string | sí | ID del alcance (si aplica) |
| `operator` | enum `[>=,>,=,<,<=]` | no | Comparador |
| `value` | number (Float) | no | Valor umbral |

### Helpers / lógica (sin override de resolver — CONSTRAINT H7 intacto)

| File | Cambio | source_ref |
|------|--------|------------|
| `logic/helpers/buildRequirementTree.js` | helper puro: items planos (de `listInstances`) → árbol por `parentId`, con detección de ciclos. Copia del patrón `modsComponents/CompositeSectionTree/buildTree.ts` | REQ-05 |
| `logic/helpers/deriveElectivity.js` | helper puro: dada una lista de `planEntry`, deriva `isElective = blockId != null` y agrupa "electivos de línea" por `categoryId` | REQ-10 |

> NO se crea override de `createInstance`/`getInstance`/`updateInstance` para requirement: el CRUD genérico persiste y lee (flat); el ensamblado del árbol y la derivación son helpers puros consumibles por tests/UI futura. UPDATE de rt__requirement NO se soporta en SP5 (decisión #4, backlog).

### i18n (lang)

| File | Key | Valor |
|------|-----|-------|
| `lang/es_CL@requirement.json` | labels de columnas base + `enums.{ownerType, recordType, effect}` | (es_CL) |
| `lang/es_CL@rt__Group__requirement.json` | labels + `enums.combinator` | Y / O |
| `lang/es_CL@rt__RecordState__requirement.json` | labels + `enums.{targetType, mustBe, timing}` | (es_CL) |
| `lang/es_CL@rt__MetricThreshold__requirement.json` | labels + `enums.{metric, scope, operator}` | (es_CL) |

### Layouts (config) — sin `_list`, RecordDetail por RT

| File | Cambio |
|------|--------|
| `config/layouts/default_rt__Group__requirement_{view,edit,create}.json` | RecordDetail, applicationId:null, tenants:[UPU] |
| `config/layouts/default_rt__RecordState__requirement_{view,edit,create}.json` | idem |
| `config/layouts/default_rt__MetricThreshold__requirement_{view,edit,create}.json` | idem |
| `tests/integration/layouts-declared.test.ts` | actualizar conteo esperado (+9 layouts) |

### Seed

| File | Contenido |
|------|-----------|
| `seed/_data-requirement.js` (nuevo) | árbol EST200 (REQ-05) sobre act_EST200 + bloque electivo §2.6 "Electivo de Especialización" (Group OR, minToSatisfy=4, creditsRequired=24, ownerType=curriculum) sobre un curriculum del seed |
| `seed/seed.js` | registrar el nuevo data module |

### Docs

| File | Contenido |
|------|-----------|
| `docs/` (mod) o nota en objeto | convención `ownerType↔ownerId` (REQ-06); extensibilidad de `recordType` (REQ-08); derivación de electividad (REQ-10); no-soporte de update rt__ en SP5 (decisión #4) |

## Tasks

### Session 1 — objeto base `requirement` + 3 RecordTypes + codegen/sync [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S1.T1, S1.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `objects/requirement.json`: campos REQ-01 (ownerType enum, ownerId sin FK, parentId self-FK con isForeignKey/references/targetField, recordType enum, effect enum, label not_null REQ-04, isHardRule/negate static_default string, overrideMode string opcional, position), `required: [ownerType, ownerId, recordType, effect, label]`, `metadata.directChildren` (recursiva parentId), `metadata.indexes` (REQ-01), `defaultLayoutType` | REQ-01,03,04,06 | developer | — | `objects/requirement.json` | inspección JSON + validate (rechazo runtime DB-gated en S1.T3) | eliminar archivo + `reset-mods` | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T2 | Crear los 3 RT (`objects/RecordTypes/rt__Group__requirement.json`, `rt__RecordState__requirement.json`, `rt__MetricThreshold__requirement.json`): `baseObject: requirement` + props propias con enums cerrados (REQ-02,03). targetType=activity y metric=Credits enum de un solo valor | REQ-02,03 | developer | — | `objects/RecordTypes/rt__Group__requirement.json`, `objects/RecordTypes/rt__RecordState__requirement.json`, `objects/RecordTypes/rt__MetricThreshold__requirement.json` | `recordtypes-declared.test.ts` (vitest del mod) | eliminar archivos | DET-1, DET-2, DET-8 | done | 1 |
| S1.T3 | Codegen + sync en UPU (additivo): correr el sync del mod, verificar que el objeto + 3 tablas RT existen en el schema generado y que los enums quedan cerrados (`core_FieldDefinition`/typeDefs). Validar rechazo runtime de enums/required (TC-02,03,04) | REQ-01,02,03,04 | developer | S1.T1, S1.T2 | (artefactos de sync — no se commitean) | sync limpio + TC-02,03,04 (rechazo runtime, DB-gated) | `reset-mods` (regenera sin requirement) | DET-5, DET-11, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2, ⚑ fuerte)** — persistir en `## Sessions` (Template de Gate), quality review (reviewer aislado, DET-30/35), validación T2, consolidar TC-02,03,04 con evidencia, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decisión + TCs con evidencia | (no aplica — cierre de session) | DET-20, DET-23, DET-30, DET-35 | done | 1 |

### Session 2 — lectura/reconstrucción del árbol + helpers + doc convención [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Helper puro `logic/helpers/buildRequirementTree.js` (items planos → árbol por parentId, detección de ciclos) — copia del patrón `buildTree.ts`. Unit test que reconstruye el árbol EST200 desde fixtures planos (TC-01) | REQ-05 | developer | S1.GATE | `logic/helpers/buildRequirementTree.js`, `tests/unit/buildRequirementTree.test.js` | TC-01 (vitest del mod) | revertir helper + test (git revert) | DET-7, DET-8, DET-11 | done | 2 |
| S2.T2 | Doc de convención `ownerType↔ownerId` (REQ-06): nota en `objects/requirement.json` (description) + `docs/` del mod explicando que `ownerId` no tiene FK DB (convención, validación en capa app/evaluación futura). Decisión #4 (no update rt__ en SP5) + backlog item registrado | REQ-06 | developer | S1.GATE | `objects/requirement.json` (description), `docs/` (mod) | inspección (TC-05: aceptado + doc) | revertir doc (git revert) | DET-4, DET-8, DET-16 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, quality review aislado (DET-30/35), validación T2, consolidar TC-01, TC-05 con evidencia, decidir continue/iterate/escalate/standby | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido + decisión + TCs con evidencia | (no aplica) | DET-20, DET-23, DET-30, DET-35 | done | 2 |

### Session 3 — layouts por RT + lang + verificación de no-menú [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S3.T1, S3.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Lang es_CL: `lang/es_CL@requirement.json` (labels base + enums ownerType/recordType/effect) + 3 × `lang/es_CL@rt__<RT>__requirement.json` (labels + enums por RT), con `_source_module` | REQ-03 | developer | S2.GATE | `lang/es_CL@requirement.json`, `lang/es_CL@rt__Group__requirement.json`, `lang/es_CL@rt__RecordState__requirement.json`, `lang/es_CL@rt__MetricThreshold__requirement.json` | inspección + sync lang | revertir lang (git revert) | DET-8, DET-16, RULE-curriculum-design-005 | done | 3 |
| S3.T2 | Layouts por RT (9): `default_rt__<RT>__requirement_{view,edit,create}.json` (RecordDetail, applicationId:null, tenants:[UPU], id==name==filename) copiando patrón CurricularSection. SIN `_list`. Actualizar conteo en `tests/integration/layouts-declared.test.ts` | REQ-07 | developer | S2.GATE | `config/layouts/default_rt__Group__requirement_{view,edit,create}.json`, `config/layouts/default_rt__RecordState__requirement_{view,edit,create}.json`, `config/layouts/default_rt__MetricThreshold__requirement_{view,edit,create}.json`, `tests/integration/layouts-declared.test.ts` | `layouts-declared.test.ts` + `recordtypes-declared.test.ts` (vitest del mod) | revertir layouts + conteo (git revert) | DET-8, DET-16 | done | 3 |
| S3.T3 | Sync de layouts a la suite + verificar empíricamente: (a) RecordDetail de un RT usa el layout del RT (TC-08); (b) `requirement` NO aparece en el menú de objetos (TC-09); si el codegen generó un `_list` por defecto, setearle `showInNav:false` | REQ-07 | developer | S3.T1, S3.T2 | (sync de suite — no se commitea) + posible `config/layouts/*_list*.json` (showInNav:false) | TC-08, TC-09 (smoke UI, DB-gated) | revertir showInNav (git revert) | DET-5, DET-13, DET-16 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3, ⚑ fuerte)** — persistir, quality review aislado (DET-30/35), regression T3 (vitest del mod + smoke UI), consolidar TC-08, TC-09 con evidencia, decidir continue/iterate/escalate/standby | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + regression + smoke + decisión | (no aplica) | DET-13, DET-16, DET-20, DET-23, DET-30, DET-35 | done | 3 |

### Session 4 — seed EST200 + bloque electivo + derivación + doc extensibilidad [tipo: auto] [tier: T2] (Should)

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Seed `seed/_data-requirement.js`: árbol EST200 (REQ-05) sobre act_EST200 (root primero, hijos con parentId, dos writes Prisma base+rt) + registrar en `seed/seed.js`. Correr sync+seed en UPU; verificar reconstrucción del árbol (TC-01 integration) | REQ-05 | developer | S3.GATE | `seed/_data-requirement.js`, `seed/seed.js` | seed corre sin error en UPU + TC-01 (DB-gated) | quitar seed module (git revert) | DET-5, DET-8, DET-11 | done | 4 |
| S4.T2 | Seed del bloque electivo §2.6 "Electivo de Especialización" (Group OR, minToSatisfy=4, creditsRequired=24, ownerType=curriculum) en `seed/_data-requirement.js`. Verificar lectura (TC-06) | REQ-09 | developer | S4.T1 | `seed/_data-requirement.js` | TC-06 (DB-gated) | quitar bloque del seed (git revert) | DET-5, DET-8 | done | 4 |
| S4.T3 | Derivación electivo/obligatorio (REQ-10): helper `logic/helpers/deriveElectivity.js` (`isElective = blockId != null`, agrupar por categoryId) + unit test con 3 planEntries (TC-07). Doc de la derivación + extensibilidad de `recordType` (REQ-08) en `docs/` | REQ-08,10 | developer | S4.T1 | `logic/helpers/deriveElectivity.js`, `tests/unit/deriveElectivity.test.js`, `docs/` (mod) | TC-07 (vitest del mod) | revertir helper + doc (git revert) | DET-4, DET-7, DET-8, DET-16 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** — persistir, quality review aislado (DET-30/35), validación T2, consolidar TC-01,06,07 con evidencia, propagación DET-16 (MC-04/05/06/08/09, SP6), decidir continue/iterate/escalate/standby | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket | gate persistido + decisión + TCs + propagación | (no aplica) | DET-13, DET-16, DET-20, DET-23, DET-30, DET-35 | done | 4 |

## Constraints

- RULE-dev-004: trabajo mod-only va en rama de épica (`UPONE-1267-sp5`), commits con id externo (UPONE-1346); no `develop`/`main`.
- RULE-curriculum-design-013: mod-only; no commitear artefactos de sync/seed (Base, schema, typeDefs, lang sincronizado al core).
- RULE-curriculum-design-012: convenciones del mod (kb_refs del ticket).
- RULE-curriculum-design-005: friendly-error / reiniciar OM tras `sync:logic`.
- CONSTRAINT H7 (resolver-override): `createInstance`/`updateInstance`/`deleteInstance` son singleton del mod (el scanner registra por nombre, último gana). En SP5 NO se crea override para requirement — enums/required van por JSON schema; el update de rt__ se difiere (no se toca `polymorphicUpdate.resolver.js`).
- DEC-029, DEC-031 (kb_refs del ticket): objeto MCP-ready (enums + FK refs + labels) para MC-04.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| TICKET-082 (MC-02) | internal | `planEntry.blockId` para el bloque electivo (REQ-09/10) | ya closed |
| object-manager (sync + codegen) | internal | aplica objeto/RT al backend core | si el sync choca con drift de BASEMODEL: `SYNC_AUTO_APPLY_SCHEMA=false` o regenerar baseline (no `--accept-data-loss`) |
| suite (layouts por RT) | internal | renderiza los RecordDetail por RT | layouts sin `_list` → no en menú (REQ-07) |
| MC-04/05/06/08/09 (downstream) | internal | consumen el objeto requirement | forward-compatible; no bloquean |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El sync/seed choca con drift de BASEMODEL en UPU | medium | sync falla | workaround `SYNC_AUTO_APPLY_SCHEMA=false` / regenerar baseline; nunca `--accept-data-loss` |
| Agregar layouts rompe el conteo exacto de `layouts-declared.test.ts` | high | test falla | S3.T2 actualiza el conteo esperado al agregar los 9 layouts |
| Copiar mal la convención del RT (FK `requirementId`, baseObject) | low | RT no se genera 1:1 | `recordtypes-declared.test.ts` auto-falla; corregir antes del gate |
| `operator` con símbolos no representable como identificador de enum | low | codegen/enum mal formado | declarar enum según convención del mod (símbolos como literales o nombres mapeados a label i18n); verificar en S1.T3 |
| Necesidad real de editar requirements (update rt__) emerge en MC-05/06 | medium | re-trabajo | backlog item: extender `RT_PATTERN` de polymorphicUpdate + regression CurricularSection cuando llegue la UI de edición |

## Open questions

Ninguna bloqueante. Las decisiones menores (overrideMode sin enum cerrado; operator como símbolos vs nombres) se resuelven en S1 con racional registrado y verificación empírica del codegen.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: enums/required por JSON schema, NO por resolver (CONSTRAINT H7)
- **Contexto**: REQ-03 (enums cerrados) y REQ-04 (label requerido) necesitan enforcement en create.
- **Drivers**: el mod ya tiene `createInstance` override (`sectionValidation.resolver.js`); el scanner del platform registra resolvers por nombre y el último gana — un segundo override colisiona (CONSTRAINT H7).
- **Opcion elegida**: declarar `enum`/`required`/`not_null` en el JSON schema; el create genérico del platform los enforcea (mismo mecanismo que CurricularSection).
- **Alternativas**: override nuevo de createInstance (rechazada: colisiona con sectionValidation); extender sectionValidation para requirement (rechazada: acopla validación de enums a un resolver de reglas de negocio, innecesario — el schema ya lo hace).
- **Consecuencias**: cero resolver nuevo; CONSTRAINT H7 intacto; enforcement DB-gated (verificado en S1.T3).
- **Session**: design.

### DEC-LOCAL-02: `ownerType↔ownerId` por convención documentada, no resolver (REQ-06)
- **Contexto**: REQ-06 dice que el resolver DEBERÍA validar la pareja polimórfica; TC-05 permite "(o doc convención)".
- **Drivers**: CurricularSection NO la valida (`ownerId` sin FK; ningún resolver la chequea); validar exigiría extender el override singleton de createInstance (H7).
- **Opcion elegida**: documentar la convención en el objeto + `docs/`; sin código.
- **Alternativas**: validación en resolver (rechazada: H7 + sobre-ingeniería para SP5, sin motor de evaluación que la consuma aún).
- **Consecuencias**: alineado al patrón existente; la validación real vive en la capa de evaluación (SP6).
- **Session**: design.

### DEC-LOCAL-03: reconstrucción del árbol = lectura flat + helper puro, NO resolver de tree (REQ-05)
- **Contexto**: REQ-05 exige persistir y reconstruir el árbol.
- **Drivers**: CurricularSection no tiene resolver de tree (usa `listInstances` genérico + `buildTree.ts` en frontend + seed root→children); `creates_visual:false` (sin UI nueva en SP5).
- **Opcion elegida**: create genérico para persistir; helper puro `buildRequirementTree.js` (copia de `buildTree.ts`) para reconstruir; unit test sobre fixtures EST200 (TC-01).
- **Alternativas**: override de getInstance que devuelva el árbol anidado (rechazada: innecesario sin UI; el read-enrichment se justifica para campos derivados como en MC-02, no para nesting que el cliente arma).
- **Consecuencias**: TC-01 verificable a nivel unit sin DB/UI; la UI futura (MC-05/06) reusa el mismo helper.
- **Session**: design.

### DEC-LOCAL-04: NO soportar UPDATE de `rt__*__requirement` en SP5 (backlog)
- **Contexto**: el pre-spec listaba "resolvers create/read/update"; el update de RT polimórficos tiene un bug conocido (`_previousData`) que `polymorphicUpdate.resolver.js` arregla solo para `curricularsection` (RT_PATTERN hardcoded).
- **Drivers**: ningún REQ/TC pide update (REQ-05 = persistir+reconstruir = create+read); soportarlo exige extender el RT_PATTERN de un resolver compartido → riesgo de regresión de CurricularSection; nota de calibración del ticket: "7 SP es piso; recortar Should antes que el núcleo".
- **Opcion elegida**: diferir. SP5 entrega create + read. Backlog item: extender `RT_PATTERN` a `(curricularsection|requirement)` + regression de CurricularSection cuando MC-05/06 necesite edición por UI.
- **Alternativas**: incluir el update ahora (rechazada: scope-creep sobre REQ-05, toca código compartido sin necesidad inmediata).
- **Consecuencias**: forward-compatible; el objeto se crea y lee; la edición llega con su consumidor real.
- **Session**: design.

## Backlog

| # | Item | Priority | Trigger | Status |
|---|------|----------|---------|--------|
| BL-1 | Soportar UPDATE de `rt__*__requirement`: extender `RT_PATTERN` de `logic/polymorphicUpdate.resolver.js` a `(curricularsection|requirement)` + regression de CurricularSection | should | cuando MC-05/06 necesite editar requirements por UI | open |

## Acceptance checkpoints

- [ ] **Funcional**: REQ-01..10 satisfechos (objeto + 3 RT + helpers + layouts + seed; bloque electivo + derivación Should).
- [ ] **Tests**: TC-01..09 verificados (vitest del mod + smoke UI DB-gated) con evidencia.
- [ ] **NFRs**: n/a.
- [ ] **Rules**: mod-only respetado; solo source del mod committeado (sin artefactos de sync/seed); CONSTRAINT H7 respetado (sin override nuevo).
- [ ] **Integration**: sync corrió limpio en UPU; objeto + 3 RT propagados; CurricularSection sin regresión (comparten patrón).
- [ ] **Docs**: convención ownerType↔ownerId + extensibilidad recordType + derivación documentadas; propagación DET-16 a MC-04/05/06/08/09 + SP6 registrada; backlog BL-1 capturado.
