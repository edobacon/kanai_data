---
id: SPEC-items-list-detail-gaps
project: jormat-evolution
ticket: JOR-083
status: done
---

# Items listado + detalle: cerrar gaps (alcance acotado)

# Items listado + detalle: cerrar gaps (alcance acotado)

## Executive summary

Cerrar los gaps de UI del listado/ficha de items ahora que el backend es real (JOR-081 mergeado).
Alcance acordado con el dev: **cerrable-ahora + DEUDA el resto**. Se implementa color de fila
(stock/prioridad/falla), export CSV del listado, y se confirma el detalle sobre datos reales. Quedan
como DEUDA (sin backend): historial/kardex, clonar.

## Requirements

### REQ-01 — Color de fila por stock/prioridad/falla
MUST: `ItemsTable` colorea la fila: rojo (con falla o sin stock), ámbar (stock bajo o prioridad).
Usa `priority`/`failure` del `ItemDto` (JOR-081) + `estadoStock`. Vía prop aditiva
`getRowClassName` del `DataTable` compartido (no rompe otros consumidores).

### REQ-02 — Export CSV del listado
MUST: el botón "Exportar" (antes stub) descarga la página actual como CSV (front-only, escape RFC
4180 + BOM UTF-8). Util `lib/csv` (`toCsv` puro + `downloadCsv`).

### REQ-03 — Detalle con datos reales
MUST: la ficha (`ItemDetailModal`) consume el backend real de items (JOR-081). Confirmado; sin
cambios de front necesarios.

### REQ-04 — Deuda registrada
MUST: DEUDA_TECNICA documentada (historial/kardex sin tabla; clonar sin endpoint; subir imagen;
import CSV; export del filtro completo) en `jormat_docs/frontend/items-list-detail.md`.

## Tasks (Session 1, tier T2)
- S1.T1 — exponer priority/failure en el schema front + `getRowClassName` en DataTable + coloreo en ItemsTable.
- S1.T2 — `lib/csv` + wiring del botón Exportar.
- S1.T3 — tests: `rowClassForItem`, `toCsv`, export wiring + regression front.
- S1.T4 — DEUDA documentada.
- S1.GATE.

## Evidencia
- Vitest front completo **1831/1831** (incluye coloreo, csv, export). Typecheck limpio. DataTable
  compartido sin regresión.

## No-goals
- Historial/kardex, clonar (sin backend). Subir imagen (fuera de alcance). Import CSV. Export del
  filtro completo (solo página actual).
