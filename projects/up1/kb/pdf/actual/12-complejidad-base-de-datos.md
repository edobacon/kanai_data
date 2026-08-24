---
id: SPEC-reassess-022
project: up1
type: spec
module: reassess
tags: [assessment, base-de-datos, sql-raw, transacciones, queries, joins, dependencias-externas, volumetria, migracion]
relates: []
clients: []
modules: [improve-api]
risk: very-high
---
# 12 — Analisis de Complejidad y Estado de la Base de Datos

Este documento profundiza en la base de datos de uAssessment: como estan organizados los datos, como se consultan, donde esta la complejidad real, y que riesgos implica para la migracion. Va mas alla del esquema (documentado en 04) para analizar **como se usa la base de datos desde el codigo**.

---

## El panorama en numeros

| Dimension | Valor |
|-----------|-------|
| Motor de base de datos | MariaDB |
| Tablas propias de assessment | 162 (prefijo `imp_`) |
| Tablas de otros modulos que consume | 40+ (prefijos `upl_`, `cls_`, `asm_`, `reg_`, `enr_`, `sec_`, `wkf_`) |
| Lineas de SQL en archivos de modelo | ~17,000 |
| Usa ORM de Sequelize | No — 100% SQL raw |
| Tiene transacciones de base de datos | No — ninguna |
| Query mas compleja | ~20 tablas (detalle de hito milestone) |
| Tabla mas grande | 799,000 filas (evaluaciones por seccion) |
| Stored Procedures | 1 (`sp_refreshing_versioning_coursedata`) |

Estos numeros cuentan una historia clara: **uAssessment trata a la base de datos como su unico motor de logica**. Todo el procesamiento pesado — permisos, jerarquias, tributacion, reportes — se resuelve en SQL, no en codigo de aplicacion. Las queries son la logica de negocio.

---

## Los datos propios: 162 tablas organizadas en 6 dominios

### Dominio 1: Estructura del programa (1 tabla, maximo impacto)

`imp_program_structure` es una sola tabla pero controla el comportamiento de todo el sistema. Define que campos aparecen en cada formulario (plan de estudio, programa de curso, syllabus), en que orden, con que tipo de dato, y que servicios externos alimentan cada campo.

Se consulta usando **CTEs recursivas** (consultas que se llaman a si mismas) porque la estructura es jerarquica: una seccion puede tener sub-secciones, que a su vez tienen campos, que pueden tener sub-campos.

**Por que importa**: Cada vez que un usuario abre un plan de estudio o un syllabus, el sistema ejecuta una consulta recursiva contra esta tabla para construir el formulario. Si la tabla tiene datos inconsistentes, el formulario se rompe.

### Dominio 2: Cursos y programas de curso (13 tablas)

Un curso en la base de datos no es un solo registro — es una constelacion de 13 tablas conectadas:

```
imp_course_data (el curso en si)
  ├── imp_course_units (4 unidades tematicas, por ejemplo)
  │     └── imp_courseunit_contents (los contenidos de cada unidad)
  ├── imp_course_evaluationcomponents (3 parciales + 1 trabajo + 1 examen)
  ├── imp_course_references (15 libros de bibliografia)
  ├── imp_course_outcomes (5 resultados de aprendizaje)
  ├── imp_course_learningstrategies (clase magistral + laboratorio)
  ├── imp_course_resources (proyector + laboratorio + software)
  ├── imp_course_sessions (32 sesiones planificadas)
  ├── imp_course_version_control (3 versiones historicas)
  ├── imp_course_coordinators (2 coordinadores)
  └── imp_course_revisors (1 revisor)
```

Para leer un programa de curso completo, el sistema debe consultar las 13 tablas. Para copiarlo (clonacion), debe insertar en las 13. Para eliminarlo, debe verificar dependencias en todas.

### Dominio 3: Secciones y syllabus (8 tablas, mayor volumen)

Es el espejo del dominio de cursos, pero para secciones:

```
imp_section_data (la seccion)
  ├── imp_section_evaluationcomponents (799,000 filas en total)
  │     └── imp_sectioncomponent_competencylevels (vinculos a competencias)
  ├── imp_section_references (396,000 filas)
  ├── imp_section_outcomes (resultados de aprendizaje)
  ├── imp_section_learningstrategies
  ├── imp_section_units
  └── imp_sectionunit_contents
```

La razon por la que este dominio tiene 8 veces mas datos que el de cursos es simple: cada curso puede tener muchas secciones (una por docente, por periodo). Si un curso tiene 5 evaluaciones y 10 secciones por periodo durante 5 periodos, eso son 250 registros en `imp_section_evaluationcomponents` para un solo curso.

**La tabla de 799,000 filas** (`imp_section_evaluationcomponents`) participa en las queries mas costosas del sistema — las que calculan logro de competencias. Cada reporte de logro necesita cruzar estas evaluaciones con los vinculos de competencias y las notas de los estudiantes.

### Dominio 4: Competencias (13 tablas, mayor profundidad jerarquica)

El modelo de competencias tiene la jerarquia mas profunda:

```
imp_competency_sets (la matriz: "Competencias de Ingenieria Civil")
  └── imp_competencies (cada competencia: "Pensamiento Critico")
       ├── imp_competency_levels (niveles: introductorio, intermedio, avanzado)
       │     ├── imp_competencylevel_thresholds (umbrales: 75% = logrado)
       │     ├── imp_competencylevel_criteria (criterios de evaluacion)
       │     ├── imp_competencylevel_courseoutcomes (vinculos a resultados de curso)
       │     └── imp_competencylevel_sectionoutcomes (vinculos a resultados de seccion)
       ├── imp_competency_scopes (alcances)
       └── imp_competency_equivalents (equivalencias con otras competencias)
```

Mas la relacion pivote `imp_courses_competencies` que conecta cursos con competencias (tributacion).

**Lo bueno**: Esta bien normalizado. Cada nivel de la jerarquia tiene proposito claro. **Lo problematico**: Para obtener una vista completa de una competencia con todos sus niveles, umbrales, criterios y vinculos, se necesitan 11-13 tablas en un solo query.

### Dominio 5: Milestone / Hitos (8 tablas)

Un sistema paralelo de medicion con su propia estructura:

```
imp_milestones (definicion del hito)
  ├── imp_milestone_statuses (estado del hito)
  ├── imp_milestone_evaluation_situations (situaciones evaluativas)
  │     └── imp_milestone_evaluationsitutation_components (componentes)
  └── imp_milestone_attempt (intento del estudiante)
        ├── imp_milestone_evaluation_situations_aggregated_scores (nota por situacion)
        └── imp_milestone_evaluation_component_scores (nota por componente)
```

Mas `imp_course_evidences` para vincular evidencias de cursos a componentes del hito.

### Dominio 6: Catalogos, workflow e historial (~17 tablas)

Tablas de soporte: modos de calificacion, metodos de evaluacion, alineamientos curriculares, tipos de contexto, datos genericos, historial de cambios, log de clonacion, estados de workflow.

---

## Los datos ajenos: 40+ tablas de otros modulos

Este es uno de los descubrimientos mas importantes del analisis. uAssessment **no es autocontenido** — depende de datos que administran 6 modulos diferentes de la plataforma uPlanner.

### Core (`upl_*`): la columna vertebral

uAssessment consume al menos 25 tablas con prefijo `upl_`:

| Tabla | Que contiene | Quien la usa en assessment |
|-------|-------------|---------------------------|
| `upl_courses` | Catalogo de cursos | Todos los modulos |
| `upl_pensums` | Planes de estudio | Pensums, competencias, reportes |
| `upl_careers` | Carreras | Pensums, filtros |
| `upl_faculties` | Facultades | Filtros, permisos, competencias |
| `upl_academicunits` | Departamentos | Cursos, filtros |
| `upl_students` | Estudiantes | Reportes, progreso |
| `upl_teachers` | Docentes | Syllabus, reportes |
| `upl_campuses` | Sedes | Reportes globales |
| `upl_academicperiods` | Periodos | Filtros, reportes |
| `upl_courses_pensums` | Cursos en plan (malla) | Pensums, alineamiento |
| `upl_pensums_specialties` | Especialidades | Pensums |
| `upl_courses_specialties` | Cursos por especialidad | Pensums |
| `upl_pensums_concentrations` | Concentraciones | Pensums |
| `upl_courses_concentrations` | Cursos por concentracion | Pensums |
| `upl_campus_academicperiod_shift` | Turno campus-periodo | Reportes milestone |
| ... y al menos 10 mas | | |

**Implicancia**: Cuando se migre a uP1, estos datos deben existir como objetos del Object Manager **antes** de que assessment pueda funcionar. La migracion de assessment no puede hacerse aislada.

### Class (`cls_*`): secciones y docentes

| Tabla | Que contiene | Impacto |
|-------|-------------|---------|
| `cls_sections` | Secciones (grupos de clase) | Base para syllabus |
| `cls_sectionscomposition` | Relacion seccion-curso-pensum | Critica para filtros |
| `cls_sections_teachers` | Docentes por seccion | Permisos, reportes |
| `cls_students_sections` | Estudiantes por seccion | Reportes de logro |
| `cls_sections_coordinators` | Coordinadores por seccion | Permisos |

**Implicancia**: El bug del docente fantasma "UPLANNER NO DEFINIDO" (BUG-011) vive en `cls_sections_teachers` — una tabla de otro modulo. Assessment no puede corregirlo directamente.

### Evaluacion y registros (`asm_*`, `reg_*`, `enr_*`): las notas

| Tabla | Que contiene | Impacto |
|-------|-------------|---------|
| `asm_student_marks` | Notas parciales por evaluacion | **Fuente primaria para logro de competencias** |
| `reg_enrollments` | Matriculas con nota final | Alternativa a notas parciales |
| `reg_student_pensums` | Plan activo del estudiante | Progreso estudiantil |
| `reg_student_statuses` | Estado de matricula | Indicadores |
| `enr_pensum_progress` | Progreso en el plan | Vista de malla con estados |

**Implicancia critica**: Toda la cadena de medicion Graduation Profile depende de `asm_student_marks`, que viene del modulo Class. Si en uP1 las notas vienen de Attendance & Grades o de integraciones con LMS/SIS, la fuente de datos cambia completamente.

### Seguridad y workflow (`sec_*`, `wkf_*`)

| Tabla | Que contiene |
|-------|-------------|
| `sec_user_groups` | Grupos de usuario |
| `sec_groups` | Definicion de grupos |
| `sec_group_section` | Acceso grupo-entidad |
| `sec_features_permissions` | Permisos por feature |
| `sec_role_permissions` | Permisos por rol |
| `sec_role_structure_status` | Permisos de estructura por estado |
| `wkf_concepts_statuses` | Estado de entidad en workflow |
| `wkf_statuses` | Catalogo de estados |
| `wkf_concepts_statuses_h` | Historial de transiciones |

**Implicancia**: El sistema de permisos actual se resuelve con consultas SQL masivas que hacen UNION de 3-9 ramas segun el tipo de rol del usuario. Esta logica esta incrustada en los modelos SQL, no en un middleware reutilizable. En uP1, RBAC lo resuelve el Object Manager de forma centralizada.

---

## La complejidad real: como se consultan los datos

### Todo es SQL raw — no hay ORM

Los 17,000 lineas de codigo de modelo usan exclusivamente `sequelize.query()` con strings SQL escritos a mano. No hay modelos Sequelize, no hay `findAll()`, no hay relaciones definidas en el ORM. Sequelize se usa solo como driver de conexion.

**Por que esto importa**: Toda la logica de relaciones, permisos, jerarquias y calculos esta expresada directamente en SQL. No hay una capa intermedia que abstraiga los datos. Para entender que hace el sistema, hay que leer las queries SQL, que son la documentacion real de la logica de negocio.

### Las queries mas complejas del sistema

#### El reporte de logro de competencias (14 tablas)

La funcion `_getEvaluationMarks` en `v2/reports/model.js` es la query mas critica del sistema. Responde a la pregunta: "para cada estudiante de esta seccion, que nota obtuvo en cada evaluacion y como se traduce eso en logro de competencias".

Para responderla, cruza **14 tablas en un solo JOIN**:

```
asm_student_marks (notas)
  + imp_section_evaluationcomponents (que evaluaciones tiene la seccion)
  + cls_sectionscomposition (a que curso/pensum pertenece)
  + cls_sections (datos de la seccion)
  + cls_sections_teachers (quien la dicta)
  + upl_teachers (nombre del docente)
  + imp_sectioncomponent_outcomes (que resultados evalua)
  + imp_section_outcomes (resultados de aprendizaje)
  + imp_competencylevel_sectionoutcomes (vinculo con competencias)
  + imp_competency_levels (niveles de competencia)
  + imp_courses_competencies (tributacion)
  + imp_competencies (datos de la competencia)
  + upl_students (datos del estudiante)
  + upl_pensums (plan de estudio — condicional)
```

Esta query se ejecuta cada vez que un docente o administrador abre un reporte de logro. Con la tabla de 799k filas participando, el rendimiento depende enteramente del volumen de datos del cliente.

#### El detalle de hito milestone (~20 tablas via CTEs)

La funcion `_getDetail` construye la ficha completa de un estudiante en un hito usando **5 CTEs encadenadas** que producen JSON anidado (`JSON_ARRAYAGG`). Involucra ~20 tablas entre intentos, situaciones evaluativas, componentes, notas, competencias, datos del estudiante, carrera, campus, plan de estudio y estado del hito.

#### La estructura del syllabus (18 tablas con 9 UNIONs)

La funcion `_getSyllabusStructure` determina si un usuario puede ver y editar un syllabus. Para resolverlo, hace **9 ramas UNION** que cubren cada tipo de relacion posible entre el usuario y la seccion:

1. Es el profesor principal?
2. Es profesor asistente?
3. Es coordinador de la seccion?
4. Es estudiante inscrito?
5. Es admin con acceso a la seccion?
6. Es admin con acceso al curso?
7. Es admin con acceso a la unidad academica?
8. Es admin con acceso a la facultad?
9. Es admin con acceso a la carrera o pensum?

Cada rama hace JOINs con tablas de seguridad (`sec_user_groups`, `sec_groups`, `sec_group_section`) y tablas de estructura academica. El resultado final determina no solo si el usuario tiene acceso, sino que secciones del formulario puede editar segun el estado del workflow.

#### El listado de cursos con tributacion (11 tablas + 3 UNIONs)

Para listar los cursos de un plan de estudio, el sistema necesita buscar en tres fuentes: cursos obligatorios, cursos de especialidad y cursos de concentracion. Cada fuente requiere JOINs diferentes con tablas de especialidades y concentraciones. El resultado se une con la tributacion de competencias.

### Queries en paralelo sin coordinacion

El reporte grupal de milestone (`_getGroupMilestoneRaw`) lanza **7 queries en paralelo** usando `Promise.all`. Cada query consulta un aspecto diferente del mismo hito (datos generales, situaciones evaluativas, competencias, notas por componente, etc.) y los resultados se combinan en JavaScript.

No hay transaccion que coordine las 7 queries — si los datos cambian entre la primera y la septima, el reporte puede mostrar datos inconsistentes. En la practica esto casi nunca ocurre porque los datos de hitos no cambian en tiempo real, pero es un riesgo arquitectural.

---

## Ausencia total de transacciones

**Ninguno de los 7 archivos de modelo principales usa transacciones de base de datos.** Esto significa que operaciones compuestas — como crear una matriz de competencias (INSERT en `imp_competency_sets` + INSERT en `wkf_concepts_statuses`) o actualizar vinculos de tributacion (DELETE + INSERT) — no tienen garantia de atomicidad.

Los casos mas criticos:

| Operacion | Que hace | Que pasa si falla a mitad |
|-----------|---------|--------------------------|
| Crear matriz de competencias | INSERT en `imp_competency_sets` + INSERT en estado de workflow | La matriz queda sin estado → no aparece en listados con filtro de estado |
| Actualizar tributacion (BUG-012) | Desactivar vinculos existentes + crear nuevos | Los vinculos quedan desactivados sin reemplazo → perdida de datos |
| Guardar alineamientos de pensum | SELECT MAX(orden) + INSERT | Dos requests concurrentes asignan el mismo orden → duplicados |
| Crear curso con versionamiento | INSERT en `upl_courses` + ejecutar stored procedure | El curso queda sin version actualizada |
| Clonacion masiva de syllabus | N inserts por cada seccion | Las primeras quedan clonadas, las demas no → estado parcial |

En uP1, el Object Manager usa Prisma con transacciones por defecto en cada mutacion. Este problema estructural desaparece.

---

## Riesgos de seguridad en las queries

### Concatenacion de valores de usuario en SQL

En al menos 3 archivos de modelo, se detectaron casos donde los valores enviados por el usuario se concatenan directamente en el string SQL sin parametrizacion:

```javascript
// Ejemplo simplificado del patron encontrado
if (params.faculty != '') {
    query += ' AND FAC.id_code = ' + params.faculty;
}
```

Este patron es un vector de SQL injection. Si un usuario malicioso envia un valor manipulado en el parametro `faculty`, puede modificar la consulta. En la practica, los endpoints V2 tienen middleware de validacion que mitiga parcialmente el riesgo, pero los endpoints V1 no tienen esta proteccion.

### Multi-statement SQL

En `pensums/set_model.js`, se encontraron queries que envian multiples sentencias SQL separadas por `;` en una sola llamada. Esto depende de que el driver de MariaDB tenga `multipleStatements: true` y hace que los errores sean dificiles de diagnosticar — si falla la segunda sentencia, la primera ya se ejecuto sin rollback.

---

## Logica de negocio incrustada en SQL vs en JavaScript

El sistema tiene un patron interesante: la mayoria de la logica de negocio esta en SQL (queries con JOINs complejos, CTEs recursivas, UNIONs para permisos), pero hay excepciones importantes donde la logica se ejecuta en JavaScript despues de obtener los datos:

### Logica de niveles de logro de milestone

Los rangos de nivel de logro para hitos estan **hardcodeados en JavaScript**, no en la base de datos:

```
No lograda:          0% - 30%
Escasamente lograda: 31% - 59%
Medianamente lograda: 60% - 72%
Lograda:             73% - 85%
Totalmente lograda:  86% - 100%
```

Esto contrasta con la cadena Graduation Profile, donde los niveles y umbrales estan en tablas de BD (`imp_competencylevel_thresholds`, `imp_levelscheme_level_thresholds`) y son configurables por universidad.

**Implicancia**: Si una universidad necesita cambiar los rangos de milestone (por ejemplo, "80% = Lograda" en vez de 73%), se requiere un cambio en el codigo. En uP1, ambos sistemas deben ser configurables por datos.

### Combinacion de queries en paralelo

Los reportes grupales de milestone ejecutan 7 queries en paralelo y combinan los resultados en JavaScript. La "logica" de como se combinan los datos (que campo de la query 3 se cruza con que campo de la query 5) esta en codigo JavaScript, no en SQL.

---

## Lo que debe migrar y lo que no

### Debe migrar (como objetos del Object Manager)

| Dominio | Tablas | Estrategia |
|---------|--------|-----------|
| Competencias | 13 tablas `imp_competency_*` | Mapeo directo — modelo bien normalizado |
| Catalogos | 11 tablas de referencia | Objetos base compartidos por tenant |
| Milestone | 8 tablas `imp_milestone_*` | Objetos propios del mod |
| Workflow | 6 tablas `imp_workflow_*`, `imp_changes_*` | Workflows de uP1 con auditoria |

### Debe migrar con transformacion (consolidacion)

| Dominio | Tablas actuales | En uP1 |
|---------|----------------|--------|
| Cursos (13) + Secciones (8) | 21 tablas duplicadas | Un solo objeto con herencia configurable |
| Estructura de programa | 1 tabla para 3 dominios | 3 definiciones JSON independientes |

### No debe migrar (se reemplaza)

| Lo actual | Se reemplaza por |
|-----------|-----------------|
| SQL raw (17,000 lineas) | Resolvers GraphQL + Prisma ORM |
| Permisos en queries SQL (9 UNIONs) | RBAC del Object Manager |
| Plantillas de reportes en codigo | Layouts JSON + Report Builder |
| `asm_student_marks` de Class | Attendance & Grades de uP1 + integraciones LMS/SIS |
| Tablas `sec_*` y `wkf_*` | Sistema de permisos y workflow nativo de uP1 |

### Debe preservarse como conocimiento

| Que | Por que |
|-----|---------|
| La logica de las 9 ramas UNION de permisos | Documenta TODOS los caminos por los cuales un usuario puede tener acceso a un syllabus. El RBAC de uP1 debe cubrir los mismos escenarios |
| La query de 14 tablas para logro de competencias | Documenta la cadena completa de datos necesaria para calcular logro. El resolver GraphQL de uP1 debe producir el mismo resultado |
| Los rangos de milestone | Deben convertirse de hardcode JS a configuracion por datos en uP1 |
| Las CTEs recursivas de estructura | Documentan la complejidad de los formularios dinamicos. El Layout Engine de uP1 debe resolver el mismo problema |

---

## Resumen para planificacion de migracion

| Fase | Que migrar | Riesgo | Dependencia |
|------|-----------|--------|-------------|
| 1. Catalogos y referencia | 11 tablas imp_* + tablas upl_* de estructura academica | Bajo | Estructura academica debe existir primero en uP1 |
| 2. Competencias | 13 tablas imp_competency_* | Medio | Ninguna interna |
| 3. Cursos + Programas | 13 tablas imp_course_* (consolidar con seccion) | Alto | Catalogos + competencias |
| 4. Syllabus + Secciones | 8 tablas imp_section_* (799k filas) | Alto | Cursos + datos de cls_* deben existir en uP1 |
| 5. Milestone | 8 tablas imp_milestone_* | Medio | Competencias + secciones |
| 6. Reportes | No migrar tablas — reimplementar como resolvers | Muy alto | Todo lo anterior + fuente de notas |
