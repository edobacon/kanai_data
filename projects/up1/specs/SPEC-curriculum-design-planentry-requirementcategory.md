---
id: SPEC-curriculum-design-planentry-requirementcategory
project: up1
ticket: TICKET-082
status: done
---

# Malla — objetos `planEntry` + `requirementCategory`

# Malla — objetos `planEntry` + `requirementCategory`

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: crear las dos piezas de datos base de la malla curricular en el mod `curriculum-design`, copiando el patrón ya probado de `CurricularSection`. (1) `planEntry` coloca una asignatura (`Activity`) en un período de un plan; trae el crédito efectivo por herencia (`credits ?? Activity.credits`), deriva la electividad de `blockId` (sin flag), y discrimina por `kind` enum `{Course, Internship, Thesis}`. (2) `requirementCategory` es la línea de formación que agrupa entries y declara un rango de créditos (`minCredits`/`maxCredits`), con validación min≤max, guard de borrado y `color`/`icon` modelados. Mod-only, aditivo. Habilita MC-03/04/05/06/07.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Crédito efectivo, electividad y "créditos actuales" se **derivan en lectura enriqueciendo `item.data`** desde un override de `getInstance`/`listInstances` (NO field resolvers GraphQL — un mod no puede registrar type field resolvers, learn L1) | Evita data redundante y desincronizada; `effectiveCredits`/`isElective`/`currentCredits` se calculan al leer (REQ-03/04/10), patrón `curriculum-read.resolver.js` |
| 2 | Las validaciones min≤max (REQ-08) se cablean DENTRO de los overrides singleton existentes (`createInstance` en `sectionValidation.resolver.js`, `updateInstance` en `polymorphicUpdate.resolver.js`) vía helper, NO como override nuevo | CONSTRAINT H7: el scanner registra resolvers por nombre y el último gana en colisión; dos archivos no pueden exportar el mismo campo de Mutation |
| 3 | Guard de borrado (REQ-09) = primario **A** (`categoryId` FK con `onDelete: Restrict`); fallback **B** (validación de dominio con mensaje "reasigna primero") si el codegen no honra `onDelete` o si el mensaje exacto es requisito de negocio — se verifica empíricamente en S2 | A es menos código (lo hace la DB); B garantiza el mensaje. Decisión menor resuelta con racional + verificación (autopilot super) |
| 4 | `period` es **requerido** (Int); `blockId` es string opcional sin FK enforced (el objeto bloque llega en MC-03) | SP5 solo soporta planes secuenciales (modular → SP6, BL-6); `blockId` queda forward-compatible |

**Riesgos principales y como los mitigamos**:

- **El codegen podría no honrar `onDelete: Restrict`** → S2 verifica empíricamente; si falla, fallback a guard de dominio B (mismo patrón `lineageUniqueness`), sin bloquear el cierre.
- **El sync/seed contra UPU podría chocar con drift de BASEMODEL** → S3 corre sync; si choca, workaround `SYNC_AUTO_APPLY_SCHEMA=false` (memoria up1) o regenerar baseline; nunca `--accept-data-loss`.
- **Una validación nueva en el override singleton rompe un consumidor existente (Modality/EvaluationComponent/Curriculum)** → la validación despacha por `objectType` (no-op fuera de scope, REQ-PRESERVE), y el reviewer aislado re-verifica en el gate.

**Que NO se hace en este ticket** (limites explicitos del scope):

- El objeto "bloque electivo" (lo crea MC-03); aquí `blockId` es solo un string opcional.
- UI/componentes nuevos: layouts RecordList/RecordDetail estándar reusados, sin componente Vue nuevo.
- Lógica de planes modulares (SP6, BL-6) — `period` requerido en SP5.
- Commit de artefactos generados por sync/seed (Base, schema Prisma, typeDefs, lang sincronizado al core) — solo source del mod.

**Tamano estimado**: 3 sessions (~5 SP). S1 (planEntry + resolvers) T2, S2 (requirementCategory + validaciones) T2, S3 (lang + layouts + seed + smoke) T3 ⚑ fuerte. La más riesgosa es S3 (seed contra UPU + layouts en la suite).

**Como vas a saber que funciona**:

- Crear un `planEntry` sin `period` es rechazado; con `credits=null` la lectura devuelve el crédito de la `Activity`; con `blockId` set, la lectura lo marca electivo.
- Crear una `requirementCategory` con `minCredits=30, maxCredits=20` es rechazado; borrar una categoría con entries asignados es rechazado ("reasigna primero"); sus "créditos actuales" suman los efectivos de sus entries.
- El sync corre limpio en UPU y el seed crea las 4 categorías de la maqueta con sus colores.

---

## Purpose

Crear dos objetos nuevos del mod `curriculum-design`: `planEntry` (coloca una `Activity` en un `period` de un plan, con crédito efectivo heredado y electividad derivada) y `requirementCategory` (línea de formación que agrupa entries y declara rango de créditos). Cambio mod-only, aditivo, copiando el patrón de `CurricularSection`. Son el dato base de la malla curricular e insumo directo de MC-03 (bloque electivo), MC-04 (MCP), MC-05/06 (malla visual) y MC-07 (líneas).

## Requirements

### REQ-01: objeto `planEntry`

> **Que cambia**: aparece un objeto nuevo que representa "esta asignatura va en este período de este plan", con su clasificación opcional (categoría/bloque) y su tipo (curso/práctica/tesis).
> **Por que**: es la unidad atómica de la malla; sin él no hay dónde colocar las asignaturas del plan.

El sistema MUST definir `objects/planEntry.json` con los campos: `planId` (FK→Curriculum, requerido), `activityId` (FK→Activity, requerido), `categoryId?` (FK→requirementCategory), `blockId?` (string, sin FK enforced — bloque llega en MC-03), `kind` (enum, ver REQ-06), `period` (Int, requerido — REQ-02), `position?` (Int), `credits?` (Int), `sourceEntryId?` (self), timestamps. Patrón copiado de `CurricularSection` (FK con `isForeignKey`/`references`/`targetField`, `defaultLayoutType: "RecordList"`).

**Actor**: diseñador curricular (admin)
**Layers**: schema (objects), backend (codegen/sync)

<details><summary>Scenarios de validacion</summary>

#### Scenario: create válido
- **GIVEN** un plan y una activity existentes
- **WHEN** se crea un `planEntry` con `planId`, `activityId`, `period`, `kind=Course`
- **THEN** se persiste sin error

#### Scenario: FK inexistente
- **GIVEN** un `activityId` que no existe
- **WHEN** se crea el `planEntry`
- **THEN** el backend rechaza por violación de FK

</details>

#### Acceptance
**El usuario puede verificar que funciona**: puede crear una entrada de plan referenciando una asignatura y un período, y aparece en el listado del objeto.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | create válido | plan+activity | crear entry con period | persiste | TC-01 |

### REQ-02: `period` requerido

> **Que cambia**: no se puede crear una entrada de plan sin decir en qué período va.
> **Por que**: SP5 solo soporta planes secuenciales; el período es obligatorio (modular nullable → SP6).

El sistema MUST definir `planEntry.period` como `type: integer`, `not_null: true`. La regla de qué período es válido depende del enum `progression` del plan (aportado por MC-01).

**Actor**: diseñador curricular (admin); system (sync)
**Layers**: schema (objects)

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin period
- **GIVEN** un create de `planEntry`
- **WHEN** se omite `period`
- **THEN** el backend lo rechaza (campo requerido)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intentar guardar una entrada sin período no es posible.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | period requerido | objeto | crear sin period | rechazado | TC-01 |

### REQ-03: créditos efectivos por herencia

> **Que cambia**: al leer una entrada de plan, su crédito muestra el de la entrada si lo tiene, o el de la asignatura si no.
> **Por que**: evita duplicar el crédito en cada colocación y permite override puntual sin desincronizar.

El sistema MUST exponer en lectura el crédito efectivo de un `planEntry` como `planEntry.credits ?? Activity.credits`, vía field resolver GraphQL (campo derivado `effectiveCredits`), sin persistir el valor heredado.

**Actor**: diseñador curricular; system (lectura)
**Layers**: backend (resolver), api (schema.graphql)

<details><summary>Scenarios de validacion</summary>

#### Scenario: hereda
- **GIVEN** un `planEntry` con `credits=null` y su `Activity.credits=6`
- **WHEN** se lee el crédito efectivo
- **THEN** = 6 (heredado)

#### Scenario: override
- **GIVEN** un `planEntry` con `credits=4` y su `Activity.credits=6`
- **WHEN** se lee el crédito efectivo
- **THEN** = 4 (override)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: una entrada sin crédito propio muestra el de su asignatura; una con crédito propio muestra el suyo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | herencia | entry credits=null, activity=6 | leer efectivo | 6 | TC-02 |
| 2 | override | entry credits=4, activity=6 | leer efectivo | 4 | TC-03 |

### REQ-04: electividad derivada (sin flag)

> **Que cambia**: una entrada es "electiva" si pertenece a un bloque; no hay un campo sí/no que mantener.
> **Por que**: la electividad es una propiedad del bloque, no un atributo independiente que pueda desincronizarse.

El sistema MUST derivar la electividad de un `planEntry` de `blockId` (`blockId != null` → electiva; `null` → obligatoria), vía field resolver GraphQL (`isElective: Boolean`). NO debe existir campo persistido `isElective`.

**Actor**: diseñador curricular; system (lectura)
**Layers**: backend (resolver), api (schema.graphql)

<details><summary>Scenarios de validacion</summary>

#### Scenario: obligatoria vs electiva
- **GIVEN** dos entries, una con `blockId=null` y otra con `blockId=X`
- **WHEN** se lee `isElective`
- **THEN** la primera = false (obligatoria), la segunda = true (electiva)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: una entrada con bloque asignado se muestra como electiva; una sin bloque, como obligatoria.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | derivar electividad | entries blockId null/X | leer isElective | false/true | TC-04 |

### REQ-05: índices de consulta

> **Que cambia**: las consultas de la malla (entries por plan, por categoría, por bloque, ordenadas por período) quedan indexadas.
> **Por que**: sin índices, pintar la malla haría full-scans a medida que crecen los planes.

El sistema SHOULD indexar `planId`, `categoryId`, `blockId` y el compuesto `(planId, period, position)` en `planEntry` (vía `metadata.indexes` del objeto).

**Actor**: system (consultas de la malla)
**Layers**: schema (objects)

#### Acceptance
**Entregable vía el workaround del mod (S3, learn L2)**: el codegen NO honra `metadata.indexes` (verificado: `planEntry`/`CurricularSection` sin `@@index` en el schema), PERO el mod ya tiene la vía de entrega — `seed/_data-indexes.js` (`ensureIndexes`) crea los índices vía `CREATE INDEX IF NOT EXISTS` en cada sync (workaround L23, idempotente, mod-only). S3 agregó los 5 índices de REQ-05 (`planEntry`: planId, categoryId, blockId, (planId,period,position); `requirementCategory`: curriculumId). Se materializan al correr `npm run sync` (DB-gated).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | índices presentes | objeto con indexes | sync | ~~índices en schema~~ → **no materializados (gap codegen, L2)** | n/a — platform gap |

### REQ-06: discriminador `kind`

> **Que cambia**: cada entrada de plan declara si es un curso, una práctica o una tesis.
> **Por que**: la malla las trata distinto; en SP5 la UI solo crea cursos, pero el modelo reserva los otros tipos.

El sistema MUST definir `planEntry.kind` como `enum: ["Course", "Internship", "Thesis"]` con `static_default: "Course"`. La UI solo crea `Course` en SP5; `Internship`/`Thesis` quedan reservados (sin seed).

**Actor**: diseñador curricular (admin)
**Layers**: schema (objects), i18n (labels del enum)

<details><summary>Scenarios de validacion</summary>

#### Scenario: enum válido/inválido
- **GIVEN** un create de `planEntry`
- **WHEN** se setea `kind="Foo"` (fuera del enum)
- **THEN** el backend lo rechaza

</details>

#### Acceptance
**El usuario puede verificar que funciona**: guardar un tipo fuera de {Course, Internship, Thesis} no es posible.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | kind fuera del enum | objeto | crear con kind inválido | rechazado | TC-09 |

### REQ-07: objeto `requirementCategory`

> **Que cambia**: aparece un objeto "línea de formación" (núcleo, electivos, etc.) que agrupa entradas del plan y declara un rango de créditos.
> **Por que**: sin él no hay forma de organizar la malla por áreas ni de sumar créditos por línea.

El sistema MUST definir `objects/requirementCategory.json` con: `curriculumId` (FK→Curriculum, requerido), `name` (requerido), `code?`, `minCredits` (Int, requerido), `maxCredits?` (Int), `position?` (Int), `description?`, `color?` (string), `icon?` (string), timestamps. `defaultLayoutType: "RecordList"`.

**Actor**: diseñador curricular (admin)
**Layers**: schema (objects), backend (codegen/sync)

<details><summary>Scenarios de validacion</summary>

#### Scenario: create válido
- **GIVEN** un currículo existente
- **WHEN** se crea una `requirementCategory` con `name`, `minCredits`
- **THEN** se persiste sin error

</details>

#### Acceptance
**El usuario puede verificar que funciona**: puede crear una línea de formación con nombre y créditos mínimos y aparece en el listado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | create válido | curriculum | crear categoría | persiste | inspección |

### REQ-08: validación min≤max

> **Que cambia**: no se puede declarar una línea de formación cuyo crédito mínimo sea mayor que el máximo.
> **Por que**: un rango invertido es un dato incoherente que rompería los cálculos de la malla.

El sistema MUST rechazar `minCredits > maxCredits` cuando `maxCredits` está definido, tanto en create como en update. La validación se cablea dentro de los overrides singleton existentes (`createInstance` en `sectionValidation.resolver.js`, `updateInstance` en `polymorphicUpdate.resolver.js`) vía un helper de dominio, despachando por `objectType` (no-op fuera de scope).

**Actor**: diseñador curricular (admin)
**Layers**: backend (resolver/helpers)

<details><summary>Scenarios de validacion</summary>

#### Scenario: rango inválido
- **GIVEN** un create/update de `requirementCategory`
- **WHEN** `minCredits=30, maxCredits=20`
- **THEN** el backend lo rechaza

#### Scenario: max ausente
- **GIVEN** un create con `minCredits=30` y `maxCredits=null`
- **THEN** se acepta (sin tope)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intentar guardar mínimo>máximo es rechazado con un error claro.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | min>max | resolver | crear min=30,max=20 | rechazado | TC-05 |

### REQ-09: guard de borrado

> **Que cambia**: no se puede borrar una línea de formación que todavía tiene asignaturas asignadas; primero hay que reasignarlas.
> **Por que**: borrarla dejaría entries "huérfanos" apuntando a una categoría inexistente.

El sistema MUST rechazar el borrado de una `requirementCategory` si existe algún `planEntry` con ese `categoryId`. Implementación primaria **A**: FK `planEntry.categoryId` con `onDelete: Restrict` (la DB bloquea). Fallback **B** (si el codegen no honra `onDelete` o si se requiere el mensaje "reasigna primero"): validación de dominio en el override de delete del mod. Se decide empíricamente en S2.

**Actor**: diseñador curricular (admin)
**Layers**: schema (FK) y/o backend (resolver)

<details><summary>Scenarios de validacion</summary>

#### Scenario: borrado bloqueado
- **GIVEN** una categoría con ≥1 `planEntry` asignado
- **WHEN** se intenta borrar
- **THEN** el borrado es rechazado

#### Scenario: borrado permitido
- **GIVEN** una categoría sin entries
- **WHEN** se borra
- **THEN** se permite

</details>

#### Acceptance
**El usuario puede verificar que funciona**: borrar una categoría con asignaturas es rechazado; una categoría vacía se borra.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | con entries | entry asignado | borrar categoría | rechazado | TC-06 |
| 2 | sin entries | categoría vacía | borrar | permitido | TC-07 |

### REQ-10: créditos actuales de categoría

> **Que cambia**: una línea de formación puede informar cuántos créditos suman hoy sus asignaturas.
> **Por que**: permite comparar el total real contra el rango declarado (min/max) sin guardar un contador desincronizado.

El sistema MUST exponer en lectura los "créditos actuales" de una `requirementCategory` como la suma de los créditos **efectivos** (REQ-03) de sus `planEntry`, vía field resolver GraphQL (`currentCredits: Int`), sin persistir.

**Actor**: diseñador curricular; system (lectura)
**Layers**: backend (resolver), api (schema.graphql)

<details><summary>Scenarios de validacion</summary>

#### Scenario: suma efectivos
- **GIVEN** una categoría con 2 entries de créditos efectivos 6 y 4
- **WHEN** se leen los créditos actuales
- **THEN** = 10

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el total de créditos de una categoría refleja la suma de sus asignaturas.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | suma | 2 entries 6+4 | leer currentCredits | 10 | TC-08 |

### REQ-11: color e ícono modelados

> **Que cambia**: cada línea de formación puede llevar un color y un ícono para distinguirla en la malla.
> **Por que**: la maqueta (UPONE-1272) usa color por categoría; el modelo debe poder guardarlo.

El sistema MUST modelar `requirementCategory.color` (string — token tema up1 `var(--up1-color-*)` o hex) y `requirementCategory.icon` (string — bootstrap-icons `bi-*`), con labels i18n. El seed usa los colores de la maqueta; el ícono por categoría queda a criterio del seed (la maqueta trae color, no ícono).

**Actor**: diseñador curricular (admin)
**Layers**: schema (objects), i18n (lang), seed

<details><summary>Scenarios de validacion</summary>

#### Scenario: persistir color/icon
- **GIVEN** una categoría con `color="var(--up1-color-primary)"`, `icon="bi-stack"`
- **WHEN** se crea
- **THEN** ambos se persisten

</details>

#### Acceptance
**El usuario puede verificar que funciona**: una categoría guarda su color e ícono y el seed crea las 4 categorías de la maqueta con sus colores.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | color/icon | categoría | crear con color+icon | persiste | inspección + seed |

## Artifacts

### Models (objetos nuevos del mod)

**`objects/planEntry.json`** (REQ-01,02,05,06):

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `planId` | string (FK→Curriculum) | no | — | Plan al que pertenece la entrada |
| `activityId` | string (FK→Activity) | no | — | Asignatura colocada |
| `categoryId` | string (FK→requirementCategory) | sí | — | Línea de formación (opcional). Guard de borrado (REQ-09) |
| `blockId` | string | sí | — | Bloque electivo (MC-03); null = obligatoria. Sin FK enforced |
| `kind` | enum `[Course,Internship,Thesis]` | no | `Course` | Discriminador (REQ-06) |
| `period` | integer | no | — | Período (REQ-02, requerido) |
| `position` | integer | sí | — | Orden dentro del período |
| `credits` | integer | sí | — | Override; efectivo = `credits ?? Activity.credits` (REQ-03) |
| `sourceEntryId` | string | sí | — | Self, trazabilidad de clon |

Índices (REQ-05): `planId`, `categoryId`, `blockId`, `(planId, period, position)`.

**`objects/requirementCategory.json`** (REQ-07,11):

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `curriculumId` | string (FK→Curriculum) | no | — | Currículo al que pertenece |
| `name` | string | no | — | Nombre de la línea |
| `code` | string | sí | — | Código corto |
| `minCredits` | integer | no | — | Crédito mínimo (REQ-08) |
| `maxCredits` | integer | sí | — | Crédito máximo; min≤max (REQ-08) |
| `position` | integer | sí | — | Orden |
| `description` | string | sí | — | Descripción |
| `color` | string | sí | — | Token `var(--up1-color-*)` o hex (REQ-11) |
| `icon` | string | sí | — | `bi-*` (REQ-11) |

Índice: `curriculumId`.

### Campos derivados (enriquecidos en lectura — NO columnas, NO field resolvers — learn L1)

Un mod de up1 NO puede registrar field resolvers de tipo GraphQL (el scanner solo compone `Query`/`Mutation`). Los campos derivados se inyectan en `item.data` desde un override de `getInstance`/`listInstances` que despacha por `objectType`, igual que `enrichCurriculumRows` en `curriculum-read.resolver.js`.

| objectType | Campo en `data` | Cálculo | source_ref |
|------------|-----------------|---------|------------|
| `planEntry` | `effectiveCredits` | `credits ?? Activity.credits` (batch findMany de Activity) | REQ-03 |
| `planEntry` | `isElective` | `blockId != null` | REQ-04 |
| `requirementCategory` | `currentCredits` | Σ `effectiveCredits` de sus `planEntry` (batch) | REQ-10 |

### Resolvers / validaciones

| File | Cambio | source_ref |
|------|--------|------------|
| `logic/curriculum-read.resolver.js` | extender el override `getInstance`/`listInstances` (singleton del mod) para enriquecer `planEntry` (`effectiveCredits`, `isElective`) por `objectType`; renombrar internamente a un dispatcher de read-enrichment | REQ-03,04 |
| `logic/curriculum-read.resolver.js` | enriquecer `requirementCategory` con `currentCredits` (suma de efectivos de sus entries) en el mismo override | REQ-10 |
| `logic/helpers/creditRange.js` | helper `assertMinMaxCredits` (min≤max) | REQ-08 |
| `logic/helpers/effectiveCredits.js` | helper puro `computeEffectiveCredits(entry, activityCreditsById)` reutilizado por planEntry y requirementCategory | REQ-03,10 |
| `logic/sectionValidation.resolver.js` | wire `assertMinMaxCredits` en `validateSectionCreate` para `objectType=requirementCategory` | REQ-08 |
| `logic/polymorphicUpdate.resolver.js` | wire `assertMinMaxCredits` en update para `objectType=requirementCategory` | REQ-08 |
| `objects/planEntry.json` (`categoryId` FK) | en S2.T3: agregar FK→requirementCategory con `onDelete: Restrict` (opción A) — fallback B: validación de dominio en delete con `assertNoEntriesForCategory` | REQ-09 |

### i18n (lang)

| File | Key | Valor |
|------|-----|-------|
| `lang/es_CL@planEntry.json` | labels de columnas + `enums.kind.{Course,Internship,Thesis}` | Curso / Práctica / Tesis |
| `lang/es_CL@requirementCategory.json` | labels de columnas (name, minCredits, maxCredits, color, icon, …) | (es_CL) |

### Layouts (config)

| File | Cambio |
|------|--------|
| `config/layouts/default_planEntry_{list,view}.json` | RecordList/RecordDetail estándar (reuse) |
| `config/layouts/default_requirementCategory_{list,create,edit,view}.json` | RecordList/RecordDetail estándar; campos color/icon |

### Seed

| File | Contenido |
|------|-----------|
| `seed/_data-malla.js` (nuevo) | 4 `requirementCategory` de la maqueta (Núcleo, Habilidades Profesionales, Electivos de Profundización, Proyecto de Grado) con colores; `planEntry` de ejemplo (solo `kind=Course`) |
| `seed/seed.js` | registrar el nuevo data module |

## Tasks

### Session 1 — objeto `planEntry` + resolvers derivados + sync [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `objects/planEntry.json`: campos REQ-01, `period` not_null (REQ-02), enum `kind` default Course (REQ-06), FKs con `isForeignKey`/`references`/`targetField` (planId→Curriculum, activityId→Activity, sourceEntryId self; categoryId queda string — FK a requirementCategory se agrega en S2.T3), índices REQ-05, `defaultLayoutType: RecordList` | REQ-01,02,05,06 | developer | — | `objects/planEntry.json` | TC-01, TC-09 (inspección JSON; rechazo runtime DB-gated) | eliminar archivo + `reset-mods` | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T2 | Campos derivados de `planEntry` por read-enrichment (learn L1, NO field resolvers): helper puro `logic/helpers/effectiveCredits.js` + extender el override `getInstance`/`listInstances` de `logic/curriculum-read.resolver.js` para enriquecer `planEntry` (`effectiveCredits = credits ?? Activity.credits` con batch findMany de Activity; `isElective = blockId != null`) despachando por objectType. Unit tests del enrichment | REQ-03,04 | developer | S1.T1 | `logic/helpers/effectiveCredits.js`, `logic/curriculum-read.resolver.js`, `tests/unit/planEntryEnrich.test.js` | TC-02, TC-03, TC-04 (vitest del mod) | revertir resolver/helper (git revert) | DET-5, DET-8, DET-11, RULE-curriculum-design-005 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` (Template de Gate), quality review (reviewer aislado, DET-30/35), validación T2, consolidar TC-01..04, TC-09 con evidencia, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decisión + TCs con evidencia | (no aplica — cierre de session) | DET-20, DET-23, DET-30, DET-35 | done | 1 |

### Session 2 — objeto `requirementCategory` + validaciones + derivados [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `objects/requirementCategory.json`: campos REQ-07 (curriculumId FK→Curriculum, name req, minCredits req, maxCredits?, color/icon REQ-11), índice curriculumId, `defaultLayoutType: RecordList` | REQ-07,11 | developer | S1.GATE | `objects/requirementCategory.json` | inspección JSON + create válido | eliminar archivo + `reset-mods` | DET-1, DET-2, DET-8, DET-16 | done | 2 |
| S2.T2 | Validación min≤max (REQ-08): helper `logic/helpers/creditRange.js` (`assertMinMaxCredits`) + wire en `sectionValidation.resolver.js` (create, despacho por objectType) y `polymorphicUpdate.resolver.js` (update) — NO crear override nuevo (CONSTRAINT H7) | REQ-08 | developer | S2.T1 | `logic/helpers/creditRange.js`, `logic/sectionValidation.resolver.js`, `logic/polymorphicUpdate.resolver.js` | TC-05 (vitest del mod) | revertir helper + wiring (git revert) | DET-5, DET-8, DET-10, DET-11 | done | 2 |
| S2.T3 | Agregar FK `planEntry.categoryId`→requirementCategory + guard de borrado (REQ-09): verificar empíricamente si codegen honra `onDelete: Restrict` (opción A); si no, fallback B (helper `assertNoEntriesForCategory` + override delete del mod con mensaje "reasigna primero"). `currentCredits` (REQ-10) por read-enrichment (learn L1): extender el override de `curriculum-read.resolver.js` para enriquecer `requirementCategory` con Σ de efectivos de sus entries (reusa `effectiveCredits.js`). Codegen + sync | REQ-09,10 | developer | S2.T1, S2.T2 | `objects/planEntry.json`, `logic/curriculum-read.resolver.js`, `logic/helpers/*`, `tests/unit/requirementCategoryEnrich.test.js` | TC-06, TC-07, TC-08 (vitest del mod) | revertir resolver/helper + FK (git revert) | DET-5, DET-8, DET-11, DET-16 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, quality review aislado (DET-30/35), validación T2, consolidar TC-05..08 con evidencia + decisión empírica del guard (A vs B), decidir continue/iterate/escalate/standby | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decisión + TCs con evidencia | (no aplica) | DET-20, DET-23, DET-30, DET-35 | done | 2 |

### Session 3 — lang + layouts + seed + smoke UPU [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Lang es_CL de ambos objetos: `lang/es_CL@planEntry.json` (labels + `enums.kind` Curso/Práctica/Tesis) y `lang/es_CL@requirementCategory.json` (labels color/icon/min/max/…) | REQ-06,11 | developer | S2.GATE | `lang/es_CL@planEntry.json`, `lang/es_CL@requirementCategory.json` | inspección + sync lang | revertir lang (git revert) | DET-8, DET-16, RULE-curriculum-design-005 | done | 3 |
| S3.T2 | Layouts RecordList/RecordDetail estándar de ambos objetos (reuse del patrón CurricularSection), campos color/icon de requirementCategory | REQ-01,07,11 | developer | S3.T1 | `config/layouts/default_planEntry_{list,view}.json`, `config/layouts/default_requirementCategory_{list,create,edit,view}.json` | render en suite (smoke) | revertir layouts (git revert) | DET-8, DET-16 | done | 3 |
| S3.T3 | Seed de la maqueta: `seed/_data-malla.js` (4 categorías con colores + planEntries Course de ejemplo) + registrar en `seed/seed.js`; correr sync + seed en UPU y verificar render en la suite (smoke) | REQ-11 | developer | S3.T2 | `seed/_data-malla.js`, `seed/seed.js` | seed corre sin error en UPU + smoke UI (aceptación DB-gated) | quitar seed module (git revert) | DET-5, DET-8, DET-11, DET-16 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3, ⚑ fuerte)** — persistir, quality review aislado (DET-30/35), regression T3 (vitest del mod + smoke UI), consolidar todos los TC con evidencia, propagación DET-16 (MC-03/04/05/06/07), decidir continue/iterate/escalate/standby | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + regression + smoke + decisión | (no aplica) | DET-13, DET-16, DET-20, DET-23, DET-30, DET-35 | done | 3 |

## Constraints

- RULE-dev-004: trabajo mod-only va en rama de épica (`UPONE-1267-sp5`), commits con id externo (UPONE-1345); no `develop`/`main`.
- RULE-curriculum-design-013: mod-only; no commitear artefactos de sync/seed (Base, schema, typeDefs, lang sincronizado).
- RULE-curriculum-design-005: friendly-error / convenciones del mod; reiniciar OM tras `sync:logic`.
- CONSTRAINT H7 (resolver-override): `createInstance`/`updateInstance`/`deleteInstance` son singleton del mod (el scanner registra por nombre, último gana). Validaciones nuevas se cablean en el override existente, no como override nuevo.
- DEC-026, DEC-030, DEC-033 (kb_refs del ticket): objetos MCP-ready (enums + FK `references` + labels) para MC-04.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| TICKET-081 (MC-01) | internal | enum `progression` para la regla de `period` por modo | ya closed |
| object-manager (sync + codegen) | internal | aplica objetos/resolvers al backend core | si el sync choca con drift de BASEMODEL: `SYNC_AUTO_APPLY_SCHEMA=false` o regenerar baseline (no `--accept-data-loss`) |
| MC-03 (bloque electivo) | internal (downstream) | crea el objeto bloque; aquí `blockId` es string opcional | forward-compatible; no bloquea |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El codegen no honra `onDelete: Restrict` (opción A del guard) | medium | el borrado no se bloquea a nivel DB | S2.T3 verifica empíricamente; fallback B (guard de dominio + mensaje "reasigna primero") |
| El sync/seed choca con drift de BASEMODEL en UPU | medium | sync falla | workaround `SYNC_AUTO_APPLY_SCHEMA=false` / regenerar baseline; nunca `--accept-data-loss` |
| Validación nueva en override singleton rompe consumidor existente (Modality/Evaluation/Curriculum) | low | regression en create/update | despacho por objectType (no-op fuera de scope); reviewer aislado re-verifica |
| Field resolver de `effectiveCredits` con N+1 al leer Activity | low | performance en listados grandes | batch/lazy si emerge; SP5 no tiene listados grandes (mitigación diferida documentada) |

## Open questions

Ninguna bloqueante. La única decisión menor (guard de borrado A vs B) se resuelve empíricamente en S2 con racional registrado.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: campos derivados enriquecidos en lectura (NO field resolvers, NO columnas) — corregida en S1 por learn L1
- **Contexto**: crédito efectivo (REQ-03), electividad (REQ-04) y créditos actuales (REQ-10) podrían persistirse o derivarse.
- **Drivers**: evitar data redundante/desincronizada; el handoff los define como derivados; REQ-04 prohíbe explícitamente `isElective` persistido.
- **Opcion elegida (corregida)**: enriquecer `item.data` desde un override de `getInstance`/`listInstances` que despacha por `objectType` (patrón `enrichCurriculumRows` de `curriculum-read.resolver.js`). **NO field resolvers GraphQL**: el scanner del platform (`resolverIndex.js: loadResolversFromDirectory`) solo compone exports con "query"/"mutation" en el nombre hacia `Query`/`Mutation`; un mod no puede registrar type field resolvers (learn L1, descubierto en S1).
- **Alternativas**: (a) field resolvers GraphQL — **inviable** (el mecanismo no existe para mods); (b) columnas persistidas (rechazada: desincroniza, contradice REQ-04).
- **Consecuencias**: lectura calcula al vuelo enriqueciendo `data`; posible N+1 mitigado con batch findMany (como `enrichCurriculumRows`); cero data redundante; MCP-ready (MC-04 lee `data` enriquecido). `curriculum-read.resolver.js` deja de ser exclusivo de Curriculum → pasa a dispatcher de read-enrichment por objectType.
- **Session**: design (corregida en S1 execute por L1).

### DEC-LOCAL-02: validaciones dentro de overrides singleton (CONSTRAINT H7)
- **Contexto**: min≤max (REQ-08) corre en create y update; el mod ya tiene `createInstance` (sectionValidation) y `updateInstance` (polymorphicUpdate) overrides.
- **Drivers**: el scanner del platform registra resolvers por nombre y el último gana en colisión — dos archivos no pueden exportar el mismo campo de Mutation.
- **Opcion elegida**: helper `assertMinMaxCredits` cableado dentro de los overrides existentes, despachando por objectType.
- **Alternativas**: nuevo override de createInstance/updateInstance (rechazada: colisión del scanner, rompería las validaciones existentes).
- **Consecuencias**: el guard de borrado (REQ-09) si necesita override de delete crea uno nuevo SOLO si no existe ya un `deleteInstance` del mod (verificar en S2).
- **Session**: design.

### DEC-LOCAL-03: guard de borrado — A + B (defense-in-depth), resuelta en S2
- **Contexto**: REQ-09 exige bloquear el borrado de categoría con entries, con mensaje "reasigna primero".
- **Verificación empírica (S2.T3)**: el codegen **SÍ honra** `onDelete` (`generatePrismaSchema.js` lee `fieldDef.onDelete`; 25 `onDelete` en el schema UPU) → **opción A viable**.
- **Opcion elegida**: **ambas**. (A) `planEntry.categoryId` FK con `onDelete: Restrict` → backstop a nivel DB (cubre bypass directo/MCP). (B) guard de dominio en un override nuevo de `deleteInstance` (`requirementCategoryDelete.resolver.js`, único del mod — CONSTRAINT H7 verificado) que cuenta entries y lanza el mensaje "reasigna primero" (REQ-09 lo exige; el error genérico de FK no lo da). El guard B corre primero (mensaje amigable); la DB es el backstop.
- **Alternativas**: solo A (rechazada: error genérico, sin el mensaje de REQ-09); solo B (rechazada: sin backstop ante bypass del resolver).
- **Consecuencias**: B es unit-testeable ahora (TC-06/07); A se enforza tras el próximo sync (requirementCategory recién creado en S2).
- **Session**: S2 (execute).

## Acceptance checkpoints

- [ ] **Funcional**: REQ-01..11 satisfechos (2 objetos + derivados + validaciones + guard + seed).
- [ ] **Tests**: TC-01..09 verificados (vitest del mod) con evidencia.
- [ ] **NFRs**: n/a (N+1 mitigable diferido y documentado).
- [ ] **Rules**: mod-only respetado; solo source del mod committeado (sin artefactos de sync/seed); CONSTRAINT H7 respetado.
- [ ] **Integration**: sync corrió limpio en UPU; objetos propagados; resolvers existentes sin regresión.
- [ ] **Docs**: propagación DET-16 a MC-03/04/05/06/07 registrada; learns refinados.
