---
id: SPEC-object-manager-hu12-adoption-docs
project: up1
ticket: TICKET-046
status: done
---

# HU-12 — Documentacion de adopcion de la capacidad clonar/versionar

# HU-12 — Documentacion de adopcion de la capacidad clonar/versionar

## Executive summary — lo que estas aprobando

> *Diseñado para revision rapida. El detalle vive en Requirements y Tasks.*

**Que se quiere**: que un dev de cualquier mod uP1 pueda activar clonacion/versionamiento para su objeto siguiendo docs, sin leer el codigo del core. SP3 ya entrego el motor (HU-1..HU-11, todas cerradas); este ticket entrega solo **documentacion** verificable contra ese codigo. El entregable estrella es un test de adopcion simulada (receta seguible en <30/<60 min).

**Decisiones criticas que necesitan tu OK** (resueltas en autopilot super con racional — DET-30):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Test de adopcion **simulado** = walkthrough verificado contra codigo, no alta en vivo (gate auto, no ⚑ fuerte) | DISC-1: Syllabus/CompetencyMap/CurriculumPlan no existen como `objects/*.json`; no hay objeto `directChildren` real en el mod; no hay entorno UPU vivo en este flujo. El valor (¿la receta es seguible?) se preserva sin entorno |
| 2 | `polymorphic-children.md` es **adopcion-focused** y cross-linkea a `codegen-polymorphic-children.md` existente (no duplica reglas de codegen) | Evita doc divergente; el doc existente ya cubre el angulo build-time |
| 3 | Documentar que el remap de derived children **ya esta en el core** (`applyDerivedRemap` + `polymorphicChildrenDerived`, TICKET-049), NO como hook per-mod diferido a SP4 | DISC-4: la nota del ticket "derived generico → SP4" quedo obsoleta; documentar lo viejo confundiria al adoptante |

**Riesgos principales y como los mitigamos**:

- **Doc que describe API que cambio** → cada afirmacion tecnica se ancla a `file:line` verificado por el research del intake (ver Technical reference).
- **Duplicacion con docs existentes** → revisar `prefill-capability.md` y `codegen-polymorphic-children.md` antes de escribir; cross-link en vez de copiar.

**Que NO se hace en este ticket**:

- Crear objetos nuevos (Syllabus/CompetencyMap) para correr el test en vivo — fuera de alcance docs (candidato a ticket aparte si se quiere e2e real).
- Modificar codigo del core/mod/layout — es docs puro (rollback = git revert de archivos `.md`).
- Migrar las docs v1 existentes a otro formato.

**Tamano estimado**: 4 sessions (T1 doc-verify), ~3-4h efectivas. La mas densa es S1 (expansion de versioning + config-storage).

**Como vas a saber que funciona**:

- Abro cada doc nueva/expandida y cada paso de la receta mapea a un `file:line` real del codigo.
- Un dev externo puede seguir la receta de adopcion end-to-end sin abrir el codigo del resolver.
- Las 3 trampas conocidas estan documentadas con su error/sintoma exacto.

---

## Purpose

Documentar la capacidad transversal de clonacion (`prefillFrom`) y la capa de versionamiento del dominio CD (`asNewVersion` + `getVersionChain`), mas su config-storage, hijos polimorficos y la row action declarativa de layout, de modo que sea adoptable como auto-servicio. Audiencia: dev de mod que NO construyo la capacidad. Las docs son fuente de verdad de adopcion; el codigo es fuente de verdad de comportamiento (las docs lo referencian, no lo reemplazan).

## Requirements

> **Que cambia**: `versioning-capability.md` pasa de cubrir solo el codegen (HU-4) a cubrir el ciclo completo de adopcion: runtime, receta, ejemplo, politica y la distincion versionSourceId/sourceRefId.
> **Por que**: hoy un adoptante que lee el doc no sabe como versionar en runtime ni que politica setear — solo como pasa la validacion de codegen.

**REQ-01** — El doc `object-manager/docs/versioning-capability.md` MUST documentar, ademas del codegen ya cubierto: (a) el runtime `asNewVersion` (bump del max del linaje, set `linkageField=source.id`, reset a `Workflow.initialStatusId`, requiere `prefillFrom.source`); (b) la query `getVersionChain(objectType, instanceId)`; (c) una receta paso a paso para un objeto generico; (d) el ejemplo Activity con punteo a `PATTERNS.md`; (e) una receta breve para objetos sin adoptar aun (Syllabus/CurriculumPlan como ilustracion); (f) seccion "Politica institucional" (`WorkflowStatus.allowsVersioning` + `Workflow.initialStatusId`); (g) seccion "versionSourceId vs sourceRefId"; (h) seccion "Versionar vs Clonar". Cada error documentado MUST usar el string exacto del codigo.

<details><summary>Scenarios de validacion</summary>

- GIVEN un dev lee versioning-capability.md WHEN busca "como versiono en runtime" THEN encuentra la firma de createInstance con asNewVersion y que hace cada paso.
- GIVEN el dev olvido setear initialStatusId WHEN busca el sintoma THEN encuentra `WORKFLOW_HAS_NO_INITIAL_STATUS` con la condicion exacta.
- EDGE: GIVEN el dev confunde versionar con clonar WHEN lee la seccion "Versionar vs Clonar" THEN distingue prefillFrom solo (clonar) de prefillFrom+asNewVersion (versionar).
</details>

> **Que cambia**: nuevo doc que explica como la config declarativa del JSON llega al runtime.
> **Por que**: sin esto, el adoptante no entiende por que su bloque se "ignora" si lo pone fuera de `metadata` (trampa #2).

**REQ-02** — El doc `object-manager/docs/config-storage.md` (nuevo) MUST documentar: la columna `core_ObjectDefinition.versioningConfig`, la funcion `syncVersioningConfigToRegistry` (que persiste, en que fase del codegen), el shape persistido `{ versioning, prefillFrom }`, el gate de persistencia (persiste si el objeto declara `versioning` OR `prefillFrom`), y donde el resolver runtime LEE el registry (createInstance asNewVersion, createInstance prefillFrom declarativo, getVersionChain).

> **Que cambia**: nuevo doc de adopcion para hijos polimorficos.
> **Por que**: el doc existente es build-time (codegen); falta el "cuando declararlo" desde la optica del adoptante + reflejar que el derived remap ya esta en core.

**REQ-03** — El doc `object-manager/docs/polymorphic-children.md` (nuevo) MUST: explicar cuando declarar `polymorphicChildren` (hijos por `ownerType/ownerId`) vs `directChildren` (FK directa), cross-linkear a `codegen-polymorphic-children.md` para reglas de validacion (NO duplicarlas), y documentar que el remap de hijos derivados (`CurricularLink`) se generalizo al core via `applyDerivedRemap` + bloque `polymorphicChildrenDerived` (TICKET-049/UPONE-1219) — NO como hook per-mod ni deuda SP4.

> **Que cambia**: nuevo doc en layout para la row action declarativa.
> **Por que**: la activacion del boton "Nueva version" es declarativa y su visibilidad depende de relaciones hidratadas — sin doc, el adoptante no sabe por que el boton no aparece (trampa #3).

**REQ-04** — El doc `layout/docs/row-actions.md` (nuevo) MUST documentar la row action `type: "create"`: el shape JSON (`prefillFromCurrent`, `asNewVersion`, `redirectTo`, `visibilityConditions`), como `visibilityConditions` evalua dot-notation sobre el record hidratado, y el requisito de declarar `relations` en el config de la lista para que la hidratacion resuelva (ej. `currentStatus.allowsVersioning`).

> **Que cambia**: el ejemplo end-to-end real (Activity) vive en el PATTERNS.md del mod.
> **Por que**: la receta generica necesita un ejemplo concreto y verificable que el adoptante pueda copiar.

**REQ-05** — `mods/curriculum-design/.ai/PATTERNS.md` MUST extenderse con una receta end-to-end de la adopcion de Activity: los bloques reales de `activity.json` (versioning, prefillFrom, polymorphicChildren, polymorphicChildrenDerived), el seed de politica (`allowsVersioning` en PUB, `initialStatusId`), la row action, y como se lee el linaje. Sin romper el contenido existente del archivo.

> **Que cambia**: el deliverable estrella — la receta probada como seguible.
> **Por que**: es el criterio de aceptacion mas concreto del ticket (<30/<60 min).

**REQ-06** — El test de adopcion simulada MUST documentar dos caminos verificados contra el codigo: camino A (relations directas, ejemplo generico Invoice/LineItem, objetivo <30 min) y camino B (polymorphicChildren, Activity real, objetivo <60 min), cada paso trazado a `file:line`, incluyendo las 3 trampas conocidas con su sintoma/error exacto. Se entrega como seccion dentro de `versioning-capability.md` (o doc dedicado `adoption-test.md`, decision en S3).

**REQ-07** (SHOULD) — `object-manager/docs/prefill-capability.md` SHOULD revisarse para confirmar que sigue correcto y que los cross-links a los docs nuevos resuelven. No requiere reescritura (ya esta completo, HU-2).

## Tasks

### Session 1 — Core de versionamiento [tipo: auto] [tier: T1]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S1.T1 | Expandir `versioning-capability.md` (REQ-01 a-h) | developer | — | object-manager/docs/versioning-capability.md | DET-2, DET-16 | links + afirmaciones vs file:line | done | 1 |
| S1.T2 | Crear `config-storage.md` (REQ-02) | developer | — | object-manager/docs/config-storage.md | DET-1, DET-2 | afirmaciones vs file:line | done | 1 |
| S1.T3 | Revisar `prefill-capability.md` + cross-links (REQ-07) | reviewer | S1.T1,S1.T2 | object-manager/docs/prefill-capability.md | DET-13 | links resuelven | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T1) | reviewer | S1.T1,S1.T2,S1.T3 | ticket | DET-20, DET-23 | gate persistido + quality review docs | done | 1 |

**S1.T1 contract**: source_ref REQ-01; expected_output: doc con secciones runtime/receta/ejemplo/politica/versionSourceId-vs-sourceRefId/Versionar-vs-Clonar, sin perder el contenido HU-4 existente; rollback: git revert del archivo.
**S1.T2 contract**: source_ref REQ-02; expected_output: doc nuevo con columna/sync/shape/gate/lectura-runtime; rollback: rm archivo.

### Session 2 — Layout + ejemplo del mod [tipo: auto] [tier: T1]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S2.T1 | Crear `polymorphic-children.md` (REQ-03) | developer | — | object-manager/docs/polymorphic-children.md | DET-2, DET-16 | cross-link codegen doc resuelve; DISC-4 reflejado | done | 2 |
| S2.T2 | Crear `layout/docs/row-actions.md` (REQ-04) | developer | — | layout/docs/row-actions.md | DET-2 | shape vs useCreateRowAction.ts | done | 2 |
| S2.T3 | Extender `PATTERNS.md` con receta Activity (REQ-05) | developer | S1.T1 | mods/curriculum-design/.ai/PATTERNS.md | DET-2, DET-16 | bloques vs activity.json | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T1) | reviewer | S2.T1,S2.T2,S2.T3 | ticket | DET-20, DET-23 | gate persistido + quality review | done | 2 |

### Session 3 — Test de adopcion simulada [tipo: auto] [tier: T1]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S3.T1 | Escribir test de adopcion: camino A + B + 3 trampas (REQ-06) | developer | S1.T1,S2.T1,S2.T2 | object-manager/docs/versioning-capability.md (seccion) o adoption-test.md | DET-2, DET-7 | cada paso trazado a file:line | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T1) | reviewer | S3.T1 | ticket | DET-20, DET-23 | receta seguible end-to-end | done | 3 |

### Session 4 — Cierre [tipo: auto] [tier: T1]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S4.T1 | Review de legibilidad por reviewer aislado read-only | reviewer | S1,S2,S3 | object-manager/docs/, layout/docs/, mods/curriculum-design/.ai/ | DET-13, DET-14 | reviewer confirma legibilidad | done | 4 |
| S4.T2 | Commits granulares por repo (DET-27) | scribe | S4.T1 | repos | DET-27 | commits en ramas de epica | done | 4 |
| S4.T3 | teach-close (DET-22) + status closed | scribe | S4.T2 | ticket | DET-22, DET-30 | teach-close.html valid | done | 4 |
| **S4.GATE** | Gate de cierre (tier T1) | reviewer | S4.T1,S4.T2,S4.T3 | ticket | DET-13, DET-20 | acceptance ejecutado | done | 4 |

## Technical reference

> Hechos verificados (intake research). Las docs deben anclar sus afirmaciones a estos.

- **prefillFrom**: `prefill-from-source.js` — `PREFILL_DEFAULT_EXCLUDE = ['id','createdAt','updatedAt','createdBy']` (L20); gating por `source` (L136+); merge declarativo+runtime en `resolveEffectivePrefillFrom` (L79).
- **asNewVersion**: `version-from-source.js` `prepareVersionData` (L23): valida `currentstatus.allowsVersioning` (L42 → SOURCE_NOT_VERSIONABLE), `workflow.initialStatusId` (L48 → WORKFLOW_HAS_NO_INITIAL_STATUS), bump = max del linaje + 1, set linkageField=source.id, reset initialStateField. Extraccion en `instance.resolver.js:2285`; requiere prefillFrom.source (L2321 AS_NEW_VERSION_REQUIRES_PREFILL); $transaction Serializable (L3115). Bug: relacion singular lowercase `currentstatus`.
- **getVersionChain**: `instance.resolver.js` (SDL `static.js:969`): backward por linkageField + forward BFS (L2216-2236), orderBy versionField asc (L2246), versionNumber 1-based post-RBAC; OBJECT_NOT_VERSIONABLE si no hay versioningConfig.versioning (L2194).
- **versionSourceId vs sourceRefId**: `changeLog.json` (versionSourceId L121-126 = linaje de version, createdVia='version'; sourceRefId L91-96 = referencia a origen externo/hijo polimorfico, patron L40). Resolver `auditCapture.resolver.js:615-618`.
- **row action type:create**: `layout/src/composables/useCreateRowAction.ts` `buildCreateData` (L68-77): `prefillFromCurrent`→`data.prefillFrom={source:rowId}`, `asNewVersion`→`data.asNewVersion=true`; `redirectTo` edit|view|none; visibilidad `useRowActionHandler.ts:155-173` via `evaluateGroup`; requiere `relations:["currentStatus"]` para hidratar.
- **politica**: `prisma/UPU/schema.prisma` `WorkflowStatus.allowsVersioning Boolean @default(false)` (L1176), `Workflow.initialStatusId String?` (L1152). Seed `_data-workflow-objects.js`: solo `PUB` con allowsVersioning=true (L35-45), initialStatusCode='BOR' para activity-* (L55-61).
- **config-storage**: `schema.prisma:28` versioningConfig Json?; `generatePrismaSchema.js:2549` syncVersioningConfigToRegistry, shape `{versioning, prefillFrom}` (L2575-2577), Fase 3 (L1292-1296).
- **Activity adoption**: `mods/curriculum-design/objects/activity.json` (metadata L11-39): versioning + prefillFrom + polymorphicChildren[sections] + polymorphicChildrenDerived[CurricularLink] + requiredCapability "activity:version". Derived remap core: `deep-clone-polymorphic.js:108` applyDerivedRemap, invocado `instance.resolver.js:3073-3091`.

## Constraints

- Docs en espanol neutro (codigo/keywords en ingles). Comentarios de codigo en ejemplos: espanol.
- No modificar codigo — solo `.md`. Si una doc revela un bug, registrar como learn/bug, no corregir.
- Cross-repo: commits con `git -C <repo>` a su rama de epica; push NO (super pregunta).

## Dependencies

- HU-1..HU-11 (tickets DKC 033-045) — todas cerradas. Codigo entregado.
- Docs existentes a respetar: `prefill-capability.md`, `versioning-capability.md` (base a expandir), `codegen-polymorphic-children.md`.

## Risks

- **Doc desincronizada con codigo futuro**: las docs referencian SP3; cambios SP4 (user-provided/semver, derived generico) podrian invalidar. Mitigacion: marcar explicitamente "alcance SP3" donde aplique.
- **PATTERNS.md grande (611 lineas)**: extender sin romper. Mitigacion: agregar seccion nueva al final, no reescribir.

## Open questions

- Ninguna bloqueante. Decision de S3 (seccion en versioning-capability.md vs doc dedicado `adoption-test.md`) se resuelve en ejecucion segun longitud.

## Acceptance

- [ ] versioning-capability.md cubre REQ-01 (a-h), afirmaciones ancladas a codigo.
- [ ] config-storage.md cubre REQ-02.
- [ ] polymorphic-children.md cubre REQ-03 (incl. DISC-4 core generalization).
- [ ] layout/docs/row-actions.md cubre REQ-04.
- [ ] PATTERNS.md extendido con receta Activity (REQ-05) sin romper contenido previo.
- [ ] Test de adopcion (camino A + B + 3 trampas) verificado contra file:line (REQ-06).
- [ ] prefill-capability.md revisado, cross-links resuelven (REQ-07).
- [ ] Reviewer aislado confirma legibilidad.
- [ ] Commits por repo en ramas de epica; teach-close generado.
