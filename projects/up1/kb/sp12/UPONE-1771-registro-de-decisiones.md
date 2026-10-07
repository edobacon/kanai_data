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

> Registro vivo de las decisiones tomadas sobre UPONE-1771 (indicadores y versionado del plan). Lo tomado el 2026-10-07 reemplaza lo que digan el detalle y el pre-intake de esta carpeta (versión 2, del 2026-10-06) donde se contradigan. Los documentos hermanos son `UPONE-1771-detalle` y `UPONE-1771-pre-intake`; el tablero visual de decisiones es un artefacto aparte.

## Decididas

| # | Decisión | Fecha | Notas |
|---|---|---|---|
| D1 | Solo mod, sin Core Extension. La elección se hace al versionar con un modal propio de cd (acción de crear con modal pre-llenado hacia un layout propio, cuyo `customEndpoint` llama a una mutation propia de cd) | 2026-10-07 | La mutation fija la bandera de versión y, como llama a la creación genérica sin pasar por el override de cd, debe invocar por su cuenta la herencia de la extensión del plan |
| D2 | Un solo ticket de Jira (UPONE-1771) ejecutado como dos tickets de Kanai: A indicadores, B versionado | 2026-10-07 | El motivo es la calidad de contextos limpios y acotados, no el costo. Los datos de UPONE-1770 muestran que partir no abarata el costo total |
| D3 y D20 | **Opción F.** El versionado sigue el flujo normal y nace sin tributación. Quien tiene los permisos de tributación (`competencyalignment:create` y `competencynode:adopt`) puede optar por llevar el mapa. Sin esos permisos no se ve la opción. No hay autorización derivada: nadie escribe tributación sin permiso propio. Se mantiene la acción de recuperación "replicar desde la versión anterior" | 2026-10-07 | Reemplaza a la opción E ("replicar por defecto con autorización derivada") que se había confirmado antes. La opción exige `adopt` además de `create` porque la v2 nace sin adopción de matriz |
| D4 | La lógica de réplica vive en cm. cd la invoca desde su servidor (mutation del modal) y la acción de recuperación la usan la pantalla y una ficha MCP | 2026-10-07 | Con F la invocación se hace con los permisos del propio usuario. Importar archivos de cm y escribir por acceso directo quedan descartados |
| D5 | El permiso que gobierna la elección es `competencyalignment:create` | 2026-10-06 | Se comprueba además `competencynode:adopt` en servidor |
| D7 | **Opción B.** Poblar `planEntry.sourceEntryId` con la entrada de origen al versionar, con respaldo por asignatura (plan + asignatura) cuando el vínculo falte | 2026-10-07 | Pendiente de verificar el efecto en el borrado de planes versionados y si el vínculo debe quedar en el historial (DataLog). Es el primer consumidor del campo, que quedó en nulo por decisión de UPONE-1450 (sin consumidor real) |
| D12 | La operación de réplica adopta las mismas matrices en la v2 | 2026-10-06 | Solo las adopciones vigentes (ver D19) |
| D13 | Se acepta que la réplica por MCP escriba tributación, atribuida y auditada a nombre de quien versiona | 2026-10-06 | Con F queda más simple: la hace un agente con los permisos de la persona, sin excepción |
| D19 | **Opción A.** En la recuperación se adopta solo si falta la adopción | 2026-10-07 | Consecuencia aceptada: la adopción copiada nace con origen `Explicit` (ver detalle en el chat). Solo se copian adopciones vigentes; no se copian exenciones ni cerradas |

## Pendientes

**Del dev**
- D20 (fuera de decisión de F): ¿el aviso al publicar una v2 sin tributación cuando la v1 sí tenía va dentro o fuera de 1771? Es una regla nueva; hoy el guard de suma solo actúa si hay filas.
- Retirar el worktree `mods/.nits-v2-wt` y sus dos carpetas generadas, y repetir el sync del MCP.

**Del PO**
- D8: nivel representativo (marcado y obligatorio, o último nivel como respaldo).
- D9: qué cuenta como "fuera de diseño".
- D10: indicadores en la lectura del plan y en el componente.
- Qué adopciones replicar (solo vigentes, que es la propuesta, u otras).
- Tamaño máximo real de tributaciones por plan y matriz (el tope por guardado es 500).
- Corregir el criterio de aceptación del ticket: "sin ese permiso, se replica por defecto" deja de aplicar con F.

**Se resuelven dentro del intake**
- D6 (reintento e idempotencia), D11 (ficha MCP de versionado sobre la misma mutation de cd), D14 a D18.
- Validaciones: capabilities de cm en roles que no sean Admin ni Consultor, pestaña gateada dentro de un modal de crear, uso del campo de revelado para el informe.

## Correcciones al detalle y al pre-intake de esta carpeta

- `isRepresentative` sí tiene lectores (cd y cm); lo que no tiene es escritor.
- El selector de asignatura en solo lectura ya está resuelto (commit `43128a5`).
- Las líneas citadas quedaron desplazadas tras UPONE-2048 y UPONE-1902; hay que recitarlas antes del intake.
- La opción E de D3 queda reemplazada por F.
- No se necesita la excepción de escritura derivada entre mods.

## Nits

De los nits abiertos de la familia de tributación solo tres tocan 1771 y ya están cubiertos: la escritura genérica sin reglas (D16, fuera de alcance), la unicidad de `isRepresentative` (D8) y el tope de 500 y el reintento (D6). El resto queda fuera de 1771 como lista aparte.
