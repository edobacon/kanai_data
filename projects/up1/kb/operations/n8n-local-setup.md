---
id: SPEC-operations-002
project: up1
type: spec
module: operations
category: operations
tags:
  [
    up1,
    n8n,
    flow,
    setup-local,
    pnpm,
    postgresql,
    redis,
    session-bridge,
    credenciales,
    troubleshooting,
  ]
fecha: 2026-04-09
---

# n8n (flow) — Setup local sin Docker

## Contexto

El subproyecto `flow/` dentro de `up1/` es un fork de n8n. Esta guia documenta los pasos para levantarlo localmente con Node 22, sin Docker.

## Prerequisitos

- Node.js >= 22.16 (via nvm)
- pnpm >= 10.22.0 (flow usa pnpm, no npm)
- PostgreSQL corriendo en localhost:5432 con usuario `pg`/`root`

## Pasos

### 1. Instalar dependencias

```bash
cd flow/
pnpm install
```

> **Importante**: `npm install` no funciona. El `package.json` de flow usa sintaxis exclusiva de pnpm (`workspace:*`, `catalog:`).

### 2. Generar parser de gramática

El paquete `@n8n/codemirror-lang-html` requiere generar el parser desde la gramática Lezer antes del build:

```bash
cd packages/@n8n/codemirror-lang-html
pnpm grammar:build
cd ../../..
```

Sin este paso, el build falla con: `Could not resolve './parser' from src/grammar/index.js`

### 3. Build completo

```bash
pnpm build
```

- Compila 45 paquetes del monorepo con turbo.
- Toma ~2 minutos.
- Necesario antes del primer `pnpm start` o `pnpm dev` porque n8n necesita los `dist/` de los paquetes internos (`@n8n/di`, `@n8n/config`, `@n8n/api-types`, etc.).

### 4. Crear base de datos

n8n usa su propia base de datos PostgreSQL separada de object-manager:

```bash
# Desde object-manager/ (que tiene pg instalado) o con psql:
createdb -h localhost -p 5432 -U pg flow-engine
#Si a db esta en Docker
# docker exec -it pg createdb -U pg flow-engine
```

### 5. Configurar .env

El setup auto-genera `flow/.env` desde el `.env` raiz. Para correr local sin Docker, ajustar:

```env
# Cambiar host.docker.internal → localhost
DB_POSTGRESDB_HOST=localhost

# Usar mismas credenciales que el resto de up1
DB_POSTGRESDB_USER=pg
DB_POSTGRESDB_PASSWORD=root

# DB dedicada para n8n
DB_POSTGRESDB_DATABASE=flow-engine
```

> `host.docker.internal` solo resuelve dentro de containers Docker. Para local debe ser `localhost`.

Tambien verificar que `object-manager/.env` incluya las variables de n8n (el setup auto-generado puede no copiarlas):

```env
# Apuntar al n8n local, no al remoto
# Remoto original: https://one-flow.u-planner.com
N8N_BASE_URL=http://localhost:5678

N8N_ADMIN_EMAIL=up1.n8n.admin@gmail.com
N8N_ADMIN_PASSWORD=d$@i\vO995IG
N8N_MEMBER_EMAIL_UPU=up1.n8n.member@gmail.com
N8N_MEMBER_PASSWORD_UPU=21Mi2poC93qs
```

> **Importante**: `N8N_BASE_URL` por defecto apunta al remoto (`https://one-flow.u-planner.com`). Si no se cambia, el sync del paso 8 crea/actualiza workflows en el n8n remoto en vez del local. Revisar tambien `up1/.env` (raiz), que replica la variable y se usa como fuente para auto-generar `flow/.env`.

### 6. Iniciar n8n

Los pasos 7 y 8 llaman al REST API de n8n, asi que tiene que estar corriendo antes.

```bash
# Produccion (requiere build previo):
pnpm start

# Desarrollo (watch mode, mas lento en arrancar):
pnpm dev
```

n8n queda disponible en `http://localhost:5678`. Esperar a ver `Editor is now accessible via: http://localhost:5678/` antes de continuar.

### 7. Crear cuentas en n8n

En una instalacion fresca, n8n no tiene usuarios. Hay que crear el owner y el member antes de que object-manager pueda comunicarse con n8n.

#### 7a. Owner account (admin)

El owner es la cuenta principal. flowService la usa para crear API keys y gestionar workflows.

Via browser: abrir `http://localhost:5678` y completar el setup wizard.

Via API:

```bash
curl -X POST http://localhost:5678/rest/owner/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "up1.n8n.admin@gmail.com",
    "password": "d$@i\\vO995IG",
    "firstName": "UP1",
    "lastName": "Admin"
  }'
```

Usar los mismos valores de `N8N_ADMIN_EMAIL` y `N8N_ADMIN_PASSWORD` del `.env`.

Sin este paso, object-manager muestra: `No n8n API key available. Set N8N_ADMIN_EMAIL and N8N_ADMIN_PASSWORD for auto-rotation.`

#### 7b. Member account (por tenant)

El member es la cuenta con la que los usuarios de UP1 acceden a n8n via session bridge. Tiene permisos restringidos (no ve configs de nodos).

Via API (requiere 2 pasos — invitar y aceptar):

```bash
# 1. Login como admin y obtener cookie
COOKIE=$(curl -s -D - -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"up1.n8n.admin@gmail.com","password":"d$@i\\vO995IG"}' \
  | grep -i 'set-cookie' | head -1 | sed 's/set-cookie: //i' | cut -d';' -f1)

# 2. Invitar al member
INVITE=$(curl -s -X POST http://localhost:5678/rest/invitations \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '[{"email":"up1.n8n.member@gmail.com","role":"global:member"}]')

# 3. Extraer IDs de la respuesta
INVITEE_ID=$(echo $INVITE | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['user']['id'])")
INVITER_ID=$(echo $INVITE | python3 -c "import sys,json; url=json.load(sys.stdin)['data'][0]['user']['inviteAcceptUrl']; print(url.split('inviterId=')[1].split('&')[0])")

# 4. Aceptar invitacion con password
curl -X POST "http://localhost:5678/rest/invitations/$INVITEE_ID/accept" \
  -H "Content-Type: application/json" \
  -d "{
    \"inviterId\": \"$INVITER_ID\",
    \"firstName\": \"UP1\",
    \"lastName\": \"Member\",
    \"password\": \"21Mi2poC93qs\"
  }"
```

Sin el member account, al acceder a un workflow desde suite se redirige a n8n signin sin autenticacion.

### 8. Compartir workflows con el member

Los workflows creados por el admin viven en su proyecto personal. El member no los ve hasta que se comparten con su proyecto personal.

La forma correcta es correr el sync de object-manager, que automaticamente comparte los workflows:

```bash
cd object-manager/
npm run sync
```

El sync (flowSync.js fase 9) resuelve el proyecto personal del member via `findMemberProjectId()` y llama `shareWorkflow()` con role `workflow:editor`.

> **Nota**: Sin este paso, el member ve "You need access — You don't have permission to view this workflow" al intentar abrir un workflow desde suite.

## Arquitectura de acceso a n8n

### Session bridge

UP1 no expone n8n directamente. El flujo es:

1. Usuario accede a un workflow desde suite (ej: `/UPU/N8nWorkflow/RecordList/...`)
2. object-manager valida el usuario via Auth0 JWT
3. flowService loguea en n8n con las credenciales del member (o admin como fallback)
4. Obtiene la cookie `n8n-auth` y la setea en la respuesta
5. Redirige al usuario a n8n con la cookie — queda autenticado sin login separado

### Jerarquia de credenciales

Al hacer el session bridge, flowService resuelve credenciales en este orden:

1. **Member por tenant**: `N8N_MEMBER_EMAIL_{TENANT_ID}` / `N8N_MEMBER_PASSWORD_{TENANT_ID}`
2. **Member UPU (fallback)**: `N8N_MEMBER_EMAIL_UPU` / `N8N_MEMBER_PASSWORD_UPU`
3. **Admin global**: `N8N_ADMIN_EMAIL` / `N8N_ADMIN_PASSWORD`

El member tiene vista restringida (no ve configs de nodos). El admin tiene acceso completo.

### Organizacion de workflows

- **No se usan team projects**. Cada cuenta tiene su proyecto personal en n8n.
- Los workflows los crea/gestiona el admin en su proyecto personal.
- Se comparten con el proyecto personal del member via `shareWorkflow()` con role `workflow:editor`.
- Nuevos usuarios se agregan como members con el mismo patron.
- El sync (`flowSync.js`) automatiza el sharing al crear/actualizar workflows.

### API key rotation

flowService gestiona API keys de n8n automaticamente:

1. Cache en memoria (mas rapido)
2. Registro en `core_SystemConfig` (persiste entre reinicios)
3. Crea key nueva via n8n REST API (expira en 7 dias)
4. Fallback a `N8N_API_KEY` env var (estatica, sin rotacion)

No se necesita configurar `N8N_API_KEY` manualmente — la rotacion es automatica si `N8N_ADMIN_EMAIL` y `N8N_ADMIN_PASSWORD` estan configurados.

## Problemas conocidos

### `pnpm dev` se cuelga en `copy-nodes-json`

`pnpm dev` usa turbo en modo paralelo con watch. El paquete `n8n-nodes-base` (~800 nodos) tarda mucho en compilar con `tsc-watch` + `copy-nodes-json`. Puede parecer colgado pero esta procesando. Usar `pnpm start` (post-build) es mas rapido y confiable.

### Warnings inofensivos al iniciar

```
Failed to load Custom API options for the node "n8n-nodes-base.crypto": Unknown credential name "crypto"
Failed to load Custom API options for the node "@n8n/n8n-nodes-langchain.vectorStoreSupabase": Unknown credential name "supabaseApi"
```

Son nodos con credenciales no configuradas. No afectan el funcionamiento.

### `N8N_RUNNERS_ENABLED` deprecado

```
N8N_RUNNERS_ENABLED -> Remove this environment variable; it is no longer needed.
```

Se puede quitar de `flow/.env` sin consecuencias.

### `npm install` falla con `EUNSUPPORTEDPROTOCOL`

Si se corre `npm install` desde el root de up1 o desde object-manager, npm intenta resolver todos los workspaces incluyendo flow, que usa `workspace:*` (sintaxis pnpm). Solucion: instalar flow siempre con `pnpm install` desde `flow/`.

## Puertos

| Servicio                 | Puerto |
| ------------------------ | ------ |
| n8n Editor/API           | 5678   |
| object-manager (GraphQL) | 4000   |
| suite (Nuxt)             | 3000   |

## Archivos clave

| Archivo                                                      | Proposito                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `object-manager/src/services/flowService.js`                 | Cliente HTTP para n8n API, session bridge, API key rotation, member project discovery |
| `object-manager/scripts/sync/flowSync.js`                    | Sync de workflows desde mods a n8n (fase 9), sharing automatico con member            |
| `object-manager/src/graphql/resolvers/flow/flow.resolver.js` | Resolvers GraphQL para crear/editar workflows, usa shareWorkflow                      |
| `mods/flow-viewer/logic/flow.schema.graphql`                 | Schema GraphQL del mod flow-viewer                                                    |
| `object-manager/docs/guides/n8n-workflow-proxy.md`           | Documentacion del proxy de workflows (RecordList/RecordDetail)                        |
| `object-manager/docs/features/flow-sync.md`                  | Documentacion del sync de workflows                                                   |
