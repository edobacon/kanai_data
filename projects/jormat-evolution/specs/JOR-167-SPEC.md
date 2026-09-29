---
id: JOR-167-SPEC
project: jormat-evolution
ticket: JOR-167
status: approved
---

# JOR-167 — Builder de factura cliente: descuento a monto, borrador reactivado y scaffold de buscador (slice ejecutable)

## Resumen ejecutivo

Se corrige el builder de facturas de cliente en los 4 puntos del canon que no dependen de negocio: el descuento de linea pasa de PORCENTAJE a IMPORTE MONETARIO parametrizando el control compartido con Compras (LineItemsTable/calc-line), se reactiva "Guardar borrador" (flag + tests + 3ra opcion del guard de salida) y se agrega el scaffold del boton "Filtros" y el control "Ver mas items" del buscador; ademas se expone el flag de credito del cliente en el popup (columnas ya existentes en customers). NO se toca: el nucleo de CA-07 (recuperar nota de pedido/recepcion/O.C. + cantidades ya facturadas), la regla de bloqueo de CA-11/CA-13, la separacion Origen/Bodega de CA-05, el contenido del filtro y "Actualizar receptor" (todos dependientes de definiciones de negocio D1-D4), ni la persistencia real (backend en stub). Se verifica con la regresion de Compras en porcentaje intacta, los tests de descuento en monto, los tests de borrador re-habilitados y el guard de 3 opciones, mas la inspeccion visual del builder de Ventas. ADVERTENCIA: el control de lineas y el calculo son compartidos con Compras — el cambio es parametrizado, no un reemplazo; si se hiciera global romperia Compras (consumidor `frontend/src/lib/builder/calc-line.ts:3` y los builders de compras).

## Requirements

### REQ-01 `confirmed`
> Fuente: front/jormat-front/src/lib/ventas/calc-totals.ts (consumidor: frontend/src/lib/builder/calc-line.ts:3); front/jormat-front/src/lib/schemas/ventas.ts

El descuento por linea en el builder de Ventas se ingresa y se muestra como IMPORTE MONETARIO (no porcentaje): el total de linea es cantidad x precio menos el monto de descuento, y el resumen (Subtotal, Descuento, Neto, IVA, Total) se recalcula al agregar, eliminar o editar cantidad/descuento.

### REQ-02 `confirmed` `enforcement`
> Fuente: front/jormat-front/src/components/shared/builder/LineItemsTable/*; frontend/src/lib/builder/calc-line.ts:3

El control compartido de lineas y el calculo de totales aceptan el modo de descuento por parametro (monto para Ventas, porcentaje para Compras) sin duplicar el componente ni bifurcar por dominio dentro de el.

### REQ-03 `confirmed`
> Fuente: flag SHOW_SAVE_DRAFT en front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.tsx (consumidores del flag: frontend/src/components/compras/builder/PurchaseInvoiceBuilder.extra.test.tsx:94,208,303; PurchaseInvoiceBuilder.guard.test.tsx:5,82)

El builder de Ventas ofrece "Guardar borrador" como accion visible junto a Cancelar y Facturar: conserva los datos ingresados sin emitir y permite retomarlos; el texto cambia a "Actualizar borrador" cuando se edita un borrador ya guardado.

### REQ-04 `confirmed`
> Fuente: guard de CA-15 en front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.tsx

El guard de salida por cambios sin guardar ofrece TRES opciones: descartar, seguir editando y guardar borrador; elegir guardar borrador guarda y luego sale.

### REQ-05 `confirmed`
> Fuente: Pedido de cambio 2026-09-19 (decision del dev): CA-08 pasa de scaffold a filtros reales server-side; HU seccion 3 (Productos) + CA-08; patron del listado de catalogo JOR-068

El buscador de items del builder de VENTAS expone un boton "Filtros" que abre un panel con filtros REALES server-side: marca (exacta, con opciones desde el facet de marcas de GET /inventario/items/summary), estado de stock (en_stock | bajo_stock | sin_stock), categoria (id de catalogo), proveedor (CSV de ids de proveedor) y ofertas (toggle de solo items en oferta). Los filtros se pasan al hook useItems (GET /inventario/items, que ya los soporta server-side), se combinan con la busqueda libre, y aplicar o cambiar un filtro vuelve a la primera pagina y reconsulta al backend. La paginacion numerada se reemplaza por un control "Ver mas items" que agrega el siguiente tramo de resultados a la lista ya visible y opera sobre el resultado ya filtrado.

### REQ-06 `confirmed`
> Fuente: front/jormat-front/src/components/ventas/builder/CustomerNotificationDialog/CustomerNotificationDialog.tsx; frontend/src/services/api/payments/customers.ts:131

El popup "Informacion adicional / Documentos pendientes" muestra el indicador de credito del cliente seleccionado, tomado de las columnas ya existentes de customers (is_credit, locked, category) expuestas en el SELECT y en el DTO de clientes.

### REQ-07 `confirmed` `enforcement`
> Fuente: [DOC:MAQ-frontend-5e3d338c-html] Crear factura cliente - builder (JOR-167) - maqueta canonica

El bloque de acciones de cierre reproduce la maqueta: Cancelar como boton ghost, "Guardar borrador" como boton outline y "Facturar" como boton primario, en ese orden de izquierda a derecha.

### REQ-08 `confirmed` `enforcement`
> Fuente: [DOC:MAQ-frontend-5e3d338c-html] Crear factura cliente - builder (JOR-167) - maqueta canonica

El input de descuento de cada linea de "Items del documento" se presenta como importe monetario con numeros tabulares (mono), conforme a la maqueta: sin simbolo de porcentaje en la celda ni en el encabezado.

### REQ-09 `confirmed` `enforcement`
> Fuente: [DOC:MAQ-frontend-5e3d338c-html] Crear factura cliente - builder (JOR-167) - maqueta canonica

El buscador de items reproduce las affordances de la maqueta: encabezado "Buscar items", el boton "Filtros" con estilo outline junto al campo de busqueda, las columnas ID / Descripcion / Referencias / Precio, el boton "+" por fila y el control "Ver mas items" al pie de la lista.

### REQ-10 `confirmed` `enforcement`
> Fuente: [DOC:MAQ-frontend-5e3d338c-html] Crear factura cliente - builder (JOR-167) - maqueta canonica

El resumen de cierre reproduce las filas de la maqueta en orden: Subtotal, Descuento, Neto, IVA y Total, con el Total destacado y los importes en numeros tabulares.

### REQ-11 `confirmed` `enforcement`
> Fuente: [DOC:MAQ-frontend-5e3d338c-html] Crear factura cliente - builder (JOR-167) - maqueta canonica

El indicador de credito del popup del cliente se rinde como badge con el estilo de estado de la maqueta (no como texto plano), dentro del bloque de datos del cliente del popup.

### REQ-12 `confirmed` `enforcement`
> Fuente: KB RULE-frontend-001, RULE-frontend-002, RULE-frontend-010, RULE-frontend-013

Cada componente tocado o creado conserva la organizacion carpeta-por-componente bajo src/components/ con su test y su story co-locados, y los tests siguen los patrones del stack dual-project (jsdom + storybook).

### REQ-13 `confirmed`
> Fuente: Adenda 5 (DECISION 1 - borrador a nivel stub) + CA-12; limite entre tickets: 'Ticket hermano: el LISTADO (CA-01..04) se gestiona en JOR-166'

El flujo de borrador funciona de punta a punta contra el stub en memoria DENTRO DEL ALCANCE DE ESTE TICKET: createDraft agrega el documento al store en memoria con estado 'borrador', filterDocumentos lo devuelve con ese estado al consultarlo (criterio verificable aqui, a nivel servicio/API del stub), se puede retomar ese borrador en el builder y facturarlo lo transiciona a 'emitida'. La VISTA del listado de borradores (componente de listado y su render de la columna de estado) queda cubierta en JOR-166, ticket hermano: este ticket no depende de ese componente para verificarse.

### REQ-14 `confirmed`
> Fuente: Request > Adenda 5 (2026-09-18) > DECISION 1: "se agrega ese estado al DTO; hoy estadoComercial = aceptado/pendiente/rechazado no lo contempla"

El DTO del documento expone el estado del documento en un eje propio ('borrador' | 'emitida'), separado de estadoComercial (aceptado/pendiente/rechazado), que conserva sus valores y semantica actuales.

### REQ-15 `confirmed`
> Fuente: Adenda 5 - DECISION 1 (createDraft/issueFactura/filterDocumentos en sales.service.ts)

El stub de ventas persiste en memoria: createDraft agrega el documento a STUB_DOCUMENTOS con estado 'borrador' (en lugar de devolver el objeto fijo STUB_CREATED), issueFactura transiciona el documento existente a 'emitida', y filterDocumentos admite filtrar por estado del documento.

### REQ-16 `confirmed`
> Fuente: Request > Adenda 5 (2026-09-18) > DECISION 1 (LIMITE HONESTO) y MODELO DE DATOS FALTANTE (diferido, para el ticket de backend)

La persistencia REAL del borrador queda explicitamente FUERA DE ALCANCE: no se crean las tablas documentos/invoices ni documento_lineas, ni un repo Knex; el store sigue siendo el stub en memoria, que no sobrevive a reinicios ni es multi-instancia.

### REQ-17 `confirmed`
> Fuente: Request > Criterios de aceptacion CA-10, CA-11, CA-13, CA-14, CA-15 + Adenda 1: "Verificacion de CA-05, CA-06, CA-10, CA-11, CA-13, CA-14, CA-15 (ya conformes al canon en el stack)"

El builder de Ventas conserva sin regresiones el comportamiento ya conforme al canon: CA-10 (forma de pago, interruptor de despacho, receptor, observacion y datos del cliente), CA-11 (advertencia de stock insuficiente por bodega identificando producto y disponibilidad), CA-13 (Facturar exige cliente, fecha, origen, bodega, tipo de documento, forma de pago y al menos un producto valido, informa los faltantes y evita doble submit), CA-14 (exito informa el resultado y refleja el documento en el listado; error conserva el formulario sin anunciar emision exitosa) y CA-15 (guard de salida con confirmacion ante cambios sin guardar), tras los cambios de descuento a monto, borrador y buscador de items.

### REQ-18 `confirmed`
> Fuente: Request > Adenda 2 (CA-05 se difiere: "En esta iteracion se deja solo verificacion del campo actual; NO se construye la separacion") + Adenda 3 y Adenda 4 (Origen = Bodega = Sucursal en legacy y stack)

El campo unico `origen` del builder (codigo de bodega) sigue operando tal cual: la separacion de Origen y Bodega en dos campos queda DIFERIDA y no se construye en esta iteracion; la verificacion se limita a que el formulario carga, valida y envia correctamente con el campo unico actual.

### REQ-19 `confirmed` `enforcement`
> Fuente: Pedido de cambio 2026-09-19: "ALCANCE SOLO VENTAS ... No duplicar el componente; parametrizarlo"; ItemSearchPanel en components/shared/builder/ItemSearchPanel/*

El panel de filtros se incorpora al componente compartido ItemSearchPanel PARAMETRIZADO por prop/flag, sin duplicar el componente ni bifurcar por dominio dentro de el: solo el buscador de VENTAS lo habilita. El buscador de items de COMPRAS conserva en esta iteracion su comportamiento actual (busqueda libre, sin boton ni panel de filtros, sin parametros de filtro en sus consultas).
## Tasks

#### S1.T1 — Fijar el comportamiento ACTUAL antes de tocar nada: escribir los casos de regresion del calculo de linea/totales con descuento en PORCENTAJE (Ventas hoy y Compras), y de los consumidores del schema de ventas (DocumentoDetalleView.tsx:192-198,260 y backend-api/src/sales/dto/factura-input.dto.ts:32,125). Dejar la suite en verde como baseline.
Contrato: rollback: git checkout -- los archivos de test agregados/modificados en este paso; no hay cambio de codigo productivo que revertir.. Status: done

#### S1.T2 — Auditar los consumidores del control compartido y del calculo antes de parametrizar: enumerar quien consume LineItemsTable, calc-totals.ts y calc-line.ts (frontend/src/lib/builder/calc-line.ts:3 + builders de compras) y el schema de ventas (lib/schemas/ventas.ts), y documentar en el ticket que tocar y que se protege con default retrocompatible. Sin cambios de codigo.
Contrato: rollback: Nada que revertir (solo analisis registrado en el ticket).. Status: done

#### S1.T3 — Parametrizar el modo de descuento en el calculo y en el schema: agregar el modo (monto | porcentaje) con default porcentaje en el calculo de linea/totales y el campo de descuento como importe en el schema de ventas, con la validacion de monto <= subtotal de linea, rechazo de negativos y cantidad <= 0. No duplicar la funcion por dominio.
Contrato: rollback: git revert del commit de este paso; el default porcentaje deja el calculo en su comportamiento previo para todos los consumidores.. Status: done

#### S1.T4 — Parametrizar LineItemsTable para que reciba el modo de descuento y rinda el input como importe (prefijo monetario, numeros tabulares, sin "%") en Ventas, manteniendo porcentaje como default para Compras. Pasar el modo monto desde TransactionBuilder de Ventas.
Contrato: rollback: git revert del commit; sin el parametro el componente vuelve al render de porcentaje para todos.. Status: done

#### S1.T5 — Tests y regresion del descuento a monto: casos happy/boundary/error de REQ-01 (17000/15000, descuento = subtotal, descuento > subtotal, cantidad <= 0, descuento vacio), el caso de REQ-02 (mismo componente en ambos modos, sin duplicados) y la fidelidad de REQ-08 (columna Descuento sin "%"). Re-correr la baseline de Compras sin editar sus expectativas.
Contrato: rollback: git checkout -- los archivos de test de este paso.. Status: done

#### S2.T1 — Fijar el comportamiento ACTUAL del guard de salida y de las acciones de cierre antes de cambiarlos: casos de regresion de las dos opciones del dialogo (descartar / seguir editando), del set de acciones de Compras y de la paginacion numerada actual del buscador. Baseline en verde.
Contrato: rollback: git checkout -- los archivos de test de este paso.. Status: done

#### S2.T2 — En el DTO del documento de ventas agregar el eje de estado propio del documento ('borrador' | 'emitida') sin tocar estadoComercial (aceptado/pendiente/rechazado), y propagar el tipo al contrato que consume el front del listado y del builder.
Contrato: rollback: Revertir el campo de estado del documento en el DTO y sus tipos derivados; el contrato vuelve a exponer solo estadoComercial.. Status: done

#### S2.T3 — En sales.service.ts hacer que createDraft agregue el documento a STUB_DOCUMENTOS con estado 'borrador' (reemplazando el retorno fijo STUB_CREATED), que issueFactura busque el documento por id y lo transicione a 'emitida' devolviendo error si no existe, y que filterDocumentos acepte un filtro opcional por estado del documento manteniendo los filtros actuales.
Contrato: rollback: Restaurar createDraft al retorno fijo STUB_CREATED, issueFactura a su comportamiento previo y filterDocumentos sin el filtro de estado.. Status: done

#### S2.T4 — Tests del stub de ventas: createDraft agrega un documento en 'borrador', issueFactura lo transiciona a 'emitida' sin duplicar, issueFactura sobre id inexistente falla, filterDocumentos filtra por estado y sin filtro devuelve todo.
Contrato: rollback: Eliminar el archivo de tests del stub de ventas.. Status: done

#### S2.T5 — Reactivar "Guardar borrador" en Ventas: poner SHOW_SAVE_DRAFT en true en TransactionBuilder, re-habilitar los describe.skip de borrador y ajustar los tests que referenciaban el flag en false (PurchaseInvoiceBuilder.extra.test.tsx:94,208,303 y .guard.test.tsx:5,82) al estado esperado, sin cambiar el comportamiento de Compras.
Contrato: rollback: Volver SHOW_SAVE_DRAFT a false y re-skippear los describe de borrador (git revert del commit); las acciones de cierre vuelven a Cancelar/Facturar.. Status: done

#### S2.T6 — Activar SHOW_SAVE_DRAFT=true en TransactionBuilder.tsx y afinar el texto del boton entre 'Guardar borrador' y 'Actualizar borrador' segun si se edita un borrador ya guardado, verificando el cableado existente de handleSaveDraft, useCreateFacturaDraft y los toasts.
Contrato: rollback: Volver SHOW_SAVE_DRAFT a false y revertir el texto condicional del boton.. Status: done

#### S2.T7 — Agregar "Guardar borrador" como tercera opcion del dialogo de cambios sin guardar (guardar y luego salir), conservando descartar y seguir editando, y el texto "Actualizar borrador" cuando se edita un borrador ya guardado.
Contrato: rollback: git revert del commit; el dialogo vuelve a dos opciones.. Status: done

#### S2.T8 — Test del eje de estado del documento separado de estadoComercial: agregar tests que verifiquen (1) que un borrador serializa estado='borrador' en el DTO, (2) que el enum de estadoComercial conserva intactos sus valores originales (aceptado/pendiente/rechazado) sin incorporar 'borrador' ni 'emitida', y (3) que un documento emitido queda con estado='emitida' manteniendo su estadoComercial en el eje propio.
Contrato: rollback: Eliminar el archivo de tests agregado (o revertir el bloque agregado al archivo de tests del DTO/servicio de ventas); no toca codigo de produccion.. Status: done

#### S2.T9 — Integracion end-to-end del borrador contra el stub, acotada a este ticket: guardar borrador desde el builder crea el documento en el store en memoria con estado 'borrador', filterDocumentos lo devuelve con ese estado (criterio verificable en este ticket, a nivel servicio/API del stub), se puede retomar el borrador en el builder y facturarlo lo transiciona a 'emitida'. NO se verifica el render del listado de facturas: la vista de borradores en el listado se cubre en JOR-166 (ticket hermano); esta task no debe montar ni depender de ese componente.
Contrato: rollback: Eliminar el test de integracion del flujo de borrador.. Status: done

#### S2.T10 — Activar SHOW_SAVE_DRAFT=true en TransactionBuilder.tsx y afinar el texto del boton entre 'Guardar borrador' y 'Actualizar borrador' segun si se edita un borrador ya guardado, verificando el cableado existente de handleSaveDraft, useCreateFacturaDraft y los toasts.
Contrato: rollback: Volver SHOW_SAVE_DRAFT a false y revertir el texto condicional del boton.. Status: done

#### S2.T11 — Integracion end-to-end del borrador contra el stub, acotada a este ticket: guardar borrador desde el builder crea el documento en el store en memoria con estado 'borrador', filterDocumentos lo devuelve con ese estado (criterio verificable en este ticket, a nivel servicio/API del stub), se puede retomar el borrador en el builder y facturarlo lo transiciona a 'emitida'. NO se verifica el render del listado de facturas: la vista de borradores en el listado se cubre en JOR-166 (ticket hermano); esta task no debe montar ni depender de ese componente.
Contrato: rollback: Eliminar el test de integracion del flujo de borrador.. Status: done

#### S2.T12 — Test del eje de estado del documento separado de estadoComercial: agregar tests que verifiquen (1) que un borrador serializa estado='borrador' en el DTO, (2) que el enum de estadoComercial conserva intactos sus valores originales (aceptado/pendiente/rechazado) sin incorporar 'borrador' ni 'emitida', y (3) que un documento emitido queda con estado='emitida' manteniendo su estadoComercial en el eje propio.
Contrato: rollback: Eliminar el archivo de tests agregado (o revertir el bloque agregado al archivo de tests del DTO/servicio de ventas); no toca codigo de produccion.. Status: done

#### S2.T13 — Parametrizar ItemSearchPanel con una prop/flag de filtros (default off) que habilite el boton 'Filtros' y el panel; el builder de Ventas la activa y el de Compras no la pasa. Sin logica de filtrado todavia: solo el punto de extension y el render condicional del boton.
Contrato: rollback: Revertir el commit: quitar la prop del componente y de la invocacion en el builder de Ventas; ItemSearchPanel vuelve al render unico sin boton de Filtros.. Status: done

#### S2.T14 — Extender el hook useItems (y su capa listItems) para aceptar y propagar a GET /inventario/items los cinco parametros de filtro: marca, estado de stock, categoria, proveedor (CSV de ids) y ofertas, combinables con el termino de busqueda libre y con la paginacion existente.
Contrato: rollback: Revertir el commit: el hook vuelve a su firma anterior (solo busqueda + paginacion); ninguna llamada envia parametros de filtro.. Status: done

#### S2.T15 — Consumir el facet de marcas de GET /inventario/items/summary para poblar las opciones del filtro de marca (carga y estados de carga/error del facet).
Contrato: rollback: Revertir el commit: el filtro de marca queda sin fuente de opciones y se retira del panel junto con la llamada al summary.. Status: done

#### S2.T16 — Construir el panel de filtros del buscador de Ventas con los cinco controles (marca, estado de stock, categoria, proveedor, toggle de ofertas) mas la accion de limpiar filtros, cableado al estado de filtros del buscador.
Contrato: rollback: Revertir el commit: el boton 'Filtros' queda sin panel asociado y el estado de filtros se elimina del componente.. Status: done

#### S2.T17 — Conectar el estado de filtros a la consulta: aplicar o cambiar cualquier filtro resetea la pagina a la primera y reconsulta al backend reemplazando la lista; 'Ver mas items' conserva los filtros vigentes y acumula el tramo siguiente sobre el resultado filtrado.
Contrato: rollback: Revertir el commit: la consulta ignora el estado de filtros y 'Ver mas items' vuelve a paginar solo sobre busqueda libre.. Status: done

#### S3.T1 — Scaffold del buscador segun la maqueta: boton "Filtros" (outline, abre/cierra el panel vacio, sin criterios) y control "Ver mas items" que acumula el siguiente tramo sobre los resultados visibles, reemplazando la paginacion numerada en ItemSearchPanel. Mantener una sola fuente de useFieldArray en el padre (RULE-frontend-012).
Contrato: rollback: git revert del commit; el panel vuelve a la paginacion numerada y sin boton Filtros.. Status: done

#### S3.T2 — Parametrizar ItemSearchPanel con una prop/flag de filtros (default off) que habilite el boton 'Filtros' y el panel; el builder de Ventas la activa y el de Compras no la pasa. Sin logica de filtrado todavia: solo el punto de extension y el render condicional del boton.
Contrato: rollback: Revertir el commit: quitar la prop del componente y de la invocacion en el builder de Ventas; ItemSearchPanel vuelve al render unico sin boton de Filtros.. Status: done

#### S3.T3 — Extender el hook useItems (y su capa listItems) para aceptar y propagar a GET /inventario/items los cinco parametros de filtro: marca, estado de stock, categoria, proveedor (CSV de ids) y ofertas, combinables con el termino de busqueda libre y con la paginacion existente.
Contrato: rollback: Revertir el commit: el hook vuelve a su firma anterior (solo busqueda + paginacion); ninguna llamada envia parametros de filtro.. Status: done

#### S3.T4 — Consumir el facet de marcas de GET /inventario/items/summary para poblar las opciones del filtro de marca (carga y estados de carga/error del facet).
Contrato: rollback: Revertir el commit: el filtro de marca queda sin fuente de opciones y se retira del panel junto con la llamada al summary.. Status: done

#### S3.T5 — Construir el panel de filtros del buscador de Ventas con los cinco controles (marca, estado de stock, categoria, proveedor, toggle de ofertas) mas la accion de limpiar filtros, cableado al estado de filtros del buscador.
Contrato: rollback: Revertir el commit: el boton 'Filtros' queda sin panel asociado y el estado de filtros se elimina del componente.. Status: done

#### S3.T6 — Conectar el estado de filtros a la consulta: aplicar o cambiar cualquier filtro resetea la pagina a la primera y reconsulta al backend reemplazando la lista; 'Ver mas items' conserva los filtros vigentes y acumula el tramo siguiente sobre el resultado filtrado.
Contrato: rollback: Revertir el commit: la consulta ignora el estado de filtros y 'Ver mas items' vuelve a paginar solo sobre busqueda libre.. Status: done

#### S3.T7 — Verificacion de no-alcance de persistencia real: revisar el diff completo del ticket y confirmar que NO agrega migraciones, tablas (documentos/invoices, documento_lineas/invoice_lines) ni repositorio Knex para documentos, y que el unico store sigue siendo el stub en memoria; comprobar empiricamente que al reiniciar el backend el borrador guardado desaparece (guardar borrador -> verlo via filterDocumentos -> reiniciar el proceso -> el borrador ya no esta), dejando registrada la evidencia del limite declarado.
Contrato: rollback: Tarea de verificacion sin cambios en el codigo: no requiere rollback; si se hubiese dejado algun archivo de evidencia o script temporal, eliminarlo (queda fuera del repo, en scratchpad).. Status: done

#### S3.T8 — Tests del buscador de Ventas con filtros server-side: aplicar marca y estado de stock verificando los parametros recibidos por listItems y el acotamiento de la lista; combinacion de filtro con busqueda libre en una misma llamada; reset a primera pagina al aplicar un filtro estando en pagina >1; limpiar filtros restaura el listado; 'Ver mas items' conserva los filtros; resultado vacio oculta 'Ver mas items'; opciones de marca tomadas del facet del summary.
Contrato: rollback: Revertir el commit: eliminar el archivo/bloques de test agregados.. Status: done

#### S3.T9 — Test de regresion del buscador de items de COMPRAS: no renderiza boton ni panel de 'Filtros', sus consultas a listItems no incluyen parametros de filtro, y el mismo componente montado con la prop habilitada si renderiza el boton (parametrizacion, no duplicacion).
Contrato: rollback: Revertir el commit: eliminar el archivo/bloques de test agregados.. Status: done

#### S3.T10 — Gate de la sesion de verificacion: ejecutar typecheck, lint y la suite completa del builder de Ventas en los dos proyectos de test (jsdom + storybook) y exigir verde en todos. Reportar suites con estado y totales; clasificar cualquier falla como introducida (corregir) vs preexistente (reportar y detener). La sesion no cierra con rojo.
Contrato: rollback: No aplica: el gate solo ejecuta comandos de verificacion y no modifica archivos.. Status: done

#### S4.T1 — Exponer el flag de credito del cliente: agregar is_credit, locked y category al SELECT y al DTO de clientes (columnas ya existentes en customers) y renderizar el indicador como badge en CustomerNotificationDialog, tolerando is_credit undefined.
Contrato: rollback: git revert del commit; el DTO vuelve a sus campos previos y el popup deja de mostrar el badge.. Status: done

#### S4.T2 — Tests y regresion de la sesion: borrador (happy, "Actualizar borrador", error que conserva datos), guard de 3 opciones + salida directa sin cambios + isDirty al montar (RULE-frontend-003), buscador (Filtros abre/cierra, "Ver mas items" acumula, no se rinde sin mas resultados, agregar item sigue funcionando), popup de credito (true/false/undefined y cambio de cliente), fidelidades REQ-07/REQ-09/REQ-10/REQ-11, y stories co-locadas corriendo en el proyecto storybook sin "No QueryClient set". Re-correr la baseline de Compras.
Contrato: rollback: git checkout -- los archivos de test/story de este paso.. Status: done

#### S5.T1 — Test de verificacion de CA-10 sobre TransactionBuilder: el bloque de cierre registra forma de pago, interruptor de Despacho, receptor y observacion, y renderiza los datos del cliente seleccionado (RUT, telefono, ciudad, direccion) con el boton 'Actualizar receptor' presente; assertions con valores concretos del cliente mockeado, no solo existencia.
Contrato: rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.. Status: done

#### S5.T2 — Test de verificacion de CA-11: con una linea cuya cantidad supera el stock de la bodega seleccionada, el builder muestra la advertencia identificando el producto y el stock disponible; cambiar de bodega recalcula la advertencia. Deja constancia del comportamiento actual (bloquea Facturar) sin modificarlo, por depender de la definicion D3.
Contrato: rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.. Status: done

#### S5.T3 — Test de verificacion de CA-13: Facturar exige cliente, fecha, origen, bodega, tipo de documento, forma de pago y al menos un producto valido; con faltantes no envia e informa cuales son; con el formulario completo, dos clicks consecutivos producen una sola llamada (anti doble submit) y el boton queda deshabilitado mientras procesa. Se ejecuta con el descuento por monto ya aplicado.
Contrato: rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.. Status: done

#### S5.T4 — Test de verificacion de CA-14: una facturacion exitosa informa el resultado y el documento queda reflejado en el listado (stub en memoria); un fallo del backend conserva los datos del formulario y muestra el error sin mensaje de exito. Cubre tambien el caso de facturar un borrador previamente guardado.
Contrato: rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.. Status: done

#### S5.T5 — Test de verificacion de CA-15 tras la reactivacion del borrador: con cambios sin guardar, Cancelar abre el guard con las TRES opciones (descartar, seguir editando, guardar borrador); descartar sale sin guardar, seguir editando conserva el formulario y guardar borrador guarda y luego sale. Sin cambios sin guardar, Cancelar sale directo.
Contrato: rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.. Status: done

#### S5.T6 — Test de verificacion del campo `origen` actual (CA-05 diferido): el builder monta con un unico control de origen alimentado por el catalogo de bodegas, su valor (codigo de bodega) es el que consumen la validacion de Facturar y el calculo de disponibilidad de stock, y no existe un segundo campo separado de Bodega. Documenta explicitamente que la separacion Origen/Bodega queda fuera de esta iteracion.
Contrato: rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.. Status: done

#### S5.T7 — Verificacion de no-alcance de persistencia real: revisar el diff completo del ticket y confirmar que NO agrega migraciones, tablas (documentos/invoices, documento_lineas/invoice_lines) ni repositorio Knex para documentos, y que el unico store sigue siendo el stub en memoria; comprobar empiricamente que al reiniciar el backend el borrador guardado desaparece (guardar borrador -> verlo via filterDocumentos -> reiniciar el proceso -> el borrador ya no esta), dejando registrada la evidencia del limite declarado.
Contrato: rollback: Tarea de verificacion sin cambios en el codigo: no requiere rollback; si se hubiese dejado algun archivo de evidencia o script temporal, eliminarlo (queda fuera del repo, en scratchpad).. Status: done

#### S5.T8 — Tests del buscador de Ventas con filtros server-side: aplicar marca y estado de stock verificando los parametros recibidos por listItems y el acotamiento de la lista; combinacion de filtro con busqueda libre en una misma llamada; reset a primera pagina al aplicar un filtro estando en pagina >1; limpiar filtros restaura el listado; 'Ver mas items' conserva los filtros; resultado vacio oculta 'Ver mas items'; opciones de marca tomadas del facet del summary.
Contrato: rollback: Revertir el commit: eliminar el archivo/bloques de test agregados.. Status: done

#### S5.T9 — Test de regresion del buscador de items de COMPRAS: no renderiza boton ni panel de 'Filtros', sus consultas a listItems no incluyen parametros de filtro, y el mismo componente montado con la prop habilitada si renderiza el boton (parametrizacion, no duplicacion).
Contrato: rollback: Revertir el commit: eliminar el archivo/bloques de test agregados.. Status: done

#### S5.T10 — Gate de la sesion de verificacion: ejecutar typecheck, lint y la suite completa del builder de Ventas en los dos proyectos de test (jsdom + storybook) y exigir verde en todos. Reportar suites con estado y totales; clasificar cualquier falla como introducida (corregir) vs preexistente (reportar y detener). La sesion no cierra con rojo.
Contrato: rollback: No aplica: el gate solo ejecuta comandos de verificacion y no modifica archivos.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: El buscador de items del builder expone un boton "Filtros" (scaffold: abre el panel, sin criterios de filtrado definidos) y reemplaza la paginacion numerada por un control "Ver mas items" que agrega el siguiente tramo de resultados a la lista ya visible.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: El bloque de acciones de cierre reproduce la maqueta: Cancelar como boton ghost, "Guardar borrador" como boton outline y "Facturar" como boton primario, en ese orden de izquierda a derecha.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
3. **Qué:** Verificar en runtime: El input de descuento de cada linea de "Items del documento" se presenta como importe monetario con numeros tabulares (mono), conforme a la maqueta: sin simbolo de porcentaje en la celda ni en el encabezado.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
4. **Qué:** Verificar en runtime: El buscador de items reproduce las affordances de la maqueta: encabezado "Buscar items", el boton "Filtros" con estilo outline junto al campo de busqueda, las columnas ID / Descripcion / Referencias / Precio, el boton "+" por fila y el control "Ver mas items" al pie de la lista
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
5. **Qué:** Verificar en runtime: El resumen de cierre reproduce las filas de la maqueta en orden: Subtotal, Descuento, Neto, IVA y Total, con el Total destacado y los importes en numeros tabulares.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
6. **Qué:** Verificar en runtime: El indicador de credito del popup del cliente se rinde como badge con el estilo de estado de la maqueta (no como texto plano), dentro del bloque de datos del cliente del popup.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
7. **Qué:** Verificar en runtime: Cada componente tocado o creado conserva la organizacion carpeta-por-componente bajo src/components/ con su test y su story co-locados, y los tests siguen los patrones del stack dual-project (jsdom + storybook).
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-13 (add) `confirmed`: El flujo de borrador funciona de punta a punta contra el stub en memoria: guardar borrador crea el documento, el listado lo muestra con esta
- REQ-14 (add) `confirmed`: El DTO del documento expone el estado del documento en un eje propio ('borrador' | 'emitida'), separado de estadoComercial (aceptado/pendien
- REQ-15 (add) `confirmed`: El stub de ventas persiste en memoria: createDraft agrega el documento a STUB_DOCUMENTOS con estado 'borrador' (en lugar de devolver el obje
- REQ-16 (add) `confirmed`: La persistencia REAL del borrador queda explicitamente FUERA DE ALCANCE: no se crean las tablas documentos/invoices ni documento_lineas, ni 

**Tasks agregadas:**

- S2: En el DTO del documento de ventas agregar el eje de estado propio del documento ('borrador' | 'emitida') sin tocar estadoComercial (aceptado/pendiente/rechazado), y propagar el tipo al contrato que consume el front del listado y del builder. (valida: REQ-14; rollback: Revertir el campo de estado del documento en el DTO y sus tipos derivados; el contrato vuelve a exponer solo estadoComercial.)
- S2: En sales.service.ts hacer que createDraft agregue el documento a STUB_DOCUMENTOS con estado 'borrador' (reemplazando el retorno fijo STUB_CREATED), que issueFactura busque el documento por id y lo transicione a 'emitida' devolviendo error si no existe, y que filterDocumentos acepte un filtro opcional por estado del documento manteniendo los filtros actuales. (valida: REQ-15, REQ-13; rollback: Restaurar createDraft al retorno fijo STUB_CREATED, issueFactura a su comportamiento previo y filterDocumentos sin el filtro de estado.)
- S2: Tests del stub de ventas: createDraft agrega un documento en 'borrador', issueFactura lo transiciona a 'emitida' sin duplicar, issueFactura sobre id inexistente falla, filterDocumentos filtra por estado y sin filtro devuelve todo. (valida: REQ-15, REQ-13, test; rollback: Eliminar el archivo de tests del stub de ventas.)
- S2: Activar SHOW_SAVE_DRAFT=true en TransactionBuilder.tsx y afinar el texto del boton entre 'Guardar borrador' y 'Actualizar borrador' segun si se edita un borrador ya guardado, verificando el cableado existente de handleSaveDraft, useCreateFacturaDraft y los toasts. (valida: REQ-03, REQ-13; rollback: Volver SHOW_SAVE_DRAFT a false y revertir el texto condicional del boton.)
- S2: Test de integracion del flujo de borrador en el builder contra el stub: guardar borrador muestra el toast de exito y el documento aparece como 'borrador' en el listado; al retomarlo el boton dice 'Actualizar borrador'; al facturarlo el documento pasa a 'emitida' sin duplicarse. (valida: REQ-13, REQ-03, test; rollback: Eliminar el test de integracion del flujo de borrador.)

### Enmienda 2
**REQs:**

- REQ-14 (edit) `confirmed`: El DTO del documento expone el estado del documento en un eje propio ('borrador' | 'emitida'), separado de estadoComercial (aceptado/pendien
- REQ-16 (edit) `confirmed`: La persistencia REAL del borrador queda explicitamente FUERA DE ALCANCE: no se crean las tablas documentos/invoices ni documento_lineas, ni 
- REQ-17 (add) `confirmed`: El builder de Ventas conserva sin regresiones el comportamiento ya conforme al canon: CA-10 (forma de pago, interruptor de despacho, recepto
- REQ-18 (add) `confirmed`: El campo unico `origen` del builder (codigo de bodega) sigue operando tal cual: la separacion de Origen y Bodega en dos campos queda DIFERID

**Tasks agregadas:**

- S3: Test de verificacion de CA-10 sobre TransactionBuilder: el bloque de cierre registra forma de pago, interruptor de Despacho, receptor y observacion, y renderiza los datos del cliente seleccionado (RUT, telefono, ciudad, direccion) con el boton 'Actualizar receptor' presente; assertions con valores concretos del cliente mockeado, no solo existencia. (valida: REQ-17, test; rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.)
- S3: Test de verificacion de CA-11: con una linea cuya cantidad supera el stock de la bodega seleccionada, el builder muestra la advertencia identificando el producto y el stock disponible; cambiar de bodega recalcula la advertencia. Deja constancia del comportamiento actual (bloquea Facturar) sin modificarlo, por depender de la definicion D3. (valida: REQ-17, test; rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.)
- S3: Test de verificacion de CA-13: Facturar exige cliente, fecha, origen, bodega, tipo de documento, forma de pago y al menos un producto valido; con faltantes no envia e informa cuales son; con el formulario completo, dos clicks consecutivos producen una sola llamada (anti doble submit) y el boton queda deshabilitado mientras procesa. Se ejecuta con el descuento por monto ya aplicado. (valida: REQ-17, test; rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.)
- S3: Test de verificacion de CA-14: una facturacion exitosa informa el resultado y el documento queda reflejado en el listado (stub en memoria); un fallo del backend conserva los datos del formulario y muestra el error sin mensaje de exito. Cubre tambien el caso de facturar un borrador previamente guardado. (valida: REQ-17, REQ-13, test; rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.)
- S3: Test de verificacion de CA-15 tras la reactivacion del borrador: con cambios sin guardar, Cancelar abre el guard con las TRES opciones (descartar, seguir editando, guardar borrador); descartar sale sin guardar, seguir editando conserva el formulario y guardar borrador guarda y luego sale. Sin cambios sin guardar, Cancelar sale directo. (valida: REQ-17, REQ-04, test; rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.)
- S3: Test de verificacion del campo `origen` actual (CA-05 diferido): el builder monta con un unico control de origen alimentado por el catalogo de bodegas, su valor (codigo de bodega) es el que consumen la validacion de Facturar y el calculo de disponibilidad de stock, y no existe un segundo campo separado de Bodega. Documenta explicitamente que la separacion Origen/Bodega queda fuera de esta iteracion. (valida: REQ-18, test; rollback: git checkout -- el archivo de test agregado (o borrarlo si es nuevo); no toca codigo de produccion.)
- S3: Gate de la sesion de verificacion: ejecutar typecheck, lint y la suite completa del builder de Ventas en los dos proyectos de test (jsdom + storybook) y exigir verde en todos. Reportar suites con estado y totales; clasificar cualquier falla como introducida (corregir) vs preexistente (reportar y detener). La sesion no cierra con rojo. (valida: REQ-17, REQ-18, test; rollback: No aplica: el gate solo ejecuta comandos de verificacion y no modifica archivos.)

### Enmienda 3
**REQs:**

- REQ-13 (edit) `confirmed`: El flujo de borrador funciona de punta a punta contra el stub en memoria DENTRO DEL ALCANCE DE ESTE TICKET: createDraft agrega el documento 

**Tasks agregadas:**

- S3: Verificacion de no-alcance de persistencia real: revisar el diff completo del ticket y confirmar que NO agrega migraciones, tablas (documentos/invoices, documento_lineas/invoice_lines) ni repositorio Knex para documentos, y que el unico store sigue siendo el stub en memoria; comprobar empiricamente que al reiniciar el backend el borrador guardado desaparece (guardar borrador -> verlo via filterDocumentos -> reiniciar el proceso -> el borrador ya no esta), dejando registrada la evidencia del limite declarado. (valida: REQ-16, test; rollback: Tarea de verificacion sin cambios en el codigo: no requiere rollback; si se hubiese dejado algun archivo de evidencia o script temporal, eliminarlo (queda fuera del repo, en scratchpad).)
- S2: Test del eje de estado del documento separado de estadoComercial: agregar tests que verifiquen (1) que un borrador serializa estado='borrador' en el DTO, (2) que el enum de estadoComercial conserva intactos sus valores originales (aceptado/pendiente/rechazado) sin incorporar 'borrador' ni 'emitida', y (3) que un documento emitido queda con estado='emitida' manteniendo su estadoComercial en el eje propio. (valida: REQ-14, test; rollback: Eliminar el archivo de tests agregado (o revertir el bloque agregado al archivo de tests del DTO/servicio de ventas); no toca codigo de produccion.)

**Task ops:**

- edit S2.T11 { desc="Integracion end-to-end del borrador contra el stub, acotada a este ticket: guardar borrador desde el builder crea el documento en el store en memoria con estado 'borrador', filterDocumentos lo devuelve con ese estado (criterio verificable en este ticket, a nivel servicio/API del stub), se puede retomar el borrador en el builder y facturarlo lo transiciona a 'emitida'. NO se verifica el render del listado de facturas: la vista de borradores en el listado se cubre en JOR-166 (ticket hermano); esta task no debe montar ni depender de ese componente.", validates=["REQ-13","REQ-15"] }

### Enmienda 4
**REQs:**

- REQ-05 (edit) `confirmed`: El buscador de items del builder de VENTAS expone un boton "Filtros" que abre un panel con filtros REALES server-side: marca (exacta, con op
- REQ-19 (add) `confirmed`: El panel de filtros se incorpora al componente compartido ItemSearchPanel PARAMETRIZADO por prop/flag, sin duplicar el componente ni bifurca

**Tasks agregadas:**

- S2: Parametrizar ItemSearchPanel con una prop/flag de filtros (default off) que habilite el boton 'Filtros' y el panel; el builder de Ventas la activa y el de Compras no la pasa. Sin logica de filtrado todavia: solo el punto de extension y el render condicional del boton. (valida: REQ-19, REQ-05; rollback: Revertir el commit: quitar la prop del componente y de la invocacion en el builder de Ventas; ItemSearchPanel vuelve al render unico sin boton de Filtros.)
- S2: Extender el hook useItems (y su capa listItems) para aceptar y propagar a GET /inventario/items los cinco parametros de filtro: marca, estado de stock, categoria, proveedor (CSV de ids) y ofertas, combinables con el termino de busqueda libre y con la paginacion existente. (valida: REQ-05; rollback: Revertir el commit: el hook vuelve a su firma anterior (solo busqueda + paginacion); ninguna llamada envia parametros de filtro.)
- S2: Consumir el facet de marcas de GET /inventario/items/summary para poblar las opciones del filtro de marca (carga y estados de carga/error del facet). (valida: REQ-05; rollback: Revertir el commit: el filtro de marca queda sin fuente de opciones y se retira del panel junto con la llamada al summary.)
- S2: Construir el panel de filtros del buscador de Ventas con los cinco controles (marca, estado de stock, categoria, proveedor, toggle de ofertas) mas la accion de limpiar filtros, cableado al estado de filtros del buscador. (valida: REQ-05; rollback: Revertir el commit: el boton 'Filtros' queda sin panel asociado y el estado de filtros se elimina del componente.)
- S2: Conectar el estado de filtros a la consulta: aplicar o cambiar cualquier filtro resetea la pagina a la primera y reconsulta al backend reemplazando la lista; 'Ver mas items' conserva los filtros vigentes y acumula el tramo siguiente sobre el resultado filtrado. (valida: REQ-05; rollback: Revertir el commit: la consulta ignora el estado de filtros y 'Ver mas items' vuelve a paginar solo sobre busqueda libre.)
- S3: Tests del buscador de Ventas con filtros server-side: aplicar marca y estado de stock verificando los parametros recibidos por listItems y el acotamiento de la lista; combinacion de filtro con busqueda libre en una misma llamada; reset a primera pagina al aplicar un filtro estando en pagina >1; limpiar filtros restaura el listado; 'Ver mas items' conserva los filtros; resultado vacio oculta 'Ver mas items'; opciones de marca tomadas del facet del summary. (valida: REQ-05, test; rollback: Revertir el commit: eliminar el archivo/bloques de test agregados.)
- S3: Test de regresion del buscador de items de COMPRAS: no renderiza boton ni panel de 'Filtros', sus consultas a listItems no incluyen parametros de filtro, y el mismo componente montado con la prop habilitada si renderiza el boton (parametrizacion, no duplicacion). (valida: REQ-19, test; rollback: Revertir el commit: eliminar el archivo/bloques de test agregados.)
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: En el builder de Ventas (front/jormat-front, TransactionBuilder de Ventas > Items del documento) la columna Descuento se ingresa y se muestra como importe monetario con numeros tabulares y sin '%': al editar cantidad o descuento cambian el total de linea y el resumen (Subtotal, Descuento, Neto, IVA, Total); se rechazan cantidad <= 0 y descuento mayor al subtotal de linea. El builder de Compras sigue con descuento en porcentaje usando el MISMO componente (LineItemsTable) y calculo (calc-totals/calc-line) parametrizados. Verificable en pantalla y con la suite de tests de Ventas + la baseline de Compras en verde, sin editar expectativas de Compras.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5
- [x] S2.T6
- [x] S2.T7
- [x] S2.T8
- [x] S2.T9
- [x] S2.T10
- [x] S2.T11
- [x] S2.T12
- [x] S2.T13
- [x] S2.T14
- [x] S2.T15
- [x] S2.T16
- [x] S2.T17

**Gate (auto)**: Flujo de borrador de punta a punta contra el stub: en el builder aparece 'Guardar borrador' (outline) entre Cancelar (ghost) y Facturar (primario); al guardarlo, el servicio agrega el documento a STUB_DOCUMENTOS con estado 'borrador' y filterDocumentos lo devuelve al filtrar por ese estado (verificable a nivel servicio/API del stub); el borrador se retoma en el builder, el boton pasa a 'Actualizar borrador' y al facturar el documento transiciona a 'emitida'. El dialogo de cambios sin guardar ofrece TRES opciones (descartar / seguir editando / guardar borrador) y guardar sale despues de guardar. El DTO expone estado ('borrador' | 'emitida') en eje propio, con estadoComercial (aceptado/pendiente/rechazado) intacto. Verificable en la vista del builder y con los tests del stub, del DTO y de integracion (no se monta el listado: eso es JOR-166).

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4
- [x] S3.T5
- [x] S3.T6
- [x] S3.T7
- [x] S3.T8
- [x] S3.T9
- [x] S3.T10

**Gate (auto)**: Buscador 'Buscar items' del builder de VENTAS con filtros reales server-side: el boton 'Filtros' (outline, junto al campo de busqueda) abre un panel con marca (opciones desde el facet de GET /inventario/items/summary), estado de stock, categoria, proveedor y toggle de ofertas, mas limpiar filtros; aplicar o cambiar un filtro vuelve a la primera pagina y reconsulta GET /inventario/items combinando con la busqueda libre, y 'Ver mas items' (que reemplaza la paginacion numerada) acumula el tramo siguiente sobre el resultado ya filtrado conservando los filtros. Las columnas ID / Descripcion / Referencias / Precio y el '+' por fila siguen operativos. El buscador de COMPRAS no muestra el boton ni el panel y no envia parametros de filtro (mismo componente, prop off por default). Verificable en ambas vistas y en las consultas de red.

### Session 4 · T1 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2

**Gate (auto)**: Popup 'Informacion adicional / Documentos pendientes': al seleccionar un cliente se muestra el indicador de credito como badge de estado dentro del bloque de datos del cliente, alimentado por is_credit/locked/category ya presentes en customers y ahora expuestos en el SELECT y el DTO; cambiar de cliente actualiza el badge y con is_credit undefined no rompe. Cierre de la iteracion: suite completa en verde con la regresion del builder de Ventas (CA-10, CA-11, CA-13, CA-14, CA-15 sin cambios de comportamiento y el campo unico `origen` cargando, validando y enviando igual), la baseline de Compras re-corrida sin editar expectativas, las fidelidades de maqueta (acciones de cierre, columna Descuento sin '%', affordances del buscador, orden del resumen con Total destacado, badge de credito) y las stories co-locadas corriendo en el proyecto storybook sin 'No QueryClient set'.

### Session 5 · T0 · continue

**Tasks:**
- [x] S5.T1
- [x] S5.T2
- [x] S5.T3
- [x] S5.T4
- [x] S5.T5
- [x] S5.T6
- [x] S5.T7
- [x] S5.T8
- [x] S5.T9
- [x] S5.T10
