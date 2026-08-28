---
id: TRANSCRIPT-2026-08-14-sprint-planning-sp9-uassessment
project: up1
type: transcript
module: curriculum-design
tags:
  - transcript
  - sprint-planning
  - sp9
  - migracion-uassessment
  - curriculum-design
  - curriculum-mapping
  - matriz-de-competencias
  - instructional-component
  - mcp
  - mcp-remoto
  - clerk
  - yupi
  - report-builder
  - ticket-1608
---

# Migracion uAssessment - Sprint Planning - reunion 2026-08-14 - SP9

> Transcripcion editable generada por ordenador. Puede contener errores.
> Se mantiene verbatim como fuente de verdad para las decisiones que la referencian.

## Contexto

Sprint Planning del sprint 9 (migracion uAssessment), al dia siguiente del
refinamiento del 2026-08-13. Se ajusta el alcance y la capacidad del equipo,
Esteban repasa los artefactos de matriz de competencias y adopcion, Juan Diego
muestra una POC de MCP remoto con autenticacion via Clerk, el equipo acuerda que
la sincronizacion MCP sea parte de cada historia que toque core, se cierra el
sprint anterior (ticket de soporte 1608 en revision) y se pospone la poda final
de historias al lunes. Ver el refinamiento en
[[TRANSCRIPT-2026-08-13-refinamiento-sprint-uassessment]].

## Ajustes de matriz de competencias y artefactos (00:00:04)

**Esteban Cortes Sandoval:** Ya. Eh, continuando, nos quedamos ayer eh lo que es la matriz de competencias. Em, tengo aqui los ajustes de lo que conversamos. Eh, hasta aca tengo, cierto? Lo que ya teniamos. Bueno, en realidad aqui tiene como las unidades de gobernanza y se pare en una pestana la parte de adopcion, ya esta parte aqui tiene como una informacion como de lo que es relevante respecto a este espacio, como por ejemplo que es de tipo generica y que no tiene una una unidad duena, que cuando tenga la unidad van a salir ahi, cierto? Em y y y y bueno, el resto de como mismo limpie un poco como tanto alertas y cosas por estilo informacion que creo que realmente no era tan necesaria que se vea mas cercano a lo que ya tenemos en el flujo actual de UP1 y eh eh y que mas? y algunos ajustes menores en los flujos de competencias que no estaban correctos. Por ejemplo, cuando una competencia se mide desde sus resultados de aprendizaje, no tiene que tener como ninguna informacion mas abajo, porque el resto de como se mide se termina definida a nivel del curso. Entonces, aqui como que lo muestra efectivamente como sin nada mas sale un mensaje explicando eso y despues se va a poder visualizar, se deberia poder visualizar, cierto?

## Artefactos para refinamiento, Matrix Adoption (00:01:41)

**Esteban Cortes Sandoval:** eh cuando se cuando tengamos la tribulacion desde el curso, eh como se visualizaria despues alineado desde la matriz, pero la practica en realidad no, esta parte de aqui no deberiamos ponerla ahora porque todavia no vamos a hacer la parte de los resultados de aprendizaje a nivel del curso, como el lineamiento con las competencias. Eso va a ser una una historia posterior, asi que eh denme un segundo. Aqui tengo que pasarle unas cositas. Alian. No es esto. Es esto. Ahi si. Ya. Asi que eso respecto a lo que habiamos visto ayer. Ahi esta mas o menos el ajuste en base a la a la retro que que salio de ayer. No se si hasta eso tienen alguna duda u otro comentario. No, no, no. No. Okay. No. Em, que mas tenemos aca? Bueno, aqui esta eh eh competencia. Bueno, aqui esta el los artefactos que voy a compartir, cierto? Esta como la matriz de competencia. el compe ahora ya como completo eh los campos de bueno, la eh los que se miden de tipo rubrica e tenemos por aca las reglas en general, la parte de la relacion con los planes de estudio, que es el el objeto Matrix Adoption.

## Documentos para la historia, desfase de NCP en curricular mapping (00:04:25)

**Esteban Cortes Sandoval:** Eh, respecto como a lo que vemos en la pestana dos de adopcion, como lo que va a poblar, el objeto que va a poblar esa esa accion y las reglas de negocio como para que las pongamos ahi documentadas. Eh, aca esta como la propuesta de los como el flujo de gestion por defecto. Eh, y aca esta tambien como los permisos de los roles ya definidos. Eh, y aca hay algunos ejemplos funcionales como de los distintos casos. Eh, eso. Entonces, esto va a ser los dos eh documentos para que puedan para la parte de refinamiento que los vamos a dejar inmediatamente en la historia. Y la historia M. Estabamos nosotros ayer aca. Componen internos. Ajustar orden de los menus. Ah, no falto poner esa historia. Donde quedo esa historia? Curriculum. Curriculum map. Ya, aqui esta. Esto ya esta. Esto ya esta. Esto ya esta listo, no, Pancho? Que lo de este springas de cobertura.

**Francisco Navarro:** Eh, si.

**Esteban Cortes Sandoval:** Si. Y Edu actualmente tenemos como un desfase de lo que es como NCP en lo de curricular mapping,

## Curricular map aun no esta en MCP (00:06:58)

**Eduardo Bacon:** Si,

**Esteban Cortes Sandoval:** no?

**Eduardo Bacon:** Curricular map no esta en el en CP todavia.

**Esteban Cortes Sandoval:** Eh, ya. M, voy a escribir esto aca primero, que es adopcion y eh, como se llama la pestana?

**Eduardo Bacon:** Arriba tenias un Si.

**Esteban Cortes Sandoval:** Competencias. Competencias.

**Eduardo Bacon:** A

**Esteban Cortes Sandoval:** No estoy en eso. Sino si se que tenemos una tarea ahi,

**Eduardo Bacon:** ver.

**Esteban Cortes Sandoval:** pero estoy pensando en las implicancias de como cuanto es el esfuerzo de incluirlo, empezar a incluirlo realmente. No se como, como lo ves tu respecto a los esfuerzos previos realmente

**Eduardo Bacon:** Yo creo que en tiempo, en un dia mas o menos, porque entre eh revisarlo,

**Esteban Cortes Sandoval:** hizas

**Eduardo Bacon:** pasar las cosas al MCP y hacer la las pruebas. un poquito mas, pero deberia salir todo rapido. que todas las la guias, asi que Claudito deberia tomarlo rapido.

**Esteban Cortes Sandoval:** Quizas no queremos si queremos de competencia implementacion. Dale, Juandi.

**Juan Diego Galdames:** Ah, si, no, que era respecto al al MCP que eh ya en las proximas semanas viene pronto ya como tareas dedicadas de UP1 al MCP. Entonces, de hecho, ahora le voy a mostrar a Claus una prueba de concepto de un MCP remoto y podriamos al tiro aprovechar tambien el desarrollo

## POC de MCP remoto: conexion por URL, autenticacion Clerk (00:08:44)

**Esteban Cortes Sandoval:** H

**Juan Diego Galdames:** integrarlo con el que tiene Edu.

**Eduardo Bacon:** Si.

**Juan Diego Galdames:** No se cuando cuando CL me el visto. No, eh, o si me lo das, te lo paso a ti tambien para que le eche una mirada y y los dejemos eh, empecemos a configurarlo cuando empiecen a salir los tickets. Asi es que

**Esteban Cortes Sandoval:** Que es?

**Eduardo Bacon:** Yep.

**Esteban Cortes Sandoval:** En que a que nos referimos con

**Juan Diego Galdames:** ah, o sea,

**Esteban Cortes Sandoval:** remoto?

**Juan Diego Galdames:** es basicamente como cuando uno conecta los MCP de, no se, por ejemplo, el de Gira, como que uno al colocarlo en el Jason de MCP lo conecta a una URL.

**Esteban Cortes Sandoval:** Aja.

**Juan Diego Galdames:** Entonces este esta puesto el el proe uno que se conecta a una URL que esta corriendo de momento en local. La idea es para que que sigue como el formato estandar de los MCP que se conecta despues a un a un servidor. Entonces yo voy a poder usarlo en en Cloud Code, en Kiro,

**Esteban Cortes Sandoval:** Ah, ya.

**Juan Diego Galdames:** en en Open Code en

**Esteban Cortes Sandoval:** Pero es basicamente darle como la arquitectura de que quede en la nube, pues no que quede un servidor para que lo podamos utilizar realmente conectado

## MCP remoto: login por navegador, sin credenciales en JSON (00:09:46)

**Juan Diego Galdames:** Claro. Si. y tambien que eh tiene el que el que hice ahora

**Esteban Cortes Sandoval:** a

**Juan Diego Galdames:** ayer tiene la diferencia de que hace como la autenticacion al tiro con el usuario de con la cuenta de Clerk. Entonces es como cuando uno configura el MCP en,

**Esteban Cortes Sandoval:** Ya.

**Juan Diego Galdames:** no se, de te abre una pestana en el navegador de gira de o out. Ya, eso mismo,

**Esteban Cortes Sandoval:** Mm.

**Juan Diego Galdames:** pero con con las cosas de Clerk. Entonces de ahi despues te mapea tu usuario y sin tener que poner como que uno ponga como en el JSON del MCP poner como tu clave de CL, sino que se hace un una como un login desde el

**Esteban Cortes Sandoval:** Ah, ya.

**Juan Diego Galdames:** navegador.

**Esteban Cortes Sandoval:** Pero lo que estais, o sea, estais trabajando directamente en la arquitectura

**Juan Diego Galdames:** Claro. O sea,

**Esteban Cortes Sandoval:** del

**Juan Diego Galdames:** era basicamente fue una prueba de concepto de probar como el ese ese puente de de del inicio de sesion y las y puse unas tools muy basicas como para probar que funcionan al fondo el tema de de roles y permisos. Entonces,

**Esteban Cortes Sandoval:** y por sobre eso despues hay que meterle como todo lo que avanzo mas ya lo que empezamos a meterlo entre todos los

## Planificacion del sprint y capacidad del equipo (00:10:45)

**Juan Diego Galdames:** claro,

**Esteban Cortes Sandoval:** equipos.

**Juan Diego Galdames:** claro, claro. La idea es que cada la idea es que los flujos de del resto de soluciones sean tools del del MCP.

**Esteban Cortes Sandoval:** Ya. Bueno, eh. Okay. Entonces, yo estaba yo estaba rumeando. Que es lo que estaba rumeando? Ah, sobre el MCP. Estoy pensando si e pensando ya como no. Lo mas natural que yo veo aca es, Pancho, que tu segui trabajando la matriz, pero estas dos pestanas no se que tanto, o sea, me parece que son grandes. No se si se alcanzan a guardar de dentro del sprint completas de acuerdo a lo que hemos visto.

**Francisco Navarro:** Eh, la de matriz en general va a ser grande, muy grande. La otra no tanto.

**Esteban Cortes Sandoval:** La de adopcion te referido o la matriz en si. No te entendi. Eso la de competencia.

**Francisco Navarro:** La adopcion no creo que sea tan grande, pero La la competencia ser muy grandes.

**Eduardo Bacon:** Listo.

**Esteban Cortes Sandoval:** Deciste tu esa ya, o sea,

**Francisco Navarro:** Si,

**Esteban Cortes Sandoval:** un escenario es como o no alcanzamos o te toma todo el spring quiza.

## Escenarios de capacidad, instructional component primero (00:12:04)

**Esteban Cortes Sandoval:** Eso yo creo como los escenario o no.

**Francisco Navarro:** mas que nada para para hacer los test de de y todo el asunto porque en

**Esteban Cortes Sandoval:** Aja.

**Francisco Navarro:** general no digo que esta porque esta mas simplificada, pero en general esa ese componente siempre da como problema.

**Esteban Cortes Sandoval:** Si. Ya, si eso fuese asi, esa es la capacidad de Pancho y ahi, Edu, estan estas otras tres que son como bueno, la importante es la de instructional component. Podria ser como una semana.

**Eduardo Bacon:** a comenzar con eso.

**Esteban Cortes Sandoval:** Aja. O sea, la parte nuestra me refiero.

**Eduardo Bacon:** Claro, claro. Si, pero para desbloquear a los otros

**Esteban Cortes Sandoval:** Claro.

**Eduardo Bacon:** equipos.

**Esteban Cortes Sandoval:** Y despues estan las otras que que son como la de los roles y lo de los menus que eran cosas de configuracion. Entonces ahi no se, eh dependiendo de el analisis de esa carga, si es que hay espacio poner algo mas que podria ser, por ejemplo, empezar a meterlo del MCP de curricular mapping, por eso en realidad lo menciono, pero no lo se.

**Eduardo Bacon:** Mhm.

**Esteban Cortes Sandoval:** Ahi lo dejo a evaluacion eh vuestras. Lo voy a dejar en el sprint solamente como para ver si es que lo sacamos el lunes realmente. Eso quedo en regular papeling.

## Cierre del sprint anterior y sincronizacion MCP (00:13:21)

**Esteban Cortes Sandoval:** Ademas, en el sprint, como se imaginan ustedes como el las actualizaciones del MCP como e como que quien mismo lo esta haciendo lo deja sincronizado o que lo vea otra persona? Porque yo estoy pensando en en esto. En que sprint estaba? Esta en sprint actual. O, menti. Sprint 8.

**Eduardo Bacon:** que habiamos hablado de si queda tiempo al final hacer la sincronizacion con todo,

**Esteban Cortes Sandoval:** Ah, mira, yo yo fui y deje puse C raja que habiamos hecho todos los

**Eduardo Bacon:** pero no se si quedo ahi.

**Esteban Cortes Sandoval:** tickets. My bad. Pero okay, no me arrepiento de nada, eh?

**Juan Diego Galdames:** Bueno,

**Esteban Cortes Sandoval:** Claro.

**Juan Diego Galdames:** todos los ticket refinados y con asignacion.

**Esteban Cortes Sandoval:** Si, si. Ya no le cuentes ahi,

**Eduardo Bacon:** Claro.

**Esteban Cortes Sandoval:** eh? Ya. Entonces, que es lo que quedo pendiente realmente? Ese que se mueve para aca y eh este ajustar de requisitos tampoco lo hicimos, cierto? No, ya lo vamos a dejar para el siguiente. Entonces, asi lo vamos a pasar.

## Ticket de soporte 1608 en revision (00:14:36)

**Esteban Cortes Sandoval:** Ya. Y entonces estos de aca, estos listos estan finalizados, cierto? El flujo es distinto,

**Eduardo Bacon:** Si,

**Esteban Cortes Sandoval:** pero estos que son de

**Eduardo Bacon:** solo estoy con el 1608 que lo estoy mandando ahora

**Esteban Cortes Sandoval:** soporte. Ya,

**Eduardo Bacon:** antes de lo termin antes de de irme al almorzar y regrese

**Esteban Cortes Sandoval:** ya. Okay. Entonces, eso va a quedar ahi. lo vamos a cerrar el lunes y en realidad eh lo lo tienes que enviar, Pero porque ya esta probado o falta hacerle algo

**Eduardo Bacon:** No,

**Esteban Cortes Sandoval:** mas.

**Eduardo Bacon:** necesito que lo apruebe. que lo revisen y lo lo aprueben.

**Esteban Cortes Sandoval:** Ya se va a quedar en revision. Okay. Eh, y esto era era un fix de core o no? Si. Ya. Okay. De todas formas voy a por ahora completar el sprint y voy a mover lo siguiente al nueve. Que mentiroso. Ya, entonces ahi ya se ve la otra historias. Ya con eso yo creo que vamos a estar bien de tamano de temas de carga. Entonces ahi falta ya va el lunes, eh?

## Preparacion para iniciar SP9 el lunes (00:15:42)

**Esteban Cortes Sandoval:** Eh, segundo. Y ya como como nunca creo que lo habiamos logrado. Con esto tenemos refinado alto en ya como para que ustedes puedan revisar en detalle no mas la historia el lunes para que vayamos partiendo. Entonces faltaria el lunes no mas como eh podar las cosas del sprint si es que ven algo que que no veamos factible de tomar realmente por capacidad o si no ya darle inicio ahi en base a como la al terminar de refinar la las cosas que faltan. Eh, entonces, no se, comentarios, si no podemos ir terminando ya la parte sincrona de esta

**Eduardo Bacon:** Bueno,

**Esteban Cortes Sandoval:** sesion.

**Eduardo Bacon:** este rapido, eh, yo, Juan, lo que mencionabas del MCP que estan armando, eh, lo tienen en un repo.

**Juan Diego Galdames:** No, todavia esta en mi computador.

**Eduardo Bacon:** Ah,

**Juan Diego Galdames:** De momento te lo estoy terminando de hacer guias porque tambien se va a pasar a Claus y te lo mando y te estoy

**Eduardo Bacon:** ya.

**Juan Diego Galdames:** dejandolo para que se pueda llegar y y levantar. M.

**Eduardo Bacon:** Ya. Eh, eso no, yo no tengo mas dudas de del otro. Ya lo habiamos revisado, refinado.

**Esteban Cortes Sandoval:** Bueno, Eh, ah, lo que iba a mencionar y mis preguntas respecto al NCP era como si es que ustedes creian que eh deberiamos como incluirlo siempre como dentro de la misma historia o si deberia trabajarlo alguien aparte.

## MCP como parte de cada historia que toque core (00:17:32)

**Esteban Cortes Sandoval:** Mi pregunta tambien se contextualiza en que el sprint subsiguiente, el sprint siguiente los chiquillos van a estar los chiquillos me refiero al resto del equipo, que por cierto ahora vamos a tener retro despues de de esta sesion a las 4. van a estar instalando ya todo lo que es Yupi One para que en Sprint sub siguiente empiecen a tomar tareas desde no se lo que podamos planificar mas basico, simple, no lo se, Yeah. Entre esas tareas o entre esas personas tambien va a estar Juan, eh, quien va a estar, quien quiero que aprenda todo el detalle del modelo de objetos nuevos para que empiece a trabajar mas dedicado en la migracion de learning eh assurance, o sea, la parte de reporteria. Eh, pero tambien quiero que si puede aportar manos con otras cosas tambien aporte y en ese contexto no se si que por ejemplo vaya viendo los temas del NCP podria ser eh tareas que pueda tomar el y por eso preguntaba realmente como eh desde el punto de vista tecnico, que se que tambien que hay que ir como construyendo las tools que va teniendo el MCP, no se que que opinion tenis tu, por ejemplo, Edu que soy el que ha estado trabajando mas en ese punto.

**Eduardo Bacon:** Yo creo que no se si sera lo correcto, pero por ejemplo como hasta este momento soy yo el que estaba manteniendo el MCB porque vive en mi local, eh mi metodologia trabajo ha sido para no dejarlo al final,

## Metodologia MCP: sincronizar dentro de la misma historia (00:18:56)

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** que lo que hice las primeras veces fue como al final ir y empezar a revisar los tickets y hacer las cargas con Claudito para que haga la migracion.

**Esteban Cortes Sandoval:** Aha. Aha.

**Eduardo Bacon:** Fue en mi cuando armo las tareas que voy a en la que voy a subdividir los tickets es dejar una tarea de sincronizacion con el MCT.

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** Entonces se hace todo, se prueba en la en lo que se desarrollo en la en UP. Una vez est probado, se pasa a la siguiente etapa que es la final que ah,

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** okay. Entonces, ahora vamos a sincronizar con el MCP y se anaden los tests del MCP y se cumplen los protocolos del MCP, que yo creo que esa seria como la forma para no ir generando deuda con los tickets.

**Esteban Cortes Sandoval:** Flujo ya. deuda. Si, estoy de acuerdo. O sea, seria como parte de la misma historia,

**Eduardo Bacon:** Y si a lo mas es que ahi,

## Sincronizacion con el core y homologacion en MCP (00:20:09)

**Esteban Cortes Sandoval:** por asi

**Eduardo Bacon:** por ejemplo, es el tema de sincronizacion con el core

**Esteban Cortes Sandoval:** decirlo.

**Eduardo Bacon:** modificaciones dentro del core para manejar cosas, porque ahi, por ejemplo, claro, toma para poder como lee los objetos, como se comunica eso sigue usando las cosas que son de UP que nacen desde el core.

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** Entonces ahi habria que hacer como una mantencion no mas de si algo se modifico del core que le este pegando al MCP. si es que el cor no lo esta eh no no lo esta manteniendo eh revisarlo y homologarlo y ver como afecta hacia abajo. O sea, al final creo que con eso es que el que trabaja en el algo debe validar en

**Esteban Cortes Sandoval:** deberia ser la misma.

**Eduardo Bacon:** el MCP,

**Esteban Cortes Sandoval:** Aja.

**Eduardo Bacon:** o sea,

**Esteban Cortes Sandoval:** Ya, ya. Si,

**Eduardo Bacon:** tambien deberia cumplir el mismo protocolo de, ah,

**Esteban Cortes Sandoval:** entiendo.

**Eduardo Bacon:** voy a modificar un objeto de algo, no se, un eh algun nuevo metodo, validar que quede funcionando en el MCP y se rompe para abajo.

**Esteban Cortes Sandoval:** Funciona con el Ya estoy de acuerdo. Si. Ya. Entonces,

**Juan Diego Galdames:** Claro,

**Esteban Cortes Sandoval:** probable. Dale, Juan.

**Juan Diego Galdames:** asi no yendo por el mismo o sea cuando yo creo que cuando ya este como implementado,

**Esteban Cortes Sandoval:** Ok.

## Etiqueta en Jira para validar/homologar MCP (00:21:19)

**Juan Diego Galdames:** o sea, como Ya, como ya levant. contaba como el el un MCP de de UP1 ya como a nivel productivo es incluso ir poniendo que sea como una etiqueta dentro de gira, o sea, como alguna alguna tarea que implique tocar evitar un algo que vaya a tocar un flujo vital del core o de un producto, eh homologarlo o validarlo que no rompa lo que su equivalente en el en el MCP.

**Esteban Cortes Sandoval:** Ya me parece, tienen razon. Entonces, yo creo que cuando yo va Integre va a mirar mas temas de la reporteria. Y lo otro que estoy pensando que no se cuanto creo que no hemos avanzado en esa direccion todavia respecto como a Yupi, no se que va a pasar ahi como con agentes como mas especializados en un contexto.

**Juan Diego Galdames:** H ahi va a estar eh por lo que me han dado Clauso asi previamente es que van a ser bueno ya dada la reestructuracion que hubo de Yupi a nivel a nivel de arquitectura, eh lo que va a entrar en prioridad ahora es darle mas capacidades al darle vida,

**Esteban Cortes Sandoval:** Mhm.

**Juan Diego Galdames:** darle mas capacidades al MCP para que sea incluso el mismo Yupi quien pueda nutrirse de el. que eso porque eh si si el MCV funciona bien es mucho mas facil despues la integracion con con

**Esteban Cortes Sandoval:** Si, si, es como Yupi usa las mismas herramientas.

**Juan Diego Galdames:** Yopi.

**Esteban Cortes Sandoval:** Basicamente eso es lo que deberiamos,

**Juan Diego Galdames:** Claro,

**Esteban Cortes Sandoval:** no deberiamos tener duplicacion ahi en ese sentido.

**Juan Diego Galdames:** claro.

**Esteban Cortes Sandoval:** Si yo estoy pensando en porque la gente no he visto en detalle como funciona Yupi, pero yo si recuerdo bien obviamente como ciertos flujos como disenados de de para darle guia sobre ciertas respuestas, pero no se en que punto o si lo es que lo han pensado ya los chiquillos del equipo de UPI sobre como

## Yupi y agentes especializados en diseno curricular (00:22:41)

**Esteban Cortes Sandoval:** agentes que esten como especializados en un tema en particular, como en el tema de diseno curricular, por ejemplo.

**Juan Diego Galdames:** Mhm.

**Esteban Cortes Sandoval:** Yo creo que eso voy a explorar ahi con con Cllaus y con el equipo porque yo creeria que si deberiamos tener algun tipo de proms o guias como definidas en base a

**Juan Diego Galdames:** Claro.

**Esteban Cortes Sandoval:** nuestra experiencia para que el usuario cuando este interactuando en esos contextos eh tambien la gente tenga como esas heram comillas, herramientas que mas que como darle la herramienta de consumir un objeto en particular, trabajar con alguna estructura de los del modelo de datos de de curriculum design, eh, o de gestion curricular en general, tambien darle como ese contexto de de sugerencia, cosas por el estilo. Entonces, pero no se,

**Eduardo Bacon:** Ok.

**Esteban Cortes Sandoval:** hay creo que esa es una un alcance que todavia no hemos abordado, pero uniendose yo al equipo vamos a tener como mas capacidad tambien para para explorar esas otras cosas.

**Juan Diego Galdames:** Si, habria que revisandolo tambien.

**Esteban Cortes Sandoval:** Verdad?

**Juan Diego Galdames:** hace poco se se unio Amanda al al coro,

**Esteban Cortes Sandoval:** Si,

**Juan Diego Galdames:** ella esta solo enfocada en Yupi,

**Esteban Cortes Sandoval:** en UP. Ya. Bueno,

**Juan Diego Galdames:** entonces que

**Esteban Cortes Sandoval:** entonces cuando se sume ahi vamos a conversar para ver en que en que se puede que

## Explorar capacidades desde el mod hacia Yupi (00:23:46)

**Juan Diego Galdames:** E

**Esteban Cortes Sandoval:** cosas podemos hacer desde el mod para ir sumando hacia alla. En ese sentido, creo yo, ese es como el objetivo que tengo en mente.

**Juan Diego Galdames:** claro.

**Esteban Cortes Sandoval:** Porque el otro esta como el diseno de, no se, funcionalidades que tengan potenciado algun botoncito que haga algo cona, pero eh tambien creo que en Yupi tenemos que asegurarnos que esas interacciones se den bien, pero ahora ya con Yupi funcionando tambien dentro de la arquitectura como ya mas productiva, creo que ahi vamos a poder explorar mas cual es el limite de lo que podemos hacer a traves de eso. Ya. E eso.

**Juan Diego Galdames:** M.

**Esteban Cortes Sandoval:** Okay. Entonces estamos gente 30 minutitos por si ya pueden ir avanzando con la revision mas detallada de los tickets. Proximo espero que podamos hacer estas instancias incluso mas antes, eh, porque tenemos tiempo de de refirar. Ahora estoy empezando a construir solamente para que ustedes sepan el mapeo del componente de tributacion. este a los UP1 y lamentablemente pedi perdi mi mejor maqueta de la vida, asi que tengo que redisenarla de cero.

**Eduardo Bacon:** Oh, que mal.

**Esteban Cortes Sandoval:** Eh,

## Redisenar maqueta del componente de tributacion (00:25:06)

**Eduardo Bacon:** Ese tenia un monton de cosas extra.

**Esteban Cortes Sandoval:** si, era buena, era bonita. Lo tenia cualquier carino, pero la perdi,

**Eduardo Bacon:** Oh,

*La transcripcion finalizo despues de 00:26:45.*

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
| C1 | decision | Cuando una competencia se mide desde sus resultados de aprendizaje no lleva informacion adicional abajo; se define a nivel de curso (historia posterior la visualizacion alineada desde la matriz) | Esteban | — |
| C2 | action | Adjuntar a las historias los artefactos: matriz de competencias completa, reglas de negocio de adopcion (Matrix Adoption), flujo de gestion por defecto, permisos de roles y ejemplos funcionales | Esteban | — |
| C3 | action | Implementar Instructional Component (parte de Curriculum Design); estimado ~1 semana; desbloquea a Scheduling y Engagement | Eduardo | [[TRANSCRIPT-2026-08-13-refinamiento-sprint-uassessment]] |
| C4 | action | Pasar Curricular Map / curricular mapping al MCP y probarlo (~1 dia, quizas un poco mas) | Eduardo | — |
| C5 | action | Revisar la POC de MCP remoto de Juan Diego (conexion por URL + login Clerk) para iniciar su configuracion | Eduardo | — |
| C6 | action | Enviar el ticket de soporte 1608 (fix de core) a revision; el grupo lo aprueba y se cierra el lunes | Eduardo, El grupo | 1608 |
| C7 | change | Cerrar el sprint 8 y mover los pendientes (incl. ajuste de requisitos no hecho) al sprint 9 | Esteban | — |
| C8 | decision | La sincronizacion con el MCP es parte de cada historia que toque core: desarrollar y probar en UP1, luego sincronizar MCP, agregar tests MCP y cumplir protocolos MCP (evitar deuda) | Eduardo, equipo | — |
| C9 | action | Poda final de historias y revision en detalle el lunes antes de arrancar SP9 | El grupo | — |

### Future — para tickets que aun no existen

| # | Tipo | Item | Tema/Module | Cuando aplique |
|---|------|------|-------------|----------------|
| F1 | scope | Home/dashboard de Curriculum Design via Report Builder; metricas por definir (condicional a capacidad) | curriculum-design | SP9 condicional |
| F2 | scope | Migracion de learning assurance / reporteria; se suma personal nuevo (incl. otro Juan) tras instalar Yupi One | reporteria | proximos sprints |
| F3 | capability | Etiqueta en Jira para tareas que tocan flujos vitales del core: obliga a validar/homologar en el MCP | proceso / MCP | cuando MCP este productivo |
| F4 | capability | Mantencion del MCP frente a cambios del core: quien modifica un objeto/metodo valida que no rompa el MCP hacia abajo | MCP / core | continuo, al tocar core |
| F5 | scope | Agentes/prompts especializados de Yupi por contexto (ej. diseno curricular) usando las mismas tools del MCP para evitar duplicidad | yupi / mcp | exploracion futura, con Amanda |
| F6 | scope | Redisenar la maqueta perdida del componente de tributacion de competencias UP1 y continuar su refinamiento | curriculum-mapping | proximo, antes de tickets de tributacion |

### Context — info de fondo

| # | Tipo | Item |
|---|------|------|
| X1 | clarification | Curricular map aun no esta en el MCP (desfase conocido) |
| X2 | clarification | POC de MCP remoto (Juan Diego): conexion via URL como cualquier MCP estandar, autenticacion con Clerk (login por navegador, sin clave en el JSON), mapea el usuario y valida roles/permisos; corre en local, objetivo llevarlo a servidor/nube; aun no esta en repo |
| X3 | clarification | La matriz de competencias (pestana de competencia) es el trabajo mas grande y suele dar problemas en pruebas; adopcion es mas acotada; se evalua si entra completa en el sprint |
| X4 | clarification | Amanda se sumo al equipo enfocada solo en Yupi; se coordinara con ella al integrarse Esteban |
| X5 | caveat | El ticket 1608 es un fix de core; queda en revision (no se cierra sin aprobacion del grupo) |

### Notas de extraccion

Vacio: todos los items se clasificaron dentro de la taxonomia.
