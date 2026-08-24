# UPONE-1645 - Pre-intake (guia de implementacion)

> Material del implementador. **No va a Jira.** Alimenta el intake de DKC. Contrato del caso:
> `UPONE-1645-detalle.md`. Evidencia y peticion a core:
> `PRECONDICION-core-nombre-de-vista-por-app.md`.
> **Ventaja de este caso: el camino ya se recorrio completo en un spike funcionando.** Lo que sigue no es
> hipotesis sobre como podria hacerse, es el mapa de lo que ya se hizo, mas lo que el spike dejo sin resolver.

## Veredicto y superficie

**Veredicto: feature aditiva de plataforma, chica y de bajo riesgo, con el camino ya validado.** No hay
modelo de datos nuevo, no hay migracion, no hay cambio de comportamiento para quien no la use.

**Superficie real, medida por el spike:** 4 archivos fuente en `suite`, mas 1 opcional en `object-manager`
por correccion del esquema. Los 2 archivos de `object-manager` que el spike tuvo que parchear a mano son
**copias sincronizadas** y se regeneran desde las fuentes.

## Contexto (para dimensionar)

**El bloqueo es real y esta verificado en seis capas** (resolucion del menu, esquema de la app, pestaña
resuelta en el servidor, contexto de i18n, orden de fusion de catalogos, y la cascada de etiqueta de negocio
del objeto). Ninguna de las dos formas de nombrar un objeto que existen hoy en la plataforma tiene dimension
de aplicacion.

**El caso que lo destapo.** Curriculum Design y Engagement declaran ambos `Activity` y `Offering` como
vistas de menu en el mismo tenant. Curriculum Design necesita llamarlas "Programa de asignatura" y
"Silabos"; Engagement las llama "Actividad" y "Ofertas", y en su dominio `Offering` es una oferta de
servicio, no un silabo. **Las dos lecturas son correctas**: no hay un nombre que arbitrar, hay dos que
deben convivir.

**Por que no lo resuelve el mod.** Cuatro vias, las cuatro cerradas. La mas enganosa: declarar la clave en el
propio mod **pierde** por el orden de fusion de catalogos (los mods se cargan alfabeticamente y
`uengagement-up1` va despues de `curriculum-design`), asi que el cambio no toma efecto en ninguna parte. La
unica capa que gana sobre todos los mods es el override por tenant, que aplica a las dos apps por igual.

**Ya esta probado que funciona.** Se implemento en local, sin commitear, y se verifico en runtime contra el
stack completo en el tenant de pruebas:

| App | Menu antes | Menu con el fix |
|---|---|---|
| Curriculum Design | Actividad, Programas academicos, Ofertas, Planes de Estudio, Historial de cambios | **Programas academicos, Planes de Estudio, Programa de asignatura, Silabos, Historial de cambios** |
| Engagement | Centros de apoyo, Ofertas, Actividad, Feedback, Disponibilidad, Eventos, Docentes, Estudiantes | **sin cambios** |

**Lo que el spike corrigio del analisis en papel.** La estimacion inicial hablaba de cinco piezas y se le
habian escapado dos: el **tipo GraphQL** (sin declarar el campo, la API lo descarta) y la **seleccion de
campos del cliente** (sin pedirlo en la query, no llega). La superficie real son **cuatro archivos fuente**.

**Lo que no necesita cambios.** La validacion del sync ya tolera claves extra en la entrada de la vista
(verificado por lectura del codigo). La columna es JSON, asi que la persistencia no cambia. Y la ruta de
navegacion queda coherente sola, porque reutiliza la etiqueta ya resuelta del menu.

**Nota de proceso descubierta en el spike.** El resolver y el tipo GraphQL tienen **copias sincronizadas** en
`object-manager`. La fuente esta en `suite` y el sync propaga; en el spike hubo que parchear las copias a
mano porque no se corrio sync. Quien implemente debe editar la fuente, no la copia.

## Estado actual del codigo, eslabon por eslabon

La cadena completa desde la configuracion del mod hasta el texto en pantalla, con lo que cada eslabon hace
hoy y lo que necesita:

| # | Eslabon | Archivo | Hoy | Necesita |
|---|---|---|---|---|
| 1 | Declaracion en el mod | `mods/<mod>/config/app.json` | Acepta string u objeto con dashboards; la forma objeto mas layouts se usa en el sistema por rol | Declarar la clave en la entrada de la vista |
| 2 | Validacion del sync | `object-manager/scripts/sync/dbSync.js` (`validatePlat15Config`) | Solo exige que `object` sea string o `dashboards` array. **Tolera claves extra** | **Nada.** Verificado por lectura |
| 3 | Persistencia | columna JSON de la app | Guarda la estructura tal cual | **Nada** |
| 4 | Normalizacion server-side | `suite/logic/app.resolver.js:29-47` | Reconstruye campo por campo y **descarta** la clave | Preservarla |
| 5 | Tipo GraphQL | `suite/logic/app.schema.graphql` (tipo `NavTab`) | No declara el campo, la API lo descarta | Declararlo |
| 6 | Interfaz de la pestaña | `suite/composables/navTabs.ts` (`NavTab`) | No tiene el campo | Sumarlo (tipo) |
| 7 | Consulta del cliente | `suite/composables/useObjectManager.ts` (query de apps) | No pide el campo, no llega | Pedirlo |
| 8 | Resolucion de la etiqueta | `suite/composables/useObjectManager.ts:625-633` | `object.<Objeto>` con fallback al nombre tecnico | Preferir la clave de la vista |
| 9 | Ruta de navegacion | `suite/composables/breadcrumbTrail.ts:216-220` | Reutiliza la etiqueta del menu | **Nada.** Hereda solo |
| 10 | Esquema del objeto de app | `object-manager/objects/up1/suite/up1_suite_app.json` | La variante de objeto no esta declarada para las vistas compartidas | Declararla (opcional, por correccion) |

**Los dos eslabones que el analisis en papel no vio: el 5 y el 7.** Sin ellos el dato se descarta en silencio
y el sintoma es identico a "el fix no funciona". El spike los encontro solo despues de ver el menu sin
cambios con los eslabones 4 y 8 ya parchados.

**Precedente clave para el eslabon 8.** El composable **ya construye un mapa por pestaña** para la allow-list
de layouts, recorriendo las pestañas resueltas y keyeando por clave de grupo en minusculas. La clave de
nombre se resuelve con el mismo patron, en el mismo recorrido. Por eso el eslabon con "diseno real" resulto
ser mecanico: habia un molde.

**Copias sincronizadas a tener presentes.** El resolver del eslabon 4 y el tipo del eslabon 5 tienen gemelos
en `object-manager` (`src/graphql/resolvers/up1/suite/app.resolver.js` y `src/graphql/typeDefs/up1.js`). El
segundo es un archivo **generado** y suele tener cambios de regeneraciones ajenas: no revertirlo con
`checkout`, y no editarlo a mano en la implementacion real.

## Analisis de enfoques

### Opcion A - Clave de traduccion en la entrada de la vista (la del spike, recomendada)

La vista declara la clave; la resolucion la prefiere sobre la clave global.

- **Pros:** aditiva y opt-in; **la clave la define cada mod en su propio namespace, y por eso dos mods no
  pueden pisarse**, que es lo que resuelve el problema de raiz; traducible; la ruta de navegacion la hereda
  gratis; **ya validada en runtime**.
- **Contras:** suma un segundo lugar donde puede vivir el nombre de una vista, lo que hay que documentar bien
  para que no confunda.
- **Esfuerzo:** menor. **Reversibilidad:** alta.

### Opcion B - Texto literal en la entrada de la vista

Igual que A, pero la entrada lleva el texto en vez de la clave.

- **Pros:** mas simple de escribir y de entender.
- **Contras:** **no es traducible**. Mete texto de interfaz en configuracion, lo que choca con la cascada de
  i18n de la plataforma y con el DoD de paridad en tres idiomas.
- **Veredicto:** no recomendada. Si core la prefiere por simplicidad, conviene al menos aceptar ambas formas
  y documentar que el literal es para casos internos.

### Opcion C - Que el menu consuma la etiqueta de negocio del objeto, con alcance por app

Unificar los dos sistemas de nombres y darle dimension de aplicacion al de la definicion del objeto.

- **Pros:** resuelve la deuda de fondo (hoy hay dos sistemas desconectados).
- **Contras:** exige modelo de datos nuevo (override por par app y objeto), toca sync y codegen, y cambia el
  comportamiento de consumidores existentes (celdas de tabla, detalle de registro).
- **Veredicto:** direccion correcta a largo plazo, desproporcionada como paso siguiente. Registrar aparte.

### Opcion D - Dimension de aplicacion en el contexto de i18n

- **Contras:** toca todo el pipeline de i18n y afecta a **todos** los textos, no solo a la navegacion. Riesgo
  desproporcionado.
- **Veredicto:** descartada.

## Consideraciones de implementacion

- **Secuencia sugerida:** parchar los eslabones 4 y 5 (servidor), verificar con una consulta directa a la API
  que el campo viaja; despues 6, 7 y 8 (cliente); recien entonces declarar la clave en un mod y mirar el
  menu. Verificar de a un lado evita el diagnostico ciego que sufrio el spike.
- **Truco de diagnostico que sirvio:** introspeccionar el tipo en la API para confirmar que el servidor
  conoce el campo, antes de buscar el problema en el cliente. Corta el arbol de causas a la mitad.
- **El orden y el nombre son independientes.** El spike cambio los dos a la vez y el orden funciono de
  inmediato mientras el nombre no: eso confirmo que la forma de objeto ya se consumia y aislo el problema al
  campo nuevo. Conviene repetir esa separacion al verificar.
- **Definir el fallback antes de codear.** Hoy, si la clave no existe en el catalogo, la resolucion cae al
  **nombre tecnico del objeto**, que es peor que no declarar nada. La cascada deseable es: clave de la vista,
  clave global del objeto, nombre tecnico. Es una decision chica con efecto visible. **Resuelta el
  2026-08-18 como propuesta del equipo a validar por core: ver "Decisiones abiertas" mas abajo.**
- **Cubrir los dos sistemas de vistas.** Las vistas compartidas y las vistas por rol interno son mutuamente
  excluyentes y ambas pasan por la misma normalizacion. El spike probo el primero; el segundo debe quedar
  cubierto por test.
- **El tab de dashboards es reservado** y resuelve su nombre por una clave fija: debe ignorar el campo.
- **Riesgo tecnico principal:** bajo. El unico riesgo real es el efecto cruzado entre apps, y es justamente lo
  que el criterio de aceptacion central verifica.
- **No editar las copias sincronizadas.** En el spike se parchearon a mano por no correr sync; en la
  implementacion real eso seria un error, y en el caso del tipo GraphQL destruiria cambios de regeneraciones
  ajenas.

## Hipotesis a validar (para el intake)

Las cuatro primeras **ya estan validadas por el spike**; se listan con su evidencia para que el intake no las
repita.

- **H1: preservar el campo en la normalizacion y preferirlo en la resolucion produce un nombre por app.**
  _VALIDADA: el menu de Curriculum Design mostro los nombres declarados._
- **H2: no hay efecto cruzado sobre la otra app que declara el mismo objeto.** _VALIDADA: el menu de
  Engagement no cambio._
- **H3: la validacion del sync no rechaza la clave extra.** _VALIDADA por lectura del codigo, **no por
  ejecucion**: el spike escribio la configuracion directo en la base. **El intake debe correr sync** y
  confirmarlo._
- **H4: la ruta de navegacion hereda el nombre sin trabajo adicional.** _VALIDADA por diseno y observada en el
  spike._
- **H5: el campo funciona igual en el sistema de vistas por rol interno.** _Sin validar. Validacion: declarar
  la clave en una entrada por rol interno y verificar el menu con un usuario de ese rol. Corresponde a la
  decision abierta "Alcance en las vistas por rol interno" (ver mas abajo)._
- **H6: con una clave inexistente, la resolucion cae al nombre tecnico del objeto.** _Sin validar en
  ejecucion, deducida del codigo. Validacion: declarar una clave que no exista y observar el texto. La
  decision de fallback que esto informaba ya quedo resuelta como propuesta del equipo (ver "Decisiones
  abiertas")._
- **H7: el sync regenera correctamente las copias de object-manager con el campo nuevo.** _Sin validar: el
  spike las parcheo a mano. Validacion: correr sync y comparar las copias con las fuentes._
- **H8: no hay otro consumidor de la interfaz de pestaña que se rompa al sumar el campo.** _Validacion:
  typecheck del workspace y la suite de tests de navegacion (16 tests, verdes en el spike)._

## Frontera core/mod (Aduana)

**Aduana no juzga este ticket: este ticket es su salida.** Aduana scopea tickets de **mod** y, cuando detecta
un artefacto core-worthy, delega en `core-extension-writer` para crear la Core Extension. UPONE-1645 *es* la
Core Extension que produjo la pasada sobre UPONE-1616, asi que correrla de nuevo aqui es recursion: no hay
artefacto que devolver al mod. El motivo es de rol, no de tipo de caso; no existe ninguna regla que exima a
los "casos core-only" de Aduana. Lo que si aplica es el contrato de Core Extension (Change Types + Ticket
Content Rules de `up1/docs/guides/core-mod-boundary-workflow.md`).

**Change Type: 3, nueva capacidad opcional.** Agrega superficie publica nueva de la que ningun consumidor
actual depende, sin romper compatibilidad ni cambiar la arquitectura interna. Consecuencia operativa que hay
que respetar: el tipo 3 **exige luz verde del equipo de core antes de empezar a implementar**, mas aprobacion
de core para mergear el PR. Al 2026-08-17 esa luz verde no estaba registrada, y el ticket ya estaba en el
sprint SP9 asignado. **Actualizado por la revision 2026-08-18**: el equipo ejecuta sin esperar la luz verde
previa y la presenta a core en el PR; la aprobacion de core queda como gate de merge (ver Decisiones
abiertas, item "Prioridad relativa").

Veredicto de genericidad **revalidado contra codigo** el 2026-08-17 (no heredado): sigue en pie, ningun
artefacto se reclasifica.

| Artefacto | Veredicto | Verificacion |
|---|---|---|
| Nombre de vista de un objeto compartido | `core-worthy` | La clave es `object.<Objeto>` con fallback al nombre tecnico (`suite/composables/useObjectManager.ts:627-633`); el contexto de i18n no tiene app (`suite/utils/i18nBridge.ts:70-73`); la declaracion del mod pierde por orden de fusion (`suite/scripts/lib/i18n-source-map.mjs`) |
| Etiqueta por vista en el esquema de la app | `core-worthy` (capacidad ausente) | No hay campo donde declararla (`object-manager/objects/up1/suite/up1_suite_app.json`); `type NavTab` tiene solo `kind/object/layouts/dashboards` (`suite/logic/app.schema.graphql:10-15`); `normalizeTab` reconstruye campo por campo y descarta el resto (`suite/logic/app.resolver.js:29-47`) |

Genericidad: pasa limpio. Un `labelKey` opcional no depende de nada especifico del cliente y sirve a
cualquier mod que monte vistas sobre objetos Base que otra app ya declara.

El resto de UPONE-1616 (el orden y los nombres de los objetos no compartidos) quedo `mod-only` y se ejecuta
sin esperar este caso.

### Gaps de contrato corregidos (2026-08-17)

Lo que faltaba para que el ticket cumpliera el contrato de Core Extension, ya aplicado:

| Gap | Estado |
|---|---|
| Change Type no declarado | Corregido: bloque "Clasificacion (Core Extension)" en la descripcion de Jira, con el gate del tipo 3 |
| Plantilla "Nueva capacidad opcional" ausente | Corregido: seccion "Plantillas de Core Extension" en Jira, llena |
| Plantilla "Campo de objeto o esquema" ausente | Corregido: idem |
| Sin link `Blocks` a UPONE-1616 (las dos issues tenian `issuelinks: []`) | Corregido: 1645 `blocks` 1616 |
| 1616 sin comentario de bloqueo | Corregido: comentario con lo entregable hoy, lo bloqueado y la decision pendiente del PO. Va como comentario, no en la descripcion, porque esa descripcion es del PO |
| Falta label `core-extension` | Corregido |
| Issue type provisorio no declarado | Corregido: "UP1 Feature" no existe en UPONE (Tarea, Error, Historia, Epic, Subtarea, Testing); Historia queda marcada como stand-in temporal |
| Parent = epic del mod (UPONE-1267) en vez de backlog de plataforma | **Abierto por decision**: sin parent el issue no aparece en el board de UPONE (filtran por epic). Registrado como decision abierta (ver mas abajo) |

Hallazgo colateral: la descripcion de `defaultObjects` en `up1_suite_app.json:64` documenta solo el string
legado y el tab de dashboards, cuando `normalizeTab` ya acepta `{object, layouts}` desde UPONE-1513. Agregado
al DoD del ticket para corregirlo en la misma pasada.

## Decisiones abiertas

> **Revision 2026-08-18.** El equipo ejecuta el ticket y lo presenta a core para revision. Por eso las
> decisiones de forma/fallback/prioridad dejan de ser "core decide en abstracto" y pasan a ser **propuesta
> del equipo con recomendacion**, que core valida en el PR.

### Resueltas (2026-08-18)

- **Nombre y forma del campo.** Propuesta del equipo, a validar por core: **solo clave de traduccion**
  (`labelKey`), no texto literal, para no abrir la puerta a texto no traducible en configuracion. Es lo que
  uso el spike. (Responde tambien a la Opcion B del analisis de enfoques: queda descartada salvo que core
  prefiera aceptar ambas formas.)
- **Comportamiento cuando la clave declarada no existe en el catalogo.** Propuesta del equipo, a validar por
  core: **cascada clave declarada, luego clave global por objeto, luego nombre tecnico**, para no caer
  directo al nombre tecnico de la tabla. (Resuelve H6 y el punto "definir el fallback antes de codear" de
  Consideraciones de implementacion.)
- **Si se aprovecha para unificar los dos sistemas de etiquetado.** Resuelta: **no se unifica aqui.** Se
  registra como direccion aparte (ver Opcion C del analisis de enfoques); unificar exige tocar modelo de
  datos y cambia consumidores existentes, fuera del alcance de esta capacidad.
- **Prioridad relativa.** Resuelta: **el equipo lo toma en SP9** y lo presenta a core. Deja de depender de
  que core lo priorice de forma previa; la aprobacion de core es gate de merge. El caso "si no se prioriza,
  1616 cierra sin dos nombres" solo aplica si core rechaza la capacidad en la revision.
- **Parent del issue en Jira** (epic del mod UPONE-1267 en vez de backlog de plataforma): sin parent el issue
  no aparece en el board de UPONE, que filtra por epic. Se mantiene UPONE-1267 como parent por esa razon
  operativa (gap de contrato registrado arriba, no resuelto formalmente por core).

### Abiertas (a definir en implementacion o en la revision de core)

- **Alcance en las vistas por rol interno.** Se confirma en implementacion: la capacidad debe cubrir los dos
  sistemas (vistas compartidas y vistas por rol interno), que son mutuamente excluyentes. Corresponde a H5.
- **Si se acepta tambien texto literal ademas de clave**, para el caso en que core prefiera esa opcion por
  simplicidad (ver Opcion B).
- **Si el campo se declara solo en la variante de objeto o tambien se documenta para el tab de dashboards**
  (donde debe ignorarse).
- **Donde vive la doc de la capacidad**, para que los mods la descubran.

## Reglas y patrones, con su fuente

- Editar las fuentes en `suite`; las copias de `object-manager` se regeneran por sync. _Fuente:
  `up1/CLAUDE.md` (Critical Rules, Sync Mechanism)._
- La entrada de vista ya admite forma de objeto, y la normalizacion ya interpreta objeto mas layouts.
  _Fuente: `suite/logic/app.resolver.js:29-47`._
- Precedente de mapa por pestaña dentro del composable: seguirlo. _Fuente:
  `suite/composables/useObjectManager.ts` (allow-list de layouts por vista)._
- La resolucion de texto cae al nombre tecnico si la clave no existe. _Fuente:
  `suite/composables/useObjectManager.ts:625-633`._
- Los namespaces de i18n son por workspace, y de ahi viene la propiedad que hace correcto el diseno.
  _Fuente: `suite/scripts/lib/i18n-source-map.mjs`._
- El tipo GraphQL y la seleccion de campos del cliente son eslabones obligatorios: sin ellos el dato se
  pierde en silencio. _Fuente: el spike._

## Archivos candidatos (medidos por el spike, no tentativos)

Fuentes a modificar:
- `suite/logic/app.resolver.js` (preservar el campo en la normalizacion).
- `suite/logic/app.schema.graphql` (campo en el tipo de pestaña).
- `suite/composables/navTabs.ts` (campo en la interfaz).
- `suite/composables/useObjectManager.ts` (pedirlo en la consulta y preferirlo en la resolucion).
- `object-manager/objects/up1/suite/up1_suite_app.json` (declarar la variante en el esquema; opcional).

Regenerados por sync, no editar a mano:
- `object-manager/src/graphql/resolvers/up1/suite/app.resolver.js`.
- `object-manager/src/graphql/typeDefs/up1.js`.

Tests a sumar:
- Unit de la normalizacion (preservacion y forma legado) y de la preferencia de clave.
- La suite de navegacion existente como red de no regresion (`suite/tests/unit/navTabs.test.ts`).

## Punto de partida: el spike esta en stash

El spike quedo archivado y es recuperable, asi que la implementacion no parte de cero. Nombre del stash, en
`suite` y en `mods/curriculum-design`:

```
PRECONDICION nombre de vista por app - spike UPONE-1616 (labelKey por entrada de nav)
```

Los pasos exactos de recuperacion, incluida la configuracion de prueba para la base local, estan en la
seccion 5bis de `PRECONDICION-core-nombre-de-vista-por-app.md`.
