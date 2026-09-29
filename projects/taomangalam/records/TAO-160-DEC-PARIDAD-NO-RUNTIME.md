---
id: TAO-160-DEC-PARIDAD-NO-RUNTIME
project: taomangalam
type: decision
module: EP-00
tags:
  - TAO-160
  - GH-13
  - env
  - paridad
  - schema-zod
---

Decision (HU-00-13 / TAO-160): la prueba de paridad entre `server/.env.example` y el schema `zod` del runtime es bidireccional, pero admite una ALLOWLIST explicita de variables NO-runtime declarada en `scripts/dev/env-parity.mjs` (`NON_RUNTIME_VARIABLES`), hoy solo `MIGRATION_DATABASE_URL`.

Motivo: `MIGRATION_DATABASE_URL` es legitima y necesaria (la usa `server/prisma.config.ts` para `pnpm db:migrate:*`), pero el runtime NUNCA la lee (no esta en `configSchema`). Sin la allowlist, la paridad bidireccional la marcaria como "variable del ejemplo ausente del schema" y fallaria. La allowlist exige nombre + motivo por variable, de modo que la excepcion queda justificada caso por caso y no relaja la paridad para el resto.

Regla: agregar una variable a `NON_RUNTIME_VARIABLES` exige declarar su motivo; cualquier variable del ejemplo fuera del schema y de la allowlist hace fallar la paridad (y el job de CI `dev-commands`).
