---
id: TICKET-128
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1540
module: layout
autopilot: autonomous
---

# Layout core: la carga inicial de RecordDetail no debe marcar el formulario como "con cambios"

## Request

Bug de core `layout` (capa comun de detalle, `RecordDetail`) reportado sobre el frente **UPONE-1540**. Al crear un Plan de estudio (Curriculum) o entrar en modo ver sin editar y volver atras, el formulario pide confirmacion de "cambios sin guardar" aunque el usuario no edito nada, y un campo obligatorio autopoblado (`ownerId` / "Dueño") aparece invalido/rojo. La carga inicial se interpreta como un cambio. Es generico: afecta a cualquier formulario que autopuebla datos al montar.

> Atado al Jira **UPONE-1540** (epic UPONE-1267 Curriculum Design). El fix es en core `layout`, no en el mod. Existe una solucion previa sin mergear en la rama `Feat/UPONE-912` (commit `b58ce42c`): se **porta** al codigo actual, NO se mergea la rama (498 commits de divergencia).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (core, layout) |
| Modulo principal | layout |
| Modulos afectados | ninguno (comportamiento generico del detalle; el mod curriculum-design solo es el caso que lo evidencia) |

## Creation scope

- `creates_visual: false` — corrige comportamiento, no agrega UI nueva.
- `creates_data: false` — no toca modelo de datos.

## Triage

> **Fase**: el ticket se esta ANOTANDO (intake/design), no ejecutando. Las hipotesis registran los tres mecanismos distintos detras de los sintomas, mas la evidencia de intencion de arreglo de la rama vieja (912) como base. Las alternativas de arreglo se exploran en la seccion "Alternativas de arreglo" y la eleccion se cierra en design-fix.

### Hipotesis

Los sintomas reportados como uno solo se descomponen en **tres mecanismos independientes**. No hay una unica causa raiz: cada uno se arregla distinto.

| # | Hipotesis (mecanismo) | Status | Evidencia |
|---|-----------------------|--------|-----------|
| H1 | **Falso dirty a nivel form**: `isDirty()` delega ciego en `vueform.value?.dirty` sin baseline initial-vs-current; la hidratacion inicial cuenta como cambio | ✓ confirmada | `RecordDetail.vue:6231-6233` (`return vueform.value?.dirty || false`), HEAD `975c4418`. Runtime: modal "cambios sin guardar" al cancelar sin editar |
| H2 | **Campo required en rojo**: `executePopulation` (autoPopulate `triggerOnMount`) hace `targetField.update(valueData)` al montar; `update()` dispara `dirt()` Y la validacion del campo → un required con valor `''`/vacio queda invalido/rojo, sin edicion del usuario | ✓ confirmada | `executePopulation` update en `RecordDetail.vue:993`/`1006`, disparo `triggerOnMount` l.1018-1020; sin `clean()` ni reset posterior. Runtime: "El campo Dueño es obligatorio." rojo al montar |
| H3 | **Origen del `''` es el mod, no el core**: `useOwnerIdOptions.getOptionsByOwnerType` devuelve `value:''` cuando el `ownerId` actual ya no es valido (dual-populate), a proposito, para "limpiar". El core aplica `update('')` (l.988: solo saltea `null`/`undefined`, no `''`) → enrojece. Es interaccion core/mod | ✓ confirmada | `mods/curriculum-design/modsComposables/useOwnerIdOptions.ts:89-91` (`stillValid ? currentOwnerId : ''`) + comentario l.29-31 |
| H4 | **Hueco secundario cancelar-en-ver**: `ModalStackManager.handleCancelAttempt` no tiene el guard de modo `view` que si tiene `handleCloseAttempt`; 912 NO lo cubre | ✓ confirmada | `ModalStackManager.vue` `handleCloseAttempt` (guard view) vs `handleCancelAttempt` (sin guard); diff de `b58ce42c` en ese archivo es del bulk hook, no del guard |
| H5 | **912 evidencia la intencion pero cubre otro disparador**: el fix de dirty de 912 (snapshot estructural) resuelve el falso dirty por normalizacion de tags (`string[]`→`{value,label}[]`), no el `update()` de autoPopulate ni la validacion del campo. Portarlo arregla H1 (form-level) pero NO H2 (rojo) ni H4 | ✓ confirmada | diff `b58ce42c` en `RecordDetail.vue`: solo toca `isDirty()`/snapshot; mensaje de commit describe el caso de tags del modal de roles |
| H6 | **`clean()` debe correr dos veces**: el watcher que ensucia el element es `flush:'pre'`; un solo `clean()` post-`update()` se revierte antes del render | ✓ confirmada (precedente + runtime) | `mods/curriculum-mapping/.../elementBridge.ts:112-124` (UPONE-1458): `clean()` ahora + `nextTick(clean)`. Corroborado en runtime 2026-08-12: tras un solo `clean()` el modal "cambios sin guardar" reaparecio (form.dirty volvio a true) |
| H7 | **`clean()` NO alcanza para el rojo; se necesita `resetValidators()`**: `clean()` resetea solo `dirty`; el estado `invalid`/`validated` y el mensaje rojo persisten. `resetValidators()` limpia `invalid`, `validated` y `errors` → el rojo desaparece | ✓ confirmada (runtime 2026-08-12) | Smoke tenant UPU sobre `ownerId` real. Estado inicial: `{dirty:true, invalid:true, validated:true, errors:["El campo Dueño es obligatorio."]}`. Tras `clean()`: `{dirty:false, invalid:true, validated:true, errors:[...]}` (DOM sigue rojo). Tras `resetValidators()`: `{dirty:false, invalid:false, validated:false, errors:[]}` y DOM sin error (`dom_red_now:null`). El elemento expone `clean()`, `resetValidators()` y `reset()` |
| H8 | Portar la rama completa `Feat/UPONE-912` NO es viable: reorg `b558a96f` (ya en develop) movio los archivos y la rama arrastra scope ajeno (bulk modal hook, borra BulkAssignRoleModal, reescribe RecordList) | ✓ confirmada | `Feat/UPONE-912` diverge 498/5 commits; `b58ce42c` toca rutas viejas + 7 archivos, 4 del bulk hook. Decision: portar quirurgico, no merge |

### Alternativas de arreglo (exploracion pre-design; contraste con patrones de plataforma)

Base: la rama `Feat/UPONE-912` evidencia la intencion de arreglo (snapshot de dirty). Se toma como punto de partida y se contrasta con patrones ya mergeados en la plataforma.

| Opcion | Que hace | Cubre | Patron de plataforma | Pros | Contras |
|--------|----------|-------|----------------------|------|---------|
| **A — Snapshot de 912** | Portar `initialFormSnapshot` + `normalizeForDirtyCompare` + captura post-carga + `isDirty()` estructural | H1 (form-level) | rama `Feat/UPONE-912` (`b58ce42c`), sin mergear | Ataca el falso dirty de forma general (tags, multi-select, reorder); evidencia probada | NO arregla H2 (rojo) ni H4; snapshot con polling/timers (complejidad, timing); pensado para el caso de tags, no el de autoPopulate |
| **B — clean() + resetValidators() tras autoPopulate on-mount** | Tras `update()` en el path `triggerOnMount`: `element.clean()` (dirty) **y** `element.resetValidators()` (invalid/rojo), ambos x2 (ahora + `nextTick`) por H6 | H1 (para ese campo) + H2 (rojo) | **UPONE-1458 ya mergeado** (`elementBridge.ts` `writeElementValue({silent})` con doble `clean()`) | Ataca H2 de raiz (el rojo) y el dirty del campo; precedente mergeado en la misma plataforma; API confirmada en runtime (H7); blast radius acotado al path de hidratacion; submit sigue validando el required | Requiere las DOS llamadas (`clean` solo no quita el rojo, H7 confirmada) x2 (H6); no cubre el falso dirty por normalizacion de tags sin autoPopulate (caso de 912) |
| **C — Guard de view en handleCancelAttempt** | Espejar el guard de `mode==='view'` de `handleCloseAttempt` en `handleCancelAttempt` | H4 | simetria con `handleCloseAttempt` existente | Independiente y de bajo riesgo; cierra el hueco secundario | No toca H1/H2 (complementario, no sustituto) |
| **D — No emitir `update('')` sobre required en hidratacion** | Que el engine (o el contrato dual-populate) no dispare validacion cuando el valor viene de autoPopulate on-mount | H2 (raiz mas profunda) | contrato autoPopulate/populateItems | Ataca la causa en el limite core/mod | Cambia semantica del dual-populate (el mod usa `''` para limpiar a proposito, H3); mayor blast radius; requiere coordinacion del contrato |

**Lectura preliminar** (a ratificar en design-fix): los tres sintomas necesitan cobertura combinada. B+C cubren los 3 criterios de aceptacion del caso reportado con precedente mergeado y blast radius minimo; A queda como red de seguridad general para el disparador de tags (posible follow-up, out-of-scope de 1540); D es la causa mas profunda del rojo pero toca el contrato core/mod (evaluar si se hace aca o se documenta). La eleccion final se cierra en design-fix con DET-40 (auditoria de reemplazo) y se valida con smoke runtime (DET-36).

### Context found

- **Analisis code-grounded (fuente de verdad)**: [`kb/sp8/UPONE-1540-detalle.md`](../kb/sp8/UPONE-1540-detalle.md) y [`kb/sp8/UPONE-1540-pre-intake.md`](../kb/sp8/UPONE-1540-pre-intake.md). Causa raiz, opciones A/B, antecedentes de la zona, y traza de reglas up1.
- **Reproduccion runtime verificada (2026-08-12)**: smoke sobre tenant UPU, formulario real de creacion de Plan de estudio. Confirmados AMBOS sintomas sin editar nada: (a) campo "Dueño" con error `El campo Dueño es obligatorio.` en rojo (`rgb(239,68,68)`, clase `vf-element-error`) al montar; (b) modal "Cambios sin guardar" al hacer clic en Cancelar.
- **Solucion previa (referencia, NO merge)**: rama `origin/Feat/UPONE-912`, commit `b58ce42c` ("generic bulk modal hook + dirty-state false-positive fix", Ignacio Jorquera, 2026-05-05). El fix de dirty vive en `RecordDetail.vue` (`initialFormSnapshot` + `isDirty()` estructural).
- **Precedente del enfoque B (ya mergeado)**: UPONE-1458 limpia el dirty al hidratar en `curriculum-mapping` (`writeElementValue` con `clean()`), para distinguir hidratacion de edicion real.
- **Warnings**:
  - Esta zona (`RecordDetail.vue` view/edit) no tiene red de seguridad de render: cualquier cambio exige smoke runtime, no solo unit (antecedentes: enum-in-view, import faltante sin test). DET-36 aplica.
  - Paridad RBAC detalle vs lista (UPONE-1439): no reintroducir el gap si el fix toca esa zona.
  - Respetar el mecanismo real de autoPopulate/populateItems; no introducir un mecanismo paralelo.

## Radio de regresion — barrido de autoPopulate + triggerOnMount (2026-08-12)

Barrido de todas las configs de layout de la plataforma (`mods/*/config/layouts`, `layout/config`). **43 campos con `autoPopulate.triggerOnMount` en 21 configs, cruzando 3 mods**. El disparador es el mismo `executePopulation` de core: por eso **un unico fix en core los cubre a todos** (argumento fuerte para B en core, no parche por mod).

Clasificacion por riesgo (mecanismo H1 dirty / H2 rojo). Solo `ownerId` de curriculum-design esta **confirmado en runtime**; el resto es **inferido** del mismo path de core (mismo `executePopulation` → `update()` sin `clean`/`resetValidators`), pendiente de smoke por caso:

### ALTA — dirty + rojo on-mount (required, create/edit) — 8 campos

| Mod | Config | Campo | Composable | Status |
|-----|--------|-------|-----------|--------|
| curriculum-design | `default_Curriculum_create` / `_edit` | `ownerId` | useOwnerIdOptions | ✓ runtime (create) / inferido (edit) |
| academic-scheduling | `transfertime-create` / `_edit` | `orgUnitFromId`, `orgUnitToId` | useCampusOptions | inferido (ojo: `useCampusOptions` es WIP de UPONE-1524) |
| up1-manager | `fielddefinition-create` | `fieldType` | useFieldTypeVocabulary | inferido |
| up1-manager | `objectvalidation-create` | `errorMessage` | useObjectValidationFields | inferido |

### MEDIA — dirty on-mount (opcional, create/edit) — ~14 campos

up1-manager: `app-create/edit` (`defaultObjects`, `roles`), `fielddefinition-edit` (`fieldType`), `objectdefinition-create/edit` y `recordtype-create/edit` (`rolesView/Create/Modify/Delete`), `objectvalidation-create/edit` (`errorLocation`). Solo falso dirty (modal), sin rojo. Todos inferidos.

### BAJA — view/list (solo afecta el guard de cancelar, H4) — ~13 campos

curriculum-design `default_Curriculum_view` (`ownerId`), `datalog_entry_view` (`historyKey`); up1-manager `*-view` (roles), `core_user_admin_list` / `role-list` (`contextId`, required pero en list). Inferidos.

**Implicancia para el diseño**: el fix en core `executePopulation` (B: `clean()` + `resetValidators()` x2 tras el `update()` on-mount) neutraliza los 43 de una sola vez, sin tocar los mods. La regresion (DET-7) debe cubrir al menos un caso ALTA de OTRO mod ademas de curriculum-design (candidato: `fielddefinition-create` en up1-manager, sin dependencia de WIP; evitar `transfertime` por el WIP de 1524). Nota: **no** verificamos runtime cada uno — se declara inferido (DET-4) y el smoke del execute confirma la muestra.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | (a crear) `UPONE-1540-recorddetail-dirty-false-positive` desde `develop` (repo `layout`) |
| Base branch | develop (layout HEAD `975c4418`) |
| DB state | N/A (fix puro frontend; sin migraciones ni seeds) |
| Services | suite (`:3000`) + object-manager (`:4000`). Suite compila `layout` por alias a source (`@layouts` → `../layout/src/layouts`): basta HMR, NO se requiere `npm run sync` ni build de layout |
| Test data | Plan de estudio (Curriculum) del tenant UPU con `ownerId` autopoblado (fixture ya presente) |

### Reproduction steps

1. Login en suite (tenant UPU), app Curriculum Design → Planes de Estudio.
2. Clic en "Crear registro" (abre `default_Curriculum_create`, `RecordDetail`).
3. Sin editar nada: observar el campo "Dueño" en rojo (`El campo Dueño es obligatorio.`).
4. Clic en "Cancelar" (o volver): aparece el modal "Cambios sin guardar". Esperado: cerrar directo sin preguntar.

## Acceptance

- [ ] Formulario de creacion recien montado, sin editar: no queda marcado como "con cambios".
- [ ] Sin ediciones, al cancelar o volver: no aparece el modal de "cambios sin guardar".
- [ ] En modo ver, al cancelar o volver: se cierra directo, sin preguntar (hueco secundario `handleCancelAttempt`).
- [ ] Si el usuario edita un campo: el modal de "cambios sin guardar" SI aparece (caso legitimo preservado).
- [ ] Con dato valido autocompletado: el campo obligatorio no queda invalido/rojo por la carga inicial.
- [ ] Otro formulario que autocompleta datos: tampoco queda con cambios al montar (sin regresion).
- [ ] Verificado con evidencia runtime real (DET-36), no solo unit. Commits/PR con id `UPONE-1540`. Core: rama + PR + revision core (cerrar != merge).

## Testing

### Test cases (plan; se ejecutan y registran en execute)

| # | Case | Tipo | Momento | Esperado |
|---|------|------|---------|----------|
| TC-1 | Montar create con autoPopulate y no editar → estado dirty | unit + smoke | ROJO hoy → verde con fix | `isDirty()` = false tras hidratacion |
| TC-2 | Montar create, campo required autopoblado con valor valido | unit + smoke | ROJO hoy → verde con fix | campo no invalido/rojo |
| TC-3 | Editar un campo → estado dirty | unit + smoke | verde con fix | `isDirty()` = true (caso legitimo) |
| TC-4 | Modo ver, cancelar/volver | smoke | ROJO hoy → verde con fix | cierra directo, sin modal |
| TC-5 | Regresion cross-mod: `fielddefinition-create` (up1-manager, campo `fieldType` required, autoPopulate on-mount) | smoke | ROJO hoy → verde con fix | monta sin dirty ni rojo; el fix de core lo cubre sin tocar el mod. (Se evita `transfertime` por WIP de UPONE-1524) |

## Sessions

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Red de seguridad + RED del bug (tests-first): unit del caso legitimo (edicion marca dirty) VERDE sobre codigo actual + baseline runtime del falso positivo (dirty/rojo on-mount) como RED reproducible | execute | T2 | S1.T1, S1.T2 + S1.GATE | ⚑ fuerte | caso legitimo verde sobre codigo actual + falso positivo (dirty/rojo on-mount) reproducido en runtime como RED |
| S2 | Implementar B (`clean()`+`resetValidators()` x2 en `executePopulation` on-mount, via helper extraible) + C (guard `view` en `handleCancelAttempt`); unit del helper; validador de blast radius con smoke antes/despues (DET-36) | execute | T2 | S2.T1, S2.T2, S2.T3, S2.T4 + S2.GATE | auto | TC-1/2/4 verde; TC-3/2b/2c sin regresion; smoke blast radius (curriculum create+view, up1-manager fielddefinition-create ALTA cross-mod, app-create MEDIA) antes/despues; populate/valor/submit intactos; mods sin tocar; commits id UPONE-1540 |

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-08-12T17:05Z | false → true | Dev activo autopilot true al aprobar el spec | proximo gate (execute) |
| 2026-08-12T17:12Z | true → super | Dev pidio super autopilot: avanzar S1→S2 continuo, sin pausas entre sessions | inmediato |

### Session 1 — 2026-08-12 17:10 — Red de seguridad + RED del bug (tests-first) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Montar la red de seguridad del caso legitimo (editar un campo SI marca dirty) VERDE sobre el codigo actual, y dejar el falso positivo (dirty + rojo on-mount) reproducido como RED, antes de tocar codigo.

**Tasks completadas**:
- [x] S1.T1 — Malla: caso legitimo (edicion real marca dirty, TC-3) VERDE sobre codigo actual; documentar baseline de populate (items+valor) en un form con autoPopulate
- [x] S1.T2 — RED: falso dirty on-mount (TC-1) + required rojo on-mount (TC-2) + cancel-en-view (TC-4) reproducidos sobre codigo actual (runtime autoritativo + unit del helper aun inexistente)
- [x] S1.GATE — Gate T2: persistir en Sessions, confirmar malla verde + RED reproducible, decidir continue/iterate

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 (implementar B+C, unit del helper, smoke blast radius). Malla+RED runtime listos; RED confirmado. Sin codigo aun.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-08-12 17:15 — Implementar B + C + validar blast radius [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Implementar el fix (B: `clean()`+`resetValidators()` x2 tras el `update()` on-mount de `executePopulation`, via helper extraible; C: guard `view` en `handleCancelAttempt`), unit del helper, y validar el blast radius con smoke antes/despues (DET-36) sin tocar mods.

**Tasks completadas**:
- [x] S2.T1 — Implementar B en `executePopulation` (helper `resetElementAfterAutoPopulate`, acotado al path on-mount)
- [x] S2.T2 — Implementar C: guard `view` en `ModalStackManager.handleCancelAttempt`
- [x] S2.T3 — Unit del helper (clean+resetValidators x2, element mock) + suite del area verde
- [x] S2.T4 — Validador de blast radius: smoke antes/despues (curriculum create+view, up1-manager fielddefinition-create ALTA cross-mod, app-create MEDIA); populate/valor/submit intactos; mods sin tocar
- [x] S2.GATE — Gate T2: quality review (DET-23), acceptance con evidencia runtime, commits id UPONE-1540, decidir continue

**Commits (layout, rama UPONE-1540-recorddetail-dirty-false-positive)**:
- `ec19458b` UPONE-1540-S2 fix(layout): clear dirty+validation after autoPopulate on-mount; view guard on cancel
- `787f98ba` UPONE-1540-S2 test(layout): unit for resetElementAfterAutoPopulate

**Validacion del tier (T2)**:
- T1 — vitest area RecordDetail (node): 29/29 pass (5 nuevos del helper + 24 existentes).
- T2 — sin regresion en los specs puros del area. Tests de modo-browser (Playwright) bloqueados por infra preexistente (chrome-headless-shell no instalado), ajeno al cambio.
- Runtime (DET-36): ver S2.T4. ANTES/DESPUES en curriculum Curriculum_create + cross-mod up1-manager app-create.

**Evidencia runtime (S2.T4, tenant UPU)**:
- ALTA curriculum `Curriculum_create` (`ownerId`): ANTES `{dirty:true, invalid:true, rojo}` → DESPUES `form.dirty=false`, `ownerId {invalid:false, errors:[]}` sin rojo, `value` preservado. `validate()` → `invalid:true` (submit sigue validando). Editar `name` → `form.dirty=true` + modal legitimo aparece. Populate `ownerType` 2 items intacto.
- MEDIA cross-mod up1-manager `app-create` (otro mod, sin tocar): `form.dirty=false` al montar; `defaultObjects` 139 items + `roles` 21 items poblados, `invalid:false/dirty:false`.

**Discoveries / Learns nuevos**:
- L1: El harness de RecordDetail testea helpers puros extraidos, no monta el componente. El fix se extrajo a `recordDetailAutoPopulateReset.ts` para ser unit-testeable; lo conductual se valida por smoke (DET-36).
- L2: `element.clean()` baja solo `dirty`; el rojo (validacion) requiere `element.resetValidators()`. Ambos x2 por el watcher `flush:'pre'` (patron UPONE-1458). Confirmado en runtime (H6/H7).
- L3: El fix es un unico punto de core (`executePopulation` on-mount) que cubre los 43 campos autoPopulate on-mount de 3 mods sin tocarlos.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (self-review; diff pequeño, runtime-verificado)
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Helper puro + acotado; sin console.* nuevos; comentarios describen el hecho del sistema |
| 2 | Lint | pass | Sin cambios de estilo; sigue el patron del modulo |
| 3 | Tipado | pass | `ResettableFormElement` tipado; sin `any` nuevo en el helper |
| 4 | Testing | pass | Unit 5/5 del helper + area 29/29; runtime antes/despues (DET-36) |
| 5 | Escalabilidad | pass | Un punto de core cubre 43 campos; no per-mod |
| 6 | Mantenibilidad | pass | Helper extraible y reusable; acotado al path on-mount |
| 7 | Claridad | pass | `isInitialMount` explicito distingue mount vs watchers de edicion |
| 8 | A11y | n/a | No cambia UI ni markup |
| 9 | Storybook | n/a | Sin componente nuevo |
| 10 | Error-handling | pass | Helper no-op en element null; tolera metodos ausentes |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Fix B+C implementado y verificado: unit 5/5 + area 29/29; runtime antes/despues en curriculum (ALTA) + up1-manager (MEDIA cross-mod), populate/valor/submit/legit-edit intactos, mods sin tocar. Commits ec19458b+787f98ba. Pendiente: teach-close + cierre (requieren OK dev).
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**DET-40 (auditoria de reemplazo)**: el path viejo hacia populate items + set value + marcaba dirty + validaba. El nuevo replica populate+value (verificado: items 139/21/2 intactos, value preservado) y SOLO neutraliza dirty+validacion prematura en el montaje; watchers de edicion y submit sin cambio (verificado: editar marca dirty, validate() bloquea).

**Addendum S2 (coverage hardening B, pedido por el dev)**: el unit del helper solo cubria `resetElementAfterAutoPopulate` en aislamiento; el cableado on-mount-only no tenia red automatica. Se extrajo `applyAutoPopulateValue(element, value, {isInitialMount, scheduleDeferred})` (helper puro que escribe el valor siempre pero resetea SOLO en mount) y se cableo en los dos sitios de `executePopulation`. Refactor sin cambio de comportamiento.
- Tests: spec del helper 5 → **9** (nuevos: on-mount escribe+resetea x2; watcher de edicion escribe pero NO resetea; valor `''`; null no-op). Area RecordDetail **33/33** verde.
- Runtime re-verificado post-refactor (Curriculum_create): on-mount `form.dirty=false`, `ownerId {dirty:false, invalid:false, errors:[]}` sin rojo, `ownerType` 2 items; `validate()`→invalid (submit valida); editar `name`→`form.dirty=true`.
- Commits: `773ba1a7` refactor(layout), `cecdd83c` test(layout).

**Dredd review (post-S2, dkc-dredd Modo B) — hallazgo F-1 (medio, introducido) + remediacion**:

Veredicto inicial de dredd: ITERAR. Hallazgo real que el smoke y el unit no habian cazado:
- **F-1**: `watch(() => el$(watchField)?.value, executePopulation)` (RecordDetail.vue). Vue invoca el callback como `cb(newValue, ...)`; al ser `executePopulation(isInitialMount=false)`, el watcher pasaba `newValue` como `isInitialMount`. Editar un `watchField` a un valor truthy (ej. `ownerType`) disparaba el reset sobre el campo dependiente **durante una edicion real**, suprimiendo su validacion. Contradecia REQ-REGRESSION-01 y la afirmacion "watchers de edicion sin cambio" del DET-40. El unit `applyAutoPopulateValue(...isInitialMount=false...)` pasaba `false` explicito, pero el call site de produccion pasaba `newValue` (patron unit-mockeado-consagra-bug-de-runtime).
- **Fix**: envolver el callback → `watch(src, () => executePopulation(false))`. Solo el mount resetea. Commit `577ea209`.
- **F-2 (nit)**: comentario de test con etiqueta interna `H6` → reemplazado por la razon publica (watcher flush:pre). Mismo commit.
- **Re-verificacion**: unit 9/9 verde. Runtime (Curriculum_create): on-mount sigue limpio (`form.dirty=false`, `ownerId` sin rojo); al seleccionar `ownerType="AcademicProgram"` (watchField) → `ownerId` repuebla 32 items y `form.dirty=true` (edicion marca dirty, ya no se suprime).
- **Correccion al DET-40**: la afirmacion previa "watchers de edicion sin cambio" era inexacta — ese path SI cambio (era el bug F-1). Tras el fix, el path de watchers pasa `isInitialMount=false` y NO resetea: comportamiento de edicion preservado (verificado en runtime).

**Learn (L4)**: un callback de `watch(src, fn)` recibe `(newValue, oldValue)`; agregar un parametro con default a `fn` hace que Vue le inyecte `newValue` silenciosamente. Envolver siempre (`() => fn(arg)`) cuando el primer parametro NO debe ser el valor observado. Candidato a RULE de layout.
