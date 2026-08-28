---
id: TICKET-070
project: up1
type: ticket
status: closed
work_type: fix
module: curriculum-design
autopilot: autonomous
---

# Fix: crear Plan (Curriculum) desde la UI falla — `createInstance` envía los campos del RecordType a la tabla base

## Request

Follow-up del **TICKET-069** (R4, defecto independiente del picker de dueño): crear un **Plan de estudios** (`Curriculum`, `recordType = Plan`) desde la UI **falla siempre**. El form envía `objectType = Curriculum` (tabla base) con un `data` plano que incluye los campos del RecordType Plan (`progression`, `totalCredits`, `totalPeriods`, `periodType`); esos campos no son columnas de la base `curriculum` (viven en la tabla de extensión 1:1 `rt__Plan__curriculum`). Prisma rechaza con *Unknown argument `progression`* y el usuario ve *«La información proporcionada no es válida. Ubicación: > Progression»*.

**Solución elegida (decisión del dev, 2026-06-17): camino D-delegar** — mutation custom del mod curriculum-design que arma el alias `rt__<recordType>__curriculum` y **delega** en el `createInstance` de core, con el form genérico ruteado vía `customEndpoint`. Conserva el form único con dropdown de tipo + el picker de dueño, es 100% mod-only y reusa toda la lógica de core (split/validación/eventos/audit).

Familia **UPONE-1268**. Causa raíz, alternativas evaluadas (A front / B core / C layouts por-RT / D mod) y la observación de por qué el fix en core (B) sería estructuralmente mejor están documentadas en:
`uplanner/specs/up1/core/createinstance-recordtype-fields-base-table.md`.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (mod curriculum-design) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (logic + config/layouts). Toca object-manager solo por **delegación** (llama a `createInstance`, sin modificarlo). |

## Creation scope

Ambos `false`: no se crea UI nueva (el layout de create ya existe; se le agrega un bloque `customEndpoint`) ni data nueva (`rt__Plan__curriculum` ya existe). No aplica `design-draft`.

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | no | — |

## Triage

Causa raíz **confirmada por inspección de código + reproducción en red** (TICKET-069). No quedan hipótesis abiertas; el ticket es de implementación de la solución ya diseñada.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El submit del form de Curriculum lleva `objectType = Curriculum` (base) y core no separa los campos del RT → `prisma.curriculum.create()` plano falla en `progression` | ✓ confirmada | Red: `POST /graphql CreateInstance` → `Invalid prisma.curriculum.create()... Unknown argument progression`. `instance.resolver.js:2508-2682` (RT early-return) solo entra si `objectType` matchea `rt__…` (`parseRecordTypeFileName`, `:2509`); con `Curriculum` no entra. |
| H2 | El RT early-return de core YA hace el split correcto (base/rt/ext + cast de int) cuando se lo invoca con el alias `rt__Plan__curriculum` | ✓ confirmada | `instance.resolver.js:2567-2668` (4 buckets + filas base/rt/ext), `:2636` setea discriminador, `:2656` `coerceRtFields` castea integers. Las 6 CurricularSection (UPONE-1035) ya crean por el alias y funcionan. |
| H3 | El picker polimórfico de dueño se rompe si se usa el wizard RT-aware nativo (regenera el schema) → por eso D conserva el form autorado y rutea a mutation custom | ✓ confirmada | `RecordDetail.vue:1383-1392` reconstruye el schema desde field-defs; el `autoPopulate`/`useOwnerIdOptions` vive en el layout (`useOwnerIdOptions.ts:12`), no en la field-def. |
| H4 (discovery durante diseño) | El engine soporta `customEndpoint.variables` con `source: "formData"` (objeto completo) → bastaría 1 línea genérica | ✗ refutada → ver **L1** | `RecordDetail.vue:3697-3705`: el resolver de variables solo matchea `formData.<campo>` e `instanceId`; otro string cae al `else` y se envía LITERAL. El whole-form NO existe. Camino mod-only real = `inputVariable: "data"` + `inputVariableType: "JSON!"` + enumerar campos (patrón `serviceaccount-create.json`). |

### Context found

- **Rules del modulo**: RULE-dev-004 (aplicada en TICKET-069); validar RULE-dev de layouts/resolvers de mod.
- **Bugs abiertos**: ninguno registrado en KB para este caso (escalado vía doc de core).
- **Specs relacionados**: `uplanner/specs/up1/core/createinstance-recordtype-fields-base-table.md` (doc de causa raíz + caminos + decisión). `core/SPEC-object-manager-hu1-prefillfrom-createinstance.md`.
- **Docs relevantes**: patrón probado `createSyllabusOffering` (`mods/curriculum-design/logic/syllabus-offering.resolver.js` + `default_Offering_syllabus_create.json` con `customEndpoint`).
- **Warnings**:
  - **DET-16 (propagación)** — caso latente con la misma forma fuera de scope: `engagement_Activity_service_create.json` (uengagement) mete `activityTypeId` (campo de `rt__Service__Activity`) en un layout `objectName=Activity` (base). No se corrige aquí; reportar a uengagement.
  - El resolver del mod **debe delegar, no reimplementar** el split (si reimplementa, duplica lógica de core → divergencia, y rompe la compatibilidad con el MCP que crea RTs vía el alias `typedRecordName`).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | rama de épica del mod (UPONE-1261-academic-program / la vigente de curriculum-design) — NO `develop` |
| Base branch | develop |
| DB state | tenant UPU con seed de curriculum-design (incluye `rt__Plan__curriculum`) |
| Services | object-manager (`:4000` GraphQL) + suite (`:3000`) |
| Test data | rol Admin (Consultor no puede crear Curriculum); una Institution y un AcademicProgram para el picker de dueño |

### Reproduction steps

1. Suite (`:3000`), tenant UPU, rol Admin. App **Curriculum Design** → pestaña **Planes de Estudio** → listado *Currículos*.
2. **+ Crear registro** → **Tipo = Plan** (aparecen los campos Plan-only por `conditions`). Completar Nombre, Código, Estado, Institución, Tipo de dueño, Dueño, Progresión, Créditos, etc. → **Guardar**.
3. **Resultado actual**: modal *«…Ubicación: > Progression…»*; red `CreateInstance` HTTP 200 con `errors` → `Invalid prisma.curriculum.create() ... Unknown argument progression`.
   **Esperado tras el fix**: registro creado (fila `curriculum` + fila `rt__Plan__curriculum`), sin error, con `totalCredits`/`totalPeriods` persistidos como integer.

## Solución elegida — D-delegar (mod-only)

Tres piezas, todas en el mod:

1. **`mods/curriculum-design/logic/curriculum-create.schema.graphql`**
   `extend type Mutation { createCurriculumWithRecordType(data: JSON!): Curriculum! }`.

2. **`mods/curriculum-design/logic/curriculum-create.resolver.js`** — *adapter delgado*:
   - lee `recordType` del `data`,
   - arma el alias `rt__${recordType}__curriculum`,
   - **delega** en el `createInstance` genérico de core con ese `objectType` vía dynamic import dual-path (patrón ya usado por `sectionValidation.resolver.js:51-67` / `polymorphicUpdate.resolver.js` en el mismo mod — `loadGenericInstanceMutation()`), preservando `withObjectAuth`/`withEventPublish`,
   - `createInstance` retorna `InstanceResult { id, data, extended }` (RULE-mods-027), no un `Curriculum` plano → el adapter **reshapa** a `{ id, ...result.data }` para satisfacer `responseFields: ["id","name"]`. Esto es traducción de contrato, **no lógica de negocio**. **Sin `prisma.create` propios.**

3. **`mods/curriculum-design/config/layouts/default_Curriculum_create.json`** — agregar bloque `customEndpoint` (forma corregida tras **L1** — el `source: "formData"` whole-object NO existe en el engine):
   ```json
   "customEndpoint": {
     "mutation": "createCurriculumWithRecordType",
     "inputVariable": "data",
     "inputVariableType": "JSON!",
     "responseFields": ["id", "name"],
     "variables": {
       "name":          { "source": "formData.name",          "type": "String" },
       "recordType":    { "source": "formData.recordType",    "type": "String" },
       "code":          { "source": "formData.code",          "type": "String" },
       "status":        { "source": "formData.status",        "type": "String" },
       "institutionId": { "source": "formData.institutionId", "type": "ID" },
       "ownerType":     { "source": "formData.ownerType",     "type": "String" },
       "ownerId":       { "source": "formData.ownerId",       "type": "ID" },
       "appearsInDiploma": { "source": "formData.appearsInDiploma", "type": "Boolean" },
       "externalId":    { "source": "formData.externalId",    "type": "String" },
       "progression":   { "source": "formData.progression",   "type": "String" },
       "totalCredits":  { "source": "formData.totalCredits",  "type": "Int" },
       "totalPeriods":  { "source": "formData.totalPeriods",  "type": "Int" },
       "periodType":    { "source": "formData.periodType",    "type": "String" }
     }
   }
   ```
   El engine empaqueta los campos mapeados en un único objeto y emite `mutation($data: JSON!){ createCurriculumWithRecordType(data: $data){ id name } }` (`RecordDetail.vue:3734-3737`, `:3661`). El form genérico (RecordDetail) renderiza el schema autorado (picker de dueño + `conditions` intactos) y submitea a la mutation del mod en vez de `createInstance`. La generalidad sobre **recordType** se conserva (el resolver lee `data.recordType` → alias, sin tocar el resolver por tipo nuevo); el costo es que un **campo** nuevo exige una línea en `variables` (simétrico al schema del form, que ya enumera cada campo). Refuerza por qué camino B escala mejor.

**Por qué funciona y escala**: core ya splittea cuando recibe el alias; el resolver del mod solo traduce "form plano de Curriculum + recordType" → "createInstance(alias)". Los tipos pueden crecer (Plan, Minor, …futuros) sin nuevas mutations: el resolver es genérico sobre `recordType`. Solo el form sigue declarando los campos/`conditions` por tipo (inherente).

### Disciplina obligatoria (mantiene válida la decisión)

- **Delegar, no reimplementar** el split (DET-32 reuse).
- **Cero lógica de negocio** en la mutation UI-only: cualquier default/validación de Curriculum debe vivir donde TODOS los clientes pasan (path `createInstance(alias)` de core o hook de mod sobre él), no en la mutation — si no, diverge del MCP/REST/n8n.

### Rollback (DET-8)

Reversible por config + revert de 2 archivos: quitar el bloque `customEndpoint` del layout (el form vuelve a `createInstance` base) y remover el `.resolver.js`/`.schema.graphql`. No hay migración ni cambio de datos.

## Alternativas evaluadas (descartadas para este ticket)

| Camino | Qué es | Por qué no ahora |
|--------|--------|------------------|
| A (front) | RT-aware wizard que mergea campos del RT sobre el schema autorado en vez de regenerarlo | Toca repo `layout` (no mod-only); depende del equipo de front. Es la solución genérica correcta a futuro. |
| B (core) | `createInstance` deriva el alias desde `objectType=<base>` + `data.recordType` | Toca object-manager core; mayor blast radius. **Es lo estructuralmente mejor** (ver observación). |
| C (layouts por-RT) | `canCreateObjectName: rt__…` por tipo (patrón de las 6 secciones) | No escala: `canCreateObjectName` es valor único / `modalActionButtons` capado a 3, manual por tipo. |

### Observación registrada — por qué el core (B) sería mejor, y qué deuda asumimos con D

D resuelve el síntoma en Curriculum; el problema real es **genérico de la plataforma**. B es superior porque: (1) lo arregla **una vez para todos** los objetos con RecordType (incl. el caso latente `Activity/Service` de uengagement); (2) **uniformidad entre clientes** (UI/MCP/REST/n8n) — el MCP ya crea RTs vía el alias (`typedRecordName`, `mcp/src/mods/curriculum-design/sections.ts:15`), y si la mutation del mod acumulara lógica los Planes creados por UI vs MCP divergirían; (3) sin mutation bespoke por objeto ni acoplamiento mod→core. **Deuda asumida con D**: una mutation a medida por objeto-con-RT + acoplamiento + mantener el resolver *thin*. **Seguimiento**: abrir ítem en core para promover el split base→alias dentro de `createInstance` (B); cuando exista, la mutation D-delegar se vuelve redundante y se retira.

## Testing

### Test cases (preliminares — se ejecutan en execute, DET-25)

| # | Case | REQ | Affects UI | Expected | Actual | Evidence | Status |
|---|------|-----|------------|----------|--------|----------|--------|
| TC-1 | Crear Plan con campos Plan-only vía la mutation que invoca el form | REQ-FIX-01 | yes | Registro creado (fila `curriculum` + `rt__Plan__curriculum`), sin error Prisma | `createCurriculumWithRecordType(data:{recordType:Plan,...})` → id `cmqiaweh…`, name OK. Sin `Unknown argument progression`. Reproduce+arregla el bug original | GraphQL autenticado S1.T4 (`/tmp/t070_smoke.mjs` R1 → TC1.ok=true) **+ confirmado en browser por el dev**: Plan "44" (id `cmqibqsqg…`) → fila base + `rt__Plan__curriculum` con `progression="asd"`, `totalCredits=4` (number), `totalPeriods=44` (number), `periodType="Quarter"` | **pass (browser-confirmado)** |
| TC-2 | Crear Minor desde UI (el form manda los campos Plan-only = null) | REQ-REGRESSION-02 | yes | Creado OK, no rompe | **Bug cazado por el dev en smoke UI real (L3)**: el form único manda progression/totalCredits/… = null al elegir Minor → core los rutea a la base → `Unknown argument progression`. **Fix**: el adapter dropea null/''/undefined antes de delegar (commit `7b33748`). Repro API con payload-UI (Plan-only=null) → ahora OK | repro Minor-con-Plan-only-null → OK; unit `REGRESIÓN Minor (TICKET-070)`; **confirmado en browser por el dev**: Minor "333" (id `cmqibq9bs…`) → fila base + `rt__Minor__curriculum` sin campos Plan-only; nada filtrado a la base | **pass (browser-confirmado)** |
| TC-3 | `createInstance(rt__Plan__curriculum)` directo (path MCP/programático) | REQ-REGRESSION-01 | no | Crea base+rt, sin regresión | `createInstance(objectType:rt__Plan__curriculum)` directo → id `cmqiawel…` OK | smoke R1 → TC3.ok=true | pass |
| TC-4 | `totalCredits`/`totalPeriods` persisten como integer | REQ-FIX-02 | no | Valores int (no string) vía `coerceRtFields` | `getInstance(rt__Plan__curriculum)` → totalCredits=180 (number), totalPeriods=8 (number) | smoke R1 → TC4.ok=true (type==='number') | pass |

> **Nota de evidencia (DET-13 / feedback UI-TC)**: la validación se hizo end-to-end contra object-manager vivo (`:4000`) con auth dev (storybook static token → `admin@uplanner.dev`), ejecutando **la misma mutation `createCurriculumWithRecordType` que el `customEndpoint` invoca**, con la **misma forma `data: JSON!`**. Cubre el camino de datos real (resolver → delegate → split → coerce → persist) y reproduce+arregla el error original. La franja NO ejercida en vivo es el cableado de browser (form Vueform → `customEndpoint` → mutation), que requiere auth Clerk interactiva (OTP del dev) y usa un mecanismo idéntico a layouts `customEndpoint` ya en producción. Smoke UI por browser queda como verificación opcional ofrecida al dev. Registros de smoke borrados tras el test (Curriculum count restaurado a 2).

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| — | (se llenan durante execute) | — | — | — | — |
| L1 | El layout engine (RecordDetail.vue:3697-3705) NO soporta `customEndpoint.variables` con `{ "source": "formData", "type": "JSON!" }` (objeto completo): el resolver de variables solo matchea `source: "formData.<campo>"` (campo único) e `instanceId`; cualquier otro string cae al `else` y se envía LITERAL (mandaría la cadena "formData"). El diseño D-delegar del ticket (data: JSON! con source formData whole) es infeasible mod-only tal como está escrito. Camino mod-only viable que SÍ existe en el engine: `inputVariable: "data"` + `inputVariableType: "JSON!"` (patrón de serviceaccount-create.json:30-31) + enumerar cada campo del form en `variables` con `source: "formData.<campo>"`. El engine los empaqueta en un único objeto `{ data: {campos...} }` (RecordDetail.vue:3734-3737) y emite `mutation($data: JSON!){ createCurriculumWithRecordType(data:$data){id name} }`. La generalidad sobre recordType se conserva (resolver lee data.recordType → alias); el costo es que un campo NUEVO exige una línea en `variables` (simétrico al schema del form que ya enumera cada campo) — refuerza por qué camino B (split en core) escala mejor. | llm-autopilot | S1 | refined | DEC-LOCAL-01 (spec) + core doc §Refinamiento 1 |
| L2 | GOTCHA del sync de mods: las descripciones GraphQL (`"""..."""` o `"..."`) en un `*.schema.graphql` de mod NO pueden contener backticks. `scripts/sync.js` embebe el contenido del schema dentro de un template literal JS (backtick-delimitado) en `object-manager/src/graphql/typeDefs/mods.js`; un backtick en la descripción cierra el template literal antes de tiempo → SyntaxError al bootear object-manager (observado: `mods.js:408 Unexpected identifier 'data'`, OM crasheó en el restart de nodemon). Síntoma: tras `npm run sync`, el puerto 4000 deja de responder. Fix: descripciones sin backticks (texto plano). Detección rápida: `node --check object-manager/src/graphql/typeDefs/mods.js` tras el sync. Candidato a RULE-mods (validación pre-sync de schemas de mod). | developer | S1 | refined | RULE-mods-049 |
| L3 | El form único multi-RecordType envía los campos de TODOS los tipos (con `conditions`) aunque el tipo elegido no los use: al crear Minor, los campos Plan-only (progression/totalCredits/…) llegan al submit como `null`. El RT early-return de core, al no reconocerlos en la extensión del tipo elegido (`rt__Minor__curriculum`), los rutea a la tabla BASE → `prisma.curriculum.create()` rechaza `Unknown argument progression` (el MISMO bug, ahora en Minor). Fix mod-only: el adapter `createWithRecordType` dropea null/undefined/'' antes de delegar (conserva false/0). LECCIÓN DE PROCESO: la TC-2 a nivel API dio FALSO VERDE porque omití los campos Plan-only que el browser SÍ manda — la verificación a nivel-payload no replicó el camino del usuario. El dev lo cazó en el smoke UI real. Reafirma el feedback "TC Affects UI=yes no cierra sin smoke real": para un form multi-RT, el repro DEBE incluir los campos ocultos por conditions. Camino B (core dropea campos desconocidos en vez de rutearlos a la base) también lo resolvería de raíz. | dev | S1 | refined | core doc §Refinamiento 2 + resolver (dropEmptyFields) |

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-17 | false → super | dev trigger `super autopilot` (HOR-079, por-ticket) | intake (próximo gate) |

### Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Implementar D-delegar (schema.graphql + resolver thin + customEndpoint) y validar create de Plan en vivo | 1 | T3 | resolver `createCurriculumWithRecordType` (delega a createInstance(alias)); `customEndpoint` en layout; unit del resolver; smoke UI Plan+Minor | ⚑ fuerte | TC-1..TC-4 verdes + regresión sin caída + reviewer pass |

**Notas del plan**: single-session esperada (cambio acotado, patrón probado en `createSyllabusOffering`). Si el delegado a `createInstance` desde un resolver de mod presenta fricción (contexto/auth/wrapper), escalar y considerar camino B.

### Session 1 — 2026-06-17 — Implementar D-delegar (resolver thin + schema + customEndpoint) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Implementar la mutation del mod `createCurriculumWithRecordType` (delega en `createInstance(alias)`) + bloque `customEndpoint` en el layout, y validar el create de Plan/Minor en vivo (TC-1..TC-4).

**Tasks completadas**:
- [x] S1.T1 — Crear `curriculum-create.schema.graphql` + `curriculum-create.resolver.js` (adapter thin: lee recordType, arma alias, delega via loadGenericInstanceMutation, reshapa InstanceResult→{id,...data})
- [x] S1.T2 — Agregar bloque `customEndpoint` a `default_Curriculum_create.json` (inputVariable data + JSON! + campos enumerados)
- [x] S1.T3 — Unit test del resolver (arma alias correcto, delega, reshapa, sin prisma.create propio)
- [x] S1.T4 — `npm run sync` + smoke UI Plan+Minor (Playwright) + alias directo + TC-1..TC-4 con evidencia
- [x] S1.GATE — Gate de sync Session 1 (tier T3): persistir + regresión módulo + quality review (DET-23) + mutation gate (DET-31) + decisión

**Validación del tier (T3)**: unit suite del mod 130/130 (vitest, incluye 9 casos nuevos del adapter); API smoke TC-1..TC-4 verdes vía GraphQL autenticado contra object-manager `:4000` (`/tmp/t070_smoke.mjs`, auth dev storybook-token → admin@uplanner.dev, tenant UPU); eslint clean en archivos tocados; object-manager bootea limpio tras el fix L2 (backticks en la descripción del schema). Registros de smoke borrados (Curriculum count restaurado a 2).

**Quality review (DET-23)** — reviewer aislado (sub-agente sonnet, read-only, contexto limpio), tier exhaustive:

| # | Dimensión | Estado | Nota |
|---|-----------|--------|------|
| 1 | Calidad/diseño | pass | adapter thin; delega en createInstance(alias) sin reimplementar el split; sin prisma.create propio |
| 2 | Lint | pass | eslint exit 0 en resolver + test |
| 3 | Tipado | warn | archivo .js (consistente con baseline del mod — todos los resolvers son .js); args.data queda any implícito |
| 4 | Testing | warn | happy path + strip + reshape + invariante thin cubiertos (9 casos); falta test de la rama de fallo de loadGenericInstanceMutation (error de infra, no lógica; dynamic import no mockeable en vitest, mismo límite que sectionValidation) |
| 5 | Escalabilidad | pass | genérico sobre recordType; tipos nuevos no tocan el resolver |
| 6 | Mantenibilidad | pass | lógica pura extraída + inyectable; documentado |
| 7 | Claridad | pass | comentarios explican el por qué (delegar/strip/reshape) |
| 8 | A11y | n/a | sin UI nueva |
| 9 | Storybook | n/a | sin componente |
| 10 | Error handling | pass | error explícito si falta recordType / si no carga el generic |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Reviewer**: aislado (sonnet)
**Tier de revision**: exhaustive (T3)
**Resultado global**: approve — 0 blockers, 0 majors; 2 warn menores (tipado JS baseline del mod; cobertura de la rama de fallo de infra). Verificó independientemente core L2636 (recordType auto-seteado desde el alias) y que el reshape es correcto para responseFields [id, name]. Cambios dentro de execute_scope; sin consumidores rotos.

**Commit DET-27**: `873af6f` UPONE-1268 fix(curriculum-design): crear Curriculum tipado desde UI delegando en createInstance(alias) · `4e6ce0a` UPONE-1268 test(curriculum-design): unit del adapter (repo mods/curriculum-design, rama UPONE-1261-academic-program)

**Mutation gate (DET-31)**: no ejecutado (warn-first; T3 no lo fuerza a bloqueante). Adapter thin (3 funciones puras + delegación) con 9 unit + smoke API end-to-end; riesgo de test-gap mutacional bajo. Candidato a corrida async opcional.

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Promover el split base→alias dentro de `createInstance` de core (camino B) | nuevo | doc createinstance-recordtype-fields-base-table.md | Doc de causa raíz + caminos; RT early-return ya existe gateado al alias | Abrir ticket en object-manager: cuando `objectType=<base>` + `data.recordType` y existe `rt__<RT>__<base>`, derivar alias y reusar el split. Al landear, retirar la mutation D-delegar de curriculum-design | should |
| B2 | Verificar/corregir caso latente `Activity/Service` en uengagement (`activityTypeId` del RT en layout a la base) | nuevo | doc, sección Casos similares | `engagement_Activity_service_create.json` con `objectName=Activity` incluye `activityTypeId` | Reportar a uengagement: confirmar si falla el create de Service por la misma causa; aplicar D-delegar o esperar B | could |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|
| `873af6f` | 2026-06-17 | UPONE-1268 fix(curriculum-design): crear Curriculum tipado desde UI delegando en createInstance(alias) | S1.T1, S1.T2 | REQ-FIX-01, REQ-FIX-02 |
| `4e6ce0a` | 2026-06-17 | UPONE-1268 test(curriculum-design): unit del adapter createCurriculumWithRecordType | S1.T3 | REQ-FIX-01, REQ-REGRESSION-01 |
| `7b33748` | 2026-06-17 | UPONE-1268 fix(curriculum-design): stripear campos vacios (Minor enviaba Plan-only null → base rejection) | S1.T5 (iterate) | REQ-REGRESSION-02 |

> **Repo**: `mods/curriculum-design`, rama `UPONE-1261-academic-program` (commits locales; **push pendiente — pregunta al dev**, HOR-103 super).

## Summary

Crear un Curriculum tipado (Plan/Minor) desde la UI fallaba con `Unknown argument progression`: el form crea sobre la tabla base `Curriculum` y los campos del RecordType viven en la extensión `rt__<tipo>__curriculum`. Se implementó **D-delegar (mod-only)**: una mutation del mod `createCurriculumWithRecordType` que arma el alias `rt__<recordType>__curriculum` y **delega** en el `createInstance` de core (que ya separa base/extensión, castea ints, publica eventos y audita), con el form genérico ruteado vía `customEndpoint`. El adapter es *thin*: arma el alias, stripea el discriminador + campos vacíos, reshapa `InstanceResult → {id,...data}` y delega — sin lógica de negocio ni `prisma.create` propios.

**Qué se entregó** (repo `mods/curriculum-design`, rama `UPONE-1261-academic-program`):
- `logic/curriculum-create.resolver.js` + `logic/curriculum-create.schema.graphql` (commit `873af6f`); unit (`4e6ce0a`).
- Bloque `customEndpoint` en `config/layouts/default_Curriculum_create.json` (`inputVariable: "data"` + `JSON!` + campos enumerados).
- Fix del strip de campos vacíos para Minor (`7b33748`).

**Dos refinamientos vs el boceto** (documentados en el doc de core `createinstance-recordtype-fields-base-table.md` §Implementación realizada): (1) el engine no soporta `customEndpoint` con `source: "formData"` whole-object → `inputVariable` + campos enumerados (L1); (2) Minor no era inmune — el form único manda los campos Plan-only en `null` → el adapter dropea vacíos (L3). Gotcha: descripciones GraphQL con backticks crashean object-manager al sync → **RULE-mods-049** (L2).

**Verificación**: 132 unit del mod; API end-to-end (Plan+Minor+alias-directo, ints como número); **confirmado en browser por el dev** — Plan "44" (id `cmqibqsqg…`) y Minor "333" (id `cmqibq9bs…`) creados OK, datos verificados en DB (base + extensión, sin filtraciones a la base). Reviewer aislado (S1.GATE): approve.

**Seguimiento** (backlog, no bloqueante): B1 — promover el split base→alias dentro de `createInstance` de core (camino B; al landear, esta mutation se retira). B2 — verificar el caso latente `Activity/Service` en uengagement (misma forma). Ambos `should`/`could`.

**Pendiente operativo**: push de la rama del mod (commits locales) — a confirmar por el dev.
