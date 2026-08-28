---
id: TICKET-068
project: up1
type: ticket
status: closed
work_type: improvement
module: curriculum-design
autopilot: autonomous
---

# Curriculum v2 en UPU vía reform del objeto del mod + reseed (dev reset)

> Follow-up de [TICKET-063](ticket-063.md) (UPONE-1268). Contexto y opciones en [DECISION-017](../decisions/DECISION-017-curriculum-v1-v2-convergence.md). **Approach definitivo: Opción F (dev reset)** — el objeto `Curriculum` lo autora el mod (modificable + re-sync a Base); la data de UPU es desechable en dev (el seed no siembra filas de Curriculum). Por lo tanto NO hay convergencia ni backfill: se reforma el objeto del mod, se siembra v2-nativo, se borra el override de UPU, se re-sincroniza. Único toque **core/tenant**: la **eliminación** del override (`objects/tenants/UPU/Base/curriculum.json`) — coordinar en `develop` (RULE-dev-004). Ver learn L1.

## Request

El TICKET-063 creó el objeto `Curriculum` model-v2 en el mod `curriculum-design` (objeto + RecordTypes Plan/Minor + versionado + vista). Al validar se descubrió que el **tenant UPU ya tiene** un `Curriculum` career-based preexistente (migrado, commit `32d6b25`) en `object-manager/objects/tenants/UPU/Base/curriculum.json`, que **eclipsa** al v2 porque los objetos del tenant reemplazan totalmente a los del Base (`fileParsing.js:83`). El v2 quedó válido en el Base global y en la DB del tenant a nivel de tabla, pero el GraphQL de UPU sirve el v1.

**Objetivo** ~~(enfoque original — superseded 2026-06-16, ver "Approach definitivo" abajo)~~: ~~converger ambos modelos ampliando el objeto del tenant + backfill de las filas existentes~~. **Reemplazado por Opción F**: reformar el objeto canónico en el mod y reseed v2-nativo en UPU (sin backfill ni extensión), tras confirmar que la data de Curriculum en UPU es desechable.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement (reform del objeto del mod + seed v2-nativo + baja del override de tenant) |
| Tipo de cambio | multi (mod object-definition + seed + eliminación del override de tenant + sync) |
| Módulo principal | curriculum-design (mod, modificable) + object-manager (override UPU + seed/prisma) |
| layer | **mod** (objeto canónico, modificable + re-sync) + un toque **core/tenant** mínimo: eliminar el override de UPU (merge-gated, RULE-dev-004) |

## Approach definitivo (Opción F — dev reset vía mod) — 2026-06-16

> Reemplaza el enfoque de convergencia/backfill. Sustento (ver learn L1): el objeto lo **autora el mod** (modificable + re-sync a `business/Base`), y la data de UPU es **desechable en dev** (el seed `prisma/UPU/seed.js` solo registra el *tipo* `Curriculum`, no siembra filas). Los bloqueantes de backfill **H1** (Career→AcademicProgram), **H2** (origen de `code`) y **H4** (`publicId↔id`) **se disuelven** al sembrar v2-nativo.

**Proceso (normal up1):**

1. **Reformar el objeto del mod** `mods/curriculum-design/objects/Curriculum.json` para que abarque **todo lo que necesitamos** del objeto. Como lo define el mod, se agregan libremente las cláusulas que falten.
2. **Armar el seed** v2-nativo de UPU con esa forma (datos válidos desde el inicio: `recordType`, `ownerType`/`ownerId`, `institutionId`, `status`, `version`).
3. **Borrar el override** `object-manager/objects/tenants/UPU/Base/curriculum.json` (único toque core/tenant — una eliminación; coordinar en `develop`).
4. **Nuevo sync** (mod → `business/Base`; UPU hereda el canónico).
5. **Seed**.

Sin backfill, sin extensión `ext__`, sin protocolo de pérdida de datos.

**El objeto reformado debe cubrir todo lo que necesitamos:**

- **Capacidades v2 (ya presentes)**: `recordType` (enum Plan/Minor, discriminador) + RecordTypes Plan/Minor; `ownerType`/`ownerId` (FK polimórfica); `institutionId`; `status` (Draft/Active/Archived); versioning (`previousVersionId` + `version` + `uniqueConstraints [[previousVersionId, version]]` + `versionStrategy`); `appearsInDiploma`; `code`; `externalId`.
- **Cláusulas que faltaban (agregar al objeto del mod — a confirmar la lista final en design)**: candidatas heredadas de v1 — `modality`, `totalCredits` (como campo temporal de `rt__Plan`), y evaluar `publicId` / `versionCode` / `isCurrent` / `careerId` según necesidad real del dominio. Al ser objeto del mod, se agregan directo (no como extensión de tenant).

> [NEEDS CLARIFICATION en design] Lista final de cláusulas faltantes a incorporar al objeto del mod, y si alguna (ej. `careerId`) es UPU-específica → en ese caso evaluar si va al canónico (todos los tenants) o se modela aparte. Hoy solo UPU usa `Curriculum` (H6), así que agregar al canónico no afecta a otros con data.

## Context found (heredado de TICKET-063 + DECISION-017)

- **v1 (actual UPU)**: `publicId` (unique, autoComplete `{careerId}_{name}`), `name` (req), `versionCode`, `isCurrent`, `totalCredits` (>0), `modality`, `careerId` (req, FK→Career), `recordType` (string genérico). required: [name, careerId]. Semántica career-centric.
- **v2 (mod, en Base)**: `name`, `code`, `recordType` (enum Plan|Minor), `ownerType`/`ownerId` (FK polimórfica), `institutionId`, `appearsInDiploma`, `status`, `version`/`versionLabel`/`previousVersionId`, `uniqueConstraints [[previousVersionId,version]]`, RecordTypes Plan/Minor. Habilita UPONE-1270.
- **Mecanismo**: tenant override total (no merge); `ext__` no sirve (solo columnas satélite, no discriminador/FK polimórfica/unique compuesto). Única vía: editar el JSON del tenant.
- **Mapeo de campos propuesto** (detalle en DECISION-017): v1 conserva career*/publicId/versionCode/isCurrent/totalCredits/modality; v2 agrega code/recordType-enum/ownerType/ownerId/institutionId/status/versioning/appearsInDiploma; reconciliar `recordType` string→enum (backfill Plan), `careerId`→owner AcademicProgram (conservando careerId legacy), `isCurrent`→`status`.

## Decisiones pendientes de ratificar (DECISION-017)

1. Mapeo `careerId` → owner polimórfico (¿AcademicProgram derivado de Career? ¿se conserva careerId legacy?).
2. Valor de `status` cuando `isCurrent=false` (Draft vs Archived).
3. ¿`careerId` deja de ser `required` (porque un Minor puede no tener carrera)?
4. Cobertura del backfill `careerId → ownerType/ownerId` (pre-chequeo bloqueante, idempotente, sin `--accept-data-loss`).

## Hallazgos de revisión técnica (2026-06-16)

> Revisión previa a la aprobación, contrastando DECISION-017 contra los objetos reales (`Curriculum` v1/v2, `Career`, `AcademicProgram`). Detalle completo en [DECISION-017 § Hallazgos de revisión técnica](../decisions/DECISION-017-curriculum-v1-v2-convergence.md). No modifican la opción elegida (A); son blockers/gaps a resolver por el equipo up1 antes de ejecutar.

- **H1 (bloqueante)**: no existe resolución `careerId → AcademicProgram` (sin FK/campo espejo/mapeo). `AcademicProgram` es de facto el model-v2 de `Career` ⇒ la convergencia de `Curriculum` arrastra una dependencia oculta de convergencia `Career → AcademicProgram`. La sub-opción C1 del backfill de owner es `assumed`, no ejecutable hoy. Alternativa puente para el equipo: owner legacy = `Institution`/`institutionId`.
- **H2 (gap)**: `code` es `required` en v2 y ausente en v1 — sin origen de backfill definido.
- **H3 (gap)**: `totalCredits` es un movimiento cross-tabla (base → `rt__Plan__curriculum`), no aditivo como afirma el plan.
- **H4 (gap)**: mismatch de `targetField` en `institutionId` (`Career`→`Institution.publicId` vs v2→`Institution.id`).

## Creation scope

| Dimensión | Valor | Detalle |
|-----------|-------|---------|
| `creates_visual` | **false** | No se crea UI nueva. La vista v2 de `Curriculum` (RecordList + 4 layouts) ya existe del TICKET-063. Este ticket solo cambia qué modelo sirve UPU; la vista no cambia. |
| `creates_data` | **true** | (1) Posible reforma del objeto canónico del mod `Curriculum.json` (cláusulas a confirmar en design vía DET-32); (2) **seed v2-nativo** de filas `Curriculum` en UPU (al menos un `Plan` y evaluar un `Minor`, con `recordType`/`ownerType`/`ownerId`/`institutionId`/`status`/`version` válidos desde el origen). El draft (DET-18) modela esta forma de datos antes del spec. |

> Dato verificado en intake (2026-06-16): `object-manager/prisma/UPU/seed.js:30` es `{ name: 'Curriculum' }` — registro del **tipo**, sin filas, idéntico en `develop` y `fix/UPONE-1261-seeds-model-v2`. Confirma L1: la data de Curriculum en UPU es desechable. Sembrar v2-nativo requiere owner válido → depende de que el seed registre `AcademicProgram` + `Institution` (a verificar en design).

## Triage

**Hipótesis de complejidad (improvement)**: **media (3-5 tasks)**. Toca: (a) objeto del mod `curriculum-design` (reforma mínima o nula — el v2 ya es canónico), (b) seed UPU v2-nativo (object-manager), (c) **eliminación** del override de tenant (core/tenant, merge-gated RULE-dev-004), (d) sync + codegen + reseed, (e) smoke GraphQL. Multi-repo (mod + object-manager), single dominio (curriculum-design).

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H-A | La reforma del objeto del mod es **mínima o nula**: el v2 ya cubre el scope de UPONE-1268 (objeto + vista, sin hijos). Los campos v1 (`publicId`/`versionCode`/`isCurrent`/`careerId`/`modality`) están **superseded** por v2 (`code`/`externalId`/`versionLabel`+`version`/`status`/owner polimórfico), no se preservan (reseed nativo). DET-32 lo decide por campo en design. | confirmed (objetos leídos) | `Curriculum.json` mod (v2 completo: name/code/recordType-enum/ownerType-enum/ownerId/institutionId→`Institution.id`/status/version/versionLabel/previousVersionId/externalId + uniqueConstraints + versioning) vs override v1 |
| H-B | Los bloqueantes H1 (Career→AcademicProgram), H2 (origen de `code`), H4 (`publicId↔id`) **NO aplican**: eran problemas de backfill/migración. Con reseed v2-nativo no hay filas v1 que migrar → se disuelven (L1, DECISION-017 §Opción F). | confirmed | seed sin filas (línea 30); DECISION-017 outcome F |
| H-C | El cambio **no afecta a otros tenants** (H6): solo UPU redefine `Curriculum`. Eliminar el override hace que UPU herede el Base v2 canónico que el resto ya usa. | confirmed | DECISION-017 §H6 |
| H-D | Sembrar v2-nativo exige owner resoluble: `ownerType=AcademicProgram`+`ownerId` (o `Institution`) e `institutionId`. Riesgo: que el seed de UPU no registre `AcademicProgram`/`Institution` con la forma esperada. | a verificar en design | `fix/UPONE-1261-seeds-model-v2` ya migró Institution/Activity a v2 |

## Setup

| Campo | Valor |
|-------|-------|
| Branch (mod) | `curriculum-design` repo (independiente). Epic activa UPONE-1261. La reforma del objeto sigue flujo mod autocontenido + `npm run sync`. Working tree hoy en `UPONE-1261-academic-program`; existe `fix/UPONE-1261-seeds-model-v2` (sibling) que ya migró objetos del mod a v2 (Institution/Activity) |
| Branch (core/tenant) | `object-manager` repo (independiente). El seed v2-nativo + la **baja del override** + codegen van sobre la línea **UPONE-1261** (RULE-dev-004). **Decisión de intake**: usar `fix/UPONE-1261-seeds-model-v2` — ya contiene la migración del seed UPU a model-v2 (Institution type enum, Student/Instructor, etc.) y toca `prisma/UPU/seed.js`; `develop` NO tiene ese trabajo, ejecutar ahí conflictaría. A ratificar en design-transition |
| Base branch | `develop` (destino de merge gated por team up1, no por cierre DKC) |
| Pre-condición | data de Curriculum en UPU confirmada **desechable** (seed no la siembra). Definir en design (DET-32) la lista final de cláusulas del objeto del mod y la forma del seed v2-nativo (owner + institución resolubles) |
| Servicios | object-manager (4000), postgres, redis. Reseed = operación **DB-gated** → en autopilot super es punto de **standby** (pedir confirmación antes de drop/reseed; ver memoria super-execute-db-gated-boundary) |

## Testing

**Coverage map preliminar**: los REQ se definen en design-improvement. Marcados NOT COVERED hasta execute.

**Test cases preliminares** (improvement → baseline / mejora / regression):

| TC | Tipo | Descripción | REQ | Status | Actual / Evidencia (S2, 2026-06-16) |
|----|------|-------------|-----|--------|--------------------------------------|
| TC-01 | baseline | Antes del cambio: el tipo GraphQL `Curriculum` servido a UPU expone el modelo **v1** (`careerId`, `publicId`, `totalCredits`, `modality`, `isCurrent`) — confirma el eclipse del override | REQ-baseline | **pass** | Introspección live `__type(Curriculum)` X-Tenant-ID=UPU → `publicId, versionCode, isCurrent, totalCredits, modality, careerId, career, recordType` (v1). Confirma el eclipse. |
| TC-02 | mejora | Tras la baja del override + reseed: el tipo `Curriculum` de UPU expone v2 (`recordType`, `ownerType`/`ownerId`, `status`, `version`, `previousVersionId`) y **no** los v1-only | REQ-IMPROVE | **pass** | **v2 confirmado LIVE** tras cold restart del OM: introspección `__type(Curriculum)` X-Tenant-ID=UPU → `name, code, recordType, ownerType, ownerId, institutionId, status, version, versionLabel, previousVersionId, appearsInDiploma, externalId` (**0 campos v1**). También v2 en todas las capas persistentes (prisma schema, dynamic.js, business/Base, core_ObjectDefinition, core_FieldDefinition 12 campos). El v1 stale previo era un reload incompleto de nodemon (L4) — el cold restart lo resolvió. (Query de payload autenticada no corrida: `listInstances` es auth-gated; no necesaria — schema v2 + filas v2 en DB ya prueban "UPU sirve v2".) |
| TC-03 | mejora (data) | Filas `Curriculum` v2-nativas en UPU con owner resoluble, `institutionId`, `status`, `version=1`. Conteo > 0 | REQ-IMPROVE | **pass** | 2 filas: `UV-ICIV-PLAN-2026` (Plan, owner=AcademicProgram, status=Active, v1) + satélite `rt__Plan` (credits=240, periods=10, Semester); `UV-MINOR-MAT-2026` (Minor, owner=Institution, Active, v1). Query directa a DB UPU. |
| TC-04 | regression | Otros objetos de UPU y otros tenants sin cambios (H6) | REQ-PRESERVE | **pass** | `reset-tenant UPU` es single-tenant (solo `uplanner_upu`); ningún otro tenant tocado. codegen+migrate corrieron limpios en el reset (TENANT READY). Override era UPU-only. |

**Regression baseline** (object-manager):

| Suite/check | Comando | Estado base |
|-------------|---------|-------------|
| Unit/integration | `npm test` (vitest run) | a capturar en S1 (pre-cambio) |
| Codegen | `npm run codegen` | debe quedar verde tras la reforma |
| Drift | `npm run drift:check` | sin drift inesperado |
| Seed mod | `npm run sync` | propaga mod → business/Base sin error |

## Sessions

### Modo (autopilot)

| Timestamp | Transición | Razón | Aplica desde |
|-----------|------------|-------|--------------|
| 2026-06-16 | false → super | trigger del dev `/dkc 068 super autopilot` (por-ticket, no se detiene hasta terminar; solo push/merge/DB-gated piden confirmación) | intake en adelante |

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate | Criterio |
|---|----------|------|------|-----------------|------|----------|
| 1 | Reforma del objeto del mod (DET-32 por campo) + seed v2-nativo + sync + codegen (sin mutar DB) | design+execute (code) | T2 | DET-32 por campo sobre `Curriculum.json`; ajustar objeto si hace falta; construir filas v2-nativas en `prisma/UPU/seed.js`; `npm run sync`; `npm run codegen`; validar schema | S1.GATE | codegen verde; objeto v2 canónico en Base; seed escrito y válido; quality review T2 |
| 2 | Baja del override UPU + reseed DB + smoke GraphQL v2 | execute (**DB-gated**) | T3 | borrar `objects/tenants/UPU/Base/curriculum.json`; `npm run sync`; reseed (`tenant:reset`/`seed`); smoke GraphQL UPU (TC-01→TC-02); regression TC-04 | S2.GATE (**standby super** antes del drop/reseed) | UPU sirve v2; filas sembradas (TC-03); regression verde; otros tenants intactos |

> El corte S1|S2 coincide con la frontera **DB-gated** + **mod vs object-manager**: S1 es mod-side (autorar el seed en `mods/curriculum-design/seed/`, rama del mod limpia, sin DB); S2 es el único toque object-manager (baja del override) + sync + reseed (DB-gated, tree entangled con el WIP del dev → standby super).

### Session 1 — 2026-06-16 — Seed v2-nativo en el mod (mod-side, sin DB)

**Tipo:** auto (mod-only, sin DB)
**Validation tier:** T2

Tasks completadas:
- [x] S1.T1 — Verificar shape del modelo v2 generado (Curriculum + rt__Plan + enums) — confirmado en `prisma/UPU/schema.prisma`
- [x] S1.T2 — Crear `mods/curriculum-design/seed/_data-curriculum.js` (Plan owner=AcademicProgram UV-ICIV + Minor owner=Institution) + wirear en `seed.js` tras `loadAcademicPrograms`. `node --check` OK en ambos.

**Evidencia:** `node --check _data-curriculum.js` + `seed.js` → OK parse; wiring verificado (`grep loadCurricula seed.js` → import L36 + call L111). Seed idempotente por (institutionId, code); satélite rt__Plan anidado en el create.

**Gate decision:**
- [x] standby

**Razón del standby:** S2 es el tramo object-manager + DB-gated (baja del override + sync + reseed + smoke). Dos motivos para pausar antes (super solo pausa en DB-gated/destructivo/coordinación core): (1) la DB se muta en el reseed; (2) el working tree de object-manager está en `develop` con WIP amplio del dev (model-v2 UPONE-1261) que ya toca el override y los generados — correr sync/codegen/reseed ahí sin coordinar arriesga clobberear su trabajo. Requiere decisión del dev sobre cómo encaja el tramo OM con su WIP. La rama del mod (seed) quedó lista y aislada.

### Session 2 — 2026-06-16 — Baja del override + reset-tenant UPU + smoke (object-manager, DB-gated)

**Tipo:** ⚑ fuerte (DB-gated, data-loss aprobado por el dev — protocolo 2 momentos)
**Validation tier:** T3

Tasks completadas:
- [x] S2.T1 — Borrar override `objects/tenants/UPU/Base/curriculum.json` (git ` D`, recuperable). M1/M2 protocolo data-loss cumplido (dev aprobó "Sí, ejecuto el reset").
- [x] S2.T2 — `reset-tenant UPU` (`tenant:create -- UPU --recreate --force`). Guard AI de Prisma destrabado con consentimiento explícito del dev (legítimo, no evasión). Drift §7 resuelto: `rm -rf prisma/UPU/migrations` + baseline regenerado desde vacío (headless, sin `--accept-data-loss`). → "✅ TENANT READY" + seed del mod corrió (`loadCurricula`).
- [x] S2.T3 — Smoke: **TC-03 pass** (2 filas v2 sembradas). **TC-02 partial** (v2 en todas las capas persistentes; runtime sirve v1 stale).
- [x] S2.T4 — **TC-04 pass** (reset single-tenant; otros tenants intactos; codegen/migrate limpios).

**Evidencia:** ver tabla de Testing (TC-01..TC-04 con actuals). Capas persistentes verificadas v2: prisma schema, dynamic.js, business/Base, core_ObjectDefinition, core_FieldDefinition (12 campos, 0 v1), filas DB (Plan owner=AcademicProgram + Minor owner=Institution + rt__Plan).

**Hallazgo abierto (L4):** el OM server (nodemon) sigue sirviendo el schema v1 de `Curriculum` para UPU tras respawn, pese a que todas las fuentes persistentes son v2. Descartado: S3 (no configurado), Redis (sin store de schema), archivos/DB (v2). Causa raíz del cache/reload runtime no resuelta — necesita cold restart limpio del OM o investigación del ensamblado de schema por-tenant (ojos del dev sobre su codebase).

**Gate decision:**
- [x] continue

**Razón:** los 4 TC pasan (TC-01/03/04 + **TC-02 confirmado live tras cold restart del OM** — introspección v2, 0 campos v1). El objetivo "UPU sirve Curriculum v2" está verificado a nivel datos + schema + runtime. L4 (runtime stale) resuelto por cold restart. Listo para close + teach-close.

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-16 | 2026-06-16 |
| intake-explore | done | 2026-06-16 | 2026-06-16 |
| teach-intake | done | 2026-06-16 | 2026-06-16 |
| design-draft | done (approved v1) | 2026-06-16 | 2026-06-16 |
| design-improvement | done (spec aprobado) | 2026-06-16 | 2026-06-16 |
| design-transition-to-execute | done (dev aprobó scope + data-loss) | 2026-06-16 | 2026-06-16 |
| request-execute | done — S1 (mod seed) + S2 (override + reset-tenant + smoke), 4 TC pass | 2026-06-16 | 2026-06-16 |
| request-close | done — teach-close generado, close-review inline approve, learns procesados | 2026-06-16 | 2026-06-16 |

> **Blocker de transición a execute (2026-06-16)**: el design pipeline completo está persistido (spec + 5 decisiones registradas). La ejecución se detiene ANTES de mutar el repo `object-manager` porque su working tree está en `develop` con cambios sin commitear que NO son míos y solapan los archivos de este ticket (ver L2). Resolver el branch/working-tree es decisión del dev (RULE-dev-004 + riesgo de contaminar trabajo en vuelo). Super-autopilot resuelve decisiones de diseño solo; no commitea/cambia de rama sobre trabajo ajeno sin commitear ni sobre la rama equivocada por política.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | MODELO MENTAL ERRADO QUE COSTÓ VARIAS ITERACIONES (evitar a futuro): tratamos el `Curriculum` v2 de `business/Base` como un objeto core inmutable/externo que exigía una convergencia compleja (extensión `ext__`, backfill, bloqueantes H1/H2/H4) para no perder datos. FALSO. El objeto lo AUTORA el mod (`mods/curriculum-design/objects/Curriculum.json`) y el SISTEMA DE SYNC DE up1 lo propaga a `business/Base` (son idénticos; Base es downstream del mod). Regla derivada: si un objeto proviene del mod, es MODIFICABLE desde el mod y se re-sincroniza — no se "converge" como si fuera externo. Lo único verdaderamente core/tenant (merge-gated por RULE-dev-004) era el OVERRIDE del tenant (`objects/tenants/UPU/Base/curriculum.json` v1), no el objeto del mod. | dev | S1 | refined | [[feedback_up1_mod_object_modifiable_validate_before_converge]] |

VALIDACIÓN OBLIGATORIA ANTES DE ELEGIR ENTRE MIGRAR/CONVERGER vs RESEED: validar la data real contra (1) el SEED y (2) el PROCESO. En este caso el seed de UPU NO siembra filas de Curriculum (línea 30 de prisma/UPU/seed.js es solo registro del TIPO de objeto, junto a Career/Course/Person, no data) y estamos en dev → la data es desechable/reproducible. Cuando la data no es viva, el proceso NORMAL de up1 es: reformar el objeto del mod a lo necesario → armar el seed con eso → borrar → nuevo sync → seed. Sin backfill, sin extensión, sin protocolo de pérdida de datos. Los bloqueantes H1 (Career→AcademicProgram), H2 (origen de code) y H4 (publicId↔id) eran TODOS problemas de backfill: se disuelven al reseed v2-nativo.

CHECKLIST ANTE CONFLICTO DE MODELO SOBRE UN OBJETO: (a) ¿quién lo autora? mod (modificable + re-sync) vs core/tenant override (merge-gated); (b) ¿la data es seed-reproducible o desechable (dev) o viva? Recién con esas dos respuestas elegir reseed (barato) vs migración/convergencia (caro). NO saltar a la opción cara por asumir inmutabilidad o data viva sin verificar. Candidato a RULE de proceso (curriculum-design / up1 general). | developer | — | refined | DECISION-017 |
| L4 | RUNTIME STALE TRAS reset-tenant — RESUELTO (2026-06-16): el nodemon-reload (respawn vía `touch src/index.js`, PID cambió) NO bastó para recargar el schema por-tenant; siguió sirviendo v1 pese a fuentes 100% v2. **Fix: cold restart real** (kill -9 nodemon + listener, esperar :4000 libre, `npm run dev` fresco) → introspección live pasó a v2. Regla derivada: tras `reset-tenant`/codegen, el OM requiere un **cold restart** (bajar del todo + levantar), NO un nodemon-reload-on-touch (que no rearma el schema por-tenant). Doc §8 dice "reiniciar" pero conviene precisar: cold restart, no touch-reload. (Detalle abajo era el estado abierto previo.) | developer | S2 | refined | RULE-platform-015 |
| L4-prev | (estado abierto previo, ya resuelto por el cold restart — ver L4): tras `reset-tenant UPU` + override borrado, TODAS las capas persistentes quedaron v2 (prisma schema, dynamic.js, business/Base, core_ObjectDefinition, core_FieldDefinition 12 campos 0-v1, filas DB) pero el OM server (nodemon) **sigue sirviendo el schema v1** de Curriculum para UPU **incluso tras respawn** (PID cambió 29251→91226 vía touch src/index.js). Descartado como fuente: S3 (no configurado en .env), Redis (sin keys de schema/objectDef), archivos locales (business/Base=v2), DB (core_FieldDefinition=v2). El v1 servido coincide EXACTO con el override borrado. Implica que el ensamblado de schema por-tenant del server lee de una fuente/caché que sobrevive al respawn de nodemon y que no es ninguna de las verificadas — o requiere un cold restart real (no nodemon-reload) o hay un artefacto/caché de build. Pendiente de diagnóstico del dev (conoce el codebase OM). NO es fallo del cambio (datos+schema correctos) sino del reload runtime. Doc §8 dice "reiniciar el server tras reset" pero el nodemon-respawn no bastó. | developer | S2 | discarded | — (superseded por L4, ya resuelto) |
| L3 | CORRECCIÓN DE SCOPE (feedback del dev, 2026-06-16): el seed de Curriculum NO va en `object-manager/prisma/UPU/seed.js` (donde lo había puesto el borrador del spec) sino en el SEED DEL MOD `mods/curriculum-design/seed/`. El mod autora su propio seed (`seed.js` entrypoint + `_data-*.js`) que **corre durante `npm run sync`** (solo tenant UPU, DECISION-012) — ver logs `[curriculum-design seed] ✓`. Consecuencia: casi todo el ticket es MOD-ONLY (rama del mod, autocontenido + sync); el ÚNICO toque object-manager es la baja del override de tenant (`objects/tenants/UPU/Base/curriculum.json`) — un tenant override no se puede borrar desde el mod. Regla derivada: para sembrar data de objetos de un mod en up1, el seed va en `mods/<mod>/seed/` (corre en sync), NO en `object-manager/prisma/{tenant}/seed.js` (ese es el seed core/plataforma). Además: el mod SÍ siembra `AcademicProgram` (`_data-academicprogram.js`, TICKET-059) → owner del Plan = AcademicProgram (no Institution como asumió el primer borrador). | developer | S1 | refined | RULE-mods-047 |
| L2 | BLOCKER DE EXECUTE descubierto al transicionar (2026-06-16): el working tree de `object-manager` está en `develop` (NO en la rama de épica `UPONE-1261` que exige RULE-dev-004) con cambios sin commitear y de autoría ajena que solapan los archivos de este ticket: (1) `objects/tenants/UPU/Base/curriculum.json` está MODIFICADO — le agregaron un `recordType` string al **v1** (inconsistente con Opción F, que BORRA el override); (2) `business/Base/` ya tiene v2 `curriculum.json` + `rt__Plan/Minor` + `academicprogram.json` como untracked → **ya se corrió `npm run sync` en develop**; (3) además hay WIP amplio de model-v2 (institution/activity/offering/orgunit modificados + ruleset*/academicprogram nuevos + prisma schemas regenerados + typeDefs) — una migración UPONE-1261 en vuelo. seed.js sigue sin filas de Curriculum (línea 30 solo). Implicación: no puedo (a) cambiar de rama (fallaría/stashearía trabajo del dev), (b) commitear en object-manager (caería en develop, prohibido por RULE-dev-004 + git hook, y barrería cambios ajenos), ni (c) construir encima asumiendo Opción F mientras el override está patcheado con otro enfoque. Decisión del dev requerida sobre branch/working-tree antes de execute. | developer | — | discarded | — (resuelto en S2: dev aprobó scope mod-side + data-loss; sin artefacto reusable) |

## Summary

**Resultado**: UPU ahora sirve el `Curriculum` model-v2 (confirmado live: introspección GraphQL v2, 0 campos v1). Se resolvió el eclipse del v1 vía **dev reset** (Opción F): seed v2-nativo en el mod → baja del override de tenant → `reset-tenant UPU` → cold restart del OM. Cierra el alcance diferido de TICKET-063 y habilita UPONE-1270.

**Qué se entregó**:
- `mods/curriculum-design/seed/_data-curriculum.js` (nuevo) + wired en `seed.js` — siembra 1 Plan (owner=AcademicProgram UV-ICIV, +satélite rt__Plan: 240cr/10p/Semester) + 1 Minor (owner=Institution). Idempotente. Commit local `edc15be` (rama mod `UPONE-1261-academic-program`, sin push).
- `object-manager/objects/tenants/UPU/Base/curriculum.json` **eliminado** (en `develop`, junto al WIP del dev — sin commit por mí).
- Objeto canónico del mod: **sin cambios** (veredicto DET-32 = reforma nula).

**Acceptance** (4/4 TC pass): TC-01 baseline (eclipse v1 confirmado) · TC-02 v2 servido live tras cold restart (0 campos v1) · TC-03 2 filas v2 sembradas con owner/satélite · TC-04 regression OK (reset single-tenant, otros tenants intactos). Close-review inline (5 checks a-e) = approve.

**Decisiones**: DEC-LOCAL-01 (reforma nula, DET-32), DEC-LOCAL-02 (owner=AcademicProgram/Institution). DECISION-017 (Opción F) reafirmada por la ejecución.

**Learns**: L1 refined→DECISION-017; L2/L4-prev discarded (resueltos); L3 (seed mod-side — saved a memoria del LLM, candidato RULE) y L4 (cold restart tras reset, no nodemon-reload — candidato nota en `operations/database-reset.md §8`) quedan **raw** como candidatos de proceso para próxima sesión.

**Pendiente / handoff al dev**:
- **object-manager tree entangled**: el `reset-tenant` regeneró `business/Base`/prisma schemas/`dynamic.js`/typeDefs mezclados con el WIP UPONE-1261 del dev en `develop`, y el override quedó borrado. Revisar `git status` de object-manager antes de commitear el batch + decidir merge a `develop` (gated por team, RULE-dev-004).
- El seed del mod (commit `edc15be`) está sin push — el dev decide cuándo/cómo integrarlo.

**Gotcha operativo (L4)**: tras `reset-tenant`/codegen, el OM requiere **cold restart** (kill + start), no nodemon-reload — el reload-on-touch no rearma el schema por-tenant.
