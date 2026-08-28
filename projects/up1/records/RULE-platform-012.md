---
id: RULE-platform-012
project: up1
type: rule
module: platform
tags:
  - codegen
  - prisma
  - db-push
  - sync
  - multi-tenant
  - drift
  - accept-data-loss
  - force-reset
  - entanglement
  - BASEMODEL
---

# Sync/codegen multi-tenant: db push por tenant, autorizar destructivos explícitamente, revertir schemas entangled antes de commit

## What

`npm run sync` regenera los schemas Prisma de TODOS los tenants via codegen; cada tenant exige `prisma db push` propio. Si hay drift preexistente (ej. unique constraints de HU anteriores, enum casing de migraciones antiguas), el push puede exigir `--accept-data-loss` (data-loss) o `--force-reset` (BASEMODEL con filas). Esto es DESTRUCTIVO e irreversible — nunca ejecutarlo sin autorización explícita del dev. Al correr codegen en un ticket, revertir los schemas de tenants entangled con cambios de OTROS tickets antes de commitear (solo commitear UPU/BASEMODEL limpios + el source del objeto + dynamic.js).

## Why

El `prisma db push` sin flags falla ante drift preexistente. El flag `--accept-data-loss` puede borrar datos reales. En autopilot super, ejecutar un destructivo sin consentimiento viola DET-13 (no evidencia fabricada) y la memoria `feedback_data_loss_requires_inmoment_confirmation`. El entanglement de schemas ocurre porque un `npm run sync` regenera TODOS los tenants: UCASMT/UCENG/UCPLN/TEST pueden tener drift de tickets previos (ej. TICKET-034 migró activity sin regenerar todos los tenants); commitear ese diff contamina el PR con cambios fuera de scope.

## Where

object-manager/ (todos los tenants bajo `prisma/`): UPU, BASEMODEL, UCASMT, UCENG, UCPLN, TEST, DEMO01-10 · `object-manager/scripts/setup-reset.js` (proceso canónico) · Detectado en TICKET-043 S2 (push exigió `--accept-data-loss` + `--force-reset` en BASEMODEL por drift de HU-0h) y TICKET-037 S1 (drift de TICKET-034/035 en UCASMT/UCENG/UCPLN/TEST).

## When

Antes de ejecutar `npm run sync` o `codegen`: (1) diagnosticar la causa del drift (no asumir que es del cambio actual), (2) obtener autorización explícita del dev por tenant si el push es destructivo, (3) after codegen: `git diff prisma/*/schema.prisma` por tenant — revertir los tenants cuyo diff NO pertenece al ticket actual. Regla operativa: `schema.prisma` es determinístico desde los JSON del registry — staleness = codegen no corrido para ese tenant.

## Verification

Post-codegen: `git diff prisma/UCASMT/schema.prisma` debe estar vacío si el ticket no toca objetos de ese tenant. Si hay diff, identificar el ticket que lo causa y revertir antes de commitear. Para `--accept-data-loss`: exigir confirmación del dev con el texto del consent (protocolo 2 momentos — memoria feedback_data_loss_requires_inmoment_confirmation).

## Source

- **Discovered in**: TICKET-043
