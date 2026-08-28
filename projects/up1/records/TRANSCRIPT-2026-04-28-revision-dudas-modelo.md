---
id: TRANSCRIPT-2026-04-28-revision-dudas-modelo
project: up1
type: doc
module: curriculum-design
tags:
  - curriculum-design
  - reunion
  - transcripcion
  - decisiones
---

# Reunion 2026-04-28 — Revision dudas modelo

> Transcripcion editable generada por ordenador. Puede contener errores. Se mantiene verbatim como fuente de verdad para las decisiones DECISION-004..009.

**Contexto**: Eduardo prepara los tickets UPONE-1033/1034/1035 (sprint actual). Reviso documentacion Confluence + ejemplos legacy v2.2 + codigo UP1 con asistencia IA. Identifico 5 preguntas criticas (P1..P5) + 14 secundarias en `open-questions.md`. Esta reunion resuelve las 5 criticas.

## Apertura — Contexto general (00:00)

**Eduardo Bacon**: Ya ahi estuve revisando dentro de lo que esta la documentacion de Confluence, lo que se tiene de codigo y lo que se entrego como el modelo de Univalle haciendo algunos cruces y ahi me salieron algunas cosas, algunas consultas. Y aqui anote las principales, pues tirando con Claudito para ver que nos afectaba dentro del sprint para ver esas en especifico.

Eh volviendo aca, primero es ya esto es el estado general. A ver, contexto. Entonces, vamos a estar trabajando con los dos clientes como tenant para ir armando los modelos que se vienen, decia los datos que se estan cruzando. Mas o menos asi es la estructura que estariamos armando, la academic activity que se relaciona con el curricular section. Y eso tiene un curricular link y un bibliography reference.

## P1 — Casing de enums (Q10) (00:02)

**Eduardo Bacon**: Entonces, primero como consulta, porque aca en general en los enum aparecen en Pascal Case y dentro del codigo Claudio me advierte que ve que se esta usando screening snake case.

**Esteban Cortes**: Hay que hacer el ajuste ahi entonces.

**Eduardo Bacon**: Ya me imagino que va por ahi, pero es tambien para que de tu parte lo sepan y confirmarlo con Juan tambien si es asi, si eso es por un tema especifico o porque lo encuentra mas que nada en el modulo del Hello-mundo, que es el de prueba. Entonces es asi que este es el estandar que estan usando en UP1.

**Juan Diego Galdames**: Em, si, yo diria que el casing eh esta en el correcto seria el que esta en UP One, en el repo de Object Manager en los objetos que es con que son si que no me acuerdo el nombre de la es que parte con minuscula y despues las otras palabras van con mayuscula. No me acuerdo si es era...

**Esteban Cortes**: Pascal case pascal case.

**Eduardo Bacon**: Este es passcase que parece pacta con mayuscula y le pone a minuscula a cada palabra.

**Esteban Cortes**: O sea, que no es ninguno de los dos.

**Eduardo Bacon**: Este es el...

**Esteban Cortes**: Eso es screaming snake case.

**Eduardo Bacon**: O sea, que se llama Case.

**Juan Diego Galdames**: Si, que se llama eh camel.

**Esteban Cortes**: Ahora...

**Eduardo Bacon**: Y el otro es camel case, que es el como el estandar de JavaScript, que es como este, como el Pascal Case, pero la primera palabra va en minuscula.

**Juan Diego Galdames**: Hola. Si, ese es el que...

**Esteban Cortes**: Ese es el estandar para los enum o para todo en general?

**Eduardo Bacon**: Que yo veo que ahi el lo que dice Juandy, por ejemplo, el este formato lo veo usado, claro, en las propiedades que es como el estandar de JavaScript, pero no lo encuentro en los enum. El tema especifico aqui son los ENUM.

**Juan Diego Galdames**: Ahi tendria que tendria que revisar y preguntar bien porque los de los Enum son relativamente nuevos. Entonces, no se si hay una regla especifica con el casing en los enums. Lo voy a preguntar.

**Esteban Cortes**: Si, porque lo comentaron recien en el ultimo stream.

**Juan Diego Galdames**: Si, voy a preguntar si existe una regla particular con el tema de los enum.

**Eduardo Bacon**: Mhm. Ya, porfa. Ahi para ver para estar alineados con lo que va siendo el team de UP1.

## P2 — workflowState valores (Q2) (00:04)

**Eduardo Bacon**: Y el otro caso dentro de esto mismo es que en el modelo de Confluence hay el caso que se presenta es con active. Aparece el WorkflowState aca como active y no esta mapeado. Entonces, de los que se presentaron ver aca...

**Esteban Cortes**: El workflow State actualmente esta como un enum y tiene los tipos de draft, active, suspended y discontinue.

**Eduardo Bacon**: Ya, claro. Y que ahi se esta marcando solo como active, pero se esta presentando despues con cuando se dan los valores. Se presenta draft review approved published openForEdit. Entonces, no estan matching.

**Esteban Cortes**: Ya no estan matching. Claro, distintos objetos tienen distintas listas de enum. Eso es cierto. Si, pero considerar Edu, que todavia falta modelar e que es parte de lo que vamos a hacer este sprint, el objeto de workflow y como va a ser la relacion con ese estado. Yo diria, por lo tanto, que no consideremos que esa lista de estados va a cambiar, pero como para el proximo sprint, cacha? Entonces, el enum en particular especifico que vayamos a usar y la logica va a ser modificada. Sabemos que va a tener que tener un workflow state el objeto de academic unit, algun estado, pero considerarlos como un preview, digamos, de lo que va a ser, yo diria que no es eh no deberia ser bloqueante en ese sentido, porque yo entiendo que lo que esta reclamando es que hay inconsistencias entre los estados que estan asociado a los workflow entre los distintos objetos, o no.

**Eduardo Bacon**: Claro, claro que en uno, o sea, que se dice estas son las opciones y cuando se presenta uno dice este esta presentando una opcion que no esta en ese listado. Entonces...

**Esteban Cortes**: Ah, ya. Como entre los ejemplos de... como se llama? De AIEP, Univalle. Ah, ya. Si. O sea, yo digo que si estan en los ejemplos para completar, completa en el enum el faltante, digamos. Hazlos consistentes, ajustalos para que sean consistentes, pero no son, digamos, cuando implementemos el flujo del workflow state propiamente tal, probablemente haya algun tipo de ajuste respecto a eso, pero por lo tanto ahora no le puse tanto detalle porque se que tenemos que darle una mirada mas mas especifica.

**Eduardo Bacon**: Ya. Entonces ahi mejor para mostrar los...

**Esteban Cortes**: Si. O sea, y lo podeis cambiar como con publish, no se, algo asi con alguno de los que ya estan definidos ahi, cambiar, ajustar el ejemplo.

**Eduardo Bacon**: Ya, ya.

## P2.b — Tenants y ambientes (T1) (00:08)

**Eduardo Bacon**: Otra pregunta, este es a que esta detectando que dentro de va faltando informacion y ahi viene una cosita en relacion a y creo que va relacionado con esto mismo. Creo que va ahi que el lo que es los ejemplos que se subieron esos estan tomados como directo de la base de datos que ya tenemos. Y falta ahi entonces darle una vuelta para poder completar los datos del modelo.

**Esteban Cortes**: Eh, no, porque los objetos que yo te pase ya venian como la estructura de los objetos, no? Pero, cual es la duda que a ti te queda respecto a eso? Ahora, no todos tienen mapeados todos los datos en todos los objetos y eso es adrede.

**Eduardo Bacon**: Ya, eso los ejemplos, pero...

**Esteban Cortes**: Yo busque dos clientes que difieran un poco y bueno, tambien nosotros tenemos ahi ahi Juandy me completa porque yo no se bien como es esta parte del flujo. Yo genere dos ejemplos, lo que representaria dos tenants distintos, pero no se en realidad como en local o ya en un ambiente, no se cual es el ambiente que vamos a utilizar, si son esos ambientes que tambien se levantaron para los equipos de la PUC o donde vamos a subir eh, como se llama? estos datos que estamos cargando como de ejemplo. Eso es como que me queda esa duda.

Yo genere dos ejemplos en la idea de que cargar uno, validar que se ve bien, cargar otro, no se si vamos a tener un espacio, un ambiente, dos ambientes donde vayamos poder ir cargando en paralelo. Ahi no se, cacha. Pero lo que si es que yo los genere de forma en que fuesen eh no necesariamente iguales, cacha, porque basicamente esa va a ser la realidad con clientes. Vamos a tener algunos que van a tener un objeto, que van a tener otro. Entonces, por eso no necesariamente tienen los mismos objetos completados.

**Juan Diego Galdames**: Ah, ya. En ese caso podriamos hacer un, podriamos hacer, bueno, tenemos ya dos tenants como que usamos siempre de base que esta UPU y test. Podriamos probar agregando cosas primero en test y despues en UPU. Y el tema de los ambientes ahi la verdad que es por temas que nos tienen menos votados de infraestructura, pero no tenemos nuestro el dominio que tenemos arriba donde hicimos las demo ha sido es nuestro ambiente de momento de desarrollo QA. Bueno, produccion, pero es la forma que tenemos de momento. Entonces, si no es probar local, el unico ambiente que tenemos como en la nube para probar cosas es esa. Es ese. Si, pero podriamos probar con los tenants que ya existen o crear tenants dedicados. La verdad que ahi podriamos dejar cosas en upu y en test para hacer distinciones entre tenant y probar que distintos modelos de datos.

## P2 cont. — RecordTypes globales o per-tenant (T2) (00:11)

**Eduardo Bacon**: Aqui la consulta va en se detecta que ocupan diferentes record types dependiendo de la institucion, pero que no hay una forma de hacer records especificos por tenant, sino que y ahi necesito que me confirme Juandy si es asi el hallazgo, como que no puedo tener que eh content sea solo de AIEP porque no lo usa Univalle.

**Esteban Cortes**: Tienen que ser para todos pues, o sea, porque los record son base del modelo, por asi decirlo. Ahi quizas tenemos que alinear ideas, pero como yo lo entiendo, estamos diciendo esta el objeto curricular section y tiene estos tipos de record. Yo entiendo que existen siempre esos tipos de record, pero dependiendo del cliente va a ser si es que la instancia de ese record va a tener o no va a tener data y dependiendo del cliente va a ver va a depender si es que tiene o no eh configurado un formulario que ocupe ese recorte.

**Eduardo Bacon**: Ya, ese era ese era... claro.

**Esteban Cortes**: No se si estoy estoy mal o no.

**Juan Diego Galdames**: Eh, si, o sea, podemos tambien eh se podria amenazar una diferenciacion por tenants ahi, pero tambien la no se que mas practico para ti si es que todos tengan todos los records y ahi por tenant se distingue que se usa o hacerlos como nativos en cada tenant. No se que sera mas conveniente para tener como como...

**Esteban Cortes**: No, yo creo que deberia, o sea, la idea de como yo definiria objeto, eh, es que esten siempre porque hay uno que es como eh hay un record type que es como comodin, por asi decirlo, que es como para cualquier otra estructura que sea solamente texto sin como datos especificos. Eh, entonces yo lo hice pensando en que claro, este es como el modelo de datos estandar, eh, y despues lo que podria ocurrir es que un cliente tenga una extension de campos dentro del recorde que ya existe, campos personalizados o haga uso del que como que no es ninguno de los estandar, sino que es un campo como de texto adicional, no se, metodologia de aprendizaje porque no la consideramos estructural, eh va a ser como un campo en ese pero asi lo pense yo, como que siempre van a estar todos los recortes, no necesariamente van a estar siempre con datos dependiendo del cliente.

**Juan Diego Galdames**: A ver, claro, ya.

**Eduardo Bacon**: Igual encontrar que era mejor la opcion de que fueran globales porque despues darle mantenibilidad de estos records per tenant a esta institucion o a este otro.

**Esteban Cortes**: No, no, para nada, para nada. No, no, si tenemos que como la menor cantidad de personalizacion en ese sentido, como que sea lo mas generico posible.

**Juan Diego Galdames**: Claro, hay limitar solamente como a campo custom, solamente como un campo extra...

**Esteban Cortes**: Claro. Como extension. Adicional. Claro, el modelo siempre deberia ser el mismo.

**Eduardo Bacon**: Ya. Entonces, claro, por la opcion A, que todos globales, que era aqui le habia pedido que hiciera la pregunta, pero inverso porque intentaba dejar cual era el minimo funcional y aca era cual es si dejamos todo funcional porque esta Claudito esta optando por decir como ya mira con esto dejamos AIEP funcional o sea Univalle AIEP funcionando, pero Univalle no queda con todo. Aqui va por alla. Ya.

## P3 — CustomSection contrato (Q3) (00:14)

**Eduardo Bacon**: Y el otro aqui es de lo que mencionaba antes, que los datos que no van calzando y se presentan dos casos, uno relacion al custom aparece donde me alerta que claro tiene un record que es custom, pero si despues las propiedades de ese custom pueden ir variando. Cual es el contrato que se genera ahi? Una custom y ahi me genero esa inquietud. Una custom siempre va a tener las mismas propiedades de custom section o eso esta pensado a que pueda variar dependiendo de que tan custom.

**Esteban Cortes**: No, yo estoy pensando y ahi quizas haya que extender algunas propiedades de la custom section, pero yo estoy pensando que la custom section tambien sea una estructura ya definida por nosotros, cacha? Entonces, que tenga los campos suficientes, como para ponernos en la mayoria de los casos estandar, que tampoco deberian ser infinitos, eh, pero que sea siempre igual, cacha? probablemente que los campos entonces no sean todos de caracter obligatorio, porque podria un cliente tener mas o menos de esos datos, pero la custom section deberia ser siempre la del definida de la misma forma como independientemente del cliente tambien sea estandarizado.

## P3 — Caso "habilitacion" Univalle (Q5 parcial) (00:16)

**Eduardo Bacon**: Ya. Entonces, el otro caso que este no le alcanza a dar mucha vuelta, estaba revisando a que iba que me alerta por el tema de Univalle, la habilitacion donde aparece esto de semana 18. habilitacion como sesion normal con descripcion habilitacion, pero conceptualmente segun el modelo de Confluence aparece approval condition que es un recorte propio de condiciones de aprobacion.

**Esteban Cortes**: Ay, a ver, dejame revisar ese caso, que como le pedi quisiera la la extraccion de datos y la transformacion, no mire el detalle de el custom. Ya, custom. Estamos hablando de custom. No, mentira, no escucho sexo. En este caso es eh no, pero lo que esta diciendo es lo siguiente.

**Eduardo Bacon**: No, este es approval condition. No, no es la propiedad.

**Esteban Cortes**: Esta diciendo estoy utilizando una curricular section, en particular el record de sesion de las sesiones que puede tener el el curso, el programa de curso o el curso realmente. Y esta diciendo que en la sesion 18 hay un dato. Claro, tiene una descripcion y la descripcion es habilitacion, es una descripcion bien escueta. Eh, entonces te esta diciendo, ah, quizas la habilitacion se refiere a que es una condicion de aprobacion esa sesion numero 18 y la esta relacionando con un objeto que todavia no estamos viendo en este sprint, que es el de approval condition. En este caso, yo diria que eh hay que usarlo como una sesion, no mas, cacha, como que le dio mucha interpretacion al texto que decia de que iba a pasar en esa clase en particular o en esa sesion en particular, eh, y se fue la profunda. Pero yo diria que hay que ignorar, no mas ese caso, no? Hay que considerarlo como una descripcion de la sesion simplemente y no tiene relacion al ApprovalCondition realmente es un estandar.

**Eduardo Bacon**: Ya. Entonces es una estandar, no? Una sesion estandar.

**Esteban Cortes**: Si.

## P4 — externalId 1 vs 2 campos (Q1) (00:19)

**Eduardo Bacon**: Ya. Eh, con eso abarcamos entonces las preguntas principales, pero hay otras dos. Esta creo que es mas de como comentario, donde va? Pero es que en el Confluence se menciona que pueden haber varios campos relacionados al tema o que no varios campos, sino que pueden haber varios sistemas que traen datos, que hacen... Entonces, pero solamente hay un external ID. Entonces ahi dice, "Mi hay una alerta de, oye, eh, que pasa si una institucion tiene mas de un sistema de registro de datos? Se va a llevar un mapeo de estos datos llegaron por este sistema y estos datos llegaron por este otro sistema?" O siempre tenemos el caso de que es uno a uno la relacion institucion eh registro de datos. Lo que yo he visto que siempre es uno a uno, pero prefiero preguntar para quedar claro el caso o si se viendo esta alternativa se maneja eso, de repente se ha visto como alguien que nos haya dicho en algun momento algo asi.

**Esteban Cortes**: Ya, eso lo lo de lo como se llama? Lo concluyo en base a la documentacion de objeto o con otra documentacion adicional?

**Eduardo Bacon**: La es que aca dice en base a la documentacion que esta en Confluence ambas formas y el codigo no aporta convencion, o sea, esta tomando como lo que se comento, lo que se comento intentando bajarlo a lo que se esta entregando como codigo, como ejemplo, porque aca dice, si se va a integrar un solo sistema, por ejemplo, banner, un solo campo hasta y va si va a recibir desde varios sistemas, ahi como dos campos ayudarian a separarlo.

**Esteban Cortes**: Eh, si. Si. Es que a mi a mi me si me dijo me dijo lo mismo. En resumen, el un external ID esta bien. Eh, yo ya tuve esta conversa en el chat, pero claro, yo creo que no quedo documentada en ningun lugar. El punto es que si, una institucion nos va a poder entregar eh datos desde multiples sistemas, lo que podria en el peor escenario pensar que, por ejemplo, la data de una asignatura viene una parte de la data de un sistema con un identificador de asignatura, otra parte de la data de otro sistema con otro identificador de asignatura y entonces vamos a tener dos que equivalen a la misma asignatura, pero nosotros tenemos o vamos a tener de manera mas desarrollada una capa de datos, un data lake interno que va a preprocesar esa informacion para llevarla al formato que nosotros necesitamos a cargarla hacia UP1. Entonces esa unificacion de n identificadores a un unico identificador deberia venir en esa capa de datos cacha. Por lo tanto, lo que termina viendo UP1 es un external ID y podria haber una relacion uno a n distintos, pero seria como una capa, ya sea otros objetos dentro del mismo UP1 o una capa de procesamiento de datos en una como en una capa tecnologica distinta. Entonces, por eso yo deje uno solo, eh, por lo mismo finalmente y porque en paralelo a que nosotros vayamos avanzando en la migracion hacia UP1, el equipo de Data Service va a tener que estar trabajando como el nuevo proceso de integracion. Entonces, claro, eventualmente ese external ID podria sufrir como eh modificaciones, pero por ahora es como un place holder, digamos, de lo que vamos a tener que utilizar despues. Y en este caso, claro, estaria como mapeando lo que en el modelo estandar es el integration ID.

**Eduardo Bacon**: Imagine que va por ahi, pero ya.

## P5 — RTs sin campos (Q5 resto) (00:22)

**Eduardo Bacon**: Y la ultima es aca el (docence) lista record validos para curricular section y estos estan sin campos como que esta el record pero no hay mas detalle. Esto me imagino que es simplemente porque no hemos llegado hasta alla.

**Esteban Cortes**: Exacto. Si, si, si. Porque aqui la idea es que implementemos los objetos que estamos como considerando. Igual yo, como no se si los comente, pero yo cargue esta documentacion con todos los objetos que tengo hasta este punto, pero la idea es ir marcando como draft de manera que todos nosotros y otras personas que esten interesados puedan ver como la propuesta del modelo completo, aun cuando algunos todavia podrian sufrir modificacion a medida que vamos implementando funcionalidad a funcionalidad. Asi que si, hay campos que no van a estar del todo refinados porque si no seria como nos demorariamos mucho en tener como un modelo que sabemos que la practica puede ir cambiando cuando vayamos implementando las cosas.

**Eduardo Bacon**: Claro. Ah, ya. Las preguntas de menor importancia habia tenia mas informacion del resultado.

**Esteban Cortes**: Pero identifico bien...

**Eduardo Bacon**: Eh, si, si, si...

**Esteban Cortes**: O sea, fueran dudas completamente factibles.

**Eduardo Bacon**: No, si me tiro una mas como de 19 preguntas asi como resolver, pero esta empezando a elaborar mucho mas hacia delante, asi como no, esto ya sigue mas adelante y preguntar por modelos que claramente no estaba.

**Esteban Cortes**: Claro.

**Eduardo Bacon**: Si. Eh, ya con eso cubrimos las cinco preguntas a daria la respuesta y esta aca marca eh los proximos pasos para ver el tema contexto general, pero eso. Entonces ahi quedo claro con las preguntas.

## Cierre — Confirmacion casing pendiente (Q10) (00:25)

**Esteban Cortes**: Ya.

**Eduardo Bacon**: Juan dice, "Nos puedes confirmar despues con el equipo el tema de la convencion para los enum?

**Juan Diego Galdames**: Si, estaba revisando, o sea, porque pregunte por el grupo y la persona que hizo lo enums esta a medio tiempo, entonces esta con clases, pero revisando el codigo. Eh, no hay una regla de casing obligatoria, hay normas no mas de que tiene que empezar con eh solamente con letras y que no puede tener espacios ni guiones, pero no hay una regla especifica de casing. De hecho, estaba viendo los casos de enum que hay en los objetos de UP1 y hay diferentes, o sea, hay unos que estan con la mayuscula que con la regla que mostraste tu, otros que estan con upper snake case, otros que estan con lower snake case. Entonces, no hay una regla de casing que te vaya a validar o invalidar el campo, no? Asi que voy a preguntar si queremos que haya una convencion, pero por lo menos a nivel de codigo no te va a tirar error si es que tu creas un enum con reglas de casing diferentes.

**Eduardo Bacon**: Ja. Entonces ahi si lo pueden conversar, yo creo, mi forma de pensar es que este es el momento donde podemos establecer los patrones, los contratos que vamos a generar y deberia ser deberiamos tener un contrato referente a como usar la asi como las propiedades estan en con un formato especifico...

**Esteban Cortes**: Los enum.

**Eduardo Bacon**: Eh si los enum van a tener o caen en el global, pero que no caiga en que cada uno lo hace a su forma, no? Despues se vuelve enredado y el codigo deja de entregar informacion solamente leyendo el codigo. Porque ahi, por ejemplo, siendo Snake Case, uno lo ve y al tiro sabe que ah, esto es un enum, no tengo que ir a buscar nada mas.

**Juan Diego Galdames**: No, me parece tambien estoy de acuerdo. Voy a comentar y voy a impulsar tambien que haya una regla, un estandar de nomenclatura.

**Esteban Cortes**: Si, estoy de acuerdo respecto a eso.

**Eduardo Bacon**: Ya, ahora esto no es un bloqueante porque despues pues se pueden actualizar y como estamos recien comenzando, si se llega durante el sprint o mas adelante a una definicion de cual va a ser el estandar, bueno, hacemos el cambio, no? No es algo que nos obligue a remodelar toda la base de datos, no es un bloqueante.

**Juan Diego Galdames**: Si, si.

## Cierre meta — Origen de los objetos derivados (00:28)

**Eduardo Bacon**: Espero haya sido practico tener la presentacion con las preguntas de los contextos.

**Esteban Cortes**: Si, siempre sirve porque si no no tendriamos que haber estado revisando. Yo ahi me quedo al tiro claro como de donde venian las dudas como para poder resolverlas pronto. Eh, yes for the win.

**Juan Diego Galdames**: Mhm.

**Eduardo Bacon**: Bueno, Claudito, apoyandolos.

**Esteban Cortes**: Si, yo tambien hice toda la extraccion de datos con Claudito, como que le dije a los clientes, fue analizo toda la base de datos, eh identifico como que cursos tenian mas completitud de datos para decirme estas son buenas propuestas y en base a eso lo genere. Tenia una version donde tenia como todas las tambien a traves de eso me identifico mejoras al propio modelo y por eso inclui un par de objetos mas que fue el curricular link y el bibliography reference. Eh, como para que lo tengan en contexto, no mas. El curricular link lo que busca es que muchas veces cuando se estan haciendo estas relaciones de definiciones de los formularios, algunas instituciones deciden, no se, yo voy a alinear las sesiones eh como las distintas clases con un eh resultado de aprendizaje, por ejemplo, o con una competencia como que hace o con una componente de evaluacion, como que hacen vinculos entre datos academicos de acuerdo a su propio modelo, que no son necesariamente estandar. Entonces de ahi nace como el objeto curricular link, como un objeto donde registrar esas relaciones sin forzar como que este siempre deberia estar relacionado con este otro porque no siempre es asi. Y el otro es que las referencias tipicamente se utilizan de manera transversal, es como un catalogo de referencias que la institucion va completando y que va utilizando en distintas asignaturas. De ahi sale como bibliography reference. Por eso han salido esos dos objetos nuevos.

**Eduardo Bacon**: Como dato anecdotico al cierre que esta le habia pedido que me generara las preguntas y la presentacion de porque tengo el MD con todas las preguntas, pero se vuelve un poquito dificil de leer al final de seguir entre todas las alternativas. Entonces le dije, "Hazme una presentacion y eran muchas, eran como 40 slides." Entonces le dije, "Oye, no, vamos, ceñamonos a lo que tenemos que preguntar para el sprint." Entonces, por eso aca creo que esa cosa eh ah si que habia en una version, porque si se llama aca se llama reunion con Esteban, como te reconoce como el autor de la documentacion, dice, me decia como ya si tienes minutos para reunirte con el tema, ve haz estas preguntas, estas son las que necesitamos aclarar y ahi es donde venia resolver estas cinco.

**Esteban Cortes**: Bueno, bueno, me identifico. Ya me tiene cachadito.

**Eduardo Bacon**: Cachudito. Eso.

**Esteban Cortes**: Vale, ya chiquillos, hablamos entonces. Que esten bien. Buen dia.

**Eduardo Bacon**: Bueno, gracias.

**Juan Diego Galdames**: Buen dia. Esta muy bien.

---

## Mapeo de la transcripcion → decisiones

| Bloque transcripcion | Pregunta(s) | Decision resultante |
|---------------------|-------------|---------------------|
| 00:02 — Casing enums | Q10 | Pendiente — JD impulsa estandar UP1, no bloqueante |
| 00:04 — workflowState valores | Q2 | DECISION-005 (postergado) |
| 00:08 — Tenants y ambientes | T1 | DECISION-009 (TEST + UPU) |
| 00:11 — RTs globales/per-tenant | T2 | DECISION-007 (globales) |
| 00:14 — CustomSection contrato | Q3 | DECISION-006 (1 RT fijo + Extensions) |
| 00:16 — habilitacion Univalle | Q5 (parcial) | DECISION-008 (Session normal, no ApprovalCondition) |
| 00:19 — externalId | Q1 | DECISION-004 (1 campo + data lake) |
| 00:22 — RTs sin campos | Q5 (parcial) | DECISION-008 (postergar GeneralData/GraduationProfile/EntryProfile) |
