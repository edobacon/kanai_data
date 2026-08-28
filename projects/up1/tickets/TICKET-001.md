---
id: TICKET-001
project: up1
type: ticket
status: closed
work_type: implement
module: mods
autopilot: manual
---

# Crear mod study-notes end-to-end como POC del pipeline

## Request

Crear un mod minimal (study-notes) que ejercite todo el flujo de desarrollo de mods en uP1: objeto, resolver custom, componente Vue, layouts JSON, capabilities RBAC, i18n, seeds, tests unitarios y validacion visual. El objetivo es probar que el pipeline completo funciona, no el valor funcional del mod.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | single |
| Modulo principal | mods |
| Modulos afectados | core (codegen), layout (componente sync), suite (i18n, css sync) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Complejidad media (5-7 tasks) | confirmed | 10 tasks definidas, todas completadas en 1 sesion |

### Context found

- **6 rules** del modulo mods: sync obligatorio, resolver pair, const name, extend type, composable scoping, no modificar synced
- **0 bugs** abiertos en mods
- **24 specs** de referencia: guia creacion, recetas LLM, ejemplo engagement, internals, objects-map
- **5 meta-specs**: JSON Object, GraphQL Resolver, Vue Component, Layout Config, Mod
- **Warnings**: ninguno — mod nuevo, no modifica codigo existente

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | feature/study-notes-poc (no creada — POC en working directory) |
| Base branch | develop |
| DB state | PostgreSQL local, tenants UPU y TEST activos |
| Services | object-manager (:4000), suite (:3000), redis (:6379) via up1-start.sh |
| Test data | 3 notas creadas via GraphQL createInstance con storybook token |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | app.json va en config/app.json (singular), no en config/apps/. Formato: name, label, icon (SVG inline), iconBg, order, tenants[], version, defaultObjects[]. No usa applicationId/objectName/layoutName como sugiere la documentacion de mods. Referencia: retention-wellbeing/config/app.json | developer | — | refined | RULE-mods-007 |
| L2 | Layouts JSON requieren campos id y name (ademas de layoutName), tenants[] para indicar en que tenants se insertan, y las columns usan key (no field) como nombre del campo. Sin tenants[], el layout no se inserta en la BD del tenant y la app no aparece en el sidebar. | developer | — | refined | RULE-layout-010 |
| L3 | El CRUD de objetos es generico: mutations son createInstance(objectType, data), updateInstance(objectType, id, data), deleteInstance(objectType, id). No se generan mutations por objeto (no existe createStudyNote). Lo mismo para queries: getInstance, getInstances con objectType como parametro. | developer | — | refined | RULE-core-008 |
| L4 | Los labels de columnas en RecordList se toman del campo label del JSON de layout directamente como texto, no como keys i18n. El sistema i18n aplica a nivel de app/sidebar (app.json label) y a labels del RecordDetail schema, pero las columnas del RecordList muestran el valor literal del label del JSON. | developer | — | refined | RULE-layout-011 |
| L5 | El boton 'Crear registro' en RecordList abre un modal con el default create layout auto-generado por la plataforma, no el RecordDetail custom del mod. Los labels del create form vienen del title de cada campo en el JSON object definition (ingles). Para personalizar el create form se necesita un layout RecordDetail con mode: create y applicationId que lo vincule. | developer | — | refined | RULE-layout-012 |
| L6 | Los prompts de execute y close instruyen al LLM a registrar con MCP tools, pero sin gates bloqueantes el LLM salta el registro para enfocarse en implementacion. TICKET-001 cerro con 8 secciones vacias. Fix: gates bloqueantes en intake (paso 10), execute (paso E), y close (paso 10) que fuerzan verificar el markdown antes de avanzar. | developer | — | discarded | — |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| 1 | app.json en config/apps/study-notes-app.json con formato applicationId/objectName/layoutName | Sync Phase 6 no lo reconocio. Formato real es config/app.json singular con name/label/tenants | L1 → RULE-mods-007 |
| 2 | Layout columns con campo "field" en vez de "key" | RecordList no renderizo columnas. El campo correcto es "key" | L2 → RULE-layout-010 |
| 3 | Mutation createStudyNote para crear registros | No existe. CRUD es generico: createInstance(objectType: "StudyNote", data) | L3 → RULE-core-008 |

## Sessions

### Session #1 — 2026-04-15

| Timestamp | Agent | Action | Reference | Detail |
|-----------|-------|--------|-----------|--------|
| 12:30 | researcher | gather-context | RULE-mods-* | 6 rules, 24 specs, 0 bugs del modulo mods |
| 12:32 | architect | design | SPEC-mods-study-notes | Spec aprobado: 5 REQs, 10 tasks, 10 constraints |
| 12:35 | developer | implement | Task #1 | Scaffold: package.json, capabilities.json, vitest.config.js |
| 12:36 | developer | implement | Task #2 | Objeto StudyNote.json |
| 12:37 | developer | implement | Task #3 | Resolver studyNoteStatsByCategory (.resolver.js + .schema.graphql) |
| 12:38 | developer | implement | Task #4 | Componente CategoryBadge (Vueform element) |
| 12:38 | developer | implement | Task #5 | Layouts JSON (list, view) + app.json |
| 12:39 | developer | implement | Task #6 | i18n es.json + en.json (17 keys) |
| 12:39 | developer | implement | Task #7 | Seed con 5 notas |
| 12:40 | developer | implement | Task #8 | Tests unitarios: 12/12 passed |
| 12:40 | developer | implement | Task #10 | CSS tokens (1-theme, 2-objectName) |
| 12:42 | developer | validate | npm test | 12/12 passed (vitest) |
| 12:45 | developer | validate | npm run sync | Sync 3/3 ok (object-manager, layout, suite) |
| 12:49 | reviewer | validate | Playwright | RecordList vacia + app en sidebar |
| 12:50 | developer | learn-captured | L1 | app.json formato incorrecto → fix → re-sync |
| 12:52 | developer | learn-captured | L2 | Layouts necesitan id, name, tenants, key |
| 12:55 | reviewer | validate | Playwright | RecordList con 3 registros, columnas, paginacion |
| 12:56 | developer | learn-captured | L3 | CRUD generico createInstance |
| 12:57 | developer | learn-captured | L4-L5 | Labels RecordList texto directo + create form auto-generado |
| 13:00 | developer | implement | Layout create | default_StudyNote_create.json con labels en espanol |
| 13:04 | reviewer | validate | Playwright | Create form en espanol con placeholders |
| 13:05 | reviewer | validate | GraphQL | studyNoteStatsByCategory retorna {general:1, exam:1, project:1} |
| 13:10 | scribe | close | TICKET-001 | 5 learns refinados → 5 rules. Ticket closed |

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-01 (sync), TC-02 (codegen), VV (CRUD) | auto + visual | COVERED |
| REQ-02 | TC-03 (resolver unit), VV (GraphQL query) | auto + visual | COVERED |
| REQ-03 | TC-05 (RecordList), TC-06 (RecordDetail) | visual | COVERED |
| REQ-04 | VV (labels espanol sidebar + create form) | visual | COVERED |
| REQ-05 | TC-01 (sync), TC-02 (codegen), TC-04 (config), npm test | auto | COVERED |

### Test cases

| # | Case | REQ | Type | Expected | Actual | Status |
|---|------|-----|------|----------|--------|--------|
| TC-01 | npm run sync 3/3 | REQ-05 | auto | 3 workspaces ok | 3/3 success | pass |
| TC-02 | npm run codegen genera StudyNote | REQ-05 | auto | model StudyNote en schema.prisma | Presente en 4 tenants | pass |
| TC-03 | Resolver stats agrupa por categoria | REQ-02 | auto | [{category, count}] | 2 tests passed | pass |
| TC-04 | Config validation (capabilities, layouts, object, i18n, app) | REQ-05 | auto | Formatos correctos | 10 tests passed | pass |
| TC-05 | RecordList muestra notas con columnas | REQ-03 | visual | 3 registros, 4 columnas, paginacion | Screenshot vv-12 | pass |
| TC-06 | Create form con labels espanol | REQ-04 | visual | Titulo, Contenido, Categoria, Prioridad en espanol | Screenshot vv-13 | pass |
| TC-07 | Resolver GraphQL retorna stats | REQ-02 | visual | general:1, exam:1, project:1 | Respuesta JSON correcta | pass |
| TC-08 | App visible en sidebar | REQ-03 | visual | "Notas de Estudio" en modal de apps | Screenshot vv-06 | pass |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| tests/unit/resolvers/studyNoteStats.test.js | unit | #8 | REQ-02 | vitest |
| tests/unit/config/validation.test.js | unit | #8 | REQ-05 | vitest |
| screenshots/vv-06-all-apps-with-study-notes.png | visual | #9 | REQ-03 | playwright |
| screenshots/vv-12-record-list-with-data.png | visual | #9 | REQ-03 | playwright |
| screenshots/vv-13-create-form-spanish.png | visual | #9 | REQ-04 | playwright |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| study-notes unit | cd mods/study-notes && npx vitest run | n/a (mod nuevo) | 12/12 passed | +12 tests |
| npm run sync | npm run sync | 3/3 workspaces | 3/3 workspaces | sin regresion |

## Summary

Mod `study-notes` creado como POC del pipeline end-to-end. 10 tasks completadas, 15 archivos creados, 12 tests unitarios (100% pass), validacion visual con Playwright confirmando app en sidebar, RecordList con datos, create form en espanol, y resolver custom GraphQL. 5 learns capturados y promovidos a rules que mejoran el KB para futuros mods. 2 bugs encontrados y corregidos en el server Deckard (dkc_update_status y dkc_promote_learn no actualizaban el markdown).
