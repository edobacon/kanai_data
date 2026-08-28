---
id: TICKET-112
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1451
module: curriculum-design
autopilot: autonomous
---

# SP6 - Acceso a mantenedor de Referencias bibliograficas

> **Jira [UPONE-1451](https://u-planner.atlassian.net/browse/UPONE-1451)** · Epica [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) · **2 SP** · `layer: mod` · `creates_visual: true`.
> **Ficha de analisis SP6 (fuente del trasfondo):** `uplanner/specs/up1/sp6/UPONE-1451-acceso-bibliografia.md`. Verificacion en codigo 2026-07-21. Es el ticket mas acotado del sprint.

## Request

> *(literal de UPONE-1451 - DET-3: no reescribir)*

Se requiere:
- Configurar el acceso del mantenedor de Referencias bibliograficas desde un boton en la vista de Programa de asignatura
- Ya no se debe visualizar la pestana del mantenedor de Referencias bibliograficas

## Que es

Reubicar el acceso al mantenedor de referencias bibliograficas: agregar un boton en la vista de Programa de asignatura (RecordList de Activity) y **quitar** el objeto del acceso general (menu).

## Classification

| Campo | Valor |
|---|---|
| Tipo de trabajo | implement |
| Tipo de cambio | Config de layout pura (sin codigo): quitar objeto de defaultObjects + modalActionButtons que abre el mantenedor en modal |
| Modulo principal | curriculum-design (mod) |
| Modulos afectados | curriculum-design (config/app.json + default_Activity_list.json). Sync propaga a core. |

## Context found (verificado en codigo 2026-07-21, ver ficha SP6)

- **`BibliographyReference`** es un catalogo por institucion (FK `institutionId`), con layouts `default_BibliographyReference_{list,view,edit,create}`.
- **Esta como objeto top-level** en `config/app.json` -> `defaultObjects` = el "acceso general" que el ticket quiere quitar.
- **Ojo, dos "bibliografia" distintas:** la pestana "Bibliografia" de Activity (`default_Activity_view.json:69`, `bibliographyList`) muestra `rt__Bibliography__curricularsection` (contenido del programa) - **NO se toca**. El ticket habla del **mantenedor de catalogo** (`BibliographyReference`).
- **Alcance confirmado por el dev (2026-07-21):** retirar el menu del objeto `BibliographyReference` del acceso general y anadirlo como **boton extra en el RecordList de Programa de asignatura**.
- **Mecanismo:** `modalActionButtons` del RecordList (`layout/src/types/recordlist.ts:796`; render en `layout/src/layouts/RecordList.vue:132`). Abre otro layout (RecordList) en modal.
- **Precedente identico:** `mods/uengagement-up1/config/layouts/engagement_Activity_service_list.json` (boton "Tipos de actividad" que abre `ActivityType` como RecordList en modal). Tambien `mods/up1-manager/config/layouts/recordtype-edit.json`.

**Cambios concretos:**
1. Quitar `"BibliographyReference"` de `defaultObjects` en `mods/curriculum-design/config/app.json`.
2. Agregar `modalActionButtons` en `default_Activity_list.json` que abra `default_BibliographyReference_list` (RecordList) en modal, con `requiredPermission: bibliographyreference:view`.

## Pre-spec (AC de Jira)

| REQ | Certeza | source_ref | Enunciado |
|---|---|---|---|
| REQ-01 · boton en Programa de asignatura | confirmed | AC Jira | Boton (custom/modalActionButtons) en la vista de Programa de asignatura que abre el mantenedor de Referencias bibliograficas. |
| REQ-02 · quitar del acceso general | confirmed | AC Jira | Ya no se visualiza la pestana/menu del mantenedor en el acceso general. |

## Triage

> Hipotesis del intake convergidas por `intake-explore` (grounding en codigo real `uplanner/up1`, 2026-07-24). Las decisiones abiertas de la ficha se resolvieron como H1/H2/H5.

| H | Hipotesis | Status | Evidencia (multi-capa, DET-5) |
|---|-----------|--------|-------------------------------|
| H1 | El acceso se resuelve con `modalActionButtons` en el RecordList de Activity que abre `default_BibliographyReference_list` en **modal** (vs vista embebida) | ✓ confirmed | **config/types**: `layout/src/types/recordlist.ts:418-450` (`ModalActionButton`: `layoutName`, `layoutType`, `modalTitle`, `requiredPermission`, `languageTag`). **frontend**: `layout/src/layouts/RecordList.vue:132-144` (render en toolbar) + `layout/src/composables/useModalActionButtons.ts` (cap 3 botones, filtra RBAC). **precedente**: `mods/uengagement-up1/config/layouts/engagement_Activity_service_list.json:86-98` (identico: abre `ActivityType` list en modal). El mecanismo abre en modal por diseno → resuelve decision abierta 1. Alternativa `associatedLayoutConfigs` (embebido) queda como opcion a confirmar en design-draft. |
| H2 | Quitar `BibliographyReference` de `defaultObjects` NO rompe otros accesos | ✓ confirmed | **config**: `mods/curriculum-design/config/app.json:9` (`defaultObjects` de 6 entradas). **consumer**: `suite/composables/useObjectManager.ts:561-577` (el array arma nav automatica + orden de grupos; quitarlo solo saca la entrada de nav). **flujo del Programa**: usa el RT `rt__Bibliography__curricularsection` (`objects/RecordTypes/rt__Bibliography__curricularsection.json:8,15,17`, FK `references: BibliographyReference` via `relationDisplayFields`) → es FK-picker interno, NO navega al menu. Ningun layout del mod abre `default_BibliographyReference_*` como target hoy (grep rowActions/modalActionButtons). Resuelve decision abierta 3. |
| H3 | `modalActionButtons` + `layoutNameMap` van DENTRO de `layoutConfig` de `default_Activity_list.json` | ✓ confirmed | **types**: `RecordListConfig` en `layout/src/types/recordlist.ts:803-807`. **consumo**: `RecordList.vue:2100,2153` via `props.layoutConfig.modalActionButtons` / `layoutNameMap`. **destino**: `mods/curriculum-design/config/layouts/default_Activity_list.json` (keys de `layoutConfig`: filters, columns, order, rowActions, ...; hoy SIN el bloque). |
| H4 | El boton se gatea con `requiredPermission: bibliographyreference:view` | ✓ confirmed | **seed/RBAC**: `mods/curriculum-design/seed/_data-rbac.js:81` (`READ_CAPS`; necesaria para `listInstances(BibliographyReference)`). String exacto `bibliographyreference:view`. |
| H5 | Label / icon / i18n del boton (cosmetico) | ✓ confirmed | Resuelto por el dev en design-draft (2026-07-24): label **"Referencias bibliograficas"**, icon `bi bi-journal-bookmark`, `languageTag` namespaced curriculum-design + fallback a `label`. Mecanismo: `languageTag` opcional con fallback (`useModalActionButtons.ts:143-148`). Resuelve decision abierta 2. |

**Precondiciones operativas (HOR-128 P3)**: cambio config-only; `npm run sync` debe propagar `config/app.json` + `default_Activity_list.json` a core (suite) para que el render lo tome. Verificacion final = smoke UI real (boton visible + modal abre + entrada de menu desaparece), no solo config+BD (feedback verify-rendered-ui).

### Decisiones del intake

- **DEC-LOCAL-01 — Despliegue en modal (no vista embebida)**: el mecanismo `modalActionButtons` abre el layout target en modal; es el patron del precedente `engagement_Activity_service_list`. Alternativa embebida (`associatedLayoutConfigs`) descartada por no ser el patron del ticket ni del precedente; se reconfirma visualmente en design-draft. Reversible (config).
- **DEC-LOCAL-02 — Botones/RBAC dentro de `layoutConfig`**: `modalActionButtons`/`layoutNameMap` se declaran en `layoutConfig` de `default_Activity_list.json` (confirmado por el tipo y el consumer), no top-level.

## Setup

| Campo | Valor |
|---|---|
| Branch | mod-only (RULE-dev-004); nunca develop/main. |
| Test data | Institucion con BibliographyReference sembradas + Activity. |
| Services | suite (RecordList + modal), object-manager (listInstances) |

## Observaciones / decisiones abiertas

1. ~~Forma de despliegue: modal vs vista embebida~~ → **resuelto (H1 / DEC-LOCAL-01)**: modal via `modalActionButtons`. Reconfirmar visualmente en design-draft.
2. ~~Definir `icon` y `languageTag`/i18n del boton~~ → **cosmetico, propuesta en H5**: label "Referencias bibliograficas", icon `bi bi-journal-bookmark`, `languageTag` namespaced. Se cierra en design-draft.
3. ~~Verificar consumidores del menu~~ → **resuelto (H2)**: quitar de `defaultObjects` solo saca la nav automatica; el flujo de bibliografia del Programa usa el RT, no el menu. Sin consumidores rotos.

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-07-24 | false → super | Dev invoco `/dkc 112 super autopilot` — ejecucion autonoma por-ticket hasta terminar (el close sigue requiriendo OK explicito, DET-30) | S1 (arranque de execute) |

### Plan de sessions (preplanificacion)

1 session prevista. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria) lo completa `design-feature`. Cambio config-only (2 archivos JSON del mod), propagado por sync.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Quitar `BibliographyReference` de `defaultObjects` + agregar `modalActionButtons` (boton→modal `default_BibliographyReference_list`, RBAC `bibliographyreference:view`) en `default_Activity_list.json`; sync; smoke UI | 1 | T3 | ~3 (edit app.json, edit default_Activity_list.json, sync+smoke) | ⚑ fuerte | Boton visible en Programa de asignatura, modal abre el mantenedor, entrada de menu de BibliographyReference desaparece; sin regresion del flujo de bibliografia del Programa (RT) |

**Notas del esqueleto**:
- **Numeracion continua** (DET-20): no hay `### Session N` previa registrada → el plan arranca en S1.
- Tier **T3** por ser user-facing (creates_visual) + DET-36 (verificacion runtime/UI): requiere smoke real, no solo config+BD.
- **⚑ fuerte** por validacion empirica de UI config-driven (el RecordList filtra a campos reales; el boton/modal se ve solo tras sync + render) y por ser cambio con impacto en el menu de todos los tenants del mod.

### Session 1 — 2026-07-24 — Reubicar acceso (config) + i18n + tests + docs + sync/smoke [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa + smoke UI)

**Objetivo**: Quitar `BibliographyReference` de `defaultObjects` (menu) y agregar el `modalActionButton` que abre `default_BibliographyReference_list` en modal desde el RecordList de Programa de asignatura, gateado por `bibliographyreference:view`; i18n + tests + docs; sync y smoke UI real.

**Tasks completadas**:
- [x] S1.T1 — Quitar `"BibliographyReference"` de `defaultObjects` (`config/app.json`)
- [x] S1.T2 — Agregar `modalActionButtons` + `layoutNameMap` en `layoutConfig` de `default_Activity_list.json`
- [x] S1.T3 — Agregar key i18n del boton (fallback a label si ausente)
- [x] S1.T4 — Test de integracion: `defaultObjects` sin `BibliographyReference` + presencia del `modalActionButton` con target y `requiredPermission`; regresion RT
- [x] S1.T5 — Revisar docs del mod por referencias al acceso de menu retirado (DET-37 dim1)
- [x] S1.T6 — `npm run sync` (flavor config/layouts/apps) + smoke UI real (boton visible, modal abre, menu sin entrada, RT intacto)
- [x] S1.GATE — Gate de sync Session 1 (T3): persistir resultados, correr unit del mod + smoke UI, decidir continue/iterate/escalate

**Discoveries / Learns nuevos**:
- L1: **Quitar un objeto de `defaultObjects` NO lo retira del menu — solo reordena.** El smoke de S1.T6 mostro "Referencia bibliografica" todavia en el nav pese a la BD actualizada. Causa raiz (`suite/composables/useObjectManager.ts`): `getLayoutsForApp` (L70-94) incluye en el nav (a) layouts explicitos del app (`applicationId === appId`) **incondicionalmente** + (b) default layouts (`applicationId: null`) de objetos en `defaultObjects`. `default_BibliographyReference_list` tiene `applicationId` = app curriculum-design (todos los layouts del mod son explicitos tras sync), asi que aparece siempre; `defaultObjects` solo controla el ORDEN de los grupos visibles (L561-577, no-listados van al final). **La hipotesis H2 del intake era incorrecta.** Mecanismo real de retiro del menu: `showInNav: false` en el `layoutConfig` (filtro en `navObjects`, L460-469: `if (!isActive || !layout.showInNav) return false`). El modal sigue funcionando porque abre por `layoutId` directo (`useModalActionButtons.handleClick`), independiente del nav. `detected_by: smoke (S1.T6)`. `status: refined`. `promoted_to: RULE-mods-055` (aprobado por el dev en el close, 2026-07-27; regla `must` del modulo mods, cross-link a rule-mods-010/020).

**Failed approaches**:
- **Retirar el menu solo via `defaultObjects` (plan original de la spec / H2)**: insuficiente. Removido de `config/app.json` pero el nav siguio mostrando la entrada (layout explicito del app). Corregido agregando `showInNav: false` en `default_BibliographyReference_list.json`. La remocion de `defaultObjects` se mantiene (deja el objeto fuera del orden declarativo, coherente con "ya no es objeto de menu"), pero NO es lo que oculta la entrada.

**Validacion del tier** (T3):
- T1/T2 — vitest del mod: **1238/1238 pass** (70 files), incluye layouts-declared.test.ts 154/154 con los 5 casos nuevos (REQ-01/02 + regresion RT). Cero regresion.
- T3 — smoke UI real (suite localhost:3000, tenant UPU, user eduardo.bacon+clerk_test): **pass**. (1) menu de curriculum-design sin "Referencia bibliografica" (5 entradas); (2) boton "Referencias bibliograficas" visible en el toolbar de Programas de asignatura; (3) click abre modal "Referencias bibliograficas" (Modo Vista) con el Catalogo bibliografico (RecordList) y 9 referencias reales cargadas; (4) RT `rt__Bibliography__curricularsection` intacto (0 archivos tocados).

**Quality review (DET-23)**:

**Reviewer**: loop dual-judge (DET-35, T3) — 2 jueces ciegos en paralelo, tier balanced. Sin disputa → sin adjudicador reasoning.
**Tier de revision**: exhaustive
**Resultado global**: pass (APPROVED — ambos jueces approve, convergencia total)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Config-only; reusa patron del precedente engagement_Activity_service_list; sin duplicacion |
| 2 | Lint | n/a | ESLint del workspace roto (preexistente, ajeno al diff); inspeccion manual sin issues |
| 3 | Tipado | pass | `any` del test nuevo (finding real de Judge A) fixeado a `{ layoutName?: string }` |
| 4 | Testing | pass | 5 tests nuevos trazan a REQ-01/02 + regresion RT; 154/154 (archivo), 1238/1238 (suite), re-corridos por ambos jueces |
| 5 | Escalabilidad | pass | 1 modalActionButton (cap 3, MAX_MODAL_ACTION_BUTTONS) |
| 6 | Mantenibilidad | pass | Reusa contrato tipado ModalActionButton/RecordListConfig; sin codigo nuevo |
| 7 | Claridad | pass | Test documenta por que showInNav:false es el mecanismo real |
| 8 | A11y | n/a | Config-only; boton con icono+label via componente compartido |
| 9 | Storybook | n/a | Sin componente nuevo |
| 10 | Error-handling | n/a | Sin logica nueva; consumers manejan ausencia de map/permission con early return |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Findings confirmados**: (1) `defaultObjects` removal es no-op funcional — `showInNav:false` es el mecanismo real (documentado en test, no es bug; se mantiene el removal por coherencia semantica). (2) `any` en test nuevo → fixeado. INFO: object-manager tiene cambios de codegen (schema.prisma, typeDefs) PRE-EXISTENTES, ajenos al ticket y fuera de execute_scope; no tocados.

**Contexto retomable**: cambio completo y verificado en runtime. Commit local `f4b37f6` en rama `feat/UPONE-1451-bibliography-access` (mod repo). Pendiente: OK del dev para cerrar (DET-30) + push (siempre pregunta).
**Commit DET-27**: `f4b37f6` feat(curriculum-design): relocate bibliography catalog access

## Commits

| Hash | Fecha | Mensaje | Tasks | REQ |
|------|-------|---------|-------|-----|
| `f4b37f6` | 2026-07-24 | feat(curriculum-design): relocate bibliography catalog access | S1.T1–S1.T6 | REQ-01, REQ-02 |

## Backlog

| Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|------|-----|----------|------------|--------------|-----------|
| B1 · Botón de acción que abra el catálogo como **ruta** (página completa) en vez de modal | REQ-01 (mejora UX) | Descubierto en S1.T6/close de TICKET-112 | Hoy `modalActionButtons` es modal-only (`layout/src/types/recordlist.ts:418-450`; `useModalActionButtons.handleClick` siempre `openModal`). El modal del catálogo anida sub-modales (view/edit/crear). El dev aceptó el modal para este ticket. | Cambio **core** (RULE-dev-004, rama épica UPONE-1267): agregar `openMode?: 'modal' \| 'route'` a `ModalActionButton`; en `useModalActionButtons.handleClick`, si `route`, emitir navegación a `/{tenant}/{object}/RecordList/{layoutId}` (el suite ya rutea listas por ese patrón) en vez de `openModal`; extender el handler `navigate-to-relation` del suite para target RecordList. Config del mod: `openMode: 'route'` en el botón. Reusable para todos los mods. | could |

## Summary

### What was requested
Reubicar el acceso al mantenedor de Referencias bibliograficas: boton en la vista de Programa de asignatura + retirar la pestana/menu del acceso general.

### What was done
- El usuario ve ahora un boton **"Catalogo bibliografico"** en la barra del listado de Programas de asignatura que abre el catalogo (`default_BibliographyReference_list`) en modal, gateado por `bibliographyreference:view`.
- La entrada del catalogo desaparecio del menu general del modulo (via `showInNav: false`).
- El flujo de bibliografia del propio Programa (RT `rt__Bibliography__curricularsection`) quedo intacto.
- Copy unificado a "Catalogo bibliografico" (label + modalTitle + i18n es/pt).
- 100% configuracion de layout del mod (3 archivos JSON), propagada por sync. Cero codigo core nuevo.

### What was learned
- Learns capturados: 1 (1 refined, 0 discarded).
- Rules creadas (promovidas): **RULE-mods-055** — `showInNav: false` es el toggle real de visibilidad del nav para layouts de mod (refina rule-mods-010/020).
- Decisions: DEC-LOCAL-01 (modal, no vista embebida), DEC-LOCAL-02 (`modalActionButtons` dentro de `layoutConfig`).
- Bugs: ninguno propio. Descubrimiento colateral ajeno (RecordDetail view / UPONE-1353) reportado, no corregido aqui.

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 1 |
| Tasks completed | 7/7 (S1.T1–T6 + S1.GATE) |
| Commits | 1 (`f4b37f6`, local) |
| Learns captured | 1 |
| Learns → rules | 1 (RULE-mods-055) |
| Learns → bugs | 0 |
| Learns → decisions | 0 (2 DEC-LOCAL registradas en intake) |
| Learns discarded | 0 |
| Test cases | 5 pass / 0 fail / 0 pending (+ smoke UI runtime) |
| Failed approaches | 1 (retiro solo via `defaultObjects`) |
| SP published / estimated / executed | 2 / 2 / 1 (sessions-heuristic) |
| SP breakdown (llm / human) | 1 / 1 |
| SP delta (executed − published) | −1 (−50%) |
| SP delta vs calculo (manual override) | − (−) |

### Pendiente (no bloqueante)
- **Backlog B1** (`could`): boton→ruta full-page (requiere cambio core, epica UPONE-1267).
- **Push**: pendiente por decision del dev ("no pushear aun"). El commit `f4b37f6` queda local en `feat/UPONE-1451-bibliography-access`.
- **Descubrimiento colateral** (RecordDetail view / UPONE-1353): el dev lo toma por separado.

## Estado del cierre

**Cerrado el 2026-07-27** tras OK explicito del dev ("cierra 112"). Trabajo completo y verificado (REQ-01/02, smoke UI, dual-judge APPROVED). Gates de cierre en verde: teach-close.html (DET-22) generado y validado, SP executed calculado (DET-26), L1 promovido a RULE-mods-055 (aprobado por el dev), spec `done`, validators SessionBlock/SpecTask/StatusCoherence OK. El push sigue pendiente por decision del dev.

## Descubrimiento colateral (fuera de scope de este ticket)

Durante el smoke, el dev notó que el **view** de `Activity` muestra los campos vacíos (edit sí trae datos; otros objetos ok). Diagnóstico (verificado en runtime, no es de TICKET-112):

- **Causa raíz**: `layout/src/layouts/RecordDetail.vue:212` importa de `./recordDetailReferenceFilters` sin `replaceRecordPlaceholders`, pero esa función se usa en 6 call-sites (4513/4537/4571/4586/4600/4706) → `ReferenceError: replaceRecordPlaceholders is not defined` → aborta el render del view.
- **Solo afecta views con placeholders `{{record.*}}`** en filtros de referencia (Activity view: `versionsList` filtra por `{{record.code}}`). Views sin ese patrón (AcademicProgram) funcionan. Edit no dispara el path.
- **Regresión (origen exacto)**: commit **`52588ba`** (Ignacio Jorquera, 2026-07-15, *"fix: resolve record filters after loading edit data"*) — creó `recordDetailReferenceFilters.ts` y extrajo ahí `replaceRecordPlaceholders` + `resolveFilterPlaceholders` (borró sus defs locales de `RecordDetail.vue`), pero el nuevo import solo trajo `resolveFilterPlaceholders`. `replaceRecordPlaceholders` quedó sin importar pese a sus 6 call-sites. El commit `ea423651` (mismo día) tocó ese import de nuevo y tampoco lo incluyó (perpetuó, no originó).
- **Ticket/PR**: llegó a `develop` vía **PR #298** (rama `feat/UPONE-1353`), merge `38c1af7` el **2026-07-17**. Ticket **[UPONE-1353](https://u-planner.atlassian.net/browse/UPONE-1353)** — "RBAC-01 — Un rol institucional puede tener un rol interno distinto en cada mod" (épica UPONE-1355 "Capabilities Bundle"), assignee Ignacio Jorquera, hoy en "Revisión de compañeros". El refactor de filtros fue trabajo colateral dentro de ese PR de RBAC.
- **Impacto amplio**: todo RecordDetail **view** que resuelva placeholders `{{record.*}}` en filtros de referencia (no solo Activity).
- **Fix (core, `layout/`)**: agregar `replaceRecordPlaceholders` al import de `RecordDetail.vue:212`. Una línea. Por RULE-dev-004 va en rama + revisión del team, no directo a develop. **El dev decidió tomarlo él** (solo reporte).
