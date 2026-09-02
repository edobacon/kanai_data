---
id: SPEC-ventas-stock-warning-legacy-fidelity
project: jormat-evolution
ticket: JOR-119
status: done
---

# Alinear el warning de stock del builder de factura al legacy

# Alinear el warning de stock del builder de factura al legacy

## Executive summary — lo que estas aprobando

**Que se corrige**: el aviso de stock del builder de factura (`TransactionBuilder.tsx`) diverge del legacy en tres puntos. Hoy dispara con el `estadoStock` **global** del catalogo (`useItemsCatalog()`), ignorando la bodega elegida en "Origen", y salta apenas se agrega el item (cantidad 1) en vez de cuando la **cantidad supera el stock**. Ademas la advertencia es solo un banner de pagina que muestra un item a la vez, sin indicador por fila. El legacy consulta stock por la bodega seleccionada (`getStock(itemId, warehouseId)`) y avisa solo si `quantity > stock`.

**Lo que NO cambia**: el caracter **no bloqueante** del aviso (JOR-088 REQ-01, learn L1). El unico gate de "Facturar" sigue siendo el cliente bloqueado por mora. Tampoco se elimina el CAP de cantidad existente (`:270-275`), pero se migra a stock por bodega para no dar senales contradictorias (ver Riesgos).

**Alcance de las tres piezas** (decision del dev 2026-08-08 tras spec-judge dual):

| Pieza | Alcance | Como |
|-------|---------|------|
| REQ-FIX-01 stock por bodega | En scope AHORA (fiel total) | El stub ya sirve `stockPorBodega` por codigo de bodega (contrato en `itemDetailSchema`, datos en MSW). Se resuelve el stock de la bodega de "Origen" por linea via item-detail + map nombre→codigo. Costo aceptado: N fetches `GET /items/:id` (uno por linea; sin endpoint batched), React Query cachea |
| REQ-FIX-02 gatillo por cantidad | En scope AHORA | Cambia la condicion del aviso: de `estadoStock === 'sin_stock'` a `cantidad > stockBodega` |
| REQ-FIX-03 indicador por fila | En scope AHORA | Reusa `StatusBadge` (`domain="stock"`, `STOCK_BADGE_VARIANT`) en `LineItemsTable` |

> **Correccion de spec-judge (DET-4)**: una version previa (a) ubicaba el semaforo en `ItemSearchPanel` (falso: vive en `items/list/ItemsTable` e `items/detail/ItemDetailContent`) y (b) difería el stock por bodega a JOR-086/092 (falso: esos tickets son persistencia de ventas/pagos, no tocan stock; el stub ya expone stock por bodega). Ambas corregidas aqui.

**Riesgos principales y mitigacion**: (a) reemplazar la condicion del banner puede perder casos del camino viejo (multiples sin stock, dismiss por item) → DET-40 auditoria de reemplazo 1:1 + tests. (b) N fetches de detalle (uno por linea) → aceptable (React Query cachea por id; el builder maneja pocas lineas); si crece, follow-up por endpoint batched. (c) CAP de cantidad y banner deben usar la MISMA fuente (stock por bodega) para no contradecirse. (d) **Rules of Hooks**: resolver N detalles en `TransactionBuilder` NO puede hacerse con `useItem` dentro de un loop; se resuelve con un hook top-level (`useQueries`) que expone un Map — ver S1.T3 (primer uso de `useQueries` en el repo).

## Purpose

- **Problema**: el warning de stock del builder no refleja el comportamiento del legacy (referencia canonica): calcula sobre stock global en vez de la bodega seleccionada, y gatilla por seleccion en vez de por cantidad. Falta feedback por fila.
- **A quien afecta**: usuarios que emiten documentos de venta con control de stock por sucursal; ven avisos que no corresponden a su bodega y no distinguen que linea esta sin stock.
- **Sintoma reportado**: al facturar el item ID 16 el sistema avisa "Su sucursal no cuenta con stock suficiente... Stock disponible: 0" con solo seleccionar el producto, sin saber en que bodega esta el usuario.

## Requirements

### REQ-FIX-01: el aviso evalua el stock de la bodega seleccionada en "Origen"
> Que cambia: el stock que se compara deja de ser el agregado global del catalogo y pasa a ser el de la bodega elegida.
> Por que: el legacy consulta `getStock(itemId, warehouseId)`; el aviso "Su sucursal" solo es veraz si mira la sucursal.

MUST: el campo "Origen" MUST persistir el CODIGO de bodega (`warehouse.ds_code`, ej. MAT/BOD-CHILL) — el `value` del `SelectItem` es `b.codigo`, NO `b.nombre` (DEC-7: identificar una entidad por nombre es fragil; se usa el identificador estable). La evaluacion de stock (banner + indicador por fila + CAP) MUST resolver `stockPorBodega` del detalle del item matcheando por ese codigo directo (`s.bodega === origen`), sin resolver nombres.

- Scenario: GIVEN "Origen" = MAT con stock del item X = 20, y BOD-CHILL con stock = 8 WHEN el usuario agrega X con cantidad 10 THEN el calculo usa 20 (MAT); si cambia "Origen" a BOD-CHILL el aviso se re-evalua contra 8.
- Scenario (sin "Origen" elegido): GIVEN no hay bodega seleccionada WHEN se agrega un item THEN no se evalua stock por bodega y no se muestra aviso.
- Display (DEC-7): como `origen` ahora persiste el codigo, las vistas de detalle/listado (ventas y compras) MUST resolver codigo→nombre para mostrar, via el helper `useBodegaNombre` (fallback: si el codigo no matchea, muestra el codigo tal cual). Aplica a `DocumentoDetalleView`, `DocumentosTable`, export CSV de `DocumentosListView`, `FacturaProveedorDetalleView`, `FacturasProveedorTable`.
- Nota de implementacion: `stockPorBodega` vive en `ItemDetail` (`useItem(id)`), no en el list item; se resuelve por linea con `useQueries`. Sin endpoint batched, son N fetches (React Query cachea por id).

### REQ-FIX-02: el aviso se gatilla por cantidad solicitada > stock, no por la sola seleccion
> Que cambia: el banner deja de saltar al agregar el item; salta cuando la cantidad supera el stock.
> Por que: fidelidad al legacy (`if (quantity > $scope.stock)`).

MUST: el banner de stock (y el indicador por fila) MUST activarse para una linea cuando `cantidad > stockBodega`, no por `estadoStock === 'sin_stock'`. NO se recorta la cantidad (DEC-8, fidelidad legacy: el legacy permite exceder y avisa; no hay CAP).

- Scenario: GIVEN un item con stock 20 en la bodega seleccionada WHEN el usuario lo agrega con cantidad 1 THEN NO se muestra aviso; WHEN sube la cantidad a 21 THEN se muestra el aviso Y la cantidad queda en 21 (no se recorta a 20).
- Scenario: GIVEN un item con stock 10 WHEN se piden 11 THEN se muestra el aviso "Stock disponible: 10" y la cantidad queda en 11.
- Scenario: GIVEN un item con stock 0 en la bodega WHEN se agrega con cantidad 1 THEN se muestra el aviso (0 < 1).

### REQ-FIX-03: indicador de stock por fila en la tabla de lineas seleccionadas
> Que cambia: cada fila de `LineItemsTable` muestra su estado de stock; deja de depender solo del banner de un item a la vez.
> Por que: con varias lineas sin stock, el banner muestra solo la primera; el usuario no sabe que fila esta afectada.

MUST: `LineItemsTable` MUST mostrar, por fila, un indicador cuando esa linea tenga `cantidad > stockBodega`. SHOULD: mostrar el numero de stock disponible (tooltip o texto).

> Correccion de quality-gate (2026-08-08, DEC-6): el indicador reusa el atomo `Badge` (`ui/badge`, el mismo primitivo que `StatusBadge` envuelve) + el icono `AlertTriangle`, NO el componente `StatusBadge`. Razon: `StatusBadge` (`domain="stock"`) expresa el semaforo de NIVEL de stock del item (En/Bajo/Sin stock), no el estado por-linea "la cantidad pedida supera el stock de esta bodega" (mostraria "Sin stock" con stock 3 y cantidad 5, engañoso). DET-32 (reuse, no crear componente nuevo) se cumple igual: `Badge` es un atomo existente y `AlertTriangle` ya se usa en la app; no se crea componente nuevo.

- Scenario: GIVEN dos lineas, A con cantidad sobre stock y B OK WHEN se renderiza la tabla THEN la fila A muestra el indicador de alerta y la fila B no.

### REQ-REGRESSION-01 → REEMPLAZADO por REQ-FIX-04 (DEC-8): el stock insuficiente BLOQUEA la emision
> Correccion 2026-08-08: la version previa decia "NO bloqueante + CAP", replicando la mala lectura del legacy de JOR-088. El legacy SI bloquea (`warningQuantity` en el ng-disabled del crear, `clients-invoices-create.html:61`) y NO recorta. Se revierte.

MUST (REQ-FIX-04): "Facturar" MUST quedar deshabilitado mientras alguna linea supere el stock de su bodega (`hayStockInsuficiente`), y el submit (Enter) MUST rechazarse con toast. El banner MUST ser persistente (no dismissible, variant error). "Guardar borrador" NO se bloquea (permite guardar el borrador con stock insuficiente). El gate de cliente moroso (`isClienteBloqueado`, JOR-088 REQ-04) se mantiene, adicional a este.

- Scenario: GIVEN una linea con `cantidad > stockBodega` WHEN el usuario intenta "Facturar" THEN el boton esta deshabilitado y la emision NO procede.
- Scenario: GIVEN todas las lineas con `cantidad <= stockBodega` WHEN el usuario presiona "Facturar" THEN la emision procede.

### REQ-REGRESSION-02: el resto del builder no cambia
MUST: banner de cliente bloqueado, dismiss por item del banner de stock, totales, tipos DTE, clonado (prefill) y demas comportamiento del builder MUST permanecer sin cambios.

## Fix scope

### Antes (comportamiento actual)
- `TransactionBuilder.tsx:242-255` `sinStockEntry` marca sin stock por `catalogItem?.estadoStock === 'sin_stock'` (global, sin bodega, sin cantidad).
- CAP de cantidad (`:270-275`) usa `catalogItem.stock` global.
- Banner de pagina (`:475-488`) muestra el primer item sin stock. `LineItemsTable` sin indicador por fila.

### Despues (comportamiento esperado)
- La deteccion se hace por linea como `cantidad > stockBodega(itemId, bodegaSeleccionada)`, con `stockBodega` resuelto desde `stockPorBodega` del detalle + map nombre→codigo.
- CAP de cantidad y banner comparten esa fuente.
- Cada fila de `LineItemsTable` muestra el indicador cuando corresponde.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `.../builder/TransactionBuilder/TransactionBuilder.tsx` | `sinStockEntry` y CAP pasan a comparar `cantidad` vs stock por bodega; pasar la bodega de "Origen" al calculo | Consumidor unico del banner; DET-40 auditar casos del camino viejo |
| `.../shared/builder/LineItemsTable/LineItemsTable.tsx` | Indicador de stock por fila (reusa `StatusBadge`); prop opcional no-breaking | Componente compartido; verificar consumidores (compras/notas) no se rompan por prop nueva |
| `.../lib/ventas/` o `hooks/` | Helper `useStockPorBodega(itemId, bodegaNombre)` o resolver: item-detail + map nombre→codigo + fallback | Nuevo helper aislado |
| `.../hooks/useItems.ts` | Reuso de `useItem(id)` para el detalle (ya existe, `:81`) | Sin cambio de contrato |
| `.../shared/builder/LineItemsTable/LineItemsTable.stories.tsx` | Story nueva "cantidad sobre stock" (hoy: Default/Vacio/UnaFila/Reorder) | DET-23 dim Storybook |
| Tests co-locados (`*.test.tsx`) | REQ-FIX-01/02/03 + regression no-bloqueante + cap | Cobertura |

## Tasks

### Session 1 — Alinear warning de stock al legacy [tipo: ⚑ fuerte] [tier: T3]

**Task S1.T1 — Gatillo del aviso por cantidad**
- source_ref: REQ-FIX-02
- agent: developer
- validation: el aviso se activa solo con `cantidad > stock`; test agregar item stock 20 cantidad 1 (sin aviso) y 21 (con aviso)
- rollback: git revert
- rules: [DET-40, DET-8]

**Task S1.T2 — Indicador de stock por fila en LineItemsTable + story**
- source_ref: REQ-FIX-03
- agent: developer
- depends_on: S1.T1
- validation: fila con `cantidad > stock` muestra `StatusBadge` de alerta; fila OK no; verificar consumidores de LineItemsTable no rotos (prop opcional). Agregar story `LineItemsTable.stories.tsx` con variante "cantidad sobre stock" (hoy hay Default/Vacio/UnaFila/Reorder, ninguna de stock); story renderiza sin error (DET-23 dim Storybook)
- rollback: git revert
- rules: [DET-32, DET-8, DET-23]

**Task S1.T3 — Stock por bodega (resolucion desde detalle)**
- source_ref: REQ-FIX-01
- agent: developer
- depends_on: S1.T1
- **patron obligatorio (Rules of Hooks)**: el banner y el CAP viven en `TransactionBuilder` (un solo componente). NO llamar `useItem` dentro del `for` de `sinStockEntry` (`:242-255`) ni del `forEach` del `useEffect` del CAP (`:270-275`) — es un numero variable de hooks por render (ilegal). En su lugar: un hook top-level `useStockPorBodega(itemIds: string[], bodegaNombre)` que use `useQueries` de TanStack (una query de detalle por itemId, resueltas en un solo hook estable) y devuelva un `Map<itemId, stockBodega>`; el `for`/`forEach` lee de ese Map (sin hooks). Nota: el repo NO usa `useQueries` hoy (`use-api-query.ts` solo envuelve `useQuery` singular); este es el primer uso — respetar el patron de `ApiError` existente. El indicador por fila (REQ-FIX-03) NO tiene este problema: cada fila es su propia instancia de `SortableRow` (`LineItemsTable.tsx:63`), puede resolver su stock con un `useItem` por instancia.
- validation: el calculo recibe la bodega de "Origen"; map `nombre→codigo` (via `useBodegas`, trae ambos); cambiar "Origen" re-evalua; banner y CAP usan la MISMA fuente (el Map del hook); cero llamadas a hooks dentro de loops (verificar eslint `react-hooks/rules-of-hooks` verde). Test con dos bodegas de distinto stock
- rollback: git revert
- rules: [DET-5, DET-8, DET-40]

**Task S1.T4 — Tests + verificacion runtime**
- source_ref: REQ-FIX-01, REQ-FIX-02, REQ-FIX-03, REQ-REGRESSION-01, REQ-REGRESSION-02
- agent: reviewer/tester
- depends_on: S1.T1, S1.T2, S1.T3
- validation: vitest builder + LineItemsTable verde; story nueva de stock renderiza sin error (DET-23); regression no-bloqueante (emitir con cantidad > stock procede) y CAP siguen pasando; tsc/eslint exit 0; screenshot runtime del banner (por cantidad) y del indicador por fila (DET-36)
- rollback: N/A (tests)
- rules: [DET-4, DET-7, DET-13, DET-14, DET-36]

**S1.GATE**: quality review (DET-23, tier T3 → exhaustive + dual-judge DET-35), mutation opt-in, self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- Alcance acotado a `components/ventas/builder/` y `components/shared/builder/LineItemsTable/` (+ helper aislado). No tocar backend ni el contrato del catalogo.
- No introducir bloqueo de emision por stock (fidelidad legacy + JOR-088 REQ-01).
- Reusar el atomo `Badge` (el que `StatusBadge` envuelve) + `AlertTriangle`; no crear componente de indicador nuevo (DET-32). No se usa `StatusBadge` directo por semantica (ver REQ-FIX-03 / DEC-6).
- CAP de cantidad y banner deben usar la MISMA fuente de stock (por bodega).

## Dependencies

- **JOR-088** (cerrado): implemento el banner no bloqueante + CAP de cantidad sobre stock global. JOR-118 corrige la fuente (a por bodega), el gatillo (a por cantidad) y agrega feedback por fila.
- Sin dependencia de backend: el stub ya sirve `stockPorBodega`. (Se retiro la falsa dependencia a JOR-086/092.)

## Risks

| Riesgo | Donde | Mitigacion |
|--------|-------|-----------|
| Perder casos del banner viejo al cambiar la condicion | `TransactionBuilder.tsx` sinStockEntry/banner | DET-40 auditoria 1:1 (multiples sin stock, dismiss por item, cantidad 0) + tests |
| N fetches de detalle (uno por linea) | helper stock por bodega | React Query cachea por id; builder con pocas lineas; follow-up por endpoint batched si escala |
| Rules of Hooks: `useItem` en un loop dentro de `TransactionBuilder` rompe en runtime | banner + CAP (`:242-275`) | Resolver via hook top-level `useStockPorBodega` con `useQueries` (Map itemId→stock); loops leen del Map. Primer uso de `useQueries` en el repo. Verificar eslint `react-hooks/rules-of-hooks` (ver S1.T3) |
| CAP y banner con fuentes distintas dan senales contradictorias | TransactionBuilder | Ambos usan el mismo resolver de stock por bodega (REQ-REGRESSION-01) |
| Prop nueva en LineItemsTable rompe otros consumidores | shared/builder | Prop opcional no-breaking; verificar compras/notas en T2 |
| Select "Origen" guarda `nombre`, stockPorBodega usa `codigo` | mapeo | Map explicito nombre→codigo via `useBodegas` (trae ambos) |

## Open questions

- **OQ-1 (cerrada por decision del dev 2026-08-08)**: alcance de REQ-FIX-01. Resuelta: implementar stock por bodega AHORA (fiel total) asumiendo el costo de N fetches de detalle, dado que el stub ya expone `stockPorBodega`. Descartadas: (b) interino global + adapter, (c) diferir a follow-up.
- **OQ-2 (definir en execute)**: comportamiento sin "Origen" seleccionado. El campo "Origen" es `required` hoy (`TransactionBuilder.tsx:572`), asi que el escenario es defensivo (rama poco alcanzable). Propuesta: sin bodega no se evalua stock y no se muestra aviso; si la rama queda inalcanzable por el `required`, marcarla con `v8 ignore` en vez de dejar cobertura muerta (nota spec-judge A).

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Stock por bodega AHORA via item-detail + map nombre→codigo | El stub ya expone `stockPorBodega`; no depende de backend. Fidelidad completa al legacy sin diferir |
| 2 | Aceptar N fetches de detalle (uno por linea) | No hay endpoint batched; React Query cachea; el builder maneja pocas lineas. Follow-up si escala |
| 3 | CAP y banner comparten la fuente por bodega | Evita senales contradictorias entre el clamp y el aviso |
| 4 | Reusar el atomo `Badge` para el indicador (no indicador nuevo) | DET-32 reuse; `Badge` es el primitivo existente |
| 5 | Mantener no bloqueante | Fidelidad al legacy (JOR-088 REQ-01/L1); unico gate: cliente en mora |
| 6 | Indicador con `Badge` atom + `AlertTriangle`, NO `StatusBadge` | `StatusBadge` (semaforo En/Bajo/Sin stock) no expresa "cantidad excede el stock de esta bodega"; usarlo diria "Sin stock" con stock>0. Reuse igual satisface DET-32. Corregido tras quality-gate (jueces A/B iterate) |
| 7 | `origen` persiste el CODIGO de bodega, no el nombre; select `value={b.codigo}` + resolver display codigo→nombre | Feedback del dev (2026-08-08): identificar una entidad por nombre es fragil (asume unicidad, rompe con renombres/homonimos). La bodega tiene id+codigo estables en la tabla `warehouse`; el patron correcto (codigo) ya existe en `ItemDetailContent`. Elimina el mapeo nombre→codigo del hook. Amplia alcance a compras (mismo bug) + 5 sitios de display. Backend stub sin data historica de `origen` → momento limpio para el cambio de contrato |
| 8 | Fidelidad legacy total: SIN CAP (permitir exceder) + banner persistente + BLOQUEAR emision con stock insuficiente. Revierte el `no-bloqueante + CAP` de JOR-088 | Feedback del dev + smoke (2026-08-08): con stock > 0 el CAP ocultaba el aviso (recortaba antes de que se viera). Al revisar el legacy se confirmo que JOR-088 lo leyo mal: el legacy NO recorta (input sin `max`, `getStock` no clampa), muestra alerta persistente `ng-show="warningQuantity"` y DESHABILITA el crear con `warningQuantity == true` (`clients-invoices-create.html:61,170,180` + controller `:333-342`). Decision del dev: alinear 100%. Impacto: quita CAP, banner variant error no dismissible, `hayStockInsuficiente` deshabilita Facturar + guard en onSubmit. "Guardar borrador" sigue sin bloquearse. Supersede la decision de stock de JOR-088 |

## Acceptance checkpoints

- [ ] AC-1 (REQ-FIX-02): item stock 20 → cantidad 1 sin aviso, cantidad 21 con aviso (test + screenshot).
- [ ] AC-2 (REQ-FIX-03): dos lineas, una sobre stock y otra OK → solo la primera muestra indicador (test + screenshot); story "cantidad sobre stock" agregada y renderiza.
- [ ] AC-3 (REQ-FIX-01): cambiar "Origen" entre dos bodegas de distinto stock re-evalua el aviso contra el stock correcto (test).
- [ ] AC-4 (REQ-REGRESSION-01): emitir con cantidad > stock (cliente no bloqueado) procede; CAP sigue clampeando sobre stock por bodega (test).
- [ ] AC-5 (REQ-REGRESSION-02): banner cliente bloqueado, dismiss por item, totales, clonado sin cambios (regression suite verde).

## Technical reference

- Legacy canonico: `jormat-front-legacy/src/app/sales/clients-invoices/create/clientsInvoicesCreateController.js:320-343` (`getStock(itemId, warehouseId)` + `if (quantity > $scope.stock)`), `setWarehouseId` (`:435-438`).
- Front nuevo: `TransactionBuilder.tsx:242-255` (sinStockEntry), `:270-275` (CAP), `:431` (gate emision), `:475-488` (banner), `:565-584` (select Origen, value = `b.nombre`).
- Contrato: `lib/schemas/items.ts:55-56` (`stock`/`estadoStock` escalares en list item), `:137` (`stockPorBodega` en detail), `:30` (`STOCK_BADGE_VARIANT`).
- Stub: `test/msw/handlers/items.ts:105-110` (`stockPorBodega` por codigo), `:224-225` (detalle keyed por id, fixture fijo), `test/msw/handlers/catalogos.ts:69+` (`mockBodegas` codigo+nombre).
- Semaforo: `StatusBadge` (`components/shared/StatusBadge/StatusBadge.tsx`, `domain="stock"`), usado en `items/list/ItemsTable:132`, `items/detail/ItemDetailContent:329`.
- Hooks: `useItem(id)` (`hooks/useItems.ts:81`), `useBodegas` (`hooks/useCatalogos.ts:104`). `use-api-query.ts` solo envuelve `useQuery` singular; NO hay uso de `useQueries` en `src/` (S1.T3 introduce el patron). Fila per-instancia: `SortableRow` (`LineItemsTable.tsx:63`, map en `:339-348`).
