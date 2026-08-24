# UPONE-1619 - Evidencia extendida de Aduana (frontera core/mod)

> **Interno, no pegar en Jira.** El resultado condensado (tabla por artefacto + veredicto global) vive
> en la seccion "Frontera core/mod (Aduana)" de `UPONE-1619-detalle.md`. Aqui queda el rastro de la
> pasada: que se busco, que excepciones se aplicaron y que razonamiento se descarto.
> Modo: analisis. No se invoco `core-extension-writer` ni se creo ningun ticket.

## Veredicto global

`todo-mod-only`. Los 7 artefactos del alcance se resuelven con mecanismos que el core ya expone hoy: la
jerarquia por self-FK del objeto Base del arbol de secciones, el patron de FK escalar en RecordTypes, el
listado embebido filtrado por el padre con layouts asociados, los resolvers propios de mod como punto de
extension, y el pipeline de codegen y migracion. Ninguno exige tocar un archivo compartido de
`object-manager`, `layout` o `suite`.

## Que se busco

- El patron del catalogo de tipos de recurso, para validar el artefacto del catalogo de tipos de pieza.
  Confirmado que vive dentro de un mod y no entre los objetos Base, lo que establece el precedente de
  que los catalogos de tipo son objetos de mod.
- El mecanismo de jerarquia del objeto Base del arbol de secciones y su uso en los RecordTypes
  hermanos, confirmando que el self-FK con el patron de referencia declarada es generico y ya soporta
  el caso de la pieza anidada a la modalidad.
- El motor de formulas y el descubrimiento de relaciones del core, mas la documentacion de claves de
  configuracion del listado, para verificar si existe una capacidad de campo computado sobre una
  coleccion de hijos o una fila de totales. **No existe ninguna de las dos**: el motor solo camina FK
  hacia el padre, nunca hacia una coleccion, y la documentacion del listado explicita que la agregacion
  no esta entre las claves que consume.
- La documentacion del listado embebido y el layout real de edicion de curso, donde **ya existe** un
  listado embebido del RecordType de modalidad con filtro y layout de creacion propio: precedente
  exacto, un nivel de anidacion mas arriba, con el mismo mecanismo.
- El loader del seed de secciones de silabo completo, confirmando que resuelve el dueno por codigo pero
  no tiene ningun paso de resolucion de padre entre nodos hermanos.
- El catalogo de capabilities del mod, para confirmar que ya declara las propias y no necesita una
  capability nueva del core.

## Excepciones por tipo de artefacto aplicadas

- **Objeto / campo:** no es core-worthy salvo que deba vivir en un objeto Base o cambie el mecanismo del
  Object Manager. El catalogo de tipos y el RecordType de la pieza son objetos del dominio propio del
  mod y no tocan objetos Base ni el mecanismo del ORM.
- **Resolver:** no es core-worthy si el CRUD generico cubre el caso, o si se resuelve como resolver
  propio del mod. Para la derivacion del total el CRUD generico **no** alcanza, pero el resolver se
  escribe en la logica del mod, que es un punto de extension ya soportado por el sync, no un cambio a
  codigo compartido.
- **Tipo de layout o capacidad de configuracion de layout:** se verifico contra la documentacion si el
  listado y el detalle ya soportan lo pedido antes de asumir que faltaba capacidad. Si lo soportan: el
  listado embebido con filtro por el padre y layouts asociados ya esta documentado y en uso real en el
  mismo mod para el mismo tipo de anidacion. Anidar un nivel mas es configuracion, no codigo de core.

## Razonamiento descartado

- **Marcar la derivacion del total como core-worthy** y escalar una capacidad de campo derivado desde
  una coleccion de hijos, o una fila de totales en el listado. Es una capacidad genuinamente generica
  que otros mods podrian querer. Se descarto para este ticket porque el mod puede resolverlo integramente
  con un resolver propio sin tocar codigo compartido, porque el alcance acordado es solo la carga de
  curriculum-design, y porque esta pasada es de analisis: no corresponde escalar nada aqui. Queda
  registrado como observacion y como Decision abierta en el contrato, no como veredicto core-worthy.
- **Tratar la migracion destructiva como core-worthy por su riesgo.** Se descarto porque el riesgo es de
  **proceso y coordinacion de despliegue**, no de **genericidad del artefacto**: el campo que se retira
  es propio del RecordType de un mod y la migracion la genera el pipeline generico. Queda como alerta
  operativa en el contrato (consentimiento por tenant y coordinacion con core antes de aplicar), no
  como hallazgo de frontera.
- **Suponer que la FK escalar al tipo necesita una capacidad nueva de relaciones tipadas.** Se descarto:
  el patron de referencia declarada ya existe, se usa en el propio arbol de secciones, es mecanismo de
  codegen generico y esta documentado en las convenciones de RecordType del proyecto.

## Reconciliacion con la verificacion de codigo

La verificacion de frescura, corrida en un subagente distinto, refuto tres afirmaciones del plan previo
que conviene tener presentes junto a este veredicto:

1. **El inventario de consumidores de las columnas de horas es mayor** que "solo el guard de modalidad
   por defecto": hay tres layouts propios del RecordType, dos layouts de silabo, columnas del listado
   dentro del formulario de curso, y la heuristica de tipo de campo del arbol compuesto del mod, que las
   nombra por string. Ningun resolver de negocio las lee, que es el fondo de la afirmacion original.
2. **La copia de esa heuristica en el workspace de layout es un artefacto de sincronizacion**, no un
   archivo promovido al core. Los componentes del mod se sincronizan a los directorios de componentes de
   mod de layout y de suite, y esos archivos no se editan a mano. La fuente a modificar es la del mod, y
   por eso el veredicto sigue siendo del mod.
3. **El mod vecino de programacion academica ya avanzo**: creo el objeto de cluster de secciones y las
   FKs de la seccion, y dejo constancia fechada de que su FK a la pieza queda diferida hasta que este
   objeto exista. Refuerza que el veredicto de frontera es correcto (cada mod hace lo suyo) y sube la
   urgencia de la coordinacion.
