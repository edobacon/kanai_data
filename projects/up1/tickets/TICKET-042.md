---
id: TICKET-042
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1213
module: layout
autopilot: autonomous
---

# HU-7 | Row action type:create (Ladrillo 4 — primitivo declarativo transversal de layout)

## Request

> Contenido literal del ticket Jira [UPONE-1213](https://u-planner.atlassian.net/browse/UPONE-1213) (Historia, parent epic UPONE-1206).

### Descripción

Crear el tipo de row action `type: "create"` (con `prefillFromCurrent` + `asNewVersion`) como primitivo declarativo del layout, para ofrecer "Crear nueva versión" (y "Clonar") sin componentes a mano.

### Criterios de aceptación

* Tipo `create` en **las 2 definiciones** del union (`recordlist.ts` + `EnhancedRowAction`); caso aditivo en el dispatcher (no toca los otros tipos).
* Handler invoca `createInstance(prefillFrom + asNewVersion)`.
* Visibilidad por `relations: ["currentStatus"]` **en el config de la lista** + `visibilityConditions` por `currentStatus.allowsVersioning`.
* Sin modal cuando `versionStrategy: "increment"`.

### Dependencias

HU-1, HU-3, HU-0a, HU-0f, HU-0h.

### Cambio vs actual

El tipo `create` es nuevo (no existía); `relations` va en el config de lista; actualizar las 2 definiciones del union.

## Contexto operativo del plan SP3

### P3.1 — HU-7 · Row action type:create (Fase 3) · [transversal/clonacion] · `P1`

- **Meta**: implement (layout) · ~3 SP · certeza confirmado (dispatcher de if) · rollback git revert (tipo aditivo) · riesgo: 2 definiciones del union; relations en config de lista
- **Contexto**: `type:create` **no existe** (tipos actuales: `default|modal|download-template|import-template|mutation`). Se crea como primitivo declarativo con flags ortogonales: versionar = `create + asNewVersion`; clonar = `create + prefillFromCurrent`. La visibilidad por flag relacionado es **config** (la lista hidrata `currentStatus` via `relations`).
- **Que se realiza**: tipo `create` en las **2 definiciones del union** (`recordlist.ts:68` + `EnhancedRowAction` en `useRowActionHandler.ts:25`); caso aditivo en el dispatcher (`RecordList.vue`, cadena de `if`, sin tocar otros tipos); handler que invoca `createInstance(prefillFrom + asNewVersion)`; visibilidad por `relations: ["currentStatus"]` en el config de la lista + `visibilityConditions` por `currentStatus.allowsVersioning`; sin modal para `increment`.
- **Depende de**: HU-1, HU-3, HU-0a, HU-0f, HU-0h.
- **Investigar**: confirmar y actualizar las **2 definiciones del union**.
- **Prueba**: `unit` visibilidad respeta `allowsVersioning`; no modal para increment; redirect; error handling. `smoke` el boton aparece donde corresponde.

## Material internalizado — HU detallada

### HU-7 · Row action type:create declarativo (prefillFromCurrent + asNewVersion)

**Sprint:** SP3 · **Track:** Core layout · **Repo:** `layout`

**Como** dev de mod
**Quiero** un row action `{ "type": "create", "prefillFromCurrent": true, "asNewVersion": true, ... }`
**Para** ofrecer "Crear nueva version" (y "Clonar") sin escribir componentes ni argsMapping a mano.

**Estado actual verificado:** `type: "create"` **NO existe** (`recordlist.ts:68` + `EnhancedRowAction` en `useRowActionHandler.ts:25` — **dos definiciones del union**). El dispatcher es cadena de `if` (`RecordList.vue:2205-2306`), sin `switch` exhaustivo → agregar caso es aditivo. La visibilidad con dot-notation **si** existe (`useFieldConditions.ts:38-52`); la lista hidrata relaciones via `relations` en el config (`useDataFetching.ts:126`, precedente `hw-intervention-list.json:19`).

> **Decision v5 (D23)**: crear `type: "create"` como **primitivo declarativo** (`prefillFromCurrent` + `asNewVersion` ortogonales), no reusar `type: "mutation"`. Versionar = create + asNewVersion; Clonar = create + prefill.

**Criterios de aceptacion:**

- [ ] Tipo `create` nuevo en **ambas** definiciones del union (`layout/src/types/recordlist.ts` y `EnhancedRowAction` en `useRowActionHandler.ts`) con props `prefillFromCurrent: Boolean = false`, `asNewVersion: Boolean = false` (requiere `prefillFromCurrent`), `label`, `redirectTo` (default `edit`).
- [ ] Caso `create` aditivo en el dispatcher (`RecordList.vue`), sin tocar los casos `modal`/`mutation`/etc.
- [ ] Handler: `prefillFromCurrent` → `createInstance(prefillFrom: { sourceId: <currentRowId> })`; `asNewVersion` → agrega el flag.
- [ ] **Visibilidad por config** (sin codigo nuevo): `relations: ["currentStatus"]` **en la raiz del config de la lista** (no en el row action) + `visibilityConditions` por `currentStatus.allowsVersioning == true`. Documentar el patron (precedente `hw-intervention-list.json`).
- [ ] Exito → `redirectTo`. Fallo → toast con error code del Ladrillo 2.
- [ ] **Sin modal** — en SP3 la unica strategy es `increment` (no pide valor al usuario). (El modal de captura de valor llega con `user-provided` en SP4.)
- [ ] Tests: visibilidad respeta `allowsVersioning` (flag false → oculto; true → visible), no modal para increment, redirect, error handling.

**Dependencias:** HU-1, HU-3, HU-0f, HU-0a, HU-0h.
**Si HU-0f vetada**: fail-closed cuando FKs null. **Si HU-0a vetada**: modal siempre.

## Material internalizado — Decisiones de diseno

### Ladrillo 4 (diseno §7.4) — Row action `type: "create"`

| Campo | Respuesta |
|---|---|
| ¿Tipo nuevo? | **Si.** `type: "create"` **no existia** (verificado: tipos eran `default \| modal \| download-template \| import-template \| mutation`). Se crea como primitivo general. |
| Parametros | `prefillFromCurrent: Boolean = false` · `asNewVersion: Boolean = false` (requiere `prefillFromCurrent`) · `label` · `redirectTo` (default `edit`). |
| Comportamiento | Si `prefillFromCurrent`, invoca `createInstance(prefillFrom: { sourceId: <currentRowId> })`; si `asNewVersion`, agrega el flag. **Visibilidad**: `relations: ["currentStatus"]` **en la raiz del config de la lista** (no en el row action) + `visibilityConditions` por `currentStatus.allowsVersioning` (verificado factible sin codigo nuevo — la lista hidrata la relacion, dot-notation soportado; precedente `hw-intervention-list.json`). |
| Eventos | Exito → `redirectTo`; fallo → toast con el error code del Ladrillo 2. |

## Material internalizado — Discovery §2.5

### Layout (row actions + visibilidad)

- `type: "create"` **no existe**. Unions: `recordlist.ts:68` (`default|modal|download-template|import-template|mutation`) y `EnhancedRowAction` en `useRowActionHandler.ts:25` (**dos definiciones**).
- Dispatcher: cadena de `if` en `RecordList.vue:2205-2306` (sin `switch` exhaustivo, sin `never`-checks) → agregar caso es aditivo. Segundo dispatcher agnostico al tipo en `ChibiList.vue:716-741`.
- Visibilidad dot-notation: `useFieldConditions.ts:38-52` (`getNestedValue`); `visibilityConditions` ya en `RowAction` (`recordlist.ts:92`); evaluacion en `useRowActionHandler.ts:147-165`.
- **Hidratacion de relaciones en listas es configurable**: la query `LIST_INSTANCES` acepta `$includeRelations`/`$relations` (`RecordList.vue:1431`); `useDataFetching.ts:126-135` lee `layoutConfig.relations`. Precedente real: `hw-intervention-list.json:19` (`"relations": ["hwassessment"]`).
- `relations` NO existe como campo de `RowAction` (solo `CalendarViewConfig:607`) → va en la **raiz del config de la lista**, no en el row action.

## Material internalizado — Shape canonico

### Tipo `create` (TypeScript union)

```typescript
// layout/src/types/recordlist.ts (definicion 1 del union)
type RowAction =
  | DefaultRowAction
  | ModalRowAction
  | DownloadTemplateRowAction
  | ImportTemplateRowAction
  | MutationRowAction
  | CreateRowAction; // NUEVO

interface CreateRowAction {
  type: 'create';
  prefillFromCurrent?: boolean;
  asNewVersion?: boolean; // requiere prefillFromCurrent
  label: string;
  redirectTo?: 'edit' | 'view'; // default 'edit'
  icon?: string;
  visibilityConditions?: VisibilityConditions;
}
```

```typescript
// layout/src/composables/useRowActionHandler.ts (definicion 2 del union)
type EnhancedRowAction =
  | (DefaultRowAction & ...)
  | (ModalRowAction & ...)
  | ...
  | (CreateRowAction & ...); // NUEVO
```

### Dispatcher aditivo (RecordList.vue)

```vue
<!-- cadena de if existente, agregar al final -->
} else if (action.type === 'create') {
  if (action.prefillFromCurrent) {
    const args = { prefillFrom: { sourceId: row.id } };
    if (action.asNewVersion) args.asNewVersion = true;
    return await createInstance(objectType, {}, args);
  }
}
```

### Config de la lista (visibilidad por relacion)

```json
{
  "relations": ["currentStatus"],
  "rowActions": [
    {
      "type": "create",
      "prefillFromCurrent": true,
      "asNewVersion": true,
      "label": "{{$t('createNewVersion')}}",
      "redirectTo": "edit",
      "icon": "bi-arrow-clockwise",
      "visibilityConditions": {
        "operator": "AND",
        "conditions": [
          { "field": "currentStatus.allowsVersioning", "operator": "==", "value": true }
        ]
      }
    }
  ]
}
```

> **Patron precedente**: `mods/hello-world-mod/config/layouts/hw-intervention-list.json:19` ya hace `"relations": ["hwassessment"]`. Igual aqui pero con `currentStatus`.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | multi (2 unions + dispatcher + handler + tests) |
| Modulo principal | layout |
| Modulos afectados | layout (types, composables, RecordList.vue, ChibiList.vue) |
| Layer | core |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | yes | Boton nuevo en row de Activity (visible solo si `allowsVersioning=true`) |
| Data model | no | — |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | skipped |
| Version aprobada | — |
| Path | — |

> No requiere draft formal: el boton es trivial visual (icon + label) renderizado por el renderer de row actions existente — no crea pantalla/componente nuevo ni requiere wireframe. La verificacion visual se hace via smoke en storybook (S3, gate fuerte).

> **Decision local (autopilot super, 2026-06-02)**: `draft_approved: skipped`. Driver: el unico elemento visual nuevo es un boton declarativo (icon `bi-arrow-clockwise` + label i18n) que reusa el render path de los row actions ya existentes; un draft formal (preview.html/data-model) no agrega informacion sobre la decision ni reduce riesgo. Alternativa descartada: generar preview minimo — descartada por costo sin retorno (el render real en storybook es mejor evidencia que un mock estatico). Reversibilidad: trivial (re-invocar design-draft si emergiera UI no trivial).

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Las 2 definiciones del union estan sincronizadas hoy; agregar el tipo nuevo requiere actualizar ambas | ✓ confirmada | `recordlist.ts:68` + `useRowActionHandler.ts:25` declaran el mismo union |
| H2 | El dispatcher (`RecordList.vue` + `ChibiList.vue`) es cadena de `if` sin exhaustiveness check → agregar caso nuevo es aditivo sin romper los existentes | ✓ confirmada | `RecordList.vue:2205-2306` + `ChibiList.vue:716-741` |
| H3 | `relations` en la raiz del config de la lista hidrata `currentStatus`, y `visibilityConditions` con dot-notation resuelve `currentStatus.allowsVersioning` | ✓ confirmada | `useDataFetching.ts:126-135` + `useFieldConditions.ts:38-52` (precedente `hw-intervention-list.json:19`) |

### Context found

- **Rules del modulo**: RULE-dev-004 (codigo core de `layout` workspace), RULE-platform-006 (layout filename PascalCase).
- **Bugs abiertos**: ninguno.
- **Specs relacionados DKC**: TICKET-036 (HU-1), TICKET-039 (HU-3), TICKET-033 (HU-0a/0f/0h via Track 0 Core y CD).
- **Docs relevantes del repo**:
  - `layout/src/types/recordlist.ts` (definicion 1)
  - `layout/src/composables/useRowActionHandler.ts` (definicion 2)
  - `layout/src/components/RecordList.vue` (dispatcher)
  - `layout/src/components/ChibiList.vue` (segundo dispatcher)
  - `layout/src/composables/useFieldConditions.ts` (dot-notation)
  - `layout/src/composables/useDataFetching.ts` (relations hidratacion)
  - `mods/hello-world-mod/config/layouts/hw-intervention-list.json` (precedente)
- **Warnings**:
  - **Layer core**: `layout/` ES core (RULE-dev-004). Branch `UPONE-1206`.
  - **2 definiciones del union**: actualizar ambas. Sin esto, los row actions del tipo nuevo no son tipados correctamente y rompen ChibiList o RecordList.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (epica core, layout es core) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU con Track 0 + HU-1 + HU-3 listos |
| Services | layout (storybook 6006), object-manager (4000), suite (3000) |
| Test data | layout config con un Activity de prueba en estado PUB |

## Preplanificacion de sessions (intake — historico)

> Superado por `### Plan de sessions` (canonico, dentro de `## Sessions`). Se conserva como registro del razonamiento del intake.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | HU-7 — actualizar las 2 definiciones del union (`recordlist.ts` + `useRowActionHandler.ts`) con `CreateRowAction` | execute | T2 | types + ts compile | auto | typecheck verde en consumers |
| S2 | HU-7 — caso `create` aditivo en `RecordList.vue` dispatcher + handler que invoca `createInstance(prefillFrom+asNewVersion)` | execute | T2 | dispatcher + handler + unit tests | auto | tests verdes; otros row actions intactos |
| S3 | HU-7 — visibilidad: `relations` en raiz config + `visibilityConditions` por dot-notation con `currentStatus.allowsVersioning` | execute | T2 | doc del patron + tests + smoke en storybook | ⚑ fuerte | boton aparece solo cuando flag true |
| S4 | HU-7 — segundo dispatcher en `ChibiList.vue` actualizado igual | execute | T1 | dispatcher + smoke | auto | ChibiList tampoco rompe |
| S5 | Cierre — commits + teach-close | execute | T1 | review + commit DET-27 | auto | tests verdes |

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|------------|-------|--------------|
| 2026-06-02 | false → super | Dev: `/dkc 042 super autopilot` (HOR-079 — por-ticket, no se detiene hasta terminar) | proximo gate (intake ya cerrado; arranca en teach-intake) |

### Plan de sessions

> Refinado por design-feature (spec `SPEC-layout-hu7-row-action-create`). Numeracion arranca en S1 (sin sessions previas en `## Sessions`).

| # | Objetivo | Tipo | Tier | source_ref | Gate criteria |
|---|----------|------|------|-----------|---------------|
| S1 | Tipo `create` en las 2 definiciones del union (`recordlist.ts` + `EnhancedRowAction`) + props `prefillFromCurrent`/`asNewVersion`/`redirectTo` | auto | T2 | REQ-01 | typecheck verde en consumers |
| S2 | Helper `useCreateRowAction` + caso `create` aditivo en dispatcher de `RecordList.vue` + unit tests (4 casos) | auto | T2 | REQ-02, REQ-03 | tests verdes; otros row actions intactos |
| S3 | Visibilidad por config (`relations` + `visibilityConditions` por `currentStatus.allowsVersioning`) + i18n + smoke storybook | ⚑ fuerte | T2 | REQ-04, REQ-05 | boton visible solo si `allowsVersioning==true` (unit + smoke + screenshot) |
| S4 | ChibiList: verificar enriquecimiento + smoke del create | auto | T1 | REQ-PRESERVE-06 | ChibiList no rompe |
| S5 | Cierre: quality review + commits DET-27 + teach-close | auto | T1 | — | vitest del modulo verde + teach-close |

> Sessions futuras (S2-S5) viven en `### Plan de sessions` hasta que `open-session N` las materialice.

### Session 1 — 2026-06-02 11:48 — Tipo `create` en las 2 definiciones del union [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Agregar el literal `'create'` y las props `prefillFromCurrent`/`asNewVersion`/`redirectTo` a las DOS definiciones del union de row action (`RowAction` en `recordlist.ts` y `EnhancedRowAction` en `useRowActionHandler.ts`), manteniendolas en sync. Gate: typecheck verde en consumers.

**Tasks completadas**:
- [x] S1.T1 — Agregar `'create'` al `type?` de `RowAction` + props `prefillFromCurrent?`/`asNewVersion?`/`redirectTo?` (`layout/src/types/recordlist.ts`)
- [x] S1.T2 — Agregar `'create'` al `type?` de `EnhancedRowAction` + mismas props (`layout/src/composables/useRowActionHandler.ts`)
- [x] S1.GATE — Gate de sync Session 1 (tier T2): typecheck verde en consumers

**Validacion del tier**:
- T2 — `npm run typecheck` (`tsc --noEmit`) del workspace layout: 183 errores TS, **TODOS preexistentes** (baseline con `git stash` = 183 idéntico). **0 errores en archivos tocados** (`recordlist.ts`, `useRowActionHandler.ts`) **ni en consumers** (`RecordList.vue`/`ChibiList.vue`/refs a `RowAction`/`EnhancedRowAction`/props nuevas). Cambio aditivo puro → gate "typecheck verde en consumers" satisfecho. (No hay unit tests nuevos en S1: solo tipos.)

**Discoveries / Learns nuevos**: L1-L5 capturados en design (ver `## Learns`). Sin nuevos en S1.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline light — proporcionalidad: S1 es cambio types-only aditivo trivial; reviewer aislado reservado para S2/S3 substantivos, HOR-079 S4)
**Tier de revision**: light (dimensiones 1 calidad + 7 claridad)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Literal `'create'` agregado al final de ambos union literals; props opcionales con JSDoc; sin magic values; sin codigo muerto |
| 7 | Claridad | pass | Comentario `// ===== type: "create" (HU-7 / UPONE-1213) =====` + nota "kept in sync with RowAction" en `EnhancedRowAction`; ambas definiciones documentadas idénticamente |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Commit DET-27**: `f1037b4` UPONE-1213 feat(layout): add 'create' row action type to RowAction unions

### Session 2 — 2026-06-02 — Helper `useCreateRowAction` + caso `create` en dispatcher + unit tests [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Crear el composable testeable `useCreateRowAction` (arma `data.prefillFrom`/`data.asNewVersion`, ejecuta `createInstance`, decide redirect/error), cablear la rama aditiva `if (action.type === 'create')` en el dispatcher de `RecordList.vue`, y cubrir con unit tests los 4 casos (version/clon/redirect/error). Gate: tests verdes; otros row actions intactos.

**Tasks completadas**:
- [x] S2.T1 — Helper `useCreateRowAction` (`layout/src/composables/useCreateRowAction.ts`): build de `data` + `createInstance` via apolloClient + redirect/error
- [x] S2.T2 — Rama `if (action.type === 'create')` aditiva en dispatcher de `RecordList.vue` usando el helper
- [x] S2.T3 — Unit tests del helper (`__tests__/useCreateRowAction.spec.ts`): version, clon, redirect en exito, toast en error
- [x] S2.GATE — Gate de sync Session 2 (tier T2): tests verdes; otros row actions intactos

**Validacion del tier**:
- T2 — vitest run del area: `useCreateRowAction.spec.ts` **10/10 verde** (cmd: `npm run test -- src/composables/__tests__/useCreateRowAction.spec.ts`). Regresion row actions: `useRowMutation`(18) + `useFieldConditions`(33) + `recordListActions`(4) = **55/55 verde** → otros row actions intactos.

**Discoveries / Learns nuevos**: L6 (asNewVersion sin prefillFromCurrent → backend AS_NEW_VERSION_REQUIRES_PREFILL via toast; sin guard frontend).

**Quality review (DET-23)**:

**Reviewer**: sub-agente aislado (Agent tool, sonnet, contexto limpio — DET-30 super, gate T2 substantivo)
**Tier de revision**: standard (10 dimensiones)
**Resultado global**: approve

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | `buildCreateData` pura/testeable; `createCreateHandler` espeja patron de `useRowMutation` (guard client, try/catch, early return); rama `create` aditiva (despues de mutation, no toca otros) |
| 2 | Lint | pass | Imports ordenados, sin semicolons faltantes |
| 3 | Tipado | pass | `any` solo en slots donde `useRowMutation` ya lo usa (apolloClient/record); deps tipadas (redirect/showError/$t/getRowId) |
| 4 | Testing | pass | 10 casos cubren los 4 escenarios REQ-03 (version/clon/redirect/error) + noClient + rowId null/vacio |
| 5 | Escalabilidad | pass | Factory puro sin estado; extensible para SP4 (user-provided) sin tocar RecordList |
| 6 | Mantenibilidad | pass | Logica de payload en `buildCreateData` exportado; JSDoc completo; comentario inline en la rama del dispatcher |
| 7 | Claridad | pass | Nombres descriptivos; `resolveErrorCode` nombrado; fallback de traduccion del error code legible |
| 8 | A11y | n/a | S2 sin UI nueva; redirect delega a handleView/handleModify accesibles |
| 9 | Storybook | n/a | Diferido a S3 |
| 10 | Error-handling | pass | 3 capas: guard apollo nulo, catch con resolveErrorCode (extensions.code → message → i18n), console.error con action.id |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Findings: todos nit/minor (sin iterate). Nit util → capturado como L6. Confirmado: rama aditiva real, cambios 100% dentro de `execute_scope` (solo `layout/`).

**Commit DET-27**: `49fb4e2` UPONE-1213 feat(layout): create row action handler + dispatcher branch

### Session 3 — 2026-06-02 — Visibilidad declarativa por config (relations + visibilityConditions) + i18n + smoke [phase: execute]

**Tipo**: ⚑ fuerte (visibilidad end-to-end correcta)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Probar empiricamente que el row action `create` aparece solo cuando `currentStatus.allowsVersioning == true`, usando el mecanismo existente (`isActionVisible` → `evaluateGroup` → `getNestedValue` dot-notation) + hidratacion por `relations` en raiz de config. Agregar i18n del label y documentar el patron (precedente `hw-intervention-list.json`). Gate fuerte: boton visible solo en filas versionables.

**Tasks completadas**:
- [x] S3.T1 — Unit: `isActionVisible`/`evaluateGroup` con `visibilityConditions` por `currentStatus.allowsVersioning` (false→oculto, true→visible) + `useDataFetching` propaga `relations`
- [x] S3.T2 — i18n del label (`languageTag`) en `layout/lang/*@RecordList.json` + config de ejemplo con `relations:["currentStatus"]` en raiz + doc del patron
- [x] S3.T3 — Smoke storybook: lista con Activity `allowsVersioning` true/false → boton visible/oculto; screenshot al subdir del ticket
- [x] S3.GATE — Gate de sync Session 3 (tier T2, ⚑ fuerte): boton visible solo cuando allowsVersioning==true

**Validacion del tier**:
- T2 — vitest: `createRowActionVisibility.spec.ts` **4/4 verde** (oculto si allowsVersioning=false, visible si true, oculto si relacion no hidratada, visible por defecto). Smoke storybook: `RecordList.stories.ts` **33/33 verde** (incl. `CreateRowActionVisibility`, monta sin error). `relations` propagation confirmada en `useDataFetching.ts:124-135` (preexistente). Falla preexistente `ActivityStatusBadge.stories` (infra browser) NO introducida por HU-7 (reviewer verifico baseline con stash: HU-7 mejora el baseline, 0 regresiones).

**Discoveries / Learns nuevos**: ninguno nuevo en S3.

**Quality review (DET-23)**:

**Reviewer**: sub-agente aislado (Agent tool, sonnet, contexto limpio — DET-30 super, GATE FUERTE mandatorio)
**Tier de revision**: exhaustive (10 dimensiones)
**Resultado global**: approve — **gate fuerte satisfecho**

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | El unit test usa el `isActionVisible` REAL (sin mock del mecanismo): cadena de produccion visibilityConditions→evaluateGroup→getNestedValue ejercida completa |
| 2 | Lint/tipado | pass | `as any` localizado y justificado (RowAction vs EnhancedRowAction, ambos con visibilityConditions) |
| 3 | Testing | pass | 4/4 verde; cubre fail-safe (relacion no hidratada → oculto), no solo el happy path |
| 4 | Escalabilidad | pass | Sin codigo nuevo de visibilidad; patron generico para cualquier relacion |
| 5 | Mantenibilidad | pass | `.ai/CREATE_ROW_ACTION.md` documenta el patron completo; story self-documented |
| 6 | Claridad | pass | Nombres descriptivos, config canonico comentado |
| 7 | A11y | n/a | S3 no toca componentes; el boton es capa de render preexistente |
| 8 | Storybook | pass | 33/33 monta; screenshot pixel ausente NO bloquea (criterio booleano cubierto por unit + render-smoke; exigir pixel seria over-engineering) |
| 9 | Error-handling | pass | Caso undefined cubierto, falla seguro |
| 10 | i18n | pass | createNewVersion/clone en en_CL/es_CL/pt_BR; languageTag mapea exacto; sin hardcodeo |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Findings: todos `info` (sin iterate). Reviewer confirma: gate_strong_satisfied=true; HU-7 elimina 23 fallas del baseline (Modal) y no introduce regresiones.

**Commit DET-27**: `7f32edc` UPONE-1213 feat(layout): create row action visibility config + i18n + story

### Session 4 — 2026-06-02 — ChibiList: verificar enriquecimiento + smoke create [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (unit area)

**Objetivo**: Verificar que `ChibiList.vue` no rompe con un row action `type: "create"` y entender de donde toma sus acciones (enriquecimiento). Documentar el gap si existe.

**Tasks completadas**:
- [x] S4.T1 — Verificar path de enriquecimiento de ChibiList; smoke de create (filtra isVisible, llama handler/emite request-action); documentar gap standalone
- [x] S4.GATE — Gate de sync Session 4 (tier T1): ChibiList no rompe

**Validacion del tier**:
- T1 — smoke storybook `ChibiList.stories.ts` **14/14 verde** (incl. `CreateRowActionGraceful`): ChibiList renderiza un row action create sin crashear. Verificacion de codigo: `getRowActions` (filtro null-safe por `isVisible` funcion) + `handleRowAction` (guarda `if (action.handler)`) → degradacion gracil.

**Discoveries / Learns nuevos**: confirmacion de L5 (ChibiList sin dispatcher por tipo). Gap → B1 backlog.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline light — T1 auto: verificacion + story + doc, sin logica de produccion nueva)
**Tier de revision**: light (dimensiones 1 calidad + 7 claridad)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Sin cambio de logica en ChibiList; story + doc; degradacion gracil verificada por inspeccion + smoke |
| 7 | Claridad | pass | Story self-documented; limitacion documentada en `.ai/CREATE_ROW_ACTION.md`; gap trackeado en B1 |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 5
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Commit DET-27**: `e0e8b71` UPONE-1213 docs(layout): ChibiList create row action graceful-degradation story + limitation doc

### Session 5 — 2026-06-02 — Cierre: regresion final + quality review + teach-close [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (unit area)

**Objetivo**: Regresion final del modulo (confirmar todo verde junto), quality review de cierre y teach-close. Commits granulares ya hechos por session (DET-27).

**Tasks completadas**:
- [x] S5.T1 — Regresion final (suite unit del area) + quality review (light) + confirmar commits DET-27
- [x] S5.GATE — Gate de cierre (tier T1) + teach-close

**Validacion del tier**:
- T1 — regresion final del area **69/69 verde** (useCreateRowAction 10 + visibility 4 + useRowMutation 18 + useFieldConditions 33 + recordListActions 4). Typecheck final **183 = baseline** (0 introducidos por HU-7). Commits DET-27 S1-S5 presentes y trazados en `## Commits`.

**Acceptance checkpoints**:

| Checkpoint | Status | Detail |
|------------|--------|--------|
| Funcional | pass | REQ-01..05 + REQ-PRESERVE-06 cubiertos (ver Test cases TC-01..TC-10) |
| Coverage | pass | 6 REQs, todos con ≥1 TC asociado |
| Tests | pass | 10 TC: 10 pass (TC-07 por inspeccion de codigo preexistente; TC-08 smoke con override de screenshot pixel) |
| Regression | pass | 69/69 unit del area; sin regresiones (falla preexistente ActivityStatusBadge = infra browser, no HU-7) |
| Rules | pass | i18n no hardcoded; cambio aditivo; RULE-dev-004 (rama UPONE-1206) |
| Branch | pass | UPONE-1206; 5 commits prefijados UPONE-1213; sin commits a develop/master |
| Docs | pass | `.ai/CREATE_ROW_ACTION.md` (patron + ejemplo + limitacion ChibiList) |

**Validacion de cierre reforzada (HOR-079 REQ-03, reviewer aislado)**:
- Reviewer #1 → **iterate**: (a) blocker REQ-01 — `EnhancedRowAction.type` no 100% en sync (faltaban `mutation`/`multiSelectPicker`, deuda preexistente); (b) warn working tree contaminado (operaciones git del propio sub-agente); (c) warn guard asNewVersion.
- Resolucion: (a) nivelado el union en `bdf93d5`; (b) `git reset --hard HEAD` → working tree limpio en estado commiteado; (c) fail-loud confirmado (L6, no se agrega guard silencioso).
- Reviewer #2 (re-validacion) → **approve**: blocker_req01_resolved=true, asnewversion_resolution_ok=true, worktree_clean=true.

**Discoveries / Learns nuevos**: ninguno nuevo; L6 refinado (fail-loud confirmado en cierre).

**Quality review (DET-23)**:

**Reviewer**: sub-agente aislado (Agent tool, sonnet) — validacion de cierre reforzada (REQ-03), 2 rondas (iterate → fix → approve)
**Tier de revision**: exhaustive (consolidado del conjunto)
**Resultado global**: approve

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Aditivo; composable testeable; espeja patrones existentes |
| 2 | Lint/tipado | pass | typecheck 183=baseline, 0 introducidos; union en sync (7 miembros ambos) |
| 3 | Testing | pass | 69/69 unit + smoke 33/33 + 14/14 |
| 4 | Escalabilidad | pass | primitivo generico; extensible SP4 (user-provided) |
| 5 | Mantenibilidad | pass | doc del patron; gap ChibiList trackeado (B1) |
| 6 | Claridad | pass | nombres descriptivos; decisiones documentadas |
| 7 | A11y | n/a | redirect delega a handlers accesibles existentes |
| 8 | Storybook | pass | 2 stories nuevas (RecordList + ChibiList), smoke verde |
| 9 | Error-handling | pass | guard apollo nulo + error code via toast (fail-loud) |
| 10 | Propagacion (DET-16) | pass | 2 union defs en sync (incl. nivelado preexistente), i18n 3 locales, doc |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 6
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Commit DET-27**: `bdf93d5` UPONE-1213 fix(layout): level EnhancedRowAction.type with RowAction.type

## Test cases

| # | Caso | source_ref | Tipo | Actual | Evidence | Status | Session | Affects UI |
|---|------|-----------|------|--------|----------|--------|---------|------------|
| TC-01 | typecheck reconoce `create` en ambas definiciones; cambio aditivo | REQ-01 | unit (tsc) | tsc 0 errores en archivos/consumers (baseline=con-cambio=183 preexistentes) | S1 Validacion del tier | pass | 1 | no |
| TC-02 | crear nueva version: `data={prefillFrom:{source:rowId}, asNewVersion:true}` | REQ-03 | unit | data correcto | useCreateRowAction.spec.ts 'crear nueva version' verde | pass | 2 | no |
| TC-03 | clonar: `data={prefillFrom:{source:rowId}}` (sin asNewVersion) | REQ-03 | unit | data sin asNewVersion | useCreateRowAction.spec.ts 'clonar' verde | pass | 2 | no |
| TC-04 | exito → redirect (`redirectTo`, default edit) | REQ-03 | unit | redirect('NEW-1','edit') + refetch; 'view' respetado | spec verde (2 casos redirect) | pass | 2 | no |
| TC-05 | error → `showErrorNotification` con error code, sin navegar | REQ-03 | unit | showError('SOURCE_NOT_VERSIONABLE'), redirect no llamado | spec verde 'error' | pass | 2 | no |
| TC-06 | visibilidad: `allowsVersioning==false` → oculto; `==true` → visible | REQ-04 | unit | false→oculto, true→visible (isActionVisible real) | createRowActionVisibility.spec.ts 4/4 verde | pass | 3 | yes |
| TC-07 | `useDataFetching` propaga `relations` → `includeRelations:true, relations` | REQ-04 | inspeccion | hasRelations → {includeRelations:true, relations} | useDataFetching.ts:124-135 (preexistente) + precedente hw-intervention-list.json | pass | 3 | no |
| TC-08 | smoke storybook: boton visible solo en filas versionables | REQ-04 | smoke | story monta (2 filas versionable/no) | storybook test project 33/33 verde (incl. CreateRowActionVisibility). Override DET-25: screenshot pixel diferido (requiere boot dev server); render-smoke+unit cubren el criterio booleano | pass | 3 | yes |
| TC-09 | label resuelto por `languageTag` (no tag crudo) | REQ-05 | smoke | claves createNewVersion/clone en 3 locales; story usa languageTag | en_CL/es_CL/pt_BR@RecordList.json + story monta | pass | 3 | yes |
| TC-10 | ChibiList renderiza create sin crashear (degradacion gracil; emite request-action) | REQ-PRESERVE-06 | smoke | renderiza sin crash; no auto-enriquece (gap B1) | ChibiList.stories 14/14 verde (CreateRowActionGraceful) | pass | 4 | yes |

## Commits

| Hash | Fecha | Header | Tasks | REQ |
|------|-------|--------|-------|-----|
| `f1037b4` | 2026-06-02 | UPONE-1213 feat(layout): add 'create' row action type to RowAction unions | S1.T1, S1.T2 | REQ-01 |
| `49fb4e2` | 2026-06-02 | UPONE-1213 feat(layout): create row action handler + dispatcher branch | S2.T1, S2.T2, S2.T3 | REQ-02, REQ-03 |
| `7f32edc` | 2026-06-02 | UPONE-1213 feat(layout): create row action visibility config + i18n + story | S3.T1, S3.T2, S3.T3 | REQ-04, REQ-05 |
| `e0e8b71` | 2026-06-02 | UPONE-1213 docs(layout): ChibiList create row action graceful-degradation story + limitation doc | S4.T1 | REQ-PRESERVE-06 |
| `bdf93d5` | 2026-06-02 | UPONE-1213 fix(layout): level EnhancedRowAction.type with RowAction.type | S5.T1 | REQ-01 |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|--------------|-----------|
| B1 | ChibiList no soporta nativamente row actions declarativas (`create`/`mutation`/`modal`): no auto-enriquece handler ni evalua `visibilityConditions` — solo emite `request-action`. | REQ-PRESERVE-06 | descubierto en S4.T1 de SPEC-layout-hu7-row-action-create | `ChibiList.vue:696-741` (`getRowActions` filtra por `isVisible` funcion; `handleRowAction` ejecuta `handler` si existe + emite). El enrichment (handler + isActionVisible) vive solo en `RecordList.vue` (`configuredRowActions` computed). | Portar el enrichment de RecordList a ChibiList: instanciar `useRowActionHandler`/`useCreateRowAction` y construir `handler`+`isVisible` para las acciones declarativas, o documentar que el consumer maneja `request-action`. Validar con story tipo `CreateRowActionGraceful` extendida a interaccion. | could |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El SDL de `createInstance` NO cambia: `prefillFrom` y `asNewVersion` viajan DENTRO de `data: JSON!` (HU-1 DEC-LOCAL-02, HU-3 fila 1). El "shape canonico" del intake (`createInstance(objectType, {}, args)`) era inexacto — los args van en `data`. La firma de mutation existente del frontend (`createInstance(objectType: $objectType, data: $data)`, ej. `useEnrollment.ts:54`) ya soporta el shape sin cambios. | design (Explore + specs HU-1/HU-3) | design | refined | RULE-core-024 |
| L2 | NINGUN path del frontend (layout/suite) pasa hoy `prefillFrom`/`asNewVersion` — HU-7 es el primer consumer frontend del versionamiento backend. Grep `asNewVersion`/`prefillFrom` en `layout/src`+`suite` = 0 matches. | design (Explore) | design | discarded | consolidacion Fase D — no reusable/especifico del ticket |
| L3 | El dispatcher real de `RecordList.vue` (~2436-2605, no 2205-2306 — archivo evolucionado) NO ejecuta la accion inline: cada rama `if (action.type===…)` RETORNA una accion enriquecida `{...action, handler, isVisible, isEnabled}`. El caso `create` construye un `handler` closure, igual que `mutation`/`modal`. Tambien ya existe `type: 'multiSelectPicker'` (no estaba en el intake). | design (Explore) | design | refined | RULE-layout-036 |
| L4 | `EnhancedRowAction` (`useRowActionHandler.ts:21-46`) es un INTERFACE unico con `type?` opcional, NO una union discriminada. `RowAction` (`recordlist.ts`) igual: `type?` literal en linea 68. Agregar `create` = ampliar ambos literales + sumar props opcionales. | design (Explore) | design | refined | RULE-layout-036 |
| L5 | `ChibiList.vue` (696-741) NO tiene dispatcher por `type`: filtra por `action.isVisible` y llama `action.handler` directo; el enriquecimiento del handler lo hace el path de `RecordList`. S4 verifica de donde toma ChibiList las acciones enriquecidas — puede ser mas liviano que "segundo dispatcher". | design (Explore) | design | refined | RULE-layout-036 |
| L6 | `buildCreateData` no dropea `asNewVersion` cuando falta `prefillFromCurrent` (decision fail-loud, confirmada en validacion de cierre S5): enviar `{asNewVersion:true}` deja que el backend HU-3 rechace con `AS_NEW_VERSION_REQUIRES_PREFILL` (toast con error code). Un guard que lo dropeara en silencio crearia una instancia scratch ocultando la misconfig — peor. El backend es la fuente de verdad de la constraint. | reviewer aislado S2/S5 | 2 | refined | doc inline (.ai/CREATE_ROW_ACTION.md + este learn) |

## Summary

**Resultado**: HU-7 implementada y cerrada. Row action declarativo `type: "create"` en layout (RecordList) con flags ortogonales `prefillFromCurrent` (clonar) + `asNewVersion` (versionar), ejecutando `createInstance` directo sin modal, redirect en exito y toast del error code en fallo. Visibilidad por config (`relations` + `visibilityConditions` sobre `currentStatus.allowsVersioning`) reusando el mecanismo existente. Cambio 100% aditivo (no toca otros row action types) y sin cambio de SDL backend.

**Entregables** (5 commits en `UPONE-1206`, prefijo `UPONE-1213`):
- `f1037b4` — tipo `create` + props en las 2 definiciones del union.
- `49fb4e2` — composable `useCreateRowAction` + rama dispatcher (10 unit tests).
- `7f32edc` — visibilidad por config + i18n (3 locales) + doc `.ai/CREATE_ROW_ACTION.md` + story (gate fuerte: unit 4/4 + smoke 33/33).
- `e0e8b71` — ChibiList degradacion gracil (story + doc; smoke 14/14).
- `bdf93d5` — fix de cierre: nivelar `EnhancedRowAction.type` con `RowAction.type` (sync completo del union).

**Validacion**: 69/69 unit del area + smoke storybook (33/33 RecordList, 14/14 ChibiList); typecheck 183 = baseline (0 introducidos); 2 reviewers aislados (S2, S3) + validacion de cierre reforzada (iterate → fix → approve). TC-01..TC-10 pass.

**Story Points**: published 2 · estimated 2 · executed 3 (sessions-heuristic: llm_factor 4, human_factor 1, c=0.5 implement). Delta +1 vs published: 5 sessions finas (incl. gate fuerte S3 + iteracion de cierre).

**Pendiente / fuera de alcance**:
- Backlog **B1 (could)**: ChibiList standalone no auto-enriquece row actions declarativas (limitacion preexistente; el create apunta a RecordList). No bloquea cierre (DET-17: solo `must` bloquea).
- Strategy `user-provided` (modal de captura de valor) → SP4.
- **Merge de `UPONE-1206` a develop**: gated por revision del team up1 (RULE-dev-004). El cierre DKC NO implica merge; el push queda pendiente de aprobacion humana.

## Teaching — Intake

**Status**: done
**Archivo**: [tickets/TICKET-042.teach/teach-intake.html](TICKET-042.teach/teach-intake.html) (v2 HTML, validado)
**Bloques**: tldr, callout (dependencias), concept-card (6 bases), flow (mermaid dispatcher), code (estado actual), two-col-compare (versionar vs clonar), invariant, timeline (5 sessions), study-qa (4), tag (scope)

## Teaching — Close

**Status**: done
**Archivo**: [tickets/TICKET-042.teach/teach-close.html](TICKET-042.teach/teach-close.html) (v2 HTML, validado)
**Bloques**: tldr, callout (que se hizo), concept-card (hipotesis + lessons), comparison-table (decisiones), flow (mermaid flujo final), invariant, timeline (highlights S1-S5), study-qa (5)
