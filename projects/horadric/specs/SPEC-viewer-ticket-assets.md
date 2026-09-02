---
id: SPEC-viewer-ticket-assets
project: horadric
ticket: HOR-005
status: done
---

# Visibilizar assets del ticket en horadric-cube (screenshots inline + 3 tabs de draft)

# Visibilizar assets del ticket en horadric-cube (screenshots inline + 3 tabs de draft)

## Purpose

Horadric-cube hoy expone el `.md` del ticket, sessions, flow y commits, pero **no muestra los artefactos que el flujo deckard produce por ticket** (screenshots loose junto al `.md`, `intent.md`/`preview.html`/`data-model.{ext}` dentro de `.draft/`). Esta spec agrega: (a) un hook de markdown-it que envuelve cada `<img>` con thumbnail chip + lightbox modal cuyo caption se extrae del contexto AST (preservando la narrativa del markdown que los referencia), y (b) 3 tabs condicionales de draft en `TicketDetail.vue` con componentes nuevos — sin inventar convenciones de paths (RULE-index-001), consumer-adapts sobre la fuente de verdad que es deckard.

## Requirements

### REQ-IMPROVE-01: Server descubre assets del ticket por pattern + convencion de `.draft/`

El sistema MUST exponer `GET /api/projects/:project/tickets/:ticketId/assets` que devuelve la lista de `TicketAsset` descubiertos en runtime por filesystem: (a) screenshots loose con pattern `{ticketId}-*.{png|jpg|jpeg|webp|svg}` en `tickets/`, (b) `{ticketId}.draft/intent.md` si existe, (c) `{ticketId}.draft/preview.html` si existe, (d) `{ticketId}.draft/data-model.*` si existe.

**Actor**: system
**Layers**: backend

#### Scenario: ticket moderno con draft completo
- **GIVEN** `HOR-005` con `HOR-005-fase1.png` loose + `HOR-005.draft/{intent.md, preview.html, data-model.ts}`
- **WHEN** GET `/api/projects/horadric/tickets/HOR-005/assets`
- **THEN** response 200 con `{ project: 'horadric', ticketId: 'HOR-005', assets: TicketAsset[] }`
- **AND** la lista contiene 4 items: 1 `screenshot`, 1 `draft-intent`, 1 `preview-html`, 1 `data-model`
- **AND** cada item tiene `path`, `filename`, `size` (bytes), `lastModified` (ISO)

#### Scenario: ticket legacy con PNGs sueltos (HOR-001 / HOR-002)
- **GIVEN** `HOR-001` con 13 PNGs loose pattern `HOR-001-*.png` y sin `.draft/`
- **WHEN** GET `.../tickets/HOR-001/assets`
- **THEN** response 200 con 13 items kind `screenshot`, 0 del draft

#### Scenario: ticket sin assets (BLY-001)
- **GIVEN** `BLY-001` sin screenshots loose ni `.draft/`
- **WHEN** GET `.../tickets/BLY-001/assets`
- **THEN** response 200 con `assets: []`

#### Acceptance
El dev accede al endpoint con `curl` y obtiene la lista completa de artefactos del ticket, categorizados por `kind`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Discovery draft completo | HOR-005 con draft + 1 PNG | GET /assets | 4 items | 1 screenshot + 1 intent + 1 preview + 1 data-model |
| 2 | Discovery legacy loose | HOR-001 con 13 PNGs, sin draft | GET /assets | 13 items | todos kind `screenshot` |
| 3 | Ticket vacio | BLY-001 sin assets | GET /assets | `assets: []` | status 200, array vacio |
| 4 | Extensiones mixtas | ticket con `.png` + `.jpg` + `.webp` | GET /assets | 3 items | extension respectiva en cada asset |

---

### REQ-IMPROVE-02: Screenshots inline con lightbox que preserva contexto del markdown

El sistema MUST envolver cada `<img>` generado por el renderer markdown-it en un chip compacto (thumbnail mini + filename + zoom hint) que al click abre un modal lightbox singleton con la imagen full-size y el caption extraido del contexto AST (heading/table-row/list-item padre mas cercano).

**Actor**: user (dev revisando ticket)
**Layers**: frontend

#### Scenario: screenshot dentro de table-row de Testing
- **GIVEN** HOR-002 tab Testing, row de TC-02 que linkea `HOR-002-f1-loader-amber-tones.png`
- **WHEN** el viewer renderiza el markdown
- **THEN** la imagen se muestra como chip `[🖼 HOR-002-f1-loader-amber-tones.png ⤢]` en linea con el texto del TC
- **AND** al click el lightbox abre con: imagen full-size, caption = texto del `<tr>` padre (contenido de la celda `Case` + `REQ`), boton "Abrir en pestaña", cierre con Esc/click backdrop

#### Scenario: screenshot dentro de list-item de Sessions
- **GIVEN** session table con bullet "reviewer · validate · visual · Screenshots: `![...](HOR-002-fix-sessions.png)`"
- **WHEN** el usuario ve el bullet
- **THEN** el chip aparece inline en el bullet
- **AND** el caption del lightbox = texto del bullet completo

#### Scenario: screenshot suelto sin contexto estructural (edge case)
- **GIVEN** una imagen linkeada en un parrafo plano sin heading, tabla o lista padre
- **WHEN** se abre el lightbox
- **THEN** el caption fallback = filename del asset (nunca vacio)

#### Acceptance
El dev abre HOR-002 en el viewer, hace click en el chip de TC-02; ve la imagen full-size con el texto del TC visible como caption; cierra con Esc y sigue leyendo el ticket sin perder scroll position.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Chip inline en table-row | markdown con `<tr><td>![](x.png)</td></tr>` | render | chip en el td | `.ss-inline` con `data-ss-caption` = contenido del `<tr>` |
| 2 | Chip inline en list-item | markdown con `- ![](x.png) desc` | render | chip en li | caption del `<li>` |
| 3 | Lightbox abre con imagen + caption | click en chip | overlay visible | imagen full-size + caption visible + boton external | modal funcional |
| 4 | Lightbox cierra con Esc | lightbox abierto | keydown Esc | modal cerrado | scroll position preservado |
| 5 | Caption fallback a filename | imagen sin contexto estructural | abrir lightbox | caption != vacio | caption = filename |

---

### REQ-IMPROVE-03: Tab "Draft intent" renderiza intent.md con markdown-it

El sistema MUST agregar a `TicketDetail.vue` una tab `Draft intent` (visible solo si `intent.md` existe) que renderiza el contenido con el pipe existente `useMarkdown` (incluyendo syntax highlight, anchors y wireInternalLinks para cross-refs).

**Actor**: user
**Layers**: frontend

#### Scenario: ticket con draft
- **GIVEN** HOR-005 con `.draft/intent.md`
- **WHEN** el usuario abre el ticket
- **THEN** la tab "Draft intent" aparece despues de Commits (con divider visual previo)
- **AND** click renderiza el markdown con headings, tablas, checkbox lists (OQ resueltas)

#### Scenario: ticket sin draft
- **GIVEN** BLY-001 sin `.draft/`
- **WHEN** el usuario abre el ticket
- **THEN** la tab "Draft intent" NO aparece

#### Acceptance
El dev abre HOR-005, ve la tab "Draft intent" en el grupo de tabs separado por divider; la tab renderiza el archivo `intent.md` identico al que abre en su editor.

---

### REQ-IMPROVE-04: Tab "Draft visual" embebe preview.html en iframe con sandbox

El sistema MUST agregar una tab `Draft visual` (visible solo si `preview.html` existe) con un iframe `src="/api/projects/:project/tickets/:ticketId/assets/preview-html/preview.html"` y atributo `sandbox="allow-same-origin allow-scripts"`.

**Actor**: user
**Layers**: frontend + backend (endpoint raw)

#### Scenario: iframe renderiza preview con tokens del proyecto
- **GIVEN** HOR-005.draft/preview.html con Tailwind CDN + tokens amber/stone
- **WHEN** el usuario abre la tab
- **THEN** iframe renderiza el HTML con estilos aplicados (Tailwind CDN ejecuta por `allow-scripts`)
- **AND** los links internos del preview quedan contenidos al iframe (no navegan el viewer — `sandbox` bloquea top-navigation)

#### Scenario: boton "Abrir en pestaña"
- **GIVEN** tab "Draft visual" abierta
- **WHEN** click en "Abrir en pestaña ↗"
- **THEN** nueva pestaña del browser abre la URL `/api/.../assets/preview-html/preview.html` ancho completo

#### Acceptance
El dev valida el preview visualmente en contexto del ticket sin salir del viewer; si necesita revisar en ancho completo, usa el boton external.

---

### REQ-IMPROVE-05: Endpoint raw sirve assets con content-type correcto

El sistema MUST exponer `GET /api/projects/:project/tickets/:ticketId/assets/:kind/:filename` que sirve el archivo raw con Content-Type apropiado (image/*, text/html, text/markdown, text/plain).

**Actor**: system
**Layers**: backend

#### Scenario: sirve screenshot
- **GIVEN** `HOR-002-f1-loader-amber-tones.png` existe
- **WHEN** GET `.../assets/screenshot/HOR-002-f1-loader-amber-tones.png`
- **THEN** response 200 con `Content-Type: image/png` + body = bytes del PNG

#### Scenario: sirve preview.html
- **GIVEN** HOR-005.draft/preview.html existe
- **WHEN** GET `.../assets/preview-html/preview.html`
- **THEN** response 200 con `Content-Type: text/html; charset=utf-8`

#### Scenario: archivo no existe (legacy ticket)
- **GIVEN** BLY-001 sin `.draft/`
- **WHEN** GET `.../assets/draft-intent/intent.md`
- **THEN** response 404

---

### REQ-IMPROVE-06: Tab "Data model" renderiza data-model.{ext} con highlight + mermaid

El sistema MUST agregar una tab `Data model` (visible solo si `data-model.*` existe) que wrapea el contenido en fence segun extension y lo renderiza via `markdown-it` + `highlight.js` + plugin/integration de mermaid (lazy-load).

**Actor**: user
**Layers**: frontend

#### Scenario: data-model.ts con schema + mermaid comment
- **GIVEN** HOR-005.draft/data-model.ts con `erDiagram` en comment block + TypeScript schema
- **WHEN** el usuario abre la tab
- **THEN** codigo TypeScript renderizado con highlight
- **AND** el bloque mermaid del comment extraido y renderizado como SVG inline

#### Scenario: lazy-load mermaid
- **GIVEN** usuario en tab Request (no Data model)
- **WHEN** se inspecciona el network
- **THEN** el chunk de mermaid NO se descarga (dynamic import triggered only al abrir la tab)

---

### REQ-IMPROVE-07: Composable `useTicketAssets` con invalidation + race guard

El sistema MUST proveer un composable Vue `useTicketAssets(projectGetter, ticketIdGetter)` que consume `GET /assets` y cumple RULE-viewer-polling-001: invalida `data.value = null` al cambiar URL y descarta responses cuya URL no coincide con `currentUrl`.

**Actor**: developer (consumer interno)
**Layers**: frontend

#### Scenario: navegacion entre tickets
- **GIVEN** usuario en HOR-001 (13 assets loaded)
- **WHEN** navega a HOR-002
- **THEN** `assets.value = null` durante el fetch
- **AND** al llegar response de HOR-002 se asigna
- **AND** si el fetch de HOR-001 llega tarde, es descartado (race guard por `currentUrl`)

---

### REQ-IMPROVE-08: Tabs de draft condicionales — no aparecen si el asset no existe

El sistema MUST ocultar cada tab de draft (`Draft intent`, `Draft visual`, `Data model`) cuando el asset correspondiente no existe. Si ningun asset del draft existe, el divider visual previo tambien se oculta.

**Actor**: user
**Layers**: frontend

#### Scenario: ticket legacy completo
- **GIVEN** BLY-001 sin draft y sin screenshots loose
- **WHEN** el usuario abre el ticket
- **THEN** las 3 tabs de draft ausentes
- **AND** el divider ausente
- **AND** las 8 tabs originales siguen presentes intactas

---

### REQ-PRESERVE-01: Screenshots inline preservan comportamiento actual si JS desactivado

El sistema MUST degradar graciosamente: el chip inline que envuelve `<img>` se renderiza como `<a>` apuntando a la URL raw del PNG — sin JS, click abre la imagen directamente (comportamiento equivalente al actual).

**Actor**: user
**Layers**: frontend

#### Scenario: degradacion
- **GIVEN** JS desactivado en el browser
- **WHEN** markdown renderiza imagen inline
- **THEN** el chip sigue siendo un `<a href="{raw-url}">` clickable
- **AND** el browser navega al PNG como hoy

---

### REQ-PRESERVE-02: Tabs existentes intactas — sin cambios en sessions/learns/testing/etc.

El sistema MUST preservar las 8 tabs actuales (`request`, `sessions`, `learns`, `testing`, `failed`, `commits`, `backlog`, `summary`) con su comportamiento actual. Los componentes que las renderizan (`MarkdownBody`, `SectionLearns`, `SectionTable`, `CommitsTable`, `FlowDiagram`) no cambian firma publica.

**Actor**: user
**Layers**: frontend

#### Scenario: regression completa
- **GIVEN** HOR-002 antes/despues del cambio
- **WHEN** se compara el render de cada tab
- **THEN** el HTML producido es identico (modulo el hook de imagen, que es REQ-IMPROVE-02)

---

### REQ-PRESERVE-03: Path traversal rechazado en endpoint raw

El sistema MUST rechazar cualquier request a `/assets/:kind/:filename` donde `filename` contenga `..`, `/`, null bytes o resuelva fuera de `DECKARD_ROOT`. Responde 400 (filename invalido) o 403 (path fuera de root).

**Actor**: attacker
**Layers**: backend

#### Scenario: traversal con ..
- **GIVEN** endpoint activo
- **WHEN** GET `.../assets/screenshot/..%2F..%2Fetc%2Fpasswd`
- **THEN** response 400 o 403, nunca 200

#### Scenario: absolute path
- **GIVEN** endpoint activo
- **WHEN** GET `.../assets/screenshot/%2Fetc%2Fpasswd`
- **THEN** response 400 o 403

#### Scenario: null byte
- **GIVEN** endpoint activo
- **WHEN** filename contiene `\0`
- **THEN** response 400

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance (bundle) | Mermaid no infla la app hasta que el usuario abre Data model | Tamaño gzip del chunk inicial `dist/assets/*.js.gz` | delta ≤ +10KB respecto a baseline (el resto se carga via dynamic import) |
| Performance (polling invalidation) | Cambio de ticket no muestra datos del anterior | Tiempo entre `urlGetter` change y `data.value = null` | < 30ms (medicion manual via evaluate_script, replica test HOR-002 session #3) |
| Security | Path traversal imposible | % de payloads maliciosos rechazados | 100% de 5 vectores cubiertos (`../`, abs, symlink fuera root, null byte, UTF overlong) |
| Accessibility | Lightbox navegable por teclado | teclas soportadas | Esc cierra, Tab loopea focus trap, no activa scroll del backdrop |
| Observability | Tests pasando | vitest output | 31 baseline + N nuevos, todos pass |

## Artifacts

### Added

**Files nuevos** (frontend):

| Path | Purpose |
|------|---------|
| `src/composables/useTicketAssets.ts` | Fetch lista de assets con invalidation + race guard (RULE-viewer-polling-001) |
| `src/composables/markdownImageHook.ts` | Plugin markdown-it que transforma token `image` en chip con `data-ss-*` attrs |
| `src/components/assets/ScreenshotLightbox.vue` | Singleton modal — escucha clicks globales sobre `.ss-inline` por event delegation, muestra imagen full-size + caption |
| `src/components/tickets/DraftIntentTab.vue` | Tab render de `intent.md` via `useMarkdown` existente + header con ruta + boton external |
| `src/components/tickets/DraftVisualTab.vue` | Tab con iframe sandbox + boton "Abrir en pestaña" |
| `src/components/tickets/DataModelTab.vue` | Tab con render markdown + mermaid lazy-loaded + syntax highlight |

**Files nuevos** (backend):

| Path | Purpose |
|------|---------|
| `server/routes/assets.ts` | 2 endpoints (list + raw) |
| `server/deckard/assets.ts` | Helper de enumeracion por ticketId (fs glob + stat + kind discriminacion) |

**Types agregados a `shared/types.ts`** (append, no modifica existentes):

```typescript
export type TicketAssetKind = 'screenshot' | 'draft-intent' | 'preview-html' | 'data-model'

interface TicketAssetBase {
  kind: TicketAssetKind
  path: string
  filename: string
  size: number
  lastModified: string
}

export interface ScreenshotAsset extends TicketAssetBase {
  kind: 'screenshot'
  extension: 'png' | 'jpg' | 'jpeg' | 'webp' | 'svg'
}
export interface DraftIntentAsset extends TicketAssetBase { kind: 'draft-intent' }
export interface PreviewHtmlAsset extends TicketAssetBase { kind: 'preview-html' }
export interface DataModelAsset extends TicketAssetBase { kind: 'data-model'; extension: string }

export type TicketAsset = ScreenshotAsset | DraftIntentAsset | PreviewHtmlAsset | DataModelAsset

export interface TicketAssetsListResponse {
  project: string
  ticketId: string
  assets: TicketAsset[]
}
```

**Dep nueva**:

| Package | Version | Reason |
|---------|---------|--------|
| `mermaid` | latest stable (v11+) | Render de diagramas en data-model. Lazy-loaded via dynamic import en `DataModelTab.vue` |

### Modified

| File | Aspecto | Antes | Despues | Por que |
|------|---------|-------|---------|---------|
| `src/views/TicketDetail.vue` | `TABS` array | 8 entries (request..summary) | 8 entries + divider + 3 entries condicionales | REQ-IMPROVE-03/04/06/08 |
| `src/views/TicketDetail.vue` | template | imports y render actuales | + imports de los 3 tab components + `<ScreenshotLightbox>` a nivel raiz | REQ-IMPROVE-02 singleton |
| `src/composables/useMarkdown.ts` | `createRenderer` | 2 plugins (anchor, task-lists) | 3 plugins (+ `markdownImageHook`) | REQ-IMPROVE-02 |
| `server/routes/index.ts` (o equivalente) | registro de rutas | rutas actuales | + mount de `assets.ts` | REQ-IMPROVE-01/05 |
| `package.json` | dependencies | deps actuales | + `mermaid` | REQ-IMPROVE-06 |
| `projects/horadric/config.yaml` | — | ya aplicado en draft v2 commit | `design_system` bloque agregado | OQ-1 (retroactivo) |

### Endpoints

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/api/projects/:project/tickets/:ticketId/assets` | none (local) | — | `TicketAssetsListResponse` | 404 si ticket no existe |
| GET | `/api/projects/:project/tickets/:ticketId/assets/:kind/:filename` | none (local) | — | stream raw con Content-Type | 400 filename invalido, 403 path fuera de root, 404 not found |

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status | Session | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --------- | --- | --- | --- |
| 1 | Capturar baseline: bundle size (`npm run build`) + tests (`npm test`) + documentar en ticket | researcher | — | — | comando ejecutado y output capturado como evidencia | **done** | #3 | — | — | — |
| 2 | F1: helper `server/deckard/assets.ts` — enumera assets por ticketId (screenshots loose + draft/*) con kind discriminacion | developer | #1 | `server/deckard/assets.ts` (nuevo) | unit test cubre los 3 scenarios de REQ-IMPROVE-01 | **done** | #3 | — | — | — |
| 3 | F1: ruta `server/routes/assets.ts` — endpoint `GET /assets` (list) | developer | #2 | `server/routes/assets.ts` (nuevo), `server/index.ts` o equivalente (mount) | integration test `npm test` cubre TC-1/2/3 de REQ-IMPROVE-01 | **done** | #3 | — | — | — |
| 4 | F1: endpoint `GET /assets/:kind/:filename` (raw) con path traversal guard | developer | #3 | `server/routes/assets.ts` | integration test cubre REQ-PRESERVE-03 (5 vectores) + REQ-IMPROVE-05 content-types | **done** | #3 | — | — | — |
| 5 | F2: append tipos a `shared/types.ts` | developer | — | `shared/types.ts` | `npm run type-check` pasa | **done** | #3 | — | — | — |
| 6 | F3: composable `useTicketAssets.ts` con patron RULE-viewer-polling-001 | developer | #5, #3 | `src/composables/useTicketAssets.ts` (nuevo) | unit test con mock de fetch + test de invalidation al cambiar ticketId | **done** | #3 | — | — | — |
| 7 | F4: plugin `markdownImageHook.ts` (extrae caption del AST, agrega `data-ss-caption`) | developer | — | `src/composables/markdownImageHook.ts` (nuevo) | unit test con fixtures: table-row, list-item, paragraph plano (fallback filename) | **done** | #3 | — | — | — |
| 8 | F4: integrar hook en `useMarkdown.ts` via `md.use(markdownImageHook)` | developer | #7 | `src/composables/useMarkdown.ts` | existing specs/rules siguen renderizando igual (regression) + imagenes ahora tienen `.ss-inline` wrapper | **done** | #3 | — | — | — |
| 9 | F4: `ScreenshotLightbox.vue` singleton con event delegation + Esc + focus trap | developer | #8 | `src/components/assets/ScreenshotLightbox.vue` (nuevo), `App.vue` (mount singleton) | componente monta una vez; click en `.ss-inline` abre modal; Esc cierra | **done** | #3 | — | — | — |
| 10 | F5: `DraftIntentTab.vue` | developer | #6 | `src/components/tickets/DraftIntentTab.vue` (nuevo) | render identico al que produce `useMarkdown` sobre intent.md | **done** | #3 | — | — | — |
| 11 | F5: `DraftVisualTab.vue` con iframe sandbox + boton external | developer | #6 | `src/components/tickets/DraftVisualTab.vue` (nuevo) | iframe carga preview.html; boton abre pestaña nueva con URL raw | **done** | #3 | — | — | — |
| 12 | F5: integrar los 3 tabs en `TicketDetail.vue` (condicional + divider) | developer | #10, #11, luego #13 | `src/views/TicketDetail.vue` | tabs aparecen solo si asset existe; legacy tickets intactos; RULE-viewer-polling-001 aplica (watch id → activeTab reset) | **done** | #3 | — | — | — |
| 13 | F6: `DataModelTab.vue` con mermaid lazy-loaded + highlight | developer | #6 | `src/components/tickets/DataModelTab.vue` (nuevo), `package.json` (+ `mermaid`) | tab abre → dynamic import de mermaid → erDiagram renderiza como SVG; codigo TS con highlight | **done** | #3 | — | — | — |
| 14 | Regression: ejecutar `npm test` completo + `npm run build` y comparar bundle size | reviewer | #12, #13 | — | 31 tests originales siguen pass; nuevos tests pass; bundle gzip delta ≤ +10KB para chunk inicial | **done** | #3 | — | — | — |
| 15 | Validacion manual: abrir HOR-001/HOR-002/HOR-005/BLY-001 en el viewer y verificar los 11 REQs con evidencia (screenshots en `tickets/` junto al `.md` — convencion global) | reviewer | #14 | — | cada REQ tiene al menos 1 screenshot de evidencia linkeado en seccion Testing del ticket | **done** | #3 | — | — | — |
| 16 | Actualizar seccion Testing del ticket con test cases finalizados + coverage map real | scribe | #14, #15 | `projects/horadric/tickets/HOR-005.md` | tabla de TCs con status pass/fail/pending; coverage 100% REQs | **done** | #3 | — | — | — |

### Task contract (detalle de rollback + rules por task)

```
Task #1: Capturar baseline
- source_ref: NFR-performance-bundle + NFR-observability
- agent: researcher
- files: —
- precondition: working tree limpio en horadric-cube
- expected_output: output de `npm test` (7 files, 31 tests, Xms) + `npm run build` con sizes documentados en ticket
- validation: comandos ejecutados, output pegado como evidencia
- rollback: N/A (solo lectura)
- rules: [1, 11, 13]  # certeza, KB-first, evidencia

Task #2: Helper server/deckard/assets.ts
- source_ref: REQ-IMPROVE-01
- agent: developer
- files: server/deckard/assets.ts (nuevo)
- precondition: #1
- expected_output: funcion `enumerateAssets(projectRoot, ticketId): TicketAsset[]` con discovery por glob
- validation: unit test en `tests/server/deckard/assets.test.ts` cubre 3 scenarios
- rollback: borrar archivo nuevo (no afecta otro codigo)
- rules: [1, 2, 8, 11, 16]  # certeza, source_ref, rollback, KB-first, propagacion

Task #3: Endpoint /assets (list)
- source_ref: REQ-IMPROVE-01
- agent: developer
- files: server/routes/assets.ts (nuevo), mount en server/index.ts
- precondition: #2
- expected_output: GET /api/projects/:project/tickets/:id/assets devuelve TicketAssetsListResponse
- validation: integration test con fixtures HOR-005 (draft), HOR-001 (loose only), BLY-001 (vacio)
- rollback: revert del mount en index.ts (desactiva endpoint) + borrar routes/assets.ts
- rules: [5, 8, 10, 11, 16]

Task #4: Endpoint /assets/:kind/:filename (raw) + path traversal guard
- source_ref: REQ-IMPROVE-05, REQ-PRESERVE-03
- agent: developer
- files: server/routes/assets.ts (extend)
- precondition: #3
- expected_output: streaming del archivo con content-type correcto; 400/403 para payloads maliciosos
- validation: integration test con 5 vectores (RULE-index-001 obliga)
- rollback: revert commit; endpoint desaparece, viewer falla silenciosamente en tabs nuevas pero ticket basico sigue funcionando
- rules: [5, 8, 10, 11, 16]

Task #5: Tipos en shared/types.ts
- source_ref: REQ-IMPROVE-01, REQ-IMPROVE-07
- agent: developer
- files: shared/types.ts (append)
- precondition: — (paralela a #2-4)
- expected_output: `TicketAsset`, `TicketAssetKind`, variantes, `TicketAssetsListResponse`
- validation: `npm run type-check` sin errores
- rollback: revert append (ningun codigo actual referencia los tipos nuevos todavia)
- rules: [1, 2, 8]

Task #6: useTicketAssets composable
- source_ref: REQ-IMPROVE-07
- agent: developer
- files: src/composables/useTicketAssets.ts (nuevo)
- precondition: #5, #3
- expected_output: composable que consume /assets con invalidation + race guard
- validation: unit test con fetch mock, verifica data.value = null en cambio de ticketId + race descarta response vieja
- rollback: borrar archivo; consumers aun no existen
- rules: [5, 8, 10, 11]  + RULE-viewer-polling-001 obligatoria

Task #7: markdownImageHook plugin
- source_ref: REQ-IMPROVE-02, REQ-PRESERVE-01
- agent: developer
- files: src/composables/markdownImageHook.ts (nuevo)
- precondition: —
- expected_output: plugin que renderiza `<a class="ss-inline" href="{src}" data-ss-caption="{caption}" data-ss-src="{src}"><span class="mini">PNG</span><span class="label">{filename}</span><span class="zoom-hint">⤢</span></a>`
- validation: unit test en `tests/composables/markdownImageHook.test.ts` con 3 fixtures (table-row / list-item / paragraph)
- rollback: borrar archivo
- rules: [1, 2, 8]

Task #8: Integrar hook en useMarkdown
- source_ref: REQ-IMPROVE-02, REQ-PRESERVE-02
- agent: developer
- files: src/composables/useMarkdown.ts
- precondition: #7
- expected_output: `md.use(markdownImageHook)` en createRenderer; specs/rules/decisions siguen renderizando igual salvo las imagenes wrapped
- validation: unit test de useMarkdown: fixtures de markdown con y sin imagenes; regression visual sobre SPEC-viewer-mvp (no tiene imagenes inline → render identico)
- rollback: remover linea `md.use(markdownImageHook)`; el plugin sigue existiendo pero inactivo
- rules: [5, 8, 10, 11, 16]  # propagacion critica — afecta todo el pipe

Task #9: ScreenshotLightbox singleton
- source_ref: REQ-IMPROVE-02
- agent: developer
- files: src/components/assets/ScreenshotLightbox.vue (nuevo), src/App.vue (mount)
- precondition: #8
- expected_output: componente singleton que escucha click delegado sobre `.ss-inline`; al click lee `data-ss-caption` + `data-ss-src`; abre modal; cierra con Esc/click backdrop
- validation: test de componente con @vue/test-utils; verifica apertura, caption visible, cierre con Esc
- rollback: remover mount en App.vue + borrar componente
- rules: [5, 8, 10]

Task #10: DraftIntentTab.vue
- source_ref: REQ-IMPROVE-03
- agent: developer
- files: src/components/tickets/DraftIntentTab.vue (nuevo)
- precondition: #6
- expected_output: componente que toma `project` + `ticketId`, fetchea via useTicketAssets, renderiza intent.md via MarkdownBody + header + external button
- validation: test de render con fixture de intent.md; header muestra path; boton apunta a URL correcta
- rollback: borrar archivo
- rules: [1, 2, 10]

Task #11: DraftVisualTab.vue
- source_ref: REQ-IMPROVE-04
- agent: developer
- files: src/components/tickets/DraftVisualTab.vue (nuevo)
- precondition: #6
- expected_output: iframe con src = `/api/.../assets/preview-html/preview.html` + sandbox `allow-same-origin allow-scripts` + boton external
- validation: test que verifica atributo sandbox correcto + src correcto
- rollback: borrar archivo
- rules: [1, 2, 10]

Task #12: Integrar tabs en TicketDetail.vue
- source_ref: REQ-IMPROVE-08, REQ-PRESERVE-02
- agent: developer
- files: src/views/TicketDetail.vue
- precondition: #10, #11, #13
- expected_output: TABS extendido con 3 entries; divider visual condicional; `<component :is="activeTabComponent" />` routing; watch id resetea activeTab
- validation: test manual sobre HOR-005 (draft completo), HOR-002 (loose only), BLY-001 (vacio); regression sobre las 8 tabs existentes
- rollback: revert del commit del archivo (bien encapsulado)
- rules: [5, 8, 10, 11, 16]

Task #13: DataModelTab.vue + mermaid lazy
- source_ref: REQ-IMPROVE-06
- agent: developer
- files: src/components/tickets/DataModelTab.vue (nuevo), package.json (+ mermaid)
- precondition: #6
- expected_output: tab que fetch data-model file; wrap en fence; render con useMarkdown; si contiene fence `mermaid` O comment-block mermaid, lazy import de `mermaid` y render SVG
- validation: test con data-model.ts fixture (del propio HOR-005.draft); verifica que mermaid chunk no esta en bundle inicial
- rollback: borrar archivo + remove mermaid de package.json (bundle vuelve a baseline)
- rules: [5, 8, 10, 11, 16]

Task #14: Regression completa
- source_ref: todos los REQ-PRESERVE + NFR-performance-bundle + NFR-observability
- agent: reviewer
- files: —
- precondition: #12, #13
- expected_output: npm test = 31 originales + N nuevos pass; npm run build con delta documentado
- validation: outputs capturados y comparados contra baseline de task #1
- rollback: N/A (solo verificacion)
- rules: [4, 7, 13, 14]

Task #15: Validacion manual por REQ
- source_ref: todos los REQ-IMPROVE + REQ-PRESERVE
- agent: reviewer
- files: — (genera screenshots como evidencia)
- precondition: #14
- expected_output: 11 screenshots (uno por REQ minimo) en `projects/horadric/tickets/` con pattern `HOR-005-req-XX-*.png` (convencion global)
- validation: cada REQ tiene screenshot linkeado en seccion Testing del ticket
- rollback: N/A
- rules: [7, 13, 14]

Task #16: Actualizar Testing del ticket
- source_ref: todos los TC declarados
- agent: scribe
- files: projects/horadric/tickets/HOR-005.md
- precondition: #14, #15
- expected_output: Coverage map 100% + tabla de TCs con status real (pass/fail) + evidencias linkeadas
- validation: grep "NOT COVERED" sobre el ticket → 0 resultados
- rollback: N/A
- rules: [2, 13]
```

## Constraints

- **RULE-viewer-polling-001**: Composables con URL dinamica deben invalidar `data = null` y proteger con race guard via `currentUrl`. **Aplica a**: task #6 (`useTicketAssets`) y task #12 (reset de activeTab al cambiar ticketId).
- **RULE-index-001**: Server debe rechazar paths fuera de `deckard_root`. **Aplica a**: task #4 (path traversal guard en endpoint raw). Consumer-adapts: PNGs sueltos legacy no se migran — el server detecta por pattern.
- **RULE-server-frontmatter-legacy-001**: Campos nuevos al frontmatter son opcionales. **Aplica a**: no agregamos campos al frontmatter del ticket — assets se descubren por fs en runtime, no por metadata.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `mermaid` (npm) | external | Render de erDiagram para data-model.md | Bajo — package maduro (+10M dl/week); si se cae al bundlear, F6 tiene alternativa: `mermaid-cli` como fallback (descartado por complexity) |
| Hono framework existente | internal | 2 endpoints nuevos se montan en el mismo router | Bajo — patron ya establecido en `server/routes/` |
| `gray-matter` | internal | Parseo de frontmatter de `intent.md` para mostrar version/approved | Bajo — ya es dep del proyecto |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regression silenciosa en `useMarkdown` afectando render de specs/rules/decisions | medium | high | Task #8 valida explicitamente: unit test con fixtures de antes/despues; Task #14 regression manual sobre SpecDetail y RecordDetailView |
| Path traversal accidentalmente aprobado | low | critical | Task #4 incluye 5 vectores como test obligatorio; RULE-index-001 explicita |
| Iframe sandbox rompe Tailwind CDN de preview.html | medium | medium | Validacion manual en task #11 con preview.html del propio HOR-005 antes de integrar (task #12); si falla: cambiar a `allow-scripts allow-same-origin` (ya es la propuesta) o pre-compilar tokens |
| Mermaid bundle infla inicial | medium | medium | Task #13 obliga lazy-load via dynamic import; task #14 verifica chunk separado |
| Caption extraction pobre en edge cases (imagen sin contexto estructural) | medium | low | Task #7 incluye fallback a filename; iteracion durante execute si se detecta en task #15 |
| Nueva dep `mermaid` rompe `npm install` en CI | low | medium | Task #13 valida `npm install` limpio + `npm run build` antes de continuar |

## Open questions

- [ ] **OQ-4** (diferida del draft) — `markdown-it-mermaid` vs `mermaid` directo. **Resolver en task #13**: evaluar primero `markdown-it-mermaid` (si maintained y compatible con `markdown-it@14`), sino `mermaid` directo con integracion custom en `DataModelTab.vue`. Decision se registra como DEC-LOCAL al completar la task.

## Decisions

### DEC-LOCAL-01..07 (heredadas del ticket HOR-005)

Ver `projects/horadric/tickets/HOR-005.md` seccion Sessions. Sumario:

- **DEC-LOCAL-01..04**: screenshots por pattern discovery (no subdir) + iframe B3 + markdown-it + mermaid para data-model + intent.md via `MarkdownBody` existente.
- **DEC-LOCAL-05**: HOR-005 no modifica deckard-core.
- **DEC-LOCAL-06**: Screenshots sin tab dedicada — render inline + lightbox.
- **DEC-LOCAL-07** (bloque de 6 OQs resueltas): `design_system` agregado al config, iframe sandbox `allow-same-origin allow-scripts`, 3 tabs de draft con divider, mermaid diferido a F6, spec nuevo (esta spec), caption del lightbox = padre mas cercano.

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Tickets con draft que muestran preview.html en viewer | 0% (feature no existe) | 100% | visual inspection de HOR-005 post-deploy |
| Screenshots con lightbox funcional | 0 | todos los que el markdown linkea | click sobre chip en HOR-002 Testing tab |
| Tests totales pasando | 31 | 31 + N (tentativo: 20+ tests nuevos) | `npm test` output |
| Bundle size gzip inicial | baseline en task #1 | +≤10KB | `npm run build` output |
| Path traversal payloads rechazados | N/A | 100% (5/5) | test suite de task #4 |

## Technical reference

**Deckard source-of-truth referenciada**:
- `prompts/steps/design-draft.md:43` — estructura de `.draft/` (intent + preview + data-model)
- `prompts/steps/design-draft.md:96-104` — tabla `schema_language` → extension
- `prompts/steps/design-draft.md:116-127` — mermaid como comment block en data-model
- `prompts/steps/design-draft.md:140` — preview.html desde `templates/outputs/preview-base.html`
- `~/.claude/CLAUDE.md:39` — screenshots loose junto al `.md`

**Baseline horadric-cube (capturado 2026-04-22)**:
- `npm test`: 7 test files, 31 tests, 575ms, todos pass
- Deps actuales: `markdown-it@14.1.0`, `markdown-it-anchor@9.2.0`, `markdown-it-task-lists@2.1.1`, `highlight.js@11.10.0`, `hono@4.6.12`, `@hono/node-server@1.13.7`, `gray-matter@4.0.3`, `better-sqlite3@11.7.0`, `simple-git@3.27.0`
- No tiene: `mermaid`, `markdown-it-mermaid`, plugins de imagen

**Archivos clave a tocar**:
- [`src/views/TicketDetail.vue:39-48`](../../../../horadric-cube/src/views/TicketDetail.vue) — TABS actual
- [`src/composables/useMarkdown.ts:43-62`](../../../../horadric-cube/src/composables/useMarkdown.ts) — createRenderer
- [`server/`](../../../../horadric-cube/server/) — routes/, middleware/, deckard/

## Rules discovered

- [RULE-viewer-assets-context-001](../rules/viewer/RULE-viewer-assets-context-001.md) — Assets binarios se exponen inline con su contexto narrativo, nunca en galeria aislada. Promovida desde L2 al cerrar HOR-005.

## Bugs found

{se llena si aplica}

## Acceptance checkpoints

- [ ] **Funcional**: los 8 REQ-IMPROVE + 3 REQ-PRESERVE con todos sus scenarios pass (evidencia en task #15)
- [ ] **Tests**: 31 baseline + ≥20 nuevos pass; 0 tests rotos
- [ ] **NFRs**: bundle delta ≤ +10KB gzip; path traversal 100%; polling invalidation < 30ms
- [ ] **Rules**: RULE-viewer-polling-001 aplicada en task #6; RULE-index-001 en task #4
- [ ] **Integration**: SpecDetail + RecordDetailView + RecordsListView siguen renderizando identico (regression task #14)
- [ ] **Docs**: ticket HOR-005 con Testing al dia + seccion Summary llenada en close
