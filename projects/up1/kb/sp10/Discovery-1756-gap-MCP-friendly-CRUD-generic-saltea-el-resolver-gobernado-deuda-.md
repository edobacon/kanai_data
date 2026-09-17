---
id: DOC-kb-sp10-Discovery-1756-gap-MCP-friendly-CRUD-generic-saltea-el-resolver-gobernado-deuda
project: up1
type: doc
module: curriculum-mapping
tags:
  - tributacion
  - CompetencyAlignment
  - MCP-friendly
  - core-extension
  - deuda
  - discovery
  - intake-futuro
  - UPONE-1756
---

# Discovery 1756: gap MCP-friendly (CRUD generic saltea el resolver gobernado) — deuda aceptada

Discovery de la ejecución de UPONE-1756 (TICKET-143, sesión 1). Deuda aceptada por el equipo; a cubrir en un ticket siguiente según alcance de sprint. Material de intake para ese ticket.

## El gap

El criterio MCP-friendly del sprint pide que ninguna vía de escritura (UI, API, MCP) saltee las reglas de negocio, porque todas pasan por el mismo resolver gobernado. Verificado en ejecución: **no se cumple a nivel plataforma**.

- El MCP de up1 escribe `CompetencyAlignment` por el **CRUD generic del core**: `up1_create_object`/`up1_update_object` → `createInstance`/`updateInstance` (`instance.resolver.js`), gateado **solo por `withObjectAuth`** con la capability object-level (`competencyalignment:create/modify/delete`).
- Esas caps las tienen los roles curriculares, y la **misma cap habilita las dos vías**: la gobernada (`*Validated`, con R-1..R-5/R-10 + derivación de `planId`) y la generic (que **saltea** todas esas reglas; solo R-2 la atrapa la unique de DB).
- No existe mecanismo de core para declarar un objeto "gobernado-only" y bloquear su escritura generic. La regla del mod ("escritura gobernada; el CRUD generic no aplica") es hoy una **convención**, no un enforcement.

## Estado en 1756 (deuda aceptada)

- 1756 entrega el enforcement completo **por la vía gobernada** (todas las reglas ahí, verde). Frontera todo-mod-only: cerrar el gap es de **core/plataforma**, fuera de 1756.
- Se acepta como **deuda**. Mitigación vigente: no otorgar las caps de escritura fuera de los roles curriculares previstos.
- Test que documenta el hueco: `mods/curriculum-mapping/tests/unit/competencyAlignmentParity.test.js`, grupo "GAP" (el resolver rechaza un payload hostil; un write directo/generic lo acepta).

## Qué cubrir en el ticket siguiente

Elegir la vía de cierre:
1. **Core Extension** (recomendado): que el core soporte declarar un objeto como "gobernado-only" y **bloquee la escritura generic** (`createInstance`/`updateInstance`) de esos objetos, redirigiendo o rechazando; así cualquier vía (UI genérica, MCP) que no pase por el resolver gobernado se rechaza. Es una capacidad que otros mods con escritura gobernada también necesitan → fits Core Extension (flujo de aduana).
2. Alternativa: que el MCP de up1 exponga y use la **mutation gobernada** para estos objetos en vez del CRUD generic (cambio en el server MCP), y que la UI generic quede bloqueada por (1).

## Casos de prueba a incorporar

- Escritura de `CompetencyAlignment` por la vía generic (up1_create_object / createInstance) con un payload que viola R-1 (sin adopción vigente), R-3 (nodo que consolida), R-4 (nivel no declarado) o R-5 (contributionType inválido) → **se rechaza**, igual que por la mutation gobernada. (Hoy: se acepta.)
- Escritura generic con `planId` del cliente que contradice el `planEntry.planId` → se ignora/deriva o se rechaza (paridad con REQ-01). (Hoy: entra el valor del cliente o null.)
- El grupo "GAP" de `competencyAlignmentParity.test.js` debe pasar de "documenta el hueco" a "verifica el rechazo por la vía generic".

## Traza
- Deuda registrada como learn en TICKET-143 (1756).
- Frontera: cierre es core/plataforma (no mod-only), candidato Core Extension.
