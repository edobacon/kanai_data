---
id: TICKET-093
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1345
module: curriculum-design
autopilot: autonomous
---

# Malla: embeber planEntry/requirementCategory como hijos del Plan de estudios

## Request

Como diseñador curricular, quiero ver las líneas de formación y la malla DENTRO del detalle del Plan de estudios (como pestañas), no como objetos sueltos en el menú — igual que las secciones se ven dentro de un Programa de asignatura. Corrección de presentación de MC-02 (TICKET-082, learn L3): planEntry y requirementCategory son HIJOS del Curriculum (FK curriculumId/planId ya existen) pero MC-02 les dio layouts default_<Obj>_list top-level que los registró en el menú de objetos. Fix: borrar los 2 _list, declarar metadata.directChildren en Curriculum.json, y embeberlos como tabs (Líneas de formación = requirementCategory filtrado por curriculumId={{parentId}}; Malla curricular = planEntry filtrado por planId={{parentId}}) en default_Curriculum_view/_edit, patrón default_Activity_view. La grilla visual de la malla es MC-05/06. Zero cambio de backend (objetos/resolvers/seed intactos).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (mod curriculum-design, capa de layouts) |
| Modulo principal | curriculum-design |
| Modulos afectados | — (solo config/layouts del mod; cero backend) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | planEntry y requirementCategory aparecen en el menú de objetos porque MC-02 creó `default_planEntry_list.json` y `default_requirementCategory_list.json` (layouts list top-level). Borrarlos los saca del menú. | ✓ confirmada | Ambos archivos existen en `mods/curriculum-design/config/layouts/`; el request de MC-02 (TICKET-082) los autoró. El menú de objetos se arma de los layouts `_list` registrados (precedente del mod). |
| H2 | El embedding como pestaña se logra con un campo `record-list` en el `schema` del layout de detalle + `filters` por FK, NO con la metadata `directChildren`. | ✓ confirmada | `default_Activity_view.json` embebe 7 listas de CurricularSection vía `"type":"record-list"` + `filters [{field:ownerId, value:"{{parentId}}"}]`. Patrón 1:1 reusable. |
| H3 | `metadata.directChildren` NO es necesaria para el embedding de tabs — es consumida solo por el backend (deepClone/versioning), no por layout/suite. | ✓ confirmada | `grep directChildren` → solo `object-manager/src/.../deep-clone-direct.js`, `deep-clone-polymorphic.js`, `instance.resolver.js`, `codegen/helpers/validate-prefill-from.js`. **0 hits en `layout/src` y `suite/src`.** Añadirla tocaría backend (contradice "zero backend change") y expandiría scope a versioning (UPONE-1270). → drop (DET-32). |

### Context found

- **Pattern de embedding** (fuente de verdad): [default_Activity_view.json](../../../../../Workspace/uplanner/up1/mods/curriculum-design/config/layouts/default_Activity_view.json) — `tabs{}` + campos `record-list` en `schema{}` con `filters` por `{{parentId}}` y `associatedLayoutConfigs.view`. [default_Activity_edit.json](../../../../../Workspace/uplanner/up1/mods/curriculum-design/config/layouts/default_Activity_edit.json) confirma que el embedding de tabs aplica también en modo `edit`.
- **Targets**: `default_Curriculum_view.json` y `default_Curriculum_edit.json` — hoy planos (sin `tabs`).
- **A borrar**: `default_planEntry_list.json` (canCreate:false, canEdit:false, canDelete:true), `default_requirementCategory_list.json` (CRUD completo).
- **A conservar**: `default_Curriculum_list.json` (los currículos SÍ van en el menú), `default_planEntry_view.json`, `default_requirementCategory_view/_edit/_create.json` (los abre la lista embebida vía `associatedLayoutConfigs`).
- **FKs de los hijos**: requirementCategory.curriculumId → Curriculum; planEntry.planId → Curriculum, planEntry.categoryId → requirementCategory, planEntry.activityId → Activity.
- **KB**: RULE-curriculum-design-014 (reusar componente nativo vs construir modsComponent — acá se reusa el `record-list` nativo, no se construye nada). RULE-017/018 (constraints de plataforma de MC-02: resolver read-enrichment + codegen indexes) — no se tocan. Spec madre: SPEC-curriculum-design-planentry-requirementcategory (TICKET-082).
- **Bugs abiertos del módulo**: bug-curriculum-design-001/002 — revisados, no afectan layouts.
- **Create desde tab embebida**: `default_requirementCategory_create.json` tiene `curriculumId` como picker required sin auto-assign → crear una línea desde la pestaña funciona pero el usuario elige el currículo manualmente (prefill = nice-to-have fuera de alcance; los pickers de color/icono son TICKET-094).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | UPONE-1267-sp5 (repo del mod, epic SP5; continúa la rama de TICKET-082) |
| Base branch | develop (merge gated por team up1) |
| DB state | Layouts viven en la DB del tenant; se aplican vía `npm run sync` (DB-gated). Verificación de código = JSON válido + suite del mod sin regresión. Smoke runtime en la suite = DB-gated (lo corre el dev). |
| Services | suite (3000), object-manager (4000), layout/storybook (6006) |
| Test data | Currículo Plan con planEntry + requirementCategory ya sembrados por `_data-malla.js` (MC-02 S3) |

### Reproduction steps
1. Abrir la suite UPU → menú de objetos.
2. Observar que "Líneas de formación" (requirementCategory) y "Entradas de plan" (planEntry) aparecen como entradas sueltas del menú.
3. Abrir el detalle de un Currículo (Plan): NO muestra ni las líneas ni la malla — están desconectadas del padre.
4. Esperado: el menú no lista esos 2 objetos; el detalle del Currículo los muestra como pestañas.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | `metadata.directChildren` (up1) la consume SOLO el object-manager (deepClone/versioning + codegen); 0 usos en layout/suite. El embedding de hijos como tabs lo hace el `record-list` + `filters {{parentId}}` del layout de detalle, no directChildren. | intake/grep | S1 | refined | RULE-curriculum-design-027 |
| L2 | `Curriculum` tiene `metadata.versioning` sin `directChildren` → versionar/clonar un Currículo no cascadea planEntry/requirementCategory. Gap latente para versioning (UPONE-1270). | intake | S1 | refined | BUG-curriculum-design-003 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-25 | (nuevo) → super | dev invocó `/dkc 093 super autopilot` | intake |

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate | Criterio |
|---|----------|------|------|-----------------|------|----------|
| S1 | Embeber planEntry/requirementCategory como tabs del Curriculum y removerlos del menú | execute | T2 | Borrar 2 _list; embeber tabs en Curriculum_view + Curriculum_edit | ⚑ auto (dual-judge) | JSON válido + suite mod sin regresión + dual-judge APPROVED; smoke runtime DB-gated diferido al dev |

### Session 1 — 2026-06-25 — Sacar del menú + embeber pestañas en el detalle del Currículo [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Borrar los 2 layouts `_list` de planEntry/requirementCategory (los saca del menú) y embeber ambos como pestañas `record-list` filtradas por la FK al Currículo en `default_Curriculum_view.json` y `default_Curriculum_edit.json`, reusando el patrón `default_Activity_view`. Cero backend.

**Tasks completadas**:
- [x] S1.T1 — Borrar `default_planEntry_list.json` y `default_requirementCategory_list.json`
- [x] S1.T2 — Embeber tabs (General + Líneas de formación + Malla curricular) con record-lists filtradas en `default_Curriculum_view.json` y `default_Curriculum_edit.json`
- [x] S1.GATE — Gate T2: JSON válido + suite del mod sin regresión + quality review dual-judge (DET-35) + commit DET-27

**Validacion del tier**:
- T2 — vitest run del mod 788/788 (sin caída de baseline); eslint EXIT 0; JSON.parse OK en ambos layouts

**Discoveries / Learns nuevos**:
- L1: `metadata.directChildren` en up1 es consumida SOLO por el object-manager (deepClone/versioning + codegen validate-prefill-from); **0 usos en `layout/src` y `suite/src`**. El embedding de hijos como pestañas NO depende de ella — lo hace el campo `record-list` + `filters {{parentId}}` del layout de detalle (patrón `default_Activity_view`). Corrige el supuesto del request MC-02-fix. Candidato a RULE/reference de curriculum-design o platform.
- L2 (propagación DET-16): `Curriculum` declara `metadata.versioning` pero no `directChildren` → versionar/clonar un Currículo NO cascadea sus hijos planEntry/requirementCategory. Gap latente para el ticket de versioning (UPONE-1270), fuera de alcance de este fix.

**Quality review (DET-23)**:

**Reviewer**: 2 jueces ciegos en paralelo (Agent sonnet, DET-35) — A `ada8d5f`, B `a3bef89`
**Tier de revision**: standard (T2)
**Resultado global**: pass (ambos approved, 0 iteraciones de fix)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | record-list reusa patrón Activity_view 1:1; sin código custom |
| 2 | Lint | pass | JSON.parse OK ambos layouts; eslint EXIT 0 en el test |
| 3 | Tipado | n/a | layouts JSON declarativos |
| 4 | Testing | pass | 788/788; inventario re-baseline 47→45 (borrado intencional) |
| 5 | Escalabilidad | pass | patrón probado en 7 listas de Activity |
| 6 | Mantenibilidad | pass | -2 layouts; cero referencias colgantes a los _list borrados (grep) |
| 7 | Claridad | pass | labels de tabs descriptivos; comentario del test explica el conteo |
| 8 | A11y | n/a | la renderiza el motor de layout |
| 9 | Storybook | n/a | sin modsComponent nuevo (RULE-014 no se activa) |
| 10 | Error-handling | n/a | sin lógica; cero backend |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1 APPROVED por dual-judge (DET-35); 788/788 sin regresión; cero backend; smoke runtime DB-gated diferido al dev. Todas las tasks done → proceder a close.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Findings: solo INFO/theoretical (single-judge, no confirmados por DET-35): `isElective filterable:true` preservado verbatim del `_list` borrado (no regresión); tab "Malla curricular" visible-vacía para currículos no-Plan (aceptable SP5). Smoke runtime DB-gated diferido al dev (TC-01..05).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-FIX-01 | TC-01 | manual/DB-gated | NOT COVERED |
| REQ-FIX-02 | TC-02, TC-03 | manual/DB-gated | NOT COVERED |
| REQ-FIX-03 | TC-04 | manual/DB-gated | NOT COVERED |
| REQ-FIX-04 | TC-05 | manual/DB-gated | NOT COVERED |
| REQ-REGRESSION | TC-06 | auto (vitest mod) | COVERED |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | planEntry y requirementCategory NO aparecen en el menú de objetos | REQ-FIX-01 | manual/DB-gated | sync aplicado | abrir menú objetos | ninguna entrada para esos 2 objetos | — | — | pending |
| TC-02 | Detalle Curriculum (view) muestra pestaña "Líneas de formación" con las requirementCategory del currículo | REQ-FIX-02 | manual/DB-gated | currículo con líneas | abrir view del currículo | tab lista las líneas (filtro curriculumId) | — | — | pending |
| TC-03 | Detalle Curriculum (view) muestra pestaña "Malla curricular" con los planEntry del plan | REQ-FIX-02 | manual/DB-gated | plan con entradas | abrir view del currículo | tab lista las entradas (filtro planId) | — | — | pending |
| TC-04 | Edit del Curriculum replica las mismas pestañas embebidas | REQ-FIX-03 | manual/DB-gated | — | abrir edit del currículo | tabs General + Líneas + Malla presentes | — | — | pending |
| TC-05 | Crear/editar/borrar una línea de formación desde la pestaña embebida | REQ-FIX-04 | manual/DB-gated | — | usar acciones de la lista embebida de líneas | CRUD operativo (create abre layout existente) | — | — | pending |
| TC-06 | Suite del mod sin regresión tras el cambio de layouts | REQ-REGRESSION | auto | — | `npm test` en el mod | misma cantidad de tests PASS que baseline | 788/788 PASS (48 files) | vitest run; test `layouts-declared` inventario 47→45 por borrado intencional de los 2 _list; eslint EXIT 0 | passed (S1) |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| mod curriculum-design | `npm test` (vitest) | 788/788 (baseline TICKET-082) | 788/788 | 0 (sin regresión; test de inventario re-baseline a 45 por borrado intencional) |

## Summary

Fix de presentación de MC-02 (UPONE-1345): `planEntry` (malla) y `requirementCategory` (líneas de formación) dejaron de ser objetos sueltos del menú y ahora se ven como pestañas dentro del detalle del Currículo (Plan), reusando el patrón `record-list` de `default_Activity_view`. Cambio 100% de capa de layouts del mod, **cero backend**.

**Qué se hizo** (S1, 2 tasks + gate T2 dual-judge):
- Borrados `default_planEntry_list.json` y `default_requirementCategory_list.json` → salen del menú de objetos (los `_view/_edit/_create` se conservan).
- `default_Curriculum_view.json` y `default_Curriculum_edit.json`: agregados `tabs` (General + Líneas de formación + Malla curricular) con 2 `record-list` filtrados por `curriculumId`/`planId = {{parentId}}`. Líneas conserva CRUD (apunta a los layouts existentes); malla queda lectura + borrar (creación vía MC-05/06).
- Test `layouts-declared` re-baseline 47→45 (borrado intencional).

**Decisión clave (DET-32)**: se **descartó** declarar `metadata.directChildren` en `Curriculum.json` — grep probó que la consume solo el object-manager (deepClone/versioning), 0 usos en layout/suite; no participa del embedding y tocaría backend. Ver DEC-LOCAL-01.

**Verificación**: vitest del mod 788/788 (sin regresión); eslint EXIT 0; JSON válido; dual-judge DET-35 (2 jueces ciegos) ambos APPROVED con 0 iteraciones. Commits locales `ac1e709` (fix) + `91c9e7d` (test) en rama `UPONE-1267-sp5`.

**Pendiente / DB-gated**: smoke runtime en la suite (TC-01..05) lo corre el dev tras `npm run sync` (los layouts viven en la DB del tenant). **Push difiere a aprobación humana** (super: no se pushea automático).

**Propagación (DET-16)**: `Curriculum` versiona pero no cascadea sus hijos al clonar (no tiene `directChildren`) — gap latente para el ticket de versioning UPONE-1270 (L2). Prefill de `curriculumId` al crear una línea desde la pestaña embebida = follow-up (OQ-1, candidato a TICKET-094).
</content>
