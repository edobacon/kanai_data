---
id: DOC-kb-sp11-El-arreglo-en-el-core-que-resuelve-esfuerzo-y-relacion-con-el-arreglo-en-el-modu
project: up1
type: doc
module: object-manager
tags:
  - sp11
  - core
  - object-manager
  - arreglo-en-core
  - interceptores-componibles
  - core-extension
  - opcion-estructural
---

# El arreglo en el core: que resuelve, esfuerzo y relacion con el arreglo en el modulo

Analisis completo de sp11 del CAMINO POR EL CORE (arreglo en object-manager) para el MCP de up1. El plan comprometido para cm y cd es el ARREGLO EN EL MODULO (cada mod se resuelve solo). Este documento evalua si, dado eso, el arreglo en el core sigue siendo necesario; el esfuerzo; que habria que hacer y por que; los flujos de escritura involucrados; y como afecta o ayuda a cada mod. Verificado contra codigo real (file:line); el detalle de insercion tecnica esta en "Propuesta a core: interceptores componibles" (sp11).

## 1. Que es el camino por el core, en una frase

Un cambio en el nucleo de la plataforma (object-manager) para que VARIOS modulos puedan gobernar el mismo objeto sin pisarse: reemplazar el punto unico de escritura generica (crear/editar/borrar) por una LISTA de interceptores que se componen. Es distinto del arreglo en el modulo (que resuelve cada mod por su cuenta): el del core resuelve de raiz para todos y cierra vias que el del modulo no cierra.

## 2. Evaluacion: dado que se hace el arreglo en el modulo, ¿sigue siendo necesario?

Respuesta corta: **NO es necesario para dejar el asistente listo; SI es la unica via de cerrar el hueco cross-client de cm; para cd no aporta correctitud, solo destraba una limitacion estructural.** Detalle:

- **Para el asistente (MCP):** NO necesario. El arreglo en el modulo ya deja el asistente seguro y usable en los dos mods (cm bloquea el generico y expone operaciones de dominio; cd ya es seguro por N0 y cierra sus reglas de cliente). El core no agrega nada al objetivo "operable por el asistente".
- **Para cd:** NO necesario por correctitud. cd es N0: sus reglas viven en el camino generico comun, asi que cuando cd cierra sus 4 gaps en sus resolvers, esos fixes valen para TODAS las vias (pantalla, API, asistente), no solo el asistente. cd ya queda cross-client con su propio arreglo. El core solo le aporta lo estructural (dejar de ser el unico dueño del punto de escritura), que importa unicamente porque hoy ese monopolio es lo que impide a cm entrar por la misma via.
- **Para cm:** es la UNICA via de cerrar el cross-client. El arreglo en el modulo de cm es MCP-only: el bloqueo cierra la puerta del asistente, pero las reglas de cm siguen viviendo en operaciones aparte que la escritura generica de OTROS clientes (API/GraphQL directo, bulk-edit de la Suite) no toca. El core es lo que llevaria las reglas de cm al camino generico gobernado, cerrando esas vias. Hoy ese hueco lo cubre solo el control de permisos (RBAC): "riesgo asumido".

**Veredicto de necesidad:** tras el arreglo en el modulo, el core deja de ser requisito y pasa a ser una inversion OPCIONAL, que se justifica solo por una de dos razones (seccion 8): (a) que cerrar el cross-client de cm sea un requisito duro (no basta RBAC), o (b) querer eliminar la limitacion estructural del punto unico y dejar de mantener a futuro las operaciones simples bespoke de cm.

## 3. Flujos de escritura involucrados (lo que cambia y lo que no)

Para un objeto gobernado, estas son las vias por las que se puede escribir, y que pasa en cada una hoy, tras el arreglo en el modulo, y tras el arreglo en el core:

| Via de escritura | Hoy | Tras arreglo en el MODULO | Tras arreglo en el CORE |
|---|---|---|---|
| Pantalla (Suite) | cm: usa su operacion de dominio -> reglas OK. cd: override generico N0 -> reglas OK | igual (seguro) | igual (seguro) |
| Asistente (MCP) | cm: generico inseguro, o nada (sin operaciones propias). cd: generico N0 seguro + 4 operaciones | cm: bloqueo + operaciones de dominio -> reglas OK. cd: igual, seguro | cm: el generico gobernado ya alcanza -> las operaciones SIMPLES se vuelven innecesarias. cd: igual |
| API / GraphQL directo (generico) | cm: **SALTEA las reglas**. cd: reglas OK (N0) | cm: **SIGUE SALTEANDO** (el bloqueo es solo del MCP). cd: reglas OK | cm: reglas OK (override componible). cd: reglas OK |
| Bulk-edit generico del core | cm: saltearia (hoy los layouts de cm usan su operacion propia, asi que no esta activo). cd: reglas OK | cm: igual (no activo hoy; si un layout lo activara, saltearia). cd: OK | cm: reglas OK. cd: OK |
| Seeds (Prisma directo) | saltea (excepcion documentada) | saltea | saltea |

Lectura de la tabla: el arreglo en el core solo cambia DOS celdas respecto del arreglo en el modulo: la escritura generica de cm por **API directo** y por **bulk-edit**. Todo lo demas ya lo cubre el arreglo en el modulo. O sea, el valor del core se reduce exactamente a: cerrar el cross-client de cm, mas la mejora estructural.

## 4. El problema estructural que resuelve (por que hoy no se puede)

La escritura generica tiene UN SOLO dueño por objeto en todo el server (`object-manager/src/graphql/resolverIndex.js`, merge por `Object.assign`/spread, 25-68 y 109-123: `Mutation.createInstance` es una sola casilla, gana el ultimo). curriculum-design ocupa esa casilla; curriculum-mapping lo intento (commit `7972381`) y lo revirtio un dia despues (`068ec91`) porque su guard mataba en silencio el de cd. No es falla de un mod: es que el core no permite dos dueños. Por eso cm no puede resolverlo como cd, y por eso el arreglo en el core (una LISTA de interceptores) es lo unico que destraba la raiz.

## 5. Que es el arreglo (mecanismo)

Que los tres campos genericos corran una LISTA de interceptores componibles en vez de un solo dueño: un registro `(objectType, operacion) -> [interceptores]`, un componedor que los corre en orden con corto-circuito (si uno rechaza, se detiene) y falla cerrado, invocado dentro de `instance.resolver.js` donde ya corre la validacion declarativa del core (create ~4131, update ~5540-5559, delete ~5024). Passthrough total sin interceptores (comportamiento identico a hoy). Detalle de insercion y compatibilidad: "Propuesta a core".

## 6. Como afecta o ayuda a cada mod

### curriculum-mapping (cm)
- Ayuda: cierra el cross-client (API directo + bulk-edit) que el arreglo en el modulo deja abierto; y vuelve innecesarias las operaciones SIMPLES de dominio (tributacion y adopcion de una fila), porque el generico gobernado ya las cubre. Deja de necesitar el bloqueo defensivo.
- No cambia: las operaciones COMPUESTAS de cm (arbol, matriz, adopcion masiva) siguen haciendo falta (no son una escritura de una fila); la lectura y la guia son ejes aparte que el core no toca.

### curriculum-design (cd)
- Ayuda: destraba la limitacion de fondo (cd deja de ser el unico dueño del punto de escritura; sus reglas se vuelven componibles con las de otros mods). No cambia su comportamiento.
- No cambia: cd ya es cross-client por N0, asi que el core NO mejora su correctitud; y sus 4 gaps client-only siguen siendo trabajo de resolver del propio cd (el core no los cubre).

## 7. Esfuerzo, sensibilidad, testing

- Esfuerzo: ~5 a 8 puntos de nucleo (mecanismo + tests del componedor) + migracion de cm a interceptores + migracion/verificacion de cd. En total probablemente mas que el arreglo en el modulo, pero resuelve la raiz para todos.
- Sensibilidad: ALTA. Toca el camino por el que escribe TODO objeto de TODO mod; un bug rompe el CRUD de toda la plataforma. Requiere sign-off del equipo de object-manager.
- Testing: tests del componedor (orden determinista, corto-circuito, aislamiento de error, passthrough sin interceptores) + regresion de TODOS los overrides existentes de cd + suite completa del object-manager en checkout limpio + un test de integracion cross-mod (hoy no existe) que ejercite el merge real.

## 8. Que se deberia hacer, y por que

**Recomendacion: NO ahora. Dejarlo como follow-up estructural, con un gatillo claro.** Motivos:
- El arreglo en el modulo (comprometido) ya entrega el asistente listo en los dos mods. El core no acelera eso.
- El unico beneficio real del core sobre el plan del modulo es cerrar el cross-client de cm; hoy ese hueco lo cubre RBAC (riesgo asumido). Si el equipo acepta RBAC para las vias no-asistente, el core no es necesario.
- Gatillos que justificarian hacerlo: (a) que aparezca un requisito duro de cerrar el cross-client de cm (ej. una integracion o un bulk-edit que empiece a escribir objetos de cm sin sus reglas); (b) querer eliminar la limitacion del punto unico y dejar de mantener a futuro las operaciones simples bespoke de cm.

**Dependencia de timing importante (para no pagar dos veces):** la decision sobre el core conviene tomarla ANTES de que cm construya sus operaciones SIMPLES en el modulo. Si se anticipa que el core se hara, cm deberia construir SOLO las compuestas (que sobreviven) y saltear las simples (que el core volveria redundantes). Si el core no se hara pronto, cm construye todas. Las compuestas y los fixes de cd (B.4, los 4 gaps) sobreviven en cualquier caso.

## 9. Decisiones de diseño abiertas (si se hace el core)

1. **Convivencia con el override total de cd durante la migracion.** Un override total del campo bypassea el generico entero; decidir si cd migra sus reglas a interceptores puntuales (gradual) o si su override llama al componedor mientras tanto. No lo resuelve el codigo actual.
2. **Las operaciones de dominio de cm llaman al generico como funcion interna.** Si los interceptores corren dentro del generico, esas llamadas dispararian tambien interceptores de otros mods sobre objetos de cm: puede ser deseable o romper el supuesto "mis reglas ya validaron todo". Mayor riesgo de choque; se mitiga porque es opt-in por objeto.

Ver en sp11: la matriz de MCP-readiness (asume el arreglo en el modulo), el ticket de cm, el analisis de cd, la Propuesta a core (detalle de insercion con file:line) y el reporte del fix de blockGeneric.
