---
id: SPEC-confluence-002
project: up1
type: doc
module: confluence
---

# Apps — Learning Assurance

Seccion: 5. Apps > Learning Assurance
Link: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183
Tags: `learning-assurance` `curriculum` `assessment` `competencias` `acreditacion` `integraciones`

Linea actual: **3 apps activas** + 2 en definicion. Disena curriculo, alinea ensenanza con competencias y mide logro estudiantil.

> **Actualizado 2026-04-27**: la pagina raiz "Learning Assurance" reorganizo el alcance — el producto comercial activo son las 3 apps (CD, CM, LA). Pathways y Course Catalog siguen en definicion.

---

## Vision general de Learning Assurance

- **ID**: 1990066183
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183
- **Tags**: `learning-assurance` `curriculum` `assessment` `competencias`

### Apps activas (3)

| App | Pregunta clave | Capacidades | Requisito |
|-----|---------------|-------------|-----------|
| **Curriculum Design** | Que ensenamos y como lo organizamos? | 66 (CAP-CUR-001..065) | Sin requisito previo |
| **Curriculum Mapping** | Esta alineado con lo que prometimos? | 24 (CAP-MAP-001..024) | Requiere Curriculum Design |
| **Learning Assessment** | Lo estan logrando los estudiantes? | 45 (CAP-ASM-001..045) | Requiere Design + Mapping |

### Apps en definicion (no comerciales aun)

| App | Estado |
|-----|--------|
| Learning Pathways | En definicion funcional |
| Course Catalog | En definicion funcional (parcialmente cubierto por CAP-CUR-020 catalogo publico) |

### Diferenciadores
1. Apps independientes — la institucion compra lo que necesita
2. Asistentes IA en cada app
3. Personalizacion institucional (terminologia, workflows, secciones)
4. De la promesa a la evidencia — mide si el curriculo funciona
5. Integraciones bidireccionales con SIS/LMS
6. Acreditacion continua (evidencia como subproducto del uso diario)

---

## Curriculum Design

- **ID**: 1989148681
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681
- **Tags**: `curriculum-design` `syllabi` `workflow` `ia` `taxonomias`

**66 capacidades** (CAP-CUR-001 a CAP-CUR-065) en 8+ areas:

### Areas funcionales

| Area | Codigo | Cobertura |
|------|--------|-----------|
| 1.1 Planes de estudio | CAP-CUR-001..010 | Crear, editar, versionar mallas curriculares. Prerequisitos, electivos, especialidades |
| 1.2 Configuracion de estructura | CAP-CUR-011..013 | Plantillas plan/programa/syllabus. Wizard institucional |
| **1.3 Programas de curso** | **CAP-CUR-014..022** | Descripcion, RA, contenidos, modalidad, bibliografia. Versionamiento. **(SP2: UPONE-1033/1034/1035)** |
| 1.4 Syllabi | CAP-CUR-023..035 | Herencia programa→syllabus. Libertad de catedra. Clonacion masiva |
| 1.5 Catalogos compartidos | CAP-CUR-036..044 | Estrategias, metodos, actividades, tipos curso, idiomas, citas |
| 1.6 Evidencias | CAP-CUR-045..046 | Artefactos que demuestran logro |
| 1.7 IA | CAP-CUR-047..049 | Ingesta documental, cobertura, coherencia |
| 1.8..1.12 | CAP-CUR-050..065 | Categorias requisitos, taxonomias, mejora continua, auditoria, hitos |

### Documentacion derivada en Deckard

Para "Programa de curso" (area 1.3, alcance del SP2): ver [specs/curriculum-design/](../curriculum-design/) — capabilities CAP-CUR-014..022 con notas de implementacion + BRs aplicables + modelo del agregado + decisions.

### Roles
- Coordinador / Director de programa
- Docente
- Equipo de acreditacion
- Estudiante
- Super Admin

---

## Curriculum Mapping

- **ID**: 1987674175
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1987674175
- **Tags**: `curriculum-mapping` `competencias` `perfil-egreso` `tributacion` `ia`

**24 capacidades** (CAP-MAP-001 a CAP-MAP-024).

### Areas funcionales
1. **Matrices de competencias**: jerarquicas (general → sub-competencias), clasificables por tipo, alcance institucional o por programa.
2. **Esquemas de niveles**: cualitativos (Introductorio/Desarrollo/Dominio) o cuantitativos con umbrales numericos.
3. **Perfil de egreso**: declaracion formal de competencias esperadas con niveles y pesos. "Contrato" institucion-estudiante.
4. **Tributacion curricular**: mapeo curso→competencia→nivel con intensidad de alineamiento.
5. **Vinculacion RA→niveles**: permite calculo automatico de logro de competencias en Assessment.
6. **Heatmap** curso x competencia para detectar brechas y solapamientos.
7. **Asistentes IA**: simulador de perfil de egreso, comparador de planes, buscador de equivalencias, recomendador de evaluacion.

---

## Learning Assessment

- **ID**: 1989705746
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989705746
- **Tags**: `learning-assessment` `evaluacion` `competencias` `reporteria` `acreditacion`

**45 capacidades** (CAP-ASM-001 a CAP-ASM-045).

### Areas funcionales
1. **Estructura de evaluacion**: herencia automatica programa→seccion con personalizacion. Organizacion jerarquica con formulas de calculo.
2. **Calculo automatico de logro**: 3 capas — seccion, estudiante, agregacion. Estrategias configurables.
3. **Seguimiento estudiantil**: avance en plan, historial curricular, logro por competencia.
4. **Evidencias y tracking**: documentos que demuestran logro, acciones de mejora.
5. **Reporteria en 3 niveles**:
   - Individual: radar chart, progresion temporal
   - Grupal: comparacion entre secciones/cohortes
   - Global: heatmaps por campus, tendencias por cohorte
6. **Soporte a acreditacion**: evidencia estructurada, mapeo a estandares.
7. **Integraciones**: Banner, Anthology, LMS (Brightspace, Canvas).
8. **Configuracion**: terminologia, workflows, permisos granulares, plantillas de evaluacion.

### Roles
- Docente
- Coordinador/Director de programa
- Direccion academica / Vicerrectoria
- Equipo de acreditacion
- Super Admin

---

## Integraciones

- **ID**: 1989574665
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989574665
- **Tags**: `integraciones` `banner` `anthology` `lms` `bidireccional`

### Modelo bidireccional

| Direccion | Cuando aplica |
|-----------|--------------|
| SIS → uPlanner | Institucion gestiona estructura en SIS. uPlanner importa y enriquece |
| uPlanner → SIS | Institucion crea documentos en uPlanner y exporta al SIS |

Competencias, tributacion, evaluacion e IA siempre autoritativos de uPlanner.

### Sistemas soportados

| Sistema | API | Inbound | Outbound |
|---------|-----|---------|----------|
| Ellucian Banner | Ethos (HEDM, OAuth2, Pub/Sub) | Programas, cursos, secciones, periodos, estudiantes, notas | Estructura evaluacion, metadatos, planes |
| Anthology Student | REST/OData, OAuth2 | ProgramVersions, cursos, secciones, matricula, notas | Estructura evaluacion, metadatos, planes |
| LMS (Brightspace, Canvas) | — | Notas/calificaciones | — |
| Attendance & Grades (uP1) | Interno | No es integracion, comparte infraestructura | — |
| Genericos | — | — | Estructura evaluacion, metadatos, planes |

### Patron de sincronizacion
- Identificador de sistema de origen para tracking (idempotente)
- Configuracion por tenant: URL, credenciales, frecuencia de polling

---

## Reglas transversales

- **ID**: 1988165713
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
- **Tags**: `reglas-transversales` `workflows` `calculo-competencias`

### Reglas principales

| Codigo | Area | Descripcion |
|--------|------|-------------|
| BR-WKF-001-004 | Workflows | Auditoria inmutable, control de acceso, proteccion por estudiantes activos, coordinacion plan↔perfil |
| BR-TNT-001-002 | Multi-tenancy | Aislamiento por institucion, defaults vs config custom |
| BR-INT-001-003 | Integraciones | Identificador de origen, **3 escenarios A/B/C**, fuentes de calificaciones |
| BR-VER-001-002 | Versionamiento | Cadena de versiones, clonacion asincrona |
| BR-PRM-001-002 | Permisos | Granulares por seccion, cascada institucion→facultad→programa |
| BR-NOT-001 | Notificaciones | Motor de notificaciones de uP1 |
| BR-LIC-001 | Licenciamiento | Dependencia comercial Learning Assessment |
| BR-MIG-001-003 | Migracion | Herencia automatica, control de sincronizacion, **bloqueo por calificaciones (max prioridad)** |
| BR-CAL-001-005 | Calculo competencias | 3 capas con estrategias configurables y perfiles default |
| BR-LIB-001-003 | Libertad evaluativa | Restringido/Guiado/Libre, validacion de cobertura, proteccion de resultados criticos |
| BR-MOD-001 | Modelo datos | **Divergencia**: CourseProgram pertenece al catalogo, no al StudyPlan |
| BR-HIL-001-003 | Hitos y flexibilidad | Tipos de plan (secuencial/carrusel/modular), activacion de hitos, progresion |
| BR-TAX-001-003 | Taxonomias | Codificacion dual, catalogos precargados (CIP/ISCED-F/Bloom/ESCO/Tuning/ABET), sugerencia IA |

### Documentacion derivada en Deckard

Las BRs aplicables a "Programa de asignatura" estan resumidas en [specs/curriculum-design/business-rules/](../curriculum-design/business-rules/) — un archivo por BR con texto verbatim + aplicacion al dominio + scope SP2.

---

## Learning Pathways (en definicion)

- **ID**: 1988067392
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988067392
- **Tags**: `learning-pathways` `personalizacion` `recomendacion`

En fase preliminar. Incluira: rutas personalizadas, recomendacion de electivos, visualizacion de progreso.
Depende de: Learning Assessment, Curriculum Mapping, Curriculum Design.

---

## Course Catalog (en definicion)

- **ID**: 1988067399
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988067399
- **Tags**: `course-catalog` `publicacion` `busqueda`

En fase preliminar. Incluira: catalogo publico de programas/cursos, busqueda multi-criterio, comparador de programas.
Depende de: Curriculum Design, Curriculum Mapping.
