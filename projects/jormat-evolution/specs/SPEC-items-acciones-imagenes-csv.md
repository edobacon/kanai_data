---
id: SPEC-items-acciones-imagenes-csv
project: jormat-evolution
ticket: JOR-107
status: in_progress
---

# SPEC-items-acciones-imagenes-csv — Items sin placeholders (detalle + listado)

# SPEC-items-acciones-imagenes-csv — Items sin placeholders (detalle + listado)

## Executive summary — lo que estas aprobando

1. **Que se quiere**: que items (listado Y detalle) **deje de trabajar con placeholders y accione de verdad**, tomando como referencia el legacy. Hoy los datos son reales (JOR-081/083) pero las acciones del detalle son `toast('no implementado')`, el soporte de imagenes es stub, y el CSV masivo (import/export completo) no existe.

2. **Decisiones criticas** (defaults de autopilot, `inferred` con evidencia; el dev puede overridear en el review/close):

| Decision | Eleccion | Evidencia (source_ref) |
|----------|----------|------------------------|
| Pagina completa de ficha (`Ver ficha`) | **implementar** ruta `/inventario/items/[id]` (deep-link) | maqueta `ongoing/05-items-visualizar.md` ("Ver ficha abre vista completa") |
| Tabla de archivos | **generica polimorfica `attachments`** (owner_type/owner_id), NO `item_images` | legacy adjunta en items + import-registration + staff (multi-modulo) |
| Etiqueta + selector de bodega | etiqueta **client-side**; el selector **se mantiene** (lo alimenta); sin codigo de barras (deuda si se pide) | `itemsDetailController.js:260-286`, `items-detail.html:478-500` |
| Impresion | **client-side** (`window.print` sobre vista HTML), no PDF de backend | `print-item.html`, `itemPrint` legacy |
| Storage | **local + volumen Docker** interino; S3/R2 despues (misma interfaz) | DEC-007; `storage.service.ts` |
| Acceso a imagenes | **bajo auth via URL firmada** (HMAC + exp), sin estatico publico (override del dev) | endpoint guardado + `UPLOADS_SIGNING_SECRET` |
| Compartir | **Web Share API** nativa + fallback copiar link (feature nueva) | no existe en legacy |

3. **Riesgos principales y mitigacion**:
   - *S4 (imagenes) toca DB + infra + storage* → migracion + volumen + e2e; es la session mas riesgosa, se aisla.
   - *Regresion de RBAC por campo* (lo que paso en JOR-084/103) → todo lo que exponga costo/margen se testea con y sin la capability.
   - *Export "solo la pagina"* hoy engana → REQ explicito de exportar el filtrado completo.

4. **Que NO se hace** (deuda, fuera del spec): en transito, relacionados, facturar/cotizar/wishlist, historial/kardex, Precio Minimo (RBAC), WooCommerce, exports CSV especializados (reportes → Banda 6), etiqueta-PDF server con codigo de barras.

5. **Tamano**: 6 sessions (~46-54 SP). Fullstack en S3 (falla), S4 (imagenes), S5 (import CSV); el resto front sobre backend ya real.

6. **Como se sabe que funciona**: ningun boton de items dispara `toast('no implementado')`; imagenes persisten (sobreviven rebuild via volumen); import crea items en lote con reporte de errores; export baja el filtrado completo; suites verdes; gate del merge se mantiene (branches ≥89, resto ≥90).

## Purpose

Cerrar la deuda de acciones/placeholders de items (detalle + listado) que dejaron JOR-081 (backend en DB) y JOR-083 (detalle FE-1), homologando la UI y agregando las piezas fullstack faltantes (imagenes reales, import/export CSV). Referencia campo-a-campo y evidencia legacy en `jormat_docs/legacy/front/migracion/ticket-items-acciones-detalle.md`.

## Estado actual / Baseline

- Detalle (`ItemDetailModal`): datos DB reales; acciones Imprimir/Duplicar/Compartir/Ver-ficha = `toast.info('no implementado')`; "IMPRESION RAPIDA" e "Imprimir" comparten `onPrint`; Editar duplicado en media-card y footer; selector de bodega muerto; seccion "En transito" hardcode.
- Imagenes: `StorageService.store` valida pero NO escribe a disco ni persiste (stub DEC-007); `POST /:id/images` no asocia en DB (`DEUDA_TECNICA[items] imagenes`). Sin volumen de uploads en Docker.
- CSV: import inexistente; export (`handleExport`) baja solo la pagina visible (8 columnas).

## Delta

- **Antes**: acciones placeholder, imagenes stub, sin import CSV, export parcial.
- **Despues**: 9 acciones reales + homologacion; imagenes persistidas (tabla `attachments` + storage a disco + volumen); import CSV con plantilla; export del filtrado completo.
- **Se toca**: front `components/items/*` + `app/(app)/inventario/items/*` + `services/api/inventario` + `lib/csv`; backend `items/*` + `storage/*` + `migrations/`; `docker-compose*.yml`; docs.
- **NO se toca**: modulos ventas/compras/pagos; logica de calculo de items; lo listado en "que NO se hace".

## Requirements

### REQ-01: Clonar/Duplicar crea un registro nuevo
> **Que cambia**: el boton Duplicar deja de ser placeholder y crea un item nuevo precargado desde el actual.
> **Por que**: legacy `cloneItem` (`itemsDetailController.js:220`) navegaba al alta con los datos.

MUST: al Duplicar, precargar el form de alta con los datos reales del item (reusa `itemDetailToFormValues`) y permitir guardar un item **nuevo** (id distinto, sin sobrescribir el original).

### REQ-02: Compartir usa Web Share API
MUST: Compartir invoca `navigator.share({title,text,url})` con el link de la ficha; si no esta disponible, **fallback** a copiar el link al portapapeles.

### REQ-03: Ver ficha abre la pagina completa
> **Que cambia**: "Ver ficha" navega a una ruta con URL propia; NO descarga PDF.

MUST: existe la ruta `/inventario/items/[id]` (deep-link/bookmark) que renderiza el detalle reusando los componentes del modal; "Ver ficha" navega ahi. NO genera PDF (eso es Imprimir).

### REQ-04: Impresion Rapida (ficha) client-side
MUST: "Impresion Rapida" abre una vista print (imagen + detalles del item) y dispara `window.print()`; el navegador la visualiza e imprime/guarda como PDF. Replica `print-item.html` legacy. Sin backend.

### REQ-05: Imprimir Etiqueta client-side, alimentada por el selector de bodega
> **Que cambia**: el selector de bodega deja de estar muerto; alimenta la etiqueta.

MUST: "Imprimir Etiqueta" arma un label (item + codigo + referencias + **bodega/ubicacion seleccionada**) y dispara `window.print()`; el selector se pobla con `stockPorBodega` (bodegas del item). Sin backend. (Codigo de barras = deuda.)

### REQ-06: Homologacion de botones (sin duplicados)
MUST: no hay botones duplicados (Editar/Imprimir una sola vez). Set unico: media-card = acciones del item (Impresion Rapida, Imprimir Etiqueta, Editar, Duplicar, Compartir); footer = selector de bodega + Ver ficha + Cerrar. Impresion Rapida e Imprimir Etiqueta son **distintas** (no comparten handler).

### REQ-07: Activar/Desactivar falla persiste y refleja en el listado
MUST: `PATCH /inventario/items/:id/failure` togglea `items.failure` (la columna existe), gate `items.parts:edit`; el detalle muestra el toggle y el **listado refleja el estado** (color de fila).

### REQ-08: Soporte real de imagenes (attachments + storage + volumen, servidas bajo auth via URL firmada)
> **Que cambia**: las imagenes se guardan de verdad (disco + DB), sobreviven rebuilds y **NO son accesibles publicamente**: se sirven por URL firmada efimera, nunca por estatico publico.

MUST: (a) tabla generica `attachments` (workspace_id, owner_type, owner_id, storage_key, filename, mimetype, size, principal, orden, created_at) — `storage_key` es la clave interna de almacenamiento (ej. `items/{uuid}.jpg`), **NO** una URL publica; (b) `StorageService` como **driver seleccionable por env** (`STORAGE_DRIVER`, default `local`): el driver `local` **escribe/borra en `/app/uploads`** (sin `ServeStatic` publico) y su lectura genera la URL firmada de (e); el driver `azure-blob` queda como **seam documentado** (interfaz + no-impl que falla explicito si se selecciona sin credenciales) a implementar cuando infra provisione — con blob la lectura devuelve un SAS y el `<img src>` va directo a Blob. La eleccion del driver es transparente para el front (siempre consume `attachment.url`); (c) **volumen Docker** `jormat_uploads` montado en `/app/uploads` en ambos compose; (d) `POST /:id/images` persiste (owner_type='item') y `DELETE` borra fila+archivo; (e) `findById`/lectura de adjuntos devuelve por cada imagen una **URL firmada** (HMAC + expiracion corta) que apunta a la ruta binaria del front, no la clave interna; (f) endpoint de descarga en un **controller propio SIN `AuthGuard`** (`GET /inventario/items/:id/images/:attachmentId?sig=...&exp=...`) que se autentica **solo por la firma**: valida firma+expiracion+workspace del token antes de streamear (`StreamableFile`) — ausente/invalida/expirada responde 401/403 (el `<img>` no manda Bearer, por eso NO puede colgar del `items.controller` guardado); (g) **ruta Next binaria dedicada** `/api/uploads/[...]` que streamea los bytes intactos (NO `.text()`, para no corromper binarios como hace el `/api/proxy` compartido) y reenvia `?sig&exp`; (h) front usa la URL firmada directo en `<img src>` (sube y muestra galeria real). Cierra `DEUDA_TECNICA[items] imagenes`.

<details><summary>Scenario</summary>

- GIVEN un item con imagen, WHEN el detalle pide sus adjuntos, THEN la API devuelve URLs firmadas con expiracion corta; el `<img src>` carga la imagen mientras la firma es vigente.
- GIVEN una URL de imagen con firma ausente/invalida/expirada, WHEN se solicita, THEN la API responde 401/403 (nunca sirve el binario). No hay ruta estatica publica a `/uploads`.
- GIVEN una imagen subida, WHEN `docker compose up --build`, THEN el archivo sigue en disco (volumen) y la nueva URL firmada la sirve.
</details>

### REQ-09: Import CSV (carga masiva) con plantilla y reporte
MUST: endpoint `POST /inventario/items/import` que parsea el CSV, **valida por fila**, crea los validos en lote (repo de JOR-081, con `workspace_id`) y **reporta las filas con error sin abortar** las validas. Front: dialog de carga + **plantilla descargable** + reporte de errores.

### REQ-10: Export CSV del filtrado completo
> **Que cambia**: el export deja de bajar solo la pagina visible.

MUST: exportar **todo el resultado filtrado** (no solo la pagina server-paginada) + opcion "exportar todo"; el costo/margen en el CSV va **gateado por RBAC**.

### REQ-PRESERVE-01: Sin regresion, sin placeholders vivos (DET-7)
MUST: 0 tests fallidos; el gate del merge se mantiene (stmts/funcs/lines ≥90, branches ≥89); ningun boton de items dispara `toast('no implementado')`; lo FUERA se remueve o queda deshabilitado con `DEUDA_TECNICA` (nada mintiendo).

### REQ-DOCS-01: Docs de todo lo implementado (DET-37)
MUST: endpoints nuevos (falla/imagenes/import + descarga por URL firmada) en el catalogo de API; tabla `attachments` en data-model; volumen Docker + secreto de firma (`UPLOADS_SIGNING_SECRET`) + TTL + `STORAGE_DRIVER` (contrato de env + que exigira el driver `azure-blob` en prod) en infraestructura/configuracion; rutas/vistas nuevas y formato de plantilla CSV; decisiones (tabla generica, storage driver por env, imagenes bajo auth via URL firmada) en el KB. Follow-up documentado: implementar el driver `azure-blob` + provisioning de infra.

## Artifacts (necessity + reuse — DET-32)

| Artifact | Veredicto | Racional |
|----------|-----------|----------|
| Tabla `attachments` (generica) | **build** | no existe; polimorfica para reuso cross-modulo (items/factura/staff) en vez de `item_images` puntual |
| `StorageService` driver por env (local impl + azure-blob seam) | **reduce** (extiende el existente) | la interfaz ya existe (DEC-007); se agrega seleccion por `STORAGE_DRIVER` + driver local a disco; blob como seam (DEC-LOCAL-05) |
| Firma de URLs + endpoint de descarga sin AuthGuard (firma-only) | **build** | requerido por DEC-04 (auth, sin estatico publico); HMAC+exp; controller propio porque el `<img>` no manda Bearer |
| Ruta Next binaria `/api/uploads/[...]` | **build** | el `/api/proxy` compartido corrompe binarios (`.text()`); ruta dedicada streamea intacto, sin tocar el proxy de todo el trafico |
| Volumen Docker `jormat_uploads` | **build** | no hay volumen de uploads; requerido para persistir |
| Endpoint `PATCH /:id/failure` | **build** | la columna existe; falta el write (patron JOR-081) |
| Endpoint `POST /items/import` | **build** | no existe; carga masiva |
| Ruta `/inventario/items/[id]` | **build** | no existe (solo `/editar`) |
| Vistas print (rapida + etiqueta) | **build** front | replican `print-item.html` client-side |
| Clonar / Compartir / Export completo | **reduce** | reusan `itemDetailToFormValues`, `navigator.share`, `lib/csv` existentes |
| Galeria de imagenes | **reuse** | `ImageGalleryUploader` ya existe (JOR-106 lo testeo) |

## Decisions (cerradas por autopilot, `inferred`; overridables)

- **DEC-LOCAL-01 — tabla generica `attachments`** (no `item_images`): evidencia de archivos multi-modulo en legacy (items/import/staff). Alternativa descartada: tabla por-modulo (duplica, no escala).
- **DEC-LOCAL-02 — pagina completa de ficha**: implementarla (la maqueta la pedia). Alternativa: modal-only (descartada, pierde deep-link).
- **DEC-LOCAL-03 — impresion client-side** (rapida y etiqueta): sin backend; el label base no requiere codigo de barras (deuda si se pide). Alternativa: PDF server (mas costo, no aporta hoy).
- **DEC-LOCAL-04 — imagenes bajo auth via URL firmada** (override del dev, `confirmed`): NO se sirve `/uploads` como estatico publico. Cada lectura de adjunto devuelve una URL firmada (HMAC + expiracion corta) que un endpoint de descarga valida antes de streamear desde disco. Alternativas descartadas: estatico publico (rechazado — exposicion), blob-fetch autenticado en el front (mas complejidad de object URLs), cookie httpOnly en el proxy (cambia la auth de todo el proxy). Requiere secreto de firma en env (`UPLOADS_SIGNING_SECRET`) y definir el TTL.
- **DEC-LOCAL-05 — storage driver seleccionable por env** (`confirmed`, supersede parcial de DEC-007): el runtime real de prod es K8s/ArgoCD (Azure), donde disco local + volumen compose NO persiste ni sirve a multi-replica. En vez de comprometer un backend ahora, `StorageService` selecciona driver por `STORAGE_DRIVER` (default `local`). Se implementa el driver `local` completo (dev/staging funcional) y se deja el `azure-blob` como seam (interfaz + config point). **Honestidad de alcance**: el driver `azure-blob` es codigo + secreto de infra pendientes (follow-up acotado); el flag localiza ese cambio a una clase de driver + env, no lo hace gratis. Alternativas descartadas: Azure Blob ahora (bloquea por dependencia de infra no lista), PVC RWX (requiere cambios en el repo argocd externo). Reversibilidad: la que DEC-007 anticipaba, ahora explicita.

## Constraints

- Aislacion de tenant: todo query/insert nuevo filtra/incluye `workspace_id` (RULE-global critical).
- Imagenes NO publicas: sin `ServeStatic` a `/uploads`; solo servidas por URL firmada (HMAC + expiracion) validada en un endpoint guardado. Secreto en env (`UPLOADS_SIGNING_SECRET`), **TTL = 5 min** (renovable en cada lectura de `findById`).
- Storage por driver seleccionable: `STORAGE_DRIVER` (default `local`). Prod real es K8s/ArgoCD (Azure): disco local NO persiste ni sirve multi-replica → `azure-blob` es el driver de prod (seam ahora, impl + secreto de infra como follow-up). El front es agnostico al driver.
- RBAC por campo: lo que exponga costo/margen se gatea y se testea con/sin capability (evitar la regresion de JOR-084/103).
- Gate del merge (RULE-testing-coverage-threshold-002): no bajarlo.
- DET-27 commits por session; DET-36 runtime-verification en las de UI.

## Risks and mitigations

| Risk | Prob | Impacto | Mitigacion |
|------|------|---------|------------|
| Volumen Docker mal configurado → imagenes se pierden en rebuild | media | alto | e2e/manual: subir → rebuild → sigue accesible |
| Import CSV crea basura o falla en lote | media | alto | validacion por fila + transaccion por fila/reporte; no abortar todo |
| Fuga de costo en export/detalle | media | alto | test con y sin `items.parts:critical` |
| Export "todo" pesado | baja | media | limite/streaming; default filtrado con tope |
| URL firmada filtrable mientras vigente | baja | media | TTL corto; firma ligada a workspace/attachment; expiracion validada server-side |
| Imagen rota: `<img>` via `/api/proxy` (corrompe binario con `.text()`) o via endpoint guardado (401 sin Bearer) | alta si se hace naive | alto | ruta Next binaria dedicada (stream) + endpoint de descarga sin AuthGuard (firma-only). Verificado en diseño contra el codigo del proxy y el guard chain |

## Tasks

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | Clonar/Duplicar → precarga alta + crea item nuevo | REQ-01 | developer | — | components/items/detail/*, create/ItemCreateForm/*, app/.../items/nuevo | front test: clona precarga y crea id nuevo | git revert | DET-2 | done | 1 |
| S1.T2 | Compartir (Web Share API + fallback copiar link) | REQ-02 | developer | — | components/items/detail/MediaCard.tsx, ItemDetailModal.tsx | front test: share llamado / fallback clipboard | git revert | DET-2 | done | 1 |
| S1.T3 | Ver ficha → ruta `/inventario/items/[id]` (deep-link) | REQ-03 | developer | — | app/(app)/inventario/items/[id]/page.tsx, components/items/detail/* | front test: ruta renderiza detalle; 404 si no existe | git revert | DET-2 | done | 1 |
| S1.GATE | Quality + runtime-verify (UI) + commits | REQ-01,02,03 | reviewer | S1.T1,S1.T2,S1.T3 | — | 3 acciones reales; sin toast placeholder; gate merge verde | — | DET-13,DET-23,DET-36 | done | 1 |
| S2.T1 | Impresion Rapida (vista print + window.print) | REQ-04 | developer | S1.GATE | app/.../items/[id]/print o componente print, MediaCard | front test: arma imagen+detalles, print llamado | git revert | DET-2 | done | 2 |
| S2.T2 | Imprimir Etiqueta (label por bodega, selector vivo) | REQ-05 | developer | S1.GATE | components/items/detail/ItemDetailModal.tsx (selector), vista label | front test: usa bodega seleccionada + print | git revert | DET-2 | done | 2 |
| S2.T3 | Homologar botones (set unico, sin duplicados) | REQ-06 | developer | S2.T1,S2.T2 | MediaCard.tsx, ItemDetailModal.tsx footer | front test: sin duplicados; handlers distintos | git revert | DET-2 | done | 2 |
| S2.GATE | Quality + runtime-verify + commits | REQ-04,05,06 | reviewer | S2.T1,S2.T2,S2.T3 | — | 2 impresiones distintas; cero duplicados; gate verde | — | DET-13,DET-23,DET-36 | done | 2 |
| S3.T1 | Backend: `PATCH /:id/failure` (repo write + service + controller) | REQ-07 | developer | — | backend/.../items/items.repository.ts, items.service.ts, items.controller.ts | unit + e2e: togglea items.failure, gate capability | git revert | DET-2,DET-8 | done | 3 |
| S3.T2 | Front: toggle en detalle + color de fila en el listado | REQ-07 | developer | S3.T1 | components/items/detail/*, components/items/list/ItemsTable.tsx | front test: toggle + color refleja estado | git revert | DET-2 | done | 3 |
| S3.GATE | Quality + e2e + commits | REQ-07 | reviewer | S3.T1,S3.T2 | — | falla persiste; listado refleja; sin regresion; gate verde | — | DET-13,DET-23 | done | 3 |
| S4.T1 | Migracion tabla generica `attachments` | REQ-08 | developer | — | backend/jormat-api/migrations/*, seeds si aplica | migrate+rollback OK; test de shape | knex migrate:rollback | DET-2,DET-8 | done | 4 |
| S4.T2 | StorageService como driver por env (`STORAGE_DRIVER`, default `local`): driver `local` escribe/borra en `/app/uploads` (sin ServeStatic); driver `azure-blob` = seam (interfaz + no-impl que falla si se selecciona sin config) | REQ-08 | developer | S4.T1 | backend/.../storage/storage.service.ts, storage/drivers/*, config env | unit (fs mock): local escribe/borra por storage_key; seleccion por env; azure-blob sin config falla claro | git revert | DET-2,DET-32 | done | 4 |
| S4.T2b | Firma de URLs: util HMAC+exp (`UPLOADS_SIGNING_SECRET`, TTL) + endpoint de descarga en controller PROPIO **sin AuthGuard** (`GET /inventario/items/:id/images/:attachmentId?sig&exp`) que valida SOLO firma/exp/workspace y streamea (`StreamableFile`) | REQ-08 | developer | S4.T1,S4.T2 | backend/.../items/item-images.controller.ts (nuevo, sin guard JWT), storage/signing util, config env | unit: firma valida sirve, ausente/invalida/expirada 401/403; e2e: img servida sin Bearer pero con firma | git revert | DET-2,DET-8 | done | 4 |
| S4.T2c | Front: ruta Next binaria dedicada `app/api/uploads/[...path]/route.ts` que streamea el binario (`response.body`/arrayBuffer, NO `.text()`) y reenvia `?sig&exp` — deja `/api/proxy` compartido intacto | REQ-08 | developer | S4.T2b | front/.../app/api/uploads/[...path]/route.ts | front/integration: sirve bytes intactos (no corrompe), Content-Type correcto | git revert | DET-2 | done | 4 |
| S4.T3 | Volumen Docker `jormat_uploads` (ambos compose) + env del secreto de firma | REQ-08 | developer | S4.T2 | docker-compose.yml, docker-compose.dev.yml | subir → rebuild → imagen sigue accesible por URL firmada | git revert | DET-8 | done | 4 |
| S4.T4 | Persistir en attachments: `POST/DELETE /:id/images` (en el items.controller guardado) + lectura devuelve URL firmada apuntando a `/api/uploads/...` (no storage_key) | REQ-08 | developer | S4.T1,S4.T2,S4.T2b | backend/.../items/items.controller.ts, service, repository | e2e: crea/borra fila + archivo; findById devuelve URL firmada | git revert | DET-2,DET-8 | done | 4 |
| S4.T5 | Front: subir imagen + galeria real con `<img src>` de URL firmada via `/api/uploads/...` (reusa ImageGalleryUploader) | REQ-08 | developer | S4.T4,S4.T2c | components/items/detail/*, ImageGalleryUploader | front test: sube y muestra por URL firmada; borra | git revert | DET-2 | pending | 4 |
| S4.GATE | Quality + e2e + runtime-verify + commits | REQ-08 | reviewer | S4.T1,S4.T2,S4.T2b,S4.T2c,S4.T3,S4.T4,S4.T5 | — | imagen persiste (sobrevive rebuild); servida solo por URL firmada via ruta binaria (sin ruta publica, sin corromper bytes); DEUDA cerrada; gate verde | — | DET-13,DET-23,DET-36 | pending | 4 |
| S5.T1 | Backend: `POST /items/import` (parse + validar por fila + bulk create + reporte) | REQ-09 | developer | — | backend/.../items/items.controller.ts, service, csv util | unit + e2e: validos crean, invalidos reportan sin abortar | git revert | DET-2,DET-8 | pending | 5 |
| S5.T2 | Front: dialog carga masiva + plantilla descargable + reporte de errores | REQ-09 | developer | S5.T1 | components/items/list/*, services/api/inventario/items.ts | front test: sube CSV, muestra reporte, descarga plantilla | git revert | DET-2 | pending | 5 |
| S5.GATE | Quality + e2e + commits | REQ-09 | reviewer | S5.T1,S5.T2 | — | import crea en lote + reporta errores; gate verde | — | DET-13,DET-23 | pending | 5 |
| S6.T1 | Export CSV del filtrado completo + columnas + gating de costo | REQ-10 | developer | — | components/items/list/ItemsListView.tsx, services/api/inventario/items.ts, lib/csv.ts | front test: exporta todo el filtrado; costo gateado | git revert | DET-2 | pending | 6 |
| S6.T2 | Docs (DET-37) + limpieza de placeholders/DEUDA + verificacion final | REQ-DOCS-01,PRESERVE-01 | developer | S6.T1 | docs/*, jormat_docs/*, backend/front segun cierre | docs actualizadas; 0 placeholders; suites verdes | — | DET-16,DET-37 | pending | 6 |
| S6.GATE | Validacion reforzada de cierre + summary | REQ-PRESERVE-01,DOCS-01 | reviewer | S6.T1,S6.T2 | — | acceptance checkpoints ejecutados; gate verde; docs completas | — | DET-13,DET-30 | pending | 6 |

### Session 3

parallel_groups: []

### Session 4

parallel_groups: [[S4.T1, S4.T2]]

> S4.T1 (migracion) y S4.T2 (storage a disco) son independientes al inicio; T3/T4/T5 dependen de ellas. El resto de las sessions es secuencial por dependencia interna.

## Acceptance checkpoints

- [ ] **Funcional**: ningun boton de items dispara `toast('no implementado')`; cada accion acciona o no se renderiza.
- [ ] **Imagenes**: subir/borrar persiste (fila en `attachments` + archivo en `/uploads`) y sobrevive rebuild (volumen); se sirven solo por URL firmada vigente (firma ausente/invalida/expirada → 401/403; sin ruta estatica publica).
- [ ] **Import CSV**: carga masiva crea items en lote con reporte de errores por fila + plantilla descargable.
- [ ] **Export CSV**: baja el filtrado completo (no solo la pagina), con costo gateado.
- [ ] **Falla**: persiste y el listado refleja el color.
- [ ] **Tests**: suites verdes; gate del merge (branches ≥89, resto ≥90) se mantiene.
- [ ] **Docs (DET-37)**: endpoints, `attachments`, volumen, rutas/plantilla, decisiones — documentados.
- [ ] **Sin regresion** de comportamiento de items existente.
