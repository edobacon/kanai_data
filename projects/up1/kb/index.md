---
id: SPEC-general-001
project: up1
type: spec
module: general
tags: [up1, uplannerone, indice, arquitectura, object-manager, layout-engine, mods, flow-engine, report-builder, RBAC, multi-tenant, graphql, prisma, nuxt, vue]
repos: [uplanner/up1 (monorepo)]
---
# uP1 (uPlanner One)

Plataforma central de uPlanner para instituciones educativas. Monorepo multi-tenant que integra mods independientes en un solo sistema cohesivo.

> **Antes de actualizar cualquier doc**: leer [mantenimiento.md](mantenimiento.md). Principio rector: **el codigo manda**. Las carpetas `sp*/` son trabajo y analisis de sprint (historico), no fuente de verdad de lo implementado; la doc viva y completa vive en `features/`, `core/`, `curriculum-design/`, `mods/` y `operations/`, verificada contra el codigo real.

```text
                    ┌─────────┐
                    │   uP1   │
                    └────┬────┘
       ┌─────────┬───────┼───────┬──────────┬───────────────────┐
       ▼         ▼       ▼       ▼          ▼                   ▼
  ┌────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐   ┌────────────┐
  │  Core  │ │ Mods │ │Featu-│ │Oper- │ │Confluence│   │  ReAssess  │
  │        │ │      │ │ res  │ │ations│ │          │   │            │
  └────────┘ └──────┘ └──────┘ └──────┘ └──────────┘   └────────────┘
                                              │
                                    ┌─────────────────┐
                                    │Learning Assurance│
                                    └─────────────────┘
```

## Stack

Node.js 22, PostgreSQL, GraphQL (Apollo Server 5), Prisma ORM, Vue 3, Nuxt 4, Bootstrap 5, BullMQ + Redis, n8n (Flow Engine), Flexmonster (Report Builder).

---

## Guias por categoria

### Core — Plataforma base

| Archivo | Descripcion |
|---------|-------------|
| [core/object-manager.md](core/object-manager.md) | Object Manager: arquitectura, schema-driven, codegen, API GraphQL, multi-tenant, RBAC, eventos, interaccion con mods, carga de datos |
| [core/programmatic-interaction.md](core/programmatic-interaction.md) | **Interaccion programatica completa**: 5 niveles (CRUD datos, CRUD estructura, import masivo, seeds, flows n8n), autenticacion headless, service accounts, guia de decision, ejemplos end-to-end |
| [core/programmatic-objects.md](core/programmatic-objects.md) | Creacion programatica de objetos: mutations GraphQL para crear/modificar objetos y campos, pipeline applyChanges, runtime creation, mod editor |
| [core/style-guide.md](core/style-guide.md) | Guia de estilo visual: design tokens, colores (paleta Teal), tipografia (Inter), espaciado, bordes, sombras, atoms, dark mode, CSS en mods |
| [core/layout-workspace.md](core/layout-workspace.md) | **Workspace Layout**: libreria de UI (Vue 3 + Bootstrap 5 + Vueform, Atomic Design), estructura de `src/`, tipos de layout (RecordList, RecordDetail, ChibiList, ConfigPanel, Dashboard), LayoutOrchestrator, Storybook |
| [core/suite-workspace.md](core/suite-workspace.md) | **Workspace Suite**: frontend Nuxt 4 + Clerk, routing por tenant, middleware, stores, `server/` (SSE), plugins (i18n/config), integracion con Layout via LayoutOrchestrator |

### Mods — Sistema de extensiones

| Archivo | Descripcion |
|---------|-------------|
| [mods/llm/INDEX.md](mods/llm/INDEX.md) | **Guia LLM (vibe coding)**: indice con decision tree, 102 recetas atomicas en 12 archivos, validacion self-check. Punto de entrada para desarrollo asistido por LLM |
| [mods/objects-map.md](mods/objects-map.md) | **Mapa de objetos**: como los mods se relacionan con objetos core, diagrama ER, 7 patrones de relacion, guia crear vs extender, referencias cross-mod |
| [mods/creation-guide.md](mods/creation-guide.md) | **Guia principal**: creacion y desarrollo de mods, estructura de archivos, cada carpeta explicada, sync, desarrollo local, convenciones, do's/don'ts, troubleshooting, migraciones BD, deployment |
| [mods/i18n.md](mods/i18n.md) | Capa de lenguaje: arquitectura, archivos por locale/objeto, categorias de claves, integracion con layouts/componentes, sync, cascada, keys transversales, override por tenant |
| [mods/internals.md](mods/internals.md) | Flujo interno de datos: patrones Vueform vs standalone, GraphQL en composables, registro automatico, LayoutOrchestrator, desarrollo local sin Bitbucket |
| [mods/reference.md](mods/reference.md) | Referencia rapida de mods: que son, estructura, sync (9 fases), objetos, resolvers, eventos, flows, layouts, componentes, RBAC, guia para Assessment |
| [mods/example-uengagement.md](mods/example-uengagement.md) | **Ejemplo real: mod uEngagement**: 23 objetos + 7 RecordTypes, resolvers, layouts, flows n8n, teaching coverage, availability time-of-day, RBAC, `StudentLogger` como historial propio. Ojo: NO reemplaza a `retention-wellbeing`, son mods distintos y ambos activos (verificado 2026-08-17) |
| [mods/example-academic-scheduling.md](mods/example-academic-scheduling.md) | **Ejemplo real: mod Academic Scheduling**: 21 objetos, escenarios (Scenario/ScenarioSection/Assignment), Resource N:M, contratos con cascade, rule-set editor, multi-termino via `ScenarioTerm`, limitador de concurrencia |
| [mods/scheduling-algorithm-payload.md](mods/scheduling-algorithm-payload.md) | **Contrato del payload del algoritmo de asignacion** (nuevo, ago 2026): dataset que Academic Scheduling arma para el algoritmo externo en Lambda y el camino de salida via Object Manager. Concentro 5 tickets de fixes en una ventana; el lado Lambda no vive en estos repos, asi que la doc es parcial por definicion |
| [mods/ai-agent.md](mods/ai-agent.md) | **Yupi (ai-agent)**: bridge multicanal (WhatsApp/Telegram), auth por canal, RBAC real por telefono, `/health`, Langfuse |
| [mods/example-up1-manager.md](mods/example-up1-manager.md) | **up1-manager**: consola de administracion de plataforma (Object Manager Editor, Flow Viewer / N8nWorkflow, Report Builder, ConfigPanel, visor de DataLog, editor de transiciones AP-04, editor de JSON Schema, creacion de usuarios admin); reemplaza a `object-manager-editor` y `flow-viewer` |
| [mods/example-curriculum-design.md](mods/example-curriculum-design.md) | **Ejemplo real: mod Curriculum Design**: 12 objetos activos + 13 RecordTypes, estados/transiciones de Activity, versionado, delete en cascada, DataLog, RBAC granular; puntero a la carpeta detallada `curriculum-design/` |
| [mods/example-curriculum-mapping.md](mods/example-curriculum-mapping.md) | **Ejemplo real: mod Curriculum Mapping** (nuevo, jul 2026): dominio LevelScheme via Composite RecordTypes, editor Vueform custom, mutations gobernadas `*Validated` con RBAC server-side manual, soft/hard-delete custom (el core no los soporta para RT), config `cm.displayDecimals`; puntero a la doc in-repo del mod |
| [mods/example-hello-world-mod.md](mods/example-hello-world-mod.md) | **Mod template `hello-world-mod`** (referencia, excluido del sync): 3 objetos + formula engine, 3 resolvers custom (incl. integracion Python + tabla global), eventos+flow n8n, `settings.json` canonico de config (4 dataTypes), RBAC object+field, `homescreen`+`navByRole` con rol interno y tab de dashboards, 24 layouts (tabs, listas embebidas, dashboard mosaic, listas dedicadas a dashboard), componentes Vueform/standalone/modal |
| [mods/example-engagement.md](mods/example-engagement.md) | (Historico, superado) mod Engagement retention-wellbeing: modelo anterior TimeBlockTemplate/TimeBlockAssignment, hoy vacio. Ver example-uengagement.md |

### Features — Capacidades transversales

| Archivo | Descripcion |
|---------|-------------|
| [features/rbac.md](features/rbac.md) | RBAC: modelo de 5 entidades, capabilities (3 niveles), contextos jerarquicos, withAuth, object/field level, sync, frontend, service accounts |
| [features/rbac-examples.md](features/rbac-examples.md) | Ejemplos RBAC: crear permisos, proteger resolvers (6 patrones), layouts con requiredCapability, componentes Vue, composables de mod, field-level, administracion, testing |
| [features/security-hardening.md](features/security-hardening.md) | **Hardening de seguridad** (epica SEC-*, jul 2026): limites GraphQL depth/complexity, Helmet 8, CSP de suite (nuxt-security), timingSafeEqual, JWT expirado a UNAUTHENTICATED, logger estructurado, auditoria de config, requireAuth vs capability |
| [features/report-builder.md](features/report-builder.md) | Report Builder: Flexmonster, templates, pivot, 9 tipos de grafico, API GraphQL, RBAC, integracion con mods, seed data |
| [features/programmatic-reports.md](features/programmatic-reports.md) | Gestion programatica de reportes: CRUD via GraphQL, input types completos, getModelData, duplicar, seed masivo, flujo completo |
| [features/flow-engine.md](features/flow-engine.md) | Flow Engine (n8n): arquitectura, eventos, 6 nodos custom, workflows, sync (Phase 9), session bridge, worker BullMQ, setup, 3 ejemplos reales |
| [features/recorddetail-grouped-tabs.md](features/recorddetail-grouped-tabs.md) | **RecordDetail con multiples bloques por tab** (UPONE-1101): activar la feature en un layout, marker class `up1-embedded-block`, dividers CSS, validacion de tabs con claves invalidas, limitacion de orden no consecutivo, ejemplos del mod curriculum-design |
| [features/delete-cascade.md](features/delete-cascade.md) | **Motor de delete en cascada** (UPONE-1382): query `deleteImpactPreview`, `executeDeletePlan`, deteccion de Restrict con nombres semanticos, atomicidad, DataLog per-nodo, CriticalWarningModal, declaracion de hijos en mods |
| [features/soft-delete.md](features/soft-delete.md) | **Soft-delete global** (PR #415): borrado logico opt-in por `metadata.softDelete`, filtro central en el `$extends` del cliente Prisma (oculta a API, mods, MCP), escape hatch `includeInactive` gateado por capability, rewrite `delete->update` en dos capas, integridad FK forward-only, kill-switch `SOFT_DELETE_GLOBAL_FILTER` |
| [features/datalog.md](features/datalog.md) | **DataLog** (UPONE-1380): historial unificado que reemplaza ChangeLog, atribucion polimorfica hijo hacia padre, `historyKey`, alias RecordType, dos visores (admin y por-registro) |
| [features/enum-transitions.md](features/enum-transitions.md) | **Transiciones de enum/estado** (UPONE-1381, AP-01 a AP-04): `properties.transitions` declarativo, enforcement runtime, `versionableFromStates`, selector que reemplaza el badge read-only, bulk con preview de omitidos |
| [features/config-system.md](features/config-system.md) | **Sistema de Config**: `core_ConfigDefinition`, niveles PLATFORM/MOD/USER, sync Fase 4b, ConfigPanel, `useConfig`, placeholders `{{config:}}`, theme/locale por usuario |
| [features/realtime-sse.md](features/realtime-sse.md) | **Realtime SSE**: endpoint unico en suite (Clerk-auth) para notificaciones y layout-refresh silencioso, push server-to-server, patron para emitir desde un mod |
| [features/recordlist-recorddetail-2026-07.md](features/recordlist-recorddetail-2026-07.md) | **RecordList/RecordDetail (jul 2026)**: boton reload (AP-07), columnas multivalor N:M (UPONE-1334), create por ruta y `hasIntegratedControls` (UPONE-1377) |
| [features/schema-hot-swap.md](features/schema-hot-swap.md) | **Hot-swap de schema** (UPONE-1385/1365): recarga del Prisma client sin restart (nuevos modelos y campos quedan consultables in-process), persistencia de custom fields en runtime, aislamiento y health por tenant |
| [features/dashboard-mosaic.md](features/dashboard-mosaic.md) | **Dashboard / mosaic** (UPONE-1091/1226): layout de widgets en grilla, RecordList y reportes como widgets, contrato JSON del mosaico |
| [features/versioning-cloning.md](features/versioning-cloning.md) | **Versionado y clonacion** (UPONE-1206/1217/1219): `previousVersionId`, `versionableFromStates`, tab Versiones, capabilities `*:clone`, modal `confirmCascade` |

### Operations — Navegacion y setup

| Archivo | Descripcion |
|---------|-------------|
| [operations/local-environment.md](operations/local-environment.md) | **Entorno local**: como levantar/bajar uP1 (up1-start.sh), URLs, puertos, login, logs, sync, troubleshooting |
| [operations/database-reset.md](operations/database-reset.md) | **Reset de BD**: resets duros (full/canonico, bring-up, por tenant, db reset, workaround) + resets blandos (`sync` re-escribe datos de mod por upsert) + parciales (seed/RBAC/schema); alcance/pasos/prerequisitos, guia "que reset para que cambio", caso drift con root cause + fix |
| [operations/ui-elements-guide.md](operations/ui-elements-guide.md) | **Elementos de UI**: guia visual de RecordList (tabla/cards/calendario), RecordDetail (modal/formulario), sidebar, filtros, inline edit, row actions, selectores CSS reales |
| [operations/playwright-navigation.md](operations/playwright-navigation.md) | Navegacion uP1 con Playwright: login Clerk, sidebar, modales, busqueda, edicion inline, helpers reutilizables |
| [operations/n8n-local-setup.md](operations/n8n-local-setup.md) | Setup local de n8n sin Docker: pnpm, crear BD, cuentas owner/member, session bridge, API key rotation, troubleshooting |
| [operations/yupi-deployment.md](operations/yupi-deployment.md) | **Deployment de Yupi + tuning de CI** (UPONE-1435): Yupi via submodulos (up1-Yupi/{ai-core,ai-bridge,ai-observability}), getYupiRepos(), retiro de AI infra embebida, memoria de build Docker 6144 MB, lifecycle de mods (active vs standby) |

### Confluence (extraccion)

Extraccion del espacio Confluence uP1 (85 paginas, 2026-04-07).

| Archivo | Descripcion |
|---------|-------------|
| [confluence/INDEX.md](confluence/INDEX.md) | Indice maestro: estructura del espacio, matriz por seccion, indice de tags |
| [confluence/arquitectura.md](confluence/arquitectura.md) | Vision general, multi-tenant, schema-driven, sistema de mods, YUPI, glosario |
| [confluence/capacidades.md](confluence/capacidades.md) | Features transversales: layouts, RBAC, eventos, i18n, theming CSS |
| [confluence/desarrollo.md](confluence/desarrollo.md) | Guias dev: entorno local, flujo de trabajo, crear mod, comandos npm |
| [confluence/workspaces.md](confluence/workspaces.md) | Referencia por workspace: Object Manager, Suite, Layout Engine, Flow, Report Builder |
| [confluence/operaciones.md](confluence/operaciones.md) | Deploy en AWS ECS, troubleshooting |
| [confluence/apps-learning-assurance.md](confluence/apps-learning-assurance.md) | 5 apps de Learning Assurance: Curriculum Design, Mapping, Assessment, Pathways, Catalog |
| [confluence/layouts-detalle.md](confluence/layouts-detalle.md) | Guias detalladas del Layout Engine (RecordList, RecordDetail, ChibiList) |
| [confluence/legacy.md](confluence/legacy.md) | Contenido historico: coding standards, objetos de negocio, flow legacy |

### Learning Assurance — Propuesta funcional (Esteban Cortes)

Extraccion completa de la propuesta de Learning Assurance documentada en Confluence (129 capacidades, 20 flujos, reglas transversales, integraciones).

| Archivo | Descripcion |
|---------|-------------|
| [learning-assurance/data/INDEX.md](learning-assurance/data/INDEX.md) | Indice con links a Confluence, resumen de capacidades, como usar la data |
| [learning-assurance/data/01-vision-funcional.md](learning-assurance/data/01-vision-funcional.md) | Vision general: que hace cada app, a quien va, diferenciadores |
| [learning-assurance/data/02-curriculum-design.md](learning-assurance/data/02-curriculum-design.md) | App 1: 62 capacidades (planes, programas, syllabi, catalogos, IA, taxonomias) |
| [learning-assurance/data/03-curriculum-mapping.md](learning-assurance/data/03-curriculum-mapping.md) | App 2: 24 capacidades (matrices, niveles, perfil de egreso, tributacion, IA) |
| [learning-assurance/data/04-learning-assessment.md](learning-assurance/data/04-learning-assessment.md) | App 3: 43 capacidades (evaluacion, evidencias, seguimiento, reporteria, acreditacion) |
| [learning-assurance/data/05-reglas-transversales.md](learning-assurance/data/05-reglas-transversales.md) | Reglas BR-XXX: workflows, multi-tenancy, integraciones, permisos, calculo de logro |
| [learning-assurance/data/06-flujos-funcionales.md](learning-assurance/data/06-flujos-funcionales.md) | 20 flujos: escenarios A/B/C, config, carga SIS, MADS, reporteria, acreditacion |
| [learning-assurance/data/07-integraciones.md](learning-assurance/data/07-integraciones.md) | Banner, Anthology, LMS, Attendance & Grades, sistemas genericos |

### Sprints de Planificación y QA (Históricos)

Historial de requerimientos, reuniones de alineación, reviews y análisis de QA **durante** cada sprint. Es trabajo del sprint, **no fuente de verdad de lo implementado**: puede contener tickets completados o no, diseños que después cambiaron y propuestas descartadas. Lo que realmente se construyó vive consolidado en las carpetas evergreen (verificado contra código). Ver [mantenimiento.md](mantenimiento.md).

| Carpeta | Hitos Clave | Documentos Principales |
|---------|-------------|------------------------|
| [sp4/](sp4/) | Versionamiento sin Workflow | Requerimientos de versionamiento, análisis de brechas core/mod |
| [sp5/](sp5/) | Extensiones y Soft Delete | Análisis de soft-delete, estructura de carpetas de mods |
| [sp6/](sp6/) | DataLog & Enum Transitions | [sp6/README.md](sp6/README.md) (matriz de alcance), [sp6/dredd-1380.md](sp6/dredd-1380.md) (atribución DataLog), [sp6/UPONE-1381-core-changes-review.md](sp6/UPONE-1381-core-changes-review.md) (enum transitions) |

### Informe ReAssess (consultoria externa)

Informe de Dictuc (Enero 2026) proponiendo rediseno de uAssessment en 3 modulos.

| Archivo | Descripcion |
|---------|-------------|
| [pdf/INDEX.md](pdf/INDEX.md) | Resumen del informe: 5 pain points, 4 universidades, 3 modulos propuestos |
| [pdf/resume.md](pdf/resume.md) | Resumen ejecutivo |
| [pdf/01-contexto.md](pdf/01-contexto.md) a [pdf/09-anexos.md](pdf/09-anexos.md) | 9 secciones del informe |
| [pdf/actual/INDEX.md](pdf/actual/INDEX.md) | Base de conocimiento del estado actual: 15 analisis tecnicos |

---

## Mapa rapido: donde buscar que

| Necesitas... | Ve a |
|-------------|------|
| Entender la arquitectura de uP1 | [core/object-manager.md](core/object-manager.md) |
| Desarrollo asistido por LLM | [mods/llm/INDEX.md](mods/llm/INDEX.md) |
| Entender relacion mods ↔ objetos | [mods/objects-map.md](mods/objects-map.md) |
| Crear un mod nuevo | [mods/creation-guide.md](mods/creation-guide.md) |
| Ver un ejemplo real de mod | [mods/example-uengagement.md](mods/example-uengagement.md) o [mods/example-academic-scheduling.md](mods/example-academic-scheduling.md) |
| Partir del mod template (referencia de capacidades) | [mods/example-hello-world-mod.md](mods/example-hello-world-mod.md) |
| Entender el mod Yupi (ai-agent) | [mods/ai-agent.md](mods/ai-agent.md) |
| Entender la consola admin (up1-manager) | [mods/example-up1-manager.md](mods/example-up1-manager.md) |
| Agregar traducciones | [mods/i18n.md](mods/i18n.md) |
| Entender componentes Vue y Vueform | [mods/internals.md](mods/internals.md) |
| Interactuar programaticamente con datos | [core/programmatic-interaction.md](core/programmatic-interaction.md) |
| Crear objetos via API (sin JSON) | [core/programmatic-objects.md](core/programmatic-objects.md) |
| Aplicar tokens CSS / colores / tipografia | [core/style-guide.md](core/style-guide.md) |
| Implementar permisos en un mod | [features/rbac.md](features/rbac.md) + [features/rbac-examples.md](features/rbac-examples.md) |
| Crear reportes / dashboards | [features/report-builder.md](features/report-builder.md) |
| Gestionar reportes via API | [features/programmatic-reports.md](features/programmatic-reports.md) |
| Crear workflows / eventos | [features/flow-engine.md](features/flow-engine.md) |
| Agrupar varios record-lists en un tab de RecordDetail | [features/recorddetail-grouped-tabs.md](features/recorddetail-grouped-tabs.md) |
| Eliminar registros con impacto en cascada | [features/delete-cascade.md](features/delete-cascade.md) |
| Borrar logicamente un registro (soft-delete, reversible) | [features/soft-delete.md](features/soft-delete.md) |
| Ver el historial / auditoria de un objeto | [features/datalog.md](features/datalog.md) |
| Definir transiciones de estado sobre un enum | [features/enum-transitions.md](features/enum-transitions.md) |
| Configurar plataforma / mod / usuario | [features/config-system.md](features/config-system.md) |
| Refrescar la UI en tiempo real (SSE) | [features/realtime-sse.md](features/realtime-sse.md) |
| Reload, columnas N:M o create por ruta en RecordList/Detail | [features/recordlist-recorddetail-2026-07.md](features/recordlist-recorddetail-2026-07.md) |
| Endurecer seguridad (CSP, limites GraphQL, auth, JWT) | [features/security-hardening.md](features/security-hardening.md) |
| Entender el mod Curriculum Mapping (LevelScheme) | [mods/example-curriculum-mapping.md](mods/example-curriculum-mapping.md) |
| Desplegar Yupi / tunear memoria de CI | [operations/yupi-deployment.md](operations/yupi-deployment.md) |
| Entender el workspace Layout (libreria UI) | [core/layout-workspace.md](core/layout-workspace.md) |
| Entender el workspace Suite (Nuxt) | [core/suite-workspace.md](core/suite-workspace.md) |
| Cambiar el schema sin reiniciar (hot-swap) | [features/schema-hot-swap.md](features/schema-hot-swap.md) |
| Armar un dashboard con widgets | [features/dashboard-mosaic.md](features/dashboard-mosaic.md) |
| Versionar o clonar un registro | [features/versioning-cloning.md](features/versioning-cloning.md) |
| Entender el mod Curriculum Design | [mods/example-curriculum-design.md](mods/example-curriculum-design.md) |
| Entender migraciones de BD | [mods/creation-guide.md](mods/creation-guide.md) (seccion 12) |
| Entender deployment | [mods/creation-guide.md](mods/creation-guide.md) (seccion 13) |
| Levantar entorno local | [operations/local-environment.md](operations/local-environment.md) |
| Resetear la BD (full, por tenant, drift) | [operations/database-reset.md](operations/database-reset.md) |
| Navegar uP1 con Playwright | [operations/playwright-navigation.md](operations/playwright-navigation.md) |
| Levantar n8n local sin Docker | [operations/n8n-local-setup.md](operations/n8n-local-setup.md) |
| Ver propuesta de Learning Assurance | [learning-assurance/data/INDEX.md](learning-assurance/data/INDEX.md) |
| Buscar capacidad CAP-XXX-NNN | [learning-assurance/data/](learning-assurance/data/) (02, 03 o 04 segun app) |
| Buscar info de Confluence | [confluence/INDEX.md](confluence/INDEX.md) |
| Ver analisis del sistema actual | [pdf/actual/INDEX.md](pdf/actual/INDEX.md) |

---

## Relacion con otros specs

| Spec | Relacion |
|------|---------|
| [ongoing/up1/views/](../ongoing/up1/views/) | Exploracion visual de vistas uP1 con screenshots |
| [assessment/](../assessment/) | Documentacion del sistema Assessment actual |
| [mads/](../mads/) | Documentacion de MADS |

---

## Estadisticas

| Metrica | Valor |
|---------|-------|
| Archivos de documentacion | 38 guias + 9 confluence + 15 pdf + 4 sprints canonicos |
| Lineas totales (guias) | ~12,000 |
| Categorias | 4 (core, mods, features, operations) |
| Idioma | Espanol (documentacion), Ingles (codigo) |
| Ultima actualizacion | 2026-08-17 |

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-08-17 | Sincronizacion del delta de 2 semanas (2026-08-03 a 2026-08-17): 622 commits en 11 repos con actividad, verificados contra codigo. 1 doc nuevo: `mods/scheduling-algorithm-payload.md` (contrato del payload del algoritmo de asignacion, que hasta ahora solo vivia como comentarios en el resolver). Actualizacion de `features/rbac`, `datalog`, `delete-cascade`, `report-builder`, `flow-engine`, `core/object-manager`, `layout-workspace`, `suite-workspace`, `mods/reference`, `example-academic-scheduling`, `example-curriculum-mapping`, `example-curriculum-design`, `example-up1-manager`, `example-uengagement`. Ejes de la ventana: RBAC server-authoritative (rol activo en BD y membresia de tenant por claim de Clerk), endurecimiento del borrado en cascada sobre RecordTypes, y una tanda de keys declarativas nuevas en layout y suite. Correcciones de drift: `retention-wellbeing` NO fue reemplazado por uEngagement (son mods distintos y ambos activos), `layout/docs/reference/layout-json-schema.md` ya no existe, y el caveat de `BULK_DELETE` en datalog estaba obsoleto. Hallazgo de seguridad registrado: en `flow` el enforcement de licencia esta doblemente desactivado. Watermark por repo en `kb-sync-state.yaml`, ahora con `retention-wellbeing` incluido. |
| 2026-08-03 | Sincronización del delta de 3 semanas (2026-07-13 a 2026-08-03), verificada contra código de los 13 repos (core, mods, up1-mcp). 3 docs nuevos: `features/security-hardening.md` (épica SEC-*), `mods/example-curriculum-mapping.md` (mod nuevo), `operations/yupi-deployment.md`. Actualización de `core/object-manager`, `core/layout-workspace`, `core/suite-workspace`, `features/report-builder`, `programmatic-reports`, `rbac`, `rbac-examples`, `delete-cascade`, `soft-delete`, `datalog`, `mods/ai-agent`, `example-academic-scheduling`, `example-up1-manager`, `example-uengagement` (absorbe el trabajo de retention/wellbeing que vive en el repo uengagement-up1). Watermark de commits por repo persistido en el KB de Deckard Cain (`kb-sync-state.yaml`) para acotar la próxima actualización. |
| 2026-07-16 | Sincronización mayor con ~2 meses de implementación (mayo a julio). 9 docs nuevos: delete-cascade, datalog, enum-transitions, config-system, realtime-sse, recordlist-recorddetail-2026-07, ai-agent, example-uengagement, example-academic-scheduling. Reescritura de `mods/i18n.md` a i18next. Actualización de report-builder, programmatic-reports, ui-elements-guide, object-manager, objects-map, reference, rbac y rbac-examples. retention-wellbeing marcado como superado por uEngagement; ChangeLog reemplazado por DataLog. Segunda pasada de completitud: docs nuevos `example-up1-manager`, `core/layout-workspace`, `core/suite-workspace`, `features/schema-hot-swap`, `features/dashboard-mosaic`, `features/versioning-cloning`, `mods/example-curriculum-design`; actualizacion de curriculum-design (overview, INDEX, programa-de-asignatura, capabilities CAP-CUR-018/019/022, business-rules BR-WKF/BR-VER/BR-PRM/BR-TNT), `programmatic-objects`, `database-reset`, `internals`, `creation-guide` y el selector Picker en `ui-elements-guide`. |
| 2026-07-13 | Actualización de guías operativas de reset y entorno local. Reorganización de borradores antiguos en `_archive/`. Mapeo de SP5, SP6 y SP7 en el índice principal. |
| 2026-06-04 | Nuevo doc: operations/database-reset.md — tipos de reset de BD (full/canonico, bring-up, por tenant, drift), alcance/pasos/prerequisitos, guia de decision, caso drift con fix validado |
| 2026-05-16 | Nuevo doc: features/recorddetail-grouped-tabs.md — feature UPONE-1101 de Juan Diego mergeada en layout/develop (multiples bloques por tab en RecordDetail) |
| 2026-04-14 | Complementacion de 5 guias de mods con diagramas Mermaid (20+), nuevas secciones: migraciones BD, deployment. Info de Confluence integrada |
| 2026-04-14 | Nuevos docs: objects-map.md, programmatic-interaction.md, llm/ (INDEX + 12 recipes + validation) — 102 recetas atomicas para vibe coding |
| 2026-04-10 | 12 guias nuevas: object-manager, mods, i18n, style-guide, rbac, report-builder, flow-engine, ejemplos |
| 2026-04-10 | Reorganizacion en 4 carpetas: core/, mods/, features/, operations/ |
| 2026-04-10 | Extraccion propuesta Learning Assurance de Confluence (Esteban Cortes): 10 paginas, 129 capacidades, learning-assurance/data/ |
| 2026-04-09 | nav-discoveries, mods.md, mods-internals.md, n8n-local-setup.md |
| 2026-04-07 | Analisis ReAssess: 15 documentos tecnicos del estado actual |
| 2026-04-07 | Extraccion inicial de Confluence (85 paginas) |
