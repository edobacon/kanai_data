---
id: TICKET-005
project: up1
type: ticket
status: closed
work_type: implement
module: mods
autopilot: manual
---

# Explorar y disenar app de matrices de competencias basada en suite-front assessment

## Request

Revisar en suite-front assessment como se crean y editan matrices de competencias (tipos, esquemas de niveles, rubrica, competencias jerarquicas, etc.). Contrastar con documentacion de learning-assurance en up1. Crear una app nueva (mod) en up1 que replique esta funcionalidad como POC, incluyendo datos previos necesarios (facultades, cursos, etc.).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | explore |
| Tipo de cambio | multi: mods + object-manager + suite |
| Modulo principal | mods |
| Modulos afectados | mods, object-manager, layout, suite |

## Triage

La peticion tiene dos facetas: (1) investigacion de como funciona en suite-front, (2) diseno de un mod nuevo en up1 que replique la funcionalidad. La investigacion ya se completo. El diseno requiere decisiones sobre alcance del POC.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El mod curriculum-mapping existente cubre parcialmente la funcionalidad (matrices, competencias, tributacion) y puede extenderse | ✓ confirmada | Mod tiene 5 objetos: CmCompetencyMatrix, CmCompetency, CmTributation, CmGraduationProfile, CmProfileEntry |
| H2 | Faltan objetos clave del modelo suite-front: esquemas de niveles, criterios, rubrica, umbrales | ✓ confirmada | suite-front tiene LevelScheme, Level, Criteria, Threshold que no existen en up1 |
| H3 | Los datos base necesarios (Faculty, Career, Curriculum, Course) ya existen como objetos tenant UPU | ✓ confirmada | Existen en objects/tenants/UPU/Base/: faculty, career, curriculum, course, department |
| H4 | Hay especificacion completa en Deckard KB (SPEC-learning-assurance-003) con 24 capacidades de Curriculum Mapping | ✓ confirmada | 7 CAPs de matrices, 4 de esquemas de niveles, 3 de perfil de egreso, 6 de tributacion, 4 de IA |

### Context found

- **Rules del modulo**: Ninguna especifica para assessment/competency-matrix en up1
- **Bugs abiertos**: Ninguno
- **Specs relacionados**:
  - SPEC-learning-assurance-003 (Curriculum Mapping — 24 capacidades)
  - SPEC-learning-assurance-004 (Learning Assessment — 43 capacidades)
  - SPEC-learning-assurance-005 (Reglas transversales — 16 reglas BR-*)
  - SPEC-mods-curriculum-mapping (mod existente)
- **Docs relevantes**: suite-front assessment module (matrices v2, store, API, types)
- **Warnings**: El mod curriculum-mapping ya implementa parte de la funcionalidad. Extender vs crear nuevo mod es una decision a tomar.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | N/A (explore — no se implementa aun) |
| Base branch | develop |
| DB state | Seed existente de curriculum-mapping ya crea 1 matriz + 5 competencias + 8 tributaciones |
| Services | object-manager (4000), suite (3000) |
| Test data | Seed de curriculum-mapping + datos tenant UPU (Faculty, Career, Curriculum, Course) |

## Investigacion completada

### 1. Suite-front assessment — Modelo de matrices de competencias

**Flujo de creacion**:
1. Formulario general: codigo (auto-generable), nombre, facultades (multi-select), tipo de matriz, descripcion, planes de estudio
2. Al guardar → redirige a edicion
3. En edicion: tabs de datos generales + competencias
4. Seleccionar esquema de niveles → ver tabla de niveles y umbrales
5. Gestor de arbol de competencias con CRUD completo

**Entidades del modelo**:

| Entidad | Campos clave | Relaciones |
|---------|-------------|------------|
| MatrixData | code, name, description, competencyModel, levelSchemeId, typeId, statusId | → faculties[], pensums[], competencies[] |
| MatrixCompetenciesNode | code, name, desc, isHolistic, id_parent, nmOrder | → levels[], equivalences[], scopes[], nodes[] (hijos) |
| SchemaOption (LevelScheme) | code, name, description, competencyLevels, developmentLevels, inUse | → createdBy[] |
| MatrixCompetenciesNodeLevel | code, name, desc, threshold, isActiveLevel | → criteria[], thresholds[] |
| MatrixCompetenciesNodeLevelCriteria | code, name | — |
| MatrixCompetenciesNodeLevelThresholds | name, min, max, isAccomplished | — |

**Tipos de medicion**: formativa (niveles cualitativos) vs holistica (integra multiples sub-competencias)

**APIs**: 15+ endpoints en `improve-api/competency_matrix/` (CRUD, workflow, scopes, equivalences, level schemas)

**Componentes clave**:
- CompetencyGeneralForm (datos generales + facultades + planes)
- CompetencyMatrixEdit (editor principal + schema selector)
- CompetencyTreeManager (arbol drag-and-drop)
- CompetencyForm (formulario individual: codigo, nombre, scopes, equivalencias, medicion)
- CompetencyRubric (rubrica con criterios y niveles)
- MeasurementTypeModal (formativa vs holistica)

### 2. Up1 — Estado actual del mod curriculum-mapping

**Objetos existentes** (5):
| Objeto | Campos | Equivalente en suite-front |
|--------|--------|---------------------------|
| CmCompetencyMatrix | code, name, version, status, schemeType, scope, description | MatrixData (parcial) |
| CmCompetency | code, name, type, level, weight, cmCompetencyMatrixId | MatrixCompetenciesNode (parcial) |
| CmTributation | courseCode, courseName, level, alignment, contributionType, justification | Tributation completa |
| CmGraduationProfile | code, name, studyPlanCode, status, description | Perfil de egreso |
| CmProfileEntry | expectedLevel, weight, cmGraduationProfileId, cmCompetencyId | Entry del perfil |

**Que FALTA respecto a suite-front**:
1. **LevelScheme** — objeto independiente para esquemas de niveles (suite-front lo tiene como entidad separada con CRUD propio)
2. **Level** — niveles dentro de un esquema (codigo, nombre, descripcion, peso, orden)
3. **Criteria** — criterios cualitativos por nivel (para medicion formativa)
4. **Threshold** — umbrales cuantitativos (min, max, isAccomplished) por nivel
5. **Jerarquia parent-child** en CmCompetency (falta `parentId` y `order`)
6. **Campos adicionales** en CmCompetency: `isHolistic`, scopes, equivalences
7. **Campos adicionales** en CmCompetencyMatrix: relacion con facultades, planes de estudio
8. **Workflow** — transiciones de estado (Draft → Review → Published → Open to Edit)
9. **Componentes Vue** — editor de arbol, rubrica, seleccion de esquema

### 3. Documentacion learning-assurance (Deckard KB)

SPEC-learning-assurance-003 define 24 capacidades para Curriculum Mapping:
- **2.1 Matrices**: crear, organizar jerarquicamente, clasificar por tipo, alcance, equivalencias, asociar a planes, workflow (CAP-MAP-001 a 007)
- **2.2 Esquemas de niveles**: crear, definir niveles, umbrales cuantitativos, criterios cualitativos (CAP-MAP-008 a 011)
- **2.3 Perfil de egreso**: declarar, asignar competencias, workflow (CAP-MAP-012 a 014)
- **2.4 Tributacion**: mapear curso-competencia, vincular RA a niveles, vincular temas, heatmap, brechas, config calificacion (CAP-MAP-015 a 020)
- **2.5 IA**: comparador de planes, equivalencia de cursos, estrategias de evaluacion, simulador de perfil (CAP-MAP-021 a 024)

### 4. Datos base disponibles en up1 (tenant UPU)

| Objeto | Ubicacion | Campos utiles |
|--------|-----------|--------------|
| Institution | business/Base/ | publicId, name |
| Faculty | tenants/UPU/Base/ | publicId, name, institutionId |
| Career | tenants/UPU/Base/ | publicId, name, careerType, institutionId |
| Curriculum | tenants/UPU/Base/ | publicId, name, versionCode, isCurrent, totalCredits, careerId |
| Course | tenants/UPU/Base/ | publicId, name, credits, level, departmentId |
| Department | tenants/UPU/Base/ | publicId, name |

Cadena: Institution → Faculty → (Career → Curriculum) + (Department → Course)

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | suite-front usa improve-api con 15+ endpoints para competency_matrix; el modelo tiene entities separadas para LevelScheme, Level, Criteria, Threshold que up1 no tiene | researcher | 1 | refined | RULE-core-011 |
| L2 | El mod curriculum-mapping de up1 cubre ~40% de lo que suite-front tiene: matrices, competencias, tributacion, perfil de egreso. Falta: esquemas de niveles, jerarquia, rubrica, criterios, workflow, componentes de edicion | researcher | 1 | refined | BUG-mods-006 |
| L3 | La cadena de datos base Institution→Faculty→Career→Curriculum→Course ya existe en tenant UPU con seed disponible, lo que permite montar el POC sin crear entidades nuevas de estructura academica | researcher | 1 | refined | BUG-mods-007 |
| L4 | SPEC-learning-assurance-003 tiene 24 capacidades que cubren exactamente lo que suite-front implementa, y ademas define IA features (CAP-MAP-021 a 024) que suite-front no tiene | researcher | 1 | refined | BUG-mods-008 |
| L5 | El sync de layout requiere un solo .vue por carpeta en modsComponents/. Subcarpetas no permitidas. Componentes multi-archivo deben fusionarse en un SFC unico | developer | 2 | refined | RULE-mods-011 |
| L6 | Vueform custom elements requieren `defineElement()` de `@vueform/vueform`, NO `defineComponent()` de Vue. El name se convierte a kebab-case sin sufijo "Element" para el type del schema | developer | 2 | refined | BUG-mods-007 |
| L7 | `import.meta.glob()` en vueform.config.ts es estatico en build time. Nuevos componentes en modsComponents/ requieren restart del dev server (limpiar cache .nuxt/.cache y node_modules/.vite) | developer | 2 | refined | RULE-mods-014 |
| L8 | RecordList embebido en RecordDetail no hereda traducciones de @RecordList.json. Keys como recordList.info.elements se muestran raw. Bug preexistente del core | developer | 2 | refined | RULE-mods-015 |
| L9 | RecordDetail no tiene mecanismo nativo de titulo/header. El nombre del registro no se muestra automaticamente — hay que usar el campo name como primer elemento del tab | developer | 2 | refined | RULE-core-012 |
| L10 | RecordList no traduce valores de enum en celdas. DRAFT/PUBLISHED se muestran raw. Workaround: crear layouts filtrados por estado (Borradores, En Revision, Publicadas) | developer | 2 | refined | RULE-mods-016 |
| L11 | El i18n de tabs de navegacion usa key `object.{ObjectName}` como string plano, no como objeto nested. Si se usa `{singular, plural}` el sync falla con "deep leaf conflict" | developer | 2 | refined | RULE-layout-015 |
| L12 | Apollo client para custom elements Vueform se obtiene con `useTenantApolloClient()` de `@/composables/useApolloClient`. El fetch directo no funciona porque no tiene auth cookies | developer | 2 | discarded | — |
| L13 | defineElement() de Vueform rompe la cadena de getCurrentInstance().parent — no llega a LayoutRecordDetail. El instanceId del registro no es accesible via Vue component tree desde un custom element | developer | 3 | refined | RULE-layout-014 |
| L14 | form$.data en un custom element Vueform contiene los campos del layout schema (no incluye id/publicId), pero SI incluye status y otros campos del registro ya cargados por RecordDetail | developer | 3 | discarded | — |
| L15 | El instanceId de LayoutRecordDetail es accesible caminando el DOM hacia arriba via __vueParentComponent.props.instanceId. Es la alternativa a getCurrentInstance().parent cuando defineElement rompe la cadena | developer | 3 | refined | RULE-layout-014 |
| L16 | RecordList rowActions soportan tipos default/modal/download-template/import-template pero NO mutation. No hay forma de invocar una GraphQL mutation directamente desde el JSON del layout | developer | 3 | discarded | — |
| L17 | vueform.config.ts en suite usa import.meta.glob('../layout/src/modsComponents/*/*.vue') — nuevos custom elements se registran automaticamente tras sync sin editar el config | developer | 3 | refined | RULE-mods-012 |
| L1 | `caMatrixTransition.resolver.js:27-68` — validación de ownership cross-tenant débil: `findUnique`, `count` (x2) y `update` operan sobre `matrixId` sin verificar que pertenezca al `context.tenantId`. Aunque el Prisma client sea per-tenant schema-aislado, si un usuario de tenant A conoce un matrixId del tenant B y el routing de client no es estricto, podría transicionar estado ajeno. Fix: validar explícitamente que `matrix.tenantId === context.tenantId` antes de operar, o filtrar `where: { id: matrixId, tenantId: context.tenantId }`. | reviewer | — | discarded | — |
| L2 | Duplicate key silencioso en lang JSON: `ca_matrix_list` aparece dos veces dentro del objeto `layout` en `lang/en_CL.json:47-48`, `lang/es_CL.json` y `lang/pt_BR.json`. La segunda definición sobrescribe la primera sin warning del parser. Fix: consolidar en una sola definición. Candidato a regla de validación: lint pre-sync que detecte keys duplicadas en lang JSON. | reviewer | — | discarded | — |
| L3 | Dos sistemas CSS en conflicto para CompetencyTree: `css/competency-tree.css` usa `var(--up1-*)` tokens correctamente, pero `modsComponents/CompetencyTree/CompetencyTreeElement.vue:246-287` tiene `<style>` inline con colores dark-mode hardcodeados (`#1a1a2e`, `#16213e`, `#0f0f23`). El inline gana por especificidad y rompe theming multi-tenant. Fix: eliminar el `<style>` inline, mantener solo el CSS externo. | reviewer | — | discarded | — |
| L4 | `CompetencyTreeElement.vue:37-80` duplica verbatim el bloque de render de nodo para roots (líneas 39-55) y children (60-77). Además el `v-for` anidado llamando `getVisibleDescendants()` en cada render es O(n²) — perceptible en árboles >50 nodos. Fix: componente recursivo o aplanar la lista visible pre-calculada como array en el composable. | reviewer | — | discarded | — |
| L5 | Timing hacks para resolver `instanceId` en modsComponents: `WorkflowActionsElement.vue:224-240` usa `setTimeout(() => syncFromForm(), 300)` como fallback para obtener el instanceId; `CompetencyTreeElement.vue` y `TributationHeatmapElement.vue` caminan el DOM buscando `__vueParentComponent` (interno Vue). Ambos son anti-patrones frágiles. Necesitamos una API oficial del layout-engine para exponer `instanceId`/contexto al custom element — candidato a spec técnica: "context propagation para defineElement". | reviewer | — | discarded | — |
| L6 | [transversal a study-notes, curriculum-mapping, assessment-matrix] Tokens CSS de mod sin fallback a `var(--up1-*)` rompen theming multi-tenant: `css/1-theme/study-notes.css:9-16` (`--study-notes-badge-*`), `css/1-theme/curriculum-mapping.css:9-15` (`--cm-level-*`), y parcial en assessment-matrix. Patrón correcto: `var(--mod-token, var(--up1-token, fallback-valor))`. Candidato a RULE-layout: "tokens de mod deben declararse como cadena de fallback a --up1-*". | reviewer | — | discarded | — |
| L7 | [transversal a los 3 mods] modsComponents usan HTML crudo (`<button>`, `<input>`, `<select>`, `<textarea>`, `<label>`, `<div class="spinner">`, `<p>{{error}}</p>`) en vez de atoms del layout-library (`<Button>`, `<Input>`, `<Spinner>`, `<Alert>`). Viola RULE-layout-001 (Atomic Design). Afectados: `TributationHeatmapElement.vue:12-14`, `CompetencyTreeElement.vue:92-122`, `WorkflowActionsElement.vue:16-82`. Candidato a regla bloqueante: lint que detecte elementos HTML nativos en modsComponents. | reviewer | — | discarded | — |
| L8 | [transversal a los 3 mods] Strings de UI hardcodeados dentro de componentes en vez de `$t()`: `CATEGORY_LABELS` en study-notes `CategoryBadgeElement.vue:27-31`, `levelLabels`/`typeLabels` en `TributationHeatmapElement.vue:154-166`, `typeLabels` en `CompetencyTreeElement.vue:168-169`, `statusLabel` hardcoded en `WorkflowActionsElement.vue`. Duplica las traducciones que ya viven en `lang/` (o deberían). Fix: reemplazar maps por `$t('enum.{field}.{value}')` y eliminar el map. Candidato a regla bloqueante: "modsComponents no pueden tener literales de texto UI". | reviewer | — | discarded | — |
| L9 | [transversal a curriculum-mapping, assessment-matrix] `requiredCapability` ausente en rowActions de lectura ("Ver detalle") aunque existen capabilities específicas de view (ej. `mod/curriculum-mapping:view_profiles`, equivalentes en assessment-matrix). Solo las acciones mutables protegen RBAC (tercera capa). Fix: agregar `requiredCapability` a todo rowAction, incluso de navegación/lectura. Candidato a RULE-core: "todo rowAction debe declarar requiredCapability explícita". | reviewer | — | discarded | — |
| L10 | `css/competency-tree.css` está en la raíz de `css/` del mod, fuera del sistema de layers numerados (`css/1-theme/`, `css/2-objectName/`). Viola el patrón establecido por PATTERNS.md. Fix: mover a `css/2-objectName/competency-tree.css` o `css/3-component/` si aplica. Candidato a lint pre-sync: rechazar archivos CSS fuera de subcarpetas numeradas. | reviewer | — | discarded | — |
| L11 | `useCompetencyTree.ts:275-316` hardcodea `limit: 200` en `fetchCompetencies`. Techo arbitrario que romperá silenciosamente con matrices grandes (el árbol mostrará incompleto sin error). Fix: paginación con cursor o fetch-all iterativo hasta agotar. Aplicable también a otros resolvers/composables que listan entidades sin paginación. | reviewer | — | discarded | — |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| 1 | CompetencyTreeNode.vue como archivo separado en la misma carpeta | Sync de layout rechaza carpetas con multiples .vue | Fusionar en un solo SFC o mover a components/ subfolder (que tampoco funciona) |
| 2 | Subfolder components/ dentro de CompetencyTree/ | Sync rechaza carpetas con subfolders | Inlining del nodo recursivo en el componente principal |
| 3 | `defineComponent()` para el custom element | Vueform no lo registra como element — requiere `defineElement()` | Verificar siempre como TributationHeatmap lo hace (referencia que funciona) |
| 4 | `fetch()` directo a localhost:4000/graphql desde el componente | No pasa auth cookies → "Authentication required" | Usar `useTenantApolloClient()` como hace TributationHeatmap |
| 5 | i18n `object.CaLevelScheme: { singular: "...", plural: "..." }` | Sync falla con "deep leaf conflict" porque el global ya tiene `object.*` como strings | Cambiar a string plano: `object.CaLevelScheme: "Esquemas de Niveles"` |
| 6 | resolveInstanceIdFromParents() (Vue component tree) para obtener matrixId en WorkflowActionsElement | defineElement() de Vueform crea wrappers internos que cortan la cadena .parent hacia LayoutRecordDetail | Caminar el DOM (parentElement + __vueParentComponent) en vez de la cadena Vue |
| 7 | instance.proxy?.$el en onMounted para obtener rootEl del custom element | $el no esta disponible en onMounted dentro de defineElement | Usar template ref (`ref="rootEl"`) + document.querySelector como fallback |
| 8 | Retry condition basado en !currentStatus.value | El status se resuelve desde form$.data en el primer intento, pero instanceId queda vacio. Los retries condicionados a !currentStatus nunca ejecutan | Condicionar retry a !currentStatus.value OR !instanceId.value |

## Sessions

### Session 1 — 2026-04-16

**Objetivo**: Investigar suite-front assessment + contrastar con up1 + identificar datos base

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| — | researcher | Explorar suite-front assessment module | suite-front/pages/assessment/competencies/matrix-v2/ | Mapeado: componentes, store, API, tipos completos |
| — | researcher | Buscar docs learning-assurance en Deckard KB | specs/learning-assurance/data/ | Encontrados 9 specs + INDEX con 129 capacidades |
| — | researcher | Identificar datos base up1 | objects/tenants/UPU/Base/ + objects/business/Base/ | Cadena completa: Institution→Faculty→Career→Curriculum→Course |
| — | researcher | Leer mod curriculum-mapping existente | mods/curriculum-mapping/ | 5 objetos, seed, capabilities, layouts |

**Decisiones tomadas**: Ninguna aun — pendiente decision del dev sobre alcance del POC

**Descubrimientos**: L1, L2, L3, L4

**Tasks completadas**: Investigacion completa

**Tasks pendientes**: Definir alcance POC, disenar objetos nuevos, implementar

**Resultado**: Investigacion completada. Modelo de suite-front mapeado. Gap analysis vs up1 realizado. Pendiente decision de alcance.

---

### Session 2 — 2026-04-16

**Objetivo**: Implementar mod assessment-matrix completo — objects, layouts, i18n, componente custom, seed, workflow

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| — | architect | Disenar spec completo | SPEC-mods-assessment-matrix | 7 REQs, 8 objects, 21 layouts, 12 tasks |
| — | developer | Scaffolding del mod | mods/assessment-matrix/ | package.json, capabilities.json, config/app.json |
| — | developer | Crear 8 objects JSON | objects/*.json | CaLevelScheme, CaLevel, CaCriteria, CaThreshold, CaCompetencyMatrix, CaCompetency (self-ref), CaMatrixFaculty, CaMatrixCurriculum |
| — | developer | Sync + codegen + verify | DB tables | 8 tablas creadas correctamente incluyendo self-reference parentId |
| — | developer | Crear 21 layouts | config/layouts/*.json | CRUD completo + vistas filtradas por estado/modo |
| — | developer | Crear resolver workflow | logic/caMatrixTransition.* | DRAFT→REVIEW→PUBLISHED con validaciones |
| — | developer | Crear i18n (12 archivos) | lang/*.json | es_CL, en_CL, pt_BR — global + @CaLevelScheme + @CaCompetencyMatrix + @CaCompetency |
| — | developer | Crear CompetencyTree Vue | modsComponents/CompetencyTree/ | Vueform custom element con defineElement(), arbol jerarquico, badges, CRUD modal |
| — | developer | Crear seed | seed/am-seed.js | 2 esquemas, 8 niveles, 6 criterios, 5 umbrales, 1 matriz, 8 competencias jerarquicas |
| — | developer | Seed en TEST + UPU | am-seed.js | Ejecutado en ambos tenants. Faculty asociada en UPU |
| — | developer | Fix i18n conflicts | lang/*.json | Keys globales eliminadas (SAVE, CANCEL, etc.), object.* cambiado de nested a string plano |
| — | developer | Fix tabs navegacion | lang/*.json | object.CaLevelScheme → "Esquemas de Niveles" (string plano) |
| — | developer | Crear layouts filtrados | config/layouts/ca-matrix-drafts.json, etc. | 5 layouts adicionales: Borradores, En Revision, Publicadas, Cualitativos, Cuantitativos |
| — | developer | Fix CompetencyTree sync | modsComponents/ | Fusionar CompetencyTreeNode en SFC unico (1 .vue por carpeta) |
| — | developer | Fix defineElement | CompetencyTreeElement.vue | Cambiar defineComponent → defineElement + resolveInstanceIdFromParents() |
| — | developer | Fix data loading | useCompetencyTree.ts | fetch() → useTenantApolloClient() con Apollo + gql |
| — | developer | Add CRUD persistence | useCompetencyTree.ts | createInstance/updateInstance/deleteInstance via GraphQL mutations |
| — | reviewer | Validacion E2E en browser | localhost:3000 | App en sidebar, listados, detalle con tabs, arbol de competencias con 8 nodos |

**Decisiones tomadas**:
- DEC-LOCAL-01: Mod nuevo independiente (assessment-matrix) en vez de extender curriculum-mapping
- DEC-LOCAL-02: Prefijo `Ca` para objetos (Competency Assessment) para evitar colision con `Cm`
- DEC-LOCAL-03: Pivots con publicId denormalizado (facultyName, curriculumName) para display sin FK real
- DEC-LOCAL-04: Layouts filtrados por estado en vez de traduccion de enums (RecordList no soporta enum rendering)
- DEC-LOCAL-05: CompetencyTree como Vueform custom element (defineElement) en vez de pagina standalone

**Descubrimientos**: L5, L6, L7, L8, L9, L10, L11, L12

**Tasks completadas**: #1 a #12 (todas)

**Tasks pendientes**: Drag-and-drop testing, traduccion de enums en core, selector de idioma en arbol

**Resultado**: Mod assessment-matrix implementado y funcionando en UI. 2 commits: `0903fc5` (mod completo) + `6ed530c` (persistencia CRUD + mejoras layout).

---

### Session 3 — 2026-04-16

**Objetivo**: Implementar B1 — Workflow UI con botones de transicion de estado en RecordDetail

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| — | researcher | Recolectar contexto de B1 | resolver, layouts, spec | Resolver funcional, schema.graphql con mutation, i18n keys ya existentes en 3 idiomas |
| — | researcher | Investigar actions en RecordDetail | layout/src/ | RecordList soporta rowActions. RecordDetail NO tiene mecanismo nativo de botones. rowActions no tienen tipo "mutation" |
| — | architect | Evaluar 3 opciones | — | A: custom element en RecordDetail, B: botones en CompetencyTree, C: rowActions en RecordList. Opcion A elegida (DEC-LOCAL-06) |
| — | developer | Crear WorkflowActionsElement.vue | modsComponents/WorkflowActions/ | defineElement(), botones por status, mutation via Apollo, feedback, badge de estado |
| — | developer | Agregar element a layout | ca-matrix-view.json | Tipo workflow-actions en tab Detalle, despues del campo status |
| — | developer | Sync + verificar | npm run sync | Componente detectado (New: 1), auto-registrado via import.meta.glob en vueform.config.ts |
| — | developer | Test: element en DOM pero vacio | localhost:3001 | v-if todas false: currentStatus vacio. Causa: resolveInstanceIdFromParents() no encuentra instanceId |
| — | developer | Diagnostico: form$.data tiene status | browser eval | form$.data.status = "DRAFT" disponible. Refactor: leer status de form$ (DEC-LOCAL-07) |
| — | developer | Diagnostico: instanceId via DOM | browser eval | findInstanceIdFromDOM() encuentra "am-matrix-001" via DOM walk |
| — | developer | Fix: template ref + DOM fallback | WorkflowActionsElement.vue | rootEl ref + document.querySelector como fallback |
| — | developer | Bug encontrado: retry condition | browser eval | Status se resuelve en 1er intento → retries condicionados a !currentStatus nunca ejecutan → instanceId queda vacio |

**Decisiones tomadas**:
- DEC-LOCAL-06: Custom element en RecordDetail (opcion A) sobre rowActions (no soportan mutation) y CompetencyTree (mezcla responsabilidades)
- DEC-LOCAL-07: Status leido de form$.data, instanceId resuelto via DOM walk (defineElement rompe cadena Vue parents)

**Descubrimientos**: L13, L14, L15, L16, L17

**Tasks completadas**: Ninguna completa — task #13 in_progress

**Tasks pendientes**: Fix retry condition, verificar mutation con publicId vs Prisma id, test E2E transiciones

**Resultado**: Parcial. Element renderiza (boton "Enviar a Revision" + badge "Borrador" visibles), pero no ejecuta transicion porque instanceId no se resuelve por bug de timing en retry. Fix identificado, no aplicado. Sesion pausada por el dev.

**Next steps para retomar**:
1. En `WorkflowActionsElement.vue` linea ~180: cambiar condicion de retry de `!currentStatus.value` a `!currentStatus.value || !instanceId.value`
2. Verificar que el resolver `caMatrixTransition` funciona con `publicId` ("am-matrix-001") — actualmente usa `prisma.findUnique({ where: { id } })` que espera Prisma PK, no publicId. Puede requerir cambiar a `findFirst({ where: { publicId } })`
3. Sync + test E2E: click boton → transicion exitosa → status cambia en UI
4. Test caso error: transicionar matriz sin competencias → debe mostrar error

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 (CRUD esquemas) | Seed + UI list visible | manual | pass |
| REQ-02 (CRUD matrices) | Seed + UI list visible | manual | pass |
| REQ-03 (Arbol jerarquico) | 8 competencias jerarquicas en UI | manual | pass |
| REQ-04 (Criterios/umbrales) | 6 criterios + 5 umbrales en seed | manual | pass (datos en DB) |
| REQ-05 (Workflow) | Resolver creado, no testeado en UI | — | pending |
| REQ-06 (i18n) | Tabs traducidos, labels, columnas | manual | partial (enums raw) |
| REQ-07 (FK display) | Esquema de Niveles → "3 Niveles Basico" | manual | pass |

### Test cases

| # | Case | REQ | Type | Status |
|---|------|-----|------|--------|
| TC-1 | App visible en sidebar | REQ-02 | manual | pass |
| TC-2 | Listado de matrices muestra datos seed | REQ-02 | manual | pass |
| TC-3 | Listado de esquemas muestra datos seed | REQ-01 | manual | pass |
| TC-4 | Detalle de matriz con 4 tabs | REQ-02 | manual | pass |
| TC-5 | FK Esquema de Niveles muestra nombre | REQ-07 | manual | pass |
| TC-6 | Arbol de competencias con 8 nodos jerarquicos | REQ-03 | manual | pass |
| TC-7 | Badges de tipo (Generic/Specific/Disciplinary/Holistic) | REQ-03 | manual | pass |
| TC-8 | Boton Agregar Competencia Raiz presente | REQ-03 | manual | pass |
| TC-9 | Tabs traducidos (Esquemas de Niveles / Matrices de Competencias) | REQ-06 | manual | pass |
| TC-10 | Dropdown sub-layouts (Borradores/En Revision/Publicadas) | REQ-06 | manual | pass |
| TC-11 | Tab Facultades muestra Faculty of Engineering | REQ-02 | manual | pass |

### Regression

No aplica — mod nuevo, no modifica funcionalidad existente.

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Workflow en UI — botones de transicion de estado | REQ-05 | Task #8 | Resolver `caMatrixTransition` en `logic/caMatrixTransition.resolver.js` con validaciones (DRAFT→REVIEW requiere competencias, REVIEW→PUBLISHED requiere types). Mutation GraphQL registrada y synced | Agregar row actions en `ca-matrix-view.json` que invoquen mutation `caMatrixTransition`, o botones custom en CompetencyTreeElement. Testear transiciones validas e invalidas | should |
| B2 | Drag-and-drop en arbol de competencias | REQ-03 | REQ-03 scenario "Reordenar via drag-and-drop" | Funciones drag en `useCompetencyTree.ts` (onDragStart, onDragOver, onDragEnd, onDragCancel). CSS: `ct-node--dragging`, `ct-node--drop-target`, `ct-node--drop-inside`. DragState tipado | Agregar `draggable="true"` y event handlers al template de `CompetencyTreeElement.vue` (actualmente no conectados). Persistir nuevo orden via `persistUpdate`. Testear reorder y reparenting | should |
| B3 | Traduccion de enums en RecordList | REQ-06 | REQ-06 scenario "Enums con labels amigables". Learn L10 | Traducciones en `lang/es_CL.json` bajo `enum.status/scope/schemeMode/competencyType`. Workaround: layouts filtrados por estado (Borradores, En Revision, Publicadas) | Cambio en core `layout/src/layouts/RecordList.vue` para enum rendering via i18n. Alternativa: campo `statusLabel` calculado en resolver custom | could |
| B4 | Keys i18n en RecordList embebido | Nuevo (core) | Bug preexistente. Learn L8 | Traducciones en `suite/lang/es_CL@RecordList.json`. RecordList standalone las lee. Embebido en RecordDetail no las hereda | Investigar scope i18n en RecordDetail → RecordList embebido. Afecta todos los mods con tabs embebidos | could |
| B5 | Selector de idioma en el arbol | REQ-06 | REQ-06 | Keys enum en 3 idiomas (`enum.competencyType.*`). Componente tiene `$t` via Vueform ElementLayout | Reemplazar `typeLabels` hardcodeado en `CompetencyTreeElement.vue` ~linea 168 por `$t('enum.competencyType.GENERIC')`. Verificar con selector de idioma en navbar | should |
| B6 | Refinar learns pendientes (L1-L12) | Nuevo | Sessions 1 y 2 | 12 learns en status `raw`. Candidatos a rule: L5, L6, L7, L11. Candidatos a bug: L8, L9, L10 | Sesion de refinamiento: evaluar cada learn → promover a rule/bug/decision o descartar. Rules van a `rules/mods/`. Usar `/dkc-teach` | could |

## Summary

### What was requested
Investigar matrices de competencias en suite-front, contrastar con up1, crear mod nuevo autocontenido.

### What was done
- Investigacion completa de suite-front assessment (15+ endpoints, modelo de datos completo)
- Contraste con documentacion learning-assurance de Deckard (24 capacidades, 9 specs)
- Mod `assessment-matrix` implementado end-to-end: 8 objects, 21 layouts, CompetencyTree custom element, workflow resolver, i18n 3 idiomas, seed
- Verificado en UI: app en sidebar, listados, detalle con arbol de competencias funcional
- Session 3: WorkflowActionsElement (custom Vueform element) creado, renderiza botones y badge, mutation pendiente por bug de timing en instanceId

### What was discovered
- Rules creadas: RULE-mods-011 (sync constraints), RULE-mods-012 (defineElement pattern), RULE-layout-014 (instanceId via DOM), RULE-suite-003 (HMR restart)
- Decisions tomadas: DEC-LOCAL-01 a DEC-LOCAL-07
- Bugs registrados: BUG-layout-001 (i18n embebido), BUG-layout-002 (sin titulo RecordDetail), BUG-layout-003 (enums raw RecordList) — todos preexistentes del core

### Testing summary
| Metric | Value |
|--------|-------|
| REQs covered | 6/7 |
| REQs NOT covered | REQ-05 (workflow parcial — botones visibles, mutation no conectada) |
| Test cases total | 11 (0 auto, 11 manual) |
| Test cases pass | 11 |
| Test cases fail | 0 |
| Regression delta | N/A (mod nuevo) |

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 3 |
| Tasks completed | 12/13 |
| Tasks in progress | 1 (#13 — WorkflowActionsElement) |
| Commits | 2 (`0903fc5`, `6ed530c`) |
| Learns captured | 17 |
| Learns → rules | 8 (L5,L6,L7,L11,L13,L14,L15,L17) |
| Learns → bugs | 3 (L8,L9,L10) |
| Learns discarded | 6 (L1,L2,L3,L4,L12,L16) |
| Rules created | 4 (RULE-mods-011, RULE-mods-012, RULE-layout-014, RULE-suite-003) |
| Decisions taken | 7 (locales) |
| Bugs found | 3 (preexistentes del core) |
| Failed approaches | 8 |

## Archivado

Cerrado el 2026-04-17 junto al archivado de `SPEC-mods-assessment-matrix`. El mod fue eliminado del codebase — el conocimiento se preservo en rules y bugs promovidos (ver lista en frontmatter `promoted_to` de la spec archivada). Backlog B1 / task #13 (WorkflowActionsElement) NO se ejecuto — se descarta junto al codigo.

Ver: `specs/_archive/SPEC-mods-assessment-matrix.md` para contexto historico.
