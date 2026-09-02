---
id: SPEC-ventas-contract-stub
project: jormat-evolution
ticket: JOR-111
status: done
---

# Ventas: congelar contrato + extender stub (sin BD)

# Ventas: congelar contrato + extender stub (sin BD)

## Executive summary

Bloque V0 del PLAN front-fidelity: preparar el contrato de ventas para que el front (JOR-087/088)
avance sobre stub, sin crear tablas. Es la mitad "contrato + stub" separada de JOR-086 (persistencia).
Unifica el drift de `tipoDTE` al enum canonico del legacy (DEC-009), extiende el shape del documento con
los campos que la vista necesita, y revierte el descuento de linea a porcentaje (DEC-018). Contrato
congelado: al dinamizar (JOR-086, stub->DB) el front no se toca.

## Requirements

### REQ-01 — Enum canonico de tipoDTE (6 tipos legacy)
> Que cambia: `tipoDTE` deja de tener ejes distintos front/back.
> Por que: el drift rompe el filtro del listado con 400 y colapsa afecta/exenta.

MUST: enum unico compartido front (`lib/schemas/ventas.ts`) y back (`documento.dto.ts`) =
`factura_afecta`, `factura_exenta`, `nota_credito`, `documento_nn`, `boleta`, `guia_despacho`
(DEC-009, derivado 1:1 de los modulos de `jormat-front-legacy/src/app/sales/`). IVA derivado del tipo
via `TIPO_DTE_SIN_IVA = ['factura_exenta','guia_despacho']`. Test de paridad front<->back.

### REQ-02 — Shape extendido del documento (stub)
> Que cambia: el documento del listado/detalle expone los campos del legacy que faltaban.

MUST: `DocumentoDTEDto` + zod `documentoDTESchema` + stub + mock exponen `origen`, `oc?`, `vencimiento`,
receptor completo (`telefono?`/`ciudad?`/`direccion?`) y `despacho?`. Aditivo; el detalle
(`DocumentoDTEDetalleDto`) sigue extendiendo el del listado. Sin BD.

### REQ-03 — Descuento de linea como porcentaje
> Que cambia: el descuento de linea vuelve a porcentaje (0-100), fiel al legacy.

MUST: `calcLineTotal` = `round(bruto - descuento*bruto/100)`, piso 0 (DEC-018, legacy
`clientsInvoicesCreateController.js`). `lineItemSchema.descuento` con `.max(100)`. Aplica a la primitiva
compartida (ventas+compras). `descuentoGlobal` se mantiene como monto.

## Tasks (Session 1, tier T2)
- S1.T1 — enum canonico 6 valores en front+back (paridad) + `TIPO_DTE_SIN_IVA` + mock/filtro cubren los 6 (REQ-01).
- S1.T2 — shape extendido del documento: DTO + zod + stub + mock con origen/oc/vencimiento/receptor/despacho (REQ-02).
- S1.T3 — descuento de linea a porcentaje: `calcLineTotal` + `.max(100)`; retirar `DEUDA_TECNICA_CONFIRMAR` (REQ-03).
- S1.T4 — tests (paridad enum, Vencida n/a aqui, suites de ventas/calc) + verificacion independiente (backend jest + front vitest + tsc).
- S1.GATE.

## Evidencia
- Backend jest `src/sales` 49/49. Front vitest areas tocadas 312/313 (1 flaky ajeno, `ItemSearchPanel`,
  pasa 10/10 aislado, no tocado por el ticket). `tsc --noEmit` front y back exit 0. Paridad enum confirmada.
- Commits (rama `JOR-111-contract-stub`, mergeada a epic `--no-ff`): 38cbd43 feat · b085ffd fix · 982947d test.

## No-goals
- Tablas de documentos DTE + lineas + repo Knex (JOR-086, persistencia).
- SII real (externo, sign-off diferido). Builder de guia/boleta/NN (valores validos del enum, sin builder aun).
