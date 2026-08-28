---
id: SPEC-curriculum-design-improve-upu-curriculum-v2-reseed
project: up1
ticket: TICKET-068
status: done
---

# Curriculum v2-nativo en UPU vía dev reset (baja del override + reseed)

# Curriculum v2-nativo en UPU vía dev reset (baja del override + reseed)

## Executive summary — lo que estas aprobando

> *Revisión rápida. El detalle técnico vive en Requirements, Changes y Tasks. Si te basta esto para decidir, ese es el objetivo.*

**Que se quiere**: hoy el tenant UPU sirve una versión vieja (v1, career-based) del objeto `Curriculum` que *eclipsa* la versión nueva (model-v2) que diseñó el TICKET-063. La causa: UPU redefine el objeto en su capa de tenant, y en up1 el override de tenant reemplaza por completo al objeto del Base. Como el objeto lo autora el mod (es modificable + se re-sincroniza) y la data de Curriculum en UPU es desechable (el seed no siembra filas), se hace un **dev reset**: se siembra Curriculum v2-nativo, se **borra** el override de UPU y se re-sincroniza. Resultado: UPU pasa a servir el v2 canónico, igual que el resto de tenants, y queda desbloqueado el versionado (UPONE-1270).

**Decisiones críticas que necesitan tu OK** (racional en las secciones técnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Reforma del objeto del mod = NULA** (veredicto DET-32) | El v2 + `rt__Plan`/`rt__Minor` ya cubren todo; los campos v1 (`publicId`/`versionCode`/`isCurrent`/`careerId`/`modality`) son `drop` (superseded, sin data que preservar). Evita tocar el canónico sin necesidad. |
| 2 | **Owner del seed = `AcademicProgram`** (Plan) / `Institution` (Minor) | El mod sí siembra `AcademicProgram` (`_data-academicprogram.js`, ej. UV-ICIV) → owner program-centric correcto para el Plan; el Minor cuelga de la Institution. (Revisado tras el feedback del dev; ver DEC-LOCAL-02.) |
| 3 | **Baja del override es core/tenant + reseed es DB-gated** | Eliminar `objects/tenants/UPU/Base/curriculum.json` es merge-gated (RULE-dev-004) y el reseed muta la DB → en super-autopilot es el punto de **standby** (S2 pide OK antes de ejecutar). |

**Riesgos principales y como los mitigamos**:

- **El seed v2-nativo apunta a un owner inexistente** → se ancla a `Institution` (`institution.id` ya creado en el seed), verificado en design; smoke S2.T3 confirma filas con owner resoluble.
- **Borrar el override afecta a otros tenants** → no aplica (H6: solo UPU redefine `Curriculum`); regression S2.T4 verifica que ningún otro tenant cambia.
- **Reseed destructivo no autorizado** → S2 entero está detrás del gate DB-gated/standby; no se ejecuta el drop/reseed sin confirmación explícita.

**Que NO se hace en este ticket**:

- **Backfill / migración de filas v1** — no hay filas (seed no las siembra); reseed v2-nativo las disuelve (H1/H2/H4 N/A).
- **Extensión `ext__` ni convergencia in-place** — descartadas (Opciones D/E/A de DECISION-017); F es más simple.
- **Agregar `careerId`/`modality` al canónico** — fuera de alcance (YAGNI); si un REQ futuro lo pide, se agrega ahí (no afecta otros tenants).
- **Re-anclar a `AcademicProgram`** — diferido a la futura convergencia `Career→Program`.

**Tamaño estimado**: 2 sessions (~2-3h efectivas). La más riesgosa es **S2** (baja del override core/tenant + reseed DB — el punto irreversible-en-caliente, detrás del gate standby).

**Como vas a saber que funciona**:

- El GraphQL servido a UPU expone el tipo `Curriculum` con campos v2 (`recordType` enum Plan/Minor, `ownerType`/`ownerId`, `status`, `version`, `previousVersionId`) y ya **no** los v1 (`careerId`/`publicId`).
- Hay filas `Curriculum` sembradas en UPU con owner resoluble, `institutionId`, `status=Active`, `version=1`.
- Ningún otro tenant cambió; `codegen`, `sync` y la suite de tests quedan verdes.

---

## Purpose

Resolver el eclipse del `Curriculum` v1 en UPU sin migrar datos: reseed v2-nativo + baja del override de tenant + re-sync, dejando el objeto canónico mod→Base como única definición para todos los tenants. Cierra el alcance diferido de TICKET-063 (smoke end-to-end + seed) y habilita el roadmap de versionado (UPONE-1270). Para: el equipo up1 (modelo de datos consistente), integradores del mod curriculum-design.

## Requirements

### REQ-IMPROVE-01: UPU sirve el Curriculum v2 canónico (no el v1)

> **Que cambia**: al consultar el GraphQL de UPU, el tipo `Curriculum` deja de ser el v1 career-based y pasa a ser el v2 del mod (tipado, versionable, owner polimórfico). El v1 desaparece.
> **Por que**: hoy el override de tenant (`fileParsing.js:83`, replace total) hace que el v2 nunca llegue a UPU, bloqueando el roadmap de versionado.

El sistema MUST servir, para el tenant UPU, el objeto `Curriculum` model-v2 (heredado del Base canónico), tras eliminar el override de tenant y re-sincronizar.

<details><summary>Scenarios de validación</summary>

#### Scenario: el tipo GraphQL refleja v2
- **GIVEN** el override `objects/tenants/UPU/Base/curriculum.json` eliminado y `npm run sync` ejecutado
- **WHEN** se introspecta el tipo `Curriculum` del schema GraphQL de UPU
- **THEN** expone `recordType` (enum Plan/Minor), `ownerType`/`ownerId`, `status`, `version`, `versionLabel`, `previousVersionId`, `code`, `appearsInDiploma` — y NO expone `careerId`/`publicId`/`isCurrent`/`versionCode`/`modality`

</details>

### REQ-IMPROVE-02: seed v2-nativo de Curriculum en UPU

> **Que cambia**: el seed de UPU crea filas `Curriculum` v2 válidas desde el origen (recordType, owner, institución, status, version) — antes no creaba ninguna.
> **Por que**: sin filas no hay nada que mostrar ni con qué validar el versionado; sembrar v2-nativo evita el backfill (no hay filas v1 que migrar).

El sistema MUST sembrar al menos una fila `Curriculum` de `recordType=Plan` (y opcionalmente una `Minor`) en UPU, con `ownerType=Institution`, `ownerId=institution.id`, `institutionId=institution.id`, `status=Active`, `version=1`, `previousVersionId=null`.

<details><summary>Scenarios de validación</summary>

#### Scenario: filas v2-nativas presentes y resolubles
- **GIVEN** el seed de UPU ejecutado tras la baja del override
- **WHEN** se consultan las filas `Curriculum` del tenant UPU
- **THEN** existe ≥1 fila con `recordType=Plan`, owner resoluble (`ownerType`/`ownerId`), `institutionId` válido (→`Institution.id`), `status=Active`, `version=1`; la fila Plan tiene su satélite `rt__Plan` (totalCredits/totalPeriods/periodType)

</details>

### REQ-IMPROVE-03: el objeto canónico no requiere reforma (veredicto DET-32)

> **Que cambia**: nada en `mods/curriculum-design/objects/Curriculum.json` ni sus RecordTypes — se confirma que el v2 ya cubre el scope.
> **Por que**: el Request planteaba "reformar el objeto"; la cascada DET-32 muestra que es innecesario (todo `reuse`/`drop`), evitando contaminar el canónico.

El sistema MUST mantener el objeto canónico `Curriculum` y sus RecordTypes `Plan`/`Minor` sin cambios estructurales; cualquier campo candidato v1 queda `drop` o `reuse` según el veredicto DET-32 (ver Decisions).

### REQ-PRESERVE-01: otros tenants y demás objetos del mod intactos

> **Que cambia**: nada para los demás tenants ni para el resto de objetos de UPU.
> **Por que**: borrar el override es revertir una excepción de un único tenant (H6); no debe tener blast radius fuera de UPU.

El sistema MUST preservar el comportamiento de todos los demás tenants y objetos: `codegen` y `sync` del resto de objetos del mod sin error, sin drift inesperado, suite de tests de object-manager en su estado base.

<details><summary>Scenarios de validación</summary>

#### Scenario: sin regresión fuera de UPU/Curriculum
- **GIVEN** la baja del override + sync + reseed aplicados
- **WHEN** se corre `npm run codegen`, `npm run drift:check` y `npm test`
- **THEN** codegen verde, sin drift inesperado, la suite en su estado base (sin fallos introducidos); ningún otro tenant cambia su definición de `Curriculum`

</details>

## Changes

### Removed: override de tenant

| Artefacto | Acción | Por que |
|-----------|--------|---------|
| `object-manager/objects/tenants/UPU/Base/curriculum.json` (v1) | **Eliminar** | Es el override total que eclipsa el v2 (`fileParsing.js:83`). Al borrarlo, UPU hereda el Base v2 canónico. Único toque core/tenant (RULE-dev-004). |

### Added: seed v2-nativo en el MOD (REVISADO 2026-06-16 — mod-side, no object-manager)

| Artefacto | Acción | Por que |
|-----------|--------|---------|
| `mods/curriculum-design/seed/_data-curriculum.js` | **Crear** | El mod autora su propio seed (corre durante `npm run sync`, solo tenant UPU); siembra el `Plan` (owner=AcademicProgram UV-ICIV) + el `Minor` (owner=Institution UV). Idempotente por (institutionId, code). |
| `mods/curriculum-design/seed/seed.js` | **Modificar** (import + call de `loadCurricula` tras academic programs) | Wirear el nuevo data file en el entrypoint del seed del mod, después de `loadAcademicPrograms` (lo necesita como owner). |

> **Corrección de scope (feedback del dev, 2026-06-16)**: el primer borrador ubicaba el seed en `object-manager/prisma/UPU/seed.js`. Es incorrecto: el seed de curriculum-design lo autora el **mod** (`mods/curriculum-design/seed/`) y se ejecuta durante `sync`. Por lo tanto el seed es **mod-only** (rama del mod, autocontenido). El único toque object-manager es la baja del override (abajo).

### Unchanged (confirmado por DET-32)

| Artefacto | Acción | Por que |
|-----------|--------|---------|
| `mods/curriculum-design/objects/Curriculum.json` + `RecordTypes/rt__{Plan,Minor}__curriculum.json` | **Sin cambios** | El v2 ya cubre el scope; campos v1 son drop/reuse. |

## Constraints

- **RULE-dev-004**: trabajo `layer:core` (la baja del override en object-manager) va en la rama de la épica (UPONE-1261), merge a `develop` gated por el team up1 — el cierre DKC no implica merge.
- **RULE-platform-008**: (curriculum-design / platform) — respetar el contrato del objeto canónico del mod.
- **DET-7**: regression obligatoria (REQ-PRESERVE-01).
- **DET-13**: cierre con evidencia (smoke GraphQL real + conteos, no "parece OK").
- **DET-19**: artefactos de repo usan id externo si el ticket lo tiene — TICKET-068 tiene `external: null`, así que commits/branches usan el id de la épica activa (UPONE-1261) en object-manager por RULE-dev-004.
- **DET-32**: necesidad/reuso corrido (veredicto en Decisions).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Rama `fix/UPONE-1261-seeds-model-v2` (object-manager + mod) | internal | Ya migró el seed de UPU a model-v2 (Institution, etc.); el seed de Curriculum se apoya en `institution`/`institution2` ya creados | Si se ejecuta sobre `develop` (sin esa migración), el seed conflicta y el owner Institution puede no existir con la forma v2 |
| `Institution` seedeada en UPU | internal | Owner del Curriculum sembrado (`ownerType=Institution`) | Si el seed de Institution cambia de forma, ajustar el owner del Curriculum |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Reseed destructivo ejecutado sin autorización | low | high | S2 entero detrás del gate DB-gated/standby (super pide OK antes del drop/reseed) |
| Borrar el override rompe otro tenant | low | high | H6 verificado (solo UPU redefine Curriculum); REQ-PRESERVE-01 + TC-04 lo confirman empíricamente |
| Owner del seed no resoluble | low | medium | owner=Institution (ya seedeada); smoke S2.T3 valida filas con owner no-null |
| Codegen rompe por el cambio de definición servida a UPU | medium | medium | S1.T3 corre codegen ANTES de tocar la DB; si falla, se corrige sin haber mutado nada |

## Open questions

Ninguna bloqueante. Resueltas en intake/draft: owner=Institution (verificado), reforma nula (DET-32), data desechable (seed sin filas). Sembrar Minor además del Plan es opcional (se decide en S1.T2, no bloquea).

## Decisions (cerradas durante design)

### DEC-LOCAL-01: reforma del objeto canónico = nula (DET-32)
- **Contexto**: el Request pedía "reformar el objeto del mod para cubrir todo lo necesario".
- **Drivers**: el v2 ya cubre el scope de UPONE-1268; no hay data v1 que preservar (reseed nativo); DET-32 (no construir/agregar sin necesidad).
- **Opción elegida**: no modificar el objeto ni los RecordTypes. Campos v1 → `drop` (publicId/versionCode/isCurrent/careerId/modality) o `reuse` (totalCredits ya en rt__Plan).
- **Alternativas**: agregar campos legacy al canónico (descartado: contamina el canónico con conceptos UPU-legacy sin consumer; YAGNI).
- **Consecuencias**: trabajo concentrado en seed + baja del override; canónico limpio.
- **Session**: design-improvement (S0).

### DEC-LOCAL-02: owner del seed = AcademicProgram (Plan) / Institution (Minor) — REVISADO 2026-06-16
- **Contexto**: el seed v2-nativo necesita `ownerType`/`ownerId` resolubles. Al verificar el seed del mod (no el `objectsToRegister` de object-manager) se confirmó que el mod **sí siembra `AcademicProgram`** (`_data-academicprogram.js` / `loadAcademicPrograms`, TICKET-059: UV-ICIV, UV-MMAT, etc.).
- **Drivers**: `AcademicProgram` es el owner program-centric que la intención v2 prefiere para un `Plan` (DECISION-017); está disponible en el seed del mod. `Institution` sirve para el `Minor` compartido.
- **Opción elegida**: `Plan` → `ownerType=AcademicProgram`, `ownerId=<programa UV-ICIV>`; `Minor` → `ownerType=Institution`, `ownerId=institution.id`. Ambos `institutionId=institution.id`.
- **Alternativas**: owner=Institution para todo (descartado: el primer borrador asumió que AcademicProgram no estaba seedeado — falso; el seed del mod lo crea). El puente H1 a Institution queda solo para el Minor.
- **Consecuencias**: modelado correcto program-centric sin convergencia Career→Program (se reusan los programas ya sembrados).
- **Session**: design-improvement (S0), revisado tras el feedback del dev sobre el scope mod-side.

## Tasks

### Session 1 — Seed v2-nativo en el MOD (mod-side, sin DB, rama del mod)

Tier: **T2**. Objetivo: autorar el seed v2-nativo en el mod (rama `UPONE-1261-academic-program`, limpia). Sin tocar object-manager ni la DB.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | Verificar shape del modelo v2 generado (Curriculum + rt__Plan + enums owner/status) para escribir el seed conforme | REQ-IMPROVE-02 | researcher | — | object-manager `prisma/UPU/schema.prisma` (read-only) | modelo v2 confirmado (recordType/ownerType enums, rt__Plan satélite, FK institutionId) | N/A (lectura) | DET-1, DET-2, DET-11 | done | 1 |
| S1.T2 | Crear `_data-curriculum.js` (Plan owner=AcademicProgram UV-ICIV + Minor owner=Institution) + wirear en `seed.js` tras academic programs | REQ-IMPROVE-02 | developer | S1.T1 | `mods/curriculum-design/seed/_data-curriculum.js`, `mods/curriculum-design/seed/seed.js` | `node --check` OK en ambos; idempotente por (institutionId, code); satélite rt__Plan anidado | `git checkout` de seed.js + borrar _data-curriculum.js | DET-2, DET-8, DET-11 | done | 1 |
| S1.GATE | Persistir + quality review T2 + decidir continue/standby | — | reviewer | S1.T2 | — | review T2; commit granular en rama del mod; decisión registrada | — | DET-20, DET-23, DET-27 | done | 1 |

### Session 2 — Baja del override + sync + reseed + smoke (object-manager, DB-gated, standby super)

Tier: **T3**. Objetivo: el único toque object-manager (baja del override) + propagación + reseed + smoke. **Detrás del gate DB-gated/standby**: pedir OK antes de tocar object-manager (tree entangled con WIP del dev) y antes del reseed.

> **Mecanismo canónico de reset (operations/database-reset.md, §4 + §1)**: borrar el override cambia el schema de `Curriculum` de UPU de **v1 → v2 estructuralmente** (recordType enum, owner polimórfico, satélite `rt__Plan`, unique compuesto `[previousVersionId, version]`, drop de columnas v1). Por §4 ("cambio estructural") el reset que corresponde es **`reset-tenant UPU`** = `npm run tenant:create -- UPU --recreate --force` (12 fases: wipe + codegen v2 + migrate baseline + seed incl. el seed del mod con `loadCurricula`). Es un **reset DURO (data-loss)** → aplica el **protocolo de dos momentos** (M1 alerta al proponer — hecho; M2 confirmación explícita al ejecutar el wipe). UPU es **seed-reproducible** (la "pérdida" se reconstruye del seed). Caveat §7 (drift de baseline stale): puede requerir regenerar baseline (`rm -rf prisma/UPU/migrations` + `migrate dev --name baseline`). El dev lo corre **interactivo** (evita el guard AI de Prisma del headless). Alternativa más acotada si no se quiere wipear UPU entero: `reset-schema UPU` (codegen v2) + aplicar schema (migrate/db push, Curriculum sin filas → seguro) + `reset-mods`/`sync:db` (corre el seed del mod). La elección final es del dev.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S2.T1 | **[standby/core-gated]** Eliminar el override `objects/tenants/UPU/Base/curriculum.json` (coordinar con el WIP del dev; RULE-dev-004) | REQ-IMPROVE-01 | developer | S1.GATE | `object-manager/objects/tenants/UPU/Base/curriculum.json` | archivo eliminado; sync posterior no recrea v1 | `git checkout` del archivo (restaura el override) | RULE-dev-004, DET-8 | done | 2 |
| S2.T2 | **[DB-gated, data-loss M2]** `reset-tenant UPU` (`npm run tenant:create -- UPU --recreate --force`) — codegen v2 + migrate + seed del mod (incl. `loadCurricula`). Alt acotada: `reset-schema UPU` + apply + `sync:db` | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S2.T1 | object-manager (DB UPU) | rebuild OK; seed Curricula sin error (logs `✓ Curricula: N created`); tablas v2 pobladas; conteos sanos (§8) | restaurar override + reset-tenant (vuelve a v1) | RULE-dev-004, DET-8, DET-13 | done | 2 |
| S2.T3 | Smoke GraphQL UPU: tipo `Curriculum`=v2 (TC-01→TC-02) + filas v2-nativas resolubles (TC-03: Plan owner=AcademicProgram, Minor owner=Institution) | REQ-IMPROVE-01, REQ-IMPROVE-02 | reviewer | S2.T2 | object-manager (GraphQL) | TC-02 + TC-03 pasan con evidencia (introspección + conteo de filas) | N/A (verificación) | DET-7, DET-13, DET-14 | done | 2 |
| S2.T4 | Regression: otros tenants intactos + `codegen`/`drift:check`/`npm test` (TC-04) | REQ-PRESERVE-01 | reviewer | S2.T3 | object-manager | TC-04 pasa; sin regresión introducida | N/A (verificación) | DET-5, DET-7, DET-13 | done | 2 |
| S2.GATE | Persistir + quality review T3 + decidir continue/close | — | reviewer | S2.T4 | — | review T3 pass; commits granulares; decisión registrada; SP executed sugerido | — | DET-20, DET-23, DET-27 | done | 2 |

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When to measure |
|--------|-------------------|--------|----------------|-----------------|
| Modelo servido a UPU para `Curriculum` | v1 (career-based) | v2 (model-v2) | introspección GraphQL del tipo `Curriculum` en UPU | post-S2.T2 |
| Filas `Curriculum` v2 en UPU | 0 (seed no siembra) | ≥1 Plan resoluble | query de conteo + campos owner/institution/status | post-reseed |
| Tenants afectados fuera de UPU | — | 0 | diff de definiciones servidas + regression suite | S2.T4 |

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01/02/03 scenarios pasan (UPU sirve v2; filas sembradas; canónico sin cambios).
- [ ] **Tests**: TC-01..TC-04 ejecutados con evidencia (introspección, conteo, regression).
- [ ] **NFRs**: N/A (mejora estructural, sin metas de latencia).
- [ ] **Rules**: RULE-dev-004 respetada (baja del override en rama de épica; merge gated por team).
- [ ] **Integration**: no rompe otros tenants ni el resto de objetos (REQ-PRESERVE-01).
- [ ] **Docs**: DECISION-017 ya cubre el racional; actualizar su `status`/Confirmation si procede al cierre.
