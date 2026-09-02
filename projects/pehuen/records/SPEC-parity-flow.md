---
id: SPEC-parity-flow
project: pehuen
type: doc
module: migration
tags:
  - tdd
  - paridad
  - flow
---

# Parity Flow — meta-spec

## Artifact Definition

```yaml
name: parity-flow
plural: Parity Flows
description: "Flujo del legacy que debe replicarse identico (o con mejoras documentadas) en nuxt. Agrupa migration-tests, decisiones y artefactos del codigo migrado."
location: docs/07-migration-notes/by-flow/ + tests/{unit,e2e}/migration-paridad/{flow}/
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| name | text | si | Identificador del flujo (login, create-guia, upload-ruma-image, batch-ajustes, etc.) |
| legacy_doc | text | si | Path a doc legacy (ej. `pehuen-server/docs/03-flows/guias/create.md`) |
| nuxt_doc | text | si | Path a doc nuxt (ej. `pehuen_nuxt/docs/04-flows/guias/create.md`) |
| migration_note | text | si | Path a nota migracion (ej. `pehuen_nuxt/docs/07-migration-notes/by-flow/create-guia.md`) |
| roles_involved | reference: role[] | si | Roles que disparan o consumen el flujo |
| layers_touched | enum[]: frontend, backend, database, sockets, storage | si | Capas que toca el flujo |
| variants | text | no | Variantes (ej. crear-guia tiene 5 variantes por movimiento) |
| critical_validations | text[] | si | Validaciones que NO pueden perderse en migracion |
| side_effects | table: type, target, payload | si | Side effects: socket emit, audit log, file write |
| improvements_in_flow | reference: improvements-item[] | no | Items de improvements.md que aplican (mejoras o bugs corregidos) |
| migration_tests | reference: migration-test[] | si | Tests de paridad que cubren el flujo (TC-1, TC-2, ...) |
| status | enum: pending, tests-written, in-implementation, parity-validated, content-docs-updated, complete | si | Etapa del flujo en la migracion |

## Spec Section Template

```markdown
## Parity Flows

| Flow | Roles | Layers | Variants | Tests | Status |
|------|-------|--------|----------|-------|--------|
| login | public | frontend, backend | 1 | TC-1 a TC-8 | parity-validated |
| create-guia | ADMINISTRADOR, RECEPTOR | frontend, backend, sockets | 5 (por movimiento) | TC-9 a TC-23 | tests-written |
```

### Detalle por flow

```markdown
#### Flow: {name}

- **legacy_doc**: {path}
- **nuxt_doc**: {path}
- **migration_note**: {path}
- **roles**: {roles}
- **layers**: {layers}
- **variants**: {variants}

**Critical validations**:
- {regla 1 que MUST preservarse}
- {regla 2}

**Side effects**:
| Type | Target | Payload |
|------|--------|---------|
| socket | guias-ALL | new-guide (populated) |
| audit | AuditLog | CREATE_GUIA |

**Improvements involved**: {ej. §4.4 ingresoRomana corregido}

**Migration tests**: TC-{X} a TC-{Y}

**Status**: {tests-written | parity-validated | etc}
```

## Requirements

### REQ-01: Cada parity-flow debe tener su nota de migracion

- **Aplica cuando**: se define un parity-flow
- **Esperado**: existe `pehuen_nuxt/docs/07-migration-notes/by-flow/{name}.md`
- **Verificacion**: archivo existe

### REQ-02: Cada parity-flow debe linkear ambas docs (legacy + nuxt)

- **Aplica cuando**: se llena el meta-spec
- **Esperado**: `legacy_doc` y `nuxt_doc` apuntan a archivos existentes
- **Verificacion**: `test -f {path}` para ambos

### REQ-03: Critical validations deben tener test asociado

- **Aplica cuando**: se llena `critical_validations`
- **Esperado**: cada validacion en la lista tiene un migration-test que la cubre
- **Verificacion**: cruzar contra `migration_tests` por descripcion / source_doc

### REQ-04: Status `complete` requiere documentacion en content/docs actualizada

- **Aplica cuando**: el flow se marca como `complete`
- **Esperado**: existe doc en `pehuen_nuxt/content/docs/` que describe el flujo desde la perspectiva nuxt (no legacy ni migration)
- **Verificacion**: el doc existe + no contiene referencias a `legacy` salvo historicas

## Defaults

```yaml
defaults:
  status: pending
  layers_touched: [frontend, backend]
```

## Relations

```yaml
relations:
  - artifact: migration-test
    type: requires
    description: "Un parity-flow agrupa N migration-tests"
  - artifact: migration-decision
    type: suggests
    description: "Si el flow tiene DELTA-CUESTIONABLE, debe tener migration-decision asociada"
