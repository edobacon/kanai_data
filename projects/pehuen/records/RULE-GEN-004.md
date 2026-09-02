---
id: RULE-GEN-004
project: pehuen
type: rule
module: general
level: must
tags:
  - migration
  - typescript
  - calidad
---

# TypeScript strict con `noUncheckedIndexedAccess: true`

## What

El proyecto usa TypeScript con `strict: true` y adicionalmente `noUncheckedIndexedAccess: true`. Esta última flag hace que el acceso a índices de arrays y propiedades de objetos con key dinámica retorne `T | undefined` en lugar de `T`. No se puede deshabilitar localmente con `@ts-ignore` salvo comentario justificativo.

## Why

`noUncheckedIndexedAccess` detecta en compile-time bugs como `array[0].field` cuando `array` puede estar vacío. En el legacy, varios bugs se originaron en accesos a índices sin verificación de existencia. El costo es verbosidad adicional (optional chaining, null checks), el beneficio es eliminar una clase entera de runtime errors.

## Where

- **Files**: `tsconfig.json` (flags `strict: true`, `noUncheckedIndexedAccess: true`)
- **Layers**: todo el proyecto

## When

Siempre. La validación ocurre en cada `npx nuxt typecheck` (pre-commit hook recomendado).

## Verification

- `cat tsconfig.json | grep -A5 "compilerOptions"` → debe mostrar `"strict": true` y `"noUncheckedIndexedAccess": true`.
- `npx nuxt typecheck` → PASS sin errores ni warnings.
- PR review: rechazar cualquier `as unknown as T` o `!` non-null assertion sin justificación documentada.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen_nuxt/docs/07-migration-notes/improvements.md` sección 3.2. `pehuen_nuxt/CLAUDE.md` TypeScript: "noUncheckedIndexedAccess: true". `config.yaml` critical_rules.
- **Related**: RULE-GEN-001
