---
id: DECISION-021
project: up1
type: decision
module: core
tags:
  - object-manager
  - soft-delete
  - metadata
  - extends
  - kill-switch
---

# DECISION-021: Soft-delete global declarativo vía `metadata.$extends`

## Contexto

Antes de este cambio (ramas `feat/soft-delete-global`, `feat/soft-delete-cascade`, `fix/SS-422-*`, Jira SS, sin ticket UPONE) el soft-delete se implementaba ad-hoc por objeto cuando un mod lo necesitaba. No existía un mecanismo central para declarar "este objeto se borra en modo soft" ni una política uniforme de qué hacer con las relaciones al hacerlo.

## Decisión

Se declara `metadata.$extends` en `core_ObjectDefinition.json` para habilitar soft-delete de forma declarativa por objeto, con un kill-switch global (`SOFT_DELETE_GLOBAL_FILTER`) que cubre los paths de delete a nivel de resolver. El cascade sobre relaciones sigue políticas `onSoftDelete` configurables por objeto, con default `ignore`. Se expone un preview read-only del impacto antes de ejecutar. Verificado en `object-manager/objects/core/core_ObjectDefinition.json`, `object-manager/src/services/tenantManager.js`, y tests unitarios (`executeSoftDeletePlan.test.js`, `softDeleteExtension.test.js`).

## Alternativas descartadas

- **Soft-delete ad-hoc por objeto/mod** (comportamiento previo): descartada porque cada mod reimplementa su propia columna `deletedAt`/`isActive` y su propia lógica de filtrado, generando comportamiento inconsistente entre objetos y fugas donde un query olvida filtrar los soft-deleted.
- **Soft-delete obligatorio para todo objeto (sin opt-in)**: descartada por ser demasiado invasiva; muchos objetos de referencia/lookup no necesitan retención de historial y pagarían el costo de columnas y filtros extra sin beneficio.

## Impacto / reversibilidad

Cambio transversal a nivel de plataforma (comportamiento de delete en `object-manager`, consumido por todos los mods). Nota conocida: el mecanismo declarativo no cubre hoy el borrado por RecordType (no cascadea `directChildren` ni respeta soft-delete en ese path): gap documentado como TICKET-117 (external UPONE-1479), no duplicar. Reversibilidad: el kill-switch permite desactivar el filtro global sin revertir código; el cascade por política es configuración, no migración de datos.
