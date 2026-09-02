---
id: RULE-AUTH-011
project: pehuen
type: rule
module: auth
level: must
tags:
  - legacy-paridad
  - migration
  - roles
  - capabilities
  - contract
  - frontend
  - backend
---

# Capacidades por rol se derivan del contrato del client legacy, no del server legacy

## What

Las capacidades por rol del sistema migrado (qué puede hacer cada rol: ver vistas, ejecutar acciones, modificar campos) son las que el **client legacy** (`pehuen-client`) renderiza, no las que el **server legacy** (`pehuen-server`) permite. El servicio nuxt debe restringir endpoints para que coincidan con lo que el client expone, cerrando huecos históricos de auth en el server.

Granularidad del contrato:

- **General por vista** (`pehuen-client/src/layouts/NavLayout.vue:183-222`): qué items aparecen en el menú según `user.role`. Define qué vistas son accesibles para cada rol.
- **Granular por funcionalidad** (`v-if="user.role === ..."`, `:disabled="... && user.role !== ..."` en `pehuen-client/src/views/**/*.vue`): qué botones, acciones y campos editables aparecen dentro de cada vista cuando convergen múltiples roles.

## Why

El server legacy tiene huecos de auth históricos: varios endpoints sin `requireRole` que cualquier autenticado puede llamar (ej. `PATCH /guia-status` aceptaba cualquier rol — ver DEC-014). Estos huecos NO reflejan el contrato real del sistema, porque el client legacy ya restringe quién ve los botones que llaman a esos endpoints. Migrar la apertura del server = preservar bugs de seguridad, no paridad funcional.

El contrato real de capacidades por rol es lo que el usuario ve y puede ejecutar, y eso vive en el client. Cualquier decisión de rol en nuxt (DEC-001, DEC-014, futuras) debe partir de auditar el client legacy primero.

## Where

- **Fuente de verdad cliente**:
  - `pehuen-client/src/layouts/NavLayout.vue` (menú por rol)
  - `pehuen-client/src/views/**/*.vue` (condicionales `v-if`/`:disabled` por rol)
- **Aplicación en nuxt**:
  - Backend: `server/api/**/*.{get,post,put,patch,delete}.ts` con `requireRole(...)` que coincida con el contrato del client.
  - Frontend: `app/components/**`, `app/pages/**`, `app/composables/useRolePermissions.ts` con misma matriz de capacidades.
- **Layers**: ambos (backend close gaps, frontend preserve contract).

## When

- Antes de definir `requireRole` en cualquier endpoint nuevo o migrado: grep `v-if.*role`, `:disabled.*role`, y revisar `NavLayout.vue` por la vista correspondiente para detectar qué roles ejercen la capability hoy.
- Antes de aceptar un DELTA-CUESTIONABLE de roles: validar contra el client legacy. Si el server nuxt amplía acceso respecto del client legacy, requiere DEC explícita (no se asume intencional).
- Al revisar matriz CAP × rol en SPEC-role-journeys / SPEC-legacy-features: el inventario por rol se genera del client, no del server.

## How to apply

1. Para cada endpoint de servicio nuxt, identificar la vista del client legacy que lo invoca.
2. Listar los roles que renderizan el botón/acción correspondiente (`v-if`, `actions.push` condicional, etc.).
3. Configurar `requireRole(...)` con esa lista exacta.
4. Si el client legacy renderiza para todos excepto X, Y → `requireRole(allRoles - [X, Y])`. No invertir; expresar como inclusión positiva.
5. Si una capability es **nueva** (no existía en client legacy) → DEC explícita justificando qué roles la reciben y por qué.

## Exceptions

- Endpoints de auth (login, logout, refresh): públicos o cualquier autenticado (no son capabilities por rol).
- Endpoints de admin-only que no tienen UI en el client legacy pero existen en el server (ej. operaciones de mantenimiento): mantener restricción explícita a ADMINISTRADOR.

## Related

- **RULE-MIGRATION-004**: caso general — legacy es fuente de verdad para todo. Esta rule especializa el principio al dominio de capabilities por rol.
- **DEC-001**: aplicación a roles de ajustes (solo ADMIN, paridad client legacy).
- **DEC-014**: aplicación a `PATCH /guia-status` (ADMIN/RECEPTOR/ASESOR, paridad client legacy `guides/List.vue:125`).
- **SPEC-role-journeys**: matriz CAP × rol derivada del client.
- **SPEC-legacy-features**: inventario por rol auditado contra `NavLayout.vue` + vistas.
