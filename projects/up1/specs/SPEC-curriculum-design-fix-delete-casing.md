---
id: SPEC-curriculum-design-fix-delete-casing
project: up1
ticket: TICKET-107
status: in_progress
---

# Fix: false-Restrict por casing en el motor de delete cascade + hardening

# Fix: false-Restrict por casing en el motor de delete cascade + hardening

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en Requirements, Fix scope y Tasks. Si te basta el Executive summary para decidir, ese es el objetivo.*

**Que se quiere**: corregir un defecto bloqueante del motor de hard delete en cascada (introducido en UPONE-1382, rama `feat/UPONE-1382-hard-delete-cascade`, aun sin mergear): hoy borrar un `Curriculum` (Plan) que tiene alguna `requirementCategory` queda bloqueado por un falso `Restrict`, porque el motor compara la clave del subarbol con distinto casing (`requirementCategory:id` vs `RequirementCategory:id`). El bug no lo caza la suite porque dos unit tests cargan un nombre PascalCase que no existe en el JSON real. Ademas se limpian tres puntos de calidad del motor (performance, dead code, ids internos), se completa el i18n en/pt del boton de borrado y se registra el conocimiento de la review en el KB.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Fix por normalizacion de la comparacion (no parche de solo-JSON a PascalCase) | El parche de JSON arregla el sintoma pero deja la comparacion fragil para el proximo hijo declarado en minuscula. Normalizar cierra la causa raiz, pero toca core (blast radius amplio) |
| 2 | Cierre por integration contra BD real + smoke UI, no solo unit | La memoria de proyecto ("unit mockeados consagran bugs de runtime") aplica exacto: el unit mockeado con casing inventado deja el bug verde. El cierre exige evidencia runtime |
| 3 | Completar i18n en/pt del `compositeSectionTree` en este fix | Estaba en el `execute_scope` del ticket; sin esto el boton/modal de borrado sale con key cruda en en/pt (regresion visible parcial). Confirmado por el dev |
| 4 | Ejecutar el KB de la review (bug + rule + learn + decision) en S3 | Consolida el aprendizaje de la review con el contexto fresco (DET-16 propagacion). Confirmado por el dev |

**Riesgos principales y como los mitigamos**:

- **Regresion silenciosa en otros casos de la matriz UPONE-1382** (planEntry, requirement, cadenas de version, referencias externas legitimas que SI deben bloquear) → REQ-REGRESSION-01 con integration TC-3 (planEntry) + suite unit completa del motor re-corrida; el fix normaliza la comparacion sin cambiar que cuenta como referencia externa.
- **El fix vive en core → blast radius amplio** → S1 termina con gate ⚑ fuerte que incluye revision del equipo core (RULE-dev-004) antes del merge a `develop`.
- **Falso verde repetido** (corregir solo el unit y creer que basta) → el gate de S1 exige integration BD real + smoke UI, no acepta unit mockeado como evidencia de comportamiento (DET-33/DET-36).

**Que NO se hace en este ticket** (limites explicitos):

- Merge a `develop`, resolucion de los conflictos de layouts y la capa RBAC de UPONE-1393 — se retoman por separado al reintegrar la rama.
- Refactor del motor mas alla de los tres puntos de calidad identificados (C2/C3/C4). No es un rewrite.
- Cambiar el contrato del plan (`SPEC-curriculum-design-hard-delete-cascade`): nodes/edges/restrictions/deleteOrder/summary se preservan.

**Tamano estimado**: 3 sessions ejecutables (S1-S3), aproximadamente 4-6h efectivas. La mas riesgosa es **S1** (fix de core + validacion empirica del delete real + revision del equipo core).

**Como vas a saber que funciona**:

- Borras un Plan con categorias de requisito desde el RecordList y el modal muestra el conteo de cascada (no el bloqueo "esta en uso por N Categorias"); el Plan y sus categorias desaparecen.
- La suite del motor (`deleteImpactPlan.test.js`) sigue verde con el casing real del JSON, y hay tests de integration nuevos contra la BD que reproducen el caso.
- El boton/tooltip/modal de borrado sale traducido en en/pt.

---

## Purpose

Corregir el false-`Restrict` del motor `deleteImpactPlan` (object-manager, core) al borrar un `Curriculum` con hijos `requirementCategory`, causado por comparar `PascalName` crudo contra claves de subarbol construidas con el `object` de metadata en minuscula. El fix normaliza la comparacion de pertenencia al subarbol, corrige la cobertura de tests (unit con casing real + integration BD real + smoke UI), hace hardening del motor (perf, dead code, ids DET-19), completa i18n en/pt y registra el KB de la review. Es follow-up local de TICKET-104/UPONE-1382 sobre trabajo aun no integrado a `develop`.

## Requirements

### REQ-FIX-01: el motor no marca false-Restrict al borrar Curriculum con requirementCategory

> **Que cambia**: borrar un Plan que tiene categorias de requisito ya no se bloquea con "esta en uso por N Categorias de requisito"; el motor las reconoce como hijos poseidos y las arrastra en la cascada.
> **Por que**: hoy la comparacion de claves del subarbol usa distinto casing (`RequirementCategory:id` vs `requirementCategory:id`), asi el hijo se cuenta como referencia externa y el plan pasa a `restricted`.

El sistema MUST reconocer un nodo que pertenece al subarbol del plan como child-reference (cascade), no como referencia externa (Restrict), independiente del casing con que la metadata declare el `object` del hijo. La comparacion de pertenencia MUST hacerse sobre identidad normalizada (`objectType:id`), no sobre `PascalName` crudo contra la clave de metadata.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: Plan con requirementCategory, sin refs externas
- **GIVEN** un `Curriculum` (recordType Plan) con >=1 `requirementCategory` (`curriculumId` al plan) y sin referencias externas al subarbol
- **WHEN** se ejecuta `deleteImpactPreview` o `deleteBulkInstances("Curriculum", [planId])`
- **THEN** `plan.status` NO es `restricted`
- **AND** las `requirementCategory` aparecen como nodos `deleteMode: cascade` en el plan

#### Scenario: Plan con requirementCategory referenciada externamente (Restrict legitimo se preserva)
- **GIVEN** un Plan con una `requirementCategory` que SI es referenciada por un objeto fuera del subarbol
- **WHEN** se ejecuta el preview
- **THEN** el motor marca `restricted` por esa referencia externa real (el fix NO suprime Restrict legitimos)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: desde el RecordList, borra un Plan con categorias de requisito; el modal muestra conteo de cascada y confirma el borrado, en vez del mensaje de bloqueo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-1 unit casing real | fixture del motor con metadata como el JSON real (`object: requirementCategory`) | build del plan | la categoria NO se marca externa | `nodeMap` tiene `requirementCategory:RC1` con `deleteMode: cascade`; `plan.status != restricted` |
| 2 | TC-2 integration | UPU: Plan + requirementCategory sin refs externas | delete real por BD | cascada sin bloqueo | plan + rt/ext + requirementCategory borrados; DataLog por nodo |

### REQ-REGRESSION-01: se preserva la matriz de comportamiento de UPONE-1382

> **Que cambia**: nada visible; el resto de casos del motor (planEntry, requirement, cadenas de version, referencias externas legitimas) siguen comportandose igual tras normalizar la comparacion.
> **Por que**: el fix toca la comparacion de subarbol usada por todos los objetos; hay que garantizar que no introduce regresiones.

El sistema MUST mantener el comportamiento correcto para el resto de la matriz de TICKET-104: `planEntry` poseido en cascade con Restrict solo si hay `Activity` referenciada; `requirement` polimorfico segun `ownerType`; cadenas de version y referencias externas legitimas siguen produciendo `Restrict` accionable.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: Plan con planEntry (no regresiona)
- **GIVEN** un Plan con `planEntry` (FK `planId`)
- **WHEN** se ejecuta el delete/preview tras el fix
- **THEN** el comportamiento es el de la matriz UPONE-1382 (cascade del planEntry poseido; Restrict solo si Activity referenciada)

#### Scenario: suite unit del motor verde con casing real
- **GIVEN** los unit corregidos al `object` real del JSON
- **WHEN** se corre `vitest` del motor
- **THEN** la suite pasa sin falsos verdes por PascalCase inventado

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-3 integration planEntry | UPU: Plan + planEntry | delete real por BD | cascada de planEntry poseido | comportamiento matriz UPONE-1382; sin false-Restrict ni sobre-cascada |

### REQ-QUALITY-01: detectRestrictions no relee core_FieldDefinition por nodo

> **Que cambia**: en arboles grandes (Plan con cientos de secciones) el preview y el commit dejan de disparar miles de queries redundantes.
> **Por que**: hoy `findIncomingReferences` hace `core_FieldDefinition.findMany` por cada nodo y recorre todos los modelos, sincronico al abrir el modal; riesgo de latencia/timeout.

El sistema SHOULD leer `core_FieldDefinition` una sola vez por plan (hoisted) y acotar los modelos candidatos, sin cambiar el resultado del plan.

**Actor**: system
**Layers**: backend

### REQ-QUALITY-02: se elimina la recursion muerta de walkDirectChildren

> **Que cambia**: el inner-loop de `grandchildren`/`frontier` de `walkDirectChildren` (`:458-470`), cuyos resultados se descartan, se elimina o se hace agregar nodos de verdad.
> **Por que**: hoy dispara `findMany` de mas por cada borrado y seria un bug de huerfanos si un directChild futuro declara `recursiveBy` con `object` distinto del padre.

El sistema SHOULD no ejecutar recorrido recursivo cuyo resultado se descarta.

**Actor**: system
**Layers**: backend

### REQ-QUALITY-03: comentarios del motor usan el id externo (DET-19)

> **Que cambia**: los comentarios del motor citan `UPONE-1382` en vez de ids internos de gestion (`TICKET-104`, `BUG-curriculum-design-003`).
> **Por que**: DET-19 — otros devs leen el repo sin acceso a DKC; el resto de repos y los commits ya usan `UPONE-1382`.

El sistema MUST no exponer ids internos de gestion de DKC en comentarios del codigo del repo. La cita a `RULE-core-023` (`:752`) se verifica: la rule existe en el KB (`rules/core/rule-core-023.md`), solo se confirma que el naming/anchor sigue vigente.

**Actor**: system
**Layers**: backend

### REQ-I18N-01: compositeSectionTree presente en es/en/pt

> **Que cambia**: el boton/tooltip/modal de borrado del `compositeSectionTree` sale traducido en en/pt, no con la key cruda.
> **Por que**: las keys `compositeSectionTree.buttons.delete` y `compositeSectionTree.delete.*` se agregaron solo a `lang/es`; en/pt salen con fallback.

El sistema MUST tener el namespace `compositeSectionTree` completo en `lang/es`, `lang/en` y `lang/pt` del mod curriculum-design, sincronizado a core con `npm run sync`.

**Actor**: user
**Layers**: frontend, config

### REQ-KB-01: el conocimiento de la review queda registrado en el KB

> **Que cambia**: el false-Restrict, la rule de normalizacion de casing, el learn de tests y la decision de la asimetria preview/delete quedan registrados como artefactos del KB.
> **Por que**: DET-16 propagacion — el aprendizaje de la review no se pierde y aplica a futuros cambios del motor.

El sistema MUST registrar los items B1-B5 del backlog del ticket (bug, rule, learn, verificacion de cita, decision C5) como artefactos DKC validados, con OK del dev (ya confirmado).

**Actor**: system
**Layers**: config

## Fix scope

### Antes (comportamiento actual)
Borrar un `Curriculum` con >=1 `requirementCategory` → `plan.status = restricted`, la mutacion devuelve `errors[]` con "«<nombre>» esta en uso por N Categorias de requisito. Resuelvelo antes de eliminar." UI/MCP bloquean. Los unit estan verdes porque cargan `object: 'RequirementCategory'` (PascalCase inexistente en el JSON real).

### Despues (comportamiento esperado)
El motor reconoce `requirementCategory` como hijo del subarbol (comparacion normalizada) → cascada del plan + sus categorias, sin bloqueo. Los unit cargan el `object` real del JSON; hay integration BD real que reproduce el caso; el smoke por RecordList confirma el render.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` | Normalizar comparacion de claves (`:669-671`, `:473`, `:722`/`:735`); hoistear `core_FieldDefinition` (`~:683`); limpiar recursion muerta (`:458-470`); ids DET-19 (`:16`, `:26`, verificar `:752`) | Core compartido: afecta `deleteInstance`/`deleteBulkInstances` de TODOS los objetos → revision del equipo core (RULE-dev-004) |
| `object-manager/tests/unit/resolvers/deleteImpactPlan.test.js` | Corregir `object: 'RequirementCategory'` → casing real del JSON en T4 (`:275`) y en el test de historyKey (`:550`) | Cierra el falso verde; la suite valida el fix real |
| `object-manager/tests/integration/` | Casos nuevos: Curriculum→requirementCategory (TC-2) y Curriculum→planEntry (TC-3) contra BD real | Cobertura runtime que la matriz de TICKET-104 no tenia |
| `mods/curriculum-design/lang/en/common.i18n.json`, `lang/pt/common.i18n.json` | Agregar namespace `compositeSectionTree` (+ `npm run sync`) | Cierra la regresion visible i18n del boton/modal de borrado |

## Tasks

### Session 1 — C1: corregir el false-Restrict (root cause + tests reales) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Normalizar la comparacion de pertenencia al subarbol: comparar `objectType:id` normalizado en `filterExternal` (y las claves de `walkDirectChildren`), no `PascalName` crudo contra la clave de metadata | REQ-FIX-01 | developer | — | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js | TC-1 unit (casing real) verde + trazado del filterExternal | git revert | DET-5, DET-8, DET-16, RULE-dev-004, RULE-core-023 | pending | 1 |
| S1.T2 | Corregir los unit que cargan `object` PascalCase inexistente: T4 (`:275`) y el test de historyKey (`:550`) al casing real del JSON (`requirementCategory`) | REQ-FIX-01 | developer | S1.T1 | object-manager/tests/unit/resolvers/deleteImpactPlan.test.js | vitest unit del motor verde con casing real | git revert | DET-7, DET-33 | pending | 1 |
| S1.T3 | Agregar integration BD real: TC-2 (Curriculum + requirementCategory → cascada) y TC-3 (Curriculum + planEntry → matriz UPONE-1382 sin regresion) | REQ-FIX-01, REQ-REGRESSION-01 | developer | S1.T1 | object-manager/tests/integration/ | vitest integration contra BD real (UPU) pasa | git revert | DET-7, DET-13, DET-33 | pending | 1 |
| S1.T4 | Smoke por el path real (RecordList) en UPU: borrar el Plan con requirementCategory y verificar conteo de cascada (no Restrict) + screenshot | REQ-FIX-01 | reviewer | S1.T1, S1.T3 | object-manager (runtime UPU) | smoke UI con evidencia runtime (screenshot/DOM), no referencia a test file | (no aplica) | DET-13, DET-36 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir resultados en `## Sessions` del ticket con Template de Gate, correr regression del modulo + integration + smoke, revision del equipo core (RULE-dev-004), decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + evidencia runtime + OK revision core documentado | (no aplica — cierre de session) | DET-20, DET-23, DET-33, DET-36, RULE-dev-004 | pending | 1 |

### Session 2 — C2/C3/C4: hardening del motor [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Hoistear la lectura de `core_FieldDefinition.findMany` a una sola vez por plan y acotar los modelos candidatos (perf) | REQ-QUALITY-01 | developer | S1.GATE | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js | vitest motor verde + conteo de queries por nodo reducido | git revert | DET-5, DET-16 | pending | 2 |
| S2.T2 | Eliminar o corregir la recursion muerta de `walkDirectChildren` (`:458-470`) para que no dispare `findMany` descartado | REQ-QUALITY-02 | developer | S2.T1 | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js | vitest motor verde sin regresion de nodes/edges | git revert | DET-5, DET-16 | pending | 2 |
| S2.T3 | Reemplazar ids internos de gestion por `UPONE-1382` en comentarios (`:16`, `:26`) y verificar que la cita a `RULE-core-023` (`:752`) sigue vigente (DET-19) | REQ-QUALITY-03 | developer | S2.T2 | object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js | grep sin `TICKET-104`/`BUG-` en el motor; cita RULE-core-023 valida | git revert | DET-19 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir en ticket, correr suite unit del motor + coverage delta, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + suite verde sin regresion + sin ids internos | (no aplica — cierre de session) | DET-20, DET-23 | pending | 2 |

### Session 3 — C6/C5 + mantenimiento del KB [tipo: auto] [tier: T1]

parallel_groups: [[S3.T1, S3.T2, S3.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Completar namespace `compositeSectionTree` en `lang/en` y `lang/pt` del mod (paridad con `lang/es`) + `npm run sync` | REQ-I18N-01 | developer | S2.GATE | mods/curriculum-design/lang/en/common.i18n.json, mods/curriculum-design/lang/pt/common.i18n.json | keys presentes en es/en/pt + sync sin drift | git revert | DET-16 | pending | 3 |
| S3.T2 | Registrar la decision de la asimetria preview (siempre corre motor) vs delete real (gateado por hijos) (C5/B5) | REQ-KB-01 | reviewer | S2.GATE | projects/up1/decisions/ | `dkc-validate` de la decision verde | (no aplica) | DET-4, DET-16 | pending | 3 |
| S3.T3 | KB maintenance: bug del false-Restrict (B1), rule de normalizacion de casing (B2), learn de tests con casing real (B3), verificar cita RULE-core-023 (B4) | REQ-KB-01 | reviewer | S2.GATE | projects/up1/bugs/curriculum-design/, projects/up1/rules/core/ | `dkc-validate` Bug/Rule verde; learn capturado | (no aplica) | DET-16, DET-33 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T1)** — persistir en ticket, validar i18n en 3 locales + records KB, decidir continue/close | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + i18n verde + records KB validados | (no aplica — cierre de session) | DET-20, DET-23 | pending | 3 |

### Task contract (detalle de tasks criticas)

```
Task S1.T1: Normalizar la comparacion de pertenencia al subarbol
- source_ref: REQ-FIX-01
- agent: developer
- files: object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js
- precondition: rama feat/UPONE-1382-hard-delete-cascade activa en object-manager
- expected_output: filterExternal compara identidad normalizada (objectType:id); un hijo del subarbol nunca se cuenta como referencia externa por casing
- validation: TC-1 unit con casing real del JSON pasa; trazado manual del filterExternal
- rollback: git revert
- rules: [DET-5, DET-8, DET-16, RULE-dev-004, RULE-core-023]

Task S1.T3: Integration BD real
- source_ref: REQ-FIX-01, REQ-REGRESSION-01
- agent: developer
- files: object-manager/tests/integration/
- precondition: object-manager dev + BD UPU levantados y seed aplicado
- expected_output: TC-2 (Curriculum+requirementCategory cascada) y TC-3 (Curriculum+planEntry matriz) pasan contra BD real
- validation: vitest integration verde; DataLog por nodo verificado
- rollback: git revert
- rules: [DET-7, DET-13, DET-33]

Task S1.T4: Smoke por el path real
- source_ref: REQ-FIX-01
- agent: reviewer
- files: (runtime UPU, RecordList)
- precondition: suite UI levantada, Plan con requirementCategory en UPU
- expected_output: el modal muestra conteo de cascada (no bloqueo Restrict) y confirma el borrado
- validation: evidencia runtime real (screenshot/DOM con marca de corrida), no referencia a test file (DET-36)
- rollback: (no aplica)
- rules: [DET-13, DET-36]
```

## Constraints

- RULE-dev-004: trabajo core en rama unica de epica + revision del equipo core antes de merge a `develop` — aplica porque `deleteImpactPlan.js` es core compartido.
- RULE-core-023: heuristica polimorfica `ownerType === node.objectType` (child por convencion) — el fix no debe romperla; se apoya en ella para no marcar hijos polimorficos como externos.
- DET-19: artefactos del repo usan `UPONE-1382`, no ids internos de DKC.
- DET-33: el self-report de los tests no es hecho; verificar con integration + smoke reales.
- DET-36: verificacion runtime/UI real para el smoke (screenshot/DOM), no static.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| BD tenant UPU (`uplanner_upu`) | internal | Necesaria para integration TC-2/TC-3 y smoke TC-4 del delete real | Sin ella S1.T3/S1.T4 quedan `blocked`; el fix no se cierra por evidencia |
| Revision del equipo core (RULE-dev-004) | external (humano) | Gate ⚑ fuerte de S1 antes del merge | Bloqueante externo; el fix queda listo pero sin merge hasta el OK |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresion silenciosa en otros casos de la matriz (planEntry, requirement, refs externas legitimas) | medium | Restrict falso o sobre-cascada en otro objeto | REQ-REGRESSION-01 + TC-3 integration + suite unit completa re-corrida |
| Fix incompleto (parche de solo-JSON) que deja la comparacion fragil | medium | El proximo hijo declarado en minuscula reintroduce el bug | Normalizar la comparacion (DEC-LOCAL-01), no parchear el JSON |
| Falso verde repetido (creer que basta el unit) | medium | El bug sobrevive el fix | Gate S1 exige integration BD real + smoke UI (DET-33/DET-36) |
| Cambio en core rompe consumidores no detectados | low | `deleteInstance`/`deleteBulkInstances` de otros objetos | Revision del equipo core (RULE-dev-004) + integration |

## Open questions

- Ninguna abierta. Las consultas del intake (C5 asimetria, C6 i18n) fueron resueltas con el dev: C6 se completa en S3.T1; C5 se registra como decision en S3.T2. El KB (B1-B5) se ejecuta en S3.

## Decisions

### DEC-LOCAL-01: normalizar la comparacion vs parche de solo-JSON
- **Contexto**: el false-Restrict se puede arreglar cambiando `Curriculum.json` a `object: 'RequirementCategory'` (matchea el PascalName) o normalizando la comparacion en el motor.
- **Drivers**: cerrar la causa raiz vs minimizar blast radius; fragilidad para futuros hijos declarados en minuscula; memoria "resolver nombres por introspeccion, no por string".
- **Opcion elegida**: normalizar la comparacion en `filterExternal`/`walkDirectChildren` (comparar `objectType:id` normalizado).
- **Alternativas**: parche de solo-JSON a PascalCase — descartado: arregla el sintoma pero deja la comparacion fragil para el proximo hijo en minuscula.
- **Consecuencias**: gana robustez general y cierra la causa raiz; cuesta tocar core (revision del equipo core, RULE-dev-004) y exige integration + smoke.
- **Session**: design-fix (a confirmar en S1 al implementar).

## Technical reference

- Clave del nodo: `deleteImpactPlan.js:473` — `const key = \`${object}:${child.id}\`` (usa `object` verbatim, minuscula del JSON).
- Filtro externo: `:669-671` — `filterExternal = (referencingObjectPascal, ids) => ids.filter(id => !subtreeKeys.has(\`${referencingObjectPascal}:${id}\`))`.
- PascalName: `:722` — `const PascalName = modelName.charAt(0).toUpperCase() + modelName.slice(1)`, pasado a `filterExternal` en `:735`.
- Metadata real: `Curriculum.json` declara `"object": "requirementCategory"` (minuscula); FK por convencion `curriculumId`.
- Unit con casing inventado: `deleteImpactPlan.test.js:275` (T4) y `:550` (historyKey) declaran `object: 'RequirementCategory'`.
- i18n: `mods/curriculum-design/lang/es/common.i18n.json` tiene `compositeSectionTree`; `lang/en` y `lang/pt` no (confirmado 2026-07-15).

## Acceptance checkpoints

- [ ] **Funcional**: borrar Curriculum con requirementCategory cascada sin Restrict (REQ-FIX-01); matriz UPONE-1382 preservada (REQ-REGRESSION-01).
- [ ] **Tests**: TC-1 unit con casing real verde; TC-2/TC-3 integration BD real pasan; suite del motor sin falsos verdes.
- [ ] **Runtime**: smoke por RecordList en UPU con evidencia real (screenshot/DOM) — DET-36.
- [ ] **Rules**: RULE-dev-004 (revision core) ejecutada; DET-19 (sin ids internos) cumplida.
- [ ] **Integration**: no rompe `deleteInstance`/`deleteBulkInstances` de otros objetos.
- [ ] **i18n**: `compositeSectionTree` presente en es/en/pt + sync sin drift.
- [ ] **KB**: bug (B1), rule (B2), learn (B3), verificacion de cita (B4), decision C5 (B5) registrados y validados.

## Rules discovered

- RULE-core-031: comparar pertenencia por identidad normalizada, no por el nombre de tipo crudo (scope global, level must). Promueve la memoria "resolver nombres por introspeccion, no por string".

## Bugs found

- BUG-curriculum-design-012: false-Restrict al borrar Curriculum con requirementCategory por casing heterogeneo (severity high, status fixed en a0f65cb).

## Archiving

Cuando esta spec deje de ser fuente de verdad (fix mergeado y consolidado en `SPEC-curriculum-design-hard-delete-cascade`), usar `/dkc-archive-spec SPEC-curriculum-design-fix-delete-casing "{razon}"`.
