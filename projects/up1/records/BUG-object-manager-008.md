---
id: BUG-object-manager-008
project: up1
type: bug
module: object-manager
tags:
  - unique-constraint
  - email
  - normalization
  - core_User
---

# core_User con email en distinta capitalización sorteaba el unique constraint

## Symptom

Se podía crear más de un `core_User` con el "mismo" email si difería solo en mayúsculas/minúsculas (ej. `User@x.com` y `user@x.com`), porque el unique constraint de base de datos es case-sensitive y el email no se normalizaba antes de persistir.

## Root cause

- **File**: `src/graphql/resolvers/instance.resolver.js` (bloque de normalización de email en `createInstance`, con `toLowerCase()`/`trim()` verificado).
- **Cause**: `createInstance` no normalizaba el email a lowercase+trim antes de persistir `core_User`, por lo que el unique constraint (case-sensitive a nivel BD) no detectaba duplicados con distinta capitalización.

## Fix

`createInstance` ahora normaliza el email a lowercase+trim antes de persistir y agrega un pre-check case-insensitive, reutilizando el mensaje canónico de unique constraint para producir el error amigable existente (pipeline `UNIQUE_VIOLATION`).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | administradores creando usuarios; usuarios con emails duplicados por casing |
| Data affected | tabla `core_User` |
| Modules affected | object-manager (creación de usuarios) |
| Frequency | cualquier alta de usuario con email cuya capitalización difiere de uno existente |
