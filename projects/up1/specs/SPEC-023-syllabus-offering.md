---
id: SPEC-023-syllabus-offering
project: up1
ticket: TICKET-064
status: done
---

# Sílabo (Offering tipo Syllabus) · vista y objetos (UPONE-1269)

# Sílabo (Offering tipo Syllabus) · vista y objetos (UPONE-1269)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements / Artifacts / Tasks.*

**Que se quiere**: entregar el **Sílabo** — la instancia dictada de una asignatura en un período — como objeto + su vista (lista, detalle, crear, editar, eliminar real). El sílabo **es el mismo `Offering`** que usa engagement, pero anclado a una **asignatura** (`Activity{recordType: Course}`) en vez de a un servicio. Se agrega un solo campo (`termId`, el período) y se entregan resolvers y vistas propios que operan **solo** sobre sílabos, sin tocar las ofertas de engagement.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El sílabo se **deriva de `Activity{Course}`**, NO es un RecordType del `Offering` | model-v2 retiró `Offering.recordType` (verificado en 4 capas en intake). El tipo vive arriba, en `Activity`. Esto **supersede D-1/D-6** del ticket (Opción B, aprobada por el dev en intake 2026-06-15) |
| 2 | La lista usa una **query custom** (`syllabusOfferings`), no un filtro declarativo | distinguir sílabos requiere mirar `activityline.activity.recordType` (2 saltos); el motor de filtros de recordList solo resuelve 1 salto (learn L3). Prisma sí soporta el `where` anidado |
| 3 | El crear/listar son **resolvers propios** del mod, separados de engagement | `createServiceOffering` exige `Activity{Service}` → ya rechaza Course por construcción. El sílabo trae `createSyllabusOffering` (exige Course) — aislamiento total, cero riesgo de romper engagement |
| 4 | `termId` **nullable y fuera de `required`** | el sync une los `required` (append-only); si fuera required lo exigiría a los `ServiceOffer` de engagement y los rompería (lección UPONE-1261) |
| 5 | v1 **mantiene el `code @unique` global** del Offering + check scoped en el resolver para UX | el global unique es más estricto: ya garantiza unicidad por (línea, término). Relajarlo (para reusar code entre términos) exige migración sobre el objeto compartido + verificar merge-override → se difiere (backlog B3). Cierra O-1 |

**Riesgos principales y como los mitigamos**:

- **Romper engagement al extender el `Offering` compartido** → `termId` nullable fuera de required (REQ-PRESERVE); la S1 **cierra con regression empírica** de `createServiceOffering` + listado de service offers antes de avanzar (TC-5, TC-7).
- **El cambio "no aparece" tras `sync`** porque el object-manager no recarga typedefs del mod en caliente → restart obligatorio del OM como parte de S1.T3 (RULE-mods-003 + RULE-dev-006).
- **El merge de `Offering.json` de dos mods se comporta distinto a lo esperado** → S1.T1 verifica el Base sincronizado (que `termId` aparezca y que `required` NO incluya `termId`) antes de seguir.
- **Drift de BASEMODEL al seedear** → seed idempotente; no usar `--accept-data-loss` (memoria de resets up1).

**Que NO se hace en este ticket**:

- Inscripciones, cupos, eventos, asistencia, flujos n8n del sílabo (D-7 → backlog B1).
- Secciones del sílabo (`CurricularSection` vía MADS) (D-8 → backlog B2).
- Workflow del sílabo (usa el `status` plano del offering, D-3).
- Reuso de `code` entre términos distintos (relajar el `@unique` global) → backlog B3 (O-1).
- Tocar los layouts/resolvers de engagement (solo se leen para regression).

**Tamano estimado**: 2 sessions (~3 SP). La más riesgosa es **S1** (toca el objeto compartido + schema DB + resolvers; ⚑ fuerte). S2 (vista + i18n + seed) es de menor riesgo.

**Como vas a saber que funciona**:

- Abro la lista de sílabos → veo **solo** sílabos (los service offers de engagement no aparecen).
- Abro un sílabo → veo nombre, asignatura, período y estado.
- Creo un sílabo eligiendo una asignatura (Course) + período + código → se crea.
- Edito y luego elimino un sílabo → los cambios persisten; el eliminado desaparece de la DB.
- Creo/listo un `ServiceOffer` de engagement → **sigue funcionando** igual que antes.

---

## Purpose

Extender el objeto compartido `Offering` (dueño: `uengagement-up1`) desde el mod `curriculum-design` con un campo `termId` (período, nullable), y entregar resolvers (`createSyllabusOffering`, query `syllabusOfferings`) y 4 layouts que operan sobre los offerings anclados a una asignatura (`Activity{recordType: Course}`). Para el equipo de curriculum: habilita gestionar sílabos (la instancia dictada de una asignatura) reusando toda la infraestructura del `Offering` (FKs, inscripciones futuras), sin duplicar el objeto y sin afectar las ofertas de servicio de engagement.

## Requirements

### REQ-01: Extensión de modelo — `termId` en el Offering compartido

> **Que cambia**: el `Offering` gana un campo opcional **Período** (`termId → Term`), aportado por curriculum-design. Las ofertas de engagement no lo necesitan ni lo ven.
> **Por que**: un sílabo se dicta en un período concreto; el `Offering` de model-v2 no tenía dónde guardarlo.

El sistema MUST agregar el campo `termId` (string, nullable, FK → `Term`) al `Offering` mediante una contribución `mods/curriculum-design/objects/Offering.json` que el sync deep-mergea con la definición de `uengagement-up1`. El campo MUST quedar **fuera de `required`**.

<details><summary>Scenarios de validacion</summary>

#### Scenario: el campo se materializa sin romper engagement
- **GIVEN** la contribución `curriculum-design/objects/Offering.json` con `termId` nullable fuera de `required`
- **WHEN** se corre `npm run sync` + codegen
- **THEN** el `prisma model Offering` tiene `termId String?` + relación a `Term`, y el `required` del Base sincronizado **NO** incluye `termId`

#### Scenario: los ServiceOffer existentes no exigen termId
- **GIVEN** un `ServiceOffer` de engagement sin período
- **WHEN** se lista/crea vía el flujo de engagement
- **THEN** la operación es válida (termId opcional, no requerido)

</details>

### REQ-02: Crear sílabo — `createSyllabusOffering`

> **Que cambia**: aparece una acción "crear sílabo" que pide asignatura (Course) + período + nombre + código y crea la oferta anclada a esa asignatura.
> **Por que**: el resolver de engagement (`createServiceOffering`) solo acepta servicios; el sílabo necesita su propia puerta que acepte asignaturas.

El sistema MUST exponer una mutation `createSyllabusOffering(activityId, termId, name, code)` que: (a) valide que la `Activity` elegida tiene `recordType === 'Course'`; (b) resuelva o cree la `ActivityLine` de esa Activity (mismo patrón que engagement); (c) cree el `Offering` con `termId` y `status: Active`; (d) rechace si ya existe un sílabo con el mismo `code` en la misma `(activityLineId, termId)`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear con una asignatura válida
- **GIVEN** una `Activity{recordType: Course}` y un `Term`
- **WHEN** se invoca `createSyllabusOffering(activityId, termId, name, code)`
- **THEN** se crea un `Offering` anclado a la línea de esa Activity, con `termId` y `status: Active`

#### Scenario: rechazar una Activity de servicio
- **GIVEN** una `Activity{recordType: Service}`
- **WHEN** se invoca `createSyllabusOffering` con ese `activityId`
- **THEN** la mutation falla con un error de validación (no es una asignatura)

#### Scenario: rechazar código duplicado en el mismo scope
- **GIVEN** un sílabo existente con `code='C1'` en `(activityLineId=X, termId=Y)`
- **WHEN** se crea otro con `code='C1'`, misma línea y término
- **THEN** la mutation lo rechaza (unicidad de dominio)

</details>

### REQ-03: Listar sílabos — query `syllabusOfferings`

> **Que cambia**: la lista de sílabos muestra **solo** offerings anclados a asignaturas; las ofertas de servicio de engagement quedan fuera.
> **Por que**: el filtro declarativo de la recordList no puede mirar 2 saltos de relación (`activityline.activity.recordType`).

El sistema MUST exponer una query `syllabusOfferings` que devuelva los `Offering` cuyo `activityline.activity.recordType === 'Course'`, con los campos para la lista (name, asignatura, término, estado). Los `ServiceOffer` (Activity Service) MUST quedar excluidos.

<details><summary>Scenarios de validacion</summary>

#### Scenario: la lista excluye service offers
- **GIVEN** una DB con sílabos (Course) y service offers (Service)
- **WHEN** se consulta `syllabusOfferings`
- **THEN** el resultado contiene solo los anclados a `Course`; ningún `ServiceOffer`

</details>

### REQ-04: Vista del sílabo (4 layouts, eliminación real)

> **Que cambia**: el usuario tiene lista, detalle, crear y editar para sílabos, con borrado real.
> **Por que**: es el entregable de negocio del ticket ("solo la información del objeto").

El sistema MUST proveer 4 layouts (`list`, `view`, `create`, `edit`) para el sílabo: la lista filtra por `recordType=Syllabus` (REQ-06, supersede el `syllabusOfferings` original); crear consume `createSyllabusOffering`; editar persiste cambios en name/code/status/term. La vista MUST mostrar name · **asignatura** (`activityId`→Activity, REQ-06/DEC-LOCAL-05) · período (Term) · estado · línea, y NO mostrar los campos de engagement (`imageUrl`, `maxCapacity`, `usedCapacity`, `generalModality`).

> **Actualización (DEC-LOCAL-05, S3)**: (a) en **editar**, la asignatura va **read-only** (cambiarla es re-anclaje, no soportado en v1); (b) **sin eliminar** en v1 (`canDelete: false`) — supersede "eliminación real" de D-2 (el dev removió la acción del rowActions).

<details><summary>Scenarios de validacion</summary>

#### Scenario: editar y eliminar
- **GIVEN** un sílabo existente
- **WHEN** el usuario edita y guarda, luego elimina
- **THEN** los cambios persisten; la eliminación borra el registro de la DB

</details>

### REQ-PRESERVE-05: Engagement sigue funcionando

> **Que cambia**: nada para engagement — es la garantía de no-regresión.
> **Por que**: el `Offering` es compartido; el cambio no debe romper las ofertas de servicio.

El sistema MUST preservar el comportamiento de engagement: `createServiceOffering` y los layouts/listados `engagement_Offering_*` MUST seguir funcionando sin cambios tras agregar `termId` y los resolvers del sílabo.

<details><summary>Scenarios de validacion</summary>

#### Scenario: regression de engagement
- **GIVEN** el estado post-S1 (termId agregado + resolvers del sílabo)
- **WHEN** se crea y lista un `ServiceOffer` por el flujo de engagement
- **THEN** funciona igual que antes (sin error, sin exigir termId)

</details>

### REQ-06: Discriminador `recordType` desde CD (Offering + Activity) y listas filtradas

> **Que cambia**: se destraba la lista de sílabos (antes diferida, DEC-LOCAL-03) declarando desde CD un `recordType` en el `Offering` (espejo de cómo CD ya declara `Activity.recordType`), y la lista filtra por ese enum en 1 salto. Se aprovecha para filtrar también la lista de Activity de CD.
> **Por que**: `RecordList` no consume queries custom y el filtro declarativo es de 1 salto (L6) → el discriminador debe ser un campo del propio objeto listado.

El sistema MUST agregar `recordType` (enum `[ServiceOffer, Syllabus]`, `not_null`, `static_default "ServiceOffer"`, **fuera de `required`**) al `Offering` vía `mods/curriculum-design/objects/Offering.json`; `createSyllabusOffering` MUST setear `recordType: 'Syllabus'`; `createServiceOffering` (engagement) MUST seguir funcionando recibiendo el default (sin tocar engagement). La lista de sílabos MUST filtrar `recordType=Syllabus` y la lista de Activity de CD MUST filtrar `recordType=Course`. El `db push` MUST backfillear sin data-loss.

> Detalle ejecutable completo: [../../tickets/TICKET-064.b4-eval/plan-recordtype-offering-activity.md](../../tickets/TICKET-064.b4-eval/plan-recordtype-offering-activity.md). Evidencia: [../../tickets/TICKET-064.b4-eval/offering-recordtype-dossier.md](../../tickets/TICKET-064.b4-eval/offering-recordtype-dossier.md).

## Artifacts

### A1 · JSON object contribution — `Offering` (METASPEC-json-object)

- **Path**: `mods/curriculum-design/objects/Offering.json`
- **Tipo**: contribución (slice) deep-mergeada por sync con `uengagement-up1/objects/Offering.json`
- **Propiedad añadida**:

| Campo | Tipo | Nullable | FK | Nota |
|-------|------|----------|----|----|
| `termId` | string | sí | → `Term` (targetField `id`) | período del sílabo; FUERA de `required` |

- **NO** redeclarar `code`/`name`/`activityLineId`/`status` con cambios — solo aportar `termId` (y el mínimo de metadata que el merge exija). NO tocar `required`.

### A2 · GraphQL resolver — sílabo (METASPEC-graphql-resolver)

- **Paths**: `mods/curriculum-design/logic/syllabus-offering.resolver.js` + `syllabus-offering.schema.graphql`
- **Mutation** `createSyllabusOffering(activityId: ID!, termId: ID, name: String!, code: String!): Offering`
  - valida `Activity.recordType === 'Course'` (espejo de `createServiceOffering` que exige Service)
  - resuelve/crea `ActivityLine` (patrón `resolveActivityLineId` de engagement)
  - check de unicidad scoped: rechaza si existe `Offering` con `{ activityLineId, termId, code }`
  - crea `Offering { name, code, activityLineId, termId, status: 'Active' }`
- **Query** `syllabusOfferings: [Offering!]!`
  - `where: { activityline: { activity: { recordType: 'Course' } } }`
- Usa `extend type Query` / `extend type Mutation` (RULE-mods PATTERNS).

### A3 · Layouts (METASPEC-layout-config)

- **Paths** (nombre exacto a confirmar en S2.T1 contra el routing de suite): `mods/curriculum-design/config/layouts/`
  - `default_Offering_syllabus_list.json` — recordList; source = query `syllabusOfferings`; columnas Nombre/Asignatura/Período/Estado; acciones editar+eliminar
  - `default_Offering_syllabus_view.json` — detalle (solo info del objeto)
  - `default_Offering_syllabus_create.json` — form; customEndpoint mutation `createSyllabusOffering`; picker de asignatura (Activity Course) + Term
  - `default_Offering_syllabus_edit.json` — form de edición + estado
- **i18n**: labels en `mods/curriculum-design/lang/{es_CL,en_CL,pt_BR}@Offering.json` (NO hardcodear en el layout — checklist de calidad design-feature).

## Tasks

> Numeración: el ticket no tiene `### Session N` previas → el plan arranca en **S1**.

### Session 1 — Modelo + backend [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S1.T1, S1.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear contribución `Offering.json` con `termId` (nullable, FK Term, fuera de required) | REQ-01 | developer | — | `mods/curriculum-design/objects/Offering.json` | TC-7 + inspección del Base post-sync (termId presente, required sin termId) | git rm del archivo nuevo | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T2 | Resolver `createSyllabusOffering` (valida Course + scoped code) + query `syllabusOfferings` (where 2-hop) + schema.graphql | REQ-02, REQ-03 | developer | — | `mods/curriculum-design/logic/syllabus-offering.resolver.js`, `mods/curriculum-design/logic/syllabus-offering.schema.graphql` | vitest unit (Course-only, scoped uniqueness, list filtra Course) | git rm de los 2 archivos | DET-1, DET-2, DET-8 | done | 1 |
| S1.T3 | `npm run sync` + codegen + restart object-manager; verificar prisma `Offering.termId` + relación | REQ-01 | developer | S1.T1, S1.T2 | `object-manager/**` (generado), `mods/curriculum-design/` | grep prisma model Offering tiene termId; OM levanta sin error | revertir sync (regenerar desde estado previo) | DET-5, DET-8, DET-11 | done | 1 |
| S1.T4 | Unit tests backend (resolver + query) **y** regression de engagement (`createServiceOffering` + listado service offers) | REQ-02, REQ-03, REQ-PRESERVE-05 | reviewer | S1.T3 | `mods/curriculum-design/tests/**` | TC-5, TC-6, TC-7 verdes; engagement sin regresión | — (solo tests) | DET-4, DET-7, DET-13, DET-14 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) | — | reviewer | S1.T4 | `projects/up1/tickets/ticket-064.md` | gate persistido + quality review 10-dim + regression engagement PASS | — | DET-20, DET-23 | done | 1 |

### Session 2 — Vista + i18n + seed [tipo: auto] [tier: T2]

parallel_groups: [[S2.T1, S2.T2, S2.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | **3 layouts** del sílabo (view, create→`createSyllabusOffering`, edit). **Lista filtrada DIFERIDA** a follow-up (DEC-LOCAL-03 → backlog B4). NOTA (L7): el nav de CD se arma desde `app.json.defaultObjects`, no desde `showInNav` → sin la lista registrada no hay entry-point de UI en CD (parte de B4) | REQ-04 (parcial) | developer | — | `mods/curriculum-design/config/layouts/default_Offering_syllabus_{view,create,edit}.json` | TC-2..TC-4 manual (UI) | git rm de los 3 layouts | DET-1, DET-2, DET-16, RULE-platform-006 | pending | 2 |
| S2.T2 | i18n labels del sílabo (es/en/pt) | REQ-04 | developer | — | `mods/curriculum-design/lang/{es_CL,en_CL,pt_BR}@Offering.json` | labels resuelven en UI (no keys crudas) | git rm de los lang | DET-1, DET-16 | pending | 2 |
| S2.T3 | Seed idempotente `_data-syllabus.js` (Term + Activity{Course} + ActivityLine + sílabos) | REQ-04 | developer | — | `mods/curriculum-design/seed/_data-syllabus.js` | seed corre idempotente; crea datos de prueba | borrar seed + reseed | DET-8, DET-11 | pending | 2 |
| S2.T4 | Validación UI manual (**TC-2..TC-4**, TC-6) + evidencia (screenshots). **TC-1 (lista solo Syllabus) DIFERIDA** (DEC-LOCAL-03) | REQ-04 (parcial) | reviewer | S2.T1, S2.T2, S2.T3 | `projects/up1/tickets/TICKET-064.screenshots/` | TC-2..TC-4 + TC-6 con evidencia; crear + editar + **eliminar real** OK | — | DET-7, DET-13 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) | — | reviewer | S2.T4 | `projects/up1/tickets/ticket-064.md` | gate persistido + quality review + todos los TC con evidencia | — | DET-20, DET-23 | pending | 2 |

### Session 3 — recordType (Offering+Activity) + listas filtradas [tipo: ⚑ fuerte] [tier: T2]

> Reincorpora B4 (antes diferido) al ticket. Destraba la lista de sílabos y, de paso, el smoke UI de S2 (provee el entry-point de nav). Diseño: plan-recordtype-offering-activity.md.

| # | Task | source_ref | Files | Validation | Rollback | Status |
|---|------|-----------|-------|------------|----------|--------|
| S3.T1 | Filtro `recordType=Course` en la lista de Activity de CD | REQ-06 | `config/layouts/default_Activity_list.json` | lista → solo Course | quitar filtro | pending |
| S3.T2 | `recordType` enum en `Offering.json` (CD) + `createSyllabusOffering` setea Syllabus | REQ-06 | `objects/Offering.json`, `logic/syllabus-offering.resolver.js` | merge OK; resolver setea | git revert | pending |
| S3.T3 | `sync` + `db push` + restart OM; verificar columna + backfill (33 filas) | REQ-06 | object-manager (generado) | columna migra; backfill safe | regenerar | pending |
| S3.T4 | Corrección idempotente de los 3 sílabos sembrados → Syllabus | REQ-06 | `seed/_data-syllabus.js` | 3 SIL-CALC → Syllabus | reseed | pending |
| S3.T5 | Lista `default_Offering_syllabus_list.json` (filtro Syllabus) + registro en `app.json` | REQ-04, REQ-06 | `config/layouts/…`, `config/app.json` | lista → solo Syllabus; nav muestra Sílabos | git rm | pending |
| S3.T6 | Tests (unit resolver + datos de filtros + regresión engagement) + smoke UI TC-1..TC-4 (ya reachable) | REQ-04, REQ-06, REQ-PRESERVE-05 | `tests/**`, screenshots | TCs verdes/evidencia | — | pending |
| **S3.GATE** | Gate de sync Session 3 (tier T2) | — | ticket | gate + quality review + regresión engagement PASS | — | pending |

## Technical reference

- **Fuente del modelo (Confluence, espacio uP1)** — decisión de diseño de engagement, estado **Confirmed**:
  - [Offering](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2108162102/Offering): *"Una Activity define qué se ofrece; una ActivityLine define quién lo ejecuta; la Offering define cuándo y cómo ocurre una ejecución específica."* · **"Offering cuelga de ActivityLine, no de Activity."**
  - [ActivityLine](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2107080818/ActivityLine): *"Para llegar a Activity: Offering → ActivityLine → Activity. Estado: Confirmed."* · *"Sin campo name. El código identifica la línea."* (por eso "Línea de servicio" muestra el `code`, no un nombre).
  - [Modelo de Objetos de Negocio — Engagement](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2107080716): diagrama `Activity → ActivityLine → Offering`.
  - Implicancia: cambiar la asignatura de un sílabo es un **re-anclaje** (el ancla es la línea; la asignatura es derivada a 2 saltos) → la asignatura va **read-only** en editar (DEC-LOCAL-05).
- **Cadena del modelo**: `Offering.activityLineId → ActivityLine.activityId → Activity.recordType ∈ {Course, Service}`. Sílabo = Course; ServiceOffer = Service.
- **Precedente de resolver**: `mods/uengagement-up1/logic/offering-create.resolver.js` — `createServiceOffering` valida `Service` y tiene `resolveActivityLineId(prisma, activity)` (reusar el patrón).
- **Precedente de extensión de objeto**: `mods/curriculum-design/objects/activity.json` (slice de Activity, merge con el de uengagement).
- **Filtro 2-hop**: NO soportado declarativo (`instance.resolver.js:1291` split de 1 nivel) → por eso `syllabusOfferings` es resolver.
- **Term**: dueño `academic-scheduling`, label "Período", `name @unique`, `startDate/endDate`.
- **Flujo de cambio de schema**: `npm run sync` → codegen → **restart object-manager** (no recarga typedefs en caliente).

## Constraints

- RULE-mods-003 (must): cambios en mods requieren `npm run sync`; nunca editar archivos synced en core.
- RULE-dev-006 (must): tests + arranque del servicio tras cambios.
- RULE-platform-006 (must): PascalCase en objetos.
- DET-5 (multi-capa), DET-7 (regression), DET-13 (cierre con evidencia), DET-16 (propagación).
- **Supersede**: D-1/D-6 del ticket (asumían `Offering.recordType`) → reemplazadas por el modelo Opción B (deriva de Activity). Ver DEC-LOCAL-01.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `Offering` (uengagement-up1) | internal | objeto compartido que se extiende vía merge | si el merge no respeta el slice, el campo no aparece — verificado en S1.T1 |
| `Term` (academic-scheduling) | internal | destino de la FK `termId` | bajo — objeto estable |
| object-manager sync/codegen | internal | materializa el cambio de schema | restart requerido; drift de BASEMODEL al seedear |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Romper engagement al extender el Offering | medium | high | termId nullable fuera de required; S1.GATE corre regression empírica (TC-5, TC-7) antes de avanzar |
| Merge de Offering.json de 2 mods se comporta distinto | medium | medium | S1.T1 verifica el Base sincronizado (termId presente, required intacto) antes de seguir |
| `sync` no refleja el cambio (typedefs en caché) | medium | medium | restart del OM en S1.T3 (RULE-mods-003) |
| Filtro de lista mal hecho mezcla service offers | low | high | query custom con where 2-hop + TC-3 (lista solo sílabos) |

## Open questions

- O-1 (unicidad de `code`) cerrada en DEC-LOCAL-02 (v1 mantiene global unique + scoped check; reuso entre términos → backlog B3).
- **O-2 (follow-up): enfoque de la lista filtrada de sílabos** — abierta para el follow-up (backlog B4). Decidir Opción A (discriminador 1-hop en el `Offering`) vs Opción B (filtro 2-hop en `listInstances` core). Diferida por DEC-LOCAL-03.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: El sílabo deriva de `Activity{Course}`, no es un RecordType del Offering
- **Contexto**: el ticket (D-1) asumía un `recordType` en el `Offering`; intake-explore halló que ese campo fue retirado en model-v2 (4 capas).
- **Drivers**: fidelidad a model-v2 (el tipo vive en Activity), menor blast radius (sin backfill), aislamiento natural de engagement.
- **Opción elegida**: Opción B — derivar de `Activity.recordType === 'Course'`; resolvers y lista propios.
- **Alternativas**: Opción A (reintroducir `recordType` en Offering) — descartada: exige crear el campo, backfillear todas las ofertas y revertir una decisión de model-v2. Mayor riesgo.
- **Consecuencias**: la lista necesita query custom (2-hop); a cambio, cero riesgo para engagement.
- **Session**: intake-explore (aprobada por el dev vía AskUserQuestion 2026-06-15).

### DEC-LOCAL-02: v1 mantiene el `code @unique` global del Offering
- **Contexto**: D-6 pedía unicidad scoped por `(activityLineId, termId)` "no @@unique base"; la realidad es que `code` es `@unique` global hoy.
- **Drivers**: el global unique ya garantiza la unicidad por (línea, término) (es más estricto); relajarlo exige migración sobre el objeto compartido + verificar merge-override (¿puede curriculum-design poner `unique:false` sobre el `unique:true` de engagement?), riesgo no justificado en 3 SP.
- **Opción elegida**: mantener el `@unique` global; agregar check scoped en el resolver solo para un mensaje de error claro.
- **Alternativas**: relajar a no-unique + scoped en resolver — difiere a backlog B3 (necesita verificación de merge-override + migración del shared object).
- **Consecuencias**: v1 NO permite reusar el mismo `code` en términos distintos; se gana cero riesgo sobre el objeto compartido. Reversible.
- **Session**: design-feature.

### DEC-LOCAL-03: La lista filtrada de sílabos se DIFIERE a un follow-up (blocker cross-layer)
- **Contexto**: al iniciar S2 (pre-código) se halló que el frontend NO puede materializar la lista del sílabo como la diseñó el spec (learn L6, verificado en 3 capas): (a) `RecordList.vue` está cableado fijo a `listInstances` y no hay key de layoutConfig para consumir una query custom (`syllabusOfferings` no tiene consumidor en la lista); (b) el filtro declarativo resuelve solo 1 salto to-one (`instance.resolver.js:1291`), y el sílabo necesita 2 saltos (`activityline.activity.recordType`); (c) `ActivityLine` no tiene discriminador de tipo → no hay proxy 1-salto.
- **Drivers**: resolverlo exige reabrir una decisión cerrada (Opción A — discriminador en el `Offering` compartido, revierte DEC-LOCAL-01) o salir del `execute_scope` (Opción B — capacidad core en `RecordList`/`listInstances`). Ninguna se auto-decide en autopilot super → escalado al dev.
- **Opción elegida** (dev, AskUserQuestion 2026-06-15): **Opción C — diferir la lista filtrada**. S2 entrega view/create/edit + i18n + seed; la lista filtrada va a un follow-up que decidirá A vs B.
- **Alternativas**: A (discriminador 1-hop en el Offering) — revierte DEC-LOCAL-01 + toca el objeto compartido + backfill; B (filtro 2-hop en `listInstances`) — expande scope a core, superficie de regresión en todas las listas.
- **Consecuencias**: REQ-04 se cumple parcialmente en v1 (sin la lista; TC-1 diferido). `syllabusOfferings` queda como API programática (MCP/REST) sin consumidor de UI por ahora. **No hay entry-point de UI del sílabo en CD** hasta B4: el nav usa `app.json.defaultObjects` (no `showInNav`), y `Offering` no está listado ahí (L7). Reversible: la lista + el registro en nav aterrizan en el follow-up sin tocar lo entregado.
- **Session**: S2 (execute).
- **SUPERSEDED por DEC-LOCAL-04 (2026-06-15)**: la lista NO va a un follow-up — se reincorpora como **Session 3** de este mismo ticket vía el discriminador `recordType`. La parte "diferida a follow-up" queda sin efecto.

### DEC-LOCAL-04: B4 se reincorpora como S3 vía `recordType` desde CD (no follow-up)
- **Contexto**: tras evaluar A vs B (ver dossier/plan en `TICKET-064.b4-eval/`), el dev decidió declarar `recordType` desde CD en el `Offering` (espejo de `Activity.recordType`, que CD ya declara cubriendo Course+Service) y filtrar 1 salto — y hacerlo dentro de **este** ticket, no en uno aparte.
- **Drivers**: el patrón ya existe en producción (CD declara `Activity.recordType`); resuelve B4 sin tocar core ni archivos de engagement (el `static_default` cubre `createServiceOffering`); cerrar todo en un ticket.
- **Opción elegida**: A1-estilo-Activity — `recordType` enum `[ServiceOffer, Syllabus]` aportado por CD; listas de CD filtran (Syllabus / Course). Ver REQ-06 + tasks S3.
- **Alternativas**: B (filtro 2-hop en core) — descartada (toca infra compartida); A2 (engagement lo agrega) — innecesario para avanzar dado el precedente; impacto en engagement (display + su filtro + intención model-v2) → backlog.
- **Consecuencias**: `Offering.recordType` es copia derivada del tipo de su Activity (denormalización de bajo riesgo). S3 destraba además el smoke UI de S2 (provee el entry-point de nav). Engagement: impacto cosmético de display + decisión de su filtro → coordinar (backlog).
- **Session**: S3 (execute).

### DEC-LOCAL-05: Asignatura read-only en editar + sin eliminar en v1 (decisión del dev, S3)
- **Contexto**: smoke UI de S3 + el modelo confirmado de Confluence (Offering cuelga de ActivityLine, no de Activity).
- **Asignatura visible pero read-only en editar**: se agregó `activityId` (FK→Activity, nullable) al Offering — denormalización para mostrar/elegir la asignatura a 1 salto (el frontend no resuelve display de 2 saltos, fetchRelationOptions lee campo directo). El create usa un campo virtual `asignatura` (ruta no-FK que honra `referencesFilter=Course`); view/edit muestran `activityId` (FK→Activity, name). En **editar** la asignatura va **disabled**: cambiarla es un re-anclaje (re-resolver `activityLineId`), que el update genérico no hace → editable solo con un resolver `updateSyllabusOffering` custom (no en v1). Opción A elegida por el dev.
- **Sin eliminar en v1**: la lista del sílabo va con `canDelete: false` (el dev removió la acción de eliminar del rowActions). **Supersede** la parte "eliminar real" de D-2/REQ-04.
- **Session**: S3 (execute).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-04 pasan
- [ ] **Tests**: unit del resolver + query verdes (TC-5, TC-6, TC-7); UI manual TC-1..TC-4
- [ ] **Rules**: RULE-mods-003 (sync), RULE-dev-006 (tests+arranque), RULE-platform-006 respetadas
- [ ] **Integration / regression**: engagement (`createServiceOffering` + listado) sin regresión (REQ-PRESERVE-05)
- [ ] **Docs**: i18n poblado; ningún label hardcodeado en layouts
