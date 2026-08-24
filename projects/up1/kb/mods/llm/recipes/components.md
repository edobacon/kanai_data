---
id: SPEC-mods-007
project: up1
type: spec
module: mods
tags: [componente, Vueform, defineElement, ElementLayout, composable, Apollo, Storybook, standalone]
---
# Componentes Vue custom

## Preparacion

```bash
# Crear carpeta del componente (PascalCase)
mkdir -p mods/{mod}/modsComponents/MiWidget
```

## Despues de CADA receta

```bash
npm run sync
# Componentes se copian a layout/src/modsComponents/ (Storybook) y suite/modsComponents/ (app)
# Hot reload automatico en Suite — no requiere reinicio
```

## Reglas criticas

- **Patron A** (Vueform Element): `defineElement()` + `<ElementLayout>`, referenciado desde layout JSON via `type: "mi-widget"`
- **Patron B** (standalone): `<script setup>`, invocado por otros componentes Vue
- **SIEMPRE** `useTenantApolloClient()` — **NUNCA** Apollo directo
- **GraphQL imperativo**: `apolloClient.query()`, `apolloClient.mutate()` — **NO** `useQuery`/`useMutation`
- `submits: false` si el componente no es campo de formulario
- Alias `@/` resuelve a `layout/src/` (Storybook) y `suite/` (produccion)
- Atoms: importar de `layout/src/components/atoms` (`Button`, `Heading`, `Text`, `Spinner`)

---

### VUE-01: Vueform Element basico
**Pre:** carpeta `modsComponents/MiWidget/` creada  
**In:** nombre del elemento, nombre del composable  
**Pasos:**
1. Crear `MiWidgetElement.vue`:
```vue
<template>
  <ElementLayout>
    <template #element>
      <!-- contenido del widget -->
      <div class="mi-widget">
        <Spinner v-if="loading" />
        <slot v-else />
      </div>
    </template>
  </ElementLayout>
</template>

<script>
import { defineElement } from '@vueform/vueform'
import { ElementLayout } from '@vueform/vueform'
import Spinner from '@/components/atoms/Spinner.vue'

export default defineElement({
  name: 'MiWidgetElement',
  components: { ElementLayout, Spinner },
  props: {
    miProp: { type: String, default: '' }
  },
  setup(props, ctx) {
    // logica del elemento
    return {}
  }
})
</script>
```
2. Registrar el elemento en el layout JSON (ver VUE-09)
3. `npm run sync`

**Validar:** Storybook renderiza el componente; en app, layout JSON con `type: "mi-widget"` muestra el elemento  
**Doc:** `specs/up1/mods/reference.md` § 10

---

### VUE-02: Composable con GraphQL query
**Pre:** cliente Apollo configurado en el workspace  
**In:** nombre del composable, query GraphQL, tipo de respuesta  
**Pasos:**
1. Crear `useMiWidget.ts`:
```typescript
import { ref } from 'vue'
import { gql } from 'graphql-tag'
import { useTenantApolloClient } from '@/composables/useTenantApolloClient'

const MI_QUERY = gql`
  query GetMiDato($id: String!) {
    getMiDato(id: $id) {
      id
      nombre
      estado
    }
  }
`

export function useMiWidget() {
  const apolloClient = useTenantApolloClient()
  const data = ref<MiDato | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchDato(id: string) {
    loading.value = true
    error.value = null
    try {
      const result = await apolloClient.query({
        query: MI_QUERY,
        variables: { id },
        fetchPolicy: 'network-only'
      })
      data.value = result.data.getMiDato
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetchDato }
}
```

**Validar:** `loading` cambia a `true` durante la query; `data` se popula con la respuesta; `error` captura fallos  
**Doc:** `specs/up1/mods/reference.md` § 10

---

### VUE-03: Composable con GraphQL mutation
**Pre:** VUE-02 como referencia de patron  
**In:** nombre del composable, mutation GraphQL, tipo de input  
**Pasos:**
1. Agregar mutation al composable (o crear uno nuevo):
```typescript
import { useTenantApolloClient } from '@/composables/useTenantApolloClient'
import { gql } from 'graphql-tag'

const CREAR_DATO = gql`
  mutation CrearMiDato($input: MiDatoInput!) {
    crearMiDato(input: $input) {
      id
      nombre
    }
  }
`

export function useMiWidgetMutations() {
  const apolloClient = useTenantApolloClient()
  const saving = ref(false)

  async function crearDato(input: MiDatoInput) {
    saving.value = true
    try {
      const result = await apolloClient.mutate({
        mutation: CREAR_DATO,
        variables: { input }
      })
      return result.data?.crearMiDato ?? null
    } finally {
      saving.value = false
    }
  }

  return { saving, crearDato }
}
```

**Validar:** mutation se ejecuta en `localhost:4000/graphql`; `saving` cambia durante la operacion  
**Doc:** `specs/up1/mods/reference.md` § 10

---

### VUE-04: CRUD generico sin resolver custom
**Pre:** objeto definido en `objects/MiObjeto.json` + codegen ejecutado  
**In:** nombre del objeto (PascalCase)  
**Pasos:**
1. El codegen genera automaticamente: `listMiObjetoInstances`, `getMiObjetoInstance`, `createMiObjetoInstance`, `updateMiObjetoInstance`, `deleteMiObjetoInstance`
2. Usar directamente en composable sin resolver adicional:
```typescript
const LIST_QUERY = gql`
  query ListMiObjeto {
    listMiObjetoInstances {
      id nombre estado
    }
  }
`
const CREATE_MUTATION = gql`
  mutation CreateMiObjeto($input: MiObjetoInput!) {
    createMiObjetoInstance(input: $input) { id }
  }
`
```
3. Si se necesita logica adicional → usar resolver custom (ver `recipes/resolvers.md`)

**Validar:** `listMiObjetoInstances` retorna datos en GraphQL playground  
**Doc:** `specs/up1/mods/reference.md` § 5

---

### VUE-05: Componente standalone — modal
**Pre:** carpeta `modsComponents/MiModal/` creada  
**In:** nombre del modal, props de entrada, eventos de salida  
**Pasos:**
1. Crear `MiModalComponent.vue` (Patron B — `<script setup>`):
```vue
<template>
  <div v-if="visible" class="mi-modal-overlay" @click.self="emit('close')">
    <div class="mi-modal">
      <Heading :level="3">{{ titulo }}</Heading>
      <slot />
      <div class="mi-modal__actions">
        <Button variant="secondary" @click="emit('close')">
          {{ $t('actions.cancel') }}
        </Button>
        <Button variant="primary" :loading="saving" @click="emit('confirm')">
          {{ $t('actions.confirm') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/atoms/Button.vue'
import Heading from '@/components/atoms/Heading.vue'

const props = defineProps<{
  visible: boolean
  titulo: string
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>
```

**Validar:** Storybook renderiza el modal en estado visible/oculto; `close` y `confirm` disparan eventos  
**Doc:** `specs/up1/mods/reference.md` § 10

---

### VUE-06: Componente standalone — barra de busqueda con filtros
**Pre:** carpeta `modsComponents/MiSearch/` creada  
**In:** campos de filtro, evento de busqueda  
**Pasos:**
1. Crear `MiSearchComponent.vue`:
```vue
<template>
  <div class="mi-search">
    <input
      v-model="query"
      class="mi-search__input"
      :placeholder="$t('search.placeholder')"
      @input="onSearch"
    />
    <select v-model="filtroEstado" @change="onSearch">
      <option value="">{{ $t('search.allStates') }}</option>
      <option v-for="opt in estados" :key="opt.value" :value="opt.value">
        {{ $t('estado.' + opt.value) }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  estados: Array<{ value: string }>
}>()

const emit = defineEmits<{
  search: [{ query: string; estado: string }]
}>()

const query = ref('')
const filtroEstado = ref('')

function onSearch() {
  emit('search', { query: query.value, estado: filtroEstado.value })
}
</script>
```

**Validar:** emite `search` al escribir o cambiar filtro; los valores se reflejan en el payload  
**Doc:** `specs/up1/mods/reference.md` § 10

---

### VUE-07: Storybook story con useMockData
**Pre:** `MiWidget.mocks.ts` con datos de prueba  
**In:** nombre del componente, variantes a mostrar  
**Pasos:**
1. Crear `MiWidget.mocks.ts`:
```typescript
export const mockMiDato = {
  id: 'mock-001',
  nombre: 'Dato de prueba',
  estado: 'ACTIVO'
}
```
2. Crear `MiWidget.stories.ts`:
```typescript
import type { Meta, StoryObj } from '@storybook/vue3'
import MiWidgetElement from './MiWidgetElement.vue'
import { mockMiDato } from './MiWidget.mocks'

const meta: Meta<typeof MiWidgetElement> = {
  title: 'Mods/MiMod/MiWidget',
  component: MiWidgetElement,
  tags: ['autodocs']
}
export default meta

type Story = StoryObj<typeof MiWidgetElement>

export const Default: Story = {
  args: {
    miProp: mockMiDato.nombre
  }
}

export const Loading: Story = {
  args: { miProp: '' },
  parameters: { mockData: { loading: true } }
}
```
3. `npm run storybook --workspace=@uplanner/layout-engine`

**Validar:** historia aparece en Storybook bajo `Mods/MiMod/MiWidget`; todas las variantes renderizan sin errores  
**Doc:** `specs/up1/mods/reference.md` § 10

---

### VUE-08: modsComposable compartido (funciones puras)
**Pre:** carpeta `modsComposables/` en el mod  
**In:** nombre del composable, logica a compartir  
**Pasos:**
1. Crear `modsComposables/useMiLogica.ts` (sin GraphQL, funciones puras):
```typescript
// Composable compartido entre componentes del mod — sin side effects externos

export function useMiLogica() {
  function calcularRiesgo(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 25) return 'low'
    if (score < 50) return 'medium'
    if (score < 75) return 'high'
    return 'critical'
  }

  function formatearFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CL')
  }

  return { calcularRiesgo, formatearFecha }
}
```
2. `npm run sync` — se copia a `layout/src/composables/` y `suite/modsComposables/`
3. Importar en componentes: `import { useMiLogica } from '@/composables/useMiLogica'`

**Validar:** sync no reporta conflictos de nombre; composable importable desde Storybook y desde la app  
**Doc:** `specs/up1/mods/reference.md` § 10

---

### VUE-09: Referencia en layout JSON
**Pre:** componente registrado globalmente (via sync) con nombre kebab-case  
**In:** nombre del componente, props custom  
**Pasos:**
1. En el layout JSON del RecordDetail, agregar al schema:
```json
{
  "schema": {
    "miWidget": {
      "type": "mi-widget-element",
      "submits": false,
      "miProp": "valor-estatico",
      "columns": { "container": 12 }
    }
  }
}
```
2. El nombre del `type` es el nombre del componente en kebab-case sin el sufijo `Element`
3. `npm run sync`

**Validar:** layout renderiza el widget en la posicion correcta; props llegan al componente  
**Doc:** `specs/up1/mods/reference.md` § 9, § 10

---

### VUE-10: Componente con save directo a GraphQL
**Pre:** mutation definida en resolver o CRUD automatico disponible  
**In:** objeto a guardar, mutation a invocar  
**Pasos:**
1. Patron inspirado en `AvailabilityCalendar` — el componente maneja su propio ciclo de guardado:
```vue
<template>
  <div class="mi-editor">
    <slot />
    <Button :loading="saving" variant="primary" @click="handleSave">
      {{ saving ? $t('actions.saving') : $t('actions.save') }}
    </Button>
  </div>
</template>

<script>
import { defineElement } from '@vueform/vueform'
import { ElementLayout } from '@vueform/vueform'
import { ref } from 'vue'
import { useTenantApolloClient } from '@/composables/useTenantApolloClient'
import { gql } from 'graphql-tag'
import Button from '@/components/atoms/Button.vue'

const SAVE_MUTATION = gql`
  mutation GuardarMiDato($id: String!, $input: MiDatoInput!) {
    actualizarMiDato(id: $id, input: $input) { id }
  }
`

export default defineElement({
  name: 'MiEditorElement',
  components: { ElementLayout, Button },
  props: {
    recordId: { type: String, required: true },
    initialData: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const apolloClient = useTenantApolloClient()
    const saving = ref(false)

    async function handleSave() {
      saving.value = true
      try {
        await apolloClient.mutate({
          mutation: SAVE_MUTATION,
          variables: { id: props.recordId, input: props.initialData }
        })
      } finally {
        saving.value = false
      }
    }

    return { saving, handleSave }
  }
})
</script>
```
2. `submits: false` en el layout JSON (no es campo de formulario)

**Validar:** boton muestra estado `saving`; mutation se dispara en la red; dato actualizado en GraphQL  
**Doc:** `specs/up1/mods/reference.md` § 10

---

### VUE-11: Componente con atoms
**Pre:** atoms disponibles en `layout/src/components/atoms/`  
**In:** atoms requeridos (`Button`, `Heading`, `Text`, `Spinner`)  
**Pasos:**
1. Importar atoms — **nunca Bootstrap directo**:
```vue
<template>
  <div class="mi-card">
    <Heading :level="3">{{ titulo }}</Heading>
    <Text variant="secondary">{{ descripcion }}</Text>
    <Spinner v-if="loading" size="sm" />
    <Button v-else variant="primary" @click="emit('action')">
      {{ $t('actions.ver') }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/atoms/Button.vue'
import Heading from '@/components/atoms/Heading.vue'
import Text from '@/components/atoms/Text.vue'
import Spinner from '@/components/atoms/Spinner.vue'

defineProps<{ titulo: string; descripcion: string; loading: boolean }>()
defineEmits<{ action: [] }>()
</script>
```

**Validar:** Storybook renderiza atoms correctamente; no hay clases Bootstrap (`btn`, `h2`, etc.) en el HTML generado  
**Doc:** `specs/up1/core/style-guide.md` § 11, § 12

---

### VUE-12: Componente con datos del registro padre
**Pre:** layout embebido con `{{parentId}}` configurado en el layout padre  
**In:** campo `parentId`, query que filtra por el padre  
**Pasos:**
1. En el layout padre (RecordDetail), el hijo recibe `parentId` via filtro:
```json
{
  "type": "record-list",
  "objectName": "MiHijo",
  "layoutId": "mi-hijo-list",
  "layoutConfig": {
    "filters": [
      { "field": "padreId", "operator": "EQUALS", "value": "{{parentId}}" }
    ]
  }
}
```
2. Para componente custom que necesite el `parentId` como prop:
```vue
<script>
export default defineElement({
  name: 'MiHijoElement',
  props: {
    parentId: { type: String, required: true }
  },
  setup(props) {
    const { data, fetchDatos } = useMiHijo()
    onMounted(() => fetchDatos(props.parentId))
    return { data }
  }
})
</script>
```
3. En layout JSON: `"parentId": "{{parentId}}"` como prop del elemento

**Validar:** al abrir el RecordDetail padre, el componente hijo recibe el ID correcto y carga datos filtrados  
**Doc:** `specs/up1/mods/reference.md` § 9 (placeholders)
