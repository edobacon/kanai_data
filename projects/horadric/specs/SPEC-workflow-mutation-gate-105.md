---
id: SPEC-workflow-mutation-gate-105
project: horadric
ticket: HOR-105
status: done
---

# Mutation testing gate para el flujo de DKC

# Mutation testing gate para el flujo de DKC

## Executive summary — lo que estas aprobando

> *Seccion de revision rapida. El detalle tecnico vive en Requirements / Tasks abajo.*

**Que se quiere**: que DKC pueda medir si los tests realmente *muerden* (no solo si pasan), usando mutation testing como respaldo empirico de la dimension #4 (testing) del quality review (DET-23). Hoy esa dimension se juzga a ojo; con esto pasa a tener un numero detras (mutation score). El reto no es la tecnica sino ubicarla **sin enlentecer el flujo**: corre async en un worktree aislado al cerrar cada session, sobre el diff de la session y solo los tests que lo cubren.

**Decisiones criticas que necesitan tu OK** (ya acordadas en conversacion de diseno):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Async en `S{N}.GATE` (worktree bg), no bloqueante | Saca la latencia del camino critico; el dev no espera |
| 2 | No reinventar el mutador — Stryker (JS/TS) + mutmut (Python) | Ambos tienen coverage-scoping + incremental nativo (las palancas de velocidad); el mutate.py de referencia no |
| 3 | Warn-first | Entra como dimension informativa mientras se calibra el threshold; graduar a bloqueante T3 con datos |
| 4 | Reconciliacion hibrida por severidad | Critico → hardening en G-open de S{N+1}; leve → backlog must que bloquea close. Reusa DET-17 + G-open |

**Riesgos principales y como los mitigamos**:

- **H1 (latencia real desconocida)** → S1 es un prototipo + medicion empirica ANTES de cablear DETs/gates. Si la latencia es inaceptable, el diseno se revisa antes de S3/S4.
- **Contaminacion del working tree del dev** (la mutacion reescribe archivos) → mutacion SIEMPRE en git worktree aislado, nunca in-place; el agente es read-only sobre el repo principal.
- **Propagacion al tocar el catalogo de DETs** → regenerar el condensado con `dkc-export-rules --global`, propagar el conteo de reglas (DET-16).

**Que NO se hace en este ticket**:

- Render del score en HC viewer (diferido — el viewer refleja lo que deckard-core produzca; nuevo ticket).
- Graduar a bloqueante: arranca warn-first; el paso a bloqueante T3 es decision posterior con datos de calibracion.
- Cobertura de stacks no-JS/Python (go/rust) — los stacks DKC reales no los usan; se documenta como extensible.

**Tamano estimado**: 4 sessions ejecutables (~6-9h efectivas). La mas riesgosa es **S1** (prototipo + medicion — valida o mata H1).

**Como vas a saber que funciona**:

- Corro `dkc-mutate` sobre un diff con un test debil y veo el mutante sobreviviente reportado con file:line + la mutacion aplicada.
- El mismo comando sobre un diff bien testeado da score alto y `survived: []`.
- Al cerrar una session, el score aparece en la dimension testing del quality review (modo warn) sin bloquear el gate.

## Purpose

Proveer a DKC un motor de mutation testing (`dkc-mutate`) y su integracion en el ciclo de execute/close, de forma que el mutation score respalde empiricamente la dimension testing de DET-23 y refuerce DET-7/DET-13. El motor opera sobre el diff de la session, con test-selection por cobertura, en worktree aislado y de forma asincrona, para no agregar latencia al camino critico del flujo.

## Requirements

### REQ-01: Motor `dkc-mutate` con las 3 palancas de velocidad

> **Que cambia**: el dev (o el flujo) corre `dkc-mutate <project> [--base <ref>]` y obtiene un mutation score sobre el diff de la session en segundos/pocos minutos, no horas.
> **Por que**: sin las palancas (diff-only + coverage-scoped + worktree), mutation testing es inviable en codebases reales — el enfoque naïve reejecuta la suite entera por cada mutante.

El sistema MUST proveer un comando `dkc-mutate` que: (a) mute SOLO las lineas del diff de la session (`git diff` contra el ref base), (b) por cada mutante corra SOLO los tests que cubren la linea mutada, (c) opere en un git worktree aislado sin tocar el working tree activo, (d) enrute al mutador segun stack (Stryker para JS/TS/Vue, mutmut para Python) reusando la deteccion del agente `tester`.

**Actor**: system (flujo de execute) / developer (invocacion manual)
**Layers**: config, backend (CLI node/python)

<details><summary>Scenarios de validacion</summary>

#### Scenario: diff bien testeado
- **GIVEN** un diff de session con tests que distinguen valores concretos
- **WHEN** se corre `dkc-mutate`
- **THEN** score ≥ threshold y `survived: []`

#### Scenario: diff con test debil (anti-DET-7)
- **GIVEN** un test que solo asserta existencia/tipo, no valores
- **WHEN** se corre `dkc-mutate`
- **THEN** ≥1 mutante sobreviviente reportado con file:line + mutacion aplicada + test faltante implicado

#### Scenario: aislamiento
- **GIVEN** el working tree del dev con cambios sin commitear
- **WHEN** corre `dkc-mutate` (que reescribe archivos para inyectar defectos)
- **THEN** el working tree del dev queda intacto (la mutacion ocurrio en el worktree aislado, removido al terminar)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `dkc-mutate horadric` tras un cambio y ve el resumen (total/killed/survived/score) + el tiempo total, sin que su working tree cambie.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | score alto | diff bien testeado | dkc-mutate | score ≥ threshold | survived=[] |
| 2 | sobreviviente | test debil | dkc-mutate | reporta gap | ≥1 survived con file:line |
| 3 | aislamiento | working tree sucio | dkc-mutate | tree intacto | git status sin cambios nuevos |

### REQ-02: Agente `mutation_tester` con output JSON estructurado

> **Que cambia**: el flujo delega a un agente `mutation_tester` (espejo del `tester`) que corre `dkc-mutate` y devuelve JSON con score, sobrevivientes y severidad.
> **Por que**: el flujo necesita un contrato estructurado (no texto libre) para alimentar la dimension testing y la reconciliacion por severidad.

El sistema MUST proveer un agente `mutation_tester` (tier balanced, restricciones no_edit/no_write/no_git_commit) que corra `dkc-mutate` y reporte JSON con `score`, `survived[]` (cada uno con file, line, mutation, missing_test), `severity` (critical|light) por sobreviviente, y `recommendation`.

**Actor**: system
**Layers**: backend (prompt agent), config

<details><summary>Scenarios de validacion</summary>

#### Scenario: output canonico
- **GIVEN** un run de dkc-mutate con 1 sobreviviente
- **WHEN** el mutation_tester reporta
- **THEN** el JSON valida contra el schema (score, survived[], severity, recommendation)

#### Scenario: clasificacion de severidad
- **GIVEN** un sobreviviente con score global < umbral critico
- **WHEN** el agente clasifica
- **THEN** severity=critical (→ hardening en G-open); sino light (→ backlog must)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el JSON del agente parsea sin error y la severidad refleja el umbral configurado.

### REQ-03: DET-31 (Mutation gate) + bloque `mutation` en config

> **Que cambia**: una nueva regla deterministica formaliza el gate de mutacion; cada proyecto declara `mutation:` en su config (enabled, tool, threshold, mode).
> **Por que**: el gate necesita contrato normativo (como las otras DET) y el threshold debe ser config-driven por proyecto (los stacks difieren), patron override como `tiers`.

El sistema MUST agregar DET-31 al catalogo (`dets_catalog.py` + texto integro en `deterministic-rules.md`), regenerar el condensado global, y soportar un bloque `mutation:` opcional en `config.yaml` con fallbacks documentados (ausencia = gate off / warn).

**Actor**: system
**Layers**: config, backend (dets_catalog), docs

<details><summary>Scenarios de validacion</summary>

#### Scenario: regeneracion del condensado
- **GIVEN** DET-31 agregado a dets_catalog.py
- **WHEN** se corre `dkc-export-rules --global`
- **THEN** el bloque condensado del CLAUDE.md global incluye DET-31 y el conteo de reglas se actualiza

#### Scenario: config ausente
- **GIVEN** un proyecto sin bloque `mutation:` en config.yaml
- **WHEN** el flujo evalua el gate
- **THEN** aplica fallback (gate en modo warn, no bloquea) sin error

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras regenerar, DET-31 aparece en el bloque condensado; un proyecto sin config `mutation:` no rompe el flujo.

### REQ-04: Dispatch async en `S{N}.GATE` alimentando dim #4 (warn)

> **Que cambia**: al cerrar una session que toco codigo testeable, el flujo dispara `dkc-mutate` en background y el score alimenta la dimension testing del quality review en modo warn.
> **Por que**: ubicar la mutacion async fuera del camino critico — la session siguiente arranca sin esperar.

El sistema MUST, al cerrar `S{N}.GATE` en work_types {implement, fix, improvement, refactor} con cambios en codigo testeable, disparar `dkc-mutate` contra el commit de cierre (DET-27) en worktree aislado en background, y registrar el score en la dimension #4 (testing) de DET-23 como `warn` (informativo, no bloqueante en esta fase).

**Actor**: system
**Layers**: backend (step request-execute/gates), config

<details><summary>Scenarios de validacion</summary>

#### Scenario: no bloquea
- **GIVEN** un score bajo en warn-mode al cerrar S{N}.GATE
- **WHEN** el gate decide
- **THEN** `continue` permitido; score registrado como evidencia (no fuerza iterate)

#### Scenario: async
- **GIVEN** S{N}.GATE cerrado con dispatch disparado
- **WHEN** S{N+1} arranca
- **THEN** S{N+1} no espera al resultado de mutacion

</details>

#### Acceptance
**El usuario puede verificar que funciona**: cierra una session, ve el dispatch lanzado, y la session siguiente arranca sin bloqueo; el score aparece luego en la dimension testing.

### REQ-05: Reconciliacion hibrida de findings (G-open / close)

> **Que cambia**: un mutante sobreviviente se encola como test-gap; critico → hardening al inicio de S{N+1} (G-open); leve → backlog must que bloquea request-close.
> **Por que**: los findings async llegan cuando S{N+1} ya arranco; encolarlos (no interrumpir) preserva el flujo, y DET-17 garantiza que ninguno se pierda.

El sistema MUST encolar cada sobreviviente como item con `type: test-gap`; los `critical` se materializan como hardening tasks al inicio de S{N+1} via G-open; los `light` se acumulan como backlog `must` (DET-17) que bloquea `request-close`. Un job async pendiente al close bloquea el cierre (DET-13/DET-30) hasta reconciliar.

**Actor**: system
**Layers**: backend (steps request-execute/gates + request-close)

<details><summary>Scenarios de validacion</summary>

#### Scenario: critico → G-open
- **GIVEN** un sobreviviente critical de S{N}
- **WHEN** abre S{N+1} (G-open)
- **THEN** se materializa como primera hardening task antes del trabajo nuevo

#### Scenario: leve → backlog must
- **GIVEN** un sobreviviente light de S{N}
- **WHEN** se intenta request-close con el item sin resolver
- **THEN** el close se bloquea (DET-17 backlog must)

#### Scenario: job pendiente al close
- **GIVEN** un dispatch async aun corriendo
- **WHEN** se intenta cerrar el ticket
- **THEN** close bloquea hasta que el job aterrice y se reconcilie

</details>

#### Acceptance
**El usuario puede verificar que funciona**: un test-gap leve aparece en backlog must y el close no procede hasta resolverlo; uno critico aparece como hardening task al abrir la session siguiente.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Latencia de `dkc-mutate` sobre diff de session | wall-clock total | objetivo a fijar en S1 con datos; hipotesis: segundos/pocos minutos. Si excede, revisar diseno |

## Tasks

### Session 1 — Prototipo dkc-mutate + medicion empirica de latencia [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `dkc-mutate` (engine): resolver diff de session, crear worktree aislado, enrutar stryker/mutmut por stack, correr coverage-scoped, reportar total/killed/survived/score | REQ-01 | developer | — | commands/dkc-mutate, commands/lib/ | manual: correr sobre diff sintetico de horadric-cube | git revert + remover worktree | DET-1, DET-2, DET-8, DET-16 | pending | 1 |
| S1.T2 | Medir latencia: correr dkc-mutate sobre 2-3 diffs reales (horadric/up1) y registrar wall-clock + #mutantes + #tests por mutante. Decidir si H1 se confirma | REQ-01 | developer | S1.T1 | projects/horadric/tickets/HOR-105.md | manual: tabla de medicion en el gate | (no aplica — medicion) | DET-4, DET-13 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2) — persistir medicion, decidir continue (H1 ok) / iterate (revisar diseno si latencia inaceptable) | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Agente mutation_tester + schema JSON [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `prompts/agents/mutation_tester.md` (espejo de tester): rol, cuando se activa, protocolo, output JSON schema (score, survived[], severity, recommendation), restricciones no_edit | REQ-02 | developer | S1.GATE | prompts/agents/mutation_tester.md | manual: el schema parsea; cross-ref con tester.md | git revert | DET-1, DET-10, DET-16 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T1) | — | reviewer | S2.T1 | ticket | gate persistido | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — DET-31 + bloque mutation en config [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Agregar DET-31 (Mutation gate) a dets_catalog.py + texto integro en deterministic-rules.md; regenerar condensado con dkc-export-rules --global; propagar conteo de reglas (DET-16) | REQ-03 | developer | S1.GATE | server/src/deckard_cain/dets_catalog.py, prompts/deterministic-rules.md | bash: dkc-export-rules --global exit 0 | git revert | DET-2, DET-16 | pending | 3 |
| S3.T2 | Definir bloque `mutation:` en config schema (commands/lib/schemas) + fallbacks documentados; ejemplo en projects/horadric/config.yaml | REQ-03 | developer | S3.T1 | commands/lib/, projects/horadric/config.yaml | bash: dkc-validate sobre config; ausencia no rompe | git revert | DET-1, DET-8 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T2) — verificar condensado regenerado + conteo consistente | — | reviewer | S3.T1, S3.T2 | ticket | gate persistido | (no aplica) | DET-20, DET-23 | pending | 3 |

### Session 4 — Cableado de gates (dispatch async + reconciliacion + close) modo WARN [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Cablear dispatch async en S{N}.GATE (request-execute/gates.md): disparar dkc-mutate bg contra commit de cierre; alimentar dim #4 testing en warn | REQ-04 | developer | S2.GATE, S3.GATE | prompts/steps/request-execute/gates.md | manual: ciclo de session dispara mutacion sin bloquear | git revert | DET-5, DET-20, DET-23 | pending | 4 |
| S4.T2 | Cablear reconciliacion hibrida: check en G-open (critico → hardening task), backlog must (leve), bloqueo de close por job pendiente (request-close.md) | REQ-05 | developer | S4.T1 | prompts/steps/request-execute/gates.md, prompts/steps/request-close.md | manual: critico aparece en G-open; leve bloquea close | git revert | DET-5, DET-13, DET-17 | pending | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier T3) — un ciclo end-to-end demostrado en warn-mode | — | reviewer | S4.T1, S4.T2 | ticket | gate persistido + e2e demostrado | (no aplica) | DET-20, DET-23 | pending | 4 |

### Session 5 — Tool-adoption: invocacion real stryker/mutmut + install + confirmar H1 [tipo: ⚑ fuerte] [tier: T2]

> **Hueco detectado por el dev (2026-06-04)**: el plan no representaba la invocacion real de stryker/mutmut en `dkc-mutate` (S1 entrego fallback + esqueleto). Esta session lo materializa. Absorbe el backlog B2. **Orden de ejecucion: S1 → S5 → S3 → S4** — S5 confirma H1 (latencia coverage-scoped real); S3/S4 NO se cablean hasta que S5 confirme H1. S2 (agente) es independiente.
> **CONSTRAINT del dev (2026-06-04, DEC-LOCAL-02)**: footprint CERO en los repos de desarrollo. El tooling de mutacion se instala en **DKC** (cache propio), NO como devDependency de cada repo. `dkc-mutate` corre dentro del worktree efimero reusando el test runner que el repo YA tiene (vitest/jest/pytest), inyectando config stryker/mutmut **efimera en el worktree** (nunca en el repo). El repo target (horadric-cube) NO se modifica — es solo el target de medicion. Adoptar el gate en un proyecto no requiere tocar el proyecto.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Implementar invocacion real en dkc-mutate: stryker (JS/TS, `--mutate` por lineas del diff + `coverageAnalysis: perTest`) y mutmut (Python, coverage-scoped). Tooling desde cache de DKC; config efimera generada en el worktree; reuse del node_modules/venv del repo via symlink. Detectar version del runner del repo y resolver plugin compatible | REQ-01 | developer | S1.GATE | commands/dkc-mutate, commands/lib/ | manual: dkc-mutate horadric corre stryker real sobre un diff sin modificar el repo target | git revert | DET-5, DET-8, DET-16 | pending | 5 |
| S5.T2 | Instalar el tooling de mutacion EN DKC (cache propio: @stryker-mutator/core + runners comunes; mutmut en venv DKC). Estrategia de resolucion de version de runner por repo target. Cero footprint en repos de desarrollo | REQ-01 | developer | S5.T1 | commands/lib/ | bash: el cache resuelve stryker sin tocar el repo target | remover cache dir | DET-8, DET-11 | pending | 5 |
| S5.T3 | Medir H1 real: wall-clock coverage-scoped sobre un diff tipico de session en horadric-cube (target, no modificado); registrar #mutantes + #tests/mutante + tiempo; confirmar o matar H1 | REQ-01 | developer | S5.T2 | projects/horadric/tickets/HOR-105.md | manual: tabla de medicion en el gate; git status de horadric-cube limpio | (no aplica — medicion) | DET-4, DET-13 | pending | 5 |
| **S5.GATE** | Gate de sync Session 5 (tier T2) — H1 confirmada/matada con numeros reales; decidir continue (cablear S3/S4) / iterate (revisar diseno si latencia inaceptable) | — | reviewer | S5.T1, S5.T2, S5.T3 | ticket | gate persistido + medicion real | (no aplica) | DET-20, DET-23 | pending | 5 |

## Constraints

- DET-7: test cases referencian discovery + regresion obligatoria — la mutacion es el enforcement empirico de esta regla.
- DET-13: cierre por evidencia — el score es evidencia; un job pendiente bloquea close.
- DET-17: backlog must bloquea cierre — vehiculo de reconciliacion de findings leves.
- DET-23: quality review gate — la mutacion alimenta la dimension #4 (testing).
- DET-27: commits al cierre de session — provee el ref estable contra el que muta el worktree.
- DET-30: red de seguridad autopilot — el worktree aislado read-only evita contaminar el tree del dev.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| StrykerJS | external | Mutador JS/TS/Vue con coverage-scoping + incremental | Instalable por proyecto; si no esta, el gate degrada a warn/skip con aviso |
| mutmut | external | Mutador Python coverage-aware | idem |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Latencia real inaceptable en codebase grande | medium | high | S1 mide antes de cablear; si excede, revisar diseno (mas scoping, sampling de mutantes, o solo en T3) |
| Worktree async contamina el tree del dev | low | high | Worktree aislado + agente read-only sobre repo principal; remover worktree en finally |
| Propagacion incompleta del conteo de reglas al agregar DET-31 | medium | medium | Regenerar condensado con dkc-export-rules --global; grep de "30 reglas"/"22 reglas" en docs (DET-16) |

## Open questions

- Umbral exacto critical vs light por stack: se calibra en warn-mode con datos reales (no bloquea el diseno).

## Decisions (cerradas durante design)

### DEC-LOCAL-01: No reinventar el mutador (Stryker + mutmut vs mutate.py propio)
- **Contexto**: el repo de referencia usa un mutate.py propio (token-level, sin deps).
- **Drivers**: las palancas de velocidad (coverage-scoping + incremental) son las que hacen viable la mutacion; el mutate.py no las tiene.
- **Opcion elegida**: enrutar a Stryker (JS/TS) + mutmut (Python), que las traen de fabrica.
- **Alternativas**: portar mutate.py multi-stack (descartada: reimplementariamos coverage-scoping e incremental, alto costo y bug-prone).
- **Consecuencias**: gana viabilidad y mantenibilidad; cuesta una dependencia externa por stack (degradable a warn/skip si ausente).
- **Session**: design (S0).

### DEC-LOCAL-02: Tooling de mutacion DKC-owned, footprint cero en repos de desarrollo
- **Contexto**: ¿stryker/mutmut se instalan como devDependency de cada repo de desarrollo (horadric-cube, up1, ...) o los corre DKC?
- **Drivers**: (1) up1 layout es repo compartido — imponerle un devDep es footprint en repo ajeno; (2) DKC ya crea un worktree efimero aislado por corrida; (3) la suite + runner del repo YA existen.
- **Opcion elegida**: DKC dueño del tooling (cache propio en deckard). `dkc-mutate` corre dentro del worktree efimero, reusa el test runner del repo via symlink, e inyecta config stryker/mutmut **efimera en el worktree**. El repo target NO se modifica (cero devDep, cero config commiteada). Adoptar el gate no requiere tocar el proyecto.
- **Alternativas**: devDep por repo (descartada: footprint en repos ajenos/compartidos, viola el constraint del dev de "solucion que corra DKC").
- **Consecuencias**: gana cero-footprint + adopcion trivial; cuesta complejidad en el engine (resolver version del runner plugin compatible con el test framework de cada repo target — la arruga de S5.T1).
- **Session**: S1 → corregido por feedback del dev (2026-06-04).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..05 pasan
- [ ] **Tests**: dkc-mutate validado sobre diff testeado y diff con test debil
- [ ] **NFRs**: latencia medida en S1 dentro de lo aceptable (o diseno revisado)
- [ ] **Rules**: DET-31 en condensado regenerado; conteo de reglas consistente
- [ ] **Integration**: warn-mode no bloquea gates de session; close bloquea con job pendiente o backlog must
- [ ] **Docs**: deterministic-rules.md + config schema documentados
