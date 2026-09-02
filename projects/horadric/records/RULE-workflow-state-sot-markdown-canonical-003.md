---
id: RULE-workflow-state-sot-markdown-canonical-003
project: horadric
type: rule
module: workflow
level: must
tags:
  - state
  - source-of-truth
  - projections
  - dkc-v2
  - llm-only-prep
---

# Markdown es Source of Truth canonical; SQLite + frontmatter cacheado son proyecciones derivadas

## What

El **markdown body** (incluyendo `## Sessions`, `## Triage`, `## Backlog`, etc.) ES la fuente de verdad canonical de un ticket/spec/rule/decision/bug DKC. Las siguientes capas son **proyecciones derivadas** del markdown, NO fuentes de verdad:

1. **Frontmatter YAML cacheado**: si el frontmatter dice `status: open` pero el body tiene `### Session N — ...` con gate decision `close`, el body gana. El frontmatter es proyeccion barata pero NO autoritativa
2. **SQLite index** (`projects/{project}/index.db`): reconstruible 100% via `dkc-reindex {project}`. Si el SQLite se borra accidentalmente, el sistema reconstruye desde markdown sin perdida
3. **Sub-carpetas hermanas** (`{ticket}.draft/`, `{ticket}.teach/`, `{ticket}.screenshots/`, `{ticket}.inventories/`): artifacts referenciados desde el ticket markdown. Su existencia se valida desde el ticket, no son estado paralelo

**Unico writer permitido del SQLite**: `commands/dkc-reindex` (Python `deckard_cain` indexer). Ningun otro tool, step, ni endpoint HC escribe al SQLite directo. HC ya es read-only por construccion (verificado HOR-046 S6.T1: grep `INSERT/UPDATE/DELETE` retorna 0 matches en `horadric-cube/server/`).

## Why

Pre-HOR-046, 6 capas competian paritariamente (frontmatter + body + spec + sub-carpetas + SQLite + config). El LLM era el encargado manual de mantener consistencia entre las 6 — patron observado de drift:

- HOR-018/019/020 cerraron con TCs `pending` en el body PESE a que los tests SI se ejecutaron en sessions. La verdad estaba en commit history + session log; el body no lo reflejaba (motivo DET-25)
- HC viewer reflejaba sessions abiertas porque el parser difiere del shape "real" (caso RULE-dev-002, RULE-dev-003) — drift entre body del ticket y representacion en el index/UI
- HOR-046 S0 mismo: frontmatter `status: open` con Session 0 cerrada (gate decision continue) → ambiguo cual gana

**Decision SoT canonical** elimina esta ambiguedad. El validator/pipeline puede ahora decir "body dice X, frontmatter dice Y → X gana, re-derive Y desde X".

**Para LLM-local**: modelos con context windows pequeños NO pueden razonar sobre 6 capas en paralelo. SoT unica reduce la carga cognitiva del agente ejecutor.

## Where

Aplica a TODO record DKC en `projects/{project}/` (tickets, specs, rules, decisions, bugs, teach files). Aplica a TODOS los consumers (HC viewer, dkc-mcp tools, embeddings indexer, validators).

Excepcion: el `dkc-reindex` ES el writer canonical — su rol arquitectural es legitimo. Sus escrituras son la proyeccion automatica del markdown al SQLite.

## When

Aplica desde HOR-046 (2026-05-16). Para tickets pre-HOR-046:
- Si el frontmatter y body divergen, **body gana** (el reindex re-deriva frontmatter en futuras passes)
- NO migracion masiva retroactiva (HOR-042 DEC-5 + HOR-046 DEC-LOCAL-04)

## How to verify

```bash
# 1. Ningun endpoint HC escribe al SQLite
grep -rE "INSERT|UPDATE|DELETE INTO|exec\(" horadric-cube/server/deckard/sqlite.ts | wc -l
# Expected: 0

# 2. dkc-reindex es la unica entrada de escritura legitima
# (verificado por construccion: solo deckard_cain/core/indexer.py escribe)

# 3. Si SQLite se borra, sistema reconstruye sin perdida:
rm projects/{project}/index.db
./commands/dkc-reindex {project}
# Expected: exit 0, records reconstruidos
```

## Source

- HOR-046 spec: SPEC-workflow-state-sot-and-contracts-46 (REQ-IMPROVE-01)
- HOR-046 S1.T1 inventario: `projects/horadric/tickets/HOR-046.inventories/state-layers.md` (50 campos categorizados canonical/derived/projected)
- HOR-046 S6.T1: verificacion HC read-only por construccion
- HOR-042 (closed): pipeline write→validate→commit (opt-in via `validate_on_write`)
