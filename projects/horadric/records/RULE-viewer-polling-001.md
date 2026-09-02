---
id: RULE-viewer-polling-001
project: horadric
type: rule
module: viewer
level: must
tags:
  - composable
  - async
  - race-condition
  - polling
---

# Composables con URL dinamica deben invalidar `data` y proteger contra race condition con `currentUrl`

## What

Cualquier composable Vue que haga fetch async contra una URL que puede cambiar durante la vida del componente (navegacion a otra ruta con mismo componente, tabs que rotan el endpoint, etc.) debe cumplir **dos invariantes**:

1. **Invalidacion inmediata al cambiar URL**: cuando el `urlGetter` cambia, resetear `data.value = null`, `error.value = null` y cualquier cache interno (ej: `etag`) ANTES de disparar el nuevo fetch. Si no, la vista muestra datos del recurso anterior mientras el nuevo fetch viaja (visualmente: "el ticket que abrí tenía los datos del ticket anterior").

2. **Race guard por URL actual**: antes de asignar el resultado a `data.value`, comparar la URL que se uso para el fetch contra la URL "actual" (la ultima que se pidio). Si difieren, descartar el response — llego fuera de orden. Si no, un fetch lento sobre la URL vieja puede sobrescribir los datos del nuevo fetch ya completado.

## Why

Observado en HOR-002 session #3. Navegacion `/tickets/BLY-001 → /tickets/BLY-002` reusa el componente `TicketDetail` (misma ruta, distinto param). El `useETagPoll` anterior solo re-corria `fetchOnce` al cambiar la URL pero NO limpiaba `data.value`, entonces la UI mostraba el ticket anterior completo (header, sessions, flow, commits) durante los ~15-100ms que tardaba el nuevo fetch. Confusion real para el usuario.

Ademas: si el fetch a BLY-001 tardaba 200ms y se navegaba a BLY-002 en medio (que tarda 20ms), BLY-002 cargaba y despues BLY-001 (tardio) sobrescribia la vista con datos incorrectos. Invisible hasta que alguien lo observara, pero corrupto.

## Where

- **Files**: `src/composables/useETagPoll.ts` — patron de referencia.
- **Layers**: frontend (composables que gestionan state derivado de fetch).

## When

Siempre que un composable:
- Acepte un `urlGetter: () => string` (o similar expresion reactiva que produzca URL/path).
- Mantenga `data` como state que expone al componente consumer.
- Permita que la URL cambie sin desmontar el composable (caso tipico: Vue Router reusa el mismo componente entre rutas con params distintos).

## Verification

Patron obligatorio en el codigo del composable:

```ts
let currentUrl: string | null = null
const data = ref<T | null>(null)

const fetchOnce = async () => {
  const url = urlGetter()
  currentUrl = url
  const result = await fetch(url, ...)
  if (currentUrl !== url) return // race guard
  data.value = result
}

watch(urlGetter, (newUrl, oldUrl) => {
  if (newUrl === oldUrl) return
  data.value = null     // invalidacion
  error.value = null
  // cache interno (etag, headers) tambien se resetea
  fetchOnce()
})
```

Test manual: navegar entre dos recursos del mismo tipo y verificar que la vista muestra `null`/loader durante la transicion, no el recurso anterior.

## Source

- **Discovered in**: HOR-002, Session #3 (execute F9).
- **Evidence**: reporte del dev "hay error en los datos al navegar, se quedan los datos anteriores". Verificacion con evaluate_script: antes del fix el h1 mantenia el titulo anterior durante ~80ms; despues del fix muestra `null` por 15ms y luego el nuevo recurso.
- **Related**: RULE-index-001 (tambien sobre consumers que hacen asunciones incorrectas sobre state).
