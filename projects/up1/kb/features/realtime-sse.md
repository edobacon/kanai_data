---
id: SPEC-features-002
project: up1
type: spec
module: features
category: features
tags: [up1, sse, realtime, notifications, layout-refresh, academic-scheduling]
fecha: 2026-07-16
sources:
  - suite/server/api/notifications/stream.get.ts
  - suite/server/utils/sseClients.ts
  - suite/composables/useServerNotifications.ts
  - suite/server/api/realtime/push.post.ts
  - object-manager/src/graphql/resolvers/mods/academic-scheduling/runScenario.resolver.js
  - layout/src/layouts/RecordList.vue
  - suite/pages/[tenant_id].vue
---
# Realtime SSE de uP1: notificaciones y layout-refresh

## 1. TLDR

Un unico endpoint SSE (Server-Sent Events), autenticado con la sesion de Clerk, sirve dos flujos distintos sobre la misma conexion:

1. **Notificaciones persistentes**: evento `notification`, se guarda en el store y muestra un toast al usuario.
2. **Layout-refresh silencioso**: evento `layout-refresh`, no toca el store ni muestra nada, solo dispara un refetch en las vistas que esten escuchando ese `objectName`.

El endpoint es `suite/server/api/notifications/stream.get.ts`. No existe un segundo canal SSE ni un mecanismo alternativo de push: todo push en tiempo real (notificaciones o refresh de listas) pasa por aca.

## 2. Arquitectura

### Diagrama de flujo (layout-refresh)

```
Mod backend (ej. academic-scheduling)
   │
   │  fetch POST (fire-and-forget)
   ▼
suite/server/api/realtime/push.post.ts
   Auth: Bearer NOTIFICATIONS_API_KEY
   Body: { tenantId, objectName, ...ids }
   │
   │  fan-out a todos los streams del tenant
   ▼
suite/server/utils/sseClients.ts
   Map en memoria: streams registrados por {tenantId}:{userId}
   getTargetStreams(tenantId, userId | null)
   │
   ▼
suite/server/api/notifications/stream.get.ts
   Conexion SSE por usuario, evento 'layout-refresh'
   │
   ▼
suite/composables/useServerNotifications.ts
   EventSource('/api/notifications/stream')
   Escucha 'layout-refresh' -> redispatch como window CustomEvent('up1:layout-refresh')
   (sin tocar store, sin toast)
   │
   ▼
layout/src/layouts/RecordList.vue
   handleLayoutRefresh: listener global en onMounted
   Filtra por detail.objectName === props.objectName
   Si matchea -> fetchData(true)
```

El flujo de `notification` es identico hasta `sseClients.ts`, pero en el composable el evento `notification` si actualiza el store de notificaciones y dispara el toast (ademas de redisparar `up1:notification` como CustomEvent).

### Componentes

| Componente | Archivo | Responsabilidad |
|------------|---------|------------------|
| Endpoint SSE | `suite/server/api/notifications/stream.get.ts:1-55` | Autentica con Clerk (:18-25), registra el stream del cliente, emite heartbeat `ping` cada 30s (:40-46) |
| Registro en memoria | `suite/server/utils/sseClients.ts:1-56` | `Map` de streams activos; `getTargetStreams(tenantId, userId \| null)` resuelve destinatarios: un usuario puntual o todo el tenant (broadcast) |
| Composable cliente | `suite/composables/useServerNotifications.ts:1-106` | `EventSource` contra el endpoint; reconecta con backoff 3s/10s/30s; separa el manejo de `notification` (store + toast) del de `layout-refresh` (solo CustomEvent) |
| Receptor server-to-server | `suite/server/api/realtime/push.post.ts:1-58` | `POST /api/realtime/push`, autenticado con Bearer `NOTIFICATIONS_API_KEY`; recibe `{ tenantId, objectName, ...ids }` y hace fan-out del evento `layout-refresh` a los streams del tenant |
| Emisor (ejemplo real) | `object-manager/src/graphql/resolvers/mods/academic-scheduling/runScenario.resolver.js:27-44` | `publishScenarioRefresh`: fire-and-forget `fetch` al endpoint de push con `objectName: 'Scenario'`, nunca lanza error para no romper el callback del `SchedulingJob` |
| Consumo en UI | `layout/src/layouts/RecordList.vue:6640,6669-6674` | `handleLayoutRefresh` en `onMounted`; filtra por `detail.objectName === props.objectName` y llama `fetchData(true)` |
| Wiring en Suite | `suite/pages/[tenant_id].vue:178,189,502,536,594` | `initNotifications` / `disconnectNotifications` alrededor de `initialize()` de `ObjectManager` |

### Payload de `push.post.ts`

```json
{
  "tenantId": "UPU",
  "objectName": "Scenario",
  "scenarioId": "clx_scenario_001",
  "jobId": "clx_job_001"
}
```

`objectName` es el unico campo que el `RecordList` necesita para decidir si el evento le corresponde. El resto de las claves (`scenarioId`, `jobId`, etc.) son libres, a criterio del mod que emite.

## 3. Como emitir un refresh desde un mod nuevo

Patron de `publishScenarioRefresh` (`object-manager/src/graphql/resolvers/mods/academic-scheduling/runScenario.resolver.js:27-44`):

```javascript
// Fire-and-forget: nunca debe romper el flujo principal del resolver
async function publishScenarioRefresh({ tenantId, jobId, scenarioId }) {
  try {
    await fetch(`${process.env.SUITE_BASE_URL}/api/realtime/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NOTIFICATIONS_API_KEY}`,
      },
      body: JSON.stringify({
        tenantId,
        objectName: 'Scenario',
        jobId,
        scenarioId,
      }),
    })
  } catch (err) {
    // No relanzar: el push es best-effort, no debe interrumpir el callback del job
    console.error('Error publicando refresh de Scenario', err)
  }
}
```

Pasos para un mod nuevo:

1. Definir el `objectName` exacto que usa el layout objetivo (el mismo valor que `props.objectName` en el `RecordList` que quieres refrescar).
2. Armar el body minimo `{ tenantId, objectName, ...ids opcionales }`.
3. Hacer `fetch` hacia `SUITE_BASE_URL + /api/realtime/push` con `Authorization: Bearer NOTIFICATIONS_API_KEY`.
4. Envolver en try/catch sin relanzar: el push es fire-and-forget, nunca debe tumbar la mutation o el job que lo dispara.

No hace falta registrar nada en `events/` del mod ni tocar el sync: este mecanismo es independiente del sistema de eventos BullMQ/Redis del Flow Engine (ver `flow-engine.md`).

## 4. Nota de historia: diseno descartado

Antes de este diseno existio una primera version basada en Redis Pub/Sub con un SSE propio en el Object Manager:

- `object-manager/src/api/routes/events.js`
- `object-manager/src/api/sse/streamRegistry.js`
- `object-manager/src/api/sse/redisSubscriber.js`
- `suite/composables/useRealTime.ts`

Ese diseno fue eliminado el mismo dia en que se implemento (rama `feature/realtime-scenarios`, mergeada 2026-06-04 a 2026-06-08) y reemplazado por el HTTP push simple documentado arriba. Motivo: el push directo entre Object Manager y Suite cubre el caso de uso real (layout-refresh dirigido por tenant) sin la complejidad operativa de correr Redis Pub/Sub ademas de la que ya existe para el Flow Engine.

**No reintroducir Redis Pub/Sub ni un segundo endpoint SSE para este proposito.** Cualquier necesidad nueva de push en tiempo real deberia primero evaluar si encaja en el endpoint unico existente.

## 5. Limite conocido

El registro de streams (`sseClients.ts`) es un `Map` en memoria del proceso Nitro de Suite. Esto implica:

- **Single-instance**: no sobrevive un restart del proceso (los clientes se reconectan solos por el backoff del composable, pero pierden ningun evento emitido durante la caida).
- **No escala horizontalmente sin adaptar**: si Suite corre en mas de una instancia (por ejemplo detras de un load balancer con multiples tareas ECS), un push puede llegar a la instancia equivocada y el cliente conectado a otra instancia nunca lo recibe. El diseno final no tiene Redis (ni otro store compartido) detras del registro de streams.

Si se necesita escalar Suite horizontalmente, este es el punto a resolver primero (por ejemplo reintroduciendo un backend compartido solo para el fan-out, no para todo el sistema de eventos).

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: diseno final de Realtime SSE (notificaciones + layout-refresh), patron de emision para mods nuevos, historia del diseno Redis descartado, limite de escalabilidad conocido |
