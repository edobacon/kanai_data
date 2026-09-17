---
id: DOC-kb-sp11-CM-09-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - pre-intake
  - cm-plan
  - CM-09
---

# CM-09 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CM-09. Material human-read, no va a Jira. Contrato en [CM-09-detalle](CM-09-escritura-segura-governedobjects).

## Enfoque
En `mods/curriculum-mapping/ai/index.js` (hoy `tools: []`):
- `contracts[].blockGenericMutation` para los objetos con contrato de lectura: CompetencyNode (Matrix), PerformanceScale, DevelopmentLevel.
- `governedObjects` (mapa objectType -> {create?, update?, delete?} con mensajes de negocio) para los 7 satélites: RubricDimension, RubricDescriptor, CompetencyNodeDevelopmentLevel, CompetencyNodeOwnerUnit, CompetencyNodeScopeUnit, MatrixAdoption, CompetencyAlignment.

## Origen (verificado)
- motor del bloqueo -> up1/mcp/src/contracts/generic-write-block.js; enforcement en src/graphql-client.js:77 (assertGenericWriteAllowed desde up1.write)
- test que exige los 10 -> up1/mcp/test/curriculum-mapping-pack.test.mjs (mensajes: contener "UP1", no nombrar objectType, no /Instance|mutation|GraphQL|recordType/i)
- gate de completitud -> up1/mcp/scripts/validate-governed-objects.js
- mapa base objeto->mutation -> commit 7972381 (constante GOVERNED); CompetencyAlignment ya no va en NOT_GOVERNED_YET
- migración de as -> academic-scheduling/ai/rule-value-upsert.js (up1.request -> up1.write)

## Consideraciones
- No reconstruir el guard-resolver revertido (7972381/068ec91): el bloqueo es por declaración, cero resolver en el mod.
- cm NO necesita migrar tools a up1.write: sus tools llaman `*Validated` de nombre propio, que no matchean el guard.
- Gate todo-o-nada: declarar uno obliga a los 10. Correr el gate + suite en checkout limpio.

## Lockstep (coordinación, no desarrollo grande)
Mergear juntos: motor (rama ya construida) + declaración de cm + migración de as (~4 líneas) + sync de cd. Cablear el gate como gate de PR.

## Decisiones técnicas
- Declaración por config en ai/. Disparo recomendado junto con las tools (para no dejar cm read-only).
