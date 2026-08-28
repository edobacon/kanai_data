---
id: SPEC-curriculum-design-modular-mesh-level-derivation
project: up1
ticket: TICKET-120
status: in_progress
---

# Malla curricular por niveles para planes de estudio modulares

# Malla curricular por niveles para planes de estudio modulares

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks. Si te basta el Executive summary para decidir, ese es el objetivo.*

**Que se quiere**: hoy la malla curricular solo dibuja planes secuenciales (columnas = semestres). Las carreras modulares (ej. un magister sin semestres fijos) progresan por la inscripcion del estudiante, no por periodos. Esta feature agrega un segundo modo a la misma malla: cuando el plan es Modular, las columnas pasan a ser **niveles derivados automaticamente del grafo de prerrequisitos** de las asignaturas. Es una adicion — el modo secuencial sigue funcionando exactamente igual. El modo se elige por el campo `progression` del plan (mismo dato que configura UPONE-1538).

**Decisiones criticas que necesitan tu OK** (racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `planEntry.period` pasa de obligatorio a **nullable** (camino completo, `layer:mod`) | Habilita entries modulares sin periodo. Se edita en el JSON del mod y se propaga por el flujo estandar codegen + sync + migrate (migracion no-destructiva `DROP NOT NULL`, sin perdida). Es el mayor riesgo tecnico del ticket (regresion secuencial) |
| 2 | El orden en modular es **solo lectura** (drag deshabilitado) | El grafo dicta el orden; resuelto por la maqueta `mockup_v10`. Reduce superficie y evita mezclar convenciones de `position` |
| 3 | El nivel **no se persiste** — es derivado en runtime | Cero columna nueva; menor superficie de datos. La derivacion corre en cada render/edicion |
| 4 | Derivacion **fiel al arbol Y/O** (AND→max, OR→min, K-de-N→K-esimo menor) | Un OR no debe ubicar el curso tras la opcion mas profunda; corrige el max plano inicial (DEC-LOCAL-05) |
| 5 | Requisitos de **creditos** aportan nivel via **heuristica de 2 pasadas** | Evita que un curso gateado por creditos caiga en nivel 1; pero es fragil/interdependiente — merecia su propio analisis (DEC-LOCAL-06) |
| 6 | Display prereq/coreq por tarjeta en **modal** (REQ-08) | Modal por accion explicita, drag-safe (DEC-LOCAL-04) |
| 7 | **Flujo guiado de alta SOLO modular** (REQ-10) + **batch atomico mod-owned** (REQ-11) | Solo modular (secuencial mantiene bloqueo REQ-05); el conjunto se persiste todo-o-nada via resolver custom del mod (`$transaction`) → `layer:mod`. Solo la generalizacion core y el batch del reorder van a ticket aparte |
| 8 | **Paridad del MCP** (REQ-12) resuelta en ESTE ticket (multi-repo) | Decision del dev: 120 resuelve todo. Suma el repo `up1-mcp` (Session 7): cd_add_plan_entry modular + cd_get_mesh por niveles + port de la derivacion. Riesgo de drift mitigado con tests de paridad |

**Riesgos principales y como los mitigamos**:

- **Romper el camino secuencial al hacer `period` nullable** → auditoria DET-40 1:1 (enumerar cada consumidor de `period` y verificar que tolera `null`) en S4 + baseline de regresion capturada en S1 ANTES de tocar nada + smoke de ambos modos en S6.
- **Migracion por tenant** → es una relajacion de nullabilidad (NOT NULL → NULL): sin perdida de datos; se corre por el flujo estandar del mod (codegen + sync + `prisma migrate` por tenant), mismo patron que cualquier cambio de objeto del mod. No requiere coordinacion del team core (migracion no-destructiva).
- **Derivacion de nivel incorrecta ante ciclos / contenedores / pools inconsistentes** → funcion pura `deriveLevel` con tests que fijan esos casos (S3) antes de cablearla al render.

**Que NO se hace en este ticket** (limites del scope):

- La configuracion del formulario del plan (visibilidad de campos por progresion) → es UPONE-1538 / TICKET-119.
- El motor de evaluacion del avance del estudiante → fuera de alcance.
- Reordenamiento manual en modular con semantica nueva → descartado (orden = grafo).
- **Que el usuario elija como una temporalidad ambigua (`Either`/ausente) afecta el nivel** (control al ingresar el requisito o desambiguacion posterior) → **diferido** (DEC-LOCAL-03 alternativa b). En esta version la regla es fija: solo `Before` empuja. Se evaluara segun necesidad mas adelante — otro analisis.
- El comportamiento del switch Modular→Secuencial de un plan con entries `period=null` → se coordina con UPONE-1538 (Open question OQ-1).
- **Generalizacion del batch en el CRUD de OM** (`createManyInstances` para cualquier objeto) y el **`updatePlanEntriesBatch` del reorder** (transversal, toca secuencial) → van al ticket aparte `sp8/batch-planentry-atomic-mutation-analysis.md` (eso SI es core / transversal). El batch atomico de alta modular (REQ-11) SI entra en este ticket por ser mod-owned. El flujo guiado NO se agrega al modo **secuencial**.

**Tamano estimado**: 7 sessions ejecutables (S1-S7), ~26-28 SP (13 base + ~2-3 REQ-08 + ~2-3 REQ-09/arbol fiel + ~4-5 REQ-10/REQ-11 + ~4-5 REQ-12 paridad MCP). Multi-repo con **orden de ejecucion en dos etapas**: **(1) Plataforma** — S1-S6 en `mods/curriculum-design/`, se ejecuta Y se valida (S6 = fixture + smoke dual + regresion en verde); **(2) MCP** — S7 en `up1-mcp`, arranca **solo tras S6.GATE** (plataforma validada), portando la logica ya estabilizada. La mas riesgosa es **S2** (modelo + migracion); la mas delicada de correctitud es **S3** (derivacion fiel + creditos); **S7** suma el port al MCP con riesgo de drift (mitigado con tests de paridad).

**Como vas a saber que funciona** (criterios observables):

- Abro un plan Modular en la malla y veo columnas "Nivel 1..N" (no "Periodo"), con cada asignatura ubicada segun sus prerrequisitos; agrego/quito una y los niveles se reacomodan solos.
- Un curso con corequisito aparece en la MISMA columna que su corequisito (no una a la derecha); uno con prerrequisito, una columna a la derecha.
- Abro un plan Secuencial y la malla se ve y se comporta igual que hoy (columnas por periodo, drag activo).
- En modular el drag esta apagado y no aparece el control de agregar/quitar periodo.
- El validador final (S6) es un smoke de AMBOS modos sobre un caso sembrado reproducible (con prereqs + coreqs), que ademas queda como fixture demo re-aplicable para mostrar la funcionalidad.

---

## Purpose

Extender el componente Vueform `CurriculumMesh` del mod curriculum-design para que ramifique su render por el enum `progression` del plan: modo Secuencial (existente, por periodos) y modo Modular (nuevo, columnas = niveles derivados del grafo de prerrequisitos-curso). Reusa la logica de prerrequisitos del SP7 y agrega la derivacion de nivel (con deteccion de ciclos). Salda la deuda de modelo `planEntry.period` nullable documentada en el schema (MC-02/UPONE-1345).

## Requirements

### REQ-01: Distincion de modo por `progression`

> **Que cambia**: la malla empieza a leer el tipo de progresion del plan. Si es Modular, dibuja niveles; si es Secuencial, dibuja periodos como hoy. Hoy la malla es ciega a ese dato.
> **Por que**: sin leer `progression` no hay forma de saber que modo renderizar; el dato ya existe pero no llega al componente.

El sistema MUST leer `Curriculum.progression` (`Sequential | Modular`) y seleccionar el modo de render de la malla en base a el, sin alterar el comportamiento secuencial existente.

**Actor**: user (Diseñador Curricular)
**Layers**: frontend, state

<details><summary>Scenarios de validacion</summary>

#### Scenario: plan modular renderiza niveles
- **GIVEN** un Curriculum con `progression = Modular`
- **WHEN** el usuario abre la malla
- **THEN** las columnas se rotulan "Nivel N" y se agrupan por nivel derivado

#### Scenario: plan secuencial sin cambios
- **GIVEN** un Curriculum con `progression = Sequential`
- **WHEN** el usuario abre la malla
- **THEN** las columnas se rotulan "Periodo N" y se agrupan por `period`, identico a hoy

#### Scenario: progression ausente/null
- **GIVEN** un Curriculum sin `progression` resuelto (dato faltante)
- **WHEN** el usuario abre la malla
- **THEN** el sistema usa el modo secuencial como default seguro (no rompe el render)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre un plan modular y ve "Nivel", abre uno secuencial y ve "Periodo".

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | modo modular | plan Modular | abrir malla | header por nivel | "Nivel 1..N" |
| 2 | modo secuencial | plan Sequential | abrir malla | header por periodo | "Periodo 1..N" |
| 3 | default seguro | progression null | abrir malla | fallback | modo secuencial |

### REQ-02: Derivacion automatica del nivel

> **Que cambia**: en modular, cada asignatura calcula sola su columna a partir de sus prerrequisitos presentes en el plan. Una sin prereqs va al nivel 1; una con prereqs va un nivel por encima del mas profundo de ellos.
> **Por que**: es el corazon del modo modular — el orden lo dicta el grafo, no el usuario.

El sistema MUST derivar el nivel de cada asignatura del plan modular **recorriendo su arbol de requisitos de forma FIEL a la estructura Y/O** (DEC-LOCAL-05), no aplanando a un max global:

- sin requisitos de curso presentes → nivel `1`;
- nodo `Group` **AND** → `max(nivel requerido de sus hijos)`;
- nodo `Group` **OR** → `min(nivel requerido de sus hijos)`; con `minToSatisfy = K` (K-de-N) → **K-esimo menor** nivel de sus hijos (K=1 ≡ OR/min; K=N ≡ AND/max);
- hoja `RecordState` (curso presente, `timing = Before`) → el nivel de ese curso;
- nivel final del curso = `1 + (nivel requerido resuelto del arbol)`.

Recalcula al agregar o quitar asignaturas. (Corequisitos `Concurrent`/`Either`/ausente no empujan — REQ-07. Requisitos no-curso de creditos aportan nivel via REQ-09.)

**Actor**: system
**Layers**: frontend (logica pura)

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin prerrequisitos
- **GIVEN** una asignatura sin requisitos-curso presentes
- **WHEN** se deriva su nivel
- **THEN** el nivel es 1

#### Scenario: AND (necesita todos)
- **GIVEN** A con un Group AND sobre C (nivel 1) y D (nivel 2), ambos presentes
- **WHEN** se deriva el nivel de A
- **THEN** A queda en nivel 3 (1 + max(1,2))

#### Scenario: OR (basta uno)
- **GIVEN** A con un Group OR sobre C (nivel 1) y D (nivel 3), ambos presentes
- **WHEN** se deriva el nivel de A
- **THEN** A queda en nivel 2 (1 + min(1,3)) — no en 4; basta la opcion mas temprana

#### Scenario: K-de-N
- **GIVEN** A con un Group OR `minToSatisfy=2` sobre opciones en niveles 1, 2 y 4
- **WHEN** se deriva el nivel de A
- **THEN** A queda en nivel 3 (1 + 2do menor = 1 + 2)

#### Scenario: recalculo al mutar
- **GIVEN** una malla modular renderizada
- **WHEN** el usuario agrega o quita una asignatura
- **THEN** los niveles de las afectadas se recalculan sin intervencion manual

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en un requisito "A o B", el curso aparece tras la opcion mas temprana (no tras la mas profunda); en un "A y B", tras la mas profunda.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | raiz | sin reqs-curso | deriveLevel | nivel | 1 |
| 2 | AND | Group AND C(1),D(2) | deriveLevel | 1+max | 3 |
| 3 | OR | Group OR C(1),D(3) | deriveLevel | 1+min | 2 |
| 4 | K-de-N | OR minToSatisfy=2 sobre 1,2,4 | deriveLevel | 1+2do menor | 3 |
| 3 | recalculo | agregar/quitar | re-derivar | niveles actualizados | consistentes |

### REQ-03: Estabilidad ante ciclos, contenedores y pools inconsistentes

> **Que cambia**: la derivacion de nivel no se cuelga si hay un ciclo de prerrequisitos, e ignora los contenedores estructurales (grupos Y/O), los grupos vacios y los pools electivos mal formados al calcular la profundidad.
> **Por que**: el arbol Y/O del SP7 tiene estos casos; contarlos mal desplaza los niveles o cuelga el calculo.

El sistema MUST terminar y reportar el caso cuando exista un ciclo de prerrequisitos entre asignaturas del plan, y MUST excluir del calculo de profundidad los contenedores estructurales `Group`, los grupos vacios (satisfechos de forma vacua) y tolerar sin fallar los pools K-de-N con N<K.

**Actor**: system
**Layers**: frontend (logica pura)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ciclo de prerrequisitos
- **GIVEN** A requiere B y B requiere A dentro del plan
- **WHEN** se deriva el nivel
- **THEN** el calculo termina (no loop infinito) y el ciclo se reporta

#### Scenario: contenedor estructural
- **GIVEN** un prereq que es un grupo Y/O (recordType Group) con hojas
- **WHEN** se deriva el nivel
- **THEN** el grupo no cuenta como prerrequisito-curso; solo sus hojas-curso presentes cuentan

#### Scenario: grupo vacio
- **GIVEN** un grupo sin hojas (satisfecho de forma vacua en el evaluador SP7)
- **WHEN** se deriva el nivel
- **THEN** el grupo vacio no baja ni distorsiona el nivel

#### Scenario: pool K-de-N inconsistente
- **GIVEN** un pool electivo con N<K (invariante rota por ediciones hoja a hoja)
- **WHEN** se deriva el nivel
- **THEN** la funcion no falla; degrada con gracia

</details>

#### Acceptance
**El usuario puede verificar que funciona**: arma un plan con una dependencia circular y la malla no se cuelga (muestra el caso reportado).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | ciclo | A↔B | deriveLevel | termina + reporta | sin loop |
| 2 | contenedor | Group con hojas | deriveLevel | excluye Group | solo hojas-curso |
| 3 | grupo vacio | Group sin hojas | deriveLevel | ignora | nivel intacto |
| 4 | pool N<K | pool inconsistente | deriveLevel | no falla | degrada con gracia |

### REQ-04: Modelo `planEntry.period` nullable

> **Que cambia**: el campo `period` de cada entrada de plan deja de ser obligatorio, para que las entradas modulares no exijan un periodo que no aplica.
> **Por que**: en modular no hay semestres; forzar `period` obligaba a un valor sin sentido. El schema ya anoto esta deuda para SP7.

El sistema MUST permitir `planEntry.period` nullable (fuera de `required[]`), propagando el cambio por codegen + migracion por tenant, sin perder datos de los planes secuenciales existentes.

**Actor**: system
**Layers**: database, backend (CRUD auto-generado), config (JSON del objeto)

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear entrada modular sin periodo
- **GIVEN** un plan Modular
- **WHEN** se crea una `planEntry` sin `period`
- **THEN** la mutacion de create la acepta (no exige `period`)

#### Scenario: entradas secuenciales intactas
- **GIVEN** planes secuenciales existentes con `period` numerico
- **WHEN** corre la migracion NOT NULL → NULL
- **THEN** conservan su `period`; no hay perdida de datos

#### Scenario: create secuencial sigue exigiendo periodo logicamente
- **GIVEN** un plan Secuencial
- **WHEN** se agrega una asignatura por la UI
- **THEN** la UI sigue asignando `period` (columna donde se agrega), aunque el schema ya no lo obligue

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea una asignatura en un plan modular y se guarda sin pedir periodo; los planes secuenciales existentes siguen mostrando sus periodos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | create modular | plan Modular | createPlanEntry sin period | OK | acepta null |
| 2 | migracion sin perdida | secuenciales con period | migrate NULL | datos intactos | period conservado |
| 3 | create secuencial | plan Sequential | agregar por UI | period asignado | columna destino |

### REQ-05: Homologacion del flujo de agregado con prerrequisitos faltantes

> **Que cambia**: al intentar agregar una asignatura con requisitos NO cumplidos, el modal **alerta cual requisito falta** (mismo comportamiento que el secuencial); y si el usuario vuelve atras sin completar, no queda ni la asignatura ni sus prerrequisitos a medio agregar.
> **Por que**: la maqueta define un flujo que "recuerda" la accion hasta completar; el usuario debe ver que le falta, y cancelar debe dejar la malla consistente, sin acciones colgando.

El sistema MUST, al intentar agregar una asignatura con requisitos no cumplidos, **alertar cual(es) requisito(s) no se cumple(n)** reusando el modal bloqueante existente `PrereqBlockModal` + `findMissingPrereqs`/`findMissingPrereqsForBatch` (`prereqCheck.logic.ts`, UPONE-1351): lista los faltantes con su label (con **alternativas** para grupos OR), evaluando **fielmente el arbol** (cubre cursos, creditos y `MetricThreshold`, no solo cursos-directos), y ofrece Cancelar/Volver (no "continuar igual", DEC-035). Es el MISMO comportamiento del modo secuencial — se reusa, no se reimplementa. Ademas MUST mantener la malla consistente si el usuario cancela o vuelve atras: no persistir la asignatura ni sus prerrequisitos parcialmente.

**Actor**: user (Diseñador Curricular)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: alerta cual requisito falta
- **GIVEN** el usuario intenta agregar una asignatura con un requisito no cumplido (curso, credito o grupo OR)
- **WHEN** confirma el alta
- **THEN** el modal bloqueante (`PrereqBlockModal`) lista CUAL requisito falta (con alternativas si es OR) y ofrece Cancelar/Volver — mismo comportamiento que el secuencial

#### Scenario: cancelar deja todo limpio
- **GIVEN** el usuario agrega una asignatura con prereqs faltantes (flujo de alta activo)
- **WHEN** vuelve atras sin completar
- **THEN** no queda la asignatura ni sus prereqs a medio agregar

#### Scenario: completar agrega todo consistente (modo modular — via REQ-10)
- **GIVEN** el flujo de alta MODULAR con prereqs faltantes (el completar-in-flow es especifico de modular, REQ-10; en secuencial el comportamiento es solo el bloqueo `Volver/Cancelar`)
- **WHEN** el usuario completa todos los prereqs sin cerrar el modal (REQ-10)
- **THEN** se agregan la asignatura y sus prereqs en una unica accion consistente (persistencia atomica REQ-11)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intenta agregar una asignatura con un requisito no cumplido y ve en el modal exactamente cual falta; si cancela, la malla queda como antes.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | alerta faltante | alta con requisito no cumplido | confirmar | modal lista cual falta | PrereqBlockModal con label(s) + alternativas OR |
| 2 | cancelar | alta con prereqs faltantes | volver atras | rollback | malla intacta |
| 3 | completar | alta con prereqs faltantes | completar todos | commit | agregado consistente |

### REQ-PRESERVE-01: El camino secuencial no cambia (DET-40)

> **Que cambia**: nada para el usuario de planes secuenciales — es la garantia de no-regresion.
> **Por que**: el modo secuencial esta en produccion; todo el cambio es aditivo o discriminado por modo.

El sistema MUST preservar el comportamiento del render secuencial (columnas por periodo, drag&drop, agregar/quitar periodo, discrepancia de periodos) sin cambios observables tras introducir el modo modular y la nullabilidad de `period`.

**Actor**: user (Diseñador Curricular)
**Layers**: frontend, backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: render secuencial identico
- **GIVEN** un plan Secuencial antes y despues del cambio
- **WHEN** se compara el render y las acciones (drag, agregar/quitar periodo)
- **THEN** se comportan identico (baseline S1 == estado post-cambio)

#### Scenario: consumidores de period toleran contexto modular
- **GIVEN** `groupByPeriod`, `nextPosition`, `recalcPeriodPosition`, `computePeriodCountDiscrepancy`
- **WHEN** el plan es secuencial (period no-null)
- **THEN** operan igual que hoy; ninguno recibe null en el camino secuencial

</details>

#### Acceptance
**El usuario puede verificar que funciona**: usa un plan secuencial completo (crear/mover/agregar periodo) y todo funciona como antes.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | baseline | plan secuencial | comparar pre/post | sin delta | identico |
| 2 | drag secuencial | plan secuencial | arrastrar tarjeta | persiste period/position | como hoy |

### REQ-06: Factores transversales (i18n, a11y, story, tokens)

> **Que cambia**: el encabezado "Nivel N" y los mensajes del flujo de alta salen en es/en/pt; la story del componente cubre el estado modular; el modo por niveles mantiene foco/teclado y usa design tokens.
> **Por que**: son requisitos de calidad del mod; un conflicto de key i18n aborta el sync.

El sistema MUST agregar la key i18n `curriculumMesh.level` (y los textos del flujo de alta) en `lang/{es,en,pt}` con paridad, actualizar la story del componente con el estado modular, y mantener WCAG AA + `var(--up1-*)` en el render por niveles.

**Actor**: user
**Layers**: frontend, config (i18n)

<details><summary>Scenarios de validacion</summary>

#### Scenario: paridad i18n
- **GIVEN** la key `curriculumMesh.level` agregada
- **WHEN** corre el sync
- **THEN** existe en es/en/pt sin conflicto (el sync no aborta)

#### Scenario: a11y en modo niveles
- **GIVEN** la malla modular
- **WHEN** el usuario navega por teclado
- **THEN** el foco recorre columnas (niveles) como en secuencial (WCAG AA)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: cambia el idioma y ve "Nivel"/"Level"/"Nivel" (pt) correctamente; navega la malla modular por teclado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | i18n paridad | key level en 3 langs | sync | sin conflicto | key presente es/en/pt |
| 2 | story modular | story del componente | render storybook | estado modular visible | columnas nivel |

### REQ-07: Temporalidad del requisito (prerrequisito vs corequisito) en la derivacion de nivel

> **Que cambia**: SOLO un **prerrequisito** (`timing = Before`) empuja el nivel (el curso queda una columna a la derecha). Un **corequisito** (`timing = Concurrent`) y, en esta version, tambien `Either` y el `timing` ausente NO empujan — el curso queda al MISMO nivel que ese requisito.
> **Por que**: el modelo distingue `timing` (`Before`/`Concurrent`/`Either`) en `rt__RecordState__requirement`. Tratar un no-prereq como prereq lo ubicaria una columna de mas a la derecha. Ante ambiguedad (`Either`/ausente) se opta por NO empujar (DEC-LOCAL-03).

El sistema MUST derivar el nivel considerando **SOLO** los requisitos de curso con `timing = Before` (prerrequisitos) en el recorrido fiel del arbol (REQ-02: AND=max, OR=min, K-de-N=K-esimo — NO un max plano). Todos los demas valores de `timing` — `Concurrent` (corequisito), `Either`, y `timing` ausente — MUST NO incrementar el nivel del curso (co-ubicacion en el mismo nivel). Regla unica de esta version: **solo `Before` empuja; ante cualquier otra cosa, no empuja** (DEC-LOCAL-03). La posibilidad de que el usuario elija el comportamiento al ingresar el requisito queda **fuera de alcance** (analisis futuro).

**Actor**: system
**Layers**: frontend (logica pura)

<details><summary>Scenarios de validacion</summary>

#### Scenario: corequisito no sube el nivel
- **GIVEN** el curso A tiene un requisito sobre B con `timing = Concurrent` (corequisito), y B esta en nivel 2
- **WHEN** se deriva el nivel de A
- **THEN** A NO queda en nivel 3 por ese requisito (el corequisito no cuenta para el `1 + max`)

#### Scenario: prerrequisito si sube el nivel
- **GIVEN** el curso A tiene un requisito sobre C con `timing = Before` (prerrequisito), C en nivel 2
- **WHEN** se deriva el nivel de A
- **THEN** A queda en nivel 3 (1 + nivel de C)

#### Scenario: mezcla prereq + coreq
- **GIVEN** A con prereq `Before` sobre C (nivel 2) y coreq `Concurrent` sobre B (nivel 4)
- **WHEN** se deriva el nivel de A
- **THEN** A queda en nivel 3 (solo el `Before` sobre C cuenta; el `Concurrent` sobre B se ignora para el nivel)

#### Scenario: Either no empuja (esta version)
- **GIVEN** A con requisito `timing = Either` sobre B (nivel 2), sin otros prereqs `Before`
- **WHEN** se deriva el nivel de A
- **THEN** A NO sube por B (Either se trata como coreq: no empuja)

#### Scenario: timing ausente no empuja (esta version)
- **GIVEN** A con requisito sin `timing` seteado sobre B (nivel 2), sin otros prereqs `Before`
- **WHEN** se deriva el nivel de A
- **THEN** A NO sube por B (ausente se trata como coreq: no empuja)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en un plan con un corequisito (o un requisito `Either`), los dos cursos aparecen en la misma columna (nivel), no en columnas consecutivas; solo un prerrequisito `Before` los separa una columna.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | coreq no sube | requisito Concurrent sobre B(niv 2) | deriveLevel(A) | no cuenta | A no sube por B |
| 2 | prereq sube | requisito Before sobre C(niv 2) | deriveLevel(A) | cuenta | A = 3 |
| 3 | mezcla | Before C(niv 2) + Concurrent B(niv 4) | deriveLevel(A) | solo Before | A = 3 |
| 4 | Either no sube | requisito Either sobre B(niv 2) | deriveLevel(A) | no cuenta | A no sube por B |
| 5 | ausente no sube | requisito sin timing sobre B(niv 2) | deriveLevel(A) | no cuenta | A no sube por B |

### REQ-08: Mostrar prerrequisitos y corequisitos por tarjeta (v1)

> **Que cambia**: cada tarjeta de la malla modular expone sus **prerrequisitos** y **corequisitos** en un **modal que se abre con una accion explicita en la tarjeta** (click/Enter sobre un affordance, NO hover), distinguidos por `timing`: `Before` bajo "Prerrequisitos", `Concurrent` bajo "Corequisitos", `Either` bajo una etiqueta neutra.
> **Por que**: en modular el nivel de un curso ES funcion de sus prereqs; ver *que* lo condiciona (y sus coreqs al mismo nivel) hace el modo legible. Se elige modal (no tooltip/popover en hover) para **no interferir con el drag&drop** (presente hoy en secuencial y potencialmente en modular a futuro): un popover en hover captura el gesto de arrastre. Ademas es consistente con el patron de modales caseros del mod (`AddEntryModal`/`EditEntryModal`/`PrereqBlockModal`).

El sistema MUST mostrar, por tarjeta de la malla modular, la lista de sus requisitos de curso agrupados por `timing` — `Before` → "Prerrequisitos", `Concurrent` → "Corequisitos", `Either` → etiqueta neutra ("Flexible") — en un **modal accesible abierto por accion explicita** (click/Enter), no en hover, para ser drag-safe. v1: **lista plana** de cursos (label resuelto), sin reconstruir el anidamiento Y/O. Reusa `usePrereqRequirements.listPrereqs` (ya trae `timing`) y el `ActivityLabelResolver` existente; sin cambio de backend.

**Implementacion definida (cerrada en diseño — DEC-LOCAL-04):** (a) el disparador es un **boton-icono por tarjeta** (`cm-pe__reqs`) con `@click.stop`, espejando el patron ya existente `cm-pe__edit` (`CurriculumMeshElement.vue:253-256`) que es drag-safe por construccion; (b) el modal es un **componente fino nuevo `RequirementsModal.ts`** sobre la molecula `Modal` de `@molecules` (patron `PrereqBlockModal`, RULE-curriculum-design-014 modal casero; logica extraida a `.ts` por RULE-mods-022). NO se embebe en `EditEntryModal` (acopla ver-requisitos a edicion) ni se repurposea `PrereqBlockModal` (concern distinto: faltantes-al-agregar).

**Actor**: user (Diseñador Curricular)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: la tarjeta muestra prereqs y coreqs separados
- **GIVEN** un curso A con prereq `Before` sobre C y coreq `Concurrent` sobre B
- **WHEN** el usuario abre el detalle de requisitos de A (accion explicita: click/Enter en el affordance)
- **THEN** el modal muestra "Prerrequisitos: C" y "Corequisitos: B" (grupos separados por timing)

#### Scenario: sin requisitos
- **GIVEN** un curso sin requisitos de curso
- **WHEN** el usuario abre su detalle de requisitos
- **THEN** el modal indica "sin requisitos" (o el affordance no se ofrece), sin error

#### Scenario: no interfiere con drag
- **GIVEN** una malla con drag habilitado (secuencial, o modular futuro)
- **WHEN** el usuario arrastra una tarjeta
- **THEN** el arrastre funciona; abrir requisitos requiere una accion explicita distinta del hover/arrastre

#### Scenario: accesible por teclado
- **GIVEN** la malla modular
- **WHEN** el usuario navega por teclado hasta el affordance de requisitos y lo activa
- **THEN** el modal es alcanzable, con focus-trap y cierre por teclado (WCAG AA)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el detalle de requisitos de una tarjeta (click) y ve sus prerrequisitos y corequisitos listados por separado; arrastrar una tarjeta (donde hay drag) sigue funcionando.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | agrupa por timing | A: Before C, Concurrent B | abrir modal | 2 grupos | Prereqs: C / Coreqs: B |
| 2 | sin requisitos | curso sin reqs | abrir detalle | vacio | "sin requisitos", sin error |
| 3 | drag-safe | drag habilitado | arrastrar tarjeta | no abre modal | drag intacto |
| 4 | a11y teclado | affordance | activar por teclado | modal con focus-trap | WCAG AA |

### REQ-09: Nivel derivado desde requisitos de creditos (heuristico v1)

> **Que cambia**: un curso cuyo requisito es de **creditos** (no un curso especifico) — `MetricThreshold` con `metric=Credits` o `Group.creditsRequired` — se ubica en el nivel donde esos creditos se acumulan, en vez de caer en nivel 1 por no tener curso-prereq.
> **Por que**: sin esto, un curso gateado solo por "N creditos" apareceria en la raiz, contradiciendo su intencion de ir tarde en el plan.

El sistema MUST derivar un nivel para los requisitos de creditos mediante una **segunda pasada** sobre los creditos planificados acumulados por nivel (DEC-LOCAL-06):

1. **Pasa 1**: derivar niveles por requisitos-curso (REQ-02, fiel al arbol).
2. **Pasa 2 (creditos)**: `cumCredits(L)` = suma de creditos planificados de los cursos ubicados en niveles ≤ L (para `scope=plan`; para `scope=category` o `Group.creditsRequired`, sumar solo los cursos de esa categoria/grupo). El nivel exigido por un requisito `Credits >= V` es el menor `L` tal que `cumCredits(L) >= V`, y el curso gateado va a `L + 1`. Este nivel-por-creditos entra como un hijo mas en la combinacion Y/O del arbol (REQ-02).

**Supuestos v1 (documentados, no abiertos):**
- **Creditos planificados, no aprobados**: en el editor de malla no hay estudiante; se usan los creditos estructurales del plan.
- **El curso no cuenta sus propios creditos** hacia su propio umbral.
- **Umbral inalcanzable**: si con todos los creditos planificados no se llega a `V`, el curso se ubica en el ultimo nivel y el caso se **reporta** (mismo criterio que el ciclo, REQ-03).
- **Operador**: v1 interpreta `Gte`/`Gt` como umbral a alcanzar; `Lt`/`Lte`/`Eq` (raros como gate de avance) se documentan como no soportados para nivel en v1 (se reportan, no rompen).
- **Orden intra-Pasa 2 (varios cursos gateados por creditos)**: v1 NO re-alimenta creditos entre cursos credit-gated — `cumCredits(L)` se computa sobre los cursos ya ubicados por curso-prereq (Pasa 1), sin iterar hasta punto fijo. Es decir, un curso gateado por creditos no cuenta para reubicar a otro curso gateado por creditos (evita ciclos de reubicacion). Acotado como v1 fragil (DEC-LOCAL-06); la iteracion a punto fijo queda para una eventual re-evaluacion.

**Actor**: system
**Layers**: frontend (logica pura)

<details><summary>Scenarios de validacion</summary>

#### Scenario: curso gateado por creditos se ubica donde se acumulan
- **GIVEN** un curso T con requisito `Credits >= 24` (scope plan) y una malla donde el nivel 2 acumula 24 creditos
- **WHEN** se deriva el nivel de T
- **THEN** T queda en nivel 3 (1 + nivel donde se alcanzan 24 creditos)

#### Scenario: umbral inalcanzable
- **GIVEN** T con `Credits >= 999` y el plan suma menos
- **WHEN** se deriva el nivel
- **THEN** T va al ultimo nivel y el caso se reporta (no cuelga, no error)

#### Scenario: combinado con curso-prereq (arbol)
- **GIVEN** T con Group AND [curso C (nivel 2), Credits>=12 (se alcanza en nivel 1)]
- **WHEN** se deriva el nivel de T
- **THEN** T = 1 + max(2, 1) = 3 (el nivel-por-creditos es un hijo mas del AND)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: un curso cuyo unico requisito es de creditos aparece en un nivel acorde a donde se acumulan esos creditos, no en el primero.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | creditos plan | Credits>=24, niv2 acumula 24 | deriveLevel | 1+nivel-credito | 3 |
| 2 | inalcanzable | Credits>=999 | deriveLevel | ultimo nivel + reporte | sin cuelgue |
| 3 | AND con credito | AND[C(2), Credits>=12 en niv1] | deriveLevel | 1+max(2,1) | 3 |

### REQ-10: Flujo guiado de alta con requisitos faltantes — SOLO modular

> **Que cambia**: en modo **modular**, al intentar agregar un curso con requisitos no cumplidos, el modal **NO solo alerta y bloquea** (eso es REQ-05, que sigue siendo el comportamiento del secuencial): se **mantiene activo** para que el usuario **agregue el/los curso(s) requerido(s) desde ahi mismo**; a medida que se agrega el listado, los niveles se re-arman segun los requisitos (deriveLevel, REQ-02).
> **Por que**: en modular el orden lo dicta el grafo, asi que completar los prereqs faltantes en el mismo flujo (en vez de salir a buscarlos) es la experiencia natural que pide la maqueta ("recuerda la accion y va exigiendo los faltantes").

El sistema MUST, **solo en modo modular**, mantener el flujo de alta activo cuando el curso a agregar tiene requisitos-curso no cumplidos: presentar los faltantes y permitir **seleccionar/agregar** esos cursos requeridos sin cerrar el flujo, hasta que el conjunto quede consistente; al confirmarse, las entries se agregan **de forma atomica** (via REQ-11) y los niveles se recalculan (REQ-02). En modo **secuencial** el comportamiento NO cambia: se mantiene el bloqueo informativo `Volver/Cancelar` (REQ-05).

**Alcance de implementacion (DEC-LOCAL-07, actualizado):** el conjunto de cursos del alta guiada se persiste con la **mutation batch atomica mod-owned de REQ-11** (`context.prisma.$transaction`) → si un create falla, revierte todo. Se mantiene `layer:mod`. Lo unico que queda fuera (a otro ticket, `sp8/batch-planentry-atomic-mutation-analysis.md`) es lo que es **core**: la generalizacion de un batch en el CRUD de OM (Opcion B) y el batch del reorder (transversal, toca secuencial).

**Actor**: user (Diseñador Curricular)
**Layers**: frontend (modular)

<details><summary>Scenarios de validacion</summary>

#### Scenario: agregar el requisito sin salir del flujo (modular)
- **GIVEN** un plan Modular; el usuario intenta agregar el curso X que requiere Y (no presente)
- **WHEN** el modal alerta que falta Y
- **THEN** el flujo se mantiene activo y ofrece agregar Y (y sus faltantes) desde ahi; al completar, X e Y quedan agregados y los niveles se re-arman

#### Scenario: secuencial NO cambia
- **GIVEN** un plan Secuencial; el usuario intenta agregar X con prereq faltante
- **WHEN** confirma
- **THEN** ve el bloqueo `Volver/Cancelar` (REQ-05), sin flujo guiado

#### Scenario: cancelar a mitad deja la malla consistente
- **GIVEN** el flujo guiado modular activo con faltantes pendientes
- **WHEN** el usuario cancela antes de confirmar
- **THEN** no se persiste nada (el commit atomico REQ-11 ocurre solo al confirmar el conjunto completo)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en un plan modular, intenta agregar un curso con prereq faltante y puede completarlo sin cerrar el modal; al terminar, el curso y su prereq aparecen en sus niveles.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | guiado modular | modular, X req Y | agregar X | modal se mantiene, agrego Y | X e Y agregados (atomico REQ-11), niveles re-armados |
| 2 | secuencial sin cambio | secuencial, X req Y | agregar X | bloqueo Volver/Cancelar | sin flujo guiado |
| 3 | cancelar a mitad | flujo guiado activo | cancelar | nada persistido | malla consistente |

### REQ-11: Persistencia batch atomica de `planEntry` (mod-owned)

> **Que cambia**: el conjunto de cursos del alta guiada modular (REQ-10) se persiste en **una sola transaccion todo-o-nada**: si un create falla, se revierte todo. Reemplaza el loop de creates secuenciales para ese flujo.
> **Por que**: sin atomicidad, un fallo a mitad deja cursos a medio agregar en el server. La maqueta exige "una unica accion consistente".

El sistema MUST exponer una mutation batch `createPlanEntriesBatch(data: [JSON!]!): [PlanEntry!]!` que inserte varias `planEntry` en **una transaccion** (`context.prisma.$transaction`), revirtiendo el conjunto ante cualquier fallo. Se implementa como **resolver custom mod-owned** (`mods/curriculum-design/logic/planEntry-batch.resolver.js` + `.schema.graphql`, patron `curriculum-create`/`activity-formtemplate`), sincronizado a OM por el flujo estandar — **`layer:mod`, sin edicion de core**.

**Impl — VERIFICADA contra codigo (`object-manager/src/graphql/resolvers/instance.resolver.js:3217-3220`):**
- `createInstance` toma `prisma` de `context` (`const { prisma, tenantId } = context`) → pasarle `{...context, prisma: tx}` corre el WRITE en la transaccion **sin cambiar su firma → CERO core**. El "si acaso" de un cambio de firma core queda **descartado**.
- **Caveat verificado**: `createInstance` viene envuelto en `withEventPublish`/`withObjectAuth`/`withDataLog`; el publish de eventos (BullMQ) es **no transaccional** → delegar en loop dentro del `$transaction` dispararia eventos por-item aunque la tx revierta. (El `createBulkInstances` de core es **no-atomico** — no hay `$transaction` en `instance.resolver.js` — no reutilizable.)
- **Impl recomendada**: `tx.planEntry.create` **directo** en el resolver del mod. Verificado que `planEntry` **no declara eventos custom** (`mods/curriculum-design/events/` sin planEntry) ni flag de DataLog en su JSON → el bypass de los wrappers no pierde side-effects relevantes. `planEntry` es objeto **base** (sin RecordType/extension) → create simple.
- **Alternativa**: delegar los creates en la tx y publicar eventos SOLO tras el commit (orquestacion en el resolver del mod). Ambas 100% mod, cero core.

**Fuera de alcance (al ticket `sp8/batch-planentry-atomic-mutation-analysis.md`):** `updatePlanEntriesBatch` para el reorder drag&drop (transversal, toca secuencial) y la generalizacion `createManyInstances` en el CRUD de OM (Opcion B, core).

**Actor**: system
**Layers**: backend (resolver mod-owned), frontend (consumo)

<details><summary>Scenarios de validacion</summary>

#### Scenario: todo-o-nada
- **GIVEN** un batch de 3 planEntry donde la 3a viola una constraint
- **WHEN** se ejecuta `createPlanEntriesBatch`
- **THEN** ninguna de las 3 queda persistida (rollback transaccional); se devuelve error

#### Scenario: happy path
- **GIVEN** un batch valido de N planEntry
- **WHEN** se ejecuta la mutation
- **THEN** las N quedan creadas y se devuelven; tenant isolation respetada (`context.prisma`)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: al completar el alta guiada de un curso + sus prereqs, o todos entran o (ante error) no entra ninguno — nunca queda un subconjunto a medias.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | rollback atomico | batch con 1 item invalido | createPlanEntriesBatch | 0 persistidas + error | tx revierte todo |
| 2 | happy path | batch valido de N | mutation | N creadas | tenant-scoped |

### REQ-12: Paridad del MCP (up1-mcp) con la malla modular

> **Que cambia**: el adaptador MCP (`up1-mcp`) puede operar planes **modulares** — hoy solo soporta secuencial (`cd_add_plan_entry` exige `period`). Un LLM/usuario via MCP podra agregar asignaturas a un plan modular y leer la malla por niveles.
> **Por que**: decision del dev — TICKET-120 resuelve TODO, incluida la superficie MCP; sin esto, las funcionalidades nuevas quedarian inaccesibles desde el MCP.

El adaptador `up1-mcp` MUST alcanzar paridad con la malla modular:
- **`cd_add_plan_entry`**: `period` **opcional** (requerido solo en secuencial) + ramificar por `progression` (el enum ya existe en `registry.ts:380`); en modular no exigir/validar `period` contra `totalPeriods`.
- **Portar** a `up1-mcp/src/mods/curriculum-design/mesh-logic.ts` la logica nueva: `deriveLevel` (recorrido fiel AND/OR/K), `groupByLevel`, timing (`Before` empuja; `Concurrent`/`Either`/ausente no), creditos→nivel (REQ-02/07/09). El MCP **replica** la logica del mod (patron actual: `mesh-logic.ts` ya es un port).
- **`cd_get_mesh`**: exponer los **niveles derivados** en modo modular (usando el `deriveLevel` portado), ademas de los periodos en secuencial.
- (opcional) consumir `createPlanEntriesBatch` (REQ-11) para el alta guiada via MCP.

**Alcance/repo:** es el repo **`up1-mcp`** (standalone, `uplanner/mcp`, branch propio base `main`), NO `mods/curriculum-design/`. Multi-repo dentro del mismo ticket (DEC-LOCAL-08). **Riesgo de drift**: la logica queda duplicada (mod + port MCP) → se mitiga con **tests de paridad** (los casos de `deriveLevel` del MCP replican los del mod, TC-16) y una nota en ambos lados.

**Actor**: system (LLM/usuario via MCP)
**Layers**: mcp-adapter (up1-mcp)

<details><summary>Scenarios de validacion</summary>

#### Scenario: alta modular via MCP sin periodo
- **GIVEN** un plan Modular; un LLM llama `cd_add_plan_entry` sin `period`
- **WHEN** se ejecuta
- **THEN** la entrada se agrega (no exige `period`); en secuencial `period` sigue requerido

#### Scenario: cd_get_mesh devuelve niveles en modular
- **GIVEN** un plan Modular con prereqs
- **WHEN** un LLM llama `cd_get_mesh`
- **THEN** la respuesta agrupa por nivel derivado (no por periodo), con la misma logica que el FE

#### Scenario: paridad de derivacion (no drift)
- **GIVEN** el mismo grafo de requisitos
- **WHEN** se corre `deriveLevel` del mod y el portado del MCP
- **THEN** producen el mismo nivel (tests de paridad)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: desde el MCP, agrega una asignatura a un plan modular sin periodo y pide la malla, viendo las columnas por nivel iguales a las del FE.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | alta modular MCP | plan Modular | cd_add_plan_entry sin period | acepta | entrada agregada |
| 2 | mesh por niveles MCP | plan Modular | cd_get_mesh | niveles derivados | == FE |
| 3 | paridad deriveLevel | mismo grafo | mod vs MCP port | mismo nivel | sin drift |

### REQ-13: `progression` inmutable al editar un plan existente

> **Que cambia**: el modo de un plan (`progression` = `Sequential`|`Modular`) se fija al **crear** el plan; una vez creado, **no se puede cambiar** al editarlo. Hoy es editable en las dos superficies (el select del layout `default_Curriculum_edit.json` no esta `disabled`; `cd_update_curriculum` acepta un `progression` distinto y lo aplica sin chequear el valor previo).
> **Por que**: cambiar el modo de un plan que ya tiene asignaturas colocadas corrompe su semantica (un plan modular no tiene `period`; uno secuencial si) y su render. El modo es una decision de creacion, no un toggle de edicion. Cierra la deuda que OQ-1 dejo abierta (switch Modular→Secuencial de un plan con `period=null`).

Al **editar** un plan existente (`recordType == "Plan"`), el sistema MUST impedir el cambio de `progression` en AMBOS sentidos (Secuencial→Modular y Modular→Secuencial), en las dos superficies:
- **Plataforma (mod, UI)**: en `default_Curriculum_edit.json` el campo `progression` se muestra **read-only** (visible con el modo actual, sin poder cambiarlo). En `default_Curriculum_create.json` sigue **editable** (ahi se elige el modo).
- **MCP (`up1-mcp`)**: `cd_update_curriculum` MUST **rechazar** un patch cuyo `progression` difiera del valor actual del registro (lee la progression actual, compara; si difiere → error de validacion, no muta). Un patch sin `progression`, o con el mismo valor, pasa. `cd_create_curriculum` sigue aceptando `progression` (ahi se fija).

**Alcance / limites:**
- **Enforcement elegido (dev 2026-08-10): UI + MCP, sin tocar core.** El resolver core `updateCurriculumWithRecordType` (OM) NO valida esto; una llamada GraphQL cruda al OM aun podria cambiar `progression`. Blindaje server-side en OM queda como follow-up (toca core, RULE-dev-004) — ver backlog B10.
- **Versionamiento fuera de alcance**: `cd_version_curriculum`/`cd_transition_curriculum` crean un plan NUEVO (nueva version); ese plan nuevo elige su modo en la creacion. REQ-13 acota SOLO el path de edicion in-place (layout `_edit` + `cd_update_curriculum`).

**Actor**: user (UI) / system (LLM via MCP)
**Layers**: mod (layout `_edit`) + mcp-adapter (up1-mcp)

<details><summary>Scenarios de validacion</summary>

#### Scenario: edicion no permite cambiar el modo (UI)
- **GIVEN** un plan existente (Modular o Secuencial) abierto en el layout de edicion
- **WHEN** el usuario abre el formulario
- **THEN** el campo `progression` se ve pero es read-only; no puede cambiar el modo

#### Scenario: MCP rechaza cambio de progression
- **GIVEN** un plan Modular existente; un LLM llama `cd_update_curriculum` con `progression: "Sequential"`
- **WHEN** se ejecuta
- **THEN** la tool rechaza con error de validacion; el plan sigue Modular (0 mutaciones)

#### Scenario: MCP acepta patch sin cambio de modo
- **GIVEN** un plan Modular existente
- **WHEN** `cd_update_curriculum` con `progression` omitido, o con `progression: "Modular"` (igual), o cambiando otro campo
- **THEN** el update procede normal

#### Scenario: creacion sigue eligiendo el modo
- **GIVEN** la creacion de un plan nuevo (UI o `cd_create_curriculum`)
- **WHEN** se setea `progression`
- **THEN** se acepta (el modo se fija aca)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre un plan en edicion y el modo no es editable; desde el MCP, un intento de cambiar `progression` de un plan existente es rechazado sin mutar, mientras que un update de otro campo procede.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | UI edit read-only | plan existente | abrir layout `_edit` | select progression disabled | no editable; cambio no persiste |
| 2 | MCP rechaza cambio | plan Modular | cd_update_curriculum progression=Sequential | rechazo | error validacion, 0 mutaciones |
| 3 | MCP acepta sin cambio | plan Modular | update sin/igual progression u otro campo | procede | update OK |
| 4 | create fija el modo | plan nuevo | crear con progression | acepta | modo fijado |

### REQ-13 — Revisión (2026-08-10, review del dev): bloqueo CONDICIONAL por malla + estilo + versionado

> **Reemplaza** el bloqueo estático original de REQ-13 (que bloqueaba `progression` en TODA edición). Nueva regla: **el modo es editable mientras la malla está VACÍA (sin `planEntry`) y se bloquea en cuanto tiene cursos**. Ata el bloqueo al riesgo real (cambiar el modo de un plan con cursos colocados corrompe su semántica; en un plan vacío es inofensivo). Decisión del dev tras revisar la UI + smoke de versionado.

- **R13.1 — Bloqueo condicional por malla vacía + enforcement server-side + reflejo UI**:
  - **Server-side (gate real)**: el resolver mod-owned `curriculum-update` rechaza un cambio de `progression` **solo si el plan tiene `planEntry`** (cuenta > 0). Un plan vacío acepta el cambio. Mod-owned (no core) → salda B10 (blindaje server-side). MCP replica: `cd_update_curriculum` rechaza solo si el plan tiene entries.
  - **UI (reflejo)**: en `default_Curriculum_edit.json` el select `progression` se muestra `disabled` **cuando el plan tiene cursos**, editable cuando está vacío. Requiere exponer al form un flag `hasPlanEntries`/conteo (no es campo del form general hoy) — vía campo computado/hidden alimentado por la relación de entries. 
  - **Estilo disabled (cuando aplica)**: hoy `progression` usa `native: true` → el `<select>` nativo disabled NO se estiliza (bg blanco, se ve editable); `recordType`/TIPO renderiza Vueform multiselect disabled (bg gris). **Quitar `native: true`** para que, cuando esté disabled, se vea gris como TIPO. Verificado por DOM: recordType `vf-multiselect-disabled` bg `rgb(225,225,225)` vs progression nativo `rgb(255,255,255)`.
- **R13.2 — Help text + versionado (validado por smoke)**: el texto pasa a "para cambiar el modo de progresión se requiere una nueva versión". **Smoke 2026-08-10 confirmó**: (a) versionar exige estado Active/Approved (`Curriculum.versionableFromStates`), un Borrador NO es versionable; (b) el core `prepareVersionData` NO copia hijos → **la versión nueva nace SIN malla (vacía)**; el mod solo copia la extensión RT (progression). Consecuencia: con la regla condicional, la v2 vacía tiene el modo **editable** → versionar SÍ permite cambiar el modo (versionás → editás el modo de la v2 vacía → armás la malla). **NO requiere cambiar el flujo de versionado** (la regla condicional lo habilita sola). OQ-5 resuelta.

### REQ-14: Seguridad al eliminar un curso de la malla (confirmación + dependencias)

> **Que cambia**: eliminar un curso (`planEntry`) de la malla deja de ser una acción directa. Exige confirmación y es consciente de la dependencia INVERSA: si otros cursos dependen del que se elimina, el sistema ofrece una cascada atómica (dependencia determinista) o bloquea (no determinista).
> **Por que**: hoy `onEditRemove` → `deleteInstance` corre sin confirmación ni chequeo de quién requiere al curso → deja cursos huérfanos con prerrequisitos inexistentes (en modular rompe la derivación de nivel; en secuencial deja prereqs colgando).

Aplica a **ambos modos** (el árbol de requisitos es el mismo). Al eliminar un curso C:
1. **Confirmación (siempre)**: modal de confirmación antes de eliminar (patrón de modales caseros del mod), con el nombre del curso en la PREGUNTA (no en el botón; word-break), condiciones debajo, botón de confirmar con label fijo corto.
2. **Dependientes deterministas → advertir + cascada atómica**: si C es prereq *determinista* de otros, el modal lista los dependientes (transitivos) y, al confirmar, elimina C + dependientes en UNA transacción todo-o-nada (resolver batch mod-owned, patrón REQ-11). Sin huérfanos.
3. **Dependientes no deterministas → bloquear**: si C participa de un requisito *no determinista* de algún dependiente D, se BLOQUEA la eliminación: el modal explica que C es parte del requisito de D (grupo OR / K-de-N / créditos) e indica que primero hay que corregir ese requisito de D.

**Clasificación por SATISFACIBILIDAD (OQ-6 resuelta, dev 2026-08-10)** — no por tipo de nodo. Para cada dependiente D que referencia a C, se re-evalúa el requisito de D con C tratado como NO colocado (reusar `evaluateRequirementTree`):
- **D sigue satisfacible sin C** (OR con otras opciones; K-de-N con N−1 ≥ K; umbral de créditos aún alcanzable con el resto) → C no era crítico → **PERMITIR el borrado** de C (D no se toca; opción de limpiar la referencia a C del grupo).
- **D queda insatisfacible por culpable ÚNICO** (C era hoja requerida bajo AND, o prereq único, sin alternativa) → **CASCADA atómica y TRANSITIVA**: borrar C + D + los que queden huérfanos en cadena (C→D→E), todo-o-nada; el modal lista la cadena completa.
- **D queda insatisfacible por un GRUPO** (K-de-N cae bajo K, u OR agota sus opciones) → **BLOQUEAR** el borrado + explicar qué requisito de D corregir (bajar K, agregar otra opción, o quitar C del grupo). No hay culpable único para cascada.
- **Precedencia**: si C tiene varios dependientes y AL MENOS UNO cae en "bloquear", **gana el bloqueo** (no se borra C ni en cascada parcial hasta resolver el grupo). Si ninguno bloquea pero hay dependientes de cascada, se ofrece la cascada; si todos siguen satisfacibles, borrado directo (tras la confirmación del punto 1).

**Alcance/repo**: plataforma (mod: mesh + resolver de borrado en cascada mod-owned). Paridad MCP: la MISMA clasificación (cascada determinista / bloqueo no determinista) se replica en `cd_remove_plan_entry`. La confirmación (modal) es UI y no aplica al MCP; la regla de dependencia sí. **El MCP DEBE informar el POR QUÉ accionable**:
- **Bloqueo**: `cd_remove_plan_entry` rechaza con un mensaje que nombra el/los curso(s) dependiente(s) D y el grupo que bloquea (OR / K-de-N / créditos) e indica qué corregir — no un error genérico. Es la misma `blockReasons: [{dependent, group}]` que produce la lógica pura de clasificación (compartida en concepto con la plataforma).
- **Cascada**: el preview (patrón preview→commit del MCP) LISTA la cadena completa (C→D→E) que se removería; el commit la borra atómicamente. Sin un `confirm` explícito, devuelve solo el preview (no borra).
- **Permitir**: remoción directa (con el preview→commit habitual).

**Actor**: user (UI) / system (LLM via MCP) · **Layers**: mod (mesh + resolver) + mcp-adapter

<details><summary>Scenarios de validacion</summary>

#### Scenario: confirmación siempre
- **GIVEN** un curso sin dependientes · **WHEN** el usuario pulsa Quitar · **THEN** aparece un modal de confirmación; solo al confirmar se elimina

#### Scenario: cascada determinista
- **GIVEN** C es prereq Before/único de D (y D de E) · **WHEN** se elimina C · **THEN** el modal advierte que se eliminarán también D y E; al confirmar, C+D+E se eliminan atómicamente (todo-o-nada)

#### Scenario: bloqueo no determinista
- **GIVEN** C es una de las opciones de un OR (o K-de-N, o parte de un requisito de créditos) de D · **WHEN** se intenta eliminar C · **THEN** se bloquea: se explica que C es parte del requisito de D e indica corregir ese requisito primero

#### Scenario: paridad MCP
- **GIVEN** `cd_remove_plan_entry` sobre C con dependientes · **WHEN** determinista → remueve en cascada; no determinista → rechaza con el mismo criterio que la UI

</details>

#### Acceptance
El usuario puede verificar: al quitar un curso aparece confirmación; quitar un prereq determinista ofrece y ejecuta la cascada; quitar un curso que es opción de un OR/K-de-N/créditos de otro se bloquea con explicación accionable. En MCP, `cd_remove_plan_entry` aplica la misma regla.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | confirmación | curso sin deps | Quitar | modal confirm | no elimina hasta confirmar |
| 2 | cascada determinista | C→D→E (Before/único) | eliminar C | advierte D,E + cascada atómica | 0 huérfanos, todo-o-nada |
| 3 | bloqueo no determinista | C opción de OR/K-de-N/créditos de D | eliminar C | bloqueo + explicación | no elimina; indica corregir D |
| 4 | paridad MCP | cd_remove_plan_entry | C con deps | cascada / bloqueo | == UI |

## Artifacts

### Models

Delta unico de modelo — detalle completo en `tickets/TICKET-120.draft/data-model.prisma`.

| Table | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| planEntry | period | Int | **si (era no)** | — | Periodo en secuencial; null en modular. Cambio NOT NULL → NULL |

**Relations**: sin cambios (planId/activityId/categoryId/blockId intactas).

**Indexes**: revisar el compound `@@index([planId, period, position])` tras codegen (period ahora nullable en el indice).

> Fuente del cambio: `mods/curriculum-design/objects/planEntry.json` — `period.not_null: true → false` y sacarlo de `required[]`. Codegen regenera `prisma/schema.prisma` + typedefs + CRUD. NO se agrega columna `level` (nivel derivado en runtime).

### Logica pura y componentes (METASPEC-vue-component)

| Artifact | Tipo | Estado | Descripcion |
|----------|------|--------|-------------|
| `deriveLevel.logic.ts` | logica pura (`.ts`) | **nuevo** | Deriva nivel desde el grafo de prereqs-curso; deteccion de ciclos; exclusion de Group/vacios/pools N<K |
| `groupRequirementsByTiming.logic.ts` | logica pura (`.ts`) | **nuevo** (REQ-08) | Aplana las hojas de curso del arbol de requisitos y las agrupa por `timing` (Before/Concurrent/Either) con label resuelto, para el display por tarjeta. Reusa el shape de `listPrereqs`/`ActivityLabelResolver` |
| `RequirementsModal.ts` | componente fino (Vue) | **nuevo** (REQ-08) | Modal casero sobre la molecula `Modal` de `@molecules` (patron `PrereqBlockModal`); recibe la salida de `groupRequirementsByTiming` por props y la muestra en grupos Prerrequisitos/Corequisitos. Se abre por el boton-icono `cm-pe__reqs` (drag-safe) |
| `planEntry-batch.resolver.js` + `.schema.graphql` | resolver custom mod-owned (backend) | **nuevo** (REQ-11) | `createPlanEntriesBatch` con `context.prisma.$transaction` (todo-o-nada); patron `curriculum-create`/`activity-formtemplate` ($transaction ya usado en el mod). Sync a OM. `layer:mod`, cero core |
| Molecula `Modal` (`@molecules`) | molecula existente | reuso | Shell de modal casero que ya usan `AddEntryModal`/`EditEntryModal`/`PrereqBlockModal` (RULE-curriculum-design-014) |
| Patron affordance `cm-pe__edit` | patron existente | reuso | Boton-icono por tarjeta con `@click.stop` (drag-safe); `RequirementsModal` reusa el mismo patron con `cm-pe__reqs` |
| `groupByLevel` (en `curriculumMesh.logic.ts`) | funcion pura | **nuevo** | Paralela a `groupByPeriod`, misma salida `MeshCard[][]`, agrupa por nivel derivado |
| `CurriculumMeshElement.vue` | Vueform element | modificado | Branch de `columns` por `progression`; header condicional Nivel/Periodo; drag off + control periodo oculto en modular |
| `useCurriculumMesh.ts` | composable | modificado | Cablear `progression` a `PlanVM` (hoy no lo trae) |
| `curriculumMesh.logic.ts` (`groupByPeriod`) | logica pura | reuso | Referencia de forma de salida para `groupByLevel` |
| `evaluateRequirementTree.logic.ts` / `prereqCheck.logic.ts` / `usePrereqRequirements.ts` | logica SP7 | reuso | Lectura/evaluacion del arbol de prereqs; input de `deriveLevel` y del flujo de alta |

> Checklist de calidad: (a) el rotulo "Nivel" vive en `lang/` (i18n), no hardcoded — REQ-06; (b) `deriveLevel`/`groupByLevel` tienen consumidor inmediato (`CurriculumMeshElement.vue` modular); (c) sin heuristicas por nombre — `progression` y el arbol de requisitos llegan como datos tipados.

### i18n

| Key | Namespace | Langs | Descripcion |
|-----|-----------|-------|-------------|
| `curriculumMesh.level` | curriculumMesh (common.i18n.json) | es/en/pt | Rotulo "Nivel {{n}}" del header de columna modular (paralelo a `curriculumMesh.period`) |

### Seed / fixture de prueba (reproducible, doble proposito)

| Artifact | Tipo | Estado | Descripcion |
|----------|------|--------|-------------|
| Fixture demo malla modular | seed SQL versionado del mod | **nuevo** (extiende `UPONE-1378-smoke-fixture.sql`) | Plan MODULAR con prereqs (`timing=Before`) encadenados + corequisitos (`timing=Concurrent`) + un plan SECUENCIAL completo. Doble proposito: (1) base del smoke dual (S6.T2, validador final); (2) artefacto DEMO re-aplicable post-seed para mostrar la funcionalidad. Es el unico artefacto de seed que se commitea intencionalmente (el resto de artefactos de sync/seed NO se commitean) |

## Tasks

### Session 1 — Baseline de regresion secuencial [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Revisar suites del mod y casos manuales que hoy cubren la malla secuencial; inventariar consumidores de `period` (`groupByPeriod`, `nextPosition`, `recalcPeriodPosition`, `computePeriodCountDiscrepancy`, drag); revisar el cambio de UPONE-1450 (versionamiento del Plan) sobre `Curriculum`/layouts para no chocar (dependencia del contrato PO) | REQ-PRESERVE-01 | researcher | — | mods/curriculum-design/modsComponents/CurriculumMesh/*.logic.spec.ts | inventario + nota de no-colision con UPONE-1450 documentados en el ticket | (no aplica) | DET-5, DET-11, DET-40 | done | 1 |
| S1.T2 | Agregar tests de characterization donde falte cobertura del comportamiento secuencial actual (fijan la baseline antes de tocar) | REQ-PRESERVE-01 | developer | S1.T1 | mods/curriculum-design/modsComponents/CurriculumMesh/curriculumMesh.logic.spec.ts | vitest del mod VERDE | git revert | DET-7, DET-8, DET-13 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir baseline + auditoria de consumidores de `period`; decidir continue | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + baseline documentada | (no aplica) | DET-20, DET-23, DET-40 | done | 1 |

### Session 2 — Modelo `period` nullable + migracion (mod, flujo estandar) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `period.not_null: true → false` y sacarlo de `required[]` en el JSON del objeto | REQ-04 | developer | S1.GATE | mods/curriculum-design/objects/planEntry.json | `npm run codegen` sin error | git revert del JSON | DET-5, DET-8, DET-40 | done | 2 |
| S2.T2 | Correr codegen + `prisma migrate` por tenant (UPU); verificar CRUD de create/update de planEntry acepta `period` null; y que create SECUENCIAL sigue asignando `period` (REQ-04 scenario 3) | REQ-04 | developer | S2.T1 | object-manager/prisma/schema.prisma (auto-generado por codegen), migraciones por tenant | migracion aplicada en UPU sin perdida; integration createPlanEntry(period:null) OK + createPlanEntry secuencial asigna period | rollback de migracion (NULL→NOT NULL con backfill) | DET-5, DET-8 | done | 2 |
| S2.T3 | Verificar que el cambio de tipado (`period` pasa a nullable tras codegen) NO rompe la compilacion de los consumidores secuenciales del FE del mod (captura temprana del compile-break entre S2 y S4) | REQ-PRESERVE-01 | developer | S2.T2 | mods/curriculum-design/modsComponents/CurriculumMesh/ | `npm run typecheck` del mod VERDE | git revert | DET-5, DET-40 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T3) — verificar migracion no-destructiva + CRUD null + create secuencial con period + typecheck FE verde + branch autocontenido del mod base develop (guarda de rama por repo destino); decidir continue | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido; migracion verificada; typecheck verde; rama != protegida por repo | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Derivacion de nivel (logica pura) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Crear `deriveLevel.logic.ts`: recorrido FIEL del arbol Y/O (AND→max, OR→min, K-de-N→K-esimo menor; DEC-LOCAL-05); solo `timing=Before` empuja (`Concurrent`/`Either`/ausente no, REQ-07/DEC-LOCAL-03); 2a pasada de creditos→nivel (REQ-09/DEC-LOCAL-06, cumCredits por nivel, inalcanzable→ultimo+reporte); deteccion de ciclos; exclusion de Group vacio/pools N<K. Junto al componente | REQ-02, REQ-03, REQ-07, REQ-09 | developer | S1.GATE | mods/curriculum-design/modsComponents/CurriculumMesh/deriveLevel.logic.ts | vitest del nuevo spec VERDE | git revert (archivo nuevo) | DET-1, DET-2, DET-8 | done | 3 |
| S3.T2 | `deriveLevel.logic.spec.ts`: raiz→1; AND→1+max; OR→1+min; K-de-N→1+K-esimo menor; timing (solo Before sube; Concurrent/Either/ausente no); creditos (se ubica donde acumula, inalcanzable→ultimo+reporte, combinado con curso en AND); ciclo→termina+reporta; Group vacio/pool N<K | REQ-02, REQ-03, REQ-07, REQ-09 | developer | S3.T1 | mods/curriculum-design/modsComponents/CurriculumMesh/deriveLevel.logic.spec.ts | vitest --coverage VERDE | git revert | DET-7, DET-13 | done | 3 |
| S3.T3 | Crear `groupRequirementsByTiming.logic.ts` (REQ-08): aplana hojas de curso y agrupa por `timing` (Before/Concurrent/Either) con label resuelto + su `.spec.ts` (agrupa por timing / sin reqs / Either neutro). Junto al componente | REQ-08 | developer | S1.GATE | mods/curriculum-design/modsComponents/CurriculumMesh/groupRequirementsByTiming.logic.ts, groupRequirementsByTiming.logic.spec.ts | vitest VERDE | git revert (archivos nuevos) | DET-1, DET-2, DET-7 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T2) — coverage de `deriveLevel` + `groupRequirementsByTiming`; decidir continue | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + coverage delta | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Render modular + auditoria DET-40 [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Cablear `progression` a `PlanVM` en `useCurriculumMesh.ts` (hoy no lo trae) | REQ-01 | developer | S2.GATE, S3.GATE | mods/curriculum-design/modsComponents/CurriculumMesh/useCurriculumMesh.ts | vitest useCurriculumMesh.spec.ts VERDE | git revert | DET-5, DET-11 | done | 4 |
| S4.T2 | `groupByLevel` en `curriculumMesh.logic.ts` (paralela a `groupByPeriod`, salida `MeshCard[][]`) usando `deriveLevel` | REQ-01, REQ-02 | developer | S3.GATE | mods/curriculum-design/modsComponents/CurriculumMesh/curriculumMesh.logic.ts | vitest curriculumMesh.logic.spec.ts VERDE | git revert | DET-2, DET-8 | done | 4 |
| S4.T3 | Branch de `columns` por `progression` en el `.vue`; header condicional Nivel/Periodo; banner de plan no-secuencial (maqueta `mockup_v10:748`); drag deshabilitado + control agregar/quitar periodo oculto en modular | REQ-01 | developer | S4.T1, S4.T2 | mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue | smoke UI modular (S6) + vitest | git revert | DET-5, DET-40 | done | 4 |
| S4.T4 | Auditoria DET-40: enumerar 1:1 los consumidores de `period` (inventario S1.T1) y verificar que el camino secuencial no se altera con el branch; registrar `replacement-audit` | REQ-PRESERVE-01 | reviewer | S4.T3 | mods/curriculum-design/modsComponents/CurriculumMesh/ | dkc-record-decision replacement-audit + tests secuenciales VERDE | (no aplica) | DET-40, DET-13 | done | 4 |
| S4.T5 | Display por tarjeta (REQ-08): (a) boton-icono `cm-pe__reqs` con `@click.stop` en la tarjeta (espeja `cm-pe__edit`, drag-safe); (b) nuevo `RequirementsModal.ts` (thin, sobre molecula `Modal` de `@molecules`, patron `PrereqBlockModal`) que lista prereqs (Before) y coreqs (Concurrent) via `groupRequirementsByTiming`; v1 lista plana, modo modular | REQ-08 | developer | S4.T3, S3.T3 | mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue, RequirementsModal.ts | smoke UI (S6) + vitest | git revert | DET-2, DET-5 | done | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier: T3) — render modular + banner + display prereq/coreq por tarjeta + secuencial intacto (DET-40). Cubre el switch de RENDER por modo; el switch de DATOS de un plan con period=null es OQ-1 (fuera de S4). Decidir continue | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4, S4.T5 | ticket | gate persistido + auditoria DET-40 covered | (no aplica) | DET-20, DET-23, DET-40 | done | 4 |

### Session 5 — Flujo de alta + transversales [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S5.T2, S5.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Homologar el flujo de alta con requisitos no cumplidos: reusar `PrereqBlockModal` + `findMissingPrereqs` para ALERTAR cual requisito falta (con alternativas OR; cubre creditos/MetricThreshold) igual que secuencial; y consistencia al volver atras (no dejar asignatura ni prereqs a medio agregar) | REQ-05 | developer | S4.GATE | mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue, addEntryModal.logic.ts | smoke UI (S6) + vitest addEntryModal.logic.spec.ts | git revert | DET-5, DET-8 | done | 5 |
| S5.T5 | Resolver batch atomico mod-owned (REQ-11): `logic/planEntry-batch.resolver.js` + `.schema.graphql` (`createPlanEntriesBatch`) con `context.prisma.$transaction` (delegar a createInstance con context tx-scoped; fallback tx directo). Sync propaga a OM. Unit: rollback ante item invalido + happy path tenant-scoped | REQ-11 | developer | S4.GATE | mods/curriculum-design/logic/planEntry-batch.resolver.js, planEntry-batch.schema.graphql | vitest del resolver (tx revierte) + `npm run sync` | git revert | DET-2, DET-5, DET-8 | done | 5 |
| S5.T6 | Flujo guiado de alta SOLO modular (REQ-10): al faltar requisitos, mantener el flujo activo para agregar el/los curso(s) requerido(s) sin cerrar; al confirmar, persistir el conjunto con `createPlanEntriesBatch` (REQ-11, atomico); deriveLevel re-arma niveles. Secuencial NO cambia (bloqueo REQ-05) | REQ-10 | developer | S5.T1, S5.T5 | mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue, addEntryModal.logic.ts | smoke UI modular (S6.T2) + vitest addEntryModal.logic.spec.ts | git revert | DET-5, DET-8 | done | 5 |
| S5.T2 | Agregar i18n keys `curriculumMesh.level` + etiquetas del display prereq/coreq (`Prerrequisitos`/`Corequisitos`/neutro, REQ-08) + textos del flujo de alta en lang/{es,en,pt} con paridad | REQ-06, REQ-08 | developer | S4.GATE | mods/curriculum-design/lang/es/common.i18n.json, lang/en/common.i18n.json, lang/pt/common.i18n.json | sync sin conflicto de key | git revert | DET-16 | done | 5 |
| S5.T3 | Actualizar la story con el estado modular del componente | REQ-06 | developer | S4.GATE | mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMesh.stories.ts | storybook render estado modular | git revert | DET-16 | done | 5 |
| S5.T4 | Verificar a11y WCAG AA del render por niveles (foco + navegacion por teclado entre columnas de nivel, REQ-06 sc2) + del modal de prereq/coreq (alcanzable por teclado, focus-trap y cierre, REQ-08 sc4) y del modal del flujo guiado de alta modular (REQ-10, reusa `PrereqBlockModal` — verificar foco/teclado); y ausencia de hardcode: la UI modular usa solo `var(--up1-*)` | REQ-06, REQ-08 | reviewer | S5.T1, S5.T2, S5.T3 | mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue | smoke a11y (foco/teclado, incluye modal focus-trap) con evidencia + grep sin hardcode de tokens en el bloque modular | git revert | DET-13, DET-36 | done | 5 |
| **S5.GATE** | Gate de sync Session 5 (tier: T3) — resolver batch (REQ-11) + guiado modular (REQ-10) + i18n paridad + story + **a11y WCAG AA mantenido + design tokens sin hardcode**; decidir continue | — | reviewer | S5.T1, S5.T2, S5.T3, S5.T4, S5.T5, S5.T6 | ticket | gate persistido; a11y y tokens verificados con evidencia | (no aplica) | DET-20, DET-23, DET-36 | done | 5 |

### Session 6 — Caso de prueba reproducible + smoke dual (validador final) + regresion + docs [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Construir el CASO DE PRUEBA REPRODUCIBLE (seed/fixture versionado, re-aplicable) que ejercite **todos** los flujos nuevos: plan MODULAR con (i) prerrequisitos `timing=Before` encadenados, (ii) corequisitos `timing=Concurrent`, (iii) un **grupo AND** (nivel=1+max), (iv) un **grupo OR** (nivel=1+min, alternativas), (v) un **grupo K-de-N** (`minToSatisfy`, nivel=1+K-esimo menor), (vi) un requisito de **creditos** (`MetricThreshold`/`Group.creditsRequired`, REQ-09) y (vii) un curso cuya alta dispara **prereqs faltantes** (para el flujo guiado REQ-10 + batch REQ-11) + un plan SECUENCIAL completo. Reusar/extender el fixture SP7 `UPONE-1378-smoke-fixture.sql`. Objetivo doble: base del smoke y artefacto DEMO re-aplicable post-seed | REQ-02, REQ-07, REQ-09, REQ-10, REQ-11, REQ-PRESERVE-01 | developer | S5.GATE | mods/curriculum-design/seed/ (o fixture SQL versionado del mod) | fixture aplica limpio en UPU y produce ambos planes con todos los tipos de requisito | drop del fixture | DET-2, DET-7 | done | 6 |
| S6.T2 | Smoke runtime COMPLETO de AMBOS modos usando el fixture (DET-36) — VALIDADOR FINAL "mas alla de los tests": (a) MODULAR por niveles verificando la ubicacion de **AND (1+max), OR (1+min) y K-de-N (1+K-esimo menor)** (REQ-02) + coreqs al mismo nivel (REQ-07) + **curso gateado por creditos ubicado donde acumula (REQ-09)** + **rotulo "Nivel N" i18n (REQ-06)** + recalculo al agregar/quitar + alta con requisito no cumplido que **alerta cual falta (REQ-05)** + **flujo guiado modular que agrega el requisito sin cerrar el modal (REQ-10)** con **persistencia atomica** y al menos **un intento de rollback del batch** (forzar fallo → nada persiste, REQ-11) + modal de prereq/coreq por tarjeta drag-safe (REQ-08); (b) SECUENCIAL por periodos completo (crear/mover/agregar-quitar periodo) + alta con bloqueo Volver/Cancelar sin flujo guiado (REQ-05, contraste). Evidencia runtime real (screenshot/console/DOM) de cada caso | REQ-01, REQ-02, REQ-05, REQ-06, REQ-07, REQ-08, REQ-09, REQ-10, REQ-11, REQ-PRESERVE-01 | developer | S6.T1 | mods/curriculum-design (suite UPU) | evidencia runtime real de AMBOS modos incl. AND/OR/K, creditos y rollback del batch (no test file) | (no aplica — verificacion) | DET-36, DET-13 | done | 6 |
| S6.T3 | Regresion secuencial automatizada contra la baseline de S1 (DET-40) + switch de progresion consistente | REQ-PRESERVE-01 | reviewer | S5.GATE | mods/curriculum-design/modsComponents/CurriculumMesh/ | vitest del mod VERDE == baseline S1 + smoke switch | (no aplica) | DET-40, DET-13 | done | 6 |
| S6.T4 | Documentar el modo modular de la malla + como re-aplicar el fixture demo en la guia del mod (docs oficiales — DET-37 dim1) | REQ-01 | developer | S6.T2 | mods/curriculum-design/docs/architecture/curriculum-mesh-guards-prereqs.md | doc actualizada + cross-ref + instrucciones de seed demo | git revert | DET-16, DET-37 | done | 6 |
| S6.T5 | Bloqueo de `progression` en edicion (plataforma, REQ-13): en `default_Curriculum_edit.json` marcar el campo `progression` como read-only/disabled cuando `recordType=="Plan"` (visible, muestra el modo actual, no editable). El create sigue editable. `layer:mod`, cero core | REQ-13 | developer | S5.GATE | mods/curriculum-design/config/layouts/default_Curriculum_edit.json | layout marca progression no editable en edit; sync sin error | git revert del JSON | DET-2, DET-5 | done | 6 |
| S6.T6 | Test + smoke del bloqueo (REQ-13): assert de config (el layout `_edit` deja `progression` no editable) + smoke runtime (el select aparece disabled en edicion y un cambio no persiste); ajustar la aserto de TC-8 al nuevo comportamiento (switch impedido en edicion, no permitido) | REQ-13 | developer | S6.T5 | mods/curriculum-design/modsComponents/CurriculumMesh/, mods/curriculum-design/config/layouts/ | vitest/config assert VERDE + evidencia runtime (select disabled + no-persist) | (no aplica — verificacion) | DET-7, DET-36 | done | 6 |
| **S6.GATE** | Gate de sync Session 6 (tier: T3) — **cierre de la PLATAFORMA validada**: fixture reproducible + evidencia runtime de AMBOS modos + regresion secuencial en VERDE + docs + **bloqueo de `progression` en edicion (REQ-13) verificado** + artefactos de sync/seed NO commiteados salvo el fixture demo intencional (DoD PO, `git status`). **Habilita S7 (MCP) solo si la plataforma quedo validada**; si algo del smoke/regresion no cierra, NO se pasa a MCP (iterate en S1-S6) | — | reviewer | S6.T1, S6.T2, S6.T3, S6.T4, S6.T5, S6.T6 | ticket | gate persistido + acceptance de plataforma en verde (incl. REQ-13) + sync limpio | (no aplica) | DET-20, DET-23, DET-36 | done | 6 |

### Session 7 — Paridad del MCP (up1-mcp) con la malla modular [tipo: ⚑ fuerte] [tier: T3]

> **PRECONDICION DE SECUENCIA (dev 2026-08-06):** S7 solo arranca cuando **TODA la plataforma (S1-S6) esta ejecutada Y validada** — es decir, S6.GATE cerrado con la evidencia runtime del smoke dual (DET-36) y la regresion secuencial en VERDE. El MCP **porta la logica ya estabilizada y validada del mod**, no una version en curso: esto evita re-trabajo y minimiza el drift (se porta el comportamiento final confirmado). Ningun task de S7 inicia con S6.GATE abierto.
>
> Repo distinto: `up1-mcp` (`uplanner/mcp`, standalone, branch propio base `main`). RULE-dev-012: leer el COMMANDMENTS del repo si existe. Guarda de rama por repo destino.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S7.T1 | Portar a `up1-mcp/src/mods/curriculum-design/mesh-logic.ts` la logica nueva: `deriveLevel` (recorrido fiel AND/OR/K), `groupByLevel`, timing (Before empuja; Concurrent/Either/ausente no), creditos→nivel (2 pasadas). Mantener paridad con el mod | REQ-12 | developer | S6.GATE | up1-mcp:src/mods/curriculum-design/mesh-logic.ts | vitest del MCP (casos == mod) | git revert | DET-2, DET-16 | done | 7 |
| S7.T2 | `cd_add_plan_entry` (mesh-write.ts): `period` opcional + ramificar por `progression` (no exigir period en modular); `cd_get_mesh` (mesh-read.ts): exponer niveles derivados en modular | REQ-12 | developer | S7.T1 | up1-mcp:src/mods/curriculum-design/mesh-write.ts, up1-mcp:src/mods/curriculum-design/mesh-read.ts | smoke via tools MCP (alta modular sin period + get_mesh por niveles) | git revert | DET-5, DET-16 | done | 7 |
| S7.T3 | Tests de PARIDAD (anti-drift): la `deriveLevel` portada del MCP produce el mismo nivel que la del mod sobre los mismos grafos (AND/OR/K, timing, creditos); + smoke MCP end-to-end (agregar modular, leer malla) | REQ-12 | reviewer | S7.T2 | up1-mcp:src/mods/curriculum-design/*.spec | vitest paridad VERDE + smoke MCP con evidencia | (no aplica) | DET-7, DET-13, DET-36 | done | 7 |
| S7.T4 | Inmutabilidad de `progression` en el MCP (REQ-13): en `cd_update_curriculum` (`curriculum-write.ts`) leer la progression actual del registro y RECHAZAR el patch si trae un `progression` distinto (validacion antes de mutar); patch sin/igual progression pasa; `cd_create_curriculum` sin cambios. + unit: cambio distinto → error 0 mutaciones, mismo/omitido → OK. Mismo criterio que la plataforma (REQ-13) | REQ-13 | developer | S6.GATE | up1-mcp:src/mods/curriculum-design/curriculum-write.ts, up1-mcp:src/mods/curriculum-design/*.spec | vitest del MCP VERDE (rechazo cambio + acepta sin cambio) + smoke tool | git revert | DET-2, DET-5, DET-16 | done | 7 |
| **S7.GATE** | Gate de sync Session 7 (tier: T3) — paridad MCP verificada (alta modular sin period + cd_get_mesh por niveles + tests de paridad sin drift) + **inmutabilidad de `progression` en `cd_update_curriculum` (REQ-13)**; decidir close | — | reviewer | S7.T1, S7.T2, S7.T3, S7.T4 | ticket | gate persistido + acceptance checkpoints (incl. MCP + REQ-13) ejecutados | (no aplica) | DET-20, DET-23, DET-36 | done | 7 |

### Session 8 — REQ-13 revisado: bloqueo condicional por malla vacia (DEC-LOCAL-10) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S8.T1 | Guard server-side en el resolver mod `curriculum-update`: rechazar cambio de `progression` solo si el plan tiene `planEntry` (conteo > 0); plan vacio acepta. Mod-owned, salda B10. Reemplaza el enfoque estatico | REQ-13 | developer | — | mods/curriculum-design/logic/curriculum-update.resolver.js | unit/integration: cambio con entries rechazado, sin entries OK; `npm run sync` | git revert | DET-2, DET-5, DET-40 | done | 8 |
| S8.T2 | UI: `default_Curriculum_edit.json` `progression` disabled CONDICIONAL por hasEntries + quitar `native:true` (estilo gris) + help text "para cambiar el modo se requiere una nueva version". Mecanismo para exponer hasEntries al form | REQ-13 | developer | S8.T1 | mods/curriculum-design/config/layouts/default_Curriculum_edit.json | smoke: plan vacio editable / con cursos disabled gris | git revert | DET-5, DET-36 | done | 8 |
| S8.T3 | Tests: actualizar `curriculum-progression-lock.test.ts` (ya no disabled estatico) + test del guard del resolver + regresion del mod | REQ-13 | developer | S8.T1, S8.T2 | mods/curriculum-design/tests/ | vitest del mod VERDE | git revert | DET-7, DET-40 | done | 8 |
| **S8.GATE** | Gate ⚑ fuerte (T3): plan vacio editable / con cursos bloqueado (UI + server); versionar (v2 vacia) permite cambiar el modo; regresion verde; dual-judge | — | reviewer | S8.T1, S8.T2, S8.T3 | ticket | gate persistido + dual-judge | (no aplica) | DET-20, DET-23, DET-35 | done | 8 |

### Session 9 — REQ-14: borrado seguro de cursos en la malla (ambos modos) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S9.T1 | Logica pura de dependencia inversa + clasificacion por satisfacibilidad (`findDependents` + `classifyDeletion` → allow/cascade(chain transitivo)/block(reasons {dependent,group})) reusando `evaluateRequirementTree` + `.spec.ts` (allow OR/K-de-N N-1>=K/creditos; cascade unico + transitivo; block K-de-N<K/OR agotado; precedencia block; ciclos) | REQ-14 | developer | — | mods/curriculum-design/modsComponents/CurriculumMesh/deleteClassification.logic.ts (+spec) | vitest VERDE | git revert | DET-1, DET-2, DET-7 | done | 9 |
| S9.T2 | Resolver mod-owned `deletePlanEntriesBatch` (+ .schema.graphql): borrado atomico transitivo en `$transaction` + RBAC `planEntry:delete` (espeja planEntry-batch). Sync a OM | REQ-14 | developer | S9.T1 | mods/curriculum-design/logic/planEntry-delete-batch.resolver.js (+schema) | unit rollback + RBAC; sync | git revert | DET-2, DET-5, DET-8 | done | 9 |
| S9.T3 | Modal 3 estados (confirmar/cascada-advertir/bloquear) + wire en `CurriculumMeshElement.vue` (clasificar antes de borrar; nombre en la pregunta no en el boton) + i18n es/en/pt | REQ-14 | developer | S9.T1, S9.T2 | mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue, DeleteConfirmModal, lang/ | smoke UI (S9.T4) + vitest | git revert | DET-5, DET-16 | done | 9 |
| S9.T4 | Smoke runtime (DET-36) ambos modos: confirmacion siempre; cascada transitiva sin huerfanos; bloqueo accionable con el por que; permitir cuando D sigue satisfacible | REQ-14 | developer | S9.T3 | mods/curriculum-design (suite UPU) | evidencia runtime real | (no aplica) | DET-36, DET-13 | done | 9 |
| **S9.GATE** | Gate ⚑ fuerte (T3): las 4 ramas verificadas + regresion + dual-judge (logica de dependencia + cascada destructiva) | — | reviewer | S9.T1, S9.T2, S9.T3, S9.T4 | ticket | gate persistido + dual-judge | (no aplica) | DET-20, DET-23, DET-35, DET-36 | done | 9 |

### Session 10 — Paridad MCP de REQ-13 condicional + REQ-14 borrado [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S10.T1 | `cd_update_curriculum` (up1-mcp): condicionar el rechazo de cambio de `progression` a que el plan tenga entries (paridad con S8; hoy rechaza incondicional) | REQ-13 | developer | S8.GATE | up1-mcp:src/mods/curriculum-design/curriculum-write.ts | vitest MCP VERDE | git revert | DET-2, DET-16 | done | 10 |
| S10.T2 | `cd_remove_plan_entry` (up1-mcp): clasificacion cascada/bloqueo (paridad con S9) + INFORMAR el por que accionable (blockReasons: dependiente D + grupo) + preview lista la cadena en cascada | REQ-14 | developer | S9.GATE | up1-mcp:src/mods/curriculum-design/ | vitest MCP + smoke tools | git revert | DET-5, DET-16 | done | 10 |
| S10.T3 | Tests de paridad MCP (misma regla condicional + misma clasificacion/mensajes que la plataforma) | REQ-13, REQ-14 | reviewer | S10.T1, S10.T2 | up1-mcp:test/ | vitest paridad VERDE | (no aplica) | DET-7, DET-13 | done | 10 |
| **S10.GATE** | Gate ⚑ fuerte (T3): paridad MCP de REQ-13 condicional + REQ-14 (cascada/bloqueo con por que); dual-judge; habilita request-close | — | reviewer | S10.T1, S10.T2, S10.T3 | ticket | gate persistido + dual-judge | (no aplica) | DET-20, DET-23, DET-35 | done | 10 |

## Constraints

- RULE-dev-004 (clausula mod_work): `planEntry` lo declara el mod; el cambio se edita en `mods/curriculum-design/` y se propaga por codegen + sync — flujo autocontenido, branch propio del ticket base `develop`, sin rama de epica core (precedente TICKET-101). Cero edicion directa de core.
- RULE-dev-012 (multi-repo): el ticket alcanza DOS repos — `up1:mods/curriculum-design/` (S1-S6, branch base `develop`) y `up1-mcp` (S7, repo standalone `uplanner/mcp`, branch base `main`). Leer el COMMANDMENTS de cada repo alcanzado (up1-mcp: null hoy, no bloquea). Guarda de rama verificada por repo destino, no en superproyecto.
- DET-40: auditoria de reemplazo del camino secuencial — el branch por modo no debe alterar el render por periodos (S4.T4, S6.T2).
- DET-36: verificacion runtime obligatoria para cambios UI (S6.T1).
- Patron del mod: Vueform element + Apollo por tenant + logica en `.ts` puros; `defineElement` es Options API (no Composition APIs en computed getter); malla siempre montada (refetch manual). Fuente: `mods/curriculum-design/docs/architecture/curriculum-mesh-guards-prereqs.md`.
- Sync no propaga carpetas solo-logica: los `.logic.ts` nuevos van junto al componente.
- Tenant isolation en toda query (el client per-tenant no lleva `tenantId`).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Curriculum.progression | internal | Enum `[Sequential,Modular]` que la malla lee para elegir modo (creado por UPONE-1538/TICKET-119) | Si no esta poblado en un plan, la malla usa default secuencial |
| Logica de prerrequisitos SP7 | internal | `evaluateRequirementTree`, `prereqCheck`, `usePrereqRequirements` — input de `deriveLevel` | Cambio de contrato del arbol romperia la derivacion (baja probabilidad, ya estable) |
| Pipeline codegen + sync + prisma migrate | internal | Propaga el `period` nullable del JSON del mod a schema + migracion por tenant (flujo estandar del mod) | Migracion no-destructiva; sin coordinacion core requerida |
| UPONE-1450 (versionamiento del Plan) | internal | Ya toco el mismo objeto `Curriculum`/layouts; el contrato del PO pide revisar su cambio para no chocar | Colision silenciosa con el versionamiento del Plan si se ignora — verificado en S1.T1 |
| up1-mcp (repo `uplanner/mcp`) | internal (repo distinto) | S7 porta la logica de derivacion + adapta cd_add_plan_entry/cd_get_mesh a modular | Drift entre el mod y el port del MCP → tests de paridad (S7.T3). Branch/PR propios en el repo MCP |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `period` nullable rompe el camino secuencial | medium | high | Baseline S1 + auditoria DET-40 1:1 (S4.T4) + regresion + smoke (S6) |
| Migracion por tenant con efecto inesperado | low | high | Relajacion NOT NULL→NULL (sin perdida, no-destructiva); flujo estandar del mod codegen+sync+migrate; rollback documentado |
| Derivacion de nivel incorrecta (ciclos/contenedores/pools/AND-OR-K) | medium | medium | Funcion pura testeada (S3) antes de cablear al render; recorrido fiel del arbol (DEC-LOCAL-05) con tests por combinator |
| Heuristica creditos→nivel fragil e interdependiente (REQ-09) | medium | medium | 2 pasadas con orden definido (curso-prereq → creditos); supuestos v1 explicitos (planificados, inalcanzable→ultimo+reporte); tests de casos borde en S3; si en runtime resulta confusa, es candidata a re-evaluacion (merecia su propio analisis, DEC-LOCAL-06) |
| REQ-11 batch: eventos no-transaccionales de los wrappers de `createInstance` | low | low-medium | Verificado: `createInstance` corre en `tx` via `context.prisma` (cero core), pero su wrapper `withEventPublish` es no-transaccional. Mitigacion: usar `tx.planEntry.create` directo (planEntry sin eventos custom ni DataLog → sin perdida) o publicar eventos solo tras commit. Mod-only |
| REQ-12 drift: la logica de derivacion queda duplicada (mod + port MCP) | medium | medium | Tests de paridad (S7.T3, TC-16) que corren los MISMOS grafos contra el `deriveLevel` del mod y el portado del MCP y exigen igual resultado; nota cruzada en ambos `mesh-logic`. Orden: S7 porta tras estabilizar el mod (depende de S6.GATE) |
| `.logic.ts` nuevo no propagado por sync (carpeta solo-logica) | low | medium | Colocar junto al componente existente (S3.T1) |
| Conflicto de key i18n aborta el sync | low | low | Agregar `curriculumMesh.level` con paridad es/en/pt (S5.T2) |

## Open questions

- [x] ~~OQ-1: comportamiento del switch Modular→Secuencial de un plan con entries `period=null`~~ **RESUELTA → REQ-13 / DEC-LOCAL-09** (dev 2026-08-10): el switch de modo se **prohibe en edicion** (el modo se fija en la creacion, inmutable al editar), en plataforma y MCP. Al no poder cambiarse el modo de un plan existente, el escenario de "switch de datos" que OQ-1 dejaba abierto deja de existir. TC-8 se re-orienta: valida que el switch esta **impedido** en edicion (antes validaba que el switch funcionaba).
- [x] ~~OQ-3: tratamiento de `timing = Either` o ausente en `deriveLevel`~~ **RESUELTA → DEC-LOCAL-03** (solo `Before` empuja; `Concurrent`/`Either`/ausente no empujan, en esta version).
- [x] ~~OQ-4: atomicidad del flujo guiado de alta~~ **RESUELTA → REQ-11 / DEC-LOCAL-07**: como el batch atomico es **mod-owned** (resolver custom + `$transaction`), entra en TICKET-120 (REQ-11). Solo lo que es **core** (generalizacion `createManyInstances` en OM + `updatePlanEntriesBatch` del reorder transversal) queda en el ticket aparte `sp8/batch-planentry-atomic-mutation-analysis.md`.
- [ ] OQ-2: branches (multi-repo, DEC-LOCAL-08) — (a) en `up1` mod: `feat/UPONE-1539-modular-mesh` base `develop`; (b) en `up1-mcp`: `sp8-06-ago-mcp-progression-parity` base `main`. Guarda de rama verificada por repo destino.
- [x] ~~OQ-5: ¿el versionado permite cambiar el modo? ¿arrastra la malla?~~ **RESUELTA → DEC-LOCAL-10 / R13.2** (smoke 2026-08-10): versionar exige estado Active/Approved (Borrador no versionable); el core NO copia hijos → la v2 nace SIN malla (vacía). Con la regla condicional (editable si vacía) la v2 vacía queda editable → versionar SÍ permite cambiar el modo, sin tocar el flujo de versionado.
- [x] ~~OQ-6 (REQ-14): determinista vs no determinista para el borrado~~ **RESUELTA (dev 2026-08-10)**: se decide por SATISFACIBILIDAD tras quitar C (re-evaluar el requisito de D con C no colocado), no por tipo de nodo. D satisfacible → permitir; D roto por culpable único → cascada transitiva (C→D→E, atómica); D roto por grupo (K-de-N<K, OR agotado) → bloquear + explicar; si algún dependiente bloquea, gana el bloqueo. Ver REQ-14.

## Decisions

### DEC-LOCAL-01: `period` nullable (camino completo) vs conservar ignorado
- **Contexto**: en modular `period` no aplica; se evaluo hacerlo nullable (toca core) vs conservarlo obligatorio con placeholder (mod-only).
- **Drivers**: limpieza del modelo (deuda MC-02/UPONE-1345 auto-documentada), riesgo de regresion secuencial, coordinacion core, superficie.
- **Opcion elegida**: nullable (camino completo, 13 SP, `layer:mod`) — decision del dev.
- **Alternativas**: conservar ignorado (8 SP, con placeholder) — descartada por dejar la deuda y un placeholder sin sentido.
- **Consecuencias**: gana modelo coherente; cuesta la migracion por tenant (no-destructiva) + auditoria DET-40 del camino secuencial.
- **Session**: intake (S0).

### DEC-LOCAL-10: refinamiento del bloqueo de progression (condicional por malla) + REQ-14 borrado seguro
- **Contexto**: review del dev sobre la UI de REQ-13 + smoke de versionado (2026-08-10). El bloqueo estático de `progression` (DEC-LOCAL-09) se veía inconsistente (native select sin estilo disabled) y era más restrictivo de lo necesario (bloqueaba incluso planes vacíos, dejando sin camino el cambio de modo).
- **Decisiones del dev**:
  1. **Regla condicional (reemplaza el bloqueo estático)**: `progression` editable mientras la malla está vacía (0 `planEntry`), bloqueada en cuanto tiene cursos. Enforcement **server-side** (resolver mod-owned `curriculum-update` rechaza el cambio solo si hay entries; MCP `cd_update_curriculum` igual) + **reflejo en UI** (disabled condicional). Salda B10 (blindaje server-side).
  2. **Estilo disabled**: quitar `native: true` de `progression` en `_edit` → se ve gris (Vueform multiselect disabled) como TIPO cuando aplica.
  3. **Versionado como camino de cambio de modo** (validado por smoke): la v2 nace vacía → editable bajo la regla condicional → versionar permite cambiar el modo. Requiere estado Active/Approved para versionar. Help text: "para cambiar el modo se requiere una nueva versión".
  4. **REQ-14 — borrado seguro de cursos** (ambos modos): (a) confirmación siempre; (b) dependientes deterministas → advertir + cascada atómica; (c) dependientes no deterministas → bloquear + pedir corregir el requisito. Paridad MCP en `cd_remove_plan_entry`.
- **Consecuencias**: revisa lo ya shipeado de REQ-13 (S6.T5 estático + S7.T4 rechazo incondicional) → se rehace a condicional. Suma REQ-14 (nuevo, grande: lógica de dependencia inversa + cascada/bloqueo). Reabre el ticket (estaba listo-para-cierre).
- **Session**: scope addition post-execution (S8+). Decisión del dev 2026-08-10.

### DEC-LOCAL-09: `progression` inmutable al editar (bloqueo del switch de modo) — SUPERSEDED por DEC-LOCAL-10 (regla estática → condicional)
- **Contexto**: hoy el modo de un plan (`progression`) es editable tras la creacion en las dos superficies (select del layout `_edit` sin `disabled`; `cd_update_curriculum` acepta un valor distinto y lo aplica sin comparar). Cambiar el modo de un plan con asignaturas ya colocadas corrompe su semantica y su render, y era el hueco que OQ-1 dejaba abierto.
- **Drivers**: integridad del dato (modular no tiene `period`, secuencial si); el modo es una decision de creacion; cerrar OQ-1 sin construir un migrador de datos entre modos.
- **Opcion elegida (2 decisiones del dev 2026-08-10)**: (1) **modo inmutable al editar** — se fija en la creacion; en cualquier edicion `progression` es read-only (con o sin entries). (2) **enforcement UI + MCP, sin tocar core** — read-only en el layout `_edit` del mod + rechazo en `cd_update_curriculum`; el resolver OM (`updateCurriculumWithRecordType`) NO valida (queda como follow-up server-side, backlog B10).
- **Alternativas**: (a) bloquear solo cuando el plan tiene entries (permitir cambio en plan vacio) — descartada por el dev a favor de la regla simple; (b) sumar blindaje server-side en OM ahora — descartada por el dev (toca core, RULE-dev-004); se deja como follow-up.
- **Consecuencias**: REQ-13 nuevo (plataforma + MCP) + tasks S6.T5/T6 y S7.T4; TC-8 se re-orienta (switch impedido, no permitido); OQ-1 resuelta. Limitacion aceptada: una llamada GraphQL cruda al OM aun podria cambiar el modo (B10). Versionamiento fuera de alcance (un plan nuevo elige su modo).
- **Session**: scope addition (post-design). Decision del dev 2026-08-10.

### DEC-LOCAL-08: paridad del MCP resuelta DENTRO de TICKET-120 (multi-repo)
- **Contexto**: el MCP (`up1-mcp`) hoy solo soporta malla secuencial (`cd_add_plan_entry` exige `period`) y replica la logica del mod (`mesh-logic.ts` es un port). ¿Se difiere a un ticket propio del repo MCP o se resuelve aca?
- **Drivers**: decision del dev — "en 120 se debe resolver TODO"; sin paridad, las funcionalidades nuevas quedan inaccesibles desde el MCP.
- **Opcion elegida**: **incluir la paridad MCP en TICKET-120** (REQ-12, Session 7). El ticket pasa a ser **multi-repo**: `mods/curriculum-design/` (S1-S6) + `up1-mcp` (S7, repo standalone `uplanner/mcp`, branch propio base `main`). RULE-dev-012: leer COMMANDMENTS de cada repo alcanzado; guarda de rama por repo destino.
- **Alternativas**: ticket aparte en el repo MCP — descartada por el dev (todo en 120).
- **Consecuencias**: alcance mayor (+~4-5 SP) y coordinacion de 2 branches/PRs (mod + MCP). La logica de derivacion queda **duplicada** (mod + port MCP) → riesgo de **drift**, mitigado con **tests de paridad** (S7.T3, TC-16) que fijan que ambos `deriveLevel` coinciden. Orden: el MCP porta DESPUES de estabilizar la logica del mod (S7 depende de S6.GATE).
- **Session**: design (S0). Decision del dev 2026-08-06.

### DEC-LOCAL-07: flujo guiado de alta con faltantes = Opcion B, SOLO modular, client-side v1
- **Contexto**: al agregar un curso con requisitos no cumplidos, se evaluo (A) alerta+bloqueo (Volver/Cancelar, como secuencial) vs (B) mantener el modal activo para agregar el faltante desde ahi.
- **Drivers**: en modular el orden lo dicta el grafo → completar los faltantes en el mismo flujo es natural (maqueta "recuerda y exige"); no cambiar el secuencial.
- **Opcion elegida**: **B, acotada a modo modular** (REQ-10), **con atomicidad via REQ-11** (batch mod-owned). Secuencial mantiene A (REQ-05 bloqueo). Todo `layer:mod`. Decision del dev.
- **Alternativas**: (A) solo bloqueo — descartada para modular por el dev; (client-side no-atomico) — descartada: como el batch atomico resulto **mod-owned** (resolver custom + `$transaction`), entra en este ticket (REQ-11) en vez de diferirse. Solo lo **core** (generalizacion en CRUD de OM + batch del reorder transversal) va al ticket `sp8/batch-planentry-atomic-mutation-analysis.md`.
- **Consecuencias**: mejor UX en modular con atomicidad real (todo-o-nada); +alcance (~4-5 SP entre REQ-10 y REQ-11). Sin limitacion de partial-add.
- **Session**: design (S0). Decision del dev 2026-08-06.

### DEC-LOCAL-05: derivacion de nivel FIEL al arbol Y/O (no max plano)
- **Contexto**: el REQ-02 inicial derivaba `1 + max(todas las hojas-curso)`, que aplana el arbol y es correcto solo para AND.
- **Drivers**: fidelidad a la semantica Y/O (el evaluador SP7 ya la respeta); un OR con max ubica el curso mas a la derecha de lo necesario.
- **Opcion elegida**: recorrer el arbol fiel — AND → `max(hijos)`, OR → `min(hijos)`, K-de-N (`minToSatisfy=K`) → K-esimo menor; recursivo. Decision del dev.
- **Alternativas**: max plano global (todo como AND) — descartada por incorrecta para OR y por contradecir el principio de no aplanar el arbol (pre-intake §correctitud).
- **Consecuencias**: derivacion mas correcta; algo mas de logica recursiva y tests (AND/OR/K-de-N). Corrige el REQ-02.
- **Session**: design (S0). Decision del dev 2026-08-06.

### DEC-LOCAL-06: nivel desde requisitos de creditos = heuristico de 2 pasadas (v1)
- **Contexto**: `MetricThreshold`(Credits) y `Group.creditsRequired` no apuntan a un curso, no tienen un nivel que referenciar.
- **Drivers**: evitar que un curso gateado solo por creditos caiga en nivel 1; fidelidad a la intencion (va tarde en el plan).
- **Opcion elegida**: 2a pasada sobre creditos planificados acumulados por nivel (`cumCredits(L)`), el curso va al primer nivel donde se alcanza `V`, +1. Ver REQ-09 (con supuestos: creditos planificados, no cuenta los propios, inalcanzable→ultimo+reporte, operadores Gte/Gt soportados). Decision del dev.
- **Alternativas**: excluir del nivel (v1 simple, el curso caia en nivel 1 con limitacion documentada) — descartada por el dev a favor de la heuristica.
- **Consecuencias**: mas fiel pero **fragil e interdependiente** (el nivel-por-creditos depende de la ubicacion del resto → 2 pasadas; riesgo en Risks). +alcance (~2-3 SP). Merecia su propio analisis; se acota con supuestos explicitos v1.
- **Session**: design (S0). Decision del dev 2026-08-06.

### DEC-LOCAL-04: display de prereq/coreq por tarjeta = modal (no popover/hover)
- **Contexto**: REQ-08 muestra prereqs/coreqs por tarjeta. La superficie inicial evaluada fue tooltip/popover en hover.
- **Drivers**: el drag&drop (presente en secuencial, potencial en modular futuro) entra en conflicto con un popover en hover (el hover captura el gesto de arrastre); consistencia con el patron de modales caseros del mod.
- **Opcion elegida**: **modal abierto por accion explicita** — boton-icono por tarjeta `cm-pe__reqs` con `@click.stop` (espeja el `cm-pe__edit` existente, drag-safe probado) + **componente fino nuevo `RequirementsModal.ts`** sobre la molecula `Modal` de `@molecules` (patron `PrereqBlockModal`). Decision cerrada en diseño (no diferida a execute).
- **Alternativas**: (1) tooltip/popover en hover — descartada por interferir con el drag; (2) embeber una seccion "Requisitos" en `EditEntryModal` — descartada: acopla ver-requisitos a modo edicion (los requisitos deben verse sin editar); (3) repurposear `PrereqBlockModal` — descartada: su concern es prereqs FALTANTES al agregar (flujo bloqueante), no la lista completa por tarjeta.
- **Consecuencias**: interaccion un paso mas larga (abrir/cerrar) a cambio de cero conflicto con drag; reuso real de la molecula `Modal` + patron thin-modal + patron de affordance `cm-pe__edit`; separacion de concerns limpia. Verificado contra codigo (`CurriculumMeshElement.vue:253-256`, los 3 modales del mod).
- **Session**: design (S0). Decision del dev 2026-08-05.

### DEC-LOCAL-03: temporalidad ambigua (`Either`/ausente) no empuja el nivel
- **Contexto**: `deriveLevel` debe decidir si un requisito con `timing = Either` o ausente empuja el nivel (como `Before`) o no (como `Concurrent`). El usuario ya elige la temporalidad por requisito (`Before`/`Concurrent`/`Either`); lo abierto era solo el default del caso ambiguo.
- **Drivers**: simplicidad de esta version; regla unica y testeable; semantica de `Either` ("puede ser concurrente"); evitar scope de una capacidad de desambiguacion por usuario.
- **Opcion elegida**: en esta version, `deriveLevel` cuenta **solo `timing = Before`** como prereq que sube el nivel. `Concurrent`, `Either` y ausente **NO empujan** (se muestran al mismo nivel, como coreq). Ante ambiguedad, no empujar.
- **Alternativas**: (a) `Either`/ausente → empujar (conservador) — descartada por preferencia del dev de no empujar en la ambiguedad; (b) construir un control para que el usuario decida el comportamiento al ingresar el requisito — **diferida** (fuera de alcance de este ticket; otro analisis, se evaluara segun necesidad mas adelante).
- **Consecuencias**: regla simple ("solo `Before` empuja"); un prereq real sin `timing` seteado no ordenara la malla hasta que se marque `Before` (aceptable en esta version; la desambiguacion por usuario queda para el futuro).
- **Session**: intake/design (S0). Decision del dev 2026-08-05.

### DEC-LOCAL-02: orden en modular = solo lectura
- **Contexto**: reordenar en modular (drag) vs solo lectura.
- **Drivers**: la maqueta deshabilita drag en modular; el orden lo dicta el grafo.
- **Opcion elegida**: solo lectura — resuelto por evidencia (`mockup_v10.html:889,897`).
- **Alternativas**: drag con otra semantica — descartada (superficie + convencion `position` bifurcada).
- **Consecuencias**: menor superficie; coherente con recalculo automatico.
- **Session**: intake (S0).

## Technical reference

- `groupByPeriod` (`curriculumMesh.logic.ts:210`): forma de salida `MeshCard[][]` que `groupByLevel` debe replicar.
- `CurriculumMeshElement.vue`: `columns` computed (l.~537), header `curriculumMesh.period` (l.225), drag SortableJS `group:'cm-periods'` (l.600+), controles periodo (l.303-320).
- `useCurriculumMesh.ts`: `PlanVM = {totalPeriods, totalCredits, status}` (`toPlanVM` l.124-134) — agregar `progression`.
- Smoke SP7 reutilizable: `sp7/UPONE-1378-smoke-fixture.sql` contra tenant UPU.
- Maqueta: `kb/sp5/sources/mockup_v10.html` (dataset modular Magister, `nonSequential:true`, "Nivel 1..4").
- **Modelo de requisitos** (`objects/requirement.json` + RTs): arbol Composite por `parentId`, `recordType ∈ {Group, RecordState, MetricThreshold}`. `Group`: `combinator AND|OR` + `minToSatisfy` (K-de-N) + `creditsRequired`. `RecordState`: curso (`targetId=activity`, `timing Before|Concurrent|Either`, `mustBe`). `MetricThreshold`: `metric=Credits`, `operator Gte/Gt/Eq/Lt/Lte`, `value`, `scope plan|category`. El evaluador SP7 `evaluateRequirementTree.logic.ts` ya recorre este arbol para satisfaccion — `deriveLevel` reusa esa lectura para el nivel (REQ-02/07/09).

### Manejo de tipos de requisito en la derivacion de nivel (referencia consolidada)

> Sintesis de REQ-02 (arbol fiel), REQ-07 (timing) y REQ-09 (creditos). **Nivel** = donde se dibuja la columna; **satisfaccion** = si el requisito se cumple (banner/modal SP7) — son cosas separadas.

**Por tipo de nodo (contribucion al NIVEL):**

| Nodo | Que es | Contribucion al nivel |
|------|--------|-----------------------|
| `RecordState` `timing=Before` | Prerrequisito de curso (antes) | Aporta el nivel de ese curso (empuja: `1 + nivel del prereq`) |
| `RecordState` `timing=Concurrent` | Corequisito (en paralelo) | NO empuja — mismo nivel (REQ-07) |
| `RecordState` `timing=Either`/ausente | Flexible | NO empuja en v1 (como coreq — DEC-LOCAL-03) |
| `Group` `AND` | Necesita todos | `max(nivel requerido de hijos)` |
| `Group` `OR` | Basta uno | `min(nivel requerido de hijos)` |
| `Group` `OR` `minToSatisfy=K` | K-de-N | K-esimo menor de hijos (K=1≡min, K=N≡max) |
| `MetricThreshold` (Credits) | Umbral de creditos (no-curso) | Nivel por creditos acumulados: primer `L` con `cumCredits(L) ≥ value`, +1 (REQ-09) |
| `Group.creditsRequired` | Grupo que exige N creditos | Igual, sumando creditos de los hijos del grupo |

**Combinacion:** recorrido recursivo; nivel final del curso = `1 + (nivel requerido resuelto de la raiz de su arbol)`. Un `MetricThreshold`/nivel-por-credito entra como un hijo mas del combinator (ej. `AND[C(niv 2), Credits≥12 (niv 1)]` → `1 + max(2,1) = 3`). Dos pasadas: (1) niveles por curso-prereq; (2) creditos acumulados por nivel.

**Casos borde (no rompen, se reportan):** ciclo → termina + reporta; `Group` vacio → excluido; pool K-de-N con N<K → tolerado; creditos inalcanzables → ultimo nivel + reporte; operadores `Lt`/`Lte`/`Eq` de credito → no soportados para nivel en v1 (se reportan).

**No afecta nivel pero si satisfaccion:** todos los tipos (coreqs, creditos, Either) siguen contando en la verificacion de satisfaccion existente (banner de faltantes + modal al agregar, `evaluateRequirementTree`).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-13 + REQ-PRESERVE-01 pasan (incluye REQ-07 timing, REQ-08 modal, REQ-09 creditos→nivel, REQ-10 flujo guiado modular, REQ-11 batch atomico, REQ-12 paridad MCP, REQ-13 progression inmutable al editar)
- [ ] **Tests** (DET-37 dim4): `deriveLevel.logic.spec.ts` + characterization secuencial + regresion, corridos y en VERDE
- [ ] **NFRs**: N/A (sin NFRs relevantes)
- [ ] **Rules**: patron Vueform/mod respetado; tenant isolation; sync sin conflicto
- [ ] **A11y + tokens** (REQ-06): WCAG AA (foco/teclado en columnas de nivel) verificado con evidencia + UI modular sin hardcode de tokens (S5.T4)
- [ ] **Integration**: regresion secuencial verde == baseline S1 (DET-40)
- [ ] **Docs oficiales del proyecto** (DET-37 dim1): guia del mod actualizada con el modo modular (S6.T4)
- [ ] **KB DKC** (DET-37 dim2): capturar RULE del modo modular / period nullable si emerge (mixed — evaluar en close)
- [ ] **Docs externas DKC** (DET-37 dim3): N/A (ticket de producto)
- [ ] **Runtime** (DET-36): evidencia runtime de AMBOS modos en UPU sobre el fixture reproducible (S6.T2), incluyendo un corequisito al mismo nivel (REQ-07) y un curso gateado por creditos ubicado donde acumula (REQ-09)
- [ ] **Fixture demo**: caso de prueba sembrado (prereqs+coreqs, modular+secuencial) re-aplicable post-seed para mostrar la funcionalidad (S6.T1)
- [ ] **Paridad MCP** (REQ-12): `cd_add_plan_entry` acepta modular sin `period`, `cd_get_mesh` devuelve niveles en modular, y los tests de paridad confirman que el `deriveLevel` portado == el del mod (S7)
- [ ] **Planning-completeness**: entry registrada

## Archiving

Usar `/dkc-archive-spec` cuando deje de ser fuente de verdad. NO borrar manualmente.
