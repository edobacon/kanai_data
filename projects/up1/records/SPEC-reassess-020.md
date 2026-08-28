---
id: SPEC-reassess-020
project: up1
type: doc
module: reassess
tags:
  - assessment
  - reassess
  - cruce
  - dolor
  - oportunidad
  - silencio
  - up1
  - migracion
  - validacion
---

# 10 — Cruce: Que Detecta el Informe ReAssess y Donde Vive en el Sistema

Este documento toma cada punto del sistema actual (documentado en `09-logicas-negocio-completas.md`) y lo cruza con lo que el informe ReAssess identifica — ya sea como dolor, como oportunidad, o como silencio (puntos que el informe no menciona pero que son relevantes para la migracion).

---

## Leyenda

- **DOLOR**: El informe lo identifica como problema critico
- **OPORTUNIDAD**: El informe propone una mejora o innovacion
- **SILENCIO**: El informe no lo menciona, pero tiene impacto en la migracion
- **BIEN**: El informe lo reconoce implicitamente como funcional

---

## Fase 1: Configurar

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Wizard de configuracion inicial | **DOLOR** (pag. 22-23): La configuracion la hace uPlanner, no la universidad. Propone rol Super Admin autonomo | Alto — uP1 debe permitir que la universidad configure su propio sistema |
| Estructura de formularios dinamicos (`imp_program_structure`) | **SILENCIO**: El informe no menciona la tabla ni su fragilidad | Alto — en uP1 esto se reemplaza por objetos JSON independientes, pero la logica de "campos configurables por universidad" debe preservarse |
| Workflows configurables por cliente | **BIEN** (pag. 14): El informe reconoce que las universidades necesitan flujos distintos. Propone que sean configurables sin intermediarios | Medio — uP1 preserva workflows configurables con auditoria inmutable |
| Catalogos (idiomas, modalidades, metodos, etc.) | **SILENCIO**: No se mencionan | Bajo — migracion directa como objetos base |
| Capa de lenguaje / terminologia | **DOLOR** (pag. 11): Las universidades no pueden personalizar como llaman a las cosas ("asignatura" vs "materia") sin abrir tickets | Alto — uP1 tiene i18n con overrides por objeto/tenant, pero debe ser self-service |

---

## Fase 2: Estructurar

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Estructura academica (facultades, carreras, etc.) | **SILENCIO**: El informe asume que existe | Medio — en uP1 cada tenant tiene su propia estructura en PostgreSQL aislado |
| Dependencia con otros modulos (Core, Class) | **SILENCIO**: No se menciona la complejidad de los datos compartidos | Alto — la migracion debe resolver como se importan datos de estructura academica que hoy vienen de otro modulo |
| Periodos academicos | **SILENCIO** | Bajo |
| Portal publico de carreras y planes | **OPORTUNIDAD** (pag. 15-17): Course Catalog propuesto como app independiente | Medio — uP1 tiene Course Catalog en definicion funcional |

---

## Fase 3: Disenar

### 3A. Planes de estudio

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Crear y versionar mallas curriculares | **BIEN**: El informe asume esta funcionalidad como base del Modulo 1 (Curriculum Management) | Base — debe migrarse completa |
| Especialidades, bloques electivos, equivalencias | **OPORTUNIDAD** (pag. 15): Propone gestor de versiones de planes como extension de pago | Medio — uP1 lo implementa como CAP-CUR-051/052 (categorias de requisitos) |
| Workflow de aprobacion de planes | **BIEN** (pag. 14): Parte de la funcionalidad comun a todos los arquetipos | Base |
| Publicacion en portal publico | **OPORTUNIDAD**: Parte del Course Catalog propuesto | Medio |
| Condiciones academicas de graduacion | **SILENCIO**: No se mencionan | Medio — logica especifica que debe preservarse |
| Descarga/exportacion de planes | **DOLOR** (pag. 10): Los formatos actuales no satisfacen. 40+ plantillas por cliente en codigo | Alto — uP1 debe permitir configuracion de plantillas sin deployment |

### 3B. Programas de curso

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Completar programa con formulario dinamico | **BIEN**: Es el nucleo del Modulo 1 | Base |
| Vincular competencias al programa | **BIEN**: Base del Modulo 2 (Curriculum Mapping) | Base |
| Componentes de evaluacion con pesos | **BIEN**: Necesario para Modulo 3 (Assessment) | Base |
| Versionamiento de programas | **OPORTUNIDAD** (pag. 15): Extension propuesta como gestor de versiones | Medio — uP1 lo implementa con cadena de versiones (BR-VER-001) |
| Clonacion masiva de programas | **SILENCIO**: No se menciona el mecanismo actual ni sus problemas | Medio — los dos patrones de clonacion inconsistentes deben unificarse |
| Descarga como documento oficial | **DOLOR** (pag. 10): Plantillas hardcodeadas por cliente | Alto |
| Secciones dinamicas configurables | **BIEN** (pag. 14): Reconocido como necesidad de personalizacion institucional | Alto — uP1 lo implementa con secciones estandar + complementarias configurables |

### 3C. Matrices de competencias

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Crear y gestionar matrices | **BIEN**: Nucleo del Modulo 2 | Base |
| Definir niveles de logro y umbrales | **BIEN**: Necesario para toda la cadena de medicion | Base |
| Esquemas de calificacion configurables | **OPORTUNIDAD** (pag. 18): Propone esquemas cualitativos y cuantitativos | Medio — uP1 lo implementa en CAP-MAP-007/008 |
| Vincular matrices a planes de estudio | **BIEN** | Base |
| Workflow de aprobacion de matrices | **SILENCIO**: No se menciona especificamente | Bajo |
| Equivalencias entre competencias | **SILENCIO**: No se mencionan | Medio — logica que debe preservarse |
| **Interfaz 100% en AngularJS** | **SILENCIO**: El informe no detecta este problema tecnico, pero lo manifiesta como "rigidez" y "falta de personalizacion" | **Critico** — el dominio mas valioso no tiene interfaz moderna |

### 3D. Tributacion

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Mapeo curso → competencia → nivel | **BIEN**: Nucleo del Modulo 2. Incluye heatmap propuesto | Base |
| Tributacion solo a nivel de curso (no seccion) | **SILENCIO**: El informe no detecta que la tributacion no se propaga a seccion | **Critico** — causa perdida de datos (BUG-012) y reportes incompletos |
| Visualizacion de heatmap curso×competencia | **OPORTUNIDAD** (pag. 19): Maqueta incluida en el informe (Figura 5) | Medio — uP1 lo implementa en CAP-MAP-018 |
| Comparador de planes de estudio (IA) | **OPORTUNIDAD** (pag. 18-19): Simuladores de comparacion y equivalencia entre cursos | Alto — uP1 lo implementa en CAP-MAP-022/023 |

---

## Fase 4: Operar

### 4A. Syllabus por seccion

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Docente completa syllabus con formulario dinamico | **DOLOR** (pag. 10): La captura es manual, lenta y costosa. La estructura del formulario no se adapta a cada universidad | Alto |
| Herencia programa → syllabus | **BIEN**: El concepto existe pero no se ejecuta bien. El informe no lo menciona directamente pero la oportunidad de "carga automatica" implica mejorarlo | Alto — uP1 implementa herencia automatica con libertad evaluativa configurable (BR-LIB-001) |
| Carga masiva de secciones desde CSV | **DOLOR** (pag. 10): Proceso sincrono, sin preview, sin validacion | Critico — uP1 reemplaza con `/upload` + preview + importacion asincrona |
| Clonacion masiva entre periodos | **SILENCIO**: Funciona pero con dos patrones inconsistentes | Medio |
| Workflow de aprobacion de syllabus | **BIEN**: Necesario. Propone que el Super Admin pueda configurarlo | Base |
| Exportar syllabus como documento | **DOLOR** (pag. 10): Plantillas hardcodeadas. Propone descarga configurable | Alto |
| Compartir syllabus via link publico | **OPORTUNIDAD**: Parte del Course Catalog | Bajo |
| Libertad de catedra (que puede cambiar el docente) | **DOLOR** (pag. 13-14): Es el eje central de los arquetipos. Universidades centralizadas vs descentralizadas | Critico — uP1 implementa 3 modos: Restringido, Guiado, Libre (BR-LIB-001 a BR-LIB-003) |

### 4B. Evidencias de competencias

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Docente sube archivos de evidencia | **SILENCIO**: No se menciona especificamente | Medio — uP1 lo incluye en Learning Assessment (CAP-ASM-023/024) |
| Coordinador revisa tracking de evidencias | **OPORTUNIDAD** (pag. 21): Propone "soporte a acreditacion" con evidencia estructurada | Medio |
| **Interfaz 100% en AngularJS** | **SILENCIO** | Medio |

---

## Fase 5: Medir

### 5A. Cadena Graduation Profile

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Calculo de logro por competencia basado en notas | **BIEN**: Nucleo del Modulo 3. Es lo que justifica toda la cadena | Base |
| Esquemas de nivel configurables por universidad | **BIEN**: Reconocido como necesidad de personalizacion | Base |
| Dependencia de notas del modulo Class (`asm_student_marks`) | **SILENCIO**: El informe no detecta que las notas vienen de otro modulo | Alto — en uP1 las calificaciones ingresan via Attendance & Grades o integraciones |
| **Query de 12 tablas para obtener notas + competencias** | **SILENCIO**: El informe no detecta la fragilidad tecnica | Critico para la migracion — uP1 simplifica con resolvers GraphQL |
| Vinculacion RA↔competencia a dos niveles | **SILENCIO**: No se menciona el mecanismo ni su fragilidad | Critico — BUG-012 puede causar perdida de datos |

### 5B. Cadena Milestone (Hitos)

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Hitos de evaluacion programatica | **SILENCIO**: El informe no menciona el sistema de hitos existente | Alto — es una funcionalidad madura que no tiene equivalente directo en la propuesta del informe |
| Situaciones evaluativas y componentes | **SILENCIO** | Medio |
| Niveles de logro con rangos fijos en codigo | **SILENCIO**: El informe no sabe que los rangos de milestone estan hardcodeados (a diferencia de Graduation que es configurable) | Medio — en uP1 debe ser configurable |
| Reportes individuales, grupales y globales | **SILENCIO**: Los reportes de milestone son los mas sofisticados del sistema y el informe no los menciona | Alto — deben preservarse y mejorarse |

### 5C. Coexistencia de ambas cadenas

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Dos cadenas de medicion sin vista unificada | **DOLOR** (pag. 10): "Los indicadores no responden a necesidades analiticas" — sin mencionar la dualidad como causa | Critico — uP1 unifica en una sola cadena de 3 capas (BR-CAL-001 a BR-CAL-005) |

---

## Fase 6: Reportar

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Reportes custom Vue con D3 | **SILENCIO**: El informe no distingue entre tipos de reportes | Medio — los patrones (FilterConfig, tablas sticky, graficos D3) son buenos |
| Reportes Power BI embebidos | **DOLOR** (pag. 10): Las instituciones recurren a Power BI porque los reportes nativos no alcanzan | Alto — uP1 tiene Report Builder con Flexmonster |
| 40+ plantillas de reportes por cliente | **DOLOR** (pag. 10): Indirectamente — "los indicadores no responden a necesidades" porque cada cambio requiere desarrollo | Critico — uP1 reemplaza con configuracion por datos |
| Exportacion a Excel de hitos | **SILENCIO** | Bajo — funciona bien |
| Descarga masiva de datos | **OPORTUNIDAD** (pag. 21): Propone "descarga masiva de datos visualizados para autonomia analitica" | Medio |
| Reporteria personalizable por rol | **OPORTUNIDAD** (pag. 21-22): Propone que Super Admin configure que reportes ve cada rol | Alto — uP1 lo implementa con RBAC + layouts configurables |

---

## Integraciones

| Logica de negocio | Informe dice | Impacto |
|-------------------|-------------|---------|
| Integracion UTEC Assessment | **SILENCIO**: Es especifica de un cliente | Bajo |
| Gateway de cursos para otros modulos | **SILENCIO** | Medio |
| Portal publico | **OPORTUNIDAD**: Course Catalog | Medio |
| **Sin integracion Banner** | **DOLOR** (pag. 10): UST-CFT necesita importar calificaciones desde Banner | Critico — uP1 especifica integracion via Ethos API |
| **Sin integracion Brightspace** | **DOLOR** (pag. 10): Uniandes necesita trazabilidad pedagogica con su LMS | Critico — uP1 especifica integracion con LMS |
| **Sin ingesta de documentos** | **OPORTUNIDAD** (pag. 15-16): Propone IA para crear tablas de datos desde PDF/Word | Critico — uP1 implementa en CAP-CUR-048 |

---

## IA Generativa

| Propuesta del informe | Existe en el sistema actual? | Estado en uP1 |
|-----------------------|-----------------------------|---------------|
| Crear tablas de datos curriculares desde PDF | **No** | CAP-CUR-048: Asistente de ingesta documental |
| Simulador de perfil de egreso desde texto | **No** | CAP-MAP-020: Simulador de perfil de egreso |
| Analisis de coherencia curricular | **No** | CAP-CUR-049/050: Analisis de cobertura y coherencia |
| Comparador de planes de estudio | **No** | CAP-MAP-022: Comparador de planes |
| Buscador de equivalencias entre cursos | **No** | CAP-MAP-023: Buscador de equivalencias |
| Recomendador de estrategias de evaluacion | **No** | CAP-MAP-024: Recomendador de evaluacion |
| Rutas de aprendizaje personalizadas | **No** | Learning Pathways: en definicion funcional |

**Ninguna funcionalidad de IA propuesta por el informe existe en el sistema actual.** Todas son innovaciones para uP1.

---

## Resumen: que cubre el informe vs que no

| Area | Cubierto por ReAssess | No cubierto (puntos ciegos) |
|------|----------------------|---------------------------|
| Carga de datos | Si (dolor principal) | Mecanismo CSV actual, sus timeouts |
| Reporteria | Si (dolor) | Dualidad Graduation/Milestone, query de 12 tablas, 40+ plantillas |
| Personalizacion | Si (dolor) | `imp_program_structure` como punto de fragilidad, 70+ permission keys |
| Confiabilidad | Si (dolor) | BUG-012 como causa raiz probable de Uniandes |
| Flujo usuario | Si (dolor) | Ausencia total de ticketing y notificaciones |
| Competencias | Si (oportunidad M2) | Interfaz 100% Angular, sin migracion |
| Integraciones | Si (oportunidad M3) | Gateway existente, integracion UTEC |
| IA generativa | Si (7 propuestas) | Nada existe hoy |
| Milestone/Hitos | **No** | Sistema maduro, no mencionado |
| Configuracion inicial | **No** | Wizard, `imp_program_structure` |
| Datos compartidos con otros modulos | **No** | Dependencia Core/Class para estructura y notas |
| Dualidad V1/V2 API | **No** | 300+ endpoints duplicados |
| Duplicacion esquema curso/seccion en BD | **No** | 21+ tablas duplicadas |
| Condiciones academicas de graduacion | **No** | Logica especifica |
| Exportacion con plantillas por cliente | **Parcial** (menciona problema pero no la causa) | 40+ plantillas en codigo |

El informe ReAssess es **acertado en el diagnostico** pero tiene puntos ciegos importantes, especialmente en la complejidad tecnica interna (dualidad API, duplicacion de BD, sistema de hitos) y en las dependencias con otros modulos de la plataforma.
