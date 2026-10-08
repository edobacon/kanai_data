---
id: JOR-175-SPEC
project: jormat-evolution
ticket: JOR-175
status: draft
---

# JOR-175 · Facturas cliente (feedback) 7/7 · Envío SII simulado, Reenviar y acciones por estado

## Resumen ejecutivo

Se hace: al Facturar, la factura se emite y se envía de inmediato al SII simulado. Cada intento simulado guarda su resultado (aceptado, aceptado con reparos o rechazado) y su fecha. Se muestra el aviso 'Documento enviado al SII (simulado)' y se vuelve al listado. Se agrega la acción Reenviar, que registra un intento nuevo sin modificar el documento. Se arma el menú de acciones por fila según el estado, y el API rechaza cada acción fuera de los estados permitidos. Los rótulos de simulación aparecen en toda vista que muestra folio o estado SII. No se hace: integración real con el SII (XML, firma, CAF, folios autorizados, consulta de estado) ni capabilities nuevas, porque Reenviar reutiliza sales.invoices:issue. Cómo se sabe que funciona: Facturar termina en el listado con el aviso y con un intento registrado; Reenviar suma un intento y deja intactos folio, montos y estado; las acciones fuera de estado devuelven error del API y no aparecen en el menú; Entrega Rápida y Formato Bodega quedan disponibles sin esperar el resultado SII. Tamaño: 2 sesiones (unas 5 h). ADVERTENCIAS: (1) Anular, Entrega Rápida y Formato Bodega dependen de 5/7 y 6/7. Si esos tickets no están integrados, el menú solo enlaza las acciones que ya existan y no las implementa aquí. (2) Hay rutas duplicadas frontend/ y monorepo/front/jormat-front/; se toca solo la canónica. Datos a confirmar antes de ejecutar: (a) la ruta canónica del backend de ventas: el request cita backend/jormat-api/src/sales/sales.service.ts:523, pero el código indexado muestra backend/src/ (confirmar en el árbol del repo); (b) el runner de tests del frontend (vitest o jest) y el del backend (jest), en los package.json de backend/ y frontend/; (c) el nombre de la tabla de intentos SII y la herramienta de migraciones (knex u otra), en backend/seeds y en la carpeta de migraciones; (d) si 5/7 y 6/7 ya están mergeados en la rama base (git log).

## Requirements

#### REQ-01 `inferred`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:523 (issueFactura, ruta a confirmar); backend/jormat-api/src/sales/dto/documento.dto.ts:20 (estados demo)
> Necesidad: build
Al Facturar, el servidor emite el documento y ejecuta en la misma operación un envío SII simulado. El envío persiste un intento con resultado demo (aceptado, aceptado con reparos o rechazado) y fecha. La UI muestra 'Documento enviado al SII (simulado)' y navega al listado de facturas cliente. Qué: envío inmediato como en el legacy (T-14 / P-15.1). Por qué: el cliente espera el mismo flujo del legacy, y hoy issueFactura solo asigna el folio en memoria.

#### REQ-02 `inferred`
> Fuente: backend/seeds/05_sales_capabilities.ts:40 (sales.invoices:issue)
> Necesidad: build
Reenviar SII es una acción disponible sobre facturas emitidas para usuarios con sales.invoices:issue, cualquiera sea su estado SII. Registra un intento simulado nuevo sin alterar folio, montos, líneas ni estado comercial del documento. Por qué: el cliente necesita reintentar envíos rechazados como en el legacy, y hoy no existe ni envío ni reenvío.

#### REQ-03 `inferred`
> Fuente: Doc de decisiones sección 4.8 (P-15.1.D1); acciones de Bodega de 6/7
> Necesidad: build
Ninguna acción de Bodega (Entrega Rápida, Formato Bodega) espera ni consulta el resultado SII. Basta con que la factura esté emitida (P-15.1.D1).

#### REQ-04 `inferred`
> Fuente: backend/seeds/05_sales_capabilities.ts:26,33,40; frontend/src/components/ventas/detail/DocumentoDetalleView/DocumentoDetalleView.stories.tsx:36
> Necesidad: build
Cada fila del listado de facturas cliente muestra un menú de acciones filtrado por estado y permiso (R-06, R-07). Visualizar: siempre. Clonar: siempre, con sales.invoices:edit. Editar: solo Borrador. Anular: emitidas no anuladas, con sales.documents:void. Reenviar SII: emitidas. Entrega Rápida: emitidas no entregadas. Formato Bodega: emitidas.

#### REQ-05 `inferred`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:523 (ruta a confirmar); backend/test/e2e/roles-config.e2e-spec.ts:57
> Necesidad: build
El API valida estado y permiso en cada acción del menú y rechaza la acción fuera de sus estados, aunque la UI no la ofrezca. Por qué: criterio de aceptación explícito; el filtro solo en la UI no protege.

#### REQ-06 `inferred`
> Fuente: frontend/src/components/shared/SimulacionSiiBanner/SimulacionSiiBanner.stories.tsx:4; frontend/src/components/compras/builder/PurchaseInvoiceBuilder.tsx:409 (uso existente)
> Necesidad: build
Toda vista que muestra folio o estado SII (builder de factura cliente, detalle y listado) muestra el banner de simulación, y el folio y el estado SII llevan el rótulo 'simulado' (R-21, criterio 22).

#### REQ-07 `confirmed`
> Fuente: frontend/src/components/shared/SimulacionSiiBanner/SimulacionSiiBanner.stories.tsx:4; backend/src/purchases/facturas-proveedor.controller.spec.ts:41; frontend/src/components/compras/builder/PurchaseInvoiceBuilder.extra.test.tsx:231
> Necesidad: build
Se reutiliza lo existente: SimulacionSiiBanner (sin un componente nuevo de banner), los estados demo de documento.dto.ts:20 (sin un enum nuevo) y la extensión de issueFactura (sin un segundo flujo de emisión). Los consumidores de issueFactura en compras no cambian de firma.

#### REQ-08 `confirmed`
> Fuente: backend/seeds/05_sales_capabilities.ts:26,33,40; backend/seeds/10_demo_roles_users.ts:41
> Necesidad: build
Los permisos usan las capabilities existentes sembradas en 05_sales_capabilities.ts (sales.invoices:issue para Reenviar, sales.invoices:edit y sales.documents:void). No se agrega ninguna capability ni se modifican los roles demo.

## Tasks

#### S1.T1 — Backend: persistir los intentos SII simulados y enviar de inmediato al emitir. Se extiende issueFactura (sales.service.ts:523, ruta a confirmar) sin cambiar su firma.
Contrato: rollback: git revert de los commits de la task y down de la migración de sii_envio_intento. Status: pending
Subtasks: 2 (ejecutar hojas; el padre espera a todas)

#### S1.T1.1 — Migración create de sii_envio_intento (documento_id, resultado con los valores demo de documento.dto.ts:20, fecha, origen). Sin columnas en el documento.
Contrato: rollback: Down de la migración (drop table). Status: pending

#### S1.T1.2 — Simulador SII acotado a un solo documento por llamada: elige un estado demo y registra el intento con la fecha actual. Al final de issueFactura se invoca dentro de la misma transacción.
Contrato: rollback: git revert del simulador y del cambio en issueFactura. Status: pending

#### S1.T2 — Backend: endpoint Reenviar. Valida que la factura esté emitida y que el usuario tenga sales.invoices:issue (capability existente, 05_sales_capabilities.ts:40), y registra un intento con origen 'reenvio' sin escribir sobre el documento.
Contrato: rollback: git revert del endpoint y del método de servicio. Status: pending

#### S1.T3 — Frontend: Facturar muestra el aviso 'Documento enviado al SII (simulado)' y navega al listado. La acción Reenviar de la fila llama al endpoint y refresca el estado SII mostrado.
Contrato: rollback: git revert de los cambios del builder de factura cliente y del listado. Status: pending

#### S1.T4 — Tests y regresión de la sesión: specs de backend para la emisión con intento, el rollback de la emisión fallida y Reenviar (happy, 4xx en Borrador, 403 sin permiso); test de frontend del aviso y la navegación; regresión de issueFactura en compras.
Contrato: rollback: git revert de los archivos de test agregados. Status: pending

#### S2.T1 — Backend: guardas de estado por acción (Editar solo Borrador; Anular emitida no anulada; Reenviar emitida; Entrega Rápida emitida no entregada; Formato Bodega emitida, sin consultar el resultado SII) con 4xx y un mensaje claro. Se reutilizan las capabilities sales.invoices:edit, sales.invoices:issue y sales.documents:void.
Contrato: rollback: git revert de las guardas. Status: pending

#### S2.T2 — Frontend: menú de acciones por fila en el listado de facturas cliente, con visibilidad derivada del estado y de los permisos del usuario. Entrega Rápida, Formato Bodega y Anular enlazan a las acciones de 5/7 y 6/7 si existen; no se reimplementan.
Contrato: rollback: git revert del componente del menú. Status: pending

#### S2.T3 — Frontend: montar SimulacionSiiBanner (componente existente) en el builder, el detalle (DocumentoDetalleView) y el listado de facturas cliente, y agregar el rótulo 'simulado' al folio y al estado SII. No se crea un banner nuevo.
Contrato: rollback: git revert de los cambios de las vistas. Status: pending

#### S2.T4 — Tests y regresión de la sesión: matriz de menú por estado y permiso (Borrador, emitida, anulada, sin edit); 4xx del API por acción fuera de estado y 200 en el caso válido; Bodega habilitada con un intento rechazado; banner y rótulo en el detalle y el listado; regresión de PurchaseInvoiceBuilder y roles-config.
Contrato: rollback: git revert de los archivos de test agregados. Status: pending

## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por JOR-175 · Facturas cliente (feedback) 7/7 · Envío SII simulado, Reenviar y acciones por estado
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

- tipo: create | objetos: sii_envio_intento (nombre propuesto, a confirmar): id, documento_id, resultado, fecha, origen (emision|reenvio) | destructivo: no | tarea: S1.T1 | rollback: Ejecutar el down de la migración, que hace drop de la tabla nueva; no afecta datos previos porque es una tabla aislada
