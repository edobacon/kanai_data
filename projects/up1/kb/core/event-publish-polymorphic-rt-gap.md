---
id: SPEC-core-event-publish-rt-gap
project: up1
type: spec
module: core
category: object-manager
tags: [gap-note, up1, object-manager, events, withEventPublish, polymorphic, rt__, publishToChannel, publishTransitionEvent, mods, audit, changelog]
fecha: 2026-05-22
related_ticket: TICKET-020 (UPONE-1098 — HU2 changelog audit)
related_backlog:
  - B-pre-fetch-core-rt
  - B-publish-transition-context-inject
sources:
  - up1/mods/curriculum-design/logic/polymorphicUpdate.resolver.js
  - up1/mods/curriculum-design/logic/activity.resolver.js
  - up1/object-manager/src/graphql/resolvers/instance.resolver.js
  - up1/object-manager/src/events/decorators/withEventPublish.js
  - up1/object-manager/src/events/publishers/n8nPublisher.js
  - up1/object-manager/src/index.js (gap del context.publishTransitionEvent)
  - deckard projects/up1/tickets/ticket-020.md (L41, B-pre-fetch-core-rt, B-publish-transition-context-inject)
  - deckard projects/up1/specs/curriculum-design/SPEC-007-hu2-changelog-audit.md
---

# Event Publish + objetos `rt__` polimorficos — gap del platform y workaround mod-only

> Doc local del platform up1. **No se commitea ni pushea**. Captura hallazgos del codigo del core
> que aparecieron al implementar HU2 (audit log / tab Historial) en el mod `curriculum-design`.

## 1. Contexto del caso

El ticket [TICKET-020 / UPONE-1098](../../deckard/projects/up1/tickets/ticket-020.md) (SP3 — HU2 changelog audit) implemento el tab "Historial" sobre los objetos `activity`, `curricularSection` (con sus 7 record types polimorficos `rt__<X>__curricularsection`) y `curricularLink`. La captura del audit log es **event-driven**:

```
Mutation (con decorator withEventPublish)
  → diff previousData vs data
  → publish a Redis Pub/Sub (publishToChannel)
  → n8n flow (audit-capture.json)
  → resolver custom recordAuditEvent
  → 1..N filas en tabla changeLog
```

> **Actualizacion (UPONE-1380)**: el flujo de arriba describe el mecanismo vigente durante SP3
> (TICKET-020), cuando `changeLog` todavia era el destino de auditoria. Hoy la auditoria es
> **sincrona dentro del propio resolver**: `withEventPublish → withObjectAuth → withDataLog →
> resolver`, con escritura directa a `core_DataLog`. No hay n8n ni tabla `changeLog` en el camino
> de auditoria: ese mecanismo event-driven fue **retirado**. Evidencia:
> `object-manager/src/events/decorators/withDataLog.js:1-33`. Enlaza a
> `object-manager/docs/features/datalog.md`.

Al cerrar el ticket aparecieron **dos puntos del core** donde el flujo no se sostenia, y el mod tuvo que **replicar logica del core / cargar funciones del core via dynamic import** para no tocar `object-manager/` directo (constraint zero core touch para SP3).

## 2. Que se hizo en el mod

### 2.1. Override de `Mutation.updateInstance` para `rt__` polimorficos

- **Archivo creado**: `mods/curriculum-design/logic/polymorphicUpdate.resolver.js` (~280 lineas).
- **Estrategia**:
  1. Match `^rt__\w+__curricularsection$` en `objectType`.
  2. Pre-fetch del registro base + relacion al `rt__` via `include` → flatten = `previousData`.
  3. **Replica de la logica generic `rt__`** del platform (`instance.resolver.js:2827-2925`):
     split de fields en `base/rt__/ext/baseExt` + update del base + upserts.
  4. Publish manual via `publishToChannel` con `_previousData` en el envelope.
- **Fallback**: si `objectType` NO matchea el patron, delega al generic via `dynamic import` con
  dual-candidate paths:
  - `../../instance.resolver.js` (path synced en object-manager)
  - `../../../object-manager/src/graphql/resolvers/instance.resolver.js` (source path del mod en dev)
- **Por que gana el override**: `object-manager/src/graphql/resolvers/resolverIndex.js:114`
  hace `...dynamicResolvers.mutations` AL FINAL del bloque `Mutation` — los mods sobrescriben
  el generic para keys que coinciden.

### 2.2. Carga dinamica de `publishToChannel` para coordinar transitions

- **Archivos en el mod**:
  - `polymorphicUpdate.resolver.js:80-95` — publish del update polimorfico.
  - `activity.resolver.js:30-57` — flujo StateTransition (`transitionActivityValidated` de HU3).
- **Funcion cargada**: `publishToChannel` desde `object-manager/src/events/publishers/n8nPublisher.js:123`.
- **Estrategia (activity.resolver)**:
  1. Intenta usar `context.publishTransitionEvent` (patron canonico HU3 documentado en REQ-COORD-3).
  2. Si el inject no esta (gap del platform), carga `publishToChannel` via dynamic import y publica
     al canal `core` directo.
- **Cache singleton** para no repetir el import cada call.

## 3. Por que se hizo asi

### 3.1. Gap #1 — `withEventPublish` no hace pre-fetch para `rt__`

`object-manager/src/events/decorators/withEventPublish.js` resuelve `previousData` haciendo
`prisma[model].findUnique({ where: { id } })` sobre el modelo cuyo nombre coincide con `objectType`.

Para los objetos `rt__<X>__curricularsection` el modelo Prisma generado **no tiene `id` standalone** —
la PK es compuesta sobre la relacion al base `CurricularSection`. El `findUnique({ where: { id } })`
falla / retorna `null`, y el publish viaja **sin `_previousData`**.

Sin `_previousData`, el resolver `recordAuditEvent` no puede hacer diff field-by-field → **cero rows
en `changeLog`** para todos los updates de currier polimorfico (LearningOutcome / Modality / etc.).

El fix canonico hay que hacerlo en el core (ver seccion 5.1). En SP3 no se podia tocar — entonces
el mod se hizo cargo via override + pre-fetch propio.

### 3.2. Gap #2 — `context.publishTransitionEvent` nunca se inyecto

`object-manager/src/index.js` arma el GraphQL context que ven los resolvers, pero **no inyecta
`publishTransitionEvent`** (gap arrastrado desde HU3 UPONE-1052). El comentario interno en
`activity.resolver.js:195-200` lo deja documentado:

```js
// El resolver transitionActivityValidated esperaba context.publishTransitionEvent
// como patron canonico — el inject nunca se completo en object-manager/src/index.js.
```

Sin ese inject, las transitions runtime que viajan por el resolver coordinator del mod **no publican
al canal Pub/Sub** → el flow n8n `audit-capture` no recibe el evento StateTransition → la fila
correspondiente nunca se inserta en `changeLog` → TC-22 falla.

Mismo constraint (zero core touch) → fallback en el mod con dynamic import directo del publisher.

> **Nota de separacion (UPONE-1380)**: los parrafos de 3.1 y 3.2 que mencionan `changeLog` describen
> el sintoma tal como se diagnostico en TICKET-020 (SP3). Hoy `changeLog` ya no existe y la
> auditoria pasa por `core_DataLog` via el decorator `withDataLog`, que **normaliza el alias**
> `rt__<RT>__<base>` (`resolveBaseObjectType`, `withDataLog.js:110-148`); por eso el gap #1 **ya no
> afecta a la auditoria**: el override del mod llama `recordMutationDataLog` explicitamente
> (`polymorphicUpdate.resolver.js:172-197,487-497`) para cubrir el path que no pasa por el decorator
> generico.
>
> El gap de pre-fetch para `rt__` **sigue existiendo**, pero unicamente en
> `withEventPublish.js:53-61`, que alimenta el sistema de EVENTOS genericos (Pub/Sub → n8n) para
> mods que quieran hooks externos: un problema distinto, ya no ligado a la auditoria. Ver
> `object-manager/docs/features/datalog.md`.

## 4. Como afecta a futuros mods / objetos similares

### 4.1. Cualquier mod con objetos `rt__` que quiera audit log (o cualquier hook event-driven sobre updates)

El gap del decorator **no es exclusivo de `curriculum-design`**. Aplica a **todos los objetos
polimorficos con record types** que el platform define como `rt__<X>__<baseLower>`. Hoy hay
precedentes en HU3 (`workflowTransitionHistory`), y futuras HUs / mods que toquen instancias
polimorficas (booking, competencyNode, etc.) se van a topar con el mismo problema.

**Senales para detectar que estas en este caso**:

- El objeto tiene `recordTypes` (Salesforce-style metadata).
- Las mutations contra ese objeto viajan por `Mutation.updateInstance` con `objectType="rt__..."`.
- Querias capturar diff field-by-field via event-driven (audit log, sync externo, webhook, etc.).
- Empiricamente: el payload Pub/Sub llega con `_previousData: null` o falta el envelope completo.

**Patron a replicar (hasta que llegue el fix de core)**:

1. Crear `mods/<mod>/logic/polymorphicUpdate.resolver.js` que matchee el patron de `objectType`
   relevante para ese mod.
2. Pre-fetchear via base + include del rt__.
3. Replicar el split base/rt__/ext/baseExt (logica generic de `instance.resolver.js:2827-2925`).
4. Publish manual via `publishToChannel` con `_previousData` poblado.
5. Fallback a delegate generic via dynamic import dual-candidate.
6. **NO** delegar al generic Y hacer publish propio (doble evento → duplicados en el consumer).
7. Documentar la fragilidad del wrapper (sync manual vs generic si este cambia).

### 4.2. Cualquier mod con transition coordinators custom

Mismo patron, mismo fallback: intentar `context.publishTransitionEvent` primero, si no esta,
cargar `publishToChannel` via dynamic import dual-candidate y publicar al canal `core` directo.

### 4.3. Costos colaterales que hereda quien copie el patron

- **Sync manual de la logica replicada**: si el generic `instance.resolver.js` cambia el shape de
  upserts, el wrapper del mod queda desincronizado en silencio. Mitigacion minima: test smoke en
  cada mod que compara shape de la response generic vs wrapper para un caso conocido (lo hace
  HU2 en S13.T7 — patron heredable).
- **Dual-candidate paths fragiles**: si el sync de up1 cambia la ubicacion relativa entre
  `mods/<mod>/logic/` y `object-manager/src/graphql/resolvers/`, los `new URL(..., import.meta.url)`
  rompen. Mantener los candidatos actualizados con la convencion del platform.
- **No hay tipos compartidos**: el envelope que produce el wrapper tiene que matchear 1:1 el
  envelope del decorator. Cualquier campo nuevo que el decorator agregue (ej. tracing headers)
  hay que portarlo a mano.

## 5. Fixes canonicos en el core que resolverian la fragilidad

### 5.1. Fix del decorator `withEventPublish.js` (resuelve el gap #1)

**Archivo**: `object-manager/src/events/decorators/withEventPublish.js:56` (o donde resuelva el
pre-fetch hoy).

**Cambio propuesto**:

```js
// Pseudocode — detectar rt__ pattern y resolver via base
if (/^rt__\w+__\w+$/.test(objectType)) {
  const { baseObjectLower, rtObject } = parseRecordTypeFileName(objectType);
  const baseModel = capitalize(baseObjectLower); // o el mapper que usa el codegen
  previousData = await prisma[baseModel].findUnique({
    where: { id: args.id },
    include: { [rtObject]: true },
  });
  // flatten base + rt__ a un solo objeto para el diff downstream
  previousData = flattenRtRecord(previousData);
} else {
  previousData = await prisma[objectType].findUnique({ where: { id: args.id } });
}
```

**Consecuencias**:

- Elimina la necesidad del wrapper en TODOS los mods con objetos `rt__`.
- El mod `curriculum-design` puede borrar `polymorphicUpdate.resolver.js` completo y dejar que
  el generic + decorator manejen el flow.
- Aplica retroactivo a HU3 + cualquier futura HU polimorfica.

**Reversibilidad**: alta — es un branch en el decorator. Si rompe algun consumer, revertir con
feature flag o `git revert`.

**Tests minimos**:

- Update sobre `rt__<X>__curricularsection` produce evento Pub/Sub con `_previousData` poblado
  (smoke con `redis-cli psubscribe`).
- Update sobre objeto NO polimorfico sigue funcionando igual (regresion).

### 5.2. Inject de `publishTransitionEvent` en el GraphQL context (resuelve el gap #2)

**Archivo**: `object-manager/src/index.js` (donde se arma el context de Apollo Server).

**Cambio propuesto**:

```js
// En el factory del context
context: async ({ req }) => ({
  // ...resto del context actual
  publishTransitionEvent: async (args) =>
    publishToChannel({ ...args, queueName: 'core' }),
});
```

**Consecuencias**:

- Revierte el fallback del mod (eliminar `loadPublishToChannel` de `activity.resolver.js` y
  cambiar el call a `context.publishTransitionEvent`).
- Cierra el patron canonico que HU3 ya esperaba.
- Cualquier mod con transition coordinator custom usa el inject sin saber de la implementacion.

**Reversibilidad**: trivial — agregar / quitar una key del context.

**Tests minimos**:

- Smoke de una transition runtime → row StateTransition aparece en `changeLog` sin tocar el
  fallback.
- Health check del context en los tests integration de HU3.

### 5.3. Opcional — utility helper compartido para mods que aun necesiten override

Aun con los dos fixes anteriores, podrian aparecer casos donde un mod legitimamente quiera
**interceptar el flow de update** antes/despues del generic (ej. validaciones cross-mod, hooks
mas complejos que un simple event). Para esos casos, el core podria exportar:

```js
// object-manager/src/graphql/resolvers/instance.resolver.js
export const instanceMutation = {
  updateInstance: async (parent, args, context) => { /* logica actual */ },
  // helpers que mods pueden invocar sin re-implementar
  splitRtFields,
  upsertRtRecord,
  flattenRtRecord,
};
```

Esto convierte el dynamic import dual-candidate en un import normal — el mod no replica logica,
solo orquesta.

**Reversibilidad**: alta. Si se rechaza, los mods pueden seguir con el patron actual.

## 6. Lineamientos operativos hasta que aterricen los fixes de core

| Situacion | Patron a aplicar | Backlog que cubre el fix definitivo |
|-----------|------------------|--------------------------------------|
| Mod nuevo con objetos `rt__` y necesidad de audit / event hooks | Override + dynamic import (seccion 4.1) | `B-pre-fetch-core-rt` |
| Mod nuevo con transition coordinator custom y event publish | Fallback con `publishToChannel` (seccion 4.2) | `B-publish-transition-context-inject` |
| Mod nuevo que solo necesita event hooks sobre objetos NO polimorficos | El decorator funciona OK — usar event JSONs declarativos sin wrapper | — |
| Mod con override existente cuando el core agregue el fix | Borrar wrapper + delegar al generic + remover fallback | — |

**Senal para escalar a ticket de platform**: si en SP4+ un tercer mod tiene que replicar el mismo
patron, dejar de hacer workaround mod-only y abrir el ticket de core para los dos fixes (5.1 + 5.2).
La deuda transversal supera el costo del touch.

## 7. Referencias cruzadas

- Ticket origen: `deckard/projects/up1/tickets/ticket-020.md` — Learn L41, backlog items
  `B-pre-fetch-core-rt` y `B-publish-transition-context-inject`.
- Spec del ticket: `deckard/projects/up1/specs/curriculum-design/SPEC-007-hu2-changelog-audit.md`.
- Patron heredado del dynamic import dual-candidate: `mods/ai-agent/logic/tools/updateInstanceTool.js`.
- Doc del platform sobre eventos: `up1/object-manager/docs/features/event-system.md`.
- Doc del platform sobre custom resolvers: `up1/object-manager/docs/guides/custom-resolvers.md`.
