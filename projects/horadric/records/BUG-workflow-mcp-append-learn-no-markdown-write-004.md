---
id: BUG-workflow-mcp-append-learn-no-markdown-write-004
project: horadric
type: bug
module: workflow
status: fixed
severity: high
tags:
  - mcp-server
  - learns
  - source-of-truth
  - drift
  - ironic-meta
---

# MCP tool `dkc_append_learn_to_ticket` retorna success pero NO escribe al markdown

## Symptom

Llamar al MCP tool `mcp__deckard-cain__dkc_append_learn_to_ticket` con parametros validos retorna:

```json
{ "captured": "L1", "ticket": "HOR-051", "description": "..." }
```

Sugiriendo persistencia exitosa. PERO:

- El markdown del ticket NO tiene seccion `## Learns` agregada
- Tras `dkc-reindex {project}`, el contador `learns=32` queda **constante** (no incrementa por las 9 capturas)
- `sqlite3 ... "SELECT count(*) FROM learns WHERE ticket_id IN (...)"` retorna 0 para los tickets afectados

## Expected behavior

Segun el docstring del tool (`server/src/deckard_cain/tools/...`):

> "Una sola llamada. El LLM pasa la descripcion. El server genera ID, **appends al markdown**, e inserta en la tabla learns del index."

El tool DEBERIA:
1. Generar ID secuencial (L{N})
2. Agregar fila a la tabla `## Learns` del markdown del ticket (crear seccion si no existe)
3. Insertar en SQLite tabla `learns`
4. Retornar `{captured: L{N}, ...}`

Comportamiento observado: paso 2 (escribir al markdown) NO ocurre. Si el paso 3 ocurre, el siguiente `dkc-reindex` lo borra porque markdown = source of truth.

## Root cause

- **File**: `server/src/deckard_cain/tools/*.py` (donde vive el handler de `dkc_append_learn_to_ticket`)
- **Cause**: pendiente de diagnostico. Hipotesis:
  - El handler escribe solo a SQLite, ignora el step de markdown append
  - El handler escribe a markdown a otra ubicacion (cache?, temp?)
  - El handler tiene logica condicional que requiere seccion `## Learns` pre-existente

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | LLM / dev que use `/dkc-learn` o invoque el MCP tool directamente |
| Data affected | Tabla learns en SQLite (regenerada con cada reindex) + secciones `## Learns` faltantes en tickets |
| Modules affected | workflow (captura de learns), server (MCP handler), viewer HC (tab Learns muestra entries inexistentes o incompletas) |
| Frequency | **SIEMPRE** que se invoca el tool sin que la seccion `## Learns` exista pre-write en el ticket. NO verificado si funciona cuando la seccion ya existe |

**Severity HIGH** porque:
- El tool retorna success engañoso (no fail visible)
- Drift silencioso: el dev cree que capturo learns pero NO se persistieron
- Sistema de aprendizaje del proyecto fundamentalmente roto si no se detecta a tiempo

## Reproduction

### Environment
| Campo | Valor |
|-------|-------|
| Environment | dev |
| Browser/Client | Claude Code con MCP server deckard-cain conectado |
| Data conditions | Ticket SIN seccion `## Learns` pre-existente |

### Steps
1. Invocar MCP tool: `mcp__deckard-cain__dkc_append_learn_to_ticket(project="horadric", ticket_id="HOR-051", description="test")`
2. Observar response: `{captured: "L1", ...}` (sugiere success)
3. `grep -n "^## Learns" projects/horadric/tickets/HOR-051.md` → 0 matches
4. `./commands/dkc-reindex horadric` → ejecuta sin error pero learns count NO incrementa
5. `sqlite3 projects/horadric/index.db "SELECT * FROM learns WHERE ticket_id='HOR-051';"` → 0 rows

## Workaround

**Aplicado in-session HOR-055**: escribir manualmente seccion `## Learns` al markdown del ticket con Edit/Write tool. Format:

```markdown
## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | {description} | developer | {session} | raw | — |
| L2 | ... | ... | ... | ... | ... |
```

Tras Edit + reindex, los learns aparecen correctamente en SQLite y son visibles en HC.

## Solution

**Inmediato** (cuando se diagnostique):
- Fix en `server/src/deckard_cain/tools/` handler de `dkc_append_learn_to_ticket`
- Agregar logica de markdown append: crear seccion `## Learns` si no existe + agregar fila a la tabla

**Sistemico** (parte de HOR-055 Gap 8 — validacion de ejecucion):
- El validator `SessionExecution` o un nuevo `MCPToolBehavior` puede testar contractos de los MCP tools: invocar + verificar markdown actualizado + verificar SQLite consistent
- Test de integracion: cada MCP tool de deckard-cain que escribe artefactos debe pasar "smoke test" de persistencia dual (markdown + SQLite)

**Para HOR-055**:
- Este bug es validacion empirica del Gap 8 (validacion de ejecucion enforced — el MCP tool retorna success pero la accion no se completo)
- Generalizable: cualquier MCP tool del server deckard-cain que dice "appends al markdown + insert en SQLite" debe verificarse contractualmente

## Related

- **Rules**: (a crear post-fix) RULE-server-mcp-tool-dual-persistence — todo MCP tool que escribe artefactos DKC debe persistir en markdown + SQLite atomicamente
- **Decisions**: DEC-001 (validacion ejecucion como eje ortogonal — este bug es un caso real)
- **Specs**: HOR-055 spec con Gap 8 ya predice esta categoria de problema
- **Tickets**: HOR-055 (lugar de descubrimiento — meta: el bug emergio durante el procesamiento de aprendizajes del propio HOR-055)
- **Other MCP tools que pueden tener el mismo bug** (verificar):
  - `dkc_append_session_log`
  - `dkc_append_failed_approach`
  - `dkc_promote_learn`
  - `dkc_discard_learn`
  - Cualquier handler que dice "appends al markdown"
