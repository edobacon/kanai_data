---
id: RULE-core-015
project: up1
type: rule
module: core
tags:
  - worker
  - bullmq
  - event-system
  - mods-pattern
---

# Worker BullMQ es CENTRALIZED en `event-worker.js` — handlers de mods viven dentro del worker base, NO como worker independiente

## What

UP1 expone **un solo worker BullMQ centralized** en `up1/object-manager/src/workers/event-worker.js`. Este worker:

- Procesa todos los eventos de todas las queues del monorepo (1 BullMQ Worker instance por queue, instanciado en loop estatico)
- NO tiene infraestructura de **workers per-mod** — los mods NO pueden declarar workers independientes corriendo en docker-compose
- NO tiene mecanismo de **auto-discovery** de handlers en `mods/<mod>/handlers/*.ts`

**3 patrones permitidos para que un mod inyecte logica de evento-handling**:

### Patron A — Handler dentro del worker base (toca core)

Modificar `event-worker.js` para invocar handler del mod via conditional logic:

```javascript
// up1/object-manager/src/workers/event-worker.js
import { changeLogHandler } from '../../../mods/curriculum-design/handlers/changeLogHandler'

async function processEvent(job) {
  const eventId = job.name
  if (eventId.startsWith('event:curriculum-design:')) {
    await changeLogHandler(job)
  }
  // ... otros handlers ...
}
```

**Pro**: Simple. Funciona inmediato. **Con**: toca `object-manager/` core (fuera de scope del mod) + acopla el worker base a mods especificos.

### Patron B — Service externo invocado via convencion

El worker base lee una convencion declarativa (ej. cada event JSON declara su handler:`'mod-name'/handlerPath`). `processEvent` resuelve y invoca:

```javascript
async function processEvent(job) {
  const eventDef = await loadEventDefinition(job.name)
  if (eventDef?.handler) {
    const { default: handler } = await import(eventDef.handler)
    return handler(job)
  }
}
```

**Pro**: Declarativo. **Con**: requiere convencion de schema en event JSON + cambio en core (mas pequeño que A pero igual toca).

### Patron C — Extender event-worker.js con auto-discovery (toca core, mas invasivo)

Auto-discovery de `mods/*/handlers/*.ts` exportados como modulos. **Pro**: ergonomia maxima. **Con**: toca core + complejidad de auto-discovery (lifecycle, deps, error isolation).

## Why

La arquitectura de UP1 prioriza un punto unico de procesamiento BullMQ para:

1. **Operacional simplicity**: 1 worker process en docker-compose, no N
2. **Backpressure unificada**: BullMQ gestiona concurrency + retry + dead letter centralmente
3. **Observability**: logs y metrics en un solo lugar

El trade-off: los mods NO pueden ser 100% autonomos en el handling de eventos. Requieren coordinacion con core (Patrones A/B/C). Esto **rompe parcialmente** el principio de "mod = self-contained" cuando hay logica event-driven (ej. HU2 audit en TICKET-020).

**Anti-patron** (NO HACER):

- Declarar un worker propio en `mods/<mod>/workers/foo-worker.js` + docker-compose entry → infra no existe; el container nunca se instancia
- Asumir que el `processEvent` del worker base invoca automaticamente algo en mods/ → falso, no hay auto-discovery
- Crear queue propia del mod (`queue: "curriculum-design"` en event JSON) esperando que un worker dedicado la consuma → BullMQ no instancia worker para queues sin declarar

## Where

- **Files**:
  - Worker centralized: `up1/object-manager/src/workers/event-worker.js`
  - Event JSONs del mod: `mods/<mod>/events/*.json` (declarativos, consumidos por el worker base)
- **Layers**: backend (worker + BullMQ infrastructure)

## When

Aplica cuando:

- Un mod requiere event-driven processing (HU2 audit, futuros mods con triggers async)
- Se evalua si la logica del mod debe vivir en `mods/<mod>/handlers/` (depende del Patron elegido) o en core
- Decision arquitectonica entre Patrones A/B/C (formalizar como DEC-LOCAL en el spec — OQ1 de TICKET-020)

## Verification

```bash
# Verificar inventario actual de workers
ls up1/object-manager/src/workers/
# Expected: event-worker.js (centralized)

# Verificar NO hay workers en mods
find up1/mods -name "*-worker.*" -type f
# Expected: 0 matches (a la fecha 2026-05-18)

# Verificar pattern auto-discovery no existe
grep -rn "auto-discovery\|discoverHandlers\|mods/.*handlers" up1/object-manager/src/workers/
# Expected: 0 matches → patron NO existe
```

## Source

- **Discovered in**: TICKET-020, Session 6 (intake-explore — research empirico)
- **Evidence**: Lectura de `up1/object-manager/src/workers/event-worker.js` confirma: 1 Worker BullMQ por queue, loop estatico de instanciacion, no auto-discovery por mod. `processEvent(job)` es generico y solo loguea (la logica de cada mod debe inyectarse). 0 mods existentes tienen workers propios. Refina H2 del intake del TICKET-020 (que asumia "worker propio del mod"). HU2 del TICKET-020 debe elegir entre Patrones A/B/C en design-feature (OQ1). Aprendizaje L17 del ticket
- **Related**: RULE-core-007 (Eventos via BullMQ — mutations triggean, workers procesan), RULE-core-013 (`_previousData` + `_triggeredBy` en eventos)
