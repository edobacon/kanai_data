# UPONE-1541 - Pre-intake (guia de implementacion)

> Material del implementador. **No va a Jira.** Alimenta el intake de DKC: entrega el enfoque decidido,
> las hipotesis a validar y los riesgos tecnicos. Contrato del ticket: `UPONE-1541-detalle.md`.
> Limites verificados: `UPONE-1541-limites-de-escritura-y-retiros.md`.
>
> **Revision 2026-08-17:** reescrito. La version anterior recomendaba **no** aplanar y acotar el ticket
> a poblar campos opcionales, por haber concluido que el editor si podia reproducir la forma del seed.
> Esa conclusion medía si el editor **lee y extiende** la forma, no si el usuario puede **crearla**. El
> enfoque decidido es aplanar.
>
> **Revision del detalle, 2026-08-17:** el `detalle.md` tambien fue reescrito por el mismo motivo. La
> version anterior del detalle concluia que la premisa del ticket estaba refutada, porque el editor
> **lee y extiende** arboles anidados. Esa verificacion respondia la pregunta equivocada: lo que importa
> es si el usuario puede **producir** esa forma, y no puede. Alcance y criterios del detalle se
> actualizaron en consecuencia.

## Veredicto y superficie

**Veredicto: la premisa del ticket se sostiene, y el limite es el alta, no la lectura.** El editor lee
y extiende arboles anidados sin problema; lo que no puede es producir la forma del seed desde cero ni
editar mas que la exigencia de una hoja.

**Superficie:** 1 archivo de datos del seed, 1 archivo de test nuevo (prueba de forma) y ajustes
menores en el test de seed existente si el retiro del bloque electivo lo toca. Sin cambio de esquema.
Sin migracion. Sin tocar componentes.

## Estado actual del codigo

Todo en `mods/curriculum-design/`:

- **Forma que siembra el seed:** `seed/_data-requirement.js:97-143`. Raiz `Group[AND]` (`:97-100`),
  `Group[OR]` "Vía de ingreso" anidado (`:102-105`), `Group[AND]` "Cálculo + Álgebra" bajo el OR
  (`:107-110`), hojas de curso (`:113-125`), umbral de creditos global (`:127-130`) y hoja recomendada
  global (`:140-143`).
- **Guard de idempotencia:** `:59-63`, busca por label de raiz **global** (no por owner). El anclaje de
  la asignatura por codigo esta en `:50`.
- **Bloque electivo sobre el Plan:** `:159-201`, con `effect: 'ProgressGate'` y `creditsRequired: 24`.
- **Techo del alta:** `modsComponents/RequirementEditor/requirementCreate.logic.ts:57-83` (el
  contenedor se crea en la raiz y reparenta hacia abajo) y `:108-138` (resolucion del grupo destino, 3
  casos).
- **Campos que la UI captura:** `requirementFamilies.logic.ts:68-79` (condicion a estado mas momento),
  `:99-143` (las 3 familias y sus presets).
- **Labels que la UI persiste:** `RequirementEditorElement.vue:811-814` (contenedores), `:725-739`
  (hojas y metrica), `:831` (pool electivo).
- **Nombres que el render deriva y no lee del dato:** `ReglaUnificadaView/RequirementTreeNode.ts:263,268`
  ("Via N" en lugar del label del grupo de via) y `:270-272` (verbo de la hoja).
- **Cobertura existente:** la forma anidada esta cubierta como *fixture* en cuatro specs, pero ninguna
  corre el loader. `tests/integration/seed-counts.test.ts:471-508` si invoca `loadRequirement` con un
  mock de Prisma, y verifica **solo** que los objetivos resuelvan a asignaturas reales.

## Contexto (para dimensionar)

Verificacion en codigo de por que el limite esta en el alta y no en la lectura:

La lectura del arbol es fiel a cualquier forma y no es el problema: `buildRequirementTree` reconstruye
por `parentId` y ordena por `position`, y el editor localiza el contenedor de vias a cualquier
profundidad. **El limite esta en el alta y en la edicion:**

- **Techo del alta.** El contenedor de vias se crea **siempre en la raiz** y, si ya habia nodos, los
  reparenta **debajo** de el (`mods/curriculum-design/modsComponents/RequirementEditor/requirementCreate.logic.ts:68-81`).
  No hay camino que cree un `Group` por encima del contenedor, que es justo lo que el seed siembra
  (raiz `Group[AND]` con el `Group[OR]` anidado, `mods/curriculum-design/seed/_data-requirement.js:97-105`).
- **Condiciones globales no creables.** Toda hoja creada cuelga de un `Group[AND]` de via o de un pool
  (`requirementCreate.logic.ts:108-138`). Las dos hojas que el seed cuelga de la raiz (umbral de
  creditos y la recomendada) no tienen camino de alta.
- **`Approved` sin momento no es alcanzable como hoja de via.** El selector de condicion setea estado
  y momento juntos, siempre (`modsComponents/RequirementEditor/requirementFamilies.logic.ts:75-79`).
  Cuatro de las cinco hojas del seed quedan sin momento (`_data-requirement.js:113-125`), y de ahi
  vienen los badges distintos.
- **Labels autorados.** El seed nombra los contenedores a mano; la UI persiste sus propios literales
  (`modsComponents/RequirementEditor/RequirementEditorElement.vue:811-814`).
- **Edicion parcial.** "Editar" cambia solo la exigencia (Obligatorio / Recomendado)
  (`RequirementEditorElement.vue:917-935`). Es **simetrico** (tampoco se puede editar lo que el usuario
  creo), asi que **no** se resuelve con este ticket y queda registrado como limite del editor.
- **El retiro del bloque electivo tiene dos consumidores fuera del archivo de datos** (verificado el
  2026-08-17): el loader devuelve `results.electiveBlock`
  (`mods/curriculum-design/seed/_data-requirement.js:43, 201`), y esa clave la lee el orquestador del seed
  para su linea de log (`seed/seed.js:171`, `existed | created | skip`) y la mockea un test de entrada
  (`tests/integration/seed-entry.test.ts:121`). Retirar el bloque sin tocar esos dos deja un log que
  reporta un paso que ya no existe y un test que afirma un contrato muerto.
- **Hueco de cobertura.** Ningun test invoca `loadRequirement()` y verifica la **forma** que produce.
  Los tests del seed solo validan que los objetivos resuelvan a asignaturas reales
  (`mods/curriculum-design/tests/integration/seed-counts.test.ts:471-508`). No hay ningun assert de
  cantidad de nodos de requisitos, asi que reestructurar el arbol no rompe conteos.

Los layouts genericos no son una via alternativa: exponen los campos escalares pero no el padre ni el
owner, asi que la jerarquia solo se escribe por el editor. No hay cambio de esquema en juego: el
objeto y sus RecordTypes ya declaran todos los campos.

## Enfoque decidido

Aplanar a la forma canonica del alta, con las decisiones ya cerradas (ver tabla de decisiones mas
abajo): globales duplicadas por via, labels alineados a los literales de la UI, momento declarado en
las hojas, bloque electivo del Plan retirado, electivo de reemplazo dentro de una via, prueba de forma
nueva.

**Secuencia sugerida:**

1. Agregar la prueba de forma contra el loader real y verla pasar **con el seed actual**. Congela el
   comportamiento vigente antes de cambiar nada.
2. Reestructurar los datos y ver que la prueba refleja el cambio esperado.
3. Ajustar el guard de idempotencia en el **mismo** paso en que la raiz cambia de nodo.
4. Retirar el bloque electivo del Plan y sembrar el electivo de reemplazo dentro de una via.
5. Correr la suite del mod y verificar en runtime en UPU.

## Gotchas verificados

- **El guard rompe si no se toca junto con la raiz.** Busca `label: 'Requisitos EST200'` con padre nulo
  (`:59-61`). Y la raiz no se renombra: **cambia de nodo**, porque el `Group[AND]` autorado desaparece y
  el contenedor de vias pasa a ser el nodo raiz, con el label por defecto del alta (generico y
  compartible entre arboles). El guard tiene que pasar a ser por owner, lo que obliga a resolver la
  asignatura **antes** del guard (hoy es al revés, para ahorrar el lookup).
- **Los conteos no son un riesgo.** No hay ningun assert de cantidad de nodos de requisitos en los
  tests; el unico conteo del area es de categorias de requisito (80), ajeno a esto.
- **La semantica de las condiciones globales cambia si se mueven mal.** Bajo un OR, una condicion que
  vive en una sola via deja de exigirse cuando se cumple la otra. De ahi la duplicacion.
- **`Approved` sin momento no es un descuido universal.** Es inalcanzable como hoja de via, pero **si**
  es lo que produce el alta para las hojas de un pool electivo, que usan los presets de curso y no
  pasan por el selector (`RequirementEditorElement.vue:832-843`). Si se siembra el electivo de
  reemplazo, sus hojas van sin momento, a proposito.
- **Bases ya sembradas no se migran.** El guard nuevo las reconoce y no replanta, asi que conservan la
  forma vieja hasta un re-seed limpio. Decision tomada: no borrar de forma destructiva.
- **El retiro del bloque electivo sale del archivo de datos.** El loader devuelve
  `results.electiveBlock` (`:43` y `:201`) y hay dos consumidores: la linea de log del orquestador
  (`seed/seed.js:171`, imprime `existed | created | skip`) y el mock del test de entrada
  (`tests/integration/seed-entry.test.ts:121`). Los dos se ajustan en el mismo paso que el retiro.
- **Coordinacion con UPONE-1619:** los archivos de datos son distintos (`_data-requirement.js` aqui,
  `_data-syllabus-sections.js` alla), asi que pueden avanzar en paralelo. Lo compartido es
  `seed-counts.test.ts`, `docs/reference/seed-counts.md` y la corrida del seed: acordar el orden ahi.

## Hipotesis a validar (para el intake)

- **H1: el arbol aplanado sigue siendo extensible desde el editor sin duplicar contenedores.**
  *Validacion:* sobre el arbol sembrado, agregar una condicion a una via existente y agregar una via
  nueva; verificar que reusa el contenedor de la raiz.
- **H2: el guard por owner no duplica ni deja de reconocer el arbol.** *Validacion:* correr el seed dos
  veces sobre base limpia y contar arboles; despues correrlo sobre una base que ya tenga el arbol viejo.
- **H3: el render del arbol aplanado no pierde informacion respecto del actual.** *Validacion:*
  contrastar en pantalla antes y despues; con dos vias el contenedor OR se muestra, con una
  `collapseSingleVia` lo oculta.
- **H4: ningun test existente depende de la forma vieja del arbol ni del bloque electivo del Plan.**
  *Validacion:* suite completa del mod tras el cambio.
- **H5: la diferencia visual que motivo el ticket desaparece.** *Validacion:* abrir el arbol sembrado y
  uno creado a mano desde el editor y contrastar badges, nombres y jerarquia. Si sigue habiendo
  diferencia, hay una causa que no esta en este analisis.

## Decisiones tecnicas que resuelve el dev en ejecucion

- Prueba de forma como test de integracion contra el loader real con el mock de Prisma existente
  (reusa `makePrismaMock`, mismo patron que `seed-counts.test.ts`) o como archivo nuevo dedicado. El
  patron existente ya invoca el loader, asi que conviene reusarlo.
- Cuantas vias siembra el ejemplo (dos alcanza para que el contenedor OR se muestre y para ejercitar la
  duplicacion de globales).
- Si el electivo de reemplazo va en la via 1, en la via 2 o en una tercera.

## Archivos candidatos (tentativo, no mandato)

- `mods/curriculum-design/seed/_data-requirement.js` (estructura, labels, campos de hojas, guard,
  resultado devuelto).
- `mods/curriculum-design/tests/integration/seed-counts.test.ts` o un archivo nuevo para la prueba de
  forma.
- `mods/curriculum-design/seed/seed.js` (linea de log del bloque electivo retirado).
- `mods/curriculum-design/tests/integration/seed-entry.test.ts` (mock del resultado del loader).

**No tocar:** `modsComponents/RequirementEditor/*` ni `modsComponents/ReglaUnificadaView/*`. Todo lo que
este ticket necesita del editor ya existe; cambiarlo es otro ticket.

## Decisiones tomadas (dev, 2026-08-17)

Motivo detras de cada punto que en el detalle solo aparece como alcance ya resuelto:

| Decision | Resuelto | Motivo |
|---|---|---|
| Condiciones globales al aplanar | **Duplicar en cada via** | preserva la semantica: bajo un OR, una condicion en una sola via deja de exigirse cuando se cumple la otra via |
| Bloque electivo del Plan | **Retirar del seed** y documentar | no es reproducible (efecto y creditos requeridos no los captura ninguna pantalla, la escritura esta acotada a asignatura) ni visible (ningun layout monta la vista) |
| Labels | **Alinear a los literales de la UI**, sin autorar | lo que el render deriva (numero de via, verbo de la hoja) no se persiste; el resto replica lo que grabaria el usuario |
| Label de la metrica | **Persistir el literal real** de la UI aunque se lea raro | no autorar; el label mejorable queda como follow-up de la UI |
| Tratar el label como key i18n | **Fuera de alcance** | evaluado aparte; el campo lo consume tambien el CRUD generico de core, que no resuelve keys en valores de datos |
| `position` | **Mantenerla explicita en el seed** | la UI la omite y el render la normaliza a 0; sin ella el orden del ejemplo depende del orden de la consulta. Es un campo que la UI no expone, no un valor inalcanzable |
| Guard de idempotencia | **Pasar a guard por owner**, resolviendo la asignatura antes | la raiz pasa a tener un label generico y compartible, asi que el guard por label global dejaria de ser correcto |
| Arboles ya sembrados con la forma vieja | **No migrar de forma destructiva**; requieren re-seed limpio | el seed no debe borrar datos que un usuario pudo haber editado. Queda documentado, y en UPU se rearma la base |

## Labels: por que ningun literal se autora

Analisis detras de la tabla de labels que quedo en el detalle (seccion "Forma objetivo > Labels a
persistir"):

Ningun texto del seed se escribe a mano. Cada label es el que el alta aplica **por defecto segun el rol
del nodo**, no segun su combinador: los dos labels de contenedor viajan juntos y se asignan por lo que se
esta creando, y la prueba es que el pool electivo tambien es un `Group[OR]` y no lleva el label del
contenedor de vias.

**Consecuencia directa:** sin labels autorados el seed pierde su ancla por label, y el guard de
idempotencia tiene que pasar a ser por owner (ver decision correspondiente en la tabla de arriba y el
gotcha del guard). Si se deja como esta, busca una raiz que ya nadie siembra y replanta el arbol en cada
corrida.

## Frontera core/mod (Aduana)

Veredicto de la pasada de Aduana: **`todo-mod-only`** (detalle en `sp9/UPONE-1541-aduana.md`). El
alcance ejecutado es datos del seed mas un test, ambos del mod. Ningun artefacto toca un objeto Base,
un resolver mas alla del CRUD generico, un componente de la libreria compartida, una capability ni un
evento.

Nota: la unica linea que **si** tocaria core es tratar el label como key traducible, porque exigiria
que core resuelva keys en valores de datos. Esta explicitamente fuera de alcance (ver decision
correspondiente en la tabla de arriba).

## Estimacion: razonamiento comparativo

El numero (3 SP, o 2 SP sin electivo de reemplazo) quedo en el detalle. El por que:

Es mas que poblar campos opcionales: se reestructura el arbol sembrado, se duplican condiciones para
preservar semantica, se retira un bloque, se ajusta el guard de idempotencia y se agrega la prueba de
forma que hoy no existe. No hay cambio de esquema, de UI ni de migracion, y los conteos del seed no
estan asertados, lo que acota el riesgo.
