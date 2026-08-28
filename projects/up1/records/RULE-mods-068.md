---
id: RULE-mods-068
project: up1
type: rule
module: mods
tags:
  - academic-scheduling
  - concurrency
  - prisma
  - performance
  - cascade
---

# Toda operacion en cascada sobre colecciones usa un limitador de concurrencia, nunca `Promise.all` directo

## What

Cuando una operacion abre una consulta a Prisma por cada elemento de una coleccion (secciones,
pares de asignacion, candidatos a evaluar), el recorrido MUST usar un limitador de concurrencia con
tope fijo, nunca `Promise.all(items.map(fn))` sin acotar.

## Why

Un `Promise.all` sin tope lanza todas las consultas a la vez; el pool de conexiones de Prisma por
tenant es finito, y saturarlo con decenas de consultas paralelas degrada TODO el tenant, incluidas
mutaciones ajenas al modulo que dispara la cascada. Esto no es teorico: causo un incidente real de
produccion en el cliente Continental el 2026-08-13, con ReadTimeouts de 30 segundos por saturacion
del pool durante el recalculo de conflictos de seccion. El propio codigo del fix se autoclasifica
como "misma clase de bug que UPONE-1595" (el ranking de instructores por-uno tuvo el mismo patron
antes, en la misma ventana).

Evidencia verificada: `academic-scheduling/logic/schedule/conflictDetail.js:36-79` implementa
`mapWithConcurrency`, un `map` asincrono que preserva el orden de resultados y admite a lo sumo
`limit` invocaciones en vuelo, con `RECOMPUTE_CONCURRENCY = 6` declarado en la linea 53. El propio
comentario del codigo documenta el calculo: el tope cuenta invocaciones de `fn`, no consultas
(cada recalculo mantiene ~2-3 consultas en vuelo por sus `Promise.all` internos), asi que el maximo
efectivo es ~18 consultas concurrentes, bajo el limite de 20 conexiones por pod del pool en
dev/staging.

Tickets: UPONE-1614 (recalculo de conflictos con incidente en produccion), UPONE-1595 (ranking de
instructores/recursos, mismo patron detectado antes en la misma ventana).

## Where

- `mods/academic-scheduling/logic/schedule/conflictDetail.js` (implementacion canonica de
  `mapWithConcurrency`, a reusar en vez de reimplementar el limitador en otro archivo del mod).
- Cualquier resolver o helper del mod que recorra secciones, asignaciones o pares candidato-a-candidato
  con una consulta a Prisma por elemento.

## When

Al escribir o revisar codigo que itera una coleccion abriendo una query por item (recalculo de
conflictos, ranking de candidatos, cualquier "para cada X, consultar Y"). Si la coleccion puede
crecer con el uso real del tenant (no un puñado fijo y chico), el limitador no es opcional.
