---
id: SPEC-core-improve-sp3-adoption-docs
project: up1
ticket: TICKET-057
status: done
---

# Guías de implementación de clonado y versionado + cierre de gaps de doc (HU-12 cont.)

# Guías de implementación de clonado y versionado + cierre de gaps de doc (HU-12 cont.)

## Executive summary — lo que estas aprobando

**Que se quiere**: cerrar el último tramo de documentación de la capacidad de clonado/versionado (épica UPONE-1206). TICKET-046 entregó la doc base que explica *cómo funciona* cada pieza (6 docs). Falta el *cómo se implementa de principio a fin*: dos guías standalone (una de clonado, una de versionado) que un dev de cualquier mod —o un LLM que consulta el codebase— pueda seguir sin reconstruir el flujo desde fragmentos. Más el único bloque de metadata que quedó sin doc (`uniqueConstraints`) y una trampa faltante en el test de adopción. Es trabajo **solo de documentación** — cero código.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Las guías **referencian** la doc base, no la duplican | La mecánica de `prefillFrom`/`versioning`/`polymorphicChildren` ya está en `prefill-capability.md`/`versioning-capability.md`/`polymorphic-children.md`. Las guías aportan el *camino de implementación* (qué hacer, en qué orden, con qué ejemplo real) y remiten a la doc base para la teoría. Evita drift entre dos fuentes |
| 2 | Los ejemplos se anclan a **objetos reales** del repo (CurricularSection, Activity), no a Invoice/LineItem | Invoice/LineItem no existen como objetos del repo (DISC-4); usarlos como "ejemplo del repo" violaría DET-2/DET-4. Se mantienen solo como esquema ilustrativo genérico, igual que la doc base ya hace |
| 3 | `uniqueConstraints` se documenta en `prefill-capability.md`; `polymorphicChildrenDerived` **no** se re-documenta (ya está en `polymorphic-children.md`) | El intake verificó que `polymorphicChildrenDerived` ya está cubierto (DISC-2). El ítem 4 del ticket se reduce a `uniqueConstraints`, el único realmente ausente (DISC-3) |

**Riesgos principales y como los mitigamos**:

- **Una guía afirma algo que el código no respalda** → DET-2: cada `file:line` y cada string de error se verifica contra el código en el gate (grep de strings de error en S2.GATE).
- **Las guías duplican y luego divergen de la doc base** → cada sección remite a la doc base para el detalle; el cableado de referencias bidireccionales (S2) mantiene el set cohesionado.
- **Romper links entrantes de la doc base** → REQ-PRESERVE-01: verificación final de todos los links relativos del set en S2.GATE.

**Que NO se hace en este ticket**:

- Crear objetos de dominio para test en vivo (Syllabus/CurriculumPlan) → fuera de alcance, candidato a ticket aparte.
- Modificar código del core (el supuesto comentario stale de `schema.prisma:28` ni existe — DISC-... H3).
- Editar `layout/docs/` o `mods/curriculum-design/.ai/` salvo referencia (ya completos).

**Tamaño estimado**: 2 sessions, ~2-3h efectivas. S1 (clonado + uniqueConstraints + trampa), S2 (versionado + cableado + verificación final).

**Como vas a saber que funciona**:
- Las dos guías existen, cubren todos los ítems del alcance, y cada afirmación técnica traza a `file:line` real.
- `uniqueConstraints` está documentado con la distinción explícita vs `scoped-uniqueness.js`.
- Todos los links relativos del set resuelven; los strings de error citados coinciden con grep del código.

---

## Purpose

Completar la documentación de adopción de clonado/versionado del core de up1 (épica UPONE-1206) con dos guías de implementación autónomas y el cierre de los gaps reales detectados en intake. Audiencia: devs de mods que adoptan la capacidad y LLMs que consultan el codebase. Sin cambio de comportamiento (docs).

## Requirements

### REQ-IMPROVE-01: Guía de implementación de clonado

> **Que cambia**: aparece `mods/docs/guides/implementing-cloning.md`, una guía standalone que recorre la activación del clonado de principio a fin.
> **Por que**: la doc base explica cada pieza por separado; falta el camino de implementación en un solo lugar, anclado a un ejemplo real.

El sistema (la documentación) MUST proveer una guía de clonado que cubra: (a) clonar vs versionar (tabla comparativa + referencia a `versioning-capability.md`); (b) todos los campos de `metadata.prefillFrom` (`exclude`, `deepClone`, `requiredCapability`) con descripción; (c) `exclude` — defaults (`id`, `createdAt`, `updatedAt`, `createdBy`) + campos custom y por qué; (d) `deepClone` — hijos directos (`directChildren`) vs polimórficos (`polymorphicChildren`), cuándo cada uno; (e) `polymorphicChildren` adopción-focused con referencia a `polymorphic-children.md`; (f) row action `type:create` **sin** `asNewVersion` (solo clonar) + `visibilityConditions`; (g) ejemplo completo anclado a objeto real (`CurricularSection`, `directChildren`); (h) errores comunes con strings exactos del código (`PREFILL_SOURCE_NOT_FOUND`, `PREFILL_SOURCE_TYPE_MISMATCH`, error de alias de `deepClone` no declarado); (i) checklist de verificación post-implementación.

**Actor**: developer/LLM adoptante (documentación)
**Layers**: docs (object-manager)

#### Acceptance
**El usuario puede verificar que funciona**: la guía existe en `guides/`, todos los ítems (a)-(i) presentes; cada `file:line`/string verificado contra código; idioma ES neutro; links relativos resuelven.

### REQ-IMPROVE-02: Guía de implementación de versionado

> **Que cambia**: aparece `mods/docs/guides/implementing-versioning.md`, guía standalone de la activación de versionado.
> **Por que**: versionar es clonar + linaje + bump + reset + política; necesita su propio camino de implementación que se apoye en el de clonado.

El sistema MUST proveer una guía de versionado que cubra: (a) qué es versionado y cuándo usarlo; (b) todos los campos de `metadata.versioning` (`linkageField` req, `versionField` Int req, `versionStrategy: "increment"` req, `auditSourceField` opc, `initialStateField` opc, `requiredCapability` opc) con descripción; (c) relación con `prefillFrom` (versionado = clonado + linaje + reset, referencia a la guía de clonado y a `versioning-capability.md`); (d) política institucional `WorkflowStatus.allowsVersioning` + `Workflow.initialStatusId`; (e) `getVersionChain` — cómo leer el linaje; (f) row action `type:create` con `asNewVersion: true` + `visibilityConditions`; (g) RBAC `requiredCapability` (opt-in); (h) ejemplo completo `Activity` (mod CD, camino B) anclado a `activity.json`; (i) errores comunes con strings exactos (`OBJECT_NOT_VERSIONABLE`, `SOURCE_NOT_VERSIONABLE`, `WORKFLOW_HAS_NO_INITIAL_STATUS`, `AS_NEW_VERSION_REQUIRES_PREFILL`); (j) checklist post-implementación.

**Actor**: developer/LLM adoptante (documentación)
**Layers**: docs (object-manager)

#### Acceptance
**El usuario puede verificar que funciona**: la guía existe, ítems (a)-(j) presentes; cada `file:line`/string verificado; ejemplo `Activity` coincide con `activity.json`; idioma ES neutro.

### REQ-IMPROVE-03: Documentar `uniqueConstraints`

> **Que cambia**: `prefill-capability.md` gana una sección que explica `uniqueConstraints`.
> **Por que**: aparece en `activity.json:39` y se procesa en el codegen, pero no está documentado en ningún lado (DISC-3); se confunde con `scoped-uniqueness.js`.

El sistema MUST documentar `uniqueConstraints`: shape (array de arrays de campos), qué hace (genera `@@unique([...])` de Prisma — constraint DB-level), cómo se declara (ejemplo `activity.json:39` → `[["previousVersionId", "version"]]`), dónde se procesa (`generatePrismaSchema.js`), y la **distinción explícita** vs `scoped-uniqueness.js` (enforcement app-level config-driven via `uniqueScopedBy`).

**Actor**: developer adoptante (documentación)
**Layers**: docs (object-manager)

#### Acceptance
**El usuario puede verificar que funciona**: la sección existe en `prefill-capability.md`; la distinción DB-level vs app-level es clara; el ejemplo cita `activity.json:39`.

### REQ-IMPROVE-04: Trampa de `polymorphicChildrenDerived` + cableado de referencias

> **Que cambia**: `adoption-test.md` gana una trampa explícita (olvidar `polymorphicChildrenDerived`) en su tabla; la doc base enlaza a las dos guías nuevas.
> **Por que**: la trampa está en prosa (B3) pero no en la tabla de trampas (DISC-1); las guías nuevas deben ser descubribles desde la doc base.

El sistema MUST añadir a la tabla "Las 3 trampas" de `adoption-test.md` una fila #4: síntoma (los links/refs del clon apuntan a los hijos del original) → causa (FKs internas entre hijos sin `polymorphicChildrenDerived`) → fix (declarar el bloque; el remap es automático via `applyDerivedRemap`). Y MUST cablear referencias bidireccionales: `versioning-capability.md` y `prefill-capability.md` enlazan a `guides/implementing-versioning.md`/`guides/implementing-cloning.md` respectivamente; las guías enlazan de vuelta a la doc base.

**Actor**: developer adoptante (documentación)
**Layers**: docs (object-manager)

#### Acceptance
**El usuario puede verificar que funciona**: la tabla de trampas de `adoption-test.md` tiene 4 filas; las guías están enlazadas desde la doc base y viceversa; todos los links resuelven.

### REQ-PRESERVE-01: Doc base de TICKET-046 intacta

> **Que cambia**: nada del contenido existente; este REQ es la red de seguridad.
> **Por que**: el delta es aditivo — no debe romper links ni contradecir la doc base.

El sistema MUST mantener el contenido de las 6 docs base sin contradicciones y con todos sus links entrantes/salientes resolviendo tras el cableado.

**Actor**: system
**Layers**: docs (object-manager)

## Non-functional requirements

No aplican (documentación; sin targets de performance/scale).

## Changes

### Added: mods/docs/guides/ (idioma: inglés — convención del árbol mods/docs)

| Archivo | Contenido |
|---------|-----------|
| `implementing-cloning.md` | Guía standalone de clonado, en inglés (REQ-IMPROVE-01) |
| `implementing-versioning.md` | Guía standalone de versionado, en inglés (REQ-IMPROVE-02) |

> **Ubicación + idioma (DISC-6, feedback del dev)**: las guías son how-to de adopción → viven en `mods/docs/guides/` (sibling de `creating-a-mod.md`/`objects.md`), no en `object-manager/docs/` (que es referencia). El árbol `mods/docs/` está **en inglés** (verificado contra `creating-a-mod.md`/`objects.md`/`layouts.md`), así que las guías se escriben en inglés. Las adiciones a `object-manager/docs/` (sección `uniqueConstraints`, trampa #4) se quedan en **español**, idioma de ese árbol.

### Modified: object-manager/docs/

| Archivo | Cambio | Por que |
|---------|--------|---------|
| `prefill-capability.md` | + sección `uniqueConstraints` + link a `guides/implementing-cloning.md` | REQ-IMPROVE-03 + REQ-IMPROVE-04 |
| `versioning-capability.md` | + link a `guides/implementing-versioning.md` | REQ-IMPROVE-04 |
| `adoption-test.md` | + trampa #4 (`polymorphicChildrenDerived`) + links a las guías | REQ-IMPROVE-04 |

## Tasks

### Session 1 — Clonado: guía + uniqueConstraints + trampa [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `guides/implementing-cloning.md` (ítems a-i de REQ-IMPROVE-01), ejemplo real CurricularSection, strings de error verificados | REQ-IMPROVE-01 | developer | — | `mods/docs/guides/implementing-cloning.md` | ítems a-i presentes; `file:line` verificados; ES neutro; links resuelven | git revert (borrar archivo) | DET-2 | pending | 1 |
| S1.T2 | Documentar `uniqueConstraints` en `prefill-capability.md` (shape, `@@unique` Prisma, distinción vs `scoped-uniqueness.js`, ejemplo `activity.json:39`) | REQ-IMPROVE-03 | developer | S1.T1 | `object-manager/docs/prefill-capability.md` | distinción DB-level vs app-level clara; cita `activity.json:39` + `generatePrismaSchema.js` | git revert | DET-2 | pending | 1 |
| S1.T3 | Añadir trampa #4 (`polymorphicChildrenDerived`) a la tabla de trampas de `adoption-test.md` | REQ-IMPROVE-04 | developer | — | `object-manager/docs/adoption-test.md` | tabla con 4 filas; síntoma/causa/fix correctos | git revert | DET-2 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier T1)** — persistir, verificar `file:line`/strings de error de la guía de clonado contra código, links relativos, idioma ES, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | guía de clonado completa + `uniqueConstraints` documentado + trampa #4 + 0 refs divergentes | (no aplica — cierre de session) | DET-2, DET-13, DET-20, DET-23 | pending | 1 |

### Session 2 — Versionado: guía + cableado + verificación final [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `guides/implementing-versioning.md` (ítems a-j de REQ-IMPROVE-02), ejemplo real Activity, strings de error exactos | REQ-IMPROVE-02 | developer | S1.GATE | `mods/docs/guides/implementing-versioning.md` | ítems a-j presentes; ejemplo coincide con `activity.json`; `file:line` verificados; ES neutro | git revert (borrar archivo) | DET-2 | pending | 2 |
| S2.T2 | Cablear referencias bidireccionales: `versioning-capability.md` → guía versionado, `prefill-capability.md` → guía clonado, `adoption-test.md` → ambas; las guías → doc base | REQ-IMPROVE-04 | developer | S2.T1 | `object-manager/docs/versioning-capability.md`, `prefill-capability.md`, `adoption-test.md` | links bidireccionales presentes; sin duplicación de contenido | git revert | DET-16 | pending | 2 |
| S2.T3 | Verificación final del set: grep de todos los strings de error citados en el código + chequeo de cada link relativo del set | REQ-PRESERVE-01, REQ-IMPROVE-04 | reviewer | S2.T2 | (lectura) `object-manager/docs/` + `object-manager/src/` | 0 links rotos; 0 strings de error inexistentes | (no aplica) | DET-2, DET-13 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier T1)** — persistir, acceptance final del set completo, commits, decisión de cierre | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | las 2 guías completas + cableado + verificación 0 errores | (no aplica — cierre de session) | DET-2, DET-13, DET-20, DET-23 | pending | 2 |

### Task contract

```
Task S2.T1: Guía de implementación de versionado
- source_ref: REQ-IMPROVE-02
- agent: developer
- files: mods/docs/guides/implementing-versioning.md (nuevo)
- precondition: guía de clonado cerrada (S1.GATE) — versionado la referencia
- expected_output: guía standalone con ítems a-j, ejemplo Activity anclado a activity.json, errores exactos
- validation: ítems presentes + file:line verificados + grep de strings de error = código + ES neutro
- rollback: git revert (borrar archivo nuevo)
- rules: [DET-2]
```

## Constraints

- **RULE-dev-004 / core_work_policy**: las docs viven en `object-manager/` (workspace core) → rama `UPONE-1206`; commits prefijo `UPONE-1218` (DET-19, tracking HU-12); merge a `develop` gated por revisión del team up1 — el cierre DKC NO implica merge.
- **Idioma (por árbol)**: `object-manager/docs/` en **español** neutro (referencia de capability); `mods/docs/` en **inglés** (verificado contra los guides existentes). Cada doc en el idioma de su carpeta — DISC-6.
- **DET-2/DET-4**: cada afirmación traza a `file:line` real; no presentar objetos inexistentes (Invoice/LineItem) como objetos del repo.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Doc base TICKET-046 | internal | Las guías referencian las 6 docs base | Bajo — base cerrada y verificada |
| Evidencia de código (researcher) | internal | `file:line` consolidados en intake (DISC-5) | Bajo — verificada en intake; re-grep en gates |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Una guía cita un `file:line` que cambió | low | medium | grep de strings de error + spot-check de refs en cada gate (DET-2) |
| Duplicación que diverge de la doc base | low | medium | cada sección remite a la doc base; cableado bidireccional en S2 |
| Romper links entrantes de la doc base | low | low | verificación final de links del set (S2.T3) |

## Open questions

Ninguna — todas resueltas en intake-explore (H1/H2/H3 ✓, alcance reenfocado por DISC-1..4).

## Acceptance checkpoints

- [x] **Funcional**: REQ-IMPROVE-01..04 cumplidos (2 guías + uniqueConstraints + trampa #4 + cableado) — TC-1..TC-4 passed
- [x] **Precisión (DET-2)**: cada `file:line`/string de error verificado contra el código real (6/6 strings + file:line clave)
- [x] **Rules**: RULE-dev-004 respetada — commits en rama `UPONE-1206` de cada repo (object-manager `dfbc8a0`; up1 root rama nueva `UPONE-1206` `edafda0`), prefijo `UPONE-1218` (DET-19); idioma por árbol (guías EN, object-manager ES)
- [x] **Integration (REQ-PRESERVE-01)**: doc base intacta; 100% de links relativos del set resuelven (1 roto detectado y corregido)
- [x] **Docs**: las guías son autónomas (`mods/docs/guides/`) y enlazadas bidireccionalmente desde la doc base de `object-manager/docs/`
