---
id: SPEC-curriculum-design-batch-add-prereq-and-picker-selected
project: up1
ticket: TICKET-125
status: in_progress
---

# Alta en lote: prereqs cuentan co-agregados + toggle "ver solo lo seleccionado" en el picker

# Alta en lote: prereqs cuentan co-agregados + toggle "ver solo lo seleccionado" en el picker

## Purpose

Follow-up local de UPONE-1539 (malla modular de `curriculum-design`). Corrige el chequeo de prerrequisitos del
alta en lote para que cuente a los cursos co-agregados en el mismo lote como colocados (hoy reporta falsos "faltantes"),
y suma un toggle "ver solo lo seleccionado" en el picker del `AddEntryModal` para revisar el lote antes de confirmar.
Ambos cambios son de lógica pura testeable + un control de UI, sin tocar el evaluador de prereqs.

## Requirements

### REQ-1: El chequeo de prereqs del alta en lote cuenta los co-agregados como colocados

> **Que cambia**: Al agregar un curso junto con sus prerrequisitos en un mismo lote, el chequeo deja de reportar el
> prereq como "faltante" cuando ese prereq viaja en el propio lote.
> **Por que**: El propósito del alta en lote es resolver la cadena de prereqs de un tirón; hoy el chequeo ignora a los
> co-agregados del lote y advierte algo que no corresponde (repro ADM-1 + ADM-5).

El sistema MUST tratar cada `targetActivityId` del lote como colocado al evaluar las demás actividades del mismo lote.
`findMissingPrereqsForBatch` (`prereqCheck.logic.ts`) MUST inyectar entries sintéticas de los `targetActivityIds` del
lote como colocadas al llamar `findMissingPrereqs` por cada actividad; en la malla modular esas entries sintéticas MUST
marcarse al período centinela `MODULAR_PLACED_PERIOD` (satisfacción por presencia, coherente con `deriveLevel`).
El evaluador (`findMissingPrereqs` / `evaluateRequirementTree`) NO se modifica.

**Actor**: user (arma el alta guiada modular)
**Layers**: frontend (lógica pura del mod + su caller)

<details><summary>Scenarios de validacion</summary>

#### Scenario: co-add curso + su prereq → no reporta faltante
- **GIVEN** un plan modular sin ADM-1, ADM-2 ni ADM-5 colocados
- **WHEN** el usuario agrega en un mismo lote ADM-1 y ADM-5 (ADM-5 tiene prereq OR {ADM-1, ADM-2})
- **THEN** el chequeo del lote NO reporta el prereq de ADM-5 como faltante (ADM-1 cuenta como colocado por estar en el lote)

#### Scenario: agregar solo el dependiente sin el prereq → sí falta
- **GIVEN** un plan modular sin ADM-1 ni ADM-2 colocados
- **WHEN** el usuario agrega solo ADM-5 (sin ADM-1/ADM-2 ni en el plan ni en el lote)
- **THEN** el chequeo SÍ reporta el prereq de ADM-5 como faltante (el fix no apaga el chequeo real)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en la malla modular, agrega un curso y su prerrequisito en el mismo lote
guiado y confirma que no aparece la advertencia de prereq faltante; al agregar solo el curso dependiente, la advertencia
sí aparece.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | co-add satisface | plan sin ADM-1/2/5 | agrega ADM-1 + ADM-5 en lote | prereq de ADM-5 no falta | `missing` vacío para ADM-5 |
| 2 | dependiente solo | plan sin ADM-1/2 | agrega solo ADM-5 | prereq de ADM-5 falta | ADM-5 reporta OR "0 de 1 colocados" |

### REQ-2: Toggle "ver solo lo seleccionado" en el picker del AddEntryModal

> **Que cambia**: El picker de asignaturas del alta gana un toggle que, al activarse, filtra la lista a solo los items
> ya seleccionados.
> **Por que**: Con el alta guiada multinivel el lote crece; hace falta revisar de forma práctica qué se está por
> ingresar antes de confirmar.

El sistema SHOULD ofrecer un toggle "ver solo lo seleccionado" en el picker del `AddEntryModal`. Se agrega
`filterBySelected(items, selectedIds, onlySelected)` (nuevo) en `activityPicker.logic.ts` como último eslabón del
pipeline puro `visibleItems` (tras `excludePlaced → dept → text`): con el toggle inactivo devuelve la lista sin cambios;
con el toggle activo devuelve solo los items cuyo id está en `selectedIds`. El control/toggle se agrega en
`AddEntryModal.ts` y se etiqueta vía i18n en es/en/pt.

**Actor**: user (arma el alta en el picker)
**Layers**: frontend (lógica pura del pipeline + control del modal + i18n)

<details><summary>Scenarios de validacion</summary>

#### Scenario: activar el toggle filtra a lo seleccionado
- **GIVEN** un picker con N items visibles y M seleccionados (M < N)
- **WHEN** el usuario activa el toggle "ver solo lo seleccionado"
- **THEN** el picker muestra únicamente los M items seleccionados

#### Scenario: toggle inactivo no altera el pipeline
- **GIVEN** un picker con el toggle inactivo
- **WHEN** se computa `visibleItems`
- **THEN** el resultado es idéntico al pipeline previo (excludePlaced → dept → text), sin filtrar por selección

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en el picker del alta, selecciona algunos items, activa "ver solo lo
seleccionado" y ve que la lista se reduce a esos items; al desactivarlo, vuelve la lista completa filtrada.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | toggle activo | items=[a,b,c], selected=[a,c] | onlySelected=true | filtra a seleccionados | `[a, c]` |
| 2 | toggle inactivo | items=[a,b,c], selected=[a,c] | onlySelected=false | sin cambios | `[a, b, c]` |

### REQ-3: Paridad del fix de REQ-1 en up1-mcp (condicional)

> **Que cambia**: Si up1-mcp hace alta en lote con inter-satisfacción de prereqs, replica el fix de REQ-1; si no,
> queda documentado como N/A con evidencia.
> **Por que**: El mismo bug podría existir en el path del MCP; hay que confirmarlo, no asumirlo.

El sistema MUST verificar si up1-mcp realiza alta en lote con inter-satisfacción de prereqs (equivalente a
`createPlanEntriesBatch`). Si existe ese path, MUST replicar el fix de REQ-1 (contar los co-agregados del lote como
colocados). Si el MCP agrega de a una actividad (sin lote inter-satisfactorio), MUST documentar N/A con evidencia
(archivo:línea del path que agrega de a una y ausencia del batch inter-satisfactorio).

**Actor**: system (path del MCP)
**Layers**: backend (up1-mcp `src/mods/curriculum-design/`)

<details><summary>Scenarios de validacion</summary>

#### Scenario: el MCP hace alta en lote inter-satisfactoria
- **GIVEN** up1-mcp expone alta en lote con inter-satisfacción de prereqs
- **WHEN** se agrega curso + su prereq en el mismo lote vía MCP
- **THEN** el fix de REQ-1 aplica y el prereq no se reporta faltante

#### Scenario: el MCP agrega de a una
- **GIVEN** up1-mcp agrega actividades de a una (sin lote inter-satisfactorio)
- **WHEN** se revisa el path de alta
- **THEN** REQ-3 se documenta N/A con evidencia archivo:línea

</details>

#### Acceptance
**El usuario puede verificar que funciona**: existe un registro de verificación (fix portado con test, o N/A con
evidencia del path del MCP) que confirma la decisión de paridad.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | paridad aplica | MCP con batch inter-satisfactorio | co-add vía MCP | prereq no falta | fix portado + test verde |
| 2 | paridad N/A | MCP agrega de a una | revisión del path | N/A documentado | evidencia archivo:línea |

### REQ-4: Quitar el hint redundante junto al botón "Agregar asignatura" en la malla modular

> **Que cambia**: Se remueve el texto de ayuda (`curriculumMesh.modularAdd.hint`) que acompañaba al botón "Agregar
> asignatura" en la malla modular.
> **Por que**: El banner modular ya informa que los niveles se recalculan solos; el hint repetía el mismo mensaje y
> agregaba ruido visual sin aportar información nueva.

El sistema MUST dejar de mostrar el hint redundante junto al botón "Agregar asignatura" en la malla modular. Se remueve
el `<span class="cm-modular-add__hint">` de `CurriculumMeshElement.vue`, su CSS asociado (`.cm-modular-add__hint`) y la
key i18n `curriculumMesh.modularAdd.hint` en es/en/pt. El banner modular existente queda como única fuente del mensaje
de recálculo automático de niveles.

**Actor**: user (opera la malla modular)
**Layers**: frontend (componente Vue + CSS + i18n)

**Status**: confirmed
**source_ref**: commit 97477bd (feat/UPONE-1539-modular-mesh); smoke Playwright (hint ausente)

#### Acceptance
**El usuario puede verificar que funciona**: en la malla modular, junto al botón "Agregar asignatura" ya no aparece el
texto de ayuda repetido; el banner modular sigue informando el recálculo automático de niveles.

### REQ-5: Texto de ayuda del campo `progression` más claro

> **Que cambia**: El help text del campo `progression` en `default_Curriculum_edit.json` pasa a explicar cuándo es
> editable y qué implica cambiarlo con la malla cargada.
> **Por que**: El texto previo no dejaba claro que el modo solo se edita con la malla vacía y que, con asignaturas,
> cambiarlo crea una nueva versión del plan.

El sistema SHOULD mostrar como ayuda del campo `progression` el texto: "Solo editable con la malla vacía. Con
asignaturas, crea una nueva versión del plan para cambiar el modo." El cambio es de configuración, en
`default_Curriculum_edit.json`.

**Actor**: user (edita el plan/currículo)
**Layers**: frontend (config de layout)

**Status**: confirmed
**source_ref**: commit f45e291 (feat/UPONE-1539-modular-mesh)

#### Acceptance
**El usuario puede verificar que funciona**: al editar un currículo, el campo `progression` muestra el nuevo texto de
ayuda que aclara la condición de edición y el efecto de versionado.

### REQ-6: Fix de la derivación de niveles modular — excluir opciones OR/K-de-N no colocadas

> **Que cambia**: La derivación de niveles modular (`deriveLevel.logic.ts`) deja de tratar una opción NO colocada de un
> OR / K-de-N como una vía válida de nivel 0, que colapsaba el `min` (o el K-ésimo) a esa opción inexistente.
> **Por que**: Con una opción del OR sin colocar, el cálculo la contaba como vía de nivel 0 y bajaba el nivel derivado
> del curso dependiente. Caso real: ADM-5 = OR{ADM-1, ADM-2} (Before) con solo ADM-1 colocado quedaba en Nivel 1 en vez
> de Nivel 2.

El sistema MUST excluir del cálculo de nivel las vías cuyo curso no está colocado (sentinela `ABSENT_PATH`). Si un grupo
OR / K-de-N no tiene ninguna vía colocada, ese grupo NO empuja el nivel. El comportamiento AND se mantiene intacto (max
sobre las vías presentes). Para K-de-N, el sistema MUST distinguir el caso estructural `N < K` (clamp, la regla se
degrada) del caso "no hay suficientes vías colocadas" (no empuja). El fix vive en código originado en TICKET-120
(cerrado); el dev decidió incluirlo aquí.

**Actor**: user (arma la malla modular con prereqs OR/K-de-N)
**Layers**: frontend (lógica pura de derivación de niveles)

<details><summary>Scenarios de validacion</summary>

#### Scenario: OR con una opción sin colocar no colapsa el nivel (caso ADM-5)
- **GIVEN** un plan modular con ADM-5 = OR{ADM-1, ADM-2} (Before) y solo ADM-1 colocado (ADM-2 sin colocar)
- **WHEN** se deriva el nivel de ADM-5
- **THEN** la vía de ADM-2 (no colocada) se excluye (`ABSENT_PATH`) y ADM-5 queda en Nivel 2, no en Nivel 1

#### Scenario: grupo OR sin ninguna vía colocada no empuja
- **GIVEN** un grupo OR/K-de-N donde ninguna de sus vías está colocada
- **WHEN** se deriva el nivel del curso dependiente
- **THEN** el grupo no empuja el nivel (no aporta vía de nivel 0)

#### Scenario: K-de-N estructural vs insuficiente
- **GIVEN** un grupo K-de-N
- **WHEN** `N < K` (estructural) versus cuando hay `N >= K` vías pero menos de K colocadas
- **THEN** el primero clampea (la regla se degrada) y el segundo no empuja

</details>

**Status**: confirmed
**source_ref**: commit ec6e49c (feat/UPONE-1539-modular-mesh); +5 tests en `deriveLevel.logic.spec.ts`; verificado en runtime (ADM-5 en Nivel 2, screenshot smoke)

#### Acceptance
**El usuario puede verificar que funciona**: en la malla modular con ADM-5 = OR{ADM-1, ADM-2} y solo ADM-1 colocado,
ADM-5 se muestra en Nivel 2; los 5 tests de `deriveLevel.logic.spec.ts` cubren OR con opción ausente, grupo sin vías
colocadas y K-de-N estructural vs insuficiente.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | OR con opción ausente | ADM-5 OR{ADM-1, ADM-2}, solo ADM-1 colocado | derivar nivel de ADM-5 | ADM-2 excluida (ABSENT_PATH) | ADM-5 en Nivel 2 |
| 2 | grupo sin vías colocadas | OR sin ninguna vía colocada | derivar nivel del dependiente | grupo no empuja | no aporta nivel 0 |
| 3 | K-de-N estructural vs insuficiente | grupo K-de-N | N<K vs N>=K con <K colocadas | clamp vs no empuja | degrada / no empuja |

### REQ-7: El co-add del alta en lote cuenta los créditos reales de los co-agregados

> **Que cambia**: Al agregar en lote un curso gateado por un umbral de créditos (`MetricThreshold Credits >= N`) junto
> con los cursos que aportan esos créditos, el chequeo deja de reportar un falso "faltan créditos"; el curso gateado se
> coloca en el nivel correspondiente.
> **Por que**: Las entries sintéticas del co-add se creaban con 0 créditos, así que el umbral nunca se cumplía en un alta
> conjunta. Es la faceta de créditos del co-add de REQ-1, que había quedado fuera del fix original.

El sistema MUST hacer que las entries sintéticas de los co-agregados del lote porten los créditos reales de cada
actividad. `buildCoAddedEntries` (`prereqCheck.logic.ts`) MUST recibir un mapa `creditsByActivity` (id -> créditos) y
asignar esos créditos a cada entry sintética (un id ausente del mapa cae a 0). El caller `checkPrereqsForBatch` MUST
construir ese mapa (`activityCreditsById`) desde el catálogo y pasarlo a `buildCoAddedEntries`. El evaluador
(`findMissingPrereqs` / `evaluateRequirementTree` / `aggregateCreditsBefore`) NO se modifica. Limitación conocida: el
scope `category` no suma co-agregados (su `categoryId` queda null hasta la colocación), por lo que un umbral por
categoría no se satisface en el alta conjunta.

**Actor**: user (arma el alta guiada modular con un curso gateado por créditos)
**Layers**: frontend (lógica pura del mod + su caller)

**Status**: confirmed
**source_ref**: commit 69c48bf (feat/UPONE-1539-modular-mesh); +3 tests en `prereqCheck.logic.spec.ts`; runtime verificado en `smoke1539-mod-plan` (Electivo Modular D, Credits>=45; capturas 124-13..16)

<details><summary>Scenarios de validacion</summary>

#### Scenario: co-add del gateado + sus aportantes de créditos → satisface el umbral
- **GIVEN** un plan modular base con 40 créditos y "Electivo Modular D" gateado por `Credits >= 45`
- **WHEN** el usuario agrega en un mismo lote D + los cursos que aportan >= 5 créditos (p. ej. D + B, 45 exactos)
- **THEN** el chequeo NO reporta "faltan créditos" y D se coloca en el nivel donde se acumulan los créditos (Nivel 4)

#### Scenario: agregar solo el gateado sin los aportantes → sí faltan créditos
- **GIVEN** un plan modular base con 40 créditos y "Electivo Modular D" gateado por `Credits >= 45`
- **WHEN** el usuario agrega solo D (sin los cursos que aportan los créditos, ni en el plan ni en el lote)
- **THEN** el chequeo reporta el faltante de créditos ("40 de 45") y D no se coloca

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en la malla modular, agrega "Electivo Modular D" (Credits>=45) junto con
los cursos que aportan los créditos faltantes en el mismo lote y confirma que no aparece el falso "faltan créditos" y
que D queda colocado; al agregar solo D, el faltante de créditos sí aparece.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | co-add con créditos satisface | umbral Credits>=N, co-agregados aportan >=N | agrega gateado + aportantes en lote | umbral cumplido | no reporta faltante |
| 2 | sin mapa de créditos bloquea | umbral Credits>=N, sin `creditsByActivity` | co-agregados caen a 0 créditos | umbral no cumplido | reporta faltante de créditos |
| 3 | créditos insuficientes bloquea | umbral Credits>=N, co-agregados aportan <N | agrega gateado + aportantes insuficientes | umbral no cumplido | reporta faltante de créditos |

## Tasks

### Session 1 — Fix prereqs del alta en lote + toggle del picker + paridad MCP [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Fix `findMissingPrereqsForBatch` para inyectar los `targetActivityIds` del lote como colocados (modular: centinela `MODULAR_PLACED_PERIOD`) + reflejo en `checkPrereqsForBatch` (co-add) + unit test del caso co-add (satisface y no-satisface) | REQ-1 | developer | — | prereqCheck.logic.ts, CurriculumMeshElement.vue, prereqCheck.logic.spec.ts | vitest del mod (unit del caso co-add verde) | git revert | DET-1, DET-2, DET-40 | done | 1 |
| S1.T2 | `filterBySelected(items, selectedIds, onlySelected)` en `activityPicker.logic.ts` (último eslabón de `visibleItems`) + toggle en `AddEntryModal.ts` + i18n es/en/pt + test del filtro (activo/inactivo) | REQ-2 | developer | — | activityPicker.logic.ts, AddEntryModal.ts, lang/es/common.i18n.json, lang/en/common.i18n.json, lang/pt/common.i18n.json, activityPicker.logic.spec.ts | vitest del mod (filtro activo/inactivo verde) | git revert | DET-1, DET-2 | done | 1 |
| S1.T3 | Verificar path de alta en lote de up1-mcp: si hace inter-satisfacción de prereqs, portar el fix de REQ-1; si agrega de a una, documentar N/A con evidencia. Regresión de la suite del mod + up1-mcp | REQ-3 | developer | S1.T1 | up1-mcp:src/mods/curriculum-design/ | regresión suite mod + up1-mcp verde; decisión paridad registrada | git revert (si porta fix) / (no aplica si N/A) | DET-1, DET-2, DET-40 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, correr T2 (unit + coverage delta del mod), quality review con dual-judge del fix de REQ-1, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + dual-judge del fix REQ-1 + decisión documentada | (no aplica — cierre de session) | DET-20, DET-23, DET-35 | done | 1 |

### Task contract

```
Task S1.T1: Fix prereqs del alta en lote (contar co-agregados)
- source_ref: REQ-1
- agent: developer
- files: prereqCheck.logic.ts, CurriculumMeshElement.vue, prereqCheck.logic.spec.ts
- precondition: repro ADM-1+ADM-5 confirmado (H1/H2 del ticket)
- expected_output: findMissingPrereqsForBatch cuenta los targetActivityIds del lote como colocados (modular: MODULAR_PLACED_PERIOD); caller checkPrereqsForBatch refleja el co-add; unit test cubre satisface y no-satisface
- validation: vitest del mod — el caso co-add pasa y el caso "solo dependiente" sigue reportando faltante
- rollback: git revert
- rules: [DET-1, DET-2, DET-40]
```

```
Task S1.T2: Toggle "ver solo lo seleccionado" en el picker
- source_ref: REQ-2
- agent: developer
- files: activityPicker.logic.ts, AddEntryModal.ts, lang/{es,en,pt}/common.i18n.json, activityPicker.logic.spec.ts
- precondition: pipeline puro de visibleItems identificado (H3 del ticket)
- expected_output: filterBySelected agregado al final del pipeline + toggle en el modal + i18n con paridad es/en/pt + test del filtro
- validation: vitest del mod — filtro activo devuelve solo seleccionados; inactivo devuelve el pipeline previo sin cambios
- rollback: git revert
- rules: [DET-1, DET-2]
```

```
Task S1.T3: Paridad del fix en up1-mcp (condicional)
- source_ref: REQ-3
- agent: developer
- files: up1-mcp:src/mods/curriculum-design/
- precondition: S1.T1 (fix del mod estable como referencia)
- expected_output: si el MCP hace alta en lote inter-satisfactoria, fix portado + test; si agrega de a una, N/A documentado con evidencia archivo:linea
- validation: regresión suite del mod + up1-mcp verde; decisión de paridad registrada
- rollback: git revert (si porta fix) / (no aplica si N/A)
- rules: [DET-1, DET-2, DET-40]
```

## Constraints

- **Patrón del mod**: la lógica es pura y testeable junto al componente (`*.logic.ts` + `*.logic.spec.ts`); el fix y el
  filtro viven en las funciones puras, no en el evaluador ni en el componente Vue directamente.
- **i18n con paridad**: las keys nuevas del toggle deben existir en es/en/pt con la misma estructura — un conflicto de
  key aborta el sync de traducciones.
- **DET-40 (auditoría de reemplazo)**: el fix reenruta el cálculo del chequeo de prereqs; no debe romper el alta
  secuencial ya existente ni el chequeo real de faltantes cuando el prereq NO está en el lote.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-1, REQ-2 y REQ-3 pasan
- [ ] **Tests** (DET-37 dim4): unit del caso co-add + filtro del picker escritos y en VERDE; regresión suite mod + up1-mcp verde
- [ ] **Rules**: patrón del mod (lógica pura) e i18n con paridad respetados
- [ ] **Integration**: alta secuencial y chequeo real de faltantes intactos (DET-40)
- [ ] **KB DKC** (DET-37 dim2): N/A salvo que el fix revele una rule/bug a promover
- [ ] **Planning-completeness**: entry registrada (complete|not-applicable|mixed)
