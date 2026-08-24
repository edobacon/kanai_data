# UPONE-1616 - Pre-intake (guia de implementacion)

> Material del implementador. **No va a Jira.** Alimenta el intake de DKC: entrega el mapa de enfoques,
> las hipotesis a validar, los riesgos tecnicos y el analisis completo de por que el ticket queda partido
> en dos mitades, para que el intake genere y valide hipotesis en vez de investigar desde cero. Contrato
> del ticket (linea de ejecucion que se pega en Jira): `UPONE-1616-detalle.md`.

## Veredicto y superficie

**Veredicto: el ticket es orden, y el renombre alcanza solo a los objetos que no comparte otra app.**
Reordenar es adoptar una capacidad que la plataforma ya ofrece y editar un array. Renombrar funciona para
los tres objetos que solo declara este mod (programas academicos, planes de estudios, historial de
cambios), y **no funciona** para Activity y Offering, que Engagement declara tambien como pestañas.

**Superficie estimada de cambio:** 1 archivo de config del mod (array de vistas), 1 test del mod a
actualizar, 1 a 3 archivos de traduccion, y posiblemente 1 etiqueta de layout. Cero codigo. La
verificacion pesa mas que el cambio, porque hay que comprobar dos apps en el mismo tenant.

**Regla a tener presente:** un mod controla el nombre de las vistas cuyos objetos **solo el** declara como
pestaña. Para un objeto compartido con otra app no existe nombre propio por app, y peor: la declaracion
propia puede **perder** por el orden de capas (ver abajo).

## Contexto (para dimensionar)

El trabajo se parte en dos mitades con dificultad muy distinta, y esa es la clave para dimensionar.

**Reordenar es barato y es del mod.** El orden de las cinco vistas lo da la posicion en el array de
objetos por defecto de la app, declarado en la config del mod
(`mods/curriculum-design/config/app.json:9`), y el core lo consume tal cual
(`suite/composables/navTabs.ts:154-168`, `suite/composables/useObjectManager.ts:643-671`). Reordenar es
editar ese array. Hay un test del mod que fija el array exacto y que hay que actualizar en el mismo
cambio (`mods/curriculum-design/tests/integration/layouts-declared.test.ts:231-237`).

**Renombrar depende de si el objeto lo comparte otra app, y eso parte las cinco vistas en dos grupos.**
El texto visible de cada pestana sale de una clave de traduccion por **nombre de objeto**
(`suite/composables/useObjectManager.ts:625-633`), sin calificador de aplicacion. Cada mod declara sus
traducciones en su propio namespace (`<workspace>/<archivo>`), pero en runtime **todos los namespaces se
fusionan en un solo catalogo** por tenant e idioma, en un orden de capas fijo: primero core, despues los
mods **en orden alfabetico**, y encima el override por tenant
(`suite/scripts/lib/i18n-source-map.mjs`, funcion de orden de capas; consumo en
`suite/utils/i18nBridge.ts:109-131`). Para una clave repetida **gana la ultima capa**. El contexto de
i18n no incluye la aplicacion (`contextKey` es idioma, pais, institucion, objeto, tipo y nombre de
layout), asi que no hay aislamiento por app en ninguna parte de la cascada.

De ahi la particion:

| Vista | Objeto | La declara otra app? | El mod puede nombrarla? |
|---|---|---|---|
| Programas academicos | AcademicProgram | No | Si |
| Planes de estudios | Curriculum | No | Si |
| Historial de cambios | core_DataLog | No | Si |
| Programa de asignatura | Activity | **Si, Engagement** | **No** |
| Silabos | Offering | **Si, Engagement** | **No** |

Para los dos compartidos la situacion es peor que una simple colision: `uengagement-up1` va **despues**
de `curriculum-design` en el orden alfabetico de mods, asi que si Curriculum Design declara la clave,
**Engagement la sobreescribe y el cambio no toma efecto**. Y si se declara en el override por tenant, que
es la unica capa que gana, se le aplica tambien a Engagement, donde `Offering` significa oferta de
servicio y no silabo. Ninguna de las dos vias sirve.

Las dos vistas que ya estan correctas ("Programas academicos" y "Planes de estudios") vienen hoy del
override por tenant, no del mod.

**Lo que el ticket pide ya existe como texto, pero en otro sistema de etiquetas.** Los nombres
objetivo no son inventados: `Activity` ya declara "Programa de asignatura" como su etiqueta de objeto
(`mods/curriculum-design/objects/activity.json:7-8`), y el layout de lista de silabos ya se llama
"Silabos" (`config/layouts/default_Offering_syllabus_list.json`). El detalle es que el menu y la ruta de
navegacion **no consumen** esas etiquetas: usan la clave de traduccion por objeto. En el core conviven
dos sistemas de etiquetado paralelos y desconectados, y el que alimenta el menu no es el que ya tiene
los nombres correctos. Tampoco resolveria el problema de raiz, porque la etiqueta de objeto tambien es
por objeto y no por app.

**Ninguna de las dos vistas del orden objetivo es nueva.** "Programa de asignatura" es el objeto
Activity y "Silabos" es el objeto Offering: son renombres de vistas existentes, no altas.

**La ruta de navegacion se arregla sola.** El nivel de seccion de la ruta reutiliza literalmente la
misma etiqueta ya calculada para el menu (`suite/composables/breadcrumbTrail.ts:216-220`), asi que
cualquier cambio de nombre o de orden se propaga sin tocar codigo de navegacion. El tercer criterio del
PO no agrega trabajo propio: depende de resolver los dos primeros.

**Correccion y parafraseo del segundo criterio del PO.** "El nombre de la pestana debe estar alineado con
el nombre de la vista" se puede leer de dos formas. Si "pestana" es la pestana del menu, es el trabajo
descrito arriba. Si es la pestana del navegador, hoy esa no refleja la vista en absoluto: muestra solo el
nombre de la aplicacion (`suite/pages/[tenant_id].vue:254-268`), y hacerla depender de la vista activa
seria un cambio de core no contemplado. Por el resto del ticket, que habla de menus, la lectura probable
es la primera. Esta ambiguedad queda como decision abierta (ver mas abajo) porque conviene cerrarla con el
PO antes de ejecutar.

**Correccion a un supuesto del refinamiento.** En el refinamiento se dio por sentado que la capacidad
de "orden de vistas por rol" es del core y todavia no esta construida. **Si esta construida**: el
mecanismo existe, esta validado en el sync y tiene un mod de referencia que ya lo usa. Curriculum
Design simplemente no lo adopto. Esto no cambia el alcance de este ticket, porque el equipo decidio que
no la necesita ahora, pero corrige el supuesto para cuando se necesite.

## Limitacion conocida: el nombre de dos vistas no se puede cambiar desde el mod

Esta seccion explica por que el ticket entrega el orden completo pero solo parte de los nombres. No es una
decision de alcance nuestra: es una capacidad que la plataforma no tiene hoy.

**Que si se puede.** Reordenar las cinco vistas, y renombrar las tres cuyos objetos solo declara Curriculum
Design: programas academicos, planes de estudios e historial de cambios.

**Que no se puede.** Renombrar la vista de **programa de asignatura** (objeto `Activity`) y la de **silabos**
(objeto `Offering`), porque **la app de Engagement declara esos mismos dos objetos como pestañas en el mismo
tenant**, y el nombre visible de una pestaña se indexa por objeto, no por aplicacion.

**Por que.** El menu resuelve el nombre con una clave por objeto
(`suite/composables/useObjectManager.ts:625-633`), y no existe ningun punto donde declarar un nombre
distinto por app:

- La configuracion de la app no tiene campo de nombre por pestaña: una entrada acepta el nombre de un
  objeto o el tab de dashboards (`object-manager/objects/up1/suite/up1_suite_app.json`), y la pestaña
  resuelta en el servidor descarta cualquier clave extra (`suite/logic/app.resolver.js:29-47`).
- El contexto de traducciones no incluye la aplicacion: es idioma, pais, institucion, objeto, tipo y nombre
  de layout (`suite/utils/i18nBridge.ts:70-73`).
- Las traducciones de todos los mods se fusionan en un catalogo unico por tenant e idioma, con precedencia
  core, mods en orden alfabetico y override por tenant al final
  (`suite/scripts/lib/i18n-source-map.mjs`). Como `uengagement-up1` va despues de `curriculum-design`, si
  este mod declara la clave, **Engagement la sobreescribe y el cambio no toma efecto**.
- La capacidad de etiqueta de negocio del objeto, construida con UPONE-1504
  (`layout/src/shared/objectLabels.ts`), tampoco sirve: no alimenta el menu, y su etiqueta tambien es por
  objeto, asi que cablearla daria el mismo resultado.

**Agravante de dominio.** En Engagement `Offering` es una oferta de servicio, no un silabo. Forzar el nombre
compartido no seria solo inconveniente: seria incorrecto en uno de los dos dominios.

**Que haria falta.** Ver la seccion siguiente. Mientras esa capacidad no exista, las dos vistas conservan su
nombre actual.

## Precondicion para completar el renombre

Lo que sigue es una **precondicion de plataforma que hoy no esta cumplida**. No es una mejora posterior ni un
trabajo opcional: es el requisito **sin el cual esa parte del alcance no se puede ejecutar**, en este ticket
ni en ninguno. Por eso las dos vistas afectadas quedan fuera del alcance **por bloqueo, no por decision**.

**Este ticket no implementa la precondicion.** Se limita a lo que la plataforma ya ofrece. Si la precondicion
se cumple antes del cierre, los dos nombres se completan aqui; si no, quedan para el ticket que consuma la
capacidad.

**La precondicion tiene ticket: UPONE-1645.** "Core | Nav | Nombre de vista declarable por aplicacion", en
este mismo sprint (SP9), con la evidencia completa en su descripcion.

**Y ya esta validada.** Se implemento en un spike local y se verifico en runtime: con ella, el menu de
Curriculum Design queda con el orden **y** los dos nombres que pide el PO, y el menu de la app de Engagement
no cambia en nada. Es decir, **el desbloqueo esta probado, no supuesto**. Con UPONE-1645 ejecutado, completar
esos dos nombres pasa a ser una linea de configuracion en este mod, sin mas trabajo de plataforma.

La decision de la frontera y de la forma final es del **equipo de core**. Lo que sigue es el requisito y una
forma posible, con su superficie de cambio ya rastreada, para que core pueda darle su visto bueno.

### El requisito

> Un mod debe poder declarar el nombre de la vista que **el** expone sobre un objeto, y ese nombre debe
> aplicar **solo a su propia app**, sin alterar el nombre global del objeto ni el que ve cualquier otra app.
> Debe funcionar igual **sea el mod dueño del objeto o no**: tanto para un objeto propio del mod como para
> un objeto Base que varias apps declaran como vista.

La clave del requisito es **desacoplar el nombre de la vista del nombre del objeto**. Hoy los dos estan
pegados, y de ahi viene la limitacion: cualquier via que pase por el nombre del objeto (la clave de
traduccion por objeto, o la etiqueta de negocio de la definicion del objeto) es global por objeto y por
tanto se filtra a las demas apps. Mientras el nombre siga viviendo en el objeto, el problema no se puede
resolver, ni siquiera declarando quien es el dueño: dos apps legitimamente necesitan llamar distinto a la
misma cosa, porque en cada dominio **es** otra cosa.

### Propiedades que debe cumplir

- [ ] El nombre se declara **por vista de una app**, no por objeto.
- [ ] Declararlo en una app **no tiene ningun efecto** en las demas apps que declaren el mismo objeto.
- [ ] Funciona sin importar si el objeto es propio del mod o compartido; no depende de un concepto de
      propiedad del objeto.
- [ ] Es **traducible** a los tres idiomas, no texto literal fijo.
- [ ] Es **opt-in y compatible hacia atras**: una vista que no lo declara se comporta exactamente como hoy.
- [ ] La **ruta de navegacion** y el **encabezado de la vista** quedan coherentes con ese nombre, para que
      no reaparezca el desalineado que este ticket viene a corregir.

### Forma propuesta

Permitir que la entrada de una vista, en la configuracion de navegacion de la app, declare de forma
opcional la clave de traduccion del nombre a usar:

```
"defaultObjects": [
  "AcademicProgram",
  "Curriculum",
  { "object": "Activity", "labelKey": "nav.curriculumDesign.activity" },
  { "object": "Offering",  "labelKey": "nav.curriculumDesign.offering" },
  "core_DataLog"
]
```

**Por que una clave de traduccion y no texto literal:** conserva la traducibilidad a los tres idiomas y, al
ser una clave que **cada mod define en su propio namespace**, dos mods pueden nombrar el mismo objeto de
forma distinta sin pisarse. Es lo que resuelve el problema de raiz: se deja de compartir la casilla de texto.

**Por que encaja bien con lo que ya existe:** la entrada de vista **ya admite forma de objeto** en el
esquema, y la normalizacion en el servidor **ya interpreta** una entrada con objeto y layouts. Falta solo
llevar un campo mas de punta a punta.

Superficie de cambio, toda aditiva. **Medida por el spike**, no estimada en papel: son **cuatro
archivos fuente** en `suite`, mas uno opcional en `object-manager` por correccion del esquema.

| Pieza | Cambio |
|---|---|
| `suite/logic/app.resolver.js` | Preservar el campo al normalizar la vista, en vez de descartarlo |
| `suite/logic/app.schema.graphql` | Declarar el campo en el tipo de vista resuelta; sin esto la API lo descarta |
| `suite/composables/navTabs.ts` | Sumar el campo a la interfaz de vista resuelta |
| `suite/composables/useObjectManager.ts` | Pedir el campo en la consulta **y** preferirlo sobre la clave por objeto |
| `object-manager/objects/up1/suite/up1_suite_app.json` | Declarar la variante en el esquema (opcional: no bloquea, corresponde por correccion y documentacion) |

**Correccion respecto del analisis en papel.** La primera version de esta tabla listaba
`object-manager/scripts/sync/dbSync.js` (validar el campo al sincronizar) y omitia el tipo GraphQL. El
spike mostro que es al reves: la validacion del sync **ya tolera claves extra** y no necesita cambios,
mientras que el tipo GraphQL y la seleccion de campos del cliente son obligatorios y son los dos
eslabones que el analisis no habia visto. Los gemelos de `object-manager`
(`src/graphql/resolvers/up1/suite/app.resolver.js` y `src/graphql/typeDefs/up1.js`) son artefactos de
sync y se regeneran: no se editan a mano.

La **ruta de navegacion no requiere cambios**: reutiliza la etiqueta ya resuelta del menu
(`suite/composables/breadcrumbTrail.ts:216-220`). Y el **encabezado de la vista** ya se resuelve por layout,
que es propio de cada mod, asi que con esto los tres lugares quedan alineables desde el mod. Es decir, esta
capacidad cierra tambien el segundo y el tercer criterio de aceptacion de este ticket.

### Alternativas consideradas y por que no

- **Agregar la aplicacion al contexto de traducciones.** Resolveria el caso, pero toca todo el pipeline de
  i18n de la plataforma y afectaria a todos los textos, no solo a la navegacion. Riesgo desproporcionado
  para esta necesidad.
- **Cablear el menu a la etiqueta de negocio del objeto y darle alcance por app.** Es la direccion correcta
  a largo plazo, porque hoy conviven dos sistemas de nombres desconectados, pero exige tocar el modelo de
  datos y cambia el comportamiento de consumidores que ya existen (celdas de tabla y detalle de registro).
  Mas caro y mas sensible que lo que este caso necesita.
- **Convenir un nombre neutro que sirva a los dos dominios.** Es el estado actual. No satisface el pedido y
  empeora a medida que mas mods declaran vistas sobre los mismos objetos Base.

### Por que es precondicion de plataforma y no trabajo del mod

No es exclusivo de Curriculum Design: cualquier mod que declare una vista sobre un objeto Base que otra app
tambien declara choca con lo mismo. Hoy son Curriculum Design y Engagement sobre `Activity` y `Offering`. Y
no hay ninguna via desde el mod: declarar la clave en el propio mod puede perder frente a la del otro mod, y
la unica capa que gana sobre todos los mods es el override por tenant, que aplica a todas las apps por igual.

### Efecto de la precondicion sobre el alcance de este ticket

| Parte del pedido del PO | Estado |
|---|---|
| Orden de las cinco vistas | **Ejecutable hoy.** La capacidad de ordenamiento por mod ya existe |
| Nombre de programas academicos, planes de estudios e historial de cambios | **Ejecutable hoy.** Objetos que no comparte ninguna otra app |
| Nombre de programa de asignatura y de silabos | **Bloqueado.** Depende de esta precondicion |
| Coherencia con la ruta de navegacion y el encabezado | **Ejecutable hoy** para las tres vistas libres; para las dos bloqueadas se resuelve cuando se cumpla la precondicion |

La precondicion ya tiene su propio ticket, **UPONE-1645**, en este mismo sprint, con la evidencia completa en
su descripcion: la prueba capa por capa, el spike ejecutado con su resultado en las dos apps, la superficie de
cambio y las alternativas descartadas. Lo que falta es el visto bueno del equipo de core.

## Frontera core/mod (Aduana)

Pasada de Aduana en subagente con contexto limpio, modo analisis. Este es el ticket donde la pregunta
de frontera era el corazon del problema, porque el equipo la dejo explicitamente abierta en el
refinamiento.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Orden de las cinco vistas | `mod-only` | El orden lo da la posicion en el array de la config del mod, que el core consume tal cual; la capacidad ya existe (PLAT-15) y reordenar es editar el array | `mods/curriculum-design/config/app.json:9`; `suite/composables/navTabs.ts:154-168`; `suite/logic/app.resolver.js:145-160` |
| Nombre de la vista de programas academicos | `mod-only` | Ningun otro mod declara este objeto como vista, asi que la declaracion del mod gana sin afectar a nadie; hoy ya coincide con lo pedido via el override por tenant | `suite/lang/tenants/upu/es/common.i18n.json:15`; `mods/uengagement-up1/config/app.json` (no lo declara) |
| Nombre de la vista de planes de estudios | `mod-only` | Objeto no compartido; el desalineado real esta en la etiqueta del layout del propio mod, corregible ahi | `suite/lang/tenants/upu/es/common.i18n.json:14`; `mods/curriculum-design/config/layouts/default_Curriculum_list.json:4` |
| Nombre de la vista de historial de cambios | `mod-only` | Objeto no compartido; falta la clave en espanol, que existe en en y pt | `mods/curriculum-design/lang/{en,pt}/common.i18n.json:196-198` |
| Nombre de la vista de programa de asignatura (objeto Activity) | **`core-worthy`** | La clave del menu es por nombre de objeto, el contexto de i18n no incluye la aplicacion, y Engagement declara el mismo objeto como vista en el mismo tenant. Ademas `uengagement-up1` va despues de `curriculum-design` en el orden alfabetico de mods, asi que la declaracion del mod **pierde** y el cambio no toma efecto | `suite/composables/useObjectManager.ts:625-633`; `suite/utils/i18nBridge.ts:70-131`; `suite/scripts/lib/i18n-source-map.mjs` (orden de capas); `mods/uengagement-up1/config/app.json` |
| Nombre de la vista de silabos (objeto Offering) | **`core-worthy`** | Mismo problema de raiz. Agravante de dominio: en Engagement `Offering` es una oferta de servicio, asi que llamarla "Silabos" ahi seria incorrecto | `mods/uengagement-up1/config/app.json`; vista del mod ya correcta en `mods/curriculum-design/config/layouts/default_Offering_syllabus_list.json:4` |
| Etiqueta por pestana en el esquema de la app | **`core-worthy`** (capacidad ausente) | El esquema de la app no tiene donde declararla: `defaultObjects` es un array de nombres y las entradas de `navByRole` solo llevan objeto y layouts. La interfaz de tab resuelta server-side tampoco tiene campo de etiqueta | `object-manager/objects/up1/suite/up1_suite_app.json`; `suite/composables/navTabs.ts` (interfaz `NavTab`); `suite/logic/app.resolver.js:29-47` (`normalizeTab` descarta claves extra) |
| Ruta de navegacion (nivel de seccion) | `mod-only` | Reutiliza la etiqueta ya calculada para el menu; no hay artefacto propio que tocar | `suite/composables/breadcrumbTrail.ts:216-220` |
| Jerarquia de navegacion | `mod-only` | Ninguno de los cinco layouts declara padre de navegacion ni se oculta del menu; el reorden no altera la jerarquia | `suite/docs/features/breadcrumbs.md:26-40` |
| Titulo de la pestana del navegador | `mod-only` (fuera de alcance) | Depende solo del nombre de la aplicacion, nunca de la vista; el ticket no necesita tocarlo bajo la lectura probable del criterio | `suite/pages/[tenant_id].vue:254-268` |

**Veredicto global: `hay-core-worthy`.** El **orden** y **los tres nombres de objetos no compartidos** se
resuelven dentro del mod. Los dos nombres restantes chocan con una capacidad ausente del core: no existe
forma de dar a un objeto compartido un nombre de vista distinto por aplicacion. Entran como Decision
abierta mas abajo.

**Como se cerro la duda del equipo, y una correccion a un primer analisis.** El equipo pregunto,
razonablemente, si cada mod puede poner sus propios nombres sin afectar a los demas. La respuesta
verificada tiene dos mitades:

- **Si**, cada mod declara sus traducciones en su **propio namespace** (`<workspace>/<archivo>`), asi que
  no hay conflicto a nivel de archivo y el mod es dueño de sus textos.
- **No** para una clave que otro mod tambien declara: en runtime los namespaces se **fusionan en un solo
  catalogo** por tenant e idioma, con precedencia core, luego mods **en orden alfabetico**, luego el
  override por tenant. Para una clave repetida gana la ultima capa. El contexto de i18n no tiene
  dimension de aplicacion.

Un primer analisis de codigo concluyo que renombrar era mod-only. Esa conclusion **queda corregida**: no
solo la declaracion del mod no aisla el cambio, sino que para estos dos objetos **ni siquiera gana**,
porque `uengagement-up1` se carga despues de `curriculum-design`. La verificacion se hizo leyendo
directamente el resolver del menu, el constructor de namespaces, la funcion de orden de capas, la
interfaz de tab resuelta server-side y el esquema de la app.

**Nota sobre el limite de archivo:** el override por tenant, que es la unica capa que gana sobre todos los
mods, vive en el workspace de suite, que es core. Aunque sea configuracion y no codigo, tocarlo cae fuera
del mod y conviene acordarlo antes de editarlo. Y usarlo para estos dos objetos afectaria a Engagement de
todos modos.

### La regla, enunciada

> Un mod es dueño del nombre visible de las vistas cuyos objetos **solo el** declara como pestaña. Para un
> objeto que otra app tambien declara como pestaña, **no existe nombre propio por app**: la etiqueta se
> indexa por nombre de objeto y se resuelve en un catalogo unico por tenant e idioma.

Evidencia, de la mas autoritativa a la mas concreta:

1. **El esquema del objeto de app lo dice literalmente.** La descripcion de `defaultObjects` (etiquetada
   `[UPONE-1513]`) declara que una entrada de pestaña acepta *el nombre de un objeto* o el tab especial de
   dashboards. No hay campo de etiqueta. Idem `navByRole`, cuyas entradas son objeto y layouts.
   _Fuente: `object-manager/objects/up1/suite/up1_suite_app.json` (version commiteada)._
2. **La interfaz de pestaña resuelta server-side tampoco lo tiene:** `kind`, `object`, `layouts`,
   `dashboards`, y la normalizacion descarta cualquier clave extra. _Fuente:
   `suite/composables/navTabs.ts` (interfaz `NavTab`); `suite/logic/app.resolver.js:29-47`._
3. **La etiqueta se resuelve por objeto**, con fallback al nombre tecnico. _Fuente:
   `suite/composables/useObjectManager.ts:625-633`._
4. **El contexto de i18n no incluye la aplicacion** y los namespaces de todos los mods se fusionan en un
   catalogo unico, con precedencia core, mods en orden alfabetico y override por tenant al final.
   _Fuente: `suite/utils/i18nBridge.ts:70-131`; `suite/scripts/lib/i18n-source-map.mjs`._
5. **La capacidad de nombre de negocio que se construyo recientemente tampoco es por app.** UPONE-1504
   (CE-2 / R8) agrego una cascada unica que resuelve la etiqueta de negocio de un objeto desde
   `core_ObjectDefinition` (`label`, `labelPlural`, `gender`), con soporte de **mapa por idioma** y
   cascada idioma activo, idioma por defecto, nombre tecnico. Es una capacidad real y nueva, pero su
   unidad de nombrado es el **objeto**: `label` es una fila por objeto y tenant. Ademas **no alimenta el
   menu**: sus consumidores son las celdas de tabla y el detalle de registro. Y si se cableara al menu,
   el choque seria el mismo, porque `activity.json` ya declara "Programa de asignatura" como etiqueta y
   esa etiqueta aplicaria a las dos apps. _Fuente: `layout/src/shared/objectLabels.ts` (docstring y
   cascada); consumidores en `layout/src/components/molecules/TableCell/TableCell.vue:373` y
   `layout/src/layouts/RecordDetail/RecordDetail.vue:236`._

**Sintesis:** up1 tiene **dos** sistemas de nombres para un objeto, la clave i18n que alimenta el menu y
la etiqueta de negocio de la definicion del objeto. **Ninguno de los dos tiene dimension de aplicacion**,
asi que ninguno permite nombrar distinto un objeto compartido segun la app en que se muestra.

**Frescura de esta evidencia (verificada el 2026-08-17).** `suite` y `mods/curriculum-design` estan al dia
con su remoto y sin cambios sin commitear. En `object-manager` los cambios locales son artefactos de sync,
y la afirmacion sobre el esquema se confirmo contra la version **commiteada**. `mods/uengagement-up1`
estaba dos commits atras, y esos commits corresponden a una vista de detalle de bloques de disponibilidad:
**no tocan su configuracion de app ni sus traducciones comunes**, asi que no alteran ni los objetos
compartidos ni el nombre de sus pestañas.

## Estado actual del codigo

**Declaracion (mod):**
- `mods/curriculum-design/config/app.json:9`: `defaultObjects` con el orden actual
  `["Activity", "AcademicProgram", "Offering", "Curriculum", "core_DataLog"]`. El orden es **implicito
  por posicion**, no hay campo de orden.
- `:6` tiene `order`, que es el orden de la **app** en el listado de apps, no de las vistas internas.
- El mod **no** declara `navByRole` hoy.

**Resolucion y render (core):**
- `suite/composables/navTabs.ts:154-168`: construye la secuencia de vistas.
- `suite/composables/useObjectManager.ts:643-671`: ordena los grupos ya traducidos.
- `suite/composables/useObjectManager.ts:625-633`: **de aqui sale el texto de la pestana**, con la clave
  `object.<NombreObjeto>` y fallback al nombre tecnico. Sin calificador de aplicacion.
- `suite/components/static/ObjectNavBar.vue:32`: pinta la etiqueta.
- `suite/logic/app.resolver.js:131-168`: resolucion server-side de las vistas.
- `object-manager/scripts/sync/dbSync.js:1092-1186`: valida la config de navegacion en el sync.

**Ruta de navegacion (core):** `suite/composables/breadcrumbTrail.ts:216-220` reutiliza literalmente la
etiqueta ya calculada para el menu. **No hay trabajo propio aqui.**

**Titulo de la pestana del navegador (core):** `suite/pages/[tenant_id].vue:254-268`. Depende solo del
nombre de la app; nunca de la vista.

**Encabezado de la vista (core):** `layout/src/layouts/RecordList/RecordList.vue:2044-2057`, con la clave
`layout.<nombreLayout>.label` y fallback a la etiqueta del JSON de layout del mod. **Es una clave
distinta de la del menu.**

**Precedencia de traducciones (lo decisivo para el renombre):**
- Cada mod tiene **namespace propio**, construido como `<workspace>/<archivo>`
  (`suite/scripts/lib/i18n-source-map.mjs`). No hay conflicto de archivo entre mods.
- En runtime todos los namespaces se **fusionan en un catalogo unico** por tenant e idioma, en este orden:
  **core, mods en orden alfabetico, override por tenant**. Para una clave repetida **gana la ultima capa**
  (misma fuente, funcion de orden de capas, comentada como "core first, mods last, mods override core").
- El contexto de i18n **no incluye la aplicacion**: su clave es idioma, pais, institucion, objeto, tipo de
  layout y nombre de layout (`suite/utils/i18nBridge.ts:70-131`).
- **Consecuencia practica:** `uengagement-up1` va despues de `curriculum-design` alfabeticamente, asi que
  para `object.Activity` y `object.Offering` la declaracion de este mod **pierde**. Declararla no cambia
  nada. La unica capa que gana sobre los mods es el override por tenant, que aplica a las dos apps.
- **No hay canal por configuracion de app:** ni `defaultObjects` ni `navByRole` ni la interfaz de pestaña
  resuelta server-side tienen campo de etiqueta, y la normalizacion descarta claves extra
  (`object-manager/objects/up1/suite/up1_suite_app.json`; `suite/composables/navTabs.ts`;
  `suite/logic/app.resolver.js:29-47`).

**Donde estan hoy los textos:**
- `object.AcademicProgram` y `object.Curriculum`: en el override por tenant
  `suite/lang/tenants/upu/es/common.i18n.json:14-15`. Ya coinciden con lo pedido.
- `object.Activity` y `object.Offering`: **no estan declarados en curriculum-design**. Los textos
  actuales ("Actividad", "Ofertas") provienen del archivo de traducciones de la app de engagement, via
  la cascada que carga el nivel comun de todos los mods activos
  (`suite/utils/i18nBridge.ts:80-102, 109-131`).
- `object.core_DataLog`: existe en `mods/curriculum-design/lang/{en,pt}/common.i18n.json:196-198`, **no
  en es**.

**Textos objetivo que ya existen en otro sistema:**
- `mods/curriculum-design/objects/activity.json:7-8` ya declara "Programa de asignatura" como etiqueta
  de objeto. Esa etiqueta se resuelve por la cascada de **UPONE-1504 (CE-2 / R8)**
  (`layout/src/shared/objectLabels.ts`), que soporta mapa por idioma y cae al idioma por defecto y al
  nombre tecnico. Sus consumidores son celdas de tabla (`TableCell.vue:373`) y detalle de registro
  (`RecordDetail.vue:236`), **no el menu**.
- **Ojo con la tentacion de cablear el menu a esa cascada:** parece el fix natural, pero no resuelve el
  caso compartido. `label` vive en `core_ObjectDefinition`, una fila por objeto y tenant, asi que tambien
  es por objeto y no por app: la pestaña de Engagement pasaria a mostrar "Programa de asignatura". Si se
  quiere proponer como extension de core, la pieza que falta es la **dimension de aplicacion**, no una
  tercera cascada.
- `mods/curriculum-design/config/layouts/default_Offering_syllabus_list.json:4` ya dice "Silabos".
- `mods/curriculum-design/config/layouts/default_Curriculum_list.json:4` dice "Curriculos", desalineado
  con la pestana que dice "Planes de estudios".

**Test que fija el orden:** `mods/curriculum-design/tests/integration/layouts-declared.test.ts:231-237`
asierta el array exacto. Se rompe con cualquier reorden.

**Capacidad de orden por rol:** existe en el core (`navByRole`, validado en el sync y resuelto por rol
interno), con `mods/hello-world-mod/config/app.json:10-17` como consumidor real. Curriculum Design no la
adopto. Contradice el supuesto del refinamiento.

## Analisis de enfoques (posibilidades)

### Opcion A - Orden mas los tres nombres libres (recomendada)

Reordenar el array adoptando la capacidad existente, alinear los nombres de los tres objetos que no
comparte nadie (incluido el encabezado de planes de estudios, que hoy dice "Curriculos", y la clave
faltante en espanol del historial), actualizar el test, y documentar por que las dos vistas restantes
conservan su nombre.

- **Pros:** entrega el criterio principal del PO (el orden) mas todo el renombre alcanzable, sin romper a
  Engagement ni depender de otro equipo. Reversible.
- **Contras:** el ticket queda parcialmente cumplido en la columna de nombres.
- **Esfuerzo:** bajo. **Reversibilidad:** total.

### Opcion A-min - Solo orden

Acotar a reordenar y actualizar el test, sin tocar ningun nombre.

- **Pros:** el cambio mas chico que cumple el criterio principal; cero riesgo de i18n.
- **Contras:** deja sin cerrar el desalineado del encabezado de planes de estudios, que es del mod y
  cuesta poco.

### Opcion B - Esperar la capacidad de core y entregar completo

- **Pros:** cumple el ticket al pie de la letra. **Contras:** bloquea un cambio de bajo costo y alto
  valor detras de una capacidad que no esta ni pedida al core todavia.
- **Cuando tiene sentido:** si el PO considera que el orden sin los nombres no aporta.

### Opcion C - Pisar la clave global y aceptar el efecto en la otra app

Declarar `object.Activity` y `object.Offering` en una capa que gane, aceptando que engagement muestre
"Programa de asignatura" y "Silabos".

- **Pros:** trivial de implementar. **Contras:** cambia el producto de otro equipo sin que lo pida. Es
  una regresion, no una solucion.
- **Requiere:** acuerdo explicito del equipo de engagement. **No recomendada** sin ese acuerdo.

### Opcion D - Adoptar `navByRole` en vez de `defaultObjects`

Aprovechar que el mecanismo por rol existe para declarar orden (y subconjunto) por rol interno.

- **Pros:** habilita a futuro que cada rol vea su propio orden; el mecanismo ya esta probado.
- **Contras:** son mutuamente excluyentes, asi que hay que migrar toda la declaracion; agrega una
  dependencia con los roles internos de UPONE-1615, que esta en el mismo sprint y sin cerrar. El equipo
  ya decidio que no necesita orden por rol ahora.
- **Veredicto:** fuera de alcance para este ticket, pero vale registrarlo: el supuesto de que la
  capacidad no existe es incorrecto.

## Consideraciones de implementacion

- **Secuencia sugerida:** (1) actualizar el test del array **junto** con el reorden, en el mismo cambio,
  o el build queda rojo; (2) reordenar; (3) alinear los nombres que no colisionan; (4) verificar el
  render en las **dos** apps del tenant; (5) recien entonces decidir sobre los dos renombres bloqueados.
- **La verificacion es el trabajo real.** Es un cambio de UI puro cuyo criterio de aceptacion es
  literalmente lo que el usuario ve. Cerrar sin captura de pantalla del menu, de la ruta de navegacion y
  del menu de la otra app no cierra el ticket.
- **Gotcha de i18n:** un conflicto de claves puede abortar el sync. Al agregar claves nuevas, cubrir los
  tres idiomas con paridad y verificar que el sync corra limpio.
- **Gotcha de alcance de archivo:** el override por tenant vive en el workspace de suite, que es core.
  Es configuracion versionada y editada en commits pasados, pero cae fuera del mod: acordar antes de
  tocarlo.
- **La ruta de navegacion no necesita trabajo**, pero si verificacion: hereda la etiqueta del menu, asi
  que si el menu queda bien, ella tambien, y si queda mal, arrastra el error.
- **Riesgo tecnico principal:** regresion silenciosa en la app de engagement. Nadie la va a notar en el
  desarrollo de este ticket salvo que se verifique a proposito.

## Hipotesis a validar (para el intake)

- **H1: el texto actual de las dos vistas en conflicto proviene de la capa de traducciones de la app de
  engagement.** Es la hipotesis central: define si el problema es real. _Validacion: entrar al tenant,
  abrir el menu de las dos apps, y contrastar. Complementar buscando la clave en las capas de
  traduccion activas, teniendo en cuenta que uno de los archivos no esta commiteado._
- **H2: declarar la clave en curriculum-design cambia el nombre en las dos apps, no solo en una.**
  _Validacion: declararla en una rama de prueba, correr el sync, y observar el menu de ambas apps._
- **H3: reordenar el array no requiere ningun cambio en el core.** _Validacion: reordenar, correr el
  sync, y comprobar el orden en pantalla._
- **H4: la ruta de navegacion refleja automaticamente el nombre y el orden nuevos.** _Validacion:
  navegar a cada vista y leer la ruta._
- **H5: el encabezado de cada vista se puede alinear con su entrada de menu editando solo la etiqueta de
  layout y su traduccion en el mod.** _Validacion: alinear el caso de planes de estudios, que hoy dice
  "Curriculos", y verificar en pantalla._
- **H6: ningun otro consumidor depende del orden actual del array** mas alla del test identificado.
  _Validacion: buscar el array y sus elementos en el repo y correr la suite completa._

## Decisiones tecnicas abiertas (las resuelve el dev o el intake)

- Donde declarar las claves de traduccion que si se van a tocar: en el mod (propaga por sync) o en el
  override por tenant (mas acotado, pero vive en un workspace core).
- Si se agrega la clave faltante en espanol del historial de cambios en este ticket o se deja como esta
  (hoy cae al fallback del nombre tecnico).
- Si el desalineado del encabezado de planes de estudios entra en este ticket o se separa.

## Decisiones abiertas (seguimiento del ticket)

- [x] ~~**La precondicion se escala a core ahora o queda registrada como incumplida.**~~ **Resuelta
      (2026-08-17):** se escalo. La precondicion tiene ticket propio, **UPONE-1645**, en este mismo sprint,
      asignado, estimado en 3 SP, con link `is blocked by` desde este ticket y su evidencia completa en la
      descripcion. Se descarto la salida de pisar la clave en el override por tenant, porque cambia los
      nombres de Engagement y es incorrecto en su dominio.
- [x] ~~**Quien lleva la precondicion a core y con que prioridad.**~~ **Resuelta (2026-08-17):** el ticket
      esta creado y asignado. Lo que sigue abierto no es abrirlo, es la respuesta de core (ver la decision
      siguiente).
- [ ] **Que hace este ticket si core no prioriza UPONE-1645.** Es la unica parte viva de la decision
      anterior, y esta planteada al PO en el comentario publicado en Jira: cerrar con el orden completo y
      tres de los cinco nombres, dejando la limitacion documentada, o esperar la extension de core. Si 1645
      aterriza antes del cierre, los dos nombres se completan aqui. Coordinar con el equipo de Engagement,
      que es el otro afectado por los objetos compartidos.
- [ ] **Que significa "pestana" en el segundo criterio:** la pestana del menu o la del navegador. Si es
      la del navegador, hoy solo refleja el nombre de la aplicacion y alinearla con la vista es un
      cambio de core que este ticket no contempla. Requiere confirmacion del PO.
- [ ] **Confirmar en runtime el menu de las dos apps** en el tenant, para tener la captura que respalda
      la decision anterior frente al PO y al equipo de Engagement. El mecanismo ya esta verificado en
      codigo; esto es evidencia visual, no un pendiente de analisis.
- [x] ~~**Acuerdo para tocar el override por tenant del workspace de suite.**~~ **Resuelta (2026-08-18): no
      se toca el override.** Los tres nombres libres se alinean **via el mod**, no por el override por tenant:
      un rename es plataforma-wide, no per-tenant, y el override romperia la convencion (ademas es workspace
      core). Con esto no hace falta acuerdo para tocar ese archivo.
- [ ] **Alineacion del encabezado de la vista de planes de estudios**, cuya etiqueta de layout dice
      "Curriculos" mientras el menu dice "Planes de estudios". Es el desalineado mas facil de cerrar y
      es enteramente del mod; confirmar que entra en este ticket.

## Reglas y patrones, con su fuente

- El orden de las vistas es la posicion en el array de la config del mod. _Fuente:
  `mods/curriculum-design/config/app.json:9`._
- La clave del nombre de pestana es por objeto, sin alcance por aplicacion, y la cascada carga el nivel
  comun de todos los mods activos. _Fuente: `suite/composables/useObjectManager.ts:625-633`;
  `suite/utils/i18nBridge.ts:80-131`._
- Dos apps del mismo tenant declaran los mismos dos objetos entre sus vistas. _Fuente:
  `mods/curriculum-design/config/app.json:9`; `mods/uengagement-up1/config/app.json:35-36`._
- La ruta de navegacion hereda la etiqueta del menu. _Fuente:
  `suite/composables/breadcrumbTrail.ts:216-220`._
- El menu no consume la etiqueta de objeto del JSON: son dos sistemas paralelos. _Fuente:
  `mods/curriculum-design/objects/activity.json:7-8`; `layout/src/shared/objectLabels.ts:68-84`._
- El test del array de vistas se actualiza en el mismo cambio. _Fuente:
  `mods/curriculum-design/tests/integration/layouts-declared.test.ts:231-237`._
- No editar archivos de traduccion sincronizados a mano; editar la fuente en el mod y correr sync.
  _Fuente: `up1/CLAUDE.md`._

## Archivos candidatos (tentativo, no mandato)

- `mods/curriculum-design/config/app.json` (array de vistas).
- `mods/curriculum-design/tests/integration/layouts-declared.test.ts` (asercion del array).
- `mods/curriculum-design/lang/{es,en,pt}/common.i18n.json` (claves de nombre de vista).
- `mods/curriculum-design/config/layouts/default_Curriculum_list.json` y su traduccion (alineacion del
  encabezado).
- Solo si se acuerda: `suite/lang/tenants/upu/{es,en,pt}/common.i18n.json` (override por tenant, core).
