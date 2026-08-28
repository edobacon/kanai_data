---
id: SPEC-confluence-001
project: up1
type: doc
module: confluence
---

# uP1 — Matriz de Conocimiento (Confluence)

Fuente: [Espacio uP1 en Confluence](https://u-planner.atlassian.net/wiki/spaces/uP1)
Fecha de extraccion: 2026-04-07
Total de paginas: 85

## Estructura del espacio

```text
                        ┌─────────────────────┐
                        │    uP1 Confluence    │
                        └──────────┬──────────┘
          ┌───────────┬────────────┼────────────┬───────────┐
          ▼           ▼            ▼            ▼           ▼
  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │Arquitectura│ │Capacidades│ │Desarrollo│ │Workspaces│ │Operaciones│
  └────────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
          │
    ┌─────┴──────────┬──────────┐
    ▼                ▼          ▼
┌────────┐     ┌─────────────┐ ┌────────┐
│  Apps  │     │   Layouts   │ │ Legacy │
│        │     │             │ │        │
└───┬────┘     └─────────────┘ └────────┘
    ▼
┌──────────────────┐
│Learning Assurance│
└──────────────────┘
```

## Matriz por seccion

| Seccion | Archivo | Paginas | Tags principales |
|---------|---------|---------|------------------|
| Arquitectura | [arquitectura.md](arquitectura.md) | 8 | arquitectura, multi-tenant, mods, graphql, schema-driven, codegen |
| Capacidades | [capacidades.md](capacidades.md) | 6 | layouts, rbac, eventos, i18n, theming, css |
| Desarrollo | [desarrollo.md](desarrollo.md) | 5 | setup, entorno-local, mods, workflow, comandos, npm |
| Workspaces | [workspaces.md](workspaces.md) | 6 | object-manager, suite, layout-engine, flow, report-builder |
| Operaciones | [operaciones.md](operaciones.md) | 3 | deploy, aws, ecs, docker, troubleshooting |
| Apps (Learning Assurance) | [apps-learning-assurance.md](apps-learning-assurance.md) | 9 | curriculum, assessment, competencias, acreditacion, integraciones |
| Layouts (detalle) | [layouts-detalle.md](layouts-detalle.md) | 7 | record-list, record-detail, chibi-list, configuracion, campos |
| Legacy | [legacy.md](legacy.md) | 6+ | coding-standards, objetos-negocio, data-table, convenciones |

## Indice de tags

| Tag | Paginas donde aparece |
|-----|----------------------|
| `arquitectura` | Vision general, Arquitectura uP1, Arquitectura de UP1 (legacy) |
| `multi-tenant` | El modelo multi-tenant, Suite Workspace, Object Manager Workspace |
| `mods` | El sistema de Mods, Crear un Mod desde cero, Flujo de trabajo con Mods |
| `graphql` | Object Manager Workspace, Schema-driven development, Carga de Datos |
| `schema-driven` | Schema-driven development |
| `codegen` | Schema-driven development, Flujo de trabajo con Mods |
| `layouts` | Sistema de Layouts, Layout Engine Workspace, Doc de Layouts (7 pags) |
| `rbac` | RBAC & Permisos |
| `permisos` | RBAC & Permisos |
| `eventos` | Sistema de Eventos, Flow Engine Workspace |
| `i18n` | Internacionalizacion |
| `theming` | Theming & CSS |
| `css` | Theming & CSS |
| `setup` | Configurar el entorno local |
| `workflow` | Flujo de trabajo con Mods, Flow Engine Workspace |
| `comandos` | Comandos de referencia |
| `npm` | Comandos de referencia, Configurar entorno local |
| `docker` | Configurar entorno local, Deploy en AWS |
| `object-manager` | Object Manager Workspace, Object Manager (legacy) |
| `suite` | Suite Workspace |
| `nuxt` | Suite Workspace |
| `flow` | Flow Engine Workspace |
| `n8n` | Flow Engine Workspace, Sistema de Eventos |
| `bullmq` | Sistema de Eventos |
| `redis` | Sistema de Eventos, Flow Engine Workspace |
| `report-builder` | Report Builder Workspace |
| `flexmonster` | Report Builder Workspace |
| `deploy` | Deploy en AWS |
| `aws` | Deploy en AWS |
| `ecs` | Deploy en AWS |
| `troubleshooting` | Troubleshooting |
| `prisma` | Schema-driven development, Object Manager Workspace |
| `postgresql` | Object Manager Workspace |
| `curriculum` | Curriculum Management, Curriculum Mapping |
| `assessment` | Learning Assessment |
| `competencias` | Curriculum Mapping, Learning Assessment |
| `acreditacion` | Learning Assessment |
| `integraciones` | Integraciones, Carga de Datos |
| `banner` | Integraciones |
| `anthology` | Integraciones |
| `lms` | Integraciones |
| `yupi` | YUPI |
| `ia` | YUPI, Curriculum Management (IA), Curriculum Mapping (IA) |
| `record-list` | RecordList (ES/EN), Layouts por Defecto |
| `record-detail` | RecordDetail (ES/EN), Layouts por Defecto |
| `atomic-design` | Layout Engine Workspace |
| `design-tokens` | Theming & CSS, Layout Engine Workspace |
| `api` | Carga de Datos en Object-Manager |
| `carga-masiva` | Carga de Datos en Object-Manager |
| `objetos-negocio` | Objetos de negocio, ejes (legacy) |
| `legacy` | Coding Standards, Objetos de negocio, Data Table, Convenciones |

## Paginas en construccion

| Pagina | Estado |
|--------|--------|
| Learning Pathways | En definicion funcional |
| Course Catalog | En definicion funcional (parcialmente cubierto) |
| Operaciones (infra/pipelines) | En construccion |

## Links rapidos

- Pagina raiz: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984233473
- Arquitectura: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983053828
- Capacidades: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983053836
- Desarrollo: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1984266251
- Workspaces: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1982890003
- Operaciones: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983971340
- Apps: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989181444
- Learning Assurance: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183
- Layouts (ES): https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1944551427
- Layouts (EN): https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1945370638
