---
id: RULE-mods-047
project: up1
type: rule
module: mods
tags:
  - seed
  - sync
  - mod
  - object-manager
  - data
  - prisma
  - curriculum
  - idempotente
---

# Seed de datos del mod va en mods/<mod>/seed/, no en object-manager/prisma/{tenant}/seed.js

## What

El seed de datos de objetos de un mod (filas de negocio) va en `mods/<mod>/seed/` con entrypoint `seed.js` y loaders `_data-*.js`. Corre durante `npm run sync` (Fase sync:db), aplica como upsert idempotente y es tenant-scoped (DECISION-012). El archivo `object-manager/prisma/{tenant}/seed.js` sirve únicamente para registrar el TIPO de objeto (junto a Career/Course/Person), NO para sembrar filas del mod. Confundirlos infla el scope a core/object-manager innecesariamente.

## Why

El seed del mod es autocontenido (fuente de verdad en el repo del mod) y corre en cada sync. El seed de Prisma pertenece a la plataforma y solo registra tipos. Editar el seed de Prisma para datos del mod es una violación de scope que mezcla capa de plataforma con datos del dominio del mod, requiere acceso a object-manager y complica el cycle de reseed.

## Where

- `mods/<mod>/seed/seed.js` (entrypoint; exporta la función de seed)
- `mods/<mod>/seed/_data-<entidad>.js` (loaders de datos; upsert idempotente)
- `object-manager/prisma/{tenant}/seed.js` (solo registro del tipo — ej. `{ name: 'Curriculum' }`, línea 30 de seed.js de UPU)
- `object-manager/src/sync/SyncManager.js` (Fase sync:db llama al seed del mod)
- Ejemplos: `mods/curriculum-design/seed/_data-curriculum.js`, `_data-academicprogram.js`

## When

Al crear datos iniciales (Plans, Programs, Workflows, etc.) para un objeto que el mod autorea:
- SIEMPRE en `mods/<mod>/seed/_data-<entidad>.js` + wirear en `seed.js`.
- Para re-sembrar tras un cambio estructural: `npm run sync` o `reset-mods` (upsert, no destructivo).
- Para un cambio estructural que requiere borrar/recrear (ej. reseed con nueva forma del objeto): `reset-tenant` (data-loss, requiere aprobación explícita del dev — ver MEMORY feedback_data_loss_requires_inmoment_confirmation).

## Verification

1. `ls mods/<mod>/seed/` → debe existir `seed.js` + al menos un `_data-*.js`.
2. `grep '<entidad>' mods/<mod>/seed/seed.js` → confirmar que el loader está wired (import + call).
3. `grep '<entidad>' object-manager/prisma/UPU/seed.js` → no deben aparecer filas de datos del mod (solo registro del tipo si aplica).
4. Correr `npm run sync` en dev y verificar en logs que `[<mod> seed] ✓ <entidad>` aparece en la fase sync:db.

## Source

- **Discovered in**: TICKET-068
