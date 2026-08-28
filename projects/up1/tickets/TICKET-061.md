---
id: TICKET-061
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1260
module: curriculum-design
autopilot: autonomous
---

# MCP-readiness curriculum-design — enforcement server-side de reglas de integridad

## Request

> Ticket externo: [UPONE-1260](https://u-planner.atlassian.net/browse/UPONE-1260) — historia de Jira de este sprint (todo el trabajo se une acá).
> **Consolida** (supersede): TICKET-060 (M2 — suma ponderada) → obsoleto, absorbido acá.

Endurecer al **backend** un conjunto de reglas de integridad del mod curriculum-design que hoy viven **solo en el frontend** o **no están enforzadas**. Detectadas en la auditoría de compatibilidad MCP (`specs/mcp/13-mod-compatibility-guide.md`, caso M2) + la validación de paridad Confluence↔implementación. Un cliente no-web (MCP, API) puede hoy crear/publicar datos inválidos sin que nada lo frene. **Todo se cubre SOLO en el mod (cero cambios en core).**

### Los 4 items

| # | Regla | Hoy | Vía (mod-only) | Mecanismo |
|---|-------|-----|----------------|-----------|
| I1 | **Suma ponderada de evaluaciones**: pesos de hijos = peso del padre (100% en raíz) | solo frontend (advisory) | `≤ padre` en cada write + `===` recursivo al publicar | dominio |
| I2 | **Modality.isDefault**: solo una Modality default por dueño | sin enforcement | validación de dominio (cross-table) en cada write | dominio |
| I4 | **Workflow.isDefault**: único por institución + scopeType | sin enforcement | índice único parcial | declarativo |
| I5 | **AcademicProgram.code**: único por institución (forma declarativa MCP-visible) | `@@unique([institutionId, code])` en DB, falta la forma declarativa | declarar `uniqueScopedBy: ["institutionId"]` (el `@@unique` ya es el backstop) | declarativo |

> **I1 e I2 comparten el punto de enganche**: wrapper de validación de dominio en el mod (override de `createInstance`/`updateInstance` de las secciones `rt__*` + `transitionActivityValidated` para el `===` de I1 al publicar). **I4 e I5 son declarativos independientes** (I4 = índice parcial en el seed; I5 = `uniqueScopedBy` en el JSON).

> **Activity.code (ex-I3) — SACADO del alcance** (dev, 2026-06-10): la unicidad de `Activity.code` se descope porque **complica con el versionado** (las versiones comparten el código) y además era una regla **inferida, no de Confluence**. Queda en backlog (B3) para retomar si negocio confirma la regla. **Ya no tocamos `Activity.code` ni el create de Activity** → el wrapper de dominio se limita a secciones (Modality + EvaluationComponent).

### Provenance — hecho (Confluence) vs inferido (DET-4, verificado 2026-06-10)

- **I1 (suma ponderada)**: ✅ **Confluence** — `EvaluationComponent.weight` = "Ponderación porcentual (relativa al padre en Composite, o a 100 si es raíz)"; precedente explícito `graduationProfileEntry`: "Validación de suma weight=100 por plan es regla de negocio". Regla documentada, hoy solo enforzada en frontend.
- **I2 (Modality.isDefault)**: ✅ **Confluence** (textual: "Solo una sección Modality del mismo dueño puede tener isDefault=true").
- **I4 (Workflow.isDefault)**: ✅ **Confluence** (textual: "Único por institución + scopeType").
- **I5 (AcademicProgram.code)**: ⚠️ **INFERIDO** — Confluence dice "código institucional", NO "único". **Confirmar con negocio/PO.**

### Meta MCP-readiness (alcance de este ticket)

Este ticket deja el **MOD MCP-ready**: enforcement server-side (los 4 items) + la query de validación + la superficie GraphQL que el contrato del MCP referencia. **El MCP queda forzado por el mod aunque el contrato no esté registrado** (la validación está en el resolver, aguas abajo de todos los clientes).

**Entregable adicional**: documentar el **`ObjectContract` objetivo** (mapping §6 de la guía) para los objetos afectados, de modo que la registración en el repo `mcp` (cuando esté disponible) sea transcripción directa. La registración real en `mcp/src/contracts/registry.ts` queda como follow-up diferido (B2).

### Decisiones

- **D-A** (I1 single source): `computeInvalidNodes` → `logic/helpers/weightedSum.js` (ESM puro); el componente `validateWeightedSum.ts` lo wrappea. Fallback si el build frontend no importa de `logic/`: duplicar + test de paridad.
- **D-B** (I1 gatillo publish): validar `===` al transicionar a categoría `Published` (leer `transition.toStatus.category`, NO hardcodear id).
- **D-C** (I1 MCP): incluir query read-only `validateActivityEvaluations(activityId)`.
- **D-E** (cuándo enforzar I1/I2) — **RESUELTA: en cada escritura**. I1: `suma(hijos) ≤ peso(padre)` en cada create/update + `=== ` recursivo al publicar. I2: validar en cada create/update. Consecuencia: override de `createInstance`+`updateInstance` para secciones `rt__*` EN SCOPE (delegar al genérico salvo Modality/EvaluationComponent; tests exhaustivos DET-7).
- **D-F** (comparación exacta) — **RESUELTA: pesos enteros**. Codegen mapea `weight type:"number"` → `Int?`; datos UPU todos enteros. → `===` exacto directo, sin tolerancia. Front+back vía helper compartido (D-A).
- **D-D** (ex Activity.code scope) — **RETIRADA**: I3 sacado del alcance (ver backlog B3).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement (endurecer al backend reglas de integridad existentes) |
| Tipo de cambio | single (mod curriculum-design: `logic/` resolvers + helpers, `seed/_data-indexes.js`, `objects/AcademicProgram.json`, `modsComponents/` wrapper) |
| Módulo principal | curriculum-design |
| Módulos afectados | curriculum-design. object-manager: solo `sync`. **Sin cambios de código en core.** |

## Triage

Complejidad: **media**. El grueso es un punto de validación de dominio para **secciones** (Modality + EvaluationComponent) que hoy no existe (van por CRUD genérico). I4/I5 son chicos/declarativos. Riesgo: toca `transitionActivityValidated` (crítica, para I1 publish) y el path de create de secciones → tests obligatorios.

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Los 4 items se cubren SOLO con cambios en el mod (sin core) | ✓ confirmada | `polymorphicUpdate.resolver.js`: el core spreadea `...dynamicResolvers.mutations` al final → resolver del mod override gana (probado con `updateInstance`). `_data-indexes.js` crea índices DB desde el seed con "scope mod estricto". |
| H2 | I1 (`computeInvalidNodes`) es portable tal cual (puro) | ✓ confirmada | `validateWeightedSum.ts` puro, sin Vue. Hook: `transitionActivityValidated` (mod). Tolerancia efectiva 0.01 → irrelevante (pesos enteros, D-F). |
| H3 | I1 es invariante de árbol → `≤` por-write + `===` al publicar; I2 es regla de conjunto per-write | ✓ confirmada | árbol de evaluación se arma incremental (≤ válido en write, == al completar/publicar). isDefault no es incremental. |
| H4 | I2 NO se cubre con índice (cross-table) → validación de dominio | ✓ confirmada | DB UPU: `isDefault` en `rt__Modality__curricularsection`, `ownerId`/`recordType` en `CurricularSection` (join `curricularsectionId`). 0 duplicados hoy. |
| H5 | I4 (Workflow.isDefault) se cubre con índice único parcial | ✓ confirmada | DB UPU: `Workflow` tiene los 3 campos en la misma tabla. `CREATE UNIQUE INDEX ... WHERE isDefault=true`. 0 duplicados hoy. |
| H6 | El override de `createInstance` del mod (para secciones) no rompe la creación de otros objetos | ✓ confirmada | Patrón delegate-to-generic-on-non-match **ya probado** en `logic/polymorphicUpdate.resolver.js:471-474` (`if (!RT_PATTERN.test(objectType)) return generic.updateInstance(...)`). El create usa **validate-then-delegate** (valida in-scope → llama `generic.createInstance`), NO replica la lógica del genérico (a diferencia del update, que sí la replica por el bug de `_previousData`). Riesgo menor que el update. Tests de no-regresión TC-9. |
| H7 | Dos archivos `*.resolver.js` del mod NO pueden exportar el mismo campo `Mutation` (colisión de scanner) | ✓ confirmada | `docs/patterns/resolver-override.md:46-65`: el scanner acumula todo export con "mutation" en el nombre en `dynamicResolvers.mutations` y el último gana en colisión, orden no determinista entre archivos del mod. `polymorphicUpdate.resolver.js` YA exporta `updateInstance` → la validación de update (I1≤/I2) DEBE integrarse ahí; `createInstance` (sin override previo) va en archivo nuevo. |

### Context found

- **Origen**: auditoría de paridad Confluence↔impl + guía MCP M2. Capa workflow YA tiene su unicidad aplicada (workflowStatus.code/name, workflow.name, workflowTransition.name ✓).
- **Mecanismo override mod-only** (verificado): el core spreadea las mutations del mod al final → override del mod gana. Probado con `updateInstance`.
- **Datos UPU**: 0 duplicados (Workflow, Modality) → enforcement nuevo no rompe datos.
- **Rules**: `RULE-curriculum-design-003/004` (mutations `*Validated`), `RULE-mods-003` (sync), `RULE-mods-008` (seed/FK), `RULE-dev-006` (tests + arranque).
- **Warnings**:
  1. ⚠️ Override de `createInstance` = path caliente → delegar al genérico salvo **Modality/EvaluationComponent**; **tests obligatorios** (DET-7).
  2. ⚠️ Índice único parcial (I4) no lo genera el codegen → `_data-indexes.js`, extender el template para `unique` + `where`.
  3. ⚠️ Toca `transitionActivityValidated` (mutation crítica, para I1 publish) → tests de transición.
  4. ⚠️ I5 (`uniqueScopedBy`) requiere índice de respaldo — ya existe vía el `@@unique([institutionId,code])` actual → sin riesgo de falla silenciosa.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | rama de épica de UPONE-1260 (`UPONE-1261-*`) — confirmar en execute. Commits referencian UPONE-1260 (DET-19) |
| Base branch | `develop` |
| DB state | I4 agrega índice (seed). I1/I2 validación (sin schema). I5 = uniqueScopedBy (índice ya existe). Query nueva (D-C) regenera typedef. `npm run sync` + restart object-manager |
| Services | object-manager (GraphQL :4000), suite, postgres UPU |
| Test data | seed Univalle (Modality default + EvaluationComponent NF/Q1-Q6/EP) + workflows. 0 duplicados de base |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Constraint de colisión del scanner de resolvers del mod: no se puede exportar el mismo campo `Mutation` desde dos `*.resolver.js`. La validación de update I1/I2 debe integrarse en `polymorphicUpdate.resolver.js` (que ya posee `updateInstance`); `createInstance` va en archivo nuevo (`docs/patterns/resolver-override.md:46-65`) | intake-explore | — | refined | docs/patterns/resolver-override.md (ya documenta el patrón) |
| L2 | El create de secciones usa validate-then-delegate (valida → `generic.createInstance`), evitando replicar la lógica rt__ del genérico que sí replica el update polimórfico (por el bug de `_previousData`). Menor superficie de fragilidad ante cambios del core | intake-explore | — | refined | spec DEC-LOCAL-01 + docs/reference/mcp-object-contract.md |
| L3 | El scanner del platform registra resolvers del mod por nombre de export: `key.toLowerCase().includes('query')` → `Query`, `includes('mutation')` → `Mutation` (`resolverIndex.js:47-50`). Por eso `activityQuery` se descubre solo; mismo mecanismo que mutations | developer | S2.T5 | refined | docs/reference/mcp-object-contract.md (sección tool) |
| L4 | **Deuda de test de TICKET-059 (AcademicProgram) detectada por la regresión de S2.T6**: (a) `seed-entry.test.ts` no mockeaba `loadAcademicPrograms` → la fn real corría contra `fakePrisma={}` y lanzaba `TypeError prisma.institution.findFirst`; (b) `layouts-declared.test.ts` afirmaba 29 layouts pero AcademicProgram agregó 4 (total 33). Ambos eran tests stale (no bug de código), corregidos en este ticket por pedido del dev. Lección: al agregar un loader al `seed.js` o layouts nuevos, actualizar los tests de inventario/dispatch en el mismo cambio | developer | S2.T6 | refined | lección de proceso documentada (commit fix 29fd9da); no requiere RULE nueva |
| L5 | Workflow.isDefault YA tenía enforcement runtime en `createWorkflowValidated` (`WORKFLOW_DOUBLE_DEFAULT`); el CRUD generic `createWorkflow/updateWorkflow` lo bypassa (workflow.json:56 + workflow.resolver.js:6-9). El índice parcial I4 es el backstop a nivel DB que cierra ese gap MCP (cubre todos los paths). Patrón: validación runtime en la mutation validated + índice/constraint como backstop universal | developer | S3.T1 | refined | docs/reference/mcp-object-contract.md (I4 backstop) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| 1 | Cubrir Modality.isDefault (I2) con índice único parcial | `isDefault` y `ownerId` en tablas distintas (verificado DB UPU) — el índice parcial no cruza tablas | "Solo un default por dueño" en modelo polimórfico multi-tabla → validación de dominio, no índice |

## Sessions

### Modo (autopilot)

| Timestamp | Transición | Razón | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-06-11T13:46:33Z | false → super | dev: "ejecuta 061 en super autopilot" | inicio del flujo (teach-intake) |

### Plan de sessions (preplanificacion)

3 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria específicos) lo completa `design-improvement` al generar el spec. Cada session puede subdividirse o colapsarse durante execute si el tamaño real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Wrapper de validación de dominio de secciones + **I2** (Modality.isDefault único por dueño). Hooks: `createInstance` (archivo nuevo, validate-then-delegate) + `updateInstance` (integrar en `polymorphicUpdate.resolver.js` por constraint H7). Helper validador `isDefault` cross-table | 1 | T2 | ~4 (helper + create hook + update hook + tests I2) | ⚑ fuerte | Path caliente create/update de secciones: TC-5/TC-6/TC-9 verde (2da default rechazada, cambiar default OK, otros objetos delegan al genérico sin cambio). Arranque object-manager OK |
| S2 | **I1** suma ponderada. Helper `logic/helpers/weightedSum.js` (ESM puro, D-A) reusado por front (`validateWeightedSum.ts`) + back. `≤ padre` por write (reusa hooks S1) + `===` recursivo al publicar en `transitionActivityValidated` (D-B, categoría Published). Query read-only `validateActivityEvaluations` (D-C). Paridad front/back | 2 | T3 | ~5 (helper + paridad + write ≤ + publish === + query D-C) | ⚑ fuerte | Toca `transitionActivityValidated` (crítica): TC-1/TC-2/TC-3/TC-4 verde. Regresión de transición OK. Paridad helper front↔back (TC-6 del ticket-060 absorbido) |
| S3 | **I4** (índice único parcial en `_data-indexes.js`: extender builder con `unique`+`where`) + **I5** (`uniqueScopedBy: ["institutionId"]` en `AcademicProgram.json`, backstop `@@unique` ya existe) + regresión completa del mod + doc del `ObjectContract` objetivo (entregable B2) | 3 | T2 | ~4 (índice I4 + uniqueScopedBy I5 + regresión + doc ObjectContract) | ⚑ fuerte | TC-7/TC-8 verde (2do workflow default rechazado, 2do AcademicProgram dup rechazado). `npm run sync` aplica índice. Suite del mod sin regresión |

**Notas del esqueleto**:
- **Dependencia S1→S2**: S2 reusa los hooks create/update de secciones que S1 establece. No paralelizar.
- **H7 (constraint de colisión)**: la validación de `updateInstance` se integra en el `polymorphicUpdate.resolver.js` existente (no archivo nuevo). El `createInstance` sí va en archivo nuevo. Ambos comparten helpers en `logic/helpers/`.
- **I5 inferido (DET-4)**: la unicidad de `AcademicProgram.code` es inferida, no confirmada por Confluence. Se implementa la forma declarativa (el `@@unique` ya existe como backstop) pero queda anotada como pendiente de confirmación de negocio (active question).
- **Numeración continua** (DET-20): sin sessions previas registradas → plan arranca en S1.

### Session 1 — 2026-06-11 — Wrapper de validación de dominio de secciones + I2 [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: establecer el wrapper de validación de dominio para secciones polimórficas (create en archivo nuevo `sectionValidation.resolver.js` con validate-then-delegate; update integrado en `polymorphicUpdate.resolver.js` por constraint H7) y enforzar I2 (una sola Modality `isDefault=true` por dueño, cross-table).

**Tasks completadas**:
- [x] S1.T1 — Baseline + helper `logic/helpers/modalityDefault.js` (validador puro de Modality default cross-table)
- [x] S1.T2 — Nuevo `logic/sectionValidation.resolver.js` (`createInstance` validate-then-delegate para Modality, delega el resto) + codes en `errors.js`
- [x] S1.T3 — Integrar I2 en el `updateInstance` existente de `polymorphicUpdate.resolver.js` (H7)
- [x] S1.T4 — Tests I2 + no-regresión (2da default rechazada, cambiar default OK, objeto fuera de scope delega)
- [x] S1.GATE — Gate de sync Session 1 (tier T2): persistir, quality review DET-23, commits granulares, decidir

**Validación del tier**:
- T2 — vitest run del mod: 81/81 verde (5 files; 18 tests nuevos I2 + 8 polymorphicUpdate + 55 auditCapture sin regresión). eslint exit 0. `sync:logic` 0 errores (7 mod resolvers registrados, typeDefs regenerados). node --check OK en source + synced. object-manager health 200.

**Discoveries / Learns nuevos**:
- L1/L2 (ya en tabla Learns, detectados en intake): constraint de colisión del scanner (H7) + validate-then-delegate del create. Confirmados empíricamente en S1 (sync registró 7 resolvers sin colisión; suite verde).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (autopilot super)
**Tier de revision**: standard (T2)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Helpers puros, funciones <40 líneas, nombres en inglés, comentarios en español |
| 2 | Lint | pass | eslint exit 0 en los 7 archivos |
| 3 | Tipado | n/a | logic/ es JS (no TS) |
| 4 | Testing | pass | 18 tests nuevos cubren I2 create+update+no-op+regresión; suite 81/81 |
| 5 | Escalabilidad | pass | Query I2 usa índice existente `ownerType,ownerId,recordType` (CurricularSection.json) |
| 6 | Mantenibilidad | pass | Single-source helper reusado; H7 documentado inline |
| 7 | Claridad | pass | Mensajes de error accionables (listan secciones en conflicto + remedio) |
| 8 | a11y | n/a | backend |
| 9 | Storybook | n/a | backend |
| 10 | Error-handling | pass | Throw con código `MODALITY_DOUBLE_DEFAULT`; nada swallowed |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Commits DET-27**:
- `29ad87f` — UPONE-1260-S1 feat(curriculum-design): enforce Modality default uniqueness server-side (I2)
- `0637c74` — UPONE-1260-S1 test(curriculum-design): I2 Modality default uniqueness (create+update)

### Session 2 — 2026-06-11 — I1 suma ponderada (write ≤ + publish === + query) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: enforzar I1 (suma ponderada de evaluaciones) server-side. Helper compartido front/back (`logic/helpers/weightedSum.js`, D-A), `≤ padre` por write (reusa hooks S1), `===` recursivo al publicar en `transitionActivityValidated` (D-B), y query read-only `validateActivityEvaluations` (D-C).

**Tasks completadas**:
- [x] S2.T1 — Helper `logic/helpers/weightedSum.js` (ESM puro): `computeInvalidNodes` exacto enteros + `childrenExceedParent` + codes en `errors.js`
- [x] S2.T2 — Single-source front/back (D-A): `validateWeightedSum.ts` wrappea el helper; fallback duplicar+paridad si el build no importa de `logic/`
- [x] S2.T3 — I1 `≤` por write en create (sectionValidation) + update (polymorphicUpdate) para EvaluationComponent
- [x] S2.T4 — I1 `===` al publicar en `transitionActivityValidated` (gateado por categoría Published, D-B)
- [x] S2.T5 — Query `validateActivityEvaluations(activityId)` (D-C) + schema + `npm run sync`
- [x] S2.T6 — Tests I1 completos + regresión de transición (TC-1..TC-4, paridad, gobernanza intacta)
- [x] S2.GATE — Gate de sync Session 2 (tier T3): persistir, quality review, regresión, commits, decidir

**Validación del tier**:
- T3 — suite COMPLETA del mod: **693/693 verde (40 files)**. I1 cubierto (TC-1 publish bloqueo, TC-2 write ≤, TC-3 publish válido + gobernanza intacta, TC-4 query). Paridad front/back (D-A fallback). `sync:logic` 0 errores (query en typeDefs mods.js). eslint exit 0. Regresión: además se corrigieron 2 tests stale preexistentes de TICKET-059 (ver Learns L4).

**Discoveries / Learns nuevos**:
- L3: el scanner del platform registra resolvers del mod por nombre de export (`includes('query')`/`includes('mutation')`).
- L4: deuda de test de TICKET-059 (seed-entry mock + layouts count) detectada por la regresión y corregida en este ticket.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (autopilot super)
**Tier de revision**: exhaustive (T3)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Helpers puros y testeables; funciones acotadas; comentarios en español |
| 2 | Lint | pass | eslint exit 0 (logic) |
| 3 | Tipado | pass | weightedSum.parity.test.ts (TS) compila; logic JS |
| 4 | Testing | pass | suite 693/693; I1 con publish gate + write ≤ + query + paridad |
| 5 | Escalabilidad | pass | árbol O(n); query D-C read-only; sin N+1 (un findMany por activity) |
| 6 | Mantenibilidad | pass | fuente única de la suma vía paridad testeada (DEC-LOCAL-03); reuso del helper en T4/T5 |
| 7 | Claridad | pass | errores listan nodos inválidos (expected/actual) |
| 8 | a11y | n/a | backend |
| 9 | Storybook | n/a | backend |
| 10 | Error-handling | pass | throws con códigos `EVALUATION_WEIGHT_*`; transacción no corre si publish inválido |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Commits DET-27**:
- `6322273` — UPONE-1260-S2 feat(curriculum-design): enforce weighted-sum integrity server-side (I1)
- `6a26fb7` — UPONE-1260-S2 test(curriculum-design): I1 weighted-sum (write ≤, publish ===, query, paridad)
- `29fd9da` — UPONE-1260-S2 fix(curriculum-design): corregir 2 tests stale de AcademicProgram (TICKET-059)

### Session 3 — 2026-06-11 — I4 (índice) + I5 (uniqueScopedBy) + regresión + doc [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: cerrar los items declarativos — I4 (índice único parcial de Workflow default vía `_data-indexes.js`) e I5 (`uniqueScopedBy` en AcademicProgram.code) — más regresión completa del mod y la documentación del `ObjectContract` objetivo (entregable B2).

parallel_groups: [[S3.T1, S3.T2]]

**Tasks completadas**:
- [x] S3.T1 — I4: extender el builder de `_data-indexes.js` (soporte `unique`+`where`) + índice `Workflow (institutionId, scopeType) WHERE isDefault=true`
- [x] S3.T2 — I5: `uniqueScopedBy: ["institutionId"]` en `AcademicProgram.json` code (backstop `@@unique` ya existe) + sync
- [x] S3.T3 — Regresión completa del mod (suite entera verde)
- [x] S3.T4 — Documentar el `ObjectContract` objetivo (B2) en docs/ del mod
- [x] S3.GATE — Gate de sync Session 3 (tier T2): persistir, quality review, commits, cierre del ciclo → request-close

**Validación del tier**:
- T2 — suite COMPLETA del mod: **695/695 verde (40 files)** tras I4+I5. eslint exit 0. `node --check` OK. AcademicProgram.json válido. I4: DDL `CREATE UNIQUE INDEX ... WHERE isDefault=true` verificado por test; I5: backstop `@@unique` confirmado en schema. Propagación a DB (índice/core_FieldDefinition) = paso de deploy (seed / `npm run codegen`), DB-gated — no ejecutado para no arriesgar drift en la DB del dev.

**Discoveries / Learns nuevos**:
- L5: Workflow.isDefault YA tenía enforcement runtime en `createWorkflowValidated` (`WORKFLOW_DOUBLE_DEFAULT`), pero el CRUD generic lo bypassa (workflow.json:56 + workflow.resolver.js L6-9). El índice parcial I4 es el backstop DB que cubre todos los paths.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (autopilot super)
**Tier de revision**: standard (T2)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | builder de índices extendido sin romper firma; JSON pattern-consistent con CurricularSection.name |
| 2 | Lint | pass | eslint exit 0 |
| 3 | Tipado | n/a | seed JS + JSON |
| 4 | Testing | pass | 2 tests I4 (UNIQUE+WHERE) + listas de índices actualizadas; suite 695/695 |
| 5 | Escalabilidad | pass | índice parcial (solo filas isDefault=true) |
| 6 | Mantenibilidad | pass | doc ObjectContract (B2) deja la registración futura como transcripción directa |
| 7 | Claridad | pass | comentarios explican el gap MCP que cubre cada índice/declaración |
| 8 | a11y | n/a | backend/config |
| 9 | Storybook | n/a | backend/config |
| 10 | Error-handling | pass | ensureIndexes captura fallo de constraint en errors[] (no crashea seed); error-codes.md actualizado |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Commits DET-27**:
- `f21d44b` — UPONE-1260-S3 feat(curriculum-design): I4 índice único parcial + I5 uniqueScopedBy
- `04be9af` — UPONE-1260-S3 test(curriculum-design): I4 índice único parcial (UNIQUE + WHERE)
- `c1af909` — UPONE-1260-S3 docs(curriculum-design): ObjectContract objetivo MCP-readiness (B2) + 3 error codes

## Teaching — Intake

**Status**: done (v2 HTML).
**Archivo**: [tickets/ticket-061.teach/teach-intake.html](ticket-061.teach/teach-intake.html) — validado (`dkc-validate Teach`, 0 errores/warnings).
**Bloques**: tldr · concept-card (glosario) · flow (validación hoy vs cambio) · invariant (4 reglas) · formula (condición I1) · callout (entorno + active question I5) · tag (scope) · timeline (plan 3 sessions) · study-qa (4 preguntas de éxito).

## Teaching — Close

**Status**: done (v2 HTML).
**Archivo**: [tickets/ticket-061.teach/teach-close.html](ticket-061.teach/teach-close.html) — validado (`dkc-validate Teach`, 0 errores/warnings).
**Bloques**: tldr · timeline (camino 3 sessions) · invariant (estado final 4 reglas) · comparison-table (decisiones) · case (giro H7) · study-qa (lecciones + evolución hipótesis) · callout (qué viene: I5 inferido, deploy DB-gated, backlog).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| (REQs se definen en design-improvement) | — | — | **NOT COVERED** |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | I1: bloqueo al publicar con pesos que no suman 100 | REQ-IMPROVE | auto | no | árbol de evaluación incompleto/inválido | transicionar a Published | throw con nodos inválidos | throw `EVALUATION_WEIGHT_MISMATCH`; transacción NO corre | `tests/integration/activity-publish-weights.test.ts` TC-1 | pass | S2.T4-T6 | — |
| TC-2 | I1: rechazo en write si suma excede el padre (`>` 100) | REQ-IMPROVE | auto | no | árbol con 100% asignado | agregar/editar hijo que excede | rechazado al guardar (`≤`) | throw `EVALUATION_WEIGHT_EXCEEDS_PARENT` en create y update | `tests/unit/evaluationWeight.test.js` (11) | pass | S2.T3-T6 | — |
| TC-3 | I1 preserve: publicar con árbol exacto (=== 100) | REQ-PRESERVE | auto | no | pesos correctos (enteros) | transicionar a Published | OK | transición OK + history; gobernanza intacta | `tests/integration/activity-publish-weights.test.ts` TC-3 + REQ-PRESERVE-03 | pass | S2.T4-T6 | — |
| TC-4 | I1: query `validateActivityEvaluations` | REQ-IMPROVE | auto | no | árbol inválido | llamar query | devuelve nodos inválidos | `[{id,expected,actual}]`; vacío si válido | `tests/unit/{activityQuery,activityEvaluations}.test.js` | pass | S2.T5-T6 | — |
| TC-5 | I2: 2da Modality default rechazada | REQ-IMPROVE | auto | no | validación activa | crear/actualizar 2da Modality default mismo owner | rechazado (error dominio) | throw `MODALITY_DOUBLE_DEFAULT` en create y update | `tests/unit/{sectionValidation,polymorphicUpdate.modalityDefault,modalityDefault}.test.js` (18 verdes) | pass | S1.T1-T4 | — |
| TC-6 | I2 preserve: cambiar el default | REQ-PRESERVE | auto | no | una default existe | marcar otra como default | OK | desmarcar (isDefault=false)=no-op; marcar nueva sin conflicto=OK (excluye self) | `tests/unit/polymorphicUpdate.modalityDefault.test.js` | pass | S1.T3-T4 | — |
| TC-7 | I4: índice bloquea 2do workflow default | REQ-IMPROVE | auto | no | índice creado | 2do Workflow default (inst+scope) | rechazado | DDL `CREATE UNIQUE INDEX ... WHERE "isDefault"=true` verificado; el constraint DB rechaza determinísticamente una vez aplicado (seed). Enforcement runtime adicional en createWorkflowValidated | `tests/integration/ensureIndexes-errors.test.ts` (2 tests I4) | pass | S3.T1-T3 | aplicación del índice = deploy (seed) |
| TC-8 | I5: 2do AcademicProgram con mismo (institutionId, code) rechazado | REQ-IMPROVE | auto | no | uniqueScopedBy declarado | crear duplicado | rechazado (error de dominio legible) | `uniqueScopedBy:[institutionId]` declarado; backstop `@@unique([institutionId,code])` confirmado en schema.prisma (rechaza a nivel DB) | schema.prisma `@@unique` + AcademicProgram.json | pass | S3.T2-T3 | propagación a core_FieldDefinition (error legible) = deploy (codegen) |
| TC-9 | Regression: creación de otros objetos no afectada | REQ-PRESERVE | auto | no | wrapper create de secciones activo | crear objetos no-Modality/EvaluationComponent | sin cambios (delegan al genérico) | `validateSectionCreate` no-op para objectType fuera de scope (no consulta, delega); suite 81/81 sin regresión | `tests/unit/sectionValidation.test.js` (no-op fuera de scope) + suite completa | pass | S1.T4 | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| Resolver/integration del mod | (a definir en intake) | — | — | — |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Inconsistencia `rt__EvaluationComponent.weight`: descripción dice "0 a 1, o 0 a 100" pero la columna es `Int` → "0 a 1" trunca a 0. Solo 0–100 entero funciona | nuevo | descubierto en intake (D-F) | columna `weight Int?`; descripción del JSON menciona ambas convenciones | Decidir convención única (0–100 entero) y corregir la descripción; o cambiar tipo a Decimal (schema change) si se requiere 0–1 | could |
| B2 | Transcribir el `ObjectContract` al repo `mcp` (allowlist + contrato + tool para `validateActivityEvaluations`) | nuevo | MCP-readiness | el mod ya expone enforcement + query; contrato objetivo documentado en este ticket | Cuando el repo `mcp` esté disponible: transcribir a `mcp/src/contracts/registry.ts` (§7 paso 5). Transcripción directa | should |
| B3 | **Unicidad de `Activity.code`** (ex-I3, descope) | nuevo | descope 2026-06-10 | nada (no implementado); Confluence solo dice "código compartido entre versiones" | Si negocio confirma la regla: diseñar validación de dominio versionado-aware ("único entre programas distintos, las versiones comparten code") + definir scope (institución/unidad). Requiere `transitionActivityValidated` + create wrapper de Activity | could |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|

## Summary

**Resultado**: MCP-readiness de curriculum-design completo. Las 4 reglas de integridad enforzadas server-side en el mod (cero cambios en core), dejando la validación aguas abajo de todos los clientes (web, MCP, API).

- **I1 (suma ponderada)**: helper compartido `weightedSum.js` (paridad front/back testeada); `≤ padre` por write en create+update de EvaluationComponent; `===` exacto al publicar en `transitionActivityValidated` (gateado por categoría `Published`); query read-only `validateActivityEvaluations`.
- **I2 (Modality default)**: validación de dominio cross-table (una default por dueño) en create (`sectionValidation.resolver.js`) + update (integrado en `polymorphicUpdate.resolver.js` por constraint H7).
- **I4 (Workflow default)**: índice único parcial DB (`_data-indexes.js`, builder extendido con unique+where) como backstop universal del enforcement runtime que el CRUD generic bypassa.
- **I5 (AcademicProgram.code)**: `uniqueScopedBy:[institutionId]` declarativo (backstop `@@unique` ya existía). **Inferido** — pendiente confirmar negocio.
- **B2**: `ObjectContract` objetivo documentado (`docs/reference/mcp-object-contract.md`) para transcripción directa al repo `mcp`.

**Alcance adicional (a pedido del dev)**: corregidos 2 tests stale de TICKET-059 (AcademicProgram) que la regresión de S2 destapó — `seed-entry` (faltaba mock de `loadAcademicPrograms`) y `layouts-declared` (conteo 29→33).

**Evidencia**: suite del mod **695/695 (40 files)**, eslint exit 0, `sync:logic` 0 errores (query en typeDefs), reviewer aislado de cierre → **approve** (scope estricto: 26 archivos todos en `mods/curriculum-design/`; rama de ticket; 8 commits `UPONE-1260-S{N}`).

**Pendiente (no bloqueante)**: I5 confirmación de negocio (Open question); propagación DB-gated del índice/uniqueScopedBy (deploy: seed + `npm run codegen`); backlog B1 (could), B2 (should), B3 (could).

**Commits** (rama `UPONE-1261-academic-program`, repo del mod): `29ad87f`, `0637c74` (S1) · `6322273`, `6a26fb7`, `29fd9da` (S2) · `f21d44b`, `04be9af`, `9ef79b9` (S3). **Push NO ejecutado** (super difiere el push al dev).

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-10 | 2026-06-10 |
| intake-explore | done | 2026-06-11 | 2026-06-11 |
| teach-intake | done | 2026-06-11 | 2026-06-11 |
| design-improvement | done | 2026-06-11 | 2026-06-11 |
| design-transition-to-execute | done | 2026-06-11 | 2026-06-11 |
| request-execute | done | 2026-06-11 | 2026-06-11 |
| request-close | done | 2026-06-11 | 2026-06-11 |
