---
id: RULE-curriculum-design-008
project: up1
type: rule
module: curriculum-design
tags:
  - testing
  - seed
  - stub
  - proxy-mock
  - db-gated
  - model-break
---

# El stub de los seed-tests es un Proxy genérico: no atrapa breaks de modelo (solo DB-gated)

## What

El stub de los seed-tests de curriculum-design (`makePrismaMock` en seed-counts.test.ts / fixtures-vs-seed.test.ts) es un Proxy GENERICO: intercepta cualquier `prisma.<model>.<method>` y devuelve defaults (create/upsert/update -> {id, ...data}; findFirst -> resolver pre-poblado o null). Acepta cualquier campo y cualquier modelo sin validar contra el schema real. seed-entry.test.ts tampoco ejerce el seed real: mockea los loaders enteros (vi.mock).

## Why

Un break del MODELO (columna/enum/modelo inexistente contra el schema regenerado) NO lo atrapa el stub: la suite pasa verde aunque el seed rompa en DB. Corolario practico: agregar un modelo nuevo al seed (ej. rt__Faculty__OrgUnit) NO requiere extender el stub (es no-op). La unica validacion real de un cambio de modelo es DB-gated (reset-mods + sync + seed contra el schema regenerado). En TICKET-076 la suite paso 748/748 con el seed adaptado, pero el break real (Institution.country, enum OrgUnit) solo aparecio corriendo el seed contra DB.

## Where

mods/curriculum-design/tests/integration/seed-counts.test.ts y fixtures-vs-seed.test.ts (makePrismaMock = Proxy); seed-entry.test.ts (vi.mock de loaders).

## When

Al estimar si los seed-tests cubren un cambio de modelo, o al planear la validacion de un cambio que toca columnas/enums/modelos nuevos (planificar siempre un paso DB-gated, no confiar en la suite verde).

## Verification

Leer makePrismaMock (es `new Proxy({}, ...)`); confirmar que no enumera modelos ni valida campos. El break de modelo se reproduce solo contra schema real (S2 DB-gated de TICKET-076).

## Source

- **Discovered in**: TICKET-076
