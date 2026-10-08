---
id: JOR-172-SPEC
project: jormat-evolution
ticket: JOR-172
status: approved
---

# JOR-172 · Facturas cliente (feedback) 4/7 · Popup del cliente con contadores reales, registro mínimo de cheques y Estado de cuenta

## Resumen ejecutivo

Se completan los contadores del popup 'Informacion adicional / Documentos pendientes' (hoy en null en backend/jormat-api/src/catalogos/catalogos.service.ts:96). Facturas con saldo se separan en Pendiente de pago y Vencida, sumando todas las sucursales y usando la proyección de saldo de 3/7. Notas cuentan las que tienen saldo disponible. Cheques cuenta solo los Rechazados, apoyados en una tabla mínima nueva de cheques (T-11). Además se agrega la pantalla Estado de cuenta (T-12), que 'Mas detalles' abre en una pestaña nueva. NO se hace: la gestión de cheques (depositar, validar, rechazar, alta por UI), las notificaciones automáticas ni la lógica de notas de 5/7 (sin 5/7 el contador de notas queda en 0 con datos reales). Cómo se verifica: un cliente con un cheque Rechazado y uno Pendiente muestra 'Cheques: 1', y el Pendiente total del Estado de cuenta es igual al del popup y al del listado de 3/7. Tamaño: 2 sesiones T2, unas 5 a 6 h. ADVERTENCIAS: 1) depende de que 3/7 (JOR-171) esté mergeado, porque sin su proyección de saldo REQ-01 y REQ-04 no se pueden implementar; 2) la tabla de cheques nace sin UI de alta, así que para probarla hay que cargar datos por migración de prueba o fixture.
Datos a confirmar antes de ejecutar: (a) cuál es la ruta canónica del backend, porque el contexto cita a la vez backend/src/catalogos y monorepo/backend/jormat-api/src/catalogos y el request usa backend/jormat-api (confirmar con git ls-files en la raíz); (b) ruta y nombre del componente del popup en el frontend y del router donde se registra la ruta nueva del Estado de cuenta (no figuran en el contexto); (c) nombre exacto del servicio o función de proyección de saldo que expone JOR-171 y el campo de fecha de vencimiento de la factura; (d) nombre de la tabla de facturas y de notas de crédito y cómo se relaciona cliente con sucursal; (e) comando de test del paquete backend (npm/pnpm y la config de jest), que se confirma en el package.json de jormat-api.

## Requirements

### REQ-01 `confirmed`
> Fuente: Request alcance 1 y 5; JOR-171 proyeccion-saldo.ts; DET-41

El popup del cliente muestra el contador de Facturas con saldo, separado en 'Pendiente de pago' y 'Vencida'. Suma todas las sucursales del cliente y NO usa el criterio legacy status != 2. Fuente unica: el saldo sale de calcularSaldoProyectado y la clasificacion Pendiente de pago / Vencida sale de derivarEstadoComercialPago, ambas de backend/jormat-api/src/sales/proyeccion-saldo.ts (JOR-171, 3/7, precondicion mergeada), usando invoices.expiration_date como fecha de vencimiento. Ningun codigo de este ticket reimplementa la comparacion contra hoy. El conteo es un COUNT agregado en SQL sobre invoices filtrando por la proyeccion persistida, sin traer filas a memoria (DET-41). Si calcularSaldoProyectado y derivarEstadoComercialPago son funciones TypeScript, el ejecutor verifica primero si el repositorio de sales ya expone una expresion SQL equivalente reutilizable. Si no existe, el conteo parte de las filas ya filtradas por el repositorio (saldo > 0, cliente, todas las sucursales) y aplica la funcion TypeScript para clasificar, sin duplicar la regla en SQL, y esa decision queda registrada en el codigo y en el resumen de la task.

### REQ-02 `confirmed`
> Fuente: Adenda 1 del request (2026-10-08), JOR-172-Q4 y JOR-172-Q6; backend/jormat-api/src/sales/dte-type-map.ts

El popup muestra el contador de Notas con datos reales, nunca null. Mientras 5/7 (JOR-173) NO este mergeado (opcion A, JOR-172-Q4 y Q6), el contador cuenta las filas emitidas de invoices del cliente con type_id = 3 (nota_credito, backend/jormat-api/src/sales/dte-type-map.ts), usando la constante nombrada del mapa de tipos DTE y no el literal 3. NO calcula saldo disponible ni aplicacion de notas: devuelve 0 si el cliente no tiene notas emitidas. El saldo disponible y la aplicacion de notas los introduce JOR-173, fuera de este ticket.

### REQ-03 `confirmed`
> Fuente: Request alcance 3 y 4 (T-11, D1 opcion B); migrations/20260914000000_types_statuses_legacy.ts:37; pedido de enmienda punto 3

Existe un registro persistente minimo de cheques (T-11): cliente, numero, banco, importe, fecha de emision, fecha de vencimiento o cobro, status_id y vinculo a facturas. status_id toma sus valores del catalogo statuses modulo 3 (1 Pendiente, 2 Validada, 3 Rechazada, 4 Depositado), referenciados con constantes nombradas. Una FK simple sobre statuses.id NO restringe el modulo (aceptaria ids de otros modulos), por lo que la pertenencia al modulo 3 se valida en codigo (servicio/repositorio de cheques) y no se afirma como garantia de la FK. El popup cuenta solo los cheques en estado Rechazada (3) del cliente.

### REQ-04 `confirmed`
> Fuente: Adenda 1 del request (2026-10-08), reemplazo del criterio 25; JOR-167-Q8; JOR-172-Q1 y Q7

'Mas detalles' del popup abre en una pestana nueva la pantalla Estado de cuenta del cliente (T-12). Muestra una cabecera con los datos del cliente y el estado Activo o Bloqueado, un filtro por rango de fechas y una grilla con las facturas con saldo y las notas con saldo disponible. Columnas: Tipo documento, N° documento (enlace al detalle), Origen, Estado, Fecha, Total, Abono y Pendiente, con la suma de Pendiente. No incluye cheques. El endpoint filtra por rango de fechas y pagina en servidor (DET-41). Criterio de aceptacion 25 (reemplazado por la Adenda 1): 'Mas detalles' abre el Estado de cuenta en otra pestana y el Pendiente total del Estado de cuenta es igual al Pendiente del listado de facturas de JOR-171 (misma proyeccion de saldo T-05, calcularSaldoProyectado). Esta verificacion vive en un solo lugar (S2.T4). Texto vinculante de la sesion 2: reviewOutcome y gate dicen 'El Pendiente total del Estado de cuenta es igual al Pendiente del listado de JOR-171 (proyeccion T-05)' y no mencionan ningun monto del popup.

### REQ-05 `confirmed` `enforcement`
> Fuente: backend/jormat-api/src/sales/proyeccion-saldo.ts; backend/jormat-api/migrations/20260914000000_types_statuses_legacy.ts:37

El saldo y el estado comercial de facturas y notas se obtienen reusando backend/jormat-api/src/sales/proyeccion-saldo.ts (calcularSaldoProyectado, calcularVencimientoPorPlazo, derivarEstadoComercialPago), ya mergeada desde JOR-171 y precondicion de este ticket. Los estados de cheque reusan el catalogo statuses modulo 3. No se crean calculos de saldo paralelos ni ids de estado magicos: se usan constantes nombradas.

### REQ-06 `confirmed` `enforcement`
> Fuente: backend/src/catalogos/catalogos.controller.spec.ts:262

El contrato de getClienteNotification (forma de respuesta y campos credito y bloqueo) se preserva para sus consumidores. Los contadores pasan de null a números y no se renombran campos existentes.

### REQ-07 `confirmed`
> Fuente: doc de decisiones 4.2 JOR-167-Q8; JOR-172-Q1; backend/jormat-api/src/catalogos/catalogos.controller.spec.ts

El popup del cliente NO muestra un monto total ni suma de saldo: solo los contadores de Facturas (Pendiente de pago y Vencida), Notas y Cheques, ademas de credito y bloqueo (decision JOR-167-Q8, JOR-172-Q1). Si el cliente pide el monto en el popup, es un cambio de alcance y no se implementa en este ticket. El criterio 25 se verifica comparando el Pendiente total del Estado de cuenta con el del listado de JOR-171 (misma proyeccion de saldo T-05); del popup solo se verifican los contadores.

### REQ-08 `confirmed`
> Fuente: JOR-172-Q2; JOR-167-Q5; doc de decisiones sección 4.2 (T-12)

En la grilla del Estado de cuenta, la columna Origen muestra el valor de invoices.origin_name de cada documento (misma definición que JOR-167-Q5, que sigue abierta). No se deriva ni se calcula otro valor para esa columna; si JOR-167-Q5 cambia la definición, se ajusta en un único punto.

### REQ-09 `confirmed`
> Fuente: Pedido de enmienda; REQ-03 (la FK sobre statuses.id no restringe el modulo); migracion backend/jormat-api/migrations/20260914000000_types_statuses_legacy.ts:37

La validacion de que status_id de un cheque pertenece al modulo 3 del catalogo statuses (1 Pendiente, 2 Validada, 3 Rechazada, 4 Depositado) vive en codigo, en el servicio o repositorio de cheques, usando las constantes nombradas de estado de cheque. Si status_id no pertenece al modulo 3 (otro modulo o id inexistente), se rechaza con error y NO se persiste ninguna fila. No se confia en la FK sobre statuses.id, que no restringe el modulo.
## Tasks

#### S1.T1 — Crear la migración de la tabla cheques y de la tabla puente cheque_facturas (T-11). Columnas: cliente_id, numero, banco, importe, fecha_emision, fecha_vencimiento, status_id con FK al catálogo statuses módulo 3 (1 Pendiente, 2 Validada, 3 Rechazada, 4 Depositado, ya migrado en migrations/20260914000000_types_statuses_legacy.ts:37), y la relación con facturas. Índice por (cliente_id, status_id) para el COUNT. Sin endpoints de gestión.
Contrato: rollback: Correr el down de la migración (drop de cheque_facturas y cheques) y borrar el archivo.. Status: done

#### S1.T2 — Contador de Facturas (REQ-01). Se implementa y verifica exclusivamente en sus subtareas; esta task agrupa y no repite su detalle.
Contrato: rollback: Revertir catalogos.service.ts al commit previo, con lo que los contadores vuelven a null.. Status: done

#### S1.T2.1 — Implementar el conteo de facturas con saldo del cliente (todas las sucursales) separado en Pendiente de pago y Vencida. La clasificacion se obtiene SOLO de derivarEstadoComercialPago (backend/jormat-api/src/sales/proyeccion-saldo.ts) usando invoices.expiration_date como fecha de vencimiento; no se reimplementa la comparacion contra hoy. Antes de codificar, verificar si el repositorio de sales expone una expresion SQL equivalente a calcularSaldoProyectado y derivarEstadoComercialPago. Si existe, reusarla en un COUNT agregado en SQL sobre invoices. Si no existe, partir de las filas ya filtradas por el repositorio (cliente, saldo > 0) y aplicar la funcion TypeScript sin duplicar la regla, dejando un comentario en espanol que lo explique.
Contrato: rollback: Revertir el bloque del contador de facturas en catalogos.service.ts.. Status: done

#### S1.T2.3 — Contador de cheques: COUNT de la tabla cheques con status_id = constante CHEQUE_STATUS_RECHAZADA (3), sin número mágico.
Contrato: rollback: Revertir el bloque del contador de cheques y la constante.. Status: done

#### S1.T2.4 — Preservar la forma de respuesta de getClienteNotification: credito y bloqueo sin cambios, y los contadores pasan a ser numéricos.
Contrato: rollback: Revertir el DTO o tipo de respuesta al commit previo.. Status: done

#### S1.T3 — Mostrar en el popup del frontend (Informacion adicional / Documentos pendientes) los contadores Facturas (Pendiente de pago y Vencida), Notas y Cheques desde la respuesta de getClienteNotification, reusando el componente de popup existente.
Contrato: rollback: Revertir el componente del popup al commit previo.. Status: done

#### S1.T4 — Tests y regresión: en catalogos.controller.spec.ts y en el spec del service, agregar los casos de REQ-01, REQ-02 y REQ-03 (incluido el criterio 24: un Rechazado y un Pendiente devuelven 1) y verificar que los casos existentes de credito y bloqueo (líneas 262, 281 y 292) pasan sin cambios.
Contrato: rollback: Revertir los casos agregados en los specs.. Status: done

#### S1.T5 — Subtarea de S1.T2 (contador de Notas, REQ-02, opcion A de la Adenda 1). En backend/jormat-api/src/catalogos/catalogos.service.ts, en getClienteNotification, implementar el contador de notas contando las filas emitidas (is_draft = 0) de invoices del cliente con type_id igual a la constante nombrada de nota_credito (valor 3) exportada por backend/jormat-api/src/sales/dte-type-map.ts, sin usar el literal 3. NO calcular saldo disponible ni aplicacion de notas (eso lo introduce JOR-173). Usar un COUNT agregado en SQL, sin traer filas a memoria. Devolver siempre un numero: 0 si el cliente no tiene notas emitidas, nunca null. Preservar el resto del contrato de getClienteNotification (credito, bloqueo y demas campos).
Contrato: rollback: Revertir los cambios en backend/jormat-api/src/catalogos/catalogos.service.ts (git checkout del archivo).. Status: done

#### S1.T6 — Implementar en el servicio o repositorio de cheques (T-11) la validacion en codigo de que status_id pertenezca al modulo 3 de statuses, usando las constantes nombradas de estado de cheque (1 Pendiente, 2 Validada, 3 Rechazada, 4 Depositado) y no ids magicos. Si status_id no pertenece al modulo 3 (otro modulo, inexistente, nulo o indefinido), lanzar error de validacion y NO persistir ninguna fila. No depender de la FK sobre statuses.id, que no restringe el modulo. Agregar el test del caso [error] de REQ-03 junto a la implementacion: un status_id de otro modulo y uno inexistente son rechazados sin insertar fila, y los ids 1 a 4 son aceptados. No agregar otro alcance.
Contrato: rollback: Revertir los cambios en el servicio o repositorio de cheques y su archivo de test (git checkout de esos archivos).. Status: done

#### S2.T1 — Crear el endpoint de Estado de cuenta del cliente: cabecera (datos del cliente, Activo o Bloqueado) y grilla de facturas con saldo y notas con saldo disponible, con las columnas Tipo documento, N° documento, Origen, Estado, Fecha, Total, Abono y Pendiente, más la suma de Pendiente. Filtro por rango de fechas y paginación en servidor (DET-41), reusando la proyección de 3/7. Sin cheques.
Contrato: rollback: Eliminar el endpoint y su método de service y revertir el controller.. Status: done

#### S2.T2 — Estado de cuenta (REQ-04, REQ-08). Se implementa y verifica exclusivamente en sus subtareas; esta task agrupa y no repite su detalle.
Contrato: rollback: Eliminar la ruta y la vista nuevas y revertir el popup.. Status: done

#### S2.T2.1 — Registrar la ruta nueva del Estado de cuenta con el id del cliente y crear la vista: cabecera, filtro de fechas, grilla con suma de Pendiente y N° documento enlazado al detalle del documento.
Contrato: rollback: Eliminar la vista y la entrada del router.. Status: done

#### S2.T2.2 — En el popup, 'Mas detalles' abre la ruta con window.open(url, '_blank') sin perder el estado de Crear factura.
Contrato: rollback: Revertir el handler de 'Mas detalles' en el popup.. Status: done

#### S2.T4 — Crear y ejecutar los tests del Estado de cuenta y verificar el criterio 25 (unico lugar). Crear el spec backend/jormat-api/src/sales/estado-cuenta.service.spec.ts y el e2e backend/jormat-api/test/estado-cuenta.e2e-spec.ts. El caso happy compara el Pendiente total del Estado de cuenta SOLO con el Pendiente total del listado de facturas de JOR-171 (misma proyeccion T-05, calcularSaldoProyectado), segun JOR-172-Q5. No se compara con ningun monto del popup, que no muestra montos (REQ-07). Tambien cubre rango de fechas vacio, paginacion en servidor, columna Origen (invoices.origin_name) y que el popup solo expone contadores. El reviewOutcome y el gate de la sesion 2 se alinean con esta verificacion: criterio 25 = Pendiente del Estado de cuenta igual al del listado de JOR-171, y 'Mas detalles' abre pestana nueva.
Contrato: rollback: Revertir el commit de las pruebas y, si se tocó, del mapeo de la columna Origen; el resto del spec no se ve afectado.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: 'Mas detalles' del popup abre en una pestaña nueva la pantalla Estado de cuenta del cliente (T-12). Muestra una cabecera con los datos del cliente y el estado Activo o Bloqueado, un filtro por rango de fechas y una grilla con las facturas con saldo y las notas con saldo disponi
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

- tipo: create | objetos: cheques, cheques.cliente_id, cheques.numero, cheques.banco, cheques.importe, cheques.fecha_emision, cheques.fecha_vencimiento, cheques.status_id (FK statuses módulo 3), cheque_facturas (cheque_id, factura_id) | destructivo: no | tarea: S1.T1 | rollback: Ejecutar el down de la migración, que hace DROP de cheque_facturas y de cheques. Son tablas nuevas sin datos previos.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-07 (add) `confirmed`: El popup del cliente NO muestra un monto total ni suma de saldo: solo los contadores de Facturas (Pendiente de pago y Vencida), Notas y Cheq
- REQ-08 (add) `confirmed`: En la grilla del Estado de cuenta, la columna Origen muestra el valor de invoices.origin_name de cada documento (misma definición que JOR-16

**Tasks agregadas:**

- S2: Agregar pruebas que fijen las decisiones JOR-172-Q1 y JOR-172-Q2: (a) el contrato de getClienteNotification (backend/jormat-api/src/catalogos/catalogos.service.ts) no expone ningún monto total, solo credito, bloqueo y contadores; (b) el Pendiente total del Estado de cuenta coincide con la suma del listado calculada con la proyección de saldo T-05 (criterio 25); (c) la columna Origen del Estado de cuenta devuelve invoices.origin_name tal cual, incluyendo el caso nulo. No se agrega alcance funcional nuevo: solo se ajusta el mapeo de Origen si hoy no usa invoices.origin_name. (valida: REQ-07, REQ-08, test; rollback: Revertir el commit de las pruebas y, si se tocó, del mapeo de la columna Origen; el resto del spec no se ve afectado.)

### Enmienda 2
**REQs:**

- REQ-01 (edit) `confirmed`: El popup del cliente muestra el contador de Facturas con saldo, separado en 'Pendiente de pago' (saldo > 0 y invoices.expiration_date igual 
- REQ-04 (edit) `confirmed`: 'Mas detalles' del popup abre en una pestana nueva la pantalla Estado de cuenta del cliente (T-12). Muestra una cabecera con los datos del c
- REQ-05 (edit) `confirmed`: El saldo y el estado comercial de facturas y notas se obtienen reusando backend/jormat-api/src/sales/proyeccion-saldo.ts (calcularSaldoProye
- REQ-07 (edit) `confirmed`: El popup del cliente NO muestra un monto total ni suma de saldo: solo los contadores de Facturas (Pendiente de pago y Vencida), Notas y Cheq

**Task ops:**

- edit S1.T2.1 { desc="En backend/jormat-api/src/catalogos/catalogos.service.ts, separar Pendiente de pago y Vencida comparando invoices.expiration_date (date, la misma columna que usa JOR-171) contra la fecha de hoy: Vencida si expiration_date < hoy y saldo > 0; Pendiente de pago si expiration_date >= hoy y saldo > 0. El saldo sale de calcularSaldoProyectado en backend/jormat-api/src/sales/proyeccion-saldo.ts, sin formula paralela." }
- edit S1.T4 { verify=["cd backend/jormat-api && npm test -- catalogos.controller.spec.ts"] }
- edit S2.T3 { desc="Gate del criterio 25: verificar que el Pendiente total del Estado de cuenta coincide con el Pendiente total del listado de JOR-171 (misma fuente T-05, calcularSaldoProyectado en backend/jormat-api/src/sales/proyeccion-saldo.ts) y que el popup muestra solo contadores. No comparar contra ningun monto del popup. Comandos desde backend/jormat-api con npm (jest, Node 22).", validates=["REQ-04","REQ-07"], verify=["cd backend/jormat-api && npm test -- estado-cuenta.service.spec.ts"] }
- edit S2.T4 { verify=["cd backend/jormat-api && npm test -- estado-cuenta.service.spec.ts","cd backend/jormat-api && npm run test:e2e"] }

### Enmienda 3
**REQs:**

- REQ-04 (edit) `confirmed`: 'Mas detalles' del popup abre en una pestana nueva la pantalla Estado de cuenta del cliente (T-12). Muestra una cabecera con los datos del c
- REQ-01 (edit) `confirmed`: El popup del cliente muestra el contador de Facturas con saldo, separado en 'Pendiente de pago' y 'Vencida'. Suma todas las sucursales del c

**Task ops:**

- edit S1.T2.1 { desc="Implementar el conteo de facturas con saldo del cliente (todas las sucursales) separado en Pendiente de pago y Vencida. La clasificacion se obtiene SOLO de derivarEstadoComercialPago (backend/jormat-api/src/sales/proyeccion-saldo.ts) usando invoices.expiration_date como fecha de vencimiento; no se reimplementa la comparacion contra hoy. Antes de codificar, verificar si el repositorio de sales expone una expresion SQL equivalente a calcularSaldoProyectado y derivarEstadoComercialPago. Si existe, reusarla en un COUNT agregado en SQL sobre invoices. Si no existe, partir de las filas ya filtradas por el repositorio (cliente, saldo > 0) y aplicar la funcion TypeScript sin duplicar la regla, dejando un comentario en espanol que lo explique." }
- edit S1.T2 { desc="Contador de Facturas (REQ-01). Se implementa y verifica exclusivamente en sus subtareas; esta task agrupa y no repite su detalle.", validates=["REQ-01"] }
- edit S2.T2 { desc="Estado de cuenta (REQ-04, REQ-08). Se implementa y verifica exclusivamente en sus subtareas; esta task agrupa y no repite su detalle.", validates=["REQ-04","REQ-08"] }
- edit S2.T3 { desc="Implementar el enlace 'Mas detalles' del popup, que abre el Estado de cuenta en una pestana nueva. Esta task no verifica el criterio 25 ni compara montos; esa verificacion vive solo en S2.T4.", validates=["REQ-04"] }
- edit S2.T4 { desc="Crear y ejecutar los tests del Estado de cuenta y verificar el criterio 25 (unico lugar). Crear el spec backend/jormat-api/src/sales/estado-cuenta.service.spec.ts y el e2e backend/jormat-api/test/estado-cuenta.e2e-spec.ts. El caso happy compara el Pendiente total del Estado de cuenta SOLO con el Pendiente total del listado de facturas de JOR-171 (misma proyeccion T-05, calcularSaldoProyectado), segun JOR-172-Q5. No se compara con ningun monto del popup, que no muestra montos (REQ-07). Tambien cubre rango de fechas vacio, paginacion en servidor, columna Origen (invoices.origin_name) y que el popup solo expone contadores. El reviewOutcome y el gate de la sesion 2 se alinean con esta verificacion: criterio 25 = Pendiente del Estado de cuenta igual al del listado de JOR-171, y 'Mas detalles' abre pestana nueva.", validates=["REQ-04","REQ-07","REQ-08"], isTest=true, verify=["cd backend/jormat-api && npm test -- src/sales/estado-cuenta.service.spec.ts","cd backend/jormat-api && npm run test:e2e -- test/estado-cuenta.e2e-spec.ts"] }

### Enmienda 4

**Task ops:**

- delete S2.T3

### Enmienda 5
**REQs:**

- REQ-02 (edit) `confirmed`: El popup muestra el contador de Notas con datos reales, nunca null. Mientras 5/7 (JOR-173) NO este mergeado (opcion A, JOR-172-Q4 y Q6), el 
- REQ-03 (edit) `confirmed`: Existe un registro persistente minimo de cheques (T-11): cliente, numero, banco, importe, fecha de emision, fecha de vencimiento o cobro, st
- REQ-04 (edit) `confirmed`: 'Mas detalles' del popup abre en una pestana nueva la pantalla Estado de cuenta del cliente (T-12). Muestra una cabecera con los datos del c

### Enmienda 6
**REQs:**

- REQ-09 (add) `confirmed`: La validacion de que status_id de un cheque pertenece al modulo 3 del catalogo statuses (1 Pendiente, 2 Validada, 3 Rechazada, 4 Depositado)

**Tasks agregadas:**

- S1: Subtarea de S1.T2 (contador de Notas, REQ-02, opcion A de la Adenda 1). En backend/jormat-api/src/catalogos/catalogos.service.ts, en getClienteNotification, implementar el contador de notas contando las filas emitidas (is_draft = 0) de invoices del cliente con type_id igual a la constante nombrada de nota_credito (valor 3) exportada por backend/jormat-api/src/sales/dte-type-map.ts, sin usar el literal 3. NO calcular saldo disponible ni aplicacion de notas (eso lo introduce JOR-173). Usar un COUNT agregado en SQL, sin traer filas a memoria. Devolver siempre un numero: 0 si el cliente no tiene notas emitidas, nunca null. Preservar el resto del contrato de getClienteNotification (credito, bloqueo y demas campos). (valida: REQ-02, REQ-06; rollback: Revertir los cambios en backend/jormat-api/src/catalogos/catalogos.service.ts (git checkout del archivo).)
- S1: Implementar en el servicio o repositorio de cheques (T-11) la validacion en codigo de que status_id pertenezca al modulo 3 de statuses, usando las constantes nombradas de estado de cheque (1 Pendiente, 2 Validada, 3 Rechazada, 4 Depositado) y no ids magicos. Si status_id no pertenece al modulo 3 (otro modulo, inexistente, nulo o indefinido), lanzar error de validacion y NO persistir ninguna fila. No depender de la FK sobre statuses.id, que no restringe el modulo. Agregar el test del caso [error] de REQ-03 junto a la implementacion: un status_id de otro modulo y uno inexistente son rechazados sin insertar fila, y los ids 1 a 4 son aceptados. No agregar otro alcance. (valida: REQ-03, REQ-09; rollback: Revertir los cambios en el servicio o repositorio de cheques y su archivo de test (git checkout de esos archivos).)
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.3
- [x] S1.T2.4
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5
- [x] S1.T6

**Gate (auto)**: El popup de Crear factura muestra contadores numéricos reales en lugar de null. El caso de criterio 24 (Rechazado + Pendiente = 'Cheques: 1') pasa en catalogos.controller.spec.ts y se ve en la UI.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T2.1
- [x] S2.T2.2
- [x] S2.T4

**Gate (auto)**: 'Mas detalles' abre en una pestaña nueva el Estado de cuenta con la grilla de facturas y notas emitidas. El Pendiente total (solo facturas con saldo) coincide con el Pendiente del listado de 3/7 (criterio 25 reemplazado por la Adenda 1); no se compara contra ningun monto del popup, que muestra solo contadores. La columna Estado usa derivarEstadoComercialPago y la columna Origen muestra invoices.origin_name.

### Session 3 · T0 · open
## Decisions

### DEC-LOCAL-01: plan-dedup → auto-pruned
Recorte por exceso aplicado en autónomo: S2.T3

