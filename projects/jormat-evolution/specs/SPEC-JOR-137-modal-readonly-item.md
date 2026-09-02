---
id: SPEC-JOR-137-modal-readonly-item
project: jormat-evolution
ticket: JOR-137
status: done
---

# Modal read-only de item desde la tabla de lineas (Ventas + Compras)

# Modal read-only de item desde la tabla de lineas (Ventas + Compras)

## Executive summary — lo que estas aprobando

**Que se quiere**: en la tabla de lineas del builder (`LineItemsTable`), al hacer click en el NOMBRE del item se abre la ficha del item en modo solo-informacion: sin ningun accionable ni selector, con los checks de prioridad/falla reflejando el estado real pero deshabilitados. Es funcionalidad nueva (N-ITEM-01, no paridad legacy). Hoy el nombre no es clickeable y el modal solo tiene modos `full` (con acciones) y `picker`.

**Decisiones criticas** (con racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Tercera variante `readonly` en `ItemDetailModal`/`ItemDetailContent`, no un modal nuevo | DET-32 reuse: gatea acciones/selector/switches sobre el modal existente; reusa `KeyValueGrid`/`StockByWarehouseTable`/`MediaCard`. Por eso `creates_visual: false` |
| 2 | Switches de prioridad/falla en `disabled` sin mutar (sin PATCH) | Reflejan `conPrioridad`/`conFalla` reales; verificado por spy 0 llamadas. Un readonly que muta seria un defecto silencioso |
| 3 | Stock por bodega como tabla informativa, sin selector | El selector `ALL_WAREHOUSES_OPTION` del footer es un accionable; en readonly la tabla informa sin control |

**Riesgos principales y como los mitigamos**:

- **La variante readonly filtra un accionable no gateado** → barrer TODOS los accionables (editar/duplicar/compartir/ver-ficha/anadir/imprimir) + el selector de bodega; test con la variante montada que verifica ausencia.
- **El readonly muta al renderizar los switches** → spy sobre el PATCH; el test exige 0 llamadas.
- **Regresion en `full`/`picker`** → REQ-REGRESSION: los modos existentes no cambian; 118 tests preexistentes verdes.

**Que NO se hace en este ticket**: no se toca el comportamiento de `full`/`picker`; no se agrega ningun accionable nuevo; no se toca backend.

**Tamano estimado**: 1 session (T2), aditiva. La pieza mas delicada es el barrido de accionables (que nada mutable quede expuesto).

**Como vas a saber que funciona**: abro un builder con lineas, hago click en el nombre de un item y veo la ficha sin botones de accion ni selector de bodega, con prioridad/falla visibles pero deshabilitados; ninguna interaccion dispara PATCH.

---

## Purpose

Agregar una variante `readonly` al modal de ficha del item (`ItemDetailModal`/`ItemDetailContent`) que gatee todo accionable y el selector de bodega, y renderice los switches de prioridad/falla en solo-lectura; y hacer clickeable el nombre del item en `LineItemsTable` para abrirla. Reuso total de subcomponentes existentes (DET-32); cambio aditivo respecto de los modos `full` y `picker`.

## Requirements

### REQ-01: variante `readonly` del modal de ficha del item, abierta desde el nombre en la tabla de lineas

> **Que cambia**: el modal de ficha (`ItemDetailModal`/`ItemDetailContent`) gana un tercer modo `readonly` que muestra la informacion del item sin ningun accionable ni selector de bodega, con los checks de prioridad/falla deshabilitados. El nombre del item en `LineItemsTable` pasa a ser clickeable y abre ese modo.
> **Por que**: N-ITEM-01: el usuario necesita consultar la ficha del item desde una linea sin arriesgar una edicion accidental ni navegar fuera del builder.

MUST: en modo `readonly`, `ItemDetailContent` MUST ocultar TODO accionable (Editar, Duplicar, Compartir, "Ver ficha", "Anadir a la seleccion", "Imprimir ficha", "Imprimir etiqueta") y el selector de bodega del footer (`warehouse` + `ALL_WAREHOUSES_OPTION`). Los checks de prioridad y falla MUST renderizarse reflejando `conPrioridad`/`conFalla` en `disabled`, SIN disparar PATCH. El stock por bodega MUST mostrarse como tabla informativa (`StockByWarehouseTable`) sin selector. El nombre del item en `LineItemsTable` MUST ser clickeable y abrir el modal en `readonly` (dynamic import).

<details><summary>Scenarios de validacion</summary>

#### Scenario: apertura desde la tabla de lineas
- **GIVEN** un builder con al menos una linea (itemId ITM-001)
- **WHEN** el usuario hace click en el nombre del item
- **THEN** se abre `ItemDetailModal` en `readonly` con la ficha del item, sin botones de accion ni selector de bodega

#### Scenario: switches en solo-lectura, sin mutacion
- **GIVEN** el modal abierto en `readonly` para un item con `conPrioridad`/`conFalla`
- **WHEN** el usuario intenta togglear prioridad o falla
- **THEN** los switches estan `disabled`, reflejan el estado real y NO se dispara ningun PATCH (spy: 0 llamadas)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: click en el nombre de un item en una linea abre la ficha sin accionables ni selector; prioridad/falla se ven pero no se pueden cambiar.

### REQ-REGRESSION: los modos `full` y `picker` no cambian

> **Que cambia**: nada en los modos existentes.
> **Por que**: el cambio es aditivo; `full` (con acciones y selector) y `picker` deben conservar su comportamiento.

MUST: `ItemDetailModal`/`ItemDetailContent` en `full` y `picker` MUST conservar acciones, selector de bodega y switches mutables sin cambios. La suite preexistente (118 tests) MUST permanecer verde.

<details><summary>Scenarios de validacion</summary>

#### Scenario: modo full intacto
- **GIVEN** el modal abierto en `full`
- **WHEN** el usuario opera acciones y switches
- **THEN** el comportamiento es identico al previo (acciones visibles, switches mutan, selector presente)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la ficha abierta por los flujos existentes sigue mostrando acciones y permitiendo editar prioridad/falla.

## Tasks

### Session 1 — Variante readonly del modal + nombre clickeable [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar variante `readonly` a `ItemDetailModal`/`ItemDetailContent`: gatea acciones + selector de bodega; prioridad/falla en `disabled` sin PATCH; stock como tabla informativa | REQ-01 | developer | — | `.../items/detail/ItemDetailModal/`, `.../items/detail/ItemDetailContent/` | vitest de la variante: sin accionables, sin selector, switches disabled, spy 0 PATCH | git revert | DET-32, DET-4 | done | 1 |
| S1.T2 | Nombre del item clickeable en `LineItemsTable` + wiring (dynamic import del modal en `readonly`, estado open/itemId) | REQ-01 | developer | S1.T1 | `.../shared/builder/LineItemsTable/` | click en el nombre abre el modal readonly (itemId ITM-001) | git revert | DET-32 | done | 1 |
| S1.T3 | Tests + story readonly + doc; fix de robustez del play (dynamic import + fetch > 1000ms) | REQ-01, REQ-REGRESSION | reviewer | S1.T1, S1.T2 | tests co-locados, `*.stories.tsx`, `transaction-builder.md`, `views.md` | vitest 127 passed INCLUYENDO el proyecto storybook/chromium; tsc 0; eslint 0 | N/A (tests/docs) | DET-7, DET-13, DET-23 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions`, correr validacion del tier, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23 | done | 1 |

## Constraints

- Alcance acotado a `items/detail/ItemDetailModal`, `items/detail/ItemDetailContent` y `shared/builder/LineItemsTable`. No tocar backend.
- DET-32: reusar `KeyValueGrid`/`StockByWarehouseTable`/`MediaCard`; no crear componente nuevo.
- La variante `readonly` no debe mutar: cero PATCH desde los switches.

## Decisions

### DEC-LOCAL-01: tercera variante del modal en vez de modal nuevo
- **Contexto**: se necesitaba una ficha de item solo-informacion desde la tabla de lineas.
- **Drivers**: DET-32 reuse; los subcomponentes (`KeyValueGrid`/`StockByWarehouseTable`/`MediaCard`) ya existen.
- **Opcion elegida**: variante `readonly` (tercera, junto a `full`/`picker`) que gatea acciones/selector/switches.
- **Alternativas**: crear un modal nuevo de solo-lectura (descartado: duplica subcomponentes y layout).
- **Consecuencias**: cambio aditivo, `creates_visual: false`; los modos existentes no cambian.
- **Session**: 1

### DEC-LOCAL-02: switches de prioridad/falla en `disabled` sin PATCH
- **Contexto**: en `full` los switches hacen PATCH (`handleTogglePriority`/`handleToggleFailure`).
- **Drivers**: un modo de solo-lectura no debe mutar.
- **Opcion elegida**: renderizar los switches reflejando `conPrioridad`/`conFalla` en `disabled`, sin handler de mutacion.
- **Alternativas**: ocultar los switches (descartado: la prioridad/falla es informacion util de la ficha).
- **Consecuencias**: verificado por spy con 0 llamadas PATCH.
- **Session**: 1

### DEC-LOCAL-03: stock por bodega como tabla informativa sin selector
- **Contexto**: el footer de `full` tiene un selector de bodega (`ALL_WAREHOUSES_OPTION`).
- **Drivers**: el selector es un accionable; en readonly no aplica.
- **Opcion elegida (default)**: mostrar `StockByWarehouseTable` sin selector.
- **Session**: 1

### DEC-LOCAL-04: fix de robustez del play de la story readonly
- **Contexto**: la story readonly abre el modal por dynamic import + fetch (> 1000ms); el play fallaba de forma intermitente.
- **Drivers**: el `findBy` no esperaba el contenido asincrono.
- **Opcion elegida**: esperar dialog + contenido con timeout 5000ms + `within(dialog)`; el MSW existente resuelve el detalle (itemId ITM-001).
- **Consecuencias**: el fallo solo aparecia con el proyecto storybook incluido; la corrida que lo excluia no lo veia (ver decisions_log `verification-storybook`).
- **Session**: 1

## Acceptance checkpoints

- [x] **Funcional**: click en el nombre abre la ficha readonly sin accionables ni selector; prioridad/falla disabled sin PATCH.
- [x] **Tests** (DET-37 dim4): vitest 127 passed INCLUYENDO el proyecto storybook/chromium; tsc 0, eslint 0.
- [x] **Integration**: `full`/`picker` sin cambios (118 tests preexistentes verdes).
- [x] **Docs oficiales del proyecto** (DET-37 dim1): `transaction-builder.md` + `views.md` actualizados.
- [x] **KB DKC** (DET-37 dim2): decisiones registradas en el decisions_log del ticket.

## Technical reference

- Modal existente: `items/detail/ItemDetailModal/` y `items/detail/ItemDetailContent/` (modos `full`/`picker`; switches `handleTogglePriority`/`handleToggleFailure` en `ItemDetailContent.tsx:97,107`).
- Subcomponentes reusados: `KeyValueGrid`, `StockByWarehouseTable`, `MediaCard`.
- Tabla de lineas: `shared/builder/LineItemsTable/`.
- Stub: MSW resuelve el detalle del item (itemId ITM-001) para la story readonly.
