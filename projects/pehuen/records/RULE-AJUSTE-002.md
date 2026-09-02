---
id: RULE-AJUSTE-002
project: pehuen
type: rule
module: ajustes
level: must
tags:
  - legacy-paridad
  - migration
  - schema
  - batch
---

# `Ajuste.batch` es `Number` (epoch ms al momento de cargar el batch)

## What

El campo `Ajuste.batch` es un número entero que representa el timestamp en milisegundos (epoch ms) del momento en que se cargó el batch desde Excel. Todos los ajustes de un mismo batch comparten el mismo valor de `batch`. No es un ObjectId ni un string.

## Why

El campo `batch` permite agrupar y eliminar en conjunto todos los ajustes de una carga batch específica (ej. "deshacer el batch del 2026-04-15"). Usar el epoch ms del upload como identificador de grupo es simple, no requiere tabla auxiliar, y es suficientemente único para el volumen de operaciones.

## Where

- **Files**: `server/models/ajuste.model.ts` (campo `batch: { type: Number }`), `server/api/ajustes/load.post.ts`
- **Endpoints**: `POST /api/ajustes/load`
- **Tables**: colección `ajustes`, campo `batch`
- **Layers**: database, backend

## When

Al cargar un batch desde Excel. El handler genera el epoch ms al inicio del upload y lo asigna a todos los ajustes del batch antes de insertar.

## Verification

- Test: cargar batch → todos los ajustes creados tienen `batch` igual al mismo número (epoch ms).
- Test: `batch` es numérico, no string ni ObjectId.
- `grep -n "batch.*Number\|batch.*Date.now\|batch.*moment" server/api/ajustes/\|server/models/ajuste" → debe mostrar tipo Number y asignación de epoch.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: comportamiento legacy del endpoint de carga batch de ajustes (verificar en `pehuen-server/src/controllers/ajuste.controller.ts` la generación del campo `batch`).
- **Related**: RULE-AJUSTE-001, RULE-AJUSTE-003
