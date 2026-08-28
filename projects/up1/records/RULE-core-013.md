---
id: RULE-core-013
project: up1
type: rule
module: core
---

# Eventos del mod incluyen _previousData y _triggeredBy automaticamente en update/delete

## What

El decorator `withEventPublish` en object-manager hace pre-fetch del registro antes de update/delete cuando existe un event JSON declarado en el mod, y publica al canal Redis un payload con tres componentes:

1. **`data`** — estado despues de la mutacion (o `{id}` para delete)
2. **`_previousData`** — estado antes de la mutacion (solo update/delete, solo si hay event JSON declarado)
3. **`_triggeredBy`** — `{userId, email}` del contexto Clerk (siempre presente)

Ambos `data` y `_previousData` se filtran por `includeFields` si el event JSON lo declara.

Doble canal de publicacion:
- `core` — siempre se publica, sin condiciones
- `<queueName>` (el del app.json del mod) — solo si X-App-ID header presente y `event.condition` evalua truthy

Un mod puede subscribirse al canal `core` con un worker propio para procesar TODOS los eventos sin filtro adicional, o declarar event JSONs especificos para enrutar a su queue propia.

## Why

Permite que mods implementen captura de cambios, auditoria (changeLog), diff detection o trazabilidad **sin modificar el core**. Antes de esta implementacion, calcular diff requeria pre-fetch manual con race condition, o tocar `object-manager` (fuera del scope de un mod).

Implementado por Vignesh Somayaji en sprint uP1 Core SP17:
- **UPONE-1051** (Event Payload Respects includeFields Declaration) — Finalizada 2026-05-07
- **UPONE-1052** (Update and Delete Events Include Previous Record State) — Finalizada 2026-05-07

Impacto directo en estimacion de tickets que necesitan auditoria: HU2 (UPONE-1098 changeLog) baja de ~13 SP a ~5 SP gracias a este mecanismo plug-and-play.

## Where

**Codigo principal:**
- `up1/object-manager/src/events/decorators/withEventPublish.js` — el decorator completo
  - Pre-fetch del registro: lineas 56-66 (`previousRecord = await prisma[modelName].findUnique(...)`)
  - Filtrado por includeFields: `applyIncludeFields` helper, aplicado a `dataSource` y `previousRecord`
  - Enriquecimiento del payload: `enrichedData._previousData = applyIncludeFields(previousRecord)`
  - `_triggeredBy`: `{ userId: context.user?.id, email: context.user?.email }`
  - Publicacion dual: `publishToChannel({...queueName: 'core'})` siempre + `<queueName>` condicional

**Codigo asociado:**
- `up1/object-manager/src/events/loaders/eventLoader.js` — carga events JSON desde mods
- `up1/object-manager/src/events/queues/enqueue.js` — encolado BullMQ
- `up1/object-manager/src/events/publishers/n8nPublisher.js` — publicacion Redis Pub/Sub

**Eventos del mod:**
- `up1/mods/<mod>/events/*.json` — declaracion de eventos por objeto+operacion

**Documentacion:**
- `up1/object-manager/docs/features/event-system.md` — guia general (NO menciona `_previousData` aun — la doc esta desactualizada respecto a UPONE-1052)
- Confluence: `Sistema de Eventos` (page/1984462859) — overview

**Tickets antecesor de la feature:**
- UPONE-1051 — Event Payload Respects includeFields Declaration
- UPONE-1052 — Update and Delete Events Include Previous Record State

## When

Aplica cuando un mod necesite:
- Implementar captura automatica de cambios (changeLog, audit trail)
- Reaccionar a updates/deletes con conocimiento del estado anterior
- Hacer diff field-by-field entre estado previo y nuevo
- Subscribirse a eventos sin modificar las mutations del core
- Trazabilidad de quien hizo que cambio (userId del Clerk context)

NO aplica:
- Para `create` events (no hay estado previo, solo `data` + `_triggeredBy`)
- Si el mod NO declara event JSON para el `objectType+operation` — entonces NO se hace pre-fetch (optimizacion del decorator) y `_previousData` no llega al canal `core`. Para captura universal, declarar al menos 1 event JSON por (objectType, operation) a auditar.

## Verification

**Validacion de codigo:**
```bash
grep -n '_previousData\|_triggeredBy\|previousRecord' up1/object-manager/src/events/decorators/withEventPublish.js
# Debe retornar ~10+ matches
```

**Validacion de tickets:**
- UPONE-1051 status = Finalizada
- UPONE-1052 status = Finalizada

**Validacion runtime:**
1. Declarar event JSON en `mods/<mod>/events/test-update.json` con `trigger.objectType=Foo, trigger.operation=update`
2. Subscribirse a Redis Pub/Sub al canal `core` o `<modQueueName>`
3. Ejecutar `updateInstance(objectType: 'Foo', id: 'x', data: {...})`
4. El payload Redis debe incluir `_previousData`, `data` y `_triggeredBy`

## Source

- **Discovered in**: —
