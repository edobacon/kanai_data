---
id: RULE-mods-043
project: up1
type: rule
module: mods
tags:
  - vueform
  - options-api
  - composition-api
  - anti-patron
  - silent-fail
---

# Vueform elements via `defineElement()` usan Options API — NO invocar Vue 3 Composition APIs (ref, onMounted, computed, watchEffect) desde dentro de un `computed` getter

## What

Los Vueform custom elements creados via `defineElement()` siguen el patron Options API de Vue (`data`, `methods`, `computed`, `mounted`, etc.). Las Vue 3 Composition APIs (`ref`, `reactive`, `onMounted`, `computed`, `watchEffect`, `watch`) **NO deben invocarse desde dentro de un `computed` getter** del element — fallan silenciosamente:

- `onMounted` no se registra (Vue warning console silencioso)
- `ref`/`reactive` quedan sin tracking reactivo del owner correcto
- `computed` interno crea reactive context sin bindings al element

**Anti-patron observado** (TICKET-025 S2.T2 bug que costo 1 ciclo iterate):

```typescript
// ❌ MAL — composable Vue 3 Composition API llamado desde computed Options API
export default defineElement({
  setup(_props, _context) { return {} },  // setup vacio
  computed: {
    statusData(): ReturnType<typeof useStatusData> | null {
      if (!(this as any)._cache) {
        ;(this as any)._cache = useStatusData(() => this.currentStatusId)
        //                       ^^^^^^^^^^^^^
        //                       useStatusData usa ref/onMounted/computed dentro
        //                       NUNCA se inicializa correctamente en este contexto
      }
      return (this as any)._cache
    }
  }
})
// Sintoma observable: el component NUNCA renderea data; loading state stuck en true
// porque onMounted nunca disparo el async load
```

## Why

`computed` getters de Options API se ejecutan en un contexto distinto al `setup()` de Composition API. Las Vue 3 hooks lifecycle (`onMounted`, `onUnmounted`) tienen guards internos que requieren `getCurrentInstance()` retornando el setup context activo — desde un `computed` getter, `getCurrentInstance()` devuelve null o el wrong instance, asi que los hooks se descartan.

`ref`/`reactive`/`computed` (composition) NO fallan a nivel de creacion pero quedan en un reactive scope sin owner correcto — cambios no propagan, watchers no se re-corren cuando deberian. Sintoma: data nunca se actualiza, loading state stuck, UI rota.

**Fail silencioso** = peor que fail explicit. El dev pierde tiempo debuggeando "por que el badge no aparece" cuando el codigo "se ve correcto" sintacticamente.

## Where

- **Files**: `mods/<mod>/modsComponents/<Component>/<Component>Element.vue` (Vueform elements)
- **Layers**: frontend (Vue + Vueform)
- **API afectada**: `defineElement` de `@vueform/vueform`

## When

Aplica cuando:

- Creas un Vueform custom element via `defineElement()`
- El element necesita logica que normalmente harias en Composition API (Apollo queries, refs, lifecycle)

**2 patrones correctos** (uno u otro, no mezclar):

**Patron A — Options API tradicional** (recomendado para casos simples):

```typescript
export default defineElement({
  data() { return { _isLoading: true, _data: null } },
  async mounted() {
    this._data = await fetchSomething()
    this._isLoading = false
  },
  computed: {
    derivedValue(): string {
      return this._data?.field ?? 'fallback'
    }
  }
})
```

**Patron B — Setup con Composition API** (para casos complejos con composables):

```typescript
export default defineElement({
  setup(_props, _context) {
    const isLoading = ref(true)
    const data = ref(null)
    onMounted(async () => {
      data.value = await fetchSomething()
      isLoading.value = false
    })
    return { isLoading, data }  // expose a template via setup return
  },
  computed: {
    // computed que usa los refs expuestos
    derivedValue(): string {
      return (this as any).data?.field ?? 'fallback'
    }
  }
})
```

NUNCA mezclar: NO invocar composables Composition API desde `computed` getters Options API.

## Verification

**Smoke manual**: si el element renderea state "loading" indefinidamente sin que el async load se dispare, sospechar este anti-patron. Inspeccionar `mounted()` / `setup()` para asegurar que las hooks Composition viven ahi.

**Test integration**:

```typescript
test('element load completa con tiempo finito', async () => {
  const wrapper = mount(ActivityStatusBadgeElement, { props: { ... } })
  await flushPromises()
  await new Promise(r => setTimeout(r, 100))
  expect(wrapper.find('[data-loading]').exists()).toBe(false)  // No stuck loading
})
```

**Code review checklist**:

- [ ] `defineElement` con `computed` → verificar que NO invoca `ref`/`onMounted`/`computed` Composition
- [ ] Si hay composable consumido → debe vivir en `setup()` o estar restructurado como funciones puras + `mounted()`

## Source

- **Discovered in**: TICKET-025, Session 3 (S3.T4 smoke UPU — bug element no renderea)
- **Evidence**: ActivityStatusBadgeElement.vue v1 invocaba `useActivityStatusBadge()` desde `computed.statusData`. Composable usaba `ref(true)`, `onMounted(async () => {...})`, `computed(...)`. Sintoma: badge nunca renderea en RecordDetail (light + dark), loading state stuck. Fix v2: refactor composable a funciones puras + Map cache module-scope + element con Options API tradicional (`data()` + `async mounted()` + `computed`). Commit `b168df7` curriculum-design. Patron de referencia (correcto): `RichTextRendererElement.vue` Options API + `CompositeSectionTreeElement.vue` Composition API en `setup(props)`. Aprendizaje L16 del ticket
- **Related**: RULE-mods-012 (Vueform elements usan `defineElement` no `defineComponent`), RULE-mods-022 (1 SFC por carpeta — sub-componentes inline), RULE-mods-005 (composables shared vs component-level)
