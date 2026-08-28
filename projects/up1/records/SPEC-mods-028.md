---
id: SPEC-mods-028
project: up1
type: doc
module: mods
tags:
  - up1
  - hello-world-mod
  - template
  - ejemplo
  - mod
  - config-system
  - resolvers
  - eventos
  - flows
  - python
  - vueform
  - rbac
  - layouts
  - dashboard
  - navbyrole
  - homescreen
  - roles-internos
  - seed
---

# Ejemplo real: mod Hello World (template de referencia)

`hello-world-mod` es el **mod template oficial** de uP1: existe para **demostrar casi todas las capacidades** de un mod sobre un dominio de ejemplo (assessment de riesgo estudiantil). No es un mod de negocio en produccion: esta **excluido del sync por defecto** (en `ignoredMods` del `package.json` raiz). Es el mejor punto de partida para crear un mod nuevo y la referencia canonica de patrones.

> Rutas relativas a `mods/hello-world-mod/` salvo que se indique otra cosa.

## Indice

1. [Que demuestra](#1-que-demuestra)
2. [config/app.json: homescreen y navByRole](#2-configappjson-homescreen-y-navbyrole)
3. [Objetos (3) y formula engine](#3-objetos-3-y-formula-engine)
4. [Resolvers custom (3)](#4-resolvers-custom-3)
5. [Eventos (3) + flow n8n](#5-eventos-3--flow-n8n)
6. [Sistema de config: settings.json canonico](#6-sistema-de-config-settingsjson-canonico)
7. [RBAC: capabilities objeto + field-level](#7-rbac-capabilities-objeto--field-level)
8. [Componentes y composables](#8-componentes-y-composables)
9. [Layouts (24)](#9-layouts-24)
10. [Roles internos y seeds](#10-roles-internos-y-seeds)
11. [Guias propias del mod](#11-guias-propias-del-mod)
12. [Como activarlo](#12-como-activarlo)

---

## 1. Que demuestra

Segun su `README.md`, cubre (checklist verificado contra el codigo del mod):

- Object definitions (JSON schema → Prisma) + **formula engine** (`weightedScore = riskScore * 100`).
- **Resolvers GraphQL custom** con aislamiento por tenant (3 resolvers + 3 schemas `.graphql`).
- **Integracion con script Python** (TextTransformer → resolver → script Python).
- Elementos custom de **Vueform** (`RandomPersonCardElement`, `TextTransformerElement`), componentes **standalone** (`HwAssessmentList`) y **modales** (`EditHwAssessmentModal`).
- Composables compartidos (`useHwAssessment`, funciones puras) y de API (`useHwAssessmentApi`, GraphQL + estado reactivo).
- Layouts RecordList + RecordDetail (view/create/edit), **tabs por campo**, **listas embebidas** con `{{parentId}}`, FK display fields, **row actions** (con modal, data mapping, condiciones), layouts auxiliares (`applicationId: null`), create contextual, forms multi-step, auto-assign fields.
- **Config system**, **eventos + flow n8n**, RBAC object-level + field-level, dashboard mosaic.
- **Homescreen + navegacion por rol interno** (`homescreen`, `navByRole`; PLAT-15 / UPONE-1513) con un tab reservado de tipo `dashboards`.

## 2. config/app.json: homescreen y navByRole

```json
{
  "name": "hello-world",
  "label": "Hello World",
  "icon": "bi-file-earmark-code",
  "order": 10,
  "roles": ["Admin", "Coordinador"],
  "tenants": ["TEST", "UPU"],
  "version": "1.0.0",
  "homescreen": "hw_overview_dashboard",
  "navByRole": {
    "HwManager": [
      { "dashboards": ["hw_interventions_dashboard"] },
      { "object": "HwAssessment", "layouts": ["hw_assessment_list"] },
      { "object": "HwFactor", "layouts": ["hw_factor_list"] },
      { "object": "HwIntervention", "layouts": ["hw_intervention_list", "hw_intervention_my_list"] }
    ]
  }
}
```

> Corrige la version previa de este doc: el `defaultObjects` plano (mismos tabs para todos) fue **reemplazado** por `homescreen` + `navByRole` en el commit `a3c6d03` (2026-08-10). `defaultObjects` sigue existiendo como sistema legado en el core, pero es mutuamente excluyente con `navByRole`; este mod ya no lo usa como ejemplo.

- `homescreen`: layout de aterrizaje al abrir la app, referenciado por `name`/`id` (nunca por filename). Puede ser cualquier tipo de layout, incluido un dashboard (este mod aterriza en `hw_overview_dashboard`). Validado por `validatePlat15Config` en `object-manager/scripts/sync/dbSync.js`.
- `navByRole`: tabs por **rol interno del mod** (`core_ModRole`, ver seccion 10). Un rol no declarado aca no ve ningun tab del mod.
- Tipos de entrada dentro del array, sin campo `kind` en el JSON de origen (el `kind` lo agrega el resolver en la salida GraphQL, no se declara en el mod): `{ "object": "...", "layouts"?: [...] }` para un objeto/RecordType, o `{ "dashboards": [...] }` para el tab reservado de dashboards. Verificado contra `suite/logic/app.resolver.js` (`normalizeTab`) y el validador del sync: el ejemplo del mod usa exactamente este shape duck-typed, sin desalineacion.
- El orden del array define el orden del navbar.
- Detalle completo (incluida la tabla de reglas) en la guia propia del mod: `docs/guides/navigation-roles-seeds.md`.

## 3. Objetos (3) y formula engine

```
HwAssessment ──1:N──> HwFactor
      └──────1:N──> HwIntervention ──FK──> core_User (assignee)
```

- **HwAssessment** (`objects/HwAssessment.json`): `riskScore` (number), `riskLevel` (string), un boolean flag, y un campo **formula** `weightedScore` (`"type": "formula"`, `"formula": "=riskScore * 100"`). `riskScore`/`riskLevel` son `required`.
- **HwFactor**: factor contribuyente con `category` (ACADEMIC/ATTENDANCE/ENGAGEMENT/FINANCIAL), `weight`, `score`.
- **HwIntervention**: plan de accion con `type`, `status`, `priority`, fechas, metadata JSON, FK a `HwAssessment` y a `core_User`.

Sin RecordTypes (`objects/RecordTypes/` vacio): el template no ejercita el patron RT (para eso ver `example-curriculum-design.md`).

## 4. Resolvers custom (3)

Cada uno viene con su `.schema.graphql`. Demuestran como un mod agrega queries/mutations junto al CRUD auto-generado:

| Resolver | Demuestra |
|---|---|
| `logic/hwMetrics.resolver.js` | Analytics/metricas custom con **aislamiento por tenant** (documenta el patron de tenant isolation de uP1 en el header) |
| `logic/randomPerson.resolver.js` | Consulta a una **tabla global** (`core_User`, compartida entre tenants) vs objetos de negocio por-tenant |
| `logic/textTransform.resolver.js` | **Integracion con Python**: el resolver invoca un script Python (ver guia `docs/guides/python-integration.md`) |

Tras `npm run sync` estos `.resolver.js` se copian a `object-manager/src/graphql/resolvers/` y se auto-cargan.

## 5. Eventos (3) + flow n8n

Eventos en `events/` (JSON, sincronizados a object-manager → BullMQ):

- `hw-assessment-high.json`, `hw-intervention-created.json`, `hw-intervention-completed.json`.

Flow `flows/hello-world-event-handler.json`: workflow n8n que consume esos eventos (patron evento → cola → n8n; ver `features/flow-engine.md`).

## 6. Sistema de config: settings.json canonico

`config/settings.json` es el **ejemplo mas completo** del sistema de config en el repo (ver `features/config-system.md`). Cubre los **4 `dataType`** que soporta `ConfigPanel.vue`:

| dataType | Ejemplo (key) | Notas |
|---|---|---|
| `select` | `hw.defaultView`, `hw.resultsPerPage` | `options` es array de `{ value, label }` (label = key i18n), con `allowUserOverride: true` |
| `number` | `hw.maxAssessmentsPerTerm`, `hw.riskScoreThreshold` | `default` numerico |
| `string` | `hw.orgName`, `hw.supportEmail` | desde el 2026-08-10 el mod usa `string` en vez de `text` para este caso; `ConfigPanel.vue` no distingue entre ambos valores, cualquier `dataType` que no sea `boolean`/`select`/`number` cae al input de texto plano |
| `boolean` | `hw.enableInterventions`, `hw.showDebugPanel` | toggle |

> **`capability` en una config key (declarado, hoy NO enforced)**: `hw.showDebugPanel` declara `"capability": "mod/hello-world/admin:view"`. El backend lo persiste y lo expone en el typeDef (`coreConfig.js` campo `capability`; `coreConfig.resolver.js:103,221`), **pero no lo aplica**: `getConfigs` no filtra las keys por la capability del usuario, y el ConfigPanel ni siquiera pide ese campo en su query (`ConfigPanel.vue:148`). Es un contrato aspiracional (analogo a `onTransition` en enum-transitions): existe el campo, pero no gatea la visibilidad todavia. No asumir que oculta la key.

## 7. RBAC: capabilities objeto + field-level

`capabilities.json` declara **9 capabilities**:

- **Object-level** (5): `mod/hello-world:{view_assessments, manage_assessments, view_interventions, manage_interventions, view_metrics}` con `riskLevel` low/medium/high.
- **Field-level** (4, con punto): ej. `hwassessment.riskScore:{view, modify}` — permisos por campo cuando el usuario no tiene el permiso a nivel objeto (ver `features/rbac.md` seccion 8).

## 8. Componentes y composables

`modsComponents/` (4):

- `RandomPersonCard`, `TextTransformer`: **elementos Vueform custom** (se registran como tipos de campo).
- `HwAssessmentList`: componente **standalone** Vue.
- `EditHwAssessmentModal`: componente **modal**.

`modsComposables/`: `useHwAssessment` (funciones puras, sin GraphQL) y el patron de composable de API con estado reactivo. Ver `mods/internals.md` para Vueform vs standalone.

## 9. Layouts (24)

`config/layouts/` demuestra el rango del layout system:

- CRUD por objeto: `hw-{assessment,factor,intervention}-{create,edit,view,list}.json` (modos view/create/edit).
- **Tabs por campo**: `hw-assessment-view` con 4 tabs (Detalle, Demos, Factores, Intervenciones).
- **Listas embebidas** con `{{parentId}}`: `hw-factor-assessment-list`, `hw-intervention-assessment-list` (abiertas desde row actions / tabs del padre).
- **Dashboard mosaic**: `hw-dashboard-mosaic-large.json`, `hw-dashboard-reference.json`, mas los dashboards de negocio `hw-overview-dashboard.json` y `hw-interventions-dashboard.json` (ver `features/dashboard-mosaic.md`).
- **Listas de solo lectura para embeber en dashboards** (nuevo, 2026-08-10): `hw-{assessment,factor,intervention}-dashboard-list.json`, con `showLayoutSelector: false`, pensadas para el widget `recordlist` de un dashboard, donde no tiene sentido ofrecer el selector de vistas del tab normal. Los tabs siguen usando sus listas originales (`hw_assessment_list`, etc.) con su selector intacto.
- **Layouts auxiliares** (create contextual desde row action) y `hw-intervention-my-list` (lista filtrada por usuario).

## 10. Roles internos y seeds

Agregado el 2026-08-10 junto con `homescreen`/`navByRole` (seccion 2): el mod ahora ejercita el ciclo completo de un rol interno de mod.

- **`roles/HwManager.json`**: rol interno autocontenido (sin `extends`) con capabilities en **lowercase** (`hwassessment`, `hwfactor`, `hwintervention`, ademas de `mod/hello-world`) porque `hasViewPermission` lowercasea el nombre del objeto al validar.
- **`seed/populate-navbyrole-mapping.js`**: seed formato-funcion que cablea el rol institucional `Admin` al rol interno `HwManager` escribiendo `up1_suite_app_role.modRoleId`, el mismo campo que setea la UI "Role mappings" de `up1-manager`. Sin este seed, ningun usuario alcanza el rol interno y el navbar del mod queda sin tabs pese a tener `navByRole` declarado. Es defensivo (`findFirst` antes de escribir, `console.warn` + continue si falta una dependencia) e idempotente (upsert por la unica `[appId, roleId]`).
- **Limpieza de seeds legados**: se elimino `seed/config-seeds.js` (factores de referencia) y `seed/populate-relations.js` (339 lineas; vinculaba 12 factores y 8 intervenciones a las evaluaciones de ejemplo). El seed de evaluaciones se renombro de `example-seeds.js` a `config-assessments.js` para seguir el naming `config-`/`populate-` del motor SEED-01 (UPONE-1492). **Correccion respecto a la version previa de este doc**: hoy el mod solo trae seed de `HwAssessment` (5 evaluaciones STU-001..005); ya no hay seed de `HwFactor` ni de `HwIntervention` ni de sus relaciones.

Detalle completo de ambos temas (`navByRole` + roles + seeds) en `docs/guides/navigation-roles-seeds.md`, que reemplaza en profundidad a lo que antes solo vivia disperso en `settings.md`/`seed/README.md`.

## 11. Guias propias del mod

Ademas del KB de specs, el mod trae su propia doc tecnica en `docs/guides/`:

- `components.md`, `layouts.md`, `settings.md` (config), `python-integration.md` (integracion Python paso a paso), `new-mod.md` (como partir de este template), `navigation-roles-seeds.md` (homescreen, navByRole, roles internos, seeds; nuevo 2026-08-10).

## 12. Como activarlo

Excluido del sync por defecto. Para usarlo:

1. Quitar `"hello-world-mod"` de `"ignoredMods"` en el `package.json` raiz.
2. `npm run sync` → `npm run codegen` → `npm run tenant:migrate` → `npm run dev` (backend + suite). Detalle en el `README.md` del mod y en `docs/guides/development.md#activating-the-hello-world-mod-template`.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-20 | Documento inicial: doc de ejemplo del mod template `hello-world-mod`, verificado contra codigo (objetos, 3 resolvers incl. integracion Python, eventos+flow, settings.json canonico de config con caveat de `capability` no-enforced, RBAC object+field, 19 layouts, componentes, guias propias) |
| 2026-08-17 | Delta PLAT-15/UPONE-1513 (`feat/homepage-seed-role-examples`, 2026-08-10): agrega ejemplo de `homescreen` + `navByRole` en `config/app.json` en reemplazo de `defaultObjects` (corrige el doc previo, que solo mostraba `defaultObjects`); verificado contra el validador real (`dbSync.js` `validatePlat15Config`) y el resolver (`app.resolver.js` `normalizeTab`): el ejemplo esta alineado, sin campo `kind` en el JSON de origen. Agrega rol interno `roles/HwManager.json` y su seed de mapeo `populate-navbyrole-mapping.js`. Agrega 3 layouts `*-dashboard-list` de solo lectura para embeber en dashboards (24 layouts en total). Limpieza de seeds legados: se elimino el seed de `HwFactor`/`HwIntervention`/relaciones (`config-seeds.js`, `populate-relations.js`); hoy el mod solo seedea `HwAssessment` (corrige el doc previo). Cosmetico: `dataType` de dos config keys paso de `text` a `string` (sin efecto en `ConfigPanel.vue`). |
