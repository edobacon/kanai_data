---
id: SPEC-curriculum-design-mesh-add-edit
project: up1
ticket: TICKET-086
status: in_progress
---

# MC-06 — Malla: agregar y editar asignaturas (obligatorias + electivas)

# MC-06 — Malla: agregar y editar asignaturas (obligatorias + electivas)

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle tecnico esta en Requirements / Artifacts / Tasks.*

**Que se quiere**: hoy la malla curricular (componente `CurriculumMesh`, MC-05) solo se ve — el boton de alta esta deshabilitado. Este ticket la hace editable: un modal de alta en 2 pasos (elegir tipo + linea, luego un picker del catalogo de asignaturas) para colocar cursos **obligatorios** en masa, un flujo **electivo** que agrupa cursos en bloques con nombre (OptionPool), y un modal para **editar/quitar** una asignatura ya colocada. El diseñador curricular pasa de "ver la malla" a "poblarla y ajustarla".

**Decisiones criticas que necesitan tu OK** (racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Modales **caseros** (atomo `Modal`), no el `ModalStackManager` del platform | BUG-platform-011: el orchestrator no se expone a custom Vueform elements. Precedente probado: `CompositeSectionTree`. |
| 2 | Bloque electivo nuevo se nombra con Vueform **`create:true`** (decision dev, draft v1) | Arrastra el riesgo de que `create:true` invoque el ModalStackManager no disponible (BUG-011). Se valida con un **spike bloqueante** al inicio de S3; fallback = input de texto (cumple delta D-1). |
| 3 | Composable **nuevo** `useBlockOptions` (no reuso de `useOwnerIdOptions`) | `useOwnerIdOptions` esta hardcodeado a AcademicProgram/Institution; no sirve para `requirement(Group)` por curriculum. |
| 4 | Dominio nuevo vive **solo en el adapter** (`CurriculumMeshElement` + `.ts`), no en las primitivas de render | DEC-038 / RULE-mods-051: preserva el seam agnostico para reuso futuro y evita hornear dominio en el core. |

**Riesgos principales y como los mitigamos**:

- **`create:true` de Vueform puede no funcionar dentro del modal casero (BUG-011)** → spike de integracion bloqueante como **primer paso de S3** (S3.T1), antes de cablear el tagging. Si falla, fallback documentado a input de texto, sin perder el sprint.
- **Render del dropdown Vueform bajo `<Teleport to="body">` (z-index)** → cubierto por el mismo spike + evidencia a favor en `Modal.stories.ts:1113-1127`.
- **Acoplar dominio al core presentacional (regresion de la arquitectura MC-05)** → tarjeta por slot, acciones por evento; grep de verificacion (RULE-mods-051) en el GATE de cada session.
- **Filtro cross-mod por departamento (`OrgUnit`)** → se resuelve client/server con `Activity.executionUnitId`, sin tocar uengagement.

**Que NO se hace en este ticket** (limites del scope):

- Prerrequisitos / K-de-N gating al agregar, drag&drop, filtros de resaltado → **MC-08** (el modal de bloqueo por prereqs del mockup 818-835 NO entra aqui).
- Edicion directa del objeto bloque (se crea/crece por tagging, no se edita — DEC-031).
- Color/icono de la linea de formacion via componente `view` → delta D-5, fuera de MC-06.
- Cambios en backend/resolvers del mod (todo pasa por `createInstance`/`updateInstance` del platform).

**Tamano estimado**: 5 sessions ejecutables (S1-S5), ~11-13h efectivas. La mas riesgosa es **S3** (select-suggest + spike `create:true`); el nucleo Must (obligatorias end-to-end) cierra en **S2**.

**Como vas a saber que funciona** (criterios observables):

- Abro la malla de un curriculo en `Draft`, hago "Agregar asignatura", elijo Obligatoria + linea "Nucleo", selecciono 3 cursos del picker → aparecen 3 tarjetas en el periodo, con la linea aplicada y los creditos heredados.
- El picker NO muestra cursos que ya estan en la malla.
- Elijo Electiva, nombro/elijo un bloque, agrego cursos → quedan tagueados al bloque y `minToSatisfy` se auto-deriva del conteo.
- Abro una asignatura colocada, le cambio el Rol a Electiva → recibe blockId; "Quitar de la malla" la elimina.

---

## Purpose

Extender el adapter de dominio `CurriculumMeshElement.vue` (MC-05) con los flujos de escritura de la malla: alta de asignaturas (obligatorias en masa + electivas tagueadas a un bloque) via un modal casero de 2 pasos con picker de catalogo, y edicion/quita de una asignatura colocada. Toda la logica de derivacion (payloads de planEntry, creditos heredados, minToSatisfy auto, transiciones de Rol) vive en `curriculumMesh.logic.ts` (puro, testeable); el `.vue` orquesta modales caseros y emite/consume eventos sin hornear dominio en las primitivas de render (RULE-mods-051).

## Requirements

### REQ-01: Modal de alta en 2 pasos

> **Que cambia**: el boton "Agregar asignatura" (hoy deshabilitado) abre un modal de 2 pasos — primero eliges el tipo, despues seleccionas cursos del catalogo.
> **Por que**: separar "que tipo de asignacion" de "que cursos" evita un formulario unico confuso y habilita el flujo en masa.

El sistema MUST presentar un modal casero (atomo `Modal`) de 2 pasos: paso 1 = tipo de asignacion (Obligatoria / Electiva); paso 2 = picker de `Activity` (buscar + filtro por departamento + multiseleccion).

**Actor**: user (diseñador curricular)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: abrir y navegar
- **GIVEN** una malla de un curriculo en `status: Draft` con `enableEdit: true`
- **WHEN** el usuario hace click en "Agregar asignatura" en un periodo
- **THEN** se abre el modal en paso 1 con el selector de tipo
- **AND** al elegir tipo y "Siguiente" avanza al paso 2 (picker)

#### Scenario: curriculo no editable
- **GIVEN** un curriculo en status distinto de `Draft`
- **WHEN** se renderiza la malla
- **THEN** el boton de alta permanece deshabilitado y el modal no abre

#### Scenario: volver al paso 1
- **GIVEN** el modal en paso 2
- **WHEN** el usuario hace "Atras"
- **THEN** vuelve al paso 1 preservando el tipo elegido

</details>

#### Acceptance
**El usuario puede verificar que funciona**: hace click en "Agregar asignatura" y ve un modal con stepper de 2 pasos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | abrir modal | malla Draft editable | click "Agregar" | modal abre en paso 1 | `modalState.open === true, step === 1` |
| 2 | avanzar | paso 1 con tipo elegido | "Siguiente" | paso 2 | `step === 2` |

### REQ-02: Flujo obligatoria + linea en masa

> **Que cambia**: al agregar obligatorias puedes fijar UNA linea de formacion para todo el lote, en vez de curso por curso.
> **Por que**: asignar la linea individualmente es engorroso con 10+ cursos.

En el paso 1 (Obligatoria) el sistema MUST permitir elegir una **linea de formacion opcional aplicada en masa** a todos los cursos seleccionados. Al confirmar, crea un `planEntry` por curso (kind=Course) **sin** `blockId`, con `categoryId` (si se eligio linea) y `credits` heredados de la Activity.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: alta en masa con linea
- **GIVEN** paso 2, tipo Obligatoria, linea "Nucleo" elegida en paso 1, 3 cursos seleccionados, periodo 1
- **WHEN** el usuario confirma "Agregar (3)"
- **THEN** se crean 3 planEntry con `period=1`, `categoryId=<Nucleo>`, `blockId=null`, `credits=null` (hereda)

#### Scenario: alta sin linea
- **GIVEN** tipo Obligatoria sin linea elegida
- **WHEN** confirma 2 cursos
- **THEN** 2 planEntry con `categoryId=null`, `blockId=null`

#### Scenario: position consecutiva
- **GIVEN** el periodo 1 ya tiene 2 entries (position 0,1)
- **WHEN** agrega 1 curso mas
- **THEN** el nuevo entry recibe `position=2`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: agrega 3 obligatorias con linea "Nucleo" y ve 3 tarjetas en el periodo con esa linea y los creditos del catalogo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-01 alta masa | catalogo, linea Nucleo, 3 cursos, period 1 | confirmar | 3 planEntry | `period=1, categoryId=Nucleo, blockId=null, credits heredado` |

### REQ-03: Picker oculta cursos ya agregados

> **Que cambia**: las asignaturas que ya estan en la malla desaparecen del picker.
> **Por que**: "si ya agregue Calculo I, no deberia poder agregarlo de nuevo".

El picker MUST excluir las `Activity` que ya tienen un `planEntry` en el plan actual, y mostrar solo las `isCurrent`.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: exclusion de agregados
- **GIVEN** MAT110 ya tiene planEntry en el plan
- **WHEN** se abre el picker
- **THEN** MAT110 no aparece en la lista

#### Scenario: solo vigentes
- **GIVEN** una Activity con `isCurrent=false`
- **WHEN** se abre el picker
- **THEN** esa Activity no aparece

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el picker con MAT110 ya colocado y no lo ve en la lista.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-02 exclusion | MAT110 colocado | abrir picker | lista sin MAT110 | `pickList.find(MAT110) === undefined` |

### REQ-04: Filtro por departamento

> **Que cambia**: el picker tiene un filtro por departamento (la unidad que dicta la asignatura).
> **Por que**: el catalogo es grande; filtrar por depto acota la busqueda.

El picker MUST filtrar por departamento = `Activity.executionUnitId` → `OrgUnit` (objeto cross-mod uengagement-up1).

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: filtrar por depto
- **GIVEN** el picker con cursos de varios departamentos
- **WHEN** el usuario elige "Matematicas" en el filtro
- **THEN** solo aparecen cursos con `executionUnitId` de Matematicas

#### Scenario: busqueda por texto
- **GIVEN** el picker abierto
- **WHEN** el usuario escribe "calc"
- **THEN** la lista filtra por nombre o codigo que matchee

</details>

#### Acceptance
**El usuario puede verificar que funciona**: elige un departamento en el filtro y la lista se reduce a cursos de ese depto.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | filtro depto | cursos mixtos | seleccionar Matematicas | lista filtrada | solo `executionUnitId=Mat` |

### REQ-05: Flujo electiva — bloque existente o nuevo (select-suggest) *(🆂 Should)*

> **Que cambia**: al elegir Electiva, asignas el curso a un bloque con nombre — eliges uno existente del plan o creas uno nuevo tipeando.
> **Por que**: corrige el mockup (no se veian los bloques hasta elegir asignatura) y le da identidad propia al bloque.

El sistema SHOULD permitir seleccionar un bloque existente del plan **o** crear/nombrar uno nuevo, via select-suggest (Vueform `SelectElement` con `search:true` + `create:true`), con opciones remotas de `requirement(recordType=Group, ownerType=curriculum, ownerId=planId)` pobladas por el composable nuevo `useBlockOptions`.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: elegir bloque existente
- **GIVEN** el plan tiene un bloque "Electivo Esp."
- **WHEN** el usuario elige Electiva y selecciona "Electivo Esp." en el select-suggest
- **THEN** el flujo usa el `blockId` del Group existente

#### Scenario: crear bloque nuevo
- **GIVEN** ningun bloque coincide con el texto tipeado
- **WHEN** el usuario tipea "Electivo X" y lo crea (`create:true`)
- **THEN** se prepara la creacion de un `requirement(Group, OR, ownerType=curriculum)` con ese label

#### Scenario: render dentro del modal casero (spike — H1.2)
- **GIVEN** el SelectElement embebido como mini-form Vueform dentro del modal casero
- **WHEN** se abre el modal y se despliega el dropdown
- **THEN** el dropdown renderiza y es interactuable (z-index correcto bajo Teleport); si `create:true` falla por BUG-011, aplicar fallback input de texto

</details>

#### Acceptance
**El usuario puede verificar que funciona**: elige Electiva, el select-suggest le ofrece los bloques del plan y le deja tipear uno nuevo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-03 bloque existente | bloque "Electivo Esp." existe | elegir en select | usa blockId existente | `blockId === <Group.id>` |
| 2 | TC-04 bloque nuevo | sin bloque | crear "Electivo X" | nuevo Group + tag | `requirement(Group,OR,curriculum) creado` |

### REQ-06: Tagging, no edicion del bloque *(🆂 Should)*

> **Que cambia**: agregar un curso a un bloque NO edita el bloque directamente — crea un planEntry con `blockId` y el bloque crece como consecuencia.
> **Por que**: flujo coherente con el resto de la malla (DEC-031); el bloque es del plan, no del curso.

La accion MUST ser tagging: crear `planEntry` con `blockId`; el bloque se crea/crece como consecuencia, no se edita directo. El bloque es independiente de la linea (un entry puede tener `categoryId` **y** `blockId`).

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: tag crea entry con blockId
- **GIVEN** un bloque seleccionado y 2 cursos
- **WHEN** confirma
- **THEN** 2 planEntry con `blockId=<Group>`, sin tocar el objeto Group salvo crearlo si era nuevo

#### Scenario: categoria y bloque ortogonales
- **GIVEN** un curso electivo con linea "General"
- **WHEN** se taguea a un bloque
- **THEN** el planEntry tiene `categoryId=General` Y `blockId=<Group>`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: agrega cursos a un bloque y ve que se agrupan bajo ese bloque sin abrir un editor de bloque.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | tag con blockId | bloque + 2 cursos | confirmar | entries tagueados | `entries.every(e => e.blockId === Group.id)` |

### REQ-07: Precarga de bloque existente + minToSatisfy auto *(🆂 Should)*

> **Que cambia**: al elegir un bloque existente se precargan sus cursos para sumar/quitar, y el "elige K de N" se calcula solo.
> **Por que**: evita recontar a mano y mantiene el bloque consistente.

Al elegir un bloque existente el sistema SHOULD precargar sus cursos (sumar/quitar). El `minToSatisfy` MUST auto-derivarse del conteo de cursos del bloque (default = total; ajustable). El `label` del bloque se captura con input de texto (delta D-1).

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: minToSatisfy auto
- **GIVEN** un bloque nuevo al que se agregan 4 cursos
- **WHEN** se confirma
- **THEN** `minToSatisfy = 4` (auto, ajustable)

#### Scenario: precarga
- **GIVEN** un bloque existente con 3 cursos
- **WHEN** se elige ese bloque
- **THEN** el flujo precarga los 3 cursos para editar el conjunto

</details>

#### Acceptance
**El usuario puede verificar que funciona**: agrega 4 cursos a un bloque nuevo y ve que el requisito queda en "elige 4 de 4".

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-05 minToSatisfy | bloque nuevo, 4 cursos | derivar | minToSatisfy=4 | `deriveMinToSatisfy([4 cursos]) === 4` |

### REQ-08: Editar / quitar un planEntry

> **Que cambia**: un modal flotante deja editar creditos, linea y Rol de una asignatura colocada, o quitarla de la malla.
> **Por que**: poblar la malla requiere tambien ajustar y corregir lo ya colocado.

El sistema MUST permitir, en un modal flotante: editar `credits` (override), linea (`categoryId`), Rol (Obligatoria/Electiva→bloque) y "Quitar de la malla". Rol→Electiva setea `blockId`; →Obligatoria lo limpia; cambiar la categoria NO afecta la electividad.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: cambiar Rol a Electiva
- **GIVEN** un planEntry obligatorio (blockId=null)
- **WHEN** el usuario cambia el Rol a Electiva y elige un bloque
- **THEN** el entry recibe `blockId=<Group>` y aparece el badge electivo

#### Scenario: cambiar categoria de un electivo
- **GIVEN** un planEntry electivo (blockId set)
- **WHEN** el usuario cambia la linea
- **THEN** el entry sigue electivo (`blockId` intacto)

#### Scenario: quitar de la malla
- **GIVEN** un planEntry colocado
- **WHEN** el usuario hace "Quitar de la malla"
- **THEN** el planEntry se elimina (deleteInstance) y desaparece de la columna

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre una asignatura colocada, le cambia el Rol a Electiva y ve el badge; "Quitar" la saca de la malla.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-06 Rol→Electiva | entry obligatorio | cambiar Rol + bloque | setea blockId | `entry.blockId === Group.id` |
| 2 | TC-07 categoria de electivo | entry electivo | cambiar linea | sigue electivo | `blockId` intacto |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | El picker lista el catalogo de Activity sin bloquear la UI | items cargados | limit 500 + filtro server-side por `executionUnitId`/`isCurrent` |
| Security | La edicion solo se habilita en curriculos `Draft` | gate de `enableEdit` | `Curriculum.status === 'Draft'` (heredado de MC-05) |

## Artifacts

> Sin meta-specs de componentes en el proyecto → inventario ad-hoc derivado del draft aprobado (`intent.md`).

### Componentes reusados (design system up1, `layout/src/components/`)

| Componente | Path | Uso en MC-06 |
|-----------|------|--------------|
| `Modal` (atomo) | `layout/src/components/molecules/Modal/Modal.vue` | shell de los 3 modales caseros (alta + editar) |
| `SelectElement` Vueform (`search`+`create`) | molecules-vueform / schema field | select-suggest de bloque electivo (REQ-05), embebido como mini-form |
| atoms de form (Input/Select/Checkbox/Button) | `layout/src/components/atoms/` | campos de los modales |

### Componentes / modulos nuevos (en el adapter del mod)

| Artefacto | Path (nuevo) | Consumidor en este sprint | source_ref |
|-----------|--------------|---------------------------|-----------|
| `AddEntryModal` (sub-componente del Element) | `mods/curriculum-design/modsComponents/CurriculumMesh/` | `CurriculumMeshElement.vue` (S1) | REQ-01,02,05,06 |
| `ActivityPicker` (sub-componente) | `mods/curriculum-design/modsComponents/CurriculumMesh/` | `AddEntryModal` (S2) | REQ-03,04 |
| `EditEntryModal` (sub-componente) | `mods/curriculum-design/modsComponents/CurriculumMesh/` | `CurriculumMeshElement.vue` (S5) | REQ-08 |
| `useActivityPicker` (composable) | `mods/curriculum-design/modsComposables/useActivityPicker.ts` | `ActivityPicker` (S2) | REQ-03,04 |
| `useBlockOptions` (composable) | `mods/curriculum-design/modsComposables/useBlockOptions.ts` | `AddEntryModal` select-suggest (S3) | REQ-05 |
| logica de alta/tagging/edicion (puro) | `mods/curriculum-design/modsComponents/CurriculumMesh/curriculumMesh.logic.ts` (extiende) | tasks S2/S4/S5 | REQ-02,06,07,08 |

> **Checklist de calidad (design-feature §5)**: (a) sin hardcode de copys — los labels de UI van a i18n del mod (`curriculumMesh.*`, namespace ya usado en MC-05); (b) cada artefacto nuevo tiene consumidor en este sprint (tabla arriba); (c) sin heuristicas por nombre de campo — el dominio entra al adapter via props tipadas y eventos (RULE-mods-051).

## Tasks

> Numeracion: el ticket no tenia `### Session N` previas → el plan arranca en **S1** (DET-20).

### Session 1 — Modal de alta: shell + paso 1 (tipo + linea en masa) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | `AddEntryModal` (modal casero via atomo `Modal`) con stepper de 2 pasos; paso 1 = select tipo (Obligatoria/Electiva) + select linea en masa; navegacion paso 1↔2; cablear `onAddPlaceholder`/boton de alta (quitar `disabled`) en `CurriculumMeshElement.vue` | REQ-01 | developer | — | `modsComponents/CurriculumMesh/AddEntryModal.vue` (nuevo), `CurriculumMeshElement.vue`, `CurriculumMesh.stories.ts` | vitest (story render) + lint | git revert | DET-1, DET-2, DET-8, RULE-mods-051, RULE-curriculum-design-014 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir en `## Sessions`, validar tier, decidir continue/iterate/escalate | — | reviewer | S1.T1 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Picker de Activity + alta obligatoria end-to-end (cierra el Must) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S2.T1, S2.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `useActivityPicker` composable: `listInstances(Activity, filters:[executionUnitId, isCurrent])` + lista de departamentos; `.spec.ts` con Apollo mock | REQ-04 | developer | S1.GATE | `modsComposables/useActivityPicker.ts` (nuevo) + `.spec.ts` | vitest (mock Apollo) | git revert | DET-1, DET-2, DET-8, DET-11 | done | 2 |
| S2.T2 | `ActivityPicker.vue` (paso 2): buscar por nombre/codigo, filtro depto, multiseleccion, exclusion client-side de Activities ya en el plan (`isCurrent`); test de interaccion | REQ-03, REQ-04 | developer | S2.T1 | `modsComponents/CurriculumMesh/ActivityPicker.vue` (nuevo) + test interaccion | vitest jsdom (interaccion) | git revert | DET-5, DET-8, RULE-mods-051 | done | 2 |
| S2.T3 | Logica de alta obligatoria → planEntries: `buildPlanEntryPayloads` (kind=Course, sin blockId, categoryId en masa, credits=null hereda, position consecutiva) en `curriculumMesh.logic.ts`; cablear `createInstance` desde el Element; `.spec.ts` (TC-01) | REQ-02 | developer | S1.GATE | `modsComponents/CurriculumMesh/curriculumMesh.logic.ts` (extiende) + `.spec.ts`, `CurriculumMeshElement.vue` | vitest (TC-01) | git revert | DET-1, DET-2, DET-7, DET-8, RULE-curriculum-design-014 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T3) — flujo Must obligatorias end-to-end; smoke UI; grep RULE-mods-051 (sin dominio en primitivas); persistir + decidir | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + smoke UI + grep | (no aplica) | DET-20, DET-23, DET-33 | done | 2 |

### Session 3 — Select-suggest de bloque + spike create:true (riesgo H1.2) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | **Spike bloqueante**: validar render del Vueform `SelectElement` (search+create) embebido como mini-form en el modal casero (z-index/Teleport + flujo `create:true` bajo BUG-011). Veredicto: create:true OK, sino fallback input de texto. Registrar decision (`dkc-record-decision`) + learn | REQ-05 | developer | S2.GATE | `AddEntryModal.vue`, story de validacion | manual (render en story) + decision registrada | git revert | DET-1, DET-4, DET-12, BUG-platform-011 | done | 3 |
| S3.T2 | `useBlockOptions` composable: `listInstances(requirement, filters:[recordType=Group, ownerType=curriculum, ownerId=planId])` → opciones {value,label}; `.spec.ts` con Apollo mock | REQ-05 | developer | S2.GATE | `modsComposables/useBlockOptions.ts` (nuevo) + `.spec.ts` | vitest (mock Apollo) | git revert | DET-1, DET-2, DET-8, DET-11 | done | 3 |
| S3.T3 | Integrar select-suggest en paso 1 (rama Electiva): elegir bloque existente (opciones de S3.T2) o crear nuevo segun veredicto de S3.T1; test de interaccion | REQ-05 | developer | S3.T1, S3.T2 | `AddEntryModal.vue` + test interaccion | vitest jsdom (TC-03, TC-04 wiring) | git revert | DET-5, DET-8, RULE-curriculum-design-015, RULE-mods-051 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T3) — select-suggest funcional en modal casero; veredicto del spike documentado; persistir + decidir | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + evidencia spike | (no aplica) | DET-20, DET-23, DET-33 | done | 3 |

### Session 4 — Tagging electivo: crear/crecer bloque, precarga, minToSatisfy, label [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Logica de tagging electivo en `curriculumMesh.logic.ts`: `buildBlockPayload` (requirement Group, OR, ownerType=curriculum, label), `deriveMinToSatisfy` (default=total), planEntry con blockId; `.spec.ts` (TC-04, TC-05) | REQ-06, REQ-07 | developer | S3.GATE | `curriculumMesh.logic.ts` + `.spec.ts` | vitest (TC-04, TC-05) | git revert | DET-1, DET-2, DET-7, DET-8 | done | 4 |
| S4.T2 | Wiring en el Element: crear bloque nuevo (createInstance Group) + tag de planEntries; precarga de cursos del bloque existente; label por input; test de interaccion | REQ-06, REQ-07 | developer | S4.T1 | `CurriculumMeshElement.vue`, `AddEntryModal.vue` + test interaccion | vitest jsdom (interaccion) | git revert | DET-5, DET-8, RULE-mods-051, RULE-curriculum-design-015 | done | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier: T3) — electivas end-to-end; persistir + decidir | — | reviewer | S4.T1, S4.T2 | ticket | gate persistido + smoke UI | (no aplica) | DET-20, DET-23 | done | 4 |

### Session 5 — Modal editar/quitar planEntry [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Logica de edicion en `curriculumMesh.logic.ts`: `applyRoleChange` (Electiva→set blockId, Obligatoria→clear), override credits, categoria ortogonal a electividad, `buildRemove`; `.spec.ts` (TC-06, TC-07) | REQ-08 | developer | S4.GATE | `curriculumMesh.logic.ts` + `.spec.ts` | vitest (TC-06, TC-07) | git revert | DET-1, DET-2, DET-7, DET-8 | done | 5 |
| S5.T2 | `EditEntryModal.vue`: creditos, linea, Rol (+ select-suggest de bloque cuando Electiva), "Quitar de la malla" (deleteInstance); cablear desde tarjeta del Element; test de interaccion | REQ-08 | developer | S5.T1 | `modsComponents/CurriculumMesh/EditEntryModal.vue` (nuevo), `CurriculumMeshElement.vue` + test interaccion | vitest jsdom (interaccion) | git revert | DET-5, DET-8, RULE-mods-051, RULE-curriculum-design-014 | done | 5 |
| **S5.GATE** | Gate de sync Session 5 (tier: T3) — editar/quitar funcional; acceptance checkpoints; persistir + decidir cierre | — | reviewer | S5.T1, S5.T2 | ticket | gate persistido + acceptance | (no aplica) | DET-20, DET-23 | done | 5 |

## Constraints

- RULE-curriculum-design-014: componente full-page del mod = Vueform element + modales caseros — aplica a los 3 modales y la logica pura `.ts`.
- RULE-curriculum-design-015: select-suggest = reusar Vueform search+create (REQ-05). **Matiz**: las opciones remotas NO salen de `useOwnerIdOptions` (hardcodeado) → composable nuevo `useBlockOptions`.
- RULE-mods-051: seam core presentacional (slots/eventos) vs adapter de dominio — todo el dominio de MC-06 en el adapter; primitivas sin identificadores de dominio (grep de verificacion en cada GATE).
- DEC-031: bloque electivo = requirement(Group) + tagging (no edicion directa del bloque).
- DEC-038: CurriculumMesh = adapter sobre core presentacional; extraccion del board generico diferida (no extraer en MC-06).
- BUG-platform-011: ModalStackManager no expuesto a custom Vueform elements → modales caseros; condiciona el spike de S3 (`create:true`).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| MC-02 (TICKET-082, closed) | internal | objeto planEntry + read enrichment (effectiveCredits, isElective) | bajo — cerrado |
| MC-03 (TICKET-083, closed) | internal | requirement(Group) para bloques electivos | bajo — cerrado |
| MC-05 (TICKET-085, closed) | internal | `CurriculumMeshElement` base + seam (DEC-038/RULE-mods-051) | bajo — cerrado |
| uengagement-up1 (OrgUnit) | internal cross-mod | `Activity.executionUnitId` → OrgUnit para el filtro de depto | bajo — solo lectura via FK |
| Vueform `SelectElement` create:true | external (lib) | flujo crear-bloque-nuevo | medium — BUG-011; mitigado por spike S3 + fallback |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `create:true` no funciona en modal casero (BUG-011) | medium | bloquea REQ-05 crear-nuevo | spike bloqueante S3.T1 antes de cablear; fallback input de texto (delta D-1) |
| dropdown Vueform mal posicionado bajo Teleport | low | UX degradada | evidencia a favor `Modal.stories.ts:1113-1127`; validar en spike |
| dominio se filtra a las primitivas de render | medium | regresion arquitectura MC-05 | grep en cada GATE (RULE-mods-051); slot+evento |
| exclusion de agregados desincronizada | low | curso duplicado en picker | exclusion client-side contra planEntries vigentes del plan (REQ-03) |

## Open questions

- (ninguna abierta — la decision de `create:true` quedo tomada por el dev en draft v1; se valida empiricamente en S3.T1 con fallback documentado)

## Decisions

### DEC-LOCAL-01: Bloque electivo nuevo via Vueform create:true (no input de texto)
- **Contexto**: como nombrar un bloque electivo nuevo desde el select-suggest.
- **Drivers**: integracion mas fluida (un solo control) vs riesgo de BUG-011 (ModalStackManager).
- **Opcion elegida**: `create:true` de Vueform (decision del dev en aprobacion del draft v1).
- **Alternativas**: input de texto separado (recomendacion LLM, sidestep del riesgo + cumple delta D-1) — queda como **fallback** si el spike S3.T1 falla.
- **Consecuencias**: gana fluidez; asume el riesgo de integracion, acotado por el spike bloqueante de S3.
- **Session**: S0 (design), validacion empirica en S3.

### DEC-LOCAL-02: useBlockOptions nuevo (no reuso de useOwnerIdOptions)
- **Contexto**: poblar las opciones remotas de bloques del plan.
- **Drivers**: `useOwnerIdOptions` esta hardcodeado a AcademicProgram/Institution.
- **Opcion elegida**: composable nuevo `useBlockOptions` sobre `listInstances(requirement, Group, curriculum)`.
- **Alternativas**: forzar useOwnerIdOptions (no aplica) — descartado.
- **Consecuencias**: artefacto nuevo pequeño y testeable; alineado con el patron de `useCurriculumMesh`.
- **Session**: S0 (design).

## Technical reference

- **Crear planEntry**: `createInstance(objectType:"planEntry", data:{planId, activityId, period, position, categoryId?, blockId?, credits?, kind:'Course'})`. Read enrichment backend: `effectiveCredits = credits ?? Activity.credits`, `isElective = blockId != null` (`curriculum-read.resolver.js:185-225`).
- **Crear bloque**: `createInstance(objectType:"rt__Group__requirement", data:{ownerType:'curriculum', ownerId:planId, parentId:null, recordType:'Group', effect, label, combinator:'OR', minToSatisfy, isHardRule:false, position})`.
- **Quitar entry**: `deleteInstance(objectType:"planEntry", id)` (patron generico del platform).
- **Listar Activity**: `listInstances(name:"Activity", filters:[{field:'executionUnitId',operator:'EQUALS',value:orgUnitId},{field:'isCurrent',operator:'EQUALS',value:'true'}], limit:500)`.
- **Listar bloques**: `listInstances(name:"requirement", filters:[{recordType=Group},{ownerType=curriculum},{ownerId=planId}])`.
- **Modal casero**: `Modal.vue` (`v-model`, slots default/#header/#footer, Teleport-to-body). Patron: `CompositeSectionTreeElement.vue:131-154`.
- **Tests**: Vitest. Logica pura → `*.logic.spec.ts` (node). Componentes → `@vitest-environment jsdom`. Mock Apollo: `vi.mock('@/composables/useApolloClient', () => ({ useTenantApolloClient: () => ({ query: mockQuery }) }))`. Stubs en `tests/stubs/`.

## Rules discovered

- RULE-curriculum-design-024: select-suggest Vueform create:true self-contained en modal casero (L8)
- RULE-platform-018: createInstance de RecordType usa objectType rt__X__Y (L10)
- RULE-mods-052: tests verdes != integracion/tipos — vue-tsc + contrato backend en gates UI (L14)

## Bugs found

{se llena durante ejecucion}

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..08 pasan (Must: 01-04; Should: 05-07; 08 editar/quitar)
- [ ] **Tests**: TC-01..07 escritos y pasando; logica pura con `.spec.ts`; modales/picker con test de interaccion (RULE-mods-051)
- [ ] **NFRs**: picker con limit + filtro server-side; edicion gated a `Draft`
- [ ] **Rules**: grep confirma sin identificadores de dominio en primitivas de render (RULE-mods-051); modales caseros (RULE-cd-014); select-suggest reusado (RULE-cd-015)
- [ ] **Integration**: la vista read-only de MC-05 no se rompe (regression)
- [ ] **Docs**: stories actualizadas; i18n del namespace `curriculumMesh.*` poblado

## Archiving

Usar `/dkc-archive-spec SPEC-curriculum-design-mesh-add-edit "razon"` cuando deje de ser fuente de verdad.
