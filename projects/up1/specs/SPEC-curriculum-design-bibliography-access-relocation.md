---
id: SPEC-curriculum-design-bibliography-access-relocation
project: up1
ticket: TICKET-112
status: done
---

# Reubicacion del acceso al mantenedor de Referencias bibliograficas

# Reubicacion del acceso al mantenedor de Referencias bibliograficas

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico esta en Requirements, Artifacts y Tasks. Si con esto te basta para aprobar, ese es el objetivo.*

**Que se quiere**: mover el acceso al catalogo de Referencias bibliograficas. Hoy se llega por el menu general del modulo; el usuario quiere llegar desde donde lo usa: la vista de Programa de asignatura. Se agrega un boton en ese listado que abre el catalogo en un modal, y se retira la entrada del menu general. Es 100% configuracion de layout del mod `curriculum-design` (dos archivos JSON), sin codigo nuevo. Reversible.

**Decisiones criticas que necesitan tu OK** (ya confirmadas en intake/draft):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Despliegue en **modal** via `modalActionButtons` (no vista embebida) | Es el patron del precedente `engagement_Activity_service_list`; cero componentes nuevos. Ya aprobado en draft. |
| 2 | `modalActionButtons` + `layoutNameMap` dentro de `layoutConfig` (no top-level) | Es donde el tipo `RecordListConfig` y el consumer `RecordList.vue` los leen. Ubicacion incorrecta = boton no renderiza. |
| 3 | Boton gateado por `requiredPermission: bibliographyreference:view` | Sin la capability el boton no aparece Y el modal no cargaria datos (`listInstances`). |

**Riesgos principales y como los mitigamos**:

- **UI config-driven no verificable solo por JSON/BD** → S1 cierra con smoke UI real (boton visible + modal abre + menu sin la entrada), no con "config valido". Tier T3 (DET-36).
- **`npm run sync` arrastra drift-checker preexistente ajeno** (ej. AttendanceStatus/uengagement) → usar el flavor de sync acotado a config/layouts/apps y no bloquear por drift no relacionado (ver Constraints RULE-mods-054).
- **Confundir el catalogo con la bibliografia del Programa (RT)** → el RT `rt__Bibliography__curricularsection` NO se toca; explicitado en REQ-02 y en tests de regresion.

**Que NO se hace en este ticket**:

- No se toca el flujo de bibliografia dentro del Programa (RT `rt__Bibliography__curricularsection`) — es otro objeto.
- No se crean componentes Vue ni resolvers ni objetos: solo config.
- No se modifican los layouts `default_BibliographyReference_{view,edit,create}` — siguen accesibles via el list (modal) por navegacion interna.

**Tamano estimado**: 1 session ejecutable (S1), ~1.5-2h efectivas. La parte mas riesgosa es el smoke UI post-sync (verificar render real en la suite).

**Como vas a saber que funciona**:

- Abro Programa de asignatura y veo el boton "Referencias bibliograficas"; al clickearlo se abre el catalogo en modal.
- El menu general del modulo ya NO muestra "Catalogo bibliografico".
- La seccion Bibliografia dentro de un Programa sigue funcionando igual (no se rompio el RT).

---

## Purpose

Reubicar el punto de acceso al mantenedor de `BibliographyReference` en el mod `curriculum-design`: retirarlo de `defaultObjects` (menu general) y exponerlo como `modalActionButtons` en el `RecordList` de `Activity` (Programa de asignatura), abriendo `default_BibliographyReference_list` en modal, gateado por RBAC. Cambio de configuracion de layout, propagado a core por sync.

## Requirements

### REQ-01: Boton de acceso en Programa de asignatura

> **Que cambia**: en el listado de Programa de asignatura aparece un boton "Referencias bibliograficas" que abre el catalogo (mantenedor) en un modal, sin salir de la vista.
> **Por que**: acerca el acceso al catalogo al lugar donde el usuario trabaja los programas, en vez de obligarlo a ir al menu general.

El sistema MUST renderizar, en el toolbar del `RecordList` de `Activity` (layout `default_Activity_list`), un `modalActionButton` con label "Referencias bibliograficas", icon `bi bi-journal-bookmark`, que abra el layout `default_BibliographyReference_list` (RecordList) en modal.
El sistema MUST gatear ese boton con `requiredPermission: bibliographyreference:view` (no se muestra a usuarios sin la capability).
El boton SHOULD resolver su label via `languageTag` (i18n namespaced en curriculum-design) con fallback al `label` literal.

**Actor**: user (con capability `bibliographyreference:view`)
**Layers**: config (mod), frontend (suite/layout)

<details><summary>Scenarios de validacion</summary>

#### Scenario: usuario con permiso ve y usa el boton
- **GIVEN** un usuario con capability `bibliographyreference:view` en la vista Programa de asignatura
- **WHEN** se renderiza el toolbar del listado
- **THEN** aparece el boton "Referencias bibliograficas"
- **AND** al clickearlo se abre un modal con el catalogo (`default_BibliographyReference_list`)

#### Scenario: usuario sin permiso no ve el boton
- **GIVEN** un usuario sin capability `bibliographyreference:view`
- **WHEN** se renderiza el toolbar
- **THEN** el boton NO aparece (filtrado por RBAC en `useModalActionButtons`)

#### Scenario: el modal carga datos del catalogo
- **GIVEN** el modal abierto
- **WHEN** se ejecuta `listInstances(BibliographyReference)`
- **THEN** se listan las referencias de la institucion (la capability object-level habilita la query)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: entra a Programa de asignatura, ve el boton "Referencias bibliograficas" y al hacer click ve el catalogo en un modal.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Boton declarado en config | layout `default_Activity_list` | se lee `layoutConfig.modalActionButtons` | existe 1 entrada target `default_BibliographyReference_list` | `layoutName` mapea a `default_BibliographyReference_list` via `layoutNameMap`; `requiredPermission: bibliographyreference:view` |
| 2 | Render con permiso | user con `bibliographyreference:view` | render toolbar | boton visible | smoke UI: boton presente |
| 3 | Modal abre catalogo | click en boton | apertura modal | RecordList de BibliographyReference | smoke UI: modal con filas del catalogo |

### REQ-02: Retiro del acceso general (menu)

> **Que cambia**: el catalogo de Referencias bibliograficas deja de aparecer como entrada propia en el menu/navegacion general del modulo.
> **Por que**: su acceso pasa a vivir en Programa de asignatura (REQ-01); mantenerlo tambien en el menu duplicaria el acceso.

El sistema MUST quitar `"BibliographyReference"` del array `defaultObjects` en `mods/curriculum-design/config/app.json`, de modo que el objeto ya no genere entrada de navegacion automatica.
El sistema MUST preservar intacto el flujo de bibliografia interno del Programa (RT `rt__Bibliography__curricularsection`) — ese no depende del menu.

**Actor**: user
**Layers**: config (mod), frontend (suite — `useObjectManager` arma la nav)

<details><summary>Scenarios de validacion</summary>

#### Scenario: el menu ya no muestra el catalogo
- **GIVEN** `BibliographyReference` removido de `defaultObjects` + sync corrido
- **WHEN** el usuario abre el menu general del modulo
- **THEN** NO aparece la entrada "Catalogo bibliografico"

#### Scenario (regresion): el Programa sigue mostrando su bibliografia
- **GIVEN** un Programa de asignatura con bibliografia (RT `rt__Bibliography__curricularsection`)
- **WHEN** se abre la seccion Bibliografia del Programa
- **THEN** se muestran las referencias enlazadas igual que antes (FK/relationDisplayFields intactos)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el menu del modulo y no encuentra "Catalogo bibliografico"; abre un Programa y su seccion Bibliografia sigue funcionando.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | defaultObjects sin BibliographyReference | `config/app.json` | se lee `defaultObjects` | no contiene `"BibliographyReference"` | array de 5 entradas |
| 2 | RT intacto | layouts `default_rt__Bibliography__curricularsection_*` | se leen `relationDisplayFields` | siguen referenciando `BibliographyReference: title` | sin cambios |

## Artifacts

Meta-spec aplicable: `METASPEC-layout-config` (configuracion de layout).

### Config del boton (bloque `modalActionButtons`)

Ubicacion: `mods/curriculum-design/config/layouts/default_Activity_list.json` → `layoutConfig`.

| Campo | Valor | Notas |
|-------|-------|-------|
| `label` | "Referencias bibliograficas" | fallback si no hay traduccion |
| `languageTag` | `curriculumDesign.action.bibliographyReferences` (o key equivalente del namespace del mod) | resuelto via `$t`, fallback a `label` |
| `icon` | `bi bi-journal-bookmark` | Bootstrap Icons |
| `layoutName` | `bibliographyReferences` (alias logico) | mapea via `layoutNameMap` |
| `layoutType` | `RecordList` | abre el list en modal |
| `objectName` | `BibliographyReference` | |
| `requiredPermission` | `bibliographyreference:view` | RBAC gating |
| `modalTitle` | "Referencias bibliograficas" | titulo del modal |

`layoutNameMap`: `{ "bibliographyReferences": "default_BibliographyReference_list" }`.

### Config del menu (`defaultObjects`)

Ubicacion: `mods/curriculum-design/config/app.json`.

| Antes | Despues |
|-------|---------|
| `["Activity", "BibliographyReference", "AcademicProgram", "Offering", "Curriculum", "core_DataLog"]` | `["Activity", "AcademicProgram", "Offering", "Curriculum", "core_DataLog"]` |

## Tasks

### Session 1 — Reubicar acceso (config) + i18n + tests + docs + sync/smoke [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Quitar `"BibliographyReference"` de `defaultObjects` | REQ-02 | developer | — | `mods/curriculum-design/config/app.json` | JSON valido + grep confirma ausencia (array de 5) | git revert | DET-16 | done | 1 |
| S1.T2 | Agregar bloque `modalActionButtons` + `layoutNameMap` en `layoutConfig` (label, languageTag, icon `bi bi-journal-bookmark`, layoutName→`default_BibliographyReference_list`, layoutType RecordList, objectName, `requiredPermission: bibliographyreference:view`, modalTitle) | REQ-01 | developer | — | `mods/curriculum-design/config/layouts/default_Activity_list.json` | JSON valido + shape vs `ModalActionButton` (recordlist.ts:418-450) | git revert | DET-1, DET-2, DET-11 | done | 1 |
| S1.T3 | Agregar key i18n del boton + traduccion en el lang del mod (fallback a label si ausente) | REQ-01 | developer | S1.T2 | `mods/curriculum-design/lang/es/*.i18n.json` | key resuelve a "Referencias bibliograficas" | git revert | DET-1, DET-2 | done | 1 |
| S1.T4 | Actualizar/crear test de integracion: `defaultObjects` sin `BibliographyReference` + presencia del `modalActionButton` con target y `requiredPermission` correctos; regresion RT `rt__Bibliography__curricularsection` | REQ-01, REQ-02 | developer | S1.T1, S1.T2 | `mods/curriculum-design/tests/integration/layouts-declared.test.ts` (+ nuevo caso) | vitest del mod en VERDE | git revert | DET-7, DET-13 | done | 1 |
| S1.T5 | Revisar docs del mod por referencias al acceso de menu de bibliografia; actualizar si mencionan la entrada retirada (DET-37 dim1) | REQ-02 | researcher | S1.T1 | `mods/curriculum-design/.ai/*`, `mods/curriculum-design/README*` | grep sin referencias stale; doc coherente (o N/A con razon) | git revert | DET-16 | done | 1 |
| S1.T6 | `npm run sync` (flavor config/layouts/apps, evitar drift ajeno) + smoke UI: boton visible, modal abre el catalogo, menu sin la entrada, seccion Bibliografia del Programa intacta | REQ-01, REQ-02 | developer | S1.T2, S1.T3, S1.T4 | (runtime suite) | smoke UI real: screenshot/DOM con boton + modal + menu sin entrada | git revert de `app.json` + `default_Activity_list.json` | DET-33, DET-36 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir resultados en `## Sessions` con Template de Gate, correr T3 (unit del mod + smoke UI), decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5, S1.T6 | ticket | gate persistido + evidencia runtime | (no aplica) | DET-20, DET-23, DET-36 | done | 1 |

### Task contract (detalle)

```
Task S1.T2: Agregar modalActionButtons + layoutNameMap
- source_ref: REQ-01
- agent: developer
- files: mods/curriculum-design/config/layouts/default_Activity_list.json
- precondition: layout default_Activity_list existe con layoutConfig (confirmado H3)
- expected_output: layoutConfig.modalActionButtons con 1 entrada + layoutNameMap; boton renderiza tras sync
- validation: JSON valido; shape vs ModalActionButton (recordlist.ts:418-450); precedente engagement_Activity_service_list como plantilla
- rollback: git revert del archivo
- rules: [DET-1, DET-2, DET-11]

Task S1.T6: sync + smoke UI
- source_ref: REQ-01, REQ-02
- agent: developer
- files: runtime (suite) — sin edicion de fuente adicional
- precondition: S1.T2/T3/T4 completas
- expected_output: en la suite, boton visible en Programa de asignatura, modal abre catalogo, menu sin "Catalogo bibliografico", seccion Bibliografia del Programa intacta
- validation: smoke UI real (screenshot/DOM/console con marca de corrida) — NO referencia a test file (DET-36)
- rollback: git revert de app.json + default_Activity_list.json
- rules: [DET-33, DET-36]
```

## Constraints

- **RULE-dev-004** (mod-only branching, global/must): el ticket es `layer: mod`; la rama y los commits viven mod-side (`mods/curriculum-design/`), nunca sobre `develop`/`main`. El sync propaga a core sin commit de core.
- **RULE-mods-054** (should): al sincronizar, usar el flavor acotado a config/layouts/apps para no arrastrar el drift-checker preexistente ajeno al ticket (ej. AttendanceStatus/uengagement). No usar `npm run sync` full si dispara drift no relacionado.
- **RULE-layout-038** (layout/must): mecanismos de UI condicional del layout engine (`conditions`, RBAC) — el gating del boton usa `requiredPermission`, patron nativo soportado.
- **DET-16** (propagacion): quitar del menu implica verificar que ninguna doc/test del mod dependa de la entrada retirada (cubierto por S1.T4/T5).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| npm run sync | internal | Propaga config del mod (app.json + layouts) a core (suite) | Si no corre, el render no toma los cambios |
| suite (RecordList) | internal | Render del boton + modal | — |
| object-manager (listInstances) | internal | Carga de datos del catalogo en el modal | Requiere capability `bibliographyreference:view` |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| UI no verificable solo por config/BD (feedback verify-rendered-ui) | high | cierre en falso | S1.T6 smoke UI real, tier T3, gate DET-36 |
| `npm run sync` full arrastra drift ajeno | medium | bloqueo del sync por drift no relacionado | flavor acotado (RULE-mods-054); no corregir drift ajeno (fuera de scope SP4/mod) |
| Confundir catalogo con bibliografia del Programa (RT) | low | tocar el RT por error | REQ-02 explicita el limite; S1.T4 regresion del RT |
| i18n key sin traduccion | low | label en key crudo | fallback nativo a `label` (useModalActionButtons.ts:143-148) |

## Open questions

(ninguna — H1/H2/H3/H4/H5 convergidas; decisiones de despliegue, ubicacion, RBAC y cosmetica cerradas en intake/draft)

## Decisions

### DEC-LOCAL-01: Despliegue en modal (no vista embebida)
- **Contexto**: el ticket menciona "modal o la vista"; hay dos mecanismos (modalActionButtons vs associatedLayoutConfigs)
- **Drivers**: patron del precedente, cero componentes nuevos, cambio minimo
- **Opcion elegida**: modal via `modalActionButtons`
- **Alternativas**: vista embebida (`associatedLayoutConfigs`) — descartada por no ser el patron del ticket ni del precedente
- **Consecuencias**: el catalogo se ve en capa modal; implementacion trivial y reversible
- **Session**: intake/draft (aprobado por el dev 2026-07-24)

### DEC-LOCAL-02: modalActionButtons/layoutNameMap dentro de layoutConfig
- **Contexto**: donde declarar el bloque en el JSON
- **Drivers**: el tipo `RecordListConfig` y el consumer `RecordList.vue:2100,2153` los leen de `layoutConfig`
- **Opcion elegida**: dentro de `layoutConfig`
- **Alternativas**: top-level — descartada (no lo lee el consumer)
- **Consecuencias**: boton renderiza correctamente
- **Session**: intake

## Technical reference

- Tipo: `layout/src/types/recordlist.ts:418-450` (`ModalActionButton`), `:803-807` (`RecordListConfig.modalActionButtons` + `layoutNameMap`).
- Render: `layout/src/layouts/RecordList.vue:132-144`; consumo `:2100,2153`.
- Composable: `layout/src/composables/useModalActionButtons.ts` (cap 3, filtro RBAC, resolucion label `:143-148`).
- Precedente: `mods/uengagement-up1/config/layouts/engagement_Activity_service_list.json:86-98`.
- RBAC: `mods/curriculum-design/seed/_data-rbac.js:81` (`bibliographyreference:view` en READ_CAPS).
- Menu: `mods/curriculum-design/config/app.json:9` (`defaultObjects`); consumer `suite/composables/useObjectManager.ts:561-577`.

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-01 y REQ-02 pasan (smoke UI S1.T6)
- [x] **Tests** (DET-37 dim4): test de integracion del mod actualizado + regresion RT, corridos y en VERDE (1238/1238 suite, 154/154 archivo)
- [x] **NFRs**: N/A (no aplican para config de layout)
- [x] **Rules**: RULE-dev-004 (mod-only), RULE-mods-054 (sync acotado), RULE-layout-038 respetadas
- [x] **Integration**: no rompe la bibliografia del Programa (RT) ni otros accesos (RT intacto, 0 archivos tocados)
- [x] **Docs oficiales del proyecto** (DET-37 dim1): revisadas (S1.T5); sin refs stale al acceso retirado
- [x] **KB DKC** (DET-37 dim2): emergio RULE-mods-055 (showInNav:false como toggle real de nav de layouts de mod; refina rule-mods-010/020). Promovida en el close.
- [x] **Docs externas DKC** (DET-37 dim3): N/A (ticket de producto, no toca DKC)
- [x] **Planning-completeness**: entry `planning-completeness` registrada

## Rules discovered

- **RULE-mods-055** (`must`, module mods): para ocultar un layout de mod del nav se usa `showInNav: false`; quitarlo de `defaultObjects` no basta. Promovida desde el learn L1 de TICKET-112 (smoke S1.T6 refuto la hipotesis H2 del intake). Cross-link: rule-mods-010, rule-mods-020.
