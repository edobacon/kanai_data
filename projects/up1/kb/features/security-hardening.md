---
id: FEAT-general-security-hardening
project: up1
type: feature
module: general
category: security
tags: [up1, seguridad, graphql, csp, helmet, jwt, logging, auditoria, rbac]
fecha: 2026-08-03
ticket: [UPONE-1412, UPONE-1415, UPONE-1416, UPONE-1417, UPONE-1418, UPONE-1423, UPONE-1469]
sources:
  - object-manager/src/index.js
  - object-manager/src/middleware/securityHeaders.js
  - object-manager/src/utils/queryComplexityGuard.js
  - object-manager/src/services/auth/userExtractor.js
  - object-manager/src/services/auth/authChecker.js
  - object-manager/src/services/auth/withAuth.js
  - object-manager/src/observability/logger.js
  - object-manager/src/services/auditService.js
  - object-manager/src/graphql/resolvers/up1/coreConfig.resolver.js
  - suite/config/securityHeaders.ts
  - suite/server/plugins/security.ts
  - suite/logic/app.resolver.js
---

# Hardening de seguridad de plataforma (epica SEC-*)

Consolida el trabajo de endurecimiento de seguridad realizado bajo la epica `SEC-*` (tickets UPONE-1412 a UPONE-1469), disperso hasta ahora en varios `docs/features/*.md` puntuales de cada workspace. Este doc verifica cada afirmacion contra el codigo real de `object-manager` y `suite`, no contra los recon/tickets.

Para el sistema de roles y capacidades (RBAC) en si, ver `features/rbac.md` — este doc solo cubre el gate de **autenticacion** (SEC-02) y la auditoria de accesos denegados, sin duplicar el modelo de capabilities.

## Indice

1. [Limites de profundidad y complejidad GraphQL](#1-limites-de-profundidad-y-complejidad-graphql)
2. [Cabeceras HTTP de seguridad (Helmet) en object-manager](#2-cabeceras-http-de-seguridad-helmet-en-object-manager)
3. [CSP en Suite via nuxt-security](#3-csp-en-suite-via-nuxt-security)
4. [Comparacion de tokens en tiempo constante](#4-comparacion-de-tokens-en-tiempo-constante)
5. [JWT expirado o invalido resuelve a UNAUTHENTICATED](#5-jwt-expirado-o-invalido-resuelve-a-unauthenticated)
6. [Logger estructurado (observability)](#6-logger-estructurado-observability)
7. [Auditoria de cambios de config sensible y accesos denegados](#7-auditoria-de-cambios-de-config-sensible-y-accesos-denegados)
8. [requireAuth: autenticacion vs capability en resolvers de lectura](#8-requireauth-autenticacion-vs-capability-en-resolvers-de-lectura)
9. [Tabla de variables de entorno](#9-tabla-de-variables-de-entorno)

## 1. Limites de profundidad y complejidad GraphQL

UPONE-1424 (SEC-15). Dos guardas independientes, montadas ambas en `object-manager/src/index.js`:

- **Profundidad**: `depthLimit(GRAPHQL_MAX_DEPTH)` de la libreria `graphql-depth-limit`, pasado como `validationRules` del `ApolloServer`. Default `10` si `GRAPHQL_MAX_DEPTH` no esta seteada.
  - `source_ref`: `object-manager/src/index.js:96` (calculo del limite), `:106` (`validationRules: [depthLimit(GRAPHQL_MAX_DEPTH)]`).
- **Complejidad**: guard propio via recorrido de AST (`createComplexityGuardPlugin`), registrado como plugin de Apollo. Suma un costo por campo, multiplicado por el tamano declarado de listas (`first`/`limit`/`last`/`take`, literal o variable, tope `maxListMultiplier=100`), e inlinea fragmentos nombrados (incluyendo proteccion contra spreads ciclicos) para que un ataque escondido en un fragmento no evada el conteo. Default `1000` si `GRAPHQL_MAX_COMPLEXITY` no esta seteada. Si se excede, lanza `GraphQLError` con `extensions.code = 'QUERY_TOO_COMPLEX'`.
  - `source_ref`: `object-manager/src/utils/queryComplexityGuard.js` (`createComplexityGuardPlugin`, `walk`, `multiplierFromArgs`), `object-manager/src/index.js:97` (calculo), `:110` (`createComplexityGuardPlugin({ maxComplexity: GRAPHQL_MAX_COMPLEXITY })`).

**Por que un guard propio y no `graphql-query-complexity`**: la libreria de terceros `graphql-query-complexity` fue evaluada y descartada por incompatibilidad de modulos (mismatch ESM/CJS) contra `graphql` v16 y `@apollo/server` v5. La decision quedo documentada en el commit de UPONE-1424; el follow-up de retomar la libreria (si en algun momento resuelve la incompatibilidad) quedo diferido, sin ticket abierto a la fecha de este doc.

Ambos limites son puramente de validacion (rechazan antes de tocar la base de datos) y aplican a **toda** query GraphQL, sin distincion de rol o capability.

## 2. Cabeceras HTTP de seguridad (Helmet) en object-manager

UPONE-1415 (SEC-05). Reemplaza el middleware manual anterior (que solo emitia 4 cabeceras: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`) por **Helmet 8** con `useDefaults: false` (configuracion 100% explicita, sin defaults ocultos). Montado en `src/index.js` como primer middleware de la app, antes de CORS y de cualquier ruta, para cubrir toda respuesta (incluidos errores, OPTIONS y 404).

- `source_ref`: `object-manager/src/middleware/securityHeaders.js` (`createSecurityHeadersOptions`, `createSecurityHeadersMiddleware`), montaje en `object-manager/src/index.js:47` (`app.use(createSecurityHeadersMiddleware({ isProduction: IS_PRODUCTION }))`).

La politica se bifurca unicamente por `NODE_ENV === 'production'`:

| Cabecera | Produccion | Desarrollo |
|---|---|---|
| Content-Security-Policy | `default-src 'none'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'none'` (API JSON pura, sin HTML servido) | Relajada solo para que renderice el landing/sandbox de Apollo en `/graphql`: `default-src 'self'`, `script-src`/`style-src` con `'unsafe-inline'` + CDNs de Apollo listados explicitamente (sin comodines amplios) |
| Strict-Transport-Security | `max-age=31536000`, sin `includeSubDomains` ni `preload` | Desactivado (`false`) — sobre HTTP plano el navegador lo ignora, pero emitirlo podria pinnear HTTPS en el navegador del developer |
| Cross-Origin-Embedder-Policy | `require-corp` | `credentialless` (con excepcion puntual, ver abajo) |
| Cross-Origin-Opener-Policy | `same-origin` | `same-origin` |
| Cross-Origin-Resource-Policy | `same-origin` | `same-origin` |
| X-Frame-Options | `DENY` | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` | `strict-origin-when-cross-origin` |
| X-XSS-Protection | `0` (defaults de helmet; cambio intencional vs el `1; mode=block` previo — los filtros XSS heredados del navegador son obsoletos y pueden abrir vulnerabilidades, la proteccion real la da la CSP) | `0` |
| X-Content-Type-Options | `nosniff` (default de helmet) | `nosniff` |
| X-Powered-By | Eliminado (default de helmet) | Eliminado |

**Excepcion acotada a desarrollo**: el landing/sandbox de Apollo embebe un iframe cross-origin (`sandbox.embed.apollographql.com`) que no envia `COEP`/`CORP`. Un COEP estricto lo bloquea con `ERR_BLOCKED_BY_RESPONSE`. La solucion es relajar `Cross-Origin-Embedder-Policy` a `unsafe-none` **solo** en la respuesta GET `/graphql` con `Accept: text/html` en desarrollo; el resto de respuestas de dev mantienen `credentialless`. `unsafe-none` nunca se emite en produccion (ahi no existe esa ruta HTML).

- `source_ref`: `object-manager/src/middleware/securityHeaders.js` (`createSecurityHeadersMiddleware`, bloque `if (isProduction) return helmetMiddleware; ...`).

## 3. CSP en Suite via nuxt-security

UPONE-1416 (SEC-06), gemelo de SEC-05 pero para el frontend. Suite usa el modulo `nuxt-security` en vez de Helmet (no hay Express en Nuxt/Nitro). Dos piezas:

- **`suite/config/securityHeaders.ts`**: builders puros sin imports de Nuxt/Nitro (mismo patron que `object-manager/src/middleware/securityHeaders.js`, testeables sin levantar servidor). `buildCspDirectives({ isDev })` arma la CSP base; `buildSecurityHeaders({ isDev })` arma el resto de cabeceras (HSTS solo prod, `X-Frame-Options: DENY`, `X-XSS-Protection: '0'`, Permissions-Policy, etc., con paridad explicita respecto a SEC-05).
- **`suite/server/plugins/security.ts`**: mitad runtime. `nuxt-security` arma su configuracion de seguridad una sola vez al boot (singleton) y emite el hook `nuxt-security:routeRules`; este plugin escucha ese hook (no lo reemite) para inyectar origenes que solo se conocen en runtime: el endpoint GraphQL (`runtimeConfig.public.graphqlEndpoint`) y el dominio Clerk FAPI, decodificado desde la publishable key (`clerkFapiOrigin`, que decodifica el base64 embebido en `pk_test_`/`pk_live_`).

Particularidades de la CSP de Suite (a diferencia de la de object-manager, que es `default-src 'none'` porque no sirve HTML de negocio):

- **Nonce + `strict-dynamic`** en `script-src`: `"'self'", "'nonce-{{nonce}}'", "'strict-dynamic'"` mas un hash SHA-256 fijo del script inline anti-flash de tema (`THEME_SCRIPT_HASH`, cubierto por un test unitario que lo recalcula del archivo — si el script inline cambia, el test falla y hay que regenerar el hash).
- **`crossOriginEmbedderPolicy: 'unsafe-none'` en todo entorno** (no solo dev, divergencia deliberada respecto a SEC-05): Suite embebe recursos cross-origin que no envian CORP (Google Fonts, CDN de Flexmonster, Gravatar), que un COEP estricto bloquearia.
- **Toggle `SECURITY_CSP_REPORT_ONLY`**: si es `'true'`, un hook `beforeResponse` renombra `Content-Security-Policy` a `Content-Security-Policy-Report-Only` (`moveCspToReportOnly`) para poder desplegar una CSP nueva en modo "solo reporta" antes de bloquear. Pensado para rollout seguro, no para dejarlo activo de forma permanente.
- `source_ref`: `suite/config/securityHeaders.ts` (`buildCspDirectives`, `buildSecurityHeaders`, `clerkFapiOrigin`, `graphqlOrigin`, `buildRuntimeCspOverrides`, `moveCspToReportOnly`), `suite/server/plugins/security.ts` (hook `nuxt-security:routeRules`, hook `beforeResponse`).

## 4. Comparacion de tokens en tiempo constante

UPONE-1418 (SEC — sin numero SEC-* explicito en el codigo, referenciado como parte del bloque). El token estatico de Storybook (`STORYBOOK_STATIC_TOKEN`, nunca activo en produccion) se compara contra el bearer token entrante con `crypto.timingSafeEqual`, no con `===`. Motivo: `===` hace short-circuit en el primer byte que difiere, lo que permite inferir el token por timing; `timingSafeEqual` compara todos los bytes en tiempo constante.

`timingSafeEqual` lanza si los buffers tienen longitudes distintas, por eso `timingSafeStringEqual` primero valida que ambos argumentos sean strings y compara longitudes antes de invocarlo; una longitud distinta (o un input no-string) retorna `false` en vez de excepcion.

- `source_ref`: `object-manager/src/services/auth/userExtractor.js:8` (import `timingSafeEqual` de `crypto`), `:41-52` (`timingSafeStringEqual`), `:155` (uso: `if (STORYBOOK_STATIC_TOKEN && timingSafeStringEqual(bearerToken, STORYBOOK_STATIC_TOKEN))`).
- El mismo patron se documenta como reutilizado en `helpers/algorithmCallback/callbackToken.js` (comentario en el propio archivo), fuera del alcance verificado en este doc.

## 5. JWT expirado o invalido resuelve a UNAUTHENTICATED

UPONE-1469 (en object-manager; en suite el mismo numero de ticket cubre ademas el bug de sesion "Guest" del lado cliente, ver nota mas abajo). Antes de este fix, un token Clerk expirado o invalido en la extraccion de usuario producia un error generico que en algunos casos escalaba a `INTERNAL_SERVER_ERROR` en vez de `UNAUTHENTICATED`, impidiendo que el frontend distinguiera "sesion vencida" de "error de servidor".

Flujo actual:

1. `verifyClerkToken` (via `@clerk/backend`) falla → se captura y se relanza como el sentinela `Error('AUTH_TOKEN_INVALID')`, con un log de `warn` (no error: un token rechazado no es una falla del servidor).
2. En `src/index.js`, el catch del context builder mapea `AUTH_TOKEN_INVALID` (y tambien `SERVICE_ACCOUNT_INVALID`, `SERVICE_ACCOUNT_EXPIRED`, `USER_NOT_FOUND`, `USER_INACTIVE`) a un `GraphQLError` con `extensions.code: 'UNAUTHENTICATED'`, cada uno con mensaje especifico.
3. `authChecker.js` y `withAuth.js` usan el mismo codigo `UNAUTHENTICATED` en sus propios puntos de rechazo (usuario ausente en `checkCapability`/`checkObjectPermissions`/`checkFieldPermissions`/`assertAuthenticated`), manteniendo un contrato de error unico para todo el backend.

- `source_ref`: `object-manager/src/services/auth/userExtractor.js:236-242` (captura de `verifyClerkToken` y relanzamiento como `AUTH_TOKEN_INVALID`), `object-manager/src/index.js:414-449` (mapeo de sentinelas a `UNAUTHENTICATED`), `object-manager/src/services/auth/authChecker.js:101,265,388` y `withAuth.js:119` (mismo codigo en los demas gates).

**Nota de alcance — lado Suite**: el ticket UPONE-1469 en `suite` no es este mismo fix backend, sino un bug relacionado pero distinto: el cliente decidia el estado de autenticacion leyendo la cookie `__session` (que persiste tras expirar) en vez de la sesion real de Clerk (`useUp1Auth().isAuthenticated` ahora prioriza `_clerkAuth.isSignedIn` cuando Clerk esta cargado). Ese fix vive en `composables/useAuth.ts` (`handleAuthFailure`), `middleware/auth.global.ts`/`guest.ts` y `plugins/apollo.client.ts` — es logica de sesion de cliente, no forma parte del hardening de servidor cubierto por este doc; se referencia aqui solo para no confundir el numero de ticket. Su doc evergreen destino es `core/suite-workspace.md` (fuera de esta epica SEC-*).

## 6. Logger estructurado (observability)

UPONE-1423 (SEC-14). Antes de este cambio, object-manager solo tenia `console.log`/`console.error` sueltos para eventos operacionales/de seguridad, sin estructura ni redaccion de secretos. `src/observability/logger.js` introduce un logger `pino` dedicado a **eventos operacionales y de seguridad en runtime** (fallos de auth, denegaciones RBAC, mutaciones sensibles, errores de servidor) — explicitamente distinto de:
- `src/utils/logger.js`: logger de scripts CLI (modo verbose + archivos en `.logs/`, para setup/sync).
- `recordAuditEvent` / `auditService.js`: el rastro de auditoria de negocio/compliance en base de datos (ver seccion 7).

Caracteristicas:

- Nivel por entorno: `info` en produccion, `debug` en desarrollo, `silent` en test (mantiene limpia la salida de la suite); siempre sobreescribible via `LOG_LEVEL`.
- `base: { service: 'object-manager', env }` en cada linea.
- **Redaccion de secretos** (`redact.paths`, censor `'[REDACTED]'`): cubre `authorization`, `headers.authorization`, `req.headers.authorization`, `token`, `bearer`, `password`, `secret`, `secretHash`, `clerkSecretKey`, `NUXT_CLERK_SECRET_KEY`, `STORYBOOK_STATIC_TOKEN` y sus variantes con wildcard de profundidad (`*.token`, `*.password`, etc.) — exportado como `LOG_REDACT_PATHS` para que los tests aserten la configuracion real, no una copia.
- En desarrollo usa `pino-pretty` (legible, coloreado); en produccion y test emite JSON crudo (produccion para que CloudWatch Logs lo indexe via el driver `awslogs` del task ECS; test para evitar que el transporte por worker-thread de `pino-pretty` deje handles abiertos en Vitest).
- `createRequestLogger(fields)` crea un child logger con campos de correlacion (`tenantId`, `userId`, `operationName`, `requestId`) enlazados una vez por request, para poder filtrar todas las lineas de una misma request en CloudWatch Logs Insights. Se instancia por request en `src/index.js` (`reqLogger`) y se usa, por ejemplo, para registrar `auth.fail` con la razon del fallo (sin loguear el token).

- `source_ref`: `object-manager/src/observability/logger.js` (`LOG_REDACT_PATHS`, `baseLoggerOptions`, `logger`, `createRequestLogger`), uso en `object-manager/src/index.js:399-406,422` (`reqLogger`, evento `auth.fail`).

## 7. Auditoria de cambios de config sensible y accesos denegados

UPONE-1417. Usa el mecanismo de auditoria ya existente `logSchemaChange` (`auditService.js`) — no crea un sistema nuevo — para dos casos:

- **Accesos denegados** (`CHANGE_TYPES.UNAUTHENTICATED_ACCESS`, `CHANGE_TYPES.UNAUTHORIZED_ACCESS`): `checkCapability`, `checkObjectPermissions` y `checkFieldPermissions` en `authChecker.js` llaman a `logSchemaChange` cuando deniegan una request (sin usuario autenticado, o con usuario autenticado pero sin la capability requerida), registrando `requiredCaps`/`objectType`/`action`/`contextPath`/`selectedRole` segun el caso. El logging va en un `try/catch` propio para que un fallo al auditar nunca enmascare el error de autorizacion real (el catch solo hace `console.error`).
- **Cambios de configuracion sensible** (`CHANGE_TYPES.CONFIG_CHANGE`): `coreConfig.resolver.js` audita cada override de `core_Config` (personal o de administrador) con `logSchemaChange`, incluyendo `definitionId`, `key`, `targetUserId` y el nuevo valor. El comentario en el propio codigo aclara que `logSchemaChange` "swallows" sus propios errores, por lo que un fallo de auditoria nunca bloquea el guardado de la config.

Todas estas llamadas pasan `context` a `checkFieldPermissions` (antes no se pasaba), lo que permite que la entrada de auditoria caiga en la base de datos del tenant correcto con IP del actor.

- `source_ref`: `object-manager/src/services/auth/authChecker.js:83-99` (auditoria de `UNAUTHENTICATED_ACCESS` en `checkCapability`), `:170-185` (auditoria de `UNAUTHORIZED_ACCESS` en `checkCapability`), `:296-308` (idem en `checkObjectPermissions`), `:357-372` (idem en `checkFieldPermissions`, condicionado a que se pase `context`); `object-manager/src/graphql/resolvers/up1/coreConfig.resolver.js:227-238` (`logSchemaChange` con `CHANGE_TYPES.CONFIG_CHANGE`); `object-manager/src/services/auditService.js:12-53` (definicion de `CHANGE_TYPES`, incluye `CONFIG_CHANGE`, `UNAUTHENTICATED_ACCESS`, `UNAUTHORIZED_ACCESS`).

## 8. requireAuth: autenticacion vs capability en resolvers de lectura

UPONE-1412 (SEC-02). Distingue dos gates independientes en `withAuth.js`:

- **`requireAuth(resolver)`** (y su base `assertAuthenticated(context)`): exige **solo** que exista un principal autenticado (`context.user`), sin exigir ninguna capability especifica. Pensado para los "boot reads" que alimentan la navegacion de Suite para **cualquier** rol (layouts, apps, configs) — gatearlos con una capability puntual dejaria afuera a roles que legitimamente no la tienen. El filtrado real por rol/campo lo sigue haciendo cada resolver aparte.
- **`withAuth(requiredCaps, resolver)` / `requireCapability` / `withObjectAuth`**: exigen ademas una o mas capabilities concretas (RBAC completo, ver `features/rbac.md`).

Aplicaciones concretas de `requireAuth` verificadas en codigo:

- **`getAppsFiltered`** (boot read que alimenta la navegacion de Suite): antes no tenia ningun gate de autenticacion. Ahora envuelto en `requireAuth(...)`. Este resolver vive fisicamente en `suite/logic/app.resolver.js` pero se sincroniza al backend (comentario del propio archivo lo confirma) — su contrato es de object-manager, no del frontend Nuxt.
- **`reportTemplateQuery`** (todas las queries de plantillas de reporte, incluyendo lectura): cada resolver del objeto se envuelve con `requireAuth` via `Object.fromEntries(Object.entries(reportTemplateQueryRaw).map(([name, resolver]) => [name, requireAuth(resolver)]))` — las mutaciones de este mismo objeto mantienen sus propios checks de capability aparte (comentario en el archivo).

- `source_ref`: `object-manager/src/services/auth/withAuth.js:104-135` (`assertAuthenticated`, `requireAuth`); `suite/logic/app.resolver.js:16,32` (`import { requireAuth }`, `getAppsFiltered: requireAuth(...)`); `object-manager/src/graphql/resolvers/up1/report-builder/reportTemplate.resolver.js:15,213-215` (`requireAuth` aplicado a `reportTemplateQueryRaw`).

Ver `features/rbac.md` para el modelo completo de capabilities (object-level, field-level, RecordType, fallback field→object) que corre **despues** de este gate de autenticacion.

## 9. Tabla de variables de entorno

| Variable | Default | Efecto | Workspace |
|---|---|---|---|
| `GRAPHQL_MAX_DEPTH` | `10` | Profundidad maxima permitida de una query GraphQL antes de rechazarla en validacion | object-manager |
| `GRAPHQL_MAX_COMPLEXITY` | `1000` | Costo maximo acumulado (campos x multiplicador de listas) antes de rechazar la query con `QUERY_TOO_COMPLEX` | object-manager |
| `NODE_ENV` | — | Bifurca la politica de Helmet/CSP (produccion estricta vs desarrollo relajado para el sandbox de Apollo); tambien determina `IS_PRODUCTION` que gatea CSRF prevention e introspection de Apollo | object-manager |
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) / `silent` (test) | Nivel minimo del logger `pino`; sobreescribe el default por entorno | object-manager |
| `STORYBOOK_STATIC_TOKEN` | `null` en produccion (siempre) | Token estatico de servicio para Storybook, comparado con `timingSafeEqual`; nunca activo en produccion | object-manager |
| `RBAC_TEST_MODE` | `false` (deshabilitado) | Si es `'true'` y `NODE_ENV !== 'production'`, simula un usuario de prueba fijo para testing de RBAC; nunca activo en produccion | object-manager |
| `SECURITY_CSP_REPORT_ONLY` | deshabilitado | Si es `'true'`, renombra `Content-Security-Policy` a `Content-Security-Policy-Report-Only` (rollout seguro, no bloquea, solo reporta en consola del navegador) | suite |
| `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | — | Fuente del dominio Clerk FAPI decodificado e inyectado en `connect-src`/`script-src` de la CSP en runtime | suite |

**Nota sobre defaults documentados como "seguros por diseno"**: `STORYBOOK_STATIC_TOKEN` y `RBAC_TEST_MODE` estan codificados para ser inertes en produccion sin importar su valor (`IS_PRODUCTION` los anula), no solo por convencion de despliegue — ver `object-manager/src/services/auth/userExtractor.js:19-22`.
