---
id: RULE-database-001
project: jormat-evolution
type: rule
module: database
level: must
tags:
  - database
  - soft-delete
  - is_active
  - convention
  - schema
  - migrations
  - rbac
---

# Soft-delete transversal: is_active smallint 1/0, una sola convencion en todas las tablas

## What

El borrado logico en jormat-api usa **una sola columna transversal**: `is_active smallint NOT NULL DEFAULT 1` (`1` = activo, `0` = eliminado). Aplica a **toda tabla** que tenga borrado logico.

- **Columna canonica**: `is_active smallint NOT NULL DEFAULT 1`. Es un `smallint` con valores `1`/`0`, **NO boolean** (el codigo real ya usaba un smallint 1/0; se estandariza sobre ese patron, no sobre `true`/`false`). No se usan `deleted_at`, `disabled_at`, `is_deleted` ni `status` como convencion de borrado; quedan **prohibidas** para soft-delete.
- **`in_status` NO es borrado logico y NO esta prohibida**: es una columna reservada para el **estado de falla del item** (legacy `status-fail`: `{value, observation}`, feature de inventario aun no migrado). Hoy arrastra valores `1/0` residuales del viejo flag de activo; **nadie debe leer `in_status` como activeness**. Cuando se migre el estado de falla, ese ticket define su dominio real.
- **Contrato de lectura (front)**: el front (y los reads que lo alimentan) **no devuelven filas `is_active = 0`**: a efectos del usuario estan eliminadas.
- **Reads**: toda query que liste/lea registros vivos filtra `WHERE is_active = 1` (o `.where('<tabla>.is_active', 1)` en Knex). El filtro se agrega en cada repo/servicio; el helper `tenantScoped` NO lo inyecta (solo aisla por `workspace_id`).
- **Delete**: soft-delete = `update({ is_active: 0 })`. No `.del()` fisico salvo excepciones documentadas (ver Where).
- **Constraints unicos + soft-delete**: cuando una tabla con soft-delete tiene un unique (incluidos pivotes tipo `user_roles`, `role_capabilities`, pivotes de inventario), ese unique se define como **indice parcial `WHERE is_active = 1`**, para permitir re-crear una fila previamente dada de baja sin colisionar con la inactiva. Patron ya usado en `customers` (indice parcial de RUT).
- **Joins de acceso/permisos (critico)**: al soft-deletear filas de control de acceso (`user_roles`, `role_capabilities`, `workspace_memberships`, `roles`), **todo** join de hidratacion de permisos/membresia debe filtrar `is_active = 1`. Una fila de acceso inactiva NO debe autorizar. Omitir el filtro en un solo join es una fuga de permisos.
- **`status` de ciclo de vida NO es soft-delete**: `workspaces.status` (varchar: active/deleting/…) modela ciclo de vida, no vivo/muerto, y queda FUERA de esta convencion. Un campo `status` de dominio (ej. estado de una cobranza) tampoco es borrado logico.

## Why

- El codigo arrastraba **varias convenciones** conviviendo (`in_status` smallint 1/0 en inventario usado como flag de activo, `disabled_at` timestamp en users/customers, `is_active`+`status` integers muertos en trucks, y varias tablas sin ninguna). Cada dominio filtraba distinto o mezclaba soft y hard delete en la misma clase, lo que hace fragil cada query nueva (facil olvidar cual columna mirar) y bloquea un helper central de aislamiento vivo.
- Una unica columna con default explicito es predecible para seeds (no dependen de un default implicito ambiguo), para queries (siempre el mismo predicado) y para el aislamiento por tenant (un solo lugar donde extender `tenantScoped` a futuro si se decide).
- Se estandariza en `smallint 1/0` y **no boolean** porque el codigo real ya operaba con un smallint 1/0 (`in_status`): estandarizar sobre lo existente minimiza el blast radius y evita reinterpretar datos. `is_active` es un flag **puro** (sin `deactivated_at` companion): se prioriza la uniformidad sobre conservar un timestamp de baja dedicado. Consecuencia asumida: la marca temporal de baja queda en `updated_at`, que se sobrescribe en cualquier edicion posterior y por tanto NO es una fecha de baja fiable (decision del dev, 2026-08-13).
- No se renombra `in_status` a `is_active` en inventario: `in_status` se reserva para el estado de falla del item; se agrega `is_active` al lado. El legacy no lee `in_status` por ese nombre (verificado 2026-08-13).

## Where

- **Tablas**: todas las de negocio y control de acceso con borrado logico. Excepciones a soft-delete (se mantienen hard `.del()`, sin `is_active`) deben documentarse explicitamente en el codigo. Caso vigente: `workspaces` (se borra fisico y conserva `status` de ciclo de vida, fuera de alcance).
- **Layers**: backend (`backend/jormat-api/`) — migraciones Knex (fuente de verdad del esquema; no hay ORM con schema aparte), repos/servicios de cada dominio, y seeds.
- **Migraciones**: patron expand-contract — (1) migracion aditiva agrega `is_active` + backfill desde la columna vieja; (2) tras switchear el codigo, migracion que dropea la columna vieja **cuando corresponde**. Excepcion: `in_status` de inventario NO se dropea (queda reservado); solo se agrega `is_active` al lado.

## When

- Al crear una tabla nueva con borrado logico: nace con `is_active smallint NOT NULL DEFAULT 1`.
- Al escribir cualquier read/delete sobre una tabla con soft-delete: filtrar `WHERE is_active = 1` / actualizar `is_active = 0`.
- Migracion de lo existente hacia esta convencion: [[JOR-145]] (dominio/datos) y [[JOR-146]] (RBAC/acceso, con el barrido de fugas de permisos e indices parciales).
