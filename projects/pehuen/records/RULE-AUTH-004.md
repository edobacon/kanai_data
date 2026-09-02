---
id: RULE-AUTH-004
project: pehuen
type: rule
module: auth
level: must
tags:
  - legacy-paridad
  - migration
  - roles
  - filtrado
---

# `GET /api/auth/users` retorna SOLO RECEPTORs cuando el solicitante es SUPERVISOR

## What

Cuando un SUPERVISOR llama a `GET /api/auth/users`, la respuesta incluye únicamente usuarios con `role: 'RECEPTOR'`. No ve ADMINISTRADORs, ni otros SUPERVISORs, ni CONSULTORs, ni ASESORs. Un ADMINISTRADOR recibe la lista completa sin filtro de rol.

## Why

El SUPERVISOR gestiona operativamente a los RECEPTORs bajo su cargo. No necesita ver ni modificar otros roles. El filtro reduce la superficie de información expuesta y respeta el modelo de responsabilidades del negocio.

## Where

- **Files**: `server/api/auth/users/index.get.ts`
- **Endpoints**: `GET /api/auth/users`
- **Layers**: backend (query filter condicional por rol del solicitante)

## When

En cada llamada a `GET /api/auth/users`. El filtro se aplica dinámicamente según `event.context.user.role`.

## Verification

- Test: SUPERVISOR llama `GET /api/auth/users` → response contiene solo usuarios con `role: 'RECEPTOR'`.
- Test: ADMINISTRADOR llama `GET /api/auth/users` → response contiene usuarios de todos los roles.
- `grep -n "SUPERVISOR.*RECEPTOR\|role.*RECEPTOR" server/api/auth/users/index.get.ts` → debe existir filtro condicional.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/user.md` contrato de migración punto 9: "Endpoint `GET /auth/users` filtra a solo RECEPTOR cuando el solicitante es SUPERVISOR".
- **Related**: RULE-AUTH-003, DEC-008
