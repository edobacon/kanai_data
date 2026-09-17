---
id: DOC-kb-sp11-Indagacion-D3-borrado-de-Activity-Curriculum-CurricularSection-Offering-en-cd-de
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - curriculum-design
  - mcp
  - borrado
  - delete-cascade
  - D3
  - indagacion
  - aduana
---

# Indagacion D3: borrado de Activity/Curriculum/CurricularSection/Offering en cd (desprotegido o intencional)

**Proyecto:** up1 · **Modulo:** curriculum-design (cd) · **Tipo:** indagacion de una decision abierta (D3, sp11) · **Verificado contra codigo real (2026-09-15, `file:line`), no contra el KB.**

## En una frase

El borrado de esos 4 objetos **no esta desprotegido**: lo protege un motor generico de borrado del **core** (no del mod), que ante cualquier referencia externa bloquea el delete con un mensaje semantico. La premisa de D3 ("no hay guard propio, solo lo frenan las constraints de la DB") es **correcta pero incompleta**: mira la capa del mod y se pierde la capa del core, que es la que realmente resguarda.

## Correccion de la premisa (lo que el analisis previo no vio)

El analisis de paridad de cd de sp11 concluyo, con razon, que "no se encontro override/guard de borrado propio para esos 4 objetos (solo `planEntry` tiene borrado propio)" y dejo abierto "intencional (la DB lo frena) vs hueco". Eso es verdad **a nivel del mod**. Lo que faltaba en el encuadre: el borrado generico de up1 pasa por un **motor de cascada/restrict del core** que resguarda estos objetos sin que el mod tenga que hacer nada. Por eso el mod no tiene (ni necesita) un guard de borrado propio para ellos.

## Encuadre: las tres capas que frenan un borrado en up1

Como leer esto: un borrado de un objeto de cd puede toparse con hasta tres frenos, de mas "arriba" (aplicativo, mensaje amigable) a mas "abajo" (constraint de base de datos).

1. **Guard de dominio del mod** (capa mod). Un override de `deleteInstance` que el propio mod instala. En cd existe **uno solo**: `logic/requirementCategoryDelete.resolver.js:2,18-19,33`, que cubre `requirementCategory` y `planEntry`. Confirmado por el propio codigo como el **unico** override de `deleteInstance` del mod (el scanner registra por nombre y gana el ultimo; verificado que ningun otro `*.resolver.js` lo exporta). Los 4 objetos de D3 **no** tienen este guard.
2. **Motor de cascada/restrict del core** (capa core, generica). Vive en `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` y lo consumen `deleteInstance`, `deleteBulkInstances` y la preview `deleteImpactPreview` (`instance.resolver.js`). Es la capa que resguarda a los 4 objetos.
3. **Backstop de la DB** (`onDelete` en el schema). La ultima red: si algo saltea las capas de arriba (p. ej. SQL directo), la constraint FK generada frena. En cd solo `planEntry.categoryId` declara `onDelete: Restrict` explicito (`objects/planEntry.json:45`); el resto usa el default de Prisma.

## Glosario

- **Motor de cascada/restrict (core).** Codigo generico que, antes de borrar, construye el grafo de impacto: que hijos se borrarian en cascada y que referencias externas deben **bloquear** el borrado. Corre en una sola transaccion; si algo falla, rollback completo (`delete-cascade.md:108-114`).
- **`polymorphicChildren` / `directChildren`.** Metadata en el JSON de un objeto que declara sus hijos (por FK simple, o por `ownerType`/`ownerId` polimorfico). Es lo que hace que el objeto "entre" al motor.
- **Restrict (bloqueo).** El motor marca `status: 'restricted'` y no borra si detecta una fila **fuera del subarbol** que referencia al objeto. La deteccion es **generica por convencion** (`<objetoLower>Id`, campos `reference`, `ownerType/ownerId`, cadenas de version), no una lista hardcodeada (`delete-cascade.md:92-106`).
- **Backstop.** Una segunda red de seguridad mas abajo (la constraint de DB) por si se saltea la de arriba.
- **Defense-in-depth.** Tener varias capas independientes que resguardan lo mismo, de modo que fallar una no deja todo expuesto.

## El hecho verificado, objeto por objeto (2026-09-15)

Como leer la tabla: "declara hijos" es lo que determina si el objeto entra al motor del core en el borrado **individual** (no solo en el bulk); es el dato que carga el peso de la respuesta.

| Objeto | Guard de mod | Declara hijos (entra al motor core) | Que lo resguarda hoy |
|---|---|---|---|
| **Curriculum** | No | Si: `polymorphicChildren` + `directChildren` + `directChildrenDerived` (`objects/Curriculum.json:12,28,40`) | Motor core (restrict por ref externa) + cascada de su subarbol |
| **Activity** | No | Si: `polymorphicChildren` + `polymorphicChildrenDerived` (`objects/activity.json:12,28`) | Motor core |
| **Offering** | No | Si: `polymorphicChildren` + `polymorphicChildrenDerived` (`objects/Offering.json:7,23`) | Motor core |
| **CurricularSection** | No | Si: `directChildren` (`objects/CurricularSection.json:15`) | Motor core |

Confirmado ademas por el propio mod: `.ai/CONTEXT.md:121` y `README.md:97` dicen que `metadata.polymorphicChildren` "alimenta el calculo de impacto de borrado en cascada del core (`deleteImpactPreview`/`deleteBulkInstances`)" sobre los objetos padre. Y por via MCP: `up1_delete_object` usa la misma mutation `deleteInstance` generica (test `cross-client-matrix.test.js:232`, caso A-CD-3), asi que el borrado por el asistente pasa por el mismo motor.

Dato importante sobre el borrado **individual**: para un objeto que **no** declara hijos, el `deleteInstance` singular no revalida referencias externas por su cuenta (solo el bulk lo hace, y queda la DB de backstop) (`delete-cascade.md:28-32`). Como los 4 objetos de D3 **si** declaran hijos, este matiz **no** los afecta: entran al motor tambien en el borrado individual. Ese es el dato que sostiene la respuesta.

## Caso trabajado: borrar un Curriculum

- **Cascada (se borra con el):** sus `sections` (CurricularSection), `requirements`, `planEntries` y `requirementCategories`, porque son sus hijos declarados (`Curriculum.json:12-46`).
- **Restrict (bloquea el borrado):** si algo **externo** al subarbol lo referencia. Ejemplos reales: una `PlanEnrollment` con `curriculumId` apuntandolo (`objects/PlanEnrollment.json:31`), o una version sucesora en la cadena `previousVersionId` (`Curriculum.json:150-157`). El motor devuelve un mensaje del estilo "«X» esta en uso por N Curriculos. Resuelvelo antes de eliminar." (`delete-cascade.md:106`).
- **Fisico, no logico:** no hay `softDelete` en cd (busqueda vacia), asi que el borrado es fisico y el restrict del motor es lo que se interpone entre un delete y la perdida de datos.

## Respuesta a D3

**Intencional, no un hueco.** La ausencia de un guard de borrado propio del mod para estos 4 objetos es coherente con el diseno: el resguardo lo da el motor generico del core, y duplicarlo en el mod seria redundante. El "backstop de DB" que menciona D3 existe (y es correcto tenerlo), pero **no es el resguardo principal**: el principal es el motor aplicativo del core, que ademas da un mensaje semantico antes de que la DB llegue a evaluar la constraint.

Esto es un **hallazgo NO-bug**: la indagacion confirma que el comportamiento es correcto; no hay nada que "arreglar".

## Lo que NO cierra (alcance honesto)

- **La proteccion es tan buena como las convenciones de referencia.** El motor detecta referencias externas por convencion de nombres (`<objetoLower>Id`, campos `reference`, polimorficas, cadenas de version). Una referencia que **no** siga esas convenciones (p. ej. un id guardado en un campo string sin `isForeignKey`, o embebido en un JSON) **no** seria detectada. No se encontro hoy una referencia asi a estos 4 objetos, pero es el limite estructural del mecanismo.
- **Depende de que la metadata este sincronizada.** El motor corre en el core sobre la metadata de los objetos; asume que las declaraciones de hijos de cd estan sincronizadas a object-manager (el mod lo marca implementado en `README.md:97` y hay un test `tests/integration/delete-cascade-metadata.test.ts`). Si un objeto nuevo de cd olvidara declarar sus hijos, su borrado individual caeria al caso "sin hijos" (solo DB de backstop).
- **`onDelete` explicito casi ausente.** Solo `planEntry.categoryId` declara `Restrict`. Los demas FK confian en el default de Prisma (`object-definitions.md:69-71`: si se omite, no se emite clausula). No es un problema mientras el motor del core sea la primera linea, pero es la razon por la que el backstop de DB, por si solo, no seria suficiente.

## Si el equipo quisiera endurecer (opcional, no requerido)

- **A. No tocar codigo, cerrar D3 como "cubierto en core".** Recomendado. Documentar en cd que el borrado de estos objetos se resguarda por el motor del core, para que no vuelva a leerse como hueco. Esfuerzo: ~0 (doc).
- **B. Declarar `onDelete: Restrict` explicito** en los FK externos clave (p. ej. `PlanEnrollment.curriculumId`) para reforzar el backstop de DB. Esfuerzo: bajo, 1 punto o menos. Cinturon y tiradores; redundante con el motor.
- **C. Guard de dominio de mod** para estos objetos. **No recomendado:** duplica lo que el core ya hace, y suma superficie de mantenimiento.

Quien decide: equipo de cd (es tecnica; el PO solo se informa de que D3 no era un hueco).

## Preguntas abiertas (para confirmar con el equipo, no resueltas aca)

- Existe alguna referencia a estos 4 objetos desde **otro mod** (p. ej. curriculum-mapping) que **no** siga la convencion `<base>Id`/`reference`? Si la hubiera, escaparia al motor. No se detecto, pero no se barrieron todos los mods.
- La metadata de hijos de cd esta efectivamente sincronizada al runtime de object-manager en el entorno vivo? El test lo cubre en cd; conviene un smoke con `deleteImpactPreview` sobre un Curriculum real.

## Referencias

Codigo: `mods/curriculum-design/logic/requirementCategoryDelete.resolver.js`, `objects/{Curriculum,activity,Offering,CurricularSection,planEntry,PlanEnrollment}.json`, `.ai/CONTEXT.md`, `README.md`; `object-manager/docs/features/delete-cascade.md`, `docs/guides/object-definitions.md`, `src/graphql/resolvers/helpers/deleteImpactPlan.js`, `instance.resolver.js`. Hermanos sp11: [[Analisis-cd-para-el-MCP-paridad-1-1-postura-blockGeneric-y-gaps-client-side]] (gap origen), [[DECISIONES-PO-estado-verificado]] (D3).
