---
id: SPEC-mods-005
project: up1
type: spec
module: mods
category: llm
tags: [up1, llm, vibe-coding, indice, decision-tree, recetas]
fecha: 2026-04-14
---
# uP1 Mods — Guia LLM

Indice para desarrollo asistido por LLM. Lee este archivo primero, identifica la receta, lee solo el archivo necesario.

## Reglas inquebrantables

1. **NUNCA** editar destinos del sync — solo `mods/{mod}/`
2. **NUNCA** editar `prisma/schema.prisma` — es generado
3. **SIEMPRE** `tenantId: context.tenantId` en todo where de resolver
4. **SIEMPRE** `npm run sync` despues de cada cambio
5. **SIEMPRE** `npm run codegen` + `tenant:migrate` despues de cambiar objects/
6. Exports de resolver **DEBEN** contener "Query" o "Mutation" en el nombre
7. Componentes Vueform usan `defineElement()` — NO `<script setup>`
8. GraphQL siempre imperativo (`apolloClient.query(...)`) — NO `useQuery`/`useMutation`
9. CSS: `var(--up1-*)` con fallback — NUNCA valores hardcodeados ni Bootstrap directo

## Arbol de decision

```text
┌─────────────────┐
│      Tarea      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Mod nuevo o existente? │
└──────┬──────────────────┘
       │
  ┌────┴──────────┐
  │               │
  ▼               ▼
Nuevo         Existente
  │               │
  ▼               ▼
recipes/    ┌─────────────────────────────────────────────┐
mod-setup   │             Que agregar?                    │
.md         └─────────────────────────────────────────────┘
             │          │         │         │         │
             ▼          ▼         ▼         ▼         ▼
         Objeto/    Logica    Vista     Componente Traduc-
         tabla/     negocio   layout    Vue custom  ciones
         campo        │       JSON        │          │
           │          │         │         │          │
           ▼          ▼         ▼         ▼          ▼
        objects.  resolvers. layouts.  components. i18n.md
          md        md        md         md
             │          │         │         │
             ▼          ▼         ▼         ▼
         Estilos   Permisos   Evento    Datos
          CSS       RBAC     o flow     inici-
           │          │       n8n        ales
           │          │         │         │
           ▼          ▼         ▼         ▼
         css.md    rbac.md  events-   seeds.md
                            flows.md
             │          │
             ▼          ▼
           Tests    API prog.   Patron complejo
             │          │       (workflow, version,
             │          │        arbol, matriz, IA)
             ▼          ▼              │
         testing.  programmatic.      ▼
           md         md          advanced.md
```

## Catalogo de recetas

| Archivo | Recetas | Tags |
|---------|---------|------|
| [recipes/mod-setup.md](recipes/mod-setup.md) | MOD-01..06 | `mod, setup, estructura, app.json, sidebar, ignoredMods` |
| [recipes/objects.md](recipes/objects.md) | OBJ-01..18 | `objeto, campo, FK, enum, json, formula, extended, relacion, codegen, migrate` |
| [recipes/resolvers.md](recipes/resolvers.md) | RES-01..09 | `resolver, query, mutation, withAuth, transaction, schema.graphql` |
| [recipes/layouts.md](recipes/layouts.md) | LAY-01..17 | `layout, RecordList, RecordDetail, tabs, steps, wizard, rowAction, modal, embebido, filtro` |
| [recipes/components.md](recipes/components.md) | VUE-01..12 | `componente, Vueform, defineElement, ElementLayout, composable, Apollo, Storybook, standalone` |
| [recipes/i18n.md](recipes/i18n.md) | I18N-01..08 | `traduccion, lang, locale, per-object, cascada, tenant-override, placeholder` |
| [recipes/css.md](recipes/css.md) | CSS-01..03 | `estilos, theme, tokens, capas, objectName` |
| [recipes/rbac.md](recipes/rbac.md) | RBAC-01..09 | `permisos, capabilities, withAuth, roles, riskLevel, campo, layout` |
| [recipes/events-flows.md](recipes/events-flows.md) | EVT-01..04, FLOW-01..08 | `evento, BullMQ, Redis, n8n, workflow, trigger, notificacion, Up1FormObject` |
| [recipes/seeds.md](recipes/seeds.md) | SEED-01..03 | `seed, datos-iniciales, upsert, relacional, tenantManager` |
| [recipes/testing.md](recipes/testing.md) | TEST-01..04 | `vitest, mock, Prisma, auth, config-validation, coverage` |
| [recipes/programmatic.md](recipes/programmatic.md) | PROG-01..09 | `api, createInstance, importInstances, bulk, service-token, headless` |
| [recipes/advanced.md](recipes/advanced.md) | ADV-01..16 | `workflow, estados, versionamiento, clonacion, herencia, arbol, matriz, calculo, importacion, IA, dashboard, exportacion, wizard, taxonomia, integracion, backlog, feature-flag` |
| [recipes/visual-validation.md](recipes/visual-validation.md) | VV-01..15 | `visual, playwright, sidebar, RecordList, modal, wizard, RBAC, i18n, CSS, tenant, n8n` |
| [recipes/debugging.md](recipes/debugging.md) | DIAG-01..10 | `debug, errores, logs, diagnostico, devtools, prisma-studio, graphql, network, redis` |
| [validation.md](validation.md) | — | `self-check, verificacion, sync, codegen, troubleshooting` |

## Naming conventions (referencia rapida)

| Elemento | Convencion | Ejemplo |
|----------|-----------|---------|
| Mod | kebab-case | `learning-assurance` |
| Package | `@uplanner/{mod}` | `@uplanner/learning-assurance` |
| Objeto | PascalCase.json | `StudyPlan.json` |
| Resolver | camelCase + Query/Mutation | `studyPlanQuery` |
| Componente | PascalCase + Element.vue | `MatrixElement.vue` |
| Layout | snake_case | `study_plan_list` |
| Capability mod | `mod/{mod}:{accion}` | `mod/la:view_reports` |
| FK | `{camelCase}Id` | `studyPlanId` |
| Lang base | `{locale}_{country}.json` | `es_CL.json` |
| Lang per-object | `{locale}_{country}@{Obj}.json` | `es_CL@StudyPlan.json` |
| CSS token mod | `--{mod}-*` | `--la-card-bg` |

## Fuentes de conocimiento

| Tema | Archivo |
|------|---------|
| Arquitectura | core/object-manager.md |
| Crear mod | mods/creation-guide.md |
| Relacion objetos | mods/objects-map.md |
| Ejemplo real | mods/example-engagement.md |
| Flujo interno | mods/internals.md |
| Referencia rapida | mods/reference.md |
| i18n completo | mods/i18n.md |
| RBAC | features/rbac.md + rbac-examples.md |
| Reportes | features/report-builder.md |
| Flows n8n | features/flow-engine.md |
| API programatica | core/programmatic-interaction.md |
| Estilo visual | core/style-guide.md |
| Levantar entorno local | operations/local-environment.md |
| Navegacion Playwright | operations/playwright-navigation.md |

## Herramientas de verificacion

| Herramienta | Comando | Valida |
|---|---|---|
| check-mods | `npm run check-mods` | Estructura, capabilities, flows |
| Vitest | `npm test --workspace=@uplanner/{mod}` | Resolvers, composables, config |
| Codegen | `npm run codegen --workspace=@uplanner/object-management-backend` | Objects JSON validos |
| Sync | `npm run sync` | 9 fases sin conflictos |
| Storybook | `npm run storybook --workspace=@uplanner/layout-engine` | Componentes renderizan |
| GraphQL | `localhost:4000/graphql` | Queries/mutations |
| App | `localhost:3000/{TENANT}` | UI end-to-end |
