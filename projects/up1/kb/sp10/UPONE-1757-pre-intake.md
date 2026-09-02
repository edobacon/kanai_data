---
id: DOC-kb-sp10-UPONE-1757-pre-intake
project: up1
type: doc
module: mcp
tags:
  - sp10
  - mcp
  - curriculum-design
  - pre-intake
  - UPONE-1757
  - elric
---

# UPONE-1757 Pre-intake (guia del diagnostico MCP de Curriculum Design)

> Material del implementador. **No va a Jira.** Alimenta el intake/diseno posterior. Contrato: `UPONE-1757-detalle`. Fuente de dominio: `sp9/ANALISIS-backend-vs-client-cd-cm-endurecimiento-mcp.md` y los dos PLAN de sp9.

## Veredicto y superficie

Evaluacion + spike (explore), 8 SP. No se migra codigo productivo: se clasifica cada uno de los 22 casos hot-en-client por camino (A/B/C), se spikea el camino de mayor riesgo para confirmar factibilidad, y se redactan los tickets de ajuste que ejecutan la migracion real en un sprint posterior. Superficie: lectura del frontend de cd (para confirmar file:line de cada caso), lectura de los resolvers de cd y el pack `mods/curriculum-design/ai/` (para confirmar estado server-side), y una prueba acotada (spike) sobre el camino critico elegido, sin dejar el cambio en produccion salvo que el spike mismo se decida promover como parte del ajuste.

## Estado actual del codigo

- **Pack `ai/` de cd:** `mods/curriculum-design/ai/tools.js` con 4 fichas; `ai/index.js:36` declara `notExposed` (curriculos, malla salvo batch de planEntry, bibliografia, programas, silabos, cadena de versiones). Cero `registerExtra`, cero bloqueo del generico.
- **Logica hot client-side (del analisis sp9, seccion 4.1; confirmar file:line al evaluar):** `curriculumMesh.logic.ts:362` (plan Draft), `activityPicker.logic.ts:17` (unicidad planId+activityId), `deletionImpact.logic.ts:238` (impacto de borrado), `prereqCheck.logic.ts:41` (pre-check de prerrequisitos), `meshPrereqScan.logic.ts:49`, `deriveLevel.logic.ts:100`, `recalcPeriodPosition.logic.ts:76`, `guidedAdd.logic.ts:50`, `editEntryModal.logic.ts:71`, `blockSelect.logic.ts:29`, `RichTextRenderer/sanitizeHtml.ts`.
- **Server-side ya cubierto (no requiere evaluacion, solo confirmar que sigue asi):** modalidad, arbol de evaluacion, publicar Activity, linea de formacion, curriculo (unicidad linaje), perfil de egreso singleton, requisitos, prerrequisitos, alta/baja en lote (`planEntry-batch:90-135`), estado, RBAC objeto-nivel.
- **Brechas parciales a confirmar (no a corregir aca):** R0 (`curriculum-update:112`, `RT_PATTERN:207` no cubre curriculum), R1 (`syllabus-offering.resolver.js` sin `withObjectAuth`).
- **Motor generico:** `mcp/src/tools/register-declarative-tools.js`; `blockGenericMutation` no existe (grep vacio). Se evalua/spikea aca por primera vez; la implementacion definitiva, compartida con UPONE-1758, va al ticket de ajuste.

## Marco de clasificacion (N0..N3) para evaluar cada caso

- **N0:** nada; el invariante ya vive en el override del generico. Estado actual de los objetos de cd.
- **N1:** `blockGenericMutation` sobre el objeto gobernado (resolver `*Validated` separado). No aplica hoy a cd (sus objetos estan en N0); si algo cae aca durante la evaluacion, se declara para el ticket de ajuste.
- **N2:** tool custom que replica la regla + bloqueo del generico. Interino: se evalua como opcion si una regla de malla queda para un ajuste posterior y hace falta exponerla por MCP antes de escalarla al resolver (decision del ticket de ajuste, no de esta evaluacion).
- **N3 (preferido):** escalar el invariante al resolver del mod. Es el camino A: mueve la regla de malla del cliente al resolver, y hace innecesario N1/N2 para esa regla. La confirmacion de que un caso es N3 se hace en esta evaluacion; la migracion en si va al ticket de ajuste.

## Como correr el spike del camino critico

1. Elegir el camino critico a spikear entre las opciones abiertas (`blockGenericMutation` sobre un objeto gobernado de cd, o escalar una regla de malla al resolver, ej. impacto de borrado). Ver decisiones abiertas.
2. Si se spikea escalar una regla al resolver:
   - Ubicar el resolver de `planEntry` que ya corre para create/update/delete (`planEntry-batch.js` y equivalentes single).
   - Portar la condicion desde el `.logic.ts` del cliente como guard server-side, en una rama de spike (no mergear a develop sin decision del ticket de ajuste).
   - Verificar con una prueba manual que el generico (`up1_update_object`/`up1_delete_object`) tambien pasa por el resolver (no lo puentea).
3. Si se spikea `blockGenericMutation`:
   - Identificar un objeto gobernado de cd (o el candidato mas probable) cuyo invariante viva en un resolver que el generico pueda saltear.
   - Implementar el mecanismo minimo en una rama de spike sobre `mcp/src/tools/register-declarative-tools.js`.
   - Confirmar con una prueba que `up1_update_object` sobre el objeto se rechaza y redirige a la tool de dominio.
4. Documentar el hallazgo: funciona segun lo esperado, funciona con ajustes (cuales), o no es viable (por que) y que alternativa queda para el ticket de ajuste.

Precedente de `registerExtra` (para los casos B, si se decide N2 interino en algun ticket de ajuste): `mods/academic-scheduling/ai/rule-value-upsert.js` (`as_set_rule_value`), custom-logic aislada en `ai/`, sin importar nada del core por ruta relativa, todo llega por `ctx`.

## Analisis de enfoques (por caso, no global)

Para cada caso de `## Casos a explorar` del detalle, la evaluacion decide camino y lo deja escrito en el ticket de ajuste correspondiente:

- **A (escalar al resolver):** invariante de dominio. Preferido; deja la regla valida por cualquier via (UI, API, MCP). Casos 1-11 y 18-19 son candidatos A.
- **B (ficha / `registerExtra` + `blockGenericMutation`):** cuando la operacion no es un simple upsert (saga, tree-op) y hay que exponerla por MCP antes de que exista el resolver. Precedente `academic-scheduling/ai/rule-value-upsert.js`. Casos 12-17 son candidatos B.
- **C (queda client-side):** UX/presentacion (ej. derivacion de nivel modular como ayuda visual, recalculo de period/position como comodidad de UI) si el analisis confirma que no es invariante. Casos 8-10 se evaluan entre A y C.

## Hipotesis a validar

- **H1 (equivalente server-side):** las reglas de malla (casos 1-11) siguen sin equivalente server-side hoy. _Validacion: grep de cada regla en `logic/` de cd; si alguna ya migro, se ajusta la clasificacion en el ticket de ajuste correspondiente._
- **H2 (bypass del generico):** exponer una escritura gobernada de cd por el generico sin `blockGenericMutation` saltea su resolver `*Validated`, cuando ese resolver existe separado del override. _Validacion: revisar el flujo del generico en el repo mcp contra el resolver real de cada objeto candidato; confirmar o descartar con el spike si este es el camino elegido._
- **H3 (Core Extension sin enforcement):** `requiresComment` no se enforza en el motor de transiciones. _Validacion: leer `enforceEnumTransitions` y `activity.resolver.js:29`. Confirma que el caso 21 queda Fuera (Core Extension, no ticket de ajuste de mod)._

## Como redactar los tickets de ajuste resultantes

- Un ticket (o mas) para los casos camino A: alcance limitado a escalar cada regla de malla confirmada al resolver del mod, con su prueba de que el generico ya no la puede saltear. Referenciar el caso, el `file:line` del cliente y el destino en el resolver.
- Un ticket para los casos camino B: alcance limitado a las fichas/`registerExtra` necesarias en `mods/curriculum-design/ai/`, mas `blockGenericMutation` sobre los objetos que correspondan (coordinar con UPONE-1758 para no duplicar el mecanismo).
- Los fixes R0 y R1 pueden ir en el mismo ticket de ajuste A o en uno propio, segun prioridad: son puntuales sobre codigo ya server-side del mod.
- Los casos Core Extension (21, 22) no se redactan como ticket de ajuste de mod: se dejan como hallazgo a coordinar con el equipo de core.
- Cada ticket de ajuste debe indicar: caso(s) que cubre, camino (A/B), archivos origen y destino, y criterio de aceptacion verificable (una prueba que la regla ya no se puede saltear).

## Decisiones tecnicas abiertas (las resuelve el dev/intake)

- Que camino critico spikear: `blockGenericMutation` sobre un objeto gobernado de cd, o escalar una regla de malla al resolver.
- Como se agrupan los casos camino A en tickets de ajuste (uno por regla, o un ticket que cubra el conjunto de malla).
- Interino N2 (tool custom + bloqueo) vs esperar el resolver (N3) para las reglas de malla que el ticket de ajuste no priorice de entrada.
- Prioridad relativa de los Core Extensions (`requiresComment`, enum `RecordType`) frente al resto del backlog de plataforma.

## Archivos candidatos

**Lectura/evaluacion (esta base, no se modifica):**

- Frontend cd: `curriculumMesh.logic.ts`, `activityPicker.logic.ts`, `deletionImpact.logic.ts`, `prereqCheck.logic.ts`, `meshPrereqScan.logic.ts`, `deriveLevel.logic.ts`, `recalcPeriodPosition.logic.ts`, `guidedAdd.logic.ts`, `editEntryModal.logic.ts`, `blockSelect.logic.ts`, `RichTextRenderer/sanitizeHtml.ts`.
- `mods/curriculum-design/ai/` (pack): lectura para confirmar que fichas existen y cuales faltan.
- `logic/` de cd (resolvers de `planEntry` y equivalentes): lectura, incluye `curriculum-update.js` (R0) y `syllabus-offering.resolver.js` (R1).
- `object-manager` (motor de transiciones): lectura, para confirmar que `requiresComment` y el enum de `RecordType` quedan Fuera (Core Extension).
- Repo `mcp`: `src/tools/register-declarative-tools.js` (motor generico), lectura para confirmar que `blockGenericMutation` no existe.

**Spike (cambio acotado, en rama aparte, no a mergear sin decision del ticket de ajuste):**

- El resolver de `planEntry` elegido para el spike de camino A, o `mcp/src/tools/register-declarative-tools.js` para el spike de `blockGenericMutation`.

**Modificacion real (queda en los tickets de ajuste que este ticket produce, no en esta base):**

- Los mismos resolvers de cd (destino de camino A) y `mods/curriculum-design/ai/` (destino de camino B), esta vez para implementar en firme, no solo spikear.
