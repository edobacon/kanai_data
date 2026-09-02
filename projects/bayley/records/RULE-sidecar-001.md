---
id: RULE-sidecar-001
project: bayley
type: rule
module: sidecar
level: must
tags:
  - sidecar
  - backend
  - role-filter
  - getAppsFiltered
  - permisos
---

# `getAppsFiltered` respeta selectedRole solo si el user del token tiene ese rol

## What

El resolver `getAppsFiltered` del object-manager filtra las apps devueltas
segun los roles del usuario del token. Si el sidecar agrega el header
`x-selected-role=RolX`, el backend intersecta ese rol con los roles que el
user ya tiene asignados:

- User con roles `[Admin, Consultor]` + `x-selected-role=Consultor` → filtra por Consultor
- User con roles `[Admin, Consultor]` + `x-selected-role=Coordinador` → **userRoleIds=[]** — no tiene ese rol
- userRoleIds vacio → el resolver retorna **solo apps sin `requiredPermissions`** (apps publicas)

Esto significa: si el token autentica a un user que **no tiene ningun rol
asignado** (ej: user de servicio sin roles) o el selectedRole no matchea,
apps con permisos como `hello-world` simplemente **no aparecen** en la
respuesta — no es un error, es el comportamiento diseñado.

## Why

Evita que un user pueda ver apps a las que no tiene acceso simplemente por
pedir un rol en el header. Es una garantia de seguridad del backend.

Para bayley (herramienta dev), esto se traduce en una regla de configuracion
del sidecar: **el AUTH_TOKEN debe representar un user con los roles
apropiados**, no solo un token valido. Un token con user sin roles dara
listas parciales/vacias sin warning.

Descubierto en BLY-016 Session 2: el POC no mostraba `hello-world` hasta
configurar `STORYBOOK_STATIC_TOKEN` (admin@uplanner.dev, rol Admin).

## Where

- **Backend**: `object-manager/src/graphql/resolvers/apps/getAppsFiltered.ts`
- **Sidecar**: `bayley/sidecar/src/graphql.ts` — query `GET_APPS` y pasaje
  del header `x-selected-role` en `fetchApps`
- **Config**: `bayley/sidecar/.env.local` → `AUTH_TOKEN` debe ser de un
  user con roles operativos
- **Doc**: `bayley/sidecar/README.md` — documentar que el token necesita
  roles, no solo validez (pendiente backlog B7)

## When

Siempre que:

1. Se configure un sidecar nuevo o se cambie el `AUTH_TOKEN`
2. Se reporte "la app X no aparece en la lista" cuando el user sabe que existe
3. Se implemente un consumer del sidecar que dependa de `/api/apps`

## Verification

### Chequeo rapido

```bash
curl -sS http://localhost:5174/api/apps | jq '.apps | length, map(.name)'
```

Si la cantidad de apps es menor que las registradas en UP1 (consultar con
object-manager directo), el token probablemente tiene un user sin los roles
necesarios.

### Chequeo con rol especifico

```bash
curl -sS -H "x-selected-role: Admin" http://localhost:5174/api/apps | jq
```

Si el user del token no tiene rol Admin, la respuesta sera subconjunto de
la base (solo apps publicas).

## Source

- **Discovered in**: BLY-016, Session 2 (2026-04-19), learn L1
- **Evidence**: Sidecar con `AUTH_TOKEN=Bearer <user sin roles>` devolvia
  solo apps publicas; `STORYBOOK_STATIC_TOKEN=storybook-dev-token-12345`
  (admin@uplanner.dev rol Admin) devuelve 8 apps incluyendo `hello-world`.
- **Related**: RULE-sidecar-002 (dev tokens), BLY-016 Task #12
- **Dep**: object-manager `userExtractor.js:87-107`
