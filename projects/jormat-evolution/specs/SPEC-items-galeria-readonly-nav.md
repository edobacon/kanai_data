---
id: SPEC-items-galeria-readonly-nav
project: jormat-evolution
ticket: JOR-108
status: in_progress
---

# SPEC-items-galeria-readonly-nav — Galeria read-only en vista + subir solo en crear/editar + nav a la ficha

# SPEC-items-galeria-readonly-nav — Galeria read-only en vista + subir solo en crear/editar + nav a la ficha

## Executive summary — lo que estas aprobando

Correcciones de UX/contexto sobre el modulo de imagenes de items (JOR-107 S4) + navegacion post-guardado, halladas en la review del dev. 5 REQs, 1 session (T2; REQ-02 toca persistencia). Sin cambios de datos ni de esquema (la tabla `attachments` ya existe).

## Purpose

El detalle de item (modal + ficha) NO debe ofrecer subir/gestionar imagenes — es contexto de VISTA; debe mostrar la galeria en solo lectura. El subir/gestionar va SOLO al crear/editar, y debe PERSISTIR de verdad. Ademas, la ficha standalone no debe mostrar afordances de modal ("Cerrar"), y tras crear/editar hay que ir a la ficha del producto.

## Estado actual / Baseline

- `MediaCard` (detalle, modal + ficha) monta `ImageGalleryUploader` editable + `useUploadItemImage` (POST /:id/images) — sube/borra desde la VISTA (incorrecto).
- `ImageGalleryUploader` no tiene modo read-only (siempre muestra Upload/Trash/Grip).
- `ItemCreateForm` (crear/editar) monta `ImageGalleryUploader` que COLECTA `data.imagenes` (blob URLs) pero el submit NO persiste las imagenes (van por el endpoint multipart aparte; el form solo las tiene en memoria) — gap.
- `ItemCreateForm.onSubmit` navega a `/inventario/items` (listado) tras guardar.
- `ItemDetailContent` (context 'modal'|'page'): ya oculta "Ver ficha" en 'page' (fix B2), pero "Cerrar" sigue visible en la ficha.
- Upload backend: funciona con la migracion `attachments` aplicada (verificado, POST 201). En un entorno sin la migracion, falla por tabla inexistente.

## Requirements

### REQ-01: Galeria de solo lectura en el detalle (modal + ficha)
> **Que cambia**: ver un item muestra su galeria SIN poder subir/borrar/reordenar.

MUST: en el detalle (`MediaCard`/`ItemDetailContent`, modal y ficha) las imagenes se muestran en **solo lectura** (grid/preview, sin acciones de subir/borrar/reordenar). Se quita del detalle el `ImageGalleryUploader` editable y el `useUploadItemImage`. Aproach: agregar prop `readOnly` a `ImageGalleryUploader` (oculta Upload/Trash/Grip, sin `onChange`) O un componente `ItemImageGallery` read-only reusable. Decidir por reuso (DET-32).

### REQ-02: Subir/gestionar imagenes SOLO en crear/editar, y que PERSISTA
> **Que cambia**: el uploader vive solo en el form de alta/edicion y las imagenes se guardan de verdad.

MUST: el `ImageGalleryUploader` editable queda solo en `ItemCreateForm` (crear/editar). Al guardar, las imagenes se PERSISTEN via el endpoint de imagenes (`POST /:id/images` multipart + `DELETE` de las removidas): en **crear**, tras obtener el id del item creado; en **editar**, con el id conocido (diff de agregadas/removidas). Reusa el flujo de subida ya existente (JOR-107 S4). El upload valida contra la BD con la migracion `attachments` aplicada.

### REQ-03: Ocultar afordances de modal en la ficha standalone (`context='page'`)
MUST: en la ficha (`context='page'`) NO se muestra el boton **"Cerrar"** (es accion de modal; la salida es por breadcrumb/back). Mismo patron que "Ver ficha" (fix B2). Revisar de paso el selector de bodega y demas afordances del footer: dejar solo lo que aporta en la ficha.

### REQ-04: Navegacion post-guardado -> ficha del item
MUST: tras **crear** o **editar** (y clonar) un item, navegar a `/inventario/items/{id}` (la ficha), no al listado. Crear usa el id devuelto por la mutacion; editar/clonar el id correspondiente.

### REQ-05: Upload operativo + fix documentado del entorno
MUST: confirmar que subir imagenes funciona con la migracion `attachments` aplicada. Documentar que en entornos sin la tabla el fix es correr `migrate:latest` (aditiva, sin re-armar la BD) — no es un bug de codigo.

### REQ-PRESERVE-01: Sin regresion (DET-7)
MUST: 0 tests fallidos; gate de coverage del merge se mantiene (branches >=89, resto >=90); el modal picker y el flujo de crear/editar existentes no se rompen.

## Decisions

- **DEC-LOCAL-01 — read-only via prop vs componente aparte**: a resolver en execute (proporcionalidad DET-32; preferir `readOnly` en `ImageGalleryUploader` si el cambio es acotado, sino `ItemImageGallery` read-only).
- **creates_visual=false** (intake): la galeria read-only es reduccion de UI existente; sin draft (DET-18 no aplica).

## Constraints
- Tenant isolation en toda operacion de imagenes (workspace).
- Reusar el endpoint de imagenes y la URL firmada de JOR-107 S4 (no reinventar).
- DET-36: UI -> runtime-verification en el gate (cuidar la carrera MSAL del harness; usar seam e2e + seed JOR-107).

## Tasks

| # | Task | source_ref | Agent | Files | Validation | Rollback | Status | Session |
|---|------|-----------|-------|-------|-----------|----------|--------|---------|
| S1.T1 | Galeria read-only en el detalle (modal+ficha): `readOnly` en ImageGalleryUploader (o componente aparte); quitar uploader editable + useUploadItemImage del detalle | REQ-01 | developer | components/items/detail/MediaCard, ItemDetailContent, ui/image-gallery-uploader | front test: detalle muestra galeria sin acciones de subir/borrar | git revert | pending | 1 |
| S1.T2 | Subir imagenes en crear/editar PERSISTE al guardar (POST/DELETE /:id/images; crear usa id devuelto, editar diff) | REQ-02 | developer | components/items/create/ItemCreateForm, hooks/useItems, edit/ItemEditView | front test: al guardar se persisten imagenes nuevas y se borran las removidas; e2e si aplica | git revert | pending | 1 |
| S1.T3 | Ocultar "Cerrar" (y afordances de modal) en la ficha standalone (`context='page'`) | REQ-03 | developer | components/items/detail/ItemDetailContent, ItemDetailPage | front test: en context page no hay boton Cerrar; en modal si | git revert | pending | 1 |
| S1.T4 | Navegacion post-crear/editar/clonar -> `/inventario/items/{id}` | REQ-04 | developer | components/items/create/ItemCreateForm, edit/ItemEditView, clone/ItemCloneView | front test: tras submit navega a la ficha con el id correcto | git revert | pending | 1 |
| S1.T5 | Verificar upload operativo + documentar fix de entorno (migrate) | REQ-05 | developer | (verificacion + docs) | upload 201 con migracion; nota en docs | — | pending | 1 |
| S1.GATE | Quality + runtime-verify (UI) + commits | REQ-01..05,PRESERVE-01 | reviewer | — | detalle read-only; subir solo en form y persiste; sin "Cerrar" en ficha; nav a ficha; sin regresion; gate verde | — | pending | 1 |

## Acceptance checkpoints

- [ ] Ver item (modal y ficha): galeria en solo lectura, sin ofrecer subir/borrar.
- [ ] Crear/editar: el uploader esta ahi y las imagenes persisten al guardar (nuevas + borradas).
- [ ] Ficha standalone: sin boton "Cerrar" (ni afordances de modal); se sale por breadcrumb/back.
- [ ] Tras crear/editar/clonar: navega a `/inventario/items/{id}`.
- [ ] Upload operativo con la migracion aplicada; fix de entorno (migrate) documentado.
- [ ] Suites verdes; gate del merge mantenido; sin regresion del picker ni del alta/edicion.
