---
id: RULE-curriculum-design-047
project: up1
type: rule
module: curriculum-design
tags:
  - deep-clone
  - recordtype
  - base-routing
  - prisma-transaction
  - curriculum
---

# La acción Duplicar de Curriculum enruta por el objectType BASE, no por el alias RecordType, para que el motor de deep-clone del core resuelva la metadata de hijos

## What

El clone profundo ("Duplicar") de un `Curriculum` MUST invocar `createInstance` con `objectType=Curriculum` (la tabla BASE, PascalCase), nunca con el alias `rt__<RecordType>__curriculum`. Solo enrutando por la base el motor de deep-clone del core resuelve la metadata de hijos (`prefillFrom.deepClone`) y `resolveEffectivePrefillFrom` encuentra el `deepClone` declarado en el registry (ambos keyed por el nombre base). La extensión propia del RecordType (campos `rt__<RT>__curriculum`, ej. `progression`/`totalCredits`) queda fuera del scope del create base y se copia aparte, post-create, vía un helper compartido e idempotente.

## Why

El path base de core (`createInstance` con `objectType=Curriculum` + `prefillFrom.source`) clona la fila base y la malla completa (deep-clone de hijos, atómico en `$transaction` cuando hay `deepClone`+`source`, UPONE-1450), pero no arrastra la extensión del RecordType porque esta vive en una tabla `rt__` separada, fuera del alcance del create base. Antes de este ticket, la copia de extensión vivía inline y gateada dentro de `inheritRecordTypeExtensionOnVersion` (solo para versionado); el clone profundo necesitaba la misma copia pero sin el gate de versión (el clon es raíz nueva, `asNewVersion=false`), así que se extrajo a `copyRecordTypeExtension` como fuente única para ambos entry points. Ver [[DECISION-020]] (capability clone vs version separadas) y [[RULE-core-042]].

## Where

- `logic/curriculum-create.resolver.js` (`cloneWithRecordType`, `CURRICULUM_BASE_OBJECT = 'Curriculum'`)
- `logic/helpers/recordTypeExtension.js` (`copyRecordTypeExtension`, nuevo, extraído del hook de versionado)
- `config/layouts/default_Curriculum_list.json` (row action con `deepClone:true` + `confirmCascade`)

## When

Al crear o revisar cualquier acción de clonación/duplicación sobre objetos con RecordType (donde la extensión vive en una tabla `rt__` separada de la base). Verificar que el enrutamiento use el objectType base, que los campos RT se excluyan del payload base, y que la copia de extensión sea idempotente (no pise si el target ya la tiene) dado que corre fuera de la transacción del create base.
