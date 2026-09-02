---
id: DOC-kb-sp10-PLAN-blockGenericMutation-mcp
project: up1
type: doc
module: mcp
tags:
  - sp10
  - mcp
  - blockGenericMutation
  - endurecimiento
  - analisis
  - plan
---

# blockGenericMutation: analisis e implementacion (endurecimiento del MCP)

## 1. Objetivo y contexto

`blockGenericMutation` es el mecanismo, hoy inexistente, con el que el motor generico del MCP online (`up1/mcp`) rechazaria una escritura de `up1_create_object` / `up1_update_object` / `up1_delete_object` sobre un objeto que un mod declara gobernado, en vez de dejarla pasar directo al backend saltandose la regla que ese objeto ya tiene en su mutation `*Validated` o en su override de `createInstance`/`updateInstance`.

Contexto que lo origina:

- La regla de proyecto `RULE-server-side-logic-mcp-ready` (origen: PO en el planning sp10, 2026-08-31) exige que ninguna via de escritura (UI, API, MCP, importacion) pueda saltear una regla de negocio.
- El analisis `sp9/ANALISIS-backend-vs-client-cd-cm-endurecimiento-mcp.md` identifico el marco de endurecimiento N0..N3 (seccion 6 de ese doc) y dejo abierto el hallazgo B3 (bloqueante de seguridad, intra-MCP) y el caso B-CM-1 (CompetencyNode, unicidad de codigo de matriz, RM1).
- Los tickets UPONE-1757 (Curriculum Design) y UPONE-1758 (Curriculum Mapping), ya cerrados como exploracion en sp10, confirmaron con el codigo real que el mecanismo **no existe** en el repo `mcp` y dejaron explicitamente su implementacion como follow-up compartido entre ambos, sin duplicarlo.
- La convencion local de curriculum-mapping (`mods/curriculum-mapping/CLAUDE.md`, seccion "Escrituras gobernadas: usar mutations `*Validated`, NUNCA CRUD generic ni Prisma directo", y la nota de M-12: "ninguna via de escritura, CRUD generic, MCP o API viejo, puede introducir una excepcion") ya asume que este cierre existe, pero hoy es una promesa sin mecanismo del lado MCP.

Este documento investiga el estado real del motor, disena el mecanismo, mide su radio de impacto sobre los demas mods, y estima su esfuerzo.

## 2. Estado actual (verificado, con file:line)

Repo verificado: `up1/mcp` commit `30a032a860fec15eba6f5a6b8ddde9fe03ada785` (2026-08-27, rama `feat/UPONE-1530-mcp-sync`).

### 2.1 Como escribe hoy el CRUD generico

- `src/tools/generic-tools.js:92-119` declara `up1_create_object` y `up1_update_object` como **fichas** (`GENERIC_TOOLS`): `objectType`/`name` y `id` son parametros de texto libre, sin ninguna validacion de que el objeto este permitido o gobernado.
- `src/tools/register-declarative-tools.js:101-141` (`registerOne`) es el motor que convierte CUALQUIER ficha (generica o de mod) en una tool real: arma `variables`, si es escritura y no viene `confirm` devuelve preview (linea 120), si viene `confirm` llama `up1.request(descriptor.graphql, variables, ctx)` (linea 124) y devuelve el resultado. No hay ningun paso, antes de la llamada, que consulte que regimen tiene el `objectType`.
- `src/graphql-client.js:100-110` muestra que `up1_create_object`/`up1_update_object` ejecutan literalmente `createInstance`/`updateInstance`: las mutations **genericas** del object-manager (no una mutation de dominio). El MCP nunca toca Prisma directo; delega siempre en GraphQL contra el object-manager, pero para estas dos tools SIEMPRE por la via generica.
- `up1_delete_object` (`src/tools/delete-with-impact.js:34-77`) esta escrito a mano (no es ficha, por la logica condicional de impacto), pero tambien llama a la mutation generica `deleteInstance` (`src/graphql-client.js:112-116`) sin consultar ningun contrato antes.
- `src/mcp-server.js:426,436,438` registra estas tres tools de forma **incondicional** al levantar el server, antes y por fuera de `registerMods` (linea 251): estan activas para cualquier objectType de cualquier mod, gobernado o no.

### 2.2 Que existe hoy como config declarativa de objeto (y no bloquea nada)

- `src/contracts/registry.js:1-49`: registro generico `objectType[:recordType] -> contrato`, poblado por cada mod pack (`registerContract`, invocado desde `src/mods/index.js:62` cuando el mod se activa). El unico consumidor real hoy es `src/tools/create-guide.js:9,88` (`get_create_guide`), que usa el contrato solo para armar texto de ayuda (campos requeridos, notas). **Ningun contrato campo existe hoy con el nombre `blockGenericMutation` ni equivalente** (`grep -rn "blockGenericMutation" src/` en `up1/mcp` no devuelve nada; confirmado tambien contra `mods/curriculum-mapping/ai/` y `mods/curriculum-design/ai/`).
- `src/mods/types.js:32-33`: cada `ModPack` declara `objects` (allowlist de objetos que el mod dice exponer) y `notExposed` (lo que declara explicitamente que NO expone). Verificado con grep: **ninguno de los dos se usa para restringir `up1_create_object`/`up1_update_object`/`up1_delete_object`** (no hay una funcion tipo `allowedObjectTypes()` en el repo online, a diferencia de Elric). Es decir: `objects` y `notExposed` son hoy puramente documentales (para `about()`/`buildModsDoc`, `src/mods/index.js:74-90`) y de intake para el LLM, no una barrera runtime. Ejemplo concreto: `mods/curriculum-mapping/ai/index.js:31-36` declara `notExposed: ["writing any object of the domain..."]`, pero `up1_update_object` puede escribir `CompetencyNode` hoy mismo sin que nada lo impida.
- Precedente real del mecanismo que se busca: el PoC local "Elric" (`~/Workspace/uplanner/mcp`, repo aparte, NO el online) si lo tiene, con otro nombre. `src/tools/objects.ts:39-51` (`refuseIfValidated`): antes de mutar generico, consulta `getContract(objectType)` y si `contract.validatedMutations.update || contract.validatedMutations.transition || contract.blockGenericMutation` esta presente, lanza `Up1McpError({code: "USE_DOMAIN_TOOL", ...})`. El campo esta tipado en `src/contracts/registry.ts:109`: `blockGenericMutation?: string` (el string es el hint de que tool usar). Este es el patron a portar (no el codigo, que es TypeScript y de otro transporte), confirmando que la idea ya fue validada una vez, en el otro codebase.

### 2.3 Contratos reales hoy (sin blockGenericMutation)

- `mods/curriculum-design/ai/contracts.js` (`ACTIVITY_CONTRACT`, objectType `Activity`, recordType `Course`): sin bloqueo. El invariante de objeto vive en el override de `createInstance`/`updateInstance` del mod (N0 segun el analisis sp9): el generico ya pasa por el gate, no hace falta bloquear.
- `mods/curriculum-mapping/ai/contracts.js` (`LEVEL_SCHEME_CONTRACT`, `COVERAGE_SCHEME_CONTRACT`, `COMPETENCY_NODE_CONTRACT`): sin bloqueo, y ademas sin tools de escritura (`tools: []` en `index.js:30`). Es decir, hoy el pack completo depende SOLO de que nadie llame al generico para mantener su promesa "read-only" - promesa que el generico no conoce ni respeta.
- `mods/academic-scheduling/ai/contracts.js` (`RULESET_RULE_CONTRACT`, objectType `RuleSetRule`): sin bloqueo. La tool `as_set_rule_value` (`registerExtra`, `rule-value-upsert.js:27-60`) hace un upsert (buscar -> crear o editar) usando las MISMAS mutations genericas (`CREATE_INSTANCE`/`UPDATE_INSTANCE`, ver linea con `LIST_INSTANCES`/`CREATE_INSTANCE`/`UPDATE_INSTANCE` importados por `ctx`), no una mutation `*Validated` propia del backend. La deduplicacion `(ruleSetId, ruleDefinitionId)` que esa tool implementa a mano es bypasseable llamando a `up1_create_object` directo (nada en el backend ni en el generico la revalida).

## 3. Diseno propuesto del mecanismo

### 3.1 Donde vive la declaracion

Extender el contrato de objeto (`src/contracts/registry.js`, la misma "Capa 2" que ya usan los mods) con un campo opcional `blockGenericMutation`, siguiendo el patron ya probado en Elric pero adaptado a JS declarativo (el online no usa TypeScript). Un mod lo declara en su `contracts.js`, igual que hoy declara `fieldDocs` o `guide`.

### 3.2 Como el motor lo detecta y responde

Dos puntos de enforcement, porque hay dos caminos de escritura genericos distintos en el codigo (ficha vs tool a mano):

1. `src/tools/register-declarative-tools.js` (`registerOne`): antes del `if (isWrite && !confirm) return previewResult(...)` (linea 120), si el descriptor trae una marca `governedCheck: "create" | "update"` (agregada SOLO a las dos fichas genericas en `generic-tools.js`, nunca a las fichas de un mod, que son la tool de dominio en si misma), resolver `objectType = variables.objectType`, `recordType = variables.data?.recordType`, llamar `getContract(objectType, recordType)` y si `contract?.blockGenericMutation?.[operacion]` existe, devolver un resultado de error (mismo formato que `errorResult`) con ese mensaje, **antes** de mostrar preview (para no gastar un round-trip en un preview que igual va a fallar).
2. `src/tools/delete-with-impact.js` (`registerDeleteObjectTool`): mismo chequeo, agregado al principio del handler, antes de pedir `DELETE_IMPACT_PREVIEW`.

Mensaje de rechazo: reusa el string que el contrato ya trae (mismo criterio que Elric): `"Este tipo de registro se gestiona con su operacion especifica: <hint>."` El `hint` es libre (referencia a la tool de dominio si existe, o a "operaciones en desarrollo" si el pack todavia no expone una, como es el caso de curriculum-mapping hoy).

### 3.3 Granularidad: dos opciones

**Opcion A - un solo mensaje por objeto (bloquea create+update+delete parejo).**
Forma: `blockGenericMutation?: string`. Igual que Elric.
- Pros: mas simple de declarar y de razonar; cubre el caso mas comun (un objeto gobernado normalmente lo esta en las tres operaciones a la vez, porque nace y vive bajo el mismo invariante).
- Contras: no permite bloquear solo una operacion cuando las otras dos SI son seguras via generico (ej. un objeto cuyo `create` es libre pero cuyo `update` pasa por una mutation `*Validated` separada).

**Opcion B - mapa por operacion (recomendada).**
Forma: `blockGenericMutation?: { create?: string, update?: string, delete?: string }`.
- Pros: precision quirurgica; evita sobre-bloquear una operacion que el generico SI puede resolver bien hoy (ej. `CompetencyNode` podria no tener problema en `create` simple pero si en `update`, si el `create` real pasa igual por una ruta que aplica los defaults correctos). Escala mejor cuando en el futuro se agregue granularidad de mensaje distinto por operacion ("para crear usa X", "para editar usa Y").
- Contras: una linea mas de forma por contrato; quien declara tiene que pensar operacion por operacion en vez de "todo o nada" (costo unico, chico, al declarar).

**Recomendacion:** Opcion B. El costo adicional de declarar es minimo (un objeto literal en vez de un string) y evita el escenario real de "objeto medio gobernado" que ya aparece en el codigo (ej. `Activity` tiene override de `create` Y `update`, pero otros objetos del backlog podrian no ser simetricos). Si en la practica todos los casos terminan bloqueando las tres operaciones, declarar `{ create: msg, update: msg, delete: msg }` con el mismo mensaje repetido sigue siendo trivial.

### 3.4 Default: opt-in (nunca opt-out)

El campo es opcional y su ausencia (`undefined`) significa "sin bloqueo" (comportamiento actual, N0). No hay ningun modo "todo objeto gobernado por defecto bloqueado salvo que se declare lo contrario": eso requeriria que el motor supiera de antemano que objetos son "gobernados" sin que el mod lo diga, lo cual no es informacion que el MCP tenga (esa informacion vive en el resolver del backend, fuera del alcance de este repo). Opt-in es ademas el unico default retrocompatible: agregar el mecanismo al motor no puede cambiar el comportamiento de ningun objeto que hoy no declara nada.

## 4. Interaccion con N1/N3 (veredicto de necesidad para 1757/1758)

El marco N0..N3 de sp9 (seccion 6 del analisis) es la referencia:

- **N0 - nada.** El invariante ya vive en el override de `createInstance`/`updateInstance` del mod (ej. `Activity` de curriculum-design). Ahi el generico YA pasa por el gate: cualquier escritura, sea por MCP o por otro cliente, corre la misma validacion. `blockGenericMutation` en este caso es **redundante**: no agrega seguridad real (nadie puede corromper el dato de todas formas), solo mejora la experiencia (un mensaje mas claro que un error de validacion crudo). Es opcional, "nice to have".
- **N1 - la regla vive en un resolver `*Validated` SEPARADO del `createInstance`/`updateInstance` generico.** Es el caso de curriculum-mapping (`competencyTree-upsert`, `competencyMatrix-create/update`, todas las `*Validated` de M-1..M-12 documentadas en `mods/curriculum-mapping/CLAUDE.md`). Aca el generico **SI puede saltear** la regla, porque `createInstance`/`updateInstance` del object-manager no sabe nada del resolver de dominio: escribe la fila cruda. Es el unico caso donde `blockGenericMutation` es **imprescindible** del lado MCP: sin el, cualquier agente que use `up1_update_object` sobre `CompetencyNode` puede violar RM1 (unicidad de codigo de matriz) sin que nada lo impida, porque esa regla vive solo en `competencyTree-upsert`, no en `updateInstance`.
- **N3 - escalar el invariante al resolver.** Mover la regla al override de `createInstance`/`updateInstance` (convertir un caso N1 en N0). Es el fix definitivo: una vez ahi, `blockGenericMutation` vuelve a ser opcional (defensa en profundidad), porque ya no hay forma de saltear la regla desde NINGUN cliente (ni MCP, ni bulk-edit del core, ni una llamada GraphQL directa).

**Punto fino para el veredicto de 1757/1758 (dos niveles de bypass, seccion 3 del analisis sp9):** `blockGenericMutation` es un mecanismo **intra-MCP**: solo cierra la puerta que abre `up1_create/update/delete_object`. NO cierra el bypass **cross-client**: si el mismo objeto tiene ademas una via de escritura generica fuera del MCP (por ejemplo el bulk-edit generico de listas del core object-manager, que tambien llama a `updateInstance`), esa via sigue abierta despues de implementar `blockGenericMutation`, porque el mecanismo vive en el MCP, no en el resolver. Es exactamente el caso citado por B-CM-1 (RM1 vs "bulk-edit generico del core"): cerrar el MCP mitiga el riesgo del agente/asistente, pero el cierre completo (todos los clientes) solo lo da N3. Esto confirma el veredicto de ambos tickets: `blockGenericMutation` es necesario y suficiente **solo para el objetivo puntual de UPONE-1757/1758** (que el MCP no sea el vector de bypass), y no reemplaza los tickets A-CM-1..4/A-CD-1..8 (escalar al resolver) para el cierre integral. Los dos trabajos son complementarios, no sustitutos.

## 5. Superficie (archivos)

### Repo `up1/mcp` (el motor, transversal)

| Archivo | Cambio |
|---|---|
| `src/contracts/registry.js` | Documentar el campo `blockGenericMutation` en el comentario de forma del contrato (JS sin tipos, asi que es documentacion + ejemplo, no un `interface`); agregar un helper puro `getBlockedHint(objectType, recordType, operation)` que resuelva el contrato y devuelva el mensaje si esta bloqueado, o `undefined`. |
| `src/tools/register-declarative-tools.js` | En `registerOne` (linea ~103-141): leer `descriptor.governedCheck`, resolver `objectType`/`recordType` de `variables`, llamar al helper, devolver un `blockedResult(hint)` (nueva funcion, mismo estilo que `previewResult`/`errorResult`) si corresponde, ANTES del branch de preview. |
| `src/tools/generic-tools.js` | Agregar `governedCheck: "create"` al descriptor de `up1_create_object` (linea ~92-105) y `governedCheck: "update"` al de `up1_update_object` (linea ~106-119). Ninguna otra ficha (de mod) declara esta marca. |
| `src/tools/delete-with-impact.js` | En `registerDeleteObjectTool` (linea ~34): mismo chequeo al principio del handler, antes de `DELETE_IMPACT_PREVIEW`. |
| `test/` (nuevo) | Un test de unidad para el helper (contrato bloqueado / no bloqueado / por operacion) y un test de integracion liviano (cliente GraphQL falso, igual que `test/delete-with-impact.test.mjs` y `test/create-guide.test.mjs`) que confirme que `up1_create_object`/`up1_update_object`/`up1_delete_object` devuelven el error SIN llamar a `up1.request` cuando el contrato bloquea. |
| `test/curriculum-mapping-pack.test.mjs`, `test/validate-fichas.test.mjs` (existentes) | Revisar que sigan pasando sin cambios (no deberian verse afectados: son tests de forma de pack, no de runtime del motor). |

### Repo `up1/mods/<mod>/ai/` (config, por mod)

| Archivo | Cambio |
|---|---|
| `mods/curriculum-mapping/ai/contracts.js` | Agregar `blockGenericMutation: { update: "..." }` (y `create`/`delete` si corresponde tras auditar, ver seccion 7) a `COMPETENCY_NODE_CONTRACT` (B-CM-1). |
| Cualquier otro mod que audite un objeto N1 (ver seccion 6) | Mismo patron: una linea en su `contracts.js`. |

## 6. Blast radius: motor compartido vs config local

`blockGenericMutation` vive en dos capas con radios de impacto MUY distintos, y hay que separarlas al dimensionar y al aprobar el cambio.

### 6.1 Blast radius del MECANISMO (cambio en el motor, repo `mcp`)

Tocar `register-declarative-tools.js` y `delete-with-impact.js` es un cambio en el **camino comun** de escritura: por ahi pasa CUALQUIER objeto de CUALQUIER mod activo, porque `up1_create_object`/`up1_update_object`/`up1_delete_object` se registran una sola vez, de forma incondicional, para toda la plataforma (`src/mcp-server.js:426,438`, fuera de `registerMods`). Esto es lo que hace que el cambio sea de **plataforma/core del MCP**, no de un mod:

- Si el chequeo tuviera un bug (ej. una excepcion no controlada al resolver el contrato, o una condicion invertida), romperia el CRUD generico para **todos** los mods activos al mismo tiempo, no solo para el que declaro el bloqueo. Es la razon central por la que el mecanismo debe ser **estrictamente opt-in y de costo cero cuando no se declara** (seccion 3.4): la ausencia de `blockGenericMutation` en un contrato, o la ausencia de contrato, tiene que devolver exactamente el comportamiento de hoy, sin ninguna rama nueva ejecutandose para el caso comun.
- Mods hoy activos (sincronizados en `src/mods/`, verificados con `objects`/`contracts` reales) que exponen objetos por el CRUD generico y por lo tanto son consumidores/afectados potenciales del cambio de motor:
  - `academic-scheduling`: `Scenario`, `ScenarioSection`, `RuleSet`, `RuleSetRule`, `RuleDefinition` (`src/mods/academic-scheduling/index.js:39-43`). De estos, `RuleSetRule` tiene contrato (`RULESET_RULE_CONTRACT`) y una logica de upsert propia (`as_set_rule_value`) que el generico puede saltear (ver 6.2). `Scenario`/`ScenarioSection` estan declarados a proposito como abiertos al generico (`notExposed: ["create/delete scenarios and sections - via generic CRUD ... if needed"]`, `index.js:33`): NO deben bloquearse.
  - `curriculum-design`: `Activity:Course`, `planEntry` (`src/mods/curriculum-design/index.js:39-40`). `Activity` es N0 (seccion 4): no necesita bloqueo. `planEntry` no tiene invariante server-side todavia (reglas de malla client-side, tickets A-CD-1..6 de sp9 pendientes): tampoco es candidato hoy.
  - `curriculum-mapping`: `LevelScheme:Scheme`, `CoverageScheme`, `CompetencyNode:Matrix` (`src/mods/curriculum-mapping/index.js:38-40`). Es el mod con mas riesgo real hoy (ver 6.2).
  - Objetos de cualquier otro mod o del core (`core_Role`, etc.) sin contrato registrado en absoluto: siguen sin verse afectados (helper devuelve `undefined` cuando no hay contrato).
- El cambio de motor **requiere sign-off del equipo dueno del MCP** (quien mantiene `register-declarative-tools.js`/`generic-tools.js`/`delete-with-impact.js`), porque altera el contrato implicito "toda ficha `preview-confirm` se ejecuta igual" que hoy vale para las genericas y, en el punto de enforcement, agrega una dependencia nueva de `tools/` hacia `contracts/registry.js` (hoy solo `create-guide.js` la tiene). Es infraestructura transversal, no una decision de un mod individual.

### 6.2 Blast radius de la CONFIG por mod (local, contenido)

Declarar `blockGenericMutation` en el `contracts.js` de un mod SOLO afecta al objeto (y, si se usa la Opcion B, a la operacion) que ese contrato nombra. No toca a otros mods, no toca al motor, y es reversible borrando la linea. El unico efecto colateral posible es sobre el propio mod: si el pack todavia no tiene una tool de dominio que reemplace la escritura bloqueada (caso de curriculum-mapping hoy, que es puramente de lectura), bloquear deja al objeto **sin ninguna via de escritura por MCP** hasta que se construya esa tool - un efecto deseado en este caso (es exactamente lo que "read-only pass" ya prometia, ahora enforzado), pero que hay que comunicar al declarar (el mensaje de rechazo debe decir que la escritura esta en desarrollo, no inventar una tool que no existe).

### 6.3 Auditoria previa: que objetos ya expuestos podrian "corromperse" si se declaran mal

Antes de declarar bloqueos nuevos hay que confirmar, objeto por objeto, si el invariante que se quiere proteger es realmente N1 (resolver `*Validated` separado) o si ya es N0 (override del generico) - bloquear un objeto N0 no es incorrecto pero es trabajo sin beneficio de seguridad real (seccion 4); y sobre todo, bloquear una operacion que HOY funciona bien por el generico (ej. `Scenario`/`ScenarioSection`, declarados a proposito abiertos) rompe un flujo que el propio mod eligio dejar generico. Candidatos concretos a auditar antes de la primera declaracion real:

1. **`CompetencyNode` (curriculum-mapping), B-CM-1.** N1 confirmado: RM1 (unicidad de codigo de matriz) vive en `competencyMatrix-create`/`update` (`*Validated`), no en `createInstance`/`updateInstance`. Candidato firme para `update` (y evaluar `create`, porque hoy el pack no expone ninguna tool de creacion via MCP: bloquear `create` es coherente con `notExposed`).
2. **`RuleSetRule` (academic-scheduling).** N1 de facto: la deduplicacion `(ruleSetId, ruleDefinitionId)` de `as_set_rule_value` es logica de la tool, no del backend (usa las mismas `CREATE_INSTANCE`/`UPDATE_INSTANCE` genericas puertas adentro). Es un caso N2 segun el arbol de decision de sp9 (custom-logic + `blockGenericMutation`), pero antes de bloquear hace falta confirmar con el mod si existe o no una constraint de unicidad real en el backend para ese par; si no existe, bloquear sin escalar el invariante al resolver (N3) deja la deduplicacion dependiendo solo de la tool de dominio, que es mejor que nada pero sigue siendo deuda (documentar como tal).
3. **`Activity` (curriculum-design).** Auditado: N0 confirmado por el analisis sp9 (overrides de `createInstance`/`updateInstance`). No es candidato a bloqueo obligatorio; opcional como defensa en profundidad si se quiere mensaje mas claro.

Esta auditoria (paso 0 del plan, seccion 9) es la que decide que objetos entran al primer lote de declaraciones, no una lista cerrada de antemano.

## 7. Uso y adopcion

**Patron para declarar un objeto+operacion bloqueado**, una vez que el mecanismo este en el motor:

```js
// mods/<mod>/ai/contracts.js
export const MI_CONTRATO = {
  objectType: "MiObjeto",
  recordType: "MiRecordType", // opcional
  // ... resto del contrato (fieldDocs, guide, etc.) sin cambios
  blockGenericMutation: {
    update: "La matriz de competencias se edita con sus operaciones de dominio (arbol, rubrica). La escritura por MCP esta en desarrollo.",
  },
};
```

Sin ningun otro cambio: el contrato ya se registra solo (`registerContract`, `mods/index.js:62`), y el motor lo consulta automaticamente para esa `objectType[:recordType]` la proxima vez que alguien llame al generico.

**Si se vuelve el estandar:** la recomendacion es que sea el estandar **de facto** (todo objeto con una mutation `*Validated` separada, o con un override server-side que el generico no alcanza, declara su bloqueo cuando se le agrega o audita el contrato), pero NO un gate automatico obligatorio (no hay forma de forzarlo sin que el motor sepa por si mismo que objetos son gobernados, que es informacion del backend, fuera de este repo). El punto de control practico es la revision de PR de cada mod (Dredd) y el checklist de `TASKS.md`/"Add a contract for an object": cuando se agrega o toca un contrato para un objeto con escritura gobernada server-side, la pregunta "¿el generico puede saltear esto?" pasa a ser parte del checklist.

**Default recomendado: opt-in**, ya justificado en 3.4 y 6.1: es el unico default que no cambia comportamiento existente y no exige que el motor infiera gobernanza que no puede conocer.

## 8. Donde documentar

- **`up1/mcp/README.md`** (seccion "Arquitectura: mods declarativos", donde ya se documenta `src/contracts/registry.js` como "Registro de contratos por objeto"): agregar una linea sobre `blockGenericMutation` como el campo que endurece un contrato contra el CRUD generico, con referencia a esta seccion de diseño.
- **`up1/mcp/.ai/TASKS.md`**, seccion "Add a contract for an object" (linea ~44-50): es el lugar natural para el checklist de declaracion (ver seccion 7) - agregar el paso "si el objeto tiene una mutation `*Validated` separada o una regla que el `createInstance`/`updateInstance` generico no aplica, declarar `blockGenericMutation` para la operacion afectada".
- **`up1/mcp/.ai/PATTERNS.md`**, junto al parrafo que ya describe `src/contracts/registry.js` (linea ~81): agregar el patron de deteccion (donde vive el chequeo, que hace `registerOne`) para quien lea el motor por primera vez.
- **`mods/.ai/COMMANDMENTS.md`** (reglas del lado mod, referenciadas desde `mcp/.ai/TASKS.md:7`): agregar la regla de que un mod con escritura gobernada DEBE evaluar `blockGenericMutation` al declarar su contrato, con el mismo criterio que ya usa `mods/curriculum-mapping/CLAUDE.md` para "usar mutations `*Validated`, nunca CRUD generic".
- **KB de Kanai (up1):** registrar como regla del proyecto (`register_teach`/nueva `RULE-*`, a decidir con el PO) que complementa a `RULE-server-side-logic-mcp-ready`: algo como "todo objeto con escritura gobernada server-side y expuesto por el MCP debe declarar `blockGenericMutation` para la(s) operacion(es) que el generico pueda saltear". Este documento (`PLAN-blockGenericMutation-mcp`, sp10) queda como la fuente de diseño detras de esa regla.

## 9. Plan por pasos (implementacion + tests)

**Paso 0 - Auditoria (previa, sin codigo).** Confirmar objeto por objeto (seccion 6.3) cual es N0/N1/N2 antes de declarar ningun bloqueo real. Sin esto, el primer PR corre el riesgo de bloquear algo que el mod dejo abierto a proposito (`Scenario`/`ScenarioSection`).

**Paso 1 - Motor (repo `mcp`).**
1. `src/contracts/registry.js`: agregar el comentario de forma + helper `getBlockedHint(objectType, recordType, operation)`.
2. `src/tools/register-declarative-tools.js`: `blockedResult()` + chequeo en `registerOne` gateado por `descriptor.governedCheck`.
3. `src/tools/generic-tools.js`: marcar `up1_create_object`/`up1_update_object` con `governedCheck`.
4. `src/tools/delete-with-impact.js`: mismo chequeo en el handler de `up1_delete_object`.

**Paso 2 - Tests del motor (repo `mcp`).**
1. Test de unidad del helper: sin contrato -> `undefined`; contrato sin `blockGenericMutation` -> `undefined`; contrato con bloqueo en `update` pero no en `create` -> solo bloquea `update`; resolucion por `recordType` cuando hay dos contratos para el mismo `objectType`.
2. Test de integracion (cliente GraphQL falso, patron de `test/delete-with-impact.test.mjs`): `up1_create_object`/`up1_update_object`/`up1_delete_object` sobre un objeto con bloqueo devuelven `isError: true` con el mensaje del contrato, y **nunca llaman** a `up1.request` (verificar que el mock no fue invocado).
3. Test de regresion: correr `test/curriculum-mapping-pack.test.mjs` y `test/validate-fichas.test.mjs` sin cambios, confirmar que siguen en verde (nada de lo declarativo existente deberia moverse).
4. Test de humo (`test/smoke.mjs`) sobre un objeto SIN contrato o SIN bloqueo: confirmar que el comportamiento es identico al de antes del cambio (mismo request, mismo resultado) - es el test que prueba la retrocompatibilidad de 6.1.

**Paso 3 - Config real: primer caso (B-CM-1).**
1. `mods/curriculum-mapping/ai/contracts.js`: agregar `blockGenericMutation` a `COMPETENCY_NODE_CONTRACT` para `update` (y `create` si la auditoria del paso 0 lo confirma).
2. Extender `test/curriculum-mapping-pack.test.mjs` (o agregar un test nuevo en el mismo archivo) con una aserción de que el contrato de `CompetencyNode` declara el bloqueo esperado.
3. `npm run sync --workspace=mcp` para reflejar el cambio en `src/mods/curriculum-mapping/` (gitignored, generado).

**Paso 4 - Documentacion (seccion 8).** README, TASKS.md, PATTERNS.md, COMMANDMENTS.md del mod, y la regla en el KB de Kanai.

**Paso 5 - Coordinacion 1757/1758.** Avisar en ambos tickets que el mecanismo compartido quedo implementado, y cual de los dos (o un tercero) es dueño de declarar el primer caso real ademas de B-CM-1 (evitar declarar el mismo objeto dos veces desde dos ramas).

## 10. Estimacion calibrada

Separada en dos partidas, porque tienen sensibilidad y dueños distintos (seccion 6):

### Motor (repo `mcp`, cambio de plataforma compartido)

**Esfuerzo: Menor - Considerable · 3 SP.**

- El cambio de codigo en si es chico (~60-90 lineas nuevas entre `registry.js`, `register-declarative-tools.js`, `generic-tools.js`, `delete-with-impact.js`) y sigue un patron ya validado en Elric (no hay diseño desde cero).
- El peso esta en la disciplina de retrocompatibilidad y en los tests: hay que probar explicitamente que el camino "sin contrato / sin bloqueo" no cambia (paso 2.4), y correr toda la suite existente de `mcp` como regresion, porque el punto de insercion es el motor por el que pasa TODO objeto de TODO mod (seccion 6.1).
- **Sensibilidad: Media** (no Baja): un error en el orden de evaluacion (bloquear antes o despues del preview, resolver mal `recordType`, una excepcion no controlada al llamar `getContract`) rompe el CRUD generico para todos los mods activos al mismo tiempo, no solo para el objeto que se queria proteger. Requiere sign-off de quien mantiene el motor del MCP, no solo del mod que impulsa el primer caso.

### Config por mod (declarar el primer caso, B-CM-1)

**Esfuerzo: Trivial · 1 SP.**

- Una entrada de contrato (`blockGenericMutation: { update: "..." }`) mas su aserción de test en `curriculum-mapping-pack.test.mjs`. Sin logica nueva, sin tocar el motor.
- **Sensibilidad: Baja**: local al mod, reversible borrando la linea, no afecta a otros mods ni al motor.

### Total

**4 SP** (3 motor + 1 config del primer caso), asumiendo que la auditoria del paso 0 (seccion 6.3) no encuentra sorpresas que obliguen a revisar contratos existentes. Si la auditoria confirma que `RuleSetRule` tambien necesita bloqueo (candidato 2 de 6.3), sumar 1 SP mas de config (mismo patron, otro mod).

## 11. Riesgos y decisiones abiertas

- **Riesgo de regresion transversal (motor compartido).** Ya cubierto en la estimacion: mitigado con el paso 2.4 (test explicito de "sin bloqueo, comportamiento identico") y con correr toda la suite existente antes de mergear.
- **Riesgo de sobre-bloqueo.** Declarar `blockGenericMutation` sobre un objeto que un mod dejo abierto a proposito (`Scenario`/`ScenarioSection` de academic-scheduling) rompe un flujo intencional. Mitigado por el paso 0 (auditoria previa) y por el default opt-in (nadie se bloquea sin que un contrato lo declare explicitamente).
- **Decision abierta: Opcion A vs B de granularidad (seccion 3.3).** Se recomienda B (mapa por operacion), pero es una decision de diseño que conviene confirmar con quien mantenga el motor antes de codear, dado el blast radius.
- **Decision abierta: mensaje cuando el pack todavia no tiene tool de dominio.** Para `CompetencyNode` (curriculum-mapping), bloquear `update` sin que exista todavia una tool de escritura deja al objeto sin via de escritura por MCP. Es el comportamiento correcto (coincide con `notExposed`), pero el mensaje de rechazo debe decirlo explicitamente ("en desarrollo") y no inventar el nombre de una tool que no existe todavia.
- **Decision abierta: `RuleSetRule` (candidato 2 de 6.3).** Requiere confirmar con el mod academic-scheduling si existe o no una constraint real de unicidad en el backend para `(ruleSetId, ruleDefinitionId)` antes de decidir si se bloquea ahora o se posterga a que el invariante se escale al resolver (N3, evitando declarar una deuda nueva).
- **No sustituye N3.** Reiterado de la seccion 4: implementar `blockGenericMutation` no cierra el bypass cross-client (bulk-edit del core u otra via fuera del MCP). Los tickets de escalar el invariante al resolver (A-CM-1..4, A-CD-1..8 de sp9) siguen siendo necesarios para el cierre integral; este mecanismo resuelve especificamente el vector MCP que motivo a UPONE-1757/1758.
- **Coordinacion con 1757/1758.** Ambos tickets comparten el mecanismo; hay que decidir en que ticket de ajuste (o en uno nuevo, "motor") se implementa el motor, para no duplicar trabajo entre las dos lineas (cd y cm).
