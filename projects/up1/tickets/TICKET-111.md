---
id: TICKET-111
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1450
module: curriculum-design
autopilot: autonomous
---

# SP6 - Versionamiento de plan de estudio

> **Jira [UPONE-1450](https://u-planner.atlassian.net/browse/UPONE-1450)** · Epica [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) · **8 SP** · `layer: core` (+ config mod) · `creates_data: true`.
> **Ficha de analisis SP6 (fuente del trasfondo):** `uplanner/specs/up1/sp6/UPONE-1450-versionamiento-plan-estudio.md`. Verificacion en codigo 2026-07-21.

## Request

> *(literal de UPONE-1450 - DET-3: no reescribir)*

El versionamiento considera que en la nueva version:
- Replica datos generales del curriculum (curriculum)
- Replicar datos especificos del recordType
- Replica datos de secciones curriculares del plan (curricularSection)
- Replica la malla del plan (planEntry)

Validar que se sigan manteniendo las restricciones de estado en el cual se crea y desde el cual se puede versionar, de acuerdo con lo implementado en [UPONE-1381](https://u-planner.atlassian.net/browse/UPONE-1381).

## Que es

Habilitar que un plan de estudio se versione **arrastrando todo su contenido**: datos generales del `curriculum`, datos por recordType, secciones curriculares (`curricularSection`) y la malla (`planEntry` + hijos). No es "desde cero": cierra la pieza que SP4 dejo pendiente a proposito.

> **Alcance ampliado (2026-07-22 — REQ-06/07, Session 4)**: el diferido de UPONE-1270 era el "**clone profundo del Plan**" (generico), y esta capacidad aplica tanto al **versionar** (S1-S3, entregado) como al **duplicar**. La accion "Duplicar" quedo superficial (verificado: clona solo datos generales, no la malla). 1450 se amplia para cubrir **tambien el clone profundo** de Curriculum (raiz de linaje nueva con toda la malla), reusando el mismo motor. **AcademicProgram queda fuera**: su clone de entidad ya funciona (UPONE-1271) y no tiene arbol propio que copiar. Ver DEC-LOCAL-04 + REQ-07 (arquitectura por capas: si AcademicProgram creciera con hijos, hereda el clone profundo con solo config).

## Antecedentes / linaje

- **[UPONE-1270](https://u-planner.atlassian.net/browse/UPONE-1270)** (Finalizada SP4): entrego la capa mod (clon superficial, cadena de version, unicidad por linaje, UI). Su comentario de cierre difirio el **clone profundo del Plan** (arrastrar la malla) porque planEntry no existia en SP4 y el clone no era atomico en core. **1450 es ese diferido.**
- **Malla ya construida** (MC-01..MC-09, 1344..1352, Finalizadas): planEntry, requirement, requirementCategory, electivos, lineas. Por eso 1450 entra ahora.
- **Motor de versionado core** (epica [UPONE-1206](https://u-planner.atlassian.net/browse/UPONE-1206)): `asNewVersion`, config de versioning, `getVersionChain`, snapshots. Versiona un objeto, no hace deep-clone atomico del grafo.
- **Gate de estados = config** ([UPONE-1220](https://u-planner.atlassian.net/browse/UPONE-1220)): `allowsVersioning` por estado + FKs de estado inicial. Ya es configuracion.
- **Adyacente NO incluido:** [UPONE-1340](https://u-planner.atlassian.net/browse/UPONE-1340) (gestion de version actual).

## Classification

| Campo | Valor |
|---|---|
| Tipo de trabajo | implement |
| Tipo de cambio | Generalizacion del motor de deep-clone en core (directChildrenDerived) + config del mod (prefillFrom.deepClone) + verificacion del clone del RT base |
| Modulo principal | object-manager (core) |
| Modulos afectados | object-manager (motor); mods/curriculum-design (config Curriculum.json) |

## Triage

Feature de complejidad **media** (SP 8). El motor de deep-clone en cascada YA existe, es atomico (`$transaction` Serializable) y es config-driven — el gap principal es declarativo. El riesgo real se concentra en (a) el remap de cross-refs entre hijos DIRECTOS (la malla) y (b) la atomicidad del RT base del raiz. Hipotesis convergidas contra codigo el 2026-07-21 (evidencia detallada en "Context found" + tabla de evidencia reforzada).

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El gap de arrastre de hijos es declarativo: `Curriculum.prefillFrom` carece de `deepClone`; el motor ya clona poly + directos si se declara | ✓ confirmada | `Curriculum.json` `prefillFrom` solo `exclude`; `instance.resolver.js:3768-3808` rutea `deepClone` a poly/direct; Activity ya lo hace. RULE-core-023, RULE-core-027 |
| H2 | Cross-ref entre hijos DIRECTOS (`planEntry.categoryId → requirementCategory`) NO se remapea: `applyDerivedRemap` solo lee `polymorphicChildrenDerived`. Se generaliza el motor con `directChildrenDerived` (espejo, en core) | ✓ confirmada | fase DERIVED `instance.resolver.js:3810-3829` solo `readPolymorphicChildrenDerived`; 0 hits de `directChildrenDerived`; `applyDerivedRemap` (`deep-clone-polymorphic.js:108`) es agnostico poly/direct → reusable |
| H3 | El RT base del raiz (`rt__Plan__curriculum`: progression, totalCredits) tiene mecanismo de clon (HU-10), pero falta confirmar end-to-end en el path `asNewVersion` + su interaccion con el guard `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE` | ~ parcial (inferred) | HU-10 `instance.resolver.js:3106-3129` mergea base+RT+ext del source; `cloneChildProjections` clona RT de hijos, no del raiz. Es el unico driver que podria mover 8→13 (duda 1) |
| H4 | El gate de estado (desde/hacia que estado se versiona) YA esta implementado (UPONE-1381/1220) — solo validar regresion, no logica nueva | ✓ confirmada | `Curriculum.json` `versionableFromStates:["Approved","Active"]`; `version-from-source.js` valida → `SOURCE_NOT_VERSIONABLE`. REQ-05 = regresion a preservar |
| H5 | El `deepClone` cubre los 4 conjuntos de hijos (sections, requirements, planEntries, requirementCategories) para que la malla quede coherente | ✓ confirmada | `Curriculum.json`: `polymorphicChildren:[sections,requirements]` + `directChildren:[planEntries,requirementCategories]`; `planEntry.categoryId → requirementCategory` obliga a clonar categorias + remapear |
| H6 | `planEntry.sourceEntryId` (self-FK de trazabilidad) requiere decision: apuntar al viejo, remapear o limpiar al versionar | ? open | duda 3 / BL-1 — se decide en design/S1 |
| H7 | Fuente del objeto: en FS actual solo existe `Curriculum.json` (PascalCase); la colision de case (duda 4) parece resuelta o es artefacto de FS case-insensitive | ~ parcial | `ls mods/curriculum-design/objects/` → un solo `Curriculum.json`. Confirmar en la rama de trabajo antes de editar |

### Active questions (gaps para lockear diseno)

- **AQ1 (H3 / duda 1)** [driver de SP]: ¿el path `asNewVersion` de un Plan arrastra `rt__Plan__curriculum` (progression/totalCredits) end-to-end, y como interactua con `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE`? Verificar runtime en S1. Puede mover 8→13.
- **AQ2 (H2 / duda 2)**: confirmar el reader `directChildrenDerived` (mirror de `readPolymorphicChildrenDerived`) + la llamada en la fase DERIVED + el bloque en el JSON.
- **AQ3 (H6 / duda 3)**: comportamiento de `planEntry.sourceEntryId` al clonar.
- **AQ4 (H7 / duda 4)**: fuente real del JSON antes de editar (case-collision).
- **AQ5 (duda 5)**: ¿UPONE-1340 (gestion de version actual) entra a SP6? Hoy fuera.

## Context found (verificado en codigo 2026-07-21, ver ficha SP6)

### Ya existe / hecho (mas de lo asumido)

1. **Motor de deep-clone EXISTE y es atomico** para `asNewVersion` (`$transaction` Serializable, `instance.resolver.js:3851`). Cubre hijos polimorficos (`deep-clone-polymorphic.js`), hijos directos (`deep-clone-direct.js`), proyecciones RT de los hijos (`cloneChildProjections`), y remap de cross-refs via `polymorphicChildrenDerived` (`applyDerivedRemap`).
2. **Enum de estados de Curriculum COMPLETO** (no "crudo") + `versionableFromStates: ["Approved","Active"]` ya configurado en `Curriculum.json`. El gate de versionado ya esta.
3. **Versionado del objeto raiz ya funciona** (`prepareVersionData`: bump, lineage, v2 nace Draft).
4. **Hijos ya declarados** en `Curriculum.json`: `polymorphicChildren` (sections, requirements) + `directChildren` (planEntries, requirementCategories).
5. **Precedente de adopcion:** [1214](https://u-planner.atlassian.net/browse/UPONE-1214) (adopcion en Activity) fue pub 3 -> exec 3, **0% sesgo** (reuso del motor). Es el comparable correcto de 1450, no 1219 (construir el motor).

### Lo que FALTA (trabajo real)

1. **Cablear `prefillFrom.deepClone`** en `Curriculum.json` con los 4 aliases (sections, requirements, planEntries, requirementCategories). Hoy `prefillFrom` solo tiene `exclude`. Config del mod.
2. **GAP core - cross-refs entre hijos DIRECTOS.** `applyDerivedRemap` solo lee `polymorphicChildrenDerived`. `planEntry.categoryId -> requirementCategory` (ambos directChildren) no se remapea -> apuntaria al viejo. **Decision (dev 2026-07-21): generalizar el motor con `directChildrenDerived` en core**, espejo de `polymorphicChildrenDerived`. NO hook de mod (el versionado completo debe ser capacidad de plataforma; precedente: `polymorphicChildrenDerived` subio al motor el hook HU-8b de CurricularLink).
3. **VERIFICAR clone del RT base `rt__Plan__curriculum`** (progression, totalCredits). `cloneChildProjections` clona el RT de los hijos, no del raiz versionado. El guard `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE` bloquea `model=rt__`, pero el base con `recordType=Plan` va por otro path.
4. Tests + smoke del grafo completo clonado atomicamente.

### Reparto mod/core - CORE confirmado

**core** = generalizar el motor (`directChildrenDerived`) + verificar/soportar el clone del RT base. **mod** = solo config (`prefillFrom.deepClone` + declarar `directChildrenDerived` en `Curriculum.json`). Etiqueta CORE correcta: implica revision con criterio "core = tocar con cuidado".

## Evidencia de código reforzada (2026-07-21, verificación directa en object-manager)

Pase de evidencia sobre `uplanner/up1/object-manager` + mod. **Refuerza y precisa** el análisis; baja el riesgo respecto de la ficha.

| Afirmación | Estado | Evidencia (ruta:línea) |
|---|---|---|
| Motor de deep-clone existe | ✅ confirmado | `src/graphql/resolvers/helpers/deep-clone-polymorphic.js`, `deep-clone-direct.js` |
| **Atomicidad del versionado** | ✅ confirmado | `asNewVersion` corre en `$transaction` Serializable — `instance.resolver.js:3724-3726` |
| **`prefillFrom.deepClone` ya rutea aliases poly Y directos** | ✅ confirmado | `instance.resolver.js:3768-3808` (split polyAliases/directAliases → `deepClonePolymorphicChildren` / `deepCloneDirectChildren`) |
| Hijos directos se clonan y entran al cloneMap | ✅ confirmado | `instance.resolver.js:3798-3807` |
| **Gap `directChildrenDerived` localizado** | ✅ confirmado | La fase DERIVED (`:3810-3829`) solo lee `readPolymorphicChildrenDerived` (`:3816`); no existe `directChildrenDerived` en todo el motor (0 hits) → `planEntry.categoryId → requirementCategory` NO se remapea |
| **El fix del gap es un espejo trivial** | ✅ confirmado | `applyDerivedRemap` (`deep-clone-polymorphic.js:108`) es **agnóstico poly/direct**: opera sobre `cloneMap` + bloque `{object, via, remapTo}`. Reusable tal cual → falta solo: reader de `directChildrenDerived` + llamada + declarar el bloque en el JSON |
| **RT base (`rt__Plan__curriculum`) tiene mecanismo de clon** | ⚠️ mecanismo confirmado, falta end-to-end | HU-10 (UPONE-1216, `instance.resolver.js:3106-3129`): con `prefillFrom.source`, resuelve base+RT+ext del source y mergea sus campos (clon de las 3 filas). Reduce el riesgo del gap #3; falta confirmar en runtime que el path `asNewVersion` de un Plan arrastra `progression`/`totalCredits` y la interacción con el guard `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE` |
| Config del mod | ✅ confirmado | `objects/curriculum.json`: `polymorphicChildren` (sections, requirements) + `directChildren` (planEntries fk planId, requirementCategories fk curriculumId); `prefillFrom` **solo `exclude`** (falta `deepClone`); `versionableFromStates: ["Approved","Active"]` |

**Lectura:** cablear el deepClone es agregar un array (mecanismo probado, no construir nada). El `directChildrenDerived` no es "construir motor": la función genérica ya existe y es agnóstica → es un reader + una llamada + declarar el bloque. Y el RT base tiene mecanismo (HU-10). **Refuerza SP = 8** (no 13), condicionado a que el RT base end-to-end no sorprenda.

## Dudas a resolver (antes de cerrar el diseño / primeras tareas)

1. **[SP driver] RT base end-to-end.** Confirmar en runtime (servidor corriendo / test) que versionar un `Curriculum` recordType=Plan arrastra los campos de `rt__Plan__curriculum` (`progression`, `totalCredits`) vía HU-10, y cómo interactúa con el guard `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE`. Es lo único que podría mover 8→13.
2. **Declaración `directChildrenDerived`.** Escribir el bloque en `curriculum.json` (`{object: planEntry, via: categoryId, remapTo: requirementCategories}`) + agregar el reader en el motor + llamada en la fase DERIVED. Verificar el reader (mirror de `readPolymorphicChildrenDerived`).
3. **`planEntry.sourceEntryId`** (self-FK de trazabilidad de clon): decidir si apunta al viejo o se remapea/limpia al versionar.
4. **Fuente real del objeto — `curriculum.json` vs `Curriculum.json`.** Hay **dos archivos** en `mods/curriculum-design/objects/` con solo diferencia de case (posible artefacto del PascalCase audit, SPEC-013). En filesystem case-insensitive colisionan. Aclarar cuál es la fuente antes de editar (define dónde va el `deepClone` + `directChildrenDerived`).
5. **Alcance de `1340`** (gestión de versión actual): confirmar si entra a SP6 o queda fuera (hoy fuera).

> Verificación 2026-07-21 sobre repos co-ubicados en `uplanner/up1/`. Las dudas 1-4 son las que quedan para lockear el SP y el diseño; el resto de la evidencia está confirmada en código.

## Pre-spec (AC de Jira)

| REQ | Certeza | source_ref | Enunciado |
|---|---|---|---|
| REQ-01 · replica datos generales | confirmed | AC Jira | La nueva version replica los datos generales del `curriculum`. |
| REQ-02 · replica datos del recordType | confirmed | AC Jira | Replica los datos especificos del recordType (`rt__Plan__curriculum`). |
| REQ-03 · replica secciones curriculares | confirmed | AC Jira | Replica `curricularSection` (hijos polimorficos). |
| REQ-04 · replica la malla | confirmed | AC Jira | Replica `planEntry` (+ requirementCategory, requirement) con cross-refs remapeados. |
| REQ-05 · restricciones de estado | confirmed | AC Jira | Mantiene las restricciones de estado (crear/versionar) segun UPONE-1381. |

## Setup

| Campo | Valor |
|---|---|
| Branch | `feat/UPONE-1450-plan-version-deep-clone` (creada desde develop al dia en object-manager Y mods/curriculum-design, 2026-07-22); nunca develop/main. Validar branch guard por repo destino (RULE-dev-004). |
| Test data | Plan (Curriculum rt=Plan) en estado Approved/Active con malla completa (planEntry + requirementCategory + requirement + secciones). |
| Services | object-manager (versionado + deep-clone) |

## Backlog

| # | Item | Priority | Estado |
|---|------|----------|--------|
| BL-1 | Decidir comportamiento de `planEntry.sourceEntryId` (self-FK de trazabilidad) al clonar. | should | resolved (S1.T3 / DEC-LOCAL-02: queda null; lineage activo diferido a follow-up local) |
| BL-2 | Confirmar si [1340](https://u-planner.atlassian.net/browse/UPONE-1340) (version actual) entra a SP6. | could | resolved (S1.GATE: fuera de SP6) |
| BL-3 | Gap latente core: `deepCloneDirectChildren` no clona proyecciones RT de hijos directos (`cloneChildProjections`). Inerte hoy (planEntry/requirementCategory sin recordType). Follow-up local si un hijo directo se tipa RT. | could | open |
| BL-4 | **Smoke manual UI (DET-36)**: versionar un Plan real via row action "Crear nueva versión" en UPU y confirmar que la malla de la v2 renderiza con los planEntry bajo las categorías de la v2 (no vacía, no apuntando a la v1) + progression/totalCredits presentes. **BLOQUEADO por entorno preexistente (ajeno a 1450)**: intentado 2026-07-22 con Playwright — suite (:3000) levanta OK, pero **object-manager (:4000) NO bootea** en la rama por una cadena de inconsistencias preexistentes: (1) dep `graphql-depth-limit` declarada pero no instalada (fixed: `npm install`); (2) typeDefs generados stale — `Unknown type "core_Capability"` (fixed: `npm run codegen`); (3) `Unknown type "Workflow"/"WorkflowTransition"/"WorkflowTransitionHistory"` en `src/graphql/typeDefs/dynamic.js` — refs colgantes a objetos ausentes del set de esta rama (NO fixeado, fuera de scope SP6). Cómo retomar: resolver la inconsistencia de `Workflow*` (probable sync/codegen incompleto de un mod ajeno, o legacy no retirado del schema), luego `npm run dev` (object-manager + suite), login UPU (Clerk test mode, memoria reference_clerk_test_login_dev), versionar un Curriculum Plan Approved con malla, abrir la v2. La lógica de remap está probada contra Postgres real (S3.T2). **RESUELTO 2026-07-22**: tras el sync del dev (que completó el retiro de Workflow: `sync:files` + `sync:logic` + `codegen`), object-manager booteó y el smoke UI corrió OK — versionado de UV-ICIV-PLAN-2026 (Active) por el path real → v2 (id `cmrwdc4xg…`) con 6 planEntries + 4 categorías, 0 refs a cats v1, 6 a cats v2, RT base Sequential/240; malla v2 renderiza (6 asignaturas bajo Núcleo/Habilidades Prof). Ver runtime-verification=smoke-executed (S3.T4). | should | resolved |
| BL-8 | **Observación del versionado (matriz round-trip 2026-07-23)**: versionar por UI ("Nueva versión") una fuente que YA tiene una versión posterior NO crea una versión nueva (probado: `UV-ICIV-PLAN-2026` v1 —que ya tiene v2 Draft— no generó v3; los globals de BD no cambiaron, sin registro parcial). El versionado por UI SÍ funciona sobre una raíz sin versiones previas (probado: `RTP-VER-PLAN` v1→v2 y `22222` v1→v2, ambos con arrastre/herencia correctos). Puede ser by-design (versionar solo la última versión de un linaje) o una limitación a confirmar con producto. Ajeno a 1450 (el versionado es S1-S3, entregado); observación de la matriz de verificación. Follow-up: confirmar el comportamiento esperado al re-versionar una versión no-última. | could | open |
| BL-7 | **Hardening RBAC del clone de Curriculum server-side (dual-judge S4.GATE, juez 2)**: `Curriculum.json` `prefillFrom` NO declara `requiredCapability` (a diferencia de `AcademicProgram`/`CurricularSection` que declaran `academicprogram:clone`/`curricularsection:clone`). El clone server-side solo enforza `curriculum:create` (via `withObjectAuth`), no `curriculum:clone` — un usuario con `curriculum:create` sin `curriculum:clone` podria clonar via GraphQL directo (el boton ya esta gateado client-side). Severidad baja (`curriculum:create` ya permite crear; el clone copia data que el usuario ya puede leer). **Fix**: enforzar `curriculum:clone` DENTRO de `cloneWithRecordType` (`logic/curriculum-create.resolver.js`) via `checkCapability(context, ['curriculum:clone'])` — **NO** ponerlo en `prefillFrom.requiredCapability`, porque el versionado tambien pasa `prefillFrom.source` y quedaria gateado con `curriculum:clone` (rompe usuarios con solo `curriculum:version`). Requiere resolver el import synced-vs-source de `authChecker` (patron de `loadGenericInstanceMutation`); se difirio del run autonomo por fragilidad del path. **RESUELTO (S5.T6, 2026-07-23)**: el intento inicial (S5.T1) puso el gate en el resolver del mod (`cloneWithRecordType`); el dual-judge (DET-35, ambos jueces) detecto que dejaba abierto el `createInstance` generico (mutation publica). Fix final EN EL MOTOR: `prefillFrom.requiredCapability: "curriculum:clone"` en `Curriculum.json` + check condicionado a `!asNewVersion` en `instance.resolver.js` → gatea el clone (todos los paths) sin tocar el versionado, alineado con AcademicProgram/CurricularSection/BibliographyReference. 2 tests de motor + integracion; rule-core-033 + docs actualizados. Ver BL-10 (consulta abierta: baseline `curriculum:create`). | should | resolved |
| BL-6 | **Smoke manual UI del "Duplicar" profundo (DET-36, S4.T6)**: duplicar un Plan real con malla por la row action "Duplicar" en UPU, ingresar un `code` nuevo, y confirmar que la copia nace como raiz nueva con la malla completa colgando de SUS categorias (no vacia, no apuntando al origen) + progression/totalCredits + origen intacto. **smoke-not-reproducible en el run autonomo (2026-07-23)**: los servers (:4000/:3000) estaban UP pero booteados antes de S4 (OM con el resolver viejo + instance.resolver sin el gate `$transaction` nuevo; layout sin los cambios de RecordList/RecordDetail). Reproducirlo exige `npm run sync` (no quirurgico) + restart de OM + rebuild de layout + drive UI Clerk — se evito para no reiniciar/mutar los servers activos del dev. **RESUELTO 2026-07-23 (smoke-executed)**: el dev autorizo desplegar+smoke; tras `npm install` (restauro node_modules roto, ver L17) + resolvers synced quirurgicos + config DB `deepClone:true` + restart OM (nodemon) + suite relevantado, se corrio el smoke UI por el path real: Planes de Estudio -> Currículos -> "Clonar" sobre UV-ICIV-PLAN-2026 v1 Active -> modal confirmCascade -> code nuevo `UV-ICIV-PLAN-SMOKE1450` -> Guardar. Evidencia BD del clon (id `cmrxnawes…`): **v1 / previousVersionId null (raiz nueva), 4 categorias + 6 planEntries (malla completa), RT Sequential/240, planEntry.categoryId -> 6 a cats del clon / 0 al source (remap)**; SRC intacto (4/6). Round-trip: clon eliminado en cascada (incl. section polimorfica + su RT GraduationProfile), 0 residuo, baseline 5 curricula restaurado. Ver runtime-verification=smoke-executed (decisions_log). | should | resolved |
| BL-5 | **Clonar (Duplicar) NO arrastra la malla — solo base + RT** (hallazgo del dev, smoke 2026-07-22). Verificado runtime: clonar UV-ICIV-PLAN-2026 v1 → clon (code UV-ICIV-PLAN-CLONE-TEST, raíz nueva v1) nace con **0 planEntries / 0 categorías / 0 secciones / 0 requisitos**; copia datos generales + RT base (progression=Sequential/totalCredits=240, vía el form prefill del `prefilledModal`). Causa: el row action `duplicate` (`cloneStrategy: prefilledModal`) crea desde el FORM y **no setea `prefillFrom.source`+`deepClone`**, así que el motor de deep-clone (gated en instance.resolver.js:3783) no dispara — a diferencia del versionado (`asNewVersion`+`prefillFromCurrent` sí lo setea). Es el "clon superficial" heredado de SP4 (UPONE-1270); 1450 profundizó SOLO el versionado. **Decisión de producto + follow-up**: ¿el Duplicar debería deep-copiar la malla ahora que la capacidad existe? Si sí: extender el clone path a setear `prefillFrom.source`+`deepClone` (reusa el mismo motor). Fuera del AC de 1450 (versionado). Clon de prueba ya eliminado. **PROMOVIDO a in-scope (2026-07-22)**: el dev confirmó ampliar 1450 para cubrir el clone profundo de Curriculum → ahora es REQ-06/07 + Session 4 (ver spec + DEC-LOCAL-04). El diferido de UPONE-1270 era el "clone profundo del Plan" genérico; se completa aquí. AcademicProgram queda fuera (clone de entidad ya completo). | should | resolved-into-scope (S4/REQ-06) |
| BL-9 | **Trazabilidad de clon a nivel fila (`planEntry.sourceEntryId`) — historia futura**. Confirmado en Confluence "Modelo de objetos de negocio — Learning Assurance" (espacio uP1): el campo esta en el modelo LA como metadata OPCIONAL prevista (tabla `planEntry`: `sourceEntryId UUID? ❌ Trazabilidad de clonacion`), unica mencion en todo Confluence, sin caso de uso/flujo. Cero consumidores en el monorepo (0 setters/readers/UI; solo schema + doc de referencia + label i18n "Origen"). DEC-LOCAL-02 lo deja null; S5.T2 lo vuelve null EXPLICITO (agregado a `prefillFrom.exclude`, consistente con el precedente `CurricularSection.sourceId`). Activarlo = feature nueva: requiere (a) un tercer mecanismo en el motor de deep-clone para sellar un campo hijo con el `oldId` (hoy solo hay `exclude` + `*Derived` remap), y (b) un consumidor real (ej. diff de mallas entre versiones). Candidato adyacente: [UPONE-1340](https://u-planner.atlassian.net/browse/UPONE-1340). | could | open |
| BL-10 | **¿Clonar/versionar deberían requerir `curriculum:create`, o ser independientes?** (consulta de diseño RBAC, del review 2026-07-23). Hoy ambos pasan por `createInstance` (`withObjectAuth('create')`, `instance.resolver.js:2976`) → exigen `curriculum:create` como baseline ADEMÁS de su capability distintiva (`curriculum:version` / `curriculum:clone`). S5.T1 mantiene esa simetría (clone = create+clone, como version = create+version). Desacoplar `create` de clone/version sería un rediseño mayor del gate de core que tocaría también el versionado → fuera de alcance de 1450. Pregunta de producto: ¿un rol que solo clona/versiona (sin crear desde cero) es un caso real? Si sí, evaluar mover el baseline. | could | open |

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-07-22T15:40:03.000Z | false → super | dev trigger "super autopilot" al arrancar execute | S1 (proximo gate) |

### Plan de sessions

> Esqueleto. `design-feature` refina y particiona (DET-20).

| # | Objetivo | REQ | Tier | Gate |
|---|---|---|---|---|
| S1 | Spike de evidencia: resolver dudas 1 (RT base end-to-end) y 4 (fuente curriculum.json) → lockear SP y decidir el alcance del RT base | REQ-02 | (a definir) | (a definir) |
| S2 | Core: `directChildrenDerived` (reader + llamada en fase DERIVED) + declarar bloque en el JSON (duda 2) | REQ-04 | (a definir) | (a definir) |
| S3 | Config del mod (`prefillFrom.deepClone` con los 4 aliases) + RT base + tests/smoke del grafo completo atómico | REQ-01..05 | T3 | done |
| S4 | **Clone profundo del Plan ("Duplicar" arrastra la malla)** — 3 capas: motor (reuso) + frontend generico (layout CORE) + glue alias RT (mod) + integration + regresión + smoke. Ampliación de alcance (cierra el diferido de UPONE-1270) | REQ-06, REQ-07 | T3 | diseñada, pendiente autorización de ejecución |
| S5 | **Fixes pre-merge (post-review)** — RBAC clone server-side (BL-7) + higiene de IDs internos DKC (DET-19) + null explícito `sourceEntryId` + tooling del mod (L17) + cobertura e2e por `createInstance` + docs/KB (DET-37). No agrega alcance funcional | — | T2 | pendiente de ejecución |

**Notas del esqueleto**:
- S1 es ⚑ fuerte y driver de SP: la verificacion runtime del RT base (AQ1) decide si el estimado 8 se sostiene o sube a 13.
- Riesgo core-touch en S2 (generalizar el motor con `directChildrenDerived`): preferir el espejo de `applyDerivedRemap` (ya agnostico) sobre logica nueva; revisar con criterio "core = tocar con cuidado".
- S3 exige verificacion runtime real en UPU (DET-36), no solo unit — el grafo clonado debe verse en la v2 renderizada (memoria: verificar el render/path real, no solo config+BD).

### Session 1 — 2026-07-22 15:41 — Spike de evidencia: RT base end-to-end + fuente del objeto [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Resolver el driver de SP: verificar en runtime si versionar un Plan arrastra `rt__Plan__curriculum` end-to-end (BUG-core-004), resolver la colision de case del JSON fuente, y decidir el comportamiento de `planEntry.sourceEntryId`. Lockear SP (8 vs 13) y fijar el alcance del fix del RT base para S2.

**Tasks completadas**:
- [x] S1.T1 — Verificar en runtime si versionar un `Curriculum` recordType=Plan arrastra `rt__Plan__curriculum` (progression/totalCredits/totalPeriods/periodType) end-to-end via HU-10 y su interaccion con el guard `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE`. Confirmar si BUG-core-004 sigue vivo
- [x] S1.T2 — Resolver la colision de case `curriculum.json` vs `Curriculum.json` en `mods/curriculum-design/objects/`: confirmar la fuente real que consume el sync antes de editar
- [x] S1.T3 — Decidir el comportamiento de `planEntry.sourceEntryId` (self-FK de trazabilidad) al versionar: apuntar al viejo / remapear / limpiar (BL-1). Registrar como DEC-LOCAL
- [x] S1.GATE — Gate de sync Session 1 (tier T3): persistir hallazgos, lockear SP (8 vs 13), fijar alcance del RT base para S2, decidir continue/escalate

**Validacion del tier** (T3 — spike read-only, sin cambios de codigo aun):
- T3 — verificacion estatica multi-capa (DET-5): grep + read sobre `object-manager/src` + `mods/curriculum-design`. Sin suite corrida (S1 no toca codigo); regression real se corre en S3. Evidencia cruzada agent (sonnet) + verificacion independiente del orquestador (DET-33 `verified`).

**Discoveries / Learns nuevos**:
- L1: **BUG-core-004 ya esta resuelto a nivel MOD** (no core). El hook `inheritRecordTypeExtensionOnVersion` (`mods/curriculum-design/logic/sectionValidation.resolver.js:186-210`, UPONE-1270/TICKET-075, mergeado) copia `rt__<RT>__curriculum` del source a la v2 post-create. El versionado base de core NO arrastra la extension RT (confirmado por el doc comment L164-184). → **S2.T3 (fix core del RT base) NO es necesario**; solo verificar regresion en S3.
- L2: **El path real del usuario dispara el hook**. La row action `create-new-version` (`config/layouts/default_Curriculum_list.json:18-30`, `asNewVersion:true` + `prefillFromCurrent:true`, type `create`) usa el `createInstance` generico → resuelve al override `sectionValidationMutation.createInstance` (unico override de createInstance del mod, H7) → captura `asNewVersion`/`prefillFrom.source` antes del delegate → dispara el hook. REQ-02 satisfecho por el path real (memoria: verificar el path de entrada real). Confirmar en smoke S3.T4.
- L3: **Gap `directChildrenDerived` confirmado** (REQ-04): 0 hits en todo el repo vs `readPolymorphicChildrenDerived` (3: import `instance.resolver.js:21`, call `:3831`, def `deep-clone-polymorphic.js:84`). Es el trabajo real de core en S2. `applyDerivedRemap` es agnostico poly/direct (reusable).
- L4: **`sourceEntryId` es campo muerto** (0 setters; solo en `typeDefs/dynamic.js:836` generado). DEC-LOCAL-02: queda null al versionar (ver spec).
- L5: **Gap latente (fuera de scope)**: `deepCloneDirectChildren` (`deep-clone-direct.js:49-113`) NO llama `cloneChildProjections` para sus rows clonadas (a diferencia del path polimorfico). Inerte hoy (ni `planEntry` ni `requirementCategory` declaran `recordType`), pero latente si un futuro hijo directo se tipa RT. → backlog `could`.
- L6: **Caveat de atomicidad**: el hook del RT base corre FUERA del `$transaction` del versionado (post-delegate); un fallo del hook no revierte la v2. Aceptado por diseno (UPONE-1270). REQ-02 se satisface funcionalmente; foldearlo al `$transaction` seria mejora de core NO estimada (posible trigger de 13 SP si se pidiera) → fuera de alcance de 1450.

**Decision de alcance (lock de SP)**: **SP = 8 confirmado** (no 13). El unico driver que podia mover a 13 (fix core del RT base) esta resuelto por el hook mod existente. Alcance de S2 se **reduce**: solo S2.T1 (declarar `directChildrenDerived` en JSON) + S2.T2 (reader core + llamada). **S2.T3 se marca N/A** (RT base ya cubierto por el mod; solo regresion en S3).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (orquestador) — verificacion independiente del self-report del agent
**Tier de revision**: standard (spike read-only; sin codigo que revisar)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Evidencia multi-capa (DET-5) | pass | grep + read cruzados; agent + verificacion independiente |
| 2 | Verificacion self-report (DET-33) | pass | claims del agent re-verificados (hook, guard, grep counts, sourceEntryId) → `verified` |
| 3 | Certeza de hipotesis (DET-1) | pass | H1/H2/H4/H5 confirmadas; H3 resuelta (RT base = mod hook); H6 decidida (DEC-LOCAL-02); H7 resuelta (fuente PascalCase) |
| 4 | Propagacion (DET-16) | pass | scope change propagado a spec (S2.T3 N/A); DEC-LOCAL-02 en spec |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 2 (S2: core directChildrenDerived reader + declarar bloque en Curriculum.json). SP=8 lockeado; S2.T3 N/A (RT base ya cubierto por hook mod). Commit DET-27: d509c07
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-07-22 16:00 — Core: generalizar el motor con `directChildrenDerived` [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Generalizar el motor de deep-clone de core con `directChildrenDerived` (espejo de `polymorphicChildrenDerived`): reader `readDirectChildrenDerived` + llamada en la fase DERIVED de `instance.resolver.js`, reusando `applyDerivedRemap` (ya agnostico) sin modificarla. Declarar el bloque en `Curriculum.json` para poder ejercitar el reader. S2.T3 (fix core del RT base) es N/A — resuelto en S1 (hook mod).

**Tasks completadas**:
- [x] S2.T1 — Declarar `metadata.directChildrenDerived: [{object: planEntry, via: categoryId, remapTo: requirementCategories}]` en `Curriculum.json` (fuente confirmada en S1.T2)
- [x] S2.T2 — Agregar el reader `readDirectChildrenDerived` (espejo de `readPolymorphicChildrenDerived`) + su llamada en la fase DERIVED de `instance.resolver.js`, reusando `applyDerivedRemap` sin modificarla
- [x] S2.T3 — N/A (resuelto en S1): RT base ya cubierto por el hook mod `inheritRecordTypeExtensionOnVersion` (UPONE-1270). Solo regresion en S3.T3
- [x] S2.GATE — Gate de sync Session 2 (tier T2): dual-judge del core-touch (DET-35), verificar regresion del clone de `Activity`, decidir continue/iterate

**Validacion del tier** (T2 — unit + coverage):
- T1/T2 — `vitest run` de los 4 archivos de clone: **35 pass** (12 nuevos `direct-children-derived-remap.test.js` + 23 regresion `derived-remap`/`deep-clone-direct`/`deep-clone-polymorphic`). Resolver: `instance.resolver.test.js` **97 pass** (regresion). `node --check` OK en los 2 archivos core editados. Tras el fix N+1 (batch findMany): 9/9 del test nuevo verdes (behavior-preserving).

**Discoveries / Learns nuevos**:
- L7: **`applyDerivedRemap` (poly) NO es reusable tal cual para hijos directos** (contra lo asumido en el spec). Es create-based (findMany source → create); `planEntry` ya se clona como hijo directo primario → reusarla lo duplicaria. Solucion: `applyDirectChildrenDerivedRemap` update-based (DEC-LOCAL-03).
- L8: **`resolveEffectivePrefillFrom` unifica el deepClone declarado (registry JSON) con el runtime** (`prefill-from-source.js:114-119`). Por eso declarar `prefillFrom.deepClone` en `Curriculum.json` (S3.T1) activa el path real de la row action `create-new-version`, que NO pasa `deepClone` en runtime (solo `prefillFromCurrent`+`asNewVersion`). Clave para que el fix llegue al usuario real.
- L9: **La copia synced `object-manager/objects/business/Base/curriculum.json` esta STALE** (sin polymorphicChildren/directChildren, de UPONE-1381). El sync completo (S3.T1) es dependencia dura para runtime/integration — el reader lee de ahi, no del mod.
- L10 (dual-judge, confirmado por ambos): **completitud del deepClone**: si `requirementCategories` falta del deepClone pero `planEntries` esta, `categoryId` queda colgando en la v1 (solo console.warn, sin fallar). S3.T1 debe declarar los 4 aliases completos. Sin enforcement en el motor → riesgo latente documentado.

**Quality review (DET-23) — dual-judge (DET-35, tier T2)**:

**Reviewer**: 2 jueces ciegos independientes (sub-agentes en contexto limpio, sonnet) + fix-agent quirurgico (orquestador)
**Tier de revision**: exhaustive (dual-judge)
**Resultado global**: pass (tras iterate sobre 1 finding confirmado)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Correctitud del remap | pass | ambos jueces: `categoryId` old→new correcto; itera solo type===object; lee via batcheado |
| 2 | No-duplicacion (create vs update) | pass | ambos: reusar applyDerivedRemap duplicaria; update-based correcto (test asserta create===undefined) |
| 3 | Seguridad de refs externas | pass | ambos: `activityId`/`sourceEntryId`/`planId` no tocados (solo `categoryId` en `via`) |
| 4 | Type filtering | pass | ambos: `remapTypeByAlias`→`requirementCategory` evita colision de ids de otro type |
| 5 | Nullable | pass | ambos: `categoryId` null se deja sin update |
| 6 | Regresion path poly | pass | ambos: aditivo, `deep-clone-polymorphic.js` 0 diff; 35+97 unit verdes |
| 7 | Eficiencia (N+1) | **iterate→pass** | ambos WARNING: N findUnique. **Fix aplicado**: batch `findMany` (paridad con sibling poly). Re-test 9/9 verde |
| 8 | Tests | pass | ambos: asertan valor remapeado (no solo existencia); cubren null/cross-owner/wrong-type/no-op |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 3 (S3: prefillFrom.deepClone 4 aliases + SYNC + integration BD real + smoke UPU + docs/KB). dual-judge T2 pass; N+1 resuelto. Code: object-manager 8702fcf6, mods c63f234
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Findings confirmados (ambos jueces)**:
1. **N+1 queries** (WARNING) → **RESUELTO en S2** (batch findMany).
2. **Feature inerte hasta S3.T1** (esperado — el gate `prefillFrom.deepClone?.length>0` no dispara sin la config) → se activa en S3.T1 (propagado al spec).
3. **Completitud del deepClone** (latente) → S3.T1 declara los 4 aliases; riesgo documentado (L10).

**Bloqueantes detectados**: ninguno (findings resueltos o diferidos-por-diseño a S3).

### Session 3 — 2026-07-22 16:25 — Config + integration BD real + smoke + docs/KB [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Activar el deep-clone del plan cableando `prefillFrom.deepClone` (4 aliases) + SYNC a object-manager; correr integration contra BD real (grafo clonado + cross-refs remapeados + RT base heredado), regresion (gate de estado + clone de Activity), smoke runtime en UPU (DET-36), y cerrar completitud de planificacion (DET-37): docs oficiales + promover `directChildrenDerived` a RULE-core + actualizar BUG-core-004.

**Tasks completadas**:
- [x] S3.T1 — `metadata.prefillFrom.deepClone: ["sections","requirements","planEntries","requirementCategories"]` en `Curriculum.json` + codegen + SYNC (copia synced stale)
- [x] S3.T2 — Integration test del deep-clone atomico contra BD real: versionar Plan con malla completa; verificar conteos + cross-refs remapeados (categoryId→cat v2) + RT base + secciones
- [x] S3.T3 — Regresion: gate de estado (Approved procede / Draft rechaza `SOURCE_NOT_VERSIONABLE`) + clone de `Activity` no roto
- [x] S3.T4 — Smoke runtime UPU: versionar plan real, abrir malla v2 renderizada, verificar planEntry bajo categorias de la v2 (evidencia runtime, DET-36)
- [x] S3.T5 — Docs oficiales (DET-37 dim1): `directChildrenDerived` + versionado profundo del plan (object-manager/docs + mods/curriculum-design/docs)
- [x] S3.T6 — KB DKC (DET-37 dim2): promover `directChildrenDerived` a RULE-core + actualizar BUG-core-004
- [x] S3.GATE — Gate de sync Session 3 (tier T3): acceptance checkpoints, evidencia runtime, docs+KB al dia, decidir continue/close-ready

**Validacion del tier** (T3 — regression completa):
- T3 — **suite consolidada 146/146 verde** (10 files: unit clone/derived + instance.resolver 97 + e2e clone-plan-mesh-derived/clone-direct/clone-activity/derived-remap-generic + integration gate estado). Integration contra `uplanner_upu` real (S3.T2). Smoke UI: `smoke-not-reproducible` (DET-36, ver S3.T4 + BL-4).

**Discoveries / Learns nuevos**:
- L11: **El sync de up1 no es quirurgico** (memoria confirmada): `sync:files` tocó ~25 archivos synced de otros mods (academic-scheduling, report-builder, uengagement, layout) por drift preexistente. Se commiteó **solo** `curriculum.json` (scope SP6); el resto restaurado (regenerable, otros mods read-only).
- L12: **`prefillFrom.deepClone` estatico activa el path real**: al declararlo en `Curriculum.json` (+ sync), `resolveEffectivePrefillFrom` lo unifica en cada versionado, incluso el de la row action UI que no pasa `deepClone` en runtime (L8). Con esto la v2 arrastra la malla completa por el path real del usuario.

**Quality review (DET-23) — tier T3**:

**Reviewer**: LLM principal (verificacion independiente de tests + acceptance) — S3 es config + tests + docs/KB, sin logica core nueva (el core-touch fue S2, ya dual-judged).
**Tier de revision**: standard (proporcionalidad: sin codigo core nuevo en S3; dual-judge aplicado donde correspondia, S2.GATE)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Tests (DET-7/13) | pass | 146/146 consolidado; integration BD real re-verificado (DET-33) |
| 2 | Funcional (5 REQs) | pass | REQ-01..05 con evidencia; REQ-04 probado contra Postgres real |
| 3 | Runtime (DET-36) | warn | smoke-not-reproducible (honesto); BL-4 pre-close para el dev |
| 4 | Scope (DET-30) | pass | commit quirurgico curriculum.json; drift de otros mods restaurado |
| 5 | Docs (DET-37 dim1) | pass | object-manager/docs + mod docs actualizados |
| 6 | KB (DET-37 dim2) | pass | RULE-core-032 + BUG-core-004 fixed, validados |
| 7 | Regresion | pass | Activity clone + gate estado intactos |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → CLOSE-READY: todas las tasks S1-S3 done, acceptance verde (146/146), docs+KB al dia. Pendiente pre-close: BL-4 smoke manual UI (DET-36). El CLOSE del ticket (status:closed) requiere OK explicito del dev (DET-30) — NO autonomo. Code: om 1e14bbd7, mods b0cc3f0
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Bloqueantes detectados**: ninguno. **Pendiente pre-close**: BL-4 (smoke manual UI por el dev) — no bloquea el gate pero se recomienda antes de `status: closed`.

### Session 4 — 2026-07-23 — Clone profundo del Plan ("Duplicar" arrastra la malla) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa + core-touch layout con dual-judge)

**Objetivo**: Cerrar la mitad no terminada del diferido de UPONE-1270 (REQ-06/07): que la row action "Duplicar" de un Plan arrastre todo el arbol (malla + secciones + requisitos + RT base) como raiz de linaje nueva, reusando el motor de deep-clone entregado en S1-S3. En 3 capas: (1) motor OM = reuso sin cambio; (2) frontend generico (layout CORE: RecordList manda `prefillFrom.source`); (3) glue del alias RT + unicidad de linaje explicita en ruteo por base (mod).

**Tasks completadas**:
- [x] S4.T1 — Capa 2 (frontend generico): el handler de `cloneStrategy: prefilledModal` en `RecordList` agrega `prefillFrom: { source: rowId }` al initialData; ampliar el allowlist de `recordDetailInitialData` para dejar pasar `prefillFrom`. Generico (beneficia a cualquier objeto con hijos declarados)
- [x] S4.T2 — Capa 2 (customEndpoint): `RecordDetail` customEndpoint branch transporta `initialData.prefillFrom` al `data` de la mutation (hoy solo lee `formData.*`)
- [x] S4.T3 — Capa 3 (glue RT, mod): `curriculum-create.resolver.js` caso clone rutea por objectType base `Curriculum` con `prefillFrom.{source, deepClone}` + adjunta proyeccion RT (helper compartido extraido de `inheritRecordTypeExtensionOnVersion`) + `$transaction` + unicidad de linaje explicita en el path base
- [x] S4.T4 — Integration BD real: duplicar un Plan con malla -> copia independiente (raiz nueva, code nuevo, version 1) con malla completa, cross-refs remapeados (0 refs al origen), RT base; origen intacto
- [x] S4.T5 — Regresion: versionado OK + clone shallow AcademicProgram OK (no-op sin deepClone) + otros prefilledModal intactos
- [x] S4.T6 — Smoke runtime UPU (DET-36): "Duplicar" un Plan real por UI -> malla de la copia renderiza; origen intacto
- [x] S4.T7 — Docs oficiales (DET-37 dim1): clone-strategies.md (Duplicar deep, clon vs version) + object-manager/docs (capacidad + capas)
- [x] S4.T8 — KB DKC (DET-37 dim2): RULE del clone-deep generico + gotcha de unicidad en ruteo por base
- [x] S4.GATE — Gate de sync Session 4 (tier T3): dual-judge del core-touch de layout (DET-35), regresion consolidada, smoke con evidencia, docs+KB al dia, decidir continue/close-ready

**Validacion del tier** (T3 — regression completa + core-touch dual-judged):
- object-manager: 11 e2e (incl. `clone-plan-deep-root` NUEVO 2/2 contra Postgres real + `version-asnewversion` regresion) + 106 unit (instance.resolver + direct-children-derived-remap). node --check OK en los 4 archivos JS editados.
- mod curriculum-design: 30/30 resolver unit (curriculumCreate 15 con +4 clone, versionInherit 7, sectionValidation 8) — corridos con config minimo por un breakage de tooling (ver L17); suite completa 256/256 verificada a las 09:34 antes del breakage.
- layout: recordDetailInitialData 6 + useCreateRowAction 15 + createRowActionVisibility 4 = 25; typecheck 0 errores en archivos tocados.

**Discoveries / Learns nuevos**:
- L13: **El clone profundo DEBE rutear por el objectType base `Curriculum`, no por el alias `rt__Plan__curriculum`**. La metadata de hijos (`readObjectMetadataBlock` usa `objectType.toLowerCase()+'.json'`) y el `deepClone` del registry (`resolveEffectivePrefillFrom` por `name`) estan keyed por la base; bajo el alias no resuelven → el motor no arrastraria la malla. `cloneWithRecordType` rutea por base, stripea campos RT (la base los rechaza), y restaura la extension RT con `copyRecordTypeExtension` (helper compartido con el versionado).
- L14: **dual-judge (DET-35) cazo un over-reach real**: la inyeccion GENERICA de `prefillFrom.source` en el handler `prefilledModal` reactivaba el `prefillFrom.deepClone` DORMIDO de `CurricularSection` (`duplicate-modality`/`duplicate-customsection` del syllabus) → deep-clone recursivo fuera de alcance/sin tests. Fix: opt-in por accion (`action.deepClone: true`); solo `Curriculum.duplicate` lo declara. DEC-LOCAL-05.
- L15: **Gap RBAC (BL-7)**: `Curriculum.json prefillFrom` no declara `requiredCapability` → el clone server-side solo enforza `curriculum:create`. No se puede poner en `prefillFrom.requiredCapability` porque el versionado tambien pasa `source` y quedaria gateado con `curriculum:clone`. Fix diferido: enforzar en `cloneWithRecordType`.
- L16: **AcademicProgram ya declaraba `prefillFrom` (con `deepClone`? no — solo exclude+requiredCapability, dormido)**; con el opt-in su "Duplicar" queda IDENTICO a antes de S4 (sin source → sin applyPrefillFromSource → shallow puro). Zero cambio de comportamiento.
- L17 (tooling, ajeno al codigo): `@vitejs/plugin-vue` desaparecio del arbol de node_modules entre las 09:34 (tests verdes) y las 10:41, rompiendo la CARGA del `vitest.config.ts` del mod (que lo importa en L3). Preexistente/ambiental (posible actividad concurrente del dev con los servers up); NO causado por este ticket. Workaround de gate: config minimo. **Follow-up ambiental**: reinstalar `@vitejs/plugin-vue` en el mod.

**Quality review (DET-23) — dual-judge (DET-35, tier T3, core-touch de layout + core)**:

**Reviewer**: 2 jueces ciegos independientes (sub-agentes sonnet, contexto limpio) sobre el diff completo + fuentes + KB; fix-agent quirurgico (orquestador); 1 re-judge tras el fix.
**Tier de revision**: exhaustive (dual-judge)
**Resultado global**: pass (tras iterate sobre 1 finding confirmado + 1 verificado)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Ruteo por base + strip RT + unicidad explicita | pass | ambos jueces: `cloneWithRecordType` correcto; assertUniqueLineageRoot cubre el gap del guard por-patron |
| 2 | Reuso del motor + gate `$transaction` | pass | ambos: extension aditiva, sin consumidor existente de deepClone+source sin asNewVersion → cero regresion |
| 3 | Alcance de la capa 2 generica | **iterate→pass** | AMBOS jueces: over-reach a CurricularSection (deepClone dormido). **Fix**: opt-in `action.deepClone:true` (Fix A); re-judge APPROVED |
| 4 | `variableArgs` en customEndpoint | **iterate→pass** | juez 2 (info, latente): revertido a `Object.keys(variableMapping)`; carry de prefillFrom solo en rama inputVariable (Fix C) |
| 5 | RBAC server-side del clone | warn→BL-7 | juez 2 (verificado): Curriculum sin requiredCapability; diferido a BL-7 (severidad baja: curriculum:create ya permite crear) |
| 6 | copyRecordTypeExtension idempotencia | pass | ambos: PK `curriculumId`, sin id/timestamps propios; idempotente (existing check) |
| 7 | Regresion (versionado + AcademicProgram + poly) | pass | 11 e2e OM + 30 mod + 25 layout verdes |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → CLOSE-READY: S4 clone profundo entregado. dual-judge pass tras Fix A (opt-in) + Fix C. Pre-close: BL-6/BL-7 + reinstalar @vitejs/plugin-vue (L17).
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Findings del dual-judge**:
1. **Over-reach a CurricularSection** (blocking, ambos) → RESUELTO (Fix A: opt-in por accion; re-judge APPROVED).
2. **variableArgs latente** (info, juez 2) → RESUELTO (Fix C: revertido).
3. **RBAC clone Curriculum** (warning, juez 2 verificado) → DIFERIDO (BL-7, pre-merge).
4. **getRecordTypeFieldNames=[] edge** (warning, juez 2) → estado degenerado (Plan siempre tiene RT); fallo ruidoso, no corrupcion. Documentado.

### Verificación round-trip — matriz clon/versión × Plan/Minor (UI + BD real, 2026-07-23)

> Prueba end-to-end a pedido del dev: para Plan y Minor, **clonar+borrar** y **versionar+borrar** por la UI real (tenant UPU, rol Consultor, Clerk test), verificando en BD que se crean TODOS los datos y luego se eliminan TODOS. Entorno: S4 desplegado (resolvers synced + `instance.resolver.js` + config DB `deepClone:true` + suite relevantado tras `npm install`). OM `:4000` (nodemon) + suite `:3000`.

**Baseline BD (tenant UPU, limpio)**: `curriculum=6 · rt__Plan__curriculum=4 · rt__Minor__curriculum=1 · planEntry=20 · requirementCategory=16 · curricularSection=100 · requirement=12`. Todos los ciclos vuelven a este baseline exacto, con 0 huérfanos.

**Grafos fuente**: Plan `UV-ICIV-PLAN-2026` v1 Active = 4 cats + 6 planEntries + 1 sección (+1 RT sección) + 1 requisito (polimórfico) + RT base Plan(Sequential/240). Minor `22222` v1 Active = sin malla + RT base Minor (los Minor de este tenant no tienen malla).

| TC | Ciclo | Op | RT | Given | When (path real UI) | Then (esperado) | Actual (BD) | Evidence | Status |
|----|-------|----|----|-------|---------------------|-----------------|-------------|----------|--------|
| RT-1a | 1 | Clonar | Plan | Plan v1 con malla | Duplicar → confirmCascade → code `RTP-CLONE-PLAN` → Guardar | raíz nueva (v1, prev=null) con malla completa + RT, cross-refs a la copia | v1/prev=null; 4 cats + 6 entries + 1 sec + RT sec + RT base + 1 req; refs 6→propias/0→origen; globals +1 cur/+1 rtPlan/+6 pe/+4 cat/+1 sec/+1 req | globals delta + graph(clone) | ✅ pass |
| RT-1b | 1 | Borrar | Plan | clon `RTP-CLONE-PLAN` | Eliminar (row action) → confirmar | cascade completo, origen intacto | globals = baseline EXACTO (6/4/1/20/16/100/12); source Plan 4/6 intacto | globals + graph(source) | ✅ pass (UI) |
| RT-2a | 2 | Versionar | Plan | raíz fresca `RTP-VER-PLAN` v1 Active | Nueva versión | v2 con malla arrastrada + RT heredado + cross-refs remapeados a v2 | v2/prev=v1; 4 cats + 6 entries + 1 sec + RT base; refs 6→propias/0→origen; globals +2 cur/+6 pe/+4 cat… | graph(v2) + globals | ✅ pass |
| RT-2b | 2 | Borrar | Plan | `RTP-VER-PLAN` v2 + v1 | Eliminar v2 luego v1 | cascade completo | globals = baseline exacto; 0 huérfanos (tras limpiar requisitos polimórficos, ver hallazgo 2) | globals + orphan sweep | ✅ pass (BD; UI-cascade ya probado en RT-1b) |
| RT-3a | 3 | Clonar | Minor | Minor `22222` v1 (RT, sin malla) | Duplicar → confirmCascade → code `RTP-CLONE-MINOR` → Guardar | raíz nueva + RT Minor copiado; sin malla | v1/prev=null; RT Minor presente (rt__Minor 1→2); 0 cats/entries/sec (correcto) | graph(clone) + globals | ✅ pass |
| RT-3b | 3 | Borrar | Minor | clon `RTP-CLONE-MINOR` (aislado por búsqueda) | Eliminar (row action) → confirmar | cascade completo | globals = baseline exacto (rt__Minor 2→1) | globals | ✅ pass (UI) |
| RT-4a | 4 | Versionar | Minor | Minor `22222` v1 | Nueva versión | v2 + RT Minor heredado; sin malla | v2/prev=v1; RT Minor presente (rt__Minor 1→2); 0 malla (correcto) | graph(v2) + globals | ✅ pass |
| RT-4b | 4 | Borrar | Minor | `22222` v2 | Eliminar v2 | cascade completo, v1 intacto | globals = baseline exacto; v1 solo; 0 huérfanos rt__Minor/requirement | globals + find(22222) + orphan sweep | ✅ pass (BD; UI-cascade ya probado en RT-3b) |

**Notas de método**: los 4 CREATE por la UI real (Duplicar / Nueva versión → customEndpoint `createCurriculumWithRecordType` con `prefillFrom.source` / `asNewVersion`). DELETE: RT-1b y RT-3b por UI (cascade completo probado); RT-2b y RT-4b por BD — en Plan los artefactos de versión comparten nombre con el Plan real (el diálogo de borrado no los distingue → BD evita el riesgo), en Minor el grafo v2 es trivial. Verificación BD por conteos globales (capturan todo, incluso lo que una query por-entidad omite) + barrido de huérfanos.

**Hallazgos**:
1. **Versionar una fuente que ya tiene versión posterior no crea versión nueva** (`UV-ICIV-PLAN-2026` v1 con v2 → no generó v3; BD sin cambios, sin registro parcial). El versionado por UI sí funciona sobre raíces sin versiones previas (probado RT-2a, RT-4a). By-design (versionar la última) o limitación → **BL-8** (confirmar con producto). Ajeno a 1450 (versionado = S1-S3).
2. **El borrado real por UI (`deleteInstance`) es autoritativo y más completo que un cascade manual**: los `requirement` son polimórficos (`ownerType`/`ownerId`, no `curriculumId`) y tienen proyección RT (`rt__Group__requirement`); el UI-delete los borra completos (RT-1b dejó baseline exacto), mientras que un cascade manual por FK `curriculumId` los omite. El "baseline 13 requisitos" inicial traía **1 huérfano del smoke previo** (limpieza DB del smoke también lo omitió) → baseline real = 12, ya saneado.

### Session 5 — 2026-07-23 — Fixes pre-merge (post-review) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage + regresion dirigida; dual-judge del cambio RBAC, DET-35)

**Objetivo**: Cerrar la deuda pre-merge surgida del review de los cambios de 1450 (2026-07-23). NO agrega alcance funcional (la feature esta entregada y verificada en runtime, matriz round-trip). Cubre: (1) enforcement server-side de `curriculum:clone` (BL-7); (2) higiene de IDs internos DKC en el codigo + null explicito de `sourceEntryId` (DET-19); (3) restaurar el tooling del mod (L17); (4) blindar el path end-to-end con integracion por `createInstance`; (5) docs+KB del contrato RBAC (DET-37).

**Tasks completadas**:
- [x] S5.T1 — Enforcement server-side de `curriculum:clone` DENTRO de `cloneWithRecordType` (`checkCapability`), distinguiendo CLONE vs VERSIONADO. **[SUPERSEDED por S5.T6]**: el dual-judge detecto que el gate solo-en-el-adapter dejaba abierto el `createInstance` generico; se movio al motor (S5.T6) y este gate del mod se revirtio (BL-7)
- [x] S5.T2 — Higiene DET-19: quitar ` / TICKET-111` (dejar `UPONE-1450`) en layout (RecordList.vue:2859, RecordDetail.vue:4095, recordDetailInitialData.ts:26, recordlist.ts:269) + mod (logic/helpers/recordTypeExtension.js:4, docs/patterns/clone-strategies.md:14) + copia synced (regenerable); quitar `RULE-core-019` (deep-clone-direct.js:41, deep-clone-polymorphic.js:78, instance.resolver.js:3828) y `DET-16` (useCreateRowAction.ts:41) de los comentarios. **+ null explicito de `sourceEntryId`**: agregarlo a `prefillFrom.exclude` de `Curriculum.json` + codegen + sync. (`DECISION-006` en dynamic.js:1844 es GENERADO → no editar)
- [x] S5.T3 — Reinstalar `@vitejs/plugin-vue` en el mod (L17) y correr la suite COMPLETA del mod (256/256), no el config minimo de S4
- [x] S5.T4 — Test de integracion contra BD real por el `createInstance` COMPLETO (poly + direct + ambas fases derived en `$transaction`, resolviendo `deepClone` del registry) para un versionado Y un clon de Curriculum. Blinda el path que hoy solo cubren helpers + orquestacion mockeada + smoke manual
- [x] S5.T5 — DET-37: (dim1 docs) documentar el enforcement server-side de `curriculum:clone` en clone-strategies.md + prefill-capability.md; (dim2 KB) cerrar BL-7 + actualizar RULE-core-033 (corolario RBAC en ruteo por base) + registrar la aclaracion de `sourceEntryId` (campo del modelo LA sin consumidor)
- [x] S5.T6 — **Reemplazar el gate del mod (S5.T1) por enforcement en el MOTOR** (dual-judge iterate, DET-35): condicionar `prefillFrom.requiredCapability` a `!asNewVersion` en `instance.resolver.js` + declarar `curriculum:clone` en `Curriculum.json.prefillFrom` (patron de AcademicProgram/CurricularSection/BibliographyReference) + revertir el gate del mod y sus 4 tests RBAC. Cierra el bypass del `createInstance` generico (mutation publica) que el dual-judge confirmo, con enforcement unico y consistente entre objetos. 2 tests de motor nuevos (instance.resolver.test.js)
- [x] S5.GATE — Gate de sync Session 5 (tier T2): dual-judge del cambio RBAC (DET-35), regresion consolidada (OM + mod + layout), verificacion independiente (DET-33), docs+KB al dia (DET-37), decidir continue/close-ready. El CLOSE del ticket SIEMPRE requiere OK del dev (DET-30)

**Gate decision:** (approvedBy: dev)

- [x] continue → S5 fixes pre-merge entregado. RBAC del clone movido al MOTOR (S5.T6, consistente con AcademicProgram/CurricularSection/BibliographyReference): prefillFrom.requiredCapability:curriculum:clone + gate !asNewVersion → cierra el bypass del createInstance generico. Dual-judge iter1 (bypass del gate-en-mod) + iter2 (propagacion sync, ambos jueces) → resuelto por decision del dev: sync quirurgico del Base (curriculum.json aislado, resto drift restaurado) + 2 extras (guard artefacto/invariante + test integracion). Regresion: OM 110 (motor 99 + e2e 9 + guard 2), mod 1233, layout typecheck 0 nuevos. Docs+KB (clone-strategies, prefill-capability con nota de sync, rule-core-033) al dia. PENDIENTES PRE-CLOSE/MERGE: (1) codegen propaga la cap al registry en deploy (pipeline) — smoke post-deploy recomendado; (2) working tree de object-manager tiene drift pre-existente del dev (prisma/typedefs/otros Base) = decision de commit del dev; (3) commit+push = accion del dev (siempre-pregunta). El CLOSE del ticket (status:closed) SIEMPRE requiere OK explicito del dev (DET-30).
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Teaching — Intake

**Status**: ver frontmatter `teachings.intake` (`pending` | `done` | `skipped`).
**Archivo**: [`TICKET-111.teach/teach-intake.html`](TICKET-111.teach/teach-intake.html) (cuando existe)
**Visualizar en HC**: `http://localhost:3016/projects/up1/tickets/TICKET-111#teaching?teach=intake`

## Teaching — Close

**Status**: ver frontmatter `teachings.close` (`pending` | `done` | `skipped`).
**Archivo**: [`TICKET-111.teach/teach-close.html`](TICKET-111.teach/teach-close.html) (cuando existe)

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-07-21 | 2026-07-21 |
| intake-explore | done | 2026-07-21 | 2026-07-21 |
| teach-intake | done | 2026-07-21 | 2026-07-21 |
| design-feature | done | 2026-07-22 | 2026-07-22 |
| request-execute (S1-S5) | done | 2026-07-22 | 2026-07-23 |
| request-close | done | 2026-07-24 | 2026-07-24 |

## Summary

**Resultado**: cerrado 2026-07-24. Versionamiento profundo del plan de estudio entregado + ampliacion (clone profundo via "Duplicar"). 5/5 REQs verificados en runtime. Codigo mergeado a `develop` en object-manager, layout y mods/curriculum-design.

### What was done
- **Core** (`object-manager`): motor de deep-clone generalizado con `directChildrenDerived` (remap update-based de cross-refs entre hijos directos, ej. `planEntry.categoryId → requirementCategory`); enforcement RBAC `curriculum:clone` movido al motor (`prefillFrom.requiredCapability` + condicion `!asNewVersion`).
- **Mod** (`curriculum-design`): config `prefillFrom.deepClone` (4 aliases) + `directChildrenDerived` en `Curriculum.json`; glue del clone profundo por objectType base (helper `copyRecordTypeExtension` compartido con el versionado); `sourceEntryId` null explicito.
- **Frontend** (`layout`, CORE): handler generico de "Duplicar" manda `prefillFrom.source` (opt-in por accion `deepClone:true`); allowlist `recordDetailInitialData` + carry en customEndpoint.

### Verificacion
- Integration contra BD real (uplanner_upu): grafo clonado + cross-refs remapeados + RT base heredado + origen intacto.
- Smoke UI real por el dev: matriz round-trip clonar/versionar × Plan/Minor, cada ciclo crear→verificar→borrar→verificar, 0 huerfanos, baseline exacto restaurado. RBAC vivo confirmado post sync+codegen.
- Regresion: OM 110, mod 1233, layout typecheck sin nuevos errores.

### Knowledge promovido
- RULE-core-032 (`directChildrenDerived`), RULE-core-033 (RBAC ruteo por base), BUG-core-004 (resuelto/aclarado: RT base cubierto por hook del mod).

### Story Points
- Published 8 · Estimated 13 (creció con S4) · **Executed 8** (override manual del dev; heuristica sugirió 5, delta +3 por core-touch 3 repos + ampliacion + 3 dual-judges).

### Pendiente (backlog `could`, no bloqueante)
- BL-3 (proyecciones RT de hijos directos, latente), BL-8 (re-versionar version no-ultima), BL-9 (trazabilidad `sourceEntryId` a nivel fila), BL-10 (baseline RBAC create vs clone/version).
- Pre-deploy: codegen propaga la capability RBAC al registry en el build; smoke post-deploy recomendado (ya verificado en local).

### Cierre
- teach-close generado y validado. Validacion de cierre reforzada (1d): saltada por decision del dev (rama ya mergeada+borrada; smoke matrix del dev + dual-judges por gate como evidencia equivalente).
