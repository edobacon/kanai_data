---
id: SPEC-operations-001
project: up1
type: doc
module: operations
tags:
  - up1
  - setup
  - local
  - servicios
  - docker
  - postgresql
  - start
  - stop
  - logs
  - urls
---

# Entorno local de uP1

Como levantar, verificar y bajar el entorno de desarrollo local de uP1.

---

## 1. Prerequisitos

| Requisito | Version | Verificar |
|-----------|---------|-----------|
| Node.js | 22.12+ | `node --version` (usar nvm: `nvm use 22`) |
| PostgreSQL | Cualquiera | `nc -z localhost 5432` o `psql --version` |
| Docker Desktop | Cualquiera | `docker info` |
| SSH key | Bitbucket | `ssh -T git@bitbucket.org` |
| Monorepo clonado | — | `ls ~/Workspace/uplanner/up1/` |
| Setup completado | — | `npm run setup` ejecutado al menos una vez |

### Variables de entorno

El archivo `.env` en la raiz de `up1/` configura conexiones. **NUNCA editar `.env` de cada workspace individual.**

| Prefijo | Para quien | Ejemplo |
|---------|-----------|---------|
| `PG_*`, `DATABASE_URL` | Object Manager (PostgreSQL) | `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/uplanner` |
| `SUITE_*` | Suite (frontend) | — |
| `N8N_*`, `DB_POSTGRESDB_*` | Flow Engine (n8n) | `N8N_ADMIN_EMAIL=admin@uplanner.com` |

---

## 2. Levantar servicios

### Opcion A: Script `up1-start.sh` (recomendado)

Script automatizado que verifica Docker, PostgreSQL, y levanta los 5 servicios con logs.

```bash
# Levantar todo (los 5 servicios: om, suite, flow, bayley, horadric)
./up1-start.sh

# Levantar solo un servicio
./up1-start.sh --om       # Solo Object Manager (puerto 4000)
./up1-start.sh --suite    # Solo Suite (puerto 3000)
./up1-start.sh --flow     # Solo Flow/n8n (puerto 5678)
./up1-start.sh --bayley   # Solo Bayley (puertos 5173 y 5174)
./up1-start.sh --horadric # Solo Horadric-cube (puertos 3016 y 5180)
```

El script:
1. Verifica que Docker este corriendo (lo inicia si no)
2. Verifica PostgreSQL en `localhost:5432`
3. Levanta cada servicio en background con logs en `~/.up1-logs/{session}/`
4. Espera a que cada puerto responda (timeout 60s)
5. Muestra estado final con URLs

### Opcion B: Manual (por workspace)

```bash
# Terminal 1 — Object Manager (backend)
source ~/.nvm/nvm.sh && nvm use 22
cd ~/Workspace/uplanner/up1
npm run dev --workspace=@uplanner/object-management-backend
# → http://localhost:4000/graphql

# Terminal 2 — Suite (frontend)
source ~/.nvm/nvm.sh && nvm use 22
cd ~/Workspace/uplanner/up1
npm run dev --workspace=@uplanner/suite
# → http://localhost:3000

# Terminal 3 — Storybook (opcional)
source ~/.nvm/nvm.sh && nvm use 22
cd ~/Workspace/uplanner/up1
npm run storybook --workspace=@uplanner/layout-engine
# → http://localhost:6006
```

### Servicios Docker (opcionales)

```bash
cd ~/Workspace/uplanner/up1

# Redis + Worker (para eventos BullMQ)
docker compose --profile worker up -d

# Flow Engine / n8n
docker compose --profile flow up -d
# → http://localhost:5678

# Storybook via Docker
docker compose --profile development up -d
# → http://localhost:6006
```

---

## 3. URLs y servicios

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Entorno local                                                              │
│                                                                             │
│  ┌──────────────────────┐     ┌──────────────────────────────┐              │
│  │ Suite (Frontend)     │────>│ Object Manager (API)         │              │
│  │ http://localhost:3000│     │ http://localhost:4000/graphql│              │
│  └──────────────────────┘     └──────────────┬───────────────┘              │
│                                              │              │               │
│  ┌──────────────────────┐     ┌─────────────▼──┐  ┌────────▼─────────┐     │
│  │ Storybook            │     │ (PostgreSQL)    │  │ (Redis)          │     │
│  │ http://localhost:6006│     │ localhost:5432  │  │ localhost:6379   │     │
│  └──────────────────────┘     └────────────────┘  └──────────────────┘     │
│                                              ▲                              │
│  ┌──────────────────────┐                   │                              │
│  │ n8n (Flow Engine)    │───────────────────┘                              │
│  │ http://localhost:5678│                                                   │
│  └──────────────────────┘                                                   │
│                                                                             │
│  (Nuevos servicios locales de apoyo)                                        │
│  ┌──────────────────────┐     ┌──────────────────────────────┐              │
│  │ Bayley (Vite)        │     │ Horadric-cube (Vite)         │              │
│  │ http://localhost:5173│     │ http://localhost:3016        │              │
│  └──────────────────────┘     └──────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Servicio | URL | Puerto | Requiere |
|----------|-----|--------|----------|
| **Suite** (frontend) | http://localhost:3000 | 3000 | Object Manager corriendo |
| **Object Manager** (API GraphQL) | http://localhost:4000/graphql | 4000 | PostgreSQL |
| **Storybook** | http://localhost:6006 | 6006 | — (independiente) |
| **n8n** (Flow Engine) | http://localhost:5678 | 5678 | PostgreSQL, build previo |
| **Bayley** (Vite + sidecar) | http://localhost:5173 (sidecar: :5174) | 5173 / 5174 | — |
| **Horadric** (Vite + server) | http://localhost:3016 (server: :5180) | 3016 / 5180 | — |
| **PostgreSQL** | localhost:5432 | 5432 | — |
| **Redis** | localhost:6379 | 6379 | Docker |
| **Worker** (BullMQ) | — (background) | — | Redis, Docker |

### Estructura de URLs de la app

```
http://localhost:3000                     → Redirige a /login/{TENANT}
http://localhost:3000/{TENANT}            → Home del tenant (ej: /UPU)
http://localhost:3000/{TENANT}/{Object}/RecordList/{layoutId}  → Lista
http://localhost:3000/{TENANT}/{Object}/RecordDetail/{layoutId}/{instanceId}  → Detalle
```

Ejemplo: `http://localhost:3000/UPU/Event/RecordList/event_list`

---

## 4. Verificar estado

### Con el script

```bash
./up1-start.sh --status
```

Muestra estado de cada servicio (corriendo / no corriendo) con URLs.

### Manual

```bash
# Verificar puertos
lsof -i :4000 -sTCP:LISTEN  # Object Manager
lsof -i :3000 -sTCP:LISTEN  # Suite
lsof -i :5678 -sTCP:LISTEN  # n8n
lsof -i :5432 -sTCP:LISTEN  # PostgreSQL

# Verificar GraphQL
curl -s http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: UPU" \
  -d '{"query":"{ __typename }"}' | head -1
# Debe retornar: {"data":{"__typename":"Query"}}
```

---

## 5. Bajar servicios

### Con el script

```bash
./up1-start.sh --stop
```

Mata todos los procesos de up1 (nodemon, nuxt, n8n, turbo).

### Manual

```bash
# Bajar servicios Docker
docker compose down

# Matar procesos Node.js de up1
ps aux | grep -E 'nodemon.*src/index.js|nuxt dev|n8n$' | grep -v grep | awk '{print $2}' | xargs kill
```

---

## 6. Logs

### Con el script

```bash
# Ver logs en vivo de la sesion actual
./up1-start.sh --logs                    # Todos los servicios
./up1-start.sh --logs object-manager     # Solo Object Manager
./up1-start.sh --logs suite              # Solo Suite
./up1-start.sh --logs flow               # Solo n8n

# Listar sesiones anteriores
./up1-start.sh --logs-list

# Ver logs de una sesion anterior
./up1-start.sh --logs-show 20260414-103025
./up1-start.sh --logs-show 20260414-103025 object-manager

# Buscar en logs
./up1-start.sh --logs-find "error"
./up1-start.sh --logs-find "error" --service object-manager
./up1-start.sh --logs-find "error" --from 20260414

# Limpiar sesiones antiguas (mantener ultimas 10)
./up1-start.sh --logs-clean
```

Los logs se guardan en `~/Workspace/uplanner/.up1-logs/{session}/`:
- `object-manager.log`
- `suite.log`
- `flow.log`
- `session.info` (metadata de la sesion)

---

## 7. Login en la app

### Flujo de login (Clerk OTP)

```text
  Usuario          Suite (localhost:3000)      Clerk (auth)
     │                      │                       │
     │  Navegar a            │                       │
     │  localhost:3000       │                       │
     │─────────────────────>│                       │
     │                      │                       │
     │<─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  Redirige a /login/UPU│
     │                      │                       │
     │  Ingresa email        │                       │
     │─────────────────────>│                       │
     │                      │  Solicita OTP         │
     │                      │──────────────────────>│
     │                      │                       │
     │<─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  Envia codigo por email
     │                      │                       │
     │  Ingresa codigo OTP   │                       │
     │─────────────────────>│                       │
     │                      │  Verifica codigo      │
     │                      │──────────────────────>│
     │                      │                       │
     │                      │<─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│  JWT token
     │                      │                       │
     │<─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  Redirige a /UPU (home)
     │                      │                       │
```

### Usuarios de prueba

| Rol | Email | Uso |
|-----|-------|-----|
| Admin | `admin.sigepur@urosario.edu.co` | Acceso total |
| Coordinador | `pruebas.uplanner@urosario.edu.co` | Acceso medio |
| Docente | `darwin.cortes@urosario.edu.co` | Acceso limitado |

Password para todos: `123` (modo desarrollo).

### Modo desarrollo sin Clerk

Si `RBAC_TEST_MODE=true` en `.env`, el sistema simula el usuario `profile.manager@uplanner.cl` sin necesidad de login por Clerk.

---

## 8. Sync y propagacion de cambios

Despues de modificar archivos en `mods/{mod}/`, propagar:

```bash
# Sync completo (9 fases)
npm run sync

# Si se modificaron objects/:
npm run codegen --workspace=@uplanner/object-management-backend
npm run tenant:migrate --workspace=@uplanner/object-management-backend

# Reiniciar segun tipo de cambio:
# objects/ o logic/ → reiniciar Object Manager (Ctrl+C + npm run dev)
# modsComponents/   → hot reload automatico
# config/layouts/   → recarga automatica
# lang/             → reiniciar Suite
# css/              → hard refresh browser (Cmd+Shift+R)
```

> ¿Necesitas reconstruir la BD desde 0 (full, por tenant) o se rompe el reset por drift? Ver [database-reset.md](database-reset.md).

---

## 9. Troubleshooting

| Problema | Causa | Solucion |
|----------|-------|----------|
| Puerto 4000 ya en uso | Object Manager de sesion anterior | `./up1-start.sh --stop` y volver a levantar |
| Puerto 3000 ya en uso | Suite de sesion anterior | Idem |
| PostgreSQL no responde | Servicio no iniciado | Iniciar PostgreSQL (Homebrew: `brew services start postgresql`) |
| Docker no disponible | Docker Desktop no corriendo | Abrir Docker Desktop o `open -a Docker` |
| n8n no levanta | Build no hecho o fallo | El script lo detecta y ejecuta `pnpm build` (~2min) |
| Login falla con OTP | Clerk no configurado para dev | Usar `RBAC_TEST_MODE=true` en `.env` |
| Datos no aparecen | Tenant incorrecto | Verificar URL contiene el tenant correcto (ej: `/UPU`) |
| Sync falla en fase 4-8 | BD no conectada | Verificar PostgreSQL + `.env` con DATABASE_URL correcto |
| Componentes no renderizan | Sync no ejecutado | `npm run sync` |

---

## 10. Referencia rapida de comandos

```bash
# ─── Levantar ───────────────────────────────
./up1-start.sh              # Todo (los 5 servicios)
./up1-start.sh --om         # Solo backend
./up1-start.sh --suite      # Solo frontend
./up1-start.sh --flow       # Solo n8n
./up1-start.sh --bayley     # Solo bayley
./up1-start.sh --horadric   # Solo horadric-cube

# ─── Estado ─────────────────────────────────
./up1-start.sh --status     # Ver puertos

# ─── Bajar ──────────────────────────────────
./up1-start.sh --stop       # Todo

# ─── Logs ───────────────────────────────────
./up1-start.sh --logs       # En vivo
./up1-start.sh --logs-list  # Sesiones
./up1-start.sh --logs-find "error"  # Buscar

# ─── Sync ───────────────────────────────────
npm run sync                # Propagar mods
npm run check-mods          # Validar estructura
npm run codegen --workspace=@uplanner/object-management-backend
npm run tenant:migrate --workspace=@uplanner/object-management-backend

# ─── Dev servers (manual) ───────────────────
npm run dev --workspace=@uplanner/object-management-backend  # :4000
npm run dev --workspace=@uplanner/suite                       # :3000
npm run storybook --workspace=@uplanner/layout-engine         # :6006
cd ../bayley && npm run dev                                   # :5173 / :5174
cd ../horadric-cube && npm run dev                            # :3016 / :5180

# ─── Docker ─────────────────────────────────
docker compose --profile worker up -d    # Redis + Worker
docker compose --profile flow up -d      # n8n :5678
docker compose down                      # Todo Docker
```

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-13 | Documentación actualizada para reflejar los 5 servicios integrados (Bayley y Horadric-cube) |
| 2026-04-14 | Documento inicial basado en up1-start.sh, CLAUDE.md de up1, y configuracion del proyecto |
