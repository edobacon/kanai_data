---
id: BUG-core-002
project: up1
type: bug
module: core
tags:
  - prisma
  - dynamic-model-access
  - getInstance
  - casing
  - object-manager
  - core
---

# Acceso dinámico a modelos Prisma inconsistente: getInstance minusculiza sin fallback, createInstance/getVersionChain prueban PascalCase→camelCase

## Symptom

`getInstance` (instance.resolver.js ~L2053) minusculiza la primera letra del `objectType` sin fallback. Si el client Prisma expone el modelo en PascalCase (ej. `prisma.Activity`, no `prisma.activity`), la llamada retorna `undefined` y el resolver falla con un error criptico de `undefined is not a function`.

## Expected behavior

El acceso dinámico a modelos Prisma debe ser robusto ante la convención de casing del client: intentar PascalCase primero y caer a camelCase como fallback, igual que hacen `createInstance` (~L2327) y `getVersionChain`.

## Root cause

Inconsistencia de implementación en `instance.resolver.js`: cada resolver que necesita acceder dinámicamente a un modelo Prisma implementó el lookup de forma independiente. `getInstance` optó por minusculizar sin verificar si el client expone PascalCase. `createInstance` y `getVersionChain` adoptaron el patrón robusto (try PascalCase → fallback camelCase). El client real de Prisma expone `prisma.Activity` (PascalCase).

## Impact

Cualquier objeto cuyo nombre en PascalCase difiera de su versión minusculizada (ej. `CurricularSection` vs `curricularsection`) puede fallar en `getInstance`. El defecto es latente: solo se manifiesta si el client expone PascalCase exclusivamente o si el tenant tiene ese modelo.

## Reproduction

1. Llamar `getInstance(objectType: 'CurricularSection', ...)` contra un tenant donde `prisma.curricularSection` sea `undefined` pero `prisma.CurricularSection` exista.
2. Observar error `TypeError: Cannot read property ... of undefined`.

## Workaround

Usar `createInstance` o `getVersionChain` como referencia: `const model = prisma[objectType] ?? prisma[objectType[0].toLowerCase() + objectType.slice(1)]`. Extraer a helper `resolveModelAccessor(prisma, objectType)` (backlog B1 de TICKET-040) y reemplazar los 3 call-sites.

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-040
