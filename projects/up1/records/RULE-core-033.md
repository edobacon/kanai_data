---
id: RULE-core-033
project: up1
type: rule
module: core
tags:
  - clonado
  - deepClone
  - prefillFrom
  - prefilledModal
  - capacidad-plataforma
  - recordtype
  - unicidad
  - core
  - layout
  - sp6
---

# El clone profundo por `prefillFrom.source` es capacidad genérica de plataforma; los objetos RecordType-typed ruteados por base deben invocar la unicidad de dominio explícitamente

## What

La row action **"Duplicar"** (`cloneStrategy: prefilledModal`) puede arrastrar el grafo completo del origen (deep clone) sin código por-objeto: el handler genérico de `RecordList` inyecta `prefillFrom: { source: <rowId> }` en el `initialData`, el allowlist de `recordDetailInitialData` lo deja pasar y `RecordDetail` lo transporta al payload (incluido el branch `customEndpoint`). El motor de deep-clone de core dispara **solo** para objetos que declaran `metadata.prefillFrom.deepClone` en su registry; los que no, clonan superficial (no-op). Es una **capacidad de plataforma** (capa `layout`), no un branch por objeto.

**Corolario (atomicidad)**: el gate del `$transaction` Serializable del create (`instance.resolver.js`) cubre `asNewVersion` **y** el clone profundo (`prefillFrom.deepClone?.length > 0 && prefillFrom.source != null`) — sin eso, un fallo a mitad del deep-clone deja un grafo parcial.

**Corolario (RecordType-typed)**: un objeto cuyo create rutea por un alias `rt__<RT>__<base>` (customEndpoint del mod) debe, en el caso clone, rutear por el **objectType base** (único path donde el motor resuelve la metadata de hijos y el `deepClone` del registry) y adjuntar la extensión RT del source con un helper post-create.

## Why

La metadata de hijos (`polymorphicChildren`/`directChildren`/`directChildrenDerived`) y el `deepClone` del registry están **keyed por el objectType base** (`curriculum.json`), no por el alias RT (`rt__plan__curriculum` no tiene JSON de metadata → los readers devuelven `[]` y `resolveEffectivePrefillFrom` no encuentra `deepClone`). Por eso el clone profundo de un objeto RecordType-typed DEBE rutear por la base. Pero al hacerlo, un guard de unicidad gateado por el patrón del alias (ej. `CURRICULUM_RT_PATTERN`) **no dispara** → si el objeto tiene una unicidad de dominio (ej. `(institutionId, code)` de raíz de linaje), hay que invocarla **explícitamente** en el path base, o el clon puede crear una raíz duplicada.

**Enforcement RBAC del clone (en el motor, no en el adapter)**: la capability del clone (ej. `curriculum:clone`) SÍ se declara en `prefillFrom.requiredCapability` —igual que en los objetos solo-clonables (AcademicProgram/CurricularSection/BibliographyReference)—, y el core condiciona ese check a **`!asNewVersion`**: gatea el clone pero NO el versionado (que pasa `source` pero es `asNewVersion`, y tiene su propio `versioning.requiredCapability`). Así un objeto clonable Y versionable declara ambas caps por separado sin que la de clone rompa el versionado, con **un solo punto de enforcement (el motor)** que cubre cualquier caller de `createInstance` (row action Y mutation genérica) — sin bypass por endpoints alternativos. Poner el gate solo en el adapter del mod (endpoint UI) deja abierto el path genérico.

## Where

- **Frontend genérico**: `layout/src/layouts/RecordList.vue` (handler `prefilledModal` → inyecta `prefillFrom.source`), `layout/src/layouts/recordDetailInitialData.ts` (`INITIAL_DATA_CLONE_CONTROL_ALLOWLIST`), `layout/src/layouts/RecordDetail.vue` (carry en el branch `customEndpoint`).
- **Motor + atomicidad + RBAC del clone**: `object-manager/src/graphql/resolvers/instance.resolver.js` (gate del `$transaction` extendido a clone-con-hijos; enforcement de `prefillFrom.requiredCapability` condicionado a `!asNewVersion` → gatea el clone, no el versionado).
- **Declaración de la clone-cap**: `mods/curriculum-design/objects/Curriculum.json` (`prefillFrom.requiredCapability: "curriculum:clone"`).
- **Glue RT + unicidad por base**: `mods/curriculum-design/logic/curriculum-create.resolver.js` (`cloneWithRecordType`): rutea por base, copia la extensión RT (`logic/helpers/recordTypeExtension.js` → `copyRecordTypeExtension`, compartido con el versionado), invoca la unicidad de linaje explícita (`logic/helpers/lineageUniqueness.js` → `assertUniqueLineageRoot`).

## When

Al habilitar el clone profundo de un objeto vía "Duplicar". Objeto **base** con hijos: solo declarar `prefillFrom.deepClone` + los bloques de hijos (capas 1+2 ya construidas; sin la capa 3). Objeto **RecordType-typed** ruteado por customEndpoint: además, rutear el caso clone por la base + copiar la extensión RT + invocar la unicidad de dominio explícita (capa 3). AcademicProgram (base, sin hijos declarados) es el caso no-op: la capa 2 genérica no lo rompe.

## Verification

- Integration BD real: la copia nace como raíz nueva (`previousVersionId=null`, `code` nuevo, `version` propia) con la malla completa remapeada a SUS categorías (0 refs al origen) + RT copiado; origen intacto (`object-manager/tests/e2e/clone-plan-deep-root.test.js`).
- Unit (mod): ruteo por base + strip de campos RT + unicidad explícita + rechazo por `code` duplicado en el path base (`mods/curriculum-design/tests/unit/curriculumCreate.test.js`).
- Unit (motor RBAC): el clone de un objeto clonable+versionable exige `<obj>:clone` (cierra el bypass del path genérico); el versionado NO invoca la clone-cap (solo la version-cap) por el guard `!asNewVersion` (`object-manager/tests/unit/resolvers/instance.resolver.test.js`).
- Integration del path COMPLETO de `createInstance` (registry `deepClone` + orquestación wired + `$transaction`) para clone y versión (`object-manager/tests/e2e/clone-version-createinstance-full.test.js`).
- Guard del artefacto (`object-manager/tests/integration/clone-capability-invariants.test.js`): el Base **sincronizado** conserva `prefillFrom.requiredCapability` (el motor lo lee de ahí, no del mod) + invariante clone/version (un objeto clonable-gateado Y versionable debe declarar también `versioning.requiredCapability`, o `asNewVersion` saltaría el gate de clone).
> **Dependencia de sync**: el enforcement runtime requiere `npm run sync` (mod → Base) + `codegen` (Base → registry `core_ObjectDefinition`). Declararla en el mod no basta; el pipeline de deploy la propaga en cada build.
- Regresión: versionado (`asNewVersion`) y clone shallow de objetos sin `deepClone` (ej. AcademicProgram) intactos.

## Source

- **Discovered in**: TICKET-111 / UPONE-1450 (clone profundo del Plan, S4). Cierra el diferido de UPONE-1270 (clon superficial heredado de SP4). El enforcement RBAC del clone (declarar `prefillFrom.requiredCapability` + condicionar el motor a `!asNewVersion`) se agregó en S5 (post-review, BL-7), alineando Curriculum al patrón de los objetos solo-clonables tras un dual-judge que detectó que un gate solo-en-el-adapter dejaba abierto el `createInstance` genérico.
- **Related**: RULE-core-032 (`directChildrenDerived` remap de cross-refs entre hijos directos), RULE-core-027 (deep-copy config-driven), RULE-core-023 (`.newId` en cloneMap). DEC-LOCAL-04 (arquitectura por capas + AcademicProgram fuera de scope) en la spec.
