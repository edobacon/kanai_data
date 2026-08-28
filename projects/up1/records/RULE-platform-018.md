---
id: RULE-platform-018
project: up1
type: rule
module: platform
tags:
  - platform
  - createInstance
  - recordType
  - object-manager
  - mutations
---

# createInstance de un RecordType usa objectType `rt__{RT}__{base}` (NO el nombre base)

## What

Al crear via `createInstance` un objeto que es un **RecordType** (subtipo discriminado por `recordType`), el `objectType` de la mutation DEBE ser el patron RT-calificado `rt__{RecordType}__{base}` (ej. `rt__Group__requirement`), NO el nombre base (`requirement`). El platform usa `parseRecordTypeFileName` (matchea `rt__(.+)__(.+)`) para crear la fila de la tabla RT con sus campos especificos (ej. `combinator`, `minToSatisfy` de un Group). Con el nombre base plano, el resolver crea solo la fila base y los campos del RT se pierden (van al blob `data` sin tabla RT), ademas de poder fallar validacion por campos requeridos del subtipo.

**Asimetria create-vs-list**: `listInstances` SI usa el nombre **base** (`name:'requirement'`) + filtro `recordType=Group` — opera sobre la tabla base. Solo el `createInstance`/`updateInstance` del RT necesita el `rt__X__Y`.

Objetos BASE (sin RecordType, ej. `planEntry`) usan su nombre plano en create/update/delete — sin `rt__`.

## Why

En MC-06 (TICKET-086, S4) el alta de un bloque electivo nuevo se cableo con `objectType:'requirement'` — el flujo "crear bloque" quedo ROTO (no se creaba la fila `rt__Group__requirement`, faltaba el `effect` requerido), pero los 999 tests unitarios verdes no lo detectaban (solo testeaban los builders puros de payload, no el `createInstance` real). Lo atrapo el dual-judge contrastando contra el schema real. Codificar la regla evita repetir el error en cualquier mod que cree RecordTypes.

## Where

Cualquier `createInstance`/`updateInstance` de un objeto con `recordTypes` en su definicion (`object-manager`/mods). Verificar el shape esperado en la definicion del objeto (`objects/*.json`) y el seed.

## When

Al cablear mutations de creacion/edicion de objetos del platform que sean RecordTypes (ej. `requirement` Group/MetricThreshold/RecordState, `Activity` Course, `curriculum` Plan/Minor).

## Verification

- El `objectType` del create/update de un RecordType matchea `rt__{RT}__{base}`.
- El payload incluye los campos `required` del schema base + del subtipo (ej. `effect` para `requirement`).
- El objeto creado reaparece en el `listInstances` (round-trip) — confirma que la fila base + RT se persistieron.

## Source

- **Discovered in**: TICKET-086 (S4) — UPONE-1349. Dual-judge S4 (FAIL F1/F2); precedente correcto en `seed/_data-requirement.js:115` (`effect:'ProgressGate'`).
