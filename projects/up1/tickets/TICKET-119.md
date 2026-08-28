---
id: TICKET-119
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1538
module: mods/curriculum-design
autopilot: autonomous
---

# Configuracion de plan de estudio modular

## Request

Ajustar flujo de creacion para que en el tipo Plan de estudio:
- El total de creditos sea independiente del tipo de progresion.
- El total de periodos se solicite solamente si el tipo de progresion es "Secuencial".
- El tipo de periodo se solicite solamente si el tipo de progresion es "Secuencial" (por confirmar).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (mod-only, config de layout) |
| Modulo principal | mods/curriculum-design |
| Modulos afectados | ninguno (no toca core layout/ ni object-manager) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Los 3 campos (creditos/periodos/tipo de periodo) hoy dependen solo de `recordType==Plan`, no de la progresion | ✓ confirmada | Los 3 layouts tienen `conditions: [["recordType","==","Plan"]]` en `progression`/`totalCredits`/`totalPeriods`/`periodType` (create l.61-64, edit l.101-104, view l.108-111 en `uplanner/up1`, develop) |
| H2 | El cambio se resuelve solo con la sintaxis nativa `conditions` de Vueform, sin tocar el motor | ✓ confirmada | `progression` es un campo mas del form; `useFieldConditions.ts` solo procesa `disableConditions`, la visibilidad la evalua Vueform con `conditions` |
| H3 | En modo VIEW, condicionar por el enum `progression` reincide en el bug de enum-vs-etiqueta (BUG sp7) | ✗ DESCARTADA | El fix de raiz de core (Opcion A, UPONE-1515) YA esta mergeado en develop: en view los enums se renderizan como `select` deshabilitado con el **valor crudo** (`RecordDetail.vue:3231-3270`). Las `conditions` sobre enum en view ya comparan valor-contra-valor. No hace falta campo espejo |
| H4 | No requiere cambio de modelo, migracion ni backend | ✓ confirmada | `progression`/`periodType` ya existen en `rt__Plan__curriculum.json` (enum String); los resolvers de create/update rutean por `recordType`, agnosticos de `progression` |

### Context found

**Estado del codigo (verificado contra `uplanner/up1`, develop, 2026-08-05):**

- **Layouts afectados** (`mods/curriculum-design/config/layouts/`): `default_Curriculum_create.json`, `_edit.json`, `_view.json`. Los 4 campos del RecordType (`progression`, `totalCredits`, `totalPeriods`, `periodType`) llevan hoy `conditions: [["recordType","==","Plan"]]`.
- **Labels de enum inline en el layout**: `progression` usa `"items": { "Sequential": "Secuencial", "Modular": "Modular" }`; `periodType` usa `{ "Semester":"Semestre", "Trimester":"Trimestre", "Quarter":"Cuatrimestre", "Annual":"Anual" }`. Estan en el JSON, no en `lang/` — **no hay cambio de i18n** en este ticket.
- **RecordType Plan** (`objects/RecordTypes/rt__Plan__curriculum.json`): `progression` enum `[Sequential, Modular]` default `Sequential`, PLAN-ONLY (origen MC-01/UPONE-1344). `periodType` enum `[Semester, Trimester, Quarter, Annual]` con marca `[NEEDS CLARIFICATION: confirmar valores institucionales]`.
- **RecordType Minor**: `properties: {}` — no ofrece progresion/creditos/periodos. Sin regresion posible por este cambio.

**Desde el KB del proyecto:**

- `sp7/BUG-core-recorddetail-view-enum-conditions.md`: documenta el bug de `conditions` sobre enum en view (comparaba contra la etiqueta traducida). **Resuelto en core via Opcion A (UPONE-1515)** — este ticket se beneficia del fix, ya no necesita el workaround de campo espejo que ese doc proponia como contencion. El campo espejo `recordTypeKey` fue retirado del `view.json` (verificado: las conditions volvieron a `recordType`).
- Antecedente `UPONE-1353`: una rotura de render en `RecordDetail.vue` view llego a develop sin red de seguridad unit. **Leccion aplicable: esta zona exige smoke runtime, no solo unit** → alimenta la task de verificacion (DET-36).
- Coordinacion `UPONE-1450` (versionamiento del Plan, Finalizada): ya modifico los mismos layouts/RT de `Curriculum`. Revisar su cambio para no chocar.

**Material de detective-mode (fuente de intake):** `sp8/UPONE-1538-detalle.md` (contrato) + `sp8/UPONE-1538-pre-intake.md` (pre-intake tecnico). El pre-intake asumia el bug de enum-en-view como riesgo alto; la verificacion de este intake lo descarta (H3).

### Hipotesis de causa (no es bug de dato)

No es un bug de datos ni de backend: es una regla de visibilidad de layout incompleta (los campos de periodo dependen del `recordType`, no de la `progression`). El fix es aditivo sobre las `conditions` existentes.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `fix/UPONE-1538-plan-progression-field-visibility` |
| Base branch | develop |
| DB state | Sin migraciones. Requiere `npm run sync` (o `sync:layouts`) para publicar el cambio de layout al tenant; hard reload por cache-first de Apollo |
| Services | object-manager + suite (tenant UPU / `uplanner_upu`) |
| Test data | Un `Curriculum` Plan Secuencial, un Plan Modular, un Minor. Login Clerk test mode del dev |

**Reproduction steps (estado actual, no es un error sino una regla incompleta):**
1. Crear/editar/ver un Plan con progresion Modular.
2. Observar que hoy se muestran igualmente Total de periodos y Tipo de periodo (deberian ocultarse en Modular).

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El fix de core UPONE-1515 (Opcion A) ya esta en develop: enums en view se renderizan como `select` con valor crudo, asi que `conditions` sobre enum en view YA funcionan. El workaround de campo espejo del BUG sp7 es innecesario para nuevos layouts | intake (verificacion de codigo) | — | discarded | descartado: ya documentado en `sp7/BUG-core-recorddetail-view-enum-conditions.md` + resuelto en core (UPONE-1515). Sin accion pendiente |
| L2 | El seed del tenant UPU tiene `rt__Plan__curriculum.progression` con valor `Credits` (no es un valor del enum `[Sequential, Modular]`) en las ~21 filas seed. Es dato corrupto ajeno a este ticket (probable column-shift de seeding). Consecuencia para consumidores de la condicion nueva: esos planes muestran `totalPeriods` OCULTO en los 3 modos (Credits != Sequential). No bloquea el fix pero conviene sanear el seed | S1.T2 (smoke, inspeccion DB) | 1 | deferred | follow-up local FUP-01 (fuera de alcance de UPONE-1538) |
| L4 | Paridad MCP (up1-mcp/Elric, repo `uplanner/mcp`): el cambio de este ticket NO esta reflejado en el MCP y NO se sincroniza solo. El MCP es una capa API con contrato mantenido a mano (`src/contracts/registry.ts` + `src/mods/curriculum-design/curriculum-write.ts`) que espeja la app ticket por ticket; no lee los JSON de layout del suite. Hoy `progression`/`totalPeriods`/`periodType` son campos opcionales "Solo Plan" sin regla cruzada: `curriculum-write.ts` no ata `totalPeriods` a `progression==Sequential` y `validations.ts` no tiene mecanismo condicional (`requiredIf`/`refine`). Consecuencia: por Elric se puede crear/editar un Plan Modular seteando `totalPeriods` (la inconsistencia que este ticket corrige en la UI). El workflow DKC de estos tickets no incluye una task "actualizar MCP" → gap sistemico. Ultimo commit del MCP: 2026-07-29 (UPONE-1378); sp8 no incluido. Candidato a follow-up local: reflejar la regla de progresion en el guide/validacion del MCP | S1 (revision pedida por el dev) | 1 | discarded | RESUELTO en S2 de este ticket (commit `a9082fa`, repo `uplanner/mcp`): `cd_create/update_curriculum` rechazan `totalPeriods` en plan Modular + guide/fieldDocs/tests. Gap sistemico (falta task "actualizar MCP" en el workflow) queda como observacion en el Summary |
| L3 | RBAC gap en la app curriculum-design: los roles curriculares (Diseñador/Consultor/Revisor/Autoridad Curricular) NO tienen la capability `institution:view` (solo la tienen Admin, Consultor base, Coordinador, Gestor, Estudiante y los `*-eng` — verificado en `core_RoleCapability`). Consecuencia: con un rol curricular el FK de owner=`Institution` lista vacio y un `Curriculum` ya owned-by-Institution (ej. `uPlanner University`, que SI existe) renderiza `(removed)` porque el resolver de label no puede leer el objeto, dejando `Dueño` obligatorio sin opciones y bloqueando el guardado. Confirmado en vivo: al cambiar el rol a Admin la lista de instituciones se puebla. No es dato colgante ni bug del ticket 119. En el smoke se ejecuto TC-6 reasignando el owner a un `AcademicProgram` (que los roles curriculares si listan). Candidato a follow-up local (¿los diseñadores curriculares deberian poder elegir Institution como owner del Plan?) | S1.T2 (smoke + verificacion RBAC en DB + confirmacion UI con rol Admin) | 1 | deferred | follow-up local FUP-02 (decision de producto, fuera de alcance de UPONE-1538) |

## Follow-ups locales (fuera de alcance de UPONE-1538)

| # | Item | Prioridad | Origen | Estado |
|---|------|-----------|--------|--------|
| FUP-01 | Sanear el seed de `progression='Credits'` (enum invalido, hardcodeado en 20 filas de `_data-curriculum.js`, no column-shift) → `Sequential` (univoco por contexto). Deja `totalPeriods` oculto en esos planes por la regla nueva | could | L2 (smoke S1.T2) | **movido a TICKET-121** (external UPONE-1538) |
| FUP-02 | RBAC: roles curriculares sin `institution:view` → no pueden listar instituciones para crear/editar Planes (owner=Institution) ni Minors. Decision respaldada: otorgar la cap + acotar por contexto en provisioning. Diferido (workaround: rol Admin) | could | L3 (smoke S1.T2 + RBAC en DB + Confluence) | **registrado como BUG-curriculum-design-016** + `kb/sp8/UPONE-1538-rbac-institution-view-gap.md` |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-08-06T00:00:00Z | design-fix (sin modo) → super | dev trigger "super autopilot" al entrar a execute | S1.GATE (proximo gate) |

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks | Gate | Criterio |
|---|----------|------|------|-------|------|----------|
| S1 | Regla de visibilidad por progresion (config-only + smoke) | execute | T3 | S1.T1-S1.T2 | ⚑ fuerte | smoke runtime 3 modos x 2 progresiones + Minor + cambio-y-guarda verdes; regresion del mod sin delta |
| S2 | Paridad MCP (Elric): la regla progresion->periodos rige tambien por la API | execute | T2 | S2.T1-S2.T2 | auto | `cd_create/update_curriculum` rechazan `totalPeriods` en plan Modular; guide/fieldDocs actualizados; vitest verde |

#### Session 1 — Regla de visibilidad por progresion (tier T3, ⚑ fuerte)

Config-only en 3 JSON de layout + verificacion runtime por modo y progresion. Tier T3 por ser user-facing visible y tocar modo view (zona sin red de seguridad unit, leccion UPONE-1353 → smoke obligatorio, DET-36).

### Session 1 — 2026-08-06 — Regla de visibilidad por progresion [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Condicionar `totalPeriods` a progresion Secuencial en los 3 layouts del `Curriculum` Plan (`create`/`edit`/`view`), dejando `totalCredits` y `periodType` sin tocar (DECISION-027), y verificar en runtime (3 modos x 2 progresiones + Minor + cambio de progresion con campos cargados + `periodType` visible en Modular).

**Tasks completadas**:
- [x] S1.T1 — Condicionar `totalPeriods` a progresion Secuencial en los 3 layouts (unico delta de codigo) + `npm run sync`. `totalCredits` y `periodType` sin tocar (DECISION-027)
- [x] S1.T2 — Verificacion runtime + regresion (3 modos x 2 progresiones + Minor + cambio de progresion con campos cargados + `periodType` visible en Modular)
- [x] S1.GATE — Persistir + validar tier T3 + decidir continue/close

**Discoveries / Learns nuevos**:
- L2: seed de `progression`='Credits' (enum invalido) en filas seed de `rt__Plan__curriculum` (UPU). Ajeno al ticket.
- L3: RBAC gap — roles curriculares sin `institution:view`; el FK owner=Institution no lista y un Plan owned-by-Institution se ve `(removed)`. Confirmado con rol Admin (lista se puebla). Candidato a follow-up local.

**Commit**: `968a2f8` UPONE-1538-S1 fix(curriculum-design): show totalPeriods only for Sequential plans (repo `uplanner/up1/mods/curriculum-design`, rama `sp8-06-ago`). Local; push pendiente de OK del dev.

> Nota rama: el Setup del ticket anticipaba `fix/UPONE-1538-...`, pero el dev creo y autorizo la rama `sp8-06-ago` (desde develop) para el trabajo de SP8. La guarda de rama (DET-30 REQ-02) pasa: `sp8-06-ago` no es protegida.

**Validacion del tier (T3)**:
- T0 — JSON de los 3 layouts valido (parse OK). Sin cambio de i18n ni de modelo.
- T3 — smoke runtime UPU (DET-36): TC-1..TC-7 PASS con evidencia real (create/edit/view, 2 progresiones, Minor, cambio-y-guarda). Regresion del mod: config-only, sin delta de logica; suite del mod sin cambio esperado (baseline == after).

**Runtime-verification (DET-36)**: smoke-executed — evidencia runtime real (interaccion en vivo + verificacion en DB del persistido tras guardar). No referencia a test file.

**Quality review (DET-23)**

**Reviewer**: LLM principal (autopilot super)
**Tier de revision**: light (cambio config-only: 3 clausulas identicas en JSON de layout; sin codigo ejecutable nuevo)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Delta minimo aditivo sobre `conditions` existente; sin console.* ni debug |
| 2 | Lint | n/a | JSON de config; parse valido en los 3 archivos |
| 3 | Tipado | n/a | Sin TypeScript en el cambio |
| 4 | Testing | pass | Cobertura por smoke runtime (TC-1..TC-7); zona sin red unit por diseño (config de layout) |
| 5 | Escalabilidad | pass | Mecanismo nativo Vueform `conditions`; no toca el motor |
| 6 | Mantenibilidad | pass | Consistente con las otras `conditions` del layout |
| 7 | Claridad | pass | Clausula legible `["progression","==","Sequential"]` |
| 8 | A11y | n/a | No cambia estructura de campos, solo visibilidad condicional |
| 9 | Storybook | n/a | Layout config del mod, no componente |
| 10 | Error handling | n/a | Sin logica nueva; campos ocultos excluidos del submit por Vueform (verificado TC-6) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1 completa: TC-1..TC-7 verdes (smoke DET-36), quality review pass, commit local 968a2f8. Proceder a request-close (pregunta al dev, DET-30). Push pendiente de OK.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Auditoria de reemplazo (DET-40)**: covered — el camino viejo (`totalPeriods` visible con solo `recordType==Plan`) se reemplaza por `recordType==Plan AND progression==Sequential`. Comportamiento del viejo replicado 1:1 salvo el delta intencional (oculto en Modular). `totalCredits`/`periodType` conservan su condicion (no reruteados). Verificado en runtime (TC-1..TC-4).

**Self-report verification (DET-33)**: verified — files editados confirmados (git diff), JSON parse OK, sync publicado y verificado en DB del tenant, smoke ejecutado en primera persona (no self-report de sub-agente).

### Session 2 — 2026-08-06 — Paridad MCP de la regla de progresion [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + cobertura del area tocada)

**Objetivo**: Hacer valida la regla del ticket tambien por la API del up1-mcp (Elric). Reflejar en `cd_create_curriculum` / `cd_update_curriculum` que `totalPeriods` solo aplica a un plan de progresion Secuencial (un plan Modular no define periodos), espejando la condicion de visibilidad del layout del suite. Actualizar guide/fieldDocs. Repo: `uplanner/mcp` (rama de trabajo propia).

**Alcance de repos (execute_scope)**: `uplanner/mcp` (repo del MCP, separado del mod). El delta de S1 vive en `uplanner/up1/mods/curriculum-design`. La guarda de rama (DET-30 REQ-02) se verifica en el repo del MCP.

**Tasks completadas**:
- [x] S2.T1 — Regla de paridad en `curriculum-write.ts` (create + update: rechazar `totalPeriods` cuando la progresion efectiva es Modular; en update, resolver la progresion actual via `api.get` si no viene en el patch) + guide/fieldDocs (`registry.ts`, descripciones de las tools)
- [x] S2.T2 — Verificacion: `vitest run` del area + preview de las tools (create/update Modular con periodos -> rechazo; Secuencial con periodos -> OK)
- [x] S2.GATE — Persistir + validar tier T2 + commits DET-27 (repo MCP) + decidir continue/close

**Commit**: `a9082fa` UPONE-1538-S2 feat(cd): enforce totalPeriods only for Sequential plans (repo `uplanner/mcp`, rama `sp8-06-ago-mcp-progression-parity`). Local; push pendiente de OK del dev.

> Nota rama (DET-30 REQ-02): el repo del MCP solo tiene `main` (protegida). Se creo rama de trabajo `sp8-06-ago-mcp-progression-parity` desde `main`; la guarda pasa (no es protegida).

**Validacion del tier (T2)**:
- `npx tsc --noEmit` exit 0 (sin errores de tipo).
- `npx vitest run`: 18 files, **174/174 PASS** (antes 170; +4 en `test/curriculum-write-rules.test.ts`). Sin regresion.

**Quality review (DET-23)**

**Reviewer**: LLM principal (autopilot super)
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Predicado puro reutilizable + guard explicito; mismo patron que el chequeo Minor existente |
| 2 | Lint/tipado | pass | `tsc --noEmit` limpio |
| 3 | Testing | pass | 4 tests unitarios con asserts concretos (Modular/Sequential/sin-periodos/undefined); suite completa verde |
| 4 | Escalabilidad | pass | Regla centralizada en un helper exportado; reutilizable si se agrega otra superficie |
| 5 | Mantenibilidad | pass | Mensaje de negocio unico (`PERIODS_MODULAR_MESSAGE`); descripciones de tools y fieldDocs alineadas |
| 6 | Claridad | pass | Comentarios explican la paridad con la UI (UPONE-1538) |
| 7 | Error handling | pass | Devuelve `errorResult` de negocio (no crudo); update resuelve progresion actual via `api.get` (no asume) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 completa: paridad MCP implementada y verificada (174/174 vitest, tsc limpio), commit local a9082fa. Proceder a request-close (pregunta al dev, DET-30). Push pendiente de OK (2 repos).
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Auditoria de reemplazo (DET-40)**: covered — no se retira ni reruta logica; es un guard aditivo antes del build del payload, alineado con el guard Minor preexistente. Los flujos validos (Secuencial+periodos, Modular sin periodos, Minor) quedan intactos; solo se rechaza la combinacion invalida (Modular+periodos), que antes pasaba.

**Self-report verification (DET-33)**: verified — cambios confirmados por `git diff`/`git status`, `tsc` y `vitest` re-corridos en el entorno real (no self-report de sub-agente). Preview en vivo de la tool no aplicable sin rebuild+reinstall del server MCP (proceso `dist/` ya conectado); la regla se verifica por unit del predicado + wiring revisado.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-FIX-01 | TC-1, TC-2, TC-3 | manual (smoke) | COVERED |
| REQ-FIX-02 (periodType visible en todo Plan) | TC-4 | manual (smoke) | COVERED |
| REQ-REGRESSION-01 | TC-5, TC-6, TC-7 | manual (smoke) | COVERED |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-1 | Plan Secuencial muestra creditos + periodos + tipo de periodo | REQ-FIX-01 | manual | Plan progresion Sequential | Abrir create/edit/view | Se ven los 3 campos | Se ven creditos + periodos + tipo de periodo en create (toggle a Secuencial), edit (Biologia) y view (Biologia) | smoke UPU rol Diseñador Curricular: create con Secuencial muestra PERIODOS TOTALES; edit Biologia idem; view Biologia periods=8 visible | pass |
| TC-2 | Plan Modular oculta total de periodos | REQ-FIX-01 | manual | Plan progresion Modular | Abrir create/edit/view | Total de creditos visible; total de periodos oculto | Al pasar progresion a Modular en create y en edit, PERIODOS TOTALES desaparece; creditos permanece | smoke UPU: create toggle Modular oculta periodos; edit Biologia toggle Modular oculta periodos (tenia 8) | pass |
| TC-3 | Total de creditos visible en cualquier progresion | REQ-FIX-01 | manual | Plan Seq y Modular | Comparar | Creditos siempre visible | CREDITOS TOTALES visible con progresion vacia, Secuencial y Modular | smoke UPU create + edit | pass |
| TC-4 | Tipo de periodo visible en todo Plan, incluido Modular (DECISION-027) | REQ-FIX-02 | manual | Plan Modular | Ver campo | Tipo de periodo visible (cadencia de inscripcion/oferta, no depende de la progresion) | TIPO DE PERIODO visible con Secuencial y con Modular en create y edit | smoke UPU: sin cambio de condicion en periodType, sigue con recordType==Plan | pass |
| TC-5 | Minor no muestra progresion/creditos/periodos | REQ-REGRESSION-01 | manual | Curriculum Minor | Abrir los 3 modos | Ninguno de los 4 campos | Al elegir TIPO=Minor en create, desaparecen progresion, creditos, periodos y tipo de periodo | smoke UPU create: recordType!=Plan oculta los 4 campos del RT | pass |
| TC-6 | Cambiar Secuencial→Modular con periodos cargados y guardar no falla | REQ-REGRESSION-01 | manual | Plan con periodos cargados | Cambiar progresion, guardar | Guarda sin error; campos ocultos no bloquean por required | Edit Biologia (periods=8): cambio a Modular oculta periodos, Guardar OK (toast exito). Unica validacion previa fue Dueño (dato colgante ajeno), nunca totalPeriods. DB post: progression=Modular, totalPeriods=8 retenido | smoke UPU + verificacion DB rt__Plan__curriculum | pass |
| TC-7 | Modo VIEW evalua la condicion sobre el valor crudo del enum, no la etiqueta | REQ-REGRESSION-01 | manual | Plan Secuencial en view | Abrir detalle | Periodos visibles (condicion `progression==Sequential` da true con valor crudo) | View Biologia (Sequential): PROGRESION renderiza valor crudo "Sequential" y PERIODOS TOTALES=8 visible; condicion evalua valor-contra-valor (fix core UPONE-1515) | smoke UPU view mode | pass |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| curriculum-design (mod) | `npm run test --workspace=@uplanner/curriculum-design` | baseline | — | sin cambio esperado (config-only) |
| Smoke UPU | manual (suite) | — | — | recorrer 3 modos x 2 progresiones + Minor |

## Summary

### What was requested
En el Plan de estudio, que los campos de periodo dependan del tipo de progresion: creditos siempre, total de periodos solo si es Secuencial, tipo de periodo por confirmar.

### What was done
- **S1 (layout, mod curriculum-design)**: `totalPeriods` ahora se muestra solo con `recordType==Plan AND progression==Sequential` en los 3 layouts (`create`/`edit`/`view`). `totalCredits` y `periodType` sin cambio (DECISION-027, escenario B: `periodType` es cadencia de inscripcion/oferta, se conserva en todo Plan). Publicado a UPU con `sync:layouts`. Commit local `968a2f8` (rama `sp8-06-ago`).
- **S2 (paridad MCP, repo `uplanner/mcp` — ampliacion pedida por el dev)**: `cd_create_curriculum` / `cd_update_curriculum` rechazan `totalPeriods` en un plan Modular (update resuelve la progresion actual via `api.get`); guide/fieldDocs + 4 tests. Commit local `a9082fa` (rama `sp8-06-ago-mcp-progression-parity`).

### What was learned
- Learns capturados: 4 (0 refined, 2 discarded, 2 deferred). L1 (enum-view) y L4 (paridad MCP) discarded; L2 (seed) y L3 (RBAC) deferred a FUP-01/FUP-02.
- Decisions: DECISION-027 (periodType escenario B) usada; sin rules/bugs nuevos.
- **Observacion sistemica**: el workflow DKC de estos tickets no incluye una task "paridad MCP"; se descubrio al cierre. El MCP es capa API con contrato a mano, no sincroniza desde los layouts.

### Acceptance
TC-1..TC-7 PASS (smoke runtime UPU). MCP: `tsc` limpio + vitest 174/174 (sin regresion). Coverage: 3/3 REQs cubiertos.

### Pendiente (no bloqueante)
- **Push** de 2 ramas (`sp8-06-ago` en curriculum-design, `sp8-06-ago-mcp-progression-parity` en mcp): requiere OK del dev.
- **FUP-01** (saneo seed `progression='Credits'`) y **FUP-02** (RBAC `institution:view` para roles curriculares): follow-ups locales, prioridad `could`.

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 2 |
| Tasks completed | 4/4 (S1.T1, S1.T2, S2.T1, S2.T2) |
| Commits (local) | 2 (`968a2f8`, `a9082fa`) |
| Learns captured | 4 (2 discarded, 2 deferred) |
| Test cases | 7 pass / 0 fail / 0 pending |
| Regression | vitest MCP 174/174 (antes 170) |
| SP published / estimated / executed | null / 2 / 3 (ampliacion MCP +1) |
