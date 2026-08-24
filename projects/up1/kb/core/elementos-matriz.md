---
id: SPEC-core-005
project: up1
type: spec
module: core
category: core
tags: [up1, arquitectura, object, layout, orchestrator, app, mod, component, row-action, tab, step, capability, role, tenant, construccion-vistas, matriz]
fecha: 2026-04-20
sources:
  - specs/up1/core/object-manager.md
  - specs/up1/core/programmatic-objects.md
  - bayley sesion de exploracion visual (BLY-016)
  - up1/layout/src/layouts/LayoutOrchestrator.vue
  - up1/layout/src/layouts/{RecordList,RecordDetail,ChibiList}.vue
---

# Matriz de elementos UP1 — que es, que contiene, flujos de vista

Referencia unificada de todos los elementos de la arquitectura UP1. Consolida conocimiento disperso en docs de object-manager, layout engine, mods y apps. Util para mapear la estructura runtime al codigo/data cuando se diseñan vistas nuevas.

## Contexto

UP1 es una plataforma **data-heavy / code-light**: N items de configuracion (apps, objects, layouts, row actions, ...) montados por un puñado fijo de componentes motor Vue. La relacion entre elementos es mayormente declarativa (JSON + DB) y el runtime los resuelve dinamicamente via `LayoutOrchestrator`. Esta matriz formaliza que hace cada pieza, que contiene y como se relacionan.

## Pasos logicos para entender el ciclo

Descomposicion didactica del concepto *"Un Orchestrator administra un Object mediante un Layout, puede tener sub-Orchestrators, monta un componente motor y resuelve los fields del schema con components estandar o del mod"*. Construi el entendimiento capa por capa:

### Paso 1 — El Object es el **QUE** (que cosa tenemos)

Un **Object** es una entidad del dominio con un schema: campos tipados, relaciones (FK), metadata. Es **solo data**, no sabe nada de UI.

- Vive como JSON en `mods/<mod>/objects/<Name>.json` y como tabla PostgreSQL tras `codegen + migrate`
- Ej: `HwAssessment` con fields `studentId, riskLevel, riskScore, recommendations, isActive, createdAt`

### Paso 2 — El Layout es el **COMO** (como lo mostramos)

Un **Layout** es una config JSON que declara **como** se muestra el Object al usuario en un modo particular. Nunca es codigo — solo data declarativa.

- Vive como JSON en `mods/<mod>/config/layouts/<name>.json` y como fila en `up1_layen_layout`
- Ej: `hw_assessment_list` (RecordList de HwAssessment con 5 columns + rowActions + canEdit/Delete/Create)
- Un Object tiene N layouts — uno por "vista distinta" que se quiere ofrecer (list, view, edit, create, my-list, ...)

### Paso 3 — El Orchestrator es el **QUIEN** (quien monta la vista)

El **LayoutOrchestrator** es un componente Vue singleton (1 solo archivo en UP1). Su rol: recibir `(objectName, layoutType, layoutId, mode)` y **materializar la vista**. Es el punto de entrada de toda vista de UP1.

- Pipeline interno:
  1. Fetch el Layout desde DB (`getInstance`)
  2. Procesa placeholders y caps segun rol
  3. Resuelve que componente concreto montar segun `layoutType`
  4. Lo monta y le pasa la config procesada
- **No renderiza nada el mismo** — delega al componente motor

### Paso 4 — El motor es el **CON QUE** (con que template se arma)

El Orchestrator elige 1 de **3 componentes motor** fijos segun `layoutType`:

| layoutType | Monta | Proposito |
|------------|-------|-----------|
| `RecordList` | `RecordList.vue` | Tabla con filas, row actions, search, paginacion |
| `RecordDetail` | `RecordDetail.vue` | Form o ficha segun `mode` (view/edit/create/wizard) |
| `ChibiList` | `ChibiList.vue` | Lista compacta (sidebar/mobile) |

Estos 3 son los unicos componentes "grandes" de UP1. No hay mas layoutTypes. Toda vista en UP1 es uno de estos 3.

### Paso 5 — Los fields del schema se resuelven a **componentes concretos**

Dentro del motor (especialmente RecordDetail), se recorre el `schema` del layoutConfig. Cada field tiene un `type` que determina **con que componente se renderiza ese slot**:

```
field.type:
├─ text/select/date/toggle/number/textarea/record-list/... (estandar)
│   → Vueform component (UI library estandar integrada a UP1)
│
└─ random-person-card/text-transformer/<kebab-custom> (custom)
    → Component del mod (Vue .vue del mod, inyectado dinamicamente)
```

Ej: `hw_assessment_view` tiene un field `randomPersonCard` con `type: "random-person-card"` → RecordDetail monta el componente del mod `RandomPersonCard.vue` en ese lugar.

### Paso 6 — La recursion aparece con **3 patrones** que disparan sub-Orchestrators

Cuando una vista necesita mostrar **otra vista dentro**, NO duplica codigo — invoca **otro Orchestrator** con otros params. Hay 3 mecanismos:

| Patron | En config | Dispara sub-Orchestrator montado... |
|--------|-----------|-------------------------------------|
| **Row action modal / navigate / create** | `rowActions[].type` + `targetLayoutId` | En overlay (modal) o fullscreen (navigate) cuando el user clickea el boton |
| **Tab Tipo B** | `tab.associatedLayoutId` | Embebido dentro del RecordDetail padre, en el div de la pestaña |
| **Field record-list** | `field.type: "record-list"` + `field.layoutId` | Embebido como lista hija en el slot del field (ej: "Factores" de una evaluacion) |

Cada invocacion recursiva es una nueva instancia del mismo `LayoutOrchestrator.vue` — con su propio fetch, lifecycle y arbol de hijos. Se pueden anidar sin limite teorico.

### Paso 7 — El componente del mod es el **escape hatch**

Cuando algo no se puede expresar como data (widget interactivo, logica de cliente, integracion visual custom), UP1 ofrece el mecanismo "componente del mod":

- Archivo Vue real en `mods/<mod>/components/<Name>/<Name>.vue`
- Referenciado en el schema por un `field.type: "<kebab-case>"`
- Al hacer `npm run sync`, el componente queda registrado en Vueform bajo ese `type`
- El motor (RecordDetail) lo monta como si fuera un field mas, pero el codigo es tuyo

**Regla de oro**: si podes expresarlo con types estandar o combinando fields/tabs/steps → usa data. Si realmente necesitas codigo Vue → component del mod.

### Puesta en secuencia (end-to-end con ejemplo)

Usuario en suite hace click en "Evaluaciones" del menu de la app Hello World:

```
1. Router → /UPU/HwAssessment/RecordList/hwassessment_list_cc627a
              ↓
2. LayoutOrchestrator se instancia con:
     objectName = "HwAssessment"
     layoutType = "RecordList"
     layoutId   = "hwassessment_list_cc627a"
              ↓
3. Fetch getInstance → layoutConfig (columns, rowActions, canEdit/...)
              ↓
4. layoutType === "RecordList" → monta <RecordList :layout-config="..." />
              ↓
5. RecordList dispara listInstances("HwAssessment") → data
     renderiza tabla con rowActions (Ver/Editar/Eliminar/Crear Intervencion)
              ↓
6. User click "Ver" en fila X:
     rowAction.type = "navigate" + targetLayoutId = "hw_assessment_view"
              ↓
     → Router push → NUEVA instancia de LayoutOrchestrator:
        (objectName=HwAssessment, layoutType=RecordDetail, layoutId=hw_assessment_view, instanceId=X, mode=view)
              ↓
     → RecordDetail recorre schema:
        • studentId (type=text)       → Vueform input
        • riskLevel (type=select)     → Vueform select
        • randomPersonCard (type=random-person-card) → Component del mod
        • tab "factors" con field factorsList (type=record-list, layoutId=hw_factor_assessment_list)
              ↓
              → OTRA instancia de LayoutOrchestrator anidada:
                 (objectName=HwFactor, layoutType=RecordList, ...)
                 → monta otro RecordList con sus propias rowActions
                    → click "Editar factor" → OTRA instancia en modal...
                       (recursion arbitraria)
```

Cada **flecha** del grafo de la vista Apps de Bayley = **una de estas invocaciones**.

### Mapeo rapido concepto ↔ elemento

| Concepto | Elemento concreto |
|----------|-------------------|
| **QUE** mostrar | Object |
| **COMO** mostrarlo | Layout |
| **QUIEN** lo monta | LayoutOrchestrator |
| **CON QUE** se arma | 1 de 3 componentes motor (RecordList / RecordDetail / ChibiList) |
| Fields **estandar** del schema | Vueform components |
| Fields **custom** del schema | Components del mod |
| Sub-vistas recursivas | Otra instancia del LayoutOrchestrator |
| Escape hatch para logica custom | Component del mod |

## Motor vs Layout — la distincion clave

La confusion mas frecuente en UP1 es pensar que el "componente motor" y el "Layout" son lo mismo. **No lo son**. Esta es la separacion de responsabilidades mas importante de entender:

### El motor es el **MOLDE**; el Layout es el **CONTENIDO**

El **componente motor** (RecordList / RecordDetail / ChibiList) es **un template universal** que no sabe nada de ningun dominio. Es "una tabla" o "un form" generico. Define:

- La **estructura macro** (tabla de filas / ficha con campos / lista compacta)
- Los **comportamientos genericos**: search, sort, paginacion, bulk edit (RecordList); validacion, submit, wizard (RecordDetail)
- La **infraestructura**: dispatcher de eventos, query al backend, render reactivo

El **Layout** es la **receta especifica** que personaliza ese molde con data concreta:

- **Que columnas** tiene la tabla (para ESTE Object especifico)
- **Que fields** del schema se muestran, en que orden, con que label
- **Que row actions** aparecen y a donde llevan
- **Que tabs / steps** agrupan los fields
- **Que validaciones** o conditions se aplican
- **Que capabilities** gate cada elemento

### Diagrama mental

```
                      RecordList.vue (MOLDE, 1 solo codigo)
                                  ↓
         ┌────────────────────────┴────────────────────────┐
         ↓                                                  ↓
┌────────────────────┐                          ┌────────────────────┐
│ hw_assessment_list │                          │   hw_factor_list   │
│ (Layout A — receta)│                          │ (Layout B — receta)│
└────────────────────┘                          └────────────────────┘
         ↓                                                  ↓
┌───────────────────────────┐          ┌───────────────────────────┐
│ Tabla de Evaluaciones     │          │ Tabla de Factores         │
├────┬─────────┬───────┬────┤          ├─────┬──────────┬──────────┤
│ ID │Student  │ Risk  │Act │          │Name │ Category │  Weight  │
├────┼─────────┼───────┼────┤          ├─────┼──────────┼──────────┤
│  1 │ Juan P. │ High  │ ✓  │          │Econ │ Finance  │  0.8     │
└────┴─────────┴───────┴────┘          └─────┴──────────┴──────────┘
  [Ver|Edit|Del|Crear Interv.]             [Ver | Edit | Del]
```

**Mismo codigo Vue** (RecordList.vue). **Vistas totalmente distintas**. La diferencia vive en la config JSON del layout.

### Analogia concreta

| Cocina | UP1 |
|--------|-----|
| Molde de galletas (1 figura: circulo) | Motor (`RecordList.vue`) |
| Receta / masa / ingredientes | Layout (`layoutConfig` JSON) |
| Harina, azucar, huevos | Object (data) |
| Panadero que ejecuta la receta | LayoutOrchestrator |

Con **el mismo molde** haces galletas de chocolate y de vainilla (distinto contenido, misma forma). Igual que con **`RecordList.vue`** pintas listas de Evaluaciones, Factores, Users, Cursos.

### Tabla de responsabilidades

| Aspecto | Motor (`RecordList.vue`) | Layout (`hw_assessment_list.json`) |
|---------|--------------------------|----------------------------------|
| **Que renderiza** | Estructura generica (tabla vacia) | Contenido especifico (que va en esa tabla) |
| **Sabe del dominio** | No (generico) | Si (declara `objectName: HwAssessment`) |
| **Vive como** | Codigo Vue (1 archivo fijo) | Data JSON + fila DB |
| **Cuando cambia** | Release de UP1 (raro) | Editando el JSON del mod (o DB) |
| **Define** | Comportamientos (sort, search, bulk, paginacion) | Contenido (columnas, acciones, filtros, tabs) |
| **Reutilizable** | Si — TODOS los layouts RecordList lo usan | No — atado al Object especifico |
| **Ejemplo de contenido** | `handleSort()`, template del header, ciclo de render | `columns`, `rowActions`, `canCreate`, `tabs`, `schema` |
| **Cuantos hay** | 3 fijos en UP1 (uno por layoutType) | N por Object — tantos como vistas se quieran |

### Lo que el Layout **NO** hace

- No renderiza nada por si mismo — es data pura
- No consulta el backend directamente — eso lo hace el motor (con `objectName` del layout como input)
- No valida data ingresada — eso lo hace el motor + Vueform
- No decide **quien** ve la vista — eso lo hace RBAC (caps + roles, gate antes del Orchestrator)

### Lo que el Layout hace exactamente

- **Parametriza el motor** — al ejecutar `listInstances`, el layout le dice al motor con que `filters`, `sort`, `fields` consultar
- **Mapea schema → UI** — el Object puede tener 40 fields, pero el layout dice "mostra solo estos 5 en tabla, estos 3 con componente custom, este tab agrupa estos 4"
- **Conecta layouts entre si** — via `rowActions.targetLayoutId` + `tabs.associatedLayoutId` + fields record-list. El motor por si solo no sabe a donde navegar
- **Declara gates de permisos** — `roles`, `requiredCapability` por rowAction

### Dos dimensiones independientes del badge en Bayley

Cuando ves `LAYOUT · RecordList` en el header de un nodo, son **dos cosas distintas**:

| Badge | Significa |
|-------|-----------|
| **LAYOUT** | Este nodo es un **registro** de tipo Layout (una fila en `up1_layen_layout`) |
| **RecordList** | Su `layoutType`, es decir el **motor** que el Orchestrator usa para renderizarlo |

Dos LayoutNodes con `RecordList` **comparten motor** pero **son layouts distintos** (configs independientes). Lo que distingue las vistas finales es la config del layout, no el motor.

### Aplicando la distincion a otros elementos

La misma logica aplica a otros pares de UP1:

| Dimension codigo (1 o pocos) | Dimension data (N) |
|-------------------------------|--------------------|
| **LayoutOrchestrator** (singleton) | N layouts que instancia |
| **Vueform components estandar** (text/select/date/...) | N fields que los usan |
| **RecordList.vue / RecordDetail.vue / ChibiList.vue** | N layouts con cada layoutType |
| **Component del mod** (ej: `RandomPersonCard.vue`) | N fields que lo referencian con `type: "random-person-card"` |

El codigo crece **poco** con el negocio. La data crece **proporcional** al negocio. Por eso UP1 es data-heavy — la mayoria de tu trabajo sera editar JSONs, no escribir Vue.

## Cuando uso cada elemento — guia de decision

Enfrentado a una pregunta de construccion, esta tabla te orienta que pieza tocar:

| Quiero | Elemento a tocar | No tocar |
|--------|------------------|----------|
| Agregar un tipo de dato nuevo (ej: "Workshop") | Nuevo **Object** | Nada de layouts hasta tener el object |
| Mostrar una lista de ese dato | Nuevo **Layout** RecordList | El motor (ya existe) |
| Cambiar las columnas visibles de una lista | Edicion del **Layout** existente | El motor ni el Object |
| Agregar un modo de edicion | Nuevo **Layout** RecordDetail mode=edit | Motor ni Object |
| Cambiar la secuencia de pasos en create | **Layout** mode=create — editar `steps` | Motor ni Object |
| Cambiar el comportamiento de sort/filter de todas las listas | **Motor** (`RecordList.vue`) — release de UP1 | No tocar layouts individuales |
| Widget visual no expresable con types estandar | **Component del mod** nuevo | No tocar motor ni crear layout raro |
| Restringir quien ve una vista | Capability/Role + field `roles` en el **Layout** | No hacer check en el motor |
| Mostrar la vista en el menu principal | **App** (declarar `defaultObjects`) + Layout con `applicationId=app.id` | Motor generico igual |
| Que un click abra otra vista | Row action con `targetLayoutId` en el **Layout** | El motor resuelve solo |
| Que el listado tenga un resumen embebido adentro del detail | **Layout** `tab.associatedLayoutId` o field `type: "record-list"` | El Orchestrator recursivamente invoca |

### Regla de oro

> **Antes de escribir Vue code, preguntate: ¿puedo expresarlo con data (Object/Layout/configs)?** Si si, ese es el camino correcto. Si no, el escape hatch es **Component del mod**. Tocar los 3 componentes motor o el Orchestrator es muy raro — solo en cambios fundamentales de UP1.

## Matriz maestra de elementos

| Elemento | Que es | Para que se usa | Cuando aplica | Puede contener | Descripcion |
|----------|--------|-----------------|---------------|----------------|-------------|
| **Mod** | Carpeta `mods/<name>/` — unidad de empaquetado / despliegue | Encapsular una feature o dominio como addon independiente | Siempre que se agrega funcionalidad nueva que no es core | `objects/`, `config/app.json` (opt), `config/layouts/`, `components/`, `lang/`, `events/`, `capabilities.json`, `seed/` | N por instalacion UP1. Markdown + JSON + Vue. El `npm run sync` lo propaga a workspaces core |
| **App** | Definicion de aplicacion visible al user (item del menu de suite) | Agrupar objetos + layouts + rol de acceso como "producto" para el usuario final | 0 o 1 por mod. N por tenant | Referencia a N `defaultObjects`, N `roles`, `label`, `icon`, `order`, `requiredPermissions` | JSON `config/app.json` → DB `up1_suite_app` via sync. Filtrada en runtime por `getAppsFiltered` segun roles del user |
| **Object (Base)** | Entidad/tabla del dominio — schema del dato | Representar un tipo de registro (Person, Course, HwAssessment, ...) | Por cada entidad de negocio | N `fields`, N `relations` (FK), metadata (label, labelPlural, gender), scope | JSON `objects/*.json` → Prisma schema → tabla PostgreSQL. Tambien genera tipos GraphQL y caps RBAC |
| **Object (Extended)** | Variante del Base con campos custom por cliente | Agregar campos especificos de una institucion sin tocar el Base | 0 o 1 por (Base × cliente) | N fields adicionales, 1 FK al Base | Naming: `ext__<CLIENT>__<object>.json`. Tabla dedicada `ext__<client>__<object>` con FK 1:1 al Base |
| **Field** | Atributo/columna del Object | Representar un dato del registro (nombre, fecha, FK, ...) | Por cada atributo | Tipo (text/select/date/number/...), relations, caps field-level | Parte del schema del Object. Types custom = delegan a components del mod |
| **Layout** | Configuracion JSON de UI para un Object en un modo | Declarar **como** se renderiza el Object (lista, detalle, etc.) | Por cada vista distinta que se quiere ofrecer | `layoutType`, `mode`, `columns`, `rowActions`, `tabs`, `steps`, `schema`, flags `canEdit/canDelete/canCreate/canCreateLayoutId`, `associatedLayoutConfigs` | JSON `config/layouts/*.json` + DB `up1_layen_layout`. N por Object (tipicamente list + view + edit + create + customs) |
| **LayoutType** | Clase de layout: `RecordList`, `RecordDetail`, `ChibiList` | Indica al Orchestrator cual componente motor montar | Campo de todo layout | Enum fijo (3 valores) | `RecordList` → tabla. `RecordDetail` → form/ficha. `ChibiList` → lista compacta |
| **Mode** | Sub-tipo de RecordDetail: `view`, `edit`, `create` | Variar el render del form segun el contexto | Solo en RecordDetail | `view` read-only, `edit` editable, `create` form vacio (puede tener `steps` wizard) | Campo del layoutConfig. Resuelve el comportamiento dentro de RecordDetail |
| **LayoutOrchestrator** | Componente Vue singleton — el motor runtime | Resolver (objectName + layoutType + layoutId) → montar dinamicamente el componente concreto | Se invoca desde Router (fullscreen), ModalStackManager (modal) o dentro de otro Orchestrator (embed) | Logica: fetch layoutConfig, procesa placeholders, inyecta caps, monta componente motor | **1 solo** en UP1 (`up1/layout/src/layouts/LayoutOrchestrator.vue`). Se instancia N veces en runtime — 1 por cada "vista activa" |
| **Componente motor** | 3 componentes Vue fijos: `RecordList`, `RecordDetail`, `ChibiList` | Renderizar la UI final segun layoutType | Al invocar el Orchestrator con ese type | Logica especifica (tabla + rowActions / form + tabs / lista compacta) | Reciben el layoutConfig del Orchestrator. Consultan el Object via GraphQL `listInstances` / `getInstance` |
| **Component del mod** | Vue component custom `mods/<mod>/components/<Name>/<Name>.vue` | Widget embebible dentro del schema de un layout cuando los tipos estandar no alcanzan | Cuando se necesita UI/logica no expresable como field estandar | Props, logica Vue, render custom | N por mod. Synced a `modsComponents/`. Invocado por tipo `field.type: "<kebab-case>"` |
| **Row Action** | Accion por fila del RecordList | Disparar navegacion a otro layout (modal, navigate, create) o accion inline (delete, external) | En cualquier RecordList | `id`, `label`, `type` (navigate/modal/create/delete/external/default), `targetLayoutId`, `targetObjectName`, `requiredCapability`, `conditions`, `visibilityConditions`, `initialDataMapping` | 2 fuentes: `rowActions[]` explicito en layoutConfig + flags implicit `canView/canEdit/canDelete/canCreate` sintetizados por UP1 |
| **Header Action** | Accion a nivel header del listado (tipicamente "Crear") | Abrir el form de creacion | RecordList con `canCreate: true` | Mismo shape que Row Action | Sintetizado desde `canCreate` + `canCreateLayoutId`. Posicion visual: toolbar superior de la tabla |
| **Tab** | Seccion de un RecordDetail — agrupa fields o embebe otro layout | Reorganizar un detalle complejo en pestañas | En RecordDetail con muchos fields o con sub-listas | `key`, `label`, `elements` (fields del schema propio) **o** `associatedLayoutId` (sub-layout embebido), `type` opcional | 4 sub-tipos: agrupador simple / con componentes custom / con field record-list (embed via field) / embedder directo (`associatedLayoutId`) |
| **Step** | Paso del wizard (multi-step form) | Guiar la creacion en fases con validacion por step | RecordDetail `mode: create` con flow guiado | `key`, `label`, `elements` (fields del schema) | Definido en `layoutConfig.steps`. Orden lineal. Navegacion Siguiente/Anterior. Misma estructura `{label, elements}` que Tab agrupador, distinta UX |
| **Sub-layout embebido** | Layout que aparece dentro de otro Orchestrator | Mostrar listas relacionadas o modales dentro de un detalle | Via `tab.associatedLayoutId` o `field.type: "record-list"` con `field.layoutId` | Dispara un nuevo LayoutOrchestrator anidado con su propio fetch y lifecycle | Mecanismo clave para la recursion de vistas UP1. Sub-Orchestrator independiente |
| **AssociatedLayoutConfig** | Layout referenciado por ID desde otro layout | Reutilizar un layout en multiples contextos sin duplicar la config | `rowActions` con targetLayoutId, tabs con associatedLayoutId, field record-list | Se resuelve en `LayoutOrchestrator` al montar (fetch el layout referenciado) | Permite factorizar forms compartidos (ej: `hw_intervention_edit` reusado desde varios listados) |
| **Capability** | Permiso RBAC atomico | Gating granular de accesos (objeto/field/mod) | Todo el sistema — en resolvers, layouts, rowActions | `name` (`<obj>:<verb>` o `<obj>.<field>:<verb>` o `mod/<mod>:<action>`), `riskLevel` | Generadas por codegen desde objects (auto) o definidas en `capabilities.json` del mod (custom) |
| **Role** | Rol del sistema | Agrupar capabilities. Vincular users al rol para asignar permisos | Asignado a users via `RoleAssignment` | N capabilities via `core_RoleCapability` | Roles tipicos: Admin, Coordinador, Consultor, Estudiante, Facilitador, Gestor, Colaborador, Viewer, Limited Editor |
| **RoleAssignment** | Asignacion user ↔ role + contexto | Asignar permisos a un user dentro de un tenant | Al crear users o gestionar accesos | 1 user, 1 role, 1 `contextPath`, 1 `contextId` | Un user puede tener N role assignments (por tenant, por institucion, etc.) |
| **Tenant** | Organizacion cliente (DB separada) | Aislar data entre clientes (multi-tenancy) | Siempre — todo dato vive en un tenant | Propia instancia Prisma + DB PostgreSQL. Tabla `up1_suite_app`, `up1_layen_layout`, `core_User`, etc. | Ej: UPU, TEST. Un user puede tener roles distintos por tenant |
| **Event** | Definicion de trabajo async (BullMQ + Redis) | Procesar acciones en background disparadas por mutations GraphQL | Cuando una mutation requiere side-effects pesados o integracion externa (ej: disparar n8n) | JSON `events/*.json`: `name`, `queue`, `handler` | Sincado desde mod. Worker BullMQ consume. Handler puede ser codigo propio o invocacion n8n via flowService |
| **Menu item** | Entry del menu superior del app (inferido) | Mostrar al user como entrar a cada objeto de la app | Al seleccionar una app en el sidebar de suite | Inferido de `app.defaultObjects × layouts(applicationId=app.id)` — no hay campo JSON explicito en `app.json` | Bayley lo grafica explicitamente en el AppNode; UP1 runtime lo deriva en `useObjectManager.getLayoutsForApp()` |
| **FlowService** | Cliente UP1 ↔ n8n (Orchestrator de workflows externos) | Puente GraphQL → n8n REST para ejecutar workflows cuando se dispara un event | Apps que usan mod `flow-viewer` y eventos ligados a workflows n8n | Logica: session bridge (login n8n con member), API key rotation, workflow sharing | `object-manager/src/services/flowService.js`. Ver SPEC-operations-002 |

## Cardinalidades (cuantos "de cada" hay)

| Elemento | Cardinalidad | Notas |
|----------|--------------|-------|
| Mod | N por instalacion | Varios mods en up1 (hello-world, engagement, flow-viewer, ai-agent, ...) |
| App | 0 o 1 por mod · N por tenant | Registrada en `up1_suite_app` post-sync |
| Object Base | N | Crece con el dominio |
| Object Extended | 0 o 1 por (Base × cliente) | Solo una extension por cliente de un base |
| Field | N por Object | Definidos en el JSON del Object |
| Layout | N por Object | Tipico: list + view + edit + create + N customs |
| LayoutType | 3 posibles | RecordList, RecordDetail, ChibiList |
| Mode | 3 posibles | view, edit, create (solo RecordDetail) |
| LayoutOrchestrator (componente) | **1 en todo UP1** | Singleton. Se instancia N veces en runtime |
| Componentes motor | **3 fijos** | RecordList.vue, RecordDetail.vue, ChibiList.vue |
| Component del mod | N por mod | Widgets custom |
| Row Action | N por RecordList | Explicit + implicit (Ver/Editar/Eliminar/Crear) |
| Tab | N por RecordDetail | 0+ |
| Step | N por RecordDetail mode=create | 0 (sin wizard) o N (wizard) |
| Capability | ~8-12 auto por Object + N custom por mod | Generadas por codegen + definidas en capabilities.json |
| Role | ~10-15 fijos a nivel sistema | Compartidos entre apps del tenant |
| Tenant | N | Aislados (UPU, TEST, ...) |

## Relaciones entre elementos (quien contiene / referencia a quien)

```
Tenant (N)
 │
 └─ App (N por tenant)
     │  ├─ defaultObjects → Object (N ref)
     │  └─ roles → Role (N ref)
     │
     └─ Layouts del menu (N con applicationId=app.id)
         │
         ├─ columns (RecordList) → Field (N del Object)
         ├─ rowActions → Layout target (modal/navigate/create via targetLayoutId)
         ├─ canCreate flags → Layout create (via canCreateLayoutId)
         ├─ tabs (RecordDetail) → Field elements + associatedLayoutId → Layout
         ├─ steps (RecordDetail mode=create) → Field elements (wizard)
         ├─ schema fields → type estandar OR type=<component-del-mod> OR type=record-list→Layout
         └─ roles → Role (N ref, RBAC gate)

Paralelamente en codigo:
LayoutOrchestrator (singleton)
 │ se invoca con (objectName, layoutType, layoutId, mode) →
 │ monta 1 de:
 │   ├─ RecordList.vue
 │   ├─ RecordDetail.vue
 │   └─ ChibiList.vue
 │ que al render recorre schema/columns y monta:
 │   ├─ types estandar → Vueform components
 │   ├─ types custom → Component del mod
 │   ├─ type=record-list → OTRO LayoutOrchestrator anidado
 │   └─ tabs Tipo B → OTRO LayoutOrchestrator anidado

Capability (N)
 ├─ assigned to Role via core_RoleCapability
 ├─ gate at: app visibility (requiredPermissions) / layout visibility (roles) / rowAction (requiredCapability) / field render
 └─ auto-generated per Object + custom per Mod

Event (N por mod)
 ├─ disparado por mutation GraphQL (createInstance, updateInstance, ...)
 └─ → BullMQ queue → handler (code) OR n8n workflow (via flowService)
```

## Flujos de uso — construccion de vistas

Cada flujo asume un mod existente. El orden siguiente minimiza rework.

### Flujo 1 — Dar de alta un Object nuevo en un mod

**Objetivo**: agregar una entidad de datos (ej: `Evaluacion`) que despues se mostrara en vistas.

1. Crear JSON en `mods/<mod>/objects/<Object>.json` con `name`, `metadata` (label/labelPlural/gender), `fields` (con tipos), `required`, `relations` (FK)
2. Ejecutar `npm run sync` desde el root de up1 (propaga a `object-manager/objects/`)
3. `npm run codegen --workspace=@uplanner/object-management-backend` — genera Prisma schema + tipos GraphQL + capabilities
4. `npm run tenant:migrate --workspace=@uplanner/object-management-backend` — aplica migracion a DBs (Base + Extended)
5. Verificar en `object-manager/prisma/<TENANT>/schema.prisma` que el modelo quedo
6. (Opcional) Si queres extensiones por cliente, crear `mods/<mod>/objects/ext__<CLIENT>__<Object>.json`
7. Verificacion: `listInstances(name: "<Object>")` en GraphQL devuelve `items: []` sin errores

**Bloqueante**: sin este paso ningun layout puede apuntar al Object.

### Flujo 2 — Crear una vista (Layout) para un Object

**Objetivo**: ofrecer una UI (lista o detalle) del Object en una app.

1. Crear JSON en `mods/<mod>/config/layouts/<nombre>.json`:
   - Estructura minima: `{ id, name, label, objectName, layoutType, applicationId, roles, tenants, layoutConfig }`
   - `layoutType`: `RecordList` / `RecordDetail` / `ChibiList`
   - `applicationId`: el id de la app **si** va al menu de esa app; `null` para auxiliares (modales)
   - `roles`: quienes pueden ver el layout (gate de `getAllLayoutsFiltered`)
2. Completar `layoutConfig` segun layoutType:
   - **RecordList**: `columns`, `rowActions` (opcional), flags `canEdit/canDelete/canCreate` + `canCreateLayoutId`, `defaultSort`, `showSearch`
   - **RecordDetail**: `mode`, `schema` (fields con type), `tabs` o `steps` (opcional), `autoAssignFields` (create), `enableFKCreateButton`
3. `npm run sync` — propaga a `up1_layen_layout` en DB
4. Verificacion runtime: acceder a `/UPU/<Object>/<LayoutType>/<layoutId>` en suite

**Tip**: si el layout reutiliza otros layouts (rowActions con targetLayoutId, tabs con associatedLayoutId), crear PRIMERO los layouts referenciados.

### Flujo 3 — Registrar una App

**Objetivo**: exponer la funcionalidad como entry en el sidebar de suite.

1. Crear JSON en `mods/<mod>/config/app.json` con `name`, `label`, `icon` (SVG inline o clase `bi-*`), `order`, `roles`, `tenants`, `defaultObjects`, `requiredPermissions` (opcional)
2. `defaultObjects` = array de `objectName` que conformaran el menu (el menu se infiere cruzando con los layouts `applicationId=app.id` que son `RecordList`)
3. `npm run sync` — registra en `up1_suite_app` por tenant
4. Verificar asignacion de roles en `up1_suite_app_role` — si se define `roles: ["Admin", "X"]`, el sync crea las filas en esa tabla
5. Verificacion: el app aparece en `getAppsFiltered` y como item en el sidebar de suite (si el user tiene roles que coinciden)

**Atencion**: el mod debe estar activado (no estar en `ignoredMods` del `package.json` raiz) antes del sync.

### Flujo 4 — Conectar navegaciones (rowActions, tabs, record-list)

**Objetivo**: definir que hace cada click en la vista — abrir modal, navegar, crear, embeber lista.

**Opcion A — Row action modal** (editar/custom desde fila del listado):
```json
// En rowActions del RecordList
{
  "id": "edit",
  "label": "Editar",
  "type": "modal",
  "targetLayoutId": "<objeto>_edit",
  "requiredCapability": "<objeto>:modify"
}
```
UP1 dispara sub-Orchestrator en overlay. Edge `action-modal` (violet dashed) en el grafo Bayley.

**Opcion B — Row action navigate** (pantalla completa):
```json
{ "id": "view", "label": "Ver", "type": "navigate", "targetLayoutId": "<objeto>_view" }
```
Router push. Edge `action-navigate` (blue).

**Opcion C — Row action create** con data pre-poblada:
```json
{
  "id": "create-child",
  "label": "Crear Intervencion",
  "type": "modal",
  "targetLayoutId": "hw_intervention_create",
  "targetObjectName": "HwIntervention",
  "initialDataMapping": { "hwAssessmentId": "record.id" }
}
```

**Opcion D — Tab agrupador inline**:
```json
// En layoutConfig.tabs de RecordDetail
{
  "detail": { "label": "Detalle", "elements": ["fieldA", "fieldB"] }
}
```
Solo agrupa fields del mismo layout. No dispara sub-Orchestrator.

**Opcion E — Tab embedder directo** (Tipo B):
```json
{
  "factors": { "label": "Factores", "associatedLayoutId": "<objeto>_child_list" }
}
```
Dispara sub-Orchestrator con el layout referenciado. Edge `tab-embed` (pink).

**Opcion F — Field record-list** (sub-vista via field del schema):
```json
// En layoutConfig.schema
{
  "factorsList": {
    "type": "record-list",
    "layoutId": "hw_factor_assessment_list",
    "label": "Factores"
  }
}
```
Mismo efecto que Opcion E pero via field. Tipico: detalle que lista hijos filtrados por `{{parentId}}`.

**Opcion G — Flags implicit** (sin necesidad de declarar acciones):
```json
{
  "canView": true,
  "canEdit": true,
  "canDelete": true,
  "canCreate": true,
  "canCreateLayoutId": "<objeto>_create"
}
```
UP1 sintetiza los 4 botones automaticamente. Resuelve target layouts buscando por `objectName + mode=view/edit/create`.

### Flujo 5 — Agregar wizard (steps) en creacion

**Objetivo**: guiar al user por fases con validacion por step.

1. Crear layout `mode: create` con `steps` en lugar de campos plano:
```json
{
  "mode": "create",
  "steps": {
    "step1": { "label": "Datos basicos", "elements": ["name", "type"] },
    "step2": { "label": "Configuracion", "elements": ["priority", "assignee"] }
  },
  "schema": {
    "name": { "type": "text" },
    "type": { "type": "select" },
    "priority": { "type": "select" },
    "assignee": { "type": "lookup", "relations": "User" }
  }
}
```
2. `npm run sync`
3. Verificacion en suite: al abrir el create, UP1 renderiza barra de steps + botones Anterior/Siguiente
4. En Bayley (grafo Apps) el nodo modal del create muestra seccion "Pasos (wizard)" con cada step y sus elements

### Flujo 6 — Agregar component del mod (widget custom)

**Objetivo**: embeber logica/UI no expresable con types estandar.

1. Crear componente Vue: `mods/<mod>/components/<PascalName>/<PascalName>.vue`
2. (Opcional) stories: `<PascalName>.stories.ts` + mocks/types
3. `npm run sync` — propaga a `suite/modsComponents/` y `layout/modsComponents/`
4. Referenciar en un layout field como type **kebab-case** del componente:
```json
// En layoutConfig.schema
{
  "myWidget": { "type": "<pascal-name-en-kebab>", "label": "Mi Widget" }
}
```
5. El Orchestrator → RecordDetail → encuentra el type custom → monta el `.vue` en ese slot

**Convencion**: `RandomPersonCard.vue` → type en config `"random-person-card"`.

### Flujo 7 — Configurar RBAC (capabilities + roles)

**Objetivo**: controlar quien ve/hace que.

1. Capabilities auto-generadas (codegen) cuando creas el Object:
   - `<objectname>:view/create/modify/delete`
   - `<objectname>.<fieldname>:view/modify` para cada field
2. Capabilities custom del mod en `mods/<mod>/capabilities.json`:
```json
{
  "capabilities": [
    { "name": "mod/<mod>:view_metrics", "riskLevel": "low", "description": "..." }
  ]
}
```
3. Asignacion de capabilities a roles — actualmente **hardcodeada en `object-manager/scripts/sync/dbSync.js` DEFAULT_ROLES = [Admin, Consultor, Colaborador]**. Otros roles requieren insert manual en `core_RoleCapability` o extender el sync
4. RoleAssignment de un user: via tabla `core_RoleAssignment` con `userId`, `roleId`, `contextPath`, `contextId`
5. Gate en layout/rowAction: campo `roles: [...]` en el JSON del layout, `requiredCapability: "..."` en rowActions
6. Verificacion: `getMyPermissions` del GraphQL devuelve las caps efectivas del user
7. En Bayley: el selector de rol del toolbar filtra via header `x-selected-role` → el backend retorna solo apps/layouts visibles para ese rol

### Flujo 8 — Conectar event async (BullMQ + n8n)

**Objetivo**: disparar workflow async al ocurrir una mutation (ej: crear intervencion → enviar notificacion).

1. Crear definicion en `mods/<mod>/events/<name>.json`:
```json
{
  "name": "IntervencionCreated",
  "queue": "wellbeing",
  "handler": "./handlers/notifyIntervencion.js" 
}
```
2. Implementar handler (codigo) o asociar workflow n8n
3. Resolver GraphQL de la mutation emite al queue: `bullmq.add('wellbeing', { ... })`
4. Worker BullMQ consume y ejecuta handler o llama `flowService.triggerWorkflow(...)`
5. Docker: worker corre bajo `docker compose --profile worker up -d`

## Mapeo grafico (referencia para Bayley Apps View)

| En Bayley canvas | Entidad UP1 real |
|------------------|------------------|
| `AppNode` indigo | Fila en `up1_suite_app` + `mods/<mod>/config/app.json` |
| `LayoutNode` blue `[LAYOUT]` | Fila en `up1_layen_layout` con `applicationId=app.id` |
| `ModalNode` violet `[MODAL]` | Layout con `applicationId=null`, target de `rowAction type=modal` o `create` |
| `TabNode` pink `[TAB]` | Tab Tipo B (associatedLayoutId) — layout embebido como pestaña |
| TabNode extraido (agrupador Tipo A) | Pestaña sintetica inline — mismo Orchestrator que el padre |
| Edge cyan `menu-item` | Item del menu derivado (`applicationId === app.id` + RecordList) |
| Edge emerald grueso `Default` | Landing (primer layout visible del menu) |
| Edge violet dashed `modal` | `rowAction.type === 'modal'` |
| Edge blue `navigate` | `rowAction.type === 'navigate'` |
| Edge emerald `create` | `canCreate: true` + `canCreateLayoutId` |
| Edge pink `tab-embed` | `tab.associatedLayoutId` o `field.type: "record-list"` + `field.layoutId` |
| Edge red dashed `cycle` | Target ya visible en el grafo (recursion detectada) |
| Edge red dotted `dangling` | Target no resoluble (referencia rota) |
| Badge `⚙️ O-N` | ID del LayoutOrchestrator que monta el nodo. N nodos con mismo O-N = mismo Orchestrator |
| Icono 🏠 + ring emerald | Default/landing view |

## Cheat sheet — que edicion toca cada cambio

| Quiero... | Toco... | Comando despues |
|-----------|---------|-----------------|
| Agregar un Object | `mods/<mod>/objects/<X>.json` | `sync` + `codegen` + `tenant:migrate` |
| Agregar un field al Object | Idem, field en `fields[]` | `sync` + `codegen` + `tenant:migrate` |
| Agregar una vista nueva | `mods/<mod>/config/layouts/<X>.json` | `sync` |
| Cambiar que ve una vista (columnas / tabs) | `layoutConfig` del layout JSON | `sync` |
| Agregar row action custom | `rowActions[]` del layoutConfig | `sync` |
| Activar Ver/Editar/Eliminar/Crear default | Flags `canView/canEdit/...` + `canCreateLayoutId` | `sync` |
| Agregar wizard al create | `layoutConfig.steps` | `sync` |
| Agregar pestaña inline | `layoutConfig.tabs.<key>.elements[]` | `sync` |
| Agregar pestaña con sub-lista | `tab.associatedLayoutId` **o** field `type: "record-list"` + `layoutId` | `sync` |
| Agregar widget custom | `mods/<mod>/components/<Name>/<Name>.vue` + referenciar con type kebab | `sync` |
| Registrar app en el menu | `mods/<mod>/config/app.json` | `sync` + asegurar mod no en `ignoredMods` |
| Restringir por rol | `roles: [...]` en layout JSON + `up1_layen_layout_role` / `up1_suite_app_role` | `sync` |
| Capability custom del mod | `mods/<mod>/capabilities.json` | `sync` + insert manual en RoleCapability para roles no-default |
| Nuevo tenant | `npm run tenant:create --workspace=@uplanner/object-management-backend` | `tenant:migrate` |
| Disparar async (BullMQ) | `mods/<mod>/events/<X>.json` + handler | `sync` + restart worker |

## Referencias

- Parent: [SPEC-core-001](../index.md) — indice general UP1
- Object Manager: [SPEC-core-001-detail](./object-manager.md) — codegen, resolvers, RBAC
- Programmatic objects: [./programmatic-objects.md](./programmatic-objects.md)
- Bayley Apps View (herramienta de inspeccion visual de esta estructura): [../../../deckard/projects/bayley/specs/views/SPEC-views-apps-flow.md](../../../deckard/projects/bayley/specs/views/SPEC-views-apps-flow.md)
- Sidecar runtime (acceso a layouts DB desde Bayley): [../../../deckard/projects/bayley/specs/runtime-layouts/SPEC-runtime-sidecar.md](../../../deckard/projects/bayley/specs/runtime-layouts/SPEC-runtime-sidecar.md)
- n8n setup (flow/events): [../operations/n8n-local-setup.md](../operations/n8n-local-setup.md)
- Codigo motor: [up1/layout/src/layouts/LayoutOrchestrator.vue](../../../up1/layout/src/layouts/LayoutOrchestrator.vue)
