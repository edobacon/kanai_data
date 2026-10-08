---
id: JOR-173-SPEC
project: jormat-evolution
ticket: JOR-173
status: approved
---

# JOR-173 · Facturas cliente (feedback) 5/7 · Anular factura mediante nota de credito total (Devolucion/Falla) con credito disponible

## Resumen ejecutivo

Se agrega la accion Anular desde el menu de la factura emitida. Crea una nota de credito total vinculada a la factura, con tipo Devolucion o Falla y una observacion, protegida por la capability existente sales.documents:void. En una sola transaccion, la deuda de la factura queda en 0 y el stock se mueve segun el tipo: Devolucion reingresa a la bodega de origen y Falla no mueve stock.
Si la factura tenia pagos, el pago se mantiene y el importe queda como credito disponible del cliente. Ese credito se ve en el popup y en el Estado de cuenta (4/7), y su aplicacion posterior queda con vinculo real. La proyeccion de saldo (3/7) suma las notas aplicadas.
NO incluye: notas parciales, devolucion de dinero ni nota desde el modulo de notas independiente. No se crea una capability nueva.
Se sabe que funciona cuando: Devolucion deja deuda 0 y stock reingresado; Falla deja deuda 0 sin movimiento; una factura pagada de $100.000 deja un credito disponible de $100.000; el segundo intento responde rechazo; un usuario sin sales.documents:void recibe 403.
Tamano: 3 sesiones (backend de la anulacion, UI de la accion y detalle, credito disponible y proyeccion), 10 tareas.
ADVERTENCIA: el request dice que 2/7 aporta los movimientos de stock, pero la spec existente JOR-170 (2/7) se titula 'Reglas de emision en servidor'. Hay que confirmar donde vive el servicio de movimientos de stock que se debe reutilizar.

Datos a confirmar antes de ejecutar:
1) Nombre real de la tabla y entidad de documentos de venta, y si el tipo 'nota de credito' ya existe como valor de su catalogo de tipos. Confirmar en las migraciones y entidades de backend; si hay que agregar un valor de catalogo, pasa a seed_catalog con aprobacion humana.
2) Servicio y tabla de movimientos de stock de 2/7, y como se identifica la bodega de origen de cada linea. Confirmar en el modulo de stock del backend.
3) Servicio de proyeccion de saldo de JOR-171 y endpoints del popup y del Estado de cuenta de JOR-172. Confirmar en las specs JOR-171 y JOR-172.
4) Runner de tests y config e2e del backend (jest y config de test/e2e) y del frontend (vitest o jest, storybook test). Confirmar en los package.json de backend/ y frontend/ y ajustar los comandos de verify.
5) Ruta exacta del seed de capabilities: el request cita backend/jormat-api/seeds/05_sales_capabilities.ts:26 y el codigo real muestra backend/seeds/05_sales_capabilities.ts:26. Se usa la segunda.

## Requirements

### REQ-01 `inferred`
> Fuente: frontend-legacy/src/app/sales/credit-notes/create/credit-notes-create.html:43

Desde una factura emitida se puede crear una nota de credito TOTAL vinculada a ella. La nota reutiliza la cabecera y las lineas de documento de venta, copia todas las lineas e importes sin permitir editarlos, y registra el tipo (Devolucion | Falla) y una observacion libre. QUE: anulacion total con trazabilidad. POR QUE: el legacy copia lineas editables sin control y sin vinculo (feedback §3.4, doc de decisiones §4.5).

### REQ-02 `confirmed`
> Fuente: backend/seeds/05_sales_capabilities.ts:26

El endpoint de anulacion exige la capability existente sales.documents:void (equivalente a nota-de-credito-edit del legacy), validada en el backend. QUE: control de permiso en el servidor. POR QUE: el criterio de aceptacion pide que el API rechace a un usuario sin ese permiso.

### REQ-03 `inferred`
> Fuente: jormat_docs/tickets/JOR-166-JOR-167-decisiones-desarrollo-2026-10-06.md (doc de decisiones 06-10, seccion 4.5, regla de unicidad P-10.1.D1)

P-10.1.D1: una factura ya anulada no admite una segunda nota de credito. La regla se garantiza en el backend, tambien ante solicitudes concurrentes. QUE: unicidad de la anulacion. POR QUE: evita doble credito y doble reingreso de stock (criterio 18).

### REQ-04 `confirmed`
> Fuente: JOR-173-Q1 (respuesta registrada); doc de decisiones §4.5; criterios 15 y 16

P-10.2: en UNA sola transaccion, la deuda de la factura baja a 0 (deja de ser Pendiente o Vencida y queda en condicion de anulada) y el stock se ajusta segun el tipo. Devolucion reingresa cada cantidad a la bodega de origen de su linea; Falla no genera movimientos. Los movimientos quedan referenciados a la nota y sin duplicados. Si algun paso falla, se revierte todo. JOR-173-Q1: la segunda linea del fixture de la anulacion con Devolucion (1 u x $70.000) usa un item con control de stock en la misma bodega que la linea 1, por lo que la devolucion genera 2 movimientos de inventario (uno por linea). QUE: efectos atomicos. POR QUE: doc de decisiones §4.5, criterios 15 y 16.

### REQ-05 `confirmed`
> Fuente: Pedido de cambio JOR-173 (caso [error] de REQ-05); alcance 6 del request; respuesta JOR-173-Q2

P-10.2.D1 opcion A: si la factura tenia pagos, el pago se mantiene y el importe anulado queda como credito disponible del cliente (nota con saldo disponible). La aplicacion posterior de ese credito a otra factura del mismo cliente queda con vinculo real (nota -> factura destino, importe), no como texto libre, y reduce el saldo disponible de la nota. Validaciones del endpoint de aplicacion, en el backend: el importe aplicado no puede superar el saldo disponible de la nota (aplicar $120.000 sobre una nota con $100.000 disponibles responde HTTP 422) y la factura destino debe pertenecer al mismo cliente que la nota (una factura de otro cliente responde HTTP 422). JOR-173-Q2: el endpoint de aplicacion de credito a otra factura se protege con la capability payments.customers:apply-payment (aplica saldo, no anula), validada en el backend; sales.documents:void queda reservada para la anulacion del documento (REQ-02). QUE: saldo a favor trazable, acotado y con permiso acorde a su efecto. POR QUE: criterio 17, alcance 6 y respuesta JOR-173-Q2.

### REQ-06 `inferred`
> Fuente: backend/jormat-api/src/sales/proyeccion-saldo.ts (proyeccion de saldo en backend, 3/7)

La proyeccion de saldo de 3/7 suma las notas aplicadas, y el credito disponible del cliente se ve en el popup del cliente y en el Estado de cuenta de 4/7. QUE: los saldos reflejan las notas. POR QUE: alcance 6 y 7. DET-41: el calculo se hace con agregados SQL por cliente o factura, no iterando todas las filas en memoria.

### REQ-07 `confirmed`
> Fuente: frontend/src/components/ventas/detail/DocumentoDetalleView/DocumentoDetalleView.stories.tsx:59

UI: el menu de la factura emitida en DocumentoDetalleView ofrece 'Convertir en Nota de Credito / Anular' solo si el usuario tiene sales.documents:void y la factura no esta anulada. Abre un modal con un selector Devolucion/Falla y una observacion, y al confirmar llama al endpoint. Despues, la factura muestra la nota vinculada y su condicion de anulada. QUE: la accion pedida por el cliente. POR QUE: feedback §3.4.

### REQ-08 `confirmed` `enforcement`
> Fuente: backend/seeds/10_demo_roles_users.ts:39

Reuso obligatorio: usar la capability existente sales.documents:void (no crear una nueva ni tocar los seeds de roles), las entidades de cabecera y lineas de documento de venta, el servicio de movimientos de stock de 2/7 y la proyeccion de saldo de 3/7. Extender DocumentoDetalleView y sus stories existentes en vez de crear vistas paralelas.
## Tasks

#### S1.T1 — Modelo de datos de la nota de credito total sobre documentos de venta: migracion aditiva con vinculo a la factura de origen, tipo Devolucion/Falla, observacion, saldo disponible e indice unico parcial para P-10.1.D1. Reutiliza la cabecera y las lineas de documento de venta.
Contrato: rollback: Correr la migracion down y revertir el commit de entidades.. Status: done

#### S1.T1.1 — Migracion aditiva: columnas documento_origen_id, tipo_nota_credito, observacion_anulacion y saldo_disponible, e indice unico parcial por documento_origen_id para las notas de credito totales. Los nombres finales siguen la convencion de la tabla real de documentos de venta.
Contrato: rollback: Migracion down que elimina el indice y las columnas.. Status: done

#### S1.T1.2 — Extender la entidad o DTO de documento de venta con los campos nuevos y un enum NotaCreditoTipo {Devolucion, Falla} (sin magic strings).
Contrato: rollback: Revertir el commit de la entidad y el enum.. Status: done

#### S1.T2 — Servicio voidInvoice: en una sola transaccion valida que la factura este emitida y no anulada, crea la nota copiando todas las lineas e importes, deja la deuda de la factura en 0 con condicion de anulada y, si el tipo es Devolucion, registra los reingresos con el servicio de stock de 2/7 a la bodega de origen de cada linea, referenciados a la nota. Falla no mueve stock.
Contrato: rollback: Revertir el commit del servicio. Sin datos persistentes fuera de la transaccion.. Status: done

#### S1.T2.1 — Guardas: factura inexistente (404), documento que no es factura emitida (422) y factura ya anulada (409). La concurrencia se cubre con el indice unico: si se viola, se responde 409.
Contrato: rollback: Revertir el commit de las guardas.. Status: done

#### S1.T2.2 — Creacion de la nota con las lineas copiadas de la factura (ignora lineas del body), deuda de la factura en 0 y saldo disponible de la nota = importe pagado de la factura.
Contrato: rollback: Revertir el commit.. Status: done

#### S1.T2.3 — Efecto en stock por tipo con el servicio de movimientos de 2/7: con Devolucion, un ingreso por linea en su bodega de origen con referencia a la nota (sin duplicar si se reintenta); con Falla, ningun movimiento.
Contrato: rollback: Revertir el commit.. Status: done

#### S1.T3 — Endpoint POST de anulacion sobre la factura con un DTO validado {tipo: Devolucion|Falla, observacion} y un guard de capability sales.documents:void (la existente en backend/seeds/05_sales_capabilities.ts:26, sin tocar seeds).
Contrato: rollback: Revertir el commit del controller y el DTO.. Status: done

#### S1.T3.1 — DTO VoidInvoiceDto con validacion de clase: tipo obligatorio restringido al enum NotaCreditoTipo (Devolucion|Falla) y observacion string opcional con largo maximo acotado por una constante. El DTO no declara lineas, y el ValidationPipe con whitelist descarta las lineas que lleguen en el body.
Contrato: rollback: Revertir el commit del DTO.. Status: done

#### S1.T3.2 — Ruta POST de anulacion en el controller de documentos de venta (p.ej. POST /sales/documents/:id/void) que delega en voidInvoice con el id de la factura, el DTO y el usuario autenticado, y responde 201 con la nota creada (id, tipo, total, documento origen y saldo disponible).
Contrato: rollback: Revertir el commit de la ruta en el controller.. Status: done

#### S1.T3.3 — Proteger la ruta con el guard o decorador de capabilities que ya usa el modulo de ventas, exigiendo la capability existente sales.documents:void. Usuario sin la capability responde 403. Sin cambios en backend/seeds/05_sales_capabilities.ts ni en backend/seeds/10_demo_roles_users.ts.
Contrato: rollback: Revertir el commit del decorador en la ruta.. Status: done

#### S1.T3.4 — Mapeo de errores a HTTP sin exponer stack traces: tipo invalido o ausente responde 400, factura inexistente 404, documento que no es factura emitida 422, y factura ya anulada o violacion del indice unico 409 con un mensaje de factura ya anulada.
Contrato: rollback: Revertir el commit del mapeo de errores.. Status: done

#### S1.T4 — Tests e2e backend de anulacion: criterios 15, 16 y 18, 403 sin capability, 400 por tipo invalido, rollback ante una falla de stock y concurrencia. Regresion de backend/test/e2e/roles-config.e2e-spec.ts.
Contrato: rollback: Eliminar el archivo de test nuevo.. Status: done

#### S1.T4.1 — Setup del archivo test/e2e/invoice-void.e2e-spec.ts: fixtures con un cliente, la factura emitida de 2 lineas (3 u x $10.000 y 1 u x $70.000, item A en bodega B1), una factura pagada de $100.000, un usuario demo con sales.documents:void y un usuario sin ella, y limpieza entre tests.
Contrato: rollback: Eliminar el archivo de test nuevo.. Status: done

#### S1.T4.2 — Test de anulacion con tipo Devolucion sobre el fixture de 2 lineas (JOR-173-Q1): la devolucion genera 2 movimientos de inventario, +3 u del item A y +1 u del item B, ambos items con control de stock en la bodega B1 (bodega de origen de cada linea). Ajustar el stock resultante de cada item: el item A sube 3 u y el item B sube 1 u en B1, y los 2 movimientos quedan referenciados a la nota, sin duplicados. Aclarar en el test que el caso de 1 solo movimiento de +3 u corresponde a una factura de UNA sola linea, no al fixture de 2 lineas. Tipo Falla sobre el mismo fixture: 0 movimientos.
Contrato: rollback: Eliminar el bloque de test.. Status: done

#### S1.T4.3 — Caso Falla (criterio 16): deuda de la factura 0, 0 movimientos de stock referenciados a la nota y stock de A en B1 sin cambios. Sobre la factura pagada de $100.000, el pago sigue registrado y la nota queda con saldo disponible $100.000.
Contrato: rollback: Eliminar el bloque de test.. Status: done

#### S1.T4.4 — Unicidad (criterio 18): un segundo POST responde 409 sin cambiar la cantidad de notas, movimientos ni credito. Dos POST concurrentes (Promise.all): exactamente un 201 y un 409, y queda 1 sola nota.
Contrato: rollback: Eliminar el bloque de test.. Status: done

#### S1.T4.5 — Permisos y validacion: usuario sin sales.documents:void responde 403 con la factura intacta; tipo ausente u 'Otro' responde 400; documento en borrador o la propia nota responde 422. En los tres casos no se crea nota ni movimiento.
Contrato: rollback: Eliminar el bloque de test.. Status: done

#### S1.T4.6 — Atomicidad: con jest.spyOn sobre el servicio de movimientos de stock de 2/7 lanzando un error en la segunda linea, la respuesta es error, no queda nota creada, la deuda sigue en $100.000 y no queda ningun movimiento parcial.
Contrato: rollback: Eliminar el bloque de test.. Status: done

#### S1.T4.7 — Regresion: correr backend/test/e2e/roles-config.e2e-spec.ts sin modificarlo y confirmar con git diff que los seeds de capabilities y roles no cambiaron.
Contrato: rollback: No aplica: no modifica archivos.. Status: done

#### S2.T1 — Agregar al menu de la factura emitida en DocumentoDetalleView la accion 'Convertir en Nota de Credito / Anular', visible solo con sales.documents:void y si la factura no esta anulada. El modal tiene un selector Devolucion/Falla (obligatorio), la observacion y la llamada al endpoint, y maneja el 409.
Contrato: rollback: Revertir el commit del componente y el modal.. Status: done

#### S2.T2 — Detalle de la factura anulada: mostrar la condicion Anulada y el vinculo navegable a la nota (tipo, observacion e importe), reusando los componentes de detalle existentes.
Contrato: rollback: Revertir el commit.. Status: done

#### S2.T3 — Stories y tests de UI: extender DocumentoDetalleView.stories.tsx con los estados con permiso, sin permiso y factura anulada, y un test de interaccion del modal (confirmar deshabilitado sin tipo, payload enviado, error 409). Regresion de las stories existentes (lineas 36, 59 y 85).
Contrato: rollback: Revertir los cambios en las stories y el test.. Status: done

#### S3.T1 — Implementar en backend/jormat-api el endpoint de aplicacion de credito de una nota a otra factura, protegido con la capability payments.customers:apply-payment validada en el backend. Registra el vinculo real (nota -> factura destino, importe) y reduce el saldo disponible de la nota. Validaciones: el importe aplicado no puede superar el saldo disponible de la nota (aplicar $120.000 sobre $100.000 responde HTTP 422) y la factura destino debe ser del mismo cliente que la nota (factura de otro cliente responde HTTP 422). Los tests de esta funcionalidad se escriben y ejecutan en S3.T3.
Contrato: rollback: Migracion down que elimina la tabla de aplicaciones y revertir el commit del servicio y el endpoint.. Status: pending

#### S3.T2 — Integrar las notas en la proyeccion de saldo de 3/7 (sumar las notas aplicadas con agregados SQL por factura y cliente, DET-41) y exponer el credito disponible en el popup del cliente y en el Estado de cuenta de 4/7, incluida la nota con su saldo.
Contrato: rollback: Revertir el commit de la proyeccion y las vistas.. Status: pending

#### S3.T3 — Escribir el archivo de test nuevo backend/jormat-api/test/e2e/invoice-void-credit.e2e-spec.ts (config jest.e2e.config.ts) que cubre el criterio 17 (factura pagada de $100.000 deja $100.000 de credito disponible), la aplicacion de $40.000 a otra factura del mismo cliente con vinculo real y saldo restante de $60.000, el rechazo 422 por importe mayor al saldo disponible ($120.000 sobre $100.000), el rechazo 422 por factura de otro cliente y el rechazo por falta de payments.customers:apply-payment. Ejecutar ademas las suites de regresion de JOR-171.
Contrato: rollback: Eliminar los archivos de test nuevos.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: UI: el menu de la factura emitida en DocumentoDetalleView ofrece 'Convertir en Nota de Credito / Anular' solo si el usuario tiene sales.documents:void y la factura no esta anulada. Abre un modal con un selector Devolucion/Falla y una observacion, y al confirmar llama al endpoin
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

- tipo: alter_additive | objetos: documentos_venta.documento_origen_id (FK a la factura; nombre de tabla a confirmar), documentos_venta.tipo_nota_credito (Devolucion|Falla), documentos_venta.observacion_anulacion, documentos_venta.saldo_disponible | destructivo: no | tarea: S1.T1 | rollback: La migracion down elimina las columnas nuevas. No hay datos previos que dependan de ellas.
- tipo: alter_additive | objetos: indice unico parcial documentos_venta(documento_origen_id) para las notas de credito totales | destructivo: no | tarea: S1.T1 | rollback: La migracion down elimina el indice.
- tipo: create | objetos: aplicaciones_nota_credito (nota_id, factura_destino_id, importe, fecha, usuario; nombre a confirmar) | destructivo: no | tarea: S3.T1 | rollback: La migracion down elimina la tabla. Solo contiene aplicaciones creadas por este ticket.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-04 (edit) `confirmed`: P-10.2: en UNA sola transaccion, la deuda de la factura baja a 0 (deja de ser Pendiente o Vencida y queda en condicion de anulada) y el stoc
- REQ-05 (edit) `confirmed`: P-10.2.D1 opcion A: si la factura tenia pagos, el pago se mantiene y el importe anulado queda como credito disponible del cliente (nota con 

**Task ops:**

- edit S3.T3 { verify=["pnpm --dir backend/jormat-api exec jest src/sales/proyeccion-saldo.spec.ts src/payments/payments.persistence.spec.ts src/payments/payments.service.spec.ts"] }

### Enmienda 2
**REQs:**

- REQ-03 (edit) `inferred`: P-10.1.D1: una factura ya anulada no admite una segunda nota de credito. La regla se garantiza en el backend, tambien ante solicitudes concu
- REQ-06 (edit) `inferred`: La proyeccion de saldo de 3/7 suma las notas aplicadas, y el credito disponible del cliente se ve en el popup del cliente y en el Estado de 

**Task ops:**

- edit S1.T4.2 { desc="Test de anulacion con tipo Devolucion sobre el fixture de 2 lineas (JOR-173-Q1): la devolucion genera 2 movimientos de inventario, +3 u del item A y +1 u del item B, ambos items con control de stock en la bodega B1 (bodega de origen de cada linea). Ajustar el stock resultante de cada item: el item A sube 3 u y el item B sube 1 u en B1, y los 2 movimientos quedan referenciados a la nota, sin duplicados. Aclarar en el test que el caso de 1 solo movimiento de +3 u corresponde a una factura de UNA sola linea, no al fixture de 2 lineas. Tipo Falla sobre el mismo fixture: 0 movimientos.", validates=["REQ-04"], verify=["cd backend/jormat-api && npm test -- anulacion"] }
- edit S3.T1 { desc="Endpoint de aplicacion de credito (nota -> factura destino del mismo cliente, importe) protegido en el backend con la capability existente payments.customers:apply-payment (confirmado en REQ-05 por JOR-173-Q2). sales.documents:void queda reservada solo para la anulacion del documento (REQ-02) y NO se exige en este endpoint. Verificar que ambas capabilities (payments.customers:apply-payment y sales.documents:void) ya existen en el codigo; no modificar seeds ni crear capabilities nuevas (REQ-08). Un usuario sin payments.customers:apply-payment es rechazado por el API.", validates=["REQ-05","REQ-08"], verify=["cd backend/jormat-api && npm test -- credito"] }
- edit S3.T3 { desc="Correr las suites de regresion de JOR-171 (src/sales/proyeccion-saldo.spec.ts, src/payments/payments.persistence.spec.ts, src/payments/payments.service.spec.ts) Y los archivos de test nuevos de credito de este ticket, de modo que se cubra el criterio 17 (factura pagada de $100.000 deja $100.000 de credito disponible) y la aplicacion de $40.000 de la nota a otra factura. Gate de S3: al aplicar $40.000 de la nota a la factura destino, la deuda de la factura destino baja a $20.000 y el saldo disponible de la nota queda en $60.000. Gestor npm; comandos desde backend/jormat-api: npm test -- <patron> (jest) y npm run test:e2e.", validates=["REQ-05","REQ-06"], verify=["cd backend/jormat-api && npm test -- src/sales/proyeccion-saldo.spec.ts src/payments/payments.persistence.spec.ts src/payments/payments.service.spec.ts credito","cd backend/jormat-api && npm run test:e2e"] }

### Enmienda 3
**REQs:**

- REQ-05 (edit) `confirmed`: P-10.2.D1 opcion A: si la factura tenia pagos, el pago se mantiene y el importe anulado queda como credito disponible del cliente (nota con 

**Task ops:**

- edit S1.T4.2 { verify=["cd backend/jormat-api && npm run test:e2e -- invoice-void"] }
- edit S3.T1 { desc="Implementar en backend/jormat-api el endpoint de aplicacion de credito de una nota a otra factura, protegido con la capability payments.customers:apply-payment validada en el backend. Registra el vinculo real (nota -> factura destino, importe) y reduce el saldo disponible de la nota. Validaciones: el importe aplicado no puede superar el saldo disponible de la nota (aplicar $120.000 sobre $100.000 responde HTTP 422) y la factura destino debe ser del mismo cliente que la nota (factura de otro cliente responde HTTP 422). Los tests de esta funcionalidad se escriben y ejecutan en S3.T3.", validates=["REQ-05"], isTest=false, verify=["cd backend/jormat-api && npx tsc --noEmit"] }
- edit S3.T3 { desc="Escribir el archivo de test nuevo backend/jormat-api/test/e2e/invoice-void-credit.e2e-spec.ts (config jest.e2e.config.ts) que cubre el criterio 17 (factura pagada de $100.000 deja $100.000 de credito disponible), la aplicacion de $40.000 a otra factura del mismo cliente con vinculo real y saldo restante de $60.000, el rechazo 422 por importe mayor al saldo disponible ($120.000 sobre $100.000), el rechazo 422 por factura de otro cliente y el rechazo por falta de payments.customers:apply-payment. Ejecutar ademas las suites de regresion de JOR-171.", validates=["REQ-05","REQ-06"], isTest=true, verify=["cd backend/jormat-api && npm run test:e2e -- invoice-void-credit"] }
## Sessions

### Session 1 · T3 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T2.3
- [x] S1.T3
- [x] S1.T3.1
- [x] S1.T3.2
- [x] S1.T3.3
- [x] S1.T3.4
- [x] S1.T4
- [x] S1.T4.1
- [x] S1.T4.2
- [x] S1.T4.3
- [x] S1.T4.4
- [x] S1.T4.5
- [x] S1.T4.6
- [x] S1.T4.7

**Gate (auto)**: El e2e backend de anulacion pasa en verde: Devolucion (deuda 0 y stock +N en la bodega de origen), Falla (deuda 0, sin movimientos), 409 en el segundo intento y 403 sin sales.documents:void.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: En Storybook (DocumentoDetalleView) y en el app: la accion Anular aparece solo con permiso y en factura no anulada, el modal envia tipo y observacion, y la factura anulada muestra el badge Anulada y el enlace a la nota.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: Al anular una factura pagada de $100.000, el popup del cliente y el Estado de cuenta muestran un credito disponible de $100.000. Al aplicar $40.000 a otra factura, se ve la aplicacion vinculada y su saldo baja a $20.000.

### Session 4 · T0 · open
