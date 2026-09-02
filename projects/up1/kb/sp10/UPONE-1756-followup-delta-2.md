---
id: DOC-kb-sp10-UPONE-1756-followup-delta-2
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - UPONE-1756
  - followup
  - delta
  - f6
---

# UPONE-1756 Follow-up delta 2 (outcomeAlignment F6 + retiro R-7)

> **Referencia externa:** por asignar (delta 2 del follow-up de UPONE-1756). **Tipo:** implement · **Epica:** UPONE-1452 · **Asignado:** por definir · **Story Points:** 8
>
> Ultimo tramo del feature de tributacion: el refinamiento a nivel de resultado de aprendizaje y el retiro seguro que depende de el.

## Objetivo
`outcomeAlignment` (F6) y el retiro con aviso de dependientes (R-7).

## Alcance
**Dentro:**
1. **`outcomeAlignment` (F6):** refinamiento de la tributacion a nivel de resultado de aprendizaje, operado desde el Programa de Asignatura.
2. **Retiro con aviso R-7:** al retirar una tributacion que sostiene alineaciones de resultados de aprendizaje, nombrarlas y que el usuario decida. **Depende de F6** (antes de F6 no hay dependientes; el retiro simple ya va en `UPONE-1756-alcance-sp10`).

## Criterios de aceptacion (checkeables)
- [ ] Existe `outcomeAlignment` operable desde el Programa de Asignatura.
- [ ] Retirar una tributacion que sostiene RA nombra los dependientes y pide confirmacion (R-7).

## Definition of Done (checkeable)
Aplica el estandar DoR/DoD. Ademas:
- [ ] R-7 verificado (nombra dependientes) en runtime.
- [ ] **Conexion MCP a nivel de servicios:** logica en el resolver, no en el cliente.

## Frontera core/mod (Aduana)
`todo-mod-only`.

## Estimacion (calibrada)
`Esfuerzo: Mayor · Sensibilidad: Media`. F6 es una capa nueva de refinamiento. **Total: 8 SP.**

## Dependencias
- Sobre `UPONE-1756-followup` y sus deltas; el retiro R-7 depende de que exista F6 (este mismo ticket).

## Referencias
- Base: `UPONE-1756-followup`. Feature completo: `UPONE-1756-detalle-po`. El retiro simple: `UPONE-1756-alcance-sp10`.
