---
id: RULE-curriculum-design-053
project: up1
type: rule
module: curriculum-design
level: should
tags:
  - UPONE-1750
  - idColumn
  - relationDisplayFields
  - fk-display
---

# Al crear o tocar un objeto de curriculum-design que otros referencian, declarar `metadata.idColumn`

## What

Si el ticket crea o modifica un objeto destino de FKs, o un RecordList con columnas FK, aplicar RULE-mods-074: declarar `metadata.idColumn` en el JSON del objeto destino y usar `relationDisplayFields` solo para excepciones.

Candidatos en este mod (ninguno lo declara todavia): `Curriculum.code`, `activity.code`, `AcademicProgram.code`, `requirementCategory.code`, `InstructionalComponentType.code`, `CurricularSection.name`, `BibliographyReference.title`. Los RecordTypes (`rt__Plan__curriculum`, `rt__Minor__curriculum`, etc.) declaran el suyo aparte.

## Cuidados propios del mod

- Los `relationDisplayFields` actuales de las listas y de los layouts de detalle se mantienen (tienen precedencia y el detalle no usa `idColumn`). El test `tests/integration/layouts-declared.test.ts` los fija.
- `code` es unico solo junto con version o institucion: filtrar por texto puede traer mas de un registro.
- `Term`, `OrgUnit`, `Institution` y `Student` no son de este mod: su `idColumn` se decide en el mod o core dueño.
- Los labels que resuelve codigo propio (p. ej. `CurriculumMesh/groupRequirementsByTiming.logic.ts`) no cambian con `idColumn`.

## Source

UPONE-1750. Detalle completo en RULE-mods-074.
