---
id: DOC-vigencia-documentos-01-idea-central
project: up1
type: doc
module: curriculum-design
tags: [vigencia, workflow, estados, versionamiento, curriculum-design, curriculum-mapping, sp12]
source: https://claude.ai/artifact/RQyrVMBvpq7WQTQb15CHdo
---
# Parte 01: Idea central: dos estados y la versión

> Grupo: Introducción · Parte 1 de 17 · Líneas 382 a 446 del original · [Índice](../00-INDICE.md)

**Ver en HTML (mismo estilo del original):** [01-idea-central.html](01-idea-central.html)

## Qué dice esta parte

Es el corazón de la propuesta. Hoy un solo campo (`status`) mezcla dos preguntas distintas: en qué etapa de aprobación va un documento y si ese documento opera hoy. La propuesta los separa: el **estado del flujo de trabajo** (lo define cada institución y lo mueve una persona) y el **estado de vigencia** (cinco valores fijos, calculado por el sistema). La **versión** une ambos: un cambio de fondo en algo vigente genera una versión nueva que recorre el flujo completo mientras la anterior sigue operando. El caso ficticio que recorre todo el documento es el plan de Ingeniería Civil Industrial (ICI v1 2020, v2 2027).

## Dónde se habló en la reunión (6 oct 2026)

00:02:58 a 00:06:48 y 00:24:02 a 00:31:27. Transcripción: `records/TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment.md`.

## Verificado contra el código (8 oct 2026)

- El enum `status` de plan de estudio (`curriculum.json`) y programa de asignatura (`activity.json`) es el mismo de 6 valores: Draft, InReview, Approved, Active, Deprecated, Archived. Confirma que hoy mezcla aprobación y operación.
- No existe ningún campo `validityStatus`, `changeClass` ni `editPolicy` en `up1` (búsqueda sin resultados).
- El versionamiento ya existe (`metadata.versioning`, `previousVersionId`, `version`).

## Decisiones y preguntas ligadas

Toda la propuesta depende de aceptar esta separación. En la reunión Esteban pidió confirmación explícita y no hubo objeciones; Francisco sugirió validarla con consultoría y un cliente piloto.

## Fragmento del documento (texto del artefacto)

```text
Refinamiento · uP1 · curriculum-design, curriculum-mapping y object-manager
Vigencia de documentos académicos
Un plan de estudios, un programa de asignatura o una matriz de competencias se diseñan, se aprueban y después operan durante años, muchas veces en paralelo con su versión siguiente. Mientras operan ya no se pueden tratar como un borrador: cambiarlos afecta a estudiantes que se rigen por ellos.
Hoy uP1 no distingue esos dos momentos. Un solo estado mezcla la aprobación con la operación, y cada mod decide a su manera qué se puede editar. Esta propuesta los separa.
Cada documento pasa a tener dos estados
Estado del flujo de trabajoYa existe
En qué etapa de diseño y aprobación va el documento. Lo mueve una persona al hacer una transición.
Cada institución define sus estados: Borrador, Revisión Facultad, Decretado…
Hoy es el único que controla la edición, en el legacy y en uP1
Campo: status (en el sílabo, lifecycleStatus)
Estado de vigenciaNuevo
Si el documento está operando hoy. Nadie lo marca a mano: el sistema lo calcula con las fechas de vigencia y con quién lo usa.
Cinco valores fijos: Sin vigencia, Programado, Vigente, En extinción, Cerrado
Es el que decide qué se puede editar
Campo: validityStatus
El caso que recorre toda la página es ficticio: el plan de Ingeniería Civil Industrial (ICI), su versión 2020 y su reforma de 2027 (sección 8). Así se ven sus dos estados a lo largo del tiempo:
DocumentoFlujo de trabajoVigencia
ICI v2 en diseñoRevisión FacultadSin vigencia
ICI v2 aprobado para 2027-1DecretadoProgramado
ICI v1 hoyDecretadoVigente
ICI v1 en 2028DerogadoEn extinción
El mismo estado del flujo ("Decretado") convive con dos vigencias distintas. Lo que cambia entre ellas es la fecha, no una acción de alguien.
La versión une ambos estados
Cuando un documento vigente necesita un cambio de fondo, no se edita: se crea una versión nueva, que vuelve a recorrer el flujo de trabajo. La anterior sigue operando para quienes ya la usan, hasta cerrarse. Con el versionamiento que ya existe, las tres piezas quedan así:
Flujo de trabajoN estados por institución, cada uno con un rol
Borrador→
Revisión Escuela→
Revisión Facultad→
Aprobado Consejo→
Decretado
Vigenciacalculada, igual para todos
Sin vigencia→
Programado→
Vigente→
En extinción→
Cerrado
Versiónlinaje, ya existe
v1 · Plan 2020→ previousVersionId →
v2 · Plan 2027→
v3 …
Qué decide si algo se puede editar: el estado de vigencia y la clase de cambio de cada campo. Si el documento está Programado, Vigente o En extinción, ni él ni lo que cuelga de él se edita directo: se corrige, se ajusta o se reforma con una versión nueva. Lo hace cumplir un único guard del core, declarado en el JSON de cada objeto, y no cada mod por su cuenta.
```
