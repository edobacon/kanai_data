---
id: BUG-workflow-yaml-mapping-colon-002
project: horadric
type: bug
module: workflow
status: fixed
severity: medium
tags:
  - yaml
  - frontmatter
  - parser
  - drift
  - lessons-from-hor-051
---

# YAML mapping con `:` dentro de valor sin quotes rompe parser

## Symptom

Al escribir frontmatter de un spec con valores que contienen `:` (ej: `C1: POC S2 demuestra dispatch automatico (acceptance: 5/5 disparan...)`), el parser YAML interpreta el segundo `:` como inicio de mapping key/value nested, rompiendo la estructura. `gray-matter` y python `yaml` ambos fallan con `mapping values are not allowed here`.

## Expected behavior

El frontmatter deberia parsear sin error. Los valores deberian preservarse como strings literales, no como mappings nested.

## Root cause

YAML interpreta `key: value with: another colon` como ambiguo:
- `value with` se trata como key potencial
- `another colon` como mapping nested
- Resultado: `mapping values are not allowed here in line X column Y`

- **File**: `projects/horadric/specs/SPEC-workflow-directive-enforcement-a-cross-host-51.md` (in-session, fix aplicado)
- **Cause**: enumeracion de conditions con formato `- C1: descripcion con (acceptance: 5/5 ...)`. El `:` dentro del parentesis se interpreta como mapping value separator

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | LLM al producir frontmatter de specs con conditions enumerados |
| Data affected | frontmatter de specs/tickets con conditions/notas que contienen `:` |
| Modules affected | workflow (parser de specs), server (indexer fallar al leer frontmatter) |
| Frequency | siempre que el valor contenga `:` sin quotes |

## Reproduction

### Environment
| Campo | Valor |
|-------|-------|
| Environment | dev |
| Browser/Client | N/A — runtime de python yaml o JS gray-matter |
| Data conditions | frontmatter con valor que contenga `:` interno |

### Steps
1. Crear frontmatter YAML con `conditions: [- "C1: desc (acceptance: 5/5 disparan)"]` sin quotes externas
2. Ejecutar `./commands/dkc-reindex {project}`
3. Observar error `mapping values are not allowed here in line X column Y` y reindex falla

## Workaround

**Aplicado in-session HOR-051**: usar comillas dobles para envolver el valor completo:

```yaml
conditions:
  - "C1 — POC S2 demuestra dispatch automatico. Acceptance — 5/5 disparan, 0/5 falsos negativos"
```

Patron del workaround: si el valor contiene `:` o cualquier metacaracter YAML (`,`, `[`, `]`, `{`, `}`, `&`, `*`, `#`, `?`, `|`, `-`, `<`, `>`, `=`, `!`, `%`, `@`, `\``), envolver el value en `"..."` o `'...'`.

## Solution

**Inmediato**: usar comillas siempre que el valor contenga `:` o metacaracter YAML.

**Sistemico** (HOR-055 Gap 2): implementar `yaml-strict-no-duplicates` + validator de frontmatter que detecte este patron preventivo. El validator advierte al LLM: "valor contiene `:` interno, envolver en comillas dobles".

**Patron para teach futuros del LLM**: cuando enumeras conditions, NFRs, o cualquier lista con texto narrativo, **default a quotes**. Es mas seguro siempre quotear que recordar las reglas de YAML escape.

## Related

- **Rules**: (ninguna directa — RULE-workflow-* a crear post-validator)
- **Decisions**: (ninguna)
- **Specs**: SPEC-workflow-directive-enforcement-a-cross-host-51 (donde se introdujo y fixeo)
- **Tickets**: HOR-051 (lugar de descubrimiento), HOR-055 (Gap 2 captura validator preventivo)
- **Related bugs**: BUG-workflow-yaml-strict-no-duplicates similar pattern (capturado en backlog HOR-053 D12)
