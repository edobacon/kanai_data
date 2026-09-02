---
id: SPEC-items-form-integrity
project: jormat-evolution
ticket: JOR-084
status: done
---

# Items crear+editar: fix de integridad de datos (round-trip sin perdida)

# Items crear+editar: fix de integridad de datos (round-trip sin perdida)

## Executive summary

Al editar un item, `itemDetailToFormValues` defaultea a vacio/0 los campos que el `ItemDetailDto`
NO expone (`tipo`, `precios.compra`/`precios.compraNeto`, `canales.*` estructurados, `oferta`,
`observacionWeb`, `porMayor`). Como la edicion hace PATCH del objeto completo, guardar
**sobreescribe datos reales** con esos defaults. Fix cross-layer: exponer en el detalle los campos
del round-trip y mapearlos en el front **sin defaults**, para que crear->detalle->editar preserve
todo. Re-scope aprobado por el dev (2026-07-23): solo el fix de integridad; WooCommerce, semantica
"Tipo"/moneda, RBAC por campo, bodega/historial y "Competencia" se difieren.

## Hallazgos de grounding (DET-33, contra codigo real)

1. **Bug confirmado**: `itemDetailToFormValues.ts:26-57` mete defaults que el PATCH completo
   (`ItemCreateForm.tsx` onSubmit) escribe sobre datos reales.
2. **Ya disponibles en el detalle** (el mapper los ignora): `oferta` (`mapDetailRow:261`),
   `costoCompra`=net_price (=`precios.compraNeto`, gateado por items.parts:cost-view).
3. **`observacionWeb` -> `ds_comments`, NO `data_web`** (correccion al plan del ticket). Verificado
   en la fuente legacy: el textarea "Observacion/Web" (`items-create.html:397`) bindea a
   `ng-model="observation"` y el controller envia `observation` (`itemsCreateController.js:179`).
   El write path nuevo ya escribe `observacionWeb`->`ds_comments` (`items.repository.ts:355`).
   `data_web` legacy (`dataWeb`) es OTRO campo (grupo canales) que ese textarea no toca. Leer de
   `ds_comments` = round-trip consistente, cero cambio al write, cero datos huerfanos.

## Requirements

### REQ-01 — Detalle expone los campos del round-trip
> Que cambia: `ItemDetailDto` + `findById`/`mapDetailRow` exponen los campos que hoy faltan.
> Por que: sin ellos el front no puede precargar y el PATCH los borra.

MUST: `ItemDetailDto` incluye, ademas de lo actual, `tipo` (`type`), `precioCompra` (`nm_price` =
`precios.compra`), `precioMayor` (`mayor_price` = `precios.porMayor`), `canalesDetalle`
estructurado (`tipoWeb`/`linkWeb`/`drive`/`mercadoLibre`/`codigoMl` desde
`web_type`/`web`/`drive_link`/`free_market`/`free_market_code`) y `observacionWeb` (`ds_comments`).
`findById` selecciona las columnas faltantes (`type`, `nm_price`, `mayor_price`,
`free_market_code`, `ds_comments`). Los sentinels de canal (`'Sin Link'`, `'NO'`) se normalizan a
`undefined` en `canalesDetalle`. NO rompe el `resumenComercial.canales` string[] display existente.
`costoCompra` sigue gateado por items.parts:cost-view (sin cambios al gating).

### REQ-02 — Mapper sin defaults (round-trip sin perdida)
> Que cambia: `itemDetailToFormValues` mapea 1:1 los campos reales; se eliminan los defaults.
> Por que: es el fix central de perdida de datos.

MUST: `itemDetailToFormValues` mapea `tipo`, `precios.compraNeto` (<-`costoCompra`),
`precios.compra` (<-`precioCompra`), `precios.porMayor` (<-`precioMayor`), `canales.*`
(<-`canalesDetalle`), `oferta` (<-`detail.oferta`), `observacionWeb` desde el detalle real. Se
eliminan los defaults `tipo:''`, `precios.compra/compraNeto:0`, `canales.*:undefined`,
`oferta:false`, `observacionWeb:undefined`. El round-trip crear->detalle->editar preserva todo lo
que el modelo persiste.

### REQ-03 — Tests de integridad
MUST: integration (DB real) que verifica que el detalle expone los campos nuevos; unit de
round-trip del mapper sin perdida. Regression backend (unit+e2e) y front (vitest) verdes.

### REQ-04 — Deuda registrada
MUST: DEUDA documentada — `imagenes` sigue por endpoint aparte (no entra al PATCH de
`buildItemColumns`); `canales.catalogo` sin columna; `bloqueoDescuento` sin columna; WooCommerce,
"Tipo"/moneda, RBAC por campo (incl. si `nm_price`/`mayor_price` resultan cost-sensibles),
bodega/historial y "Competencia" -> tickets/decisiones aparte.

## Tasks

### Session 1 (backend, tier T2)
- S1.T1 — `dto/item.dto.ts` (`ItemDetailDto`): + `tipo`, `precioCompra`, `precioMayor`,
  `CanalesDetalleDto` (`canalesDetalle`), `observacionWeb`.
- S1.T2 — `items.repository.ts`: `findById` selecciona `type`/`nm_price`/`mayor_price`/
  `free_market_code`/`ds_comments`; `mapDetailRow` los expone (canales estructurado + sentinels
  normalizados). `RawDetailRow` extendido. `deriveCanales` string[] intacto.
- S1.T3 — integration `items-read.e2e-spec.ts`: asserts de los campos nuevos contra DB real.
- S1.GATE.

### Session 2 (frontend, tier T2)
- S2.T1 — `lib/schemas/items.ts` + `types/items.ts`: `itemDetailSchema` + `tipo`, `precioCompra`,
  `precioMayor`, `canalesDetalle`, `observacionWeb`.
- S2.T2 — `itemDetailToFormValues.ts`: mapear real, eliminar defaults.
- S2.T3 — unit round-trip sin perdida + regression front.
- S2.GATE.

## No-goals
- WooCommerce, semantica "Tipo"/moneda + panel internacional, RBAC por campo, bodega/ubicacion/
  historial, "Competencia", galeria de imagenes en el PATCH. Todo DEUDA (tickets/decisiones aparte).
