---
id: DOC-kb-sp9-UPONE-1541-aduana
project: up1
type: doc
---

# UPONE-1541 - Evidencia extendida de Aduana (frontera core/mod)

> **Interno, no pegar en Jira.** El resultado condensado (tabla por artefacto + veredicto global) vive
> en la seccion "Frontera core/mod (Aduana)" de `UPONE-1541-detalle.md`. Aqui queda el rastro de la
> pasada: que se busco, que excepciones se aplicaron y que razonamiento se descarto.
> Modo: analisis. No se invoco `core-extension-writer` ni se creo ningun ticket.

## Veredicto global

`todo-mod-only`. Ningun artefacto de ninguno de los dos caminos posibles toca un objeto Base, un
resolver mas alla del CRUD generico, un componente de la libreria compartida, una capability o un
evento.

Se juzgaron los artefactos de **ambos caminos** porque la decision de fondo no esta tomada:
(a) aplanar o ajustar el seed, (b) habilitar en el editor la forma anidada con condiciones globales.

## Que se busco

- Los cuatro archivos conocidos del ticket, leidos completos en el working copy correcto
  (`uplanner/up1/mods/curriculum-design`).
- El objeto `requirement.json` y sus RecordTypes (`Group`, `RecordState`, `MetricThreshold`) para
  confirmar que viven en los objetos del mod y no entre los objetos Base del core.
- Las mutaciones que usa el componente del editor, para determinar si llama resolvers propios o el CRUD
  generico de Object Manager. Resultado: usa las mutaciones genericas de crear, actualizar y borrar
  instancia (`RequirementEditorElement.vue:427-443, 801-809`). Ningun resolver nuevo esta implicado por
  ninguno de los dos caminos.
- La definicion de campos de hoja del editor, para verificar la afirmacion de que la UI si captura los
  campos opcionales que el seed no puebla. Confirmado en `requirementFamilies.logic.ts:108-111`, lo que
  ubica la responsabilidad del camino (a) en el seed y no en la UI.
- Un precedente de patron citado en el propio docstring del ensamblador de arbol: el arbol compuesto de
  secciones del mod. Verificado que tambien es un componente propio del mod, sincronizado al workspace
  de layout, no un componente de la libreria compartida.

## Excepciones por tipo de artefacto aplicadas

- **Objeto / campo de schema:** el objeto de requisitos y sus RecordTypes no son core-worthy porque no
  son objetos Base ni cambian el mecanismo de Object Manager: son el objeto propio del mod.
- **Resolver:** no es core-worthy porque el CRUD generico ya cubre ambos caminos. No hay mutacion nueva
  que el generico no pueda expresar.
- **Componente de layout:** el editor de requisitos no es core-worthy porque es un componente de
  dominio especifico del mod (arbol de requisitos curriculares), no un atomo o molecula generico
  reutilizable por otro mod sin conocer este negocio.
- **No aplicadas:** la excepcion de tipo de layout o capacidad de configuracion de layout, porque
  ninguno de los dos caminos toca los layouts genericos ni el orquestador; el editor es un componente
  propio de punta a punta. Tampoco las de capability ni evento, porque ningun artefacto introduce
  ninguno.

## Razonamiento descartado

- **Generalizar el patron de ensamblador de arbol gemelo (frontend y backend) para todos los mods.**
  Existe el precedente del arbol compuesto de secciones, y podria argumentarse como extension de core.
  Se descarto porque este ticket no pide esa generalizacion: es un hallazgo colateral, no un artefacto
  implicado por el requerimiento. Forzarlo aqui seria expandir el alcance. Si se quiere perseguir, es un
  ticket aparte.
- **Construir un editor de arboles booleanos generico** (anidamiento arbitrario a N niveles). Se
  descarto porque el requerimiento acota el camino (b) a **un** patron especifico y conocido, el del
  ejemplo sembrado, no a un editor generico. Ese generico no esta pedido ni implicado.
- **Interpretar el limite del editor como un workaround de una limitacion de los layouts del core.** Se
  descarto tras confirmar que este flujo no usa el orquestador de layouts en absoluto: es un elemento de
  formulario propio de punta a punta, asi que no hay limitacion de core en juego, es diseno de dominio
  del mod.

## Nota de reconciliacion con la verificacion de codigo

**Revisado el 2026-08-17.** La redaccion anterior de esta nota decia que la logica de alta del mod "ya
resuelve" el contenedor de vias a cualquier profundidad y que por eso la premisa del ticket quedaba
refutada. Eso confundia dos capacidades distintas: el alta **reusa** un contenedor existente a cualquier
profundidad (extender), pero cuando no existe lo crea **en la raiz** y reparenta hacia abajo, asi que no
puede **crear** la forma que siembra el seed. La premisa del ticket se sostiene.

El veredicto de frontera no cambia: sigue siendo **todo del mod**. Y el camino ejecutado es el (a),
ajustar el seed, cuyos artefactos ya estaban juzgados `mod-only` en la tabla de arriba. El camino (b),
habilitar la forma en el editor, queda fuera de alcance y tambien era `mod-only`, asi que si algun dia
se ejecuta no requiere coordinacion con core.

Detalle de los limites verificados: `UPONE-1541-limites-de-escritura-y-retiros.md`.
