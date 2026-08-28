---
id: SPEC-features-001
project: up1
type: doc
module: features
tags:
  - up1
  - flow
  - n8n
  - workflows
  - eventos
  - redis
  - bullmq
  - nodos-custom
  - pubsub
  - notificaciones
  - email
  - integraciones
  - async
---

# Flow Engine (n8n) de uP1 — Guia completa

## Indice

1. [Que es el Flow Engine](#1-que-es-el-flow-engine)
2. [Arquitectura](#2-arquitectura)
3. [Sistema de eventos: Object Manager → Redis → n8n](#3-sistema-de-eventos-object-manager--redis--n8n)
4. [Definir eventos en un mod](#4-definir-eventos-en-un-mod)
5. [Nodos custom de uP1](#5-nodos-custom-de-up1)
6. [Crear workflows en n8n](#6-crear-workflows-en-n8n)
7. [Flow Sync: sincronizar workflows desde mods](#7-flow-sync-sincronizar-workflows-desde-mods)
8. [Session Bridge: acceso transparente a n8n](#8-session-bridge-acceso-transparente-a-n8n)
9. [Worker BullMQ](#9-worker-bullmq)
10. [Setup local](#10-setup-local)
11. [Variables de entorno](#11-variables-de-entorno)
12. [Ejemplos reales](#12-ejemplos-reales)
13. [Como un mod usa el Flow Engine](#13-como-un-mod-usa-el-flow-engine)
14. [Troubleshooting](#14-troubleshooting)
15. [Aislamiento multi-tenant y licencia (UPONE-1568)](#15-aislamiento-multi-tenant-y-licencia-upone-1568)

---

## 1. Que es el Flow Engine

Motor de **workflows asincronicos** basado en un fork custom de [n8n](https://n8n.io/). Permite definir automatizaciones visuales que reaccionan a cambios de datos, programan tareas, envian notificaciones y conectan con servicios externos.

### Para que sirve

| Caso de uso | Ejemplo |
|------------|---------|
| **Reaccionar a cambios de datos** | Cuando un estudiante se inscribe → enviar notificacion |
| **Tareas programadas** | Cada dia a las 9 AM → recordatorio de check-in |
| **Notificaciones multi-canal** | In-app, email (AWS SES), WhatsApp, Telegram |
| **Integraciones externas** | Conectar con APIs, webhooks, bases de datos |
| **Procesamiento asincrono** | Calculos pesados que no bloquean la UI |
| **Orquestacion de procesos** | Workflow de aprobacion, flujos multi-paso |

### Stack

```
n8n 2.7.0 (fork custom) + PostgreSQL + Redis + Node.js 22.16
```

---

## 2. Arquitectura

### Posicion en uP1

```text
                                                     ┌──────────────────┐
                                    ┌──────────────>  │  Up1Notification │
                                    │                 └──────────────────┘
  ┌───────┐  GraphQL   ┌───────────────────┐          ┌──────────────────┐
  │ Suite │──mutation─>│  Object Manager   │          │  Up1FormObject   │
  └───────┘            └──────┬────────────┘     ┌──> └──────────────────┘
                              │                  │    ┌──────────────────┐
                    withEventPublish()            ├──> │   HTTP Request   │
                              │                  │    └──────────────────┘
               ┌──────────────┴──────────────┐   │    ┌──────────────────┐
               ▼                             ▼   │    │  700+ nodos n8n  │
      ┌─────────────────┐         ┌──────────────┐└──> └──────────────────┘
      │   BullMQ Queue  │         │ Redis Pub/Sub│
      └────────┬────────┘         └──────┬───────┘
               ▼                         ▼
          ┌────────┐           ┌──────────────────┐
          │ Worker │           │  n8n/Flow Engine  │──┘
          └────────┘           └──────────────────┘
```

### Dos canales de comunicacion

| Canal | Mecanismo | Uso |
|-------|-----------|-----|
| **BullMQ** | Queue en Redis | Procesamiento interno (worker). Solo si hay evento de mod definido |
| **Redis Pub/Sub** | Publish/Subscribe | Comunicacion con n8n. **Siempre** se publica (todo mutation GraphQL) |

El decorator `withEventPublish()` publica en **ambos** canales despues de cada mutation GraphQL.

### Formato del canal Redis Pub/Sub

```
{tenantId}/{objectType}/{domain}:{operation}
```

Ejemplos:

```
UPU/OfferingEnrollment/engagement:create
UPU/HwAssessment/hello-world:create
UPU/Person/core:update
```

- `tenantId`: del header X-Tenant-ID
- `objectType`: nombre del objeto (PascalCase)
- `domain`: nombre del mod (de `app.json → name`) o `'core'` si no hay evento de mod
- `operation`: `create`, `update`, `delete`

---

## 3. Sistema de eventos: Object Manager → Redis → n8n

### Flujo completo

```
1. Frontend ejecuta mutation GraphQL
   mutation { createInstance(objectType: "OfferingEnrollment", data: {...}) }

2. Object Manager ejecuta el resolver
   → Prisma crea el registro en BD

3. withEventPublish() decorator se activa:
   a. Busca evento registrado: getEventForTrigger("OfferingEnrollment", "create", "UPU")
   b. Si encuentra evento de mod:
      - Evalua condicion (si existe)
      - Filtra payload con includeFields
      - Encola en BullMQ: queue "engagement", prioridad y attempts del JSON
   c. SIEMPRE publica en Redis Pub/Sub:
      - Canal: UPU/OfferingEnrollment/engagement:create
      - Payload: { type, tenantId, userId, timestamp, objectType, operation, domain, data }

4. n8n recibe via Redis Pub/Sub:
   - Up1EventCreate node suscrito a canal OfferingEnrollment/engagement:create
   - Valida mensaje, filtra por domain
   - Pasa al siguiente nodo del workflow

5. Worker BullMQ recibe (si hay evento):
   - Procesa job de la queue "engagement"
   - Ejecuta logica de negocio (TODO: webhooks)
```

### Payload del mensaje

```json
{
  "type": "up1:event",
  "tenantId": "UPU",
  "userId": "user-123",
  "timestamp": "2026-04-10T15:30:00Z",
  "objectType": "OfferingEnrollment",
  "operation": "create",
  "domain": "engagement",
  "data": {
    "id": "clx_enrollment_001",
    "eventId": "clx_event_001",
    "userId": "user-456",
    "status": "CONFIRMED",
    "_triggeredBy": { "userId": "user-123", "email": "admin@universidad.cl" }
  }
}
```

---

## 4. Definir eventos en un mod

### Estructura del JSON

```json
// mods/mi-mod/events/mi-evento.json
{
  "id": "miobjeto:created",
  "description": "Se dispara al crear un registro de MiObjeto",
  "trigger": {
    "objectType": "MiObjeto",
    "operation": "create",
    "condition": "data.status === 'ACTIVE'"
  },
  "includeFields": ["id", "name", "status", "createdAt"],
  "priority": 5,
  "attempts": 3
}
```

| Campo | Requerido | Descripcion |
|-------|-----------|-------------|
| `id` | Si | Identificador unico. Convencion: `{objeto}:{accion}` |
| `description` | No | Descripcion legible |
| `trigger.objectType` | Si | Objeto que dispara el evento |
| `trigger.operation` | Si | `create`, `update`, `delete` |
| `trigger.condition` | No | Expresion JS evaluada contra `data`. Si es falsa, no se encola |
| `includeFields` | No | Campos a incluir en el payload. Sin este campo, se envia todo |
| `priority` | No | Prioridad BullMQ (1 = maxima, default: 5) |
| `attempts` | No | Reintentos ante fallo (default: 3) |

### Tipos de evento

**Sin condicion** — se dispara en toda operacion:

```json
{
  "id": "hwintervention:created",
  "trigger": { "objectType": "HwIntervention", "operation": "create" },
  "includeFields": ["id", "title", "status", "hwAssessmentId"],
  "priority": 2
}
```

**Con condicion en create** — solo si el registro nuevo cumple:

```json
{
  "id": "hwassessment:high_risk",
  "trigger": {
    "objectType": "HwAssessment",
    "operation": "create",
    "condition": "data.riskLevel === 'HIGH'"
  },
  "includeFields": ["id", "studentId", "riskScore", "riskLevel"],
  "priority": 1
}
```

**Con condicion en update** — solo si la actualizacion cumple:

```json
{
  "id": "hwintervention:completed",
  "trigger": {
    "objectType": "HwIntervention",
    "operation": "update",
    "condition": "data.status === 'COMPLETED'"
  },
  "includeFields": ["id", "title", "status", "completedAt"],
  "priority": 3
}
```

### Donde se almacenan

```
mods/{mod}/events/*.json → npm run sync → object-manager/events/ (cargados por eventLoader)
```

El `eventLoader` lee el `app.json` del mod para obtener el `queueName` (el campo `name` del app.json).

---

## 5. Nodos custom de uP1

n8n viene con 700+ integraciones builtin. uP1 agrega **6 nodos custom** para integracion directa con la plataforma.

### Up1EventTrigger — Trigger generico Redis

Suscripcion a canal Redis Pub/Sub con soporte para wildcards.

```
Configuracion:
  - Channel: "UPU/OfferingEnrollment/engagement:create"
  - O con wildcard: "UPU/*/engagement:*" (pSubscribe)
  - Domain Filter: "engagement" (filtra post-receive)
  
Output dual:
  - Valid: mensajes que pasan validacion
  - Invalid: mensajes mal formados
```

### Up1EventCreate / Up1EventUpdate / Up1EventDelete — Triggers CUD

Triggers especificos por operacion con UI simplificada:

```
Configuracion:
  - Tenant ID: "UPU" (dropdown)
  - Object Type: "OfferingEnrollment" (dropdown dinamico desde pg_catalog)
  - Domain: "engagement" (dropdown: all/core/engagement/flow-viewer/...)
```

Cuando `domain=all` → usa `pSubscribe` con patron `{tenantId}/{objectType}/*:{operation}` para capturar eventos de todos los mods.

### Up1Notification — Notificaciones multi-canal

Envia notificaciones por multiples canales:

| Canal | Mecanismo | Configuracion |
|-------|-----------|--------------|
| In-App | POST a Suite push endpoint | `SUITE_URL` + `NOTIFICATIONS_API_KEY` |
| Email | AWS SES | Credencial `aws` |
| WhatsApp | Business API | Credencial `whatsappBusinessApi` |
| Telegram | Bot API | Credencial `telegramApi` |

Dos modos:
- **Manual**: seleccionar canales directamente
- **Preferences**: buscar preferencias del usuario via GraphQL (`NotificationPreference`)

```
Configuracion:
  - Operation: "send"
  - Mode: "manual"
  - Channels: ["inapp", "email"]
  - Title: "Inscripcion Confirmada"
  - Message: "Tu inscripcion al evento ha sido registrada"
  - Notification Type: "info" | "success" | "warning" | "error"
  - Broadcast: true (todos los usuarios) | false (usuario especifico)
```

### Up1FormObject — CRUD directo a BD

Operaciones CRUD directas sobre tablas PostgreSQL de uP1 (no GraphQL, sino SQL directo):

```
Operaciones:
  - List: SELECT con filtros
  - Read: SELECT por ID
  - Create: INSERT
  - Update: UPDATE por ID
  
Configuracion:
  - Table: dropdown dinamico desde pg_catalog
  - Columns: dropdown dinamico
  - Filters: field, operator, value
```

### Up1SendEmail — Email via AWS SES

```
Operaciones:
  - send: email plain/HTML
  - sendTemplate: email con template SES y variables
  
Configuracion:
  - From: "noreply@universidad.cl"
  - To: lista de destinatarios
  - Subject / Body / Template Name / Variables
```

---

## 6. Crear workflows en n8n

### Acceso

```
http://localhost:5678
```

### Proceso

1. Abrir n8n editor
2. Crear workflow: click "+" o "Create Workflow"
3. Agregar nodos: drag-and-drop desde panel lateral
4. Conectar nodos: arrastrar las salidas a las entradas
5. Configurar cada nodo con sus parametros
6. Activar workflow (toggle ON)
7. Probar: ejecutar manualmente o esperar trigger

### Ejemplo: workflow de notificacion ante inscripcion

```
[Up1EventCreate] ──→ [Up1Notification]
   │                      │
   │ Config:              │ Config:
   │ tenantId: UPU        │ operation: send
   │ objectType:          │ channels: [inapp]
   │   OfferingEnrollment │ title: "Inscripcion Confirmada"
   │ domain: engagement   │ message: "Nueva inscripcion registrada"
```

### Exportar workflow como JSON

1. Menu → Download (o `GET /rest/workflows/:id`)
2. Limpiar campos auto-generados: `id`, `createdAt`, `updatedAt`, `versionId`
3. Guardar en `mods/{mod}/flows/{nombre}.json`
4. `npm run sync` → Phase 9 sube a n8n

---

## 7. Flow Sync: sincronizar workflows desde mods

### Como funciona (Phase 9 del sync)

```
1. Escanea mods/*/flows/*.json
2. Valida cada archivo (name, nodes, connections)
3. Autentica via session bridge (N8N_ADMIN_EMAIL/PASSWORD)
4. Fetch workflows existentes en n8n
5. Por cada archivo:
   a. Tag estable: settings.up1Source = "{mod}/{file}"
   b. Match: primero por up1Source, luego por nombre
   c. Si existe → PATCH (update)
   d. Si no existe → POST (create)
6. Share con tenant member project (visibilidad para no-admins)
```

### Rename safety

`up1Source` es un identificador estable. Se puede renombrar un workflow (cambiar `name`) sin crear duplicado.

### Sync standalone

```bash
# Solo flows (sin las otras 8 fases)
npm run sync:flows --workspace=@uplanner/object-management-backend

# O directamente
node object-manager/scripts/sync/flowSync.js [--verbose]
```

### Formato del JSON de flow

```json
{
  "name": "[MiMod] Nombre del Workflow",
  "nodes": [
    {
      "name": "Nombre del Nodo",
      "type": "n8n-nodes-base.tipo",
      "typeVersion": 1,
      "position": [0, 0],
      "parameters": { ... }
    }
  ],
  "connections": {
    "Nombre del Nodo": {
      "main": [[{ "node": "Siguiente Nodo", "type": "main", "index": 0 }]]
    }
  },
  "settings": { "executionOrder": "v1" }
}
```

**Convenciones:**
- Nombre: prefijo `[NombreMod]` (ej: `[Wellbeing] Daily Check-in`)
- Archivo: kebab-case (ej: `daily-checkin-reminder.json`)
- No incluir `id`, `createdAt`, `updatedAt`, `versionId`

---

## 8. Session Bridge: acceso transparente a n8n

Los usuarios de uP1 acceden a n8n sin crear cuenta en n8n. El Object Manager hace de intermediario:

```
1. Usuario en Suite hace click en "Flow Engine"
2. Suite llama GraphQL: query { getFlowSession }
3. Object Manager llama n8n REST: POST /rest/login
   (con N8N_ADMIN_EMAIL / N8N_ADMIN_PASSWORD)
4. n8n retorna cookie de sesion
5. Object Manager cachea cookie (5 min de margen antes de expirar)
6. Retorna cookie al frontend
7. Frontend redirige a n8n con la cookie → acceso directo
```

---

## 9. Worker BullMQ

### Que es

Proceso separado que consume jobs de las queues BullMQ. Es independiente del Object Manager y de n8n.

### Que hace

```javascript
// object-manager/src/workers/event-worker.js
1. Verifica Redis disponible
2. loadQueues() — carga queues de todos los mods
3. loadEvents() — carga eventos de todos los mods
4. Crea Worker BullMQ por cada queue (concurrency: 5)
5. processEvent(job) — procesa cada job
6. Graceful shutdown con SIGTERM/SIGINT
```

### Como ejecutar

```bash
docker compose --profile worker up -d
```

### Diferencia Worker vs n8n

| Aspecto | Worker (BullMQ) | n8n (Redis Pub/Sub) |
|---------|----------------|---------------------|
| Canal | BullMQ Queue | Redis Pub/Sub channel |
| Garantia | At-least-once (reintentos) | At-most-once (fire & forget) |
| Cuando se usa | Si hay evento de mod definido | Siempre (todo mutation) |
| Persistencia | Jobs persisten en Redis | Mensajes se pierden si nadie escucha |
| Backpressure | Si (BullMQ gestiona) | No |
| Prioridad | Si (del evento JSON) | No |

---

## 10. Setup local

### Prerequisitos

- Node.js 22.16+
- pnpm 10.22+
- PostgreSQL local
- Redis local o via Docker

### Levantar n8n

```bash
# Opcion 1: Docker (recomendado)
docker compose --profile flow up -d
# n8n en http://localhost:5678

# Opcion 2: Desarrollo local
cd flow
pnpm install
pnpm build
pnpm start
```

### Levantar worker

```bash
docker compose --profile worker up -d
```

### Levantar Redis (si no usa Docker compose)

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Verificar conexion

1. Abrir http://localhost:5678 — editor n8n
2. Crear workflow de prueba con `Up1EventCreate`
3. Ejecutar mutation GraphQL en Object Manager
4. Verificar que n8n recibe el evento

---

## 11. Variables de entorno

### En Object Manager (.env)

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Host Redis | `localhost` |
| `REDIS_PORT` | Puerto Redis | `6379` |
| `REDIS_PASSWORD` | Contrasena Redis | — |
| `REDIS_TLS` | Habilitar TLS | `true` (prod) |
| `N8N_BASE_URL` | URL de n8n | `http://localhost:5678` |
| `N8N_ADMIN_EMAIL` | Email del admin n8n | — |
| `N8N_ADMIN_PASSWORD` | Password del admin n8n | — |
| `UP1_FLOW_SERVICE_TOKEN` | Token de servicio (bypass RBAC) | — |

### En Flow/n8n (docker-compose o .env)

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `N8N_PORT` | Puerto HTTP | `5678` |
| `N8N_ENCRYPTION_KEY` | Clave cifrado credenciales | Auto |
| `DB_TYPE` | Tipo BD | `postgresdb` |
| `DB_POSTGRESDB_HOST` | Host PostgreSQL | `localhost` |
| `DB_POSTGRESDB_DATABASE` | BD de n8n | `flow-engine` |
| `REDIS_HOST` | Host Redis (para nodos Up1Event) | `localhost` |
| `REDIS_PORT` | Puerto Redis | `6379` |
| `SUITE_URL` | URL de Suite (para notificaciones) | — |
| `GRAPHQL_ENDPOINT` | URL GraphQL Object Manager | — |
| `TENANT_ID` | Tenant por defecto | `UPU` |

---

## 12. Ejemplos reales

### Ejemplo 1: Notificacion de inscripcion (retention-wellbeing)

```json
{
  "name": "[Wellbeing] Enrollment Event Handler",
  "nodes": [
    {
      "name": "UP1 Event Create",
      "type": "n8n-nodes-base.up1EventCreate",
      "parameters": {
        "tenantId": "UPU",
        "objectType": "OfferingEnrollment",
        "domain": "engagement"
      }
    },
    {
      "name": "UP1 Notification",
      "type": "n8n-nodes-base.up1Notification",
      "parameters": {
        "operation": "send",
        "channels": ["inapp"],
        "title": "Enrollment Confirmed",
        "message": "A new enrollment was created."
      }
    }
  ],
  "connections": {
    "UP1 Event Create": {
      "main": [[{ "node": "UP1 Notification", "type": "main", "index": 0 }]]
    }
  }
}
```

**Flujo**: alumno se inscribe → mutation createInstance → withEventPublish → Redis Pub/Sub → n8n Up1EventCreate → Up1Notification in-app.

### Ejemplo 2: Recordatorio diario (retention-wellbeing)

```json
{
  "name": "[Wellbeing] Daily Check-in Reminder",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "cronExpression", "expression": "0 9 * * 1-5" }]
        }
      }
    },
    {
      "name": "UP1 Notification",
      "type": "n8n-nodes-base.up1Notification",
      "parameters": {
        "operation": "send",
        "channels": ["inapp"],
        "title": "Daily Wellbeing Check-in",
        "message": "Take a moment to log how you're feeling today.",
        "inappBroadcast": true
      }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [[{ "node": "UP1 Notification", "type": "main", "index": 0 }]]
    }
  }
}
```

**Flujo**: cron a las 9 AM lunes-viernes → broadcast in-app a todos los usuarios.

### Ejemplo 3: Alerta de riesgo alto (hello-world-mod)

```json
// Evento: mods/hello-world-mod/events/hw-assessment-high.json
{
  "id": "hwassessment:high_risk",
  "trigger": {
    "objectType": "HwAssessment",
    "operation": "create",
    "condition": "data.riskLevel === 'HIGH'"
  },
  "includeFields": ["id", "studentId", "riskScore", "riskLevel", "recommendations"],
  "priority": 1,
  "attempts": 3
}
```

Este evento solo se dispara si `riskLevel === 'HIGH'`. Priority 1 = maxima urgencia. Un workflow n8n podria escuchar este canal y enviar email al coordinador.

---

## 13. Como un mod usa el Flow Engine

### Nivel 1: Solo eventos (sin workflow n8n)

Definir JSONs en `events/` del mod. El Object Manager los publica automaticamente en Redis Pub/Sub. Cualquier workflow n8n puede escucharlos.

```
mods/mi-mod/events/mi-evento.json → npm run sync → eventLoader carga
→ withEventPublish() publica en Redis Pub/Sub ante cada mutation
```

**No necesitas crear un workflow.** Solo con el evento definido, el dato se publica. Otros mods o workflows externos pueden consumirlo.

### Nivel 2: Eventos + workflow n8n

Ademas de eventos, crear workflows en `flows/` del mod:

```
mods/mi-mod/
├── events/
│   └── mi-evento.json        ← Que escuchar
└── flows/
    └── mi-workflow.json       ← Que hacer al escuchar
```

`npm run sync` sincroniza ambos: eventos al Object Manager, workflows a n8n.

### Nivel 3: Workflow sin evento (cron, webhook, manual)

Un workflow no necesita un evento de mod. Puede usar triggers builtin de n8n:

| Trigger | Uso |
|---------|-----|
| Schedule Trigger | Tareas programadas (cron) |
| Webhook | Recibir llamadas HTTP externas |
| Manual Trigger | Ejecucion manual desde n8n |
| Up1EventTrigger | Escuchar cualquier canal Redis (wildcards) |

### Patron recomendado

```
1. Definir evento en events/ (si reacciona a datos de uP1)
2. Disenar workflow en n8n editor (visual)
3. Exportar JSON, limpiar, guardar en flows/
4. npm run sync
5. Verificar en n8n que el workflow aparece
```

### Queue name del mod

El `name` del `config/app.json` del mod se usa como `domain` en el canal Redis:

```json
// config/app.json
{ "name": "engagement" }
```

Canal resultante: `UPU/OfferingEnrollment/engagement:create`

En n8n, el nodo Up1EventCreate filtra por este domain.

---

## 14. Troubleshooting

| Problema | Causa | Solucion |
|----------|-------|----------|
| Evento no llega a n8n | Redis no corriendo | `docker compose up redis` |
| Evento no llega a n8n | Workflow no activado | Activar toggle ON en n8n editor |
| Evento no llega a n8n | Canal incorrecto | Verificar tenantId + objectType + domain + operation |
| Phase 9 se salta | `SKIP_DB_OPERATIONS=true` o n8n no corriendo | Verificar Docker, setear `SKIP_DB_OPERATIONS=false` |
| Auth failed en sync | `N8N_ADMIN_EMAIL/PASSWORD` incorrectos | Verificar variables en .env |
| Nodo Up1EventCreate no muestra objetos | BD no accesible desde n8n | Verificar `PG_HOST`, `PG_DATABASE` en contenedor flow |
| Notificacion in-app no llega | `SUITE_URL` incorrecto | Verificar URL de Suite accesible desde n8n |
| Workflow duplicado | Existia antes de tag `up1Source` | Eliminar duplicado viejo en n8n |
| Worker no procesa jobs | Docker worker no corriendo | `docker compose --profile worker up -d` |
| Condicion del evento no funciona | Error de sintaxis en JS expression | Verificar `condition` con `data.field === 'value'` |

---

## 15. Aislamiento multi-tenant y licencia (UPONE-1568)

### Tenant de un flow: se resuelve por el Project de n8n

n8n tiene el concepto enterprise de **Team Projects** (agrupar workflows y credenciales bajo un espacio compartido). UPONE-1568 lo usa como **unidad de aislamiento por tenant**: cada tenant de uP1 tiene su propio Project en n8n, y el tenant de un flow se resuelve en runtime por el Project que lo posee, no por un campo en el JSON del workflow.

- El Project se marca con el tenant (`up1:tenant=<TENANT>`, en la descripcion o el nombre del team project).
- Del lado `object-manager`, `object-manager/scripts/sync/flowSync.js` resuelve o crea el Project del tenant ANTES de sincronizar (`flowService.ensureTenantProject(TENANT_ID)`, ver comentario "Resolve the tenant's n8n Project (isolation boundary)"), y acota los upserts de workflows a ese Project (`memberProject.id` en el filtro de fetch y en el `projectId` de creacion).
- Workflows sincronizados bajo el modelo anterior (sin Project) se migran al Project del tenant antes del upsert, para que queden en su lugar en vez de duplicarse (bloque "Migrate pre-existing copies into the tenant Project").

### HALLAZGO DE SEGURIDAD: la feature enterprise se desbloqueo sin licencia, y el corte quedo comentado

Para habilitar Team Projects sin una licencia enterprise real, el fork de uP1 modifico el modulo de licenciamiento de n8n en dos puntos:

1. **`flow/packages/cli/src/license.ts:255`**: el metodo `isLicensed(feature)` tiene el comentario `// UP1: All enterprise features unlocked` y retorna `true` para **cualquier** `BooleanLicenseFeature`, salvo el caso negativo `feat:apiDisabled` (que debe devolver `false` para mantener la API habilitada). No es un desbloqueo acotado a Team Projects: es un `isLicensed()` que siempre aprueba.
2. Las quotas relacionadas se fuerzan a `UNLIMITED_LICENSE_QUOTA` (`license.ts:392,432,437,442`, por ejemplo `getUsersLimit()`/`getTriggerLimit()`/`getVariablesLimit()`).
3. **`flow/packages/cli/src/controller.registry.ts:211-217`**, metodo `createLicenseMiddleware`: el gate de licencia por ruta esta desactivado. Verificado linea por linea:

```typescript
private createLicenseMiddleware(feature: BooleanLicenseFeature): RequestHandler {
    return (_req, _, next) => {
        if (!this.license.isLicensed(feature)) {
            //res.status(403).json({ status: 'error', message: 'Plan lacks license for this feature' });
            //return;
        }
        next();
    };
}
```

Las dos lineas que cortarian la request (`res.status(403)...` y el `return;`) estan comentadas, asi que el bloque `if` no tiene efecto: `next()` se ejecuta siempre, se este o no licenciado para la feature.

**Consecuencia (registrada sin suavizar)**: dado que `isLicensed()` ya retorna `true` para todo, y el middleware que deberia cortar ante falta de licencia esta neutralizado, **cualquier ruta de n8n gateada por `route.licenseFeature`** (no solo Team Projects) pasa sin chequeo real de licencia. El alcance completo de que endpoints tienen `licenseFeature` asignado **no fue enumerado** en esta revision: se verifico el mecanismo de corte (esta roto/inerte), no el inventario completo de rutas afectadas por el.

Ver tambien `flow/packages/cli/src/services/project.service.ee.ts:228`, comentario `// UP1: force unlimited team projects. The license reports 0 at request...`, que documenta explicitamente por que se forzo el limite en ese punto especifico.

### Drift creciente respecto al upstream de n8n

`license.ts`, `controller.registry.ts` y `services/project.service.ee.ts` son archivos **modificados respecto al upstream de n8n** para sostener este desbloqueo. Cada sync con una version nueva de upstream debe revisar estos tres archivos: un merge automatico puede reintroducir el corte de licencia original (rompiendo Team Projects sin darse cuenta) o, al reves, puede perderse el comentario que documenta el desbloqueo intencional y aplicarse sobre codigo de licencia distinto en la version nueva.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-10 | Documento inicial: guia completa del Flow Engine basada en codigo fuente de nodos custom, event system, flow sync, worker y docs internos |
| 2026-08-17 | Delta UPONE-1568, verificado contra codigo: se agrega seccion 15 documentando la resolucion de tenant por Project de n8n (`flowSync.js`, `ensureTenantProject`) y el hallazgo de seguridad de que `createLicenseMiddleware` (`controller.registry.ts:211-217`) tiene el corte 403 comentado mientras `license.ts:255` (`isLicensed`) retorna `true` para toda `BooleanLicenseFeature`; se deja constancia de que el conjunto completo de rutas afectadas no fue enumerado, y del drift creciente de estos tres archivos respecto al upstream de n8n |
