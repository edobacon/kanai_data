---
id: SPEC-curriculum-design-activity-requirements-section
project: up1
ticket: TICKET-101
status: in_progress
---

# SP7 · P1 — Requisitos como sección del Programa de asignatura + contrato con la malla

# SP7 · P1 — Requisitos como sección del Programa de asignatura + contrato con la malla

## Executive summary — lo que estas aprobando

> *Esta sección está diseñada para revisión rápida. Todo el detalle técnico vive en las secciones siguientes (Requirements, Artifacts, Tasks).*

**Que se quiere**: hoy el objeto `requirement` (árbol Y/O de prerrequisitos y correquisitos) ya existe y se puede sembrar por seed, pero no hay forma de crearlo ni editarlo desde la UI. Este ticket entrega esa contraparte: una sección "Requisitos" dentro del Programa de asignatura (Activity, patrón curricular-section) con una lista de condiciones, un modal de alta en 2 pasos y una vista de "regla unificada" (el árbol Y/O, solo lectura). Además, cierra el circuito con la malla curricular: los requisitos que se definan aquí deben ser respetados y validados por el componente de malla existente (plan de estudio) al construirla, alertando cuando un curso se ubica antes que su prerrequisito. La malla en sí NO se ve desde la asignatura — solo se consumen sus requisitos.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **BL-1 se reduce**: la investigación de código (2026-07-24) refuta la premisa "el create de `requirement` usa el objectType base y no persiste bien los campos RT" — el create de `up1-mcp` YA usa el RT literal (`typedRequirementName`) en las líneas citadas. Solo el **UPDATE** genuinamente no rutea (RT_PATTERN de `polymorphicUpdate.resolver.js:199` solo matchea `curricularsection`) | Cambia el tamaño de BL-1: no hay que "arreglar el create", solo extender el pattern de update + un guard que se pierde al migrar de rama (ver decisión 2). Ver DEC-LOCAL-01 |
| 2 | Extender `RT_PATTERN` mueve `requirement` a la rama `rtUpdateHandler`, que **no** aplica hoy el guard `assertActivityNotInActivePlanOnUpdate` (MC-09) — hay que recablearlo explícitamente ahí o el update queda sin ese guard | Riesgo de regresión silenciosa de una regla de negocio ya entregada en SP5 si no se recablea |
| 3 | La validación de ciclos cruzados entre Activities (CAP-CUR-004, Must) **solo existe hoy en `up1-mcp`** (`wouldFormRequirementCycle`), NO en el backend/resolver que usa la Suite. Se porta la misma lógica (BFS transitivo, guard de profundidad) al mod | Sin este guard en el backend, un create/update de `RecordState` vía la UI de este ticket (que llama GraphQL directo, no MCP) podría formar un ciclo A→B→C→A sin que nada lo bloquee |
| 4 | **REQ-11 (malla) es una extensión acotada, no un editor nuevo**: la investigación confirma que la malla YA detecta prerrequisitos no ubicados **al agregar** una entrada (`CurriculumMeshElement.vue` → `checkPrereqsForBatch` → `PrereqBlockModal`, bloqueante). El gap real es que esa detección **no vuelve a correr al mover** una entrada de período, y no hay un **banner** que señale violaciones ya existentes en la malla completa | Acota el esfuerzo de REQ-11 a 2 piezas concretas (chequeo en mover + banner), no a construir detección desde cero |
| 5 | Eliminar nodos del árbol exige un guard de delete nuevo (hoy no existe) — se generaliza el único override de `deleteInstance` del mod (`requirementCategoryDelete.resolver.js`, CONSTRAINT H7) en vez de crear un archivo nuevo | H7: un solo archivo puede exportar `deleteInstance` en todo el mod; un segundo archivo lo clobbearía |

**Riesgos principales y como los mitigamos**:

- **Recableo de `RT_PATTERN` pierde el guard de plan Active en update (MC-09)** → S1 incluye una task dedicada de recableo + test de regresión que reproduce el escenario "update de RecordState sobre Activity en plan Active debe seguir rechazando".
- **Regresión de CurricularSection** al tocar código compartido (`polymorphicUpdate.resolver.js`) → `tests/unit/polymorphicUpdate.test.js` (ya cubre los 7 subtipos de CurricularSection) corre completo en el gate de S1 antes de continuar.
- **Ciclos cruzados sin guard en backend** (el único que existe está en el repo `up1-mcp`, que la Suite no usa) → S3 porta la lógica al mod con tests unitarios de ciclo directo y transitivo.
- **Banner de malla con costo de recorrido alto** → reusar el mismo patrón por-lote (`findMissingPrereqsForBatch`) ya probado, en vez de un algoritmo nuevo.
- **Operaciones estructurales del árbol (mover/anidar/cambiar combinator) sin "home" claro en el modal** — el draft aprobado deja esto como open question → se resuelve con el dev antes de cerrar S5 (ver Open questions).

**Que NO se hace en este ticket** (limites explicitos del scope):

- Motor de evaluación del avance del estudiante (degree-audit) — REQ-07, fuera de alcance, documentado.
- Ver la malla desde el Programa de asignatura — descartado explícitamente por el dev (2026-07-24); el trabajo de malla vive en Plan de estudio.
- Barrido de `minimum:0` a campos numéricos fuera de los RT de `requirement` (Activity.credits, planEntry, RT de curricularsection/curriculum) — movido a TICKET-105.
- Herencia MADS del sílabo (Hereda/Agrega/Reemplaza) — no está en las AC de Jira; queda como open question a confirmar in/out. Seguimiento: `uplanner/specs/up1/sp7/UPONE-1378-out-of-scope-followups.md` §2.
- **Métricas `MetricThreshold` distintas de `Credits`** (GPA, PeriodIndex): no modeladas (enums cerrados a `Credits`, decisión #4); solo se evalúa la de créditos. **Duplicación intencional del guard de ciclos** (mod backend + up1-mcp, DEC-LOCAL-03): registrada en el follow-up §3 para mantener ambas implementaciones en sync.

> **Nota (validación 2026-07-27):** correquisitos (`timing=Concurrent`) y `MetricThreshold(Credits)` **SÍ entran** en la evaluación de la malla (REQ-14) — están en el Request literal + CAP-CUR-004 (Must) y la maqueta ya los evalúa. Se corrigió REQ-14, que en una versión previa los dejaba neutros.

**Tamano estimado**: 9 sessions ejecutables (S1–S9), estimado revisado **18–22 SP ~20** (adecuación 2026-07-27, opción A — ver "Re-estimación de esfuerzo" en Technical reference). Supera los 8 SP publicados y el `estimated: 13` original: además de la extensión de malla (REQ-11) y los ciclos cruzados en backend (REQ-13), la adecuación agrega el evaluador recursivo fiel de la malla (REQ-14, nueva S7) que corrige la evaluación aplanada del árbol Y/O. Las sesiones más riesgosas son **S1** (recableo de código compartido con CurricularSection), **S3** (ciclos cruzados) y **S7** (evaluador fiel + regresión del flujo de alta ya shippeado).

**Como vas a saber que funciona**:

- Abro el Programa de asignatura de EST200 y veo la sección "Requisitos" con su árbol reconstruido (3 niveles, AND raíz con OR y condición suelta) igual que el seed.
- Creo una condición nueva por el modal de 2 pasos, la guardo, cierro y reabro: la veo igual. Si dejo un campo obligatorio vacío, no me deja guardar y me dice por qué.
- Si edito los requisitos de una asignatura usada en 2 planes, veo la alerta con esos 2 planes; si no hay planes, no veo alerta.
- Si intento crear un prerrequisito que formaría un ciclo (A requiere B, B requiere A), el sistema lo rechaza aunque lo haga por la UI nueva (no solo por MCP).
- Sin el permiso de edición, no veo la pestaña ni las acciones de alta/edición/borrado.
- En la malla (plan de estudio), si muevo un curso a un período anterior al de su prerrequisito, la malla lo detecta (hoy solo lo detecta al agregar, no al mover) y muestra el mismo tipo de aviso.
- Guardar un `minToSatisfy`, `creditsRequired`, `value` o `thresholdMinGrade` negativo es rechazado por la API.

---

## Purpose

Entregar el editor visual de requisitos (prerrequisitos/correquisitos) como una sección del Programa de asignatura (patrón curricular-section), con persistencia sobre el objeto `requirement` ya modelado en SP5, y cerrar el circuito con el componente de malla existente (plan de estudio) para que respete y valide esos requisitos al construir la malla. Habilita a los configuradores curriculares a definir las condiciones de la malla sin depender de seeds (Request literal de UPONE-1378), con la validación estructural de ciclos cruzados (CAP-CUR-004) como guardrail de integridad del grafo de prerrequisitos.

## Requirements

### REQ-01: Sección "Requisitos" en el Programa de asignatura

> **Que cambia**: al abrir una asignatura (Activity, recordType Course) aparece una pestaña "Requisitos" con la lista de condiciones ya definidas (o vacía), igual que las demás secciones del programa.
> **Por que**: hoy el árbol solo se puede sembrar por seed; sin esta sección no hay forma de verlo ni de empezar a editarlo.

El sistema MUST mostrar una sección "Requisitos" en la ficha de Activity (recordType Course), consistente con el patrón de secciones polimórficas del programa (curricular-section), que liste las condiciones existentes de `requirement(ownerType=activity, ownerId=<Activity.id>)` o un estado vacío si no hay ninguna.

**Actor**: configurador curricular (admin)
**Layers**: config (layout embebido), frontend (RecordList config-driven)

<details><summary>Scenarios de validacion</summary>

#### Scenario: asignatura con requisitos existentes
- **GIVEN** una Activity con árbol `requirement` sembrado (ej. EST200)
- **WHEN** el configurador abre la ficha y va a la pestaña "Requisitos"
- **THEN** ve la lista de condiciones del árbol (clase/vía/exigencia)

#### Scenario: asignatura sin requisitos
- **GIVEN** una Activity sin ningún `requirement`
- **WHEN** se abre la pestaña "Requisitos"
- **THEN** se muestra el estado vacío ("sin requisitos — matrícula libre")

#### Scenario: sección no visible sin permiso de lectura
- **GIVEN** un usuario sin capability `requirement:view`
- **WHEN** abre la ficha de la Activity
- **THEN** la pestaña "Requisitos" no aparece (ver REQ-06)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre cualquier programa de asignatura y encuentra la pestaña "Requisitos" con sus condiciones o el estado vacío.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | lista con datos | EST200 sembrado | abrir pestaña | condiciones listadas | TC-01 |
| 2 | lista vacía | Activity sin requirement | abrir pestaña | estado vacío | TC-02 |

### REQ-02: Modal de alta en 2 pasos (solo 3 familias con respaldo)

> **Que cambia**: para agregar una condición, el configurador ve un modal de 2 pasos — primero elige el tipo (Curso / Electivo / Métrica) y a qué grupo se agrega, después completa el detalle específico de ese tipo.
> **Por que**: son 3 formas de condición con datos distintos (curso puntual, grupo K-de-N, umbral de créditos); mostrar solo las 3 con respaldo evita prometer familias que el modelo no persiste (gpa/period/competency/program).

El sistema MUST ofrecer un modal de alta en 2 pasos: paso 1 selecciona la clase de condición (Curso → `RecordState`, Electivo → `Group` con `combinator=OR`, Métrica-Créditos → `MetricThreshold`) y el grupo destino; paso 2 completa los campos propios de esa familia (reusando la forma de los layouts RT ya declarados en SP5: `default_rt__<RT>__requirement_create.json`). El sistema MUST NOT ofrecer familias sin respaldo en el modelo (gpa, period, competency, program).

**Actor**: configurador curricular (admin)
**Layers**: frontend (modsComponent nuevo), backend (create sobre RT literal)

<details><summary>Scenarios de validacion</summary>

#### Scenario: alta de un Curso (RecordState)
- **GIVEN** el modal abierto sobre un grupo existente
- **WHEN** se elige "Curso", se completa Activity objetivo + `mustBe` + `timing`, y se confirma
- **THEN** se crea un `rt__RecordState__requirement` como hijo del grupo elegido

#### Scenario: alta de un Electivo (Group OR)
- **GIVEN** el modal abierto
- **WHEN** se elige "Electivo", se define `minToSatisfy`/`creditsRequired` y se confirma
- **THEN** se crea un `rt__Group__requirement` con `combinator=OR`

#### Scenario: familia sin respaldo no se ofrece
- **GIVEN** el paso 1 del modal
- **WHEN** el configurador busca una opción de tipo "gpa" o "period"
- **THEN** no existe esa opción (solo Curso/Electivo/Métrica)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: agrega una condición de cada una de las 3 familias y las ve reflejadas en la lista.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | alta Curso | grupo existente | modal 2 pasos, RecordState | nodo creado | TC-03 |
| 2 | alta Electivo | grupo existente | modal 2 pasos, Group OR | nodo creado | TC-04 |
| 3 | alta Métrica | grupo existente | modal 2 pasos, MetricThreshold | nodo creado | TC-05 |

### REQ-03: Árbol Y/O anidable, editable, persiste y se reconstruye (+ vista "regla unificada")

> **Que cambia**: las condiciones se combinan en un árbol Y/O a cualquier profundidad (no solo 2 niveles), se puede ver como "regla unificada" (el árbol completo, solo lectura), y al reabrir la asignatura el árbol se ve igual que como quedó guardado.
> **Por que**: el seed EST200 ya tiene 3 niveles (AND en la raíz combinando un sub-árbol OR con una condición suelta); una UX de solo 2 niveles no podría representarlo fielmente.

El sistema MUST persistir y reconstruir el árbol `requirement` a cualquier profundidad de anidamiento, reusando `buildRequirementTree.js` (ya existente, SP5) para el ensamblado de lectura. El sistema MUST ofrecer una vista "regla unificada" de solo lectura que renderiza el árbol completo (patrón WAI-ARIA Tree View, RULE-curriculum-design-001/002), reusando las piezas de bajo nivel de `CompositeSectionTree` (`treeOps.ts`, `useTreeKeyboardNav.ts`) — NO extendiendo ese componente directamente (su modal es de 1 paso, sin combinador AND/OR).

El sistema MUST permitir las **operaciones de edición base del árbol (MVP garantizado de este ticket)**: agregar un nodo (REQ-02), editar los campos de un nodo existente, y eliminar un nodo y su subárbol (REQ-12).

El sistema SHOULD permitir además las **operaciones estructurales del árbol** — mover/anidar un grupo dentro de otro y cambiar su combinador AND↔OR — **sujeto a confirmación de alcance con el dev antes de cerrar S5.GATE** (ver Open questions). Estas operaciones estructurales **NO forman parte del MVP garantizado**: si el dev no las confirma en S5, quedan como follow-up y su ausencia NO bloquea el cierre del ticket (el MUST de este REQ lo cubren las operaciones base).

**Actor**: configurador curricular (admin); system (lectura)
**Layers**: frontend (modsComponent nuevo), backend (create/update sobre RT literal — BL-1)

<details><summary>Scenarios de validacion</summary>

#### Scenario: reconstrucción idéntica (EST200)
- **GIVEN** el árbol EST200: `Group[AND]{ Group[OR]{ Group[AND]{MAT110,MAT120}, MAT210 }, MetricThreshold(≥60cr), RecordState(PROG101,soft) }`
- **WHEN** se abre la vista "regla unificada" de esa Activity
- **THEN** se reconstruye la misma jerarquía, combinadores y `isHardRule`

#### Scenario: edición de un nodo existente
- **GIVEN** un `rt__RecordState__requirement` existente
- **WHEN** se edita `thresholdMinGrade` desde la lista
- **THEN** el cambio persiste (requiere BL-1 — update sobre RT ruteado correctamente)

#### Scenario: árbol de 1 sola hoja (edge case)
- **GIVEN** una Activity con un único `RecordState` sin grupo padre
- **WHEN** se abre "regla unificada"
- **THEN** se muestra la condición sola, sin envolver en un grupo artificial

</details>

#### Acceptance
**El usuario puede verificar que funciona**: edita un requisito existente, lo guarda, recarga la página y lo ve igual.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | reconstrucción EST200 | seed EST200 | abrir regla unificada | árbol idéntico | TC-06 |
| 2 | update de nodo (BL-1) | RecordState existente | editar thresholdMinGrade | persiste | TC-07 |
| 3 | árbol de 1 hoja | 1 RecordState sin padre | ver regla unificada | se muestra sin grupo | TC-08 |

### REQ-04: Validación de condición incompleta

> **Que cambia**: si al modal le falta un campo obligatorio, no se puede guardar y el mensaje dice exactamente qué falta.
> **Por que**: guardar una condición a medias deja el árbol en un estado ambiguo (¿qué exige realmente?).

El sistema MUST rechazar el guardado de una condición incompleta (campos requeridos del RT elegido sin completar) y mostrar un mensaje claro indicando el campo faltante, tanto en la creación como en la edición.

**Actor**: configurador curricular (admin)
**Layers**: frontend (validación de formulario), backend (rechazo por `required[]` del RT — enforcement ya existente, SP5)

<details><summary>Scenarios de validacion</summary>

#### Scenario: falta campo requerido
- **GIVEN** el modal en paso 2 de un Curso
- **WHEN** se intenta confirmar sin elegir la Activity objetivo
- **THEN** se bloquea el guardado con mensaje "selecciona la asignatura"

#### Scenario: condición completa se guarda
- **GIVEN** todos los campos requeridos completos
- **WHEN** se confirma
- **THEN** se guarda sin error

#### Scenario: incompleta en nodo intermedio (Group)
- **GIVEN** un `Group` sin `combinator`
- **WHEN** se intenta guardar
- **THEN** se rechaza (combinator es requerido)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intenta guardar una condición vacía y recibe un mensaje claro antes de que se persista nada.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | falta campo hoja | modal Curso | confirmar sin Activity | bloqueado | TC-09 |
| 2 | falta campo grupo | modal Group | confirmar sin combinator | bloqueado | TC-10 |

### REQ-05: Alerta de planes afectados

> **Que cambia**: al guardar un cambio en los requisitos de una asignatura que ya está en varios planes, se avisa cuáles planes se ven afectados.
> **Por que**: es el frente visual del guard que ya existe (MC-09) — sin esta alerta, el usuario solo se entera del bloqueo cuando el guard rechaza el request.

El sistema MUST mostrar una alerta con la lista de planes afectados al guardar un requisito de una Activity referenciada por `planEntry` de uno o más `Curriculum`. El sistema MUST NOT mostrar alerta si la Activity no está en ningún plan. La alerta es de solo lectura (no modifica datos) y reusa la misma query que `requirementActivityGuard.js` (`planEntry.activityId` → `Curriculum.status`).

**Actor**: configurador curricular (admin)
**Layers**: frontend (Alert atom), backend (query compartida con el guard existente)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Activity en varios planes
- **GIVEN** una Activity referenciada por `planEntry` de 2 currículos
- **WHEN** se guarda un cambio en sus requisitos
- **THEN** se muestra la alerta listando ambos planes

#### Scenario: Activity sin planes
- **GIVEN** una Activity sin ningún `planEntry`
- **WHEN** se guarda un requisito
- **THEN** no se muestra alerta

#### Scenario: plan Active bloquea (MC-09)
- **GIVEN** una Activity en un plan `Active`
- **WHEN** se intenta guardar
- **THEN** el guard existente rechaza (mensaje "versiona el programa") y la UI lo muestra como error, no como alerta informativa

</details>

#### Acceptance
**El usuario puede verificar que funciona**: al editar los requisitos de una asignatura de varios planes, ve de inmediato cuáles planes se afectan.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | varios planes | 2 planEntry | guardar | alerta con 2 planes | TC-11 |
| 2 | sin planes | 0 planEntry | guardar | sin alerta | TC-12 |

### REQ-06: RBAC wiring

> **Que cambia**: sin el permiso correspondiente, la pestaña "Requisitos" y sus acciones de alta/edición/borrado no aparecen.
> **Por que**: la capability ya existe (SP5); falta conectarla al FE nuevo.

El sistema MUST gatear la visibilidad de la pestaña y sus acciones con las capabilities ya declaradas `requirement:view` (lectura) y `requirement:create`/`modify`/`delete` (mutación), sin crear capabilities nuevas.

**Actor**: system (RBAC)
**Layers**: frontend (gating de UI)

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin capability de mutación
- **GIVEN** un usuario con `requirement:view` pero sin `requirement:create/modify/delete`
- **WHEN** abre la pestaña
- **THEN** ve la lista en solo lectura, sin botones de alta/edición/borrado

#### Scenario: sin capability de lectura
- **GIVEN** un usuario sin `requirement:view`
- **WHEN** abre la ficha de la Activity
- **THEN** la pestaña no aparece

</details>

#### Acceptance
**El usuario puede verificar que funciona**: un rol sin permiso de edición ve la lista pero no los botones de alta/edición/borrado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | solo lectura | capability view only | abrir pestaña | sin acciones de mutación | TC-13 |

### REQ-07: Sin motor de evaluación (fuera de alcance)

El sistema MUST NOT implementar el motor que evalúa el avance del estudiante contra el árbol de requisitos (degree-audit). Documentado como fuera de alcance.

### REQ-09: No-negativos en los campos numéricos que este ticket crea/edita

> **Que cambia**: los campos numéricos que el editor de requisitos escribe (`minToSatisfy`, `creditsRequired`, `value`, `thresholdMinGrade`) no aceptan valores negativos, desde su definición.
> **Por que**: son los campos que el propio editor de este ticket produce; no tiene sentido que acepten negativos.

El sistema MUST declarar `"minimum": 0` en los 4 campos numéricos de los RT de `requirement` (`rt__Group__requirement.minToSatisfy`, `rt__Group__requirement.creditsRequired`, `rt__MetricThreshold__requirement.value`, `rt__RecordState__requirement.thresholdMinGrade`), reusando el enforcement ya existente en core (`jsonFieldValidator.resolver.js:294`, `validateBaseFieldFormats`) que lee `minimum`/`maximum` desde `core_FieldDefinition.properties`. Trabajo puramente declarativo (JSON del mod + `codegen` + `sync`), sin migración de columna.

**Actor**: system (validación API)
**Layers**: schema (objects/RecordTypes del mod)

<details><summary>Scenarios de validacion</summary>

#### Scenario: valor negativo rechazado
- **GIVEN** un create/update de `rt__Group__requirement`
- **WHEN** `minToSatisfy = -1`
- **THEN** la API lo rechaza

#### Scenario: valor cero aceptado
- **GIVEN** un create de `rt__MetricThreshold__requirement`
- **WHEN** `value = 0`
- **THEN** se acepta (0 no es negativo)

#### Scenario: campo no tocado por este ticket permanece sin el guard
- **GIVEN** `Activity.credits` (fuera del scope de P1)
- **WHEN** se crea con valor negativo
- **THEN** no se rechaza aquí (movido a TICKET-105)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intentar guardar cualquiera de los 4 campos con un negativo es rechazado por la API.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | minToSatisfy negativo | rt__Group | crear con -1 | rechazado | TC-14 |
| 2 | value = 0 | rt__MetricThreshold | crear con 0 | aceptado | TC-15 |

### REQ-11: Requisitos respetados por la malla (extensión del componente existente)

> **Que cambia**: cuando alguien ubica un curso en la malla (plan de estudio) y su prerrequisito no está ubicado en un período anterior, la malla lo detecta — no solo al agregar (como hoy), también al mover una entrada de período, y con un aviso visible al abrir la malla si ya hay violaciones existentes.
> **Por que**: hoy la contraparte de generación de requisitos (este ticket) no existía; la malla ya sabía detectar esto al agregar, pero le falta cubrir el resto de las formas en que la malla cambia.

El sistema MUST extender la detección de prerrequisitos del componente de malla (`CurriculumMeshElement.vue` → `checkPrereqsForBatch`/`PrereqBlockModal`, hoy disparada solo al agregar una entrada) para que también corra al **mover** una entrada a otro período, **consumiendo el evaluador fiel de REQ-14** (no la evaluación aplanada actual). El sistema MUST mostrar un **banner informativo** (no bloqueante) al abrir la malla cuando existan entradas ya ubicadas que violen su árbol de requisitos, evaluando **cada entrada colocada contra su propio período** (no un período único de lote). El sistema MUST NOT visualizar la malla desde el Programa de asignatura (correction del dev, 2026-07-24) — el consumo es exclusivamente dentro de plan de estudio.

**Actor**: configurador curricular (admin, en plan de estudio); system (lectura)
**Layers**: frontend (`modsComponents/CurriculumMesh`), backend (lectura de `requirement`, ya existente)

<details><summary>Scenarios de validacion</summary>

#### Scenario: mover una entrada rompe un prerrequisito
- **GIVEN** un curso B con `RecordState(A, Before)` y A ubicado en el período 2
- **WHEN** se mueve B del período 3 al período 1 (antes que A)
- **THEN** la malla detecta la violación (hoy esto NO corre — solo corre al agregar)

#### Scenario: banner de violaciones existentes
- **GIVEN** una malla con una entrada ya ubicada que viola un prerrequisito (ej. tras editar el requisito en la asignatura después de haber armado la malla)
- **WHEN** se abre la malla
- **THEN** se muestra un banner señalando la(s) entrada(s) afectada(s), sin bloquear la vista

#### Scenario: round-trip completo
- **GIVEN** un requisito `Before` recién creado en la asignatura (por el editor de este ticket)
- **WHEN** se abre una malla que ya tiene ambos cursos ubicados en el orden incorrecto
- **THEN** el banner lo refleja sin necesidad de tocar la malla

</details>

#### Acceptance
**El usuario puede verificar que funciona**: mueve un curso a un período anterior al de su prerrequisito y la malla lo señala, igual que ya lo hace al agregarlo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | violación al mover | B before A, A período 2 | mover B a período 1 | detectado | TC-16 |
| 2 | banner de violaciones | malla con violación existente | abrir malla | banner visible | TC-17 |
| 3 | round-trip | requisito nuevo en asignatura | abrir malla ya armada en orden incorrecto | banner refleja el nuevo requisito | TC-18 |

### REQ-12: Eliminación de nodos con guard de plan Active

> **Que cambia**: se puede eliminar una condición del árbol, pero no si la asignatura dueña está en un plan publicado (mismo criterio que ya aplica a crear/editar, MC-09).
> **Por que**: sin este guard, borrar quedaría inconsistente con create/update — se podría invalidar una malla vigente borrando en vez de editando.

El sistema MUST rechazar el borrado de un `requirement` cuando la Activity dueña (`ownerType=activity`) esté referenciada por al menos un `planEntry` de un `Curriculum status=Active`, reusando `requirementActivityGuard.js` (nueva función `assertActivityNotInActivePlanOnDelete`, misma lógica de resolución de owner que `assertActivityNotInActivePlanOnUpdate`). El guard se cablea en el único override de `deleteInstance` del mod (`requirementCategoryDelete.resolver.js`, CONSTRAINT H7) — NO se crea un archivo nuevo.

**Actor**: configurador curricular (admin)
**Layers**: backend (guard de dominio)

<details><summary>Scenarios de validacion</summary>

#### Scenario: borrado bloqueado en plan Active
- **GIVEN** un `requirement(ownerType=activity)` cuya Activity está en un plan `Active`
- **WHEN** se intenta borrar
- **THEN** se rechaza con mensaje accionable (versionar el programa)

#### Scenario: borrado permitido en plan Draft
- **GIVEN** la Activity solo está en planes `Draft` o sin planes
- **WHEN** se borra el nodo
- **THEN** se permite, y sus hijos (subárbol) también se eliminan

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intenta borrar un requisito de una asignatura en un plan publicado y es rechazado; en un plan Draft se borra sin problema.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | delete bloqueado | Activity en plan Active | borrar nodo | rechazado | TC-19 |
| 2 | delete permitido | Activity en Draft/sin plan | borrar nodo | permitido | TC-20 |

### REQ-13: Validación de ciclos cruzados en el grafo de prerrequisitos (CAP-CUR-004)

> **Que cambia**: no se puede crear/editar un `RecordState` que forme un ciclo de prerrequisitos entre asignaturas distintas (A requiere B, B requiere A — directo o a través de una cadena más larga).
> **Por que**: un ciclo de prerrequisitos deja la malla en un estado imposible de satisfacer; es una regla Must de la plataforma (CAP-CUR-004) que hoy solo se valida en `up1-mcp`, no en el camino que usa la Suite.

El sistema MUST rechazar el create/update de un `rt__RecordState__requirement` que formaría un ciclo — directo (A↔B) o transitivo (A→B→C→A) — en el grafo de prerrequisitos entre Activities, recorriendo el grafo con un guard de profundidad (mismo límite que `up1-mcp` usa hoy, `MAX_GRAPH_NODES`). Esta validación es **estructural** (integridad del grafo), distinta del motor de evaluación de avance (REQ-07, fuera de alcance).

**Actor**: system (validación de dominio)
**Layers**: backend (helper puro + wiring en `sectionValidation.resolver.js`/`polymorphicUpdate.resolver.js`)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ciclo directo
- **GIVEN** A tiene `RecordState(B)` como prerrequisito
- **WHEN** se intenta crear `RecordState(A)` como prerrequisito de B
- **THEN** se rechaza (ciclo directo)

#### Scenario: ciclo transitivo
- **GIVEN** A requiere B, B requiere C
- **WHEN** se intenta crear C requiere A
- **THEN** se rechaza (ciclo transitivo A→B→C→A)

#### Scenario: cadena larga sin ciclo (edge case, guard de profundidad)
- **GIVEN** una cadena de prerrequisitos válida de N asignaturas sin ciclo
- **WHEN** se agrega una más al final
- **THEN** se acepta si N está dentro del límite de profundidad; el guard no genera falsos positivos por cadenas largas legítimas

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intenta crear un prerrequisito que cerraría un ciclo (directo o de varios pasos) por la UI nueva y es rechazado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | ciclo directo | A→B | crear B→A | rechazado | TC-21 |
| 2 | ciclo transitivo | A→B→C | crear C→A | rechazado | TC-22 |
| 3 | cadena larga válida | cadena N sin ciclo | agregar 1 más | aceptado | TC-23 |

### REQ-14: Evaluación fiel del árbol Y/O en la malla (reemplaza la evaluación aplanada)

> **Que cambia**: la malla deja de aplanar el árbol de requisitos y pasa a evaluarlo respetando su estructura real — `AND`/`OR`/K-de-N, anidamiento a cualquier profundidad, reglas advisory, negación, **la semántica de `timing` (prerrequisito vs correquisito)** y **el umbral de créditos (`MetricThreshold`)**.
> **Por que**: la evaluación actual (`findMissingPrereqs`) trata la lista de nodos como un AND global y cada `Group` solo mira sus hijos `RecordState` directos. Eso convierte un `OR` en `AND`, ignora `isHardRule`/`negate`/`timing` y colapsa los subgrupos anidados: con el árbol EST200 exige "MAT210 y MAT110 y MAT120 y PROG101(advisory)" cuando el modelo dice "MAT210 O (MAT110 y MAT120)". REQ-11 propagaría ese error al mover y a un banner permanente, así que hay que corregir el motor antes de extender su superficie.
> **Correquisitos y créditos son parte del request** (no solo de la maqueta): el Request literal pide "prerrequisitos **y correquisitos**" y CAP-CUR-004 (Must) exige ambos "validables al momento de la inscripción". La maqueta (`mockup-sp6.html` `mVPrereq`) ya evalúa el correquisito con la regla "mismo período permitido". Por eso el evaluador fiel MUST honrar `timing` y el `MetricThreshold(Credits)`, no dejarlos neutros.

El sistema MUST evaluar el árbol `requirement` de una asignatura de forma **recursiva y fiel a su estructura**, reusando el ensamblado de árbol ya existente (`buildTree.ts`/`buildRequirementTree.js`) para NO aplanar, con estas reglas por nodo:

- `Group`: satisfecho cuando se cumplen sus umbrales **presentes** — `minToSatisfy` (conteo de hijos satisfechos ≥ K) y/o `creditsRequired` (suma de créditos de los hijos satisfechos ≥ umbral, usando `MeshEntry.credits` — el dato de créditos efectivos ya disponible en la malla). Si ambos son null, se exigen **todos** los hijos (`AND`). `combinator=OR` sin `minToSatisfy` equivale a K=1.
- `RecordState` (hoja): satisfecho según su `timing`, comparando el período del `targetId` colocado contra el período de la entrada dueña (`ownerPeriod`) — alineado con la maqueta (`mVPrereq`):
  - `Before` (prerrequisito, default cuando `timing` es null): satisfecho sii el target está colocado en un período **estrictamente anterior** (`targetPeriod < ownerPeriod`).
  - `Concurrent` (correquisito): satisfecho sii el target está colocado en el **mismo período o antes** (`targetPeriod ≤ ownerPeriod`) — "mismo período permitido"; viola solo si queda en un período **posterior**.
  - `Either` (prerrequisito o correquisito): satisfecho sii `targetPeriod ≤ ownerPeriod` (mismo criterio permisivo que `Concurrent`).
  - En las tres, si el target **no está en la malla**, el nodo no está satisfecho (violación/aviso, como hoy).
- `isHardRule=false` (advisory): NO bloquea ni cuenta como violación (a lo sumo informativo).
- `negate=true`: invierte la satisfacción del nodo.
- `MetricThreshold` (**Credits**, única métrica con respaldo — decisión #4): **evaluado**. Satisfecho sii el agregado de `MeshEntry.credits` sobre su `scope` — `plan` (todas las entradas de la malla) o `category` (entradas de la misma categoría) — en períodos **estrictamente anteriores** a `ownerPeriod` cumple `operator value` (típicamente `≥ value`). Reusa el mismo dato (`MeshEntry.credits`) que `creditsRequired` group-local; el barrido es O(entradas) por nodo, sin scan cuadrático. `GPA`/`PeriodIndex` no están modelados (enums cerrados a `Credits`, decisión #4) → no aplican.

El evaluador recursivo MUST reemplazar al aplanado (`findMissingPrereqs`/`findMissingPrereqsForBatch`) para **las tres superficies** que hoy lo consumen: alta (`onAddEntryConfirm`), mover (REQ-11) y banner (REQ-11). El sistema MUST NOT introducir regresión en el flujo de alta ya shippeado (SP5).

**Actor**: system (validación estructural de la malla)
**Layers**: frontend (`modsComponents/CurriculumMesh` — lógica pura en `.ts`)

<details><summary>Scenarios de validacion</summary>

#### Scenario: OR satisfecho por una sola rama
- **GIVEN** `OR{ AND{MAT110, MAT120}, MAT210 }` y solo MAT210 colocado antes
- **WHEN** se evalúa el árbol
- **THEN** el `OR` está satisfecho (no exige la rama `AND{MAT110,MAT120}`)

#### Scenario: anidamiento profundo (EST200)
- **GIVEN** el árbol EST200 completo con MAT210 colocado antes y PROG101 (advisory) sin colocar
- **WHEN** se evalúa
- **THEN** el árbol está satisfecho: el `OR` lo satisface MAT210, y PROG101 no bloquea por ser advisory

#### Scenario: K-de-N por conteo y por créditos
- **GIVEN** un `Group` con `minToSatisfy=2` o `creditsRequired=24`
- **WHEN** hay menos de 2 miembros (o menos de 24 créditos) colocados antes
- **THEN** el grupo no está satisfecho y reporta cuánto falta

#### Scenario: negate
- **GIVEN** un `RecordState` con `negate=true` cuyo target está colocado antes
- **WHEN** se evalúa
- **THEN** el nodo se considera NO satisfecho (condición invertida)

#### Scenario: correquisito satisfecho en el mismo período
- **GIVEN** un `RecordState` con `timing=Concurrent` cuyo target está colocado en el **mismo período** que la entrada dueña
- **WHEN** se evalúa
- **THEN** el nodo está satisfecho (mismo período permitido para correquisito)

#### Scenario: correquisito violado en período posterior
- **GIVEN** un `RecordState` con `timing=Concurrent` cuyo target está colocado en un período **posterior**
- **WHEN** se evalúa
- **THEN** el nodo NO está satisfecho (viola)

#### Scenario: MetricThreshold de créditos (scope plan)
- **GIVEN** un `MetricThreshold(Credits, scope=plan, operator=≥, value=60)` y 48 créditos acumulados en períodos anteriores
- **WHEN** se evalúa
- **THEN** el nodo NO está satisfecho (48 < 60); con 60+ créditos antes, satisfecho

</details>

#### Acceptance
**El usuario puede verificar que funciona**: arma una malla que satisface un requisito por la rama alternativa de un `OR` y la malla NO la marca como violación; agrega un curso cuyo `OR` no está cubierto por ninguna rama y sí la marca.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | AND incompleto | AND{A,B}, solo A antes | evaluar | viola | TC-24 |
| 2 | OR una rama | OR{A,B}, solo B antes | evaluar | satisfecho | TC-25 |
| 3 | K-de-N conteo | minToSatisfy=2, 1 antes | evaluar | viola | TC-26 |
| 4 | anidado EST200 | OR{AND{MAT110,MAT120}, MAT210}, solo MAT210 | evaluar | satisfecho | TC-27 |
| 5 | advisory no bloquea | RecordState isHardRule=false sin colocar | evaluar | no viola | TC-28 |
| 6 | negate invierte | RecordState negate=true, target antes | evaluar | viola | TC-29 |
| 7 | créditos K-de-N (Group) | creditsRequired=24, 18 créditos antes | evaluar | viola | TC-30 |
| 8 | correquisito mismo período | timing=Concurrent, target mismo período | evaluar | satisfecho | TC-31 |
| 9 | correquisito posterior | timing=Concurrent, target período posterior | evaluar | viola | TC-32 |
| 10 | MetricThreshold créditos | Credits scope=plan ≥60, 48 cr antes | evaluar | viola (con 60+ satisfecho) | TC-33 |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Guard de ciclos cruzados (REQ-13) no degrada el create/update | queries + profundidad de BFS | short-circuit si `RecordState`; guard de profundidad igual al de `up1-mcp` (`MAX_GRAPH_NODES=500`) |
| Performance | Evaluador recursivo (REQ-14) no degrada el alta ni el open-mesh | complejidad | un recorrido O(nodos) por árbol; el banner evalúa cada entrada colocada contra su propio período, sin scan cuadrático. El agregado de créditos de `MetricThreshold`/`creditsRequired` se calcula con sumas de crédito por período (prefix-sum precomputado una vez al abrir la malla), no re-sumando entradas por nodo → mantiene O(nodos) por árbol |
| A11y | Vista "regla unificada" (árbol) y modal cumplen WAI-ARIA APG | patrón | Tree View (role=tree/treeitem/group, roving tabindex) + Dialog (focus trap, Escape) — RULE-curriculum-design-001/002 |
| Security | Mutación y visibilidad gateadas por capability existente | mecanismo | `requirement:view/create/modify/delete` (RBAC ya declarado, REQ-06) |

## Artifacts

### Objects / RecordTypes (modificación declarativa — sin objeto nuevo)

| Objeto | Campo | Cambio | source_ref |
|--------|-------|--------|------------|
| `rt__Group__requirement` | `minToSatisfy`, `creditsRequired` | agregar `"minimum": 0` | REQ-09 |
| `rt__MetricThreshold__requirement` | `value` | agregar `"minimum": 0` | REQ-09 |
| `rt__RecordState__requirement` | `thresholdMinGrade` | agregar `"minimum": 0` | REQ-09 |

### Layouts (config)

| File | Cambio | source_ref |
|------|--------|------------|
| `config/layouts/default_requirement_list.json` (nuevo) | Layout `RecordList`, `applicationId: null`, embebido como tab de la sección Requisitos bajo Activity (recordType Course) — sin `showInNav` (no va al menú general, igual que las demás secciones curriculares) | REQ-01 |

### Componentes Vue nuevos (`mods/curriculum-design/modsComponents/`)

| Componente | Rol | Reusa (bajo nivel) | source_ref |
|------------|-----|---------------------|------------|
| `RequirementAddModal` | Modal de alta 2 pasos (clase+vía+exigencia → detalle por familia) | Layouts RT ya declarados (`default_rt__<RT>__requirement_create.json`); patrón de modales caseros (RULE-curriculum-design-014, Modal atom, no ModalStackManager) | REQ-02 |
| `ReglaUnificadaView` | Vista read-only del árbol Y/O completo | `buildRequirementTree.js` (ensamblado), `treeOps.ts`/`useTreeKeyboardNav.ts` de `CompositeSectionTree` (patrón WAI-ARIA tree) | REQ-03 |

### Resolvers / helpers (backend)

| File | Cambio | source_ref |
|------|--------|------------|
| `logic/polymorphicUpdate.resolver.js` (modifica, línea ~199) | `RT_PATTERN` → `/^rt__([a-zA-Z0-9_]+)__(curricularsection\|requirement)$/`; recablear `assertActivityNotInActivePlanOnUpdate` dentro de `rtUpdateHandler` para que `requirement` no pierda el guard MC-09 al migrar de rama | BL-1 |
| `logic/helpers/requirementActivityGuard.js` (modifica) | nueva función `assertActivityNotInActivePlanOnDelete({ prisma, objectType, id })`, reusa `assertActivityNotInActivePlan` | REQ-12 |
| `logic/requirementCategoryDelete.resolver.js` (modifica) | agregar branch `objectType === 'requirement'` → `assertActivityNotInActivePlanOnDelete` | REQ-12 |
| `logic/helpers/requirementCycleGuard.js` (nuevo) | helper puro `assertNoRequirementCycle({ prisma, targetId, prerequisiteId })` — BFS transitivo sobre `RecordState.targetId`, guard de profundidad, portado del diseño ya probado en `up1-mcp` (`wouldFormRequirementCycle`) | REQ-13 |
| `logic/sectionValidation.resolver.js` (modifica) | wire `assertNoRequirementCycle` en el create de `rt__RecordState__requirement` | REQ-13 |
| `logic/polymorphicUpdate.resolver.js` (modifica) | wire `assertNoRequirementCycle` en el update de `rt__RecordState__requirement` (dentro de `rtUpdateHandler`, junto al recableo de BL-1) | REQ-13 |

### MCP (`up1-mcp`, repo standalone)

| File | Cambio | source_ref |
|------|--------|------------|
| `src/mods/curriculum-design/requirement-write.ts` | `cd_manage_requirement`: agregar `action: "update"` (depende solo de BL-1) y `action: "delete"` (depende de BL-1 + REQ-12), patrón de `sections-write.ts` (update/delete ya existentes ahí) | BL-1, REQ-12 |
| `src/mods/curriculum-design/mesh-read.ts` | `cd_get_prereqs`: verificar que refleja el árbol editable tras BL-1 (sin cambio de código esperado — solo verificación) | REQ-03 |

### Componente de malla (extensión, `modsComponents/CurriculumMesh/`)

| File | Cambio | source_ref |
|------|--------|------------|
| `evaluateRequirementTree.logic.ts` (nuevo) | evaluador recursivo puro del árbol: `combinator` AND/OR/K-de-N, anidamiento, `isHardRule` (advisory no bloquea), `negate`, `creditsRequired` (suma de `MeshEntry.credits`), hoja `RecordState` por `timing` (Before=antes estricto, Concurrent/Either=mismo período o antes — correquisito), `MetricThreshold(Credits)` por agregado de créditos por scope plan/category. Reemplaza la lógica de `findMissingPrereqs` | REQ-14 |
| `usePrereqRequirements.ts` (modifica) | el VM deja de aplanar: preservar la estructura de árbol (ensamblar con `buildTree.ts`) para alimentar el evaluador; hoy solo devuelve nodos planos | REQ-14 |
| `prereqCheck.logic.ts` (modifica) | recablear `findMissingPrereqs`/`findMissingPrereqsForBatch` para delegar en el evaluador recursivo (o reemplazarlos), preservando el contrato de salida (`MissingPrereqItem[]`) que consume `PrereqBlockModal` | REQ-14 |
| `CurriculumMeshElement.vue` (modifica) | invocar el check (ya sobre el evaluador fiel) en el handler de mover una entrada (hoy solo en `checkPrereqsForBatch` al agregar, línea ~1439); agregar el banner mesh-wide al montar/cargar la malla, evaluando cada entrada contra su propio período | REQ-11 |

### i18n (lang)

| File | Contenido |
|------|-----------|
| `lang/es_CL@requirement.json` (existente, ampliar si faltan keys de los nuevos componentes) | labels del modal 2 pasos, regla unificada, banner de malla |
| `lang/es_CL@<CurriculumMesh keys>` | texto del banner de violación de prerrequisito (REQ-11) |

## Tasks

> **Paralelización (HOR-024)**: NO se declaran `parallel_groups` en ninguna session. El ticket declara explícitamente "1 dev, ejecución en serie" (Gate de inicio), y las tasks de cada session tienen dependencias duras entre sí (BL-1 → guards → ciclos → editor FE → malla) o tocan los mismos archivos compartidos en secuencia (`polymorphicUpdate.resolver.js` se edita en S1 y de nuevo en S3). Ver registro `parallelization-assessment: not-applicable`.

### Session 1 — Habilitador BE (BL-1): verificación runtime + update ruteado + recableo de guard [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Verificación runtime (servidor corriendo, AQ-1): (a) confirmar empíricamente que el create de las 3 familias RT vía GraphQL/MCP YA persiste bien los campos RT-específicos (hallazgo de investigación estática 2026-07-24: `requirement-write.ts` ya usa `typedRequirementName` en create — verificar en runtime, no solo por lectura de código); (b) reproducir el fallo de UPDATE (RT_PATTERN no matchea `requirement`) para confirmar la línea base antes del fix | BL-1 | developer | — | (sin cambio de archivo — verificación) | server corriendo + create/update manual vía MCP o GraphQL playground, evidencia documentada en el ticket | (no aplica — solo verificación) | DET-1, DET-33 | pending | 1 |
| S1.T2 | Extender `RT_PATTERN` de `logic/polymorphicUpdate.resolver.js:199` (hoy matchea solo `curricularsection`) para que tambien matchee `requirement` | BL-1 | developer | S1.T1 | `logic/polymorphicUpdate.resolver.js` | update de un `rt__RecordState__requirement` existente persiste (TC-07) | git revert | DET-5, DET-8, DET-11 | pending | 1 |
| S1.T3 | Recablear `assertActivityNotInActivePlanOnUpdate` (MC-09) dentro de `rtUpdateHandler` para que `requirement` no pierda el guard al migrar de la rama no-rt a la rama rt__ | BL-1 | developer | S1.T2 | `logic/polymorphicUpdate.resolver.js` | test nuevo: update de RecordState sobre Activity en plan Active sigue rechazando | git revert | DET-5, DET-8, DET-16 | pending | 1 |
| S1.T4 | Regresión completa de CurricularSection: correr `tests/unit/polymorphicUpdate.test.js` (7 subtipos ya cubiertos) + agregar test de `requirement` al mismo archivo | BL-1 | developer | S1.T2, S1.T3 | `tests/unit/polymorphicUpdate.test.js` | `vitest run` del mod verde (0 regresiones en CurricularSection) | git revert | DET-7, DET-13 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3, ⚑ fuerte)** — persistir en `## Sessions` (Template de Gate), quality review (reviewer aislado, DET-30/35), regresión completa, consolidar evidencia de S1.T1 (corrección de la premisa BL-1) + TC-07, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decisión + TCs con evidencia | (no aplica) | DET-13, DET-20, DET-23, DET-30, DET-35 | pending | 1 |

### Session 2 — Guard de delete + MCP write actions [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Nueva función `assertActivityNotInActivePlanOnDelete({ prisma, objectType, id })` en `requirementActivityGuard.js`, reusando `assertActivityNotInActivePlan` (resolución de owner por id, mismo patrón que `assertActivityNotInActivePlanOnUpdate`) | REQ-12 | developer | S1.GATE | `logic/helpers/requirementActivityGuard.js` | unit test TC-19/TC-20 | git revert | DET-1, DET-2, DET-8, DET-11 | pending | 2 |
| S2.T2 | Wire del guard en `requirementCategoryDelete.resolver.js`: branch nuevo `objectType === 'requirement'` → `assertActivityNotInActivePlanOnDelete` (CONSTRAINT H7: único archivo de `deleteInstance`, no crear uno nuevo) | REQ-12 | developer | S2.T1 | `logic/requirementCategoryDelete.resolver.js` | TC-19 (rechazo en plan Active), TC-20 (permitido en Draft) — vitest | git revert | DET-5, DET-10, DET-16 | pending | 2 |
| S2.T3 | `cd_manage_requirement` (up1-mcp): agregar `action: "update"` (patrón `sections-write.ts`) | BL-1 | developer | S1.GATE | `up1-mcp/src/mods/curriculum-design/requirement-write.ts` | test del MCP (update de un RT existente vía la tool) | git revert (repo up1-mcp) | DET-5, DET-8, DET-11 | pending | 2 |
| S2.T4 | `cd_manage_requirement`: agregar `action: "delete"` (depende del guard de S2.T1/T2); verificar `cd_get_prereqs` refleja el árbol editable | REQ-12 | developer | S2.T2, S2.T3 | `up1-mcp/src/mods/curriculum-design/requirement-write.ts`, `mesh-read.ts` | test del MCP (delete respeta el guard de plan Active) | git revert (repo up1-mcp) | DET-5, DET-8, DET-11 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, quality review aislado (DET-30/35), validación T2, consolidar TC-19/20 + verificación MCP, decidir continue/iterate/escalate/standby | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + decisión + TCs con evidencia | (no aplica) | DET-20, DET-23, DET-30, DET-35 | pending | 2 |

### Session 3 — Validación de ciclos cruzados en backend (CAP-CUR-004, REQ-13) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Helper puro `logic/helpers/requirementCycleGuard.js` (`assertNoRequirementCycle`): BFS transitivo sobre `RecordState.targetId` entre Activities, guard de profundidad (mismo límite que `up1-mcp: wouldFormRequirementCycle`, `MAX_GRAPH_NODES`), portando el diseño ya probado ahí (no reinventar el algoritmo) | REQ-13 | developer | S1.GATE | `logic/helpers/requirementCycleGuard.js` | unit tests TC-21 (directo), TC-22 (transitivo), TC-23 (cadena larga válida) | git revert | DET-1, DET-2, DET-8, DET-11 | pending | 3 |
| S3.T2 | Wire en `sectionValidation.resolver.js` (create de `rt__RecordState__requirement`, despacho por objectType, no-op fuera de scope) | REQ-13 | developer | S3.T1 | `logic/sectionValidation.resolver.js` | TC-21/22 vía create | git revert | DET-5, DET-10, DET-16 | pending | 3 |
| S3.T3 | Wire en `polymorphicUpdate.resolver.js` (update de `rt__RecordState__requirement`, dentro de `rtUpdateHandler` — mismo punto donde se recableó el guard de S1.T3) | REQ-13 | developer | S3.T1, S1.T3 | `logic/polymorphicUpdate.resolver.js` | TC-21/22 vía update | git revert | DET-5, DET-10, DET-16 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3, ⚑ fuerte)** — persistir, quality review aislado (DET-30/35), regresión completa (S1+S2+S3), consolidar TC-21/22/23, decidir continue/iterate/escalate/standby | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + regresión + decisión | (no aplica) | DET-13, DET-16, DET-20, DET-23, DET-30, DET-35 | pending | 3 |

### Session 4 — Editor FE: sección "Requisitos" + lista + vista "regla unificada" [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Layout `config/layouts/default_requirement_list.json` (RecordList embebido bajo la sección Requisitos de Activity, columnas Clase/Requisito/Condición/Vía/Exigencia mapeadas a campos derivados del árbol) | REQ-01 | developer | S1.GATE | `config/layouts/default_requirement_list.json` | render en suite (smoke), TC-01/TC-02 | git revert | DET-8, DET-16 | pending | 4 |
| S4.T2 | Componente `ReglaUnificadaView` (read-only), reusando `buildRequirementTree.js` (ensamblado) y `treeOps.ts`/`useTreeKeyboardNav.ts` de `CompositeSectionTree` (patrón WAI-ARIA tree, RULE-curriculum-design-001/002) | REQ-03 | developer | S4.T1 | `modsComponents/ReglaUnificadaView/*.vue, *.ts, *.spec.ts, *.stories.ts` | TC-06 (reconstrucción EST200), TC-08 (árbol 1 hoja), unit test aria-attrs | git revert | DET-5, DET-8, RULE-curriculum-design-001, RULE-curriculum-design-002 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** — persistir, quality review (DET-23), consolidar TC-01/02/06/08, decidir continue/iterate/escalate/standby | — | reviewer | S4.T1, S4.T2 | ticket | gate persistido + decisión + TCs con evidencia | (no aplica) | DET-20, DET-23 | pending | 4 |

### Session 5 — Modal de alta 2 pasos + validación de incompleta + operaciones de edición [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Componente `RequirementAddModal` paso 1 (clase Curso/Electivo/Métrica + grupo destino) — patrón modales caseros RULE-curriculum-design-014 (Modal atom, no ModalStackManager) | REQ-02 | developer | S4.GATE | `modsComponents/RequirementAddModal/*.vue, *.ts, *.spec.ts, *.stories.ts` | TC-03, TC-04, TC-05 | git revert | DET-5, DET-8, RULE-curriculum-design-014 | pending | 5 |
| S5.T2 | Paso 2: detalle por familia reusando la forma de los layouts RT ya declarados (`default_rt__<RT>__requirement_create.json`) + persistencia sobre RT literal (BL-1) | REQ-02 | developer | S5.T1 | `modsComponents/RequirementAddModal/*` | TC-03/04/05 (create real) | git revert | DET-5, DET-8, DET-11 | pending | 5 |
| S5.T3 | Validación de condición incompleta (frontend, campos requeridos del RT elegido) + verificación de que el backend rechaza igual (`required[]` ya enforced, SP5) | REQ-04 | developer | S5.T2 | `modsComponents/RequirementAddModal/*` | TC-09, TC-10 | git revert | DET-7, DET-8 | pending | 5 |
| S5.T4 | Operaciones de edición (modelo de VÍAS, dev confirmó IN 2026-07-28): eliminar condición (wired al guard S2), editar campos de hoja, mover condición entre vías, **"+ Nueva vía (O)"** (autoría de rama OR) y K-de-N. NO DnD de árbol crudo — se maneja por el selector de vía del alta + acciones por fila | REQ-03, REQ-12 | developer | S5.T3 | `modsComponents/RequirementEditor/*`, `modsComponents/RequirementAddModal/*` | TC-19/20 (delete), unit test de edición de campos + mover-entre-vías + nueva-vía | git revert | DET-1, DET-5, DET-8 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2)** — persistir, quality review (DET-23), consolidar TC-03/04/05/09/10/19/20, cerrar el open question de operaciones estructurales con el dev, decidir continue/iterate/escalate/standby | — | reviewer | S5.T1, S5.T2, S5.T3, S5.T4 | ticket | gate persistido + decisión + TCs con evidencia | (no aplica) | DET-13, DET-20, DET-23 | pending | 5 |

### Session 6 — Alerta de impacto + RBAC wiring [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Alerta de planes afectados (frente FE), reusando la query de `requirementActivityGuard.js` (`planEntry.activityId` → `Curriculum.status`), Alert atom | REQ-05 | developer | S5.GATE | `modsComponents/RequirementAddModal/*` o sección Requisitos (según ubicación decidida en S4) | TC-11, TC-12 | git revert | DET-5, DET-8 | pending | 6 |
| S6.T2 | RBAC wiring FE: gatear pestaña + acciones con `requirement:view/create/modify/delete` (capabilities ya declaradas, `capabilities.json:209-228`) | REQ-06 | developer | S6.T1 | sección Requisitos (config/componente) | TC-13 | git revert | DET-5, DET-16 | pending | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T2)** — persistir, quality review (DET-23), consolidar TC-11/12/13, decidir continue/iterate/escalate/standby | — | reviewer | S6.T1, S6.T2 | ticket | gate persistido + decisión + TCs con evidencia | (no aplica) | DET-20, DET-23 | pending | 6 |

### Session 7 — Evaluador fiel del árbol Y/O (REQ-14) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S7.T1 | `usePrereqRequirements.ts` deja de aplanar: preservar la estructura de árbol (ensamblar con `buildTree.ts`/`buildRequirementTree.js`) en el VM para alimentar el evaluador — hoy `toPrereqRequirements` devuelve nodos planos y los `Group` solo referencian hijos `RecordState` directos. **Preservar TODOS los campos que el evaluador de S7.T2 consume por nodo** (`combinator`, `minToSatisfy`, `creditsRequired`, `isHardRule`, `negate`, y en la hoja `RecordState`: `targetId`, `timing`, `mustBe`; en `MetricThreshold`: `metric`, `scope`, `operator`, `value`), no solo la topología | REQ-14 | developer | S6.GATE | `modsComponents/CurriculumMesh/usePrereqRequirements.ts` | unit test: VM reconstruye EST200 con anidamiento, combinadores y `timing` preservado | git revert | DET-5, DET-8, DET-11 | pending | 7 |
| S7.T2 | Evaluador recursivo puro `evaluateRequirementTree.logic.ts`: `Group` AND/OR/K-de-N (`minToSatisfy` conteo y/o `creditsRequired` sumando `MeshEntry.credits`), anidamiento, `isHardRule=false` no bloquea, `negate` invierte, hoja `RecordState` por `timing` (Before=antes estricto, Concurrent/Either=mismo período o antes — correquisito), `MetricThreshold(Credits)` evaluado (agregado de `MeshEntry.credits` por scope plan/category antes del período) | REQ-14 | developer | S7.T1 | `modsComponents/CurriculumMesh/evaluateRequirementTree.logic.ts` (+ `.spec.ts`) | TC-24..33 (matriz combinatoria, incl. correquisito y MetricThreshold) | git revert | DET-1, DET-2, DET-5, DET-8 | pending | 7 |
| S7.T3 | Recablear `findMissingPrereqs`/`findMissingPrereqsForBatch` (`prereqCheck.logic.ts`) para delegar en el evaluador recursivo, preservando el contrato de salida `MissingPrereqItem[]` que consume `PrereqBlockModal`; el flujo de alta (`onAddEntryConfirm`) queda sobre el evaluador fiel | REQ-14 | developer | S7.T2 | `modsComponents/CurriculumMesh/prereqCheck.logic.ts`, `CurriculumMeshElement.vue` | TC-27 vía flujo de alta | git revert | DET-5, DET-8, DET-16 | pending | 7 |
| S7.T4 | Regresión del flujo de alta ya shippeado (SP5): correr `prereqCheck.logic.spec.ts`, `curriculumMesh.logic.spec.ts`, `usePrereqRequirements.spec.ts` completos; actualizar los que asumían semántica aplanada, sin bajar cobertura | REQ-14 | developer | S7.T3 | `modsComponents/CurriculumMesh/*.spec.ts` | `vitest run` del mod verde, 0 regresiones en el alta | git revert | DET-7, DET-13 | pending | 7 |
| **S7.GATE** | **Gate de sync Session 7 (tier: T3, ⚑ fuerte)** — persistir, quality review aislado (DET-30/35), regresión completa del mod, consolidar TC-24..33 (incl. correquisito y MetricThreshold) + no-regresión del alta, decidir continue/iterate/escalate/standby | — | reviewer | S7.T1, S7.T2, S7.T3, S7.T4 | ticket | gate persistido + regresión + decisión | (no aplica) | DET-13, DET-16, DET-20, DET-23, DET-30, DET-35 | pending | 7 |

### Session 8 — REQ-11: superficie de malla (mover + banner) sobre el evaluador fiel [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S8.T1 | Invocar el check (ya sobre el evaluador fiel, S7) en el handler de **mover** una entrada de período (`onDragEnd`/`persistPeriodPositionUpdates`, hoy sin validación — `CurriculumMeshElement.vue` ~línea 702); bloquear/avisar según el resultado | REQ-11 | developer | S7.GATE | `modsComponents/CurriculumMesh/CurriculumMeshElement.vue`, `prereqCheck.logic.ts` | TC-16 (violación al mover) | git revert | DET-5, DET-8, DET-16 | pending | 8 |
| S8.T2 | Banner mesh-wide: al cargar la malla, evaluar **cada entrada ya colocada contra su propio período** (no un período único de lote) con el evaluador fiel y mostrar un banner informativo (no bloqueante) con las violaciones | REQ-11 | developer | S8.T1 | `modsComponents/CurriculumMesh/*` (helper de scan por-entrada + banner UI) | TC-17 (banner, per-entry period) | git revert | DET-5, DET-8 | pending | 8 |
| S8.T3 | Verificación de round-trip: crear un requisito `Before` en la asignatura (editor S4/S5) → abrir una malla ya armada con el orden incorrecto → confirmar que el banner lo refleja sin tocar la malla | REQ-11 | developer | S8.T2 | (verificación, sin archivo nuevo) | TC-18 (round-trip), smoke DB-gated | (no aplica — verificación) | DET-13, DET-36 | pending | 8 |
| **S8.GATE** | **Gate de sync Session 8 (tier: T3, ⚑ fuerte)** — persistir, quality review aislado (DET-30/35), regresión T3 (vitest del mod + smoke UI del round-trip), consolidar TC-16/17/18, decidir continue/iterate/escalate/standby | — | reviewer | S8.T1, S8.T2, S8.T3 | ticket | gate persistido + regresión + smoke + decisión | (no aplica) | DET-13, DET-16, DET-20, DET-23, DET-30, DET-35, DET-36 | pending | 8 |

### Session 9 — No-negativos (REQ-09) + docs + KB + i18n + DoD + smoke final [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S9.T1 | `"minimum": 0` en los 4 campos de los RT de `requirement` (REQ-09) + `npm run codegen` + `npm run sync` | REQ-09 | developer | S8.GATE | `objects/RecordTypes/rt__Group__requirement.json`, `rt__MetricThreshold__requirement.json`, `rt__RecordState__requirement.json` | TC-14 (rechazo negativo), TC-15 (0 aceptado) — DB-gated | git revert | DET-1, DET-8, DET-11 | pending | 9 |
| S9.T2 | Docs oficiales (DET-37 dim1): actualizar `docs/patterns/resolver-override.md` (mod) con la convención "migrar un objectType a la rama rt__ exige re-cablear los guards de dominio que vivían en la rama no-rt" (hallazgo S1); actualizar `mods/.ai/CONTEXT.md` (estado de `requirement`: create/read-only → editable) y documentar la semántica del evaluador fiel de la malla (REQ-14) | — (DET-37) | developer | S9.T1 | `mods/curriculum-design/docs/patterns/resolver-override.md`, `mods/.ai/CONTEXT.md` | inspección | git revert | DET-16 | pending | 9 |
| S9.T3 | KB DKC (DET-37 dim2): RULE del riesgo de S1 (recableo de guard al migrar de rama) + learn de corrección de la premisa BL-1 + RULE/decision del evaluador fiel (la evaluación de la malla debe respetar el árbol Y/O, no aplanarlo — hallazgo 2026-07-27) | — (DET-37) | reviewer | S9.T1 | `rules/curriculum-design/RULE-curriculum-design-0XX.md` | inspección (rule con what/why/where/when) | (no aplica) | DET-11, DET-16 | pending | 9 |
| S9.T4 | i18n ES completo de todos los componentes nuevos (modal, regla unificada, banner de malla) + lint/Prettier/tsc limpios (incl. tests y stories) | REQ-01..14 | developer | S9.T1 | `lang/es_CL@requirement.json`, componentes nuevos | paridad de keys + lint/tsc verde | git revert | DET-8 | pending | 9 |
| S9.T5 | Smoke final en UPU (DET-36, runtime real): recorrido completo — sección Requisitos, alta 2 pasos de las 3 familias, editar, eliminar (guard), alerta de impacto, ciclo rechazado, malla respeta OR/anidamiento al mover + banner fiel. **Incluye el e2e diferido del backend/MCP** (tras sync+restart de object-manager y rebuild+restart del server MCP, coordinado con el dev): UPDATE de rt__*__requirement por el path real (TC-07, diferido de S1); DELETE gateado por plan Active (S2); y los casos de handler del MCP que el unit no cubre (update sin `owner` → ciclo igual detectado vía el nodo persistido; update con `recordType` que no coincide → rechazo, sin fila RT fantasma) | REQ-01..14, BL-1, REQ-12 | reviewer | S9.T4 | (verificación, sin archivo) | smoke UI + e2e MCP/GraphQL con evidencia runtime (screenshot/DOM/respuesta), no solo referencia a test file | (no aplica) | DET-33, DET-36 | pending | 9 |
| **S9.GATE** | **Gate de sync Session 9 (tier: T3, ⚑ fuerte)** — persistir, quality review aislado (DET-30/35), regresión completa del mod, consolidar TODOS los TC (01-33) con evidencia, verificar acceptance checkpoints, decidir continue/iterate/escalate/standby | — | reviewer | S9.T1, S9.T2, S9.T3, S9.T4, S9.T5 | ticket | gate persistido + regresión + smoke + decisión | (no aplica) | DET-13, DET-16, DET-20, DET-23, DET-30, DET-35, DET-36 | pending | 9 |

## Constraints

- **CONSTRAINT H7** (resolver-override singleton): `createInstance`/`updateInstance`/`deleteInstance` son un solo archivo por mod. El guard de delete (REQ-12) se cablea en `requirementCategoryDelete.resolver.js` existente, NO un archivo nuevo. Doc: `docs/patterns/resolver-override.md`.
- RULE-curriculum-design-013 (must): mod-only; no commitear artefactos de sync/seed (Base, schema, typeDefs, lang sincronizado a core).
- RULE-curriculum-design-014 (should): componente full-page custom del mod = Vueform element/modsComponent con modales caseros (Modal atom, no ModalStackManager), lógica en `.ts` puro testeable. Aplica a `RequirementAddModal` y `ReglaUnificadaView`.
- RULE-curriculum-design-017 (must): un mod NO puede registrar field resolvers GraphQL — cualquier campo derivado (ej. columnas de la lista REQ-01 que no sean columnas propias del RT) se resuelve por read-enrichment sobre `getInstance`/`listInstances`, no `extend type`.
- RULE-curriculum-design-018 (must): el codegen ignora `metadata.indexes` y decide nullability por `required[]`, no por `not_null`. Verificar el schema generado tras S8.T1.
- RULE-curriculum-design-001/002 (must): WAI-ARIA APG para estructuras compuestas visibles (tree, dialog, focus trap, roving tabindex) — aplica a `ReglaUnificadaView` (tree) y `RequirementAddModal` (dialog).
- RULE-curriculum-design-023 (should): si el layout de `default_requirement_list.json` u otro nuevo introduce un campo base requerido sin `static_default`, debe incluirse editable en create/edit. Revisar contra `objects/requirement.json` `required[]`.
- RULE-dev-004: trabajo `layer: mod` va autocontenido (branch mod-only per RULE-dev-004, base `develop`); no toca core directamente. `up1-mcp` es repo standalone, commits con `UPONE-1378`.
- DEC-LOCAL-01..04 de `SPEC-curriculum-design-requirement-active-plan-guard` (MC-09): el guard de plan Active ya vive en `sectionValidation`/`polymorphicUpdate`; este spec lo extiende (update recableado, delete nuevo), no lo reemplaza.
- **Gap de auditoria heredado (BUG-curriculum-design-007/009, status detected, TICKET-102 — FUERA DE ALCANCE de UPONE-1378):** al mover `requirement` a la rama `rtUpdateHandler` (S1.T2), sus updates entran al mismo path RT-projected. `rtUpdateHandler` YA llama `recordMutationDataLog` explicito (parche UPONE-1380), pero la atribucion (`ownerType`/`ownerId` no expuestos al top-level, BUG-007) y la resolucion del alias RT en `isDataLogEnabled` (BUG-009) siguen pendientes bajo TICKET-102. No lo resuelve este ticket (auditoria no es parte del request); se registra como propagacion (DET-16). El guard MC-09 recableado (S1.T3) NO depende de esto: resuelve el `ownerId` por `findUnique` sobre el id. **Seguimiento con contexto completo:** `uplanner/specs/up1/sp7/UPONE-1378-out-of-scope-followups.md` §1.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-curriculum-design-requirement-composite-tree (TICKET-083, closed) | internal | objeto `requirement` + 3 RT + `buildRequirementTree.js` | bajo — cerrado |
| SPEC-curriculum-design-requirement-active-plan-guard (TICKET-089, closed) | internal | `requirementActivityGuard.js` (create/update) — este spec lo extiende a delete | bajo — cerrado |
| SPEC-curriculum-design-planentry-requirementcategory (TICKET-082, closed) | internal | `planEntry`/`requirementCategory` — base de la query de impacto y de la malla | bajo — cerrado |
| Componente `CurriculumMesh` (SP5, en producción) | internal | REQ-11 extiende `prereqCheck.logic.ts`/`CurriculumMeshElement.vue` ya existentes | medio — cambio en componente en producción, requiere regresión de sus specs existentes |
| `up1-mcp` (repo standalone) | internal, repo separado | `cd_manage_requirement`/`cd_get_prereqs` — deploy independiente del monorepo up1 | bajo — cambios acotados, mismo patrón que `sections-write.ts` |
| object-manager (codegen + sync) | internal | aplica `minimum:0` (REQ-09) y no afecta schema de `requirement` (sin objeto nuevo) | bajo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Recableo de `RT_PATTERN` pierde el guard MC-09 en update sin que nadie lo note | medium | alto — regresión silenciosa de regla de negocio ya entregada | S1.T3 recablea explícitamente + test de regresión dedicado en el gate de S1 |
| Regresión de CurricularSection al tocar código compartido (`polymorphicUpdate.resolver.js`) | medium | alto — rompe un consumidor en producción | `tests/unit/polymorphicUpdate.test.js` (7 subtipos) corre completo antes de avanzar de S1 |
| Ciclos cruzados sin guard en el camino que usa la Suite (solo existía en `up1-mcp`) | medium | alto — malla con prerrequisitos imposibles de satisfacer | S3 porta la lógica probada de `up1-mcp` al backend del mod, con tests directo/transitivo |
| Operaciones estructurales del árbol (mover/anidar/cambiar combinator) sin decisión de UX cerrada | medium | medio — S5 podría necesitar ida y vuelta con el dev | Open question explícita, resuelta antes de cerrar S5.GATE; MVP mínimo garantizado (alta, editar hoja, eliminar) no depende de esa decisión |
| Reemplazar el evaluador de prereqs (REQ-14) introduce regresión en el flujo de alta ya probado (SP5) | medium | alto — rompe funcionalidad ya entregada | S7.T4 corre la suite existente (`curriculumMesh.logic.spec.ts`, `prereqCheck.logic.spec.ts`, `usePrereqRequirements.spec.ts`) y actualiza solo lo que asumía semántica aplanada; el contrato de salida `MissingPrereqItem[]` se preserva para no tocar `PrereqBlockModal` |
| Evaluador recursivo mal calibrado en OR/anidamiento/negate/timing/créditos produce falsos (positivos o negativos) | medium | alto — la malla miente en el caso que este ticket busca corregir | S7.T2 con matriz de tests TC-24..33 (AND/OR/K-de-N/anidado EST200/advisory/negate/correquisito/MetricThreshold créditos) antes de cablearlo a ninguna superficie |
| Banner mesh-wide con costo de recorrido alto en mallas grandes | low | medio — UI lenta al abrir | evaluador O(nodos) por árbol, una pasada por entrada colocada contra su propio período; sin scan cuadrático |

## Open questions

- [x] **Operaciones estructurales del árbol / autoría de vías OR**: **RESUELTA (dev, 2026-07-28, S5) → IN, modelo de VÍAS de la maqueta**. Tras verificar transcripts (QA 2026-07-06 + los 3 del repo: ninguno menciona vías/OR explícitamente — ni incluir ni excluir; solo "establecer prerrequisitos y sus tipos" + "pista de maqueta" + ~8 SP), el dev confirmó incluir la **autoría de vías alternativas (OR)** según la maqueta. Modelo: raíz OR de vías, cada vía = AND de condiciones. La UI de edición NO es DnD de árbol crudo sino el **modelo de vías** del mockup: al crear (paso 1) se elige clase + **vía destino** (existente o "+ Nueva vía (O)") + exigencia; "mover" = cambiar de vía; "combinador OR" = nueva vía; K-de-N = mínimo de vías. Evaluación (S7) y vista (S4) ya soportan OR; esto agrega la **autoría**. Ver `decision-creation` (S5) en `decisions_log`.
- [ ] **Columna "Vía" en la lista** (REQ-01): ¿plana (solo primer nivel) o refleja el anidamiento real? El draft deja esto abierto; "regla unificada" (REQ-03) siempre muestra el árbol fiel independientemente de esta decisión.
- [ ] **Herencia MADS del sílabo** (Hereda/Agrega/Reemplaza): no está en las AC de Jira ni en las decisiones de alcance del dev. Confirmar in/out antes de S4 — si entra, es un REQ nuevo fuera del alcance actual de este spec.
- [ ] **Ubicación de la alerta de impacto (REQ-05)**: ¿vive en la sección Requisitos o en el modal? Definir en S6 según cómo quede la UX de S4/S5.

## Decisions

### DEC-LOCAL-01: BL-1 se reduce — el create ya usa RT literal, solo falta el update
- **Contexto**: la decisión de alcance #1 del ticket (2026-07-07) afirmaba que el create de `requirement` en `up1-mcp` usaba el objectType base (`REQUIREMENT`) en vez de `typedRecordName(recordType)`, citando `requirement-write.ts:209`.
- **Drivers**: investigación de código (2026-07-24, agente de research) leyó el archivo completo: la línea 209 real usa `typedRequirementName(rt)` (alias tipado); el create efectivo (línea 292) también usa `typedRequirementName(input.recordType)`. El único uso del objectType base es para el `listInstances` de lectura (necesario para traer todos los nodos del árbol), igual que el patrón de `sections-write.ts`.
- **Opción elegida**: tratar la premisa "create roto" como refutada (DET-4: no presentar inferencia superada como hecho); BL-1 se acota a (a) verificación runtime que confirme esto empíricamente (S1.T1, DET-33 — no confiar solo en la lectura estática), (b) extender `RT_PATTERN` para el UPDATE (que sí está genuinamente roto — no hay ninguna ruta que lo maneje), (c) recablear el guard MC-09 que vive en la rama que el update deja de usar.
- **Alternativas**: mantener el scope original (fix de create + extensión de update) — descartada porque implicaría tocar código que ya funciona sin necesidad, violando DET-32 (necesidad/reuso).
- **Consecuencias**: BL-1 más chico de lo estimado en el pre-spec; el ahorro se compensa parcialmente por el hallazgo nuevo del recableo del guard (riesgo no visto en el análisis original) y por REQ-13 (ciclos cruzados en backend, tampoco contemplado originalmente).
- **Session**: design (S0, previo a S1).

### DEC-LOCAL-02: REQ-11 se acota a 2 extensiones puntuales, no a construir detección desde cero
- **Contexto**: el reencuadre de alcance (dev 2026-07-24) describía REQ-11 como "extender el componente de malla para detectar/validar prereqs al construir", sin precisar cuánto de esa detección ya existía.
- **Drivers**: investigación de código confirma que `CurriculumMeshElement.vue` ya invoca `checkPrereqsForBatch`/`findMissingPrereqsForBatch` y bloquea con `PrereqBlockModal` al **agregar** una entrada — una capacidad shippeada en SP5 más completa de lo que el transcript de planning sugería ("medianamente modelado"). El gap real, confirmado por grep exhaustivo, es que esa detección no vuelve a correr al **mover** una entrada, y no existe un banner que señale violaciones ya existentes en la malla completa.
- **Opción elegida**: acotar REQ-11 a (a) extender el chequeo al flujo de mover, (b) agregar el banner mesh-wide, (c) verificar el round-trip. No se construye un motor de detección nuevo.
- **Alternativas**: re-implementar la detección de prereqs como un módulo nuevo independiente del existente — descartada, violaría DET-32 (ya existe, se reusa) y duplicaría lógica ya probada (`prereqCheck.logic.spec.ts`).
- **Consecuencias**: REQ-11 pesa menos de lo que el dev había proyectado al reencuadrar el ticket (2026-07-24, "el trabajo supera claramente los 8 SP... y sube por encima de 13"), aunque el ticket en su conjunto sigue por encima de 13 SP por la suma de BL-1 (recableo), REQ-13 (ciclos cruzados backend) y el editor FE completo.
- **Session**: design (S0, previo a S1).

### DEC-LOCAL-03: ciclos cruzados (REQ-13) se portan del diseño de `up1-mcp`, no se reinventan
- **Contexto**: decisión de alcance #5 (dev 2026-07-07) exige validación completa de ciclos cruzados (CAP-CUR-004) al guardar un `RecordState`.
- **Drivers**: la investigación confirma que este guard YA existe, pero solo en `up1-mcp` (`wouldFormRequirementCycle`, BFS con guard de profundidad `MAX_GRAPH_NODES=500`) — un repo que la Suite (donde vive el editor de este ticket) no consume. Sin portarlo, la UI nueva crearía un hueco de integridad que MCP sí cubre pero la Suite no.
- **Opción elegida**: portar el mismo diseño de algoritmo (BFS transitivo + guard de profundidad) a un helper puro del mod (`requirementCycleGuard.js`), cableado en los mismos 2 overrides singleton que ya usa el resto de los guards del mod (`sectionValidation`/`polymorphicUpdate`).
- **Alternativas**: hacer que la Suite llame a `up1-mcp` para validar — descartada, `up1-mcp` es un adaptador para LLMs que opera como el usuario vía GraphQL, no un servicio que la Suite deba consumir (acoplaría dos frentes de arquitectura distintos sin necesidad).
- **Consecuencias**: 2 implementaciones del mismo algoritmo (mod backend + up1-mcp) — divergencia futura posible si uno cambia y el otro no; se documenta la duplicación intencional en `docs/` (S9.T2).
- **Session**: design (S0, previo a S1).

### DEC-LOCAL-04: la malla evalúa el árbol Y/O de forma fiel (REQ-14) — supersede el "reuso flat" de DEC-LOCAL-02
- **Contexto**: DEC-LOCAL-02 acotó REQ-11 a reusar la detección existente (`findMissingPrereqs`/`findMissingPrereqsForBatch`) tal cual, asumiéndola correcta y solo incompleta en su superficie de disparo (faltaba mover + banner).
- **Drivers**: análisis de código (2026-07-27, a pedido del dev) mostró que la evaluación existente es **semánticamente incorrecta**, no solo incompleta: `usePrereqRequirements` aplana el árbol y `findMissingPrereqs` lo trata como AND global, con cada `Group` mirando solo sus hijos `RecordState` directos. Eso convierte un `OR` en `AND`, ignora `isHardRule`/`negate` y colapsa el anidamiento (con EST200 exige "MAT210 y MAT110 y MAT120 y PROG101(advisory)" en vez de "MAT210 O (MAT110 y MAT120)"). Extender esa lógica al banner mesh-wide la haría visible y persistente.
- **Opción elegida**: opción A — construir un evaluador recursivo fiel (REQ-14) que respeta `combinator`/anidamiento/`isHardRule`/`negate`, honra `creditsRequired` sumando `MeshEntry.credits` (dato ya disponible en la malla, confirmado), la hoja `RecordState` por `timing` (Before=antes estricto, Concurrent/Either=mismo período o antes) y `MetricThreshold(Credits)` por agregado de créditos por scope. Reemplaza al aplanado para las 3 superficies (alta, mover, banner).
- **Corrección (validación 2026-07-27, a pedido del dev):** una versión previa de esta decisión dejaba `MetricThreshold` neutro y evaluaba la hoja solo como "colocado antes" (ignorando correquisitos). La validación contra transcripts + maqueta (`mVPrereq`) + CAP-CUR-004 (Must) mostró que correquisitos (`timing=Concurrent`, "mismo período permitido") y `MetricThreshold(Credits)` **están pedidos y la maqueta ya evalúa el correquisito** → REQ-14 se corrigió para honrar `timing` y evaluar `MetricThreshold(Credits)`. No son solo de la maqueta.
- **Alternativas**: (B) degradación honesta — solo evaluar árboles simples y avisar neutro en compuestos, dejando el evaluador fiel como follow-up; (C) parche flat parcial (advisory + timing-null) sin recursión — descartada por dominada (sigue convirtiendo OR en AND). El dev eligió A porque el requisito es que la malla respete las reglas, no solo que no muestre violaciones falsas.
- **Necesidad/reuso (DET-32)**: `build` justificado — la lógica existente es incorrecta, no reusable para correctitud; se reusa el ensamblador de árbol (`buildTree.ts`/`buildRequirementTree.js`) y el contrato de salida (`MissingPrereqItem[]`), no se reinventa el pipeline.
- **Consecuencias**: +1 session (nueva S7 evaluador; REQ-11 pasa a S8; DoD a S9); SP sube de ~16 a ~20 (rango 18-22); regresión obligatoria del flujo de alta ya shippeado (SP5). También corrige el alta actual, que sufría el mismo aplanamiento.
- **Session**: design (adecuación 2026-07-27, previo a ejecución — el ticket seguía en S1 pending).

### DEC-LOCAL-05: la lista de Requisitos (REQ-01) usa columnas de campos reales/RT; la fidelidad Y/O vive en la "regla unificada" (REQ-03)
- **Contexto**: S4.T1 pedía una `RecordList` con columnas "Clase/Requisito/Condición/Vía/Exigencia mapeadas a campos derivados del árbol". La columna "Vía" (anidamiento) quedó como open question #2 del draft.
- **Drivers (verificado contra código vivo 2026-07-28)**: `layout/src/composables/useColumnConfiguration.ts:176-177` filtra las `initialColumns` del layout contra `effectiveFields` (campos persistidos del objeto + columnas multivalor sintéticas de `relations`) y **descarta en silencio** cualquier columna cuyo `key` no sea un campo real. Una columna "Condición"/"Vía" derivada por read-enrichment (RULE-017) sobre `item.data` NO aparece en la lista (mismo trap que ISSUE-SP6-01: `currentCredits`/`mandatoryCount` no renderizan en Curriculum). Coincide con el learn [[feedback_verify_rendered_ui_not_config]].
- **Opción elegida (A)**: la lista `default_requirement_list.json` mapea columnas a campos REALES **de base** de `requirement`: `recordType` (Clase, i18n enum), `label` (Requisito), `effect` (Efecto), `isHardRule` (Exigencia). Ni "Condición" por-familia ni "Vía" (anidamiento) se incluyen: la fidelidad del árbol Y/O (anidamiento, AND/OR, combinador, mustBe, umbrales, isHardRule) la entrega la vista "regla unificada" (REQ-03 / `ReglaUnificadaView`), como el propio spec anticipa ("'regla unificada' siempre muestra el árbol fiel independientemente de esta decisión"). Resuelve open question #2.
- **Corrección (S4.GATE quality review, DET-23/30/33)**: una primera versión incluía columnas de RT dotted (`rt__Group__requirement.combinator`, etc.) creyendo que `relations` las surface. Verificado contra código vivo: la inyección de campos RT-específicos a `availableFields` (`RecordList.vue:transitionRecordTypeFilter`, ~5916) ocurre **solo con un filtro `recordType EQUALS` activo**; esta lista es heterogénea (3 RT, sin filtro recordType) → esas columnas se descartan por el filtro de `useColumnConfiguration`. Se quitaron. Además `canView:false` (mirror exacto de `contractrestriction-list-view.json`): sin él, `label` renderiza como name-link que abriría el RT equivocado (`associatedLayoutConfigs` hardcodeaba `rt__RecordState__requirement`) para filas Group/MetricThreshold. Se removió `associatedLayoutConfigs` (no hay drill-in single-RT significativo en una lista de 3 familias; el detalle vive en el árbol).
- **Embedding**: `default_requirement_list.json` es standalone (`objectName: "requirement"`, `layoutType: "RecordList"`, `applicationId: null`, sin `showInNav`) y se embebe en `default_Activity_view.json` como tab "Requisitos" vía `type: "associatedLayout"` + `associatedLayoutId` (patrón `contractrestriction-list-view.json` de academic-scheduling: `{{parentId}}` resuelve por parent-context de `LayoutOrchestrator`). Filtros `ownerType=activity` + `ownerId={{parentId}}`. En S4 la lista es read-only (create/edit/delete llegan en S5).
- **Alternativas descartadas**: (B) enriquecer `item.data` con `condicion`/`via` computados — dominada: el RecordList las descarta por el filtro de columnas (verificado). (C) construir un componente de lista custom que renderice columnas derivadas — innecesario: la fidelidad ya la da `ReglaUnificadaView` (DET-32, no duplicar).
- **Impacto en tests**: `tests/integration/layouts-declared.test.ts` — el conteo hardcoded sube +1 (59→60) y el guard "requirement NO declara ningún _list" (`:184-188`, cuyo regex apunta literal a `default_requirement_list.json`) se ajusta a "no va al menú de objetos" (sin `showInNav`) en vez de "no existe el archivo". Sincronizado en S4 (parte de S4.T1) — el spec ya lo anticipaba en Technical reference (línea 794). Nota: `recordtypes-declared.test.ts:65` no se afecta (no se agregan RT).
- **MADS (open question #3)**: la herencia MADS del sílabo (Hereda/Agrega/Reemplaza) queda **fuera de alcance** de este spec (no está en las AC de Jira ni en el request; el spec aprobado no la incluye como REQ). Si el dev la quiere, es un REQ nuevo posterior. Se marca para revisión del dev en el gate de S4.
- **Session**: S4 (execute, 2026-07-28).

## Success metrics

{No aplica de forma medible post-deploy más allá de los acceptance checkpoints — feature de configuración curricular sin métrica de negocio agregada en este spec. Ver Acceptance checkpoints.}

## Technical reference

### Re-estimación de esfuerzo (dev pidió validar que supera 13 SP)

- **Original**: 8 SP publicados en Jira, 13 SP estimado DKC (`post-deep-analysis-2026-07-07`), antes de conocer REQ-11 (malla) y antes de la investigación de código de esta sesión (2026-07-24).
- **Factores que suben el esfuerzo respecto a 13**:
  - REQ-11 (malla): 1 session dedicada (S7) que no estaba contemplada en el 13 original — el reencuadre de 2026-07-24 es posterior a esa estimación.
  - REQ-13 (ciclos cruzados en backend, no solo MCP): 1 session dedicada (S3) — la decisión de alcance #5 ya preveía esto ("amplía el alcance de P1"), pero el pre-spec original no tenía evidencia de que el guard de MCP no cubre el camino de la Suite; ahora es explícito.
  - Recableo del guard MC-09 en update (hallazgo S1): riesgo no identificado en el análisis del 2026-07-07, agrega una task + test dedicados.
- **Factores que bajan el esfuerzo respecto a lo que el pre-spec temía**:
  - BL-1 no requiere "arreglar el create" (DEC-LOCAL-01) — ahorra ~1 sesión de trabajo especulativo.
  - REQ-11 se acota a 2 piezas puntuales sobre un componente ya maduro, no un motor de detección nuevo (DEC-LOCAL-02).
- **Rango (adecuación 2026-07-27, opción A)**: **18–22 SP**, convergiendo alrededor de **20 SP** (`option-A-faithful-evaluator-2026-07-27`): 9 sessions ejecutables, siendo S1/S3/S7/S8/S9 las de mayor riesgo/tamaño (⚑ fuerte, T3) y S2/S4/S5/S6 estándar (T2). El salto respecto de los 16 previos lo agrega REQ-14 (nueva S7: evaluador recursivo + matriz de tests TC-24..33, incl. correquisito y MetricThreshold + regresión del flujo de alta ya shippeado); REQ-11 pasa a S8 y el DoD a S9. La banda alta (22) contempla una vuelta adicional si el evaluador fiel destapa casos de OR/anidamiento no previstos o si S5 (operaciones estructurales) requiere ida y vuelta con el dev.
- **Estimación previa (histórica)**: 15–18 SP (~16), 8 sessions, antes de decidir el evaluador fiel (DEC-LOCAL-04).

### Puntos de código citados (verificados 2026-07-24)

- `mods/curriculum-design/logic/polymorphicUpdate.resolver.js:199` — `RT_PATTERN` (no 159 como citaba el análisis original de 2026-07-07).
- `mods/curriculum-design/logic/polymorphicUpdate.resolver.js:665` — `updateInstance` exportado; `:431` — `rtUpdateHandler`; `:671-682` — rama no-rt con la cadena de guards actuales (`assertCreditRangeOnUpdate`, `assertActivityNotInActivePlanOnUpdate`, etc.).
- `mods/curriculum-design/logic/requirementCategoryDelete.resolver.js` — único override de `deleteInstance` (H7), estructura de 75 líneas, branch por `objectType`.
- `mods/curriculum-design/logic/helpers/requirementActivityGuard.js:49` (`assertActivityNotInActivePlan`), `:93` (`assertActivityNotInActivePlanOnUpdate`).
- `mods/curriculum-design/logic/helpers/buildRequirementTree.js:47-56` (`hasCycle`, intra-árbol únicamente).
- `up1-mcp/src/mods/curriculum-design/requirement-write.ts:59-88` (`wouldFormRequirementCycle`, BFS cross-Activity, `MAX_GRAPH_NODES=500`); `:149-304` (`cd_manage_requirement`, hoy `view`/`create` únicamente, línea 160 `z.enum(["view","create"])`); `:209`, `:292` (usos de `typedRequirementName`).
- `up1-mcp/src/mods/curriculum-design/mesh-read.ts:168-208` (`cd_get_prereqs`, solo lectura).
- `mods/curriculum-design/capabilities.json:209-228` (`requirement:view/create/modify/delete`).
- `object-manager/src/graphql/resolvers/jsonFieldValidator.resolver.js:294` (`validateBaseFieldFormats`, lee `minimum`/`maximum` de `core_FieldDefinition.properties`).
- `mods/curriculum-design/tests/integration/layouts-declared.test.ts:65` y `recordtypes-declared.test.ts:65` (conteos exactos hardcoded — verificar si `default_requirement_list.json` los afecta; si el objeto `requirement` ya tenía sus 9 layouts contados en SP5, el nuevo `_list` es +1 a actualizar).
- `mods/curriculum-design/modsComponents/CurriculumMesh/`: `usePrereqRequirements.ts` (listPrereqs), `prereqCheck.logic.ts` (`findMissingPrereqs`/`findMissingPrereqsForBatch`), `PrereqBlockModal.ts` (modal bloqueante), `CurriculumMeshElement.vue:1382-1439` (`checkPrereqsForBatch`, invocado solo en el flujo de alta).
- `mods/curriculum-design/modsComponents/CompositeSectionTree/`: `buildTree.ts`, `treeOps.ts`, `useTreeKeyboardNav.ts`, `CompositeSectionTree.types.ts` — piezas de bajo nivel a reusar.

## Rules discovered

{Se llena durante ejecución. Ver S8.T3 (task planificada para registrar la RULE del recableo de guard al migrar de rama en `polymorphicUpdate.resolver.js`, y el learn de corrección de la premisa BL-1).}

## Bugs found

{Ninguno confirmado aún — S1.T1 podría confirmar o refutar el estado real del create/update runtime.}

## Acceptance checkpoints

- [ ] **Funcional**: REQ-01..07, REQ-09, REQ-11..14 satisfechos (sección + modal + árbol + validaciones + alerta + RBAC + malla fiel al árbol Y/O + ciclos + no-negativos). Para REQ-03, "satisfecho" = el MVP garantizado (agregar / editar campos de un nodo / eliminar nodo+subárbol) más la vista "regla unificada"; las operaciones estructurales (mover/anidar/combinador) son SHOULD condicional (ver Open questions) y su ausencia no bloquea el checkpoint si el dev no las confirmó en S5.
- [ ] **Tests** (DET-37 dim4): TC-01..33 escritos/actualizados (incl. correquisito TC-31/32 y MetricThreshold TC-33) + regresión (`polymorphicUpdate.test.js`, `CurriculumMesh` specs, incl. no-regresión del flujo de alta tras REQ-14), corridos y en VERDE.
- [ ] **NFRs**: guard de ciclos con profundidad acotada; evaluador de malla O(nodos) sin scan cuadrático; WAI-ARIA en árbol/modal.
- [ ] **Rules**: H7 respetado (sin overrides nuevos de create/update/delete); RULE-curriculum-design-001/002/013/014/017/018/023 respetadas.
- [ ] **Integration**: sync corrió limpio en UPU; CurricularSection sin regresión; `CurriculumMesh` (SP5) sin regresión.
- [ ] **Docs oficiales del proyecto** (DET-37 dim1): `docs/patterns/resolver-override.md` y `mods/.ai/CONTEXT.md` actualizados, incl. semántica del evaluador fiel de la malla (S9.T2).
- [ ] **KB DKC** (DET-37 dim2): RULE del recableo de guard + learn de corrección BL-1 + RULE/decision del evaluador fiel registrados (S9.T3).
- [ ] **Docs externas DKC** (DET-37 dim3): N/A — el ticket no toca convenciones de DKC.
- [ ] **Planning-completeness**: entry `planning-completeness` registrada (complete).

## Archiving

Cuando la spec deje de ser fuente de verdad: `/dkc-archive-spec SPEC-curriculum-design-activity-requirements-section "razon"`.
