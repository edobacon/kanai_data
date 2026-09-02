---
id: SPEC-workflow-lean-global-88
project: horadric
ticket: HOR-088
status: done
---

# Global lean — bloque DET condensado en `~/.claude/CLAUDE.md` (Lean-B)

# Global lean — bloque DET condensado en `~/.claude/CLAUDE.md` (Lean-B)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle vive abajo. Este spec es de impacto ALTO (toca el global de todos los proyectos) — leelo con cuidado antes de aprobar.*

**Que se quiere**: el bloque de DETs del global `~/.claude/CLAUDE.md` se inyecta **expandido** (1280 líneas / ~97 KB) en **cada sesión de cada proyecto**. Medición (HOR-088 explore): el catálogo condensado equivalente son **~5 KB**. Lean-B hace que `dkc-export-rules --global` emita los **30 contratos condensados** (~5 KB) en vez del texto completo, dejando el texto íntegro on-demand en `deterministic-rules.md`. Ahorro: **~92 KB/sesión (~95%)**, en todos los proyectos. **El floor se preserva**: las 30 DETs siguen presentes en el global, solo condensadas.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Fuente única del condensado** (DEC-LOCAL-01): extraer el catálogo condensado a un único lugar que lean **tanto** `dkc_get_rules` (project.py) **como** `dkc-export-rules`. | HOR-085 L2: condensar crea riesgo de fidelidad temporal (DET-21/22 quedaron stale). Si el export duplica los condensados, vuelve el drift. Una sola fuente lo elimina. Converge con HOR-085 B1 (extraer `_RULES_CATALOG`). |
| 2 | **Regenerar `~/.claude/CLAUDE.md`** es la acción grave — afecta todas tus sesiones de todos los proyectos. | Es semi-irreversible (aunque hay backup/git). Va detrás de un **checkpoint humano explícito** + el gate C. |
| 3 | **C = gate ⚑ fuerte empírico**, NO "por construcción". | Acá se toca el floor (a diferencia de HOR-085). Hay que demostrar con un fixture que el condensado deja aplicar los gates igual que el expandido. |

**Riesgos principales y como los mitigamos**:

- **Drift del condensado (HOR-085 L2)** → fuente única (DEC-LOCAL-01); un solo lugar que editar al cambiar una DET.
- **Adherencia degrada con condensado vs expandido** → C (⚑ fuerte): fixture antes/después mide gates DET-20/23/25/27. Si degrada → no regenerar / rollback.
- **Regeneración del global rompe algo silenciosamente** → backup del CLAUDE.md actual antes; `--dry-run` primero; checkpoint humano; reversible por git/backup.

**Que NO se hace**:

- **Lean-A** (global sin contenido, solo referencia) — descartado en el explore (quita el floor; el último 5% de ahorro no vale el riesgo).
- **Tocar la lógica de las DETs** — solo cambia su *representación* en el global (condensada vs expandida).
- **Validación longitudinal completa de adherencia** — C cubre la parte inmediata (fixture); el monitoreo sobre uso real queda como seguimiento forward.

**Tamaño estimado**: 2 sessions. S1 (código, T2, seguro) + S2 (regenerar global + C, T3 ⚑ fuerte, checkpoint humano).

**Como vas a saber que funciona**:

- `dkc-export-rules --global --dry-run` produce un bloque de ~5 KB con las 30 DETs condensadas + referencia a `deterministic-rules.md`.
- En el fixture, el LLM con el global condensado aplica los gates DET-20/23/25/27 igual que con el expandido.
- `~/.claude/CLAUDE.md` regenerado pesa ~90 KB menos en su bloque DET.

---

## Purpose

Reducir ~92 KB/sesión (en todos los proyectos) reemplazando el bloque DET expandido del global por los 30 contratos condensados, preservando el floor de adherencia (las 30 DETs siguen presentes) y dejando el texto íntegro on-demand. Validación empírica (C) obligatoria antes de regenerar — acá se toca el floor.

## Estado actual → deseado → delta

### Estado actual (baseline medido en explore)
- `dkc-export-rules --global` (`commands/dkc-export-rules`) parsea cada DET de `deterministic-rules.md` y escribe el **texto completo** de las 30 al `~/.claude/CLAUDE.md`. Bloque = **~97 KB / 1280 líneas**, en cada sesión de cada proyecto.
- Los condensados existen en `dkc_get_rules` (`project.py`, dict `rules`) — **duplicación latente** con el source si el export los copiara.

### Estado deseado
- `dkc-export-rules --global` emite los **30 condensados** (~5 KB) + una línea de referencia a `deterministic-rules.md` para el texto íntegro on-demand.
- Catálogo condensado con **fuente única** leída por `dkc_get_rules` y por `dkc-export-rules` (sin duplicación → sin drift).
- `~/.claude/CLAUDE.md` regenerado con el bloque lean (post-C verde + checkpoint humano).

### Delta
| Cambia | NO cambia |
|--------|-----------|
| `dkc-export-rules --global`: emite condensado, no expandido | `deterministic-rules.md` (texto íntegro intacto, ahora on-demand) |
| Catálogo condensado: fuente única compartida | La semántica de las DETs |
| `~/.claude/CLAUDE.md`: bloque DET ~97KB → ~5KB | El resto del global (no-DET) |

## Requirements

### REQ-IMPROVE-01: catálogo condensado con fuente única

> **Que cambia**: los condensados de las 30 DETs viven en UN solo lugar, leído tanto por el tool `dkc_get_rules` como por el exportador del global. Hoy `dkc_get_rules` los tiene inline en `project.py`.
> **Por que**: si el exportador duplicara los condensados, volvería el drift que dejó stale a DET-21/22 (HOR-085 L2). Una fuente, una verdad.

El sistema MUST tener una fuente única del catálogo condensado de las 30 DETs (name + contrato condensado + phases), consumida por `dkc_get_rules` y por `dkc-export-rules`. NO duplicar.

**Actor**: system
**Layers**: backend (catálogo) + meta (export)

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin duplicación
- **GIVEN** el catálogo condensado
- **WHEN** se busca dónde están definidos los condensados
- **THEN** hay exactamente una fuente; `dkc_get_rules` y `dkc-export-rules` la leen (no copian)

</details>

### REQ-IMPROVE-02: `dkc-export-rules --global` emite el bloque condensado

> **Que cambia**: el comando que regenera el global ahora escribe los 30 condensados (~5 KB) + una referencia a `deterministic-rules.md`, en vez de las 1280 líneas.
> **Por que**: es el redundante más grande del sistema (~97 KB × cada sesión × cada proyecto).

El sistema MUST hacer que `dkc-export-rules --global` genere un bloque con los 30 contratos condensados + una línea que apunte a `prompts/deterministic-rules.md` para el texto íntegro on-demand. `--dry-run` MUST mostrar el bloque sin escribir.

**Actor**: system
**Layers**: meta (commands)

<details><summary>Scenarios de validacion</summary>

#### Scenario: bloque lean
- **GIVEN** `dkc-export-rules --global --dry-run`
- **WHEN** se ejecuta
- **THEN** el bloque generado tiene las 30 DETs condensadas (~5 KB), incluye referencia a `deterministic-rules.md`, y NO el texto expandido

</details>

### REQ-PRESERVE-01: floor de adherencia preservado + validado empíricamente (C)

> **Que cambia**: nada de adherencia debe degradar — las 30 DETs siguen presentes en el global (condensadas) y el LLM las aplica igual.
> **Por que**: acá SÍ se toca el floor; el argumento "por construcción" de HOR-085 NO aplica. Hay que medir.

El sistema MUST preservar la adherencia a los gates DET-20/23/25/27 respecto al baseline, validado **empíricamente** sobre un fixture (antes/después) en el gate ⚑ fuerte de S2. Si degrada → NO regenerar el global / rollback.

**Actor**: system
**Layers**: meta (workflow)

### REQ-PRESERVE-02: regeneración del global reversible + checkpoint humano

> **Que cambia**: regenerar `~/.claude/CLAUDE.md` solo ocurre tras backup + C verde + OK humano explícito.
> **Por que**: afecta todas las sesiones de todos los proyectos; semi-irreversible sin red.

El sistema MUST hacer backup del `~/.claude/CLAUDE.md` actual antes de regenerar, usar `--dry-run` primero, y NO regenerar sin checkpoint humano explícito (incluso si el modo fuera autopilot — la regeneración del global es acción siempre-pregunta).

**Actor**: system + dev
**Layers**: meta

## Tasks

### Session 1 — Fuente única del condensado + export lean [tipo: auto] [tier: T2]

Código seguro (no toca el global). Quality review DET-23 standard (reviewer aislado).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Extraer el catálogo condensado a fuente única (resuelve HOR-085 B1) leída por `dkc_get_rules` | REQ-IMPROVE-01 | developer | — | server/src/deckard_cain/tools/project.py (+ módulo de catálogo) | tests `dkc_get_rules` siguen verdes | git revert | DET-16 | done | 1 |
| S1.T2 | Modificar `dkc-export-rules --global` para emitir el bloque condensado + referencia a deterministic-rules.md | REQ-IMPROVE-02 | developer | S1.T1 | commands/dkc-export-rules | `--dry-run` produce bloque ~5KB con 30 DETs | git revert | DET-16 | done | 1 |
| S1.T3 | Tests: fuente única sin duplicación + `--dry-run` shape (30 condensados + ref) + regresión suite | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S1.T2 | server/tests/ | tests verdes | git revert | DET-7 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2) + quality review DET-23 standard (reviewer aislado) | — | reviewer | S1.T3 | — | tests verdes + dry-run OK + DET-23 pass | — | DET-13, DET-14, DET-23 | done | 1 |

### Session 2 — Validación empírica (C) + regenerar global [tipo: ⚑ fuerte] [tier: T3]

C es el gate. Regenerar el global solo tras C verde + checkpoint humano. Reviewer aislado obligatorio.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | C — fixture de adherencia: correr un ticket de prueba con global condensado vs expandido; medir gates DET-20/23/25/27 | REQ-PRESERVE-01 | reviewer | S1.GATE | projects/horadric/tickets/HOR-088.md | gates ≤ baseline (no degrada) | N/A (medición) | DET-4, DET-13 | done | 2 |
| S2.T2 | Backup `~/.claude/CLAUDE.md` + `dkc-export-rules --global --dry-run` review + **checkpoint humano** antes de regenerar | REQ-PRESERVE-02 | developer | S2.T1 | ~/.claude/CLAUDE.md (backup) | backup hecho + dry-run revisado + OK humano | restaurar backup | DET-8 | done | 2 |
| S2.T3 | Regenerar `~/.claude/CLAUDE.md` con el bloque lean (solo si C verde + OK humano) | REQ-IMPROVE-02 | developer | S2.T2 | ~/.claude/CLAUDE.md | bloque DET ~90KB menor; global válido | restaurar backup | DET-8, DET-16 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T3, ⚑ fuerte) + quality review DET-23 exhaustive (reviewer aislado) + decisión mantener/rollback | — | reviewer | S2.T3 | — | C verde + global regenerado OK + DET-23 exhaustive + decisión humana | — | DET-13, DET-14, DET-23, DET-30 | done | 2 |

## Constraints

- DET-11 (KB-first): respetar HOR-085 (Principio 12, dkc_get_rules) + HOR-087 (re-surfacing activo).
- DET-16 (propagación): catálogo único → al cambiar una DET, un solo lugar a editar.
- Regenerar el global es acción **siempre-pregunta** (DET-30 transversal) — incluso fuera de autopilot.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-085 (dkc_get_rules + condensados) | internal | la fuente del catálogo condensado | — |
| HOR-087 (re-surfacing activo) | internal | red para que el lean no baje el floor en steps | sin él, Lean-A sería inviable (Lean-B es más robusto igual) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Drift del condensado | medium | high | fuente única (DEC-LOCAL-01) |
| Adherencia degrada (condensado vs expandido) | medium | high | C ⚑ fuerte fixture antes/después; rollback si degrada |
| Regeneración rompe el global | low | high | backup + dry-run + checkpoint humano + reversible |

## Open questions

(Ninguna — DEC-LOCAL-01 resuelve la fuente del condensado; Lean-B resuelto en explore.)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: fuente única del catálogo condensado
- **Contexto**: el export del global necesita los condensados; `dkc_get_rules` ya los tiene en `project.py`.
- **Drivers**: evitar el drift de condensar en 2 lugares (HOR-085 L2: DET-21/22 quedaron stale).
- **Opción elegida**: extraer el catálogo a fuente única compartida (resuelve también HOR-085 B1).
- **Alternativas**: duplicar en el export — descartado (drift garantizado). Importar project.py desde el export bash — viable pero acopla; la fuente única es más limpia.
- **Consecuencias**: gana cero-drift + un solo lugar a editar; cuesta un pequeño refactor de extracción.
- **Session**: design.

## Acceptance checkpoints

- [x] **Funcional**: `dkc-export-rules --global --dry-run` produce bloque condensado ~5KB con 30 DETs + ref (REQ-IMPROVE-01/02)
- [x] **Fuente única**: sin duplicación de condensados (REQ-IMPROVE-01)
- [x] **C (anti-objetivo)**: adherencia a gates DET-20/23/25/27 ≥ baseline en fixture (REQ-PRESERVE-01)
- [x] **Regeneración segura**: backup + dry-run + checkpoint humano antes de tocar el global (REQ-PRESERVE-02)
- [x] **Tests**: regresión verde
