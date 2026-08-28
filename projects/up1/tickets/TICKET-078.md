---
id: TICKET-078
project: up1
type: ticket
status: closed
work_type: fix
module: object-manager
autopilot: manual
---

# Resolver los 6 tenant Base leftovers restantes en UPU (campus/career/course/faculty/modality/supportCenter) — follow-up de TICKET-077

## Request

Follow-up flaggeado en TICKET-077 (ver RULE-curriculum-design-010 y su Summary). TICKET-077 descubrió que `objects/tenants/UPU/Base/curriculum.json` (override de tenant congelado, git-tracked desde el commit de migración `32d6b25`) sombreaba la def mod-derived de Curriculum vía codegen last-wins (`fileParsing.js:getObjectToFileMap`), corrompiendo el registry (`core_FieldDefinition`/`core_ObjectDefinition`) → editar/clonar fallaba con `Unknown argument <rtfield>` y versionar con `OBJECT_NOT_VERSIONABLE`. Para curriculum se resolvió con `git rm` del override (cae a `business/Base` mod-derived).

Quedan **6 objetos con el mismo leftover de tenant Base en UPU**: `campus, career, course, faculty, modality, supportCenter`.

**Tarea**: por cada uno, comparar el tenant override vs su definición mod-derived, determinar cuáles **divergen** (stale, riesgo real de corromper el registry) vs cuáles **coinciden / son benignos**. Para los stale, evaluar `git rm` del override + regenerar el registry + verificar editar/versionar. El fix toca `object-manager` (layer core) → rama de épica `UPONE-1261-academic-program`, merge a develop gated por team up1 (RULE-dev-004). NO commitear a develop/main.

> Inmutabilidad (DET-3): el request original no se reescribe.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | multi — leftovers en object-manager (core) cuyo modelo moderno vive en 3 mods distintos (uengagement-up1, academic-scheduling, curriculum-design) |
| Modulo principal | object-manager (los archivos leftover viven aquí; layer:core) |
| Modulos afectados | object-manager (core, codegen + registry). Mods dueños del modelo moderno: uengagement-up1 (OrgUnit RTs: Campus/Faculty/SupportCenter), academic-scheduling (Activity RT: Course), curriculum-design (curricularsection RT: Modality). Career: sin dueño moderno identificado |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Los 6 overrides resuelven (last-wins) a `tenants/UPU/Base/<obj>.json`, son defs standalone con modelo viejo, congeladas en el commit de migración `32d6b25` ("Nueva versión de objetos migrados", 2025-12-01) — mismo origen que curriculum | ✅ confirmada (S0 intake) | `getObjectToFileMap('UPU')` resuelve los 6 al tenant override. `git -C object-manager log -1` de cada uno → `32d6b25`. Props del modelo viejo: Campus `{publicId,name,city,institutionId}`, Career `{publicId,name,careerType,institutionId}`, Course `{publicId,name,credits,level,versionCode,...,retentionRate,wellbeingImpact,supportLevel,creatorId}`, Faculty `{publicId,name,institutionId}`, Modality `{name,scopeType}`, SupportCenter `{name,parentId}` |
| H2 | **A diferencia de curriculum, ninguno de los 6 tiene un `business/Base/<obj>.json` del mismo nombre al cual caer.** El modelo moderno los reubica como **RecordTypes de OTRO base object** (org-spine): Campus/Faculty/SupportCenter → RT de **OrgUnit** (uengagement-up1); Course → RT de **Activity** (academic-scheduling); Modality → RT de **curricularsection** (curriculum-design) | ✅ confirmada (S0 intake) | `business/Base/` solo contiene `orgunit.json` + `instructorcourseassignment.json` (NO campus/career/course/faculty/modality/supportcenter). rt files: `rt__Campus__OrgUnit`, `rt__Faculty__OrgUnit`, `rt__SupportCenter__OrgUnit` (uengagement-up1), `rt__Course__activity` (academic-scheduling), `rt__Modality__curricularsection` (curriculum-design). Convención `rt__<RecordType>__<baseObject>` confirmada en TICKET-077 (`rt__Plan__curriculum`) |
| H3 | **El fix de curriculum (git rm → cae a business/Base) NO transfiere 1:1.** Borrar el override de estos 6 NO los hace caer a un business/Base del mismo nombre — los orfanaría como objeto standalone (no cae a nada). El fix correcto por objeto depende de si el objeto standalone está vivo (datos/layouts/FKs que lo consumen) o es leftover muerto reemplazado por el RT | ~ inferida (síntesis S0) — requiere verificación DB | No hay business/Base de same-name (H2). Layouts del tenant UPU que referencien estos objetos standalone: 0 detectados por grep en `tenants/UPU/` (preliminar, ampliar). Falta: estado del registry en DB (¿objDef standalone activo? ¿colisiona con el RT?), datos en las tablas base, FKs entrantes |
| H4 | **Career es el caso más sospechoso**: no tiene rt file, no es referenciado como FK en ningún mod, no tiene business/Base — sin modelo moderno identificado. Candidato a leftover totalmente muerto, O a objeto aún tenant-specific genuino (override canónico, NO stale → benigno, no tocar) | ? propuesta — requiere verificación | `grep` de "Career" en mods/objects y business/: 0 matches. Sin `rt__*__Career` ni `rt__Career__*`. Distinguir muerto vs vivo exige query a la DB + búsqueda de consumidores (FK `careerId` en otros objetos, layouts, resolvers) |
| H5 | El grado de daño difiere por objeto: solo muerden los que tienen RT activo con campos que colisionan en el registry (como curriculum: campo RT registrado `isBaseField=true` + poison-pill del `@@unique`). Course (RT de Activity, props vacías en el rt file) y los OrgUnit-RTs podrían comportarse distinto a curriculum | ? propuesta | El bug de 077 requería un RT con campos propios mal-bucketed. `rt__Course__activity` tiene `properties: []`; los `rt__*__OrgUnit` agregan campos (address/city/countryCode/capacity/coordinates). El mecanismo exacto por objeto se prueba en S1 con la DB |

### Diagnóstico de intake (S0 — researcher, read-only)

**Síntesis por objeto** (override viejo vs modelo moderno en mod):

| Objeto | Override standalone (modelo viejo) | Modelo moderno (mod) | ¿business/Base same-name? | Sospecha |
|--------|-----------------------------------|----------------------|---------------------------|----------|
| Campus | `publicId,name,city,institutionId` | RT de **OrgUnit** (uengagement-up1) — `address,city,countryCode,capacity,coordinates` | NO (solo OrgUnit) | stale probable |
| Faculty | `publicId,name,institutionId` | RT de **OrgUnit** (uengagement-up1) | NO (solo OrgUnit) | stale probable |
| SupportCenter | `name,parentId` | RT de **OrgUnit** (uengagement-up1) | NO (solo OrgUnit) | stale probable |
| Course | `publicId,name,credits,level,versionCode,...,retentionRate,wellbeingImpact,supportLevel,creatorId` | RT de **Activity** (academic-scheduling) — props `[]` | NO (solo Activity) | revisar — props ricas en el override |
| Modality | `name,scopeType` | RT de **curricularsection** (curriculum-design) — `code,theoryHours,...,deliveryMode` | NO (solo curricularsection) | stale probable |
| Career | `publicId,name,careerType,institutionId` | **ninguno identificado** | NO | ambiguo — muerto o tenant-specific vivo |

**Diferencia estructural clave con TICKET-077**: curriculum SÍ tenía `business/Base/curriculum.json` mod-derived (el mod `curriculum-design` define `Curriculum.json` como base object completo). Estos 6 NO — el mod solo define **RecordTypes** sobre ellos, apuntando a OTRO base (OrgUnit/Activity/curricularsection). Por lo tanto:
- El `git rm` de curriculum funcionó porque caía a una def mod-derived correcta del mismo nombre.
- Aquí el `git rm` dejaría al objeto standalone **sin definición** (orfanado). Hay que determinar, por objeto, si eso es lo correcto (el standalone es leftover muerto, reemplazado por el RT) o destructivo (hay datos/consumidores vivos del standalone).

### Context found

- **Rules del modulo / precedente**:
  - **RULE-curriculum-design-010** (must) — el patrón exacto: objeto tenant-specific → mod-defined deja override stale que sombrea la def mod-derived. Esta tarea es su follow-up explícito (la rule nombra los 6 candidatos en su sección Verification).
  - **RULE-curriculum-design-009** (must) — adaptar a reducción de modelo upstream: verificar liveness contra el git committeado del core + blast radius sobre TODOS los objetos reducidos. Aplica directo: no asumir, verificar cada uno.
  - **RULE-dev-004** (must) — trabajo layer:core va en rama única de épica (`UPONE-1261-academic-program`), merge a develop gated por team up1. **object-manager ya está en esa rama** (verificado S0). NO commitear a develop/main.
  - **RULE-dev-006** (must) — al poner al día la rama de épica con develop: tests verdes + prohibido hand-merge de generados.
  - **RULE-platform-006/007** — PascalCase de objects + FK lowercase en codegen (relevante al leer el registry).
- **Bugs abiertos**: **BUG-object-manager-001** (detected, medium) — `updateInstance` vía alias RecordType no castea FK base ni coerciona campos tipados como `createInstance`. Relacionado al área del registry/resolver pero distinto mecanismo (no es la causa de este leftover). Advertencia al tocar el path edit/clone.
- **Specs relacionados**: SPECs de object-manager HU1–HU6 (clonación/versionamiento, done) + Track 0 (draft). Ninguno cubre este cleanup.
- **Bug latente de codegen (flaggeado en TICKET-077, no resuelto)**: el codegen no reconcilia `isBaseField` cuando un campo migra base↔RT, y el try/catch por-RT aborta los campos siguientes ante un unique-violation (`@@unique([objectDefinitionId,name])`) → poison-pill. Si alguno de los 6 muerde, la regeneración del registry exige limpiar las filas envenenadas (delete quirúrgico) o reset-tenant antes del full sync. Candidato a follow-up core aparte (no necesariamente este ticket).
- **Warnings**:
  - **Riesgo de orfanar datos** (DET-5 multi-capa): a diferencia de curriculum, borrar estos overrides no tiene fallback de same-name. Antes de cualquier `git rm`, verificar en TODAS las capas: registry en DB (objDef activo + colisión con el RT), datos en las tablas base, FKs entrantes, layouts/resolvers que consuman el objeto standalone. Sin esa verificación, un `git rm` puede romper funcionalidad viva.
  - **Career sin modelo moderno**: puede ser tenant-specific genuino (override canónico → benigno) o leftover muerto. No asumir stale.
  - **Operación DB-gated + data-loss potencial**: regenerar el registry (reset-tenant o delete quirúrgico de filas) es data-loss / DB-gated — protocolo de 2 momentos, lo corre el dev interactivo (guard AI de Prisma). NO ejecutar autónomo.
  - **Merge gated**: el commit de las deleciones va en `UPONE-1261-academic-program`; el merge a develop lo aprueba el team up1 (RULE-dev-004). El cierre DKC no implica merge.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1261-academic-program` (object-manager ya está en esta rama — verificado S0; es repo git independiente, NO submódulo) |
| Base branch | develop (merge gated team up1, RULE-dev-004) |
| DB state | UPU (`uplanner_upu`). Para verificar el registry: query a `core_ObjectDefinition` / `core_FieldDefinition` (columnas camelCase quoted, RULE-platform-005). La regeneración (si aplica) es reset-tenant o delete quirúrgico + full sync — DB-gated, la corre el dev |
| Services | object-manager :4000 + suite :3000 para verificar editar/versionar en UI. `npm run sync` full (Phase 3 codegen-con-DB) repuebla el registry |
| Test data | Objetos UPU existentes de cada tipo (campus/career/course/faculty/modality/supportCenter) para probar edit/version; o confirmar que ya no existen como standalone |

### Reproduction steps (a confirmar por objeto en S1)
1. Para un objeto candidato (ej. Campus), reproducir el síntoma de 077: editar/clonar un registro standalone → ¿`Unknown argument <rtfield>`? Versionar → ¿`OBJECT_NOT_VERSIONABLE`?
2. Verificar en la DB si el objDef standalone existe y colisiona con el RT (`rt__Campus__OrgUnit`).
3. Resultado esperado tras fix: el objeto resuelve a su modelo moderno (RT) sin override sombra; o se confirma que el standalone es benigno y se deja.

## Sessions

### Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Diagnóstico per-objeto: clasificar stale-riesgoso vs benigno | intake | T2 | Por cada uno de los 6: (a) comparar override vs modelo moderno (hecho parcialmente en S0); (b) query a la DB del registry (objDef standalone activo + colisión con RT + isBaseField de los campos); (c) buscar consumidores vivos (datos en tabla base, FKs entrantes, layouts/resolvers); (d) veredicto stale-remove / migrate / benign-keep + rollback. Career: resolver ambigüedad muerto-vs-vivo | ⚑ fuerte | Los 6 clasificados con evidencia multi-capa (DET-5); enfoque de fix por objeto aprobado por el dev (especialmente para los que tengan datos vivos o sean benignos) |
| S2 | Fix de los stale confirmados: cleanup + regenerar registry + verificar | execute | T3 | `git rm` (rama épica) solo de los overrides veredicto remove; regenerar registry (reset-tenant o delete quirúrgico + full sync — DB-gated, lo corre el dev, M1/M2 data-loss); verificar editar/versionar en UI por objeto afectado; no-regresión de los benignos/no-tocados | ⚑ fuerte (UI-gated + core gated) | Cada objeto stale removido resuelve a su modelo moderno sin error; registry correcto; benignos intactos; commits en `UPONE-1261-academic-program` (merge gated team up1) |

**Notas del plan**: S1 es bloqueante y de alto valor — la premisa "los 6 son stale como curriculum" NO está confirmada (H3/H4/H5). Es plausible que solo un subconjunto muerda y que Career sea benigno. S2 se dimensiona recién con el veredicto de S1. El bug latente del codegen (poison-pill) puede emerger en la regeneración → si lo hace, se documenta y se decide scope (limpiar filas aquí vs follow-up core aparte). No avanzar a S2 sin aprobación del dev sobre el enfoque por objeto (riesgo de orfanar datos + operación DB-gated).

## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.
**Archivo**: [`TICKET-078.teach/teach-intake.md`](TICKET-078.teach/teach-intake.md) (cuando exista)

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.
**Archivo**: [`TICKET-078.teach/teach-close.md`](TICKET-078.teach/teach-close.md) (cuando exista)

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-DIAGNOSE (clasificar los 6 stale vs benigno con evidencia multi-capa) | TC-1..TC-6 | manual | **NOT COVERED** |
| REQ-FIX (los stale confirmados resuelven a su modelo moderno sin error edit/version) | — | UI/e2e | **NOT COVERED** |
| REQ-NOREGRESSION (benignos / objetos no tocados siguen OK) | — | UI/e2e + suite | **NOT COVERED** |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | Diagnóstico Campus (override vs RT OrgUnit + registry + consumidores) | REQ-DIAGNOSE | manual | no | UPU reseed | comparar + query DB + buscar consumidores | veredicto stale/benign con evidencia | — | — | pending | — | — |
| TC-2 | Diagnóstico Career (ambigüedad muerto vs tenant-specific vivo) | REQ-DIAGNOSE | manual | no | UPU reseed | idem + buscar `careerId` FKs | veredicto con evidencia | — | — | pending | — | — |
| TC-3 | Diagnóstico Course (RT de Activity; props ricas en override) | REQ-DIAGNOSE | manual | no | UPU reseed | idem | veredicto con evidencia | — | — | pending | — | — |
| TC-4 | Diagnóstico Faculty (RT de OrgUnit) | REQ-DIAGNOSE | manual | no | UPU reseed | idem | veredicto con evidencia | — | — | pending | — | — |
| TC-5 | Diagnóstico Modality (RT de curricularsection) | REQ-DIAGNOSE | manual | no | UPU reseed | idem | veredicto con evidencia | — | — | pending | — | — |
| TC-6 | Diagnóstico SupportCenter (RT de OrgUnit) | REQ-DIAGNOSE | manual | no | UPU reseed | idem | veredicto con evidencia | — | — | pending | — | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| object-manager resolvers (unit) | `vitest run tests/unit/resolvers/` | (capturar baseline en S1) | — | — |

**Baseline**: capturar al inicio de S1 (TICKET-077 S3 reportó 542/542 en esta suite).

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-22 | 2026-06-23 |
| request-execute | not-run | — | — |

## Cierre (2026-06-23)

**Tipo de cierre**: diagnosis-registered / execution-deferred (NO "done"). Sin evidencia de ejecucion porque las sessions S1/S2 no se corrieron.

**Lo que SI quedo (valor del ticket)**: el diagnostico de intake S0 — hipotesis H1-H5, la sintesis por objeto (override viejo vs modelo moderno en mod), el Context found, y el learn L1 (un reset-tenant NO arregla un override stale git-trackeado; solo `git rm` lo saca). Es el punto de partida si el problema reaparece.

**Verificacion al cerrar (2026-06-23)**: los 6 overrides `tenants/UPU/Base/{campus,career,course,faculty,modality,supportCenter}.json` **siguen presentes** (ningun `git rm`; el unico fue Curriculum en TICKET-077, commit `38eb63f`) y los 6 objDef standalone siguen en el registry de `uplanner_upu`. El reset/regen DB de esta jornada (hecho por otro motivo — TICKET-079 updatedById) NO los removio, coherente con L1.

**Por que se cierra sin ejecutar**: decision del dev — el manejo fue a nivel DB y la remocion formal de los overrides no se va a perseguir ahora. La premisa "los 6 son stale como curriculum" nunca se confirmo (H3/H4/H5 quedaron sin verificar); puede que varios sean benignos (standalone sin RT que colisione) y Career sea tenant-specific genuino.

**Trigger de reapertura**: si editar/clonar/versionar falla en alguno de los 6 con `Unknown argument <rtfield>` / `OBJECT_NOT_VERSIONABLE` (sintoma de TICKET-077 / RULE-curriculum-design-010), reabrir este ticket o crear un follow-up partiendo de este diagnostico + ejecutar el `git rm` del override stale correspondiente (rama `UPONE-1261-academic-program`, merge gated team up1).

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Un re-sync / deploy NO arregla el override stale de tenant Base — lo perpetúa. Razón: `fileSync` solo escribe `business/Base/`, nunca regenera `tenants/<T>/Base/` (artefactos de migración congelados, git-tracked). El override es fuente committeada y gana siempre por last-wins en `getObjectToFileMap`, así que un full sync (o reset-tenant) regenera el registry desde el MISMO source stale → reproduce la corrupción. Probado empíricamente en TICKET-077 (reset-tenant no arregló curriculum). El único fix es sacar el override de la fuente (`git rm`); el sync recién regenera bien DESPUÉS de borrarlo. Matiz para estos 6: el mecanismo solo *muerde* si el objeto tiene un RecordType activo con campos que colisionan en el registry; un standalone puro sin RT que colisione se registra como objeto redundante (molesto, quizá inofensivo) — cuáles muerden lo verifica S1. | passive | — | discarded | — |
