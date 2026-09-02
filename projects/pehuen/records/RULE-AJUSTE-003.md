---
id: RULE-AJUSTE-003
project: pehuen
type: rule
module: ajustes
level: should
tags:
  - delta-cuestionable
  - migration
  - roles
  - pendiente-decision
---

# Roles de ajuste: ADMIN-only en legacy; nuxt agrega RECEPTOR — DELTA-CUESTIONABLE pendiente DEC-001

## What

**Estado actual (legacy)**: todos los endpoints de ajuste (`POST /ajustes`, `POST /ajustes/load`, `DELETE /ajustes/batch/:batchId`) están restringidos a `[ADMINISTRADOR]` exclusivamente.

**Estado actual (nuxt)**: `AJUSTE_ROLES = ['ADMINISTRADOR', 'RECEPTOR']` en `shared/constants/roles.ts`, lo que permite a RECEPTOR crear ajustes individuales, cargar batches y eliminar batches.

**Esta rule documenta el constraint en revisión.** No implementar sin confirmar con stakeholders (ver DEC-001).

## Why

El cambio no tiene justificación documentada: puede ser deliberado (receptores corrigen su propia cancha) o puede ser un error de copy-paste al definir el grupo de roles. El riesgo es que RECEPTOR pueda adulterar stock sin autorización de ADMINISTRADOR.

## Where

- **Files**: `shared/constants/roles.ts` (constante `AJUSTE_ROLES`), `server/api/ajustes/index.post.ts`, `server/api/ajustes/load.post.ts`, `server/api/ajustes/batch/[batchId].delete.ts`
- **Endpoints**: `POST /api/ajustes`, `POST /api/ajustes/load`, `DELETE /api/ajustes/batch/:batchId`
- **Layers**: backend (requireRole)

## When

Esta rule aplica hasta que DEC-001 esté resuelta. Si DEC-001 decide mantener paridad legacy, `AJUSTE_ROLES` debe ser `['ADMINISTRADOR']`. Si decide incluir RECEPTOR, esta rule se actualiza a `level: must` con justificación.

## Verification

- Verificar que DEC-001 esté resuelta antes del corte.
- Test: dependiendo de la decisión, RECEPTOR puede o no puede crear ajustes.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen_nuxt/docs/07-migration-notes/improvements.md` sección 3.10: "AJUSTE_ROLES incluye RECEPTOR [DELTA-CUESTIONABLE]". `shared/constants/roles.ts`: `AJUSTE_ROLES = ['ADMINISTRADOR', 'RECEPTOR']`.
- **Related**: DEC-001, RULE-AJUSTE-001
