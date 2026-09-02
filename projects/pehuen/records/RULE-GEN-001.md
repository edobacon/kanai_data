---
id: RULE-GEN-001
project: pehuen
type: rule
module: general
level: must
tags:
  - migration
  - arquitectura
  - validacion
  - zod
---

# Schemas Zod compartidos en `shared/schemas/` — no duplicar entre cliente y servidor

## What

Toda definición de schema de validación Zod que se use tanto en el frontend (`app/`) como en el backend (`server/`) debe residir en `shared/schemas/`. Está prohibido definir el mismo schema dos veces (una en `app/` y otra en `server/`). El servidor puede extender el schema compartido con campos adicionales de server-side (ej. `createdBy`), pero la base común es siempre la de `shared/`.

## Why

En el legacy, los DTOs de server (`class-validator`) y las validaciones de componentes Vue divergían, causando bugs donde el frontend aceptaba valores que el backend rechazaba (o viceversa). Con un schema compartido, cualquier cambio de validación se propaga automáticamente a ambas capas. Mejora crítica documentada.

## Where

- **Files**: `shared/schemas/*.ts` (fuente de verdad), `server/api/**/*.ts` (importan de `shared/schemas/`), `app/pages/**/*.vue` y `app/composables/**/*.ts` (idem)
- **Layers**: frontend, backend, shared

## When

Siempre que se defina o modifique una validación de input para un endpoint que también tiene un formulario en el frontend.

## Verification

- `grep -rn "z\.object\|z\.string\|z\.number" server/api/ app/pages/ app/composables/` → todos los schemas Zod deben importar desde `shared/schemas/`.
- `grep -rn "from.*shared/schemas" server/api/` → debe aparecer en cada handler con validación.
- Test: modificar un campo en `shared/schemas/guia.schema.ts` → los tests tanto de frontend como de backend fallan si el cambio es breaking.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen_nuxt/docs/07-migration-notes/improvements.md` sección 3.1 MEJORA-CRITICA. `pehuen_nuxt/CLAUDE.md` stack: `validation: zod`. `config.yaml` critical_rules: "Schemas Zod compartidos en shared/schemas/ — no duplicar entre client/server".
- **Related**: DEC-003, RULE-GEN-004
