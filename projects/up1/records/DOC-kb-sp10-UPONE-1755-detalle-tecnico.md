---
id: DOC-kb-sp10-UPONE-1755-detalle-tecnico
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle-tecnico
  - fuente-po
  - referencia-cruzada
  - UPONE-1755
  - pestana-medicion
---

# UPONE-1755-detalle-tecnico

> **Fuente:** artefacto de detalle tecnico entregado por el PM. URL: https://claude.ai/code/artifact/b60fb219-b59e-48d4-b032-0a376e31430f. CC: Francisco Navarro. Guardado en el KB como **referencia cruzada** de los tickets (informacion cruzada del PM), no es un contrato generado por nosotros. A validar contra el codigo/PR al ejecutar.

**UPONE-1755** · Epica UPONE-1452 · Historia

**Asignado:** Francisco Navarro
**Componente:** CompetencyMatrixShell
**Layouts:** create, edit, view
**Maqueta:** v29

Que cambia en el shell de la matriz para abrir una cuarta pestana, que decision hay que tomar sobre el orden de guardado, y como queda cada una de las otras tres. Contrastado contra el shell que ya existe en el repositorio.

## Indice

1. Alcance
2. Como funciona el shell
3. Hoy y objetivo
4. El flujo de creacion
5. Impacto por pestana
6. Campos y mutation
7. Reglas de combinacion
8. Orden de ejecucion

## 1. Alcance

La matriz de competencia se edita en un shell propio de tres pestanas. El ticket abre una **cuarta, Medicion**, y mueve a ella todo lo que responde *con que se mide y como se consolida el logro*. Eso no es solo mover campos: cambia **que se pide para crear una matriz**, y de ahi sale la unica decision de diseno del ticket.

| Parte | Que implica |
|---|---|
| **La pestana** | Declarar `medicion` en los tres layouts y repartir los elementos entre las cuatro pestanas |
| **El flujo de creacion** | Decidir si la medicion se pide antes de que la matriz exista o despues, y ajustar la mutation en consecuencia |
| **Los campos** | Seis campos nuevos en el record type de la matriz, uno retirado, y un valor de enum renombrado |

> **Depende de UPONE-1753**
> El renombre de los catalogos (`LevelScheme` → `PerformanceScale`, `CoverageScheme` → `DevelopmentScheme`) va en el otro ticket. Este documento usa los **nombres nuevos**, porque la pestana Medicion es donde los dos catalogos se seleccionan y no tiene sentido construirla con el vocabulario viejo.

## 2. Como funciona el shell hoy

Conviene entenderlo antes de repartir pestanas, porque el shell ya resolvio los problemas dificiles y la solucion esta documentada en el codigo. Las pestanas **se declaran en el layout**, no en el componente: `modsComponents/CompetencyMatrixShell/tabs.ts` define el contrato y el elemento `matrixShell` del schema las recibe.

| Propiedad | Que hace |
|---|---|
| `key` | Identificador de la pestana |
| `label` / `labelKey` | Etiqueta literal o clave i18n. `labelKey` gana |
| `elements` | Los nombres de los elementos hermanos del schema que forman su cuerpo |
| `save` | Como persiste. Es el discriminante por el que despacha el shell |
| `requiresRecord` | La pestana necesita que el registro exista. En creacion queda **bloqueada con su motivo**, no escondida |
| `requiredCapability` | Capability para *ver* la pestana. No es la garantia: el backend rechaza igual |

### Los cuatro modos de guardado

| `save` | Como persiste |
|---|---|
| `matrixHeader` | `createCompetencyMatrixValidated` si no hay registro, `updateCompetencyMatrixValidated` si ya existe, **por apollo** |
| `adoptionScope` | `setMatrixAdoptionScopeValidated`, mutation propia del alcance |
| `competencyTree` | `upsertCompetencyTreeValidated` |
| `form` | `form$.submit()` del core, que corre el `customEndpoint` del layout |
| `none` | La pestana persiste por su cuenta: no se dibuja Guardar |

> **Dos trampas que el shell ya esquivo, no volver a pisarlas**
>
> **Por que `matrixHeader` no usa el submit del core.** El `customEndpoint` del layout hace lo mismo, pero al terminar emite `instance-created` y la pagina del suite **navega al listado**. En creacion eso es incompatible con el flujo: el id recien existe despues de guardar, y es justo lo que las otras pestanas necesitan para desbloquearse. Se perderia la pantalla en el mismo momento en que se habilitan.
>
> **Por que el alcance tiene su propia mutation.** El `updateInstance` del core persiste el satelite del recordType con un `upsert`, y Prisma valida su rama `create` de forma **estatica** aunque la fila exista. Mandar solo los campos del alcance fallaba con `Argument matrixType is missing`. Cualquier pestana nueva que quiera guardar *parcialmente* el recordType se topa con lo mismo.

## 3. Las pestanas: hoy y objetivo

El reparto actual, tomado de los layouts:

| Pestana | `save` | Elementos |
|---|---|---|
| `general` | `matrixHeader` | `code` `name` `matrixType` `levelSchemeId` `defaultEvaluationMode` `defaultRubricModel` `aggregationMode` `description` `ownerUnits` (+ status en edit) |
| `adopcion` | `adoptionScope` | `adoptionScope` `adoptionPolicy` `scopeUnits` `adoptions` |
| `competencias` | `competencyTree` | `competencies` |
| `historial` (solo view) | `none` | `historyList` · gate `core_datalog:view` |

El objetivo: **cuatro campos salen de `general`** y se juntan con seis nuevos en `medicion`. Informacion general se queda con lo que responde *que es* la matriz: identidad y gobernanza.

| Pestana | Pregunta que responde | Elementos |
|---|---|---|
| `general` | Que es esta matriz | `code` `name` `matrixType` `description` `ownerUnits` `status` |
| `adopcion` | Quien la usa | sin cambios |
| `medicion` (nueva) | Con que se mide y como se consolida | `performanceScaleId` `developmentSchemeId` `measurementModel` `requiresAllCriteria` `achievementBasis` y los tres ejes |
| `competencias` | Que contiene | sin cambios en elementos, con una dependencia nueva (§5) |

El **orden** no es indiferente: Medicion va antes de Competencias porque el arbol depende de ella. La rubrica se dibuja como criterio × nivel de desempeno, y los niveles de desarrollo que una competencia puede declarar son los del catalogo elegido. Entre Adopcion y Medicion no hay dependencia, asi que ahi el orden es de lectura: `general · adopcion · medicion · competencias`, como en la maqueta.

## 4. El flujo de creacion

Aca esta la decision del ticket. Hoy la mutation de creacion **recibe los cuatro campos de medicion**, porque viven en `general` y se guardan con ella:

```
// default_CompetencyNode_create.json, customEndpoint, hoy
"mutation": "createCompetencyMatrixValidated",
"variables": {
  "code": ..., "name": ..., "matrixType": ..., "description": ..., "ownerUnits": ...,
  "levelSchemeId": ...,            // se va a Medicion
  "defaultEvaluationMode": ...,    // se va a Medicion
  "defaultRubricModel": ...,       // se va a Medicion
  "aggregationMode": ...           // se retira (§6)
}
```

Si Medicion es una pestana con `save: matrixHeader` como `general`, las dos guardan por la misma mutation, y en **creacion** eso obliga a elegir:

| Opcion | Que pasa en creacion | Costo |
|---|---|---|
| **A** · Medicion con `requiresRecord: true` | La matriz se crea con identidad y gobernanza. Medicion se desbloquea con el id, y guarda por `updateCompetencyMatrixValidated` | La matriz existe un rato **sin escala de desempeno**: el modelo tiene que permitirlo y la publicacion tiene que exigirlo |
| **B** · Medicion sin `requiresRecord` | Las dos pestanas se pueden guardar antes de que exista el registro, y la primera en guardar crea la matriz | La mutation necesita **todos** los campos obligatorios en cualquiera de los dos ordenes, o falla como fallo el alcance |
| **C** · Pedirlo todo en `general` al crear | Creacion como hoy; Medicion solo aparece en edicion y vista | La creacion y la edicion dejan de tener la misma forma, que es lo que el shell venia cuidando |

#### Recomendacion: A

Es la que sigue el patron que el shell ya usa dos veces. Adopcion y Competencias son `requiresRecord: true` por la misma razon (necesitan el id), y la decision de **bloquear en vez de esconder** ya esta tomada y justificada en el codigo: *una pestana ausente no explica nada, y una bloqueada con su motivo a la vista le dice al usuario que el paso existe y en que orden va*. Medicion entra en esa misma familia sin inventar nada.

La B parece mas flexible y es la que trae el problema conocido: guardar parcialmente el recordType falla porque Prisma valida la rama `create` de forma estatica. Es exactamente el bug que obligo a darle mutation propia al alcance.

> **La consecuencia de A que hay que aceptar explicitamente**
> Una matriz recien creada queda **en Borrador y sin escala de desempeno**. Eso exige dos cosas coherentes entre si:
> - `performanceScaleId` y `developmentSchemeId` pasan a ser **obligatorios para publicar**, no para crear. Es el mismo criterio que ya rige los pesos del arbol: se avisa mientras se edita y se bloquea en la transicion de estado.
> - La pestana **Competencias necesita la escala antes de poder operar**: sin ella la rubrica no tiene columnas. Ver §5.

El resultado es un flujo de creacion en cuatro pasos, con el mismo orden en que se declaran las pestanas, y cada paso habilitando el siguiente:

```
1. general      crea la matriz  →  devuelve el id
2. medicion     requiere id     →  define escala, niveles y consolidacion
3. adopcion     requiere id     →  quien la usa
4. competencias requiere id + escala  →  el arbol y sus rubricas
```

## 5. Impacto por pestana

### Informacion general

Pierde cuatro elementos y se queda con seis. No cambia su `save`. El efecto secundario bueno es que la creacion pide lo minimo para que la matriz exista, que es lo que un primer paso deberia pedir.

### Medicion

Nueva, `save: matrixHeader`, `requiresRecord: true`. Dos cosas que la maqueta resolvio y conviene copiar tal cual:

- **El modelo de medicion es una sola eleccion de tres valores**, no dos selects. Detras hay dos campos, pero solo tres de sus cuatro combinaciones son validas, asi que pedirlos por separado le hace armar al usuario algo que el dominio ya tiene cerrado.
- **La cobertura de criterios aparece solo con el modelo por criterios.** Es la excepcion a la convencion de dejar los campos que no aplican bloqueados y vacios, y se justifica porque el campo que decide su aplicabilidad es el de al lado y el valor queda en `null`.

### Competencias

**Es la que mas cambia sin que le muevan un solo elemento.** Hoy se desbloquea con el id; con Medicion aparte, necesita ademas que la escala este definida, porque la grilla de rubrica es criterio × nivel de desempeno y los niveles de desarrollo que un nodo puede declarar salen del catalogo elegido.

El contrato de pestana tiene `requiresRecord`, pero **no tiene un `requiresField`**. Hay dos caminos y conviene decidirlo con el tech lead:

| Camino | Que implica |
|---|---|
| Extender el contrato del shell | Un `requiresFields: string[]` junto a `requiresRecord`, con el mismo tratamiento de bloqueo y motivo. Sirve para cualquier dependencia futura entre pestanas |
| Guardia dentro del editor del arbol | El componente muestra su propio estado vacio si no hay escala. Mas rapido, pero la pestana se ve habilitada y el usuario descubre el bloqueo al entrar |

La primera es coherente con lo que el shell ya hace, y es la que deja el motivo visible antes de entrar.

### Adopcion

Sin impacto: su mutation y sus campos son independientes de la medicion. Se menciona para cerrar la revision, no porque haya trabajo.

### Historial (solo vista)

Sin cambios de declaracion. Va a empezar a registrar los campos nuevos, que es lo esperado; vale confirmar que `enableDataLog` los cubra.

### Vista

El layout de vista necesita la cuarta pestana con `save: none`, y ahi Medicion se muestra en solo lectura. Es el layout que mas facil se olvida, porque el trabajo se siente terminado cuando creacion y edicion funcionan.

## 6. Campos nuevos, retirados y la mutation

Todo esto vive en `objects/RecordTypes/rt__Matrix__competencynode.json`. Lo que hay hoy son ocho campos; la pestana Medicion necesita seis mas y retirar uno.

| Campo | Valores | Estado |
|---|---|---|
| `performanceScaleId` | FK a la escala de desempeno | existe como levelSchemeId |
| `developmentSchemeId` | FK a los niveles de desarrollo | nuevo |
| `defaultEvaluationMode` | `OwnRubric · DerivedFromOutcomes` | existe, sin el prefijo `default` |
| `defaultRubricModel` | `Holistic · Analytic` | existe, hoy dice `Criterion` |
| `requiresAllCriteria` | booleano | nuevo |
| `achievementBasis` | `Aggregation · RepresentativeLevel` | nuevo |
| `courseAggregationMode` | `WeightedAvg · Max` | nuevo |
| `developmentLevelAggregationMode` | `WeightedAvg · Max`, `null` con nivel representativo | nuevo |
| `subcompetencyAggregationMode` | `WeightedAvg · Max` | nuevo |
| `aggregationMode` | `Min · Max · WeightedAvg · Mode · Last` | se retira |

#### Por que un eje pasa a tres

Una competencia con tres niveles de desarrollo, tributada en varias asignaturas por nivel, produce muchas mediciones de si misma. Un solo `aggregationMode` no alcanza para reducirlas: hay que combinar **entre asignaturas del mismo nivel**, despues **entre niveles**, y despues **entre subcompetencias**. Los tres ejes se apagan solos segun la forma del diseno (un nivel unico apaga el segundo, la ausencia de subcompetencias apaga el tercero), asi que no hay que configurar nada para que eso ocurra.

Y los modos bajan de cinco a dos: `Mode` y `Last` no tenian caso institucional. `Min` si lo tiene y su retiro es **una consecuencia declarada**: es la regla conjuntiva de acreditacion, asi que mientras no este, una matriz ABET no es representable.

> **Las plantillas no son modelo**
> Los cuatro perfiles de la maqueta (Estandar, Escalonado, Mejor evidencia, Personalizada) son **solo interfaz**: pre-llenan los campos y no se persisten. Se descarto modelarlos como objeto porque un perfil vinculado que cambia recalcularia los logros de todas las matrices vigentes que lo usan.

#### La mutation cambia de firma

Sacar `aggregationMode` y agregar seis campos toca `createCompetencyMatrixValidated` y `updateCompetencyMatrixValidated`, sus variables en el `customEndpoint` de los layouts, y los validadores. Si se adopta la opcion A de §4, la de creacion ademas **deja de recibir los campos de medicion**: los escribe la de actualizacion cuando se guarda la pestana.

## 7. Reglas de combinacion

Son las que hay que escribir como validaciones, y la buena noticia es que el espacio es mas chico de lo que parece: **el modelo de medicion y la consolidacion son ortogonales por construccion**. El modelo produce *un valor por competencia y por asignatura*, y los tres ejes empiezan a operar recien a partir de ese valor. Ningun eje mira como se formo el numero.

| Modelo de medicion | Eje 1 · entre asignaturas | Base + eje 2 · entre niveles | Eje 3 · entre subcompetencias |
|---|---|---|---|
| Competencias | aplica | aplica | aplica |
| Competencias y criterios | aplica | aplica | aplica |
| Competencias y resultados de aprendizaje | aplica | aplica | aplica |

Las 3 × 6 combinaciones son legales. **No hay que escribir ninguna regla que prohiba un modelo con un modo de consolidacion**, y conviene saberlo antes de empezar a inventarlas.

### El modelo de medicion: tres estados validos de cuatro posibles

Detras del selector hay dos campos, y su producto da cuatro combinaciones de las que solo tres significan algo:

| Opcion | `evaluationMode` | `rubricModel` | |
|---|---|---|---|
| Competencias | `OwnRubric` | `Holistic` | valida |
| Competencias y criterios | `OwnRubric` | `Analytic` | valida |
| Competencias y resultados de aprendizaje | `DerivedFromOutcomes` | `null` | valida |
| (ninguna) | `DerivedFromOutcomes` | cualquier valor | no significa nada |

Hoy la cuarta se evita **normalizando `rubricModel` a `null`** cuando el modo no es `OwnRubric`. Es una regla que hay que recordar en cada escritura, y por eso queda anotada la alternativa: un enum unico de tres valores la haria imposible por construccion. No es de este ticket, pero si se decide, este es el momento barato.

### Los tres condicionamientos que si existen

Ninguno es entre modelo y eje: dos son internos y el tercero es entre la *escala* y el eje.

| Regla | Cuando | Comportamiento |
|---|---|---|
| `requiresAllCriteria` solo existe con criterios | `rubricModel != Analytic` | El campo **no se muestra** y queda en `null`. Es del instrumento, no de la consolidacion |
| La base del logro apaga el eje 2 | `achievementBasis = RepresentativeLevel` | `developmentLevelAggregationMode` queda en `null`. Vale igual en los tres modelos |
| Escala cualitativa contra promedio ponderado | La escala no tiene numero detras y algun eje esta en `WeightedAvg` | **Bloquea el guardado.** Antes era un aviso; con los tres ejes rigiendo toda la matriz, ya no hay otra opcion que ofrecer dentro del mismo eje |

Del tercero se sigue una consecuencia practica: el mensaje puede **nombrar los ejes concretos** que hay que corregir, porque la escala y los ejes viven en la misma pestana. Con nivel representativo, el eje 2 no se nombra: no interviene.

> **La trampa: los ejes nunca entran a la asignatura**
> Dentro de una asignatura, los criterios y los RA se combinan **siempre por los pesos declarados**, y eso no es configurable: no existe un "maximo entre criterios". Entonces la plantilla **Mejor evidencia** (`Max` en los tres ejes) significa *la mejor asignatura, el mejor nivel, la mejor subcompetencia*, **no** el mejor criterio.
> Es facil leer "Maximo" como "se toma lo mejor de todo", y de ahi sale el error de implementacion: aplicar el modo del eje 1 tambien a la combinacion de criterios.

### La validacion de pesos, por eje y no por matriz

La regla de publicacion dice que todo grupo de hermanos cuyo peso *se use* debe sumar 100, y que un grupo se exime si agrega con `Max`, porque ahi los pesos no intervienen. Leida de corrido, invita a un atajo equivocado.

| Grupo | Eje que lo gobierna | Se exime con `Max` |
|---|---|---|
| Competencias raiz dentro de la matriz | Eje 3 | si |
| Subcompetencias dentro de su padre | Eje 3 | si |
| Criterios dentro de una hoja | ninguno | no, siempre se valida |
| RA dentro de una competencia derivada | ninguno | no, siempre se valida |

Los criterios y los RA no responden a ningun eje (se combinan siempre por peso), asi que **se validan incluso con los tres ejes en `Max`**. Implementar la exencion "por matriz" en vez de "por grupo y su eje" deja publicar rubricas que no suman 100.

### Que se valida al crear y que al publicar

Consecuencia directa de la opcion A de §4: la matriz nace sin medicion, asi que las reglas del instrumento no pueden ser gates de creacion.

| Momento | Que se exige |
|---|---|
| Al crear | Identidad y gobernanza. Nada de medicion |
| Al guardar Medicion | Coherencia interna: los condicionamientos de arriba, y el bloqueo de escala cualitativa contra promedio ponderado |
| Al publicar | `performanceScaleId` y `developmentSchemeId` presentes, y la suma de pesos de cada grupo segun su eje |

## 8. Orden de ejecucion

Los campos van antes que la pestana: la pestana declara elementos que tienen que existir en el schema, y el schema refleja el record type.

1. **Decidir el flujo de creacion** (opcion A, B o C de §4) y el mecanismo de dependencia de Competencias (§5).
   *Bloquea todo lo demas. Son las dos preguntas abiertas del ticket.*

2. **Campos del record type**: los seis nuevos, el retiro de `aggregationMode`, y el renombre del valor `Criterion` a `Analytic`.
   *`objects/RecordTypes/rt__Matrix__competencynode.json`*

3. **Mutations y validadores**: firma nueva de create y update, y las reglas de §7 (los tres condicionamientos, el bloqueo de escala cualitativa, y la validacion de pesos *por grupo y su eje*). La obligatoriedad de los dos catalogos pasa a ser gate de publicacion.
   *`logic/**` · los validadores del header de la matriz*

4. **Los tres layouts**: elementos nuevos en el schema, reparto de `elements` entre las cuatro pestanas, y `customEndpoint` ajustado. La vista tambien.
   *`config/layouts/default_CompetencyNode_{create,edit,view}.json`*

5. **El shell**, si se extiende el contrato con `requiresFields`, mas las claves i18n de la pestana y de los campos nuevos en los tres idiomas.
   *`modsComponents/CompetencyMatrixShell/tabs.ts` · `lang/{es,en,pt}`*

6. **Verificacion del recorrido completo de creacion**: crear una matriz desde cero y comprobar que al guardar Informacion general *no* se navega al listado, que las otras tres se desbloquean con el id, que Competencias sigue bloqueada hasta que haya escala, y que la publicacion se bloquea sin los dos catalogos.
   *Es el recorrido donde viven los dos bugs que el shell ya documento.*

---

Preparado sobre el repo `curriculum-mapping` en `develop` (ultimo commit `584499e`) y la maqueta v29. El contrato del shell, los modos de guardado y las dos trampas de §2 estan tomados de la documentacion del propio codigo. Los nombres de los catalogos son los que deja UPONE-1753.
