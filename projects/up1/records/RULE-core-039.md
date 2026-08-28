---
id: RULE-core-039
project: up1
type: rule
module: core
tags:
  - security
  - jwt
  - auth
  - error-codes
---

# JWT expirado o inválido resuelve siempre a UNAUTHENTICATED

## What

Un JWT expirado o inválido MUST resolver al código de error GraphQL `UNAUTHENTICATED`, de forma consistente en todo el pipeline de auth (antes distintos puntos devolvían códigos distintos).

## Why

Sin un código uniforme, el frontend no puede distinguir de forma confiable "sesión expirada, hay que reautenticar" de otros errores, lo que en Suite dejaba sesiones expiradas cayendo a estado Guest con flood de reintentos 401 (ver bug relacionado en suite, UPONE-1469).

## Where

`src/services/auth/authChecker.js:101,265,388` (`extensions: { code: 'UNAUTHENTICATED' }`) y `src/services/auth/userExtractor.js:235` (comentario que documenta la distinción "expired session" vs "no token").

## When

Al tocar cualquier punto del pipeline de autenticación (`withAuth.js`, `authChecker.js`, `userExtractor.js`, `src/index.js`) que emite errores de auth. Verificar que el código de error se mantenga `UNAUTHENTICATED` para JWT expirado/inválido.
