---
id: JOR-172-SPEC
project: jormat-evolution
ticket: JOR-172
status: draft
---

# JOR-172 · Facturas cliente (feedback) 4/7 · Popup del cliente con contadores reales, registro mínimo de cheques y Estado de cuenta

## Resumen ejecutivo

Se completan los contadores del popup 'Informacion adicional / Documentos pendientes' (hoy en null en backend/jormat-api/src/catalogos/catalogos.service.ts:96). Facturas con saldo se separan en Pendiente de pago y Vencida, sumando todas las sucursales y usando la proyección de saldo de 3/7. Notas cuentan las que tienen saldo disponible. Cheques cuenta solo los Rechazados, apoyados en una tabla mínima nueva de cheques (T-11). Además se agrega la pantalla Estado de cuenta (T-12), que 'Mas detalles' abre en una pestaña nueva. NO se hace: la gestión de cheques (depositar, validar, rechazar, alta por UI), las notificaciones automáticas ni la lógica de notas de 5/7 (sin 5/7 el contador de notas queda en 0 con datos reales). Cómo se verifica: un cliente con un cheque Rechazado y uno Pendiente muestra 'Cheques: 1', y el Pendiente total del Estado de cuenta es igual al del popup y al del listado de 3/7. Tamaño: 2 sesiones T2, unas 5 a 6 h. ADVERTENCIAS: 1) depende de que 3/7 (JOR-171) esté mergeado, porque sin su proyección de saldo REQ-01 y REQ-04 no se pueden implementar; 2) la tabla de cheques nace sin UI de alta, así que para probarla hay que cargar datos por migración de prueba o fixture.
Datos a confirmar antes de ejecutar: (a) cuál es la ruta canónica del backend, porque el contexto cita a la vez backend/src/catalogos y monorepo/backend/jormat-api/src/catalogos y el request usa backend/jormat-api (confirmar con git ls-files en la raíz); (b) ruta y nombre del componente del popup en el frontend y del router donde se registra la ruta nueva del Estado de cuenta (no figuran en el contexto); (c) nombre exacto del servicio o función de proyección de saldo que expone JOR-171 y el campo de fecha de vencimiento de la factura; (d) nombre de la tabla de facturas y de notas de crédito y cómo se relaciona cliente con sucursal; (e) comando de test del paquete backend (npm/pnpm y la config de jest), que se confirma en el package.json de jormat-api.

## Requirements

#### REQ-01 `confirmed`
> Fuente: backend/jormat-api/src/catalogos/catalogos.service.ts:96
> Necesidad: build
El popup del cliente muestra el contador de Facturas con saldo, separado en 'Pendiente de pago' (saldo > 0 y sin vencer) y 'Vencida' (saldo > 0 y vencimiento anterior a hoy). Suma todas las sucursales del cliente, se calcula con la proyección de saldo de 3/7 y NO usa el criterio legacy status != 2. El cálculo es un COUNT agregado en SQL por cliente, sin traer las filas a memoria (DET-41).

#### REQ-02 `confirmed`
> Fuente: backend/jormat-api/src/catalogos/catalogos.service.ts:96
> Necesidad: build
El popup muestra el contador de Notas: notas de crédito del cliente con saldo disponible (no aplicadas por completo), con datos reales. Si 5/7 todavía no está, devuelve 0 calculado desde los documentos y no null.

#### REQ-03 `confirmed`
> Fuente: backend/jormat-api/migrations/20260914000000_types_statuses_legacy.ts:37
> Necesidad: build
Existe un registro persistente mínimo de cheques (T-11): cliente, número, banco, importe, fecha de emisión, fecha de vencimiento o cobro, estado tomado del catálogo statuses módulo 3 (1 Pendiente, 2 Validada, 3 Rechazada, 4 Depositado) y vínculo a facturas. El popup cuenta solo los cheques en estado Rechazada (3) del cliente.

#### REQ-04 `confirmed`
> Fuente: backend/jormat-api/src/catalogos/catalogos.service.ts:96
> Necesidad: build
'Mas detalles' del popup abre en una pestaña nueva la pantalla Estado de cuenta del cliente (T-12). Muestra una cabecera con los datos del cliente y el estado Activo o Bloqueado, un filtro por rango de fechas y una grilla con las facturas con saldo y las notas con saldo disponible. Columnas: Tipo documento, N° documento (enlace al detalle), Origen, Estado, Fecha, Total, Abono y Pendiente, con la suma de Pendiente. No incluye cheques. El endpoint filtra por rango de fechas y pagina en servidor (DET-41).

#### REQ-05 `inferred`
> Fuente: backend/jormat-api/migrations/20260914000000_types_statuses_legacy.ts:37
> Necesidad: build
El saldo y el estado comercial de facturas y notas se obtienen reusando la proyección de saldo de JOR-171 (3/7), y los estados de cheque reusando el catálogo statuses módulo 3. No se crean cálculos de saldo paralelos ni ids de estado mágicos: se usan constantes nombradas.

#### REQ-06 `confirmed`
> Fuente: backend/src/catalogos/catalogos.controller.spec.ts:262
> Necesidad: build
El contrato de getClienteNotification (forma de respuesta y campos credito y bloqueo) se preserva para sus consumidores. Los contadores pasan de null a números y no se renombran campos existentes.

## Tasks

#### S1.T1 — Crear la migración de la tabla cheques y de la tabla puente cheque_facturas (T-11). Columnas: cliente_id, numero, banco, importe, fecha_emision, fecha_vencimiento, status_id con FK al catálogo statuses módulo 3 (1 Pendiente, 2 Validada, 3 Rechazada, 4 Depositado, ya migrado en migrations/20260914000000_types_statuses_legacy.ts:37), y la relación con facturas. Índice por (cliente_id, status_id) para el COUNT. Sin endpoints de gestión.
Contrato: rollback: Correr el down de la migración (drop de cheque_facturas y cheques) y borrar el archivo.. Status: pending

#### S1.T2 — Completar los contadores de getClienteNotification (catalogos.service.ts:96) con queries COUNT agregadas por cliente (DET-41).
Contrato: rollback: Revertir catalogos.service.ts al commit previo, con lo que los contadores vuelven a null.. Status: pending
Subtasks: 4 (ejecutar hojas; el padre espera a todas)

#### S1.T2.1 — Contador de facturas: separar Pendiente de pago y Vencida (saldo > 0 y vencimiento contra hoy) sumando todas las sucursales del cliente, con la proyección de saldo de 3/7. Sin el criterio legacy status != 2.
Contrato: rollback: Revertir el bloque del contador de facturas en catalogos.service.ts.. Status: pending

#### S1.T2.2 — Contador de notas de crédito con saldo disponible > 0. Si 5/7 no está, devolver 0 calculado desde los documentos y no null.
Contrato: rollback: Revertir el bloque del contador de notas en catalogos.service.ts.. Status: pending

#### S1.T2.3 — Contador de cheques: COUNT de la tabla cheques con status_id = constante CHEQUE_STATUS_RECHAZADA (3), sin número mágico.
Contrato: rollback: Revertir el bloque del contador de cheques y la constante.. Status: pending

#### S1.T2.4 — Preservar la forma de respuesta de getClienteNotification: credito y bloqueo sin cambios, y los contadores pasan a ser numéricos.
Contrato: rollback: Revertir el DTO o tipo de respuesta al commit previo.. Status: pending

#### S1.T3 — Mostrar en el popup del frontend (Informacion adicional / Documentos pendientes) los contadores Facturas (Pendiente de pago y Vencida), Notas y Cheques desde la respuesta de getClienteNotification, reusando el componente de popup existente.
Contrato: rollback: Revertir el componente del popup al commit previo.. Status: pending

#### S1.T4 — Tests y regresión: en catalogos.controller.spec.ts y en el spec del service, agregar los casos de REQ-01, REQ-02 y REQ-03 (incluido el criterio 24: un Rechazado y un Pendiente devuelven 1) y verificar que los casos existentes de credito y bloqueo (líneas 262, 281 y 292) pasan sin cambios.
Contrato: rollback: Revertir los casos agregados en los specs.. Status: pending

#### S2.T1 — Crear el endpoint de Estado de cuenta del cliente: cabecera (datos del cliente, Activo o Bloqueado) y grilla de facturas con saldo y notas con saldo disponible, con las columnas Tipo documento, N° documento, Origen, Estado, Fecha, Total, Abono y Pendiente, más la suma de Pendiente. Filtro por rango de fechas y paginación en servidor (DET-41), reusando la proyección de 3/7. Sin cheques.
Contrato: rollback: Eliminar el endpoint y su método de service y revertir el controller.. Status: pending

#### S2.T2 — Pantalla Estado de cuenta en el frontend y conexión de 'Mas detalles'.
Contrato: rollback: Eliminar la ruta y la vista nuevas y revertir el popup.. Status: pending
Subtasks: 2 (ejecutar hojas; el padre espera a todas)

#### S2.T2.1 — Registrar la ruta nueva del Estado de cuenta con el id del cliente y crear la vista: cabecera, filtro de fechas, grilla con suma de Pendiente y N° documento enlazado al detalle del documento.
Contrato: rollback: Eliminar la vista y la entrada del router.. Status: pending

#### S2.T2.2 — En el popup, 'Mas detalles' abre la ruta con window.open(url, '_blank') sin perder el estado de Crear factura.
Contrato: rollback: Revertir el handler de 'Mas detalles' en el popup.. Status: pending

#### S2.T3 — Tests y regresión del Estado de cuenta: el filtro de fechas excluye documentos fuera de rango, la suma de Pendiente es igual a la del popup y a la proyección del listado de 3/7 (criterio 25), y la respuesta no incluye cheques.
Contrato: rollback: Revertir los casos agregados.. Status: pending

## Verificacion runtime

1. **Qué:** Verificar en runtime: 'Mas detalles' del popup abre en una pestaña nueva la pantalla Estado de cuenta del cliente (T-12). Muestra una cabecera con los datos del cliente y el estado Activo o Bloqueado, un filtro por rango de fechas y una grilla con las facturas con saldo y las notas con saldo disponi
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

- tipo: create | objetos: cheques, cheques.cliente_id, cheques.numero, cheques.banco, cheques.importe, cheques.fecha_emision, cheques.fecha_vencimiento, cheques.status_id (FK statuses módulo 3), cheque_facturas (cheque_id, factura_id) | destructivo: no | tarea: S1.T1 | rollback: Ejecutar el down de la migración, que hace DROP de cheque_facturas y de cheques. Son tablas nuevas sin datos previos.
