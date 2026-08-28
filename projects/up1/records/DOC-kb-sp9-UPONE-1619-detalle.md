---
id: DOC-kb-sp9-UPONE-1619-detalle
project: up1
type: doc
---

# UPONE-1619 - Curriculum Design | Implementacion de InstructionalComponent

> Tarea · Prioridad Mayor · Epic UPONE-1267 Curriculum Design · Asignado: Eduardo Bacon · Story Points en Jira: sin asignar
> Sprint: Migracion uAssessment SP9 · Es la carga grande de curriculum-design del sprint
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1619

## Fuente canonica (PO)

La descripcion del ticket en Jira contiene **unicamente un enlace** al plan de tickets de
InstructionalComponent (artifact "Plan de tickets · InstructionalComponent"), sin enunciado propio del
PO. No hay comentarios ni adjuntos.

El alcance quedo definido en la planificacion de SP9 (2026-08-14) y el refinamiento (2026-08-13): el
plan desagrega el trabajo en 3 epicas por mod y 16 tickets; para SP9 se acordo tomar **solo la Epica 1
(curriculum-design) y concentrarla en un unico ticket** con sus piezas como sub-tareas internas, no
como tickets separados.

**Nota para postear en Jira:** como la descripcion actual es solo un enlace y no un request redactado
por el PO, el detalle puede ir en la **descripcion** conservando ese enlace en la primera linea. Si se
prefiere no tocarla, va como comentario.

## Historia de usuario

Como **disenador curricular**, quiero declarar las piezas de dictado de un curso (catedra,
laboratorio, taller y las que correspondan) con sus horas, y que la modalidad calcule su carga a
partir de esas piezas, para dejar de digitar horas que hoy no representan como se dicta realmente el
curso y para que programacion academica pueda armar secciones sobre esa estructura.

## Objetivo

Que un curso pase a declarar sus piezas de dictado con sus atributos, que la modalidad muestre su
carga horaria **derivada** de esas piezas en vez de digitada, y que el ejemplo sembrado del sistema
refleje esa estructura. Con esto, curriculum-design deja de ser el bloqueante de los equipos de
programacion academica y de engagement, que necesitan anclar sus propios objetos a la pieza.

## Alcance

**Dentro:** el catalogo de tipos de pieza con su carga inicial; la pieza como RecordType anidado a la
modalidad con sus atributos; la carga horaria de la modalidad derivada de sus piezas; el retiro de las
columnas de horas digitadas del **JSON del mod**; el formulario del curso mostrando las piezas de cada
modalidad y el total derivado; la capacidad del seed de anidar piezas bajo la modalidad; y los datos y
conteos del seed actualizados.

**Dentro tambien: la publicacion en core.** Materializar el modelo en la plataforma (publicar el catalogo
y el RecordType nuevos en `object-manager/objects/business/`, retirar ahi las cuatro claves de horas, y
regenerar los **18** `prisma/<TENANT>/schema.prisma` con su migracion) es **de este ticket**, aunque los
archivos vivan en el repo de core. Es la misma implementacion: sin ese tramo las columnas siguen
existiendo, el objeto nuevo no queda publicado y la FK que espera academic-scheduling no tiene a que
apuntar. El precedente del equipo es exactamente ese: el commit "sync UPONE-1523 objects into
object-manager" es del propio ticket de scheduling. Medicion y procedimiento en
`sp9/UPONE-1619-publicacion-en-core.md`.

**Fuera:** los objetos y cambios de **academic-scheduling** (cluster de secciones, FKs de la seccion,
derivacion de cupo y modulos, herencia de tipos de recurso, algoritmo); la decision de **grano de
matricula** de engagement; y cualquier cambio en el motor de formulas o en el listado del core para
soportar agregacion de hijos de forma generica.

**Tambien fuera, y hay que avisarlo: el campo que declara que tipos de recurso requiere la pieza.** El
plan lo ubicaba en la Fase 1 y el ticket 2C de academic-scheduling lo declara como su dependencia ("la
declaracion de lista en la pieza, Epica 1"), pero **no figuraba en el alcance de ningun ticket**. Queda
fuera de aqui por una razon concreta: **curriculum-design no consume ese dato** (no planifica ni asigna
salas) y no tiene su especificacion; cardinalidad, forma y valores son requisito del consumidor. Ademas
academic-scheduling **puede declararlo desde su propio mod**, porque el sync une los campos que varios
mods declaran sobre el mismo objeto, como ya ocurre con `Offering` entre este mod y uengagement. Si
necesitan que ademas se capture en el formulario del curso, ese input si es nuestro y es un ticket menor
y aditivo. Analisis completo, evidencia y decisiones: `sp9/UPONE-1619-tipos-de-recurso-frontera-cd-as.md`.

## Criterios de aceptacion (checkeables)

- [ ] Existe un catalogo de tipos de pieza de dictado, consultable, con sus tipos cargados y sin
      duplicados al recargarlo.
- [ ] Se puede crear una pieza de dictado colgando de una modalidad, con sus atributos (tipo, horas
      semanales, tamano de grupo planificado, cantidad de docentes requeridos y los demas acordados).
- [ ] Una modalidad con piezas de 4 y 2 horas muestra un total derivado de 6; una modalidad sin piezas
      muestra 0.
- [ ] En el formulario de edicion del curso, cada modalidad muestra sus piezas y su total derivado, y
      ya no ofrece campos para digitar horas.
- [ ] Las vistas de silabo que hoy muestran horas de la modalidad siguen mostrando informacion
      coherente tras el cambio (no quedan campos vacios ni columnas rotas).
- [ ] Ya no existe columna ni campo de horas digitadas en la modalidad, y el dato que existia fue
      trasladado a piezas antes de retirarlo.
- [ ] La regla de una sola modalidad por defecto por dueno sigue vigente despues del cambio.
- [ ] El seed siembra modalidades con sus piezas anidadas, es idempotente, y los conteos esperados
      estan actualizados.
- [ ] La sincronizacion con el MCP quedo cubierta segun el acuerdo del sprint, o marcada N/A con
      motivo.

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp9/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] Codegen y migracion aplicados por tenant; sin drift tras el cambio.
- [ ] **Publicacion en core ejecutada y commiteada**: el catalogo y el RecordType nuevos figuran en
      `object-manager/objects/business/`, el RecordType de modalidad publicado ya **no** declara las cuatro
      claves de horas, y los 18 `prisma/<TENANT>/schema.prisma` mas los typeDefs estan regenerados.
      Commits en `object-manager` con el id de este ticket.
- [ ] **Verificado que una corrida posterior de sync no revierte el retiro.** Es el modo de falla
      documentado en el commit de UPONE-1523 y no se detecta mirando la base una sola vez.
- [ ] Si se activa la contingencia y el drop se difiere: queda **ticket propio creado y enlazado** para el
      retiro pendiente, y este ticket declara explicitamente que las columnas siguen existiendo al cerrar.
- [ ] Inventario de consumidores de las claves de horas revisado uno por uno y cerrado (layouts del
      RecordType, layouts de silabo, columnas del formulario de curso, heuristica de tipo de campo).
- [ ] Render verificado en el tenant UPU con evidencia runtime, no solo config y base: el listado
      filtra columnas a campos reales del objeto, asi que un total derivado puede quedar fuera del
      render aunque la config lo declare.
- [ ] Regresion de la modalidad por defecto verificada.
- [ ] Capabilities de los objetos nuevos declaradas y cableadas a los roles curriculares existentes.
- [ ] i18n de los labels nuevos en es/en/pt con paridad de keys.
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

> Conjunto minimo a cubrir. El dev puede y debe sumar mas casos durante la ejecucion si surgen.

- [ ] Alta del catalogo de tipos idempotente: recargar no duplica; rechaza un nombre repetido.
- [ ] Crear una pieza valida bajo una modalidad -> queda anidada a ella.
- [ ] Crear una pieza sin tipo -> rechaza si el tipo es obligatorio.
- [ ] El set de RecordTypes declarados incluye el nuevo y el test que lo asegura esta actualizado.
- [ ] Derivacion de horas: modalidad con dos piezas (4 + 2) -> 6; modalidad sin piezas -> 0.
- [ ] Seed coherente tras el cambio: cada modalidad sembrada que antes traia horas digitadas queda con
      piezas equivalentes (es coherencia del dato de ejemplo, no rescate de dato productivo).
- [ ] Regresion: una sola modalidad por defecto por dueno sigue garantizada.
- [ ] Re-seed idempotente con la jerarquia nueva; conteos del seed verdes.
- [ ] Smoke runtime: abrir el formulario de edicion de un curso y comprobar que las piezas se
      renderizan y el total derivado aparece.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): aplica. Declarar capabilities de los dos objetos nuevos y cablearlas a los
      roles curriculares existentes, sin crear roles nuevos.
- [ ] Historial / auditoria (DataLog): decision. Definir si la pieza lleva historial; seguir el
      precedente de los RecordTypes hermanos del mod salvo razon en contra.
- [ ] Capa de lenguaje (i18n): aplica. Labels de los dos objetos nuevos, de sus campos y de los
      valores del catalogo, en es/en/pt con paridad.
- [ ] Accesibilidad (WCAG): aplica. El listado anidado de piezas dentro del formulario de curso debe
      ser accesible.
- [ ] Storybook: N/A si no se introduce componente nuevo; aplica si el total derivado exige uno.
- [ ] Design tokens (`var(--up1-*)`): aplica a cualquier UI nueva o modificada.
- [ ] Documentacion: aplica. El cambio es observable (capacidad y modelo nuevos, campos que
      desaparecen), y hay equipos vecinos que dependen del contrato.
- [ ] Convenciones de mod: aplica. Schema-driven (codegen + migracion), FK escalar en RecordType (no
      relacion, no en include), identidad canonica del RecordType, seed idempotente con cleanup, sync
      sin editar archivos sincronizados a mano, tenant isolation.

## Dependencias

**Depende de:** nada dentro de curriculum-design. Arranca por su cuenta.

**Coordinar con UPONE-1615 (hermano SP9, mismo mod).** Este ticket declara las capabilities de sus dos
objetos nuevos en `mods/curriculum-design/seed/_data-rbac.js` y `capabilities.json`, que es el archivo
que 1615 migra a roles internos, y su DoD las cablea a "los roles curriculares existentes", que son
justamente los que 1615 puede mover. Dos consecuencias practicas: no ejecutar los dos en paralelo sobre
ese archivo, y confirmar con 1615 **donde** se declara el cableado antes de escribirlo, para no cablear
a un modelo que se esta migrando. Si 1615 se difiere, este ticket sigue el patron actual sin cambios.

**Toca el repo de core dentro de su propio alcance:** la publicacion del modelo nuevo y el retiro efectivo
de las horas en `object-manager`. No se deriva a otro ticket (decision del 2026-08-17); medicion y
procedimiento en `sp9/UPONE-1619-publicacion-en-core.md`. Sin ese tramo, las columnas de horas siguen
existiendo en la plataforma aunque el mod ya no las declare, y la FK que espera academic-scheduling no
tiene objeto publicado al que apuntar.

**Deja un pendiente declarado para academic-scheduling:** su ticket 2C (herencia de tipos de recurso)
depende de que la pieza declare que recursos requiere, y ese campo no esta en el alcance de ningun
ticket. No lo cubre este, por las razones de la decision cerrada. Sin ese aviso, 2C se frena al empezar.

**Habilita (y hoy bloquea):** la carga de **academic-scheduling** (cluster de secciones ya creado, FKs
de la seccion, derivacion de cupo y modulos, herencia de tipos de recurso, algoritmo) y el **spike de
grano de matricula** de engagement. Verificado: academic-scheduling ya dejo su FK a la pieza diferida
de forma explicita esperando este objeto. Ambos frentes los coordinan sus equipos, fuera de este
ticket.

## Estimacion

**13 SP.** Es la carga grande del sprint: 7 piezas encadenadas, mayoria aditivas y operativas
(objetos, seeds, layouts, pruebas), estimadas en la planificacion como cerca de una semana de sprint.
El esfuerzo es considerable pero el riesgo esta concentrado en una sola pieza, el retiro de las
columnas de horas. Sube si el total derivado no se puede renderizar en el listado y hay que buscar otra
via de presentacion.

El tramo de core (RecordType publicado, 18 schemas, migracion) se incluye dentro de estos 13 SP, como
sub-tarea 1C-c: es mecanica y tiene dos precedentes que la documentan. Si al ejecutarla resulta mas cara
de lo previsto, sube la estimacion del ticket; no se parte.

## Plan de entrega (hitos)

El ticket se entrega en tres hitos. Mismo alcance y misma estimacion (13 SP): es orden de entrega, no
re-particion. Cada hito deja el sistema funcional.

**Hito 1 - Objetos publicados (primer entregable).** Definir el catalogo de tipos de pieza y el RecordType
`InstructionalComponent` anidado a `Modality` con sus atributos, y publicarlos de forma **aditiva** en core
(`object-manager/objects/business/`, codegen, migracion que crea tablas en los 18 schemas, commit con el id).
Destraba a academic-scheduling (su FK diferida ya espera este objeto) y a la carga de datos del flujo de
creacion de seccion.
- **Sin gate bloqueante entre mods.** Los atributos de la pieza son nuestros y ya estan decididos; no
  dependen de aprobacion de academic-scheduling. Cada mod implementa su parte: el sync une los campos que
  varios mods declaran sobre un mismo objeto (como `Offering` entre cd y uengagement), asi que
  academic-scheduling **agrega sus propios campos sobre la pieza desde su mod** (incluido el de tipos de
  recurso). Lo unico que necesitan de nosotros es que el objeto exista publicado para enganchar su FK.
- **Coordinacion (aviso de una via, no aprobacion):** comunicarles la identidad del objeto publicado (nombre,
  que es RecordType de `Modality`, el id al que apunta la FK) para que la enganchen, y confirmarles que tipos
  de recurso lo declaran ellos. Unico cuidado durable: no cambiar la identidad del objeto despues de
  publicarlo, porque su FK apunta ahi; esa identidad ya esta decidida.
- **Cierra cuando:** las tablas de los dos objetos existen en los 18 schemas y la FK de academic-scheduling
  puede apuntar. Commit en `object-manager` con el id; sin drift; nada destructivo.
- **Fuera del hito:** derivacion, formulario, retiro de horas, seed, MCP.
- **Coordinacion con UPONE-1615:** al publicar los objetos se autogeneran sus capabilities y el mecanismo de
  core las asigna a `Admin`/`Consultor`/`Colaborador`. El engorde de `Consultor` que 1615 vigila ocurre aqui,
  en el Hito 1. No bloquea; avisar a 1615.

**Hito 2 - Modelo funcional en el mod.** Derivacion del total de horas (resolver del mod), formulario del
curso con las piezas y el total derivado, capacidad del seed de anidar piezas, y datos/conteos del seed
actualizados. Las columnas de horas digitadas **siguen existiendo** en este hito: coexisten con las piezas,
nada se rompe. Coordinar el cableado de capabilities en `mods/curriculum-design/seed/_data-rbac.js` con
UPONE-1615, y el caveat de render del listado (verificar el total derivado en runtime, no solo en config).

**Hito 3 - Retiro de las horas digitadas (destructivo).** Retiro de las 4 claves de horas del JSON del mod y
en `object-manager/objects/business/`, migracion `DROP COLUMN` en los 18 schemas, barrido del inventario de
consumidores, y verificacion de que el sync no revierte.
- **Gate previo:** ventana de coordinacion con core para la migracion destructiva.
- **Contingencia:** si el drop se difiere, ticket propio enlazado y declarar que las columnas siguen
  existiendo al cerrar.
- **Cierre transversal aqui:** i18n es/en/pt con paridad, sincronizacion con MCP cubierta o N/A con motivo,
  docs.

**Orden 1 -> 2 -> 3.** El tramo destructivo queda aislado al final, con su ventana de core, y solo se retira
cuando el dato ya vive en piezas. El primer entregable es aditivo y no bloquea a nadie: convierte la
dependencia con academic-scheduling de un bloqueo al cierre del ticket a un handoff temprano y contratado.

## Guia de ejecucion: reglas y patrones up1 a considerar

> No dice como implementar; marca reglas y patrones (a favor) y antipatrones (evitar) de up1 que
> aplican a este ticket.

- **[Gate]** El retiro de columnas es destructivo y en up1 no se aisla por mod: el sync regenera el
  modelo completo. Requiere ventana de coordinacion con core antes de aplicar.
  _Fuente: `up1/CLAUDE.md` (Sync Mechanism, Schema-Driven Development)._
- **[Gate]** **El merge del sync es append-only: nunca quita un campo que el mod deja de declarar.**
  Sacar las claves del JSON del mod no las saca de la plataforma; el RecordType publicado en core las
  conserva y el codegen las sigue emitiendo. El retiro exige intervenir el archivo mergeado en
  `object-manager/objects/business/` y **commitearlo**, o la proxima corrida lo revierte. _Fuente:
  commits `fbdcfcb6` (UPONE-1623) y `00b35fb1` (UPONE-1523) del repo `object-manager`; medicion en
  `sp9/UPONE-1619-publicacion-en-core.md`._
- **[A favor]** Ese tramo se commitea en `object-manager` **con el id de este ticket**, siguiendo el
  precedente del commit "sync UPONE-1523 objects into object-manager", que es del propio ticket de mod.
  _Fuente: commit `00b35fb1`; `up1/CLAUDE.md` (commits con el id de Jira)._
- **[A favor]** Cambio de esquema por JSON: editar el objeto, correr codegen, y dejar que el pipeline
  genere la migracion. No escribir SQL a mano ni forzar el schema. _Fuente: `up1/CLAUDE.md`
  (Schema-Driven Development)._
- **[A favor]** En RecordTypes las FK son ids escalares, no relaciones: no van en `include`. _Fuente:
  `up1/CLAUDE.md` (RecordType Conventions)._
- **[A favor]** Reusar el arbol de `CurricularSection` en vez de crear un objeto suelto: trae la
  jerarquia, el listado embebido y los layouts asociados ya construidos. _Fuente:
  `mods/curriculum-design/objects/CurricularSection.json:11-22, 73-81`._
- **[A favor]** El listado embebido filtrado por el padre ya se usa en el mismo mod un nivel mas
  arriba: seguir ese patron en vez de inventar otro. _Fuente:
  `mods/curriculum-design/config/layouts/default_Activity_edit.json:113-149`._
- **[Advertencia]** El listado filtra sus columnas a campos reales del objeto, asi que un total
  derivado declarado en config puede no aparecer en pantalla. Verificar el render real, no solo la
  config y la base. _Fuente: `layout/docs/reference/record-list-config-keys.md`._
- **[Advertencia]** El inventario de consumidores de las claves de horas es mayor que el guard de
  modalidad por defecto: hay layouts del RecordType, layouts de silabo, columnas del formulario de
  curso y una heuristica de tipo de campo que las nombra. Barrer los cuatro antes de retirar.
  _Fuente: `mods/curriculum-design/config/layouts/`, `mods/curriculum-design/modsComponents/CompositeSectionTree/resolveFieldKind.ts:24-27`._
- **[Evitar]** No editar los archivos sincronizados en `modsComponents/` de layout ni de suite: se
  edita la fuente en el mod y se corre el sync. _Fuente: `up1/CLAUDE.md` (Critical Rules)._
- **Transversal:** tenant isolation en toda query; correr sync; no commitear artefactos de sync/seed;
  en codigo, commits y PR usar solo el id de Jira. _Fuente: `up1/CLAUDE.md`._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1523 | Carga de nuevos objetos requeridos (academic-scheduling) | coordinar: ya creo el cluster de secciones y las FKs de la seccion, y dejo diferida la FK a la pieza esperando este ticket | Revision de companeros |
| UPONE-1615 | Implementar logica de Roles internos | hermano SP9; **coordinar**: migra el mismo `seed/_data-rbac.js` donde este ticket declara las capabilities de sus objetos nuevos, y mueve los roles a los que el DoD las cablea | Backlog |
| UPONE-1541 | Ajustar Seed de requisitos | hermano SP9; toca **otro** archivo de datos del seed (`_data-requirement.js`), pero comparte `tests/integration/seed-counts.test.ts`, `docs/reference/seed-counts.md` y la corrida del seed: coordinar ahi, no serializar los dos tickets completos | Backlog |
| UPONE-1530 | Curriculum Mapping MCP sync | hermano SP9; comparte el acuerdo de sincronizacion con el MCP del sprint | Backlog |

## Referencias

- Fuente canonica: UPONE-1619 (enlace al plan de tickets en la descripcion).
- Plan de tickets completo (3 epicas, 16 tickets): artifact "Plan de tickets · InstructionalComponent",
  enlazado en la descripcion del ticket.
- Refinamiento 2026-08-13 y planning SP9 2026-08-14: decision de tomar solo la Epica 1 y concentrarla
  en un ticket, con estimacion de cerca de una semana.
- Carga registrada del sprint (interno, no pegar en Jira):
  `sp9/00-carga-curriculum-design-instructionalcomponent.md`.
- **Lado core del refactor, medido, con el borrador del ticket a abrir** (interno):
  `sp9/UPONE-1619-publicacion-en-core.md`. Contiene que archivos de `object-manager` cambian, cuales el
  sync propaga y cuales no, los dos precedentes del historial de core, y el efecto de que no exista dato
  productivo.
- Bajada tecnica del artifact (interno): `sp8/instructional-component-plan-implementacion.md`.
- **Frontera del campo de tipos de recurso, con todo el analisis y sus decisiones** (interno):
  `sp9/UPONE-1619-tipos-de-recurso-frontera-cd-as.md`. Incluye quien usa el dato, que esta verificado y
  que fue inferencia, el mecanismo de objeto declarado por dos mods, y la pregunta redactada para
  academic-scheduling.
- Registro de analisis de origen (interno): `sp8/00-registro-analisis-instructionalcomponent.md`.
- Codigo: `mods/curriculum-design/objects/CurricularSection.json`,
  `mods/curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json`,
  `mods/curriculum-design/seed/_data-syllabus-sections.js`,
  `mods/curriculum-design/config/layouts/default_Activity_edit.json`,
  `mods/academic-scheduling/objects/Section.json`, `mods/academic-scheduling/objects/SectionCluster.json`.
