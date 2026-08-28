---
id: DOC-kb-onboarding-07-componentes-y-flujos
project: up1
type: doc
---

# Componentes y flujos entre componentes

Un mod en UP1 no se limita a CRUD sobre objects — puede introducir componentes custom (arboles, dashboards, widgets interactivos) y orquestar flujos entre ellos, tanto sincronos (dentro de la UI) como asincronos (entre mods, via eventos). Esta guia explica los niveles de componente, quien los orquesta, y como encadenar interacciones.

## Los tres niveles de componente

```
┌─────────────────────────────────────────────────────────────────┐
│ Nivel 1 — Componentes base UP1 (core, no se editan desde mods)  │
│   RecordList · RecordDetail · ChibiList · OfferingCalendar      │
│   ImportTaskList · AiChatbox                                     │
└─────────────────────────────────────────────────────────────────┘
                           ▲
                           │ se componen dentro via layout JSON
                           │
┌─────────────────────────────────────────────────────────────────┐
│ Nivel 2 — Componentes custom del mod                             │
│   mods/{mod}/modsComponents/MiWidget/MiWidgetElement.vue         │
│   Vueform elements con logica propia (queries, estado, UI)       │
└─────────────────────────────────────────────────────────────────┘
                           ▲
                           │ consumen logica compartida
                           │
┌─────────────────────────────────────────────────────────────────┐
│ Nivel 3 — Composables del mod                                    │
│   mods/{mod}/modsComposables/useMiLogica.ts                      │
│   Queries Apollo, estado reactivo reutilizable                   │
└─────────────────────────────────────────────────────────────────┘
```

### Nivel 1: componentes base

Viven en `layout/src/` (workspace core). Son orquestradores genericos que consumen un layout JSON y renderizan la UI:

| Componente | `layoutType` | Uso |
|-----------|--------------|-----|
| `RecordList` | `"RecordList"` | Tabla con busqueda, filtros, paginacion, row actions |
| `RecordDetail` | `"RecordDetail"` | Formulario con tabs, modos view/edit/create |
| `ChibiList` | `"ChibiList"` | Listado compacto para sidebar/mobile |
| `OfferingCalendar` | `"OfferingCalendar"` | Calendario de oferta academica |
| `ImportTaskList` | `"ImportTaskList"` | Flujo de importacion masiva |
| `AiChatbox` | `"AiChatbox"` | Chat con LLM |

**Un mod no edita estos componentes** — los consume declarando `layoutType` en sus layouts JSON.

### Nivel 2: componentes custom del mod

Para UI que los base no cubren (arboles, graficos, widgets drag-and-drop, visualizaciones especificas).

**Convencion de estructura:**

```
mods/{mod}/modsComponents/
└── CompetencyTree/             ← una carpeta por componente
    ├── CompetencyTreeElement.vue   ← obligatorio, un solo .vue
    ├── helpers.ts                  ← auxiliares (OK)
    └── styles.css                  ← estilos (OK)
```

Reglas rigidas ([01 — desarrollar mods](01-desarrollar-mods.md) §componentes):
- Un `.vue` por carpeta (el registro automatico los detecta por glob)
- El nombre termina en `Element.vue` y exporta un `defineElement` de Vueform
- Subcarpetas con `.vue` anidados → sync las rechaza

**Patron minimo:**

```vue
<template>
  <ElementLayout>
    <template #element>
      <div ref="rootEl" class="competency-tree">
        <!-- contenido -->
      </div>
    </template>
  </ElementLayout>
</template>

<script>
import { defineElement } from '@vueform/vueform';
import { useTenantApolloClient } from '@/composables/useApolloClient';
import { useCompetencyTree } from '../../modsComposables/useCompetencyTree';

export default defineElement({
  name: 'CompetencyTreeElement',  // → type: "competency-tree" en el layout
  submits: false,
  setup() {
    const { client } = useTenantApolloClient();
    const { nodes, load, save } = useCompetencyTree(client);
    return { nodes, load, save };
  },
});
</script>
```

**Tras sync**: el componente se copia a `layout/src/modsComponents/` (Storybook) y `suite/modsComponents/` (app). El registro global de Vueform lo detecta automaticamente; solo hay que reiniciar el dev server de Suite la primera vez.

### Nivel 3: composables

Logica reutilizable entre varios componentes custom del mod. Viven en `mods/{mod}/modsComposables/useMiLogica.ts`.

**Regla clave**: toda query/mutation GraphQL debe pasar por `useTenantApolloClient()` — nunca Apollo directo. Esto inyecta el header `X-Tenant-ID` automaticamente.

```typescript
import { gql } from 'graphql-tag';

export function useCompetencyTree(client) {
  const load = async (matrixId: string) => {
    const { data } = await client.query({
      query: gql`query ($id: String!) { caCompetencies(where: { caCompetencyMatrixId: $id }) { id code name parentId } }`,
      variables: { id: matrixId },
    });
    return data.caCompetencies;
  };
  return { load };
}
```

## LayoutOrchestrator: el ensamblador

LayoutOrchestrator es el componente Vue del core que **siempre** esta entre la URL y los componentes:

```
URL  /UPU/CaCompetencyMatrix/RecordList/ca_matrix_list
  │
  ▼
LayoutOrchestrator lee de DB: layout "ca_matrix_list"
  │
  ├── layoutType: "RecordList" → monta <RecordList />
  │                                    │
  │                                    │ procesa cada tab/schema del layout
  │                                    ▼
  │                            ┌───────────────────────┐
  │                            │ schema                 │
  │                            │  ├── "name": text       │ ← campo standard
  │                            │  ├── "tree":            │
  │                            │  │    type: "competency-tree" │ ← custom element
  │                            │  └── "childrenList":    │
  │                            │       type: "record-list" │ ← recursion
  │                            └──────────┬────────────┘
  │                                       │
  │                                       ▼
  │                          LayoutOrchestrator anidado
  │                          carga otro layout hijo
  │                          (el ciclo se repite)
```

Cinco responsabilidades del orquestador:

1. **Resolver el layout** — lee de la tabla `up1_layen_layout` el JSON para `tenant + objectName + layoutId`
2. **Elegir el componente base** segun `layoutType`
3. **Procesar el schema** — por cada campo, decide si renderizar un input standard o delegar a un custom element por su `type`
4. **Resolver placeholders** — `{{parentId}}`, `{{currentUser}}`, etc. se reemplazan con valores del contexto
5. **Encadenar layouts** — sub-layouts (record-list embebido, associatedLayout, modales de row actions) disparan nuevas instancias del orquestador

Un mod nunca invoca al orquestador directamente — lo invoca declarando layouts JSON. El encadenamiento entre vistas es declarativo.

## Flujos entre componentes (sincronos, en la UI)

Los flujos en la UI se describen en el layout JSON; el orquestador los ejecuta.

### Patrones disponibles

| Patron | En el layout JSON | Resultado en la UI |
|--------|-------------------|-------------------|
| **Navegar a otra vista** | `rowAction` con `type: "navigate"` + `targetLayoutId` | Click en fila → abre RecordDetail |
| **Abrir modal** | `rowAction` con `type: "modal"` + `targetLayoutId` | Click → abre layout en modal |
| **Formulario de creacion desde listado** | `createLayout: "{obj}_create"` | Boton "Crear" abre modal |
| **Lista hija filtrada** | `type: "record-list"` con `filters: [{"value": "{{parentId}}"}]` | Detalle muestra sublista del padre |
| **Layout cross-objeto** | `type: "associatedLayout"` | Tab renderiza layout completo de otro objeto |
| **Custom UI embebida** | `type: "mi-elemento"` | Renderiza `MiElementoElement.vue` en el schema |
| **Accion condicionada** | `visibilityConditions` + `requiredCapability` | Boton solo visible si estado/permiso cumple |
| **Paso de datos al modal** | `initialDataMapping: { "parentId": "record.id" }` | El modal abre con valores del registro actual |

### Ejemplo concreto: flujo encadenado

**Objetivo funcional:** desde un listado de matrices, abrir el detalle, ver el arbol de competencias, crear una competencia hija desde el arbol.

```
ca_matrix_list (RecordList)
     │
     │  row action "Ver detalle" → navigate
     ▼
ca_matrix_view (RecordDetail, tabs)
     │
     │  tab "Competencias" → custom element "competency-tree"
     ▼
CompetencyTreeElement.vue
     │
     │  boton "Agregar hija" dentro del arbol → emite abrir modal
     ▼
ca_competency_create (RecordDetail mode: create, applicationId: null)
     │
     │  al guardar → refresca el arbol via composable
     ▼
back al arbol con el nuevo nodo
```

Cada transicion es una pieza distinta:

- **Entre layouts base**: declarativa (rowActions, tabs, createLayout)
- **Dentro del custom element**: imperativa (el Vue custom abre el modal via composable o via router) — pero el modal sigue siendo un layout JSON gestionado por el orquestador

## Flujos entre componentes (async, entre mods)

Cuando la interaccion cruza el boundary del mod (o necesita ocurrir sin que el usuario espere), UP1 usa eventos + Flow Engine (BullMQ + n8n).

```
Mutation en Object Manager (createCase, updateMatrix, ...)
         │
         │  si hay match en events/*.json
         ▼
Evento publicado en Redis
         │
         ▼
BullMQ worker lo toma → entrega al workflow n8n
         │
         ▼
Workflow ejecuta nodos: notificar, crear registro en otro mod,
                       llamar API externa, etc.
```

### Declaracion de un evento

`mods/mi-mod/events/case-closed.json`:

```json
{
  "id": "case:closed",
  "description": "Caso de soporte cerrado",
  "trigger": {
    "objectType": "StudentSupport",
    "operation": "update",
    "condition": "data.status === 'CLOSED'"
  },
  "includeFields": ["id", "studentName", "closedAt"],
  "priority": 3,
  "attempts": 3
}
```

### Declaracion de un flow

`mods/mi-mod/flows/on-case-closed.json` (exportado desde n8n):

```json
{
  "name": "[SupportMod] On Case Closed",
  "nodes": [
    {
      "name": "Trigger",
      "type": "n8n-nodes-base.up1EventCreate",
      "parameters": { "tenantId": "UPU", "objectType": "StudentSupport", "domain": "student-support" }
    },
    {
      "name": "Notificar",
      "type": "n8n-nodes-base.up1Notification",
      "parameters": { "channels": ["inapp", "email"], "title": "Caso cerrado" }
    }
  ],
  "connections": { "Trigger": { "main": [[{ "node": "Notificar" }]] } }
}
```

### Uso tipico

- Notificar al tutor cuando se cierra un caso
- Disparar recalculo de agregados cuando cambia un registro maestro
- Crear tareas en otro mod al completar un flujo
- Sincronizar con sistemas externos (LMS, CRM) sin bloquear la UI

Ver [mods/llm/recipes/events-flows.md](../mods/llm/recipes/events-flows.md) para todas las recetas.

## Habilitacion por cliente de componentes y flujos

Las seis capas del documento [06](06-configuracion-por-cliente.md) aplican con matices:

| Elemento | Habilitacion por cliente |
|----------|-------------------------|
| Componente base UP1 | Siempre disponible (core). Filtrado via `tenants` del layout que lo invoca |
| Componente custom (`MiWidgetElement.vue`) | Disponible globalmente tras sync, pero solo renderiza si un layout visible para el cliente lo referencia |
| Flujo declarativo en layout | Respeta `tenants` y `roles` del layout. `rowActions` filtradas por `requiredCapability` |
| Composable | No se filtra — es codigo del cliente. El filtro ocurre en la query (withAuth, tenantId) |
| Evento | Se dispara en **todas** las mutations matcheadas. El `tenantId` viaja en el payload |
| Flow n8n | Los nodos `up1EventCreate` declaran `tenantId` explicito — un flow escucha solo los tenants declarados |

**Patron recomendado para componentes por cliente:**

```
Un solo componente MiWidgetElement.vue (generico)
         │
         │ se invoca desde...
         ├── layout_version_A.json  (tenants: ["UPU"])  → con props/config A
         └── layout_version_B.json  (tenants: ["DEMO"]) → con props/config B
```

El componente recibe su configuracion desde el layout (via props de Vueform). No se duplica el .vue — se duplica solo el JSON.

**Patron recomendado para flujos por cliente:**

```
Un solo evento en events/case-closed.json (todos los tenants)
         │
         ├── flows/on-case-closed-upu.json  (trigger con tenantId: "UPU", domain: "student-support")
         └── flows/on-case-closed-demo.json (trigger con tenantId: "DEMO", domain: "student-support")
```

Cada flow decide su propia logica por cliente. Si la logica es identica, un solo flow con `tenantId: "all"` escucha todos.

## Ejemplo end-to-end: retention con componentes, flujos y per-tenant

**Requisitos:**
- Dashboard de retention con widget de riesgo (custom)
- UPU: dashboard con score de riesgo calculado
- DEMO: mismo dashboard, sin score (sin los campos)
- Al cerrar un caso → notificar al tutor (UPU) o solo registrar (DEMO)

### Archivos

```
mods/retention/
├── config/
│   ├── app.json                         ← tenants: ["UPU", "DEMO"]
│   └── layouts/
│       ├── retention_dashboard.json      ← contiene "riskWidget"
│       └── retention_case_view.json
├── modsComponents/
│   └── RetentionDashboard/
│       └── RetentionDashboardElement.vue
├── modsComposables/
│   └── useRiskScore.ts                   ← query de score + helpers
├── objects/
│   ├── RetentionCase.json
│   └── ext__UPU__person.json             ← riskScore solo en UPU
├── events/
│   └── case-closed.json
└── flows/
    ├── on-case-closed-upu.json           ← notifica al tutor
    └── on-case-closed-demo.json          ← solo registra en log
```

### Que ocurre en UI

1. Usuario UPU entra al dashboard → LayoutOrchestrator carga `retention_dashboard.json`
2. El schema incluye `{ riskWidget: { type: "retention-dashboard" } }` → renderiza `RetentionDashboardElement`
3. El componente usa `useRiskScore()` → consulta `person { riskScore }` (el campo existe en UPU)
4. Usuario DEMO entra al mismo dashboard → el custom element no pide `riskScore` (el composable detecta la ausencia) o muestra placeholder

### Que ocurre al cerrar un caso

1. Mutation `updateRetentionCase(status: "CLOSED")` se ejecuta
2. Object Manager matchea `events/case-closed.json` → publica en Redis con `tenantId`
3. n8n recibe:
   - UPU: `on-case-closed-upu.json` → `Up1Notification` al tutor
   - DEMO: `on-case-closed-demo.json` → solo audit log
4. Ninguno de los dos flows se ejecuta para tenants distintos de los declarados

## Validacion

Matriz sugerida cuando introduces componentes y flujos:

| Verificacion | Comando / accion | Resultado esperado |
|--------------|-----------------|-------------------|
| Componente registrado | `npm run sync` + reiniciar Suite | En Storybook `:6006` aparece bajo "modsComponents" |
| Componente renderiza | Navegar a layout que lo invoca | El .vue se monta sin errores de consola |
| Composable con Apollo | Network tab del navegador | Query sale con header `X-Tenant-ID` correcto |
| Flujo UI declarativo | Click en rowAction | Modal/navigate abre el layout correcto |
| Placeholder `{{parentId}}` | Inspeccionar variables GraphQL | El ID del padre llega al filtro, no el literal `{{parentId}}` |
| Evento publicado | Ejecutar mutation matcheada | Redis Pub/Sub muestra mensaje en canal `{tenant}/{Object}/{mod}:{op}` |
| Flow disparado | n8n UI → "Executions" | Ejecucion exitosa con el payload del evento |
| Per-tenant custom | Probar componente en dos tenants | Comportamiento distinto segun datos disponibles |
| Per-tenant flow | Cerrar caso en UPU y DEMO | Solo el flow correspondiente se ejecuta |

## Anti-patrones

### Anti-patron 1: construir un componente que replica un base

```
❌  MiCompetencyMatrixListElement.vue que implementa tabla + busqueda + paginacion.
```

Ya existe `RecordList`. Usalo via layout JSON; solo crea custom si la UI genuinamente no se expresa con un base.

### Anti-patron 2: poner la logica en el componente en vez del composable

```
❌  RetentionDashboardElement.vue con 500 lineas de logica + queries + calculos.
✅  Componente: 50 lineas de template + wiring. Composable: toda la logica y estado.
```

Asi el composable se reutiliza en otros componentes y es testeable sin montar Vue.

### Anti-patron 3: `if (tenantId === "UPU")` dentro del componente

Mismo anti-patron que en resolvers. El componente recibe datos via props/queries; si el tenant no tiene el campo, el composable devuelve `null` y el template renderiza el fallback. El filtrado es declarativo (layout por tenant), no imperativo.

### Anti-patron 4: hacer flujos sincronos con colas

```
❌  Al guardar un caso, esperar a que el worker BullMQ procese antes de cerrar el modal.
✅  Mutation responde inmediato; el worker procesa async; la UI refresca via polling o notificacion inapp.
```

BullMQ esta disenado para fire-and-forget, no para que el usuario espere.

### Anti-patron 5: duplicar componentes por cliente

```
❌  MiWidgetUpuElement.vue + MiWidgetDemoElement.vue
✅  MiWidgetElement.vue que recibe props desde el layout y se comporta segun datos
```

## Resumen

- Tres niveles: base (core), custom (mod), composable (logica).
- LayoutOrchestrator ensambla todo declarativamente desde layouts JSON.
- Flujos en UI → declarativos en el layout (rowActions, tabs, record-list, associatedLayout).
- Flujos entre mods → eventos + flows n8n (async, desacoplados).
- La habilitacion por cliente aplica a ambos: layouts filtran que componentes se ven, flows filtran en que tenants se ejecutan.
- Un solo componente, multiples clientes — las variantes viven en el layout, no en el .vue.

---

Anterior: [06 — Configuracion por cliente](06-configuracion-por-cliente.md)
