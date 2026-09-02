---
id: SPEC-customers-maintainer
project: jormat-evolution
ticket: JOR-089
status: done
---

# Mantenedor de clientes (customers): tabla + CRUD + validación RUT + reuso en builder

# Mantenedor de clientes (customers): tabla + CRUD + validación RUT + reuso en builder

## Executive summary

**Que se quiere**: crear el mantenedor de clientes (CRUD) con validación de RUT (módulo 11). Hoy
clientes es solo un catálogo de lectura stub. Requiere modelo nuevo (tabla `customers`), backend CRUD
gateado por `entities.customers:edit`, validación de RUT, y reuso de datos reales en el buscador del
builder de factura.

**Base**: se ejecuta sobre `epic/jormat-v1` con JOR-082 (catálogos→DB) y JOR-101 (matriz roles) ya
mergeados (decisión del dev, camino A: mergear pendientes antes de arrancar este ticket, para evitar
colisión de RBAC y del stub de clientes).

**Data-model validado** (contra plan + legacy):

| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK→workspaces | tenant isolation |
| razon_social, rut, telefono, ciudad, direccion | string | los 5 del contrato `ClienteDto` (legacy = mismos 5 en el receptor de factura) |
| disabled_at | timestamp null | soft-delete (legacy no tenía borrado → se alinea al molde users_disabled_at + JOR-082) |
| timestamps | | |

Unicidad de RUT por workspace SOLO entre activos (índice parcial `WHERE disabled_at IS NULL`).

**Decisiones** (dev, 2026-07-23): campos mínimos (los 5); soft-delete; tabla `customers` (inglés);
RUT único por workspace; **desacoplado de sales documents** (los DTE guardan el receptor
denormalizado; este ticket no toca esa relación). Principio: lo que falte se hardcodea + DEUDA, no se
omite.

**DEUDA_TECNICA registrada**: email/giro/comuna (facturación chilena, no modelados aún);
bloqueo de crédito (`locked`) + persistencia de `updateAddress` (son del builder, JOR-088);
validador RUT duplicado front/back (unificar en `shared/` cuando DEC-002 Fase 2 lo cablee).

## Requirements

### REQ-01 — Tabla + seed de clientes
MUST: migración `customers` (schema arriba) + seed demo con RUTs **válidos** (los del stub eran
inválidos, DV incorrecto).

### REQ-02 — Validación de RUT (módulo 11)
MUST: util `isValidRut`/`computeDv`/`cleanRut`/`formatRut` (backend `src/common/rut` + front
`lib/rut`, duplicado con DEUDA). El create/edit del cliente rechaza RUT inválido (400).

### REQ-03 — Backend CRUD (customers) tenant-scoped, RBAC entities.customers:edit
MUST: módulo `customers` (repository + service + controller) con list/get/create/update/delete,
`tenantScoped`, gateado por `entities.customers:edit`. Delete = soft (`disabled_at`). Unicidad de RUT
case/format-insensitive entre activos (409 si duplicado).

### REQ-04 — Reuso en el builder (datos reales, contrato congelado)
MUST: `catalogos.getClientes` (que el builder consume vía `catalogos:view`) pasa a leer la tabla
`customers` (dinamización sobre el `CatalogosRepository` de JOR-082). El front del builder no cambia.

### REQ-05 — Frontend mantenedor
MUST: vista mantenedor de clientes (list + form modal con validación RUT) gateada por
`entities.customers:edit`, molde de los mantenedores de categorías/aplicaciones (JOR-064/085).

## Tasks

### Session 1 (backend) — tier T3
- S1.T1 — validador RUT (`common/rut`) + spec. **[done]**
- S1.T2 — migración `customers` + seed con RUTs válidos. **[done]**
- S1.T3 — módulo `customers`: dto + repository + service (RUT + unicidad + soft-delete) + controller (RBAC) + module + registro en app.module.
- S1.T4 — dinamizar `catalogos.getClientes` sobre `customers` (reuso builder, contrato congelado).
- S1.T5 — e2e `customers-read`/`customers-write` contra DB real.
- S1.GATE.

### Session 2 (frontend) — tier T2
- S2.T1 — front RUT util (`lib/rut`) + spec.
- S2.T2 — hooks + services api de customers.
- S2.T3 — vista mantenedor (list + form modal con validación RUT) + component tests.
- S2.T4 — verificar reuso en el builder (CustomerCard/TransactionBuilder siguen verdes).
- S2.GATE.

## No-goals
- No tocar la relación DTE↔cliente (denormalizada; desacoplado).
- No modelar email/giro/comuna todavía (DEUDA).
- No implementar bloqueo de crédito (`locked`) — es del builder (JOR-088).
