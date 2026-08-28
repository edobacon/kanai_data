---
id: DOC-kb-sp9-UPONE-1619-tipos-de-recurso-frontera-cd-as
project: up1
type: doc
---

# UPONE-1619 - Tipos de recurso de la pieza: analisis de frontera CD / AS

> **Interno, no pegar en Jira.** Registro completo del analisis del 2026-08-17 sobre el campo que declara
> **que tipos de recurso requiere una pieza de dictado**: de donde viene el requisito, quien lo usa, quien
> lo define, quien puede aplicarlo, y por que se decidio lo que se decidio.
>
> Nace de una revision de handoff: la pregunta era si UPONE-1619 deja la Fase 1 lista para que
> academic-scheduling continue. Al verificarlo aparecio un hueco que **no estaba en el alcance de ningun
> ticket**, y al resolverlo hubo dos correcciones de rumbo que conviene dejar registradas para que nadie
> las repita.
>
> Contrato: `UPONE-1619-detalle.md`. Guia de implementacion: `UPONE-1619-pre-intake.md`.
> Todo lo verificado aqui se leyo del working tree real el 2026-08-17.

---

## 1. El hueco que disparo todo

El plan tecnico ubica en la **Fase 1** (curriculum-design) que la pieza declare `requiredResourceTypes`
(`kb/sp8/instructional-component-plan-implementacion.md`, seccion 4.3). El desglose de tickets, del lado
de scheduling, lo declara como dependencia explicita:

> **Ticket 2C · Herencia de tipos de recurso** ... **Dependencias**: blocked by 2B-a (y por **la
> declaracion de lista en la pieza, Epica 1**).
> _`kb/sp8/instructional-component-tickets.md:166-176`_

Pero al revisar los alcances: **no esta en ninguno**. Ni en el ticket 1B del desglose original (que lista
los campos de la pieza y no lo incluye), ni en la sub-tarea 1B de la carga del sprint, ni en el alcance de
UPONE-1619.

Peor: el contrato de 1619 declaraba "herencia de tipos de recurso" en la seccion **Fuera**. Eso es cierto
para el **consumo** (crear las filas de la seccion, que es de scheduling) pero se leia como que el tema
completo estaba cubierto por otro, cuando el **origen** no tenia dueño.

**Como se detecta un hueco asi:** no se detecta solo. Verificado: nada falla. `codegen`, `sync`,
`drift:check` y los tests quedan verdes, porque no hay consumidor del campo. Y del lado de scheduling,
`logic/scheduling-inputs.resolver.js:321-336` documenta que una seccion sin filas simplemente **no envia
restriccion** al algoritmo. O sea que el sistema corre sin el dato, sin error y sin aviso: el bloqueo
aparece recien cuando alguien intente ejecutar 2C.

---

## 2. Quien usa este dato

| Rol | Mod | Que hace con el |
|---|---|---|
| Origen del requisito | **academic-scheduling** | Lo pidio: es uno de los tres datos que declararon faltantes |
| Consumidor de sistema | **academic-scheduling** | Ticket 2C materializa las filas de la seccion; el algoritmo las recibe como restriccion de tipo de uso |
| Captura del dato | **curriculum-design** | El diseñador curricular lo declara en el formulario del curso |
| Consumo propio | **ninguno en curriculum-design** | CD no planifica ni asigna salas: no lo lee en ningun resolver |

El registro de analisis de SP8 lo dice en su TL;DR:

> La necesidad la origino **Academic Scheduling**: `Section` toma `Activity` para planificar, pero
> `Activity` no tiene el detalle de dictado (**horas por tipo de actividad, tipo de sala, docentes**).
> _`kb/sp8/00-registro-analisis-instructionalcomponent.md`_

"Tipo de sala" es literalmente este campo.

**Conclusion de reparto:** la **ubicacion** nos compete (impacta nuestro esquema, nuestra UI, nuestro seed
y nuestra publicacion en core). La **especificacion** no: cuantos valores admite, que forma tiene y que
significa cada uno es requisito del consumidor.

---

## 3. Que esta verificado y que no

Separado a proposito, porque durante el analisis se mezclo.

| Afirmacion | Estado | Fuente |
|---|---|---|
| El catalogo `ResourceTypes` existe y esta sembrado con 6 valores (Aula, Laboratorio, Auditorio, Instalacion recreativa, Taller, Sala de reuniones) | **Verificado** | `mods/academic-scheduling/seed/config-resourcetypes.js` |
| Ese catalogo se identifica por `name`, sin `code` interno | **Verificado** | idem, `uniqueKey: { name: ... }` |
| `ResourceTypes` esta publicado en core | **Verificado** | `object-manager/objects/business/Base/resourcetypes.json` |
| `SectionResourceType` (N:M del lado consumo) ya existe y no hay que crearlo | **Verificado** | `mods/academic-scheduling/objects/SectionResourceType.json` |
| **No existe ningun mapeo previo** de que pieza requiere que recurso | **Verificado** | `SectionResourceType` no se siembra en ninguna parte; solo se lee en `logic/scheduling-inputs.resolver.js:321-336` |
| Los 8 tipos de pieza (Catedra, Practica, Laboratorio, Taller, Seminario, Ayudantia, Clinica, Terreno) | **Propuesta del analisis**, no dato de cliente ni del legacy | `kb/sp8/00-registro-analisis-instructionalcomponent.md:69`, que ademas los declara **catalogo abierto, no enum**, porque "el vocabulario varia por pais" |
| Un mapeo tipo de pieza -> tipo de recurso | **Inferencia sin respaldo** | Ninguna. Fue una propuesta semantica hecha durante este analisis, retirada (ver seccion 6) |

---

## 4. Dos correcciones de rumbo durante el analisis

Se registran porque las dos son faciles de repetir.

### 4.1 Se propuso una forma que contradecia una decision ya tomada

Durante el analisis se recomendo modelar el campo como **objeto puente con FK** al catalogo. El registro
de SP8 ya habia resuelto esa pregunta, y al reves:

> ... con **`requiredResourceType` como enum en diseño (no FK)** para que la dependencia entre mods sea
> **unidireccional `as -> cd`**.
> _`kb/sp8/00-registro-analisis-instructionalcomponent.md`, TL;DR_

En su tabla de campos figura como `requiredResourceType`, **singular y enum**. El plan posterior (2026-08-12)
lo cambio a `requiredResourceTypes`, plural y 0..N, con dos opciones, **sin explicar el cambio**. La
recomendacion de FK se hizo sin haber visto la decision previa.

**Leccion:** antes de proponer forma para un artefacto que ya paso por analisis, buscar la decision previa
en el registro del sprint anterior, no solo en el plan de implementacion.

### 4.2 Se propuso un mapeo de valores que nadie pidio

Se elaboro una tabla "tipo de pieza -> tipo de recurso base" (Catedra a Aula, Seminario a Sala de
reuniones, etc.). **No sale de ningun documento, dato ni conversacion.** Era inferencia semantica.

**Leccion:** que un mapeo sea plausible no lo hace verificado. Si se ofrece como material de trabajo, va
marcado como ejemplo sin respaldo, y nunca como base para cerrar un alcance.

---

## 5. Puede academic-scheduling declararlo desde su propio mod?

**Si. El mecanismo existe y esta en produccion.**

Dos objetos estan declarados hoy por **dos mods a la vez**, y el sync los une (merge append-only, union de
campos):

| Objeto | Declara curriculum-design | Declara uengagement-up1 |
|---|---|---|
| `Offering` | `activityId`, `lifecycleStatus`, `recordType`, `termId` | `activityLineId`, `code`, `description`, `generalModality`, `imageUrl`, `language`, `maxCapacity`, `name`, `status`, `usedCapacity` |
| `ProgramEnrollment` | (aporte propio) | (aporte propio) |

Cero solapamiento de campos: cada mod aporta lo suyo. El propio codigo lo documenta:

> "... el sync une `required` append-only ... **Aporte del mod curriculum-design al Offering compartido
> (UPONE-1269)**."
> _`mods/curriculum-design/objects/Offering.json:53`_

Asi que academic-scheduling puede declarar `rt__InstructionalComponent__curricularsection.json` en **su**
mod, con unicamente el campo que necesita y con la forma que elijan, y el sync lo unira al nuestro.

### Tres salvedades

1. **No hay precedente para RecordTypes.** Los dos casos conocidos son objetos base; ningun `rt__` esta
   declarado hoy por dos mods. El mecanismo es el mismo (mismo merge, misma publicacion a
   `business/RecordTypes/`), pero seria el primer caso: conviene confirmarlo con un sync antes de
   comprometerlo, no darlo por hecho.
2. **El limite real es la captura, no el dato.** Pueden declarar el campo, pero el formulario donde el
   diseñador curricular lo llenaria es un layout **de curriculum-design**. Si el campo existe y nadie lo
   agrega a ese layout, el dato vive en el esquema y no se captura por pantalla. Ese input es un cambio
   nuestro, chico y aditivo.
3. **El seed de ejemplo tambien es nuestro.** Si quieren que las piezas sembradas traigan valores, eso
   toca el seed de curriculum-design.

---

## 6. Decisiones tomadas (2026-08-17)

| # | Decision | Motivo |
|---|---|---|
| 1 | **El campo sale del alcance de UPONE-1619** | No lo consumimos nosotros y no tenemos su especificacion. Adivinar la forma cuesta mas que esperarla: agregar un campo despues es **aditivo y barato**, retirarlo es la operacion cara (merge append-only, 18 schemas de tenant) |
| 2 | **El hueco queda declarado, no silenciado** | Es lo unico que no dependia de nadie mas. Su ticket 2C lo da por hecho y ningun alcance lo tenia; sin registro se descubre tarde y en silencio |
| 3 | **La especificacion la define academic-scheduling** | Cardinalidad, forma y valores son requisito del consumidor. Su propio registro ya tenia una postura (enum singular, sin FK, por unidireccionalidad) |
| 4 | **Ellos pueden aplicarlo desde su mod** | Precedente de `Offering` y `ProgramEnrollment`; no necesitan que lo declaremos nosotros |
| 5 | **Si necesitan captura por pantalla, nos lo piden** | El layout de la pieza es nuestro. Es un ticket menor, aditivo, que no bloquea nada de 1619 |
| 6 | **Se retira el mapeo propuesto de tipos** | Sin respaldo (ver 4.2) |

### Descartado, y por que

- **Definirlo nosotros ahora con forma propia.** Fue la recomendacion inicial y se abandono al verificar
  que no somos consumidores del dato y que ya existia una postura registrada de scheduling. Habria sido
  decidir por el consumidor.
- **Dejarlo sin registrar por ser de otro equipo.** El hueco es real y su ticket depende de el. No
  documentarlo es exactamente el patron de UPONE-1623, donde un ticket cerro dejando pendiente algo que
  nadie tenia anotado.

---

## 7. Que llevarle a academic-scheduling

Pregunta cerrada, con las opciones y su consecuencia:

> Para que su ticket 2C (herencia de tipos de recurso) tenga de donde leer, la pieza de dictado necesita
> declarar que tipos de recurso requiere. Ese campo hoy **no esta en el alcance de ningun ticket**, y
> nosotros no lo consumimos, asi que la definicion es de ustedes. Tres cosas a definir:
>
> 1. **Cardinalidad:** uno o varios tipos por pieza. Su registro de analisis decia uno (`requiredResourceType`
>    singular); el plan de implementacion posterior dice 0..N.
> 2. **Forma:** enum en el objeto (lo que decidieron en su momento, para que la dependencia entre mods
>    quede unidireccional) o referencia al catalogo `ResourceTypes` ya publicado en core.
> 3. **Valores:** el catalogo tiene hoy 6 tipos, y dos de los ocho tipos de pieza propuestos (Clinica,
>    Terreno) no tienen equivalente. Declarar cero es valido y su propio resolver ya lo tolera.
>
> Pueden declararlo **desde su propio mod**: el sync une los campos de los mods sobre el mismo objeto, como
> ya pasa con `Offering` entre curriculum-design y uengagement. Si ademas necesitan que se capture en el
> formulario del curso, ese input es nuestro y lo agregamos con un ticket menor.

---

## 8. Estado y pendientes

- **En UPONE-1619:** el campo esta **fuera del alcance**, con el hueco y la dependencia de 2C registrados
  en el contrato. La pieza se entrega completa sin el.
- **Pendiente humano:** avisarle a academic-scheduling. Hoy su ticket 2C asume que el dato va a existir.
- **Sin ticket nuevo creado**, segun la regla del equipo. Si de la conversacion sale trabajo nuestro (el
  input en el layout), ahi se evalua.
