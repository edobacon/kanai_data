---
id: SPEC-viewer-parser-resilience-122
project: horadric
ticket: HOR-122
status: done
---

# Resiliencia del parser de frontmatter del viewer (HC)

# Resiliencia del parser de frontmatter del viewer (HC)

## Executive summary — lo que estas aprobando

**Que se quiere**: que HC (horadric-cube) **nunca pierda ni misrenderee** un ticket por un quirk de YAML en su frontmatter. Hoy `parseFile` usa gray-matter/js-yaml en modo estricto → lanza ante YAML imperfecto-pero-tolerable (ej. clave duplicada, caso real HOR-080) → `summarizeTicket` devuelve `null` → el ticket DESAPARECE. El índice Python (`yaml.safe_load`, lenient/last-wins) lo acepta → discrepancia de parsers.

**Decisión (DET-32)**: **(1)** engine YAML lenient (`js-yaml {json:true}` — last-wins, paridad con el índice) + **(2)** try/catch como red de seguridad (YAML irrecuperable → ParsedFile degradado con frontmatter vacío, NO throw). Diferido: cambiar el default de status `'open'`→`'unknown'` + banner visible (toca el tipo `TicketSummary` + frontend).

**Cross-repo**: el código vive en **horadric-cube** (`server/deckard/frontmatter.ts`), los records DKC en deckard. Runner: vitest. `js-yaml@3.14.2` ya instalado.

**Como vas a saber que funciona**: un markdown con `delta_reason` duplicado (el caso HOR-080) → `parseFile` no lanza y devuelve `status: 'closed'` (last-wins); un YAML irrecuperable → `parseFile` devuelve frontmatter `{}` + body, sin lanzar.

---

## Purpose

Alinear la tolerancia del parser de HC con la del índice Python (fuente de verdad del KB) y garantizar que ningún ticket desaparezca del viewer por un fallo de parseo.

## Requirements

### REQ-01: `parseFile` resiliente (paridad lenient + red de seguridad)

> **Que cambia**: `parseFile` parsea el frontmatter con un engine YAML lenient (last-wins, como el índice) y, ante cualquier error de YAML irrecuperable, degrada (frontmatter vacío + body) en vez de lanzar.
> **Por que**: un quirk de YAML no debe hacer desaparecer un ticket del viewer; HC debe tolerar lo mismo que el índice.

`parseFile` MUST (1) configurar gray-matter con un engine YAML lenient (`js-yaml` con `{ json: true }`) de modo que claves duplicadas y YAML JSON-compatible parseen (last-wins) en vez de lanzar; y (2) envolver el parseo en try/catch de modo que, si el YAML es irrecuperable, retorne `{ frontmatter: {}, title, body, raw }` (degradado) SIN propagar la excepción. La firma y el shape de `ParsedFile` no cambian.

**Actor**: system (viewer backend)
**Layers**: backend (TypeScript, horadric-cube)

<details><summary>Scenarios de validacion</summary>

#### Scenario: clave duplicada (caso HOR-080)
- **GIVEN** frontmatter con `delta_reason` ×2 y `status: closed`
- **WHEN** `parseFile`
- **THEN** no lanza; `frontmatter.status === 'closed'` (last-wins)

#### Scenario: YAML irrecuperable
- **GIVEN** frontmatter con YAML inválido no recuperable
- **WHEN** `parseFile`
- **THEN** no lanza; retorna `frontmatter: {}` + body intacto

#### Scenario: frontmatter válido (no regresión)
- **GIVEN** frontmatter bien formado
- **WHEN** `parseFile`
- **THEN** parsea igual que antes (title/body/frontmatter correctos)
</details>

## Tasks

### Session 1 — parseFile resiliente [tipo: auto] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | `parseFile` con engine lenient (`js-yaml {json:true}`) + try/catch degradado; agregar `js-yaml` como dep directa (ya instalada) | REQ-01 | developer | — | `horadric-cube: server/deckard/frontmatter.ts`, `package.json` | vitest: dup-key→no throw + status leído; irrecuperable→degrada | git revert | DET-11, DET-32 | done | 1 |
| S1.T2 | vitest en `frontmatter.test.ts`: dup-key (HOR-080) + irrecuperable + no-regresión | REQ-01 | developer | S1.T1 | `horadric-cube: server/deckard/frontmatter.test.ts` | `vitest run` verde, suite sin regresión | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2) | — | reviewer | S1.T2 | `projects/horadric/tickets/HOR-122.md` | gate + quality review DET-23 (dual-judge T2) | n/a | DET-20, DET-23, DET-35 | done | 1 |

## Technical reference

- `parseFile`: `horadric-cube/server/deckard/frontmatter.ts:11` (`matter(raw)`).
- gray-matter 4.0.3 acepta `matter(raw, { engines: { yaml: { parse, stringify } } })`.
- `js-yaml@3.14.2` (transitiva vía gray-matter) → declarar directa; `load(s, { json: true })` = last-wins sin throw en dup-keys.
- Consumers: `summarizeTicketFromPath` (`server/routes/tickets.ts:241`) — con el fix dejan de recibir throw/null por este motivo.

## Constraints

- No cambia la firma ni el shape de `ParsedFile`.
- No cambia el comportamiento para frontmatter válido (zero behavior change en el happy path).
- Cross-repo: commits de código en horadric-cube; records DKC en deckard (DET-19/cross-repo).

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Paridad lenient + red de seguridad (no solo una)
- **Contexto**: el request listaba (a) degradación, (b) paridad, (c) banner.
- **Elegida**: (b)+(a) combinadas — engine lenient (paridad con el índice, resuelve el caso real dup-key con los datos correctos) + try/catch (red final, nunca vanishear).
- **Alternativas**: solo degradación (perdería el status del ticket degradado); solo paridad (YAML irrecuperable seguiría lanzando). (c) banner → diferido.
- **Consecuencias**: HC tolera lo mismo que el índice; ningún ticket se pierde por parseo.

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Default status `'open'`→`'unknown'` + banner visible para frontmatter degradado | nuevo | diferido 2026-06-22 | parseFile resiliente (REQ-01) | Cambiar `?? 'open'`→`'unknown'` en tickets.ts/flowInference.ts (ampliar tipo TicketSummary) + banner en el frontend | could |

## Acceptance checkpoints

- [x] **Funcional**: dup-key (HOR-080) → parseFile no lanza + status leído last-wins (`frontmatter.test.ts`; e2e: HOR-080 carga `closed` en HC)
- [x] **Red**: YAML irrecuperable → degrada (frontmatter {} + raw preservado), no lanza
- [x] **No regresión**: frontmatter válido igual; `vitest run` 293 passed; tsc 0; **server real arranca + sirve 112 tickets**
- [x] **Scope**: sin cambiar firma/shape; banner+status-default diferido (B1)

## Archiving

`/dkc-archive-spec SPEC-viewer-parser-resilience-122 "razon"` cuando deje de ser fuente de verdad.
