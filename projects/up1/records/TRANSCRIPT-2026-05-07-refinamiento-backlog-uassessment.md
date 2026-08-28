---
id: TRANSCRIPT-2026-05-07-refinamiento-backlog-uassessment
project: up1
type: transcript
module: curriculum-design
tags:
  - curriculum-design
  - sync
  - sprint-planning
  - refinamiento-backlog
  - workflow
  - versionamiento
  - change-log
  - custom-section
  - pdf
---

# Reunion 2026-05-07 — Refinamiento backlog migracion uAssessment

> Transcripcion generada por Gemini Notes a partir del audio. Puede contener
> errores de speech-to-text. El verbatim diario-por-dia (## Transcripcion verbatim)
> se conserva integro como fuente de verdad para las decisiones que la
> referencien. Para preservar el PDF original de Gemini, subir a
> `2026-05-07-refinamiento-backlog-uassessment.attachments/` y declarar en
> `attachments` del frontmatter.

## Contexto

Refinamiento del backlog del segundo sprint del equipo Learning Assessment (uAssessment).
Continuacion de la reunion del 2026-05-06 (sync uP1 Learning Assessment). Dos focos:
(1) ajustar la presentacion del review del dia siguiente, (2) planificar el alcance
del segundo sprint. La presentacion incluye demo en vivo del CRUD curriculum-design,
explicacion del modelo de workflow (esquema simple), modelo de objetos, libreria
PDFMake, y Bailey como "One More Thing". El sprint planning identifica capacidades
core de UP1 a empujar (dinamismo de formularios, gestion de estados con trazabilidad,
versionamiento, soft delete, carga de archivos) y capacidades de mod a abordar
(change log, modelo de objetos de workflow, agrupacion de custom sections, vista
versiones vigentes).

## Notas Gemini — Resumen

El equipo planifico entregables del segundo sprint para optimizar visualizacion,
gestion de versiones y procesos core.

**Presentacion y visualizacion**: presentar el sistema en vivo usando esquemas
simples para evitar spoilers. Integrar Bailey como modulo dentro de la plataforma
para mejorar el monitoreo.

**Configuracion y dinamismo**: implementar multiples pestañas en formularios y
añadir campos de sub-seccion para organizar mejor los datos personalizados. Este
cambio permitira una gestion dinamica de registros y secciones.

**Trazabilidad y versionamiento**: implementar un registro de historial de cambios
y una logica para gestionar versiones vigentes de documentos. Se priorizara el
modelo de objetos para futuras funcionalidades core.

## Notas Gemini — Proximos pasos

- [Eduardo Bacon] Enviar Captura: Enviar captura de pantalla del sistema corriendo.
- [Esteban Cortes Sandoval] Crear Diagrama: Crear esquema simple de flujo de trabajo
  usando herramientas de diagramacion.
- [Juan Diego Galdames] Configurar Pestañas: Configurar vista de lista de registros
  para mostrar mas de 1 registro en la pestaña durante este sprint.
- [Juan Diego Galdames] Comentar Workflow: Comentar el modelo central de transicion
  de flujo de trabajo con Claus.
- [Eduardo Bacon] Implementar Trazabilidad: Implementar el registro de trazabilidad
  de cambios, usando resolvedor personalizado y explorar N8N si hay tiempo disponible.
- [Eduardo Bacon] Visualizar Historico: Asegurar la visualizacion del historico de
  cambios desde la pestaña del objeto.
- [Esteban Cortes Sandoval] Version Vigente: Revisar logica de versionamiento y la
  falta del campo para identificar la version actual. Incluir columna de campo y
  configurar vista para filtrar por las versiones activas.
- [Esteban Cortes Sandoval] Consultar Eliminacion: Plantear consulta a todos los PMs
  y Claus sobre la eliminacion de records (soft delete). Determinar si se debe
  considerar el eliminar como accion ahora.
- [Eduardo Bacon] Configurar Workflow: Implementar modelo de objetos de workflow.
  Dejar listo con ejemplos para que el equipo Core tenga la estructura para
  implementacion.
- [Esteban Cortes Sandoval] Definir Objeto Archivos: Definir objeto polimorfico para
  guardar la relacion de archivos cargados. Esta capacidad debe ser Core (S3 storage).
- [Eduardo Bacon] Enviar Captura: Enviar captura de la sesion a Esteban Cortes
  Sandoval para sumar a la presentacion.

## Notas Gemini — Detalles (extracto)

- **Afinacion de la presentacion**: Esteban propone revisar y finalizar rapidamente
  la presentacion. Objetivos: configurar curriculum design, version del programa de
  asignatura, tema de objetos, exploracion de PDF.
- **Visuales**: Juan advierte que GIFs en Google Slides se quedan congelados despues
  de la primera reproduccion — preferir imagen estatica.
- **Demo en vivo y captura**: Eduardo presentara el sistema en vivo; envia screenshot
  para slide previa (Esteban aun no tiene entorno levantado).
- **Esquema workflow en slide**: Esteban hara un esquema simple a mano para evitar
  spoiler del modelo Bailey que se mostrara despues.
- **Libreria PDF**: Juan menciona PDFMake brevemente en la parte de UP1 core; base
  para los futuros requisitos de Assessment.
- **Exploracion PDF dinamico**: pendiente la generacion de PDF con template, no
  solo la generacion plana de PDF.
- **Bailey**: resuelve visualizacion del modelo de objetos y artefactos generados
  por UP1 saliendo del esquema archivos/JSON. Tambien permite ver los flujos entre
  apps de UP1 — bien recibido por Claus.
- **Bailey en la nube**: Claus sugiere alojar Bailey en repos core de UP1.
  Eduardo: si Bailey vive dentro de UP1, puede acceder a los archivos JSON y
  renderizar el modelo de objetos. La estructura de navegacion de apps fue mas
  compleja de abordar (requirio meterse en runtime).
- **Configuracion de formularios con pestañas**: forzamos hoy la estructura UP1
  (un record = una tab). Permitir mostrar mas de un record en la misma pestaña
  para acercarse al formato real de la institucion.
- **Solucion dinamica de pestañas**: Juan tomara la historia core (modificar
  configuracion del record para mostrar mas de un record en la misma tab).
- **Custom section**: hoy se ve como bloque conjunto; necesitamos diferenciar
  instancias (ej temario vs descripcion extendida). Propuesta: usar campo
  `sub_section` (analogo al que ya tiene `layout` en UP1 suite) para agrupar
  instancias de `custom_section` y controlar el nombre de la pestaña.
- **Padre/hijo en custom section**: el campo `parent_id` ya es general en
  `base_curricular_section`, pero quedo sin mapear en el ejemplo de datos.
  Permitiria caso temario → temas. Se opta por `sub_section` como agrupacion.
- **Gestion de estados (workflow)**: el cambio de estado debe ser una accion
  separada, no edicion directa del campo `current_status_id`. Genera comentario
  + instancia en `workflow_transition_history`. Necesidad de trazabilidad
  (quien hizo el cambio, cuando, comentario). Decision: empujar a core UP1.
  Eduardo trabajara el modelo de objetos workflow con ejemplos para que Claus/
  core lo retome.
- **Workflow transition history**: el current_state puede no vivir en la
  instancia de activity sino derivarse de `workflow_transition_history` (la
  ultima transicion activa). Esteban evalua agregar campo `current_state` (1/0)
  en transition_history para simplificar el cruce.
- **Change log**: trazabilidad universal de modificaciones. Cada edicion
  genera un registro con `entity_type`, `entity_id`, `user`, `action`, `source`,
  `field`, `old_value`, `new_value`, `wf_transition_history_id`, etc. Vista
  pestaña con historico desde el objeto. Implementacion: empezar con resolver
  custom (callback en cada accion); evaluar N8N en una segunda iteracion. La
  vista de historico se consume desde el academic program.
- **Versionamiento**: hoy `activity` tiene logica padre/hijo (`previous_version`).
  Falta campo `current_version` (vigente) — distinto del estado del workflow
  (publicado/draft/etc.). Vigente = esta siendo usado por estudiantes activos;
  workflow = listo para ser usado. Soluciones para este sprint: agregar columna
  `current_version`, configurar vista por defecto filtrada por vigentes (config),
  vista personalizada con historico completo. Pendiente: accion de creacion de
  nueva version (clonar datos o crear vacia) y navegacion entre versiones desde
  el detalle (el record list no permite movernos entre versiones del mismo
  registro). Evaluar pasar a core.
- **Reglas de vigencia**: solo una version vigente a la vez. Reglas (validacion
  + auto-archivar la anterior) vienen mas adelante cuando se integren plan de
  estudio + dependencias.
- **Soft delete**: la suite legacy usa soft delete; UP1 hoy hace hard delete.
  Si pasa a soft delete: filtrar todos los record list por `active=true` y
  validar cascada a hijos. Consultar a PMs/Claus (Engagement tambien usa soft
  delete fuerte) → no considerar el "eliminar" como accion en este sprint.
- **Personalizacion de vistas detalle**: revisar componentes actuales para
  permitir mas customizaciones por record (mas alla del custom de evaluacion).
- **Carga de archivos adjuntos**: institucion adjunta PDF/Excel al programa de
  asignatura. UP1 no tiene esa capacidad hoy. Capacidad core (S3) + objeto
  polimorfico para relacion. Eduardo abre el modelo, Esteban gestiona la
  capacidad con core.
- **PDF + template**: exploracion alta-prioridad para que la migracion futura
  no rompa el mapeo. Plan: armar el link de datos → JSON especifico → llenar
  template Word → transformar a PDF. Templates varian por tenant (logo,
  estructura).
- **Ambientes de prueba**: solo hay un ambiente (dev/test/demo combinados).
  Bloqueado por infraestructura/plataforma + normativa ISO. Los chiquillos de
  la P/B tienen tenants con sus propias DBs, pero no son ambientes separados.
- **Sandbox Bailey**: capacidad para describirle al LLM un modelo de objetos +
  pasarle el kit candidato de Bailey y cargar visualizacion en Bailey sin tocar
  el mod real de UP1. Util para explorar relaciones antes de implementar.

## Transcripcion verbatim

### 00:00:00 — Apertura: review + pre-planning

**Esteban Cortes Sandoval**: Eh, ya a la sesion de hoy dia tengo pensado en que
primero veamos la presentacion de manana y rapidito como dejarla afinada y despues
miremos como la historia de lo que vamos a hacer el segundo sprint.

**Juan Diego Galdames**: Me parece.

**Esteban Cortes Sandoval**: Ya para la presentacion de manana. Estos eran los
objetivos que habiamos declarado al final en la presentacion anterior: configurar
curriculum design, programa asignatura version, el tema de los objetos y
exploracion de los temas de PDF. Mi idea es incluir una slide comentando un poquito
de lo que hicimos de la configuracion y que estamos buscando — lo primero era
probar que la estructura de objetos que estabamos definiendo nos podia servir para
representar todo lo que necesitamos. Aqui pensaba poner un GIF, no se si una imagen,
no se que opinan ustedes, para rellenar.

**Juan Diego Galdames**: Yo he visto que en las presentaciones de Google
generalmente se queda pegado el GIF, se reproduce una vez y no vuelve a ocurrir.
A lo mejor en una imagen podria ser mejor.

**Esteban Cortes Sandoval**: Ya, porque despues vas a presentar tu Edu como
navegando con una imagen.

**Eduardo Bacon**: Si, pues despues yo presento con el corriendo el sistema.

**Esteban Cortes Sandoval**: Ajá. Ya. Entonces me mandais despues una captura, Edu,
que todavia tengo que levantar UP, asi que no lo tengo.

### 00:01:27 — Esquema flujo trabajo en slide (no spoiler)

**Esteban Cortes Sandoval**: La segunda es, voy a poner una explicacion muy simple
de los objetos de flujo de trabajo. Edu, no se si tu podeis generar una imagen con
Bailey, pero realmente seria como spoiler de lo que vamos a mostrar despues. No, yo
voy a hacer el esquema, no lo voy a hacer con Bailey, solamente para no mostrarlo.

**Eduardo Bacon**: ¿Y no puede ser un screenshot de la parte del esquema, no mas
que se vea la interfaz?

**Esteban Cortes Sandoval**: No, igual igual no porque se van a cachar de donde
salieron. Lo voy a hacer normal, con alguna de las herramientas para hacer flujos,
tampoco es tan complejo.

### 00:02:34 — Comentario libreria PDF Make

**Esteban Cortes Sandoval**: Seria eso, despues comentar los objetos de negocio y
lo de PDF. Ju, ¿quereis comentar algo o lo dejo?

**Juan Diego Galdames**: Comentar muy brevemente porque igual yo estoy ahora
cerrando mi tarea de PDFs de UP1. La libreria que estaba usando es PDF Make, que
me ha estado dando harta flexibilidad. Quizas mencionarla como que esto tambien
nos puede servir, porque lo voy a tener que explicar en mi parte como de UP one
core y decir que puede ser una base para lo que requiere Assessment en el futuro.

**Esteban Cortes Sandoval**: Lo voy a explicar antes, en la parte de UP one core.
Aqui quizas agregue una slide solo para comentar que fuera de lo que exploraste
tu, nos falta ver la parte dinamica del template. Esos son los puntos: si bien
esta la capacidad de generar PDF, tenemos que explorar la capacidad de generar
ese PDF con el template.

### 00:04:27 — Presentacion Bailey (problemas que resuelve)

**Esteban Cortes Sandoval**: Despues de eso, voy a explicar los problemas que
buscamos resolver con Bailey: visualizacion de modelo de objetos.

**Eduardo Bacon**: Si, Bailey busca tambien resolver un tema con los permisos y
la capa lenguaje, pero eso es lo menos explorado en Bailey. Pero es netamente
poder visualizar de manera comoda los artefactos que genera UP1, saliendo del
esquema de archivos y JSON que tiene.

**Juan Diego Galdames**: Tambien se pueden ver los flujos de las apps de UP one,
te lleva de una vista a otra. Yo se lo mostre a Claus ayer y le encanto. De hecho
se lo pase para que lo instalara.

### 00:05:51 — Bailey en la nube (vision Claus)

**Juan Diego Galdames**: Me dijo que segun el habria que colocarlo despues en el
espacio donde estan los repos core de UP One. Lo que le gustaria para el futuro
es que pudiera monitorear UP One en la nube. No se si igual se complejiza harto,
Edu, pero dijo que ese seria el caso que mas le ve potencial aparte del de verlo
en local.

**Esteban Cortes Sandoval**: En la nube como para revisar las apps desde la nube.
Yo cuando hice las maquetas de UP One, lo ultimo que trabaje autonomamente fue
como que Yupi One tuviese una vista para los consultores. Esta vista inicial es
como para poder simular que estamos entrando como una red de instituciones, como
slash admin, pensando como el backoffice centralizado de las aplicaciones que
estan en la nube de UP one. El backoffice seria pensado para consultores o power
users, de forma interna. Eventualmente podriamos tener metricas que se capturan
desde todos los tenants — cuantos son, cuales son los usuarios, ir a mirar un
tenant en detalle, ver cuales son las apps que tiene activas, las integraciones.
Incluso pense en un impersonal: en la Switch normal el impersonal es muy basico,
pero aqui uno podria tener un impersonal desde aca para ir como al tenant y
revisar un soporte. Volviendo a la idea de Claus, entenderia como monitorear los
tenants — ir a tenants de un cliente y usar Bailey para ver como esta la
configuracion de esa aplicacion.

**Juan Diego Galdames**: Si, tambien, pero mas por el lado de que lo que yo este
viendo en Bailey sea como lo esta en UP1 en produccion: cuales son los objetos
que efectivamente estan en las bases de datos funcionando actualmente, cuales son
los flujos de las apps levantadas en la suite. Eso como uso futuro; ahora tambien
para lo que ya hasta ahora le sirve sirve demasiado.

### 00:09:55 — Bailey como modulo dentro de UP1

**Eduardo Bacon**: Quizas ahi haya que pensar en incorporar a Bailey como una
suerte de modulo porque por fuera ahi no funcionaria, pero si esta dentro y ahi
tiene el acceso a leer los archivos. Al final esto es leer los JSON y dibujarlo.

**Esteban Cortes Sandoval**: Y renderizarlo y ponerle capacidad sobre eso.

**Eduardo Bacon**: Si nos concentramos netamente en lo que es objetos, porque la
estructura de las apps en navegacion fue mas complejo (hubo que meterse en el
runtime). Modelo objeto se podria hacer si Bailey vive dentro de UP one, mas que
mirarlo desde afuera.

### 00:11:17 — Inicio sprint planning

**Esteban Cortes Sandoval**: Entonces vamos a nuestro segundo sprint. En la
planificacion macro habiamos hablado de mirar las funcionalidades core generales
que despues nos permitan configurar los otros objetos/documentos, replicando lo
mismo y despues extendiendonos. Lo principal que creo que tenemos que resolver
para poder decir "podemos configurar cualquier formulario de forma similar a como
lo hacemos actualmente": hoy la forma en la que se configuran los records
estructura de formularios es que cada record y en realidad no podemos configurar
pestañas que unifiquen mas de un record para darle una forma mas dinamica al
formulario, mas cercana a lo que utiliza la institucion. Hoy estamos forzando la
estructura de UP1 que no necesariamente es la estructura del formulario que la
institucion usualmente utiliza.

### 00:12:56 — Solucion dinamica de pestañas (mas de un record por tab)

**Juan Diego Galdames**: Yo creo que ahi seria darle el dinamismo con los records.
Lo pensaria modificando el record para que por configuracion se pueda determinar
si puedo mostrar mas de un record al mismo tiempo en una misma tab.

**Esteban Cortes Sandoval**: ¿Como estas tu de capacidad respecto a los temas
core como para pensar en levantar esa historia?

**Juan Diego Galdames**: Lo veo viable. Las cosas core que tengo de momento — el
tema de la vista detalle abierta en modo vista o edicion con switch (que comente
a Claus) — ya habia una historia escrita. La podia tomar para el proximo sprint
porque nos venia a nosotros de EAL. Las tareas core de carga asincronica de datos
quedaron en standby porque se van a reformular. Creo que la podria tomar tambien
para este sprint, el configurar el mostrar mas de un record en una pestaña para
la vista record list.

### 00:14:03 — Custom section: separar instancias en pestañas distintas

**Esteban Cortes Sandoval**: Lo otro que nos queda ahi es como tratar el record
de custom section. Hoy custom esta pensada para otros datos que no caen dentro
del estandar, pero no quiere decir que todos haya que verlos como un bloque de
informacion conjunta. Yo podria tener un custom section de datos de evaluacion
que no caen dentro del estandar y otro distinto. Hoy por como configura el record,
todos quedan dentro de una lista de records. Querria poder hacer esa separacion.

**Juan Diego Galdames**: Como que podia haber el caso que no se pudieran en dos
tabs de custom section.

**Esteban Cortes Sandoval**: Basicamente claro, en una va un dato y en otra otro.

### 00:17:02 — Opciones de agrupacion (campo nuevo vs parent_id vs sub_section)

**Juan Diego Galdames**: Habria que buscar una forma de hacer esa diferenciacion.

**Esteban Cortes Sandoval**: La otra opcion tambien es pensar en modificar el
objeto, buscando ese mismo fin pero no representarlo de esa forma. La dificultad
es como podemos dinamicamente configurar otra seccion de datos en un cliente que
no este fuera de nuestro estandar sin tener que estar extendiendo el modelo de
datos. La idea del custom section era esa "otra cosa".

**Juan Diego Galdames**: Y para el caso de custom section quizas que el record
tenga una columna que sea de nomenclatura para agrupar por nombre. Si no, va a
tener puras pestañas que digan "custom section".

**Esteban Cortes Sandoval**: Voy a previsualizarlo. Las evaluaciones estan aca —
ID, owner, record_id... El parent_id aplica solo a evaluation_component pero en
realidad podria aplicar mas. Una opcion podria ser con el parent_id. Si yo tengo
custom sections que son el temario, tendria un padre con la descripcion (el
temario) y los hijos serian los temas. Esa podria ser una opcion: agrupacion
padre/hijo del campo parent_id que es general para custom_section. La otra opcion
seria un campo especifico del objeto.

**Juan Diego Galdames**: Lo que ya existe parecido en UP1 es que en la suite, en
la tab de objetos, cuando uno crea un layout hay un campo `sub_section`. Cuando
creo una vista personalizada en los record list, eso automaticamente va a la
sub_section de mis vistas personalizadas. Existe esa logica de agrupar layouts
por sub_section. A lo mejor para este record de custom section, al momento de
crear instancias se pueda ir agrupando por sub_section.

**Esteban Cortes Sandoval**: Hace sentido que se llame sub_section. Implicaria
que todos los que son parte del mismo grupo tendrian que tener el mismo codigo
de sub_section.

**Juan Diego Galdames**: Y que esos iran dentro de la misma tab en el fondo, y
que esa tab tenga el titulo de la sub_section para que no diga "custom custom".

**Esteban Cortes Sandoval**: Hay que ver como es la logica. Me gusta. ¿Que pensais
tu, Edu?

**Eduardo Bacon**: Seria mediante sub_section. Entonces, la pestaña que tenemos
ahora de campos personalizados se subdividiria por las sub_secciones que tendrian
los elementos.

**Esteban Cortes Sandoval**: Y eso mezclado con la capacidad que va a explorar
Juandi de hacer formularios personalizados deberia darnos el dinamismo de los
formularios en teoria. Es una extension del objeto, configuracion del objeto mas
que nada.

### 00:31:33 — Gestion de estados core (workflow)

**Esteban Cortes Sandoval**: Esto nos resuelve esos dos problemas. Lo siguiente
son tres temas core, porque si no ya pasariamos a las otras opciones (configurar
silabus, configurar plan de estudio). Uno es gestion de estados y transiciones.
Ahora podemos configurar el modelo de workflow e incluirle la capacidad del flujo.
Eso tendria que ser core o como la transicion del documento por el flujo o
personalizado. El flujo esta pensado para ser core, porque al menos Booking lo va
a tener que usar.

**Juan Diego Galdames**: El tema es que me imagino que no van a tener todos los
mismos estados. Quizas el modelo de transicion sea core UP1, pero la gestion de
los estados — como se pasa de un estado a otro, cual es final, cuales son
intermedios — quizas mas configuracion, mas libertad del cliente.

**Esteban Cortes Sandoval**: Si, esa es la configuracion que uno le da al cliente
en particular. Eventualmente tendriamos que tener un mantenedor para esas
configuraciones. Lo que tenemos que hacer: en assessment hay dos cosas — version
de versionamiento y cambio de estado. El cambio de estado: el documento tiene
asociado un workflow. Cuando hago la accion de cambiar los estados, va a reconocer
el estado actual y me va a mostrar los estados a los que puedo llevarlo segun las
transiciones definidas. Selecciono una, le doy un comentario, lo actualizo y eso
actualiza la instancia.

### 00:36:03 — Cambio de estado vs edicion directa de columna

**Juan Diego Galdames**: Hoy cuando se cambia el estado no ocurre el flujo de
mandar mensaje y notificacion, simplemente es actualizar el valor de la instancia.
Hay que pensar si ese modelo de cambio de estados va a ser universal para todos
los objetos que tengan columna de estado. A lo mejor lo que podria hacer es que
la columna estado no pueda ser editable directamente sin esta accion de "editar
el estado". Podria ser una fila como una accion — el record list tiene la opcion
de configurar que estoy en una fila y puedo abrir una accion custom "cambiar
estado".

**Esteban Cortes Sandoval**: Hoy permitimos eso: puedo estar en el record list y
ver/editar desde el formulario y cambiar el estado de manera directa.

**Juan Diego Galdames**: El tema ahi no se si en el core de UP1 se pueda
bloquear el cambiar el estado sin hacer esa accion custom.

### 00:38:24 — Workflow transition history como fuente del estado

**Esteban Cortes Sandoval**: Tu pregunta creo que se para donde va. Hoy cuando
cree el objeto Activity le puse el estado, por eso se puede modificar (es un campo
del objeto Activity, current_status_id). Pero en el modelo actual de la suite, el
equivalente — la tabla de curso — no tiene la columna de estado: se consume desde
otra tabla. En el modelo que defini, existe `institution_workflow`,
`workflow_transition`, `workflow_transition_history`. Este ultimo deja entity_type,
entity_id, y el historico de transiciones. Una es la que esta activa. ¿Podriamos
hacer que la informacion del estado, en lugar de ser un campo del objeto activity,
viva en workflow_transition_history?

**Juan Diego Galdames**: Yo creo que si. Eh, ese objeto de transicion de estados
puede ser consumido por distintos objetos. Facilitaria hacer la restriccion: no
es llegar y cambiar una columna, sino hacer la accion de cambiar estado.

**Esteban Cortes Sandoval**: Tendriamos que poner la accion de cambiar estado y
ver una forma de cruzar la informacion para mostrar el estado actual. Desde el
objeto siempre tener que poder identificar el estado activo. Quizas a
workflow_transition_history le faltaria un campo — porque alli estarian todas las
transiciones por las que paso. Inicialmente tenia el estado pero como es
informacion redundante (la transicion tiene el estado destino) no lo puse. En
teoria uno podria poner aqui un current_state (1/0) para identificar la transicion
en la cual se encuentra esa instancia. Implica que cuando estemos aca tenemos que
poder ver el estado y tambien el historico.

**Juan Diego Galdames**: Mientras mas lo veo, mas lo veo como que necesita ser
core, porque tiene mucha mas complejidad en cuanto a trazabilidad: quien hizo el
cambio, que usuario, comentarios. Tiene sentido — necesitamos traceabilidad. En
otras soluciones, no se, desactivo un evento, deja de estar activo, ya no me
aparece en los listados. La columna de estado de los objetos: lo veo por una
logica mas core.

**Esteban Cortes Sandoval**: Va a aparecer en mas objetos, mas objetos van a pasar
por flujos de trabajo. Pero entonces, ¿que podemos hacer desde el lado de la app?
No mucho hasta que tengamos el core.

**Juan Diego Galdames**: Se lo voy a comentar a Claus porque mientras antes lo
ideemos mejor, si no despues van a empezar a aparecer mas objetos conectados.

### 00:44:10 — Change log (trazabilidad de cambios)

**Esteban Cortes Sandoval**: Hablando de eso, hay otra cosa que podriamos
explorar — la trazabilidad de cambios. El change log. Hoy tenemos el historial de
cambios que es algo core nuestro, cada vez que hago un cambio en las estructuras
dinamicas va quedando el registro. Lo mapee a traves de un objeto, el
`change_log`. Hoy en la configuracion que tiene Edu, uno puede hacer cambios pero
el cambio se sobreescribe, se actualiza, no va dejando el historico. Este
historico es algo que deberiamos poder ver desde la vista del objeto (una tab de
visualizacion). Quizas podriamos abordar en este sprint, es una funcionalidad que
vamos a tener que reproducir para los otros.

El change_log: entity_type, entity_id, user, action, source (accion del usuario
vs proceso masivo), field, old_value, new_value. Tambien wf_transition_history_id
si la edicion provino de una transicion. Cada edicion tiene que desencadenar un
registro aca. ¿Lo hago con logica o con N8N? No se si se puede con N8N porque
deberia ser muy abstracto — cualquier accion tendria que desencadenar la edicion.

**Eduardo Bacon**: Buen desafio, pero misma duda — si esto se podria manejar con
N8N, que es un campo inexplorado.

**Juan Diego Galdames**: Se podria. El gatillante actual es como se modifica una
instancia de un objeto. No se si habria que hacer N flujos para cada objeto que
gatillen este change_log o puede haber una forma universal. Para nuestro caso yo
creo que se podria hacer por un resolver custom para esta primera iteracion (los
mods permiten resolver custom). Tendria que preguntarle a Claus y Vignes si puede
haber un trigger de N8N que sea de mas de un objeto al mismo tiempo.

**Esteban Cortes Sandoval**: ¿Por que mas de un objeto?

**Juan Diego Galdames**: Por si el change_log va a ser exclusivo para uso nuestro
o universal.

**Esteban Cortes Sandoval**: En teoria no es exclusivo, pero actualmente la suite
no lo ocupa nadie mas, pero probablemente mas gente lo querra usar. Entonces dos
opciones: N8N o resolver especifico del sistema.

**Eduardo Bacon**: Con resolver podria engancharlo como tipo callback cuando se
esten gatillando las diferentes acciones, solo que habria que unirlo a todas esas
acciones. Podriamos ir con esa como primer acercamiento y vemos si amerita
pasarlo a N8N.

**Esteban Cortes Sandoval**: Si da tiempo intentar en N8N tambien para el primer
acercamiento. Vamos a poner esa historia: "registro de trazabilidad de cambios".

**Eduardo Bacon**: Incluiria el consumo de ese registro: una pestaña mas dentro
del academic program.

**Esteban Cortes Sandoval**: Al hacer cambio, realizar registro y poder visualizar
el historico de cambios. Dos cosas: que se guarde la informacion y poder
visualizar esa informacion.

### 00:52:05 — Versionamiento de Activity

**Esteban Cortes Sandoval**: Workflow tenemos que mirarlo primero como algo core.
Lo que no necesariamente es core: gestionar multiples versiones. El objeto
Activity hoy maneja la version con logica padre/hijo, tiene un codigo de version.
Si voy a crear una nueva version, la creo en relacion a una version existente.
`base_record` tiene `previous_version`. La gracia: cuando me cambio de version
estoy cambiandome de instancia y tengo que mirar toda la informacion de esa nueva
instancia. La accion personalizada es: al crear una nueva version, esa nueva
version crea una nueva instancia del objeto, queda relacionada a la version
anterior, y en esa accion de creacion podria decidir cuales datos de la version
previa quiero replicar.

La version mas simple: me permite crear una version nueva que despues completo
con los datos. La version mas "pro": al crearla replicar los datos de la version
de origen.

**Juan Diego Galdames**: La verdad esto es algo inexplorado. El crear una nueva
version va a ser crear una nueva instancia hija de la version anterior, pero el
poder decidir si parte con todo el contenido o partir de cero o elegir con quien
quedarme — no lo hemos explorado.

### 00:56:28 — Propuesta rapida: editar y cambiar codigo de version

**Juan Diego Galdames**: Pensando rapido, en vez de hacer una accion como
"crear version nueva", que al editar la instancia y cambiar el campo `version`,
al guardar cree una nueva instancia con los campos editados — equivaldria a
crear una nueva version. O para no marear al usuario, al abrir la vista de
edicion dar dos opciones: guardar la instancia ya editada (overwrite) o crear
nueva version (gatilla la nueva instancia hija de la actual).

**Juan Diego Galdames**: ¿No se si queda al tiro como la version nueva como la
activa?

### 00:59:05 — Vigente ≠ estado workflow, falta campo current_version

**Esteban Cortes Sandoval**: No necesariamente, porque ahi se cruza con el tema
de los flujos de estado. Cada version tiene sus propios estados y deberian haber
logicas entre ellas. Uno deberia poder tener dos versiones: la oficial vigente y
una con otro estatus. Aca creo que me falta el campo `current_version` —
tengo la version previa, pero no tengo cual esta marcada como la version en
curso, la version activa. Voy a anotarlo: revisar logica de version. Otra duda:
como las versiones son instancias relacionadas, el record list me estaria
mostrando si tengo 5 versiones, las 5.

**Juan Diego Galdames**: Todas las versiones.

**Esteban Cortes Sandoval**: Pero eso se puede resolver con una vista
personalizada por defecto. Podemos crear que el modulo tenga dos vistas: la
estandar y otra "versiones activas" pre-filtrada.

**Juan Diego Galdames**: Si la version tiene como estado "publicado" y eso es
un valor de una columna, podemos tener un listado que muestre todo y otro con
filtro de estado o version activa. Eso es solo configuracion, se puede hacer
desde ahora.

### 01:01:25 — Navegacion entre versiones en vista detalle (falta)

**Esteban Cortes Sandoval**: Lo que necesitamos: la accion de creacion (en
primera instancia podria estar vacia, pero esa creacion la deja relacionada con
otra) y como poder movernos entre versiones. Hoy lo que podriamos hacer es ir a
la vista y buscar la version, pero desde el detalle de un record list no me
puedo mover a otras versiones.

**Juan Diego Galdames**: No.

**Esteban Cortes Sandoval**: Eso es lo que hoy no puedo hacer. La pregunta es si
eventualmente debe ser una capacidad solo de nuestros modulos o transversal.
Hoy podriamos: incluir columna de campo para identificar version actual,
configurar vista para filtrar por versiones actuales. Eso lo podemos hacer en
sprint. Respecto a la creacion de versiones: si es solo de Assessment, puede ser
un resolver y un componente custom; si interesa a otros (poder navegar entre
versiones de una instancia), iria a core.

**Juan Diego Galdames**: Si tiene el campo version, que al abrir la vista detalle
por defecto haya un selector — un dropdown si hay mas versiones — para navegar.

### 01:04:52 — Diferenciar workflow status vs vigente

**Eduardo Bacon**: Tengo una duda. Podemos incluir versiones, pero recuerdo que
en este momento UP1 no soporta el tema del "actual" — tenemos versiones que
podemos navegar, pero que tenga que identificar cual es la vigente, que no
necesariamente es la ultima.

**Esteban Cortes Sandoval**: Hay que diferenciar, Juandy: no es el estado del
workflow, sino el estado de la version. Yo voy a tener el curso con todas sus
versiones, multiples instancias de la actividad relacionadas en un arbol. Lo
que no este dentro del arbol es otra actividad. De esas versiones (que podrian
ser, no se, 20) siempre deberia haber una unica en estado vigente. Esa es la que
yo decia: una vista del modulo donde solamente veo record list de las
actividades en estado vigente. El comentario de Edu va a que otros modulos van
a tener relacion solo a versiones vigentes o algunas funcionalidades estaran
restringidas.

**Eduardo Bacon**: Un poco si lo soporta. Estoy imaginando: tenemos el listado
con la version. Vamos a ver supongo las vigentes, que no necesariamente estan
unidas a un estado especifico. Cuando ingresamos, los records que arman las
pestañas tendran que mostrar la informacion unida al estado seleccionado
previamente. Es como, "estoy viendo la version 1, son todas la version 1 y puedo
navegar". Es como, ¿va a saber manejar el doble estado? Uno: draft/publicado/
revision (workflow). Otro: vigente/no vigente.

**Esteban Cortes Sandoval**: Lo resolvemos a nivel del objeto. Las distintas
versiones son instancias de actividades distintas, solo correlacionadas por
padre/hijo. Cuando ingrese al record list, si un curso tiene tres versiones
tengo tres registros y desde el detalle veo toda la informacion relacionada a
esa version. Cuando creo una nueva version voy a tener replicadas esas
secciones (no estan relacionadas). Podriamos tener una vista por defecto
personal en el modulo de programa asignatura que muestre solamente las
versiones vigentes (filtrar record list por vigente=1) — equivalente a lo que
hacemos actualmente en Assessment. Otra personalizada con el historico completo.

### 01:10:53 — Reglas de vigencia futuras

**Juan Diego Galdames**: Pero faltaria como un paso — me imagino que no pueden
haber dos versiones vigentes al mismo tiempo. Cuando marque una como vigente,
la otra pase a cero, o que no me deje cambiarla porque hay otra vigente.

**Esteban Cortes Sandoval**: Eso viene despues — vamos a necesitar reglas. Uno
podria decir: la puedo tener vigente y la otra archivada mientras tenga
estudiantes activos en la anterior. No hemos llegado a ese punto. Eventualmente
cuando la vaya a hacer vigente deberiamos implementar ciertas reglas (N8N o
desencadenante).

### 01:12:42 — Patron: que pasa al core, que se queda en mod

**Eduardo Bacon**: Tengo otra pregunta referente a eso. ¿Que posibilidades hay
de que trabajemos cosas dentro del mod y despues pase al core? ¿Que tanta
diferencia hay entre uno y otro en hacer el traspaso?

**Juan Diego Galdames**: Depende de lo que hagamos. Un resolver custom ya lo
disponibiliza para el resto de los mods porque queda registrado en el object
manager, solo que dentro del git, por eso no lo ve cuando hace el sync, pero se
queda disponible para todos. Lo mismo con los componentes — la idea es que un
componente custom queda disponible para que el resto de mods lo consuma.
Dependiendo de la complejidad de la logica. Por ejemplo, ver el campo versiones
como el que tiene Assessment — yo lo veria mas core porque es para que se vea
siempre en la vista detalle de cualquier objeto que tenga version. Implica
logica mas pesada que el mod quiza no puede hacer toda por si sola. Generar
deuda para el core de UP one es esperable en estos primeros pasos de la
migracion.

### 01:17:09 — Ajustes de objetos + modelo workflow en mod (preparacion core)

**Esteban Cortes Sandoval**: Lo que si podriamos hacer del lado del backend que
estas haciendo tu, Edu: algunos ajustes de objetos de lo que ya tenemos.
Implementar el modelo de objetos de workflow seria pequeña, pero dejarlo listo
con ejemplos para que cuando lo tome core ya este la estructura. Lo vamos a
tener con Bailey. Lo voy a poner como tarea de configurar modelo de objetos
workflow.

### 01:19:04 — Soft delete: consultar a PMs y Claus

**Eduardo Bacon**: Tengo otra pregunta referente al sprint pensando en el
cierre. Estamos cubriendo ver y editar. ¿El eliminar lo cubrimos todavia o es
tema del siguiente sprint?

**Esteban Cortes Sandoval**: Eliminar es eliminar el record (la instancia del
objeto). Es una capacidad de UP1 estandar. La verdad es que deberiamos tenerla,
pero es eliminacion logica. ¿Como esta UP1? Nosotros en la Switch tenemos
eliminacion logica — nunca eliminamos datos, hacemos inactivacion y el sistema
deja de mostrar.

**Juan Diego Galdames**: Nosotros tenemos eliminacion tal cual, desaparece la
instancia.

**Esteban Cortes Sandoval**: Es una buena pregunta general — si fuese soft
delete, igual tendria que pasar por la logica core, implica que los objetos
tengan forma de diferenciar si estan eliminados.

**Juan Diego Galdames**: Eso implicaria reseñar todos los record list para que
solo muestren los activos.

**Esteban Cortes Sandoval**: Voy a plantear la consulta a todos los PMs y Claus
y por ahora no consideramos eliminar como accion.

### 00:20:00 — Eliminacion + cascada en hijos

**Eduardo Bacon**: Ante lo mismo, con un resolver se podria manejar el tema de
las dependencias. Aqui tenemos el programa de asignatura y las pestañas que
estan adentro. Esas pestañas tambien tendrian que ser eliminadas en el conjunto
con el padre.

**Juan Diego Galdames**: Lo que hay ahora es que si eliminas algo que tiene
hijos no te va a dejar — hay una validacion. Con soft delete que pasa inactivo,
los hijos de algo inactivo tambien quedan inactivos o no se muestran. Engagement
tambien usa harto soft delete, asi que puede pasar a algo core.

### 01:22:35 — Personalizacion de vistas detalle

**Eduardo Bacon**: Otra consulta. En los record asignatura, ¿debemos
personalizar otras vistas dentro de esos records, mas alla del que tenemos de
evaluacion? Son tablas que levantan modales que muestran formularios.

**Esteban Cortes Sandoval**: Probablemente tenemos que personalizar mas. La duda
es cuales. Tenemos que hacer una revision de los componentes que actualmente
tenemos de la estructura y ver cuales hacen mas sentido replicar. Mañana
tenemos un espacio agendado y lo podemos ver al detalle.

### 01:24:06 — Carga de archivos adjuntos (PDF/Excel)

**Esteban Cortes Sandoval**: Si nos queda espacio, podriamos preguntar por
carga de archivos. UPAcad: ¿tiene carga de archivos?

**Juan Diego Galdames**: Mas alla de los Excel para carga masiva, no tiene.

**Esteban Cortes Sandoval**: Tipicamente las instituciones cuando trabajan los
programas de curso de asignatura, adicional a los datos que cargan por
formulario, cargan otros documentos PDF, Excel, que son adjuntos al documento
principal. Lo cargan y queda en el storage, despues los pueden volver a obtener.
Es una forma de centralizar el dato relevante relacionado al programa de
asignatura. Hoy tenemos carga de PDF, Word, Excel, CSV — no tenemos restriccion
sobre el tipo. Sube al S3, queda relacionado al documento.

**Juan Diego Galdames**: No, eso no lo tenemos tampoco.

**Esteban Cortes Sandoval**: Anoto: objeto para guardar la relacion de archivos
cargados. Mi duda es la capacidad de cargar para almacenar. No se si algun otro
modulo la utiliza — Engagement quizas, estudiantil. Podria ser una capacidad
general que despues configuramos en ciertas vistas asociandolas al objeto
principal. Necesitamos un objeto polimorfico para la relacion. Voy a quedarme
con la tarea del objeto, pero la capacidad de carga va a tener que ser core
(implica guardar cosas en S3).

### 01:26:24 — Prioridad para Claus: estado > versionamiento > carga archivos

**Juan Diego Galdames**: Yo quiero saber cuales son los mas prioritarios para
core antes de mi planning en la mañana.

**Esteban Cortes Sandoval**: El estado lo veo mas prioritario antes que
versionamiento porque es mas visual. Versionamiento es crear otra version y
despues haces lo mismo sobre esas acciones — cuando las otras acciones estan
listas, el versionamiento es crear una nueva instancia y listo, adquiere por
defecto todas las otras capacidades. El cambio de estado es una capacidad nueva,
si o si. Despues versionamiento. Si hay mas capacidad, carga de archivo.

### 01:27:42 — Exploracion PDF + template

**Esteban Cortes Sandoval**: Si nos queda capacidad, dos cosas: o entrar a
explorar mas en detalle el tema de PDFs (que es seguir sobre funcionalidad de lo
mismo) o empezar a configurar otro de los documentos curriculares como el
silabus (replicar lo que hicimos para el curso) o el plan de estudio. Yo creo
que es mas necesario el tema del PDF y el template. Porque si hay algo en la
estructura de objetos actual que no permita ese mapeo, vamos a tener que cambiar
cosas en la estructura. Si avanzamos con los otros objetos, despues vamos a ir
a configurar el PDF y vamos a ver que hay que hacerlo para los tres objetos y
no nos funcionan las logicas.

**Esteban Cortes Sandoval**: Idealmente, super-usuario reconfigura el template
desde el sistema. Hoy el flujo es: nos pide el PDF, modificamos el Word, subimos
al repositorio, hay que hacer despliegue del ambiente y cuando se despliegue
esta listo. Templates varian por tenant (logo, codigo, icono institucion,
estructura).

**Eduardo Bacon**: Lo primero seria armar el link de los datos para
transformarlos en un modelo JSON especifico (no traer todo, sino con propiedades
que el consultor requiere). Despues la segunda etapa: tomar esos datos y hacer
el match con lo que pregunta el Word. Despues la generacion del Word con datos
y la transformacion a PDF.

### 01:34:11 — Roadmap sprints siguientes

**Esteban Cortes Sandoval**: Idealmente Sprint 3 ya tener el programa de
asignatura con casi todas las funcionalidades core. Sprint 3 probablemente
mirar versionamiento. Sprint 4 y 5 configurar plan de estudio y silabus — ahi
recien vamos a llegar a los componentes entretenidos: malla del plan de
estudio, configuracion del plan de estudio tomando asignatura. Va a construir
sobre lo que ya tenemos.

### 01:36:51 — Ambientes de prueba bloqueados

**Eduardo Bacon**: Esto creo que falta ver. Un ambiente de prueba algo donde
desplegamos lo que estamos avanzando para coordinar entre nosotros. Yo voy
avanzando, voy viendo, pero como soy el que esta haciendo, los arboles no me
dejan ver el bosque en algunos puntos. Se vio en la reunion de ayer puntos
super pertinentes que al estar metido en el tema uno deja de ver — un par de
ojos frescos ayuda.

**Juan Diego Galdames**: Somos los primeros en pedir esos diferentes ambientes,
estamos bloqueados por infraestructura/plataforma. Solo tenemos uno —
desarrollo, prueba, demo — para que Claus apruebe las cosas. No nos sacamos el
tema "a mi me funciona en mi local". Mayira le dijo a Clemens que daria los
permisos para crear todo, pero por normativas ISO no se puede.

**Esteban Cortes Sandoval**: Los chiquillos de la P/B tienen tenants con sus
propias bases de datos, pero no son ambientes separados — son base de datos.

### 01:40:05 — Datos de ambientes vs locales

**Esteban Cortes Sandoval**: Necesitamos disponibilizar mas ambiente para que
gente vaya probando. En esta etapa no pedi retro. Quizas mañana si tenemos
tiempo podriamos pedirle a Sandra. Voy a ir cargando datos como los objetos —
tu has cargado en tu version local los datos que yo te pase, pero cuando eso
pase al modulo no va a tener datos, sino los que tenga este unico ambiente.

**Eduardo Bacon**: Va a ir con esos datos porque estan en el seed. Cuando
levanta el modulo, levanta con los datos base. Por eso cada vez que pruebo, los
cambios que hago se deshacen y vuelve al estado base.

**Esteban Cortes Sandoval**: Yo voy a ir generando instancias de objetos a
futuro intentando que sean consistentes con cada version cada vez con mas
datos. Cuando lancemos vamos a tener "asi se ve" y "asi deberian estar llenados"
los objetos. Genere un toolkit en Claude — skills + flujo para extraer datos de
la Suite Legacy y generar los objetos mapeados, en base al conocimiento que uno
le va dando.

### 01:42:06 — Bailey Sandbox

**Eduardo Bacon**: Se me olvidaba que Bailey tiene una tercera capacidad — el
Sandbox. Te permite descargar un kit de que es lo que espera UP1 y con eso a
traves del LLM le pasas la informacion, le dices "quiero modelar esto con estas
propiedades, una tabla como esto", lo toma, lo traduce y lo carga en Bailey. Lo
ves interactuar con todo lo que existe en UP1 sin tener que crear ese mod de
UP1.

**Esteban Cortes Sandoval**: ¿Lo que ves en Bailey es modelo de objetos y
flujos de layout?

**Eduardo Bacon**: Solo el modelo de objetos. Funcion para ver como esta lo que
estoy cargando, como interactua, si voy a consumir de otro objeto del core o
de un modulo — ver las relaciones tambien lo cubre.

### 01:44:35 — Cierre y coordinacion review

**Esteban Cortes Sandoval**: Estamos chicos. Hablamos mañana. Estamos
coordinados para la sesion: presento yo, presento esto, presento esto. De ahi
te doy paso Edu. De ahi sigo yo con esto. Comentamos un poquito de esto. Hago
como que cierro one more thing, comento aca y cerramos. Nos vemos mañana.

**Esteban Cortes Sandoval**: Edu, te encargo si me envias la captura de lo que
hicimos ahora para sumar a la presentacion. Yo ajusto el resto.

**Eduardo Bacon**: Si.

**Esteban Cortes Sandoval**: Juandi, cualquier cosa avisais si estais medio
perdido.

**Juan Diego Galdames**: Yo voy a llegar hoy en la noche a Hong Kong donde mi
abuela, me voy en bus. Cualquier cosa me escribo.

**Esteban Cortes Sandoval**: Ya chiquillos, hablamos.

## Outcomes

### Current — afecta trabajo en curso

| # | Tipo | Item | Dueño | Refs |
|---|------|------|-------|------|
| C1 | action | Enviar captura del sistema corriendo a Esteban para slide del review | Eduardo | — |
| C2 | action | Crear esquema simple de flujo de trabajo (a mano, no Bailey) para slide — evitar spoiler | Esteban | — |
| C3 | action | Mencionar libreria PDFMake brevemente en parte UP one core de la presentacion | Juan | — |
| C4 | action | Configurar vista record list para mostrar mas de 1 record por pestaña | Juan | — |
| C5 | action | Comentar con Claus el modelo central de transicion de workflow (que sea core) | Juan | — |
| C6 | action | Implementar registro de trazabilidad de cambios (change_log) — primera iter con resolver custom; explorar N8N si hay tiempo | Eduardo | — |
| C7 | action | Asegurar visualizacion del historico de cambios desde la pestaña del objeto (academic program) | Eduardo | — |
| C8 | action | Revisar logica de versionamiento + incluir columna `current_version` + configurar vista filtrada por vigentes | Esteban | — |
| C9 | action | Consultar a PMs y Claus sobre soft delete (UP1 hoy hace hard delete, Suite legacy/Engagement usan soft delete) | Esteban | — |
| C10 | action | Implementar modelo de objetos workflow (con ejemplos) en el mod para que core lo retome | Eduardo | — |
| C11 | action | Definir objeto polimorfico para guardar relacion de archivos cargados (capacidad core S3) | Esteban | — |
| C12 | change | Componente CustomSection: usar campo `sub_section` para agrupar instancias en tabs diferenciadas; titulo de la tab = sub_section (no "custom custom") | Eduardo | — |
| C13 | decision | Estado del objeto NO editable directamente — solo via accion "cambiar estado" que genera comentario + entry en workflow_transition_history | equipo | — |
| C14 | decision | current_state vive en workflow_transition_history (campo flag 1/0 o equivalente para identificar transicion activa) en lugar de columna del objeto | Esteban | — |
| C15 | decision | Change_log: empezar con resolver custom (callback en cada accion); evaluar N8N en una segunda iteracion | equipo | — |
| C16 | decision | Prioridad para empujar a core UP1: gestion de estados > versionamiento > carga de archivos | equipo | — |

### Future — para tickets que aun no existen

| # | Tipo | Item | Tema/Module | Cuando aplique |
|---|------|------|-------------|----------------|
| F1 | capability | Mantenedor visual de workflows estilo Jira (cada institucion define sus flujos) — core UP1 | workflow / UP1 core | post modelo |
| F2 | capability | Gestion de estados universal: accion "cambiar estado" + traceability (quien/cuando/comentario) consumible por cualquier objeto con workflow | UP1 core | sprint proximo |
| F3 | capability | Change_log universal (trigger por cualquier objeto via N8N o resolver) | UP1 core | post primera iter en mod |
| F4 | capability | Navegacion entre versiones desde el detalle (dropdown selector si hay multiples versiones de la misma entidad) | UP1 core | Sprint 3 |
| F5 | capability | Crear nueva version con opciones: en blanco, clonar datos completos, seleccionar campos a replicar | UP1 core | Sprint 3 |
| F6 | capability | Soft delete universal con validacion de cascada a hijos (UP1 hoy hace hard delete) | UP1 core | pendiente consulta PMs/Claus |
| F7 | capability | Carga de archivos al S3 (PDF/Excel/Word adjuntos al programa de asignatura) — capacidad core | UP1 core | sprint proximo |
| F8 | capability | Reglas de unicidad de version vigente (validar/auto-archivar la anterior cuando se marca otra) | curriculum-design | cuando se integre plan de estudio |
| F9 | capability | Reglas sobre versiones cuando hay estudiantes activos en la anterior (no se puede archivar hasta cierto punto) | curriculum-design | futuro |
| F10 | capability | Bailey como modulo dentro de UP1 (acceso directo a JSON) para visualizacion modelo objetos | bailey / UP1 | post review |
| F11 | capability | Bailey en la nube monitoreando UP1 en produccion (vision Claus) | bailey / cloud | futuro |
| F12 | capability | Backoffice centralizado tipo /admin para consultores/power users con metricas, vista tenants, impersonal | UP1 core | vision Esteban, futuro |
| F13 | scope | Sprint 3: completar programa de asignatura con todas las capacidades core + versionamiento | curriculum-design | Sprint 3 |
| F14 | scope | Sprint 4-5: configurar plan de estudio + silabus (replicar pattern del curso), componente malla | curriculum-design | Sprint 4-5 |
| F15 | scope | Exploracion PDF + template: mapping datos → JSON → llenado Word → transformacion PDF (templates varian por tenant) | curriculum-design / UP1 core | sprint actual si queda tiempo, sino Sprint 3 |
| F16 | dependency | Ambientes de prueba separados (dev/test/demo) bloqueado por infraestructura + normativa ISO | plataforma | bloqueante para retro externa |

### Context — info de fondo

| # | Tipo | Item |
|---|------|------|
| X1 | clarification | PDFMake es la libreria elegida para PDFs en UP1 core (Juan validando flexibilidad) |
| X2 | clarification | change_log captura: entity_type, entity_id, user, action, source, field, old_value, new_value, wf_transition_history_id |
| X3 | clarification | parent_id ya es campo general en base_curricular_section (estaba sin mapear en datos ejemplo) |
| X4 | clarification | UP1 suite tiene patron de campo `sub_section` en layout para agrupar — base para extender a custom_section |
| X5 | clarification | Bailey Sandbox: cargar modelo en Bailey sin tocar mod real de UP1 via LLM + kit candidato |
| X6 | caveat | UP1 actual permite editar columna estado directamente; debe pasar por accion en futuro |
| X7 | caveat | UP1 actual no soporta navegar entre versiones desde detalle del record list |
| X8 | caveat | Resolvers/componentes custom en mod quedan disponibles a otros mods via object_manager (en git, sync no los trae automaticamente) |
| X9 | caveat | Tenants de la P/B son DBs separadas pero no ambientes separados |
| X10 | caveat | Estructura de navegacion entre apps en Bailey requirio runtime; modelo de objetos si sale de archivos solos |
| X11 | caveat | GIFs en Google Slides se quedan congelados despues de la primera reproduccion |
| X12 | caveat | Cada vez que Eduardo prueba local, cambios se deshacen y vuelven al estado base (datos en seed del modulo) |

### Notas de extraccion

Vacio — todos los items se clasificaron en buckets current/future/context.
