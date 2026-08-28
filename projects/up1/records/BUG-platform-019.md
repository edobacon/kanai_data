---
id: BUG-platform-019
project: up1
type: bug
module: platform
tags:
  - prisma
  - migrate-dev
  - db-push
  - force-reset
  - accept-data-loss
  - AI-safety
  - PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION
  - env-var
  - reset-tenant
---

# Prisma 5.x bloquea comandos destructivos desde entorno AI (requiere env var de consentimiento)

## Symptom

Al correr `prisma migrate dev`, `prisma db push --force-reset` o `prisma db push --accept-data-loss` desde un entorno donde Prisma detecta ejecución de AI (variable de entorno `ANTHROPIC_API_KEY` u otras indicativas), el comando falla con un error que pide la variable `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` antes de continuar.

## Expected behavior

El comando corre sin requerir variables de consentimiento adicionales (comportamiento esperado fuera de entorno AI).

## Root cause

Prisma 5.x introdujo una restricción de seguridad: cuando detecta un entorno de AI (ej. presencia de `ANTHROPIC_API_KEY` en el environment), bloquea los comandos destructivos y exige que el desarrollador establezca `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` con el texto literal de consentimiento (sin newlines ni comillas). La variable debe ser pasada al proceso como env var, no como flag. Documentado en TICKET-030 L8 y confirmado en S3 del mismo ticket al intentar el reset de BD UPU local. También tiene impacto cruzado con TICKET-028 L9: si se cambió un enum JSON sin regenerar las migraciones históricas, cada `setup:reset` falla en UPU por una migración legacy con el enum en casing antiguo (ej. `CurricularSectionOwnerType` lowercase en migración `20260519153148`, PascalCase en schema actual); el workaround es `db push` en vez de `migrate dev`.

## Impact

Cualquier pipeline de reset/migración destructiva (reset-tenant, force-reset, accept-data-loss) falla en sessions de desarrollo asistidas por LLM. Bloquea la ejecución sin mensaje claro a menos que se conozca la variable.

## Reproduction

1. Tener `ANTHROPIC_API_KEY` en el entorno. 2. Correr `npx prisma db push --force-reset` o `npx prisma migrate dev --name <name>` contra cualquier tenant. 3. El comando sale con error solicitando `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`.

## Workaround

Exportar la variable antes del comando destructivo: `export PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION='I UNDERSTAND THAT THIS ACTION WILL DELETE ALL DATA IN MY DATABASE'` (texto exacto, sin comillas internas ni newlines). Para `setup:reset` con drift de migraciones legacy, usar `db push` directo en lugar de `migrate dev` (workaround canónico documentado en TICKET-030 B7/S3). En `reset-tenant` interactivo, el guard AI de Prisma se destraba pasando la variable al subprocess.

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-030
