---
id: SPEC-confluence-003
project: up1
type: spec
module: confluence
tags: []
---

# Arquitectura uP1

Seccion: Arquitectura
Link: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983053828
Tags: `arquitectura` `multi-tenant` `mods` `graphql` `schema-driven` `codegen` `prisma` `yupi`

---

## Vision general

- **ID**: 1982824462
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1982824462
- **Tags**: `arquitectura` `layered-design` `object-manager` `workspaces`

UP1 esta organizado en capas con dependencias hacia abajo:

```text
  ┌────────────────────────┐
  │   Suite                │
  │   (Frontend Nuxt 4)    │
  └──────────┬─────────────┘
             ▼
  ┌────────────────────────┐
  │   Mods                 │
  │   (logica de dominio)  │
  └──┬──────┬──────┬───┬───┘
     │      │      │   │
     ▼      ▼      ▼   ▼
  ┌──────┐┌─────┐┌──────┐┌──────┐
  │Layout││Flow ││Report││ Yupi │
  └──┬───┘└──┬──┘└──┬───┘└──┬───┘
     │       │      │       │
     └───────┴──────┴───────┘
                    │
                    ▼  (tambien desde Mods)
  ┌────────────────────────┐
  │     Object Manager     │
  │      (GraphQL API)     │
  └──────────┬─────────────┘
             ▼
  ┌────────────────────────┐
  │      (PostgreSQL)      │
  └────────────────────────┘
```

**Componentes principales:**
- **Object Manager**: piedra angular. API GraphQL unica, fuente de verdad. Ningun workspace accede a BD directamente.
- **Layout, Flow, Report Builder, Yupi**: ladrillos genericos sin logica de dominio.
- **Mods**: extensiones autonomas por area de negocio (Retencion, Curriculum, etc.).
- **Suite**: frontend Nuxt 4 que integra todo.

**Flujo de una accion:**
1. Usuario interactua con Suite
2. Suite llama a Object Manager via GraphQL
3. Object Manager ejecuta resolvers del Mod
4. Si corresponde, dispara evento hacia Flow (async)
5. Respuesta vuelve a Suite

---

## El modelo multi-tenant

- **ID**: 1983119367
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983119367
- **Tags**: `multi-tenant` `aislamiento` `tenant-context`

Un tenant = una institucion cliente con datos aislados. Una sola instancia en produccion.

**Mecanismo:**
- Cada request incluye header `X-Tenant-ID`
- Object Manager enruta a la BD correcta
- Imposible que datos de un tenant sean visibles para otro

**Tipos de objetos:**

| Tipo | Descripcion | Ejemplo |
|------|-------------|---------|
| Base | Compartidos por todos | `Person`, `Institution` |
| Extended | Campos custom por tenant | `ext__UPU__person` |
| Tenant-specific | Solo existen para un tenant | `ResearchProject` en UPU |

**Implicaciones para desarrollo:**
- Toda query DEBE incluir `tenantId`
- Objetos custom van en carpeta tenant dentro del repo

---

## Schema-driven development

- **ID**: 1984626689
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984626689
- **Tags**: `schema-driven` `codegen` `prisma` `graphql` `automation`

Los objetos JSON son la fuente de verdad. Todo se deriva de ellos.

**Ciclo de vida:**
```text
  ┌────────────────┐
  │ JSON definition│
  └───────┬────────┘
          ▼
  ┌────────────────┐
  │    Codegen     │
  └───────┬────────┘
          │
    ┌─────┴──────────┐
    ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Prisma schema│  │GraphQL types │
└──────┬───────┘  └──────────────┘
       ▼
┌──────────────┐
│   Migrate    │
└──────┬───────┘
       ▼
┌──────────────┐
│     (BD)     │
└──────────────┘
```

**Reglas:**
- NUNCA editar `prisma/schema.prisma` a mano (archivo generado)
- NUNCA escribir tipos GraphQL a mano (tambien generados)
- Para agregar campo: modificar JSON → `npm run codegen`
- La API refleja siempre el estado actual de los objetos

Referencia tecnica: `object-manager/docs/reference/codegen-system.md`

---

## El sistema de Mods

- **ID**: 1984397314
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984397314
- **Tags**: `mods` `extensibilidad` `sync` `modular-architecture`

Un mod = extension autonoma que representa un area funcional.

**Estructura de un mod** (`mods/<nombre>/`):

| Carpeta | Que define | Destino del sync |
|---------|-----------|-----------------|
| `objects/` | Objetos de negocio (JSON) | Object Manager |
| `logic/` | Resolvers GraphQL custom | Object Manager |
| `modsComponents/` | Componentes Vue | Layout + Suite |
| `config/layouts/` | Configuracion de vistas | Base de datos |
| `css/` | Estilos del modulo | Suite |
| `lang/` | Traducciones i18n | Suite |
| `events/` | Definiciones de eventos BullMQ | Object Manager |

**Mecanismo de sync:**
```
mods/retention/objects/ --sync--> object-manager/objects/
mods/retention/logic/   --sync--> object-manager/resolvers/
mods/retention/css/     --sync--> suite/css/mods/
mods/retention/lang/    --sync--> suite/lang/
```

**Regla fundamental:** NUNCA editar archivos en los destinos del sync. Todos los cambios en la carpeta del mod. Despues: `npm run sync`.

---

## Glosario

- **ID**: 1983315977
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983315977
- **Tags**: `glosario` `definiciones` `referencia`

### Conceptos generales
- **UP1**: plataforma central de uPlanner para instituciones educativas
- **Tenant**: institucion cliente con datos aislados
- **Mod**: extension autonoma por area funcional
- **Workspace**: paquete npm independiente en el monorepo
- **Monorepo**: un unico repo Git con todos los workspaces
- **Sync**: proceso que copia artefactos del mod a workspaces core (`npm run sync`)

### Workspaces
- **Object Manager**: backend GraphQL API, fuente de verdad
- **Suite**: frontend Nuxt 4, app del usuario final
- **Layout**: libreria de componentes UI (RecordList, RecordDetail, ChibiList)
- **Flow**: motor de workflows asincronicos (n8n)
- **Report Builder**: modulo de reportes

### Datos y API
- **Objeto**: entidad de negocio en JSON (Person, Institution, AcademicPeriod)
- **Codegen**: genera Prisma schema y tipos GraphQL desde JSONs
- **GraphQL**: toda operacion de datos pasa por aqui
- **Resolver**: funcion que atiende query/mutation GraphQL
- **Prisma**: ORM generado automaticamente

### UI y Layouts
- **RecordList**: tabla con busqueda, filtros, paginacion
- **RecordDetail**: formulario para ver/editar registro
- **ChibiList**: version compacta de RecordList
- **LayoutOrchestrator**: componente central que decide que renderizar
- **Layout config**: JSON que define como se ve/comporta una vista

### Seguridad
- **RBAC**: control de acceso basado en roles
- **Capability**: permiso especifico asignable (ej: `person:edit`)
- **Tenant context**: header `X-Tenant-ID`

### i18n y estilos
- **Translation key**: identificador de texto traducible (ej: `app.planning.label`)
- **Design token**: variable CSS (`var(--up1-color-primary)`)
- **Theme**: CSS por tenant que sobreescribe tokens base

---

## YUPI

- **ID**: 1984495619
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984495619
- **Tags**: `yupi` `agente-ia` `conversacional` `langgraph`

Yupi = nombre publico del agente de IA de uPlanner. Asistente conversacional con acceso al contexto institucional de cada tenant. Aprovecha la generalizacion de UP1 para acceder a todas las acciones.

**Estado actual:** en migracion hacia **LangGraph** como motor de orquestacion.

---

## Carga de Datos en el Object-Manager

- **ID**: 1998028802
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1998028802
- **Tags**: `api` `graphql` `integraciones` `migracion-datos` `carga-masiva` `upload` `rest`

Guia completa para cargar datos a UP1 via API.

**Endpoints:**

| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `/graphql` | POST | CRUD de registros |
| `/upload` | POST | Subir archivos Excel/CSV |

**Autenticacion:**
- `X-Tenant-ID` (obligatorio)
- `Authorization: Bearer <service-token>` o Clerk JWT

**Operaciones principales:**
- `createInstance`: registro individual
- `importInstances`: carga masiva (sync <=500 filas, async >500)
- `updateBulkInstances`: actualizacion masiva
- `deleteBulkInstances`: eliminacion masiva
- `listInstances`: consulta con filtros (EQUALS, CONTAINS, GREATER_THAN, etc.)
- `getObjectFields`: consultar campos de un objeto
- `getObjectDefinitions`: ver que objetos existen

**Flujo Excel:** subir archivo (`/upload`) → preview (`previewImport`) → importar (`importInstances`)

**Validaciones automaticas:** campos requeridos, tipos, FK referencial, unicidad, ObjectValidation (formulas Excel)

**Limites:**
- JSON body max: 100KB
- Umbral sync/async: 500 filas (configurable via `IMPORT_SYNC_THRESHOLD`)
- Rate limiting: no configurado actualmente
