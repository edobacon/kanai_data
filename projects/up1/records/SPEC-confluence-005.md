---
id: SPEC-confluence-005
project: up1
type: doc
module: confluence
---

# Desarrollo

Seccion: Desarrollo
Link: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984266251
Tags: `setup` `entorno-local` `mods` `workflow` `comandos` `npm` `docker`

Todo lo que un desarrollador necesita para configurar su entorno y trabajar en UP1.

---

## Configurar el entorno local

- **ID**: 1982955549
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1982955549
- **Tags**: `setup` `entorno-local` `backend` `frontend` `docker` `npm`

### Prerequisitos
- Node.js 22.12+
- PostgreSQL corriendo localmente
- SSH key configurada con acceso a Bitbucket
- Docker Desktop (para servicios opcionales)

### Instalacion
```shell
npm install
npm run setup    # valida Node, clona repos, instala deps, checkout develop
```

### Variables de entorno
Archivo `.env` en raiz. NUNCA editar `.env` de cada workspace.

| Prefijo | Para quien |
|---------|-----------|
| `PG_*`, `DATABASE_URL` | Object Manager |
| `SUITE_*` | Suite |
| `N8N_*`, `DB_POSTGRESDB_*` | Flow |

### Levantar servidores
```shell
# Backend (Object Manager) — localhost:4000
npm run dev --workspace=@uplanner/object-management-backend

# Frontend (Suite) — localhost:3000
npm run dev --workspace=@uplanner/suite
```

### Servicios opcionales (Docker)
```shell
docker compose --profile worker up -d      # Redis + Worker
docker compose --profile flow up -d        # Flow (n8n) — localhost:5678
docker compose --profile development up -d # Storybook — localhost:6006
```

---

## Flujo de trabajo con Mods

- **ID**: 1983217683
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983217683
- **Tags**: `mods` `workflow` `desarrollo` `sync`

### Ciclo basico
```
1. Modificar archivos en mods/<mi-mod>/
2. npm run sync
3. Verificar en servidor
```

### Pasos adicionales segun tipo de cambio

| Cambio | Pasos adicionales |
|--------|------------------|
| Nuevo objeto/campo en `objects/` | `npm run codegen` → `npx prisma migrate dev` → `npm run sync` |
| Resolver custom en `logic/` | `npm run sync` → reiniciar Object Manager |
| Componente Vue en `modsComponents/` | `npm run sync` → hot reload automatico |
| Traduccion en `lang/` | `npm run sync` → reiniciar Suite |
| Estilo en `css/` | `npm run sync` → hard refresh browser |
| Evento en `events/` | `npm run sync` (recarga cache auto) |
| Layout en `config/layouts/` | `npm run sync` (upsert en DB) |

### Archivos que NUNCA se editan
- `suite/modsComponents/`, `suite/lang/`, `suite/css/mods/` (destinos del sync)
- `prisma/schema.prisma`, `typeDefs/dynamic.js` (archivos generados)

---

## Crear un Mod desde cero

- **ID**: 1982890013
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1982890013
- **Tags**: `mods` `creacion` `estructura` `npm` `bitbucket`

### Pasos
1. Crear repo en Bitbucket bajo `uplanner/`
2. Registrar en `package.json` raiz (array `uPlannerMods`)
3. Correr `npm run setup`

### Estructura minima
```
mods/mi-nuevo-mod/
├── package.json         ← @uplanner/mi-nuevo-mod
├── capabilities.json    ← [] si no hay permisos custom
└── config/
    └── app.json         ← registro de la app en Suite
```

### config/app.json minimo
```json
{
  "name": "mi-nuevo-mod",
  "label": "Mi Modulo",
  "icon": "bi-grid",
  "order": 10,
  "roles": ["Admin"],
  "tenants": ["TEST"],
  "version": "1.0.0"
}
```

### Carpetas opcionales
objects/, logic/, modsComponents/, config/layouts/, css/, lang/, events/, seed/

### Validar
```shell
npm run sync && npm run check-mods
```

---

## Comandos de referencia

- **ID**: 1983512597
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983512597
- **Tags**: `comandos` `referencia` `npm` `cli`

### Monorepo (raiz)
| Comando | Para que |
|---------|---------|
| `npm run setup` | Primer setup completo |
| `npm run sync` | Sincronizar mods a workspaces core |
| `npm run update-repos` | Pull latest de todos los repos |
| `npm run check-mods` | Validar estructura de mods |

### Object Manager
```shell
npm run dev --workspace=@uplanner/object-management-backend
npm test --workspace=@uplanner/object-management-backend
npm run codegen --workspace=@uplanner/object-management-backend
npm run tenant:migrate --workspace=@uplanner/object-management-backend
npm run tenant:create --workspace=@uplanner/object-management-backend
npm run tenant:studio --workspace=@uplanner/object-management-backend
npm run seed --workspace=@uplanner/object-management-backend
```

### Suite
```shell
npm run dev --workspace=@uplanner/suite
npm run build --workspace=@uplanner/suite
```

### Layout
```shell
npm run dev --workspace=@uplanner/layout-engine
npm run storybook --workspace=@uplanner/layout-engine
npm run build --workspace=@uplanner/layout-engine
```

### Docker
```shell
docker compose up                            # Core
docker compose --profile worker up -d       # + Redis + Worker
docker compose --profile flow up -d         # + Flow (n8n)
docker compose --profile development up -d  # + Storybook
```
