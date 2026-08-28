---
id: TICKET-134
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1619
module: curriculum-design
autopilot: autonomous
---

# Curriculum Design · Implementación de InstructionalComponent

## Request

Modelar las piezas de dictado (InstructionalComponent) anidadas a la Modality con sus atributos, y derivar la carga horaria de la modalidad desde esas piezas en lugar de digitarla, desbloqueando a academic-scheduling y engagement. Alcance completo: catálogo de tipos de pieza de dictado con su carga inicial mínima; RecordType InstructionalComponent anidado a Modality (tipo, horas semanales, tamaño de grupo planificado, cantidad de docentes requeridos, otros acordados); carga horaria de la modalidad derivada (no digitada) desde sus piezas, con resolver del mod; retiro de las 4 columnas de horas digitadas del JSON del mod; formulario del curso mostrando las piezas de cada modalidad y el total derivado, con listado embebido anidado en la edición; capacidad del loader del seed de anidar piezas bajo la modalidad y datos/conteos del seed actualizados; publicación en core (object-manager): catálogo y RecordType en objects/business/, retiro de 4 claves de horas, regeneración y migración de los 18 prisma/<TENANT>/schema.prisma; capabilities de los objetos nuevos cableadas a roles curriculares existentes; i18n es/en/pt con paridad de keys; tests (idempotencia de catálogo, derivación de horas, seed coherente) y smoke runtime del formulario. Entrega por hitos: Hito 1 (objetos publicados, aditivo), Hito 2 (modelo funcional en el mod), Hito 3 (destructivo: drop de las 4 claves + DROP COLUMN en 18 schemas). Coordinar con UPONE-1615 (_data-rbac.js), UPONE-1541 (seed-counts) y UPONE-1530 (MCP). Aviso a academic-scheduling: los tipos de recurso que requiere cada pieza quedan fuera de alcance.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | multi (mod curriculum-design + core object-manager); toca el modelo de datos y 18 schemas de tenant |
| Modulo principal | curriculum-design |
| Modulos afectados | object-manager (publicacion de objetos + 18 prisma schemas + migracion destructiva); academic-scheduling y uengagement como consumidores downstream (fuera de alcance, se avisa) |
| Layer | core (edita object-manager/objects/business/ + prisma/, aplica RULE-dev-004 / core_work_policy) |

## Creation scope

| Dimension | Aplica | Que se crea |
|-----------|--------|-------------|
| creates_data | true | Catalogo de tipos de pieza de dictado (objeto nuevo o enum — decision de diseno, ver Triage H5) + RecordType `InstructionalComponent` anidado a Modality (tipo, horas semanales, tamano de grupo planificado, cantidad de docentes requeridos, otros). Retiro de 4 campos de horas digitadas de `rt__Modality__curricularsection`. |
| creates_visual | true | Layout de detalle de Modality con `record-list` embebido anidado de InstructionalComponent (filtrado por `parentId = modalityId`) + total de carga horaria derivado; ajuste del tab "Modalidades" del formulario del curso (retiro de las 4 columnas de horas digitadas, mostrar total derivado). |

> **DET-18 (gate de draft)**: con `creates_visual` y `creates_data` en true, `design-draft` es BLOQUEANTE. El dev aprueba el modelo de datos + preview del formulario antes de congelar la spec (`draft_approved` pasa de `null` a `true`).

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `InstructionalComponent` se modela como **RecordType de `CurricularSection`** anidado por `parentId = modalityId` (Composite self-referencial), NO objeto nuevo con FK `modalityId`. | inferred | Patron identico en `rt__EvaluationComponent__curricularsection.json:8` (jerarquia via parentId) y `rt__Group__requirement.json:8`; self-FK en `CurricularSection.json:70-77` |
| H2 | La **carga horaria derivada** de la Modality se entrega por **read-enrichment** en el override `getInstance`/`listInstances` del mod, NO por field resolver GraphQL. | confirmed | `logic/helpers/effectiveCredits.js:1-13` (DEC-LOCAL-01 + learn L1), `logic/curriculum-read.resolver.js:47,231,305`; RULE-curriculum-design-017 |
| H3 | El **retiro de las 4 columnas de horas** exige quitarlas del JSON del MOD (no solo del core): el merge append-only las reintroduce mientras el mod las declare. | confirmed | RULE-curriculum-design-043; campos en `rt__Modality__curricularsection.json:18-41` (theoryHours/practiceHours/labHours/autonomousHours) |
| H4 | El **listado embebido anidado** se hace con `record-list` + `filters {{parentId}}` + `recordType`, replicando el tab "Modalidades". | confirmed | `config/layouts/default_Activity_view.json:177-211`; RULE-curriculum-design-027 (embedding != directChildren) |
| H5 | El **catalogo de tipos de pieza** es objeto catalogo real `InstructionalComponentType` (name unique, code, priority opcional), NO enum — "porque el vocabulario varia por pais". Carga inicial: 8 tipos (Catedra, Practica, Laboratorio, Taller, Seminario, Ayudantia, Clinica, Terreno). | confirmed (decidido SP9) | `kb/sp9/00-carga-curriculum-design-instructionalcomponent.md:56`; `kb/sp8/instructional-component-plan-implementacion.md:70-76`; `kb/sp8/00-registro-analisis-instructionalcomponent.md:69` |
| H10 | La **pieza** es `rt__InstructionalComponent__curricularsection` con 8 atributos: `componentTypeId` (FK catalogo), `hoursPerWeek`, `plannedGroupSize`, `requiredInstructorCount`, `deliveryLocation`, `synchronicity`, `isPrimary`, `requiresOwnSection`. Sin DataLog (precedente RT hermanos). | confirmed (decidido SP9) | `kb/sp9/UPONE-1619-detalle.md:74,190`; `kb/sp9/00-carga-curriculum-design-instructionalcomponent.md:61-64`; `kb/sp9/UPONE-1619-pre-intake.md:366-369` |
| H11 | `requiredResourceTypes` (lo que academic-scheduling necesita) esta **FUERA de alcance** de este ticket; se avisa como hueco explicito. | confirmed (decidido SP9) | `kb/sp9/UPONE-1619-tipos-de-recurso-frontera-cd-as.md`; `kb/sp9/UPONE-1619-aviso-academic-scheduling.md` |
| H12 | Estimacion **13 SP**; el tramo de core (publicacion + retiro) va DENTRO del ticket (sub-tarea 1C-c), no en ticket aparte. | confirmed (decidido SP9) | `kb/sp9/UPONE-1619-detalle.md:172-182`; `kb/sp9/UPONE-1619-publicacion-en-core.md` seccion 5 |
| H6 | Publicacion en core = mirror 1:1 mod→`object-manager/objects/business/` + codegen + `tenant:migrate` sobre **18 schemas**; el drop de columnas es **destructivo** (DROP COLUMN en 18). | confirmed (18 schemas) / inferred (proceso publish) | 18 `schema.prisma` en `object-manager/prisma/` (mirror byte-a-byte verificado); scripts `codegen`/`tenant:migrate` en `object-manager/package.json`. GAP: script de publish/sync no ubicado |
| H7 | Complejidad: **complejo** (6+ tasks), entregado en 3 hitos: H1 aditivo (objetos publicados) → H2 funcional (modelo en el mod) → H3 destructivo (drop 4 claves + DROP COLUMN en 18). | inferred | Alcance del Request; core_work_policy exige coordinacion de core |
| H8 | La **paridad i18n es/en/pt** de InstructionalComponent es trabajo NUEVO: en/pt estan casi vacios para RTs de CurricularSection hoy. | confirmed | `lang/en/`, `lang/pt/` sin archivo para `rt__Modality__curricularsection`; `lang/es/rt__Modality__curricularsection.i18n.json:1-21` |
| H9 | Las capabilities nuevas cablean a los **4 roles curriculares** de `_data-rbac.js` (o reusan `curricularsection:*` por ser otro RT del mismo base). | inferred | `seed/_data-rbac.js:1-45` (Consultor/Disenador/Revisor/Autoridad Curricular); `capabilities.json:49-109` (curricularsection:*) |

### Context found

**Rules del modulo (curriculum-design) directamente aplicables:**
- **RULE-curriculum-design-017** (must) — un mod NO puede registrar field resolvers de tipo GraphQL; campos derivados van por read-enrichment. Gobierna H2 (carga horaria derivada).
- **RULE-curriculum-design-043** (must) — el merge append-only (`fileSync.js:744-752`) reintroduce campos core que el mod redeclara; un drop diferido no pega mientras el mod los declare. Gobierna H3 (retiro de 4 columnas).
- **RULE-curriculum-design-027** (should) — `metadata.directChildren` (deep-clone/codegen del object-manager) vs embedding de hijos como tabs por `record-list` + `{{parentId}}`. Gobierna H1/H4.
- **RULE-curriculum-design-022** (should) — seed idempotente: owner determinista + guard global por label. Gobierna el seed del catalogo (H5) y de las piezas.
- **RULE-curriculum-design-023** (should) — campo base requerido sin `static_default` debe estar en los layouts create/edit del RT.
- **RULE-curriculum-design-016** (should) — el `enum` de un campo `rt__*` es SOFT (lo enforzan UI y MCP, no el backend). Relevante si el tipo de pieza se modela como enum (H5).
- **RULE-curriculum-design-018** (must) — el codegen ignora `metadata.indexes`; la nullability la decide `required[]`, no `not_null`.
- **RULE-curriculum-design-013** (must) — FK polimorfica (ownerType/ownerId) sin integridad referencial: validar en capa app.
- **RULE-curriculum-design-010** (must) — un objeto que pasa de tenant-specific a mod-defined deja un Base override STALE que sombrea la def mod-derived.
- **RULE-curriculum-design-009** (must) — adaptar a reduccion de modelo upstream: verificar liveness contra el git del core + blast radius sobre TODOS los objetos reducidos. Aplica al drop de las 4 columnas.
- **RULE-curriculum-design-044** (should) — los default layouts del mod se siembran por `dbSync` Phase 5.
- **RULE-curriculum-design-012** (should) — layouts por RecordType por convencion de nombre `default_rt__<RT>__<base>_<mode>.json`.
- **RULE-curriculum-design-048** (should) — el `roles[]` de un layout declara el rol institucional real.
- **RULE-curriculum-design-020** (should) — i18n de componente anidado bajo su clave, no archivo con claves planas.
- **RULE-curriculum-design-029** (must) — smoke visual obligatorio para features UI antes de cerrar (vitest node-env no monta `.vue`).
- **RULE-curriculum-design-006** (must) — `Activity` es co-definido por curriculum-design + uengagement-up1 (dos mods, un modelo).

**Bugs abiertos del modulo a tener presentes:**
- **BUG-curriculum-design-016** (confirmed) — los roles curriculares no tienen `institution:view`; puede afectar el cableado RBAC de los objetos nuevos (H9).
- BUG-curriculum-design-018 (fixed) — precedente de seed con valor fuera de enum: valida el enum del catalogo/tipo contra el seed.
- Resto (DataLog/versioning) no bloqueante para este ticket.

**Specs relacionados (patrones a reusar):**
- `SPEC-curriculum-design-planentry-requirementcategory` — creacion de objetos anidados del mod.
- `SPEC-024-curriculum-plan-minor-object` — objeto nuevo tipado por RecordType + vista.
- `SPEC-021-academic-program-object` — objeto nuevo v1 CRUD plano (patron de alta de objeto de negocio).
- `SPEC-018-hu10-row-actions-version-duplicate` — la accion "duplicar Modalidad" ya existe (Modality como RT duplicable).

**Code context (uplanner/up1):**
- Modality = `rt__Modality__curricularsection` (`mods/curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json`); base `CurricularSection.json` aporta ownerType/ownerId/parentId/position.
- 4 columnas de horas: `rt__Modality__curricularsection.json:18-41`.
- Read-enrichment: `logic/helpers/effectiveCredits.js` + `logic/curriculum-read.resolver.js:47,231,305`.
- Seed nesting por parentId: `seed/_data-requirement.js:35-141` (createNode); nesting satelite: `seed/_data-syllabus-sections.js:409-414`.
- Layout embebido: `config/layouts/default_Activity_view.json:177-211` (tab Modalidades) + `default_Activity_edit.json:112`.
- Core: `object-manager/objects/business/{Base,RecordTypes}/` (mirror 1:1); 18 `schema.prisma` en `object-manager/prisma/`.
- RBAC: `seed/_data-rbac.js:1-45` (4 roles); `capabilities.json`.
- i18n: `lang/{es,en,pt}/rt__Modality__curricularsection.i18n.json` (solo es hoy).

**Warnings / riesgos:**
- Migracion **destructiva** (DROP COLUMN de 4 campos en 18 schemas): en up1 el sync genera la migracion completa de todos los mods, no es quirurgica por-mod; coordinar con core (RULE-dev-004 / core_work_policy, y feedback up1_sync_non_surgical). Sensibilidad ALTA aunque el esfuerzo del drop sea menor.
- El merge append-only (RULE-043) obliga a retirar las 4 columnas tambien del JSON del mod, no solo del core.
- Paridad i18n en/pt es trabajo nuevo real (no replicacion de 1→3).
- La derivacion de horas NO puede ser field resolver (RULE-017): debe ser read-enrichment.

**Desde analisis SP9 (fuente de verdad de las decisiones — `projects/up1/kb/sp9/`):**
- `UPONE-1619-detalle.md` — linea de ejecucion canonica: historia, alcance, AC, DoD, tests, 13 SP, 3 hitos.
- `UPONE-1619-pre-intake.md` — decisiones + alternativas descartadas (catalogo vs enum, A1/A2/A3 derivacion, B2/B3 retiro, C1/C2 seed) + dimensionamiento.
- `UPONE-1619-explicativo.html` — material explicativo del ticket (contexto y racional para revision).
- `UPONE-1619-publicacion-en-core.md` — publicacion mod→core dentro del ticket, 18 schemas + BASEMODEL, commits con id UPONE-1619 (precedente UPONE-1523).
- `UPONE-1619-aduana.md` — veredicto Aduana: 7 artefactos, todos mod-only.
- `UPONE-1619-tipos-de-recurso-frontera-cd-as.md` + `UPONE-1619-aviso-academic-scheduling.md` — `requiredResourceTypes` fuera de alcance; aviso listo para academic-scheduling al publicar Hito 1.
- `00-carga-curriculum-design-instructionalcomponent.md` — analisis de carga/seed, orden interno de sub-tareas (1A→1B→1C-a→1E-a→1E-b→1D→1C-b→1C-c).
- SP8: `kb/sp8/instructional-component-plan-implementacion.md`, `00-registro-analisis-instructionalcomponent.md` — origen de las decisiones de modelado (RT vs objeto, catalogo abierto).

**GAPS restantes:**
- G1: Coordinacion con **UPONE-1615 (`_data-rbac.js` / capabilities), UPONE-1541 (`seed-counts.test.ts` + seed run), UPONE-1530 (acuerdo MCP sync)** — no serializar tickets completos, coordinar en los archivos compartidos. En DKC: TICKET-133/135/137. (UPONE-1616 no aparece en el analisis SP9.)
- G2: RESUELTO en SP9 → catalogo objeto real (ver H5).
- G3: RESUELTO → publicacion = mecanismo `npm run sync` (Phase 1 Mirror + Phase 3 Prisma) + codegen; NO hay script per-objeto.
- G4: Decisiones tecnicas menores abiertas en SP9 (se cierran en design-feature): cuales de los 8 atributos de la pieza son obligatorios/opcionales; si el catalogo lleva `priority`; donde exactamente se expone el total derivado.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | layer:core → rama de epica `UPONE-{epica}` (a confirmar; candidata UPONE-1267) o `UPONE-1619` si el ticket no pertenece a epica (core_work_policy / RULE-dev-004). Trabajo mod-side puede ir en su rama; el drop en BD se coordina con core |
| Base branch | develop (config `repo.default_branch`) |
| DB state | requiere `npm run codegen` + `npm run sync` + `tenant:migrate` sobre los 18 schemas. Hito 3 introduce `DROP COLUMN` destructivo de 4 campos en 18 schemas (coordinar con core; no quirurgico) |
| Services | object-manager (4000), suite (3000), postgres, redis; pipeline de `sync` (mods→core) |
| Test data | seed del catalogo de tipos + piezas `InstructionalComponent` anidadas bajo Modality; tenant de prueba UPU |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | **El merge del sync es UNION-ONLY (append-only): suma/actualiza pero nunca RESTA de core.** Consecuencia práctica sobre cuándo hace falta commit de core (object-manager) vs cuándo el mod alcanza: **(a) Aditivo** (objeto nuevo, campo nuevo, nueva entrada en `required[]`, update de atributos de un campo no-core) → el `codegen` de la integración de develop regenera el mirror + prisma y el deploy migra; **el mod alcanza, sin commit de core a mano** (caso E1). **(b) Substracción/redefinición** (quitar un campo, quitar de `required[]`/hacer nullable por remoción, redefinir campo de objeto `core:true`) → el union-only NO puede → **requiere commit de core explícito** (editar `objects/business/` + prisma + commit). Evidencia: `fileSync.js` `applyModChangesToObject` (solo itera campos del mod); commit de core `fbdcfcb6` (UPONE-1623) lo dice literal: *"The sync merge is union-only and cannot drop a required field, so this must be fixed in core"* — planEntry.period nullable necesitó su propio commit de core aunque el mod ya lo declaraba. Aplica a UPONE-1619: E1 (adición) = solo mod; E3 (retiro 4 columnas) = requerirá commit de core (S6.T3). Refina/confirma RULE-curriculum-design-043. | S2 (publicación) | S2 | refined | RULE-curriculum-design-043 |
| L2 | Mostrar el NOMBRE de una FK escalar (sin relacion Prisma) en un RecordDetail se resuelve con el SELECT NATIVO de la plataforma, no con un componente custom. Config en el layout (view/edit/create): `{ "type": "select", "references": "<ObjetoCatalogo>", "valueField": "id", "displayField": "name" }`. El motor lo maneja en `layout/src/layouts/RecordDetail/RecordDetail.vue`: `fetchReferenceSelectOptions` (~2045) + branch `enrichSchemaWithFKMetadata` (~3427) para campos que NO son isForeignKey pero declaran `references`+`type:select`. En view queda como select disabled mostrando el nombre; en edit/create es dropdown buscable que guarda el id. Distinto del path FK-automatico (RecordDetail.vue ~2264, gated por `field.isForeignKey`) que exige relacion real. Precondicion: el rol necesita `<objetocatalogo>:view` (el dropdown hace listInstances del catalogo). Evidencia en produccion: default_Offering_syllabus_create.json (selector Asignatura->Activity) y ~10 layouts de up1-manager/uengagement. UPONE-1619: se aplico a componentTypeId (catalogo InstructionalComponentType) reemplazando el componente custom InstructionalComponentTypeName, que se elimino. | developer | #5 | refined | RULE-curriculum-design-049 |
| L3 | Un campo DERIVADO por read-enrichment (no persistido, no esta en core_FieldDefinition) NO debe ir en un layout de EDIT/CREATE, solo en VIEW. En edit se cuela al payload de la mutacion: el override del mod `polymorphicUpdate.resolver.js` (~564) clasifica los campos entrantes (rtFields/extFields/baseCustomFields) y hace FALLBACK a baseFields para lo desconocido, que termina en `prisma.CurricularSection.update({ data: {...baseFields} })` y Prisma lo rechaza como `Invalid value for argument` -> friendly "Valor invalido" (mapeado en instance.resolver.js ~6866 y curriculum-update.resolver.js). Ademas el valor derivado queda OBSOLETO en el form de edit hasta reabrir (el enrichment recalcula solo en la lectura, no en vivo). `submits:false` en el custom element + `readonly:true` en el layout NO bastaron para evitar el leak. Solucion UPONE-1619: totalHoursPerWeek (suma de piezas) se quito del layout edit de rt__Modality__curricularsection y quedo solo en view (InstructionalTotalDisplayElement, que SIGUE siendo custom correcto porque el valor no es un campo real). Regla general: agregados derivados = view-only. | developer | #5 | refined | RULE-curriculum-design-050 |
| L4 | El RecordList YA soporta columnas de proyeccion de relacion (dot-path `<relacion>.<campo>`), y son OPT-IN: solo renderizan si la columna declara `visible: true`. Mecanismo en `layout/src/composables/useColumnConfiguration.ts` (relationColumnFields ~108-125 detecta la columna sintetica; gate ~219: `visible: relationColumnKeys.has(col.key) ? col.visible === true : col.visible !== false`) + `recordListFormatters.ts` getDisplayValue camina el dot-path; el dato de relacion se pide solo con declarar `relations` (useDataFetching.ts:157 deriva `includeRelations:true` de `relations`). Mergeado en layout por el commit `4b9bf665` "feat(recordlist): support opt-in to-one relation columns" (2026-08-12). Aplicado a UPONE-1619: bastó agregar `visible:true` a las 4 columnas dot-path del piezasList (view+edit) para que Tipo/Horas semanales/Tamano de grupo/Docentes rendericen (smoke UPU verificado con valores por pieza). Es MOD-ONLY, no core. Precedente: `section-list` de academic-scheduling declara 3 columnas de relacion. NOTA de atribucion: la rama del merge fue `feat/UPONE-1503` pero en Jira UPONE-1503 es otro tema (Roles/Permisos); no citar UPONE-1503 como el ticket de esta capacidad. | developer | #5 | refined | RULE-curriculum-design-051 |
| L5 | Error de proceso a no repetir: se concluyo "el motor RecordList no soporta columnas dot-path de relacion -> es core" leyendo UNA funcion (`applyLayoutColumnOverrides`, RecordList.vue:7283-7298) + un comentario obsoleto/mal atribuido (~7417), sin revisar el composable que realmente maneja el caso (`useColumnConfiguration.ts`) ni el git log de layout. Esa conclusion equivocada se propago a un doc de followup, un veredicto de Aduana, drafts de core-extension y hasta un ticket Jira creado (UPONE-1686) sobre premisa falsa: la capacidad YA existia (commit 4b9bf665). Lo destapo dkc-detective-mode al verificar contra el codigo real (DET-33/DET-4). Reglas para la proxima: (1) antes de declarar "falta capacidad de core", buscar el MECANISMO completo (grep del feature en composables/utils, no una sola funcion) y `git -C layout log --grep` por el feature; (2) un comentario en el codigo puede estar desactualizado -> verificar contra el codigo que corre, no contra el comentario; (3) verificar la premisa contra el codigo ANTES de escalar a Aduana/core-extension/crear ticket, no despues. Costo evitable: un ticket Jira de mas. Mitigacion aplicada: fix real es mod-only (visible:true); UPONE-1686 se comenta con el hallazgo y se cierra. | developer | #5 | refined | DEC-020 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Actor |
|-----------|--------|-------|-------|
| 2026-08-19 | autopilot: (none) → super; autopilot_target: E1 | Dev pidio "super autopilot llega al primer hito de entrega". Corre autonomo hasta S2.GATE (borde de Entregable E1), PARADA DURA ahi (anula continuidad autopilot). | dev |

### Session 1 — Hito 1 / E1: Catalogo InstructionalComponentType (1A) [tier: T2]

- **Iniciada**: 2026-08-19
- **session_goal**: Catalogo InstructionalComponentType (objeto + seed idempotente + test)
- **Branch**: `UPONE-1619` (monorepo up1) — layer:core, core_work_policy (rama de ticket, no epica; decision dev)
- **Guard de inicio (DET-30)**: rama != protegida ✓ (creada UPONE-1619 desde develop); execute_scope respetado (S1 100% `mods/curriculum-design/`, no toca core)

**Tasks completadas:**
- [x] S1.T1 — Crear objeto catalogo `InstructionalComponentType.json` (name unique, code, priority opcional); patron ResourceTypes — `mods/curriculum-design/objects/InstructionalComponentType.json`
- [x] S1.T2 — Crear seed idempotente del catalogo (8 tipos, guard por name) via config-*.js — `mods/curriculum-design/seed/config-instructionalcomponenttype.js`
- [x] S1.T3 — Test integracion: seed catalogo idempotente + rechaza name repetido — `mods/curriculum-design/tests/integration/instructionalcomponenttype-seed.test.ts` (4 tests verde)
- [x] S1.GATE — Quality review T2 + persistir + decision: **continue**

**S1.GATE — Quality review DET-23 (tier T2, standard) — 2026-08-19:**

| Dim | Estado | Nota |
|-----|--------|------|
| 1 calidad (sin console.* prod) | pass | sin console.* en los 3 archivos |
| 2 lint | warn | eslint del repo roto por entorno (ESLint 8.57 + ajv `missingRefs`) — **pre-existente, no de este cambio**; JSON validado con `JSON.parse`, transform esbuild/vitest sin errores |
| 3 tipado | pass | 0 `any`; imports de JS sin tipos anotados con `@ts-expect-error` + tipado local (SeedEntry/CatalogRow) |
| 4 testing | pass | 4 tests con assertions concretas (8 filas, name unico, created 8/0, skipped 8, sin duplicados); ejercita el motor REAL `seedUpsert` |
| 5 escalabilidad (DET-41) | pass | catalogo acotado por codigo (8 tipos, no por dato de cliente); seedUpsert O(n) |
| 6 mantenibilidad | pass | patron ResourceTypes; comentarios en espanol; sin magic values |
| 7 claridad | pass | nombres descriptivos |
| 8 a11y | n/a | S1 sin UI |
| 9 storybook | n/a | S1 sin componente |
| 10 error-handling | pass | unique constraint declarado; motor maneja errores por entry |

**Decision: continue** — S1.GATE es interno a E1; autopilot super NO se detiene aqui. Sigue a S2 (RT pieza + publicacion). Verificacion self-report (DET-33): archivos en disco confirmados, tests re-corridos verde, cero regresion en suites de seed/declared (236/236).

**Regresion S1** (aditivo, sin cambios de comportamiento existente):

| Suite | Comando | Resultado |
|-------|---------|-----------|
| seed-counts + seed-entry + recordtypes-declared + layouts-declared | `npx vitest run` | 236/236 verde |
| instructionalcomponenttype-seed (nuevo) | `npx vitest run` | 4/4 verde |

**Hallazgos de setup:**
- HALLAZGO-S1-01 (DET-4): los `config-*.js` del seed son auto-descubiertos por `dbSync` Phase 7 (cualquier `.js` sin prefijo `_`) y su idempotencia la da el motor `seedUpsert` via `uniqueKey`. NO hace falta "enganchar en seed.js" como asumia el spec (S1.T2 files listaba seed.js). Solo los `_data-*.js` se importan manualmente. Reduce blast radius: S1.T2 no toca seed.js.
- HALLAZGO-S1-02: publicacion en core (S2.T5) diferida — object-manager tiene sync sin commitear de otros mods (curriculum-mapping/retention-wellbeing/uengagement-up1, WIP en feat/resources-catalog). Plan A acordado con dev: aislar el diff al ejecutar S2.T5.

### Session 2 — Hito 1 / E1: RecordType pieza + publicacion aditiva en core [tier: T3] [⚑ fuerte]

- **Iniciada**: 2026-08-19
- **session_goal**: RT `rt__InstructionalComponent__curricularsection` + layouts + publicacion aditiva en core; cierra E1
- **Branch**: `UPONE-1619` (submodulo curriculum-design)
- **Alcance de esta corrida (acordado con dev)**: S2.T1, S2.T2, S2.T4 (mod-side, limpio). **PARADA** antes de S2.T3 (coord. UPONE-1615) y S2.T5 (publicacion core, plan A) — dependencias externas a resolver con el dev.

**Tasks completadas:**
- [x] S2.T1 — RT `rt__InstructionalComponent__curricularsection.json` (8 atributos; required=[componentTypeId, hoursPerWeek]; componentTypeId FK escalar SIN isForeignKey; sin enableDataLog) — commit `ad892ad`
- [x] S2.T2 — 4 layouts `default_rt__InstructionalComponent__curricularsection_{list,view,create,edit}.json` (RULE-012; requeridos en create/edit RULE-023) — commit `ad892ad`
- [x] S2.T4 — `recordtypes-declared.test.ts` (13→14 RT) + `layouts-declared.test.ts` (59→63) — commit `eeb6ec5`. Suite full **1576/1576 verde**
- [x] S2.T3 — Capabilities del catalogo (`instructionalcomponenttype:{view,create,modify,delete}` en capabilities.json) + cableado a 4 roles en `_data-rbac.js` (view en READ_CAPS, create/modify a Disenador, delete a Autoridad); la PIEZA queda cubierta por `curricularsection:*` generico. Suite 1576/1576. Commit `8b0ce0a`. Decision dev: cablear completo ahora; UPONE-1615 absorbe en su refactor de sets
- [~] S2.T5 — **PARCIAL**: (a) freeze de identidad verificado + (b) publicacion de DEFINICIONES en core (mirror aislado de los 2 objetos a `object-manager/objects/business/`, commit `bd28343d` en object-manager rama UPONE-1619). **DIFERIDO (decision dev)**: codegen (18 prisma) + `tenant:migrate` + `drift:check` — requieren baseline limpio (ver HALLAZGO-S2-03)
- [ ] S2.T6 — Aviso academic-scheduling — identidad congelada ✓, pero FK aun no anclable (tabla pendiente del migrate diferido). Pendiente
- [ ] S2.GATE — ★ Gate de entregable E1 — **bloqueado** por el migrate diferido (drift:check + smoke publish lo requieren). E1 no cierra hasta el migrate sobre baseline limpio

**HALLAZGO-S2-03 (DET-4, bloqueante del cierre de E1)**: `develop-core` (`object-manager/objects/business/` + prisma) esta **desactualizado respecto a los mods commiteados**. Un `sync:files` limpio regenera ~35 objetos ajenos a este ticket (planenrollment, programenrollment, GraduationProfile, sectioncluster, shift, timeblock, SectionAvailability, report-builder ReportPivot/Filter/Kpi/…), ademas del WIP sin commitear de 3 mods (curriculum-mapping/retention-wellbeing/uengagement-up1). Consecuencia: un `codegen` + `tenant:migrate` + `drift:check` NO se pueden aislar a mi cambio — el diff de prisma y el drift quedan contaminados por la staleness ajena. La publicacion de DEFINICIONES si se aislo (commit `bd28343d`, solo 2 objetos). El codegen/migrate/gate requieren primero poner develop-core al dia (catch-up de los mods commiteados + resolver el WIP) — fuera del alcance de UPONE-1619.

**Punto de parada final de esta corrida**: S1 completo; S2.T1/T2/T3/T4 completos; S2.T5 parcial (identidad + definiciones publicadas). E1 a un paso: falta el `tenant:migrate` (crea tablas → destraba academic-scheduling) + S2.GATE, ambos bloqueados por el baseline de develop-core.

**PR mod-side levantado (2026-08-19)**: rama `UPONE-1619` del submódulo `curriculum-design` **pusheada a origin** (Bitbucket). Alcance del PR = solo mod (opción B; el core aditivo lo regenera la integración de develop — ver learn L1). Commits: catálogo (feat+test), RT+layouts (feat), tests declarados (test), RBAC (feat), ortografía (style), fix TS2578 (fix). pre-push typecheck del mod: verde. **Dredd review de PR #47 (2026-08-19)**: corrida en subagente de contexto limpio (opus). Veredicto **aprobable-con-observaciones** (nada bloquea el merge del mod-side). Verificacion independiente: tests 198/198 en el subset + 1576/1576 full, typecheck exit 0, sin conflictos, RBAC completo trazado, seed idempotente contra motor real, FK escalar OK. Hallazgo principal: la publicacion en core (DoD Hito 1) la hace la integracion de develop (opcion B, ya sabido). Consultas → E2 (_list del RT, layout/picker del catalogo). No se posteo comentario (decision dev). **Fix aplicado (DET-19)**: se quitaron ids internos de KB (RULE-*, SP9, REQ-*, S1.T3) de descripciones/comentarios de mis archivos, reemplazados por lenguaje llano (commit `10dd516`); artefactos del repo usan solo el id de Jira UPONE-1619.

**PR #47 creado (OPEN)**: `https://bitbucket.org/uplanner/curriculum-design/pull-requests/47` (`UPONE-1619` → `develop`, close_source_branch=true). Coordinar `_data-rbac.js` con UPONE-1615 (entro primero). La rama local de object-manager (`bd28343d`) fue **borrada** por decisión del dev (redundante bajo opción B; el core aditivo lo regenera la integración de develop).

**Hallazgos S2:**
- HALLAZGO-S2-01 (DET-4/DET-40, verificado en repo): `isForeignKey: true` en up1 **SI genera relacion Prisma** (`prisma/BASEMODEL/schema.prisma:1234` — `sections Section[] @relation(...)` desde modalityId). Por eso `componentTypeId` se declara como **string escalar plano SIN isForeignKey** — cumple el contrato de la spec (FK escalar, no relacion, no en include; RULE-013) y no rompe el anclaje de academic-scheduling.
- HALLAZGO-S2-02 (open question): no hay convencion layout-level para respaldar un `select` escalar desde un objeto catalogo (solo `options` estaticas). El binding del dropdown de `componentTypeId` → catalogo InstructionalComponentType queda a **finalizar/verificar en E2 (smoke S5.T4, RULE-029)**, que es donde el render se prueba en runtime. Layouts creados bien formados; `componentTypeId` como `select native:false`.

**Punto de parada de esta corrida**: S2.T1/T2/T4 (mod-side) completos y commiteados. S2.T3 y S2.T5 requieren decision del dev (coordinacion UPONE-1615 + baseline de object-manager plan A). E1 NO cerrado — S2.GATE pendiente.

### Session 3 — Hito 2 / E2: Derivacion de carga horaria (read-enrichment) [tier: T2]

- **Iniciada**: 2026-08-19
- **Branch**: `UPONE-1619-e2-modelo-funcional` (submodulo curriculum-design, stacked sobre E1 — aisla E2 del PR #47)
- **session_goal**: derivar totalHoursPerWeek de la Modality desde sus piezas por read-enrichment

**Contexto post-reset (dev)**: el reset materializo E1 en core+BD (8 tipos de catalogo, tablas, RBAC 4 roles). Verificado read-only. Entorno listo para E2.

**Tasks completadas:**
- [x] S3.T1 — Helper puro `logic/helpers/instructionalHours.js` (`sumInstructionalHours`) — commit `a284dca`
- [x] S3.T2 — Override read-enrichment en `logic/curriculum-read.resolver.js`: `enrichModalityRows`/`enrichModalityItem` + ramas getInstance/listInstances para `CurricularSection` (RULE-017, NO field resolver) — commit `a284dca`
- [x] S3.T3 — Test `tests/integration/instructional-hours-derivation.test.ts` (8 tests) — commit `03a8118`
- [x] S3.GATE — Quality review T2: **continue**

**S3.GATE — Quality review DET-23 (T2) — 2026-08-19:**
- calidad/tipado/testing: pass (sin console.*, 0 `any`, 8 tests con assertions concretas 4+2=6/0/agrupacion). Lint: warn (eslint del repo roto por entorno, pre-existente). Escalabilidad (DET-41): pass — doble batch acotado por cardinalidad de modalidades (no piezas^2); lote sin modalidades = no-op sin query. Mantenibilidad: pass (patron effectiveCredits/currentCredits). a11y/storybook: n/a.
- **Decision: continue** (gate interno a E2; autopilot super no para). Verificacion DET-33: resolver carga OK, **suite full 1584/1584** (0 regresion en curriculum-read), typecheck limpio.
- Hallazgo (contingencia A3, ya conocido): `totalHoursPerWeek` es derivado no-persistido → el record-list no lo pinta como columna sin via aparte (mismo caso que `currentCredits`). Se resuelve/verifica en S5 (smoke).

### Session 4 — Hito 2 / E2: Seed loader + datos + conteos [tier: T2]

- **Iniciada**: 2026-08-19 · **Branch**: `UPONE-1619-e2-modelo-funcional`
- **session_goal**: el seed anida piezas bajo la Modality + conteos actualizados

**Tasks completadas:**
- [x] S4.T1 — Extender `_data-syllabus-sections.js`: resolver parentId (Modality hermana por name) + componentTypeId (catalogo por name) SOLO para InstructionalComponent; otros 8 RT sin cambio — commit `548d4b5`
- [x] S4.T2 — Datos: Presencial de C-CALCULOI-001 gana Cátedra 4h + Práctica 2h (total derivado 6) — commit `548d4b5`
- [x] S4.T3 — `seed-counts.test.ts` (374→376, 7→8 RTs, +assertion 2 piezas con parentId) + `docs/reference/seed-counts.md` — commit `2a88931`
- [x] S4.T4 — Idempotencia: garantizada por el guard findFirst (ownerId, recordType, name) — como los otros RT; el mock stateful de seed-counts lo ejercita. **Verificacion runtime 2x real pareada con el smoke de S5** (la BD aun no tiene las piezas: el reset del dev corrio ANTES de agregarlas)
- [x] S4.GATE — Quality review T2: **continue**

**S4.GATE — Quality review DET-23 (T2):** calidad/tipado/testing pass (assertions concretas: 376, InstructionalComponent=2, parentId!=null). Escalabilidad (DET-41): el loader es O(secciones) con findFirst por pieza (2 piezas de demo — dato acotado por el seed, no por cliente). Mantenibilidad: pass (caso especial acotado, C1). **Decision: continue.** Verificacion DET-33: suite full **1585/1585** verde, 0 regresion.

### Session 5 — Hito 2 / E2: Formulario + i18n + smoke [tier: T3] [⚑ fuerte] [★ cierre E2]

- **Iniciada**: 2026-08-19 · **Branch**: `UPONE-1619-e2-modelo-funcional`
- **session_goal**: formulario con piezas + total derivado, i18n, smoke runtime; cierra E2

**Tasks completadas:**
- [x] S5.T1 — Modality view/edit: total derivado + record-list embebido de piezas (filters {{parentId}}); Activity view/edit + Offering_syllabus view/edit: retiradas columnas theory/practice (REQ-04/PRESERVE-02) — commits `5eddf70`, S5 feat
- [x] S5.T2 — `default_Offering_syllabus_{view,edit}.json` reapuntados (sin columnas de horas rotas tras E3) — commit S5 feat
- [x] S5.T3 — i18n es/en/pt paridad (9 keys) para InstructionalComponentType + rt__InstructionalComponent — commit S5 feat
- [x] S5.T4 — **Smoke runtime UPU (DET-36)**: ver evidencia abajo
- [x] S5.GATE — ★ Gate de entregable E2: **PARADA DURA**

**S5.T4 — Smoke runtime (DET-36) — evidencia REAL del sistema corriendo:**
- Re-seed UPU (`npm run sync`): 2 piezas creadas bajo la Presencial de C-CALCULOI-001 (Cátedra 4h + Práctica 2h), `componentTypeId` resuelto correcto (Cátedra→"Cátedra", Práctica→"Práctica"), `parentId` = Modality.
- **Derivación verificada en el OM corriendo** (`getInstance` GraphQL, tras reiniciar OM para cargar el resolver): Modality Presencial con piezas → **`totalHoursPerWeek: 6`**; Modality sin piezas → **`totalHoursPerWeek: 0`**. ✅
- **Bug encontrado por el smoke** (que el unit test no atrapó): el id de la sección vive en `item.id` (top-level), no en `item.data.id` → el enrichment devolvía `undefined` en runtime. **Fix aplicado** (`idOf = item.id ?? item.data.id`) + guard de regresión en el test (commit `5eddf70`). Es el valor del smoke: DET-36 expuso un bloqueante que el test aislado no veía.
- **Render visual (browser) — EJECUTADO** vía Clerk test mode (`+clerk_test` email + código 424242, bypass sancionado del equipo; login como Admin). Hallazgos del smoke visual en la UI real (Cálculo I → Modalidades → Presencial):
  - ✅ La lista de Modalidades muestra solo "Nombre" — columnas de horas digitadas **retiradas** (REQ-04 verificado en UI).
  - ✅ El detalle de la Modality tiene los tabs **General + "Piezas de dictado"**, y las **2 piezas (Cátedra, Práctica) renderizan anidadas** bajo la Presencial (record-list embebido + filtro parentId funciona).
  - Contingencia A3: el `totalHoursPerWeek` derivado NO renderiza como campo estándar (el layout engine filtra los campos del schema a campos reales, `getObjectFields <- core_FieldDefinition`; mismo mecanismo que `currentCredits`). **RESUELTA (decisión del dev): componente custom.** `InstructionalTotalDisplayElement.vue` (Vueform custom element, patrón ActivityStatusBadge) lee el total del contexto del form (`el$.form$.data.totalHoursPerWeek`, el valor enriquecido) y lo muestra sin depender de un campo real. Cableado en Modality view/edit + i18n + Storybook story. **✅ VERIFICADO EN LA UI**: el detalle de la Modality Presencial muestra **"Carga horaria semanal (derivada de las piezas): 6"**.
  - ⚠️ Columnas de la pieza más allá de "Nombre" (hoursPerWeek/tipo vía relación RT) no renderizan en el record-list embebido — config de columnas de relación a ajustar (menor, follow-up).
- **Bug del RT alias encontrado y arreglado por el smoke visual**: la UI lee la Modality por `rt__Modality__curricularsection` (no `CurricularSection`); el enrichment ahora dispara en ambos paths (`isModalityRead`, commit S5 fix).

**S5.GATE — Quality review DET-23 (T3):** calidad/tipado/testing pass (suite **1586/1586**, typecheck limpio). Escalabilidad (DET-41): enrichment con doble batch acotado por cardinalidad de modalidades. a11y: layouts config-driven con tokens de plataforma. Smoke DET-36: runtime del OM verificado (6/0). Verificacion DET-33: derivación confirmada en el sistema corriendo, no solo en test. **Decision: E2 alcanzado — PARADA DURA** (borde de entregable; super autopilot no cruza a E3 sin OK del dev).

**Addendum S5 (2026-08-20) — refinamiento de presentación (post parada E2):**
- **Tipo de pieza por nombre = select nativo** (no componente custom). `componentTypeId` (FK escalar) pasó a `type: select` + `references: InstructionalComponentType` + `valueField: id` + `displayField: name` en view/edit/create. El motor lo resuelve (`RecordDetail.vue` `fetchReferenceSelectOptions` ~2045 + branch de campos no-FK con `references` ~3427). Se **eliminó** el componente custom `InstructionalComponentTypeName` (element + story + registro). Learn L2. Commits mod `93be520` (feat).
- **Total derivado view-only.** `totalHoursPerWeek` (derivado, no persistido) se quitó del layout **edit** de Modality: se colaba al payload de `updateInstance` y el override `polymorphicUpdate` lo mandaba a Prisma → "valor invalido"; además quedaba obsoleto en edit. Queda solo en view (fresco en cada lectura). Learn L3. Commit `6d8a3d6` (fix).
- **Columna "Tipo/horas" del list embebido de piezas**: sigue sin renderizar (limitación real del motor RecordList con columnas dot-path de relación). Escalado a core como **UPONE-1686** (Historia, SP9, Change Type New optional capability). El mod queda forward-compatible: cuando 1686 aterrice, el list se enciende sin cambios. Docs: `kb/sp9/UPONE-1619-followup-columnas-relacion-list-embebido.md` + `kb/sp9/UPONE-1619-core-extensions-recordlist.md`.

**Dual-judge del incremento E2 (DET-35, T3) — 2026-08-20:** dos jueces ciegos en paralelo (opus, contextos aislados) sobre el incremento (13 commits sobre E1, 26 archivos). Aceptación por criterio: derivación (1) pass, formulario+total (2) pass, tipo por nombre (3) pass, i18n (5) pass, seed+conteos (6) pass. **Hallazgo confirmado por ambos**: el layout `default_rt__Modality__curricularsection_create.json` seguía ofreciendo las 4 casillas de horas digitadas (edit/view ya limpios) → violaba REQ-04 ("no ofrecer casillas para digitar horas"), alcanzable desde el modal "Crear nueva modalidad" del formulario del curso. Juez A lo marcó INFO (difería a E3 por línea 537 del spec); Juez B iterate. **Desempate por spec**: REQ-04 (aceptación E2) exige el retiro a nivel render; el drop destructivo del schema sigue siendo E3 (REQ-08). **Fix aplicado** (retiro de las 4 claves del layout create, no-destructivo) + sync + tests re-corridos independientemente **1586/1586 verde** (DET-33). Commit `82f0418` (fix). **Veredicto final del gate: approve.** E2 cerrado.

**Corrección post-gate (2026-08-20, smoke UI del dev) — miss de verificación estática:** el dual-judge y el gate validaron los archivos de forma estática (Read/Grep) y concluyeron que edit/view "ya no ofrecían" las casillas de horas. En runtime NO era así: el layout edit **no tenía `tabs`**, y RecordDetail **auto-renderiza los campos reales del objeto** que el layout no coloca — `theory/practice/lab/autonomousHours` siguen siendo columnas reales (se dropean en E3), así que aparecían como inputs editables en el edit. El dev lo detectó por inspección visual. **Causa raíz**: falta de `tabs` que restrinja el render (view sí lo tenía; por eso view estaba limpio y engañó a la revisión estática). **Fix**: agregar `tabs` a edit y create (commit `2b34c77`), verificado en UPU (casillas ausentes, `hasHorasInputs:false`). Lección: los criterios de aceptación con "no se ve X" en UI exigen verificación runtime (DET-36), no revisión estática de archivos — los jueces Read/Grep no pueden atrapar el auto-render.

**Follow-up de columnas del list embebido — RESUELTO mod-only (2026-08-20):** el detective-mode de UPONE-1686 descubrió que la capacidad de columnas dot-path de relación **ya existe en core** (commit `4b9bf665`, opt-in via `visible:true`); la premisa de UPONE-1686 (construirla) era falsa (error de proceso: se leyó la función equivocada, ver learns L4/L5). Fix real: `visible:true` en las 4 columnas de relación del piezasList (view+edit), commit `54f4f9e`. **Smoke UPU verificado**: Tipo/Horas semanales/Tamaño de grupo/Docentes renderizan con sus valores por pieza. UPONE-1686 queda sin sustento (se comenta y cierra).

### Session 6 — Hito 3 / E3: Retiro destructivo [tier: T3] [⚑ fuerte] [★ cierre E3]

- **Iniciada**: 2026-08-20 · **Branches**: mod `UPONE-1619-e3-retiro-destructivo` (stacked sobre E2), core `object-manager` `UPONE-1619-e3-retiro-destructivo`
- **session_goal**: retiro destructivo de las 4 columnas de horas digitadas (mod + core + DB), no-revert, regresión; cierra E3

**Tasks completadas:**
- [x] S6.T1 — Barrido de consumidores de las 4 claves (mod + core). Inventario: object JSON, view.json, resolveFieldKind.ts, i18n es, seed (11 filas), + core mergeado + prisma.
- [x] S6.T2 — Retiro en el mod: object def, view.json schema, resolveFieldKind.ts, i18n es, seed (11 filas) + tests actualizados — commits `93978b5` (feat), `e16f7cd` (test).
- [x] S6.T3 — Retiro en core (object-manager): edición aislada del mergeado `rt__Modality__curricularsection.json` (−25/+1) — commit `82578033`. prisma regenerado sin las columnas.
- [x] S6.T4 — DROP COLUMN aplicado en UPU (por reset del dev: codegen + db push --accept-data-loss). Verificado: tabla física `rt__Modality__curricularsection` = [code, curricularsectionId, deliveryMode, isDefault]; migración `20260820145330_init`. Rollout a 17 tenants restantes = ventana de deploy coordinada.
- [x] S6.T5 — No-revert: `sync:files` no reintroduce las 4 claves (mod source limpio → append-only no las agrega). Verificado.
- [x] S6.T6 — Regresión: tests del mod 1582/1582; drift:check NO ERRORS; seed coherente (11 modalidades, 2 piezas, sin las claves).
- [x] S6.T7 — Docs: `polymorphic-recordtypes.md` actualizado (InstructionalComponent + horas derivadas) — commit `20bed83`. MCP (UPONE-1530): N/A (alcance de UPONE-1530).
- [x] S6.GATE — ★ Gate de entregable E3: **dual-judge both approve**

**S6.GATE — dual-judge del incremento E3 (DET-35, T3) — 2026-08-20:** dos jueces ciegos opus en paralelo sobre el incremento (mod branch E3 + core commit `82578033`). **Ambos: approve**, 8/8 criterios pass (juez B marcó regresión `na` por no poder correr vitest). Hallazgos coincidentes, ambos **INFO no bloqueantes**: (1) 16-17 `schema.prisma` de tenants ≠ UPU aún declaran las columnas → es el rollout de deploy coordinado ya declarado (opción B, como E1); la fuente (mod+core JSON) está limpia, el codegen de deploy los regenera; (2) una referencia stale a las 4 claves en `mods/academic-scheduling/specs/UPONE-1523-nuevos-objetos-requeridos.md` (prosa, otro mod, fuera de scope; su equipo la depura). **Veredicto del gate: approve. E3 alcanzado — PARADA DURA.**

**Pendiente post-E3 (ventana coordinada / decisión dev):** rollout del DROP a los 17 tenants restantes + commit limpio de los 18 `schema.prisma` + `model:bump` (diferidos por árbol core contaminado, van sobre baseline limpio); push/PRs de las ramas E2 y E3 (mod + core). El **close** del ticket sigue always-ask (DET-30): requiere backlog/learns procesados + teach-close.

### Plan de sessions

> Esqueleto preliminar (DET-20), mapeado a los 3 hitos del Request. Se refina y particiona en tasks durante design-feature. Sessions de 1.5-3h. layer:core → los hitos que tocan core (publicacion + migracion) se coordinan con el team up1 (RULE-dev-004).

| Session | Hito | Objetivo | Alcance grueso |
|---------|------|----------|----------------|
| S1 | 1 (aditivo) | Catalogo de tipos de pieza de dictado | Objeto catalogo o enum (segun design-draft, H5) + seed idempotente (RULE-022) + capabilities + i18n; publicar a core via sync (aditivo) |
| S2 | 1 (aditivo) | RecordType `InstructionalComponent` anidado a Modality | JSON del mod (tipo, horas semanales, tamano de grupo planificado, docentes requeridos, otros) como `rt__InstructionalComponent__curricularsection` con parentId; publicar a core, codegen, `tenant:migrate` aditivo (columnas nuevas) en 18 schemas; capabilities cableadas a los 4 roles curriculares |
| S3 | 2 (funcional) | Derivacion de carga horaria (read-enrichment) | Helper puro (suma de piezas) + override `getInstance`/`listInstances` del mod que enriquece el total en la Modality (RULE-017, patron effectiveCredits) + tests unit |
| S4 | 2 (funcional) | Seed loader + layouts | Loader que anida piezas bajo la Modality (patron `_data-requirement` createNode) + datos/conteos; layout de detalle de Modality con `record-list` embebido anidado (filters {{parentId}}) + total derivado; ajuste del tab "Modalidades" del curso |
| S5 | 2 (funcional) | i18n + smoke | Paridad i18n es/en/pt de InstructionalComponent (trabajo nuevo, H8) + smoke UI del formulario (RULE-029) |
| S6 | 3 (destructivo) | Retiro de las 4 columnas de horas digitadas | Drop de theory/practice/lab/autonomousHours del JSON del MOD (RULE-043) y del core; codegen; `DROP COLUMN` en 18 schemas (coordinado con core, no quirurgico); actualizar `seed-counts` + regression (blast radius, RULE-009) |

> Numeracion continua. El gate DET-18 (design-draft) es precondicion de S1: sin `draft_approved: true` no arranca execute.

### Entregables (delivery milestones) — protocolo de parada

> NORMATIVO para execute. Detalle completo en la seccion "Entregables y protocolo de ejecucion" de la spec.

| Entregable | Sessions | Gate de cierre | Parada |
|-----------|----------|----------------|--------|
| **E1 — Objetos publicados (aditivo)** | S1-S2 | S2.GATE | ★ PARADA DURA + aviso "Entregable 1 alcanzado" |
| **E2 — Modelo funcional en el mod** | S3-S5 | S5.GATE | ★ PARADA DURA + aviso "Entregable 2 alcanzado" |
| **E3 — Retiro destructivo** | S6 | S6.GATE | ★ PARADA DURA + aviso "Entregable 3 alcanzado" |

- Al cerrar el gate de un entregable, execute **se detiene y avisa al dev**, aun en autopilot `super`/`true` (los gates de session INTERNOS a un entregable siguen la politica de autopilot normal).
- El dev puede pedir **"ejecuta hasta entregable N"** — execute corre hasta ese gate inclusive (con su QA+dual-judge) y para.
- Un entregable NO se declara alcanzado hasta pasar quality review DET-23 + smoke/regresion + **dual-judge del incremento** (T3) + verificacion self-report DET-33.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-catalogo (tipos de pieza + carga inicial) | TC1 | integration | COVERED (S1.T3, 4 tests verde) |
| REQ-recordtype (InstructionalComponent anidado a Modality) | TC2, TC3 | integration | PARTIAL — declaracion del RT cubierta (recordtypes-declared 14 RT verde); TC2/TC3 (create anidado / update base-only) requieren publicacion+DB → tras S2.T5 |
| REQ-derivacion (carga horaria de Modality derivada de piezas) | TC4 | integration | COVERED (S3: 9 tests unit + smoke runtime OM: total 6/0) |
| REQ-retiro (drop 4 columnas de horas digitadas) | TC5, TC-REG1 | integration | NOT COVERED |
| REQ-form (listado embebido anidado + total derivado) | TC6 | smoke UI | NOT COVERED |
| REQ-seed (loader anida piezas + conteos) | TC7, TC-REG2 | integration | NOT COVERED |

> REQs preliminares; se refinan en design-feature.

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC1 | Seed del catalogo es idempotente (carga inicial minima, sin duplicar en re-run) | REQ-catalogo | integration | mod sincronizado, tenant UPU | correr seed 2x | conteo estable, sin filas duplicadas (guard por label, RULE-022) | run1 created=8, run2 created=0 skipped=8, store estable en 8; name repetido no duplica (created=7 con 'Cátedra' preexistente) | `tests/integration/instructionalcomponenttype-seed.test.ts` (4/4 verde, motor real seedUpsert) | pass (S1) |
| TC2 | Crear `InstructionalComponent` anidado a una Modality (parentId=modalityId) persiste con sus atributos | REQ-recordtype | integration | Modality existente | create RT con parentId | fila CurricularSection recordType=InstructionalComponent con tipo/horas/grupo/docentes | — | — | pending |
| TC3 | Un update base-only sobre la pieza no hace upsert espurio de la proyeccion RT | REQ-recordtype | integration | pieza existente | update base | sin upsert RT (RULE-036) | — | — | pending |
| TC4 | La carga horaria de la Modality se deriva de la suma de sus piezas (read-enrichment, no digitada) | REQ-derivacion | integration | Modality con N piezas | getInstance/listInstances de Modality | total derivado = suma de piezas; sin field resolver GraphQL (RULE-017) | — | — | pending |
| TC5 | Los 4 campos de horas digitadas ya no existen en el modelo tras el retiro (mod + core) | REQ-retiro | integration | post-sync + migrate | inspeccionar schema/objeto | theory/practice/lab/autonomousHours ausentes en JSON del mod y en schema (RULE-043) | — | — | pending |
| TC6 | El formulario del curso muestra las piezas por modalidad + total derivado; sin las 4 columnas digitadas | REQ-form | smoke UI | suite corriendo, tenant UPU | abrir RecordDetail del curso → tab Modalidades → detalle de Modality | listado embebido anidado de piezas + total; columnas de horas digitadas ausentes (RULE-029 smoke obligatorio) | — | — | pending |
| TC7 | El loader de seed anida piezas bajo la modalidad y los conteos del seed cuadran | REQ-seed | integration | seed corrido | verificar conteos por recordType | piezas creadas con parentId correcto; conteos actualizados | — | — | pending |
| TC-REG1 | Nada que consuma los 4 campos de horas queda roto tras el drop (blast radius) | REQ-retiro | regression | grep de consumidores | correr suites afectadas | sin referencias colgantes a theory/practice/lab/autonomousHours (RULE-009) | — | — | pending |
| TC-REG2 | `seed-counts.test.ts` sigue verde tras el cambio de modelo de Modality | REQ-seed | regression | — | correr seed-counts | verde con conteos actualizados | — | — | pending |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| curriculum-design seed-counts (cuenta por recordType, incluye 'Modality') | `npm test` (mod) — `tests/integration/seed-counts.test.ts` | verde (baseline a medir) | — | — |
| curriculum-design unit/integration (mod) | `npm test` (mod) | verde (baseline a medir) | — | — |

> `seed-counts.test.ts:175` cuenta filas por `recordType` incluyendo `Modality` → se veria afectado por el cambio de modelo; actualizar conteos.

## Summary
