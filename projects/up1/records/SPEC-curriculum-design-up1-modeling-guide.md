---
id: SPEC-curriculum-design-up1-modeling-guide
project: up1
type: doc
module: curriculum-design
status: reference
tags:
  - curriculum-design
  - formato-up1
  - modelado
  - json-schema
---

# Guia de modelado up1 aplicada a curriculum-design

> Resumen y contextualizacion de [references/AGENTS.md](references/AGENTS.md) + [references/EXAMPLES.md](references/EXAMPLES.md) para el caso especifico de los 4 objetos del agregado Programa de asignatura.

## Reglas no negociables (de AGENTS.md)

1. **NO declarar `id`, `createdAt`, `updatedAt`** — los inyecta el framework via `common.json`.
2. **`title`** = nombre del archivo en PascalCase. `Activity.json` → `"title": "Activity"`.
3. **Filename** PascalCase para objetos del mod.
4. **`required`**: solo nombres de campos requeridos en la API.

## Convenciones aplicadas a los 4 objetos del mod

### `metadata` del objeto

| Campo | Espanol/Ingles | Aplicado a curriculum-design |
|-------|---------------|------------------------------|
| `label` | espanol | "Programa de asignatura", "Seccion curricular", "Vinculo curricular", "Referencia bibliografica" |
| `labelPlural` | espanol | "Programas de asignatura", "Secciones curriculares", "Vinculos curriculares", "Referencias bibliograficas" |
| `gender` | `"masculino"` o `"femenino"` | Activity → ?, CurricularSection → "femenina", CurricularLink → "masculino", BibliographyReference → "femenina". **Nota**: `Activity` el label en espanol "Programa" sugiere "masculino"; el equipo funcional puede preferir otro label. |
| `description` | espanol, una frase | Resumen de la entidad |
| `defaultLayoutType` | `"RecordList"` | siempre presente |

### Campos (`properties`)

- **`title`** del campo: ingles Title Case (ej: `"Workflow State"`, `"Reference Format"`).
- **`description`**: espanol, breve.
- **Naming**: camelCase. FKs terminan en `Id`.

### Tipos para los campos del modelo

| Campo en programa-de-asignatura | Tipo up1 | Notas |
|---------------------------------|----------|-------|
| `name`, `code`, `description`, `version` | `string` | |
| `previousVersionId`, `executionUnitId`, `ownerId`, `sourceId`, `libraryRefId`, `sourceSectionId`, `targetSectionId`, `parentId`, `institutionId` | `string` con `isForeignKey: true` | excepto `ownerId` (ver polimorfismo abajo) |
| `credits`, `weight`, `hours`, `theoryHours`, `practiceHours`, `labHours`, `autonomousHours`, `duration`, `position`, `week`, `year`, `maxLength` | `number` (decimales) o `integer` | usar `integer` para conteos enteros |
| `isDefault`, `isVisible`, `isRequired`, `isSynchronizable`, `isRequiredInAllSections`, `isDirectEvidence` | `boolean` | `static_default: "true"`/`"false"` (string) |
| `createdAt`, `updatedAt` | NO declarar (framework) | |
| `bloomLevel`, `language`, `recordType`, `programLevel`, `workflowState`, `sectionType`, `deliveryMode`, `componentType`, `linkType`, `referenceType`, `contentType`, `referenceFormat`, `activityType` | `string` con `enum` | ver [Q10](open-questions.md#q10) sobre casing |
| `metadata` (de BibliographyReference) | `object` | `static_default: "{}"` |
| `rawCitation`, `notes`, `content`, `activityDescription` | `string` | |

### FKs

- **Estandar**: `string` + `isForeignKey: true` + `references: "<Title>"` + `targetField: "id"`.
  - Ejemplo: `BibliographyReference.institutionId` → `references: "Institution"` (Base existente del core).
- **FK a usuarios**: `integer` + `references: "core_User"`. **NO aplica a este mod** (no tenemos FK directa a usuarios).
- **Self-FK**: simplemente `references` al mismo objeto. Aplica a:
  - `Activity.previousVersionId` → `references: "Activity"`
  - `CurricularSection.parentSectionId` (si se modela anidamiento de Content)
  - `CurricularSection.sourceId` → `references: "CurricularSection"` (trazabilidad MADS)
  - `EvaluationComponent.parentId` → `references: "CurricularSection"` (Composite via parentId — pero ojo: el parent tambien es un CurricularSection con `recordType=EvaluationComponent`, no un objeto distinto)
- **FK polimorfica**: par `<X>Type` + `<X>Id`. Aplica a:
  - `CurricularSection.ownerType` (enum: `["Activity", "Offering"]`) + `CurricularSection.ownerId` (string sin `isForeignKey`).
  - `CurricularLink.sourceSectionId` y `targetSectionId` apuntan a CurricularSection — esos SI son FKs estandar (no polimorficas) porque el target es siempre `CurricularSection`.

### Pattern polimorfico para `CurricularSection.ownerType` + `ownerId` (verbatim de AGENTS.md)

```json
"ownerType": {
  "type": "string",
  "enum": ["Activity", "Offering"],
  "title": "Owner Type",
  "not_null": true,
  "description": "Tipo del documento curricular dueno de esta seccion."
},
"ownerId": {
  "type": "string",
  "title": "Owner",
  "not_null": true,
  "description": "ID del dueno segun ownerType. Sin FK directa (polimorfico)."
}
```

## RecordTypes — capa adicional

Los RecordTypes (UPONE-938..947) son un **mecanismo de la plataforma up1** que extiende un objeto base con subtipos discriminados por `recordType`. Cada subtipo vive en archivo separado.

**Naming convention** (validado en sesion 2026-04-27):

```
up1/object-manager/objects/business/RecordTypes/rt__<RT>__<baseObjectLowercase>.json
```

Ejemplo para CurricularSection:
- `rt__LearningOutcome__curricularsection.json`
- `rt__Modality__curricularsection.json`
- `rt__Session__curricularsection.json`
- `rt__EvaluationComponent__curricularsection.json`
- `rt__Content__curricularsection.json`
- `rt__Bibliography__curricularsection.json`
- `rt__CustomSection__curricularsection.json`

Cada archivo declara los campos especificos del RT (los campos del legacy v2.2). El codegen ([up1/object-manager/src/services/codegen/generatePrismaSchema.js](../../../../up1/object-manager/src/services/codegen/generatePrismaSchema.js) ~linea 2250) genera tabla 1:1 + GraphQL con herencia.

**Importante**: AGENTS.md NO menciona RecordTypes — es una capa adicional de up1 produccion no presente en el sandbox candidate-model. Para los archivos de RT, las convenciones de formato JSON Schema siguen aplicando igual.

## Inventario de Bases del core a verificar

Antes de empezar TICKET-006, **verificar que existen** estos Base en `up1/object-manager/objects/business/Base/`:

| Base | Uso en este mod | Confirmado |
|------|-----------------|-----------|
| `Institution` | FK destino de `BibliographyReference.institutionId` | Si ([up1/object-manager/objects/business/Base/institution.json](../../../../up1/object-manager/objects/business/Base/institution.json)) |
| `Offering` | FK destino opcional de `CurricularSection.ownerId` (cuando ownerType=Offering, futuro syllabus) | Por verificar |
| `OrgUnit` (o equivalente) | FK destino de `Activity.executionUnitId` | **NO existe** — postergado en [DECISION-002](../../decisions/DECISION-org-unit-defer.md) |

## Decisiones de modelado vs open-questions

| Tema | Decision en SP1 | Referencia |
|------|----------------|-----------|
| Estructura del mod | Un solo mod `curriculum-design` | [DECISION-001](../../decisions/DECISION-mod-unico-curriculum-design.md) |
| FK executionUnitId | Postergada (nullable) | [DECISION-002](../../decisions/DECISION-org-unit-defer.md) |
| `externalId` formato | 1 campo string (postura SP1) | [Q1](open-questions.md#q1) |
| `workflowState` enum | string libre en SP1 | [Q2](open-questions.md#q2) |
| `CustomSection` modelado | RT generico unico | [Q3](open-questions.md#q3) |
| `referenceFormat` enum | string libre en SP1 | [Q4](open-questions.md#q4) |
| RTs no validados con datos | NO modelar en SP1 (ApprovalCondition, GeneralData, GraduationProfile, EntryProfile) | [Q5](open-questions.md#q5) |
| Enum casing | PascalCase (segun datos reales) | [Q10](open-questions.md#q10) |

## Anomalies a evitar (de AGENTS.md)

Bayley validara el mod cuando este disponible. Para evitar anomalies:

| Anomaly | Como evitarla en este mod |
|---------|--------------------------|
| `broken-ref` | Verificar que `Institution` y `Offering` existen como Base antes de declarar las FKs |
| `duplicate-title` | Cada title es unico globalmente. Verificar que `Activity`, `CurricularSection`, etc. no estan en uso por otro mod |
| `cross-mod-direct-fk` | Asegurar que ninguna FK del mod apunta a otro mod. Las FKs son a Base del core (`Institution`, `Offering`) o internas (al mismo mod). `core_User` no aplica aqui. |
| `unknown-type` | Solo usar tipos: `string`, `integer`, `number`, `boolean`, `object`, `formula`. **No usar `array` directamente** — modelar relaciones 1:N como FK desde el lado N. |
| `missing-ref` | Toda FK con `isForeignKey: true` debe tener `references`. Excepcion: `ownerId` polimorfico (sin `isForeignKey`). |

## Plan de creacion del mod — separado por ticket (strict scope)

Orden sugerido siguiendo las 8 fases de [specs/mods/creation-guide.md](../../specs/mods/creation-guide.md):

### Paso 0 — Pre-requisito: registrar tenants (FUERA del mod)

Los tenants `UNIVALLE` y `AIEP` se registran a nivel de **plataforma**, NO dentro del mod. Comandos:

```bash
cd up1
npm run tenant:create UNIVALLE --workspace=@uplanner/object-management-backend
npm run tenant:create AIEP --workspace=@uplanner/object-management-backend
```

Esto crea:
```
up1/object-manager/
├── objects/tenants/UNIVALLE/{Base,Extended,RecordTypes}/
├── objects/tenants/AIEP/{Base,Extended,RecordTypes}/
├── prisma/UNIVALLE/schema.prisma
└── prisma/AIEP/schema.prisma
```

Sin tenants registrados, el mod NO se puede activar. Ver [DECISION-003](../../decisions/DECISION-003-tenant-ids.md).

### TICKET-006 (UPONE-1033) — Solo objetos base

1. **Scaffold del mod**: `mods/curriculum-design/` con estructura estandar (config/, objects/, seed/, lang/, css/, tests/).
2. **`config/app.json`** segun [rule-mods-007](../../rules/mods/rule-mods-007.md): `name`, `label`, `tenants: ["UNIVALLE", "AIEP"]` (sin esto el mod no aparece en sidebar), `defaultObjects: ["Activity", "CurricularSection", "CurricularLink", "BibliographyReference"]`.
3. **`objects/Activity.json`** — raiz del agregado.
4. **`objects/CurricularSection.json`** — base polimorfica con campos comunes (`ownerType`, `ownerId`, `recordType` string libre, `sectionType`, `name`, `position`, etc.).
5. **`objects/CurricularLink.json`** — vinculos internos.
6. **`objects/BibliographyReference.json`** — catalogo institucional.
7. **Seed minimo**: solo campos comunes de cada CurricularSection (ver [legacy-examples.md](legacy-examples.md), seccion "Cobertura por ticket").
8. **`npm run sync`** y `npm run codegen` — validar sin errores.
9. **Tests minimos**: que el seed cargue, que las queries GraphQL respondan.

> **NO crear RTs en este ticket**. Los RTs van en TICKET-009.

### TICKET-007 (UPONE-1034) — Listado

10. **`config/layouts/default_Activity_list.json`** — listado con filtros (UO stub, estado, codigo, nombre).

### TICKET-009 (UPONE-1035) — RecordTypes + Detail layouts

11. **RecordTypes** en `up1/object-manager/objects/business/RecordTypes/` — subset a confirmar ([Q11](open-questions.md)):
    - `rt__Modality__curricularsection.json` (campos validados por legacy)
    - `rt__LearningOutcome__curricularsection.json`
    - `rt__Content__curricularsection.json`
    - Otros (Session, EvaluationComponent, Bibliography, CustomSection) — **a confirmar si entran o se postergan**
12. **Seed completo del agregado**: cargar Univalle/AIEP con campos especificos por RT.
13. **`config/layouts/default_Activity_view.json`** — detail principal.
14. **Layouts por RT**: `default_rt__<RT>__curricularsection_view.json` (uno por RT declarado).
15. **`npm run sync`** y validacion end-to-end.

## Referencias

- [AGENTS.md verbatim](references/AGENTS.md)
- [EXAMPLES.md verbatim](references/EXAMPLES.md)
- [Modelo del agregado](programa-de-asignatura.md)
- [Ejemplos legacy v2.2](legacy-examples.md)
- [Open questions](open-questions.md)
- Base del core: [up1/object-manager/objects/business/Base/](../../../../up1/object-manager/objects/business/Base/)
- Codegen: [up1/object-manager/src/services/codegen/generatePrismaSchema.js](../../../../up1/object-manager/src/services/codegen/generatePrismaSchema.js)
- Doc plataforma RecordTypes: [up1/object-manager/docs/features/record-types.md](../../../../up1/object-manager/docs/features/record-types.md)
