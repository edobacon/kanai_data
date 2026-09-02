---
id: SPEC-permissions-demo-roles-seed
project: jormat-evolution
ticket: JOR-040
status: done
---

# Seed de 6 roles demo + 6 usuarios, con capabilities mapeadas desde legacy

# Seed de 6 roles demo + 6 usuarios, con capabilities mapeadas desde legacy

## Executive summary — lo que estas aprobando

**Que se quiere**: un seed nuevo aditivo (`10_demo_roles_users.ts`) que cree 6 roles
workspace-scoped (vendedor, bodega, jefe-local, jefe-venta, gerencia, cajero) con sus
`role_capabilities` mapeadas desde la matriz de permisos legacy, y 6 usuarios demo CIAM
con su `user_role` asignado.

**Decisiones (aprobadas por el dev, JOR-040 intake)**:
- **Subset mapeable**: cada rol recibe solo las capabilities que existen en el catalogo nuevo (29). Los permisos legacy sin capability quedan como gap documentado (no se crean capabilities sin enforcement).
- **Mapeos inferidos aceptados**: `*:issue` junto con edit, acciones finas de config desde Edit, `apply-payment` desde validar comprobante, `reportes.summary:view` desde cualquier reporte (ver matriz del ticket).
- **`b2c_oid` placeholder + relink**: las 6 claves CIAM estan expiradas (`AADSTS50055`), no se puede capturar el oid real ahora. Se siembra con oid placeholder determinista (`dev-<role>-oid`); el relink al oid real es trabajo posterior (Backlog) cuando se renueven las claves.

**Que NO se hace** (out-of-scope):
- No se crean capabilities/modulos nuevos (Bodega, DTE, RRHH, etc. — gap documentado en el ticket).
- No se toca `01_initial_data` ni ningun seed entregado (RULE-global-003); seed nuevo aditivo.
- No se modifica el `AuthGuard` ni el flujo CIAM. El login real de las cuentas queda pendiente del relink de oid.

**Tamano estimado**: 1 session execute (~1.5h).

## Purpose

Agregar `backend/jormat-api/seeds/10_demo_roles_users.ts` (aditivo, idempotente, no-prod) que
siembre los 6 roles + sus capabilities + los 6 usuarios + sus `user_roles` + `workspace_memberships`,
en el workspace demo (`11111111-1111-1111-1111-111111111111`).

## Requirements

### REQ-01: 6 roles workspace-scoped con capabilities mapeadas desde legacy

> **Que cambia**: se crean 6 filas en `roles` (workspace_id = demo, is_system=false) y sus
> `role_capabilities` segun la matriz del ticket (solo capabilities del catalogo existente).
> **Por que**: portar el modelo de permisos legacy (por rol de negocio) al RBAC nuevo.

El sistema MUST crear los 6 roles con EXACTAMENTE estas capabilities (matriz legacy → subset mapeable):

- **vendedor** (2): `items.parts:view`, `reportes.summary:view`
- **bodega** (11): `items.parts:view`, `items.parts:edit`, `items.parts:matrix`, `items.parts:priority`, `entities.suppliers:view`, `sales.invoices:edit`, `sales.invoices:issue`, `entities.customers:edit`, `purchases.supplier-invoices:edit`, `purchases.supplier-invoices:issue`, `reportes.summary:view`
- **cajero** (14): `items.parts:view`, `items.parts:critical`, `items.parts:matrix`, `items.categories:view`, `entities.suppliers:view`, `sales.documents:view`, `sales.documents:void`, `sales.invoices:edit`, `sales.invoices:issue`, `entities.customers:edit`, `purchases.supplier-invoices:edit`, `purchases.supplier-invoices:issue`, `payments.customers:view`, `reportes.summary:view`
- **jefe-local** (25) y **jefe-venta** (25): `config.users:view`, `config.users:edit`, `config.users:assign-roles`, `config.roles:view`, `config.roles:create`, `config.roles:edit`, `config.roles:assign-permissions`, `items.parts:view`, `items.parts:edit`, `items.parts:critical`, `items.parts:matrix`, `items.parts:priority`, `items.categories:view`, `entities.suppliers:view`, `sales.documents:view`, `sales.documents:void`, `sales.invoices:edit`, `sales.invoices:issue`, `entities.customers:edit`, `purchases.supplier-invoices:edit`, `purchases.supplier-invoices:issue`, `payments.customers:view`, `payments.customers:record-payment`, `payments.customers:apply-payment`, `reportes.summary:view`
- **gerencia** (26): igual que jefe-local + `items.applications:view`

Las `role_capabilities` MUST referenciar capabilities EXISTENTES del catalogo (lookup por `name`). Si alguna no existe, el seed MUST fallar ruidosamente (no insertar silenciosamente). Idempotente (re-run no duplica).

**Actor**: system (seed) · **Layers**: backend · **Certainty**: confirmed · **source_ref**: JOR-040 Matriz (legacy getAllPermissionsByrole)

#### Acceptance
`effectiveCaps` de cada rol = la lista de arriba (verificable por query a `role_capabilities → capabilities.name`).

### REQ-02: 6 usuarios demo con rol asignado (oid placeholder)

> **Que cambia**: 6 filas en `users` (email CIAM, `b2c_oid='dev-<role>-oid'`, workspace demo) + su
> `workspace_memberships` + `user_roles` (1 rol c/u segun nombre).
> **Por que**: cuentas demo para ejercitar cada rol.

El sistema MUST crear los 6 usuarios con su email real CIAM, `b2c_oid` placeholder determinista
(`dev-vendedor-oid`, etc.), `role` legacy = `member`, en el workspace demo, con su `workspace_membership`
(role member) y su `user_role` apuntando al rol homonimo. NUNCA persistir password. Idempotente (por email/oid).

**Actor**: system · **Layers**: backend · **Certainty**: confirmed · **source_ref**: JOR-040 Request + decision oid-placeholder

#### Acceptance
`user_roles` join por email muestra 1 rol por usuario, coincidente con su nombre.

### REQ-03: seed aditivo, idempotente y no-prod

> **Que cambia**: el archivo `10_*` no toca seeds previos; corre solo en no-prod; re-run no duplica.
> **Por que**: RULE-global-003 (no tocar base entregada) + seguridad (no sembrar demo en prod).

El seed MUST: (a) NO modificar `01_initial_data` ni otros seeds; (b) `return` temprano si `NODE_ENV==='production'`; (c) ser idempotente (guards por `name`/`email`/`oid`/unique).

**Actor**: system · **Layers**: backend · **Certainty**: confirmed · **source_ref**: RULE-global-003, patron seeds 03-09

#### Acceptance
Re-correr el seed 2x no crea duplicados; `01_initial_data` sin cambios; diff solo agrega `10_*`.

## Tasks

### Session 2 — Seed demo roles + users

#### S2.T1 — Escribir `backend/jormat-api/seeds/10_demo_roles_users.ts`
- **Contract**: seed aditivo con un mapa `ROLE → capabilities[]` (las listas de REQ-01) + lista de 6 usuarios (email + oid placeholder + role-name). Crear roles (workspace demo, is_system=false), role_capabilities (lookup capability by name, fallar si falta), users + workspace_memberships + user_roles. Guard no-prod + idempotente. Sin comentarios redundantes (RULE-global-001 §C5).
- **Files**: `backend/jormat-api/seeds/10_demo_roles_users.ts` (nuevo)
- **Validation**: `tsc`/build del backend sin errores; lint 0 errors.
- **Rollback**: borrar el archivo nuevo.
- **REQ**: REQ-01, REQ-02, REQ-03

#### S2.T2 — Correr seed + verificar effectiveCaps y user_roles
- **Contract**: correr el seed (host: `DB_HOST=localhost DB_PORT=5433 npx knex seed:run`); query de verificacion: caps por rol = matriz; user_roles por email = rol homonimo; re-run idempotente.
- **Validation**: las 6 queries devuelven lo esperado (TC-1, TC-2); 2da corrida sin duplicados.
- **Rollback**: n/a (data dev).
- **REQ**: REQ-01, REQ-02, REQ-03

#### S2.GATE — Verificar seed (tier T2)
- Caps por rol correctas; usuarios con su rol; idempotente; base entregada intacta. Gate ⚑ fuerte.

## Acceptance checkpoints

- [x] AC-1 (REQ-01): caps por rol = matriz (vendedor 2, bodega 11, cajero 14, jefe-local 25, jefe-venta 25, gerencia 26). Verificado via knex.
- [x] AC-2 (REQ-02): 6 usuarios con user_role homonimo; sin password; oid `dev-<role>-oid`. Verificado.
- [x] AC-3 (REQ-03): 2 re-runs de seed 10 sin duplicados; no-prod guard; `01_initial_data` sin cambios (diff solo agrega `10_*`).
- [x] AC-4: lint 0 errors; ts-node compila el seed al correr.

## Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-1 | auto | pending |
| REQ-02 | TC-2 | auto | pending |
| REQ-03 | TC-3 (idempotencia) | auto | pending |

## Backlog

| # | Item | Prioridad |
|---|------|-----------|
| B1 | Relink del `b2c_oid` real cuando se renueven las claves CIAM (1 update por usuario, match por email). Hasta entonces el login real no funciona; el RBAC si es verificable. | should |
| B2 | Capabilities para los modulos legacy sin equivalente (Bodega, DTE, RRHH, Finanzas detalle, Ventas/Compras detalle, items camiones/catalogos) — cuando esos modulos se implementen. | could |
