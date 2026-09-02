---
id: SPEC-deckard-core-req-format-human-callout
project: horadric
ticket: HOR-019
status: done
---

# REQs en spec con callout "Que cambia / Por que" + scenarios colapsables

# REQs en spec con callout "Que cambia / Por que" + scenarios colapsables

## Executive summary — lo que estas aprobando

### Que se quiere

Que cada REQ en un spec abra con dos lineas humanas — **"Que cambia"** y **"Por que"** — antes del enunciado normativo `MUST/SHOULD/MAY`. Y que los scenarios `GIVEN/WHEN/THEN` queden colapsados por default en `<details>` para no inundar la lectura inicial. El dev humano lee 4-5 segundos por REQ; si quiere validar test cases, expande `<details>`.

El cambio toca **dos archivos** del meta-sistema: `templates/records/spec.md` (shape del REQ) y `prompts/steps/_design-shared.md` (instruccion al LLM). Los 4 `design-{tipo}.md` heredan via referencia — **no se tocan**. Specs ya cerrados quedan tal cual (no retroactivo).

Este spec **se redacta a si mismo con la convencion** como dogfooding — si no convence, iteramos antes de S1.

### Decisiones criticas

| Decision | Por que pesa |
|---|---|
| Ubicar la convencion en `_design-shared.md` (DRY), no duplicarla en 4 design-*.md | Los 4 design-* heredan via referencia (`_design-shared.md:5-9` declara `referenced_by`). Evita drift entre los 4 archivos y reduce mantenimiento futuro |
| Conservar RFC 2119 (`MUST/SHOULD/MAY`) en cuerpo del REQ, no reemplazar por EARS | El LLM ejecutor depende de la precision normativa. EARS aportaria marginalmente sobre RFC 2119 bien aplicado — riesgo de ceremonia sin valor. Decidido en analisis previo al ticket |
| Promover a DET-24 solo si validacion empirica en S2 es positiva | DET-1 (certeza explicita): no se fuerza el formalismo en intake; se difiere a evidencia empirica. Si el LLM produce callouts consistentes sin redundancia, se promueve. Sino, queda como guideline sin DET formal |
| No migrar specs existentes (criterio igual a DET-21/DET-22) | Migrar 50+ specs cerrados es trabajo gigante con valor marginal. El render mejorado del callout solo aplica a specs futuros |
| Aplicar la convencion al spec de este mismo ticket (dogfood) | Validacion en vivo del formato. Si no convence, evita producir 1 spec adicional para POC |

### Riesgos principales y como los mitigamos

| Riesgo | Mitigacion |
|---|---|
| El LLM produce callouts redundantes con `## Purpose` o `## Executive summary` | Paso 0c en `_design-shared.md` incluye reglas anti-redundancia explicitas con ejemplos negativos. Validacion en S2 detecta drift; si emerge, se itera el Paso 0c con guidelines mas estrictos antes de pensar en DET-24 |
| El callout crece de 1-2 lineas a mini-ensayo | Guideline explicito en Paso 0c: max 2 lineas para "Que cambia", max 1 linea para "Por que". Spot-check en S2 |
| Tickets con REQs triviales (1 oracion) generan callout vacio que sobra | Regla explicita en Paso 0c: si el REQ es trivial, omitir el callout. No forzar prosa donde no aporta |
| HC render visual del callout no convence post-merge | `<details>` y blockquote son markdown estandar. Mitigacion duplicada: HOR-018 paralelo mejora el render general de SpecDetail; si HOR-018 cierra antes, el callout luce aun mejor |

### Que NO se hace

- **No migrar specs existentes**: HOR-019 cierra sin tocar specs ya cerrados. El render mejorado aplica solo a specs futuros (criterio DET-21/DET-22)
- **No reemplazar RFC 2119 por EARS**: convive con la convencion del callout — son capas distintas (humana arriba, normativa abajo)
- **No tocar los 4 design-{tipo}.md individualmente**: heredan via referencia desde `_design-shared.md` — confirmado en intake-explore (multi-capa)
- **No producir draft visual (DET-18)**: skip documentado por decision local en el ticket — el POC visual ya vive en el `dkc:code-walkthrough` del teach-intake, no requiere `preview.html` adicional
- **No promover a DET-24 sin validacion empirica**: S3 (DET-24) es opcional, condicional a S2 positivo

### Tamano estimado

| Item | Valor |
|---|---|
| Sessions | 2-3 (S1 implementacion + S2 validacion + S3 opcional DET-24) |
| Horas estimadas | 2-4h efectivas |
| Session mas riesgosa | S2 (gate ⚑ fuerte) — dev valida output empirico del LLM con la nueva convencion |
| Archivos modificados | 2 (`templates/records/spec.md` + `prompts/steps/_design-shared.md`) + 1 condicional (`prompts/deterministic-rules.md` en S3) |
| Repos tocados | 1 (`deckard`) — sin tocar `horadric-cube` |

### Como vas a saber que funciona

- Abris el ticket y ves el callout aplicado en los REQs de este spec con buena jerarquia visual en HC (o en markdown raw)
- Generas un spec NUEVO con un `design-*` post-S1 (cualquier ticket en intake sirve) y los REQs salen con callout consistente, sin duplicar info del purpose
- Los scenarios GIVEN/WHEN/THEN siguen siendo expandibles y testables al abrir `<details>`
- Specs cerrados pre-2026-05-13 siguen renderando sin error (no retroactivo, sin breaking changes)
- RFC 2119 (MUST/SHOULD/MAY) sigue intacto en el cuerpo de cada REQ — el callout es adicional, no reemplazo

## Purpose

Mejorar la legibilidad humana de los REQs en specs generados por DKC, sin perder la precision normativa que el LLM ejecutor necesita. La convencion del callout vive en `_design-shared.md` (step-fragment compartido entre los 4 design-{tipo}.md) y en `templates/records/spec.md`. Aplica a specs futuros generados despues del merge de S1. Audiencia: devs que abren un spec para aprobar (no tienen tiempo de leer 800 lineas) y devs futuros que retoman un caso documentado (necesitan entender "que cambia" sin reconstruir el chat).

## Analisis de mejora

### Estado actual

Cada REQ en un spec generado por DKC tiene esta estructura:

```markdown
### REQ-XX: titulo
El sistema MUST {comportamiento}.
**Actor**: ...
**Layers**: ...
#### Scenario: ...
- GIVEN ...
- WHEN ...
- THEN ...
```

- El dev humano que abre el spec para aprobar arranca leyendo "El sistema MUST..." (RFC 2119) sin contexto humano de **que cambia** o **por que importa**.
- Specs tipicos tienen 5-15 REQs con 3-5 scenarios cada uno = 15-75 bloques BDD.
- Volumen tipico de spec: 300-800 lineas. El dev escanea, no lee linealmente.

### Problema / oportunidad

El dev se encuentra con un wall of text orientado al LLM ejecutor. Auditoria previa identifico que el spec actual privilegia precision normativa sobre legibilidad humana — coherente con el rol del LLM, incomodo para el revisor humano.

El `Executive summary` (Paso 0a del shared) ya define lenguaje conversacional a nivel spec. La convencion del callout es la extension natural de ese principio a granularidad REQ.

### Estado deseado

Cada REQ con esta estructura:

```markdown
### REQ-XX: titulo

> **Que cambia**: 1-2 lineas en lenguaje del dev consumidor
> **Por que**: 1 linea con la motivacion

El sistema MUST {comportamiento}.
**Actor**: ...
**Layers**: ...

<details><summary>Scenarios de validacion</summary>

#### Scenario: ...
- GIVEN ... | WHEN ... | THEN ...

</details>
```

- Dev humano lee callout (4-5 segundos) → entiende que cambia y por que
- Si quiere validar test cases, expande `<details>`
- LLM ejecutor sigue leyendo todo (markdown sin colapsar texto)

### Alcance propuesto

**Se toca**:
- `templates/records/spec.md` — agregar convencion en seccion Requirements del template
- `prompts/steps/_design-shared.md` — agregar Paso 0c con guidelines anti-redundancia
- `prompts/deterministic-rules.md` — agregar DET-24 (condicional a S3, validacion empirica positiva en S2)

**NO se toca**:
- Los 4 `design-{feature,fix,improvement,refactor}.md` — heredan via referencia
- Specs ya cerrados — sin migracion retroactiva
- RFC 2119 ni BDD scenarios — la convencion convive con ambos

### Complejidad estimada

**Media** — el cambio es markdown puro (sin codigo), pero toca el meta-sistema (afecta specs de todos los proyectos DKC). Riesgo de drift del LLM (callouts redundantes o muy largos) mitigado con guidelines explicitos en Paso 0c y validacion empirica en S2.

## Requirements (delta)

### REQ-IMPROVE-01: Template de spec incluye convencion del callout en seccion Requirements

> **Que cambia**: el archivo `templates/records/spec.md`, que sirve de referencia visual de como se escribe un spec, va a mostrar un ejemplo de REQ con callout `> **Que cambia** / **Por que**` y scenarios envueltos en `<details>`.
> **Por que**: sin el ejemplo en el template, el LLM no tiene referencia visual del shape esperado — la instruccion en el shared queda abstracta.

El sistema MUST documentar la convencion del callout en `templates/records/spec.md` con un ejemplo concreto de REQ que la aplique, en la seccion Requirements del template.

**Actor**: scribe (al producir spec) · architect (al leer template) · dev humano (al consultar template)
**Layers**: meta (deckard-core/templates)

<details><summary>Scenarios de validacion</summary>

#### Scenario: template muestra ejemplo de REQ con callout
- **GIVEN** un dev abre `templates/records/spec.md` para entender el shape esperado
- **WHEN** lee la seccion Requirements del template
- **THEN** ve un ejemplo de REQ que aplica el callout `> **Que cambia** / **Por que**`
- **AND** ve los scenarios envueltos en `<details><summary>Scenarios de validacion</summary>...</details>`

#### Scenario: template preserva ejemplo del shape clasico (RFC 2119)
- **GIVEN** el mismo template
- **WHEN** lee el ejemplo del REQ
- **THEN** el ejemplo conserva el enunciado RFC 2119 (`El sistema MUST...`) bajo el callout
- **AND** conserva Actor y Layers como campos estructurados

</details>

### REQ-IMPROVE-02: `_design-shared.md` define Paso 0c con guidelines anti-redundancia

> **Que cambia**: `prompts/steps/_design-shared.md`, que centraliza instrucciones para los 4 `design-{tipo}.md`, va a tener un Paso 0c (entre 0a y 0b) que pida al LLM redactar el callout por REQ con reglas anti-redundancia explicitas.
> **Por que**: la instruccion centralizada es la unica via para que los 4 design-* la hereden sin tocar 4 archivos. Sin guidelines anti-redundancia, el LLM duplica info de `Purpose` o del Executive summary.

El sistema MUST agregar el Paso 0c en `_design-shared.md` con:
- Definicion del callout (formato markdown blockquote: `> **Que cambia** / **Por que**`)
- Definicion de scenarios colapsables (`<details><summary>...`)
- Reglas anti-redundancia: callout NO duplica `Purpose` ni Executive summary
- Limite: max 2 lineas "Que cambia", max 1 linea "Por que"
- Escape: si el REQ es trivial, omitir el callout

**Actor**: LLM (al generar spec) · architect (al revisar instrucciones del LLM)
**Layers**: meta (deckard-core/prompts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Paso 0c definido y consultable
- **GIVEN** el dev abre `_design-shared.md`
- **WHEN** busca la seccion "Instrucciones compartidas"
- **THEN** encuentra Paso 0c entre Paso 0a y Paso 0b con la convencion del callout

#### Scenario: guidelines anti-redundancia presentes
- **GIVEN** el Paso 0c
- **WHEN** lee las guidelines
- **THEN** incluye al menos: (a) regla "NO duplicar Purpose ni Executive summary", (b) limite de lineas, (c) escape para REQs triviales

#### Scenario: ejemplo positivo y negativo
- **GIVEN** el Paso 0c
- **WHEN** lee
- **THEN** incluye al menos 1 ejemplo positivo (callout bien redactado) y 1 ejemplo negativo (callout que duplica purpose)

</details>

### REQ-IMPROVE-03: Los 4 `design-{tipo}.md` heredan la convencion via referencia (no se tocan)

> **Que cambia**: nada en los 4 archivos. La convencion se aplica automaticamente porque cada `design-{tipo}.md` ya invoca a `_design-shared.md` como step-fragment al inicio.
> **Por que**: si tocaramos los 4 archivos, hay riesgo de drift entre ellos. La herencia via referencia es el contrato actual del sistema.

El sistema MUST NO modificar `prompts/steps/design-feature.md`, `design-fix.md`, `design-improvement.md`, `design-refactor.md`. Estos archivos heredan automaticamente porque referencian `_design-shared.md` (verificado en intake-explore: grep retorno los 4).

**Actor**: LLM (al ejecutar cualquier design-*)
**Layers**: meta (deckard-core/prompts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: design-* siguen referenciando shared
- **GIVEN** branch con cambios S1 mergeados
- **WHEN** grep `_design-shared` en `design-{feature,fix,improvement,refactor}.md`
- **THEN** retorna los 4 archivos (igual que antes del cambio)

#### Scenario: LLM run con cualquier design-* produce callout
- **GIVEN** un ticket en open en cualquier proyecto post-S1
- **WHEN** se invoca `design-feature` (o `-fix`, `-improvement`, `-refactor`)
- **THEN** los REQs generados tienen callout aplicado segun Paso 0c

</details>

### REQ-PRESERVE-01: Specs cerrados pre-2026-05-13 siguen renderando sin error

> **Que cambia**: nada. Los specs ya cerrados se preservan tal cual estan.
> **Por que**: el cambio es aditivo — agregar un blockquote y wrapping en `<details>` NO rompe markdown existente. La migracion retroactiva no aporta valor proporcional al esfuerzo.

El sistema MUST preservar specs cerrados pre-implementacion sin cambios estructurales. Renderean en HC y en markdown raw igual que antes.

**Actor**: HC viewer · markdown-it parser · dev humano (al leer spec viejo)
**Layers**: frontend (HC) · meta (templates)

<details><summary>Scenarios de validacion</summary>

#### Scenario: spec pre-2026-05-13 renderea sin error
- **GIVEN** HC dev corriendo · branch con S1 mergeada · SPEC-viewer-mvp abierto (spec pre-cambio)
- **WHEN** se renderea
- **THEN** sin errores de parse · todas las secciones canonicas presentes (Purpose, Requirements, Tasks, Decisions, etc.)

#### Scenario: spec viejo en markdown raw es legible
- **GIVEN** un spec cerrado en `cat`
- **WHEN** se lee
- **THEN** estructura intacta · sin artifacts de la convencion nueva

</details>

### REQ-PRESERVE-02: RFC 2119 (MUST/SHOULD/MAY) preservado en cuerpo del REQ

> **Que cambia**: nada en como el LLM ejecutor lee los REQs. El callout es texto adicional encima; el contrato normativo sigue donde estaba.
> **Por que**: la precision normativa es lo que el LLM necesita para implementar sin ambiguedad. Romperla seria regresion.

El sistema MUST conservar el enunciado RFC 2119 en el cuerpo del REQ, debajo del callout y arriba de Actor/Layers/Scenarios.

**Actor**: LLM ejecutor (en execute) · LLM scribe (al producir spec)
**Layers**: meta (templates · prompts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: spec nuevo conserva RFC 2119
- **GIVEN** un spec generado post-S1 con la convencion aplicada
- **WHEN** se lee cualquier REQ
- **THEN** el cuerpo conserva un enunciado tipo "El sistema {MUST|SHOULD|MAY} {comportamiento}"

#### Scenario: callout no reemplaza al enunciado normativo
- **GIVEN** el mismo spec
- **WHEN** se compara callout vs enunciado RFC 2119
- **THEN** son texto distinto · el callout es lenguaje del dev consumidor · el enunciado es normativo

</details>

### REQ-IMPROVE-04: Convencion documentada como candidata a DET-24 (decision empirica)

> **Que cambia**: si la validacion en S2 muestra que el LLM produce callouts consistentes y sin redundancia, se promueve la convencion a DET-24 (REQ-format-human) en `prompts/deterministic-rules.md` y se exporta a `~/.claude/CLAUDE.md` via `dkc-export-rules --global`.
> **Por que**: las DETs son el contrato global del sistema. Promover sin validar empirico es ceremonia; promover tras evidencia es persistencia justificada.

El sistema MAY promover la convencion a DET-24 condicional a aceptacion del dev en el gate de S2 (validacion empirica). Si el dev rechaza la promocion (mantener como guideline sin DET formal), el ticket cierra en S2.

**Actor**: scribe (al editar deterministic-rules.md) · dev humano (al decidir en gate S2)
**Layers**: meta (deckard-core/prompts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: validacion S2 positiva → promocion a DET-24
- **GIVEN** S2 ejecutada · LLM run con design-* produjo callouts consistentes · dev aprueba
- **WHEN** S3 ejecuta
- **THEN** `prompts/deterministic-rules.md` contiene DET-24 con criterio canonico (header, aplicacion temporal, verification)
- **AND** `~/.claude/CLAUDE.md` contiene DET-24 tras `dkc-export-rules --global`

#### Scenario: validacion S2 negativa → S3 saltada
- **GIVEN** S2 ejecutada · dev no aprueba promocion (formato no convence o LLM varia mucho)
- **WHEN** se decide cierre
- **THEN** S3 NO se ejecuta · el ticket cierra en S2 con convencion en template+shared sin DET formal · decision documentada en backlog del ticket

</details>

## Changes

### Modified: `templates/records/spec.md` (seccion Requirements del template)

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| Ejemplo de REQ | Solo enunciado `MUST` + Actor/Layers + scenarios planos | Callout `> **Que cambia** / **Por que**` arriba + `MUST` + Actor/Layers + scenarios envueltos en `<details>` | Mostrar al LLM y al dev el shape esperado de los REQs nuevos |
| Documentacion de la convencion | No existe en el template | Linea introductoria que explica el patron antes del ejemplo | Auto-documentacion del template — no requiere consultar otros archivos |

### Modified: `prompts/steps/_design-shared.md` (Instrucciones compartidas)

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| Pasos antes de delta especifico | 0a (Executive summary) + 0b (Leer draft) | 0a + **0c (Redactar callout por REQ)** + 0b | Centralizar la instruccion para que los 4 design-* hereden sin drift |
| Reglas anti-redundancia | No existen formales | Lista explicita en Paso 0c (no duplicar Purpose ni ES; limites de lineas; escape para REQs triviales) | Prevenir drift del LLM hacia callouts largos o redundantes |

### Added (condicional, en S3): `prompts/deterministic-rules.md` — DET-24

| Field | Value | Purpose |
|---|---|---|
| ID | DET-24 | Identificador canonico de la regla |
| Nombre | REQ format human (callout obligatorio en specs futuros) | Descripcion corta |
| Criterio | Cada REQ en spec generado por DKC debe incluir callout + scenarios colapsables segun `_design-shared.md` Paso 0c | Contrato verificable |
| Aplicacion temporal | A partir de la fecha de aceptacion en S2; no retroactivo | Igual criterio que DET-21/DET-22 |
| Verification | Grep en specs nuevos post-fecha: `grep -c "Que cambia" SPEC-*.md` ≥1 por REQ presente | Verificable mecanicamente |

## Tasks

### Session 1 — Implementar convencion en template + shared `[tipo: auto] [tier: T1]`

Objetivo: agregar la convencion del callout al template y al shared, sin tocar los 4 design-*.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Editar `templates/records/spec.md`: agregar callout + `<details>` al ejemplo de REQ en seccion Requirements del template; agregar linea introductoria explicando el patron | REQ-IMPROVE-01 | developer | — | `templates/records/spec.md` | Diff revisado · ejemplo legible · markdown valido (lint manual) | `git revert` | DET-2, DET-11, DET-16 | done | 1 |
| S1.T2 | Editar `prompts/steps/_design-shared.md`: agregar Paso 0c entre 0a y 0b con definicion del callout, definicion de `<details>`, reglas anti-redundancia (3 reglas), ejemplo positivo + negativo | REQ-IMPROVE-02 | developer | S1.T1 | `prompts/steps/_design-shared.md` | Diff revisado · Paso 0c coherente con estructura existente (mismo nivel narrativo que 0a) · sin contradiccion con 0a o secciones siguientes | `git revert` | DET-2, DET-16 | done | 1 |
| S1.T3 | Validar que los 4 `design-{feature,fix,improvement,refactor}.md` siguen referenciando `_design-shared.md` sin cambios (no requiere edit, solo grep) | REQ-IMPROVE-03 | reviewer | S1.T2 | (none) | `grep -l _design-shared design-{feature,fix,improvement,refactor}.md` retorna los 4 archivos | (no aplica — task de verificacion) | DET-5, DET-11 | done | 1 |
| S1.T4 | Smoke test manual: abrir un spec existente (ej. SPEC-viewer-mvp) en HC y verificar que sigue renderando sin error post-cambios en template | REQ-PRESERVE-01 | reviewer | S1.T3 | (none) | Spec renderea completo · todas las secciones canonicas presentes · sin warnings en consola del browser | (no aplica) | DET-7, DET-13 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (validation tier: T1 + Quality review DET-23 light) | — | reviewer | S1.T4 | (none) | T1: lint markdown OK; manual review del diff. DET-23 light: dimensiones 1 (calidad), 6 (mantenibilidad), 7 (claridad) marcadas pass. Decision: `continue` a S2 | (no aplica) | DET-7, DET-13, DET-20, DET-23 | done | 1 |

### Session 2 — Validacion empirica con LLM run `[tipo: ⚑ fuerte] [tier: T2]`

Objetivo: generar un spec nuevo con la convencion aplicada y validar empiricamente que el LLM produce callouts consistentes sin redundancia.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Seleccionar ticket en open para POC (ej. HOR-018 viewer-spec-readability, o cualquier ticket en intake). Invocar `design-improvement` (o el design-* correspondiente al work_type) con `_design-shared.md` actualizado | REQ-IMPROVE-03, REQ-IMPROVE-04 | developer | S1.GATE | (none — produce spec nuevo) | LLM run completa sin error; spec generado en `projects/{p}/specs/` | (no aplica — produce artifact nuevo) | DET-1, DET-2, DET-11 | done | 2 |
| S2.T2 | Revisar REQs del spec generado en S2.T1: verificar (a) callout presente en cada REQ, (b) callout corto (≤3 lineas total), (c) no duplica `## Purpose` ni Executive summary, (d) RFC 2119 conservado en cuerpo, (e) scenarios envueltos en `<details>` | REQ-IMPROVE-02, REQ-PRESERVE-02 | reviewer | S2.T1 | (none) | Checklist de 5 criterios marcado por reviewer · al menos 4/5 deben pasar para `continue` | (no aplica) | DET-5, DET-7, DET-13 | done | 2 |
| S2.T3 | Smoke test visual del spec generado en HC: callout renderea con buena jerarquia (blockquote distinto del texto plano); `<details>` colapsa/expande correctamente; navegacion no se rompe | REQ-IMPROVE-01, REQ-PRESERVE-01 | reviewer | S2.T2 | (none) | HC renderea sin error · callout visible · `<details>` funcional | (no aplica) | DET-13 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (validation tier: T2 + Quality review DET-23 standard) | — | reviewer | S2.T3 | (none) | T2: tests pass (si aplica), coverage no degrada. DET-23 standard: dimensiones 1, 2, 6, 7, 10 marcadas. **⚑ fuerte**: dev decide formalmente: (a) `continue` a S3 (promover a DET-24), (b) `iterate` (Paso 0c necesita guidelines mas estrictos), (c) `standby` (cerrar ticket sin DET-24, convencion queda como guideline) | (no aplica) | DET-13, DET-14, DET-20, DET-23 | done | 2 |

### Session 3 — Promover a DET-24 `[tipo: auto] [tier: T0]` (condicional)

Objetivo: agregar DET-24 al deterministic rules y exportar a global. **Solo se ejecuta si S2.GATE decision = `continue`**.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Editar `prompts/deterministic-rules.md`: agregar DET-24 (REQ format human) con header canonico, criterio, aplicacion temporal (no retroactivo, fecha = S2.GATE close), verification (grep en specs nuevos) | REQ-IMPROVE-04 | developer | S2.GATE (con decision=continue) | `prompts/deterministic-rules.md` | DET-24 estructura coherente con DET-20/21/22 (precedente) | `git revert` | DET-2, DET-16 | done | 3 |
| S3.T2 | Regenerar global rules: ejecutar `./commands/dkc-export-rules --global`. Verificar que DET-24 aparece en `~/.claude/CLAUDE.md` | REQ-IMPROVE-04 | developer | S3.T1 | `~/.claude/CLAUDE.md` (auto-generado) | DET-24 visible en CLAUDE.md global | Re-ejecutar `dkc-export-rules` con commit anterior | DET-16 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (validation tier: T0 + Quality review DET-23 light) | — | reviewer | S3.T2 | (none) | T0: lint frontmatter pass · cross-references OK. DET-23 light: dimensiones 7 (claridad) y 10 (sin error handling complejo). Decision: `continue` a close | (no aplica) | DET-13, DET-20, DET-23 | done | 3 |

## Constraints

- **DET-1** (certeza): items implementables son `confirmed`/`inferred`/`assumed`/`blocked`. H4 (DET-24) clasificada como `inferred` con plan empirico en S2 — gate ⚑ fuerte de S2 cierra la decision
- **DET-7** (regression obligatoria): REQ-PRESERVE-01 y REQ-PRESERVE-02 cubren specs viejos y RFC 2119 conservado
- **DET-13** (cierre con evidencia): cada gate ejecuta validacion real (markdown lint, smoke test, LLM run)
- **DET-16** (propagacion): cambio en templates afecta specs futuros de TODOS los proyectos DKC — verificado en intake. Sin acciones adicionales requeridas
- **DET-18** (draft aprobado): excepcion documentada en ticket — skip con justificacion (POC visual vive en code-walkthrough del teach-intake)
- **DET-20** (sessions con gate): 3 sessions con S{N}.GATE como ultima task de cada una
- **DET-23** (quality review): cada gate incluye sub-bloque Quality review con tier acorde a la session
- **RULE-server-frontmatter-legacy-001**: cambios en template del body no afectan frontmatter — backwards compatible

## Dependencies

| Dependency | Type | Description | Risk |
|---|---|---|---|
| `prompts/steps/_design-shared.md` existente | internal | El step-fragment ya esta declarado como `referenced_by` los 4 design-*. Sin esto, el cambio no se hereda | Verificado en intake-explore (multi-capa) — sin riesgo |
| `commands/dkc-export-rules` operativo | internal | Necesario en S3.T2 para promover DET-24 a global | Si falla, S3 se reintenta o se cierra sin promocion |
| HC corriendo en dev | internal | Necesario para smoke tests visuales en S1.T4 y S2.T3 | No bloqueante — markdown raw tambien verifica |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| LLM produce callouts redundantes con `Purpose`/`Executive summary` | Medium | Medium (UX desmejora vs status quo) | Paso 0c incluye reglas anti-redundancia + ejemplo negativo. Spot-check en S2. Si emerge, iterar Paso 0c antes de DET-24 |
| Callout crece a mini-ensayo (>3 lineas) | Medium | Low (estetico) | Limite explicito en Paso 0c (max 2 lineas "Que cambia", max 1 "Por que"). Spot-check en S2 |
| HC render visual del callout no convence | Low | Low (markdown raw sigue legible) | `<details>` y blockquote son markdown estandar. HOR-018 paralelo mejora el render general de SpecDetail |
| Dev rechaza DET-24 en S2 → ticket cierra parcial | Low | Low (convencion sigue en template+shared aunque sin DET formal) | Caso documentado como valido en REQ-IMPROVE-04 scenario 2 |
| Inconsistencia con `Paso 0a` (Executive summary AMIGABLE) | Low | Medium (drift filosofico del shared) | Paso 0c se redacta como extension explicita del Paso 0a, no como concepto ortogonal |

## Open questions

Sin gaps `blocked` ni `assumed` al cierre del design. Las 2 active questions del intake (Q1 DET-24 si o no; Q2 ubicacion Paso 0c vs seccion separada) se resuelven asi:

- **Q1 (DET-24)** → diferida a S2.GATE como decision empirica (REQ-IMPROVE-04)
- **Q2 (ubicacion)** → resuelta en este spec: **Paso 0c entre 0a y 0b**. Justificacion: hereda principio del Paso 0a (lenguaje conversacional) sin separarse en seccion ortogonal. Si la implementacion en S1.T2 muestra que no encaja bien, se itera

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Ubicacion de la convencion en `_design-shared.md` como Paso 0c

- **Contexto**: la convencion debe vivir en algun lugar de `_design-shared.md` para que los 4 design-* la hereden. Habia dos opciones identificadas en intake (Paso 0c entre 0a y 0b vs seccion nueva "Redaccion de REQs")
- **Drivers**: legibilidad del shared mismo (debe seguir siendo navegable de un vistazo); herencia del Paso 0a (mismo principio de lenguaje conversacional para approval); ubicacion logica en la secuencia de redaccion
- **Opcion elegida**: Paso 0c entre 0a y 0b
- **Alternativas**: seccion nueva "Redaccion de REQs" despues de `## Secciones compartidas del spec` — descartada porque se separaria del Paso 0a y crearia drift filosofico
- **Consecuencias**: el shared se lee como secuencia 0a → 0c → 0b → delta especifico. El callout queda visualmente conectado al Executive summary. Si en S1.T2 la ubicacion no encaja por longitud, se itera (Paso 0c puede crecer y romper el flow)
- **Session**: design-improvement (2026-05-13)

### DEC-LOCAL-02: Aplicar convencion al spec de este mismo ticket (dogfood)

- **Contexto**: el spec describe el cambio pero podria aplicarlo o no a si mismo
- **Drivers**: validacion en vivo del formato (S2 valida con un spec NUEVO post-cambio; este es POC retroactivo); evitar producir un spec adicional solo para POC; ofrecer evidencia visual inmediata al dev
- **Opcion elegida**: aplicar callout a TODOS los REQs de este spec (REQ-IMPROVE-01 a REQ-PRESERVE-02)
- **Alternativas**: dejar este spec con formato actual y producir el POC en S2 con un spec separado — descartada porque el dev no podria evaluar el formato en intake/design
- **Consecuencias**: si el formato no convence al user, hay que reescribir REQs de este spec. Mitigacion: dogfooding lo hace ANTES de S1 (ticket aun abierto), riesgo controlado
- **Session**: design-improvement (2026-05-13)

### DEC-LOCAL-03: Skip design-draft (DET-18 excepcion)

- Documentada en el ticket markdown como decision local. Resumen: el cambio es markdown puro sin UI nueva; el POC visual ya vive en `dkc:code-walkthrough` del teach-intake; validacion visual real en S2

## Acceptance checkpoints

- [x] **Funcional**: REQs nuevos generados post-S1 incluyen callout segun convencion (6/6 en spec dogfooded); specs viejos siguen renderando sin error (SPEC-viewer-mvp intacto)
- [x] **Tests**: smoke tests S1.T4 (grep retroactividad) y S2.T3 (autovalidacion 5/5 criterios) ejecutados con logs textuales
- [x] **NFRs**: no aplica (mejora de legibilidad, no de performance)
- [x] **Rules**: DET-7 (regression), DET-13 (evidencia), DET-16 (propagacion) cumplidas. DET-24 promovida (24 DETs en CLAUDE.md global)
- [x] **Integration**: 4 design-{tipo}.md siguen heredando shared sin cambios (S1.T3 grep retorna 4/4)
- [x] **Docs**: convencion documentada en template (REQ-01 ejemplo) + shared (Paso 0c con anti-redundancia) + deterministic-rules (DET-24) + CLAUDE.md global
- [x] **Quality review (DET-23)** completado en S1.GATE (light), S2.GATE (standard), S3.GATE (light) — todos pass

## Archiving

Cuando este spec deje de ser fuente de verdad: `/dkc-archive-spec SPEC-deckard-core-req-format-human-callout "{razon}"`. NO borrar manualmente — el archivado preserva referencias a DET-24 (si se promovio) y decisiones locales.
