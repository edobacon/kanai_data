---
id: SPEC-core-006
project: up1
type: doc
module: core
tags:
  - up1
  - suite
  - nuxt
  - vue
  - clerk
  - auth
  - multi-tenant
  - routing
  - sse
  - i18n
  - apollo
  - pinia
  - csp
  - seguridad
---

# Suite Workspace de uP1 (frontend)

## Indice

1. [Que es](#1-que-es)
2. [Stack tecnico](#2-stack-tecnico)
3. [Estructura de `suite/`](#3-estructura-de-suite)
4. [Routing multi-tenant](#4-routing-multi-tenant)
5. [Autenticacion con Clerk](#5-autenticacion-con-clerk)
6. [Integracion con Layout](#6-integracion-con-layout)
7. [Server layer (Nitro)](#7-server-layer-nitro)
8. [Stores y composables clave](#8-stores-y-composables-clave)
9. [Seguridad HTTP (CSP y headers)](#9-seguridad-http-csp-y-headers)
10. [Actividad reciente](#10-actividad-reciente)
11. [Comandos de referencia](#11-comandos-de-referencia)
12. [Documentacion relacionada (enlaces, no duplicar)](#12-documentacion-relacionada-enlaces-no-duplicar)

---

## 1. Que es

`suite/` (paquete `@uplanner/suite`) es el **frontend principal** de uP1: una aplicacion Nuxt 4 que sirve como cara visible de la plataforma para cada tenant. No accede a PostgreSQL ni implementa logica de negocio: consulta el Object Manager via GraphQL (Apollo) y delega todo el renderizado de datos a `LayoutOrchestrator` (workspace `layout/`, ver `core/layout-workspace.md`).

### Responsabilidades

- Enrutamiento multi-tenant (`/{tenant_id}/{objectName}/{viewType}/{layoutId}`)
- Autenticacion de usuarios via Clerk y sincronizacion con `core_User` del tenant activo
- Inyeccion de headers multi-tenant (`X-Tenant-ID`) y de sesion en cada request GraphQL
- Theming por tenant, i18n en runtime, notificaciones en tiempo real (SSE)
- Integracion de componentes y estilos aportados por mods (via `npm run sync`)

### Lo que nunca hace

- Importar `RecordList`/`RecordDetail` directamente (siempre via `LayoutOrchestrator`)
- Acceder a la base de datos
- Hardcodear textos o estilos especificos de un tenant

---

## 2. Stack tecnico

| Componente | Tecnologia |
|-----------|------------|
| Framework | Nuxt 4 (Vue 3, Nitro) |
| Autenticacion | Clerk (`@clerk/nuxt`) |
| Datos | Apollo Client (`@apollo/client`, `@nuxtjs/apollo`) |
| Estado | Pinia (`@pinia/nuxt`) |
| Formularios | `@vueform/nuxt` |
| i18n | `i18next` + `i18next-vue` |
| UI base | Bootstrap 5, `bootstrap-vue-next` (via componentes de `layout/`) |
| Reportes | `flexmonster` |
| Reactividad avanzada | `rxjs` |
| Tipado | TypeScript |

Evidencia: `suite/package.json`.

---

## 3. Estructura de `suite/`

```
suite/
├── pages/
│   ├── index.vue
│   ├── [tenant_id].vue                              ← layout raiz del tenant (theming, notificaciones, chatbox)
│   ├── [tenant_id]/
│   │   ├── index.vue
│   │   ├── profile/index.vue
│   │   └── [object_name]/
│   │       ├── index.vue
│   │       ├── [view_type]/
│   │       │   ├── index.vue                        ← resuelve el layout por defecto del objeto
│   │       │   └── [layout_id]/index.vue             ← layout explicito por id
│   │       └── [instance_id]/
│   │           └── [view_type]/
│   │               ├── index.vue
│   │               └── [layout_id]/index.vue
│   └── login/[tenant_id].vue
├── middleware/
│   ├── auth.global.ts                                ← auth client-side (todas las navegaciones)
│   ├── tenant-access.global.ts                       ← canonicaliza casing del tenant + valida pertenencia del usuario
│   └── guest.ts
├── stores/                                            ← Pinia
│   ├── uiContext.ts                                   ← contexto visual (capas CSS: theme, objectName, viewType...)
│   └── notifications.ts
├── composables/                                        ← 18 composables
│   ├── useConfig.ts                                    ← acceso reactivo a config de plataforma/mod/usuario
│   ├── useServerNotifications.ts                       ← cliente del stream SSE
│   ├── useLayoutEngine.ts                              ← carga LayoutOrchestrator via defineAsyncComponent
│   ├── useObjectManager.ts, useApolloClient.ts, useAuth.ts
│   ├── useRbacPermissions.ts, useRoleSelection.ts, useUserSync.ts
│   └── useI18nSettings.ts, useSemanticClasses.ts, useTourGuide.ts, ...
├── plugins/                                             ← 6 plugins
│   ├── apollo.client.ts / apollo.server.ts             ← inyeccion de X-Tenant-ID + token Clerk
│   ├── i18n.ts                                          ← instancia i18next, overrides de tenant en runtime
│   ├── userConfig.client.ts
│   ├── theming.client.ts
│   └── logger.client.ts
├── server/                                              ← Nitro (backend embebido)
│   ├── api/
│   │   ├── auth/ (logout.post.ts, sync-user.post.ts, token-info.get.ts, validate-email.post.ts)
│   │   ├── notifications/
│   │   │   ├── stream.get.ts                           ← endpoint SSE
│   │   │   └── push.post.ts                            ← target de webhook (n8n)
│   │   ├── realtime/push.post.ts
│   │   ├── health.get.ts
│   │   └── themes.get.ts
│   ├── middleware/auth.ts                               ← auth SSR
│   ├── routes/locales/[...path].get.ts                  ← sirve locales en runtime
│   └── utils/sseClients.ts                              ← registro de clientes SSE conectados
├── css/                                                 ← capas de tema (ver `core/style-guide.md`)
├── lang/                                                ← traducciones sincronizadas (nunca editar a mano)
└── modsComponents/                                      ← componentes de mods sincronizados (nunca editar a mano)
```

Evidencia: listados directos de `suite/pages/`, `suite/middleware/`, `suite/stores/`, `suite/composables/`, `suite/plugins/`, `suite/server/`.

---

## 4. Routing multi-tenant

La URL codifica tenant, objeto, tipo de vista y layout: `/{tenant_id}/{objectName}/{viewType}/{layoutId}`, resuelto por la estructura de carpetas con corchetes de Nuxt descrita en la seccion 3.

`middleware/tenant-access.global.ts` canonicaliza el casing del tenant en la URL (ej. `/upu/...` se redirige a `/UPU/...`) porque el Object Manager matchea `X-Tenant-ID` de forma case-sensitive contra los tenants registrados, y valida que el usuario autenticado en Clerk tenga una fila `core_User` correspondiente en la base del tenant destino; si no la tiene, redirige a `/login/{tenant}?error=not_registered` en vez de dejarlo en un estado de "logueado fantasma" con la UI vacia y llamadas GraphQL fallando en silencio. Cachea unicamente resultados positivos en `sessionStorage` por 5 minutos (los negativos no se cachean, porque un admin puede agregar al usuario al tenant en cualquier momento).

`middleware/auth.global.ts` corre en cada navegacion client-side y redirige a `/login` si no hay sesion Clerk activa; el middleware server-side equivalente (`server/middleware/auth.ts`) cubre el SSR.

### Sentinel `new` en la ruta de detalle (UPONE-1377)

En la ruta con instancia (`.../[instance_id]/[view_type]/[layout_id]/index.vue`), el segmento `instance_id` es una palabra reservada: si vale exactamente `'new'`, la pagina lo trata como "sin instancia" (`instanceId` resuelve a cadena vacia) y fuerza el modo create en `LayoutOrchestrator`/`RecordDetail`. Esto habilita layouts de lista configurados con `openMode.create: "route"`. Consecuencia: `'new'` ya no puede usarse como id real de instancia en ningun objeto.

Source_ref: `suite/pages/[tenant_id]/[object_name]/[instance_id]/[view_type]/[layout_id]/index.vue:100` (`const instanceId = computed(() => rawInstanceId.value === 'new' ? '' : rawInstanceId.value)`).

### `breadcrumbParent` y corte de ciclos (RULE-suite-008)

Un layout que vive fuera del menu principal declara `breadcrumbParent` (campo en `composables/breadcrumbTrail.ts:56`) para indicar cual es su padre logico en la migaja de pan. Al reconstruir la cadena, el composable protege contra referencias circulares entre layouts: `const visited = new Set<string>([...])` (`:180`) acumula los `layoutName` ya recorridos, y `if (visited.has(parent.layoutName)) break;` (`:183`) corta el armado ni bien detecta un ciclo, en vez de recursar indefinidamente.

### `navigate-to-relation` sin `targetId`

El evento `navigate-to-relation` que emiten `RecordList.vue`/`RecordDetail.vue` de `layout/` puede llegar sin `targetId`. `pages/[tenant_id]/[object_name]/[view_type]/index.vue:143-145` trata ese caso como valido de forma explicita en un comentario: `targetId` es opcional, y cuando falta, el segmento correspondiente simplemente se omite al construir la URL. Las 4 paginas de suite que escuchan este evento (las variantes de `[object_name]/[view_type]` con y sin `[instance_id]`/`[layout_id]`) siguen el mismo criterio.

### Rutas de reportes eliminadas (UPONE-1376)

Las paginas `pages/[tenant_id]/reports/{index,view}.vue` (layout types `ReportList`/`ReportViewer`, no soportados por `LayoutOrchestrator`) se eliminaron del repo: la ruta `/{tenant_id}/reports*` ya no existe en Suite. El reporting se sirve ahora via la app `up1-manager` (ver CLAUDE.md, seccion "Legacy removed mods/apps"). Verificado: no queda directorio `pages/[tenant_id]/reports/` en el codigo actual.

---

## 5. Autenticacion con Clerk

Modulo registrado en `nuxt.config.ts:49` (`modules: ['@clerk/nuxt', '@nuxtjs/apollo', '@vueform/nuxt', '@pinia/nuxt']`). Configuracion via variables de entorno (`suite/.env`): `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NUXT_CLERK_SECRET_KEY`.

`plugins/apollo.client.ts` inyecta en cada request GraphQL, mediante un link chain de Apollo:
- Header `X-Tenant-ID`, tomado de los parametros de ruta
- Header `Authorization`, con el token de sesion de Clerk

Detalle completo del flujo (incluido login de desarrollo con OTP fijo en modo test) en `guides/authentication.md` dentro de `suite/docs/`.

### Invariante de sesion: Clerk real, nunca solo la cookie `__session` (UPONE-1469)

La cookie `__session` persiste aunque la sesion de Clerk haya expirado, asi que nunca alcanza como criterio de "logueado". El criterio correcto, aplicado de forma consistente en todo el frontend:

- **Con Clerk cargado** (`isLoaded.value === true`): confiar en la senal real de sesion (`isSignedIn`/`session`), nunca la cookie.
- **Antes de que Clerk cargue**, o donde `inject()` de Vue no aplica (middleware de ruta, plugins): fallback a la presencia de la cookie `__session`, solo para no bloquear el primer paint.

Esta distincion se resuelve distinto segun el punto de acceso:
- **Composable** (`composables/useAuth.ts:isAuthenticated`, linea ~70): dentro de un `setup()` de componente, usa el composable `_clerkAuth` inyectado por `@clerk/nuxt`.
- **Middleware de ruta** (`middleware/auth.global.ts`, `middleware/guest.ts`): corre fuera de `setup()`, por lo que lee el global `window.Clerk` directamente (`clerk.loaded`, `clerk.session`) en vez del composable, que ahi solo advertiria y no devolveria nada.

`handleAuthFailure()` (`composables/useAuth.ts:181`) es el punto de entrada unico para una sesion expirada detectada en runtime: fuerza sign-out real (limpia `__session` + sesion de ClerkJS). Es idempotente (guard de modulo) y tiene un loop-breaker de 10s para no disparar multiples veces por rafagas de errores 401 concurrentes. Se invoca desde 3 fuentes: el link `onError` de Apollo (detecta `UNAUTHENTICATED` tanto en `graphQLErrors` como en `networkError`, porque el Object Manager a veces lo emite como HTTP 500), `useServerNotifications` (el stream SSE no expone status HTTP, asi que hace un probe fetch para distinguir un 401 real de un corte transitorio de red), y el middleware de rutas.

**Loop-breaker complementario en `middleware/guest.ts`** (commit de seguimiento post-1469, mismo dominio): un contador en `sessionStorage['up1:authBounce']` detecta si el cliente rebota 3+ veces en menos de 6s entre `/login` y la app para el mismo tenant (senal de que el cliente cree tener sesion pero el servidor la rechaza); al detectarlo, fuerza `signOut()` en vez de seguir el ping-pong. `middleware/auth.global.ts` limpia el contador apenas una navegacion aterriza con exito en un tenant.

Detalle completo en `.ai/CONTEXT.md` (seccion 4, "Auth & Session Handling") del propio repo `suite/`.

### Cambio de rol server-authoritative, sin aplicacion optimista (RULE-suite-010)

`composables/useRoleSelection.ts:62-98` implementa el cambio de rol activo sin optimismo: `applyRoleLocally` (el que actualiza el estado local/UI) solo se invoca despues de que la mutation `setActiveRole` resuelve con `await`. Si la mutation falla, el `catch` revierte al rol previo en vez de dejar la UI en un estado que el servidor nunca confirmo.

### Bypass de membresia server-to-server: dos piezas, dos archivos (RULE-suite-011)

El bypass del gate de membresia de tenant para llamadas server-to-server confiables usa el header `X-Internal-Service-Key`, verificado en `server/api/auth/sync-user.post.ts:77-80` con un comentario que lo marca como trusted server-to-server.

El refresco del token de Clerk es una pieza distinta, en un archivo distinto: vive en `middleware/tenant-access.global.ts:97` (`await (window as any).Clerk?.session?.getToken({ skipCache: true })`), ejecutado best-effort dentro de un try/catch, con un comentario que aclara que el gate de membresia lee el claim `up1Tenants` embebido en ese JWT. No confundir ambas piezas: `sync-user.post.ts` es el bypass server-to-server, `tenant-access.global.ts` es el refresh de token del lado del cliente.

---

## 6. Integracion con Layout

Suite nunca importa `RecordList`/`RecordDetail`/`ChibiList` directamente. El unico punto de integracion es `LayoutOrchestrator` (ver `core/layout-workspace.md`, seccion 6), cargado de forma perezosa por el composable `useLayoutEngine.ts`:

```typescript
// suite/composables/useLayoutEngine.ts
const LayoutOrchestratorComponent = defineAsyncComponent(() =>
  import('@layouts/LayoutOrchestrator.vue')
);
```

Se usa en las paginas de objeto (`pages/[tenant_id]/[object_name]/[view_type]/index.vue` y variantes con `[instance_id]`/`[layout_id]`), en `pages/[tenant_id]/profile/index.vue`, y en `pages/[tenant_id].vue` (donde ademas monta el chatbox flotante de Yupi con `layout-type="AiChatbox"`, fuera del flujo normal de objeto/layout).

El Apollo Client que Suite pasa a `LayoutOrchestrator` es el mismo configurado en `plugins/apollo.client.ts`, ya con `X-Tenant-ID` y token Clerk, tal como exige el propio `LayoutOrchestrator` para multi-tenant.

### AiChatbox flotante: montaje fuera del flujo objeto/layout

El chatbox de Yupi se monta en `pages/[tenant_id].vue:152-158`, fuera del arbol de rutas `view_type` (sin `objectName` asociado), pasandole `:apollo-client="tenantApolloClient"` igual que cualquier otro layout. Para que el i18n lo reconozca como layout embebible sin objeto asociado, `'AiChatbox'` esta declarado dentro de `EMBEDDABLE_LAYOUT_TYPES` en `utils/i18nBridge.ts:61`.

---

## 7. Server layer (Nitro)

Suite corre su propio backend liviano (Nitro, integrado en Nuxt) para funciones que no ameritan pasar por el Object Manager:

- **SSE**: `server/api/notifications/stream.get.ts` mantiene la conexion abierta; `server/utils/sseClients.ts` registra los clientes conectados; `server/api/realtime/push.post.ts` (y `notifications/push.post.ts`) reciben eventos externos (ej. desde n8n) y los reenvian a los clientes SSE activos. El composable `useServerNotifications.ts` se conecta una vez por sesion de tenant, con reconexion exponencial (delays `3s / 10s / 30s`).
- **Auth**: `server/api/auth/` (logout, sync-user, token-info, validate-email) y `server/middleware/auth.ts` para el chequeo SSR.
- **i18n runtime**: `server/routes/locales/[...path].get.ts` sirve los archivos de locale.

Detalle de arquitectura SSE completo (incluyendo layout-refresh disparado por notificaciones): `features/realtime-sse.md`.

---

## 8. Stores y composables clave

| Archivo | Rol |
|---------|-----|
| `stores/uiContext.ts` | Estado del contexto visual (theme, objectName, viewType...), mapea 1:1 a las capas CSS de `@layer theme, objectName, viewType, objectId, contextId` (ver `core/style-guide.md`) |
| `stores/notifications.ts` | Estado de notificaciones recibidas por SSE |
| `composables/useConfig.ts` | Acceso reactivo a valores de configuracion de plataforma/mod/usuario via `getConfigs`; cachea a nivel de modulo; `invalidateConfig(key)` propaga cambios sin recargar (ver `features/config-system.md`) |
| `composables/useObjectManager.ts` | Cliente de acceso a datos del Object Manager desde Suite; delega todo renderizado a `LayoutOrchestrator` |
| `composables/useApolloClient.ts` | Fabrica del Apollo Client por tenant |

### Navegacion de una app: `homescreen` + `navTabs` + `navScoped` (RULE-suite-009)

La navegacion de una app de Suite se declara con la combinacion `homescreen` + `navTabs` + `navScoped`, resuelta en `composables/navTabs.ts:15-33` (que expone `export const DASHBOARDS_GROUP_KEY = '__dashboards__'`) y consumida en `composables/useObjectManager.ts:57-63` y `:645-655`.

`defaultObjects` no desaparecio: sigue en el codigo como **fallback legado** explicito, no como mecanismo reemplazado por completo. Documentarlo como conviven ambos, no como que uno sustituyo al otro.

---

## 9. Seguridad HTTP (CSP y headers)

SEC-06 (UPONE-1416) agrega politica de seguridad HTTP a Suite, en paralelo con SEC-05 en el Object Manager. Dos piezas:

- `config/securityHeaders.ts`: builders puros (sin imports de Nuxt/Nitro, para poder testearlos sin levantar servidor) que arman la CSP (`buildCspDirectives`), HSTS, `X-Content-Type-Options`, `X-Frame-Options`, y helpers para mergear origenes dependientes de runtime (`buildRuntimeCspOverrides`, `clerkFapiOrigin` decodifica el frontend API de Clerk desde la publishable key). Usa nonce + `strict-dynamic` en `script-src`, con un hash SHA-256 fijo del script inline anti-flash de tema (`THEME_SCRIPT_HASH`), y hosts explicitos para Clerk (Turnstile, `*.protect.clerk.com`, telemetry) y Flexmonster.
- `server/plugins/security.ts`: mitad runtime, escucha el hook `nuxt-security:routeRules` que emite `nuxt-security` en el boot, y ahi mergea los origenes que solo se conocen en runtime (endpoint GraphQL, Clerk FAPI) en `connect-src`/`script-src`. El toggle de entorno `SECURITY_CSP_REPORT_ONLY=true` renombra el header a `Content-Security-Policy-Report-Only` para rollout seguro sin bloquear trafico.

El detalle completo de la politica (directivas, rationale por origen, toggles de entorno) vive en `features/security-hardening.md` (no duplicar aca). Documentado tambien en `suite/docs/guides/setup.md`.

**Convencion**: un origen externo nuevo (CDN, servicio de terceros) se agrega siempre en `config/securityHeaders.ts`, nunca hardcodeado en un componente o pagina.

---

## 10. Actividad reciente

Commits relevantes desde 2026-05-16 (`git -C suite log`):

- **Migracion de i18n a arquitectura escalable** (fases 2 a 7): paso de un esquema de claves anterior a `i18next` + `i18next-vue`, con pipeline de publicacion (`publish-i18n.js`) que valida paridad y colisiones entre workspaces y mods
- **UPONE-1416 (SEC-06)**: headers de seguridad HTTP y CSP con nonce + `strict-dynamic` (ver seccion 9)
- **UPONE-1469**: invariante de sesion Clerk real vs cookie `__session`, `handleAuthFailure()` idempotente, loop-breaker de redirect login/app (ver seccion 5)
- **UPONE-1377**: sentinel de ruta `new` para creacion, i18n de `createdById`/`updatedById` (ver seccion 4)
- **UPONE-1376**: limpieza de paginas huerfanas de reportes legacy (ver seccion 4)
- **UPONE-1393**: ajustes de i18n comun en `es`/`en`/`pt`
- **UPONE-1264**: `vueform.config.ts` de Suite agrega locale `es` como default (antes solo registraba `en`). Nota de riesgo: Suite y Layout mantienen cada uno su propio `vueform.config.ts` (Vueform se configura por workspace, no hay una fuente unica); un locale u opcion agregada en uno no se propaga automaticamente al otro, hay que revisar ambos archivos (`suite/vueform.config.ts` y el equivalente en `layout/`).
- Fixes de modales multiselect, scroll y color de texto en dark mode

Detalle de la migracion de i18n: `mods/i18n.md`.

**`.ai/COMMANDMENTS.md`**: el repo de Suite documenta 12 reglas de una linea sobre ownership (routing/navegacion/auth es de Suite; el "como" es de Layout; el "que" es de Object Manager), uso obligatorio de `LayoutOrchestrator`, alcance de las paginas (RBAC + navegacion, nunca acceso directo a datos de negocio salvo operaciones core/platform), reglas de i18n (solo `{{var}}` + `key_one`/`key_other`, prohibido `$t` anidado y `ns:key`) y limites del sync. Es la fuente mas condensada de convenciones del workspace; consultarlo antes de escribir codigo nuevo en Suite.

---

## 11. Comandos de referencia

| Comando | Que hace |
|---------|----------|
| `npm run dev --workspace=@uplanner/suite` | Dev server (localhost:3000) |
| `npm run build --workspace=@uplanner/suite` | Build de produccion |
| `npm run preview --workspace=@uplanner/suite` | Preview del build |
| `npm run sync --workspace=@uplanner/suite` | Sincroniza estilos + publica i18n |

Evidencia: `suite/package.json`.

---

## 12. Documentacion relacionada (enlaces, no duplicar)

Este documento cubre arquitectura general. Para el detalle de cada feature, consultar:

| Tema | Documento |
|------|-----------|
| Sistema de configuracion (`useConfig`, `ConfigPanel`) | `features/config-system.md` |
| Notificaciones en tiempo real (SSE) | `features/realtime-sse.md` |
| Capa de i18n en mods (arquitectura, cascada, sync) | `mods/i18n.md` |
| Levantar y verificar el entorno local | `operations/local-environment.md` |
| Report Builder (integracion Flexmonster) | `features/report-builder.md` |
| Autenticacion Clerk paso a paso | `suite/docs/guides/authentication.md` |
| Arquitectura de layout consumida via LayoutOrchestrator | `core/layout-workspace.md` |
| Politica CSP y headers de seguridad HTTP (detalle completo) | `features/security-hardening.md` |

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: arquitectura actual de Suite (routing multi-tenant, Clerk, integracion con Layout, server layer SSE), basado en codigo fuente y docs internos |
| 2026-08-03 | Actualizacion verificada contra codigo: seguridad HTTP/CSP (UPONE-1416, seccion 9 nueva); invariante de sesion Clerk real vs cookie `__session`, `handleAuthFailure` idempotente y loop-breaker, distincion composable vs middleware (UPONE-1469, seccion 5); sentinel `new` en ruta de detalle (UPONE-1377, seccion 4); eliminacion de rutas `/{tenant_id}/reports*` (UPONE-1376, seccion 4); nota sobre `vueform.config.ts` separado por workspace (UPONE-1264, seccion 10); referencia a `.ai/COMMANDMENTS.md` (seccion 10) |
| 2026-08-17 | `breadcrumbParent` con corte de ciclos (seccion 4); `navigate-to-relation` sin `targetId` como caso valido (seccion 4); navegacion de apps via `homescreen`+`navTabs`+`navScoped` con `defaultObjects` como fallback legado, no reemplazado (UPONE-1513, seccion 8); cambio de rol server-authoritative sin aplicacion optimista (UPONE-1353, seccion 5); bypass de membresia server-to-server via `X-Internal-Service-Key` mas refresh de token Clerk en el middleware, como dos piezas separadas (UPONE-1575, seccion 5); AiChatbox flotante montado fuera del flujo objeto/layout, con `'AiChatbox'` en `EMBEDDABLE_LAYOUT_TYPES` (seccion 6) |
