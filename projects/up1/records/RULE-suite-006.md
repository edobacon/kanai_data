---
id: RULE-suite-006
project: up1
type: rule
module: suite
tags:
  - security
  - csp
  - security-headers
---

# CSP: agregar un nuevo origen externo siempre en `config/securityHeaders.ts`, nunca hardcodear en un componente

## What

Cualquier origen externo nuevo que la app necesite permitir (endpoint GraphQL, Clerk FAPI, un tercero) se declara en `config/securityHeaders.ts` (funciones `buildCspDirectives` y `buildRuntimeCspOverrides`). No se agrega un origen suelto en un componente, plugin ad hoc, o meta tag manual.

## Why

UPONE-1416 (SEC-06) introdujo `config/securityHeaders.ts` como fuente única de la Content-Security-Policy (con nonce + `strict-dynamic`), consumida por `nuxt.config.ts` (build-time) y por `server/plugins/security.ts` (runtime, vía el hook `nuxt-security:routeRules`) para inyectar orígenes que solo se conocen en runtime (el endpoint GraphQL, el FAPI de Clerk derivado de la publishable key). Si un origen se hardcodea en otro lugar, queda fuera de este mecanismo: puede duplicar la directiva, quedar desalineado con el toggle `SECURITY_CSP_REPORT_ONLY`, o directamente no aplicarse porque el header ya fue emitido por otra vía.

## Where

- **Files**: `config/securityHeaders.ts:buildCspDirectives`, `config/securityHeaders.ts:buildRuntimeCspOverrides`, `config/securityHeaders.ts:clerkFapiOrigin`, `server/plugins/security.ts`, `nuxt.config.ts` (bloque `security.headers`)
- **Docs**: `docs/guides/setup.md`

## When

Aplica cada vez que se integra un servicio externo nuevo (API, widget embebido, script de terceros) que requiera whitelisting en `connect-src`, `script-src`, `frame-src`, etc. Antes de hardcodear una URL en un componente o plugin, verificar si ya existe una entrada equivalente en `securityHeaders.ts` y extenderla ahí.

## Source

- **Discovered in**: recon suite (delta 2026-07-13 → 2026-08-03), UPONE-1416.
- **Evidence**: `config/securityHeaders.ts:10` documenta explícitamente que `server/plugins/security.ts` inyecta overrides runtime vía `buildRuntimeCspOverrides()`; `clerkFapiOrigin` (línea 113) decodifica el FAPI desde la publishable key en vez de hardcodearlo.
