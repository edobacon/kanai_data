---
id: SPEC-learning-assurance-005
project: up1
type: spec
module: learning-assurance
category: data
tags: [up1, learning-assurance, reglas, workflows, multi-tenancy, integraciones, versionamiento, permisos, licenciamiento, notificaciones, taxonomias, migracion, libertad-evaluativa, calculo-logro]
fecha: 2026-04-10
confluence_id: "1988165713"
confluence_url: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
autor: Esteban Cortes
---
# Reglas transversales

Reglas de negocio que aplican transversalmente a las tres aplicaciones de Learning Assurance. Son referenciadas desde las fichas de capacidad mediante su código (BR-XXX-NNN).

**Navegación:** [Learning Assurance](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183) → Reglas transversales

## Workflows (BR-WKF)

### BR-WKF-001: Reglas generales de workflow

* Toda entidad con ciclo de vida aprobable tiene un estado actual controlado por un workflow
* Solo las transiciones definidas en la configuración del workflow son permitidas
* Cada transición genera un registro de auditoría inmutable que incluye: quién ejecutó, cuándo, estado origen, estado destino, y comentario/justificación
* Los workflows son configurables por institución (CAP-ASM-041) con defaults de plataforma que no se pueden eliminar

### BR-WKF-002: Control de acceso por workflow

* Cada transición puede requerir un rol específico para ejecutarse
* Un usuario sin el rol requerido no puede ejecutar la transición
* Las entidades en estados finales no son editables; para editar, deben transicionar a un estado editable primero

### BR-WKF-003: Inmutabilidad por estudiantes activos

* Un plan de estudios con estudiantes matriculados activos no puede transicionar a estados de cierre (archivado, deprecado)
* La protección se propaga a entidades vinculadas al plan:

    * **Matrices de competencias** asociadas a un plan con estudiantes activos no pueden transicionar a estados de cierre ni editarse destructivamente (eliminar competencias, cambiar estructura jerárquica)
    * **Perfiles de egreso** de un plan con estudiantes activos no pueden transicionar a estados de cierre ni modificar competencias/niveles esperados ya declarados
    * **Esquemas de niveles** en uso por matrices vinculadas a planes con estudiantes activos no pueden eliminar niveles ni modificar umbrales cuantitativos existentes (agregar niveles nuevos sí está permitido)
    
* Esta regla se implementa como validación de negocio, no como constraint de base de datos

### BR-WKF-004: Coordinación de workflows plan ↔ perfil de egreso

* Un plan de estudios no puede transicionar a estado Vigente si su perfil de egreso asociado (CAP-MAP-012) no está al menos en estado Aprobado
* Si un plan en estado Vigente se revierte a Borrador, el perfil de egreso asociado transiciona automáticamente a un estado editable para mantener coherencia
* Esta regla garantiza que un plan vigente siempre tenga un perfil de egreso aprobado, respetando el concepto de "contrato con el estudiante"

---

## Multi-tenancy (BR-TNT)

### BR-TNT-001: Aislamiento por institución

* Todas las entidades pertenecen a una institución o heredan la pertenencia via sus relaciones
* Las consultas siempre filtran por institución
* Los datos de una institución nunca son visibles para otra

### BR-TNT-002: Defaults de plataforma vs. configuración institucional

* Las entidades de configuración (tipos de competencia, tipos de curso, esquemas de niveles, tipos de componente, fórmulas, etc.) tienen dos orígenes posibles:

    * **Default de plataforma:** compartido por todas las instituciones, no editable
    * **Custom de la institución:** creado y editable por el Super Admin
    
* La resolución es: primero buscar configuración custom de la institución, luego fallback al default de plataforma

---

## Integraciones (BR-INT)

### BR-INT-001: Identificador de sistema externo

* Toda entidad que puede ser importada desde un sistema externo (Banner, Anthology, LMS) lleva un identificador del sistema de origen
* El identificador permite sincronización idempotente: si el registro ya existe, se actualiza; si no, se crea
* El formato del identificador puede ser compuesto (ej: código de programa + código de periodo para Banner)
* El identificador nunca se modifica después de la importación inicial

### BR-INT-002: Escenarios de integración y gobernanza

* La integración entre Learning Assurance y los sistemas institucionales (SIS/LMS) es **bidireccional**: uPlanner puede actuar como consumidor O como origen de los documentos académicos (carreras, planes de estudio, cursos)
* Se identifican tres escenarios de implementación que determinan el flujo de datos, la gobernanza de entidades y la aplicabilidad de taxonomías:

    * **Escenario A — SIS gobierna, uPlanner enriquece:** La institución mantiene carreras, planes y cursos en el SIS. Se realiza carga inicial y el SIS sigue siendo autoritativo. uPlanner enriquece con programas de curso detallados, syllabi, competencias, tributación y assessment. Integración unidireccional (SIS → uPlanner). Las taxonomías internacionales no aplican — la codificación viene del SIS
    * **Escenario B — Carga inicial desde SIS, transición de gobernanza a uPlanner:** La institución parte con carga inicial desde el SIS, pero decide que los nuevos documentos académicos se creen desde Curriculum Design. Las entidades importadas conservan su codificación original del SIS. Las nuevas entidades se crean en uPlanner con codificación propia (incluyendo taxonomías si están configuradas). Integración bidireccional: las nuevas entidades se exportan al SIS via identificador de sincronización
    * **Escenario C — Gobernanza completa de uPlanner:** La institución no tiene SIS o decide empezar desde cero. Todas las entidades se crean en Curriculum Design. Las taxonomías aplican plenamente desde el inicio. Si posteriormente se conecta un SIS, se usa el flujo outbound para poblarlo
    
* **Flujo inbound (SIS → uPlanner):** El sistema externo envía la estructura académica. uPlanner importa usando el identificador de sistema externo para sincronización idempotente (BR-INT-001)
* **Flujo outbound (uPlanner → SIS):** La institución crea documentos en uPlanner y los exporta. El sistema genera un identificador de sincronización que la institución retorna al vincular el documento en su SIS
* En todos los escenarios, las competencias, tributación, evaluación por competencias y análisis IA son siempre autoritativos de uPlanner

### BR-INT-003: Fuentes de calificaciones

* Learning Assurance no incluye funcionalidad de captura directa de notas. Las calificaciones ingresan al sistema exclusivamente desde fuentes externas:

    * **Attendance & Grades** (aplicación uP1): captura de notas y asistencia por parte del docente. Disponible como módulo adicional de uP1
    * **SIS** (Banner, Anthology): sincronización de notas ya registradas en el sistema de registro académico (CAP-ASM-035, CAP-ASM-036)
    * **LMS** (Brightspace, Canvas): importación de notas desde el sistema de gestión de aprendizaje (CAP-ASM-037)
    
* El cálculo de logro de competencias (CAP-ASM-012) opera sobre las calificaciones independientemente de su fuente de origen

---

## Versionamiento (BR-VER)

### BR-VER-001: Cadena de versiones

* Las entidades versionables (planes de estudio, programas de curso) se encadenan: cada versión referencia a la anterior
* Solo una versión puede estar marcada como vigente por entidad padre (un plan vigente por programa, un programa vigente por curso)
* Las versiones anteriores no se eliminan ni modifican

### BR-VER-002: Clonación

* La clonación genera nuevos identificadores para todas las entidades copiadas
* El clon nace siempre en estado Borrador
* Se registra el origen de la clonación cuando aplica, para trazabilidad
* La clonación masiva es una operación asíncrona con tracking de progreso y reporte de resultados

---

## Permisos (BR-PRM)

### BR-PRM-001: Permisos por sección del syllabus

* Cada sección del syllabus tiene control de acceso granular con permiso de ver y editar independientes:

    * Datos generales del curso
    * Modalidades y actividades
    * Competencias del curso
    * Contenidos (temas, subtemas)
    * Sesiones
    * Evaluaciones
    * Condiciones de aprobación
    * Referencias y bibliografía
    
* Los permisos se definen por rol y pueden variar según el estado del workflow

### BR-PRM-002: Cascada de permisos

* Los permisos se evalúan en cascada: institución → facultad → programa → plan → sección del syllabus
* Un permiso más específico sobrescribe uno más general

---

## Licenciamiento (BR-LIC)

### BR-LIC-001: Dependencia comercial de Learning Assessment

* Learning Assessment se comercializa como app que requiere Curriculum Design + Curriculum Mapping. Esta es una restricción de packaging comercial, no técnica
* A nivel técnico, un subconjunto de capacidades de Learning Assessment solo depende de Curriculum Design: seguimiento de avance estudiantil (CAP-ASM-014 a CAP-ASM-016, CAP-ASM-018, CAP-ASM-028), seguimiento de syllabi y programas (CAP-ASM-026, CAP-ASM-027)
* Esta distinción es interna y no se expone al usuario final ni al cliente

---

## Notificaciones (BR-NOT)

### BR-NOT-001: Motor de notificaciones de uP1

* Learning Assurance utiliza el motor de notificaciones de uP1 (infraestructura de plataforma) para todas las notificaciones de las apps de la línea. No implementa un sistema propio
* Las notificaciones se entregan via dos canales: in-app (visible desde el sistema) y email (configurable por el usuario)
* Eventos que generan notificación:

    * **Workflows:** Transición de estado que requiere acción de otro rol (ej: plan enviado a revisión → notifica al Director; syllabus aprobado → notifica al Docente)
    * **Alertas de cobertura:** Resultado de aprendizaje desactivado que tributa al perfil de egreso (BR-LIB-003) → notifica al Coordinador
    * **Operaciones asíncronas:** Clonación masiva completada (CAP-CUR-031), exportación de reportes lista (CAP-ASM-031), importación de notas finalizada (CAP-ASM-037) → notifica al usuario que inició la operación
    * **Migración programa→sección:** MADS ejecutado con resultados (BR-MIG-001) → notifica al Coordinador si hubo errores o bloqueos por calificaciones
    

---

## Codificación y taxonomías internacionales (BR-TAX)

### BR-TAX-001: Modelo de codificación dual

* Toda entidad codificable (programas académicos, planes de estudio, cursos, programas de curso, competencias, resultados de aprendizaje) tiene dos capas de codificación:

    * **Código propio**: definido libremente por la institución. Es el identificador principal dentro del sistema. Siempre presente y obligatorio
    * **Clasificaciones internacionales**: una o más taxonomías estandarizadas asignadas opcionalmente a la entidad. Cada asignación vincula la entidad con un código específico de la taxonomía
    
* Una entidad puede tener cero o más clasificaciones internacionales simultáneas (ej: un programa puede tener CIP y ISCED-F a la vez)

### BR-TAX-002: Configuración institucional de taxonomías

* El Super Admin configura qué taxonomías están activas para la institución desde el módulo de configuraciones de uP1
* Para cada taxonomía activa se define:

    * **A qué entidades aplica** (programas, cursos, competencias, resultados de aprendizaje, o combinaciones)
    * **Si es obligatoria u opcional** por tipo de entidad. Si es obligatoria, la entidad no puede avanzar en el workflow sin tener el código asignado
    * **Si se habilita sugerencia por IA** para esa taxonomía
    
* La plataforma viene precargada con los catálogos de taxonomías más relevantes:

    * **CIP 2020** (Classification of Instructional Programs, NCES): programas y cursos. Estándar en EE.UU., obligatorio para reporte IPEDS
    * **ISCED-F 2013** (UNESCO): programas y cursos. Estándar global para estadísticas educativas
    * **Bloom revisada** (Anderson-Krathwohl 2001): resultados de aprendizaje. 6 niveles cognitivos (Recordar, Comprender, Aplicar, Analizar, Evaluar, Crear)
    * **ESCO** (European Commission): competencias. 13,890+ competencias catalogadas en 28 idiomas
    * **Tuning América Latina**: competencias genéricas. 27 competencias de referencia para LATAM
    * **ABET Student Outcomes**: resultados de aprendizaje para ingeniería. 7 outcomes estandarizados
    
* Los catálogos precargados no pueden ser eliminados. La institución puede agregar taxonomías custom propias
* Las taxonomías se actualizan cuando se publican nuevas versiones de los estándares (ej: CIP se revisa cada \~10 años)
* **Aplicabilidad según escenario de integración (BR-INT-002):**

    * Escenario A (SIS gobierna): las taxonomías no aplican — las entidades se importan con la codificación del SIS
    * Escenario B (transición de gobernanza): las taxonomías aplican solo a entidades creadas en Curriculum Design. Las entidades importadas del SIS conservan su codificación original y no son sujeto de clasificación obligatoria
    * Escenario C (gobernanza completa uPlanner): las taxonomías aplican a todas las entidades desde el inicio
    

### BR-TAX-003: Sugerencia de clasificación por IA

* Cuando la sugerencia por IA está habilitada para una taxonomía, el sistema analiza el nombre y descripción de la entidad y propone el código más probable de la taxonomía
* Para Bloom, la sugerencia se basa en el verbo de acción del resultado de aprendizaje (ej: "Diseñar..." → Crear, nivel 6)
* Para CIP/ISCED-F, la sugerencia se basa en similitud semántica con las descripciones del catálogo
* Para ESCO/Tuning, la sugerencia se basa en similitud con las competencias catalogadas
* Las sugerencias son siempre revisables: el usuario acepta, ajusta o ignora

---

## Modelo de datos — divergencias con implementation plan (BR-MOD)

### BR-MOD-001: CourseProgram pertenece al catálogo, no al plan

* Un `CourseProgram` pertenece a un curso base del catálogo, no directamente a un `StudyPlan`
* La relación entre plan de estudios y cursos se establece via la malla curricular (CAP-CUR-003), no via FK directo en `CourseProgram`
* Esto permite que un mismo programa de curso se reutilice en múltiples planes de estudio sin duplicación
* **Divergencia con implementation plan (ReAssess v1):** El implementation plan incluye un campo `studyPlanId` en `CourseProgram`. Esta decisión se revierte: la spec funcional prevalece. El implementation plan deberá ajustarse cuando se implemente

---

## Migración de datos programa → sección (BR-MIG)

### BR-MIG-001: Herencia automática de estructura

* Al crear un syllabus para una sección, la estructura definida en el programa de curso se hereda automáticamente: componentes de evaluación, resultados de aprendizaje, contenidos, estrategias, referencias, vínculos competencia↔resultado de aprendizaje y vínculos componente↔resultado de aprendizaje
* La migración solo aplica cuando se cumplen todas las condiciones:

    * El programa de curso está en estado Publicado y es la versión vigente
    * La sección está en su estado inicial del workflow (Pendiente/Borrador)
    * La sección pertenece al periodo académico activo
    
* Cada dato migrado se marca con un flag de sincronización (`is_synchronizable`) que distingue datos heredados de datos creados manualmente por el docente

### BR-MIG-002: Control de sincronización

* Tres parámetros institucionales (gestionados desde el módulo de configuraciones de uP1) controlan el comportamiento de la migración:

    * **migrationOverUserEdition** (default: false): Si true, la migración sobrescribe ediciones manuales del docente. Si false, respeta ediciones manuales (datos modificados por un usuario distinto al sistema no se actualizan)
    * **migrationWithDataDeactivation** (default: false): Si true, inactivaciones en el programa de curso se replican en la sección. Si false, los datos de la sección permanecen activos aunque se inactiven en el programa
    * **migrationWithSyllabusTransition** (default: false): Si true, la migración ejecuta la transición de workflow del syllabus automáticamente
    

### BR-MIG-003: Bloqueo por calificaciones

* Si al menos un componente de evaluación de la sección tiene calificaciones registradas, la migración automática se bloquea completamente para esa sección
* No se ejecuta ninguna inserción, actualización ni inactivación de componentes de evaluación
* Esta regla tiene la máxima prioridad sobre cualquier otra regla de migración

---

## Libertad evaluativa (BR-LIB)

### BR-LIB-001: Nivel de libertad evaluativa

* Un parámetro institucional (configurable por programa o institución desde el módulo de configuraciones de uP1) define el grado de personalización que el docente puede aplicar sobre la estructura de evaluación heredada:

    * **Restringido:** El docente solo puede agregar componentes nuevos. No puede eliminar ni modificar componentes heredados. Puede redistribuir pesos solo entre componentes nuevos
    * **Guiado** (default): El docente puede agregar, modificar y eliminar componentes. El sistema valida cobertura de resultados de aprendizaje al avanzar en el workflow. Alertas en tiempo real al perder cobertura
    * **Libre:** El docente puede hacer todo. El sistema muestra alertas de cobertura pero no bloquea el avance de workflow. La validación es informativa, no bloqueante
    

### BR-LIB-002: Validación de cobertura de resultados de aprendizaje

* Al avanzar en el workflow de evaluación (CAP-ASM-005), el sistema valida que todo resultado de aprendizaje activo de la sección tenga al menos un componente de evaluación vinculado
* En modo Restringido y Guiado, la validación es bloqueante: no se permite la transición si hay resultados de aprendizaje sin cobertura
* En modo Libre, la validación es informativa: se permite la transición pero se registra la alerta

### BR-LIB-003: Protección de resultados de aprendizaje críticos

* El coordinador puede marcar resultados de aprendizaje del programa de curso como "obligatorios en toda sección"
* Un resultado de aprendizaje obligatorio no puede ser desactivado por el docente en CAP-ASM-007, independientemente del modo de libertad evaluativa
* Si el docente desactiva un resultado de aprendizaje no obligatorio que tributa a una competencia del perfil de egreso, el sistema genera una alerta visible para el coordinador del programa

---

## Cálculo de logro de competencias (BR-CAL)

### BR-CAL-001: Motor configurable de cálculo

* El cálculo de logro de competencias opera en 3 capas, cada una con estrategia configurable por institución desde el módulo de configuraciones de uP1
* La configuración se define como un **perfil de cálculo** que agrupa las decisiones de las 3 capas. La institución puede usar un perfil default de plataforma o crear uno custom
* El diseño es extensible: nuevas estrategias de cálculo pueden agregarse sin modificar las existentes

### BR-CAL-002: Capa 1 — Logro por sección (dentro de un curso)

* Traduce notas de evaluaciones en nivel de logro de competencia por resultado de aprendizaje, dentro de una sección
* Modos disponibles (extensible):

    * **Cuantitativo por umbral** (default): la nota promedio de las evaluaciones vinculadas al resultado de aprendizaje se compara con los umbrales del esquema de niveles (CAP-MAP-010). El nivel alcanzado es el umbral más alto superado
    * **Cuantitativo ponderado**: cada evaluación vinculada aporta nota × peso. El resultado ponderado se compara con umbrales
    * **Cualitativo directo**: el docente asigna directamente el nivel alcanzado por resultado de aprendizaje, sin derivarlo de la nota numérica. Usa criterios cualitativos (CAP-MAP-011)
    * **Mixto**: la nota numérica sugiere un nivel (cuantitativo), pero el docente puede hacer override con evaluación cualitativa
    
* Parámetro `permite_override_docente`: si true, el docente puede ajustar manualmente el nivel calculado automáticamente (aplica a modos cuantitativos)
* Si un resultado de aprendizaje tributa a múltiples competencias, la nota de las evaluaciones vinculadas contribuye a todas ellas

### BR-CAL-003: Capa 2 — Logro acumulado por estudiante (a lo largo de la carrera)

* Agrega los niveles alcanzados por un estudiante en múltiples cursos que tributan a la misma competencia
* Estrategias disponibles (extensible):

    * **Máximo alcanzado** (default): el nivel más alto demostrado en cualquier curso
    * **Progresivo**: el estudiante debe demostrar cada nivel en secuencia. El nivel acumulado es el más alto alcanzado de forma continua
    * **Último alcanzado**: el nivel del curso más reciente que tributa a esa competencia
    * **Promedio ponderado**: promedio de niveles alcanzados, ponderado opcionalmente por intensidad de alineamiento (NONE/LOW/MEDIUM/HIGH de la tributación)
    * **Mejor N de M**: de todos los cursos que tributan, se toman los N mejores resultados
    
* Parámetro `considerar_alineamiento`: si true, la intensidad de alineamiento de la tributación (CAP-MAP-015 R3) pondera el cálculo

### BR-CAL-004: Capa 3 — Agregación grupal y global

* Agrega los niveles de múltiples estudiantes para generar indicadores de sección, cohorte, programa o institución
* Métricas estándar: promedio, mediana, distribución por nivel, percentiles
* Parámetro `umbral_logro_programa`: porcentaje de estudiantes que deben alcanzar el nivel esperado del perfil de egreso para considerar la competencia "lograda" a nivel de programa

### BR-CAL-005: Perfiles de cálculo por defecto

* La plataforma provee perfiles pre-configurados que la institución puede usar directamente o como base para personalizar:

    * **Estándar**: Capa 1 cuantitativo por umbral + Capa 2 máximo alcanzado. Default para la mayoría de IES
    * **ABET**: Capa 1 cuantitativo por umbral + Capa 2 progresivo. Para programas con acreditación ABET o similar
    * **Competencias puras**: Capa 1 cualitativo directo + Capa 2 progresivo. Para IES con modelo de educación basada en competencias (CBE)
    
* Los perfiles default no pueden ser eliminados. La institución puede crear perfiles custom adicionales
* Un perfil se asocia a nivel de programa o institución. Distintos programas de la misma institución pueden usar perfiles diferentes

---

# Versión
