---
id: SPEC-reassess-014
project: up1
type: doc
module: reassess
tags:
  - assessment
  - base-de-datos
  - mariadb
  - esquema
  - tablas
  - imp
  - duplicacion
  - volumetria
  - migracion
---

# 04 — Los Datos: Como Esta Organizada la Informacion

---

## El panorama

Toda la informacion que maneja uAssessment — desde los planes de estudio de una universidad hasta las notas de cada estudiante en cada evaluacion — vive en 162 tablas de una base de datos MariaDB. Estas tablas almacenan anos de datos de produccion de multiples instituciones.

Para entender el impacto de la migracion, no basta con saber que hay 162 tablas. Lo importante es entender **que representan, como se relacionan, y donde estan los puntos de fragilidad**.

## Los grandes dominios de datos

### Cursos y sus contenidos (13 tablas)

Un curso en uAssessment no es solo un nombre y un codigo. Es una estructura compleja que incluye:
- Datos generales (nombre, codigo, creditos, modalidad)
- Unidades de contenido (los temas que se ensena)
- Componentes de evaluacion (como se evalua: pruebas, trabajos, proyectos)
- Referencias bibliograficas
- Resultados de aprendizaje esperados
- Estrategias de ensenanza
- Recursos necesarios
- Sesiones planificadas
- Control de versiones
- Coordinadores y revisores asignados

Cada una de estas dimensiones tiene su propia tabla. Cuando un coordinador edita un programa de curso, en realidad esta tocando 5-10 tablas simultaneamente.

### Secciones y syllabus (8 tablas)

Cuando un docente toma un curso en un periodo, crea una "seccion" — su version personalizada del programa. El syllabus hereda la estructura del curso pero permite ajustes.

**Aqui esta el primer problema estructural**: las tablas de seccion son **casi identicas** a las de curso. Hay `imp_course_evaluationcomponents` (99,000 filas) y `imp_section_evaluationcomponents` (799,000 filas). Hay `imp_course_references` (60,000) y `imp_section_references` (396,000). La misma estructura, duplicada.

Esto significa que cualquier cambio en la forma de almacenar evaluaciones o referencias debe hacerse en dos conjuntos de tablas. Si se agrega un campo a la evaluacion del curso, hay que agregarlo tambien a la evaluacion de la seccion. En la practica, esta duplicacion ha generado inconsistencias: campos que existen en curso pero no en seccion, o al reves.

En uP1, esto se resuelve con un unico objeto que tiene herencia configurable: el programa de curso define la estructura base y el syllabus hereda automaticamente, con control de que puede modificar el docente.

### Competencias (13 tablas)

El modelo de competencias es, ironicamente, **una de las mejores partes del esquema**. Esta bien normalizado:

1. **Matrices de competencias** (`imp_competency_sets`): Agrupan competencias por programa o por facultad.
2. **Competencias** (`imp_competencies`): Cada competencia dentro de una matriz.
3. **Niveles de logro** (`imp_competency_levels`): Para cada competencia, que niveles existen (introductorio, intermedio, avanzado).
4. **Umbrales** (`imp_competencylevel_thresholds`): Que porcentaje o puntaje se necesita para alcanzar cada nivel.
5. **Tributacion** (`imp_courses_competencies`): Que cursos contribuyen a que competencias.
6. **Vinculacion RA↔competencia**: A nivel de curso (`imp_competencylevel_courseoutcomes`) y a nivel de seccion (`imp_competencylevel_sectionoutcomes`).

Este modelo es lo que permite que el sistema pueda decir "el estudiante X ha alcanzado el 73% del nivel intermedio en Pensamiento Critico". Es tambien lo que permite generar los heatmaps de tributacion (que cursos cubren que competencias).

**Para la migracion**: Este modelo se puede mapear casi directamente a los objetos del Object Manager de uP1. Es una buena noticia.

### La tabla que controla tres mundos

`imp_program_structure` es una sola tabla que define como se comportan los campos y la jerarquia para tres areas distintas del sistema:
- Como se estructura un plan de estudio
- Como se estructura un programa de curso
- Como se estructura un syllabus

Cuando una universidad quiere agregar un campo personalizado a su syllabus (por ejemplo, "Metodologia STEM"), ese cambio se configura en esta tabla. Pero como la tabla controla los tres dominios, un cambio descuidado puede afectar como se ven los planes de estudio o los programas de curso.

En uP1, cada dominio tiene su propia definicion de objeto (JSON independiente), eliminando este acoplamiento.

### Historial, workflow y catalogos

El sistema registra cambios en `imp_changes_history`, trackea procesos de clonacion en `imp_cloning_execution`/`imp_cloning_log`, y tiene tablas de configuracion de workflow (`imp_workflow_concepts`). Los catalogos (tipos de evaluacion, estrategias de ensenanza, modos de calificacion) suman otras 11 tablas.

## Volumetria: donde estan los datos pesados

| Tabla | Filas | Que representa |
|-------|-------|---------------|
| `imp_section_evaluationcomponents` | 799,000 | Cada evaluacion de cada seccion de cada syllabus |
| `imp_section_references` | 396,000 | Cada referencia bibliografica de cada seccion |
| `imp_course_evaluationcomponents` | 99,000 | Evaluaciones a nivel de programa de curso |
| `imp_course_references` | 60,000 | Referencias a nivel de programa |
| `imp_references` | 59,000 | Catalogo de referencias bibliograficas |
| `imp_courseunit_contents` | 46,000 | Contenidos de cada unidad de cada curso |
| `imp_course_units` | 41,000 | Las unidades/modulos de cada curso |
| `imp_course_data` | 25,000 | Los cursos mismos |

Las tablas de seccion son **8x mas grandes** que las de curso porque cada curso puede tener muchas secciones (una por docente, por periodo). Esta proporcion importa para la migracion de datos.

## Lo que importa para uP1

### Migracion de datos
- Las 162 tablas deben mapearse a objetos del Object Manager. Los catalogos son directos. Las estructuras complejas (curso, seccion, competencias) requieren definicion cuidadosa del esquema JSON.
- La volumetria (799k filas en la tabla mas grande) requiere importacion asincrona usando el sistema de tareas de uP1 (importInstances con threshold de 500 filas).

### Modelo que se preserva
- La jerarquia de competencias se mapea bien a los objetos de uP1.
- Los catalogos se convierten en objetos base compartidos.

### Modelo que cambia
- La duplicacion curso/seccion se elimina con herencia configurable.
- `imp_program_structure` se reemplaza por definiciones JSON independientes.
- MariaDB se reemplaza por PostgreSQL con aislamiento por tenant.
