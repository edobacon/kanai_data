---
id: TICKET-077
project: up1
type: ticket
status: closed
work_type: fix
module: curriculum-design
autopilot: manual
---

# Re-resolver mod-only el casteo de campos (FK + tipos) al guardar/clonar/versionar Curriculum, contra el OrgUnit/Institution reducido

## Request

Editar un Curriculum tipo Plan en la suite falla con `Error al Actualizar Curriculum — Valor inválido proporcionado` campo por campo (`InstitutionId`, luego `TotalCredits`, etc. — el PascalCase es solo display; los campos reales son `institutionId`, `totalCredits`). Este caso **ya estaba resuelto** por **TICKET-074 (UPONE-1270-S1)**, pero ese fix se hizo **en el CORE** (commit `98590c0` en `object-manager/src/graphql/resolvers/instance.resolver.js`: `updateInstance` convierte el FK escalar base → `{relation:{connect}}`, replicando createInstance). El cambio del **modelo de datos** (reducción del org-spine: `Institution` perdió `country`, `OrgUnit` perdió `institutionId`/enum académico, etc.) dejó **roto** ese arreglo para el camino del Curriculum.

**Objetivo: resolver este caso MOD-ONLY** (en los resolvers custom de curriculum-design, NO en el core), tomando TICKET-074 como referencia, y **verificar que funcione en los 3 flujos**:
1. **Guardar edición** — `logic/curriculum-update.resolver.js` (`updateCurriculumWithRecordType`).
2. **Clonar** — el clone (genérico del core / row action "Duplicar").
3. **Versionar** — `asNewVersion` (core) + hooks de cd (`logic/sectionValidation.resolver.js`, herencia de extensión RT al versionar).

**Coordinación con el core (decisión del dev 2026-06-22):** NO revertir `98590c0` por separado. Este ticket **(a)** reimplementa el fix mod-side en los resolvers de cd para los 3 flujos, y **(b)** revierte `98590c0` del core **recién cuando el reemplazo mod esté verificado** — atómico, sin ventana rota. Mientras tanto, un workaround mínimo ya aplicado (commit `36383df`: stripear `institutionId` del update) mantiene el caso institutionId tapado parcialmente.

> Inmutabilidad (DET-3): el request original no se reescribe.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | mod-only (curriculum-design `logic/`) + revert coordinado de 1 commit en object-manager (core) al final |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (resolvers custom de los 3 flujos). object-manager (core) SOLO para el revert coordinado de `98590c0` una vez verificado el reemplazo mod |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El fix de "Invalid value for argument <field>" de TICKET-074 vive en el CORE (`98590c0`, updateInstance: FK escalar→connect), no mod-only | ✅ confirmada | `git log -S coerceRtFields` + `git show 98590c0`; bloque presente en `instance.resolver.js:~3798` ("UPONE-1270 (TICKET-074): convertir FK escalares de relacion a {relation:{connect}}") |
| H2 | La reducción del org-spine rompió ese arreglo para Curriculum (model nuevo) | ⚠️ refutada como mecanismo directo (code) | **El org-spine NO es el mecanismo.** EDIT delega con el **alias** `rt__<RT>__curriculum` (`curriculum-update.resolver.js:82`) → `updateInstance` entra por el **RecordType early-return** (`instance.resolver.js:3564`) y **RETORNA en :3683**, ANTES del bloque FK→connect de TICKET-074 (`~:3798`) → ese fix nunca corre para edit. El comentario del workaround `36383df` (`curriculum-update.resolver.js:71-77`) atribuye el fallo al "schema reducido" describiendo un bloque (base path) que en edit NO se ejecuta. Mecanismo real → ver H5. String-type exacto pendiente de error crudo |
| H3 | El error NO es de coerción de tipo del valor (el core ya coerciona rt fields en update via `coerceRtFields`, líneas 3656-3669); es el casteo FK + posible mis-bucketing de campos rt | ~ refinada (code) → inferred | Confirmado que NO es coerción de **RT fields** (core los coerciona en `:3658`/`:3669`). PERO `coerceRtFields` (`:72-82`) **solo toca rt/ext fields**; el bucket `baseFields` (update `:3608-3613`, create `:2744-2749`) va **crudo** a `prisma[base].update/create` (`:3638`/`:2801`) — sin coerción de tipo NI FK→connect. Un FK base (`institutionId`) o cualquier RT field no reconocido por `loadRtFieldsFromDb` que caiga al catch-all `baseFields`, si llega como string de GraphQL → `Invalid value for argument`. Mecanismo exacto (string-type vs mis-bucketing de `totalCredits`) pendiente de **error crudo** |
| H4 | Los 3 flujos (edit/clone/version) pueden tener cada uno un path distinto en el core (update vs create vs asNewVersion) → hay que verificar los 3 por separado | ✅ paths confirmados (code) / ⏳ éxito empírico pendiente | Paths distintos confirmados por código: **EDIT** = update RT-alias path (RT early-return, sin FK→connect ni coerción base); **CLONE** (prefilledModal, `config/layouts/default_Curriculum_list.json:31-40`) = create RT-alias path (`:2670`, mismo bucket-split, base create crudo `:2801`); **VERSION** (asNewVersion, `:20-30`) = create **BASE** path (objectType=`Curriculum`, NO alias) → SÍ pasa por FK→connect (`:3123-3170`). PERO que clone/version **no fallen** es inferencia de código: clone mete `institutionId` crudo en `baseFields` IGUAL que edit; la diferencia create-vs-update (¿Prisma acepta scalar FK en create pero no en update?) NO está confirmada → requiere repro empírico |
| H5 | El locus del fix mod-only es el **RT early-return**: el adapter del mod debe rutear/coercionar/connect (o stripear los set-once) ANTES de delegar con el alias, porque el core RT path no maneja base FK ni coerción de base fields | ~ inferida (síntesis) | Síntesis de H2/H3/H4. El workaround `36383df` (strip `institutionId`) ya es parte de la solución correcta para EDIT (`institutionId` es set-once, derivable del owner, no cambia al editar). Falta confirmar con error crudo el cascade (`totalCredits`, etc.) y si clone/version necesitan tratamiento propio |

### Causa raíz (confirmada — repro empírico 2026-06-22, S1)

**Una sola causa unifica los 3 flujos: el registry de curriculum en la DB de UPU (`core_ObjectDefinition` + `core_FieldDefinition`) está STALE respecto del source del mod (git). NO es casteo FK, NO es resolver, NO tiene que ver con `98590c0`.**

Errores crudos capturados (Playwright + DevTools, friendly-error es client-side → la respuesta GraphQL de OM trae el Prisma crudo):

- **EDIT** (`updateCurriculumWithRecordType` → `prisma.curriculum.update()`): `Unknown argument totalCredits`. Los campos `totalCredits/totalPeriods/periodType` (RT Plan) aterrizan en el `update` de la tabla **base** en vez de en `rt__Plan__curriculum`. `institutionId` NO aparece (lo stripea `36383df`).
- **CLONE** (`createCurriculumWithRecordType` → `prisma.curriculum.create()`): MISMO error `Unknown argument totalCredits`. `institutionId` SÍ está presente como escalar y **no** falla → Prisma acepta el scalar FK en create (descarta la teoría FK→connect). **Clone FALLA** (refuta la inferencia "create funciona").
- **VERSION** (`createInstance` base → guard `instance.resolver.js:2624`): `OBJECT_NOT_VERSIONABLE`. Falla ANTES de cualquier write — `core_ObjectDefinition.versioningConfig.versioning` es null para `Curriculum`.

Evidencia en la DB (`uplanner_upu`, query directa al registry vía Prisma client):

| Objeto | Registry en DB | Source del mod (git) | Drift |
|--------|----------------|----------------------|-------|
| `rt__Plan__curriculum` (objDef 102) | `totalCredits` con `isBaseField=true` (Float); `totalPeriods`/`periodType`/`rotationConfig` AUSENTES; sobran `careerId/isCurrent/modality/publicId/versionCode` (modelo viejo) | `objects/RecordTypes/rt__Plan__curriculum.json`: `progression/totalCredits/totalPeriods/periodType/rotationConfig` como props RT (extension), `totalCredits/totalPeriods` integer | **Registry stale** — refleja un modelo pre-reducción |
| `Curriculum` (objDef 12) | `versioningConfig = null` | `objects/Curriculum.json` `metadata.versioning` declarado (linkageField `previousVersionId`, increment, `requiredCapability: curriculum:version`) | **Registry stale** — versioning no propagado |

**Mecanismo EDIT/CLONE**: `loadRtFieldsFromDb` (`instance.resolver.js:46-68`) filtra `core_FieldDefinition` por `isBaseField=false` para armar `rtFieldNames`. Como en la DB `totalCredits` quedó `isBaseField=true` y `totalPeriods/periodType` no existen, NO entran a `rtFieldNames` → el bucket-split (update `:3608-3613`, create `:2744-2749`) los manda al catch-all `baseFields` → `prisma.curriculum.update/create()` los rechaza (`Unknown argument`). El `progression` (único con `isBaseField=false` en la DB) sí se rutea bien.

**Por qué un re-sync plano NO arregla (verificado en el código del codegen, S1):**

- Solo el `npm run sync` FULL (Phase 3 → codegen `generatePrismaSchema.js` con DB) escribe `core_ObjectDefinition`/`core_FieldDefinition`. `sync:db` y `sync:logic` NO los tocan.
- **Poison-pill (mecanismo probado):** `core_FieldDefinition` tiene `@@unique([objectDefinitionId, name])` (`prisma/UPU/schema.prisma`). `syncRtFieldsToRegistry` busca el campo RT con `findFirst({ name, isBaseField: false })` (`generatePrismaSchema.js:2833`). Como `totalCredits` quedó `isBaseField=true` (modelo viejo), el lookup da null → va a `create` (`:2838`) → **viola el unique** → throw → el único try/catch envuelve TODO el RT (`:2864`) → aborta el procesamiento de `rt__Plan__curriculum` → `totalPeriods/periodType/rotationConfig` (que vienen después de `totalCredits`) **nunca se crean**. Esto explica exactamente el estado observado.
- Ningún path del pipeline hace UPDATE de `isBaseField` en filas existentes, ni hard-delete de campos removidos (solo soft-delete `active=false` para `isBaseField=true`; cero cleanup para `isBaseField=false`). → La fila stale `totalCredits isBaseField=true` es permanente y bloquea cada re-sync.
- **VERSION es distinto:** `syncVersioningConfigToRegistry` (`generatePrismaSchema.js:2581`) hace UPDATE incondicional de `versioningConfig` desde `metadata.versioning` para los objetos base (no bloqueado por el try/catch del RT). → Un `npm run sync` full SÍ repuebla `Curriculum.versioningConfig` y arregla VERSION.

**Implicancia de scope (DET-16):** el fix del bug NO es mod-only-resolver ni revert de `98590c0`; el source del mod ya es correcto. Es **regenerar el registry desde cero** (limpiar las filas envenenadas + full sync). Dos operaciones viables: `reset-tenant` (nuke + reseed + sync, data-loss, dev lo corre por el guard AI de Prisma — UPU es tenant dev/seed) o **delete quirúrgico** de las filas stale de `rt__Plan__curriculum` (objDef 102) + full sync (menos disruptivo, preserva el resto del tenant). Decidir con el dev (M1/M2 data-loss).

**Bug de core descubierto (latente):** el codegen no reconcilia `isBaseField` cuando un campo migra base↔RT, y el try/catch por-RT aborta todos los campos siguientes ante un unique-violation. Volverá a morder en cualquier movimiento base↔RT. Candidato a follow-up core (fuera del mod).

**S3 (mantener, re-justificado por el dev):** revertir `98590c0` del core no porque sea la causa de este bug (no lo es), sino porque fue un fix mal ubicado en core cuando debía resolverse en el mod. Requiere análisis de impacto del revert (qué caso cubría; si regresiona algo → cubrir mod-side).

### Causa raíz FINAL (cross-ref TICKET-074, confirmada S1)

**Origen del registry stale: `objects/tenants/UPU/Base/curriculum.json` (object-manager, git-tracked) quedó en el modelo VIEJO** — props `publicId/name/versionCode/isCurrent/totalCredits/modality/careerId/recordType`, FK `careerId→Career`, SIN `metadata.versioning`. Última edición: commit `32d6b25` ("Nueva versión de objetos migrados"). La reducción del org-spine (TICKET-076) actualizó `objects/business/Base/curriculum.json` (modelo nuevo correcto: name/code/ownerType/ownerId/institutionId/appearsInDiploma/status/version/versionLabel/previousVersionId + versioning) pero **NO el tenant Base override de UPU**. El codegen, para UPU, lee el tenant Base (`generatePrismaSchema.js:2420` resuelve `tenants/<T>/Base`) como base properties → registra `totalCredits` como `isBaseField=true`.

**Por qué el reset NO lo arregló (lo intentó el dev):** `reset-tenant` regenera el registry DESDE este tenant Base committeado y stale → reproduce el mismo estado corrupto. El bug es de la FUENTE (tenant Base), no del dato regenerado.

**Cross-ref TICKET-074** (el dev lo señaló): 074-S3 entregó `updateCurriculumWithRecordType` (adapter mod, split RT) y lo verificó editando un **Minor** (solo tiene `progression`, que SÍ está bien registrado `isBaseField=false`) → guardaba OK. Versionar también funcionaba (074-S1, workflow-opcional → v2 Draft). 074 dejó PENDIENTE "editar un Plan completo" (076 H7). El Plan falla porque sus campos (`totalCredits/totalPeriods/periodType`) están mal registrados; los fixes de 074 (adapter split + helper) están INTACTOS y son correctos — dependen de un registry correcto, que el tenant Base stale corrompe al regenerar. 074-S1.T4 (`98590c0`, FK→connect en `updateInstance` base-path) ya no lo ejerce curriculum: el adapter de 074-S3 delega por el alias (RT early-return), que no pasa por ese bloque → consistente con el revert de S3.

**Prueba definitiva (empírica):** `getObjectToFileMap('UPU')['Curriculum']` resuelve a `objects/tenants/UPU/Base/curriculum.json` (stale) — keyed-by-title last-wins (`fileParsing.js:284`), el tenant override gana sobre business/Base. `AcademicProgram` NO tiene override → resuelve a `business/Base/academicprogram.json` (correcto) → funciona. Esa es la asimetría: curriculum es arrastrado por un override stale, academicProgram no. `syncRtFieldsToRegistry` lee las base props del RT desde ese map (`generatePrismaSchema.js:2671`) → registra los campos viejos como base bajo rt__Plan.

`objects/business/Base/curriculum.json` (untracked/generated, mod-derived vía fileSync): modelo reducido correcto + `metadata.versioning` (linkageField previousVersionId, increment, requiredCapability curriculum:version). → contiene TODO lo necesario para edit+clone+version.

**FIX (recomendado): eliminar `objects/tenants/UPU/Base/curriculum.json`** (override stale git-tracked) → Curriculum cae al business/Base mod-derived (igual que AcademicProgram) → registry correcto (base props reducidas, RT fields isBaseField=false, versioningConfig poblado). Alternativa: editarlo al modelo reducido (deja un override redundante). Tras corregir la fuente, regenerar el registry limpio (reset-tenant —ahora SÍ efectivo— o delete de las filas envenenadas + full sync, por el poison-pill que bloquea recrear `totalCredits`). Es máximamente mod-aligned: borra lo único que sombreaba el modelo del mod.

**El sync NO regenera el tenant Base:** `fileSync` solo escribe `business/Base/` (nunca `tenants/<T>/Base/`). Los tenant Base son artefactos de migración congelados (commit `32d6b25`), editados a mano. → el override de curriculum es un leftover muerto; eliminarlo es durable (el sync no lo recrea). Por eso editar la definición en core no tiene sentido (lo señaló el dev): el objeto se define en el mod; el override es un leftover pre-mod sin dueño que sombrea la definición del mod.

**Enfoque del fix (alineado con dev): ELIMINAR el override obsoleto** (no editarlo). `git rm objects/tenants/UPU/Base/curriculum.json` → Curriculum cae a `business/Base` (mod-derived), como AcademicProgram. Es cleanup de un leftover, no una edición de definición en core.

**Riesgo sistémico (confirmado):** 7 objetos hoy en mods tienen el mismo leftover de tenant Base en UPU: `campus, career, course, curriculum, faculty, modality, supportCenter`. Pre-mod, congelados, sombreando la definición del mod. curriculum es el que muerde (su modelo cambió más). Decisión de alcance: limpiar solo curriculum (este ticket) o los 7.

### Context found

- **Fix previo (referencia): TICKET-074 / UPONE-1270-S1**, commit `98590c0` (object-manager). Comentario en `instance.resolver.js:~3798`: el FK escalar base coexistiendo con el upsert de extensión hace que Prisma resuelva al *checked update input* que NO acepta el FK escalar → "Unknown argument `institutionId`. Did you mean `institution`?" / "Invalid value...". Curriculum lo expone por tener relación requerida `institution` + extensión a la vez.
- **El core ya coerciona rt fields en update** (`coerceRtFields`, `instance.resolver.js:3656-3669`) — la coerción de tipo NO es el problema (verificado: coerción mod-side no cambió nada).
- **El PascalCase del error es solo display**: `layout/src/composables/useFriendlyErrors.ts:503` capitaliza el field. Los campos reales son lowercase (`institutionId`, `totalCredits`).
- **Resolvers de cd de los 3 flujos**: `logic/curriculum-update.resolver.js` (edit), `logic/curriculum-create.resolver.js` (create — funciona, referencia del patrón), `logic/sectionValidation.resolver.js` (hooks de versionado), `logic/curriculum-read.resolver.js`. Clone = genérico del core (row action Duplicar de Curriculum/AcademicProgram).
- **Modelo reducido (org-spine)**: ver DEC-016/DEC-018 + Learn L5/L6/L7 de TICKET-076. `Institution` sin `country` (movido a Organization); `OrgUnit` reducido (Faculty). Curriculum base FK = `institutionId` (única FK real; ownerId es polimórfico sin FK).
- **Workaround parcial ya en el branch** (TICKET-076, commit `36383df`): el adapter de update stripea `institutionId`. Este ticket debe consolidar/superar eso con la solución mod-only completa para los 3 flujos, y luego coordinar el revert de `98590c0`.

> KB-first (DET-11): consultar TICKET-074, DEC-018, y los Learns L5-L7 de TICKET-076 antes de diseñar.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | UPONE-1261-academic-program (mod layer + el revert coordinado de core va en la rama core que corresponda, gated) |
| DB state | UPU reseedeado con el modelo reducido (5 AcademicProgram, 2 Curricula, 3 sílabos). Validación real es por la UI del suite (auth Clerk) — los stubs NO atrapan este error (es real-DB, como los DB-gated) |
| Services | object-manager :4000 + suite :3000 (editar/clonar/versionar un Plan). sync:logic + restart OM tras cada cambio de resolver |

### Reproduction steps
1. Editar un Curriculum tipo Plan (ej. UV-ICIV-PLAN-2026) en la suite → guardar → "Valor inválido proporcionado" por campo.
2. (a confirmar) Clonar un Curriculum Plan → ¿mismo error?
3. (a confirmar) Versionar un Curriculum Plan → ¿mismo error?

## Sessions

### Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate | Criterio |
|---|----------|------|------|-----------------|------|----------|
| S1 | Diagnóstico real por flujo + causa raíz (DONE) | intake | T1 | reproducir edit/clone/version (Playwright + DevTools), capturar el error Prisma crudo de cada uno, trazar el pipeline de registro (codegen → core_FieldDefinition), probar la causa raíz | S1.GATE (⚑ fuerte) | ✅ error crudo de los 3 documentado; causa raíz PROBADA (tenant Base stale `objects/tenants/UPU/Base/curriculum.json` sombrea la def del mod → registry corrupto); enfoque aprobado por dev (opción 1: quitar el leftover) |
| S2 | Fix: quitar el override stale + regenerar registry + verificar los 3 flujos | execute | T3 | `git rm objects/tenants/UPU/Base/curriculum.json` (OM, rama épica) → Curriculum cae a business/Base mod-derived; regenerar registry (hard-delete filas envenenadas de objDef 102 + full sync, o reset-tenant — el poison-pill exige limpiar las filas isBaseField=true existentes); verificar editar/clonar/versionar un Plan sin error en la suite (UI) | S2.GATE (⚑ fuerte, UI-gated) | los 3 flujos guardan sin error (evidencia visual); registry: totalCredits isBaseField=false + totalPeriods/periodType presentes + Curriculum.versioningConfig poblado |
| S3 | Revert `98590c0` en core + análisis de impacto + no-regresión | execute | T2 | revertir `98590c0` (FK→connect en updateInstance base-path) en object-manager (rama épica gated); análisis de impacto (qué objeto lo ejercía por el base-path; si regresiona → cubrir mod-side); verificar curriculum OK + sin regresión | S3.GATE (⚑ fuerte, core gated + merge team up1) | revert aplicado; impacto analizado; sin regresión; merge gated team up1 |

> **Re-scope (S1, 2026-06-22):** el fix del bug NO es mod-only-resolver ni FK→connect (premisa original refutada). Causa raíz = el override stale `objects/tenants/UPU/Base/curriculum.json` (leftover pre-mod, OM repo) sombrea la def mod-derived (`business/Base`). Fix (opción 1, aprobada): quitar el leftover → el mod es la única fuente. El resolver de 074 (thin adapter) NO se toca: queda correcto una vez el registry se regenera bien.
> **S3** se mantiene por decisión del dev (revert de `98590c0`: fix mal ubicado en core). Toca object-manager (layer:core) → rama épica + merge gated (RULE-dev-004).
> **Follow-ups (flag, fuera de scope):** 6 otros tenant Base leftovers de objetos mod (campus/career/course/faculty/modality/supportCenter); bug latente del codegen (no reconcilia isBaseField base↔RT + poison-pill por unique + try/catch por-RT) → core.

### Session 2 — 2026-06-22 — Fix: quitar el override stale + regenerar registry [phase: execute]

**Tipo**: ⚑ fuerte · **Validation tier**: T3 (UI-gated)

**Objetivo**: aplicar la opción 1 (quitar el leftover) + regenerar el registry + verificar los 3 flujos.

**Tasks completadas:**
- [x] S2.T1 — `git rm objects/tenants/UPU/Base/curriculum.json` (OM, rama `UPONE-1261-academic-program`, staged sin commitear). Verificado: `getObjectToFileMap('UPU')['Curriculum']` ahora → `objects/business/Base/curriculum.json` (mod-derived, modelo reducido + versioning).
- [x] S2.T2 — Regenerar el registry (el dev corrió la operación). Tabla vacía evita el poison-pill; codegen-con-DB repobló desde business/Base.
- [x] S2.T3 — Verificación (edit/clone/version de un Plan en la suite): **dev confirmó "funcionó"**.

**Validación del tier (T3) — verificación independiente del registry (DET-33):**
- `rt__Plan__curriculum` (objDef 102): `totalCredits` → `isBaseField=false` (Int); `totalPeriods`/`periodType` presentes `isBaseField=false`; `progression`/`rotationConfig` `isBaseField=false`; base-inherited = modelo reducido (code/ownerType/ownerId/institutionId/appearsInDiploma/status/version/versionLabel/previousVersionId/recordType). Campos viejos (careerId/modality/publicId/versionCode/isCurrent) eliminados.
- `Curriculum` (objDef 12): `versioningConfig` poblado (versioning + prefillFrom) → VERSION destrabado.
- Mecanismos sanos: edit/clone bucketean RT fields a `rt__Plan` (no más "Unknown argument totalCredits"); version no más `OBJECT_NOT_VERSIONABLE`.

**Resultado:** REQ-EDIT/CLONE/VERSION ✅ (dato + UI del dev). Opción 2 (resolver split mod-side) descartada — innecesaria. El resolver de 074 (thin adapter) quedó intacto y correcto.

**Pendiente para cierre:** commitear la deleción del override (OM core, gated team up1); S3 (revert `98590c0`).

### Session 3 — 2026-06-22 — Revert de `98590c0` + análisis de impacto [phase: execute]

**Tipo**: ⚑ fuerte · **Validation tier**: T2

**Objetivo**: revertir el fix mal ubicado en core (`98590c0`, FK→connect en `updateInstance` base-path) + verificar no-regresión.

**Tasks completadas:**
- [x] S3.T1 — `git revert 98590c0` (auto-merge limpio): bloque FK→connect del base-path + su test removidos.
- [x] S3.T2 — Análisis de impacto (DET-33, nivel código/registry, no solo unit): **0 objetos at-risk**. El bloque solo importa para objetos editados por el base-path con FK base + extensión coexistente. En el registry de UPU, de 49 objetos con FK base, **ninguno** tiene además extensión (`ext__`) por base-path. Curriculum (origen del bug en 074) hoy va por el alias path (adapter 074-S3) → no toca el bloque. → dead code.
- [x] S3.T3 — Suite resolvers `vitest tests/unit/resolvers/`: **542/542** sin regresión. OM sano post-revert.
- [x] S3.GATE — commit `4265d22` (OM, rama épica gated). Caveat documentado: si a futuro un objeto converge a FK base + extensión por base-path, el bug reaparece (misma clase que el poison-pill del codegen); hoy no hay ninguno.

**Resultado:** REQ-NOREGRESSION ✅ (0 at-risk + 542/542). `98590c0` revertido — el core queda sin el fix mal ubicado, alineado con el principio mod-first del dev.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-EDIT (guardar edición de Plan sin error) | TC-1 | UI/e2e | ✅ COVERED (S2: dev UI OK + registry verificado) |
| REQ-CLONE (clonar Plan sin error) | TC-2 | UI/e2e | ✅ COVERED (S2: dev UI OK + registry verificado) |
| REQ-VERSION (versionar Plan sin error) | TC-3 | UI/e2e | ✅ COVERED (S2: dev UI OK + versioningConfig poblado) |
| REQ-NOREGRESSION (otros objetos FK+ext OK tras revert) | TC-4 | UI/e2e + suite | ✅ COVERED (S3: 0 objetos at-risk + 542/542 sin regresión) |

## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

**Premisa original refutada en S1.** El ticket asumía un fix mod-only de casteo FK + revert coordinado de `98590c0`. El diagnóstico real (error crudo de Prisma capturado por flujo): edit/clone fallan con `Unknown argument totalCredits`, version con `OBJECT_NOT_VERSIONABLE`. Causa raíz única: **el override stale `objects/tenants/UPU/Base/curriculum.json` (leftover pre-mod, OM repo) sombreaba la definición mod-derived** (`business/Base`) — el codegen registraba `totalCredits` como base (`isBaseField=true`) y dejaba `versioningConfig` en null. Por eso el reset previo del dev no lo arreglaba (regeneraba desde la fuente stale). Nada que ver con FK→connect ni con el resolver de 074 (que quedó intacto y correcto).

**Fix (S2, opción 1 aprobada por el dev):** `git rm` del override stale → Curriculum cae a `business/Base` (mod-derived, como AcademicProgram) → regenerar registry. Verificado: registry correcto (totalCredits isBaseField=false, totalPeriods/periodType presentes, versioningConfig poblado) + los 3 flujos OK en la suite (dev). El mod queda como única fuente de curriculum.

**S3 (revert `98590c0`):** revertido (commit `4265d22`) por decisión del dev — fix mal ubicado en core, hoy dead code (análisis de impacto: 0 objetos FK+ext por base-path; curriculum va por alias). 542/542 sin regresión.

**Entregado y verificado:** los 3 flujos (editar/clonar/versionar un Plan) guardan sin error (S2: registry correcto + UI del dev). `98590c0` revertido sin regresión (S3). Commits: OM `38eb63f` (deleción override) + `4265d22` (revert) en rama `UPONE-1261-academic-program` (push gated team up1); deckard records en main.

**Follow-ups (otro ticket, NO bloquean cierre):** 6 tenant Base leftovers de objetos mod en UPU (campus/career/course/faculty/modality/supportCenter) que podrían sombrear sus defs mod-derived igual que curriculum; bug latente del codegen (no reconcilia isBaseField base↔RT + poison-pill por `@@unique` + try/catch por-RT que aborta campos siguientes). Ver RULE-curriculum-design-010.
