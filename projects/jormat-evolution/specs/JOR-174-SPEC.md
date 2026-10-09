---
id: JOR-174-SPEC
project: jormat-evolution
ticket: JOR-174
status: approved
---

# JOR-174 · Facturas cliente (feedback) 6/7 · Entrega Rapida, Formato Bodega e impresion de despacho

## Resumen ejecutivo

Se agregan en Evolution las acciones de Bodega para facturas cliente emitidas: Entrega Rapida idempotente sobre las columnas legacy is_out/date_out/user_out_id/commentary_out, Formato Bodega imprimible con la ubicacion de cada repuesto (o 'Sin ubicacion'), Visualizar con imprimir factura e imprimir datos de despacho, y el selector de transporte T-09 conectado a transport_companies. NO se hace: entrega parcial, asignacion de ubicaciones de picking, reservas de stock, persistencia de bultos/dimensiones/peso/fragil, ni movimiento de stock en la entrega (ya se desconto al emitir en 2/7). Funciona si: una segunda Entrega Rapida devuelve la factura con la misma fecha y usuario y sin movimientos de stock nuevos; el Formato Bodega de una factura con un repuesto sin ubicacion muestra 'Sin ubicacion' en esa linea; la impresion de despacho toma destinatario, RUT, telefono, direccion, ciudad, transporte y observacion de la factura guardada; ninguna accion se bloquea por el estado SII. Tamaño: 3 sesiones T2 (aprox. 6 a 8 h). ADVERTENCIAS: depende de 1/7 (copia del receptor y transporte en la factura) y 2/7 (stock al emitir); si 1/7 no persistio el transporte en la factura, REQ-03 queda bloqueado. Las migraciones existen duplicadas en backend/ y monorepo/backend/jormat-api/: confirmar cual es la vigente antes de tocar nada.

Datos a confirmar antes de ejecutar:
1) Nombre de la tabla de facturas de venta y su endpoint/servicio actual (definida en backend/migrations/20261003000000_invoices_legacy.ts; confirmar nombre exacto y ruta del modulo de facturas en backend).
2) Tabla y columnas donde vive la ubicacion fisica del repuesto por bodega (no figura en el contexto; confirmar en el KB/doc de decisiones seccion 4.6 o en las migraciones de bodega/repuestos).
3) Capability de permiso para Entrega Rapida: si existe una de Bodega reutilizable (confirmar en el seed RBAC del backend) o si hay que crear una nueva (seed_rbac, requiere aprobacion).
4) Columnas de destinatario/RUT/telefono/direccion/ciudad/transporte/observacion persistidas en la factura por JOR-168 (1/7).
5) Comandos exactos de test del backend y frontend (runner vitest o jest, script de pnpm/npm) para completar los 'verify' vacios; solo se conoce frontend/src/components/bodega/transportistas/TransportistasView/TransportistasView.test.tsx.
6) Datos del bloque remitente (Jormat): razon social, RUT, direccion; confirmar si estan en configuracion de empresa o hay que tomarlos del legacy (doc de decisiones seccion 4.6).

## Requirements

### REQ-01 `confirmed`
> Fuente: Pedido de cambio: respuestas JOR-174-Q6 y JOR-174-Q10; Request JOR-174 alcance 1 (Entrega Rapida, P-11.1 opcion A)

Entrega Rapida: accion de fila para facturas cliente emitidas y no entregadas que, en un clic y sin exigir pago, marca la factura entregada registrando is_out=true, date_out, user_out_id (usuario actual) y commentary_out; no mueve stock y es idempotente (una segunda llamada no reescribe fecha ni usuario ni mueve stock). Se considera emitida una factura con is_draft = 0 y folio no nulo, excluyendo las anuladas (el estado de anulacion lo define JOR-173). Protegida por la capability NUEVA sales.documents:quick-delivery, creada via seed_rbac y asignada a los roles bodega, jefe-local, jefe-venta y gerencia. No se reutiliza ninguna capability de Bodega existente. Nombre y roles estan cerrados (JOR-174-Q6 y Q10).

### REQ-02 `confirmed`
> Fuente: JOR-174-Q2; doc de decisiones 4.6 (R-19, P-12.1 opcion A)

Formato Bodega: vista imprimible distinta de la factura comercial, accesible desde el menu de fila y desde Visualizar, con identificacion de la factura, cliente y por cada linea (en el orden de lineas) codigo, descripcion, cantidad y todas las ubicaciones registradas del repuesto en la bodega de origen de la factura. La ubicacion se lee de item_warehouse_location (item_id, warehouse_id, location_id) junto con location (ds_code, ds_name), filtrando por la bodega de la factura y listando todas las ubicaciones del repuesto. Se usa LEFT JOIN para que un repuesto sin ubicacion se muestre con el texto 'Sin ubicacion' (el legacy usa INNER JOIN y lo omitiria).

### REQ-03 `confirmed`
> Fuente: Migraciones 20261003000000_invoices_legacy.ts (invoices.commentary) y 20261003000012 (receiver_*); doc de decisiones seccion 4.6 y 5; legacy print-pack-off.html

Imprimir datos de despacho desde Visualizar: muestra destinatario (invoices.receiver_razon_social), RUT (receiver_rut), telefono (receiver_telefono), direccion (receiver_direccion), ciudad (receiver_ciudad) (migracion 20261003000012), transporte (transportation_id y transportation_name) y observacion (invoices.commentary, varchar 500, migracion 20261003000000_invoices_legacy.ts; el campo equivalente de la entrega es commentary_out), todos guardados en la factura, mas un bloque de remitente Jormat tomado de una constante o config de empresa en Evolution (no existe tabla de configuracion) con los valores del legacy print-pack-off.html: Importadora de Repuestos Jormat Ltda, RUT 76.193.704-9, Valdivia 906 Los Angeles, cel +569 92050943, tel +43 2 361215 (confirmar con el cliente que sigan vigentes). Cantidad de bultos, dimensiones, peso y fragil se ingresan en la pantalla de impresion y no se persisten. Los puntos 2 (tabla de ubicaciones, resuelto en REQ-02 con item_warehouse_location y location) y 6 (remitente, resuelto en REQ-03 y REQ-09) de 'Datos a confirmar' quedan resueltos.

### REQ-04 `confirmed`
> Fuente: backend/migrations/20260901000001_transport_companies.ts:6

Selector de transporte T-09 conectado al catalogo real transport_companies (reemplaza la lista simulada), usando la misma fuente que la vista de Transportistas.

### REQ-05 `inferred`
> Fuente: backend/migrations/20261003000000_invoices_legacy.ts:26

Visualizar de factura cliente ofrece las acciones Imprimir factura e Imprimir datos de despacho (R-06), ademas del acceso a Formato Bodega.

### REQ-06 `confirmed`
> Fuente: backend/migrations/20261003000000_invoices_legacy.ts:26

Ninguna de las acciones (Entrega Rapida, Formato Bodega, imprimir despacho, imprimir factura) espera ni depende del estado SII de la factura (P-15.1.D1).

### REQ-07 `confirmed` `enforcement`
> Fuente: Adenda 2 de JOR-174 (2026-10-09, usuario eduardo.bacon), decision 1b

Enforcement: Entrega Rapida reutiliza las columnas legacy existentes is_out, user_out_id, commentary_out y date_out de la tabla de facturas; no se crean columnas nuevas ni se reescriben datos migrados. Excepcion (Adenda 2, 2026-10-09): la columna invoices.user_out_id cambia de integer a varchar(64) porque el usuario actual es un uuid y no cabe en un entero. El resto de las columnas legacy (is_out, date_out, commentary_out) se reutiliza sin cambios.

### REQ-08 `confirmed` `enforcement`
> Fuente: frontend/src/components/bodega/transportistas/TransportistasView/TransportistasView.tsx:180

Enforcement: el selector T-09 consume el mismo origen de datos/servicio de transport_companies que usa TransportistasView, sin duplicar el acceso al catalogo.

### REQ-09 `confirmed` `enforcement`
> Fuente: JOR-174-Q1 (no existe tabla de configuracion en Evolution)

Enforcement: los datos del remitente Jormat viven en una unica constante o config de empresa en Evolution reutilizada por la impresion de despacho; no se crea tabla de configuracion ni se hardcodean los valores en la plantilla.

### REQ-10 `confirmed`
> Fuente: Adenda 2 de JOR-174 (2026-10-09), decision 1b; migracion 20261012000000

Migracion de tipo backend/migrations/20261012000000_invoices_user_out_text.ts: up cambia invoices.user_out_id de integer a varchar(64) con USING user_out_id::text. El down es con perdida: los valores uuid (no numericos) pasan a NULL y los valores numericos se conservan al volver a integer.

### REQ-11 `confirmed`
> Fuente: Adenda 2 de JOR-174 (2026-10-09), decisiones 2a y 3a; migracion 20261013000000

Migracion de grants backend/migrations/20261013000000_role_grants_delivery_view_transport y seeds 10 y 20 equivalentes: sales.documents:quick-delivery para bodega, jefe-local, jefe-venta, gerencia, owner e internal-admin (paridad con los seeds); sales.documents:view para bodega; entities.transport_companies:view para vendedor (lo exige el selector de transportistas del REQ-04). El down es simetrico: retira todos esos grants sin borrar las capabilities.
## Tasks

#### S1.T1 — Crear via seed_rbac la capability NUEVA sales.documents:quick-delivery y asignarla a los roles bodega, jefe-local, jefe-venta y gerencia. No reutilizar ninguna capability de Bodega existente. El nombre y los roles estan cerrados (JOR-174-Q6 y Q10): el ejecutor no debe decidirlos ni consultarlos.
Contrato: rollback: Revertir el commit del endpoint y, si se creo capability, ejecutar el down de su migracion RBAC.. Status: done

#### S1.T1.1 — Proteger la accion de Entrega Rapida (endpoint y accion de fila) con la capability sales.documents:quick-delivery, creada en S1.T1 via seed_rbac y asignada a bodega, jefe-local, jefe-venta y gerencia. Sin alternativa de reutilizar una capability existente.
Contrato: rollback: Down de la migracion RBAC o revertir commit.. Status: done

#### S1.T1.2 — Servicio y ruta de Entrega Rapida con UPDATE condicionado por is_out=false; respuesta devuelve la factura con sus valores actuales en ambos casos.
Contrato: rollback: Revertir commit del servicio y la ruta.. Status: done

#### S1.T2 — Frontend: accion de fila 'Entrega Rapida' en el listado de facturas cliente, visible solo para emitidas con is_out=false y usuarios con la capability; modal con comentario opcional y refresco de la fila.
Contrato: rollback: Revertir el commit del componente de accion.. Status: done

#### S1.T3 — Tests S1: endpoint (feliz, criterio 19 idempotencia con otro usuario, 403 sin capability, estado SII pendiente, factura migrada con is_out=true) y visibilidad de la accion de fila.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: done

#### S2.T1 — Backend Formato Bodega: endpoint de lectura que devuelve cabecera (numero, fecha, cliente) y lineas en orden con codigo, descripcion, cantidad y lista de ubicaciones del repuesto en la bodega de origen (tabla de ubicaciones a confirmar), en una sola consulta agregada por factura (acotado a las lineas de esa factura, sin N+1); sin dependencia del estado SII.
Contrato: rollback: Revertir commit del endpoint.. Status: done

#### S2.T2 — Frontend: vista imprimible Formato Bodega (distinta del formato comercial) con 'Sin ubicacion' cuando la lista viene vacia; accesos desde menu de fila y desde Visualizar.
Contrato: rollback: Revertir commit de la vista y de los accesos.. Status: done

#### S2.T3 — Tests S2: endpoint (orden de lineas, varias ubicaciones, criterio 20 'Sin ubicacion', ubicacion solo en otra bodega) y render de la vista.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: done

#### S3.T1 — T-09: reemplazar la lista simulada del selector de transporte por el catalogo transport_companies (backend/migrations/20260901000001_transport_companies.ts:6), reutilizando el acceso a datos que usa TransportistasView (frontend/src/components/bodega/transportistas/TransportistasView/TransportistasView.tsx:180).
Contrato: rollback: Revertir commit; el selector vuelve a la lista previa.. Status: done

#### S3.T2 — Visualizar: agregar acciones Imprimir factura (formato comercial existente) e Imprimir datos de despacho; vista de despacho con destinatario, RUT, telefono, direccion, ciudad, transporte y observacion leidos de la factura guardada (columnas de 1/7), bloque remitente Jormat y campos locales no persistidos de bultos, dimensiones, peso y fragil.
Contrato: rollback: Revertir commit de Visualizar y de la vista de despacho.. Status: done

#### S3.T3 — Tests S3: selector con catalogo real y vacio, regresion de TransportistasView.test.tsx, despacho con datos guardados vs ficha de cliente distinta (criterio 21), campos no persistidos, factura sin transporte, botones de Visualizar y formato comercial sin ubicaciones.
Contrato: rollback: Eliminar o revertir los archivos de test agregados.. Status: done

#### S5.T1 — Registrar y verificar la migracion de tipo backend/migrations/20261012000000_invoices_user_out_text.ts (up con USING user_out_id::text; down con perdida: uuid a NULL, numericos conservados). YA ESTA IMPLEMENTADA en la rama feature/facturas-cliente-feedback: no reescribirla, solo confirmar que existe y cumple REQ-07 y REQ-10.
Contrato: rollback: No hay cambio de codigo que revertir; si la verificacion falla, solo se reporta el hallazgo sin modificar la migracion.. Status: pending

#### S5.T2 — Registrar y verificar la migracion de grants backend/migrations/20261013000000_role_grants_delivery_view_transport y los seeds 10 y 20 equivalentes (quick-delivery para bodega, jefe-local, jefe-venta, gerencia, owner e internal-admin; sales.documents:view para bodega; entities.transport_companies:view para vendedor; down simetrico sin borrar capabilities). YA ESTAN IMPLEMENTADOS en los commits b248333 y 9c787a1 de la rama feature/facturas-cliente-feedback: no reescribirlos, solo confirmar que existen y cumplen REQ-11.
Contrato: rollback: No hay cambio de codigo que revertir; si la verificacion falla, solo se reporta el hallazgo sin modificar la migracion ni los seeds.. Status: pending

#### S5.T3 — Verificar los tests existentes migrations-user-out-and-grants.e2e-spec.ts y el e2e de documentos-quick-delivery, y ajustarlos solo si faltan casos: user_out_id acepta uuid; down deja NULL los uuid y conserva numericos; cada rol recibe la capability o permiso indicado (en especial vendedor con entities.transport_companies:view); down simetrico; Entrega Rapida idempotente con user_out_id uuid sobre la columna migrada; Entrega Rapida concurrente con anulacion responde 422.
Contrato: rollback: Revertir con git los cambios a los archivos de test ajustados; si no se ajusto nada, no hay nada que revertir.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: Imprimir datos de despacho desde Visualizar: muestra destinatario, RUT, telefono, direccion, ciudad, transporte y observacion guardados en la factura mas un bloque de remitente Jormat; cantidad de bultos, dimensiones, peso y fragil se ingresan en la pantalla de impresion y no s
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
   - **Requiere una persona:** una impresión física (inferido)

## Cambios al modelo de datos

- tipo: seed_rbac | objetos: capability de Bodega para Entrega Rapida (nombre a confirmar; solo si no existe una reutilizable) | destructivo: no | tarea: S1.T1 | rollback: Migracion down que elimina la capability y sus asignaciones a roles; si se reutiliza una existente, no hay cambio de modelo y este item se descarta.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: Entrega Rapida: accion de fila para facturas cliente emitidas y no entregadas que, en un clic y sin exigir pago, marca la factura entregada 
- REQ-02 (edit) `confirmed`: Formato Bodega: vista imprimible distinta de la factura comercial, accesible desde el menu de fila y desde Visualizar, con identificacion de
- REQ-03 (edit) `confirmed`: Imprimir datos de despacho desde Visualizar: muestra destinatario (receiver_razon_social), RUT (receiver_rut), telefono (receiver_telefono),
- REQ-09 (add) `confirmed`: Enforcement: los datos del remitente Jormat viven en una unica constante o config de empresa en Evolution reutilizada por la impresion de de

### Enmienda 2
**REQs:**

- REQ-03 (edit) `confirmed`: Imprimir datos de despacho desde Visualizar: muestra destinatario (invoices.receiver_razon_social), RUT (receiver_rut), telefono (receiver_t

**Task ops:**

- edit S1.T3 { verify=["cd backend/jormat-api && npm test -- quick-delivery"] }
- edit S2.T3 { verify=["cd backend/jormat-api && npm test -- warehouse-format"] }
- edit S3.T1 { verify=["cd backend/jormat-api && npm test -- transport"] }
- edit S3.T3 { verify=["cd front/jormat-front && npm test -- dispatch","cd front/jormat-front && npm test -- TransportistasView.test.tsx"] }

### Enmienda 3
**REQs:**

- REQ-01 (edit) `confirmed`: Entrega Rapida: accion de fila para facturas cliente emitidas y no entregadas que, en un clic y sin exigir pago, marca la factura entregada 

**Task ops:**

- edit S1.T1 { desc="Crear via seed_rbac la capability NUEVA sales.documents:quick-delivery y asignarla a los roles bodega, jefe-local, jefe-venta y gerencia. No reutilizar ninguna capability de Bodega existente. El nombre y los roles estan cerrados (JOR-174-Q6 y Q10): el ejecutor no debe decidirlos ni consultarlos.", validates=["REQ-01"] }
- edit S1.T1.1 { desc="Proteger la accion de Entrega Rapida (endpoint y accion de fila) con la capability sales.documents:quick-delivery, creada en S1.T1 via seed_rbac y asignada a bodega, jefe-local, jefe-venta y gerencia. Sin alternativa de reutilizar una capability existente.", validates=["REQ-01"] }

### Enmienda 4
**REQs:**

- REQ-07 (edit) `confirmed`: Enforcement: Entrega Rapida reutiliza las columnas legacy existentes is_out, user_out_id, commentary_out y date_out de la tabla de facturas;
- REQ-10 (add) `confirmed`: Migracion de tipo backend/migrations/20261012000000_invoices_user_out_text.ts: up cambia invoices.user_out_id de integer a varchar(64) con U
- REQ-11 (add) `confirmed`: Migracion de grants backend/migrations/20261013000000_role_grants_delivery_view_transport y seeds 10 y 20 equivalentes: sales.documents:quic

**Tasks agregadas:**

- S5: Registrar y verificar la migracion de tipo backend/migrations/20261012000000_invoices_user_out_text.ts (up con USING user_out_id::text; down con perdida: uuid a NULL, numericos conservados). YA ESTA IMPLEMENTADA en la rama feature/facturas-cliente-feedback: no reescribirla, solo confirmar que existe y cumple REQ-07 y REQ-10. (valida: REQ-07, REQ-10; rollback: No hay cambio de codigo que revertir; si la verificacion falla, solo se reporta el hallazgo sin modificar la migracion.)
- S5: Registrar y verificar la migracion de grants backend/migrations/20261013000000_role_grants_delivery_view_transport y los seeds 10 y 20 equivalentes (quick-delivery para bodega, jefe-local, jefe-venta, gerencia, owner e internal-admin; sales.documents:view para bodega; entities.transport_companies:view para vendedor; down simetrico sin borrar capabilities). YA ESTAN IMPLEMENTADOS en los commits b248333 y 9c787a1 de la rama feature/facturas-cliente-feedback: no reescribirlos, solo confirmar que existen y cumplen REQ-11. (valida: REQ-11, REQ-04; rollback: No hay cambio de codigo que revertir; si la verificacion falla, solo se reporta el hallazgo sin modificar la migracion ni los seeds.)
- S5: Verificar los tests existentes migrations-user-out-and-grants.e2e-spec.ts y el e2e de documentos-quick-delivery, y ajustarlos solo si faltan casos: user_out_id acepta uuid; down deja NULL los uuid y conserva numericos; cada rol recibe la capability o permiso indicado (en especial vendedor con entities.transport_companies:view); down simetrico; Entrega Rapida idempotente con user_out_id uuid sobre la columna migrada; Entrega Rapida concurrente con anulacion responde 422. (valida: REQ-07, REQ-10, REQ-11, test; rollback: Revertir con git los cambios a los archivos de test ajustados; si no se ajusto nada, no hay nada que revertir.)
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: En el listado de facturas cliente la accion Entrega Rapida marca la factura entregada; una segunda llamada responde sin cambios (misma date_out y user_out_id, sin movimientos de stock), visible en el listado y en el test del endpoint.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: Desde el menu de fila y desde Visualizar se abre el Formato Bodega imprimible; una factura con un repuesto sin ubicacion muestra 'Sin ubicacion' en esa linea y respeta el orden de lineas.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3

**Gate (auto)**: Visualizar muestra Imprimir factura, Imprimir datos de despacho y Formato Bodega; la impresion de despacho usa los datos guardados de la factura y permite completar bultos/dimensiones/peso/fragil sin guardarlos; el selector T-09 lista las empresas reales de transport_companies.

### Session 4 · T0 · open

### Session 5 · open

**Tasks:**
- [ ] S5.T1
- [ ] S5.T2
- [ ] S5.T3
