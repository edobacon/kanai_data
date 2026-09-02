---
id: SPEC-workflow-relations-persist-121
project: horadric
ticket: HOR-121
status: done
---

# Derivación durable de relaciones desde frontmatter (SUPERSEDES)

# Derivación durable de relaciones desde frontmatter (SUPERSEDES)

## Executive summary — lo que estas aprobando

**Que se quiere**: que la relación `SUPERSEDES` que HOR-119 produce (`dkc_mark_superseded`) **sobreviva un reindex full**. Hoy NO sobrevive: el reindex full borra las relaciones del proyecto y las re-deriva solo desde body + `spec_ref` + `ticket_ref` — el `superseded_by` del frontmatter no se lee → el edge SUPERSEDES se cae (bug latente de HOR-119). Persisten `status: superseded` y `superseded_by` (campos de record), solo se pierde el edge tipado en la tabla `relations`.

**Decisión crítica (DET-32 — reencuadre del ticket)**: el ask original ("persistir cualquier relación ticket↔ticket") se **redujo** a la tajada necesaria y canónica: **derivar la relación desde el campo de frontmatter** (`superseded_by`), igual que ya se hace con `spec_ref`/`ticket_ref`. Se **descartó** matchear `HOR-NNN` en el parser (explosión de relaciones espurias) y se **difirió** un campo `relations:` genérico (workaround spec-anchor existe; YAGNI).

**Que NO se hace**: ticket-prefix en `_REF_PATTERNS`; campo `relations:` genérico; cambio de schema (la tabla `relations` ya existe).

**Como vas a saber que funciona**: una decision con `superseded_by: DEC-B` en frontmatter, tras un rebuild de la tabla `relations` (lo que hace el reindex full), conserva el edge `DEC-B --supersedes--> DEC-A`.

---

## Purpose

Hacer durables las relaciones que viven en campos canónicos del frontmatter, extendiendo el patrón ya existente del indexer (`spec_ref`→references, `ticket_ref`→discovered_in) a `superseded_by`→supersedes, y unificando esa derivación en los DOS paths de indexado (reindex full + `index_single_record`) que hoy divergen.

## Requirements

### REQ-01: Derivación durable de SUPERSEDES desde `superseded_by`

> **Que cambia**: el indexer deriva el edge `SUPERSEDES` desde el campo `superseded_by` del frontmatter, en ambos paths de indexado, de forma que sobreviva el rebuild de relaciones del reindex full.
> **Por que**: la relación SUPERSEDES de HOR-119 es efímera hoy (se borra en cada reindex full); el `superseded_by` es el campo canónico (markdown = fuente de verdad).

El sistema MUST derivar, al indexar un record con `superseded_by: {X}` en frontmatter, la relación `{X} --supersedes--> {record.id}` en la tabla `relations`, tanto en el reindex full (`build_index`) como en `index_single_record`. La derivación MUST ser idempotente (`INSERT OR IGNORE`) y MUST unificarse con las derivaciones existentes de `spec_ref`/`ticket_ref` en un helper compartido (cerrando la divergencia entre los dos paths). Sin cambio de schema.

**Actor**: system (indexer)
**Layers**: backend (Python)

<details><summary>Scenarios de validacion</summary>

#### Scenario: SUPERSEDES sobrevive el rebuild
- **GIVEN** una decision DEC-A con `superseded_by: DEC-B` en frontmatter
- **WHEN** se reindexa (rebuild de la tabla relations, como el reindex full)
- **THEN** existe el edge `DEC-B --supersedes--> DEC-A`

#### Scenario: sin superseded_by → sin edge
- **GIVEN** una decision sin `superseded_by` (o `null`)
- **WHEN** se indexa
- **THEN** no se crea ningún edge supersedes

#### Scenario: paridad de paths (divergencia H4)
- **GIVEN** un record con `spec:` y `ticket:` en frontmatter
- **WHEN** se indexa vía `index_single_record`
- **THEN** se derivan los edges references/discovered_in (igual que en el reindex full)
</details>

## Tasks

### Session 1 — Derivación de frontmatter unificada [tipo: auto] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Helper `add_frontmatter_relations(db, record, frontmatter)` en relations.py (spec_ref→references + ticket_ref→discovered_in + superseded_by→supersedes); llamarlo desde el reindex full y desde `index_single_record` (reemplaza el inline de indexer.py:81-92) | REQ-01 | developer | — | `server/src/deckard_cain/core/relations.py`, `server/src/deckard_cain/core/indexer.py` | pytest helper + ambos paths | git revert | DET-11, DET-32 | done | 1 |
| S1.T2 | pytest `test_frontmatter_relations`: SUPERSEDES derivado + sobrevive rebuild + paridad single/full + sin superseded_by→nada | REQ-01 | developer | S1.T1 | `server/tests/test_frontmatter_relations.py` | pytest verde; suite sin regresión | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2) | — | reviewer | S1.T2 | `projects/horadric/tickets/HOR-121.md` | gate + quality review DET-23 (dual-judge T2) | n/a | DET-20, DET-23, DET-35 | done | 1 |

## Technical reference

- **Reindex full borra+rederiva**: `indexer.py:43` (`DELETE FROM relations WHERE from_id IN ...`), derivaciones en `indexer.py:77-92`.
- **index_single_record** (path de tools dkc): `indexer.py:135-147` — hoy solo `add_relations_from_content(body)` (divergencia H4).
- **Patrón a extender**: `spec_ref`/`ticket_ref` inline en el reindex full → unificar en helper de relations.py.
- **`superseded_by`**: campo de frontmatter (NO está en el modelo Record) → leer de `parsed["frontmatter"]`. Lo setea `dkc_mark_superseded` (HOR-119).
- **Dirección**: `superseded_by: DEC-B` vive en DEC-A (la superada) → edge `DEC-B --supersedes--> DEC-A` (consistente con HOR-119 `from_id=superseded_by_id, to_id=superseded_id`).

## Constraints

- DET-6: no se borra ninguna decision (esto solo deriva edges).
- Cero cambio de schema (tabla `relations` ya existe).
- Idempotente (`INSERT OR IGNORE`).

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Derivar desde frontmatter canónico, no matchear ticket-IDs en el parser
- **Contexto**: el request proponía 3 opciones (ticket-prefix en patterns / campo relations genérico / merge en reindex).
- **Opción elegida**: derivar la relación desde el campo canónico `superseded_by` (extiende el patrón spec_ref/ticket_ref).
- **Alternativas**: (a) ticket-prefix en `_REF_PATTERNS` → descartada (explosión de relaciones espurias por cada mención de ticket); (b) campo `relations:` genérico → diferida (YAGNI; workaround spec-anchor existe); (c) merge en reindex → descartada (rompe "DB derivada de markdown").
- **Consecuencias**: markdown sigue siendo fuente de verdad; SUPERSEDES durable; arregla bug latente de HOR-119.
- **Session**: design

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Campo `relations:` genérico en frontmatter (typed edges arbitrarios ticket↔ticket) + `dkc_add_relation` que persista ahí | nuevo | diferido en design 2026-06-22 | Workaround: anclar a SPEC- compartido (HOR-080/106) | Diseñar el campo + que el indexer lo derive + que dkc_add_relation escriba al frontmatter | could |

## Acceptance checkpoints

- [x] **Funcional**: decision con `superseded_by` → edge SUPERSEDES sobrevive rebuild de relations (`test_supersedes_survives_full_reindex_project`, reindex_project real ×2)
- [x] **Tests**: pytest verde — 93 passed (88 baseline + 6), sin regresión
- [x] **Paridad**: `index_single_record` deriva spec/ticket igual que el reindex full (`test_parity_single_record_derives_spec_and_ticket`)
- [x] **Scope**: sin schema; ticket-prefix descartado; campo genérico diferido (B1)

## Archiving

`/dkc-archive-spec SPEC-workflow-relations-persist-121 "razon"` cuando deje de ser fuente de verdad.
