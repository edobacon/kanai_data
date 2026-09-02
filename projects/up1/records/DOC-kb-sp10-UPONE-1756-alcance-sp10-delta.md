---
id: DOC-kb-sp10-UPONE-1756-alcance-sp10-delta
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - UPONE-1756
  - alcance-sp10
  - delta
---

# UPONE-1756 Alcance sp10 - delta (cableado forward-compatible + rename)

> **Referencia externa:** por asignar (delta de UPONE-1756, mismo sprint). **Tipo:** implement · **Epica:** UPONE-1452 · **Asignado:** Eduardo Bacon · **Story Points:** 8
>
> **Segunda mitad del entregable del CRUD del sprint**, junto con el ticket base `UPONE-1756-alcance-sp10` (el CRUD de tributacion por competencia). Completa el **modelo del CRUD** y ejecuta los **renames** una sola vez, dejando **cableado el siguiente sprint** para que el follow-up sea aditivo (sin re-estructuras). Va en el mismo sprint que la base; si la capacidad aprieta, es lo separable sin perder el flujo demostrable.

## Objetivo

Dejar el modelo del feature de tributacion completo (aunque parte no se use aun) y ejecutar los renames, para que el follow-up (`UPONE-1756-followup`) sea puramente aditivo.

## Alcance

**Dentro:**
1. Campos forward-compatible (aditivos, nullable donde aplica): `contributionPercentage` en CompetencyAlignment + indice de grupo `(planId, competencyNodeId, developmentLevelId)`; `developmentSchemeId` y `achievementBasis` en el RecordType Matrix; `isRepresentative` en CompetencyNodeDevelopmentLevel.
2. **Rename cosmetico `isHolistic -> isDirectlyMeasured`** en CompetencyNode (razon documentada: `isHolistic` comparte palabra con `rubricModel = Holistic` sin compartir significado). Barrer usos en objects/lang/resolver/tests. **No cambia la logica de R-3**, que ya usa el campo en el ticket base; es solo el rename.
3. Rename destructivo: `coverageLevelId -> developmentLevelId` (barrer el guard RC6 y sus tests en la misma pasada); objeto `CoverageScheme -> DevelopmentScheme`. Coordinar con UPONE-1753 para no renombrar dos veces.

**Fuera:** la logica que consume esos campos (pesos, indicadores) va en el follow-up.

## Criterios de aceptacion (checkeables)
- [ ] Los campos nuevos existen y migran sin drift; el flujo del ticket base sigue verde.
- [ ] `isHolistic` quedo renombrado a `isDirectlyMeasured` en objects/lang/resolver/tests, sin referencias al nombre viejo; R-3 sigue verde (la logica no cambio).
- [ ] El rename destructivo deja el guard RC6 verde (barridos filtro + tests).
- [ ] El objeto quedo renombrado en objects/lang/layouts/capabilities/tests, sin referencias al nombre viejo.

## Definition of Done (checkeable)
Aplica el estandar DoR/DoD del equipo. Ademas:
- [ ] Migracion sin drift; sync corrido sin editar archivos sincronizados; artefactos de sync/seed no commiteados.
- [ ] **Conexion MCP a nivel de servicios (criterio transversal del sprint):** los campos y su gobierno quedan del lado del backend, no del cliente.

## Frontera core/mod (Aduana)
`todo-mod-only`. Sensibilidad **Alta** en el rename destructivo (destructivo + migracion + coordinacion con 1753); el rename `isHolistic -> isDirectlyMeasured` y los campos nuevos son aditivos/cosmeticos (Sensibilidad Baja). Sin Core Extension.

## Estimacion (calibrada)
`Esfuerzo: Considerable + Menor · Sensibilidad: Media-Alta (por el rename destructivo)`. Campos forward-compatible (Considerable, ~5) + renames (Menor/Alta, ~3; el `isHolistic -> isDirectlyMeasured` es un barrido menor dentro de la misma pasada). **Total: 8 SP.** Junto con la base (13), el CRUD del sprint suma **21 SP en dos tickets**.

## Dependencias
- Es la otra mitad de `UPONE-1756-alcance-sp10` (base); se ejecuta junto con ella o inmediatamente despues; el rename destructivo se coordina con **UPONE-1753**.
- **Habilita** el follow-up: los campos aqui definidos son los que el follow-up consume sin tocar schema.

## Referencias
- Base (la otra mitad del entregable del sprint): `UPONE-1756-alcance-sp10`. Feature completo: `UPONE-1756-detalle`, `UPONE-1756-detalle-po`. Follow-up: `UPONE-1756-followup`.
