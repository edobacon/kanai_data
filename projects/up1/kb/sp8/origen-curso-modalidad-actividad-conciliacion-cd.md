# Origen de la necesidad: Curso - Modalidad - Actividad, y su conciliacion desde Curriculum Design

> Documento de analisis (SP8). Toma el planteamiento de necesidad levantado por Academic Scheduling, lo traduce al modelo real de UP1 (verificado en codigo, no en Confluence), y evalua como nos afecta a Curriculum Design y como conciliar el detalle a bajo costo. Complementa a `contra-analisis-3-cambios-verificacion.html`.

## 1. El origen: que pide Academic Scheduling

La necesidad, tal como fue levantada por Academic Scheduling (fuente literal del planteamiento):

- Necesitan un equivalente al modelamiento **Curso - Modalidad - Actividad** de la suite (uPlanning), compatible con Curriculum Design. Es lo que resuelve la incompatibilidad actual entre **uPlanning** y **uAssessment**.
- Hoy el repositorio de cursos vive en `Activity` con `recordType = Course`.
- La creacion de **Secciones Propuestas** (que se aloja en `Section`) toma registros de `Activity` para crear secciones, pero `Activity` **no tiene toda la informacion necesaria para planificar**.
- Al revisar el modelo, aparecen dos candidatos: `ActivityLine` y `Modality`.
- **No es opcion crear un objeto aparte**, porque reabre la brecha entre mods. La division de responsabilidades acordada es: **Curriculum Design disena, Academic Scheduling planifica**.

La necesidad se reduce a: conocer el **repositorio de los distintos modos de dictar un curso** (Virtual, Presencial, Semipresencial, Sabatino, o la version del Campus A que puede diferir de la del Campus B) y, para cada modo, **que implica**. Ejemplos para un mismo curso:

- **Virtual:** actividades Sincronas o Asincronas, con un numero de horas de dedicacion semanal.
- **Semipresencial:** teoria online sincrona, y actividad de laboratorio presencial en un taller de fisica, con laboratorio de 2 horas semanales.
- **Presencial:** actividad teorica que requiere un aula por 6 horas, y una actividad de practica que requiere un laboratorio y **dos docentes** durante 1 hora.

Esto es, textualmente, un modelo de **tres niveles**: Curso, sus Modalidades, y las Actividades que componen cada Modalidad (cada una con tipo, horas, tipo de recurso/sala y numero de docentes).

## 2. Por que esto es "el origen de todo"

Los tres cambios de la propuesta que veniamos analizando no son piezas independientes: son **sintomas de esta misma necesidad**.

| Cambio de la propuesta | Como se conecta con el origen |
|---|---|
| **C1** (modelo: componentes en CurricularSection + campos en Section) | Es el intento directo de modelar el nivel 2-3 (Modalidad y Actividad) y conectarlo con la planificacion. |
| **C3** (trim en `Activity.code`) | El match por codigo entre uPlanning y academic-scheduling es justamente el punto de dolor de la **incompatibilidad** que se busca resolver. |
| **C2** (i18n del RT Servicio) | Colateral del mismo modelo compartido `Activity` (Course vs Service) entre CD y engagement. |

Y por eso **los tres mods estan tratando de acomodarse al mismo requerimiento**:

- **Curriculum Design (nosotros):** debe ser el **repositorio de diseno** de las modalidades y actividades del curso.
- **Academic Scheduling:** debe **leer** ese diseno para planificar `Section` (grupo concreto con cupo, sala, docente, horario).
- **Engagement:** aporta la capa de **ejecucion** (`ActivityLine` = Activity x OrgUnit ejecutora; `Offering` cuelga de ella).

## 3. Traduccion al modelo real de UP1

El modelo de la suite mapea casi 1:1 a objetos que **ya existen** en UP1 (verificado en codigo):

| Nivel (uPlanning / suite) | Concepto | Objeto UP1 real | Estado hoy |
|---|---|---|---|
| **1. Curso** | que asignatura es | `Activity` (`recordType = Course`) | **Existe** |
| **2. Modalidad** | como se dicta (Virtual/Presencial/Semipresencial/Sabatino/Campus) | `CurricularSection` (`recordType = Modality`) | **Existe**, pero como agregado de horas |
| **3. Actividad** | unidades dentro de la modalidad (teoria/practica/lab), cada una con tipo, horas, sala y docentes | (no existe como entidad) | **Falta** |

Detalle verificado de cada pieza:

- `Activity` (curriculum-design/objects/activity.json): tiene `name`, `code`, `recordType {Course, Service}`, versionado, etc. Es el "Curso". No tiene informacion de dictado. Correcto: por eso `Section` no encuentra lo que necesita.
- `CurricularSection[Modality]` (rt__Modality__curricularsection.json): tiene `theoryHours`, `practiceHours`, `labHours`, `autonomousHours`, `isDefault`, `deliveryMode` (`InPerson/Virtual/Hybrid/Synchronous/Asynchronous`). Es la "Modalidad", y ya nacio pensada para esto: `Hybrid` cubre semipresencial, y `Synchronous/Asynchronous` cubre el eje sincrono/asincrono. **Un curso puede tener varias** (con `isDefault` marcando la principal).
- **El nivel 3 no esta modelado.** Hoy `Modality` **aplana** las actividades en columnas (`theoryHours`, `practiceHours`, `labHours`). El requerimiento quiere cada actividad como entidad propia con su tipo, sus horas, su **tipo de sala** y su **numero de docentes**. Eso no existe en ningun RecordType.

## 4. Que ya existe y que falta (analisis de brecha)

**Ya existe y se reusa tal cual:**

1. Nivel 1 (Curso) = `Activity[Course]`. Sin cambios.
2. Nivel 2 (Modalidad) = `CurricularSection[Modality]`. El enum `deliveryMode` ya distingue presencial/virtual/hibrido/sincrono/asincrono.
3. La **jerarquia** ya existe: `CurricularSection.parentId` es self-FK (Composite). O sea, una Modalidad puede tener **hijos** sin cambios de estructura.
4. Multiples modalidades por curso: soportado (varias `CurricularSection[Modality]` con el mismo `ownerId`).

**Falta (la brecha real, acotada):**

| Necesidad del requerimiento | Existe hoy? | Que falta |
|---|---|---|
| Actividad como entidad dentro de la modalidad | No | Un nivel 3: hijos de la Modalidad (via `parentId`) |
| Tipo de sala/recurso requerido (aula, laboratorio, taller) | **No, en ningun objeto de diseno** | Un campo `requiredResourceType` en el nivel 3 |
| Numero de docentes de la actividad | No | Un campo `requiredInstructorCount` en el nivel 3 |
| Sincrono/Asincrono por actividad | Solo a nivel Modalidad (`deliveryMode`) | Empujar el eje sync/async al nivel 3 |
| Horas semanales por actividad | Agregadas en Modalidad; `Content` tiene `hours` | Horas por actividad en el nivel 3 |

Es decir: **el 80% ya esta**. La brecha es un **nivel 3 pequeno** (actividad dentro de la modalidad) con tres o cuatro campos que hoy no existen en ninguna parte.

## 5. Como nos afecta a nosotros (Curriculum Design)

1. **Nueva responsabilidad, alineada con nuestro rol.** El requerimiento dice explicito que "Curriculum Design deberia ser quien disene". Somos los duenos del **repositorio de modalidades y actividades**. Es superficie nueva que vamos a mantener, pero encaja con lo que ya somos.
2. **El build es chico**, no un objeto nuevo: reusamos `Modality` + la jerarquia `parentId` + un RecordType de nivel 3 + unos pocos campos. Esto es consistente con lo que ya concluimos en el contra-analisis (la propuesta erro al llamar "nuevo" a `CurricularSection`; el concepto casi existe).
3. **Nos convertimos en fuente de verdad cross-mod para Academic Scheduling.** `Section` va a leer nuestro diseno (`Section.instructionalComponentId -> CurricularSection`). Eso es un acople nuevo cd <- as que hay que gobernar. El bug del `trim` que encontramos (Activity co-propiedad, merge last-mod-wins que pisa nuestras transformaciones) demuestra que **la frontera entre mods ya es porosa**; agregar dependencias sin disciplina la empeora.
4. **Cuidado con el catalogo de tipos de sala.** `ResourceTypes` vive en **academic-scheduling**. Si nuestro diseno referencia ese catalogo por FK, creamos una dependencia **cd -> as**, que sumada a la `as -> cd` de `instructionalComponentId` seria un acople **circular** entre mods. Hay que evitarlo (ver conciliacion).

## 6. Conciliacion a bajo costo

La clave para el bajo costo es **no construir, reusar la estructura que ya existe** y cerrar solo la brecha del nivel 3, manteniendo las dependencias en **una sola direccion**.

### Modelo de tres niveles propuesto (reuso-first)

```
Activity [recordType=Course]                      (nivel 1 - Curso, existe)
  └─ CurricularSection [recordType=Modality]      (nivel 2 - Modalidad, existe)
       ownerType=Activity, ownerId=<activityId>
       deliveryMode = InPerson | Virtual | Hybrid | ...
       └─ CurricularSection [recordType=InstructionalComponent] (nivel 3 - Actividad, NUEVO minimo)
            parentId = <modalityId>                (jerarquia, ya existe)
            activityType   = Theory | Practice | Lab
            deliveryType   = Synchronous | Asynchronous | InPerson
            hoursPerWeek   = <number>
            requiredResourceType   = <enum/string>   (aula, laboratorio, taller...)
            requiredInstructorCount = <number>
```

Con esto, los tres ejemplos del requerimiento se expresan sin objetos nuevos:

- **Virtual:** una `Modality[deliveryMode=Virtual]` con hijos `InstructionalComponent[deliveryType=Synchronous|Asynchronous, hoursPerWeek=N]`.
- **Semipresencial:** una `Modality[deliveryMode=Hybrid]` con un `InstructionalComponent[Theory, Synchronous]` online y un `InstructionalComponent[Lab, InPerson, requiredResourceType=Taller, hoursPerWeek=2]`.
- **Presencial:** una `Modality[deliveryMode=InPerson]` con `InstructionalComponent[Theory, requiredResourceType=Aula, hoursPerWeek=6]` y `InstructionalComponent[Practice, requiredResourceType=Lab, requiredInstructorCount=2, hoursPerWeek=1]`.

### Que exige, y por que es barato

| Item | Accion | Costo |
|---|---|---|
| Nivel 1 (Curso) | Nada | Cero |
| Nivel 2 (Modalidad) | Nada estructural; ya soporta multiples por curso y el eje sync/async | Cero |
| Jerarquia nivel 2 -> 3 | Nada; `parentId` ya existe | Cero |
| Nivel 3 (Actividad) | 1 RecordType nuevo `rt__InstructionalComponent__curricularsection.json` (o extender `Content`) con 4-5 campos | Bajo (1 RT + i18n + layout) |
| Tipo de sala requerido | Campo `requiredResourceType` como **enum/string** en el nivel 3 (no FK a `ResourceTypes` de as) | Bajo, y evita el acople circular |
| Numero de docentes | Campo `requiredInstructorCount` | Bajo |
| Lectura desde Academic Scheduling | `Section.instructionalComponentId -> CurricularSection[Modality]`; `Section` resuelve los `InstructionalComponent` hijos para saber sala/horas/docentes | Bajo (FK + query) |

### La decision que abarata todo: direccion unica de la dependencia

- **El tipo de sala en diseno debe ser un enum/string, no una FK a `ResourceTypes`.** Academic Scheduling mapea ese enum a su catalogo real de `ResourceTypes` al planificar. Asi la dependencia es **solo** `as -> cd` (Section lee el diseno de CD), y no `cd -> as` (que crearia un ciclo). Curriculum Design describe "necesita un laboratorio"; Academic Scheduling decide "el laboratorio es la sala 302".
- Este es el punto mas importante para el bajo costo y para no reabrir la brecha entre mods.

## 7. Como se posiciona cada mod (y las tensiones)

- **Curriculum Design (diseno):** dueno de `Activity[Course]` + `CurricularSection[Modality]` + el nuevo `InstructionalComponent`. Describe **que** modalidades tiene el curso y **que implica** cada una (tipo, horas, tipo de recurso, docentes), en abstracto.
- **Academic Scheduling (planificacion):** lee ese diseno y crea `Section` concretas, resolviendo el tipo de recurso a una sala real y asignando docentes/horario.
- **Engagement (ejecucion):** `ActivityLine` (Activity x OrgUnit) y `Offering`. **Aqui esta la tension del "Campus A vs Campus B":** el campus es una `OrgUnit` (`rt__Campus__OrgUnit`) y la ejecucion por unidad vive en `ActivityLine` (engagement), no en diseno.

### Sobre `ActivityLine` como candidato (descartado, y bien descartado)

El requerimiento lo listo como candidato. La conclusion (validada en codigo en el contra-analisis) es que **no** es el lugar: `ActivityLine` modela ejecucion (`activityId` + `orgUnitId`), no diseno. Colgar de ahi la modalidad mezclaria "como se dicta" (diseno, CD) con "quien ejecuta y donde" (ejecucion, engagement) e invertiria la direccion de la dependencia.

### Sobre el "Campus A vs Campus B" (decision abierta)

Es el unico punto donde diseno y ejecucion se rozan. Dos caminos:

- **A. En diseno:** la variante por campus es otra `Modality` (con una referencia opcional a la OrgUnit/campus). Queda en CD, pero toca `OrgUnit` (objeto compartido) desde diseno.
- **B. En ejecucion:** el diseno queda **agnostico de campus** (solo modalidades genericas) y la variante por campus se resuelve al ejecutar/planificar (via `ActivityLine` = Activity x Campus, o en `Section`).

Recomendacion inicial: **B** para el caso base (mantiene el diseno limpio y agnostico), y evaluar A solo si dos campus difieren en el **diseno pedagogico** (no solo en la sala), que es el caso menos comun. Esto es una decision de negocio que conviene cerrar explicitamente.

## 8. Sintesis

- El requerimiento de Academic Scheduling **es el origen** de los tres cambios propuestos; conviene tratarlo como el problema raiz, no como tres fixes sueltos.
- El modelo Curso-Modalidad-Actividad **ya existe casi entero** en UP1: `Activity[Course]` + `CurricularSection[Modality]` + jerarquia `parentId`. La brecha real es un **nivel 3 pequeno** (la Actividad dentro de la Modalidad) con tipo de sala, numero de docentes y horas por actividad.
- Nos afecta como **nuevos duenos del repositorio de diseno** (coherente con nuestro rol), con un **build bajo** si reusamos en vez de crear.
- El bajo costo depende de una decision clara: **el tipo de sala en diseno es un enum, no una FK a `ResourceTypes`**, para que la dependencia entre mods sea unidireccional (`as -> cd`) y no reabramos la brecha.
- Decisiones abiertas que hay que cerrar antes de ejecutar: (1) reusar `Content` vs crear `InstructionalComponent`; (2) donde vive la variante por campus (diseno vs ejecucion); (3) quien es dueno de `Activity` a la luz de UPONE-1283 (Engagement como spine canonico) frente a "los campos del curso van en CD".

## 9. Referencias

- Contra-analisis con evidencia de codigo y diagrama del modelo: `sp8/contra-analisis-3-cambios-verificacion.html`.
- Propuesta original: `sp8/propuesta-3-cambios-impacto-cd.html`.
- Definiciones verificadas: `curriculum-design/objects/activity.json`, `curriculum-design/objects/CurricularSection.json`, `curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json`, `uengagement-up1/objects/ActivityLine.json`, `academic-scheduling/objects/Section.json`, `academic-scheduling/objects/ResourceTypes.json`.
- Precedente de colision de modelos: Jira UPONE-1283 (Engagement establecido como spine canonico).
