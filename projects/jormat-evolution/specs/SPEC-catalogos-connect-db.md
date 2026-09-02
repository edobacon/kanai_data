---
id: SPEC-catalogos-connect-db
project: jormat-evolution
ticket: JOR-082
status: done
---

# Dinamizar servicios de catalogos a DB (stub -> Knex)

# Dinamizar servicios de catalogos a DB (stub -> Knex)

## Executive summary

**Que se quiere**: reemplazar el store in-memory del `CatalogosService` (stub JOR-057) por queries
Knex sobre las tablas reales de inventario, siguiendo el molde de `items` (JOR-081): repository por
interfaz (DI), `tenantScoped` para aislacion de tenant, filtro `in_status = 1`. El contrato HTTP
(DTOs) queda **congelado**: el front (JOR-058) no se toca.

**Hallazgos de la investigacion** (contra codigo + seed real):

1. Tablas que EXISTEN (esquema plural + uuid + workspace_id, JOR-099/100): `categories` (10 filas
   seed), `applications` (10), `providers` (5), `warehouses` (3). Se dinamizan.
2. Tablas que NO existen: `formas_de_pago`, `clientes`/`customers`, entidad `catalogos` persistida.
   Sus endpoints (`getFormasPago`, `getClientes`) **quedan stub** con `DEUDA_TECNICA`.
3. El "drift de naming" del Request es **inexacto**: `catalogos:view` (module catalogos, DEC-LOCAL-1,
   este modulo transversal) y `items.catalogs:view/edit/delete` (entidad "catalogos de repuestos"
   bajo `items/`, JOR-064 S8) son DOS capabilities distintas, no una colision. Decision del dev
   (2026-07-23): **mantener `catalogos:view`** y documentar el no-drift. Cero cambio de naming.
4. `providers` no tiene columna `rut` (tiene `ds_account`) y `type` es int sin mapeo confiable a
   nacional/internacional (Bosch Chile = type 1, igual que Korea/Japan). Decision del dev: `rut`
   vacio + `DEUDA_TECNICA`; por consistencia `tipo` default `'nacional'` + `DEUDA_TECNICA` (el enum
   del DTO congelado no admite vacio).

## Mapeo de contrato (DTO -> tabla)

| Endpoint | Tabla | Mapeo | Notas |
|----------|-------|-------|-------|
| `getCategorias` / list | `categories` | id←String(id), nombre←ds_name, codigo←ds_code | limpio |
| `getAplicaciones` / list | `applications` | id←String(id), nombre←ds_name, codigo←ds_code | limpio |
| `getProveedores` | `providers` | id←String(id), nombre←ds_name, telefono←ds_phone_number, email←ds_email, rut←'', tipo←'nacional' | DEUDA rut+tipo |
| `getBodegas` | `warehouses` | codigo←ds_code, nombre←ds_name | limpio |
| `getFormasPago` | (no existe) | — | stub + DEUDA |
| `getClientes` | (no existe) | — | stub + DEUDA |

**id**: se expone el `id` serial como string (molde items JOR-081, `String(row.id)`), no el uuid, por
consistencia con el resto del backend. Observacion cross-cutting: unificar en uuid es un follow-up
transversal (items + catalogos), fuera de alcance aqui.

## Requirements

### REQ-01 — Reads dinamicos con contrato congelado y tenant scope

MUST: `getCategorias`, `getAplicaciones`, `getProveedores`, `getBodegas` leen de sus tablas via un
`CatalogosRepository` (interfaz + `KnexCatalogosRepository`, DI token), acotado por `tenantScoped(db,
tabla, workspaceId)` y `in_status = 1`. El shape de cada DTO es identico al stub (REQ-PRESERVE).

MUST: `listCategoriasPaginated` / `listAplicacionesPaginated` devuelven el envelope `{ data, page,
limit, total }` con `total` real (count DB) y search sobre `ds_name`/`ds_code`.

### REQ-02 — CRUD de categorias/aplicaciones contra DB

MUST: create/update/delete de categorias y aplicaciones operan sobre la tabla, scopeados por
workspace. Unicidad de `codigo` (`ds_code`) case-insensitive entre filas `in_status = 1`. Delete =
**soft** (`in_status = 0`) para preservar los links `item_categories`/`application_items` (FK
onDelete SET NULL); los reads ya filtran `in_status = 1`. Rollback: revertir el commit.

### REQ-03 — Stub preservado con deuda para lo no persistido

MUST: `getFormasPago` y `getClientes` permanecen in-memory (no hay tabla). Registrar
`DEUDA_TECNICA[catalogos]` para formas_de_pago, clientes/customers, `providers.rut`,
`providers.tipo`.

### REQ-04 — Naming intacto

MUST: no se cambia `catalogos:view` (decision dev). Documentar en el codigo que `catalogos:view` y
`items.catalogs:*` son intencionalmente distintos.

## Tasks

### Session 1 (reads) — tier T2 (unit del area + e2e integration)

- S1.T1 — `catalogos.repository.ts`: interfaz `CatalogosRepository` + `KnexCatalogosRepository` +
  token DI; metodos de read (categorias, aplicaciones, proveedores, bodegas) + paginados. Mapeo a DTO.
- S1.T2 — refactor `catalogos.service.ts`: reads delegan al repository; formas-pago/clientes stub.
  `catalogos.module.ts`: proveer el repository por token.
- S1.T3 — actualizar `catalogos.service.spec.ts` (mock del repository) + `catalogos.controller.spec.ts`.
- S1.T4 — `test/e2e/catalogos-read.e2e-spec.ts`: asserts contra seed real (categorias 10, aplicaciones
  10, proveedores 5, bodegas 3 + shapes + tenant scope). Verde.
- S1.GATE.

### Session 2 (CRUD + deuda) — tier T3 (regression completa)

- S2.T1 — repository: create/update/delete (soft) de categorias/aplicaciones + unicidad de codigo.
- S2.T2 — service CRUD delega al repository.
- S2.T3 — `test/e2e/catalogos-write.e2e-spec.ts`: create/update/delete round-trip contra DB + 409
  codigo duplicado + soft-delete desaparece del read. Verde.
- S2.T4 — DEUDA_TECNICA documentada (jormat_docs/backend + comentarios de codigo) + comentario del
  no-drift de naming.
- S2.GATE — regression e2e completa + close-ready.

## No-goals

- No crear tablas nuevas (formas_de_pago, clientes, catalogos persistido) — eso es otro ticket.
- No tocar el front (contrato congelado, JOR-058).
- No cambiar el naming de capabilities.
- No unificar id serial->uuid (follow-up transversal).
