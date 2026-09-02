---
id: SPEC-server-legacy-tolerance
project: horadric
ticket: HOR-003
status: done
---

# Tolerancia defensiva formal a frontmatter legacy

# Tolerancia defensiva formal a frontmatter legacy

## Purpose

Formalizar el contrato de tolerancia que horadric-cube ya ejerce accidentalmente sobre tickets legacy de up1 y bayley (sin campos `creates_visual`, `creates_data`, `draft_approved`, `draft_version`, `external`). Extender `RULE-index-001` — consumer se adapta, no se migran los .md — al frontmatter. Objetivo: tipos explicitos, tests de regresion con fixtures reales, y una regla nueva que obligue al mismo patron para futuros campos.

## Requirements

### REQ-IMPROVE-01: Tipos marcan los 5 campos nuevos como opcionales

El sistema MUST declarar en `shared/types.ts` una interface `TicketFrontmatter` donde los 5 campos introducidos con HOR-001/HOR-002 (`creates_visual`, `creates_data`, `draft_approved`, `draft_version`, `external`) sean opcionales (`?`), y el parser no asuma presencia.

**Actor**: developer (consumer del tipo)
**Layers**: backend, types

#### Scenario: ticket legacy pasa el type check
- **GIVEN** un fixture `{ id: 'BLY-002', work_type: 'implement', status: 'done' }` sin los 5 campos
- **WHEN** se asigna a `TicketFrontmatter`
- **THEN** TypeScript compila sin error (`tsc --noEmit`)

#### Scenario: ticket moderno pasa el type check
- **GIVEN** `{ id: 'HOR-001', work_type: 'explore', status: 'closed', creates_visual: true, creates_data: true, draft_approved: null, draft_version: null, external: null }`
- **WHEN** se asigna a `TicketFrontmatter`
- **THEN** TypeScript compila sin error

#### Acceptance
**El dev puede verificar que funciona**: correr `npx tsc --noEmit` desde la raiz de horadric-cube — sin errores. Ademas, los 5 campos aparecen como `?` en el source de `shared/types.ts`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Legacy frontmatter compila | `{id,work_type,status}` sin flags | Asignar a `TicketFrontmatter` | Sin error TS | tsc --noEmit exit 0 |
| 2 | Modern frontmatter compila | con todos los flags | Asignar a `TicketFrontmatter` | Sin error TS | tsc --noEmit exit 0 |

### REQ-IMPROVE-02: Tests de flow inference cubren tickets legacy

El sistema MUST incluir tests automaticos que verifiquen que `inferTicketFlow` produce resultados coherentes para tickets sin los 5 campos, usando fixtures reales de bayley y up1 (no mocks inventados).

**Actor**: system (CI, test runner)
**Layers**: backend, test

#### Scenario: ticket bayley legacy indexado (BLY-002) sin flags de draft
- **GIVEN** `BLY-002` con `status: open`, `work_type: implement`, `spec: null`, sin campos de draft (confirmado en snapshot task #1)
- **WHEN** `inferTicketFlow('bayley', 'BLY-002')`
- **THEN** retorna un `TicketFlow` sin excepciones
- **AND** el nodo `design-draft` tiene status `skip` (confirmado por snapshot baseline — `createsVisualOrData: false` derivado de `undefined === true → false`)
- **AND** no hay valores `NaN`/`undefined` en el output

#### Scenario: ticket up1 con ID legacy (TICKET-001)
- **GIVEN** `TICKET-001` con `status: closed`, `work_type: implement`, sin spec, sin flags
- **WHEN** `inferTicketFlow('up1', 'TICKET-001')`
- **THEN** retorna un `TicketFlow` con `current === null`
- **AND** el regex de `inferRecordType` lo identifica como `ticket` sin romperse con el prefijo `TICKET-`

#### Scenario: ticket moderno que si debe bloquear en design-draft (regresion REQ-PRESERVE-01)
- **GIVEN** `HOR-001` con `creates_visual: true, creates_data: true, draft_approved: null` y `status: closed`
- **WHEN** `inferTicketFlow('horadric', 'HOR-001')`
- **THEN** los nodos incluyen `design-draft`
- **AND** el comportamiento con `status: closed` (current null, nodos como `done`) se preserva

#### Acceptance
**El dev puede verificar que funciona**: `npm test -- flowInference` en horadric-cube pasa, y el archivo de test contiene asserts explicitos sobre `BLY-002` y `TICKET-001`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | BLY-002 legacy | ticket sin flags, done | inferTicketFlow | current null, no design-draft activo | assert pasa |
| 2 | TICKET-001 up1 | ticket legacy, prefijo `TICKET-` | inferTicketFlow | current null, nodos consistentes | assert pasa |
| 3 | HOR-001 moderno | flags true, closed | inferTicketFlow | nodos incluyen design-draft | assert pasa |

### REQ-IMPROVE-03: Regla nueva formaliza el patron

El sistema MUST contener una RULE en `projects/horadric/rules/server/RULE-server-frontmatter-legacy-001.md` que documente: (a) campos nuevos de frontmatter deben ser opcionales en el consumer; (b) acceso desde codigo usa guard explicito (`=== true`, `?? default`, `typeof === 'string'`); (c) se referencia como extension de `RULE-index-001`.

**Actor**: dev futuro que agregue un campo nuevo
**Layers**: documentation, process

#### Scenario: contenido minimo de la regla
- **GIVEN** el archivo `RULE-server-frontmatter-legacy-001.md`
- **WHEN** se lee el contenido
- **THEN** incluye seccciones What, Why, Where, When, Verification, Source
- **AND** cita `RULE-index-001` como antecedente
- **AND** `level: must`, `scope: module`

#### Acceptance
**El dev puede verificar que funciona**: archivo existe, tiene frontmatter completo valido, y `Grep` sobre `rules/server/` lo encuentra.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Regla existe | archivo en path esperado | read | contenido completo | 6 secciones presentes |
| 2 | Regla se indexa | reindex horadric | SQLite query | row con id RULE-server-frontmatter-legacy-001 | row presente |

### REQ-PRESERVE-01: Comportamiento actual de flow inference NO cambia

El sistema MUST mantener el comportamiento observable de `inferTicketFlow` para todos los tickets existentes (horadric, bayley, up1). Output de `/api/tickets/{project}/{id}/flow` antes y despues del cambio es byte-identico para los tickets ya presentes en el repo.

**Actor**: public (consumers del endpoint)
**Layers**: backend, api

#### Scenario: diff de output antes/despues
- **GIVEN** snapshot del response `/api/tickets/horadric/HOR-001/flow` capturado antes de la task #2
- **WHEN** se aplican los cambios del spec y se vuelve a pedir el endpoint
- **THEN** el JSON es identico (string match)

#### Acceptance
**El dev puede verificar que funciona**: capturar 3 snapshots (HOR-001, BLY-002, TICKET-001) en task #1 y compararlos contra el output post-cambio en task #4.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | HOR-001 sin cambio | snapshot pre | curl post-cambio | string identico | diff vacio |
| 2 | BLY-002 sin cambio | snapshot pre | curl post-cambio | string identico | diff vacio |
| 3 | TICKET-001 sin cambio | snapshot pre | curl post-cambio | string identico | diff vacio |

### REQ-PRESERVE-02: Suite de tests existente sigue pasando

El sistema MUST mantener verde la suite actual (`npm test` de horadric-cube). Cero tests regresados, cero tests nuevos skipped.

**Actor**: system (CI)
**Layers**: test

#### Scenario: npm test pre/post
- **GIVEN** baseline capturado en task #1 (N passed, 0 failed)
- **WHEN** se corre `npm test` despues de completar task #4
- **THEN** N' >= N passed, 0 failed, 0 skipped nuevos

#### Acceptance
**El dev puede verificar que funciona**: comparar output de `npm test` antes de task #2 y despues de task #4 — misma cantidad (o mas) de tests pasando, cero fallas.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Regression zero | baseline all-green | post-cambio npm test | all-green + nuevos tests | delta positivo en passed |

## Non-functional requirements

No aplican. Esta mejora toca cobertura de tests y tipos — no hay metricas de performance, availability, security, ni scale.

## Artifacts

### Changes

#### Modified: `horadric-cube/shared/types.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Tipo para frontmatter de ticket | implicito / `any`-ish via `fm.creates_visual` sin tipo | Interface `TicketFrontmatter` con los 5 campos marcados `?` | Hace explicita la opcionalidad. Cambia nada en runtime |

Campos a agregar a la interface (todos opcionales):

```ts
export interface TicketFrontmatter {
  id: string
  project?: string
  module?: string
  spec?: string | null
  work_type?: WorkType
  status?: TicketStatus
  creates_visual?: boolean
  creates_data?: boolean
  draft_approved?: boolean | null
  draft_version?: number | null
  external?: string | null
  created?: string
  closed?: string | null
  tags?: string[]
}
```

Nota: solo `id` es requerido (el unico campo sin el cual no tiene sentido un ticket). Todos los demas son `?` — cualquier consumer debe asumir ausencia y aplicar fallback explicito.

#### Modified: `horadric-cube/server/deckard/flowInference.test.ts` (nuevo)

Archivo nuevo con 3 tests:
1. BLY-002 (fixture real de bayley) legacy
2. TICKET-001 (fixture real de up1) legacy con ID viejo
3. HOR-001 (ticket moderno) regresion

#### Modified: `horadric-cube/server/routes/tickets.test.ts` (extender o crear)

Test que GET `/api/tickets/up1` y `/api/tickets/bayley` devuelve 200 con tickets legacy listados correctamente.

#### Added: `deckard/projects/horadric/rules/server/RULE-server-frontmatter-legacy-001.md`

RULE nueva con estructura de `RULE-index-001`. Contenido:
- **What**: nuevos campos de frontmatter se declaran opcionales; acceso con guard explicito
- **Why**: precedente HOR-001 (paths legacy de bayley) establecio "consumer se adapta"; aplicar al frontmatter
- **Where**: `shared/types.ts`, `server/deckard/flowInference.ts`, `server/routes/tickets.ts`, `server/deckard/workflow.ts`
- **When**: siempre que se agregue un campo al frontmatter del template `templates/records/ticket.md`
- **Verification**: grep por `=== true`, `??`, `typeof === 'string'` sobre accesos a `fm.<nuevo_campo>`; test con fixture legacy
- **Source**: HOR-003 Session #2

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status | Session | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --------- | --- | --- | --- |
| 1 | Baseline: `npm test` + snapshot de 3 endpoints (HOR-001, BLY-002, TICKET-001) | researcher | — | (lectura) | baseline capturado en session log | done | #3 | — | — | — |
| 2 | Agregar interface `TicketFrontmatter` opcional + test flow inference con 3 fixtures | developer | #1 | `shared/types.ts`, `server/deckard/flowInference.test.ts` (nuevo) | `npx tsc --noEmit` + `npm test -- flowInference` green | done | #3 | — | — | — |
| 3 | Test integration rutas con tickets legacy (up1, bayley) | developer | #2 | `server/routes/tickets.test.ts` | `npm test -- tickets` green con asserts sobre TICKET-001 y BLY-002 | done | #3 | — | — | — |
| 4 | Crear RULE-server-frontmatter-legacy-001 + verificar regresion (snapshot diff + npm test full) | reviewer | #3 | `deckard/projects/horadric/rules/server/RULE-server-frontmatter-legacy-001.md` + reindex | diff vacio en 3 snapshots, `npm test` misma cantidad de passed | done | #3 | — | — | — |

### Task contract

```
Task #1: Baseline
- source_ref: REQ-PRESERVE-01, REQ-PRESERVE-02
- agent: researcher
- files: (lectura; grabar output en session log del ticket)
- precondition: rama HOR-003-legacy-frontmatter-tolerance creada desde main
- expected_output:
  - Session #2 del ticket contiene: salida de `npm test` (N passed, N failed),
    salida de `curl /api/tickets/horadric/HOR-001/flow`, idem BLY-002, idem TICKET-001
- validation: snapshots guardados, npm test all-green (si no, reportar y bloquear)
- rollback: N/A (solo lectura)
- rules: [1, 2, 11]  # certeza, source_ref, KB-first
```

```
Task #2: Interface opcional + tests flow inference
- source_ref: REQ-IMPROVE-01, REQ-IMPROVE-02
- agent: developer
- files:
  - shared/types.ts (agregar interface TicketFrontmatter)
  - server/deckard/flowInference.test.ts (nuevo)
- precondition: task #1 completa, baseline en session log
- expected_output:
  - `npx tsc --noEmit` exit 0
  - `npm test -- flowInference` pasa con los 3 tests nuevos
  - shared/types.ts sigue exportando los tipos existentes sin breaking changes
- validation:
  - unit: tests nuevos verdes
  - type-check: tsc sin errores
  - regression: `npm test` general sigue verde (si no, diagnosticar y reportar antes de continuar)
- rollback: git revert del commit de task #2; tests quedan en baseline previo
- rules: [5, 8, 10, 11]  # multi-capa, rollback, limites, KB-first
```

```
Task #3: Tests integration rutas
- source_ref: REQ-IMPROVE-02, REQ-PRESERVE-01
- agent: developer
- files:
  - server/routes/tickets.test.ts (extender si existe, crear si no)
- precondition: task #2 mergeada en la rama
- expected_output:
  - Tests nuevos verifican GET /api/tickets/up1 devuelve TICKET-001..005
  - Tests nuevos verifican GET /api/tickets/bayley devuelve BLY-* con work_type correcto
- validation:
  - `npm test -- tickets` pasa
  - regression: `npm test` general verde
- rollback: git revert del commit de task #3
- rules: [5, 7, 10, 11]  # multi-capa, test cases, limites, KB-first
```

```
Task #4: RULE + regresion final
- source_ref: REQ-IMPROVE-03, REQ-PRESERVE-01, REQ-PRESERVE-02
- agent: reviewer
- files:
  - deckard/projects/horadric/rules/server/RULE-server-frontmatter-legacy-001.md (nuevo)
- precondition: tasks #1..#3 completas
- expected_output:
  - Archivo de rule existe con frontmatter valido y 6 secciones
  - Reindex del proyecto horadric corrido (debe aparecer en SQLite)
  - Diff vacio en 3 snapshots (HOR-001, BLY-002, TICKET-001) contra baseline task #1
  - `npm test` muestra N' >= N passed, 0 failed, 0 skipped
- validation:
  - unit+integration: npm test green
  - snapshot: bash diff sobre los 3 JSON
  - reindex: query SQLite confirma la rule presente
- rollback: git revert del commit de task #4; borrar el archivo .md (no lo indexa porque deckard reindex descarta)
- rules: [4, 7, 13, 14, 16]  # hechos, test cases, evidencia, approve/iterate, propagacion
```

## Constraints

- **RULE-index-001** (project: horadric, module: index, level: must) — Establece el patron que este spec extiende. Consumer tolera variacion legacy, no se migran datos. Este spec crea la variante para frontmatter.
- **RULE-viewer-polling-001** (project: horadric, module: viewer, level: must) — Antecedente del author de preferir defensa en el consumer. No aplica tecnicamente (trata de race conditions en fetch), pero refuerza la direccion cultural.

## Dependencies

Ninguna externa. Toda la infra necesaria (vitest, tsc, tsx, better-sqlite3) ya esta en horadric-cube.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep: durante task #2 se descubre que algun acceso a frontmatter NO es defensivo y hay que refactorlarlo | medium | medium | Si se descubre, registrar como item de backlog del ticket con prioridad should (no must) — no expandir el spec. El fix va en otro ticket |
| Fixtures legacy cambian (alguien actualiza BLY-002 o TICKET-001 para ya tener los flags) | low | high | Tests usan fixtures read-only; ademas agregar copia de fixtures en `server/deckard/__fixtures__/` si es posible, o congelar el SHA del .md en el test asercion |
| Reindex de horadric falla al agregar la RULE nueva porque el modulo `server/` no existe como carpeta | medium | low | Crear la carpeta `projects/horadric/rules/server/` antes de agregar la rule (mkdir). Verificar en task #4 que el reindex la toma |

## Open questions

Ninguna pendiente — las 3 hipotesis del ticket se resolvieron en intake/session#1 con el Explore agent.

## Decisions

### DEC-LOCAL-01: Opcion Z pura, no X

- **Contexto**: Elegir entre backfill de 28 tickets (X), defensivo en server (Z), o combinacion (X+Z)
- **Drivers**:
  - Precedente RULE-index-001: normalizacion en server, no migracion de .md
  - 28 tickets es mucho archivo tocado sin ganancia observable
  - Defaults retroactivos (`creates_visual: false`) pueden inventar valores que no reflejan lo que habria sido al momento
- **Opcion elegida**: Z pura — server tolera ausencia, no se tocan .md legacy
- **Alternativas**:
  - X (backfill): descartada por contradecir RULE-index-001 y por riesgo de inventar valores
  - X+Z combinado: descartada porque agregar `schema_version` a tickets viejos es tambien migracion (aunque mas liviana) y contradice el mismo principio
- **Consecuencias**:
  - Gana: cero cambio en .md historicos, consistencia con RULE-index-001, alcance acotado
  - Pierde: los tickets viejos quedan "inconsistentes" visualmente (sin los flags) — se acepta porque son historia
- **Session**: #1 (intake)

### DEC-LOCAL-02: No agregar badge "legacy" visible en UI

- **Contexto**: ¿El viewer debe mostrar algun indicador visual para tickets legacy?
- **Drivers**:
  - RULE-index-001 normalizo silenciosamente sin UI — es el precedente
  - Agregar badge expande scope a creates_visual: true → activa gate de draft
  - El dev necesita mas trabajo operativo (sessions, close checks) antes que UI nueva
- **Opcion elegida**: Sin badge. Normalizacion silenciosa.
- **Alternativas**:
  - Badge "legacy" gris en la header del ticket: descartado en este spec — puede hacerse como improvement separado si aparece necesidad
- **Consecuencias**:
  - Gana: scope simple, consistente con precedente, no necesita design-draft
  - Pierde: un dev nuevo puede no notar que un ticket es legacy
- **Session**: #1 (intake)

## Success metrics

No aplican. Mejora de cobertura y tipos — sin metricas de negocio ni sistema.

## Technical reference

### Archivos y funciones relevantes

- `horadric-cube/shared/types.ts` — tipos exportados al frontend y backend
- `horadric-cube/server/deckard/frontmatter.ts:40-46` — `inferRecordType`: regex `/^[A-Z]{2,5}-\d+/` ya tolera `TICKET-`
- `horadric-cube/server/deckard/flowInference.ts:22-23` — `=== true` que da tolerancia accidental actual
- `horadric-cube/server/routes/tickets.ts:97-101` — `?? null` y `Array.isArray` defensivos
- `horadric-cube/server/deckard/workflow.ts:31-32` — `typeof === 'string'` defensivo
- `horadric-cube/server/deckard/frontmatter.test.ts:32-39` — unico test existente con fixture legacy (`BLY-002`)

### Baseline esperado (se confirma en task #1)

- `npm test` de horadric-cube debe estar all-green antes de empezar — si no, reportar y detener
- Los tickets fixtures (HOR-001, BLY-002, TICKET-001) existen en sus repos de Deckard y son legibles con el consumer actual

## Rules discovered

- **RULE-server-frontmatter-legacy-001** (project: horadric, module: server, level: must, scope: module) — Creada en task #4. Formaliza tres invariantes: (a) tipos opcionales para campos nuevos; (b) guards explicitos al leer (`=== true`, `?? default`, `typeof === 'string'`, `Array.isArray`); (c) test con fixture legacy obligatorio al agregar un campo nuevo. Extiende `RULE-index-001` al frontmatter.

## Bugs found

*(ninguno)*

## Acceptance checkpoints

- [ ] **Funcional**: todos los scenarios de REQ-IMPROVE-01/02/03 y REQ-PRESERVE-01/02 pasan
- [ ] **Tests**: 3 tests nuevos en `flowInference.test.ts`, al menos 2 en `tickets.test.ts`, todos verdes
- [ ] **NFRs**: N/A
- [ ] **Rules**: RULE-server-frontmatter-legacy-001 creada y reindexada
- [ ] **Integration**: diff vacio en los 3 snapshots JSON de endpoints de flow
- [ ] **Docs**: la regla es la doc — verificar que tiene las 6 secciones del template
