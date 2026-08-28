---
id: SPEC-learning-assurance-002
project: up1
type: doc
module: learning-assurance
tags:
  - up1
  - learning-assurance
  - curriculum-design
  - capacidades
  - planes
  - programas
  - syllabi
  - catalogos
  - evidencias
  - ia
  - taxonomias
  - mejora-continua
---

# Curriculum Design

**Navegación:** [Learning Assurance](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183) → Curriculum Design

## Áreas funcionales

| Área | Capacidades |
| --- | --- |
| 1.1 Planes de estudio | CAP-CUR-001 a CAP-CUR-010 |
| 1.2 Configuración de estructura | CAP-CUR-011 a CAP-CUR-013 |
| 1.3 Programas de curso | CAP-CUR-014 a CAP-CUR-022 |
| 1.4 Syllabi | CAP-CUR-023 a CAP-CUR-035 |
| 1.5 Catálogos compartidos | CAP-CUR-036 a CAP-CUR-044 |
| 1.6 Evidencias | CAP-CUR-045 a CAP-CUR-046 |
| 1.7 IA | CAP-CUR-047 a CAP-CUR-049 |
| 1.8 Categorías de requisitos | CAP-CUR-051 a CAP-CUR-053 |
| 1.9 Taxonomías y clasificación internacional | CAP-CUR-054 a CAP-CUR-056 |
| 1.10 Mejora continua curricular | CAP-CUR-057 a CAP-CUR-061 |
| 1.11 Auditoría | CAP-CUR-050 |

---

## 1.1 Gestión de planes de estudio

### CAP-CUR-001: Crear plan de estudios

**Actores:** Coordinador Académico, Director de Programa | **Prioridad:** Must

Crear un nuevo plan de estudios versionado asociado a un programa académico, definiendo sus características generales: nombre, código, créditos totales, cantidad de periodos, tipo de periodo (semestral, trimestral, etc.) y modalidad.

**Reglas de negocio:**

* Los créditos totales deben ser mayores a 0
* La cantidad de periodos debe ser mayor a 0
* La combinación de código y versión debe ser única dentro del programa
* Ver: BR-WKF-001

**Resultado esperado:** Plan creado en estado Borrador

### CAP-CUR-002: Versionar plan de estudios

**Actores:** Coordinador Académico | **Prioridad:** Must

Crear una nueva versión de un plan existente, copiando su estructura completa y permitiendo modificaciones. La nueva versión se encadena a la anterior para mantener trazabilidad histórica.

**Reglas de negocio:**

* El número de versión se incrementa automáticamente
* La versión anterior no se modifica
* Solo un plan puede estar marcado como vigente por programa

**Resultado esperado:** Nueva versión en estado Borrador, encadenada a la anterior

**Relacionado:** CAP-CUR-001

### CAP-CUR-003: Definir malla curricular (cursos del plan)

**Actores:** Coordinador Académico | **Prioridad:** Must

Asignar cursos al plan de estudios, definiendo en qué periodo va cada uno, de qué tipo es (obligatorio, electivo, práctica, formación general) y su orden dentro del periodo.

**Reglas de negocio:**

* Un curso no puede aparecer dos veces en el mismo plan
* El periodo asignado debe estar dentro del rango de periodos del plan
* Todo plan debe tener al menos un curso asignado antes de avanzar en el workflow
* El sistema alerta si la suma de créditos de los cursos obligatorios asignados no coincide con los créditos totales declarados en el plan (CAP-CUR-001). La alerta es informativa, no bloqueante, dado que los electivos y bloques pueden completar la diferencia

**Resultado esperado:** Cursos asignados al plan con posición y tipo

**Relacionado:** CAP-CUR-001

### CAP-CUR-004: Definir prerequisitos y correquisitos

**Actores:** Coordinador Académico | **Prioridad:** Must

Establecer relaciones de prerequisito (debe aprobar antes) y correquisito (debe cursar en paralelo o antes) entre cursos del plan.

**Reglas de negocio:**

* No puede haber dependencias circulares
* Un prerequisito debe estar en un periodo anterior al curso que lo requiere
* Un correquisito debe estar en el mismo periodo o anterior

**Resultado esperado:** Relaciones de dependencia registradas

**Relacionado:** CAP-CUR-003

### CAP-CUR-005: Definir especialidades y concentraciones

**Actores:** Coordinador Académico | **Prioridad:** Must

Crear sub-agrupaciones de cursos dentro del plan que representan menciones, concentraciones o tracks de especialización. Un estudiante elige una especialidad al avanzar en su carrera.

**Reglas de negocio:**

* Un plan puede tener cero o más especialidades
* Los cursos de una especialidad deben pertenecer al plan
* Cada especialidad define un mínimo de créditos requeridos

**Resultado esperado:** Especialidades creadas con sus cursos asociados

**Relacionado:** CAP-CUR-003

### CAP-CUR-006: Definir bloques electivos

**Actores:** Coordinador Académico | **Prioridad:** Must

Crear grupos de cursos donde el estudiante debe elegir N de M opciones para cumplir el requisito. Ejemplo: "Elige 3 de estos 5 electivos de profundización".

**Reglas de negocio:**

* La cantidad de cursos requeridos debe ser menor o igual a la cantidad de cursos en el bloque
* Los cursos del bloque deben pertenecer al plan
* Un curso puede pertenecer a más de un bloque (si la institución lo permite)

**Resultado esperado:** Bloque electivo creado con reglas de elección

**Relacionado:** CAP-CUR-003

### CAP-CUR-007: Registrar equivalencias administrativas de cursos

**Actores:** Coordinador Académico, Registro Académico | **Prioridad:** Must

Registrar oficialmente que un curso puede sustituir a otro dentro del plan para efectos de convalidación u homologación. Distinto de la equivalencia semántica por IA (Curriculum Mapping).

**Reglas de negocio:**

* La equivalencia es direccional o bidireccional (configurable)
* Debe registrar la resolución o acto administrativo que la respalda

**Resultado esperado:** Equivalencia registrada con trazabilidad administrativa

**Relacionado:** CAP-CUR-003

### CAP-CUR-008: Configurar condiciones académicas y excepciones

**Actores:** Coordinador Académico | **Prioridad:** Should

Definir reglas especiales sobre qué cursos pueden tomar ciertos estudiantes bajo condiciones específicas (ej: estudiantes en prueba académica solo pueden tomar cursos del bloque básico, listas de cursos excluidos para ciertos perfiles).

**Reglas de negocio:**

* Las condiciones se evalúan al momento de la inscripción
* Las excepciones pueden desactivarse sin eliminarse

**Resultado esperado:** Reglas de condición configuradas

**Relacionado:** CAP-CUR-003

### CAP-CUR-009: Gestionar workflow de aprobación del plan

**Actores:** Coordinador, Director, Comité de Currículo | **Prioridad:** Must

Transicionar el plan entre estados del workflow (Borrador → Revisión → Aprobado → Vigente → Deprecado → Archivado). Cada transición requiere un rol autorizado y permite registrar un comentario de justificación.

**Reglas de negocio:**

* Solo las transiciones configuradas en el workflow son permitidas
* Solo usuarios con el rol requerido pueden ejecutar cada transición
* Cada transición genera un registro de auditoría inmutable
* Un plan con estudiantes matriculados activos no puede transicionar a Archivado ni Deprecado
* Ver: BR-WKF-001, BR-WKF-002, BR-WKF-003

**Resultado esperado:** Plan en nuevo estado, transición registrada con auditoría

**Relacionado:** CAP-CUR-001

### CAP-CUR-010: Publicar y clonar plan de estudios

**Actores:** Coordinador Académico | **Prioridad:** Must

Publicar un plan aprobado para consulta de estudiantes. Clonar un plan completo (con sus cursos, especialidades, bloques, prerequisitos) para crear una nueva versión o adaptarlo a otro programa.

**Reglas de negocio:**

* Solo se puede publicar un plan en estado Aprobado o Vigente
* La clonación copia toda la estructura pero genera nuevos identificadores
* El plan clonado nace en estado Borrador

**Resultado esperado:** Plan publicado o clonado exitosamente

**Relacionado:** CAP-CUR-009

---

## 1.2 Configuración de estructura de programa

### CAP-CUR-011: Definir estructura de programa de curso

**Actores:** Super Admin | **Prioridad:** Must

Configurar qué secciones y campos tiene un programa de curso en la institución. La estructura distingue dos tipos de secciones:

* **Secciones estructurales** (estándar de plataforma, no eliminables): tienen esquema fijo porque el sistema opera sobre sus datos para el flujo Curriculum Design → Curriculum Mapping → Learning Assessment. La institución puede configurar si son visibles y si son obligatorias, pero no puede modificar su esquema de datos.

    * Datos generales (nombre, código, créditos, nivel)
    * Resultados de aprendizaje (código + nombre + descripción, vinculables a competencias y evaluaciones)
    * Componentes de evaluación — plantilla (tipo, peso, jerarquía, vinculables a outcomes; se heredan a secciones via MADS)
    * Contenidos temáticos (temas/subtemas jerárquicos, vinculables a competencias)
    
* **Secciones complementarias** (configurables por institución): formularios personalizables que enriquecen el documento sin alimentar lógica del sistema. La institución decide cuáles tener, qué campos incluyen, si son obligatorias, y qué tipo de contenido aceptan.

    * La plataforma provee secciones complementarias sugeridas: descripción del curso, metodología de enseñanza, bibliografía/referencias, perfil del docente, recursos requeridos, modalidades y actividades
    * La institución puede agregar, renombrar, reordenar o desactivar secciones complementarias
    

**Reglas de negocio:**

* Debe existir al menos una estructura por institución
* Las secciones estructurales no pueden ser eliminadas ni modificadas en esquema; solo se configura visibilidad y obligatoriedad
* Las secciones complementarias soportan tipos de contenido: texto, texto enriquecido, lista, tabla, archivo adjunto, JSON
* Las secciones complementarias soportan anidamiento sin límite de profundidad

**Resultado esperado:** Estructura de programa definida con secciones estructurales y complementarias

### CAP-CUR-012: Definir estructura de syllabus

**Actores:** Super Admin | **Prioridad:** Must

Configurar qué secciones tiene un syllabus en la institución. Mismo patrón dual que CAP-CUR-011:

* **Secciones estructurales** (estándar de plataforma, no eliminables):

    * Datos generales de la sección (docente, periodo, horario)
    * Resultados de aprendizaje activos (selección de outcomes del programa, vinculables a evaluaciones)
    * Componentes de evaluación (heredados del programa + personalizados, vinculan a outcomes, reciben calificaciones)
    * Contenidos temáticos (heredados, vinculables a competencias)
    * Sesiones (vinculan a estrategias, actividades, temas, evaluaciones)
    * Condiciones de aprobación (asistencia mínima, nota mínima)
    
* **Secciones complementarias** (configurables por institución):

    * Sugeridas: descripción/presentación, bibliografía/referencias, recursos
    * La institución puede agregar, renombrar, reordenar o desactivar
    

**Reglas de negocio:**

* Las secciones estructurales están siempre presentes y no pueden ser eliminadas
* La institución puede agregar secciones complementarias custom
* Cada sección (estructural y complementaria) tiene permisos granulares de ver/editar por rol (Ver: BR-PRM-001)

**Resultado esperado:** Estructura de syllabus definida

### CAP-CUR-012b: Definir estructura de plan de estudios

**Actores:** Super Admin | **Prioridad:** Must

Configurar qué secciones y campos tiene un plan de estudios en la institución. Mismo patrón dual:

* **Secciones estructurales** (estándar de plataforma, no eliminables):

    * Datos generales (nombre, código, créditos totales, cantidad de periodos, tipo de periodo, modalidad)
    * Malla curricular (cursos asignados con periodo, tipo, orden)
    * Prerequisitos y correquisitos
    * Especialidades y concentraciones
    * Bloques electivos
    * Categorías de requisitos (si se usan)
    * Equivalencias de cursos
    * Perfil de egreso (declaración textual del perfil; cuando Curriculum Mapping está activo, se vincula automáticamente al perfil formal de competencias CAP-MAP-012 y se enriquece con competencias, niveles y pesos)
    
* **Secciones complementarias** (configurables por institución):

    * Sugeridas: fundamentación/justificación del programa, perfil de ingreso, campo ocupacional, objetivos del programa
    * La institución puede agregar, renombrar, reordenar o desactivar
    

**Reglas de negocio:**

* Las secciones estructurales no pueden ser eliminadas ni modificadas en esquema
* La sección de perfil de egreso es siempre visible; en Curriculum Design acepta contenido de texto libre; con Curriculum Mapping activo, muestra además la estructura formal de competencias vinculada
* Las secciones complementarias soportan tipos de contenido: texto, texto enriquecido, lista, tabla, archivo adjunto, JSON

**Resultado esperado:** Estructura de plan de estudios definida

### CAP-CUR-013: Wizard de configuración inicial

**Actores:** Super Admin | **Prioridad:** Should

Flujo guiado para el setup inicial del módulo: definir estructuras de plan de estudios, programa de curso y syllabus, cargar catálogos base, configurar workflows, configurar taxonomías, importar datos iniciales.

**Reglas de negocio:**

* El wizard se ejecuta una vez; después se usa la configuración normal
* El sistema verifica si el wizard ya fue completado

**Resultado esperado:** Módulo configurado y listo para uso

**Relacionado:** CAP-CUR-011, CAP-CUR-012, CAP-CUR-012b

---

## 1.3 Gestión de programas de curso

### CAP-CUR-014: Crear programa de curso

**Actores:** Coordinador de Curso, Jefe de Departamento | **Prioridad:** Must

Definir el programa base de un curso con sus características generales y secciones de contenido según la estructura configurada por la institución.

**Reglas de negocio:**

* Un programa de curso pertenece a un curso base del catálogo
* Las secciones disponibles dependen de la estructura configurada (CAP-CUR-011)
* La combinación de código y versión debe ser única por curso
* Ver: BR-WKF-001

**Resultado esperado:** Programa de curso en estado Borrador

**Relacionado:** CAP-CUR-011

### CAP-CUR-015: Definir resultados de aprendizaje del curso

**Actores:** Coordinador de Curso | **Prioridad:** Must

Declarar los resultados de aprendizaje del curso: qué será capaz de hacer el estudiante al completarlo. Cada resultado tiene un código identificador, nombre y descripción.

**Reglas de negocio:**

* El código debe ser único dentro del programa de curso (ej: RA-01, RA-02)
* Al menos un resultado de aprendizaje es requerido antes de avanzar en el workflow

**Resultado esperado:** Resultados de aprendizaje definidos y asociados al programa

**Relacionado:** CAP-CUR-014

### CAP-CUR-016: Gestionar secciones del programa de curso

**Actores:** Coordinador de Curso | **Prioridad:** Must

Editar el contenido de cada sección del programa (contenidos temáticos, metodología, bibliografía, etc.). Las secciones soportan anidamiento (ej: Unidad 1 dentro de Contenidos).

**Reglas de negocio:**

* Las secciones obligatorias deben tener contenido antes de avanzar en el workflow
* El anidamiento no tiene límite de profundidad

**Resultado esperado:** Secciones editadas con contenido

**Relacionado:** CAP-CUR-014

### CAP-CUR-017: Configurar modalidades y tipos de actividad

**Actores:** Coordinador de Curso | **Prioridad:** Should

Asociar modalidades de impartición (presencial, online, híbrido) y tipos de actividad académica al programa de curso.

**Reglas de negocio:**

* Al menos una modalidad debe estar asociada

**Resultado esperado:** Modalidades y actividades configuradas

**Relacionado:** CAP-CUR-014, CAP-CUR-036

### CAP-CUR-018: Versionar programa de curso

**Actores:** Coordinador de Curso | **Prioridad:** Must

Crear una nueva versión de un programa de curso, copiando su contenido completo. La codificación de versión es libre (el usuario puede usar código de periodo académico, año, secuencial, u otro esquema según la práctica institucional). Permite versionamiento individual o masivo (múltiples programas en una operación batch con tracking de progreso).

**Reglas de negocio:**

* El versionamiento masivo genera un job asíncrono con barra de progreso
* La versión anterior no se modifica

**Resultado esperado:** Nueva versión creada en estado Borrador

**Relacionado:** CAP-CUR-014

### CAP-CUR-019: Gestionar workflow del programa de curso

**Actores:** Coordinador, Director de Programa | **Prioridad:** Must

Transicionar el programa entre estados (Borrador → Revisión → Aprobado → Publicado).

**Reglas de negocio:**

* Ver: BR-WKF-001, BR-WKF-002

**Resultado esperado:** Programa en nuevo estado, transición registrada

**Relacionado:** CAP-CUR-014

### CAP-CUR-020: Publicar catálogo público de cursos

**Actores:** Coordinador, Super Admin | **Prioridad:** Should

Publicar programas de curso aprobados en un catálogo accesible sin autenticación. Incluye búsqueda por nombre, código, departamento.

**Reglas de negocio:**

* Solo programas en estado Publicado aparecen en el catálogo
* El catálogo es de solo lectura

**Resultado esperado:** Catálogo público activo

**Relacionado:** CAP-CUR-019

### CAP-CUR-021: Compartir programa de curso via link

**Actores:** Cualquier usuario autenticado | **Prioridad:** Could

Generar un link público para compartir un programa de curso específico sin requerir autenticación del receptor.

**Reglas de negocio:**

* Solo programas en estado Publicado son compartibles

**Resultado esperado:** URL pública generada

**Relacionado:** CAP-CUR-020

### CAP-CUR-022: Clonar programa de curso

**Actores:** Coordinador de Curso | **Prioridad:** Should

Duplicar un programa de curso completo (con secciones, resultados de aprendizaje) para reutilizar en otro curso o contexto.

**Reglas de negocio:**

* La clonación genera nuevos identificadores
* El clon nace en estado Borrador

**Resultado esperado:** Programa clonado

**Relacionado:** CAP-CUR-014

---

## 1.4 Gestión de syllabi

### CAP-CUR-023: Crear syllabus por sección

**Actores:** Docente | **Prioridad:** Must

Crear el plan de enseñanza concreto que el docente impartirá en una sección de un periodo académico. El syllabus toma como base el programa de curso y permite personalización.

**Reglas de negocio:**

* Una sección solo puede tener un syllabus por programa de curso
* El syllabus hereda la estructura configurada por la institución (CAP-CUR-012)
* Ver: BR-WKF-001

**Resultado esperado:** Syllabus creado en estado Borrador

**Relacionado:** CAP-CUR-014, CAP-CUR-012

### CAP-CUR-024: Editar secciones del syllabus

**Actores:** Docente | **Prioridad:** Must

Editar las secciones del syllabus: datos generales, modalidades, competencias, contenidos, sesiones, evaluaciones, condiciones de aprobación, bibliografía. Cada sección tiene permisos granulares de ver/editar por rol.

**Reglas de negocio:**

* Permisos granulares por sección: datos generales, modalidades/actividades, competencias, contenidos, sesiones, evaluaciones, condiciones de aprobación, referencias — cada una con permiso de ver y editar independiente
* Secciones obligatorias deben completarse antes de avanzar en el workflow

**Resultado esperado:** Secciones editadas

**Relacionado:** CAP-CUR-023

### CAP-CUR-025: Gestionar temas y subtemas

**Actores:** Docente | **Prioridad:** Must

Crear estructura jerárquica de unidades de contenido dentro del syllabus (Unidad 1 → Tema 1.1 → Tema 1.2). Cada tema puede vincularse a resultados de aprendizaje esperados.

**Reglas de negocio:**

* Los temas se organizan jerárquicamente sin límite de profundidad
* La vinculación a resultados de aprendizaje es opcional pero recomendada

**Resultado esperado:** Estructura de contenido definida

**Relacionado:** CAP-CUR-023, CAP-CUR-015

### CAP-CUR-026: Configurar sesiones con estrategias de aprendizaje

**Actores:** Docente | **Prioridad:** Should

Definir las sesiones del syllabus: fecha/horario, actividades planificadas, y seleccionar estrategias de aprendizaje del catálogo institucional.

**Reglas de negocio:**

* Las estrategias se seleccionan del catálogo institucional (CAP-CUR-036)
* Las actividades se seleccionan del catálogo institucional (CAP-CUR-038)

**Resultado esperado:** Sesiones configuradas

**Relacionado:** CAP-CUR-023, CAP-CUR-036, CAP-CUR-038

### CAP-CUR-027: Definir condiciones de aprobación

**Actores:** Docente, Coordinador | **Prioridad:** Must

Establecer las condiciones de aprobación del curso: asistencia mínima, nota mínima, requisitos especiales.

**Reglas de negocio:**

* La asistencia mínima se expresa como porcentaje (0-100)
* La nota mínima debe respetar la escala de calificación de la institución

**Resultado esperado:** Condiciones de aprobación registradas

**Relacionado:** CAP-CUR-023

### CAP-CUR-028: Gestionar bibliografía y referencias

**Actores:** Docente | **Prioridad:** Should

Seleccionar referencias de la biblioteca centralizada de la institución o agregar nuevas. Cada referencia tiene tipo (obligatoria, complementaria, digital) y formato de citación.

**Reglas de negocio:**

* Las referencias de la biblioteca se reutilizan entre syllabi (no se duplican)
* El docente puede agregar referencias nuevas que se suman a la biblioteca

**Resultado esperado:** Bibliografía asociada al syllabus

**Relacionado:** CAP-CUR-023, CAP-CUR-042

### CAP-CUR-029: Definir componentes de evaluación en programa de curso (plantilla)

**Actores:** Coordinador de Curso | **Prioridad:** Must

Estructurar los componentes de evaluación a nivel de programa de curso: tipo, ponderación, método de evaluación, jerarquía y vínculos a resultados de aprendizaje. Esta estructura actúa como **plantilla base** que se hereda automáticamente a las secciones del periodo activo via migración (Ver: BR-MIG-001). La medición de logro de competencias ocurre en Learning Assessment.

**Reglas de negocio:**

* La suma de ponderaciones de componentes de primer nivel debe ser 100%
* Los métodos se seleccionan del catálogo institucional (CAP-CUR-037)
* Los componentes pueden opcionalmente vincularse a resultados de aprendizaje del curso (CAP-CUR-015); si se vinculan, estos vínculos se heredan a la sección junto con los componentes, reduciendo el trabajo del docente en Learning Assessment. Si no se vinculan en la plantilla, el docente los vincula manualmente en la sección
* Ver: BR-MIG-001

**Resultado esperado:** Estructura de evaluación definida como plantilla, lista para ser heredada por las secciones

**Relacionado:** CAP-CUR-014, CAP-CUR-037, CAP-CUR-015

### CAP-CUR-030: Clonar syllabus individual

**Actores:** Docente, Coordinador | **Prioridad:** Must

Clonar un syllabus existente a otra sección del mismo periodo o de otro periodo.

**Reglas de negocio:**

* La clonación genera nuevos identificadores
* El clon nace en estado Borrador
* Se registra el origen de la clonación para trazabilidad

**Resultado esperado:** Syllabus clonado en la sección destino

**Relacionado:** CAP-CUR-023

### CAP-CUR-031: Clonación masiva de syllabi entre periodos

**Actores:** Coordinador, Super Admin | **Prioridad:** Must

Replicar todos los syllabi de un periodo académico a otro en una operación batch. Genera un job asíncrono con tracking de progreso.

**Reglas de negocio:**

* Operación asíncrona con estado consultable
* Si la sección destino ya tiene syllabus, no se sobrescribe
* Se genera reporte de resultados al finalizar

**Resultado esperado:** Syllabi clonados, reporte de resultados

**Relacionado:** CAP-CUR-030

### CAP-CUR-032: Exportar documento curricular (plan, programa o syllabus)

**Actores:** Coordinador, Docente, Super Admin | **Prioridad:** Should

Exportar cualquier documento curricular (plan de estudios, programa de curso o syllabus) como archivo Word (.docx) o PDF. La exportación utiliza plantillas configurables por institución que determinan la estructura, estilos y contenido del documento generado. Cada tipo de documento puede tener una o más plantillas asociadas.

**Reglas de negocio:**

* Formatos soportados: Word (.docx) y PDF
* La institución configura plantillas de exportación por tipo de documento. La plataforma provee plantillas default. La institución puede agregar plantillas custom
* Si hay más de una plantilla disponible para el tipo de documento, el usuario selecciona cuál usar al exportar
* La exportación incluye tanto secciones estructurales como complementarias del documento, según lo que defina la plantilla
* Para programas de curso, la exportación puede filtrarse por plan de estudios para que la sección de tributación muestre solo las competencias del plan seleccionado
* Para planes de estudios, la exportación puede incluir opcionalmente los programas de curso (sílabos principales) de las asignaturas asociadas como anexo

**Resultado esperado:** Archivo Word o PDF descargado según plantilla seleccionada

**Relacionado:** CAP-CUR-001, CAP-CUR-014, CAP-CUR-023

### CAP-CUR-033: Exportación masiva de documentos curriculares

**Actores:** Coordinador, Super Admin | **Prioridad:** Could

Exportar múltiples documentos curriculares del mismo tipo en una operación batch, filtrados por campus, facultad, programa, periodo. Genera un job asíncrono con tracking de progreso.

**Reglas de negocio:**

* Operación asíncrona para volúmenes grandes, con notificación al completar
* Usa la misma plantilla seleccionada para todos los documentos del batch
* Genera un archivo comprimido (.zip) con todos los documentos o un documento consolidado según configuración

**Resultado esperado:** Archivo(s) descargado(s)

**Relacionado:** CAP-CUR-032

### CAP-CUR-034: Compartir syllabus via link público

**Actores:** Docente | **Prioridad:** Should

Generar un link público para que los estudiantes accedan al syllabus sin autenticación.

**Reglas de negocio:**

* Solo syllabi en estado Publicado son compartibles

**Resultado esperado:** URL pública generada

**Relacionado:** CAP-CUR-035

### CAP-CUR-035: Gestionar workflow del syllabus

**Actores:** Docente, Coordinador, Director | **Prioridad:** Must

Transicionar el syllabus entre estados (Borrador → Revisión → Aprobado → Publicado).

**Reglas de negocio:**

* Ver: BR-WKF-001, BR-WKF-002

**Resultado esperado:** Syllabus en nuevo estado

**Relacionado:** CAP-CUR-023

---

## 1.5 Catálogos compartidos

### CAP-CUR-036: Catálogo de estrategias de aprendizaje

**Actores:** Super Admin (configura), Docente (consulta y usa) | **Prioridad:** Should

Mantener un catálogo reutilizable de estrategias pedagógicas (aprendizaje basado en problemas, clase invertida, estudio de caso, debate, etc.). Incluye valores default de plataforma más los que cada institución configure.

### CAP-CUR-037: Catálogo de métodos de evaluación

**Actores:** Super Admin (configura), Docente (consulta y usa) | **Prioridad:** Should

Catálogo de métodos pedagógicos de evaluación (portafolio, debate evaluado, simulación, rúbrica, etc.). Es distinto del tipo de componente de evaluación (Learning Assessment): el método es el enfoque pedagógico, el componente es la instancia evaluativa.

### CAP-CUR-038: Catálogo de tipos de actividad

**Actores:** Super Admin | **Prioridad:** Should

Catálogo de actividades académicas (clase magistral, laboratorio, taller, seminario, tutoría, etc.) que se asocian a sesiones del syllabus.

### CAP-CUR-039: Catálogo de áreas y subáreas de aprendizaje

**Actores:** Super Admin | **Prioridad:** Could

Taxonomía para clasificar cursos y resultados de aprendizaje por dominio de conocimiento.

### CAP-CUR-040: Catálogo de tipos de recurso

**Actores:** Super Admin | **Prioridad:** Could

Catálogo de recursos didácticos (software, equipamiento, materiales, espacios).

### CAP-CUR-041: Catálogo de idiomas

**Actores:** Super Admin | **Prioridad:** Could

Catálogo de idiomas de impartición de cursos y syllabi.

### CAP-CUR-042: Biblioteca centralizada de referencias

**Actores:** Docente (agrega y usa), Coordinador (administra) | **Prioridad:** Should

Repositorio de referencias bibliográficas reutilizable entre syllabi y programas de curso. Cada referencia tiene título, autor(es), año, tipo (obligatoria, complementaria, digital), URL/DOI.

**Reglas de negocio:**

* Las referencias son compartidas a nivel institucional
* Un docente puede agregar referencias que quedan disponibles para todos

### CAP-CUR-043: Catálogo de estilos de citación

**Actores:** Super Admin | **Prioridad:** Could

Formatos bibliográficos disponibles (APA, MLA, Chicago, Vancouver, IEEE).

### CAP-CUR-044: Catálogo de tipos de curso

**Actores:** Super Admin | **Prioridad:** Must

Tipos de curso dentro de un plan de estudios (obligatorio, electivo, formación general, práctica profesional). Configurable por institución con defaults de plataforma.

---

## 1.6 Evidencias

### CAP-CUR-045: Subir archivos de evidencia

**Actores:** Docente, Coordinador | **Prioridad:** Should

Subir documentos o artefactos como evidencia. Cada evidencia se vincula a uno o más contextos: programa de curso, sección/syllabus, competencia + nivel de logro, o combinaciones de estos. El contexto de vinculación determina el uso de la evidencia (documentación curricular, demostración de logro, soporte a acreditación). Es una entidad única reutilizada en Curriculum Design y Learning Assessment.

**Reglas de negocio:**

* Una evidencia debe vincularse a al menos un contexto
* Una misma evidencia puede vincularse a múltiples contextos (ej: un proyecto final documenta el syllabus y demuestra logro de una competencia)

### CAP-CUR-046: Gestionar evidencias

**Actores:** Docente, Coordinador | **Prioridad:** Should

Versionar, descargar y eliminar archivos de evidencia. Las evidencias se consultan filtradas por contexto de vinculación.

**Relacionado:** CAP-CUR-045

---

## 1.7 Funcionalidades de IA

### CAP-CUR-047: Ingesta de documentos curriculares

**Actores:** Coordinador, Super Admin | **Prioridad:** Should

Subir documentos (PDF, Word, Excel) con información curricular. El sistema extrae automáticamente la estructura (plan, cursos, resultados de aprendizaje) via IA y la presenta para revisión humana antes de confirmar.

**Reglas de negocio:**

* El resultado extraído siempre pasa por revisión humana antes de convertirse en datos definitivos
* El job tiene estados: Pendiente → Procesando → En revisión → Confirmado / Fallido

**Resultado esperado:** Datos curriculares extraídos y listos para revisión

### CAP-CUR-048: Análisis de cobertura de resultados de aprendizaje (IA)

**Actores:** Coordinador, Director | **Prioridad:** Could

Analizar los resultados de aprendizaje de todos los cursos de un plan para generar un reporte de cobertura: qué clusters temáticos emergen, dónde hay vacíos (áreas no cubiertas por ningún resultado de aprendizaje), dónde hay redundancias (resultados muy similares entre cursos), y qué progresión existe entre periodos. Es un análisis descriptivo del plan, no una generación de perfil de egreso (el perfil se gestiona en Curriculum Mapping).

**Reglas de negocio:**

* El resultado es un reporte con hallazgos y visualizaciones, no una acción automática
* Si Curriculum Mapping está activo, el análisis se ofrece como input para el simulador de perfil de egreso (CAP-MAP-024)

**Resultado esperado:** Reporte de cobertura de resultados de aprendizaje para revisión humana

**Relacionado:** CAP-CUR-015

### CAP-CUR-049: Analizador de coherencia curricular

**Actores:** Coordinador, Director | **Prioridad:** Could

Analizar la secuencia de cursos del plan para detectar vacíos (competencias no cubiertas), redundancias (mismo contenido en múltiples cursos) y desalineaciones (prerequisitos inconsistentes).

**Reglas de negocio:**

* El resultado es un reporte con hallazgos y sugerencias, no acciones automáticas

**Resultado esperado:** Reporte de coherencia

**Relacionado:** CAP-CUR-015

---

## 1.8 Categorías de requisitos

### CAP-CUR-051: Definir categorías de requisitos en el plan

**Actores:** Coordinador Académico | **Prioridad:** Should

Crear categorías que organizan los cursos del plan según su función curricular (ej: formación general, núcleo de la especialidad, electivos de profundización, minor, electivos libres). Cada categoría define un nombre, descripción y rango de créditos requeridos (mínimo y máximo). Las categorías son opcionales: un plan puede funcionar sin ellas (modelo de malla rígida tradicional) o usarlas para representar estructuras flexibles.

**Reglas de negocio:**

* Un plan puede tener cero o más categorías de requisitos
* Las categorías son configurables por institución con defaults de plataforma (Formación general, Núcleo, Electivo, Libre)
* Los créditos mínimos y máximos de las categorías no necesitan sumar exactamente los créditos totales del plan (hay flexibilidad por doble conteo y electivos libres)

**Resultado esperado:** Categorías de requisitos definidas

**Relacionado:** CAP-CUR-001

### CAP-CUR-052: Asignar reglas de cumplimiento por categoría

**Actores:** Coordinador Académico | **Prioridad:** Should

Definir cómo un estudiante satisface cada categoría: cursos obligatorios específicos, bloques electivos ("elegir N de M"), o requisitos abiertos ("cualquier curso del departamento X" o "cualquier curso de nivel 300+"). Permite representar tanto mallas rígidas como modelos flexibles tipo major/minor.

**Reglas de negocio:**

* Cada curso asignado al plan puede pertenecer a una o más categorías
* Una categoría puede combinar cursos obligatorios y reglas de elección flexible
* Los periodos (semestre/trimestre) son una sugerencia de secuencia, no un requisito de cumplimiento — un estudiante puede satisfacer una categoría tomando cursos en cualquier periodo

**Resultado esperado:** Reglas de cumplimiento configuradas por categoría

**Relacionado:** CAP-CUR-051, CAP-CUR-003

### CAP-CUR-053: Configurar reglas de doble conteo entre categorías

**Actores:** Coordinador Académico | **Prioridad:** Could

Definir si un curso puede satisfacer requisitos de más de una categoría simultáneamente (ej: un curso de estadística cuenta como formación general Y como requisito del major). Las reglas de doble conteo son configurables por par de categorías.

**Reglas de negocio:**

* Por defecto, un curso solo satisface una categoría (sin doble conteo)
* El doble conteo se habilita explícitamente por par de categorías
* Se puede limitar la cantidad máxima de créditos que aplican doble conteo entre dos categorías

**Resultado esperado:** Reglas de doble conteo configuradas

**Relacionado:** CAP-CUR-051

---

## 1.9 Taxonomías y clasificación internacional

### CAP-CUR-054: Configurar taxonomías institucionales

**Actores:** Super Admin | **Prioridad:** Should

Activar y configurar qué taxonomías internacionales utiliza la institución. Para cada taxonomía activa, definir a qué entidades aplica (programas, cursos, competencias, resultados de aprendizaje), si es obligatoria u opcional, y si se habilita sugerencia por IA. La plataforma viene precargada con CIP 2020, ISCED-F 2013, Bloom revisada, ESCO, Tuning América Latina y ABET Student Outcomes. La institución puede agregar taxonomías custom.

**Reglas de negocio:**

* Los catálogos precargados no pueden ser eliminados; pueden desactivarse
* Si una taxonomía se marca como obligatoria para un tipo de entidad, solo las entidades creadas en Curriculum Design quedan sujetas a esa obligatoriedad. Las entidades importadas desde el SIS conservan su codificación original y no son sujeto de clasificación obligatoria (Ver: BR-INT-002, escenarios A y B)
* Ver: BR-TAX-002

**Resultado esperado:** Taxonomías activas con sus reglas de aplicación por entidad

### CAP-CUR-055: Asignar clasificación internacional a entidades

**Actores:** Coordinador, Super Admin | **Prioridad:** Should

Al crear una entidad codificable en Curriculum Design (programa, curso, competencia, resultado de aprendizaje), el formulario de creación incluye los campos de taxonomías activas junto con el código propio. Si la sugerencia por IA está habilitada, el sistema propone el código más probable; el usuario acepta, ajusta o ignora. Si la taxonomía es obligatoria para esa entidad, el código debe estar asignado para avanzar en el workflow. Las taxonomías solo aplican a entidades creadas en Curriculum Design, no a entidades importadas desde el SIS (Ver: BR-INT-002).

**Reglas de negocio:**

* El código propio de la entidad es siempre independiente de las clasificaciones internacionales
* Las sugerencias de IA son revisables, nunca se aplican automáticamente
* Ver: BR-TAX-001, BR-TAX-003

**Resultado esperado:** Clasificaciones internacionales asignadas a la entidad

**Relacionado:** CAP-CUR-054

### CAP-CUR-056: Consultar cobertura de clasificación

**Actores:** Coordinador, Super Admin, Equipo de Acreditación | **Prioridad:** Could

Consultar qué porcentaje de entidades tiene su clasificación internacional asignada, filtrado por taxonomía y tipo de entidad. Permite identificar entidades pendientes de clasificación y priorizar el esfuerzo. Útil para preparar reportes a agencias acreditadoras o cumplir requisitos de reporte (ej: IPEDS requiere CIP para todos los programas).

**Reglas de negocio:**

* El reporte muestra: total de entidades, clasificadas, pendientes, porcentaje de cobertura

**Resultado esperado:** Reporte de cobertura de clasificación

**Relacionado:** CAP-CUR-055

---

## 1.10 Mejora continua curricular

### CAP-CUR-057: Crear solicitud de cambio curricular

**Actores:** Coordinador, Director, Docente (según configuración institucional) | **Prioridad:** Should

Registrar una solicitud de modificación vinculada a un plan de estudios o programa de curso. Cada solicitud incluye: descripción del cambio propuesto, justificación, evidencia o fuente (reporte de logro, feedback de acreditación, propuesta docente), y clasificación como micro o macrocurricular. Las solicitudes se acumulan como backlog de mejora continua del documento.

**Reglas de negocio:**

* La solicitud se vincula a exactamente un plan de estudios o un programa de curso (no a syllabi — el syllabus es un artefacto operativo)
* La clasificación micro/macro determina el flujo de aplicación:

    * **Micro**: cambios menores aplicables sobre la versión vigente (actualizar bibliografía, ajustar descripción de un resultado de aprendizaje, corregir horas)
    * **Macro**: cambios estructurales que requieren nueva versión (agregar/eliminar cursos, cambiar prerequisitos, modificar perfil de egreso, reestructurar especialidades)
    
* Un cambio microcurricular en un programa de curso no impacta la versión del plan
* Un cambio macrocurricular en un programa de curso implica nueva versión del programa, y las nuevas versiones del plan nacerán referenciando esa nueva versión

**Resultado esperado:** Solicitud de cambio creada en estado Propuesta

**Relacionado:** CAP-CUR-001, CAP-CUR-014

### CAP-CUR-058: Gestionar workflow de solicitud de cambio

**Actores:** Coordinador, Director, Comité de Currículo | **Prioridad:** Should

Transicionar la solicitud entre estados: Propuesta → En revisión → Aprobada / Rechazada. Cada transición registra quién revisó, cuándo y con qué justificación.

**Reglas de negocio:**

* Solo usuarios con el rol requerido pueden aprobar/rechazar
* Una solicitud rechazada puede reabrirse con justificación
* Ver: BR-WKF-001, BR-WKF-002

**Resultado esperado:** Solicitud en nuevo estado, transición registrada con auditoría

**Relacionado:** CAP-CUR-057

### CAP-CUR-059: Aplicar cambio microcurricular sobre versión vigente

**Actores:** Coordinador | **Prioridad:** Should

Aplicar una solicitud micro aprobada sobre la versión vigente del plan o programa. El documento transiciona temporalmente a un estado "Vigente - en revisión menor" que permite ediciones controladas sin crear nueva versión. Una vez aplicado el cambio, el documento vuelve a estado Vigente y la solicitud se cierra como "Aplicada".

**Reglas de negocio:**

* Solo solicitudes micro aprobadas pueden aplicarse sobre la versión vigente
* El estado "Vigente - en revisión menor" permite ediciones pero el documento sigue siendo consultable y funcional
* La solicitud se cierra automáticamente como "Aplicada" al completar la edición y retornar a Vigente

**Resultado esperado:** Cambio aplicado sobre versión vigente, solicitud cerrada con trazabilidad

**Relacionado:** CAP-CUR-058, CAP-CUR-009

### CAP-CUR-060: Aplicar cambios macrocurriculares en nueva versión

**Actores:** Coordinador, Director | **Prioridad:** Should

Al crear una nueva versión de un plan o programa (CAP-CUR-002 / CAP-CUR-018), el sistema presenta las solicitudes macro aprobadas pendientes como checklist de cambios a implementar. El coordinador implementa los cambios en la nueva versión. Al aprobar y publicar la nueva versión, las solicitudes macro aplicadas se cierran formalmente con referencia a la versión donde se implementaron.

**Reglas de negocio:**

* Al crear nueva versión, se muestra el backlog de solicitudes macro aprobadas pendientes
* El coordinador marca cuáles se implementaron en la nueva versión
* Al publicar la nueva versión, las solicitudes marcadas se cierran como "Aplicada en versión \[código\]"
* Las solicitudes macro aprobadas no marcadas permanecen en el backlog para futuras versiones

**Resultado esperado:** Solicitudes cerradas con trazabilidad de versión, backlog actualizado

**Relacionado:** CAP-CUR-058, CAP-CUR-002, CAP-CUR-018

### CAP-CUR-061: Consultar backlog de mejora continua

**Actores:** Coordinador, Director, Comité de Currículo | **Prioridad:** Should

Consultar todas las solicitudes de cambio asociadas a un plan o programa, filtradas por estado (propuesta, en revisión, aprobada, rechazada, aplicada), tipo (micro/macro) y periodo. Permite priorizar y planificar el ciclo de mejora continua.

**Reglas de negocio:**

* Muestra contadores por estado y tipo
* Las solicitudes aplicadas muestran referencia a dónde se implementaron (versión actual si micro, versión específica si macro)

**Resultado esperado:** Vista de backlog filtrable con trazabilidad completa

**Relacionado:** CAP-CUR-057

---

## 1.11 Auditoría de workflows

### CAP-CUR-050: Log de transiciones de workflow

**Actores:** Sistema (automático) | **Prioridad:** Must

Registrar inmutablemente cada cambio de estado en planes de estudio, programas de curso y syllabi: quién ejecutó la transición, cuándo, de qué estado a cuál, con qué justificación.

**Reglas de negocio:**

* Los registros son inmutables (nunca se editan ni eliminan)
* Se genera automáticamente en cada transición de workflow

**Resultado esperado:** Registro de auditoría creado

**Relacionado:** CAP-CUR-009, CAP-CUR-019, CAP-CUR-035

---

# Versión
