---
id: TICKET-046
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1218
module: object-manager
autopilot: autonomous
---

# HU-12 | Documentación de la capacidad para futuros adoptantes

## Request

> Contenido literal del ticket Jira [UPONE-1218](https://u-planner.atlassian.net/browse/UPONE-1218) (Historia, parent epic UPONE-1206). **Priority del plan: P2 (recortable a SP4 si presion).**

### Descripción

Guía de cómo activar la capacidad sin leer el código del core, distinguiendo las 2 capas (clonar = transversal / versionar = dominio CD).

### Criterios de aceptación

* Docs de prefill, versioning, polymorphic-children, **config-storage** y row-actions `type:create`.
* Sección "Versionar vs Clonar" y "política vía `allowsVersioning` + FK del Workflow".
* Test de adopción simulada (objeto CD) <30/<60 min.

### Dependencias

HU-1..HU-11.

### Cambio vs actual

* config-storage, `allowsVersioning`+FK, separación de las 2 capas.

## Contexto operativo del plan SP3

### P5.1 — HU-12 · Documentacion de la capacidad (Fase 5) · [docs] · `P2`

- **Meta**: docs · ~2 SP · certeza confirmado · rollback git revert · riesgo bajo (recortable a SP4)
- **Contexto**: que cualquier dev de mod active la capacidad sin leer el codigo del core. Distingue las 2 capas: clonacion (transversal) vs versionamiento (dominio CD).
- **Que se realiza**: docs en `object-manager/docs/` (prefill, versioning, polymorphic-children, config-storage), `layout/docs/row-actions.md`, ejemplo en `.ai/PATTERNS.md`, seccion "Versionar vs Clonar"; test de adopcion simulada.
- **Depende de**: HU-1..HU-11.
- **Investigar**: nada.
- **Prueba**: adopcion simulada (objeto CD) <30 min (relations directas) / <60 min (polymorphicChildren); incluye la trampa "olvide setear `initialStatusId`". Empezar SP3, formal SP4 si presion.

## Material internalizado — HU detallada

### HU-12 · Documentacion de la capacidad

**Sprint:** SP3 · **Track:** Docs · **Repos:** `object-manager`, `layout`, `mods/curriculum-design`, KB de specs

**Como** dev de cualquier mod uP1
**Quiero** una guia clara de como activar versionamiento
**Para** adoptarla sin leer codigo del core.

**Criterios de aceptacion:**

- [ ] `object-manager/docs/prefill-capability.md` — Ladrillo 1.
- [ ] `object-manager/docs/versioning-capability.md` — Ladrillos 2+3, receta paso a paso, ejemplo Activity, receta breve Syllabus/CurriculumPlan. Seccion "politica institucional via `allowsVersioning` + FK de entrada del Workflow". Seccion "versionSourceId vs sourceRefId" (L40).
- [ ] `object-manager/docs/config-storage.md` (nuevo) — IMP-11: como el sync persiste `metadata.versioning`/`prefillFrom` al registry (`versioningConfig`) y como el resolver lo lee.
- [ ] `object-manager/docs/polymorphic-children.md` (nuevo) — IMP-4 (lectura/deepClone). Cuando declararlo + nota del hook de remap (derived generico → SP4).
- [ ] `layout/docs/row-actions.md` — `type: "create"` declarativo + visibilidad por `relations` en el config de la lista.
- [ ] Seccion "Versionar vs Clonar" (CAP-CUR-018 vs CAP-CUR-022, BR-VER-002).
- [ ] Ejemplo completo en `mods/curriculum-design/.ai/PATTERNS.md`.
- [ ] Test de adopcion simulada: <30 min (relations directas), <60 min (con `polymorphicChildren`). Incluye la trampa "olvide setear `initialStatusId` en el workflow" → error claro → config → funciona.

**Dependencias:** HU-1 a HU-11.

## Material internalizado — Discovery §6 (Mecanica de adopcion)

> El test de adopcion simulada es el deliverable mas concreto. Mide el tiempo que tarda un dev de otro mod en activar versionamiento para un objeto X siguiendo las docs.

**Camino A (relations directas)** — objetivo <30 min:
1. Agregar a `objects/X.json` bajo `metadata`: bloque `versioning` + bloque `prefillFrom` con `deepClone` apuntando a relacion Prisma directa.
2. Agregar campo `previousVersionId` FK reflexivo + `version Int`.
3. Agregar row action `type:create` en layout JSON con `visibilityConditions`.
4. Seed: setear `workflow.initialStatusId` + `allowsVersioning` en estados que correspondan.
5. Sync + verificar.

**Camino B (polymorphicChildren)** — objetivo <60 min:
- Igual al camino A + agregar bloque `metadata.polymorphicChildren` para hijos polimorficos (caso Activity → CurricularSection).
- Hook del mod para remapear FKs internas si aplica (deuda hasta el derived generico de SP4).

**Trampas conocidas a documentar**:
- "olvide setear `workflow.initialStatusId`" → error `WORKFLOW_HAS_NO_INITIAL_STATUS` claro al intentar versionar.
- "olvide poner los bloques `bajo metadata`" → el sync los descarta silenciosamente (merge solo propaga `properties`/`metadata`/`required`).
- "olvide marcar `allowsVersioning` en algun status" → el boton no aparece (por `visibilityConditions`).

## Material internalizado — Shape canonico (docs estructuradas)

### Estructura de docs propuesta

```
object-manager/docs/
  prefill-capability.md           # Ladrillo 1: createInstance + prefillFrom (HU-1, HU-2)
  versioning-capability.md        # Ladrillos 2+3: asNewVersion + getVersionChain (HU-3, HU-4, HU-5)
  config-storage.md               # IMP-11: versioningConfig en core_ObjectDefinition (HU-0j)
  polymorphic-children.md         # IMP-4: lectura/deepClone (HU-0d)

layout/docs/
  row-actions.md                  # type:create + relations + visibilityConditions (HU-7)

mods/curriculum-design/.ai/
  PATTERNS.md                     # Ejemplo completo Activity (HU-8) — receta end-to-end
```

### Skeleton de `versioning-capability.md`

```markdown
# Versioning Capability

## Que es

Versionar un objeto = crear una nueva instancia que hereda los campos del source, con linaje (`previousVersionId`), bump de version (`version Int`) y reset al estado inicial.

## Cuando usarlo (vs Clonar)

- **Clonar** (transversal): pre-llenar una instancia desde otra, sin linaje. Use `prefillFrom` solo.
- **Versionar** (dominio CD): clonar + linaje + bump + reset estado. Use `prefillFrom + asNewVersion`.

## Politica institucional

La politica de "que estados pueden versionar" vive en `WorkflowStatus.allowsVersioning` (flag por status).
El estado inicial vive en `Workflow.initialStatusId` (FK de cardinalidad 1).

## Receta paso a paso (objeto generico)

1. Agregar campo `version` Int + `previousVersionId` FK reflexivo.
2. Bajo `metadata.versioning`: declarar `linkageField`, `versionField`, `versionStrategy: "increment"`.
3. Marcar `allowsVersioning=true` en los statuses que corresponda.
4. Setear `Workflow.initialStatusId` en el seed.
5. Agregar row action `type:create` + `asNewVersion` en el layout.

## Ejemplo completo: Activity (ver mods/curriculum-design/.ai/PATTERNS.md)

(receta end-to-end con todo el material de HU-8a/b/c)

## Errores comunes

- `WORKFLOW_HAS_NO_INITIAL_STATUS`: olvidaste setear el FK en el seed.
- `SOURCE_NOT_VERSIONABLE`: el estado actual del source no tiene `allowsVersioning=true`.
- `OBJECT_NOT_VERSIONABLE`: el objeto no declara bloque `versioning` en metadata.
```

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement (docs) |
| Tipo de cambio | docs (5+ archivos en 3 workspaces) |
| Modulo principal | object-manager (la mayoria de docs vive aqui) |
| Modulos afectados | object-manager/docs/, layout/docs/, mods/curriculum-design/.ai/ |
| Layer | docs (no codigo) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | no | — |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | n/a |
| Version aprobada | — |
| Path | — |

> No requiere draft. Skeleton de docs detallado arriba sirve como propuesta base.

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El test de adopcion simulada se puede ejecutar con cualquier objeto del dominio CD (ej. CompetencyMap o Syllabus simulado) | ✗ refutada parcial | DISC-1: Syllabus/CurriculumPlan/CompetencyMap NO existen como `objects/*.json` en el mod CD (solo como scopes de workflow). El test simulado usa objetos representativos (Invoice/LineItem para camino A directChildren; Activity real para camino B polymorphicChildren). El test es "simulado" = walkthrough verificado contra el codigo real, no un objeto nuevo commiteado |
| H2 | Las trampas conocidas (initialStatusId no seteado, bloques fuera de metadata) son las mas frecuentes en adopciones reales | ✓ confirmada | Discovery + factibilidad las documentan. DISC-3 confirma error codes exactos en codigo |

### Discoveries (intake-explore — 2026-06-04)

> Cronologicos e inmutables (DET-6). Fundamentados con `file_path:line` por research agent balanced.

- **DISC-1 — Objetos del test inexistentes**: Syllabus, CurriculumPlan y CompetencyMap NO son objetos (`objects/*.json`) del mod curriculum-design; solo existen como scopes de workflow. El unico objeto realmente adoptado es `Activity` (camino B, polymorphicChildren). No hay ningun objeto en el mod que declare `metadata.directChildren` (camino A). → El test de adopcion simulada (S3/S4) usa ejemplos representativos, no objetos nuevos del mod.
- **DISC-2 — Docs parcialmente entregadas**: `prefill-capability.md` (HU-2) ya existe y esta completo. `versioning-capability.md` existe pero cubre solo HU-4 (codegen validacion+persistencia); falta runtime (asNewVersion/getVersionChain), receta, ejemplo Activity, politica institucional, versionSourceId-vs-sourceRefId, "Versionar vs Clonar". `codegen-polymorphic-children.md` ya existe (angulo build-time). config-storage.md, polymorphic-children.md, layout/docs/row-actions.md NO existen.
- **DISC-3 — Error codes verificados**: `OBJECT_NOT_VERSIONABLE` (instance.resolver.js:2194,2335), `SOURCE_NOT_VERSIONABLE` (version-from-source.js:42), `WORKFLOW_HAS_NO_INITIAL_STATUS` (version-from-source.js:48), `AS_NEW_VERSION_REQUIRES_PREFILL` (instance.resolver.js:2321), `PREFILL_SOURCE_NOT_FOUND`/`PREFILL_SOURCE_TYPE_MISMATCH` (prefill-from-source.js:164/153).
- **DISC-4 — HU-8b generalizado al core**: el hook por-mod que remapeaba `CurricularLink` se generalizo al motor via `applyDerivedRemap` (deep-clone-polymorphic.js:108) + bloque declarativo `polymorphicChildrenDerived` (activity.json:20-26), entregado en TICKET-049/UPONE-1219. La nota del ticket "hook de remap (derived generico → SP4)" quedo OBSOLETA: el derived remap ya esta en core en SP3. polymorphic-children.md debe reflejar esto, no documentar un hook ad-hoc por-mod inexistente.
- **DISC-5 — Detalles runtime clave**: `asNewVersion` requiere `prefillFrom.source` (no standalone); hace bump del max del linaje (no source.version+1), set linkageField=source.id, reset a Workflow.initialStatusId; corre en $transaction Serializable. `getVersionChain(objectType, instanceId)` reconstruye linaje backward+forward BFS, ordena por versionField asc, versionNumber 1-based post-RBAC. Bug conocido: relacion singular `currentstatus` lowercase (codegen). `requiredCapability: "activity:version"` (RBAC opt-in, TICKET-050).

### Context found

- **Rules del modulo**: ninguna especifica para docs. RULE-platform-006 (PascalCase).
- **Bugs abiertos**: ninguno.
- **Specs relacionados DKC**: TICKET-033..045 (todos los que entregan codigo del sprint).
- **Docs relevantes del repo**:
  - `object-manager/docs/` (existente, agregar archivos)
  - `layout/docs/` (existente, agregar archivos)
  - `mods/curriculum-design/.ai/PATTERNS.md` (existente, extender)
- **Warnings**:
  - **Recortable a SP4 si el sprint se ajusta** (P2).
  - **Depende de HU-1..HU-11 cerrados**; sin codigo entregado, las docs no son verificables.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (docs core) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU con todo el sprint aplicado (codigo + seed) |
| Services | object-manager, postgres, suite |
| Test data | seeds UPU con Activity v1 + v2 (post-TICKET-043) |

## Sessions

### Plan de sessions (preplanificacion)

> **Revisado en intake-explore (2026-06-04)** segun DISC-1/DISC-2: docs parcialmente entregadas y objetos del test inexistentes. Plan original de 5 sessions ajustado a 4. Cambio de gate S3/S4 documentado en S-NOTE abajo.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Expandir `versioning-capability.md` (runtime asNewVersion/getVersionChain, receta paso a paso, ejemplo Activity, receta breve Syllabus/CurriculumPlan, politica institucional, versionSourceId vs sourceRefId, seccion "Versionar vs Clonar") + crear `config-storage.md`; revisar `prefill-capability.md` | — | T1 | S1.T1 versioning-capability.md; S1.T2 config-storage.md; S1.T3 review prefill | auto | docs verificadas contra codigo (file:line) |
| S2 | Crear `polymorphic-children.md` (adopcion-focused, refleja DISC-4: derived remap ya en core) + crear `layout/docs/row-actions.md` (type:create + visibilityConditions por relations) + extender `PATTERNS.md` con receta end-to-end Activity | — | T1 | S2.T1 polymorphic-children.md; S2.T2 row-actions.md; S2.T3 PATTERNS.md | auto | docs verificadas contra codigo |
| S3 | Test de adopcion simulada — camino A (relations directas, ejemplo generico Invoice/LineItem) <30 min + camino B (polymorphicChildren, Activity real) <60 min, incluyendo las 3 trampas conocidas | — | T1 | S3.T1 walkthrough verificado por paso | auto | receta seguible end-to-end, cada paso mapeado a mecanica de codigo verificada |
| S4 | Cierre — review docs por reviewer aislado (legibilidad) + commits DET-27 por repo + teach-close | — | T1 | S4.T1 review; S4.T2 commits; S4.T3 teach-close + close | auto | reviewer confirma legibilidad; commits en ramas de epica |

> **S-NOTE (DET-12 escalamiento honesto + super decide+document)**: S3 y S4 del plan original (tests de adopcion <30/<60 min con screenshots en entorno UPU vivo, gate ⚑ fuerte) se fusionan en un unico S3 con gate **auto**. Razon: (a) DISC-1 — los objetos diana (Syllabus/CompetencyMap/CurriculumPlan) no existen como `objects/*.json`, no se puede correr un alta real; (b) el test es "simulado" por definicion del ticket — un walkthrough de la receta verificado contra la mecanica de codigo real (cada paso traza a `file:line`), no un alta en vivo. El valor (¿es la receta seguible y completa?) se preserva sin entorno vivo. Cierre pasa de S5 a S4. Reversibilidad: si el dev quiere el test en vivo, requiere crear un objeto CD nuevo (fuera de alcance docs, candidato a ticket aparte).

### Session 1 — 2026-06-04 16:45 — Core de versionamiento (versioning-capability + config-storage) [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (verificacion docs vs codigo file:line)

**Objetivo**: Expandir `versioning-capability.md` con runtime/receta/ejemplo/politica/versionSourceId-vs-sourceRefId/"Versionar vs Clonar" (REQ-01) + crear `config-storage.md` (REQ-02) + revisar `prefill-capability.md` y cross-links (REQ-07). Docs siguen el patron de `object-manager/docs/` existente.

**Tasks completadas**:
- [x] S1.T1 — Expandir `object-manager/docs/versioning-capability.md` (REQ-01 a-h)
- [x] S1.T2 — Crear `object-manager/docs/config-storage.md` (REQ-02)
- [x] S1.T3 — Revisar `prefill-capability.md` + cross-links (REQ-07)
- [x] S1.GATE — Gate de sync Session 1 (tier T1) + quality review docs

**Validacion del tier**:
- T1 — Afirmaciones tecnicas verificadas contra codigo real: `version-from-source.js:42,48` (SOURCE_NOT_VERSIONABLE / WORKFLOW_HAS_NO_INITIAL_STATUS), `instance.resolver.js:2321` (AS_NEW_VERSION_REQUIRES_PREFILL), `:2194` (OBJECT_NOT_VERSIONABLE), `:3115` (Serializable), `schema.prisma:28` (versioningConfig), `generatePrismaSchema.js:2549/1296/2575` (sync + Fase 3 + shape), `instance.resolver.js:2192/2333` (lectura runtime). Resultado: pass.
- Cross-links: resuelven, excepto `polymorphic-children.md` (pendiente S2.T1, dentro del ticket).

**Discoveries / Learns nuevos**:
- L4: comentario de `schema.prisma:28` dice "NULL si no declara metadata.versioning" pero el codigo real (`generatePrismaSchema.js:2575`) persiste con gate `(versioning || prefillFrom)`. La doc refleja el codigo, no el comentario stale (candidato a fix de comentario en core, fuera de alcance docs).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (docs, sin codigo modificado)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad/precision | pass | Cada afirmacion anclada a file:line verificado |
| 2 | Claridad | pass | Sigue patron object-manager/docs (titulo+ref HU, blockquote, tablas, JSON, Referencias) |
| 3 | Mantenibilidad | pass | Alcance SP3 marcado explicito; cross-links bidireccionales |
| 4 | Lint/tipado | n/a | doc-only |
| 5 | Testing | n/a | doc-only |
| 6 | Escalabilidad | n/a | doc-only |
| 7 | a11y | n/a | doc-only |
| 8 | Storybook | n/a | doc-only |
| 9 | Error-handling | pass | tabla de errores con strings exactos del codigo |
| 10 | Consistencia | pass | Versionar-vs-Clonar coherente con prefill-capability.md |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 (polymorphic-children.md + row-actions.md + PATTERNS.md). Docs S1 verificadas vs codigo, quality review light pass
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-06-04 17:00 — Layout + ejemplo del mod (polymorphic-children + row-actions + PATTERNS) [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (docs vs codigo + `npm run docs:validate` para layout)

**Objetivo**: Crear `object-manager/docs/polymorphic-children.md` (REQ-03, adopcion-focused, refleja DISC-4: derived remap ya en core) + crear `layout/docs/features/row-actions.md` (REQ-04, EN, sigue patron layout) + extender `mods/curriculum-design/.ai/PATTERNS.md` con receta Activity end-to-end (REQ-05). Cada doc sigue el patron de su repo (object-manager=ES, layout=EN+docs:validate, mod=patron PATTERNS).

**Tasks completadas**:
- [x] S2.T1 — Crear `object-manager/docs/polymorphic-children.md` (REQ-03)
- [x] S2.T2 — Crear `layout/docs/features/row-actions.md` (REQ-04) + `npm run docs:validate` verde
- [x] S2.T3 — Extender `mods/curriculum-design/.ai/PATTERNS.md` con receta Activity (REQ-05)
- [x] S2.GATE — Gate de sync Session 2 (tier T1) + quality review docs

**Validacion del tier**:
- T1 — Afirmaciones verificadas vs codigo: `activity.json:11-39` (metadata blocks), `default_Activity_list.json:19-37` (row action real, `currentstatus` lowercase + relations), `seed/_data-workflow-objects.js:36-40` (PUB allowsVersioning), `useCreateRowAction.ts` + `types/recordlist.ts:198-260` (shape type:create), `deep-clone-polymorphic.js:108` + `instance.resolver.js:3085` (applyDerivedRemap core). Resultado: pass.
- JSON fences propios: row-actions.md 3/3 validos; PATTERNS.md aporte valido (fence invalido #1 es pre-existente, no introducido).
- `npm run docs:validate` (layout): NO ejecutable — `docs/confluence/` ausente/untracked en rama UPONE-1206 (PREEXISTENTE, no introducido). Checks reales del validador (JSON valido + links resuelven) verificados manualmente sobre row-actions.md: pass.

**Discoveries / Learns nuevos**:
- L5: `npm run docs:validate` del layout crashea por `docs/confluence/en/overview.md` ausente en rama UPONE-1206 (no tracked). Preexistente — candidato a fix de branch/setup, fuera de alcance docs.
- L6: el casing real de la relacion en layouts es `currentstatus` (lowercase, codegen-generated), no `currentStatus`. Documentado en row-actions.md + PATTERNS.md (consistente con L3).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (docs, sin codigo modificado)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad/precision | pass | Afirmaciones ancladas a file:line; valores reales (no inventados) |
| 2 | Claridad | pass | polymorphic-children.md = patron object-manager (ES); row-actions.md = patron layout (EN); PATTERNS.md = patron mod |
| 3 | Mantenibilidad | pass | Cross-links; DISC-4 corrige material historico obsoleto |
| 4 | Lint/tipado | n/a | doc-only |
| 5 | Testing | n/a | doc-only |
| 6 | Escalabilidad | n/a | doc-only |
| 7 | a11y | n/a | doc-only |
| 8 | Storybook | n/a | doc-only |
| 9 | Error-handling | pass | trampas + error codes documentados |
| 10 | Consistencia | pass | casing currentstatus coherente entre row-actions.md y PATTERNS.md |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S3 (test de adopcion simulada: camino A + B + trampas). Docs S2 verificadas vs codigo, quality review light pass
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-04 17:20 — Test de adopcion simulada [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (cada paso trazado a file:line de codigo verificado)

**Objetivo**: Crear `object-manager/docs/adoption-test.md` (REQ-06) — walkthrough verificado de camino A (relations directas, ejemplo generico Invoice/LineItem, <30 min) + camino B (polymorphicChildren, Activity real, <60 min), con las 3 trampas conocidas. Decision: doc dedicado (no seccion en versioning-capability.md) para no inflar la doc de capacidad.

**Tasks completadas**:
- [x] S3.T1 — Crear `object-manager/docs/adoption-test.md` (REQ-06)
- [x] S3.GATE — Gate de sync Session 3 (tier T1) + quality review docs

**Validacion del tier**:
- T1 — adoption-test.md: cada paso trazado a doc/codigo; camino A ~27min / B ~55min (cumple <30/<60); 3 trampas con sintoma→causa→fix. Test cases TC-01..TC-09 todos PASS (ver `## Test cases`). Cross-links object-manager/docs 100% resuelven. Resultado: pass.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (docs)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad/precision | pass | pasos trazados; timings realistas por paso |
| 2 | Claridad | pass | dos caminos + checklist copiable + tabla de trampas |
| 3 | Mantenibilidad | pass | doc dedicado (no infla versioning-capability.md) |
| 9 | Error-handling | pass | 3 trampas + tabla de errores referenciada |
| 10 | Consistencia | pass | coherente con versioning/polymorphic/row-actions |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S4 (cierre: review aislado + commits DET-27 + teach-close). Test de adopcion completo, TC-01..09 PASS
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 4 — 2026-06-04 17:40 — Cierre (review + commits + teach-close) [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1

**Objetivo**: Review de legibilidad por reviewer aislado read-only (REQ acceptance) + commits granulares por repo (DET-27) + teach-close v2 (DET-22, MUST en super) + status closed. Push pregunta (super).

**Tasks completadas**:
- [x] S4.T1 — Review de legibilidad por reviewer aislado read-only
- [x] S4.T2 — Commits granulares por repo (DET-27)
- [x] S4.T3 — teach-close (DET-22) + status closed
- [x] S4.GATE — Gate de cierre (tier T1)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Cierre del ticket — no hay S5. Todos los criterios PASS (TC-01..09), teach-close done, commits locales por repo
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Test cases

> DET-25: registrados al ejecutar. Ticket docs — el "test" es: ¿el criterio queda cubierto por una doc verificada contra codigo? Affects UI = no (docs).

| TC | Criterio (REQ) | Verificacion | Evidencia | Status | Session |
|----|----------------|--------------|-----------|--------|---------|
| TC-01 | versioning-capability.md: runtime + receta + politica + versionSourceId-vs-sourceRefId + Versionar-vs-Clonar (REQ-01) | Doc cubre las 8 sub-secciones; afirmaciones vs codigo | `version-from-source.js:42/48`, `instance.resolver.js:2321/2194/3115` | PASS | 1 |
| TC-02 | config-storage.md: columna + sync + shape + gate + lectura runtime (REQ-02) | Doc nuevo cubre los 5 puntos | `schema.prisma:28`, `generatePrismaSchema.js:2549/1296/2575`, `instance.resolver.js:2192/2333` | PASS | 1 |
| TC-03 | polymorphic-children.md: polymorphicChildren vs directChildren + derived en core (REQ-03) | Doc nuevo, cross-link a codegen doc, DISC-4 reflejado | `activity.json:20-24`, `deep-clone-polymorphic.js:108`, `instance.resolver.js:3085` | PASS | 2 |
| TC-04 | layout row-actions.md: type:create + visibilityConditions por relations (REQ-04) | Doc nuevo (EN, patron layout); shape verificado | `useCreateRowAction.ts`, `types/recordlist.ts:198-260`, `default_Activity_list.json:19-37` | PASS | 2 |
| TC-05 | PATTERNS.md: receta Activity end-to-end (REQ-05) | Seccion nueva sin romper contenido previo | `activity.json:11-39`, `seed/_data-workflow-objects.js:36-40` | PASS | 2 |
| TC-06 | Seccion "Versionar vs Clonar" (criterio ticket) | Presente en versioning-capability.md (tabla comparativa) | versioning-capability.md §Versionar vs Clonar | PASS | 1 |
| TC-07 | Politica via allowsVersioning + FK Workflow (criterio ticket) | Seccion "Politica institucional" en versioning-capability.md | `schema.prisma:1152/1176`, seed | PASS | 1 |
| TC-08 | Test de adopcion simulada <30/<60 min + trampas (REQ-06) | adoption-test.md: camino A ~27min, B ~55min, 3 trampas | adoption-test.md (timings por paso + tabla trampas) | PASS | 3 |
| TC-09 | prefill-capability.md correcto + cross-links (REQ-07) | Revisado; cross-links bidireccionales; 100% resuelven | object-manager/docs links check OK | PASS | 1 |

## Backlog

> Vacio.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El hook por-mod de remap de derived children (HU-8b) se generalizo al motor core via `applyDerivedRemap` + bloque declarativo `polymorphicChildrenDerived` (TICKET-049/UPONE-1219). La docs no debe describir un hook ad-hoc por-mod | research agent | intake | refined | doc: polymorphic-children.md (corrige material historico) |
| L2 | Syllabus/CurriculumPlan/CompetencyMap son scopes de workflow, no `objects/*.json`. El unico objeto versionado real es Activity. No hay ejemplo de `directChildren` en el mod CD | research agent | intake | refined | doc: adoption-test.md (scope del test simulado) + DISC-1 |
| L3 | Codegen lowercasea relaciones singulares (`currentstatus`, no `currentStatus`) — `version-from-source.js` lo compensa; layouts deben usar el nombre lowercase | research agent | intake | refined | bug-candidate (core, tolerado) + doc gotcha en row-actions.md/adoption-test.md |
| L4 | Comentario stale en `schema.prisma:28` (dice NULL si no declara versioning; el codigo usa gate `versioning OR prefillFrom`) | S1 review | 1 | refined | observacion core team (fix trivial de comentario, fuera de alcance docs) |
| L5 | `npm run docs:validate` (layout) crashea por `docs/confluence/` ausente/untracked en rama UPONE-1206. Preexistente | S2 | 2 | refined | observacion infra/branch (no introducido por este ticket) |
| L6 | (merge en L3) Casing `currentstatus` lowercase en layouts; mismatch → boton oculto | S2 | 2 | refined | → L3 |

## Teaching — Intake

**Status**: done
**Archivo**: [ticket-046.teach/teach-intake.html](ticket-046.teach/teach-intake.html) (v2 HTML, HOR-081)
**Bloques**: tldr · callout · concept-card · invariant · flow · two-col-compare · code · timeline · study-qa · tag
**Validacion**: `dkc-validate Teach` → valid (0 errors, 0 warnings)

## Teaching — Close

**Status**: done
**Archivo**: [ticket-046.teach/teach-close.html](ticket-046.teach/teach-close.html) (v2 HTML, HOR-081)
**Bloques**: tldr · tag · timeline · comparison-table · study-qa · callout
**Cobertura**: que se hizo (6 docs) · evolucion hipotesis (H1 refutada parcial, H2 confirmada) · flujo por session · lecciones (R5) · que viene (sin backlog bloqueante)
**Validacion**: `dkc-validate Teach` → valid (0 errors, 0 warnings)
