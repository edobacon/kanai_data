---
id: TICKET-069
project: up1
type: ticket
status: closed
work_type: fix
module: curriculum-design
autopilot: manual
---

# Fix: picker de dueño polimórfico (ownerType/ownerId) de Curriculum no rellena/resetea/resuelve label

> Follow-up del TICKET-063 (vista v2 de `Curriculum`). El picker de owner polimórfico (`ownerType`/`ownerId`) construido con el composable `useOwnerIdOptions` + `autoPopulate` tiene 3 bugs de runtime reportados por el dev al usar la vista en UPU (post-TICKET-068, ya sirviendo v2).

## Request

(reporte del dev, textual) "necesito revisar el funcionamiento de los inputs de tipo de dueño y dueño. Al crear, dueño nunca se rellena, y es necesario para poder crear el curriculum. En editar, aparece el id y no el nombre, además aparece con un texto (removed) que no sé a qué viene. Y si cambio entre programa o institución como tipo de dueño, el dueño se mantiene sin cambio."

## Classification

| Campo | Valor |
|-------|-------|
| work_type | fix |
| change_type | multi (composable del mod + config de layout + posible engine layout core) |
| Módulo principal | curriculum-design (vista) + layout-engine (RecordDetail.vue autoPopulate) |
| layer | mod (composable + config; se sincroniza) + posible toque **core** en `layout/src/layouts/RecordDetail.vue` (RULE-dev-004 → rama de épica del layout) |

## Reproduction steps

| # | Síntoma | Pasos | Esperado | Actual |
|---|---------|-------|----------|--------|
| R1 | create: dueño no se llena | Abrir crear Curriculum (UPU) → elegir Tipo de dueño | el picker Dueño se puebla con opciones del objeto elegido | el dropdown queda vacío → no se puede elegir dueño → no se puede crear (es required) |
| R2 | edit: id + "(removed)" | Abrir editar un Curriculum existente | Dueño muestra el nombre del programa/institución | muestra el id crudo + texto "(removed)" |
| R3 | cambio de tipo no resetea dueño | En crear/editar, cambiar Tipo de dueño Programa↔Institución | el dueño se limpia (o re-valida contra el nuevo tipo) | el id viejo (de otro objeto) queda pegado |
| R4 | create Plan: validación falla en `progression` | Crear Curriculum → Tipo = `Plan` → completar campos base → Guardar | el Plan se crea | modal de error: **«La información proporcionada no es válida. Ubicación: > Progression. Por favor, revisa los campos resaltados y corrige los errores.»** — bloquea el guardado. **✅ CONFIRMADO (repro red 2026-06-17): el POST `CreateInstance` falla porque `prisma.curriculum.create()` recibe los campos del RT Plan que no son columnas de la base — ver RC en el triage** |
| R5 | view (detalle): dueño sale como id | Abrir el detalle (view) de un Plan | Dueño muestra el nombre del programa/institución | muestra el **id crudo**. Causa: en `default_Curriculum_view.json` el campo `ownerId` es `type:"text"` (renderiza el valor literal) y `relationDisplayFields` solo cubre `Institution` (no el FK polimórfico, que apunta a AcademicProgram o Institution según `ownerType`). Misma raíz que R2 (edit) pero en view: no hay resolución de label para el FK polimórfico fuera del select editable con `autoPopulate`. **✅ RESUELTO (2026-06-17)**: `ownerId` del view pasó de `type:"text"` a `select` + `autoPopulate` + `useOwnerIdOptions` (mismo patrón que edit/R2); `autoPopulate` corre en view y resuelve el label. Sync OK (`SYNC_AUTO_APPLY_SCHEMA=false`). Verificado: Dueño muestra "Ingenieria Civil" (no el cuid) — screenshot `TICKET-069-view-R5-FIXED.png`, red `ListInstancesForOwner 200` |

> **Repro 2026-06-17 (Playwright + auth dev, rol Admin, suite :3000):**
> - **R1/R2/R3 resueltos** — el picker funciona: al elegir Tipo de dueño corre `ListInstancesForOwner` y se elige el dueño; el fix del composable (`{items,value}`) está activo en la suite. (Coincide con los screenshots `-FIXED` del 2026-06-16.)
> - **R5 confirmado** — en el view del Plan, `Dueño = cmqh1zkh800p5xxgapw41yhfu` (id crudo), mientras `Institución` sí resuelve nombre. Screenshot `TICKET-069-view-R5.png`.
> - **R4 confirmado con causa raíz nueva (RC)** — NO era H4 (tipo) ni H5 (conditions): el create envía los campos del RT a la tabla base. Evidencia: payload de red capturado.

## Context found

- **Picker composable**: `mods/curriculum-design/modsComposables/useOwnerIdOptions.ts` — `getOptionsByOwnerType(apolloClient, fieldValues)` consulta `listInstances(name, limit:200)` y devuelve **array plano** `[{value:id, label:name}]`. Catch silencioso → `[]` ante error (oculta fallos de query).
- **Config**: `mods/curriculum-design/config/layouts/default_Curriculum_{create,edit}.json` — `ownerId` es `select` con `items:[]` + `autoPopulate` (`triggerOnMount:true`, `populateItems:true`, `watchFields:["ownerType"]`). `ownerType` es `select` enum (Plan/Minor… no, AcademicProgram/Institution) derivado del schema.
- **Motor**: `layout/src/layouts/RecordDetail.vue:747` `setupAutoPopulationWatcher`. Claves:
  - `populateItems` setea `currentSchema[field].items` pero **solo setea el VALOR del campo si el composable devuelve `{items, value}` estructurado** (`valueData`); con array plano `valueData=null` → nunca toca `ownerId` (`RecordDetail.vue:830-869`).
  - `triggerOnMount` corre `executePopulation` en `nextTick`; el `watch` (`:900`) es sin `immediate` → no dispara para el valor inicial cargado.
- **Campos Plan-only condicionales (R4)**: `progression`, `totalCredits`, `totalPeriods`, `periodType` declaran `conditions: [["recordType", "==", "Plan"]]` en `default_Curriculum_{create,edit,view}.json`. `progression` es el **primero** del grupo. En el RecordType `objects/RecordTypes/rt__Plan__curriculum.json`: `progression` es `string`/`not_null:false` (no required, sin enum); `totalCredits`/`totalPeriods` son **`integer`** pero el layout los declara `type:"text", inputType:"number"` (mismatch: el form emite string); `periodType` es enum.
- **No hay `validationRules` de fórmula para Curriculum** (grep vacío en mod + suite) → el error de R4 NO proviene de `validateAllFields`/`validateField` del engine (esas formulas no existen para este objeto). `validateField` además **no respeta `conditions`** — evalúa la regla aunque el campo esté condicionalmente oculto (`RecordDetail.vue:1206-1243`).

## Triage — hipótesis de causa raíz

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | **R3 (no resetea)**: el motor solo limpia/setea `ownerId` con retorno estructurado `{items,value}`; el composable devuelve array plano → `valueData=null` → `ownerId` nunca se limpia al cambiar `ownerType` | confirmed (código) | `RecordDetail.vue:835` (`valueData = isStructuredResult ? result.value : null`) + `:862` (solo update si `valueData!=null`); composable retorna array |
| H2 | **R2 (id+removed)**: carrera de mount en edit — `executePopulation` (nextTick) lee `ownerType` antes de que el valor del record esté en `el$` → `[]` → `ownerId` existente no está en `items` → Vueform muestra id + "(removed)"; el `watch` sin `immediate` no cubre el valor inicial | confirmed (código) | `RecordDetail.vue:890-902` (triggerOnMount nextTick + watch sin immediate); "(removed)" = label Vueform para value∉items |
| H3 | **R1 (create no llena)**: NO es la query — `listInstances(name:"AcademicProgram")` **devuelve 5 items** (repro Playwright, red 200). El `ownerType` arranca con `static_default="AcademicProgram"` del objeto → la query dispara y trae los 5 programas. Causa raíz: los items **no se bindean** al select (mismo path `populateItems`/reactividad del engine que H1/H2). Descartada la hipótesis de query/auth fallida | confirmed (repro) | repro PW: `GQL: [...{"name":"AcademicProgram","items":5}...]`; query OK con rol Admin |
| H4 | **R4 — tipo `integer` enviado como string (más probable)**: `totalCredits`/`totalPeriods` son `integer` en `rt__Plan__curriculum.json` pero el layout los declara `type:"text"` → al guardar un Plan el form emite `""`/`"5"` (string). El backend (createInstance del RT Plan) rechaza el payload por tipo y el cliente muestra el modal genérico anclando la `location` al **primer campo del bloque RT Plan = `progression`** (de ahí que culpe a Progression aunque el campo malo sea otro). El uso del `title` inglés confirma que el error viene del schema backend, no del layout | **descartada** (ver RC) | el caret de Prisma marca `progression` como *Unknown argument*, no type-error; los strings de `totalCredits` son un problema secundario |
| H5 | **R4 — `conditions` en create-mode** (alternativa) | **descartada** (ver RC) | el error es del backend (POST), no validación cliente |
| **RC** | **R4 — CAUSA RAÍZ CONFIRMADA: los campos del RecordType Plan se envían a la tabla BASE.** `createInstance` arma `prisma.curriculum.create({ data })` incluyendo `progression`/`totalCredits`/`totalPeriods`/`periodType`, que son campos del RT `rt__Plan__curriculum` (tabla de extensión 1:1, NO columnas de `curriculum` — ver RULE-mods-045). Prisma falla con *Unknown argument `progression`* (primer campo RT, subrayado con `~~~`) → el cliente muestra «…no es válida. Ubicación: > Progression». Los 4 campos Plan-only deben rutearse a `rt__Plan__curriculum`, no a la base. Secundario: `totalCredits`/`totalPeriods` viajan como `"1"` (string) pese a ser `integer` — aflora una vez corregido el ruteo | **confirmed (repro red 2026-06-17, rol Admin)** | payload capturado: `Invalid prisma.curriculum.create() invocation { data:{ …, progression:"ext", ~~~ totalCredits:"1", totalPeriods:"1", periodType:"Semester", institution:{connect} } }` → `CreateInstance 200` con `errors` |

**Hallazgos del repro en vivo (Playwright + auth del dev, 2026-06-16):**
- **RBAC**: el rol activo `Consultor` NO puede crear Curriculum (`/UPU/Curriculum/create` → `?error=unauthorized`, "No tiene permiso"). eduardo.bacon (user 15) tiene rol **`Admin`** en `/system/UPU` con `curriculum:create`/`curriculum:plan:create`. Para repro/uso del create hay que tener rol activo Admin (switcher ROL en navbar).
- **Query del picker OK**: con Admin, `listInstances(AcademicProgram)` → 5 items (los programas seedeados). Confirma H3: el bug es de binding, no de fetch.
- **Ruta del create**: `/UPU/Curriculum/create` da `Error: Layout type "create" not found` y cae en contexto Report Builder → NO es la ruta correcta del form. [NEEDS DEV] ruta/navegación exacta al form de crear/editar Curriculum dentro del app Curriculum Design.

> DET-5 (multi-capa): confirmar H3 en runtime (suite + network) antes de asumir; no fixear a ciegas.

## Setup

| Campo | Valor |
|-------|-------|
| Branch (mod) | `mods/curriculum-design` (UPONE-1261) — composable + config, flujo autocontenido + sync |
| Branch (core, si toca engine) | `layout` repo en `UPONE-1271-recorddetail-payload-fix` (épica RecordDetail en vuelo — área exacta del bug). El fix del engine, si hace falta, va sobre esa línea (RULE-dev-004) |
| Base branch | `develop` |
| Servicios | suite (:3000, UP), object-manager (:4000, UP — reiniciado en TICKET-068), postgres, redis |
| Repro | suite :3000 autenticado, tenant UPU, vista crear/editar Curriculum |

## Testing

**Test cases:**

| TC | Tipo | Descripción | REQ | Affects UI | Repro (2026-06-16, Playwright, rol Admin) |
|----|------|-------------|-----|------------|-------------------------------------------|
| TC-01 | reproduce (R1) | create: tras elegir Tipo de dueño, el picker Dueño se puebla y permite seleccionar | REQ-FIX | yes | **PASS (fix)** — create `/UPU/Curriculum/RecordDetail/default_Curriculum_create`: ownerType arranca vacío; al elegir "Programa académico" dispara `listInstances(AcademicProgram)→5` y el picker repobla con los 5 programas, seleccionable (`TICKET-069-create-after-ownertype.png`). Pre-fix los items no bindeaban |
| TC-02 | reproduce (R2) | edit: el Dueño muestra el nombre (no el id), sin "(removed)" | REQ-FIX | yes | **antes**: `TICKET-069-edit-R2.png` → `cmqh1zkbb00iuxxgar9p259wr (removed)`. **PASS (fix)**: `TICKET-069-edit-R2-FIXED.png` → Dueño = "Universidad del Valle" (label resuelto, sin removed) |
| TC-03 | reproduce (R3) | cambiar Tipo de dueño limpia/revalida el Dueño (no queda el id de otro objeto) | REQ-FIX | yes | **antes**: `TICKET-069-edit-R3-after-ownertype-change.png` → id viejo + "(removed)". **PASS (fix)**: `TICKET-069-edit-R3-FIXED.png` → tras Institución→Programa, Dueño limpio (vacío + required) y picker repobla con programas |
| TC-04 | regression | crear/editar Curriculum end-to-end funciona (owner válido persiste, payload correcto a GraphQL) | REQ-REGRESSION | yes | parcial — el campo Institución (FK references estándar) sigue resolviendo OK; el cambio es Curriculum-specific (composable + watchFields de sus configs), sin tocar engine ni otros pickers. En el repro 2026-06-17 el picker pobló y se eligió dueño OK (el save llegó al backend; el fallo posterior fue R4, no el picker) |
| TC-05 | reproduce (R5) | view (detalle): el Dueño muestra el nombre (no el id) | REQ-FIX | yes | **antes**: `TICKET-069-view-R5.png` → Dueño = `cmqh1zkh800p5xxgapw41yhfu` (cuid). **PASS (fix 2026-06-17)**: `ownerId` del view → `select`+`autoPopulate`; verificado Dueño = "Ingenieria Civil" (`TICKET-069-view-R5-FIXED.png`), red `ListInstancesForOwner 200` |
| TC-06 | reproduce (R4) | create Plan: guardar un Plan persiste | REQ-FIX | yes | **FAIL — fuera de scope (core)**: `createInstance` envía los campos del RecordType Plan a `prisma.curriculum.create()` de la tabla base → *Unknown argument `progression`*. Causa raíz confirmada por red (repro 2026-06-17). **Escalado al team core**: `uplanner/specs/up1/core/createinstance-recordtype-fields-base-table.md`. No corregible en scope mod |

**Regression baseline**: vista Curriculum (TICKET-063) + otros pickers que usan `autoPopulate`+`populateItems` (ej. object-manager-editor `useRoleDefinitions`) no deben romperse si se toca el engine.

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-16 | 2026-06-16 |
| diagnóstico + fix picker (R1/R2/R3) | done | 2026-06-16 | 2026-06-16 |
| repro en vivo + fix R5 + escalamiento R4 | done | 2026-06-17 | 2026-06-17 |
| request-close | done | 2026-06-17 | 2026-06-17 |

## Resolución

### 2026-06-16 — diagnóstico y fix del picker (R1/R2/R3)
- Triage multi-capa del picker de dueño polimórfico. **Causa raíz**: el dual-populate de `RecordDetail.vue` solo setea/limpia `ownerId` si el composable devuelve `{items, value}` estructurado; `useOwnerIdOptions` devolvía **array plano** → no bindeaba en create (R1), no resolvía label en edit (R2), no reseteaba al cambiar tipo (R3).
- **Fix**: `useOwnerIdOptions.ts` reescrito para devolver `{ items, value }` (`value` = `ownerId` si sigue válido para el `ownerType` vigente, sino `''` para limpiar). Configs create/edit con `autoPopulate` + `watchFields:["ownerType","ownerId"]`. El dual-populate del engine (ya existente desde marzo) soportaba el shape.
- Repro inicial (Playwright, rol Admin): R1/R2/R3 PASS (screenshots `-FIXED`).

### 2026-06-17 — repro en vivo, fix R5, escalamiento R4
- **Repro confirmatorio** (suite :3000, rol Admin): R1/R2/R3 OK en vivo (al elegir Tipo de dueño corre `ListInstancesForOwner` y se elige el dueño).
- **R5 (view: dueño como id)** detectado y **corregido**: `ownerId` en `default_Curriculum_view.json` pasó de `type:"text"` a `select`+`autoPopulate`+`useOwnerIdOptions` (el `autoPopulate` corre en view y resuelve el label). Sync `SYNC_AUTO_APPLY_SCHEMA=false`. Verificado: Dueño = "Ingenieria Civil".
- **R4 (create Plan falla en "Progression")**: hallazgo adicional **fuera de scope del mod**. Causa raíz confirmada por red: `createInstance` manda los campos del RecordType Plan a `prisma.curriculum.create()` de la tabla base (no a `rt__Plan__curriculum`). **Escalado al team core** (doc `specs/up1/core/createinstance-recordtype-fields-base-table.md`).

### Cambios (repo mod curriculum-design, rama `UPONE-1261-academic-program` — sin commitear/push)
- `modsComposables/useOwnerIdOptions.ts` — composable estructurado `{items,value}` (R1/R2/R3).
- `config/layouts/default_Curriculum_create.json`, `default_Curriculum_edit.json` — picker `autoPopulate`.
- `config/layouts/default_Curriculum_view.json` — fix R5 (`select`+`autoPopulate`).

### Cierre
El objetivo de TICKET-069 (picker de dueño polimórfico: rellenar/resetear/resolver label en create, edit y view) está **resuelto y verificado**. R4 es un defecto **independiente** del create de RecordTypes, de responsabilidad **core**, escalado por documento — no bloquea el cierre de este ticket (distinto del picker). Teach intake/close se omiten: ticket trabajado en modo fix-directo/diagnóstico fuera del flujo formal DKC; trabajo registrado arriba.
## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.
