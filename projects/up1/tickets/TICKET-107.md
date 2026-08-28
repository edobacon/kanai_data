---
id: TICKET-107
project: up1
type: ticket
status: closed
work_type: fix
module: curriculum-design
autopilot: autonomous
---

# Correcciones de review de UPONE-1382: false-Restrict por casing + hardening del motor de delete cascade

## Request

Al revisar como PR los cambios de TICKET-104 / UPONE-1382 (motor de hard delete en cascada, rama `feat/UPONE-1382-hard-delete-cascade`, aun NO mergeada a develop), la review encontro un defecto bloqueante de comportamiento en el motor de borrado y varios puntos de calidad en el codigo del ticket. El dev pide capturar en un ticket fix propio esos casos, con su contexto completo, para corregirlos.

**Alcance: SOLO lo intrinseco a UPONE-1382** (el codigo del motor de delete cascade en object-manager y el mod curriculum-design). La integracion con develop (merge, resolucion de conflictos, capa RBAC de UPONE-1393) queda FUERA de este ticket y se aborda por separado cuando se retome el merge.

Es un follow-up local de TICKET-104 (trabajo aun no integrado, sin issue nuevo en Jira por convencion del equipo). El KB de mantenimiento derivado de la review tambien queda registrado aca.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | multi (core object-manager + mod curriculum-design) con foco core transversal |
| Modulo principal | curriculum-design (layer: core) |
| Modulos afectados | object-manager (motor `deleteImpactPlan` + tests), mods/curriculum-design (i18n en/pt del compositeSectionTree) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Borrar un `Curriculum` con al menos una `requirementCategory` queda bloqueado por Restrict falso, por comparar claves de subarbol con casing heterogeneo (clave del nodo con el `object` del JSON en minuscula vs clave de referencia en PascalName) | ✓ confirmada | Trazado estatico del motor: clave del nodo en `deleteImpactPlan.js:473`, filtro externo en `:669-672`, `PascalName` en `:722`. Falso verde del unit T4 (usa PascalCase inexistente en el JSON) y ausencia de fixture de categoria en integration |
| H2 | Los tests mockeados verdes ocultan el bug porque cargan un `object` que no existe en el JSON real | ✓ confirmada | `deleteImpactPlan.test.js` caso T4 declara `object: 'RequirementCategory'` (PascalCase); el JSON real de `Curriculum.json` declara `requirementCategory` (minuscula) |
| H3 | La causa raiz (comparar `PascalName` crudo contra la clave de metadata) es general, no exclusiva de `requirementCategory`; cualquier hijo directo declarado en minuscula la dispararia | ~ parcial | Hoy solo `requirementCategory` gatilla (planEntry usa `planId` sin `curriculumId`; requirement usa ownerType minuscula que no matchea el scan `Curriculum`). Confirmar al normalizar |

### Context found

- **Rules del modulo / relevantes**: RULE-dev-004 (core compartido `deleteInstance`/`deleteBulkInstances` exige revision del equipo core, no solo quality review del mod); DET-16 (propagacion / retiro destructivo); DET-33 (verificar self-report de los tests, no confiar en el JSON verde); DET-7/DET-13 (test cases trazan a discovery + cierre por evidencia); DET-32 (necesidad y reuso).
- **Bugs abiertos**: `bug-curriculum-design-003` (citado por el propio motor como base de su diseno defensivo). El false-Restrict de esta review es candidato a bug nuevo (ver Backlog / KB).
- **Specs relacionados**: `SPEC-curriculum-design-hard-delete-cascade` (contrato del motor: nodes/edges/restrictions/deleteOrder/summary). TICKET-104 (origen), TICKET-102 (P3, core_DataLog), TICKET-082/089 (precedentes de guard de borrado).
- **Memoria de proyecto aplicable**: "Unit tests mockeados consagran bugs de runtime en codigo de datos" (para delete/persistencia con proyecciones RT/ext, enums o casing de FK, el prisma mockeado no prueba correctitud; exigir integration contra BD real). El false-Restrict es una instancia exacta de esa memoria.
- **Warnings**: el fix vive en core (`deleteImpactPlan.js`), blast radius amplio; requiere revision del equipo core (RULE-dev-004). Un parche que solo cambie el JSON a PascalCase arregla el sintoma pero deja la comparacion fragil para el proximo hijo declarado en minuscula: preferir normalizar la comparacion.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `feat/UPONE-1382-hard-delete-cascade` (en object-manager, layout, mods/curriculum-design) y `feat/UPONE-1382-hard-delete-cascade` en repo `mcp` (uplanner/mcp) |
| Base branch | `develop` (object-manager, layout, mods/curriculum-design); en `mcp` la base es `up1-sp6`/`main`, sin `develop` |
| Repos | up1 monorepo con submodulos: `~/Workspace/uplanner/up1/{object-manager,layout,mods/curriculum-design}` + repo aparte `~/Workspace/uplanner/mcp` |
| DB state | tenant seed UPU (BD `uplanner_upu`) para smoke/integration del delete real |
| Services | object-manager dev (localhost:4000) + BD; sync/seed del tenant de prueba antes de baterias destructivas |
| Test data | fixtures desde seed/sync; para el S0 se necesita un `Curriculum` (Plan) con al menos una `requirementCategory` asociada |

### Reproduction steps (S0)

1. Precondicion: existe un `Curriculum` (recordType Plan) con al menos una `requirementCategory` (`curriculumId` apuntando a ese plan), sin referencias externas al subarbol.
2. Accion: ejecutar el borrado por el path real, `deleteBulkInstances("Curriculum", [planId])` (la ruta que usa RecordList) o el preview `deleteImpactPreview`.
3. Resultado observado: `plan.status = 'restricted'`; la mutacion devuelve `errors[]` con el mensaje "«<nombre>» esta en uso por N Categorias de requisito. Resuelvelo antes de eliminar." y el modal/MCP bloquean. Resultado esperado: cascada que borra el plan y sus `requirementCategory` (hijo poseido exclusivo), sin bloqueo.

## Casos a revisar y corregir

> Todos verificados contra el tip de `origin/develop` fetcheado el 2026-07-15: object-manager `d1ce034`, layout `b487df4`, mods/curriculum-design `30cc27d`. El repo `mcp` no tiene `develop`. Trazado estatico end-to-end del motor; no hubo entorno para smoke runtime de la cascada real, por lo que los casos de comportamiento se cierran con smoke por el path real en UPU.

### C1 (S0, critica, bloquea) - false-Restrict al borrar Curriculum con requirementCategory

- **Ubicacion**: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` (clave de nodo `:473`, filtro externo `:669-672`, PascalName `:722`).
- **Mecanismo**: las claves del subarbol se arman con el `object` de la metadata verbatim: `walkDirectChildren` (`:473`) genera `requirementCategory:<id>` porque `Curriculum.json` declara `"object": "requirementCategory"` (minuscula). `detectRestrictions` -> `findIncomingReferences` descubre la FK por convencion `curriculumId` y reporta `referencingObject = PascalName = "RequirementCategory"` (`:722`). `filterExternal` (`:669-672`) evalua `!subtreeKeys.has(\`${PascalName}:${id}\`)`, es decir busca `RequirementCategory:<id>` en un set que contiene `requirementCategory:<id>`. Casing distinto, no matchea, la categoria (que ES hijo en cascada) se cuenta como referencia externa y el plan pasa a `restricted`.
- **Falso verde**: el unit `deleteImpactPlan.test.js` caso T4 declara el directChild como `object: 'RequirementCategory'` (PascalCase inexistente en el JSON real), asi `filterExternal` matchea y el test queda verde. El integration caso A crea Curriculum + section + requirement pero no crea `requirementCategory`, tampoco lo ejercita.
- **Alcance preciso**: hoy solo `requirementCategory` gatilla; `planEntry` (fk `planId`) y `requirement` (ownerType `curriculum` minuscula) no. La causa raiz (comparar `PascalName` crudo contra la clave de metadata) es general y fragil.
- **Fix propuesto**: normalizar el casing al comparar claves de subarbol (comparar `objectType:id` normalizado, no `PascalName` crudo contra la clave de metadata) y corregir el test para que cargue el `object` real del JSON. Evitar el parche de solo-JSON-a-PascalCase (deja la fragilidad).
- **Verificacion**: smoke en UPU borrando un Curriculum con >=1 requirementCategory (debe cascada, no bloqueo) + integration nuevo (ver TC-2).

### C2 (S2, media) - detectRestrictions escala mal (O(nodos x modelos) + relee core_FieldDefinition por nodo)

- **Ubicacion**: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` (`findIncomingReferences`, ~`:683`).
- **Mecanismo**: por cada nodo hace `core_FieldDefinition.findMany` (no se hoistea al plan) y recorre todos los modelos Prisma con count + findMany para FK por convencion y polimorfica. Un Curriculum con cientos de secciones genera cientos de nodos por decenas de modelos = miles de queries, sincronico al abrir el modal (`deleteImpactPreview`) y otra vez en el commit. Riesgo de latencia/timeout en arboles grandes.
- **Fix propuesto**: hoistear la lectura de `core_FieldDefinition` a una sola vez por plan y acotar los modelos candidatos.

### C3 (S3, baja) - recursion muerta en walkDirectChildren

- **Ubicacion**: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` (`:458-470`).
- **Mecanismo**: el bloque recorre `grandchildren` hacia un `frontier`/`visited` que se descartan; solo el primer nivel se convierte en nodos (`:472`). Para objetos self-recursivos (`CurricularSection`, `requirement`) el loop externo de `buildDeleteImpactPlan` re-camina nivel a nivel, por lo que HOY no hay huerfanos, pero el inner-loop dispara `findMany` de mas por cada borrado y seria un bug de huerfanos si un directChild futuro declara `recursiveBy` con `object` distinto del padre.
- **Fix propuesto**: eliminar el inner-loop o hacerlo agregar nodos de verdad.

### C4 (S3, baja, DET-19) - ids internos de gestion en comentarios del motor

- **Ubicacion**: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js`: `TICKET-104` (`:16`), `BUG-curriculum-design-003` (`:26`), `RULE-core-023` (`:752`). Confirmado por grep el 2026-07-15: `TICKET-104` aparece 1 vez (linea 16), no 2.
- **Regla**: DET-19, en artefactos del repo se usa el id externo de Jira (`UPONE-1382`), no ids internos de gestion. El resto de repos (mcp/layout/mods) y los mensajes de commit ya usan `UPONE-1382` correctamente.
- **Fix propuesto**: reemplazar `TICKET-104` y `BUG-curriculum-design-003` por `UPONE-1382` (o quitar la referencia interna de gestion). **`RULE-core-023` SI existe en el KB** (`rules/core/rule-core-023.md`, confirmado 2026-07-15) — la cita en `:752` es valida; NO hay que crearla, solo confirmar que el naming/anchor sigue vigente (esto reduce B4 a verificacion de cita, no creacion).

### C5 (Consulta) - asimetria preview vs delete real

`deleteImpactPreview` corre el motor para cualquier objeto (sin el gate `objectDeclaresChildren`), mientras `cascadeDeleteIfApplicable` si gatea por hijos declarados. Para un objeto sin hijos declarados pero con referencias entrantes, el preview devuelve `restricted` (bloquea UI/MCP) pero el delete generico no revalida por el motor (depende del FK constraint de la BD). No es hueco de integridad, pero UI y backend pueden divergir en el mensaje. Definir si es intencional; si lo es, registrar decision.

### C6 (Consulta / i18n) - compositeSectionTree solo en es

Las keys `compositeSectionTree.buttons.delete` y `compositeSectionTree.delete.*` se agregaron solo a `mods/curriculum-design/lang/es/common.i18n.json`. `en` y `pt` no tienen el namespace `compositeSectionTree` (el componente ya era es-only, deuda previa, no regresion), asi que el boton/tooltip/modal de borrado saldra con la key cruda o fallback para en/pt. Contraste: las keys del CriticalWarningModal en `layout/lang/{en,es,pt}/RecordList.i18n.json` si estan completas en los 3 locales. Definir si se completan en/pt en este ticket o queda como deuda del componente.

## Casos de prueba a agregar / corregir (DET-7, DET-33)

| # | Case | Cubre | Type | Precondition | Expected | Nota |
|---|------|-------|------|--------------|----------|------|
| TC-1 | Corregir unit T4 de `deleteImpactPlan.test.js` para usar el `object` real del JSON (`requirementCategory`, minuscula) | C1 (H2) | auto | fixture del motor con metadata como el JSON real | con el casing real, el motor NO marca la categoria como externa (tras el fix) | hoy el test es falso verde por usar PascalCase inexistente |
| TC-2 | Integration BD real: borrar `Curriculum` (Plan) con >=1 `requirementCategory` sin refs externas | C1 (H1) | auto (integration) | UPU con Plan + requirementCategory | cascada: desaparecen plan + rt/ext + requirementCategory; DataLog por nodo; sin bloqueo | la matriz de TICKET-104 no cubre este caso |
| TC-3 | Integration BD real: borrar `Curriculum` (Plan) con `planEntry` | C1 (H3) | auto (integration) | UPU con Plan + planEntry | comportamiento correcto segun matriz (cascada de planEntry poseido; Restrict solo si Activity referenciada) | confirma que la causa raiz no afecta planEntry tras el fix |
| TC-4 | Smoke por el path real del usuario (RecordList) borrando el Plan con requirementCategory | C1 | manual | UPU, UI levantada | el modal muestra conteo de cascada (no bloqueo Restrict) y confirma el borrado | verificar el render real, no solo config+BD |

## Backlog / Mantenimiento del KB (Fase 4.5 de la review, requiere OK del dev)

| # | Item | Tipo | Prioridad | Como retomar |
|---|------|------|-----------|--------------|
| B1 | Registrar el false-Restrict de `requirementCategory` como bug de curriculum-design (root cause: casing en `filterExternal`) | bug | should | crear en `bugs/curriculum-design/`, validar con `dkc-validate`; cerrar con evidencia al aplicar C1 |
| B2 | Crear rule de core: el `object` de metadata de hijos debe resolverse/normalizarse por casing antes de comparar claves de subarbol; no comparar PascalName crudo contra la clave de metadata (promueve la memoria "resolver nombres por introspeccion, no por string" a rule del proyecto) | rule | should | `rules/core/RULE-core-NNN.md` con what/why/where/when/verification/source; validar con `dkc-validate Rule` |
| B3 | Learn: los unit tests del motor deben cargar el `object` real del JSON (o su casing), no strings inventados; T4 con PascalCase consagro el bug | learn | should | `dkc-learn` en este ticket |
| B4 | Verificar `RULE-core-023` citada en `deleteImpactPlan.js:752`. **Actualizado 2026-07-15: la rule SI existe (`rules/core/rule-core-023.md`).** Reducido a confirmar que el naming/anchor de la cita sigue vigente | rule | could | `Read rules/core/rule-core-023.md`, confirmar que la heuristica citada matchea; sin creacion |
| B5 | Registrar decision sobre la asimetria preview (siempre corre motor) vs delete (gateado por hijos) | decision | could | `decisions/` o `dkc-record-decision`, documentar rationale |
| B7 | **Deteccion de FK entrantes con nombre no-convencional en el motor de delete** (pre-existente, hallado por dual-judge en S1). `findIncomingReferences` escanea FK por convencion `<objectLower>Id` (ej. `requirementCategoryId`) y custom-fields `fieldType:'reference'`, pero NO detecta FK base con nombre no-convencional como `planEntry.categoryId → requirementCategory` (onDelete: Restrict, schema :1451). Riesgo: borrar una `requirementCategory` referenciada por un `planEntry.categoryId` de OTRO plan (externa al subarbol) no produce Restrict aplicativo → la BD aborta por FK con error crudo en vez del mensaje amigable. Backstop: el onDelete:Restrict de la BD evita corrupcion. NO causado por el fix de casing; fuera del alcance (casing) de este ticket | bug | should | crear bug en `bugs/curriculum-design/` o core; ampliar el scan de `findIncomingReferences` para resolver FK base por introspeccion del schema Prisma (relations entrantes), no solo por convencion de nombre; agregar integration con categoria referenciada externamente por categoryId |
| B6 | ~~[RESUELTO 2026-07-15: smoke real ejecutado, modal muestra cascade preview, borrado cascada confirmado en BD + DataLog]~~ Render pixel del `CriticalWarningModal` en el browser (suite Nuxt + Clerk + delete destructivo real) para el caso Curriculum+requirementCategory. Descubierto en S1.T4: el data path del modal (`deleteImpactPreview`) se verifico runtime contra UPU live (status=cascade, requirementCategory en byObjectType, restrictions=[]), pero el render visual del modal no se drive en la corrida autonoma (suite no levantada + auth Clerk + accion destructiva por UI) | smoke | should | levantar suite (`npm run dev --workspace=@uplanner/suite`), login Clerk test (eduardo.bacon+clerk_test / OTP 424242), navegar Curriculum RecordList en UPU, gatillar delete de un Plan con requirementCategory, verificar que el modal muestra conteo de cascada (no "esta en uso por N Categorias"); evidencia screenshot al subdir. Residual bajo: capa de presentacion delgada sobre el payload ya verificado + layout tiene tests del modal |
| B8 | `object-manager/docs/features/bulk-mutations.md` (tabla preexistente) afirma que `deleteBulkInstances` delega en `deleteInstance`; el codigo hace llamadas Prisma directas. Error de doc preexistente, NO ligado a SP6. Hallado por el editor de docs en S4 | doc-fix | could | corregir la fila de la tabla en `bulk-mutations.md` para reflejar el codepath real (Prisma directo, no delegacion al resolver singular) |
| B9 | `mods/curriculum-design/tests/integration/activity-status-badge-a11y.test.ts` testea los 9 estados legacy de BD, no el enum de 6 estados de UPONE-1381 (`Draft/InReview/Approved/Active/Deprecated/Archived`). Test-gap preexistente hallado en S4 | test | should | actualizar el test a11y del badge al enum de 6 estados; verificar la matriz WCAG `STATUS_OVERRIDES` por variant contra los 6 estados reales |
| B10 | `mods/curriculum-design/capabilities.json` sigue declarando `mod/curriculum-design:approve` y `:publish` sin ningun consumidor en el codigo (0 referencias fuera del propio JSON; la gobernanza de Activity migro a capabilities object-level `activity:approve/publish/...`). Dead capability, hallado en S4 | chore | could | remover las capabilities muertas del JSON del mod tras confirmar 0 uso; `npm run sync` |
| B11 | `mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadge.stories.ts` tiene un comentario que referencia `workflowStatus.name.{code}`, key i18n que el componente ya no usa (el badge mapea el enum `status` con labels propios). Comentario stale en codigo, hallado en S4 | chore | could | actualizar/quitar el comentario stale en la story |

## Plan (borrador, a refinar en design-fix)

1. C1: normalizar el casing en la comparacion de subarbol del motor + corregir TC-1 + agregar TC-2/TC-3 integration + smoke TC-4. Revision del equipo core (RULE-dev-004).
2. C2/C3/C4: hardening del motor (performance, dead code, ids internos DET-19).
3. C5/C6: resolver consultas (decision de asimetria; completar i18n en/pt o dejar como deuda).
4. Mantenimiento del KB (B1..B5) con OK del dev.

> **Fuera de alcance (integracion con develop):** el merge de develop, la resolucion de los conflictos de layouts y la capa RBAC de UPONE-1393 NO son parte de este ticket. Se retoman por separado al reintegrar la rama. La resolucion de conflictos ya analizada (union: dropear `canEdit`, conservar el bloque de delete) queda como referencia para ese momento, no como tarea de este fix.

## Sessions

### Plan de sessions (preplanificacion)

3 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria especificos) lo completa `design-fix` al generar el spec. Cada session puede subdividirse o colapsarse durante execute si el tamano real difiere.

> Proyectado desde el Plan (borrador). Estas filas son `projected/pending`; se materializan como `### Session N` solo cuando `dkc-execute-task open-session N` active trabajo real. Numeracion desde S1 (ticket sin sessions previas).

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | C1 — corregir el false-Restrict por casing (root cause + tests reales) | execute | T3 | S1.T1 normalizar comparacion de claves de subarbol en `filterExternal`/`walkDirectChildren` (comparar `objectType:id` normalizado, no PascalName crudo); S1.T2 corregir los unit que cargan `object` PascalCase inexistente (T4 `:275` + historyKey `:550`) al casing real del JSON; S1.T3 integration BD real TC-2 (Curriculum + requirementCategory) y TC-3 (Curriculum + planEntry); S1.T4 smoke TC-4 por el path real RecordList en UPU | ⚑ fuerte | delete de Curriculum con requirementCategory cascada (no Restrict) verificado por integration BD real + smoke UI en UPU; planEntry sin regresion; revision del equipo core (RULE-dev-004) |
| S2 | C2/C3/C4 — hardening del motor (perf, dead code, DET-19) | execute | T2 | S2.T1 hoistear `core_FieldDefinition.findMany` a una sola lectura por plan + acotar modelos candidatos (C2); S2.T2 eliminar/corregir la recursion muerta de `walkDirectChildren` `:458-470` (C3); S2.T3 reemplazar ids internos de gestion por `UPONE-1382` en comentarios y confirmar cita de `RULE-core-023` (C4/DET-19) | auto | suite unit del motor verde sin regresion de nodes/edges; sin re-lectura de FieldDefinition por nodo; sin ids internos en el codigo del motor |
| S3 | C6/C5 + mantenimiento del KB | execute | T1 | S3.T1 completar namespace `compositeSectionTree` en `lang/en` y `lang/pt` del mod + `npm run sync` (C6); S3.T2 registrar decision de la asimetria preview vs delete real (C5); S3.T3 KB maintenance con OK del dev (B1 bug, B2 rule, B3 learn, B4 verificar cita, B5 decision) | auto | i18n presente en es/en/pt; decision C5 registrada; records KB creados y validados con `dkc-validate` |
| S4 | Auditoria + actualizacion de docs SP6 (core + mod) — reflejar P3/P4/P5 + fix | execute | T1 | S4.T1 doc-fixes P3/UPONE-1380 (DataLog, retiro ChangeLog); S4.T2 doc-fixes P4/UPONE-1381 (transiciones + gate versionado); S4.T3 doc-fixes P5/UPONE-1382 (motor cascade delete + doc nueva `delete-cascade.md`) | auto | ninguna doc de core/mod describe mecanismos retirados como vigentes (grep verificado); capacidades nuevas cubiertas; doc nueva del motor creada y enlazada |

**Notas del esqueleto**:
- **S1 es la session bloqueante** (C1 critica S0). Su gate es ⚑ fuerte por doble motivo: (a) valida empiricamente el comportamiento del delete real (no basta unit mockeado — memoria "unit mockeados consagran bugs de runtime"), y (b) toca core (`deleteImpactPlan.js`, blast radius amplio) → exige revision del equipo core (RULE-dev-004) antes de merge a `develop`.
- **Dependencia S1 → S2**: el hardening de S2 se hace sobre el motor ya corregido para no mezclar el fix de comportamiento con refactors de perf/limpieza (facilita la revision core del diff de S1).
- **S3 depende de OK del dev** para los items de KB (B1-B5, Fase 4.5). C6 esta en `execute_scope` (frontmatter) — se ejecuta; C5 es solo decision (sin codigo).
- **Precondiciones operativas verificadas (2026-07-15)**: ramas `feat/UPONE-1382-hard-delete-cascade` presentes en object-manager y mods/curriculum-design (guarda de rama RULE-dev-004 OK por repo destino); archivos del `execute_scope` existen; tenant UPU (`uplanner_upu`) es el entorno de smoke/integration. Pendiente al arrancar execute: object-manager dev + BD levantados para S1.T3/S1.T4.

### Session 1 — 2026-07-15 — C1: corregir el false-Restrict (root cause + tests reales) [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Corregir el false-Restrict por casing en el motor de delete cascade (normalizar la comparacion de pertenencia al subarbol), corregir los unit que cargan casing PascalCase inexistente, y respaldar el fix con integration contra BD real + smoke por el path real (RecordList) en UPU.

parallel_groups: [[S1.T2, S1.T3]]

**Tasks completadas**:
- [x] S1.T1 — Normalizar la comparacion de pertenencia al subarbol en `filterExternal` (comparar `objectType:id` normalizado, no `PascalName` crudo contra la clave de metadata)
- [x] S1.T2 — Corregir los unit que cargan `object` PascalCase inexistente: T4 (`:275`) y el test de historyKey (`:550`) al casing real del JSON (`requirementCategory`)
- [x] S1.T3 — Integration BD real: TC-2 (Curriculum + requirementCategory → cascada) y TC-3 (Curriculum + planEntry → matriz UPONE-1382 sin regresion)
- [x] S1.T4 — Smoke por el path real (RecordList) en UPU: borrar el Plan con requirementCategory y verificar conteo de cascada (no Restrict) + evidencia runtime
- [x] S1.GATE — Gate de sync Session 1 (tier: T3)

**Validacion del tier** (T3): unit motor `deleteImpactPlan.test.js` 39/39 verde (incluye R-CASING nueva, bite-verificada: rojo sin fix); integration `hard-delete-cascade.integration.test.js` 7/7 verde contra BD UPU real (TC-2 requirementCategory cascada, TC-2b ordering categoryId Restrict-FK, TC-3 planEntry no-regresion; TC-2 bite-verificada: DELETE_RESTRICTED sin fix); runtime smoke del data path del CriticalWarningModal contra UPU live (status=cascade, requirementCategory en byObjectType, restrictions=[]).

#### Quality review (DET-23)

Modo: dual-judge (T3, DET-35), 2 jueces ciegos sonnet en paralelo sobre el diff scoped de S1:

| # | Dimension | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad / sin console.* | pass | helper puro `normalizeSubtreeKey`; sin console; sin dead code |
| 2 | Lint / estilo | pass | corregido indent de comentario (INFO confirmado por ambos jueces) |
| 3 | Tipado | pass | JS; sin `any`; strings/Set bien tipados por uso |
| 4 | Testing | pass | R-CASING (unit, hits detectRestrictions) + TC-2/TC-2b/TC-3 (integration BD real); bites verificadas por toggling |
| 5 | Escalabilidad | pass | normalizacion O(n) sobre keys ya materializadas; sin queries extra |
| 6 | Mantenibilidad | pass | fix en el boundary de comparacion (derivado de nodeMap) cubre todos los sitios de construccion de clave presentes y futuros |
| 7 | Claridad | pass | helper documentado con el por-que del casing heterogeneo |
| 8 | a11y | n/a | cambio backend |
| 9 | Storybook | n/a | cambio backend |
| 10 | Error handling | pass | `indexOf(':')` seguro para keys sin/`con` multiples `:`; no suprime Restrict legitimos (verificado por jueces + tests) |

**Dual-judge**: Judge A = approve (1 INFO cosmetico). Judge B = iterate (1 WARNING coverage + 2 INFO). Ambos confirmaron el fix correcto/consistente y que los tests muerden. Contradiccion (scope de coverage, no defecto del cambio) resuelta EMPIRICAMENTE: el WARNING (categoria referenciada por `planEntry.categoryId` con onDelete:Restrict, orden de borrado) se cerro con TC-2b nuevo que PASA (cascada FK-safe). INFO cosmetico corregido. INFO pre-existente (`findIncomingReferences` no detecta FK base no-convencional `categoryId`) capturado como backlog B7 (fuera del alcance casing; la BD onDelete:Restrict es backstop). Terminal: **APPROVED**. Sin adjudicador reasoning (los jueces coinciden en la correctitud del fix).

**Verificacion self-report (DET-33)**: claim factual de Judge B verificado por mi contra `schema.prisma:1451` (FK real). `git status` del submodulo object-manager sin contaminacion de los jueces (read-only). Suites re-corridas por el orquestador.

**RULE-dev-004 (revision del equipo core)**: PENDIENTE — gate humano de merge. El fix vive en core (`deleteImpactPlan.js`); la revision del equipo core + merge a `develop` es un gate externo que NO se ejecuta en autopilot (misma clase que push/close). El codigo queda commiteado local en la rama `feat/UPONE-1382-hard-delete-cascade`, listo para esa revision.

**Commit DET-27**: `a0f65cb` fix(delete-cascade): normalize subtree-key casing to prevent false-Restrict (solo 3 archivos de S1; el resto del working tree son artefactos pre-existentes de codegen/sync de la rama, ajenos a S1, NO commiteados).

```dkc:gate-telemetry
session: 1
work_type: fix
tier: T3
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 16893
est_tokens: 4565
span_seconds: 3300
```

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Los unit tests del motor de delete deben cargar el `object` REAL declarado en el JSON del objeto (su casing exacto), no un string inventado. Dos tests (T4 y el de historyKey) declaraban `object: 'RequirementCategory'` en PascalCase, casing que NO existe en `Curriculum.json` (declara `requirementCategory`): eso los mantenia verdes mientras el runtime real fallaba (false-Restrict). Un unit sobre codigo de datos que arma claves por string debe reflejar el casing de la fuente de verdad, o consagra el bug. | passive (review UPONE-1382) | S1 | refined | BUG-curriculum-design-012, RULE-core-031 |

## Commits

| Hash | Fecha | Header | Tasks | REQs |
|------|-------|--------|-------|------|
| a0f65cb | 2026-07-15 | fix(delete-cascade): normalize subtree-key casing to prevent false-Restrict | S1.T1, S1.T2, S1.T3, S1.T4 | REQ-FIX-01, REQ-REGRESSION-01 |
| c6187cf | 2026-07-15 | refactor(delete-cascade): hoist FieldDefinition read, drop dead recursion, DET-19 ids | S2.T1, S2.T2, S2.T3 | REQ-QUALITY-01, REQ-QUALITY-02, REQ-QUALITY-03 |

### Session 2 — 2026-07-15 — C2/C3/C4: hardening del motor (perf, dead code, DET-19) [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: Hardening del motor ya corregido: hoistear la lectura de core_FieldDefinition (perf), eliminar la recursion muerta de walkDirectChildren (dead code) y reemplazar ids internos por UPONE-1382 (DET-19). Zero behavior change: las suites de S1 (39 unit + 7 integration) deben seguir verdes.

**Tasks completadas**:
- [x] S2.T1 — Hoistear core_FieldDefinition.findMany a una sola lectura por plan + acotar modelos candidatos (C2)
- [x] S2.T2 — Eliminar/corregir la recursion muerta de walkDirectChildren (C3)
- [x] S2.T3 — Reemplazar ids internos por UPONE-1382 en comentarios y confirmar cita RULE-core-023 (C4/DET-19)
- [x] S2.GATE — Gate de sync Session 2 (tier: T2)

**Validacion del tier** (T2): suite completa del motor verde antes y despues del refactor — 39 unit + 7 integration = 46/46. Zero behavior change confirmado (el refactor es hardening: perf + dead code + comentarios).

#### Quality review (DET-23)

Modo: reviewer aislado single-pass (sonnet). Proporcionalidad (DET-35 graduable + session-gate): S2 es refactor mecanico de cero-cambio-de-comportamiento, blindado por las 46 pruebas de regresion (mismo verde antes/despues). El dual-judge se reserva para logica que cambia comportamiento (S1); para eliminacion de dead-code + hoist de perf + ids de comentarios, un reviewer aislado + suite de regresion completa es suficiente y el dual-judge seria desproporcionado.

| # | Dimension | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad | pass | net -11 lineas; menos queries (hoist); sin console |
| 2 | Lint / estilo | pass | JSDoc de walkDirectChildren corregido (ya no menciona recursiveBy removido) |
| 3 | Tipado | pass | JS; param `referenceFieldDefs = []` con default seguro |
| 4 | Testing | pass | 46/46 verde antes y despues = zero behavior change |
| 5 | Escalabilidad | pass | C2: core_FieldDefinition pasa de O(nodos) queries a 1 por plan |
| 6 | Mantenibilidad | pass | C3: elimina dead code (frontier/grandchildren descartados + helper huerfano) |
| 7 | Claridad | pass | comentarios explican el por-que de cada cambio |
| 8 | a11y | n/a | backend |
| 9 | Storybook | n/a | backend |
| 10 | Error handling | pass | C2 preserva el fallback try/catch (array vacio → convencion) |

**Reviewer aislado**: approve. 2 INFO — (a) JSDoc stale de recursiveBy → CORREGIDO; (b) granularidad de fallback per-plan vs per-nodo en errores transitorios → teorico (fallos deterministicos identicos). Sin CRITICAL ni WARNING real.

**Verificacion self-report (DET-33)**: suite re-corrida por el orquestador (46/46 antes y despues); `git status` del submodulo sin contaminacion del reviewer (read-only); commit c6187cf toca solo deleteImpactPlan.js.

**Commit DET-27**: `c6187cf` refactor(delete-cascade): hoist FieldDefinition read, drop dead recursion, DET-19 ids.

```dkc:gate-telemetry
session: 2
work_type: fix
tier: T2
review_mode: isolated-single
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 10128
est_tokens: 2737
span_seconds: 600
```

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-07-15 — C6/C5 + mantenimiento del KB [phase: execute]

**Tipo**: auto
**Validation tier**: T1

**Objetivo**: Completar el namespace compositeSectionTree en lang/en y lang/pt del mod (C6), registrar la decision de la asimetria preview vs delete real (C5), y consolidar el KB de la review (B1 bug, B2 rule, B3 learn, B4 verificar cita RULE-core-023).

**Tasks completadas**:
- [x] S3.T1 — Completar namespace compositeSectionTree en lang/en y lang/pt del mod + npm run sync (C6)
- [x] S3.T2 — Registrar decision de la asimetria preview vs delete real (C5/B5)
- [x] S3.T3 — KB maintenance: bug false-Restrict (B1), rule de casing (B2), learn de tests (B3), verificar cita RULE-core-023 (B4)
- [x] S3.GATE — Gate de sync Session 3 (tier: T1)

**Validacion del tier** (T1): C6 i18n verificado post-sync — `compositeSectionTree` presente en `suite/locales-dist/{es,en,pt}/curriculum-design/common.json` (parity 11 keys); `npm run sync` 3/3 success. KB records validados con `dkc-validate` (Bug/Rule/Decision todos `valid: true`).

#### Quality review (DET-23)

Modo: inline light (T1 auto, cambio no-logico: i18n + records de conocimiento). DET-35 dual-judge no aplica a T1.

| # | Dimension | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad | pass | i18n en/pt con parity exacta vs es (sin keys faltantes ni extra) |
| 2 | i18n | pass | 3 locales completos; sync sin drift para compositeSectionTree |
| 3 | Testing | n/a | i18n + docs; sin codigo testeable nuevo (no rompe suites — 46/46 sigue verde de S2) |
| 4 | Claridad | pass | records KB con what/why/where/when/source; bug con root cause + solution + reproduction |
| 5 | Mantenibilidad | pass | conocimiento de la review consolidado (bug + rule global + decision + learn) |
| 6-10 | (a11y/storybook/tipado/escalabilidad/error-handling) | n/a | sin codigo de UI/backend nuevo en S3 |

**KB consolidado (B1-B5)**: B1 → BUG-curriculum-design-012 (fixed, a0f65cb); B2 → RULE-core-031 (scope global, must); B3 → L1 en Learns del ticket; B4 → cita RULE-core-023 confirmada vigente (rule existe, heuristica de clasificacion de hijos por FK coincide con el uso en `:768`); B5 → DEC-050 (asimetria preview vs delete intencional). Todos `dkc-validate` verde.

**Verificacion self-report (DET-33)**: parity i18n verificada por mi (script de flatten de keys es/en/pt); presencia post-sync confirmada con grep en suite/locales-dist; `dkc-validate` re-corrido sobre cada record.

**Commit DET-27**: `5778157` feat(i18n): add compositeSectionTree namespace to en and pt (repo mods/curriculum-design). Los records KB (bug/rule/decision) viven en el repo dkc (deckard), fuera del repo de codigo; el i18n es el unico cambio de codigo de S3. La salida sincronizada `suite/locales-dist/` es regenerable/untracked (0 cambios trackeados).

```dkc:gate-telemetry
session: 3
work_type: fix
tier: T1
review_mode: inline-light
judge_tier: none
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 4296
est_tokens: 1161
span_seconds: 900
```

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 4 — 2026-07-15 — Auditoria + actualizacion de docs SP6 (core + mod) [phase: execute]

**Tipo**: auto
**Validation tier**: T1

**Objetivo**: Auditar y actualizar la documentacion de up1 para que refleje los cambios reales de SP6 en core (`object-manager`, `layout`) y en el mod `curriculum-design`, cubriendo P3 (UPONE-1380 DataLog), P4 (UPONE-1381 transiciones + gate de versionado) y P5 (UPONE-1382 hard delete en cascada + el fix de este ticket). Alcance ampliado autorizado por el dev (ver decisions_log `scope-expansion`). Todo en la rama `feat/UPONE-1382-hard-delete-cascade` (contiene P3+P4+P5).

**Auditoria (discovery)**: 3 researchers en paralelo (uno por ticket) compararon el codigo en la rama contra los docs de core y mod. Resultado: 21 docs accionables + 1 doc nueva. Hallazgos secundarios (no fixes de doc): (a) `activity-governance-hu4.md` documentaba un drop de columnas `workflowId`/`currentStatusId` que nunca se ejecuto en la rama (se corrige la doc a la realidad); (b) los doc-fixes de P3/P4 (ya en develop) solo llegan a develop al mergear UPONE-1382.

**Tasks completadas**:
- [x] S4.T1 — Doc-fixes P3/UPONE-1380 (DataLog, retiro ChangeLog): mod `append-only-audit.md` (acotado a workflowTransitionHistory vigente), `reference/error-codes.md` (AUDIT_* marcados retirados), `reference/i18n-keys.md` (key changeLog retirada), `.ai/CONTEXT.md` (scope SP6), `README.md` (feature Historial); core `versioning-capability.md` (ChangeLog como consumer historico), `features/event-system.md` (withDataLog en la cadena de decorators)
- [x] S4.T2 — Doc-fixes P4/UPONE-1381 (transiciones + versionado): mod `user-guide/transition-activity.md` (flujo por status + enforceEnumTransitions), `reference/graphql-mutations.md` (transitionActivityValidated/updateActivityValidated retiradas; workflow relacional vigente sin dato), `user-guide/INDEX.md`, `user-guide/activity-status-badge.md` (mapa estatico sin query), `architecture/activity-governance-hu4.md` (correccion requiresComment no enforzado), `README.md` (enum 6 estados + capabilities object-level), `.ai/CONTEXT.md`; core `versioning-capability.md` (versionableFromStates/Via B)
- [x] S4.T3 — Doc-fixes P5/UPONE-1382 (cascade delete): NUEVA core `features/delete-cascade.md`; core `features/datalog.md` (deleteBulkInstances si audita per-node), `features/bulk-mutations.md` (subseccion cascada declarativa), `guides/object-definitions.md` (campo onDelete); layout `features/recordlist.md` (deleteImpactPreview dinamico + auto-bloqueo restricted) + `.ai/CONTEXT.md`; mod `guides/composite-section-tree.md` (prop enableDelete + i18n delete.*), `.ai/CONTEXT.md`
- [x] S4.GATE — Gate de sync Session 4 (tier: T1)

**Ejecucion**: 2 editores en paralelo (sonnet) sobre grupos de archivos disjuntos (core+layout / mod), armados con ground truth SP6 verificado por el orquestador ANTES de delegar (auditCapture.resolver.js no existe; createWorkflowValidated/WorkflowTransition/History SIGUEN vivas; Activity a enum de 6 estados con currentStatusId retirado; versionableFromStates en version-from-source.js). Regla verificar-antes-de-escribir obligatoria. 19 docs editadas + 1 nueva (`delete-cascade.md`).

**Por que se re-verifico el audit automatico (DET-33)**: el primer barrido de researchers sobre-reporto retiros de P4 (afirmo `createWorkflowValidated` eliminada y que el schema aun tenia `workflowId/currentStatusId`). Contra el codigo real: `createWorkflowValidated` sigue en `logic/workflow.resolver.js:54` y `activity.json` ya no declara `currentStatusId` (status es enum). Aplicar esas claims habria inyectado errores (revertir una doc correcta). Ground truth se fijo por lectura directa de `activity.json`, `version-from-source.js`, `useActivityStatusBadge.ts`, `deleteImpactPlan.js` y los resolvers del mod antes de tocar doc.

**Validacion del tier** (T1): grep de verificacion sobre los docs tocados. Ninguna mencion de mecanismo retirado (ChangeLog/auditCapture/recordAuditEvent, transitionActivityValidated) queda descrita como vigente: todas contextualizadas como retiradas (strikethrough `~~...~~`, "no existe hoy", "reemplazo de #4"). Enlaces de la doc nueva resuelven a archivos reales. em dash (regla org): 0 en todo el contenido nuevo (grep). Archivos tocados = solo `.md` + `layout/.ai/CONTEXT.md`; el resto del working tree (prisma/typeDefs/objects/*.vue) es estado pre-existente de la rama, NO commiteado.

#### Quality review (DET-23)

Modo: inline light (T1 auto, cambio no-logico: solo documentacion). DET-35 dual-judge no aplica a T1.

| # | Dimension | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad / correctitud factual | pass | cada claim verificada por-claim contra codigo por los editores + spot-check del orquestador (delete-cascade.md, append-only-audit.md); discrepancias reportadas, no escritas como hecho |
| 2 | Consistencia / no borra lo vigente | pass | append-only-audit.md conserva workflowTransitionHistory (vigente) y solo retira changeLog; workflow relacional documentado como vigente-sin-dato |
| 3 | Estilo / regla org | pass | espanol neutro, 0 em dash en contenido nuevo, ids Jira (DET-19) |
| 4 | Claridad | pass | doc nueva con contrato, gate, atomicidad, DataLog per-node y ejemplos con file:line |
| 5 | Mantenibilidad | pass | enlaces cruzados entre delete-cascade/datalog/bulk-mutations/polymorphic-children/versioning |
| 6-10 | (tipado/a11y/storybook/escalabilidad/error-handling) | n/a | solo documentacion |

**Verificacion self-report (DET-33)**: `git diff --stat` por repo confirma que los editores solo tocaron los `.md` asignados (+ layout/.ai/CONTEXT.md); los cambios non-doc son artefactos pre-existentes de la rama. Spot-check de 2 docs (delete-cascade.md nueva, append-only-audit.md quirurgica) leidas integras: fieles al codigo. Grep de gate re-corrido por el orquestador.

**Hallazgos secundarios (fuera de alcance de doc, capturados como backlog)**:
- B8: `object-manager/docs/features/bulk-mutations.md` (tabla preexistente) dice que `deleteBulkInstances` delega en `deleteInstance`; el codigo hace llamadas Prisma directas. Error preexistente, NO SP6. No corregido (fuera de alcance doc-audit).
- B9: `mods/curriculum-design/tests/integration/activity-status-badge-a11y.test.ts` testea los 9 estados legacy de BD, no el enum de 6 estados (UPONE-1381). Test-gap preexistente.

**Refinamiento de legibilidad (feedback del dev, misma session)**: tras la primera pasada el dev observo dos problemas: (1) los docs mencionaban artefactos internos de DKC/planificacion (TICKET-*, SPEC-*, RULE-* internos, REQ-*, DET-*, BUG-*, etiquetas SP*/P*/HU*), que no deben salir del KB; (2) las ediciones anexaban capas tipo changelog (strikethrough, "Nota de actualizacion", "retirado/reemplazo de #") en vez de reescribir el estado actual, dificultando la lectura. Se reescribieron a fondo los 16 docs con problemas (a estado-actual, prosa limpia, purga total de artefactos DKC incluidos los pre-existentes dentro de esos docs, Jira minimo y contextual, delete-cascade.md con refs por funcion/archivo en vez de linea). En READMEs/CONTEXT se reorganizo por capacidad (no por sprint). Verificacion final (grep del orquestador sobre los 16): 0 em dash, 0 artefactos DKC en prosa (solo quedan cross-links a nombres de archivo `*-hu2.md`/`*-hu4.md`, legitimos), 0 estilo changelog, solo `.md` tocados. Ademas los editores corrigieron staleness factual pre-existente en el mod (campo `executionUnitId`, conteos de tests reales, 4 error codes reales sin documentar) y flaggearon B10/B11 (abajo).

**Commits DET-27** (locales, sin push; el push sigue siendo el gate; hashes tras amend con la reescritura de legibilidad):
- object-manager `0f2cb73` docs(sp6): motor de delete en cascada, DataLog en bulk delete y gate versionableFromStates (UPONE-1382/1381/1380)
- layout `b7003d4` docs(recordlist): preview dinamico deleteImpactPreview y auto-bloqueo restricted (UPONE-1382)
- mods/curriculum-design `d50633f` docs(sp6): retiro de ChangeLog, enum de 6 estados de Activity y borrado en cascada (UPONE-1380/1381/1382)

**Revision lite estilo dredd (pre-cierre, a pedido del dev)**: revision read-only del diff propio de 107 (commits sobre la base de UPONE-1382) contra el ticket, enfocada en alineacion/trazabilidad (no re-auditoria de calidad/seguridad, ya cubierta por dual-judge). **Veredicto: ALINEADO.** Cobertura confirmada: C1 (normalizeSubtreeKey coincide con el fix propuesto), C2/C3/C4 (hoist FieldDefinition, dead code removido, ids DET-19 fuera), TC-1/TC-2/TC-3 (+TC-2b justificado en el ticket), C6 (paridad i18n exacta es/en/pt de compositeSectionTree.delete.*), C5 (sin codigo, decision DEC-050 + documentada en delete-cascade.md), meta S4 (19+1 docs sin artefactos DKC en prosa, afirmaciones tecnicas verificadas contra codigo). Sin scope creep. Unico hallazgo (baja/info): 6 em dash pre-existentes en secciones no reescritas de `bulk-mutations.md`; corregidos (commit re-enmendado a 0f2cb73, 0 em dash).

```dkc:gate-telemetry
session: 4
work_type: fix
tier: T1
review_mode: inline-light
judge_tier: none
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 0
est_tokens: 0
span_seconds: 0
```

**RULE-dev-004 (revision del equipo core)**: los commits de docs en `object-manager`/`layout` (core) viven en la rama `feat/UPONE-1382-hard-delete-cascade`; su merge a `develop` sigue el mismo gate humano que el codigo del ticket. Los doc-fixes de P3/P4 (ya en develop) llegaran a develop al mergear 1382.

**Gate decision:** (pendiente OK del dev)

- [ ] continue → nueva session
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → docs commiteadas local; espera revision del dev + push/close
