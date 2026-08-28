---
id: SPEC-curriculum-design-fix-orgunit-reduced-adapt
project: up1
ticket: TICKET-076
status: done
---

# Adaptar curriculum-design al OrgUnit reducido de engagement

# Adaptar curriculum-design al OrgUnit reducido de engagement

> **✅ ACTIVA (2026-06-22) — DEC-018.** Esta spec describe la adaptación cd → OrgUnit reducido (Faculty), que **es la correcta**: la reducción del OrgUnit ES canónica (verificado contra git: `Base/orgunit.json` reducido en develop + rama desde `42f55f3`, 2026-06-09, sin revert). S1 está re-aplicado (commits `bb263bd`/`77ce01b`/`a1231a7`, suite 748). El cierre wont-do previo (DEC-017) fue un error basado en un schema local stale y quedó **superseded por [DEC-018](../decisions/dec-018.md)**. Pendiente: validación DB-gated (S2) tras reset/sync canónico desde develop.

## Executive summary — lo que estas aprobando

**Que se quiere**: El merge de `develop` trajo la reduccion del org spine de Clemente (engagement pasa a ser canonico de `OrgUnit`). El codigo de SP4 en `curriculum-design` (AcademicProgram + seeds + syllabus) quedo dependiendo de un `OrgUnit` "academico" — `recordType ∈ {AcademicGovernance, AcademicExecution}` + `institutionId` inline — que ya no existe. Hay que adaptar el mod al modelo reducido para que el seed/sync real vuelva a funcionar, sin tocar engagement.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Mapear `AcademicGovernance` y `AcademicExecution` → ambos al RecordType `Faculty` de engagement | Faculty es "nodo de gobierno academico" y conserva `institutionId` en su extension; es el reemplazo canonico. **Principio rector (DEC-016)**: engagement es inmutable desde cd; si cd necesitara distinguir governance vs execution a nivel de nodo, lo resuelve EN cd (rol por FK, o marcador/extension propio), NO pidiendo cambios a engagement. La opcion A queda descartada |
| 2 | Codificar el rol governance/execution por el FK de AcademicProgram (`governanceUnitId` vs `executionUnitId`), no por `recordType` | Elimina la dependencia del recordType academico sin perder informacion: el rol ya lo da la relacion |
| 3 | Anclar institucion via la extension `rt__Faculty__OrgUnit` (no via columna inline) | engagement movio `institutionId` a la extension del RT; las queries y creates del seed cambian de forma |

**Riesgos principales y como los mitigamos**:

- **Tests verdes que mienten** (seed-tests corren contra stubs que aceptan cualquier campo) → la acceptance real es DB-gated: `reset-mods` + `sync` + `seed` contra el schema regenerado desde engagement (Session 2, T3).
- **governance y execution ambos Faculty** podria no satisfacer Learning Assurance → documentado como open question; si se confirma necesidad de distinguir a nivel de nodo, escalar a opcion A.
- **Stub desactualizado** (no conoce `rt__Faculty__OrgUnit`) rompe seed-tests al agregar el upsert → extender el stub es parte de S1.T5.

**Que NO se hace en este ticket**:

- No se modifica `uengagement-up1` (engagement es canonico; solo se lee su contrato).
- No se reinstaura el arbol academico en OrgUnit (opcion A descartada por el dev).
- No se cubre la migracion de datos existentes de OrgUnit recordType viejo (no hay datos vivos; el seed recrea).

**Tamano estimado**: 2 sessions. S1 (~1.5-2h, codigo + tests stub) es la mas larga; S2 (~30min, validacion DB-gated) la corre el dev o con autorizacion explicita.

**Como vas a saber que funciona**:

- `npm test` en `mods/curriculum-design` queda verde con los seeds adaptados.
- Un `reset-mods` + `sync` + `seed` real crea una unidad `Faculty` con `institutionId` en su extension y el AcademicProgram resuelve governance/execution sin error de columna/enum.

---

## Principio rector (DEC-016)

> **engagement es inmutable desde cd.** Todo lo que curriculum-design necesite para funcionar con el modelo reducido se resuelve con **cambios en cd**, nunca pidiendo cambios a engagement. Consecuencias para esta spec: (1) el mapeo `Academic* → Faculty` + rol por FK es **definitivo**, sin fallback a "opcion A"; (2) cd asume ser el seeder de facto del org spine (crea su propia Organization/Institution/Faculty); (3) cualquier necesidad futura (ej. rol a nivel de nodo) se implementa del lado de cd. Ver [DEC-016](../decisions/dec-016.md).

## Purpose

Restaurar la coherencia entre `curriculum-design` (consumidor) y el `OrgUnit` canonico de `uengagement-up1` tras la reduccion del org spine, mapeando los roles academicos al RecordType `Faculty` y anclando institucion via su extension `rt__Faculty__OrgUnit`. El fix toca objeto, resolver, seeds y tests del mod; no introduce modelo nuevo (reusa el contrato existente de engagement — DET-32 veredicto: **reuse**).

## Requirements

### REQ-FIX-01: Seeds y resolver operan contra el OrgUnit reducido (Faculty)

> **Que cambia**: los seeds dejan de crear/consultar `OrgUnit` por `recordType: 'AcademicExecution'` + `institutionId` inline; pasan a crear unidades `recordType: 'Faculty'` con `institutionId` en la extension `rt__Faculty__OrgUnit`, y a buscarlas por esa extension. El resolver `syllabus-offering` consulta `recordType: 'Faculty'`.
> **Por que**: el `OrgUnit` canonico de engagement ya no tiene `recordType` academico ni `institutionId` inline; el codigo actual rompe en sync/seed real.

El sistema MUST crear y resolver las unidades organizativas academicas usando el RecordType `Faculty` de engagement y su extension `rt__Faculty__OrgUnit` para el `institutionId`.

**Actor**: system (seed + resolver)
**Layers**: backend, database, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed crea unidad Faculty con institucion
- **GIVEN** el schema Prisma regenerado desde engagement (OrgUnit sin recordType academico ni institutionId inline)
- **WHEN** corre `_data-aiep.js` / `_data-univalle.js`
- **THEN** se crea un `OrgUnit` con `recordType: 'Faculty'` y un `rt__Faculty__OrgUnit` con `institutionId` del tenant
- **AND** no se escribe `institutionId` ni `recordType: 'AcademicExecution'` en la base de OrgUnit

#### Scenario: busqueda de la unidad ejecutora
- **GIVEN** una institucion con una unidad Faculty seedeada
- **WHEN** `_data-academicprogram.js` / `_data-syllabus.js` / `syllabus-offering.resolver.js` buscan la unidad
- **THEN** la encuentran via `rt__Faculty__OrgUnit` (por `institutionId`) o por `recordType: 'Faculty'`, sin referenciar columnas inexistentes

#### Scenario: sync/seed real no rompe
- **GIVEN** `reset-mods` + `sync` aplicados (OrgUnit regenerado desde engagement)
- **WHEN** corre el seed
- **THEN** completa sin error de columna desconocida ni valor fuera del enum `OrgUnitRecordType`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras `reset-mods` + `sync` + `seed`, consultar el OrgUnit creado y ver `recordType=Faculty` + su extension con `institutionId`; el AcademicProgram seedeado tiene governanceUnitId/executionUnitId resueltos.

### REQ-FIX-02: AcademicProgram codifica el rol por FK, no por recordType

> **Que cambia**: las descripciones de `governanceUnitId`/`executionUnitId` en `AcademicProgram.json` y en el layout dejan de citar `recordType=AcademicGovernance/AcademicExecution`; el rol queda definido por cual FK referencia la unidad (ambas Faculty).
> **Por que**: el recordType academico era redundante con el rol; el modelo reducido no lo tiene.

El sistema MUST determinar el rol (gobierno vs ejecucion) de una unidad por el FK de `AcademicProgram` que la referencia, no por un `recordType` de OrgUnit. Las descripciones MUST reflejar `recordType=Faculty`.

**Actor**: system / admin (consumidor del layout)
**Layers**: config

#### Acceptance
**El usuario puede verificar que funciona**: el objeto y el layout describen las unidades como Faculty; el picker de OrgUnit sigue mostrando por `name` (sin filtro roto por recordType academico).

### REQ-REGRESSION-01: La suite del mod permanece verde

> **Que cambia**: nada de comportamiento; se extiende el stub `stubPrisma` para conocer `rt__Faculty__OrgUnit` y se actualizan las aserciones/fixtures que esperaban el recordType academico.
> **Por que**: DET-7 — la adaptacion no debe romper la suite existente (746 tests).

El sistema MUST mantener la suite de `curriculum-design` verde tras la adaptacion.

**Actor**: system (CI/test)
**Layers**: backend

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | suite completa | post-cambios S1 | `npm test` | pasa | 746+ tests verdes |
| 2 | seed-counts | stub extendido | correr seed-counts.test.ts | cuenta unidades Faculty | aserciones actualizadas pasan |

## Fix scope

### Antes (comportamiento actual)
Seeds y resolver crean/consultan `OrgUnit` con `recordType: 'AcademicExecution'` + `institutionId` inline. Contra el schema regenerado desde engagement (sin esas columnas/valores) el seed rompe; los tests no lo atrapan (stubs).

### Despues (comportamiento esperado)
Unidades academicas creadas como `recordType: 'Faculty'` + extension `rt__Faculty__OrgUnit` con `institutionId`; busquedas via esa extension o `recordType: 'Faculty'`; rol por FK de AcademicProgram. Seed/sync real funciona; suite verde.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `objects/AcademicProgram.json` | descripciones governanceUnitId/executionUnitId → Faculty (FK sin cambio) | doc/contrato; sin cambio estructural |
| `config/layouts/default_AcademicProgram_create.json` | descripciones de campos | cosmetico (picker por name) |
| `logic/syllabus-offering.resolver.js` | query `recordType: 'AcademicExecution'` → `'Faculty'` | runtime: resolucion de unidad ejecutora |
| `seed/_data-aiep.js`, `seed/_data-univalle.js` | create Faculty + `rt__Faculty__OrgUnit.upsert(institutionId)` | seed fixtures AIEP/Univalle |
| `seed/_data-academicprogram.js`, `seed/_data-syllabus.js` | find via `rt__Faculty__OrgUnit` / `recordType: 'Faculty'` | resolucion de unidad en seed |
| `tests/integration/seed-counts.test.ts` | aserciones recordType Faculty | regression |
| `tests/llm-e2e/fixtures/seed-aiep.json`, `seed-uv.json` | recordType en fixtures | regression |
| `tests/**/stubPrisma` (helper) | conocer modelo `rt__Faculty__OrgUnit` | habilita seed-tests con el upsert |

## Tasks

### Session 1 — Adaptacion de codigo (objeto + resolver + seeds + tests) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | Actualizar descripciones de AcademicProgram (objeto + layout) a recordType=Faculty | REQ-FIX-02 | developer | — | objects/AcademicProgram.json, config/layouts/default_AcademicProgram_create.json | grep sin AcademicGovernance/AcademicExecution; JSON valido | git revert | [DET-2, DET-16] | done | S1 |
| S1.T2 | Adaptar resolver syllabus-offering: query recordType Faculty | REQ-FIX-01 | developer | — | logic/syllabus-offering.resolver.js | unit del resolver verde | git revert | [DET-5, DET-11] | done | S1 |
| S1.T3 | Adaptar seeds de creacion: Faculty + rt__Faculty__OrgUnit.upsert(institutionId) | REQ-FIX-01 | developer | — | seed/_data-aiep.js, seed/_data-univalle.js | seed-entry.test verde (stub extendido) | git revert | [DET-5, DET-8, DET-11] | done | S1 |
| S1.T4 | Adaptar seeds de busqueda: find via rt__Faculty__OrgUnit / recordType Faculty | REQ-FIX-01 | developer | S1.T3 | seed/_data-academicprogram.js, seed/_data-syllabus.js | seed-entry.test verde | git revert | [DET-5, DET-11] | done | S1 |
| S1.T5 | Extender stub rt__Faculty__OrgUnit + actualizar seed-counts.test + fixtures llm-e2e | REQ-REGRESSION-01 | developer | S1.T3 | tests/**/stubPrisma, tests/integration/seed-counts.test.ts, tests/llm-e2e/fixtures/seed-aiep.json, tests/llm-e2e/fixtures/seed-uv.json | `npm test` 746+ verde | git revert | [DET-4, DET-7] | done | S1 |
| S1.GATE | Quality review (DET-23) + suite verde + commits granulares por fase | REQ-REGRESSION-01 | reviewer | S1.T1,S1.T2,S1.T4,S1.T5 | — | `npm test` verde; lint/tipos sin errores; decision continue/iterate | — | [DET-13, DET-23, DET-27] | done | S1 |

### Session 2 — Validacion DB-gated (acceptance real) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S2.T1 | reset-mods + sync + seed real (AIEP/Univalle); verificar Faculty + extension institutionId + AcademicProgram resuelto | REQ-FIX-01 | reviewer | S1.GATE | (DB; sin cambio de codigo) | seed corre sin error de columna/enum; OrgUnit Faculty con institutionId en extension; AcademicProgram governance/execution resueltos | re-seed | [DET-13] | done | S2 |
| S2.GATE | Acceptance final + cierre de hipotesis | REQ-FIX-01 | reviewer | S2.T1 | — | evidencia DB capturada; decision continue/close | — | [DET-13, DET-14] | done | S2 |

> **DB-gated**: S2 es interactiva. La corre el dev o con autorizacion explicita; no se ejecuta como parte de un autopilot.

## Evaluacion contra engagement (estado actual, 2026-06-19)

Validado contra `uengagement-up1` en `develop` (limpio, 0 behind). Confirma la viabilidad de B y agrega 2 matices:

- **`recordType` Faculty es valido en runtime**: el propio seed de engagement escribe `recordType: 'SupportCenter'` a `prisma.orgUnit` — la columna recordType se genera via los RTs (Campus/Faculty/SupportCenter); Faculty es valor valido del enum regenerado.
- **`OrgUnit.code` es nullable y NO required**; `type` es string libre requerido. Nuestra unidad Faculty debe setear `type` (sugerido `'Faculty'` por claridad, hoy el seed usa `'School'`).
- **engagement NO crea Organization ni Institution**: su seed hace `organization.findFirst()` (asume que ya existen) y solo crea 9 `SupportCenter`. **El creador de facto del org spine (Organization + Institution) es el seed de curriculum-design.** No bloquea el fix (nuestro seed sigue creando su propia org/institution para AIEP/Univalle), pero es coexistencia accidental: en deploy conjunto, engagement se cuelga de la org que creo nuestro seed.
- **engagement NO seedea unidades Faculty** → curriculum-design crea la suya (confirmado).

## Constraints

- No modificar `uengagement-up1` (canonico del org spine). Solo se lee su contrato.
- Respetar las convenciones de seed del mod (idempotencia por keys naturales; upsert).
- No commitear artefactos de sync/seed generados (DET de up1): solo source autorado del mod.

## Risks

- **governance ≠ execution a nivel de nodo**: si Learning Assurance lo exige, el mapeo a un unico `Faculty` queda corto. Mitigacion (DEC-016): se resuelve EN cd (rol por FK ya lo cubre; si hiciera falta a nivel de nodo, un marcador/extension propio de cd) — **NO** se escala a engagement.
- **Stub vs schema real**: la cobertura con stub no prueba columnas/enums → S2 DB-gated es la acceptance que cierra el riesgo (DET-13).

## Open questions

> Las preguntas de modelo quedaron **cerradas por DEC-016** (engagement inmutable desde cd; cd resuelve lo suyo). Se documentan aqui resueltas para trazabilidad:

- ~~¿Distinguir gobierno vs ejecucion a nivel de NODO?~~ → **Resuelto (DEC-016)**: rol por FK de AcademicProgram. Si en el futuro hiciera falta a nivel de nodo, se implementa en cd, no en engagement.
- ~~¿engagement seedea una `Faculty` base / el org spine?~~ → **Resuelto (DEC-016)**: NO se le pide a engagement. cd crea su propia Organization/Institution/Faculty (seeder de facto, comportamiento actual).
- **Solo queda menor**: `type` de la unidad Faculty — `'Faculty'` (alineado al RT) vs `'School'` actual. Se resuelve en ejecucion.

## Acceptance

- [ ] REQ-FIX-01: seed/sync real crea Faculty + extension institutionId; busquedas resuelven sin error (S2.T1).
- [ ] REQ-FIX-02: objeto + layout describen Faculty; rol por FK.
- [ ] REQ-REGRESSION-01: `npm test` 746+ verde (S1.GATE).
