---
id: SPEC-data-model-domain-erd
project: jormat-evolution
ticket: JOR-076
status: draft
---

# ERD del dominio jormat-evolution (ventas, compras, pagos, clientes, reportes)

# ERD del dominio jormat-evolution (ventas, compras, pagos, clientes, reportes)

## Executive summary — lo que estas aprobando

> Revision rapida. El detalle DDL completo (columnas, tipos, FKs, índices) vive en `tickets/JOR-076.draft/data-model.md`, aprobado como draft v1.

**Que se quiere**: definir el modelo de datos de los 5 dominios de negocio que hoy existen solo como stubs in-memory (no hay tablas ni seeds en DB). Es prerequisito de todo el carril backend (T-*-BK). Este es un `explore`: entrega el ERD acordado como spec `draft`; NO implementa migraciones (cada T-*-BK crea su parte).

**Decisiones criticas (ya con OK del dev):**

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Factura de venta UNIFICADA (`documentos_venta` = DTE + factura que cobranza AR aplica) | Evita dos tablas y un mapeo; los prefijos `doc-*`/`inv-*` de los stubs eran mock |
| 2 | Aplicacion de pago N:M (`aplicacion_pago_venta`/`_compra`) | Soporta repartir un pago entre facturas y abonos multiples; migrar de 1:1 despues es caro |
| 3 | PK `integer serial` + `uuid` + `workspace_id` (patron `items`) | Coherencia con inventario migrado; FKs a items/providers son integer |
| 4 | Multi-tenant por filtro `workspace_id` en servicios + remover RLS inerte | La RLS hoy no protege (middleware no registrado + conexion superuser); mantenerla da falsa seguridad |

**Riesgos principales y mitigacion:**

- **Drift `tipo_dte` front vs backend** → resolver enum canonico en T-VENTAS-BK antes de cortar del mock (Abierto #1).
- **Descuento %→monto y estado→doble eje** en migracion de datos legacy → transformacion, no copia; se planifica en el ticket de migracion de datos (fuera de este ERD).
- **AP (pago a proveedores) sin codigo** → modelado por simetria, marcado inferido/baja confianza; confirmar flujo con negocio antes de implementar.

**Que NO se hace aqui:**

- No se crean migraciones ni seeds (explore → spec draft). Cada `T-*-BK` implementa su fase.
- No se activa RLS (solo se recomienda removerla; hardening de plataforma aparte).
- No se resuelve la migracion de datos legacy (transformaciones de contrato) — ticket aparte.
- Entidades inferidas (`pago_proveedor`/AP, `gastos`, `transportes`, snapshots de reportes) quedan como opcionales condicionadas a decision de producto.

**Tamano estimado**: N/A para este explore (no ejecuta). El trabajo de implementacion se distribuye en las fases A-E (§Tasks / fases) sobre los tickets T-*-BK existentes.

**Como vas a saber que funciona**: cada T-*-BK que tome su fase corre `knex migrate:latest` + `seed` limpio en DB fresh y su servicio deja de ser stub (query real contra las tablas de este ERD, con filtro `workspace_id`).

---

## Purpose

Consolidar el ERD de dominio (clientes, ventas/DTE + lineas, compras + lineas, pagos AR/AP con aplicacion N:M) sobre el andamiaje `workspace_id` + auditoria ya existente, siguiendo el patron de `items`. Fuente: specs legacy del front + DTOs de los stubs (no hay dump MariaDB). El artefacto DDL vive en `JOR-076.draft/data-model.md`.

## Requirements

> Los REQ describen el modelo que cada T-*-BK debe materializar. Detalle de columnas en `data-model.md`.

### REQ-01 — Convencion comun de tabla de dominio

> **Que cambia**: toda tabla nueva de dominio nace con la misma base multi-tenant y auditoria.
> **Por que**: coherencia con `items` y aislacion por workspace desde el diseño.

Toda tabla nueva MUST tener: PK `integer serial` `id`, `uuid` NOT NULL UNIQUE (default `uuid_generate_v4()`), `workspace_id` uuid NOT NULL FK `workspaces(id)` ON DELETE CASCADE, `in_status` smallint default 1, `created_at`/`updated_at`, e índice sobre `workspace_id`.

### REQ-02 — Clientes

> **Que cambia**: se introduce el catalogo de clientes (hoy solo DTO stub).
> **Por que**: ventas y cobranza referencian clientes; no existe tabla.

MUST existir `clientes` con `razon_social`, `rut`, contacto opcional, y los flags `locked` e `is_credit` (gaps must del legacy). La validacion de RUT (modulo 11) SHOULD resolverse en el BK correspondiente.

### REQ-03 — Documento de venta unificado + lineas

> **Que cambia**: una sola entidad para el DTE y la factura de cobranza, con lineas.
> **Por que**: decision D1; correctitud contable y menos tablas.

MUST existir `documentos_venta` (folio unico por `workspace_id`+`tipo_dte`, receptor snapshot, doble eje `estado_sii`/`estado_comercial`, `descuento_global` como monto, self-FK `documento_origen_id`, `es_borrador`) y `lineas_documento_venta` (FK CASCADE + `item_id`→items, `descuento` monto). `pending`/`status` de cobranza MUST ser derivados (no columnas).

### REQ-04 — Compras: factura proveedor + lineas

> **Que cambia**: modelo de factura de compra con estado de ciclo AP.
> **Por que**: dinamizar compras backend (hoy stub).

MUST existir `factura_proveedor` (FK `providers`, moneda + `value_currency`, estado incluyendo `abandonada`) y `linea_factura_compra` (FK CASCADE + `item_id`). `providers` MUST recibir columna `rut`.

### REQ-05 — Pagos con aplicacion N:M

> **Que cambia**: pagos aplicables a uno o varios documentos, con abonos parciales.
> **Por que**: decision D2; refleja contabilidad real.

MUST existir `pago_cliente` + `aplicacion_pago_venta` (N:M contra `documentos_venta`, con `monto` imputado). El backend MUST validar `Σ aplicaciones ≤ pending`. AP (`pago_proveedor` + `aplicacion_pago_compra`) MAY implementarse en fase posterior (inferido, sin codigo — confirmar con negocio).

### REQ-06 — Reportes por agregacion

> **Que cambia**: reportes leen datos reales por agregacion, sin tablas propias.
> **Por que**: los 15 reportes operan sobre items/documentos/pagos.

Reportes MUST resolverse por query (JOIN+SUM+GROUP BY) con filtro `workspace_id`; NO requiere tablas de dominio. Snapshots (`inventario diario`, `estado de resultados`) y `gastos` MAY crearse solo si producto los pide.

### REQ-07 — Multi-tenant por codigo + remover RLS inerte

> **Que cambia**: la frontera de tenant es explicita en servicios; se elimina la RLS que no protege.
> **Por que**: decision D4; evitar falsa seguridad.

La aislacion MUST ser el filtro `workspace_id` en cada servicio (SHOULD via helper/base repository). Las policies RLS inertes de `users`/`workspace_memberships`/`usage_metrics` SHOULD removerse en una migracion de plataforma aparte.

## Artifacts

Ver `tickets/JOR-076.draft/data-model.md` (DDL completo). Entidades:

- Nuevas (confianza alta): `clientes`, `documentos_venta`, `lineas_documento_venta`, `factura_proveedor`, `linea_factura_compra`, `pago_cliente`, `aplicacion_pago_venta`.
- Modificacion: `providers` += `rut`.
- Inferidas (baja confianza / opcionales): `pago_proveedor`, `aplicacion_pago_compra`, `gastos`, `transportes`, snapshots de reportes.
- Reusadas: `items`, `warehouses`, `providers`, `locations`, catalogos, `workspaces`, `users`.

## Tasks

> **Explore**: este spec NO ejecuta. La implementación de cada entidad se delega a su `T-*-BK`
> (ver "Fases de migración" abajo — cada fase es una task delegada). La única session de este
> spec es de diseño.

### Session 1 — Diseño del ERD (design, sin execute)
- [x] S1.T1: modelo de dominio de los 5 dominios definido, decidido (D1-D4) y aprobado como draft v1 (`JOR-076.draft/data-model.md`)

## Fases de migracion (tasks delegadas a T-*-BK)

| Fase | Ticket | Crea |
|------|--------|------|
| A | JOR-082 (T-CAT-BK) | `providers.rut` + `clientes` |
| B | JOR-086 (T-VENTAS-BK) | `documentos_venta` + `lineas_documento_venta` |
| C | JOR-092 (T-PAGOS-BK) | `pago_cliente` + `aplicacion_pago_venta` |
| D | JOR-090 (T-COMPRAS-BK) | `factura_proveedor` + `linea_factura_compra` (+ AP si se confirma) |
| E | JOR-097 (T-REPORTES-BK) | sin schema (queries); snapshots/`gastos` condicional |
| Plataforma | nuevo/hardening | remover RLS inerte |

## Abiertos (a resolver en cada BK, no bloquean el ERD)

1. Drift `tipo_dte` front/back. 2. Validacion RUT modulo 11. 3. `forma_pago` duplicada (catalogo vs enum). 4. `nro_doc`/`observacion` obligatoriedad invertida. 5. Derivados (`pending`/`status`/totales) por query/vista. 6. Tipo de monto (`numeric` vs `integer` CLP). 7. Migracion de datos legacy (descuento %→monto, estado→doble eje).

## Acceptance checkpoints

> Este spec (explore) se acepta con el diseño aprobado. Los checkpoints de implementación
> se ejecutan en cada `T-*-BK` que tome su fase, no aquí.

- [x] ERD de los 5 dominios definido con `workspace_id` + auditoría en cada entidad (REQ-01)
- [x] 4 decisiones de arquitectura resueltas y registradas (D1 factura unificada, D2 aplicación N:M, D3 PK integer+uuid, D4 RLS)
- [x] Draft de data-model aprobado por el dev (draft v1)
- [ ] (delegado) Cada `T-*-BK` corre `knex migrate:latest` + `seed` limpio en DB fresh sobre su fase
- [ ] (delegado) Cada servicio de dominio deja de ser stub: query real con filtro `workspace_id`

## Estado

`draft` — explore no pasa a execute. El ERD queda como fuente para los tickets T-*-BK. Cierre del ticket JOR-076 no implica implementacion.
