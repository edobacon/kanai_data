---
id: DOC-kb-sp9-UPONE-1616-aduana
project: up1
type: doc
---

# UPONE-1616 - Evidencia extendida de Aduana (frontera core/mod)

> **Interno, no pegar en Jira.** El resultado condensado (tabla por artefacto + veredicto global) vive
> en la seccion "Frontera core/mod (Aduana)" de `UPONE-1616-detalle.md`. Aqui queda el rastro de la
> pasada: que se busco, que excepciones se aplicaron, que razonamiento se descarto, y como se resolvio
> la contradiccion entre dos subagentes.
> Modo: analisis. No se invoco `core-extension-writer` ni se creo ningun ticket.

## Veredicto global

`hay-core-worthy`. El orden de las vistas y dos de los cuatro nombres se resuelven dentro del mod. Los
otros dos nombres (programa de asignatura y silabos) son **core-worthy**: renombrarlos colisiona con la
app de engagement, que comparte los mismos objetos Base como vistas en el mismo tenant, y el core no
tiene hoy una forma de dar nombre de vista distinto por aplicacion a un objeto compartido.

## Que se busco

La cadena completa, desde la config de la app del mod hasta el render de la pestana:

- Config de la app del mod y el array que determina el orden de las vistas.
- Los composables del core que calculan orden y etiqueta, y el componente que pinta el menu.
- El archivo de override de traducciones por tenant, y las etiquetas de objeto declaradas en los JSON.
- Las etiquetas de layout del mod.
- El constructor de la ruta de navegacion, su documentacion y el componente visual.
- El titulo de la pestana del navegador.
- La arquitectura de i18n, para entender la cascada de resolucion.
- Se comprobo con historial de git que el archivo de override por tenant esta versionado y se edita
  directamente en commits pasados, a diferencia de los directorios de salida del sync.

**El hallazgo decisivo** fue cruzar el array de vistas por defecto de **todos** los mods: los objetos
Activity y Offering aparecen tanto en la app de Curriculum Design como en la de engagement, y la clave
de traduccion que da nombre a la pestana no lleva ningun calificador de aplicacion. Eso convierte un
rename por tenant en un cambio que se filtra a la otra app.

## Excepciones por tipo de artefacto aplicadas

- **Objeto / campo:** no aplica. No se crea ni se toca ningun objeto ni campo del esquema. Que Activity
  y Offering sean objetos Base compartidos es de diseno y no es lo que el ticket cambia.
- **Resolver:** no aplica. No hay logica de backend involucrada; el problema es de configuracion de
  navegacion e i18n en el frontend.
- **Configuracion o capacidad de layout:** se evaluo si el mecanismo de navegacion ya cubre "orden" y
  "nombre por pestana" antes de asumir que faltaba capacidad. Orden: si, por posicion en el array.
  Nombre por tenant: si, por el override. **Nombre por aplicacion para el mismo objeto: no existe hoy**,
  y no hay campo en el esquema de la app para declararlo. De ahi el corte core-worthy, acotado solo a
  esos dos objetos.

## Razonamiento descartado

- **Tratar el titulo de la pestana del navegador como el "pestana" del criterio de aceptacion.** El
  codigo muestra que ese titulo nunca vario por vista, solo por aplicacion, y ningun otro criterio del
  ticket menciona el navegador. La lectura consistente con el resto del ticket (todo sobre menus) es que
  "pestana" es la del menu. Se dejo marcado para que el PO lo confirme, porque si de verdad quiso decir
  la pestana del navegador, esa granularidad no existe hoy y seria otro artefacto core-worthy no
  cubierto por este analisis.
- **Pisar la clave global en el archivo de override por tenant como solucion rapida y mod-only.**
  Aunque ese archivo sea configuracion editable sin tocar codigo, el efecto de la edicion **si** altera
  el comportamiento de otra app para el mismo tenant. Eso es precisamente la senal de core-worthy: una
  decision de configuracion con efecto transversal entre mods, sin mecanismo de aislamiento.
- **Redactar el contenido del ticket de extension de core.** Fuera de esta pasada: es tarea de
  `core-extension-writer` y requiere aprobacion explicita del dev. Aqui solo se identifica el artefacto
  y por que.

## Contradiccion entre subagentes y como se resolvio

Las dos pasadas llegaron a veredictos distintos sobre los renombres:

- **Verificacion de codigo:** concluyo en su veredicto final que renombrar es mod-only, porque las
  claves se pueden agregar en los archivos de traduccion del mod.
- **Aduana:** concluyo que dos de los renombres son core-worthy por la colision entre apps.

**Resuelto a favor de Aduana**, porque la propia verificacion de codigo aporta la evidencia que lo
sostiene y luego no la aplica a su conclusion: encontro que los textos actuales "Actividad" y "Ofertas"
provienen del archivo de traducciones de la app de engagement, a traves de una cascada que carga el
nivel comun de **todos los mods activos** sin acotar por app
(`suite/utils/i18nBridge.ts:80-102, 109-131`). Si la clave se resuelve cruzando mods, declararla en
Curriculum Design no la aisla: solo cambia cual capa gana.

**Lo que queda pendiente de confirmar:** cual de las dos capas gana hoy en runtime. Uno de los archivos
de traduccion involucrados no esta commiteado en el working copy, asi que la manifestacion concreta no
se puede cerrar leyendo el repo. La **colision estructural** si esta confirmada desde configuracion
commiteada: las dos apps declaran los mismos dos objetos entre sus vistas por defecto. Registrado como
Decision abierta en el contrato.

## Cierre de la duda del equipo: nombre por mod si, por app no

El equipo pregunto si, con los cambios recientes, cada mod puede poner sus propios nombres sin influir en
los demas. Se investigo a fondo, leyendo directamente el codigo (no por subagente), y la respuesta tiene
dos mitades:

**Si, a nivel de archivo.** Cada mod declara sus traducciones en su **propio namespace**, construido como
`<workspace>/<archivo>`, asi que dos mods nunca pelean por el mismo archivo y el mod es dueño de sus
textos. _Fuente: `suite/scripts/lib/i18n-source-map.mjs` (constructor de entrada de namespace)._

**No, a nivel de clave compartida.** En runtime todos los namespaces se fusionan en un catalogo unico por
tenant e idioma, con precedencia: core primero, mods **en orden alfabetico**, y override por tenant al
final. Para una clave repetida gana la ultima capa. Y el contexto de i18n no tiene dimension de
aplicacion: su clave de memoizacion es idioma, pais, institucion, objeto, tipo de layout y nombre de
layout. _Fuente: `suite/utils/i18nBridge.ts:70-131` (contexto y resolucion de namespaces);
`suite/scripts/lib/i18n-source-map.mjs` (funcion de orden de capas, comentada como "core first, mods last,
mods override core")._

**Consecuencia que agrava el caso, y que no estaba en el primer analisis:** para Activity y Offering la
declaracion de curriculum-design **no solo no aisla, sino que pierde**, porque `uengagement-up1` se carga
despues en el orden alfabetico de mods. Es decir, el rename no tomaria efecto. La unica capa que gana
sobre todos los mods es el override por tenant, y esa se aplica a las dos apps por igual.

**Tampoco hay canal por configuracion de app.** El esquema del objeto de app declara que una entrada de
pestaña acepta el nombre de un objeto o el tab especial de dashboards, sin campo de etiqueta; lo mismo las
entradas por rol interno. Y la interfaz de pestaña resuelta server-side descarta claves extra. _Fuente:
`object-manager/objects/up1/suite/up1_suite_app.json` (version commiteada);
`suite/composables/navTabs.ts` (interfaz `NavTab`); `suite/logic/app.resolver.js:29-47`._

**La regla resultante, para reusar:** un mod controla el nombre de las vistas cuyos objetos solo el
declara como pestaña; para un objeto compartido con otra app, no existe nombre propio por app.

**Validacion de frescura (2026-08-17).** `suite` y `mods/curriculum-design`: al dia con su remoto y sin
cambios sin commitear. `object-manager`: al dia, con cambios locales que son artefactos de sync; la
afirmacion sobre el esquema se verifico contra la version commiteada, y el unico delta local en ese archivo
era una linea de descripcion en un campo de timestamp. `mods/uengagement-up1`: dos commits atras del
remoto, correspondientes a una vista de detalle de bloques de disponibilidad, que **no tocan su
configuracion de app ni sus traducciones comunes**; por lo tanto no alteran la colision.

## Hallazgos colaterales registrados

- **La capacidad de orden de vistas por rol si esta construida en el core**, contra lo que el equipo
  asumio en el refinamiento, y tiene un mod de referencia que ya la usa. No cambia el alcance de este
  ticket, pero corrige el supuesto.
- **En el core conviven dos sistemas de etiquetado desconectados, y ninguno es por aplicacion.**
  1. La **clave i18n** `object.<NombreObjeto>`, que es la que alimenta el menu y, por herencia, la ruta de
     navegacion.
  2. La **etiqueta de negocio del objeto**, capacidad construida con **UPONE-1504 (CE-2 / R8)**: una
     cascada unica que resuelve `label`/`labelPlural`/`gender` desde `core_ObjectDefinition`, con soporte
     de mapa por idioma y cascada idioma activo, idioma por defecto, nombre tecnico. Sus consumidores hoy
     son las celdas de tabla y el detalle de registro
     (`layout/src/components/molecules/TableCell/TableCell.vue:373`,
     `layout/src/layouts/RecordDetail/RecordDetail.vue:236`); **no** el menu.

  El equipo recordaba esta segunda capacidad como "la funcionalidad de nombre nueva", y es correcto que
  existe y es reciente. Pero no resuelve el caso por dos motivos: no alimenta el menu, y su unidad de
  nombrado sigue siendo el **objeto** (`label` es una fila por objeto y tenant), no el par aplicacion mas
  objeto. Cablear el menu a esa cascada tampoco resolveria la colision: `activity.json` ya declara
  "Programa de asignatura" como etiqueta, asi que la pestaña de Engagement pasaria a mostrar ese mismo
  texto. _Fuente: `layout/src/shared/objectLabels.ts` (docstring que cita el ticket y describe la
  cascada)._
- **El archivo de override por tenant vive en el workspace de suite**, que es core. Es configuracion,
  no codigo, pero tocarlo cae fuera del mod y conviene acordarlo antes.
