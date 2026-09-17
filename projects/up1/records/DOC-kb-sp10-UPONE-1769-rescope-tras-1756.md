---
id: DOC-kb-sp10-UPONE-1769-rescope-tras-1756
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - UPONE-1769
  - UPONE-1756
  - cableado-modelo
  - rescope
  - reconciliacion
  - tributacion
---

# UPONE-1769 re-scope tras 1756 (cableado ya hecho, alcance reducido a 3 agregados)

> **Para leer al tomar UPONE-1769.** Reconciliación del plan de cableado de 1769 contra lo efectivamente construido en 1756 (local). El contrato completo vive en `UPONE-1769-detalle` (con este mismo análisis como Addendum). **Resumen: casi todo el cableado ya está hecho; 1769 se reduce a 3 agregados de schema.**

## Evidencia (watermark de la re-evaluación)

- `curriculum-mapping`, rama `feat/UPONE-1756-curriculum-mapping-tributacion-crud-por` @ `812b31a` (working tree limpio; cambios de 1756 commiteados).
- `origin/develop` @ `c00be1f` (posterior al watermark `584499e` del análisis de sp9).
- Lectura directa de `objects/CompetencyAlignment.json`, `objects/CompetencyNodeDevelopmentLevel.json`, `objects/RecordTypes/rt__Matrix__competencynode.json` + grep de campos en HEAD.

## Estado del alcance original de 1769

| Item planeado | Estado real | Evidencia |
|---|---|---|
| Renames (cobertura→`DevelopmentLevel`, `LevelScheme`→`PerformanceScale`, `coverageLevelId`→`developmentLevelId`, RC6) | **HECHO, en develop** | `origin/develop`: `objects/DevelopmentLevel.json`, `objects/PerformanceScale.json`, layouts `default_PerformanceScale_*`, `tests/integration/catalog-rename.test.ts` |
| `planId` + índice en CompetencyAlignment | **HECHO por 1756** (rama, sin mergear) | diff `objects/CompetencyAlignment.json`: `planId` nullable, denormalizado, derivado de `planEntry.planId` (REQ-01) + índice `planId` |
| FK `developmentLevelId` (catálogo de desarrollo) en RecordType Matrix | **HECHO** | `rt__Matrix__competencynode.json:20-27` → `DevelopmentLevel` (fila Scheme) |
| `achievementBasis` en Matrix | **HECHO** (lo trajo 1755) | `rt__Matrix__competencynode.json:92,208`; `validateCompetencyMatrix.js`, `competencyMatrixHistory.js` |
| Objeto `CompetencyNodeDevelopmentLevel` | **EXISTE** en develop (lista blanca) | `objects/CompetencyNodeDevelopmentLevel.json`; usado por `alignmentRules.js`, `competencyTree-upsert.resolver.js`, `nodeDevelopmentLevels.js` |
| `contributionPercentage` en CompetencyAlignment | **PENDIENTE** | no existe en código (solo en `docs/reference/competencyalignment-object.md`) |
| Índice de grupo `(planId, competencyNodeId, developmentLevelId)` | **PENDIENTE** | CompetencyAlignment solo tiene índices individuales + `planId` |
| `isRepresentative` en `CompetencyNodeDevelopmentLevel` | **PENDIENTE** | el objeto no declara el campo (contenido verificado) |

## Alcance reducido de 1769 (lo único que queda)

Tres agregados de schema aditivos, `todo-mod-only`, sin rename, sin cross-mod:

1. **`contributionPercentage`** en `CompetencyAlignment` (numérico, nullable; peso del eje 1 que consume el follow-up UPONE-1770).
2. **Índice de grupo** `(planId, competencyNodeId, developmentLevelId)` en `CompetencyAlignment`.
3. **`isRepresentative`** (booleano, nullable) en `CompetencyNodeDevelopmentLevel`.

## Decisiones y dependencias al retomar

- **Estimación:** baja de 8 SP (y del ~3 ya propuesto por el re-scope de renames) a **~1 SP**. Confirmar con PO/lead.
- **Dependencia dura sobre 1756:** la rama de 1756 está **sin mergear**; `planId` y el índice de grupo solo quedan firmes cuando 1756 cierre. **Opción a decidir:** plegar los 3 agregados dentro de 1756 (aún abierto) en vez de mantener 1769 como ticket propio.
- **Naming del FK de Matrix → CERRADO en código:** quedó `developmentLevelId` (apunta al `Scheme`), coexiste con `CompetencyAlignment.developmentLevelId` (apunta a un `Level`). No se usó `developmentLevelSchemeId`. Actualizar la decisión abierta homónima del detalle.
- **`DevelopmentScheme` → CONFIRMADO:** en código es `DevelopmentLevel`/`PerformanceScale`; no reintroducir `DevelopmentScheme` (decisión N-1 de 1753, PR #23 ya en develop).
- **`isRepresentative`:** su dependencia (objeto CNDL) ya existe; se puede agregar sin esperar nada más.

## Verificación mínima al ejecutar (sea 1769 o dentro de 1756)

- [ ] Los 3 agregados migran sin drift; `sync`/`codegen` sin drift; artefactos de sync no commiteados.
- [ ] El CRUD de tributación de 1756 sigue verde tras agregarlos.
- [ ] Ningún rename se re-ejecuta (ya viven en develop).
- [ ] `contributionPercentage` nace nullable y sin lógica que lo consuma (el reparto de pesos es follow-up 1770).

## Referencias

- Contrato + Addendum idéntico: `UPONE-1769-detalle`. Pre-intake: `UPONE-1769-pre-intake`. Aduana: `UPONE-1769-aduana`.
- Familia tributación: `UPONE-1756-alcance-sp10`, `UPONE-1756-alcance-sp10-delta`, `UPONE-1756-followup*`, `UPONE-1756-migracion-niveles`.
- Watermark: `curriculum-mapping` rama 1756 @ `812b31a`, `origin/develop` @ `c00be1f`.
