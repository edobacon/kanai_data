---
id: DECISION-022
project: up1
type: decision
module: mods
tags:
  - uengagement
  - retention-wellbeing
  - ext
  - mod-shared
  - desviacion
  - riesgo
---

# DECISION-022: Indicadores institucionales de retention como campo mod-shared en vez de `ext__<CLIENT>__`

## Contexto

El mod `retention-wellbeing` (dentro de `uengagement-up1`) necesitaba tres indicadores institucionales sobre `ProgramEnrollment`: `rut`, `beca`, `ultimoAccesoLms` (SS-430). La convención estándar de la plataforma para campos específicos de un cliente es el patrón `ext__<CLIENT_CODE>__<objectName>` (extensión per-tenant, ver CLAUDE.md de up1). La implementación pasó primero por `ext__uplanner__programenrollment` (patrón estándar) y luego se refactorizó a campos declarados directo en `objects/ProgramEnrollment.json` (mod-shared), documentado como "UPU-only por ahora" pero ya no aislado por tenant.

## Decisión

**⚠️ Desviación del patrón estándar**: los tres campos viven como campos mod-shared en el objeto base `ProgramEnrollment.json`, no en una extensión `ext__` per-tenant. El seed pasó de `ext__uplanner__programenrollment: { create/upsert }` a spread directo (`...indicators`).

## Alternativas descartadas

- **Mantener `ext__uplanner__programenrollment`** (patrón estándar de la plataforma): habría preservado el aislamiento per-tenant, pero se descartó a favor de simplicidad de acceso (spread directo sin resolver la relación satélite) dado que hoy solo UPU consume estos campos.

## Impacto / reversibilidad

Agrega 3 campos nuevos al objeto **base** `ProgramEnrollment` (requiere codegen + migrate en cualquier tenant/mod que consuma este objeto, no solo UPU). **Riesgo señalado**: si se suman tenants con otros indicadores institucionales, no hay aislamiento: todos los tenants ven las mismas columnas en la tabla base, y un segundo cliente con indicadores distintos requeriría más campos mod-shared o revertir al patrón `ext__`. Reversibilidad: media, requiere mover los campos de vuelta a una extensión per-tenant y migrar los datos existentes de UPU.
