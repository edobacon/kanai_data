---
id: DOC-kb-sp10-UPONE-1755-detalle-po
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle-po
  - UPONE-1755
  - fuente-po
---

# UPONE-1755 Detalle del PO (Curriculum Mapping)

**UPONE-1755** · Épica UPONE-1452 · Historia
(https://u-planner.atlassian.net/browse/UPONE-1755)

## La pestaña de Medición y el flujo de creación

Qué cambia en el shell de la matriz para abrir una cuarta pestaña, qué decisión hay que tomar sobre el orden de guardado, y cómo queda cada una de las otras tres. Contrastado contra el shell que ya existe en el repositorio.

- **Asignado**: Francisco Navarro
- **Componente**: CompetencyMatrixShell
- **Layouts**: create · edit · view
- **Maqueta**: v29

### Contenido

1. Alcance
2. Cómo funciona el shell
3. Hoy y objetivo
4. El flujo de creación
5. Impacto por pestaña
6. Campos y mutation
7. Reglas de combinación
8. Orden de ejecución

---

## 1. Alcance

La matriz de competencia se edita en un shell propio de tres pestañas. El ticket abre una **cuarta, Medición**, y mueve a ella todo lo que responde *con qué se mide y cómo se consolida el logro*. Eso no es solo mover campos: cambia **qué se pide para crear una matriz**, y de ahí sale la única decisión de diseño del ticket.

| Parte | Qué implica |
|---|---|
| **La pestaña** | Declarar `medicion` en los tres layouts y repartir los elementos entre las cuatro pestañas |
| **El flujo de creación** | Decidir si la medición se pide antes de que la matriz exista o después, y ajustar la mutation en consecuencia |
| **Los campos** | Seis campos nuevos en el record type de la matriz, uno retirado, y un valor de enum renombrado |

> **Depende de UPONE-1753**
> El renombre de los catálogos (`LevelScheme` → `PerformanceScale`, `CoverageScheme` → `DevelopmentScheme`) va en el otro ticket. Este documento usa los **nombres nuevos**, porque la pestaña Medición es donde los dos catálogos se seleccionan y no tiene sentido construirla con el vocabulario viejo.

## 2. Cómo funciona el shell hoy

Conviene entenderlo antes de repartir pestañas, porque el shell ya resolvió los problemas difíciles y la solución está documentada en el código. Las pestañas **se declaran en el layout**, no en el componente: `modsComponents/CompetencyMatrixShell/tabs.ts` define el contrato y el elemento `matrixShell` del schema las recibe.

| Propiedad | Qué hace |
|---|---|
| `key` | Identificador de la pestaña |
| `label` / `labelKey` | Etiqueta literal o clave i18n. `labelKey` gana |
| `elements` | Los nombres de los elementos hermanos del schema que forman su cuerpo |
| `save` | Cómo persiste. Es el discriminante por el que despacha el shell |
| `requiresRecord` | La pestaña necesita que el registro exista. En creación queda **bloqueada con su motivo**, no escondida |
| `requiredCapability` | Capability para *ver* la pestaña. No es la garantía: el backend rechaza igual |

### Los cuatro modos de guardado

| `save` | Cómo persiste |
|---|---|
| `matrixHeader` | `createCompetencyMatrixValidated` si no hay registro, `updateCompetencyMatrixValidated` si ya existe, **por apollo** |
| `adoptionScope` | `setMatrixAdoptionScopeValidated`, mutation propia del alcance |
| `competencyTree` | `upsertCompetencyTreeValidated` |
| `form` | `form$.submit()` del core, que corre el `customEndpoint` del layout |
| `none` | La pestaña persiste por su cuenta: no se dibuja Guardar |

> **[ADVERTENCIA] Dos trampas que el shell ya esquivó, no volver a pisarlas**
>
> **Por qué `matrixHeader` no usa el submit del core.** El `customEndpoint` del layout hace lo mismo, pero al terminar emite `instance-created` y la página del suite **navega al listado**. En creación eso es incompatible con el flujo: el id recién existe después de guardar, y es justo lo que las otras pestañas necesitan para desbloquearse. Se perdería la pantalla en el mismo momento en que se habilitan.
>
> **Por qué el alcance tiene su propia mutation.** El `updateInstance` del core persiste el satélite del recordType con un `upsert`, y Prisma valida su rama `create` de forma **estática** aunque la fila exista. Mandar solo los campos del alcance fallaba con `Argument matrixType is missing`. Cualquier pestaña nueva que quiera guardar *parcialmente* el recordType se topa con lo mismo.

## 3. Las pestañas: hoy y objetivo

El reparto actual, tomado de los layouts:

| Pestaña | `save` | Elementos |
|---|---|---|
| `general` | `matrixHeader` | `code` `name` `matrixType` `levelSchemeId` `defaultEvaluationMode` `defaultRubricModel` `aggregationMode` `description` `ownerUnits` (+ status en edit) |
| `adopcion` | `adoptionScope` | `adoptionScope` `adoptionPolicy` `scopeUnits` `adoptions` |
| `competencias` | `competencyTree` | `competencies` |
| `historial` (solo view) | `none` | `historyList` · gate `core_datalog:view` |

El objetivo: **cuatro campos salen de `general`** y se juntan con seis nuevos en `medicion`. Información general se queda con lo que responde *qué es* la matriz: identidad y gobernanza.

| Pestaña | Pregunta que responde | Elementos |
|---|---|---|
| `general` | Qué es esta matriz | `code` `name` `matrixType` `description` `ownerUnits` `status` |
| `adopcion` | Quién la usa | sin cambios |
| `medicion` (nueva) | Con qué se mide y cómo se consolida | `performanceScaleId` `developmentSchemeId` `measurementModel` `requiresAllCriteria` `achievementBasis` y los tres ejes |
| `competencias` | Qué contiene | sin cambios en elementos, con una dependencia nueva (§5) |

El **orden** no es indiferente: Medición va antes de Competencias porque el árbol depende de ella. La rúbrica se dibuja como criterio × nivel de desempeño, y los niveles de desarrollo que una competencia puede declarar son los del catálogo elegido. Entre Adopción y Medición no hay dependencia, así que ahí el orden es de lectura: `general · adopcion · medicion · competencias`, como en la maqueta.

## 4. El flujo de creación

Acá está la decisión del ticket. Hoy la mutation de creación **recibe los cuatro campos de medición**, porque viven en `general` y se guardan con ella:

```
// default_CompetencyNode_create.json (customEndpoint, hoy)
"mutation": "createCompetencyMatrixValidated",
"variables": {
  "code": ..., "name": ..., "matrixType": ..., "description": ..., "ownerUnits": ...,
  "levelSchemeId": ...,            // se va a Medición
  "defaultEvaluationMode": ...,    // se va a Medición
  "defaultRubricModel": ...,       // se va a Medición
  "aggregationMode": ...           // se retira (§6)
}
```

Si Medición es una pestaña con `save: matrixHeader` como `general`, las dos guardan por la misma mutation, y en **creación** eso obliga a elegir:

| Opción | Qué pasa en creación | Costo |
|---|---|---|
| **A** · Medición con `requiresRecord: true` | La matriz se crea con identidad y gobernanza. Medición se desbloquea con el id, y guarda por `updateCompetencyMatrixValidated` | La matriz existe un rato **sin escala de desempeño**: el modelo tiene que permitirlo y la publicación tiene que exigirlo |
| **B** · Medición sin `requiresRecord` | Las dos pestañas se pueden guardar antes de que exista el registro, y la primera en guardar crea la matriz | La mutation necesita **todos** los campos obligatorios en cualquiera de los dos órdenes, o falla como falló el alcance |
| **C** · Pedirlo todo en `general` al crear | Creación como hoy; Medición solo aparece en edición y vista | La creación y la edición dejan de tener la misma forma, que es lo que el shell venía cuidando |

#### Recomendación: A

Es la que sigue el patrón que el shell ya usa dos veces. Adopción y Competencias son `requiresRecord: true` por la misma razón (necesitan el id) y la decisión de **bloquear en vez de esconder** ya está tomada y justificada en el código: *una pestaña ausente no explica nada, y una bloqueada con su motivo a la vista le dice al usuario que el paso existe y en qué orden va*. Medición entra en esa misma familia sin inventar nada.

La B parece más flexible y es la que trae el problema conocido: guardar parcialmente el recordType falla porque Prisma valida la rama `create` de forma estática. Es exactamente el bug que obligó a darle mutation propia al alcance.

> **[ADVERTENCIA] La consecuencia de A que hay que aceptar explícitamente**
> Una matriz recién creada queda **en Borrador y sin escala de desempeño**. Eso exige dos cosas coherentes entre sí:
> - `performanceScaleId` y `developmentSchemeId` pasan a ser **obligatorios para publicar**, no para crear. Es el mismo criterio que ya rige los pesos del árbol: se avisa mientras se edita y se bloquea en la transición de estado.
> - La pestaña **Competencias necesita la escala antes de poder operar**: sin ella la rúbrica no tiene columnas. Ver §5.

El resultado es un flujo de creación en cuatro pasos, con el mismo orden en que se declaran las pestañas, y cada paso habilitando el siguiente:

```
1. general      crea la matriz  ->  devuelve el id
2. medicion     requiere id     ->  define escala, niveles y consolidación
3. adopcion     requiere id     ->  quién la usa
4. competencias requiere id + escala  ->  el árbol y sus rúbricas
```

## 5. Impacto por pestaña

### Información general

Pierde cuatro elementos y se queda con seis. No cambia su `save`. El efecto secundario bueno es que la creación pide lo mínimo para que la matriz exista, que es lo que un primer paso debería pedir.

### Medición

Nueva, `save: matrixHeader`, `requiresRecord: true`. Dos cosas que la maqueta resolvió y conviene copiar tal cual:

- **El modelo de medición es una sola elección de tres valores**, no dos selects. Detrás hay dos campos, pero solo tres de sus cuatro combinaciones son válidas, así que pedirlos por separado le hace armar al usuario algo que el dominio ya tiene cerrado.
- **La cobertura de criterios aparece solo con el modelo por criterios.** Es la excepción a la convención de dejar los campos que no aplican bloqueados y vacíos, y se justifica porque el campo que decide su aplicabilidad es el de al lado y el valor queda en `null`.

### Competencias

**Es la que más cambia sin que le muevan un solo elemento.** Hoy se desbloquea con el id; con Medición aparte, necesita además que la escala esté definida, porque la grilla de rúbrica es criterio × nivel de desempeño y los niveles de desarrollo que un nodo puede declarar salen del catálogo elegido.

El contrato de pestaña tiene `requiresRecord`, pero **no tiene un `requiresField`**. Hay dos caminos y conviene decidirlo con el tech lead:

| Camino | Qué implica |
|---|---|
| Extender el contrato del shell | Un `requiresFields: string[]` junto a `requiresRecord`, con el mismo tratamiento de bloqueo y motivo. Sirve para cualquier dependencia futura entre pestañas |
| Guardia dentro del editor del árbol | El componente muestra su propio estado vacío si no hay escala. Más rápido, pero la pestaña se ve habilitada y el usuario descubre el bloqueo al entrar |

La primera es coherente con lo que el shell ya hace, y es la que deja el motivo visible antes de entrar.

### Adopción

Sin impacto: su mutation y sus campos son independientes de la medición. Se menciona para cerrar la revisión, no porque haya trabajo.

### Historial (solo vista)

Sin cambios de declaración. Va a empezar a registrar los campos nuevos, que es lo esperado; vale confirmar que `enableDataLog` los cubra.

### Vista

El layout de vista necesita la cuarta pestaña con `save: none`, y ahí Medición se muestra en solo lectura. Es el layout que más fácil se olvida, porque el trabajo se siente terminado cuando creación y edición funcionan.

## 6. Campos nuevos, retirados y la mutation

Todo esto vive en `objects/RecordTypes/rt__Matrix__competencynode.json`. Lo que hay hoy son ocho campos; la pestaña Medición necesita seis más y retirar uno.

| Campo | Valores | Estado |
|---|---|---|
| `performanceScaleId` | FK a la escala de desempeño | existe como levelSchemeId |
| `developmentSchemeId` | FK a los niveles de desarrollo | nuevo |
| `defaultEvaluationMode` | `OwnRubric · DerivedFromOutcomes` | existe · sin el prefijo `default` |
| `defaultRubricModel` | `Holistic · Analytic` | existe · hoy dice `Criterion` |
| `requiresAllCriteria` | booleano | nuevo |
| `achievementBasis` | `Aggregation · RepresentativeLevel` | nuevo |
| `courseAggregationMode` | `WeightedAvg · Max` | nuevo |
| `developmentLevelAggregationMode` | `WeightedAvg · Max`, `null` con nivel representativo | nuevo |
| `subcompetencyAggregationMode` | `WeightedAvg · Max` | nuevo |
| `aggregationMode` | `Min · Max · WeightedAvg · Mode · Last` | se retira |

#### Por qué un eje pasa a tres

Una competencia con tres niveles de desarrollo, tributada en varias asignaturas por nivel, produce muchas mediciones de sí misma. Un solo `aggregationMode` no alcanza para reducirlas: hay que combinar **entre asignaturas del mismo nivel**, después **entre niveles**, y después **entre subcompetencias**. Los tres ejes se apagan solos según la forma del diseño (un nivel único apaga el segundo, la ausencia de subcompetencias apaga el tercero), así que no hay que configurar nada para que eso ocurra.

Y los modos bajan de cinco a dos: `Mode` y `Last` no tenían caso institucional. `Min` sí lo tiene y su retiro es **una consecuencia declarada**: es la regla conjuntiva de acreditación, así que mientras no esté, una matriz ABET no es representable.

> **Las plantillas no son modelo**
> Los cuatro perfiles de la maqueta (Estándar, Escalonado, Mejor evidencia, Personalizada) son **solo interfaz**: pre-llenan los campos y no se persisten. Se descartó modelarlos como objeto porque un perfil vinculado que cambia recalcularía los logros de todas las matrices vigentes que lo usan.

#### La mutation cambia de firma

Sacar `aggregationMode` y agregar seis campos toca `createCompetencyMatrixValidated` y `updateCompetencyMatrixValidated`, sus variables en el `customEndpoint` de los layouts, y los validadores. Si se adopta la opción A de §4, la de creación además **deja de recibir los campos de medición**: los escribe la de actualización cuando se guarda la pestaña.

## 7. Reglas de combinación

Son las que hay que escribir como validaciones, y la buena noticia es que el espacio es más chico de lo que parece: **el modelo de medición y la consolidación son ortogonales por construcción**. El modelo produce *un valor por competencia y por asignatura*, y los tres ejes empiezan a operar recién a partir de ese valor. Ningún eje mira cómo se formó el número.

| Modelo de medición | Eje 1 · entre asignaturas | Base + eje 2 · entre niveles | Eje 3 · entre subcompetencias |
|---|---|---|---|
| Competencias | aplica | aplica | aplica |
| Competencias y criterios | aplica | aplica | aplica |
| Competencias y resultados de aprendizaje | aplica | aplica | aplica |

Las 3 × 6 combinaciones son legales. **No hay que escribir ninguna regla que prohíba un modelo con un modo de consolidación**, y conviene saberlo antes de empezar a inventarlas.

### El modelo de medición: tres estados válidos de cuatro posibles

Detrás del selector hay dos campos, y su producto da cuatro combinaciones de las que solo tres significan algo:

| Opción | `evaluationMode` | `rubricModel` | Estado |
|---|---|---|---|
| Competencias | `OwnRubric` | `Holistic` | válida |
| Competencias y criterios | `OwnRubric` | `Analytic` | válida |
| Competencias y resultados de aprendizaje | `DerivedFromOutcomes` | `null` | válida |
| (ninguna) | `DerivedFromOutcomes` | cualquier valor | no significa nada |

Hoy la cuarta se evita **normalizando `rubricModel` a `null`** cuando el modo no es `OwnRubric`. Es una regla que hay que recordar en cada escritura, y por eso queda anotada la alternativa: un enum único de tres valores la haría imposible por construcción. No es de este ticket, pero si se decide, este es el momento barato.

### Los tres condicionamientos que sí existen

Ninguno es entre modelo y eje: dos son internos y el tercero es entre la *escala* y el eje.

| Regla | Cuándo | Comportamiento |
|---|---|---|
| `requiresAllCriteria` solo existe con criterios | `rubricModel != Analytic` | El campo **no se muestra** y queda en `null`. Es del instrumento, no de la consolidación |
| La base del logro apaga el eje 2 | `achievementBasis = RepresentativeLevel` | `developmentLevelAggregationMode` queda en `null`. Vale igual en los tres modelos |
| Escala cualitativa contra promedio ponderado | La escala no tiene número detrás y algún eje está en `WeightedAvg` | **Bloquea el guardado.** Antes era un aviso; con los tres ejes rigiendo toda la matriz, ya no hay otra opción que ofrecer dentro del mismo eje |

Del tercero se sigue una consecuencia práctica: el mensaje puede **nombrar los ejes concretos** que hay que corregir, porque la escala y los ejes viven en la misma pestaña. Con nivel representativo, el eje 2 no se nombra: no interviene.

> **[ADVERTENCIA] La trampa: los ejes nunca entran a la asignatura**
> Dentro de una asignatura, los criterios y los RA se combinan **siempre por los pesos declarados**, y eso no es configurable: no existe un «máximo entre criterios». Entonces la plantilla **Mejor evidencia** (`Max` en los tres ejes) significa *la mejor asignatura, el mejor nivel, la mejor subcompetencia*, **no** el mejor criterio.
>
> Es fácil leer «Máximo» como «se toma lo mejor de todo», y de ahí sale el error de implementación: aplicar el modo del eje 1 también a la combinación de criterios.

### La validación de pesos, por eje y no por matriz

La regla de publicación dice que todo grupo de hermanos cuyo peso *se use* debe sumar 100, y que un grupo se exime si agrega con `Max`, porque ahí los pesos no intervienen. Leída de corrido, invita a un atajo equivocado.

| Grupo | Eje que lo gobierna | Se exime con `Max` |
|---|---|---|
| Competencias raíz dentro de la matriz | Eje 3 | sí |
| Subcompetencias dentro de su padre | Eje 3 | sí |
| Criterios dentro de una hoja | ninguno | no, siempre se valida |
| RA dentro de una competencia derivada | ninguno | no, siempre se valida |

Los criterios y los RA no responden a ningún eje (se combinan siempre por peso), así que **se validan incluso con los tres ejes en `Max`**. Implementar la exención «por matriz» en vez de «por grupo y su eje» deja publicar rúbricas que no suman 100.

### Qué se valida al crear y qué al publicar

Consecuencia directa de la opción A de §4: la matriz nace sin medición, así que las reglas del instrumento no pueden ser gates de creación.

| Momento | Qué se exige |
|---|---|
| Al crear | Identidad y gobernanza. Nada de medición |
| Al guardar Medición | Coherencia interna: los condicionamientos de arriba, y el bloqueo de escala cualitativa contra promedio ponderado |
| Al publicar | `performanceScaleId` y `developmentSchemeId` presentes, y la suma de pesos de cada grupo según su eje |

## 8. Orden de ejecución

Los campos van antes que la pestaña: la pestaña declara elementos que tienen que existir en el schema, y el schema refleja el record type.

1. **Decidir el flujo de creación** (opción A, B o C de §4) y el mecanismo de dependencia de Competencias (§5).
   Bloquea todo lo demás. Son las dos preguntas abiertas del ticket.

2. **Campos del record type**: los seis nuevos, el retiro de `aggregationMode`, y el renombre del valor `Criterion` a `Analytic`.
   `objects/RecordTypes/rt__Matrix__competencynode.json`

3. **Mutations y validadores**: firma nueva de create y update, y las reglas de §7 (los tres condicionamientos, el bloqueo de escala cualitativa, y la validación de pesos *por grupo y su eje*). La obligatoriedad de los dos catálogos pasa a ser gate de publicación.
   `logic/**` · los validadores del header de la matriz

4. **Los tres layouts**: elementos nuevos en el schema, reparto de `elements` entre las cuatro pestañas, y `customEndpoint` ajustado. La vista también.
   `config/layouts/default_CompetencyNode_{create,edit,view}.json`

5. **El shell**, si se extiende el contrato con `requiresFields`, más las claves i18n de la pestaña y de los campos nuevos en los tres idiomas.
   `modsComponents/CompetencyMatrixShell/tabs.ts` · `lang/{es,en,pt}`

6. **Verificación del recorrido completo de creación**: crear una matriz desde cero y comprobar que al guardar Información general *no* se navega al listado, que las otras tres se desbloquean con el id, que Competencias sigue bloqueada hasta que haya escala, y que la publicación se bloquea sin los dos catálogos.
   Es el recorrido donde viven los dos bugs que el shell ya documentó.

---

Preparado sobre el repo `curriculum-mapping` en `develop` (último commit `584499e`) y la maqueta v29. El contrato del shell, los modos de guardado y las dos trampas de §2 están tomados de la documentación del propio código. Los nombres de los catálogos son los que deja UPONE-1753.
