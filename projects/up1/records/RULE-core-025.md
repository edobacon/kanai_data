---
id: RULE-core-025
project: up1
type: rule
module: core
tags:
  - testing
  - resolvers
  - rbac
  - fixtures
  - mocks
  - tautology
  - withAuth
  - core
---

# Testing de resolvers: sincronizar fixtures, evitar mocks tautológicos, y testear RBAC en withAuth.js no en el unit del resolver

## What

Al testear resolvers de object-manager: (1) sincronizar los fixtures (seed-*.json) al cambiar el tipo de un campo seedeado y correr la suite COMPLETA antes del gate; (2) evitar mocks tautológicos — las assertions sobre el `where` de Prisma deben verificar los args reales de la llamada (`toHaveBeenLastCalledWith(where.AND ...)`) para probar que el RESOLVER construye el filtro, no que el mock lo aplica; (3) el gate RBAC por tipo (`withObjectAuth`) se testea en `withAuth.js` con sus tests propios; el unit del resolver usa mock pass-through canónico para ese gate.

## Why

Un override de `findMany` que aplica el recorte RBAC dentro del test crea una tautología: el test pasa porque el mock lo hace, no porque el resolver construya el `where.AND` correcto. Además, un fixture desactualizado en tipo (ej. `version` String vs Int) puede hacer que un test pase contra la fixture pero el resolver falle en runtime con datos reales.

## Where

- `object-manager/tests/unit/resolvers/get-version-chain.test.js` — L2: WARN-1 tautología en RBAC resuelto con `toHaveBeenLastCalledWith`
- `object-manager/tests/unit/resolvers/instance.resolver.test.js` — L3: gate-por-tipo via mock pass-through canónico
- `object-manager/src/graphql/resolvers/middleware/withAuth.js` — tests propios del gate RBAC por tipo
- `object-manager/tests/unit/services/codegen/` — fixtures seed-*.json que deben sincronizarse al cambiar tipos

## When

Al escribir unit tests de resolvers que involucren RBAC, filtros Prisma o campos con tipo cambiado. Al cambiar el tipo de un campo (ej. `version` String→Int) en el objeto del mod. Antes de cerrar un gate de session (DET-23 dimension #4 testing).

## Verification

1. Grep `toHaveBeenCalledWith` / `toHaveBeenLastCalledWith` en los tests del resolver para verificar que las assertions de filtro son sobre los args del spy, no sobre el resultado del mock. 2. `git diff` de fixtures vs tipo actual del campo en `objects/business/Base/`. 3. Correr `npx vitest run tests/unit/resolvers/` — suite completa verde.

## Source

- **Discovered in**: TICKET-034, TICKET-040
