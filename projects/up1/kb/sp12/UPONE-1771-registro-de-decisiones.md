---
id: DOC-kb-sp12-UPONE-1771-registro-de-decisiones
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp12
  - UPONE-1771
  - decisiones
  - curriculum-mapping
  - curriculum-design
  - versionado
  - tributacion
---

# UPONE-1771 · Registro de decisiones

> Registro vivo de las decisiones tomadas sobre UPONE-1771 (indicadores y versionado del plan). Lo tomado el 2026-10-07, el 2026-10-08 y el 2026-10-09 reemplaza lo que digan el detalle y el pre-intake de esta carpeta (versión 2, del 2026-10-06) donde se contradigan. Los documentos hermanos son `UPONE-1771-detalle`, `UPONE-1771-pre-intake` y `UPONE-1771-estado-por-usos`; el tablero visual de decisiones es un artefacto aparte.

## Decididas

| # | Decisión | Fecha | Notas |
|---|---|---|---|
| D1 | Solo mod, sin Core Extension. La elección se hace al versionar con un modal propio de cd (acción de crear con modal pre-llenado hacia un layout propio, cuyo `customEndpoint` llama a una mutation propia de cd) | 2026-10-07 | La mutation fija la bandera de versión y, como llama a la creación genérica sin pasar por el override de cd, debe invocar por su cuenta la herencia de la extensión del plan |
| D2 | Un solo ticket de Jira (UPONE-1771) ejecutado como dos tickets de Kanai: A indicadores, B versionado | 2026-10-07 | El motivo es la calidad de contextos limpios y acotados, no el costo. Los datos de UPONE-1770 muestran que partir no abarata el costo total |
| D3 | **Opción F.** El versionado sigue el flujo normal y nace sin tributación. Quien tiene los permisos de tributación (`competencyalignment:create` y `competencynode:adopt`) puede optar por llevar el mapa. Sin esos permisos no se ve la opción. No hay autorización derivada: nadie escribe tributación sin permiso propio. Se mantiene la acción de recuperación "replicar desde la versión anterior" | 2026-10-07 | Reemplaza a la opción E ("replicar por defecto con autorización derivada") que se había confirmado antes. La opción exige `adopt` además de `create` porque la v2 nace sin adopción de matriz. **Se aparta de la maqueta del PO** (ver "Para avisar al PO") |
| D4 | La lógica de réplica vive en cm. cd la invoca desde su servidor (mutation del modal) y la acción de recuperación la usan la pantalla y una ficha MCP | 2026-10-07 | Con F la invocación se hace con los permisos del propio usuario. Importar archivos de cm y escribir por acceso directo quedan descartados |
| D5 | El permiso que gobierna la elección es `competencyalignment:create` | 2026-10-06 | Se comprueba además `competencynode:adopt` en servidor |
| D7 | **Opción B.** Poblar `planEntry.sourceEntryId` con la entrada de origen al versionar, con respaldo por asignatura (plan + asignatura) cuando el vínculo falte | 2026-10-07 | Pendiente de verificar el efecto en el borrado de planes versionados y si el vínculo debe quedar en el historial (DataLog). Es el primer consumidor del campo, que quedó en nulo por decisión de UPONE-1450 (sin consumidor real) |
| D8 | **Opción A (la de la maqueta).** El indicador "con evaluador en el nivel representativo" solo se especializa donde la competencia tiene un nivel marcado como representativo. Sin marcado, la competencia cuenta como "con evaluador" si tiene cualquier evaluador (el indicador se degrada al normal). Con un solo nivel declarado la representatividad no interviene | 2026-10-08 | **Pendiente de confirmación del PO.** Se descartó la opción B (último nivel como respaldo), que es lo que hoy hacen el simulador de consolidación (`trace.ts`) y el aviso "Falta evaluador en {nivel}" de la grilla: hay una inconsistencia que el PO debe resolver. Hoy nadie escribe `isRepresentative` (36 de 36 en nulo en el tenant de desarrollo): hasta que alguien marque niveles, el indicador especializado coincide con el normal. El editor del marcado y la unicidad (exactamente uno) quedan fuera de 1771. Hay un artefacto explicativo para el PO con un simulador de los casos (2026-10-09) |
| D9 | "Fuera de diseño" son dos casos: (1) fila en un nivel que la competencia no declara, solo si la competencia declara al menos un nivel; (2) fila colgada de un nodo que consolida. Se muestran marcadas, nunca se borran solas y no entran al cálculo. La tarjeta aparece solo si hay filas afectadas y cuenta tributaciones. El detalle de la fila ofrece moverla a un nivel declarado | 2026-10-08 | Fuente: maqueta v18 y v20, coincide con el código (R-3 y R-4 solo validan al escribir; M-28 deja lo ya medido al desmarcar un nivel). "Competencia fuera del árbol" no es un caso: borrar una competencia tributada se rechaza (M-37), y el `continue` de la lectura descarta filas de otras matrices adoptadas, que es correcto. No hay que dejar de descartar nada en la vista |
| D10 | **La maqueta manda.** La lectura del plan lleva tres indicadores: desarrollo tributado, asignaturas que tributan y matrices adoptadas. El componente de tributación lleva el resto: desarrollo tributado, con evaluador en el nivel representativo (solo con esa base de logro), competencias con evaluador, asignaturas sin tributar y fuera de diseño. Denominador de la lectura: todas las matrices adoptadas. Denominador del componente: solo la matriz elegida | 2026-10-08 | Las etiquetas distintas ("asignaturas que tributan" en lectura y "asignaturas sin tributar" en componente) son intencionales. El PO sacó "con evaluador" y "fuera de diseño" de la lectura porque son datos sobre los que no se puede actuar ahí. El texto de Jira ("los cuatro indicadores en ambas vistas") quedó desactualizado. Por MCP se exponen los mismos indicadores con el denominador declarado |
| D12 | La operación de réplica adopta las mismas matrices en la v2 | 2026-10-06 | Solo las adopciones vigentes (ver D19) |
| D13 | Se acepta que la réplica por MCP escriba tributación, atribuida y auditada a nombre de quien versiona | 2026-10-06 | Con F queda más simple: la hace un agente con los permisos de la persona, sin excepción |
| D19 | **Opción A.** En la recuperación se adopta solo si falta la adopción | 2026-10-07 | Consecuencia aceptada: la adopción copiada nace con origen `Explicit` (ver detalle en el chat). Solo se copian adopciones vigentes; no se copian exenciones ni cerradas |
| D20 | **Opción 2.** El aviso sobre una v2 sin tributación cuando la v1 sí tenía se resuelve con un texto informativo en el modal de versionado, que es donde se decide si llevar el mapa. No bloquea. No se agrega regla nueva al publicar | 2026-10-09 | Se descartaron: dejarlo fuera de 1771 sin aviso (opción 1) y un aviso nuevo al publicar (opción 3). Motivo de descartar la 3: el guard de suma al publicar es interino y deprecable (retiro con el BRE), solo actúa si hay filas, y con F la v2 nace vacía casi siempre, así que el aviso saltaría en casi todo versionado. Queda dentro del modal de D1 |

## Pendientes

**Del dev**
- Retirar el worktree `mods/.nits-v2-wt` y sus dos carpetas generadas, y repetir el sync del MCP.
- Verificar que agregar hijas a una hoja ya tributada es posible (origen del caso 2 de D9).
- Verificar si el total de competencias de los indicadores cuenta solo hojas medibles (maqueta) o también nodos que consolidan (código actual, `competencies.length`).
- Verificar si "con evaluador en el nivel representativo" convive con "competencias con evaluador" (maqueta) o la reemplaza (texto de Jira).

**Del PO**
- Confirmar D8 opción A y resolver la inconsistencia con el simulador y el aviso de la grilla (último nivel). Preguntas concretas: A o B; si se alinean después el simulador y la grilla; quién marcará el nivel y cuándo; qué pasa si hay varios niveles marcados.
- Confirmar que F invierte el default de su maqueta de versionado (ver abajo).
- Corregir el criterio de aceptación del ticket: "sin ese permiso, se replica por defecto" y "los cuatro indicadores en ambas vistas" quedaron superados.
- Revisar el texto del aviso informativo del modal (D20).

**Se resuelven dentro del intake**
- D6 (reintento e idempotencia), D11 (ficha MCP de versionado sobre la misma mutation de cd), D14 a D18.
- Tope de 500 filas por guardado: el lote de creación ya se parte de a 500 internamente, pero la llamada rechaza más de 500 filas. Si la réplica es una operación propia de cm, parte en lotes por su cuenta y el tamaño real deja de ser pregunta para el PO. Confirmar con el plan más grande del seed.
- Validaciones: capabilities de cm en roles que no sean Admin ni Consultor (riesgo H-R, validar primero), pestaña gateada dentro de un modal de crear, uso del campo de revelado para el informe.

## Para avisar al PO

- **Versionado:** la vista de la maqueta del slice dibuja "Replicar mapa" como opción por defecto y "Empezar limpio" como alternativa, con la frase "Sin permiso para decidir, se replica por defecto". La opción F invierte ese default: la v2 nace limpia y replicar es opt-in. La maqueta no muestra el modal, el informe de filas sin destino ni el permiso que gobierna la elección. La maqueta v20 no trae ninguna vista de versionado.
- **Indicadores:** el texto de Jira y la maqueta se contradicen en qué indicadores van en la lectura. Se sigue la maqueta (D10).

## Correcciones al detalle y al pre-intake de esta carpeta

- `isRepresentative` sí tiene lectores (cd y cm); lo que no tiene es escritor.
- El selector de asignatura en solo lectura ya está resuelto (commit `43128a5`).
- Las líneas citadas quedaron desplazadas tras UPONE-2048 y UPONE-1902; hay que recitarlas antes del intake.
- La opción E de D3 queda reemplazada por F.
- No se necesita la excepción de escritura derivada entre mods.
- Las filas con competencia fuera del árbol no se generan por vías gobernadas (M-37): no es un caso de "fuera de diseño".

## Nits

De los nits abiertos de la familia de tributación solo tres tocan 1771 y ya están cubiertos: la escritura genérica sin reglas (D16, fuera de alcance), la unicidad de `isRepresentative` (D8) y el tope de 500 y el reintento (D6). El resto queda fuera de 1771 como lista aparte.
