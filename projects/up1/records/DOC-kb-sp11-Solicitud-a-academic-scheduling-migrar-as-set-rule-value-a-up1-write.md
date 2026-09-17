---
id: DOC-kb-sp11-Solicitud-a-academic-scheduling-migrar-as-set-rule-value-a-up1-write
project: up1
type: doc
module: academic-scheduling
tags:
  - sp11
  - mcp
  - blockGenericMutation
  - academic-scheduling
  - as_set_rule_value
  - solicitud
  - UPONE-1758
---

# Solicitud a academic-scheduling: migrar as_set_rule_value a up1.write()

**Para quien lo lee:** este documento esta escrito para que lo entiendan tanto el PO como los desarrolladores. Cada tema abre con una explicacion en lenguaje simple; el **Detalle tecnico** queda para quien quiera el codigo exacto. Los terminos estan en el glosario del final.

**En una frase:** estamos poniendo un candado en el asistente (el MCP) para que nadie pueda modificar datos importantes saltandose sus reglas. Una funcion del equipo de academic-scheduling usa hoy la puerta vieja que ese candado cierra. Hay que ajustarla (unas 4 lineas, medio dia) para que use la puerta nueva. Si no se hace antes de activar el candado, la funcion deja de andar.

- **Sprint:** 11.
- **De donde sale:** el arreglo del candado esta en la rama `origin/UPONE-1758` del repositorio del asistente (`up1/mcp`, commit `5ba9fb6`).
- **Prioridad:** obligatoria. Va en el mismo release que el candado (core).
- **Esfuerzo del ajuste de academic-scheduling:** unas 4 lineas de codigo, medio dia, menos de 1 punto.

---

## Lo que te pedimos a academic-scheduling

Cambiar **unas 4 lineas** en `as_set_rule_value` (archivo `rule-value-upsert.js`) para que escriba por la puerta nueva (`up1.write("create"|"update", ...)`) en vez de las herramientas viejas. **Eso es todo tu alcance.** No tenes que tocar el candado ni ocuparte de lo que hagan otros equipos. El resto del documento explica el porque.

**Importante para poder hacerlo:** la puerta nueva (`up1.write`) todavia NO existe en la linea principal del asistente; solo vive en la rama del candado (`UPONE-1758`). Es el cambio de core el que habilita el tuyo: base tu trabajo sobre esa rama, no contra `develop`.

---

## 1. Que estamos haciendo y por que (en simple)

El **asistente (MCP)** deja que una persona (por ejemplo, un coordinador academico) le pida cosas a up1 conversando, y el asistente las ejecuta a traves de **funciones**.

Entre ellas hay unas **genericas**, que pueden crear, editar o borrar **cualquier** dato. Son comodas, pero tienen un problema: **algunos datos tienen reglas de negocio que hay que respetar si o si**, y esas funciones las ignoraban. Es como una puerta de servicio que deja entrar a cualquier lado del edificio sin pasar por recepcion.

Ejemplo: la estructura de competencias de otro modulo debe escribirse siguiendo un procedimiento (con su rubrica y sus tablas, todo junto). Con las funciones genericas, alguien podia escribir ese dato "por la puerta de servicio" y dejarlo inconsistente.

**El arreglo cierra esa puerta.** Ahora toda escritura generica pasa por **un unico lugar de control** que revisa si el dato es uno de los "protegidos": si lo es, lo frena y explica por que; si no, lo deja pasar normal.

**Por que obliga a otros equipos:** para que el candado sea de verdad y no una sugerencia ignorable, el arreglo **retira de circulacion** las herramientas viejas de escritura sin control. Cualquier funcion que las use deja de andar hasta actualizarla. Hoy hay **una sola** en esa situacion: la de academic-scheduling que fija el valor de una regla.

> **Alcance honesto:** este candado cierra la puerta *del asistente*. Todavia no cierra otras vias tecnicas (por ejemplo, edicion masiva del sistema base); eso es un paso posterior mas grande. Es una capa de proteccion solida, no la proteccion total y final.

**Detalle tecnico**
- Las genericas son las tools `up1_create_object` / `up1_update_object` / `up1_delete_object`: se registran siempre, fuera del gate de mods, y no consultaban la declaracion `objects` del pack.
- El "unico lugar de control" es `Up1GraphQLClient.write(operation, variables, ctx)`, que llama `assertGenericWriteAllowed(objectType, operation)` contra el indice de objetos gobernados (`src/contracts/generic-write-block.js`) antes de ejecutar la mutation.
- `Up1GraphQLClient.request(query, ...)` ahora rechaza con throw cualquier texto que contenga `createInstance(` / `updateInstance(` / `deleteInstance(`. Guard sintactico y sin excepciones, para frenar codigo futuro que re-arme la mutation a mano.
- Un objeto se declara protegido con `blockGenericMutation` (opt-in, por operacion). El cierre integral (bulk-edit del core, GraphQL directo) queda para escalar el invariante al resolver generico del object-manager; esto es defensa en profundidad del lado del MCP.

---

## 2. Por que el candado es un freno de verdad, y no una sugerencia (en simple)

Esta es la parte que justifica todo lo demas (incluido por que hay que pedirle el ajuste a academic-scheduling en vez de resolverlo "por adentro"). El punto es que el candado esta diseñado para que **no se pueda esquivar**, ni por error ni a proposito.

**Un solo lugar por donde pasa todo.** El asistente tiene tres formas de escribir: las funciones automaticas, el borrado con impacto, y cualquier cosa que agregue un modulo por su cuenta. El arreglo hace que las tres pasen **obligatoriamente por el mismo punto de control**. No hay una cuarta puerta.

**No alcanza con "pedir por favor".** Antes, cada modulo declaraba que datos eran delicados, pero esa declaracion no se usaba en ningun lado: era un cartel de "no entrar" que nadie hacia cumplir. Ahora la declaracion se consume de verdad y frena la escritura antes de que salga.

> **Lo que se descubrio al probarlo:** el primer intento de candado era superficial: se esquivaba escribiendo el nombre del dato con una mayuscula distinta, o nombrandolo por una de sus "variantes" internas. Medido contra el sistema real, **10 de cada 15 intentos de burlarlo pasaban**. La version final cierra esos huecos (normaliza mayusculas y reconoce las variantes), por eso es robusta y no cosmetica. (Esto es del motor del candado; no es algo que academic-scheduling tenga que tocar.)

**Ante la duda, no deja pasar (falla cerrado).** Si por algun motivo el asistente no puede confirmar si un dato esta protegido, **no escribe** y avisa que no se cambio nada. Prefiere frenar de mas antes que dejar pasar una escritura sin control.

**Detalle tecnico**
- **Por que en la capa de transporte y no en el motor de fichas:** el motor (`register-declarative-tools.js`) no es el unico emisor. `up1_delete_object` se registra a mano (`delete-with-impact.js`) y un pack con `registerExtra` puede llamar el cliente directo (ej. el propio `rule-value-upsert.js`). El unico punto por el que pasan las tres puertas es `Up1GraphQLClient.request`/`write`: ahi vive el chequeo. El del motor de fichas es ADEMAS, para cortar antes del preview.
- **Anti-evasion por casing y alias** (`blockKeyCandidates`): el object-manager llega a la misma tabla por el nombre en PascalCase, en camelCase, y por proyecciones `ext__<client>__<base>` / `rt__<recordType>__<base>`. Se normaliza a minusculas y se pelan los prefijos por segmentos `__`, del mas especifico al mas general. Sin esto, 10 de 15 intentos de evasion pasaban.
- **Falla cerrado:** `ensureGenericWriteBlockIndex` rechaza con `BlockedGenericWriteError` (mensaje de negocio, sin jerga) si no puede armar el indice, mismo criterio que `refreshCapabilityGating`. El indice es global del proceso, no de la sesion: un objeto gobernado lo es siempre, lo tenga habilitado esta sesion o no.
- **El mensaje del guard apunta al programador,** no al usuario: el chequeo de `request()` no protege contra el modelo (el modelo no elige el documento), protege contra el codigo que se agregue despues, por eso el throw dice "usa `up1.write(...)`".

---

## 3. Que hace hoy la funcion de academic-scheduling (en simple)

La funcion `as_set_rule_value` hace algo simple de describir: **fijar el valor de una regla dentro de un conjunto de reglas** ("en este escenario, la regla X vale Y").

Lo particular es *como* lo hace. No es un simple "guardar", sino un **upsert**: primero **busca** si esa regla ya tiene valor y, segun el resultado, **crea** el registro o lo **edita**. Son dos pasos encadenados. Por eso se hizo "a mano" y no con el motor automatico del asistente, que solo sabe operaciones de un solo paso.

Para escribir, hoy usa **las herramientas viejas** que el candado retira. Ahi esta el problema: no porque el dato sea peligroso, sino porque usa la puerta que se esta cerrando.

> **Dato tranquilizador:** el dato que esta funcion escribe (el valor de una regla) **no es uno de los protegidos**. El candado no lo quiere frenar. El ajuste no cambia en nada lo que la funcion hace ni lo que el usuario ve: solo cambia la puerta interna por la que pasa.

**Detalle tecnico** (archivo `mods/academic-scheduling/ai/rule-value-upsert.js`, identico byte a byte a su copia generada en `mcp/src/mods/academic-scheduling/rule-value-upsert.js`):
- **Linea 29:** recibe del `ctx` las constantes `LIST_INSTANCES, CREATE_INSTANCE, UPDATE_INSTANCE`. Las dos ultimas son las herramientas viejas de escritura.
- **Lineas 50-61:** `up1.request(LIST_INSTANCES, ...)` busca la fila `RuleSetRule` del par `(ruleSetId, ruleDefinitionId)`. Es una query, no una escritura: **no se toca**.
- **Lineas 63-65:** el upsert. Existe -> `UPDATE_INSTANCE` con `{objectType:"RuleSetRule", id, data:{value}}`; no existe -> `CREATE_INSTANCE` con `{ruleSetId, ruleDefinitionId, value}`.
- **Lineas 66-76:** arma la salida con `result.updateInstance ?? result.createInstance`.
- `RuleSetRule` **NO esta gobernado** (su contrato solo tiene doc de lectura): el guard no lo bloquea a proposito.

---

## 4. Que pasa si no se hace el ajuste (en simple)

El arreglo, ademas de cerrar la puerta vieja, **deja de repartir las herramientas viejas** a las funciones de los modulos. La funcion va a pedir una herramienta que ya no le llega y **se rompe apenas alguien la use** para escribir de verdad (con `confirm`). No es que el candado la bloquee: se quedo sin la herramienta que usaba.

Por eso el ajuste es **obligatorio y coordinado** con el candado.

**Detalle tecnico**
- La rama saca `CREATE_INSTANCE`/`UPDATE_INSTANCE` del `modCtx` que `mcp-server.js` pasa a todos los packs (verificado en el diff `develop..origin/UPONE-1758`).
- Como ya no viajan, en la linea 29 llegan `undefined`; la primera llamada con `confirm:true` ejecuta `up1.request(undefined, ...)` y revienta en runtime.
- La rama **no modifica** `rule-value-upsert.js`: la migracion queda deliberadamente del lado de `as`.

---

## 5. Las tres formas de resolverlo, y por que elegimos una

| Opcion | En que consiste | Veredicto |
|---|---|---|
| 1. El asistente disimula el cambio | Volver a repartir las herramientas viejas o traducirlas por debajo | **Descartada:** rompe el candado |
| 2. academic-scheduling se ajusta | Cambiar ~4 lineas para usar la puerta nueva | **Recomendada:** minima y segura |
| 3. Declarar una "excepcion" | Marcar la funcion como exceptuada del candado | **No aplica:** el candado no exime funciones |

### Opcion 1: el asistente disimula el cambio. DESCARTADA.

Hacer que el asistente vuelva a entregar las herramientas viejas (o traduzca "por atras" las llamadas viejas a las nuevas), para que academic-scheduling no toque nada. Suena comodo, pero **rompe justo lo que vinimos a arreglar**: si las viejas vuelven a estar disponibles, cualquier funcion (ahora o a futuro) puede volver a escribir datos protegidos por la puerta de servicio. El candado vuelve a ser una sugerencia ignorable. Y obliga a rediscutir una decision de diseno ya tomada, asi que **cuesta mas**, no menos.

La variante "traducir por debajo" es peor: para traducir habria que mantener viva la herramienta vieja (mismo agujero) o reabrir dentro del control un camino que escriba sin revisar. Cualquiera de las dos perfora el unico lugar donde hoy se controla.

**Detalle tecnico**
- El corte se sostiene en dos cosas a la vez: constantes no exportadas + rechazo sintactico en `request()`. Un shim reexporta las constantes (reabre el bypass para todo el codigo) o reintroduce en `request()` un camino que evada el guard. El comentario de `graphql-client.js` es explicito: el chequeo es contra "el codigo que se agregue despues", y un shim es ese codigo. Son 5-10 lineas pero contradicen el proposito de la rama y exigen nueva ronda de review.

### Opcion 2: academic-scheduling se ajusta. RECOMENDADA.

Cambiar la funcion para que escriba por **la puerta nueva** (`up1.write`) en vez de la vieja. Unas 4 lineas, en un solo archivo. **No cambia nada de lo que la funcion hace ni de lo que el usuario ve**, porque el dato que toca no esta protegido: el candado lo deja pasar igual. Solo cambia el camino interno.

Por que es la mejor:
- **Es el cambio mas chico posible** y no toca ni el asistente ni el sistema base.
- **Respeta el candado:** usa la unica puerta que el diseno deja abierta.
- **No pierde la proteccion a futuro:** si algun dia intentara escribir un dato protegido, el candado la frena.
- **Comportamiento identico:** mismo preview, mismo mensaje, misma logica. Reversible.

**Detalle tecnico** (cambio en `rule-value-upsert.js`):
- Linea 29: sacar `CREATE_INSTANCE, UPDATE_INSTANCE` del destructure del `ctx`.
- Linea 64: `await up1.write("update", { objectType:"RuleSetRule", id: current.id, data:{ value } }, ctx)`.
- Linea 65: `await up1.write("create", { objectType:"RuleSetRule", data:{ ruleSetId, ruleDefinitionId, value } }, ctx)`.
- Lineas 66-76 sin cambios: los campos siguen siendo `updateInstance`/`createInstance` en los documentos internos.
- La busqueda (`LIST_INSTANCES`) no se toca; como `RuleSetRule` no esta gobernado, `assertGenericWriteAllowed` no lo bloquea.

### Opcion 3: declarar una "excepcion". NO APLICA.

Como existe un mecanismo para marcar datos como "protegidos", alguien podria pensar en usarlo al reves para marcar esta funcion como "exceptuada". **No se puede, y no hace falta.** Ese mecanismo dice "este dato no se toca por la puerta de servicio", no "esta funcion puede saltarse el control". Son ejes distintos: uno habla de **datos**, el otro de **caminos**. Y como el dato no esta protegido, no hay nada que exceptuar: simplemente tiene que usar la puerta nueva, que ya existe para exactamente este caso.

**Detalle tecnico**
- `blockGenericMutation` es un mapa por operacion cuyo valor es el mensaje de negocio del rechazo: gobierna objetos, no exime tools. Declarar `RuleSetRule` gobernado bloquearia el propio upsert. El guard de `request()` no tiene lista de excepciones a proposito: el rechazo depende del texto de la query, no de quien llama. La via legitima ya existe: `up1.write()`.

---

## 6. Riesgo y como validarlo

El riesgo es **bajo**: cambio local, reversible, sin comportamiento visible distinto. La unica precaucion es confirmar que la rama del candado no cambio desde el analisis y probar los dos caminos del upsert (crear y editar) antes de cerrar.

**Detalle tecnico**
- Verificado: `origin/UPONE-1758` en `5ba9fb6`; `rule-value-upsert.js` no fue modificado por la rama, asi que el ajuste es aditivo y no genera conflicto. Re-fetchear antes de tomar los `file:line` como definitivos.
- Correr `mcp/test/generic-write-block.test.mjs`; agregar una asercion de que la funcion ya no referencia `CREATE_INSTANCE`/`UPDATE_INSTANCE`; probar los dos caminos del upsert contra un cliente GraphQL falso (patron de `test/delete-with-impact.test.mjs`).

---

## 7. Orden de merge (no es un lockstep de tres)

La coordinacion es mas simple de lo que parecia: **curriculum-mapping y academic-scheduling no dependen entre si.** El unico par que va atado es **el candado (core) + tu cambio**. La pieza de cm entra por su cuenta, cuando ese equipo este listo.

**Antes que nada: ¿ya podes hacer tu cambio?** La puerta nueva (`up1.write`) **todavia no existe en la linea principal del asistente**: solo vive en la rama del candado (`UPONE-1758`). O sea que **es el cambio de core el que habilita el tuyo**. Para escribir y probar tu ajuste, base tu trabajo sobre esa rama; contra `develop`, `up1.write` no esta y no compila.

**Por que el candado y tu cambio van juntos (en los dos sentidos):** el candado, en un mismo movimiento, *quita* las herramientas viejas que tu funcion usa *y agrega* la puerta nueva que necesita. Entonces:
- Si el candado sale **sin** tu cambio -> tu funcion se rompe (se quedo sin las herramientas viejas).
- Si tu cambio sale **sin** el candado -> tu funcion se rompe (la puerta nueva todavia no existe).
- Por eso los dos se despliegan en el **mismo release**. No hay una ventana intermedia sana.

**Las piezas:**
1. **El candado** (asistente, rama `UPONE-1758`). Listo y subido. Habilita tu cambio.
2. **Tu pieza:** la migracion de `as_set_rule_value`, hecha sobre la rama del candado. Sale en el mismo release que el candado.
3. **(Aparte) La pieza de curriculum-mapping.** No te bloquea ni la bloqueas: entra cuando ese equipo este listo.

**Por que cm no te ata:** su declaracion de datos protegidos es opcional y retrocompatible. Si el candado no esta, no hace nada; si el candado esta y cm todavia no declaro, sus datos simplemente aun no estan protegidos (queda para cm resolverlo, pero nada se rompe). Conviene que salga con o antes del candado para que su proteccion este activa desde el dia uno, pero no condiciona tu merge.

**Detalle tecnico**
- Verificado: en `develop` del MCP no existe `Up1GraphQLClient.write` ni `assertGenericWriteAllowed`; siguen exportadas `CREATE_INSTANCE`/`UPDATE_INSTANCE` y `mcp-server.js` aun las pasa al `modCtx`. Ambas cosas solo cambian en `origin/UPONE-1758` (`write()` en `graphql-client.js:70`). Por eso el mod solo puede migrar apoyado en esa rama.
- El acoplamiento es a nivel de deploy del MCP: el mod (superrepo) llama `up1.write(...)`, pero quien provee ese metodo es el runtime del MCP. La version del MCP que retira las constantes y la version del mod que usa `up1.write` tienen que desplegarse juntas.
- cm es opt-in: `governedObjects`/`blockGenericMutation` son retrocompatibles; sin el motor no tienen efecto, y el motor sin la declaracion de cm solo deja a esos objetos sin proteger (gap conocido de cm), sin romper nada. No comparte codigo con as.
- Flujo sugerido: as trabaja sobre `UPONE-1758`, prueba crear/editar del upsert, y core+as salen en el mismo release; `npm run sync` + suite en checkout limpio los corre quien coordina ese release.

---

## Glosario

- **Asistente / MCP:** la capa que permite operar up1 conversando; ofrece "funciones" (tools) que ejecutan acciones sobre los datos.
- **Funcion generica de escritura (CRUD generico):** crea, edita o borra cualquier dato, sin conocer sus reglas particulares.
- **Dato protegido / objeto gobernado:** un dato con reglas de negocio propias que no debe escribirse por la via generica sin control.
- **Upsert:** operacion en dos pasos: buscar si algo existe y, segun eso, crearlo o editarlo.
- **Puerta / canal / embudo:** el camino interno por el que una funcion escribe. La vieja: herramientas genericas sueltas. La nueva (`up1.write`): el unico camino que pasa por el control.
- **Candado / guard / bloqueo:** el mecanismo que revisa cada escritura generica y frena las que tocan datos protegidos.
- **`ctx`:** el contexto que el asistente entrega a cada funcion, con las herramientas que necesita. El arreglo deja de incluir ahi las viejas de escritura.
- **`RuleSetRule`:** el registro del valor de una regla dentro de un conjunto. Es lo que `as_set_rule_value` escribe.
- **Runtime:** el momento en que el codigo se ejecuta de verdad, no cuando solo se compila o revisa.
- **Falla cerrado:** ante la duda, el mecanismo frena en vez de dejar pasar. Postura de seguridad.
- **Lockstep:** varias piezas que deben liberarse al mismo tiempo para no dejar el sistema en un estado intermedio roto. En este caso el lockstep es solo core + as; cm queda afuera.
