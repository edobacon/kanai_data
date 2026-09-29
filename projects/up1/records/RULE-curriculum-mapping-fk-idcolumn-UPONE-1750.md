---
id: RULE-curriculum-mapping-fk-idcolumn-UPONE-1750
project: up1
type: rule
module: curriculum-mapping
level: should
tags:
  - UPONE-1750
  - idColumn
  - relationDisplayFields
  - fk-display
---

# Al crear o tocar un objeto de curriculum-mapping que otros referencian, declarar `metadata.idColumn`

## What

Si el ticket crea o modifica un objeto destino de FKs, o un RecordList con columnas FK, aplicar RULE-mods-074: declarar `metadata.idColumn` en el JSON del objeto destino y usar `relationDisplayFields` solo para excepciones.

Candidatos en este mod (ninguno lo declara todavia): `CompetencyNode.code`, `PerformanceScale.name`, `DevelopmentLevel.name`, `RubricDimension.code`. Los RecordTypes (`rt__Matrix__competencynode`, `rt__Competency__competencynode`, `rt__Scheme__performancescale`, etc.) declaran el suyo aparte.

## Cuidados propios del mod

- `tests/integration/layouts-declared.test.ts` exige `relationDisplayFields` para toda FK de los layouts de detalle de la matriz. Sigue siendo correcto: el RecordDetail no usa `idColumn`, asi que esos mapeos no se quitan.
- `code` no es unico en `CompetencyNode`, `PerformanceScale`, `DevelopmentLevel` ni `RubricDimension`: filtrar por texto puede traer mas de un registro.
- Los nombres de plan, programa y facultad de `MatrixAdoption` los resuelve `logic/matrixAdoption.resolver.js` por Prisma (AD-15, sin FK declarada a `curriculumId`): `idColumn` no los cambia.
- `OrgUnit` no es de este mod: su `idColumn` se decide en el mod o core dueño.

## Source

UPONE-1750. Detalle completo en RULE-mods-074.
