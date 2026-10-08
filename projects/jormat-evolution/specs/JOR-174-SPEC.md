---
id: JOR-174-SPEC
project: jormat-evolution
ticket: JOR-174
status: draft
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

#### REQ-01 `confirmed`
> Fuente: backend/migrations/20261003000000_invoices_legacy.ts:26
> Necesidad: build
Entrega Rapida: accion de fila para facturas cliente emitidas y no entregadas que, en un clic y sin exigir pago, marca la factura entregada registrando is_out=true, date_out, user_out_id (usuario actual) y commentary_out; no mueve stock y es idempotente (una segunda llamada no reescribe fecha ni usuario ni mueve stock). Protegida por una capability de Bodega.

#### REQ-02 `inferred`
> Fuente: backend/migrations/20261003000000_invoices_legacy.ts:26
> Necesidad: build
Formato Bodega: vista imprimible distinta de la factura comercial, accesible desde el menu de fila y desde Visualizar, con identificacion de la factura, cliente y por cada linea (en el orden de lineas) codigo, descripcion, cantidad y todas las ubicaciones registradas del repuesto en la bodega de origen; un repuesto sin ubicacion se muestra con el texto 'Sin ubicacion'.

#### REQ-03 `inferred`
> Fuente: backend/migrations/20261003000000_invoices_legacy.ts:26
> Necesidad: build
Imprimir datos de despacho desde Visualizar: muestra destinatario, RUT, telefono, direccion, ciudad, transporte y observacion guardados en la factura mas un bloque de remitente Jormat; cantidad de bultos, dimensiones, peso y fragil se ingresan en la pantalla de impresion y no se persisten.

#### REQ-04 `confirmed`
> Fuente: backend/migrations/20260901000001_transport_companies.ts:6
> Necesidad: build
Selector de transporte T-09 conectado al catalogo real transport_companies (reemplaza la lista simulada), usando la misma fuente que la vista de Transportistas.

#### REQ-05 `inferred`
> Fuente: backend/migrations/20261003000000_invoices_legacy.ts:26
> Necesidad: build
Visualizar de factura cliente ofrece las acciones Imprimir factura e Imprimir datos de despacho (R-06), ademas del acceso a Formato Bodega.

#### REQ-06 `confirmed`
> Fuente: backend/migrations/20261003000000_invoices_legacy.ts:26
> Necesidad: build
Ninguna de las acciones (Entrega Rapida, Formato Bodega, imprimir despacho, imprimir factura) espera ni depende del estado SII de la factura (P-15.1.D1).

#### REQ-07 `confirmed`
> Fuente: backend/migrations/20261003000000_invoices_legacy.ts:26-29
> Necesidad: build
Enforcement: Entrega Rapida reutiliza las columnas legacy existentes is_out, user_out_id, commentary_out y date_out de la tabla de facturas; no se crean columnas nuevas ni se reescriben datos migrados.

#### REQ-08 `confirmed`
> Fuente: frontend/src/components/bodega/transportistas/TransportistasView/TransportistasView.tsx:180
> Necesidad: build
Enforcement: el selector T-09 consume el mismo origen de datos/servicio de transport_companies que usa TransportistasView, sin duplicar el acceso al catalogo.

## Tasks

#### S1.T1 — Backend Entrega Rapida: endpoint que actualiza is_out, date_out, user_out_id, commentary_out (columnas de backend/migrations/20261003000000_invoices_legacy.ts:26-29) solo si is_out=false (UPDATE condicionado WHERE is_out=false para idempotencia atomica), sin tocar stock ni validar pago ni estado SII; protegido por capability de Bodega (reutilizar existente o seed nuevo, ver Datos a confirmar).
Contrato: rollback: Revertir el commit del endpoint y, si se creo capability, ejecutar el down de su migracion RBAC.. Status: pending
Subtasks: 2 (ejecutar hojas; el padre espera a todas)

#### S1.T1.1 — Resolver capability: reutilizar la de Bodega existente o crear migracion seed_rbac nueva (requiere aprobacion humana).
Contrato: rollback: Down de la migracion RBAC o revertir commit.. Status: pending

#### S1.T1.2 — Servicio y ruta de Entrega Rapida con UPDATE condicionado por is_out=false; respuesta devuelve la factura con sus valores actuales en ambos casos.
Contrato: rollback: Revertir commit del servicio y la ruta.. Status: pending

#### S1.T2 — Frontend: accion de fila 'Entrega Rapida' en el listado de facturas cliente, visible solo para emitidas con is_out=false y usuarios con la capability; modal con comentario opcional y refresco de la fila.
Contrato: rollback: Revertir el commit del componente de accion.. Status: pending

#### S1.T3 — Tests S1: endpoint (feliz, criterio 19 idempotencia con otro usuario, 403 sin capability, estado SII pendiente, factura migrada con is_out=true) y visibilidad de la accion de fila.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S2.T1 — Backend Formato Bodega: endpoint de lectura que devuelve cabecera (numero, fecha, cliente) y lineas en orden con codigo, descripcion, cantidad y lista de ubicaciones del repuesto en la bodega de origen (tabla de ubicaciones a confirmar), en una sola consulta agregada por factura (acotado a las lineas de esa factura, sin N+1); sin dependencia del estado SII.
Contrato: rollback: Revertir commit del endpoint.. Status: pending

#### S2.T2 — Frontend: vista imprimible Formato Bodega (distinta del formato comercial) con 'Sin ubicacion' cuando la lista viene vacia; accesos desde menu de fila y desde Visualizar.
Contrato: rollback: Revertir commit de la vista y de los accesos.. Status: pending

#### S2.T3 — Tests S2: endpoint (orden de lineas, varias ubicaciones, criterio 20 'Sin ubicacion', ubicacion solo en otra bodega) y render de la vista.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S3.T1 — T-09: reemplazar la lista simulada del selector de transporte por el catalogo transport_companies (backend/migrations/20260901000001_transport_companies.ts:6), reutilizando el acceso a datos que usa TransportistasView (frontend/src/components/bodega/transportistas/TransportistasView/TransportistasView.tsx:180).
Contrato: rollback: Revertir commit; el selector vuelve a la lista previa.. Status: pending

#### S3.T2 — Visualizar: agregar acciones Imprimir factura (formato comercial existente) e Imprimir datos de despacho; vista de despacho con destinatario, RUT, telefono, direccion, ciudad, transporte y observacion leidos de la factura guardada (columnas de 1/7), bloque remitente Jormat y campos locales no persistidos de bultos, dimensiones, peso y fragil.
Contrato: rollback: Revertir commit de Visualizar y de la vista de despacho.. Status: pending

#### S3.T3 — Tests S3: selector con catalogo real y vacio, regresion de TransportistasView.test.tsx, despacho con datos guardados vs ficha de cliente distinta (criterio 21), campos no persistidos, factura sin transporte, botones de Visualizar y formato comercial sin ubicaciones.
Contrato: rollback: Eliminar o revertir los archivos de test agregados.. Status: pending

## Verificacion runtime

1. **Qué:** Verificar en runtime: Imprimir datos de despacho desde Visualizar: muestra destinatario, RUT, telefono, direccion, ciudad, transporte y observacion guardados en la factura mas un bloque de remitente Jormat; cantidad de bultos, dimensiones, peso y fragil se ingresan en la pantalla de impresion y no s
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
   - **Requiere una persona:** una impresión física (inferido)

## Cambios al modelo de datos

- tipo: seed_rbac | objetos: capability de Bodega para Entrega Rapida (nombre a confirmar; solo si no existe una reutilizable) | destructivo: no | tarea: S1.T1 | rollback: Migracion down que elimina la capability y sus asignaciones a roles; si se reutiliza una existente, no hay cambio de modelo y este item se descarta.
