---
id: TRANSCRIPT-2026-08-13-refinamiento-sprint-uassessment
project: up1
type: transcript
module: curriculum-mapping
tags:
  - transcript
  - refinamiento
  - sp9
  - migracion-uassessment
  - curriculum-mapping
  - curriculum-design
  - matriz-de-competencias
  - matrix-adoption
  - instructional-component
  - roles
  - permisos
  - menus
  - breadcrumb
  - home
  - dashboard
  - report-builder
---

# Refinamiento Sprint - reunion 2026-08-13 - SP9 migracion uAssessment

> Transcripcion editable generada por ordenador. Puede contener errores.
> Se mantiene verbatim como fuente de verdad para las decisiones que la referencian.

## Contexto

Reunion de refinamiento previa al sprint 9 (migracion uAssessment, sprint 9 de 17).
Se refina el trabajo candidato a SP9 antes de la planificacion del lunes: roles
internos y permisos, orden y nombres de menus en Curriculum Design, navegacion
(breadcrumb vs boton volver), home/dashboard con Report Builder, instructional
component (extension del concepto legacy curso-actividad) y el grueso del
refinamiento de matriz de competencias en Curriculum Mapping (tipos de matriz,
matrix adoption, alcance/obligatoriedad, exenciones, competencias, rubricas y
reglas de agregacion). Participan Esteban (PO), Eduardo y Francisco (devs) y Juan
Diego (plataforma/MCP).

## Planificacion, calendarios y roles internos (00:00:23)

**Esteban Cortes Sandoval:** Ya me confirman cuando esten viendo. Vale, vamos al sprint. Vamos sprint. Ya tenemos el sprint listo. No, no, no creo sprint. Es el nu migracion. 9 que va de 17. No tengo ningun feriado. Feriad. Hasta cuando? Y el 10?

**Eduardo Bacon:** ultimo calendario colombiano.

**Esteban Cortes Sandoval:** Si, yo arriba la unificacion de los calendarios de todos los trabajadores. No lo puse mal. Este es el siguiente. Este es editar. Esto va Ya. Ahi. Entonces, tareas paraentes sprint. Antes de entrar vamos a mirar funcionalidades de las llaves nuevas. por funcionalidades, normalizacion o cosas por el estilo, digamos, que salen con menor refinamiento, que seria aqui quiero entrar una vez ya e una primera tarea seria eh implementar la logica de roles internos. Eso es mas o menos transversal,

**Eduardo Bacon:** Listo.

**Esteban Cortes Sandoval:** pero no tenemos definido curriculum design y son extendidos en curricular mapping.

**Eduardo Bacon:** Ahi igual creo que con esto si aprovechando que vamos a trabajar los roles,

## Problema de roles: curricular designer no lista instituciones (00:03:20)

**Esteban Cortes Sandoval:** Ha.

**Eduardo Bacon:** hay que revisar el mapeo que teniamos porque por ejemplo a mi y a Pancho tambien le salio esta semana un problema con uno de los roles, el de curricular designer creo que era, no me acuerdo el nombre, pero en especifico los los roles derivados estos que tenemos, que no es el admin o el consultor. Le falta, por ejemplo,

**Esteban Cortes Sandoval:** Ja.

**Eduardo Bacon:** un rol para ver las instituciones. Entonces, cuando quieren crear un plan, no pueden listar las instituciones.

**Esteban Cortes Sandoval:** que un plan pero eso es porque estamos hablando de los roles, los roles internos que tenemos, cierto? Nosotros tenemos hoy dia una base de roles e roles entre sus

**Eduardo Bacon:** Claro.

**Esteban Cortes Sandoval:** capabilities no tienen definidas las capabilities como de cosas transversales que se necesitan. Eso es.

**Eduardo Bacon:** Claro, claro.

**Esteban Cortes Sandoval:** Ya.

**Eduardo Bacon:** Entonces,

**Esteban Cortes Sandoval:** Entonces,

**Eduardo Bacon:** cual irian con eso?

**Esteban Cortes Sandoval:** en ese caso es como identificar la cabity faltante e incluirla,

**Eduardo Bacon:** Ahora solo

**Esteban Cortes Sandoval:** o no? No. Entonces,

**Eduardo Bacon:** si.

**Esteban Cortes Sandoval:** aqui tendriamos que voy a ponerle muy alto nivel para saber como que es lo que necesitamos aca. Entonces para la lista de Ris estandar estandar ya definidos en curriculum design curriculum mapping que en realidad son los mismos.

## Migrar logica de roles internos y mapeo a roles core (00:04:52)

**Esteban Cortes Sandoval:** Eh, se debe migrar la logica actual a la nueva logica de eh roles internos. Em, aqui voy a dejar como definir el tiempo de

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** spring o refinamiento hacer el mapeo entre los existentes y los web, perdon, entre los existentes, entre los internos y los eh generales, no los generales de memoria, asi que hay que revisar, yo creo, ahi nivel del dato, pero basicamente vamos a tener que ver como estos son los internos y deberian irse a estos eh generales. Es que los generales no me estan apareciendo todos en la desagregacion,

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** pero es un tema de no mas revisado a nivel ya de lo que estan los datos y ahi yo puedo dar como el el okay. Yo creeria que podria ser mas o numeros directos, pero pero ahi completamos la parte de ahi. Y lo que dijiste tu es que validar eh validar y completar los casos necesarios eh que los roles permitan hacer las acciones declaradas. Eh, por ejemplo, la creacion del clan de estudio requiere rol, requiere permisos eh sobre facultades, cierto?

**Eduardo Bacon:** instituciones, institucion,

**Esteban Cortes Sandoval:** institucional institucional,

**Eduardo Bacon:** por lo menos esa estaba fallando. tenia es el

**Esteban Cortes Sandoval:** por lo que el rol debe eh el rol debe incluir dichas capabilidad.

## Donde vive el rol: mod vs core (00:07:01)

**Esteban Cortes Sandoval:** Ya, algo mas que referente a lo que hemos trabajado hasta la fecha en consideracion que vamos aprovechar de mirar con respecto a los

**Eduardo Bacon:** M.

**Esteban Cortes Sandoval:** roles.

**Eduardo Bacon:** No, yo tenia anotado eso. Pancho, si has visto algun otro caso.

**Francisco Navarro:** Eh, no, no caso. Faltaria con hacer esa correccion para que quede igual ahora con

**Eduardo Bacon:** No.

**Francisco Navarro:** el y borrar probablemente como se va a ir todo al cor. Habria que yo habia agregado como un seguro por el tema si se corria una u otra primero. Habria que fixar eso tambien ahora.

**Esteban Cortes Sandoval:** Ahora terminan quedando en el core, La la Bueno, no s el mapeo, no se donde queda registrado, si en el mod o en el

**Francisco Navarro:** como la definicion creo que en el mod igual le voy a preguntar despues bien a pero como que la generacion

**Esteban Cortes Sandoval:** hay que revisar lo que haya quedado Hello World.

**Francisco Navarro:** del rol queda en el en el core y despues como que tu le linkeas los los permisos que deberia tener o o agregarle mas permiso, pero creo que era

**Esteban Cortes Sandoval:** Ya. Ahi

**Francisco Navarro:** asi.

**Eduardo Bacon:** Yo habia entendido lo mismo,

**Esteban Cortes Sandoval:** que

**Eduardo Bacon:** como que son roles del CO y se linkean a las capabilities que tienen los, no se si las capability o los roles internos directamente de los que tienen los mods.

## Mapeo rol interno a rol estandar core (00:08:34)

**Francisco Navarro:** Ah.

**Esteban Cortes Sandoval:** yo si,

**Eduardo Bacon:** Eso no me

**Esteban Cortes Sandoval:** lo que yo entendi es como que lo yo creo segun yo entendi y ahi despues validan ustedes el

**Eduardo Bacon:** acuerdo.

**Esteban Cortes Sandoval:** rol interno que nosotros ya definimos como que sigue existiendo y lo que se define ahora es como el mapeo hacia los roles comida como corp. Entonces, de manera que el usuario siempre vea como siempre tengamos una lista de roles estandar y a esos roles

**Eduardo Bacon:** Clar.

**Esteban Cortes Sandoval:** estandar se le eh se le mapean los roles internos y terminan ganando esas capability. Em, asi que pero bueno, hay cosas a ver como es la implementacion que hay que llevar a cabo. Asi que ese es uno eh actividad el orden de las vistas. de las vistas. Entonces, entonces, entonces, ta ta ta y vamos a agregar una nueva. Esta va a estar si por mod curriculum design. eh ajustar ajustar orden de los menus. Eh, entonces yo eh yo creo que todavia no necesitamos como la implementacion de la otra capacidad que es vistas por rol, que entiendo que lo nuevo, cierto? es permitir que eh definir por el rol como en cada uno de ellos como el orden de las vistas que va a ver ese usuario.

## Orden y nombres de vistas/menus en Curriculum Design (00:10:19)

**Esteban Cortes Sandoval:** Yo creo que en assessment no lo necesitamos, entendiendo que con que no tenga el permiso se oculte una vista, el orden sigue siendo como logico. Yo creo que deberia aplicarnos la capacidad actual, pero con el ajuste de que de darle un orden mas especifico a las vistas, que deberia ser Eh, entonces pestana, una tablita para representar como tenemos actualmente. H, le vamos a poner asi como eh actual y eh quiero y sin color. Eh, le puedo quitar el color. Puedo eliminar esto. Eliminar. Ah, no puedo. Asi asi. Yeah. A so laces actual tenemos design, tenemos esto, actividad, programa ofertas y plan de estudio. Entonces, actividad programa academicadicos ofertas planes de estudio y estudi Eh, esto de aca y como deberia quedar es programas academicos, planes de estudio, eh asignaturas Y si la podriamosle programacion ahi. No se si estoy asumiendo algo, pero entiendo que ya podemos ajustar los nombres o no. No se si ustedes saben.

**Eduardo Bacon:** No se si dentro del mod si se puede, por lo menos antes se podia dentro del core porque el core se encargaba de de esos objetos.

## Alineacion menu / pestana / breadcrumb / titulo (00:13:47)

**Eduardo Bacon:** No se si lo movieron al mod, lo revisabon.

**Esteban Cortes Sandoval:** Ya, esa seria como la idea de ajustar aca, tanto que voy a poner aqui como idealmente, cierto? comentario nombre de vistas. Eh, la vista o el nombre el nombre de la pestana debe estar alineado con el nombre de la vista, que eso es lo que ya no estamos usando porque algunos dicen como actividad y programa de asignatura. Eh, en realidad deia decir programa de asignatura en todos los casos, ya? Asi que el la expectativa de esta es ese cambio. Algo que vean como que vale la pena considerar dado que estamos aqui.

**Eduardo Bacon:** No, que se me ocurre algo. Creo

**Esteban Cortes Sandoval:** Ya No. Es dale.

**Eduardo Bacon:** que ahi si dejar anotado para que no no se nos olvide porque no es solamente alinearlo entonces en el menu, sino tambien que ahora tenemos un breath asegurarse que ahi tambien quede hecho el cambio. Entonces seria como eh menu breadcram y titulo, por lo menos eso es como el

**Esteban Cortes Sandoval:** M. No. Ah, ya, ya. Si, si, si,

**Eduardo Bacon:** porque tienes el menu el menu arriba tienes abajo el bird y despues abajo tienes el titulo que

**Esteban Cortes Sandoval:** si, si, si, si.

**Eduardo Bacon:** vendria a ser lo que maneja los layouts como el layout principal.

## Navegacion: breadcrumb vs boton volver (00:15:41)

**Esteban Cortes Sandoval:** Eh, que opin que opinan ustedes de este diseno como del red aqui, el menu arriba? Yo he estado, no se si me convence, mas no tengo ninguna como contrapropuesta, pero no le he dado mas. Como pense

**Francisco Navarro:** En ese en ese nivel como que no te aporta,

**Esteban Cortes Sandoval:** que

**Francisco Navarro:** pero entrais en las vistas de las acciones como editar o ahi te da como un poco mas de funcionalidad.

**Esteban Cortes Sandoval:** claro si centr tu si

**Francisco Navarro:** Porque ya te puedo devolver al tiro uno para atras,

**Esteban Cortes Sandoval:** Okay.

**Francisco Navarro:** pero mucho no aporta.

**Eduardo Bacon:** Ahi yo mi unico comentario es que no se si es porque con el tiempo que he estado en en UP One me habia acostumbrado al boton volver y ahora el

**Esteban Cortes Sandoval:** Aja.

**Eduardo Bacon:** volver no esta. Pero claro, un usuario nuevo quizas si lo entiende,

**Esteban Cortes Sandoval:** no esta verdad que yo hice aca arriba.

**Eduardo Bacon:** si lo entiende con el breadcr,

**Esteban Cortes Sandoval:** Si, pues yo igual dije asi como esta el volver y y y me vine hacia aca,

**Eduardo Bacon:** pero

**Esteban Cortes Sandoval:** pero

**Francisco Navarro:** Si, cuesta notar que puedes devolverte asi intuitivamente como

**Esteban Cortes Sandoval:** si el tema del volver quizas haya que conversarle con los chiquillos.

**Eduardo Bacon:** si,

**Esteban Cortes Sandoval:** No se si me compensa

## Jerarquia visual del breadcrumb, tema de diseno para core (00:17:08)

**Eduardo Bacon:** porque ahi me Me me choca el tema de que tenemos claro el brecram como el

**Esteban Cortes Sandoval:** todavia.

**Eduardo Bacon:** accionable para navegar, pero arriba esta el menu y en mi jerarquia de cosas primero voy al menu que al webcam. Lo siento como mas informativo, entonces tiendo al no encontrar el volver como, ah, tengo que ir al menu arriba y hasta ahora ha sido como, ah, no, pero tengo el el breath como que me genera un paso mental adicional acostumbrarme.

**Esteban Cortes Sandoval:** Si, como que yo voy como Por que no lo voy a hacer asi?

**Eduardo Bacon:** acostumbrado a la Claro.

**Esteban Cortes Sandoval:** Basicamente es por ahi.

**Eduardo Bacon:** Mm.

**Esteban Cortes Sandoval:** Por eso quizas puede ser por eso a mi como que me mea haciendo como ruido al breadum por lo mismo, eh, porque en realidad como aqui estamos diciendo, estamos en el curriculum design, despues estamos dentro de actividad y ahora estoy dentro de electric. Yeah. Y creo que lo que me hace ruido es que tenemos como un encajonamiento raro, como una parte de la app esta aca, otra parte del menu esta aca y despues tenemos la linea que nos dice donde estamos. No, no lo se. Como que Pero es un tema de diseno,

**Eduardo Bacon:** Alo.

**Esteban Cortes Sandoval:** creo.

## Jerarquia legacy vs actual, sin contrapropuesta cerrada (00:18:10)

**Esteban Cortes Sandoval:** Creo es un tema de diseno ahi que me hace me hace ruido. El me hace ruido, yo creo, porque en el Legacy teniamos como una jerarquia mas obvia, teniamos como assessment, despues el menu principal que seria como plan de estudio y despues teniamos ya entraba ahi como al detalle, cacha? Entonces, aqui como que esta por el diseno general de la interfaz queda como no tan naturalmente jerarquico, cierto? Eh, y ahi es donde como que me hace ruido.

**Eduardo Bacon:** como que tienden a

**Esteban Cortes Sandoval:** Claro, como que me hace ruido. Si. Competir una buena forma, voy a decir Aja. Pero de nuevo,

**Eduardo Bacon:** competir.

**Esteban Cortes Sandoval:** no tengo una contrapropuesta aun. No me sentaba a darle una vuelta. Igual queria saber si es que era una percepcion mia o o puede o podria ser mas general, digamos. Eh, son detallitos que me gustaria igual o cuando veo alguno le voy comentando al equipo core, pero igual me gustaria como comentarselos con una idea tambien, no? No como decir, "Oye, no me gusta el bread crown e y no tengo nada mas que decir respecto a eso." No,

**Eduardo Bacon:** Claro.

**Esteban Cortes Sandoval:** nada, no hay nada ahi constructivo.

## Cierre de menus de Curriculum Design, siguiente el home (00:19:17)

**Esteban Cortes Sandoval:** Ya, pero okay. Entonces estabamos en el Ya le puse que correcto a nivel de Ya tenemos eso. Que mas tengo en varios? Eso ya lo marque ya. Entonces vamos a estar utilizando tabar, vamos a estarando tab por ror interno, aun no lo veo necesario. Eh, tenemos el orden de ya se lo voy a marcar como ya lo escribi. Esto ya lo tengo. Cambiar. Vista por rol necesario. Eh, ya. R interno. Entonces, lo otro que nos queda aca es e extension, curso, actividad y ahora son las cosas mas grandes. Tenemos el home, la implementacion del home, de una vista home. Eh, voy a crear esa realidad. Amos un home en cada una de ellas. Ah, y como esta el orden de curriculum maping. Ah, pero el de curriculum mapping lo podemos abordar porque hemos creado no mas menu que creo que ya estan ordenados, asi que eh ahora que lo pienso, que opinan de esto, chiquillos? En el curriculum mapping vamos a tener estos dos menus, cierto? y el de matrices.

## Menus de curriculum mapping: niveles y cobertura (00:20:49)

**Esteban Cortes Sandoval:** Pero en la practica podriamos tener el de matrices y estos dos dejarlos como los dejamos el de la bibliografia.

**Eduardo Bacon:** en actividad

**Esteban Cortes Sandoval:** esta aqui.

**Eduardo Bacon:** esta.

**Esteban Cortes Sandoval:** Aca. Que opinan de eso?

**Eduardo Bacon:** Cual era el

**Esteban Cortes Sandoval:** Estoy aca en el curriculum mapping.

**Eduardo Bacon:** cual?

**Esteban Cortes Sandoval:** Hoy dia tenemos dos como pre menus, digamos, menus que sirven para definir los esquemas de niveles y los esquemas de cobertura, pero ambos son, digamos, entregan valor en el contexto de las matrices de competencia. Estoy pensando si es que deberian existir solamente como un boton dentro de la matriz de competencia como para acceder desde ahi o si deberian ser un menuach, como a nivel de menus cosas que son como de apoyo digamos a la funcionalidad principal. Igual no, o sea, es una configuracion, creo que no es necesario decidirlo ahora, pero no se que opinaban de eso. Quiza igual seria bueno como comentarselo despues a Sand pensare opinion tienen ellas. No se que vieran ustedes o no les quita el sueno todavia.

**Francisco Navarro:** Es que son dos menus distintos,

**Esteban Cortes Sandoval:** En que sentido,

**Francisco Navarro:** habria que ser los convivir porque teneis las coberturas por un

## Esquemas de nivel/cobertura: menus separados o botones (00:22:22)

**Esteban Cortes Sandoval:** Pancho?

**Francisco Navarro:** lado que podi seleccionar y las niveles que son los demas. Tendreis que muestrame la

**Esteban Cortes Sandoval:** Ah,

**Francisco Navarro:** otra.

**Esteban Cortes Sandoval:** es que aca yo entenderia que uno puede ver mas de un boton o es un boton.

**Francisco Navarro:** No se.

**Esteban Cortes Sandoval:** Ah, es una buena

**Eduardo Bacon:** probado con

**Esteban Cortes Sandoval:** pregunta. Si. Bueno, si hubiesen mas igual no se si alcanza por espacio porque esta toda la como la parte de la tabla de registro, esta informacion en teoria nos queda como eso que no igual creo que podria caer, pero no lo se. Bueno, voy a sacar una captura y le voy a preguntar ahi en el chat donde estamos con Jus. Ya, ahi les mande la pregunta. Ya, pero eso es cosmetico, se puede hacer despues realmente no tiene no es nada bloqueando. Entonces, eh lo que yo estaba diciendo hoy dia ya tenemos un orden logico. Claro, tendriamos los esquemas de nivel, com de cobertura y ahora la matriz de competencia. Si, noia como que no hay que hacer un reajuste en el orden de los menus de de curriculum mapping aun. Entonces, lo siguiente que tenemos es el home. El home curriculum design eh home.

## Home / dashboard con Report Builder (00:24:19)

**Esteban Cortes Sandoval:** Pag. Ahora no tengo todavia una propuesta tan potente, creo, para homepage y aca le poner curriculum mapping

**Francisco Navarro:** En esa la idea es que muestre alguna informacion de o para el usuario para para trabajar, asi como te quedan 10 pendientes

**Esteban Cortes Sandoval:** Claro,

**Eduardo Bacon:** Ah ya.

**Esteban Cortes Sandoval:** hoy dia de lo que nos lo que mostro Juandy,

**Francisco Navarro:** O

**Esteban Cortes Sandoval:** yo no creo que yo no he explorado. Qu ustedes pueden darle una vuelta en detalle especificamente la capacidad porque creo que son dos capacidades. Una es la configuracion de una pagina como home dentro de cada eh app. Ya. Esa es una capacidad que aqui deberiamos tener pestana y dashboard. Entonces, este fue el ejemplo que mostro Juandi. Entonces, este es el homepage, eh, y este layout como de, si se dan cuenta, aqui como que tiene una estructura como, como decirlo? Como de widgets,

**Francisco Navarro:** Ok.

**Esteban Cortes Sandoval:** eh, que yo no se como se llega a configurar esta esta tipo de vista. en ese sentido. Ya, pero entonces yo yo entiendo que uno puede configurar el homepage como cualquiera de las ya existentes en la app, pero a mi eso es lo que no me como que configurar un homepage como a poner la misma pagina que ya tenemos de inicio, no me da no entrega ningun valor a lo que yo voy.

## Homepage como layout de dashboard, flujo tecnico (00:26:23)

**Esteban Cortes Sandoval:** Entonces que en homepage yo si lo veria como una como que habria que crear un layout nuevo y decidir que es lo que va a ir ese layout y ese seria el layout de homepage. Entonces lo que lo que yo habia estado haciendo en local esta semana, que fue lo que les comparti ayer por donde les comparti eso?

**Eduardo Bacon:** Ah.

**Esteban Cortes Sandoval:** Eh, se los comparti aca o no aca, que creo que ahora lo tengo arriba el ambiente local.

**Eduardo Bacon:** Gracias.

**Esteban Cortes Sandoval:** puede hacer un homepage en base a un layout de dashboard. Entonces, aqui lo que yo hice fue el flujo de hice muchas comillas que audito hizo bajo mi guia eh via a traves de datos, no a traves, pero entiendo que se puede hacer a traves de la plataforma, crear una plantillas de datos, crear reportes a partir de esas plantillas de datos y unificar esos reportes en la configuracion de un layout tipo dashbof, que entiendo es como un tipo especifico de layout que no te requiere como una como un objeto como referencial. Eh, y ahi entonces eso lo configuro como el homepage de la vista, o sea, un homepage con un dashboard de informacion, creia yo, es lo que yo creo que deberia ser como la mejor opcion para implementar. Ahora, que metricas deberia tener ese dashbof?

## Report Builder ya prototipado, resolver custom del mod (00:27:49)

**Esteban Cortes Sandoval:** Claro, yo codie y converse algo como de una dos horas no mas, entonces no tengo definidas todavia como cuales deberian ser esas mejores metricas a a montar, digamos, en el dashboard. Y en general, o sea, lo que me paso es que cuando quise que fuesen como metricas un poco mas complejas, eh, Claudito finalmente termino como construyendo un resolver especifico del mod que utilizar los resolver de el report builder, como que dijo que escapaba de las capacidades de lo que tenia el CO y ahi ya yo no no tengo el nivel o no me di el tiempo de tener el nivel para poder decir,

**Eduardo Bacon:** Oh.

**Esteban Cortes Sandoval:** no, si en realidad si se podria haber hecho con el porque no conozco a ese nivel el report field. Entonces, claro, podriamos hacer un dashboard simple, digamos, con las capacidades que nos permitan e y ese dashboard que fuese el homepage, eh, o si no hay que dedicarle un poquito mas de tiempo, unos dias mas quizas a refinar una propuesta de dashbo force, de dashboard, mejor dicho, eh, y eso. Entonces, yo creo que el homepage, entiendo, es una configuracion, pero lo que yo veo es que deberiamos usar ese homepage como la tarea como para tambien construir como la primera vista de dashboard del modulo y en este caso como es curriculum design, seria como el eh que mostra informacion de metricas de como va el avance del diseno curricular.

## Metricas del dashboard pendientes, primera incursion con Report Builder (00:29:24)

**Esteban Cortes Sandoval:** Yo creo que eso es lo que lo lo que buscaba yo con las metricas, era mas o menos representar eso. Eh, eso es lo que tengo respecto al home. Pero por lo tanto no se si logramos como priorizar algo en este sprint que viene, eh, o en realidad se podria hacer, pero probablemente sea como algo mas simple que lo que yo hice, porque de nuevo tiene que ser algo en base a lo que permitan las capacidades de el report Builder. Es como tambien la primera incursion con el report de ustedes, creo, porque creo que ustedes no han trabajado.

**Francisco Navarro:** Yeah.

**Esteban Cortes Sandoval:** tampoco funcionalmente con el report builder, no?

**Eduardo Bacon:** No nada conv por

**Esteban Cortes Sandoval:** Esta un poco

**Francisco Navarro:** Se que lo vi,

**Esteban Cortes Sandoval:** ancho.

**Francisco Navarro:** lo vi alguna vez la presentacion que hicieron, pero Un minuto

**Esteban Cortes Sandoval:** En general,

**Francisco Navarro:** aca.

## Flujo Report Builder: plantilla de datos, reporte, dashboard (00:30:49)

**Esteban Cortes Sandoval:** como para darles un un contexto como rapido, el rebord builder se maneja desde desde el up manager, no es dentro de los mods. Y uno y el flujo es crear una plantilla de datos y despues usar esa plantilla para hacer un reporte. Y esta plantilla de datos es basicamente uno le da un nombre, un nombre, una categoria. Esas categorias ya estan predefinidas como para tener categorizados los tipos de plantillas de datos.

**Esteban Cortes Sandoval:** Un codigo, una descripcion, esta parte de las etiquetas, eh todavia no se para que se ocupan bien. Eh permitir si es que us puede usar la plantilla, para que roles va a estar visible,

**Eduardo Bacon:** S

**Esteban Cortes Sandoval:** pero lo importante es esto de aca, que es como basicamente la query de graph QL que te va a entregar la estructura de datos que despues vas a usar para transformar en un reporte. Eh, aqui yo tampoco me manejo todavia en en el lenguaje como de graf, asi que las que yo hice, como dije, las hizo programaticamente claudito, pero igual las podia revisar desde aca. Y esto tiene que ver con los campos que se van a poder utilizar para para dentro de los filtros del dashboard, como que esto implica que los datos van a poder ser filtrados por estos campos y despues un dashboard creo que tiene altos campos comunes puede utilizar como para tener un filtro comun hacia todo eso, pero ahi no no explorado tanto. Eh, oh, mira, hay un problema consulta, no cuenta. Y bueno, eso es como la plantilla, basicamente con la plantilla uno construye la estructura de datos que base que v a utilizar despues para un reporte y despues los reportes se construyen en base a una plantilla. Esa es como la la gracia. Entonces, dada una plantilla de datos, que esto no se por no me esta cargando, quizas porque le puse lo de la plantilla y se quedo ahi.

## Limitacion de UI: hasta tres botones junto a create (00:32:18)

**Esteban Cortes Sandoval:** Acaso parece que si?

**Francisco Navarro:** Pro.

**Esteban Cortes Sandoval:** Cayo,

**Eduardo Bacon:** Se murio.

**Esteban Cortes Sandoval:** cayo.

**Eduardo Bacon:** Revise y soporta hasta tres botones al lado del create.

**Esteban Cortes Sandoval:** Ya. Entonces, teoria lo podriamos hacer. Bueno, cuando hagamos,

**Eduardo Bacon:** Si,

**Esteban Cortes Sandoval:** esperate,

**Francisco Navarro:** Bueno,

**Esteban Cortes Sandoval:** lo puse mal.

**Eduardo Bacon:** mi unica duda ahi es en relacion al nombre,

**Esteban Cortes Sandoval:** Como es?

**Eduardo Bacon:** que tan tanto puede llegar a soportar tres botones son muy largos?

**Esteban Cortes Sandoval:** Claro. Aja. Son muy largos.

**Eduardo Bacon:** Como va a quedar?

**Esteban Cortes Sandoval:** Si.

**Eduardo Bacon:** Como se va a ver?

**Esteban Cortes Sandoval:** Yeah.

**Eduardo Bacon:** M.

**Esteban Cortes Sandoval:** Si, es bueno. Hay que mirar eso. Vamos a ver si es que vale la pena. Eh,

**Eduardo Bacon:** quizas con un icono o como

**Esteban Cortes Sandoval:** cual? Si, podria ser aqui.

**Eduardo Bacon:** se

**Esteban Cortes Sandoval:** Cual es el Es mas claro que un bajo test,

**Francisco Navarro:** bajo

**Esteban Cortes Sandoval:** cierto? Asi

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** quizas como crasho.

## Cierre del tema home, flujo plantilla-reporte-dashboard (00:33:21)

**Francisco Navarro:** lach.

**Esteban Cortes Sandoval:** Si, va ser que crasho. Bueno, yo estaremos a futuro ya, bro. Eh, y voy a intentar creo

**Francisco Navarro:** No, si, crecio.

**Esteban Cortes Sandoval:** la plantilla se hace desde despues de la plantilla se hace el reporte que es basicamente crearle un nombre y con la plantilla seleccionada definir como la estructura con flex monster y de ahi ya el resto eh entiendo que es eso, el el reporte existe y despues se puede utilizar o llamar desde una configuracion y ahi es donde uno puede crear como un dashboard con varios reportes unificados. Esa es como la logica de los reportes. Por lo tanto, la logica, entre comillas, en primera instancia se restringe a definir cuales son las estructuras de datos que uno necesita para crear las plantillas y despues llevarlo a un a una visualizacion y eventualmente entonces a construir el dashboard propiamente. Eso es lo que en teoria hice yo con Claudito y es lo que les mostraba, como es como es la imagen.

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** Entonces, eso no se, no tengo tan claro como refinado aun el quiza eso lo voy a ver de aqui al lunes si es que tengo algo mas como mas para poder complementar y decir, "Si, vamos con un homepage de curriculum design que tenga esto que basicamente seria como en teoria, cierto?

## Dashboard simple para SP9, definicion de metricas al lunes (00:35:00)

**Esteban Cortes Sandoval:** Seria una vez habiendo creado, cierto, las plantillas de datos y los reportes, configurar el dashboard. Eh, y ese dashboard hacerlo a su vez el homepage. Esa seria como la tarea, pero creo que desde lo de ahi lo mas comillas complejo deberia ser la definicion de eh las metricas que vamos a ver en el dashboard.

**Esteban Cortes Sandoval:** En la configuracion de eso hay que lanzarse a la piscina igual, pero la otra opcion es como lanzarse y que sea algo facil, pero no se que tanto han avanzado, creo que no han avanzado tanto los otros equipos en Dasho. El equipo de Claus ha tenido tanta retroalimentacion, eh, por eso yo me tire como a jugar un poco ahi en local. Esperme. Que paso aca? que me esta hablando algo completo. Eh, 330 330. terminar esta sesion, chiquillos, a las 3:30, eh, ya. Un segundo, un segundo. Estamos trabajando para usted. Ya. Listo. Entonces, homepage confirmamos el lunes, digamos, respecto a lo cuando terminemos la planificacion. Ya, dejenme ver si es que logro eh definir algo mas respecto a metricas.

## Instructional component: contexto legacy curso-actividad (00:37:15)

**Esteban Cortes Sandoval:** Por ultimo, un dashboard simple como para ya tenerlo ahi, despues simplemente irlo complementando. Asi que eso respecto a homepage, lo terminamos de el lunes. Asi que los siguientes que nos quedan son el entretenido y el menos entretenido. El menos entretenido es el plan de migracion, el perdon, la extension del del concepto de curso actividad. en el curso que en realidad lo estamos llamando eh, como se llama? Component. Component. Se el nombre, pero dejenme que lo aca en base a lacion que entrego el que

**Eduardo Bacon:** instructional component.

**Esteban Cortes Sandoval:** ahi esta. Entonces, y mi propuesta mas funcional es esta. Y aqui voy a explicarlo porque yo creo que Pancho, tu tenes cero contexto de esta conversa o si no se si te llego algo lateralmente.

**Francisco Navarro:** No se.

**Esteban Cortes Sandoval:** Ya. Eh, esto tiene que ver con que en el legacy existe el concepto de curso actividad, es decir, yo tengo un curso, pero ese curso puede tener una actividad teorica, una actividad practica, una actividad de laboratorio, etcetera. Eso existe como la entidad curso actividad, la relacion realidad existe la actividad y la tabla UPL curso activities y siempre fue como un tema de What?

## Unificacion assessment/planning via instructional component (00:38:58)

**Esteban Cortes Sandoval:** que era uno de los temas que impedia como la unificacion de assessment y y planning, porque planning hace mas uso de ese de esa estructura de datos. Entonces ahi el equipo de la nos pidio apoyo porque hasta lo que llevamos a este punto no teniamos un modelamiento de esa estructura de informacion. E entonces eso es lo que terminamos definiendo con el nombre de componente de dictado o instructional component, ya? Eh, entonces structural component vendria siendo como el ejemplo que estaba mencionando. A ver si aqui tengo un curso. Claro, este es como la definicion de un curso. Entonces, yo tengo un curso, que es lo que se aprende? Invariante, define resultados aprendizajes, credito, esquemas de evaluacion, que esto es un activity con un record de curso. Esto ya existe. Eh, en este juego de la del componente del del el curso de actividad anterior, cierto? entra tambien al juego de la modalidad, que era un campo que nosotros ya teniamos como un curricular section con el record modality. Esas son las alternativas excluyentes, cierto?, de como se cursa como se puede cursar el curso. Entonces, el curso podria tomarse o dictarse en un periodo como eh online o semipresencial o presencial, cierto?

## Piezas acumulativas de la modalidad, coordinacion 3 equipos (00:40:15)

**Esteban Cortes Sandoval:** Entonces, nosotros podiamos ya definir ese esa informacion. Eh, pero que es lo que no podiamos definir? cierto, este otro concepto de que viene siendo de que partes consta esa forma de cursarlo, cierto? Partes acumulativas. Entonces, el estudiante hace todas las de su modalidad y eso vendria siendo el instructional component donde se podria hacer entonces teorica, eh laboratorio, etcetera, las distintas categorias que define una institucion. Y este entonces la extension y modificacion que hay que hacer respecto a lo que ya se tiene, que es implementar el instructional component. Ya? Entonces, esto le pega a ciertas cosas que ya han implementado en el equipo de Smart Campus y tambien eventualmente ciertas cosas que estan implementando desde el equipo de Student Success. Este entonces como un modelo del el modelo de datos como mas actualizado, el activity con el core, cierto? El modality que tenemos. Entonces, aqui

**Esteban Cortes Sandoval:** hay una variacion de como se trabaja actualmente el moda, como se va a trabajar con la estructura nueva y este es el nuevo que se incluye, que es el instructional comp. Y por otro lado, aca estan como eh objetos que estan relacionados a eh a la a la plan e nosotros hoy dia usamos el de offering, que vendria siendo como el la generalizacion de la seccion.

## Section vs Offering, cambios en Scheduling y Engagement (00:41:40)

**Esteban Cortes Sandoval:** Ellos estan usando section como el el objeto que eh modela como las secciones que yo estoy planificando, cierto?, en el proceso de planificacion. que cuando estas esten ya como aprobadas, por asi decirlo, recien se van a volcar hacia Offering, que ya es como la oferta academica real. Los chiquillos. Igual ahi hicimos algunas como eh sugerencias porque en realidad creemos que este nombre no es el mas adecuado porque hace confundir con la terminologia antigua con la nueva. En realidad deberia tener como un caracter mas como de plan o algo por el estilo. Eh, efectivamente me parece que lo van a cambiar aunque una segunda interaccion. que hacer una entrega continental y despues creo que van a hacer ese ese punto. Y entonces en curriculum design tenemos que hacer la implementacion de estos cambios para hacer efectivo el el la mejora, digamos. Eh, Academic Schedulin a su vez tiene que hacer estos cambios y engagement luego tiene que hacer algunos cambios adicionales. Ahi no se si viste Edu, que la habia comentado algo que terminaba impactando un poco al final del flujo creo. No, no creo que nos impactan lo que nosotros tenemos que cambiar al

**Eduardo Bacon:** Si, lo vi y por lo mismo y claro,

**Esteban Cortes Sandoval:** inicio.

## Instructional component: historias del sprint, 7 tickets / 13 puntos (00:42:58)

**Eduardo Bacon:** no nos impacta lo que nosotros teniamos que hacer, si es lo que ellos tienen que coordinar con estudio en sucesso, ahi van las decisiones. Nosotros simplemente abrimos la

**Esteban Cortes Sandoval:** Si, si. Este fue un buen ejercicio,

**Eduardo Bacon:** puerta.

**Esteban Cortes Sandoval:** Pancho, como de eh literal entre tres equipos, que fue igual desafiante, creo. Eh, pero creo que igual lo logramos resolver y gran parte creo que lo que fue poder como compartirnos informacion a traves de este de estos artefactos que te permite crear club, que son estos que estoy mostrando que quedan en linea. Fueron varios artefactos de vuelta hasta que ya llegamos como uno consolidado con con las propuestas. Entonces, estas son historias del sprint. En particular, estas de aqui tendrian que transformarse en historias desagregadas de esta misma forma, no? Siete tickets como estan aca, o no?

**Eduardo Bacon:** Es que podrian aca lo dice como para tener una epica y diferenciarla por tickets, pero podrian llegar a hacer, no se, un ticket con las diferentes tareas, pero seria un ticket grande, o sea, por lo menos estamos hablando de 13

**Esteban Cortes Sandoval:** Ya. Y ahi iba mi pregunta como que como lois tu esto respecto a

**Eduardo Bacon:** puntos.

## Estimacion instructional component: 3-4 dias / ~1 semana (00:44:10)

**Esteban Cortes Sandoval:** como cuanto de sprint creo que podria tomar hacer este ajuste extension ajuste y

**Eduardo Bacon:** Hm. M,

**Esteban Cortes Sandoval:** extension

**Eduardo Bacon:** yo creo que uno en dias podria ser unos tres cu dias tenerlo y probarlo mas o

**Esteban Cortes Sandoval:** como una semana digamos del spring.

**Eduardo Bacon:** menos. Y no,

**Esteban Cortes Sandoval:** Aha.

**Eduardo Bacon:** si no hay sorpresa deberia ser como tres tres dias o algo porque es bien operativo, es de modificar objetos, probarlo, modificar los sit, ir haciendo el s cosas asi, no no trae no trae una implementacion de componentes y cosas que son mas elaboradas de testear y

**Esteban Cortes Sandoval:** Porque aqui todavia no vamos a estar mirando la implementacion de como se termina viendo.

**Eduardo Bacon:** revisar.

**Esteban Cortes Sandoval:** Yeah. Esto en el programa de asignatura como que no vamos a estar en este alcance modificacaolo el layout o si que el de modality se va a ver afectado,

**Eduardo Bacon:** Si, si, hay claro,

**Esteban Cortes Sandoval:** no? El demectado,

**Eduardo Bacon:** por lo menos.

**Esteban Cortes Sandoval:** pero despues tenemos que decidir como que vamos a hacer con el structural component.

**Eduardo Bacon:** Claro, en eso esta creado quea siendo mi listado,

**Esteban Cortes Sandoval:** El tab modalidades del curso permite gestionar piezas. Formulario del curso con pieza. Claro, aqui esta este esta considerado este es.

## Instructional component parte de curriculum design, 4 dias (00:45:34)

**Esteban Cortes Sandoval:** Aja. Si.

**Eduardo Bacon:** Mm.

**Esteban Cortes Sandoval:** En activity. Ah, si, en teoria esta consolidado para un esta consolidado, no? Entonces esta bien. Esta bueno. Ya. Entonces este le vamos a poner, esto es parte de curriculum design.

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** Vamos a poner implementacion de instructional component. Eh, vamos aca. A

**Eduardo Bacon:** Con yo diria 4 dias. Entonces, ahora

**Esteban Cortes Sandoval:** ver, hay que completarlo en base a lo que tenemos. Ahi ya tenemos, digamos, definido ese alcance y nos van a quedar los ultimos 40 minutitos para mirar la parte que yo encuentro mas entretenida para no

**Eduardo Bacon:** podrias dejar pegado el artifact ahi por ultimo,

**Esteban Cortes Sandoval:** perderlo por mientras.

**Eduardo Bacon:** no? Y solo contar que esto era lo que solucionaba un dolor de que venia desde antes en la comunicacion entre los las verticales.

**Esteban Cortes Sandoval:** Si, si, si, si. Es un fue bueno esta esta conversa y abordarla pronto. Eh, los chiquillos tenian una idea distinta que era como el activity line antes, pero y a mi no me no me calzaba.

## Origen de la propuesta instructional component, 3 visiones (00:47:04)

**Esteban Cortes Sandoval:** Asi que afortunadamente con tu propuesta Edu y con la iteracion mia como que llegamos al mismo a la misma propuesta y a los chiquillos de Smart Campus tambien le les parecio que era buena, asi que llegamos a

**Eduardo Bacon:** Esto parte de una conversa que tenia teniamos con con la AU de cuando estabas en vacaciones,

**Esteban Cortes Sandoval:** Si,

**Eduardo Bacon:** que me llego con la consulta y empezamos a iterar,

**Esteban Cortes Sandoval:** si. Es que y y fue de antes de eso porque antes de

**Eduardo Bacon:** asi que fue fue su tiempo llegar a a una

**Esteban Cortes Sandoval:** que yo se lado en vacaciones como que la me dijo,

**Eduardo Bacon:** solucion.

**Esteban Cortes Sandoval:** "Oye, no tenemos modelado el curso de actividad." Y yo le dije, "Nosotros tampoco, asi que lo que ustedes nos propongan como que lo revisamos, cacha." Eh, ellos son los que en realidad hacen mas uso de ese objeto y tenian como al menos mas clara como la necesidad y claro ahi nos dieron una propuesta, justo yo sali de vacaciones, por eso le dije, "Mira, mira lo con Edu y ahi fue a la vuelta la me dijo que no habia salido todavia blanco. Bueno, ma lo revisamos porque la otra propuesta y no no me convencia realmente, eh, pero se logro se logro, asi que tenemos ese y ya vamos entonces a curriculum mapping.

## Matriz de competencias: primera parte y tipos de matriz (00:48:11)

**Esteban Cortes Sandoval:** Curriculum mapping curriculum mapping aca. Ya. Entonces, hasta ahora tenemos esquemas de cobertura, esquemas de nivel y Pancho ahora estado trabajando, cierto?, en matricas de competencia, pero la primera parte ya mientras Pancho, tu estais implementando la primera parte, yo segui entonces ahora trabajando en la informacion que nos faltaba de la segunda parte que en particular era como como hacer la relacion con los planes de estudio y las facultades y como va a ser la parte de la definicion de competencias. Hoy dia tengo la parte de relacion con plan de estudio mucho mas al detalle y la parte de la competencia. Todavia estoy terminando algunas cosillas de de revisar. Tengo el flujo como implementado, pero no lo he revisado. Si es que hay como me convence hay algunos casos bordes que revisar, pero vamos a mirar ahora como todo lo que lo que se tiene. Entonces, la creacion de la matriz tiene harto mas informacion que antes. Hasta lo que estuvimos viendo contigo, Pancho, me parece que es hasta eh digamos de aqui para arriba e en esta pestana.

**Francisco Navarro:** Si.

**Esteban Cortes Sandoval:** De aqui para arriba, yo solamente hice un pequeno ajuste que es los tipos de matriz, eh, que creo que ahora tenemos cinco, pero los vamos a pasar a ser cuatro.

## Cuatro tipos de matriz: generica, sello valorico, sello institucional, especifica, profesional (00:49:34)

**Esteban Cortes Sandoval:** Ya tiene que ver un poco con lo que voy a mostrar abajo. Esta maqueta tiene harto como de de textos de explicacion que en la practica no van a ir o no creo que no deberian ir porque no tenemos tanto eso. Creo que si tenemos estos textos asi, pero me falta como terminar de refinar como que textos deberian ir o no, pero el flujo como principal esta ya mas modelado. Decia entonces que tipos de matriz estoy considerando cuatro en base como a lo que investigue. son las genericas, que son como las genericas o transversales y tipicamente como para toda institucion. Eh, sello valorico, que basicamente son lo que dicen como los valores que representa la institucional, sello institucional que son distintas a las genericas, las especificas que son especificas de una disciplina de en particular y las profesionales que son del ejercicio profesional. Ya, aqui a diferencia de lo que tenemos actualmente, que tenemos como solamente los campos, eh, como los nombres, aqui le estoy agregando como digamos los apellidos porque como que tipicamente cuesta, incluso a mi me costaba como diferenciarlas de cual es el objetivo que tiene una u otra. La idea tambien es que la institucion cuando las este categorizando las categorice entendiendo bien como cual es el objetivo de de la categorizacion.

## Matrix adoption: relacion con planes de estudio y gobernanza (00:50:51)

**Esteban Cortes Sandoval:** Eh, entonces aqui hubo un pequeno cambio de las de las eh categorias, como digo, y y y lo que viene entonces ahora abajo es como en la asociacion de los planes de estudio. Ya, esto esta asociado a un objeto nuevo que se llama matrix eh adoption, creo. Tengo que ver ahi el nombre, igual lo tengo documentado en la documentacion que tengo que publicar general, pero basicamente tenemos dentro del objeto de eh matriz del recort matriz, si no me equivoco directamente la relacion como a la alado, las facultades que tienen como la gobernanza, digamos, son las que son las responsables de esta matriz, ya? Eh, entonces ahi tenemos las responsables, es un un nivel de informacion, es una lista, digamos, de las la las facultades que son responsables. Eh, de nuevo, no nos no nos casemos con el componente de asociacion, si en realidad en UP1 se ocupa otro, se ocupa el que se tiene. Esto es simplemente como del refinamiento de la maqueta. Y luego tenemos el alcance de adopcion. Lo siguiente es como la mi generalizacion respecto a la relacion de planes de estudio, pero ya como mas fundamentada teoricamente. Ya, que es lo que haciamos antes? Seleccionabamos una facultad, eso nos eh filtraba una lista de planes y se asociaban un monton de planes de estudio a la matriz, ya?

## Alcance de adopcion: institucional, por unidad, explicito (00:52:26)

**Esteban Cortes Sandoval:** Eh, pero eso a su vez como que se mezclaba implicitamente un poco con el tipo de matriz, eh, porque hay ciertas como correlaciones entre eso, en el sentido de que una matriz generica o digamos una matriz de serio institucional es una matriz que en teoria el alcance deberia ser toda la institucion, cierto? Porque es algo transversal. Entonces, yo tendria que asociarla como a todos los planes de estudio, eh, versus una matriz como de caracter eh especifico que en realidad podria aplicar eh no se, son las especificas de una disciplina a nivel de la facultad, podria aplicar a todas las carreras de la facultad o a todas, excepto una. Entonces ahi habria como implicitamente la como el alcance, si bien todo se termina como traduciendo a una lista de planes de estudio, hay como un nivel intermedio de como cual es el alcance de la adopcion de esa de esa matriz. Entonces, en ese contexto, lo que yo hice fue incluir algunos campos adicionales para el modelamiento de eso dentro del objeto. Ya? Entonces aqui esta como el tipo de alcance eh que son tres. Institucional, cierto? Es decir, que aborda hacia todos los planes de la institucion por unidad o facultad, cierto? En ese sentido, que son planes de a unidades que se escogen como para que para que las lleven, para que hagan la adopcion, cierto?

## Gobernanza y obligatoriedad de la matriz (00:53:51)

**Esteban Cortes Sandoval:** Y aqui estamos diferenciando al igual que en otros objetos como la gobernanza podria ser de una unidad distinta a la que la termina como implementando, como que una la gestiona, otra la implementa, es como mas flexibilidad en ese sentido. Y por ultimo, el explicito, como por ejemplo las matrices de tipo eh profesionales quizas, donde como que van a eh especificamente a hacer para una lista de planes que desarrollan esas capacidades profesionales. Que controla como este alcance general? Eh, bueno, esta alcance, mejor dicho, ademas de controlar como cuales son los planes que yo puedo asociar, eso es lo que controla. Eh,

**Esteban Cortes Sandoval:** tambien tiene un caracter, algo que hoy dia no tenemos, que es eh la obligatoriedad que hay respecto a sobreoptar o no adoptar esa matriz. Entonces, entendiendo que esto es como una gobernanza central, que decimos, esta es la matriz, que toda la a nivel institucional, uno podria decir esta valorico, que esperamos que la acepte todas las planes, pero no estan obligados a a tributarla, digamos. Entonces, en ese caso es que cada plan decide si la si la adopta, pero si no, si es obligatoria, entonces se esta esperando que todos los planes realmente eh de la institucion en este caso tienen que tener como adoptada la matriz.

## Registro de vigencia y alertas de consistencia (00:55:07)

**Esteban Cortes Sandoval:** Ya? Entonces, esto es una configuracion como llamada especifica de los alcances. Es algo que hoy dia en lo actual digamos queda implicito. Es como la matriz esta asada al plan, listo. Eh, pero no hay un registro de desde cuando esta asociada al plan, cierto? Desde cuando se empezo a implementar esa informacion como que esta implicita y ahora la estamos haciendo explicito. Ya. Entonces, aqui tenemos el alcance, tenemos la obligatoriedad. Eh, esto que controla, bueno, ahi que varias alertas, cierto?, que son automaticas que estan saliendo aca. En este caso dice una matriz profesional normalmente se adopta eh plan por plan con alcance institucional que es elegible para toda la institucion y se guarda igual esa advertencia no validacion. Se dan cuenta que me est me esta alertando porque yo puse que es una matriz profesional, pero le di alcance institucional, lo cual es como ilogico en ese sentido. En tal caso, cierto, como es profesional, lo esperable es que sea como explicito. Si bien se puede hacer el otro flujo, cierto? Es una alerta. Eh, y en parte va a eh lo que quizas yo en algun momento les comente y si no se los comento, cierto?

## Agregar planes segun alcance, paginacion y reconciliacion (00:56:15)

**Esteban Cortes Sandoval:** Yo creo que tenemos que ir reforzando como el acompanamiento en el diseno, ser un poco mas alla que solamente hacer las acciones cruz acciones, sino que tambien como el por que se estan haciendo esas acciones o si son o no correctas o recomendables. Bien, entonces aqui tiene un par de alertas dependiendo cuando ve como esa un poco de inconsistencia entre lo que es el tipo de matriz y siendo adoptada ese tipo, ya? Pero no es restrictivo, termina igual podrian haber terminado como ejecutando ese esas esas configuraciones. Entonces, institucional, cierto? Voy a hacer ejemplo, no se, genericas institucional electivas, cada plan decide, cierto? Y aqui la idea es agregar los planes. Este botoncito que esta aca me mostraria como los planes con la opcion de poder, por ejemplo, seleccionar todos los de la institucion. Obviamente esto es una tabla que en la practica, este es un ejemplo, en la practica probablemente va a tener que tener una paginacion porque realmente van a ver, si yo pongo institucional son todos los planes de institucion que podrian ser cientos, cierto? Entonces aqui estariamos como agregando lo mismo en esto, cierto? Esto tendria como una vaginacion claramente cuando lleguen a hacer como todos esos planes.

## Diferencia electivo vs obligatorio y reconciliacion de reglas (00:57:25)

**Esteban Cortes Sandoval:** Eh, y aqui cierto, esto es electivo, cierto? Asi que les voy a explicar al tiro como este lo el ejemplo de la exhibilidada y yo podria quitar, cierto, algunas de ellas porque esto es electivo. Ya. Distinto es cuando es obligatorio, cierto? Eh, obligatorio. Aqui estan todas los planes. En teoria tienen que estar todos los planes. Aqui hay un plan que me falta, cierto? Porque es obligatorio que lo tengan todos los planes. Eh, si se dan cuenta, incluso si yo cambio esto, voy a cambiarlo aca, lo voy a cambiar aca y me dice aqui la regla cambio y no se aplico a los planes todavia. Revisar el cambio antes de guardar. Entonces, pongo a revisar el cambio y me dice que eh hay un como yo dije que era obligatoria institucional, deberian estar todos los planes asociados eh a esa matriz y aqui hay una que no, que fue la que yo manualmente no asocie. Si me dice aplicar cambios o reconciliar, que es lo mismo que esta aca, aqui no hay cambios como que reconciliar, me lo completo. Ahora ya me dejo como el plan que estaba listo ya.

## Exenciones de planes con comentario y registro (00:58:31)

**Esteban Cortes Sandoval:** Y como aqui hay una obligatoriedad, no tampoco siempre nuestro espiritu deberia ser que hay que ser flexibles, eh, esta la capacidad de poder eximir como un plan dentro de es decir, como si bien es esperable que todos los planes tengan, cierto, la matriz, eh, dado que este por x motivo no se va a poder cumplir esa regla, uno deja explicitamente como marcado que ese plan esta eximido. nivel del dato va a quedar registrado como que ese plan esta eximido de hacer esa la asociacion con la con la matriz, digamos, no la esta haciendo uso y aqui me deja dejar como un un comentario y eventualmente esto implica que cuando editemos podriamos reincorporar y quitar esa exhio mas flexible. Aqui me dijo, por ejemplo, eh, que hizo est un flujo. Esto me dice que esta origen explicito por regla. Si yo lo quito aqui, reconciliar, aplicar cambios por regla. Y por que me dija por regla? El otro me dice explicito. A ver, creo que aqui tengo un un book de la maqueta. eh agregar planes institucional obligatoria y ahi esta como explicito. E, claro, aca la idea es poder categorizar si fue eh aqui no estoy seguro que tengo un un argumento del por que es necesario esta columna, pero no me acuerdo, cierto?

## Estado de la matriz: borrador al crear, vigencia al publicar (01:00:05)

**Esteban Cortes Sandoval:** Una diferenciacion entre si fue agregado de forma explicita por la regla o no. Ahi tengo que que revisar para poder comentarles. Lo tengo comentado, pero eh ese caso no me no, como se llama? No lo recuerdo. Aqui la idea es que esto tambien es cuando una vez est esta informacion aqui va a estar linkeada tambien al estado de la matriz. Entonces, eh, que ahora que lo veo, el estado no se en que parte lo tenemos, creo que no lo tenemos incluido, pero igual la matriz tiene que tener un estado, asi que eso es algo que nos falta como incluir.

**Francisco Navarro:** Pero al crear est dejandolo por el momento ahora como lo deje al crear quedando como borrador siempre.

**Esteban Cortes Sandoval:** Ah, ya. Y despues cuando uno lo edita lo puede cambiar, cierto?

**Francisco Navarro:** Si, si.

**Esteban Cortes Sandoval:** Ya. Eh, esto esta estado. Vale, gracias por recordar. El punto es que como que esta vigencia en realidad es algo que se hace efectiva desde que se publica. En teoria, cuando yo lo creo, mientras no publique la matriz, no tiene una vigencia. Pero cuando yo ya publique, estariamos declarando como este plan de estudio pasa a tener vigencia esta matriz desde tal fecha en adelante.

## Logica de asociacion por institucional/unidad/explicito y alertas (01:01:09)

**Esteban Cortes Sandoval:** Bien, entonces esta es la logica de asociacion. Bueno, mostre la institucional, voy a mostrar las otras. Si fuese como por unidad, la diferencia es que aqui entonces me van a salir eh unidades de facultades, digamos, una o mas. Y eh cuando yo, por ejemplo, si hago electivo, cierto? Que dice aqui? Fuera de alcance explicito. Hay dos que estan fuera de alcance porque no son estas dos de aqui. Las voy a quitar todas si son electivos, cierto? Yo ahi puedo elegir realmente cuales quiero que eh adopten eso, cierto? Pero en realidad si yo lo hago obligatorio, aqui me dice que hay una alerta porque como obligatorio todas las de la facultad deberian estar incluidas. Entonces mas o menos esa es como la diferenciacion de la alerta. Si es electivo, no hay alerta, cierto? Pero si hay un filtro sobre cual es las que yo puedo asociar en este caso, si es obligatorio, hay una alerta cuando falten, cierto? Algunas que inclu y si por ejemplo yo hiciera explicito, cierto? Eh, dice, "La regla cambio y no se aplico a los planes todavia. Aqui hay que aplicar cambios de cosas que no estan listas." Creo que esto es un error mio

## Alcance explicito, el mas cercano al flujo actual (01:02:21)

**Esteban Cortes Sandoval:** realmente. En este caso es eh explicito seleccion de los planes y eh selecciones. No hay nada que mandatar. En este caso creo que me falta revisarlo porque en el explicito en el explicito ah, creo que por defecto en el explicito estamos tomando como que eh aqui estoy yo declarando, cierto? Estos son los planes efectivos que necesitan esta matriz. Entonces, no hay un tema de si es obligatorio o no es como por defecto obligatorio y por lo tanto en el explicito yo tengo que buscar especificamente como cuales son los planes que voy a querer eh que desarrollen esta competencia. Entonces, ahi ya no es tanto como en el otro porque claro, el otro hace mas sentido porque son niveles mas generales. En la institucional son muchos planes eh que podrian ser de ahi. La facultad tambien tiene un conjunto de planes, pero en el explicito ya yo estoy declarando como disenador esta matriz aplica especificamente a estos planes. O sea, es como, digamos que el explicito es como el mas cercano al que tenemos hoy dia. El hoy dia es como el campo, el flujo mas simple, pero con esta generalizacion estamos tambien abordando como otros casos mas generales y siendo mas explicito respecto a ese a ese trabajo de de informacion.

## Propuesta de separar la interfaz en pestanas (01:03:35)

**Esteban Cortes Sandoval:** Ya. Esta es la primera parte de facultades, asociacion de facultades, asi que eh opiniones.

**Francisco Navarro:** mucha info para rellenar de una sola vez. Me esta complejo el Es alto tenes que rellenar y si te equivocas en algun

**Eduardo Bacon:** Exacto.

**Francisco Navarro:** punto va a costar como que remediarlo,

**Esteban Cortes Sandoval:** Podriamos quizas separarlo como en otra pestana.

**Francisco Navarro:** yo creo.

**Esteban Cortes Sandoval:** Ah, como podriamos poner una pestana de informacion general y luego una de eh

**Francisco Navarro:** Aja.

**Esteban Cortes Sandoval:** alcance. Claro.

**Francisco Navarro:** Ver.

**Esteban Cortes Sandoval:** Y en alcance podemos poner esta parte de aca en particular.

**Francisco Navarro:** Si.

**Esteban Cortes Sandoval:** Ya. Si, me parece. Esa es idea.

**Francisco Navarro:** ir guardando por cosas igual mas facil porque guard informacion general entrar a editar los

**Esteban Cortes Sandoval:** Claro.

**Francisco Navarro:** planes y solo y guard

**Esteban Cortes Sandoval:** Ah, ya. Si, tenis toda la razon. Ya, buena. Entonces, lo voy a pasar una pestana.

**Francisco Navarro:** Vale.

**Esteban Cortes Sandoval:** Tienen toda la razon, chiquillos. Es una buena idea. Aparte que esta como autoconenido en ese sentido, asi que tiene como una forma como buena narrativa de poder incluir ahi, eh?

## Gobernanza: unidad duena nunca nula, caso huevo-gallina (01:04:47)

**Esteban Cortes Sandoval:** Ya. Entonces, lo paso una pestana. Okay. Que mas? Que mas? Shoot me

**Francisco Navarro:** que las unidades duenas que pueden hacer por las matrices o ellos son encargados de disenarla, de actualizarla ahi,

**Esteban Cortes Sandoval:** con las matrices. Quien es responsable matriz? Quien la aprueba? Si, en realidad aqui lo tenemos como eh responsabilidad y aprobacion.

**Francisco Navarro:** No.

**Esteban Cortes Sandoval:** Eh, es un poco como que fue primero el huevo de la gallina, porque igual alguien tiene que poder crearla aun cuando todavia no hay como eh una facultad asociada, cierto? Pero claro, deberia ser esto, deberia ser la gobernanza de quien, que usuarios, desde que facultad deberian poder,

**Francisco Navarro:** Cuento que te

**Esteban Cortes Sandoval:** Claro, estarian haciendo esta en la edicion, cacha, edicion de competencia,

**Francisco Navarro:** habla.

**Esteban Cortes Sandoval:** etcetera. Eh, entonces si es que es quien controla la matriz, pero como digo, como el huevo de la gallina, igual tiene que haber primero un usuario general que crea la matriz y otorga esa esas capacidades a las facultades, a las unidades de gobernanza.

**Francisco Navarro:** Que tenemos que ponerle un que nunca puede quedar nulo porque ahi la matriz.

## Curva de aprendizaje del explicito, dependencia entre pestanas (01:05:57)

**Eduardo Bacon:** M.

**Francisco Navarro:** Yeah.

**Esteban Cortes Sandoval:** C.

**Francisco Navarro:** Lo

**Esteban Cortes Sandoval:** Mhm.

**Francisco Navarro:** importa.

**Esteban Cortes Sandoval:** Aha.

**Francisco Navarro:** Explicitos, no? Lo de los planes se ve bien. Habria que ponerle mas mas eh, como decirlo? de mas informacion de que cada plan, yo creo al principio, porque al principio yo creo que va a costar cuando esten recien adoptando la herramienta. Es como,

**Esteban Cortes Sandoval:** M.

**Francisco Navarro:** que significa explicito? Que significa esto? Que pasa? Igual la ayuda estan buena, pero va a costar un poco que lo que lo manejen asi

**Esteban Cortes Sandoval:** Si, o sea, lo van a tener que igual es un cambio,

**Francisco Navarro:** como

**Esteban Cortes Sandoval:** digamos, en ese sentido y vamos a tener que estar bien acompanados tambien de los consultores para explicar el flujo, pero pero si, o sea, primero que todo entiendo entiendo que lo entendieron igual mi primer punto es como que sea logico

**Francisco Navarro:** Si, si se entendio despues es logico,

## Dato dependiente entre pestanas: tipo de matriz vs alcance (01:07:17)

**Esteban Cortes Sandoval:** igual.

**Francisco Navarro:** pero al principio como que cito la explicacion.

**Esteban Cortes Sandoval:** Si, si, si, si. De

**Francisco Navarro:** Y lo el otro problema que al pasarlo a una pestana,

**Esteban Cortes Sandoval:** acuerdo.

**Francisco Navarro:** uno de los campos que necesita el coso queda en la otra pestana que va a ser, creo que era el flexible, no?

**Esteban Cortes Sandoval:** El flexible. Uno de los campos que es este. Si.

**Francisco Navarro:** Ese ese,

**Esteban Cortes Sandoval:** El tipo de matriz de tu.

**Francisco Navarro:** ese va a quedar en la otra.

**Esteban Cortes Sandoval:** Tipo de matriz. Este tipo de matriz podria quedar en otra pestana. O sea, si hay un hay como una una dependencia media implicita. Si es cierto, quizas deberiamos mezclarlo la opcion tendriamos como tipo de matriz y el alcance.

**Eduardo Bacon:** Tak.

**Esteban Cortes Sandoval:** Si, si, pero no me gusto convence. Creo que igual me gustaria conversarlo con que opinas la CAMI con la con Sandra para tener otro otras opiniones adicionales porque si estan como medias implicitas, pero la idea de esto es que el tipo de matriz es una un dato general y la opcion depende un poco de deberia ser consistente con ese tipo de matriz,

**Francisco Navarro:** Mhm.

**Esteban Cortes Sandoval:** aunque no es restrictiva, cacha, como algunas de las alertas que salian era como esta es, no se, profesional, pero si yo le pongo que es institucional, hay una alerta, cacha, porque si es profesional realmente no se espera que sea, incluso dice se guarda igual, es una advertencia, no es una validacion. Entonces, en ese sentido, personalmente me hace mas sentido llenar el dato general y cuando yo lo estoy llenando digo, ya se esta es una matriz de este tipo y luego dentro de ese tipo declaro la siguiente pestana como el alcance, cacha.

## Riesgo de perdida de datos entre pestanas (01:08:38)

**Esteban Cortes Sandoval:** Hay una, no te niego que hay una relacion, pero no es tan directa porque es una sugerencia mas no una algo restrictivo. Yo adoptaria por dejarlo en la pestana como como que esta y no cambiarlo a la segunda, pero creo que igual seria bueno conversarlo con las chiquillas teniendo ahora la el diseno con las pestanas.

**Francisco Navarro:** Eh, tengo una duda, Ed esta en una pestana y te mueve. Ab. Esa otra podia recuperar las datos de la otra pestana Bueno,

**Eduardo Bacon:** Lo mismo iba a comentar para alla porque ahi el tema esta en que como tienes una pestana que

**Francisco Navarro:** no.

**Esteban Cortes Sandoval:** Vale.

**Eduardo Bacon:** esta afectando la otra, eh los datos viven en el cache, no no los releen. Entonces no estoy seguro si se esta recalculando, necesita un gatillo, algo para que le advierta. Entonces, pero el usuario puede pasar eh pestana uno, ya? Okay. Va a la pestana dos, guarda la pestana uno, modifica y no sabe que la pestana dos le esta advirtiendo de algo y no hay forma de decirle tampoco, "Oye, este cambio entonces esta modificando algo en la pestana dos."

**Francisco Navarro:** Hm.

**Eduardo Bacon:** No conversan bien las pestanas cuando pasa eso. Por lo menos lo mismo que me estaba pasando cuando cambiaba el eh el plan de estudio entre secuencial y modular.

## Guardado global saca de la vista, perdida silenciosa (01:09:58)

**Eduardo Bacon:** Entonces el usuario no tenia como saber que estaba pasando, se hacia el cambio, que estaba pasando al otro lado. Cuando iba a guardar le podia advertir, oye, estas cambiando esto, hay que hacer esta otra modificacion, no va a pasar esto. Pero si no eh puede seguir trabajando y no se va no lo no se va a notificar,

**Francisco Navarro:** Ya.

**Eduardo Bacon:** no va a ser acusa recibo.

**Francisco Navarro:** Y creo que si si guardas en una pestana te saca siempre el faul. Si por ejemplo estais en la pestana A y teneis cambio en la B y guardais la A, creo que te saca de la vista y te deja como en el listado. No se si se puede desactivar eso, pero pasa eso. Entonces podriis perder los datos que estuvierais toqueteando en la otra pestana.

**Esteban Cortes Sandoval:** Y eso es en el contexto de porque, por ejemplo, si en la primera pestana me pongo generica y voy a la segunda pestana al alcance

**Francisco Navarro:** No, no es que esta editando, por ejemplo, esto.

**Esteban Cortes Sandoval:** Mm.

**Francisco Navarro:** a la competencia, cierto? O a la, no se, a cualquiera y terminaste las competencias o viste informacion general a guardar por decir guarda y

**Esteban Cortes Sandoval:** Mm.

**Francisco Navarro:** perdiste todas las competencias que no se guardan otra

**Esteban Cortes Sandoval:** Ah, ya.

## Guardado por pestana no es buena practica con datos dependientes (01:11:09)

**Esteban Cortes Sandoval:** Pero respecto como al guardado de cada pestana.

**Francisco Navarro:** vez.

**Esteban Cortes Sandoval:** Aja.

**Eduardo Bacon:** Ahora, eh no es una buena practica tener en esto, por lo menos a como esta funcionando ahora el tener datos como que dependan

**Esteban Cortes Sandoval:** Yeah.

**Eduardo Bacon:** entre pestanas, porque ahi cuando tu cambies, que era el tipo de matriz, entonces va a afectar a la a la otra pestana que te obliga como hoy tienes que hacer algo en la otra pestana para arreglarlo porque te falto ahora con esto te falta cumplir algun requisito. Y como le avisamos eso al al usuario?

**Esteban Cortes Sandoval:** M.

**Francisco Navarro:** son como los problemas que de las limitaciones que tenemos, pero si guardais todos los datos autocenido que son de Yeah. Ordais presidente guarda si asi queda mas mas

**Esteban Cortes Sandoval:** Porque si hoy dia cuando cambiamos de pestana pestana yo no he guardado me

**Francisco Navarro:** prueba.

**Esteban Cortes Sandoval:** tira alguna alerta o

**Francisco Navarro:** Eh, no se,

**Esteban Cortes Sandoval:** no

**Eduardo Bacon:** Creo que no.

**Francisco Navarro:** no probado p es un buen

**Eduardo Bacon:** Creo que no.

**Francisco Navarro:** punto. No, yo no lo he probado, por lo menos tienes que Claro,

**Esteban Cortes Sandoval:** porque quizas eso seria algo como considerar

**Eduardo Bacon:** Mira.

**Esteban Cortes Sandoval:** igual.

**Francisco Navarro:** como tienes que guardar antes de moverte 30

**Esteban Cortes Sandoval:** Claro,

## Historia del modal flotante con guardar por paso (01:12:27)

**Francisco Navarro:** anos.

**Esteban Cortes Sandoval:** porque yo entiendo que la lo que estabamos haciendo es un parte de la conversacion que se tuvo en algun momento, no? De esto de que cuando no lo teniamos en modo como full, sino que quedaba como el modal flotante, como que el modal tenia un boton guardar abajo como para cada paso que uno iba haciendo,

**Francisco Navarro:** Oh.

**Esteban Cortes Sandoval:** cierto? que era como el simil de lo que luego se extendio a la vista general con pestana. Entonces, no recuerdo en que quedo finalmente esa esa conversacion sobre si el boton era

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** general o era contextualizado a la

**Eduardo Bacon:** Si, no,

**Esteban Cortes Sandoval:** pestana

**Eduardo Bacon:** en validando eh tu puedes anadir datos a una pestana y moverte la otra sin eh advertencia alguna y despues de eso

**Esteban Cortes Sandoval:** ya.

## Boton de guardado global: confirma que preserva entre pestanas (01:13:48)

**Eduardo Bacon:** el guardar es global. Antes estaba claro porque estaban anadiendo que fuera uno a uno, pero teniamos esa duplicidad de botones donde habian dos guardar. Lo simplificaron y quedo uno global que guarda y como dice Pancho,

**Esteban Cortes Sandoval:** Aja.

**Eduardo Bacon:** guarda y te saca.

**Esteban Cortes Sandoval:** Pero entonces si yo me muevo entre pestanas no pierdo informacion porque si es global eso no se si hay un error o no,

**Eduardo Bacon:** Si voy deberia.

**Esteban Cortes Sandoval:** porque si si el boton es global no deberia perder informacion entre pestallas porque cuando voy a guardar voy a guardar con el global.

**Eduardo Bacon:** Claro, si voy a una y guardo en otra pestana, guarda todo. Pero ahi entonces se te puede generar el caso de

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** rellenaste la informacion general, seleccionaste tu tipo de matriz, te fuiste a la dos, rellenaste todos los datos, volviste a la uno, modificaste el datos y entre esos el tipo de matriz y guardaste. Nunca volviste a la otra pestana, nunca supiste que en la segunda pestana tenias algo que que hacer,

**Esteban Cortes Sandoval:** una alerta

**Eduardo Bacon:** a no ser que dieramos una forma alertada o algo,

**Esteban Cortes Sandoval:** ya.

## Alerta visual en pestana afectada, posible extension de core (01:15:00)

**Eduardo Bacon:** pero eh Yupi no tiene una forma o yo no he visto por lo menos una forma nativa dentro de los recordist como de mostrarle una alerta, tendria que ser un modal, una cosa asi.

**Esteban Cortes Sandoval:** Si, porque lo unico que se me ocurre es como que que la segunda pestana apareciera un icono quizas aqui, cacha? como que acaba decir como la pestana de alcance y que apareciera una alerta,

**Eduardo Bacon:** Claro.

**Esteban Cortes Sandoval:** cacha, decir que yo cambie algo aca como para decirme hay algo ahi que tambien cambio que no se si es factible tecnicamente, pero que es lo que se me ocurriria.

**Eduardo Bacon:** Ab.

**Esteban Cortes Sandoval:** Yeah.

**Eduardo Bacon:** O sea,

**Esteban Cortes Sandoval:** visualmente.

**Eduardo Bacon:** visualmente no no es como modificable aquello porque ahi ya nos meteriamos en el en el core,

**Esteban Cortes Sandoval:** Claro, pero o sea,

**Eduardo Bacon:** habria que hacer una implementacion de esos

**Esteban Cortes Sandoval:** no dejo de lado, claro, no no dejo de lado que si lo necesitamos y la resolucion es como implementarlo capacidad corria que considerar como cacha capacidad C, que creo que es el caso mas borde, cierto? que la edicion

## Extension de core: resolver custom que bloquee el guardado (01:16:11)

**Esteban Cortes Sandoval:** de ese campo que eventualmente se podria dar despues en otros contextos de que una pestana eh tenga

**Eduardo Bacon:** Bueno,

**Esteban Cortes Sandoval:** un dato que podria afectar a otro, creo yo. Entonces ahi tampoco creo que sea mal esa extension, pero creo que de lo que hemos visto, entonces ese seria como el caso Bord que quizas no tendriamos que implementar la primera iteracion, pero tendriamos que documentarlo para para hacerlo en en una extension.

**Eduardo Bacon:** Si, yo creo que para hacerlo viable habria que ver la posibilidad de intervenir el boton de guardado, no en cuore, sino si se puede tener un resolver custom dentro de eso que que vaya con el guardado y que bloquee el guardado si es que no se esta cumpliendo alguna condicion, pero tendria que validar bien si se puede en UP.

**Esteban Cortes Sandoval:** M.

**Francisco Navarro:** Yo trate con lo del level esquema y no estan separados.

**Eduardo Bacon:** Ah

**Francisco Navarro:** Habria que ver como porque la las condiciones que le ponis no bloquean el boton porque

**Eduardo Bacon:** ya.

**Francisco Navarro:** el boton esta mas afuera en en la entonces o mas adentro, no se como decirlo.

**Eduardo Bacon:** Hm.

**Francisco Navarro:** Y entonces cuando tu intervienes no le llega al form que esta no cumple condiciones, como que siempre queda como habilitado. Entonces, hay que ponerle como los mensajitos de que no se eso y el bloqueo generales porque el ber lo bloquea como la insercion y pero no

## Modal nativo de bloqueo, documentar la extension (01:16:11 cont.)

**Eduardo Bacon:** Quizas podriamos pensar en una extension de de core con eso de por lo menos poder bloquear el guardado para poder detectar si es que los formularios son validos.

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** se detecta con uno de los formularios invalidos, bloquear y levantar un model que es algo ya nativo que tiene YP y ahi dle la informacion de oye, te faltan tal cosa.

**Esteban Cortes Sandoval:** Okay, lo voy a despues voy a procesar la informacion de la llamada, asi que ahi lo dejamos tambien documentado.

**Francisco Navarro:** Oh.

**Esteban Cortes Sandoval:** Eh, ya nos quedan 10 minutitos, asi que para ir terminando,

**Eduardo Bacon:** H,

**Esteban Cortes Sandoval:** dejen aqui mostrarles la segunda parte. Eh, la segunda parte.

**Eduardo Bacon:** yo solo queria comentar asi rapido el tema de eh hermos

**Esteban Cortes Sandoval:** Dale, dale.

**Eduardo Bacon:** eh no es tan bloqueante ni importante, pero si en visual que las maquetas van quedando bien con el tema, por ejemplo, con los budgets en los en los recordist,

## Mejoras visuales RecordList: badges y columnas computadas (01:17:41)

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** teniendo mas detalles y eso nos falta y hace harto de sprint que tenemos eso y que despues tenemos que transformarlo simplemente en un texto y encuentro que tener colorcitos y cosas asi le anade mucha informacion directa al usuario,

**Esteban Cortes Sandoval:** Ya, o sea,

**Eduardo Bacon:** que es algo que deberia Yeah.

**Esteban Cortes Sandoval:** estamos en el momento de empezar a Yeah. mejora del record list que pudiesemos ya sea impulsar o

**Eduardo Bacon:** Y si, ahora hay que analizarlo. que tan que tan ni siquiera lo he investigado,

**Esteban Cortes Sandoval:** solicitar.

**Eduardo Bacon:** pero creo que tener esa capacidad, por lo menos tener algunos bades y ojala tener la las columnas computadas eh seria seria bueno.

**Esteban Cortes Sandoval:** Ya. Bueno, lo voy a bajar ahi tambien para que lo levantemos y veamos si es que lo hacemos nosotros o no, que tan dependiendo de la complejidad. Ya, ultimos 10 minutos, competencias, que esa seria la ultima, cierto? Que pestana. Entonces, pasamos de los datos generales. Recordar que los datos generales, a diferencia de lo que haciamos antes, ahora tenemos como definiciones de politicas generales, politicas sobre el modelo de evaluacion, cierto? Politica del modelo de rubrica, entendiendo la rubrica, como se mide la competencia.

## Politicas por matriz: modelo de evaluacion y rubrica flexible/uniforme (01:18:51)

**Esteban Cortes Sandoval:** Entonces, tenemos la politica para decir esta matriz va a tener como va a ser flexible. Cada competencia elige, cierto? Como como se va a medir? Eh, y en el caso de que es flexible, entonces decimos, "Mira, por defecto le vamos a mostrar entre las opciones que tenemos esta al usuario, eh, y el modelo de rubrica, cierto?, que se va a utilizar es por defecto tal, eh, o uniforme." Y en tal el caso ya se decide a priori, cierto? Cuales son las que se van a permitir? Cierto? Entonces, todos o todas van a usar rubrica o todos van a usar un tipo o otro. Ya. Entonces, anteriormente, que era lo que haciamos? Ya estaba por defecto que era uno para todos. Todos usaban el mismo eh a nivel institucional. Entonces, esto no existia. Esto es una cierto una extension que estamos haciendo para ser mas flexible dentro de la misma institucion. Y algo que para nada existia era la regla de como se iban.

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** Eh, ahi yo creo que ambos manejan, cierto, las matrizas de competencia sobre un arbol, cierto?, que va hacia abajo y nunca existio una regla sobre como ese arbol se sumaba hacia arriba.

## Reglas de agregacion del arbol de competencias (01:19:53)

**Esteban Cortes Sandoval:** Eso se hacia y se computaba y se definia a nivel de la reporteria, que es lo que no queremos hacer ahora. En realidad esto va a estar definido a priori porque en particular tambien implica que la institucion nos dice, "Oye, este reporte no lo entiendo." Pero es porque nunca tampoco se converso con ella las reglas de como se van a sumar. Muchas de esas instituciones como que no la tienen y uno podria decir, mira, todo es uniforme, todo es con un peso uniforme, etcetera, que es deberia ser como el estandar, pero si una institucion realmente tiene mas experiencia, podria decir, mira, estas competencias pesan mas, etcetera. Y pueden haber distintas formas de hacer esa agregacion desde abajo hacia arriba. Bueno, podria decir, mira, cual es el maximo. Entre todas las subcompetencias, la que evaluo mas alta es la que manda o la moda o el ultimo que fue evaluado o el minimo o el promedio que es como el estandar. Entonces, la politica nos define nuevamente si es que es flexible.

**Eduardo Bacon:** Yes.

**Esteban Cortes Sandoval:** Cada competencia puede definir de manera diferenciada como se agrega o si es uniforme y para todas, cierto? Se agregan de la misma forma, ya? Y entonces lo ultimo es la competencia, cierto?

## Tercera pestana competencias, alerta suma 100% (01:20:55)

**Esteban Cortes Sandoval:** Y aqui definimos lo general. Luego esta lo que vimos hoy dia, que el alcance y la tercera pestana es competencias. Y aqui ya por ahora no tengo algo que cambie tanto respecto a lo que tenemos ya. Solamente que como hemos visto simplifica un poco, pero complementan respecto a esta informacion sobre como se va a medir a posterior se va a agregar la informacion. Entonces misma logica, agregamos compon agregamos competencia, cierto? Aqui tenemos una alerta, cierto? La suma de las competencias eh de la matriz debe ser 100%.

**Eduardo Bacon:** Bueno,

**Esteban Cortes Sandoval:** Eh, entonces esto es porque yo aqui esto no esta sumando 100, cierto? Si yo le pongo un peso de 100, entonces me dice que va a estar bien. Si yo que hubiese puesto una segunda competencia, cierto? Y le pongo 30 a la primera, cierto? 30 y aca son 70. Y ahi ya tengo como mi alerta, lo movi con el con el roll del mouse y me alerto, cierto? esta fuera como del ahora que lo veo porque no esta triste, esta parte no lo he revisado tan a fondo, yo creo que esto deberia ir arriba las alertas, no abajo claramente.

## Competencias holisticas vs por criterios, pesos y alertas (01:22:02)

**Esteban Cortes Sandoval:** Y aqui tambien tiene como informacion sobre lo que de como se ha ido definiendo, cierto? Esto tiene una rubrica propia, es holistica, lo mismo que tenemos codigo, nombre, aqui viene la forma de evaluacion, cierto? Rubrica propia, el modelo es holistico o es por criterios. Si es por criterios, cierto? Aqui tenemos un conjunto de criterios que miden la competencia, cada uno de ellos con su peso, con su descripcion. Si es holistica, se mide con un unico y aqui esto deberia haberse limpiado, cierto? Esto se mide con una unica eh dimension. Esa es como la diferencia cuando tengo criterios. Y bueno, nuevamente si yo tengo criterios, esto tiene pesos, todo tiene pesos, todo queda como eh agregado, cierto? Tambien tiene alertas. Entonces, aqui yo deberia tener como 50 eh, y 50 y ahi nos va como alertando en como se suma hacia arriba. Eh, si yo tengo una subcompetencia, eso quiere decir que la competencia inicial, si se dan cuenta, me la limpio porque en realidad no es la competencia inicial la que me va a estar midiendo el la competencia, cierto? Sino que son la subcompetencia y la agregacion de esta.

## Subcompetencias: pesos habilitados solo en promedio ponderado (01:23:06)

**Esteban Cortes Sandoval:** Entonces, la en la subcompetencia, donde me voy a aparecer como el los criterios y la forma de medir. Eh eh cuando yo le agregue una subcompetencia, se dan cuenta, me agrego tambien algo que es lo que yo les decia, cierto? Como agregamos la informacion del arbol hacia arriba. Entonces esta como dentro del nivel, yo tengo un conjunto y esos tienen un peso y esa agregacion hacia arriba, cierto? Tienen una informacion. Aqui si se dan cuenta, si yo le pongo minimo, maximo, el peso se inhabilita porque como tengo una regla de minimo, de maximo, voy a sacar el minimo entre todas ellas, dentro de toda la hija. Si saco la moda, tambien si saco el ultimo tambien.

**Eduardo Bacon:** Si.

**Esteban Cortes Sandoval:** El unico que me habilita los pesos es el promedio ponderado, que ese es donde yo necesito tener pesos para poder sumarlo. Entonces, si bien se ve alto, creo, a nivel de componentes, esto es como una agregacion de hijos. Si, estoy. en los niveles mas abajos tengo que definir los pesos de de medicion y tienen algunas distintas configuraciones dependiendo de esta es la que me falta determinar que es cuando una competencia se deriva de sus resultados de aprendizaje. Y por que?

## Resultados de aprendizaje viven en el curso, no en la matriz (01:24:14)

**Esteban Cortes Sandoval:** Porque el resultado de aprendizaje vive en la asignatura, no viven en la matriz de competencia. Entonces eso hasta este momento me lo tiene mal modelado la vida que esta aca como los resultados de aprendizaje, pero en realidad no debe creo que no debia definirse asi. Aca me esta haciendo como la propuesta de definir aqui como el curso que lo va a medir y definir el resultado, o sea, es como una definicion central de los resultados de aprendizaje y no estoy seguro si es la mejor forma de abordarlo, pero en el peor de los casos podriamos terminar implementando por ahora, no?, el modelo de resultado aprendizaje si es que no lo tengo listo de aqui al al lunes ese refinamiento. Pero eso digamos esto cambia solamente cambia aqui esto sub comppetencia o se agrega mas competencia o no se agregan mas criterios o no. Y lo otro que me falta agregar aca es que estos cada criterio o cada competencia tiene como esta rubrica de medicion que son los esquemas de niveles que fue lo que Juan Pancho ya implemento, pero uno ocupa un nivel de un esquema de nivel estandar y se supone que en la practica el usuario podria como completar, cierto, un descriptor especifico para esa competencia que se esta midiendo, mas alla del estandar que que uno define cuando define el esquema. Yo

## Descriptores de nivel: rellenar desde estandar o personalizar (01:25:53)

**Esteban Cortes Sandoval:** creo que aqui deberia tener una forma de poder rellenar con el estandar como de forma automatica, eh, o si no utilizar uno personalizado si es que se sea uno personalizado, eh, porque si no vamos a estar como forzando el usuario que rellene un monton de informacion si es que no va a definir uno distinto y eso realmente

**Esteban Cortes Sandoval:** lo podemos completar facilmente. Dale, Pancho.

**Francisco Navarro:** Algo que me queda en duda es que pasa si ya estoy definiendo mi mis competencias y alguien

**Esteban Cortes Sandoval:** Aja.

**Francisco Navarro:** edita mis niveles y sin que me de cuenta porque

**Esteban Cortes Sandoval:** Ahi deberia,

**Francisco Navarro:** aparece Si,

**Esteban Cortes Sandoval:** ahi deberiamos como el esquema de nivel, cierto?

**Francisco Navarro:** si, si,

**Esteban Cortes Sandoval:** Si,

**Francisco Navarro:** porque

## Historia aparte: reglas de bloqueo del esquema de niveles en uso (01:25:53 cont.)

**Esteban Cortes Sandoval:** ahi deberiamos, yo creo que al momento de implementar esto,

**Francisco Navarro:** por

**Esteban Cortes Sandoval:** tenemos que hacer una historia aparte con las reglas de que es lo que tiene que bloquear a nivel del esquema de niveles, cacha, que es lo que no hemos implementado ahora, que seria como si yo voy a eliminar,

**Francisco Navarro:** Si.

**Esteban Cortes Sandoval:** cacha, o inactivar, eh, pero ya tengo matrices asociadas, paso necesitamos tener el flujo de las matrices, deberiamos alertar de que no se puede hacer, cacha, no se puede activar esa esa funcionalidad o el impacto que va a tener, cacha. Y tenemos que definir las reglas porque si es una matriz que esta en modo de diseno, uno podria decir, "Ah, si lo puedo hacer porque todavia esta en modo

**Esteban Cortes Sandoval:** diseno." Pero si ya tengo una matriz que esta publicada en uso, cacha, ya tiene un plan de estudio, entonces no como que ahi necesitamos definir como reglas de hasta donde vamos a poner como restriccion Y en general deberian ser reglas

## Cierre: bajar a historias el lunes, artefactos y documentacion (01:26:55)

**Francisco Navarro:** M.

**Esteban Cortes Sandoval:** que quizas podamos como configurar o extender en el futuro si son necesarias, pero si deberiamos considerar como esas reglas de una vez implementada la matriz las reglas de como impactan hacia arriba, que es algo que igual nos hemos encontrado con dolares de cabeza en el legacy, cierto? como que decimos, "Oye, pero aca se borro esto." Y nunca tuvimos como algo que lo detuviera o que lo hubiesemos analizado. Eh, ya me tengo que ir en un minuto a la reunion con clientes, asi que manana igual tenemos un espacio de refinamiento. La idea es que manana sigamos mirando esto y ya lo bajemos como historias para que el lunes terminar como decir cuanto alcanzamos a hacer, digamos, ya. Pero hasta aqui es como lo que lo que tengo y lo que creo que podriamos abordar como maximo en el proximo SP, no? Eso,

**Eduardo Bacon:** Esto esta en el artifactizado o no.

**Esteban Cortes Sandoval:** que es esto? Esto que estoy mostrando ahora no esto como para revisar la maqueta

**Eduardo Bacon:** Si,

**Esteban Cortes Sandoval:** de no lo pasado artifact,

**Eduardo Bacon:** claro.

**Esteban Cortes Sandoval:** pero lo puedo pasar artifacto porque lo que revisar ahora en la tarde tienen tiempo.

**Eduardo Bacon:** Ya.

**Esteban Cortes Sandoval:** Yo voy a andar medio corriendo,

**Eduardo Bacon:** Y no, no,

**Esteban Cortes Sandoval:** asi que realmente yo creo que lo voy a tener manana,

**Eduardo Bacon:** no creo que hoy dia, pero

**Esteban Cortes Sandoval:** no? Si, si.

**Eduardo Bacon:** manana.

**Esteban Cortes Sandoval:** La idea es que en tanto lo cierre como pasarlo artifact al igual que el el documento Marktown que lo acompana con la desagregacion de la informacion de del de los objetos, cierto? Y y eso y las reglas, digamos, porque hay altas reglas que que estan como ahi eh que estan que yo las explique, pero que estan obviamente hay que explicitarlas en el documento. Ya, eso chiquillos. Asi que eh lo segui conversando manana. Ya eh me retiro, pero no se si me va a dar tiempo de hablar con ustedes manana atentis que yo creo que hay 8 a les voy a estar como pidiendo alguna evidencia.

**Eduardo Bacon:** Ja.

**Esteban Cortes Sandoval:** Igual se que despues ustedes en la sesion pueden mostrar los cambios del screen, pero para ir preparando la presentacion de del review. Ya, gente, hablamos entonces que esten

**Eduardo Bacon:** Ok.

**Francisco Navarro:** C. Yeah.

*La transcripcion finalizo despues de 01:29:28.*

## Outcomes

### Taxonomia

| Bucket | Tipo | Cuando aplicar |
|--------|------|----------------|
| current | **action** | Tarea concreta con dueño, sprint activo. |
| current | **change** | Ajuste a algo existente. |
| current | **decision** | Decision tecnica confirmada que aplica a trabajo activo. |
| future | **scope** | Trabajo concreto por venir. |
| future | **capability** | Capacidad transversal a construir cuando se necesite. |
| future | **dependency** | Esperando algo externo. |
| context | **clarification** | Info de fondo no accionable. |
| context | **caveat** | Limitacion conocida del sistema/equipo. |

### Current — afecta trabajo en curso (SP9)

| # | Tipo | Item | Dueño | Refs |
|---|------|------|-------|------|
| C1 | action | Migrar la logica de roles internos a la nueva estructura y mapear roles internos a los roles estandar del core | Esteban | — |
| C2 | change | Fix del rol `curricular designer`: le falta capability para listar instituciones, lo que bloquea la creacion de planes de estudio | Eduardo | — |
| C3 | change | Fix del seguro agregado por orden de corrida en la vinculacion de roles (se ira al core) | Francisco | — |
| C4 | action | Validar y completar las capabilities para que cada rol ejecute las acciones declaradas (ej. permisos sobre instituciones/facultades) | Esteban | — |
| C5 | change | Ajustar el orden de menus de Curriculum Design: Programas Academicos, Planes de Estudio, Asignaturas/Programas de Asignatura | Esteban | — |
| C6 | change | Alinear nombres entre menu, pestana, breadcrumb y titulo del layout (ej. usar "programa de asignatura" en todos los casos) | Esteban | — |
| C7 | action | Implementar Instructional Component (extension del concepto legacy curso-actividad): piezas acumulativas de la modalidad | Eduardo | — |
| C8 | change | Separar la interfaz de matriz de competencias en pestanas: informacion general, alcance/adopcion, competencias | Esteban | — |
| C9 | decision | Tipos de matriz pasan de cinco a cuatro: genericas/transversales, sello valorico, sello institucional, especificas, profesionales | Esteban | — |
| C10 | decision | Modelar Matrix Adoption con alcance (institucional / por unidad / explicito) y obligatoriedad (electiva / obligatoria) | Esteban | — |
| C11 | decision | Estado de la matriz: borrador al crear; la vigencia hacia los planes se activa al publicar | Francisco, Esteban | — |
| C12 | decision | Reglas de agregacion del arbol de competencias definidas a priori (no en reporteria): promedio, ponderado, maximo, minimo, moda, ultimo evaluado; pesos solo en promedio ponderado; suma de pesos = 100% | Esteban | — |
| C13 | decision | Exencion de planes con comentario y registro; distinguir asociacion explicita vs por regla; reconciliacion al cambiar una regla | Esteban | — |
| C14 | decision | Resultados de aprendizaje viven a nivel de curso/asignatura, no en la matriz; su medicion se define a nivel de curso | Esteban | — |

### Future — para tickets que aun no existen

| # | Tipo | Item | Tema/Module | Cuando aplique |
|---|------|------|-------------|----------------|
| F1 | scope | Historia aparte: reglas de bloqueo/impacto del esquema de niveles cuando ya existen matrices publicadas en uso | curriculum-mapping | al implementar matriz |
| F2 | scope | Home/dashboard de Curriculum Design via Report Builder (plantilla de datos, reporte, dashboard como homepage); metricas por definir | curriculum-design | SP9 condicional, definir metricas el lunes |
| F3 | capability | Alerta visual entre pestanas cuando un cambio en una pestana afecta otra (icono/alerta en la pestana afectada) | layout/core | cuando se aborde el caso borde |
| F4 | capability | Extension de core: resolver custom que bloquee el guardado global si un formulario no cumple condiciones y levante un modal nativo | core | cuando se aborde el caso borde |
| F5 | scope | Investigar badges/indicadores y columnas computadas en RecordList para enriquecer la informacion visual | layout | no bloqueante SP9 |
| F6 | scope | Descriptores de nivel por competencia: rellenar desde el estandar del esquema o personalizar | curriculum-mapping | al implementar competencias |
| F7 | scope | Modelar el registro de resultados de aprendizaje a nivel de curso (si no cierra antes del lunes, se posterga) | curriculum-design | SP9 condicional |
| F8 | dependency | Vista por rol (orden de vistas por rol): capacidad nueva del core, aun no necesaria para assessment | core | cuando se necesite |
| F9 | dependency | Instructional Component: Academic Scheduling y Student Success/Engagement tienen cambios propios que coordinar (fuera del alcance de Curriculum Design) | scheduling / engagement | coordinacion cross-equipo |

### Context — info de fondo

| # | Tipo | Item |
|---|------|------|
| X1 | clarification | Sprint 9 de 17 en el plan de migracion uAssessment; se menciono unificar los calendarios de todo el personal y el feriado colombiano como contexto de disponibilidad |
| X2 | clarification | El rol se define/registra en el mod y se linkea a las capabilities/roles del core (pendiente de confirmar donde vive cada parte) |
| X3 | clarification | La propuesta de Instructional Component concilio tres visiones (Curriculum Design, Smart Campus con su idea descartada de "activity line", Student Success/Engagement); resuelve un dolor de comunicacion entre verticales |
| X4 | caveat | El breadcrumb se percibe como informativo mas que accionable; se echa de menos el boton volver del legacy; el menu superior y el breadcrumb compiten en jerarquia visual (tema de diseno para el equipo core) |
| X5 | caveat | Report Builder se maneja desde up-manager (no dentro de los mods); ya existe un prototipo local del flujo plantilla-reporte-dashboard y Claudito ya construyo un resolver custom del mod porque las metricas complejas escapaban a las capacidades del Report Builder del core |
| X6 | caveat | Al guardar en una pestana el boton global saca de la vista al listado; con datos dependientes entre pestanas se puede perder informacion de forma silenciosa sin advertir al usuario; Yupi no tiene forma nativa de mostrar alerta en el RecordList |
| X7 | caveat | La interfaz soporta hasta tres botones junto a `create`; con textos largos conviene revisar iconos |
| X8 | clarification | Estimacion de Instructional Component: 3 a 4 dias si no hay sorpresas (trabajo operativo de objetos, seeds, pruebas), pragmaticamente cerca de una semana de sprint; ~13 puntos / ~7 tickets como epica desagregada (ver artifact InstructionalComponent en kb/sp9) |

### Notas de extraccion

Vacio: todos los items se clasificaron dentro de la taxonomia.
