---
id: DOC-kb-sp10-UPONE-1769-aduana
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - aduana
  - UPONE-1769
  - frontera-core-mod
---

# UPONE-1769-aduana

> Evidencia extendida de la pasada de Aduana (frontera core/mod) de UPONE-1769. Interno. El condensado vive en la seccion "Frontera core/mod" de `UPONE-1769-detalle`.

# UPONE-1769 Aduana: frontera core/mod

## Veredicto global

**`todo-mod-only`** para 1769 reducido a campos aditivos. La unica pieza core-worthy del feature (el rename del nombre de un objeto) la ejecuta UPONE-1753, no 1769.

## Tabla por artefacto

| Artefacto | Veredicto | Motivo + fuente |
|---|---|---|
| Campos aditivos: `contributionPercentage`, `planId`, indice de grupo `(planId, competencyNodeId, developmentLevelId)` en CompetencyAlignment; FK del catalogo de desarrollo y `achievementBasis` en Matrix; `isRepresentative` en CompetencyNodeDevelopmentLevel | **mod-only** | Declaraciones de schema 100% del dominio del mod; el patron de agregar campos/indices por JSON de objeto ya lo soporta el codegen del core sin cambios. Analogo a `isHolistic`/`rollupWeight` ya declarados. Fuente: `objects/RecordTypes/rt__Competency__competencynode.json`, `objects/CompetencyAlignment.json` |
| Rename de campo `coverageLevelId -> developmentLevelId` + barrido RC6 | **mod-only** | Rename de columna dentro de un objeto ya declarado por el mod; `db push` de Prisma aplica `RENAME COLUMN` nativo. Fuente: `objects/CompetencyAlignment.json`, `logic/helpers/schemeUsage.js`. **Ya ejecutado por UPONE-1753 (PR #23).** |
| Rename del **objeto** `CoverageScheme -> DevelopmentLevel` | **core-worthy** | El sync de object-manager NO tiene ruta para renombrar el nombre/tabla de un objeto: `docs/guides/pre-push-migrations.md` solo cubre (1) cuarentena de tablas no gestionadas, (2) rename de valores de enum (`ALTER TYPE ... RENAME VALUE`, `scripts/sync/SyncManager.js`), (3) nuevos UNIQUE. Un cambio de `title` deja la tabla vieja como "no declarada" (bloquea rollout en prod, o la mueve a `scratch` en dev sin migrar datos). Requiere camino manual o una capacidad nueva de core. **Lo carga UPONE-1753, no 1769.** Fuente: `object-manager/docs/guides/pre-push-migrations.md`, `object-manager/scripts/sync/SyncManager.js` |

## Consecuencia

Mientras 1769 se mantenga en campos aditivos y NO toque el nombre del objeto, es `todo-mod-only` y no requiere Core Extension. El rename del objeto (core-worthy) y su coordinacion con el equipo de plataforma quedan en el alcance de UPONE-1753.
