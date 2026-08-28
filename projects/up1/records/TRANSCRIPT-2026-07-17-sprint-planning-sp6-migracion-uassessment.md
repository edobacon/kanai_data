---
id: TRANSCRIPT-2026-07-17-sprint-planning-sp6-migracion-uassessment
project: up1
type: transcript
module: curriculum-design
tags:
  - curriculum-design
  - sprint-planning
  - sp6
  - versionamiento
  - plan-de-estudio
  - requerimiento-curso
  - esquemas-de-niveles
  - matrices-de-competencia
  - competencias
  - soft-delete
  - cascada
  - rutas-de-aprendizaje
  - learning-objects
  - sit
  - bibliografia
  - pdf
---

# Reunion 2026-07-17 - Sprint Planning SP6 (migracion uAssessment)

> Transcripcion generada por Gemini Notes a partir del audio. Puede contener
> errores de speech-to-text (nombres como "Gemin/Gémin/Geminite", "softite",
> "Hardet/Hit", "SIT/set de datos", "mar de competencia" por "matriz de
> competencia", "bip coding" por "vibe coding"). El verbatim por timestamp
> (## Transcripcion verbatim) se conserva integro como fuente de verdad para
> las decisiones que lo referencien. Para preservar el PDF original de Gemini,
> subir a `2026-07-17-sprint-planning-sp6-migracion-uassessment.attachments/`
> y declarar en `attachments` del frontmatter.

## Contexto

Sprint planning informal (pre-planning) del equipo de migracion uAssessment para
definir el alcance de SP6. Participan Esteban (modelador, define el alcance),
Eduardo Bacon (dev), Juan Diego Galdames (plataforma UP1) y Francisco Navarro
"Pancho" (dev). Camila Hernandez y Sandra Vargas figuran como invitadas pero no
intervienen; hay una consulta pendiente a Sandra sobre el uso real de la
personalizacion de matrices por parte de los clientes.

Este transcript es el **primer paso de especificacion de SP6**: fija que se va a
implementar antes de bajar a historias/tickets. Esteban prioriza cerrar lo que
quedo pendiente de SP5 (requerimiento de curso) y arrancar el modelado del mod
de curricular mapping (esquemas de niveles + matrices de competencia), posterga
la tributacion, y suma como side quest el analisis de los mods de rutas de
aprendizaje / learning objects que viene explorando el equipo de innovacion (JP).

## Notas Gemini - Resumen

Revision de planificacion para el sprint con priorizacion de esquemas de
competencias y modelos educativos tecnicos.

**Priorizacion y alcance tecnico**: el sprint prioriza el requerimiento de cursos
y el versionamiento de planes de estudio sobre la funcionalidad de tributacion.
Se acordo mantener un enfoque estandarizado en las matrices de competencia para
facilitar analisis institucionales.

**Implementacion de datos**: la implementacion de la eliminacion suave (soft
delete) de registros requiere precaucion ante la falta de logica de eliminacion
en cascada automatica. El equipo valido el uso de metadatos para la gestion de
registros inactivos.

**Evaluacion de aprendizaje autonomo**: se integrara el analisis de modulos de
rutas de aprendizaje y vectores de datos de sistemas externos. La arquitectura
debe mantener la flexibilidad sin sacrificar el contexto curricular estandarizado.

## Notas Gemini - Proximos pasos

- [The group] Finalizar requerimiento: completar el requerimiento de curso
  pendiente del presente sprint.
- [The group] Extender versionamiento: aplicar la logica de versionamiento de
  planes de estudio basada en la malla completa.
- [Esteban Cortes Sandoval] Refinar componentes: finalizar la definicion de los
  objetos y modelos para esquemas de niveles y matrices de competencia (de aqui
  al lunes/martes).
- [Esteban Cortes Sandoval] Actualizar datos: integrar la informacion de silabus
  y planes de estudio en el set de datos (SIT).
- [The group] Analizar modulos: revisar tecnicamente los desarrollos de JP sobre
  rutas de aprendizaje y objetos de aprendizaje.
- [The group] Ajustar bibliografia: convertir la seccion de bibliografia en un
  boton funcional en el mantenedor de programas de asignatura.

## Notas Gemini - Detalles (extracto)

- **Temas pendientes y planificacion del sprint** (00:00:00, 00:05:25): se
  prioriza el requerimiento de cursos y el versionamiento de planes de estudio
  vinculado a la malla completa. La tributacion se posterga porque se perdio la
  maqueta original y hay que priorizar primero la definicion de esquemas de
  niveles y matrices de competencia. Francisco confirma que no tiene errores de
  soporte pendientes ni mejoras prioritarias, validando el alcance actual.
- **Implementacion de soft delete** (00:06:55, 00:08:17, 00:14:50, 00:23:52):
  Juan Diego explica que el soft delete se implementa nativamente configurando
  metadatos en los objetos, permitiendo inactivar registros en lugar de
  eliminarlos. Se debate la integridad de datos y la necesidad de una logica de
  cascada. Juan Diego aclara (confirmado con Nico) que **NO existe una logica de
  cascada automatica en el soft delete**, factor a considerar antes de aplicarlo
  masivamente.
- **Definicion de esquemas de niveles** (00:19:30, 00:21:32, 00:31:13): Esteban
  plantea modelar esquemas de niveles y niveles de desempeno para la medicion de
  competencias, usando los componentes existentes de Record List. Propone definir
  estos objetos antes del lunes para asegurar que el modelo maneje tanto la
  configuracion general como los niveles de desarrollo detallados.
- **Estructura y personalizacion de matrices de competencia** (00:25:49,
  00:28:05): matrices con estructura de nodos padre-hijo. Francisco cuestiona la
  utilidad de permitir personalizar rangos por competencia (podria ser
  innecesariamente complejo). Esteban coincide en evitar la personalizacion
  excesiva para mantener el analisis transversal a nivel institucional; decide
  mantener enfoque estandarizado y verificar el punto con Sandra.
- **Analisis de modulos de rutas de aprendizaje** (00:33:46, 00:36:53, 00:39:56):
  Esteban introduce los mods de "objetos de aprendizaje" (learning objects) y
  "rutas de aprendizaje" (pathways) desarrollados por innovacion y desarrollo (JP).
  Objetivo tecnico: extraer informacion de los LMS, vectorizarla y generar rutas
  de aprendizaje autonomas para estudiantes que no alcanzan ciertos resultados de
  aprendizaje. El equipo dedicara tiempo del sprint a analizar estos modulos, su
  arquitectura, los servicios usados y su compatibilidad con la plataforma actual.
- **Consideraciones sobre flexibilidad y estandares** (00:44:30, 00:45:49): se
  debate como las estructuras curriculares de distintas universidades y la
  disponibilidad de recursos educativos impactan la viabilidad de las rutas de
  aprendizaje automatizadas. Esteban enfatiza mantener un contexto claro del curso
  para que las propuestas sean validas para docentes y academicos.
- **Alcance del sprint y tareas administrativas** (00:17:55, 00:31:13, 00:47:19):
  el alcance de SP6 abarca requerimiento de cursos, versionamiento de planes de
  estudio, esquemas de niveles, matrices de competencia y la configuracion de
  datos SIT. Adicionalmente, convertir la seccion de bibliografia del programa de
  asignatura en un boton funcional.

## Transcripcion verbatim

### 00:00:00 - Apertura: temas pendientes del sprint

**Esteban Cortes Sandoval**: ...entonces el proximo sprint, las cosas que tenemos
pendientes de este sprint seria lo del requerimiento de curso, cierto.

**Eduardo Bacon**: Lo que quedo de este. Exacto.

**Esteban Cortes Sandoval**: Algun otro tema que veis que haya quedado a tomar ahora?

**Eduardo Bacon**: Eh, lo que no hemos revisado era que venia de antes el tema de
versiones de estudio, si mal no me acuerdo, por el tema de versionar con todo,
ahora que estan mas completos que los versionamientos.

**Esteban Cortes Sandoval**: Ah, con la malla y todo.

### 00:01:16 - Versionamiento de plan de estudio depende de la malla

**Eduardo Bacon**: Lo habiamos dejado hasta que tuvieramos la malla. La malla ya
esta en si, solo falta cablearla, conectarla a lo que seria que falta de
prerrequisitos.

**Esteban Cortes Sandoval**: Si, si. En teoria igual la malla. Bueno, despues
cuando tengamos el tema de la tributacion, ahi tambien el versionado se va a ver
impactado del plan de estudio, porque tambien vamos a tener que replicar o no las
tributaciones. Estoy pensando si tomar el pero igual podriamos tomar en una primera
version igual el versionamiento en plan de estudio. Algun otro edu que te suene?

**Eduardo Bacon**: No, que me acuerde. Tenia ese en mente, pero no me acuerdo de otro.

**Esteban Cortes Sandoval**: Ya. Yo por mi lado ya estariamos como en condiciones
de empezar a migrar. Si bien podemos seguir explorando en detalle lo que ya
tenemos. Como tenemos un MVP, creo que es mejor empezar a mirar temas de
competencias, que serian el mod de curricular mapping.

### 00:02:46 - Se perdio la maqueta de tributacion

**Esteban Cortes Sandoval**: Eh, hoy dia si me di cuenta de algo triste y es que
perdi la maqueta, como que el link ya no existe. Creo que puede que lo haya
borrado porque esta en mi cuenta personal de la maqueta de tributacion que en
algun momento hice, le tenia carino, pero voy a tener que hacerla de nuevo. El
componente de tributacion de competencia igual tengo la idea, asi que creo que
deberia poder replicarla, pero ahora con Claudito, no con Gemini.

**Eduardo Bacon**: Claro. Y ese no lo compartiste en algun momento?

**Esteban Cortes Sandoval**: Llegue al link como te lo compartí a ti, pero el link
ya no existe. Estuve limpiando el Gemini, mi cuenta personal, y puede ser que haya
eliminado ese vinculo en ese proceso. Entonces no existe la maqueta propiamente
tal, porque en ese entonces yo no las generaba como HTML, entonces no las
descargaba como las tengo ahora.

### 00:03:54 - Tributacion se rehace y se posterga

**Esteban Cortes Sandoval**: Entonces estaban en la construccion que hacia Canvas
de Gemini... y por lo tanto no lo tengo en local, basicamente. Asi que tengo que
hacer ese componente de tributacion de nuevo. Pero antes de llegar a tributacion
igual tenemos que hacer la definicion de las matrices de competencia y los
esquemas de niveles. Entonces yo estaba pensando que podemos partir con eso el
proximo sprint. Esquema de niveles, matrices de competencia, tengo que refinar
esto y lo tenemos que ver el lunes. Mi idea es hacerlo ahora saliendo de esta
sesion, no hacer esta sesion tan larga, sino mirar a alto nivel aca que tenemos y
refinar los objetos, porque en primera instancia esos dos componentes creo que
deberiamos usar el record list. No se si a nivel de esquema de niveles en el
detalle necesitemos algun componente especifico. En teoria creo que no, tendria
que verlo. Se puede hacer con lo que se tiene, creo. Hay que ver si es que
necesitamos algo adicional. Pero entonces esto seria como la definicion de
esquemas de niveles, que es como se van a medir las competencias, y luego la
definicion de las matrices de competencia y las competencias.

### 00:05:25 - Secuencia: matriz + competencias antes de tributacion; consulta a Pancho

**Esteban Cortes Sandoval**: Entonces, definir una matriz, definir las
competencias, el arbol de competencia y hasta ahi como que eso es hasta antes de
empezar a la accion de tributacion, que yo creo que esa accion de tributacion no
la estariamos abordando en el proximo sprint pensando en que yo, la primera semana
la segunda semana yo no estoy, la primera semana como poder rehacer ese componente
para pensar en implementarlo en el sprint siguiente, ya empezar a hacer la accion
de tributacion propiamente. Eh, hola Pancho. Aprovecho de preguntarte lo que
pregunta Edu. No se si de lo que tu estuviste trabajando ves algo que haya quedado
pendiente que tengamos que repriorizar para el siguiente sprint. Edu me decia,
tenemos lo del requerimiento de curso y tenemos algo anterior que es como el
versionamiento del plan de estudio, que tenemos que hacerlo con la logica de la
malla completa.

**Francisco Navarro**: De mi lado no quedo nada pendiente. Ese bug que levante
ticket de soporte lo deje en el dephel. Eh, eso bueno y la mejora esa que pero no
es prioritaria, la mejora que habia mencionado esa de los mensajes de error
personalizados, como para ver si lo podemos implementar. Eso.

**Esteban Cortes Sandoval**: Ya.

### 00:06:55 - Soft delete: como se implementa (Juan Diego)

**Esteban Cortes Sandoval**: Okay. Entonces, tenemos plan de estudio, tenemos
programa de asignatura, plan de estudio. Ah, me quedo una duda, no se quiza Juand
nos puede resolver el tema del soft delete que comento Nico, al final lo
implementaron core o no. Eso es lo que me quedo la duda.

**Juan Diego Galdames**: Si, lo implemento, fue una mejora, una que le nacio a el
mismo. Como le explicaba ahi, basicamente dentro del campo de metadata de cada
objeto uno puede agregar para que ese objeto de forma nativa tenga soft delete.
Entonces no hay que ir uno a uno ni que tampoco se aplique a todos los objetos de
una que tengan la logica de soft delete, sino que solamente los que en metadata
tengan ese valor se va a aplicar ese soft delete, lo que va a implicar que los
layouts que operen bajo esa logica van a tener que tener dentro de la config por
defecto el filtro que muestren solo los que estan activos para que funcione.
Funciona bien.

**Esteban Cortes Sandoval**: Ya podriamos implementar al tiro entonces que sea el
soft delete, pero yo estaba pensando si deberiamos hacer un reemplazo o dejar ambas.

### 00:08:17 - Duda de Eduardo: cascada en hijos polimorficos

**Eduardo Bacon**: Yo voy a poner un poco de duda ahi. Creo que falto preguntar mas
o averiguar bien ahi. No se que tanto contexto tiene Juandy. Estuve trabajando en
el hardlit (hard delete) de este sprint y era harto. Entonces, saber si mas que
dudas saber si esta considerado, por ejemplo, los hijos polimorficos, los que son
las secciones, como desactiva cuando hay dependencia, que pasa en esos casos? Hay
como altos cruces de datos.

**Juan Diego Galdames**: Ahi si, ahi me tinca la voy a buscar. Creo que Nico me
mando un... o Claus me mando un doc con la logica del soft delete, pero me tinca
que no estan considerados en la logica el tema del parentesco. O sea, si yo
desactivo, que es lo que deberia ocurrir, que en el fondo si yo desactivo un padre,
que los hijos tambien queden desactivados, sacas este efecto de cascada como el que
hiciste tu en el hard delete. Lo voy a buscar.

**Francisco Navarro**: Si, el hard entiendo que elimina todas las relaciones para
que no quede sucia la base de datos.

**Esteban Cortes Sandoval**: Mancho.

### 00:09:31 - Diferencia soft vs hard delete y consistencia

**Francisco Navarro**: Cierto?

**Eduardo Bacon**: Vale.

**Francisco Navarro**: Pero no es que necesariamente necesitemos eliminarlo, si,
como para entender el efecto del soft, queria como por la base de inactivar el
objeto padre que tiene los el resto y no se podria ver, pero que harian las
relaciones hechas, como entiendo que iria por ese camino el tema de...

**Esteban Cortes Sandoval**: Claro. El punto es, bueno, la diferenciacion es que
hoy dia en la SU (Suite) no tenemos hard delete, cierto. Tenemos software (soft)
solamente. Aca partio UP1 teniendo como base delete, eh, que es el hard delete,
eliminacion del dato de la base de datos y ahora se extendio a tener el softite
(soft), que es como lo que ya tenemos previamente de la SUP (Suite). Entonces, y
creo que lo que comenta Edu, cierto, respecto a al desencadenar la accion, ya sea
el soft delete o el hard delete, que sea consistente con todas las relaciones
polimorfidas que tenga el objeto desde donde yo empece como la eliminacion. Y hasta
ahi, digamos, respecto a si deberiamos tener uno o el otro.

**Francisco Navarro**: Ok.

**Esteban Cortes Sandoval**: Ya es como una logica de negocio que tenemos y de ahi
como mi punto de que lo conversemos.

### 00:10:48 - Semantica del soft delete para el usuario

**Esteban Cortes Sandoval**: Eh, hoy dia en la practica como que tenemos soft
delete. Para el usuario creo que no es tan claro que es un soft delete. Yo creo que
creen que es una eliminacion, pero mas en un discurso de alto nivel, nosotros
decimos que no eliminamos la informacion de los usuarios, simplemente la
inactivamos. Entonces ahi no se bien cual era como tu duda, Pancho. Quizas le
respondi, quizas no.

**Francisco Navarro**: Es que cuando... al final lo que deberia hacer, o yo creo
que deberia ser el soft delete es como inactivar al padre y que ya como el padre
esta inactivo no podia acceder a esos datos porque la entidad esta inactiva y de
ahi va en cascada hacia abajo, ya, las relaciones, pero como el padre esta inactivo
no podia acceder a ella.

**Juan Diego Galdames**: Claro.

**Francisco Navarro**: Hard delete en cambio es distinto porque el hard delete si
cuando tu eliminas te deja data sucia, basicamente. Entonces, de limpiarla o no
limpiarla, en efecto es mas que nada para tener la base de datos... me entienden,
que quede la data bien, no sea, no este ordenada.

### 00:12:00 - Esteban: soft delete debe ser consistente en toda la cadena

**Esteban Cortes Sandoval**: Si, pero yo, o sea, entiendo tu punto, pero no estoy
de acuerdo con que esa sea la interpretacion, cacha. Porque entiendo el punto como
de que claro, yo tengo lo voy a hacer con el ejemplo como mas directo para nosotros
que es el programa de curso. Nosotros tenemos el objeto activity, cierto, tenemos
el curso y ese objeto activity tiene una relacion con los objetos de curricular
section, que son como todos los datos mas especificos del programa de curso.
Entonces, si yo elimino el curso, la duda o lo que habria que resolver es decir,
cuando yo elimino el curso al cual le pertenecen todas esas secciones, tengo que
eliminar todas esas secciones o tengo que dejarlas como guachas inconsistentes en
ese sentido? Y ahi es donde yo creo que independientemente de que sea un hard
delete, toda la data relacionada a ese curso deberia tener el mismo tratamiento. Es
decir, si yo inactivo el curso, la instancia del objeto activity, tambien estaria
esperando inactivar la instancia de todos los curricular section que se relacionan
a ese curso. Entonces, todo es un soft delete respecto a toda la cadena de datos.
Eh, que es distinto a decir, si yo realmente quiero eliminar ese dato de la base de
datos, el hard del curso, implicaria tambien eliminar todos los datos que estan
relacionados a ese programa de asignatura.

### 00:13:29 - Postura de consistencia; se pregunta a Nico

**Esteban Cortes Sandoval**: Eh, entonces como yo lo veo, yo creo que lo correcto
seria que se interpreta el soft delete o hard delete, pero no simplemente respecto
al origen de donde se hace la accion de los objetos de origen, sino que es accion
para todo lo que esta relacionado. O sea, o inactivamos en todo o eliminamos en
todo, pero yo no creo que sea correcto inactivar en uno y dejarlo el otro activo
para que despues los servicios sepan que no tienen que mostrar parte de la
informacion porque el origen esta inactivo, porque creo que tambien eso confunde a
futuro como identificar la informacion, por que esta activa. Creo que eso podria
traer mas problemas a futuro, pero no se como se esta pensando en la UP1. Yo
pensaba que se estaba pensando como lo exprese yo, que uno si hace un soft delete es
hacia toda la cadena de datos y si hace un hard tambien, pero ahi abro la discusion.

**Juan Diego Galdames**: Si, ahi le pregunte a Nico, que fue el que lo hizo, para
que me mandara bien la informacion, pero respecto a lo otro que mencionaba Pancho
de como dejar, si uno elimina el padre y que queden como estos huerfanos, uno puede
configurar dentro de cada objeto de UP1 el tema de la cascada, por ejemplo, no se,
si yo elimino un rol dentro de UP1, una instancia de rol...

### 00:14:50 - Cascada configurable por objeto (en hard delete)

**Juan Diego Galdames**: ...automaticamente se eliminan todas las instancias de la
base de datos de asignaciones que existen hacia ese rol. Entonces ahi cuando ya yo
me meto despues como un usuario a ver los roles que tiene, esa asignacion del rol
que ya elimine tambien se elimina. Entonces tambien se queda no quedaba como esa
basura dentro de la base de datos, como sin padres.

**Esteban Cortes Sandoval**: Pero entonces lo que yo entiendo es la cascada...

**Juan Diego Galdames**: Eso.

**Esteban Cortes Sandoval**: ...ya sea del soft o hard delete, es configurable por
objeto.

**Juan Diego Galdames**: Del soft delete, no estoy... no lo voy a confirmar, pero se
que en el hard delete si la cascada es configurable.

**Esteban Cortes Sandoval**: Ya. Okay. O sea, yo podria borrar el padre sin que
pase nada en los hijos, o podria borrar el padre con que los hijos tambien tengan
la misma accion, o sea, se terminen eliminando.

**Juan Diego Galdames**: Claro. Yeah.

**Esteban Cortes Sandoval**: Aja. Ahi entro en la duda, pero puede ser que es
porque no recuerdo mas de lo que tu mostraste, Edu, con las alertas que estaban,
eran en base a esa configuracion o eran distintas.

### 00:16:09 - Duda de Eduardo: cascada en hijos con Record Types

**Eduardo Bacon**: En base a eso.

**Esteban Cortes Sandoval**: Ya. Okay.

**Eduardo Bacon**: Eso es que va revisando la cascada.

**Esteban Cortes Sandoval**: Entonces, yo creia que ahora a nivel de consistencia el
soft deberia idealmente hacer lo mismo. Tu duda, Edu, era, me refiero a que poder
activar o desactivar que se haga la cascada. Pero tu duda, Edu, era respecto a si
eso estaba completamente implementado por Nico.

**Eduardo Bacon**: Claro, yo preguntaria especifico en el punto, por ejemplo, en los
hijos con Record Types, porque ahi se abre otra otra linea y ya antes entonces
habia abordado, principalmente los hijos directos. Confirmaria eso como primera
instancia, como para saber entonces si es abordable de aplicar y no nos vamos a
topar con que falte eso y entonces claro...

**Esteban Cortes Sandoval**: Y hay que extenderlo y es otro alcance distinto.

**Eduardo Bacon**: Claro.

**Esteban Cortes Sandoval**: Entiendo. Ya. Okay. Entonces, pensando en que fuesemos
los tres sin ofender, Juan, tu en tus cosas para el sprint. Yo decia, tenemos el de
requerimientos de curso, esta pendiente, cierto.

**Eduardo Bacon**: Yes.

**Esteban Cortes Sandoval**: Eh, tendriamos que ver el versionamiento de planes de
estudio, la extension del versionamiento, y podria tomar de lo nuevo la definicion
de los esquemas de niveles, que tendria que ser como el objeto cargarlo, los objetos
relacionados y como el mantenedor, por asi decirlo, y las matrices de competencia
con el o los objetos, pero ahi tengo que darle un poco de refinamiento como de aqui
al lunes, profe.

### 00:17:55 - El SIT como objetivo (set de datos realista tipo cliente)

**Esteban Cortes Sandoval**: Igual...

**Eduardo Bacon**: Ahi me acorde, no que estais dando vueltas, que se sumo este
stream, pero asi es el tema de el SIT ya mas realista tipo cliente que me lo habias
pasado y no alcances ni a revisar este sprint.

**Esteban Cortes Sandoval**: Ah, ya. El SIT... ya, ese lo podemos dejar como
objetivo, set de datos. Sumando ahora en realidad ahora con lo que liberen puedo
actualizarlo con datos de los silabus, de los silabus, de los sillabus y un poquito
mas de plan de estudio. Eh, si, si, si. Y ahi ya tenia como completo eso. Eso yo
veria para alcance del proximo spring, pero todavia me cuesta mas. Yo creo que ahi
la complejidad podria depender de que tantas personalizaciones tuviesemos que hacer
en estos dos modulos nuevos del esquema de niveles y matrices de competencia o no.

**Eduardo Bacon**: En el sentido de los componentes.

**Esteban Cortes Sandoval**: De los componentes. Entonces estoy pensando porque no
los he tenido que revisar los objetos. Entonces, no se si con la estructura estandar
de un record list y un record type, o sea, un record list y la vista detalle del
record list es suficiente como para llenar toda la informacion del esquema de
niveles y de la matriz de competencia, porque en realidad podriamos como revisar los
componentes actuales.

### 00:19:30 - Que son los esquemas de niveles

**Esteban Cortes Sandoval**: Ahora que se me despego el PC hoy dia. Vamos a ver otra
vista. Aca lo que querriamos implementar pensando, empezando a migrar lo de
curricular mapping son el esquema de niveles, niveles de desarrollo y competencia.
Entonces, que son los esquemas de niveles? Es como la escala que uno define de como
se van a medir las competencias. Hoy en dia tienen el esquema, tiene un codigo, un
nombre, una descripcion. Eh, luego se agregan los niveles de desempeno, digamos como
avanzado, intermedio, no logrado. Eh, y luego definimos los niveles de desarrollo en
base a si se va a medir un rango de notas o un puntaje. Y si es que se van a tener
multiples niveles de desarrollo. No se si yo digo que voy a tener multiples niveles
de desarrollo.

**Eduardo Bacon**: Ok.

**Esteban Cortes Sandoval**: Tengo el nivel... tengo pesimos nombres aqui, pero la
idea de esto es yo tengo una competencia.

**Eduardo Bacon**: M.

**Esteban Cortes Sandoval**: Esa competencia la puedo desarrollar en distintos
niveles y en cada uno de esos niveles se me van a medir en esos niveles de
desarrollo se van a medir en distintos niveles de desempeno. Entonces yo podria
desarrollar la competencia en su nivel uno, el nivel uno mejor y ese nivel uno lo
puedo terminar completando, alcanzando a desarrollar un nivel no logrado, intermedio
o avanzado.

### 00:21:32 - Mapeo del esquema de niveles a objetos UP1 (record list)

**Esteban Cortes Sandoval**: En realidad, esto mas que no logra veria ser como
inicial. Y por lo tanto esto tiene todo, bueno, esto es un rango de notas de cero a
3, de 3.1 a 5, de 5 punto a 7 y apruebo con esto. Digamos que esto va a estar
cuatro, eh. Y asi es como hoy dia funciona. Pero esto realmente al mapearlo a UP1
tendriamos un objeto que exprese como el esquema y el esquema tiene niveles de
desarrollo y esos niveles de desarrollo, el esquema tiene como configuracion general
niveles de desempeno y tiene un conjunto de niveles de desarrollo con informacion
mas detallada. Entonces, este mantenedor todavia no visualizo como deberiamos
construirlo, si deberia o no ser como algo adoc. No, me gustaria que fuese algo
realmente, pero tiene una interfaz particular, digamos. A ustedes se les ocurre como
podria ser el mapeo mas directo a los componentes de UP1.

**Eduardo Bacon**: M.

**Esteban Cortes Sandoval**: Es que seria aqui nuestro record list. Aca tenemos
record list de record list. Ya tenemos esquemas. Yo puedo tener multiples esquemas
dentro de la institucion. Eso esta bien, eh.

### 00:23:52 - Confirmacion: NO hay cascada en soft delete (Nico via Juan Diego)

**Esteban Cortes Sandoval**: Eh, y cada esquema tiene datos generales, estos de aca
y niveles de desarrollo, un unico multiple. No se como la generalizacion de esto,
algo mas general tengo por aca. Dale, Juan.

**Juan Diego Galdames**: Eh, o sea, sorry que estaba hablando con Nico, me comenta
que efectivamente no esta la logica del cascada en soft delete, no esta. O sea, si
yo le aplico soft delete a un objeto...

**Esteban Cortes Sandoval**: Es solo el...

**Juan Diego Galdames**: ...no es solo ese objeto.

**Esteban Cortes Sandoval**: Objeto.

**Juan Diego Galdames**: Entonces los otros siguen quedando como activos. Yeah.

**Esteban Cortes Sandoval**: Ya. Okay. Entonces lo tenemos ahi en consideracion
porque no se si vayamos a implementar el soft delete considerando eso. No es
necesario realmente todavia, pero la idea era... mi idea era configurarlo mas que
desarrollarlo. Eh, ya y ese era uno. El otro componente es matrices de competencia.
En matrices de competencia, yo estaba pensando en un objeto con recordes, como para
que el objeto de competency pueda ser o la matriz o los hijos, que vendrian siendo
las competencias propiamente tal. Eh, y esto seria como un record list de matrices
de competencia.

### 00:25:49 - Detalle de la matriz de competencia (padre-hijo)

**Esteban Cortes Sandoval**: El detalle de la matriz de competencia en el record
list tendria como de la matriz tendria ciertos datos de descripcion, codigo, codigo,
codigo, nombre, asociacion a ciertas escuelas...

**Eduardo Bacon**: Si.

**Esteban Cortes Sandoval**: ...y tendria otro record list de como sus competencias.
La idea es que las competencias o los nodos, los recordes de competencias sean como
con logica padre e hijo. Eh, esto aqui esta mostrando la relacion con el esquema de
niveles, que es lo otro que estaba mostrando recien. Eh, pero a nivel de las
competencias, en realidad la competencia es como un formulario, solamente tiene como
el nombre, la descripcion, eh, y la relacion con el esquema de niveles de como se
mide. Basicamente, quizas ahi necesitemos un componente mas adoc como para mostrar
este esquema de niveles de medicion. Pero la creacion en este caso no seria, no se
como tendriamos que hacerla aca.

**Eduardo Bacon**: (asiente)

**Esteban Cortes Sandoval**: Esta informacion es un formulario del record, pero esta
relacion de los esquemas de nivel este el mejor componente. Vale.

**Francisco Navarro**: Lo que nunca entendi esa vista es por que si tenia una matriz
con los rangos.

**Esteban Cortes Sandoval**: Mancho.

**Francisco Navarro**: En teoria puedes cambiarle a cada competencia unitariamente
el rango, como que nunca lo entendi.

### 00:28:05 - Personalizacion de rangos por competencia: se descarta

**Esteban Cortes Sandoval**: Eh, claro, si teneis un sistema estandarizado, por que
estais permitiendo la modificacion de cada matriz.

**Francisco Navarro**: Siendo que podrias construir una especificamente como para tu
bloque y ocupar esas matriz para el chat.

**Esteban Cortes Sandoval**: No entendi ese ultimo.

**Francisco Navarro**: Es que puedes construir otros umbrales que son aplicados como
para tus casos especificos que tiene. Estos otros umbrales podria ocupar matriz en
vez de estar uno por uno definiendo.

**Esteban Cortes Sandoval**: Cambiandom. Si, si. Yo creo que tambien como que me
causa como ruido porque es como en esta idea de permitir ese nivel de
personalizacion, en la practica no se cuantos clientes realmente lo utilizan, que es
como sobrescribir la estructura general por una estructura mas especifica en ciertas
competencias, ciertos contextos, pero a la vez como que tenemos que pensar en un
sistema de datos que nos vaya a permitir medir de manera global cuando uno mira toda
la institucion. Si yo tengo 10 esquemas de niveles distintos, todas las facultades
miden en distintos niveles las competencias, no se puede hacer un analisis
transversal a nivel institucional porque no son comparables entre si los esquemas,
eh? O habria que hacerlos comparables de alguna forma, lo que lo hace mas complejo.

### 00:29:38 - Niveles de desarrollo importan; personalizacion de rango aporta poco

**Esteban Cortes Sandoval**: Entonces, como que la definicion de los niveles de
desarrollo de las competencias es importante en ese contexto. Pero claro, el nivel
de personalizacion, esta parte es como importante como el descriptor. Yeah, de
desempeno. Es importante porque yo digo como, que es lo que yo estoy esperando que
el estudiante cumpla cuando estoy midiendo esta competencia en este nivel de
desarrollo, aqui? Esta informacion es importante y es dependiente del contexto de la
competencia con ese nivel que estoy esperando observar. Ahi yo digo, esto es lo que
estoy esperando observar. Pero claro, cambiar como estas escalas de decir que en
particular para esta competencia la nota maxima no va a ser un 2,9, va a ser un
tres. Eh, como que eso tampoco le encuentro mucho valor en la flexibilizacion.

**Eduardo Bacon**: Listo.

**Esteban Cortes Sandoval**: Pero de nuevo no conozco los detalles de los clientes
actuales a ese punto como para saber cuantos usan esa variacion. Voy a aprovechar de
preguntarle a Sandra, pero no se.

**Eduardo Bacon**: Si.

**Esteban Cortes Sandoval**: Tambien ahi quizas haya una opcion de simplificacion,
quizas los casos raros habria que tratarlos de otra forma y no en todo estar
mostrando esto, no lo se. La complejidad de estos componentes creo que va como por
eso, eh, pero no se cual seria un flujo mas natural.

### 00:31:13 - Plan del sprint: partir con lo conocido, iterar componentes

**Esteban Cortes Sandoval**: Yo creo competencias, asocio el nivel, escribo los
descriptores. Que podria ser? A ver. Ya, yo creo que vamos a ir por esto, pero tengo
de aqui al lunes como para resolver como lo podemos modelar con los componentes. En
primera instancia, en el sprint estariamos partiendo con lo que ya sabemos, que
seria como los requerimientos del curso y el versionamiento de plan de estudio. Y lo
siguiente seria como esquemas de nivel y matriz de competencia, pero eso lo podemos
iterar los primeros dias en el componente para empezar a implementarlo. Creeria que
el lunes deberia tener definidos los objetos. Al menos los record list van a ir si o
si, pero el detalle es donde vamos a tener que ver como definirlo. La otra tarea que
yo creo que vamos a tener que hacer durante el sprint es empezar a analizar la
informacion de los mods que comente que he estado trabajando, como no mods
propiamente tal, el flujo de cierta funcionalidad que estuvo trabajando el equipo de
innovacion y desarrollo, y JP ha estado como acelerando eso en su vibe coding local
del componente, estos modulos nuevos y ya nos dio acceso a esa informacion, pero hay
que empezar a mirarla, analizarla para despues poder ir llevandola de vuelta al
sistema.

### 00:33:46 - Analisis de mods de JP (rutas de aprendizaje / learning objects)

**Esteban Cortes Sandoval**: Entonces, yo creo que en el sprint estariamos tomando
los temas que mencione, dependiendo, cierto, de en cuanto se traduzca eso en carga,
eh, podriamos dedicar un par de horas al analisis de la informacion que JP nos ha
estado compartiendo. Todavia no la he mirado, tampoco la conozco a alto nivel, pero
a nivel de mods, digamos, de lo que implemento por detras, hay que abstraerlo y ver
como todas las cosas que funcionan o no funcionan o que hay que interiorizar en la
arquitectura como para ir planificando futuros sprint. Tambien creo que hay que
dejar un poco de tiempo para poder ir revisando eso. Respecto a esos mods que estoy
comentando, a alguien le debo haber comentado algo, pero no se cuanto contexto
tienen como para aprovechar de explicarles como son. Cero contexto. 100% de
contexto. En que escala estan?

**Eduardo Bacon**: Ay, que cosa? Sorry, sorry. Esta lo de JP.

**Esteban Cortes Sandoval**: Estos mods que ha estado haciendo JP. Aja.

**Eduardo Bacon**: Eh, yo nada recuerdo haber visto, no se si el stream pasado o
antepasado algun screenshot que habras compartido de lo que estaba haciendo...

### 00:35:29 - Concepto: rutas de aprendizaje y nivelacion autonoma

**Esteban Cortes Sandoval**: Mm.

**Eduardo Bacon**: ...pero nada mas que eso.

**Esteban Cortes Sandoval**: Ya. Cero tambien. Eh, ya aprovecho darles como el
contexto para saber con que nos vamos a encontrar cuando empecemos a analizar esos
archivos que nos ha estado compartiendo. Eh, tengo algo que mostrar de eso? Mostrar
de eso. Eh, creo que no. Voy a dejar esto de fondo no mas como cuando hacemos
streaming, pero creo que no tengo nada que comentar. Estos mods que se han estado
explorando tienen que ver con el concepto de rutas de aprendizaje. Basicamente guiar
al estudiante a que cosas tiene que reforzar como para cumplir o alcanzar niveles que
no ha podido alcanzar de forma autonoma o con las clases. Ya. Entonces pensemos, y
esto va a ir muy relacionado a las competencias, a los resultados de aprendizaje. Un
estudiante tenia que desarrollar la capacidad A y no logro desarrollarla. Entonces,
la expectativa es decir como, "Okay, estudiante, dado que no lograste desarrollar
esta capacidad, tu deberias ver este video, hacer esta prueba, leer esta guia y con
eso vas a lograr nivelar ese conocimiento que no alcanzaste a adquirir." Y cual es el
camino como para llegar a esa...

### 00:36:53 - Los dos mods: learning objects (catalogo) y pathways (rutas)

**Esteban Cortes Sandoval**: ...a ese resultado? Hoy dia lo han estado
conceptualizando en dos como mods adicionales. Uno es el mod de objetos de
aprendizaje, learning objects, que su objetivo seria generar como un catalogo
digital de todos los recursos de aprendizaje que una institucion tiene. Empecemos en
el LMS donde los docentes suben guias para los cursos, suben videos y cualquier
material que podria subir. Esos serian como los recursos del curso, pero esos
recursos como para poder utilizar algoritmos de comparacion de texto, identificar
que si uno quiere desarrollar tal competencia o tal capacidad, eh, necesitas hacer
tales acciones, tienen que estar como... tenemos que tener como una base de datos de
esa informacion. Tenemos que poder mapearlos, entenderlos, darle como una metadata,
eh, quizas transformarlos de medio, de un video a un texto, de un texto a un audio,
por ejemplo, para poder despues utilizarlos como input. Entonces, hay tambien algunos
ranking que ocupan asignatura eh, no? Programas que son de tipo online, eh, como
ranking de los cursos, indicadores de los cursos para ver que tan buena es... son los
recursos de aprendizaje que tienen. Eh, y para todo eso es necesario obtener como
este mapeo. Y que implica esto por detras?

### 00:38:25 - Implicancia tecnica: conectar LMS, extraer, vectorizar

**Esteban Cortes Sandoval**: Implica que hay que conectarse a LMS, hay que extraer
esa informacion, hay que aplicar algoritmica como para poder generar esta metadata.
Eh...

**Eduardo Bacon**: Ok.

**Esteban Cortes Sandoval**: ...y entregar finalmente como un basicamente un record
list con todos los objetos de aprendizaje que tiene una institucion, ya? Eh, y ese
es el paso previo al segundo mod, que serian las pathways, las rutas de aprendizaje.
Y ahi la idea es como les comentaba, o sea, poder buscar en el contexto de un curso
como generar de manera autonoma ciertas rutas de aprendizaje. Decir como el primer
paso es leer tal documento...

**Eduardo Bacon**: Yeah.

**Esteban Cortes Sandoval**: ...el segundo paso es leer este otro, es hacer este
test, es ver este video y eso como que hay que ir bien mapeado toda esa metadata
para poder hacer esa sugerencia. O eso es como el tener rutas de aprendizajes...

### 00:39:56 - Algoritmica (no necesariamente agentes); archivos de JP en la carpeta

**Esteban Cortes Sandoval**: ...prediseñadas y otras es como generar una ruta de
aprendizaje dado que un estudiante sabemos que no cumplio A, B o C. Eh, y eso cae
tambien muy fuerte sobre tener primero ese mapeo de recursos para despues poder
aplicar como esta capa mas de inteligencia. Eh, y como todo esto por detras ocupa
algoritmica no necesariamente de agentes, ya porque hay aqui algoritmos ya como
predefinidos para hacer este tipo de comparaciones.

**Esteban Cortes Sandoval**: Eh, igual son como propuestas que un usuario funcional
tiene que confirmar, tiene que poder ver esta ruta, tiene que poder cambiarle pasos
de orden, no se, en vez hay que ver este video en vez de otro video o esta esto
habria que verlo antes que esto otro. Entonces es como una propuesta que despues
igual tiene que tener edicion, entonces igual necesita como vistas para poder
funcionalmente poder hacer ese trabajo. En eso van esos dos mods. Eh, como comento,
JP gran parte de esto en base a un trabajo que hizo el equipo de innovacion y
desarrollo como haciendo pruebas de concepto de estos flujos de extraer los recursos,
generar las rutas. Hay algoritmica como desarrollada con Python por detras que se
esta utilizando y eso como que esta llevado a mods, igual con flujos que yo he visto
que son mas personalizados, no tan como usando todos los componentes generales que
tiene UP1. Entonces tenemos los archivos especificos que JP ha usado en local, que
obviamente ya tienen que haber cambiado desde la ultima vez que me compartio la
semana pasada, eh, que eso esta, a ver, por aqui esta aca en nuestra carpeta, cierto,
de migracion. Subi esto, eh, y este como si tiene como todo lo general que ha hecho
en mods de JP en el contexto de Assessment, pero tambien el contexto de otra app,
creo, y tambien no se si algo en engagement, entonces parte de lo que hay que hacer
en el sprint es analizar eso.

### 00:41:46 - Conciliar hipotesis; generalizar y pasar a los agentes

**Esteban Cortes Sandoval**: Digamos, hay que hacer una conciliacion. Hay un monton
de cosas, eh, yo creo que hipotesis que estan por detras que hay que generalizar. Yo
se que lo ven como probablemente es como algo simple, pero en realidad el norte es el
correcto. Yo creo que efectivamente esto es un diferenciador que va orientado al paso
siguiente de cuando yo ya mido las competencias y por lo tanto lo que tenemos que
hacer nosotros igual sigue el mismo camino, tenemos que tenerlos de competencia,
tenemos que tener la reporteria que nos diga esto se esta desarrollando, esto no se
esta desarrollando. Pero cuando ya llegamos a ese punto, tenemos que tienen que haber
acciones sobre como se puede ir mejorando eso que no se esta desarrollando a nivel
del estudiante. Y hacia ahi es hacia donde va orientado estos mods particulares que
han estado trabajandose, investigandose en paralelo. Entonces, eso hay que empezar a
mirar, hay que empezar a pasarle a nuestros agentes, entender en que esta haciendo en
particular. De lo que me va a importar que ustedes miren tambien es como en lo
tecnico, como que que cosas eh que tipos de servicios estan utilizando que escapan
como de el alcance actual de UP o que no los esta haciendo de la forma correcta que
deberia hacerse como en esa generalizacion.

### 00:43:03 - Punto de vista tecnico: conciliar y ver capacidades a implementar

**Esteban Cortes Sandoval**: Es como un punto de vista igual mas tecnico. Igual tengo
que darle un punto de vista desde el funcional. Eh, pero desde el punto de vista
tecnico, eh, tenemos como que construir tambien como okay, como conciliamos esto y
cuales son las capacidades que hay que ir implementando para que esto funcione bien,
digamos. Quizas esta todo como no tan sucio, lo dudo, pero eh pero hay que hacer esa
pega. Entonces, parte de la carga del sprint tambien va a ir a estar dedicando tiempo
con nuestros agentes como a analizar eso. Ya. Hm. Asi que aprovecho, con eso les doy
el contexto. Dale.

**Francisco Navarro**: La idea esta buena, la verdad. El como es un temor. Me imagino
que ocupa mucho el LM (LLM) para tomar decisiones por el momento, me imagino.

**Esteban Cortes Sandoval**: En yo pense lo mismo. Se supone que en teoria. Como que
igual hay harta algoritmica con Python y algoritmos que ya existen como para
vectorizar los textos, comparar distancias entre vectores como para decir que tan
cercano esta esto, esto otro, eh.

**Francisco Navarro**: Problema. El problema que yo veo es que para clientes que va a
ser mas facil que para otro porque tienen como...

### 00:44:30 - Flexibilidad vs disponibilidad de recursos; carreras no estandar

**Esteban Cortes Sandoval**: Porque...

**Francisco Navarro**: ...ciertas ramas, las carreras como ya predefinidas.

**Esteban Cortes Sandoval**: Aja. Mm. Si, si, si. Y tambien todo depende como de que
tan buenos son los recursos tambien que tiene la institucion. Si no tiene recursos, no
podeis como plantearle nada, por asi decirlo.

**Francisco Navarro**: Claro, claro.

**Esteban Cortes Sandoval**: M.

**Francisco Navarro**: Me preocupan algunas universidades, por ejemplo, la
estadounidense, temor porque no tienen una carrera como estandar, como que podeis
tomar cualquier cosa para tu...

**Esteban Cortes Sandoval**: Claro, la personalizacion del aprendizaje en el plan de
estudio, que es parte de lo que todavia no estamos priorizando en plan de estudio.

**Francisco Navarro**: Eso.

**Esteban Cortes Sandoval**: Si es que este backlog no alcanza a estar tan bien,
igual podriamos avanzar por ahi en la malla, los planes no secuenciales, pero si como
que hay que ir poniendose en esos distintos escenarios para que lo que se modele se
pueda extender tambien a eso, como de donde sacamos informacion como para poder darle
ese tipo de personalizacion a una ruta. Claro, igual ahi, o sea, no se, pues yo me
pongo en ese caso un estudiante que hizo su propia malla, independientemente de eso,
si tenemos como la malla que definio, como el camino que definio, eh, de todas formas
deberia tendriamos que tener como el contexto de lo que ella hizo y el contexto del
curso que esta tomando, cacha?

### 00:45:49 - Contexto del curso como base; alcance cerrado del sprint

**Esteban Cortes Sandoval**: Y de ahi sacar como la informacion para decir esto es lo
que se le puede como proponer. Igual esto esta pensado como en el desarrollo en el
contexto del curso, cacha. Eh, entonces como que el curso te entrega esos recursos
mas alla de decir como yo quiero desarrollar esta competencia, como que cursos tengo
que tomar para hacerla, que es una capacidad que probablemente igual vamos a poder
eventualmente implementar. Lo que estamos partiendo es el punto de vista como digo
del curso. En este curso que tiene estos recursos, cuales son las rutas de
aprendizajes que podemos como desarrollar eh digamos proponer igual en realidad?
Porque tienen que ser validas por un docente, tienen que ser validas como por un
academico. Eh, ya eso como input. Yo eh por ahora, como les digo, el objetivo de
Sprint seria eso que les comente, dos cosas que tenemos mas o menos como cerradas de
como habria que abordarlas, que son el requerimiento de curso y el versionamiento de
plan de estudio. Dos cosas que hay que terminar de refinar de aqui al lunes, martes
a lo peor de los escenarios, eh, para ver el tema de como partimos la implementacion
de los esquemas de niveles y las matrices de competencia. Eh, y el set de datos
(SIT), que seria como un side quest para tomar en sprint y empezar a mirar como lo
que nos entrego JP para ver que hay en todo ese input de informacion.

### 00:47:19 - Cierre: bibliografia a boton; retro y coordinacion

**Esteban Cortes Sandoval**: Eh, en preparacion a lo que van a ser realmente dos. Yo
creo que este sprint que viene no vamos a tomar nada de eso. El siguiente yo creo que
tampoco porque tenemos que mirar la tributacion de los planes y de ahi ya es probable
que ahi empecemos a tomar cosas de estos nuevos mods. Eh, y tenemos que mirar donde,
yo creo que ese mismo sprint que estoy pensando empezar a tomar estas cosas deberia
calzar con que ya el resto del equipo este como trabajando en conjunto con nosotros
tambien en la migracion. Asi que eso tengo como preplanning para ir poniendonos en
linea. No se si tienen algun comentario mas. Si no, lo dejamos hasta aca.

**Eduardo Bacon**: No, por mi lado. Oh.

**Esteban Cortes Sandoval**: Ah, lo otro que voy a notar.

**Juan Diego Galdames**: Por mi tampoco.

**Esteban Cortes Sandoval**: Vale, voy a notar por aqui que la bibliografia pasarla a
un boton. Bibliografia eh pasarla a boton. Eso lo podemos hacer, ese mantenedor del
programa asignatura. Tambien lo deberiamos hacer en el proximo sprint como un pequeno
ajuste. Entonces, eso eh ahi vean ustedes no mas el cierre como de que quede todo
para que lo podamos enviar a Delog y ya poco para el terminar del dia, asi que tengan
buen fin de semana y bueno, tenemos una sesion que yo creo que podemos tomar despues
igual para las 4:30 que es la retro, asi que igual en realidad creo que voy a ver ahi
a Pancho y a Edu de nuevo, eh, asi que pero eso igual. Ahi, Juandi, que tengais buen
fin de semana y andar con precaucion que esta muy brava la lluvia.

**Juan Diego Galdames**: Si, igual ustedes.

**Esteban Cortes Sandoval**: Lluvia.

**Juan Diego Galdames**: Buen fin de tambien cuidarse con el temporal.

**Esteban Cortes Sandoval**: Tambien. Hablamos mas ratito con algunos chicos.

**Juan Diego Galdames**: Tambien.

**Eduardo Bacon**: Oh.

**Francisco Navarro**: Ciao. Ciao.

**Eduardo Bacon**: Ok.

> La transcripcion finalizo despues de 00:49:47.

## Outcomes

### Current - alcance decidido de SP6

| # | Tipo | Item | Dueño | Refs |
|---|------|------|-------|------|
| C1 | scope | Completar el requerimiento de curso pendiente de SP5 (tema cerrado, se arrastra) | equipo | SP5 |
| C2 | scope | Versionamiento de plan de estudio: extender la logica de versionamiento usando la malla completa (la malla ya existe, falta "cablear" prerrequisitos) | equipo | - |
| C3 | scope | Iniciar migracion del mod curricular mapping: definir objetos de esquemas de niveles y matrices de competencia; los record list van "si o si", el detalle se itera los primeros dias del sprint | Esteban / equipo | curriculum-design |
| C4 | scope | SIT / set de datos realista tipo cliente como side quest: actualizarlo con datos de silabus y plan de estudio para tener el dataset completo | Esteban | - |
| C5 | scope | Analizar tecnicamente los mods de JP (learning objects + pathways / rutas de aprendizaje): abstraer arquitectura, servicios usados, que escapa del alcance actual de UP1; dedicar horas del sprint + tiempo con los agentes | equipo | - |
| C6 | change | Convertir la seccion de bibliografia del mantenedor de programa de asignatura en un boton funcional (ajuste pequeno para SP6) | equipo | - |
| C7 | decision | Postergar la accion de tributacion: se perdio la maqueta original (se rehara con Claude, no Gemini); requiere primero matrices de competencia + esquemas de niveles; probablemente ni SP6 ni el siguiente | Esteban | - |
| C8 | decision | Matrices de competencia con enfoque ESTANDARIZADO (no permitir personalizar rangos por competencia) para preservar el analisis transversal a nivel institucional; verificar con Sandra cuantos clientes usan la variacion | Esteban | - |
| C9 | decision | Esquemas de niveles y matrices de competencia se modelan con record list + vista detalle estandar; evaluar si el detalle necesita un componente adoc para mostrar el esquema de medicion | Esteban | - |
| C10 | finding | Soft delete YA existe core (lo implemento Nico): se activa por objeto via campo `metadata`; los layouts deben filtrar por activos en su config por defecto | Juan Diego | - |
| C11 | finding | El soft delete NO tiene logica de cascada automatica (confirmado con Nico): inactiva solo el objeto, los relacionados quedan activos. En hard delete la cascada SI es configurable por objeto | Juan Diego | - |
| C12 | decision | Posponer la implementacion masiva del soft delete hasta resolver la cascada; para SP6 la intencion era configurarlo, no desarrollar la cascada. No es necesario todavia | equipo | - |
| C13 | open-question | Confirmar si la cascada (hard/soft) cubre hijos con Record Types, no solo hijos directos, antes de comprometer alcance (Eduardo) | Eduardo | - |
| C14 | open-question | Consultar a Sandra el uso real de la personalizacion de rangos por competencia en clientes actuales | Esteban | - |

### Future - para tickets/analisis que aun no existen

| # | Tipo | Item | Tema/Module | Cuando aplique |
|---|------|------|-------------|----------------|
| F1 | capability | Componente/mantenedor de esquema de niveles: esquema (codigo, nombre, descripcion) + niveles de desempeno (avanzado/intermedio/no logrado) + niveles de desarrollo (rangos de notas/puntaje) | curriculum-design | SP6+ (refinamiento en curso) |
| F2 | capability | Matriz de competencia: objeto matriz (descripcion, codigo, nombre, asociacion a escuelas) + record list de competencias con logica padre-hijo (nodos) + relacion a esquema de niveles | curriculum-design | SP6+ |
| F3 | capability | Accion de tributacion de competencias (componente a rehacer): mapear que competencias tributa cada curso | curriculum-design | sprint post SP6 |
| F4 | capability | Soft delete con cascada consistente en toda la cadena de datos (padre inactivo => hijos inactivos), incluyendo hijos polimorficos y Record Types | UP1 core | pendiente decision/implementacion Nico |
| F5 | capability | Mod learning objects: catalogo digital de recursos de aprendizaje; conectar a LMS, extraer, mapear/metadata, transformar de medio (video->texto->audio), integrar rankings/indicadores de cursos | uAssessment / mod nuevo | analisis en SP6, implementacion futura |
| F6 | capability | Mod pathways (rutas de aprendizaje): generar rutas autonomas de nivelacion cuando el estudiante no alcanza un resultado; propuestas editables/validables por docente; algoritmica Python (vectorizacion/comparacion), no necesariamente agentes | uAssessment / mod nuevo | analisis en SP6, implementacion futura |
| F7 | capability | Reporteria de desarrollo de competencias (que se esta desarrollando / que no) como paso previo a proponer acciones de mejora al estudiante | uAssessment | futuro |
| F8 | capability | Versionamiento de plan de estudio impactado por tributacion (replicar o no las tributaciones al versionar) | curriculum-design | cuando entre tributacion |
| F9 | capability | Personalizacion del aprendizaje en planes no secuenciales / mallas no estandar (ej. universidades estadounidenses sin carrera estandar) | curriculum-design | no priorizado aun |
| F10 | improvement | Mensajes de error personalizados (mejora no prioritaria levantada por Francisco) | UP1 / soporte | backlog |
| F11 | coordination | Alinear el sprint en que se retomen los mods de JP con la incorporacion del resto del equipo a la migracion | equipo | 2-3 sprints adelante |
