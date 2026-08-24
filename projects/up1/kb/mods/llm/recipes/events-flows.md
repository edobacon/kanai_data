---
id: SPEC-mods-010
project: up1
type: spec
module: mods
tags: [evento, BullMQ, Redis, n8n, workflow, trigger, notificacion, Up1FormObject]
---
# Eventos y Flows n8n

## Preparacion

```bash
# Para eventos
mkdir -p mods/{mod}/events

# Para flows
mkdir -p mods/{mod}/flows
```

## Despues de CADA receta

```bash
# Para eventos:
npm run sync
docker compose --profile worker up -d  # Asegurar worker corriendo

# Para flows:
npm run sync  # Fase 9 sube JSON a n8n via REST API
# Requiere n8n corriendo: docker compose --profile flow up -d
```

---

## Eventos

### EVT-01: Crear evento sin condición
**Pre:** Mod con objeto existente. `npm run sync` funcional.  
**In:** Nombre del objeto (`objectType`), operación (`create`/`update`/`delete`), campos a incluir.  
**Pasos:**
1. Crear directorio `events/` dentro del mod:
   ```bash
   mkdir -p mods/mi-mod/events
   ```
2. Crear `mods/mi-mod/events/miobjeto-created.json`:
   ```json
   {
     "id": "miobjeto:created",
     "description": "Se dispara en toda creacion de MiObjeto",
     "trigger": {
       "objectType": "MiObjeto",
       "operation": "create"
     },
     "includeFields": ["id", "nombre", "estado", "createdAt"],
     "priority": 5,
     "attempts": 3
   }
   ```
3. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** Crear un registro de `MiObjeto` vía GraphQL. En Redis Pub/Sub se publica el canal `{tenantId}/MiObjeto/{modname}:create`. Sin `condition` → se dispara en **toda** creación, sin filtros.  
**Doc:** `specs/up1/features/flow-engine.md` §4

---

### EVT-02: Crear evento con condición
**Pre:** Mod con objeto que tenga un campo con valores discretos (ej: `status`).  
**In:** Objeto, operación, campo a evaluar, valor que dispara el evento.  
**Pasos:**
1. Crear `mods/mi-mod/events/miobjeto-activated.json`:
   ```json
   {
     "id": "miobjeto:activated",
     "description": "Solo dispara cuando estado cambia a ACTIVO",
     "trigger": {
       "objectType": "MiObjeto",
       "operation": "update",
       "condition": "data.estado === 'ACTIVO'"
     },
     "includeFields": ["id", "nombre", "estado"],
     "priority": 3,
     "attempts": 3
   }
   ```
2. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** Actualizar `MiObjeto` con `estado = 'ACTIVO'` → evento en Redis. Actualizar con otro valor → no se encola. `condition` es una expresión JS evaluada contra `data` (el registro resultante).  
**Doc:** `specs/up1/features/flow-engine.md` §4

---

### EVT-03: Crear evento en create con payload selectivo (includeFields)
**Pre:** Objeto con múltiples campos, algunos sensibles que no deben viajar en el payload.  
**In:** Lista explícita de campos a incluir en el payload del evento.  
**Pasos:**
1. Crear `mods/mi-mod/events/miobjeto-created-slim.json`:
   ```json
   {
     "id": "miobjeto:created",
     "trigger": {
       "objectType": "MiObjeto",
       "operation": "create"
     },
     "includeFields": ["id", "nombre", "createdAt"],
     "priority": 5,
     "attempts": 3
   }
   ```
   Sin `includeFields` → se envía **todo** el registro. Con `includeFields` → solo los campos listados.
2. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** Crear un registro. El payload del mensaje Redis solo contiene los campos declarados en `includeFields` más el wrapper `{ type, tenantId, userId, timestamp, objectType, operation, domain, data }`.  
**Doc:** `specs/up1/features/flow-engine.md` §3, §4

---

### EVT-04: Crear evento en update condicional (ej: status cambia a "published")
**Pre:** Objeto con campo de estado tipo enum.  
**In:** Valor de estado que dispara el evento, campos de payload requeridos.  
**Pasos:**
1. Crear `mods/mi-mod/events/miobjeto-published.json`:
   ```json
   {
     "id": "miobjeto:published",
     "description": "Dispara cuando un registro se publica",
     "trigger": {
       "objectType": "MiObjeto",
       "operation": "update",
       "condition": "data.status === 'published'"
     },
     "includeFields": ["id", "titulo", "status", "publishedAt"],
     "priority": 2,
     "attempts": 5
   }
   ```
2. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** Mutation `updateInstance` con `status = 'published'` → evento encolado con priority 2. `attempts: 5` significa hasta 5 reintentos ante fallo del worker.  
**Doc:** `specs/up1/features/flow-engine.md` §4, §12

---

## Flows

### FLOW-01: Crear workflow desde n8n UI y exportar como JSON
**Pre:** n8n corriendo en `localhost:5678`.  
**In:** Nombre del workflow, nodos y conexiones a configurar.  
**Pasos:**
1. Abrir `http://localhost:5678`.
2. Click en "+" → "Create Workflow".
3. Arrastrar nodos desde el panel lateral y conectarlos.
4. Configurar parámetros de cada nodo.
5. Activar el workflow (toggle ON).
6. Exportar: menú del workflow → "Download" (o `GET /rest/workflows/:id`).
7. Limpiar el JSON exportado (ver FLOW-08).
8. Guardar en `mods/mi-mod/flows/mi-workflow.json`.
9. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** `npm run sync` fase 9 "Flow Sync" muestra el workflow upserted sin errores. En n8n aparece el workflow con tag `up1Source = "mi-mod/mi-workflow"`. Renombrar el archivo no crea duplicado gracias al tag estable.  
**Doc:** `specs/up1/features/flow-engine.md` §6, §7

---

### FLOW-02: Workflow trigger por evento (Up1EventCreate)
**Pre:** Evento definido en `events/` del mod y sincronizado. n8n corriendo.  
**In:** `tenantId`, `objectType`, `domain` (nombre del mod en `app.json`).  
**Pasos:**
1. Crear `mods/mi-mod/flows/on-miobjeto-create.json`:
   ```json
   {
     "name": "[MiMod] On MiObjeto Create",
     "nodes": [
       {
         "name": "Trigger Create",
         "type": "n8n-nodes-base.up1EventCreate",
         "typeVersion": 1,
         "position": [0, 0],
         "parameters": {
           "tenantId": "UPU",
           "objectType": "MiObjeto",
           "domain": "mi-mod"
         }
       }
     ],
     "connections": {},
     "settings": { "executionOrder": "v1" }
   }
   ```
2. Agregar nodos de acción y sus conexiones.
3. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** Crear instancia de `MiObjeto` → el workflow se dispara en n8n. `domain` debe coincidir con el campo `name` de `config/app.json`. Si `domain = "all"` → escucha eventos de todos los mods para ese objeto.  
**Doc:** `specs/up1/features/flow-engine.md` §5, §13

---

### FLOW-03: Workflow con notificación (Up1Notification: inapp, email)
**Pre:** FLOW-02 configurado. Variables `SUITE_URL` y `NOTIFICATIONS_API_KEY` en el entorno de n8n.  
**In:** Canales de notificación, título, mensaje.  
**Pasos:**
1. Agregar nodo `Up1Notification` después del trigger:
   ```json
   {
     "name": "Notificar",
     "type": "n8n-nodes-base.up1Notification",
     "typeVersion": 1,
     "position": [200, 0],
     "parameters": {
       "operation": "send",
       "mode": "manual",
       "channels": ["inapp", "email"],
       "title": "Nuevo registro creado",
       "message": "Se creó un nuevo registro en MiObjeto.",
       "notificationType": "success",
       "inappBroadcast": false
     }
   }
   ```
2. Agregar la conexión en `connections`:
   ```json
   {
     "Trigger Create": {
       "main": [[{ "node": "Notificar", "type": "main", "index": 0 }]]
     }
   }
   ```

**Validar:** Crear instancia → notificación in-app aparece en la campana del usuario. `inappBroadcast: true` envía a todos los usuarios del tenant. `mode: "preferences"` respeta las preferencias de `NotificationPreference` del usuario.  
**Doc:** `specs/up1/features/flow-engine.md` §5

---

### FLOW-04: Workflow con schedule (cron trigger)
**Pre:** n8n corriendo. Workflow creado.  
**In:** Expresión cron, acción a ejecutar en cada disparo.  
**Pasos:**
1. Crear nodo `scheduleTrigger`:
   ```json
   {
     "name": "Schedule",
     "type": "n8n-nodes-base.scheduleTrigger",
     "typeVersion": 1,
     "position": [0, 0],
     "parameters": {
       "rule": {
         "interval": [
           { "field": "cronExpression", "expression": "0 9 * * 1-5" }
         ]
       }
     }
   }
   ```
   Ejemplos de expresiones: `"0 9 * * 1-5"` (lunes a viernes 9 AM), `"0 6 * * *"` (todos los días 6 AM), `"0 */4 * * *"` (cada 4 horas).
2. Conectar al nodo de acción y ejecutar sync.

**Validar:** El workflow se activa automáticamente en el horario configurado. Verificar en "Executions" de n8n. Workflows con schedule deben estar activos (toggle ON).  
**Doc:** `specs/up1/features/flow-engine.md` §13

---

### FLOW-05: Workflow con Up1FormObject (SQL directo a BD)
**Pre:** n8n corriendo. Tabla del objeto existente en BD.  
**In:** Tabla, columnas a leer o escribir, filtros.  
**Pasos:**
1. Agregar nodo `up1FormObject`:
   ```json
   {
     "name": "Leer Registros",
     "type": "n8n-nodes-base.up1FormObject",
     "typeVersion": 1,
     "position": [200, 0],
     "parameters": {
       "operation": "list",
       "table": "MiObjeto",
       "columns": ["id", "nombre", "estado"],
       "filters": [
         { "field": "estado", "operator": "EQUALS", "value": "ACTIVO" }
       ]
     }
   }
   ```
   Operaciones disponibles: `list`, `read` (por ID), `create` (INSERT), `update` (UPDATE por ID).

**Validar:** El nodo retorna registros directamente desde PostgreSQL. **Advertencia:** `Up1FormObject` bypasea GraphQL, RBAC y eventos. No genera `withEventPublish`. Usar solo cuando se necesita acceso directo a tablas internas o performance crítica.  
**Doc:** `specs/up1/features/flow-engine.md` §5, `specs/up1/core/programmatic-interaction.md` §6

---

### FLOW-06: Workflow con HTTP Request a API externa
**Pre:** API externa accesible desde n8n. URL y credenciales disponibles.  
**In:** URL, método HTTP, headers, body.  
**Pasos:**
1. Agregar nodo `httpRequest`:
   ```json
   {
     "name": "Enviar a CRM",
     "type": "n8n-nodes-base.httpRequest",
     "typeVersion": 4,
     "position": [400, 0],
     "parameters": {
       "method": "POST",
       "url": "https://api.externa.com/endpoint",
       "sendHeaders": true,
       "headerParameters": {
         "parameters": [
           { "name": "Authorization", "value": "Bearer {{ $env.CRM_TOKEN }}" },
           { "name": "Content-Type", "value": "application/json" }
         ]
       },
       "sendBody": true,
       "bodyParameters": {
         "parameters": [
           { "name": "data", "value": "={{ $json }}" }
         ]
       }
     }
   }
   ```

**Validar:** El nodo hace la petición HTTP y retorna el cuerpo de la respuesta. Credenciales sensibles en variables de entorno de n8n (`$env.NOMBRE`), nunca hardcodeadas en el JSON del workflow.  
**Doc:** `specs/up1/features/flow-engine.md` §6

---

### FLOW-07: Workflow con Up1SendEmail (AWS SES)
**Pre:** Credencial `aws` configurada en n8n con acceso a SES. Variables `AWS_*` en entorno n8n.  
**In:** Destinatarios, asunto, cuerpo del email.  
**Pasos:**
1. Agregar nodo `up1SendEmail`:
   ```json
   {
     "name": "Enviar Email",
     "type": "n8n-nodes-base.up1SendEmail",
     "typeVersion": 1,
     "position": [400, 0],
     "parameters": {
       "operation": "send",
       "from": "noreply@universidad.cl",
       "to": ["={{ $json.email }}"],
       "subject": "Confirmación de registro",
       "body": "Tu registro fue procesado exitosamente.",
       "isHtml": false
     }
   }
   ```
   Para email con template SES: usar `operation: "sendTemplate"` con `templateName` y `templateData`.

**Validar:** Email recibido en el destinatario. Si falla: verificar que la credencial `aws` tiene permisos SES y que el dominio remitente está verificado en SES.  
**Doc:** `specs/up1/features/flow-engine.md` §5

---

### FLOW-08: Limpiar JSON exportado de n8n
**Pre:** Workflow exportado desde n8n UI.  
**In:** JSON crudo exportado por n8n.  
**Pasos:**
1. Eliminar los campos auto-generados que no deben versionarse:
   - `id` (raíz del workflow)
   - `createdAt`
   - `updatedAt`
   - `versionId`
2. Estructura limpia mínima requerida:
   ```json
   {
     "name": "[MiMod] Nombre Descriptivo",
     "nodes": [ ... ],
     "connections": { ... },
     "settings": { "executionOrder": "v1" }
   }
   ```
3. Guardar en `mods/mi-mod/flows/nombre-descriptivo.json` (kebab-case).
4. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** Sync fase 9 no crea duplicados (usa `settings.up1Source` como tag estable). Si el workflow ya existía en n8n → PATCH. Si es nuevo → POST. El nombre puede cambiar sin crear duplicado gracias al tag `up1Source = "{mod}/{archivo}"`.  
**Doc:** `specs/up1/features/flow-engine.md` §7
