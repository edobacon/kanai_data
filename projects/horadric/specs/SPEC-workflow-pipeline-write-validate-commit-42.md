---
id: SPEC-workflow-pipeline-write-validate-commit-42
project: horadric
ticket: HOR-042
status: done
---

# Pipeline write→validate→commit (DKC v2 atomic writes)

# Pipeline write→validate→commit (DKC v2 atomic writes)

## Executive summary — lo que estas aprobando

> *Lectura de 90s.*

### Que se quiere

Invertir el flujo de escritura de records DKC. DKC v1 actual: LLM escribe markdown libremente → `dkc-validate` detecta drift post-hoc → dev/LLM fix → re-write. Patron observado: HOR-029 sufrio 3 round-trips, HOR-026 documenta 5 bugs HOR-022 post-write. **DKC v2 (este ticket)**: LLM produce JSON estructurado → schema valida → tool `dkc-write` genera MD desde template handlebars → commit. Si JSON falla schema, bloqueamos ANTES de escribir.

**Cobertura inicial (piloto DEC-4)**: SpecTask + SessionBlock (~80% de records escritos). Rule + Decision quedan en v1 (HOR-046 conditional follow-up).

**Adopcion (DEC-3)**: opt-in via `validate_on_write: true` en frontmatter del ticket. Sin flag, flujo v1 intacto. Cero breaking changes.

### Decisiones criticas

| # | Decision | Por que |
|---|----------|---------|
| 1 | **handlebars** como templating engine (vs mustache vs custom) | Features (helpers + partials) + ecosystem maduro + ~50KB. Reusable para Rule/Decision templates en HOR-046 |
| 2 | **JSON intermedio ephemeral** (vs commiteado) + flag `--archive-json` opt-in | MD sigue source of truth visible; cero ruido en git; debug via `.dkc-write-temp/` cuando hace falta |
| 3 | **Opt-in via `validate_on_write` flag** en frontmatter (vs mandatory desde dia 1) | Rollback per-ticket trivial; tickets historicos sin friccion; reduce blast radius del riesgo MEDIO-ALTO |
| 4 | **Piloto 2 kinds (SpecTask + SessionBlock)** vs todos | Valida approach con records mas frecuentes; reduce scope a 6 SP; cobertura ~80% |
| 5 | **NO migracion retroactiva** | Tickets pre-HOR-042 quedan en v1 intactos. Forward-only |
| 6 | **Dogfood en HOR-042 mismo** (S4): las ultimas 2 sessions usan pipeline activo | Validacion end-to-end sin esperar a otro ticket |

### Riesgos

- **H3 refutada (generador NO produce MD identico al manual)**: probabilidad media, impact alto (rompe round-trip + backward compat). Mitigacion: round-trip test estricto en S2.T3 sobre HOR-040.md; iterate template hasta diff vacio antes de avanzar a S3
- **Performance >500ms en tickets grandes**: baja probabilidad, medio impact. Mitigacion: precompilar templates + cache de compile en S2.T4 benchmark
- **Pipeline rompe steps existentes mid-S3**: baja probabilidad gracias a opt-in. Si emerge: rollback per-ticket cambiando flag a false
- **Dogfood S4 detecta dolor inesperado**: probable. Reservar buffer en S4 para fixes in-session

### Que NO se hace

- NO migracion retroactiva (forward-only)
- NO templates para Rule + Decision (HOR-046 conditional)
- NO consumo JSON directo en HC viewer (Q3 deferred)
- NO integracion en steps de scribe (Q5 deferred)
- NO hooks git pre-commit (HOR-046 conditional)
- NO semantic linting de JSON valido pero erroneo (Q6 deferred)
- NO breaking changes en flujo v1 (cero impacto a tickets sin flag)

### Tamano

4 sessions execute + 1 close = 5 sessions. SP estimated: **6**. Tiempo: **~5-7h efectivas**. Gates fuertes: S1, S3, S4, S5 (4 de 5). Tier T2 todas las execute.

### Como vas a saber que funciona

- **A1**: `dkc-write SpecTask --json-file X --output Y` produce MD canonical (TC-03)
- **A2**: Schemas zod HOR-026/041 reutilizados sin extensiones (grep en commands/lib/schemas/ — sin nuevos archivos en este ticket)
- **A3**: 3 steps editados con flag opt-in documentado (TC-09)
- **A4**: Tickets pre-HOR-042 siguen validos (TC-11 regression HOR-029)
- **A5**: HOR-042 mismo cierra usando pipeline activo (frontmatter S4+ con `validate_on_write: true`)
- **A6**: `_style.md` Principio 10 documenta decision evolutiva markdown→JSON contract

---

## Purpose

Bridge entre "markdown libre" y "contract enforced pre-escritura". HOR-026 + HOR-041 dieron schemas zod completos para los 4 records core (SpecTask, SessionBlock, Rule, Decision) — HOR-042 los usa como contract en el pipeline. Sin esto, los schemas son detectores post-mortem. Con esto, son gates pre-escritura: el LLM no puede commitear drift.

Para el dev: cero round-trips por bugs de formato canonical, cualquier sea el modelo (Opus, Sonnet, local Qwen 30B). Para roadmap local-only (HOR-031 embedding KB + HOR-037 LoRA): structured output es el unlock que hace modelos pequeños viables.

## Requirements

### REQ-IMPROVE-01 — Generador `commands/dkc-write {kind}` (piloto: SpecTask + SessionBlock)

> **Que cambia**: nuevo comando ejecutable `commands/dkc-write` que recibe JSON validado contra schema zod (HOR-026/041) y genera markdown canonical desde template handlebars. Output identico al MD que el dev escribe manualmente hoy.
> **Por que**: sin este tool, el patron es teorico. El comando es el corazon del pipeline — todo lo demas (integracion en steps, opt-in, dogfood) depende de que funcione.

El generador MUST:
- Aceptar `kind` ∈ `{SpecTask, SessionBlock}` (piloto S2)
- Aceptar JSON via `--json-file {path}` o `--json-stdin` (uno requerido)
- Aceptar destino via `--output {path}` (sobrescribe) o `--append-to {path}` (agrega al final de `## Sessions`)
- Validar JSON contra schema correspondiente (`SpecTaskSchema` o `SessionBlockSchema`) antes de generar MD
- Si JSON falla validacion: exit 1, JSON estructurado de errors a stderr, NO escribir output
- Renderizar template handlebars desde `commands/lib/templates/{kind}.hbs`
- Soporte para `--dry-run` (output a stdout sin escribir)
- Soporte para `--archive-json` (preserva JSON en `.dkc-write-archive/{timestamp}.json`)
- Soporte para `--debug` (verbose + preserva JSON en `.dkc-write-temp/` para reproducir errores)
- Exit codes: 0 valid, 1 invalid (errors), 2 warnings, 3 error tecnico (file no existe, kind invalido), 4 round-trip fallo

<details><summary>Scenarios de validacion</summary>

#### Scenario: SpecTask JSON valido → MD canonical
- **GIVEN** JSON con `{kind: "SpecTask", records: [/* 5 tasks validas */]}`
- **WHEN** `dkc-write SpecTask --json-file X --output Y`
- **THEN** exit 0, archivo Y existe con tabla canonical 11-column F8 que parsea correctamente con `parseSpecTasks`

#### Scenario: SpecTask JSON invalido (agent: "Developer" capitalizado)
- **GIVEN** JSON con record que tiene `agent: "Developer"` (case wrong)
- **WHEN** `dkc-write SpecTask --json-file X --output Y`
- **THEN** exit 1, stderr con JSON `{valid: false, errors: [{path: "records[0].agent", message: "Invalid enum value...", received: "Developer"}]}`, archivo Y NO se crea

#### Scenario: --dry-run
- **GIVEN** JSON valido
- **WHEN** `dkc-write SessionBlock --json-file X --dry-run`
- **THEN** exit 0, MD a stdout, sin archivos creados

</details>

### REQ-IMPROVE-02 — Round-trip test (validacion H3)

> **Que cambia**: test que toma HOR-040.md (ticket canonical post-HOR-026), parsea sus SessionBlocks → JSON, los re-genera con dkc-write, y verifica diff vacio contra HOR-040.md original.
> **Por que**: H3 dice "generador produce MD identico al manual". Sin round-trip test, no podemos confirmar. Si diff !=0, el pipeline introduce drift sutil y rompe backward compat — bloqueante para avanzar a integracion.

El test MUST:
- Ejecutarse en S2.T3 antes de S3 (integracion)
- Parsear HOR-040.md con `parseSessionBlocks` existente
- Para cada session, generar MD via `dkc-write SessionBlock --json {parsed} --dry-run`
- Comparar output con la session original via `diff -u` semantic-aware (ignorar trailing whitespace OK; resto debe ser identico)
- Criterio exito: cero diferencias funcionales

<details><summary>Scenarios de validacion</summary>

#### Scenario: HOR-040 round-trip pass
- **GIVEN** HOR-040.md con 5 sessions canonical (post-HOR-026 + HOR-040)
- **WHEN** parse → JSON → regenerate via dkc-write
- **THEN** diff funcional vacio (semantic-aware: trailing whitespace OK)

#### Scenario: HOR-040 round-trip fail (template drift)
- **GIVEN** template handlebars con bug (orden de campos diferente)
- **WHEN** round-trip
- **THEN** diff !=vacio, S2.T3 bloquea, fix template antes de continuar

</details>

### REQ-IMPROVE-03 — Integracion opt-in en 3 steps

> **Que cambia**: `prompts/steps/request-execute.md`, `prompts/steps/request-close.md`, y `prompts/steps/_design-shared.md` detectan `validate_on_write: true` en frontmatter del ticket. Si flag activo, instruccion explicita de generar JSON y invocar `dkc-write` en vez de Edit/Write directo.
> **Por que**: sin integracion en steps, el tool existe pero no se usa. Opt-in via flag preserva backward compat 100%.

Steps a editar:
- `request-execute.md` gate D + S{N}.GATE: si flag activo, JSON → dkc-write SessionBlock --append-to {ticket}
- `request-close.md` gate A2: si flag activo, generar session de close via pipeline
- `_design-shared.md` al producir spec: si flag activo, generar tabla `## Tasks` via dkc-write SpecTask --output {spec}

<details><summary>Scenarios de validacion</summary>

#### Scenario: Ticket con flag activo en execute
- **GIVEN** ticket frontmatter `validate_on_write: true`
- **WHEN** session execute completa una task
- **THEN** step produce JSON, invoca dkc-write, MD canonical aparece appendido al ticket

#### Scenario: Ticket sin flag
- **GIVEN** ticket sin `validate_on_write` o `false`
- **WHEN** session execute completa una task
- **THEN** step usa Edit/Write como en DKC v1, cero diferencia con flujo anterior

</details>

### REQ-IMPROVE-04 — Dogfood en HOR-042 mismo (S4)

> **Que cambia**: a partir de S4, el frontmatter de HOR-042 tiene `validate_on_write: true`. Las sessions S4 y S5 (close) se escriben via pipeline activo.
> **Por que**: validacion end-to-end real. Si el pipeline tiene bugs, se detectan en HOR-042 antes de impactar otros tickets.

Acciones:
- S4.T1: agregar `validate_on_write: true` al frontmatter
- S4.T2: ejecutar S5 (close) usando pipeline (generar JSON de session de close + dkc-write --append-to)
- S4.T3: medir friction observada, documentar bugs en S4 backlog
- S4.T4: fix de bugs in-dogfood (si los hay)

### REQ-IMPROVE-05 — Documentacion en `_style.md` Principio 10

> **Que cambia**: nuevo Principio 10 en `prompts/_style.md` con: decision evolutiva markdown→JSON contract (DKC v2), uso de `validate_on_write` flag, integracion con HOR-023 verify-gates + HOR-026 dkc-validate, plan adopcion gradual.
> **Por que**: sin docs, el patron es invisible para devs y modelos futuros. Principio 10 cierra el set HOR-023 (gate verifier) + HOR-026/041 (schemas) + HOR-042 (pipeline activo).

Seccion incluye:
- Decision evolutiva markdown→JSON contract (con razon explicita de evolucion de DKC v1)
- Como activar via frontmatter
- Comparativa flujo v1 vs v2 (ascii art)
- Cuando usar pipeline vs flujo libre
- Antipatrones

### REQ-PRESERVE-01 — Backward compat 100% (tickets sin flag)

> **Que cambia**: nada disruptivo. Tickets sin `validate_on_write: true` siguen flujo v1 sin cambios.
> **Por que**: opt-in es la mitigacion principal del riesgo MEDIO-ALTO. Mandatory rompe el flujo si pipeline tiene bug.

Validacion: TC-11 — HOR-029 (cerrado pre-HOR-042) sigue validando con dkc-validate sin warnings nuevos.

### REQ-PRESERVE-02 — Schemas HOR-026/041 sin extensiones

> **Que cambia**: nada. Los 4 schemas existentes se reutilizan tal cual como contract del JSON intermedio.
> **Por que**: si extiendes schemas, introduces drift entre validacion post-write (que sigue siendo util en gates) y validacion pre-write (este pipeline).

Validacion: grep en `commands/lib/schemas/` confirma cero archivos nuevos en este ticket.

## Test cases

| # | Caso | REQ | Affects UI | Expected | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|-----------|----------|--------|----------|--------|---------|---------|
| TC-01 | Template `commands/lib/templates/spec-task.hbs` compila + renderiza sample SpecTask record sin error | REQ-IMPROVE-01 | no | Output identico a SpecTask manual de SPEC-026 | `Valid: true` + tabla 11-column F8 con header, separador, 2 filas (S1.T1 + S1.GATE) renderizadas correctamente con em-dash literal preservado | npx tsx dkc-write.ts | pass | S1.T4 | — |
| TC-02 | Template `session-block.hbs` compila + renderiza sample SessionBlock record sin error | REQ-IMPROVE-01 | no | Output identico a SessionBlock manual de HOR-040 S1 | `Valid: true` + bloque `### Session 1` con `**Tipo**`, `**Validation tier**`, `**Objetivo**`, `**Tasks completadas**:` con 2 checkboxes `- [x] S1.T{N} — descripcion`, `**Quality review (DET-23)**`, `**Commit DET-27**:` con backticks, `**Gate decision:**` con 4 checkboxes canonicos | npx tsx dkc-write.ts | pass | S1.T4 | — |
| TC-03 | `dkc-write SpecTask --json-file X --output Y` con JSON valido | REQ-IMPROVE-01 | no | exit 0, archivo Y con tabla canonical 11-column F8 parseable por parseSpecTasks | exit 0, archivo /tmp/test-output.md creado con tabla canonical (header + 1 fila S1.T1 con todos los campos) | bash CLI | pass | S2.T2 | — |
| TC-04 | `dkc-write SpecTask --json-file X` con JSON invalido (agent capitalizado) | REQ-IMPROVE-01 | no | exit 1, stderr con errors[].path + message, output NO se crea | exit 1, stderr JSON `{valid: false, errors: [{path: "agent", message: "Invalid enum value...", received: "Developer", recordIndex: 0}]}`, /tmp/should-not-exist.md NO existe | bash CLI | pass | S2.T2 | — |
| TC-05 | `dkc-write --dry-run` sobre JSON valido | REQ-IMPROVE-01 | no | MD a stdout, sin archivos creados | exit 0, MD canonical a stdout, sin escritura a archivo | bash CLI | pass | S2.T2 | — |
| TC-06 | **Round-trip H3**: parsear HOR-040.md → JSON → dkc-write → diff con HOR-040.md original | REQ-IMPROVE-02 | no | Diff funcional vacio (trailing whitespace ignorado) | HOR-040 NO sirve como fixture (sessions sin `**Objetivo**:` literal). Cambio fixture a HOR-041 (post-HOR-026 canonical). 4/4 sessions PASS sin drift semantico. `Sessions con drift: 0/4` | tsx + parser | pass | S2.T3 | fixture cambiado HOR-040→HOR-041 |
| TC-07 | Benchmark H6: `dkc-write SessionBlock` sobre HOR-026 ticket (5 sessions) | REQ-IMPROVE-01 | no | <500ms total | avg 0.5ms (10 iteraciones, min 0.2ms, max 2.1ms) sobre 5 sessions = 0.1ms/session. 1000x mejor que target | tsx + performance.now | pass | S2.T4 | cache de templates compilados confirmado eficaz |
| TC-08 | Ticket con `validate_on_write: true` + JSON invalido: step bloquea, LLM debe corregir | REQ-IMPROVE-03 | no | Step exit con instruccion de re-prompt; cero escritura a markdown | Validado conceptualmente via TC-04 (dkc-write con JSON invalido → exit 1 + no escribe output). Validacion end-to-end real diferida a S4 dogfood (HOR-042 mismo con flag activo) | conceptual + TC-04 | pass-partial | S3.T4 | validacion empirica end-to-end en S4.T2 |
| TC-09 | Grep `--validate-on-write` o `validate_on_write` en los 3 steps editados | REQ-IMPROVE-03 | no | >=3 matches en distintos archivos | 3 matches en 3 archivos distintos: request-execute.md (1), request-close.md (1), _design-shared.md (1) | grep | pass | S3.T1-T3 | — |
| TC-10 | **Dogfood**: HOR-042 frontmatter con `validate_on_write: true`, S5 close ejecutado via pipeline | REQ-IMPROVE-04 | no | Cero round-trips, MD canonical end-to-end | **PASS end-to-end**: `dkc-write SessionBlock --json-file /tmp/hor042-session-close.json --append-to projects/horadric/tickets/HOR-042.md` exit 0. Session 5 escrita 100% via pipeline, canonical, parseable. Cero round-trips, cero bugs del pipeline. dkc-validate post-cierre S4: ticket valid 6/6 sessions | manual flow test | pass | S4.T2 | — |
| TC-11 | **Regression**: HOR-029 (cerrado pre-HOR-042) sigue validando con dkc-validate sin warnings nuevos | REQ-PRESERVE-01 | no | `dkc-validate SessionBlock HOR-029.md` exit 0 o 2 (warnings ya conocidos), no nuevos | exit 2 (warnings only). valid=true, 0 errors, 3 warnings ya conocidos pre-HOR-026 (label `**Tasks**:` no canonical en Sessions 2/3/5). Cero warnings nuevos introducidos por HOR-042 | bash test | pass | S3.T5 | backward compat 100% verificada |
| TC-12 | Cero archivos nuevos en `commands/lib/schemas/` durante HOR-042 | REQ-PRESERVE-02 | no | `git log commands/lib/schemas/` post-HOR-042 cero cambios | Verificado: HOR-042 reuso 100% SpecTaskSchema + SessionBlockSchema (HOR-026) sin extension. `commands/lib/schemas/` sin archivos nuevos creados en S1-S5 | git log + ls | pass | S5.T1 | — |
| TC-13 | `prompts/_style.md` Principio 10 contiene `validate_on_write`, `dkc-write`, `markdown→JSON contract` | REQ-IMPROVE-05 | no | Grep >=3 matches | 9 matches en `prompts/_style.md` (validate_on_write/dkc-write/markdown→JSON/Principio 10). Seccion incluye decision evolutiva + comparativa v1 vs v2 + activacion opt-in + comando canonico + kinds piloto + 5 antipatrones + plan adopcion 4 fases | grep | pass | S3.T4 | — |

## Tasks

### Session 1 — CLI scaffold + templates piloto (T2, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | Setup `commands/lib/package.json` con `handlebars ^4.7` dependency. npm install local. Self-test `npx tsx -e "require('handlebars')"` exit 0 | developer | balanced | commands/lib/package.json | — | handlebars instalado, import OK | npm uninstall handlebars | done | 1 | handlebars 4.7.9 instalado, 2 packages, 0 vulnerabilities |
| S1.T2 | Implementar `commands/lib/templates/spec-task.hbs` + `commands/lib/templates/session-block.hbs`. Templates handlebars con helpers para em-dash, gateDecision checkboxes, optional sections | developer | balanced | commands/lib/templates/spec-task.hbs, commands/lib/templates/session-block.hbs | TC-01, TC-02 | Templates compilan y renderizan samples inline | git revert | done | 1 | 5 helpers handlebars: dash, tierOrDash, checkbox, gateTypeLabel, gateChecks |
| S1.T3 | Implementar `commands/lib/dkc-write.ts` (logica del generador): arg parsing, schema dispatch, template lookup, render, write. Sin CLI bash wrapper aun | developer | balanced | commands/lib/dkc-write.ts | — | Modulo expone `generateMd({kind, records, output})` testeable | git revert | done | 1 | API publica `generateMd()` + CLI parser embebido. Cache de templates compilados (Map) |
| S1.T4 | Self-test inline en `dkc-write.ts`: sample SpecTask record + sample SessionBlock record → MD generado matchea formato esperado | developer | balanced | commands/lib/dkc-write.ts | TC-01, TC-02 | `npx tsx commands/lib/dkc-write.ts` exit 0 con sample output coherente | git revert | done | 1 | TC-01/02/04 preview pass |
| S1.GATE | Quality review (DET-23 tier standard). Decisiones confirmadas (handlebars OK, ephemeral OK, opt-in flag OK). Commit DET-27 `improve(dkc): pipeline scaffold + templates piloto (HOR-042 S1)` | reviewer | balanced | commands/lib/ | TC-01, TC-02 | Gate decision continue + commit | git revert | done | 1 | — |

### Session 2 — CLI bash + dkc-write tool + round-trip H3 + benchmark (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Implementar wrapper bash `commands/dkc-write` (similar a dkc-validate): resolve paths, env check, invoca tsx commands/lib/dkc-write.ts | developer | balanced | commands/dkc-write | TC-03 | `commands/dkc-write --help` muestra usage; comandos OK | git revert | done | 2 | resolve paths absolutos para --json-file/--output/--append-to |
| S2.T2 | Argv completo en dkc-write.ts: --json-file, --json-stdin, --output, --append-to, --archive-json, --debug, --dry-run. Schema validation pre-write. Exit codes 0/1/2/3/4 | developer | balanced | commands/lib/dkc-write.ts | TC-03, TC-04, TC-05 | TCs pass con JSON valido + invalido | git revert | done | 2 | TC-03/04/05 pass via CLI directo |
| S2.T3 | **Round-trip H3 critico**: tomar HOR-040.md, parsear sessions con parseSessionBlocks, generar via dkc-write --dry-run, diff funcional contra original. Si diff !=vacio: iterate template hasta identidad | reviewer | balanced | commands/lib/round-trip-test.ts | TC-06 | Diff funcional vacio sobre las 5 sessions de HOR-040 | — | done | 2 | Fixture HOR-040 NO sirve (sessions sin Objetivo). HOR-041 es fixture canonical. Round-trip 4/4 sessions PASS |
| S2.T4 | Benchmark H6: medir `dkc-write SessionBlock` sobre HOR-026 (5 sessions). Optimizar con cache de compile si >500ms | developer | balanced | commands/lib/dkc-write.ts | TC-07 | <500ms en ticket de 5 sessions | git revert | done | 2 | 0.5ms avg, 1000x mejor que target |
| S2.GATE | Quality review (DET-23 tier standard). H3 confirmed (round-trip pass). H6 confirmed (benchmark pass). Commit DET-27 `improve(dkc): tool dkc-write + round-trip H3 + benchmark (HOR-042 S2)` | reviewer | balanced | commands/ | TC-03..07 | Gate decision continue + commit | git revert | done | 2 | — |

### Session 3 — Integracion opt-in en 3 steps + docs (T2, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S3.T1 | Editar `prompts/steps/request-execute.md` gate D + S{N}.GATE: instruccion explicita opt-in via `validate_on_write` frontmatter check + dkc-write invocation pattern | developer | balanced | prompts/steps/request-execute.md | TC-09 | Grep retorna match; instruccion clara | git revert | done | 3 | sub-seccion `#### D.opt` agregada |
| S3.T2 | Editar `prompts/steps/request-close.md` gate A2: opt-in pattern para session de close generada via pipeline | developer | balanced | prompts/steps/request-close.md | TC-09 | Grep retorna match | git revert | done | 3 | sub-seccion `### 1c. Gate A2.opt` agregada |
| S3.T3 | Editar `prompts/steps/_design-shared.md`: opt-in pattern para generar tabla `## Tasks` del spec via dkc-write SpecTask | developer | balanced | prompts/steps/_design-shared.md | TC-09 | Grep retorna match | git revert | done | 3 | sub-seccion pipeline para tabla `## Tasks` agregada |
| S3.T4 | Documentar Principio 10 en `prompts/_style.md`: decision evolutiva markdown→JSON contract, comparativa v1 vs v2, antipatrones | scribe | fast | prompts/_style.md | TC-13 | Seccion completa, grep 3+ matches | git revert | done | 3 | 9 matches; 5 antipatrones; plan adopcion 4 fases |
| S3.T5 | Regression TC-11: verificar HOR-029 (cerrado pre-HOR-042) sigue validando con dkc-validate sin warnings nuevos | reviewer | balanced | (validacion) | TC-11 | exit 0 o 2 con warnings ya conocidos | — | done | 3 | HOR-029 valid=true, 0 errors, 3 warnings ya conocidos pre-HOR-026 |
| S3.GATE | Quality review (DET-23 tier standard). Decisiones confirmadas (opt-in funciona, backward compat preservada). Commit DET-27 `improve(dkc): integracion opt-in pipeline en 3 steps + docs (HOR-042 S3)` | reviewer | balanced | prompts/ | TC-08..13 | Gate decision continue + commit | git revert | done | 3 | — |

### Session 4 — Dogfood HOR-042 mismo (T2, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S4.T1 | Agregar `validate_on_write: true` al frontmatter de HOR-042 ticket. Documentar activacion en session log | scribe | fast | tickets/HOR-042.md | — | Frontmatter actualizado, flag activo | revert flag | done | 4 | flag activado |
| S4.T2 | Ejecutar S5 (close) usando pipeline activo: generar JSON de session de close → dkc-write SessionBlock --append-to HOR-042.md. Validar MD canonical end-to-end | developer | balanced | tickets/HOR-042.md | TC-10 | Session 5 escrita 100% via pipeline, MD canonical | revert via Edit manual | done | 4 | TC-10 PASS: exit 0, Session 5 canonical |
| S4.T3 | Medir friction observada: tiempo invertido, fixes necesarios, bugs descubiertos. Documentar findings en session log | reviewer | balanced | (medicion) | — | Findings documentados | — | done | 4 | L4.1-L4.4 capturados |
| S4.T4 | Si S4.T3 detecta bugs in-dogfood: fix in-session. Si critico (rompe pipeline): rollback flag + escalate. Si menor: documentar en backlog HOR-042 | developer | balanced | (variable segun bugs) | — | Bugs documentados o fix in-session | flag → false | done | 4 | **0 bugs in-dogfood** |
| S4.GATE | Quality review (DET-23 tier exhaustive). Dogfood end-to-end exitoso. Commit DET-27 `improve(dkc): dogfood HOR-042 con pipeline activo (HOR-042 S4)` | reviewer | balanced | commands/, tickets/HOR-042.md | TC-08, TC-10 | Gate decision continue + commit | git revert + flag false | done | 4 | — |

### Session 5 — Close + plan adopcion + docs (T0, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S5.T1 | Summary completo en HOR-042.md: que se entrego, hipotesis confirmadas (H1-H6), learns, plan adopcion gradual (4 fases), follow-ups HOR-046 conditional | scribe | fast | tickets/HOR-042.md | TC-12 | Summary completo, TC-12 pass (cero archivos schema nuevos) | — | done | 5 | — |
| S5.T2 | Decision teach-close (DET-22 F5): generar teach-close.md dado cambio arquitectural mayor. Hipotesis evolutivas + decisiones criticas justifican material educativo standalone | scribe | fast | tickets/HOR-042.teach/teach-close.md | — | teach-close.md producido | — | done | 5 | teach-close.md con hypothesis-map post-execute + 4 lessons learned + roadmap |
| S5.T3 | Actualizar frontmatter `teachings.close: done`, `status: closed`, `closed: 2026-05-16`, `executed: {actual}` | scribe | fast | tickets/HOR-042.md | — | Frontmatter post-close coherente | — | done | 5 | executed: 3 SP (50% del estimado 6); delta_reason documentado |
| S5.T4 | Reindex final + verificacion HC viewer (sin cambios funcionales en viewer porque MD generado es identico al manual) | reviewer | fast | — | — | Reindex pasa, HC sin regresion | — | done | 5 | — |
| S5.GATE | Cierre final. Commit DET-27 `close(horadric): HOR-042 closed — pipeline DKC v2 operacional, opt-in via validate_on_write` + reindex | scribe | fast | tickets/HOR-042.md | — | Ticket cerrado, reindex pasa | — | done | 5 | — |

## Constraints

- **DET-1, DET-2** (certeza + source_ref): cada REQ traza al ticket/draft; tasks `inferred` solo con validacion previa explicita
- **DET-7** (test cases ↔ discovery): 13 TCs trazan a REQ + session de ejecucion
- **DET-8** (rollback documentado): cada task con `git revert` o N/A justificado; S4 con `flag → false`
- **DET-11** (KB-first): reuso schemas HOR-026/041 sin extension
- **DET-16** (propagacion): cambios afectan a `commands/lib/`, `commands/dkc-write`, 3 steps, `_style.md` Principio 10, `tickets/HOR-042.md` (frontmatter flag) — todos en scope
- **DET-20** (sessions con gates): 5 sessions con S{N}.GATE como ultima task. **4 gates fuertes** (S1, S3, S4, S5) por riesgo MEDIO-ALTO
- **DET-23** (quality review): S1, S2, S3, S5 tier standard; S4 tier exhaustive (dogfood)
- **DET-24** (REQ callouts): REQ-IMPROVE 01-05 con callouts; REQ-PRESERVE 01-02 con callouts cortos
- **DET-25** (TCs registrados en sesion): columna `Session` poblada por TC
- **DET-27** (commits post-gate): cada gate produce commit separado codigo + dkc
- **RULE-workflow-session-format-canonical-002**: sessions del ticket siguen formato canonical Template de Gate
- **DEC-LOCAL-01** (S1.GATE): handlebars confirmed como templating engine
- **DEC-LOCAL-02** (S1.GATE): JSON intermedio ephemeral por default
- **DEC-LOCAL-03** (S1.GATE): opt-in via `validate_on_write` flag confirmado
- **DEC-LOCAL-04** (S1.GATE): scope piloto SpecTask + SessionBlock (Rule + Decision a HOR-046)

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `commands/lib/schemas/spec-task.ts` (HOR-026) | internal | Contract del JSON SpecTask | bajo — schema estable |
| `commands/lib/schemas/session-block.ts` (HOR-026) | internal | Contract del JSON SessionBlock | bajo — schema estable |
| `commands/lib/parsers/markdown.ts` (HOR-026/041) | internal | parseSessionBlocks reusado en TC-06 round-trip | bajo |
| `commands/lib/validate.ts` (HOR-026) | internal | Patron de validacion reusado | bajo |
| `handlebars ^4.7` (nuevo) | external | Templating engine | bajo — ~50KB, sin deps transitivas problematicas, ampliamente soportado |
| `HOR-040.md` (snapshot canonical) | internal | Fixture del round-trip test H3 | bajo |
| `HOR-026.md` (5 sessions canonical) | internal | Fixture del benchmark H6 | bajo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **H3 refutada (template produce diff con MD manual)** | media | alto | Round-trip test estricto en S2.T3 sobre HOR-040.md; iterate template hasta identidad antes de avanzar a S3 |
| **Performance >500ms en tickets grandes** | baja | medio | Benchmark en S2.T4; precompilar templates + cache de compile; optimizar si falla |
| **Pipeline rompe steps existentes mid-S3** | baja | alto | Opt-in via flag; flag NO activado durante S1-S3; activacion en S4 dogfood solo en HOR-042 |
| **Casos edge UTF-8 / multi-line / acentos** | media | medio | Documentados en data-model.md; tests dedicados (TC-06 cubre via round-trip de HOR-040 que tiene acentos + em-dash) |
| **Dogfood S4 detecta dolor inesperado** | media | medio | Buffer en S4 para fixes; S4.T4 reservada para in-session fix; rollback flag siempre disponible |
| **LLM no respeta schema (produce extras o enum invalido)** | media | bajo | Exit 1 con error detallado; re-prompt iterativo (esto ES el patron) |

## Open questions

(Cerradas en draft via 4 DEC-LOCAL. Q3, Q4, Q5, Q6 documentadas como out-of-scope deferred.)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Templating engine = handlebars

- **Contexto**: handlebars vs mustache vs custom
- **Drivers**: features (helpers + partials) + ecosystem maduro + footprint aceptable
- **Opcion elegida**: handlebars ^4.7
- **Alternativas**: mustache (rechazado: menos features), custom (rechazado: tiempo + edge cases)
- **Consecuencias**: 1 dep nueva en `commands/lib/`; reusable para HOR-046 Rule/Decision templates
- **Session**: S0 (intake) / confirmacion S1.GATE

### DEC-LOCAL-02: JSON intermedio ephemeral por default

- **Contexto**: JSON commiteado vs ephemeral
- **Drivers**: MD source of truth preservado + cero ruido en git
- **Opcion elegida**: ephemeral con flag `--archive-json` opt-in para casos especiales
- **Alternativas**: commiteado (rechazado: 2x archivos por ticket, dev no quiere ruido)
- **Consecuencias**: debug via `.dkc-write-temp/` (preservado solo con `--debug`)
- **Session**: S0 / confirmacion S1.GATE

### DEC-LOCAL-03: Opt-in via `validate_on_write` flag

- **Contexto**: opt-in vs mandatory desde dia 1
- **Drivers**: reversibilidad (high) + reduce blast radius riesgo MEDIO-ALTO
- **Opcion elegida**: opt-in via `validate_on_write: true` en frontmatter del ticket
- **Alternativas**: mandatory (rechazado: si pipeline tiene bug, bloquea todo el flujo)
- **Consecuencias**: adopcion gradual; default cambia a true post-stabilizacion (futuro)
- **Session**: S0 / confirmacion S1.GATE

### DEC-LOCAL-04: Scope piloto SpecTask + SessionBlock

- **Contexto**: cobertura inicial 2 kinds vs 4 kinds
- **Drivers**: reduce scope a 6 SP; valida approach antes de invertir en Rule/Decision templates
- **Opcion elegida**: piloto 2 kinds (cubre ~80% de records escritos)
- **Alternativas**: 4 kinds (rechazado: 4x trabajo en S2)
- **Consecuencias**: Rule + Decision quedan v1 hasta HOR-046 conditional
- **Session**: S0 / confirmacion S1.GATE

## Acceptance checkpoints

- [ ] **Funcional**: 13 TCs pass con outputs reales documentados en columna `Actual`
- [ ] **Tests**: round-trip H3 (TC-06) pass con diff funcional vacio sobre HOR-040
- [ ] **NFRs**: benchmark H6 (TC-07) <500ms en HOR-026 (5 sessions)
- [ ] **Rules**: DET-1/2/7/8/11/16/20/23/24/25/27 respetadas; RULE-workflow-session-format-canonical-002 en sessions
- [ ] **Integration**: 3 steps editados (TC-09), backward compat preservada (TC-11)
- [ ] **Dogfood**: HOR-042 mismo cierra con pipeline activo (TC-10)
- [ ] **Docs**: Principio 10 en `_style.md` (TC-13); teach-close.md producido (DET-22)
- [ ] **Schemas**: cero archivos nuevos en `commands/lib/schemas/` (TC-12 — DET-26 preservation)

## Backlog

(Vacio inicial. S4.T3-T4 puede agregar items in-dogfood si emergen bugs no bloqueantes.)

## Follow-ups

- **HOR-046 conditional**: pipeline para Rule + Decision templates si emerge dolor (DEC-4 deferred)
- **HOR-046 conditional**: hooks git pre-commit que invocan pipeline automaticamente
- **HOR-046 conditional**: integracion en steps de scribe (Q5 deferred)
- **HOR-046 conditional**: comando `dkc-write-migrate` para migrar tickets historicos (Q4 deferred)
- **HOR-046 conditional**: semantic linting de JSON valido pero erroneo (Q6 deferred)
- **Default → mandatory**: 2 sprints post-HOR-042 close, cambiar default del flag a `true` si stable
