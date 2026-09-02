---
id: RULE-GEN-005
project: pehuen
type: rule
module: general
level: must
tags:
  - migration
  - constantes
  - mongodb
  - magic-ids
---

# IDs hardcoded de MongoDB solo en `shared/constants/mongodb-ids.ts`

## What

Cualquier ObjectId de MongoDB que esté hardcoded en el código (IDs de documentos conocidos como "OTRA CANCHA", EstadoRuma activa, etc.) debe definirse exclusivamente en `shared/constants/mongodb-ids.ts`. Está prohibido escribir un ID hexadecimal literal (`'60e90cf10351b55538c40e46'`) en cualquier otro archivo.

## Why

El legacy tiene IDs literales en múltiples controllers (ej. `'60dfe7c9ba0ccfd21a8e04f3'` y `'60e90cf10351b55538c40e46'` en dos lugares). Si el ID cambia (por migración a otro entorno, restore de backup, etc.), hay que buscarlo manualmente en todo el código. Con una constante centralizada, el cambio es en un solo lugar.

## Where

- **Files**: `shared/constants/mongodb-ids.ts` (única fuente), todos los archivos que necesiten estos IDs importan desde aquí
- **Layers**: frontend, backend, shared

## When

Siempre que se necesite un ID hardcoded. Si se descubre un nuevo ID hardcoded en revisión de código, debe extraerse antes de mergear.

## Verification

- `grep -rn "'60[a-f0-9]\{22\}'\|\"60[a-f0-9]\{22\}\"" server/ app/` → 0 matches fuera de `shared/constants/mongodb-ids.ts`.
- `grep -rn "60e90cf10351b55538c40e46\|60dfe7c9ba0ccfd21a8e04f3" server/ app/ shared/schemas/` → 0 matches.
- `cat shared/constants/mongodb-ids.ts` → debe contener `OTRA_CANCHA_ID`, `ESTADO_RUMA_ACTIVO_ID` (verificar nombres exactos).

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen_nuxt/docs/07-migration-notes/improvements.md` sección 3.8: "Constantes formales en `shared/constants/`". Criterio de aceptación: "`grep '60dfe7c9\|60e90cf1'` en server/ y app/ = 0 matches". `config.yaml` critical_rules.
- **Related**: RULE-GUIA-004
