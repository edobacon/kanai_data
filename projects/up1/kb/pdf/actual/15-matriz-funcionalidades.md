---
id: SPEC-reassess-025
project: up1
type: spec
module: reassess
tags: [assessment, matriz, funcionalidades, dependencias, hubs, riesgo, orden-migracion, up1, fases]
relates: []
clients: [uniandes, ust-cft, anahuac, upc]
modules: [improve-api, syllabus, pensums, competency-matrix, courses, reports, structure-helper]
risk: very-high
---
# 15 — Matriz de Funcionalidades: PDF vs Sistema Actual vs Dependencias

Este documento cruza cada funcionalidad mencionada en el informe ReAssess con su estado real en el sistema, las partes internas de assessment que participan, y las dependencias externas que tiene. El resultado es un mapa que permite ver, para cada funcionalidad propuesta, que tan facil o dificil es implementarla en uP1 y que se debe resolver primero.

---

## Como leer esta matriz

Cada funcionalidad tiene:
- **Informe dice**: Lo que el PDF propone o detecta
- **Estado actual**: Si existe, si funciona, si esta roto
- **Modulos internos involucrados**: Que partes de improve-api participan (backend, frontend, BD)
- **Dependencias externas**: Que datos o servicios de otros modulos necesita
- **Hub de dependencias**: El componente que conecta todo — el cuello de botella
- **Riesgo**: Que tan complejo es migrarlo a uP1

---

## Modulo 1: Curriculum Management (Gestion Curricular)

### F01 — Gestion de planes de estudio (mallas curriculares)

**Informe dice** (pag. 15): Administracion centralizada de planes de estudio y mallas. Entry point del sistema modular.

**Estado actual**: Funciona. Es el area mas madura del sistema junto con syllabus. Lista y detalle migrados a Vue; creacion, edicion y descarga parcialmente en Angular.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `pensums/services.js` (45 funciones get + 30 write), `pensums/get_model.js` (2,413 lineas), `pensums/set_model.js` (854 lineas) |
| Frontend Vue | `pensum/maintainer/index.vue` (lista), `pensum/maintainer/_id/index.vue` (detalle), `pensum/maintainer/create/` (crear), `pensum/maintainer/_id/edit/` (tributacion), `pensum/maintainer/matrix/` (gestor de matriz) |
| Frontend Angular | Edicion de datos generales, vistas legacy de plan |
| BD | `imp_pensum_data`, `upl_courses_pensums`, `upl_pensums_specialties`, `upl_pensums_concentrations` + 15 tablas mas de estructura |

**Dependencias internas (dentro de assessment)**:
- `course_program/course_program_service` — pensums llama al service de programa de curso para operaciones cruzadas
- `helpers/structure.helper` — el motor de formularios dinamicos (eval()) construye la estructura del plan
- `program_structure/` — la configuracion de que campos tiene el plan
- `commons/` — estados de workflow del plan

**Dependencias externas (otros modulos)**:
- `upl_courses` (Core) — catalogo de cursos que componen el plan
- `upl_careers` (Core) — cada plan pertenece a una carrera
- `upl_faculties` (Core) — filtros y permisos por facultad
- `upl_academicperiod_cycles` (Core) — ciclos/semestres del plan
- `upl_campuses` (Core) — sedes donde se ofrece
- `sec_user_groups` + `sec_groups` + `sec_group_section` (Security) — permisos por rol
- `wkf_concepts_statuses` + `wkf_statuses` (Workflow) — estados de aprobacion

**Hub de dependencias**: `helpers/structure.helper.js` — todo pasa por aqui para renderizar el formulario dinamico del plan.

**Riesgo para migracion**: MEDIO. La logica de negocio es clara, los datos estan bien organizados. El riesgo principal es migrar la configuracion de `imp_program_structure` (que campos tiene cada universidad) a objetos JSON de uP1.

---

### F02 — Gestion de programas de curso

**Informe dice** (pag. 15): Gestion centralizada de programas de asignatura con secciones configurables.

**Estado actual**: Funciona pero solo detalle migrado a Vue. Lista, crear, editar y clonar siguen en Angular.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `course_program/course_program_service.js`, `course_program_model.js`, `course_program_set_model.js`, `course_program_list_model.js` |
| Frontend Vue | `course-program/maintainer/_id/index.vue` (solo detalle) |
| Frontend Angular | Lista, crear, editar, clonar (todo) |
| BD | `imp_course_data` (25k), `imp_course_units` (41k), `imp_course_evaluationcomponents` (99k), `imp_course_references` (60k), `imp_course_outcomes`, + 8 tablas mas |

**Dependencias internas**:
- `helpers/structure.helper` — formulario dinamico
- `courses/clone_service` — clonacion de programas
- `competency_matrix/` — listado de competencias para vincular
- `references/` — base de datos bibliografica
- `learning_strategies/`, `methods/`, `resources/` — catalogos de contenido pedagogico
- `commons/` — workflow
- `program_structure/` — configuracion de campos

**Dependencias externas**:
- `upl_courses` (Core) — catalogo maestro de cursos
- `upl_academicunits` (Core) — unidad academica del curso
- `upl_faculties` (Core) — facultad
- `wkf_*` (Workflow) — estados de aprobacion
- `sec_*` (Security) — permisos

**Hub de dependencias**: `course_program_model.js` — es el pivote critico, consumido por 6+ modulos internos (courses, program_structure, structure, citation, public/report, helpers).

**Riesgo para migracion**: MEDIO-ALTO. El modelo de curso tiene 13 tablas que deben consolidarse con las 8 de seccion. El pivote `course_program_model` es consumido por muchos modulos — cambios en su estructura afectan en cascada.

---

### F03 — Gestion de syllabus por seccion

**Informe dice** (pag. 15): Captura de syllabus por docente, herencia del programa de curso.

**Estado actual**: Funciona. Lista y detalle migrados a Vue. El archivo de service mas grande del sistema (2,302 lineas, 47 funciones). El modelo mas grande (3,959 lineas, ~60 funciones).

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `syllabus/syllabus_service.js` (47 funciones), `syllabus_model.js` (3,959 lineas), `syllabus_set_model.js`, `syllabus_list_model.js`, `syllabus_clone_service.js` |
| Frontend Vue | `syllabus/maintainer/index.vue` (lista), `syllabus/maintainer/_id/index.vue` (detalle), import.vue, export.vue |
| Frontend Angular | Crear secciones, edicion avanzada, clonacion |
| BD | `imp_section_data`, `imp_section_evaluationcomponents` (799k), `imp_section_references` (396k), `imp_section_outcomes`, + 4 tablas mas |

**Dependencias internas**:
- `section-list/section_list_model` — la "home" del docente (lista de secciones)
- `utec-assesment/service` — integracion especifica de UTEC Peru (se dispara al publicar)
- `helpers/structure.helper` — formulario dinamico (con eval())
- `course_program/` — herencia de estructura del programa
- `competency_matrix/` — competencias para vincular a la seccion
- `references/`, `citation/` — bibliografia y formato de citas
- `learning_strategies/`, `methods/`, `resources/` — catalogos
- `commons/` — workflow
- `v2/utils/clonning_model` — clonacion masiva

**Dependencias externas**:
- `cls_sections` (Class) — la seccion como entidad (grupo de clase)
- `cls_sectionscomposition` (Class) — relacion seccion-curso-pensum
- `cls_sections_teachers` (Class) — docentes asignados (donde vive BUG-011)
- `cls_students_sections` (Class) — estudiantes inscritos
- `cls_sections_coordinators` (Class) — coordinadores
- `upl_courses` (Core) — datos del curso
- `upl_teachers` (Core) — datos del docente
- `upl_academicperiods` (Core) — periodo academico
- `sec_*` (Security) — permisos (9 ramas UNION)
- `wkf_*` (Workflow) — estados

**Hub de dependencias**: `syllabus_model.js` — el modelo mas grande del sistema, consumido por 6+ modulos internos. Ademas tiene dependencia bidireccional con `helpers/structure.helper` (potencial ciclo).

**Riesgo para migracion**: ALTO. Es el modulo con mas volumen de datos (799k + 396k filas), mas dependencias cruzadas (Class, Core, Security, Workflow), y el servicio mas monolitico. Ademas contiene BUG-015 (clonacion en memoria sin rollback).

**Lo que el informe NO ve**: El syllabus actual depende fuertemente de 5 tablas de Class (`cls_*`). En uP1 no existe "Class" como modulo separado — estas dependencias deben resolverse con Attendance & Grades o con objetos propios del mod.

---

### F04 — Carga masiva de documentacion curricular

**Informe dice** (pag. 15): Carga masiva con IA generativa, crear tablas de datos desde PDF/Word/Excel. Funcionalidad estrella del M1.

**Estado actual**: **No existe como la propone el informe.** Lo que hay es carga via CSV sincrono en 2 endpoints.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `courses/courses_service.js` → `createCourses` (CSV de cursos), `syllabus/syllabus_service.js` → `createSections` (CSV de secciones) |
| BD | INSERT directo en `upl_courses` y `cls_sections` + datos asociados |

**Dependencias internas**: Minimas — cada endpoint opera de forma independiente.

**Dependencias externas**:
- `upl_courses` (Core) — insertar cursos
- `cls_sections` (Class) — crear secciones

**Hub de dependencias**: Ninguno. Es funcionalidad aislada.

**Riesgo para migracion**: BAJO (como funcionalidad) pero ALTO (como oportunidad). Lo que existe hoy es primitivo — CSV sincrono sin preview ni validacion. En uP1 esto se reemplaza completamente con `/upload` + `importInstances` + IA de ingesta documental (CAP-CUR-048). No hay logica de negocio que preservar; hay que construir desde cero.

---

### F05 — Versionamiento de planes y programas

**Informe dice** (pag. 15): Extension propuesta — gestor de versiones de planes de estudio y syllabus.

**Estado actual**: Funciona parcialmente. Los planes tienen versionamiento (multiples versiones, una vigente). Los programas tienen `imp_course_version_control`. Los syllabus heredan del periodo.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `pensums/` → `checkVersion`, `getLastVersion`, stored procedure `sp_refreshing_versioning_coursedata` (courses) |
| BD | `imp_course_version_control`, `upl_pensums` (campo `isCurrent`) |

**Dependencias internas**: `courses/courses_model` → stored procedure de versionamiento (unico SP del sistema).

**Dependencias externas**: `upl_courses` (Core) — el curso base del que se versionan los programas.

**Riesgo para migracion**: BAJO-MEDIO. El concepto funciona. En uP1 se reemplaza con cadena de versiones (BR-VER-001) que es mas robusta.

---

### F06 — Descarga/exportacion de documentos

**Informe dice** (pag. 10): Los formatos actuales no satisfacen. Personalizado por cliente.

**Estado actual**: Funciona pero con 56 carpetas de plantillas .docx en codigo y logica condicional por cliente.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `helpers/structure.helper.js` → funciones de generacion de documentos Word/PDF, `helpers/structure.exporter.helper.js`, `report-templates/` (56 carpetas) |
| Mecanismo | Template .docx + datos → documento generado. Seleccion via variable de entorno `clientTemplate` |

**Dependencias internas**: `helpers/structure.helper` es el hub — genera documentos para syllabus, programa de curso y plan de estudio.

**Dependencias externas**: Azure Blob Storage (subida de archivos generados).

**Hub de dependencias**: `helpers/structure.helper.js` + `report-templates/{cliente}/`.

**Riesgo para migracion**: ALTO. Son 56 x 3 = ~168 plantillas que deben convertirse en layouts configurables por datos. Cada universidad espera que su documento descargado se vea como siempre se vio.

---

## Modulo 2: Curriculum Mapping (Mapeo de Competencias)

### F07 — Matrices de competencias

**Informe dice** (pag. 18): Mapear, gestionar y monitorear desarrollo de competencias. Heatmap de tributacion.

**Estado actual**: Funciona en la logica pero 100% en AngularJS (BUG mas grave + peor UX del sistema).

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `competency_matrix/services.js` (30 funciones, 1,897 lineas), `competency_matrix/model.js` (2,917 lineas) |
| Frontend Angular | `competencies/matrix/index.vue` (lista, iframe), `competencies/matrix/edit.vue` (editar, iframe), `competencies/matrix/_id/levels.vue` (niveles, iframe), `competencies/matrix/_id/pensum.vue` (vincular a plan, iframe) |
| Frontend Vue | **Ninguna pagina Vue para competencias** |
| BD | `imp_competency_sets`, `imp_competencies`, `imp_competency_levels`, `imp_competencylevel_thresholds`, `imp_competencylevel_criteria` + 8 tablas mas (13 total) |

**Dependencias internas**:
- `helpers/structure.helper` — formulario dinamico para datos de la matriz
- `v2/utils/frontTypeSelector` — seleccion de tipo de campo

**Dependencias externas**:
- `upl_pensums` (Core) — planes vinculados a la matriz
- `upl_careers` (Core) — carreras
- `upl_faculties` (Core) — facultades asociadas
- `upl_courses` (Core) — cursos para tributacion
- `sec_*` (Security) — permisos con 3 ramas UNION para matrices
- `wkf_*` (Workflow) — workflow propio con endpoint dedicado (`/workflow-transition`)

**Hub de dependencias**: `competency_matrix/model.js` — 2,917 lineas de queries con JOINs de hasta 13 tablas. Es autocontenido (no consume otros modulos de improve-api) pero es consumido por todos los que necesitan datos de competencias.

**Riesgo para migracion**: MUY ALTO. Es el dominio mas valioso sin interfaz moderna, con el modelo de datos mas profundo (6 niveles de jerarquia) y un workflow propio inconsistente con el resto del sistema.

---

### F08 — Tributacion de cursos a competencias

**Informe dice** (pag. 18-19): Visualizaciones de como cada curso tributa al perfil de egreso. Heatmap propuesto (Figura 5).

**Estado actual**: Funciona con limitaciones criticas. Tributacion solo a nivel de curso, no se propaga a seccion (RULE-023, RULE-011). BUG-012 puede corromper vinculos.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `courses/courses_model.js` → `competencies` endpoints, `course_program/` → `listCompetencyLevels`, `syllabus/` → `_setCompetencyLevelOutcome` (donde vive BUG-012) |
| Frontend Vue | `pensum/maintainer/_id/edit/index.vue` — vista de tributacion (panel dividido cursos + competencias) |
| Frontend Angular | `competencies/tribute` (vista legacy de tributacion) |
| BD | `imp_courses_competencies` (pivote curso↔competencia), `imp_competencylevel_courseoutcomes`, `imp_competencylevel_sectionoutcomes` |

**Dependencias internas**:
- `competency_matrix/` — provee la jerarquia de competencias
- `pensums/` — provee la lista de cursos del plan
- `syllabus/` — la propagacion (manual) a nivel de seccion
- `course_program/` — vinculos de resultados de aprendizaje

**Dependencias externas**:
- `upl_courses_pensums` (Core) — cursos obligatorios del plan
- `upl_pensums_specialties` + `upl_courses_specialties` (Core) — cursos de especialidad
- `upl_pensums_concentrations` + `upl_courses_concentrations` (Core) — cursos de concentracion

**Hub de dependencias**: `imp_courses_competencies` — tabla pivote que conecta el mundo curricular con el mundo de competencias. Todo reporte de logro pasa por aqui.

**Riesgo para migracion**: MUY ALTO. Contiene BUG-012 (vinculos huerfanos), la propagacion no es automatica, y la tabla pivote es el puente critico entre dos dominios. Si se migra con datos corruptos, los reportes en uP1 heredan los problemas.

**Lo que el informe NO ve**: El heatmap que propone (Figura 5) asume datos de tributacion completos y consistentes. Pero BUG-012 puede haber dejado datos inconsistentes en produccion para multiples clientes. Antes de mostrar un heatmap, hay que verificar integridad de datos.

---

### F09 — Comparador de planes y equivalencias (IA)

**Informe dice** (pag. 18-19): Simuladores de comparacion entre planes, equivalencia entre cursos, estrategias de evaluacion.

**Estado actual**: **No existe.** Las equivalencias entre cursos existen como dato (`pensums/getCoursesEquivalences`) pero no hay comparacion analitica ni IA.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `pensums/` → equivalencias como CRUD basico |
| BD | `upl_courses_equivalences` (probablemente en Core, no en imp_*) |

**Dependencias internas**: Minimas.
**Dependencias externas**: `upl_courses` (Core).

**Riesgo para migracion**: BAJO (la funcionalidad actual es trivial). El valor esta en construir algo nuevo en uP1 (CAP-MAP-022, CAP-MAP-023, CAP-MAP-024).

---

## Modulo 3: uAssessment (Medicion de Logro)

### F10 — Calculo de logro de competencias (Graduation Profile)

**Informe dice** (pag. 21): Monitoreo sistematico del logro de competencias y resultados de aprendizaje.

**Estado actual**: Funciona pero con la query mas fragil del sistema (14 tablas) y dependencia critica de datos externos.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `v2/reports/service.js` (35 funciones, 3,880 lineas), `v2/reports/model.js` (3,129 lineas — 31 funciones con queries de hasta 20 tablas) |
| Frontend Vue | `graduation-profile-teacher/`, `graduation-profile-principal/`, `graduation-results-teacher/` |
| BD | `asm_student_marks` (fuente de notas), `imp_section_evaluationcomponents` (799k), `imp_competencylevel_sectionoutcomes`, `imp_section_outcomes`, `imp_competency_levels`, `imp_competencies` + 8 tablas mas |

**Dependencias internas**:
- `v2/utils/permission` — validacion de roles
- Ninguna dependencia directa a otros modulos de improve-api (modelo aislado)

**Dependencias externas** (la mayoria):
- `asm_student_marks` (Class/Assessment) — **fuente primaria de notas**. Sin esto, no hay logro
- `cls_sections` + `cls_sectionscomposition` + `cls_sections_teachers` (Class) — contexto de la seccion
- `cls_students_sections` (Class) — que estudiantes estan en cada seccion
- `upl_students`, `upl_teachers`, `upl_courses`, `upl_pensums` (Core) — datos maestros
- `upl_academicperiods` (Core) — periodos
- `reg_enrollments` (Registros) — matriculas (alternativa a notas parciales)
- `sec_user_groups` + `sec_groups` (Security) — permisos para filtros

**Hub de dependencias**: `asm_student_marks` — sin esta tabla externa, toda la cadena de logro de competencias no tiene datos. Es la dependencia externa mas critica del sistema.

**Riesgo para migracion**: MUY ALTO. La query de 14 tablas debe reimplementarse como resolver GraphQL. La fuente de notas cambia (DEC-012). Los niveles de logro son configurables (bien) pero dependen de que toda la cadena de tributacion este intacta (BUG-012 puede haberla corrompido).

---

### F11 — Calculo de logro por hitos (Milestone)

**Informe dice**: **No lo menciona.** Es el punto ciego mas grande del informe (Discovery 1, DEC-011).

**Estado actual**: Funciona. Es la funcionalidad mas sofisticada del sistema en terminos de reportes y visualizacion.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `v2/reports/service.js` → funciones de milestone (detail, progression, group, global), `v2/reports/model.js` → queries con CTEs de ~20 tablas |
| Frontend Vue | `reports/individual-milestone/`, `reports/group-milestone/`, `reports/global-milestone/` — con graficos D3 (radar, barras, matrices) |
| BD | `imp_milestones`, `imp_milestone_attempt`, `imp_milestone_evaluation_situations`, `imp_milestone_evaluationsitutation_components`, `imp_milestone_evaluation_situations_aggregated_scores`, `imp_milestone_evaluation_component_scores`, `imp_course_evidences`, `imp_milestone_statuses` (8 tablas propias) |

**Dependencias internas**: Contenido en `v2/reports/` — no depende de otros modulos de improve-api.

**Dependencias externas**:
- `cls_students_sections` + `cls_sections` (Class) — contexto de secciones
- `upl_students`, `upl_campuses`, `upl_careers`, `upl_pensums` (Core) — datos maestros
- `upl_campus_academicperiod_shift` (Core) — turnos por campus
- `imp_competency_levels` + `imp_competencies` — competencias (interno)

**Hub de dependencias**: `imp_milestone_attempt` — conecta al estudiante con el hito y sus resultados.

**Riesgo para migracion**: MEDIO-ALTO. Las queries son las mas complejas del sistema (CTEs de 20 tablas con JSON_ARRAYAGG) pero el dominio es autocontenido. El riesgo principal: los niveles de logro estan hardcodeados en JavaScript (0-30-59-72-85-100%), no en BD. En uP1 deben ser configurables.

**Lo critico**: Los reportes de milestone **no validan permisos en el backend** (DEC-007). `global-milestone` ni siquiera tiene `permissionUrl`. Esto debe corregirse en la migracion.

---

### F12 — Reporteria personalizable por rol

**Informe dice** (pag. 21): Reporte personalizable por Super Admin u otros roles, interaccion dinamica, descarga masiva.

**Estado actual**: Existen 45+ endpoints de reportes + 40+ plantillas por cliente + Power BI embebido. No personalizable por el usuario.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend reportes custom | `v2/reports/` (45+ endpoints), `v2/filters/` (filtros compartidos) |
| Backend reportes descarga | `helpers/structure.helper.js` → generacion Word/PDF, `report-templates/` (56 carpetas) |
| Frontend Vue reportes custom | 4 reportes con specs (graduation-profile-teacher, graduation-profile-principal, graduation-results-teacher, + milestone reportes) |
| Frontend Power BI | `reports/learning.vue`, `reports/learning-integrative.vue`, `reports/curricular-syntesis.vue` |
| Frontend Angular iframe | `reports/pensum-progress`, `reports/syllabus-tracking`, `reports/course-tracking` |

**Dependencias internas**: `v2/filters/` provee filtros centralizados para todas las vistas.

**Dependencias externas**: Todas las del F10 + F11 (reportes consumen todo el grafo de datos).

**Hub de dependencias**: `v2/reports/model.js` — 31 funciones SQL que son la fuente de datos de TODOS los reportes custom. Es completamente aislado (no depende de otros modulos internos) pero necesita datos de 6+ modulos externos.

**Riesgo para migracion**: MUY ALTO. Mayor volumen de codigo, mayor diversidad de patrones (Vue custom + Power BI + Angular iframe + 2 librerias de Excel), mayor personalizacion por cliente. Es el area donde uP1 (Report Builder + Flexmonster + layouts JSON) ofrece el mayor salto, pero tambien donde hay mas riesgo de perder funcionalidad especifica de algun cliente.

---

### F13 — Integraciones con SIS y LMS

**Informe dice** (pag. 10, 18, 21): Banner para calificaciones (UST-CFT), Brightspace para trazabilidad (Uniandes), LMS para acceso estudiantil (Anahuac).

**Estado actual**: **No existe excepto integracion UTEC.**

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `utec-assesment/` — unica integracion activa (especifica de UTEC Peru), `v2/gateway/` — endpoints para que otros modulos consulten datos de assessment |
| BD | Ninguna tabla de integracion en imp_* |

**Dependencias internas**: `utec-assesment/service` es consumido por `syllabus/syllabus_service` al publicar un syllabus.

**Dependencias externas**: API externa de UTEC (`https://api.utec.net.pe`).

**Riesgo para migracion**: BAJO (no hay nada que migrar). La oportunidad es construir desde cero en uP1 con las integraciones especificadas (Banner via Ethos API, Anthology REST/OData, LMS Brightspace/Canvas).

---

### F14 — Seguimiento de progreso estudiantil

**Informe dice** (pag. 21): Extension futura — rutas de aprendizaje personalizadas.

**Estado actual**: Funciona basicamente en `pensum_progress/`.

| Capa | Componentes involucrados |
|------|------------------------|
| Backend | `pensum_progress/services.js` (9 funciones), `pensum_progress/model.js` (423 lineas) |
| Frontend Angular | `reports/pensum-progress` (iframe) |
| BD | Cruza 4 dominios: `reg_*` (matriculas), `enr_*` (progreso), `asm_*` (notas), `cls_*` (secciones) |

**Dependencias internas**: Ninguna — modulo aislado.

**Dependencias externas** (masivas):
- `enr_pensum_progress` (Enrollment) — progreso en el plan
- `reg_enrollments` + `reg_student_pensums` + `reg_student_statuses` (Registros) — matriculas
- `asm_student_marks` (Class) — notas
- `cls_sectionscomposition` (Class) — composicion de secciones
- `upl_courses`, `upl_pensums`, `upl_students`, `upl_academicperiods` (Core)

**Hub de dependencias**: `enr_pensum_progress` — tabla de otro modulo que contiene el estado de cada curso del plan para cada estudiante. Sin esta tabla, no hay vista de malla con progreso.

**Riesgo para migracion**: MEDIO. El modulo es pequeno y aislado, pero depende de 4 dominios externos. En uP1, estos datos deben estar disponibles antes de implementar seguimiento.

---

### F15 — Rol Super Admin y gobernanza

**Informe dice** (pag. 22-23): Super Admin configura identidad, lenguaje, roles, reporteria, gestiona incidencias.

**Estado actual**: **No existe como funcionalidad.**

| Capa | Lo que deberia existir | Lo que hay |
|------|----------------------|-----------|
| Configuracion de identidad | UI para cambiar logos, colores, terminologia | Variable de entorno `clientTemplate` → carpeta de plantillas |
| Configuracion de lenguaje | UI para editar traducciones | Archivos JSON en repo `lang/` (requiere deployment) |
| Configuracion de roles | UI para crear/editar roles y permisos | Tablas `sec_*` manipuladas por equipo tecnico |
| Configuracion de reporteria | UI para definir que reportes ve cada rol | 40+ plantillas en codigo |
| Gestion de incidencias | Modulo de ticketing interno | No existe |
| Configuracion de workflow | UI para definir estados y transiciones | Tablas `wkf_*` manipuladas por equipo tecnico |
| Configuracion de estructura | UI para definir campos del formulario | `imp_program_structure` manipulada por equipo tecnico |

**Dependencias**: Todas — el Super Admin necesita tocar configuracion que afecta a TODOS los modulos.

**Riesgo para migracion**: N/A (no hay nada que migrar). Es funcionalidad nueva de uP1. Pero es la que mas impacto tiene en la experiencia del cliente — si uP1 no la tiene, el dolor #5 del informe (intermediarios) persiste.

---

## Mapa de descubrimiento: que modulos y funcionalidades son criticos

### Los 5 hubs de dependencias

```
1. helpers/structure.helper.js (5,123 lineas)
   └── Consumido por: syllabus, pensums, competency_matrix, course_program, program_structure, citation
   └── Afecta: F01, F02, F03, F06, F07
   └── Riesgo: eval(), God Object, no extensible

2. course_program_model.js (pivote)
   └── Consumido por: courses, program_structure, structure, citation, public/report, helpers
   └── Afecta: F02, F03, F06, F08
   └── Riesgo: Cambios en cascada a 6+ consumidores

3. imp_courses_competencies (tabla pivote)
   └── Consumida por: tributacion, reportes de logro, progreso, heatmaps
   └── Afecta: F08, F10, F11, F12, F14
   └── Riesgo: BUG-012 puede haber corrompido datos

4. asm_student_marks (tabla externa de Class)
   └── Consumida por: reportes Graduation, progreso estudiantil
   └── Afecta: F10, F12, F14
   └── Riesgo: Fuente cambia en uP1 (DEC-012)

5. v2/reports/model.js (31 queries, aislado)
   └── Consumido solo por: v2/reports/service
   └── Afecta: F10, F11, F12
   └── Riesgo: Queries de 14-20 tablas, logica de niveles hardcodeada
```

### Orden sugerido de migracion (por dependencias)

```
Fase 0: Resolver dependencias externas
  └── Estructura academica (Core → Object Manager de uP1)
  └── Fuente de notas (Class → Attendance & Grades / integraciones)
  └── Seguridad (sec_* → RBAC de uP1)
  └── Workflow (wkf_* → Workflows de uP1)

Fase 1: Catalogos + Competencias (base para todo lo demas)
  └── F07: Matrices de competencias (13 tablas imp_competency_*)
  └── Catalogos: 14 modulos de referencia

Fase 2: Cursos + Programas (consolidar curso/seccion)
  └── F02: Programas de curso (13 tablas → objeto unificado)
  └── F05: Versionamiento
  └── F09: Equivalencias (base para comparador IA)

Fase 3: Planes de estudio
  └── F01: Pensums (depende de cursos + competencias)
  └── F08: Tributacion (depende de planes + competencias)

Fase 4: Syllabus (mayor volumen, mayor dependencia)
  └── F03: Syllabus por seccion (799k filas, depende de todo lo anterior)
  └── F04: Carga masiva (funcionalidad nueva)
  └── F06: Descarga/exportacion (56 plantillas)

Fase 5: Medicion y reportes (corona del sistema)
  └── F10: Logro Graduation (depende de notas + tributacion)
  └── F11: Logro Milestone (autocontenido pero depende de competencias)
  └── F12: Reporteria personalizable (depende de todo)
  └── F14: Progreso estudiantil (depende de notas + estructura)

Fase 6: Innovacion (funcionalidad nueva)
  └── F13: Integraciones SIS/LMS
  └── F09: Comparador IA
  └── F15: Super Admin
  └── Rutas de aprendizaje personalizadas
```
