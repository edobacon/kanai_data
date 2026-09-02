---
id: SPEC-workflow-dets-point-of-use-85
project: horadric
ticket: HOR-085
status: done
---

# DETs point-of-use — re-surfacing condensado por step

# DETs point-of-use — re-surfacing condensado por step

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes. Si te basta el Executive summary para decidir, ese es el objetivo.*

**Que se quiere**: hoy las 30 reglas deterministicas (DETs) del workflow se le meten al LLM tres veces por sesion larga — en el global, en cada uno de ~21 steps que leen el archivo completo de 1280 lineas, y en el researcher por task. Son ~200KB redundantes. Peor que el costo: un bloque de reglas inyectado al inicio de un contexto largo se diluye y no se aplica (lo diagnosticaron HOR-050 y HOR-065). Este ticket mueve las DETs de "todas, al inicio" a "solo las 3-5 que gatean este step, condensadas, en el momento que el step las usa". Gana en tokens y en adherencia.

**Decisiones criticas que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Extender `dkc_get_rules` con un parametro opcional `dets=[...]` (no solo filtro por `context`) | Sin granularidad por-DET, el step recibe todas las DETs de la fase (coarse). El parametro permite el set exacto del frontmatter `dets:` del step. Backward compatible: sin el param, el tool se comporta como hoy. |
| 2 | El set `dets:` declarado por step es la unica fuente de "que reglas trae" | Si una DET que gatea al step queda fuera del set, se vuelve invisible en execute. Declarar de menos degrada adherencia (el riesgo central del ticket). |
| 3 | S3 valida empiricamente antes de declarar el cambio bueno (gate ⚑ fuerte) | El anti-objetivo es que el ahorro degrade la ejecucion. Sin medir adherencia antes/despues, no sabemos si H4b se cumple. |

**Riesgos principales y como los mitigamos**:

- **Set `dets:` incompleto por step → regla invisible en execute** → mapping step→DETs revisado por reviewer aislado en S2; el archivo completo sigue consultable on-demand como red.
- **Romper `dkc_get_rules(context, role)` existente (consumers actuales)** → el parametro `dets` es opt-in; REQ-PRESERVE-01 + test de regresion garantizan el comportamiento actual sin el param.
- **Adherencia degrada con menos contexto (H4b no confirmada)** → S3 mide gates DET-20/23/25/27 antes/despues sobre fixture; si degrada, iterate o rollback (gate ⚑ fuerte, decision humana).

**Que NO se hace en este ticket** (limites explicitos):

- **Retrieval dirigido de rules/specs por semantic search** (backlog #2) — depende de HOR-083/084, fuera de scope.
- **Jerarquia formal de DETs por lifecycle** (HOR-047) — complementario, independiente.
- **Tocar el `~/.claude/CLAUDE.md` global** — el global sigue como esta; este ticket actua sobre el tool + los steps.
- **Migrar el researcher por-task** (`task-loop.md` Read por `DET-N`) si no cae naturalmente en el cableado de S2 — se evalua, no se fuerza.

**Tamano estimado**: 3 sessions ejecutables (~3-5h efectivas). La mas riesgosa es S3 (validacion empirica de adherencia, gate ⚑ fuerte) — define si el cambio se mantiene.

**Como vas a saber que funciona** (criterios observables):

- Llamo `dkc_get_rules(dets=[20,23,25])` y recibo exactamente esos 3 condensados (2-3 lineas c/u).
- `grep -rl 'reads:.*deterministic-rules.md' prompts/steps` baja de 21 a ~0 (steps migrados); cada step migrado declara `dets:` no vacio.
- Corro el flujo sobre el fixture: los gates DET-20/23/25/27 se respetan igual o mejor que el baseline.

---

## Purpose

Reducir ~100KB de contexto redundante por sesion larga y, simultaneamente, mejorar la adherencia a las DETs, moviendo su inyeccion de un blob masivo al inicio de sesion a un re-surfacing condensado y dirigido en el punto de uso de cada step. Habilitador tecnico: extender `dkc_get_rules` (que hoy solo condensa DET-1..16) a las 30 DETs + permitir consulta por ids especificos.

## Estado actual → deseado → delta

### Estado actual (baseline, datos concretos)

- `dkc_get_rules` (`server/src/deckard_cain/tools/project.py:282-299`): dict `rules` con claves **1..16**. DET-17..30 ausentes (14 DETs sin condensado).
- API: `dkc_get_rules(context, role)` — filtra por fase (`design|execute|review|close|quick`) + brief de agente. No acepta lista de DETs especificas.
- **11 archivos** de step declaran `reads: prompts/deterministic-rules.md` en frontmatter (el grep -l del intake contó 21 incluyendo body-mentions on-demand) (1280 lineas c/u). 0 steps declaran `dets:` en frontmatter.
- `task-loop.md` instruye al researcher a resolver `DET-N` por Read del archivo completo por task.

### Estado deseado (medible)

- `dkc_get_rules` cubre las **30 DETs** condensadas (2-3 lineas el contrato clave de cada una), con phases correctas.
- `dkc_get_rules(context, role, dets=[...])` retorna exactamente los condensados pedidos cuando `dets` se provee; comportamiento actual intacto cuando no.
- Cada step migrado declara `dets:` (set 3-5) en frontmatter y re-surfacea ese set condensado al inicio de su fase, via consulta dirigida — sin `reads:` del archivo completo.
- El texto integro de cualquier DET sigue consultable on-demand (`deterministic-rules.md` sin cambios).

### Delta (que cambia / que NO cambia)

| Cambia | NO cambia |
|--------|-----------|
| `dkc_get_rules` gana 14 condensados (17-30) + param `dets` | El texto fuente `deterministic-rules.md` (queda como referencia integra) |
| ~21 steps: `+dets:` frontmatter, `−reads: deterministic-rules.md` | La firma `dkc_get_rules(context, role)` sigue valida (backward compat) |
| Doc del patron en `_style.md` | El `~/.claude/CLAUDE.md` global |
| Re-surfacing dirigido por step | La semantica de las DETs (solo se condensa, no se reescribe el contrato) |

## Requirements

### REQ-IMPROVE-01: `dkc_get_rules` cubre las 30 DETs condensadas

> **Que cambia**: cuando un step (o el researcher) pide reglas al tool, ahora recibe condensados de las 30 DETs, no solo las primeras 16. Las 14 mas usadas en execute (20, 23, 25, 27, 28, 29) dejan de obligar a leer el archivo completo.
> **Por que**: hoy el catalogo del tool corta en DET-16; sin las condensadas de 17-30, no hay alternativa al `reads:` de 1280 lineas.

El sistema MUST exponer en `dkc_get_rules` un condensado (2-3 lineas, el contrato clave) para cada DET del 1 al 30, cada una con sus `phases` correctas.

**Actor**: system (LLM ejecutor / researcher)
**Layers**: backend (MCP tool)

<details><summary>Scenarios de validacion</summary>

#### Scenario: cobertura completa
- **GIVEN** el tool `dkc_get_rules` sin argumentos
- **WHEN** se invoca
- **THEN** el set `rules` retornado contiene claves 1..30 (30 entradas)
- **AND** cada entrada tiene `name`, `rule` (condensado no vacio) y `phases` (lista no vacia)

#### Scenario: condensado, no texto completo
- **GIVEN** la entrada de DET-27 en el retorno
- **WHEN** se mide su longitud
- **THEN** el campo `rule` es un resumen breve (≤ ~3 lineas), NO el texto integro de `deterministic-rules.md`

</details>

### REQ-IMPROVE-02: consulta dirigida por ids de DET

> **Que cambia**: un step puede pedir exactamente las DETs que lo gatean — `dkc_get_rules(dets=[20,23,25])` devuelve solo esos 3 condensados, no toda la fase.
> **Por que**: el filtro por fase es coarse (execute tiene ~10 DETs); la precision por-step es lo que hace el re-surfacing barato y salient.

El sistema MUST aceptar un parametro opcional `dets` (lista de enteros o strings `DET-N`) en `dkc_get_rules`. Si se provee, MUST retornar exactamente los condensados de esas DETs (ignorando el filtro por `context` para la seleccion). Si no se provee, MUST conservar el comportamiento por `context`.

**Actor**: system
**Layers**: backend (MCP tool)

<details><summary>Scenarios de validacion</summary>

#### Scenario: subset exacto
- **GIVEN** `dkc_get_rules(dets=[20, 23, 25])`
- **WHEN** se invoca
- **THEN** el retorno contiene exactamente las entradas 20, 23, 25 (3 entradas)
- **AND** ninguna otra DET

#### Scenario: id invalido tolerado
- **GIVEN** `dkc_get_rules(dets=[20, 99])` (99 no existe)
- **WHEN** se invoca
- **THEN** retorna la 20 y omite la 99 (sin crash), idealmente con nota de ids no encontrados

</details>

### REQ-IMPROVE-03: steps declaran `dets:` y re-surfacean dirigido

> **Que cambia**: cada step gana en su frontmatter una lista `dets:` con las reglas que lo gatean, y al entrar a su fase trae solo ese set condensado — en vez de cargar las 1280 lineas completas.
> **Por que**: la regla viva en el punto de uso se aplica; el blob al inicio se diluye (HOR-050/065).

Cada step migrado (los ~21 que hoy declaran `reads: deterministic-rules.md`) MUST declarar en frontmatter `dets: [N, ...]` (3-5 tipicamente) con las DETs que lo gatean, y MUST re-surfacear ese set condensado via `dkc_get_rules(dets=...)` al inicio de la fase relevante.

**Actor**: system
**Layers**: meta (prompts/steps)

<details><summary>Scenarios de validacion</summary>

#### Scenario: declaracion presente
- **GIVEN** un step migrado (ej. `request-execute`)
- **WHEN** se lee su frontmatter
- **THEN** contiene `dets:` con lista no vacia (ej. `[20, 23, 25, 27, 28, 29]`)

</details>

### REQ-IMPROVE-04: quitar `reads: deterministic-rules.md` de los steps

> **Que cambia**: los steps dejan de listar el archivo de 1280 lineas como lectura obligatoria; queda consultable on-demand para el texto integro de una DET puntual.
> **Por que**: ese `reads:` es la fuente del costo redundante (1280 lineas × 21 steps).

El sistema MUST eliminar `reads: prompts/deterministic-rules.md` del frontmatter de cada step migrado, reemplazandolo por la consulta dirigida de REQ-IMPROVE-03. El archivo completo MUST permanecer accesible (no se borra) para consulta on-demand.

**Actor**: system
**Layers**: meta (prompts/steps)

<details><summary>Scenarios de validacion</summary>

#### Scenario: reads removido
- **GIVEN** los steps migrados
- **WHEN** `grep -rl 'reads:.*deterministic-rules.md' prompts/steps`
- **THEN** retorna ~0 (steps migrados; cualquier excepcion documentada)
- **AND** `prompts/deterministic-rules.md` sigue existiendo en filesystem

</details>

### REQ-IMPROVE-05: documentar el patron

> **Que cambia**: el patron "declarar `dets:` + re-surfacear dirigido" queda escrito en `_style.md` para que steps futuros lo sigan.
> **Por que**: sin doc, el patron muere con este ticket y los steps nuevos vuelven al `reads:` masivo.

El sistema MUST documentar el patron point-of-use en `prompts/_style.md` (principio nuevo o extension de uno existente): como declarar `dets:`, cuando re-surfacear, y la regla "declarar de menos es peor que de mas".

**Actor**: dev (autor de steps futuros)
**Layers**: meta (docs)

### REQ-PRESERVE-01: `dkc_get_rules(context, role)` sin regresion

> **Que cambia**: nada para los consumers actuales — la firma y el comportamiento por `context`/`role` siguen identicos.
> **Por que**: hay consumers existentes; el param `dets` es aditivo, no debe romperlos.

El sistema MUST mantener el comportamiento actual de `dkc_get_rules(context, role)` (filtro por fase + brief de agente) cuando `dets` no se provee. Regression obligatoria (DET-7).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: regresion del filtro por contexto
- **GIVEN** `dkc_get_rules(context="execute")` (sin `dets`)
- **WHEN** se invoca antes y despues del cambio
- **THEN** retorna el mismo set de DETs filtradas por fase `execute` (ahora ampliado correctamente con las 17-30 que tengan phase execute, pero sin romper el contrato de filtrado)

</details>

### REQ-PRESERVE-02: adherencia ≥ baseline (anti-objetivo)

> **Que cambia**: la ejecucion del workflow no debe degradarse — los gates se respetan igual o mejor que antes del cambio.
> **Por que**: es el anti-objetivo explicito del ticket; un ahorro de tokens que haga saltar gates es un fracaso.

El sistema MUST preservar (o mejorar) la adherencia a los gates DET-20/23/25/27 respecto al baseline medido. Validacion empirica en S3 (gate ⚑ fuerte); si degrada, iterate o rollback.

**Actor**: system
**Layers**: meta (workflow)

## Changes

### Modified: `dkc_get_rules` (server/src/deckard_cain/tools/project.py)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| dict `rules` | claves 1..16 | claves 1..30 | cubrir las 14 DETs faltantes (REQ-IMPROVE-01) |
| firma | `(context, role)` | `(context, role, dets=None)` | consulta dirigida por ids (REQ-IMPROVE-02), backward compatible |
| seleccion | filtro por `context` | si `dets`: subset exacto; sino: filtro por `context` | precision por-step vs coarse por-fase |

### Modified: ~21 steps en `prompts/steps/`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| frontmatter `reads:` | incluye `deterministic-rules.md` | sin esa entrada | quitar inyeccion masiva (REQ-IMPROVE-04) |
| frontmatter `dets:` | ausente | `[N, ...]` por step | declarar gating (REQ-IMPROVE-03) |
| cuerpo del step | (lectura implicita del archivo) | instruccion de re-surfacing dirigido al inicio de fase | point-of-use |

### Added: principio en `prompts/_style.md`

| Field | Value | Purpose |
|-------|-------|---------|
| Principio point-of-use | doc del patron `dets:` + re-surfacing | REQ-IMPROVE-05 |

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When |
|--------|-------------------|--------|----------------|------|
| Steps con `reads: deterministic-rules.md` | 11 | ~0 (migrados) | `grep -rl` | post-S2 |
| DETs condensadas en `dkc_get_rules` | 16 | 30 | test de cobertura | post-S1 |
| Gates DET-20/23/25/27 saltados en fixture | baseline N | ≤ N (igual o menos) | corrida fixture antes/despues | S3 |

## Tasks

### Session 1 — Extender `dkc_get_rules` a DET-17..30 + param `dets` [tipo: auto] [tier: T2]

Cubrir las 14 DETs faltantes con condensados + agregar consulta dirigida, sin romper consumers. Quality review DET-23 standard (reviewer aislado por `autopilot: super`, DET-30 REQ-10).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Condensar DET-17..30 (14 entradas de 2-3 lineas, contrato clave + phases) y agregarlas al dict `rules` | REQ-IMPROVE-01 | developer | — | server/src/deckard_cain/tools/project.py | TC-01 (cobertura 1..30) | git revert | DET-2, DET-11 | done | 1 |
| S1.T2 | Agregar param opcional `dets=None` a `dkc_get_rules`: si provisto retorna subset exacto; sino filtro por context (backward compat) | REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S1.T1 | server/src/deckard_cain/tools/project.py | TC-02 (subset exacto) + TC-04 (regresion context) | git revert | DET-8, DET-10 | done | 1 |
| S1.T3 | Unit tests: cobertura 1..30, subset por `dets`, id invalido tolerado, regresion `context`/`role` | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S1.T2 | server/tests/ | TC-01..04 verdes | git revert | DET-7 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (validation tier: T2) + quality review DET-23 standard (reviewer aislado) | — | reviewer | S1.T3 | — | tests verdes + coverage no baja + DET-23 standard pass | — | DET-13, DET-14, DET-23 | done | 1 |

### Session 2 — `dets:` por step + quitar `reads:` [tipo: auto] [tier: T2]

Mapear step→DETs, declarar frontmatter, reemplazar el `reads:` por consulta dirigida. Depende de S1 verde (la API debe existir).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Definir mapping step→DETs (que 3-5 DETs gatean cada uno de los ~21 steps) — tabla revisada | REQ-IMPROVE-03 | architect | S1.GATE | projects/horadric/specs/SPEC-workflow-dets-point-of-use-85.md | mapping completo para los 21 steps | N/A (doc) | DET-11, DET-16 | done | 2 |
| S2.T2 | Agregar `dets:` frontmatter + quitar `reads: deterministic-rules.md` + instruccion de re-surfacing dirigido por step | REQ-IMPROVE-03, REQ-IMPROVE-04 | developer | S2.T1 | prompts/steps/*.md, prompts/steps/*/*.md | TC-05 (reads=0) + TC-06 (dets presente) | git revert | DET-8, DET-16 | done | 2 |
| S2.T3 | Verificar: 0 `reads: deterministic-rules.md` en migrados, cada step con `dets:` no vacio, archivo completo intacto | REQ-IMPROVE-04 | reviewer | S2.T2 | prompts/steps/ | TC-05, TC-06 verdes | — | DET-5, DET-13 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (validation tier: T2) + quality review DET-23 standard (reviewer aislado) | — | reviewer | S2.T3 | — | grep checks verdes + DET-23 standard pass | — | DET-13, DET-14, DET-23 | done | 2 |

#### Step→DETs mapping (S2.T1 — architect)

**Scope clarificado (S2.T1)**: el `grep -l deterministic-rules.md` del intake contó 21 archivos, pero solo **11** tienen la entrada de frontmatter `reads: - "prompts/deterministic-rules.md"` (la inyección real). Los otros ~10 solo **mencionan** el archivo en el cuerpo como referencia ("Ver Regla X en deterministic-rules.md") — ese ES el patrón on-demand que el ticket busca preservar, así que se dejan intactos. La migración (quitar `reads:` + agregar `dets:`) aplica a los 11.

| Step (frontmatter `reads:`) | `dets:` asignadas | Racional |
|------------------------------|-------------------|----------|
| request-intake.md | [1, 2, 3, 11, 26] | certeza, source_ref, inmutabilidad del request, KB-first, story points intake |
| intake-explore.md | [1, 4, 5, 20, 21, 26] | certeza, hechos vs inferencias, multi-capa, plan de sessions, gate teach-intake |
| teach-intake.md | [21] | el step ES el productor de teach-intake |
| design-feature.md | [1, 2, 8, 18, 20, 21, 24] | certeza, source_ref, sessions, teach-intake gate, REQ callout |
| design-fix.md | [5, 6, 7, 8, 18, 20, 21, 24] | multi-capa, discoveries inmutables, test↔discovery, sessions, teach gate, REQ callout |
| design-improvement.md | [7, 8, 13, 18, 20, 21, 24] | regression, cierre con evidencia, sessions, teach gate, REQ callout |
| design-refactor.md | [7, 8, 18, 20, 21, 24] | regression, rollback, sessions, teach gate, REQ callout |
| design-draft.md | [18, 20, 21] | draft aprobado, sessions, teach gate |
| request-execute.md | [20, 23, 25, 27, 28, 29, 30] | sessions+gate, quality review, TC inline, commits, tasks copiadas, persistencia in-flight |
| request-close.md | [13, 16, 17, 22, 25, 26, 27] | cierre con evidencia, propagación, teach-close, story points, commits |
| teach-close.md | [22] | el step ES el productor de teach-close |

### Session 3 — Doc del patron + validacion empirica de adherencia [tipo: ⚑ fuerte] [tier: T3]

Documentar el patron y validar el anti-objetivo (que el ahorro no degrade adherencia). Gate ⚑ fuerte: decision sobre mantener/iterate/rollback. Reviewer aislado obligatorio (DET-30 REQ-10).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Documentar el patron point-of-use en `_style.md` (declarar `dets:`, re-surfacear, "declarar de menos es peor") | REQ-IMPROVE-05 | developer | S2.GATE | prompts/_style.md | TC-07 (principio presente) | git revert | DET-16 | done | 3 |
| S3.T2 | Validacion empirica: medir adherencia a gates DET-20/23/25/27 antes/despues sobre fixture; documentar resultado | REQ-PRESERVE-02, H4b | reviewer | S3.T1 | projects/horadric/tickets/HOR-085.md | TC-08 (gates ≤ baseline) | N/A (medicion) | DET-4, DET-13 | done | 3 |
| S3.T3 | Decision mantener/iterate/rollback segun resultado de S3.T2 (gate ⚑ fuerte, decision humana en super) | REQ-PRESERVE-02 | reviewer | S3.T2 | projects/horadric/tickets/HOR-085.md | decision registrada con evidencia | — | DET-12, DET-14 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (validation tier: T3, ⚑ fuerte) + quality review DET-23 exhaustive (reviewer aislado) | — | reviewer | S3.T3 | — | validacion empirica pass + DET-23 exhaustive + decision humana | — | DET-13, DET-14, DET-23, DET-30 | done | 3 |

## Constraints

- DET-11 (KB-first): consultar rules del modulo workflow antes de tocar steps.
- DET-13 (cierre con evidencia): el cierre exige la corrida empirica de S3, no "parece estar bien".
- DET-16 (propagacion): al quitar `reads:` verificar que ningun step dependa del archivo completo para algo que no sea una DET puntual.
- DET-30 (autopilot): `autopilot: super` → gates con reviewer aislado; push/merge/destructivo/fuera-de-alcance preguntan.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `dkc_get_rules` (S1) | internal | S2 cablea el re-surfacing sobre la API extendida en S1 | S2 no arranca sin S1 verde (dependencia dura) |
| Fixture de adherencia | internal | ticket/flujo de prueba para medir gates antes/despues | sin fixture representativo, H4b no se valida bien |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Set `dets:` por step incompleto → regla invisible en execute | medium | high | mapping revisado por reviewer aislado (S2.T3); archivo completo on-demand como red |
| Romper consumers de `dkc_get_rules(context, role)` | low | high | param `dets` opt-in + TC-04 regresion |
| Adherencia degrada (H4b falsa) | medium | high | S3 mide antes/despues; gate ⚑ fuerte → iterate/rollback |
| `task-loop.md` researcher por-task no migra limpio | low | medium | evaluar en S2; si no encaja, dejar fuera de scope con nota |

## Open questions

(Ninguna abierta — la forma de la API se resolvio en DEC-LOCAL-01.)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: API de retrieval dirigido — parametro opcional `dets`
- **Contexto**: el re-surfacing por-step necesita pedir DETs especificas; `dkc_get_rules` hoy solo filtra por `context` (fase).
- **Drivers**: precision por-step (el frontmatter `dets:` lista 3-5 exactas) vs simplicidad; backward compatibility con consumers actuales.
- **Opcion elegida**: extender la firma a `dkc_get_rules(context, role, dets=None)`. Con `dets`: subset exacto. Sin `dets`: comportamiento actual por `context`.
- **Alternativas**: (A) solo `context` y el tool devuelve el set de la fase — descartada: granularidad coarse, no matchea el set por-step que pide el ticket. (B) tool nuevo separado — descartada: duplica logica y catalogo.
- **Consecuencias**: gana precision + cero regresion (aditivo); cuesta un parametro mas y un branch en la seleccion.
- **Session**: design (pre-S1).

## Acceptance checkpoints

- [x] **Funcional**: `dkc_get_rules` cubre 1..30 y `dets=[...]` retorna subset exacto (REQ-IMPROVE-01/02)
- [x] **Tests**: TC-01..08 escritos y pasando
- [x] **Migracion**: 0 `reads: deterministic-rules.md` en steps migrados; cada uno con `dets:` no vacio (REQ-IMPROVE-03/04)
- [x] **Doc**: patron documentado en `_style.md` (REQ-IMPROVE-05)
- [x] **Regression**: `dkc_get_rules(context, role)` sin regresion (REQ-PRESERVE-01)
- [x] **Anti-objetivo**: adherencia a gates DET-20/23/25/27 ≥ baseline en fixture (REQ-PRESERVE-02)
- [x] **Rules**: DET-11/13/16/30 respetadas
