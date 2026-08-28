---
id: TICKET-132
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1645
module: core
autopilot: manual
---

# Core · Nav · Nombre de vista declarable por aplicación

## Request

Desacoplar el nombre de una vista de navegación del nombre del objeto que la respalda: permitir que cada app declare su propio nombre (labelKey opt-in) para una misma vista compartida, aplicando solo a su propia app sin alterar el nombre global del objeto ni el que ve otra app. Cascada de fallback: labelKey → clave global por objeto → nombre técnico. Cambio aditivo, opt-in y compatible hacia atrás. Propagación completa desde config del mod hasta render: esquema, resolver, tipo GraphQL y cliente; declaración del campo labelKey en el esquema del objeto de app (columna JSON). Funciona igual en vistas compartidas y vistas por rol interno; la ruta de navegación hereda el nombre sin trabajo adicional. Toca core (suite + artefactos sincronizados en object-manager). Cambio Type 3: requiere aprobación de core en PR. Desbloquea UPONE-1616.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | — |
| Modulo principal | core |
| Modulos afectados | — |

## Triage

### Hipotesis

Semilla: H1-H8 del pre-intake (`kb/sp9/UPONE-1645-pre-intake.md`), verificadas contra el codigo real en
`/Users/edobacon/Workspace/uplanner/up1` (el checkout activo; ver Context found). Convergencia por hipotesis:

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Preservar el `labelKey` en la normalizacion server-side y preferirlo en la resolucion de etiqueta produce un nombre por app | ✓ confirmed | 2 capas: `normalizeTab` reconstruye campo por campo y **descarta** claves extra (`suite/logic/app.resolver.js:29-47`); la etiqueta se resuelve hoy como `object.${objectName}` (`suite/composables/useObjectManager.ts:627-633`). El spike lo valido en runtime (menu de Curriculum Design mostro los nombres declarados) |
| H2 | No hay efecto cruzado sobre la otra app que declara el mismo objeto | ✓ confirmed | La clave se declara por entrada de nav en el `app.json` de cada mod y resuelve a una key del namespace i18n propio del mod (`namespace = "{workspace}/{stem}"`, `suite/scripts/lib/i18n-source-map.mjs:5-8`); el spike observo el menu de Engagement sin cambios |
| H3 | La validacion del sync no rechaza la clave extra `labelKey` | ~ partial | `validatePlat15Config` solo exige `typeof tab.object === 'string'` o `Array.isArray(tab.dashboards)`, **tolera props extra** (`object-manager/scripts/sync/dbSync.js:1166-1172`). GAP: confirmar corriendo sync end-to-end (no ejecutable en intake read-only; el spike escribio la config directo en BD) |
| H4 | La ruta de navegacion hereda el nombre sin trabajo adicional | ✓ confirmed | El breadcrumb reutiliza `group.label` ya resuelto por el menu (`suite/composables/breadcrumbTrail.ts:216-219`) |
| H5 | El campo funciona igual en el sistema de vistas por rol interno (`navByRole`) | ~ partial | Estructural: `defaultObjects` y `navByRole` pasan por el **mismo** `normalizeTab` (`app.resolver.js:137,147-155`). GAP: sin validar en runtime con un usuario de rol interno (test/smoke en execute) |
| H6 | Con una clave inexistente, la resolucion cae al nombre tecnico del objeto (comportamiento a corregir) | ✓ confirmed | `translateWithFallback(key, objectName)` cae al `objectName` tecnico (`suite/composables/useObjectManager.ts:630-633`). Es el riesgo que la cascada de fallback (labelKey → `object.<Objeto>` → nombre tecnico) debe mitigar |
| H7 | El sync regenera correctamente las copias de object-manager con el campo nuevo | open | Las copias de OM son generadas desde las fuentes de suite (`suite/logic/app.resolver.js:12-13` header; `object-manager/src/graphql/typeDefs/up1.js` es generado). `assumed`: el spike las parcheo a mano. GAP no resoluble en intake read-only — correr sync y comparar copias vs fuentes en execute |
| H8 | No hay otro consumidor de la interfaz `NavTab` que se rompa al sumar un campo opcional | ~ partial | Los consumidores son helpers puros que tratan los campos como opcionales (`suite/composables/navTabs.ts:15-20,103-168`); existe red de 16 tests (`suite/tests/unit/navTabs.test.ts`). Sumar un campo opcional es aditivo. GAP: typecheck del workspace + correr la suite en execute |
| H9 | El esquema del objeto de app va por detras del resolver: la variante `{object, layouts}` no esta declarada para vistas compartidas y `navByRole` tiene `additionalProperties: false` | ✓ confirmed | En `up1_suite_app.json` `defaultObjects` acepta solo `string` o `{dashboards}` (`:61-77`) aunque `normalizeTab` ya acepta `{object, layouts}` en runtime (`app.resolver.js:37-44`); la variante objeto de `navByRole` declara `additionalProperties: false` (`up1_suite_app.json:87-95`). Declarar `labelKey` en el esquema exige declarar tambien la variante objeto y abrir `additionalProperties` — el eslabon 10 es algo mayor que "opcional cosmetico" |

Leyenda: `✓ confirmed` = evidencia en ≥2 capas o spike runtime · `~ partial` = camino verificado por codigo, falta ejecucion/runtime · `open` = gap no resoluble en intake read-only (marcado `assumed`).

### Context found

**KB / analisis SP9:**

- `kb/sp9/UPONE-1645-detalle.md` — contrato canonico del caso (historia, objetivo, alcance dentro/fuera, criterios de aceptacion, DoD, tests minimos, factores transversales, estimacion 3 SP, guia de reglas y patrones up1). Es la fuente que se mantiene sincronizada con la descripcion del ticket en Jira.
- `kb/sp9/UPONE-1645-pre-intake.md` — guia del implementador (no va a Jira): veredicto y superficie, cadena de 10 eslabones (estado actual del codigo por eslabon), analisis de enfoques A-D, consideraciones de implementacion, hipotesis H1-H8 con su evidencia, frontera core/mod (Aduana), decisiones abiertas/resueltas, archivos candidatos medidos por el spike.
- `kb/sp9/UPONE-1645-explicativo.html` — material educativo/explicativo del caso (soporte del intake).

- **Ubicacion del codigo (correccion sobre el enunciado de la tarea).** El path indicado `/Users/edobacon/Workspace/up1/suite` esta **vacio** (submodulo no checkouteado). El checkout real de la suite y del mod vive en `/Users/edobacon/Workspace/uplanner/up1/suite` — coincide con la nota de memoria "el mod curriculum-design y su entorno de prueba viven en uplanner/up1". Toda la evidencia de arriba se midio ahi. La implementacion en execute debe confirmar sobre que checkout se trabaja.
- **Cadena de 10 eslabones verificada** (pre-intake, seccion "Estado actual del codigo"): eslabones 4 (normalizacion), 5 (tipo GraphQL `NavTab`, `suite/logic/app.schema.graphql:10-15` — hoy sin `labelKey`), 6 (interfaz `NavTab`, `navTabs.ts:15-20`), 7 (query del cliente, `useObjectManager.ts:104-107` pide `kind/object/layouts/dashboards`, no `labelKey`) y 8 (resolucion de etiqueta) son los que necesitan cambio. Los eslabones 5 y 7 son los que el analisis en papel omitio: sin ellos el dato se descarta en silencio.
- **Fuente vs copia sincronizada.** Editar las fuentes en `suite`; las copias en `object-manager` (`src/graphql/resolvers/up1/suite/app.resolver.js` y `src/graphql/typeDefs/up1.js`) se regeneran por sync. El tipo GraphQL es un archivo generado: no revertir con checkout ni editar a mano.
- **Change Type 3 (Core Extension).** Aprobacion de core es gate de **merge**, no de inicio (revision 2026-08-18). El ticket arranca sin luz verde previa.
- **Punto de partida.** Existe un spike en stash (`suite` y `mods/curriculum-design`): "PRECONDICION nombre de vista por app - spike UPONE-1616 (labelKey por entrada de nav)". No se parte de cero.
- **`execute_scope` sugerido para la transicion a execute:** `suite/logic/app.resolver.js`, `suite/logic/app.schema.graphql`, `suite/composables/navTabs.ts`, `suite/composables/useObjectManager.ts`, `object-manager/objects/up1/suite/up1_suite_app.json`, `suite/tests/unit/`. Las copias generadas de OM se tocan solo via sync.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | — |
| Base branch | — |
| DB state | — |
| Services | — |
| Test data | — |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Un stash de spike suele traer solo el idioma con el que se probo (aqui `es`); una NFR de paridad i18n exige verificar el catalogo en los 3 idiomas, no solo el idioma del smoke. La cascada de fallback (labelKey → object.<Objeto>) evita que rompa, pero la capacidad no queda disponible en los idiomas faltantes. Chequear paridad de la clave declarada en execute cuando el ticket declara una NFR i18n. | reviewer (S3.GATE) | 3 | refined | nota de proceso (candidata a rule i18n si recurre) |
| L2 | `normalizeTab` y la resolucion del label son testeables extrayendo helpers puros (`resolveNavGroupLabel`, `buildTabLabelKeys`) a `navTabs.ts` (sin deps Nuxt/Vue) y exportando `normalizeTab` con mock del import de auth. Patron ya usado por PLAT-15 (`layoutRestrictions`). | developer | 1-2 | refined | nota tecnica |
| L3 | El schema del objeto de app se edita en la FUENTE `suite/objects/up1_suite_app.json`, NO en `object-manager/objects/up1/suite/up1_suite_app.json` (esa es copia espejada por fileSync — `SyncManager.targetBasePath=objects/up1`; `object-manager/.ai/COMMANDMENTS.md`: never hand-edit generated). La spec/pre-intake nombraban mal el path fuente; corregido en execute (dredd + pregunta del dev lo destaparon). Regla: en OM, `objects/`, `typeDefs/`, `prisma/` son 100% salida de sync — nunca van como cambio a mano al PR. | dredd + dev | 3 | refined | candidata a rule (fuente vs copia de sync) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

> Esqueleto tentativo (DET-20). `design-feature` lo refina y asigna tasks. Secuencia server-first
> (validar que el campo viaja por la API antes de tocar el cliente), como recomienda el pre-intake.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|----------------|
| S1 | Propagar `labelKey` en el servidor: preservarlo en `normalizeTab` y declararlo en el tipo `NavTab`; declarar la variante objeto + `labelKey` en el esquema del objeto de app | implementation | T2 | Editar `app.resolver.js` (preservar campo), `app.schema.graphql` (campo en `NavTab`), `up1_suite_app.json` (variante `{object, layouts, labelKey}` + abrir `additionalProperties`); unit de preservacion en la normalizacion; introspeccion de la API para confirmar que el campo viaja | quality + self-report | Campo presente en el tipo GraphQL introspeccionado; unit verde de preservacion (incl. forma string legado) |
| S2 | Consumir `labelKey` en el cliente: pedirlo en la query, sumarlo a la interfaz `NavTab` y preferirlo en la resolucion de etiqueta con cascada de fallback (labelKey → `object.<Objeto>` → nombre tecnico); cubrir el tab reservado de dashboards | implementation | T2 | Editar `useObjectManager.ts` (query + preferencia + cascada), `navTabs.ts` (campo en interfaz); unit de preferencia y de fallback con clave inexistente; asegurar que dashboards ignora el campo | quality + self-report | Unit verde de preferencia y fallback; suite de navegacion (16 tests) sin regresion; typecheck del workspace |
| S3 | Verificacion runtime + no regresion + doc: correr sync, declarar `labelKey` en un mod y verificar dos apps que comparten un objeto (una declara, la otra no cambia); cubrir vistas por rol interno (H5) y clave inexistente (H6); documentar la capacidad | verification + docs | T3 | Correr sync (confirma H3/H7), smoke en dos apps del mismo tenant con evidencia, test de `navByRole`, doc de plataforma de la capacidad, verificar sin drift | runtime + quality | Evidencia runtime de los dos menus (efecto no cruzado); sin drift tras sync; doc actualizada |

### Session 1 — 2026-08-21 16:00 — Servidor: propagar labelKey (schema + normalizacion + tipo GraphQL) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Propagar `labelKey` en el servidor: declararlo en el schema del objeto de app (variante objeto en `defaultObjects` + en `navByRole`), preservarlo en `normalizeTab`, declararlo en el tipo GraphQL `NavTab`, con unit de preservacion y confirmacion por introspeccion de la API.

**Tasks completadas**:
- [x] S1.T1 — Declarar variante objeto `{object, layouts?, labelKey?}` en `defaultObjects` y sumar `labelKey` a `navByRole`, con `additionalProperties: false`; actualizar description
- [x] S1.T2 — Preservar `labelKey` en `normalizeTab` (null en string legado y dashboards)
- [x] S1.T3 — Declarar `labelKey: String` (nullable) en el tipo `NavTab` del schema GraphQL fuente
- [x] S1.T4 — Unit de preservacion en la normalizacion (objeto preserva; string legado null; dashboards ignora)
- [x] S1.T5 — Verificar por introspeccion de la API que `NavTab.labelKey` viaja
- [x] S1.GATE — Gate de sync Session 1 (T2): persistir, unit verde + campo introspectable, decidir continue/iterate

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1 servidor approved (dkc-reviewer aislado sonnet): schema additionalProperties:false (DEC-LOCAL-01), normalizeTab preserva labelKey uniforme, tipo NavTab, 6 unit + introspeccion API viva. Suite 72/72 (+6). Hallazgos low de proceso resueltos (tablas Testing). Session 2 (cliente: query + interfaz + cascada 3 niveles).
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-08-21 16:10 — Cliente: consumir y preferir labelKey [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Consumir `labelKey` en el cliente: sumarlo a la interfaz `NavTab`, pedirlo en la query de apps, y preferirlo en la resolucion del label con cascada de 3 niveles (labelKey → object.<Objeto> → nombre tecnico); el tab de dashboards lo ignora. Unit de preferencia, fallback en cascada y aislamiento.

**Tasks completadas**:
- [x] S2.T1 — Sumar `labelKey` opcional a la interfaz `NavTab` del cliente
- [x] S2.T2 — Pedir `labelKey` en la seleccion de campos de la query de apps
- [x] S2.T3 — Mapa `labelKey` por tab + preferencia con cascada `labelKey → object.<Objeto> → tecnico`; excluir dashboards
- [x] S2.T4 — Unit de preferencia, fallback en cascada (clave inexistente → global, no tecnico), aislamiento por tab, dashboards ignora
- [x] S2.GATE — Gate de sync Session 2 (T2): typecheck + suite navegacion sin regresion, decidir continue/iterate

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 cliente approved (dkc-reviewer aislado sonnet): cascada 3 niveles REQ-03 verificada a nivel codigo+test (TC-11/TC-12), aislamiento REQ-04, dashboards REQ-06. Helpers puros extraidos. Suite 83/83, typecheck 0 (re-corridos por orquestador, DET-33). Session 3 (sync + smoke runtime + navByRole + docs).
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-08-21 16:20 — Verificacion runtime + no regresion + docs [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa + smoke)

**Objetivo**: Regenerar los gemelos de object-manager por sync (H7) y confirmar sin drift; declarar labelKey en el mod curriculum-design y verificar en runtime dos apps del mismo tenant (Curriculum Design con nombres declarados, Engagement sin cambios) + breadcrumb heredado (REQ-07); cubrir navByRole (H5) y clave inexistente en runtime (H6); documentar la capacidad.

**Tasks completadas**:
- [x] S3.T1 — Correr sync (regenerar gemelos OM) + drift:check; confirmar campo en las copias, sin drift (H3/H7)
- [x] S3.T2 — Declarar labelKey en curriculum-design; smoke 2 apps mismo tenant (CD con nombres, Engagement sin cambios) + breadcrumb (REQ-07); evidencia runtime
- [x] S3.T3 — Cubrir navByRole (H5) con test; verificar clave inexistente en runtime (H6)
- [x] S3.T4 — Documentar la capacidad (schema description + doc de plataforma nav)
- [x] S3.GATE — Gate T3: evidencia runtime dos menus, sin drift, doc; decidir cierre

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S3 approved (dkc-reviewer aislado, tras iterate): fix bloqueante i18n paridad 3/3 (es/en/pt), + 2 low resueltos (TC-18 reescrito, comentario UPONE-1645). Gemelos OM regenerados por sync:logic sin editar a mano; drift:check UPU NO ERRORS. Smoke runtime es (2 menus sin efecto cruzado + breadcrumb REQ-07); en/pt por paridad+publish+unit deterministicos. Suite 84/84, typecheck 0. Listo para request-close.
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-01, TC-02, TC-03 | unit (schema ajv) | done |
| REQ-02 | TC-04, TC-05, TC-06, TC-07 | unit + introspeccion | done |
| REQ-03 | TC-09, TC-10, TC-11, TC-12 | unit | done |
| REQ-04 | TC-13, TC-16 | unit + runtime | done |
| REQ-05 | TC-18 | unit + estructural | done |
| REQ-06 | TC-08, TC-14 | unit | done |
| REQ-07 | TC-17 | runtime | done |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | Schema acepta variante objeto con labelKey | REQ-01 | unit | schema S1.T1 | validar `[{object,labelKey}]` con ajv | acepta | acepta | ajv 5/5 (S1.T1) | ✅ |
| TC-02 | Schema acepta string legado y objeto sin labelKey | REQ-01 | unit | schema S1.T1 | validar `["Activity"]` y `[{object}]` | acepta | acepta | ajv 5/5 | ✅ |
| TC-03 | Schema rechaza prop con typo (additionalProperties:false) | REQ-01 | unit | schema S1.T1 | validar `[{object,labelKy}]` | rechaza | rechaza | ajv 5/5 | ✅ |
| TC-04 | normalizeTab preserva labelKey en variante objeto | REQ-02 | unit | normalizeTab S1.T2 | normalizar `{object,labelKey}` | labelKey preservada | preservada | appResolverNormalizeTab.test.ts | ✅ |
| TC-05 | normalizeTab objeto sin labelKey → null (backward compat) | REQ-02 | unit | S1.T2 | normalizar `{object}` | labelKey:null | null | idem | ✅ |
| TC-06 | normalizeTab string legado → labelKey null | REQ-02 | unit | S1.T2 | normalizar `"Activity"` | labelKey:null | null | idem | ✅ |
| TC-07 | NavTab.labelKey viaja por la API (introspeccion) | REQ-02 | runtime | API :4000 regenerada | introspeccionar tipo NavTab | campo presente | presente | introspeccion tenant UPU (S1.T5) | ✅ |
| TC-08 | Dashboards → labelKey null (nombre reservado) | REQ-06 | unit | S1.T2 | normalizar `{dashboards}` | labelKey:null | null | appResolverNormalizeTab.test.ts | ✅ |
| TC-09 | labelKey que traduce gana sobre clave global | REQ-03 | unit | resolveNavGroupLabel S2.T3 | resolver con labelKey y global presentes | usa labelKey | "Programa de asignatura" | navTabs.test.ts | ✅ |
| TC-10 | sin labelKey usa object.<Objeto> | REQ-03 | unit | S2.T3 | resolver sin labelKey | usa global | "Actividad" | navTabs.test.ts | ✅ |
| TC-11 | labelKey inexistente cae a global, NO a tecnico | REQ-03 | unit | S2.T3 | resolver labelKey ausente del catalogo, global presente | usa global | "Actividad" | navTabs.test.ts | ✅ |
| TC-12 | sin labelKey ni global → nombre tecnico | REQ-03 | unit | S2.T3 | resolver con catalogo vacio | tecnico | "Activity" | navTabs.test.ts | ✅ |
| TC-13 | aislamiento: 2 apps mismo objeto, distinta labelKey | REQ-04 | unit | S2.T3 | resolver Offering en CD (con labelKey) y Engagement (sin) | distintos | "Sílabos" / "Ofertas" | navTabs.test.ts | ✅ |
| TC-14 | dashboards ignora labelKey (resolucion) | REQ-06 | unit | S2.T3 | resolver isDashboards con labelKey presente | object.Dashboards | "Tableros" | navTabs.test.ts | ✅ |
| TC-15 | runtime: menu CD muestra nombres declarados | REQ-04 | runtime | sync + config mod + i18n (S3) | abrir menu Curriculum Design en UPU | "Programa de asignatura" / "Sílabos" | "Programa de asignatura" / "Sílabos" | smoke browser tenant UPU (S3.T2) | ✅ |
| TC-16 | runtime: Engagement sin cambios (no efecto cruzado) | REQ-04 | runtime | idem, mismo tenant | abrir menu Engagement | "Actividad" / "Ofertas" | "Actividad" / "Ofertas" | smoke browser tenant UPU (S3.T2) | ✅ |
| TC-17 | runtime: breadcrumb hereda el nombre declarado | REQ-07 | runtime | vista Activity de CD | navegar a la vista y leer breadcrumb | "Curriculum Design > Programa de asignatura" | idem | smoke browser (S3.T2) | ✅ |
| TC-18 | navByRole normaliza igual que compartido (H5) | REQ-05 | unit | normalizeTab compartido | normalizar entrada por rol interno | identico a compartido | identico | appResolverNormalizeTab.test.ts (S3.T3) | ✅ |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| suite/tests/unit/appResolverNormalizeTab.test.ts | unit | S1.T4 | REQ-02, REQ-06 (preservacion normalizeTab) | vitest |
| suite/tests/unit/navTabs.test.ts (ampliado) | unit | S2.T4 | REQ-03, REQ-04, REQ-06 (buildTabLabelKeys + resolveNavGroupLabel) | vitest |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| suite unit | `npx vitest run tests/unit` | 66/66 | 84/84 | +18 (nuevos, sin regresion) |
| typecheck | `npx vue-tsc --noEmit` | 0 err | 0 err | = |
| drift OM | `npm run drift:check -- UPU` | — | NO ERRORS | 165 warnings preexistentes ajenos |

## Summary

**PR (core):** https://bitbucket.org/uplanner/suite/pull-requests/239 — `UPONE-1645` → `develop` (rama rebasada sobre origin/develop, diff limpio solo labelKey, sin churn de CI). Un solo commit `58e0338`. Change Type 3: pendiente revision de core para merge.

**Consumidor (mod):** rama `UPONE-1616` en curriculum-design (config/app.json + i18n es/en/pt), PR aparte que mergea despues de 1645.

**object-manager:** salida de sync (objects/typeDefs/prisma), se regenera en CI; NO se hand-commiteo (ver Learn L3).

Ejecucion DKC completa (S1-S3, cada gate con reviewer aislado approve; Dredd aprobable). Falta solo el cierre formal del ticket (status: closed) tras aprobacion/merge — el dev lo dejo en in_progress a proposito.
