---
id: SPEC-JOR-122-reglas-item-semaforo-observacion
project: jormat-evolution
ticket: JOR-122
status: done
---

# Reglas de negocio por item + semaforo del buscador + observacion por linea

# Reglas de negocio por item + semaforo del buscador + observacion por linea

## Executive summary — lo que estas aprobando

**Que se corrige**: el builder (ventas + compras) no replica las reglas por item del legacy ni la senalizacion visual del buscador, y la "observacion a items" es un stub (boton que abre un toast "no implementado"). Este spec cubre cinco piezas: (1) el descuento de una linea acotado a `maxDiscount` del item; (2) items tipo `oil` que fuerzan descuento 0; (3) un item con falla no se agrega y alerta al supervisor; (4) el semaforo de stock/prioridad/falla del `ItemSearchPanel` mas el indicador "A Mano"; (5) la observacion por linea real (textarea) que viaja en el payload.

**Sobre el stub y la deuda tecnica**: el trabajo corre sobre el stub MSW. Varias reglas dependen de campos que HOY no estan en el list item del stub (`maxDiscount`, `oil`, `generalStock`, `stockCritico`). Para esas reglas el mecanismo queda **cableado** en el codigo pero con **fallback inactivo** (no cambia comportamiento hasta que el backend sirva el campo). Las reglas que SI son viables sobre el stub (falla, prioridad) quedan operativas. Ver el detalle de viabilidad por REQ.

| Pieza | Viabilidad sobre el stub | Estado |
|-------|--------------------------|--------|
| R1 descuento de linea acotado a `maxDiscount` | Campo ausente en el list item | Cableado, fallback 100 (inactivo) — DEUDA_TECNICA_CONFIRMAR |
| R2 item `oil` sin descuento | Campo ausente en el contrato | Cableado (descuento 0 + deshabilitado), fallback inactivo — DEUDA_TECNICA_CONFIRMAR |
| R3 item con falla no se agrega + alerta | `failure` presente en el stub | VIABLE — operativo |
| R4 semaforo (prioridad/falla) + "A Mano"/critico | `priority`/`failure` viables; `generalStock`/`stockCritico` ausentes | Prioridad/falla VIABLES; "A Mano" + "critico" cableados con fallback inactivo — DEUDA_TECNICA_CONFIRMAR |
| R5 observacion por linea | No depende de backend (viaja en el payload del builder) | IMPLEMENTADA sobre stub |

> **Deuda tecnica confirmada (DEUDA_TECNICA_CONFIRMAR)**: `maxDiscount`, `oil`, `generalStock` (indicador "A Mano") y `stockCritico` (semaforo "critico", stock<=stockCritico) NO estan en el list item que sirve el stub. El mecanismo de cada regla queda cableado con fallback que lo deja inactivo (no rompe ni cambia comportamiento). Se activa cuando el backend exponga el campo. Backend relacionado: JOR-086 / JOR-090.

**Lo que NO cambia**: el resto del builder (totales, tipos DTE, clonado, gate de cliente moroso, warning de stock por bodega de JOR-119). La observacion por linea REEMPLAZA el stub toast "no implementado" (auditoria de reemplazo DET-40, ver R5).

## Purpose

- **Problema**: el builder nuevo no aplica las reglas por item del legacy (cap de descuento, oil sin descuento, item con falla no se agrega) ni muestra el semaforo del buscador; la observacion por item es un stub.
- **A quien afecta**: usuarios que arman documentos de venta/compra y dependen de las reglas por item para no cometer errores (descuento excesivo, agregar un item con falla) y de la senalizacion visual para elegir bien.
- **Sintoma reportado**: el descuento de linea no se topa; los items `oil` aceptan descuento; un item con falla se agrega igual; el buscador no distingue prioridad/falla/stock; el boton de observacion no persiste nada.

## Requirements

### REQ-01: el descuento de una linea queda acotado a `maxDiscount` del item
> Que cambia: el descuento porcentual de la linea no puede superar el `maxDiscount` definido para el item.
> Por que: el legacy topa el descuento por item; permitir mas es una regla de negocio violada.

MUST: el input de descuento de la linea MUST quedar acotado por `maxDiscount` del item (cap). Si el item no expone `maxDiscount` (caso del stub actual), el fallback es 100 (sin tope efectivo) — el mecanismo queda cableado y se activa cuando el backend sirva el campo (DEUDA_TECNICA_CONFIRMAR, backend JOR-086/090).

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN un item con `maxDiscount` = 20 WHEN el usuario ingresa 35 de descuento THEN el valor se topa a 20.
- Scenario (stub actual): GIVEN un item sin `maxDiscount` en el contrato WHEN el usuario ingresa 35 THEN el cap usa el fallback 100 (no topa) y el mecanismo queda inactivo hasta que el backend sirva el campo.
</details>

### REQ-02: un item `oil` fuerza descuento 0
> Que cambia: los items tipo `oil` no admiten descuento; el input queda en 0 y deshabilitado.
> Por que: regla de negocio del legacy (los combustibles no se descuentan).

MUST: si el item es `oil`, el descuento de esa linea MUST quedar en 0 y el input deshabilitado. Si el contrato no expone `oil` (caso del stub actual), el fallback deja el mecanismo inactivo (DEUDA_TECNICA_CONFIRMAR, backend JOR-086/090).

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN un item con `oil` = true WHEN se agrega a una linea THEN el descuento queda 0 y el input deshabilitado.
- Scenario (stub actual): GIVEN un item sin `oil` en el contrato WHEN se agrega THEN el mecanismo queda inactivo (fallback) hasta que el backend sirva el campo.
</details>

### REQ-03: un item con falla no se agrega y alerta al supervisor
> Que cambia: seleccionar un item con `failure` no lo agrega a las lineas; se muestra una alerta de supervisor.
> Por que: fidelidad al legacy (un item con falla no puede facturarse/comprarse).

MUST: al intentar agregar un item con `failure` (VIABLE sobre el stub), el item NO se agrega a las lineas y se muestra una alerta de supervisor.

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN un item con `failure` = true WHEN el usuario lo selecciona en el buscador THEN el item NO se agrega y aparece la alerta de supervisor.
- Scenario: GIVEN un item sin `failure` WHEN se selecciona THEN se agrega normalmente.
</details>

### REQ-04: semaforo de stock/prioridad/falla + indicador "A Mano" en el ItemSearchPanel
> Que cambia: el buscador de items muestra un semaforo (prioridad/falla, y stock cuando el backend lo sirva) mas el indicador "A Mano".
> Por que: la senalizacion visual del legacy ayuda a elegir el item correcto (evitar fallas, respetar prioridad, ver disponibilidad).

MUST: `ItemSearchPanel` MUST mostrar el semaforo de prioridad (amarillo) y falla (rojo) — VIABLES sobre el stub. El estado "critico" (stock <= `stockCritico`) y el indicador "A Mano" (`generalStock`) MUST quedar cableados con fallback inactivo mientras esos campos esten ausentes del list item del stub (DEUDA_TECNICA_CONFIRMAR, backend JOR-086/090). Reusa el atomo `Badge` (DET-32 reuse), no crea componente nuevo.

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN un item con `priority` WHEN se lista en el buscador THEN muestra el semaforo amarillo.
- Scenario: GIVEN un item con `failure` WHEN se lista THEN muestra el semaforo rojo.
- Scenario (stub actual): GIVEN un item sin `generalStock`/`stockCritico` WHEN se lista THEN el "A Mano" y el "critico" no se renderizan (fallback inactivo) hasta que el backend sirva el campo.
</details>

### REQ-05: observacion por linea (textarea) que viaja en el payload
> Que cambia: cada linea tiene una observacion editable (textarea colapsable); reemplaza el stub toast "no implementado".
> Por que: el usuario necesita anotar por linea; el stub no persistia nada.

MUST: cada linea MUST exponer una observacion editable (textarea colapsable por linea) que MUST viajar en el payload del builder (via spread del line item). REEMPLAZA el boton stub que mostraba un toast "no implementado" (auditoria de reemplazo DET-40: el stub no persistia nada; el nuevo campo viaja en el payload — sin comportamiento del camino viejo que preservar mas alla del acceso desde la fila).

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN una linea WHEN el usuario abre la observacion y escribe un texto THEN el texto queda en el line item y viaja en el payload al emitir/guardar.
- Scenario: GIVEN una linea sin observacion WHEN se emite THEN el campo viaja vacio (sin romper el payload).
</details>

## Tasks

### Session 1 — Reglas por item + semaforo + observacion [tipo: ⚑ fuerte] [tier: T3]

**Task S1.T1 — Reglas por item (descuento acotado, oil sin descuento, falla no se agrega)**
- source_ref: REQ-01, REQ-02, REQ-03
- agent: developer
- validation: cap de descuento por `maxDiscount` (fallback 100 con el stub); item `oil` con descuento 0 + input deshabilitado (fallback inactivo); item con `failure` no se agrega + alerta supervisor (viable sobre stub). Test por cada regla
- rollback: git revert
- rules: [DET-32, DET-40, DET-4]

**Task S1.T2 — Semaforo del buscador + indicador "A Mano" en ItemSearchPanel**
- source_ref: REQ-04
- agent: developer
- validation: semaforo de prioridad (amarillo) y falla (rojo) render sobre el stub; "critico" (stock<=stockCritico) y "A Mano" (generalStock) cableados con fallback inactivo (campos ausentes en el list item); reusa `Badge` (DET-32). Test de los estados viables + guarda del fallback
- rollback: git revert
- rules: [DET-32, DET-4]

**Task S1.T3 — Observacion por linea (textarea colapsable + payload)**
- source_ref: REQ-05
- agent: developer
- validation: textarea colapsable por linea; el texto viaja en el payload via spread del line item; reemplaza el toast stub (DET-40 auditoria de reemplazo). Test de persistencia en el payload
- rollback: git revert
- rules: [DET-40]

**Task S1.T4 — Tests + stories**
- source_ref: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05
- agent: reviewer/tester
- depends_on: S1.T1, S1.T2, S1.T3
- validation: vitest verde (reglas por item + observacion + ItemSearchPanel); stories del semaforo/observacion render sin error (DET-23 dim Storybook); tsc/eslint exit 0
- rollback: N/A (tests)
- rules: [DET-7, DET-13, DET-23]

**S1.GATE**: quality review (DET-23, tier T3 → exhaustive + dual-judge DET-35), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- Alcance acotado a `shared/builder/ItemSearchPanel/`, `shared/builder/LineItemsTable/`, `lib/builder/calc-line.ts`, `lib/schemas/items.ts`. No tocar backend ni el contrato real del catalogo.
- Reusar el atomo `Badge` para el semaforo (DET-32); no crear componente nuevo.
- Las reglas cuyos campos estan ausentes del stub (`maxDiscount`, `oil`, `generalStock`, `stockCritico`) se cablean con fallback inactivo — nunca hardcodear el campo, dejar el mecanismo listo para el backend.

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Cablear las reglas de campos ausentes con fallback inactivo (no diferir el codigo) | El mecanismo queda listo; cuando el backend (JOR-086/090) sirva `maxDiscount`/`oil`/`generalStock`/`stockCritico` la regla se activa sin re-trabajar el front. DEUDA_TECNICA_CONFIRMAR |
| 2 | `failure` y `priority` operativos sobre el stub | El stub ya los expone; no hay razon para diferirlos |
| 3 | Observacion por linea via spread en el payload (no endpoint nuevo) | No depende de backend; reemplaza el stub toast sin cambiar el contrato de emision |
| 4 | Reusar `Badge` para el semaforo | DET-32 reuse; primitivo existente |

## Acceptance checkpoints

- [ ] AC-1 (REQ-01): descuento de linea topado por `maxDiscount` (fallback 100 con el stub) — test.
- [ ] AC-2 (REQ-02): item `oil` con descuento 0 + input deshabilitado (fallback inactivo con el stub) — test.
- [ ] AC-3 (REQ-03): item con `failure` no se agrega + alerta supervisor — test + verificacion.
- [ ] AC-4 (REQ-04): semaforo prioridad/falla render; "A Mano"/"critico" con fallback inactivo — test.
- [ ] AC-5 (REQ-05): observacion por linea viaja en el payload; reemplaza el toast — test.

## Technical reference

- Contrato de items: `front/jormat-front/src/lib/schemas/items.ts` (campos `failure`, `priority`, `estadoStock` viables; `maxDiscount`/`oil`/`generalStock`/`stockCritico` ausentes en el list item del stub).
- Calculo de linea: `front/jormat-front/src/lib/builder/calc-line.ts` (cap de descuento, oil → descuento 0).
- Buscador: `front/jormat-front/src/components/shared/builder/ItemSearchPanel/` (semaforo + "A Mano" + falla no se agrega).
- Tabla de lineas: `front/jormat-front/src/components/shared/builder/LineItemsTable/` (observacion por linea).
- Backend de los campos ausentes: JOR-086 / JOR-090.
