# Que es UP1

## Vision general

UP1 (uPlanner One) es una plataforma multi-tenant modular para instituciones educativas. Un solo despliegue sirve a multiples clientes (universidades, institutos) con datos aislados a nivel de aplicacion.

La plataforma se extiende mediante **mods** — modulos autocontenidos que agregan funcionalidad sin modificar el core. Un mod puede tener su propio modelo de datos, API, UI, traducciones, estilos y permisos.

## Arquitectura

```
Mods (extensions)
  │
  │  npm run sync (8 fases)
  ▼
┌─────────────────────────────────────────────────────────┐
│                    UP1 Core Workspaces                   │
│                                                          │
│  ┌──────────────┐    ┌────────┐    ┌───────┐            │
│  │Object Manager│◄───│ Layout │◄───│ Suite │◄── Usuario │
│  │  (GraphQL)   │    │  (UI)  │    │(Nuxt) │            │
│  └──────┬───────┘    └────────┘    └───────┘            │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐    ┌────────┐                          │
│  │  PostgreSQL  │    │  Flow  │ (n8n workflows)          │
│  └──────────────┘    └────────┘                          │
└─────────────────────────────────────────────────────────┘
```

### Flujo de datos

```
Usuario → Suite (Nuxt 4, :3000) → LayoutOrchestrator → GraphQL → Object Manager (:4000) → PostgreSQL
```

1. El usuario navega a `/{tenant_id}/{ObjectName}/{LayoutType}/{layoutId}`
2. **Suite** carga la pagina, resuelve el tenant, y delega el renderizado a **LayoutOrchestrator**
3. **LayoutOrchestrator** lee la configuracion del layout (JSON en DB) y renderiza el componente correcto: RecordList, RecordDetail, o ChibiList
4. Los componentes hacen queries/mutations **GraphQL** al Object Manager
5. **Object Manager** valida permisos, filtra por tenant, y opera contra PostgreSQL via Prisma

### Workspaces del monorepo

| Workspace | Puerto | Rol | Stack |
|-----------|--------|-----|-------|
| **object-manager** | 4000 | Backend GraphQL API: CRUD, multi-tenant, codegen, eventos | Node.js, Express, Apollo Server 5, Prisma |
| **layout** | 6006 (Storybook) | Libreria de componentes UI: Atomic Design, LayoutOrchestrator | Vue 3, Bootstrap 5, Vueform |
| **suite** | 3000 | Frontend principal: routing, auth, i18n, themes | Nuxt 4, Vue 3, Auth0 |
| **flow** | 5678 | Motor de workflows: eventos asincrono | n8n (fork custom), BullMQ |
| **report-builder** | — | Reporteria: tablas pivot | Flexmonster |
| **mods** | — | Extensiones modulares: features por dominio | Depende del mod |

## Conceptos clave

### Multi-tenant

Una sola instancia de la aplicacion sirve a multiples instituciones. El aislamiento es a nivel de aplicacion, no de base de datos:

- **URL**: `/{tenant_id}/...` — el tenant se extrae de la URL
- **Header**: toda request GraphQL lleva `X-Tenant-ID`
- **Queries**: **toda query DEBE filtrar por `tenantId`** — sin excepcion
- **Temas**: cada tenant puede tener su propio CSS en `themes/{tenant_id}/theme.css`

### Schema-driven development

Los objetos de negocio se definen como **archivos JSON** — son la fuente de verdad del modelo de datos:

```
JSON objects → npm run codegen → Prisma schema → GraphQL types → API lista
```

No se escribe schema Prisma ni types GraphQL manualmente. Se define el JSON, se corre codegen, y el sistema genera todo.

### Sync mechanism

Los mods NO modifican archivos del core. En su lugar, el mecanismo de sync copia artefactos del mod a los workspaces correctos:

```
npm run sync
```

Ejecuta 8 fases: Mirror → Merge → Capabilities → Logic → Apps & Layouts → Default Layouts → Seeds → Prisma Schema. Cada fase copia un tipo de artefacto al workspace que lo necesita.

**Regla critica**: nunca editar archivos en los destinos de sync (`suite/modsComponents/`, `suite/lang/`, `suite/css/mods/`, `layout/src/modsComponents/`). Editar siempre en `mods/{mod}/` y correr sync.

### LayoutOrchestrator

El componente central de la UI. Suite **nunca** usa RecordList o RecordDetail directamente — todo pasa por LayoutOrchestrator, que:

- Lee la configuracion del layout (JSON almacenado en DB)
- Decide que componente renderizar segun `layoutType`
- Procesa sub-layouts, nested components, y placeholders como `{{parentId}}`
- Maneja la navegacion entre layouts (list → detail → sublists)

### RBAC (permisos)

Tres capas de control de acceso:

1. **Capabilities**: definidas en `capabilities.json` del mod. Formato: `mod/<modname>:<action>`
2. **Backend**: resolvers protegidos con `withAuth([capabilities], resolver)`
3. **Frontend**: row actions con `requiredCapability`, layouts con `roles` array

## Stack tecnico

| Capa | Tecnologia |
|------|-----------|
| Runtime | Node.js 22.12+ |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| API | GraphQL (Apollo Server 5) |
| Cache / Colas | Redis, BullMQ |
| Frontend | Nuxt 4, Vue 3 (Composition API) |
| UI | Bootstrap 5 (encapsulado en Atomic Design) |
| Forms | Vueform |
| Auth | Auth0 (cookies HTTP-only) |
| i18n | Sistema propio con 6 niveles de override |
| CSS | CSS Layers + Design Tokens (`var(--up1-*)`) |
| Testing | Vitest, Storybook |
| Workflows | n8n (fork custom) |

## Servicios para desarrollo local

```bash
# Levantar todo
docker compose up

# O servicios individuales
npm run dev --workspace=@uplanner/object-management-backend   # :4000
npm run dev --workspace=@uplanner/suite                       # :3000
npm run storybook --workspace=@uplanner/layout-engine         # :6006
docker compose --profile flow up -d                           # :5678 (n8n)
docker compose --profile worker up -d                         # BullMQ worker
```

## Comandos esenciales

```bash
npm run sync               # Sincronizar artefactos de mods a core
npm run codegen --workspace=@uplanner/object-management-backend  # Generar schema desde JSON objects
npx prisma migrate dev     # Aplicar migraciones a la DB
npm run seed --workspace=@uplanner/object-management-backend     # Seed de datos de prueba
npm run check-mods         # Validar estructura de mods
```

## Glosario rapido

| Termino | Significado |
|---------|-----------|
| **Object** | Entidad de negocio definida como JSON (ej: Person, Student, Course) |
| **Layout** | Configuracion JSON que define como se muestra un objeto (list, detail, form) |
| **Mod** | Modulo autocontenido que extiende UP1 con objects, layouts, components, i18n |
| **Resolver** | Funcion GraphQL custom (query o mutation) |
| **Capability** | Permiso granular: `mod/my-mod:do_something` |
| **Tenant** | Institucion cliente aislada dentro de la misma instancia |
| **Sync** | Proceso que copia artefactos de mods a los core workspaces |
| **Codegen** | Proceso que genera Prisma schema + GraphQL types desde JSON objects |
| **LayoutOrchestrator** | Componente Vue que renderiza dinamicamente layouts segun config JSON |
| **RecordList** | Componente de listado (tabla con filtros, busqueda, acciones) |
| **RecordDetail** | Componente de detalle (formulario con tabs, modos view/edit/create) |
| **Design Token** | Variable CSS (`var(--up1-*)`) que controla colores, spacing, tipografia |

---

Siguiente: [01 — Desarrollar mods](01-desarrollar-mods.md)
