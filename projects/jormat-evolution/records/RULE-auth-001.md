---
id: RULE-auth-001
project: jormat-evolution
type: rule
module: auth
level: must
tags:
  - auth-guard
  - tenant-isolation
  - admin-override
  - validacion
---

# El guard de validacion de un override condicional debe quedar DENTRO del mismo condicional que activa el override

## What

Cuando se agrega una validacion de formato (o cualquier guard) sobre un valor que solo se consume bajo
una condicion (por ejemplo, un header de override que solo aplica si el usuario es admin), la validacion
debe evaluarse **dentro** de esa misma condicion. Si el guard se hoistea fuera del condicional y se aplica
incondicionalmente, un caso que antes ignoraba el valor (porque la condicion no se cumplia) ahora puede
rechazar la request por un valor que ni siquiera iba a usar.

## Why

En `AuthGuard`, el header `X-Admin-Workspace` solo se consume cuando `isAdmin && adminWorkspaceOverride`
son verdaderos; para un usuario no-admin el header se ignora por diseno. Al agregar la validacion de
formato uuid del header (JOR-150 P2), validar el header de forma incondicional habria rechazado requests
de usuarios no-admin con un header malformado que hoy simplemente se ignora — una regresion de
aislamiento de tenant/disponibilidad para un caso que no participa del override. El fix correcto mantiene
el guard dentro del mismo `if (isAdmin && adminWorkspaceOverride)` que ya gateaba el uso del valor.

## Where

- **Files**: `backend/jormat-api/src/auth/auth.guard.ts` (predicado `isAdmin && adminWorkspaceOverride`)
- **Layers**: backend (auth)

## When

Siempre que se agregue una validacion (formato, tipo, rango) sobre un valor que solo se consume bajo una
condicion existente (override, feature flag, rol). Aplica a cualquier guard/middleware que module su
comportamiento segun un predicado — no solo a `AuthGuard`.

## Verification

- Test e2e/unit que ejercite el caso "no cumple la condicion + valor invalido" y confirme que el
  comportamiento no cambia (el valor sigue ignorado, sin rechazo). En este ticket: TC6 (no-admin con
  header malformado, sin regresion).
- Review manual: el guard nuevo debe compartir el mismo `if` (o predicado equivalente) que el consumo del
  valor, no un guard hermano evaluado antes.

## Source

- **Discovered in**: JOR-150, Session 1 (S1.T2, hallazgo confirmado en el dual-judge de S1.GATE)
- **Evidence**: juez B (ronda 1) senalo que validar el header fuera del condicional rompia el caso
  no-admin; el fix mantuvo el guard dentro de `isAdmin && adminWorkspaceOverride` (commit `3278eba`,
  ajustado en `a84ff00`)
- **Related**: RULE-global-002 (riesgo O-3, header X-Admin-Workspace crudo alimentando tenantScoped)
