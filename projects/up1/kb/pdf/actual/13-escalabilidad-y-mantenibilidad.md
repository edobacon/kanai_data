---
id: SPEC-reassess-023
project: up1
type: spec
module: reassess
tags: [assessment, escalabilidad, mantenibilidad, eval, god-object, monolito, plantillas, clonacion, permisos, 56-clientes]
relates: []
clients: [stotomas, ust-cft, upc, anahuac, uniandes]
modules: [improve-api, structure-helper]
risk: very-high
---
# 13 — Escalabilidad, Mantenibilidad y Acoplamiento

Este documento analiza la capacidad del sistema actual para crecer, adaptarse y mantenerse. Identifica que logicas estan tan unificadas o acopladas que dificultan su gestion, como afecta esto al assessment actual, y que debe considerarse en la migracion — especialmente en relacion con lo que detecta el informe ReAssess.

---

## La pregunta fundamental

Cuando una universidad nueva quiere usar uAssessment con su propia terminologia, sus propios flujos de aprobacion, sus propios reportes y sus propias reglas de negocio, **que tiene que cambiar en el sistema?**

La respuesta actual es: mas de lo que deberia. Y ese "mas de lo que deberia" explica directamente varios de los dolores que el informe ReAssess detecta.

---

## 1. El motor de formularios dinamicos: potente pero fragil

### Que es

El corazon de uAssessment es un motor que genera formularios dinamicos. Cuando un coordinador abre un plan de estudio, un docente abre un syllabus, o un revisor abre un programa de curso, lo que ven no es un formulario fijo — es un formulario construido en tiempo real leyendo una tabla de configuracion (`imp_program_structure`).

Este motor permite que cada universidad defina que campos quiere en cada tipo de documento. Una universidad puede necesitar un campo "Metodologia STEM" en el syllabus que otra no. El motor lo hace posible sin cambiar codigo.

### Como funciona por dentro

Un archivo de 5,123 lineas (`structure.helper.js`) se encarga de todo:

1. Lee la configuracion de estructura de la BD (que campos hay, en que orden, de que tipo, que servicio los alimenta)
2. **Construye strings de codigo JavaScript** que representan llamadas a funciones de modelo
3. **Ejecuta esos strings con `eval()`** para obtener los datos de cada campo
4. Organiza los resultados en un arbol jerarquico
5. Devuelve el JSON que el frontend renderiza como formulario

El paso 3 es el mas problematico. `eval()` ejecuta texto como codigo — es un mecanismo poderoso pero peligroso. Hace imposible que herramientas de analisis estatico entiendan que funciones se estan llamando, dificulta el debugging (el stacktrace apunta a "eval" en vez de a la funcion real), y abre una superficie de seguridad si alguna entrada no esta sanitizada.

### Por que esto importa para el negocio

**Lo que el informe ReAssess detecta como "rigidez"** (pag. 11 — la herramienta no se adapta a cada universidad) tiene esta raiz tecnica: el motor de formularios ES configurable, pero la configuracion es tan compleja que solo el equipo tecnico de uPlanner puede modificarla. El "Super Admin" que propone el informe necesitaria una interfaz amigable sobre este motor, y la complejidad interna del motor hace que crear esa interfaz sea un proyecto mayor.

**Lo que el informe detecta como "falta de personalizacion"** tiene una segunda raiz aqui: agregar un nuevo tipo de campo (por ejemplo, un campo que muestre un mapa, o un selector de taxonomia Bloom) requiere modificar este archivo de 5,000+ lineas en al menos 4 funciones diferentes. No hay un patron de extension (plugin, strategy, registry) que permita agregar tipos sin tocar el motor.

### Como lo resuelve uP1

El Layout Engine de uP1 reemplaza este motor con un enfoque diferente: los formularios se definen como JSON declarativo (layout configs), los tipos de campo estan definidos como componentes Vue registrados (atoms), y el LayoutOrchestrator instancia el componente correcto segun la configuracion. Agregar un nuevo tipo de campo = registrar un nuevo componente. No hay `eval()`, no hay strings de codigo, no hay archivo monolitico.

---

## 2. Los servicios monoliticos: todo en un lugar

### El patron actual

Cada area funcional tiene un "service" que maneja todos los endpoints de punta a punta. El service de syllabus tiene 47 funciones en 2,302 lineas. El de competencias tiene 30 funciones en 1,897 lineas. El de reportes tiene 35 funciones en 3,880 lineas.

Estos servicios reciben directamente el request HTTP (`req`) y producen la respuesta HTTP (`res`). No hay una capa intermedia de logica de negocio separada del transporte. Si quisieramos llamar la logica de "obtener competencias de una seccion" desde otro modulo (por ejemplo, desde un reporte), no podemos reutilizar la funcion del service porque esta acoplada al ciclo request/response.

### Las consecuencias concretas

**Para agregar un endpoint nuevo** en syllabus, hay que modificar `syllabus_service.js` (2,302 lineas). No hay forma de agregar funcionalidad sin tocar ese archivo. Si dos desarrolladores trabajan en features diferentes de syllabus, van a tener conflictos de merge constantemente.

**Para testear la logica de negocio**, hay que mockear `req` y `res` — los objetos de Express. No se puede testear "dado este syllabus, cual es su estado de competencias" sin simular una peticion HTTP completa.

**El manejo de errores es inconsistente**. Las funciones mas antiguas "tragan" los errores silenciosamente — devuelven `{status: false}` sin loguear nada. Las funciones mas nuevas usan `Sentry.captureException()`. Pero coexisten en el mismo archivo, y un desarrollador nuevo no sabe cual patron seguir.

### Como conecta con el informe ReAssess

**Lo que el informe detecta como "desconfianza y problemas de confiabilidad"** (pag. 11) tiene conexion directa con este patron. Cuando un error se "traga" sin log, nadie se entera hasta que un usuario reporta que algo no funciona. Y cuando lo reporta, no hay traza para diagnosticar que paso. El ciclo de "el problema se reporta → el consultor lo escala → el equipo no tiene informacion → se demora la resolucion" (dolor #5 del informe) se amplifica porque el sistema no registra sus propios errores de forma sistematica.

### Como lo resuelve uP1

En uP1, la logica de negocio vive en los resolvers GraphQL de cada mod. Cada resolver es una funcion pura que recibe argumentos tipados y devuelve datos. No hay acoplamiento con el transporte HTTP. Los errores se propagan automaticamente a traves del framework GraphQL con mensajes estructurados. Y cada mod tiene su propia carpeta — no hay archivos de 2,000+ lineas compartidos.

---

## 3. La personalizacion por cliente: 56 clientes, 56 realidades

### El estado actual

uAssessment sirve a **56 universidades** que tienen sus propias plantillas de reportes. Cada una tiene una carpeta en `report-templates/` con archivos Word (.docx) que definen como se ve el reporte de syllabus, el programa de curso y el plan de estudio cuando se descargan.

Ademas de las plantillas, hay **logica condicional por cliente en el codigo**. Por ejemplo, la Universidad Santo Tomas tiene una transformacion especial para codigos de curso que contienen guiones bajos o puntos. Esta logica esta directamente en el archivo de servicio — no en una configuracion externa.

La discriminacion por cliente se hace con tres mecanismos diferentes:
- **`clientTemplate`**: Variable de entorno que apunta a la carpeta de plantillas
- **`clientName`**: Variable de entorno para condicionales en el codigo
- **`institutionId`**: ID de base de datos para filtrar datos academicos

### Las consecuencias concretas

**Escalar a un nuevo cliente** implica: crear una carpeta de plantillas, verificar si el nuevo cliente necesita alguna logica especial, y si la necesita, agregar un `if (clientName === 'nuevo')` en los archivos de servicio. No hay una forma declarativa de definir reglas por cliente.

**Modificar un reporte para un cliente** requiere deployment. Un consultor no puede cambiar el formato del reporte de UPC sin que un desarrollador modifique la plantilla .docx y despliegue una nueva version del sistema.

**No hay aislamiento entre clientes**. Las plantillas estan en el mismo directorio del servidor. Los condicionales por cliente estan en los mismos archivos de servicio. Un error en la logica de Santo Tomas podria, en teoria, afectar la generacion de reportes de otro cliente si el condicional esta mal construido.

### Como conecta con el informe ReAssess

Esto es exactamente el **dolor #1 (carga de datos costosa)** y el **dolor #3 (no se adapta a la institucion)**. El informe propone que las universidades puedan configurar su experiencia sin intermediarios. Pero hoy, hasta un cambio en el formato de un reporte requiere un ciclo de desarrollo.

La propuesta de **Curriculum Management como requisito minimo de entrada** (pag. 24 del informe) asume que los datos base estaran bien estructurados. Pero si cada universidad tiene su propia logica de transformacion de datos (como Santo Tomas con sus codigos), esa logica debe migrarse a un mecanismo configurable, no a mas `if/else` en el codigo.

### Como lo resuelve uP1

uP1 separa estas responsabilidades:
- **Plantillas de reporte** → Layouts JSON configurables por datos, no por archivos de codigo
- **Terminologia** → i18n con overrides por objeto/tenant/idioma, configurable sin deployment
- **Logica por cliente** → Reglas de negocio en resolvers del mod, configuracion por tenant en BD
- **Aislamiento** → Cada tenant tiene su propia base de datos PostgreSQL

---

## 4. Las dos cadenas de medicion: divergencia que no converge

### El problema de fondo

uAssessment tiene dos formas de medir logro de competencias (Graduation Profile y Milestone). Pero el problema no es que sean dos — es que **fueron construidas en momentos diferentes, por equipos diferentes, con patrones diferentes**, y nunca se integraron.

| Dimension | Graduation Profile | Milestone |
|-----------|-------------------|-----------|
| Niveles de logro | Configurables por universidad (en BD) | Hardcodeados en JavaScript (0-30-59-72-85-100%) |
| Fuente de notas | `asm_student_marks` (notas parciales) | Puntajes propios (`imp_milestone_*_scores`) |
| Exportacion Excel | Una libreria (`excelbuilderjs-node`) | Otra libreria (`exceljs`) |
| Patron de filtros | `FilterConfig` con cascada | Endpoints compartidos bajo ruta de un reporte especifico |
| Permisos | Doble validacion (frontend + backend) | Solo frontend (sin validacion backend) |
| Patron async | Promise chains | `async/await` |

### Las consecuencias concretas

**Un desarrollador nuevo** que necesita modificar un reporte de logro debe entender cual cadena usa ese reporte, que libreria de Excel aplica, que patron de permisos tiene, y que estilo de codigo se espera. No hay un "patron de reporte" unificado — hay dos mundos.

**Un producto manager** que quiere agregar un indicador nuevo (por ejemplo, "porcentaje de estudiantes que mejoraron entre Hito 1 y Hito 2") debe decidir si lo implementa en la cadena Graduation o en la cadena Milestone. Si la respuesta es "en ambas", el esfuerzo se duplica.

**Una universidad** que quiere personalizar los rangos de logro de milestone no puede hacerlo — estan hardcodeados. Pero si puede personalizar los de Graduation. Esta asimetria es invisible para el usuario, que solo ve que "los reportes no responden a sus necesidades" (dolor #2 del informe).

### Como conecta con el informe ReAssess

El informe detecta que **"los indicadores no responden a necesidades analiticas"** (pag. 10) y que **"en competencias, la reporteria se limita a mostrar asignaturas vinculadas, sin metricas de logro"** (pag. 10). Pero no identifica la causa raiz: no es que falten metricas — es que hay DOS sistemas de metricas que no se hablan, y ninguno de los dos es suficientemente configurable por si solo.

La propuesta del informe de **reporteria personalizable por rol** (pag. 21) asume un sistema unificado de medicion. La realidad es que primero hay que unificar las dos cadenas antes de poder ofrecer personalizacion sobre ellas.

---

## 5. La clonacion masiva: escalabilidad con fragilidad

### El problema de fondo

Al inicio de cada periodo, las universidades necesitan clonar cientos de syllabus. El sistema tiene un mecanismo para esto, pero fue construido con limitaciones que se manifiestan a escala.

### Como funciona

La clonacion masiva es un proceso "fire-and-forget": el usuario lanza la operacion, el servidor responde "lo estoy procesando", y el estado se guarda **en la memoria del proceso de Node.js**. El usuario puede consultar el estado con un endpoint separado.

El problema es triple:

1. **Sin rollback**: Antes de clonar, el sistema deshabilita TODOS los syllabus destino. Luego clona uno por uno. Si falla en el syllabus 150 de 300, los primeros 150 estan clonados y los 300 originales estan deshabilitados. No hay forma automatica de volver atras.

2. **Estado en memoria**: Si el servidor se reinicia (un deploy, un error, un scaling event), el estado de la clonacion se pierde. El usuario no sabe si termino, fallo o quedo a medias.

3. **Incompatible con multiples instancias**: Si hay dos instancias del servidor (comun en produccion con load balancer), la instancia que recibe la consulta de estado puede no ser la que esta ejecutando la clonacion. El usuario ve "no hay clonacion en progreso" cuando en realidad la otra instancia la esta procesando.

### Como conecta con el informe ReAssess

El informe no menciona la clonacion directamente, pero detecta que **"la carga de datos es manual y costosa"** (dolor #1). La clonacion es una forma de carga — copiar datos de un periodo a otro. Que esta operacion critica no tenga rollback ni estado persistente explica parte de la "desconfianza" que las universidades sienten.

Ademas, el informe propone que las universidades tengan **mas autonomia** (dolor #5). Pero darle a un Super Admin la capacidad de lanzar clonaciones masivas sin que el sistema garantice atomicidad es un riesgo operacional.

### Como lo resuelve uP1

uP1 tiene un sistema de tareas asincronas basado en BullMQ (Redis) donde el estado se persiste fuera del proceso. Las tareas tienen tracking de progreso, manejo de errores por item, y la capacidad de reiniciarse si el proceso se cae. La clonacion asincrona configurable (BR-VER-002) usa este mecanismo.

---

## 6. Los permisos: 9 caminos para llegar al mismo dato

### El problema de fondo

La logica de permisos de uAssessment se resuelve **dentro de las queries SQL**. Para determinar si un usuario puede ver un syllabus, el sistema ejecuta una consulta con **9 ramas UNION** que cubren cada tipo posible de relacion entre el usuario y la seccion:

1. Es el profesor principal de esta seccion?
2. Es profesor asistente?
3. Es coordinador de la seccion?
4. Es estudiante inscrito?
5. Es admin con acceso a la seccion especifica?
6. Es admin con acceso al curso de esta seccion?
7. Es admin con acceso a la unidad academica del curso?
8. Es admin con acceso a la facultad de la unidad academica?
9. Es admin con acceso a la carrera o pensum de la facultad?

Esta misma logica se repite (con variaciones) en los modelos de syllabus, planes de estudio, competencias y reportes. Cada modulo tiene su propia version de esta query de permisos, con sus propias tablas y sus propias ramas.

### Las consecuencias concretas

**Para agregar un nuevo nivel jerarquico** (por ejemplo, "departamento" entre facultad y unidad academica), hay que modificar las queries de permisos en **cada modulo**. No hay un servicio de permisos centralizado — la logica esta incrustada en el SQL de cada modelo.

**Para auditar quien tiene acceso a que**, hay que leer y entender queries SQL de 9 ramas con 15-18 tablas cada una. No hay un lugar unico donde consultar "que permisos tiene el usuario X".

**El rendimiento depende del tamano de la jerarquia**: Universidades con muchas facultades, carreras y unidades generan queries de permisos mas pesadas porque cada rama hace JOINs con mas datos.

### Como conecta con el informe ReAssess

El informe detecta **"rigidez de roles"** (pag. 11) — la herramienta no se adapta a las jerarquias institucionales. La raiz tecnica es esta: las jerarquias de permisos estan hardcodeadas como ramas SQL, no como configuracion. Si una universidad tiene una jerarquia diferente (por ejemplo, "escuela" en vez de "facultad"), el SQL no se adapta.

### Como lo resuelve uP1

El Object Manager de uP1 tiene un sistema RBAC centralizado con contextos jerarquicos (`/system > /tenant > /institution`). Los permisos se resuelven en una sola capa (el middleware del Object Manager), no en cada query. Agregar un nivel jerarquico o cambiar la estructura de permisos es un cambio de configuracion, no de SQL.

---

## 7. Lo que SI escala bien

No todo es negativo. Hay decisiones de diseno que demuestran capacidad de escalar:

### Catalogos desacoplados

Los 14 modulos de catalogos (idiomas, modalidades, metodos, estrategias, etc.) son independientes entre si. Agregar un nuevo tipo de catalogo es crear un nuevo modulo simple. No afecta a los demas.

### Workflows en base de datos

Los estados y transiciones de workflow se almacenan en BD, no en codigo. Agregar un nuevo estado o cambiar una transicion para un cliente no requiere deployment. Esto fue una buena decision de diseno.

### La jerarquia de competencias

El modelo de datos de competencias (matrices → competencias → niveles → umbrales → criterios) es limpio, normalizado y extensible. Se puede agregar un nuevo nivel de profundidad o un nuevo tipo de criterio sin reestructurar tablas.

### Los reportes V2 con helpers puros

Dentro del archivo de 3,880 lineas de reportes, hay funciones helper puras (`processMarks`, `evaluateMarkLevel`, `extractSchemes`) que son reutilizables y testeables. Es el patron mas cercano a "buena arquitectura" que tiene el sistema.

### FilterConfig

El framework de filtros en cascada es declarativo y reutilizable. Cada reporte define su cadena de filtros sin reinventar la logica. Es un patron que demuestra que el equipo puede disenar abstracciones utiles — solo que no se aplico al resto del sistema.

---

## Resumen: que impacta la migracion

| Problema | Afecta al assessment actual | Consecuencia en migracion |
|----------|---------------------------|--------------------------|
| Motor de formularios con `eval()` | Imposible de auditar, dificil de extender | No migrar el motor — reemplazar con Layout Engine. Migrar solo la *configuracion* (que campos tiene cada universidad) |
| Servicios monoliticos (2,000-3,800 lineas) | Conflictos de merge, errores silenciosos, imposible de testear | No migrar la estructura — reimplementar como resolvers GraphQL del mod. Migrar la *logica de negocio* extraida de cada funcion |
| 56 clientes con plantillas y logica condicional | Cada cambio requiere deployment, no escala | Migrar plantillas como layouts JSON. Convertir logica condicional en configuracion por tenant |
| Dos cadenas de medicion divergentes | Datos inconsistentes, duplicacion de esfuerzo | Unificar antes de migrar. Definir una sola cadena con estrategias configurables |
| Clonacion sin rollback ni estado persistente | Riesgo de datos inconsistentes a escala | Reimplementar sobre BullMQ con estado en Redis y rollback |
| Permisos en SQL (9 ramas por modulo) | No auditable, no extensible, rendimiento variable | Reemplazar con RBAC centralizado. Documentar los 9 caminos como requisitos del nuevo sistema |
| `eval()` en dispatch de funciones | Superficie de seguridad, imposible de analizar estaticamente | Eliminar completamente en uP1 |

### La conexion con el informe ReAssess

| Dolor del informe | Causa tecnica de escalabilidad | En que documento se detalla |
|-------------------|-------------------------------|---------------------------|
| Carga de datos costosa | Sin ingesta, sin preview, clonacion fragil, 56 plantillas en codigo | Secciones 3 y 5 |
| Reportes insuficientes | Dos cadenas sin integrar, logica de niveles hardcodeada, 2 librerias de Excel | Seccion 4 |
| No se adapta a la institucion | Motor de formularios no extensible, permisos en SQL, personalizacion por `if/else` | Secciones 1, 3 y 6 |
| Desconfianza | Errores silenciosos, sin transacciones, clonacion sin rollback | Secciones 2 y 5 |
| Intermediarios y demoras | Toda configuracion requiere deployment, sin self-service | Seccion 3 |
