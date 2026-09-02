---
id: SPEC-backend-branch-coverage-gate
project: jormat-evolution
ticket: JOR-114
status: done
---

# Backend: cerrar el gate de 89% branches (merged unit+e2e)

# Backend: cerrar el gate de 89% branches (merged unit+e2e)

## Executive summary

La cobertura real del backend (merged unit+e2e) es 98.1% stmts / 98.6% lines / 95.2% funcs / **88.3%
branches**. Todos los ejes superan 85%, pero el gate propio del proyecto (`test:cov:merge --branches=89`)
falla por 0.7% (823/932; faltan ~7 branches cubiertos). Este ticket agrega tests unitarios dirigidos a
branches no cubiertos en archivos unit-testables (sin BD, sin flaky) para cruzar 89% con margen (~90%),
dejando el gate verde. No cambia codigo de produccion; solo tests.

## Estado inicial (medido 2026-08-08)
109 branches sin cubrir. Concentracion: items (65), catalogos (14), common/utils y services de la ola.
Targets elegidos por costo/beneficio (puros o stub in-memory, unit-testables):

| Archivo | branches faltantes |
|---|---|
| src/items/csv/items-import.util.ts | 8 |
| src/purchases/purchases.service.ts | 4 |
| src/sales/sales.service.ts | 3 |
| src/payments/payments.service.ts | 2 |
| src/common/filters/all-exceptions.filter.ts | 2 |
| src/common/rut/rut.util.ts | 1 |
| src/common/pagination/paginate.ts | 1 |
| src/config/env.validation.ts | 1 |

## Requirements

### REQ-01 — Cubrir branches faltantes en archivos unit-testables
MUST: agregar/extender tests unitarios (jest) que ejerzan los branches no cubiertos de los archivos de la
tabla, priorizando los puros (utils) y los stubs in-memory (services de la ola). Cada test asevera valores
concretos (no solo que no lanza). Sin tocar codigo de produccion.

### REQ-02 — Merged branch >= 89%
MUST: tras los tests, `npm run test:cov:all` (unit + e2e + merge) deja el eje branches >= 89% (objetivo
~90% para margen), con el gate `merge-coverage` en verde (exit 0). Los otros ejes se mantienen (>=90%).

## Tasks (Session 1, tier T2)
- S1.T1 — tests de branches para `items-import.util.ts` (8) + utils comunes `rut`/`paginate`/`all-exceptions.filter`/`env.validation` (5).
- S1.T2 — tests de branches para los services de la ola: `purchases`/`sales`/`payments` (9).
- S1.T3 — correr `test:cov:all` con BD; confirmar merged branches >= 89% (gate verde) + resto >= piso.
- S1.GATE.

## No-goals
- Tocar codigo de produccion. Subir items.repository (34, requiere integration con BD) mas alla de lo
  necesario. Estabilizar los 5 flaky del front (follow-up aparte).
