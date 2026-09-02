---
id: DOC-kb-sp10-UPONE-1758-pre-intake
project: up1
type: doc
module: mcp
tags:
  - sp10
  - mcp
  - curriculum-mapping
  - pre-intake
  - UPONE-1758
  - elric
---

# UPONE-1758 Pre-intake (guia del diagnostico MCP de Curriculum Mapping)

> Material del implementador. **No va a Jira.** Alimenta el intake/diseno posterior. Contrato: `UPONE-1758-detalle`. Fuente de dominio: `sp9/ANALISIS-backend-vs-client-cd-cm-endurecimiento-mcp.md` (Anexo A) y los dos PLAN de sp9.

## Veredicto y superficie

Explore (evaluacion + spike), 5 SP. No se migra codigo productivo: se evalua, se corre un spike acotado sobre el camino critico, y se redactan los tickets de ajuste que ejecutaran despues la extension de `validateCompetencyTree`, el override de `updateInstance` para el gate de publicacion, y `blockGenericMutation` sobre `CompetencyNode`. Superficie tocada por el spike (no por la implementacion final): los resolvers `*Validated` de cm (`logic/helpers/validateCompetencyTree` y `competencyTree-upsert`), y el motor generico del repo `mcp` (para probar `blockGenericMutation`, compartido con UPONE-1757).

## Estado actual del codigo

- **Pack `ai/` de cm:** `mods/curriculum-mapping/ai/index.js` con `tools: []` y 3 contratos de lectura (`LEVEL_SCHEME_CONTRACT`, `COVERAGE_SCHEME_CONTRACT`, `COMPETENCY_NODE_CONTRACT`). Read-only puro; este ticket no lo toca.
- **Backend de cm:** cada escritura pasa por `*Validated` (rediseno M-12). El `CLAUDE.md` del mod prohibe explicitamente que el CRUD generico bypasee esas validaciones; la evaluacion de este ticket confirma donde esta el ultimo hueco conocido (`CompetencyNode` vs bulk-edit) y donde falta cobertura de rubricas.
- **Logica hot client-side a evaluar (del Anexo A de sp9; confirmar file:line al evaluar):** `rubric.ts:138-160,254` y `CompetencyTreeEditorElement.vue:1036` (rubricas sin validar server-side); `rowActions.ts:249` + su `.vue:62` (aviso de alcance sin guardar, a decidir A vs C).
- **Logica que queda client-side (camino C, no se toca):** `useDisplayDecimals.ts:1-30`; `weights.ts:61`.
- **Motor generico:** `mcp/src/tools/register-declarative-tools.js`; `blockGenericMutation` no existe todavia (grep vacio al momento del analisis de sp9, a confirmar en la evaluacion).

## Marco N0..N3 aplicado a cm

Igual clasificacion que UPONE-1757. cm ya esta mayormente en N0 (invariante en el override del generico) y N3 (invariante escalada al resolver) por diseno: la mayoria de sus escrituras no necesitan ajuste. Lo que la evaluacion de este ticket confirma y los tickets de ajuste moveran:

- **Rubricas:** de N0-falso (sin validacion real, solo el frontend valida) a **N3** (la regla pasaria a `validateCompetencyTree`, que ya corre para cualquier escritura).
- **Gate de publicacion:** de declarado-no-enforzado a **N3** (override de `updateInstance`, mismo patron que cd).
- **`CompetencyNode` vs bulk-edit generico:** de N0 con hueco (el invariante RM1 ya esta en el resolver, pero el bulk-edit del core lo puentea) a **N1** (`blockGenericMutation` cerraria el generico y redirigiria a la tool de dominio).

## Como clasificar cada caso

Para cada fila de `## Casos a explorar` del detalle:

1. Confirmar el `file:line` contra el codigo real (no copiar sin verificar del analisis de sp9).
2. Determinar si la regla es invariante de integridad del objeto (camino A: extender `validateCompetencyTree`), un bypass de escritura generica (camino B: `blockGenericMutation`), o presentacion/UX deliberada (camino C: no se toca).
3. Documentar el motivo de la clasificacion citando la regla o el patron que aplica (`CLAUDE.md` del mod, RULE-server-side-logic-mcp-ready, patron cd para gates de transicion).

## Como correr el spike

El spike valida la hipotesis del camino critico antes de comprometer la migracion completa a un ticket de ajuste. Opciones (elegir una, no ambas):

- **Spike sobre camino B:** implementar `blockGenericMutation` de forma minima sobre `CompetencyNode` en un branch de prueba y confirmar que bloquea el bulk-edit generico sin romper la tool de dominio.
- **Spike sobre camino A:** agregar una sola regla de rubrica (por ejemplo, pesos de criterios suman 100) a `validateCompetencyTree` y confirmar que corre para cualquier via de escritura, no solo la del frontend.

El resultado del spike (codigo de prueba, resultado, conclusion) se documenta como evidencia; el spike no se deja mergeado como implementacion final, es la base para el ticket de ajuste correspondiente.

## Hipotesis a validar

- **H1:** las reglas de rubrica no tienen validacion server-side (solo en `rubric.ts`). _Validacion: grep en `logic/` de cm antes de clasificar el caso como A._
- **H2:** el bulk-edit generico del core puede puentear la unicidad de codigo de `CompetencyNode` sin `blockGenericMutation`. _Validacion: reproducir el flujo del generico en el spike, antes y despues de la prueba de `blockGenericMutation`._
- **H3:** el gate de publicacion no tiene ningun enforcement hoy (solo doc). _Validacion: revisar `enforceEnumTransitions` y confirmar que no invoca logica del mod para `CompetencyMatrix`._

## Como redactar los tickets de ajuste

Cada ticket de ajuste que resulte de la clasificacion debe incluir:

- El caso o los casos que cierra (con `file:line` confirmado).
- El camino (A o B) y el patron a seguir (extender `validateCompetencyTree` con el mismo estilo de retorno de errores existente; o declarar `blockGenericMutation` en el contrato del objeto, compartido con UPONE-1757).
- El criterio MCP (RULE-server-side-logic-mcp-ready) como motivacion.
- La cita de la regla local del mod (`CLAUDE.md` de cm) como el criterio que el ajuste cierra.
- Referencia a este ticket y al spike que valido el enfoque.

No redactar un ticket de ajuste unico para todos los casos A: separar por afinidad (rubricas vs gate de publicacion) si el tamano lo justifica, para que cada ticket de ajuste sea acotado y estimable.

## Consideraciones de implementacion (para los tickets de ajuste, no para este)

- Evaluar cada caso contra codigo real antes de tocarlo: cm es el caso "casi todo server-side", el riesgo es duplicar una regla que el resolver ya cubre en otro punto.
- `blockGenericMutation` es la misma pieza que UPONE-1757: coordinar el orden de ejecucion para no implementarla dos veces ni divergir en su forma.
- La matriz en escritura por MCP espera al backend (B5): los tickets de ajuste no la exponen, solo dejan el criterio de entrada documentado.
- Al extender `validateCompetencyTree`, mantener el mismo estilo de retorno de errores que las validaciones existentes (para que el frontend siga pudiendo mostrar los mismos mensajes sin reescribir su capa de UX).

## Decisiones tecnicas abiertas (las resuelve el dev en la fase de evaluacion)

- "Alcance sin guardar" invariante (A) vs UX advisory (C).
- Que spikear: camino A o camino B (ver `## Como correr el spike`).
- Momento de exponer la matriz en escritura por MCP (queda como criterio de entrada, no se resuelve en este ticket).

## Archivos candidatos (a evaluar y, segun el caso, referenciar en los tickets de ajuste)

- Frontend cm (fuente de la logica a evaluar, no se borra sin validar server-side primero): `rubric.ts`, `CompetencyTreeEditorElement.vue`, `rowActions.ts` (+ su `.vue`).
- Frontend cm (queda igual, camino C): `useDisplayDecimals.ts`, `weights.ts`.
- Backend cm a evaluar/spikear: `logic/helpers/validateCompetencyTree`, `competencyTree-upsert` (conectar el tramo de `dimensions`), override de `updateInstance` de la matriz (gate de publicacion).
- Repo `mcp`: `src/tools/register-declarative-tools.js` (motor) y el contrato de `CompetencyNode`, para el spike de `blockGenericMutation` (compartido con UPONE-1757).
