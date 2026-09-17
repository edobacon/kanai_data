---
id: DOC-kb-sp11-GATE-validacion-estado-fix-core
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - curriculum-design
  - gate
  - validacion
  - fix-core
  - pre-ejecucion
---

# Gate de validación: estado de los fixes de core (pre-ejecución de tickets condicionados)

Sistema de validación para los tickets de los planes cm y cd cuya forma depende del estado de un fix de core (hoy CM-07, CM-09 y CD-07). Esos tickets NO se ejecutan a ciegas: antes de arrancar, quien ejecuta corre este gate para saber si construye el plan seguro (opción mod) o si el ticket se reajusta/elimina porque el fix ya está implementado. Aplica a [Plan cm](PLAN-cm-mcp-ready-opcion-mod) y [Plan cd](PLAN-cd-mcp-ready-opcion-mod).

## Por qué existe
El plan comprometido es la opción mod (se construye asumiendo que el fix de core puede no llegar). Pero dos fixes de core, si aparecen implementados y verificados, cambian algunos tickets. Como el fix "se está solicitando pero debe pasar verificación", no se puede asumir su estado: hay que MEDIRLO al momento de ejecutar. Este gate es esa medición.

## Los dos fixes que se verifican

### Check A — blockGeneric (motor del bloqueo del MCP)
Es el embudo `up1.write` + `assertGenericWriteAllowed` que impide que el asistente escriba por el genérico salteando reglas. CM-09 lo necesita para activar; CD-07 (soft) para que su declaración cobre efecto.

**Cómo verificar (en `up1/mcp`, develop actualizado):**
```bash
git -C /Users/edobacon/Workspace/uplanner/up1/mcp fetch --all --quiet
git -C /Users/edobacon/Workspace/uplanner/up1/mcp ls-tree -r origin/develop --name-only | grep -q "src/contracts/generic-write-block.js" && echo "A: MERGEADO en develop" || echo "A: NO mergeado (sigue en origin/UPONE-1758)"
```
Además de mergeado, "pasó verificación" = suite verde en checkout limpio + review aprobado del equipo de core.

**Estado a 2026-09-14:** NO mergeado. Existe solo en `origin/UPONE-1758`; develop no tiene `generic-write-block.js` ni `up1.write` en graphql-client.js.

### Check B — interceptores componibles en el core (Camino B / object-manager)
Es el cambio estructural que permite que varios mods gobiernen el mismo objeto (reemplaza el dueño único del genérico por una lista de interceptores). Si se implementa, vuelve redundante el bloqueo defensivo del MCP (CM-09) y las tools simples de cm (CM-07), y hace que cd migre su override a interceptores (CD-07).

**Cómo verificar (en `up1/object-manager`, develop):**
```bash
grep -rniE "interceptor|registerInterceptor|composePost|writeInterceptors" \
  /Users/edobacon/Workspace/uplanner/up1/object-manager/src/graphql/resolverIndex.js \
  /Users/edobacon/Workspace/uplanner/up1/object-manager/src/graphql/instance.resolver.js
```
Si aparece un registro/lista de interceptores por (objectType, operación) corriendo dentro de create/update/deleteInstance -> Camino B implementado. Sin resultados -> `Mutation.createInstance` sigue siendo dueño único (Object.assign gana el último) y Camino B NO está.

**Estado a 2026-09-14:** NO implementado. object-manager mantiene el dueño único.

## Matriz de decisión por ticket

### CM-07 (tools simples: alineación + adopción de a una)
| Check B (interceptores core) | Acción |
|---|---|
| Implementado y verificado | **NO construir / retirar CM-07.** El genérico gobernado del core cubre las escrituras de una fila. |
| NO implementado (estado hoy) | **Construir CM-07** (plan seguro). |

### CM-09 (declarar governedObjects de cm + activación del bloqueo)
| Estado | Acción |
|---|---|
| Check B implementado | **Reemplazar CM-09:** no declarar el bloqueo defensivo del MCP; migrar las reglas de cm a interceptores del core (pieza de CM-CORE). |
| Check B NO, Check A mergeado+verificado | **Activar CM-09:** declarar los 10 governedObjects + lockstep (as + cd + gate + checkout limpio). |
| Check B NO, Check A NO (estado hoy) | **No cerrar CM-09 como "seguro" todavía.** Opcional pre-declarar (cm queda read-only seguro por MCP); la activación real espera a que Check A pase verificación. CM-01..CM-08 avanzan igual. |

### CD-07 (declarar genericWriteAllowed de cd + 2 decisiones técnicas)
| Estado | Acción |
|---|---|
| Check B implementado | **Reajustar CD-07:** en vez de declarar genericWriteAllowed (opt-out), migrar el override total de cd a interceptores componibles del core (decisión de diseño: gradual vs override que llama al componedor). |
| Check B NO, Check A mergeado+verificado | **Declarar genericWriteAllowed de los 13** (opt-out), tras resolver las 2 decisiones técnicas (delete sin override, movePlanEntry). |
| Check B NO, Check A NO (estado hoy) | **No declarar todavía:** cd ya es seguro por N0; la declaración es formalización que solo cobra sentido con el motor presente. Resolver las 2 decisiones técnicas igual; CD-01..CD-06 avanzan sin esto. |

## Regla de uso
1. Antes de arrancar CM-07, CM-09 o CD-07, correr los checks correspondientes y registrar el resultado con fecha en el propio ticket (sección "Gate de pre-ejecución").
2. Elegir la acción según la matriz.
3. Si el estado cambia a mitad del sprint, re-evaluar solo estos tickets; el resto del plan no se toca.

## Nota
Los tickets que SOBREVIVEN a cualquier estado del core (CM-01..CM-06, CM-08, CM-10; CD-01..CD-06, CD-08) NO tienen gate: se construyen igual. Solo CM-07, CM-09 y CD-07 están condicionados.
