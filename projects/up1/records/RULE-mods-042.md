---
id: RULE-mods-042
project: up1
type: rule
module: mods
tags:
  - cache
  - apollo
  - composable
  - performance
---

# Composables del mod que consumen data inmutable en runtime pueden usar cache module-scope (Map) en lugar de Apollo cache para control fino

## What

Cuando un composable del mod consume datos que **NO cambian en runtime** (ej. enums de catalogo, statuses canonicos de workflow, listas finitas de tipos), se permite usar **cache module-scope** (Map o variable shared a nivel modulo) en vez de depender exclusivamente del Apollo cache.

Patron canonico:

```typescript
// useFoo.ts — module-scope cache shared entre TODAS las instancias del consumer
const fooCache = new Map<string, Foo>()
let fetchPromise: Promise<void> | null = null

export async function ensureFooLoaded(): Promise<void> {
  if (fooCache.size > 0) return
  if (fetchPromise) return fetchPromise  // dedup concurrent calls

  fetchPromise = (async () => {
    try {
      const apolloClient = useTenantApolloClient()
      const result = await apolloClient.query({ query: LIST_FOO, fetchPolicy: 'cache-first' })
      for (const item of result.data.listInstances.items) {
        fooCache.set(item.id, { /* ... */ })
      }
    } finally {
      fetchPromise = null
    }
  })()
  return fetchPromise
}

export function getFoo(id: string | null): Foo | null {
  if (!id) return null
  return fooCache.get(id) ?? null
}
```

## Why

Apollo cache es bueno por default (cache-first + reactive). Pero para casos donde:

1. **Datos inmutables**: los 9 workflow statuses no cambian; los 5 tipos de RT son fijos; los enums de catalogo son estaticos en runtime
2. **N consumers simultaneos**: una lista de 50 rows que cada una invoca el composable causaria 50 cache lookups en Apollo (no queries por cache, pero overhead reactivo)
3. **Control fino de invalidacion**: queres invalidar manualmente cuando ocurre un evento especifico (ej. seed re-run), no esperar que Apollo lo decida

El Map module-scope:
- 1 sola query inicial (idempotente via promise dedup)
- Lookups sincronos sin overhead reactivo
- Invalidacion controlada: `fooCache.clear()` cuando aplique
- Compartido entre instancias del consumer en la misma session del browser

Trade-off: pierdes la reactividad automatica de Apollo cache. **Solo usar cuando los datos son inmutables o cambian solo via accion explicita del usuario que puede invalidar el cache manualmente**.

## Where

- **Files**:
  - Composables del mod en `mods/<mod>/modsComponents/<Component>/useX.ts`
  - O composables shared del mod en `mods/<mod>/modsComposables/useX.ts` cuando aplica RULE-mods-005
- **Layers**: frontend (Vue composables)

## When

Aplica cuando se cumple ambas condiciones:

1. **Datos inmutables en runtime** (catalogo, enums, statuses canonicos seeded)
2. **Consumer puede invocar N veces en una pagina** (ej. cell renderer en RecordList con N rows)

NO aplica para:

- Datos que cambian via mutations del usuario (ej. lista de activities — usar Apollo cache normal)
- Datos por-tenant que pueden variar (usar Apollo cache con tenant context)
- Datos que requieren reactividad cross-component automatica

## Verification

Test pattern:

```typescript
// Test que el cache evita N queries
test('useFoo cache dedup queries en N invocaciones concurrentes', async () => {
  const queryMock = vi.fn(/* ... */)
  // Invocar el composable desde 10 contexts simultaneous
  await Promise.all(Array.from({ length: 10 }, () => useFoo(...)))
  expect(queryMock).toHaveBeenCalledTimes(1)  // No 10
})
```

Smoke en browser:

- Abrir RecordList con 50 rows del consumer
- DevTools Network: 1 query GraphQL inicial (no 50)
- Network tab muestra cache-first en headers

## Source

- **Discovered in**: TICKET-025, Session 2 (S2.T1 useActivityStatusBadge.ts)
- **Evidence**: El wrapper Vueform `ActivityStatusBadge` se renderea N veces en un RecordList (1 per row). Apollo cache funcionaria pero generaria N lookups reactivos. Patron Map module-scope reduce a 1 query inicial + lookups sincronos. Patron de referencia en `useCompositeSectionTree.ts` del mismo mod (composable con cache parcial). Aprendizaje L12 del ticket
- **Related**: RULE-mods-005 (composables shared vs component-level), RULE-mods-022 (sub-componentes Vueform inline)
