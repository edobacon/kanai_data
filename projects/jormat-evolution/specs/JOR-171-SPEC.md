---
id: JOR-171-SPEC
project: jormat-evolution
ticket: JOR-171
status: approved
---

# JOR-171 · Facturas cliente (feedback) 3/7 · Saldo, pagos y estados comerciales en el listado

## Resumen ejecutivo

3 sesiones (en el techo de entrada): S1 persiste los pagos de cliente en el módulo de Cobranza reutilizando las capabilities y payment_methods existentes, y calcula la proyección única de saldo y los estados comerciales; S2 amplía el listado del servidor con estado comercial, filtros, exclusión de guías de despacho y las tres tarjetas agregadas sobre el conjunto filtrado del usuario; S3 rehace la UI del listado (tarjetas, columna de estado y filtros). NO se hace: notas de crédito y su aplicación (5/7, la proyección queda preparada), cheques (4/7) ni reportes de cobranza; no se crean capabilities nuevas, ni tabla de 'vencidas', ni tabla de medios de pago. Cómo se sabe que funciona: un pago registrado sobrevive a un reinicio y cambia saldo y estado; crédito a 30 días emitido hace 31 días con saldo queda Vencida; dos pagos parciales que completan el total dejan la factura Pagada; un borrador no cuenta; cada filtro devuelve el conjunto esperado y con rango de fechas los tres contadores coinciden con la tabla filtrada. Tamaño estimado: 3 sesiones (~T3+T2+T2), 12 tareas de primer nivel. El request cabe en el techo, pero queda al límite.

Datos a confirmar antes de ejecutar: nombres exactos de los scripts npm de migración y de test del backend (backend/jormat-api/package.json) y del frontend (frontend/package.json) y su runner (Jest vs Vitest); ruta real del componente de listado de Facturas cliente y de su test; nombre de la tabla de facturas cliente y de la de notas de crédito; confirmar que el plazo 30/60 sale de payment_methods.payment_term; nombre de la tabla/entidad de notas de crédito emitidas para el contador de tarjetas.

## Requirements

### REQ-01 `confirmed`
> Fuente: backend/jormat-api/src/payments/payments.service.ts:274

Registrar y aplicar un pago de cliente persiste de forma atómica un pago (cliente, fecha, importe, medio tomado de payment_methods, referencia, usuario, estado vigente/revertido) y su aplicación a la factura (importe aplicado), reutilizando las capabilities existentes payments.customers:record-payment y apply-payment; applyPayment deja de usar el SEED y el pago sobrevive a un reinicio del servicio.

### REQ-02 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:447

Existe una única proyección de saldo compartida por estado, listado, tarjetas, popup (4/7) y Estado de cuenta (4/7): saldo = total del documento - pagos aplicados - notas de crédito aplicadas; no se introduce tabla de 'vencidas'.

### REQ-03 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:447

Se calculan estados comerciales separados del estado SII simulado: Borrador (sin folio, fuera de deuda), Pendiente de pago (emitida, saldo>0, dentro del plazo), Pagada (saldo=0) y Vencida (saldo>0 y plazo de 30/60 días cumplido según payment_term de payment_methods).

### REQ-04 `confirmed`
> Fuente: backend/jormat-api/src/sales/dte-type-map.ts:14

El listado expone tres tarjetas comerciales — Pendientes de pago (saldo>0 dentro del plazo), Vencidos (saldo>0 y plazo cumplido) y Notas de crédito — que reemplazan las tarjetas centradas en SII; los borradores no cuentan en ninguna. La tarjeta Notas de crédito NO tiene tabla propia: es el conteo de documentos de la tabla invoices con type_id = 3 (nota_credito, backend/jormat-api/src/sales/dte-type-map.ts:14) e is_draft = 0 (todas las emitidas), respetando los filtros activos y el acceso del usuario. Con los datos reales de hoy da 0 porque el builder todavía no genera notas de crédito; ese 0 es el resultado esperado hasta el ticket 5/7.

### REQ-05 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:447

Las tarjetas cuentan los documentos que cumplen los filtros activos y el acceso del usuario y se recalculan al aplicar o limpiar filtros; la agregación se hace en el servidor sobre los datos persistidos.

### REQ-06 `confirmed`
> Fuente: front/jormat-front/src/components/ventas/list/DocumentosListView/DocumentosListView.tsx:637

El listado permite filtrar por RUT, nombre o razón social, Origen, O.C. (columna 'Orden'), rango de fechas (se mantiene) y estado comercial (Borrador, Pendiente de pago, Pagada, Vencida). El filtro marcado en la captura p.6 que se elimina es el último selector de la fila, 'estado del documento' (Todas/Borrador/Emitida), en front/jormat-front/src/components/ventas/list/DocumentosListView/DocumentosListView.tsx:637 (aria-label 'Filtrar por estado del documento', estado estadoDocumentoFilter, agregado en JOR-166 S2.T6): se quita el selector, su chip de filtro activo, el parámetro estadoDocumento del API (front y backend) y los tests asociados. Los selectores de tipo de documento, estado SII y estado comercial SE MANTIENEN; el estado comercial (Borrador, Pendiente de pago, Pagada, Vencida) ya cubre esa distinción.

### REQ-07 `confirmed`
> Fuente: backend/jormat-api/src/sales/sales.service.ts:447

El listado de facturas cliente excluye las guías de despacho (R-01).

### ENF-01 `confirmed` `enforcement`
> Fuente: backend/jormat-api/migrations/20261001000008_payment_methods_legacy.ts:6

Reutilizar la tabla existente payment_methods para los medios de pago y su payment_term (plazo 30/60 días); no crear tabla de medios ni duplicar el catálogo.

### ENF-02 `confirmed` `enforcement`
> Fuente: backend/jormat-api/seeds/07_payments_capabilities.ts:31

Reutilizar las capabilities existentes payments.customers:record-payment y payments.customers:apply-payment y los guards del módulo; no sembrar capabilities nuevas ni tocar seeds de otros módulos.

### ENF-03 `confirmed` `enforcement`
> Fuente: backend/jormat-api/src/payments/payments.controller.ts:108

Mantener el patrón del módulo payments (controller/service/dto + guards + Swagger) y no romper los consumidores actuales de applyPayment citados en el contexto.

### ENF-04 `confirmed` `enforcement`
> Fuente: backend/jormat-api/seeds/07_payments_capabilities.ts:45

La reversión de un pago se gobierna con la capability EXISTENTE payments.customers:delete, ya sembrada en backend/jormat-api/seeds/07_payments_capabilities.ts:45 y ya exigida por el DELETE del controller (backend/jormat-api/src/payments/payments.controller.ts:118): no se siembra ninguna capability nueva ni se cambia el guard del endpoint. Revertir marca el pago como revertido (estado vigente/revertido) y NO borra físicamente el pago ni su aplicación.

### ENF-05 `confirmed` `enforcement`
> Fuente: backend/jormat-api/migrations/20261003000012_invoices_sales_persistence.ts:31

El contador de la tarjeta Notas de crédito se calcula con un conteo sobre la tabla existente invoices (type_id = 3, is_draft = 0) dentro de la misma agregación filtrada del listado; no se crea tabla, migración ni endpoint propio de notas de crédito (eso es alcance del ticket 5/7).
## Tasks

#### S1.T1 — Migración de esquema de cobranza: crear customer_payments (cliente, fecha, importe, medio FK a payment_methods, referencia, usuario, estado vigente/revertido) y customer_payment_applications (pago, factura, importe aplicado) con índices por workspace y factura. Reutiliza la tabla payment_methods existente (ENF-01).
Contrato: rollback: Ejecutar el down de la migración (knex migrate:rollback) que hace dropTableIfExists de customer_payments y customer_payment_applications.. Status: done

#### S1.T1.1 — Crear la migración de cobranza con la tabla customer_payments (cliente, fecha, importe, medio FK a payment_methods, referencia, usuario, estado vigente/revertido) e índices por workspace.
Contrato: rollback: Ejecutar el down de la migración (knex migrate:rollback) que hace dropTableIfExists de customer_payments.. Status: done

#### S1.T1.2 — Agregar a la misma migración la tabla customer_payment_applications (pago, factura, importe aplicado) con índices por workspace y por factura.
Contrato: rollback: Ejecutar el down de la migración que hace dropTableIfExists de customer_payment_applications.. Status: done

#### S1.T1.3 — Implementar el down de la migración que elimina customer_payment_applications y customer_payments en orden inverso de FKs.
Contrato: rollback: git revert del commit de la migración; se restaura el esquema previo.. Status: done

#### S1.T1.4 — Verificar el esquema corriendo la migración up y down y el typecheck del backend.
Contrato: rollback: git revert del commit de verificación; no afecta código de producción.. Status: done

#### S1.T2 — Servicio de registro y aplicación de pago: persistir el pago y su aplicación en una transacción única, con reversión (marcar vigente/revertido), reutilizando payment_methods y respetando los guards record-payment+apply-payment; applyPayment deja de devolver el SEED.
Contrato: rollback: git revert del commit del servicio; el endpoint vuelve a la respuesta basada en SEED.. Status: done

#### S1.T2.1 — Implementar en payments.service.ts la persistencia transaccional del pago y su aplicación (record+apply atómico) sobre customer_payments y customer_payment_applications.
Contrato: rollback: git revert del commit de persistencia; el servicio vuelve a la respuesta SEED.. Status: done

#### S1.T2.2 — Ajustar/crear endpoints del controller (POST record+apply) y DTOs con guards de capability, manteniendo el contrato de respuesta para los consumidores actuales (payments.controller.ts:108/113).
Contrato: rollback: git revert del commit de controller/DTO; se restaura el contrato y los guards previos.. Status: done

#### S1.T2.3 — Implementar la reversión del pago marcándolo como revertido (estado vigente/revertido), sin borrar físicamente el pago ni su aplicación, gateada por la capability EXISTENTE payments.customers:delete (ya sembrada en backend/jormat-api/seeds/07_payments_capabilities.ts:45 y ya exigida por el DELETE en backend/jormat-api/src/payments/payments.controller.ts:118). No sembrar capability nueva ni cambiar el guard del endpoint; un pago revertido deja de restar en el saldo proyectado.
Contrato: rollback: git revert del commit de reversión; el pago queda sin operación de reversión.. Status: done

#### S1.T3 — Proyección única de saldo y estados comerciales: función que calcula saldo = total - pagos aplicados - notas de crédito aplicadas (preparada para 5/7) y deriva el estado Borrador/Pendiente de pago/Pagada/Vencida usando payment_term de payment_methods; sin tabla de vencidas.
Contrato: rollback: git revert del commit de proyección; el listado vuelve a calcular sin saldo proyectado ni estado comercial.. Status: done

#### S1.T3.1 — Implementar la función de saldo proyectado = total del documento - pagos aplicados - notas de crédito aplicadas, preparada para sumar las notas de crédito de 5/7.
Contrato: rollback: git revert del commit de la función de saldo; el listado vuelve a calcular sin saldo proyectado.. Status: done

#### S1.T3.2 — Derivar el estado comercial Borrador/Pendiente de pago/Pagada/Vencida usando el plazo (30/60) de payment_methods.payment_term, sin tabla de vencidas.
Contrato: rollback: git revert del commit de estados; el listado vuelve a calcular sin estado comercial.. Status: done

#### S1.T3.3 — Integrar la proyección única en el summary de sales.service.ts preservando sus campos actuales y agregando saldo y estado comercial.
Contrato: rollback: git revert del commit de integración; el summary vuelve a sus campos previos.. Status: done

#### S1.T4 — Tests de persistencia, proyección y estados: pago sobrevive a un reinicio, saldo correcto con pagos y notas de crédito, y límite de plazo (día 30/31) para Pendiente de pago vs Vencida.
Contrato: rollback: git revert del commit de tests; no afecta código de producción.. Status: done

#### S1.T4.1 — Test de persistencia: un pago registrado y aplicado sobrevive a un reinicio del servicio y el saldo proyectado lo refleja.
Contrato: rollback: git revert del commit de tests; no afecta código de producción.. Status: done

#### S1.T4.2 — Test de proyección de saldo: total 100 con pagos aplicados 30 y notas de crédito aplicadas 20 da 50; sin pagos el saldo es el total; pagos+notas iguales al total dan 0.
Contrato: rollback: git revert del commit de tests; no afecta código de producción.. Status: done

#### S1.T4.3 — Test de límite de plazo: al día 30 el estado es Pendiente de pago, al día 31 es Vencida; saldo 0 es Pagada y sin folio es Borrador sin contar como deuda.
Contrato: rollback: git revert del commit de tests; no afecta código de producción.. Status: done

#### S1.T4.4 — Test de regresión de los consumidores actuales de applyPayment (payments.controller.ts:108/113 y AplicarPagoView) y de los guards record-payment+apply-payment.
Contrato: rollback: git revert del commit de tests; no afecta código de producción.. Status: done

#### S2.T3 — Agregación en servidor de las tres tarjetas (Pendientes de pago, Vencidos, Notas de crédito) sobre el conjunto filtrado y con el acceso del usuario, recalculada al aplicar o limpiar filtros.
Contrato: rollback: git revert del commit de agregación; los contadores dejan de devolverse.. Status: done

#### S2.T3.1 — Contadores de Pendientes de pago (saldo>0 dentro del plazo) y Vencidos (saldo>0 y plazo cumplido), excluyendo borradores.
Contrato: rollback: git revert del commit de contadores de pago/vencido.. Status: done

#### S2.T3.2 — Contador de Notas de crédito integrado a la misma agregación: conteo de documentos de la tabla invoices con type_id = 3 (nota_credito, backend/jormat-api/src/sales/dte-type-map.ts:14) e is_draft = 0 (todas las emitidas), respetando los filtros activos y el acceso del usuario. No se crea tabla ni endpoint de notas de crédito. Con los datos reales de hoy el contador da 0 porque el builder aún no genera notas de crédito: ese 0 es el resultado esperado hasta el ticket 5/7, no un defecto.
Contrato: rollback: git revert del commit del contador de notas de crédito.. Status: done

#### S2.T3.3 — Exponer el contrato de contadores en la respuesta del listado, calculados sobre el mismo conjunto filtrado del usuario.
Contrato: rollback: git revert del commit de contrato de contadores.. Status: done

#### S2.T5 — Exponer el estado comercial por documento en el listado y excluir las guías de despacho en la consulta de sales.service.ts.
Contrato: rollback: git revert del commit del listado; se restaura la consulta previa sin estado comercial ni exclusión.. Status: done

#### S2.T6 — Filtros y búsqueda del lado servidor en el listado: RUT, nombre/razón social, Origen, O.C. (columna 'Orden'), rango de fechas y estado comercial. Eliminar el parámetro estadoDocumento del contrato del listado: quitarlo de backend/jormat-api/src/sales/dto/list-documentos-query.dto.ts:50 y la rama que lo aplica en backend/jormat-api/src/sales/sales.service.ts:41 y :130-132, y borrar los casos que lo ejercían en backend/jormat-api/src/sales/sales.service.spec.ts:314-345. Mantener los filtros de tipoDTE, estadoSII y estadoComercial; el campo estadoDocumento del documento en la respuesta (sales.repository.ts:197) NO se toca, solo se quita el filtro.
Contrato: rollback: git revert del commit de filtros; la query vuelve a los parámetros previos.. Status: done

#### S2.T7 — Tests del listado: estado comercial por documento, cada filtro por campo, exclusión de guías de despacho y coincidencia de los tres contadores con la tabla filtrada (con y sin rango de fechas).
Contrato: rollback: git revert del commit de tests; no afecta código de producción.. Status: done

#### S3.T1 — Reemplazar las tarjetas centradas en SII por las tres tarjetas comerciales (Pendientes de pago, Vencidos, Notas de crédito) conectadas a la agregación del servidor y recalculadas con los filtros activos.
Contrato: rollback: git revert del commit de tarjetas; se restauran las tarjetas centradas en SII.. Status: pending

#### S3.T2 — Mostrar el estado comercial por documento en el listado y dejar el filtro de estado comercial (Borrador, Pendiente de pago, Pagada, Vencida). Eliminar el último selector de la fila de filtros, 'estado del documento' (Todas/Borrador/Emitida) de front/jormat-front/src/components/ventas/list/DocumentosListView/DocumentosListView.tsx:637-654 (aria-label 'Filtrar por estado del documento'), junto con el estado estadoDocumentoFilter (:199), su chip de filtro activo (:148, :165-169, :298-300, :318), el parámetro estadoDocumento de listParams/summaryFilters/export/print (:244, :261, :385-387, :438-440), el tipo EstadoDocumentoFiltro de src/services/api/ventas/documentos.ts y las constantes ESTADO_DOCUMENTO_FILTRO / ESTADO_DOCUMENTO_FILTRO_LABEL de src/lib/schemas/ventas.ts, y borrar DocumentosListView.estadoDocumento.test.tsx. Mantener los selectores de tipo de documento, estado SII y estado comercial.
Contrato: rollback: git revert del commit de estado/filtro; se restaura la columna y los filtros previos.. Status: pending

#### S3.T3 — Conectar los filtros de RUT, nombre/razón social, Origen, O.C. y rango de fechas para que la tabla y las tres tarjetas se recalculen al aplicar o limpiar filtros.
Contrato: rollback: git revert del commit de wiring de filtros; la tabla vuelve a no disparar recálculo de tarjetas.. Status: pending

#### S3.T4 — Tests de UI del listado: render de la columna de estado comercial, de las tres tarjetas comerciales (incluida Notas de crédito en 0 cuando no hay notas emitidas) y de su recálculo al aplicar y limpiar filtros; y regresión de que el selector 'Filtrar por estado del documento' y su chip ya no se renderizan mientras siguen presentes los de tipo, estado SII y estado comercial. Los archivos del listado están en front/jormat-front/src/components/ventas/list/DocumentosListView/ y la tabla en front/jormat-front/src/components/ventas/list/DocumentosTable/DocumentosTable.tsx.
Contrato: rollback: git revert del commit de tests; no afecta código de producción.. Status: pending
## Cambios al modelo de datos

- tipo: create | objetos: customer_payments | destructivo: no | tarea: S1.T1 | rollback: Ejecutar el down de la migración (knex migrate:rollback) que hace dropTableIfExists de customer_payments.
- tipo: create | objetos: customer_payment_applications | destructivo: no | tarea: S1.T1 | rollback: Ejecutar el down de la migración que hace dropTableIfExists de customer_payment_applications.

## Enmiendas (refine_spec)

### Enmienda 1

**Task ops:**

- move S3.T1 → S7
- move S3.T2 → S7
- move S3.T3 → S7
- move S3.T4 → S7
- move S2.T6 → S6
- move S2.T7 → S6
- move S2.T1 → S5
- move S2.T2 → S5
- move S2.T3 → S5
- move S2.T4 → S5
- move S2.T5 → S5
- move S1.T16 → S4
- move S1.T17 → S4
- move S1.T18 → S4
- move S1.T11 → S3
- move S1.T12 → S3
- move S1.T13 → S3
- move S1.T14 → S3
- move S1.T15 → S3
- move S1.T6 → S2
- move S1.T7 → S2
- move S1.T8 → S2
- move S1.T9 → S2
- move S1.T10 → S2

### Enmienda 2
**REQs:**

- REQ-04 (edit) `confirmed`: El listado expone tres tarjetas comerciales — Pendientes de pago (saldo>0 dentro del plazo), Vencidos (saldo>0 y plazo cumplido) y Notas de 
- REQ-06 (edit) `confirmed`: El listado permite filtrar por RUT, nombre o razón social, Origen, O.C. (columna 'Orden'), rango de fechas (se mantiene) y estado comercial 
- REQ-01 (edit) `confirmed`: Registrar y aplicar un pago de cliente persiste de forma atómica un pago (cliente, fecha, importe, medio tomado de payment_methods, referenc
- ENF-01 (edit) `confirmed`: Reutilizar la tabla existente payment_methods para los medios de pago y su payment_term (plazo 30/60 días); no crear tabla de medios ni dupl
- ENF-02 (edit) `confirmed`: Reutilizar las capabilities existentes payments.customers:record-payment y payments.customers:apply-payment y los guards del módulo; no semb
- ENF-03 (edit) `confirmed`: Mantener el patrón del módulo payments (controller/service/dto + guards + Swagger) y no romper los consumidores actuales de applyPayment cit
- ENF-04 (add) `confirmed`: La reversión de un pago se gobierna con la capability EXISTENTE payments.customers:delete, ya sembrada en backend/jormat-api/seeds/07_paymen
- ENF-05 (add) `confirmed`: El contador de la tarjeta Notas de crédito se calcula con un conteo sobre la tabla existente invoices (type_id = 3, is_draft = 0) dentro de 

**Task ops:**

- edit S1.T2.3 { desc="Implementar la reversión del pago marcándolo como revertido (estado vigente/revertido), sin borrar físicamente el pago ni su aplicación, gateada por la capability EXISTENTE payments.customers:delete (ya sembrada en backend/jormat-api/seeds/07_payments_capabilities.ts:45 y ya exigida por el DELETE en backend/jormat-api/src/payments/payments.controller.ts:118). No sembrar capability nueva ni cambiar el guard del endpoint; un pago revertido deja de restar en el saldo proyectado.", validates=["REQ-01","REQ-02","ENF-04"], verify=["npm test --prefix backend/jormat-api -- payments.service","npm test --prefix backend/jormat-api -- payments.controller"] }
- edit S2.T3.2 { desc="Contador de Notas de crédito integrado a la misma agregación: conteo de documentos de la tabla invoices con type_id = 3 (nota_credito, backend/jormat-api/src/sales/dte-type-map.ts:14) e is_draft = 0 (todas las emitidas), respetando los filtros activos y el acceso del usuario. No se crea tabla ni endpoint de notas de crédito. Con los datos reales de hoy el contador da 0 porque el builder aún no genera notas de crédito: ese 0 es el resultado esperado hasta el ticket 5/7, no un defecto.", validates=["REQ-04","ENF-05"], verify=["npm test --prefix backend/jormat-api -- sales.service"] }
- edit S5.T2 { desc="Filtros y búsqueda del lado servidor en el listado: RUT, nombre/razón social, Origen, O.C. (columna 'Orden'), rango de fechas y estado comercial. Eliminar el parámetro estadoDocumento del contrato del listado: quitarlo de backend/jormat-api/src/sales/dto/list-documentos-query.dto.ts:50 y la rama que lo aplica en backend/jormat-api/src/sales/sales.service.ts:41 y :130-132, y borrar los casos que lo ejercían en backend/jormat-api/src/sales/sales.service.spec.ts:314-345. Mantener los filtros de tipoDTE, estadoSII y estadoComercial; el campo estadoDocumento del documento en la respuesta (sales.repository.ts:197) NO se toca, solo se quita el filtro.", validates=["REQ-06"], verify=["npm test --prefix backend/jormat-api -- sales","npm run lint --prefix backend/jormat-api"] }
- edit S7.T1 { verify=["npm test --prefix front/jormat-front -- src/components/ventas/list"] }
- edit S7.T2 { desc="Mostrar el estado comercial por documento en el listado y dejar el filtro de estado comercial (Borrador, Pendiente de pago, Pagada, Vencida). Eliminar el último selector de la fila de filtros, 'estado del documento' (Todas/Borrador/Emitida) de front/jormat-front/src/components/ventas/list/DocumentosListView/DocumentosListView.tsx:637-654 (aria-label 'Filtrar por estado del documento'), junto con el estado estadoDocumentoFilter (:199), su chip de filtro activo (:148, :165-169, :298-300, :318), el parámetro estadoDocumento de listParams/summaryFilters/export/print (:244, :261, :385-387, :438-440), el tipo EstadoDocumentoFiltro de src/services/api/ventas/documentos.ts y las constantes ESTADO_DOCUMENTO_FILTRO / ESTADO_DOCUMENTO_FILTRO_LABEL de src/lib/schemas/ventas.ts, y borrar DocumentosListView.estadoDocumento.test.tsx. Mantener los selectores de tipo de documento, estado SII y estado comercial.", validates=["REQ-03","REQ-06"], verify=["npm test --prefix front/jormat-front -- src/components/ventas/list","npm run typecheck --prefix front/jormat-front"] }
- edit S7.T3 { verify=["npm test --prefix front/jormat-front -- src/components/ventas/list"] }
- edit S7.T4 { desc="Tests de UI del listado: render de la columna de estado comercial, de las tres tarjetas comerciales (incluida Notas de crédito en 0 cuando no hay notas emitidas) y de su recálculo al aplicar y limpiar filtros; y regresión de que el selector 'Filtrar por estado del documento' y su chip ya no se renderizan mientras siguen presentes los de tipo, estado SII y estado comercial. Los archivos del listado están en front/jormat-front/src/components/ventas/list/DocumentosListView/ y la tabla en front/jormat-front/src/components/ventas/list/DocumentosTable/DocumentosTable.tsx.", validates=["REQ-03","REQ-04","REQ-05","REQ-06"], verify=["npm test --prefix front/jormat-front -- src/components/ventas/list"] }
- move S5.T1 → S2
- move S5.T2 → S2
- move S5.T3 → S2
- move S7.T1 → S3
- move S7.T2 → S3
- move S7.T3 → S3
- move S7.T4 → S3
## Sessions

### Session 1 · T3 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T1.3
- [x] S1.T1.4
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T2.3
- [x] S1.T3
- [x] S1.T3.1
- [x] S1.T3.2
- [x] S1.T3.3
- [x] S1.T4
- [x] S1.T4.1
- [x] S1.T4.2
- [x] S1.T4.3
- [x] S1.T4.4

**Gate (auto)**: Vía API, registrar y aplicar un pago actualiza el saldo proyectado y el estado comercial de la factura y el pago persiste tras reiniciar el servicio; verificable por endpoints y por los tests del módulo payments/sales.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T3
- [x] S2.T3.1
- [x] S2.T3.2
- [x] S2.T3.3
- [x] S2.T5
- [x] S2.T6
- [x] S2.T7

**Gate (auto)**: El endpoint de listado de Facturas cliente devuelve cada documento con su estado comercial, aplica los filtros (RUT, nombre/razón social, Origen, O.C., rango de fechas y estado comercial), excluye guías de despacho y devuelve los tres contadores calculados sobre el conjunto filtrado del usuario; verificable por API y tests.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4

**Gate (auto)**: En el listado de Facturas cliente se ve la columna de estado comercial, las tres tarjetas comerciales que se recalculan al aplicar o limpiar filtros, y los filtros nuevos sin el filtro removido de la captura p.6; verificable en la app con datos de prueba.

### Session 5 · open

### Session 7 · open
