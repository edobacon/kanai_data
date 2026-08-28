---
id: TRANSCRIPT-2026-05-06-sync-uP1-learning-assessment
project: up1
type: transcript
module: curriculum-design
tags:
  - curriculum-design
  - sync
  - sprint-review
  - workflow-design
  - bailey
  - pdf
---

# Reunion 2026-05-06 — Sync semanal team uP1 Learning Assessment

> Transcripcion generada por Gemini Notes a partir del audio. Puede contener
> errores de speech-to-text. El verbatim diario-por-dia (## Transcripcion verbatim)
> se conserva integro como fuente de verdad para las decisiones que la
> referencien. Para preservar el PDF original de Gemini, subir a
> `2026-05-06-sync-uP1-learning-assessment.attachments/` y declarar en
> `attachments` del frontmatter.

## Contexto

Sync semanal del equipo Learning Assessment uP1. Eduardo presenta avances del
CRUD de curriculum-design (componente custom, edicion/visualizacion, dark mode).
Esteban presenta el modelo de objetos para flujos de trabajo (workflow object
model) que se viene en proximo sprint. Juan reporta avance en Bailey (instalacion
2 comandos) y en PDFs para UP1 core. Pre-planning programada para el dia
siguiente.

## Notas Gemini — Resumen

La reunion abordo la integracion de flujos de trabajo en UP1 y avances en
componentes visuales.

**Implementacion de flujos trabajo.** Se definio la estructura de estados,
transiciones y registros historicos para flujos institucionales. Se determino que
los objetos de negocio no utilizaran prefijos para asegurar su integracion en el
modelo global.

**Avances en interfaz.** Se integraron componentes para la edicion de
evaluaciones, validaciones de porcentaje y soporte para modo oscuro. El equipo
acordo priorizar la capacidad de adaptar nombres de pestañas segun el tipo de
registro.

**Despliegue y herramientas.** Se simplifico la instalacion de Bailey para la
gestion de objetos. Se decidio presentar esta herramienta durante la revision del
sprint como una funcionalidad destacada.

## Notas Gemini — Proximos pasos

- **[Esteban Cortes Sandoval, El grupo] Planificar Sprint:** sesion mañana en la
  mañana; revisar backlog y logros del sprint actual; definir los siguientes
  pasos para el proximo sprint.
- **[Eduardo Bacon] Ajustar Componente:** incorporar comentarios sobre capa de
  lenguaje y ajustes visuales al componente custom. Realizar QA y documentacion
  de los elementos del componente.
- **[Juan Diego Galdames] Documentar Libreria:** compartir el nombre de la
  libreria y las alternativas de las herramientas de generacion de PDF.
- **[El grupo] Preparar Review:** revisar el discurso de presentacion para la
  reunion del viernes. Planificar la demostracion del CRUD, navegacion local, y
  Bailey como el One More Thing.
- **[Juan Diego Galdames] Registrar Flujo:** anotar el problema identificado
  sobre el flujo de visualizacion y edicion en UP1 core.
- **[Juan Diego Galdames] Compartir Bailey:** enviar la herramienta Bailey a
  Claus para que la revise y pueda dar retroalimentacion.
- **[Juan Diego Galdames] Actualizar Nombres:** agregar Programa de asignatura y
  Referencia bibliografica al JSON de capa de lenguaje. Usar estos nombres
  temporales para Academic Activity y Bibliografia.
- **[Juan Diego Galdames] Anotar Requisito:** documentar la necesidad de asociar
  nombres de pestañas a Record Types. Mirar esta capacidad al desarrollar
  funcionalidades de records.

## Notas Gemini — Detalles

- **Revision de Flujos de Trabajo y Objetos Propuestos** (00:00:00): Esteban
  Cortes Sandoval reviso el trabajo reciente, que incluyo conversaciones sobre
  ajustes menores a los objetos de UP1. Se propuso cambiar el nombre del objeto
  "Academic Activity" a solo "Activity" porque tambien podria incluir actividades
  no academicas. Esteban presento los objetos diseñados para representar flujos
  de trabajo (workflows), que seran necesarios en varias funcionalidades de UP1,
  como Inurance y Booking.
- **Estructura del Objeto Workflow** (00:00:00, 00:01:58): el concepto de flujo
  de trabajo se basa en tener estados con categorizaciones especificas para
  controlar las acciones posibles. Los cuatro estados de categoria
  predeterminados son: `workflow status` (que define estados por institucion con
  codigo, nombre y categoria), `workflow` (que define el alcance y las
  transiciones, con posibles alcances para planes de estudio o cursos), y
  `workflow transition` (que asocia el flujo, el estado de inicio y el estado de
  termino).
- **Capacidades y Flexibilidad del Flujo de Trabajo** (00:03:26): los flujos de
  trabajo pueden definirse a nivel institucional e incluir metadatos como una
  descripcion, si es el flujo predeterminado y un estado (diseño, listo o
  archivado). Este diseño permite a una institucion tener multiples flujos
  definidos para un mismo contexto (por ejemplo, cinco flujos para el curriculo),
  permitiendo seleccionar flujos mas especificos para ciertos casos.
- **Registro Historico de Transiciones (Workflow Log)** (00:04:46): el flujo de
  trabajo se utiliza para transicionar objetos como cursos o actividades. El
  objeto `workflow log` guarda el registro historico de las transiciones,
  incluyendo a que entidad se refiere (polimorfico), que transicion se aplico,
  quien la realizo, si dejaron un comentario y la fecha.
- **Necesidad de un Mantenedor Visual y Configuracion de Flujos** (00:06:00):
  Eduardo pregunto si el modelo incluiria un mantenedor visual para que los
  usuarios puedan crear, modificar e iterar etapas del flujo, a lo que Esteban
  confirmo que si, aunque se podria empezar con flujos predefinidos por el
  equipo. Cada institucion definira sus propios flujos. Eduardo sugirio revisar
  el formato de Jira para la resolucion visual de los flujos de trabajo.
- **Contextos y Alcances de los Flujos de Trabajo** (00:07:56, 00:09:10):
  Esteban y Juan confirmaron que la idea es que un flujo de trabajo sea
  "universal" pero que se pueda aplicar a diferentes contextos (alcances), como
  la gestion de planes o la gestion de programas de curso. Se debe resolver como
  un plan de estudio se asocia a un flujo especifico, siendo posible que
  diferentes grupos de estudio (por ejemplo, por facultad) utilicen flujos
  distintos.
- **Cambios en los Objetos para Integracion del Flujo de Trabajo** (00:10:17):
  la implementacion de los flujos de trabajo implica un cambio en el objeto
  `Academic Activity`, donde el estado, que actualmente es un campo directo,
  pasara a ser una referencia al nuevo flujo. Otros cambios incluyen hacer que
  `execution unit` sea parte del `record type`, e incluir el campo
  `governance unit ids` para diferenciar entre la entidad que diseña y la que
  ejecuta una actividad.
- **Ubicacion y Definicion de Objetos Core y de Negocio** (00:12:11, 00:13:43,
  00:15:10): Juan aclaro que los objetos de los modulos, aunque sean considerados
  core para el negocio, deben crearse en el repositorio del modulo (mod). Al
  levantar UP1 y hacer un sync, los objetos se copian al repositorio de UP1, y
  luego se debe hacer un pull request al Object Manager. Se debe evitar la
  confusion de los objetos core de negocio con los objetos core de funcionamiento
  abstracto de UP1.
- **Convencion de Nombres de Objetos sin Prefijo de Modulo** (00:16:21,
  00:17:41): Eduardo pregunto si los objetos de negocio deberian llevar un
  prefijo de modulo (como 'CD' para Curriculum Design), de manera similar a como
  se hacia en la Suite Legacy. Se concluyo que los objetos no deberian llevar
  prefijos, ya que estan destinados a ser parte del modelo de datos general de
  UP1 y disponibles para todos los modulos.
- **Avance en la Interfaz de Curriculum Design (CRUD)** (00:18:31, 00:20:01):
  Eduardo presento avances en el desarrollo del CRUD para Curriculum Design,
  incluyendo ajustes para creacion y edicion de elementos. Se ajusto la vista con
  pestañas y se implemento una funcionalidad opcional para validar que la suma
  de porcentajes de elementos hijos sea del 100%. Tambien se habilito la
  visualizacion y edicion de texto enriquecido (HTML).
- **Flujo de Edicion y Visualizacion en UP1** (00:23:01, 00:30:09, 00:31:18):
  se discutio el flujo de edicion en UP1, donde se debe salir del modo de
  visualizacion para ingresar al modo de edicion. Juan sugirio que una
  funcionalidad core para UP1 podria ser incluir una opcion de cambio rapido a
  modo de edicion dentro de la vista de detalle. Este cambio mejoraria la
  experiencia del usuario, ya que el flujo actual es mas tedioso.
- **Interaccion con Componentes Hijos en Modo Edicion** (00:27:48, 00:28:59):
  Eduardo explico que, al entrar en modo de edicion, los componentes hijos (como
  las tablas) ganan la capacidad de editar, lo que permite modificar y crear
  registros dentro de las pestañas. Sin embargo, la creacion de registros
  deberia considerarse una variante de modificacion y, por lo tanto, estar
  dentro del modo de edicion para evitar confusion en la plataforma.
- **Configuracion del Componente de Secciones Personalizadas** (00:34:06,
  00:37:26): Esteban planteo una duda sobre la visualizacion de los campos de
  `content type` y `max length` en las secciones personalizadas (custom
  sections), argumentando que parecen ser campos de configuracion y no deberian
  ser manipulados por el usuario funcional en el formulario.
- **Componente de Arbol de Evaluaciones y Dark Mode** (00:37:26, 00:38:50):
  Eduardo presento el componente especifico del modulo para las evaluaciones,
  que permite agregar elementos raiz e hijos, editar, expandir/colapsar, y
  reordenar elementos mediante drag and drop. El componente valida la suma de
  porcentajes de los hijos y es compatible con el modo oscuro y claro de UP1.
- **Ajustes Visuales y Capa de Lenguaje (I18N)** (00:42:00, 00:43:16): Esteban
  solicito revisar un ajuste visual en el componente de evaluacion donde el
  titulo no aparecia correctamente dentro del rectangulo. Tambien se identifico
  la necesidad de aplicar capa de lenguaje a la referencia bibliografica para
  mostrar "programa de asignatura y referencia bibliograficas" en lugar de
  "Academy Activity".
- **Desafios en la Traduccion de Datos en Tablas** (00:44:20, 00:45:16):
  Eduardo y Juan confirmaron que actualmente no es posible aplicar capa de
  lenguaje a los valores de las instancias dentro de las tablas (por ejemplo,
  traducir valores enum como 'in person' o booleanos como 'true/false'). Se
  decidio mantener esos valores en ingles por ahora, ya que la capacidad de
  traduccion de valores de instancia esta en desarrollo.
- **Avance y Despliegue de Bailey** (00:45:16, 00:46:17, 00:48:04): Eduardo
  reporto que se completo una modificacion a la herramienta Bailey, facilitando
  su instalacion con solo dos comandos. Juan confirmo que ha podido ejecutar
  Bailey en su entorno de Windows y propuso que sea presentada en la review como
  una herramienta universal para la gestion de objetos y flujos.
- **Estrategia para la Presentacion de la Review del Sprint** (00:48:04,
  00:55:53): se acordo que Eduardo y Esteban coordinaran la presentacion del
  viernes, revisando el discurso el dia anterior. Se propuso que Bailey sea
  presentada como un "One More Thing", aludiendo al estilo de presentaciones de
  Steve Jobs, al final de la revision del sprint.
- **Avance en la Generacion de PDFs para UP1 Core** (00:50:18, 00:51:24,
  00:53:43): Juan comunico que ha estado trabajando en la habilitacion de la
  funcionalidad de descarga de PDFs para UP1 Core, lo cual es necesario para
  Assessment. La primera historia requiere generar una "foto" del listado de
  registros visibles en una tabla, respetando filtros y columnas. Se estan
  revisando alternativas de librerias para la generacion de PDF y la posibilidad
  de utilizar funciones lambda en AWS para evitar consumir recursos del Object
  Manager.
- **Planificacion del Proximo Sprint (Pre-Planning)** (00:54:30, 00:55:53): se
  programo una sesion de pre-planificacion para el dia siguiente. Se debe
  decidir si el proximo enfoque sera otra funcionalidad core o el desarrollo del
  dinamismo de los formularios.
- **Discusion de Traduccion de Nombres de Objetos** (00:57:50, 00:58:54): Juan
  pregunto sobre los nombres en ingles y español para "Academic Activity" y
  "bibliografia" para agregarlos a la capa de lenguaje. Se confirmo que la
  pestaña siempre mostrara el nombre del objeto, pero Esteban señalo la duda de
  si el nombre de la pestaña deberia ser mas especifico para el record
  utilizado, dado que un objeto como "Academic Activity" podria tomar nombres
  contextuales diferentes (e.g., "servicio" o "programa de asignatura")
  dependiendo de donde se use.
- **Diferenciacion de Pestañas por Tipo de Registro** (00:59:52, 01:00:50): el
  equipo discutio la necesidad de que la pestaña adapte su nombre al tipo de
  registro que esta mostrando. Juan sugirio que, para un mismo objeto con
  diferentes tipos de registros (e.g., estudiante y profesor), lo mas
  conveniente seria tener pestañas separadas para cada tipo de registro.
- **Cambios en la Estructura de Usuarios (Core User)** (01:00:50, 01:01:52):
  Esteban menciono que, segun una reunion previa, los usuarios (estudiantes,
  administrativos e instructores) podrian ser diferenciados en objetos distintos
  en lugar de tipos de registro dentro del objeto core user. Esto se debe a la
  necesidad de tener datos de personas (como estudiantes) para ciertas
  aplicaciones (e.g., Access para metricas de egreso) sin que necesariamente
  sean usuarios del sistema.
- **Nombres Provisionales para la Demostracion** (01:01:52): para el proposito
  de la demostracion, Esteban sugirio utilizar temporalmente "programa
  asignatura" para "Academic Activity" y "referencia bibliografica" para el otro
  objeto. Juan se comprometio a agregar estos nombres al archivo JSON por el
  momento.

## Transcripcion verbatim

> Generada por ordenador. Puede contener errores de speech-to-text.

### 00:00:00 — Apertura: review + objetos workflow

**Esteban Cortes Sandoval:** Ya lo mio de review lo que hemos estado es cortito.
Yo mas que nada estuve trabajando en el Bueno, hemos tenido conversaciones con
el resto del equipo respecto a temas de objetos que son ajustes eh menores que
yo creo que vamos a tener que hacer al a lo que hemos trabajado. En particular,
por ejemplo, creo que le vamos a cambiar el nombre al objeto de Academic
Activity, porque tambien pueden haber actividades que no son academicas que
caigan dentro de ese objeto. Entonces, probablemente se pasa a llamar solamente
activity, pero son ajustes, como digo, y yo tuve lo que publique como ayer o
antes de ayer, respecto eh a los objetos como para los flujos de trabajo. que
los voy a mostrar rapidamente. Ahi deberian pronto estar viendo. Ya.

**Eduardo Bacon:** F.

**Esteban Cortes Sandoval:** Entonces, la idea de estos objetos, ¿cierto? puede
representar flujos de trabajo. Como habiamos conversado, esos flujos de trabajo
podrian darse en distintas funcionalidades de UP1, en particular las requieren
todos los modos principales del inurance, pero tambien Booking en algun punto
los va a necesitar y quizas otros que que se vayan identificando en el camino.

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** E la idea es tener un flujo similar como el de que
tiene Guida, donde uno puede tener como sus propios estados, pero esos estados
tienen como algunas categorizaciones especificas que eso ya nos permita como
controlar que cosas se pueden hacer en esos estados, independientemente si si
el cliente decide tener tres distintos estados de ejecucion o de revision o
cosas por el estilo.

### 00:01:58 — Estructura del objeto Workflow

**Esteban Cortes Sandoval:** Entonces, estos son los estados que tengo por
defecto, como las categorias de estado, son cuatro. Y eh los objetos que que
propuse son el workflow status, que seria como el objeto donde se definen todos
los posibles estados para estados que estoy asociando a nivel de institucion
que tienen un codigo, un nombre y una de estas categorias o aca en alguno de
estos en un previamente definidos por nosotros y una declaracion y un estado en
el sentido de si estan activos o si un estado que se de preco digamos eh como
de precado en el sentido de que podria haber un sta un flujo que en algun punto
los utilizo, entonces no los podemos eliminar, ¿cierto? Lo podriamos como
archivar si es que en algun punto dejaba utilizarlo,

**Eduardo Bacon:** M.

**Esteban Cortes Sandoval:** pero que igual se va a terminar viendo en
informacion historica. E luego tenemos el workfrow propiamente tal, que es el
que guarda estas transiciones que se estarian creando. Eh, digamos el grupo de
de transiciones, un workflow que uno podria definir un workflow para eh de
nuevo esto va a tener como un alcance. Entonces podria ser para plan de
estudio, para el curso, eh para las competencias, para el flujo de mejora
continua o para el flujo de booking. Ahi entonces se define para que es.

### 00:03:26 — Capacidades y flexibilidad del flujo

**Esteban Cortes Sandoval:** Estos tambien estan definidos a nivel de
institucion. Tiene una descripcion, podriamos definir si es el por defecto o
no. Eh, tiene a medio un estado como si esta en diseño de este flujo o si ya
esta listo o tambien si esta archivado. Y el resto es como la metadata. Eh,
entonces esto nos permite hoy dia, por ejemplo,

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** en Assessment Actual Legacy, podemos tener un
unico flujo, por ejemplo, para el plan de estudio o un unico flujo para el
programa de curso, pero en la practica uno podria pensar que la institucion
podria tener, no se, para ciertos cursos un flujo mas reducido, para otros
cursos un flujo con mas mas extenso. Entonces, en teoria, esto nos permite,
podemos tener para curriculum, por ejemplo, cinco flujos definidos distintos,
pero uno que sea el por defecto y el otro se pueda como seleccionar cuando se
requiere utilizar en ciertos casos. Pero esto entonces, por lo tanto, es podria
ser un ejemplo el eh flujo estandar de plan de estudio. Eso seria como
solamente como la definicion del nombre del flujo y ese flujo se va va a tener
un conjunto de transiciones. Esas transiciones ese objeto que es el workfront
transition. Entonces eso esta asociado al flujo, tiene un un estado de inicio y
un estado de termino y por se relaciona a la lista de estados.

### 00:04:46 — Workflow log polimorfico

**Esteban Cortes Sandoval:** tiene un nombre de transicion y bueno, aqui le
puse como si requeria o no forzar alguna regla de comentario. Quizas te lo
puedo sacar, eh, porque estos flujos probablemente vayan a tener algunas reglas
que desencadenen, no se, que hay que que un comentario algo por finalmente
tenemos el como el o esta es como la definicion del flujo, ¿cierto? Eso nos
permite definir un flujo completo y luego ese flujo se va a utilizar como por
ejemplo cuando tengamos un curso, un activity, lo vamos a transicionar de que
esta en en ejecucion, en diseño, hasta en revision. lo vamos a transicionar por
un flujo del del por una transicion bajo la redundancia del del work y entonces
vamos a tener que guardar el registro de a cual curso nos referimos. Esto es
como polimigorfico. Esto tiene una entidad, ¿cierto?, que a cual de esta le
esta pegando, no se, es un Academy Activity, es la que tiene el codigo 234. Y
aqui estamos diciendo que esta pasando por la transicion y el ID de la
transicion, o sea, no se paso de en ejecucion a en revision. Esto nos dice de
que estado ha estado mas, quien lo hizo, si dejo un comentario y en que fecha
se hizo. Entonces esta es la lo que guardaria como el historico de transiciones
de todos los distintos objetos que hacen transiciones por un flujo de eh por un

### 00:06:00 — Mantenedor visual y formato Jira

**Eduardo Bacon:** His

**Esteban Cortes Sandoval:** workflow. Eh, y eso es como la la idea. Lo tengo
en modo esquema, pero creo que no es tan compleja la las relaciones.

**Eduardo Bacon:** Todo esto va a llevar entonces un mantenedor visual para que
el usuario no solamente lo visualice, sino tambien pueda iterar, crear etapas
del flujo,

**Esteban Cortes Sandoval:** Si, claro. Si,

**Eduardo Bacon:** modificarla.

**Esteban Cortes Sandoval:** porque nosotros no tenemos, o sea, podriamos
instanciar esto con flujos predefinidos por nosotros. Es probablemente que
partamos como con un flujo predefinido, pero en realidad cada institucion
define sus propios flujos. Digamos, podria tener mas o menos pasos. Vamos a
tener que asegurar algunos pasos especificos probablemente como de publicado
porque van a haber ciertas acciones que estan relacionadas, pero si.

**Eduardo Bacon:** Ya. Y ahi la otra pregunta seria, porque yo no lo he usado
el de Gira en relacion a cuando se definieron los flujos. se que se hizo en su
momento cuando hicimos la migracion a Gira Cloud. Es comodo el formato que usa
Gira.

**Esteban Cortes Sandoval:** Si.

**Eduardo Bacon:** Es algo donde podriamos observar mas alla de el eh el manejo
de flujo, sino como visualmente lo resuelve.

**Esteban Cortes Sandoval:** Es si, o sea, nunca le he dado muchas vueltas a
eso de como deberia resolverse, pero Gira tiene algo mas o menos que es como un
eh como esta esto aca asi, pero la verdad no me acuerdo como es la
funcionalidad propiamente tal de llegar a formar estos flujos.

### 00:07:56 — Universal vs por contexto (alcances)

**Esteban Cortes Sandoval:** No me acuerdo si es que se van tirando las lineas
o se van haciendo como por formulario, por decir, vamos de aqui aca, eh, y se
puede revolver de aca. hay distintas formas de hacerlo, pero eh digamos el eh
habria que ver como como diseñamos eso. En realidad,

**Juan Diego Galdames:** H

**Esteban Cortes Sandoval:** la idea de tener el modelo ahora tampoco es como
para que nuestro siguiente foco sea como el mantenor necesariamente, pero si
como para poder ir como si ya tenemos cargado un flujo tenemos que poder hacer
como el la transicion de los documentos curriculares.

**Juan Diego Galdames:** Y en este caso seria un flujo como eh eh universal, es
decir, porque no se, por ejemplo, en Gira eh el flujo el flujo y las etapas
pueden cambiar dependiendo del tipo de tickets. Por ejemplo, si es un bug tiene
puede tener como pasos pasos extra, si es una tarea normal

**Esteban Cortes Sandoval:** Exact. En este caso, la idea es replicar un poco
lo mismo. ¿Cuales serian nosotros nuestros distintos contextos?

**Juan Diego Galdames:** ya.

**Esteban Cortes Sandoval:** serian eh primero el como el alcance, como el
flujo yo lo voy a estar diseñando, por ejemplo, para la gestion de planes o lo
voy a estar diseñando para la gestion de programas de curso. Ese es el primero,
¿cierto?

### 00:09:10 — Asociacion plan ↔ flujo (default vs especifico)

**Esteban Cortes Sandoval:** Entonces, ahi ya hay una primera como familia de
grupos,

**Juan Diego Galdames:** H.

**Esteban Cortes Sandoval:** pero luego dentro de la gestion de planes, yo creo
que uno deberia poder tener mas de un flujo. Pero lo que no tengo resuelto
respecto a eso es como en que momento uno le asocia a un plan el flujo
podriaerlo por el flujo por defecto o podria decir, "No, este flujo, este plan
en particular, necesitamos que se vaya por un flujo mas especifico, que es como
el similar a que los tipos de ticket tienen un flujo por defecto, ¿cierto? Y
todos los que son pug, por ejemplo, uno les tiene un un flujo, ¿cierto?

**Eduardo Bacon:** M.

**Esteban Cortes Sandoval:** Entonces, aca uno diria todos los que son planes
de, no se, tal facultad, programas de tal facultad, quizas van a usar un flujo
distinto. Esa es una funcionalidad, una capacidad que hoy dia Aspe. Asesment
tiene un flujo que es general para todo para eh todas las planas de estudio o
para todos los cursos, digamos. Llega solamente al nivel de seleccionar el el
tipo de documento y ese va a tener eh todos van a tener el mismo flujo que se
defina. Y si en algun punto se cambia el flujo, todos los los documentos de
todos los planes de estudio van a empezar a utilizar ese mismo.

### 00:10:17 — Cambios en Activity: status → referencia + execution_unit + governance_unit_ids

**Esteban Cortes Sandoval:** Aqui en teoria se puede puede ser igual, pero yo
creo que tenemos el espacio con como funciona el el modelo no lo restringe.
Tenemos el espacio en algun punto poder permitir que como asociaciones mas
especificas dentro del grupo grupo de plan de estudio, digamos, podriamos tener
algunos planes que ocupan el flujo A y otros que ocupan el flujo B. No hay una
reflexion, pero eventualmente tendriamos que construir como esa capacidad
funcional, pero el modelo lo

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** permite,

**Eduardo Bacon:** Se ve interesante

**Esteban Cortes Sandoval:** esto implica,

**Eduardo Bacon:** implementar.

**Esteban Cortes Sandoval:** si, que entonces hay que hacer cambios
probablemente en el proximo sprint de como el estado, porque el estado
actualmente en el objeto de de Academia Activity era como el estado de manera
directa, pero ahora deberia hacer una referencia. ¿Y a donde lo tengo?

**Eduardo Bacon:** Eso es lo que mencionabas,

**Esteban Cortes Sandoval:** Aca.

**Eduardo Bacon:** que habian cambios que que no se habian comentado.

**Esteban Cortes Sandoval:** O sea, este no, este es un cambio en particular de
del hecho de de ahora como rediseñar el flujo del

**Eduardo Bacon:** No,

**Esteban Cortes Sandoval:** work, pero los otros cambios que comentaba tenian
que ver con,

**Eduardo Bacon:** no.

**Esteban Cortes Sandoval:** yo no los he pasado aca porque lo hemos conversado
no mas con el con Cllaus, con creo que estaban los PM tambien esa reunion, pero
basicamente que este le vamos va a tener un eh el execution unit va a pasar a
ser parte de el record eh type, o sea, va a pasar a ser un campo a este y eh y
vamos a

### 00:12:11 — governance_unit_ids + flujo de objetos en mods

**Esteban Cortes Sandoval:** incluir el governance unit ids, que seria como la
dar la posibilidad a que la entidad que lo diseña es distinta que la entidad
que lo ejecuta, ¿no? Porque, por ejemplo, los servicios se puede dar ese caso.
En los servicios la entidad que lo diseña es una, pero la entidad que lo
ejecuta es otra. Eh, eso esos son los cambios que vamos a ver aca. Pero aparte
aqui, ¿cierto? Bueno, este ya esta actualizado, asi que no es la documentacion
que estaba utilizando antes Edu, pero ahora este va a ser un un aqui
relacionado al web. Eso, eso tengo por mi lado. No se si hay dudas. Igual
mañana puse una sesion como para que refiremos cosas sprint, asi que esto es
como para darle esta. Eso por mi lado. estado trabajando principalmente en eso
y reuniones que hemos tenido varias con distintas gente para hablar de duda o
temas de Bueno, pero nada mas que eso.

**Juan Diego Galdames:** Ya. Ah, bueno, lo que yo habia comentado que habia
hablado con Claus, el tema de los objetos que parece que hubo una confusion.
Eh, al final, claro, efectivamente,

**Esteban Cortes Sandoval:** M.

**Juan Diego Galdames:** o sea, iba por el camino correcto, pero me lo haia una
confusion de que efectivamente los objetos como de mods, en este caso, aunque
sean core, tienen que estar creados en el repo de los mods.

### 00:13:43 — Sync mod → UP1 → PR a Object Manager

**Juan Diego Galdames:** Pero lo que hay que hacer despues es porque cuando uno
levanta UP1 One y hace un sync,

**Esteban Cortes Sandoval:** Si.

**Juan Diego Galdames:** eh, se hace un mirror, es decir, se copian los objetos
de que estan en los directorios del mod y se van al de UP1. Eh, cuando eso ya
esten como en funcionamiento, hay que hacer una PR agregando esos objetos a al
el fondo al repositorio de del Object Manager, pero si tienen que estar
viviendo como siempre, tienen que estar creados siempre en el en el mod. Esa es
la como esa es la como la diferencia, no crearlos directamente dentro del
object,

**Eduardo Bacon:** E

**Juan Diego Galdames:** sino que tienen que estar creados en el mod y cuando
ya esten eh funcionando, despues de hacer un sync ahi hacer un un merch al al
object manager ya con los objetos metidos ahi colocados ahi para que en el
fondo siga siendo la fuente de la verdad lo que diga el el object manager.

**Eduardo Bacon:** Y eso lo disponibiliza ya, o sea, lo deja tecnicamente como
core pensando en los eh en los otros mods o los otros elementos que que lo van
a consumir.

**Juan Diego Galdames:** Claro, claro, porque no se que podria llegar a pasar
que no se pues no no alguien que este trabajando en su local no tenga eh todos
los repos de todos los mods, entonces no va a poder encontrar ese objeto si no
hace cuando haga un sync en el object manager, si no tiene el la carpeta del
mod que tiene originalmente ese objeto no no la va a poder encontrar nunca.

### 00:15:10 — "core" de UP1 vs "core" de negocio

**Juan Diego Galdames:** Si. Y bueno, tambien la otra confusion es que el tema
de decirles core tambien otra confusion porque hay objetos core en Yupan que
son los core user, eh core roll. Entonces, estos son como los como no se si
decirlos como los genericos o los que van a ser utilizados, porque Claus me
dijo que al final todos los objetos que se estan haciendo estan pensados para
que puedan ser consumidos por todas las puedan ser consumidos por todas las
otras eh soluciones, todos los otros

**Esteban Cortes Sandoval:** Si,

**Juan Diego Galdames:** productos.

**Esteban Cortes Sandoval:** eso tambien me cuento mio, o sea, basicamente como
yoendo lo que tu deci cuando hablamos hay una confusion de lo que dice core
core son como objetos que utiliza UP1 como de manera abstracta para el
funcionamiento. de UP1 que no son como de negocio,

**Juan Diego Galdames:** Claro,

**Esteban Cortes Sandoval:** pero como que todos los objetos de negocio son
entre core porque todos los pueden utilizar todos.

**Juan Diego Galdames:** claro.

**Esteban Cortes Sandoval:** Entonces entiendes no tenemos ese tema como de
basicamente el

**Eduardo Bacon:** H. Mhm.

**Esteban Cortes Sandoval:** que envia un objeto si se aprueba y se merge es
como un objeto que esta disponible para todos

**Juan Diego Galdames:** Claro.

**Esteban Cortes Sandoval:** ya. Eh, ¿que mas, chiquillos?

### 00:16:21 — Convencion: prefijo de modulo en objetos?

**Esteban Cortes Sandoval:** ¿Que tienen ustedes por su lado?

**Eduardo Bacon:** Otra pregunta antes de de pasar aprovechando que estamos
viendo el tema de de objetos eh quiero definir. Me quedo una duda que revisando
el tema antes y ahora me acorde cuando lo menciono Juan y el tema de los
objetos y todo esto como los que pasan a cor, todo lo que estamos viendo. Hasta
ahora hemos estado trabajando los objetos con un nombre especifico, academic
activity, etcetera. Asi. En cambio, por ejemplo, en mods como el que colocan de
ejemplo de Assessment, que es el Hello World, estan tagueados con un HW antes,

**Juan Diego Galdames:** Hm.

**Eduardo Bacon:** HW algo seria HW Academic Activity, en nuestro caso como CD
Academic Activity. Vamos a mantener ese patron para evitar que se tope,

**Esteban Cortes Sandoval:** Si.

**Eduardo Bacon:** no nos topemos con objetos de de otros equipos, de otro de
otros mods.

**Juan Diego Galdames:** Ah, eh, mira, no sabria decirte la verdad porque creo
que ese fue tuvo que haber sido como que lo creo como lo creo Nacho al hacer
como la distincion para ver de donde venia el objeto, pero el resto de objetos
que estan en los mods no llevan ese prefijo de de por ejemplo de Hello World, o
sea, los que estan en Entonces,

**Eduardo Bacon:** Mhm.

**Juan Diego Galdames:** ¿no? O sea, de momento no hay una regla definida,

### 00:17:41 — Decision: objetos sin prefijo (modelo general UP1)

**Esteban Cortes Sandoval:** No deberian llevar no deberian llevar prefijo
porque son van a ser todos,

**Juan Diego Galdames:** ¿no?

**Esteban Cortes Sandoval:** o sea,

**Juan Diego Galdames:** Claro,

**Esteban Cortes Sandoval:** es el el modelo es por asi decirlo de UP1,
independientemente que algunos objetos no los van a utilizar ciertos mods, el
modelo de datos general,

**Juan Diego Galdames:** claro.

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** asi que entenderia que no tienen que llevar un
prefijo como si lo llevaba las tablas de la Switch que les poniamos como un
prefijo del modulo, pero en en la practica despues igual esas tablas la
utilizaba la funcionalidad que las necesitara. Entonces,

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** yo creo que aca no le vamos a poner prefijo
tambien porque es como pensar o forzar para

**Juan Diego Galdames:** Claro.

**Esteban Cortes Sandoval:** como que hay un modulo principal, pero en realidad
es un una forma en que nosotros modelamos la institucion, yo veo y despues
quien lo utiliza es depende de que funcionalidad o mod esta dando una

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** solucion a un problema. Asi que no deberian llevar
un prefijo,

**Juan Diego Galdames:** Claro.

**Esteban Cortes Sandoval:** creo.

**Juan Diego Galdames:** Si. No, no, yo creo que fue algo que quedo exclusivo
de ese de ese mod de ejemplo,

**Esteban Cortes Sandoval:** Ok.

### 00:18:31 — Avance CRUD Curriculum Design

**Juan Diego Galdames:** pero el resto no hay una convencion que hayamos dicho,
no tiene que decir el prefijo del del mod en el objeto. Claro, tiene sentido.
Pues si en el fondo son objetos que despues van a poder consumirlos a otros
productos que lleve el nombre de uno es medio raro

**Eduardo Bacon:** Si, era un patron que veia, pero claro, no era no era
estandar, no se veia en los otros elementos. Entonces, me genero esa esa duda y
eso,

**Juan Diego Galdames:** Hm.

**Eduardo Bacon:** como lo decia Esteban, lo juntaba con el punto de claro, en
el en la Suite Legacy estan todos tagados si es IMP de improve, cls de class y
asi. Entonces, ya que paso vamos a dar y tomar una decision entonces o se habia
una decision informada de ya vamos a hacerlo de esta forma como se especifica
ahora. Eso, tomando el microfono. Entonces, ya que estaba preguntando, hablando,
eh, por mi parte estado avanzando con el tema de bueno,

**Juan Diego Galdames:** H

**Eduardo Bacon:** curriculum design. Eh, ya tenemos el el tema funcionando,
los objetos en base a lo que estaba y donde nacia mi consulta anterior de lo
que comentaba Juandy, de los que tienen que que han como mencionaria como
candidatos a objetos globales, estan en el mod en este momento. Entonces,
hasta que los terminemos de de refinar dependiendo de como vayamos avanzando.

### 00:20:01 — Demo CRUD: vista, tabs, validacion %, texto enriquecido

**Eduardo Bacon:** Voy a mostrar igual para que se vaya viendo. Entonces, ya
traje tambien los ultimos cambios que Wandy aplico, lo cual hace que sea mucho
mas comodo de de manejar y de ver al estar aca y pasar a una vista ya pagina
completa con eh los tabs respectivos. Entonces, esta ajustado el tema para
poder trabajar con el edit. el create eh dentro de estuve ajustando las tablas
tambien hay unos comentarios. A ver, pero antes de eso, por ejemplo, el de
evaluacion que quedo de esta forma e haciendo memoria de cosas de assessment,
por ejemplo, le estaba le agregue tambien que si se esta usando el contador aca
porcentual eh valida en relacion a los porcentajes de los hijos. Esto es
opcional a configurar si uno lo quiere o no, por ejemplo. Entonces, que si 100%
realmente los hijos esten sumando 100% o sino que alerte. Eh, tambien tenemos
en este de aca, que es otro caso el tema que esto podia ser un eh un eh un
texto enriquecido. Al final esto, como nos topabamos aca, este eran parrafos
HTML, entonces ahora lo renderiza, lo pueden editar con editor el tipico HTML
tipo WordPress, el What you get, y luego ver el renderizado.

**Esteban Cortes Sandoval:** Ahi no te cache. Ahi podeis mostrarlo de nuevo.

### 00:22:04 — Texto enriquecido como capacidad transversal

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** Eh, ese tiene que ser una esa es una capacidad
transversal de UP1 o como es, porque tu estas hablando del texto enriquecido,

**Eduardo Bacon:** Eh,

**Esteban Cortes Sandoval:** ¿cierto? Ahora si yo recuerdo en el en el ¿como se
llama?

**Eduardo Bacon:** si,

**Esteban Cortes Sandoval:** En nuestros formularios actuales de la Suite
Legacy, cuando tenemos como texto enriquecido, tambien tenemos como los iconos
que nos permiten enriquecer ese texto.

**Eduardo Bacon:** hay un componente que encontre que esta manejando el como
editarlo, que para editar tengo que cambiar de vista. Ahi viene como un
comentario que tengo que hacer aparte.

**Esteban Cortes Sandoval:** Ah, ya, ya, ya, ya, ya. Okay,

**Eduardo Bacon:** Eh,

**Esteban Cortes Sandoval:** aqui estamos viendo la visualizacion.

**Eduardo Bacon:** pero aca, claro,

**Esteban Cortes Sandoval:** Ya,

**Eduardo Bacon:** pero esta es solamente la visualizacion. Entonces, la
visualizacion no aparecen los iconos,

**Esteban Cortes Sandoval:** ya, ya. Si, si, si.

**Eduardo Bacon:** simplemente es un visor que renderiza ese HTML que genera
para que se vea con el formato HTML.

**Esteban Cortes Sandoval:** Y y este texto en particular no esta enriquecido,
es como un plano. Es como un texto

**Eduardo Bacon:** Claro, es que hice la prueba, pero cada vez que hago la hago
pruebas despues,

### 00:23:01 — Modo edit/view: nace de aca, no por pestañas

**Esteban Cortes Sandoval:** plano.

**Eduardo Bacon:** claro, estoy corriendo el sync y eh eso vuelve a ser el sit
de los elementos y me elimina los cambios y entonces ahi voy, hago pruebas y
voy eh revisando.

**Esteban Cortes Sandoval:** Okay.

**Eduardo Bacon:** Entonces,

**Esteban Cortes Sandoval:** Que me habia confundido con eso. Gracias.

**Eduardo Bacon:** si, tranquilo. Ahora vamos a pasar a ver la lo que es la
edicion. esta solamente la parte de eh visualizacion donde ahi el tema esta que
para hacer una edicion,

**Esteban Cortes Sandoval:** Hm.

**Eduardo Bacon:** esto es un tema que maneja Yupi One. No encontre la forma de
verlo, es no podemos hacerlo por pestañas, sino que nace de aca. Entonces aqui
o es o hacemos el ver, que puede ser aca o aca, o aqui pasamos al editar. Y
cuando pasamos al editar, ahi si aparecen las capacidades de editar dentro. No
es que yo pueda ingresar que estoy viendo,

**Juan Diego Galdames:** No.

**Eduardo Bacon:** voy a ver el eh el programa. Ingreso y resulta que vi que
ah, aqui hay una una modificacion. Entonces, como antes teniamos que se podia
modificar por elemento, que era por punto, que aca vendrian a ser los taps,

**Esteban Cortes Sandoval:** H

**Eduardo Bacon:** sino que me obliga el sistema a tener que volver, decir, ah,
quiero editar, vuelvo atras, voy a editar y ahi tengo las capacidades de
editar.

### 00:24:19 — UX: switch rapido view↔edit no existe

**Eduardo Bacon:** No, no es una forma de rapida de cambiar de de scope de ah,
estoy viendo y estoy, no se, pues manejando aca las evaluaciones, ah, quiero
agregar una nueva, tengo que ir atras, editar y vuelvo. Y si salgo de eso
despues, entonces si veo otra modificacion tengo que volver atras, entrar,
editar y vuelvo. No hay una un switch rapido de de eso, o por lo menos yo no lo
he encontrado. Juandi, si me me me

**Juan Diego Galdames:** Ya. Si.

**Eduardo Bacon:** confirma.

**Juan Diego Galdames:** mejor que sea como como lo estas explicando tu, porque
eh el modo de editar cuando se concibio siempre fue como pens fue hecho como
pensando que uno esta editando como una instancia, como unos campos no mas,
como no no con tabs y esas cosas, asi que es como es el proceso que estas
explicando tu. Pero ahi mi duda es, si tu editas, por ejemplo, algo en una tab
y despues y despues puedes cambiarte la otra tab y editar otra cosa o tienes
que guardar y volver y volver a abrirla de nuevo en edicion. Eso

**Eduardo Bacon:** puedes moverte entre ts. O sea,

**Juan Diego Galdames:** no.

**Eduardo Bacon:** es el el punto esta que si entraste en modo ver,

**Juan Diego Galdames:** Ah, no s.

### 00:25:30 — Modo edit es contrato: si entras editas en todas las tabs

**Eduardo Bacon:** te te comprometiste a solamente ver.

**Juan Diego Galdames:** Ah, ya.

**Eduardo Bacon:** Entraste en modo editar,

**Juan Diego Galdames:** Si,

**Eduardo Bacon:** bueno, puedes editar en todas las t que tu quieras,

**Juan Diego Galdames:** ya.

**Eduardo Bacon:** pero ya estas en modo modo editar. Si despues quieres ver,
igual tu puedes ver los resultados aca, por ejemplo, digamos especifico estos
que eran los textos enriquecidos.

**Juan Diego Galdames:** Ha.

**Eduardo Bacon:** Entonces tu puedes ver el el resultado, pero si quieres
editar, entonces aca editas, aqui estan los botoncitos que menciona Estean.
Entonces yo puedo decirle aqui que esto lo coloque en negrita,

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** lo guardo, puedo ver y ver los cambios. No se si se alcanza
a notar ahi que eso esta en bolsa. Vamos a ver otra edicion. Pero aqui, por
ejemplo, me pasa esto. Quiero ver, quiero editar. Entonces tengo que editar.

**Juan Diego Galdames:** H

**Eduardo Bacon:** Ah, ya esta esto. Por ejemplo, aca le vamos a poner star.
Listo. Despues quiero ver. Oh, no me cargo estar chado. No,

**Esteban Cortes Sandoval:** No, la segunda linea.

**Eduardo Bacon:** no esta.

**Esteban Cortes Sandoval:** Ah,

**Eduardo Bacon:** No, este y y

**Esteban Cortes Sandoval:** porque te el

### 00:26:39 — Pruebas en vivo: tachado / titulos H

**Juan Diego Galdames:** A ver si se refresca ese listado.

**Eduardo Bacon:** y dejame ver una cosa.

**Juan Diego Galdames:** refresca

**Esteban Cortes Sandoval:** texto,

**Eduardo Bacon:** ¿Esta el cambio aca? Si,

**Juan Diego Galdames:** ese.

**Eduardo Bacon:** el cambio esta,

**Esteban Cortes Sandoval:** pero no esta.

**Eduardo Bacon:** pero recarguemos. Ver,

**Esteban Cortes Sandoval:** No,

**Eduardo Bacon:** no,

**Esteban Cortes Sandoval:** no lo esta mostrando.

**Eduardo Bacon:** ese no lo esta tomando,

**Juan Diego Galdames:** ¿Sera que ese modo quizas no soporta

**Eduardo Bacon:** pero estos se ven quizas porque igual ese torchado de Vamos
a probar otro

**Esteban Cortes Sandoval:** Ah.

**Eduardo Bacon:** cambio.

**Juan Diego Galdames:** esa?

**Eduardo Bacon:** Vamos a ir a esta linea y metodo vamos aca y le vamos a
añadir un titulo y lo vamos a hacer como un H. Guardamos. Ver, es el el es el
la funcionalidad, el tarchado, porque por ejemplo ahi esta el titulo y se ve
como como titulo esta poniendo el

**Juan Diego Galdames:** Claro.

**Eduardo Bacon:** renderizado.

**Esteban Cortes Sandoval:** aqui, perdon, en este contexto estais de entraste
en el modo edicion,

**Eduardo Bacon:** Entonces,

**Esteban Cortes Sandoval:** digamos, estas viendo y los que son tipo tabla a
su vez tienen el modo visualizacion y edicion y puedes activar la edicion
porque estas en la edicion,

**Eduardo Bacon:** si,

**Esteban Cortes Sandoval:** pero si hubieses entrado en el modo visualizacion
las tablas las vas a poder solamente ver,

### 00:27:48 — Hijos heredan modo del padre + crear=editar

**Eduardo Bacon:** exacto,

**Esteban Cortes Sandoval:** no vas a poder

**Eduardo Bacon:** exacto.

**Esteban Cortes Sandoval:** editar.

**Juan Diego Galdames:** Si.

**Eduardo Bacon:** Ahi, por

**Juan Diego Galdames:** Y tampoco podria crear en el modo ahi tampoco podrias
ver tampoco te apareceria el boton de crear registros como

**Eduardo Bacon:** ejemplo,

**Juan Diego Galdames:** cuando estas en modo visualizacion y estas viendo una
un record list. Eh,

**Esteban Cortes Sandoval:** M.

**Juan Diego Galdames:** tampoco puedes crear mas instancias, solo las puedes
ver.

**Eduardo Bacon:** ahi tengo un un asterisco que ver porque si, eh, lo que dice
Esteban es asi, si entro en modo editar, las tablas, los hijos de los elementos
ganan la capacidad de editar. Lo pueden hacer, si no no tienen no tienen forma
de poder comunicarse entre ellos y saber que es lo que voy a editar.

**Juan Diego Galdames:** Claro.

**Eduardo Bacon:** que eso es lo que intente en en su momento viendo y ahi, por
ejemplo, lo que dice Juandy, si, eh el sistema lo eh y ahi Claudito lo que
encontro fue que podia crear, por lo menos me habilito los formularios para
poder crear,

**Juan Diego Galdames:** Hm.

**Eduardo Bacon:** pero los de editar se rompian. Entonces, pero no fui por el
lado de de mantenerlos como crear porque dije,

**Juan Diego Galdames:** Ah.

**Eduardo Bacon:** bueno, si estamos en en bajo la clausula de, "Okay, vamos a
entrar en modo edicion para poder a eh realizar modificaciones." El crear es

### 00:28:59 — Crear como variante de modificacion

**Eduardo Bacon:** una una es una variante de modificacion, por lo tal deberia
estar dentro del crear. Si no, se vuelve confuso el oye, puedo al ver puedo
crear pero no puedo editar,

**Juan Diego Galdames:** Claro.

**Eduardo Bacon:** pero al editar puedo editar y puedo crear. Entonces es como
decidamonos es decir como plataforma, decidete que que me vas a ofrecer.

**Esteban Cortes Sandoval:** ¿Que puedo

**Eduardo Bacon:** Claro, claro, me estas confundiendo.

**Esteban Cortes Sandoval:** hacer?

**Eduardo Bacon:** Entonces, ya,

**Juan Diego Galdames:** H

**Eduardo Bacon:** okay, si vamos, mi contrato es quiero editar, entonces
ingreso, edito, creo y puedo hacer cosas. Ver, solamente puedo visualizar y
mantiene la constancia. Claro. Y aca se genera entonces igual en los hijos esa
interaccion que para ver. Entonces tengo que ver editar, puedo ir viendo los
cambios, pero si quiero ver como el final final este si que si imprimir ex.
Excel tengo que salir, ir a ver y ah, ya asi quedo. Y despues si quiero editar
tengo que salir de aca, volver al editar. Entonces no

**Juan Diego Galdames:** Ya,

**Esteban Cortes Sandoval:** Hola.

**Juan Diego Galdames:** ahi lo que ahi lo que se me ocurre como una
funcionalidad que podria ser core para UP1 seria que, por ejemplo, eh tu entras
a la vista de mira,

**Eduardo Bacon:** Son

### 00:30:09 — Idea: switch view→edit en mismo modal/tab (core UP1)

**Juan Diego Galdames:** cierra un poquito Model, si tu lo abres como en modo
vista, abrelo en en ver ya y ahi te dice modo vista, que dentro mismo titulo
haya como una opcion de como ahi mismo al tiro cambiarlo a modo edicion, ya yo
guardo el cambio y cuando guardo el cambio muestro el modal de nuevo en
visualizacion con los cambios reflejados para no tener que encuentro yo que es
mas que tener

**Eduardo Bacon:** Hm.

**Juan Diego Galdames:** que como en el fondo eh vista detalle, ya despues
cerrar, editar y despues volver a abrir vista detalle.

**Eduardo Bacon:** Si.

**Juan Diego Galdames:** va a ver el cambio reflejado al tiro. Entonces ahi
podria ser tambien que incluso en en los tabs tambien cuando yo lo abra como
vista detalle que haya una forma de eh apretar un switch y que ya esta vista de
detalle se forme en la vista de edicion. Creo que podria ser algo que se podria
habilitar desde el core porque yo encuentro que no es un flujo

**Eduardo Bacon:** H.

**Juan Diego Galdames:** el el el edit el poder ver la edicion al tiro, o sea,
el no poder ver la al tiro.

**Eduardo Bacon:** Si,

**Juan Diego Galdames:** el resultado de la Lo voy a anotar, de

**Eduardo Bacon:** yo comparto. que per se no es un dealbreaker que diga esto
asi como no me mata completamente la

**Juan Diego Galdames:** hecho.

### 00:31:18 — UX tediosa: clicks atras-adelante

**Eduardo Bacon:** experiencia de la plataforma, pero si la hace mas tediosa,
lo hace que el proceso sea eh mas cortado y es como esto pierde lo amigable
que puede hacer, que es lo que hasta ahora va mostrando Yupi One y cuando llega
este punto es como, ah, bueno, para atras,

**Juan Diego Galdames:** Hm.

**Eduardo Bacon:** para adelante, para atras, para adelante.

**Juan Diego Galdames:** Si, no, mientras mas clicks haya va a ser peor

**Eduardo Bacon:** Y entonces, bueno, todos estos son tablas. Eh, agregue los
elementos, pero esto, claro, eh, mi pregunta iba aqui cuando estaba en esto,
bueno, ¿cuales son las eh las columnas que queriamos ver? Pero gracias a la
funcionalidad UP, si un usuario quiere personalizar esto, lo puede hacer
simplemente creando una vista personalizada y asi saber que tablas son
realmente la que les importa ver. Entonces, no es una decision de primer nivel.
Es como queremos que se vean estas tablas. en este momento esta mostrando lo
maximo que puede. ocultas,

**Esteban Cortes Sandoval:** a las columnas de las que muestra ese comentario,
tu comentario respecto cuando dijiste lo maximo que puede,

**Eduardo Bacon:** como

**Esteban Cortes Sandoval:** lo maximo que puede respecto como a las columnas
de cada tabla y

**Eduardo Bacon:** a los contenidos que tiene un una tabla,

**Esteban Cortes Sandoval:** Voy a darle ya.

**Eduardo Bacon:** esentar mostrar lo maximo posible, exceptuando los que estan
marcando el orden,

### 00:32:37 — Custom section: content_type y max_length

**Esteban Cortes Sandoval:** Okay.

**Eduardo Bacon:** que es como informacion redundante y esta netamente eh para
que se ordenen de cierta

**Esteban Cortes Sandoval:** Ya. Yo tenia una duda,

**Eduardo Bacon:** forma

**Esteban Cortes Sandoval:** Edu, con lo que mostraste recien del texto
enriquecido. ¿En cual campo era ahi?

**Eduardo Bacon:** aca.

**Esteban Cortes Sandoval:** esa columna que dice reach eh formato, esa es una
columna como que tenemos del objeto.

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** Ya, ya como para

**Eduardo Bacon:** Y ahi en este momento solo,

**Esteban Cortes Sandoval:** darle

**Eduardo Bacon:** ah, ¿por que no lo tomo? esta tomando como el texto
enriquecido donde para ver la hab que manejar cuales son las

**Esteban Cortes Sandoval:** Aja.

**Eduardo Bacon:** opciones porque eso eh si ahi como punto llevaria a

**Esteban Cortes Sandoval:** Hm.

**Eduardo Bacon:** ver entenderia que esto quizas se deberia crear antes o

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** o ver otro flujo porque esto estaria gobernando lo que seria
el contenido, que es lo que estaria mostrando aca, porque en relacion al
formato que tenemos es que aqui dice, "Ah, esto es un texto enriquecido lo que
tenemos, por lo tanto podria trabajar sobre texto

**Esteban Cortes Sandoval:** Ya, asi porque yo no le di tantas vueltas a ese a
esa como capacidades,

**Eduardo Bacon:** enriquecido.

**Esteban Cortes Sandoval:** ¿cierto? Esto de la seccion personalizada donde la
idea es tener como eh algo que sea lo suficientemente flexible para otros datos
que no caen dentro de lo de lo estandar, digamos,

### 00:34:06 — Custom section: 3 campos (content_type, content, max_length)

**Eduardo Bacon:** Hm.

**Esteban Cortes Sandoval:** que tenemos, ¿cierto? Eh,

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** y creo que en ese en esa intereracion que hice fue
que claro, existe la propuesta de objeto venia con un formato y una longitud,
cacha, como para darle mas dinamismo, pero en general como que tiene un como un
campo de nombre, creo, y un a voy a revisar el objeto tiene como uno o dos
campos, ¿no? Eh, el ese es un record en realad. Entonces, aqui tenemos el
record de activity activity. Aqui esta el de no, esto es de curricular section
y estamos viendo el record de custom section. Ahi esta. Claro. Y el custom
section tiene contente. Claro. Tipo de contenido. Content, el contenido mismo y
el largo maximo. Claro. Eh, tiene esos tres campos. Entonces el texto el que
esta abajo, cler, texto enriquecido,

**Eduardo Bacon:** Hm.

**Esteban Cortes Sandoval:** lista tabla archivo. Jason, lo que voy es que como
que esos dos campos de content type y max length me parecen mas campos como de
configuracion que no necesariamente el usuario como que utilizaria.

**Eduardo Bacon:** Y quizas aqui dividirlos para ver una cosa, lo que seria el
formato que se va a utilizar,

### 00:35:51 — Separar config (super admin) de input (usuario funcional)

**Esteban Cortes Sandoval:** Eh,

**Eduardo Bacon:** que seria esto, y despues el contenido que se va a utilizar,
que depende de lo que se seleccione aca.

**Esteban Cortes Sandoval:** porque el nombre ah, el nombre lo toma desde el
campo inicial de lo que no es del record y despues el contenido lo toma desde
el

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** recorde. Eh,

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** si quizas hay que pensarlo de una forma distinta,
es que si no siempre seria como una relacion de un elemento y un un nombre con
un campo, un monton de registros asi. Eh, pero esto se alinea con lo otro que
tenemos pendiente, que es como que vamos a revisar mañana, como las historias
de poder hacer los formularios mas dinamicos en como se componen las pestañas.
Asi que ya era para entender como por que esta lo terminamos visualizando asi.
Yo creo que hay algun ajuste que hacer porque como digo, el formato y la
longitud maxima es como una configuracion de ese de esa seccion custom. Eh, mas
no es una configuracion que el usuario funcional deberia hacer. Si, no se si me
explico con eso. Es como yo voy a tener una seccion custom. Yo yo consultor o
usuario super admin,

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** ya no este dato no me cae en ninguna de las
estructuras estandar, lo voy a poner en una seccion custom y va a ser una lista
y con un s la longitud maxima quizas no aplicari, ¿okay?

### 00:37:26 — Componente arbol evaluaciones (mod): drag, hijos, %, dark

**Esteban Cortes Sandoval:** Y lo configuro y despues se llena ese formulario.
Esa es como la idea por detras. Por lo tanto, un usuario, ahora estamos
haciendo el como si fuesemos un usuario estandar, ¿cierto? Voy a a completar la
informacion del formulario, pero no tengo por que seleccionar el formato y la
longitud maxima en esa accion. Por eso me me causo como ruido, pero hay que
revisar ese caso. Lo

**Eduardo Bacon:** Ya. Si, si.

**Esteban Cortes Sandoval:** anoto

**Eduardo Bacon:** A este tampoco no le he dado tanta vuelta. Estoy viendo eso.
He estado mas concentrado en el componente,

**Esteban Cortes Sandoval:** en la configuracion.

**Eduardo Bacon:** la configuracion y el componente aca que nos permite tener
esto que tiene diferentes funcionalidades. O sea, aca podemos agregar elementos
raices, aca cada uno puede agregar hijos, podemos editar, es expandible, por
ejemplo, un padre puede que contiene hijos, entonces podemos ir colapsandolos.
son se pueden draguear y eso actualiza el la propiedad del orden para que sepa
a cual es el orden que quedo. Puedo ver el detalle de cada uno, por ejemplo,
con un model. Y si lo edito, por ejemplo, voy a editar este y le vamos a bajar
la ponderacion. Guardamos. Aqui arriba empieza a alertar.

### 00:38:50 — Validacion 100% padre vs hijos + dark mode

**Eduardo Bacon:** lo que comentaba y me dice, "Oye, estas esperando que sume
100%, pero estas sumando 99." Por ahora lo tengo asi. No tiene una suma
automatica de, "Ah, vamos a hacer que esto sea estos." Eh, ahi seria preguntar
si vamos a ir por ahi. Eso es como ya empezar a ver cual seria el alcance de
como de su historia, pero si pense en eso,

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** como me acordaba de cosas de assessment, dice como esto fue
tema en su momento y un padre siempre valida sobre los porcentajes, los valores
que tenga en sus hijos. Cada padre valida sus hijos.

**Esteban Cortes Sandoval:** Este componente que tu estas mostrando aca seria
como un componente del mod.

**Eduardo Bacon:** Y este componente solamente el mod esta hecho por y para el
mod y eh se puede ver el light y en dark. No se que mis

**Esteban Cortes Sandoval:** Bueno,

**Eduardo Bacon:** ojos

**Esteban Cortes Sandoval:** todo lo que yo he visto cada vez que envi una foto
a alguien la envio asi.

**Eduardo Bacon:** eh

**Juan Diego Galdames:** No Esta bueno porque el modo dark es el como el
secundario, entonces sirve tambien tiro para encontrar donde hay fallos de
donde falta la capa de estilo, donde falta. Ah.

**Eduardo Bacon:** entonces podemos eh probar Ahora aca no se va a añadir eh
añad No me acuerdo que tenian tipo ah era formativo, solo no esta con
desplegable.

### 00:40:38 — Pruebas: editar hijo, alerta % y volver a vista

**Eduardo Bacon:** guardamos y ahi podemos ver entonces al al hijo. Y lo que no
provoca lo tengo, pero estoy estoy haciendo las las pruebas ahora.

**Esteban Cortes Sandoval:** Bueno,

**Eduardo Bacon:** Por ejemplo, este lo vamos a cambiar y deberia alertarme
bien que entonces dice, "Estas esperando que tengas un 9% pero tus hijos actual
suma 10 porque tienes un hijo que tiene un 10%. El el padre marca cual es el el
valor a conseguir entre medio de los hijos. Eso si.

**Esteban Cortes Sandoval:** Aqui esta en modo de edicion, ¿cierto?

**Eduardo Bacon:** Bien. modo

**Esteban Cortes Sandoval:** Podeis eh salir un poco del modo edicion.

**Eduardo Bacon:** dice,

**Esteban Cortes Sandoval:** Quiero ver. Ah, esperame. Ahi esta el volver. Ya,
ya, ya. No, es que me quedaba la duda de que veia una imagen, una linea debajo
del volver. No veia el volver. Entonces pense que habia como una linea que que
no estaba deas, pero dale, ahi lo

**Eduardo Bacon:** pero podemos ir al volver para validar aca evaluacion y aqui
tenemos

**Esteban Cortes Sandoval:** veo.

**Eduardo Bacon:** igual en el edit en el en el verb te muestra la alerta, pero
aca ya no tenemos las opciones del drag de ni de editar

**Esteban Cortes Sandoval:** Ni editar.

**Eduardo Bacon:** ni agregar hijos, nada, ninguna modificacion.

### 00:42:00 — Fix visual: titulo no aparece dentro del rectangulo

**Eduardo Bacon:** Solamente puedo obtener informacion de lo que tengo aca y
puedo interactuar con los elementos en relacion a esto y puedo ver el detalle
aca con el mod.

**Juan Diego Galdames:** M.

**Esteban Cortes Sandoval:** Vale, voy mostrar muertas sesiones, por favor.
Sesiones. Pasate a contenidos ahora.

**Eduardo Bacon:** Claro.

**Esteban Cortes Sandoval:** Ya vuelve a evaluacion. evaluacion lo tenemos como
sobre este como componente, como en un rectangulo que no no aparecen sesiones.
Eso es que hay que hacer un ajuste. Hay que hacerle un ajuste al componente.

**Eduardo Bacon:** Ah, esta.

**Esteban Cortes Sandoval:** Si. Y el tamaño del titulo no parece ser el mismo
el

**Eduardo Bacon:** Si, eso si,

**Esteban Cortes Sandoval:** H.

**Eduardo Bacon:** eso esta distinto. Eh,

**Esteban Cortes Sandoval:** Si.

**Eduardo Bacon:** este tendria que revisarlo ahi. No se si es porque es un
componente especifico UP1 este aplicando un elemento o lo esta dentro del
mismo elemento.

**Esteban Cortes Sandoval:** Aja. Si, como para ver eso, porque pense que todos
tenian y creo que eso ocupa un espacio como innecesario,

**Eduardo Bacon:** Mm.

**Juan Diego Galdames:** No.

**Esteban Cortes Sandoval:** achica tambien como el espacio del como del
componente.

**Eduardo Bacon:** Si,

**Esteban Cortes Sandoval:** Okay. Okay. Bibliograf tiene algo,

### 00:43:16 — i18n pestañas: Programa de asignatura + Referencia bibliografica

**Eduardo Bacon:** pero aqui.

**Esteban Cortes Sandoval:** Edu en ese caso e no, pero me refiero arriba.

**Eduardo Bacon:** Ah, aca este si,

**Esteban Cortes Sandoval:** Aja.

**Eduardo Bacon:** porque aca toma que las bibliografias son a nivel de
institucion, si mal no me acuerdo.

**Esteban Cortes Sandoval:** Si.

**Eduardo Bacon:** Entonces, y se relacionan,

**Esteban Cortes Sandoval:** Aja.

**Eduardo Bacon:** eh, una relacion entre la bibliografia con el programa
academico. Entonces, aqui esta mostrando toda la bibliografia.

**Esteban Cortes Sandoval:** Ya. Porque estan en el objeto aparte. Claro.
Entonces tenemos aca activity y lu reference.

**Eduardo Bacon:** Claro.

**Esteban Cortes Sandoval:** Yo creo que ahi tenemos que aplicar capa de
lenguaje para lo que vayamos a mostrar el viernes para que idealmente arriba en
vez de Academia Activity diga como programa de asignatura y referencia

**Eduardo Bacon:** Ya.

**Esteban Cortes Sandoval:** bibliograficas.

**Eduardo Bacon:** Si. Ahi. Eh, esto yo habia visto que se puede aplicar capa
lenguaje, no, no hay problema con eso. Si hay un punto que, por ejemplo,

**Juan Diego Galdames:** Hm.

**Eduardo Bacon:** es a a ver con Yupi One, me confirma siempre Juan de ahi si
estoy en lo correcto o no. Esto es en base a lo que voy descubriendo,

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** que no hay forma de hacer capa de lenguaje en los elementos
que estan en una

### 00:44:20 — Caveat: i18n de instancias en tablas no soportado

**Juan Diego Galdames:** Si,

**Eduardo Bacon:** tabla. Claro,

**Juan Diego Galdames:** en los datos como no de momento no no es algo que
estaba trabajando

**Eduardo Bacon:** aqui no logre encontrar porque Claro,

**Juan Diego Galdames:** Nelson, pero

**Eduardo Bacon:** por ejemplo, me topa,

**Juan Diego Galdames:** si.

**Eduardo Bacon:** porque aqui ya esta el approf,

**Esteban Cortes Sandoval:** Ah.

**Eduardo Bacon:** pero hay otros donde era aca, por ejemplo, principal true.
Entonces esto, ah, quiero que se vea, ¿si o no? se vea, ¿no? El que el usuario
vea un true o false,

**Esteban Cortes Sandoval:** Ya.

**Eduardo Bacon:** no es muy

**Esteban Cortes Sandoval:** Y el y el estos son como todos los genom que
tenemos tambien, ¿o no?

**Eduardo Bacon:** crudo.

**Esteban Cortes Sandoval:** Como el modo de entrega que dice in person, que
seria como la modalidad,

**Juan Diego Galdames:** Hm.

**Esteban Cortes Sandoval:** ya todo esos son como datos que estan como en de
los objetos,

**Eduardo Bacon:** Claro,

**Esteban Cortes Sandoval:** pero que necesitamos darle una capa lenguaje,
¿cierto? Ya.

**Eduardo Bacon:** exactom.

**Juan Diego Galdames:** Si,

**Esteban Cortes Sandoval:** Okay.

**Juan Diego Galdames:** eso no no esta de momento en Yupan, o sea, lo que es
un valor de de una instancia no se puede traducir de momento.

**Esteban Cortes Sandoval:** Ya.

### 00:45:16 — Decision: enums en ingles + Bailey instalable

**Esteban Cortes Sandoval:** Okay.

**Juan Diego Galdames:** Asi como esta ahora se esta trabajando para que se
pueda,

**Esteban Cortes Sandoval:** Ya.

**Juan Diego Galdames:** pero asi

**Esteban Cortes Sandoval:** Si. Yo creo que habria que dejarlos ahora por
ahora en ingles no mas,

**Eduardo Bacon:** Dale. Ah,

**Esteban Cortes Sandoval:** porque si los vamos despues a dejar, o sea,

**Juan Diego Galdames:** como

**Eduardo Bacon:** ya.

**Esteban Cortes Sandoval:** todos los ENUM deberian tener como esa capacidad
de poder porque los tenemos en ingles como por un tema de orden de codigo, pero
claro, representan una informacion que deberia pasar por la camara, pero
estandar.

**Juan Diego Galdames:** claro.

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** Ya, de acuerdo, de acuerdo. Bueno, okay. Yo no
tengo mas dudas.

**Eduardo Bacon:** Pero eso eso en relacion a a lo que esta en el en el crud
que se esta armando con con este y lo otro del sprint fue

**Juan Diego Galdames:** Uite

**Eduardo Bacon:** hacer una modificacion pequeña Bailey que me faltaba que era
para poder hacer la instalacion facil porque habia que hacer la instalacion en
diferentes niveles con el el Scat que maneja, etcetera. Asi que eso ya paso a
manos de de Juandi. Ju dijo que lo logro correr, asi que estamos okay. Baile
esta se esta esparciendo.

**Juan Diego Galdames:** Si, ya ya tuvo ya ya tuvo su primera su primer su
primera prueba fuera de de tu

### 00:46:17 — Bailey: review como herramienta universal + repo

**Esteban Cortes Sandoval:** ¿Y

**Juan Diego Galdames:** computador, ¿no? Esta esta super esta yo le comentaba
a Edu, que deberiamos mostrarlo en la en la review como una herramienta para
que sea como universal para ademas

**Eduardo Bacon:** Mhm.

**Juan Diego Galdames:** tambien nos sirva de fuente de la verdad para sobre
todo lo que son objetos y flujos. No.

**Esteban Cortes Sandoval:** donde lo podemos subir a nivel de codigo? Como
para no pasarnos los enter como toma aqui.

**Eduardo Bacon:** Si, ahi va el punto. Yo estuve revisando y se pueden crear
repositorios dentro de Gira o por lo menos yo tengo el permiso para

**Juan Diego Galdames:** Hm.

**Eduardo Bacon:** crear el repositorio dentro de Gira. No hice la prueba de
crearlo, solo dije, "Ah, crear si como que parece que me deja, pero habria que
confirmar con plataforma para ver el el punto y hacerlo ordenado y tambien

**Juan Diego Galdames:** H.

**Eduardo Bacon:** coordinar si es que eso entonces lo vamos a dejar como un
repositorio aparte o va a pasar a estar dentro de los repositorios que estan
especificados dentro de UPAN,

**Esteban Cortes Sandoval:** en si,

**Eduardo Bacon:** que yo creo que deberia ir por ahi.

**Juan Diego Galdames:** Si,

**Esteban Cortes Sandoval:** yo tambien.

**Eduardo Bacon:** Entonces,

**Juan Diego Galdames:** yo creo que podria entrar de porque si al final algo
que vamos a ocupar todos deberia estar ahi en el donde estan el resto de

### 00:47:19 — Bailey: cubre Mac (Eduardo) + Windows (Juan)

**Eduardo Bacon:** h,

**Juan Diego Galdames:** estan los de

**Esteban Cortes Sandoval:** y lo vamos a usar para eh entonces ya se puede

**Juan Diego Galdames:** Claro.

**Eduardo Bacon:** claro.

**Esteban Cortes Sandoval:** alguien mas lo puede instalar, ¿no?

**Juan Diego Galdames:** Si, se lo podria pasar a a Claus para que lo le eche
una mirada.

**Esteban Cortes Sandoval:** Esta muy emocionado. Yo le comente lo que hacia y
dijo por que muchas gracias.

**Eduardo Bacon:** Hm.

**Esteban Cortes Sandoval:** ¿De donde estuviste todo este

**Eduardo Bacon:** Ah,

**Esteban Cortes Sandoval:** tiempo?

**Eduardo Bacon:** mi pregunta que me queda ahi era, Juandi, ¿tu lo instalaste
en Macos o en Windows?

**Juan Diego Galdames:** No, en Windows,

**Eduardo Bacon:** Ah,

**Juan Diego Galdames:** en

**Eduardo Bacon:** ya te funciono.

**Esteban Cortes Sandoval:** Ah,

**Juan Diego Galdames:** Si,

**Esteban Cortes Sandoval:** porque tu teneis mas,

**Eduardo Bacon:** que esta claro a cubrir

**Esteban Cortes Sandoval:** ¿no? Ya. Entonces cubrimos los dos. Bueno,

**Juan Diego Galdames:** si, si. Y no,

**Esteban Cortes Sandoval:** aca ya.

**Juan Diego Galdames:** y no conozco a nadie que tenga Linux de en un planer,
al menos de de los que conozco,

**Eduardo Bacon:** si

**Juan Diego Galdames:** pero si funciono.

### 00:48:04 — Bailey: 2 comandos + estrategia review (15-20 min)

**Juan Diego Galdames:** Hice el el tercer comando, el que era con npm y
funciono todo. Okay. Funciono el el ran setup y despues el render.

**Eduardo Bacon:** eso debia cubrir todo eso facil con dos comandos y listo.
Estaba instalado

**Esteban Cortes Sandoval:** Ya, bacan, baca. Si, entonces tenemos que mostrar
eso tambien,

**Juan Diego Galdames:** Si.

**Esteban Cortes Sandoval:** si o si, ¿eh?

**Eduardo Bacon:** corriendo.

**Esteban Cortes Sandoval:** Asi que yo creo te voy a pedir alguna. Tipicamente
ustedes han visto como son los review, porque hay como una presentacion que
esta mas o menos cosi como con lo que vamos a hacer igual.

**Juan Diego Galdames:** Hm.

**Esteban Cortes Sandoval:** Eh, a mi me gustaria como poner en la presentacion
como lo que hicimos, pero despues que tu mostrar ahi como desde tu local el
navegar por lo que

**Juan Diego Galdames:** Hm.

**Esteban Cortes Sandoval:** esta habilitado y tambien baile como mostrarlo mas
que poner,

**Eduardo Bacon:** Mhm. Si,

**Esteban Cortes Sandoval:** o sea,

**Eduardo Bacon:** si.

**Esteban Cortes Sandoval:** no quiero poner un kit, pero tampoco quiero que no
alarguemos tanto porque vamos a tener los minutos que tenemos como equipo, asi
que va a ser como una revision de unos 15,

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** 20 minutos que tendremos maximo, asi que como para
que mane mañana revisamos el discurso.

### 00:49:04 — Bailey: slide + share screen + preguntas

**Esteban Cortes Sandoval:** Luego vamos a mostrar

**Juan Diego Galdames:** Si, yo le decia lo mismo, que podia hacer como dejar
como una diapo que diga como Bailey,

**Eduardo Bacon:** Ya.

**Juan Diego Galdames:** como que es lo que hace,

**Esteban Cortes Sandoval:** que es lo que hace. Aja.

**Juan Diego Galdames:** una pequeña descripcion y despues como que compartir
su pantalla y asi si alguien tiene alguna pregunta ir moviendose

**Esteban Cortes Sandoval:** Mostrado. Aja.

**Juan Diego Galdames:** ahi.

**Esteban Cortes Sandoval:** Eh, ya. Eso. Bueno, Edu, gracias.

**Eduardo Bacon:** Termino con el tema de Ahora estoy en fase de Cuba, revisando
Cuba, asi que voy a voy a incorporar la los comentarios de la capalinguaje y
visuales que hay en el componente custom, pero haciendo QA y documentacion de
de los elementos del componente

**Esteban Cortes Sandoval:** Y esto a nivel de codigo lo teneis como en tu rama
local todavia

**Eduardo Bacon:** que

**Esteban Cortes Sandoval:** no.

**Eduardo Bacon:** eh no esta en el repositorio.

**Esteban Cortes Sandoval:** Ya esta en devel o no.

**Eduardo Bacon:** Tenemos un repo del Si,

**Esteban Cortes Sandoval:** Ya.

**Eduardo Bacon:** el rep esta hasta o sea todo lo funcional que esta aca. Eh,

**Esteban Cortes Sandoval:** Aha.

**Eduardo Bacon:** con esto yo ya estuve corriendo temas de CA ayer, eh, me
faltan y eso no lo he enviado al a la rama todavia, pero lo funcional todo esta
ya en

### 00:50:18 — Avance PDFs UP1 Core (necesario para Assessment)

**Juan Diego Galdames:** Si, no esta.

**Esteban Cortes Sandoval:** Ya,

**Juan Diego Galdames:** Yo yo yo me meti al repo y he estado para corregir los
errores que habia encontrado la otra vez tenia que tener el esta vista
funcionando para para ir probando los casos

**Esteban Cortes Sandoval:** ya. Bueno, para ver si me puedo traer los cambios.
Yo no tengo levantado P one,

**Juan Diego Galdames:** de

**Esteban Cortes Sandoval:** pero tengo al menos el codigo, entonces me sirve
para ir analizando algunas cositas. Dale, Juand para comentarnos algo.

**Juan Diego Galdames:** e o sea mas o menos lo mismo que ido comentando por
las por las daily asincronicas, basicamente. Eh, estuve trabajando, la prioridad
siempre fue ir habilitando eh desde UPF encontrando y ahora estoy metido en la
parte de de del tema de los PDFs que me ha porque de UP1 core hay una hay un
requerimiento de poder descargar PDFs que es algo parte de lo que necesitamos
nosotros en Asman. Entonces, ese igual me ha estado sirviendo para eh ir
probando alternativas y bueno, ahora hoy dia no no he avanzado tanto porque en
la mañana hubo un hubo hay un hot que mandar porque se estaba cayendo eh se
estaba cayendo la S de la rama de velo, pero ahi ya lo arregle.

### 00:51:24 — Librerias PDF: 2 alternativas + lambdas AWS

**Juan Diego Galdames:** Asi que ya despues de esto voy a seguir duro con el
tema de los de los PDF.

**Esteban Cortes Sandoval:** ¿Que hay encontrado por ahora? ¿Como que
alternativa mirado algo?

**Juan Diego Galdames:** Eh, hay dos librerias que he estado revisando, la
verdad. Eh,

**Esteban Cortes Sandoval:** Mhm.

**Juan Diego Galdames:** para el caso del de lo que requiere UP One han
funcionado bien, no tienen tanta flexibilidad para eh evitar cosas. Y la otra
alternativa que voy a probar mas adelante, eh, o sea, que investigar y hacer
una prueba cortita es con, eh, yo diria que con funciones de lambda en en AWS,
que puede ser otra otra alternativa ya mas que sea tambien eh nativa de la nube
y asi no no no le consuma al object manager

**Esteban Cortes Sandoval:** recursos,

**Juan Diego Galdames:** recursos.

**Esteban Cortes Sandoval:** pero ahi el flujo que estaban necesitando para UP1
era, o sea, la generacion del PDF es el PDF de que datos

**Juan Diego Galdames:** el que esta es el lo que quiere la

**Esteban Cortes Sandoval:** como

**Juan Diego Galdames:** esta primera historia del PDF es generar eh es generar
un PDF de lo que yo estoy viendo en el listado en este momento. Entonces, por
ejemplo,

**Esteban Cortes Sandoval:** ya.

**Juan Diego Galdames:** si yo tengo este record list y le aplico un filtro,
quito columnas o muestro,

### 00:52:33 — Foto de tabla con filtros + columnas

**Esteban Cortes Sandoval:** Mm,

**Juan Diego Galdames:** no se, en vez de cinco datos, muestro 20 datos, como
hacer como sacar una foto basicamente de lo que estoy viendo en ese momento,

**Esteban Cortes Sandoval:** ya.

**Juan Diego Galdames:** respetando recordes,

**Esteban Cortes Sandoval:** Okay.

**Juan Diego Galdames:** custom fields.

**Esteban Cortes Sandoval:** Ya, pero es una foto de la tabla, por asi.

**Juan Diego Galdames:** Claro, claro. Esa es la primera.

**Esteban Cortes Sandoval:** Ya,

**Juan Diego Galdames:** Esa es como lo que requiere eh Yupi One de

**Esteban Cortes Sandoval:** ya. Okay.

**Juan Diego Galdames:** momento.

**Esteban Cortes Sandoval:** Y ahi la libreria tiene como una flujo especifico
o como que formatear los datos y despues como reconstruir la informacion. ¿Como
como ocurre eso tecnicamente hablando las librerias que esta usando?

**Juan Diego Galdames:** Eh, o sea, de momento lo que he probado es es una
version como bastante, no he probado como mas configuraciones, pero es algo
bastante como declarativo, o sea, como ya quiero descargarlo de esta forma,
como haciendo como un eh como un espejo de lo que estoy viendo en el momento,

**Esteban Cortes Sandoval:** Ya,

**Juan Diego Galdames:** pero ya en temas visuales y de formato ahi no no he
jugado tanto,

**Esteban Cortes Sandoval:** ya.

**Juan Diego Galdames:** pero se que se puede con esta libreria se pueden hacer
mas cositas ahi despues cuando ya tenga decidida cual voy a usar para la tarea,
lo voy a mandar como lo voy a dejar como con voy a dejar esa libreria como un
nombre de las alternativas que que puedan estar para

### 00:53:43 — Lambda como medio (no PDF-specific)

**Juan Diego Galdames:** lo que necesitamos nosotros despues en en

**Esteban Cortes Sandoval:** Ya,

**Juan Diego Galdames:** Assessment.

**Esteban Cortes Sandoval:** ya. Aca. Okay. Si, porque cuando tu lo comentais
desde el punto de vista de lambda functions, en realidad el lambda es como un
medio,

**Juan Diego Galdames:** Hm.

**Esteban Cortes Sandoval:** ¿cierto? Porque despues en el funcion teneis que
construir como que es la que es la funcion que v a utilizar como

**Juan Diego Galdames:** Claro.

**Esteban Cortes Sandoval:** para eh solamente que es un medio como mandarlo a
ejecutar ahi.

**Juan Diego Galdames:** Claro.

**Esteban Cortes Sandoval:** Mm. Vale. Si, si, vale. Cre que era para cachar

**Juan Diego Galdames:** CL. Si, claro.

**Esteban Cortes Sandoval:** eso.

**Juan Diego Galdames:** En el fondo la diferencia es como de de la vista
arquitectonica en el fondo como

**Eduardo Bacon:** M.

**Juan Diego Galdames:** de

**Esteban Cortes Sandoval:** Si, porque los lambda en realidad como que es una
capacidad que no es necesariamente explicita para el PDF,

**Juan Diego Galdames:** Claro, claro.

**Esteban Cortes Sandoval:** sino que es una capacidad eh generica que el tener
la habilitada sirve y poder utilizarla para los PDF, ¿no? como otras
capacidades de, no se, algun el uso de recursos, entiendo cierto,

### 00:54:30 — Assessment: tomar formulario → template → PDF

**Juan Diego Galdames:** H

**Esteban Cortes Sandoval:** que es distinto, eh, pero en si, cierto, ahi
tendemos que decir como claro, como esas librerias que que estamos hablando nos
sirven como para la necesidad que hablamos como de un template y y la
generacion de un documento, cacha, pues yo entiendo que las librerias que tu
comentas son como orientadas a eso, como lo que yo estoy viendo funcionalmente
lo voy a descargar a un a un PDF, ¿cierto? Las librerias que nosotros hemos
trabajado en el contexto de de ¿como se llama?

**Juan Diego Galdames:** Claro,

**Esteban Cortes Sandoval:** Eh, de assessment son como, "Okay, yo tengo un
documento Word que voy a generar a PDF."

**Juan Diego Galdames:** claro.

**Esteban Cortes Sandoval:** Eh, en realidad lo que como el core de la del
trabajo, creo yo, para nosotros es como como tomar el formulario, mapearlo al a
un template, porque despues presumo que el llevar el template un PDF es como
algo que no es una no es una complejidad

**Juan Diego Galdames:** Hm. Claro.

**Esteban Cortes Sandoval:** tecnica, complejidad tecnica tanto. E ya, okay,
eso. Entonces, mañana puse una cita en la mañana para que revisemos backlock y
analicemos como todo lo que alcanzamos en este sprint y en base a eso definamos
entonces en lo siguiente, lo que vamos a hacer en el sprint siguiente.

### 00:55:53 — Pre-planning + decision: core o dinamismo formularios

**Esteban Cortes Sandoval:** Eh, y con eso puedes ir definiendo es como un pre
planning, digamos, del viernes porque para que tengamos mas tiempo tambien como
estamos en estas primeras etapas de decidir hacia cuales van a ser los
siguientes pasos.

**Juan Diego Galdames:** He.

**Esteban Cortes Sandoval:** para ver si seguimos con otra funcionalidad core o
si vamos al tema de el dinamismo de los formularios. tenemos como ahi ahora que
ya tenemos como lo primero andando, eh, asi que por eso puse una sesion para
que tengamos doble y aprovechamos tambien de dejar alineado lo que vamos a
presentar

**Eduardo Bacon:** Puedo

**Esteban Cortes Sandoval:** el viernes. Asi que

**Eduardo Bacon:** hacer una una peticion.

**Esteban Cortes Sandoval:** eso.

**Eduardo Bacon:** Si no se puede, no importa, pero no se si se habran dado
cuenta que yo funciono mucho en base a mis fanatismo.

**Juan Diego Galdames:** H

**Eduardo Bacon:** El nombre de Bailey nace de de ahi y otro de mis fanatismos
va en

**Esteban Cortes Sandoval:** Mhm. Mhm.

**Eduardo Bacon:** si la presentacion puede Bailey presentarse como un one more
thing al estilo JS presentando Apple en su momento.

**Esteban Cortes Sandoval:** como un Ah, esperame, me falta Lore. No, no te
estoy

**Eduardo Bacon:** que Steve Jobs cuando presentaba en su momento hacia las
keyot de Apple,

**Esteban Cortes Sandoval:** entendiendo.

**Eduardo Bacon:** estamos hablando tiempo de presentacion de iPhone y cosas
por el estilo,

### 00:57:06 — One More Thing (estilo Steve Jobs)

**Esteban Cortes Sandoval:** Aja.

**Eduardo Bacon:** hacia la presentacion de todas las cosas y siempre guardaba
una bomba al final. Entonces, antes terminaba la presentacion y decia,

**Esteban Cortes Sandoval:** Okay,

**Eduardo Bacon:** "Bore thing" y aparecia la pantalla one more thing y pa te
aparecia algo y ese era como w

**Juan Diego Galdames:** H

**Eduardo Bacon:** listo eso rompia el poco internet que habia en ese en ese

**Esteban Cortes Sandoval:** ya lo estoy viendo.

**Eduardo Bacon:** momento.

**Esteban Cortes Sandoval:** Ya, ya encontre la imagen. Okay. Aja. Okay,

**Eduardo Bacon:** Entonces que Bailey sea nuestro One More

**Esteban Cortes Sandoval:** ya me parece.

**Eduardo Bacon:** 5.

**Esteban Cortes Sandoval:** Entonces ponemos la slide de lo primero,

**Juan Diego Galdames:** Ah,

**Esteban Cortes Sandoval:** hablamos de lo primero y dejamos one more thing y
de ahi ponemos bail. De acuerdo,

**Eduardo Bacon:** Claro.

**Juan Diego Galdames:** claro,

**Eduardo Bacon:** Y la rompemos.

**Juan Diego Galdames:** claro.

**Esteban Cortes Sandoval:** sol.

**Juan Diego Galdames:** Pasa, ponemos tu computadora en un tu notebook en un
sobre, asi como cuando presento el map y como y y ahi lo abre y esta Bailey

**Eduardo Bacon:** Claro,

**Esteban Cortes Sandoval:** Aja. Ya me parece.

**Juan Diego Galdames:** funcionando.

**Eduardo Bacon:** claro.

**Esteban Cortes Sandoval:** Ya.

### 00:57:50 — i18n: nombres en JSON para demo

**Esteban Cortes Sandoval:** Okay. Okay. Mañana miramos los detalles de eso en
la tambien.

**Eduardo Bacon:** Si,

**Esteban Cortes Sandoval:** Ya la guardo. La

**Juan Diego Galdames:** Ya. Lo otro eh porque lo puedo hacer al tiro yo, eh,

**Esteban Cortes Sandoval:** guardo.

**Eduardo Bacon:** eso.

**Juan Diego Galdames:** ¿cuales van a ser los nombres como en ingles y en
español de Academic Activity y bibliografia para agregarlos el tiro en la en
capa de lenguaje? Porque eso va como una seccion especial de objetos que en en
las en hay un Jason de donde estan como las traducciones de objeto, entonces lo
puedo agregar al

**Esteban Cortes Sandoval:** Ah,

**Juan Diego Galdames:** tiro.

**Esteban Cortes Sandoval:** y ahi yo tengo una duda entonces, porque es el
objeto que tiene una traduccion especial, ¿cierto?

**Juan Diego Galdames:** Si.

**Esteban Cortes Sandoval:** Y ese objeto, ese nombre de ese objeto va a tomar
aca, va a tomar el mismo nombre, digamos, aca en en lo que estamos viendo en la
pestaña.

**Juan Diego Galdames:** Claro, si. lo que las primeras versiones de este de
esta pestaña mostraban como el primer layout que te aparecia, pero ahi causaba
confusion porque en el fondo,

**Esteban Cortes Sandoval:** Mm.

**Juan Diego Galdames:** no se, puedes tener un layout con un titulo que no te
decia especificamente de que objeto era y como la agrupacion siempre ha sido
por objetos, quedo en que mostrara el eh siempre el nombre del objeto y
entonces la traduccion que va ahi es el el nombre del objeto.

### 00:58:54 — Nombre objeto vs nombre record (servicio vs programa)

**Juan Diego Galdames:** que no se cambia a otras apps que esten dentro de la
capa lenguaje, van a mostrar el esa traduccion como en español del no no el
nombre tecnico del

**Esteban Cortes Sandoval:** Eh, ya. Si,

**Juan Diego Galdames:** objeto.

**Esteban Cortes Sandoval:** porque es que a lo que voy es que no se si
llamarlo. Eh, ¿cual es el problema? Ya, esto es cierto, es Academia Activity y
va a tener un record, ¿cierto?

**Juan Diego Galdames:** Hm.

**Esteban Cortes Sandoval:** Nosotros tenemos el record de curso y por ejemplo
va a tener el record de servicio. Por lo tanto, cuando ellos lo utilicen en el
contexto de engagement, probablemente esa pestaña deberia decir servicio,

**Juan Diego Galdames:** Hm.

**Esteban Cortes Sandoval:** pero cuando nosotros lo utilicemos va a decir
programa de asignatura. Entonces, por eso me queda la duda, porque entonces si
lo que estamos mostrando es un nombre eh generico para todo,

**Juan Diego Galdames:** Ya.

**Esteban Cortes Sandoval:** pero despues desde donde se utiliza debido a los
recortes, podria estar tomando un nombre distinto y quiza entonces se tendriase
una necesidad de una capacidad como distinta en Jop One,

**Juan Diego Galdames:** Si.

**Esteban Cortes Sandoval:** ¿no? Me cachais el punto,

**Juan Diego Galdames:** Si, si, si.

### 00:59:52 — Pestañas separadas por record_type (estudiante / profesor)

**Juan Diego Galdames:** No entiendo como que la pestaña eh agarre el recorde.

**Esteban Cortes Sandoval:** ¿no?

**Juan Diego Galdames:** En este

**Esteban Cortes Sandoval:** Claro, como un nombre mas asociado al record,

**Juan Diego Galdames:** caso,

**Esteban Cortes Sandoval:** porque claro, el objeto lo vamos a utilizar de
maneras transversales, pero quizas en un mod no lo vamos a llamar de la misma
forma. Ese ese es como el punto porque podriamos decirle como actividad,

**Juan Diego Galdames:** claro.

**Esteban Cortes Sandoval:** pero para en el contexto de alguien de que no es
de asesment no tiene sentido. En realidad lo que yo estoy viendo ahi es la
informacion del programa de asignatura. Es como lo tiene Edu cuando le pone la
seleccion, ¿cierto? A la vista.

**Juan Diego Galdames:** Claro, en ese caso ahi que eh porque estoy pensando
como formas de de solucionarlo, no se, pues si yo estoy dentro de una misma app
y voy a ver eh varias como recordes del

**Esteban Cortes Sandoval:** Mhm.

**Juan Diego Galdames:** mismo objeto, me convendria en el fondo que los
recordes fueran tabs diferentes a que estuvieran todos dentro de la misma tab.
En ese caso, por ejemplo, yo podria tener, no se, ejemplo, con el record de de
core user que tiene record type de como estudiante y no

**Esteban Cortes Sandoval:** Claro.

### 01:00:50 — Core user: estudiante / instructor / administrativo (objetos distintos)

**Juan Diego Galdames:** se,

**Esteban Cortes Sandoval:** Si, el recorde lo voy a terminar. Claro.

**Juan Diego Galdames:** claro,

**Esteban Cortes Sandoval:** Si,

**Juan Diego Galdames:** yo tener como una tab de estudiantes y una tab de
profesores,

**Esteban Cortes Sandoval:** vamos a hacer Si,

**Juan Diego Galdames:** por ejemplo,

**Esteban Cortes Sandoval:** si,

**Juan Diego Galdames:** no como Ya,

**Esteban Cortes Sandoval:** exacto. No, como creo yo creo que si deberiamos
tener esa capacidad. Si, si.

**Juan Diego Galdames:** ya.

**Esteban Cortes Sandoval:** Respecto a eso y ojo ahi que por lo que por lo que
hablamos en una reunion esta semana parece que el core user vamos a diferenciar
los usuarios de estudiante y eh administrativos y instructores que son como los
docentes en objetos que no van a ser recorta, sino que van a ser objetos
distintos solo porque eh hay

**Juan Diego Galdames:** Hm.

**Esteban Cortes Sandoval:** aplicaciones para las cuales necesitamos a la
persona mas no necesitamos que sea un usuario del sistema.

**Juan Diego Galdames:** Hm.

**Esteban Cortes Sandoval:** Por ejemplo, en Access yo voy a querer sacar
metricas de como los estudiantes van logrando su perfil de de egreso. Quiere
decir que necesito tener datos de los estudiantes, pero no necesariamente
necesito que los estudiantes ingresen a SESP porque es una aplicacion orientada
hacia usuarios funcionales y ahi como Cloud nos dijo,

### 01:01:52 — Cloud: cambios + nombres demo (programa asignatura, ref bibliografica)

**Juan Diego Galdames:** Claro.

**Esteban Cortes Sandoval:** claro, pero si estan en core user van a ser
usuarios, por lo tanto se va a diferenciar eso, ¿cierto? Entonces yo podria
tener un estudiante que no tiene una relacion corer porque no es un usuario,
pero para otra aplicacion. Por ejemplo, engagement, si tengo un estudiante que
va a entrar a la aplicacion, entonces si va a ser un usuario. Entonces,
solamente voy a comentarlo que hoy dia salio ya en una y probablemente cloud,

**Juan Diego Galdames:** Ah ya.

**Esteban Cortes Sandoval:** entonces ahi va a estar aplicando esos cambios,
pero el ejemplo que dijiste era el correcto igual como a nivel de esa era una
buena forma de esquematizar que para recortar probablemente vamos a tener que
mirarlos como a nivel de recorte como pestañ

**Juan Diego Galdames:** Ya. Si, tambien lo lo voy a notar porque me parece
tambien lo lo correcto en el fondo que se vea el el

**Esteban Cortes Sandoval:** eh en el en el caso de como vamos a hacer la demo,

**Juan Diego Galdames:** record.

**Esteban Cortes Sandoval:** yo diria que Academy Activity le pongamos programa
asignatura y lo voy a anotar aca y

**Juan Diego Galdames:** Claro.

**Esteban Cortes Sandoval:** referencia bibliografica al otro, ¿cacha? Pero
probablemente eso despues lo cambiemos con este

**Juan Diego Galdames:** Ya, ya. Pero eso cambiaron Jason de momento,

**Eduardo Bacon:** M.

**Esteban Cortes Sandoval:** ajuste.

**Juan Diego Galdames:** asi que cuando ya cuando ya sea el tema, cuando
entremos con a desarrollar lo de los recordes ahi ya va a cambiar la
complejidad, pero para para mañana ya es lo lo agrego yo al al Jason como
program

**Esteban Cortes Sandoval:** Aja.

**Juan Diego Galdames:** asignatura.

**Esteban Cortes Sandoval:** Eso ya chiquillos.

**Juan Diego Galdames:** Ya

**Esteban Cortes Sandoval:** Hablamos mañana, entonces. Con mas seguridad

**Eduardo Bacon:** Okay,

**Juan Diego Galdames:** s que est muy bien.

**Eduardo Bacon:** ya. Chao,

**Juan Diego Galdames:** Chao.

**Eduardo Bacon:** nos vemos.

**Juan Diego Galdames:** Co?

**Eduardo Bacon:** segundos.

> La transcripcion finalizo despues de 01:03:20.
> Esta transcripcion editable se ha generado por ordenador y puede contener
> errores. Los usuarios tambien pueden cambiar el texto despues de que se haya
> generado.

## Outcomes

### Current — afecta trabajo en curso

| # | Tipo | Item | Dueño | Refs |
|---|------|------|-------|------|
| C1 | change | Renombrar AcademicActivity → Activity (puede haber actividades no academicas) | Esteban | UPONE-1033, UPONE-1034, UPONE-1035 |
| C2 | decision | Objetos de negocio SIN prefijo de modulo (≠ Suite Legacy con IMP/CLS/HW). Razon: parte del modelo general UP1, consumibles por cualquier mod | equipo | — |
| C3 | change | Componente CustomSection: content_type y max_length son config, no input de usuario funcional. Separar en el formulario | Eduardo | — |
| C4 | change | Aplicar i18n a pestañas: mostrar "Programa de asignatura" y "Referencia bibliografica" en lugar de "AcademicActivity" (provisional, cambia con record_types) | Juan | — |
| C5 | change | Fix visual evaluacion: titulo no aparece dentro del rectangulo, tamaño distinto a otros componentes — ocupa espacio innecesario | Eduardo | — |
| C6 | decision | Valores enum (in_person) y booleanos (true/false) en tablas: dejar en ingles por ahora. Razon: i18n de instancias en desarrollo en UP1 | equipo | — |
| C7 | action | Subir Bailey a repo dentro de UPAN (no como repo aparte) + compartir con Claus para feedback | Eduardo, Juan | — |
| C8 | action | Presentar Bailey en review viernes como "One More Thing" estilo Steve Jobs (al final de la review) | Esteban, Eduardo | — |
| C9 | action | Sesion pre-planning manana: revisar backlog + logros + definir foco proximo sprint | Esteban + grupo | — |

### Future — para tickets que aun no existen

| # | Tipo | Item | Tema/Module | Cuando aplique |
|---|------|------|-------------|----------------|
| F1 | scope | Workflow object model: workflow_status, workflow (con scope plan_estudio/curso/competencias/booking), workflow_transition (start→end), workflow_log (polimorfico, historico) | curriculum-design / workflow | proximo sprint |
| F2 | scope | Activity.status pasa de campo directo a referencia al nuevo workflow | curriculum-design | proximo sprint, junto con F1 |
| F3 | scope | execution_unit pasa a ser parte de record_type | data model | proximo sprint |
| F4 | scope | Nuevo campo governance_unit_ids para diferenciar entidad que diseña vs ejecuta (caso servicios) | data model | proximo sprint |
| F5 | capability | Mantenedor visual de flujos estilo Jira (cada institucion define sus flujos) | UP1 core | despues del modelo |
| F6 | capability | Multiples flujos por scope dentro de una institucion (ej 5 flujos para curriculum, uno default + seleccion por caso) | UP1 core | despues de F5 |
| F7 | capability | Pestañas asociadas a record_type (no al objeto): Activity con records "curso" y "servicio" → pestañas separadas con nombres distintos por contexto. Anotado por Juan | UP1 core | descubrimiento clave |
| F8 | capability | Cambio rapido vista→edicion (switch en modal/titulo de tab) sin cerrar/volver/abrir. Anotado como "core para UP1" | UP1 core | UX improvement |
| F9 | capability | i18n de valores de instancia (enum/boolean en tablas). En desarrollo en UP1 | UP1 core | en desarrollo |
| F10 | capability | Generacion de PDFs: primera historia = "foto" de tabla con filtros + columnas + records. Necesario para Assessment. Alternativas: librerias declarativas vs lambdas AWS | UP1 core | sprint proximo o el siguiente |
| F11 | dependency | Decision Cloud sobre core_user: ¿estudiantes/administrativos/instructores son objetos distintos o record_types? Caso Access (datos sin user) lo motiva | core / Cloud | bloqueante para Engagement / Access |
| F12 | scope | Dinamismo de formularios: composicion dinamica de pestañas. Pendiente decidir si es proximo sprint o el siguiente | UP1 core | decision pre-planning |

### Context — info de fondo

| # | Tipo | Item |
|---|------|------|
| X1 | clarification | "core" tiene 2 significados: core abstracto (core_user, core_role, internals UP1) vs core de negocio (objetos consumibles por cualquier mod) |
| X2 | clarification | Flujo de objetos en mods: crear en repo del mod → sync los copia a UP1 → PR al Object Manager. Source of truth final = Object Manager |
| X3 | caveat | i18n de valores de instancia en tablas no soportado actualmente. En desarrollo |
| X4 | caveat | Modo edit/view tediosos: hay que cerrar uno para entrar al otro. Identificado como UX problem (motiva F8) |
| X5 | caveat | No hay devs Linux en uPlanner. Bailey solo se prueba en Mac + Windows |
| X6 | clarification | Bailey: instalacion reducida a 2 comandos (run setup + render). Funcionando en Windows (Juan) y Mac (Eduardo) |

### Notas de extraccion

(Ninguna — todos los items se clasificaron en la taxonomia.)
