# UPONE-1456 - Analisis del seed dummy (paquete PM #097)

- **Titulo Jira:** Curriculum Design | Carga de datos dummy actualizada (seed)
- **Tipo:** Tarea · **Epica:** [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) Curriculum Design
- **Dueno:** Eduardo Bacon · **Prioridad:** Menor · **Estado:** Backlog · **SP Jira:** 3
- **Fecha analisis:** 2026-07-21 · **Tenant destino:** UPU (`uplanner_upu`)

> Alcance de la tarea (aclarado por el dev): analizar el seed entrante que nos entregan para
> **reemplazar el seed actual**, verificar si trae todos los datos (o si faltan / hay que
> especificar), y si esta OK, implementarlo. Este doc registra ese analisis.

---

## 1. Que es el paquete entrante

Handoff **PM #097** (`~/Downloads/seed-para-edu/`, `HANDOFF-SEED-EDU.md`). Data de demo cargada en
`one.u-planner.com` (tenant UPU), exportada desde live el **2026-07-08**, que se quiere persistir en
el `seed/` del mod `curriculum-design` para que sobreviva a los reseed y viaje en el commit. Todo
resuelto por codigos (FK portables), idempotente, guard UPU.

| Archivo | Contenido | Integracion |
|---|---|---|
| `programs.array.js` | 20 AcademicProgram `UPU-*` (institucion `UPU-MAIN`) | pegar en array `PROGRAMS` de `_data-academicprogram.js` |
| `curricula.array.js` | 20 Curriculum/Plan `UPU-*-PLAN-2026` (+ satelite `rt__Plan`) | pegar en array `CURRICULA` de `_data-curriculum.js` |
| `_data-mesh.js` | 299-301 Activity + 80 requirementCategory + 549 planEntry | copiar a `seed/` + registrar `loadMallas` en `seed.js` |
| `_data-syllabus-sections.js` | 374 secciones de syllabus (curricularSection, 7 recordTypes) + BibliographyReference | copiar + registrar `loadSyllabusSections` |
| `_data-offerings.js` | 160 offerings (5 por semestre 2026) + 18 ActivityLine | copiar + registrar `loadCourseOfferings` |
| `_data-changelog.js` | 162 ChangeLog | copiar + registrar `loadChangeLog` |
| `seed-export.json` | Fuente de verdad de programas/planes/mallas (JSON) | referencia |

Modelos que crea cada loader (verificado por `prisma.<model>.create`):
- `_data-mesh.js`: `activity`, `requirementCategory`, `planEntry`.
- `_data-syllabus-sections.js`: `curricularSection`, `bibliographyReference`.
- `_data-offerings.js`: `activityLine`, `offering`.
- `_data-changelog.js`: `changeLog`.

RecordTypes de `curricularSection` cubiertos: Modality (11), LearningOutcome (44), Content (55),
Session (176), EvaluationComponent (44), Bibliography (33), CustomSection (11).

---

## 2. Que funciona (se reutiliza tal cual)

El paquete resuelve por lookup contra objetos que ya siembra el core/mod. Confirmado que estos
existen y calzan:

| Dependencia | Como la resuelve el paquete | Existe porque |
|---|---|---|
| institution `UPU-MAIN` | `findFirst({code:'UPU-MAIN'})` (`_data-mesh.js:951`) | la crea el seed **core** de UPU (pre-condicion documentada en `seed/README.md:51`) |
| workflow `activity-standard` | `findFirst({name, institutionId})` (`_data-mesh.js:953`) | lo crea el seed del mod, seccion workflow-objects (`seed/README.md:32`, 5 workflows) |
| workflowStatus `PUB` | `findFirst({code:'PUB', institutionId})` (`_data-mesh.js:954`) | los 9 statuses del mod incluyen `PUB` (`seed/README.md:31`) |
| term `Primer/Segundo Semestre` | `findFirst({name})` (`_data-offerings.js:211`) | los crea `_data-syllabus.js:22` con esos mismos nombres |

Tambien cargan sin problema: programas (20), planes (20), la malla nueva (299 Activities `C-*` +
requirementCategory + planEntry), las secciones de syllabus y el changelog. El nucleo del paquete
(programas + planes + malla + secciones) es solido.

---

## 3. Que esta fallando o requiere decision

### 3.1 Activity.executionUnit - queda null (cosmetico, bajo impacto)

- `_data-mesh.js:955` resuelve **una sola** unidad para las 299 Activities con
  `orgUnit.findFirst({recordType:'AcademicExecution'})`.
- Ese recordType **no existe** en el modelo actual: la definicion de `executionUnitId`
  (`objects/activity.json:125`, `objects/AcademicProgram.json:79`) dice que el OrgUnit **no lleva
  recordType academico**; es `recordType:'Faculty'`, y el rol ejecucion/gobernanza lo determina
  **cual FK** apunta (`executionUnitId` vs `governanceUnitId`). El seed del mod crea orgUnits
  `Faculty` (`_data-univalle.js:148` UV-DEPT-MAT, `_data-aiep.js:137` AIEP-ESC-TEC).
- Resultado: el lookup devuelve null y las 299 Activities quedan con `executionUnitId = null`.
- **Impacto: bajo.** El campo es `not_null:false` y **no** esta en `required`
  (`activity.json:174` → `["name","code","recordType","version"]`). El seed corre igual. Lo unico
  afectado es visual: la columna "Unidad Organizativa" del `default_Activity_list.json:19`
  (sortable/filterable) y el campo "Unidad de ejecucion" en view/edit salen vacios. **No afecta a
  1378 / 1450 / 1451.**
- **Decision (Activity):**
  - **A. Dejar null.** Funciona; columna vacia en la demo. La mas barata.
  - **B. Repuntar el lookup** en `_data-mesh.js` a un `Faculty` existente (ej. `UV-DEPT-MAT`) o por
    code. Una linea; puebla la columna. Coherente con el modelo.
  - **Descartada: crear un orgUnit `recordType:'AcademicExecution'`** para que el lookup resuelva
    sin tocar el paquete. Contradice el modelo (mete un recordType academico que no debe existir).

### 3.2 ActivityLine / offerings - conjunto disjunto de la malla nueva

Este es el bloque problematico. **Los offerings NO estan armados sobre la malla nueva del paquete.**

- `_data-offerings.js` referencia solo **12 asignaturas** (`MAT101`, `FIS103`, `ALG102`,
  `SYL-CALC-101`, etc.); la malla nueva (`_data-mesh.js`) trae **299** con codigos `C-*`. Cruce
  entre ambos: **0 coincidencias**. Son dos mundos que no se referencian dentro del mismo paquete.
- De esas 12 asignaturas, **solo 2 existen** hoy en el seed del mod: `SYL-CALC-101`
  (`_data-syllabus.js:16`) y `TIR101` (`_data-aiep.js`). Las otras 10 no existen en ningun seed
  actual.
- `ActivityLine.orgUnitId` es **obligatorio**: `not_null:true` + en `required`
  (`objects/business/Base/activityline.json:26,53`). No admite null.

Mapa linea por linea (18 ActivityLine, logica del loader `_data-offerings.js:189-216`):

| ActivityLine | Activity | ¿existe? | orgUnit | ¿existe? | Resultado |
|---|---|---|---|---|---|
| AL-SYL-CALC-101 | SYL-CALC-101 | si | UV-DEPT-MAT | si | **Carga** |
| AL-TIR101 | TIR101 | si | AIEP-ESC-TEC | si | **Carga** |
| AL-MAT101 | MAT101 | no | UV-DEPT-MAT | si | se salta (falta activity) |
| AL-ALG102 | ALG102 | no | UV-DEPT-MAT | si | se salta |
| AL-EST106 | EST106 | no | UV-DEPT-MAT | si | se salta |
| AL-111026C | 111026C | no | UV-DEPT-MAT | si | se salta |
| AL-FIS103 | FIS103 | no | CIE | no | se salta |
| AL-QUI104 | QUI104 | no | CIE | no | se salta |
| AL-PRG105 | PRG105 | no | ING | no | se salta |
| AL-RED109 | RED109 | no | ING | no | se salta |
| AL-GES110 | GES110 | no | ING | no | se salta |
| AL-ECO108 | ECO108 | no | ING | no | se salta |
| AL-ING107 | ING107 | no | UV-CTR-IDIOMAS | eng | se salta |
| AL-SVC-* (5) | null | servicio | UV-CTR-BIENESTAR | eng | nunca se crea (guard `if(aid)`) |

**Estado actual: cargan 2 de 18 lineas.** El resto se salta silenciosamente. Los 160 offerings que
dependen de esas lineas se saltan tambien (`_data-offerings.js:212`, `if (!aid || !lineId) skip`).

**Riesgo de crash:** el loader crea la linea con `orgUnitId: ou?ou.id:null` (`:199`), protegido por
`if (aid)`. Hoy no crashea porque toda linea con orgUnit faltante (CIE/ING) **tambien** tiene
activity faltante y se salta antes. Pero si se siembran las asignaturas (MAT101, FIS103...) **sin**
crear CIE/ING, esas 6 lineas pasan la guarda con `aid` valido, llegan al `create` con
`orgUnitId:null` y **crashean** contra la constraint NOT NULL. Activity y orgUnit deben ir juntos.

### 3.3 orgUnits faltantes (CIE, ING)

- `CIE` e `ING` (aparentemente Facultad de Ciencias e Ingenieria) **no existen** como orgUnit en
  ningun seed. Los `UV-CTR-*` (bienestar, idiomas) son `SupportCenter` de **engagement**
  (`mods/uengagement-up1/seed/0-orgunit-center-seeds.js`).
- **curriculum-design SI puede sembrar orgUnits `Faculty`** (ya lo hace: `_data-univalle.js:146`,
  `_data-aiep.js:134`, con `prisma.orgUnit.create` + `rt__Faculty__OrgUnit.upsert`). Agregar
  CIE/ING como Faculty tiene precedente identico. Lo que el paquete **no** trae: el `name`, el
  `type` y a que institucion se anclan (dato a especificar; es data dummy).
- Los `SupportCenter` (UV-CTR-*) son dominio de engagement; solo importan para las lineas de
  servicio, que igual no se crean (activityCode null).

---

## 4. Cobertura de objetos (que falta)

Objetos que el seed **actual** del mod tiene y el paquete **no** trae:

- **`requirement`** (arbol de prerrequisitos Y/O). El paquete solo trae `requirementCategory`
  (lineas de formacion), no el objeto `requirement`. Es el objeto de **[UPONE-1378](https://u-planner.atlassian.net/browse/UPONE-1378)**.
  Hoy vive en `_data-requirement.js`.
- **graduation profile** (`_data-graduation-profile.js`).

Estos NO son necesariamente un gap del seed: casi todos los objetos del dominio **se crean por
interaccion** (UI o MCP), no solo por seed. El mod tiene layouts `create/edit/view` para
practicamente todos, incluidos los recordTypes de `requirement`
(`default_rt__Group__requirement_create.json`, `rt__MetricThreshold__requirement`,
`rt__RecordState__requirement`) y graduation profile
(`default_rt__GraduationProfile__curricularsection_create.json`). El unico caso cuyo camino de
creacion **bueno** es trabajo de este SP es el editor visual de prerrequisitos (1378). Por eso el
paquete no trae `requirement`: se espera crearlo por la UI nueva.

---

## 5. Nota de reconciliacion (del propio HANDOFF)

`HANDOFF-SEED-EDU.md:70`: el paquete se genero contra un checkout que **no tenia** los objetos
`requirementCategory`/`planEntry` (mas nuevos que el mod de ese momento), pero `_data-mesh.js` si
los siembra. Hay que confirmar que la estructura actual del mod coincide (nombres de campos y de la
relacion del satelite `rt__<RecordType>__curricularsection`; ver `HANDOFF:49`).

---

## 6. Que se necesita para implementar (detallado)

### Nucleo (bajo riesgo, entra directo)

1. Pegar los 20 programas en `_data-academicprogram.js` (array `PROGRAMS`).
2. Pegar los 20 planes en `_data-curriculum.js` (array `CURRICULA`).
3. Copiar `_data-mesh.js` a `seed/` y registrar `loadMallas` en `seed.js`, **despues** de
   `loadCurricula`. Decidir si reemplaza a `_data-malla.js` actual o convive.
4. Copiar `_data-syllabus-sections.js` y `_data-changelog.js`, registrar en `seed.js` en el orden:
   `loadAcademicPrograms → loadCurricula → loadMallas → loadSyllabusSections → loadChangeLog`.
5. Verificar la relacion del satelite de seccion contra el schema actual (reconciliacion §5).

### Activity.executionUnit

6. Elegir A (dejar null) o B (repuntar lookup a `Faculty`). Recomendada B si se quiere poblar la
   columna; A si no importa para la demo. Bajo impacto en cualquier caso.

### ActivityLine / offerings (decision de fondo)

El bloque de offerings **no es "reemplazar y listo"**. Para que cargue se necesita, TODO junto:

7. **Sembrar las 11 asignaturas faltantes** (MAT101, ALG102, EST106, FIS103, QUI104, PRG105,
   RED109, GES110, ECO108, ING107, 111026C). Es la dependencia real y grande. Estas no estan en la
   malla nueva `C-*` ni en el seed actual (salvo SYL-CALC-101 y TIR101).
8. **Crear CIE e ING como Faculty** en el seed del mod (patron de `_data-univalle.js:146`), en el
   **mismo paso** que las asignaturas, o esas 6 lineas crashean por el orgUnit NOT NULL.
9. Decidir el destino de los **servicios** (5 lineas + 30 ServiceOffer offerings): el loader no los
   crea (activityCode null); o se cambia el loader o quedan fuera (son dominio engagement).
10. Confirmar la institucion de ancla de CIE/ING y de las asignaturas curadas: ¿mundo UV o UPU-MAIN?

**Alternativas para offerings (a decidir con el autor del seed):**
- **Regenerar** `_data-offerings.js` / `_data-syllabus-sections.js` contra la malla nueva `C-*`
  (trabajo del autor; los datos actuales apuntan a otro set).
- **Excluir** offerings de 1456 y tratarlos como data de engagement / fase aparte.
- **Sembrar parcial**: solo las lineas cuyos activity + orgUnit existen (hoy 2), logueando las
  descartadas (sin silenciar).

---

## 7. Preguntas para el autor del seed (PM #097)

1. **Activity.executionUnit:** el lookup busca `recordType:'AcademicExecution'`, que en el modelo
   actual no existe (el OrgUnit es `Faculty`). ¿Las Activities debian quedar sin unidad (null) o
   apuntar a una unidad real? Si es real, ¿a cual Faculty, o unidad plana para todas?
2. **Offerings vs malla:** `_data-offerings.js` / `_data-syllabus-sections.js` apuntan a ~12
   asignaturas curadas (`MAT101`, `FIS103`...) que no estan en la malla nueva de 299 (`C-*`).
   ¿Los offerings van sobre esa demo curada (hay que conservar esas 12 asignaturas) o habia que
   regenerarlos contra la malla nueva?
3. **CIE / ING:** no existen como orgUnit. ¿Se esperaba que ya existieran? ¿Los agrego como Faculty
   al seed de cd, y bajo que institucion (UV o UPU-MAIN)?
4. **Servicios (ServiceOffer):** son dominio engagement y el loader no los crea (activityCode null).
   ¿Entran en este seed o quedan fuera?
5. **Reconciliacion:** ¿el paquete ya esta reconciliado contra el mod actual (con
   `requirementCategory`/`planEntry`), o debo revisar nombres de campos/relaciones?
6. **requirement / graduation profile:** no vienen en el paquete. ¿Se dejan fuera a proposito
   (se crean por UI/MCP, ej. prerrequisitos por 1378), o hay que sumarlos al seed?

---

## 8. Resumen ejecutivo

- **Funciona y entra directo:** programas, planes, malla nueva (299 Activities `C-*` +
  requirementCategory + planEntry), secciones de syllabus, changelog. Las dependencias
  institution/workflow/workflowStatus/term se reutilizan tal cual.
- **Bajo impacto, decision menor:** `Activity.executionUnit` queda null (campo opcional); dejar asi
  o repuntar el lookup a un `Faculty`.
- **Bloque a reconciliar o excluir:** offerings + ActivityLine. Estan armados sobre un set de 12
  asignaturas curadas que el paquete no siembra; hoy cargan 2 de 18 lineas. Requiere sembrar 11
  asignaturas + crear CIE/ING (juntos, o crash) + resolver servicios. Es la unica parte que **no**
  es "reemplazar y listo".
- **No es gap del seed:** `requirement` y graduation profile no vienen, pero se crean por UI/MCP
  (requirement por el editor de 1378).

> Verificacion realizada el 2026-07-21 sobre `~/Downloads/seed-para-edu/` y
> `uplanner/up1/mods/curriculum-design/`. Todas las afirmaciones referencian archivo:linea.
