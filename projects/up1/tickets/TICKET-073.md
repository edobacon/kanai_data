---
id: TICKET-073
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1270
module: curriculum-design
autopilot: autonomous
---

# Corregir el mensaje de unicidad por linaje sin tocar core (mod-only, alineación con pattern de core)

## Request

> Ticket externo: [UPONE-1270](https://u-planner.atlassian.net/browse/UPONE-1270) — épica curriculum-design. Follow-up del trabajo de TICKET-065 (unicidad por linaje) y TICKET-067 (payload-fix del clone).

Petición del dev (textual):

> "Necesito que los cambios de `UPONE-1270-friendly-error-lineage` no vayan a core, necesito que sea algo que maneje el mod."

Contexto: al cerrar TICKET-065 se detectó que el guard de unicidad por linaje del mod (`CURRICULUM_LINEAGE_DUPLICATE`) producía un mensaje engañoso en la UI ("Este registro fue modificado por otra persona") porque su texto contenía "versiones…Conflicto" y matcheaba el regex de concurrencia de `useFriendlyErrors`. El fix que se aplicó (commit `5dd5854` en `layout`) **hardcodeó un patrón con el mensaje de dominio de curriculum dentro del core** (`ERROR_PATTERNS` de `useFriendlyErrors.ts`). Eso acopla el core (`layout`) al mod `curriculum-design` y no escala: cada mod que quiera un mensaje propio tendría que editar ese archivo de core.

**Objetivo**: que el mensaje user-facing de los errores de dominio del mod **lo gobierne el mod**, no el core. El core debe ganar una **capacidad genérica** ("respetar el mensaje user-facing que declare el backend"), reusable por cualquier mod, sin conocer a curriculum.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement |
| Tipo de cambio | mod-only (restricción dura del dev — ver decisión DEC-LOCAL-01: cero cambios en core) |
| Modulo principal | curriculum-design (mod, emite el error) |
| Modulos afectados | curriculum-design (mod). Core `layout` NO se toca: el mod alinea el texto que emite con un pattern que `useFriendlyErrors` ya reconoce |

> **Re-scope (2026-06-17, intake-explore)**: el alcance original cruzaba mod + core `layout` + `object-manager` (enfoque A — extensions GraphQL). El dev impuso una restricción dura: **solo el mod, cero cambios en core**. Eso descarta A y reduce el alcance a un único archivo del mod (+ su test). Ver `### Enfoque decidido` y `DEC-LOCAL-01`.

## Creation scope

Ambos flags `false`: no crea UI nueva ni entidades de datos. Cambia el mecanismo de propagación/render de errores existentes.

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | Reusa el flujo de error existente (toast/modal). No hay vista nueva. |
| Data model | no | No introduce entidades. |

## Triage

Mejora de bajo riesgo, con viabilidad **ya verificada en la conversación de intake** (no son hipótesis abiertas: son hechos confirmados por lectura de código). El delta es: mover el contenido del error al mod + añadir un passthrough genérico en core + revertir el pattern hardcodeado.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | No hay gateway/federation entre frontend y object-manager: un solo salto Apollo Server v5 → las `extensions` no se aplanan en tránsito | ✓ confirmada | `object-manager/package.json` (`@apollo/server ^5.0.0`, sin `@apollo/gateway`); grep de `ApolloGateway`/`buildSubgraphSchema` vacío |
| H2 | El `formatError` de OM ya preserva extensions del resolver (`...formattedError.extensions`) → cero cambios esperados en OM | ✓ confirmada | `object-manager/src/index.js:62-93` — branch genérico hace spread de extensions; precedente UNIQUE_VIOLATION (HU-10/UPONE-1216) hace code-in-extensions con comentario que documenta la misma filosofía |
| H3 | Un mod puede lanzar `GraphQLError` con `extensions.code` y sobrevive el pipeline | ✓ confirmada | Precedente: `object-manager/src/graphql/resolvers/mods/academic-scheduling/runScenario.resolver.js:100-106` (NOT_FOUND, CONFLICT) |
| H4 | El frontend ya recibe `extensions` en el flujo de submit, pero el canal está stub ("future") | ✓ confirmada | `RecordDetail.vue:4014` pasa `graphQLError.extensions` a `handleBackendValidationError`; `RecordDetail.vue:1419-1423` comentario "Look for structured information in extensions (future)" sin uso real |
| H5 | Hoy el mod lanza `Error` plano (código en prefijo del string) → Apollo v5 le pone `extensions.code = INTERNAL_SERVER_ERROR`; para que el code sobreviva, el mod debe lanzar `GraphQLError` | ✓ confirmada | `mods/curriculum-design/logic/helpers/lineageUniqueness.js:103-108` (`throw new Error('CURRICULUM_LINEAGE_DUPLICATE: …')`) |

> **H1–H5 son evidencia del enfoque A (extensions GraphQL), DESCARTADO** por la restricción del dev (cero cambios en core — `DEC-LOCAL-01`). Se preservan (DET-6: discoveries inmutables) porque documentan por qué A era viable y por qué el mod-only no puede fijar el texto exacto. El enfoque vigente se valida con H6–H9.

Hipótesis del enfoque mod-only vigente (validadas en intake-explore, 2026-06-17):

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H6 | El bug del mensaje engañoso ("modificado por otra persona") **solo** afecta a `lineageUniqueness`, no al gemelo `modalityDefault` | ✓ confirmada | Concurrency regex `useFriendlyErrors.ts:351` = `/concurrent\|version.*conflict\|optimistic.*lock/i`. Lineage tiene "las **versiones**…**Conflicto** con" → matchea `version.*conflict`. Modality dice "Conflicto con seccion(es)" SIN "version" antes → NO matchea (hoy cae en default "Ocurrió un error inesperado", no engañoso) |
| H7 | core ya tiene un pattern genérico de unicidad con traducción ES que el mod puede aprovechar sin tocar core | ✓ confirmada | `useFriendlyErrors.ts:191` pattern `/Unique constraint.*failed.*\`(\w+)\`/i` → category `uniqueness`; `layout/lang/es_CL@RecordDetail.json` → `friendlyErrors.uniqueness` = "Ya existe un registro con ese valor." / "Usa un valor diferente." El pattern `uniqueness` (L191) precede a `concurrency` (L351) → gana por orden de prioridad |
| H8 | El mensaje del mod llega a `translateError` y el toast se muestra (no se suprime) | ✓ confirmada | `RecordDetail.vue:4013` solo invoca `handleBackendValidationError` si el mensaje incluye `"Validation failed:"`/`"Enum validation failed:"` → el nuestro NO, va directo a `translateError` (L4029); `recordDetailErrorHandling.ts:5-9` suprime solo `self-deactivation`/`last-admin`/`tenant-user-not-found` — `uniqueness` NO está suprimida → toast visible |
| H9 | El code `CURRICULUM_LINEAGE_DUPLICATE` debe permanecer en el string lanzado | ✓ confirmada | `tests/integration/curriculum-lineage.test.ts:89,143,151,161,175` asertan `rejects.toThrow(/CURRICULUM_LINEAGE_DUPLICATE/)`. El nuevo mensaje conserva el code (no rompe regresión) |

### Enfoque decidido (mod-only — alineación con el pattern `uniqueness` de core)

> **DEC-LOCAL-01 (2026-06-17, restricción del dev)**: "solo el mod, cero cambios en core". El dev priorizó NO tocar `layout`/`object-manager` por sobre que el mod gobierne el texto exacto. Enfoque A (extensions GraphQL) **parqueado** (ver Backlog) — sigue siendo el fix correcto si en el futuro varios mods necesitan su propio texto.

Cambio único (detalle de tasks en design-improvement):

1. **Mod, fuente `logic/`** — `mods/curriculum-design/logic/helpers/lineageUniqueness.js`, `assertUniqueLineageRoot` (L103-108): reescribir el string lanzado para que **matchee el pattern `uniqueness` de core** (`/Unique constraint.*failed.*\`(\w+)\`/i`) en vez del de concurrencia. Forma propuesta (a finalizar en execute):
   `CURRICULUM_LINEAGE_DUPLICATE: Unique constraint failed on the field \`code\`. Ya existe un curriculo raiz con el codigo "{code}" en la institucion ({institutionId}). Conflicto con: {ids}.`
   - Conserva el code (H9 — tests verdes) y el detalle de dominio (logging; `severity:warning` → core NO muestra technicalMessage).
   - Resultado UI: toast (ES) "Ya existe un registro con ese valor." / "Usa un valor diferente." — correcto, ya no el de concurrencia.
   - **Comentario obligatorio** en el helper explicando el acople intencional al regex de core (para que un futuro "cleanup" del texto inglés no rompa el mapping en silencio — fragilidad aceptada en `DEC-LOCAL-01`).
2. **`npm run sync`** — propaga el cambio al destino sincronizado en object-manager.
3. **Test de regresión** en `tests/integration/curriculum-lineage.test.ts`: el mensaje matchea `/Unique constraint.*failed.*\`(\w+)\`/i` y NO `/version.*conflict/i`; sigue conteniendo `CURRICULUM_LINEAGE_DUPLICATE`.

**Trade-offs aceptados (DEC-LOCAL-01)**:
- El texto user-facing lo gobierna **core** (genérico "Ya existe un registro con ese valor."), no el mod. El mod NO puede mostrar "currículo/código/institución".
- **Acople frágil**: el mod depende del regex `uniqueness` de core. Si core renombra/quita ese pattern, el mapping se rompe silencioso. Mitigación: comentario en el helper + test de regresión que ancla la forma del mensaje.

> Alternativas descartadas:
> - **A (extensions GraphQL)** — el mod gobierna el texto exacto vía `extensions.userMessage` + un passthrough genérico en core. **La correcta a futuro**, pero exige tocar core (`useFriendlyErrors`) → descartada por `DEC-LOCAL-01`. Parqueada en Backlog.
> - **Mod-only con texto exacto** — imposible de forma limpia: core no tiene passthrough genérico (el único, `'{passthrough}'`, está atado al matcher de fórmulas con su propia `action`). Requeriría un hack frágil → descartada.

### Context found

- **Rules del modulo**: RULE-dev-004 (core_work_policy — trabajo `layer:core` va en rama de épica, merge a develop gated por revisión del team up1). Pendiente: el researcher de intake-explore confirma rules formales de `layout`/`curriculum-design`.
- **Feedback/principios aplicables (memoria del dev)**: "El viewer/core refleja el flujo deckard, nunca inventa convenciones; capacidad nueva va a core como genérico, el contenido de dominio va al mod" — es justamente el principio que motiva esta mejora.
- **Bugs abiertos**: ninguno conocido en el área.
- **Specs relacionados**: el de TICKET-065 (UPONE-1270, unicidad por linaje) donde se originó el síntoma.
- **Docs relevantes**: `mods/.ai/PATTERNS.md` (patrones de mod), `layout/.ai/CONTEXT.md`.
- **Warnings**:
  - Editar la **fuente del mod** (`mods/curriculum-design/logic/`), NO el destino sincronizado (`object-manager/src/graphql/resolvers/mods/curriculum-design/helpers/`). Correr `npm run sync` tras el cambio del mod.
  - **Acople intencional al regex de core** (`DEC-LOCAL-01`): el nuevo mensaje depende del pattern `uniqueness` de `useFriendlyErrors.ts:191`. Documentar en el helper para que un cleanup futuro del texto no rompa el mapping en silencio. El test de regresión ancla la forma.
  - El enfoque mantiene `throw new Error(...)` (NO `GraphQLError`) — el mecanismo de propagación no cambia, solo el contenido del string (el mensaje de concurrencia engañoso ya llega hoy al front, prueba de que el string crudo se preserva).

### Discovery técnico (intake — file:line)

Trazabilidad del recorrido de código que fundamenta el enfoque A. Inmutable (DET-4: hechos, no inferencias).

**1. Dónde nace el error (mod):**
- `mods/curriculum-design/logic/helpers/lineageUniqueness.js:96-110` — `assertUniqueLineageRoot` hace `throw new Error('CURRICULUM_LINEAGE_DUPLICATE: ya existe un Curriculo raiz con el codigo "X" … Conflicto con: …')`. El **mensaje ya es user-facing y en español**, pero (a) el code va como **prefijo del string** y (b) contiene la palabra "Conflicto".
- `mods/curriculum-design/logic/errors.js:89` — `CURRICULUM_LINEAGE_DUPLICATE` está en el diccionario central `ERR` (Object.freeze). El comentario del archivo ya anticipa "i18n futuros (mapping code → translation key)".
- Gemelo: `mods/curriculum-design/logic/helpers/modalityDefault.js:74` — mismo patrón ("Conflicto con seccion(es): …"), mismo tratamiento pendiente.

**2. Dónde se pisa el mensaje (core, el bug original):**
- `layout/src/composables/useFriendlyErrors.ts:349-356` — pattern de **concurrencia** con regex `/concurrent|version.*conflict|optimistic.*lock/i` → mensaje "This record was modified by someone else." El "versiones…Conflicto" del mod matchea este regex → mensaje engañoso. Ese es el falso positivo que el commit `5dd5854` parcheó hardcodeando un pattern de curriculum.
- `useFriendlyErrors.ts:465-508` — `translateError` itera `ERROR_PATTERNS` (orden = prioridad, primero gana) sobre el `.message` string. La i18n key `friendlyErrors.${category}.message` (línea 485) **solo se consulta DESPUÉS de matchear** un pattern — no es un punto de extensión por sí solo.

**3. Precedente directo de passthrough en core (lo que vamos a generalizar):**
- `useFriendlyErrors.ts:88-94` — el pattern de "Formula validation failed" usa `message: '{passthrough}'`, que muestra el mensaje crudo del backend tal cual (línea 475-477). Es exactamente el mecanismo de A, pero hoy ad-hoc por-pattern; A lo eleva a passthrough genérico gobernado por `extensions.userMessage`.

**4. El canal `extensions` en el frontend (cableado pero stub):**
- `RecordDetail.vue:4008-4014` — `handleSubmit` extrae `error.graphQLErrors[0]` y pasa `graphQLError.extensions` a `handleBackendValidationError`.
- `RecordDetail.vue:1415-1463` — `handleBackendValidationError`: el branch `extensions.fieldErrors` está vacío (comentario "future", `return true` sin hacer nada). **Riesgo a vigilar**: la línea 1425 ya parsea `"campo: mensaje"` con regex `/^([a-zA-Z_]\w*)\s*:\s*(.+)$/` — el formato actual `CURRICULUM_LINEAGE_DUPLICATE: msg` podría matchear ese path y rutear a `showSalesforceStyleError` con un "campo" inexistente. Migrar a `extensions` evita esa colisión.

**5. Propagación backend (sin pérdida de extensions):**
- `object-manager/package.json` — `@apollo/server ^5.0.0`, **sin** `@apollo/gateway`/federation → un solo salto.
- `object-manager/src/index.js:62-93` — `formatError`: branch UNIQUE_VIOLATION (líneas 72-83) ya hace code-in-extensions; branch genérico (84-92) preserva `...formattedError.extensions`. Comentario (64-70) documenta la filosofía de A ("NO hardcodeamos el idioma de la UI en el backend").
- Precedente de mod lanzando `GraphQLError`: `object-manager/src/graphql/resolvers/mods/academic-scheduling/runScenario.resolver.js:100-106`.

### Extensibilidad de mods hacia el layout (hallazgo del agente Explore)

Por qué A es la vía y por qué la variante "solo i18n del mod" NO alcanza:

| Canal | ¿Mod puede aportar hoy? | Mecanismo |
|-------|-------------------------|-----------|
| Componentes custom | ✅ | `modsComponents/` → sync → glob import |
| Composables | ✅ | `modsComposables/` → sync → dynamic import |
| Layouts (schema, endpoint) | ✅ | `config/layouts/` → sync → DB → `fetchedLayoutConfig` |
| Definiciones de objeto | ✅ | `objects/` → sync → DB |
| **Mapeo de errores (`ERROR_PATTERNS`)** | ❌ | Array hardcodeado en `useFriendlyErrors.ts` |
| **Keys `friendlyErrors.*` (i18n)** | ❌ | Hardcodeadas en `layout/lang/es_CL@RecordDetail.json`; **el `lang/` de los mods NO se sincroniza al layout** (sync solo copia `modsComponents/`/`modsComposables/`) |

Conclusión: hoy NO existe canal para que un mod aporte ni patterns ni i18n keys de error → "que lo maneje el mod" exige construir el canal genérico en core **una vez**. El de menor costo y con precedente (UNIQUE_VIOLATION) es **extensions GraphQL** (A). La variante i18n quedaría a medias (el match seguiría dependiendo de un pattern en core, y las traducciones del mod ni siquiera se sincronizan).

### Análisis del payload-fix (`ce94be7`, referencia cruzada a TICKET-067)

Contexto de la rama base `UPONE-1271-recorddetail-payload-fix`, evaluado en intake:
- Es un fix de **core legítimo y genérico** (≠ el friendly-error): `RecordDetail.handleSubmit` inyectaba en el payload de `createInstance` los campos **virtuales** que el clone (`prefilledModal`) prellena desde la fila del listado (FK display siblings como `institutionName`, objetos de relación, `extended`) → Prisma los rechazaba ("Unknown field"). El fix filtra a campos reales (`baseFields ∪ customFields`) + allowlist de owner polimórfico, vía helper puro `layout/src/layouts/recordDetailInitialData.ts`.
- **Decisión**: SE QUEDA (es core correcto). Esta mejora solo descarta `5dd5854` (friendly-error), que cuelga por encima del payload-fix.
- **Punto menor anotado** (fuera de alcance de este ticket): el allowlist `['ownerType','ownerId','recordType']` está hardcodeado en core (`recordDetailInitialData.ts`); es defendible (estructural de plataforma), pero idealmente derivaría de metadata del schema.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch (mod) | layer:mod — **la rama actual `UPONE-1270-curriculum-clone-version`** (ya checked out en `mods/curriculum-design`). Flujo autocontenido + `npm run sync`. No crear rama nueva |
| Core/layout | **NO se toca.** Mod-only (`DEC-LOCAL-01`). `layout` y `object-manager` quedan fuera de scope; no se cambia de rama en `layout` |
| Base branch | develop |
| DB state | Sin migraciones. Requiere un Curriculum raíz existente para gatillar el conflicto de linaje al probar |
| Services | object-manager (4000), suite (3000), redis (6379). Tras cambio del mod: `npm run sync` + reiniciar object-manager |
| Test data | Curriculum raíz con `(institutionId, code)` ya usado, para forzar `CURRICULUM_LINEAGE_DUPLICATE` al crear otra raíz |

> **Branching (mod-only, RULE-dev-004)**: trabajo `layer:mod` → flujo autocontenido en `mods/curriculum-design` + `npm run sync`. NO usa la rama de épica core ni toca `layout`. Commits con prefijo `UPONE-1270` (DET-19). El `npm run sync` regenera el destino en `object-manager/src/graphql/resolvers/mods/curriculum-design/` — ese diff de sync es esperado, no es "tocar core" (es output de build del mod).
> La topología de ramas `UPONE-1271-recorddetail-payload-fix` / `UPONE-1270-friendly-error-lineage` pertenecía al enfoque A (core) — **fuera de scope** en este ticket mod-only.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El destino sincronizado de resolvers/helpers de mods en object-manager está gitignored (`.gitignore:78 src/graphql/resolvers/mods/*`) → un fix mod-only via `sync:logic` no produce cambio commiteable en core ("cero core" por construcción). | LLM | S1 | refined | RULE-mods-053 |
| L2 | `sync:logic` (Phase 4: resolvers + typeDefs) sincroniza la lógica del mod SIN el upsert a DB del full `npm run sync` → evita el drift de objetos/capabilities ajeno. Vía correcta para cambios de `logic/` puro. | LLM | S1 | refined | RULE-mods-054 |
| L3 | El OM de `:4000` corre como `npm start` (PID 881, `node src/index.js` plano), NO nodemon. `sync:logic` escribe el archivo pero el proceso en memoria NO recarga → un cambio del mod NO surte efecto en runtime hasta **reiniciar OM**. Test a nivel-datos verde convive con runtime viejo (vindica "UI TC no se cierra por override"). Reinicio obligatorio antes del smoke. | dev (smoke manual) | S2 | refined | RULE-dev-011 |
| L4 | **Cadena real del friendly-error de unicidad (UPONE-1216)**: `object-manager/src/index.js` `formatError` (L72-82) intercepta TODO mensaje con "Unique constraint failed" y lo NORMALIZA — extrae el campo con un regex **anclado al FINAL** del string y reescribe a `Unique constraint failed on the fields: (\`campo\`)` + `extensions.code=UNIQUE_VIOLATION`. Por eso el mensaje del mod debe TERMINAR con esa frase Prisma (sin texto después) o la extracción falla y devuelve el bare "Unique constraint failed" (sin backtick) → el front cae al default. El front (`useFriendlyErrors:191`) mapea la forma canónica a `uniqueness`. El acople real del mod es a `formatError`, NO al regex del front directo (eso fue el primer intento fallido). | LLM (debug del log OM tras smoke fallido) | S2 | discarded | — |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| F1 | Verificar el smoke UI tras `sync:logic` sin reiniciar el OB de `:4000` | El OM vivo (PID 881) es `npm start` plano (sin watch); seguía con el código viejo en memoria → la UI mostró el mensaje viejo ("Este registro fue modificado por otra persona") pese a que el archivo synced en disco ya tenía el mensaje nuevo | Tras `sync:logic` de un cambio de `logic/`, reiniciar OM antes del smoke (ver L3) |

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-06-17 | false → super | dev trigger "super autopilot" (HOR-079, por-ticket, no se detiene hasta terminar) | intake-explore (este step) |

### Plan de sessions (preplanificacion)

2 sessions previstas (mod-only). **Esqueleto producido por `intake-explore`.** El detalle final
(tasks asignadas, gate criteria especificos) lo completa `design-improvement` al generar el spec.
Cada session puede subdividirse o colapsarse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Mod alinea su mensaje con el pattern `uniqueness` de core: reescribir el string de `assertUniqueLineageRoot` en `lineageUniqueness.js` (conservando `CURRICULUM_LINEAGE_DUPLICATE` + comentario del acople); `npm run sync`; test de regresión en `curriculum-lineage.test.ts` (mensaje matchea `uniqueness`, no `concurrency`, y conserva el code) | 1 | T2 | ~2-3 (reescribir mensaje + comentario + test + sync) | auto | mensaje matchea `/Unique constraint.*failed.*\`(\w+)\`/i` y NO `/version.*conflict/i`; tests existentes `toThrow(/CURRICULUM_LINEAGE_DUPLICATE/)` verdes; `vitest run` del mod verde; sync sin errores |
| S2 | Verificación E2E UI (TC-1): crear Curriculum raíz con `(institutionId, code)` duplicado en la suite muestra el toast "Ya existe un registro con ese valor.", no "modificado por otra persona". Smoke Playwright + regression del mod | 2 | T3 | ~2 (smoke UI Playwright + regression mod) | ⚑ fuerte | TC-1 PASS con evidencia (screenshot del toast + payload del error); mensaje correcto; regression del mod sin delta negativo |

**Notas del esqueleto**:
- **Dependencia**: S2 (E2E) depende de S1 desplegado (mod synceado a object-manager + OM reiniciado).
- **Branching (RULE-dev-004 — mod-only)**: trabajo `layer:mod` → flujo autocontenido + `npm run sync`, NO usa la rama de épica core. El mod está en `UPONE-1270-curriculum-clone-version` (ya checked out). NO se toca `layout`/`object-manager` como fuente; la rama `UPONE-1271-recorddetail-payload-fix` y el descarte de `UPONE-1270-friendly-error-lineage` quedan FUERA de este ticket (eran del enfoque A). La guarda de inicio de execute verifica rama != protegida.
- **Sin migración DB**: todo es un string de `logic/` + su test. S2 requiere un Curriculum raíz preexistente para forzar el conflicto.
- **UI TC no se cierra por override** (feedback del dev): TC-1 afecta UI runtime → exige smoke real (toast visible), no solo verificación a nivel-datos. Por eso S2 es ⚑ fuerte / T3.

### Session 1 — 2026-06-17 — Mod: alinear mensaje + sync + test [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: Reescribir el mensaje del guard de unicidad por linaje para que matchee el pattern `uniqueness` de core (no el de concurrencia), conservando el code; cubrir con test de regresión; sincronizar al destino.

**Tasks completadas**:
- [x] S1.T1 — Reescribir el string de `assertUniqueLineageRoot` para matchear el pattern `uniqueness` (conservando `CURRICULUM_LINEAGE_DUPLICATE`) + comentario del acople al regex de core
- [x] S1.T2 — Test de regresión en `curriculum-lineage.test.ts`: el mensaje matchea `uniqueness`, NO `concurrency`, y conserva el code (TC-2 + TC-3)
- [x] S1.T3 — `npm run sync` + verificar el destino sincronizado en object-manager
- [x] S1.GATE — Gate de sync Session 1 (T2): persistir + `vitest run` del mod + quality review + decisión

**Validación del tier**:
- **T2 — `vitest run` del mod**: 43 archivos / **729 tests PASS** (incl. `curriculum-lineage.test.ts` 15/15: TC-2 y TC-3 nuevos verdes). Sin delta negativo vs baseline.
- **Mensaje verificado** (replica de regex de core, S1.T1): matchea `/Unique constraint.*failed.*\`(\w+)\`/i` (campo `code`), NO `/version.*conflict/i`; conserva `CURRICULUM_LINEAGE_DUPLICATE`.
- **Sync** (`sync:logic`, Phase 4): 1 archivo actualizado, 0 errores; destino `object-manager/.../helpers/lineageUniqueness.js` refleja el mensaje nuevo. **Cero core tracked**: el destino está gitignored (`.gitignore:78 src/graphql/resolvers/mods/*`); el repo del mod tiene solo `logic/helpers/lineageUniqueness.js` + `tests/integration/curriculum-lineage.test.ts`.

**Discoveries / Learns nuevos**:
- L1: el destino sincronizado de resolvers/helpers de mods en object-manager está **gitignored** (`.gitignore:78`). Implica que un fix mod-only via `sync:logic` no produce ningún cambio commiteable en core → "cero core" se cumple por construcción (el runtime levanta el archivo synced local).
- L2: `sync:logic` (Phase 4: resolvers + typeDefs) sincroniza la lógica del mod SIN el upsert a DB del full `npm run sync` → evita el drift de objetos/capabilities ajeno (que en TICKET-065 daba exit 1). Vía correcta para cambios de `logic/` puro.
- L3: el acople mod→core es por string-matching del regex `uniqueness` de core. Mitigado con comentario en el helper + TC-2 que replica el regex y ancla la forma del mensaje (avisa si core cambia el pattern). Sigue siendo frágil (DEC-LOCAL-01) — Backlog B1 (enfoque A) es el fix robusto a futuro.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline)
**Tier de revisión**: standard (S1, T2, gate auto)
**Resultado global**: pass

| # | Dimensión | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad de código | pass | Cambio mínimo y localizado (un `throw`); comentario explica el acople intencional |
| 2 | Lint | pass | Sin nuevos imports ni símbolos; estilo consistente con el helper |
| 3 | Tipado | n/a | JS del mod (sin TS en el helper) |
| 4 | Testing | pass | TC-2 (match de pattern) + TC-3 (regresión code) verdes; 729/729 suite |
| 5 | Escalabilidad | warn | Acople frágil al regex de core (genérico, no por-mod) — aceptado en DEC-LOCAL-01; B1 es la vía escalable |
| 6 | Mantenibilidad | pass | Comentario + test anclan el contrato; futuro dev entiende por qué el texto inglés no se "limpia" |
| 7 | Claridad | pass | Mensaje legible; el code y el detalle de dominio se conservan para logging |
| 8 | a11y | n/a | Sin UI nueva |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | pass | Es justamente el path de error; el throw conserva semántica (rechazo de raíz duplicada) |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Mutation testing (DET-31)**: no corrido — el cambio es un string literal + un test que replica el regex de core (no hay branching lógico nuevo que mutar de forma significativa). Warn-first, no bloqueante en T2. La cobertura del guard (branching `previousVersionId`/`asNewVersion`) ya estaba medida en TICKET-065 (score 73.91, sin cambios de lógica aquí).

### Session 2 — 2026-06-17 — Verificación E2E UI [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Smoke real en la suite: crear un Curriculum raíz con `(institutionId, code)` duplicado y confirmar que la UI muestra "Ya existe un registro con ese valor." (no "modificado por otra persona"). Requiere OM reiniciado con el código synced (hecho en S2).

**Tasks completadas**:
- [x] S2.T1 — Smoke UI: crear raíz duplicada en la suite → verificar el toast correcto (TC-1). Captura de evidencia
- [x] S2.T2 — Regression del mod (`vitest run`) sin delta negativo
- [x] S2.GATE — Gate de sync Session 2 (T3, ⚑ fuerte): persistir evidencia + quality review + decisión de cierre

**Prerrequisito resuelto en S2 (discovery L3/F1)**: el OM de `:4000` corría como `npm start` plano (PID 881, pre-sync) → no tomaba el cambio. Se reinició OM (kill + `npm start` background) tras `sync:logic`; `:4000` responde y sirve con el código nuevo. El smoke corre contra este OM reiniciado.

**Iteración de runtime (L4/F1)**: el primer smoke (OM con el mensaje "…on the field `code`." + texto de dominio después) mostró "Ocurrió un error inesperado". Causa raíz vía log del OM: `formatError` (UPONE-1216) extrae el campo con regex **anclado al final** → con texto después, falla → bare "Unique constraint failed" (sin backtick) → front al default. Fix: el mensaje del guard ahora **termina** con `Unique constraint failed on the fields: (\`code\`)`. Re-sync + reinicio OM. Segundo smoke: ✓.

**Validación del tier (T3, ⚑ fuerte)**:
- **TC-1 PASS (smoke UI real)**: clonar "Minor en Matemática Aplicada" con code `aa11` (duplicado) → modal "Error al Crear Curriculum": **"Ya existe un registro con ese valor."** + Ubicación: **Code** + **"Usa un valor diferente."**. NO "Este registro fue modificado por otra persona". Evidencia: screenshot del dev (2026-06-17).
- **Cadena verificada end-to-end**: guard del mod (msg termina en formato Prisma) → OM `formatError` normaliza a `Unique constraint failed on the fields: (\`code\`)` + `extensions.code=UNIQUE_VIOLATION` → front `useFriendlyErrors:191` mapea a `uniqueness` (traducción ES). Confirmado por log del OM (`/tmp/om-restart-ticket073b.log`) + simulación en node + smoke UI.
- **Regression**: `vitest run` del mod 43 archivos / **729 tests PASS** (sin delta negativo). TC-2 (replica formatError + front regex) y TC-3 (conserva code + termina en frase Prisma) verdes.

**Discoveries / Learns nuevos**: ver L3 (OM no recarga sin reinicio) y L4 (cadena real `formatError` UPONE-1216) en `## Learns`.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline)
**Tier de revisión**: exhaustive (S2, T3, ⚑ fuerte, user-facing verificado en runtime)
**Resultado global**: pass

| # | Dimensión | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad de código | pass | Cambio localizado al `throw`; comentario extenso documenta la cadena `formatError`→front y por qué la frase Prisma va al final |
| 2 | Lint | pass | Sin nuevos imports/símbolos |
| 3 | Tipado | n/a | JS del mod |
| 4 | Testing | pass | TC-1 smoke UI real + TC-2 (cadena formatError) + TC-3; 729/729 |
| 5 | Escalabilidad | warn | Acople a `formatError` (UPONE-1216) + regex del front, aceptado en DEC-LOCAL-01; B1 (extensions) es la vía robusta a futuro |
| 6 | Mantenibilidad | pass | Comentario + tests anclan el contrato (frase Prisma al final); F1/L4 documentan el porqué para el próximo dev |
| 7 | Claridad | pass | Mensaje user-facing correcto y en español; detalle de dominio en logs |
| 8 | a11y | n/a | Sin UI nueva (reusa el modal existente) |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | pass | Path de error; rechazo de raíz duplicada intacto, mensaje correcto en runtime |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Mutation testing (DET-31)**: no corrido (igual que S1: string literal + tests que replican la cadena de core; sin branching lógico nuevo). Warn-first, no bloqueante. La verificación empírica en runtime (smoke UI) es la garantía fuerte de esta session.

## Teaching — Intake

**Status**: done (v2 HTML, generado en autopilot super — DET-21 / REQ-05).
**Archivo**: [`TICKET-073.teach/teach-intake.html`](TICKET-073.teach/teach-intake.html)

## Teaching — Close

**Status**: done (v2 HTML, generado en autopilot super — DET-22 / REQ-05).
**Archivo**: [`TICKET-073.teach/teach-close.html`](TICKET-073.teach/teach-close.html)

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-IMPROVE-01 (al violar unicidad de linaje, la UI muestra el mensaje genérico de unicidad de core, no el de concurrencia) | TC-1, TC-2 | manual + auto | **COVERED** (TC-2 auto PASS S1; TC-1 smoke UI PASS S2 con evidencia) |
| REQ-PRESERVE-01 (el guard sigue rechazando raíces duplicadas con code `CURRICULUM_LINEAGE_DUPLICATE` — tests existentes verdes) | TC-3 | auto | **COVERED** (TC-3 PASS, 729/729 en S1) |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | Crear Curriculum raíz con (institutionId, code) duplicado muestra el mensaje correcto en la UI | REQ-IMPROVE-01 | manual | yes | Existe un Curriculum raíz con ese code en la institución | Clonar "Minor en Matemática Aplicada" con code `aa11` (ya existente) vía suite | Toast "Ya existe un registro con ese valor." / "Usa un valor diferente." (NO "Este registro fue modificado por otra persona") | Modal "Error al Crear Curriculum": "Ya existe un registro con ese valor." + Ubicación: Code + "Usa un valor diferente." | Smoke manual del dev (screenshot del modal, 2026-06-17) tras OM reiniciado con el código synced | pass | S2 | — |
| TC-2 | El mensaje lanzado por `assertUniqueLineageRoot` matchea el pattern `uniqueness` de core y NO el de `concurrency` | REQ-IMPROVE-01 | auto | no | — | Unit que aplica los regex de core al mensaje del mod | matchea `/Unique constraint.*failed.*\`(\w+)\`/i` = true; `/version.*conflict/i` ANTES de `uniqueness` no aplica (uniqueness gana por orden); replica del orden de ERROR_PATTERNS confirma category `uniqueness` | uniqueness=true (campo `code`); concurrency=false | `curriculum-lineage.test.ts` TC-2 PASS (vitest run 729/729) | pass | S1 | S1.T1, S1.T2 |
| TC-3 | El guard sigue rechazando raíz duplicada conservando el code (regresión) | REQ-PRESERVE-01 | auto | no | — | Tests existentes `curriculum-lineage.test.ts` (`toThrow(/CURRICULUM_LINEAGE_DUPLICATE/)`) | Verdes sin cambios; el code sigue presente en el mensaje | 15/15 del archivo verdes; code presente | `curriculum-lineage.test.ts` TC-3 PASS (vitest run 729/729) | pass | S1 | — |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| — | — | — | — | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| curriculum-design | `vitest run` (+ tests/integration stubPrisma) | — | — | — |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | **Enfoque A (extensions GraphQL) — el mod gobierna el texto exacto** vía `extensions.userMessage` + passthrough genérico en core. Es el fix correcto a futuro si varios mods necesitan su propio mensaje. Parqueado por `DEC-LOCAL-01` (cero core ahora) | — | — | Evidencia completa en H1–H5 + discovery del intake (canal, formatError, precedente UNIQUE_VIOLATION) | Nuevo ticket `layer:core`; añadir passthrough en `useFriendlyErrors` (antes de ERROR_PATTERNS) + cablear `RecordDetail.vue`; migrar el mod a `GraphQLError` con extensions | could |
| B2 | **Gemelo `modalityDefault`** (`MODALITY_DOUBLE_DEFAULT`): hoy cae en el default genérico "Ocurrió un error inesperado" (NO engañoso — no matchea concurrencia). No es el bug reportado. Podría recibir el mismo tratamiento (alinear a un pattern de core), pero "double default" no encaja limpio en `uniqueness` | — | — | `mods/curriculum-design/logic/helpers/modalityDefault.js:71-77` | Decidir mapping aceptable (uniqueness vs validation) y aplicar el mismo patrón mod-only | should |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|
| `47ea2c0` | 2026-06-17 | `UPONE-1270-S1 fix(curriculum-design): mensaje de unicidad por linaje matchea pattern uniqueness de core` | S1.T1, S1.T3 | REQ-IMPROVE-01 |
| `a46e94e` | 2026-06-17 | `UPONE-1270-S1 test(curriculum-design): regresion del mensaje de unicidad por linaje` | S1.T2 | REQ-IMPROVE-01, REQ-PRESERVE-01 |
| `ed8d4de` | 2026-06-17 | `UPONE-1270-S2 fix(curriculum-design): el mensaje de unicidad termina con el formato Prisma para formatError` | S2 (iteración runtime) | REQ-IMPROVE-01 |
| `1e65613` | 2026-06-17 | `UPONE-1270-S2 test(curriculum-design): TC-2 replica la cadena real formatError + front regex` | S2 | REQ-IMPROVE-01, REQ-PRESERVE-01 |

> Commits locales en el repo del mod (`mods/curriculum-design`, rama `UPONE-1270-curriculum-clone-version`). **Sin push** (super: el push siempre pregunta). El sync a object-manager es gitignored → sin commit en core.

## Summary

**Qué se resolvió**: el guard de unicidad por linaje (`assertUniqueLineageRoot`, mod `curriculum-design`) mostraba en la UI un mensaje engañoso de concurrencia ("Este registro fue modificado por otra persona") al crear un Curriculum raíz con código duplicado. Ahora muestra el mensaje correcto **"Ya existe un registro con ese valor." / "Usa un valor diferente."**, **sin tocar core** (restricción del dev, DEC-LOCAL-01).

**Cómo (mod-only)**: el mensaje que lanza el guard se reescribió para que **termine** con el formato Prisma `Unique constraint failed on the fields: (\`code\`)`. Eso engancha la cadena existente: `formatError` del object-manager (UPONE-1216) lo normaliza a la forma canónica + `extensions.code=UNIQUE_VIOLATION`, y el front (`useFriendlyErrors`) lo mapea a la categoría `uniqueness` (con traducción ES ya existente). Se conserva el code `CURRICULUM_LINEAGE_DUPLICATE` (tests + logging).

**Alcance real**: 2 archivos del mod (`logic/helpers/lineageUniqueness.js` + `tests/integration/curriculum-lineage.test.ts`). Cero archivos de core/object-manager commiteables (el destino synced está gitignored).

**Verificación (DET-13)**: `vitest run` del mod 729/729 (incl. TC-2/TC-3 nuevos); smoke UI real (TC-1 PASS con screenshot) tras reiniciar el OM; reviewer aislado de cierre → **approve** (0 violaciones de scope, rama de ticket correcta).

**Iteración destacada**: el primer mensaje (campo a mitad del string) falló en runtime porque `formatError` extrae el campo con un regex anclado al final → bug encadenado diagnosticado vía log del OM. Capturado como L4 → **RULE-curriculum-design-005**.

**Decisiones**: DEC-LOCAL-01 (mod-only, mensaje genérico; enfoque A parqueado en B1). DEC-LOCAL-02 (necessity: reduce).

**Pendiente / no bloqueante**:
- **Push** de los 4 commits del mod (rama `UPONE-1270-curriculum-clone-version`) — requiere OK del dev (en super el push siempre pregunta).
- Backlog **B1** (enfoque A — extensions, si varios mods necesitan su texto exacto) y **B2** (gemelo `modalityDefault`, hoy genérico no engañoso) — `could`/`should`, no bloquean el cierre.
- El OM quedó corriendo en background (relanzado durante S2) con el código nuevo.

**SP**: published 3 (story completa) · estimated 1 · executed 2 (`sessions-heuristic`; +1 vs estimado por la iteración de runtime no anticipada).

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-17 | 2026-06-17 |
| intake-explore | done | 2026-06-17 | 2026-06-17 |
| teach-intake | done | 2026-06-17 | 2026-06-17 |
| design-improvement | done | 2026-06-17 | 2026-06-17 |
| request-execute | done | 2026-06-17 | 2026-06-17 |
| request-close | done | 2026-06-17 | 2026-06-17 |
