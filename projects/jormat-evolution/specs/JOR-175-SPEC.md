---
id: JOR-175-SPEC
project: jormat-evolution
ticket: JOR-175
status: approved
---

# JOR-175 · Facturas cliente (feedback) 7/7 · Envío SII simulado, Reenviar y acciones por estado

## Resumen ejecutivo

Se hace: al Facturar, la factura se emite y se envía de inmediato al SII simulado. Cada intento simulado guarda su resultado (aceptado, aceptado con reparos o rechazado) y su fecha. Se muestra el aviso 'Documento enviado al SII (simulado)' y se vuelve al listado. Se agrega la acción Reenviar, que registra un intento nuevo sin modificar el documento. Se arma el menú de acciones por fila según el estado, y el API rechaza cada acción fuera de los estados permitidos. Los rótulos de simulación aparecen en toda vista que muestra folio o estado SII. No se hace: integración real con el SII (XML, firma, CAF, folios autorizados, consulta de estado) ni capabilities nuevas, porque Reenviar reutiliza sales.invoices:issue. Cómo se sabe que funciona: Facturar termina en el listado con el aviso y con un intento registrado; Reenviar suma un intento y deja intactos folio, montos y estado; las acciones fuera de estado devuelven error del API y no aparecen en el menú; Entrega Rápida y Formato Bodega quedan disponibles sin esperar el resultado SII. Tamaño: 2 sesiones (unas 5 h). ADVERTENCIAS: (1) Anular, Entrega Rápida y Formato Bodega dependen de 5/7 y 6/7. Si esos tickets no están integrados, el menú solo enlaza las acciones que ya existan y no las implementa aquí. (2) Hay rutas duplicadas frontend/ y monorepo/front/jormat-front/; se toca solo la canónica. Datos a confirmar antes de ejecutar: (a) la ruta canónica del backend de ventas: el request cita backend/jormat-api/src/sales/sales.service.ts:523, pero el código indexado muestra backend/src/ (confirmar en el árbol del repo); (b) el runner de tests del frontend (vitest o jest) y el del backend (jest), en los package.json de backend/ y frontend/; (c) el nombre de la tabla de intentos SII y la herramienta de migraciones (knex u otra), en backend/seeds y en la carpeta de migraciones; (d) si 5/7 y 6/7 ya están mergeados en la rama base (git log).

## Requirements

### REQ-01 `inferred`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:523 (issueFactura, ruta a confirmar); backend/jormat-api/src/sales/dto/documento.dto.ts:20 (estados demo)

Al Facturar, el servidor emite el documento y ejecuta en la misma operación un envío SII simulado. El envío persiste un intento con resultado demo (aceptado, aceptado con reparos o rechazado) y fecha. La UI muestra 'Documento enviado al SII (simulado)' y navega al listado de facturas cliente. Qué: envío inmediato como en el legacy (T-14 / P-15.1). Por qué: el cliente espera el mismo flujo del legacy, y hoy issueFactura solo asigna el folio en memoria.

### REQ-02 `inferred`
> Fuente: backend/seeds/05_sales_capabilities.ts:40 (sales.invoices:issue)

Reenviar SII es una acción disponible sobre facturas emitidas para usuarios con sales.invoices:issue, cualquiera sea su estado SII. Registra un intento simulado nuevo sin alterar folio, montos, líneas ni estado comercial del documento. Por qué: el cliente necesita reintentar envíos rechazados como en el legacy, y hoy no existe ni envío ni reenvío.

### REQ-03 `inferred`
> Fuente: Doc de decisiones sección 4.8 (P-15.1.D1); acciones de Bodega de 6/7

Ninguna acción de Bodega (Entrega Rápida, Formato Bodega) espera ni consulta el resultado SII. Basta con que la factura esté emitida (P-15.1.D1).

### REQ-04 `inferred`
> Fuente: backend/seeds/05_sales_capabilities.ts:26,33,40; frontend/src/components/ventas/detail/DocumentoDetalleView/DocumentoDetalleView.stories.tsx:36

Cada fila del listado de facturas cliente muestra un menú de acciones filtrado por estado y permiso (R-06, R-07). Visualizar: siempre. Clonar: siempre, con sales.invoices:edit. Editar: solo Borrador. Anular: emitidas no anuladas, con sales.documents:void. Reenviar SII: emitidas. Entrega Rápida: emitidas no entregadas. Formato Bodega: emitidas.

### REQ-05 `inferred`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:523 (ruta a confirmar); backend/test/e2e/roles-config.e2e-spec.ts:57

El API valida estado y permiso en cada acción del menú y rechaza la acción fuera de sus estados, aunque la UI no la ofrezca. Por qué: criterio de aceptación explícito; el filtro solo en la UI no protege.

### REQ-06 `inferred`
> Fuente: frontend/src/components/shared/SimulacionSiiBanner/SimulacionSiiBanner.stories.tsx:4; frontend/src/components/compras/builder/PurchaseInvoiceBuilder.tsx:409 (uso existente)

Toda vista que muestra folio o estado SII (builder de factura cliente, detalle y listado) muestra el banner de simulación, y el folio y el estado SII llevan el rótulo 'simulado' (R-21, criterio 22).

### REQ-07 `confirmed` `enforcement`
> Fuente: frontend/src/components/shared/SimulacionSiiBanner/SimulacionSiiBanner.stories.tsx:4; backend/src/purchases/facturas-proveedor.controller.spec.ts:41; frontend/src/components/compras/builder/PurchaseInvoiceBuilder.extra.test.tsx:231

Se reutiliza lo existente: SimulacionSiiBanner (sin un componente nuevo de banner), los estados demo de documento.dto.ts:20 (sin un enum nuevo) y la extensión de issueFactura (sin un segundo flujo de emisión). Los consumidores de issueFactura en compras no cambian de firma.

### REQ-08 `confirmed` `enforcement`
> Fuente: backend/seeds/05_sales_capabilities.ts:26,33,40; backend/seeds/10_demo_roles_users.ts:41

Los permisos usan las capabilities existentes sembradas en 05_sales_capabilities.ts (sales.invoices:issue para Reenviar, sales.invoices:edit y sales.documents:void). No se agrega ninguna capability ni se modifican los roles demo.

### REQ-09 `confirmed`
> Fuente: JOR-175-Q1 (respuesta registrada): 5/7 (JOR-173) y 6/7 (JOR-174) aún no ejecutados ni mergeados en la rama base; la sesión 2 de JOR-175 espera a esos tickets.

Las acciones del menú que dependen de 5/7 (JOR-173: Anular / nota de crédito, sales.documents:void) y de 6/7 (JOR-174: Entrega Rápida y Formato Bodega) se implementan solo después de que JOR-173 y JOR-174 estén ejecutados e integrados (mergeados) en la rama base. Hoy no lo están, por lo que la sesión 2 de JOR-175 espera a esos tickets; el orden de la épica ya lo impone. No se implementan stubs, ni se duplica lógica de anulación o de Bodega dentro de JOR-175 para adelantarse.

### REQ-10 `inferred`
> Fuente: Adenda 1 punto (1) del request JOR-175 y decisión del usuario del 2026-10-09 (vía B), pendiente de confirmación

La anulación rápida desde DocumentosTable pide el motivo al usuario en la UI antes de llamar al API (vía B). El API sigue exigiendo el motivo y rechaza con error por estado inválido; no existe motivo por defecto y el cuerpo vacío ya no produce un 400 inesperado porque la UI nunca llama sin motivo. Supuesto de la decisión del usuario del 2026-10-09, pendiente de su confirmación. Antes de implementar se contrasta con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido original del cliente, y el contraste se registra en el reporte de la sesión; si se contradicen, se reporta y no se decide.

### REQ-11 `confirmed`
> Fuente: Adenda 1 - 2026-10-09, punto (2)

El listado de documentos no muestra 'Pagada' en una factura anulada: muestra 'Anulada'. Se contrasta antes con el legacy de Jormat y con el pedido original del cliente; si se contradicen, se reporta y no se decide.

### REQ-12 `confirmed`
> Fuente: Adenda 1 - 2026-10-09, punto (3)

El resumen de ventas no suma las notas (de crédito y de débito) como deuda del cliente. Se contrasta antes con el legacy de Jormat y con el pedido original del cliente; si se contradicen, se reporta y no se decide.

### REQ-13 `confirmed`
> Fuente: Adenda 1 - 2026-10-09, punto (4)

Si la factura destino de un crédito aplicado se anula después, el crédito aplicado se revierte y el saldo disponible de la nota se restituye. La reversión es idempotente. Se contrasta antes con el legacy de Jormat y con el pedido original del cliente; si se contradicen, se reporta y no se decide.

### REQ-14 `confirmed`
> Fuente: Adenda 1 - 2026-10-09, punto (5) y Motivo

Los fallos de tests preexistentes se clasifican contra una base limpia (roles-config e2e con deriva de conteos por rol, sales-invoices-persistence e2e, catalogos-clientes-reuse e2e y los fallos del frontend, distinguiendo los flaky). Los reales se corrigen sin aflojar aserciones; los no relacionados se documentan.

### REQ-15 `confirmed` `enforcement`
> Fuente: Adenda 1 - 2026-10-09, encabezado

Cada corrección de la Adenda 1 contrasta antes con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido original del cliente; si ambos se contradicen, se reporta al usuario y no se decide por cuenta propia.
## Tasks

#### S1.T1 — Backend: persistir los intentos SII simulados y enviar de inmediato al emitir. Se extiende issueFactura (sales.service.ts:523, ruta a confirmar) sin cambiar su firma.
Contrato: rollback: git revert de los commits de la task y down de la migración de sii_envio_intento. Status: done

#### S1.T1.1 — Migración create de sii_envio_intento (documento_id, resultado con los valores demo de documento.dto.ts:20, fecha, origen). Sin columnas en el documento.
Contrato: rollback: Down de la migración (drop table). Status: done

#### S1.T1.2 — Simulador SII acotado a un solo documento por llamada: elige un estado demo y registra el intento con la fecha actual. Al final de issueFactura se invoca dentro de la misma transacción.
Contrato: rollback: git revert del simulador y del cambio en issueFactura. Status: done

#### S1.T2 — Backend: endpoint Reenviar. Valida que la factura esté emitida y que el usuario tenga sales.invoices:issue (capability existente, 05_sales_capabilities.ts:40), y registra un intento con origen 'reenvio' sin escribir sobre el documento.
Contrato: rollback: git revert del endpoint y del método de servicio. Status: done

#### S1.T3 — Frontend: Facturar muestra el aviso 'Documento enviado al SII (simulado)' y navega al listado. La acción Reenviar de la fila llama al endpoint y refresca el estado SII mostrado.
Contrato: rollback: git revert de los cambios del builder de factura cliente y del listado. Status: done

#### S1.T4 — Tests y regresión de la sesión: specs de backend para la emisión con intento, el rollback de la emisión fallida y Reenviar (happy, 4xx en Borrador, 403 sin permiso); test de frontend del aviso y la navegación; regresión de issueFactura en compras.
Contrato: rollback: git revert de los archivos de test agregados. Status: done

#### S2.T1 — Backend: guardas de estado por acción (Editar solo Borrador; Anular emitida no anulada; Reenviar emitida; Entrega Rápida emitida no entregada; Formato Bodega emitida, sin consultar el resultado SII) con 4xx y un mensaje claro. Se reutilizan las capabilities sales.invoices:edit, sales.invoices:issue y sales.documents:void.
Contrato: rollback: git revert de las guardas. Status: done

#### S2.T2 — Frontend: menú de acciones por fila en el listado de facturas cliente, con visibilidad derivada del estado y de los permisos del usuario. Entrega Rápida, Formato Bodega y Anular enlazan a las acciones de 5/7 y 6/7 si existen; no se reimplementan.
Contrato: rollback: git revert del componente del menú. Status: done

#### S2.T3 — Frontend: montar SimulacionSiiBanner (componente existente) en el builder, el detalle (DocumentoDetalleView) y el listado de facturas cliente, y agregar el rótulo 'simulado' al folio y al estado SII. No se crea un banner nuevo.
Contrato: rollback: git revert de los cambios de las vistas. Status: done

#### S2.T4 — Tests y regresión de la sesión: matriz de menú por estado y permiso (Borrador, emitida, anulada, sin edit); 4xx del API por acción fuera de estado y 200 en el caso válido; Bodega habilitada con un intento rechazado; banner y rótulo en el detalle y el listado; regresión de PurchaseInvoiceBuilder y roles-config.
Contrato: rollback: git revert de los archivos de test agregados. Status: done

#### S2.T5 — Precondición de la sesión 2: antes de implementar las acciones del menú que dependen de 5/7 y 6/7 (Anular, Entrega Rápida, Formato Bodega), verificar que JOR-173 (Anular / nota de crédito, sales.documents:void) y JOR-174 (Entrega Rápida y Formato Bodega) estén mergeados en la rama base y que sus endpoints y capabilities existan. Si alguno falta, detener la sesión y reportar el bloqueo sin implementar stubs ni lógica sustituta. Si ya están integrados, integrar esas acciones al menú consumiendo lo entregado por 173 y 174, sin duplicar su lógica.
Contrato: rollback: Sin cambios de código: solo verificación de precondición. Si se integraron acciones del menú, revertir los commits de esa integración.. Status: done

#### S3.T1 — Corrección 1: anulación rápida desde DocumentosTable. Contrastar antes con jormat_back_legacy, jormat-front-legacy, jormat_docs y el pedido original del cliente; si se contradicen, reportar sin decidir. Luego hacer que la anulación sin cuerpo no responda 400: usar un motivo por defecto o pedir el motivo en la UI. Mantener el rechazo del API por estado inválido. Casos de test: anular rápido sin cuerpo responde 2xx y la factura queda anulada; con motivo explícito se respeta; anular una ya anulada se rechaza por estado.
Contrato: rollback: Revertir el commit de la tarea; la anulación sin cuerpo vuelve a responder 400.. Status: pending

#### S3.T2 — Corrección 2: el listado de documentos no muestra 'Pagada' en una factura anulada, muestra 'Anulada'. Contrastar antes con el legacy de Jormat y el pedido original del cliente; si se contradicen, reportar sin decidir. Casos de test: una factura anulada con pagos muestra Anulada; una factura pagada no anulada sigue mostrando Pagada.
Contrato: rollback: Revertir el commit de la tarea; el listado vuelve a derivar el estado como antes.. Status: pending

#### S3.T3 — Corrección 3: el resumen de ventas no suma las notas (crédito y débito) como deuda del cliente. Contrastar antes con el legacy de Jormat y el pedido original del cliente; si se contradicen, reportar sin decidir. Casos de test: el resumen con una nota no incrementa la deuda; el resumen solo con facturas pendientes conserva su total.
Contrato: rollback: Revertir el commit de la tarea; el resumen vuelve a su cálculo anterior.. Status: pending

#### S3.T4 — Corrección 4: al anular la factura destino de un crédito aplicado, revertir el crédito y restituir el saldo disponible de la nota, de forma idempotente. Contrastar antes con el legacy de Jormat y el pedido original del cliente; si se contradicen, reportar sin decidir. Reutilizar el flujo de anulación existente (5/7), sin duplicar su lógica. Casos de test: anular la factura destino restituye el saldo de la nota; repetir la anulación no restituye dos veces; anular una factura sin crédito no cambia saldos.
Contrato: rollback: Revertir el commit de la tarea; el saldo de la nota deja de restituirse al anular.. Status: pending

#### S3.T5 — Corrección 5: clasificar los fallos de tests preexistentes contra una base limpia (roles-config e2e con deriva de conteos por rol, sales-invoices-persistence e2e, catalogos-clientes-reuse e2e y los fallos del frontend, distinguiendo flaky). Corregir los reales sin aflojar aserciones y documentar los no relacionados. Casos de test: cada suite queda en verde o documentada como no relacionada; ninguna aserción eliminada o relajada.
Contrato: rollback: Revertir los commits de las correcciones de tests; la clasificación documentada se conserva.. Status: pending

#### S4.T1 — Anulación rápida desde DocumentosTable (vía B). Primero, ANTES de modificar código, contrastar el comportamiento con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido original del cliente, y registrar ese contraste en el reporte de la sesión; si se contradicen, reportar al usuario y detenerse sin decidir. Después implementar la decisión del usuario del 2026-10-09 (supuesto pendiente de su confirmación): la UI pide el motivo al usuario antes de llamar al API; el API sigue exigiendo el motivo y rechazando por estado inválido; no existe motivo por defecto. Reutilizar el endpoint de anulación existente de JOR-173 sin duplicar lógica de anulación.
Contrato: rollback: Revertir el commit de la task (git revert): vuelve el comportamiento previo de la anulación rápida sin cuerpo; no hay migraciones ni datos que deshacer.. Status: pending

#### S4.T2 — Listado de documentos: una factura anulada se muestra como 'Anulada' y no como 'Pagada'. Primero, ANTES de modificar código, contrastar con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido original del cliente, y registrar ese contraste en el reporte de la sesión; si se contradicen, reportar y no decidir. Después aplicar la corrección y su test.
Contrato: rollback: Revertir el commit de la task (git revert); no hay cambios de datos ni migraciones.. Status: pending

#### S4.T3 — Resumen de ventas: las notas (de crédito y de débito) no se suman como deuda del cliente. Primero, ANTES de modificar código, contrastar con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido original del cliente, y registrar ese contraste en el reporte de la sesión; si se contradicen, reportar y no decidir. Después aplicar la corrección y su test.
Contrato: rollback: Revertir el commit de la task (git revert); no hay cambios de datos ni migraciones.. Status: pending

#### S4.T4 — Crédito aplicado: si la factura destino se anula después, el crédito aplicado se revierte y el saldo disponible de la nota se restituye, de forma idempotente. Primero, ANTES de modificar código, contrastar con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido original del cliente, y registrar ese contraste en el reporte de la sesión; si se contradicen, reportar y no decidir. Después aplicar la corrección y su test.
Contrato: rollback: Revertir el commit de la task (git revert); si se probó sobre datos, restaurar la copia de la base de prueba (nunca sobre el store vivo).. Status: pending

#### S4.T5 — S4.T5 (REQ-14): Correr contra una base limpia backend/jormat-api/test/e2e/roles-config.e2e-spec.ts, backend/jormat-api/test/e2e/sales-invoices-persistence.e2e-spec.ts, backend/jormat-api/test/e2e/catalogos-clientes-reuse.e2e-spec.ts y la suite del front. Clasificar cada fallo como real, flaky (repetir para distinguir) o deriva (p. ej. conteos por rol en roles-config) y registrar la clasificación en el reporte de la sesión. No se modifica código ni tests en esta task.
Contrato: rollback: Sin cambios de código; basta descartar el reporte de clasificación si fuera incorrecto.. Status: pending

#### S4.T6 — S4.T6 (REQ-14/15): Corregir los fallos clasificados como reales en S4.T5 sin aflojar aserciones (no borrar ni relajar expects; corregir el código o la deriva de datos de prueba con aprobación del usuario si implica modificar un test). Los fallos flaky o no relacionados se documentan, no se corrigen. Dejar en el reporte de la sesión el registro del contraste con legacy (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido del cliente de cada corrección de S4.T1..S4.T4, indicando cualquier contradicción reportada.
Contrato: rollback: Revertir los commits de las correcciones (git revert); el registro del reporte se puede rehacer sin efecto en el código.. Status: pending
## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por JOR-175 · Facturas cliente (feedback) 7/7 · Envío SII simulado, Reenviar y acciones por estado
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

- tipo: create | objetos: sii_envio_intento (nombre propuesto, a confirmar): id, documento_id, resultado, fecha, origen (emision|reenvio) | destructivo: no | tarea: S1.T1 | rollback: Ejecutar el down de la migración, que hace drop de la tabla nueva; no afecta datos previos porque es una tabla aislada

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-09 (add) `confirmed`: Las acciones del menú que dependen de 5/7 (JOR-173: Anular / nota de crédito, sales.documents:void) y de 6/7 (JOR-174: Entrega Rápida y Form

**Tasks agregadas:**

- S2: Precondición de la sesión 2: antes de implementar las acciones del menú que dependen de 5/7 y 6/7 (Anular, Entrega Rápida, Formato Bodega), verificar que JOR-173 (Anular / nota de crédito, sales.documents:void) y JOR-174 (Entrega Rápida y Formato Bodega) estén mergeados en la rama base y que sus endpoints y capabilities existan. Si alguno falta, detener la sesión y reportar el bloqueo sin implementar stubs ni lógica sustituta. Si ya están integrados, integrar esas acciones al menú consumiendo lo entregado por 173 y 174, sin duplicar su lógica. (valida: REQ-09, REQ-04; rollback: Sin cambios de código: solo verificación de precondición. Si se integraron acciones del menú, revertir los commits de esa integración.)

### Enmienda 2
**REQs:**

- REQ-10 (add) `confirmed`: La anulación rápida desde DocumentosTable sin cuerpo no responde 400: anula la factura con un motivo por defecto o pide el motivo al usuario
- REQ-11 (add) `confirmed`: El listado de documentos no muestra 'Pagada' en una factura anulada: muestra 'Anulada'. Se contrasta antes con el legacy de Jormat y con el 
- REQ-12 (add) `confirmed`: El resumen de ventas no suma las notas (de crédito y de débito) como deuda del cliente. Se contrasta antes con el legacy de Jormat y con el 
- REQ-13 (add) `confirmed`: Si la factura destino de un crédito aplicado se anula después, el crédito aplicado se revierte y el saldo disponible de la nota se restituye
- REQ-14 (add) `confirmed`: Los fallos de tests preexistentes se clasifican contra una base limpia (roles-config e2e con deriva de conteos por rol, sales-invoices-persi
- REQ-15 (add) `confirmed`: Cada corrección de la Adenda 1 contrasta antes con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedid

**Tasks agregadas:**

- S3: Corrección 1: anulación rápida desde DocumentosTable. Contrastar antes con jormat_back_legacy, jormat-front-legacy, jormat_docs y el pedido original del cliente; si se contradicen, reportar sin decidir. Luego hacer que la anulación sin cuerpo no responda 400: usar un motivo por defecto o pedir el motivo en la UI. Mantener el rechazo del API por estado inválido. Casos de test: anular rápido sin cuerpo responde 2xx y la factura queda anulada; con motivo explícito se respeta; anular una ya anulada se rechaza por estado. (valida: REQ-10, REQ-15; rollback: Revertir el commit de la tarea; la anulación sin cuerpo vuelve a responder 400.)
- S3: Corrección 2: el listado de documentos no muestra 'Pagada' en una factura anulada, muestra 'Anulada'. Contrastar antes con el legacy de Jormat y el pedido original del cliente; si se contradicen, reportar sin decidir. Casos de test: una factura anulada con pagos muestra Anulada; una factura pagada no anulada sigue mostrando Pagada. (valida: REQ-11, REQ-15; rollback: Revertir el commit de la tarea; el listado vuelve a derivar el estado como antes.)
- S3: Corrección 3: el resumen de ventas no suma las notas (crédito y débito) como deuda del cliente. Contrastar antes con el legacy de Jormat y el pedido original del cliente; si se contradicen, reportar sin decidir. Casos de test: el resumen con una nota no incrementa la deuda; el resumen solo con facturas pendientes conserva su total. (valida: REQ-12, REQ-15; rollback: Revertir el commit de la tarea; el resumen vuelve a su cálculo anterior.)
- S3: Corrección 4: al anular la factura destino de un crédito aplicado, revertir el crédito y restituir el saldo disponible de la nota, de forma idempotente. Contrastar antes con el legacy de Jormat y el pedido original del cliente; si se contradicen, reportar sin decidir. Reutilizar el flujo de anulación existente (5/7), sin duplicar su lógica. Casos de test: anular la factura destino restituye el saldo de la nota; repetir la anulación no restituye dos veces; anular una factura sin crédito no cambia saldos. (valida: REQ-13, REQ-15; rollback: Revertir el commit de la tarea; el saldo de la nota deja de restituirse al anular.)
- S3: Corrección 5: clasificar los fallos de tests preexistentes contra una base limpia (roles-config e2e con deriva de conteos por rol, sales-invoices-persistence e2e, catalogos-clientes-reuse e2e y los fallos del frontend, distinguiendo flaky). Corregir los reales sin aflojar aserciones y documentar los no relacionados. Casos de test: cada suite queda en verde o documentada como no relacionada; ninguna aserción eliminada o relajada. (valida: REQ-14, REQ-15, test; rollback: Revertir los commits de las correcciones de tests; la clasificación documentada se conserva.)

### Enmienda 3

**Tasks agregadas:**

- S4: S4.T1 (REQ-10): Anulación rápida desde DocumentosTable. Antes de implementar, contrastar con jormat_back_legacy, jormat-front-legacy, jormat_docs y el pedido original del cliente; si se contradicen, reportar en el reporte de la sesión y NO decidir. Implementar: la UI (front DocumentosTable) pide el motivo al usuario antes de llamar al API (decisión JOR-175-Q3/Q5); el API mantiene el motivo obligatorio y el rechazo por estado (no se relaja la validación para evitar el 400). Tests: con motivo responde 2xx y la factura queda anulada; ya anulada se rechaza por estado. (valida: REQ-10, REQ-15; rollback: Revertir el commit de la task (git revert): vuelve el comportamiento previo de la anulación rápida sin cuerpo; no hay migraciones ni datos que deshacer.)
- S4: S4.T2 (REQ-11): El listado de documentos muestra 'Anulada' y no 'Pagada' para facturas anuladas. Antes de implementar, contrastar con jormat_back_legacy, jormat-front-legacy, jormat_docs y el pedido original del cliente; si se contradicen, reportar y NO decidir. Implementar en backend/jormat-api (sales.service, derivación del estado/etiqueta del listado) y en front (DocumentosTable) para que el estado anulado tenga prioridad sobre pagada. Test: factura anulada con pago completo se lista como Anulada; factura pagada no anulada sigue como Pagada. (valida: REQ-11, REQ-15; rollback: Revertir el commit de la task (git revert); no hay cambios de datos ni migraciones.)
- S4: S4.T3 (REQ-12): El resumen de ventas excluye las notas de crédito y de débito de la deuda del cliente. Antes de implementar, contrastar con jormat_back_legacy, jormat-front-legacy, jormat_docs y el pedido original del cliente; si se contradicen, reportar y NO decidir. Implementar en backend/jormat-api (cálculo del resumen de ventas en sales.service). Test: un cliente con una factura con saldo y una nota de crédito/débito emitida muestra como deuda solo el saldo de la factura. (valida: REQ-12, REQ-15; rollback: Revertir el commit de la task (git revert); no hay cambios de datos ni migraciones.)
- S4: S4.T4 (REQ-13): Al anular la factura destino de un crédito aplicado, se revierte el crédito aplicado y se restituye el saldo disponible de la nota. La reversión debe ser idempotente (anular o reintentar dos veces no restituye dos veces). Antes de implementar, contrastar con jormat_back_legacy, jormat-front-legacy, jormat_docs y el pedido original del cliente; si se contradicen, reportar y NO decidir. Reutilizar la lógica de anulación existente (5/7, JOR-173) sin duplicarla. Tests: tras anular la factura destino el saldo de la nota vuelve al valor previo a la aplicación; una segunda reversión no cambia el saldo. (valida: REQ-13, REQ-15; rollback: Revertir el commit de la task (git revert); si se probó sobre datos, restaurar la copia de la base de prueba (nunca sobre el store vivo).)
- S4: S4.T5 (REQ-14): Correr contra una base limpia backend/jormat-api/test/e2e/roles-config.e2e-spec.ts, backend/jormat-api/test/e2e/sales-invoices-persistence.e2e-spec.ts, backend/jormat-api/test/e2e/catalogos-clientes-reuse.e2e-spec.ts y la suite del front. Clasificar cada fallo como real, flaky (repetir para distinguir) o deriva (p. ej. conteos por rol en roles-config) y registrar la clasificación en el reporte de la sesión. No se modifica código ni tests en esta task. (valida: REQ-14, test; rollback: Sin cambios de código; basta descartar el reporte de clasificación si fuera incorrecto.)
- S4: S4.T6 (REQ-14/15): Corregir los fallos clasificados como reales en S4.T5 sin aflojar aserciones (no borrar ni relajar expects; corregir el código o la deriva de datos de prueba con aprobación del usuario si implica modificar un test). Los fallos flaky o no relacionados se documentan, no se corrigen. Dejar en el reporte de la sesión el registro del contraste con legacy (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido del cliente de cada corrección de S4.T1..S4.T4, indicando cualquier contradicción reportada. (valida: REQ-14, REQ-15, test; rollback: Revertir los commits de las correcciones (git revert); el registro del reporte se puede rehacer sin efecto en el código.)

### Enmienda 4
**REQs:**

- REQ-10 (edit) `inferred`: La anulación rápida desde DocumentosTable pide el motivo al usuario en la UI antes de llamar al API (vía B). El API sigue exigiendo el motiv

**Task ops:**

- edit S4.T1 { desc="Anulación rápida desde DocumentosTable (vía B). Primero, ANTES de modificar código, contrastar el comportamiento con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido original del cliente, y registrar ese contraste en el reporte de la sesión; si se contradicen, reportar al usuario y detenerse sin decidir. Después implementar la decisión del usuario del 2026-10-09 (supuesto pendiente de su confirmación): la UI pide el motivo al usuario antes de llamar al API; el API sigue exigiendo el motivo y rechazando por estado inválido; no existe motivo por defecto. Reutilizar el endpoint de anulación existente de JOR-173 sin duplicar lógica de anulación." }
- edit S4.T2 { desc="Listado de documentos: una factura anulada se muestra como 'Anulada' y no como 'Pagada'. Primero, ANTES de modificar código, contrastar con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido original del cliente, y registrar ese contraste en el reporte de la sesión; si se contradicen, reportar y no decidir. Después aplicar la corrección y su test." }
- edit S4.T3 { desc="Resumen de ventas: las notas (de crédito y de débito) no se suman como deuda del cliente. Primero, ANTES de modificar código, contrastar con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido original del cliente, y registrar ese contraste en el reporte de la sesión; si se contradicen, reportar y no decidir. Después aplicar la corrección y su test." }
- edit S4.T4 { desc="Crédito aplicado: si la factura destino se anula después, el crédito aplicado se revierte y el saldo disponible de la nota se restituye, de forma idempotente. Primero, ANTES de modificar código, contrastar con el legacy de Jormat (jormat_back_legacy, jormat-front-legacy, jormat_docs) y con el pedido original del cliente, y registrar ese contraste en el reporte de la sesión; si se contradicen, reportar y no decidir. Después aplicar la corrección y su test." }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: En el listado de facturas cliente: Facturar termina en el listado con el aviso 'Documento enviado al SII (simulado)'; la acción Reenviar de una fila emitida crea un intento nuevo, visible en la columna de estado SII, con el documento intacto; los tests de sales de backend pasan.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5

**Gate (auto)**: En el listado, el menú de una fila en Borrador, una emitida y una anulada muestra exactamente las acciones de R-06/R-07; un PATCH a una emitida devuelve 4xx; el detalle y el listado muestran SimulacionSiiBanner y el rótulo 'simulado' en el folio y el estado SII.

### Session 3 · T0 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4
- [ ] S3.T5

### Session 4 · open

**Tasks:**
- [ ] S4.T1
- [ ] S4.T2
- [ ] S4.T3
- [ ] S4.T4
- [ ] S4.T5
- [ ] S4.T6

**Gate (auto)**: Resultados observables: (1) anular rápido desde DocumentosTable pide el motivo en la UI y el API anula con 2xx, rechaza por estado si ya está anulada; (2) el listado muestra Anulada y no Pagada para facturas anuladas; (3) el resumen de ventas no suma notas como deuda; (4) al anular la factura destino se restituye el saldo de la nota de crédito aplicada, una sola vez; (5) las suites roles-config, sales-invoices-persistence, catalogos-clientes-reuse y los tests del front quedan clasificados (preexistente real, flaky, deriva) y los reales corregidos sin aflojar aserciones.
