---
id: SPEC-curriculum-design-mesh-filters-interactions
project: up1
ticket: TICKET-088
status: in_progress
---

# MC-08 — Malla: filtros + interacciones avanzadas

# MC-08 — Malla: filtros + interacciones avanzadas

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle tecnico esta en Requirements / Artifacts / Tasks.*

**Que se quiere**: hoy la malla curricular (`CurriculumMesh`, MC-05/MC-06) se ve y se edita, pero no se puede filtrar ni reorganizar con fluidez, y no avisa cuando falta un prerrequisito. Este ticket agrega una barra de filtros (chips de linea de formacion con rollup de creditos + chips de bloques electivos + limpiar), un bloqueo al agregar un curso si le faltan prerrequisitos estructurales (modal casero, solo Cancelar/Volver), drag&drop entre columnas con recalculo de periodo/posicion y boton "Agregar periodo" con alerta de discrepancia, la presentacion de la linea de formacion en la tarjeta (chip icono+abreviacion+color, badge "electivo" a la derecha), y un fix puntual del boton "Agregar asignatura" (doble `+` reportado). El diseñador curricular pasa de "poblar la malla" a "analizarla y ajustarla con confianza".

**Decisiones criticas que necesitan tu OK** (racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Checker de prerrequisitos es **estructural** (ubicacion en periodo anterior), NO transcript-based (no evalua notas/estado de aprobacion) | `MeshEntry` no tiene estado de aprobacion; evaluar contra notas es un dominio distinto (degree-audit, diferido a SP6). Confirmada en H2. |
| 2 | `MetricThreshold(Credits)` **NO** dispara el bloqueo de prerrequisitos | DEC-035: solo cursos (RecordState) y K-de-N (Group) alertan; creditos minimos no son "ubicacion", son un umbral acumulado. |
| 3 | REQ-05 (doble `+`) se trata **verify-first**: la primera task reproduce el render antes de tocar codigo | La investigacion del draft ya encontro que los 3 locales de `buttons.addSubject` no traen `+` literal — puede que el bug ya este resuelto (MC-06); evita fix especulativo (DET-32 necesidad/reuso). |
| 4 | Drag&drop cross-column con `sortablejs` es logica nueva (el precedente `CompositeSectionTree` es single-list) | Recalculo de `position` debe cubrir la columna origen Y destino; sin este alcance el reordenamiento corrompe la malla. |

**Riesgos principales y como los mitigamos**:

- **Checker de prerrequisitos sin precedente de evaluacion en el mod (logica de dominio nueva)** → `prereqCheck.logic.ts` puro + `.spec.ts` con TC-02/03/04 cubriendo curso-prereq, K-de-N y exclusion de creditos; smoke UI en el GATE de S3.
- **DnD cross-column sin precedente local (solo single-list en `CompositeSectionTree`)** → `recalcPeriodPosition.logic.ts` puro testeado antes del wiring UI; smoke UI en el GATE de S4.
- **Query `requirement` con filtro triple-EQUALS (`ownerType`+`ownerId`+`recordType`) sin confirmar (H6 inferred)** → validacion empirica como primera task de S3, por analogia con `useBlockOptions.ts:70-76`.
- **Dominio filtrandose a las primitivas de render (regresion de DEC-038/RULE-mods-051)** → toda la logica nueva vive en el adapter (`CurriculumMeshElement.vue` + `.ts` puros); grep de verificacion en cada GATE.

**Que NO se hace en este ticket** (limites del scope):

- Evaluacion transcript-based de prerrequisitos (notas, estado Aprobado/Cursando) → diferido a degree-audit (SP6).
- Correccion automatica de prerrequisitos faltantes → DEC-035: solo alerta informativa con Cancelar/Volver.
- Extraccion del core presentacional a un componente publicable (`GroupedCardBoard`) → diferida hasta un 2º consumidor concreto (DEC-038).
- Edicion del objeto bloque electivo → ya resuelto en MC-06 (tagging, no edicion directa).

**Tamano estimado**: 4 sessions ejecutables (S1-S4), aproximadamente 9-11h efectivas. Las mas riesgosas son **S3** (checker de prerrequisitos, logica de dominio nueva) y **S4** (drag&drop cross-column, sin precedente local) — ambas gate `⚑ fuerte` con tier T3.

**Como vas a saber que funciona** (criterios observables):

- Abro la malla, hago clic en el chip de linea "Nucleo" → las tarjetas de esa linea se resaltan, el resto se atenua, y el chip muestra "12/180 cred" con una barra proporcional.
- Agrego EST200 (prerrequisito MAT110) sin tener MAT110 en un periodo anterior → se bloquea con un modal que lista MAT110; si agrego MAT110 antes, el alta se completa.
- Agrego un curso cuyo unico requisito es un umbral de creditos (`MetricThreshold`) → NO se bloquea.
- Arrastro una tarjeta del periodo 2 al periodo 1 → la tarjeta cambia de columna, las posiciones de ambas columnas se recalculan y quedan persistidas.
- Agrego un periodo nuevo cuando el total configurado del curriculo es distinto → veo una alerta informativa de discrepancia (no bloqueante).
- Cada tarjeta con linea de formacion muestra un chip con icono + abreviacion + color; el badge "electivo" aparece a la derecha.
- El boton "Agregar asignatura" muestra un solo `+`.

---

## Purpose

Extender el adapter de dominio `CurriculumMeshElement.vue` (MC-05/MC-06) con las interacciones avanzadas de la malla: filtros de resaltado/atenuado por linea de formacion y bloque electivo con rollup de creditos, un checker de prerrequisitos estructural que bloquea el alta cuando faltan cursos o miembros de un grupo K-de-N, drag&drop cross-column con recalculo de periodo/posicion y gestion de periodos, y ajustes de presentacion de la tarjeta (chip de linea, reposicion del badge electivo, fix del boton de alta). Toda la logica de derivacion (filtrado, rollup, checker de prerrequisitos, recalculo de posiciones) vive en modulos `.ts` puros y testeables; el `.vue` orquesta el modal casero de bloqueo y el wiring de `sortablejs` sin hornear dominio en las primitivas de render (DEC-038/RULE-mods-051).

## Requirements

### REQ-01: Filtros de la malla (chips de linea + rollup + bloques electivos) *(🆂 Should)*

> **Que cambia**: la leyenda estatica de MC-05 se reemplaza por una barra de filtros interactiva — chips de linea de formacion que resaltan/atenuan la malla, con un rollup de creditos por linea, mas chips de bloques electivos y un boton Limpiar.
> **Por que**: hoy la malla no se puede analizar por linea de formacion; el diseñador necesita ver de un vistazo cuanto lleva asignado por linea.

El sistema SHOULD presentar chips de lineas de formacion (derivadas de `requirementCategory`) que, al hacer clic, resaltan las tarjetas de esa `categoryId` y atenuan el resto; cada chip de linea MUST mostrar un rollup de creditos `{current}/{min} cred` con una barra proporcional, donde `current` = suma de `credits` de los `planEntry` de esa `categoryId` y `min` = `requirementCategory.minCredits`. El sistema MUST ademas presentar chips de bloques electivos, derivados de los `blockId` presentes en la malla actual, con la misma logica de resaltado/atenuado. Un boton Limpiar MUST restablecer el estado normal (sin resaltado ni atenuado).

**Actor**: user (diseñador curricular)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: resaltar por linea
- **GIVEN** la malla con tarjetas de varias lineas de formacion, incluida "Nucleo"
- **WHEN** el usuario hace clic en el chip "Nucleo"
- **THEN** las tarjetas con `categoryId=Nucleo` se resaltan
- **AND** el resto de las tarjetas se atenua

#### Scenario: rollup de creditos por linea
- **GIVEN** la linea "Nucleo" con `minCredits=180` y 12 creditos asignados en planEntries de esa categoria
- **WHEN** se renderiza el chip de "Nucleo"
- **THEN** el chip muestra "12/180 cred" con una barra proporcional al avance

#### Scenario: limpiar filtros
- **GIVEN** un chip de linea activo (resaltado/atenuado aplicado)
- **WHEN** el usuario hace clic en "Limpiar"
- **THEN** todas las tarjetas vuelven al estado normal (sin resaltar ni atenuar)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: hace clic en un chip de linea y ve el resaltado/atenuado correcto junto con el rollup de creditos en el chip.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-01 clic en chip "Nucleo" | seed con tarjetas de Nucleo y otras lineas | filtrar por Nucleo | tarjetas de Nucleo resaltadas, resto atenuado | `cards.filter(c=>c.categoryId==='Nucleo').every(dimmed=false)` y el resto `dimmed=true` |
| 2 | TC-08 rollup de creditos | linea con 12 cred asignados, min=180 | render del chip | "12/180 cred" + barra proporcional | `chip.text === '12/180 créd'`, `barWidth === (12/180)*100` |

### REQ-02: Bloqueo por prerrequisitos al agregar *(🅲 Could)*

> **Que cambia**: al confirmar el alta de un curso, si le falta un prerrequisito (curso o miembro de un grupo K-de-N) que deberia estar en un periodo anterior, el alta se bloquea con un modal que lista los faltantes.
> **Por que**: evita que el diseñador arme un plan curricular con prerrequisitos mal secuenciados sin darse cuenta.

Al confirmar el alta de un curso, el sistema MUST evaluar sus `requirement` (`ownerType=activity`): si un prerrequisito-curso (`RecordState`, `timing` Before o Either) NO esta ubicado en un periodo anterior al de alta, O un `Group` (K-de-N de cursos) tiene miembros ausentes de la malla, el sistema MUST bloquear el alta con un modal casero (atomo `Modal`) que lista los faltantes, ofreciendo solo Cancelar o Volver. El checker MUST excluir explicitamente `MetricThreshold` (creditos): este tipo de requisito NUNCA dispara el bloqueo. El check es estructural (ubicacion en periodo anterior), NO evalua estado de aprobacion ni notas (transcript-based).

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: prerrequisito-curso ausente
- **GIVEN** EST200 tiene un `RecordState` (timing Before) apuntando a MAT110, y MAT110 no esta en un periodo anterior de la malla
- **WHEN** el usuario confirma el alta de EST200
- **THEN** el alta se bloquea con un modal que lista MAT110 como faltante
- **AND** el modal ofrece solo Cancelar o Volver

#### Scenario: requisito de creditos no bloquea
- **GIVEN** un curso cuyo unico requisito es `MetricThreshold` (creditos, umbral >= 60)
- **WHEN** el usuario confirma el alta
- **THEN** el alta NO se bloquea (el checker excluye `MetricThreshold`)

#### Scenario: prerrequisito satisfecho
- **GIVEN** EST200 requiere MAT110 (Before) y MAT110 ya esta en un periodo anterior
- **WHEN** el usuario confirma el alta de EST200
- **THEN** el alta se completa sin bloqueo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intenta agregar un curso con un prerrequisito faltante y ve el modal de bloqueo con el listado; agrega el prerrequisito antes y el alta se completa.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-02 EST200 sin MAT110 antes | requirement seed (RecordState Before MAT110) | agregar EST200 | bloqueado, modal lista MAT110 | `blockResult.blocked === true`, `blockResult.missing includes 'MAT110'` |
| 2 | TC-03 unico requisito MetricThreshold | requirement seed (MetricThreshold >=60cr) | agregar curso | NO bloquea | `blockResult.blocked === false` |
| 3 | TC-04 MAT110 en periodo anterior | MAT110 colocado en periodo previo | agregar EST200 | se completa el alta | `blockResult.blocked === false`, `planEntry creado` |

### REQ-03: Drag&drop + agregar periodo *(🅲 Could)*

> **Que cambia**: las tarjetas se pueden arrastrar entre columnas de periodo (recalculando posiciones), y hay un boton para agregar un periodo nuevo, con una alerta si el numero de periodos no coincide con lo configurado en el curriculo.
> **Por que**: reorganizar la malla arrastrando es mas fluido que editar periodo/posicion a mano; la alerta evita que la malla y la configuracion del curriculo se desalineen sin que nadie lo note.

El sistema MUST permitir arrastrar una tarjeta entre columnas (periodos) usando `sortablejs` en modo multi-list (cross-column); al soltar, MUST actualizar `period` y `position` de la tarjeta movida y recalcular `position` de los hermanos tanto en la columna origen como en la destino, persistiendo los cambios via `UPDATE_PLAN_ENTRY`. El sistema MUST proveer un boton "Agregar periodo". El sistema MUST mostrar una alerta informativa NO bloqueante cuando el numero de periodos renderizados sea distinto de `Curriculum.totalPeriods` (ej.: "La malla tiene {actual} periodos · el plan esta configurado con {totalPeriods}"); la alerta es puramente informativa, no corrige automaticamente ni bloquea la edicion.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: mover tarjeta entre columnas
- **GIVEN** una malla con al menos 2 periodos, una tarjeta en el periodo 2
- **WHEN** el usuario arrastra esa tarjeta al periodo 1
- **THEN** la tarjeta queda con `period=1`
- **AND** la `position` se recalcula en la columna origen (periodo 2) y en la destino (periodo 1)
- **AND** los cambios se persisten via `UPDATE_PLAN_ENTRY`

#### Scenario: discrepancia de periodos al agregar
- **GIVEN** `Curriculum.totalPeriods=10` y la malla renderiza 10 columnas
- **WHEN** el usuario hace clic en "Agregar periodo" (queda en 11 columnas)
- **THEN** aparece la alerta "La malla tiene 11 periodos · el plan esta configurado con 10"
- **AND** la edicion de la malla sigue habilitada (no bloqueante)

#### Scenario: discrepancia resuelta
- **GIVEN** la alerta de discrepancia visible (11 vs 10)
- **WHEN** el numero de columnas vuelve a 10 (ej. se quita el periodo agregado)
- **THEN** la alerta desaparece

</details>

#### Acceptance
**El usuario puede verificar que funciona**: arrastra una tarjeta a otra columna y ve que queda ubicada ahi de forma persistente; agrega un periodo de mas y ve la alerta de discrepancia.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-05 arrastrar periodo 2→1 | 2 periodos con tarjetas | drag&drop | period=1, position recalculada, persistido | `entry.period===1`, `siblings de origen y destino con position consecutiva`, `UPDATE_PLAN_ENTRY llamado por cada hermano afectado` |
| 2 | TC-09 discrepancia al agregar | totalPeriods=10 | agregar periodo (11) | alerta "11 periodos · configurado 10" | `discrepancyAlert.visible===true`, `discrepancyAlert.text` contiene "11" y "10" |
| 3 | TC-10 discrepancia resuelta | alerta visible (11 vs 10) | volver a 10 columnas | alerta desaparece | `discrepancyAlert.visible===false` |

### REQ-04: Display de linea de formacion en la tarjeta *(🆂 Should)*

> **Que cambia**: cada tarjeta con linea de formacion muestra un chip con icono + abreviacion + color; el badge "electivo" se mueve al lado derecho de la tarjeta.
> **Por que**: hoy la linea solo se ve como un borde de color; un chip con icono y abreviacion es mas legible de un vistazo.

El sistema SHOULD mostrar en cada tarjeta con `categoryId` un chip de linea compuesto por icono (`bi-*`), abreviacion corta y color de la linea; el badge "electivo" MUST reposicionarse al lado derecho de la tarjeta (footer), separado del chip de linea. Esto requiere exponer `icon` y una abreviacion en `CategoryVM`/`toCategoryVM` (hoy solo expone `name`/`color`/`minCredits`).

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: chip de linea en la tarjeta
- **GIVEN** una tarjeta con `categoryId` de la linea "Nucleo" (icono `bi-diagram-3`, abreviacion "NUC")
- **WHEN** se renderiza la tarjeta
- **THEN** muestra un chip con el icono `bi-diagram-3` + texto "NUC", coloreado y con borde del color de la linea

#### Scenario: badge electivo a la derecha
- **GIVEN** una tarjeta electiva (con `blockId`)
- **WHEN** se renderiza la tarjeta
- **THEN** el badge "electivo" aparece en el footer derecho de la tarjeta

#### Scenario: tarjeta sin linea
- **GIVEN** una tarjeta sin `categoryId`
- **WHEN** se renderiza
- **THEN** no muestra chip de linea

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ve el chip de linea con icono y abreviacion en las tarjetas con linea asignada, y el badge "electivo" ubicado a la derecha.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-06 chip de linea "Nucleo" | CategoryVM con icon=bi-diagram-3, abbrev=NUC | render de tarjeta | chip icono+"NUC" coloreado + borde color | `chip.icon==='bi-diagram-3'`, `chip.text==='NUC'` |
| 2 | TC-07 badge electivo a la derecha | tarjeta electiva | render | badge en footer derecho | `badge.position==='right'` |

### REQ-05: Fix boton "Agregar asignatura" — doble `+` *(🅼 Must, fix — verify-first)* [NEEDS CLARIFICATION: confirmar en S1.T1 si el bug persiste tras la investigacion del draft]

> **Que cambia**: el boton "Agregar asignatura" no debe mostrar un `+` duplicado.
> **Por que**: reportado como bug visual; la investigacion previa (draft de este ticket) ya encontro que `buttons.addSubject` en los 3 locales (`es_CL`, `en_CL`, `pt_BR`) ya no trae `+` literal — puede que ya este corregido (posiblemente en MC-06).

El sistema MUST mostrar el boton "Agregar asignatura" con un solo `+`. Dado que la investigacion previa (draft) no encontro `+` literal en el texto i18n de ningun locale, la primera task de esta REQ es **verify-first**: reproducir el render actual del boton. Si NO se observa doble `+`, la REQ se marca resuelta con evidencia (drop candidate, DET-32) y no se toca codigo. Si el doble `+` persiste, MUST localizarse la otra fuente posible (ej. icono duplicado del atom `Button`) y corregirse conservando el icono.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: verificacion del render actual
- **GIVEN** el boton "Agregar asignatura" en cualquiera de los 3 locales
- **WHEN** se renderiza (story o interaction test)
- **THEN** se observa un unico `+` (icono del atom `Button`, sin duplicado de texto)

#### Scenario: si el bug persiste (contingencia)
- **GIVEN** el render muestra doble `+`
- **WHEN** se inspecciona la fuente (icon prop del atom `Button` vs texto i18n)
- **THEN** se corrige la fuente duplicada conservando un unico icono visible

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ve el boton "Agregar asignatura" con un solo `+`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-11 render del boton de alta | boton "Agregar asignatura" (3 locales) | render (story/interaction test) | un solo `+` | `button.text.match(/\+/g).length === 1` |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | El checker de prerrequisitos no bloquea la UI al confirmar el alta | tiempo de evaluacion | evaluacion sincrona sobre datos ya cargados (`requirement` de la Activity), sin round-trip adicional bloqueante |
| Security | El drag&drop y el bloqueo por prerrequisitos solo se habilitan en curriculos editables | gate de `enableEdit` | `Curriculum.status === 'Draft'` (heredado de MC-05/MC-06) |
| Usability | Los filtros (REQ-01) son de solo lectura y no requieren `canEdit` | disponibilidad | chips visibles/activos en modo solo-lectura (validado empiricamente en S2, H5) |

## Artifacts

> Sin meta-specs de componentes propios del proyecto ademas de `METASPEC-layout-vue-component` → inventario ad-hoc derivado del draft aprobado (`intent.md`), siguiendo los campos de dicho meta-spec (props/emits/composables).

### Componentes reusados (design system up1 + patrones del mod)

| Componente | Path | Uso en MC-08 |
|-----------|------|--------------|
| `CurriculumMeshElement.vue` (grid `.cm-cols`/`.cm-col`, tarjeta `.cm-pe`) | `mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue:107-157` | Base sobre la que se cablean filtros, checker de prerrequisitos y drag&drop |
| Atom `Modal` | `layout/src/components/molecules/Modal/Modal.vue` | shell del modal casero de bloqueo por prerrequisitos |
| Atom `Badge` | `layout/src/components/atoms` | badge "electivo" reposicionado a la derecha (REQ-04) |
| Atom `Button` | `layout/src/components/atoms` | botones del modal de bloqueo (Cancelar/Volver), boton "Agregar periodo", verificacion REQ-05 |
| Atom `Icon` | `layout/src/components/atoms` | icono de cada chip de linea (REQ-04), chips de filtro |
| `groupByPeriod()` / `MeshCard` / `CategoryVM` | `curriculumMesh.logic.ts:87-159` | fuente de datos de columnas y tarjetas para filtros y presentacion |
| `useCurriculumMesh` (`LIST_CATEGORIES` → `toCategoryVM`) | `useCurriculumMesh.ts:104-112` | fuente de las lineas de formacion; se extiende con `icon`/abreviacion (REQ-04) |
| `useBlockOptions` (patron, MC-06) | `useBlockOptions.ts:37-113` | patron de composable a replicar en `usePrereqRequirements` (query triple-EQUALS) |
| Mutation `UPDATE_PLAN_ENTRY` | `CurriculumMeshElement.vue:275-281` | persistencia de `period`/`position` tras el drag&drop (REQ-03) |
| `sortablejs` (dependencia) | `package.json:26` | motor de drag&drop cross-column (REQ-03) |
| `computePositionUpdates()` (patron) | `CompositeSectionTree/buildPayloads.ts:93-97` | patron de recalculo de posiciones de hermanos, adaptado a 2 columnas |
| `objects/requirement.json` + `rt__RecordState__requirement.json` + `rt__Group__requirement.json` | schema (MC-03) | fuente de datos del checker de prerrequisitos |

### Componentes / modulos nuevos (en el adapter del mod)

| Artefacto | Path (nuevo) | Consumidor en este sprint | source_ref |
|-----------|--------------|---------------------------|-----------|
| `curriculumMeshFilters.logic.ts` (filtro por categoryId + chips de bloques electivos + rollup de creditos) | `mods/curriculum-design/modsComponents/CurriculumMesh/` | `CurriculumMeshElement.vue` (S2) | REQ-01 |
| Barra de filtros UI (chips de linea con rollup + chips de bloques electivos + Limpiar) | `CurriculumMeshElement.vue` (extiende) | usuario final (S2) | REQ-01 |
| `usePrereqRequirements` (composable) | `mods/curriculum-design/modsComposables/usePrereqRequirements.ts` | `CurriculumMeshElement.vue` (S3) | REQ-02 |
| `prereqCheck.logic.ts` (puro: RecordState Before/Either + Group K-de-N; excluye MetricThreshold) | `mods/curriculum-design/modsComponents/CurriculumMesh/` | `CurriculumMeshElement.vue` (S3) | REQ-02 |
| Modal de bloqueo por prerrequisitos (contenido, sobre atomo `Modal`) | `CurriculumMeshElement.vue` (extiende) | usuario final (S3) | REQ-02 |
| `recalcPeriodPosition.logic.ts` (puro: recalculo de posicion en columna origen+destino) | `mods/curriculum-design/modsComponents/CurriculumMesh/` | `CurriculumMeshElement.vue` (S4) | REQ-03 |
| Wiring `sortablejs` cross-column (multi-list) | `CurriculumMeshElement.vue` (extiende) | usuario final (S4) | REQ-03 |
| Boton "Agregar periodo" + alerta de discrepancia (`.logic.ts` + `.spec.ts`) | `CurriculumMeshElement.vue` (extiende) | usuario final (S4) | REQ-03 |
| Chip de linea en la tarjeta (icono+abreviacion+color) + reposicion de badge electivo | `CurriculumMeshElement.vue` (extiende) | usuario final (S1) | REQ-04 |
| `CategoryVM.icon`/abreviacion (extiende `useCurriculumMesh.ts` + `toCategoryVM`) | `useCurriculumMesh.ts` (extiende) | `CurriculumMeshElement.vue` (S1), consumido por S2 (chips) | REQ-04 |

> **Checklist de calidad (design-feature §5)**: (a) sin hardcode de copys — los labels de UI van a i18n del mod (`curriculumMesh.*`, namespace ya usado en MC-05/06); (b) cada artefacto nuevo tiene consumidor en este sprint (tabla arriba); (c) sin heuristicas por nombre de campo — el dominio entra al adapter via props tipadas y eventos (RULE-mods-051).

## Tasks

> Numeracion: el ticket no tiene `### Session N` previas → el plan arranca en **S1** (DET-20).

### Session 1 — Presentacion de tarjeta + fix [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | REQ-05 verify-first: reproducir el render actual del boton "Agregar asignatura" en los 3 locales (story/interaction test); si NO hay doble `+`, marcar resuelto con evidencia (DET-32 drop) y no tocar codigo; si persiste, localizar la otra fuente (ej. icono duplicado del atom `Button`) y corregir conservando el icono | REQ-05 | developer | — | `CurriculumMesh.stories.ts`, `CurriculumMeshElement.vue` (solo si el bug persiste) | vitest (interaction test) + inspeccion visual del render | git revert (si hubo cambio; n/a si solo verificacion) | DET-1, DET-4, DET-12 | pending | 1 |
| S1.T2 | Exponer `icon` y abreviacion en `CategoryVM`/`toCategoryVM` (`useCurriculumMesh.ts`); `.spec.ts` cubriendo el mapeo | REQ-04 | developer | — | `useCurriculumMesh.ts` (extiende) + `.spec.ts` | vitest (unit) | git revert | DET-1, DET-2, DET-8, RULE-curriculum-design-014 | pending | 1 |
| S1.T3 | Chip de linea en la tarjeta (icono+abreviacion+color) + badge "electivo" reposicionado al footer derecho en `CurriculumMeshElement.vue`; test de interaccion (TC-06/TC-07) | REQ-04 | developer | S1.T2 | `CurriculumMeshElement.vue`, `CurriculumMesh.stories.ts` | vitest jsdom (interaccion, TC-06/07) | git revert | DET-5, DET-8, RULE-mods-051, RULE-curriculum-design-014 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir en `## Sessions`, validar tier, decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Filtros de la malla [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `curriculumMeshFilters.logic.ts` puro: filtro de resaltado/atenuado por `categoryId`, derivacion de chips de bloques electivos (a partir de `blockId` presentes), rollup de creditos por linea (`current`/`min`); `.spec.ts` (TC-01, TC-08) | REQ-01 | developer | S1.GATE | `modsComponents/CurriculumMesh/curriculumMeshFilters.logic.ts` (nuevo) + `.spec.ts` | vitest (TC-01, TC-08) | git revert | DET-1, DET-2, DET-7, DET-8, RULE-curriculum-design-014 | pending | 2 |
| S2.T2 | Wire barra de filtros en `CurriculumMeshElement.vue`: chips de linea con rollup + barra, chips de bloques electivos, boton Limpiar, resaltado/atenuado sobre las tarjetas; test de interaccion | REQ-01 | developer | S2.T1 | `CurriculumMeshElement.vue`, `CurriculumMesh.stories.ts` | vitest jsdom (interaccion) | git revert | DET-5, DET-8, RULE-mods-051 | pending | 2 |
| S2.T3 | Validar H5 empiricamente: confirmar que los filtros son read-only y quedan visibles/activos sin gating de `canEdit` (a diferencia del alta/edicion); documentar evidencia en el ticket | REQ-01 | developer | S2.T2 | `CurriculumMeshElement.vue` (verificacion, sin cambio funcional esperado) | manual (inspeccion + evidencia) | (no aplica) | DET-4, DET-5 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) — persistir en `## Sessions`, validar tier, decidir continue/iterate/escalate | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — Prerrequisitos [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Validar H6 (query `requirement` con filtro triple-EQUALS `ownerType`+`ownerId`+`recordType`, por analogia con `useBlockOptions.ts:70-76`); crear `usePrereqRequirements.ts` (patron `useBlockOptions`) que carga `requirement(ownerType=activity)` para la Activity en alta | REQ-02 | developer | S2.GATE | `modsComposables/usePrereqRequirements.ts` (nuevo) + `.spec.ts` | vitest (mock Apollo) + validacion empirica H6 | git revert | DET-1, DET-2, DET-4, DET-8, DET-11 | pending | 3 |
| S3.T2 | `prereqCheck.logic.ts` puro: evalua `RecordState` (timing Before/Either, ubicacion en periodo anterior) y `Group` (K-de-N, `minToSatisfy`, miembros ausentes); excluye explicitamente `MetricThreshold`; `.spec.ts` (TC-02, TC-03, TC-04) | REQ-02 | developer | S3.T1 | `modsComponents/CurriculumMesh/prereqCheck.logic.ts` (nuevo) + `.spec.ts` | vitest (TC-02, TC-03, TC-04) | git revert | DET-1, DET-2, DET-7, DET-8, RULE-curriculum-design-014 | pending | 3 |
| S3.T3 | Modal casero de bloqueo (atomo `Modal`, lista de faltantes, footer Cancelar/Volver); hook en `onAddEntryConfirm()` (`CurriculumMeshElement.vue:866-892`) antes de los loops de `CREATE_PLAN_ENTRY`; test de interaccion; smoke UI del bloqueo real | REQ-02 | developer | S3.T2 | `CurriculumMeshElement.vue`, `CurriculumMesh.stories.ts` | vitest jsdom (interaccion) + smoke UI | git revert | DET-5, DET-8, RULE-mods-051, RULE-curriculum-design-014 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T3) — bloqueo por prerrequisitos end-to-end; smoke UI; grep RULE-mods-051 (sin dominio en primitivas); persistir + decidir | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + smoke UI + grep | (no aplica) | DET-20, DET-23, DET-33 | pending | 3 |

### Session 4 — Drag&drop + periodos [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | `recalcPeriodPosition.logic.ts` puro: recalculo de `position` de los hermanos en la columna origen y destino tras un drop (patron `computePositionUpdates`, adaptado a 2 columnas); `.spec.ts` (TC-05) | REQ-03 | developer | S3.GATE | `modsComponents/CurriculumMesh/recalcPeriodPosition.logic.ts` (nuevo) + `.spec.ts` | vitest (TC-05) | git revert | DET-1, DET-2, DET-7, DET-8 | pending | 4 |
| S4.T2 | Wiring `sortablejs` multi-list cross-column en `CurriculumMeshElement.vue`; `onEnd` dispara `recalcPeriodPosition` y persiste via `UPDATE_PLAN_ENTRY` (loop por hermano afectado en origen y destino); test de interaccion | REQ-03 | developer | S4.T1 | `CurriculumMeshElement.vue`, `CurriculumMesh.stories.ts` | vitest jsdom (interaccion) | git revert | DET-5, DET-8, DET-16, RULE-mods-051 | pending | 4 |
| S4.T3 | Boton "Agregar periodo" + alerta de discrepancia vs `Curriculum.totalPeriods` (`.logic.ts` + `.spec.ts`, TC-09/TC-10); smoke UI (mover tarjeta, agregar periodo, persiste) | REQ-03 | developer | S4.T2 | `modsComponents/CurriculumMesh/curriculumMeshFilters.logic.ts` o modulo dedicado (extiende), `CurriculumMeshElement.vue` + `.spec.ts` | vitest (TC-09, TC-10) + smoke UI | git revert | DET-5, DET-8, DET-16, RULE-curriculum-design-014 | pending | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier: T3) — drag&drop + periodos end-to-end; acceptance checkpoints; smoke UI; persistir + decidir cierre | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket | gate persistido + smoke UI + acceptance | (no aplica) | DET-20, DET-23, DET-33 | pending | 4 |

## Constraints

- RULE-curriculum-design-014: componente full-page del mod = Vueform element + modales caseros — aplica al modal de bloqueo (S3) y a la logica pura `.ts` de filtros/checker/recalculo.
- RULE-mods-051 (DEC-038): seam core presentacional (slots/eventos) vs adapter de dominio — toda la logica nueva de MC-08 (filtros, checker de prerrequisitos, recalculo de posiciones, chip de linea) vive en el adapter (`CurriculumMeshElement.vue` + `.ts` puros), NUNCA en las primitivas de render (grid/columna/tarjeta-shell). Contenido de tarjeta por slot, acciones por evento. Tasks UI exigen tests de interaccion, no solo `.spec.ts` de logica pura. Grep de verificacion en cada GATE.
- DEC-035: prerrequisitos no cubiertos = alerta informativa con bloqueo (Cancelar/Volver), NO correccion automatica; `MetricThreshold` (creditos) NUNCA alerta.
- DEC-038: `CurriculumMesh` = adapter sobre core presentacional; extraccion del board generico diferida a un 2º consumidor (no extraer en MC-08).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| MC-05 (TICKET-085, closed) | internal | `CurriculumMeshElement` base + seam (DEC-038/RULE-mods-051) | bajo — cerrado |
| MC-03 (TICKET-083, closed) | internal | `requirement` (owner=activity) para el checker de prerrequisitos | bajo — cerrado |
| MC-06 (TICKET-086, closed) | internal | bloques electivos creados (`blockId`) para los chips de electivos | bajo — cerrado |
| `sortablejs` (dependencia ya instalada) | external (lib) | motor de drag&drop cross-column (REQ-03) | bajo — ya en `package.json`, sin uso previo cross-column en el mod |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Query `requirement` no soporta filtro triple-EQUALS simultaneo (H6 inferred) | low | bloquea `usePrereqRequirements` | validacion empirica como primera task de S3 (S3.T1), por analogia con `useBlockOptions.ts:70-76` |
| Checker de prerrequisitos sin precedente de evaluacion en el mod | medium | logica de dominio nueva sin baseline de comparacion | `.spec.ts` con TC-02/03/04 + smoke UI en S3.GATE |
| DnD cross-column corrompe `position` si el recalculo no cubre ambas columnas | medium | malla queda con posiciones inconsistentes | `recalcPeriodPosition.logic.ts` puro + `.spec.ts` (TC-05) antes del wiring UI |
| Dominio se filtra a las primitivas de render (regresion DEC-038) | medium | regresion de arquitectura MC-05/06 | grep en cada GATE (RULE-mods-051); slot+evento |
| REQ-05 ya resuelto en MC-06 pero se reintroduce un cambio innecesario | low | esfuerzo desperdiciado | verify-first (S1.T1) antes de tocar codigo |

## Open questions

- (ninguna abierta al cerrar design — H5 y H6 quedan validadas empiricamente en S2.T3 y S3.T1 respectivamente, con evidencia documentada en el GATE correspondiente)

## Decisions

### DEC-LOCAL-01: Checker de prerrequisitos estructural, no transcript-based
- **Contexto**: como evaluar si un prerrequisito esta "satisfecho" — por ubicacion en la malla o por estado de aprobacion/notas.
- **Drivers**: `MeshEntry` no tiene estado de aprobacion; evaluar notas es un dominio distinto (degree-audit, diferido a SP6); el gherkin de la pre-spec habla de "no esta en un periodo anterior" (ubicacion).
- **Opcion elegida**: check estructural — el prerrequisito debe estar ubicado (como `planEntry`) en un periodo anterior al de alta.
- **Alternativas**: evaluacion transcript-based (estado Aprobado/Cursando contra notas reales) — descartada, pertenece a degree-audit (SP6).
- **Consecuencias**: gana simplicidad y disponibilidad de datos ya cargados; no detecta si el prerrequisito fue efectivamente aprobado (solo si esta ubicado antes en el plan).
- **Session**: S0 (design), confirmada H2.

### DEC-LOCAL-02: REQ-05 tratado verify-first
- **Contexto**: el bug reportado del doble `+` en "Agregar asignatura" fue investigado en el draft y no se encontro `+` literal en los 3 locales de `buttons.addSubject`.
- **Drivers**: evitar un fix especulativo sobre un bug potencialmente ya resuelto (DET-32 necesidad/reuso); posible que MC-06 ya lo haya corregido.
- **Opcion elegida**: primera task de S1 reproduce el render actual; si no hay doble `+`, se marca resuelto con evidencia (drop) sin tocar codigo.
- **Alternativas**: aplicar un fix directo sin verificar — descartado, riesgo de tocar codigo innecesariamente o de no encontrar la causa real si el bug persiste por otra via (ej. icono duplicado).
- **Consecuencias**: gana precision (fix solo si el bug es real); agrega un paso de verificacion antes del fix.
- **Session**: S0 (design), verificacion empirica en S1.T1.

## Technical reference

- **Entry shape**: `MeshEntry` (`curriculumMesh.logic.ts:35-67`) tiene `categoryId` + `blockId`; `MeshCard` deriva `isElective`/`categoryColor` (`:87-90`). Columnas por `groupByPeriod()` (`:135-159`).
- **Categorias (lineas)**: query `LIST_CATEGORIES` filtrada por `curriculumId` → `toCategoryVM()` (`useCurriculumMesh.ts:104-112`); hoy `CategoryVM` = `{id,name,color,minCredits}` (falta `icon`/abreviacion → REQ-04).
- **Add-flow (hook de REQ-02)**: `onAddEntryConfirm()` (`CurriculumMeshElement.vue:866-892`) → `createObligatoriaEntries()`/`createElectivaEntries()`; el checker de prerrequisitos se engancha antes de los loops de `CREATE_PLAN_ENTRY`.
- **Requirement (MC-03)**: `objects/requirement.json` (`ownerType`, `recordType`) + `rt__RecordState__requirement.json` (`targetId`, `timing` Before/Concurrent/Either, `mustBe`) + `rt__Group__requirement.json` (`combinator`, `minToSatisfy` = K-de-N). Helper puro `logic/helpers/buildRequirementTree.js`. La malla NO lo carga aun.
- **period/position**: `planEntry.json` (indice `planId,period,position`); `nextPosition()` solo append (`curriculumMesh.logic.ts:304-309`) — falta recalculo de hermanos. Precedente cross-item: `computePositionUpdates()` (`CompositeSectionTree/buildPayloads.ts:93-97`).
- **Patron `.logic.ts`+`.logic.spec.ts`**: p.ej. `groupByPeriod()` puro (`curriculumMesh.logic.ts:135-159`) testeado en `curriculumMesh.logic.spec.ts` y consumido solo por `computed()` (`CurriculumMeshElement.vue:333`). MC-08 sigue el patron: `prereqCheck.logic.ts`, filtros/rollup en `.ts` puro, recalculo period/position en `.ts` puro.
- **Listar requirement por owner**: `listInstances(name:"requirement", filters:[{field:'ownerType',operator:'EQUALS',value:'activity'},{field:'ownerId',operator:'EQUALS',value:activityId},{field:'recordType',operator:'EQUALS',value:'RecordState'|'Group'}])` — patron `useBlockOptions.ts:70-76` (triple EQUALS `Group`/`curriculum`).
- **Actualizar planEntry (DnD)**: `UPDATE_PLAN_ENTRY` mutation ya usada en alta/edicion (`CurriculumMeshElement.vue:275-281`), reusada aqui para persistir `period`/`position`.
- **Modal casero**: `Modal.vue` (`v-model`, slots default/#header/#footer, Teleport-to-body). Patron: `CompositeSectionTreeElement.vue:131-154`.
- **Tests**: Vitest. Logica pura → `*.logic.spec.ts` (node). Componentes → `@vitest-environment jsdom`. Mock Apollo: `vi.mock('@/composables/useApolloClient', () => ({ useTenantApolloClient: () => ({ query: mockQuery }) }))`. Stubs en `tests/stubs/`.

## Rules discovered

{se llena durante ejecucion}

## Bugs found

{se llena durante ejecucion}

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..05 pasan (Should: 01, 04; Could: 02, 03; Must/fix verify-first: 05)
- [ ] **Tests**: TC-01..11 escritos y pasando; logica pura con `.spec.ts`; modales/DnD/chips con test de interaccion (RULE-mods-051)
- [ ] **NFRs**: checker de prerrequisitos sincrono sobre datos ya cargados; DnD y bloqueo gated a `Draft`; filtros disponibles sin gating de `canEdit`
- [ ] **Rules**: grep confirma sin identificadores de dominio en primitivas de render (RULE-mods-051); modal casero (RULE-cd-014); logica pura testeable
- [ ] **Integration**: la malla read-only y los flujos de alta/edicion de MC-05/MC-06 no se rompen (regression)
- [ ] **Docs**: stories actualizadas; i18n del namespace `curriculumMesh.*` poblado

## Archiving

Usar `/dkc-archive-spec SPEC-curriculum-design-mesh-filters-interactions "razon"` cuando deje de ser fuente de verdad.
