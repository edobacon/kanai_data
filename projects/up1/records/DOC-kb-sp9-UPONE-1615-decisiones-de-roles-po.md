---
id: DOC-kb-sp9-UPONE-1615-decisiones-de-roles-po
project: up1
type: doc
---

# UPONE-1615 - Roles: que hay hoy y que hay que decidir

> **Para que sirve este documento.** El ticket pide migrar los roles curriculares a la logica de "roles
> internos" y definir el mapeo entre unos y otros. Ese mapeo es una decision de producto, no tecnica, y hay
> ademas un conflicto de nombre que hay que resolver antes de avanzar. Aca esta todo lo necesario para
> decidirlo: que roles existen, de donde viene cada uno, donde esta el conflicto, y las opciones para
> resolverlo.
>
> **Estado de los datos:** leidos del ambiente el 2026-08-17. El detalle tecnico, con rutas de codigo y
> causa raiz, esta en un anexo aparte para quien lo necesite.

---

## RESUELTO el 2026-08-17

> **Este documento se conserva como el material con el que se decidio.** Ya no es una consulta pendiente. Lo
> que sigue mas abajo es el analisis tal como se presento, y no se reescribio para que se pueda volver a el.
>
> **Version publicada** (la que se comparte): https://claude.ai/code/artifact/47160d8b-fa2b-4396-96fd-aa94f80194df
> **Historial de decisiones con sus motivos:** `sp9/UPONE-1615-registro-de-decisiones.md`
> **Lo aplicable, ya en el contrato del ticket:** `sp9/UPONE-1615-detalle.md`

Que se aprobo, en corto:

| Decision | Resolucion |
|---|---|
| Adoptar los sets de permisos por modulo | **Si** |
| Nombre de los roles | **`Learning Assurance - <Rol>`**, en espanol. El prefijo nombra a la familia (cd, cm y un tercero por venir), no al modulo |
| Nombre de los sets | **`<Modulo en ingles> - <Rol>`**: `Curriculum Design - <Rol>`, `Curriculum Mapping - <Rol>` |
| Vinculo de los cuatro roles curriculares | **Uno a uno por nombre**, al set de cada modulo donde el rol opera |
| Composicion de cada set | **Por modulo, no espejo.** Base (Consultor) mas tres extensiones, en cada modulo |
| Transversales del modulo (historial, nombre de usuario) | **En las dos bases**, porque la inyeccion deduplica y asi cada modulo queda autosuficiente |
| Permiso de institucion (criterio 2 del PO) | **En la base de Curriculum Design**, con lo que llega a los cuatro roles |
| Lo que quedo en desuso | **Se limpia** el rol huerfano y los dos sets de fixture. Regla: se limpia lo del mod; si el origen es del core, se avisa |
| Convivencia entre los dos sistemas | **No hay.** Los roles se renombran en su lugar; la red es comparar permisos antes y despues |
| Esfuerzo | **8 SP** (escala Fibonacci) |

**Queda una sola decision abierta:** el mapeo entre los roles que posee el core (`Admin`, `Consultor`,
`Coordinador` y el resto) y los sets del mod. Arrastra con ella el caso de `Consultor` y la consecuencia sobre
la visibilidad de los dos modulos. Detalle en el registro de decisiones (O1).

**Item de coordinacion aparte:** el permiso de ofertas del `Diseñador Curricular` sobre el objeto compartido
con engagement.

---

## Lo primero: no se crean roles nuevos

**No se agregan roles a la institucion y nadie recibe un rol distinto.** Lo que cambia es **de donde toma sus
permisos** cada rol. Los cuatro roles curriculares si cambian de nombre, y eso se decidio aparte (ver arriba):
siguen siendo los mismos cuatro roles, con las mismas personas asignadas.

| | Que es | Cambia con este ticket? |
|---|---|---|
| **Rol estandar** | El rol que la institucion asigna a una persona: Diseñador Curricular, Coordinador, Admin. Es la lista que el cliente reconoce. | **No.** Ni la lista ni los nombres |
| **Paquete de permisos de un modulo** | El conjunto de permisos que un modulo concede. La plataforma lo llama "rol interno", pero **no es un rol que se le asigne a una persona**: es un paquete al que un rol estandar apunta. | Si, hay que declararlos: hoy no existen para los modulos curriculares |
| **El vinculo entre ambos** | Que rol estandar toma que paquete, en cada modulo. | Si, es la decision de fondo del ticket |

### Como cambia, en concreto

Hoy los permisos cuelgan **directo** del rol estandar. Por ejemplo, Diseñador Curricular tiene sus permisos
pegados a el, mezclando lo de Diseño Curricular y lo de Mapeo Curricular en una sola bolsa.

Despues del cambio, cada modulo define **su propio paquete**, y Diseñador Curricular apunta al paquete de
Diseño Curricular y al de Mapeo Curricular. Sigue siendo el mismo rol, con la misma persona y, si el vinculo
se hace uno a uno, **con los mismos permisos efectivos**.

### Que se gana con eso

1. **Cada modulo gobierna lo suyo.** Si Mapeo Curricular quiere cambiar que puede hacer un Revisor, ajusta su
   paquete sin tocar la lista de roles de la institucion ni pedirle nada al otro modulo.
2. **El mismo rol puede tener alcance distinto en cada modulo.** Hoy no se puede: los permisos son una sola
   bolsa. Es la capacidad que el ticket viene a aprovechar, y ya existe en la plataforma, construida en un
   sprint anterior.
3. **Se termina la duplicacion actual.** Hoy los dos modulos curriculares declaran la misma lista de roles
   por separado y hay una prueba que falla si se desincronizan. Con paquetes por modulo, cada uno declara lo
   suyo.

**Ejemplo.** La institucion tiene un Coordinador. En Diseño Curricular ese Coordinador apunta a un paquete
que le da lectura de programas academicos; en otro modulo apunta a un paquete con otro alcance. La persona
sigue siendo Coordinador en la lista de la institucion; lo que cambia es que puede hacer en cada modulo.

---

## 1. Roles estandar que existen hoy

Son 21 en total. Los agrupo por origen, porque no todos son nuestros.

### Los de la plataforma

| Rol | Que es |
|---|---|
| Admin | Administrador total de la plataforma |
| Consultor | Perfil de consulta amplia |
| Colaborador | Perfil base, hoy sin permisos asignados |

### Los curriculares, que son los que este ticket migra

Los declaran **los dos modulos** curriculares, con la misma definicion.

| Rol | Alcance declarado | Peso relativo |
|---|---|---|
| Consultor Curricular | Solo lectura y auditoria de programas, planes, cursos y silabos | El mas acotado |
| Diseñador Curricular | Crea y edita contenido curricular, versiona, clona y envia a revision | Amplio |
| Revisor Curricular | Aprueba el contenido enviado a revision | Intermedio, centrado en aprobar |
| Autoridad Curricular | Publica, revierte, archiva y elimina; gobierna el ciclo de vida | El mas amplio |

### Los de otros dominios

Seis roles de Engagement y retencion (`admin-general-eng`, `admin-centro-eng`, `responsable-eng`,
`admin-ret`, `gestor-ret`, `estudiante-eng`) y dos compartidos entre modulos (`Coordinador`, `Estudiante`).
No los toca este ticket, pero conviene tenerlos a la vista porque comparten la misma lista.

### Los de origen antiguo o de prueba

Cinco roles que existen en el ambiente y no los declara ninguna configuracion actual: `Gestor`,
`Facilitador`, `Viewer`, `Limited Editor` y `Docente`. Parecen venir de configuraciones previas o de
pruebas. **No los toca este ticket**, pero explican por que la lista se ve mas larga de lo esperado.

### Y uno que no deberia estar ahi

`GestorCurricular`. **Sin permisos y sin vistas asociadas: no hace nada.** Es el conflicto de la seccion 3.

---

## 2. Paquetes de permisos por modulo: que hay hoy

Recordar: estos **no son roles que se asignen a personas**. Son los paquetes a los que los roles estandar
apuntan.

| Modulo | Paquetes declarados hoy |
|---|---|
| Diseño Curricular | Dos, y **los dos son de prueba**: se crearon para validar que el mecanismo funcionara, no para usarse |
| Mapeo Curricular | **Ninguno** |

### Lo que falta

Ninguno de los cuatro roles curriculares tiene todavia su paquete por modulo. Sus permisos siguen colgando
directo del rol, en una sola bolsa. **Eso es el trabajo del ticket:** armar los paquetes en cada modulo y
vincular cada rol estandar al suyo.

Insisto en el punto, porque es donde se presta a confusion: armar esos paquetes **no agrega roles a la lista
de la institucion**. Son la misma cantidad de roles de siempre, tomando sus permisos de otro lugar.

### Estado del vinculo hoy

El mecanismo **no esta en uso en ningun modulo de la plataforma**, no solo en los curriculares. Hay 16
vinculos de rol con modulo creados, y **ninguno tiene un paquete asignado**.

Y para los dos modulos curriculares no existen ni esos vinculos: hay que crearlos.

---

## 3. Hay conflicto? Si, uno, y esta contenido

**Que pasa.** En la lista de roles estandar de la institucion aparece uno llamado `GestorCurricular` que
**no tiene ningun permiso ni ninguna vista**. No sirve para nada y nadie lo usa. Al mismo tiempo, existe un
**paquete de prueba** con **ese mismo nombre** en Diseño Curricular.

**Por que aparecio.** Fue un accidente tecnico, no una decision. Al construir la prueba del mecanismo, el
nombre de un paquete se escribio en un lugar de la configuracion donde la plataforma espera nombres de
**roles estandar**. La plataforma, al no encontrar un rol con ese nombre, **lo creo automaticamente**. En ese
punto no puede distinguir si le pasaron el nombre de un rol o el de un paquete.

**Ya se corrigio en el origen.** La configuracion se arreglo hace unos dias: ahora apunta a un rol estandar
de verdad (`Coordinador`), que es el diseño correcto. Lo que quedo es el rol creado automaticamente, porque
la plataforma **no lo borra al corregir la causa**.

**Impacto hoy: bajo.** No rompe nada ni afecta permisos de nadie. Ensucia la lista de roles que ve el
administrador y puede confundir a quien arme el mapeo, porque el mismo nombre aparece en las dos listas
significando cosas distintas.

**El riesgo real esta hacia adelante.** Si a los cuatro paquetes de permisos les ponemos los mismos nombres
que a los cuatro roles estandar, el mismo nombre significaria dos cosas distintas segun donde aparezca. La
plataforma tiene una proteccion contra nombres repetidos, pero **verificamos que no cubre este caso**: no
detecta los roles estandar que se crean por la via que usan los curriculares. O sea, nadie nos avisaria.

---

## 4. Como se resuelve

La solucion tiene dos partes, y una de las dos necesita tu decision.

### Parte tecnica, sin decision de producto

No volver a escribir nombres de paquetes donde la plataforma espera nombres de roles estandar. Ya esta
corregido en el origen y el equipo lo tiene registrado como regla para no repetirlo.

### Parte que si necesita tu decision: los nombres de los paquetes

Para que **un nombre no pueda confundirse con el otro**, conviene que los paquetes se distingan a simple
vista de los roles. Hoy los nombres de rol no siguen ningun patron comun (conviven "Diseñador Curricular",
"admin-general-eng", "Viewer" y "Limited Editor"), asi que no hay una forma reservada de la cual apoyarse
para diferenciarlos: hay que elegirla a proposito.

---

## Antes de las decisiones: el punto de partida en Diseño Curricular

Conviene saber exactamente de donde partimos, porque explica por que el ticket parece mas grande de lo que
suena y separa lo que es problema nuevo de lo que viene heredado.

### El estado hoy, pieza por pieza

| Pieza | Estado |
|---|---|
| Los 4 roles curriculares | Existen y funcionan, con sus permisos **colgando directo del rol** |
| Paquetes declarados | Dos, y **los dos son de prueba** |
| Vinculos rol a paquete | **Ninguno.** Cero filas |
| Visibilidad del modulo | **Abierto a cualquier rol**, por no haber declarado ninguno |
| Permiso sobre instituciones | **Ninguno de los 4 roles lo tiene** |
| Rol sobrante `GestorCurricular` | Existe, asignable, sin permisos ni vistas |

Es decir: **del lado nuevo no hay nada salvo dos piezas de prueba.** No es que falte configurar el mapeo, es
que hay que construir los paquetes, crear los vinculos que no existen y decidir la visibilidad.

### Un detalle que conviene saber: la prueba del mecanismo hoy no prueba nada

El paquete de prueba declara en su propia descripcion para que existe: al vincular Coordinador a el, deberia
aparecer "Programas academicos" en su menu. Verificamos la cadena completa y esta cortada en dos puntos:

1. **No hay vinculo**, porque el modulo no tiene ninguna fila.
2. **Coordinador tampoco tiene ese permiso por otra via.** Sus permisos son de asistencia, disponibilidad,
   eventos, personas, ofertas e instituciones. Ninguno sobre programa academico.

No esta roto en el sentido de que algo falle: esta **desconectado**. La consecuencia practica es que nadie ha
comprobado el mecanismo de punta a punta en este modulo, asi que la verificacion de la migracion hay que
hacerla con cuidado y no asumir que "ya se probo".

### De donde viene todo esto: UPONE-1393

Los cuatro roles curriculares no existen desde siempre. Los creo **UPONE-1393, "Curriculum Design | Roles
estandar del mod + wiring de capabilities"**, cerrado el 2026-07-20 en el SP6, a cargo de Francisco.

**Que problema venia a resolver.** Su descripcion lo dice: antes de ese ticket, **"un unico rol, Consultor,
tenia acceso total"**, y no habia separacion de funciones. Diseñar, aprobar, publicar y auditar eran lo
mismo. Ese ticket introdujo los cuatro roles para separarlas.

**Que entrego, y funciona:** los cuatro roles con sus permisos repartidos, y el control real de que un
Diseñador no pueda aprobar, un Revisor no pueda publicar, y solo la Autoridad pueda revertir un documento ya
vigente.

### Por que lo que hizo era lo correcto en ese momento

Antes de listar lo que quedo abierto, conviene decir esto, porque **nada de lo que sigue fue un descuido**.
Con la informacion y las herramientas que habia en julio, cada una de esas decisiones era la correcta.

**El mecanismo de paquetes todavia no existia.** Es el dato que ordena todo lo demas:

| Ticket | Que entrego | Cerro |
|---|---|---|
| **UPONE-1393** | Los cuatro roles curriculares | **20 de julio** |
| UPONE-1354 | Layouts resueltos por rol interno | 29 de julio |
| **UPONE-1353** | **El mecanismo de paquetes en si** | **14 de agosto** |

El mecanismo que hoy proponemos adoptar se termino **casi un mes despues** de que 1393 cerrara. No es que
1393 lo haya ignorado: **no podia usar algo que no estaba construido.** Uso el patron que si existia y estaba
probado en otro modulo, que era la decision correcta.

**No cablear el permiso de instituciones tambien era correcto**, por dos razones. Su alcance eran los
permisos que el propio modulo declara, y el de instituciones no esta en ese catalogo porque pertenece a un
objeto de plataforma. Y sobre todo: **la evidencia de que faltaba no existia todavia.** Aparecio recien en
SP8, cuando alguien intento crear un plan de estudio con rol curricular y se topo con el bloqueo. No se puede
cablear un permiso que nadie sabe que falta.

**No retirar el acceso en bloque de Consultor era lo prudente.** Su descripcion declara explicitamente
**"cero toque a core"**, y ese acceso en bloque no es del modulo: viene de un mecanismo de la plataforma que
asigna cada permiso nuevo a los roles por defecto. Retirarlo era tocar core y afectar a **todos** los
modulos, no solo al curricular. Mantenerse en su alcance fue lo correcto: agrego la separacion de funciones
que faltaba sin arriesgar el acceso de otros dominios.

**Y el riesgo de las ofertas no lo ignoro: lo documento.** Lo dejo escrito como supuesto a revisar, porque
resolverlo exigia acordar con Engagement sobre un objeto que comparten. De hecho **si coordino** la parte que
le correspondia, las transiciones de estado de ese objeto. Anotar un riesgo que esta fuera de tu alcance, en
vez de cambiar unilateralmente algo compartido, es exactamente el comportamiento que uno espera.

### Que quedo abierto, y hoy si podemos cerrar

Lo que cambio no son las decisiones de entonces, **es el contexto**: el mecanismo ya existe, la evidencia del
permiso faltante ya aparecio, y este ticket vuelve a tocar el tema. Tres cosas, y las tres caen justo en su
radio:

| Heredado de UPONE-1393 | Situacion hoy | Donde impacta |
|---|---|---|
| **El acceso total de Consultor nunca se retiro** | Consultor sigue con 166 permisos curriculares, los mismos que Admin. Era exactamente el estado que ese ticket venia a reemplazar | Es la alerta de la Decision 3. **No es un problema nuevo**: es una mitad pendiente de hace dos sprints |
| **El permiso sobre instituciones nunca se cableo** | Ninguno de los 4 roles lo tiene. El alcance de ese ticket eran **los permisos declarados por el propio modulo**, y el de instituciones no esta en esos catalogos porque es de un objeto de plataforma. Quedo fuera del recorte | Es el criterio 2 de este ticket. Se detecto despues, en una prueba de otro ticket |
| **Un riesgo cross-mod que ese ticket dejo anotado y sigue vigente** | Diseñador Curricular tiene permiso de crear y modificar "ofertas", y ese objeto lo comparten Diseño Curricular y Engagement. Los permisos no distinguen de que tipo de oferta se trata | Ver la nota de abajo. Es una decision que conviene tomar en este ticket o registrarla de nuevo |

### Los catalogos de permisos de cada modulo

Este es el otro insumo que dejo UPONE-1393 y conviene tenerlo a la vista, porque **los paquetes se van a
armar con estos mismos permisos**: no se inventan capacidades nuevas, se reparte lo que cada modulo ya
declara.

Cada modulo declara su propio catalogo. Es el universo de lo que ese modulo puede conceder:

| Diseño Curricular: 45 permisos | | Mapeo Curricular: 16 permisos | |
|---|---|---|---|
| Programa de asignatura | 11 | Esquema de niveles | 5 |
| Plan de estudio | 7 | Matriz de competencias | 5 |
| Secciones del silabo | 5 | Escala de cobertura | 4 |
| Entradas de la malla | 4 | Acceso al modulo | 2 |
| Requisitos | 4 | | |
| Categorias de requisitos | 4 | | |
| Acceso al modulo | 4 | | |
| Silabo | 3 | | |
| Programa academico | 1 | | |
| Vinculo curricular | 1 | | |
| Referencia bibliografica | 1 | | |

**Tres cosas que esto aclara, y las tres importan para decidir:**

1. **Migrar no crea poderes nuevos.** Los paquetes son subconjuntos de estos catalogos. Lo que hoy esta
   repartido entre cuatro roles se va a repartir entre cuatro paquetes por modulo, con los mismos permisos.
2. **Explica por que falta el permiso de instituciones.** No esta en ninguno de los dos catalogos, porque
   "institucion" es un objeto de la plataforma y no de estos modulos. UPONE-1393 cableo lo que los modulos
   declaraban, y este permiso quedaba fuera de ese universo. No fue un descuido, fue el borde del recorte.
3. **Muestra el desbalance entre los dos modulos.** Diseño Curricular tiene un catalogo casi tres veces mas
   grande que Mapeo Curricular, y el de Mapeo esta en construccion todavia (sus objetos se estan creando en
   este sprint). Eso pesa al decidir si migrar los dos a la vez o empezar por uno.

### El riesgo de las ofertas compartidas

UPONE-1393 lo dejo escrito como supuesto a revisar, con estas palabras: *"Diseñador con offering
create/modify, revisar riesgo cross-mod: las capabilities no distinguen el tipo de registro, podria tocar
ServiceOffer de engagement"*. **Dejarlo anotado era lo correcto**: resolverlo exigia acordar con Engagement
sobre un objeto compartido, y cambiarlo unilateralmente habria sido peor que documentarlo.

Sigue vigente: un Diseñador Curricular podria modificar ofertas de servicio de Engagement, porque el permiso
es sobre el objeto "oferta" y ese objeto lo usan los dos modulos con significados distintos (silabo en uno,
oferta de servicio en el otro).

Es el mismo problema de fondo que aparece en el ticket de los menus: **un objeto compartido entre dos
modulos, y una configuracion que no distingue por modulo.**

Aca la migracion a paquetes **ayuda**, y vale tenerlo como argumento a favor: si el permiso de ofertas queda
en el paquete de Diseño Curricular en vez de colgado del rol, es mas facil razonar sobre su alcance. Pero
**no lo resuelve solo**, porque el permiso sigue siendo sobre el objeto. Conviene decidir si se acota en este
ticket o se registra como tema aparte.

---

## 5. Decision 1: como se llaman los paquetes de permisos

Ojo con lo que se decide aca: **es el nombre de un paquete, no el de un rol.** No aparece en la lista de
roles de la institucion y no se le asigna a nadie. Lo ve unicamente quien configura el vinculo en la consola
de administracion.

**Opcion A. Nombres propios, distintos de los roles estandar (recomendada).**

Por ejemplo, para Diseño Curricular: `cd-consultor`, `cd-disenador`, `cd-revisor`, `cd-autoridad`, y los
equivalentes en Mapeo Curricular.

- **A favor:** al configurar el vinculo queda obvio que se esta eligiendo un paquete y no un rol, asi que no
  hay ambiguedad posible. Y si alguien vuelve a cometer el error que genero el rol fantasma, se nota en la
  revision en vez de aparecer un rol de mas en la lista del cliente.
- **En contra:** son nombres tecnicos. Quien configura ve dos vocabularios distintos, uno por lado del
  vinculo.

**Opcion B. Mismos nombres que los roles estandar.**

Los paquetes se llaman "Consultor Curricular", "Diseñador Curricular", etc.

- **A favor:** un solo vocabulario, mas facil de leer para quien no conoce la distincion.
- **En contra:** el mismo nombre significaria dos cosas distintas segun donde aparezca, y el vinculo se leeria
  como "Diseñador Curricular apunta a Diseñador Curricular", que no explica nada. **Ademas la proteccion de la
  plataforma contra nombres repetidos no cubre este caso**, asi que un error de configuracion futuro seria
  muy dificil de detectar.

**Recomendacion: opcion A.** El costo es cosmetico y acotado a quien configura; el beneficio es que elimina
de raiz la ambiguedad que ya nos costo un rol fantasma en la lista del cliente.

---

## 6. Decision 2: que hacemos con el rol sobrante

`GestorCurricular` no tiene permisos ni vistas y nadie lo usa.

| Opcion | Implicancia |
|---|---|
| **Retirarlo en este ticket** (recomendada) | La lista de roles queda limpia antes de armar el vinculo. Es solo dato, no requiere cambio de codigo |
| Retirarlo aparte, mas adelante | El vinculo se arma con un nombre confuso a la vista, y el rol sigue siendo asignable mientras tanto |
| Conservarlo | Requiere definirle un proposito, porque hoy no tiene ninguno (ver su fila en la seccion 7) |

**Ojo con un detalle de secuencia.** Los dos paquetes de prueba de Diseño Curricular tambien se llaman
`GestorCurricular` y `LectorCurricular`. Si se adopta la convencion de nombres de la Decision 1, conviene
retirar el rol sobrante **y** renombrar o retirar esos dos paquetes de prueba en la misma pasada, para no
quedar con dos estilos conviviendo ni con el nombre duplicado dando vueltas. El equipo verifico que
renombrarlos tiene costo bajo: nada depende de esos nombres.

Tambien conviene revisar si hay otros roles sobrantes del mismo tipo, dado que encontramos varios de origen
antiguo.

---

## 7. Decision 3: el vinculo

Esta es la decision de fondo del ticket: **que paquete toma cada rol estandar, en cada modulo.** Los roles de
la primera columna ya existen y no cambian; lo que se define es a que apuntan.

La tabla cubre **los 21 roles que existen hoy**, no solo los curriculares, porque cada uno necesita una
respuesta aunque sea "ninguno". Un rol sin paquete asignado no puede operar en ese modulo, y segun la
seccion 8 tampoco lo vera.

### Los cuatro curriculares: propuesta uno a uno

| Rol estandar (ya existe) | Paquete en Diseño Curricular | Paquete en Mapeo Curricular |
|---|---|---|
| Consultor Curricular | el de solo lectura | el de solo lectura |
| Diseñador Curricular | el de creacion y edicion | el de creacion y edicion |
| Revisor Curricular | el de aprobacion | el de aprobacion |
| Autoridad Curricular | el de gobierno del ciclo de vida | el de gobierno del ciclo de vida |

**Uno a uno como punto de partida**, conservando el alcance que cada rol tiene hoy, para que **nadie gane ni
pierda permisos** en el cambio.

### Los de plataforma y los compartidos: necesitan decision

Hoy ninguno tiene alcance declarado en los modulos curriculares, pero varios entran igual porque los modulos
estan abiertos (seccion 8).

Aca hay un hallazgo que cambia la conversacion, y conviene mirarlo antes de decidir. Numeros reales de
permisos en el dominio curricular (detalle en el anexo A):

| Rol estandar | Permisos curriculares hoy | Que puede hacer hoy | Propuesta |
|---|---|---|---|
| Admin | **166** | Todo, incluido crear, publicar, aprobar y eliminar | Confirmar si toma paquete propio o conserva su acceso total por ser administrador |
| **Consultor** | **166** | **Todo, igual que Admin**: crear, modificar, eliminar, publicar, aprobar, versionar y clonar | **Requiere definicion. Ver la alerta de abajo** |
| Coordinador | **4** | Solo lo relativo a ofertas, y **son las ofertas de servicio de Engagement, no los silabos** | Ninguno, salvo que se le quiera dar lectura curricular |
| Colaborador | 0 | Nada | Ninguno |
| Estudiante | 0 en curricular | Nada aca | Ninguno |

### Alerta sobre el rol Consultor

**El rol se llama "Consultor" pero hoy puede escribir, publicar, aprobar y eliminar contenido curricular:
tiene los mismos 166 permisos que Admin.** Es mas amplio que Autoridad Curricular, que tiene 54.

**No es un problema nuevo, y tampoco fue un descuido.** Es el estado que UPONE-1393 venia a reemplazar: su
descripcion dice que "un unico rol, Consultor, tenia acceso total". Los cuatro roles se crearon, pero el
acceso en bloque de Consultor no se retiro **porque ese ticket estaba acotado a "cero toque a core"**, y ese
acceso viene de un mecanismo de la plataforma, no del modulo. Retirarlo entonces habria significado tocar
core y afectar a todos los modulos. Mantenerse en su alcance fue lo correcto.

Lo que cambio es que **hoy este ticket ya esta tocando el tema de roles**, asi que es la oportunidad natural
de cerrarlo con la coordinacion que corresponde.

Hay que tomarla a proposito, porque cualquiera de las salidas tiene consecuencia:

| Salida | Consecuencia |
|---|---|
| **Mapearlo al paquete de solo lectura** (lo que su nombre sugiere) | Coherente con lo que el nombre promete, pero **Consultor pierde permisos que hoy tiene**. Si alguien esta operando con ese rol, deja de poder |
| **Mapearlo a un paquete amplio** (lo que hoy tiene) | Nadie pierde nada, pero se consolida un rol llamado "Consultor" que en realidad administra |
| **Dejarlo sin paquete** | Pierde todo el acceso curricular, y ademas deja de ver los modulos (seccion 8) |

Recomendacion: **averiguar primero si hay personas operando con el rol Consultor en los modulos
curriculares.** Si no hay nadie, es la oportunidad de alinearlo con su nombre. Si hay alguien, conviene
conservar su alcance en la migracion y tratar la correccion como un tema aparte, para no mezclar dos
cambios en el mismo movimiento.

### Nota sobre Coordinador

Sus 4 permisos curriculares son sobre "ofertas", pero **ese objeto lo comparten dos modulos**: en Diseño
Curricular representa silabos y en Engagement representa ofertas de servicio. Los permisos de Coordinador
vienen de su rol en Engagement, no de un alcance curricular pensado. Conviene no leerlos como "Coordinador
ya trabaja con silabos".

Dato util aparte: **Coordinador si tiene los permisos sobre instituciones** que a los roles curriculares les
faltan. Confirma que el permiso existe y ya se otorga en la plataforma; el problema del criterio 2 es solo
que no esta asignado a los roles curriculares.

### El caso especial: GestorCurricular

Existe como rol estandar y **es asignable**, asi que corresponde que aparezca en el mapa. Pero tiene
limitaciones que hay que tener presentes antes de decidir:

| Aspecto | Situacion |
|---|---|
| Permisos | **Cero.** Hoy no habilita nada |
| Vistas asociadas | **Ninguna** |
| Origen | **No fue diseñado.** La plataforma lo creo automaticamente por el accidente de la seccion 3 |
| Nombre | **Coincide con el de un paquete de prueba** de Diseño Curricular, que es justo la ambiguedad que estamos resolviendo |
| Proposito declarado | No tiene. Nadie definio para que sirve ni quien deberia tenerlo |

**Propuesta: no mapearlo y retirarlo** (es la Decision 2). Mapearlo lo convertiria en un rol funcional que
nadie diseño, y ademas consolidaria el nombre duplicado.

Si en cambio se decide conservarlo, entonces **necesita una definicion de producto que hoy no tiene**: para
que sirve, quien lo recibe y que deberia poder hacer. Sin eso queda como un rol asignable que no hace nada,
que es lo peor de los dos mundos.

### Los de otros dominios y los antiguos: propuesta de "ninguno"

| Grupo | Roles | Propuesta |
|---|---|---|
| Engagement y retencion | admin-general-eng, admin-centro-eng, responsable-eng, admin-ret, gestor-ret, estudiante-eng | **Ninguno** en los modulos curriculares. Sus paquetes son asunto de su propio modulo |
| Origen antiguo o de prueba | Gestor, Facilitador, Viewer, Limited Editor, Docente | **Ninguno.** Ademas conviene revisarlos aparte, igual que el rol sobrante |

Si alguno de estos hoy entra a los modulos curriculares y debe seguir entrando, hay que decirlo ahora: con el
vinculo creado, dejarlos sin paquete les quita el acceso.

**Como se ejecuta sin riesgo.** El cambio se puede hacer en dos tiempos: primero se arman los paquetes y se
crean los vinculos, dejando los permisos actuales en su lugar, y se comprueba rol por rol que cada persona
puede hacer exactamente lo mismo que antes. Recien despues se retira la asignacion directa. Asi, si algo no
quedo cubierto, se detecta con el sistema viejo todavia en pie y nadie se queda sin acceso.

**Dos preguntas abiertas sobre el mapeo:**

1. **Los cuatro roles deben tener el mismo alcance en los dos modulos, o distinto?** La capacidad permite
   que sean distintos, y ese es justamente su valor. Hoy los dos modulos declaran exactamente lo mismo. Si
   quieres que, por ejemplo, un Revisor Curricular tenga un alcance distinto en Mapeo Curricular que en
   Diseño Curricular, este es el momento de definirlo.
2. **Que pasa con Admin, Coordinador y Consultor en los modulos curriculares?** Hoy no tienen un alcance
   declarado ahi. Hay que decidir si se les asigna uno o si quedan fuera.

---

## 8. Consecuencia a tener en cuenta antes de decidir

**Hoy los dos modulos curriculares son visibles para cualquier persona con cualquier rol**, porque no
tienen ningun rol asignado y la plataforma trata un modulo sin roles asignados como abierto a todos.

Al crear el mapeo, eso cambia: **el modulo pasa a verse solo por los roles que queden asignados.** Es el
comportamiento correcto, pero es un cambio observable para los usuarios actuales. Conviene decidirlo a
proposito y no descubrirlo despues:

- Que roles deben ver Diseño Curricular?
- Que roles deben ver Mapeo Curricular?

Si algun perfil que hoy entra queda fuera de la lista, va a perder el acceso.

---

## 9. Que se destraba al decidir

| Decision | Que habilita |
|---|---|
| Nombres de los paquetes | Armarlos en los dos modulos sin que se confundan con los roles de la institucion |
| Que hacer con el rol sobrante | Trabajar sobre una lista de roles limpia |
| El vinculo rol a paquete | El criterio 1 del ticket completo: que cada rol tome sus permisos por modulo |
| Que roles ven cada modulo | Cerrar el cambio sin sorpresas de acceso |
| Que hacer con el acceso total de Consultor | Cerrar la mitad pendiente del ticket de roles del SP6, o registrarla de nuevo a proposito |
| Si se acota el permiso de ofertas | Cerrar el riesgo cross-mod que ese mismo ticket dejo anotado |

**Hay una parte del ticket que no depende de nada de esto y puede avanzar en paralelo:** el criterio 2, que
pide que los roles alcancen para las acciones que declaran. Verificamos que el rol Diseñador Curricular
**no puede seleccionar la institucion al crear un plan de estudio**, porque le falta el permiso de lectura
sobre instituciones. Eso hoy se resuelve entrando como Admin, que es un parche. Ese arreglo es puntual, no
necesita el mapeo, y desbloquea un flujo que hoy esta roto.

---

## 10. Propuesta: como quedaria el mapa

Esta es la forma que espera la estructura de up1, aplicada a nuestro caso. **La lista de roles queda igual;
lo que aparece es una capa de paquetes por modulo.**

### La estructura

```
        LOS ROLES (no cambian)                LOS PAQUETES (nuevos, uno por modulo)

        Consultor Curricular  ─────┬──────►  Diseño Curricular: paquete de solo lectura
                                   └──────►  Mapeo Curricular:  paquete de solo lectura

        Diseñador Curricular  ─────┬──────►  Diseño Curricular: paquete de creacion y edicion
                                   └──────►  Mapeo Curricular:  paquete de creacion y edicion

        Revisor Curricular    ─────┬──────►  Diseño Curricular: paquete de aprobacion
                                   └──────►  Mapeo Curricular:  paquete de aprobacion

        Autoridad Curricular  ─────┬──────►  Diseño Curricular: paquete de ciclo de vida
                                   └──────►  Mapeo Curricular:  paquete de ciclo de vida
```

### El reparto exacto, medido de lo que hay hoy

Cada rol tiene hoy una sola bolsa. Al migrar, esa bolsa se parte en dos paquetes. **Estos son los numeros
reales, no estimaciones:**

| Rol | Su bolsa hoy | Paquete en Diseño Curricular | Paquete en Mapeo Curricular | De plataforma |
|---|---|---|---|---|
| Consultor Curricular | 20 permisos | 14 | 4 | 2 |
| Revisor Curricular | 27 permisos | 19 | 6 | 2 |
| Diseñador Curricular | 55 permisos | 41 | 12 | 2 |
| Autoridad Curricular | 56 permisos | 42 | 12 | 2 |

Nada se pierde ni se agrega: es la misma suma, repartida.

### Y el permiso de instituciones entra en el paquete

Verificamos algo que simplifica el criterio 2: **un paquete puede declarar tambien permisos de objetos de
plataforma**, no solo del modulo. El paquete de prueba que existe hoy ya lo hace con el objeto de usuario.

Eso significa que el permiso de instituciones que hoy falta **puede vivir dentro del paquete de Diseño
Curricular**, junto al resto, en vez de colgarse del rol. Queda mas ordenado: el modulo declara todo lo que
necesita para funcionar, incluido lo que toma prestado de la plataforma.

---

## 11. Como migrariamos, paso a paso

Cinco pasos. Los tres primeros **no cambian nada para nadie**; el riesgo esta solo en el cuarto.

| Paso | Que se hace | Efecto para los usuarios |
|---|---|---|
| **1** | Declarar los ocho paquetes (cuatro por modulo), cada uno reproduciendo su columna de la tabla de arriba | **Ninguno.** Los paquetes existen pero nadie los apunta |
| **2** | Decidir que roles ven cada modulo | Ninguno todavia, es una decision |
| **3** | Crear los vinculos y asignar cada paquete a su rol | **Aca cambia la visibilidad** (ver aviso). Los permisos se suman a los que ya tienen, asi que nadie pierde nada |
| **4** | Verificar rol por rol que cada uno puede hacer exactamente lo mismo que antes | Ninguno |
| **5** | Retirar los permisos que hoy cuelgan directo del rol | **Es el unico paso con riesgo.** Si el paquete no cubria algo, ahi se nota |

### Aviso importante sobre el orden

**El paso 3 es el que cierra la visibilidad de los modulos.** Hoy Diseño Curricular y Mapeo Curricular se ven
con cualquier rol, porque no tienen ninguno asignado. En el momento en que se crea el primer vinculo, el
modulo pasa a verse **solo** por los roles que queden en la lista.

Por eso el paso 2 va antes del 3 y no despues: si se crean los vinculos sin haber decidido la lista completa,
alguien que hoy entra puede perder el acceso sin que nadie lo haya querido.

### Por que el paso 5 va al final y separado

Entre el paso 3 y el 5 los roles tienen **los permisos viejos y los nuevos a la vez**, y se suman. Eso es
deliberado: es la red de seguridad. Permite comprobar el estado nuevo con el viejo todavia en pie, y si algo
no quedo cubierto se corrige antes de retirar nada.

---

## 12. Tres formas de hacerlo

Todas usan el mapa de la seccion 10. Se diferencian en cuanto abarcan.

### Propuesta A: espejo exacto

Los ocho paquetes reproducen exactamente lo que cada rol tiene hoy. Nada mas.

- **A favor:** riesgo minimo, cero cambios de permisos, y no requiere ninguna decision de negocio mas alla de
  aprobar la lista de visibilidad. Deja la plataforma alineada al modelo.
- **En contra:** no aprovecha todavia la capacidad de tener alcance distinto por modulo, y **no cierra** ni el
  exceso de Consultor ni el riesgo de las ofertas compartidas.
- **Esfuerzo:** el base.

### Propuesta B: espejo mas cerrar la deuda heredada (recomendada)

Lo de A, y ademas: retirar el acceso en bloque de Consultor mapeandolo al paquete de solo lectura, y acotar el
permiso de ofertas del Diseñador.

- **A favor:** cierra las dos cosas que UPONE-1393 dejo abiertas, en el ticket que naturalmente las toca. Y
  detiene el crecimiento automatico del exceso de Consultor, que si no se hace ahora sigue engordando.
- **En contra:** **Consultor pierde permisos que hoy tiene**, asi que exige confirmar antes que nadie este
  operando con ese rol. Y acotar las ofertas requiere coordinar con el equipo de Engagement.
- **Esfuerzo:** el base mas la verificacion de esos dos cambios.

### Propuesta C: espejo en Diseño Curricular, esperar en Mapeo Curricular

Migrar solo Diseño Curricular ahora, y dejar Mapeo Curricular para cuando su dominio se estabilice.

- **A favor:** el catalogo de Mapeo Curricular es un tercio del otro y **sus objetos se estan construyendo en
  este mismo sprint**. Migrar contra un modelo en movimiento puede exigir retrabajo. Reduce la superficie a
  la mitad y deja a Diseño Curricular como referencia probada.
- **En contra:** los dos modulos quedan con mecanismos distintos por un tiempo, y la duplicacion de la lista
  de roles entre ellos sigue vigente hasta cerrar el segundo.
- **Esfuerzo:** algo mas de la mitad del base, pero se paga dos veces.

### Comparacion

| | A: espejo | B: espejo + deuda | C: solo Diseño Curricular |
|---|---|---|---|
| Riesgo de que alguien pierda acceso | Bajo | Medio (Consultor) | Bajo |
| Cierra el exceso de Consultor | No | **Si** | No |
| Cierra el riesgo de ofertas | No | **Si** | No |
| Requiere coordinar con Engagement | No | **Si** | No |
| Expuesto a retrabajo por el dominio en construccion | Si, en Mapeo | Si, en Mapeo | **No** |
| Decisiones que necesita del PO | Visibilidad | Visibilidad, Consultor, ofertas | Visibilidad |

---

## 13. Hoja de decision

Lo minimo que necesitamos de ti para avanzar. La columna de recomendacion es nuestra propuesta; la ultima es
para que la completes.

| # | Decision | Nuestra recomendacion | Tu decision |
|---|---|---|---|
| 1 | Nombre de los paquetes | Nombres propios con prefijo por modulo, distintos de los roles | |
| 2 | Que hacer con el rol sobrante `GestorCurricular` | Retirarlo en este ticket | |
| 3 | Que roles ven **Diseño Curricular** | Los cuatro curriculares y Admin | |
| 4 | Que roles ven **Mapeo Curricular** | Los cuatro curriculares y Admin | |
| 5 | El vinculo rol a paquete | Uno a uno, espejo de lo actual (seccion 10) | |
| 6 | Alcance de Mapeo Curricular: igual o distinto al de Diseño | Igual por ahora, diferenciarlo cuando su dominio cierre | |
| 7 | El acceso total de `Consultor` | Retirarlo, **si confirmas que nadie opera con ese rol** | |
| 8 | El permiso de ofertas del `Diseñador` | Acotarlo, coordinando con Engagement | |
| 9 | Que propuesta seguimos | **B**, y si el sprint aprieta, **C** | |

### Lo que avanza sin esperar ninguna de estas respuestas

El **permiso de instituciones** (criterio 2 del ticket). Hoy un Diseñador Curricular no puede crear un plan de
estudio y se esta resolviendo entrando como Admin, que es un parche. Ese arreglo no depende del mapa, ni de
los nombres, ni de la visibilidad. **Lo empezamos ya salvo que nos digas lo contrario.**

---

## Anexo A. Que puede hacer cada rol curricular hoy

Es la base para armar los paquetes: **el paquete de cada rol deberia reproducir esta fila**, si el criterio es
que nadie gane ni pierda permisos.

Leido del ambiente el 2026-08-17. Vacio significa que el rol no tiene ningun permiso sobre eso.

| Sobre que | Consultor Curricular | Revisor Curricular | Diseñador Curricular | Autoridad Curricular |
|---|---|---|---|---|
| **Programa academico** (carrera) | ver | ver | ver, crear, modificar, clonar | ver, eliminar |
| **Plan de estudio** | ver | ver, aprobar | ver, crear, modificar, clonar, versionar | ver, aprobar, publicar, revertir, deprecar, archivar, eliminar |
| Estado del plan de estudio | | modificar | | modificar |
| **Programa de asignatura** (curso) | ver, auditar | ver, auditar, aprobar | ver, auditar, crear, modificar, versionar | ver, auditar, aprobar, publicar, revertir, deprecar, archivar, eliminar |
| Estado del programa de asignatura | | modificar | | modificar |
| **Silabo** | ver | ver | ver, crear, modificar | ver, publicar, revertir, archivar, eliminar |
| Estado del silabo | | | | modificar |
| **Secciones del silabo** | ver, auditar | ver, auditar | ver, auditar, crear, modificar, clonar | ver, auditar, eliminar |
| **Entradas de la malla** | ver | ver | ver, crear, modificar | ver, eliminar |
| **Requisitos** | ver | ver | ver, crear, modificar | ver, eliminar |
| **Categorias de requisitos** | ver | ver | ver, crear, modificar | ver, eliminar |
| **Referencias bibliograficas** | ver | ver | ver, crear, modificar, clonar | ver, eliminar |
| **Vinculos curriculares** | ver, auditar | ver, auditar | ver, auditar, crear, modificar | ver, auditar, eliminar |
| **Matriz de competencias** | ver | ver, aprobar, cambiar estado | ver, crear, modificar | ver, aprobar, publicar, revertir, deprecar, archivar, cambiar estado |
| **Esquema de niveles** | ver | ver | ver, crear, modificar, versionar | ver, eliminar |
| **Escala de cobertura** | ver | ver | ver, crear, modificar | ver, eliminar |
| **Historial de cambios** | ver | ver | ver | ver |
| **Nombre de usuario** | ver | ver | ver | ver |
| Acceso al modulo Diseño Curricular | ver | ver, aprobar | ver, editar | ver, aprobar, publicar |
| Acceso al modulo Mapeo Curricular | ver | ver | ver, editar | ver |
| **Instituciones** | **ninguno** | **ninguno** | **ninguno** | **ninguno** |

**Lo que salta a la vista, y es util para decidir:**

- **Los cuatro roles ya trabajan sobre los dos modulos.** Todos tienen permisos de Mapeo Curricular, no solo
  de Diseño Curricular. Cuando se armen los paquetes, hay que repartir esta fila **entre los dos paquetes**
  de cada rol, no duplicarla.
- **Diseñador y Autoridad son casi del mismo tamaño pero hacen cosas distintas.** Diseñador crea y modifica;
  Autoridad casi no crea, pero es el unico que elimina y el que gobierna publicaciones. No son un rol
  "mayor" y otro "menor": son dos ejes.
- **Revisor es muy acotado:** ver, auditar y aprobar. Su unico poder de escritura es cambiar el estado de
  planes, cursos y matrices.
- **Ningun rol tiene permisos sobre instituciones**, que es exactamente lo que rompe la creacion de planes de
  estudio (criterio 2 del ticket).

### Glosario de acciones

| Accion | Que significa |
|---|---|
| ver | Listar y abrir el detalle |
| crear / modificar | Alta y edicion de contenido |
| eliminar | Borrado |
| clonar | Copiar un registro existente como punto de partida |
| versionar | Crear una version nueva conservando la anterior |
| aprobar | Aprobar contenido enviado a revision |
| publicar | Dejar el contenido vigente |
| revertir | Volver a un estado anterior |
| deprecar / archivar | Retirar de uso sin eliminar |
| cambiar estado | Mover el registro en su ciclo de vida |
| auditar | Ver el historial de cambios de ese objeto |
| editar (a nivel modulo) | Permiso general de edicion dentro del modulo |

---

## Anexo B. Los otros roles y su alcance curricular

| Rol | Permisos curriculares | Permisos sobre instituciones | Total en la plataforma |
|---|---|---|---|
| Admin | 166 | 4 | 776 |
| **Consultor** | **166** | 4 | 769 |
| Autoridad Curricular | 54 | 0 | 56 |
| Diseñador Curricular | 53 | 0 | 55 |
| Revisor Curricular | 25 | 0 | 27 |
| Consultor Curricular | 18 | 0 | 20 |
| Coordinador | 4 (solo ofertas, y son las de Engagement) | 4 | 46 |
| Colaborador | 0 | 0 | 0 |

Contexto de las acciones de Consultor en el dominio curricular, para dimensionar la alerta de la seccion 6:
sobre programas academicos, planes de estudio, programas de asignatura y matriz de competencias tiene
**ver, crear, modificar, eliminar, publicar, aprobar, revertir, deprecar, archivar, versionar y clonar**. Es
decir, el conjunto completo.

---

## Anexo C. Los paquetes que existen hoy

Los dos son de prueba, ambos en Diseño Curricular, y ninguno sirve para el trabajo real.

| Paquete | Contenido | Para que se creo |
|---|---|---|
| LectorCurricular | Ver nombre de usuario y un solo campo de programa academico | Validar que la herencia entre paquetes funcionara |
| GestorCurricular | Lo anterior mas ver programa academico | Validar que al vincular Coordinador a este paquete apareciera "Programas academicos" en su menu |

Comparados con el anexo A, se ve la distancia: el paquete mas completo que existe hoy tiene 3 permisos,
mientras el rol mas acotado de verdad tiene 18.

---

## Anexo D. Los vinculos que existen hoy

| Modulo | Roles con vinculo creado | Con paquete asignado |
|---|---|---|
| Engagement | 9 | 0 |
| uP1 Manager | 4 | 0 |
| Academic Scheduling | 3 | 0 |
| **Diseño Curricular** | **0** | 0 |
| **Mapeo Curricular** | **0** | 0 |

Los 16 vinculos existentes se crearon pero **ninguno tiene paquete**: el mecanismo esta disponible y sin usar
en toda la plataforma. Y los dos modulos curriculares no tienen ni vinculos, que es la razon por la que hoy
se ven con cualquier rol (seccion 8).

---

## Anexo E. Seguir como estamos hoy, o migrar a lo que espera up1

Este anexo es autocontenido: explica los dos conceptos, como se relacionan, y compara el estado actual con el
que el modelo de la plataforma espera. Sirve para responder la pregunta de fondo: **que ganamos y que cuesta
migrar, y que pasa si no lo hacemos.**

### E.1 Que es un rol

Es una **identidad que se le asigna a una persona**. Existe una sola lista por institucion, es la que el
cliente reconoce y nombra en su propio vocabulario, y es lo que alguien "es" en el sistema: Diseñador
Curricular, Coordinador, Admin.

Una persona puede tener varios roles. Cuando opera con uno seleccionado, ese rol es el que manda: los
permisos **no se acumulan** con los de sus otros roles.

### E.2 Que es un paquete de permisos

Es un **conjunto de permisos con nombre que un modulo define para si mismo**. No se le asigna a ninguna
persona, nunca: no existe forma de que alguien "tenga" un paquete.

Llega a una persona solo de forma indirecta: un rol, **en un modulo determinado**, apunta a un paquete, y en
tiempo de ejecucion los permisos de ese paquete se suman a los de esa persona mientras opera ahi.

### E.3 Como se relacionan

**El rol es el cargo que la institucion te da. El paquete es el juego de llaves que un edificio le entrega a
ese cargo.** La persona lleva el cargo consigo; cada edificio decide que llaves le corresponden a ese cargo
dentro de sus paredes. El mismo cargo puede abrir cosas distintas en dos edificios, y nadie "es" un juego de
llaves.

En que se parecen: los dos son entidades con nombre que cargan permisos, y los dos terminan afectando que
puede hacer una persona. Ese parecido es el que genera la confusion.

En que se diferencian:

| Eje | Rol | Paquete |
|---|---|---|
| A quien se asigna | A una **persona** | A un **rol**, y solo dentro de un modulo |
| Alcance | Global a la institucion: una sola lista | **Por modulo**. El mismo nombre puede existir en dos modulos significando cosas distintas |
| Vocabulario | Del negocio, se acuerda con el cliente | Interno del modulo |
| Quien lo ve | Quien asigna personas, y el usuario en su selector de rol | **Solo quien configura el vinculo** |
| Herencia | No tiene | **Si**: un paquete puede extender a otro |
| Cuantos | Una persona puede tener varios roles | Un rol tiene **como maximo un paquete por modulo** |
| Costo de renombrarlo | Toca el vocabulario del cliente y a los asignados | Toca la configuracion del modulo y el vinculo |
| Quien lo gobierna | El cliente y el PO | El equipo del modulo |

### E.4 Lo que tenemos hoy

Los permisos cuelgan **directo del rol**, en una sola bolsa global. Los cuatro roles curriculares mezclan en
esa bolsa lo de Diseño Curricular y lo de Mapeo Curricular, sin separacion posible.

Consecuencias observables, todas verificadas:

| Situacion actual | Efecto |
|---|---|
| Los dos modulos declaran **la misma lista de roles por separado** | Hay una prueba que falla si se desincronizan: cualquier cambio en uno obliga al otro |
| El alcance de un rol es unico para toda la plataforma | **Ningun modulo puede cambiar su propio alcance** sin tocar un rol que el otro tambien declara |
| No se puede diferenciar por modulo | El mismo rol **no puede** tener alcance distinto en Diseño Curricular y en Mapeo Curricular |
| Los permisos son sobre el objeto, no sobre el modulo | Riesgo cross-mod vigente: un Diseñador Curricular puede escribir ofertas de servicio de Engagement |
| Los modulos no tienen roles asignados | **Son visibles para cualquier rol**, sin que nadie lo haya decidido |
| Las capabilities nuevas se asignan solas a los roles por defecto | **El exceso de `Consultor` crece por si solo**: todo lo que declare Mapeo Curricular de aqui en adelante le cae encima |

### E.5 Lo que espera el modelo de up1

Que cada modulo **declare su propio paquete** y que los roles de la institucion apunten a el. El rol queda
como vocabulario del cliente, y el permiso como responsabilidad del modulo que lo entiende.

| Lo que el modelo espera | Que resuelve |
|---|---|
| Cada modulo declara sus paquetes | Cada equipo gobierna su alcance sin tocar nada compartido |
| El vinculo es por modulo | El mismo rol puede tener alcance distinto en cada modulo |
| El rol no carga permisos de modulo | Se termina la duplicacion entre los dos mods y su prueba de paridad |
| La visibilidad se declara | Deja de ser un efecto de la omision |

### E.6 Que significa cada camino

| | Seguir como estamos | Migrar |
|---|---|---|
| **Esfuerzo inmediato** | Ninguno | Armar los paquetes en dos modulos, crear los vinculos, decidir el mapeo, verificar rol por rol y decidir la visibilidad |
| **Riesgo inmediato** | Ninguno | Que alguien pierda permisos o acceso en el corte, si el vinculo no reproduce lo actual |
| **Duplicacion entre mods** | Se mantiene, con su prueba de paridad | Se termina |
| **Alcance por modulo** | Imposible | Habilitado |
| **Riesgo cross-mod de ofertas** | Sigue abierto | Mas facil de razonar, pero **no se resuelve solo** por migrar |
| **Exceso de `Consultor`** | **Crece solo** con cada capability nueva | Es el momento natural de cerrarlo |
| **Visibilidad de los modulos** | Abierta por omision | Declarada a proposito |
| **Costo de no hacerlo** | **Creciente**, no estatico: cada mod nuevo sobre estos objetos suma una copia mas de los roles y mas permisos automaticos a `Consultor` | Se paga una vez |

### E.7 Caminos intermedios, si el sprint no alcanza

No es todo o nada. Tres recortes validos, de menor a mayor:

1. **Solo el permiso de institucion.** Desbloquea la creacion de planes de estudio, que hoy esta rota y se
   parchea entrando como Admin. **No depende del mapeo ni de ninguna decision de este anexo.**
2. **Migrar solo Diseño Curricular** y dejar Mapeo Curricular para cuando su dominio se estabilice, dado que
   sus objetos se estan construyendo en este mismo sprint.
3. **Migrar con convivencia:** armar paquetes y vinculos dejando los permisos actuales en su lugar, verificar
   rol por rol, y retirar los directos recien despues. Es el camino que evita que alguien se quede sin acceso.

### E.8 Dos cosas que conviene saber antes de elegir

**Seriamos los primeros en usarlo.** El mecanismo esta construido y probado por el equipo de plataforma, pero
**ningun modulo de up1 lo usa hoy en produccion**: los 16 vinculos que existen no tienen paquete asignado.
Eso tiene un lado bueno (quedamos como referencia para los demas) y uno a considerar (camino no transitado).

**La prueba del mecanismo en este modulo esta desconectada.** Los dos paquetes que existen son fixtures y su
cadena esta cortada, asi que nadie lo ha ejercitado de punta a punta aca. La verificacion de la migracion hay
que hacerla en serio y no apoyarse en que "ya se probo".

### E.9 Recomendacion

**Migrar, con convivencia (camino 3), y avanzar ya con el permiso de institucion (camino 1) sin esperar
ninguna decision.**

El argumento de fondo no es el beneficio inmediato, que es modesto: es que **el costo de no migrar crece**.
Cada capability nueva engorda automaticamente un rol que ya esta sobre-permisado, cada mod nuevo sobre estos
objetos agrega otra copia de la misma lista de roles, y mientras el permiso siga siendo del rol y no del
modulo, el riesgo cross-mod de ofertas no tiene donde acotarse.

---

## Anexo F. Detalle tecnico

Para el equipo, no para la decision de producto: la lista completa de los 21 roles con sus conteos, la causa
raiz del conflicto con su rastro en el codigo y el historial de commits, el punto ciego de la proteccion de la
plataforma con el fragmento de codigo que lo explica, y las restricciones para elegir la convencion de
nombres. Esta en `sp9/UPONE-1615-inventario-de-roles.md`.
