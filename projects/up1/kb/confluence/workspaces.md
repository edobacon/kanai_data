---
id: SPEC-confluence-009
project: up1
type: spec
module: confluence
tags: []
---

# Workspaces

Seccion: Workspaces
Link: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1982890003
Tags: `object-manager` `suite` `layout-engine` `flow` `report-builder` `monorepo`

Referencia rapida de cada workspace del monorepo.

---

## Object Manager Workspace

- **ID**: 1982955527
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1982955527
- **Tags**: `object-manager` `backend` `graphql` `api` `prisma` `postgresql` `rbac` `multi-tenant`

**Rol:** Piedra angular del sistema. Backend GraphQL centralizado.

**Que hace:**
- API GraphQL unica para todos los workspaces y mods
- Gestiona esquema multi-tenant en PostgreSQL via Prisma
- Genera automaticamente Prisma schema y tipos GraphQL desde JSON (codegen)
- Aplica aislamiento de datos por tenant
- Ejecuta resolvers de mods
- Gestiona RBAC: roles, capabilities, permisos

**Consumidores:**
| Quien | Para que |
|-------|---------|
| Suite | Queries y mutations de datos |
| Layout | Consultas GraphQL para renderizar |
| Flow | Disparar/escuchar eventos |
| Mods | Aportan objetos, resolvers, eventos |
| YUPI | Consume resolvers para acciones |

**Reglas:** toda operacion pasa por aqui, nunca acceso directo a PostgreSQL. Archivos generados nunca se editan.

Docs: `object-manager/docs/`

---

## Suite Workspace

- **ID**: 1983479823
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983479823
- **Tags**: `suite` `frontend` `nuxt` `spa` `multi-tenant` `routing` `i18n`

**Rol:** Frontend Nuxt 4. La cara visible del sistema.

**Puerto local:** `localhost:3000/{tenant_id}`

**Que hace:**
- Renderiza componentes de Layout via LayoutOrchestrator
- Consulta datos al Object Manager via GraphQL (Apollo)
- Integra componentes/estilos de los Mods (via sync)
- Gestiona rutas multi-tenant: `/{tenant_id}/{objectName}/{layoutName}`
- i18n por tenant
- Theming CSS por tenant
- Auth via Auth0

**URL structure:** `/{tenant_id}/{objectName}/{layoutName}`

**Lo que NUNCA hace:** importar RecordList/RecordDetail directamente, acceder a BD, hardcodear textos/estilos.

Docs: `suite/docs/`

---

## Layout Engine Workspace

- **ID**: 1984102409
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984102409
- **Tags**: `layout` `componentes` `ui` `atomic-design` `design-tokens`

**Rol:** Libreria de componentes UI reutilizables.

**Componentes principales:**

| Componente | Que renderiza |
|-----------|--------------|
| RecordList | Tablas con busqueda, filtros, paginacion, acciones |
| RecordDetail | Formularios crear/editar/ver |
| ChibiList | Lista compacta para sidebars/mobile |
| LayoutOrchestrator | Decide dinamicamente que renderizar |

**Regla de oro:** Suite NUNCA importa componentes directamente. Todo via LayoutOrchestrator.

**Atomic Design:** Atoms (Button, Input, Icon) → Molecules (SearchBar, TableCell) → Organisms (Table, CardGrid). Atoms encapsulan Bootstrap. Design tokens: `var(--up1-*)`.

Docs: `layout/docs/`

---

## Flow Engine Workspace

- **ID**: 1984757776
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984757776
- **Tags**: `flow` `workflow` `n8n` `eventos` `async` `bullmq` `redis`

**Rol:** Motor de workflows asincronicos (fork de n8n).

**Casos de uso:** notificaciones, integraciones externas, orquestacion multi-tenant.

**Flujo:**
```
GraphQL Mutation → Object Manager → BullMQ Queue → Worker → Flow (n8n)
```

**Nodos custom para UP1:**

| Nodo | Para que |
|------|---------|
| Up1RedisCreate/Update/Delete | Escuchar eventos CUD de objetos |
| Up1RedisTrigger | Trigger generico por canal Redis |
| Up1Notification | Envio de notificaciones (mail o internas) |

Docs: `flow/.ai/`

---

## Report Builder Workspace

- **ID**: 1984102416
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984102416
- **Tags**: `report-builder` `reporteria` `analisis` `pivot` `flexmonster`

**Rol:** Modulo de reporteria y analisis.

**Capacidades:**
- Tablas pivot interactivas con drag-and-drop (Flexmonster)
- Visualizacion en tiempo real
- Exportacion a Excel, PDF y CSV
- Plantillas de reportes reutilizables
- Vista dashboard y vista lista

Sigue patron de mod: componentes, layouts y resolvers se sincronizan a workspaces core via `npm run sync`.

```
report-builder/logic/           → object-manager (resolvers + schema)
report-builder/modsComponents/  → layout + suite
```

Docs: `report-builder/README.md`
