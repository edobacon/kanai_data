---
id: DOC-kb-sp10-UPONE-1756-detalle-tecnico
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle-tecnico
  - fuente-po
  - referencia-cruzada
  - UPONE-1756
  - UPONE-1769
  - tributacion
---

# UPONE-1756-detalle-tecnico

> **Fuente:** artefacto de detalle tecnico entregado por el PM. URL: https://claude.ai/code/artifact/28f19a04-b7a2-4796-a5be-7a7f579ef3fc. CC: Eduardo Bacon. Guardado en el KB como **referencia cruzada** de los tickets UPONE-1756 y UPONE-1769 (informacion cruzada del PM), no es un contrato generado por nosotros. NOTA DE VALIDACION: este doc usa el nombre `DevelopmentScheme`; el codigo real (PR #23 de UPONE-1753) renombro el objeto a `DevelopmentLevel` (y `PerformanceScale`). Al ejecutar, mandan los nombres del codigo.

**uP1 · Curriculum Mapping · UPONE-1452**

Que objetos, que reglas y que falta para construir la logica de tributacion asignatura ↔ competencia, contrastada contra lo que el mod `curriculum-mapping` ya tiene en el repositorio.

- **Maqueta de referencia**: mockup-curriculum-mapping v29
- **Modelo**: competency-management-proposal v6
- **Repo**: up1/mods/curriculum-mapping
- **Actualizado**: 2026-08-31

## Contenido

01. Punto de partida en el repositorio
02. El objeto de la tributacion
03. Lo que falta en CompetencyNode
04. De donde sale cada dato
05. Reglas de negocio
06. Valores por defecto y validacion
07. El peso del eje 1
08. Filas que el modelo no admite
09. Indicadores y denominadores
10. Permisos
11. Contrato con la maqueta
12. Orden de implementacion

## 01 · Punto de partida en el repositorio

El mod `curriculum-mapping` no esta vacio: tiene la mayor parte de los objetos creados contra el modelo de la propuesta v5. Lo que sigue no es una implementacion desde cero, es un delta.

| Archivo | Estado | Que hay que hacerle |
|---|---|---|
| `objects/CompetencyAlignment.json` | Cambia | Renombrar un campo, agregar el peso y endurecer requeridos. Ver §2 |
| `objects/CompetencyNode.json` | Incompleto | Le faltan los campos sin los cuales la tributacion no se puede validar. Ver §3 |
| `objects/CoverageScheme.json` | Renombra | Pasa a `DevelopmentScheme`. Le faltan sus RecordTypes |
| `objects/LevelScheme.json` | Renombra | Pasa a `PerformanceScale`. No bloquea la tributacion |
| `objects/MatrixAdoption.json` | Existe | Es la precondicion de toda tributacion. Sin cambios |
| `objects/RubricDimension.json` · `RubricDescriptor.json` | Existe | Fuera del alcance de este flujo |
| `objects/CompetencyNodeOwnerUnit` · `ScopeUnit` | Existe | Gobierno y alcance de la matriz. Sin cambios |
| `objects/RecordTypes/` | Incompleto | Estan los de CompetencyNode y LevelScheme. Faltan los de `DevelopmentScheme` |
| `logic/` | Falta | Hay resolvers de matriz, arbol, esquemas y adopcion. **No hay ninguno de tributacion** |

> **Lo importante de esta tabla**
> El objeto de la tributacion existe y es casi correcto. Lo que no existe es **la escritura gobernada** (no hay resolver) y, sobre todo, **la informacion en la competencia contra la cual validar**. Esa es la dependencia dura: sin §3, las reglas de §5 no son verificables.

## 02 · El objeto de la tributacion

Estado real de `CompetencyAlignment.json` y el delta contra lo que el flujo necesita. La primera columna es lo que hay hoy en el repositorio.

| Campo hoy | Queda | Cambio | Por que |
|---|---|---|---|
| `sourceType` (enum) | `sourceType` | Igual | `planEntry` \| `milestone`. Este flujo solo opera `planEntry` |
| `sourceId` | `sourceId` | Igual | FK polimorfica. Para `planEntry` apunta a `curriculum-design/planEntry` |
| `competencyNodeId` | `competencyNodeId` | Se restringe | Solo nodos que se miden. Ver R-3 |
| `level` (integer) | `level` | Condicional | Queda restringido a `sourceType = milestone`. En `planEntry` es vestigial: ese rol lo cumple el nivel de desarrollo |
| `coverageLevelId` | `developmentLevelId` | Renombra | El objeto destino pasa de `CoverageScheme` a `DevelopmentScheme`. Y deja de ser analitico: es el eje sobre el que agrega el motor |
| `contributionType` (nullable) | `contributionType` | Requerido | Obligatorio cuando `sourceType = planEntry`, con default `Develops`. Una tributacion sin tipo no dice si produce evidencia |
| — | `contributionPercentage` | Nuevo | Peso de la asignatura dentro de su nivel. Ver §7 |
| — | `planId` | Nuevo, denormalizado | Derivable por `planEntry.planId`, pero se lee en cada celda y en cada guardado. Ver la nota |

### Indices y unicidad

La restriccion de unicidad que ya esta declarada es exactamente la regla del par unico, asi que no hay nada que agregar ahi:

```
"uniqueConstraints": [["sourceType", "sourceId", "competencyNodeId"]]
```

Los indices actuales son `competencyNodeId`, `coverageLevelId` y `(sourceType, sourceId)`. Hay que agregar el del grupo de peso, que es la consulta mas caliente del flujo:

```
"indexes": [
  "competencyNodeId",
  "developmentLevelId",
  "sourceType, sourceId",
  "planId, competencyNodeId, developmentLevelId"   // grupo del eje 1
]
```

> **Sobre denormalizar el plan**
> Hoy el plan no esta en el objeto: se llega por `sourceId → planEntry.planId`. Eso alcanza para leer una fila, pero el flujo consulta permanentemente por *plan*: el mapa completo del plan, el grupo de peso, los indicadores, y la validacion de adopcion. Con el plan fuera, cada una de esas consultas arrastra un join a otro mod.
>
> **La decision es de quien lo construya**, con el costo a la vista. La recomendacion es guardarlo y mantenerlo consistente en el resolver, no dejarlo a cargo del cliente. Si se resuelve por join, el resto de la spec sigue en pie: solo hay que medir que cuesta esa consulta cuando el plan tiene decenas de asignaturas y varias matrices adoptadas.

> **Un campo que NO hay que agregar**
> La propuesta v6 introdujo `contributesToGraduationProfile`, para distinguir la tributacion que evidencia el logro del perfil de egreso de la que solo desarrolla. **Se retiro y no debe implementarse.** El motor lo filtraba en el eje 4, donde la competencia ya tiene un solo valor y las mediciones individuales ya se fundieron: ahi no queda nada que filtrar. Y su caso motivador, que solo la practica profesional evidencie el perfil, ya lo resuelve `achievementBasis = RepresentativeLevel`.

## 03 · Lo que falta antes, en CompetencyNode

Esta es la dependencia dura del flujo. `CompetencyNode.json` hoy es un arbol desnudo: `recordType`, `name`, `code`, `description`, `position`, `externalId`, `metadata`, `parentId` y `matrixId`. Nada mas.

La tributacion no puede validarse contra eso. Necesita saber dos cosas que hoy el objeto no dice: si la competencia se mide o consolida, y en que tramos se desarrolla.

| Que falta | Donde | Sin esto, que se rompe |
|---|---|---|
| `isDirectlyMeasured` (boolean) | `CompetencyNode`, RecordTypes `Competency` y `SubCompetency` | No hay forma de distinguir una competencia que se mide de una que consolida a sus partes. R-3 no es verificable, y la maqueta deja tributar donde el modelo no lo admite |
| `CompetencyNodeDevelopmentLevel` (tabla de union) | Objeto nuevo: `(competencyNodeId, developmentLevelId, isRepresentative)` | La competencia no declara sus tramos, asi que la tributacion no tiene universo contra el cual restringirse. R-4 y todo el denominador de §9 quedan sin base |
| `developmentSchemeId` | `CompetencyNode`, RecordType `Matrix` | No se sabe de que catalogo salen los niveles de esa matriz |
| `achievementBasis` (enum) | `CompetencyNode`, RecordType `Matrix` | `Aggregation` \| `RepresentativeLevel`. Solo afecta a los indicadores de este flujo, no a la captura. Ver §9 |

#### Reglas sobre los niveles declarados

- Los niveles de una competencia son un subconjunto **no vacio** de los del `developmentScheme` de su matriz.
- Un nodo que consolida **no declara niveles**: los declaran sus hojas y el consolida. Al publicar la matriz se valida que ningun nodo rama declare niveles.
- Con `achievementBasis = RepresentativeLevel`, exactamente uno de los niveles declarados lleva `isRepresentative = true`.
- Una competencia que declara un solo nivel es el caso frecuente, no un borde: apaga el segundo eje de agregacion y hace que el nivel de la tributacion se resuelva solo.

> **Regla de migracion**
> Una competencia que todavia no declara sus tramos hereda **todos** los del esquema, no solo el ultimo. Quedarse con el ultimo invalidaria de golpe toda tributacion ya registrada en los tramos anteriores. Declarar todo preserva lo cargado y deja que la institucion estreche despues, que es una decision suya y no un efecto del cambio.

## 04 · De donde sale cada dato

Las cuatro fuentes que el resolver tiene que consultar antes de aceptar una tributacion, y el mod al que pertenece cada una.

| Dato | Origen | Mod |
|---|---|---|
| El plan de la tributacion | `planEntry.planId → Curriculum` | curriculum-design |
| Las asignaturas elegibles | Entradas de malla del plan, version vigente | curriculum-design |
| Las competencias elegibles | Nodos de matrices con `MatrixAdoption` vigente para ese plan | curriculum-mapping |
| Los niveles elegibles | `CompetencyNodeDevelopmentLevel` de esa competencia | curriculum-mapping (por crear) |

> **Frontera entre mods**
> La tributacion es de Curriculum Mapping, pero se opera desde el registro del plan, que es de Curriculum Design. En la maqueta el usuario nunca cambia de app: la vista de tributacion es un estado mas de Curriculum Design y el limite se cruza con una lectura y una navegacion interna. La implementacion deberia respetar eso: **el objeto no cambia de dueño, la pantalla si vive del lado del plan.**

## 05 · Reglas de negocio

Donde se hace cumplir cada una. Las que dicen *resolver* no pueden quedar solo en el cliente: la maqueta las respeta, pero la escritura gobernada es la que las garantiza.

| # | Regla | Se aplica en |
|---|---|---|
| R-1 | Solo se tributan competencias de matrices con **adopcion vigente** para el plan del `planEntry` | UI al ofrecer · resolver al escribir |
| R-2 | El par (asignatura, competencia) es **unico**. El selector muestra los existentes marcados y bloqueados en vez de permitir duplicar | UI · `uniqueConstraints` (ya esta) |
| R-3 | **Un nodo que consolida no es destino de tributacion.** Su nivel sale de consolidar el de sus hijas, asi que no hay nivel donde posicionarla | UI · resolver |
| R-4 | El nivel de desarrollo debe ser uno de los que **la competencia declaro**. Requerido si declara mas de uno; si declara uno solo, se resuelve por defecto | UI · resolver |
| R-5 | El tipo de contribucion es enum fijo y **obligatorio** en `planEntry`. Nace en `Develops` | UI · resolver · schema |
| R-6 | Solo `Evaluates` y `Both` producen evidencia de logro y participan del peso | Motor · UI |
| R-7 | Retirar una tributacion que sostiene alineaciones de resultados de aprendizaje **no se ejecuta en silencio**: se nombran y el usuario decide | UI · resolver |
| R-8 | Al versionar el plan, la tributacion **no se replica sola: se elige**. Ver abajo | Resolver de versionado de `Curriculum` |
| R-9 | `contributionPercentage` solo se muestra y se guarda si la institucion lo tiene habilitado. Ver §7 | UI · config institucional |
| R-10 | Mover una tributacion de nivel **actualiza** la fila, nunca crea una segunda | UI · resolver |
| R-11 | Todos los criterios de una competencia se evaluan dentro de la asignatura que la tributa. Los criterios **no se tributan uno a uno** | Restriccion del modelo |
| R-12 | Una fila que contradice el diseño **se muestra marcada, no se borra sola**. Ver §8 | UI |

### Que pasa al versionar el plan

La tributacion **no se arrastra sola**. Al versionar, quien tenga permiso de tributacion elige entre dos caminos:

- **Replicar el mapa** a la version nueva.
- **Empezar sin tributacion**, dejando la version nueva vacia.

Es una eleccion y no una regla fija porque las dos situaciones son reales y opuestas: una version que solo corrige la bibliografia quiere el mapa intacto, y una que rehace la malla quiere partir limpio. Forzar cualquiera de las dos obliga a deshacer trabajo.

> **Replicar es remapear, no copiar**
> `sourceId` apunta a un `planEntry` de la version anterior. La copia tiene que apuntar al `planEntry` **equivalente** de la version nueva, el de la misma actividad. Las filas cuya asignatura ya no esta en la malla nueva no tienen a donde ir: se descartan y **se reporta cuantas**. Es trabajo que se pierde, y quien versiona tiene que enterarse en el momento, no descubrirlo despues mirando un indicador que bajo.

Quien no tiene permiso de tributacion no ve la opcion y **se replica**. Es el default seguro: perder el mapa entero por omision es peor que arrastrarlo, y quien no puede tributar tampoco podria reconstruirlo. *Este default es una inferencia, no una instruccion recibida: si la institucion prefiere lo contrario, es un parametro y no un cambio de diseño.*

## 06 · Valores por defecto y validacion

Las reglas de §5 dicen que tiene que ser cierto. Esta seccion dice con que nace cada campo y que pasa exactamente cuando algo no se cumple, que es lo que hay que escribir en el resolver.

### Con que nace cada campo

Ninguno de estos valores se le pide al usuario al asignar. La captura es un clic, y todo lo demas se resuelve o se hereda.

| Campo | Valor al crear | De donde sale |
|---|---|---|
| `sourceType` | `planEntry` | Constante del flujo. El editor no opera hitos |
| `sourceId` | La asignatura del destino | Contexto de la accion |
| `competencyNodeId` | La competencia del destino | Contexto de la accion |
| `planId` | `planEntry.planId` | Derivado. Lo escribe el resolver, nunca el cliente |
| `developmentLevelId` | El unico que declara la competencia; si declara varios, el del destino | Se resuelve solo cuando no hay nada que elegir. En la grilla lo da la columna; en la malla, el panel |
| `contributionType` | `Develops` | Constante. Es lo minimo que afirma una tributacion: que la asignatura aborda la competencia |
| `contributionPercentage` | `null` | Porque nace en `Develops` y no mide. Ver la transicion abajo |
| `level` | `null` | Solo aplica a `sourceType = milestone` |

#### Cuando la fila empieza a medir

Pasar de `Develops` a `Evaluates` o `Both` mete la fila al grupo de peso, y ahi el default depende del estado del grupo:

- Grupo **automatico**: se reparte parejo incluyendo a la nueva.
- Grupo **manual**: la nueva entra en `0`, no en vacio. La suma queda visiblemente incompleta en vez de pisar en silencio un reparto que alguien decidio.

Al reves, volver a `Develops` devuelve el peso a `null` y recompone el grupo. Lo mismo al mover la fila de nivel: cambia de grupo, asi que se recomponen los dos, el que deja y el que recibe.

#### Defaults de la via masiva

El formulario abre con el nivel en el primero que declara la competencia destino, y el tipo en `Develops`. Los dos valores rigen para todo lo que se marque, y por eso se piden **antes** de la lista: preguntarlos al final obliga a volver a revisar la seleccion para saber con que quedo.

### Que se valida, cuando, y que pasa

El criterio que ordena la tabla es el del modelo: **avisar donde es inusual, bloquear solo donde es imposible, y nunca dejar pasar algo importante en silencio.**

| Que se valida | Cuando | Efecto | Que ve quien lo hace |
|---|---|---|---|
| Adopcion vigente (R-1) | Al ofrecer y al guardar | Bloquea | La competencia no aparece en ninguna parte, ni en la busqueda |
| Par unico (R-2) | Al seleccionar y en la base | Bloquea | En la via masiva, casilla marcada y bloqueada con *ya tributa*. En el lienzo, el destino dice que ya esta |
| Nodo que consolida (R-3) | Al ofrecer y al guardar | Bloquea | La fila entera es inerte y sus celdas dicen *consolida*. La competencia no se puede tomar en mano ni aparece en la via masiva |
| Nivel declarado (R-4) | Al ofrecer y al guardar | Bloquea | La celda queda bloqueada y vacia, con *no se desarrolla aca*. El detalle solo ofrece los niveles declarados |
| Peso entre 0 y 100 | Al escribir | Acota | El campo no admite fuera de rango. Dos decimales |
| El grupo suma 100 | Al publicar el plan, **no** en cada guardado | Bloquea la publicacion | La suma en rojo en la celda y en la ficha, con la accion de repartir en partes iguales |
| Fila fuera del diseño | Permanente, al renderizar | Advierte | Ficha marcada, indicador propio, y el detalle ofrece la salida. **No se borra sola** |
| Retiro con resultados de aprendizaje dependientes (R-7) | Al retirar | Confirma | Se nombran los resultados que quedan sin respaldo, y el usuario decide |
| Salir con cambios sin guardar | Al cambiar de matriz, volver al plan o cerrar la pestaña | Confirma | Tres salidas: seguir trabajando, salir sin guardar, o guardar y salir |
| Competencia derivada sin resultados de aprendizaje en el plan | Al publicar el plan | Reconocimiento explicito | Se nombran las competencias que no seran medibles y hay que confirmar. No bloquea, pero no pasa en silencio |

> **Por que la suma no se valida al guardar**
> La tributacion es una sesion de trabajo: se recorren decenas de asignaturas y el mapa esta incompleto casi todo el tiempo. Validar el 100 en cada guardado convertiria un estado normal de trabajo en un error. El momento en que si tiene que estar cerrado es la publicacion del plan, que es cuando el mapa pasa a ser una afirmacion institucional.

> **Las tres primeras validaciones se hacen dos veces, a proposito**
> La interfaz no ofrece lo que no corresponde, y aun asi el resolver lo vuelve a comprobar. No es redundancia: la via masiva, un import y la API son entradas que no pasan por el lienzo. La regla vive en el resolver; la interfaz solo evita que el usuario llegue a chocar con ella.

## 07 · El peso del eje 1

El motor consolida las asignaturas que evaluan una competencia dentro de un mismo nivel de desarrollo. Ese es el grupo, y el modo `WeightedAvg` pedia un peso que el modelo no definia. `contributionPercentage` es ese peso.

#### El grupo

```
grupo = (planId, competencyNodeId, developmentLevelId)
        filtrado a contributionType ∈ {Evaluates, Both}
```

Una asignatura que solo desarrolla no produce medicion, asi que no se lleva parte del 100 y su peso queda en `null`. Un nodo que consolida no forma grupo: darle peso seria inventarle un rol en un calculo que no existe.

#### La regla del reparto

**Uniforme mientras nadie lo toque; explicito desde que alguien lo toco.**

| Estado del grupo | Al agregar una fila | Al quitar una |
|---|---|---|
| **Automatico** (nadie edito un peso) | Se reparte parejo entre todos. 3 filas a 33,33 pasan a 4 a 25 | Se reparte parejo entre las que quedan |
| **Manual** (alguien edito al menos uno) | La fila nueva entra en **0** y la suma se muestra incompleta | Las demas quedan igual y la suma baja de 100 |

El grupo nace automatico. Basta con editar un peso para que pase a manual, y hay una accion de *repartir en partes iguales* que lo devuelve a automatico. Cambiar el tipo de contribucion o mover la fila de nivel la cambia de grupo, asi que hay que recomponer los dos: el que deja y el que recibe.

> **Que se persiste y que no**
> Se persiste el **porcentaje de cada fila**. El estado automatico/manual del grupo es de interfaz y no se guarda: se puede derivar comparando si todos los pesos del grupo son iguales dentro de la tolerancia. Si se decide persistirlo, es un campo del grupo y no de la fila, y hoy el grupo no tiene objeto propio.

#### Convencion numerica

- Porcentaje con 2 decimales, suma 100 dentro del grupo, tolerancia 0,01. Es la misma convencion que los otros pesos del modelo.
- El resto de la division cae en la ultima fila: 3 filas dan 33,33 / 33,33 / 33,34.
- La validacion de que el grupo suma 100 es **gate de publicacion del plan**, no de cada guardado. Durante la sesion de trabajo el mapa puede estar incompleto.
- Al calcular, el motor renormaliza sobre las filas con evidencia: una asignatura que el estudiante todavia no curso sale del denominador en vez de contar como 0.

> **Lo que este campo NO es**
> El campo viene del legacy (`nm_percentage` de `imp_courses_competencies`), donde cuelga del par (nivel, curso), que es exactamente el grano del eje 1. Pero alla se leia como *cuanto de la competencia abarca el curso*. Aca significa *cuanto pesa su medicion*. Son cosas distintas y la migracion tiene que decidir que hacer con los valores cargados; en la instancia observada venian todos en `null` y el flag institucional en `false`, asi que probablemente no haya nada que migrar.

## 08 · Filas que el modelo no admite

Hay dos formas en que una tributacion puede contradecir el diseño de su matriz. Las dos aparecen en datos migrados o cuando alguien estrecha la matriz despues de tributar, y ninguna se borra sola.

| Estado | Como se llega | Salida que ofrece la interfaz |
|---|---|---|
| **Nivel no declarado** | Alguien desmarco en la matriz un nivel que ya tenia tributaciones | El detalle ofrece los niveles declarados para moverla. Es el camino esperado |
| **Colgada de un nodo que consolida** | Dato migrado, o una competencia que se desagrego despues | No hay nivel al que moverla: se explica y se ofrece retirarla para tributar a la subcompetencia que corresponda |

#### Tratamiento en la interfaz

- La ficha se marca. La celda del nivel no declarado queda **bloqueada y vacia, nunca oculta**: si se ocultara, cada fila tendria un ancho distinto y se perderia la lectura de progresion, que es el punto del artefacto.
- Las filas afectadas se cuentan en un indicador propio, que solo aparece cuando hay algo que arreglar.
- El detalle de una fila colgada de un nodo que consolida **no ofrece nivel, ni contribucion, ni peso**: no hay nada que declarar sobre una fila que el modelo no admite.

> **Consecuencia para el motor**
> Estas filas no deben entrar al calculo. Si una fila colgada de un nodo que consolida evaluara, el motor tendria que emitir un logro para un nodo cuyo valor esta definido como la consolidacion de sus hijas: dos verdades sobre el mismo numero.

## 09 · Indicadores y sus denominadores

El denominador es la parte que mas se equivoca. Se escribe aca con precision porque de el depende que un plan se vea completo o no.

#### Desarrollo tributado

```
celdas   = Σ  sobre competencias medibles de matrices adoptadas
              |niveles que la competencia declara|

cubiertas = Σ  celdas con al menos una tributacion en ese nivel
```

El grano es la **celda declarada**, no la competencia. Una competencia que declara tres tramos y solo tiene quien la introduzca cuenta 1 de 3, no 1 de 1. Ese es el dato que pide acreditacion: no si alguien se hace cargo, sino si hay progresion.

El conteo por competencia se conserva como lectura secundaria, para no perder el numero al que la gente ya estaba acostumbrada.

#### Competencias con evaluador

Una competencia cuenta si alguna de sus tributaciones es `Evaluates` o `Both`. Sin este indicador, un plan puede mostrar cobertura completa y no medir nada.

**Se especializa cuando la matriz define el logro por escalonamiento.** Con `achievementBasis = RepresentativeLevel` el logro de la competencia *es* el del nivel representativo, asi que una competencia con evaluador en los otros tramos y ninguno ahi no produce logro alguno. El indicador generico la contaria como buena, y por eso pasa a ser *con evaluador en el nivel representativo*.

#### Asignaturas sin tributar

Entradas de malla del plan sin ninguna tributacion. Se reporta, no se marca como error: hay asignaturas que la institucion decide no mapear.

#### Fuera del diseño

Filas de §8. Solo aparece si el conteo es mayor que cero.

> **Dos alcances, y hay que declararlos**
> Los mismos indicadores existen en dos lugares con denominadores distintos: en la **vista de lectura del plan** abarcan todas las matrices adoptadas, y en el **componente de tributacion** solo la matriz en la que se esta trabajando. Un indicador que cambia de denominador segun donde se mira, sin decirlo, es peor que no tenerlo.

## 10 · Permisos

El mod ya tiene `capabilities.json` con capabilities a nivel de objeto, siguiendo el patron que dejo UPONE-1454 para `levelscheme`. La tributacion sigue el mismo molde.

| Capability | Riesgo | Que habilita |
|---|---|---|
| `competencyalignment:view` | low | Ver el mapa de tributacion del plan, en sus dos lecturas |
| `competencyalignment:create` | medium | Asignar, por lienzo o por via masiva |
| `competencyalignment:modify` | medium | Cambiar nivel, tipo de contribucion y peso |
| `competencyalignment:delete` | high | Retirar. Arrastra las alineaciones de resultados de aprendizaje que dependian de ella |

Se cablean a los roles curriculares que ya existen, **sin crear roles nuevos**: Consultor Curricular solo lectura; Diseñador Curricular crear, editar y retirar; Revisor y Autoridad lectura mas lo que corresponda al ciclo de vida del plan. El `_data-rbac.js` del mod solo hace `attachCapabilitiesToRole`.

### La capability es de curriculum-mapping, aunque la pantalla sea de curriculum-design

Es la misma frontera de §4, ahora del lado de los permisos. La tributacion se opera desde el registro del plan, que vive en Curriculum Design, pero el objeto es de Curriculum Mapping y por lo tanto **el permiso tambien**. Las capabilities se declaran en `curriculum-mapping/capabilities.json`, junto a las de los esquemas y la matriz.

Lo que hace la vista del plan es **consultar** esa capability para decidir que muestra:

| Que se muestra en el plan | Capability que lo gobierna |
|---|---|
| La pestaña *Tributacion* y sus indicadores | `competencyalignment:view` |
| El boton *Tributar* y el editor | `competencyalignment:create` o `:modify` |
| El detalle en modo lectura | `competencyalignment:view` |
| Los controles del detalle y la x de la ficha | `:modify` y `:delete` |

> **El principio, para no volver a discutirlo**
> **La pantalla no otorga permiso.** Que una funcionalidad se exprese en una vista de otro mod no la hace de ese mod: gobierna el dueño del objeto. Un usuario con acceso completo a Curriculum Design y sin la capability de Curriculum Mapping **no ve la pestaña**, no la ve vacia.
>
> El corolario practico es que Curriculum Design tiene que poder preguntar por una capability de otro mod al renderizar el registro del plan. Si eso no esta resuelto en la plataforma, es una dependencia a levantar antes de la fase 4.

## 11 · Contrato con la maqueta

Que elemento de la maqueta corresponde a que pieza, para que la implementacion no tenga que inferirlo.

| En la maqueta | Que es |
|---|---|
| Pestaña *Tributacion* del plan | Solo lectura. Indicadores, filtro por matriz y las dos lecturas del mapa |
| Boton *Tributar* | Entra al editor sin paso intermedio. Sin matriz preseleccionada, muestra un vacio bajo el selector |
| Grilla competencia × nivel | Forma A. La celda es el destino y define el nivel en el mismo acto de asignar |
| Malla por periodo | Forma B. La tarjeta es el destino; el nivel se elige junto a la competencia que se toma |
| Ficha `CODIGO · NIVEL · CONTRIBUCION` | Una fila de `CompetencyAlignment`. Mismo orden y mismo significado en las cuatro vistas |
| Panel de detalle | El mismo en lectura y en edicion. Desde el plan abre sin controles; desde el editor, con ellos |
| Boton *Varias* | Via masiva desde el destino. Primero los dos campos generales, despues la lista |
| Aviso de cambios sin guardar | Guardado global: la tributacion es una sesion de trabajo, no una edicion por fila |

#### Modelo transaccional

Las asignaciones del lienzo y del selector masivo **no escriben al instante**. Actualizan el mapa en memoria, alimentan los indicadores en vivo y marcan el estado como sucio. Al guardar se envia el mapa completo del plan para esa matriz. Eso es lo que permite armar la tributacion entera y revisarla antes de comprometerla, y es tambien como funciona el componente legacy.

Consecuencia para el resolver: la operacion de guardado es un **upsert de conjunto** por (plan, matriz), no una secuencia de altas y bajas individuales.

## 12 · Orden de implementacion

El orden no es negociable en su primer tramo: la tributacion se valida contra la declaracion de la competencia, asi que esa va primero.

**F1 · La competencia declara**
`isDirectlyMeasured` en `CompetencyNode`, el objeto `CompetencyNodeDevelopmentLevel`, `developmentSchemeId` en el RecordType `Matrix`, y los RecordTypes que le faltan a `DevelopmentScheme`. Sin esto, nada de lo que sigue es verificable.

**F2 · El objeto de la tributacion al dia**
Rename de `coverageLevelId`, `contributionPercentage`, `planId`, requeridos condicionales por `sourceType` e indice del grupo. Migracion de las filas existentes.

**F3 · Escritura gobernada**
El resolver que hoy no existe: upsert de conjunto por (plan, matriz), con R-1 a R-5 y R-10, y el reparto del peso de §7. Es donde vive todo lo que el cliente no puede garantizar.

**F4 · Lectura del plan**
La pestaña con sus indicadores, el filtro por matriz, las dos lecturas y el detalle en solo lectura. Es la mitad que se puede entregar antes de que exista el editor.

**F5 · El editor**
Las dos formas con el patron en mano, el detalle editable, la via masiva y el guardado global con sus guardias.

**F6 · Lo que depende de la tributacion**
`outcomeAlignment`, que es refinamiento de esta relacion y se opera desde el Programa de Asignatura, y R-7 con su resguardo.

---

**Trazabilidad.** Estado del repositorio leido de `repositories/uP1/up1/mods/curriculum-mapping` y `curriculum-design`. Modelo de dominio en `competency-management-proposal_v6.md` y `matriz-competencia-implementacion_v2.md`. Comportamiento de referencia en la maqueta `mockup-curriculum-mapping`, linea v11 a v29, cuyo registro de decisiones vive en la cabecera del propio archivo.

Las reglas y los denominadores de este documento estan verificados contra la maqueta corriendo, no solo escritos.
