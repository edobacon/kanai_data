---
id: SPEC-mods-004
project: up1
type: spec
module: mods
category: mods
tags: [up1, mods, internals, componentes, composables, vueform, graphql, apollo, data-flow, desarrollo-local, repo-local]
fecha: 2026-07-16
sources:
  - Codigo fuente de hello-world-mod y uengagement-up1 (modsComponents, modsComposables, logic)
  - layout/src/layouts/LayoutOrchestrator.vue
  - layout/src/elements/RecordListElement.vue, RecordDetailElement.vue
  - layout/vueform.config.ts, suite/vueform.config.ts
  - layout/src/modsComponents/component-registry.json
  - scripts/actions.js, scripts/check-mod-structure.js
  - object-manager/scripts/sync/ (SyncManager, fileSync, dbSync, logicSync, flowSync)
  - mods/docs/guides/development.md
---
# uP1 Mods — Flujo interno de datos, componentes y desarrollo local

## 1. Dos patrones de componentes

Dentro de un mod hay dos tipos de componentes Vue con propositos y mecanicas diferentes:

```text
                    ┌──────────────────────┐
                    │   Componente de mod  │
                    └──────────┬───────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  Patron A                │   │  Patron B                │
│  Vueform Element         │   │  Vue standalone          │
└──────────────┬───────────┘   └──────────────┬───────────┘
               │                              │
       ┌───────┴────────┐             ┌───────┴────────┐
       ▼                ▼             ▼                ▼
Invocado desde   defineElement   Invocado por    Composition
layouts JSON     + ElementLayout  otros           API estandar
                                  componentes
```

### Patron A: Vueform Element (integrado al Layout Engine)

Componentes que se registran como **tipos de campo** en el sistema de layouts. Se referencian por nombre en el JSON del layout schema (ej: `"type": "random-person-card"`).

**Archivos:**
```
modsComponents/
└── MiWidget/
    ├── MiWidgetElement.vue    ← Vueform element (defineElement)
    ├── useMiWidget.ts         ← Composable con logica de datos (GraphQL)
    ├── MiWidget.types.ts      ← Tipos TypeScript
    ├── MiWidget.mocks.ts      ← Datos mock para Storybook
    └── MiWidget.stories.ts    ← Story de Storybook
```

**Skeleton:**

```vue
<template>
  <ElementLayout>
    <template #element>
      <!-- Contenido custom aqui -->
      <div v-if="loading">Cargando...</div>
      <div v-else>{{ data }}</div>
    </template>
    <!-- Boilerplate obligatorio: passthrough de slots Vueform -->
    <template v-for="(component, slot) in elementSlots" #[slot]>
      <slot :name="slot" :el$="el$">
        <component :is="component" :el$="el$"/>
      </slot>
    </template>
  </ElementLayout>
</template>

<script lang="ts">
import { defineElement } from '@vueform/vueform'
import { useMiWidget } from './useMiWidget'

export default defineElement({
  name: 'MiWidgetElement',        // PascalCase → tipo "mi-widget" en JSON
  submits: false,                  // Excluir del form data de Vueform
  props: {
    customProp: { type: String }   // Props desde el JSON schema del layout
  },
  setup(props) {
    const { data, loading, error, fetchData } = useMiWidget()
    fetchData()
    return { data, loading, error }
  }
})
</script>
```

**Reglas criticas:**
- Usar `export default defineElement({})` — NO `<script setup>` (Vueform necesita el objeto options)
- `ElementLayout` provee el wrapper estandar (label, descripcion, errores)
- `elementSlots` + passthrough es boilerplate obligatorio
- `submits: false` para excluir del form data
- El `name` en PascalCase se convierte a kebab-case automaticamente: `MiWidgetElement` → `mi-widget`

### Patron B: Componente Vue standalone (helper)

Componentes que se usan directamente por otros componentes, NO a traves del sistema de layouts. Usan Vue 3 Composition API estandar.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  data: MiTipo[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [data: MiTipo]
  'close': []
}>()

const isVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
</script>
```

**Uso tipico:** modales auxiliares, barras de busqueda con filtros, listas personalizadas.

---

## 2. Como se registran los componentes

### Cadena de registro

```text
┌─────────────────────────────────────────────────┐
│  modsComponents/MiWidget/MiWidgetElement.vue    │
└─────────────────────────┬───────────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ npm run sync  │
                  └───────┬───────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│ layout/src/           │   │ suite/                │
│ modsComponents/...    │   │ modsComponents/...    │
└───────────┬───────────┘   └───────────────────────┘
            │
            ▼
┌───────────────────────┐
│ vueform.config.ts     │
│ (glob import)         │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Vueform registry      │
│ mi-widget             │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ JSON layout schema    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ RecordDetail / Vueform│
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Renderiza             │
│ MiWidgetElement.vue   │
└───────────────────────┘
```

### vueform.config.ts (auto-discovery)

```typescript
// layout/vueform.config.ts (Storybook)
const elementModules = import.meta.glob([
  './src/modsComponents/*/*.vue',
  './src/elements/*.vue'
], { eager: true })

// suite/vueform.config.ts (produccion)
const elementModules = import.meta.glob([
  '../layout/src/modsComponents/*/*.vue',
  '../layout/src/elements/*.vue',
  './src/elements/*.vue'
], { eager: true })
```

Cada `.vue` exportado con `defineElement({name: 'XxxElement'})` se registra automaticamente. El glob escanea todos los archivos — no hay registro manual.

### component-registry.json (generado por sync)

```json
{
  "random-person-card": "RandomPersonCardElement.vue",
  "text-transformer": "TextTransformerElement.vue",
  "availability-calendar": "AvailabilityCalendarElement.vue",
  "record-list": "RecordListElement.vue",
  "record-detail": "RecordDetailElement.vue"
}
```

---

## 3. Flujo de datos: como reciben y emiten datos

### Recepcion de datos

Los Vueform elements reciben datos de 3 fuentes:

| Fuente | Como llega | Ejemplo |
|--------|-----------|---------|
| **Props del JSON schema** | Props declarados en `defineElement({props:{}})` | `customProp` desde `{ "type": "mi-widget", "customProp": "valor" }` |
| **Attrs del padre** | Via `$attrs` (cuando `inheritAttrs: false`) | `contextId`, `contextType` pasados desde RecordDetail |
| **GraphQL query** | Via composable con Apollo client | `useMiWidget()` → `apolloClient.query(...)` |
| **parentId** | Reemplazado en filtros por LayoutOrchestrator | `"value": "{{parentId}}"` → ID real del registro padre |

### Emision de datos

| Mecanismo | Cuando usar | Ejemplo |
|-----------|------------|---------|
| **No emitir (submits: false)** | Componente es read-only o maneja su propio save | RandomPersonCard, TextTransformer |
| **Vueform element.fire()** | Comunicar acciones al RecordList/RecordDetail padre | `element.fire('action', payload)` |
| **defineEmits (Vue standard)** | Componentes standalone (modales, helpers) | `emit('save', data)`, `emit('close')` |
| **Guardar directo via GraphQL** | Componente autonomo que persiste datos | AvailabilityCalendar → `apolloClient.mutate(...)` |

### Patron mas comun: componente autonomo con save directo

El patron usado en AvailabilityCalendar (componente mas complejo existente):

```
JSON layout: { "type": "availability-calendar" }
  ↓ Vueform renderiza AvailabilityCalendarElement.vue
  ↓ setup() llama useAvailabilityCalendar()
  ↓ Composable crea Apollo client, fetches data
  ↓ Template renderiza UI interactiva (CalendarSchedule)
  ↓ Usuario modifica datos → handleSave()
  ↓ Composable ejecuta mutations GraphQL directamente
  ↓ NO emite nada al padre (submits: false)
```

---

## 4. GraphQL en componentes: dos patrones

### Patron estandar (recomendado)

Usa `useTenantApolloClient()` del framework:

```typescript
// modsComponents/MiWidget/useMiWidget.ts
import { ref } from 'vue'
import { gql } from '@apollo/client/core'
import { useTenantApolloClient } from '@/composables/useApolloClient'

export function useMiWidget() {
  const apolloClient = useTenantApolloClient()
  const data = ref(null)
  const loading = ref(false)

  async function fetchData() {
    loading.value = true
    try {
      const result = await apolloClient.query({
        query: gql`
          query GetMiDato($id: String!) {
            getMiDato(id: $id) {
              id
              nombre
              estado
            }
          }
        `,
        variables: { id: 'xxx' },
        fetchPolicy: 'network-only'
      })
      data.value = result.data.getMiDato
    } finally {
      loading.value = false
    }
  }

  async function guardar(input) {
    return apolloClient.mutate({
      mutation: gql`
        mutation CrearMiDato($input: MiInput!) {
          crearMiDato(input: $input) {
            id
            nombre
          }
        }
      `,
      variables: { input }
    })
  }

  return { data, loading, fetchData, guardar }
}
```

**`useTenantApolloClient()`** inyecta automaticamente el header `X-Tenant-ID` desde el contexto de Suite.

**El alias `@/`** resuelve a `layout/src/` en Storybook y `suite/` en produccion.

### Patron con CRUD generico

Para operaciones estandar sin resolvers custom, se usan las queries genericas del Object Manager:

```typescript
const result = await apolloClient.query({
  query: gql`
    query ListInstances($objectName: String!, $filters: [FilterInput]) {
      listInstances(objectName: $objectName, filters: $filters) {
        instances
        totalCount
      }
    }
  `,
  variables: {
    objectName: 'CourseProgram',
    filters: [{ field: 'status', operator: 'EQUALS', value: 'published' }]
  }
})
```

Este patron no necesita resolver custom — usa el CRUD generado automaticamente.

### Todo el GraphQL es imperativo

uP1 **no usa** los composables reactivos de `@vue/apollo-composable` (`useQuery`, `useMutation`). Todo es imperativo: `apolloClient.query(...)` y `apolloClient.mutate(...)` dentro de funciones async.

---

## 5. LayoutOrchestrator: como decide que renderizar

### Tipos de layout registrados

Actualizado segun `layout/src/layouts/LayoutOrchestrator.vue:802-811` (verificado 2026-07-16):

```javascript
const availableLayouts = {
  RecordList:       () => import('./RecordList.vue'),
  RecordDetail:     () => import('./RecordDetail.vue'),
  ChibiList:        () => import('./ChibiList.vue'),
  ImportTaskList:   () => import('./ImportTaskList.vue'),
  AiChatbox:        () => import('../modsComponents/AiChatbox/AiChatbox.vue'),
  ConfigPanel:      () => import('./ConfigPanelLayout.vue'),
  OfferingCalendar: () => import('./CalendarLayout.vue'),
  Calendar:         () => import('./CalendarLayout.vue'),
  Dashboard:        () => import('./Dashboard.vue'),
}
```

**El LayoutOrchestrator NO renderiza modsComponents directamente.** Solo conoce estos 9 tipos (antes 7). Los modsComponents viven **dentro** de RecordDetail como tipos de campo Vueform.

Tipos agregados desde la version anterior de este doc (2026-04-09):

- **ConfigPanel**: layout self-contained para pantallas de configuracion (tenant/app), resuelve su propio `ConfigDefinition` y no depende de un objectName de negocio. Detalle en `features/config-system.md`.
- **Dashboard**: contenedor de grilla que compone widgets (RecordList embebido, reportes Flexmonster) con sintaxis de mosaico (`matplotlib.subplot_mosaic`). Detalle en `features/dashboard-mosaic.md`.

Ver tambien el detalle completo del workspace `layout/` (stack, estructura, atomic design) en `core/layout-workspace.md`.

### Flujo de resolucion

```text
┌──────────────────────────────────────────────────┐
│  Props: layoutType, layoutId, instanceId,        │
│         layoutConfig                             │
└─────────────────────────┬────────────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  layoutId?    │
                  └───────┬───────┘
                          │
               ┌──────────┴──────────┐
              Si                     No
               │                     │
               ▼                     ▼
   Fetch config de BD        resolveDefaultLayout
   (tabla up1_layen_         (por rol del usuario)
    layout)                          │
               │                     ▼
               │             ┌──────────────────┐
               │             │ Layout encontrado?│
               │             └──────┬────────┬──┘
               │                   Si        No
               │                    │        │
               │                    │        ▼
               │                    │  null — no renderiza
               │                    │
               └──────────┬─────────┘
                          ▼
           Deep-merge: DB config + props config
           (DB schema gana, props autoAssign gana)
                          │
                          ▼
           Reemplaza {{parentId}} por instanceId
           en toda la config
                          │
                          ▼
                  ┌───────────────┐
                  │  layoutType?  │
                  └───────┬───────┘
                          │
         ┌────────┬───────┼──────────┬──────────┬─────────────┐
         ▼        ▼       ▼          ▼          ▼             ▼
    RecordList RecordDetail ChibiList Calendar  AiChatbox  ConfigPanel /
    .vue       .vue         .vue      Layout    .vue       Dashboard.vue
                                      .vue
```

**Nota (2026-07-16):** `RecordDetail` expone un boton de recarga (reload) via `defineExpose` (`reloadContext`, `reloadAvailable`, `isReloading` en `LayoutOrchestrator.vue:837-845`) que distingue datos de usuario sin guardar de datos de contexto, para no pisar lo que el usuario esta escribiendo. `ConfigPanel` es un layout self-contained: no recibe `objectName` de negocio, resuelve su propio `ConfigDefinition`. Detalle de ambos en `features/recordlist-recorddetail-2026-07.md` y `features/config-system.md` respectivamente.

### record-list dentro de RecordDetail

Cuando un schema de RecordDetail tiene `"type": "record-list"`:

```text
┌──────────────────────────┐
│       RecordDetail       │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  <Vueform :schema='...'> │
└────────────┬─────────────┘
             │
             ▼
     ┌───────────────┐
     │ Vueform       │
     │ evalua type   │
     └───────┬───────┘
             │
   ┌─────────┼──────────────────┐
   ▼         ▼                  ▼
type:      type:           type: text,
record-    mi-widget       select...
list          │                 │
  │           ▼                 ▼
  │    MiWidgetElement.vue  Elementos
  │    (componente custom)  Vueform
  ▼                         nativos
RecordListElement.vue
(Vueform element)
  │
  ▼
<LayoutOrchestrator
 layout-type='RecordList'>
  │
  ▼
RecordList.vue
con filtros {{parentId}}
```

El Apollo client se pasa via `inject('apolloClient')` — el padre RecordDetail lo provee con `provide`.

---

## 6. modsComposables vs composables de componente

| Tipo | Ubicacion | Se sincroniza a | Contenido |
|------|-----------|----------------|-----------|
| **modsComposable** | `modsComposables/useX.ts` | `layout/src/composables/` + `suite/modsComposables/` | Funciones puras, sin GraphQL, sin Vue reactivity |
| **Composable de componente** | `modsComponents/MiWidget/useMiWidget.ts` | (junto al componente) | GraphQL queries, refs reactivos, logica de UI |

Ejemplo de modsComposable (puro):

```typescript
// modsComposables/useHwAssessment.ts
export const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export function getRiskColor(level: string): string {
  const colors = { LOW: 'var(--up1-color-success)', HIGH: 'var(--up1-color-danger)' }
  return colors[level] || 'var(--up1-color-secondary)'
}

export function formatRiskScore(score: number): string {
  return `${Math.round(score)}%`
}
```

Ejemplo de composable de componente (con GraphQL):

```typescript
// modsComponents/MiWidget/useMiWidget.ts
import { ref } from 'vue'
import { gql } from '@apollo/client/core'
import { useTenantApolloClient } from '@/composables/useApolloClient'

export function useMiWidget() {
  const client = useTenantApolloClient()
  const data = ref(null)
  const loading = ref(false)

  async function fetch() { /* apolloClient.query(...) */ }
  async function save(input) { /* apolloClient.mutate(...) */ }

  return { data, loading, fetch, save }
}
```

---

## 7. Desarrollo local: repo y setup

### ¿Se puede usar un repo git local?

El script de setup (`scripts/actions.js`) construye URLs SSH de Bitbucket:

```javascript
const repoUrl = `${BITBUCKET_BASE_URL}${repoName}`
// → git@bitbucket.org:uplanner/mi-mod.git
```

**No soporta rutas locales en el array `uPlannerMods`.**

### PERO: se puede crear un mod directo en mods/

Los scripts de sync **no leen `uPlannerMods`** — escanean el directorio `mods/` directamente:

```javascript
const modDirs = await fs.readdir(modsPath, { withFileTypes: true })
for (const modDir of modDirs) {
  if (!ignoredMods.includes(modDir.name)) {
    // Procesa el mod
  }
}
```

**Esto significa que un mod creado manualmente en `mods/` sera detectado y sincronizado sin estar en `uPlannerMods`.**

### Como crear un mod local para desarrollo

```bash
# 1. Crear directorio
mkdir -p mods/mi-mod-local

# 2. Inicializar git (recomendado, no obligatorio)
cd mods/mi-mod-local
git init

# 3. Crear estructura minima
cat > package.json << 'EOF'
{
  "name": "@uplanner/mi-mod-local",
  "version": "1.0.0",
  "private": true
}
EOF

cat > capabilities.json << 'EOF'
[]
EOF

mkdir -p config/layouts objects logic

cat > config/app.json << 'EOF'
{
  "name": "mi-mod-local",
  "label": "Mi Mod (Dev)",
  "icon": "bi-tools",
  "order": 20,
  "roles": ["Admin"],
  "tenants": ["UPU"],
  "version": "1.0.0"
}
EOF

# 4. Sync — el mod aparece en la app
cd ../..
npm run sync

# 5. Verificar
npm run check-mods
```

### NO agregarlo a ignoredMods

Si el mod aparece en `ignoredMods` del `package.json` raiz, sera excluido de todas las fases de sync. Verificar que no este ahi.

### NO es necesario agregarlo a uPlannerMods

`uPlannerMods` solo se usa para el clone automatico (`npm run setup`). El sync funciona por listado de directorio.

### Flujo de desarrollo iterativo

```
1. Editar archivos en mods/mi-mod-local/
   ↓
2. npm run sync                          ← Propaga a core workspaces
   ↓
3. Segun tipo de cambio:
   - objects/ → npm run codegen && npx prisma migrate dev
   - logic/  → reiniciar object-manager
   - modsComponents/ → hot reload (suite/layout)
   - config/layouts/ → recarga automatica
   - lang/ → reiniciar suite
   - css/ → hard refresh browser
   ↓
4. Verificar en http://localhost:3000/UPU
   ↓
5. Repetir desde 1
```

**No hay watch mode automatico para sync** — siempre `npm run sync` manual despues de cada cambio.

### check-mods: que valida

```bash
npm run check-mods
```

Escanea `mods/` y para cada directorio con `package.json`:
- Verifica carpetas esperadas: objects, css, lang, logic, reports, tests, modsComponents
- Verifica `capabilities.json` existe
- Si `flows/` existe, valida que cada JSON tenga `name`, `nodes`, `connections`
- **Ofrece creacion interactiva** de estructura faltante

---

## 8. Ejemplo completo: componente custom para Assessment

### Caso: TributationMatrix (matriz curso × competencia)

Este componente necesita:
- Fetch de cursos del plan de estudio
- Fetch de competencias de la matriz
- Fetch de tributaciones existentes
- UI de matriz interactiva con checkmarks
- Save transaccional de tributaciones modificadas

### Estructura de archivos

```
mods/learning-assurance/
└── modsComponents/
    └── TributationMatrix/
        ├── TributationMatrixElement.vue    ← Vueform element
        ├── useTributationMatrix.ts         ← Composable con GraphQL
        ├── TributationMatrix.types.ts      ← Tipos
        ├── TributationMatrix.mocks.ts      ← Mock data
        └── TributationMatrix.stories.ts    ← Storybook
```

### useTributationMatrix.ts

```typescript
import { ref, computed } from 'vue'
import { gql } from '@apollo/client/core'
import { useTenantApolloClient } from '@/composables/useApolloClient'

interface TributationCell {
  courseId: string
  competencyId: string
  levelId: string
  active: boolean
}

export function useTributationMatrix(studyPlanId: string) {
  const client = useTenantApolloClient()
  const courses = ref([])
  const competencies = ref([])
  const tribulations = ref<TributationCell[]>([])
  const loading = ref(false)
  const dirty = ref(false)

  // Fetch datos iniciales
  async function loadMatrix() {
    loading.value = true
    try {
      const [coursesResult, compsResult, tribsResult] = await Promise.all([
        client.query({
          query: gql`query { listInstances(objectName: "CoursePlanAssignment",
            filters: [{ field: "studyPlanId", operator: "EQUALS", value: "${studyPlanId}" }])
            { instances totalCount } }`,
          fetchPolicy: 'network-only'
        }),
        client.query({
          query: gql`query { listInstances(objectName: "Competency",
            filters: [{ field: "matrixId", operator: "EQUALS", value: "${studyPlanId}" }])
            { instances totalCount } }`,
          fetchPolicy: 'network-only'
        }),
        client.query({
          query: gql`query { listInstances(objectName: "CurriculumTributation",
            filters: [{ field: "studyPlanId", operator: "EQUALS", value: "${studyPlanId}" }])
            { instances totalCount } }`,
          fetchPolicy: 'network-only'
        })
      ])
      courses.value = coursesResult.data.listInstances.instances
      competencies.value = compsResult.data.listInstances.instances
      tribulations.value = tribsResult.data.listInstances.instances
    } finally {
      loading.value = false
    }
  }

  // Toggle una celda de tributacion
  function toggleCell(courseId: string, competencyId: string, levelId: string) {
    const idx = tribulations.value.findIndex(
      t => t.courseId === courseId && t.competencyId === competencyId
    )
    if (idx >= 0) {
      tribulations.value[idx].active = !tribulations.value[idx].active
    } else {
      tribulations.value.push({ courseId, competencyId, levelId, active: true })
    }
    dirty.value = true
  }

  // Guardar todas las modificaciones (transaccional via resolver custom)
  async function saveMatrix() {
    if (!dirty.value) return
    loading.value = true
    try {
      await client.mutate({
        mutation: gql`
          mutation UpdateTributation($studyPlanId: String!, $tribulations: [TributationInput!]!) {
            updateTributation(studyPlanId: $studyPlanId, tribulations: $tribulations) {
              success
              count
            }
          }
        `,
        variables: {
          studyPlanId,
          tribulations: tribulations.value.map(t => ({
            courseId: t.courseId,
            competencyId: t.competencyId,
            levelId: t.levelId,
            active: t.active
          }))
        }
      })
      dirty.value = false
    } finally {
      loading.value = false
    }
  }

  return { courses, competencies, tribulations, loading, dirty, loadMatrix, toggleCell, saveMatrix }
}
```

### TributationMatrixElement.vue

```vue
<template>
  <ElementLayout>
    <template #element>
      <div class="tributation-matrix">
        <div v-if="loading" class="text-center p-4">Cargando matriz...</div>
        <table v-else class="table table-bordered">
          <thead>
            <tr>
              <th>Curso</th>
              <th v-for="comp in competencies" :key="comp.id">
                {{ comp.code }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="course in courses" :key="course.id">
              <td>{{ course.code }} - {{ course.name }}</td>
              <td v-for="comp in competencies" :key="comp.id"
                  class="text-center cursor-pointer"
                  @click="toggleCell(course.id, comp.id, comp.levelId)">
                <span v-if="isActive(course.id, comp.id)">✓</span>
              </td>
            </tr>
          </tbody>
        </table>
        <button v-if="dirty" class="btn btn-primary mt-2" @click="saveMatrix">
          Guardar tributacion
        </button>
      </div>
    </template>
    <template v-for="(component, slot) in elementSlots" #[slot]>
      <slot :name="slot" :el$="el$">
        <component :is="component" :el$="el$"/>
      </slot>
    </template>
  </ElementLayout>
</template>

<script lang="ts">
import { defineElement } from '@vueform/vueform'
import { useTributationMatrix } from './useTributationMatrix'
import { computed, onMounted } from 'vue'

export default defineElement({
  name: 'TributationMatrixElement',
  submits: false,
  props: {
    studyPlanId: { type: String, required: true }
  },
  setup(props) {
    const {
      courses, competencies, tribulations,
      loading, dirty,
      loadMatrix, toggleCell, saveMatrix
    } = useTributationMatrix(props.studyPlanId)

    onMounted(() => loadMatrix())

    function isActive(courseId: string, competencyId: string): boolean {
      return tribulations.value.some(
        t => t.courseId === courseId && t.competencyId === competencyId && t.active
      )
    }

    return { courses, competencies, loading, dirty, toggleCell, saveMatrix, isActive }
  }
})
</script>
```

### Layout JSON que usa el componente

```json
{
  "name": "study_plan_view",
  "objectName": "StudyPlan",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "view",
    "tabs": {
      "general": {
        "label": "Datos Generales",
        "elements": ["name", "code", "faculty", "career", "credits"]
      },
      "courses": {
        "label": "Cursos",
        "elements": ["coursesList"]
      },
      "mapping": {
        "label": "Curriculum Mapping",
        "elements": ["tributationMatrix"]
      }
    },
    "schema": {
      "name": { "type": "text", "label": "Nombre", "columns": { "container": 6 } },
      "code": { "type": "text", "label": "Codigo", "columns": { "container": 6 } },
      "coursesList": {
        "type": "record-list",
        "objectName": "CoursePlanAssignment",
        "layoutId": "course_plan_list",
        "layoutConfig": {
          "filters": [
            { "field": "studyPlanId", "operator": "EQUALS", "value": "{{parentId}}" }
          ]
        }
      },
      "tributationMatrix": {
        "type": "tributation-matrix",
        "studyPlanId": "{{parentId}}"
      }
    }
  }
}
```

El `{{parentId}}` se reemplaza automaticamente por el ID del plan de estudio.

---

## 9. Resumen de flujo de datos end-to-end

```text
┌────────────────────────────────────────────────────────────────────┐
│  FUENTE (mod)                                                      │
│  ┌────────────────────────────┐                                    │
│  │  config/layouts/*.json     │                                    │
│  └────────────────────────────┘                                    │
└───────────────────────────┬────────────────────────────────────────┘
                            │ npm run sync → BD
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Suite)                                                  │
│                                                                    │
│  ┌─────────────────────────────────────────────────┐              │
│  │  LayoutOrchestrator                             │              │
│  │  fetch layout de BD / reemplaza {{parentId}}    │              │
│  └───────────┬─────────────┬───────────────────────┘              │
│              │             │              │                        │
│              ▼             ▼              ▼                        │
│         RecordList   RecordDetail    Calendar                      │
│              │             │                                       │
│              │             ▼                                       │
│              │      <Vueform :schema>                              │
│              │        │         │           │                      │
│              │        ▼         ▼           ▼                      │
│              │   text,select  record-list  mi-widget               │
│              │   (nativos)    (embebido →  (MiWidget               │
│              │                LayoutOrch.  Element.vue)            │
│              │                recursivo)       │                   │
│              │                            useMiWidget.ts           │
│              │                                 │                   │
└──────────────┼─────────────────────────────────┼───────────────────┘
               │                                 │
               └──────────────┬──────────────────┘
                              ▼
                    Apollo Client
                    (useTenantApolloClient)
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  BACKEND — Object Manager (localhost:4000)                         │
│                                                                    │
│  ┌─────────────┐                                                   │
│  │ GraphQL API │                                                   │
│  └──────┬──────┘                                                   │
│         │                                                          │
│   ┌─────┴──────────────┐                                          │
│   ▼                    ▼                                           │
│  CRUD auto        Resolvers custom del mod                         │
│   │                    │                                           │
│   └──────┬─────────────┘                                          │
│          ▼                                                         │
│   Prisma + $transaction()                                          │
│          │                                                         │
└──────────┼─────────────────────────────────────────────────────────┘
           ▼
      ╔════════════╗
      ║ PostgreSQL ║
      ╚════════════╝
```

<details>
<summary>Version texto (fallback sin Mermaid)</summary>

```
JSON Layout → npm run sync → BD
  → LayoutOrchestrator (fetch + {{parentId}})
    → RecordList / RecordDetail / Calendar
      → <Vueform :schema> → type → componente
        → text, select (nativos) | record-list (recursivo) | mi-widget (custom)
          → useMiWidget.ts → Apollo Client
            → Object Manager (CRUD auto + resolvers custom)
              → Prisma → PostgreSQL
```

</details>

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-09 | Documento inicial: flujo interno de datos, patrones de componentes, desarrollo local, ejemplo Assessment |
| 2026-04-14 | Reemplazo diagramas ASCII por Mermaid: LayoutOrchestrator, record-list embebido, flujo end-to-end |
| 2026-07-16 | Actualizacion de la seccion 5 (tipos de layout registrados): se agregan ConfigPanel y Dashboard (de 7 a 9 tipos), se documenta el boton reload de RecordDetail y el caracter self-contained de ConfigPanel, con enlaces a features/config-system.md, features/dashboard-mosaic.md, features/recordlist-recorddetail-2026-07.md y core/layout-workspace.md |
