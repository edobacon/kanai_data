---
id: SPEC-learning-assurance-006
project: up1
type: spec
module: learning-assurance
category: data
tags: [up1, learning-assurance, flujos, escenarios, implementacion, sis, banner, anthology, config, syllabi, clonacion, tributacion, reporteria, acreditacion, mads, notificaciones]
fecha: 2026-04-10
confluence_id: "2001207299"
confluence_url: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2001207299
autor: Esteban Cortes
---
# Flujos funcionales

**Navegación:** [Learning Assurance](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183) → Flujos funcionales

## Escenarios de implementación

Los flujos de Curriculum Design varían según cómo la institución gestiona sus datos académicos. Hay tres macro escenarios que enmarcan el uso del sistema:

### Escenario A: SIS/ERP gobierna, uPlanner enriquece

La institución ya tiene carreras, planes y cursos en su SIS (Banner, Anthology u otro). Se realiza una carga inicial desde el SIS y esas entidades se mantienen gobernadas por el SIS — uPlanner no las crea ni modifica. Curriculum Design enriquece los documentos con contenido que el SIS no gestiona: programas de curso detallados, syllabi, resultados de aprendizaje, estructura de evaluación.

* **Taxonomías**: No aplican. La codificación de programas y cursos ya existe en el SIS y se importa con sus identificadores originales
* **Creación de nuevas versiones**: Se originan en el SIS. uPlanner recibe las actualizaciones via integración y el equipo curricular enriquece la nueva versión
* **Integración**: Unidireccional (SIS → uPlanner). uPlanner solo exporta estructura de evaluación o metadatos enriquecidos cuando se requiere

### Escenario B: Carga inicial desde SIS, transición de gobernanza a uPlanner

La institución parte con una carga inicial desde el SIS, pero decide que los próximos documentos académicos se crearán desde Curriculum Design. Las entidades existentes conservan su codificación original del SIS. Las nuevas entidades se crean en uPlanner con su propia codificación (incluyendo taxonomías si están configuradas) y viajan al SIS via el flujo de integración bidireccional.

* **Taxonomías**: No aplican para las entidades cargadas inicialmente (ya tienen codificación del SIS). Sí aplican para las entidades nuevas creadas en Curriculum Design
* **Creación de nuevas versiones**: Se originan en Curriculum Design. Al crear una nueva carrera, plan o curso, el usuario define su codificación propia y opcionalmente la clasificación internacional. El sistema puede sugerir códigos de taxonomía por IA durante la creación
* **Integración**: Bidireccional. Las nuevas entidades se exportan al SIS con un identificador de sincronización. El SIS retorna su propio identificador para vincular ambos registros

### Escenario C: Gobernanza completa de uPlanner (sin carga inicial)

La institución no tiene SIS o decide empezar desde cero. Todas las entidades se crean en Curriculum Design desde el inicio.

* **Taxonomías**: Aplican plenamente. Al crear cada entidad, el usuario define su codificación y el sistema solicita o sugiere clasificaciones internacionales según la configuración institucional
* **Creación**: Todo se origina en Curriculum Design
* **Integración**: Si posteriormente se conecta un SIS, se usa el flujo outbound para poblar el SIS desde uPlanner

El escenario más común es **B**: la mayoría de instituciones tienen datos en un SIS pero quieren migrar la gobernanza curricular a uPlanner gradualmente.

## Curriculum Design

### Flujo 1: Configuración inicial de la institución

**Actor:** Super Admin

1. El Super Admin accede al wizard de configuración inicial (CAP-CUR-013)
2. Define la estructura del plan de estudios: qué secciones estructurales son visibles y obligatorias, y qué secciones complementarias incluir (CAP-CUR-012b)
3. Define la estructura del programa de curso: secciones estructurales (datos generales, resultados de aprendizaje, componentes de evaluación plantilla, contenidos temáticos) + secciones complementarias según necesidad institucional (CAP-CUR-011)
4. Define la estructura del syllabus: secciones estructurales (datos generales, resultados de aprendizaje activos, componentes de evaluación, contenidos, sesiones, condiciones de aprobación) + secciones complementarias (CAP-CUR-012)
5. Carga catálogos base: estrategias de aprendizaje (CAP-CUR-036), métodos de evaluación (CAP-CUR-037), tipos de actividad (CAP-CUR-038), tipos de curso (CAP-CUR-044), estilos de citación (CAP-CUR-043), idiomas (CAP-CUR-041)
6. Configura workflows de aprobación para plan, programa y syllabus con estados y roles por transición
7. Configura taxonomías internacionales activas (CAP-CUR-054): selecciona cuáles usar (CIP, ISCED-F, Bloom, ESCO, Tuning, ABET), define a qué entidades aplican, si son obligatorias, y si habilitan sugerencia por IA
8. Configura parámetros de herencia programa→sección (BR-MIG-002): prioridad de edición, replicación de inactivaciones, transición automática
9. Configura nivel de libertad evaluativa (BR-LIB-001): modo restringido, guiado o libre
10. El wizard marca la configuración como completada. A partir de aquí se usa la configuración normal

### Flujo 2: Puesta en marcha — Carga inicial desde SIS (escenarios A y B)

**Actores:** Super Admin (configura integración), Sistema (ejecuta carga)

1. El Super Admin configura la conexión con el SIS (CAP-ASM-039): tipo (Banner/Anthology), credenciales, frecuencia de sincronización
2. El sistema importa la estructura académica existente: carreras, planes de estudio, cursos, secciones, períodos, estudiantes. Cada entidad se vincula via identificador del sistema de origen (BR-INT-001) para sincronización idempotente
3. Las entidades importadas conservan la codificación del SIS como código propio. No se les asignan taxonomías internacionales — su codificación ya está definida
4. El Super Admin verifica los datos importados y activa Curriculum Design para que el equipo curricular comience el enriquecimiento
5. A partir de este punto, el flujo diverge según el escenario:

    * **Escenario A**: El SIS sigue gobernando. El equipo curricular enriquece las entidades importadas (flujo 3A)
    * **Escenario B**: uPlanner comienza a gobernar nuevas entidades. Las importadas se enriquecen (flujo 3A), las nuevas se crean desde Curriculum Design (flujo 3B)
    

### Flujo 3A: Enriquecimiento de entidades importadas del SIS (escenarios A y B)

**Actor:** Coordinador Académico / Coordinador de Curso

El plan de estudios y los cursos ya existen (importados del SIS). El coordinador los enriquece con contenido que el SIS no gestiona:

**A nivel de plan de estudios:**

1. Completa las secciones complementarias configuradas por la institución (fundamentación, perfil de ingreso, campo ocupacional, objetivos)
2. Redacta la declaración textual del perfil de egreso
3. Verifica y ajusta la malla curricular importada: prerrequisitos, especialidades, bloques electivos (CAP-CUR-004 a 006)
4. Registra equivalencias administrativas entre cursos si no vinieron del SIS (CAP-CUR-007)
5. El plan pasa por workflow de aprobación (CAP-CUR-009) para formalizar el enriquecimiento

**A nivel de programa de curso:**

1. Para cada curso importado, el coordinador crea el programa de curso detallado (CAP-CUR-014) — el curso base ya existe, el programa lo enriquece
2. Declara resultados de aprendizaje (CAP-CUR-015), contenidos temáticos (CAP-CUR-016), modalidades (CAP-CUR-017)
3. Estructura los componentes de evaluación como plantilla (CAP-CUR-029)
4. Gestiona bibliografía (CAP-CUR-028)
5. Aprueba y publica (CAP-CUR-019) para habilitar la creación de syllabi

**A nivel de syllabus (igual para todos los escenarios — ver flujo 4).**

### Flujo 3B: Creación de nuevos documentos académicos desde Curriculum Design (escenarios B y C)

**Actor:** Coordinador Académico / Director de Programa

Las entidades se crean desde cero en Curriculum Design. En escenario B coexisten con entidades importadas; en escenario C, todo se crea aquí.

**Crear nuevo plan de estudios:**

1. El coordinador crea un nuevo plan (CAP-CUR-001). Define nombre, código propio y características generales. Si hay taxonomías activas, el formulario incluye los campos de clasificación internacional y el sistema puede sugerir códigos por IA. El plan nace en estado Borrador
2. Completa secciones complementarias (fundamentación, perfil de ingreso, campo ocupacional, objetivos)
3. Redacta la declaración textual del perfil de egreso
4. Asigna cursos al plan (CAP-CUR-003). Los cursos pueden ser existentes (importados del SIS en escenario B) o nuevos (creados en Curriculum Design). El sistema alerta si los créditos no coinciden con el total declarado
5. Define prerrequisitos y correquisitos (CAP-CUR-004)
6. Si aplica: especialidades (CAP-CUR-005), bloques electivos (CAP-CUR-006), categorías de requisitos para modelos flexibles (CAP-CUR-051 a 053)
7. Registra equivalencias (CAP-CUR-007)
8. Envía al workflow de aprobación (CAP-CUR-009): Borrador → Revisión → Aprobado → Vigente
9. Publica para consulta de estudiantes (CAP-CUR-010)
10. En escenario B: el plan se exporta al SIS via flujo de integración bidireccional. El sistema genera identificador de sincronización que la institución retorna desde su SIS para vincular ambos registros

**Crear nuevo programa de curso:**

1. El coordinador crea el programa asociado a un curso base (CAP-CUR-014). El curso puede ser existente (del SIS) o nuevo. Define código propio y versión. Si hay taxonomías activas, el formulario incluye clasificación internacional
2. Declara resultados de aprendizaje (CAP-CUR-015). Si Bloom está activo como taxonomía, el sistema sugiere nivel cognitivo en base al verbo
3. Edita contenidos, modalidades, bibliografía, componentes de evaluación (CAP-CUR-016 a 029)
4. Aprueba y publica (CAP-CUR-019)

### Flujo 4: Personalización de un syllabus (todos los escenarios)

**Actor:** Docente

Este flujo es igual independientemente del escenario de implementación, porque el syllabus siempre se crea en uPlanner (nunca viene del SIS):

1. El docente crea un syllabus para su sección y período académico (CAP-CUR-023). El sistema hereda automáticamente la estructura del programa de curso: resultados de aprendizaje, contenidos, evaluaciones, estrategias, referencias y vínculos competencia↔resultado (BR-MIG-001). Esta herencia solo ocurre si el programa está Publicado, la sección está en estado inicial y pertenece al período activo
2. El docente revisa la estructura heredada y la personaliza según el nivel de libertad evaluativa configurado:

    * **Modo restringido**: solo puede agregar componentes nuevos, no eliminar ni modificar los heredados
    * **Modo guiado** (default): puede agregar, modificar y eliminar. El sistema valida cobertura de resultados de aprendizaje al avanzar en workflow
    * **Modo libre**: puede hacer todo. Alertas informativas, sin bloqueo
    
3. Edita las secciones del syllabus según permisos granulares por rol (CAP-CUR-024): datos generales, modalidades, competencias, contenidos, sesiones, evaluaciones, condiciones de aprobación, referencias
4. Gestiona la estructura de temas y subtemas del contenido (CAP-CUR-025), vinculándolos opcionalmente a resultados de aprendizaje
5. Configura las sesiones: fecha, horario, actividades planificadas, estrategias de aprendizaje del catálogo institucional (CAP-CUR-026)
6. Define condiciones de aprobación: asistencia mínima, nota mínima, requisitos especiales (CAP-CUR-027)
7. Envía al workflow de aprobación (CAP-CUR-035): Borrador → Revisión → Aprobado → Publicado
8. Opcionalmente comparte el syllabus publicado via link público (CAP-CUR-034) o lo exporta como Word/PDF (CAP-CUR-032)

### Flujo 5: Clonación masiva de syllabi entre períodos (todos los escenarios)

**Actor:** Coordinador / Super Admin

1. El coordinador selecciona un período origen y un período destino (CAP-CUR-031)
2. El sistema genera un job asíncrono que replica todos los syllabi del período origen al destino
3. Si la sección destino ya tiene syllabus, no se sobrescribe
4. Los clones nacen en estado Borrador con nuevos identificadores y registro del origen
5. Al finalizar, el sistema genera un reporte de resultados (cuántos clonados, cuántos omitidos) y notifica al usuario

### Flujo 6: Ingesta de documentos curriculares por IA (escenarios B y C)

**Actor:** Coordinador / Super Admin

1. El usuario sube un documento (PDF, Word, Excel) con información curricular (CAP-CUR-047)
2. El sistema extrae automáticamente la estructura via IA: plan, cursos, resultados de aprendizaje
3. El job pasa por estados: Pendiente → Procesando → En revisión
4. El usuario revisa los datos extraídos, corrige lo que sea necesario y confirma
5. Los datos confirmados se convierten en registros definitivos (plan, programas, resultados de aprendizaje)

### Flujo 7: Mejora continua curricular (todos los escenarios)

**Actor:** Coordinador, Director, Docente, Comité de Currículo

Aplica en todos los escenarios. En escenario A, las solicitudes macro generan nuevas versiones que se deben coordinar con el SIS. En escenarios B y C, las nuevas versiones se crean directamente en Curriculum Design.

1. Un actor autorizado registra una solicitud de cambio curricular vinculada a un plan o programa de curso (CAP-CUR-057). Incluye descripción, justificación, evidencia/fuente, y clasificación como micro o macrocurricular. La solicitud nace en estado Propuesta
2. La solicitud pasa por workflow propio (CAP-CUR-058): Propuesta → En revisión → Aprobada / Rechazada
3. **Si es microcurricular y aprobada** (CAP-CUR-059):

    * El plan o programa transiciona a "Vigente - en revisión menor"
    * El coordinador aplica el cambio (actualizar bibliografía, ajustar descripción, corregir horas)
    * El documento vuelve a estado Vigente
    * La solicitud se cierra como "Aplicada"
    * Un cambio micro en un programa no impacta la versión del plan
    
4. **Si es macrocurricular y aprobada** (CAP-CUR-060):

    * La solicitud queda en el backlog de mejora continua
    * Cuando se decide crear una nueva versión del plan (CAP-CUR-002) o programa (CAP-CUR-018), el sistema presenta las solicitudes macro aprobadas pendientes como checklist
    * Si el cambio es a nivel de programa, se crea primero nueva versión del programa; la nueva versión del plan referenciará esa nueva versión
    * El coordinador implementa los cambios y marca cuáles solicitudes se aplicaron
    * Al publicar la nueva versión, las solicitudes marcadas se cierran como "Aplicada en versión \[código\]"
    * Las no marcadas permanecen en el backlog
    
5. En cualquier momento, el coordinador puede consultar el backlog completo (CAP-CUR-061) filtrado por estado, tipo y período

---

## Curriculum Mapping (todos los escenarios)

Los flujos de Curriculum Mapping son iguales en todos los escenarios porque operan sobre entidades que ya existen en uPlanner (importadas o creadas). La diferencia es que en escenario A los planes y cursos vienen del SIS y en escenarios B/C pueden haberse creado en Curriculum Design.

### Flujo 8: Creación de una matriz de competencias

**Actor:** Coordinador Académico / Director de Programa

1. El coordinador crea una nueva matriz de competencias (CAP-MAP-001), definiendo código, nombre, tipo (institucional o de programa) y vinculándola a un esquema de niveles de logro (CAP-MAP-008)
2. Agrega competencias a la matriz organizándolas en estructura de árbol: competencia general → sub-competencias (CAP-MAP-002). Cada competencia tiene código único, nombre, descripción y puede marcarse como holística
3. Clasifica cada competencia por tipo: genérica, específica, disciplinar u otros definidos por la institución (CAP-MAP-003)
4. Si aplica, registra equivalencias entre competencias de matrices distintas para facilitar migración entre versiones (CAP-MAP-005)
5. Envía al workflow de aprobación (CAP-MAP-007): Borrador → Verificación → Publicada. Una matriz publicada no puede editarse directamente; debe transicionar a "Abierta a edición" primero

### Flujo 9: Definición de esquemas de niveles de logro

**Actor:** Super Admin / Coordinador Académico

1. El Super Admin o coordinador crea un esquema de niveles (CAP-MAP-008): cualitativo o cuantitativo. La plataforma provee un default de 3 niveles (Introductorio, En Desarrollo, Dominio) no modificable
2. Agrega niveles al esquema con código, nombre, descripción, peso numérico y orden (CAP-MAP-009). Mínimo 2 niveles por esquema
3. Si el esquema es cuantitativo, configura umbrales (min/max) por nivel que determinan cuándo un estudiante alcanza cada nivel (CAP-MAP-010)
4. Si el esquema es cualitativo, define criterios observables por nivel que describen evidencias de logro (CAP-MAP-011)

### Flujo 10: Declaración del perfil de egreso y tributación

**Actor:** Coordinador Académico / Director de Programa

1. El coordinador asocia una o más matrices de competencias al plan de estudios (CAP-MAP-006). Al menos una matriz es requerida para definir perfil de egreso
2. Declara el perfil de egreso del plan (CAP-MAP-012): selecciona qué competencias de las matrices forman parte del perfil, define el nivel esperado al egreso y el peso relativo de cada una. Los pesos deben sumar 100%. El perfil es el "contrato" entre la institución y el estudiante
3. Envía el perfil al workflow de aprobación (CAP-MAP-014). El plan no puede transicionar a Vigente sin perfil de egreso Aprobado (BR-WKF-004)
4. Para cada curso del plan, mapea la tributación (CAP-MAP-015): a qué competencias del perfil contribuye, a qué nivel, con qué intensidad de alineamiento (ninguno/bajo/medio/alto), y con qué tipo de contribución (desarrolla/evalúa/ambas). El tipo de contribución puede asignarse manualmente o inferirse automáticamente según configuración institucional
5. Vincula los resultados de aprendizaje de cada curso con niveles específicos de competencia (CAP-MAP-016). Esta es la relación que permite que en Learning Assessment, al evaluar un resultado, el sistema calcule logro de competencias
6. Si aplica, el docente o coordinador vincula temas del syllabus a las competencias tributadas al curso (CAP-MAP-017) para trazabilidad granular
7. Visualiza el heatmap de cobertura curricular (CAP-MAP-018): curso × competencia con filtros por campus, facultad, programa, plan, tipo de competencia y tipo de contribución. Vista tabulada alternativa con conteo de asignaturas por competencia
8. Revisa el análisis de brechas y solapamientos (CAP-MAP-019): competencias sin cobertura, cobertura insuficiente, solapamientos sin progresión
9. Configura el modo de calificación de la matriz (CAP-MAP-020): formativo, holístico u otros

---

## Learning Assessment (todos los escenarios)

Los flujos de Learning Assessment son iguales en todos los escenarios. Las evaluaciones, calificaciones y reportes de logro operan sobre la estructura curricular ya enriquecida en Curriculum Design y mapeada en Curriculum Mapping, independientemente de si las entidades base se importaron del SIS o se crearon en uPlanner.

### Flujo 11: Estructura de evaluación por sección

**Actor:** Docente

1. Al crear el syllabus, los componentes de evaluación se heredan automáticamente del programa de curso (BR-MIG-001), incluyendo vínculos a resultados de aprendizaje y niveles de competencia. El flag `is_synchronizable` distingue componentes heredados de los creados por el docente
2. Si ya hay calificaciones registradas en la sección, la migración automática se bloquea completamente (BR-MIG-003). Solo edición manual
3. El docente personaliza según el modo institucional (BR-LIB-001):

    * Puede agregar componentes nuevos, modificar o eliminar heredados (según modo)
    * La suma de pesos debe ser 100% incluyendo heredados y nuevos
    * Puede organizar evaluaciones jerárquicamente: un componente padre con sub-componentes (CAP-ASM-002)
    * Configura fórmula de cálculo para componentes con sub-componentes: promedio ponderado, simple, máximo, suma (CAP-ASM-003)
    
4. Asocia métodos pedagógicos de evaluación a cada componente desde el catálogo de Curriculum Design (CAP-ASM-004)
5. Declara qué resultados de aprendizaje del programa están activos en su sección (CAP-ASM-007). Los marcados como obligatorios por el coordinador no pueden desactivarse. Desactivar uno que tributa al perfil genera alerta al coordinador
6. Vincula cada componente de evaluación con los resultados de aprendizaje que mide (CAP-ASM-008). El sistema alerta si hay resultados activos sin evaluación vinculada
7. Envía al workflow de evaluación (CAP-ASM-005): Pendiente → Verificación → Publicado → Abierto

### Flujo 12: Ingreso de calificaciones y cálculo de logro

**Actor:** Sistema + fuentes externas

1. Las calificaciones ingresan al sistema desde una de tres fuentes (BR-INT-003):

    * **Attendance & Grades** (aplicación uP1): captura directa por el docente
    * **SIS** (Banner, Anthology): sincronización programada o en tiempo real
    * **LMS** (Brightspace, Canvas): importación asíncrona con tracking de registros exitosos vs fallidos
    
2. El sistema calcula automáticamente el logro de competencias por sección (CAP-ASM-012) según el perfil de cálculo configurado:

    * **Capa 1 — Sección** (BR-CAL-002): traduce notas en nivel de logro por resultado de aprendizaje. Modos: cuantitativo por umbral (default), cuantitativo ponderado, cualitativo directo, mixto. Si un resultado tributa a múltiples competencias, la nota contribuye a todas
    * **Capa 2 — Carrera** (BR-CAL-003): agrega niveles de múltiples cursos. Estrategias: máximo alcanzado (default), progresivo, último, promedio ponderado, mejor N de M
    * **Capa 3 — Agregación** (BR-CAL-004): estadísticas grupales/globales (promedio, mediana, distribución)
    
3. Los resultados se persisten como snapshots pre-computados (MilestoneSnapshot) con scope INDIVIDUAL, GROUP o GLOBAL. Se regeneran al registrar nuevas calificaciones o bajo demanda

### Flujo 13: Seguimiento estudiantil

**Actor:** Coordinador / Asesor Académico

1. Consulta el avance de un estudiante en su plan (CAP-ASM-014): cursos completados vs pendientes, electivos cursados, bloques satisfechos, especialidad elegida, créditos acumulados. El avance se calcula sobre la versión del plan donde está matriculado; cursos convalidados cuentan como completados
2. Consulta el historial curricular completo (CAP-ASM-015): todos los cursos cursados con nota, período, sección, estado
3. Consulta indicadores calculados (CAP-ASM-016): porcentaje de avance, créditos acumulados, promedio general, semestres cursados y restantes
4. Consulta el logro de competencias del estudiante (CAP-ASM-017): nivel alcanzado vs nivel esperado en cada competencia del perfil. Derivado de la cadena: cursos aprobados → resultados de aprendizaje logrados → niveles de competencia

### Flujo 14: Reportería de logro

**Actor:** Coordinador, Director, Vicerrectoría, Acreditación

1. **Reporte milestone individual** (CAP-ASM-019): logro de competencias de un estudiante en un hito. Radar chart, barras por competencia, progresión temporal. Filtros: campus, programa, plan, estudiante, hito
2. **Reporte milestone grupal** (CAP-ASM-020): logro agregado de una sección o cohorte. Comparación entre secciones. Filtros: campus, programa, plan, sección
3. **Reporte milestone global** (CAP-ASM-021): logro a nivel de programa o institución. Perfil de egreso progresivo, heatmap por campus, tendencias por cohorte. Filtros: programa, plan, hitos, campus, turno, período, cohorte
4. **Reportes complementarios**: perfil de egreso por docente (CAP-ASM-022), por director (CAP-ASM-023), resultados de graduación (CAP-ASM-024), cumplimiento de perfil por estudiante (CAP-ASM-025), progreso de pensum (CAP-ASM-028)
5. **Seguimiento operativo**: estado de syllabi por período con filtros campus/facultad/programa/plan/sección (CAP-ASM-026), estado de programas de curso con filtros campus/facultad/programa/plan (CAP-ASM-027)
6. El Super Admin configura qué reportes están disponibles para qué roles (CAP-ASM-030)
7. Exportación masiva en CSV/Excel como job asíncrono con notificación al completar (CAP-ASM-031)

### Flujo 15: Soporte a acreditación

**Actor:** Equipo de Acreditación

1. Genera evidencia estructurada de logro de competencias (CAP-ASM-032): perfil de egreso, tributación, resultados por cohorte, evidencias de evaluación. La evidencia se genera como subproducto del uso diario, no como tarea separada
2. Mapea evidencias y reportes a criterios específicos de agencias acreditadoras: CNA, ABET, AACSB, etc. (CAP-ASM-033)
3. Publica resultados de aprendizaje agregados accesibles sin autenticación (CAP-ASM-034). Solo datos agregados, nunca individuales. Requiere aprobación del Super Admin

---

## Flujos transversales

### Flujo 16: Herencia automática programa → sección (MADS)

**Actores:** Sistema (automático), Coordinador (configura), Docente (recibe)

1. El coordinador publica un programa de curso y este se marca como versión vigente
2. Cuando un docente crea un syllabus para una sección del período activo, el sistema ejecuta la migración automática (BR-MIG-001):

    * Verifica condiciones: programa Publicado + versión vigente, sección en estado inicial, período activo
    * Copia la estructura completa: componentes de evaluación, resultados de aprendizaje, contenidos, estrategias, referencias, vínculos competencia↔resultado y componente↔resultado
    * Marca cada dato migrado con flag de sincronización para distinguirlo de datos creados manualmente
    
3. El comportamiento se rige por tres parámetros institucionales (BR-MIG-002):

    * **migrationOverUserEdition** (default: false): si el docente ya editó un dato, ¿la siguiente migración lo sobrescribe?
    * **migrationWithDataDeactivation** (default: false): si se inactiva algo en el programa, ¿se replica en la sección?
    * **migrationWithSyllabusTransition** (default: false): ¿la migración ejecuta automáticamente la transición de workflow del syllabus?
    
4. **Regla de bloqueo** (BR-MIG-003): si al menos un componente de evaluación de la sección ya tiene calificaciones registradas, la migración se bloquea completamente. Máxima prioridad

### Flujo 17: Integración bidireccional con SIS

**Actores:** Super Admin (configura), Sistema (ejecuta)

1. El Super Admin configura la integración externa (CAP-ASM-039): tipo (Banner/Anthology/LMS/genérico), URL, credenciales, frecuencia, modo de sincronización
2. **Flujo inbound (SIS → uPlanner)**: El SIS envía estructura académica (programas, cursos, secciones, períodos, estudiantes, notas). uPlanner importa usando el identificador de sistema externo para sincronización idempotente (BR-INT-001). Banner usa Ethos API (polling o Pub/Sub); Anthology usa REST/OData (polling o webhooks)
3. **Flujo outbound (uPlanner → SIS)**: La institución crea documentos curriculares en uPlanner y los exporta. El sistema genera un identificador de sincronización que la institución retorna al vincular el documento en su SIS. Una vez vinculados, la relación se mantiene para futuras actualizaciones
4. **Quién es autoritativo** depende de la configuración institucional (BR-INT-002): si la institución gestiona estructura en el SIS, el SIS es autoritativo para carreras/planes/cursos; si la gestiona en uPlanner, uPlanner es autoritativo. En ambos casos, competencias, tributación y assessment son siempre de uPlanner

### Flujo 18: Codificación y taxonomías internacionales

**Actores:** Super Admin (configura), Coordinador (usa al crear entidades)

**Configuración (una vez):**

1. El Super Admin activa las taxonomías que usa la institución (CAP-CUR-054): CIP 2020, ISCED-F 2013, Bloom, ESCO, Tuning América Latina, ABET. Para cada una define a qué entidades aplica, si es obligatoria y si habilita sugerencia por IA

**Uso en el día a día (integrado en la creación de entidades):** 2. Las taxonomías operan como parte del flujo de creación de entidades, no como un paso separado. Al crear un nuevo programa, curso, competencia o resultado de aprendizaje, el formulario incluye los campos de taxonomías activas junto con el código propio. Si la sugerencia por IA está habilitada, el sistema propone el código más probable. El usuario acepta, ajusta o ignora 3. Si la taxonomía es obligatoria, la entidad no puede avanzar en el workflow sin código asignado

**Cuándo aplican las taxonomías según el escenario de implementación:**

* **Escenario A** (SIS gobierna): No aplican. Las entidades se importan con la codificación del SIS
* **Escenario B** (transición de gobernanza): No aplican para entidades importadas inicialmente. Sí aplican para entidades nuevas creadas en Curriculum Design
* **Escenario C** (gobernanza completa uPlanner): Aplican para todas las entidades desde el inicio

**Gobierno:** 4. El coordinador o equipo de acreditación consulta el reporte de cobertura (CAP-CUR-056): qué porcentaje de entidades tiene clasificación asignada, cuáles están pendientes. Útil para preparar reportes a agencias acreditadoras o cumplir requisitos de reporte (ej: IPEDS requiere CIP para todos los programas)

### Flujo 19: Exportación de documentos curriculares

**Actores:** Coordinador, Docente, Super Admin

1. El usuario selecciona un documento curricular (plan, programa o syllabus) y la acción de exportar (CAP-CUR-032)
2. Selecciona formato: Word (.docx) o PDF
3. Si hay más de una plantilla configurada para ese tipo de documento, selecciona cuál usar
4. Para programas de curso: puede filtrar por plan de estudios para que la sección de tributación muestre solo las competencias del plan seleccionado
5. Para planes de estudio: puede incluir opcionalmente los programas de curso de las asignaturas como anexo
6. El sistema genera y descarga el archivo según la plantilla seleccionada
7. Para exportación masiva (CAP-CUR-033): selecciona filtros (campus, facultad, programa, período), el sistema genera un job asíncrono y notifica al completar con archivo comprimido o consolidado

### Flujo 20: Notificaciones

**Actor:** Sistema (automático)

Las apps de Learning Assurance utilizan el motor de notificaciones de uP1 (BR-NOT-001). Los eventos que generan notificación son:

1. **Transiciones de workflow**: cuando una transición requiere acción de otro rol (ej: plan enviado a revisión → notifica al Director; syllabus aprobado → notifica al Docente)
2. **Alertas de cobertura**: cuando el docente desactiva un resultado de aprendizaje que tributa al perfil de egreso → notifica al Coordinador (BR-LIB-003)
3. **Operaciones asíncronas completadas**: clonación masiva (CAP-CUR-031), exportación de reportes (CAP-ASM-031), importación de notas (CAP-ASM-037)
4. **Migración programa→sección**: MADS ejecutado con errores o bloqueos por calificaciones → notifica al Coordinador

Las notificaciones se entregan via dos canales: in-app (visible desde el sistema) y email (configurable por el usuario).

---

# Versión
