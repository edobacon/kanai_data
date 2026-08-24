---
id: SPEC-reassess-019
project: up1
type: spec
module: reassess
tags: [assessment, logica-negocio, flujos, ciclo-curricular, configuracion, estructura, diseno, operacion, medicion, reportes, fases]
relates: []
clients: []
modules: [improve-api, syllabus, pensums, competency-matrix, courses, reports, commons]
risk: low
---
# 09 — Vision General: Logicas de Negocio y Flujos de uAssessment

Este documento describe **todo lo que hace uAssessment** desde la perspectiva del negocio: que procesos soporta, que actores participan, como fluyen los datos, y por que cada pieza existe. Sirve como mapa de referencia para entender que se esta migrando a uP1.

---

## El ciclo completo

uAssessment soporta el ciclo de vida curricular de una universidad en 6 grandes fases:

```
1. CONFIGURAR        →  Definir como funciona el sistema para esta universidad
2. ESTRUCTURAR       →  Crear la estructura academica (facultades, carreras, periodos)
3. DISENAR           →  Crear planes de estudio, programas de curso, matrices de competencias
4. OPERAR            →  Los docentes completan syllabus, tributan competencias, registran evidencias
5. MEDIR             →  El sistema calcula logro de competencias por estudiante
6. REPORTAR          →  Directivos y acreditadores consultan reportes de logro
```

Cada fase involucra actores diferentes, datos diferentes, y logica de negocio diferente. A continuacion se describe cada una.

---

## Fase 1: Configurar

### Que sucede

Antes de que una universidad pueda usar uAssessment, alguien debe configurar como se comporta el sistema para ella. Esto incluye:

- **Wizard de configuracion inicial**: Un proceso unico que crea toda la estructura base en una sola operacion — la primera facultad, el primer departamento, el primer curso, la primera carrera, el primer plan de estudio, y los permisos iniciales. Es lo primero que se ejecuta cuando se instala uAssessment para un cliente nuevo.

- **Estructura de formularios**: Definir que campos aparecen en cada tipo de documento (plan de estudio, programa de curso, syllabus). Cada universidad puede necesitar campos diferentes. Por ejemplo, una puede requerir un campo "Metodologia STEM" en el syllabus que otra no necesita. Esto se configura en la tabla `imp_program_structure`, que funciona como un motor de formularios dinamicos.

- **Workflows**: Definir que estados tiene cada documento (borrador, en revision, aprobado, vigente) y que roles pueden hacer cada transicion. Una universidad puede tener 3 pasos, otra puede tener 6.

- **Catalogos**: Configurar los listados de referencia — idiomas disponibles, modalidades de curso (presencial, virtual, hibrido), tipos de periodo academico (semestral, trimestral), areas de aprendizaje, estrategias de ensenanza, metodos de evaluacion, formatos de citacion bibliografica.

### Quien lo hace

Solo el **Administrador Global** (usualmente el equipo de implementacion de uPlanner, no la universidad). Este es uno de los dolores detectados: la universidad no puede configurar nada por si misma.

### Donde vive

- Backend: modulos `initial-configuration/`, `program_structure/`, `commons/`
- Frontend: pagina de configuracion inicial (solo AngularJS, sin migracion a Vue)
- BD: `imp_program_structure`, `imp_workflow_concepts`, tablas de catalogos

### Dependencias

Todo lo demas depende de esta fase. Si la estructura de formularios no esta configurada, los planes de estudio no pueden crearse. Si los workflows no estan definidos, ningun documento puede cambiar de estado.

---

## Fase 2: Estructurar

### Que sucede

Se crea la estructura academica de la universidad dentro del sistema:

- **Instituciones**: La entidad raiz. Cada instalacion corresponde a una institucion.
- **Facultades**: Las grandes divisiones academicas (Facultad de Ingenieria, Facultad de Ciencias, etc.).
- **Unidades academicas / Departamentos**: Subdivisions dentro de facultades que agrupan cursos (Departamento de Matematicas, Departamento de Fisica).
- **Carreras / Programas**: Los programas academicos que un estudiante cursa (Ingenieria Civil, Administracion de Empresas).
- **Campus / Sedes**: Las ubicaciones fisicas donde se imparten los programas.
- **Periodos academicos**: Los semestres, trimestres o cuatrimestres durante los cuales se dictan los cursos.

Esta estructura es la columna vertebral del sistema. Cuando un coordinador crea un plan de estudio, debe asociarlo a una carrera. Cuando un docente ve sus syllabus, el sistema filtra por la unidad academica a la que pertenece.

### Quien lo hace

**Administrador** y **Administrador Global**.

### Donde vive

- Backend: modulos `institutions/`, `faculties/`, `careers/`, `academic_units/`, `campuses/`, `academic_periods/`, `period_types/`
- BD: tablas `upl_*` (compartidas con otros modulos de uPlanner, no exclusivas de assessment)

### Dato importante

Esta estructura **no es exclusiva de uAssessment** — la comparte con otros modulos de la plataforma (Class, Core). Los datos de instituciones, facultades y carreras vienen del modulo Core. Esta dependencia cruzada es una de las razones por las que la migracion no es trivial.

---

## Fase 3: Disenar

Esta es la fase mas rica en logica de negocio. Aqui se crean los tres artefactos curriculares principales y las matrices de competencias.

### 3A. Planes de estudio (Pensums)

**Que es**: La malla curricular de una carrera. Define que cursos debe tomar un estudiante para graduarse, en que orden, con que creditos, agrupados en ciclos (semestres).

**Que puede hacer el usuario**:

1. **Crear un plan**: Asignar carrera, codigo, nombre, periodo de vigencia. El plan nace en estado "borrador".
2. **Definir la malla**: Agregar cursos a cada ciclo del plan. Configurar cuales son obligatorios, cuales electivos, cuales de especialidad.
3. **Organizar especialidades**: Crear "concentraciones" o "especialidades" dentro de la carrera con sus propios conjuntos de cursos.
4. **Configurar bloques electivos**: Definir grupos de electivos con reglas ("elige 3 de estos 5 cursos, sumando al menos 12 creditos").
5. **Establecer equivalencias**: Definir que cursos son equivalentes entre si para efectos de convalidacion.
6. **Definir condiciones academicas**: Reglas de graduacion adicionales (creditos minimos, promedio minimo, etc.).
7. **Versionar**: Crear nuevas versiones del plan cuando hay cambios curriculares. La version vigente es la que se muestra a los estudiantes.
8. **Aprobar via workflow**: El plan pasa por estados (borrador → revision → aprobado → vigente) con comentarios y auditoria.
9. **Publicar**: El plan vigente se puede consultar desde un portal publico sin autenticacion.
10. **Descargar**: Exportar el plan a Excel o como documento con los cursos del plan.

**Quien lo hace**: Coordinador de carrera o Director academico.

**Donde vive**: Backend `pensums/` + `v2/pensums/` (14+ endpoints). Frontend Vue (lista, detalle, crear, tributacion, matriz) + Angular (edicion de datos generales).

### 3B. Programas de curso

**Que es**: El documento normativo de una asignatura. Define que ensena el curso, con que metodologia, como se evalua, que bibliografia usa, y a que competencias contribuye. Es la "plantilla" del curso — independiente de quien lo dicte o en que periodo.

**Que puede hacer el usuario**:

1. **Crear un programa**: Seleccionar un curso del catalogo y crear su programa formal.
2. **Completar el formulario**: El programa tiene secciones dinamicas (configuradas en Fase 1): descripcion, objetivos, resultados de aprendizaje, contenidos por unidad, componentes de evaluacion, estrategias de ensenanza, metodologia, bibliografia, recursos.
3. **Vincular competencias**: Asociar los resultados de aprendizaje del curso con niveles de competencia de la matriz.
4. **Gestionar evaluaciones**: Definir componentes de evaluacion (parciales, trabajos, proyectos) con pesos y modos de calificacion.
5. **Versionar**: Crear nuevas versiones del programa cuando hay cambios.
6. **Clonar**: Copiar programas entre periodos o entre cursos (individual o masivamente).
7. **Aprobar via workflow**: Edicion → Revision → Aprobado → Vigente.
8. **Descargar**: Exportar como documento oficial (usa plantillas por cliente).
9. **Generar archivos de evidencia**: Para procesos de acreditacion.

**Quien lo hace**: Coordinador del curso.

**Donde vive**: Backend `courses/`, `course_program/` (9+ endpoints de cursos, 20+ de programa). Frontend Vue (solo detalle) + Angular (lista, crear, editar, clonar).

### 3C. Matrices de competencias

**Que es**: El marco de referencia que define que competencias debe desarrollar un egresado. Una matriz agrupa competencias por tipo (genericas, especificas, disciplinares), define niveles de logro para cada una, y se vincula a uno o varios planes de estudio.

**Que puede hacer el usuario**:

1. **Crear una matriz**: Nombre, tipo (generica, especifica, transversal), facultades asociadas.
2. **Definir competencias**: Agregar competencias con nombre, descripcion y alcance. Pueden ser jerarquicas (una competencia general tiene sub-competencias).
3. **Definir niveles de logro**: Para cada competencia, establecer niveles (introductorio, intermedio, avanzado) con descriptores.
4. **Configurar esquemas de calificacion**: Definir umbrales (ej: "75% o mas = Logrado, 50-74% = En proceso, menos de 50% = No logrado").
5. **Vincular a planes de estudio**: Asociar la matriz a uno o varios pensums, habilitando la tributacion.
6. **Definir equivalencias**: Entre competencias de diferentes matrices.
7. **Aprobar via workflow**: Las matrices tienen su propio ciclo de estados.

**Quien lo hace**: Coordinador de curriculum o Director academico.

**Donde vive**: Backend `competency_matrix/` (11+ endpoints). Frontend **100% AngularJS** — no hay ninguna pagina Vue para matrices. Esta es la brecha critica mas importante.

### 3D. Tributacion

**Que es**: El acto de conectar cursos con competencias. "Tributar" un curso a una competencia significa declarar que ese curso contribuye a desarrollar esa competencia en un nivel determinado.

**Como funciona**:

1. El coordinador ve la lista de cursos del plan en un lado y el arbol de competencias en el otro.
2. Selecciona un curso y marca a que competencias tributa y en que nivel.
3. La tributacion se guarda a **nivel de curso** — es la promesa del programa.
4. Cuando se crea un syllabus, los vinculos del curso **no se propagan automaticamente** a la seccion. El docente puede (opcionalmente) vincular los resultados de aprendizaje de su seccion con niveles de competencia, pero es un paso manual.

**Donde vive**: Backend `courses/competencies` + `course_program/listCompetencyLevels`. Frontend: Vista de tributacion en Vue (dentro del detalle del pensum) + Vista legacy en Angular (`competencies/tribute`).

---

## Fase 4: Operar

### 4A. Syllabus por seccion

**Que es**: Cada vez que un docente dicta un curso en un periodo, genera un syllabus para su seccion. Es la personalizacion del programa de curso: adapta contenidos, evaluaciones, cronograma y metodologia a su seccion especifica.

**Que puede hacer el usuario**:

1. **Ver sus secciones**: El docente accede a su "home" y ve todas las secciones asignadas en el periodo actual, con el estado de cada syllabus (pendiente, en captura, en revision, publicado).
2. **Completar el syllabus**: Navega al detalle de una seccion y completa el formulario dinamico: contenidos por sesion, evaluaciones, bibliografia, estrategias de ensenanza. La estructura hereda del programa de curso pero permite ajustes.
3. **Vincular competencias a la seccion**: Opcionalmente, vincular los resultados de aprendizaje de la seccion con niveles de competencia (esto habilita la medicion de logro).
4. **Enviar a revision**: Cuando esta completo, cambia el estado a "En revision" via workflow.
5. **Recibir feedback**: Si el coordinador rechaza, el docente recibe el comentario y puede editar.
6. **Clonar**: Copiar su syllabus del periodo anterior al actual. La clonacion masiva permite copiar todos los syllabus de un periodo de una vez (proceso asincrono).
7. **Exportar**: Descargar el syllabus como documento oficial (Word, PDF) o compartirlo publicamente via link.

**Quien lo hace**: **Docente** (captura), **Coordinador** (revision y aprobacion), **Director** (aprobacion final).

**Donde vive**: Backend `syllabus/` + `v2/syllabus/` (13+ endpoints). Frontend: Lista y detalle en Vue + edicion, crear secciones, clonar en Angular.

### 4B. Evidencias de competencias

**Que es**: El docente puede registrar evidencias de que sus estudiantes estan desarrollando las competencias esperadas. Las evidencias son archivos (trabajos, proyectos, presentaciones) vinculados a criterios de evaluacion de competencias.

**Como funciona**:

1. El coordinador ve una tabla de seguimiento con las secciones y sus criterios de competencia.
2. El docente sube archivos de evidencia para cada criterio.
3. El sistema registra que criterios tienen evidencia y cuales no.

**Donde vive**: Backend `evidences-competencies/` + `practice-center/`. Frontend: 100% AngularJS.

---

## Fase 5: Medir

### 5A. Cadena de medicion "Graduation Profile"

**Que mide**: El logro de competencias a nivel de cada curso, en cada periodo. Toma las notas de cada evaluacion y las cruza con la tributacion de competencias para calcular en que nivel esta cada estudiante.

**Flujo de datos**:
- El sistema toma las notas parciales de cada estudiante (`asm_student_marks` — tabla que viene del modulo Class)
- Las cruza con los resultados de aprendizaje de la seccion
- Los resultados de aprendizaje estan vinculados a niveles de competencia
- Los niveles tienen umbrales (ej: "75% = Logrado")
- El sistema clasifica al estudiante en un nivel por competencia

**Quien lo usa**: El **docente** ve como van sus estudiantes en competencias. El **administrador** ve el panorama por carrera.

**Donde vive**: Backend `v2/reports/` (endpoints de reporte docente y admin). Frontend: reportes custom Vue con tablas y graficos D3.

### 5B. Cadena de medicion "Milestone" (Hitos)

**Que mide**: El logro de competencias en puntos de control programaticos. Un hito es un momento definido en la carrera (ej: "al terminar 2do ano") donde el estudiante debe demostrar competencias de forma integrada, a traves de "situaciones evaluativas" que agregan evidencia de multiples cursos.

**Flujo de datos**:
- Se define un hito con sus situaciones evaluativas y competencias asociadas
- Cada situacion tiene componentes de evidencia con ponderacion
- El estudiante realiza un "intento" al hito
- Se registran puntajes por componente y por situacion
- Se calcula un porcentaje de logro global con niveles fijos (0-30% = No lograda, 31-59% = Escasamente lograda, 60-72% = Medianamente lograda, 73-85% = Lograda, 86-100% = Totalmente lograda)

**Quien lo usa**: Solo **administradores** y **directivos**.

**Por que coexisten dos cadenas**: Son modelos complementarios. Graduation mide continuamente, curso a curso. Milestone mide en checkpoints programaticos. Una universidad puede usar ambos — Graduation para seguimiento semestral y Milestone para acreditacion.

**Problema**: No hay una vista unificada. El usuario debe elegir que cadena consultar, y puede obtener respuestas diferentes.

---

## Fase 6: Reportar

### Reportes de la cadena Graduation Profile

| Reporte | Pregunta que responde | Actor | Tecnologia |
|---------|----------------------|-------|------------|
| Logro por competencia (docente) | Como van mis estudiantes en cada competencia? | Docente | Vue/D3 |
| Logro por resultado de aprendizaje | Cuantos estudiantes lograron cada resultado de aprendizaje? | Docente | Vue/D3 |
| Logro por seccion | Comparacion entre secciones del mismo curso | Docente/Admin | Vue/D3 |
| Alineamiento curricular | Que cursos del plan tienen competencias asignadas? Donde hay vacios? | Admin | Vue/D3 |
| Cumplimiento del estudiante | Para este estudiante, en que nivel logro cada competencia? | Admin | Vue/D3 |
| Historico de resultados | Como evoluciono el logro de competencias periodo a periodo? | Docente (con rol admin) | Vue/D3 |
| Progreso por pensum | Como va este estudiante en su plan de estudios? | Admin | Angular (iframe) |
| Seguimiento de syllabus | Cuantos syllabus estan en cada estado? | Coordinador | Angular (iframe) |
| Seguimiento de programas | Cuantos programas de curso estan en cada estado? | Coordinador | Angular (iframe) |
| Sintesis curricular | Vista ejecutiva de salud curricular | Directivo | Power BI |
| Logro integrativo | Vista analitica de logro entre asignaturas | Directivo | Power BI |

### Reportes de la cadena Milestone

| Reporte | Pregunta que responde | Actor | Tecnologia |
|---------|----------------------|-------|------------|
| Hito individual (detalle) | Como le fue a este estudiante en este hito? | Admin | Vue/D3 (radar + barras) |
| Hito individual (progresion) | Como evoluciono este estudiante a traves de los hitos? | Admin | Vue/D3 |
| Hito grupal | Como le fue al grupo en este hito? Cuantos aprobaron? | Admin | Vue/D3 |
| Indicadores globales | A nivel de programa/campus, como van los hitos por cohorte? | Admin | Vue/D3 |

### Reportes descargables

Todos los reportes de milestone tienen exportacion a Excel. Los reportes de descarga de documentos (syllabus, programa de curso, plan de estudio) generan Word o PDF usando plantillas especificas por cliente (40+ plantillas en el directorio `report-templates/`).

---

## Integraciones externas

### UTEC Assessment (activa)

Cuando un docente de UTEC publica su syllabus, el sistema automaticamente envia los resultados de aprendizaje y criterios de evaluacion a la API de UTEC Assessment. Es una integracion unidireccional especifica para un cliente.

### Gateway de cursos (activo)

Otros modulos de uPlanner pueden consultar datos de cursos publicados de uAssessment via endpoints dedicados. Esto permite que el modulo Class sepa que cursos tienen programa publicado.

### Portal publico (activo)

Planes de estudio, cursos y syllabus publicados pueden consultarse sin autenticacion via endpoints publicos. Esto permite a las universidades mostrar su oferta curricular en sus sitios web.

### Integraciones que NO existen

- No hay integracion con Banner (Ellucian)
- No hay integracion con Anthology Student
- No hay integracion con LMS (Brightspace, Canvas)
- No hay ingesta de documentos (PDF/Word → datos estructurados)

Estas ausencias son exactamente lo que el informe ReAssess senala como dolor #1.

---

## Mapa de dependencias entre fases

```
CONFIGURAR
  └── imp_program_structure (define formularios)
  └── imp_workflow_concepts (define estados)
  └── catalogos (idiomas, modalidades, metodos, etc.)
       │
       ▼
ESTRUCTURAR
  └── instituciones → facultades → carreras → unidades academicas
  └── campus, periodos academicos
       │
       ▼
DISENAR
  ├── Planes de estudio (pensums) ←→ Carreras
  ├── Programas de curso ←→ Cursos ←→ Unidades academicas
  ├── Matrices de competencias ←→ Planes + Facultades
  └── Tributacion: Cursos ←→ Competencias
       │
       ▼
OPERAR
  ├── Syllabus ←→ Secciones ←→ Docentes ←→ Periodos
  ├── Competencias de seccion ←→ Resultados de aprendizaje
  └── Evidencias ←→ Criterios de evaluacion
       │
       ▼
MEDIR
  ├── Graduation: notas + tributacion → logro por competencia
  └── Milestone: hitos + situaciones → logro programatico
       │
       ▼
REPORTAR
  ├── Docente: logro en sus secciones
  ├── Coordinador: seguimiento de estados, logro por carrera
  ├── Directivo: indicadores globales, Power BI
  └── Acreditacion: exportacion de evidencias y hitos
```
