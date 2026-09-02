---
id: SPEC-workflow-local-only-readiness-102
project: horadric
ticket: HOR-103
status: in_progress
---

# DKC local-only readiness — reducir contexto (#1) y superficie de tools (#2)

# DKC local-only readiness — reducir contexto (#1) y superficie de tools (#2)

## Executive summary — lo que estas aprobando

**Que se quiere**: dejar DKC mas cerca de poder correr sobre un host LLM **local** (ventana
chica, tool-calling debil), avanzando solo lo que NO depende de tener un host local instalado.
El diagnostico (Session 1 del ticket) confirmo que la maquinaria de reduccion de contexto ya
existe (familia HOR-059/085..089, toda done) y que el server MCP ya es agnostico al provider
(cero llamadas LLM, embeddings locales con fastembed). Quedan dos huecos host-agnosticos
concretos y de bajo riesgo: `_style.md` no tiene mecanismo de reduccion (12.2K tokens, 31% del
baseline puro), y la superficie de 78 tools no esta acotada por step (la union de TODO el flujo
usa 18/78; 60 nunca se usan). Esta spec es un **draft de exploracion**: no ejecuta, define el
delta, las opciones y la separacion entre lo ejecutable-ya y lo bloqueado-por-host.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Perfil dual (DEC-LOCAL-03)**: las reducciones NO son globales — son un perfil `local` opt-in. Default (Claude Code, ~1M ventana) mantiene el comportamiento completo actual; perfil `local` activa la carga reducida | **Restriccion dura del dev**: hoy DKC corre en Claude Code con ~1M de contexto y NO puede degradarse por preparar local. La reduccion solo aplica donde hace falta |
| 2 | Enfoque de reduccion de `_style.md` bajo perfil: point-of-use (paridad con DETs) vs split por seccion vs condensado unico | Define cuanto del 12.2K se recupera en perfil local y cuanto trabajo cuesta. Point-of-use reusa el patron probado en DETs (HOR-085) |
| 3 | Enfoque de superficie de tools: C (frontmatter `tools:` por step + doc) vs B (fachadas) vs A (tool-set dinamico server-side) | C es host-agnostico y habilita A despues; B rompe consumidores (HC, validators); A depende del host local (no validable hoy) |

**Riesgos principales y como los mitigamos**:

- **Reducir `_style.md`/tools degrada el host actual (Claude Code, ~1M ventana, donde el contexto sobra)** → DEC-LOCAL-03 perfil dual: el default NO cambia; la reduccion es opt-in del perfil `local`. REQ-PRESERVE-02 mide que el default no se degrada.
- **`tools:` por step desincroniza con las tools que el step realmente usa** → generar el campo desde el `grep dkc_` real del step (no a mano) + validator que compare frontmatter vs uso.
- **Invertir en enfoque A sin host local y descubrir que el host no soporta tool-set dinamico** → A queda en backlog bloqueado-por-host; solo se ejecuta C (que no asume nada del host).

**Que NO se hace** (limites del scope):

- **Enfoque B (fachadas de tools)**: fuera de scope. Con target 128K + perfil dual no es necesario; ademas rompe consumidores (HC, validators).
- No se valida contra un host local real (no existe aun) → enfoque A, medicion de respeto de gates en modelo local y tier routing real quedan en Backlog.
- No se toca el server MCP para delegacion multi-provider (eso es HOR-030 Ruta A / HOR-060).
- El perfil default (Claude Code, ~1M) NO se modifica (DEC-LOCAL-03).

**Tamano estimado**: ~5-8 sessions efectivas en **un solo ticket de ejecucion** (mejoras
diferenciadas por session — decision del dev 2026-05-31). La mas riesgosa es la reduccion de
`_style.md` (toca el archivo que mas influye en el comportamiento del LLM principal — exige
medir antes/despues bajo ambos perfiles).

**Como vas a saber que funciona** (criterios observables):

- `./commands/dkc-measure-context-base --json` muestra baseline puro por debajo de ~32K (hoy 39.6K) tras reducir `_style`.
- Cada step declara `tools:` en su frontmatter y un validator confirma que coincide con las tools que el step realmente referencia.
- El flujo completo en Claude Code sigue pasando los validators existentes (regression).

---

## Purpose

Acotar y dejar listo-para-ejecutar el trabajo host-agnostico que acerca DKC a un host local,
sin comprometer implementacion que dependa de un host que aun no existe. Tecnicamente: cerrar
el hueco de `_style.md` en la familia de reduccion de contexto, e introducir el patron `tools:`
por step (paridad con `dets:`) como base del control de superficie de tools.

## Requirements

### REQ-IMPROVE-01: `_style.md` con mecanismo de reduccion (point-of-use, bajo perfil)

> **Que cambia**: bajo el perfil `local`, `_style.md` deja de cargarse entero (12.2K tokens) por turno; sus principios se traen condensados en el punto de uso, igual que las DETs. Bajo el perfil default (Claude Code), el comportamiento no cambia.
> **Por que**: es el unico componente grande del baseline sin mitigacion (31% del baseline puro). En un host local sin los mecanismos de Claude Code, ese peso se paga completo cada turno — pero el host actual de 1M no debe degradarse (DEC-LOCAL-03).

El sistema MUST poder reducir el peso de `_style.md` en el contexto por turno a traves de carga
point-of-use (los principios relevantes a un step se re-surfacean condensados via el mecanismo
ya existente para DETs) **cuando el perfil `local` esta activo**, preservando el contenido
integro consultable on-demand y el comportamiento default intacto.

**Actor**: system
**Layers**: prompts, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: turno tipico no carga `_style` entero
- **GIVEN** un step activo cualquiera (ej. request-execute/task-loop)
- **WHEN** el LLM entra al step
- **THEN** el contexto incluye solo los principios de `_style` que el step declara, no los 12.2K completos

#### Scenario: contenido integro sigue accesible
- **GIVEN** un caso borderline donde el LLM necesita un principio no re-surfaceado
- **WHEN** consulta el contenido integro de `_style`
- **THEN** el principio sigue disponible on-demand (no se perdio)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `dkc-measure-context-base --json` reporta el baseline puro por debajo de ~32K (vs 39.6K actual), y los validators del flujo siguen pasando.

### REQ-IMPROVE-02: frontmatter `tools:` por step (paridad con `dets:`)

> **Que cambia**: cada step declara en su frontmatter las tools MCP que usa, igual que hoy declara `dets:`. Hoy esa informacion solo existe implicita en el texto del step.
> **Por que**: la union de todos los steps usa 18/78 tools; el max por step es 11. Declararlo habilita (a) documentar la superficie minima por step y (b) que el server filtre el tool-set cuando el host lo soporte.

El sistema MUST declarar en el frontmatter de cada step el conjunto de tools `dkc_*` que el
step referencia, generado desde el uso real (no a mano), de forma que sea consumible por
documentacion (enfoque C) hoy y por filtrado server-side (enfoque A) cuando exista host local.

**Actor**: system
**Layers**: prompts, server, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: frontmatter coincide con uso real
- **GIVEN** un step con `tools:` declarado
- **WHEN** un validator compara el frontmatter contra `grep dkc_` del cuerpo del step
- **THEN** coinciden (sin tools declaradas que no se usen, ni usadas sin declarar)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: cada step en `prompts/steps/` tiene `tools:` en frontmatter y el validator de coherencia pasa.

### REQ-IMPROVE-03: perfil local de contexto documentado

> **Que cambia**: existe un documento/config "perfil local" que combina todas las palancas de reduccion al maximo (lazy-load siempre + condensado DET + `_style` point-of-use + `tools:` por step) con un target de contexto medido.
> **Por que**: hoy las palancas estan dispersas; un host local necesita un punto unico que diga "active esto para correr en ventana chica" y un numero objetivo verificable.

El sistema SHOULD proveer un perfil local consolidado (doc + medicion) que documente como
minimizar el contexto por turno y cual es el baseline alcanzable, para guiar la futura
instalacion sobre host local.

**Actor**: system / dev
**Layers**: config, prompts

#### Acceptance
**El usuario puede verificar que funciona**: existe el perfil + una medicion `dkc-measure-context-base` que demuestra el baseline minimo alcanzable.

### REQ-PRESERVE-01: acceso on-demand a reglas no se rompe (regression)

> **Que cambia**: nada — es garantia de regresion.
> **Por que**: reducir `_style` y tocar el re-surfacing no debe romper `dkc_get_rules` ni el acceso on-demand a DETs/principios.

El sistema MUST mantener el acceso on-demand al contenido integro de DETs y principios de
`_style` (via `dkc_get_rules` y lectura directa de los archivos fuente).

**Actor**: system
**Layers**: server, prompts

### REQ-PRESERVE-02: el flujo en Claude Code no se degrada

> **Que cambia**: nada — garantia de regresion para el host actual.
> **Por que**: las optimizaciones para local no deben empeorar la calidad de salida ni romper validators en el host que se usa hoy.

El sistema MUST preservar el comportamiento y la calidad del flujo completo en Claude Code
(host actual, ~1M de ventana) **como perfil default**: con el perfil `local` inactivo, el
contexto cargado, los validators y el comportamiento del LLM principal son identicos a hoy.
Las reducciones de REQ-IMPROVE-01/02 solo surten efecto bajo el perfil `local` (DEC-LOCAL-03).

**Actor**: system
**Layers**: prompts, server

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Context budget (perfil local) | Baseline puro por turno (DETs + style) con perfil `local` activo | tokens (heuristica chars/3.7 de `dkc-measure-context-base`) | holgado para ventana de **128K** (target de host local); idealmente < 32K baseline |
| No-degradacion (perfil default) | Baseline + comportamiento con perfil `local` inactivo (Claude Code) | tokens + validators | **identico a hoy** (39.6K, sin cambios) |
| Tool surface | Tools expuestas por turno tipico cuando el host soporte filtrado | count | <= 11 (vs 78 hoy) |

## Tasks

> **Plan de ejecucion**: el dev decidio (2026-05-31) activar las 3 mejoras en **un solo ticket
> de ejecucion** (`improvement`), diferenciadas por session. Las tasks abajo se copian a ese
> ticket como S1 (`_style`), S2 (`tools:`) y S3 (perfil local). **Todas las reducciones son
> condicionales al perfil `local` (DEC-LOCAL-03)** — el perfil default no se toca, asi que cada
> task de reduccion incluye verificar no-degradacion del host actual.

> **Reconciliacion de numeracion (HOR-103 execute, 2026-05-31)**: este spec se produjo en
> explore (HOR-102) con sessions indicativas S2/S3. Al activarse para ejecucion en HOR-103, las
> tasks se renumeran al plan de sessions del ticket: **S1** (`_style`), **S2** (`tools:`), **S3**
> (perfil doc). Las decisiones abiertas del intake quedaron resueltas: switch del perfil =
> variable de entorno `DKC_PROFILE` documentada en `prompts/agent-tiers.md` (runtime, coexiste
> Claude↔local en el mismo PC); mecanismo `_style` = catalogo condensado markdown
> `prompts/_style-condensed.md` (host-agnostico, cero cambios al server).

### Session 1 — Reducir `_style.md` via condensado point-of-use (perfil local) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Medir baseline de contexto antes de tocar `_style` (perfil default) | REQ-IMPROVE-01 | researcher | — | `commands/dkc-measure-context-base` | medicion documentada (DETs + style = 39.6K) | (no aplica) | DET-1, DET-2, DET-11 | done | 1 |
| S1.T2 | Crear `prompts/_style-condensed.md` (12 principios condensados) + switch `DKC_PROFILE` + `dkc-measure-context-base` profile-aware (`--local` cuenta condensado) + doc del switch en `agent-tiers.md` | REQ-IMPROVE-01 | developer | S1.T1 | `prompts/_style-condensed.md`, `commands/dkc-measure-context-base`, `prompts/agent-tiers.md` | re-medir perfil local < 32K | git revert | DET-5, DET-8, DET-16 | done | 1 |
| S1.T3 | Verificar regression: baseline default identico (39.6K), acceso on-demand a `_style.md` intacto, validators verdes | REQ-PRESERVE-01, REQ-PRESERVE-02 | reviewer | S1.T2 | validators | baseline default == 39.6K Y validators verdes | (no aplica) | DET-5, DET-7, DET-13, DET-14 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir + validar + decidir | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Frontmatter `tools:` por step + validator de coherencia [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Generar `tools:` por step desde uso real (`grep dkc_`) y poblar frontmatter de los steps que invocan tools | REQ-IMPROVE-02 | developer | S1.GATE | `prompts/steps/*` | frontmatter poblado desde grep real | git revert | DET-2, DET-16 | done | 2 |
| S2.T2 | Validator de coherencia: `tools:` declaradas == tools referenciadas en el cuerpo del step | REQ-IMPROVE-02 | developer | S2.T1 | `commands/dkc-validate*` | validator detecta drift declaradas vs usadas | git revert | DET-7, DET-13 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir + validar + decidir | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Perfil local consolidado (doc + medicion final) [tipo: ⚑ fuerte] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Documentar perfil local consolidado (palancas + target medido + nota replicacion Lean-B/CLAUDE.md) | REQ-IMPROVE-03 | researcher | S2.GATE | `prompts/agent-tiers.md` | perfil + medicion final presentes | (no aplica) | DET-4, DET-13 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T1)** — persistir + validar + decidir | — | reviewer | S3.T1 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 3 |

## Constraints

- DET-11 (KB-first): reusar el mecanismo de re-surfacing point-of-use de HOR-085, no inventar uno nuevo.
- Patron `dets:` en frontmatter de step (HOR-085) es el molde para `tools:` — paridad explicita.
- Lean-B (HOR-088) depende de `~/.claude/CLAUDE.md` (Claude Code). Cualquier perfil local debe documentar como replicar el piso de DETs en un frontend local.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Familia HOR-059/085..089 | internal | Maquinaria de reduccion ya construida que esta spec extiende | Baja — toda done |
| `dkc-measure-context-base` | internal | Instrumento de medicion (heuristica chars/3.7) | Baja — existe y funciona |
| Host LLM local | external | Necesario para enfoque A, medir gates en modelo local, tier routing | **Alta — no existe aun** → todo lo que lo necesita va a Backlog |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Reducir `_style` degrada el comportamiento del LLM principal | medium | high | Medir antes/despues (S1.T1); contenido no se borra, se mueve a on-demand |
| `tools:` se desincroniza del uso real | medium | medium | Generar desde `grep dkc_`, no a mano + validator de coherencia |
| Invertir en enfoque A sin poder validarlo (sin host) | high | medium | A queda en Backlog; solo se ejecuta C (host-agnostico) |

## Open questions

- [ ] ¿Que host local objetivo (Ollama / LM Studio / Open WebUI / AnythingLLM)? — define si el enfoque A (tool-set dinamico) es viable y si Lean-B necesita replicacion del mecanismo CLAUDE.md. **Pendiente — bloqueado hasta que exista host**.
- [x] ¿Que piso de contexto objetivo? — **RESUELTO (dev, 2026-05-31): 128K** para host local. Con DEC-LOCAL-03 (perfil dual) NO se toca el host actual (1M). El enfoque B (fachadas) NO es necesario para 128K → queda fuera de scope.
- [ ] ¿Cual es la reduccion realista de `_style` con point-of-use (de 12.2K a cuanto)? — se responde con la medicion de S1 del ticket de ejecucion.
- [ ] ¿Donde vive el switch del perfil `local` (DEC-LOCAL-03)? — candidatos: `agent-tiers.md`, `config.yaml` del proyecto, o flag de entorno. Se decide en S1 del ticket de ejecucion.

## Decisions

### DEC-LOCAL-03: perfil dual (default vs local) — restriccion de no-degradacion
- **Contexto**: hoy DKC corre en Claude Code con ~1M de ventana. Las reducciones de contexto solo importan en host local (ventana chica). Aplicarlas globalmente degradaria el host actual donde el contexto sobra.
- **Drivers**: el dev fija como restriccion dura "no degradar lo que tenemos hoy (1M) por preparar local". Reversibilidad. Un solo codebase que sirva a ambos hosts.
- **Opcion elegida**: perfil `local` opt-in. Default = comportamiento completo actual (sin cambios). Perfil `local` activo = carga reducida (`_style` point-of-use + `tools:` filtrado). El perfil se resuelve por config (candidato: `agent-tiers.md` o `config.yaml` del proyecto / flag de entorno).
- **Alternativas descartadas**: (a) reduccion global — viola la restriccion de no-degradar Claude Code; (b) dos ramas/forks del prompt-set — divergencia y mantenimiento doble.
- **Consecuencias**: cada mecanismo de reduccion debe ser condicional al perfil (algo mas de complejidad), a cambio de cero riesgo para el host actual y un solo codebase.
- **Session**: design (draft)

### DEC-LOCAL-01: enfoque de reduccion de `_style.md` (bajo perfil local)
- **Contexto**: `_style.md` (12.2K) es el unico componente grande sin mecanismo de reduccion.
- **Drivers**: reusar patron probado, minimizar riesgo, recuperar el maximo de tokens — todo condicionado a DEC-LOCAL-03 (solo bajo perfil `local`).
- **Opcion elegida (propuesta)**: point-of-use — paridad con DETs (HOR-085). El step declara que principios necesita y se re-surfacean condensados cuando el perfil `local` esta activo.
- **Alternativas**: (a) split por seccion + lazy-load (como steps HOR-086) — mas trabajo, mismo efecto; (b) condensado unico estilo Lean-B — pierde granularidad por step.
- **Consecuencias**: gana consistencia con el mecanismo existente; requiere medir que ningun principio critico quede fuera del re-surfacing en perfil local.
- **Session**: design (draft)

### DEC-LOCAL-02: enfoque de superficie de tools
- **Contexto**: 78 tools, union real 18/78, max 11 por step.
- **Drivers**: ser host-agnostico ahora, no romper consumidores, habilitar el futuro filtrado server-side.
- **Opcion elegida (propuesta)**: C — frontmatter `tools:` por step + doc. Habilita A (filtrado server) cuando llegue el host, sin comprometerse hoy.
- **Alternativas**: (a) B fachadas que colapsan tools — rompe HC server, validators, `dkc.md` (DET-16, costo alto); (b) A tool-set dinamico server-side — depende de capacidad del host local (no validable sin host) → Backlog.
- **Consecuencias**: bajo riesgo, reversible; el ahorro de contexto por tools llega completo recien cuando el host soporte filtrado (enfoque A).
- **Session**: design (draft)

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Baseline puro contexto | 39.6K tokens | < 32K | `dkc-measure-context-base --json` |
| Tools por turno (con host que filtre) | 78 | <= 11 | inspeccion del tool-set expuesto |

## Technical reference

- Medicion S1 (2026-05-31): DETs 27.4K + `_style` 12.2K = 39.6K puro; +step 46-51K.
- Superficie de tools S1: union 18/78, max 11 (task-loop), 60/78 sin uso en el flujo.
- Server sin llamadas LLM; embeddings locales (fastembed ONNX + sqlite-vec).

## Acceptance checkpoints

> Explore — no se ejecutan en este ticket. Aplicarian en los tickets derivados al activarse.

- [ ] **Funcional**: scenarios de REQ-IMPROVE-01/02/03 pasan
- [ ] **Tests**: validators de coherencia + regression verdes
- [ ] **NFRs**: baseline < 32K medido
- [ ] **Integration**: flujo en Claude Code no se degrada (REQ-PRESERVE-02)
