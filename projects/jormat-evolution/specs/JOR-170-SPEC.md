---
id: JOR-170-SPEC
project: jormat-evolution
ticket: JOR-170
status: draft
---

# JOR-170 · Reglas de emisión en servidor, Super Usuario y utilidad (Facturas cliente 2/7)

## Resumen ejecutivo

Endurece la emisión de facturas cliente: cliente bloqueado, stock de la bodega de origen, crédito 30/60, tope de descuento de ficha (en %), descuento general 20% excluyente, Bloqueo Descuento y precio mínimo (nm_net) validados en el API y reflejados en el front; unifica oil→bloqueo_descuento (T-10: migración + lectores + badge); agrega la capability sales.invoices:commercial-override con rol Super Usuario (override de topes, 80% general, precio bajo el vigente, ver costo/utilidad) y la utilidad por línea y total con snapshot del costo. NO se hace: saldos y pagos (3/7), tarifas por cliente/sucursal ni excepciones de stock para Super Usuario. Se verifica con rechazos concretos en el API (mensajes de referencia) y tests de Compras, Guías y Solicitudes. Tamaño: 3 sesiones T3 (≈9-12h de agente). ADVERTENCIA: el pedido EXCEDE el techo de 3 sesiones (reglas server + T-10 + capability + utilidad + front + regresión de 3 módulos); conviene partirse en varios tickets (p. ej. 2/7 reglas comunes, 3/7 Super Usuario+utilidad, 4/7 T-10).
Datos a confirmar antes de ejecutar:
- Nombre y esquema de la tabla de movimientos de inventario referenciados a la factura (no existe en el repo; definir en el doc de decisiones secciones 4.7/5, T-07).
- Confirmar que el payload de emisión trae el código de bodega de origen y que el stock se valida contra item_warehouses.item_qty de esa bodega (DEC-7).
- Nombre final de la capability (propuesto sales.invoices:commercial-override) y del rol (propuesto 'Super Usuario').
- Umbral/formato exacto de 'Sin dato' en la utilidad (sin costo o venta 0).
- Confirmar si items.oil tiene datos en cada ambiente antes de dropear la columna (la migración copia a bloqueo_descuento).

## Requirements

### REQ-01 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:219 (issueFactura) + backend/jormat-api/src/customers/customers.repository.ts:114 (locked)

El API rechaza emitir una factura a un cliente con customers.locked = 1, aunque el front saltee el botón Facturar. Mensaje de referencia: 'Cliente bloqueado contactar gerencia, imposible generar venta'.

### REQ-02 `confirmed`
> Fuente: backend/jormat-api/src/items/items.repository.ts:506 (stock por bodega) + backend/jormat-api/src/sales/sales.service.ts:219

En la emisión, si la cantidad de una línea supera el stock disponible en la bodega de origen (incluido 0) se bloquea Facturar, identificando el item y su cantidad; aplica también a Super Usuario. Mensaje: 'Su sucursal no cuenta con stock suficiente para item ID {id} - Actual: {n}'.

### REQ-03 `inferred`
> Fuente: backend/jormat-api/src/sales/sales.repository.ts:347 (issue con pg_advisory_xact_lock)

La emisión persiste cabecera, líneas y descuento de stock en UNA transacción con control concurrente: dos emisiones simultáneas con stock para una no dejan stock negativo; los movimientos de inventario quedan referenciados a la factura y no se duplican ante reintentos.

### REQ-04 `confirmed`
> Fuente: backend/jormat-api/src/sales/dto/factura-input.dto.ts:27 (FORMA_PAGO_VALUES) + backend/jormat-api/src/sales/sales.service.ts:280

El crédito solo admite 30 o 60 días; el vencimiento = fecha del documento + días corridos. Un plazo distinto (p. ej. credito_90) se rechaza.

### REQ-05 `confirmed`
> Fuente: backend/jormat-api/src/sales/calc-totals.ts:55 (validarLineas) + backend/jormat-api/src/items/items.repository.ts:395 (ds_max_discount)

El descuento de línea se valida en porcentaje sobre precio neto * cantidad contra el tope ds_max_discount de la ficha del item; la pantalla puede seguir aceptando un importe, que se convierte a porcentaje para validar. Reemplaza el descuento de línea como monto sin tope de JOR-167 CA-09.

### REQ-06 `confirmed`
> Fuente: backend/jormat-api/src/sales/calc-totals.ts:17 (DESCUENTO_GLOBAL_MAX) + front/jormat-front/src/lib/schemas/ventas.ts:318

El descuento general tiene máximo 20% y es excluyente con los descuentos de línea (no se combinan).

### REQ-07 `confirmed`
> Fuente: backend/jormat-api/src/items/items.repository.ts:822 (persistencia bloqueo_descuento) + front/jormat-front/src/components/shared/builder/LineItemsTable/LineItemsTable.tsx:155

Un repuesto con Bloqueo Descuento en la ficha no admite descuento de línea y bloquea el descuento general mientras haya al menos uno en la factura; al quitarlo se habilita solo si no queda otro.

### REQ-08 `confirmed`
> Fuente: backend/jormat-api/src/items/items.repository.ts:391 (nm_net AS precio) + front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.tsx:180

El precio mínimo de una línea es el precio neto de venta vigente de la ficha (nm_net), no el costo (net_price); al retomar un borrador se actualiza al valor vigente y se avisa. Un precio bajo el piso se rechaza.

### REQ-09 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:251 (resolverLineas) + front/jormat-front/src/lib/ventas/origen-factura.ts:103

Al crear una factura desde otro documento (factura o guía), los valores copiados pasan por las reglas de descuento/precio/bloqueo; si incumplen, se bloquea Facturar.

### REQ-10 `confirmed`
> Fuente: backend/jormat-api/src/items/dto/item.dto.ts:163 + backend/jormat-api/src/items/items.repository.ts:1094 (oil) + backend/jormat-api/src/items/csv/items-import.util.ts:216 (bloqueoDescuento)

Se unifican oil y bloqueo_descuento (T-10): migración que copia oil=1 a bloqueo_descuento=1 y elimina oil; los lectores (dto/listado backend, builder front, Compras, Guías, Solicitudes) leen bloqueo_descuento y el badge 'Aceite' pasa a 'Bloqueo descuento'. Marcar Bloqueo de descuento en la ficha (pantalla o CSV) bloquea los descuentos en la factura también en el API.

### REQ-11 `confirmed`
> Fuente: backend/jormat-api/src/sales/facturas.controller.ts:16 + backend/jormat-api/seeds/05_sales_capabilities.ts:11

Se agrega la capability sales.invoices:commercial-override, validada en el backend; owner e internal-admin la reciben y se crea el rol 'Super Usuario' con esa capability.

### REQ-12 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:219 + backend/jormat-api/src/sales/calc-totals.ts:17

Con la capability, el Super Usuario puede superar el tope de la ficha y descontar repuestos con Bloqueo Descuento en la línea, usar descuento general hasta 80%, bajar el precio bajo el vigente y ver costo y utilidad. NO puede facturar a cliente bloqueado ni sin stock, ni combinar descuento general con un repuesto con Bloqueo Descuento.

### REQ-13 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.repository.ts:468 (net_unit_cost) + backend/jormat-api/migrations/20261003000013_invoice_items_discount_unit_cost.ts:20

Solo con la capability se calcula y muestra la utilidad por línea y total: monto = venta neta después de descuentos - costo neto * cantidad; porcentaje = monto / venta neta * 100. El costo es el costo neto de compra de la ficha al emitir, guardado en la línea. Sin costo o venta 0 -> 'Sin dato'.

### ENF-01 `confirmed` `enforcement`
> Fuente: backend/jormat-api/src/providers/providers.controller.ts:18 + backend/jormat-api/seeds/09_internal_admin_grant_all.ts:21

El override se implementa reusando el RBAC existente (CapabilitiesGuard + @RequireCapability + seeds de catálogo/roles con grant-all), sin re-inventar el modelo de permisos.

### ENF-02 `confirmed` `enforcement`
> Fuente: backend/jormat-api/src/sales/dto/line-item.dto.ts:18 + front/jormat-front/src/lib/schemas/ventas.ts:333

El contrato de línea del front (lineItemSchema) y del backend (LineItemDto) se mantienen espejo (mismos campos de regla: bloqueoDescuento, descuentoPorcentaje, minPrice, maxDiscount) y los consumidores listados (Compras, Guías, Solicitudes de pedido) no se rompen con la unificación T-10.

### ENF-03 `confirmed` `enforcement`
> Fuente: front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.tsx:403 + backend/jormat-api/src/sales/calc-totals.ts:6

El gate de Facturar del front reusa los gates existentes (cliente bloqueado, stock de la bodega de origen, precio bajo piso) y el cálculo/tope server-side sigue siendo la fuente de verdad (calc-totals), sin duplicar reglas.
## Tasks

#### S1.T1 — T-10 de punta a punta: migración que copia oil=1 a bloqueo_descuento=1 y elimina la columna oil; actualizar lectores backend (item.dto.ts expone bloqueoDescuento en el listado y quita oil; items.repository.ts proyección/mapeo del listado y detalle; line-item.dto.ts reemplaza oil por bloqueoDescuento) y front (LineItemsTable badge 'Bloqueo descuento' y regla, TransactionBuilder hasOilItem→hasBloqueoDescuentoItem, origen-factura, PurchaseInvoiceBuilder, CrearGuiaDespachoView, CrearSolicitudPedidoView, schemas items.ts/ventas.ts). Aditiva y reversible.
Contrato: rollback: git revert del commit; correr 'npm --prefix backend/jormat-api run migrate:rollback' para deshacer la migración (down re-agrega oil y copia de vuelta).. Status: done

#### S1.T1.1 — Backend: migración nueva que hace UPDATE items SET bloqueo_descuento=1 WHERE oil=1 y dropColumn oil (down reversible) más item.dto.ts (listado expone bloqueoDescuento, quita oil), items.repository.ts (proyecta items.bloqueo_descuento en el listado, quita i.oil; RawItemRow/mapRowToDto) y line-item.dto.ts (bloqueoDescuento en vez de oil).
Contrato: rollback: npm --prefix backend/jormat-api run migrate:rollback y git revert de los archivos.. Status: done

#### S1.T1.2 — Front: LineItemsTable usa bloqueoDescuento (badge 'Bloqueo descuento', descuento de línea deshabilitado), TransactionBuilder bloquea el general con hasBloqueoDescuentoItem, origen-factura siembra bloqueoDescuento, PurchaseInvoiceBuilder/CrearGuiaDespachoView/CrearSolicitudPedidoView cambian oil→bloqueoDescuento y los schemas items.ts/ventas.ts quedan alineados.
Contrato: rollback: git revert de los archivos del front.. Status: done

#### S1.T2 — Reglas de descuento y precio mínimo en backend y front: descuento de línea en % sobre neto*cantidad con tope ds_max_discount de la ficha (reemplaza el monto sin tope de JOR-167 CA-09; la pantalla acepta monto y lo convierte a % para validar); descuento general máximo 20% y excluyente con descuentos de línea; repuesto con Bloqueo Descuento sin descuento de línea y bloqueando el general; precio mínimo = nm_net vigente (no net_price) con refresh y aviso al retomar borrador.
Contrato: rollback: git revert del commit de la task.. Status: done

#### S1.T2.1 — Backend: SalesService/calc-totals validan el descuento de línea como % (descuento/(precio*cantidad)*100) contra ds_max_discount de la ficha (fetch por itemId), el descuento general 0-20% excluyente con línea, el Bloqueo Descuento (bloquea línea y general) y el precio mínimo nm_net, con mensajes claros.
Contrato: rollback: git revert de sales/calc-totals.ts y sales.service.ts.. Status: done

#### S1.T2.2 — Front: lineItemSchema/LineItemsTable validan el descuento de línea convirtiendo monto a porcentaje contra ds_max_discount; deshabilitan/avisan el general >20% o combinado con línea; gate de precio bajo nm_net reusando el gate existente de TransactionBuilder; al retomar borrador se re-siembra minPrice desde el nm_net vigente y se avisa si cambió.
Contrato: rollback: git revert de los componentes/schema del front.. Status: done

#### S1.T3 — Regresión de la etapa: tests del front de los módulos Compras, Guías de despacho y Solicitudes de pedido (consumidores de oil/bloqueo_descuento) y de los nuevos casos de descuento/bloqueo.
Contrato: rollback: git revert del commit de tests.. Status: done

#### S1.T3.1 — Tests del módulo Compras (PurchaseInvoiceBuilder): el builder lee bloqueoDescuento (ya no oil), muestra el badge 'Bloqueo descuento' y no rompe sus casos previos tras quitar la columna oil.
Contrato: rollback: git revert del archivo de test de PurchaseInvoiceBuilder.. Status: done

#### S1.T3.2 — Tests del módulo Guías de despacho (CrearGuiaDespachoView): lectura de bloqueoDescuento en el listado/builder y no regresión tras la unificación oil→bloqueo_descuento.
Contrato: rollback: git revert del archivo de test de CrearGuiaDespachoView.. Status: done

#### S1.T3.3 — Tests del módulo Solicitudes de pedido (CrearSolicitudPedidoView): lectura de bloqueoDescuento y no regresión tras la unificación oil→bloqueo_descuento.
Contrato: rollback: git revert del archivo de test de CrearSolicitudPedidoView.. Status: done

#### S1.T3.4 — Tests nuevos de reglas de descuento/bloqueo en el front: descuento de línea convertido a % contra ds_max_discount y rechazo sobre el tope, general >20% o combinado con línea bloqueado, Bloqueo Descuento sin descuento de línea ni general, y gate de precio bajo nm_net.
Contrato: rollback: git revert de los archivos de test nuevos del front.. Status: done

#### S2.T1 — Validación en el API de cliente bloqueado (customers.locked) al emitir, con el mensaje 'Cliente bloqueado contactar gerencia, imposible generar venta', y de crédito solo 30 o 60 días con vencimiento = fecha del documento + días corridos (rechaza credito_90).
Contrato: rollback: git revert de sales.service.ts y factura-input.dto.ts.. Status: done

#### S2.T1.1 — Backend: en SalesService.issueFactura, rechazar la emisión cuando el cliente tiene customers.locked=1, con el mensaje de referencia 'Cliente bloqueado contactar gerencia, imposible generar venta'; la validación corre server-side aunque el request no venga del builder.
Contrato: rollback: git revert de sales.service.ts.. Status: done

#### S2.T1.2 — Backend: restringir el crédito a 30 o 60 días en FORMA_PAGO_VALUES/factura-input.dto.ts y calcular el vencimiento como fecha del documento + días corridos en sales.service.ts; un plazo distinto (credito_90) responde rechazo.
Contrato: rollback: git revert de factura-input.dto.ts y sales.service.ts.. Status: done

#### S2.T1.3 — Tests unitarios/servicio de ambas reglas: cliente locked=1 rechazado con el mensaje de referencia y locked=0 emitido; credito_30/credito_60 con su vencimiento y credito_90 rechazado.
Contrato: rollback: git revert de los archivos de test de sales.service.. Status: done

#### S2.T2 — Stock de la bodega de origen en la emisión: si cantidad > disponible (incluido 0) se rechaza identificando item y cantidad ('Su sucursal no cuenta con stock suficiente para item ID {id} - Actual: {n}'); descuento de stock, cabecera y líneas en UNA transacción con control concurrente (lock) que evita stock negativo, con movimientos de inventario referenciados a la factura e idempotentes ante reintentos. Aplica también a Super Usuario.
Contrato: rollback: git revert de sales.repository.ts/sales.service.ts y rollback de la migración de movimientos si se creó tabla.. Status: done

#### S2.T2.1 — Validación de stock por bodega de origen en la emisión, con el mensaje que identifica el item y el stock actual disponible (incluido 0); aplica también a Super Usuario.
Contrato: rollback: git revert de sales.service.ts.. Status: done

#### S2.T2.2 — Descuento transaccional de stock con lock (evita negativo bajo concurrencia) y movimientos de inventario referenciados a la factura, idempotentes ante reintentos (sin duplicados).
Contrato: rollback: git revert de sales.repository.ts y rollback de la migración de movimientos.. Status: done

#### S2.T3 — Clonado desde otro documento (factura/guía): los valores copiados pasan por las reglas de descuento/precio/bloqueo y, si incumplen, se bloquea Facturar (el API rechaza y el front no habilita el botón).
Contrato: rollback: git revert de sales.service.ts (resolverLineas).. Status: done

#### S2.T3.1 — Backend: en resolverLineas (sales.service.ts), aplicar a las líneas copiadas desde factura/guía las mismas reglas de descuento de línea, general, Bloqueo Descuento y precio mínimo nm_net; si alguna incumple, rechazar la emisión con mensaje claro.
Contrato: rollback: git revert de sales.service.ts (resolverLineas).. Status: done

#### S2.T3.2 — Front: origen-factura.ts siembra los valores clonados y reusa los gates existentes; si los valores copiados incumplen (descuento sobre tope, precio bajo nm_net o Bloqueo Descuento), no habilita Facturar y confía en el rechazo del API.
Contrato: rollback: git revert de origen-factura.ts y el builder.. Status: done

#### S2.T3.3 — Tests de clonado: clonar desde factura/guía con descuento sobre el tope de la ficha bloquea la emisión (P-01.2.D1) y clonar con valores dentro de las reglas emite sin cambios.
Contrato: rollback: git revert de los archivos de test de clonado.. Status: done

#### S2.T4 — Regresión de la etapa: casos de API de los criterios 6, 7, 11 y 30 (cliente bloqueado, stock 3 vs cantidad 5 y concurrencia, crédito solo 30/60, y Bloqueo de descuento marcado en ficha/CSV que bloquea en la factura).
Contrato: rollback: git revert del commit de tests.. Status: done

#### S2.T4.1 — Criterio 6: emisión directa al API (sin builder) con cliente locked=1 rechazada con el mensaje de referencia, y con locked=0 emitida (prueba que el front no evade la regla).
Contrato: rollback: git revert del archivo de test del criterio 6.. Status: done

#### S2.T4.2 — Criterio 7: bodega de origen con stock 3 vs cantidad 5 rechazada con el mensaje 'Su sucursal no cuenta con stock suficiente...', stock 0 rechazado, happy stock 10/cantidad 5 dejando stock 5, y concurrencia (dos emisiones con stock para una) que no deja item_qty negativo.
Contrato: rollback: git revert del archivo de test del criterio 7.. Status: done

#### S2.T4.3 — Criterio 11: credito_30 y credito_60 con su vencimiento (fecha del documento + días corridos) aceptados y credito_90 rechazado.
Contrato: rollback: git revert del archivo de test del criterio 11.. Status: done

#### S2.T4.4 — Criterio 30: marcar Bloqueo de descuento en la ficha (pantalla o CSV) bloquea los descuentos en la factura también en el API, y un item con oil=1 previo queda con bloqueo_descuento=1 tras la migración.
Contrato: rollback: git revert del archivo de test del criterio 30.. Status: done

#### S3.T1 — Capability sales.invoices:commercial-override en el catálogo (seeds/05_sales_capabilities.ts) y rol 'Super Usuario' (seed nuevo, workspace-scoped) con esa capability; owner e internal-admin la reciben por los grant-all (seeds 09/16) sin mantenimiento manual. Validación en el backend del override por capability.
Contrato: rollback: git revert del seed; re-seed o borrar el rol/capability creados.. Status: done

#### S3.T2 — Override del Super Usuario y utilidad de punta a punta (backend + front).
Contrato: rollback: git revert del commit de la task.. Status: done

#### S3.T2.1 — Backend: con la capability, saltear el tope de ficha, permitir descuento de línea sobre repuestos con Bloqueo Descuento, descuento general hasta 80% y precio bajo el vigente; seguir rechazando cliente bloqueado/sin stock y general combinado con Bloqueo Descuento. Calcular utilidad por línea y total (monto = venta neta - costo neto*cantidad; % = monto/venta neta*100), persistir el costo neto de compra de la ficha al emitir en invoice_items.net_unit_cost (snapshot) y exponer costo/utilidad solo con la capability; 'Sin dato' sin costo o venta 0.
Contrato: rollback: git revert de sales.service.ts/sales.repository.ts/calc-totals.ts y el DTO.. Status: done

#### S3.T2.2 — Front: exponer el flag de la capability al builder, habilitar los overrides permitidos (topes, precio, 80% general) y mostrar costo y utilidad por línea y total cuando está presente, manteniendo el gate de Facturar para bloqueado/sin stock y general+Bloqueo Descuento.
Contrato: rollback: git revert de los componentes y hooks del builder.. Status: done

#### S3.T3 — Regresión de la etapa: casos de los criterios 10, 26 y 28 (Super Usuario baja precio/supera topes y ve utilidad pero no factura bloqueado/sin stock; venta 100.000/costo 80.000 -> $20.000 20% y el cambio posterior del costo no altera la factura; general 80% acepta, 81% rechaza; usuario común límite 20%).
Contrato: rollback: git revert del commit de tests.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: El API rechaza emitir una factura a un cliente con customers.locked = 1, aunque el front saltee el botón Facturar. Mensaje de referencia: 'Cliente bloqueado contactar gerencia, imposible generar venta'.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: El descuento de línea se valida en porcentaje sobre precio neto * cantidad contra el tope ds_max_discount de la ficha del item; la pantalla puede seguir aceptando un importe, que se convierte a porcentaje para validar. Reemplaza el descuento de línea como monto sin tope de JOR-
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
3. **Qué:** Verificar en runtime: Se unifican oil y bloqueo_descuento (T-10): migración que copia oil=1 a bloqueo_descuento=1 y elimina oil; los lectores (dto/listado backend, builder front, Compras, Guías, Solicitudes) leen bloqueo_descuento y el badge 'Aceite' pasa a 'Bloqueo descuento'. Marcar Bloqueo de des
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Sessions

### Session 1 · T3 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T3
- [x] S1.T3.1
- [x] S1.T3.2
- [x] S1.T3.3
- [x] S1.T3.4

**Gate (auto)**: En el builder de facturas un repuesto con Bloqueo Descuento muestra el badge 'Bloqueo descuento' y no admite descuento de línea ni general; el API rechaza descuento de línea sobre ds_max_discount, general >20% o combinado con línea, y precio < nm_net. Tests de Compras, Guías y Solicitudes de pedido verdes.

### Session 2 · T3 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T2
- [x] S2.T2.1
- [x] S2.T2.2
- [x] S2.T3
- [x] S2.T3.1
- [x] S2.T3.2
- [x] S2.T3.3
- [x] S2.T4
- [x] S2.T4.1
- [x] S2.T4.2
- [x] S2.T4.3
- [x] S2.T4.4

**Gate (auto)**: El API rechaza emitir con cliente bloqueado, stock insuficiente en la bodega de origen (incluido 0) y crédito distinto de 30/60, con los mensajes de referencia; dos emisiones simultáneas con stock para una no dejan stock negativo; el clonado que incumple reglas se bloquea.

### Session 3 · T2 · iterate

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T2.1
- [x] S3.T2.2
- [x] S3.T3

**Gate (auto)**: Con la capability sales.invoices:commercial-override (rol Super Usuario), el usuario supera el tope de la ficha, descuenta repuestos con Bloqueo Descuento, usa 80% general, baja el precio y ve costo/utilidad (venta 100.000 / costo 80.000 -> $20.000 = 20%); no factura a bloqueado/sin stock ni combina general con Bloqueo Descuento; el usuario común queda en 20%.

### Session 4 · T0 · open
