---
id: SPEC-migration-test
project: pehuen
type: doc
module: migration
tags:
  - tdd
  - paridad
  - legacy-comparison
---

# Migration Test — meta-spec del artefacto

## Artifact Definition

```yaml
name: migration-test
plural: Migration Tests
description: "Test de paridad legacy <-> nuxt. Codifica un comportamiento esperado del sistema, citando su origen en codigo/docs legacy y la decision de migracion (preservar / corregir / mejorar)."
location: tests/{unit,e2e}/migration-paridad/
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | TC-{seq} (correlativo dentro del spec) |
| layer | enum: 1-validators, 2-schemas, 3-components, 4-contracts, 5-e2e | si | Capa del piramide TDD |
| tag | enum: paridad, improvement, bug-fix, bug-preserved, delta-decision | si | Como debe pasar este test (vs legacy/vs nuxt) |
| source_doc | text | si | Path a doc legacy (ej. `pehuen-server/docs/03-flows/guias/create.md`) |
| source_code | text | si | Path:linea legacy (ej. `pehuen-server/src/controllers/guia.controller.ts:48-50`) |
| improvements_ref | reference: improvements.md item | no | Item de improvements.md que origina (ej. §4.4 ingresoRomana) |
| comparison_note | reference: by-flow/by-model/by-dimension | no | Nota de migracion que detallo el gap |
| description | text | si | Que comportamiento testea (1 linea) |
| given | text | si | Precondicion / setup |
| when | text | si | Accion |
| then | text | si | Resultado esperado |
| legacy_behavior | text | no | Como se comporta legacy (si difiere de nuxt) |
| nuxt_behavior | text | no | Como se comporta nuxt |
| pass_against | enum: legacy-only, nuxt-only, both | si | Donde debe pasar (paridad=both; improvement/bug-fix=nuxt-only; bug-preserved=both) |
| validation_command | text | si | Comando ejecutable (ej. `pnpm vitest tests/unit/migration-paridad/auth/login.test.ts`) |
| status | enum: pending, written-red, verified-against-legacy, green-in-nuxt, blocked | si | Estado actual del test |

## Spec Section Template

```markdown
## Migration Tests

| TC | Layer | Tag | Source Doc | Source Code | Description | Pass Against | Status |
|----|-------|-----|------------|-------------|-------------|--------------|--------|
| TC-1 | 4-contracts | @paridad | server/docs/03-flows/auth/login.md | server/src/controllers/auth.controller.ts:54-127 | login con credenciales validas | both | green-in-nuxt |
| TC-2 | 4-contracts | @bug-fix | server/docs/01-data-model/core/guia.md | server/src/dtos/guia.dto.ts:163-165 | ingresoRomana independiente de ingresoPlanta | nuxt-only | written-red |
```

### Detalle expandido por test

```markdown
#### TC-{N}: {description}

- **source_doc**: {path}
- **source_code**: {path:linea}
- **improvements_ref**: {item de improvements.md}

**GIVEN** {precondicion}
**WHEN** {accion}
**THEN** {resultado esperado}

**Legacy behavior**: {comportamiento legacy si difiere}
**Nuxt behavior**: {comportamiento nuxt}

**Validation**: `{comando}`
```

## Requirements

### REQ-01: Cada test debe citar su fuente

- **Aplica cuando**: se escribe un nuevo test de paridad
- **Esperado**: el archivo tiene header con `@source-doc`, `@source-code`, opcional `@improvements-ref`
- **Verificacion**: grep en el archivo por `@source-` retorna match

### REQ-02: Cada test debe tener un tag claro

- **Aplica cuando**: se escribe el test
- **Esperado**: contiene uno de `@paridad | @improvement | @bug-fix | @bug-preserved | @delta-decision`
- **Verificacion**: regex match `test\(['"]@(paridad|improvement|bug-)`

### REQ-03: Verificar contra legacy antes de implementar nuxt

- **Aplica cuando**: tag es `@paridad` o `@bug-preserved`
- **Esperado**: el test pasa al ejecutarse contra `legacy-clone` antes de implementarlo en nuxt
- **Verificacion**: ejecutar `PEHUEN_API_BASE=http://localhost:5001/api pnpm test:run`

### REQ-04: Tests `@improvement` y `@bug-fix` fallan contra legacy

- **Aplica cuando**: tag es `@improvement` o `@bug-fix`
- **Esperado**: el test FALLA contra legacy (porque el comportamiento es nuevo) y PASA contra nuxt
- **Verificacion**: dual run + comparar status

### REQ-05: Test usa fixtures compartidas

- **Aplica cuando**: el test se escribe en `tests/{unit,e2e}/migration-paridad/`
- **Esperado**: importa de `tests/e2e/migration-paridad/fixtures/` (no setup local)
- **Verificacion**: grep `from './fixtures'` o equivalente

## Defaults

```yaml
defaults:
  pass_against: both           # default es paridad
  layer: 4-contracts           # mayoria de tests son contract-level
  status: pending              # se actualiza durante el ciclo
```

## Relations

```yaml
relations:
  - artifact: parity-flow
    type: requires
    description: "Cada migration-test pertenece a un parity-flow (login, create-guia, etc.)"
  - artifact: migration-decision
    type: suggests
    description: "Test con tag @delta-decision sugiere crear una migration-decision para registrar la eleccion del stakeholder"
