---
id: TICKET-067
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1271
module: layout
autopilot: autonomous
---

# RecordDetail.handleSubmit envía campos virtuales (display-siblings/relaciones) al createInstance → Prisma los rechaza

## Request

> Bug core del layout-engine, descubierto probando el clone de academicProgram (TICKET-062). **Jira `UPONE-1271`** (la que lo descubrió — decisión del dev 2026-06-15). **layer:core** — el fix va en el repo `layout/`, merge-gated por el team up1 (RULE-dev-004); la **rama** del core se confirma en intake (commits prefijados `UPONE-1271` por DET-19, independiente de qué rama core los aloje).

Al guardar un clone (`cloneStrategy: "prefilledModal"`), el create falla con *"La información proporcionada no es válida — InstitutionName"*. Causa: el `prefilledModal` copia de la fila campos **virtuales** (display-siblings de FK, objetos de relación, `extended`) al `initialData`, y `RecordDetail.handleSubmit` los manda en el payload de `createInstance` sin filtrarlos contra el schema del objeto → Prisma rechaza la primera columna desconocida.

Afecta a **cualquier objeto con FK display** que use el clone via prefilledModal, no solo academicProgram.

## Por qué es necesario

- **Bloquea el entregable**: "Duplicar" (UPONE-1271) es inútil si el clone no se puede **guardar**. El usuario llena el modal, da Guardar, y recibe un error de validación opaco ("información no válida — InstitutionName") que no le dice qué hacer (el campo `code` que él controla está bien; el que falla es uno que ni ve).
- **No es un caso aislado de academicProgram (H4)**: el mecanismo —prefill copia campos virtuales de la fila + `handleSubmit` no filtra contra el schema— se dispara en **todo objeto con FK display clonado via `prefilledModal`**. Es un defecto del **layout-engine compartido**, no del mod. Arreglarlo una vez en el engine blinda todos los clones/creates del plataforma (alto ROI; por eso layer:core).
- **Riesgo latente más amplio**: cualquier flujo de create cuyo `initialData` traiga keys fuera del schema (no solo el clone) terminaría mandando junk a Prisma. La Opción A (filtrar el payload al schema) cierra la clase entera de bug, no solo este síntoma.

## Por qué no se detectó antes (gap de detección — honesto)

El clone de academicProgram (TICKET-062) se cerró con `status: closed` y "TC PASS", pero el camino real de guardado por UI nunca se ejercitó. Causas concretas, para que no se repita en 064/065:

1. **Verificación solo a nivel-datos**: TC-2/TC-3 de 062 se validaron con un `prisma.create({data:{...campos limpios}})` armado a mano — ese path **no pasa por el form ni por el prefill**, así que los campos virtuales (`institutionName`, etc.) nunca estuvieron en el test. El create con datos limpios pasó → falsa confianza de "el clone funciona".
2. **Override del smoke UI**: TC-1/TC-5 (Affects UI=yes) se cerraron por **override** ("el primitivo prefilledModal está probado + config verificada-aplicada") en vez de **hacer click en Duplicar → Guardar** en la UI. El override saltó exactamente el path donde vive el bug (form → `handleSubmit` → payload). **El smoke real lo habría atrapado.**
3. **El bug de display (066) enmascaraba el del payload**: antes de 066, el FK no resolvía el `institutionId` prellenado → "no match" → el usuario ni llegaba a "Guardar". Incluso un test manual pre-066 se habría detenido en el display, sin alcanzar el payload. 066 (relationDisplayFields) destrabó el display y **recién ahí** quedó expuesto este segundo bug, preexistente.
4. **Suposición "primitivo probado = correcto"**: `prefilledModal` se asumió correcto por reuso (modality), sin verificar que el clone-save de un objeto con FK display + fila sobre-fetcheada (institutionName/executionUnitName/extended/relación) terminara en un payload limpio. El reuso no cubría esta forma de dato.
5. **Sin test automatizado end-to-end del save**: los tests del mod son **declarativos** (layouts-declared, recordtypes-declared) — validan forma de config, no el submit en runtime. No había red que cubriera form → `createInstance`.

**Lección para 064/065 (y todo clone futuro)**: un TC con `Affects UI=yes` NO se cierra por override si toca un path de runtime no cubierto por tests-datos; exige smoke real (o inspección del payload de la mutation). La verificación a nivel-datos prueba el backstop de DB, no el camino del usuario.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | core (layout-engine: `RecordDetail.vue` y/o `RecordList.vue`) |
| Módulo principal | layout |
| Layer | core (rama UPONE-1206, merge gated — RULE-dev-004) |
| Módulos afectados | layout (todos los consumidores del create/clone) |

## Triage

### Evidencia (repro real — payload capturado, DET-7)

Clone de `AcademicProgram` ("Doctorado en Ciencias", code nuevo `aa11`). Payload de `createInstance`:

```json
{
  "name": "Doctorado en Ciencias", "code": "aa11", "degree": "Doctorate",
  "modality": "InPerson", "nominalDuration": 8,
  "institutionId": "cmqbck751...", "governanceUnitId": "cmqbck736...",
  "executionUnitId": "cmqbck753...", "externalId": null,
  "governanceunit": null,                                   // ← JUNK (objeto relación)
  "institutionName": "Universidad del Valle",               // ← JUNK (display-sibling)
  "executionUnitName": "executionunit #cmqbck736...",       // ← JUNK (display-sibling)
  "extended": null                                          // ← JUNK (contenedor extended)
}
```

Los 9 campos reales están **correctos** (incluidos los 3 FK con UUID real y el code nuevo). Los **4 junk** son el problema. El sibling se nombra `fieldName.replace(/Id$/,'')+"Name"` → `institutionName`/`executionUnitName` (minúscula; el "InstitutionName" del error de UI es el label, no la key).

### Causa raíz (confirmada multi-capa, DET-5)

1. **Lista** (`RecordList.vue`, `relationDisplayFields`): cada fila trae display-siblings resueltos (`institutionName`, etc.) + objetos de relación + `extended`, además de los FK id.
2. **`prefilledModal`** (`RecordList.vue:~2730`): copia todos los escalares de la fila salvo identity/audit/uniqueFields → los virtuales entran al `initialData` (los strings por escalar, los `null` por `v === null`).
3. **`handleSubmit`** (`RecordDetail.vue`): el junk **NO entra por el field-loop** (L3435 — `institutionName` etc. no son campos del form, no están en `formData`). **Entra por la inyección de `initialData` en L3633-3640**: un bloque que mete TODAS las keys de `props.initialData` en `submitData` (existe para inyectar campos backend-required ausentes del form pero columnas reales, ej. owner polimórfico `ownerType`/`ownerId`). El prefill metió el junk en `initialData` → la inyección lo pasa crudo. **Culpable preciso (L1).**
4. **Prisma** (`object-manager/instance.resolver.js:~1820`): rechaza "Unknown field" → error de UI.

### Fix (decidido — Opción A acotada al culpable, L1)

En `RecordDetail.vue` inyección de `initialData` (L3633-3640): filtrar a keys que sean **campos reales del objeto** (`baseFields ∪ customFields` por nombre) **+ allowlist** de campos backend-required-pero-no-en-schema (`ownerType`, `ownerId`, `recordType`). Descarta el virtual (`institutionName`, `executionUnitName`, `governanceunit`, `extended`); **preserva** el owner polimórfico (son columnas reales → en baseFields, o en la allowlist como red).

- **Por qué ahí y no en el field-loop**: el field-loop no es el culpable (el junk no es form-field). Tocar solo la inyección es el cambio mínimo y suficiente.
- **Edit no afectado**: edit no setea `props.initialData` (carga por `instanceId`).
- **Opción B descartada** (excluir en el prefilledModal de `RecordList.vue`): solo cubriría el clone; el fix en la inyección blinda cualquier create con `initialData` sobre-fetcheado.

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El payload lleva 4 campos no-columna (`institutionName`, `executionUnitName`, `governanceunit`, `extended`) | ✓ confirmada | payload capturado (arriba) |
| H2 | Origen = prefilledModal copia escalares/null de la fila sin filtrar virtuales | ✓ confirmada | `RecordList.vue` prefilledModal handler (copia `typeof v !== 'object'` + `v === null`) |
| H3 | El junk entra por la inyección de `initialData` (L3633-3640), NO por el field-loop | ✓ confirmada → refinada (L1) | lectura completa de handleSubmit L3415-3640: el junk no es form-field (no en `formData`); la inyección mete toda key de `initialData` |
| H4 | Afecta a todo objeto con FK display + prefilledModal (no solo academicProgram) | ✓ confirmada (por mecanismo) | la inyección + el prefill son del engine compartido; cualquier clone con relationDisplayFields produce el mismo junk. El fix en la inyección lo cubre transversalmente |

## Context found

- **Descubierto en**: UPONE-1271 (TICKET-062 clone academicProgram + TICKET-066 fix relationDisplayFields del create layout). El display ya funciona; este bug bloquea el **guardado** del clone.
- **No es regresión de 066**: los display-siblings ya viajaban en el prefill desde antes (la lista siempre los resuelve); 066 solo destrabó el display y dejó llegar al submit, exponiendo este bug preexistente.
- **RULE-dev-004 / core_work_policy**: layer:core → trabajo en rama core (a confirmar en intake), commits con id externo `UPONE-1271`, merge a develop gated por review del team up1. NO se cierra con el merge.
- **Análisis de impacto colateral (obligatorio antes de tocar)**: `handleSubmit` es el path de submit de TODOS los RecordDetail (create + edit de todo objeto). El fix A debe preservar campos válidos (incl. `extended`/custom fields legítimos cuando aplican, JSON fields con `.`, FK `{value,label}` → value). Verificar que el filtro use la definición real del objeto y no rompa edit ni objetos con extended fields reales.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | **`UPONE-1271-recorddetail-payload-fix`** (repo `layout/`, desde `develop`). Decisión 2026-06-15: `UPONE-1206` (rama core SP3) ya mergeada a develop y 20 commits atrás → stale; sin rama core SP4 activa → rama fresca por id de ticket (core_work_policy). Commits prefijados `UPONE-1271` (DET-19). Merge a develop gated por team up1 (RULE-dev-004) |
| Base branch | develop |
| Repo | `layout/` (repo git independiente) |
| Validación | tests del layout-engine (vitest) + smoke del clone de academicProgram en UPU (que el payload ya no lleve junk) + regression: edit/create normal de otros objetos no se rompe |

## Sessions

### Plan de sessions (preplanificacion)

1 session. Fix de 1 bloque en core layout-engine; el riesgo está en la regresión (handleSubmit es el submit de todo create), no en el tamaño.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Filtrar la inyección de initialData en handleSubmit a campos reales del objeto | 1 | T3 | S1.T1 implementar filtro en `RecordDetail.vue` L3633-3640 (baseFields∪customFields + allowlist owner/recordType) · S1.T2 tests vitest del engine (payload limpio + owner polimórfico preservado) · S1.T3 smoke: clone academicProgram guarda en UPU + regression edit/create normal de otro objeto | ⚑ fuerte | clone guarda sin junk (payload solo columnas reales) + owner polimórfico (modality/CurricularSection) sigue clonando + tests engine verdes + edit no roto |

**Notas**: tier T3 ⚑ fuerte por ser core compartido (regresión sobre todo create/clone). Sin gate de mutation (cambio acotado de 1 bloque lógico; la dimensión testing se cubre con los tests del engine + smoke). DET-30 guard: rama `UPONE-1271-recorddetail-payload-fix` (no protegida) ✓.

### Session 1 — 2026-06-15 — Filtrar inyección de initialData [tier: T3] [tipo: ⚑ fuerte]

**Tasks completadas:**
- [x] S1.T1 — filtro en `RecordDetail.vue` (inyección initialData) vía helper puro `isInjectableInitialDataKey`. Commit `ce94be7`.
- [x] S1.T2 — helper extraído a `recordDetailInitialData.ts` + test `recordDetailInitialData.spec.ts` (5/5). Commit `ce94be7`.
- [x] S1.T3 — **smoke live confirmado por el dev**: el clone de academicProgram **guarda** (el error "InstitutionName" desapareció). La suite consume `layout/src` vía alias Vite (nuxt.config L100-169) → el fix quedó live con reload, sin build. TC-3 (owner polimórfico) cubierto por allowlist + unit test (no se forzó smoke de modality — no es la evidencia gatillante).
- [x] S1.GATE — continue (ver decisión abajo).

**Log:**
- **S1.T1/T2 ✓**: fix de 1 bloque (L3633-3640) refactorizado a helper puro + import. La inyección de `initialData` ahora solo agrega `baseFields ∪ customFields` + allowlist `[ownerType, ownerId, recordType]`; descarta el junk virtual. Commit `ce94be7` (3 archivos, +99) en `UPONE-1271-recorddetail-payload-fix`.
- **Tests**: helper 5/5 (junk dropeado / owner preservado / custom field / allowlist custom). **Regresión: 1021/1021 unit tests del layout-engine** (63 files) — sin romper nada.
- **S1.T3 ✓ (smoke)**: dev confirmó que el clone guarda en la UI. Consumo dist→suite resuelto: alias Vite a `layout/src` (no dist) → fix live con reload. Intento de smoke API quedó bloqueado por auth Clerk (no usado).
- **TCs**: TC-1 (clone academicProgram guarda) ✓ smoke dev · TC-2 (virtual descartado) ✓ unit · TC-3 (owner preservado) ✓ unit (allowlist) · TC-4 (edit/create normal) ✓ regresión 1021/1021.

**S1.GATE — quality review (DET-23, T3) → continue:**
- #1-3 calidad/lint/tipado: helper puro tipado + import; cambio de 1 bloque. pass.
- #4 testing: unit 5/5 + smoke dev (TC-1) + regresión 1021/1021. Cierra el gap "sin test del path" de 062 (L1). pass.
- #6 mantenibilidad: filtro extraído a helper documentado y testeable. pass.
- DET-16 propagación: handleSubmit es submit de todo RecordDetail → verificado que edit (no usa initialData) y create normal no se afectan (regresión). pass.
- **Decisión**: `- [x] continue` — clone confirmado, sin backlog must.

### Discoveries / decisions

- **D1 (out-of-scope, anotado sin ticket por decisión del dev)**: versionar `activity` da unique-violation "(previousVersionId, version) ya existe". Es objeto/épica/path distintos (versionado = create inmediato vía `useCreateRowAction`, NO pasa por `handleSubmit`) → **mi fix es inocente**. Preexistente. Causa probable: la activity ya tiene esa versión, o el incremento de `version` recalcula un par colisionante. Para retomar: revisar la cadena de versiones de esa activity en DB + el resolver version-from-source. No se abrió ticket (decisión del dev 2026-06-15).

## Summary

**TICKET-067 (UPONE-1271) — fix core layout-engine — CLOSED 2026-06-15.**

`RecordDetail.handleSubmit` inyectaba **todas** las keys de `initialData` al payload de `createInstance` (bloque L3633-3640, pensado para owner polimórfico). El clone (prefilledModal) metía ahí campos virtuales de la fila (`institutionName`, `executionUnitName`, `governanceunit`, `extended`) → Prisma rechazaba ("Unknown field"). 1 session (S1, T3 ⚑ fuerte), ~2 SP.

**Entregado (commit `ce94be7`, repo `layout/` rama `UPONE-1271-recorddetail-payload-fix`):**
- `recordDetailInitialData.ts` — helper puro `isInjectableInitialDataKey` + `INITIAL_DATA_OWNER_ALLOWLIST`.
- `RecordDetail.vue` — la inyección de `initialData` ahora filtra a `baseFields ∪ customFields` + allowlist `[ownerType,ownerId,recordType]`; descarta el junk virtual.
- `__tests__/recordDetailInitialData.spec.ts` — 5 casos.

**Verificación (DET-13):** unit 5/5 (junk dropeado / owner preservado / allowlist) + **regresión 1021/1021** del layout-engine + **smoke del dev** (clone academicProgram guarda en UI). Reviewer aislado (REQ-03): approve 5/5. Consumo dist→suite: alias Vite a `layout/src` (no dist) → fix live con reload, sin build.

**Learns:** L1 (refined → este teach) — el culpable era la inyección de initialData (L3633), NO el field-loop; leer el flujo completo antes de fijar el lugar del fix.

**Pendiente / contexto:**
- **Push**: `ce94be7` local; super difiere push a OK humano. Rama core merge a develop **gated por team up1** (RULE-dev-004) — el cierre DKC NO implica merge.
- **D1 (out-of-scope, sin ticket por decisión del dev)**: versionado de `activity` da unique-violation `(previousVersionId, version)` — objeto/épica/path distintos, fix inocente, preexistente. Anotado en Discoveries.
- Backlog: sin items `must`.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Culpable preciso del junk en el payload: NO es el else de handleSubmit (L3521-3524, que solo procesa campos del FORM y el junk no es form-field), sino la inyección de initialData en RecordDetail.vue L3633-3640 — un bloque que mete TODAS las keys de props.initialData en submitData si no están ya seteadas. Existe para un caso legítimo: campos backend-required ausentes del schema del form pero columnas reales (owner polimórfico ownerType/ownerId via canCreateInitialData). El prefilledModal mete el junk virtual (institutionName/executionUnitName/governanceunit/extended) en initialData, y esta inyección lo pasa crudo al payload. Fix seguro: filtrar la inyección a keys en baseFields∪customFields (+ allowlist ownerType/ownerId/recordType) — preserva el owner polimórfico (son columnas reales) y descarta el virtual. Edit no usa initialData → no afectado. Verificado leyendo el flujo completo de handleSubmit (L3415-3640): los campos reales (institutionId, name, code, FKs) llegan por el field-loop vía formData; solo el junk llega por la inyección. | developer | S1 | refined | teach-close.html (lección: leer el flujo completo antes de fijar el lugar del fix) |
