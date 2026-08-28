---
id: DOC-kb-archive-up1-frontend-console-warnings-audit-2026-05-22
project: up1
type: doc
---

# Propuesta al team up1 — Auditoria de warnings de consola del suite frontend

**Autor**: equipo curriculum-design (audit producido durante validacion post-merge UPONE-1100)
**Fecha**: 2026-05-22
**Audiencia**: team up1 platform / core workspaces (`layout/`, `suite/`, `object-manager/`)
**Estado**: propuesta para discusion + tickets de followup

---

## TL;DR

Durante validacion del PR UPONE-1100 (mod curriculum-design — TICKET-031 + TICKET-030), se capturaron empiricamente los console logs del suite en tenant UPU navegando `RecordList` de `Activity`. Resultado: **5 patrones distintos de warnings/errors**, todos con **causa raiz en core workspaces** del platform (`layout/`, `suite/`, configuracion de Apollo), **ninguno** en el mod `curriculum-design`.

Sin embargo, **1 de los 5 patrones cascadea al mod** (cuando se usa `CompositeSectionTree`) — el fix en core beneficia automaticamente a este y otros mods.

| # | Issue | Severidad | Modulo de origen | Conteo en sesion | Fix workspace |
|---|-------|-----------|------------------|------------------|---------------|
| 1 | `<Modal>` rompe `inheritAttrs` (multi-root template) | Media — ruido masivo, no rompe UX | `layout` (atom-level) | 74 instances | `layout/src/components/molecules/Modal/Modal.vue` |
| 2 | `useUp1Auth` llama `useRoute()` en middleware Nuxt | Baja — anti-pattern Nuxt 4 | `suite` (composable) | 1 permanente | `suite/composables/useAuth.ts` + `suite/middleware/guest.ts` |
| 3 | `inject() outside setup` (cascada del #2) | Baja — ya mitigado funcional | `suite` (composable) | 1 | mismo fix que #2 |
| 4 | Apollo cache: `UserPermissionsSummary` sin `id` / `merge` | Media — invariant + posible cache miss | `suite` (Apollo plugin) + `object-manager` (schema) | 1 invariant recurrente | `suite/plugins/apollo.client.ts` o backend schema |
| 5 | CSS 404s (bootstrap, vueform, bootstrap-icons, highlight.js, theme UPU) | Media — UX styles missing | `suite` (Vite resolver + assets) | 5 | `suite/nuxt.config.ts` + `suite/public/themes/UPU/` |

**Recomendacion al team**: priorizar Issue #1 + #4 (mayor impacto, fix chico). Issues #2/#3 agrupados en un refactor menor. Issue #5 requiere investigacion del dev env (puede ser estado local, no del codigo).

**Decision principal pendiente del team**: ¿quien toma ownership de cada issue? Los workspaces afectados son **core platform** — el mod `curriculum-design` no puede hacer estos fixes per la rule (no tocar `layout/`, `suite/`, etc. sin permiso explicito).

---

## Contexto del audit

### Setup empirico

- **Tenant**: UPU
- **Vista navegada**: `/UPU/Activity/RecordList/default_Activity_list`
- **Stack runtime**: Nuxt 4 + Vue 3 + Clerk + Apollo Client v3.14.0 + Vueform
- **Captura**: Playwright headed con listeners `page.on('console')` + `page.on('pageerror')` + listener especifico para patterns `Hydration`, `[Vue warn]`, `[nuxt]` (capa adicional para detectar el subset de hydration)
- **Duracion**: ~2 min de navegacion (login + RecordList + filtros)

### Estadisticas globales

| Categoria | Cantidad |
|-----------|----------|
| Warnings totales | 78 |
| Hydration-match (subset de warnings con patterns Nuxt/Vue/Hydration) | 76 |
| Errors | 5 |
| Info | 1 |
| Total log lines | 3,657 |

### Datos crudos preservados

- `/tmp/up1-console.log` — log completo de la sesion (3,657 lineas)
- `/tmp/up1-pw-console-capture.mjs` — script reusable de Playwright headed con captura
- Reproducer documentado en seccion "Anexo: reproducir el audit"

---

## Issue #1 — `<Modal>` rompe `inheritAttrs` por multi-root template (74 instances)

### Que esta sucediendo

```
[Vue warn]: Extraneous non-props attributes (class) were passed to component
but could not be automatically inherited because component renders fragment
or text or teleport root nodes.
  at <Modal model-value=false onUpdate:modelValue=fn<closeFilterModal> title="Configurar Filtros" ... >
  at <FiltersColumnRecordList showFilterModal=false ... >
  at <LayoutRecordList ... >
  at <LayoutOrchestrator layout-type="RecordList" ... >
  at <RouteProvider key="/UPU()/Activity()/RecordList/default_Activity_list()" ... >
```

**74 instances en ~2 min de navegacion** — se dispara en CADA re-render del `RecordList` (cambio de filters, paginacion, route change). El componente Modal recibe `class` desde su consumer pero no sabe a que elemento aplicarlo.

### Causa raiz

El componente [`layout/src/components/molecules/Modal/Modal.vue`](../up1/layout/src/components/molecules/Modal/Modal.vue) tiene **template con `<Teleport>` como elemento raiz**:

```vue
<template>
  <Teleport :to="teleportTo" :disabled="teleportDisabled">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" ...>
        <div class="modal-dialog" ...>
          <div class="modal-content">
            <!-- Header, Body, Footer slots -->
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

Cuando Vue procesa el template, identifica `<Teleport>` como el root node "movible". Per [docs oficiales de Vue](https://vuejs.org/guide/components/attrs.html#fallthrough-attributes-and-fragment-root-nodes):

> If a component renders multiple root nodes (a fragment), inheritAttrs cannot be automatically applied. If you don't manually bind $attrs, a runtime warning will be raised.

`<Teleport>` cuenta como root movible — Vue no puede decidir automaticamente si los attrs (`class`, `style`, `id`, etc.) van al overlay, al dialog, o al content. **Sin `defineOptions({ inheritAttrs: false })` ni `v-bind="$attrs"` manual en algun nodo, Vue 3 emite la warning en cada render**.

El consumer [`FiltersColumnRecordList.vue:3-8`](../up1/layout/src/components/organisms/Modal/FiltersColumnRecordList/FiltersColumnRecordList.vue) pasa `class` implicit (el componente padre lo aplica a su instancia de FiltersColumn, que delega al `<Modal>` hijo). Cuando el FiltersColumnRecordList renderea por filters/pagination, dispara la warning del Modal anidado.

### Efectos

- **Dev experience**: console del browser saturada en dev mode — **74 warnings por sesion corta** ocultan otros warnings legitimos. Reduce visibility de problemas reales.
- **Runtime / production**: en build production, Vue **elimina** los warnings (no se emiten). Esto significa que el bug **no afecta a usuarios finales**, solo a developers. Sin embargo, el comportamiento del `class` que se quiere aplicar al modal queda indefinido (Vue no lo aplica a ningun elemento) — si algun consumer pasa una `class` con la intencion de override estilos, **silently no funciona**.
- **Performance**: emit de console.warn 74 veces por sesion es lento (~ms acumulados en dev mode, no significativo).
- **Deuda tecnica**: el patron se va a propagar — cualquier mod nuevo que use `<Modal>` (e.g., curriculum-design ya lo hace en `CompositeSectionTreeElement.vue:131`) hereda la warning.
- **Riesgo**: si en el futuro el team decide darle utility a la `class` prop (ej: estilo per-modal custom), el patron actual va a hacer que el feature **no funcione silenciosamente**. Bug latente.

### Propuestas de fix

#### Opcion A — `inheritAttrs: false` + bind manual (recomendada, minima)

En `Modal.vue`:

```vue
<script setup lang="ts">
defineOptions({ inheritAttrs: false })
// resto del setup intacto
</script>

<template>
  <Teleport :to="teleportTo" :disabled="teleportDisabled">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="modal-overlay"
        :class="[{ 'modal-centered': centered }, $attrs.class]"
        :style="{ zIndex }"
        ...
      >
        ...
```

**Pros**:
- Cambio chico, 1 archivo, ~3 lineas modificadas
- Comportamiento explicit: `class` del consumer va al overlay
- Compatible con todos los consumers existentes sin cambios

**Cons**:
- Solo aplica `class`. Si el consumer pasa otros HTML attrs (`role`, `data-*`, `id`) no se propagan.

#### Opcion B — `v-bind="$attrs"` en el overlay (mas amplia)

```vue
<template>
  <Teleport :to="teleportTo" :disabled="teleportDisabled">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        v-bind="$attrs"
        class="modal-overlay"
        :class="{ 'modal-centered': centered }"
        ...
      >
        ...
```

**Pros**:
- Todos los attrs no-declarados van al overlay (`class`, `style`, `role`, `data-*`, etc.)
- Mas idiomatico Vue 3

**Cons**:
- Requiere validar que ningun consumer pasa attrs que romperian el overlay (poco probable, pero hay que revisar)
- Mas potencial impacto colateral (e.g., `data-test-id` quedara en overlay, no en el content)

#### Opcion C — Refactorear Modal a single-root sin `<Teleport>` en template

Mover el `<Teleport>` al consumer (cada uso del Modal lo envuelve), o usar Vue 3 `Teleport` programatico via render function.

**Pros**:
- Elimina la causa raiz (multi-root)
- Comportamiento de attrs default (inherit automatico)

**Cons**:
- Refactor mayor: requiere cambiar todos los call sites del Modal
- Pierde la encapsulacion (el consumer ahora maneja teleport)
- No recomendado salvo redesign mayor

### Decision pendiente del team

| Pregunta | Sugerencia |
|----------|-----------|
| ¿Opcion A o B? | A — mas conservadora, suficiente para silenciar 74 warnings |
| ¿Quien toma ownership? | Maintainer de `layout/` (core) |
| ¿Bumping de version del layout? | Si — patch version (`0.x.y → 0.x.{y+1}`) o minor segun convencion |
| ¿Tests unit? | Storybook story de Modal con `class` prop (verificacion visual) |

### Modulo afectado

| Archivo | Workspace | Rol |
|---------|-----------|-----|
| `layout/src/components/molecules/Modal/Modal.vue` | `layout` | **Fuente del bug** |
| `layout/src/components/organisms/Modal/FiltersColumnRecordList/FiltersColumnRecordList.vue` | `layout` | Consumer observado en log (74 instances) |
| `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue:131` | `mods/curriculum-design` | **Consumer cascada en mod** — fix beneficia gratis |
| Otros consumers del Modal (TBD) | varios | Pendiente grep cross-workspace para enumerarlos |

---

## Issue #2 — `useUp1Auth` invoca `useRoute()` desde middleware Nuxt (anti-pattern Nuxt 4)

### Que esta sucediendo

```
[nuxt] `useRoute` was called within middleware (`~/middleware/guest.ts`).
This may lead to misleading results. Instead, use the (to, from) arguments
passed to the middleware to access the new and old routes.
  at suite/composables/useAuth.ts:22:17
  at suite/middleware/guest.ts:7:63
```

1 instance por sesion (cada carga inicial de una ruta protegida con `middleware: 'guest'`).

### Causa raiz

[`suite/middleware/guest.ts:7`](../up1/suite/middleware/guest.ts) llama `useUp1Auth()` desde el middleware:

```ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.server) return;
  const { isAuthenticated, isLoading, currentOrganization } = useUp1Auth();
  // ...
});
```

[`suite/composables/useAuth.ts:38`](../up1/suite/composables/useAuth.ts) internamente usa `useRoute()`:

```ts
export const useUp1Auth = () => {
  // ...
  const route = useRoute()  // ← linea 38
  // ...
}
```

[Documentacion oficial Nuxt 4](https://nuxt.com/docs/4.x/directory-structure/app/middleware#accessing-route-in-middleware) explica: en middleware, `useRoute()` retorna la ruta **actual del store global** que puede no estar sincronizada con la ruta **destino** del navigation. Los args `(to, from)` del middleware son la fuente de verdad correcta.

### Efectos

- **Dev experience**: warning permanente en consola al login (cada vez que el dev arranca el suite).
- **Runtime correctness**: `useRoute()` en middleware puede retornar la ruta **previa** (no la nueva `to` que el navigation esta procesando). En este caso especifico, parece que la logica del middleware no depende del valor (el composable solo usa `route` para algun calculo lateral — habria que revisar el codigo completo). **Si en algun momento la logica empieza a depender de la ruta correcta, el bug puede causar redirects incorrectos** en edge cases.
- **Deuda tecnica**: anti-pattern documentado por Nuxt 4 — eventual update de Nuxt podria convertir esto en error (Nuxt 5+).
- **Riesgo bajo hoy, alto manana**: comportamiento OK ahora pero patron fragil ante upgrades.

### Propuestas de fix

#### Opcion A — Pasar `to` opcionalmente al composable (recomendada)

```ts
// suite/composables/useAuth.ts
import type { RouteLocationNormalized } from 'vue-router'

export const useUp1Auth = (currentRoute?: RouteLocationNormalized) => {
  const route = currentRoute ?? useRoute()
  // resto intacto
}
```

```ts
// suite/middleware/guest.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.server) return;
  const { isAuthenticated, isLoading, currentOrganization } = useUp1Auth(to);  // ← pasa `to`
  // ...
});
```

**Pros**:
- Cambio chico, retro-compatible (otros callers sin `to` siguen funcionando)
- Resuelve la warning + alinea con el patron Nuxt recomendado

**Cons**:
- Requiere actualizar TODOS los middlewares que usan `useUp1Auth` (probablemente `guest.ts`, `auth.ts` u otros)

#### Opcion B — Separar logic de routing del composable

`useUp1Auth` solo retorna auth state (sin tocar `route`). El consumer (middleware o component) decide que hacer con la ruta usando sus propios args.

**Pros**:
- Mas separation of concerns
- Composable mas testeable (no depende de routing context)

**Cons**:
- Refactor mayor: requiere mover la logica de `route` afuera del composable a cada call site
- Mas friccion si hay multiples consumers que usan `route`

#### Opcion C — Detectar contexto y skipear `useRoute()` cuando no es setup

```ts
import { getCurrentInstance } from 'vue'

export const useUp1Auth = () => {
  const hasSetupContext = !!getCurrentInstance()
  const route = hasSetupContext ? useRoute() : null
  // logica que dependa de route requiere null check
}
```

**Pros**: defensive

**Cons**: complica el composable + no resuelve el anti-pattern (`route` queda null en middleware, podria romper logica)

### Decision pendiente del team

| Pregunta | Sugerencia |
|----------|-----------|
| ¿Opcion A o B? | A — pragmatica, retro-compat |
| ¿Migrar otros middlewares en el mismo PR? | Si — grep `useUp1Auth` en `suite/middleware/` y actualizar todos |
| ¿Tests? | Si — agregar test del composable mockando middleware context |

### Modulo afectado

| Archivo | Workspace | Rol |
|---------|-----------|-----|
| `suite/composables/useAuth.ts:38` | `suite` | Origen del `useRoute()` |
| `suite/middleware/guest.ts:7` | `suite` | Caller que dispara la warning |
| `suite/middleware/*.ts` (otros) | `suite` | Posibles callers afectados — grep pendiente |

---

## Issue #3 — `inject() outside setup` (cascada de #2)

### Que esta sucediendo

```
[Vue warn]: inject() can only be used inside setup() or functional components.
```

1 instance. Sin trace explicito de Vue (esta warning especifica no propaga el origen).

### Causa raiz

`useUp1Auth()` invocado desde middleware (no es `setup()` context) intenta llamar `inject()` internamente — probablemente via Clerk's `useAuth()` o `useUser()`, que requieren el provide-context de Vue.

El composable mismo documenta el patron + tiene un try/catch para mitigarlo:

```ts
// suite/composables/useAuth.ts:8-13
// IMPORTANT: Clerk's useAuth()/useUser() require inject() which only works
// in Vue component setup context. When called from plugins (e.g., apollo.client.ts
// app:created hook), inject() fails. We use a lazy+try-catch pattern to handle
// this gracefully, falling back to reading the __session cookie directly.
```

El try/catch atrapa el throw pero **la warning de Vue se emite ANTES del catch** — es un `console.warn` de Vue dev mode, no un error catcheable.

### Efectos

- **Dev experience**: warning en consola, ya mitigada funcional (fallback a cookie) pero queda visible.
- **Runtime correctness**: el fallback funciona — `inject()` falla, catch atrapa, leemos `__session` cookie. Auth state correcto.
- **Performance**: 0 — single occurrence al login.
- **Deuda tecnica**: el lazy pattern es complejo (~30 lineas de boilerplate para manejar el contexto). Si Clerk/Nuxt cambian su API, el pattern puede romperse.
- **Riesgo bajo**: warning cosmetica.

### Propuestas de fix

#### Opcion A — Skip `inject()` cuando no hay setup context

```ts
import { getCurrentInstance } from 'vue'

const initClerk = () => {
  if (_clerkInitAttempted) return
  _clerkInitAttempted = true
  if (process.client && getCurrentInstance()) {  // ← guard explicit
    try {
      _clerkAuth = useAuth()
      _clerkUser = useUser()
    } catch { /* fallback existente */ }
  }
}
```

**Pros**: silencia la warning sin cambiar el behavior

**Cons**: detail tecnico que el siguiente lector tiene que entender

#### Opcion B — Variante del composable para middleware

```ts
// useAuthForMiddleware.ts — no usa inject ni useRoute
export const useUp1AuthForMiddleware = () => {
  // Solo lee __session cookie y deriva state
  // No llama Clerk's useAuth ni useUser
}
```

**Pros**: separation of concerns clarisima

**Cons**: 2 composables similares — riesgo de drift entre ambos

### Decision pendiente del team

Probablemente se resuelve junto con Issue #2 (Opcion A del #2 + Opcion A del #3 son complementarias). Decision: **agruparlos en 1 ticket** "Refactor `useUp1Auth` para middleware-safe usage".

### Modulo afectado

| Archivo | Workspace | Rol |
|---------|-----------|-----|
| `suite/composables/useAuth.ts` | `suite` | Origen (inject() lazy en `initClerk()`) |
| `suite/middleware/guest.ts` (via useAuth) | `suite` | Trigger context (middleware = no setup) |

---

## Issue #4 — Apollo cache: `UserPermissionsSummary` sin `id` o `merge` function

### Que esta sucediendo

```
An error occurred! ...
either ensure all objects of type UserPermissionsSummary have an ID
or a custom merge function...
Query.getMyPermissions
{ "__typename": "UserPermissionsSummary",
  "user": { "__ref": "UserInfo:50" },
  "roles": [...],
  "capabilityNames": [...] }
```

1 invariant warning recurrente — se dispara en cada `getMyPermissions` query que retorna data fresca.

### Causa raiz

Apollo Client v3 `InMemoryCache` normaliza objetos por `__typename` + `id`/`_id` para dedupar. Cuando recibe un objeto con `__typename: "UserPermissionsSummary"` pero **sin field `id`**, no puede:
1. Determinar si es el mismo objeto que tenia antes (dedup)
2. Decidir como mergear (replace vs append vs deep merge)

El schema GraphQL retorna `UserPermissionsSummary` como **computed type** — no es una entity persistida, es el resultado agregado de la query `getMyPermissions` para el usuario actual (roles + capability names). Por design no tiene `id` propia.

Consumers de la query:

| Archivo | Workspace | Uso |
|---------|-----------|-----|
| `suite/composables/useRoleSelection.ts` | `suite` | Selector de rol activo en UI |
| `layout/src/composables/useRbacPermissions.ts` | `layout` | Check de capabilities en row actions, field visibility |
| `layout/src/layouts/RecordList.vue` | `layout` | Consumer indirecto via `useRbacPermissions` |

Sin custom `typePolicy` en `InMemoryCache`, Apollo guarda el resultado inline pero emite la invariant + posiblemente pierde el cache hit en queries subsecuentes (refetch innecesario).

### Efectos

- **Dev experience**: invariant warning verbose (~5 KB del payload completo serializado en el mensaje de error).
- **Runtime correctness**: el cache **silenciosamente pierde el merge** — cada `getMyPermissions` puede triggerar refetch en lugar de hit del cache. **Posible performance issue** si la query se invoca con frecuencia (e.g., al cambiar layout, navigation entre tabs).
- **Performance**: depende del setup actual. Si la query tiene `fetchPolicy: 'cache-first'`, el cache miss fuerza network. Apollo DevTools (mencionado en otro log) ayudaria a medir si esto pasa.
- **Deuda tecnica**: typePolicy missing es estandar Apollo — eventual onboarding doc deberia listar todos los typePolicies del platform en un solo lugar.
- **Riesgo**: si el suite hace polling de permisos (re-query cada N min para detectar role changes), el cache miss multiplica las requests al object-manager.

### Propuestas de fix

#### Opcion A — typePolicy en frontend (recomendada — sin tocar backend)

En [`suite/plugins/apollo.client.ts`](../up1/suite/plugins/apollo.client.ts) (linea ~165, donde se inicializa `InMemoryCache`):

```ts
const cache = new InMemoryCache({
  typePolicies: {
    UserPermissionsSummary: {
      // Tratar como singleton — replace en cada update
      keyFields: false,
      merge(_existing, incoming) {
        return incoming
      },
    },
    Query: {
      fields: {
        getMyPermissions: {
          // Custom merge en el Query field level (alternativa equivalente)
          merge(_existing, incoming) {
            return incoming
          },
        },
      },
    },
  },
})
```

**Pros**:
- Cambio en 1 archivo del suite (frontend-only)
- No requiere coordinacion con backend
- Apollo idiomatico

**Cons**:
- Requiere validar interaccion con otras typePolicies existentes (si las hay)
- Necesita test funcional: la query `getMyPermissions` sigue funcionando + cache se actualiza al cambiar rol

#### Opcion B — Agregar `id` field al schema en object-manager (cambio backend)

En el resolver de `getMyPermissions`:

```graphql
type UserPermissionsSummary {
  id: ID!  # ← nuevo, computed: hash de userId + roleSet
  user: UserInfo
  roles: [RoleInfo!]!
  capabilityNames: [String!]!
}
```

Con `id` derivado (e.g., `${userId}-${currentRoleId}`), Apollo puede dedupar naturalmente sin custom policies.

**Pros**:
- Solucion mas robusta
- Aplica a todos los Apollo clients (suite + futuros consumers)
- Sin custom policy en frontend

**Cons**:
- Cambio backend cross-workspace (object-manager + frontend codegen)
- Requiere coordination + version bump del schema
- Mayor scope

#### Opcion C — Migrar la query a `useQuery` con `notifyOnNetworkStatusChange: false` + `fetchPolicy: 'no-cache'`

Skipea el cache para esa query.

**Pros**: simple

**Cons**:
- Antipattern (Apollo cache existe por una razon)
- Cada call fuerza refetch
- No recomendado

### Decision pendiente del team

| Pregunta | Sugerencia |
|----------|-----------|
| ¿Opcion A (frontend) o B (backend)? | A para fix rapido, B como mejora a largo plazo |
| ¿Documentar typePolicies del platform? | Si — crear `suite/docs/reference/apollo-type-policies.md` |
| ¿Auditar otros types sin id? | Si — grep schema GraphQL por types computed/aggregated |

### Modulo afectado

| Archivo | Workspace | Rol |
|---------|-----------|-----|
| `suite/plugins/apollo.client.ts:~165` | `suite` | **Fix location Opcion A** |
| `suite/composables/useRoleSelection.ts` | `suite` | Consumer query |
| `layout/src/composables/useRbacPermissions.ts` | `layout` | Consumer query |
| `layout/src/layouts/RecordList.vue` | `layout` | Consumer indirecto |
| `object-manager` (schema GraphQL de `UserPermissionsSummary`) | `object-manager` | **Fix location Opcion B** |

---

## Issue #5 — CSS 404s (5 recursos)

### Que esta sucediendo

5 errores 404 en network:

| Recurso | URL solicitada | Status |
|---------|----------------|--------|
| Bootstrap CSS | `/_nuxt/bootstrap/dist/css/bootstrap.min.css` | 404 |
| Bootstrap Icons | `/_nuxt/bootstrap-icons/font/bootstrap-icons.css` | 404 |
| Vueform CSS | `/_nuxt/@vueform/vueform/dist/vueform.css` | 404 |
| highlight.js theme | `/_nuxt/highlight.js/styles/atom-one-dark.css` | 404 |
| Theme UPU | `/themes/UPU/theme.css` | 404 |

### Causa raiz

**Los 4 primeros** estan declarados en [`suite/nuxt.config.ts:93-98`](../up1/suite/nuxt.config.ts):

```ts
css: [
  '@vueform/vueform/dist/vueform.css',
  resolve(currentDir, '../layout/src/styles/vueform-uplanner.css'),
  'bootstrap/dist/css/bootstrap.min.css',
  'bootstrap-icons/font/bootstrap-icons.css',
  'highlight.js/styles/atom-one-dark.css',
]
```

Nuxt 4 + Vite resuelve estos paths esperando que esten en `node_modules` con el resolver de Vite. El dev environment del audit recibe URLs `/_nuxt/{pkg}/...` que no resuelven — sugiere uno de:

1. **node_modules incompleto** (npm install no termino bien para el suite workspace)
2. **Cache stale del .nuxt** — Vite no regenero los manifests post-cambio de deps
3. **Symlink/hoisting issue** del npm workspaces — el suite no encuentra los packages en el root `node_modules`

**El theme UPU** (`/themes/UPU/theme.css`) es distinto: cargado dinamico por [`suite/plugins/theming.client.ts`](../up1/suite/plugins/theming.client.ts) per tenant. Verificacion en filesystem:

```
suite/public/  → favicon.ico, img, robots.txt (sin themes/)
suite/themes/  → directorio no existe
```

**El archivo fisico del theme UPU NO existe**. Probablemente:

1. Convencion: cada tenant tiene su `themes/{tenant_id}/theme.css` en `suite/public/themes/` o `suite/themes/` — el directorio se crea on-demand per tenant
2. UPU es tenant nuevo y el archivo nunca se creo
3. Fallback no implementado en `theming.client.ts` para tenants sin theme file

### Efectos

- **Dev experience**: 5 errores rojos en consola Network tab. Confuso para devs nuevos.
- **Runtime / production**: depende.
  - Si las CSS de node_modules estan ausentes en build production: **estilos rotos** (Bootstrap classes sin definir, Vueform sin CSS). Critico.
  - Si solo es dev environment (cache stale): production OK.
  - Theme UPU: sin theme, el suite cae al theme default. UX degradada pero funcional.
- **Performance**: 5 requests fallidas — minor.
- **Deuda tecnica**: si es config Vite issue, hay que documentar el setup correcto en `suite/docs/`.
- **Riesgo en deploy**: si el deploy de production no incluye las CSS bien resueltas, app se ve sin estilos. **High risk si esto es problema sistemico**.

### Propuestas de fix

#### Opcion A — Cleanup local del dev environment (si es solo dev cache)

```bash
cd suite
rm -rf .nuxt node_modules/.vite
cd ..  # root del monorepo
npm install --workspace=@uplanner/suite
cd suite
npm run dev
```

**Pros**: zero cambio de codigo

**Cons**: si el problema es sistemico (no solo dev cache), no resuelve nada

#### Opcion B — Verificar Vite optimizeDeps + module resolution

En `suite/nuxt.config.ts`:

```ts
vite: {
  optimizeDeps: {
    include: [
      'bootstrap/dist/js/bootstrap.bundle.min.js',
      '@vueform/vueform',
      // forzar pre-bundle de CSS imports
    ],
  },
  resolve: {
    preserveSymlinks: false,  // depende del setup del workspace
  },
},
```

**Pros**: fix declarativo si es issue de resolver

**Cons**: requiere debugging para identificar la config correcta

#### Opcion C — Crear theme UPU fisico

```bash
mkdir -p suite/public/themes/UPU
cat > suite/public/themes/UPU/theme.css <<'EOF'
/* Theme UPU - tenant default
   Overrides design tokens del platform via CSS layer */
@layer theme {
  :root {
    --up1-primary: #...;
    --up1-secondary: #...;
    /* etc */
  }
}
EOF
```

**Pros**: archivo missing → archivo presente. Theme UPU funcional.

**Cons**: requiere validar que los tokens del theme son los correctos (probable que exista en design system o en otro tenant — derivar de alli).

#### Opcion D — Fail-soft en `theming.client.ts`

Si el theme file 404, fallback silencioso al theme default (sin emitir error).

**Pros**: tolera tenants sin theme custom

**Cons**: oculta misconfig — el dev no detecta si olvido crear el theme

### Decision pendiente del team

| Pregunta | Sugerencia |
|----------|-----------|
| ¿Reproducir el bug en otro dev environment? | Si — confirmar si es solo local del reporter o sistemico |
| ¿Es production-blocking? | Verificar build production: `cd suite && npm run build && npm run preview` y abrir DevTools |
| ¿Convencion de themes? | Crear `suite/docs/reference/theming.md` documentando convencion `public/themes/{tenant_id}/theme.css` |
| ¿Theme UPU canonical? | Derivar del tenant default o consultar design system |

### Modulo afectado

| Archivo | Workspace | Rol |
|---------|-----------|-----|
| `suite/nuxt.config.ts:93-98` | `suite` | Declaracion de CSS imports |
| `suite/plugins/theming.client.ts` | `suite` | Carga dinamica del theme per tenant |
| `suite/public/themes/UPU/theme.css` | `suite` (assets) | **Archivo faltante** |
| `package.json` root + workspaces | `root` | Setup dependencies |
| Build pipeline (CI) | `root` | Verificacion en deploy |

---

## Hallazgo cross-cutting — Impacto en el mod `curriculum-design`

### ¿Hay warnings originados en el mod?

**NO**. Ningun warning capturado en el audit tiene su origen en archivos `mods/curriculum-design/*`.

### ¿Hay impacto indirecto?

**SI** — el mod tiene 1 consumer del componente bugueado `<Modal>` (Issue #1):

```vue
<!-- mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue:131 -->
<Modal
  :model-value="modalState.open"
  :title="modalTitle"
  size="md"
  scrollable
  @update:model-value="(v: boolean) => { if (!v) closeModal() }"
>
  <CompositeSectionForm ... />
</Modal>
```

Cuando el dev/usuario:

1. Abre la vista del CompositeSectionTree (parte del UX de Activity → CurricularSection edit)
2. Click en "Crear nueva seccion" o "Editar seccion" → abre el `<Modal>` con `CompositeSectionForm`
3. **Se dispara la misma Vue warning #1** (multi-root → class inheritance fail)

**Implicacion**: el fix del Issue #1 en `layout/Modal.vue` **automaticamente beneficia al mod** sin tocar codigo del mod. Es cambio cross-cutting de alta leverage.

### ¿Hay otros mods en riesgo similar?

Pendiente — grep `<Modal` en `mods/*/modsComponents/` confirmaria todos los consumers cross-mod del Modal bugueado. No ejecutado en este audit (TODO si el team decide priorizar Issue #1).

### Posicion del mod curriculum-design respecto a estos issues

- **Bloqueado en autonomia**: el mod NO puede aplicar ninguno de los fixes — per rules del platform, no toca `layout/`, `suite/`, ni `object-manager/` sin permiso explicito.
- **Beneficiario pasivo**: cada fix del team up1 propaga al mod sin requerir trabajo desde el mod.
- **Cross-impact registrado**: este audit emerge del trabajo del mod (TICKET-031 PR UPONE-1100). El mod NO causo los warnings — los descubrio durante validacion empirica.

---

## Analisis honesto: ¿por que cubrir esto? + costo de inaccion + urgencia real

> **Punto clave**: NINGUNO de los 5 issues es show-stopper hoy. La plataforma funciona, los usuarios pueden trabajar, no hay data loss ni downtime. Si el team tiene urgencias mayores (entrega de feature, demo a cliente, bug critico reportado por usuario real), **TODOS estos issues pueden postergarse sin riesgo inmediato**. Lo que sigue es un analisis de **beneficio de fixearlo** vs **costo de NO fixearlo**, para que el team decida en frio.

### Marco para evaluar urgencia

Cada issue se evalua en 4 ejes:

1. **¿Afecta al usuario final?** (rompe UX, bloquea workflow, causa errores visibles)
2. **¿Afecta al developer experience?** (ruido en consola, debugging dificil, productividad)
3. **¿Genera deuda que se acumula?** (cada nuevo consumer hereda el bug — propagacion)
4. **¿Es riesgo latente?** (no rompe hoy, pero podria romper manana con un upgrade/cambio)

---

### Issue #1 — `<Modal>` inheritAttrs (74 warnings)

**¿Por que cubrirlo?**

- **Limpia 95% del ruido de consola** en una sesion corta. Un dev nuevo abriendo DevTools por primera vez ve 76 warnings en rojo/amarillo y NO sabe cual mirar. El issue #1 oculta otros warnings legitimos por volumen — al fixearlo, los otros 4 se hacen visibles y debuggables.
- **Fix trivial**: 1 archivo, ~3-5 lineas. Probablemente 30 min de trabajo + 30 min de revisar consumers (incluyendo storybook).
- **Cascade benefit**: el `<Modal>` es atom-level — todos los consumers (RecordList, RecordDetail, dialogs custom, mods como curriculum-design) reciben el fix gratis.
- **Habilita features futuros**: si en algun momento se quiere stylizar modals desde el consumer (e.g., modal especial con `class="warning-modal"`), hoy no funciona silenciosamente. Post-fix, funciona.

**¿Que puede pasar si NO se cubre?**

- **Hoy**: nada visible. La app sigue funcionando.
- **3-6 meses**: dev experience erosionada. Devs nuevos ven la consola sucia y o (a) la ignoran (peligroso — pierden warnings legitimos del futuro) o (b) preguntan "¿es bug?" y pierden tiempo del team.
- **6-12 meses**: cuando algun consumer intente pasar `class` con intencion real (theming, dark mode custom, accessibility tweaks), va a fallar silenciosamente. Bug futuro con causa lejana en el tiempo, dificil de diagnosticar.
- **1+ ano**: si el team migra a Vue 3.X+ donde Vue endurezca el comportamiento (warning → error), el deploy production rompe.

**¿Postergable?** SI, sin riesgo inmediato. Pero **costo de oportunidad alto** — fix de 1h limpia el dev environment del platform completo. Si el team va a tocar el suite/layout proximamente para feature work, **aprovechar la ventana** y meterlo es buena practica.

**Veredicto honesto**: NO urgente, PERO el ratio costo/beneficio es excelente. Si hay 1-2 horas en el sprint sin asignar, vale el fix. Si no, postergar 1-2 sprints sin culpa.

---

### Issue #2 + #3 — `useAuth` en middleware (anti-pattern Nuxt 4)

**¿Por que cubrirlo?**

- **Cumple con guidelines oficiales de Nuxt 4**. El framework esta explicit: middleware deben usar args `(to, from)`, no `useRoute()`. Cumplir con el patron canonico facilita upgrades futuros.
- **Mitiga riesgo de Nuxt 5+**: cuando Nuxt eventualmente convierta esta warning en error (es comun en majors), el suite rompe. Fix temprano evita migration painful.
- **Codigo mas testeable**: composable que NO depende de `useRoute()` global es mas facil de mockear en unit tests.

**¿Que puede pasar si NO se cubre?**

- **Hoy**: warning cosmetica. `inject() outside setup` esta mitigada por el try/catch — funciona fine.
- **3-6 meses**: nada visible. Comportamiento funcional preservado.
- **6-12 meses**: si Nuxt minor release (4.x → 4.y) tightens el behavior, posible regression en redirects de middleware. **Edge case** observable solo si el dev cambia rutas rapido (race condition entre `useRoute()` y `to`).
- **1+ ano**: upgrade a Nuxt 5 obligatorio. El anti-pattern probablemente sera breaking. Migration cost mas alto que fix ahora.

**¿Postergable?** SI, **comodamente**. No hay user-facing impact ni dev-blocking issue. La warning ruido es 1 instance por sesion (no contaminacion masiva).

**Veredicto honesto**: postergable **6-12 meses sin culpa**. Cuando el team planifique upgrade de Nuxt o refactoring del auth module, agregar el fix entonces como parte natural del scope.

---

### Issue #4 — Apollo cache `UserPermissionsSummary`

**¿Por que cubrirlo?**

- **Posible cache miss + refetch innecesario**: cada vez que el cliente consulta `getMyPermissions`, si Apollo no puede mergear con el cache, **probablemente** fuerza un network request. Si la query se invoca con frecuencia (e.g., cada navigation entre tabs, cada render de RecordList con RBAC checks), **hay tracfico extra al object-manager** que se podria evitar.
- **Performance medible si el cluster esta loaded**: en production con N usuarios concurrentes, cada cache miss = 1 request extra al backend. Multiplicado por usuario por hour de uso, puede agregar carga al object-manager.
- **Higiene de Apollo**: typePolicies bien definidas son standard Apollo best practice. El platform deberia tener un sitio canonico (`suite/docs/reference/apollo-type-policies.md`) listando todos los types sin id explicitamente.

**¿Que puede pasar si NO se cubre?**

- **Hoy**: invariant warning en consola. **No medido**: ¿el cache miss esta sucediendo realmente o Apollo recovers? Sin profiling con DevTools, no sabemos.
- **3-6 meses**: si el team escala la base de usuarios, las requests extra al object-manager se hacen visibles en metrics. Posible latencia agregada en operaciones que dependen de check de permisos.
- **6-12 meses**: si el team agrega mas types computed/aggregated al schema (sin id), cada uno hereda el mismo problema. Deuda se acumula type-por-type.
- **1+ ano**: posible necesidad de optimizar performance del backend que en realidad es symptom del cache miss del frontend. Diagnosis dificil sin haber resuelto este patron de raiz.

**¿Postergable?** SI, pero **con vigilancia**. Recomendado profilar primero (Apollo DevTools + Network tab) para saber si el cache miss es real o speculative.

**Veredicto honesto**: postergable hasta que metricas backend muestren carga anormal, O hasta que el team agregue otro type computed al schema (entonces fix proactivo evita doble deuda). **Si el team va a tocar `apollo.client.ts` por otra razon, meter este fix como parte natural del scope**.

---

### Issue #5 — CSS 404s

**¿Por que cubrirlo?**

- **POSIBLE production-blocker** — este es el unico de los 5 que tiene chance de afectar al usuario final.
- Si las CSS de `bootstrap`, `vueform`, `bootstrap-icons` y `highlight.js` no se resuelven en build production, **la app se ve sin estilos** en deploy. Critico.
- El theme UPU faltante significa que el tenant UPU usa fallback default — UX degradada pero funcional.
- **Investigacion obligatoria**: distinguir entre "solo dev env del reporter" vs "sistemico en deploy".

**¿Que puede pasar si NO se cubre?**

- **Hoy, si es solo dev local**: 5 errores rojos en consola del reporter. Otros devs no lo ven. Riesgo bajo.
- **Hoy, si es sistemico**: deploy production tiene styles rotos. **Critico** — bug visible a usuarios reales.
- **3-6 meses si es solo dev**: nada cambia. Reporter sigue con consola sucia, otros devs OK.
- **3-6 meses si es sistemico**: deploys futuros tambien rotos. Cliente puede reportar "se ve raro" sin claridad del root cause.
- **Theme UPU**: si UPU es tenant de cliente real, **cada usuario UPU** ve fallback default theme. UX inconsistente per tenant.

**¿Postergable?** **Depende de la confirmacion de scope**:

- **Solo local del reporter**: postergable indefinido (issue ambiental).
- **Sistemico (afecta builds de otros devs / CI / production)**: **NO postergable** — abordar urgente.

**Veredicto honesto**: este es el unico de los 5 que merece **investigacion inmediata** para clarificar urgencia. 30 min de trabajo:

```bash
# En otro dev environment (otro dev del team):
git pull && npm install && cd suite && npm run dev
# Abrir DevTools, navegar al suite, verificar si los mismos 5 errores aparecen

# Build production:
cd suite && npm run build && npm run preview
# Verificar si los CSS estan presentes o no
```

Si la investigacion confirma "solo local" → bajar prioridad a P3 (postergable). Si confirma "sistemico" → escalar a P0 production-blocker.

---

### Resumen del analisis honesto

| Issue | Tipo de problema | Si NO se cubre, ¿qué pasa? | ¿Postergable? | Recomendacion honesta |
|-------|------------------|----------------------------|---------------|----------------------|
| #1 Modal | Higiene + leverage | Nada hoy. Bug latente si en el futuro algun consumer use `class` con intencion. Console noise oculta otros warnings | SI sin culpa | Si hay 1-2h, vale el fix. Ratio costo/beneficio excelente. Si no, postergar 1-2 sprints |
| #2+#3 useAuth | Anti-pattern Nuxt 4 | Nada hoy. Posible breaking en upgrade futuro de Nuxt | SI 6-12 meses | Postergar comodamente. Meter en el siguiente refactor de auth/middleware |
| #4 Apollo | Performance + higiene cache | Possible cache miss → extra requests al backend. Sin medir, especulativo | SI, con vigilancia | Profilar primero. Si confirm cache miss real, fix. Si no, postergar |
| #5 CSS 404s | Posiblemente production-blocker | Si sistemico: app sin estilos en production. Si local: nada | **DEPENDE** | Investigar 30 min en otro dev env / build production. Decision en frio post-investigacion |

### ¿Si tengo otras urgencias mayores ahora?

**Si el team tiene**:

- Feature de cliente proxima a entregar
- Bug urgente reportado por usuario real
- Sprint con goals comprometidos
- Demo a stakeholder

**Postergar TODOS estos 5 issues SIN CULPA**. El platform funciona, no hay data loss, no hay downtime, los usuarios pueden trabajar. Estos son issues de **higiene + leverage** — importantes para salud a largo plazo, pero no para responder a presion inmediata.

**La unica excepcion** es Issue #5 — vale 30 min de investigacion para distinguir "ambiental" vs "production-blocker". Si la investigacion confirma "production-blocker", entonces sí amerita action inmediata. Si confirma "solo local", se postpone con el resto.

### ¿Cuando si conviene cubrirlos?

- **Issue #1**: cuando el team va a tocar `layout/Modal.vue` por otra razon (refactor visual, accessibility audit, design system update) — aprovechar el momento
- **Issue #2+#3**: cuando el team planifica upgrade de Nuxt, o cuando el auth module necesite refactor por otra razon
- **Issue #4**: cuando el team agregue otro type computed al schema GraphQL, O cuando metricas backend muestren carga anormal en queries de RBAC
- **Issue #5**: ya — 30 min de validacion. La urgencia real depende del resultado de esa validacion

---

## Recomendacion al team up1

### Priorizacion sugerida

| Prio | Issue | Justificacion | Postergable sin culpa? |
|------|-------|---------------|------------------------|
| **P0 (urgente, 30 min)** | #5 CSS 404s — investigar scope | Production-blocker potencial — distinguir local vs sistemico antes de seguir priorizando | NO — investigar ya |
| **P1 (cuando haya slot)** | #1 Modal inheritAttrs | Ratio costo/beneficio excelente: 1-2h limpia 95% del noise + cascade a mods | SI 1-2 sprints |
| **P2 (oportunista)** | #4 Apollo UserPermissionsSummary | Profilar primero. Fix si confirm cache miss real | SI hasta que metricas backend lo justifiquen |
| **P2 (oportunista)** | #2 + #3 useAuth in middleware | Refactor menor + anti-pattern Nuxt 4 | SI 6-12 meses, meter en proximo refactor del auth module |

### Estrategia tactica sugerida

**Opcion sprint**: 1 ticket consolidado `improvement` "Frontend cleanup post-MVP" con 4 sub-tasks (1 por issue). 1-2 dias de un dev del team up1. Cierra ~95% del console noise.

**Opcion granular**: 4 tickets separados (1 por issue) para ownership distribuido + tracking individual.

### Pasos sugeridos para el team

1. **Validar el audit**: reproducir el escenario en otro dev environment (otro dev del team) — confirmar que los 5 issues aparecen tambien (no son solo del reporter).
2. **Decidir scope**: ¿4 tickets separados o 1 consolidado? ¿Quien owner?
3. **Issue #1 primero**: fix de mayor leverage. Validar con storybook stories del Modal + test visual.
4. **Issue #5 dilucidar urgencia**: confirmar si es production-blocking via `npm run build && npm run preview` con DevTools abierta.
5. **Documentar typePolicies**: crear `suite/docs/reference/apollo-type-policies.md` como ground truth post-fix del #4.

---

## Anexo: reproducir el audit

### Prerrequisitos

- `suite` corriendo en `:3000` (verifica: `curl -sI http://localhost:3000` → `302 Found`)
- `object-manager` corriendo en `:4000`
- Node 22 + npm (per convencion platform — `source ~/.nvm/nvm.sh && nvm use 22`)
- Playwright instalado en `node_modules` del monorepo (verificado: `node_modules/playwright/`)

### Script Playwright

```javascript
// /tmp/up1-pw-console-capture.mjs
import { chromium } from '/Users/edobacon/Workspace/uplanner/up1/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const LOG_FILE = '/tmp/up1-console.log';
fs.writeFileSync(LOG_FILE, `[${new Date().toISOString()}] === Session start ===\n`);

const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
const context = await browser.newContext({ viewport: null, ignoreHTTPSErrors: true });
const page = await context.newPage();

// Listener general
page.on('console', (msg) => {
  const type = msg.type();
  const text = msg.text();
  const loc = msg.location().url ? ` [${msg.location().url}:${msg.location().lineNumber}]` : '';
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [${type.toUpperCase()}]${loc} ${text}\n`);
});

page.on('pageerror', (err) => {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [PAGEERROR] ${err.message}\n${err.stack || ''}\n`);
});

// Listener especifico hydration/Vue/Nuxt patterns
page.on('console', (msg) => {
  const text = msg.text();
  if (text.includes('Hydration') || text.includes('hydration') || text.includes('[Vue warn]') || text.includes('[nuxt]')) {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [HYDRATION-MATCH] ${text}\n`);
  }
});

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
console.log(`Browser ready. Logs: ${LOG_FILE}`);

// Mantener proceso vivo
browser.on('disconnected', () => process.exit(0));
process.on('SIGINT', async () => { try { await browser.close(); } catch {}; process.exit(0); });
await new Promise(() => {});
```

### Ejecucion

```bash
# 1. Verifica servicios up
curl -sI http://localhost:3000 | head -1  # → 302 Found = OK

# 2. Lanza Playwright (en background)
source ~/.nvm/nvm.sh && nvm use 22
node /tmp/up1-pw-console-capture.mjs &

# 3. Autenticar manualmente en el browser que abre (Clerk login UPU)

# 4. Navegar las vistas del interes (RecordList Activity, Modal de filtros, etc.)

# 5. Analizar logs
wc -l /tmp/up1-console.log
grep '\[HYDRATION-MATCH\]' /tmp/up1-console.log | sed -E 's/\[20[0-9]{2}-[0-9]{2}-[0-9]{2}T[^]]+\] //;s/at http.*$//' | sort | uniq -c | sort -rn
grep '\[ERROR\]\|\[PAGEERROR\]' /tmp/up1-console.log
```

### Limpieza

```bash
# Cerrar el browser PW
pkill -f up1-pw-console-capture

# (opcional) limpiar logs
rm /tmp/up1-console.log
```

---

## Changelog del documento

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-05-22 | Creacion inicial — audit del PR UPONE-1100 (TICKET-031) | curriculum-design team |
| 2026-05-22 | Ampliacion a propuesta team — causas profundas + efectos + multiples opciones de fix | curriculum-design team |

---

## Referencia cruzada DKC

- TICKET-031 (project: up1, mod: curriculum-design) — audit emergente durante S3 smoke validation
- HOR-064 (project: horadric) — fix de format drift detector que dio contexto al patron de captura empirica
- Memoria global del dev — convencion: `uplanner/specs/` para hallazgos cross-platform del codigo up1 (no commiteable, doc local de referencia)
