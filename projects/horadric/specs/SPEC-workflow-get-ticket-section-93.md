---
id: SPEC-workflow-get-ticket-section-93
project: horadric
ticket: HOR-094
status: done
---

# dkc_get_ticket_section — lectura parcial de records

# dkc_get_ticket_section — lectura parcial de records

## Executive summary — lo que estas aprobando

> *Spec DRAFT producido por un explore (HOR-093). NO esta aprobado para execute — es el diseno para que decidas si activarlo.*

**Que se quiere**: un tool que devuelva UNA seccion de un record (`## Request`, `## Sessions`, etc.) sin cargar el archivo entero. Hoy cualquier step que toca una seccion carga el ticket completo (promedio ~5.7k tokens, peor caso ~42k). Para puntos de uso que solo necesitan una seccion (agregar un commit, leer el plan de sessions, consultar el Request de un ticket vecino), eso es 70-99% de tokens desperdiciados.

**Alcance recomendado**: **GET read-only** en fase 1. SET/patch parcial diferido o descartado (compite con las transiciones canonicas `dkc-execute-task`/`dkc-write` y reintroduce riesgo de drift — ver DEC-01).

**Por que ahora**: ya identificado en backlog #6 de HOR-085. El parser (`extractSection`) y el patron (`dkc_get_step_phase`) ya existen — el tool es un wrapper, no infraestructura nueva.

## Purpose

Reducir el gasto de contexto de la capa de DATOS (records), que es la unica dimension de economia de contexto que las optimizaciones previas (HOR-085/086/087/088/089, todas sobre la capa de INSTRUCCIONES) no tocaron. El cuerpo de un record es ~91% del archivo y crece sin techo (Sessions domina).

## Estado actual → deseado → delta

| | Estado |
|---|---|
| **Actual** | Para leer/actualizar una seccion, el step carga el record completo (`Read` del .md entero). Un ticket de 1610 lineas = ~42k tokens en contexto aunque solo se necesite `## Commits` (~10 lineas). |
| **Deseado** | El step pide `dkc_get_ticket_section(project, ticket, "Commits")` y recibe solo esa seccion (~300 tokens) + metadata (secciones disponibles, token estimate del total). |
| **Delta** | 1 tool MCP nuevo (read-only) + 1 CLI espejo, ambos wrappers sobre `extractSection` existente. Cero cambios en HC. Cableado opcional en steps de alto valor. |

## Requirements

### REQ-01 — GET de seccion por heading

> **Que cambia**: nuevo tool de lectura parcial. **Por que**: evitar cargar el record entero para consumir una seccion.

El sistema **DEBE** exponer `dkc_get_ticket_section(project, ticket_id, section, subsection?)` que retorne el contenido de la seccion `## {section}` del record. **DEBE** reusar `extractSection` ([parsers/markdown.ts:80](../../commands/lib/parsers/markdown.ts)) como primitiva (acepta alias array — cubre `## Teaching — Intake` via match de prefijo/alias). **DEBE** retornar estructura: `{ found, section, content, line_range, token_estimate, available_sections }`.

<details><summary>Scenarios</summary>

- GIVEN un ticket con `## Sessions` WHEN se pide section="Sessions" THEN retorna el bloque desde `## Sessions` hasta el proximo `## ` (exclusive), con `found: true`.
- GIVEN section inexistente WHEN se pide THEN `found: false` + `available_sections` lista los headings reales (para que el LLM corrija sin cargar el archivo).
- GIVEN heading con sufijo (`## Teaching — Intake`) WHEN section="Teaching — Intake" THEN match exacto; WHEN section="Teaching" THEN match de prefijo retorna la primera o error de ambiguedad (ver REQ-03).
</details>

### REQ-02 — Metadata anti-perdida-de-contexto

> **Que cambia**: el tool devuelve siempre el indice de secciones + token estimate del total.

Para que el consumo parcial no haga perder el mapa del record, el tool **DEBE** incluir en cada respuesta `available_sections` (lista de headings `##` del record) y `total_token_estimate`. Asi el LLM sabe que mas existe y si vale la pena cargar el resto.

### REQ-03 — Resolucion de ambiguedad de heading

> **Que cambia**: contrato explicito para headings duplicados/prefijos.

El sistema **DEBE** resolver: (a) match exacto del heading primero; (b) si no hay exacto y hay multiples por prefijo → retornar `ambiguous: true` + candidatos, NO adivinar; (c) sub-secciones `### Session N` accesibles via param `subsection` opcional.

### REQ-04 — CLI espejo (fallback sin MCP)

> **Que cambia**: comando `dkc-get-section` que refleja el tool.

**DEBE** existir `commands/dkc-get-section {project} {ticket_id} {section}` (tsx, reusa `extractSection`) para hosts sin MCP (Codex/Cursor) y para scripting. Mismo contrato de salida (JSON).

### REQ-05 — Fuente unica de la logica de extraccion

> **Que cambia**: evitar drift TS↔Python.

El parser canonico (`extractSection`) vive en TS. El tool MCP es Python. **DEBE** resolverse el reuso sin duplicar logica con drift (ver DEC-02): o el tool Python shellea al CLI TS, o reimplementa con un test de paridad TS↔Python obligatorio.

## Tasks

> Activado por HOR-094 (2026-05-31). Ids canonicos `S{N}.T{M}` para tracking DET-28.

| # | Task | Role | Tier | Files | source_ref | DoD | Rollback | Status | Session |
|---|------|------|------|-------|-----------|-----|----------|--------|---------|
| S1.T1 | CLI `dkc-get-section` (TS) + lib `getSection` wrapper sobre `extractSection`; JSON `{found, content, available_sections, token_estimate, ambiguous}` | developer | balanced | commands/dkc-get-section, commands/lib/get-section.ts | REQ-01, REQ-02, [markdown.ts:80](../../commands/lib/parsers/markdown.ts) | CLI retorna seccion existente; inexistente→available_sections; tests verdes | borrar comando + lib | done | 1 |
| S1.GATE | Gate S1: CLI funcional + tests | reviewer | balanced | — | — | tier T2 pass; gate decision | — | done | 1 |
| S2.T1 | Port `extractSection`→Python (`get_section` helper) + tool MCP `dkc_get_ticket_section` (molde `dkc_get_step_phase`), registrar en server | developer | balanced | server/src/deckard_cain/tools/sections.py, server/src/deckard_cain/server.py | REQ-01, REQ-03, REQ-05, [steps.py:72](../../server/src/deckard_cain/tools/steps.py) | tool retorna dict estructurado; `_is_safe_name`; sub-section `### Session N` via param | quitar registro + archivo | done | 2 |
| S2.T2 | Test de paridad TS↔Python (DEC-02) + tests del tool | developer | balanced | server/tests/test_get_section_parity.py | REQ-05, DEC-02 | mismo input→mismo content en CLI y MCP sobre ≥5 fixtures; tests verdes | borrar test | done | 2 |
| S2.GATE | Gate S2: tool MCP + paridad verde | reviewer | balanced | — | — | tier T2 pass; paridad ok; gate decision | — | done | 2 |
| S3.T1 | Cableo en steps alto-valor: task-loop usa get-section (Sessions/Commits), researcher para Request de tickets vecinos | developer | fast | prompts/steps/request-execute/task-loop.md, prompts/agents/researcher.md | REQ-01, OQ-3 | snippet en ambos; `dkc-validate-step-references` 0 huerfanas | revertir snippet | done | 3 |
| S3.GATE | Gate S3: cableo sin romper refs | reviewer | fast | — | — | step-references ok; gate decision | — | done | 3 |

## Constraints

- **Read-only fase 1**: sin SET/patch (DEC-01). El tool no muta records.
- **Cero cambios en HC**: horadric-cube sigue leyendo el .md completo para render (gray-matter + markdown-it). El tool es para consumo del LLM, no del viewer.
- **Reuso, no parser nuevo**: `extractSection` ya cubre la extraccion. Prohibido reimplementar parsing de markdown.

## Dependencies

- Ninguna bloqueante. `extractSection` y el patron `dkc_get_step_phase` ya existen. Independiente de la deuda de coherencia (HOR-092) y del fix de parser (HOR-091).

## Risks and mitigations

| Riesgo | Mitigacion |
|--------|------------|
| **Perdida de contexto** (el LLM lee 1 seccion y pierde el resto) | REQ-02: devolver siempre `available_sections` + `total_token_estimate` |
| **Heading ambiguo** (`## Teaching — Intake/Close`) | REQ-03: match exacto > prefijo; `ambiguous` explicito, no adivinar |
| **Drift TS↔Python** de la logica de extraccion | DEC-02 + T3: test de paridad obligatorio, o shellear al CLI |
| **SET parcial dejaria el resto stale** | DEC-01: GET-only fase 1; SET descartado |
| **Sub-uso** (nadie cablea el tool → no ahorra) | T4: cablear en task-loop + researcher (los puntos de mayor frecuencia × tamano) |

## Open questions

- OQ-1: ¿el MCP Python shellea al CLI TS (single source, +latencia de proceso) o reimplementa extractSection en Python con test de paridad (–latencia, +superficie de drift)? → ver DEC-02 (propuesta, a confirmar en activacion).
- OQ-2: ¿incluir `dkc_get_spec_section` / generalizar a cualquier record desde el inicio, o empezar solo con tickets? Propuesta: generalizar la primitiva pero exponer primero tickets (donde esta el 91%/Sessions).
- OQ-3: ¿medir el ahorro real con instrumentacion (tokens por step antes/despues) o basta la estimacion analitica? Propuesta: estimacion para activar, instrumentacion como follow-up.

## Decisions (cerradas durante el explore)

### DEC-01 — GET read-only en fase 1; SET diferido
- **Drivers**: el SET/patch parcial compite con `dkc-execute-task` y `dkc-write` (transiciones canonicas que garantizan shape + reindex, DET-29) y reintroduce el riesgo de drift que el sistema combate.
- **Alternativas**: (a) GET+SET desde el inicio — descartada (duplica responsabilidad de escritura, alto riesgo). (b) **GET-only** — elegida. (c) GET + SET como fase 2 condicionada a demanda real.
- **Decision**: GET read-only. SET no entra en el alcance de la primera activacion.

### DEC-02 — Single source de extraccion (propuesta, confirmar en activacion)
- **Drivers**: el parser canonico es TS; el server es Python. Reimplementar invita drift (precedente: dets_catalog necesito fuente unica en HOR-088).
- **Propuesta**: el CLI TS (`dkc-get-section`) es la fuente; el tool MCP Python shellea al CLI (subprocess) para garantizar una sola logica de extraccion. Si la latencia de proceso resulta inaceptable en uso real, reimplementar en Python CON test de paridad obligatorio (T3). Confirmar al activar.

## Acceptance checkpoints

> Para la futura activacion (no ahora — explore).

- [ ] AC-1: `dkc-get-section {p} {t} Request` retorna solo `## Request` con `found:true` + `available_sections`.
- [ ] AC-2: seccion inexistente → `found:false` + lista de headings reales.
- [ ] AC-3: heading ambiguo por prefijo → `ambiguous:true` + candidatos, sin adivinar.
- [ ] AC-4: paridad CLI↔MCP sobre ≥5 fixtures (mismo content extraido).
- [ ] AC-5: medicion de ahorro documentada: leer `## Request` de un ticket de 1610 lineas cuesta <500 tokens vs ~42k del archivo completo (>98% ahorro en ese punto).
