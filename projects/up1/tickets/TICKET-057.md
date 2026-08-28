---
id: TICKET-057
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1218
module: core
autopilot: autonomous
---

# Completar y ampliar documentación de adopción — clonado y versionado

## Request

> Continuación de [UPONE-1218](https://u-planner.atlassian.net/browse/UPONE-1218) (HU-12, epic UPONE-1206).
> TICKET-046 entregó 6 docs base. Este ticket cierra los gaps identificados en auditoría SP3 (2026-06-05)
> y agrega las guías de implementación independientes que HU-12 no alcanzó a cubrir.

Completar la documentación existente de clonado/versionado y crear dos guías de implementación completas y autónomas —una para clonado y otra para versionado— que sirvan de referencia tanto para developers como para LLMs que consulten el codebase.

### Alcance

**1. Completar `adoption-test.md` — Camino B (polymorphicChildren)**

El Camino A (hijos directos, Invoice/LineItem) está completo. El Camino B arranca pero el archivo
se trunca antes de completar los pasos B1–B4 para hijos polimórficos. Falta:
- Pasos para declarar `metadata.polymorphicChildren`
- Pasos para `polymorphicChildrenDerived` (bloque de remap — ya en core via `applyDerivedRemap`)
- Timing verificado (<60 min)
- Integración de los pasos con la trampa conocida: "olvidar `polymorphicChildrenDerived` cuando hay FKs internas entre hijos"

**2. Crear `object-manager/docs/guides/implementing-cloning.md`**

Guía de implementación standalone de clonado:
- Qué es clonado vs versionado (tabla comparativa, referencia a versioning-capability.md)
- Todos los campos del bloque `metadata.prefillFrom` con descripción de cada uno
- `exclude`: qué campos van y por qué (defaults + campos custom)
- `deepClone`: hijos directos vs polimórficos, cuándo usar cada uno
- Cómo funciona `polymorphicChildren` (adopción-focused, referencia a polymorphic-children.md)
- Row action tipo `create` sin `asNewVersion` (solo clonar)
- Ejemplo completo (Invoice/LineItem — camino A de adoption-test.md)
- Errores comunes con strings exactos del código
- Checklist de verificación post-implementación

**3. Crear `object-manager/docs/guides/implementing-versioning.md`**

Guía de implementación standalone de versionado:
- Qué es versionado, cuándo usarlo
- Todos los campos del bloque `metadata.versioning` con descripción de cada uno:
  - `linkageField` (FK reflexivo — requerido)
  - `versionField` (campo Int — requerido)
  - `versionStrategy` (`"increment"` — requerido)
  - `auditSourceField` (opcional)
  - `initialStateField` (opcional)
- Relación con `prefillFrom` (versionado es clonado + linaje + reset estado)
- Política institucional: `WorkflowStatus.allowsVersioning` + `Workflow.initialStatusId`
- `getVersionChain`: cómo leer el linaje
- Row action tipo `create` con `asNewVersion: true` + `visibilityConditions`
- RBAC: `requiredCapability` (opt-in)
- Ejemplo completo Activity (mods/curriculum-design — camino B de adoption-test.md)
- Errores comunes con strings exactos del código (`OBJECT_NOT_VERSIONABLE`, `SOURCE_NOT_VERSIONABLE`, `WORKFLOW_HAS_NO_INITIAL_STATUS`, etc.)
- Checklist de verificación post-implementación

**4. Documentar `polymorphicChildrenDerived` y `uniqueConstraints`**

Ambos aparecen en `activity.json` y en PATTERNS.md pero sin explicación propia:
- `polymorphicChildrenDerived`: cuándo es requerido (remapeo de FKs internas entre hijos clonados), shape, relación con `applyDerivedRemap` en core
- `uniqueConstraints`: qué hace, cómo se declara, relación con `scoped-uniqueness.js`

Puede ir como secciones en `polymorphic-children.md` y `prefill-capability.md` respectivamente, o como un apartado en las nuevas guías.

### Fuera de alcance

- No crear nuevos objetos CD para test en vivo (candidato a ticket aparte)
- No modificar código del core (solo docs)
- No tocar otros mods fuera de curriculum-design

## Estado de documentación base (TICKET-046 entregado)

Archivos entregados en TICKET-046 (todos verificados):

| Archivo | Estado | Notas |
|---------|--------|-------|
| `object-manager/docs/versioning-capability.md` | completo | runtime + receta + política + errores |
| `object-manager/docs/prefill-capability.md` | completo | prefillFrom + deepClone |
| `object-manager/docs/config-storage.md` | completo | sync → registry → resolver |
| `object-manager/docs/polymorphic-children.md` | completo | polymorphicChildren + derived remap |
| `layout/docs/features/row-actions.md` | completo | type:create + visibilityConditions |
| `mods/curriculum-design/.ai/PATTERNS.md` | completo (sección Activity) | receta end-to-end |
| `object-manager/docs/adoption-test.md` | **incompleto** | Camino A OK, Camino B truncado |

## Discovers previos relevantes (de TICKET-046)

- **DISC-4**: `applyDerivedRemap` ya está en core (TICKET-049), no requiere hook por-mod
- **DISC-5**: `asNewVersion` hace bump del max del linaje (no source.version+1), transacción Serializable
- **L3**: relación `currentstatus` en layouts es lowercase (codegen-generated) — gotcha documentado en row-actions.md y PATTERNS.md
- **L4**: comentario stale en `schema.prisma:28` — gate real es `versioning OR prefillFrom`

## Warnings

- Las guías nuevas deben ser autónomas pero referenciar la doc base (no duplicar)
- Verificar cada afirmación técnica contra `file:line` del código real (patrón DET-2)
- Idioma: `object-manager/docs/` en español, `layout/docs/` en inglés (ver TICKET-046 S2 — patrón de docs por repo)

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement (documentación — completar + ampliar docs de adopción) |
| Tipo de cambio | single (todo el delta real vive en `object-manager/docs/`; `layout/docs/row-actions.md` y `mods/curriculum-design/.ai/PATTERNS.md` ya están completos — solo se referencian) |
| Módulo principal | core (docs de object-manager) |
| Módulos afectados | object-manager (docs); referencia a layout y mod curriculum-design sin editarlos |
| Layer / épica | docs — épica UPONE-1206 (clonado/versionado core), tracking UPONE-1218 (HU-12, continuación de TICKET-046) |

## Creation scope

| Dimension | Aplica | Descripción |
|-----------|--------|-------------|
| Visual (UI) | no | Documentación markdown, sin vistas/componentes |
| Data model | no | No introduce entidades/schemas |

Ambos flags `false` → `design-draft` se omite.

## Triage

Continuación documental de TICKET-046 (cerrado 2026-06-04). El intake-explore verificó el **estado real** de la doc base contra el código (`file:line`) y descubrió que parte del alcance declarado en la auditoría SP3 (2026-06-05) ya estaba cubierto por TICKET-046 — el alcance real es menor y se reenfoca a los gaps genuinos.

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El alcance real < alcance declarado. `adoption-test.md` Camino B (B1–B6) ya está completo (no truncado); `polymorphicChildrenDerived` ya está documentado en `polymorphic-children.md` con `applyDerivedRemap`. Gaps genuinos: (a) 2 guías standalone nuevas (`implementing-cloning.md`, `implementing-versioning.md`), (b) `uniqueConstraints` sin documentar en ningún lado, (c) falta la trampa "olvidar `polymorphicChildrenDerived`" como ítem explícito en la tabla de trampas de `adoption-test.md` | ✓ confirmada | `adoption-test.md:112-153` (Camino B completo, timing "~55 min"); `polymorphic-children.md:48-80` (derived + `applyDerivedRemap` ya documentado); grep `uniqueConstraints` en `object-manager/docs/` → 0 resultados |
| H2 | `Invoice`/`LineItem` (ejemplo de Camino A en el material) **no existen** como objetos reales del repo; el único ejemplo real de `directChildren` es `CurricularSection` (`object-manager/objects/business/Base/curricularsection.json`, self-ref `children` via `parentId`). Las guías nuevas deben anclar el ejemplo en código real (DET-2/DET-4) y mantener `Invoice/LineItem` solo como esquema ilustrativo, consistente con la doc base existente | ✓ confirmada (multi-capa) | (1) `deep-clone-direct.js:12` usa Invoice/LineItem solo como comentario hipotético. (2) `curricularsection.json` tiene `directChildren` + `prefillFrom` reales. (3) `prefill-capability.md:21` y `polymorphic-children.md:26` ya etiquetan Invoice/LineItem como "ejemplo generico" |
| H3 | El "comentario stale en `schema.prisma:28`" (DISC-L4 de TICKET-046) **no existe** en el código actual: la línea 28 del BASEMODEL es la definición del campo `versioningConfig Json?` con un comentario correcto sobre qué persiste. No hay nada que corregir y, de existir, sería código (fuera de scope docs-only) | ✓ confirmada → no-acción | `object-manager/prisma/BASEMODEL/schema.prisma:28` — `versioningConfig Json? // Snapshot del bloque metadata.versioning + metadata.prefillFrom...`; ningún schema.prisma del repo contiene la frase "gate real es versioning OR prefillFrom" |

### Discoveries (intake-explore — 2026-06-05)

> Inmutables (DET-6). Investigación multi-capa contra código real (`file:line`) vía researcher.

- **DISC-1** (2026-06-05): `adoption-test.md` Camino B está **completo** (B1-B2 modelo+mecánica, B3 derived, B4-B6 política+row action+build, timing `~55 min`). El supuesto del ticket ("truncado antes de B1–B4") quedó obsoleto — TICKET-046 lo terminó después de la auditoría. **Acción**: reducir el ítem 1 del alcance a un único delta real (añadir la trampa de `polymorphicChildrenDerived` a la tabla de trampas).
- **DISC-2** (2026-06-05): `polymorphicChildrenDerived` ya está documentado en `polymorphic-children.md:48-80`, incluyendo el shape, `via`/`remapTo` y la corrección histórica ("`applyDerivedRemap` ya está en el core, no es hook por-mod" — TICKET-049). **Acción**: el ítem 4 del alcance se reduce a documentar **solo** `uniqueConstraints` (el único realmente ausente).
- **DISC-3** (2026-06-05): `uniqueConstraints` aparece en `activity.json:39` (`[["previousVersionId", "version"]]`) y se procesa en `generatePrismaSchema.js:518-533/832-836/973-978` (genera `@@unique` Prisma), pero **no está documentado**. Es distinto de `scoped-uniqueness.js` (enforcement app-level config-driven): `uniqueConstraints` = constraint DB-level. **Acción**: documentarlo en `prefill-capability.md` (o en la guía de clonado) con esa distinción.
- **DISC-4** (2026-06-05): el ejemplo real de `directChildren` en el repo es `curricularsection.json` (`children` via `parentId` + `prefillFrom.deepClone: ["children"]` + `requiredCapability: "curricularsection:clone"`). `Invoice/LineItem` es esquema ilustrativo, no objeto real. **Acción**: la guía de clonado usa `CurricularSection` como ejemplo real anclado a `file:line` y conserva `Invoice/LineItem` solo como forma genérica.
- **DISC-6** (2026-06-05, post-feedback del dev): **relocalización de las guías de implementación**. El Request nombró `object-manager/docs/guides/implementing-*.md`, pero el dev observó (correctamente) la separación reference vs how-to: `object-manager/docs/` debe explicar *qué es cada cosa + el flujo* (referencia de la capability del core), y *cómo implementar / qué decisiones tomar* pertenece a las **guías de mods** (`mods/docs/guides/`, sibling de `creating-a-mod.md`/`objects.md`/`layouts.md`/`seed-data.md`). **Acción**: las dos guías van a `mods/docs/guides/implementing-{cloning,versioning}.md` (links al árbol de referencia con `../../../object-manager/docs/`). Lo que SÍ es "qué es cada cosa" (sección `uniqueConstraints` en `prefill-capability.md`, trampa #4 en `adoption-test.md`) se queda en `object-manager/docs/`. `execute_scope` ajustado a `[object-manager/docs/, mods/docs/guides/]`. DET-3: el Request no se reescribe; el cambio de path queda registrado aquí + en `decisions_log`.
- **DISC-5** (2026-06-05): evidencia de código consolidada para las guías (ver researcher): `prepareVersionData` (`version-from-source.js:23-64`), bump por max-del-linaje + `$transaction` Serializable (`instance.resolver.js:3114-3116`), `getVersionChain` (`instance.resolver.js:2183-2259`), política `WorkflowStatus.allowsVersioning` (`prisma/BASEMODEL/schema.prisma:1165`) + `Workflow.initialStatusId` (`:1141-1142`), RBAC `requiredCapability` versioning (`instance.resolver.js:2337-2344`) / prefill (`:2308-2310`), row action `asNewVersion` (`recordlist.ts:216`, `useCreateRowAction.ts:68-77`).

### Context found

- **Rules del módulo**: `RULE-dev-004` / `core_work_policy` (trabajo en workspace core va en rama `UPONE-1206`, commits prefijo UPONE-1218; merge a develop gated por revisión team up1). Docs viven dentro de `object-manager/` (workspace core) → misma rama. Convenciones de doc: `object-manager/docs/` en español neutro (ver [[reference_up1_doc_conventions_per_repo]]).
- **Bugs abiertos**: ninguno sobre la doc de clonado/versionado.
- **Specs relacionados**: TICKET-046 / UPONE-1218 (predecesor, cerrado — entregó las 6 docs base). Sibling de sprint: TICKET-056 (`SPEC-core-improve-sp3-quality`, código). Este ticket genera spec propio.
- **Docs base (verificadas, TICKET-046)**: `versioning-capability.md`, `prefill-capability.md`, `config-storage.md`, `polymorphic-children.md`, `codegen-polymorphic-children.md`, `adoption-test.md` (object-manager); `row-actions.md` (layout); `PATTERNS.md` (mod CD). Las guías nuevas **referencian** estas, no duplican.
- **Warnings**:
  - **Idioma** (ver config + convención): `object-manager/docs/` en español neutro. Las dos guías nuevas van ahí → español.
  - **DET-2/DET-4**: cada afirmación técnica de las guías traza a `file:line` real. No presentar `Invoice/LineItem` (inexistente) como objeto del repo — usar `CurricularSection`/`Activity` reales (ver DISC-4).
  - **No duplicar**: las guías son autónomas pero enlazan a la doc base (ver DISC-1/DISC-2). El riesgo es re-explicar mecánica ya cubierta; mitigación: cada sección remite a la doc base para el detalle y aporta el **camino de implementación** (el qué-hacer-en-orden), no la teoría.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (las docs viven en `object-manager/`, workspace core; misma rama de la épica — RULE-dev-004) |
| Base branch | `develop` (merge gated por revisión team up1; el cierre DKC NO implica merge) |
| DB state | n/a (docs) |
| Services | n/a (docs; sin build/test de runtime) |
| Test data | n/a |
| Validación | Sin `docs:validate` en object-manager (a diferencia de layout). Validación = integridad de links relativos + verificación de cada `file:line`/string de error contra el código real + idioma ES neutro |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Separación reference vs how-to: `object-manager/docs/` = qué es/flujo (core); `mods/docs/guides/` = cómo adoptar (how-to). Las guías de implementación van en mods/docs, no en object-manager | dev feedback | S1 | refined | [[reference_up1_doc_conventions_per_repo]] |
| L2 | Idioma de docs es por árbol: `object-manager/docs/` español, `mods/docs/` + `layout/docs/` inglés. Verificar antes de escribir | dev feedback | S1 | refined | [[reference_up1_doc_conventions_per_repo]] |
| L3 | Documentar clonado/versionado como capas (versionar = clonar + linaje + bump + reset); la guía de versionado referencia la de clonado, no duplica | S2 | S2 | refined | — |
| L4 | En docs, la "regresión" es un link roto o un `file:line` divergente → verificación de links + grep de strings de error es gate, no opcional (atrapó 1 link cross-tree roto) | S2 | S2 | refined | — |
| L5 | Test de autosuficiencia (LLM en frío, solo docs) = PASS: respondió correcto/completo la mecánica usando solo las guías. Gap real detectado y parcheado post-cierre: faltaba snippet de seed de workflow-policy para mods nuevos (commit `7a611b5`) | post-close verification | S2 | discarded | — |

> **Repo raíz de up1 en rama nueva**: `mods/docs/` vive en el repo RAÍZ de up1 (estaba en `develop`, sin rama SP3). Se creó la rama `UPONE-1206` en el repo raíz para commitear las guías (commits `edafda0`, `7a611b5`). Capturado en [[reference_up1_doc_conventions_per_repo]].

## Sessions

### Plan de sessions (preplanificación)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Guía de clonado + `uniqueConstraints` + trampa derived | execute | T1 | crear `guides/implementing-cloning.md` (prefillFrom/exclude/deepClone/polymorphicChildren/row action create-sin-asNewVersion/ejemplo real CurricularSection/errores/checklist) · documentar `uniqueConstraints` en `prefill-capability.md` (distinción vs scoped-uniqueness) · añadir trampa #4 (`polymorphicChildrenDerived`) a la tabla de `adoption-test.md` | auto | links relativos resuelven · cada `file:line`/string de error verificado contra código · idioma ES neutro · sin duplicación de la doc base |
| S2 | Guía de versionado + cierre de referencias cruzadas | execute | T1 | crear `guides/implementing-versioning.md` (metadata.versioning campo-a-campo/relación con prefillFrom/política allowsVersioning+initialStatusId/getVersionChain/row action con asNewVersion+visibilityConditions/RBAC requiredCapability/ejemplo real Activity/errores exactos/checklist) · cablear referencias bidireccionales (docs base → nuevas guías) · verificación final de todos los links del set | auto | idem S1 + las dos guías enlazadas desde `versioning-capability.md`/`prefill-capability.md` · grep de strings de error = código |

**Notas del plan**: S1 y S2 tocan archivos disjuntos salvo el cableado de referencias en S2 (que toca docs base ya existentes). Secuencial sugerido (S1 fija el ejemplo de clonado que S2 referencia desde versionado). Numeración desde S1.

### Session 1 — 2026-06-05 16:00 — Clonado: guía + uniqueConstraints + trampa [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (verificación de `file:line`/strings + integridad de links + idioma ES)

**Objetivo**: crear la guía standalone de clonado (`guides/implementing-cloning.md`), documentar `uniqueConstraints` en `prefill-capability.md`, y añadir la trampa #4 (`polymorphicChildrenDerived`) a la tabla de `adoption-test.md`.

**Tasks completadas**:
- [x] S1.T1 — crear `guides/implementing-cloning.md` (prefillFrom/exclude/deepClone/polymorphicChildren/row action create-sin-asNewVersion/ejemplo real CurricularSection/errores/checklist)
- [x] S1.T2 — documentar `uniqueConstraints` en `prefill-capability.md` (shape, `@@unique` Prisma, distinción vs scoped-uniqueness, ejemplo `activity.json:39`)
- [x] S1.T3 — añadir trampa #4 (`polymorphicChildrenDerived`) a la tabla de trampas de `adoption-test.md`
- [x] S1.GATE — gate de sync Session 1 (tier T1): verificar `file:line`/strings, links, idioma; decidir continue/iterate/escalate/standby

**Validación del tier**:
- T1 — verificación `file:line`/strings de error: **pass** — `PREFILL_DEFAULT_EXCLUDE` (`prefill-from-source.js:20`), `PREFILL_SOURCE_TYPE_MISMATCH` (`:153`), `PREFILL_SOURCE_NOT_FOUND` (`:164`), `requiredCapability` enforce (`instance.resolver.js:2308-2310`), `uniqueConstraints` (`generatePrismaSchema.js:518`), `UNIQUE_VIOLATION` (`src/index.js:79`) — todos confirmados contra el código.
- Ubicación final: `mods/docs/guides/implementing-cloning.md` (relocalizada por feedback del dev — DISC-6). Links desde la nueva ubicación: **pass** (6/6 `../../../object-manager/docs/*.md` + `objects.md`/`layouts.md` resuelven).
- Idioma: **inglés** (convención del árbol `mods/docs/`) — **pass**. La sección `uniqueConstraints` en `prefill-capability.md` y la trampa #4 en `adoption-test.md` quedan en **español** (árbol `object-manager/docs/`).

**Discoveries / Learns nuevos**:
- L1: las guías de implementación son how-to de adopción → van en `mods/docs/guides/` (no en `object-manager/docs/`, que es referencia). Separación reference (qué es/flujo, core, español) vs how-to (cómo adoptar, mods, inglés). Feedback del dev, registrado en DISC-6.
- L2: la convención de idioma es **por árbol**: `object-manager/docs/` = español, `mods/docs/` + `layout/docs/` = inglés (verificado). El draft inicial se escribió en español por inercia y se reescribió en inglés al confirmar la ubicación. Candidato a actualizar la memoria de convenciones de doc por repo.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (autopilot super)
**Tier de revisión**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad (precisión técnica) | pass | Cada afirmación traza a `file:line` real verificado |
| 2 | Lint/formato markdown | pass | Tablas y code-fences bien formados |
| 3 | Tipado | n/a | Docs |
| 4 | Testing | n/a | Docs (sin suite) |
| 5 | Escalabilidad | pass | Guía referencia doc base, no duplica (evita drift) |
| 6 | Mantenibilidad | pass | Ejemplo anclado a objeto real (`curricularsection.json`), no a inexistente |
| 7 | Claridad | pass | Pasos numerados + checklist + tabla de decisión |
| 8 | a11y | n/a | Docs |
| 9 | Storybook | n/a | Docs |
| 10 | Error handling | pass | Tabla de errores con strings exactos del código |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 2 (S2: guía de versionado en inglés en mods/docs/guides/ + cableado de referencias bidireccionales + verificación final)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-06-05 16:30 — Versionado: guía + cableado + verificación final [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (verificación de `file:line`/strings + integridad de links del set + idioma por árbol)

**Objetivo**: crear la guía standalone de versionado (`mods/docs/guides/implementing-versioning.md`, en inglés), cablear referencias bidireccionales entre la doc base de `object-manager/docs/` y las dos guías nuevas, y hacer la verificación final del set completo (links + strings de error).

**Tasks completadas**:
- [x] S2.T1 — crear `mods/docs/guides/implementing-versioning.md` (versioning campo-a-campo/relación con prefillFrom/política allowsVersioning+initialStatusId/getVersionChain/row action asNewVersion+visibilityConditions/RBAC/ejemplo real Activity/errores exactos/checklist), en inglés
- [x] S2.T2 — cablear referencias bidireccionales: `versioning-capability.md` → guía versionado, `prefill-capability.md` → guía clonado, `adoption-test.md` → ambas; las guías → doc base
- [x] S2.T3 — verificación final del set: grep de strings de error en código + chequeo de cada link relativo del set
- [x] S2.GATE — gate de sync Session 2 (tier T1): acceptance final del set, commits, decisión de cierre

**Validación del tier**:
- T1 — strings de error de ambas guías verificados en código: **pass** (6/6 — `AS_NEW_VERSION_REQUIRES_PREFILL` `instance.resolver.js:2321`, `OBJECT_NOT_VERSIONABLE` `:2335`/`:2194`, `SOURCE_NOT_VERSIONABLE` `version-from-source.js:42`, `WORKFLOW_HAS_NO_INITIAL_STATUS` `:48`, `PREFILL_SOURCE_NOT_FOUND` `prefill-from-source.js:164`, `PREFILL_SOURCE_TYPE_MISMATCH` `:153`).
- `file:line` clave de versionado: **pass** (`validate-versioning.js:41` SP4_ALLOWED, `schema.prisma:1165` allowsVersioning, `instance.resolver.js:3114-3116` Serializable, `recordlist.ts:216` asNewVersion).
- Links del set completo: **pass** — guía versionado (8/8 incl. `../../curriculum-design/.ai/PATTERNS.md` corregido), cabling desde object-manager/docs (2/2 `../../mods/docs/guides/`). Idioma por árbol: **pass** (guías inglés, adiciones object-manager español).

**Discoveries / Learns nuevos**:
- L3: la guía de versionado se apoya explícitamente en la de clonado (versionar = clonar + linaje + bump + reset) — documentadas como capas, no como temas independientes. La de versionado solo agrega lo propio (política, getVersionChain, RBAC, uniqueConstraints).
- L4: link cross-tree inicial roto (`../curriculum-design` en vez de `../../curriculum-design`) — atrapado en verificación final. Confirma el valor de S2.T3 (chequeo de links como gate, no opcional).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (autopilot super)
**Tier de revisión**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad (precisión técnica) | pass | 6/6 strings de error + file:line clave verificados contra código |
| 2 | Lint/formato markdown | pass | Tablas y code-fences bien formados en ambas guías |
| 3 | Tipado | n/a | Docs |
| 4 | Testing | n/a | Docs (sin suite) |
| 5 | Escalabilidad | pass | Guías referencian doc base + entre sí (capas), no duplican |
| 6 | Mantenibilidad | pass | Ejemplo Activity anclado a `activity.json:5-40`; cabling bidireccional |
| 7 | Claridad | pass | 10 pasos + checklist + tabla de errores |
| 8 | a11y | n/a | Docs |
| 9 | Storybook | n/a | Docs |
| 10 | Error handling | pass | Tabla de errores con strings exactos + cuándo + dónde |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → → request-close (teach-close + acceptance). Commits pendientes de decisión de branch para mods/docs (up1 root está en develop)
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| Guía de clonado completa y precisa | TC-1 | manual | **COVERED** |
| Guía de versionado completa y precisa | TC-2 | manual | **COVERED** |
| `uniqueConstraints` documentado con distinción vs scoped-uniqueness | TC-3 | manual | **COVERED** |
| Integridad de links + `file:line` del set completo | TC-4 | manual | **COVERED** |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | `implementing-cloning.md` cubre todos los ítems del alcance (prefillFrom completo, exclude, deepClone directo/polimórfico, row action create sin asNewVersion, ejemplo real, errores, checklist) | REQ-IMPROVE-01 | manual | no | guía escrita | revisión por checklist del alcance | todos los ítems presentes y trazados a `file:line` | 7 pasos + ejemplo real CurricularSection + tabla de errores + checklist; ubicada en `mods/docs/guides/` (inglés) | revisión de checklist de alcance S1 + relocalización S2 | passed | S1 | relocalización a mods/docs/guides (DISC-6) |
| TC-2 | `implementing-versioning.md` cubre todos los ítems (versioning campo-a-campo, política, getVersionChain, row action asNewVersion+visibilityConditions, RBAC, ejemplo Activity, errores exactos, checklist) | REQ-IMPROVE-02 | manual | no | guía escrita | revisión por checklist del alcance | todos los ítems presentes y trazados a `file:line` | 10 pasos; campos versioning, política allowsVersioning+initialStatusId, getVersionChain, RBAC, row action, ejemplo Activity `activity.json:5-40`, errores | revisión de checklist de alcance S2 | passed | S2 | — |
| TC-3 | `uniqueConstraints` documentado: shape, genera `@@unique` Prisma, distinto de `scoped-uniqueness.js` | REQ-IMPROVE-03 | manual | no | sección escrita | leer la sección | distinción DB-level vs app-level clara + ejemplo `activity.json:39` | sección añadida a `prefill-capability.md` con tabla comparativa DB-level vs app-level + ejemplo `activity.json:39` + `generatePrismaSchema.js:518` | lectura de la sección | passed | S1 | — |
| TC-4 | Todos los links relativos del set resuelven y cada `file:line`/string de error coincide con el código | REQ-IMPROVE-04 | manual | no | docs escritas | grep de errores en código + chequeo de paths relativos | 0 links rotos, 0 refs `file:line` divergentes | 6/6 strings de error en código; links de ambas guías + cabling resuelven (1 link roto detectado y corregido: PATTERNS.md) | grep + chequeo de paths S2.T3 | passed | S2 | fix link `../`→`../../` PATTERNS.md |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| (docs — sin suite) | n/a | n/a | n/a | docs base existentes no se rompen: links entrantes verificados en S2 |

**Baseline**: la doc base de TICKET-046 está verificada y cerrada; el delta de este ticket es aditivo (2 guías nuevas + 1 sección + 1 fila de tabla + cableado de referencias).

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|

## Teaching — Intake

**Status**: ver frontmatter `teachings.intake`.
**Archivo**: [`TICKET-057.teach/teach-intake.html`](TICKET-057.teach/teach-intake.html)

## Teaching — Close

**Status**: ver frontmatter `teachings.close`.

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-05 | 2026-06-05 |
| intake-explore | done | 2026-06-05 | 2026-06-05 |
| teach-intake | done | 2026-06-05 | 2026-06-05 |
| design-improvement | done | 2026-06-05 | 2026-06-05 |
| request-execute (S1) | done | 2026-06-05 | 2026-06-05 |
| request-execute (S2) | done | 2026-06-05 | 2026-06-05 |
| request-close (teach-close + commits) | done | 2026-06-05 | 2026-06-05 |
