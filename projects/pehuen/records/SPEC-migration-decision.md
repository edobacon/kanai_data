---
id: SPEC-migration-decision
project: pehuen
type: doc
module: migration
tags:
  - delta
  - decision
  - stakeholder
  - retired
---

# Migration Decision — meta-spec

## Artifact Definition

```yaml
name: migration-decision
plural: Migration Decisions
description: "Decision tomada por stakeholders sobre un DELTA-CUESTIONABLE detectado. Codifica la eleccion entre paridad legacy y comportamiento nuxt."
location: projects/pehuen/decisions/DEC-{seq}-{slug}.md
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | DEC-{seq}-{slug} |
| improvements_ref | reference: improvements.md item | si | Item DELTA-CUESTIONABLE que origina la decision |
| comparison_note | reference: by-dimension/by-flow/by-model | si | Nota de migracion que detallo el delta |
| context | text | si | Que se evaluaba (1-3 lineas) |
| legacy_behavior | text | si | Como funciona legacy |
| nuxt_proposal | text | si | Como propone funcionar nuxt |
| drivers | text[] | si | Que factores pesaron (UX, seguridad, performance, paridad, mantenibilidad) |
| chosen | enum: paridad-legacy, mejora-nuxt, hibrido, legacy-feature-retired | si | Que se decidio |
| discovered_during | enum: design, implementation, post-corte | no | Cuando se descubrio el delta (default: design). Si es `implementation` → DEC retroactiva, debe llevar tag `retroactive` |
| rationale | text | si | Por que (parrafo) |
| alternatives_discarded | text[] | no | Otras opciones evaluadas |
| consequences | text | si | Que se gana, que se pierde, que comunicar a usuarios |
| stakeholder_approval | text | si | Quien aprobo y cuando (YYYY-MM-DD) |
| migration_tests | reference: migration-test[] | si | Tests que codifican la decision |
| affected_components | reference: parity-flow[] | si | Flows afectados por la decision |

## Spec Section Template

```markdown
## Migration Decisions

| DEC | Item | Chosen | Approved | Tests |
|-----|------|--------|----------|-------|
| DEC-1 | improvements.md§3.10 (AJUSTE_ROLES) | mejora-nuxt | 2026-05-02 | TC-45, TC-46 |
| DEC-2 | improvements.md§1.7 (URLs firmadas) | hibrido | 2026-05-02 | TC-78 |
```

## Requirements

### REQ-01: Cada DELTA-CUESTIONABLE debe tener una migration-decision antes del corte

- **Aplica cuando**: existe item en improvements.md con clase `DELTA-CUESTIONABLE`
- **Esperado**: existe `decisions/DEC-{n}-{slug}.md` con `chosen` y `stakeholder_approval`
- **Verificacion**: cruzar improvements.md con `decisions/`

### REQ-02: Decision debe tener tests que la codifiquen

- **Aplica cuando**: chosen != null
- **Esperado**: lista no vacia de `migration_tests`
- **Verificacion**: cada test referenciado existe en `tests/`

### REQ-03: Decision con `consequences` que afectan UX → comunicacion al usuario

- **Aplica cuando**: el campo `consequences` menciona "comunicar"
- **Esperado**: existe entry en runbook-cutover.md o email plantilla preparada
- **Verificacion**: manual

## Tags estandar de DEC

| Tag | Uso |
|-----|-----|
| `delta-cuestionable` | DELTA-CUESTIONABLE detectado en improvements.md, requiere stakeholder approval |
| `delta-intencional` | Cambio decidido del legacy (mejora). Debe tener IMP-* en `SPEC-migration-improvements` |
| `paridad-client` | Decision basada en RULE-AUTH-011 (capacidades del client legacy son contrato) |
| `legacy-feature-retired` | Feature que se decide NO migrar al nuxt — retirada con justificación |
| `retroactive` | DEC creada despues de implementacion (proceso de SPEC-migration-improvements) |
| `pendiente-aprobacion` | Status `proposed`, esperando stakeholders |

## Defaults

```yaml
defaults:
  chosen: null         # forzar decision explicita
  drivers: []
  discovered_during: design
```

## Relations

```yaml
relations:
  - artifact: migration-test
    type: generates
    description: "Cada decision genera tests que la codifican"
  - artifact: parity-flow
    type: requires
    description: "La decision se aplica a uno o varios parity-flows"
