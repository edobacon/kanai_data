---
id: TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment
project: up1
type: transcript
module: curriculum-design
---

## Metadata de la reunion

- **date:** 2026-10-06
- **duration:** 01:25:04
- **sprint:** SP12 (sesion de refinamiento de diseno, fuera de planning)
- **participants:**
  - Esteban Cortes Sandoval (presenta y conduce la propuesta) - email no confirmado
  - Eduardo Bacon (eduardo.bacon@uplanner.com) - dev, dominio MCP/curriculum
  - Francisco Navarro (francisco.navarro@uplanner.com) - dev, curriculum-mapping / matrices de competencia
  - Gian Adofacci (gian.adofacci@uplanner.com) - dev, curriculum-design
  - Giovanni Gonzalez - dev, aporta casos del legacy y preguntas sobre transiciones - email no confirmado
  - Alexander Reisenegger - dev - email no confirmado
  - Daniel Galvez - invitado, sin intervenciones en la transcripcion
- **external_refs:** UPONE-1381 y UPONE-1459 (retiro del workflow relacional, Finalizadas, citadas por verificacion posterior, no en la reunion). En la reunion se cita a "Klaus" (core) y a "Sandra" y "Cami" (consultoria) sin claves Jira.
- **covers_questions:** separar estado de flujo de trabajo y estado de vigencia; roles predefinidos por estado; vigencia calculada por funcion del core; clases de cambio por campo (correccion, ajuste, nueva version); restriccion de retorno desde estados publicados; clonar frente a versionar; indicador visual de campo bloqueado; validacion con instituciones piloto (Ulima, Univay).
- **extracted:** 2026-10-08 (por kn-identify-scroll)
- **procedencia:** PDF "Modelamiento flujo de trabajo, estatus y reglas uAssessment uP1 - 2026_10_06 11_29 GMT-03_00 - Notes by Gemini.pdf" (45 paginas: resumen de Gemini y transcripcion automatica). Documento presentado: https://claude.ai/artifact/RQyrVMBvpq7WQTQb15CHdo (copia en `kb/sp12/vigencia-documentos/original/`). Notas de IA, pueden contener errores de transcripcion (por ejemplo "Claudito" por Claude, "Claus" por Klaus, "NCP" por MCP, "Isaac" por IsActive, "BRW" por review).

## Resumen (de las notas de Gemini)

Control de estados y flujos mediante versionamiento y reglas automaticas. Esteban propuso combinar los flujos de aprobacion con versionamiento y vigencia automatica; los disparadores actualizan estados y las clases de cambio regulan la edicion.

### Decisiones: requiere mas debate

- **Restriccion de transiciones inversas desde estados publicados.** Se debatio impedir que un documento retorne desde un estado publicado o vigente hacia etapas de edicion, para no omitir las reglas de control. Queda pendiente definir los mecanismos para excepciones o ajustes posteriores.
- **Mecanismo automatizado para el estado de vigencia.** Se propuso que el estado de vigencia se actualice por funciones y disparadores del backend y no por modificacion manual. Sujeto a definir los flujos detallados.
- **Modelo de estados de vigencia y clases de cambio.** Los objetos mantienen un estado general de vigencia y clases de cambio por campo, con excepciones que determinan si se edita en la misma version o en una nueva. Pendiente de revision en una segunda sesion.

### Decisiones: acordadas

- **Calculo automatico del estado de vigencia.** Valor derivado por una funcion centralizada a partir de fechas y dependientes activos, sin modificacion manual por los usuarios.
- **Desacoplamiento de flujos mediante roles predefinidos.** El motor asocia los estados personalizados de las instituciones a roles predefinidos del sistema que gobiernan las reglas de edicion, desacoplando el flujo de diseno de la vigencia operativa.

### Proximos pasos

- [Esteban Cortes Sandoval] Validar propuesta: enviar el modelamiento de estados de vigencia y workflow a Sandra y Cami y pedir comentarios.
- [Esteban Cortes Sandoval] Revisar configuracion de estados: investigar en el codigo core si la capacidad de configurar nombres de estados por institucion se mantiene o fue retirada, y si es necesaria para la nueva implementacion.
- [Esteban Cortes Sandoval] Definir reglas de transicion para el mantenedor de flujos de trabajo: impedir que los documentos retornen desde estados publicados a estados de edicion.
- [Esteban Cortes Sandoval] Actualizar propuesta: completar el documento sobre estado de validez y reglas de edicion, incorporando los casos de correccion mencionados.
- [Esteban Cortes Sandoval] Programar una segunda sesion de seguimiento una vez revisado el documento.
- [El grupo] Revisar la propuesta tecnica y funcional sobre estado de validez, reglas de edicion y viabilidad en el sistema.
- [Esteban Cortes Sandoval] Consultar con Klaus la implementacion del indicador visual en los campos y si requiere cambios en el nucleo.

### Detalles (indice por tema, con marca de tiempo)

- 00:00:00 Contexto: refinar control de estados y flujos para planes de estudio y programas de asignatura; el legacy carece de proteccion adecuada de documentos vigentes.
- 00:02:58 Propuesta general: combinar flujos de aprobacion con mapeo de categorias de vigencia y versionamiento.
- 00:06:48 Concurrencia de versiones: varias versiones de un plan activas a la vez hasta que egresa la generacion anterior.
- 00:08:15 Limitaciones del legacy: mezcla logicas de aprobacion y operacion; las instituciones operan con vigencias por corte y versiones multiples.
- 00:12:40 Clasificacion de cambios: umbral comun entre cambios superficiales (tildes) y estructurales (nueva version). Alexander: tiene sentido flexibilizar mediante nuevas versiones.
- 00:15:16 Matrices de competencia: bloquear adiciones en ciertos estados, pero permitir nuevos planes si la matriz esta vigente (Francisco).
- 00:18:15 Roles predefinidos: authoring, review, enforce, retired.
- 00:21:39 Validaciones del nucleo: todo flujo inicia en authoring y contiene un estado enforce.
- 00:24:02 y 00:29:11 Estado de vigencia (validity status) derivado por una funcion del nucleo, sin intervencion manual.
- 00:31:27 y 00:56:58 Retroalimentacion con clientes: Eduardo aprobo el calculo; Francisco sugirio validar con consultores o universidades piloto; Esteban aclaro pruebas con Ulima y Univay desde octubre y noviembre sin restringir la implementacion a la resistencia inicial.
- 00:40:22 Transiciones hacia atras: Giovanni y Esteban debaten regresar de publicado a un estado anterior; restringirlo en el creador de flujos.
- 00:45:06 Cambios profundos: clonar frente a versionar (clonar crea una entidad nueva; versionar crea una version de la misma).
- 00:48:44 Roles de flujo frente a estados de vigencia.
- 00:51:01 Reglas y dependientes para determinar la vigencia (planes, inscripciones, periodos de oferta).
- 00:53:13 Caso de ejemplo: plan de ingenieria civil industrial 2020 a 2023 (publicacion, versiones, correcciones, solicitudes de cambio, reformas).
- 00:59:04 y 01:01:30 Columnas computadas: Eduardo plantea la limitacion actual de uP1 y propone triggers; Esteban aclara que el valor se guarda y lo actualiza una funcion de backend ante disparadores (publicacion, cierre de ingresos, cambios en dependencias; no tareas diarias).
- 01:04:30 y 01:06:28 Clases de cambio por campo: acciones genericas y especificas; clase estructural por defecto y excepciones; campos tecnicos de solo lectura.
- 01:10:40 y 01:13:20 Correlacion de vigencia y politicas de edicion: cerrado solo permite clonar; sin vigencia permite edicion general; punto de control centralizado en las rutas de escritura.
- 01:15:31 a 01:18:34 Estructura JSON propuesta, indicadores visuales o bloqueos en formularios, segunda sesion antes de presentar a Klaus.

## Transcripcion (literal, generada por computadora)

### 00:00:00


**Esteban Cortes Sandoval:** Ya voy a presentar el mismo documento que ustedes están viendo, así que si lo quieren ir mirando en su local. Está bien. Ya. Hoy día vamos a refinar qué vamos a hacer con las lógicas de estado y control de los estados en en UP, ¿ya? O sea, conectado me refiero a que eh cierto, en nuestro mod de currículum design y currículum mapping, nosotros definimos o la institución, ¿cierto?, define el plan de estudio, crea un plan de estudio, crea programa eh de asignatura, crea matrices de competencia y todos estos documentos pasan por un flujo de trabajo, un workf, ¿cierto? Em, y estos documentos también lo que hacemos es la capacidad de poder versionarlo, es decir, crear nuevas versiones. Ya, eso hoy día es como lo que lo que tenemos.

**Francisco Navarro:** Ok.

**Esteban Cortes Sandoval:** Y en el legacy, ¿cierto? hemos tenido como hemos ido progresivamente agregando como capacidades de control, digamos, como hemos ido mejorando las capacidades de control porque eh nos hemos dado cuenta que cuando ya esto el plan de estudio está en vigencia o el programa de asignatura está en vigencia, no podemos no podemos permitir que que los usuarios lleguen y les hagan cambi afectando, cierto, un documento que ya está cerrado, digamos.


### 00:01:31


**Esteban Cortes Sandoval:** digamos, que está en vigencia de cara a los estudiantes y eso tiene que ver con con cómo funciona el flujo de gestión curricular de las instituciones. Es decir, en el legacy no estamos hoy día retratando bien todas las reglas para como proteger la edición de estos documentos de manera correcta. Lo que estamos buscando y lo que vamos a conversar hoy día es eh cuáles son esas reglas correctas y cómo lo podríamos implementar en nuestra nueva versión en UPW. En Ylado parte de esto, pero es como solamente lo inicial, ya tenemos como flujos de trabajo y en algunos casos tenemos algunos controles, pero ahora que ya hemos implementado como los módulos principales y ya estamos también tenemos varias como de las capacidades principales como la tributación, la generación de la matriz e nos hemos dado cuenta que nos falta mejor control y porque todavía no tenemos como bien modeladas esta estas lógicas. Entonces, eh la idea es em un segundo que me está eh ya. Entonces, la idea es revisar eso. Yo hice un una iteración ya con Claudito respecto a esto.


### 00:02:58


**Esteban Cortes Sandoval:** Tengo también una propuesta, pero la idea es como ir discutiéndola y sumando y eh comentarios entre todos. Eh, hasta ahí no sé si el contexto se entiende, si hay alguna duda para no irnos perdiendo, porque ahora ya vamos a entrar en materia más de detalle. Confirmación explícita, chiquillos, porque si no me responden, no sé si están haciendo otra cosa. No hay dudas. Sin dudas, hay dudas.

**Alexander Reisenegger:** Yo estaba terminando el pero para termin Así

**Esteban Cortes Sandoval:** Ya. Bueno,

**Alexander Reisenegger:** full.

**Esteban Cortes Sandoval:** concentré uno acá. Sí, sí. Ahí vamos con esto. Entonces, eh, ¿cuál es la idea principal? Ya, esto que estoy ahí que les voy a esto que está en la primera etapa en detalle, pero esta sería más o menos la idea principal que y después vamos a contratar con lo que tenemos hoy día. La idea principal es que lo que yo planteo es que tengamos un el workflow de aprobación, los workflow que ya tenemos, ¿cierto?


### 00:04:22


**Esteban Cortes Sandoval:** Cada documento tiene su flujo de trabajo. Este es un ejemplo. No todas las instituciones van a tener los mismos estados. E pero que esos estados tengan eh un mapeo, ¿cierto? Como una categoría que serían como los estados de vigencia, que esto sería como nuevo, ¿ya? y que eso se eh combine también con las con lo que es el versionamiento, ¿ya? E entonces en lo general esta sería más o menos como la idea. Uno crea un plan de estudio, digamos, ese plan de estudio va a pasar por un flujo de eh diseño, ¿cierto? Se va a ir diseñando, se va a ir aprobando eso hasta en algún punto va a pasar a una etapa, a un estado en el cual ya no se debería permitir más edición. Ya, cuando se haga ese paso en el flujo es cuando deberíamos aplicar un tipo de función que calcule, cierto, si se cumplen ciertas reglas, marque como el estado de vigencia en el cual se encuentra ese ese documento.


### 00:05:24


**Esteban Cortes Sandoval:** En realidad distintos estados cada vez que se vaya haciendo un paso ciertas acciones, la es tener como una función que vaya actualizando ese estado de vigencia, ¿ya? y que ese sea el estadio de vigencia que nos permita también controlar eh luego si es que yo en otra lado, no sé, voy a intentar eliminar, pero este esta pero este plan de estudio ya se encuentra en un estado vigente eh o en extinción, ahí vamos a ver más detalle qué se refiere en cada estado. El sistema bloquee y diga, "No, no puedo porque ya se encuentra en este estado." Entonces, la idea es no depender de los estados del flujo de trabajo, que podrían ser muy complejos para la institución, pero sí que cuando la institución defina los estados de el flujo de trabajo, estos tengan que quedar asociados a algún a estas reglas como de lo estos estados de vigencia, más o menos como la lógica general. ¿Y cómo se se con se se relaciona eso con elamiento? con que si ya yo tengo una versión como vigente de un plan de estudio, por ejemplo, y realmente tengo que hacerle cambios curriculares, macrocurriculares o o microcurriculares, eso en realidad va a tener que sugerir la institución o bloquearle, digamos, y lo que le va a permitir hacer es, por ejemplo, crear una nueva versión y esa nueva versión vuelve entonces a pasar por todo el flujo de diseño hasta estar vigente.


### 00:06:48


**Esteban Cortes Sandoval:** Entendiendo también que aquí la vigencia de estos docum de estos de estos eh documentos curriculares, bien digo, también es que no es un único documento que está vigente, ¿cierto? Pueden haber más de un documento vigente, pueden haber más de una versión, por ejemplo, del mejor dicho más que vigente es más de una versión del plan de estudio puede estar activa, ¿cierto? Que yo puedo tener eh no sé, ingeniería informática. el plan del año 2020 todavía tiene estudiante inscrito, ¿cierto? y si bien puede estar en un estado de vigencia que es en extinción, es decir, ya no ya no se inscriben más estudiantes nuevos a ese plan, ese plan se mantiene, cierto, eh digamos ahí activo hasta que termine ya esa esa toda esa

**Francisco Navarro:** Sí.

**Esteban Cortes Sandoval:** generación de estudiantes se crece y ya ese plan quede como cerrado. Pero pero a la vez a la vez al tener esa versión de ingeniera informática del 2020 puede haber una versión más reciente como el 2026 que es la donde se va matriculando nuevos estudiantes. Entonces, lo que lo que buscamos con esto que vamos a implementar es eh un mejor control de eh esas acciones, ya de de un límite claro de cuándo se puede permitir una edición, cuándo no y y un y todo una digamos un cambio a nivel de código para que permitamos este tipo de control.


### 00:08:15


**Esteban Cortes Sandoval:** Ese es como el objetivo de de lo que queremos eh lograr. ¿Qué es lo que hoy día tenemos? Ya tenemos un solo campo que maneja como estas ambas lógicas. Ya, ya tenemos un estatus que sería el estatus del workflow, eh, donde podríamos decir tenemos un etapa que está como asociado como un ciclo de aprobación implícitamente y otros estados como asociados a un ciclo de operación. E, pero esto es contradictorio porque si la institución define un workflow como más complejo que vuelve de uno al otro, como que empiezan a mezclar las reglas. y hoy día, ¿qué tenemos como controlado acá? Eh, por ejemplo, aquí tenemos bloqueado el mover algo en la malla. Eh, dependiendo del estado, ¿cierto?, que que tiene que está en este flujo. Si cambiamos o creamos un estado nuevo, esa regla no se va a ver afectada, simplemente como que va a quedar ahí en el IT. Eh, hoy día podemos reescribir el perfil de egresos de manera libre. Eh, tenemos bloqueado el cambio de prerequisito, puedo cambiar, podemos cambiar los eh los créditos de forma libre, podemos ajustar la tripulación, pero eso está bloqueado.


### 00:09:28


**Esteban Cortes Sandoval:** Eh, dependiendo del estado, ¿cierto? Podemos cambiar, hacer cambios los resultados de aprendizaje. Podemos borrar una competencia de una matriz vigente según esto. Puede ser que me esté equivocando todo análisis que dice código ya. Eh, así hago el explícito, pero es un ejemplo de que hoy día no tenemos controladas las reglas porque tampoco hemos definido como cuál va a ser el eh las reglas que vamos a utilizar o o la estrategia, mejor dicho, que vamos a utilizar a nivel de código para controlar esto, ¿no? Así que es el estatus, es el estatus donde nos encontramos hoy en día. Y claro, hoy día tenemos, por ejemplo, la el versionamiento. Yo puedo versionar un programa asignatura, ¿cierto? El programa hoy día tiene un estatus active, ¿cierto? Eh, un campo que nos dice si es el actual sen, ¿cierto? Eh, y eso cuando yo cuando lo versionamos, vamos a tener una versión anterior, vamos a seguir ambos concurrenten, vamos a cambiar una estatua de draft, ¿cierto?


### 00:10:37


**Esteban Cortes Sandoval:** Pero aquí, por ejemplo, nos quedan dos con dos versiones en curso. Eh, no hay ningún cambio como para decir la otra versión está deprecada. Eh, entonces dice acá, el sector de malla muestra ambas y las mallas siguen apuntando a la B1. Entonces, ahí como que se nos van a empezar a mezclar lógicas que son un poco claras. Entonces, lo que queremos aquí también es tener como este esta estructura de trabajo que nos permita como decir cómo se controla cada cosa. Ya. Así que eso, esto es lo que querríamos en lo en alto nivel, lo que querríamos hacer. Esto es dónde nos encontramos y qué es lo que hacen hoy día las instituciones. Esto es una investigación, ¿cierto? Con nuestro agente favorito, Claudito, ¿cierto? ¿Qué es lo que hacemos acá? Tenemos e un segundo por aquí alguien ya no tenemos acá e las instituciones hacen vigencia por corte. lo que yo les decía, el plan rige desde un periodo de ingreso, eh no desde una fecha cualquiera.


### 00:11:50


**Esteban Cortes Sandoval:** Entonces, en algún momento la institución dice, este plan pasa a estar vigente y va a quedar vigente hasta que se le dé cierre y ya no hayan institución. no hay no hayan estudiantes de alguna corte que estén inscritos en ese plan de estudio o que no hayan finalizado. Hay varias versiones operando, una versión abierta nuevos ingresos y otra en extinción hasta que egresa su última corte. Eso es lo que les decía. Entonces siempre va a haber una versión que va a estar como abierta para que se inscriban estudiantes nuevos, pero hay otras que van a tener estudiantes inscritos va a seguir operativa, o sea, vamos a seguir midiendo competencia, etcétera, y en algún punto ya esa va a quedar de precao. Eh, lo vigente no se edita, se corrige, se ajusta con un acto liviano, ¿no? Aquí no le no cuesto más detalle a que nos referimos con un acto liviano, ¿cierto? O se reforma con una versión nueva. Eso es lo más claro, ¿cierto?


### 00:12:40


**Esteban Cortes Sandoval:** Eh, crear una nueva versión para hacer cambios. Lo que hoy día es como eh que tenemos que dar una vuelta de cómo trabajarlo es qué cambio es lo suficientemente, voy a decir, superficial para permitirlo en la versión actual sin eh forzar

**Francisco Navarro:** Sí.

**Esteban Cortes Sandoval:** una versión nueva. Quizás yo le puedo cambiar eh no sé, un voy a hacer algo super estúpido. El plan de estudio ya está vigente, pero nos dimos cuenta de que su nombre no tiene una tilde que tendría que tener. Eh, eso no podemos hacer que fuerse como crear una versión nueva, ¿cierto? No crear una versión nueva porque el nombre quedó como mal escrito, por decir. Es un ejemplo muy burdo. Podrían haber otros, de seguro van a haber otros campos del plan de estudio que uno podría editar sin que impacten, digamos, en tener que crear una nueva versión. esa como línea que hace esa separación es algo que también tenemos que tener como eh umbral común tocada el perfil de egreso siempre es reforma, ¿cierto?


### 00:13:48


**Esteban Cortes Sandoval:** Crédito, duración y obligatorias casi siempre. O sea, hay algunas cosas, eso se relaciona a lo que decía, hay algunos puntos que sí o sí, datos que sí o sí los cambiamos implica que deberían ser uno versión. Eh, hay otros que no necesariamente como que y eso hoy día en el legacy tampoco lo tenemos controlado. Mm, no que yo que yo recuerde y no sé ya si tú discrepas conmigo en el legacy me parece poco tenemos controlado. que tenemos controlado a veces con con los permisos de workflow es qué dato puedo editar, en qué paso en particular, pero eh de todas formas la responsabilidad queda como a nivel del paso. Si hay un paso que en el cual definimos que ya no podemos editar nada, no podemos editar nada, pero sigue siendo como una responsabilidad que se la damos al worth que no debería ser. Eso es eso es donde ahí estamos como mezclando, ¿cierto? lógicas y sílabo sin norma. Esto es un punto importante. El sílabo, ninguna norma exige bloquearlo, que es como lo que lo que pasa de manera operativa y hace sentido si lo piensan, porque el diseño viene a nivel de plan de estudio, del programa asignatura y el sílabo es lo que ocurre en la en la operación, digamos, es eh el sílabo existe durante ese periodo académico y después es reemplazado por un nuevo el siguiente periodo.


### 00:15:16


**Esteban Cortes Sandoval:** Entonces tiene más flexibilidad sobre los cambios que se le pueden hacer porque si lo pensamos bien tiene más relación como a la a la operación docente. Entonces eso tiene más flexibilidad y ahí no hay como bloqueos porque ya es lo operativo. Lo que tiene bloqueo es todo lo que tiene como que ver con el diseño. Eh, ya hasta ahí. No sé si hay dudas, comentarios, les va haciendo sentido la idea o no.

**Alexander Reisenegger:** tiene sentido flexibilizar un poco más como creando nuevas versiones por todos. M.

**Esteban Cortes Sandoval:** Y tú, Pancho, que trabajaban, por ejemplo, la matriz de competencia, te va haciendo sentido como la idea, porque ahí donde también hemos visto que tenemos pendiente con el control de lógica, ¿cierto?

**Francisco Navarro:** Eh, si en la matriz de competencia, por ejemplo, si agregáis competencias, no se No se debería poder en ciertos estados, pero podría siempre esté vigente la la matriz agregarle nuevos planes, pero eso no habría problema en ese sentido. Tampoco debería poder cambiarse como el tipo de medición. Eso ya es netamente la matrí y eso


### 00:16:56


**Esteban Cortes Sandoval:** Entonces ahí hoy día tendríamos problemas si por ejemplo la institución define tiene estado distintos a los que tenemos como por defecto en el workflow, porque se verían afectadas esas lógicas.

**Francisco Navarro:** eh claro, claro. O sea, todavía no tenemos la matriz del bloqueo, pero en otras partes sí, porque tenemos algunas medias dura la el estado como que estado vigente bloquea y no tenemos como esta flexibilidad

**Esteban Cortes Sandoval:** Control.

**Francisco Navarro:** de pasar esto.

**Esteban Cortes Sandoval:** Ajá. Claro, claro. Entonces, eso es lo que tenemos que que implementar, ¿cierto? Estados, independientemente de la configuración que haga la institución no afecten a nuestro motor como de validación de de decir, "Acá te puedo permitir una adición o no." Eso es lo que necesitamos como implementar de forma bien abstracta. Eh, entonces, eje aprobación. Aquí estamos en el punto. instituciones acá de aprobación. Eh, este sería más o menos la idea. Entonces, cada institución define sus estados, pero cada estado declara un rol. El rol sería como lo que es controlado por nosotros, ¿ya?


### 00:18:15


**Esteban Cortes Sandoval:** Entonces, la institución podría controlar y definir los estados que quiera, pero nosotros tenemos los roles predefinidos y esos son a los cuales asociamos las reglas. Entonces, eh aquí, por lo tanto, nosotros podemos hacer el el desarrollo, digamos, con estos roles, apuntando las reglas a estos roles. Eh, y después la institución simplemente tiene que mapear, cierto, los estados a esos roles, entendiendo también que esos roles tienen ciertas reglas eh definidas respecto a ellos. O sea, la regla no mira el nombre y la cantidad de estado, ¿cierto? Mira el rol que cada valor del Enum declara. Ese rol controla cuándo se pide y cuándo se activa la vigencia. Entonces, aquí hay un ejemplo. Serían como los roles propuestos, ¿cierto? Authoring redacción, ¿cierto? Cuando estamos como diseñando review en aprobación, cuando estamos como en revisión aprobado, ¿cierto? Eh, digamos, el plan de estudio ya está aprobado, aún no rige, pero en teoría ya no deberíamos permitir ediciones. Eh, enforce está como publicado, ya se está aplicando, ¿no es cierto?


### 00:19:24


**Esteban Cortes Sandoval:** Eh, y retired, ¿cierto? Cuando estamos como cerrando el ingreso, eh, está como derogándose, em tampoco deberíamos permitir cambios. Ya. Ahora, cuando miro aquí estas dos definiciones, me doy cuenta que igual son estados que hacen mucho sentido con el plan de estudio. Eh, ¿hacen sentido con el programa asignatura? Sí, creo que igual hacen en realidad los mismos sentidos porque el programa asignatura igual está como en uso, publicado y en algún punto se retira. El retirado quizás no tiene la misma interpretación de que es cerrado a ingreso o quizás no aplique el retirado, pero ahí podría darlo una vuelta. Y aquí tenemos ejemplo de dos instituciones, ¿cierto? universidad podría tener estado borrador observado, revisión de escuela de facultad aprobado por distintas entidades hasta decretado y derogado y otra universidad B podríamos tener cierto estado más simple borrado, revisión, publicado y cerrado. Enoring, ¿cierto? Sería como sin vigencia, no está vigente todavía el plan asignatura edición libre. Eh, en review sin vigencia la edición podría ser como más restringida.


### 00:20:37


**Esteban Cortes Sandoval:** porque la están revisando, ¿cierto? Ya en BRW para nosotros, ¿cierto? No está en vigencia, pero ya está bloqueado, ¿cierto? En cierto sentido ya está bloqueado porque ya está probado. Hay cosas que no deberíamos permitir. Inforce, ¿cierto? Entonces, para entrar exige fecha de inicio y acto. se refiere como para entrar en en publicado e una función que está como especificada más adelante. Es decir, yo lo voy a publicar y voy a decir, "Okay, desde tal fecha esto quedó vigente, por así decirlo. Eh, y bloquea, ¿cierto? Aquí activa vigencia y bloquea y luego dice para entrar exige el retire fecha de fin de ingreso. Entonces, aquí estamos diciendo ya este el plan de estudio terminamos de permitir como el el ingreso de estudiantes. Entonces aquí habría una acción de llevarlo a ese estado eh y pasa como estar como en extinción, por así decirlo, ¿ya? Eh, entonces aquí algunos comentarios de cosas que tenemos que entender que esta es una propuesta, ¿cierto?


### 00:21:39


**Esteban Cortes Sandoval:** se va a transformar eventualmente en tickets y implementaciones y mucho de esto está pensado, hasta como lo tengo refinado yo, ¿cierto? Podría tener el cambio de lo que hablemos como para una acción más delg. Entonces, validaciones del core, al menos un estado inforce, todo registro nace en un estado auoring, ¿cierto? Entonces, cuando yo eh creo el plan de estudio, ¿cierto? Debería eh partir un estado de authoring, ¿cierto? Y eso depende debería depender de la institución cuando define el workflow, ¿cierto? Deberían partir siempre de un estado si no estaría mal partir con un estado de tipo review, el flujo de flujo eh en sí. Entonces, esto implica que implícitamente estoy implicando acá que deberíamos tener algún tipo de interfaz core para editar, cierto, los planes de, o sea, lo el flujo de trabajo y esa edición de flujo de trabajo debería, ese digamos mantenedor de edición de estos flujos de trabajo debería reforzar o tener estas reglas. Entonces decir, mira, estáy creando un flujo que no parte con estado de out, no podemos permitir eso.


### 00:22:50


**Esteban Cortes Sandoval:** O sea, ahí sería como una alerta o este flujo que tiene el plan de estudio no tiene ningún estado categorizado como enforce. Entonces tampoco podríamos permitir que ese estado sea válido, porque ese flujo sea válido, porque no vamos a poder luego controlar las reglas que dependen de esos estados, ¿cierto? Entonces, eh validaciones, eh retiro de publicación, volver de enforce o retire solo sin dependiente de activos. Aquí hay algunas reglas como más específicas. Workflow es distinta de operación. El estado dice si se publicó, la fecha y los dependientes dicen si opera hoy, ¿cierto? Entonces, aquí con esto estamos como diferenciando el workflow, que está más orientado al diseño de eh la operación que sería como los de vigencia que ya están más de nuevo orientados a la operación misma del plan de estudio del programa de asignatura, ¿ya? esa sería como la idea ya eje de vigencia un estado calculado y nunca escrito a mano. Entonces sea. La idea es que esto este r, ¿cierto?


### 00:24:02


**Esteban Cortes Sandoval:** La idea es tener el campo validity status, ¿cierto? Que sería un campo nuevo, eh, que se va a derivar de las fechas de vigencia y de los dependientes activos que ya existen en el modelo, ¿cierto? Eh, entonces, ¿qué tenemos acá? ¿Cierto? Esto serían como los eh roles que hemos venido diciendo, ¿cierto? sin vigencia, programado, enforce, extinction, cerrado. Aquí creo que tengo una eh duplicidad retir y aquí tengo que revisar porque estos estados de acá no son los mismos que los estados de acá. De que me hacer esa consulta, no vaya a ser que lo tenga mal. Eh, estamos en ya las eje subaste, ¿eh?

**Eduardo Bacon:** Sí, sorry, me quedé picado con los despes. Quedaron listos. No había visto el chat.

**Esteban Cortes Sandoval:** Dale, tranqui. Yo te compartí ahí en el chat, todos tienen acceso como a este documento y eh, ¿qué más? ¿Qué más? Y a modo de resumen, como lo que estamos mirando, ¿cierto?


### 00:25:39


**Esteban Cortes Sandoval:** La lógica de los estados de, o sea, de la vigencia y del workflow, ¿ya? la vigencia de un plan de estudio, de un programa de asignatura y la y cómo diferenciar eso respecto a el workflow de diseño. Ya todo todo pensado en como el control que hacemos de los cambios que se le pueden hacer a un plan de estudio, un programa asignatura, cuando este plan o este programa ya está vigente, ya ya está aprobado, ya está en uso y hacemos control sobre el mismo. Entonces, la idea de esta propuesta es como hacer un control correcto bajo la hipótesis de que la institución, cada institución va a poder definir un flujo de trabajo distinto para el plan de estudio, para el programa de asignatura, para la matriz de competencia y por tanto no podemos depender exclusivamente del flujo de trabajo porque implicaría como tocar código cuando institución va a definir un estado distinto a lo que hoy día tenemos como normado. como la idea más o menos de lo que de lo que estoy presentando. Y esa idea se basa en que independientemente de los estados que la institución defina, esos estados deberían estar, cierto, relacionados a un rol, voy a decir particular otro tipo Yeah.


### 00:26:58


**Esteban Cortes Sandoval:** estado que sería el rol y sobre esos estados rol sería donde nosotros hacemos el control de las reglas, por así decirlo, que que vamos a ir aplicando, ¿no? Sobre el estado mismo que la institución define en el workflow, ¿ya? Entonces, como diferenciar una capa, ¿cierto? Una donde nosotros tenemos absoluto control porque esos estados, esos roles están predefinidos por nosotros. Y lo único es que cuando la institución define el workflow, y esto por lo tanto implica implícitamente que tiene que haber un mantenedor como para ese diseño, e ahí cierto la institución tiene que asegurarse de que esos estados queden asociados o en realidad nuestra nuestro mantenedor debe asegurarse que cada estado transición queden asociadas de forma correcta a estos roles, ¿ya? Y por lo tanto ahí nosotros tendríamos como una capa de control. Y por eso yo decía, si una institución está definiendo un flujo de trabajo, todo flujo de trabajo debería partir con un estado de tipo authorit eh o de roll outoring, ¿cierto? Eh, y todos deberían tener un estado que ya simboliza que está publicado, que sería como el roll enforce.


### 00:28:03


**Esteban Cortes Sandoval:** Ahí vendría como como el control, pero nuestro control vendría a nivel de estos roles, digamos, de los estados. la institución podría definir como el flujo, como quisiera, siempre y cuando cumpla con estas reglas que nosotros como imponemos en ese sentido. Em, eso y yo justo aquí que estaba presentando, ¿cierto? Eh, esta parte de acá, me di cuenta que teníamos como entre la sección tres y la cuatro eh diferencias de estados. Así que eh estaba preguntándole a Claudito aquí cuál eran las diferencias que teníamos y me dijo, eh no son iguales porque responde preguntas distintas. EG3, G3 roles. Clasifica los estados del workflow. Esos son los roles. Clasifican los estados del workflow. Dicen qué se decidió la institución si el documento está en redacción, en revisión, aprobado, cambia solo cuando alguien hace una transición. Ya, estos son los roles que tienen los estados de workfar. Cuatro, vigencia. Ah, ya. Es un resultado calculado. Este es un estatus en estado distinto.


### 00:29:11


**Esteban Cortes Sandoval:** ¿Ya? Entonces, el el lo como les decía, los workflow, los estados de workflow tienen un rol. Esos roles están predefinidos por nosotros y eh los objetos, el objeto de plan de estudio, de programa asignatura, ¿cierto? tienen un validity status, que este es el nuevo. Eh, y este estatus, eh, lo que está acá, ¿cierto? Es un resultado calculado, ¿cierto? Entonces, este es el que nos dice si el documento hoy día está o no válido. En ese sentido está operativo. Eh, y claro, ello estaba mezclando un poco la definición. Eh, estos son los estados que tendría el objeto y estos son los roles que tienen los estados del workflow que nos permiten controlar las reglas para decir, "Okay, este plan de estudio hoy día se encuentra en estado vigente o se encuentra en estado programado o se encuentra en estado sin vigencia." Entonces, digamos, la transición a través de los estados del workflow y otras acciones van a hacer que este vality validity status se vaya actualizando.


### 00:30:22


**Esteban Cortes Sandoval:** ¿Ya? Entonces, si lo hacemos como un eh una analogía lo que hoy día tenemos en el Legacy, si se dan cuenta, en el legacy tenemos el plan estudio tiene un workflow y tiene un un estado de Isaac, digamos, como Isactive está activo o no está activo. Un cer que incluso ese Isactive no es tanto es más respecto como a lo que nos envía la institución, pero como que va un poco por ahí. Lo que tendríamos ahora es distinto. El el plan de estudio tendría un estado en el cual se encuentran el workflow y el estado de como vigencia, por así decirlo, el validity status, que eso nos va a decir como este plan de estudio se encuentra en en estado programado, ¿cierto? Entonces encuentra sin vigencia, pero dentro de ese del sin vigencia podríamos decir está justo en la etapa de eh borrador o de revisión de escuela, ¿cierto? Todavía no está vigente, pero dentro del workflow se encuentra en estado de revisión de escuela. Ahí estamos haciendo una diferenciación de esas dos capas.


### 00:31:27


**Esteban Cortes Sandoval:** Estamos diferenciando el estado de vigencia de el estado en el que se encuentran el flujo de trabajo. Ya, esa es como la la forma en la que lo estamos como eh diferenciando. Así que ahí me detengo. De nuevo, pregunto si se entiende más o menos porque ese es como el el núcleo, el el corazón de lo que de como del modelamiento, ya. Así que de nuevo quiero ver si les hace sentido, si les causa como duda algo en particular. No, perfecto, todo se entiende perfecto. Es un modelamiento impresionante a eso se refiere. Si no hay comentarios.

**Francisco Navarro:** Eh,

**Eduardo Bacon:** Bien.

**Francisco Navarro:** podríamos pasárselo a algún consultor que valide o no.

**Esteban Cortes Sandoval:** Sí, sí, sí. Mi idea en realidad era como que lo refinemos y me gustaría después pasárselo acá mi Sandra como para que lo revisen y me digan si les hace sentido o no. Sí. Aha.

**Francisco Navarro:** No, no, pero que también podríamos No sé si tenemos alguna universidad como de de colegillo de India como para mostrarle lo que se está haciendo como en mostrarle este nuevo motor de estado que les diga está bien, está mal, no falta esto.


### 00:33:18


**Francisco Navarro:** No sé si podemos hacer ese ajuste con alguna conejo.

**Esteban Cortes Sandoval:** Eh, ah, sí, que me está hablando Gian.Déjem preguntarle una cosita y te respondo al ti. Tengo mi respuesta en la mente, pero em en tenemos instituciones que van a empezar a probar el sistema. Lo último que yo les comenté, ¿cierto?, es que queríamos como configurar Ibero, ¿cierto? Luego de eso, les comenté que eh íbamos a empezar una implementación con Ulima, donde íbamos a partir como en el Legacy y eh después íbamos a hacer como un switch como a finales de diciembre a UP1, que era cuando ya tenemos como es nuestra proyección de donde ya deberíamos tener más avanzado la migración ya de todos los modes. Eh, han han ocurrido eventos respecto a eso también. Ahora una eh le vamos a hacer una demo y después de eso quieren tener como un un eh un tenan habilitado para probar lo que tenemos, ¿cierto? no todavía decir que tienen todo y no van a tener todas las capacidades que hoy día tiene el Legacy, pero probando lo que tiene.


### 00:34:49


**Esteban Cortes Sandoval:** Univay también está en conversaciones más o menos para lo mismo. Entonces sí, pero yo creo que no vamos eh a restringirnos a implementar este motor nuevo solamente en base a su a su a que ellos nos digan, "Sí, está bien, implementen." Eh, porque yo creo que hoy día las instituciones, o sea, yo veo los problemas de no tener esto hoy día en los sistemas en el sistema legacy, em, pero también las instituciones como que no tienen como una forma establecida de llevar estos flujos necesariamente como que se rigen en parte un poco por lo que les permite el sistema, ¿ya? Entonces, eh en ese sentido, yo creo que vamos a avanzar en en implementar esto sí o sí, independientemente de lo que de que ellos quieran o no, porque el no tenerlo, digamos, tampoco le da solución al problema, simplemente genera como instancias donde la institución dice como yo versioné esto porque esto cambió acá o o le empiezan a hacer cambios, cachá. Nosotros necesitamos hoy día eh llevar nuestro conocimiento real del problema de la gestión curricular a el sistema y que la institución empiece a operar alrededor de eso.


### 00:36:07


**Esteban Cortes Sandoval:** Obviamente no tenemos que hacer algo que sea tan restrictivo que le impida a la institución eh llevar a cabo como sus flujos. ¿Ya? Y en este sentido aquí nosotros podríamos tener, no sé, tener un flujo que tiene dos estados, pasado de borradora vigente y eso ya sería como un un flujo como sin muchas reglas, sin tantas variaciones, eh, y sería como una forma muy simple de implementar. Yo creo que hoy día todos los clientes que tenemos los podemos mapear este flujo sin problemas y en la institución hacen estos trabajos como de forma implícita sin que nosotros tengamos esas reglas del sistema, pero de cuando no aplicamos cuando cuando tenemos clientes más como complejos, como por ejemplo UPC, terminan haciendo cambios sobre entidades que no deberían porque no tenemos ese control, ¿cierto? Eh, y por lo tanto ahí es donde después nos llega un montón de soporte que eso es realidad, ¿cierto? hoy este programa asignatura tuvo cambios, ¿qué pasó acá? Y es porque no tenemos este tipo de cont. Entonces, sí, si tenemos como clientes que vayan a probar esto, eh yo esperaría que durante desde mediados de octubre e primeras semanas de noviembre ya tengamos uno o dos clientes con unos tenan de ellos probando información en el sistema, probando flujos y ahí vamos a tener retroalimentación real.


### 00:37:24


**Esteban Cortes Sandoval:** Pero la implementación de estos cambios creo que vamos a partirla antes. En realidad me me interesa como variarlo con Sandra y con Camia en ese sentido. No le voy a pasar a una institución así como, oye, vamos a implementar esto, no le voy a decir como ahora el plan de estudio se gestiona así, tienes estos dos estados, digamos, eh, y le vamos a decir cuáles son los beneficios para tenerlo así, pero no creo que no no nos vamos a restringir a hacer un diseño, un mal diseño de la solución. solamente porque unos porque algunos clientes pudiesen como no estar de buenas a primeras como de acuerdo con el cambio. En general, yo creo que siempre va a haber resistencia a ese cambio. Tenemos que evidenciarles como lo positivo de estas capacidades. Es esa es parte como responsabilidad que tenemos que tener yo con el de marketing y los consultores de cómo reforzar por qué esto es mejor que lo que tenemos en plan. Así que eso sí vamos a probar Pancho, pero no nos vamos a restringir a a sus opiniones solamente como para restringir si implementamos o no es.


### 00:38:31


**Esteban Cortes Sandoval:** Entonces yo una realidad. El punto es cómo lo hacemos, cómo lo implementamos para esa mejor forma. los comentarios mientras yo reviso que puedo ingresar al tenan de uP1porque justo como les decía, uP1quiere y sí puedo Tenemos single sign on. Me quedó la duda. Está preguntando a Gian,no sé si se dieron cuenta, pero ingresé y no, o sea, como que lo guió de manera directa. Yo he ingresado a otro tenant de del productivo. Si se dan cuenta, este est productivo, es que es planner. Em, y me lo vio de forma inmediata, eh, así que ahí le pregunté si te Ya, pero pero está bien, está rico. Dale, yo.

**Giovanni Gonzalez:** Estaba leyendo las preguntas del final de la del artefact

**Esteban Cortes Sandoval:** Ah, yo no llegué tan lejos.

**Giovanni Gonzalez:** y una con el con la parte de que cómo

**Esteban Cortes Sandoval:** Dale.

**Giovanni Gonzalez:** configura cada institución su estado. Dice que antes se podía configurar los nombres de los estados o cómo dice sí


### 00:40:22


**Esteban Cortes Sandoval:** En el legacy tú.

**Giovanni Gonzalez:** es el de la izquierda, el de abajo. dice, "Hoy los estados de estatus base son iguales para todos y que antes se

**Esteban Cortes Sandoval:** Mm.

**Giovanni Gonzalez:** permitía configurar por cada institución." Eso, eso es eh lo que es lo que está en esta presentación, o sea, cada estado podía tener un nombre distinto.

**Esteban Cortes Sandoval:** Sí. Ajá.

**Giovanni Gonzalez:** No.

**Esteban Cortes Sandoval:** Sí. O sea, yo no revisé esta parte de acá abajo, así que no estaba, no he mirado esto, ¿cierto? Eh, porque dice que son iguales para todos. A mi entender, hicimos una, hicimos es mucho, el equipo core hizo una implementación y que se deberían poder cambiar por institución los estados, eh, así que esto tengo que revisarlo en detalle para ver si es o no es así. Si si efectivamente esta capacidad se retiró y son van a ser para todos igual, ahí en realidad es donde parte de lo que tenemos que cambiar en el core es eso porque no pueden ser para todos igual. Ya en el legacy permitíamos, cierto, definir workflow distintos por institución.


### 00:41:27


**Esteban Cortes Sandoval:** Acá también tiene que ser lo mismo porque porque los flujos de trabajo van a ser distintos entre cada institución, nunca van a ser los mismos. Así que tengo que revisar ese punto. Dale.

**Giovanni Gonzalez:** Tengo otra otra duda que es el paso de los estados, eh, un un estado puede estar cerrado y el y la institución pedir como un ajuste y ellos mismos cambiar el estado a otro para realizar el ajuste o siempre es eh

**Esteban Cortes Sandoval:** Tú decí como Ah, ya. tú decir como si estoy en vigente, como ya lo publiqué y lo vuelvo a llevar como a edición como para pasearme las reglas,

**Giovanni Gonzalez:** Sí,

**Esteban Cortes Sandoval:** una cosa así, ¿no?

**Giovanni Gonzalez:** sí.

**Esteban Cortes Sandoval:** Eh, parte de lo que tendríamos que definir acá como qué pasa en esos escenarios, porque claro, cuando uno dice, "La institución define un workflow efectivamente podría ser que se dé eso que decís tú, como ya llegué hasta el final, pero después me puedo devolver como los workflow que hacemos en Gira para los tickets, ¿cierto?" Y ahí estaríamos como dando la capacidad de que by pase las reglas


### 00:42:34


**Esteban Cortes Sandoval:** que explícitas que dejamos, ¿cierto? Porque pasaríamos de algo vigente a que ya no está vigente,

**Giovanni Gonzalez:** Yes.

**Esteban Cortes Sandoval:** que sería como estos estados de acá, ¿cierto? Si ya el plan de estudio pasó a estar vigente, no deberíamos poder dejarlo sin vigencia, digamos. Y por lo tanto aquí hay como una regla implícita. Si yo ya puse como el estado enforce de decretado, creo que eso implicaría que en el diseño del workflow no deberíamos permitir que este estado vuelva como a uno eh previo eh como de edición. Eh, como que uno debería permitir esos como ciclos de retornar entre estos estados de este tipo, pero no podría como retornar desde un estado ya publicado de rol publicado hacia uno de edición, porque si no se podría dar lo que decís tú, yo y por lo tanto eso que comentáis, claro, es relevante para como el mantenedor donde se hagan los flujos deberíamos tener esas reglas de para impedir eso, ¿cierto? que también es fácil de justificar, creo, como habría que decir como no se puede permitir volver de un estado tanto porque este estado va a declarar vigencia, eventualmente vigencia del cl estudio por ejemplo y no se puede volver de un estado vigente como a uno sin vigencia como algo así.


### 00:43:54


**Giovanni Gonzalez:** Lo comento porque igual legacy ha pasado como que publican algo y después necesitan ajuste a eso y vuelven a un estado anterior.

**Esteban Cortes Sandoval:** Claro. Eh, ajá. Por eso ahí como que tenemos que poner como la línea de lo que podemos hacer, como que eh uno igual podría decir quizás si pueden volver un estado anterior, pero tendríamos que ver qué otras reglas tendríamos que aplicar para eso, cachá. Eh, o si necesitamos, no sé, un rol y una capability que sea capaz de bypasear eso. Como tenemos que tener algún control, ahí tenemos que decir cuál es la mejor forma de hacerlo. una forma podría ser como, mira, no se puede a un usuario tenga un rol ta ta ta y ese usuario se puede bypasear y puede moverse, no sé, al otro estado distinto. E otra forma que se me ocurre hacerlo. Quizás puede haber un estado que permita adicción en vigencia, pero si permitiéramos eso tendría que ser como controlado sobre qué cosas se pueden cambiar en ese estado.


### 00:45:06


**Esteban Cortes Sandoval:** era un poco lo que conversábamos acá, eh, cuando decía un bral común, ¿cierto? Tocar el perfil de egreso siempre es reforma, crédito, duración y obligatorias casi siempre. O sea, podrían haber algunos cambios que aún publicados se puedan hacer cambios, pero sobre ciertos campos y ese tipo de control todavía no lo tenemos, ¿cierto? ¿Cómo cómo habilito edición de un formulario acá? No, pero edición de un formulario sin que sin que signifique editar como todo el plan de estudio, sino que eh editar solamente algunas partes.

**Giovanni Gonzalez:** Si llega al estado cerrado, eh, solamente la única opción que queda es sería clonar, ¿o no?

**Esteban Cortes Sandoval:** Claro. Eh, claro, es que ahí de nuevo, si es que ellos ya quieren hacer un cambio grande, implica que tienen que hacer una versión nueva, ¿cachá?

**Giovanni Gonzalez:** M.

**Esteban Cortes Sandoval:** Entonces ahí tú creas una nueva versión del plan, creas una nueva versión del programa asignatura, porque clonar es clonar es como crear un nuevo curso que es distinto, ¿cachá? Clonar es crear una entidad nueva, version crear una nueva versión de la misma entidad.


### 00:46:14


**Esteban Cortes Sandoval:** Esa es como la diferencia. Eh, pero si tú en realidad estás haciendo un cambio al programa asignatura, cachá, eh, y es un cambio grande que va a empezar a afectar de aquí en adelante, entonces ahí tendré que decir, no te permito hacer el cambio, pero puedes versionar y en esa versión nueva va a partir en el inicio del flujo. Mira, tenemos mejoras. Cambiar institución. ¿Qué pasó acá? Por ejemplo, en las matrices de competencia sí tenemos un ciertos campos que no están gobernados, no deberían estar gobernados por esos datos, que son los campos de adopción. Aquí yo puedo, ¿cierto? La matriz ya está publicada, pero la los datos de adopción cuando la vamos a implementar en un plan, yo lo puedo seguir haciendo de forma operativa, ¿cierto? ¿no? Entonces es un dato dentro del de la matriz. En realidad es un objeto distinto, así que probablemente está relacionado a la matriz, pero un objeto distinto, ¿cierto?, que es la vigencia.


### 00:47:25


**Esteban Cortes Sandoval:** Claro. Yo las otras cosas no las puedo cambiar, no las voy a poder cambiar, ¿cierto? En en ciertos estados, pero la opción sí, la opción sí la voy a poder como modificar. Entonces, eh eso vuelvo vuelvo a donde estamos acá. Ya. Entonces, íbamos en el eje de vigencia, decíamos, este es el validity status, que sería lo que tendrían como los objetos. eh se deriva de fecha de vigencia y de los dependientes activos que ya existen en el modelo. Se refiere a que se se derivan de varias reglas que vamos a Entonces están los estados de sin vigencia eh programado, publicado con inicio a futuro o con una autorización externa pendiente. Está casi a entrar vigente, por así decirlo. Vigente hoy, ¿cierto? Tiene un valid prom, ¿cierto? recibe ingresos de estudiantes, extinción, es decir, un facing out, que es como un plano, un programa que ya no recibe como nuevos estudiantes. En realidad el plan el programa es que recibe estudiante y cerrado.


### 00:48:44


**Esteban Cortes Sandoval:** Ya. Este tipo de estos estados de validity status también nos permiten controlar reglas como por ejemplo si un programa de asignatura, una versión de un programa de asignatura ya está en extinción o está cerrado, no deberíamos permitirlo como para asociar una esa asignatura o esa versión de esa asignatura a una malla curricular, eh porque no es la versión como vigente de esa asignatura, pero las que existan en vigente enforce, cierto, son las que yo podría utilizar en la etapa de diseño. Entonces, ahí nos permite como ir cerrando bien esos gaps de qué es lo que yo te muestro y qué cosas no te muestro porque ya no están como comillas activas, vigentes. Eh, ¿por qué los roles y los estados de vigencia no son lo mismo? ¿Cierto? El rol clasifica un estado de workflow, dice qué decidió la institución y la vigencia es el resultado del cálculo. Dice si el documento opera hoy. Entonces, un mismo rol puede dar dos vigencias distintas según la fecha o los dependientes, sin que nadie mueva el WF.


### 00:49:51


**Esteban Cortes Sandoval:** Rol de estado, outing review approve. Eh, vigencia posible sin vigencia. Entonces, esto nos pueden dar sin vigencia. Eh, rol de estado enforce nos puede dar dos tipos de dos vigencias posibles, programado o vigente. Lo que depende esto desde cuando yo le pongo ya una fecha que se hace efectiva, entonces eso me dice que el plan de estudio, por ejemplo, pasa a estar vigente. Ese es un un detalle. Es decir, como yo ya tengo el plan de estudio listo y va a estar vigente desde el próximo lunes, entonces de aquí al próximo lunes todavía no tiene estado vigente, tiene estado programado. Eh, pero cuando el próximo lunes ya es válido, el estado cambia y se actualiza como a vigente. Sería como la porque podrían haber darse ese escenario y retire, cierto, rol de estado en extinción o cerrado, también va a depender de ciertas reglas de en cuál de los dos se encuentra. eh documento plan estudi program de competencia dependiente activos que lo mantienen en extinción.


### 00:51:01


**Esteban Cortes Sandoval:** Eh, entonces estos son como los objetos o reglas que nos permiten como revisar dónde se encuentra respecto a esto en extinción o error. Plan de estudio, plan enrollment, este es como en la inscripción de estudiantes con status active y ese currículum, ¿cierto? Implica que está en extinción, no está cerrado hasta que no hasta que deje de tener estudiantes en estos registros. programa de asignatura offering de periodos abiertos con esa activity ID, planes vigentes o en extinción que lo usan, ¿cierto? Si yo tengo planes que ocupan ese programa de asignatura, entonces está activo. Eh, si tengo secciones, esos son los offed, está activo. Matriz de competencia. Si yo tengo matrices adoptadas, abiertas, ¿cierto? Eh, va a seguir estando activo, eh, o se va a mantener en extinción, ¿cierto? ¿Qué significa calculado? ¿Quién calcula y cuándo? ¿Cierto? Nadie la escribe a mano, ni un usuario ni el mod. Una sola función del core la deduce de hechos que ya están registrados.


### 00:52:07


**Esteban Cortes Sandoval:** Esto se refiere a el validity status. Entonces, el validity status no es un estado donde vamos a poner un un en el formulario un campo para que el usuario vaya y le cambie el estado, como hoy día tenemos el estado de borrador, ¿cierto? sino que el varidity status se desencadena, se calcula o lo calculamos con una función en base a estas redes. E a eso nos referimos con que es calculado, ya que hay como algunos ejemplos. Eh, uso uno de esto, proteger cálculo en vivo en cada escritura. La ejecuta el guard de edición, ¿cierto? Uso dos, mostrar. No voy a entrar tanto en detalle de eso, igual después cuando vayamos a implementar quiero que lo que lo revisen. Aquí están como algunas reglas más específicas, ¿cierto? Porque esto esta función debería operar en distintos instancias, en distintas acciones del sistema. Eh, entonces, ¿cuándo lo voy a mostrar o cuándo lo voy a en proteger y se lo ejecuta el W devión con la hora actual sobre el documento del dueño del hijo que se edita?


### 00:53:13


**Esteban Cortes Sandoval:** La proyección nunca depende de un valor guardado. Claro, se refiere a eso. Entonces, yo voy a editar, voy a tener que calcular para ver si el valid y estatus sigue siendo el mismo. Em, habrá algo más que valga la pena verir acá en detalle, ¿eh? Eh, vías para cambiar algo vigente, reglas de edición y protección de versiones. Ya, estas son como reglas más específicas. Esto yo también tengo que revisar. Lo lo generé, pero no alcanzé a terminar. de revisar toda esta parte, así que no voy a pasar acá tampoco en en mostrarlas ahora en esta sesión. Eh, acciones que gobiernan la regla, acciones que gobiernan la regla y caso de ejemplo, ingeniería civil industrial de 2020 a 2023, una unidad deficticia, tenemos este plan 2020 y su reforma que sería la versión 2 del plan 2027 y Ana dice una estudiantes de la corte 2021. Ya. Entonces, aquí tenemos como un cómo se vería en el tiempo su gestión en en USA sea, ¿cierto?


### 00:54:44


**Esteban Cortes Sandoval:** El 2020 se publica, ¿cierto? Ingresada en el 2021. Eh, el plan uno. Entonces, aquí está vigente, está recibiendo ingresos. Ya. En C dice a publicar el plan. ¿Cierto que pasó en A? Borrador, revisión aprobado con la capabilidad actual, ¿cierto? Se registra el acto, un una acción en el sistema, se le pone la fecha de validez, se pone en vigencia, ya poner en vigencia, corre los gates de hoy, tributación al 100% de lo que se está diciendo que está corriendo overlast reglas que hoy día estaríamos valiando. En el punto B se matricula eh un estudiante, se asigna la versión abierta de ingreso en esa fecha que sería la B1. En el punto C hay una corrección. Se corrige la herrata del nombre en el lugar. Queda registro con el antes y el después. Intenta corregir total create en servidor lo rechaza esa estructura. Hoy tenemos libre. La regla sería que eh hay que hacer una corrección, declarar que hay que hacer una corrección más un comentario, pero no se puede hacer como esa corrección.


### 00:55:56


**Esteban Cortes Sandoval:** Este caso tengo que detallarlo un poquito más. En D dice hay un ajuste cálculo dos pasa al semestre T y se quita un prerequisito. Lo aprueba el editor director de escuela aplica Ana en lo que aún no cursó. Hoy rechazado. Después tenemos change request, ajuste sobre la B1. Entonces, aquí hay una gestión de como lo que decíamos, podríamos hacer ciertos cambios bajo un flujo específico. Y luego tenemos en el e una reforma eh B2. Aquí tenemos ya el 2025 como un traf de la nueva versión. Acá ya está programado. Eh, nueva versión con más in secciones. Se carga la tabla equivalencia, se publica ahora sigue en B1 o migra. Podría ser que se cambie de plan de estudio. Y entonces ahí pasa a estar vigente y este pasa a estar en extinción. Esta es la versión vigente, este pas extinción. Ya no tiene ingresos, pero tiene estudiantes activos. Yeah.


### 00:56:58


**Esteban Cortes Sandoval:** El 2032 la B1 cierra. Es el punto E todavía. Eh, a publicar. Claro, no no dice nada, pero el punto es cierto. ¿Y qué nos falta acá? ¿Cuáles son los puntos G? Si la del periodo, eso no está marcado acá. Hay un error, pero ese es más o menos como el flujo. Bueno, ahí está la corte. Corte 2027 entra acá. Entonces, es como un ejercicio de de cómo sería el escenario. Aquí tengo que especificar un poco más respecto como las ediciones que vamos a permitir y e eso es más o menos como la propuesta alto nivel. Hay cosas más que pueden revisar, pero de nuevo opiniones, ¿me hace sentido, no hace sentido. Oi.

**Eduardo Bacon:** A mí me parece interesante que sea calculado. Creo que eso no lo teníamos antes.

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** Creo que es una buena una buena mejora. Sí, marcaría un punto ahí que no está relacionado al a lo presentado directamente,


### 00:59:04


**Esteban Cortes Sandoval:** Sí.

**Eduardo Bacon:** sino que a la limitación de uP1hoy en día con las columnas computadas como este, que sería un cálculo para mostrar cuál sería el estado. No sé si eso se ha abordado.

**Esteban Cortes Sandoval:** Ya. Sí, sí, porque aquí yo le estoy preguntando igual a Claudito la propuesta porque creo que el calculado, o sea, igual yo entiendo que lo guardamos en el validity status, pero o sea, que está guardado, existe guardado. El calculado se refiere a que no es el usuario el que el que guarda esa información, sino que es una función que la siempre la va validando distintas acciones la desencadenan para validarlo con esa función y eso actualiza, ¿cachá?

**Eduardo Bacon:** Claro.

**Esteban Cortes Sandoval:** Pero en teoría el campo igual está en el objeto. objeto igual tiene el campo con el estado vigente, ¿cachá? Eh, el punto es que el usuario nunca tiene la capacidad de decir, "Ah, ahora lo voy a cambiar a en extinción", sino que son otras acciones que hace que desencadenan que ese cambia ese estado, ¿cachá?


### 01:00:17


**Esteban Cortes Sandoval:** En ese sentido es como calculada y lo comento porque claro, tú decí como el tema de las columnas calculadas, no es que sea una columna que no tiene valor, es una columna que tiene valor, pero su valor no la calcula, nunca lo asocia el usuario de manera directa, sino que es una consecuencia, una función que siempre se está aplicando para validar si sigue estando o no en ese estado.

**Eduardo Bacon:** Claro, sí entiendo eh que va ahí y por eso mismo, porque en otros casos eh no me acuerdo en cuál

**Esteban Cortes Sandoval:** Mhm.

**Eduardo Bacon:** fue eh que estábamos implementando y en el record list Había una columna que se calculaba sobre otras columnas o sobre otros datos y no era que no se podía hacer, eh, sino que yo voy al punto de no se puede mostrar. No hay forma hoy en día que uP1le muestre al usuario eh ese estado en eh en una tabla.

**Esteban Cortes Sandoval:** No se muere, pero de nuevo ahí yo entiendo que estáis hablando de columnas que en su definición de la columna alumna tienen una función, ¿cierto?


### 01:01:30


**Esteban Cortes Sandoval:** Que depende ya que esto no es lo mismo,

**Eduardo Bacon:** Claro. Ah, ya.

**Esteban Cortes Sandoval:** porque cuando yo hablo de la función no me refiero a una función de ese sentido,

**Eduardo Bacon:** Ah.

**Esteban Cortes Sandoval:** me refiero como una función del back, cachá. La columna en sí va a tener guardado el campo, el resultado,

**Eduardo Bacon:** Hm.

**Esteban Cortes Sandoval:** el valor inforce, eh, pero va a haber una función backend que deberíamos convocar en distintos escenarios, ¿cachá? cuando cambia esto, cuando cambia esto otro, cuando intentó hacer esto, que va a validar, ¿cierto? Y va a ir actualizando ese estado de acuerdo a lo que es correcto. ¿Cachá?

**Eduardo Bacon:** Ah, y tendramos una suerte de triggers que se encargarían de detectar cuando algo cambia y actualizarlo.

**Esteban Cortes Sandoval:** Claro, eso es lo que tenemos que definir ahí, como en qué flujos desencadenan una actualización de esa columna. CL porque yo, por ejemplo, yo aquí le pregunté alcanto.

**Eduardo Bacon:** Ahí sería como n hecho

**Esteban Cortes Sandoval:** Es podría ser, sí, o sea, podría ser que lo tengamos que poner en otros lados, pero hay que entrar a mirar como tengo que entrar a mirar la propuesta un poco más detalle para ver cuáles son las acciones que desencaden efectivamente el calculado guardado no se contradice.


### 01:02:52


**Esteban Cortes Sandoval:** Valid estatus es la copia guardada del resultado del cálculo. Entonces, ¿cómo convive? Nadie lo escribe a mano. Los usuarios no cambian modos transiciones ni carga masiva.

**Eduardo Bacon:** Gracias.

**Esteban Cortes Sandoval:** Solo se actualiza la función del core cuando ocurre uno de los disparadores. Estar los disparadores, publicar, cerrar ingreso, cambio de dependientes. Por dependientes nos referíamos como a otros objetos que cambian y que desencadenan eso. Una tarea diaria como un triger, por ejemplo, eh no tiene transiciones ni clases de campo. Entonces, exactamente, hay disparadores y esos disparadores son los que controlan, pero la columna sí tiene valor. Tiene el valor de lo que resultó del de la ejecución del disparador, ¿cachá? Eh, así que eso ya. Entonces, claro, a eso me refiero con que no esa capacidad del cor no es un bloqueante ahí en realidad porque la columna en sí va a tener un valor explícito cargado. Básicamente va a ser una columna tipo tri, eh, pero el valor que va tomando lo va calculando como ese eh esa función en base a estos como desencadenadores.


### 01:04:30


**Esteban Cortes Sandoval:** Ya. Y la matriz que tenemos acá, acciones genéricas por estado de vigencia. editar un campo. Eh, según clase. ¿A qué nos referimos? Según clase, según clase del campo. Eh, según clase del campo. A ver. Acá dice dos niveles. Las acciones genéticas las aplica el core a cualquier documento gobernado. Las acciones específicas son de cada módulo y se declaran como una acción genérica más una clase de cambio o una condición. base do permiso capability J tool de NCP. Entonces acción estos son los estados de vigencia. Sin vigencia yo puedo editar sin restricción. cerrado, no puedo editar, pero estos tres de acá, programado, vigente en extinción los tiene clasificados como segas. Ah, vía seis. ¿Dónde est vía seis? Reglas de bloqueo, tres vías para cambiar algo vigente. Ya, esto es referente a lo que preguntaba justo comenta Giovanni.Cada campo declara una clase de cambio.


### 01:06:28


**Esteban Cortes Sandoval:** Change class. Sería un campo nuevo. La institución puede reclasificar dentro de un raco. Corrección. Change class correct. ¿Cuánto? Rata o error material como en el lugar capability. Y cómo en el lugar capability correcto obligatorio. Versión misma versión y misma vigencia ingeniería industria civil industrial se corrige currículum name. Ningún estudiante se ve afectado. Ah, ya. Esto es justo lo que veníamos conversando. Entonces acá estaríamos diciendo que contrando con el change class e por nos referimos a no sé si este campo va por objeto, ¿no? Cada campo, no sé si con campo nos estamos refiriendo a cada campo de cada objeto. Eso es mi pareciera ser que sí. Ah, sí, me está respondiendo acá. Sí, de cada objeto gobernado el documento y sus hijos, pero no hay que declararlos todos. Cada objeto trae una clase por defecto estructural, fail, close y solo se declaran las decepciones.


### 01:08:01


**Esteban Cortes Sandoval:** Campos técnicos quedan fuera porque ya son solo de lectura. Ah. Ah. Entonces sí, cada campo de cada objeto que le arregla al gobierno, tanto el documento, plan, programa matriz como de sus hijos, entradas de la malla, requisitos, tribulación, etcétera, pero no hay que declararlos uno por uno. Clase por defecto, el objeto, ¿cierto? Tiene una clase por defecto y campos técnicos fuera solo se declaran las excepciones más permisivas. ¿Ya? Entonces, esto sería algo así. Digamos que el plan de estudio es estructural, entonces en teoría, a plan de estudio no le puedo hacer cambios, pero yo podría definir que algunos campos en particulares tengan excepciones y esos campos sí les puedo hacer cambios. Eh, esta sería la capa entonces que controla lo que había comentado, que estamos comentando con Giovanni.Es decir, yo ya tengo algo vigente, pero tengo cambios que hacerle como esto de acá, ¿cierto? un campo que yo puedo cambiarle el nombre sin tener un impacto a la carrera o tras de estudio sin tener un impacto en los estudiantes.


### 01:09:13


**Esteban Cortes Sandoval:** Entonces puedo hacer ese campo ahí podría entonces categor este campo estaría categorizado como correcto eh ajuste cambio menor según la institución como change request con aprobación liviana y foto del antes. versión, misma versión aplica cortes vigentes, mover y quitar un prerequisito con resolución de dirección. Entonces, este pareciera ser un ajuste que requiere un poco más de eh aprobaciones. Aquí hay un change request como una acción de solicitud de cambio con una aprobación. También es sobre la misma versión, pero no es tan directa como esta. Acá como que puedo llegar y corregir. Acá necesito un poco más de proceso y acá es donde no puedo hacerlo. O sea, acá si quiero hacer un cambio tengo que hacer una nueva versión. Me gusta esta lógica. No sé qué opinan ustedes. Los objetos tienen un estado general, pueden tener excepciones y dependiendo de las excepciones, algunos podrían modificarse sobre la misma versión o si no se modifican en la versión siguiente. ¿Qué opinan?


### 01:10:40


**Esteban Cortes Sandoval:** ¿Qué opinan?

**Giovanni Gonzalez:** funcionaría en cualquier estado, ¿o no?

**Esteban Cortes Sandoval:** funcionaría en cualquier estado. Ya si lo vemos en el flujo completo, estamos diciendo que los objetos tendrían estas estas categorías, esta categorización del tipo de objeto y por objeto campo, digamos, con excepciones. Y luego tenemos los estados. Los estados de vigencia irían en correlación con las reglas de edición, digamos. Voy a estar en el plan de estudio, ¿cierto? y voy a cambiar, voy a querer, voy a intentar hacer una acción de edición en el plan de estudio. Vamos por un ejemplo real. Entonces, estoy acá, voy a estar en un plan de estudio y voy a intentar editar. Entonces, primero que todo, ese plan de estudio ya debería tener un estado de vigencia y por tanto en el workflow va a tener un estado que va a estar relacionado a que ya está vigente, ¿eh? Y yo voy a intentar editarlo, ¿cierto? Y en teoría voy a poder como entrar a editar, pero no debería poder editar todo, ¿cierto?


### 01:12:15


**Esteban Cortes Sandoval:** Ese es el punto. Eh, tu pregunta va como para allá.

**Giovanni Gonzalez:** Eh,

**Esteban Cortes Sandoval:** Giovanni.

**Giovanni Gonzalez:** sí, sí, sí. O sea, eh a pesar de que haga cualquier cambio, esta clase que me dice que solamente puedo ajustar algunos, em no me queda muy claro lo de, por ejemplo, supongamos que la las ahí dice el total period o total credit está en rojo,

**Esteban Cortes Sandoval:** Aha.

**Giovanni Gonzalez:** no se puede editar.

**Esteban Cortes Sandoval:** Aha.

**Giovanni Gonzalez:** E si yo voy a ver. No, no, no, no. El currículum N. currículo que está en verde. Por ejemplo,

**Esteban Cortes Sandoval:** Ajá.

**Giovanni Gonzalez:** si voy y el estado del del plan es cerrado, se puede seguir editando. Igual

**Esteban Cortes Sandoval:** Si está cerrado. Cerrado. Veámoslo.

**Giovanni Gonzalez:** que sería como la última versión, o sea,

**Esteban Cortes Sandoval:** Veámoslo aquí.

**Giovanni Gonzalez:** la última.

**Esteban Cortes Sandoval:** Ajá. Aquí se puede ver más claro ahora que ya entendimos a qué nos referimos con las clases.


### 01:13:20


**Esteban Cortes Sandoval:** Entonces, yo voy a editar un campo y está en cerrado. Cerrado. La idea es que este estado controla ya cerrado, no tiene ninguna edición, ¿cachá? Lo único que me permite el cerrado es clonar. Independente que cerrado, yo lo puedo tomar como base para otra acción. Caches el cerrado no me permite nada. El sin vigencia en teoría me permite como todo, está casi todo en verdecito. Hay algunos que tienen especificaciones. Estas son acciones que yo puedo hacer si te doy cuenta. Editar un campo, agregar, reordenar,

**Giovanni Gonzalez:** La parte que estábamos viendo es la que dice corregir.

**Esteban Cortes Sandoval:** cambiar. Eh,

**Giovanni Gonzalez:** Abajo.

**Esteban Cortes Sandoval:** acá. Claro.

**Giovanni Gonzalez:** Esa.

**Esteban Cortes Sandoval:** Ajá. Entonces, cachá, yo voy a hacer una corrección de un campo en particular. Entonces yo voy a tener que, si está en alguno de estos estados, voy a tener que entrar a mirar el las clases para hacerlo vía corrección.


### 01:14:17


**Giovanni Gonzalez:** Ahí entendí.

**Esteban Cortes Sandoval:** Eh, entonces más o menos es son hartas son tres capas distintas que luego se unifican como para el flujo. El estado ya va a tener un nivel de control, pero hay ciertos estados que van a permitir edición y eso cierra la duda que teníamos al inicio. ¿Qué pasa, cierto, con ediciones que son menores? Algunas van a ir por nuevas versiones, van a estar cerradas, no te va a permitir hacerlo y te va a decir, "No, esto tenéis que sí o sí hacer una una versión nueva." Y otras sí van a tener flujos que permitan la edición sobre la misma versión porque no terminan impactando eh como de forma directa de estudiantes el cambiar hacer ese cambio. Y ese control vendría un poco como en base a estas eh eh vías, ¿cierto? estos eh clases de cambio que podríamos permitir. Acá están efectivamente las reglas de y protección de versiones. La vigencia dice cuándo algo está protegido. El método dice cómo el código lo hace cumplir igual en todos los objetos y en todos los caminos que tu hoy esa proyección está repartida en W de cada mod con criterios distintos.


### 01:15:31


**Esteban Cortes Sandoval:** Acá tenemos un solo punto de control, caminos de escritura, guarda edición del core, resuelve el documento del propio registro de dueño, lee su valid status, lee el change class, que era lo que estábamos viendo, ¿cierto? Entonces, ve el estatus, ve el cambio, mira por qué canal llega directo, corrección, ajuste, nueva versión y aplica la tabla de decisión para ver si es que puede permitir. Resultado permitido y auditado. Exige corrección, exige ajuste, exige nueva versión, solo lectura. puro escenario de lo que podría como eh terminar ocurriendo. Y aquí está como la tabla de decisión eh para decidir si permite o no permite cambio. Se declara el Jason del objeto object. Esta es la propuesta validity from dependent via status edit policy default change class estructural. Entonces el plan de estudio es estructural. Hijos objeto plan entry. Requer properties. Ya. Ahí está. Lo que falta en este ejemplo es cómo sería una excepción, porque yo entiendo que aquí deberíamos tener la política general y excepciones cuando un campo en particular sí permite como la edición.


### 01:17:01


**Esteban Cortes Sandoval:** Así que aquí le voy a preguntar cómo se vería ese escenario. Eh, ¿cómo lo ve el usuario? el mismo 4 nueva versión, pero poner ajuste nueva versión. Ya se dan cuenta aquí está como poniendo como un un formulario y es como decir algunos campos me permiten editar. Este me podría decir como corregir, pero estos campos de acá no, porque requieren una nueva versión. Entonces, quizás lo que necesitemos es algún como eh campo visual para que dependiendo del estado y las reglas que se cumplan, algunos en los formularios como que eh esté bloqueado el campo y tenga como esa esa alerta. Por ejemplo, esto decir que si aquí ya está todo publicado, eh, y los créditos no los puedo cambiar, esto tendría que estar bloqueado y quizás con un icono de que si lo quiero cambiar realmente tengo que hacer una versión nueva, pero el nombre no, el nombre sí lo hubiese podido como editar de todas formas, eh, y algunos de ellos no los voy a poder editar de manera directa, sino que voy a tener que levantar como un un propuesta de ajuste, es decir, como ah, ya yo quiero cambiar este esta asignatura en el en el momento en la malla que se que se que se aplica.


### 01:18:34


**Esteban Cortes Sandoval:** Eh, y y ahí tengo que entrar al detalle de esto porque no sé cuál sería el flujo del proponer ajuste. No sé si tendría que tener su propio workflow, porque me hace sentido que sí, pero como que debería haber una funcionalidad específica como para esos como ajustes que son controlados con la capacidad del ajustable. Ya 5 minutos. ¿Le freí el cerebro o se entendió la idea general de lo que querríamos hacer?

**Giovanni Gonzalez:** Las dos.

**Esteban Cortes Sandoval:** Las dos. Okay.

**Alexander Reisenegger:** Sí, se entendió

**Giovanni Gonzalez:** Me costó entender.

**Esteban Cortes Sandoval:** No es una lógica simple, yo lo sé. Eh, pero el diseño curricular me he dado cuenta que no es simple. Eh, necesitamos tener buenas lógicas de control. Sí. El punto es como trazabilidad,

**Giovanni Gonzalez:** Está completo.

**Esteban Cortes Sandoval:** control. Eso es lo que estamos buscando. Ahora que se lo intenté explicar, también me di cuenta como que cosas no son tan directas. Voy a hacerle algunos ajustes al documento porque cuando alguien lo quise lo quisiera leer, creo que esas preguntas de como y qué pasa si es que si quiero editar y ya está publicado, no fue tan directo como entenderlo hasta que llegamos a esa sección.


### 01:20:00


**Esteban Cortes Sandoval:** Entonces quiero al inicio como explicar más alto nivel desde ese punto de vista funcional cómo sería el flujo y luego llegar como a la parte más detallada. Eh, ahora igual acá se ve que bueno, no sé, no no me da la impresión de que igual son hartos cambios también a nivel como del hor presumo al querer poner como estas restricciones por campos, ¿cierto? Eh, de edición o no. E así que igual puede haber ahí un impacto que bueno, eventualmente les voy a pedir que puedan revisar como desde el punto de vista técnico la propuesta, pero me interesaba igual como partir ya como viendo la parte funcional de que ya comentarios finales. Yo no tengo, no sé si alguno de ustedes tienen un comentario, si no los próximos horas, algunas horas de almuerzo.

**Eduardo Bacon:** Yo solo que creo que es algo grande, considerando que, por ejemplo, en el mismo comentario que decías, el tema los adjustable puede crecer y por su propio flujo es harto, pero está interesante que bueno, dentro de lo que alcance a entender porque igual estoy uniendo las partes.


### 01:21:50


**Esteban Cortes Sandoval:** Mhm. M. Sí, denle una mirada. Denle una mirada. Vamos a tener una segunda sesión de esto. Eh, ahí vamos a repasar. Yo le voy a dar reiteración. Eh, pero eso sí, yo creo que creo que los cambios tenemos que verlos bien porque tendrían que ser de una forma en que sean fácil extendes. Supongo que son con capacidad core, ¿cierto? Que después lo podamos ir haciendo aplicando en todo lo que tenemos. Básicamente esa es como la idea, ¿eh? Pero ya eso si no hay más comentarios, dudas, lo dejamos hasta aquí hoy en día.

**Eduardo Bacon:** Lo último, esa funcionalidad de poder mostrar un flag de estado en los inputs, que era si tien que proponer o no,

**Esteban Cortes Sandoval:** Mm.

**Eduardo Bacon:** eso creo que sería bueno conversarlo con Klaus para ver si eso se va a acorde una o es algo que solamente vamos a implementar nosotros para ver si también eso lo soportaría el modporque

**Esteban Cortes Sandoval:** Sí, sí,


### 01:22:50


**Eduardo Bacon:** sería alterar un componente que viene desde corría que hacerle como un fork

**Esteban Cortes Sandoval:** sí, sí, sí. Aquí por eso quiero como ahora que ya revisé con ustedes como reiterar este artefu. Luego yo creo que vamos a tener una siguiente sesión como o con esa interación quizás se las pase y les pida como que analicen en base a sus agentes también quizás porque esto me está sugiriendo qué cosas debería ahí acor y qué cosas no en base a lo que ve del código igual me gustaría como que el análisis de ustedes y con eso ya más o menos armado ahí me gustaría que se lo presentáramos a a Klaus como mira esto es lo que necesitamos implementar y esta es la sugerencia de donde creemos que cordinas tú E porque claro, yo no sé si el tema de de como esto que estamos mostrando acá, lo que decí tú, Edu, no sé qué tanto aplique para otros módulos, ¿cierto? Eh, nosotros somos creo que los únicos que tenemos como esta trazabilidad tan específica de las versiones y de que hay cosas que no se pueden editar en la versión actual, se tienen que editar en una versión siguiente como del objeto, por así decirlo, de distancia. Eso no se ve en otro sistema, entonces quizás eso no no si vaya a ir o no al cor de manera directa. Así que eh eso, pero sí, mi idea es primero tener la idea. Este es un tema funcional, pero bastante técnico también. Entonces quiero que esté bien madura la idea para presentarla eh al ya a Claus y empecemos implementar. Ya, gente, eso. Buenas tardes. Hablamos.

**Eduardo Bacon:** Oh.

**Esteban Cortes Sandoval:** Chaito.

**Francisco Navarro:** Co?

**Eduardo Bacon:** Sí.

**Giovanni Gonzalez:** không.
