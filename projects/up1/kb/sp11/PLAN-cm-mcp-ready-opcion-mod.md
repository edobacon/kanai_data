---
id: DOC-kb-sp11-PLAN-cm-mcp-ready-opcion-mod
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - plan
  - opcion-mod
  - tickets
  - mcp-readiness
  - detective-mode
---

# Plan de trabajo cm MCP-ready (opción mod) — índice de tickets CM-01..CM-10

Plan de trabajo COMPROMETIDO para llevar curriculum-mapping (cm) a MCP-ready por la **opción mod (Camino A)**: cada mod se resuelve solo, sin tocar el motor del MCP ni el core. Es el plan seguro. El fix de core (embudo `up1.write` + `governedObjects`, rama `origin/UPONE-1758`) queda CONSIDERADO pero NO bloqueante: se está solicitando y debe pasar verificación, así que se construye todo asumiendo que puede no llegar este sprint. Cada ticket lleva su nota de reajuste por si el fix de core aparece implementado. Verificado contra código real (file:line).

> **Estado de elaboración (bloques 1-3 completos):** los 10 tickets están detallados a nivel contrato (las 16 secciones de detective-mode), cada uno con su `detalle`, su `pre-intake` y su evidencia de `aduana`. Aduana: todos `todo-mod-only`, salvo CM-09 (mod-only + dependencias externas de activación) y con la nota de que CM-07 y CM-09 se eliminan/simplifican si se implementa el core. Se verificó además que el motor del MCP soporta tools de lectura de dominio de forma nativa (`ToolDescriptor.operation: "query"`, up1/mcp/src/mods/types.js:14), lo que dejó CM-01 mod-only puro.

Documentos hermanos de sp11 que este plan consolida: "Matriz MCP-readiness cm y cd", "Ticket cm auto-gobierno (Camino 1)", "El arreglo en el core", "Reporte del fix de blockGeneric", "Solicitud a academic-scheduling", "cm vs cd comparativo para el PO".

## 1. Marco y principio rector

- **Plan comprometido = Camino A (mod).** Se construye completo asumiendo que el fix de core puede no llegar.
- **El fix de core es base, no bloqueo.** Aporta UNA sola de las 5 dimensiones de MCP-ready (escritura segura). El resto (tools, integridad, lectura, guía) usa las mutations `*Validated` por `up1.request()` y es independiente del fix.
- **Consecuencia de orden:** el mod se vuelve OPERABLE por el asistente (usable) antes que BLINDADO (seguro). Construir tools primero NO agrega riesgo: el CRUD genérico ya está abierto hoy y solo lo frena RBAC.
- **Notas de reajuste por ticket:** SOBREVIVE (se construye igual) / SE SIMPLIFICA o SE ELIMINA (si el core se implementa).

## 2. Las 5 dimensiones de MCP-ready (cobertura del plan)

1. **Escritura segura** (que el asistente no escriba salteando reglas) → CM-09 (fix-gated).
2. **Escritura completa** (todas las operaciones de dominio invocables) → CM-02..CM-07 (las 22 mutations `*Validated`).
3. **Integridad** (no hay reglas solo en cliente) → CM-05 (gap B.4 + levelId).
4. **Lectura** (leer el estado agregado para decidir qué escribir) → CM-01.
5. **Guía** (contratos/fieldDocs) → contratos dentro de CM-02..CM-07 + CM-08 (deuda documental).

Estado de partida (matriz de readiness): cm ~27% MCP-ready. El cuello real es lectura (~15%) y escritura segura (0%).

## 3. Plan seguro (comprometido, opción mod) — tickets en orden

Cada fila enlaza a su contrato completo (detalle), que a su vez enlaza a su pre-intake y su aduana.

| # | Ticket | Dimensión | ¿Necesita el fix? | SP | Nota mejor escenario (si core) |
|---|---|---|---|---|---|
| [CM-01](CM-01-lectura-dominio) | Lectura de dominio (6 queries) | Lectura | No | 2-4 | SOBREVIVE |
| [CM-02](CM-02-escala-desempeno) | Escala de desempeño al MCP | Escritura completa | No | 1.5-2 | SOBREVIVE (compuestas) |
| [CM-03](CM-03-niveles-desarrollo) | Niveles de desarrollo al MCP | Escritura completa | No | 1.5-2 | SOBREVIVE (compuestas) |
| [CM-04](CM-04-matriz-cabecera-medicion) | Matriz: cabecera + medición + estado | Escritura completa | No | 1.5-2 | SOBREVIVE (compuesta) |
| [CM-05](CM-05-matriz-arbol-rubrica-b4) | Matriz: árbol + rúbrica + B.4 | Escritura completa + Integridad | No | 3-4 | SOBREVIVE (compuesta + B.4 resolver propio) |
| [CM-06](CM-06-matriz-adopcion-masiva) | Matriz: adopción (masiva) | Escritura completa | No | 2-3 | SOBREVIVE (compuestas) |
| [CM-07](CM-07-tools-simples) | Tools simples (alineación + adopción 1 fila) | Escritura completa | No | 1-2 | SE ELIMINA (el genérico gobernado del core las cubre) |
| [CM-08](CM-08-guia-deuda-documental) | Guía + deuda documental | Guía | No | 1-2 | SOBREVIVE |
| [CM-09](CM-09-escritura-segura-governedobjects) | Escritura segura: declarar los 10 + activación coordinada | Escritura segura | SÍ (lockstep) | 1-2 + coord | SE ELIMINA (el override componible del core reemplaza el bloqueo del MCP) |
| [CM-10](CM-10-huecos-server-rm7-rp5) | Huecos server RM7/RP5 (decisión PO) | Calidad de datos | No | 2-4 | SOBREVIVE |

Total del núcleo comprometido (CM-01..CM-09): ~15 a 23 SP. CM-10 opcional.

## 4. Orden de ejecución (sin depender del fix)

1. **CM-01** primero: es el cuello real y valida todo lo demás (leer para decidir qué escribir).
2. **CM-02 + CM-03**: los mantenedores de botones, arranque acotado del alcance de sp11.
3. **CM-04 → CM-05 → CM-06**: la matriz central (respetar las 2 dependencias de orden: crear matriz antes de árbol/adopción; elegir escala antes del árbol).
4. **CM-07 + CM-08** en paralelo cuando haya hueco.
5. **CM-09** se dispara cuando el fix pase verificación (puede ir antes, dejando cm read-only seguro, o junto con las tools ya construidas).
6. **CM-10** a decisión del PO.

## 5. Plan "mejor escenario" (si el fix de core aparece verificado)

No se rehace nada de lo construido; solo se reajustan tres puntos:
- **CM-07 no se construye** (o se retira): el genérico gobernado del core cubre las escrituras de una fila.
- **CM-09 se reduce**: el bloqueo defensivo del MCP deja de hacer falta. En su lugar aparece **CM-CORE** (migrar las reglas de cm a interceptores componibles), que además cierra el cross-client (API directo + bulk-edit), la única vía que el plan mod deja abierta.
- **CM-01..CM-06, CM-08, CM-10 quedan iguales.**

**Decisión de timing (para no pagar dos veces):** definir si se hará el core ANTES de construir CM-07. Si en ese momento el core no está verificado, se construye CM-07 igual (plan seguro); si ya está, se saltea.

## 6. Lo que el plan mod NO cierra (límite conocido)

El Camino A deja cm seguro y usable POR EL ASISTENTE, pero NO cierra el cross-client: API/GraphQL directo y el bulk-edit de la Suite siguen pudiendo escribir los objetos de cm salteando sus 62 reglas (hoy lo frena solo RBAC, "riesgo asumido"). La única forma de cerrarlo es el arreglo en el core (CM-CORE, follow-up estructural). Si la regla `RULE-server-side-logic-mcp-ready` (ninguna vía debe saltear) se exige de forma dura, CM-CORE pasa de opcional a requisito.

## 7. Nomenclatura

Los identificadores CM-01..CM-10 son internos de ESTE proceso de planificación. No llevan código de Jira todavía; cuando se creen los issues nativos se mapeará cada CM-xx a su clave UPONE-xxxx.
