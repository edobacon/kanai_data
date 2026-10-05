---
id: TICKET-146
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1769
tier: T1
module: curriculum-mapping
autopilot: manual
verification_policy: ask
teach_policy: ask
draft_policy: skip
review_policy: auto
story_points:
  published: 8
  estimated: 2
  executed: 3
---

## Request

Dejar el esquema del modelo de tributación completo y con el vocabulario del modelo v6, de modo que el follow-up (pesos, indicadores, versionado) sea puramente aditivo y no vuelva a tocar el modelo ni a renombrar.

**Alcance real (re-scope 2026-09-09, verificado contra código):** el ticket se reduce a **3 agregados de schema aditivos**, nullable, todo mod-only, sin renames ni cross-mod. El resto del cableado del plan original ya está hecho (ver Contexto).

### Qué entra (lo único pendiente)

1. `contributionPercentage` en `CompetencyAlignment` — numérico, nullable; es el peso del eje que consume el follow-up UPONE-1770. Nace sin lógica que lo consuma.
2. Índice de grupo `(planId, competencyNodeId, developmentLevelId)` en `CompetencyAlignment`.
3. `isRepresentative` (booleano, nullable) en `CompetencyNodeDevelopmentLevel`.

### Qué NO entra

- La lógica que consume esos campos (pesos, indicadores, versionado): va en el follow-up.
- Cualquier rename destructivo: ya lo ejecuta UPONE-1753 (PR #23, en develop). No re-ejecutar.
- Cambios de interfaz o de comportamiento.

## Contexto (cableado ya hecho, no rehacer)

Verificado sobre `curriculum-mapping` rama `feat/UPONE-1756-...` @ `812b31a` y `origin/develop` @ `c00be1f`:

- Renames (cobertura→`DevelopmentLevel`, `LevelScheme`→`PerformanceScale`, `coverageLevelId`→`developmentLevelId`, barrido RC6): **hecho, en develop** (UPONE-1753).
- `planId` + índice individual en `CompetencyAlignment`: **hecho por 1756** (rama, sin mergear).
- FK del catálogo de desarrollo (`developmentLevelId` → fila Scheme) + `achievementBasis` en el RecordType Matrix: **hecho**.
- Objeto `CompetencyNodeDevelopmentLevel`: **ya existe** (dependencia de `isRepresentative` saldada).

## Criterios de aceptación

- [ ] Los 3 agregados existen y migran sin drift; `sync`/`codegen` sin drift; artefactos de sync no commiteados.
- [ ] Los campos nacen con los nombres nuevos vigentes (`developmentLevelId`, catálogos `DevelopmentLevel`/`PerformanceScale`); ningún rename se re-ejecuta.
- [ ] El CRUD de tributación de UPONE-1756 sigue verde tras agregarlos.
- [ ] `contributionPercentage` nace nullable y sin lógica que lo consuma (el reparto de pesos es follow-up UPONE-1770).

## Frontera core/mod (Aduana)

`todo-mod-only`. Los 3 agregados son declaraciones de schema propias del mod que el codegen del core ya soporta (análogo a `isHolistic`/`rollupWeight`). La única pieza core-worthy del feature original era el rename del objeto, y esa la carga UPONE-1753, no este ticket.

## Dependencias y decisiones abiertas

- **Dependencia dura sobre UPONE-1756:** su rama está sin mergear; `planId` y el índice de grupo solo quedan firmes cuando 1756 cierre.
- **Decisión abierta:** dado lo mínimo que quedó, evaluar plegar estos 3 agregados dentro de 1756 (aún abierto) en vez de mantener 1769 como ticket propio. Pendiente de PO/lead.
- **Estimación:** publicado 8 SP; el re-scope lo baja a ~1 SP. Confirmar.

## Referencias KB (sp10)

`UPONE-1769-detalle`, `UPONE-1769-rescope-tras-1756`, `UPONE-1769-pre-intake`, `UPONE-1769-aduana`.

## Adendas al request

### Adenda 1 - 2026-09-10 - Eduardo Bacon

Punto de partida corregido: el trabajo NO se hace sobre la rama de UPONE-1756. Se parte de **develop ya con los cambios de UPONE-1756 mergeados** y se trabaja en una **rama propia de este ticket con prefijo `UPONE-1769-...`** (requisito de prefijo del repo up1). En consecuencia, `planId`, el índice individual de planId y el objeto CompetencyNodeDevelopmentLevel se toman de develop (post-merge de 1756), no de la rama de 1756.

**Motivo**: Corrección del punto de partida indicada por el dev: base develop con 1756 mergeado + rama propia UPONE-1769, en vez de trabajar sobre la rama de 1756.
