---
id: RULE-core-038
project: up1
type: rule
module: core
tags:
  - security
  - timing-attack
  - tokens
  - secrets
---

# Comparación de tokens/secrets debe usar crypto.timingSafeEqual, nunca `===`

## What

Toda comparación de un token o secreto recibido contra el valor esperado MUST usar `crypto.timingSafeEqual`, nunca el operador `===`.

## Why

`===` en strings hace comparación byte a byte con short-circuit en la primera diferencia, lo que filtra el token vía el tiempo de respuesta (timing attack). `timingSafeEqual` compara en tiempo constante. Aplicado en UPONE-1418 al token de Storybook.

## Where

`src/services/auth/userExtractor.js:8` (`import { createHash, timingSafeEqual } from 'crypto'`) y `src/services/auth/userExtractor.js:51` (uso de `timingSafeEqual(bufA, bufB)`).

## When

Al implementar o revisar cualquier verificación de token/secreto estático (API keys, tokens de servicio, headers de autenticación bespoke). No aplica a comparación de contraseñas hasheadas (usan su propio esquema de verificación).
