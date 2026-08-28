---
id: SPEC-curriculum-design-academic-activity-list
project: up1
type: doc
module: curriculum-design
status: done
tags:
  - layout
  - recordlist
  - curriculum-design
  - academic-activity
  - multi-tenant-phase-1
---

# Vista general listado de Programa de asignatura (`AcademicActivity`)

## Purpose

Configurar el layout default `RecordList` del objeto `AcademicActivity` (Programa de asignatura) en el mod `curriculum-design`, de modo que sea la vista de aterrizaje del mod en up1 y aparezca en el menu de objetos. El listado expone columnas clave del programa y permite filtrar por Estado, Codigo, Nombre y Unidad Organizativa (esta ultima como stub UI por DECISION-002). Cubre el inicio de [CAP-CUR-014](capabilities/CAP-CUR-014.md): "lista de programas creados".

## Requirements

### REQ-01: Listado renderiza programas del tenant activo

El sistema MUST renderizar un listado tabular de `AcademicActivity` filtrado por `tenantId` (aplicado automaticamente por la plataforma) cuando el coordinador navega al modulo `curriculum-design`.

**Actor**: coordinador-curso, jefe-departamento
**Layers**: frontend (LayoutOrchestrator → RecordList), config (layout JSON), backend (object-manager filtra por `tenantId`)

#### Scenario: tenant UPU con datos del seed
- **GIVEN** seed de `curriculum-design` cargado en tenant `UPU` (Univalle + AIEP, DECISION-012 Fase 1)
- **WHEN** el usuario abre el mod `curriculum-design` y selecciona "Programa de asignatura" en el menu de objetos
- **THEN** ve una tabla con 5 columnas (`Nombre`, `Codigo`, `Version`, `Nivel`, `Estado`) y 2 filas
- **AND** las filas son `Ecuaciones Diferenciales` (`UV-ECDIF-1124`) y `Introduccion a las Redes` (`AIEP-INTRO-REDES-14757`), en orden alfabetico por nombre

#### Scenario: tenant sin programas
- **GIVEN** un tenant sin registros de `AcademicActivity`
- **WHEN** el usuario abre el listado
- **THEN** la tabla muestra el componente `EmptyState` con mensaje informativo

#### Scenario: layout NO tiene `applicationId` declarado
- **GIVEN** archivo `default_AcademicActivity_list.json` sin campo `applicationId`
- **WHEN** se ejecuta `npm run sync` (Phase 6 — Apps&Layouts)
- **THEN** el sync asigna `applicationId` correspondiente a la app `curriculum-design`
- **AND** el layout aparece en el menu de objetos del mod (RULE-mods-009)

#### Acceptance
**El usuario puede verificar que funciona**: entra a `/UPU/curriculum-design`, ve "Programa de asignatura" en el dropdown del menu de objetos, hace click y ve los 2 programas del seed.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Render UPU con 2 filas | Seed cargado en UPU | Abrir listado | Tabla con 2 filas | Univalle + AIEP visibles, ordenadas por nombre |
| 2 | Filtro tenantId aplicado | Listado abierto en UPU | Inspeccionar query GraphQL | `where: { tenantId: "UPU" }` automatico | Query incluye filtro tenant |
| 3 | Layout aparece en nav | Layout creado sin `applicationId` | `npm run sync` | Sync asocia layout a app `curriculum-design` | Item visible en menu de objetos |

### REQ-02: Filtro `Estado` (workflowState)

El sistema MUST permitir filtrar el listado por `workflowState` mediante un control select con los 6 valores del enum.

**Actor**: coordinador-curso
**Layers**: frontend (filtro en RecordList), backend (GraphQL `where: { workflowState: { equals: ... } }`)

#### Scenario: filtro Approved
- **GIVEN** listado UPU con 2 filas, ambas en `Approved`
- **WHEN** usuario selecciona "Approved" en el filtro Estado
- **THEN** las 2 filas siguen visibles

#### Scenario: filtro Draft (sin matches)
- **GIVEN** listado UPU con 2 filas, ambas en `Approved`
- **WHEN** usuario selecciona "Draft"
- **THEN** la tabla muestra `EmptyState` (0 filas)

#### Acceptance
**El usuario puede verificar que funciona**: selecciona valores del dropdown Estado y observa cambios en la tabla.

### REQ-03: Filtros texto `Codigo` y `Nombre`

El sistema MUST permitir busqueda libre por `code` y por `name` mediante inputs de texto, con matching case-insensitive y substring.

**Actor**: coordinador-curso
**Layers**: frontend, backend (GraphQL `contains` operator)

#### Scenario: busqueda parcial por codigo
- **GIVEN** listado UPU con 2 filas
- **WHEN** usuario escribe `"UV"` en el filtro Codigo
- **THEN** solo se ve la fila Univalle (`UV-ECDIF-1124`)

#### Scenario: busqueda parcial por nombre
- **GIVEN** listado UPU con 2 filas
- **WHEN** usuario escribe `"redes"` en el filtro Nombre
- **THEN** solo se ve la fila AIEP (`Introduccion a las Redes`)

#### Scenario: filtro vacio
- **GIVEN** listado filtrado con 1 fila visible
- **WHEN** usuario borra el contenido del filtro
- **THEN** las 2 filas vuelven a ser visibles

#### Acceptance
**El usuario puede verificar que funciona**: escribe en los inputs Codigo/Nombre y ve la tabla filtrarse en vivo.

### REQ-04: Filtro `Unidad Organizativa` como stub deshabilitado

El sistema MUST renderizar el control de filtro UO en estado deshabilitado (no funcional), con tooltip indicando que estara disponible cuando OrgUnit este modelado.

**Actor**: coordinador-curso
**Layers**: frontend (filtro UI)

#### Scenario: control presente pero deshabilitado
- **GIVEN** listado renderizado
- **WHEN** usuario observa la barra de filtros
- **THEN** ve el control "Unidad Organizativa" con etiqueta `stub` y deshabilitado
- **AND** hover sobre el control muestra mensaje "Disponible cuando OrgUnit este modelado (DECISION-002)"

#### Scenario: interaccion no rompe la UI
- **GIVEN** filtro UO deshabilitado
- **WHEN** usuario intenta hacer click
- **THEN** el control no responde, no hay errores en consola

#### Acceptance
**El usuario puede verificar que funciona**: ve el filtro UO presente pero claramente marcado como no disponible.

### REQ-05: Acciones de fila

El sistema MUST proveer acciones por fila para `Ver detalle` (navega al layout default `RecordDetail`) y `Crear nuevo` (boton primario en el header del listado).

**Actor**: coordinador-curso
**Layers**: frontend (rowActions + canCreate)

#### Scenario: click en fila
- **GIVEN** listado renderizado con 2 filas
- **WHEN** usuario hace click en una fila o en el ActionMenu "Ver detalle"
- **THEN** la app intenta navegar al layout `default_AcademicActivity_view`
- **AND** la accion no falla incluso si TICKET-008 (vista detalle) aun no esta implementada — se deja la URL preparada

#### Scenario: boton crear nuevo
- **GIVEN** listado renderizado
- **WHEN** usuario hace click en "Crear programa"
- **THEN** la app intenta abrir el flujo de creacion (TICKET futuro)

#### Acceptance
**El usuario puede verificar que funciona**: ve el boton "Crear programa" en el header y un menu de acciones por fila.

## Non-functional requirements

No aplican NFRs especificos. Listado pequeno (≤ 100 filas previstas en SP2), sin batch operations, autorizacion ya cubierta por capabilities del mod.

## Artifacts

### Layout Config (METASPEC-layout-config)

**Archivo**: `up1/mods/curriculum-design/config/layouts/default_AcademicActivity_list.json`

| Field | Valor | Justificacion |
|-------|-------|---------------|
| `id` | `default_AcademicActivity_list` | RULE-layout-010 + naming convention `default_{ObjectName}_{mode}` |
| `name` | `default_AcademicActivity_list` | Mismo que id |
| `label` | `Programas de asignatura` | Texto directo (no key i18n) — RULE-layout-011 |
| `objectName` | `AcademicActivity` | Objeto del mod creado en TICKET-006 |
| `layoutType` | `RecordList` | Listado tabular |
| `applicationId` | **OMITIR** | RULE-mods-009: sync (Phase 6) lo asigna automaticamente para que aparezca en menu |
| `tenants` | `["UPU"]` | DECISION-012 Fase 1. METASPEC marca `tenants` como required |
| `roles` | omitir | UPONE-1034 no lo pide; capabilities controlan visibilidad |

**`layoutConfig`**:

| Subfield | Valor |
|----------|-------|
| `columns[]` | 5 entries: `name`, `code`, `version`, `programLevel`, `workflowState` (todas `sortable: true`) |
| `filters[]` | omitir como prefiltro fijo (los 4 filtros del UI son interactivos, no pre-aplicados) |
| `defaultSort` | `{ field: "name", order: "asc" }` |
| `showSearch` | `true` (habilita inputs Codigo/Nombre) |
| `canCreate` | `true` |
| `canCreateLayoutId` | `default_AcademicActivity_create` (TICKET futuro — referencia preparada) |
| `canEdit` | `true` |
| `canDelete` | `false` (en Fase 1; soft delete via workflowState=`Deprecated`) |
| `rowActions[]` | 1 accion: `view` → `default_AcademicActivity_view` (TICKET-008) |
| `associatedLayoutConfigs.view` | `{ layoutId: "default_AcademicActivity_view" }` |

**Columnas detalle**:

| key | label | type | sortable | filterable | source |
|-----|-------|------|----------|------------|--------|
| `name` | `Nombre` | text | si | si (input) | `AcademicActivity.name` |
| `code` | `Codigo` | text | si | si (input) | `AcademicActivity.code` |
| `version` | `Version` | text | si | no | `AcademicActivity.version` |
| `programLevel` | `Nivel` | enum-badge | si | no | `AcademicActivity.programLevel` |
| `workflowState` | `Estado` | enum-badge | si | si (select) | `AcademicActivity.workflowState` |

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status | Session |
|---|------|-------|------------|-------|------------|--------|---------|
| 1 | Crear branch `UPONE-1034-default-academic-activity-list-layout` desde `develop` en repo `curriculum-design` | developer | — | git branch | `git status` limpio en branch nuevo | pending | — |
| 2 | Crear `config/layouts/default_AcademicActivity_list.json` con campos definidos en Artifacts | developer | #1 | `up1/mods/curriculum-design/config/layouts/default_AcademicActivity_list.json` | JSON valida estructura del METASPEC | pending | — |
| 3 | Validar JSON contra METASPEC-layout-config | reviewer | #2 | (read-only) | Lectura comparada con METASPEC: campos requeridos presentes, types correctos | pending | — |
| 4 | Correr `npm run sync` desde monorepo y verificar Phase 6 (Apps&Layouts) sin errores | developer | #2 | (no edit) | Output del sync sin warnings/errors; layout insertado en `up1_layen_layout` | pending | — |
| 5 | Validar manualmente: levantar `suite` + `object-manager`, navegar a `/UPU/curriculum-design`, confirmar item "Programa de asignatura" en menu y listado renderiza 2 filas | reviewer | #4 | (manual) | Screenshot guardada en `tickets/TICKET-007.screenshots/ticket-007-list-upu-2-rows.png` | pending | — |
| 6 | Validar filtros (Estado, Codigo, Nombre, UO stub) — TC-007-11 a TC-007-13 | reviewer | #5 | (manual + Playwright opcional) | Cada filtro produce el comportamiento esperado de los Test scenarios | pending | — |
| 7 | Commit + push del JSON a remoto, abrir PR en repo `curriculum-design` | developer | #6 | git | PR creado contra `develop`, build CI verde | pending | — |

### Task contract

```
Task #1: Crear branch desde develop
- source_ref: REQ-01 (precondicion del flujo de implementacion)
- agent: developer
- files: git (branch UPONE-1034-default-academic-activity-list-layout)
- precondition: develop actualizado, working tree limpio
- expected_output: branch nueva activa
- validation: git status limpio, branch correcta
- rollback: git checkout develop && git branch -D UPONE-1034-default-academic-activity-list-layout
- rules: [9, 16]
```

```
Task #2: Crear default_AcademicActivity_list.json
- source_ref: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05
- agent: developer
- files: up1/mods/curriculum-design/config/layouts/default_AcademicActivity_list.json
- precondition: Task #1 completada (branch activa)
- expected_output: JSON con todos los campos definidos en Artifacts
- validation: JSON parsea sin errores; estructura cumple METASPEC-layout-config
- rollback: rm del archivo
- rules: [1, 2, 8, 16]
```

```
Task #3: Validar JSON contra METASPEC
- source_ref: REQ-01 (gate de calidad)
- agent: reviewer
- files: (read-only)
- precondition: Task #2 completada
- expected_output: confirmacion escrita en sesion de que el JSON cumple META-SPEC (campos required, types, naming)
- validation: comparacion linea-por-linea contra meta-specs/METASPEC-layout-config.md
- rollback: N/A
- rules: [4, 7, 14]
```

```
Task #4: npm run sync y verificacion Phase 6
- source_ref: REQ-01 (scenario "layout aparece en nav")
- agent: developer
- files: (no edit; ejecuta script)
- precondition: Tasks #2 y #3 completadas; monorepo up1 con dependencias instaladas
- expected_output: sync corrido sin errores; phase 6 reporta layout asociado a app curriculum-design
- validation: output del sync; query a tabla up1_layen_layout filtrando por name='default_AcademicActivity_list'
- rollback: revertir Task #2
- rules: [3 (RULE-mods-003), 5, 8]
```

```
Task #5: Validacion manual del listado en UI
- source_ref: REQ-01 (acceptance)
- agent: reviewer
- files: tickets/TICKET-007.screenshots/ticket-007-list-upu-2-rows.png (capture)
- precondition: Tasks #4 completada; suite y object-manager levantados; seed cargado
- expected_output: screenshot que muestra menu con "Programa de asignatura" + listado con 2 filas (Univalle + AIEP)
- validation: visual humano + screenshot adjuntada al ticket
- rollback: N/A
- rules: [9, 13, 14]
```

```
Task #6: Validar filtros (UO stub, Estado, Codigo, Nombre)
- source_ref: REQ-02, REQ-03, REQ-04
- agent: reviewer
- files: tickets/TICKET-007.screenshots/ticket-007-list-search.png (y otras)
- precondition: Task #5 completada
- expected_output: screenshots de cada filtro funcionando segun los test scenarios
- validation: comparacion contra Test scenarios de cada REQ
- rollback: N/A
- rules: [7, 13, 14]
```

```
Task #7: Commit + PR
- source_ref: REQ-01 (entrega)
- agent: developer
- files: git
- precondition: Task #6 completada (todos los TC visuales validados)
- expected_output: commit en branch UPONE-1034-..., push a origin, PR abierto
- validation: PR existe en Bitbucket; CI del repo curriculum-design verde
- rollback: git revert del commit; cerrar PR
- rules: [9, 13, 14, 16]
```

## Constraints

- **[METASPEC-layout-config](../../meta-specs/METASPEC-layout-config.md)** — schema oficial de layouts. Campo `tenants` obligatorio.
- **[RULE-mods-009](../../rules/mods/rule-mods-009.md)** (must) — `applicationId` debe omitirse del JSON; sync lo asigna. Sin esto el layout NO aparece en el menu de objetos.
- **[RULE-mods-010](../../rules/mods/rule-mods-010.md)** (should) — `defaultObjects` en `app.json` no controla nav (clarifica confusion comun).
- **[RULE-mods-003](../../rules/mods/rule-mods-003.md)** (must) — `npm run sync` obligatorio despues de declarar layouts.
- **[DECISION-002 (org-unit-defer)](../../decisions/DECISION-org-unit-defer.md)** — filtro UO va como stub UI, sin backend. `executionUnitId` queda `nullable` hasta que OrgUnit se modele.
- **[DECISION-012 (two-phase-tenant-rollout)](../../decisions/DECISION-012-two-phase-tenant-rollout.md)** — Fase 1 todo en tenant `UPU`. Aislamiento entre tenants y switch quedan deferred a Fase 2.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| TICKET-006 (`AcademicActivity` modelado) | internal | Objeto raiz que el listado renderiza | Cerrado (`status: done`) — sin riesgo |
| Plataforma de layouts (UPONE-942) | internal | RecordList generico que consume el JSON | Finalizada — sin riesgo |
| `npm run sync` (script monorepo) | internal | Inserta el layout en `up1_layen_layout` | Si falla, el layout no esta en BD; mitigado por Task #4 |
| Seed de `curriculum-design` | internal | Provee las 2 filas para validacion | Cargado en SP2; verificado por TICKET-006 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `applicationId: null` puesto por error → layout no aparece en nav | medium | high (ticket no valida) | Task #3 (review) y Task #5 (validacion manual) lo detectan; documentado en RULE-mods-009 |
| Filtro UO stub confunde al usuario | low | low | Tooltip explicito + label `stub` claro |
| Sync rompe por JSON invalido (campo extra, type erroneo) | low | medium | Task #3 (review contra METASPEC) y Task #4 (sync explicito antes de PR) |
| `workflowState` inicial diferente al esperado por UPONE-1034 ("Draft") | low (already happened) | low | L2 registrado: aceptamos `Approved` del seed; no es bloqueante para el ticket Jira |
| Action `Ver detalle` apunta a layout que aun no existe (TICKET-008) | medium | low | Aceptable: rowAction puede declararse antes; en Fase actual click navega a 404/loader del layout view, lo cual no falla la UI base |

## Open questions

Ninguna — todas resueltas en draft v1 aprobado.

## Decisions

### DEC-LOCAL-01: `tenants: ["UPU"]` en Fase 1
- **Contexto**: UPONE-1034 no especifica `tenants`. METASPEC lo marca como required. Ticket DKC pedia "global" sin `tenants[]`.
- **Drivers**: cumplir METASPEC, alinear con DECISION-012 (Fase 1 = un solo tenant), no romper sync.
- **Opcion elegida**: `tenants: ["UPU"]`.
- **Alternativas**: omitir el campo (rompe MetaSpec); `tenants: []` (semantica ambigua).
- **Consecuencias**: en Fase 2 hay que actualizar el campo con tenants reales (UV, AIEP separados) cuando se haga el switch.
- **Session**: design-draft v1.

### DEC-LOCAL-02: Omitir `applicationId` del JSON
- **Contexto**: requisito implicito de UPONE-1034 ("vista general visible") + RULE-mods-009.
- **Drivers**: el sync (Phase 6) asigna `applicationId` automatico cuando el campo esta ausente; con `null` explicito el layout queda auxiliar.
- **Opcion elegida**: omitir el campo.
- **Alternativas**: `applicationId: null` (rompe nav); hardcodear ID de la app (fragil).
- **Consecuencias**: el layout aparece en menu de objetos sin trabajo adicional.
- **Session**: design-draft v1.

### DEC-LOCAL-03: Aceptar `workflowState: Approved` del seed actual
- **Contexto**: seed carga ambos como `Approved`; DKC ticket-007 anuncia "todos en Draft".
- **Drivers**: cambiar el seed sale del scope de TICKET-007; UPONE-1034 no fija el estado inicial.
- **Opcion elegida**: aceptar `Approved`.
- **Alternativas**: cambiar seed a `Draft` (toca TICKET-006 ya cerrado).
- **Consecuencias**: TC-007-06/07 deben ajustarse a `Approved`. L2 registrado.
- **Session**: design-draft v1.

### DEC-LOCAL-04: 5 columnas (no 7)
- **Contexto**: UPONE-1034 no especifica columnas. DKC ticket sugiere 7 (5 + `language` + `updatedAt`).
- **Opcion elegida**: 5 columnas canonicas (`name`, `code`, `version`, `programLevel`, `workflowState`).
- **Alternativas**: 7 columnas; 3 columnas minimas.
- **Consecuencias**: si UX pide language/updatedAt, se agregan en ticket follow-up.
- **Session**: design-draft v1.

### DEC-LOCAL-05: Default sort `name asc`
- **Contexto**: UPONE-1034 no especifica orden.
- **Opcion elegida**: ordenar alfabeticamente por nombre asc.
- **Alternativas**: orden por `updatedAt desc`; sin sort default.
- **Consecuencias**: orden estable y predecible para tester y usuario final.
- **Session**: design-draft v1.

### DEC-LOCAL-06: Omitir `roles[]`
- **Contexto**: UPONE-1034 no menciona roles. METASPEC permite filtrado server-side por rol.
- **Opcion elegida**: omitir; visibilidad la dictan capabilities del mod.
- **Alternativas**: declarar roles explicitos (Admin, Coordinador).
- **Consecuencias**: cualquier usuario con capability `mod/curriculum-design:*` ve el listado.
- **Session**: design-draft v1.

## Success metrics

No aplica para este ticket (configuracion de UI sin metricas de negocio).

## Technical reference

### Modelo `AcademicActivity` (campos relevantes para columnas)
Definicion en [up1/mods/curriculum-design/objects/AcademicActivity.json](../../../../uplanner/up1/mods/curriculum-design/objects/AcademicActivity.json):
- `name: string, not_null`
- `code: string, not_null`
- `version: string, not_null`
- `programLevel: enum [Undergraduate | Postgraduate | ContinuingEducation | TechnicalProfessional], not_null`
- `workflowState: enum [Draft | Review | Approved | Published | OpenForEdit | Deprecated], not_null, default Draft`
- `executionUnitId: string, nullable` (DECISION-002)
- `language: string, not_null, default 'es'`
- `externalId: string, nullable` (DECISION-004)

### Datos del seed (Fase 1, tenant `UPU`)

| name | code | version | programLevel | workflowState | externalId |
|------|------|---------|--------------|---------------|-----------|
| Ecuaciones Diferenciales | UV-ECDIF-1124 | v2022-actual | Undergraduate | Approved | aa-uv-1124 |
| Introduccion a las Redes | AIEP-INTRO-REDES-14757 | v1 | TechnicalProfessional | Approved | aa-aiep-14757 |

### Ejemplo de referencia
[up1/mods/hello-world-mod/config/layouts/hw-factor-list.json](../../../../uplanner/up1/mods/hello-world-mod/config/layouts/hw-factor-list.json) — patron real validado del repo.

### Sync mechanism
- Script: `npm run sync` (root del monorepo `up1/`)
- Phase relevante: 6 (Apps&Layouts)
- Tabla destino: `up1_layen_layout`
- Verificacion post-sync: query `SELECT name, applicationId, tenants FROM up1_layen_layout WHERE name='default_AcademicActivity_list'`

## Rules discovered

(se llena durante execute si surgen)

## Bugs found

(se llena durante execute si surgen)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01 a REQ-05 pasan en validacion manual
- [ ] **Tests**: screenshots adjuntadas al ticket cubren TC-007-05 a TC-007-13 (los TC pending del ticket)
- [ ] **Rules**: `applicationId` omitido (RULE-mods-009); sync corrido (RULE-mods-003)
- [ ] **Integration**: listado aparece en menu de objetos sin afectar nav de otros mods (regression visual mods existentes)
- [ ] **Docs**: ticket-007.md actualizado con session log + screenshots; spec status `done`
