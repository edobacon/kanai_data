---
id: TICKET-050
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1216
module: curriculum-design
autopilot: autonomous
---

# RBAC por capability para versionar y clonar — declarable por objeto en el mod (estilo up1)

## Request

> Follow-up del trabajo de versionar/clonar de SP3 (asociado a la HU-10 / [UPONE-1216](https://u-planner.atlassian.net/browse/UPONE-1216)). Petición del dev durante la conversación de diseño (2026-06-03).

Hacer que las acciones **versionar** (Activity) y **clonar** (BibliographyReference, Modalidad) estén controladas por un **permiso (capability RBAC)**, de modo que al declarar estas funcionalidades en un mod se pueda controlar **qué usuario, según qué permiso, las tiene disponibles**. El permiso debe ser **distinto por objeto** y, por lo tanto, declarado en el mod específico del objeto. Debe seguir la **filosofía de construcción de up1** (declarativo, capabilities custom por mod, core genérico).

### Decisiones ya tomadas con el dev (pre-design)

1. **Granularidad/naming**: capabilities **por objeto, object-level** — `activity:version`, `bibliographyreference:clone`, `curricularsection:clone` (cubre todos los RT incl. Modalidad). Shape `capabilities.json` `{name, description, riskLevel}`, sin prefijo `mod/` (RULE-mods-037).
2. **Alcance del enforcement**: **UI + backend** (defense-in-depth) — `requiredCapability` oculta el botón **y** un check server-side bloquea la mutación directa.
3. **Modo del enforcement core: opt-in declarativo con autonomía del mod** (decidido 2026-06-03). El mod es **soberano** sobre su política: decide si protege el versionar/clonar y con qué capability, declarándolo en su `metadata` (ej. `versioning.requiredCapability`, `prefillFrom.requiredCapability`). El core es **genérico**: lee la declaración y la aplica SOLO si está presente. Si el mod NO declara, el core **permite** la operación (comportamiento actual, solo el `create` genérico) — un clonado/versionado sin protección es una decisión válida de las reglas de negocio del mod, NO un hueco que el core deba forzar a cerrar. Consecuencia: la ausencia de declaración **no** genera warning ni error del validador (respeta la autonomía del mod) — descartado el warning build-time que se había considerado. NO se adopta el modo incondicional (rompería adoptantes futuros y le quitaría la soberanía al mod).

### Contexto de por qué (hallazgo de la investigación previa)

Hoy versionar/clonar se gatean **solo por estado del workflow** (`currentstatus.allowsVersioning`), idéntico para todos los usuarios. No hay control por permiso de usuario. La única mención RBAC en las historias de SP3 es la del query de lectura `getVersionChain` (HU-5 / UPONE-1211), que no aplica a las acciones.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | multi (mod curriculum-design + core layout + core object-manager) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (capabilities.json + row actions en layouts), layout (verificación del wiring `requiredCapability` ya existente; sin cambio salvo tests), object-manager (enforcement en `instance.resolver.js` + asignación de capabilities a roles) |
| Layer | mod (UPONE-1038) + core object-manager (UPONE-1206) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | No se crean vistas/pantallas/componentes. Se gatean row actions existentes (versionar/clonar) con `requiredCapability` |
| Data model | no | No se introducen entidades. Las capabilities se declaran en `capabilities.json` (config declarativo); `core_Capability` ya existe en el schema |

> Ambos flags `false` → el step `design-draft` NO se invoca; se pasa directo a `design-feature`.

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El frontend ya soporta gating por capability end-to-end: declarar `requiredCapability` en un row action lo oculta según el RBAC real del usuario | ✓ confirmada | `useRowActionHandler.ts:155-173` (`isActionVisible` evalúa `requiredCapability` con `hasCapability` ANTES de `visibilityConditions`) + `useRbacPermissions.ts` (singleton poblado por `getMyPermissions { capabilityNames }` en `RecordList.vue` onMounted). Usado en mods reales: `hw-assessment-list.json:37,58`, `core_user_admin_list.json:94,122` |
| H2 | Capabilities custom declarativas por mod (`capabilities.json`) es el patrón vivo y bendecido para acciones más allá de CRUD | ✓ confirmada | `mods/curriculum-design/capabilities.json` ya declara `activity:audit`, `mod/curriculum-design:approve`, `mod/curriculum-design:publish`; `report-builder` declara `report:clone`. Doc `object-manager/docs/features/custom-capabilities.md` |
| H3 | El enforcement backend se inserta en `createInstance` (paths versionar/clonar) en modo **opt-in declarativo** (el core lee `metadata.*.requiredCapability` y enforcea solo si el mod lo declara; sin declaración → permite, como hoy) | ✓ resuelta (decisión 3, 2026-06-03) | `instance.resolver.js` ~L2300 (clone) / ~L2311 (version). Opt-in elegido sobre incondicional: cero impacto colateral (H4/L1) + autonomía del mod. El core gana un mecanismo genérico de lectura de capability desde metadata (no existe hoy; el campo `permissions` de `core_FieldDefinition` está muerto) |
| H4 | El check en los paths version/clone se puede aislar del path scratch (creación normal, flujo dominante de todos los objetos) sin tocar flujos ajenos | ✓ confirmada (análisis impacto 2026-06-03) | Resolver con early-guards por flag (`if (asNewVersion)` L2317/L2350; clone gated por `prefillFrom?.source`). ~14 call-sites usan SCRATCH puro (enrollment, recurrence, calendar, RecordDetail forms, import, bulk, AI agent, n8n) — ninguno pasa los flags. Throw de permiso ANTES de DB/eventos/audit es seguro (`withEventPublish` publica DESPUÉS del resolver). Ver L1 |

### Context found

- **Rules del modulo**:
  - **RULE-mods-037**: capabilities object-level se nombran sin prefijo `mod/` (`activity:create`, `curricularsection:audit`). Aplica al naming de las nuevas `activity:version` / `*:clone`.
  - **RULE-dev-004**: trabajo `layer:core` va en branch `UPONE-1206`; `layer:mod` en `UPONE-1038`. Aquí el core toca **object-manager** (no solo layout).
  - **RULE-platform-006**: layout filenames PascalCase (afecta los `default_*` que se editan).
- **Bugs abiertos**: ninguno conocido en curriculum-design para este área.
- **Specs relacionados**: SPEC-018 (HU-10 row actions versionar/clonar, TICKET-044, en ejecución — este ticket lo complementa con RBAC), SPEC-017 (HU-8 adopción versionamiento). TICKET-040 (HU-5 getVersionChain, único con RBAC, de lectura).
- **Docs relevantes del repo**:
  - `object-manager/docs/features/rbac-system.md` (modelo capabilities `objeto:accion` / `objeto:rt:accion` / field-level)
  - `object-manager/docs/features/custom-capabilities.md` (declaración por mod vía `capabilities.json`)
  - `object-manager/docs/guides/checking-permissions.md` (`getMyPermissions`, consumo frontend)
  - `mods/.ai/PATTERNS.md:252` (`withAuth([caps])` vs `withObjectAuth(action)`)
- **Hallazgos clave del código** (investigación 2026-06-03, multi-capa DET-5):
  - **Backend RBAC**: capabilities estilo Moodle (`core_Capability.name` = string), acciones FIJAS object-level `['view,create,modify,delete']` + field `['view,modify']`; distingue por recordType (3 niveles). `withObjectAuth(action, resolver)` → `checkObjectPermissions(context, objectType, action)`. Auto-asignación a roles default (Admin/Consultor/Colaborador) SOLO object-level y system-level; **RT-level y field-level NO se auto-asignan** (`generateCapabilities.js:376-380`).
  - **Mutación**: versionar y clonar comparten `createInstance` (`withObjectAuth('create')`), distinguidos por flags `asNewVersion` / `prefillFrom.source`. Hoy ambos = permiso `create`.
  - **Frontend**: carril vivo = `requiredCapability`. Config muerta a evitar: `permissions:{create:[...]}` en objeto (TimeBlockTemplate, no se lee) y `requiredPermission` singular (array local nunca poblado). `roles:[...]` a nivel layout (73 usos) filtra el layout completo server-side — complementario, no para acción individual.
  - **Reparto mod vs core** (¿dónde vive cada capa?):
    - **Capa 1 — UI gating** (`requiredCapability` en row actions): 100% **declarativo en el mod**, cero core. El motor `isActionVisible` ya lee la clave.
    - **Capa 2 — Capabilities** (`capabilities.json` + asignación a roles): 100% **declarativo en el mod**, cero código core. El sync las crea.
    - **Capa 3 — Enforcement backend** (check en la mutación): **core inevitable** (`object-manager/instance.resolver.js`). `createInstance` es resolver genérico del core; los mods no lo aportan, así que el RBAC server-side de esa mutación NO puede vivir en el mod. Reparto aprox: ~70% declarativo (mod) / ~30% core.
  - **Forma estilo-up1 del cambio core** (DECIDIDO — ver decisión 3): mecánica genérica en core, política declarativa en mod (igual que `versioning`/`prefillFrom`). El core gana UNA VEZ la capacidad genérica de "enforcer una capability declarada en `metadata`" (ej. `metadata.versioning.requiredCapability`, `metadata.prefillFrom.requiredCapability`); LEE la declaración y la aplica solo si está presente; sin declaración → permite (autonomía del mod). **No existe hoy un gancho de metadata-enforcement en el core** (el campo `permissions` de `core_FieldDefinition` está muerto) → implica agregar ese mecanismo genérico (pequeño, pero es core). Verificar en intake-explore si hay algún gancho previo antes de comprometerlo. La ausencia de declaración NO genera warning/error del validador (autonomía del mod).
- **Warnings**:
  - **Impacto colateral del enforcement backend** (H3 — RESUELTO via decisión 3 opt-in): el opt-in declarativo elimina el colateral — solo objetos que declaran `requiredCapability` en metadata son enforced; el resto queda idéntico a hoy. Análisis de consumidores ya hecho (H4/L1, DET-16): ~14 call-sites scratch intactos.
  - **Auto-asignación**: `curricularsection:clone` object-level SÍ se auto-asigna; si se optara por RT-level (`curricularsection:modality:clone`) requeriría asignación explícita en seed/roles.
  - **Mecanismo de asignación a roles** de capabilities custom: confirmar cómo CD asigna hoy `approve`/`publish` (¿`capabilities.json` solo crea y la asignación va en seed de roles aparte?).
  - **TICKET-044 activo sobre el mismo Jira** (UPONE-1216): coordinar — este ticket asume los row actions de version/clone ya declarados por 044; agrega el `requiredCapability` encima.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch (core layout) | `UPONE-1206` (si hubiera cambios en `layout/`, p. ej. tests) per RULE-dev-004 |
| Branch (core object-manager) | `UPONE-1206` (enforcement en `instance.resolver.js` + capabilities/roles) |
| Branch (mod) | `UPONE-1038` (`mods/curriculum-design/` — capabilities.json + row actions) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU con SP3 aplicado; tras agregar capabilities correr `npm run capabilities:generate` / `npm run sync` + reasignar a roles |
| Services | object-manager, suite, layout |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | **El enforcement en `createInstance` se aísla por los early-guards de flag existentes — no interviene flujos ajenos.** El resolver separa scratch / clone (`prefillFrom?.source`) / version (`asNewVersion`) por guards exactos (L2309/L2317/L2350/L3097). ~14 call-sites usan SCRATCH puro (enrollment, recurrence, availability calendar, RecordDetail/forms, CreateViewWizard, ImportTaskList, createBulkInstances, importInstances, AI agent createInstanceTool, n8n Up1FormObject) y NINGUNO pasa los flags → quedan intactos. Hoy version lo usa SOLO Activity; clone solo BibliographyReference + CurricularSection (deepClone). Blast radius actual = exclusivamente curriculum-design. Throw de permiso es seguro: ocurre ANTES de `finalizeCreate` (writes a DB), ANTES del audit log, y `withEventPublish` publica DESPUÉS del resolver → sin eventos, sin estado inconsistente. **CAVEAT (propagación DET-16)**: el clone de Modalidad (RecordType) pasa por el bloque RT separado del resolver (~L2357+, respeta `prefillFrom?.source` en ~L2394). El check de clone debe cubrir AMBOS spots (objeto base + bloque RecordType), o el clone de Modalidad se escaparía del enforcement. | researcher (análisis impacto) | intake | discarded | subsumido por DEC-LOCAL-01 (opt-in declarativo) en SPEC-019 |
| L2 | **La cobertura dual del clone (objeto base + RecordType/Modalidad) se logra con UN SOLO check, no dos.** El check se ubica justo tras `resolveEffectivePrefillFrom` (instance.resolver.js:2300), que corre ANTES del "RecordType early-return" (L2357). Ambos paths consumen el mismo objeto `prefillFrom`, así que un único `if (prefillFrom?.requiredCapability) checkCapability(...)` cubre el clone de objeto base Y el de RecordType. El caveat de L1 (dos spots) era conservador — la realidad del flujo lo simplifica. Verificado empíricamente por el unit test de cobertura dual (clone de Modalidad rechazado). El surface de `requiredCapability` se agregó al retorno de `resolveEffectivePrefillFrom` (prefill-from-source.js), gated por `source != null` (scratch nunca lo ve). | developer (S1) | 1 | refined | RULE-core-020 |

## Sessions

### Plan de sessions

> Spec: SPEC-019-rbac-version-clone-capability. 2 sessions (~2-3h efectivas). Numeración desde S1 (sin sessions previas registradas).

| Session | Objetivo | Tipo | Tier | Tasks |
|---------|----------|------|------|-------|
| S1 | Core object-manager: mecanismo genérico opt-in de enforcement + unit tests | ⚑ fuerte | T2 | S1.T1..T4 + GATE |
| S2 | Mod curriculum-design: capabilities + metadata + UI gating + activación/validación (DB-gated) | ⚑ fuerte | T3 | S2.T1..T4 + GATE |

Repos/ramas (RULE-dev-004): S1 → `object-manager` rama `UPONE-1206`; S2 → `mods/curriculum-design` rama `UPONE-1038`. S2.T4 es DB-gated → en autopilot super, código + ediciones se commitean local y la activación/validación queda como gate de standby para el dev.

### Modo (autopilot)

| Timestamp | Cambio | Razon | Desde gate |
|-----------|--------|-------|------------|
| 2026-06-03 | (inicial) false | dev quiere iterar el "cómo implementarlo" en modo conversacional | arranque |
| 2026-06-04T09:09:24-04:00 | false → super | dev invocó `/dkc 050 super autopilot` — diseño ya iterado, ejecutar autónomo hasta cierre | desde teach-intake |

### Session 1 — 2026-06-04 09:09 — Core object-manager: mecanismo genérico opt-in de enforcement + unit tests [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Agregar al resolver genérico `createInstance` un mecanismo opt-in que lea `requiredCapability` de la metadata del objeto (`versioning`/`prefillFrom`) y lo enforce vía `checkCapability` solo si está declarado, cubriendo version + clone base + clone RecordType/Modalidad. Unit tests del enforcement + regresión scratch.

**Tasks completadas**:
- [x] S1.T1 — Importar `checkCapability` en instance.resolver.js desde authChecker.js
- [x] S1.T2 — Check opt-in en path versionar (asNewVersion) leyendo `versioningConfig.versioning.requiredCapability`
- [x] S1.T3 — Check opt-in en path clonar (objeto base + bloque RecordType/Modalidad), surface `requiredCapability` desde resolveEffectivePrefillFrom
- [x] S1.T4 — Unit tests: enforce cuando declarado + falta cap → throw; permite cuando NO declarado; regresión scratch; cobertura dual clone Modalidad
- [x] S1.GATE — Gate de sync Session 1 (tier T2): vitest unit object-manager + quality review + decisión

**Validacion del tier**:
- T2 — vitest run tests/unit/resolvers/instance.resolver.test.js: 87/87 passed (baseline 83 → +4 enforcement RBAC). Coverage: no baja (4 tests nuevos sobre paths antes no cubiertos). cmd verificado.

**Discoveries / Learns nuevos**:
- L2: la cobertura dual (objeto base + RecordType/Modalidad) se logra con UN solo check tras `resolveEffectivePrefillFrom` (upstream del RecordType early-return) — simplifica el approach del spec.

**Quality review (DET-23)**:

**Reviewer**: sub-agente aislado (general-purpose, contexto limpio — DET-30 REQ-10)
**Tier de revision**: exhaustive (gate ⚑ fuerte T2)
**Resultado global**: pass (approve)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Guard clause early-return; opt-in limpio; sin magic strings ni código muerto |
| 2 | Lint | pass | Estilo consistente, sin warnings |
| 3 | Tipado | pass | JS sin tipos (convención repo); JSDoc de `requiredCapability` agregado tras finding del reviewer |
| 4 | Testing | pass | 4 tests con aserciones concretas; `resolveEffectivePrefillFrom` real (no mockeado); sin falsos-verdes (toHaveBeenCalledWith falla si enforcement roto) |
| 5 | Escalabilidad | pass | O(1) extra; sin lecturas DB adicionales (reusa findUnique existente) |
| 6 | Mantenibilidad | pass | Un punto de enforcement por path; agregar capability a objeto nuevo = solo config |
| 7 | Claridad | pass | Comentarios referencian ticket/REQ y explican opt-in + cobertura dual |
| 8 | a11y | n/a | Backend puro |
| 9 | Storybook | n/a | Backend puro |
| 10 | Error handling | pass | checkCapability lanza Error legible; degradación fail-open documentada en helper |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Puntos críticos verificados por el reviewer aislado: (1) cobertura dual RT — check en L2308 corre ~67 líneas ANTES del RecordType early-return; (2) opt-in scratch — source==null retorna sin requiredCapability, checkCapability nunca llamado; (3) throw pre-write — antes de applyPrefillFromSource/prepareVersionData/$transaction.

**Commit DET-27**: `9be6ebb` feat(object-manager) + `dbc6745` test(object-manager) — repo object-manager, rama UPONE-1206. Solo archivos de TICKET-050; los de TICKET-044 (activity.json/curricularsection.json/typeDefs) quedan in-flight intactos.

**Contexto retomable**: S1 core completa y commiteada local (sin push). S2 pendiente: ediciones declarativas del mod (capabilities.json + object metadata + layouts) en repo curriculum-design rama UPONE-1038, luego activación DB-gated (sync + roles) + validación UI/e2e.

### Session 2 — 2026-06-04 09:50 — Mod curriculum-design: capabilities + metadata + UI gating + activación/validación (DB-gated) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa — e2e/UI DB-gated)

**Objetivo**: Declarar la política RBAC en el mod curriculum-design (capabilities.json + metadata de los 3 objetos + requiredCapability en 4 row actions) que enciende el mecanismo opt-in del core. Luego activar (sync + asignación a roles) y validar end-to-end (UI con/sin capability + rechazo backend). La activación es DB-gated → standby para el dev en autopilot super.

parallel_groups: [[S2.T1, S2.T2, S2.T3]]

**Tasks completadas**:
- [x] S2.T1 — Agregar 3 capabilities a capabilities.json (activity:version, bibliographyreference:clone, curricularsection:clone)
- [x] S2.T2 — Declarar requiredCapability en metadata de los 3 objects del mod (activity→versioning, BibliographyReference→prefillFrom, CurricularSection→prefillFrom)
- [x] S2.T3 — Agregar requiredCapability a los 4 row actions de versionar/clonar en los layouts
- [x] S2.T4 — Activación + validación UI: `npm run sync` corrido (3 caps creadas+asignadas a roles default + layouts sincronizados en UPU); gating UI validado live con Playwright (eduardo.bacon @ UPU) — con permiso (Admin/Consultor) muestra "Nueva versión"/"Clonar", sin permiso (Consultor cap removida, restaurada) las oculta; TC-4 estado preservado. Backend live (codegen→versioningConfig) NO corrido — unit-proven (87/87) + fuera del scope sync-only autorizado; push pendiente (B1)
- [x] S2.GATE — Gate de sync Session 2 (tier T3): consolidar evidencia TC + regresión + quality review + decisión

**Validacion del tier**:
- T3 (e2e/UI) — **DIFERIDA a S2.T4 (DB-gated)**. Parte estática del riesgo verificada sin DB: la cadena sync→registry preserva `requiredCapability` (análisis de `applyModToObject` fileSync.js:817 + `syncVersioningConfigToRegistry` generatePrismaSchema.js:2575 — copian sub-objetos completos, sin whitelist). Edits declarativos: JSON lint 7/7 OK; naming RULE-mods-037 OK; sin rename (RULE-platform-006) OK.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline light — edits declarativos de config; la validación substantiva T3 e2e es la que se difiere al dev)
**Tier de revision**: light (proporcionalidad — config JSON, no código; gate substantivo T3 pendiente en S2.T4)
**Resultado global**: pass (de la porción ejecutable: declaración correcta y commiteada)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad config | pass | 3 capabilities con shape `{name,description,riskLevel}`; requiredCapability en metadata + 4 layouts; misma capability-string en ambas capas |
| 2 | Lint (JSON) | pass | 7/7 archivos parsean OK |
| 7 | Claridad | pass | descriptions y _comments referencian TICKET-050/UPONE-1216 y el rol opt-in |
| — | Resto | n/a | enforcement runtime + UI gating validados en S2.T4 (DB-gated) |

**Gate decision:** (approvedBy: dev)

- [ ] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → pausar ticket

**Bloqueantes detectados**:
- S2.T4 requiere DB (UPU con SP3): `npm run capabilities:generate` + `npm run sync` (crea caps + asigna a roles + propaga metadata a registry), luego validación UI con/sin capability (TC-1, TC-2, TC-4) + rechazo backend GraphQL (TC-3 ya probado en unit). En autopilot super este es el boundary de standby — no se fuerza un entorno DB. → standby para el dev.

## Summary

### What was requested
Controlar versionar (Activity) y clonar (BibliographyReference, Modalidad) por capability RBAC declarable por objeto en el mod, estilo up1 (declarativo + core genérico).

### What was done
- El usuario con la capability ve y puede ejecutar versionar/clonar; sin ella la acción se oculta (UI) y la mutación directa se rechaza (backend).
- Core object-manager: mecanismo genérico **opt-in** en `createInstance` — lee `requiredCapability` de la metadata del objeto y enforce solo si está declarado (sin declaración → permite, como hoy). Un solo check cubre clone de objeto base + RecordType/Modalidad.
- Mod curriculum-design: 3 capabilities (`activity:version`, `bibliographyreference:clone`, `curricularsection:clone`), `requiredCapability` en metadata de los 3 objetos + en 4 row actions (gating UI). Sincronizado a UPU.

### What was learned
- Learns: 2 (1 refined → RULE-core-020, 1 discarded → subsumido por DEC-LOCAL-01)
- Rules creadas: RULE-core-020 (patrón opt-in metadata-enforcement RBAC, reusable)
- Decisions: DEC-LOCAL-01 (opt-in declarativo con soberanía del mod), DEC-LOCAL-02 (requiredCapability en object metadata + layout, misma string, dos capas)
- Bugs: ninguno

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 2 |
| Tasks completed | 9/9 (S1.T1-T4+GATE, S2.T1-T4+GATE) |
| Commits | 4 código (2 object-manager + 2 curriculum-design) + 4 records DKC |
| Learns captured | 2 (1 refined, 1 discarded) |
| Rules created | 1 (RULE-core-020) |
| Decisions taken | 2 (DEC-LOCAL-01, DEC-LOCAL-02) |
| Test cases | TC-1/TC-2/TC-3/TC-3b/TC-3c/TC-4 pass (3 UI live + 3 unit); 0 fail; 0 pending |
| Unit tests | 87/87 vitest (object-manager) |
| SP published / estimated / executed | — / 3 / 2 (sessions-heuristic) |
| SP breakdown (llm / human) | 2 / 1 |
| SP delta (executed - estimated) | -1 (-33%) — LLM speedup: proxy humano-puro 3 → executed 2 |

### Validación
- Backend: 87/87 unit (enforce version/clone + cobertura dual RT + regresión scratch). Reviewer aislado de cierre: approve.
- UI live (Playwright, eduardo.bacon @ UPU): con permiso (Admin/Consultor) muestra "Nueva versión"/"Clonar"; sin permiso (Consultor cap removida+restaurada) las oculta; gating por estado preservado (TC-4). Evidencia en `TICKET-050.screenshots/`.

### Pendiente (backlog B1, should — no bloquea cierre)
- `npm run codegen -- UPU` para propagar `requiredCapability` al registry y confirmar el rechazo backend live (unit-proven).
- **Push** de las 3 ramas (object-manager UPONE-1206, curriculum-design UPONE-1038, deckard) — requiere OK del dev. Ningún push ejecutado por DKC.
- Doc del repo (`custom-capabilities.md`/`rbac-system.md`) opcional — el patrón quedó en RULE-core-020.

## Commits

| Hash | Fecha | Header | Tasks | REQ |
|------|-------|--------|-------|-----|
| 9be6ebb | 2026-06-04 | UPONE-1216-S1 feat(object-manager): enforcement RBAC opt-in versionar/clonar via requiredCapability | S1.T1, S1.T2, S1.T3 | REQ-03 |
| dbc6745 | 2026-06-04 | UPONE-1216-S1 test(object-manager): unit tests enforcement RBAC | S1.T4 | REQ-03, REQ-PRESERVE-01 |
| 961de30 | 2026-06-04 | UPONE-1216-S2 feat(cd): declarar capabilities version/clone + requiredCapability en metadata de objetos | S2.T1, S2.T2 | REQ-01, REQ-04 |
| cebd543 | 2026-06-04 | UPONE-1216-S2 feat(cd): gatear row actions de versionar/clonar con requiredCapability | S2.T3 | REQ-02 |

> Repo curriculum-design (rama UPONE-1038): 961de30, cebd543. Repo object-manager (rama UPONE-1206): 9be6ebb, dbc6745. Repo deckard: records DKC. Ningún push ejecutado (super: push siempre pregunta).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 (capabilities) | sync UPU | manual | **COVERED** (sync creó+asignó las 3 caps a roles default; verificado en DB UPU) |
| REQ-02 (UI gating) | TC-1, TC-2 | manual | **COVERED** (S2 — Playwright live con/sin permiso, eduardo.bacon @ UPU) |
| REQ-03 (enforcement backend) | TC-3 + 3 unit | auto | **COVERED** (S1 — 87/87 vitest); live GraphQL no corrido (requiere codegen, fuera del scope sync-only autorizado) |
| REQ-04 (metadata declaration) | sync UPU | manual | PARTIAL (declarado+commiteado; propagación a registry requiere codegen — no corrido) |
| REQ-PRESERVE-01 (scratch + estado) | unit scratch + TC-4 | auto/manual | **COVERED** (scratch S1 unit; estado UI TC-4 live: Admin+Borrador → oculta) |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | UI: gating versionar por capability | REQ-02 | manual | yes | Activity "Introduccion a las Redes" (Publicado, allowsVersioning=true) en UPU, user eduardo.bacon | rol CON `activity:version` (Admin/Consultor) vs SIN (Consultor con cap removida) | con cap → "Nueva versión" visible; sin cap → oculta | Admin/Consultor con cap → menú [Nueva versión, Ver, Editar]; Consultor sin cap → [Ver, Editar] | Playwright: TICKET-050-VERSION-admin-conpermiso.png, -consultor-conpermiso.png, -consultor-sinpermiso.png | **pass** | S2 | — |
| TC-2 | UI: gating clonar por capability | REQ-02 | manual | yes | BibliographyReference (Catálogo bibliográfico) en UPU, user eduardo.bacon | rol CON `bibliographyreference:clone` vs SIN | con cap → "Clonar" visible; sin → oculta | Consultor con cap → menú [Clonar, Ver, Editar]; sin cap → [Ver, Editar] (la acción se renderiza "Clonar" vía languageTag, no "Duplicar") | Playwright: TICKET-050-CLONE-consultor-conpermiso.png, -consultor-sinpermiso.png, -admin-conpermiso.png | **pass** | S2 | — |
| TC-3 | Backend: enforcement versionar | REQ-03 | auto | no | createInstance asNewVersion sin capability | invocar mutación directa | rechazo por permiso (no se crea v2) | rechaza con `capability [activity:version]`, sin write | unit test `should enforce versioning.requiredCapability...` (instance.resolver.test.js) — 87/87 vitest | **pass** | S1 | — |
| TC-3b | Backend: enforcement clonar (BibRef + Modalidad/RT) | REQ-03 | auto | no | createInstance prefillFrom.source sin capability | invocar mutación directa | rechazo por permiso | rechaza con `capability [bibliographyreference:clone]` y `[curricularsection:clone]` (cobertura dual RT) | 2 unit tests (clone + dual coverage) — vitest | **pass** | S1 | — |
| TC-3c | Backend: opt-in permite scratch sin flags | REQ-PRESERVE-01 | auto | no | createInstance sin asNewVersion/prefillFrom | crear normal | checkCapability NO llamado; crea ok | checkCapability not called; create id=42 | unit test scratch — vitest | **pass** | S1 | — |
| TC-4 | Regression: gating por estado se preserva | REQ-PRESERVE-01 | manual | yes | Admin (con `activity:version`) + Activity "Ecuaciones Diferenciales" (Borrador, allowsVersioning=false) | abrir menú de fila | "Nueva versión" oculta por estado aun con capability (capability AND estado en serie) | menú [Ver, Editar] — Nueva versión oculta | Playwright: TICKET-050-VERSION-admin-borrador-estado.png | **pass** | S2 | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| layout (vitest) | `vitest run` (layout) | — | — | (sin cambio de código en layout — no se corre) |
| object-manager (vitest) | `vitest run tests/unit/resolvers/instance.resolver.test.js` | 83/83 | 87/87 | +4 (enforcement RBAC opt-in) |

**Baseline**: instance.resolver.test.js tenía 83 tests; tras S1 son 87 (4 nuevos de enforcement). 0 regresiones.

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Backend live enforcement (codegen) + push | REQ-03, REQ-04 | S2.T4 de SPEC-019 | sync UPU ya corrido (caps+roles+layouts); UI gating validado live (TC-1/TC-2/TC-4 pass). Falta: propagar `requiredCapability` al registry (`versioningConfig`) y verificar el rechazo backend live | (1) `cd object-manager && npm run codegen -- UPU` (regenera registry + propaga `versioningConfig.{versioning,prefillFrom}.requiredCapability`; puede requerir reiniciar el API); (2) verificar rechazo backend: `createInstance` directo (GraphQL) con `asNewVersion`/`prefillFrom.source` sin capability → error de permiso (ya unit-proven 87/87, falta confirmación live); (3) push de las 3 ramas (object-manager UPONE-1206, curriculum-design UPONE-1038, deckard) — requiere OK del dev. | should |

## Teaching — Intake

**Status**: done (autopilot=super, choice `generate` por REQ-05 — skip no permitido).
**Archivo**: [tickets/TICKET-050.teach/teach-intake.html](TICKET-050.teach/teach-intake.html) — v2 HTML, validador en verde (0 errors).
Bloques: tldr, concept-card (6 conceptos), flow (3 capas), code, invariant, callout (entorno: TICKET-044, branches, cobertura dual), timeline (plan 4 pasos), tag, study-qa (4).

## Teaching — Close

**Status**: done (autopilot=super, choice `generate` por REQ-05).
**Archivo**: [tickets/TICKET-050.teach/teach-close.html](TICKET-050.teach/teach-close.html) — v2 HTML, validador en verde (0 errors).
Bloques: tldr, timeline (2 sessions + activación), callout (evolución hipótesis / conocimiento promovido / qué viene B1), case (DEC-LOCAL-01), comparison-table (opt-in vs incondicional), study-qa (4 lecciones).
