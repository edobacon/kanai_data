---
id: SPEC-JOR-128-ventas-listado-detalle
project: jormat-evolution
ticket: JOR-128
status: done
---

# Ventas listado + detalle: acciones de fila, export completo y columnas del detalle

# Ventas listado + detalle: acciones de fila, export completo y columnas del detalle

## Executive summary — lo que estas aprobando

**Que se implementa**: tres piezas de paridad con el legacy en el listado y detalle de ventas, todas VIABLES sobre el contrato actual del documento:

1. **Clonar** (accion de fila del listado): enlaza al entrypoint de creacion de factura reusando el flujo de JOR-127 (`/ventas/crear-factura?origen=factura&id=`), prefila el builder desde el documento origen.
2. **Export CSV del universo filtrado completo**: el export deja de exportar solo la pagina visible y pasa a exportar todo el universo que matchea los filtros activos, via `fetchAllPagesCapped` (tope 5000 filas, toast si trunca).
3. **Columna "% Dcto" por linea en el detalle**: cada linea del `DocumentoDetalleView` muestra el porcentaje de descuento aplicado.

**Lo que NO entra (DEUDA_TECNICA_CONFIRMAR)**: un conjunto de campos que el contrato del documento no expone hoy, por lo que no se pueden materializar sin cambio de backend o de contrato. Se registran como deuda auditada, no como omision silenciosa (ver seccion "Deuda tecnica").

**Lo que se difiere (DEFERIDOS)**: Entrega Rapida, Formato Bodega (print), estado de cuenta del cliente y netTotal/utilidad — funcionalidad de mayor alcance o que requiere definicion de negocio; fuera de esta session.

**DET-32 (necesidad y reuso)**: veredicto `reuse`. Ninguna de las tres piezas crea componente nuevo. Se reusa `DataTable` (listado, compartido con JOR-129/134), las columnas existentes, el `DocumentoDetalleView`, el patron `fetchAllPagesCapped` (ya presente en `ItemsListView`) y el entrypoint de creacion de JOR-127. Por eso el Gate de draft (DET-18) se marca `skipped`: no hay superficie visual nueva que aprobar previamente.

## Purpose

- **Problema**: el listado y detalle de ventas del front nuevo pierden paridad con el legacy: falta la accion Clonar, el export CSV solo cubre la pagina visible (no el universo filtrado), y el detalle no muestra el % de descuento por linea.
- **A quien afecta**: usuarios de ventas que operan sobre el listado (exportan reportes, clonan documentos) y revisan el detalle de una factura.
- **Sintoma reportado**: el legacy permite clonar una factura desde el listado, exporta todo lo filtrado y muestra el descuento por linea; el front nuevo no.

## Requirements

### R1 — Clonar (accion de fila del listado)
> Que cambia: el listado de ventas gana la accion de fila "Clonar", que navega al builder de creacion prefilado desde el documento origen.
> Por que: paridad con el legacy (caso V-16); el usuario clona una factura existente como base de una nueva.

MUST: cada fila del `DocumentosTable` MUST exponer la accion "Clonar" que navega a `/ventas/crear-factura?origen=factura&id={documentId}`, reusando el entrypoint de creacion de factura implementado en JOR-127. El builder de destino resuelve el prefill desde el documento origen (comportamiento ya provisto por JOR-127).

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN una fila de documento de venta con id D WHEN el usuario elige "Clonar" THEN navega a `/ventas/crear-factura?origen=factura&id=D` y el builder se prefila desde D.
- Scenario (regresion): GIVEN las demas acciones de fila existentes WHEN se agrega "Clonar" THEN el resto de acciones y su RBAC permanecen sin cambios.
</details>

### R2 — Export CSV del universo filtrado completo
> Que cambia: el export CSV deja de limitarse a la pagina visible y exporta todo el universo que matchea los filtros activos.
> Por que: paridad con el legacy (caso V-15); un reporte parcial de una sola pagina no sirve para analisis.

MUST: el export CSV del `DocumentosListView` MUST recolectar todas las paginas del universo filtrado via `fetchAllPagesCapped`, con un tope de 5000 filas. SHOULD: si el universo excede el tope, MUST mostrar un toast indicando que el resultado fue truncado. El CSV MUST respetar los filtros activos (no exportar el universo sin filtrar).

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN un universo filtrado de 3 paginas WHEN el usuario exporta CSV THEN el CSV contiene las filas de las 3 paginas, no solo la visible.
- Scenario (tope): GIVEN un universo filtrado que excede 5000 filas WHEN el usuario exporta THEN el CSV se trunca a 5000 y se muestra un toast de truncado.
- Scenario (filtros): GIVEN filtros activos WHEN se exporta THEN el CSV incluye solo las filas que matchean los filtros.
</details>

### R3 — Columna "% Dcto" por linea en el detalle
> Que cambia: el detalle del documento de venta muestra, por linea, el porcentaje de descuento aplicado.
> Por que: paridad con el legacy (caso V-18, parte viable); el usuario necesita ver el descuento por linea.

MUST: el `DocumentoDetalleView` MUST mostrar una columna "% Dcto" por linea con el porcentaje de descuento que expone el contrato del documento.

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN una linea con descuento 10% WHEN se renderiza el detalle THEN la columna "% Dcto" de esa linea muestra 10%.
- Scenario: GIVEN una linea sin descuento WHEN se renderiza el detalle THEN la columna muestra 0% (o el vacio canonico del contrato).
</details>

## Deuda tecnica (DEUDA_TECNICA_CONFIRMAR)

Los siguientes items del request no se pudieron implementar porque el contrato del documento no los expone. No es una omision: se registra como deuda auditada (decisions_log: `stub-data-gap`) para que quede visible que el bloqueo es de datos, no de UI.

| Item | Caso | Por que no entra |
|------|------|------------------|
| "Ubicacion" por linea | V-18 | El contrato del documento no expone la ubicacion por linea |
| Campos de cabecera: forma de pago, hora, encargado cliente, creada por, entregada por, N.P, estado de entrega | V-19 | No estan en la respuesta del documento. La forma de pago solo vive en el INPUT del builder, no en la respuesta persistida |
| Badge `clientId` | V-23 | El receptor no expone un id interno en el contrato |

Estos items requieren extension del contrato/backend antes de poder materializarse en la UI.

## Deferidos (DEFERIDOS)

No tocados en esta session (decisions_log: `deferred-features`):

- **Entrega Rapida** (V-16): funcionalidad de mayor alcance, fuera de esta session.
- **Formato Bodega (print)** (V-16): salida de impresion, diferida.
- **Estado de cuenta del cliente** (V-17): es otra vista; el listado solo enlazaria, no se implementa aca.
- **netTotal / utilidad** (V-24): requiere definicion de negocio.

## Tasks

### Session 1 — Ventas listado + detalle (piezas viables) [tier: T2]

**Task S1.T1 — Clonar (accion de fila del listado)**
- source_ref: R1
- agent: developer
- validation: la accion "Clonar" navega a `/ventas/crear-factura?origen=factura&id={id}` reusando el entrypoint de JOR-127; el resto de acciones de fila intactas
- rollback: git revert
- rules: [DET-32]

**Task S1.T2 — Export CSV del universo filtrado completo**
- source_ref: R2
- agent: developer
- validation: el export recorre todas las paginas del universo filtrado via `fetchAllPagesCapped` (tope 5000); toast si trunca; respeta filtros activos
- rollback: git revert
- rules: [DET-32, DET-40]

**Task S1.T3 — Columna "% Dcto" por linea en el detalle**
- source_ref: R3
- agent: developer
- validation: cada linea del `DocumentoDetalleView` muestra la columna "% Dcto" con el porcentaje del contrato
- rollback: git revert
- rules: [DET-32]

**S1.GATE**: quality review (DET-23, tier T2 → standard), self-report verificado (DET-33), decisions del gate registradas. Validacion: vitest list+detail verde, tsc exit 0, eslint exit 0.

## Constraints

- Alcance acotado a `components/ventas/list/DocumentosTable/`, `components/ventas/list/DocumentosListView/` y `components/ventas/detail/DocumentoDetalleView/`.
- No crear componentes nuevos (DET-32 reuse): reusar `DataTable`, columnas existentes, `DocumentoDetalleView`, `fetchAllPagesCapped` y el entrypoint de JOR-127.
- No implementar los items de DEUDA_TECNICA_CONFIRMAR: el contrato del documento no los expone.
- No abordar los DEFERIDOS en esta session.

## Dependencies

- **JOR-124** (dependencia del ticket): base del listado/detalle.
- **JOR-127**: provee el entrypoint de creacion de factura (`/ventas/crear-factura?origen=factura&id=`) que Clonar reusa.
- **JOR-129 / JOR-134**: comparten el `DataTable` del listado (el export CSV no debe romperlos).

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Clonar reusa el entrypoint de JOR-127 en vez de un flujo propio | DET-32 reuse; el prefill del builder ya existe, Clonar solo navega con `origen=factura&id=` |
| 2 | Export CSV via `fetchAllPagesCapped` (tope 5000 + toast) | Reusa el patron ya presente en `ItemsListView`; el tope acota memoria/tiempo; el toast hace visible la truncacion (DET-40: el export page-only se reemplaza por el universo filtrado completo) |
| 3 | % Dcto se implementa; Ubicacion/cabecera/clientId NO | El contrato del documento expone el % de descuento por linea pero no la ubicacion ni los campos de cabecera ni el id del receptor. Se implementa lo viable y se audita el resto como deuda |
| 4 | Entrega Rapida / Formato Bodega / estado de cuenta / utilidad diferidos | Mayor alcance o definicion de negocio pendiente; fuera de esta session |

## Acceptance checkpoints

- [x] AC-1 (R1): la accion "Clonar" navega a `/ventas/crear-factura?origen=factura&id={id}` (test).
- [x] AC-2 (R2): el export CSV cubre el universo filtrado completo (multi-pagina) con tope 5000 y toast al truncar (test).
- [x] AC-3 (R3): el detalle muestra la columna "% Dcto" por linea (test).
- [x] AC-4 (regresion): el resto del listado/detalle y de las acciones de fila no cambia (suite verde).
