---
id: TICKET-037
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1208
module: object-manager
autopilot: autonomous
---

# HU-2 | Config prefillFrom en JSON del object (codegen valida + persiste al registry)

## Request

> Contenido literal del ticket Jira [UPONE-1208](https://u-planner.atlassian.net/browse/UPONE-1208) (Historia, parent epic UPONE-1206 "Core | Capacidad de clonación de objetos").

### Descripción

Declarar `prefillFrom: { exclude, deepClone }` **bajo** `metadata` del objeto para gobernar qué se hereda al pre-llenar. El codegen valida el bloque **y lo persiste al registro**; el resolver lo lee en runtime.

### Criterios de aceptación

* Codegen valida estructura y **persiste el bloque** al registro (config-storage); malformada → error.
* Resolver aplica `exclude` y `deepClone` (relación Prisma directa o alias de `polymorphicChildren` con remap recursivo).
* Sin `prefillFrom` → solo default `exclude`.
* El bloque queda en `versioningConfig` tras el sync.

### Dependencias

HU-1 (TICKET-036), HU-0d (TICKET-033), HU-0j (TICKET-033).

### Cambio vs actual

* persistir el bloque al registro (no estaba en v1).

## Contexto operativo del plan SP3

### P2.3 — HU-2 · Config prefillFrom (valida + persiste) (Fase 2) · [transversal/clonacion] · `P1`

- **Meta**: implement · ~2 SP · certeza confirmado · rollback git revert · riesgo bajo
- **Contexto**: gobernar que se hereda al pre-llenar declarandolo en el JSON, sin sintaxis polimorfica explicita (vive en `polymorphicChildren`). La config se persiste al registry (HU-0j) para que el resolver la lea.
- **Que se realiza**: el codegen valida el bloque `prefillFrom` y lo persiste (via HU-0j); el resolver aplica `exclude` y `deepClone` (relacion Prisma directa o alias de `polymorphicChildren` con remap recursivo); sin config → solo default `exclude`.
- **Depende de**: HU-1 (TICKET-036), HU-0d (TICKET-033 polymorphicChildren), HU-0j (TICKET-033 config-storage).
- **Investigar**: nada.
- **Prueba**: `unit` exclude, deepClone directa/polymorphic/recursivo, sin config, malformada rechazada; **persistido en `versioningConfig`**.

## Material internalizado — HU detallada

### HU-2 · Config prefillFrom en JSON del object

**Sprint:** SP3 · **Track:** Core object-manager · **Repo:** `object-manager`

**Como** dev de mod
**Quiero** declarar `"prefillFrom": { "exclude": [...], "deepClone": [...] }` bajo `metadata` del object
**Para** gobernar que se hereda al pre-llenar sin sintaxis polimorfica explicita (vive en `polymorphicChildren` — HU-0d).

**Criterios de aceptacion:**

- [ ] Codegen **valida la estructura Y persiste** el bloque al registry (`versioningConfig`, via HU-0j); invalida → error.
- [ ] Resolver lee `prefillFrom` del registry y aplica `exclude` y `deepClone` (Prisma relation directa o alias de `polymorphicChildren` con remap + recursivo).
- [ ] Sin `prefillFrom` declarado → solo default `exclude`.
- [ ] Documentado en `object-manager/docs/prefill-capability.md`.
- [ ] Tests: exclude, deepClone Prisma directa, deepClone polymorphic alias, recursivo, sin config, malformada rechazada, **bloque persistido en `versioningConfig` tras sync**.

**Dependencias:** HU-1, HU-0d, HU-0j.

## Material internalizado — Shape canonico

### Bloque `prefillFrom` (bajo `metadata` del objeto)

```json
{
  "metadata": {
    "prefillFrom": {
      "exclude": ["currentStatusId", "previousVersionId", "versionLabel"],
      "deepClone": ["sections"]
    }
  }
}
```

- `exclude`: lista de campos a excluir del prefill (suma al default `id, createdAt, updatedAt, createdBy`).
- `deepClone`: lista de aliases — Prisma relation directa, o alias declarado en `polymorphicChildren` (HU-0d).

### Validacion del codegen

- Estructura malformada → error de codegen.
- `deepClone` que no es relacion ni alias → error.
- Bloque persistido via `syncVersioningConfigToRegistry` (HU-0j) en `core_ObjectDefinition.versioningConfig.prefillFrom`.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | architecture (codegen + resolver) |
| Modulo principal | object-manager |
| Modulos afectados | object-manager (codegen validation + resolver de prefill) |
| Layer | core |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | no | (la config persiste en `versioningConfig` ya creado por HU-0j) |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | n/a |
| Version aprobada | — |
| Path | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El codegen ya valida estructuras de metadata (uniqueConstraints, indexes); agregar validacion para `prefillFrom` sigue el patron existente | ✓ confirmada (matizada) | Patron de validacion existe (`validate-polymorphic-children.js`, HU-0d/033), pero **NO hay validacion de `prefillFrom`** hoy — es trabajo neto de 037. `generatePrismaSchema.js` persiste `prefillFrom` opaco sin validar |
| H2 | `deepClone` directo y `deepClone` polymorphic se resuelven con el mismo entrypoint en el resolver, distinguiendo por si el alias coincide con un campo de Prisma o con un `polymorphicChildren` declarado | ✗ refutada — no existe entrypoint compartido aun | `deep-clone-polymorphic.js:160` solo maneja aliases polimorficos (`findMany` por ownerType/ownerId + walk por `recursiveBy`). **No hay rama de relacion Prisma directa**. El entrypoint compartido hay que CONSTRUIRLO en 037 (DEC-C); el caso polimorfico es reuso de 033, el directo es net-new |
| H3 | El resolver lee `prefillFrom` declarado desde `versioningConfig` del registry | ✗ refutada — hoy NO lee el registry | `instance.resolver.js:2186` lee **solo** `data.prefillFrom` (param runtime). Nadie consume `core_ObjectDefinition.versioningConfig` para prefill. La lectura del registry + precedencia declarativo/runtime es trabajo neto de 037 (DEC-B) |
| H4 | Declarar `metadata.prefillFrom` standalone (sin `versioning`) persiste al registry tras el sync | ✗ refutada — gate deliberado de 033 lo bloquea | `generatePrismaSchema.js:2478-2486`: `versioning ? {versioning, prefillFrom} : null`. Comentario en codigo: *"prefillFrom standalone se contempla en HU-2"*. Cambiar el gate a `versioning \|\| prefillFrom` es el cambio central de 037 (DEC-A) |

### Context found

- **Rules del modulo**: RULE-dev-004 (core).
- **Bugs abiertos**: ninguno.
- **Specs relacionados DKC**: TICKET-033 (HU-0j config-storage), TICKET-036 (HU-1 param basico).
- **Docs relevantes del repo**:
  - `object-manager/src/services/codegen/generatePrismaSchema.js` (validacion codegen)
  - `object-manager/src/graphql/resolvers/instance.resolver.js` (resolver prefill)
  - `object-manager/objects/business/Base/*.json` (precedentes de metadata blocks)
- **Warnings**:
  - **Depende de HU-1, HU-0d, HU-0j cerrados** — verificado contra codigo real de `UPONE-1206`: 11 commits mergeados (`UPONE-1219-S3..S8` = 033, `UPONE-1207-S1..S2` = 036).
  - **Branch core**: `UPONE-1206`.

### Impacto cross-ticket — verificado contra codigo real (rama UPONE-1206)

> Analisis de impacto sobre lo ya entregado en SP3 (033 + 036). Evidencia con archivo:linea.

**Heredado y reusable (NO reimplementar):**
- Columna `versioningConfig Json?` en `core_ObjectDefinition` — `prisma/UPU/schema.prisma:28` (HU-0j/033).
- Merge de campos propios + default exclude `['id','createdAt','updatedAt','createdBy']` + `prefillFrom.exclude` — `prefill-from-source.js:20,87-96` (HU-1/036).
- deepClone de hijos **polimorficos** + walk recursivo (`recursiveBy`) + mapa `oldId→newId` shape B+ `{newId,type}` — `deep-clone-polymorphic.js:160-194` (HU-0d/033).

**Gaps / trabajo neto de 037 (con decisiones super):**
- **DEC-A — Gate de persistencia**: `syncVersioningConfigToRegistry` (`generatePrismaSchema.js:2478-2486`) persiste solo si `versioning` presente; `prefillFrom` standalone → `versioningConfig:null`. Cambiar a `(versioning || prefillFrom)`. Toca codegen transversal → re-regresion 16 tenants (hereda ⚑ de 033/REQ-04).
- **DEC-B — Precedencia declarativo/runtime**: resolver hoy lee solo `data.prefillFrom` (`instance.resolver.js:2186`), no el registry. 037 agrega lectura de `versioningConfig.prefillFrom`. Modelo: declarativo=politica (`exclude`/`deepClone` defaults), runtime=target (`source` siempre runtime). Efectivo: `exclude`/`deepClone` = union. **La config declarativa NO auto-activa prefill** — activacion sigue gateada por `data.prefillFrom.source` (preserva invariante de 036 sobre ~64 callers).
- **DEC-C — deepClone relacion Prisma directa**: AC lo pide, pero el unico consumidor SP3 (Activity→CurricularSection) es polimorfico (ya cubierto por 033). La rama directa es net-new y especulativa; candidata a diferir a SP4 si el dev quiere YAGNI.
- **DEC-D — Validacion codegen**: nuevo `validate-prefill-from.js` (no existe hoy; solo `polymorphicChildren` se valida). `exclude`/`deepClone` arrays de strings; cada `deepClone` resuelve a alias polymorphicChildren o relacion Prisma directa. Debe correr **despues** de parsear `polymorphicChildren` (orden en la fase del codegen).

**Gates ⚑ fuertes heredados (obligatorios, reabiertos por 037):**
- Regresion codegen multi-tenant (16 tenants) — porque 037 vuelve a tocar `syncVersioningConfigToRegistry`.
- Regresion de ~64 callers de `createInstance` — porque 037 vuelve a tocar el resolver.

**Ajuste al plan de sessions**: el S3 preplanificado enmarca "deepClone polymorphic + recursivo" como nuevo, pero eso es reuso de 033. El trabajo nuevo de deepClone es (a) cablear el helper existente a la config declarativa y (b) soporte relacion directa (DEC-C). Refinar en design-feature.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU con `versioningConfig` columna disponible (post-TICKET-033) |
| Services | object-manager (4000), postgres local |

## Sessions

### Plan de sessions

> Ajustado en design-feature tras el analisis de impacto: el S3 original enmarcaba el deepClone polimorfico como nuevo, pero es reuso de 033. Los dos gates ⚑ fuertes (regresion codegen + regresion callers) son heredados y obligatorios. Ver spec.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | HU-2 — gate de persistencia (`versioning` O `prefillFrom`) + validador `prefillFrom` en codegen + re-regresion codegen 16 tenants | execute | T3 | gate fix + validador + regresion | ⚑ fuerte | git diff vacio en objetos sin prefillFrom; malformado rechazado |
| S2 | HU-2 — resolver lee `versioningConfig.prefillFrom` del registry + precedencia declarativo/runtime (union; activacion gated por source) | execute | T2 | resolver + regresion 64 callers | ⚑ fuerte | callers sin source identicos; union aplicada |
| S3 | HU-2 — deepClone declarativo: cablear helper polimorfico (033, reuso) + rama relacion Prisma directa (nuevo) | execute | T2 | resolver deepClone + tests | ⚑ fuerte | alias polimorfico + relacion directa clonan; mapa consistente |
| S4 | Cierre — doc prefill-capability.md + commits DET-27 + teach-close | execute | T1 | doc + review + commit | auto | tests verdes; teach-close validado |

### Session 1 — 2026-06-01 — HU-2 gate de persistencia + validador codegen [phase: execute]

**Tipo:** ⚑ fuerte
**Validation tier:** T3

**Tasks completadas**:

- [x] S1.T1 — Abrir el gate de persistencia en `syncVersioningConfigToRegistry` (`versioning` O `prefillFrom`)
- [x] S1.T2 — Validador `validate-prefill-from.js` + invocacion post-parse de polymorphicChildren
- [x] S1.T3 — Unit tests S1 (persistencia + validacion)
- [x] S1.T4 — Regresion codegen empirica (Docker pg): 6 tenants locales (UPU/BASEMODEL/UCASMT/UCENG/UCPLN/TEST) regenerados, validador prefillFrom corre en pipeline real (0 errores), gate sync consistente (0 populated/null). git diff schemas vacio en UPU+BASEMODEL; UC/TEST mostraron solo drift pre-existente de 034/035 (Activity/ChangeLog/Workflow, 0 prefillFrom) → revertido + flaggeado (L3). Smoke: columna versioningConfig jsonb OK en UPU
- [x] S1.GATE — Gate de sync S1 (T3, ⚑ fuerte): quality review aislado + regresion empirica + commits DET-27

**Validacion del tier**: T3 — `npx vitest run` suite `codegen/` completa: 42/42 verde (incluye 12 nuevos del validador + TC-13b actualizado). Codegen empirico en 6 tenants (Docker `pg`): validador prefillFrom corre en pipeline real, 0 errores; `git diff prisma/*/schema.prisma` vacio en UPU+BASEMODEL (HU-2 no toca generacion de schema). Smoke `versioningConfig jsonb` OK en UPU.

**Quality review (DET-23)** — reviewer aislado (sub-agente contexto limpio), tier exhaustive:

| # | Dimension | Veredicto |
|---|-----------|-----------|
| 1 | Calidad de codigo | pass — `collectRegistryJsonFiles` extraido, 3 funciones single-responsibility, ninguna >40 lineas |
| 2 | Lint / estilo | pass — consistente (comentarios ES, codigo EN, JSDoc) |
| 3 | Tipado | pass — JSDoc adecuado; WARN de defensividad asimetrica corregido (`!Array.isArray` en collectRelationNames) |
| 4 | Testing | pass — 12 casos validador + TC-13b real (no weakening) |
| 5 | Escalabilidad | pass — lectura de disco unica, O(n) sobre archivos |
| 6 | Mantenibilidad | pass — dedup del loop, ordering documentado |
| 7 | Claridad | pass — mensajes de error con archivo+campo+disponibles |
| 8 | a11y | n/a — backend |
| 9 | Storybook | n/a |
| 10 | Error-handling | pass — warn+continue en parse, errores acumulados, sin catch vacio |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2 (S2: resolver lee versioningConfig.prefillFrom + precedencia)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Resultado global: **approve**. Findings: 1 WARN (defensividad `collectRelationNames`) → corregido en commit feat. Scope verificado dentro de `object-manager/`.

**Commit DET-27**: `e225bd8` feat(object-manager) gate+validador · `7629f55` test(object-manager) tests prefillFrom+TC-13b (rama UPONE-1206)

### Session 2 — 2026-06-01 — HU-2 resolver lee el registry + precedencia [phase: execute]

**Tipo:** ⚑ fuerte
**Validation tier:** T2

**Tasks completadas**:

- [x] S2.T1 — Resolver lee `versioningConfig.prefillFrom` del registry (solo con `source` runtime)
- [x] S2.T2 — Merge declarativo + runtime (union exclude/deepClone; source runtime; sin config → solo default exclude)
- [x] S2.T3 — Regresion ~64 callers sin `source` (con y sin config declarativa → identico al baseline)
- [x] S2.GATE — Gate de sync S2 (T2, ⚑ fuerte): quality review aislado + regresion callers + commits DET-27

**Validacion del tier**: T2 — `npx vitest run tests/unit/resolvers/`: **465/465** verde (incluye 83 de `instance.resolver.test.js` + 20 de `prefill-from-source.test.js`). e2e `clone-activity-polymorphic` verde (deepClone 033 intacto tras rewiring). Sin regresion en callers.

**Quality review (DET-23)** — reviewer aislado (sub-agente contexto limpio), tier standard:

| # | Dimension | Veredicto |
|---|-----------|-----------|
| 1 | Calidad / correctness | pass — modelo declarativo=politica/runtime=target fiel; gating solido; union con dedup |
| 2 | Lint / estilo | pass — sin magic strings; JSDoc completo |
| 3 | Tipado | warn — `versioningConfig` es Json sin type-guard; WARN-01 endurecido (`typeof===object && !Array.isArray`) + test de config malformada |
| 4 | Testing | pass — 9 TCs cubren gating/union/dedup/sin-config/malformada/degradacion |
| 5 | Escalabilidad | pass — findUnique selectivo (`select versioningConfig`), solo con source |
| 6 | Mantenibilidad | pass — `unionLists` extraido, funciones <40 lineas |
| 7 | Claridad | pass — invariante 64 callers documentado en codigo y JSDoc |
| 8 | a11y | n/a — backend |
| 9 | Storybook | n/a |
| 10 | Error-handling | pass — catch loguea+degrada, no relanza (protege callers) |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3 (S3: deepClone declarativo cableado + relacion Prisma directa)
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Resultado global: **approve** (465/465 regresion). WARN-01 (type-guard) corregido en commit feat. Scope dentro de `object-manager/`.

**Commit DET-27**: `f3908b2` feat(object-manager) resolver lee registry · `c60a9a6` test(object-manager) merge declarativo/runtime (rama UPONE-1206)

### Session 3 — 2026-06-01 — HU-2 deepClone declarativo + relacion directa [phase: execute]

**Tipo:** ⚑ fuerte
**Validation tier:** T2

**Tasks completadas**:

- [x] S3.T1 — Cablear deepClone efectivo (declarativo+runtime) al helper polimorfico existente (033, reuso) para aliases de polymorphicChildren
- [x] S3.T2 — Rama nueva: deepClone de relacion Prisma directa (1-N por FK) — clonar hijos apuntando al record nuevo (DEC-C)
- [x] S3.T3 — Unit tests S3 (alias polimorfico via config, relacion directa, mezcla, mapa consistente)
- [x] S3.GATE — Gate de sync S3 (T2, ⚑ fuerte): quality review aislado + regresion deepClone + commits DET-27

**Validacion del tier**: T2 — `npx vitest run tests/unit/resolvers/ tests/unit/services/codegen/`: **516/516** verde (17 files). e2e `clone-activity-polymorphic` verde (deepClone polimorfico 033 intacto tras refactor + routing). 30/30 en los afectados (deep-clone-direct 6 + polymorphic + validate-prefill-from).

**Quality review (DET-23)** — reviewer aislado (sub-agente contexto limpio), tier standard:

| # | Dimension | Veredicto |
|---|-----------|-----------|
| 1 | Calidad / correctness | pass — helper directo correcto (fk repuntada, id regenerado, timestamps omitidos, topo+remap); routing particiona y fusiona |
| 2 | Lint / estilo | pass — espejo del patron 033; early returns |
| 3 | Tipado | pass — JSDoc de `readObjectMetadataBlock` generalizado + `@param blockKey` (WARN-1 corregido) |
| 4 | Testing | pass — 6 TCs helper directo + 3 validador directChildren + colision; e2e verde |
| 5 | Escalabilidad | pass — sin N+1 nuevo; misma estrategia secuencial-por-alias |
| 6 | Mantenibilidad | pass — `readObjectMetadataBlock` elimina duplicacion; helper directo espejo del polimorfico |
| 7 | Claridad | pass — docstrings precisos; routing comentado con REQ |
| 8 | a11y | n/a — backend |
| 9 | Storybook | n/a |
| 10 | Error-handling | pass — alias desconocido/modelo inexistente/bloque vacio/fk faltante/ciclo → throw descriptivo |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4 (S4: doc prefill-capability.md + cierre)
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Resultado global: **approve** (516/516 regresion + e2e). WARN-1 (JSDoc) y WARN-2 (colision de alias entre bloques) corregidos en commit feat (+test de colision). Scope dentro de `object-manager/`.

**Commit DET-27**: `00a37ad` feat(object-manager) deepClone relacion directa · `3f266ec` test(object-manager) deepClone directo + validacion (rama UPONE-1206)

### Session 4 — 2026-06-01 — HU-2 doc + cierre [phase: execute]

**Tipo:** auto
**Validation tier:** T1

**Tasks completadas**:

- [x] S4.T1 — Doc `prefill-capability.md` (shape prefillFrom + directChildren + precedencia declarativo/runtime + ejemplo)
- [x] S4.T2 — Quality review final + commits DET-27

**Gate decision:** (approvedBy: dev)

- [x] continue → Cierre del ticket (status: closed)
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Commits

| Hash | Fecha | Header | Tasks | Notas |
|------|-------|--------|-------|-------|
| e225bd8 | 2026-06-01 | UPONE-1208-S1 feat(object-manager): config prefillFrom declarativa — gate de persistencia + validacion codegen | S1.T1, S1.T2 | rama UPONE-1206 |
| 7629f55 | 2026-06-01 | UPONE-1208-S1 test(object-manager): validador prefillFrom + gate standalone | S1.T3 | rama UPONE-1206 |
| f3908b2 | 2026-06-01 | UPONE-1208-S2 feat(object-manager): resolver lee prefillFrom declarativo del registry | S2.T1, S2.T2 | rama UPONE-1206 |
| c60a9a6 | 2026-06-01 | UPONE-1208-S2 test(object-manager): merge declarativo/runtime de prefillFrom | S2.T2, S2.T3 | rama UPONE-1206 |
| 00a37ad | 2026-06-01 | UPONE-1208-S3 feat(object-manager): deepClone de relacion Prisma directa (directChildren) | S3.T1, S3.T2 | rama UPONE-1206 |
| 3f266ec | 2026-06-01 | UPONE-1208-S3 test(object-manager): deepClone directo + validacion directChildren | S3.T3 | rama UPONE-1206 |

## Test cases

> Ticket backend (sin UI — `Affects UI: no` en todos). La verificacion es por unit/e2e tests; cada TC referencia su archivo de test como evidencia.

| # | Case | REQ | Affects UI | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|-----------|--------|----------|--------|---------|---------|
| TC-01 | Persistencia: `prefillFrom` standalone (sin versioning) → `versioningConfig.prefillFrom` poblado; versioning-solo sin regresion; ninguno → null | REQ-01 | no | 8/8 verde | `tests/unit/services/codegen/syncVersioningConfigToRegistry.test.js` (TC-13b) | pass | 1 | — |
| TC-02 | Validacion codegen: exclude/deepClone arrays; deepClone resuelve a polymorphicChildren ∪ directChildren; malformado/colision rechazados | REQ-02 | no | 15/15 verde | `tests/unit/services/codegen/validate-prefill-from.test.js` | pass | 1, 3 | — |
| TC-03 | Resolver lee `versioningConfig.prefillFrom` + precedencia (union; source runtime; gated por source; degradacion) | REQ-03 | no | 9/9 verde | `tests/unit/resolvers/prefill-from-source.test.js` (resolveEffectivePrefillFrom) | pass | 2 | — |
| TC-04 | Sin `prefillFrom` declarado → solo default exclude | REQ-05 | no | cubierto | `tests/unit/resolvers/prefill-from-source.test.js` | pass | 2 | — |
| TC-05 | deepClone polimorfico (reuso 033) via config declarativa | REQ-04 | no | verde | `tests/unit/resolvers/deep-clone-polymorphic.test.js` + e2e `clone-activity-polymorphic.test.js` | pass | 3 | — |
| TC-06 | deepClone relacion Prisma directa (directChildren): clona+repunta fk, recursiveBy topo+remap, errores | REQ-04 | no | 6/6 verde | `tests/unit/resolvers/deep-clone-direct.test.js` | pass | 3 | — |
| TC-07 | Regresion: ~64 callers sin source identicos; codegen 6 tenants git diff vacio (UPU/BASEMODEL) | REQ-PRESERVE-06 | no | 518/518 + e2e | suite `tests/unit/resolvers/` + `tests/unit/services/codegen/` + codegen empirico Docker | pass | 1, 2 | — |

## Coverage map

| REQ | Status | Test cases |
|-----|--------|-----------|
| REQ-01 (persistencia gate) | COVERED | TC-01 |
| REQ-02 (validacion codegen) | COVERED | TC-02 |
| REQ-03 (resolver lee registry + precedencia) | COVERED | TC-03 |
| REQ-04 (deepClone polimorfico + directo) | COVERED | TC-05, TC-06 |
| REQ-05 (sin config → default exclude) | COVERED | TC-04 |
| REQ-PRESERVE-06 (regresion codegen + callers) | COVERED | TC-07 |
| REQ-07 (doc) | COVERED | `docs/prefill-capability.md` (S4.T1) |

## Backlog

> Vacio (sin items must — cierre no bloqueado).

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El gate de persistencia de HU-2 (DEC-A) invierte el contrato que 033 codifico en `syncVersioningConfigToRegistry.test.js` TC-13b (prefillFrom standalone → null). El test se actualizo al nuevo contrato (standalone persiste, MISMA columna). 033 ya lo anticipaba en su comentario ("se contempla en HU-2"), pero asumia "otra columna/key" — DEC-A reuso la misma. Cambio de test cross-ticket mandado por spec. | developer | 1 | refined | RULE-core-026 |
| L2 | El cambio de codegen de HU-2 (validador + gate) NO toca la generacion de `schema.prisma`: la validacion es read-only sobre JSONs y el gate solo escribe a la columna `versioningConfig` del registry (DB), no a los archivos de schema. Confirmado empiricamente: codegen en 6 tenants → git diff vacio en UPU+BASEMODEL. | developer | 1 | discarded | consolidacion Fase D — no reusable/especifico del ticket |
| L5 | DEC-C (deepClone relacion directa) se implemento con bloque declarativo NUEVO `metadata.directChildren: [{name,object,fk,recursiveBy?}]`, espejo minimo de polymorphicChildren. Razon: el JSON del padre NO declara hijos 1-N directos (solo FKs N-1 salientes `type:string` `xxxId`) — sin forma de derivar modelo+FK inverso sin DMMF fragil. El validador S1 resolvia deepClone contra `properties` (heuristica hueca); corregido a polymorphicChildren ∪ directChildren + rechazo de colision. Refina REQ-02/REQ-04 del spec. Documentar en prefill-capability.md (S4.T1). | developer | 3 | refined | RULE-core-023 |
| L3 | Drift de tenant schemas pre-existente: UCASMT/UCENG/UCPLN/TEST tenian `prisma/*/schema.prisma` stale respecto a los cambios de objeto de TICKET-034 (modelo versionamiento Activity: version String→Int, workflowId/currentStatusId NOT NULL, Workflow.initialStatusId) y TICKET-035 (ChangeLog.versionSourceId). Esos tickets cerraron sin regenerar todos los tenants — solo UPU/BASEMODEL quedaron al dia. Surge al correr codegen en HU-2. NO es de HU-2 (0 prefillFrom/versioningConfig); revertido para no contaminar el diff del ticket. **Resuelto**: regenerado y commiteado aparte como `2768218 UPONE-1220 chore(object-manager): regenerar schemas Prisma UCASMT/UCENG/UCPLN/TEST faltantes` (atribuido a TICKET-034). Verificado: solo 4 schemas, 0 prefillFrom, codegen idempotente post-regen. | developer | 1 | refined | RULE-dev-006 |
| L4 | Causa raiz + regla operativa de L3 (preventiva). El commit `eaec762` "UPONE-1220-S7 regenerar schemas Prisma todos los tenants" NO capturo UCASMT/UCENG/UCPLN/TEST — su mensaje fue aspiracional, no prueba. Regla: al cambiar el object model (JSONs en `objects/business/Base/`), correr `TENANT_ID=<T> npm run codegen` para CADA tenant con DB y verificar `git diff prisma/<T>/schema.prisma` **por tenant**. `schema.prisma` se genera deterministico desde los JSON del registry → staleness == codegen no corrido para ese tenant (no es problema de DB/migracion). Lista canonica de tenants = dirs bajo `prisma/` con DB: local UCASMT/UCENG/UCPLN/TEST/UPU/BASEMODEL; DEMO01-10 viven en otros entornos (sin DB local → regenerar alla). Regenerar solo materializa la forma que UPU/BASEMODEL ya tenian → cero riesgo a consumidores. Candidato a `rule` modulo codegen/object-manager. | developer | 1 | refined | RULE-platform-012 |

## Summary

**HU-2 entregada**: capa declarativa de `prefillFrom` cableada sobre los primitivos de 033/036. 4 sessions, 7 commits en object-manager (`UPONE-1206`) + records dkc.

**Que se construyo** (3 costuras + 1 rama nueva):
- **S1** — gate de persistencia del codegen abierto a `(versioning || prefillFrom)` (DEC-A) + validador `validate-prefill-from.js` (DEC-D). Regresion codegen empirica en 6 tenants (Docker pg): git diff schemas vacio en UPU/BASEMODEL.
- **S2** — `resolveEffectivePrefillFrom`: el resolver lee `versioningConfig.prefillFrom` del registry y lo combina con el runtime (DEC-B: declarativo=politica, runtime=target, union, activacion gated por `source`). Regresion ~64 callers verde.
- **S3** — `deepClone` polimorfico (reuso 033) + rama nueva de relacion Prisma directa via bloque declarativo `directChildren` (DEC-C) + routing de particion + rechazo de colision.
- **S4** — doc `prefill-capability.md` + cierre.

**Metricas**: 518/518 tests (resolvers + codegen) + e2e clone polimorfico verde. Cero regresion. Reviewer aislado `approve` en S1/S2/S3 + validacion de cierre reforzada `approve`. Working tree limpio, scope contenido en `object-manager/`.

**Acceptance checkpoints**:

| Checkpoint | Status | Detalle |
|------------|--------|---------|
| Funcional | pass | REQ-01..REQ-05 + REQ-07 cumplidos (7/7) |
| Coverage | pass | 7/7 REQs COVERED (ver Coverage map) |
| Tests | pass | 518/518 unit + e2e; TC-01..TC-07 pass |
| Regression | pass | ~64 callers sin cambio; codegen 6 tenants git diff vacio (HU-2 no toca schemas) |
| Rules | pass | RULE-dev-004 (rama epica UPONE-1206) respetada |
| Docs | pass | `prefill-capability.md` creado |

**Residual / deuda**:
- `directChildren` sin consumidor en SP3 (capacidad para futuros adoptantes; el caso Activity→CurricularSection es polimorfico).
- Learns raw L1-L5 capturados (L4/L5 candidatos a `rule` de codegen/object-manager — refinables en proxima sesion).
- SP sugerido por heuristica (4) diverge del estimado (~2); recalibrable via dkc-sp-calibration.
- Drift de tenant schemas (L3) resuelto aparte como `UPONE-1220` (2768218).

## Teaching — Intake

**Status**: done
**Archivo**: [tickets/TICKET-037.teach/teach-intake.html](TICKET-037.teach/teach-intake.html)

## Teaching — Close

**Status**: done
**Archivo**: [tickets/TICKET-037.teach/teach-close.html](TICKET-037.teach/teach-close.html)
