---
id: SPEC-layout-fix-create-payload-schema-filter
project: up1
ticket: TICKET-067
status: done
---

# Fix: filtrar la inyección de initialData en RecordDetail.handleSubmit a campos reales del objeto

# Fix: filtrar la inyección de initialData en RecordDetail.handleSubmit a campos reales del objeto

## Executive summary — lo que estas aprobando

**Que se quiere**: que `RecordDetail.handleSubmit` deje de reenviar al `createInstance` campos **virtuales** (display-siblings de FK como `institutionName`, objetos de relación, `extended`) que el prefill del clone copia a `initialData`. Hoy Prisma rechaza esos campos ("Unknown field") y el clone de cualquier objeto con FK-display no se puede guardar. El fix es **un bloque** (la inyección de `initialData`, L3633-3640): inyectar solo keys que sean columnas reales del objeto + una allowlist de campos backend-required (owner polimórfico).

**Decisiones críticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Fijar en la **inyección de initialData** (L3633-3640), NO en el field-loop ni en el prefilledModal | El field-loop no es el culpable (el junk no es form-field); tocarlo agrega riesgo. La inyección es el único punto por donde el junk entra |
| 2 | Filtro = `baseFields ∪ customFields` (por nombre) **+ allowlist** `[ownerType, ownerId, recordType]` | El allowlist es red de seguridad: garantiza que el owner polimórfico se preserve aunque algún codegen no lo liste en baseFields |

**Riesgos principales y mitigación**:

- **Romper el clone de secciones (owner polimórfico)** → el filtro mantiene `ownerType/ownerId/recordType`; S1.T3 valida clonando una sección (modality), no solo academicProgram.
- **Romper edit / create normal** → edit no usa `initialData`; create normal sin prefill tiene `initialData` vacío. S1.T3 incluye regression de edit + create normal.

**Que NO se hace**: tocar el prefilledModal de `RecordList.vue` (Opción B, más acotada) ni el field-loop. El fix en la inyección cubre todo create con `initialData` sobre-fetcheado.

**Tamaño estimado**: 1 session (~2 SP). Lo riesgoso es la regresión (core compartido), no el cambio.

**Como vas a saber que funciona**: clonar academicProgram en UPU guarda OK (payload sin junk); clonar una sección (modality) sigue funcionando; edit y create normal de otro objeto no se rompen; tests del engine verdes.

---

## Purpose

`RecordDetail.handleSubmit` (repo `layout/`, core) arma el payload de `createInstance`/`updateInstance`. El bloque de inyección de `initialData` (L3633-3640) — pensado para campos backend-required ausentes del form pero columnas reales (owner polimórfico) — reenvía **toda** key de `initialData`, incluido el junk virtual que el prefilledModal del clone copia de la fila. Filtrar esa inyección a campos reales del objeto cierra la clase de bug para todo el create/clone del engine.

## Requirements

### REQ-FIX-01: La inyección de initialData solo agrega columnas reales

> **Que cambia**: al guardar un create con `initialData` (caso típico: clone via prefilledModal), el payload ya no incluye campos que no son columnas del objeto (`institutionName`, `executionUnitName`, `governanceunit`, `extended`-junk).
> **Por que**: Prisma rechaza columnas desconocidas → el clone no se puede guardar hoy.

El sistema MUST, en la inyección de `props.initialData` de `handleSubmit`, agregar al payload únicamente las keys que sean campos reales del objeto (`baseFields ∪ customFields` por nombre) o pertenezcan a la allowlist `[ownerType, ownerId, recordType]`; las demás keys de `initialData` se descartan.

**Actor**: system · **Layers**: frontend (layout-engine)

<details><summary>Scenarios de validacion</summary>

#### Scenario: clone con FK-display guarda sin junk
- **GIVEN** un clone de academicProgram (initialData con `institutionId` + `institutionName` + `governanceunit` + `extended`)
- **WHEN** el usuario completa `code` y guarda
- **THEN** el payload de `createInstance` incluye `institutionId/governanceUnitId/...` (columnas) y NO incluye `institutionName/executionUnitName/governanceunit/extended`
- **AND** el create tiene éxito (Prisma no rechaza)

#### Scenario: campo virtual descartado
- **GIVEN** `initialData` con una key `<x>Name` que no es columna
- **WHEN** se arma el payload
- **THEN** esa key no llega al payload

</details>

#### Acceptance
**El usuario puede verificar que funciona**: clona una carrera, completa el código, guarda → se crea sin error.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-1 | Clone academicProgram guarda | initialData con junk | completar code + guardar | create OK, payload sin junk | éxito + payload limpio |
| TC-2 | Campo virtual descartado | initialData con `<x>Name` no-columna | armar payload | key ausente | no en payload |

### REQ-PRESERVE-01: Owner polimórfico, edit y create normal intactos

> **Que cambia**: nada en esos flujos — siguen igual.
> **Por que**: la inyección existe para el owner polimórfico (clone de secciones); el filtro no debe romperlo, ni afectar edit/create normal.

El sistema MUST preservar: (a) la inyección de `ownerType/ownerId/recordType` cuando el clone de un objeto polimórfico (ej. CurricularSection/modality) los trae en `initialData`; (b) el comportamiento de edit (no usa `initialData`); (c) el create normal sin prefill.

**Actor**: system · **Layers**: frontend (layout-engine)

#### Acceptance
**El usuario puede verificar que funciona**: clonar una sección (modality) sigue creando con su owner correcto; editar y crear normal de otro objeto no cambian.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-3 | Owner polimórfico preservado | clone de sección con ownerType/ownerId en initialData | guardar | payload incluye ownerType/ownerId | sección creada con owner |
| TC-4 | Edit/create normal no roto | edit por instanceId / create sin prefill | guardar | payload correcto | sin regresión |

## Fix scope (antes / después)

**Antes** (`RecordDetail.vue` L3633-3640):
```js
if (props.initialData) {
  for (const [fieldName, value] of Object.entries(props.initialData)) {
    if (submitData[fieldName] != null) continue;
    submitData[fieldName] = value;   // inyecta TODA key (incl. junk virtual)
  }
}
```

**Después** (filtro a campos reales + allowlist):
```js
if (props.initialData) {
  const OWNER_ALLOWLIST = new Set(['ownerType', 'ownerId', 'recordType']);
  const realFields = new Set([
    ...baseFields.map((f) => f.name),
    ...customFields.map((f) => f.name),
  ]);
  for (const [fieldName, value] of Object.entries(props.initialData)) {
    if (submitData[fieldName] != null) continue;
    if (!realFields.has(fieldName) && !OWNER_ALLOWLIST.has(fieldName)) continue; // drop virtual/junk
    submitData[fieldName] = value;
  }
}
```

## Tasks

### Session 1 — Filtrar la inyección de initialData [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Implementar el filtro en la inyección de initialData (L3633-3640): `baseFields ∪ customFields` + allowlist owner | REQ-FIX-01, REQ-PRESERVE-01 | developer | — | `layout/src/layouts/RecordDetail.vue` | typecheck + lint del archivo | git revert | DET-5, DET-8, DET-16, RULE-dev-004 | pending | 1 |
| S1.T2 | Tests del engine: payload limpio (junk dropeado) + owner polimórfico/allowlist preservado | REQ-FIX-01, REQ-PRESERVE-01 | developer | S1.T1 | `layout/src/layouts/__tests__/` (o donde vivan los tests de RecordDetail) | vitest del layout-engine | git revert | DET-7, DET-13 | pending | 1 |
| S1.T3 | Smoke en UPU: clone academicProgram guarda (payload sin junk, vía Network) + clone de sección (modality) OK + regression edit/create normal | REQ-FIX-01, REQ-PRESERVE-01 | developer | S1.T1 | suite :3000 / OM | smoke UI + inspección de payload createInstance | (no aplica — verificación) | DET-13 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T3, ⚑ fuerte) — persistir, validar TCs + regresión, decidir | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-23 | pending | 1 |

### Task contracts

```
Task S1.T1: filtro en la inyección de initialData
- source_ref: REQ-FIX-01, REQ-PRESERVE-01
- agent: developer
- files: layout/src/layouts/RecordDetail.vue (bloque L3633-3640)
- precondition: rama UPONE-1271-recorddetail-payload-fix (desde develop)
- expected_output: la inyección solo agrega keys en baseFields∪customFields + allowlist [ownerType,ownerId,recordType]
- validation: typecheck + lint; el diff es de un solo bloque
- rollback: git revert
- rules: [DET-5, DET-8, DET-16, RULE-dev-004]
```

```
Task S1.T2: tests del engine
- source_ref: REQ-FIX-01, REQ-PRESERVE-01
- agent: developer
- files: tests de RecordDetail en layout/ (vitest)
- precondition: S1.T1
- expected_output: test que arma initialData con junk + owner → verifica payload limpio + owner preservado
- validation: vitest run del área
- rollback: git revert
- rules: [DET-7, DET-13]
```

```
Task S1.T3: smoke + regression en UPU
- source_ref: REQ-FIX-01, REQ-PRESERVE-01
- agent: developer
- files: suite :3000 / OM (runtime)
- precondition: S1.T1 (cambio en el bundle de layout — confirmar cómo lo consume la suite: build/sync del layout-engine)
- expected_output: clone academicProgram guarda (payload sin junk en Network); clone de sección OK; edit/create normal sin regresión
- validation: smoke UI + inspección del payload createInstance
- rollback: (no aplica)
- rules: [DET-13]
```

## Constraints

- RULE-dev-004 / core_work_policy: layer:core → rama `UPONE-1271-recorddetail-payload-fix` (desde develop), commits prefijados `UPONE-1271` (DET-19), merge a develop gated por team up1. El cierre DKC NO implica merge.
- DET-16 (propagación): `handleSubmit` es el submit de TODO RecordDetail (create+edit, todo objeto) — el cambio debe preservar owner polimórfico, edit y create normal.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El filtro dropea un campo backend-required legítimo no listado en baseFields | low | clone de sección roto | allowlist explícita [ownerType,ownerId,recordType] + smoke S1.T3 con clone de modality |
| El cambio del bundle layout no llega a la suite corriendo | medium | "no se ve el fix" | confirmar en S1.T3 cómo la suite consume layout-engine (build/sync) y aplicarlo |

## Open questions

- [ ] (a confirmar en S1.T3) cómo la suite :3000 consume el cambio en `layout/` (¿build del paquete? ¿HMR? ¿sync?) — determina el paso de verificación.

## Decisions

### DEC-LOCAL-01: Fix en la inyección de initialData (no en field-loop ni prefilledModal)
- **Contexto**: dónde filtrar el junk del payload
- **Drivers**: el junk no es form-field (no pasa por el field-loop); el prefilledModal (Opción B) solo cubriría el clone
- **Opción elegida**: filtrar la inyección de `initialData` en handleSubmit (L3633-3640) a campos reales + allowlist owner
- **Alternativas**: B (excluir siblings en prefilledModal — más acotada); tocar el field-loop else (no es el culpable, riesgo sin beneficio)
- **Consecuencias**: cubre todo create con initialData sobre-fetcheado; cambio de 1 bloque
- **Session**: design (pre-S1)

## Acceptance checkpoints

- [ ] **Funcional**: TC-1/TC-2 (clone guarda, payload sin junk)
- [ ] **Regression**: TC-3 (owner polimórfico) + TC-4 (edit/create normal) — sin romper
- [ ] **Tests**: vitest del engine verde
- [ ] **Smoke**: clone academicProgram + clone modality en UPU
- [ ] **Rules**: RULE-dev-004 (rama core), DET-16 (propagación verificada)
