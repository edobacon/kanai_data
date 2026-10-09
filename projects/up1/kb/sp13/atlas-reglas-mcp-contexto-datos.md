---
id: DOC-kb-sp13-atlas-reglas-mcp-contexto-datos
project: up1
type: doc
module: mcp
tags:
  - sp13
  - mcp
  - atlas
  - herramienta-dev
  - mcp-readiness
  - datos
  - sp11
---

# Atlas de reglas del MCP: contexto y datos verificados

Contexto y datos que sostienen la idea del atlas de reglas. El plan, las fases y las decisiones abiertas están en el documento "Atlas de reglas del MCP: idea, plan y decisiones abiertas", en esta misma carpeta.

Los números salen de una corrida de prueba de solo lectura sobre el código de `up1/mods` y `up1/mcp` (9 de octubre de 2026). No es una herramienta entregada: son sondas desechables que se usaron para verificar que la idea mide algo real.

## Qué MCP es el vivo

Hay dos bases de código con el mismo nombre en la máquina del dev:
- **Elric** (`uplanner/mcp`): TypeScript, stdio, sin remoto git, último commit el 18 de agosto de 2026, packs cd, eng y view.
- **up1/mcp** (el vivo): JavaScript, HTTP con OAuth (Clerk), Docker, fichas declarativas. Remoto `git@bitbucket.org:uplanner/mcp.git`, rama `develop`. Mods: curriculum-design, curriculum-mapping, academic-scheduling. El repositorio up1 lo ignora (`mcp/` en su `.gitignore`).

La primera muestra del atlas se armó sobre Elric y el dev la corrigió: el contrato vivo es el de up1/mcp. Todo lo que sigue es de up1/mcp.

## Dónde viven contratos y tools

- Origen: `mods/<mod>/ai/{contracts.js,tools.js,index.js}` en cada mod.
- `mcp/scripts/sync-mods.js` copia esos archivos a `mcp/src/mods/*/` (carpeta ignorada por git). El atlas debe leer el origen, no la copia.
- Los contratos son módulos ESM que se importan directo, sin compilar (verificado).
- Validadores que ya corren en el sync y que el atlas no debe duplicar: `scripts/validate-fichas.js` (forma de las fichas) y `scripts/validate-governed-objects.js` (completitud del bloqueo de escritura genérica: governedObjects, genericWriteAllowed, blockGenericMutation).
- `src/tools/capability-gate.js` oculta las tools que declaran `requiresCapability` (falla cerrado). Una tool sin esa declaración es siempre visible.

## Qué mira el atlas del lado del mod

`objects/*.json` (propiedades, required, uniqueConstraints, transiciones de estado con capabilities), `objects/RecordTypes/`, `capabilities.json`, `profiles/` (con `extends`), `config/layouts/` (vistas de lista) y `logic/*.schema.graphql` (queries y mutations).

Convenciones de capabilities que el extractor debe conocer, porque no están declaradas una por una:
- Las de objeto (`view`, `create`, `modify`, `delete`, `audit`) son implícitas por convención.
- Las de campo (por ejemplo `competencynode:matrix.status:modify`, `activity.status`) también.
- Los perfiles heredan con `extends`.
- `docs/rbac/baseline-caps-2026-09-02.json` lista las capabilities por rol.

## Matriz de sp11 (la línea base)

Cinco dimensiones, pesos en puntos sobre 100: Escritura segura 20, Escritura completa 25, Integridad 20, Lectura 20, Guía 15.
- Totales de la línea base: cm cerca de 27%, cd cerca de 54%.
- Niveles N0 y N1: aplicación en el servidor dentro de los overrides del CRUD genérico.
- Brechas solo-cliente: 4 en cd, 1 en cm.
- Esfuerzo estimado de cierre: cm entre 12,5 y 22,5 SP, cd entre 12 y 22 SP.
- sp10 define dos huecos reales de cd en el servidor: Activity en create (publicar sin validar) y Offering en create (record type y unicidad de code).

Fuentes en el KB de up1: "Matriz MCP-readiness cm y cd: estado, dependencias, decisiones, esfuerzo y de avance" y "Analisis cd para el MCP: paridad 1:1, postura blockGeneric y gaps client-side" (sp11), y "cd: huecos del CRUD generico a cerrar y como" (sp10).

## Datos medidos en la corrida de prueba

**Tools registradas:** cd 5, cm 29, academic-scheduling 7 (más `as_set_rule_value`, registrada a mano). Total 41. De ellas, 27 son mutaciones y 23 de esas llevan capability.

**Contratos (Guía):** cd 1 de 13 objetos, cm 3 de 10, as 1 de 31. Reproduce los conteos de sp11 (cd 1/13, cm 3/10). Activity documenta 13 de 15 campos.

**Postura de escritura (bloqueo declarado):** cm 10 de 10 objetos (3 con `blockGenericMutation` y 7 con `governedObjects`); cd 0 de 13; as 0 de 31. Recordatorio de sp10: cd puede quedar sin bloqueo porque sus reglas viven en overrides del servidor, así que ese 0 no es en sí un defecto.

**Cobertura mod hacia MCP:**
- Mutations del esquema con tool: cd 3 de 7, cm 22 de 24 (las 2 restantes, cerrar y quitar adopción en singular, las cubren las versiones batch), as 4 de 23.
- Queries con tool: cd 2 de 3, cm 9 de 9, as 4 de 30.
- Academic-scheduling tiene 30 queries y 23 mutations sin clasificar entre "de dominio" y "de pantalla", por eso sus porcentajes de Lectura y Escritura completa no son concluyentes.

**Fidelidad (MCP hacia mod):** cd 4 de 6 (67%), cm 2 de 7 (29%; 86% si se aceptan las excepciones propuestas), as 4 de 4.

**Acceso (tools de escritura con capability):** cd 0 de 3, cm 20 de 20, as 3 de 4.

**Tools de escritura sin capability (4):** `cd_create_formtemplate_for_activity`, `cd_add_plan_entries_batch`, `cd_remove_plan_entries_batch`, `as_run_scenario`. Al no declarar capability, el filtro del MCP las deja siempre visibles. Es un dato para revisar, no un veredicto: el resolver del mod puede protegerlas igual.

**Hallazgos de contenido:**
- El texto del estado de Activity omite la transición InReview a Approved (heurística sobre prosa, severidad baja).
- Tres capabilities de academic-scheduling (`mod/academic-scheduling:assign_*`) están declaradas pero ningún perfil del repositorio las concede (informativo; puede ser un perfil que vive en otra parte).

**Totales por defecto con los pesos de sp11:** cd 54, cm 86 (en la línea base sp11 cm era 27%). La distancia es cambio real de código desde sp11, más cambio de instrumento; no se puede separar sin repetir la auditoría manual.

## Lo que costó calibrar el extractor

La primera corrida dio falsos positivos que obligaron a fijar convenciones:
1. Capabilities como `curriculum:view` marcadas "no existe": son implícitas de objeto.
2. Capabilities con prefijo `mod/` marcadas desconocidas.
3. Campos propios del record type marcados obsoletos: hay que combinar propiedades del objeto base con las del record type.
4. `recordType` marcado como obligatorio omitido en objetos con create genérico bloqueado.
5. `as_set_rule_value` marcada inexistente: se registra a mano fuera de `tools.js`.

La lectura de GraphQL por expresiones regulares dio ruido (fragmentos de descripciones tomados como operaciones). Se reemplazó por el parser de la librería `graphql`, que ya usa el repositorio. Ese costo de calibración es real y se repetiría al implementar.

## Límites de la medición automática

- No detecta lo que no existe: una lectura que el MCP debería tener y nadie declaró.
- No sabe equivalencias entre una mutation del esquema y una tool con otro nombre o agrupada en batch; eso va en el inventario declarado.
- No distingue una query de dominio de una que solo usa una pantalla.
- No ve reglas que viven solo en el cliente; requieren registro declarado con archivo y línea.
- No juzga la calidad de una descripción ni si una ausencia es intencional.
- Las heurísticas sobre prosa (texto de estados) dan severidad baja.

## Archivos de apoyo

- Muestra navegable del tablero, adjunta en esta carpeta (archivo HTML): scorecard por mod con 7 dimensiones y pesos editables, tarjetas de métricas, matriz de sp11 con estado calculado, ejemplo de inventario declarado y límites. Los datos de la muestra son los de este documento. El ejemplo de inventario es ilustrativo: los anclajes archivo:línea no son reales.
- Sondas de la corrida de prueba (desechables, no entran al KB): lectura de objetos, capabilities, perfiles, contratos, tools y esquema GraphQL en solo lectura.
