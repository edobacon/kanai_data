---
id: SPEC-curriculum-design-plan-progression-iscurrent
project: up1
ticket: TICKET-081
status: done
---

# Malla — modelo base del plan: `progression` enum + `Activity.isCurrent`

# Malla — modelo base del plan: `progression` enum + `Activity.isCurrent`

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: dos ajustes aditivos de modelo en el mod `curriculum-design`. (1) El campo `progression` del plan de estudios (`rt__Plan__curriculum`) deja de ser texto libre y pasa a un enum cerrado `{Sequential, Modular}` con default `Sequential`. (2) Los programas de asignatura (`Activity`) ganan un flag `isCurrent` (boolean, default `true`, label "Vigente") visible y filtrable en su listado. No hay lógica de versionado ni UI nueva — esto habilita a MC-02 (derivar el período por progresión) y a MC-06 (picker que muestra solo cursos vigentes).

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Cerrar `progression` a enum copiando el patrón existente de `periodType` (enum-en-RT + labels i18n), widget de layout `text`→`select` | El campo ya tiene data viva con valor `'Credits'` (fuera del enum) → exige migración del seed y de planes UPU; sin el cambio de widget el enum no se refleja en el form |
| 2 | `isCurrent` es solo flag manual (sin lógica automática de vigencia) | La automatización de vigencia es SP6 (BL-1); meterla ahora sería YAGNI y scope creep |
| 3 | La propagación al repo MCP (`progression: z.string()`) NO se toca aquí | El MCP es repo hermano, P3 (no modifica up1), fuera de `execute_scope` mod-only → follow-up del módulo up1-mcp |

**Riesgos principales y como los mitigamos**:

- **El seed (`'Credits'`) y los planes vivos en UPU quedarían fuera del enum** → T3 actualiza el seed a `Sequential` y verifica con sync limpio que los planes existentes queden `Sequential` (TC-02 manual, gate ⚑ fuerte).
- **El widget `text` del layout no refleja el enum** → T1 convierte `progression` a `type: select` con opciones del enum, replicando lo que hace `periodType`.
- **Cambiar el tipo rompe un consumidor no detectado** → H1 ya barrió consumidores (resolvers = pass-through seguro; MCP = follow-up out-of-scope); reviewer aislado en el gate re-verifica.

**Que NO se hace en este ticket** (limites explicitos del scope):

- Lógica automática de versión vigente (SP6, BL-1).
- Cambios en el repo MCP (follow-up up1-mcp / TICKET-080).
- Commit de artefactos generados por sync/seed (Base, schema Prisma, typeDefs, lang sincronizado al core) — solo se commitea el source del mod.

**Tamano estimado**: 1 session ejecutable (~2-3h), tier T2, gate ⚑ fuerte. La parte más riesgosa es T3 (sync limpio sobre data viva en UPU).

**Como vas a saber que funciona**:

- Crear/editar un Plan acepta `Modular` y rechaza `Foo`; el form muestra un select con "Secuencial/Modular".
- Crear un Activity sin setear `isCurrent` lo deja en `true`; el listado de Activity tiene la columna "Vigente" y filtra por ella.
- El sync corre limpio en UPU y los planes existentes quedan en `Sequential`.

---

## Purpose

Cerrar el tipo de `rt__Plan__curriculum.progression` (string libre → enum `{Sequential, Modular}`, default `Sequential`) y agregar `Activity.isCurrent` (boolean, not_null, default `true`, label "Vigente", columna/filtro en el RecordList). Cambio mod-only, aditivo y reversible, que da semántica de progresión al plan y flag de vigencia al programa de asignatura, insumos de MC-02 y MC-06.

## Requirements

### REQ-01: `progression` enum cerrado

> **Que cambia**: al crear/editar un Plan, `progression` ya no es un campo de texto libre — es un desplegable con "Secuencial" y "Modular", y por defecto queda "Secuencial".
> **Por que**: hoy es string libre con `[NEEDS CLARIFICATION]`; MC-02 necesita un valor cerrado para derivar la regla de período.

El sistema MUST definir `rt__Plan__curriculum.progression` como `enum: ["Sequential", "Modular"]` con `static_default: "Sequential"`, `not_null: false`, eliminando el marcador `[NEEDS CLARIFICATION]`, con labels i18n (Secuencial/Modular) y widget de layout `select`.

**Actor**: diseñador curricular (admin)
**Layers**: schema (objects), config (layouts), i18n (lang), backend (codegen/sync genera la validación)

<details><summary>Scenarios de validacion</summary>

#### Scenario: valor válido
- **GIVEN** un Plan en edición
- **WHEN** se setea `progression = "Modular"`
- **THEN** se persiste sin error

#### Scenario: valor inválido
- **GIVEN** un Plan en edición
- **WHEN** se intenta setear `progression = "Foo"`
- **THEN** el backend rechaza el valor (no pertenece al enum)

#### Scenario: default
- **GIVEN** un Plan nuevo sin `progression` explícito
- **WHEN** se crea
- **THEN** `progression` queda `"Sequential"`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en el form de Plan, `progression` aparece como desplegable con "Secuencial"/"Modular"; guardar un valor fuera de la lista no es posible.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | enum válido/ inválido | objeto con enum | crear/editar Plan con `Modular` y con `Foo` | acepta `Modular`, rechaza `Foo` | TC-01 |

### REQ-02: `isCurrent` en `Activity`

> **Que cambia**: cada programa de asignatura tiene un flag "Vigente" (sí/no), que nace en "sí" por defecto.
> **Por que**: el picker de la malla (MC-06) necesita distinguir la versión vigente; sin el flag no puede.

El sistema MUST agregar `Activity.isCurrent` como `type: boolean`, `not_null: true`, `static_default: "true"`, con label i18n "Vigente". Sin lógica de versionado automática (solo flag).

**Actor**: diseñador curricular (admin); system (default)
**Layers**: schema (objects), i18n (lang)

<details><summary>Scenarios de validacion</summary>

#### Scenario: default true
- **GIVEN** el seed o un create de Activity sin `isCurrent`
- **WHEN** se crea el Activity
- **THEN** `isCurrent` queda `true`

#### Scenario: editable
- **GIVEN** un Activity con `isCurrent = true`
- **WHEN** se edita a `false`
- **THEN** se persiste `false` sin disparar lógica de versión

</details>

#### Acceptance
**El usuario puede verificar que funciona**: al crear un programa de asignatura sin tocar el campo, queda "Vigente"; puede cambiarse a no-vigente manualmente.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | default | seed | crear Activity sin setear `isCurrent` | `isCurrent = true` | TC-03 |

### REQ-03: Migración de planes existentes

> **Que cambia**: los planes que ya existen (y el seed) quedan en "Secuencial" tras cerrar el enum, sin romper el sync.
> **Por que**: el seed hoy usa `'Credits'`, valor fuera del nuevo enum (H1.1) — sin migrar, el sync/seed falla.

El sistema MUST correr el sync limpio en UPU tras el cambio de tipo, y los `Curriculum(Plan)` existentes (incl. el seed) MUST quedar en `Sequential` (o un valor del enum), sin valores fuera del enum.

**Actor**: system (sync/seed)
**Layers**: seed, backend (sync), database (UPU)

<details><summary>Scenarios de validacion</summary>

#### Scenario: sync limpio
- **GIVEN** UPU con planes existentes y el seed actualizado
- **WHEN** se corre el sync del mod
- **THEN** el sync termina sin error y ningún Plan queda con `progression` fuera del enum

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el sync corre sin errores y los planes existentes muestran "Secuencial".

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | sync con plan v1 | plan existente string | correr sync | plan queda `Sequential`, sin error | TC-02 |

### REQ-04: `isCurrent` visible/filtrable

> **Que cambia**: el listado de programas de asignatura muestra una columna "Vigente" por la que se puede filtrar.
> **Por que**: el picker de MC-06 y el usuario necesitan discriminar vigentes de no-vigentes en el listado.

El sistema MUST exponer `isCurrent` como columna filtrable en el RecordList de `Activity` (`default_Activity_list.json`), consumible por el picker de MC-06.

**Actor**: diseñador curricular (admin)
**Layers**: config (layouts), i18n (lang)

<details><summary>Scenarios de validacion</summary>

#### Scenario: filtro
- **GIVEN** Activities con `isCurrent` mixto (true/false)
- **WHEN** se filtra el listado por `isCurrent = true`
- **THEN** solo aparecen los vigentes

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en el listado de programas hay una columna "Vigente" y un filtro que discrimina vigentes.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | filtrar por isCurrent | activities mixtas | filtrar por `isCurrent=true` | discrimina vigentes | TC-04 |

## Artifacts

### Models (campos aditivos sobre objetos existentes — NO objetos nuevos)

| Table (RT/objeto) | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| `rt__Plan__curriculum` | `progression` | enum `["Sequential","Modular"]` | si | `Sequential` | Modalidad de progresión del plan. Cierra el string libre previo. PLAN-ONLY. |
| `Activity` | `isCurrent` | boolean | no | `true` | Flag de versión vigente del programa. Sin lógica de versionado (SP5). Consumido por picker MC-06. |

**i18n (lang)**:
| File | Key | Valor |
|------|-----|-------|
| `lang/es_CL@Curriculum.json` | `enums.progression.Sequential` / `.Modular` | Secuencial / Modular |
| `lang/es_CL@activity.json` | `column.isCurrent` | Vigente |

**Layout (config)**:
| File | Cambio |
|------|--------|
| `config/layouts/default_Curriculum_{create,edit}.json` | `progression`: widget `text` → `select` (opciones del enum), replicando `periodType`. `_view.json` queda `text` (consistente con `periodType`; dual-judge B1) |
| `config/layouts/default_Activity_list.json` | agregar columna `{ key: "isCurrent", label: "Vigente", sortable: true, filterable: true }` |
| `config/layouts/default_Activity_{edit,view}.json` | `isCurrent`: checkbox editable (edit) + readOnly visible (view) — dual-judge B2 |

## Tasks

### Session 1 — modelo base: progression enum + isCurrent + sync limpio [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Cerrar `progression` a enum `{Sequential, Modular}` + `static_default: Sequential` (quitar NEEDS CLARIFICATION); agregar `enums.progression` (Secuencial/Modular) al lang; cambiar widget de layout `text`→`select` en create/edit/view replicando `periodType` | REQ-01 | developer | — | `objects/RecordTypes/rt__Plan__curriculum.json`, `lang/es_CL@Curriculum.json`, `config/layouts/default_Curriculum_{create,edit,view}.json` | TC-01 (vitest del mod) + inspección del JSON del enum | git revert (aditivo: enum→string) | DET-5, DET-8, DET-11, RULE-curriculum-design-005 | done | 1 |
| S1.T2 | Agregar `Activity.isCurrent` boolean not_null default true (molde `appearsInDiploma`); label i18n "Vigente" en `es_CL@activity.json`; columna `isCurrent` filtrable en `default_Activity_list.json` | REQ-02, REQ-04 | developer | — | `objects/activity.json`, `lang/es_CL@activity.json`, `config/layouts/default_Activity_list.json` | TC-03 + TC-04 (vitest del mod) | git revert (quitar campo, aditivo) | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T3 | Análisis de impacto de `progression` (confirmar resolvers pass-through, registrar follow-up MCP) + actualizar seed `_data-curriculum.js` (`'Credits'`→`Sequential`) + correr sync limpio en UPU y verificar planes existentes en `Sequential` | REQ-03 | developer | S1.T1, S1.T2 | `seed/_data-curriculum.js` | TC-02 (sync manual en UPU) + grep de consumidores | revertir seed (git revert) | DET-5, DET-8, DET-11, DET-16 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket (Template de Gate), correr quality review (reviewer aislado, DET-30), validación T2, consolidar TC-01..04 con evidencia, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision documentada + TCs con evidencia | (no aplica — cierre de session) | DET-20, DET-23, DET-30, DET-35 | done | 1 |

## Constraints

- RULE-dev-004: trabajo mod-only va en rama de épica (`UPONE-1267-sp5`), commits con id externo; no `develop`/`main`.
- RULE-curriculum-design-005: friendly-error de unicidad / convenciones del mod; reiniciar OM tras `sync:logic`.
- DEC-027, DEC-028 (kb_refs del ticket): mod-only; no commitear artefactos de sync/seed (Base, schema, typeDefs, lang sincronizado).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| object-manager (sync + codegen) | internal | aplica el enum y el campo al backend core | si el sync falla por drift de BASEMODEL, usar workaround `SYNC_AUTO_APPLY_SCHEMA=false` para layouts (ref memoria up1) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Seed/planes UPU con `progression` fuera del enum (`'Credits'`) rompen el sync | high | sync falla / data inválida | T3 actualiza seed a `Sequential` + verifica sync limpio (TC-02) antes de cerrar el gate |
| El widget `text` del layout no refleja el enum | medium | el form no muestra opciones | T1 convierte a `select` replicando `periodType` |
| Consumidor no detectado del tipo `progression` | low | break en runtime | H1 barrió consumidores (resolvers pass-through; MCP out-of-scope); reviewer aislado re-verifica en el gate |

## Open questions

Ninguna — H1 convergió en intake-explore.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: propagación al MCP queda fuera de scope
- **Contexto**: el repo MCP declara `progression: z.string()`; tras cerrar el enum podría enviar valores inválidos.
- **Drivers**: `execute_scope` mod-only; el MCP es repo hermano P3 (no modifica up1) con tracking propio.
- **Opcion elegida**: registrar como propagación (DET-16) y dejar follow-up para el módulo up1-mcp; no tocar el MCP en este ticket.
- **Alternativas**: tocar el MCP ahora (rechazada: viola execute_scope y mezcla repos/épicas).
- **Consecuencias**: el MCP seguirá aceptando strings hasta el follow-up; el backend valida el enum de todos modos.
- **Session**: S1 (design).

## Acceptance checkpoints

- [x] **Funcional**: REQ-01..04 satisfechos (enum + default + select; isCurrent default true + columna filtrable). REQ-01 con caveat: enum soft a nivel API (rt__ no genera tipo enum, ver RULE-curriculum-design-016).
- [x] **Tests**: TC-01..04 verificados — UI/MCP + schema regenerado post-sync (`prisma/UPU/schema.prisma`, typeDefs); 748/748 unit/integration sin regresión.
- [x] **NFRs**: n/a
- [x] **Rules**: mod-only respetado; solo source del mod committeado (sin artefactos de sync/seed).
- [x] **Integration**: sync corrió limpio en UPU; modelo propagado (`progression String?` + `isCurrent Boolean? @default(true)`); resolvers sin regresión.
- [x] **Docs**: propagación MCP registrada y RESUELTA (TICKET-090); learn L2 promovido a RULE-curriculum-design-016.
