---
id: SPEC-reassess-015
project: up1
type: spec
module: reassess
tags: [assessment, logica-negocio, tributacion, workflow, competencias, reportes, milestone, clonacion, i18n]
modules: [improve-api, syllabus, competency-matrix, pensums, reports]
---
# 05 — Las Reglas del Juego: Logica de Negocio

Este documento explica las cinco areas de logica de negocio mas importantes de uAssessment, por que existen, como funcionan hoy, y donde estan los problemas.

---

## 1. Tributacion de competencias

### Que es y por que importa

La tributacion es el corazon del sistema. Es la relacion que responde: "este curso contribuye a desarrollar esta competencia, en este nivel". Sin tributacion, uAssessment es solo un gestor de documentos. Con tributacion, puede medir si el curriculo esta cumpliendo lo que prometio.

Por ejemplo: una universidad declara que sus egresados de Ingenieria deben tener "Pensamiento Critico" a nivel avanzado. La tributacion permite mapear que Calculo I aporta a nivel introductorio, Estadistica a nivel intermedio, y Proyecto de Titulo a nivel avanzado.

### Como funciona hoy

La tributacion opera en **dos niveles independientes**:

1. **A nivel de curso**: El coordinador define que competencias trabaja cada curso. Esto se almacena en `imp_courses_competencies` y es "la promesa" — lo que el programa dice que va a hacer.

2. **A nivel de seccion**: Cuando se crea el syllabus de una seccion especifica, se pueden vincular los resultados de aprendizaje de esa seccion con niveles de competencia. Esto es "la practica" — lo que realmente se esta evaluando.

**El problema critico**: Los vinculos del nivel de curso **no se propagan automaticamente al nivel de seccion**. Si un coordinador tributa un curso a "Pensamiento Critico" despues de que los docentes ya crearon sus secciones, las secciones no heredan esa tributacion. No hay reconciliacion. El sistema no avisa de esta desincronizacion.

Peor aun: existe un bug conocido (BUG-012, severidad alta) donde la funcion que actualiza vinculos puede dejar datos inconsistentes. Cuando un docente modifica la tributacion de su seccion, el sistema primero desactiva todos los vinculos existentes y luego intenta crear los nuevos. Si algo falla en la creacion, los vinculos quedan desactivados sin reemplazo. El docente no recibe error, pero los datos de tributacion desaparecieron silenciosamente.

### Que cambia en uP1

uP1 implementa herencia automatica del programa de curso al syllabus, con control de sincronizacion (BR-MIG-001). Los vinculos se propagan automaticamente. Ademas, las operaciones usan transacciones de base de datos que garantizan que o se completa todo o no se cambia nada.

---

## 2. Workflows de aprobacion

### Que es y por que importa

Los planes de estudio, programas de curso, syllabus y matrices de competencias no se publican de golpe. Cada uno pasa por un flujo de aprobacion: un docente crea y edita, un revisor verifica, un director aprueba, y finalmente se publica como version vigente. Este flujo es lo que garantiza la calidad del contenido curricular.

### Como funciona hoy

Cada universidad puede configurar su propio flujo. Algunas tienen 3 pasos (crear → revisar → publicar), otras tienen 6 (crear → editar → enviar → revisar → aprobar → publicar). Los estados y las transiciones entre ellos se almacenan en la base de datos, no en el codigo — lo cual es una buena decision de diseno.

El sistema determina que transiciones puede hacer un usuario segun su rol. Un docente puede "enviar a revision" pero no puede "aprobar". Un director puede "aprobar" pero no necesariamente puede "editar".

Los cambios de estado pueden llevar comentarios asociados: un revisor puede rechazar un syllabus con un mensaje explicando que falta.

### Que funciona bien

- El modelo es flexible y desacoplado del codigo.
- Permite que cada universidad tenga su propio flujo sin cambios tecnicos.
- Los conteos de estado por tipo funcionan bien para dashboards ("15 syllabus en revision, 8 aprobados, 3 rechazados").

### Que esta mal

- Las matrices de competencias tienen un endpoint dedicado para transiciones de estado, mientras que las demas entidades usan un mecanismo generico. Esta inconsistencia genera confusion en el mantenimiento.
- No hay auditoria inmutable: el historial de cambios existe pero no garantiza integridad. Es posible que un registro se modifique sin dejar traza.
- Como cada universidad tiene su propia configuracion de workflow, es dificil testear genericamente. Lo que funciona para UPC puede no funcionar para Uniandes.

### Que cambia en uP1

uP1 preserva el concepto de workflows configurables pero agrega auditoria inmutable (cada transicion queda registrada y no se puede modificar), control de acceso por workflow, y proteccion contra cambios cuando hay estudiantes activos asociados.

---

## 3. Reportes y medicion de logro

### Que es y por que importa

Los reportes son la razon por la que una universidad invierte en uAssessment en lugar de usar Excel. La promesa es: "carga tu curriculo, vincula tus competencias, y el sistema te dira si tus estudiantes estan logrando lo que prometiste". Esta es la funcionalidad que las agencias acreditadoras quieren ver.

### Como funciona hoy

El sistema tiene **dos cadenas de medicion de logro** que coexisten sin integrarse:

**Cadena "Graduation"**: Toma las calificaciones de los estudiantes, las cruza con la tributacion de competencias, y calcula un porcentaje de logro por competencia. Necesita saber a que plan de estudio pertenece el estudiante para poder agrupar por competencia del perfil de egreso. Vive en las tablas `asm_student_marks`.

**Cadena "Milestone"**: Funciona diferente. Define "hitos" de evaluacion a lo largo de la carrera (por ejemplo, "al terminar el 4to semestre, el estudiante debe alcanzar nivel intermedio en Comunicacion"). Cada hito tiene sus propios criterios, intentos y puntuaciones agregadas. No necesita referencia al plan de estudio — trabaja directamente con resultados de aprendizaje. Vive en las tablas `imp_milestone_*`.

**Por que es un problema**: Un director de carrera que quiere saber "como van mis estudiantes en competencias" puede obtener respuestas diferentes dependiendo de que reporte mire. Graduation le dira una cosa, Milestone otra. No hay una vista unificada.

Ademas, la consulta mas critica de la cadena Graduation (`_getEvaluationMarks`) cruza 12 tablas en una sola operacion SQL. Su rendimiento depende del volumen de datos del cliente, y con universidades grandes puede ser lenta.

### El problema de los reportes por cliente

Hay mas de 40 plantillas de reportes especificas por universidad almacenadas en el codigo fuente del sistema. Esto significa que cuando UPC necesita un reporte de "avance de syllabi por facultad" con un formato especifico, un desarrollador crea una plantilla para UPC y la incluye en el codigo. Si UPC quiere cambiar un campo, hay que modificar el codigo y desplegar.

Esta decision se tomo probablemente por rapidez, pero escala muy mal: cada nuevo cliente agrega mas plantillas, el codigo crece, y el riesgo de que un cambio para un cliente afecte a otro aumenta.

### Que cambia en uP1

uP1 unifica la medicion de logro en una sola cadena con tres capas (seccion → estudiante → agregacion), elimina las plantillas hardcodeadas reemplazandolas con configuracion por datos (layouts JSON), y agrega Report Builder con tablas pivot que el usuario puede personalizar sin intervenir en el codigo.

---

## 4. Herencia y clonacion

### Que es y por que importa

Al inicio de cada periodo academico, una universidad necesita que los 300+ syllabi del semestre anterior se "clonen" al nuevo periodo. Cada docente recibe su syllabus pre-cargado con la estructura del programa de curso y puede personalizarlo para su seccion.

### Como funciona hoy

Existen **dos mecanismos de clonacion diferentes** para operaciones conceptualmente identicas:

- **Syllabus**: Usa una funcion de clonacion masiva asincrona que copia todas las secciones de un periodo a otro, con tracking del proceso.
- **Programas de curso**: Usa un mecanismo diferente con su propia interfaz de seguimiento.

Ambos funcionan, pero la inconsistencia dificulta el mantenimiento y confunde a los desarrolladores.

La clonacion masiva de syllabus no tiene rollback: si el proceso falla a mitad (por ejemplo, al clonar la seccion 150 de 300), las primeras 150 quedan clonadas y las restantes no. No hay forma automatica de deshacer o reintentar solo las fallidas.

### Que cambia en uP1

uP1 unifica clonacion y versionamiento bajo un patron consistente con cadena de versiones, clonacion asincrona configurable, y rollback mediante el sistema de tareas de BullMQ.

---

## 5. Capa de lenguaje y personalizacion

### Que es y por que importa

Cada universidad tiene su propia terminologia. Lo que UPC llama "plan de estudios", Uniandes llama "pensum". Lo que Anahuac llama "materia", UST-CFT llama "asignatura". El sistema debe adaptarse al lenguaje de cada institucion sin cambiar su logica.

### Como funciona hoy

uAssessment tiene un sistema de traducciones (`lang/`) que permite definir textos por idioma y por cliente. Funciona — los textos se muestran segun la configuracion del usuario.

**Pero no es self-service**: Para cambiar una etiqueta, alguien debe modificar un archivo JSON en el repositorio de traducciones, hacer commit y desplegar. El "Super Admin" que propone el informe ReAssess (alguien en la universidad que pueda cambiar terminologia sin abrir un ticket) no existe hoy.

### Que cambia en uP1

uP1 implementa i18n con jerarquia de resolucion que permite overrides por objeto, layout, institucion, pais e idioma. Las traducciones se pueden configurar sin deployment, y el theming CSS permite personalizar colores, logos y estilos por tenant.
