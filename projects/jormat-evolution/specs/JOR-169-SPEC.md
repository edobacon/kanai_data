---
id: JOR-169-SPEC
project: jormat-evolution
ticket: JOR-169
status: approved
---

# Facturas cliente (feedback) 1/7 · Persistencia de ventas y corrección de migraciones de facturas

## Resumen ejecutivo

Persiste las facturas de cliente en `invoices`/`invoice_items` (hoy stub en memoria en `backend/jormat-api/src/sales/sales.service.ts:332`) y repara las migraciones que impiden `migrate:latest` desde base vacía y como upgrade: el backfill de `customer_id` al `customers.id` entero (error 42804, T-01) y el rol `internal-admin` faltante en el RBAC (T-02). Agrega integridad real (FKs, UNIQUE de uuid, CHECK de cantidad positiva, `workspace_id` explícito) y persiste los campos del feedback: descuento de línea con unidad, copia del receptor al emitir, N.P./O.C. y costo neto unitario por línea, visibles en detalle e impresión. NO incluye reglas comerciales de emisión (2/7), saldo/pagos (3/7), notas de crédito (5/7), SII (7/7) ni la migración histórica completa de facturas. Se verifica con `migrate` desde base vacía y como upgrade, con reinicio del servicio entre guardar y retomar un borrador (criterio 14), folio al emitir y error al editar una emitida, clon con identidad nueva, dirección del cliente inmutable en la factura emitida (criterio 13) y N.P./O.C. visibles tras reiniciar (criterio 27). Tamaño estimado: 3 sesiones (techo de entrada); el request queda EN EL TECHO — el corte natural, si el campo no cupiera, es separar los campos de negocio (P-08.1/P-04.1/T-13/costo) a otro ticket.

Datos a confirmar antes de ejecutar:
- Si las FK nuevas de `invoice_items.item_id`/`location_id` chocan con los ids legacy del backfill (`20261003000003_invoice_items_legacy_data.ts` inserta seriales legacy como 9495/0): confirmar si mapear, dejarlas sin FK o cargarlas solo en facturas nuevas.
- Si `invoices.order_reference` es el O.C. del front o hay que agregar una columna dedicada; y el nombre de la columna para N.P. (`order_note`).
- Fuente del costo neto unitario al emitir (P-09.2): si sale de `unit_price`/`total` de la línea o de un costo del ítem.
- Unidad del descuento (P-08.1): si se guarda solo el porcentaje o también el importe calculado.
- Cómo persistir `tipoDTE` (enum string del DTO) vs `invoices.type_id` (integer legacy por defecto 1).
- Dónde debe verse N.P. en impresión: `DocumentosPrintView` es impresión de LISTADO, no de un documento individual.

## Requirements

### REQ-01 `confirmed`
> Fuente: backend/jormat-api/migrations/20261003000002_invoices_legacy_data.ts:54

El backfill de facturas asigna `invoices.customer_id` al `customers.id` entero (join por `legacy_client_id` y `workspace_id`), por lo que `migrate:latest` deja de fallar con `42804`; la respuesta de la API sigue exponiendo el uuid público del cliente.

### REQ-02 `confirmed`
> Fuente: backend/jormat-api/migrations/20260924000000_rbac_bodega_orders_production.ts:4

La migración RBAC de bodega/orders garantiza que el rol `internal-admin` (`44444444-4444-4444-4444-444444444444`) exista antes de insertar en `role_capabilities`, de modo que `migrate:latest` pasa desde base vacía sin violar `role_capabilities_role_id_foreign`.

### REQ-03 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:332

Guardar un borrador lo persiste en `invoices` con su `workspace_id` explícito, sin folio y editable: tras reiniciar el servicio, retomarlo devuelve el mismo documento con todas sus líneas (criterio 14).

### REQ-04 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:332

Emitir asigna un folio simulado (correlativo entero por tipoDTE, ver REQ-12) separado del id/uuid, registra fecha y usuario de emision, y deja la factura inmutable: editar una emitida devuelve error en el API (R-07).

### REQ-05 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:482

Clonar un documento crea un documento nuevo con identidad nueva (id/uuid propios) y no altera el original.

### REQ-06 `confirmed`
> Fuente: backend/jormat-api/migrations/20261003000003_invoice_items_legacy_data.ts

El esquema de `invoices`/`invoice_items` queda con integridad real: FK de `invoice_items.invoice_id->invoices.id`, `item_id->items.id`, `location_id->location.id` (estas dos ultimas nullable y creadas despues del backfill, ver REQ-11); UNIQUE en los `uuid`; CHECK de cantidad positiva; y `workspace_id` explicito en cada escritura (sin depender del default DEV).

### REQ-07 `confirmed`
> Fuente: backend/jormat-api/migrations/20261003000001_invoice_items_legacy.ts:16

El descuento de línea se persiste con su unidad explícita (porcentaje y, si se guarda, el importe calculado), de modo que al retomar la factura la unidad del descuento no es ambigua (P-08.1).

### REQ-08 `confirmed`
> Fuente: backend/jormat-api/migrations/20261003000000_invoices_legacy.ts:6

Al emitir, la factura guarda una copia del receptor (RUT, razón social, dirección, ciudad, teléfono); cambiar la ficha del cliente después no altera la factura emitida (criterio 13).

### REQ-09 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:610

N.P. (nota de pedido) y O.C. se guardan en la factura al emitir y se muestran en el detalle y en la vista de impresion del documento individual tras reiniciar el servicio (criterio 27); la impresion de listado queda fuera de este criterio.

### REQ-10 `confirmed`
> Fuente: backend/jormat-api/migrations/20261003000001_invoice_items_legacy.ts:14

Al emitir, cada línea guarda su costo neto unitario (base para la utilidad del ticket 2/7, P-09.2).

### ENF-01 `confirmed` `enforcement`
> Fuente: backend/jormat-api/test/e2e/global-setup.cjs

Las migraciones son idempotentes y se aplican a la DB dev en ejecución, no solo al e2e de DB efímera (BUG-backend-002): el mismo `migrate:latest` sirve para base vacía y para upgrade con datos.

### ENF-02 `confirmed` `enforcement`
> Fuente: backend/jormat-api/migrations/20261003000001_invoice_items_legacy.ts:6

Se reutilizan las tablas `invoices`/`invoice_items` y los patrones existentes (SalesService, DTOs camelCase, controllers con guards y capabilities); no se crean tablas ni servicios paralelos.

### ENF-03 `confirmed` `enforcement`
> Fuente: front/jormat-front/src/lib/schemas/ventas.ts:136

El contrato se mantiene espejado front<->back: todo campo nuevo del documento (`orderNote`) viaja camelCase en el DTO y se agrega también al zod `documentoDTESchema` del front.

### ENF-04 `confirmed` `enforcement`
> Fuente: backend/jormat-api/src/sales/sales.service.spec.ts

Los tests existentes de `sales` siguen pasando; solo se adaptan los que afirman el comportamiento en memoria.

### REQ-11 `confirmed`
> Fuente: backend/jormat-api/migrations/20261003000003_invoice_items_legacy_data.ts

El backfill de `backend/jormat-api/migrations/20261003000003_invoice_items_legacy_data.ts` resuelve `item_id` y `location_id` por join contra `items` y `location` (por el identificador legacy y `workspace_id`) y deja NULL cuando no hay match; las FK `invoice_items.item_id->items.id` y `invoice_items.location_id->location.id` se crean recien DESPUES de ese backfill, en una migracion posterior, de modo que `migrate:latest` pasa tanto desde base vacia como en UPGRADE de una base con datos legacy.

### REQ-12 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:332

El folio simulado es un correlativo entero por tipo de DTE, sin CAF (serie simulada): al emitir se toma el siguiente correlativo del `type_id` correspondiente y se persiste separado del id/uuid del documento, con el mapeo explicito tipoDTE -> `invoices.type_id` (Factura Electronica -> 1).

### REQ-13 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:610

La vista de impresion del DOCUMENTO individual (impresion de una factura, no el listado) muestra N.P. y O.C. tomados del documento persistido; el componente real de impresion por documento se identifica en el codigo durante la ejecucion (la referencia a `DocumentosPrintView` corresponde a la impresion de listado y no satisface el criterio 27).

### ENF-05 `confirmed` `enforcement`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:332

Todos los `sourceRef` (file:line) y los nombres de tablas/componentes citados en este spec (`items.id`, `location.id`, `DocumentosPrintView`, las lineas de `sales.service.ts`) se CONFIRMAN contra el codigo real al inicio de la ejecucion: si alguno no existe con ese nombre o la linea se corrio, se ajusta la referencia al simbolo real y se deja anotado en la task; no se asume ni se crea el simbolo faltante.
## Tasks

#### S1.T1 — En `backend/jormat-api/migrations/20260924000000_rbac_bodega_orders_production.ts`, antes de `grantToRole(INTERNAL_ADMIN_ROLE_ID...)`, hacer upsert idempotente del rol `internal-admin` (id `44444444-4444-4444-4444-444444444444`) en el workspace `11111111-1111-1111-1111-111111111111` para que el insert en `role_capabilities` no viole `role_capabilities_role_id_foreign` en base vacía (T-02).
Contrato: rollback: git restore del archivo de migración; si ya se aplicó, `npm --prefix backend/jormat-api run migrate:rollback`.. Status: done

#### S1.T2 — En `backend/jormat-api/migrations/20261003000002_invoices_legacy_data.ts:54` cambiar `SET customer_id = c.uuid` por `SET customer_id = c.id` (join por `legacy_client_id` y `workspace_id`); revisar `20261003000004_invoice_customer_id_serial.ts` para que, con la columna ya integer, sea un no-op documentado que no reconvierta (T-01). La API sigue devolviendo el uuid público del cliente.
Contrato: rollback: git restore de ambos archivos; `npm --prefix backend/jormat-api run migrate:rollback` si se aplicó.. Status: done

#### S1.T3 — Ordenar las migraciones de integridad de `invoice_items` para que `migrate:latest` pase en ambas rutas: primero el backfill con joins (item_id/location_id resueltos o NULL), y recien despues una migracion posterior que agrega las FK `invoice_items.invoice_id->invoices.id`, `item_id->items.id`, `location_id->location.id`, el UNIQUE de los `uuid` y el CHECK de cantidad positiva. Ninguna constraint se crea sobre datos legacy sin mapear.
Contrato: rollback: `migrate:rollback` de las migraciones de constraints y restaurar el orden/timestamps previos con `git checkout -- backend/jormat-api/migrations/`.. Status: done

#### S1.T4 — Test e2e de migraciones (nuevo `backend/jormat-api/test/e2e/invoices-migrations.e2e-spec.ts`): instalación desde base vacía y upgrade con datos de las migraciones RBAC y de backfill; idempotencia al re-ejecutar; presencia de FK/UNIQUE/CHECK y de las columnas nuevas; y evidencia de que la DB refleja las migraciones.
Contrato: rollback: Borrar el archivo de test.. Status: done

#### S1.T5 — Confirmar contra el codigo real, antes de tocar migraciones, los identificadores citados en el spec: tablas `items`, `location`, `invoices`, `invoice_items` y sus columnas de id/legacy; las lineas `src/sales/sales.service.ts:332` y `:610`; y el componente de impresion por documento (verificar si `DocumentosPrintView` es la impresion de listado y cual es la vista de impresion individual). Anotar en la task las referencias reales que difieran del spec y usar esos nombres en el resto de la ejecucion; no crear simbolos faltantes.
Contrato: rollback: No modifica codigo: no requiere rollback; descartar la nota de referencias.. Status: done

#### S1.T6 — Corregir el backfill de `backend/jormat-api/migrations/20261003000003_invoice_items_legacy_data.ts`: resolver `item_id` por join contra `items` y `location_id` por join contra `location` (por identificador legacy + `workspace_id`), dejando NULL cuando no hay match, en vez de copiar el id legacy crudo. Mover la creacion de las FK `invoice_items.item_id->items.id` y `location_id->location.id` a una migracion con timestamp POSTERIOR al backfill, con columnas nullable y ON DELETE acorde al patron del repo.
Contrato: rollback: `migrate:rollback` de las migraciones agregadas y `git checkout -- backend/jormat-api/migrations/20261003000003_invoice_items_legacy_data.ts`.. Status: done

#### S1.T7 — Validar las DOS rutas de migracion: (a) base vacia efimera -> `migrate:latest` completo sin error; (b) UPGRADE sobre una COPIA de la DB dev con datos legacy -> `migrate:latest` sin violacion de FK, verificando con SQL que `invoice_items` quedo con `item_id`/`location_id` apuntando a ids existentes o NULL, y que `invoices` quedo con `customer_id` entero y `workspace_id` consistente. Dejar registrado el resultado de ambas rutas.
Contrato: rollback: Descartar la base efimera y la copia de la DB dev; no toca la DB dev original.. Status: done

#### S1.T8 — Aplicar `migrate:latest` a la DB dev EN EJECUCION (no solo al e2e de DB efimera, BUG-backend-002) tras respaldarla: correr la migracion, verificar que la app levanta contra esa DB, y correr `migrate:latest` una segunda vez para comprobar idempotencia (0 migraciones pendientes, sin error ni cambios de esquema).
Contrato: rollback: Restaurar el dump previo de la DB dev tomado antes de migrar; `migrate:rollback` de las migraciones nuevas.. Status: done

#### S2.T1 — Reemplazar el almacén en memoria de `SalesService` (`documentos`/`lineasPorDoc`/`datosBorradorPorDoc`, sales.service.ts:332) por persistencia Knex en `invoices`/`invoice_items` con `workspace_id` explícito: `createDraft`/`updateDraft`/`findDocumento` leen y escriben el borrador y sus líneas; un borrador queda sin folio y editable (R-05, REQ-03).
Contrato: rollback: git restore de `sales.service.ts` y de su módulo; `migrate:rollback` si se agregó migración.. Status: done

#### S2.T2 — Persistir la emisión en `SalesService.issueFactura`: asignar folio simulado (serie por tipoDTE, separado del id), setear fecha y usuario de emisión, y bloquear la edición de emitidas (R-07, REQ-04).
Contrato: rollback: git restore de `sales.service.ts`; `migrate:rollback` si aplica.. Status: done

#### S2.T3 — Clonado: crear siempre un documento NUEVO con identidad nueva (fila nueva en `invoices` con su uuid) al partir de un origen, copiando sus líneas; el original no se modifica (REQ-05). Corregir cualquier ruta que reutilice el id del origen.
Contrato: rollback: git restore de `sales.service.ts`.. Status: done

#### S2.T4 — Test de integración de persistencia (nuevo `backend/jormat-api/test/e2e/sales-invoices-persistence.e2e-spec.ts`): crear borrador y releerlo con una instancia nueva del servicio (simula reinicio) con sus líneas; emisión asigna folio; editar emitida 400; clon con identidad nueva y original intacto; adaptar los specs de `sales` que afirmaban el stub en memoria.
Contrato: rollback: Borrar el archivo de test.. Status: done

#### S2.T5 — Implementar el folio simulado al emitir: correlativo entero por tipo de DTE, sin CAF (serie simulada), persistido en la columna de folio de `invoices` separado del id/uuid, con el mapeo explicito tipoDTE -> `invoices.type_id` (Factura Electronica -> 1) en una constante del modulo sales (sin magic numbers dispersos). La asignacion del correlativo debe ser atomica dentro de la transaccion de emision.
Contrato: rollback: `git checkout --` de los archivos de `src/sales` tocados; los folios ya asignados se revierten con el rollback de la transaccion.. Status: done

#### S3.T1 — Persistir el descuento de línea con unidad explícita: guardar `discount_unit` (porcentaje) y el importe calculado en `invoice_items` al guardar/emitir, y reflejarlo en el `LineItemDto` de respuesta (P-08.1, REQ-07).
Contrato: rollback: `migrate:rollback` de las columnas y git restore de `sales.service.ts`/DTO.. Status: done

#### S3.T2 — Al emitir, copiar el receptor a la factura (rut, razón social, dirección, ciudad, teléfono) desde el payload/DTO a las columnas `invoices.receptor_*`; leerlas del snapshot y no de `customers` (P-04.1, REQ-08).
Contrato: rollback: `migrate:rollback` de las columnas y git restore del service.. Status: done

#### S3.T3 — Persistir N.P. (`orderNote`) y O.C. (`oc`) en `invoices` al emitir, exponer `orderNote` en `DocumentoDTEDto`/detalle, renderizar N.P. en `front/jormat-front/src/components/ventas/detail/DocumentoDetalleView/DocumentoDetalleView.tsx` (reemplaza el DEUDA_TECNICA_CONFIRMAR de la cabecera) y agregar la columna N.P. en `front/jormat-front/src/components/ventas/list/DocumentosPrintView/DocumentosPrintView.tsx`; agregar `orderNote` a `documentoDTESchema` (`front/jormat-front/src/lib/schemas/ventas.ts:136`) (T-13, REQ-09).
Contrato: rollback: git restore de los archivos de back y front; `migrate:rollback` de las columnas si aplica.. Status: done

#### S3.T4 — Guardar el costo neto unitario por línea en `invoice_items.net_unit_cost` al emitir, tomándolo del dato de costo de la línea o derivándolo de `unit_price`/`total` (P-09.2, REQ-10).
Contrato: rollback: `migrate:rollback` de la columna y git restore del service.. Status: done

#### S3.T5 — Tests de campos y regresión (unit + e2e): descuento con unidad, snapshot del receptor inmutable al cambiar al cliente, N.P./O.C. persistidos y visibles, y costo neto unitario; verificar que los tests existentes de `sales` siguen pasando, adaptando solo los que afirman el stub en memoria.
Contrato: rollback: Borrar/restaurar los tests nuevos.. Status: done

#### S3.T6 — Agregar N.P. y O.C. a la vista de impresion del DOCUMENTO individual (la identificada en la task de verificacion de referencias; `DocumentosPrintView` es la impresion de listado y no corresponde), tomando los valores del documento persistido y no del estado en memoria del borrador. Respetar el layout y los componentes de impresion existentes, sin crear una vista paralela.
Contrato: rollback: `git checkout --` del componente de impresion por documento modificado.. Status: done
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-11 (add) `confirmed`: El backfill de `backend/jormat-api/migrations/20261003000003_invoice_items_legacy_data.ts` resuelve `item_id` y `location_id` por join contr
- REQ-12 (add) `confirmed`: El folio simulado es un correlativo entero por tipo de DTE, sin CAF (serie simulada): al emitir se toma el siguiente correlativo del `type_i
- REQ-13 (add) `confirmed`: La vista de impresion del DOCUMENTO individual (impresion de una factura, no el listado) muestra N.P. y O.C. tomados del documento persistid
- ENF-05 (add) `confirmed`: Todos los `sourceRef` (file:line) y los nombres de tablas/componentes citados en este spec (`items.id`, `location.id`, `DocumentosPrintView`
- REQ-04 (edit) `confirmed`: Emitir asigna un folio simulado (correlativo entero por tipoDTE, ver REQ-12) separado del id/uuid, registra fecha y usuario de emision, y de
- REQ-06 (edit) `confirmed`: El esquema de `invoices`/`invoice_items` queda con integridad real: FK de `invoice_items.invoice_id->invoices.id`, `item_id->items.id`, `loc
- REQ-09 (edit) `confirmed`: N.P. (nota de pedido) y O.C. se guardan en la factura al emitir y se muestran en el detalle y en la vista de impresion del documento individ

**Tasks agregadas:**

- S1: Confirmar contra el codigo real, antes de tocar migraciones, los identificadores citados en el spec: tablas `items`, `location`, `invoices`, `invoice_items` y sus columnas de id/legacy; las lineas `src/sales/sales.service.ts:332` y `:610`; y el componente de impresion por documento (verificar si `DocumentosPrintView` es la impresion de listado y cual es la vista de impresion individual). Anotar en la task las referencias reales que difieran del spec y usar esos nombres en el resto de la ejecucion; no crear simbolos faltantes. (valida: ENF-05; rollback: No modifica codigo: no requiere rollback; descartar la nota de referencias.)
- S1: Corregir el backfill de `backend/jormat-api/migrations/20261003000003_invoice_items_legacy_data.ts`: resolver `item_id` por join contra `items` y `location_id` por join contra `location` (por identificador legacy + `workspace_id`), dejando NULL cuando no hay match, en vez de copiar el id legacy crudo. Mover la creacion de las FK `invoice_items.item_id->items.id` y `location_id->location.id` a una migracion con timestamp POSTERIOR al backfill, con columnas nullable y ON DELETE acorde al patron del repo. (valida: REQ-11, REQ-06; rollback: `migrate:rollback` de las migraciones agregadas y `git checkout -- backend/jormat-api/migrations/20261003000003_invoice_items_legacy_data.ts`.)
- S1: Validar las DOS rutas de migracion: (a) base vacia efimera -> `migrate:latest` completo sin error; (b) UPGRADE sobre una COPIA de la DB dev con datos legacy -> `migrate:latest` sin violacion de FK, verificando con SQL que `invoice_items` quedo con `item_id`/`location_id` apuntando a ids existentes o NULL, y que `invoices` quedo con `customer_id` entero y `workspace_id` consistente. Dejar registrado el resultado de ambas rutas. (valida: REQ-11, REQ-01, ENF-01, test; rollback: Descartar la base efimera y la copia de la DB dev; no toca la DB dev original.)
- S1: Aplicar `migrate:latest` a la DB dev EN EJECUCION (no solo al e2e de DB efimera, BUG-backend-002) tras respaldarla: correr la migracion, verificar que la app levanta contra esa DB, y correr `migrate:latest` una segunda vez para comprobar idempotencia (0 migraciones pendientes, sin error ni cambios de esquema). (valida: ENF-01, test; rollback: Restaurar el dump previo de la DB dev tomado antes de migrar; `migrate:rollback` de las migraciones nuevas.)
- S2: Implementar el folio simulado al emitir: correlativo entero por tipo de DTE, sin CAF (serie simulada), persistido en la columna de folio de `invoices` separado del id/uuid, con el mapeo explicito tipoDTE -> `invoices.type_id` (Factura Electronica -> 1) en una constante del modulo sales (sin magic numbers dispersos). La asignacion del correlativo debe ser atomica dentro de la transaccion de emision. (valida: REQ-12, REQ-04; rollback: `git checkout --` de los archivos de `src/sales` tocados; los folios ya asignados se revierten con el rollback de la transaccion.)
- S3: Agregar N.P. y O.C. a la vista de impresion del DOCUMENTO individual (la identificada en la task de verificacion de referencias; `DocumentosPrintView` es la impresion de listado y no corresponde), tomando los valores del documento persistido y no del estado en memoria del borrador. Respetar el layout y los componentes de impresion existentes, sin crear una vista paralela. (valida: REQ-13, REQ-09; rollback: `git checkout --` del componente de impresion por documento modificado.)

**Task ops:**

- edit S1.T3 { desc="Ordenar las migraciones de integridad de `invoice_items` para que `migrate:latest` pase en ambas rutas: primero el backfill con joins (item_id/location_id resueltos o NULL), y recien despues una migracion posterior que agrega las FK `invoice_items.invoice_id->invoices.id`, `item_id->items.id`, `location_id->location.id`, el UNIQUE de los `uuid` y el CHECK de cantidad positiva. Ninguna constraint se crea sobre datos legacy sin mapear.", rollback="`migrate:rollback` de las migraciones de constraints y restaurar el orden/timestamps previos con `git checkout -- backend/jormat-api/migrations/`.", validates=["REQ-06","REQ-11"], verify=["npm --prefix backend/jormat-api run migrate:latest","npm --prefix backend/jormat-api run migrate:rollback"] }

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5
- [x] S1.T6
- [x] S1.T7
- [x] S1.T8

**Gate (auto)**: `migrate:latest` pasa desde base vacía y como upgrade; los snapshots de `invoices`/`invoice_items` muestran los constraints y las columnas nuevas; re-ejecutar migrate no cambia nada.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5

**Gate (auto)**: Con el API: guardar borrador -> reiniciar -> retomarlo con sus líneas; emitir asigna folio; editar una emitida da 400; clonar crea otro documento sin tocar el original.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4
- [x] S3.T5
- [x] S3.T6

**Gate (auto)**: Emitir con descuento, receptor, N.P./O.C. y costo; el detalle y la impresión muestran N.P./O.C. tras reiniciar; la factura emitida no cambia al editar la ficha del cliente.
