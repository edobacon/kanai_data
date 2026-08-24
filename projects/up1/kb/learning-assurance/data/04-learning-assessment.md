---
id: SPEC-learning-assurance-004
project: up1
type: spec
module: learning-assurance
category: data
tags: [up1, learning-assurance, learning-assessment, capacidades, evaluacion, evidencias, seguimiento, reporteria, acreditacion, integraciones, calificaciones]
fecha: 2026-04-10
confluence_id: "1989705746"
confluence_url: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989705746
autor: Esteban Cortes
---
# Learning Assessment

**Navegación:** [Learning Assurance](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183) → Learning Assessment

## Áreas funcionales

| Área | Capacidades |
| --- | --- |
| 3.1 Estructura de evaluación | CAP-ASM-001 a CAP-ASM-006 |
| 3.2 Resultados de aprendizaje por sección | CAP-ASM-007 a CAP-ASM-008 |
| 3.3 Evidencias y tracking | CAP-ASM-009 a CAP-ASM-013 |
| 3.4 Seguimiento estudiantil | CAP-ASM-014 a CAP-ASM-018 |
| 3.5 Reportería | CAP-ASM-019 a CAP-ASM-031 |
| 3.6 Acreditación | CAP-ASM-032 a CAP-ASM-034 |
| 3.7 Integraciones | CAP-ASM-035 a CAP-ASM-039 |
| 3.8 Configuración | CAP-ASM-040 a CAP-ASM-042 |

---

## 3.1 Estructura de evaluación por sección

### CAP-ASM-001: Definir componentes de evaluación de la sección

**Actores:** Docente | **Prioridad:** Must

Los componentes de evaluación de una sección se **heredan automáticamente** desde el programa de curso al crear el syllabus (Ver: BR-MIG-001), incluyendo sus vínculos a resultados de aprendizaje y niveles de competencia. El docente puede personalizar la estructura heredada según el nivel de libertad evaluativa configurado por la institución (Ver: BR-LIB-001): agregar componentes nuevos, modificar o eliminar componentes heredados. Cada componente tiene un tipo (del catálogo), ponderación porcentual, nota mínima, nota máxima y umbral de aprobación. Se puede marcar si es evaluación final, grupal, de práctica o recuperable.

**Reglas de negocio:**

* La suma de porcentajes de los componentes de primer nivel debe ser 100% (incluyendo componentes heredados y agregados por el docente)
* El tipo de componente se selecciona del catálogo institucional
* Los umbrales de aprobación deben respetar la escala de calificación de la institución (CAP-ASM-006)
* Si la sección ya tiene calificaciones registradas, la estructura de evaluación queda bloqueada para migración automática; solo es editable manualmente (Ver: BR-MIG-003)
* El flag `is_synchronizable` distingue componentes heredados del programa de componentes creados por el docente
* El grado de personalización permitido depende del modo institucional: Restringido, Guiado o Libre (Ver: BR-LIB-001)
* Ver: BR-MIG-001, BR-MIG-002, BR-MIG-003, BR-LIB-001

**Resultado esperado:** Componentes de evaluación de la sección configurados (heredados + personalizados)

**Relacionado:** CAP-CUR-023, CAP-CUR-029

### CAP-ASM-002: Organizar evaluaciones jerárquicamente

**Actores:** Docente | **Prioridad:** Must

Crear sub-componentes dentro de un componente (ej: "Examen Final" → "Parte Teórica" + "Parte Práctica"). Permite descomponer evaluaciones complejas.

**Reglas de negocio:**

* Los porcentajes de sub-componentes deben sumar 100% del componente padre
* No hay límite de profundidad

**Resultado esperado:** Jerarquía de evaluaciones creada

**Relacionado:** CAP-ASM-001

### CAP-ASM-003: Configurar fórmula de cálculo

**Actores:** Docente | **Prioridad:** Must

Asociar una fórmula de cálculo de nota a cada componente que tiene sub-componentes: promedio ponderado, promedio simple, máximo, suma.

**Reglas de negocio:**

* Las fórmulas solo aplican a componentes con sub-componentes
* Los componentes sin sub-componentes (hojas) no necesitan fórmula

**Resultado esperado:** Fórmula configurada

**Relacionado:** CAP-ASM-002

### CAP-ASM-004: Asociar método de evaluación a componente

**Actores:** Docente | **Prioridad:** Should

Vincular un método pedagógico de evaluación (del catálogo de Curriculum Design) a cada componente. Ej: el componente "Proyecto final" usa el método "Estudio de caso".

**Reglas de negocio:**

* Un componente puede tener uno o más métodos
* Los métodos se seleccionan del catálogo institucional (CAP-CUR-037)

**Resultado esperado:** Método asociado

**Relacionado:** CAP-ASM-001, CAP-CUR-037

### CAP-ASM-005: Gestionar workflow de evaluación

**Actores:** Docente, Coordinador | **Prioridad:** Must

Transicionar los componentes de evaluación entre estados (Pendiente → Verificación → Publicado → Abierto).

**Reglas de negocio:**

* Ver: BR-WKF-001, BR-WKF-002

**Resultado esperado:** Componentes en nuevo estado

**Relacionado:** CAP-ASM-001

### CAP-ASM-006: Configurar escala de calificación institucional

**Actores:** Super Admin | **Prioridad:** Must

Definir la escala de calificación que usa la institución (1-7 Chile, 0-20 Perú, 0-100 Colombia, letras USA). La escala se usa para interpretar notas en reportes y para definir umbrales de aprobación.

**Reglas de negocio:**

* Una institución tiene exactamente una escala activa
* Los umbrales de los componentes de evaluación deben respetar la escala

**Resultado esperado:** Escala configurada

---

## 3.2 Resultados de aprendizaje por sección

### CAP-ASM-007: Declarar resultados de aprendizaje activos en la sección

**Actores:** Docente | **Prioridad:** Must

De los resultados de aprendizaje definidos en el programa de curso, declarar cuáles se evalúan en esta sección concreta. Puede ser un subconjunto del total. Los resultados de aprendizaje se heredan automáticamente desde el programa de curso (Ver: BR-MIG-001); el docente puede desactivar los que no apliquen a su sección, sujeto a restricciones de protección.

**Reglas de negocio:**

* Cada resultado de aprendizaje se puede activar solo una vez por sección
* Los resultados deben pertenecer al programa de curso vinculado al syllabus de esta sección
* Los resultados de aprendizaje marcados como "obligatorios en toda sección" por el coordinador no pueden ser desactivados por el docente (Ver: BR-LIB-003)
* Si el docente desactiva un resultado de aprendizaje que tributa a una competencia del perfil de egreso, el sistema genera una alerta visible para el coordinador del programa

**Resultado esperado:** Resultados de aprendizaje activos declarados para la sección

**Relacionado:** CAP-CUR-015, CAP-CUR-023

### CAP-ASM-008: Vincular evaluaciones a resultados de aprendizaje

**Actores:** Docente | **Prioridad:** Must

Vincular cada componente de evaluación con los resultados de aprendizaje de la sección que mide. Los vínculos se heredan automáticamente desde el programa de curso (Ver: BR-MIG-001); el docente puede ajustarlos según su estructura personalizada. Permite verificar cobertura: ¿todos los resultados activos tienen al menos una evaluación que los mide?

**Reglas de negocio:**

* Cada vínculo componente↔resultado debe ser único
* El sistema alerta si hay resultados de aprendizaje activos sin evaluación vinculada
* Al avanzar en el workflow de evaluación (CAP-ASM-005), la validación de cobertura completa es bloqueante en modo Restringido y Guiado, e informativa en modo Libre (Ver: BR-LIB-002)

**Resultado esperado:** Vínculos registrados, alertas de cobertura si corresponde

**Relacionado:** CAP-ASM-001, CAP-ASM-007

---

## 3.3 Evidencias y tracking de competencias

### CAP-ASM-009: Recolectar evidencias de logro

**Actores:** Docente | **Prioridad:** Should

Vincular evidencias (CAP-CUR-045) al contexto de competencia + nivel de logro para demostrar logro de competencias por parte de los estudiantes. Reutiliza la entidad de evidencia de Curriculum Design agregando la vinculación a competencia.

**Reglas de negocio:**

* La evidencia debe vincularse a al menos una competencia y nivel de logro
* Puede reutilizar una evidencia ya subida en Curriculum Design o subir una nueva

**Resultado esperado:** Evidencia vinculada a competencia y nivel de logro

**Relacionado:** CAP-CUR-045, CAP-MAP-002

### CAP-ASM-010: Definir plan de recolección de evidencias

**Actores:** Coordinador | **Prioridad:** Could

Configurar frecuencia de recolección, responsable, y tipo de evidencia esperada por competencia.

**Relacionado:** CAP-ASM-009

### CAP-ASM-011: Registrar acciones de mejora

**Actores:** Coordinador, Director | **Prioridad:** Should

A partir del análisis de evidencias y reportes de logro, registrar hallazgos y las acciones de mejora comprometidas. Cierra el ciclo de mejora continua (Plan-Do-Check-Act).

**Reglas de negocio:**

* Cada acción debe vincularse a un hallazgo (reporte, milestone o evidencia)
* Las acciones tienen responsable, plazo y estado (planificada, en curso, completada)

**Resultado esperado:** Acción de mejora registrada con responsable y plazo

**Relacionado:** CAP-ASM-019

### CAP-ASM-012: Calcular progreso de competencias por sección

**Actores:** Sistema (automático), Docente (consulta) | **Prioridad:** Must

Calcular dinámicamente el nivel de logro de cada competencia en la sección, basado en evaluaciones completadas, resultados de aprendizaje alcanzados y el perfil de cálculo configurado por la institución. El motor de cálculo es configurable en 3 capas: logro por sección, logro acumulado por estudiante, y agregación grupal (Ver: BR-CAL-001 a BR-CAL-005).

**Reglas de negocio:**

* El cálculo respeta el perfil de cálculo configurado para el programa (modo de capa 1, estrategia de capa 2)
* El resultado se actualiza cuando se registran nuevas notas o cuando el docente hace override (si el perfil lo permite)
* Si un resultado de aprendizaje tributa a múltiples competencias, la nota contribuye a todas ellas
* Ver: BR-CAL-001, BR-CAL-002, BR-CAL-003

**Resultado esperado:** Nivel de logro por competencia por sección, calculado según el perfil configurado

**Relacionado:** CAP-ASM-008, CAP-MAP-016

### CAP-ASM-013: Monitorear evidencias

**Actores:** Coordinador, Equipo de Acreditación | **Prioridad:** Could

Dashboard para rastrear el estado de recolección de evidencias: cuáles están al día, cuáles atrasadas, cuáles faltan.

**Relacionado:** CAP-ASM-009, CAP-ASM-010

---

## 3.4 Seguimiento estudiantil

### CAP-ASM-014: Consultar avance del estudiante en el plan

**Actores:** Coordinador, Asesor Académico, Estudiante (self-service) | **Prioridad:** Must

Ver el progreso de un estudiante en su plan de estudios: cursos obligatorios completados vs. pendientes, electivos cursados, bloques satisfechos, especialidad elegida, créditos acumulados.

**Reglas de negocio:**

* El avance se calcula sobre la versión del plan en la que el estudiante está matriculado
* Cursos convalidados cuentan como completados
* Incluye intentos múltiples (reprobado + reintento)

**Resultado esperado:** Vista de avance con porcentaje, cursos por estado, créditos acumulados

**Relacionado:** CAP-CUR-001, CAP-CUR-003

### CAP-ASM-015: Consultar historial curricular del estudiante

**Actores:** Coordinador, Registro Académico | **Prioridad:** Must

Ver el registro completo del recorrido académico del estudiante: todos los cursos cursados con nota, periodo, sección, estado (aprobado, reprobado, convalidado, en curso).

**Relacionado:** CAP-ASM-014

### CAP-ASM-016: Consultar indicadores del estudiante

**Actores:** Coordinador, Asesor Académico | **Prioridad:** Should

Ver métricas calculadas del estudiante: porcentaje de avance, créditos acumulados, promedio general, semestres cursados, semestres restantes estimados.

**Relacionado:** CAP-ASM-014

### CAP-ASM-017: Consultar logro de competencias por estudiante

**Actores:** Coordinador, Docente | **Prioridad:** Must

Ver el nivel alcanzado por un estudiante en cada competencia del perfil de egreso, derivado de las evaluaciones de los cursos que ha completado. Se compara con el nivel esperado declarado en el perfil.

**Reglas de negocio:**

* El logro se deriva de la cadena: cursos aprobados → resultados de aprendizaje logrados → niveles de competencia
* El nivel alcanzado se compara con el nivel esperado en el perfil de egreso

**Resultado esperado:** Perfil de competencias alcanzado vs. esperado

**Relacionado:** CAP-MAP-015, CAP-ASM-014

### CAP-ASM-018: Listar estudiantes por plan o sección

**Actores:** Coordinador, Docente | **Prioridad:** Must

Obtener listas de estudiantes filtradas por plan de estudios, sección, cohorte, estado de matrícula.

---

## 3.5 Reportería

### CAP-ASM-019: Reporte milestone individual

**Actores:** Coordinador, Asesor Académico | **Prioridad:** Must

Reporte detallado del logro de competencias de un estudiante específico en un hito determinado. Incluye radar chart de competencias, barras de logro por competencia, y progresión temporal entre hitos. Los resultados se persisten como snapshots pre-computados (scope: INDIVIDUAL) para performance; se regeneran al registrar nuevas calificaciones o bajo demanda.

**Filtros:** Campus, programa, plan, estudiante, hito

**Relacionado:** CAP-ASM-017

### CAP-ASM-020: Reporte milestone grupal

**Actores:** Coordinador, Director | **Prioridad:** Must

Logro agregado de competencias de una sección o cohorte. Permite comparar entre secciones. Resultados persistidos como snapshots pre-computados (scope: GROUP).

**Filtros:** Campus, programa, plan, sección

**Relacionado:** CAP-ASM-012

### CAP-ASM-021: Reporte milestone global

**Actores:** Director, Vicerrectoría | **Prioridad:** Must

Logro de competencias a nivel de programa o institución. Incluye vista por programa académico y vista segmentada por campus. Resultados persistidos como snapshots pre-computados (scope: GLOBAL).

**Filtros:** Programa, plan, hitos, campus, turno, periodo, cohorte

**Visualizaciones:** Perfil de egreso progresivo, heatmap por campus, stacked charts, matriz de situaciones evaluativas

**Exportación:** Reporte de milestones y reporte de competencias descargables

**Relacionado:** CAP-ASM-012

### CAP-ASM-022: Reporte perfil de egreso — vista docente

**Actores:** Docente | **Prioridad:** Should

Logro de competencias en las secciones que el docente imparte. Escala gradiente rojo-verde para identificar rápidamente áreas fuertes y débiles.

**Filtros:** Sección/curso del docente

**Relacionado:** CAP-ASM-012

### CAP-ASM-023: Reporte perfil de egreso — vista director

**Actores:** Director de Programa, Vicerrectoría | **Prioridad:** Should

Logro de competencias a nivel de programa completo, agregando todas las secciones y cohortes.

**Relacionado:** CAP-ASM-021

### CAP-ASM-024: Reporte resultados de graduación

**Actores:** Director, Equipo de Acreditación | **Prioridad:** Should

Logro de competencias de las cohortes que egresan. Muestra si los egresados alcanzan el nivel esperado en el perfil de egreso.

**Relacionado:** CAP-ASM-017

### CAP-ASM-025: Reporte cumplimiento de perfil por estudiante

**Actores:** Coordinador, Asesor | **Prioridad:** Should

Grado de cumplimiento individual del perfil de egreso: para cada competencia, nivel esperado vs. nivel alcanzado.

**Relacionado:** CAP-ASM-017

### CAP-ASM-026: Reporte seguimiento de syllabi

**Actores:** Coordinador, Super Admin | **Prioridad:** Should

Estado de creación, aprobación y publicación de syllabi por periodo académico. Identifica secciones sin syllabus o con syllabus atrasado.

**Filtros:** Campus, facultad, programa, plan de estudios, periodo, sección

**Relacionado:** CAP-CUR-035

### CAP-ASM-027: Reporte seguimiento de programas de curso

**Actores:** Coordinador, Super Admin | **Prioridad:** Could

Estado del catálogo de programas de curso: cuáles están actualizados, cuáles pendientes de versionar, cuáles vencidos.

**Filtros:** Campus, facultad, programa, plan de estudios

**Relacionado:** CAP-CUR-019

### CAP-ASM-028: Reporte progreso de pensum por estudiante

**Actores:** Coordinador, Asesor | **Prioridad:** Must

Cursos completados vs. pendientes por estudiante, desglosado por obligatorios, electivos, bloques y especialidades.

**Relacionado:** CAP-ASM-014

### CAP-ASM-029: Reporte síntesis curricular (Power BI)

**Actores:** Dirección Académica | **Prioridad:** Could

Dashboard ejecutivo integrado con Power BI para visión institucional de indicadores curriculares y de logro.

### CAP-ASM-030: Configurar reportes disponibles

**Actores:** Super Admin | **Prioridad:** Should

Definir qué reportes están disponibles para cada rol, con qué filtros por defecto, y qué datos exportar.

### CAP-ASM-031: Exportar reportes masivamente

**Actores:** Coordinador, Super Admin | **Prioridad:** Should

Exportar reportes grandes en formato CSV/Excel de forma asíncrona (job en background con notificación al completar).

**Reglas de negocio:**

* Operación asíncrona para volúmenes mayores a 1000 registros
* El usuario recibe notificación cuando la exportación está lista

**Relacionado:** CAP-ASM-030

---

## 3.6 Soporte a acreditación

### CAP-ASM-032: Generar evidencia estructurada para acreditación

**Actores:** Equipo de Acreditación | **Prioridad:** Should

Compilar automáticamente la evidencia de logro de competencias en formato estructurado para procesos de acreditación. Incluye: perfil de egreso, tributación, resultados de logro por cohorte, evidencias de evaluación.

**Reglas de negocio:**

* La evidencia se genera como subproducto del uso diario, no como tarea separada

**Relacionado:** CAP-ASM-019, CAP-MAP-018

### CAP-ASM-033: Mapear evidencias a estándares de acreditación

**Actores:** Equipo de Acreditación | **Prioridad:** Could

Vincular las evidencias y reportes existentes a los criterios o estándares específicos de una agencia acreditadora (CNA, ABET, AACSB, etc.).

**Relacionado:** CAP-ASM-032

### CAP-ASM-034: Reporte público de resultados de aprendizaje

**Actores:** Público (sin autenticación) | **Prioridad:** Could

Publicar resultados de aprendizaje accesibles externamente para agencias acreditadoras u otros interesados.

**Reglas de negocio:**

* Solo datos agregados — nunca datos individuales de estudiantes
* La publicación requiere aprobación del Super Admin

**Relacionado:** CAP-ASM-021

---

## 3.7 Integraciones con sistemas externos

### CAP-ASM-035: Importar datos de Banner (Ellucian)

**Actores:** Super Admin, Sistema (automático) | **Prioridad:** Must

Sincronizar datos académicos desde Ellucian Banner via Ethos API: programas, cursos, secciones, periodos, estudiantes. Soporta polling programado y eventos pub/sub en tiempo real.

**Reglas de negocio:**

* Los registros importados se vinculan via un identificador del sistema de origen
* La sincronización es idempotente (se puede re-ejecutar sin duplicar)
* Solo lectura de Banner; uPlanner no escribe en Banner excepto publicación de estructura de evaluación
* Ver: BR-INT-001, BR-INT-002

### CAP-ASM-036: Importar datos de Anthology Student

**Actores:** Super Admin, Sistema (automático) | **Prioridad:** Must

Sincronizar datos académicos desde Anthology Student via REST/OData API. Mismo alcance que Banner.

**Reglas de negocio:**

* Ver: BR-INT-001, BR-INT-002

### CAP-ASM-037: Importar notas desde LMS

**Actores:** Super Admin, Sistema (automático) | **Prioridad:** Should

Importar notas de estudiantes desde Brightspace, Canvas u otro LMS. Genera un job asíncrono con tracking de registros exitosos vs. fallidos.

**Reglas de negocio:**

* Las notas importadas alimentan el cálculo de logro de competencias
* El job reporta cantidad de registros procesados, exitosos y fallidos

**Relacionado:** CAP-ASM-001

### CAP-ASM-038: Publicar evaluación a sistema externo

**Actores:** Coordinador | **Prioridad:** Should

Publicar la estructura de evaluación de una sección (componentes, sub-componentes, escalas, mapeo a competencias) hacia un sistema externo (UTEC Assessment, Banner, etc.).

**Reglas de negocio:**

* Requiere confirmación del usuario antes de publicar
* Se registra la publicación en el log de auditoría

**Relacionado:** CAP-ASM-005

### CAP-ASM-039: Configurar integración externa

**Actores:** Super Admin | **Prioridad:** Must

Crear y configurar conexiones con sistemas externos (Banner, Anthology, Brightspace, UTEC, genéricos). Incluye URL, credenciales, frecuencia de polling, tipo de integración.

---

## 3.8 Configuración

### CAP-ASM-040: Configurar terminología institucional

**Actores:** Super Admin | **Prioridad:** Should

Adaptar los nombres de conceptos del sistema a la nomenclatura propia de la institución (ej: "Pensum" en vez de "Plan de estudios", "Syllabus" en vez de "Programa de sección").

### CAP-ASM-041: Configurar workflows institucionales

**Actores:** Super Admin | **Prioridad:** Should

Personalizar los estados y transiciones de workflow para cada tipo de entidad. Cada institución puede tener su propio flujo de aprobación o usar el default de plataforma.

**Reglas de negocio:**

* Los workflows default de plataforma no se pueden eliminar
* La institución puede crear workflows custom

**Resultado esperado:** Workflows personalizados activos

### CAP-ASM-042: Gestionar roles y permisos

**Actores:** Super Admin | **Prioridad:** Must

Definir qué rol puede hacer qué en cada módulo, en cada estado del workflow, y en cada sección del syllabus.

**Reglas de negocio:**

* Los permisos son configurables por: institución, facultad, programa, plan, sección del syllabus
* Permisos granulares: ver y editar por cada sección del syllabus
* Un permiso más específico sobrescribe uno más general

### CAP-ASM-043: Catálogo de plantillas de estructura de evaluación

**Actores:** Super Admin, Coordinador | **Prioridad:** Should

Mantener un catálogo de plantillas de estructura de evaluación reutilizables (ej: "Estructura estándar ingeniería: 30% parciales, 30% proyecto, 40% final"). Cada plantilla define componentes, jerarquía, pesos y métodos sugeridos. Las plantillas son opcionales: pueden usarse como punto de partida al definir evaluaciones en un programa de curso (CAP-CUR-029) o como referencia al personalizar evaluaciones a nivel de sección (CAP-ASM-001), respetando el nivel de libertad evaluativa institucional (Ver: BR-LIB-001).

**Reglas de negocio:**

* Las plantillas son sugerencias, no imposiciones. Nunca se aplican automáticamente
* Incluyen valores default de plataforma más los que la institución configure
* Una plantilla puede asociarse a un programa de curso como punto de partida; el coordinador decide si la aplica
* A nivel de sección, las plantillas son visibles como referencia para el docente

**Resultado esperado:** Catálogo de plantillas disponible

**Relacionado:** CAP-ASM-001

---

# Versión
