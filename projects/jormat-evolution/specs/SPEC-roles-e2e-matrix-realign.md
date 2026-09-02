---
id: SPEC-roles-e2e-matrix-realign
project: jormat-evolution
ticket: JOR-101
status: done
---

# Fix: realinear la matriz EXPECTED del e2e de roles al estado real del seed

# Fix: realinear la matriz EXPECTED del e2e de roles al estado real del seed

## Executive summary

**Que se quiere**: `test/e2e/roles-config.e2e-spec.ts` tiene 4 tests en rojo porque la matriz
`EXPECTED` (count exacto + `must[]` por rol) quedo vieja frente a los seeds. Varios tickets sumaron
capabilities de negocio legitimas a los roles sin actualizar este e2e: JOR-064 S6 (categorias
view+edit para bodega/jefaturas/gerencia), JOR-064 S8 (aplicaciones + catalogos para gerencia) y
JOR-077 (`items.parts:cost-view` en jefaturas y gerencia). El fix alinea la matriz al estado real,
verificado runtime, sin tocar seeds ni capabilities.

**Causa raiz**: los seeds `04_items_capabilities.ts` y `10_demo_roles_users.ts` crecieron; la matriz
`EXPECTED` no. JOR-077 (y los tickets previos) cerraron corriendo unit, no `test:e2e` (requiere
Postgres), asi que el drift paso silencioso.

**Alcance**: SOLO el archivo de test `roles-config.e2e-spec.ts`. Cero cambios de comportamiento de
produccion. No se modifican seeds ni el catalogo de capabilities.

## Requirement

### REQ-01 — La matriz refleja el vector real resuelto por rol

> **Que cambia**: los `count` de 4 roles y el `must[]` de 3 roles.
> **Por que**: el e2e debe fijar el contrato real de capabilities por rol (atrapa perdidas via
> `must`, atrapa ganancias no intencionadas via `count` exacto). Con la matriz vieja el e2e no
> protege nada: solo falla por drift conocido.

MUST: `EXPECTED[role].count` es igual al numero de capabilities distintas que el seed
`10_demo_roles_users.ts` otorga a ese rol, confirmado contra el runtime de
`findEffectiveCapabilities` (query `distinct c.name`, un rol por caso).

Valores objetivo (confirmados contra seed + runtime):

| Rol | count previo | count real | delta | origen del delta |
|-----|:---:|:---:|:---:|---|
| vendedor | 2 | 2 | 0 | sin cambio |
| bodega | 11 | 13 | +2 | JOR-064 S6 (items.categories view+edit) |
| cajero | 14 | 14 | 0 | sin cambio |
| jefe-local | 25 | 27 | +2 | JOR-077 cost-view + JOR-064 S6 categories:edit |
| jefe-venta | 25 | 27 | +2 | JOR-077 cost-view + JOR-064 S6 categories:edit |
| gerencia | 26 | 31 | +5 | JOR-077 cost-view + JOR-064 S6/S8 (categories:edit, applications:edit, catalogs view+edit) |

MUST: `must[]` de gerencia, jefe-local y jefe-venta incluye `items.parts:cost-view` (capability de
JOR-077 que la regression debe custodiar de aqui en adelante).

## Tasks

### Session 1 (T1, tier T1 — area e2e con DB real)

- S1.T1 — actualizar `EXPECTED` en `roles-config.e2e-spec.ts`: counts (bodega 13, jefe-local 27,
  jefe-venta 27, gerencia 31) + agregar `items.parts:cost-view` a `must[]` de jefaturas y gerencia +
  comentario que documenta el origen del drift. Rollback: `git checkout` del archivo.
- S1.T2 — correr `npm run test:e2e -- roles-config` verde (8/8) + regression suite e2e completo.
- S1.GATE — verificar evidencia runtime, cerrar.

## Evidencia (runtime, DB efimera port 5433)

- Baseline RED: `Tests: 4 failed, 4 passed`. Vector recibido confirmado: jefe-local 27, jefe-venta
  27, gerencia 31 (coincide exacto con el conteo derivado del seed).
- Post-fix GREEN: `Tests: 8 passed, 8 total`.
- Regression: suite e2e completo de la rama `Test Suites: 1 passed` / `8 passed` (roles-config es el
  unico e2e presente en `epic/jormat-v1`; items-read/items-write llegan al mergear JOR-081, mi cambio
  a constantes de matriz no los afecta).

## No-goals

- No modificar seeds ni el catalogo de capabilities (el seed refleja la intencion de negocio de
  JOR-040/JOR-064/JOR-077; se valido que ninguna asignacion es incorrecta).
- No tocar `items-read` / `items-write` e2e (viven en la rama de JOR-081, sin mergear).
