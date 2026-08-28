---
id: SPEC-curriculum-design-instructional-component
project: up1
ticket: TICKET-134
status: draft
---

# Curriculum Design — Implementación de InstructionalComponent

# Curriculum Design — Implementación de InstructionalComponent

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Artifacts, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: hoy un curso digita la carga horaria de su modalidad en cuatro casillas (teoría, práctica, laboratorio, autónomas) que no representan como se dicta realmente. Este ticket modela las **piezas de dictado** (Cátedra, Laboratorio, Taller, etc.) como objetos anidados a la modalidad, cada una con sus horas y atributos, y hace que la modalidad **derive** su carga sumando esas piezas en vez de que alguien la escriba. Al final el formulario del curso muestra las piezas de cada modalidad y su total calculado, las cuatro casillas de horas digitadas desaparecen del modelo, y curriculum-design deja de ser el bloqueante de academic-scheduling y engagement, que necesitan anclar sus objetos a la pieza. Fuente de verdad de todas las decisiones: análisis SP9 (`projects/up1/kb/sp9/`).

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El catálogo de tipos es **objeto real** `InstructionalComponentType` (no enum), con 8 tipos de carga inicial | El vocabulario varía por país; un enum lo congela en el código. Decidido SP9 (H5). |
| 2 | La pieza es **RecordType** `rt__InstructionalComponent__curricularsection` anidado por `parentId` a la Modality (no objeto suelto con FK `modalityId`) | Reusa el árbol de `CurricularSection` (jerarquía, listado embebido, layouts). Decidido SP9 (H1/H10). |
| 3 | La carga horaria derivada se entrega por **read-enrichment** en el override del mod, NO por field resolver GraphQL | RULE-017 prohíbe field resolvers de mod; el motor de fórmulas del core no agrega colecciones de hijos (verificado). |
| 4 | El retiro de las 4 columnas exige tocar el JSON del **mod Y del core** y commitear en `object-manager` | El merge del sync es append-only (RULE-043): sacarlas solo del mod no las saca de la plataforma; sin commit en core la próxima corrida las revierte. |
| 5 | La publicación en core (18 schemas + BASEMODEL) va **dentro de este ticket** (sub-tarea 1C-c), no en ticket aparte | Precedente del equipo (UPONE-1523); partirlo reproduce el fallo de UPONE-1539 (deuda de core sin dueño). |
| 6 | Entrega en **3 hitos**: H1 aditivo (objetos publicados) → H2 funcional (modelo en el mod) → H3 destructivo (drop de columnas) | El tramo destructivo queda aislado al final con su ventana de core; H1 destraba a academic-scheduling temprano. |

**Riesgos principales y como los mitigamos**:

- **El retiro no toma efecto o se revierte solo** (append-only del merge, quedar sin commitear en core) → H3 incluye task explícita de "verificar que una corrida posterior de sync no revierte" (REQ-09) siguiendo el procedimiento del precedente UPONE-1523.
- **El total derivado no se puede pintar en el listado** (el RecordList filtra columnas a campos reales del objeto) → smoke runtime obligatorio en UPU antes de cerrar H2 (RULE-029); si no renderiza, se replantea la vía de presentación (A3 como contingencia, ver Decisions).
- **Migración destructiva no quirúrgica** (el sync regenera el modelo de todos los mods; `DROP COLUMN` en 18 schemas) → H3 se agenda al final con ventana de coordinación con core (RULE-dev-004); rollback = restaurar el JSON y regenerar.
- **Colisión sobre `_data-rbac.js` y `seed-counts.test.ts`** con tickets hermanos → coordinar con UPONE-1615 (RBAC) y UPONE-1541 (seed) antes de escribir esos archivos; no serializar los tickets completos.

**Que NO se hace en este ticket** (limites explicitos del scope):

- **`requiredResourceTypes`** (qué tipos de recurso requiere cada pieza) — fuera de alcance: curriculum-design no consume ese dato, academic-scheduling lo declara desde su propio mod. Se emite un aviso (ver Backlog).
- **Capacidad genérica del core** de "campo derivado de una colección de hijos" ni fila de totales en el listado — se resuelve con resolver propio del mod; la extensión genérica se propone después con la evidencia de este caso.
- **Objetos y cambios de academic-scheduling** (cluster, FKs, cupo, algoritmo) y el **spike de grano de matrícula** de engagement — los coordinan sus equipos.

**Tamano estimado**: 13 SP. 6 sessions ejecutables (S1-S6) mapeadas a los 3 hitos, distribuidas en ~1 semana de sprint. La más riesgosa es **S6 (Hito 3, retiro destructivo)**: `DROP COLUMN` en 18 schemas más la verificación de que el sync no revierte.

**Como vas a saber que funciona** (criterios de validacion observables, no tecnicos):

- Abres el catálogo de tipos de pieza y ves los 8 tipos cargados; lo recargas y no se duplican.
- Creas una modalidad con una pieza de 4h y otra de 2h, y su total muestra **6**; una modalidad sin piezas muestra **0**.
- En el formulario de edición del curso, cada modalidad muestra sus piezas y su total derivado, y ya no hay casillas para digitar horas.
- Tras el retiro, el modelo ya no tiene `theoryHours/practiceHours/labHours/autonomousHours`, las vistas de sílabo siguen coherentes, y una corrida de sync no revierte el cambio.

---

## Entregables y protocolo de ejecución

> Esta sección es NORMATIVA para execute. Define los 3 **entregables** (delivery milestones) como puntos de parada explícitos, la notificación al alcanzarlos, y el QA + juicio que cada uno debe pasar antes de declararse entregado.

### Los 3 entregables

| Entregable | = Hito | Sessions | Gate de cierre | Qué queda entregado | QA + juicio del entregable |
|-----------|--------|----------|----------------|---------------------|-----------------------------|
| **E1 — Objetos publicados (aditivo)** | Hito 1 | S1, S2 | **S2.GATE (T3)** | Catálogo `InstructionalComponentType` + RT `rt__InstructionalComponent__curricularsection` publicados en core (18 schemas, aditivo), FK apuntable. **Destraba a academic-scheduling.** Nada destructivo | Quality review DET-23 (10 dims) en S1.GATE y S2.GATE + smoke publish + `drift:check` + **dual-judge del incremento** (T3: 2 jueces ciegos aprueban) + verificación self-report DET-33 |
| **E2 — Modelo funcional en el mod** | Hito 2 | S3, S4, S5 | **S5.GATE (T3)** | Derivación de horas operativa, formulario con piezas + total, seed anidando, i18n. Las 4 columnas AÚN coexisten | Quality review DET-23 + **smoke runtime UPU (DET-36/RULE-029)** + dual-judge del incremento + DET-33 |
| **E3 — Retiro destructivo** | Hito 3 | S6 | **S6.GATE (T3)** | 4 columnas de horas retiradas (mod+core+18 schemas), no-revert verificado, regresión verde | Quality review DET-23 + regresión + no-revert (UPONE-1523) + dual-judge del incremento + acceptance final |

### Protocolo de parada y notificación (NORMATIVO)

1. **Parada dura en cada entregable**: al cerrar el gate de un entregable (S2.GATE / S5.GATE / S6.GATE), execute **SE DETIENE y notifica al dev**: *"Entregable N alcanzado — {resumen}; QA+jueces: {resultado}. ¿Continúo al siguiente?"*. Esta parada **anula** la continuidad de autopilot entre sessions (`super`/`true` no saltan un borde de entregable): un entregable es un incremento verificable que el dev debe poder inspeccionar/soltar. Los gates de session INTERNOS a un entregable (S1.GATE dentro de E1, S3/S4.GATE dentro de E2) siguen la política de autopilot normal (no paran en `super`).
2. **Ejecución acotada por entregable**: el dev puede pedir **"ejecuta hasta entregable N"** (o "hasta E1", "solo el primer entregable"). Execute corre las sessions de ese entregable hasta su gate de cierre inclusive, corre su QA+juicio, y **se detiene ahí** sin arrancar el siguiente. Por defecto (sin acotar), execute avanza entregable por entregable, parando en cada borde.
3. **Un entregable no está "entregado" hasta pasar su QA + juicio**: el gate de cierre del entregable exige quality review DET-23 en verde + el smoke/regresión que le corresponde + **dual-judge del incremento aprobado** (ambos jueces, por ser T3) + verificación self-report DET-33. Si el juicio da `iterate`, el entregable NO se declara alcanzado hasta corregir y re-juzgar; si da `escalate`, se detiene y se pide decisión humana.
4. **E1 es el primer punto de control**: es el entregable aislable que destraba a academic-scheduling. Se puede pedir "ejecuta hasta entregable 1" y quedará publicado en core, revisado por QA + 2 jueces, sin haber tocado nada destructivo ni el modelo funcional.

> El close del ticket sigue siendo always-ask (DET-30): ni siquiera E3 cierra el ticket sin OK del dev.

### Fiabilidad de E1 (contrato de coordinación) — por qué no habrá que tocarlo después

E1 es un **entregable de contrato**: academic-scheduling ancla su FK (en `Section`) al **id** de la pieza. Lo que anclan es la **identidad** (nombre `rt__InstructionalComponent__curricularsection` + que sea RT de `Modality` por `parentId` + el id = id de `CurricularSection`), NO el set de atributos. Garantías (ver REQ-10):

1. **Identidad congelada al publicar** (S2.T5 freeze): el aviso (S2.T6) sale solo tras fijar la identidad final; compromiso SP9 de no cambiarla (`kb/sp9/UPONE-1619-aviso-academic-scheduling.md:28-30`).
2. **Nada aguas abajo la rompe**: ninguna task de E2 (S3-S5) ni E3 (S6) modifica el JSON de la pieza ni del catálogo — verificado por diseño (el retiro destructivo de E3 opera sobre `rt__Modality__curricularsection`, objeto distinto). E2 agrega derivación por read-enrichment (no cambia el schema de la pieza) y layouts/i18n (aditivo/UI).
3. **Extensiones de academic-scheduling son de su lado**: sus campos (tipos de recurso) los declara su mod vía el merge del sync — aditivo, sin dependencia de nosotros.
4. **Cambios post-E1 aditivos-only**: agregar atributos a la pieza es seguro para la FK; rename/remove de identidad o de atributos publicados está prohibido por REQ-10.

Verificación en el gate de E1 (S2.GATE): identidad final confirmada + grep que muestra 0 modificaciones al object def de la pieza/catálogo en S3-S6 + dual-judge del incremento. Recién ahí E1 se declara "entregado" y se puede soltar a academic-scheduling con confianza.

## Purpose

Modelar `InstructionalComponent` (pieza de dictado) como RecordType anidado a `Modality` dentro del mod `curriculum-design`, derivar la carga horaria de la modalidad desde sus piezas por read-enrichment, retirar las 4 columnas de horas digitadas del modelo (mod + core), y publicar el modelo nuevo en `object-manager` (18 schemas). Actor principal: **diseñador curricular** (crea/edita piezas desde el formulario del curso); consumidores downstream: academic-scheduling y engagement. Valor: elimina las horas digitadas que no representan el dictado real y desbloquea a los equipos vecinos que esperan anclar sus objetos a la pieza.

## Requirements

### REQ-01: Catálogo `InstructionalComponentType`

> **Que cambia**: aparece un catálogo consultable de tipos de pieza de dictado con 8 tipos precargados (Cátedra, Práctica, Laboratorio, Taller, Seminario, Ayudantía, Clínica, Terreno). Al recargarlo no se duplican.
> **Por que**: el tipo de la pieza es un vocabulario que varía por país; modelarlo como objeto real (no enum) permite extenderlo sin tocar código (decidido SP9, H5).

El sistema MUST proveer un objeto catálogo `InstructionalComponentType` con `name` único, `code`, y `priority` opcional, sembrado de forma idempotente con los 8 tipos de la carga inicial.

**Actor**: system / diseñador curricular
**Layers**: database, api, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: carga inicial idempotente
- **GIVEN** el mod sincronizado en el tenant UPU
- **WHEN** se corre el seed dos veces
- **THEN** el conteo del catálogo es estable (8 tipos) y no hay filas duplicadas (guard por `name`, RULE-022)

#### Scenario: rechazo de nombre repetido
- **GIVEN** el catálogo con sus 8 tipos
- **WHEN** se intenta crear un tipo con un `name` ya existente
- **THEN** se rechaza (unicidad por `name`)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el catálogo de tipos de pieza y ve los 8 tipos cargados; lo recarga y no aparecen duplicados.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Seed idempotente | catálogo vacío | correr seed 2x | conteo estable | 8 filas, sin duplicados |
| 2 | Nombre repetido | catálogo cargado | crear tipo con name existente | rechazo | error de unicidad |

### REQ-02: RecordType `InstructionalComponent` anidado a Modality

> **Que cambia**: se puede crear una pieza de dictado colgando de una modalidad, con sus atributos (tipo, horas semanales, tamaño de grupo, docentes requeridos, y los demás acordados).
> **Por que**: la pieza es la unidad que academic-scheduling necesita para armar secciones; reusar el árbol de `CurricularSection` trae jerarquía y listado embebido ya construidos (SP9, H1/H10).

El sistema MUST proveer el RecordType `rt__InstructionalComponent__curricularsection` (noveno RT de `CurricularSection`), anidado a la Modality por `parentId`, con los 8 atributos: `componentTypeId` (FK escalar al catálogo), `hoursPerWeek`, `plannedGroupSize`, `requiredInstructorCount`, `deliveryLocation`, `synchronicity`, `isPrimary`, `requiresOwnSection`. NO declara `enableDataLog` (precedente de los RT hermanos).

**Actor**: diseñador curricular
**Layers**: database, api, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear pieza anidada
- **GIVEN** una Modality existente
- **WHEN** se crea un RecordType InstructionalComponent con `parentId = modalityId` y sus atributos
- **THEN** persiste una fila `CurricularSection` con `recordType=InstructionalComponent`, `parentId` correcto, y `componentTypeId` como id escalar (no relación en `include`)

#### Scenario: update base-only sin upsert espurio
- **GIVEN** una pieza existente
- **WHEN** se hace un update solo de campos base
- **THEN** no se dispara un upsert espurio de la proyección RT (RULE-036)

#### Scenario: FK escalar
- **GIVEN** la definición del RT
- **WHEN** el codegen genera el modelo
- **THEN** `componentTypeId` es id escalar, NO relación Prisma; no va en `include`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea una pieza bajo una modalidad y la ve anidada a ella con su tipo y horas.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Crear pieza anidada | Modality existente | create RT con parentId | fila persistida | recordType=InstructionalComponent, parentId=modalityId |
| 2 | Update base-only | pieza existente | update base | sin upsert RT | proyección RT intacta |
| 3 | Set de RTs declarados | test de RTs | correr recordtypes-declared | incluye el nuevo | conteo actualizado (14 RT) |

### REQ-03: Derivación de la carga horaria de la Modality (read-enrichment)

> **Que cambia**: la modalidad muestra su carga horaria calculada sumando las horas de sus piezas, en vez de un número digitado. 4h + 2h = 6; sin piezas = 0.
> **Por que**: las horas digitadas no representan el dictado real; derivarlas elimina la doble fuente de verdad (objetivo del PO).

El sistema MUST derivar el total de horas de la Modality como la suma de `hoursPerWeek` de sus piezas hijas, entregada por **read-enrichment** en el override `getInstance`/`listInstances` del mod (patrón `effectiveCredits`), NO por field resolver de tipo GraphQL (RULE-017).

**Actor**: system
**Layers**: backend (logic del mod)

<details><summary>Scenarios de validacion</summary>

#### Scenario: suma de piezas
- **GIVEN** una Modality con dos piezas de 4h y 2h
- **WHEN** se lee la Modality (getInstance/listInstances)
- **THEN** el total derivado es 6

#### Scenario: modalidad sin piezas
- **GIVEN** una Modality sin piezas
- **WHEN** se lee la Modality
- **THEN** el total derivado es 0

#### Scenario: sin field resolver GraphQL
- **GIVEN** el mod no puede registrar field resolvers (RULE-017)
- **WHEN** se implementa la derivación
- **THEN** vive en el read-enrichment del override, no en un field resolver de tipo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea una modalidad con piezas de 4h y 2h y ve el total 6; una sin piezas muestra 0.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | 4+2 | Modality con 2 piezas | getInstance | total | 6 |
| 2 | vacío | Modality sin piezas | getInstance | total | 0 |

### REQ-04: Formulario del curso — listado embebido anidado + total derivado, sin inputs de horas

> **Que cambia**: en el formulario de edición del curso, cada modalidad muestra sus piezas (listado embebido anidado) y su total derivado, y ya no ofrece casillas para digitar horas.
> **Por que**: es la superficie donde el diseñador declara las piezas; sin ella la capacidad nueva no es usable.

El sistema MUST mostrar, en el tab "Modalidades" de `default_Activity_edit`, un `record-list` embebido anidado de InstructionalComponent filtrado por `filters {{parentId}}` y `recordType`, junto con el total derivado, y MUST retirar los inputs de horas digitadas de la modalidad en el layout. El render real MUST verificarse en runtime (RULE-029), no solo en config, porque el RecordList filtra columnas a campos reales del objeto.

**Actor**: diseñador curricular
**Layers**: frontend (layouts config-driven), backend (read-enrichment de REQ-03)

<details><summary>Scenarios de validacion</summary>

#### Scenario: listado anidado + total en runtime
- **GIVEN** suite corriendo, tenant UPU, un curso con modalidades con piezas
- **WHEN** se abre RecordDetail del curso → tab Modalidades → detalle de Modality
- **THEN** se ve el listado embebido anidado de piezas y el total derivado renderizado (evidencia runtime real)

#### Scenario: sin inputs de horas digitadas
- **GIVEN** el formulario de edición del curso
- **WHEN** se inspeccionan los campos de la modalidad
- **THEN** no hay inputs para digitar theory/practice/lab/autonomous hours

#### Scenario: total derivado no renderiza (contingencia)
- **GIVEN** el total declarado en config
- **WHEN** el RecordList filtra columnas a campos reales y el total no aparece
- **THEN** se replantea la vía de presentación (ver Decisions, contingencia A3)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el formulario de un curso, entra a una modalidad, ve sus piezas listadas y el total; no encuentra casillas para escribir horas.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Render runtime | UPU, curso con piezas | abrir form → tab Modalidades | listado + total visibles | screenshot con piezas y total |
| 2 | Sin inputs de horas | form de curso | inspeccionar modalidad | inputs ausentes | 4 casillas no ofrecidas |

### REQ-05: Capabilities de los objetos nuevos cableadas a roles curriculares existentes

> **Que cambia**: los dos objetos nuevos (catálogo y pieza) quedan con permisos declarados y cableados a los roles curriculares que ya existen, sin crear roles nuevos.
> **Por que**: sin capabilities cableadas los objetos no son operables por los roles del mod; y coordinar con UPONE-1615 evita cablear a un modelo de roles que se está migrando.

El sistema MUST declarar las capabilities de `InstructionalComponentType` y `rt__InstructionalComponent__curricularsection` en `capabilities.json` y cablearlas a los 4 roles curriculares existentes en `seed/_data-rbac.js` (Consultor/Diseñador/Revisor/Autoridad Curricular), sin crear roles nuevos. El cableado MUST coordinarse con UPONE-1615 antes de escribir `_data-rbac.js`.

**Actor**: admin / system
**Layers**: config, database (seed RBAC)

<details><summary>Scenarios de validacion</summary>

#### Scenario: capabilities cableadas
- **GIVEN** los 2 objetos nuevos publicados
- **WHEN** se corre el seed de RBAC
- **THEN** los 4 roles curriculares tienen las capabilities de los objetos nuevos, sin roles nuevos creados

#### Scenario: coordinación con UPONE-1615
- **GIVEN** UPONE-1615 migra el mismo `_data-rbac.js`
- **WHEN** se va a escribir el cableado
- **THEN** se confirma con 1615 dónde se declara antes de escribir (no ejecutar ambos en paralelo sobre ese archivo)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: con un rol curricular, puede ver/crear/editar piezas y consultar el catálogo según su permiso.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | RBAC cableado | seed corrido | inspeccionar roles | capabilities presentes | 4 roles con permisos, 0 roles nuevos |

### REQ-06: i18n es/en/pt con paridad de keys

> **Que cambia**: los labels de los dos objetos nuevos, sus campos y los valores del catálogo existen en español, inglés y portugués con las mismas keys.
> **Por que**: en/pt están casi vacíos para RTs de CurricularSection hoy (H8); es trabajo nuevo, no replicación 1→3.

El sistema MUST proveer los labels de `InstructionalComponentType`, `rt__InstructionalComponent__curricularsection`, sus campos y los valores del catálogo en es/en/pt con paridad de keys, siguiendo la convención de i18n anidado bajo la clave del componente (RULE-020).

**Actor**: system
**Layers**: config (lang)

<details><summary>Scenarios de validacion</summary>

#### Scenario: paridad de keys
- **GIVEN** los archivos lang es/en/pt
- **WHEN** se comparan las keys de los objetos nuevos
- **THEN** las tres locales tienen el mismo set de keys, sin faltantes

</details>

#### Acceptance
**El usuario puede verificar que funciona**: cambia el idioma de la suite y ve los labels de las piezas y del catálogo traducidos en es/en/pt.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Paridad | 3 archivos lang | diff de keys | sets iguales | 0 keys faltantes |

### REQ-07: Seed loader anida piezas bajo la Modality + conteos idempotentes

> **Que cambia**: el ejemplo sembrado del sistema pasa a tener modalidades con piezas anidadas (ej. Presencial gana Cátedra 4h y Práctica 2h), y los conteos esperados quedan actualizados.
> **Por que**: el loader de sílabo hoy crea todos los nodos como raíz (sin `parentId`); anidar piezas es una capacidad nueva del loader (SP9, C1).

El sistema MUST extender el loader `_data-syllabus-sections.js` para resolver el `parentId` de la modalidad **solo en el caso de la pieza** (no alterar cómo nacen los otros 8 RT), reescribir los datos del seed con piezas hijas equivalentes, mantener la idempotencia, y actualizar `seed-counts.test.ts` + `docs/reference/seed-counts.md`. La coordinación del orden con UPONE-1541 (que toca el mismo seed) MUST respetarse.

**Actor**: system
**Layers**: backend (seed loader), config (datos del seed), tests, docs

<details><summary>Scenarios de validacion</summary>

#### Scenario: piezas anidadas por parentId
- **GIVEN** el loader extendido
- **WHEN** se corre el seed
- **THEN** las piezas se crean con `parentId` = id de la modalidad correspondiente

#### Scenario: re-seed idempotente
- **GIVEN** el seed corrido una vez
- **WHEN** se corre de nuevo
- **THEN** los conteos por recordType son estables y `seed-counts.test.ts` queda verde

#### Scenario: otros RT intactos
- **GIVEN** el caso especial acotado a la pieza (C1)
- **WHEN** se corre el seed completo
- **THEN** los conteos de los otros 8 RT no cambian por la extensión del loader

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre el seed y ve modalidades con sus piezas anidadas; lo corre de nuevo y los conteos no cambian.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Anidado por parentId | loader extendido | correr seed | piezas con parentId | parentId = modalityId |
| 2 | Idempotencia + conteos | seed corrido | re-seed | conteos estables | seed-counts verde |

### REQ-08: Retiro destructivo de las 4 columnas de horas digitadas

> **Que cambia**: `theoryHours/practiceHours/labHours/autonomousHours` desaparecen del modelo de la modalidad, en el JSON del mod, en el JSON publicado en core, y como columnas en los 18 schemas de tenant.
> **Por que**: es el objetivo final del PO (dejar de digitar horas); las columnas quedan como deuda y doble fuente de verdad mientras existan.

El sistema MUST retirar las 4 claves de horas del JSON del mod `rt__Modality__curricularsection.json` y de la heurística `resolveFieldKind.ts` (fuente del mod, no la copia sincronizada), retirarlas del RecordType publicado en `object-manager/objects/business/`, y aplicar la migración `DROP COLUMN` x4 en los 18 schemas. Antes del retiro MUST barrerse el inventario de consumidores (layouts del RT, layouts de sílabo, columnas del form de curso, heurística de tipo de campo) para no dejar referencias colgantes (RULE-009 blast radius). Este retiro es la **última session** (Hito 3) y se coordina con core (RULE-dev-004, ventana de migración).

**Actor**: system / core
**Layers**: config (JSON mod + core), database (migración 18 schemas), frontend (consumidores)

<details><summary>Scenarios de validacion</summary>

#### Scenario: columnas ausentes tras el retiro
- **GIVEN** el retiro aplicado (mod + core + migración)
- **WHEN** se inspecciona el JSON del mod, el JSON publicado en core y el schema Prisma
- **THEN** theory/practice/lab/autonomousHours están ausentes en los tres

#### Scenario: blast radius sin referencias colgantes
- **GIVEN** el inventario de consumidores barrido
- **WHEN** se corren las suites afectadas y un grep de las 4 claves
- **THEN** no quedan referencias colgantes a las 4 claves

#### Scenario: contingencia (drop diferido)
- **GIVEN** la ventana de coordinación con core no llega a tiempo
- **WHEN** se decide diferir el drop (contingencia B3)
- **THEN** se crea ticket propio enlazado y este ticket declara explícitamente que las columnas siguen existiendo al cerrar

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras el cambio, el modelo de la modalidad ya no tiene columnas de horas y ninguna vista queda con columnas rotas ni campos vacíos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Columnas ausentes | post-sync + migrate | inspeccionar schema/JSON | 4 claves ausentes | mod + core + Prisma sin las 4 |
| 2 | Blast radius | grep + suites | correr regression | sin refs colgantes | 0 referencias a las 4 claves |

### REQ-09: Publicación y persistencia efectiva en core

> **Que cambia**: el catálogo y el RecordType nuevos figuran publicados en `object-manager/objects/business/` con sus tablas en los 18 schemas, y el retiro de las 4 columnas queda commiteado en core de modo que una corrida posterior de sync no lo revierte.
> **Por que**: el merge del sync es append-only (RULE-043); sin intervenir y commitear el mergeado en core, el retiro se deshace solo y la FK de academic-scheduling no tiene objeto publicado al que apuntar.

El sistema MUST publicar los dos objetos nuevos en `object-manager/objects/business/` (mirror 1:1 vía `npm run sync` fase 1/2 + codegen), regenerar los 18 `prisma/<TENANT>/schema.prisma` + BASEMODEL y los typeDefs, y commitear en `object-manager` con el id UPONE-1619. Para el retiro (REQ-08), MUST borrar el mergeado, regenerar con `sync:files`, commitear, y **verificar que una corrida posterior de sync NO revierte** el retiro (modo de falla documentado en UPONE-1523).

**Actor**: system / core
**Layers**: config (core objects), database (18 schemas + BASEMODEL), api (typeDefs)

<details><summary>Scenarios de validacion</summary>

#### Scenario: publicación aditiva verificable
- **GIVEN** los 2 objetos declarados en el mod
- **WHEN** se corre sync + codegen + tenant:migrate aditivo
- **THEN** las tablas de los 2 objetos existen en los 18 schemas, están git-tracked en core, y la FK de academic-scheduling puede apuntar

#### Scenario: retiro no revierte
- **GIVEN** el retiro commiteado en core
- **WHEN** se corre una nueva pasada de sync
- **THEN** las 4 columnas NO reaparecen (retiro estable)

#### Scenario: sin drift
- **GIVEN** el cambio aplicado por tenant
- **WHEN** se corre `drift:check`
- **THEN** verde, sin drift entre tenants

</details>

#### Acceptance
**El usuario puede verificar que funciona**: los objetos nuevos figuran en `object-manager/objects/business/` con commits UPONE-1619, y una corrida de sync posterior no revierte el retiro.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Publicación aditiva | 2 objetos en mod | sync + migrate | tablas en 18 schemas | git-tracked, FK apuntable |
| 2 | No-revert | retiro commiteado | re-run sync | columnas no reaparecen | retiro estable |
| 3 | Sin drift | cambio por tenant | drift:check | verde | 0 drift |

### REQ-10: E1 es un contrato congelado (durabilidad del entregable de coordinación)

> **Que cambia**: E1 publica objetos a los que otro equipo (academic-scheduling) ancla su FK. Su identidad debe quedar congelada al publicar.
> **Por que**: un cambio de identidad post-publicación (rename, cambio del id/FK target, dejar de ser RT de Modality) rompe la integración de academic-scheduling. Compromiso literal SP9 (`kb/sp9/UPONE-1619-aviso-academic-scheduling.md:28-30`).

El sistema MUST congelar, al publicar en E1 (S2.T5), la **identidad canónica** de la pieza — nombre `rt__InstructionalComponent__curricularsection`, que sea RecordType de `Modality` por `parentId`, y el campo `id` (= id de `CurricularSection`) al que apunta la FK de `Section` — y del catálogo `InstructionalComponentType`. Después de E1, todo cambio a estos objetos MUST ser **aditivo** (agregar atributos), nunca rename/remove de la identidad ni de atributos publicados. Los campos que academic-scheduling necesite (p.ej. tipos de recurso) los declara **desde su propio mod** vía el merge del sync; curriculum-design no los agrega (fuera de alcance). El retiro destructivo (E3) opera sobre `rt__Modality__curricularsection`, un objeto DISTINTO — no toca la pieza ni el catálogo.

<details><summary>Test scenarios</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Identidad frozen | pieza publicada en E1 | inspeccionar nombre/id/parentId | identidad = la del aviso | estable, sin "por confirmar" |
| 2 | No breaking downstream | E2 + E3 ejecutados | grep del JSON de pieza/catálogo en S3-S6 | 0 modificaciones al object def de la pieza/catálogo | contrato intacto |
| 3 | Extensión aditiva | academic-scheduling declara campos | sync merge | campos sumados sin tocar identidad | FK sigue apuntando |
| 4 | E3 no toca la pieza | retiro destructivo en S6 | inspeccionar target | solo `rt__Modality`, no la pieza | contrato E1 no afectado |

</details>

### REQ-PRESERVE-01: Regla de una sola modalidad por defecto por dueño

> **Que cambia**: nada — la regla de una modalidad por defecto por dueño sigue vigente después del cambio.
> **Por que**: el guard de modalidad por defecto (`modalityDefault.js`) no lee horas, pero el retiro toca el mismo RT; hay que confirmar que no se rompe.

El sistema MUST preservar la regla de una sola modalidad por defecto por dueño tras el retiro de las columnas de horas.

**Actor**: system
**Layers**: backend (guard)

<details><summary>Scenarios de validacion</summary>

#### Scenario: guard intacto
- **GIVEN** el retiro aplicado
- **WHEN** se corre la regresión del guard de modalidad por defecto
- **THEN** sigue garantizando una sola modalidad por defecto por dueño

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intenta marcar dos modalidades por defecto para el mismo dueño y el sistema lo impide, igual que antes.

### REQ-PRESERVE-02: Vistas de sílabo coherentes tras el retiro

> **Que cambia**: nada visible se rompe — las vistas de sílabo que hoy muestran horas de la modalidad siguen mostrando información coherente, sin columnas rotas ni campos vacíos.
> **Por que**: `default_Offering_syllabus_{view,edit}` leen `theoryHours`/`practiceHours`; al retirarlas hay que reapuntarlas.

El sistema MUST reapuntar los layouts de sílabo (`default_Offering_syllabus_{view,edit}`) que leen las claves de horas, de modo que tras el retiro no queden campos vacíos ni columnas rotas.

**Actor**: diseñador curricular
**Layers**: frontend (layouts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: sílabo coherente
- **GIVEN** el retiro aplicado y los layouts reapuntados
- **WHEN** se abren las dos vistas de sílabo
- **THEN** no hay campos vacíos ni columnas rotas; la información es coherente

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre las vistas de sílabo tras el cambio y no ve columnas rotas ni casillas vacías.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | Capabilities de los objetos nuevos cableadas a roles existentes (sin roles nuevos) | RBAC | 4 roles curriculares con permisos declarados |
| Scale | Migración destructiva por tenant | schemas afectados | `DROP COLUMN` x4 aplicado en 18 schemas + BASEMODEL, sin drift |
| Accessibility | Listado anidado de piezas en el form de curso accesible | WCAG | listado navegable, tokens `var(--up1-*)` en UI nueva |

## Artifacts

> **DET-32 (necesidad/reuso)** aplicado por artefacto: la mayoría **reusa** mecanismos que el core ya expone (árbol de CurricularSection, listado embebido `{{parentId}}`, patrón effectiveCredits de read-enrichment, patrón ResourceTypes/config-resourcetypes de catálogo, patrón createNode del loader). Se **construyen** solo los 2 objetos nuevos + su seed + su resolver de derivación + sus layouts. Veredicto agregado: **mixed (build + reuse)** — ver Decisions. Veredicto Aduana SP9: los 7 artefactos son `mod-only` (ninguno escala a core por genericidad), aunque la publicación en core es mecánica del sync (REQ-09).

### Models

| Table | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| InstructionalComponentType | name | String | no | — | Nombre del tipo (único) |
| InstructionalComponentType | code | String | sí | — | Código corto del tipo |
| InstructionalComponentType | priority | Int | sí | — | Orden/prioridad opcional (patrón ResourceTypes) |
| rt__InstructionalComponent__curricularsection | curricularsectionId | String | no (PK) | — | Id de la fila CurricularSection (proyección RT) |
| rt__InstructionalComponent__curricularsection | componentTypeId | String | required (en `required[]`) | — | FK escalar al catálogo (no relación Prisma, no en include). Requerido: una pieza sin tipo no es válida (TC de rechazo) |
| rt__InstructionalComponent__curricularsection | hoursPerWeek | Int | required (en `required[]`) | — | Horas semanales de la pieza (base de la derivación). Requerido: la derivación del total depende de él |
| rt__InstructionalComponent__curricularsection | plannedGroupSize | Int | sí | — | Tamaño de grupo planificado |
| rt__InstructionalComponent__curricularsection | requiredInstructorCount | Int | sí | — | Cantidad de docentes requeridos |
| rt__InstructionalComponent__curricularsection | deliveryLocation | String | sí | — | Lugar de dictado |
| rt__InstructionalComponent__curricularsection | synchronicity | String | sí | — | Sincronía (enum soft, RULE-016) |
| rt__InstructionalComponent__curricularsection | isPrimary | Boolean | sí | — | Marca de pieza primaria |
| rt__InstructionalComponent__curricularsection | requiresOwnSection | Boolean | sí | — | Requiere sección propia |

> La nullability efectiva la decide `required[]` del JSON, no `not_null` (RULE-018). **Decisión (cerrada, DET-1)**: `componentTypeId` y `hoursPerWeek` van en `required[]`; los otros 6 atributos (plannedGroupSize, requiredInstructorCount, deliveryLocation, synchronicity, isPrimary, requiresOwnSection) son opcionales. Razón: una pieza sin tipo no es válida y la derivación depende de hoursPerWeek; el resto puede completarse luego. La pieza NO declara `enableDataLog` (precedente RT hermanos).

**Relations**:
| From | To | Type | FK | On delete |
|------|----|------|----|-----------|
| rt__InstructionalComponent__curricularsection | CurricularSection (Modality) | parentId (self-FK del árbol) | parentId | (app-layer, sin integridad referencial) |
| rt__InstructionalComponent__curricularsection | InstructionalComponentType | belongsTo (FK escalar) | componentTypeId | (app-layer, RULE-013) |

**Retiro (REQ-08)** — columnas eliminadas de `rt__Modality__curricularsection`:
| Column | Type | Acción |
|--------|------|--------|
| theoryHours | Int? | DROP en mod + core + 18 schemas |
| practiceHours | Int? | DROP en mod + core + 18 schemas |
| labHours | Int? | DROP en mod + core + 18 schemas |
| autonomousHours | Int? | DROP en mod + core + 18 schemas |

### Objetos JSON (nuevos)
- `mods/curriculum-design/objects/InstructionalComponentType.json` — catálogo (build). Patrón: `mods/academic-scheduling/objects/ResourceTypes.json`.
- `mods/curriculum-design/objects/RecordTypes/rt__InstructionalComponent__curricularsection.json` — pieza (build). Patrón: `rt__EvaluationComponent__curricularsection.json`.

### Seed (nuevo + modificado)
- `mods/curriculum-design/seed/config-instructionalcomponenttype.js` — seed idempotente del catálogo (build). Patrón: `seed/config-resourcetypes.js` (academic-scheduling).
- `mods/curriculum-design/seed/_data-syllabus-sections.js` — extender loader para `parentId` en caso pieza + datos (modify).
- `mods/curriculum-design/seed/_data-rbac.js` + `capabilities.json` — capabilities de los 2 objetos nuevos (modify, coordinar UPONE-1615).

### Layouts (nuevos + modificados)
- `default_rt__InstructionalComponent__curricularsection_{list,view,create,edit}.json` — nuevos (build), convención de nombre por RT (RULE-012), campos base requeridos en create/edit (RULE-023).
- `default_Activity_edit.json` — tab Modalidades: record-list anidado + total, retiro de inputs de horas (modify).
- `default_Offering_syllabus_{view,edit}.json` — reapuntar (modify, REQ-PRESERVE-02).
- `default_rt__Modality__curricularsection_{view,edit,create}.json` — retiro de las 4 claves de horas (modify, REQ-08).

### Logic (nuevo + modificado)
- `mods/curriculum-design/logic/helpers/instructionalHours.js` — helper puro suma de horas (build). Patrón: `helpers/effectiveCredits.js`.
- `mods/curriculum-design/logic/curriculum-read.resolver.js` — override getInstance/listInstances con read-enrichment del total (modify, RULE-017).

### Componentes / heurística (modificado)
- `mods/curriculum-design/modsComponents/CompositeSectionTree/resolveFieldKind.ts` — retirar las 4 claves de horas nombradas por string (modify; editar la fuente del mod, NO la copia sincronizada en `layout/src/modsComponents/`).

### Core (publicación, REQ-09)
- `object-manager/objects/business/Base/instructionalcomponenttype.json` + `object-manager/objects/business/RecordTypes/rt__InstructionalComponent__curricularsection.json` — publicados por sync (commit UPONE-1619).
- `object-manager/objects/business/RecordTypes/rt__Modality__curricularsection.json` — retiro del mergeado (borrar + regenerar + commitear).
- `object-manager/prisma/<TENANT>/schema.prisma` (18) + BASEMODEL + `src/graphql/typeDefs/dynamic.js` — regenerados.

### Tests + docs (modificado)
- `tests/integration/recordtypes-declared.test.ts` — incluir el 9º RT de secciones (modify).
- `tests/integration/seed-counts.test.ts` + `docs/reference/seed-counts.md` — conteos actualizados (modify, coordinar UPONE-1541).
- `mods/curriculum-design/lang/{es,en,pt}/` — labels nuevos con paridad (modify/build, REQ-06).

## Tasks

> **DET-20 numeracion**: el ticket no tiene `### Session N` registradas en `## Sessions` (solo el "Plan de sessions" preliminar). El plan arranca en **S1**. Mapeo a hitos: S1-S2 = Hito 1 (aditivo); S3-S5 = Hito 2 (funcional); S6 = Hito 3 (destructivo). Orden interno SP9: `1A → 1B → 1C-a → 1E-a → 1E-b → 1D → 1C-b → 1C-c`.

### Session 1 — Hito 1: Catálogo InstructionalComponentType (1A) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear objeto catálogo `InstructionalComponentType.json` (name unique, code, priority opcional); patrón ResourceTypes | REQ-01 | developer | — | mods/curriculum-design/objects/InstructionalComponentType.json | lint JSON + shape vs ResourceTypes | git revert (rm archivo) | DET-1, DET-2, RULE-curriculum-design-016 | pending | 1 |
| S1.T2 | Crear seed idempotente del catálogo (8 tipos, guard por name) + enganchar en seed | REQ-01 | developer | S1.T1 | mods/curriculum-design/seed/config-instructionalcomponenttype.js, mods/curriculum-design/seed/seed.js | correr seed 2x sin duplicar | git revert | DET-2, RULE-curriculum-design-022 | pending | 1 |
| S1.T3 | Test integración: seed catálogo idempotente + rechaza name repetido | REQ-01 | developer | S1.T2 | mods/curriculum-design/tests/integration/ | vitest verde (assertions concretas: 8 filas, rechazo dup) | git revert | DET-7, DET-13 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions`, correr validación, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Hito 1: RecordType pieza + publicación aditiva en core (1B + publish) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `rt__InstructionalComponent__curricularsection.json` (8 atributos, componentTypeId FK escalar, parentId, sin enableDataLog; `required[]` = [componentTypeId, hoursPerWeek], resto opcional — decisión cerrada) | REQ-02 | developer | S1.GATE | mods/curriculum-design/objects/RecordTypes/rt__InstructionalComponent__curricularsection.json | lint JSON + shape vs rt__EvaluationComponent | git revert (rm) | DET-1, DET-2, RULE-curriculum-design-013, RULE-curriculum-design-018, RULE-curriculum-design-027 | pending | 2 |
| S2.T2 | Crear 4 layouts `default_rt__InstructionalComponent__curricularsection_{list,view,create,edit}.json` (FK reference al catálogo, campos required en create/edit) | REQ-02 | developer | S2.T1 | mods/curriculum-design/config/layouts/default_rt__InstructionalComponent__curricularsection_list.json, _view.json, _create.json, _edit.json | lint JSON + render UI | git revert (rm) | DET-2, RULE-curriculum-design-012, RULE-curriculum-design-023 | pending | 2 |
| S2.T3 | Declarar capabilities de los 2 objetos nuevos + cablear a los 4 roles curriculares (coordinar UPONE-1615 antes de escribir _data-rbac.js) | REQ-05 | developer | S2.T1 | mods/curriculum-design/capabilities.json, mods/curriculum-design/seed/_data-rbac.js | seed RBAC verde + inspección de roles | git revert | DET-2, DET-16, RULE-curriculum-design-048 | pending | 2 |
| S2.T4 | Actualizar `recordtypes-declared.test.ts` para incluir el 9º RT de secciones | REQ-02 | developer | S2.T1 | mods/curriculum-design/tests/integration/recordtypes-declared.test.ts | vitest verde (conteo RT actualizado) | git revert | DET-7, DET-13 | pending | 2 |
| S2.T5 | **Freeze de identidad + publicación aditiva en core**: (a) FIJAR y verificar la identidad canónica FINAL antes de publicar — nombre del RT `rt__InstructionalComponent__curricularsection`, que sea RT de Modality por `parentId`, y el campo `id` (= id de CurricularSection) al que anclará la FK de `Section`; (b) `npm run sync` (mirror+merge+codegen) + `tenant:migrate` aditivo (crea tablas) en 18 schemas + objetos git-tracked en `objects/business/` + FK apuntable; commit UPONE-1619 en object-manager. Post-freeze SOLO cambios aditivos a la pieza | REQ-09, REQ-10 | developer | S2.T1, S2.T2, S2.T3 | object-manager (sync), object-manager/objects/business/, object-manager/prisma/ | identidad final confirmada + grep modelos en 18 schema.prisma + git ls-files + drift:check verde | restaurar objects/business + regenerar (no accept-data-loss) | DET-5, DET-8, DET-13, RULE-curriculum-design-010 | pending | 2 |
| S2.T6 | Aviso a academic-scheduling **solo tras el freeze de identidad confirmado en S2.T5**: nombre, RT de Modality, id de la FK — texto en kb/sp9/UPONE-1619-aviso-academic-scheduling.md. El aviso comunica el contrato congelado (identidad estable, cambios posteriores aditivos-only) | REQ-10 | researcher | S2.T5 | (comunicación) | aviso enviado con identidad final (no "por confirmar") | (no aplica) | DET-9, DET-16 | pending | 2 |
| **S2.GATE** | **★ GATE DE ENTREGABLE E1 (tier: T3)** — cierra Hito 1. Quality review DET-23 + smoke publish + drift:check + **dual-judge del incremento** + DET-33. **PARADA DURA + notificar al dev** "Entregable 1 alcanzado" (anula continuidad autopilot); esperar OK para seguir a E2 | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4, S2.T5, S2.T6 | ticket | gate persistido + decisión + dual-judge approved + notificación al dev | (no aplica) | DET-20, DET-23, DET-33, DET-38 | pending | 2 |

### Session 3 — Hito 2: Derivación de carga horaria (read-enrichment, 1C-a) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Crear helper puro `instructionalHours.js` (suma de hoursPerWeek de piezas hijas) | REQ-03 | developer | S2.GATE | mods/curriculum-design/logic/helpers/instructionalHours.js | vitest unit (4+2=6, 0 sin piezas) | git revert (rm) | DET-1, DET-2 | pending | 3 |
| S3.T2 | Override getInstance/listInstances del mod para enriquecer el total en la Modality (read-enrichment, NO field resolver) | REQ-03 | developer | S3.T1 | mods/curriculum-design/logic/curriculum-read.resolver.js | integración: total derivado en read de Modality | git revert | DET-5, DET-8, RULE-curriculum-design-017 | pending | 3 |
| S3.T3 | Tests derivación: 4+2=6, 0 sin piezas, update base-only sin upsert espurio | REQ-03, REQ-02 | developer | S3.T2 | mods/curriculum-design/tests/integration/ | vitest verde (assertions concretas) | git revert | DET-7, DET-13 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-23 | pending | 3 |

### Session 4 — Hito 2: Seed loader + datos + conteos (1E-a, 1E-b) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Extender loader `_data-syllabus-sections.js` para resolver parentId solo en caso pieza (C1, no alterar otros RT) | REQ-07 | developer | S3.GATE | mods/curriculum-design/seed/_data-syllabus-sections.js | correr seed: piezas con parentId correcto | git revert | DET-5, DET-8 | pending | 4 |
| S4.T2 | Reescribir datos del seed: Modality con piezas hijas (Presencial: Cátedra 4h + Práctica 2h) | REQ-07 | developer | S4.T1 | mods/curriculum-design/seed/_data-syllabus-sections.js | seed corrido, piezas anidadas visibles | git revert | DET-2 | pending | 4 |
| S4.T3 | Actualizar `seed-counts.test.ts` + `docs/reference/seed-counts.md` (conteos por recordType; coordinar UPONE-1541) | REQ-07 | developer | S4.T2 | mods/curriculum-design/tests/integration/seed-counts.test.ts, mods/curriculum-design/docs/reference/seed-counts.md | vitest verde con conteos actualizados | git revert | DET-7, DET-16 | pending | 4 |
| S4.T4 | Re-seed idempotente 2x + verificar conteos estables y otros 8 RT intactos | REQ-07 | reviewer | S4.T3 | mods/curriculum-design/seed/ | seed 2x sin duplicar, conteos estables | (no aplica) | DET-7, DET-13, RULE-curriculum-design-022 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-23 | pending | 4 |

### Session 5 — Hito 2: Formulario + i18n + smoke (1D + i18n + smoke) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S5.T1, S5.T2, S5.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Ajustar `default_Activity_edit.json` tab Modalidades: record-list embebido anidado de piezas (filters {{parentId}}, recordType) + total derivado, retirar inputs de horas | REQ-04 | developer | S4.GATE | mods/curriculum-design/config/layouts/default_Activity_edit.json | lint JSON + preparado para smoke | git revert | DET-2, RULE-curriculum-design-027 | pending | 5 |
| S5.T2 | Reapuntar `default_Offering_syllabus_{view,edit}.json` (leen theory/practice hours) | REQ-PRESERVE-02 | developer | S4.GATE | mods/curriculum-design/config/layouts/default_Offering_syllabus_view.json, default_Offering_syllabus_edit.json | lint JSON + preparado para smoke | git revert | DET-2, DET-16 | pending | 5 |
| S5.T3 | i18n es/en/pt paridad de InstructionalComponent (RT + campos + valores del catálogo), trabajo nuevo H8 | REQ-06 | developer | S4.GATE | mods/curriculum-design/lang/es/, mods/curriculum-design/lang/en/, mods/curriculum-design/lang/pt/ | diff de keys: sets iguales, 0 faltantes | git revert | DET-2, RULE-curriculum-design-020 | pending | 5 |
| S5.T4 | Sync + smoke UI runtime en UPU: abrir RecordDetail curso → tab Modalidades → detalle Modality; verificar listado anidado + total derivado renderiza (render real, no config) | REQ-04 | reviewer | S5.T1, S5.T2, S5.T3 | object-manager (sync), suite (UI), tenant UPU | screenshot runtime con piezas + total; console limpio | (no aplica) | DET-13, DET-23, DET-36, RULE-curriculum-design-029 | pending | 5 |
| **S5.GATE** | **★ GATE DE ENTREGABLE E2 (tier: T3)** — cierra Hito 2 (modelo funcional; las 4 columnas aún coexisten). Quality review DET-23 + smoke runtime UPU (DET-36) + **dual-judge del incremento** + DET-33. **PARADA DURA + notificar al dev** "Entregable 2 alcanzado"; esperar OK para seguir a E3 | — | reviewer | S5.T1, S5.T2, S5.T3, S5.T4 | ticket | gate persistido + decisión + dual-judge approved + notificación al dev | (no aplica) | DET-20, DET-23, DET-33, DET-36, DET-38 | pending | 5 |

### Session 6 — Hito 3: Retiro destructivo de columnas de horas (1C-b + 1C-c) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Barrido del inventario de consumidores de las 4 claves (layouts RT, layouts sílabo, columnas form curso, heurística resolveFieldKind.ts) | REQ-08 | researcher | S5.GATE | mods/curriculum-design/config/layouts/, mods/curriculum-design/modsComponents/CompositeSectionTree/resolveFieldKind.ts | inventario completo documentado (grep de las 4 claves) | (no aplica) | DET-5, DET-16, RULE-curriculum-design-009 | pending | 6 |
| S6.T2 | Quitar 4 claves de horas del JSON del mod + de `resolveFieldKind.ts` (fuente del mod, NO la copia sincronizada) | REQ-08 | developer | S6.T1 | mods/curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json, mods/curriculum-design/config/layouts/default_rt__Modality__curricularsection_{view,edit,create}.json, mods/curriculum-design/modsComponents/CompositeSectionTree/resolveFieldKind.ts | grep: 4 claves ausentes en el mod | restaurar JSON + regenerar | DET-5, DET-8, RULE-curriculum-design-043, RULE-curriculum-design-009 | pending | 6 |
| S6.T3 | Retiro efectivo en core: borrar el mergeado `object-manager/objects/business/RecordTypes/rt__Modality__curricularsection.json`, regenerar con `sync:files`, codegen, commitear UPONE-1619 | REQ-08, REQ-09 | developer | S6.T2 | object-manager/objects/business/RecordTypes/rt__Modality__curricularsection.json, object-manager/prisma/ | grep: 4 claves ausentes en core + typeDefs regenerados | restaurar mergeado + regenerar | DET-5, DET-8, RULE-curriculum-design-043 | pending | 6 |
| S6.T4 | Migración `DROP COLUMN` x4 en 18 schemas + BASEMODEL (ventana coordinada con core, RULE-dev-004) | REQ-08 | developer | S6.T3 | object-manager/prisma/<TENANT>/schema.prisma (18) + BASEMODEL | tenant:migrate + drift:check verde; 4 columnas ausentes en Prisma | recrear la columna via JSON + codegen — **recuperación de ESQUEMA únicamente, NO de dato**; aceptable porque SP9 confirmó que no hay dato productivo en up1 (solo dato de seed, re-sembrable) | DET-5, DET-8, RULE-curriculum-design-009 | pending | 6 |
| S6.T5 | Verificar que una corrida posterior de sync NO revierte el retiro (H10, procedimiento UPONE-1523) | REQ-09 | reviewer | S6.T4 | object-manager (sync) | re-run sync: 4 columnas no reaparecen | (no aplica) | DET-5, DET-13, DET-33, RULE-curriculum-design-043 | pending | 6 |
| S6.T6 | Regresión: blast radius (sin refs colgantes), modalidad por defecto (guard), sílabo coherente, seed-counts verde | REQ-08, REQ-PRESERVE-01, REQ-PRESERVE-02 | reviewer | S6.T4 | mods/curriculum-design/tests/, suite (UI sílabo) | suites verdes + grep 0 refs + smoke sílabo | (no aplica) | DET-7, DET-13, DET-23, RULE-curriculum-design-009, RULE-curriculum-design-029 | pending | 6 |
| S6.T7 | Docs oficiales del proyecto (cambio observable: modelo/capability/campos que desaparecen) + MCP (UPONE-1530): cubierto o N/A con motivo | AC-MCP (MCP) + DET-37 (planning-completeness docs) | developer | S6.T4 | mods/curriculum-design/docs/, docs/ | docs actualizados; decisión MCP registrada | git revert | DET-16, DET-37, RULE-curriculum-design-006 | pending | 6 |
| **S6.GATE** | **★ GATE DE ENTREGABLE E3 (tier: T3)** — cierra Hito 3 (retiro destructivo aplicado + no-revert verificado). Quality review DET-23 + regresión + no-revert (UPONE-1523) + **dual-judge del incremento** + acceptance final. **PARADA DURA + notificar al dev** "Entregable 3 alcanzado"; close del ticket sigue always-ask (DET-30) | — | reviewer | S6.T1, S6.T2, S6.T3, S6.T4, S6.T5, S6.T6, S6.T7 | ticket | gate persistido + decisión + dual-judge approved + notificación al dev | (no aplica) | DET-20, DET-23, DET-33, DET-36, DET-38 | pending | 6 |

### Task contract (referencia extendida de tasks de riesgo)

```
Task S2.T5: Publicación aditiva en core
- source_ref: REQ-09
- agent: developer
- files: object-manager/objects/business/{Base,RecordTypes}/, object-manager/prisma/<TENANT>/schema.prisma (18) + BASEMODEL, src/graphql/typeDefs/dynamic.js
- precondition: objetos declarados en el mod (S2.T1-T3); ventana no destructiva
- expected_output: 2 objetos nuevos git-tracked en objects/business/, tablas creadas en 18 schemas, FK de academic-scheduling apuntable, commit UPONE-1619
- validation: grep de modelos en los 18 schema.prisma + git ls-files objects/business/ + drift:check verde
- rollback: restaurar objects/business + regenerar (aditivo, sin accept-data-loss)
- rules: [DET-5, DET-8, DET-13, RULE-curriculum-design-010]

Task S6.T3: Retiro efectivo en core (append-only workaround)
- source_ref: REQ-08, REQ-09
- agent: developer
- files: object-manager/objects/business/RecordTypes/rt__Modality__curricularsection.json, object-manager/prisma/
- precondition: 4 claves retiradas del JSON del mod (S6.T2)
- expected_output: mergeado regenerado sin las 4 claves, commiteado UPONE-1619
- validation: grep de las 4 claves ausentes en core + typeDefs regenerados
- rollback: restaurar el mergeado + regenerar
- rules: [DET-5, DET-8, RULE-curriculum-design-043]

Task S6.T4: Migración DROP COLUMN (destructiva)
- source_ref: REQ-08
- agent: developer
- files: object-manager/prisma/<TENANT>/schema.prisma (18) + BASEMODEL
- precondition: retiro en core commiteado (S6.T3); ventana de coordinación con core acordada (RULE-dev-004)
- expected_output: 4 columnas ausentes en los 18 schemas, sin drift
- validation: tenant:migrate por tenant + drift:check verde
- rollback: recrear la columna vía JSON + codegen — recupera el ESQUEMA, NO el dato (un DROP COLUMN no es reversible a nivel dato). Aceptable: SP9 confirmó que en up1 no hay dato productivo, solo dato de seed re-sembrable
- rules: [DET-5, DET-8, RULE-curriculum-design-009]
```

## Constraints

- RULE-curriculum-design-017 (must): un mod NO registra field resolvers de tipo GraphQL — la derivación (REQ-03) va por read-enrichment.
- RULE-curriculum-design-043 (must): el merge del sync es append-only — el retiro (REQ-08) exige tocar el JSON del mod Y del core y commitear (REQ-09).
- RULE-curriculum-design-027 (should): embedding de hijos como tabs por record-list + `{{parentId}}` (no `metadata.directChildren`) — gobierna el listado anidado (REQ-04).
- RULE-curriculum-design-022 (should): seed idempotente con guard por label/name — catálogo (REQ-01) y piezas (REQ-07).
- RULE-curriculum-design-023 (should): campo base requerido sin static_default debe estar en los layouts create/edit del RT.
- RULE-curriculum-design-016 (should): el enum de un campo `rt__*` es soft (UI/MCP, no backend) — aplica a `synchronicity` si se modela como enum.
- RULE-curriculum-design-018 (must): el codegen ignora `metadata.indexes`; la nullability la decide `required[]`, no `not_null`.
- RULE-curriculum-design-013 (must): FK polimórfica/escalar sin integridad referencial — validar en capa app (`componentTypeId`, `parentId`).
- RULE-curriculum-design-010 (must): objeto que pasa a mod-defined puede dejar un Base override stale que sombree la def — verificar al publicar en core.
- RULE-curriculum-design-009 (must): adaptar a reducción de modelo: liveness contra el git del core + blast radius sobre todos los objetos reducidos — retiro (REQ-08).
- RULE-curriculum-design-044 (should): default layouts del mod se siembran por dbSync Phase 5.
- RULE-curriculum-design-012 (should): layouts por RecordType por convención `default_rt__<RT>__<base>_<mode>.json`.
- RULE-curriculum-design-048 (should): el `roles[]` de un layout declara el rol institucional real.
- RULE-curriculum-design-020 (should): i18n de componente anidado bajo su clave, no archivo con claves planas.
- RULE-curriculum-design-029 (must): smoke visual obligatorio para features UI antes de cerrar — REQ-04.
- RULE-curriculum-design-006 (must): `Activity` es co-definido por curriculum-design + uengagement-up1 — cuidado al tocar layouts de Activity.
- DET-19: en artefactos del repo (commits/branches/PRs) usar el id externo UPONE-1619; records DKC usan TICKET-134.
- RULE-dev-004 / core_work_policy: el trabajo en core (object-manager, 18 schemas) se coordina con el equipo up1; la migración destructiva tiene ventana propia.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| object-manager (core) | internal | Publicación de objetos + regeneración de 18 schemas + BASEMODEL + typeDefs; migración destructiva | Ventana de coordinación no llega a tiempo → contingencia B3 (diferir drop) |
| UPONE-1615 (TICKET-133) | internal | Migra el mismo `seed/_data-rbac.js` donde este ticket declara capabilities | Colisión sobre el archivo → coordinar dónde se declara el cableado, no ejecutar en paralelo |
| UPONE-1541 (TICKET-135) | internal | Toca `_data-requirement.js` pero comparte `seed-counts.test.ts` + `seed-counts.md` + la corrida del seed | Pisarse en conteos → coordinar orden, no serializar tickets completos |
| UPONE-1530 (TICKET-137) | internal | Acuerdo de sincronización con el MCP del sprint | MCP no cubierto → marcar N/A con motivo (AC-MCP) |
| academic-scheduling | external (downstream) | Espera el objeto publicado (Hito 1) para reactivar su FK diferida | Cambiar la identidad del objeto tras publicar rompe su FK → no cambiarla |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El retiro se revierte solo (append-only del merge, sin commit en core) | medium | high | S6.T3 borra+regenera+commitea el mergeado; S6.T5 verifica no-revert (procedimiento UPONE-1523) |
| El total derivado no renderiza en el listado (filtra columnas a campos reales) | medium | medium | Smoke runtime obligatorio en UPU (S5.T4, RULE-029); contingencia A3 (persistir total) si A1 choca |
| Migración destructiva no quirúrgica en 18 schemas | medium | high | H3 al final con ventana de core (RULE-dev-004); rollback = restaurar JSON + regenerar (S6.T4) |
| Colisión con UPONE-1615 sobre `_data-rbac.js` | medium | medium | Confirmar con 1615 dónde se declara el cableado antes de escribir (S2.T3). **Contingencia**: si 1615 no está listo a tiempo, declarar las capabilities solo en `capabilities.json` y diferir el cableado en `_data-rbac.js` como follow-up enlazado (patrón B3), sin bloquear el cierre de Hito 1 |
| Colisión con UPONE-1541 sobre `seed-counts` | medium | low | Coordinar orden del seed (S4.T3), no serializar los tickets |
| Editar la copia sincronizada de `resolveFieldKind.ts` en vez de la fuente del mod | low | medium | S6.T2 explícito: editar la fuente del mod, correr sync |

## Open questions

- [x] Cuáles de los 8 atributos de la pieza son obligatorios vs opcionales — **RESUELTO (DET-1)**: `componentTypeId` + `hoursPerWeek` en `required[]`, los otros 6 opcionales (ver tabla Models + nota). S2.T1 ya es ejecutable con esta decisión. (SP9 lo dejó abierto — "Decisiones tecnicas abiertas".)
- [ ] Dónde exactamente se expone el total derivado — recomendación: campo enriquecido en la capa de lectura de la Modality (A1); confirmar en smoke (S5.T4) que renderiza, si no, contingencia A3. (SP9 abierto.) **Nota contrato E1**: A1 no persiste nada; si se activara A3 (persistir el total), el campo vive en `Modality`/`rt__Modality__curricularsection`, NUNCA en la pieza ni el catálogo — no afecta la identidad congelada de E1 (REQ-10).
- [ ] MCP (UPONE-1530): ¿se cubre la sincronización en este ticket o se marca N/A con motivo? — resolver en S6.T7 con el acuerdo del sprint. (AC-MCP.)

## Decisions

### DEC-LOCAL-01: Catálogo como objeto real (no enum)
- **Contexto**: el tipo de la pieza necesita un vocabulario extensible.
- **Drivers**: el vocabulario varía por país; un enum lo congela en código (RULE-016 lo haría soft de todos modos).
- **Opcion elegida**: objeto catálogo `InstructionalComponentType` con name unique + code + priority opcional.
- **Alternativas**: enum en el campo del RT — descartada por rigidez.
- **Consecuencias**: gana extensibilidad y seed idempotente; cuesta un objeto + seed + capabilities más.
- **Session**: decidido en SP9 (H5); transcrito en design-feature.

### DEC-LOCAL-02: Derivación por read-enrichment (A1), no field resolver ni campo persistido
- **Contexto**: la modalidad debe mostrar su carga derivada de las piezas.
- **Drivers**: RULE-017 prohíbe field resolvers de mod; el motor de fórmulas del core no agrega colecciones de hijos (verificado); un total persistido (A3) se desincroniza y va contra el objetivo de dejar de digitar.
- **Opcion elegida**: A1 — resolver de lectura del mod (read-enrichment, patrón effectiveCredits).
- **Alternativas**: A2 (campo calculado del layout) descartada (motor no agrega hijos); A3 (persistir el total) reservada como contingencia si A1 choca con el filtrado de columnas.
- **Consecuencias**: dato resuelto y testeable en aislamiento; hay que definir dónde se expone (Open question).
- **Session**: SP9 (A1/A2/A3); transcrito.

### DEC-LOCAL-03: El tramo de core va dentro de este ticket (1C-c)
- **Contexto**: la publicación en core y el retiro efectivo tocan `object-manager`.
- **Drivers**: precedente del equipo (UPONE-1523 commiteó su propia publicación); partirlo reproduce el fallo de UPONE-1539 (deuda de core sin dueño); un handoff entre tickets es donde se pierde el cambio.
- **Opcion elegida**: dentro de UPONE-1619 como sub-tarea 1C-c (S2.T5 aditivo + S6.T3/T4/T5 destructivo).
- **Alternativas**: ticket de core aparte — descartada; solo se abriría si el drop se difiere por contingencia.
- **Consecuencias**: el ticket cumple su propio DoD; sube la estimación si 1C-c resulta más cara, no se parte.
- **Session**: SP9 (2026-08-17); transcrito.

### DEC-LOCAL-04: La pieza NO lleva DataLog
- **Contexto**: definir si la pieza lleva historial/auditoría.
- **Drivers**: ningún RT hermano de CurricularSection declara `enableDataLog`; el flag vive solo en objetos Base.
- **Opcion elegida**: sin DataLog (precedente RT hermanos).
- **Alternativas**: habilitar DataLog — descartada sin razón en contra.
- **Session**: SP9 (2026-08-18); transcrito.

### DEC-LOCAL-05: Seed loader acotado al caso pieza (C1), no generalizado (C2)
- **Contexto**: el loader de sílabo crea nodos como raíz; anidar piezas requiere resolver parentId.
- **Drivers**: generalizar (C2) tocaría cómo nacen los 8 RT existentes y sus conteos, mucho más riesgo por el mismo valor.
- **Opcion elegida**: C1 — extender el loader solo para el caso pieza.
- **Alternativas**: C2 (generalizar) descartada por riesgo.
- **Consecuencias**: el loader queda con un caso especial; los otros RT siguen igual.
- **Session**: SP9; transcrito.

## Technical reference

- **Read-enrichment de referencia**: `mods/curriculum-design/logic/helpers/effectiveCredits.js:1-13` + `logic/curriculum-read.resolver.js:47,231,305` (DEC-LOCAL-01 previa + learn L1).
- **Árbol donde cuelga la pieza**: `CurricularSection.json:31-49` (par dueño ownerType/ownerId), `:73-81` (parentId self-FK), `:11-22` (metadata hijos + índices).
- **RT hermano de patrón**: `rt__EvaluationComponent__curricularsection.json:1-9` (jerarquía por parentId, FK escalar, sin DataLog).
- **Columnas a retirar**: `rt__Modality__curricularsection.json:18-41` (theory/practice/lab/autonomousHours).
- **Consumidores de las horas**: layouts `default_rt__Modality__curricularsection_{view,edit,create}.json` (ej. `_view.json:41-81`); `default_Offering_syllabus_{view,edit}.json:106-107 / 84-85`; `default_Activity_edit.json:123-124` (columnas theory/practice); `modsComponents/CompositeSectionTree/resolveFieldKind.ts:24-27` (heurística por string).
- **Loader del seed**: `_data-syllabus-sections.js:389-417` (crea nodos sin parentId hoy); patrón createNode con parentId en `_data-requirement.js:35-141`.
- **Catálogo de patrón**: `mods/academic-scheduling/objects/ResourceTypes.json:1-29` + `seed/config-resourcetypes.js`.
- **Core / append-only**: `object-manager/objects/business/RecordTypes/rt__Modality__curricularsection.json:18-41` (conserva las 4 claves); `prisma/BASEMODEL/schema.prisma:3162-3173`; 18 schemas con theoryHours; precedentes commits `fbdcfcb6` (UPONE-1623) y `00b35fb1` (UPONE-1523).
- **FK que espera academic-scheduling**: `mods/academic-scheduling/objects/Section.json:108-116` (modalityId, patrón idéntico para instructionalComponentId diferida en commit `e6bccc4`).
- **Tests de RTs declarados**: `tests/integration/recordtypes-declared.test.ts:23-32,55-65` (hoy 13 RT: 8 secciones + 2 currículo + 3 requisitos → pasa a 14 con la pieza).
- **Seed counts**: `tests/integration/seed-counts.test.ts:175` (cuenta por recordType, incl. Modality) + `docs/reference/seed-counts.md`.

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

- BUG-curriculum-design-016 (confirmed): los roles curriculares no tienen `institution:view` — tener presente al cablear RBAC (REQ-05).

## Acceptance checkpoints

- [ ] **Funcional**: catálogo con 8 tipos consultable sin duplicados; pieza creable anidada; total 4+2=6 y 0 sin piezas; form con listado anidado + total sin inputs de horas.
- [ ] **Tests** (DET-37 dim4): catálogo idempotente, derivación (6/0), recordtypes-declared, seed-counts, blast radius, modalidad por defecto — todos corridos y VERDES.
- [ ] **NFRs**: capabilities cableadas a 4 roles (sin roles nuevos); `DROP COLUMN` en 18 schemas sin drift; listado anidado accesible con tokens `var(--up1-*)`.
- [ ] **Rules**: read-enrichment (RULE-017), append-only + core commit (RULE-043), embedding `{{parentId}}` (RULE-027), seed idempotente (RULE-022), blast radius (RULE-009), smoke UI (RULE-029).
- [ ] **Integration**: vistas de sílabo coherentes tras el retiro (REQ-PRESERVE-02); regla de modalidad por defecto vigente (REQ-PRESERVE-01).
- [ ] **Runtime (RULE-029 / DET-36)**: smoke en UPU con evidencia real (screenshot) del listado anidado + total derivado; el listado filtra columnas a campos reales — verificar render, no config.
- [ ] **Core (REQ-09)**: objetos en `object-manager/objects/business/` con commits UPONE-1619; corrida posterior de sync no revierte el retiro; `drift:check` verde.
- [ ] **Contrato E1 congelado (REQ-10)** — dos momentos de verificación:
  - **En S2.GATE (diseño, antes de soltar a academic-scheduling)**: identidad canónica final fijada (nombre `rt__InstructionalComponent__curricularsection` + RT de Modality por `parentId` + id = id de CurricularSection); aviso enviado con identidad final (no "por confirmar"); y verificación de DISEÑO de que ninguna task de S3-S6 agenda modificaciones al object def de la pieza/catálogo (columnas Files de S3-S6).
  - **Runtime post-E3 (REQ-10 TC2)**: grep sobre el repo confirma 0 modificaciones efectivas al object def de la pieza/catálogo tras ejecutar E2+E3; cambios aplicados fueron aditivos-only.
- [ ] **Docs oficiales del proyecto** (DET-37 dim1): docs actualizadas (cambio observable: modelo/capability/campos que desaparecen); `seed-counts.md` actualizado.
- [ ] **KB DKC** (DET-37 dim2): learns capturados en el ticket; rules aplicables ya existen (RULE-017/043) — sin rule nueva obligatoria (N/A salvo hallazgo).
- [ ] **Docs externas DKC** (DET-37 dim3): N/A (no toca DKC ni convenciones).
- [ ] **MCP** (AC-MCP): sincronización cubierta según acuerdo del sprint, o marcada N/A con motivo (UPONE-1530).
- [ ] **Planning-completeness**: entry registrada (mixed).

## Archiving

Una spec se archiva cuando deja de ser fuente de verdad. Usar `/dkc-archive-spec SPEC-curriculum-design-instructional-component "razon"`. NO borrar manualmente.
