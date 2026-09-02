---
id: RULE-vue-001
project: bayley
type: rule
module: vue
level: must
tags:
  - vue3
  - watch
  - reactivity
  - localStorage
  - mount
  - hidratacion
---

# `watch` es lazy — usar `{ immediate: true }` para refs hidratados

## What

Por default, `watch(ref, handler)` en Vue 3 **no dispara el handler al
registrar el watch**. Solo dispara cuando el valor del ref cambia despues
del registro.

Si el ref se hidrata desde `localStorage` (u otra fuente sincronica) al
crear el store/composable, cuando el componente consumidor registra su
`watch` el ref ya tiene el valor final — el handler **nunca se ejecuta**
al mount. El componente se renderiza con el ref correcto pero los efectos
derivados (fetch, rebuild, etc.) no se disparan.

### Ejemplo del bug

```ts
// stores/apps.ts — se hidrata al crear
const selectedAppId = ref<string | null>(
  localStorage.getItem(LS_SELECTED_APP), // ya tiene valor si existe
);

// AppsView.vue — mount
onMounted(() => {
  watch(selectedAppId, rebuildGraph); // NO dispara si ya tenia valor
});
```

Al volver a AppsView desde DataModel, la URL y el store ya traen `selectedAppId`
hidratado — `watch` se queda esperando un cambio que nunca pasa.

### Fix

```ts
watch(selectedAppId, rebuildGraph, { immediate: true });
```

Con `immediate: true`, el handler se ejecuta una vez al registrar con el
valor actual, y luego ante cada cambio subsecuente.

## Why

En pages con state persistido (localStorage, URL query, sessionStorage), el
ref llega al mount ya poblado. Sin `immediate: true`, los `watch` que
derivan data de ese ref (llamadas a API, rebuild de grafos, inicializacion
de terceros) son silenciosamente ignorados y la UI aparece incompleta.

Es un bug dificil de detectar porque el ref tiene el valor correcto en
devtools y el primer render pinta bien — solo fallan los efectos.

Regla derivada de Task #14 de BLY-016: AppsView no reconstruia el grafo al
volver desde DataModelView a pesar de tener `selectedAppId` en localStorage.

## Where

- **Stores Pinia con persistencia**: cualquier store que hidrate refs desde
  localStorage en el setup (`stores/apps.ts`, `stores/layouts.ts`, etc.)
- **Views con deep-links**: cualquier `*View.vue` que lea query params y
  los sincronice con state persistido (patron `useQuerySync`)
- **Composables con cache**: composables que expongan refs hidratados al
  mount (ej: `useRuntimeLayouts.lastFetched`)

## When

Siempre que se aplique `watch(source, handler)` sobre un source que puede
estar hidratado antes del mount del consumidor. Casos tipicos:

1. Ref que viene de un Pinia store con persistencia localStorage
2. Ref sincronizado con URL query via `useQuerySync`
3. Ref inyectado via `provide`/`inject` desde un ancestro que lo tenia
   ya cargado
4. Composable compartido con cache (ultimo fetch)

Si el ref **siempre** arranca en `null`/`[]`/valor-vacio hasta una accion
explicita del user, `immediate: true` no es necesario — pero tampoco
hace daño.

## Verification

### Revisar watchers criticos

```bash
grep -rn "watch(" src/views src/composables \
  | grep -v "immediate"
```

Cada match revisar:

1. ¿El source puede llegar al mount con valor hidratado?
2. ¿El handler produce efectos derivados (fetch, rebuild, init)?

Si ambas respuestas son si → agregar `{ immediate: true }`.

### Test visual

Navegar a la vista → salir → volver via back del browser. Si la vista
se muestra con state hidratado pero sin data fetcheada/construida, buscar
el watch culpable.

## Source

- **Discovered in**: BLY-016, Session 3 (2026-04-21), learn L4
- **Evidence**: AppsView.vue no reconstruia el grafo al volver desde
  DataModelView. Fix en [AppsView.vue:270](bayley/src/views/AppsView.vue#L270):
  `watch(selectedAppId, rebuildGraph, { immediate: true })`.
- **Related**: BLY-016 Task #14
- **Dep**: Vue 3 reactivity (`@vue/runtime-core`)
