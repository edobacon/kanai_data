---
id: SPEC-confluence-004
project: up1
type: spec
module: confluence
tags: []
---

# Capacidades del Sistema

Seccion: Capacidades del Sistema
Link: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983053836
Tags: `layouts` `rbac` `eventos` `i18n` `theming` `css` `permisos`

Features transversales que atraviesan workspaces.

```text
  ┌─────────────────────────────────────┐
  │               Suite                 │
  └──────┬──────────┬──────────┬────────┘
         │          │          │
         ▼          ▼          ▼
  ┌────────────┐ ┌──────┐ ┌─────────┐
  │Layout Engine│ │ RBAC │ │  i18n   │
  └──────┬──────┘ └──┬───┘ └─────────┘
         │           │
         │     ┌─────┘
         ▼     ▼
  ┌────────────────┐      ┌─────────┐
  │  Object Manager│─────>│  RBAC   │
  └───────┬────────┘      └─────────┘
          │
          ▼
  ┌────────────────┐
  │   Flow Engine  │
  └────────────────┘

  (Suite tambien conecta a Theming de forma directa)
  ┌─────────┐
  │ Theming │
  └─────────┘
```

---

## Sistema de Layouts

- **ID**: 1984626699
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984626699
- **Tags**: `layouts` `vistas` `configuracion` `json` `recordlist` `recorddetail`

Un layout = configuracion JSON que define como se ve y comporta una vista. Se almacenan en BD y se renderizan dinamicamente.

**LayoutOrchestrator** es el punto unico de entrada. Suite NUNCA instancia componentes de layout directamente.

**Tipos disponibles:**

| layoutType | Para que |
|-----------|---------|
| RecordList | Tablas CRUD con busqueda, filtros, paginacion, acciones |
| RecordDetail | Formularios crear/editar/ver. Soporta tabs, steps, listas embebidas |
| ChibiList | Lista compacta para sidebars o mobile |
| OfferingCalendar | Vista de calendario |
| ImportTaskList | Flujos de importacion y tareas secuenciales |
| AiChatbox | Widget conversacional de IA |

**Convencion de nombres:** `default_{ObjectName}_{mode}` (ej: `default_Person_view`)

Layouts se definen en mods (`config/layouts/`) y se sincronizan a BD via `npm run sync`.

---

## RBAC & Permisos

- **ID**: 1984790532
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984790532
- **Tags**: `rbac` `permisos` `roles` `capabilities` `seguridad`

Modelo: `Usuario -> Roles -> Capabilities (permisos)`. Multiples roles se acumulan.

**Nivel de objeto:**
```
person:view    -> ver registros
person:create  -> crear
person:modify  -> editar
person:delete  -> eliminar
```

**Nivel de campo** (sobreescribe objeto):
```
person.salary:view    -> ver campo salario
person.salary:modify  -> editar campo salario
```

**Contextos jerarquicos:**
```
/system
  └─ /system/tenant-123
      └─ /system/tenant-123/institution-456
```

**Capabilities de mods:** cada mod define en `capabilities.json`. Convencion: `suite:*` para Suite, `mod/<nombre>:*` para mods.

Referencia: `object-manager/docs/features/rbac-system.md`

---

## Sistema de Eventos

- **ID**: 1984462859
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984462859
- **Tags**: `eventos` `asincronico` `bullmq` `redis` `n8n` `flow`

Sistema asincronico basado en **BullMQ** y **Redis**.

**Flujo:**
```
GraphQL Mutation
  -> withEventPublish() decorator
  -> BullMQ Queue (Redis)
  -> Event Worker (logica async)
  -> Redis Pub/Sub -> Flow (n8n)
```

**Definicion de evento** (JSON en `mods/{mod}/events/`):
```json
{
  "id": "enrollment:created",
  "trigger": {
    "objectType": "EventEnrollment",
    "operation": "create"
  },
  "includeFields": ["id", "eventId", "userId", "status"]
}
```

Operaciones: `create`, `update`, `delete`. Soporte para condiciones en trigger.

Worker corre como proceso separado: `docker compose --profile worker up -d`

---

## Internacionalizacion

- **ID**: 1983938569
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983938569
- **Tags**: `i18n` `traducciones` `localizaciones` `tenant`

BD almacena claves, no texto plano. Texto se resuelve en runtime.

**Jerarquia de resolucion** (mayor prioridad primero):
1. Objeto + Layout
2. Objeto
3. Layout
4. Institucion
5. Pais
6. Idioma

**Estructura:** `lang/es_CL.json` (base), `lang/es_CL@Person.json` (override por objeto)

Templates siempre usan `$t('clave')`, NUNCA texto hardcodeado.

Traducciones en mods se sincronizan a `suite/lang/` via `npm run sync`.

---

## Theming & CSS

- **ID**: 1984004105
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984004105
- **Tags**: `theming` `css` `design-tokens` `layers` `personalizacion` `variables-css`

Sistema de estilos en capas (`@layer`) con design tokens centralizados.

**Principio:** todos los estilos usan variables CSS (`var(--up1-color-primary)`). Sin valores hardcodeados.

**Capas base:**
```css
@layer reset, tokens, structure, components, utilities;
```

**Capas semanticas:**
```css
@layer theme, objectName, viewType, objectId, contextId;
```

**Theming por tenant:** `suite/themes/{tenant_id}/theme.css`

**Clases semanticas aplicadas al contenedor:**
```html
<div class="theme-upu path-person view-recordlist">
```

**CSS en mods:** `css/1-theme/`, `css/2-objectName/`, `css/3-viewType/` → se sincronizan a `suite/css/mods/`
