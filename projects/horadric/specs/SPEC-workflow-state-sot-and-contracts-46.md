---
id: SPEC-workflow-state-sot-and-contracts-46
project: horadric
ticket: HOR-046
status: done
---

# State SoT consolidation + tipado de contratos DKC↔HC (scope expansion 2026-05-16)

# State SoT consolidation + tipado de contratos DKC↔HC (scope expansion 2026-05-16)

## Executive summary — lo que estas aprobando

### Que se quiere

Cerrar la causa raiz comun de los dolores recurrentes del dev: **el LLM rompe contratos de comunicacion con HC porque NO hay enforcement programatico — solo prosa en steps**. El audit del intake hizo evidente el patron in-vivo: HOR-046 mismo manifesto duplicacion de tablas (categoria 9 NUEVA descubierta) y 6 tickets adicionales arrastran variantes del anti-patron. Este spec encadena 5 frentes en una sola intervencion estructural:

| Frente | Que hace |
|--------|----------|
| **Original (state SoT)** | Declarar markdown como Source of Truth canonical. SQLite + frontmatter pasan a proyecciones derivadas que se recalculan via pipeline HOR-042 |
| **A (contract typing)** | Extender los schemas Zod de HOR-026/041/045 a **teach files + sessions shape + Rule + Decision** (HOR-042 cubre solo SpecTask + SessionBlock). El contrato declarado en `sessions.ts:114` (22 CANONICAL_LABELS) se proyecta al write-side |
| **B (autopilot teach flag)** | Trigger `teach on\|off` en `request-intake.md` seccion 0 + persistencia en frontmatter. Dev decide al activar autopilot, no se asume default |
| **C (validator guardarail)** | Pivot Q1 confirmado: el audit retroactivo deja de ser scope. El validator se corre como dogfood sobre tickets historicos (S8) — eso es el audit. Categoria 9 detectada por construccion |
| **D (bug modal commits)** | Repro empirico + fix. Si shape-related, fixture del validator. Si aislado, fix puro |

**Cobertura inicial extendida**: SpecTask + SessionBlock (HOR-042) + Teach (intake + close + bloques `dkc:*`) + Rule + Decision + Session shape canonical (CANONICAL_LABELS de `sessions.ts`).

**Adopcion**: opt-in via `validate_on_write: true` en frontmatter del ticket (patron heredado de HOR-042). Sin flag, flujo v1 intacto. Cero breaking changes.

### Decisiones criticas

| # | Decision | Por que |
|---|----------|---------|
| 1 | **Un spec transversal vs split por frente** | El dev confirmo "todo en un ticket / todo en un spec" (decision conversacional 2026-05-16). Coherencia narrativa + dataset coherente para LLM-local prep |
| 2 | **Markdown como SoT canonical** (vs SQLite o capa intermedia) | Markdown es el unico artefacto que sobrevive sin tooling (lectura plana). Es lo que el LLM y el dev tipean. SQLite es derivado de funcion pura del markdown |
| 3 | **Schemas Zod por bloque, no por archivo** | Bloques `dkc:hypothesis-map`, `dkc:decision-matrix`, `dkc:learning-path` se reusan entre teach-intake y teach-close. Granularidad por bloque + composicion → menos duplicacion. Confirmacion: Q2 resuelta |
| 4 | **Enforcement strict en pipeline** (vs warning) | Lenient deja drift acumulativo (caso historico HOR-040..049). Strict bloquea write si schema falla → forza al LLM a generar canonical. Mitigacion: testing exhaustivo del schema antes de activar el flag opt-in. Q3 resuelta |
| 5 | **Persistir decision teach en `teachings_skip_reason` (no nuevo campo)** | Ya existe + patron usado en HOR-046 mismo. Validator existente lo lee. Q5 resuelta |
| 6 | **Pivot Q1 → validator proactivo, no audit retrospectivo** | Audit retorno 0 violaciones en categorias previstas pero +1 nueva (categoria 9) in-vivo. El validator detecta cualquier shape invalido por construccion, sin depender del auditor saber que buscar |
| 7 | **6 tickets D1 a tasks del design** (no fix retro manual) | Tu decision 2026-05-16 (autopilot prompt). 2 sub-patrones distintos (B2: 2 tickets, B1: 5 tickets) con resoluciones distintas (eliminar vs renombrar/renumerar). Mejor en tasks con commits + quality review |
| 8 | **Frente D coupling decidido post-repro** | Sin repro empirico no se decide si es shape-related o aislado. Q4: la session S4 hace repro; S6 decide coupling |
| 9 | **Coverage Rule + Decision incluido en HOR-046** | SPEC-42 dejo explicitamente "HOR-046 conditional follow-up". Se absorbe ahora para no duplicar trabajo de schema. Q6 resuelta |
| 10 | **Dogfood retroactivo en S8 sobre tickets HOR-040..049** | Validar que el validator detecta D1 (categoria 9) sin falsos positivos. Si falla, regresar a S6 antes de cerrar |

### Riesgos principales y como los mitigamos

| Riesgo | Probabilidad | Impact | Mitigacion |
|--------|--------------|--------|------------|
| **Schema strict bloquea writes legitimos por bugs del schema** | Media | Alto (rompe el flujo del dev) | Testing exhaustivo en S2 con corpus de teach files + sessions reales. Opt-in via flag — un ticket puede revertir si schema falla |
| **Audit del agente Explore (S4) repite el sesgo del primero** | Alta (es el mismo patron) | Bajo (validator de S6 lo cubre) | Pivot Q1 ya resuelto: el validator es el audit. S4 solo hace re-auditoria intensiva de HOR-049 (caso citado) + repro bug modal commits |
| **Frente B (autopilot teach flag) es trivial y queda como afterthought** | Baja | Bajo | Sesion S5 dedicada explicita. Test manual del flow `autopilot on teach off` en S5.GATE |
| **6 tickets D1 fix retro genera errores en closed tickets (DET-6)** | Media | Medio | Para los 3 closed (HOR-043/044/045): solo renaming/renumbering del H2 legacy — NO toca discoveries ni session log. Defensible. Si emerge duda, escalate a dev en design o close |
| **Coverage Rule + Decision crece scope** | Media | Alto (sessions extras) | Si en S2 inventario detecta complejidad mayor, derivar Rule + Decision a HOR-050 nuevo. Marcar gate ⚑ fuerte en S2.GATE para decision empirica |
| **Pipeline performance >500ms con teach files grandes** | Baja | Medio | Precompilar templates + cache. Benchmark en S2.T5 antes de avanzar |

### Que NO se hace

- **NO migracion retroactiva masiva**: tickets pre-HOR-040 (BLY-029..040, HOR-001..029) no se migran. Solo los 6 afectados por D1 + opt-in para tickets futuros
- **NO Ruta A (HOR-030 MCP nativo)**: depende de medicion empirica primero (HOR-029 pendiente)
- **NO embedding-based KB (HOR-031)**: tangencial, sigue como ticket separado
- **NO refactor del shape markdown**: el contrato se documenta en schemas, no se cambia el formato visible
- **NO eliminar SQLite**: sigue como proyeccion (lectura), no fuente de verdad
- **NO touchear DETs 1-25**: HOR-047 (DET architecture refactor) es ticket separado
- **NO modificar tickets cerrados pre-D1**: solo renaming/renumbering del H2 en los 3 closed por D1, sin tocar discoveries

### Tamano estimado

| Session | Objetivo | Tier | Horas |
|---------|----------|------|-------|
| S1 | Inventario capas de estado + shape contractual DKC↔HC | T2 | 2h |
| S2 | Schemas Zod: teach + Rule + Decision + Session shape canonical | T2 | 3h |
| S3 | Pipeline write→validate extendido (post-write hook + SQLite rebuild) | T2 | 2.5h |
| S4 | Re-auditoria HOR-049 + repro bug modal commits + Frente B trigger | T2 | 2h |
| S5 | Autopilot teach flag (extension request-intake seccion 0) | T1 | 1h |
| S6 | Migrar HC + dkc-mcp tools a leer SQLite proyectado + fix bug modal commits | T2 ⚑ | 3h |
| S7 | Integrar schemas al pipeline + extender GATE 2 intake-explore | T2 ⚑ | 2.5h |
| S8 | Dogfood retroactivo: rebuild SQLite horadric + correr validator sobre HOR-040..049 | T3 ⚑ | 2h |
| S9 | Fix 6 tickets D1 (B2 eliminar, B1 renombrar+renumerar) + RULE-* + close | T1 ⚑ | 2h |

**Total tentativo**: 9 sessions, ~20h efectivas. SP 13 (transversal expandido, alta).

**Session mas riesgosa**: S6 (migrar HC + fix bug modal commits) — multi-archivo, regression critica, gate ⚑ fuerte.

### Como vas a saber que funciona

- **HC NO muestra sessions duplicadas** en HOR-046 (ya fixeado) ni en nuevos tickets creados
- **Validator detecta D1 categoria 9** al correr `dkc-validate` sobre HOR-048 (B2) sin falsos positivos
- **Trigger `teach on|off` aplicado en proximo ticket**: el dev escribe "autopilot on teach off" al abrir un ticket nuevo, el frontmatter persiste `teachings: { intake: skipped, close: skipped }` automaticamente con razon "dev autopilot trigger"
- **Bug modal commits resuelto**: clic en commit desde session abre modal sin error
- **6 tickets D1 limpiados**: HC los renderiza sin duplicacion (B2) o con tablas distinguibles (B1 con prefijo distinto)
- **Pipeline opt-in funcional**: ticket de prueba con `validate_on_write: true` bloquea write de teach con bloque `dkc:hypothesis-map` mal formado
- **Tests pasan**: vitest coverage delta no degrada respecto al baseline pre-spec

## Purpose

Resolver la causa raiz comun de los dolores recurrentes del dev con DKC↔HC: el LLM rompe sus propias reglas de comunicacion porque los contratos viven en prosa, no en codigo enforceable. Extender el pipeline write→validate→commit (HOR-042) a los dominios no cubiertos (teach files, Rule, Decision, sessions shape) + agregar guardarail proactivo via Zod schemas + dar al dev control explicito sobre teach en autopilot. Habilita ademas el camino a LLM-local: un workflow validable con codigo no depende del "criterio" del LLM ejecutor.

## Constraints

- **RULE-dev-002, RULE-dev-003**: drift entre body del ticket y representacion en index/UI documentado como bug previo — este spec lo previene por construccion
- **DET-3** (inmutabilidad del request): el spec NO reescribe el Request original de HOR-046. Las extensiones de scope viven en sub-secciones
- **DET-6** (discoveries inmutables): el fix retro de los 6 tickets D1 NO toca discoveries ni session log — solo estructura (header H2 legacy)
- **DET-11** (KB-first): este spec absorbe el dolor que HOR-046 (state SoT) y HOR-047 (DET architecture) plantean. HOR-047 sigue como ticket separado por orientacion conceptual distinta
- **DET-16** (propagacion): cada change debe declarar consumers. Implementado via task contracts con campo `files` exhaustivo
- **DET-20** (sessions con gate): 9 sessions de 1-3h con `S{N}.GATE` como ultima task de cada una. Numeracion continua desde Session 0 (intake-explore done)
- **DET-21 + DET-22** (teach gates): este ticket aplica `skipped` ambos con razon documentada en `teachings_skip_reason`. El spec NO genera teach material
- **HOR-042 opt-in flag**: `validate_on_write: true` en frontmatter activa pipeline. Patron heredado, no breaking change
- **Categoria 9 (discovery D1)**: el GATE 2 de `intake-explore.md` debe extenderse para prohibir tambien `## Esqueleto de plan tentativo` (y variantes). Validator del Frente A captura el patron en write-time

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-42 (pipeline write→validate→commit) | internal | Pipeline base que este spec extiende. Closed 2026-05-16 | Bajo — closed, estable |
| SPEC-26 (output schemas Zod) | internal | Zod foundation para schemas | Bajo — closed |
| SPEC-41 (schemas extension Rule + Decision) | internal | Antecedente directo del Frente A (Rule + Decision schemas). Closed | Bajo — closed |
| `horadric-cube/server/deckard/sessions.ts` | internal | Contiene `CANONICAL_LABELS` + types. Source of truth del contrato session shape | Bajo — read-only desde el spec |
| `horadric-cube/server/deckard/teaches.ts` | internal | `parseTeaching` + interfaces. Source of truth del contrato teach | Bajo — read-only |
| `horadric-cube/server/deckard/body.ts` | internal | Parser base (`extractSections`). Origen de RULE-dev-003 (fenced code blocks) | Medio — cambios al SQLite consumption en S6 podrian impactar |
| `commands/dkc-write`, `commands/dkc-validate`, `commands/dkc-verify-gate` | internal | Tooling de HOR-042 + HOR-026. Extendido por este spec | Medio — modificar agrega scope a S2, S3, S7 |
| Memorias `feedback_dkc_session_format.md`, `feedback_hc_fenced_code.md` | external (user memory) | Discoveries previos del mismo dolor — input al inventario de S1 | Bajo — solo lectura |

## Requirements

### REQ-IMPROVE-01: Markdown como SoT canonical declarado

> **Que cambia**: cuando el frontmatter del ticket dice una cosa y el body dice otra (ej. `status: open` vs Session 5 closed con gate `close`), el sistema declara explicitamente que **el body gana**. Antes era ambiguo y el LLM elegia segun contexto.
> **Por que**: hoy 6 capas compiten paritariamente (frontmatter, body, spec, sub-carpetas, SQLite, config). El LLM mantiene consistencia manual entre las 6, acumulando drift (caso HOR-018/019/020). Sin SoT unica, el LLM-local no podra razonar — su context window es muy pequeno.

El sistema MUST declarar markdown body como Source of Truth canonical y todos los demas (frontmatter, SQLite, sub-carpetas) como proyecciones derivadas. La declaracion vive en `rules/_global/RULE-dkc-state-sot.md` (Added en este spec).

<details><summary>Scenarios de validacion</summary>

#### Scenario: divergencia frontmatter vs body
- **GIVEN** ticket con `frontmatter.status: open` y body con Session 3 cerrada y gate decision `close`
- **WHEN** validator inspecciona el ticket
- **THEN** validator reporta divergencia: "body indica close, frontmatter indica open. SoT (body) gana. Re-derive frontmatter."

#### Scenario: rebuild SQLite tras corrupcion
- **GIVEN** SQLite `index.db` se borra accidentalmente
- **WHEN** se ejecuta `dkc-reindex {project}`
- **THEN** SQLite se reconstruye desde markdown sin perdida de informacion. Validacion: contar records antes vs despues = igual

</details>

### REQ-IMPROVE-02: Pipeline write→validate→commit extendido a teach + Rule + Decision + Session shape

> **Que cambia**: cuando el LLM escribe un `teach-intake.md` con bloque `dkc:hypothesis-map` YAML mal formado, el pipeline lo detecta ANTES de escribir al disco y rechaza la escritura con error legible. Antes el LLM podia escribir cualquier cosa y HC parser fallaba en silencio mas tarde.
> **Por que**: la cobertura actual del pipeline (HOR-042) es SpecTask + SessionBlock (~80%). Los teach files y sessions canonical labels son los que mas drift acumulan in-vivo (categoria 9 descubierta in-vivo en HOR-046 mismo).

El sistema MUST extender el pipeline write→validate→commit existente a 4 kinds adicionales:
- `Teach` (con sub-schemas `dkc:hypothesis-map`, `dkc:decision-matrix`, `dkc:learning-path`)
- `Rule`
- `Decision`
- `SessionShape` (validacion del shape canonical de `### Session N` con CANONICAL_LABELS de `sessions.ts:114`)

Cobertura objetivo: ~95% records escritos.

<details><summary>Scenarios de validacion</summary>

#### Scenario: teach con bloque YAML mal formado
- **GIVEN** ticket con `validate_on_write: true`, LLM intenta escribir `teach-intake.md` con bloque `dkc:hypothesis-map` cuya YAML tiene indent invalido
- **WHEN** se invoca `dkc-write Teach --json-file /tmp/teach.json`
- **THEN** exit code != 0, output contiene `errors[].path = "dkc:hypothesis-map.hypotheses[0]"` con razon. Archivo NO escrito al disco

#### Scenario: session con label no canonico
- **GIVEN** Session 3 con sub-label `**Gate decision (FINAL):**` (sufijo no canonico)
- **WHEN** validator corre sobre el ticket
- **THEN** reporta violacion: "label 'gate decision (final)' no esta en CANONICAL_LABELS. Variante esperada: 'gate decision'"

</details>

### REQ-IMPROVE-03: Detector de categoria 9 (anti-patron H2 paralelo) en validator

> **Que cambia**: el validator detecta el anti-patron `## Esqueleto de plan tentativo` (y variantes con "plan" + "sessions" / "tentativo" / "esqueleto") como H2 paralelo a `## Sessions`. Sub-patrones B2 (duplicacion real) y B1 (plan post-activacion legitimate) son distinguidos por contenido, no solo header.
> **Por que**: discovery D1 in-vivo demostro que el dolor del dev es real (7 tickets afectados) pero invisible al audit retrospectivo. El validator es el unico mecanismo escalable de deteccion.

El sistema MUST detectar el patron anti-patron H2 paralelo con sub-categorizacion:
- **B2**: si el H2 tiene mismo prefijo `S{N}` que el H3 canonical Y descripciones similares → reportar como duplicacion real (severity: error)
- **B1**: si el H2 tiene prefijo distinto (ej. `P{N}` o `IMP{N}`) Y el header contiene marcador post-activacion → aceptar como legitimate (severity: ok)
- **B1 sin marcador**: si el H2 usa prefijo `S{N}` pero contenido es distinto al H3 → reportar como ambiguo (severity: warning) con sugerencia de renombrar

### REQ-IMPROVE-04: Trigger `teach on|off` en autopilot

> **Que cambia**: cuando activas autopilot, puedes escribir `autopilot on teach off` (o `autopilot on teach on`) y el sistema persiste la decision en frontmatter `teachings_skip_reason` con razon "dev autopilot trigger". Antes el autopilot asumia teach `pending` por default sin preguntarte.
> **Por que**: meta-ironico: este mismo ticket activo el autopilot y el LLM iba a aplicar teach automatico. El dev tuvo que invocar skip manualmente. El trigger formaliza la decision al inicio.

El sistema MUST extender la tabla de triggers de `request-intake.md` seccion 0 (HOR-022 F7) con:
- `autopilot on teach on` → `autopilot: true` + `teachings: { intake: pending, close: pending }` (default actual explicito)
- `autopilot on teach off` → `autopilot: true` + `teachings: { intake: skipped, close: skipped }` + `teachings_skip_reason: { intake: "dev autopilot trigger", close: "dev autopilot trigger" }`
- `teach on`, `teach off` (sin autopilot trigger) → solo cambia teachings state sin tocar autopilot

### REQ-IMPROVE-05: Bug modal commits resuelto

> **Que cambia**: cuando abres el modal de detalles de commits desde una session en HC, ya no aparece el error que aparece hoy.
> **Por que**: el dev reporto el bug 2026-05-16. Debido sin repro empirico no se determino causa raiz.

El sistema MUST resolver el bug del modal de detalles de commits levantado desde sessions. La task S4.T2 hace repro empirico. Si causa es shape mismatch (Commit type vs endpoint), entra como fixture del validator (Frente A). Si causa es aislada (Vue lifecycle, async/await, etc.), fix puro en S6.

### REQ-IMPROVE-06: 6 tickets D1 limpiados

> **Que cambia**: los 6 tickets afectados por D1 dejan de mostrar tablas duplicadas o confusas en HC.
> **Por que**: HOR-046 ya fixeado in-situ. Los otros 6 quedaron en backlog.

El sistema MUST aplicar fix a los 6 tickets segun sub-patron:
- **B2 (HOR-048)**: convertir H2 a H3 movido dentro de `## Sessions`
- **B1 (HOR-030, 043, 044, 045, 047)**: renombrar H2 a `## Plan post-activacion (referencia, NO ejecutable)` + renumerar tabla con prefijo `P1, P2, P3` para desambiguar visualmente. Contenido preservado

### REQ-IMPROVE-07: GATE 2 de intake-explore extendido

> **Que cambia**: cuando un step `intake-explore` cierra, el GATE 2 verifica que NO existe ningun H2 cuyo titulo contenga "plan" + alguna palabra del set {"sessions", "tentativo", "esqueleto"}. Antes solo verificaba `^## Plan de sessions`.
> **Por que**: la brecha del GATE 2 dejo pasar `## Esqueleto de plan tentativo` como variante semantica del mismo anti-patron.

El sistema MUST extender GATE 2 de `prompts/steps/intake-explore.md` con regex generalizado:
```bash
grep -c -iE '^## [^#]*(esqueleto.*plan|plan.*(sessions|tentativo))' tickets/{TICKET-id}.md
```
Resultado esperado: 0. Si > 0, el gate falla y reporta linea + match exacto.

### REQ-PRESERVE-01: HOR-042 opt-in flag preservado

> **Que cambia**: nada cambia para tickets sin `validate_on_write: true`. Siguen funcionando como hoy.
> **Por que**: cero breaking changes — patron heredado de HOR-042.

El sistema MUST preservar el comportamiento de tickets con `validate_on_write: false` (o ausente). Flow v1: write libre, validate post-escritura, dev/LLM fix manual.

### REQ-PRESERVE-02: HC parser sigue funcionando con tickets pre-HOR-046

> **Que cambia**: nada en HC parser.
> **Por que**: HC parser ya lee del markdown via `body.ts`, `sessions.ts`, `teaches.ts`. El cambio es solo en quien escribe al SQLite (S6).

El sistema MUST preservar la funcionalidad de HC parser sobre todos los tickets existentes (horadric, up1, bayley). Los parsers (`body.ts`, `sessions.ts`, `teaches.ts`) NO se modifican en este spec — solo el endpoint server que populate el SQLite cambia (S6).

### REQ-PRESERVE-03: dkc-mcp tools API publica no cambia

> **Que cambia**: nada. Las herramientas `dkc_find_records`, `dkc_search_text`, etc. tienen la misma interfaz.
> **Por que**: cero breaking changes para consumers externos de dkc-mcp.

El sistema MUST preservar la API publica de los tools dkc-mcp. Internamente pueden consumir del SQLite proyectado (S6) pero su shape de input/output no cambia.

### REQ-PRESERVE-04: Triggers autopilot existentes funcionan

> **Que cambia**: nada para triggers existentes (`autopilot on`, `autopilot off`, `autopilot strict`, `pausa`, `iterate`, etc.).
> **Por que**: el Frente B extiende la tabla, no la reemplaza.

El sistema MUST preservar todos los triggers conversacionales actuales de `request-intake.md` seccion 0 (HOR-022 F7). Los nuevos triggers `teach on/off` son aditivos.

### REQ-PRESERVE-05: Discoveries de los 6 tickets D1 no se tocan

> **Que cambia**: nada en el contenido investigativo (Triage, hipotesis, session log, learns) de los 6 tickets afectados por D1.
> **Por que**: DET-6 explicita inmutabilidad de discoveries.

El sistema MUST limitar el fix retro al header H2 legacy + tabla (en B1) o eliminacion (en B2). No tocar Triage, hipotesis, session log, learns ni discoveries de HOR-030, 043, 044, 045, 047, 048.

## Changes

### Modified

| Artefacto | Antes | Despues | Por que |
|-----------|-------|---------|---------|
| `prompts/steps/intake-explore.md` GATE 2 | Prohibe solo `^## Plan de sessions` | Prohibe variantes (regex generalizado) | REQ-IMPROVE-07 |
| `prompts/steps/request-intake.md` seccion 0 | Triggers `autopilot on/off/strict, pausa` | + `teach on/off` (con o sin autopilot trigger compuesto) | REQ-IMPROVE-04 |
| `commands/dkc-write` | Acepta kinds: SpecTask, SessionBlock | + Teach (con sub-blocks), Rule, Decision, SessionShape | REQ-IMPROVE-02 |
| `commands/dkc-validate` | Valida SpecTask, SessionBlock | + Teach, Rule, Decision, SessionShape, categoria 9 (anti-patron H2) | REQ-IMPROVE-02 + REQ-IMPROVE-03 |
| `commands/dkc-verify-gate` | Gates G1-G7 (HOR-023) | + G8 (categoria 9 anti-patron sub-patron B2/B1 distinguido) | REQ-IMPROVE-03 |
| `horadric-cube/server/deckard/sqlite.ts` (endpoint que populate) | Escribe directo al SQLite desde varios steps | Solo `dkc-reindex` populate; demas son read-only | REQ-IMPROVE-01 |
| HOR-030.md, HOR-043.md, HOR-044.md, HOR-045.md, HOR-047.md | H2 `## Esqueleto de plan (referencia...)` con tabla `S1, S2, S3...` | H2 `## Plan post-activacion (referencia, NO ejecutable)` con tabla `P1, P2, P3...` | REQ-IMPROVE-06 (sub-patron B1) |
| HOR-048.md | H2 `## Esqueleto de plan tentativo (refinado en design)` (sin H3) | H3 `### Plan de sessions (preplanificacion)` dentro de `## Sessions` con mismo contenido | REQ-IMPROVE-06 (sub-patron B2) |

### Added

| Artefacto | Donde | Proposito |
|-----------|-------|-----------|
| `templates/schemas/TeachSchema.ts` | deckard | Zod schema para teach files (intake + close) con sub-schemas para bloques `dkc:*` |
| `templates/schemas/RuleSchema.ts` | deckard | Zod schema para Rule (frontmatter + body sections esperadas) |
| `templates/schemas/DecisionSchema.ts` | deckard | Zod schema para Decision (frontmatter + body con drivers/alternativas/consecuencias) |
| `templates/schemas/SessionShapeSchema.ts` | deckard | Zod schema para Session shape canonical con CANONICAL_LABELS importadas de HC |
| `templates/handlebars/Teach.hbs` | deckard | Template handlebars para Teach (intake + close) — usado por `dkc-write` |
| `templates/handlebars/Rule.hbs`, `Decision.hbs`, `SessionShape.hbs` | deckard | Idem |
| `commands/dkc-fix-d1` | deckard | Script de migracion para los 6 tickets D1. Idempotente. Lee sub-patron del header H2 y aplica fix correspondiente (B2 eliminar / B1 renombrar+renumerar) |
| `projects/horadric/rules/workflow/RULE-state-sot.md` | horadric | Documenta SoT contract: markdown canonical, SQLite/frontmatter proyecciones |
| `projects/horadric/rules/workflow/RULE-anti-pattern-h2-plan.md` | horadric | Documenta categoria 9 + sub-patrones B2/B1 + reglas de deteccion |

## NFRs

| Tipo | Current | Target | How to measure |
|------|---------|--------|----------------|
| Pipeline write latency (teach files) | N/A (no validado) | < 500ms para teach file de hasta 1000 lineas | Benchmark en S2.T5 + S7.T3 |
| Validator throughput | N/A | >= 50 tickets/sec en dogfood S8 (HOR-040..049) | Cronometrar `dkc-validate --all` |
| HC parser performance (post-S6) | N/A | No degradacion >5% vs baseline pre-S6 | Vitest benchmark `body.test.ts` antes/despues |
| Memory usage de Zod schemas en MCP | N/A | < 50MB total para todos los schemas cargados | Heap snapshot post-import |

## Tasks

> **Numeracion DET-20**: HOR-046 tiene Session 0 registrada en ticket markdown. `max_session = 0` → plan empieza en `S1`. Verificacion: `grep -E "^### Session [0-9]+" tickets/HOR-046.md | grep -oE "[0-9]+" | sort -n | tail -1` retorna `0`.

> **Tabla shape canonical HOR-022 F8**: 11 columnas obligatorias por session. `—` cuando no aplica, nunca vacio.

### Session 1 — Inventario capas de estado + shape contractual DKC↔HC [tier: T2] [tipo: auto]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Inventario de capas de estado: catalogar campos por capa (frontmatter / body / spec / sub-carpetas / SQLite / config). Producir tabla con owner canonical vs derivado | REQ-IMPROVE-01 | researcher | — | `templates/records/ticket.md`, `horadric-cube/server/deckard/*.ts`, sample 3 tickets reales (HOR-046 + 1 closed + 1 open) | Tabla con >=20 campos catalogados, cada uno con `canonical: yes\|no` y `derived_from` | N/A (read-only) | DET-1, DET-2, DET-11 | done | 1 |
| S1.T2 | Inventario del shape contractual DKC↔HC: catalogo de bloques `dkc:*` (teach), CANONICAL_LABELS de sessions.ts:114, frontmatter fields esperados por parsers | REQ-IMPROVE-02 | researcher | S1.T1 | `horadric-cube/server/deckard/sessions.ts:114`, `teaches.ts:16-145`, `body.ts:1-65`, memorias `feedback_dkc_session_format.md` + `feedback_hc_fenced_code.md` | Catalogo en formato JSON con todos los bloques + labels + tipos. Cross-ref con types TypeScript de HC | N/A | DET-5, DET-11 | done | 1 |
| S1.T3 | Validar H1 (markdown SoT) + H2 (pipeline unica entrada) + H7 (teach shape validable) + H8 (sessions shape validable) empiricamente con sample HOR-040..049 | REQ-IMPROVE-01, REQ-IMPROVE-02 | researcher | S1.T1, S1.T2 | Tickets HOR-040 a HOR-049 (read-only) | Tabla "hipotesis × evidencia" con cita exacta de path:linea por cada confirmacion | N/A | DET-5, DET-11 | done | 1 |
| S1.GATE | Gate Session 1 (validation tier T2): inventario producido, hipotesis validadas, dev confirma scope antes de S2 | — | reviewer | S1.T1-T3 | `tickets/HOR-046.md` (session log) | Quality review DET-23: dimensiones 1, 7 mandatorias; resto n/a (session read-only) | N/A | DET-13, DET-14, DET-20, DET-23 | done | 1 |

**Estado deseado post-S1**: dev tiene mapa claro de "que se proyectara" + "que campos quedan canonical" + "que bloques teach existen" antes de implementar.

### Session 2 — Schemas Zod: Teach + Rule + Decision + SessionShape [tier: T2] [tipo: auto]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Implementar `TeachSchema.ts` con sub-schemas para `dkc:hypothesis-map`, `dkc:decision-matrix`, `dkc:learning-path`, **`dkc:code-walkthrough`** (extension post-D6) | REQ-IMPROVE-02 | developer | S1.GATE | `deckard/commands/lib/schemas/teach.ts` (nuevo, path real ajustado del spec original) | Self-test inline 7/7 pass cubre cases valid/invalid de los 4 sub-schemas + frontmatter + composicion | git revert | DET-5, DET-10, DET-11 | done | 2 |
| S2.T2 | (Re-scope) Verificar `rule.ts` + `decision.ts` existentes — self-tests pass, no refinements por D1-D8 (scope record-level vs body/session-level) | REQ-IMPROVE-02 | developer | S2.T1 | `commands/lib/schemas/rule.ts`, `decision.ts` (HOR-041 ya implemento) | Self-tests existentes pass; cobertura D1-D8 confirmada N/A para record-level | git revert | DET-5, DET-10 | done | 2 |
| S2.T3 | (Re-scope) Verificar `SessionBlockSchema` cubre D5 — D5 es problema pre-parse, va a S2.T4 (body-level detector). No refinement adicional al schema record-level | REQ-IMPROVE-02 | developer | S2.T2 | `commands/lib/schemas/session-block.ts` (existente HOR-026) | Schema rechaza enum invalido (`STOP` etc.). D5 cubierto por anti-patrons detector | git revert | DET-5, DET-10 | done | 2 |
| S2.T4 | Implementar detector body-level en `commands/lib/schemas/anti-patterns.ts` con 4 categorias: cat-9-B2, cat-9-B1, cat-12, cat-13 | REQ-IMPROVE-03 | developer | S2.T3 | `commands/lib/schemas/anti-patterns.ts` (nuevo) | Self-test 7/7 pass + validacion contra 4 tickets reales (HOR-046, 048, 045, 049). D7 descubierto (variante "Plan de sessions" literal). D8 capturado (false positive estructural HOR-045) | git revert | DET-5, DET-10 | done | 2 |
| S2.T5 | Benchmark performance | NFR pipeline latency | researcher | S2.T1-T4 | Inline bench en `/tmp/bench-schemas.ts` | TeachSchema.parse 0.27ms / detectAntiPatterns 0.13ms (1850x-3800x mejor que target 500ms) | N/A | DET-13 | done | 2 |
| S2.GATE | Gate Session 2: schemas funcionando + 14 tests pass + benchmark con margen 1850x | — | reviewer | S2.T1-T5 | `tickets/HOR-046.md` | Quality review DET-23 standard 7/10 dims pass, 3 n/a por naturaleza schemas/CLI. Gate decision: continue | N/A | DET-13, DET-14, DET-20, DET-23 | done | 2 |

### Session 3 — Pipeline write→validate→commit extendido [tier: T2] [tipo: auto]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Extender `commands/dkc-write` para aceptar nuevos kinds (Teach, Rule, Decision, SessionShape) con templates handlebars | REQ-IMPROVE-02 | developer | S2.GATE | `deckard/commands/dkc-write`, `deckard/templates/handlebars/Teach.hbs`, `Rule.hbs`, `Decision.hbs`, `SessionShape.hbs` (nuevos) | Round-trip test: write con JSON → MD identico al manual existente. Diff vacio | git revert | DET-5, DET-8, DET-10 | done | 3 |
| S3.T2 | Extender `commands/dkc-validate` para validar nuevos kinds + categoria 9 | REQ-IMPROVE-02, REQ-IMPROVE-03 | developer | S3.T1 | `deckard/commands/dkc-validate` | Test: `dkc-validate Teach HOR-022.teach/teach-intake.md` retorna exit 0; `dkc-validate Teach <invalido>` retorna exit !=0 con errors[] | git revert | DET-5, DET-10 | done | 3 |
| S3.T3 | Post-write hook + SQLite rebuild incremental | REQ-IMPROVE-01 | developer | S3.T2 | `deckard/commands/dkc-reindex` (extender), nuevo `deckard/lib/post-write-hook.ts` | Test integracion: write a markdown → SQLite refleja sin intervencion manual. Incremental: solo ticket modificado se re-indexa | git revert | DET-5, DET-8, DET-10 | done | 3 |
| S3.GATE | Gate Session 3: pipeline funciona end-to-end con nuevos kinds. Tests integracion verdes | — | reviewer | S3.T1-T3 | `tickets/HOR-046.md` | Quality review standard tier. Performance: pipeline < 500ms p95 sobre teach + sessions reales | N/A | DET-13, DET-14, DET-20, DET-23 | done | 3 |

### Session 4 — Re-auditoria HOR-049 + repro bug modal commits + Frente B trigger [tier: T2] [tipo: auto]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Re-auditoria intensiva de HOR-049: lectura linea por linea + cross-check con SessionShapeSchema de S2.T3. Capturar violaciones semanticas | REQ-IMPROVE-02, Q1 caveat HOR-049 | researcher | S3.GATE | `projects/horadric/tickets/HOR-049.md`, `deckard/templates/schemas/SessionShapeSchema.ts` | Reporte: lista exhaustiva de violaciones con linea + categoria. Si 0 violaciones, el caveat de H10 queda descartado | N/A (read-only) | DET-5, DET-7 | done | 4 |
| S4.T2 | Repro bug modal commits: levantar HC dev server, click sobre commit desde session, capturar error en consola + network + estado del componente | REQ-IMPROVE-05 | researcher | S3.GATE | `horadric-cube/src/components/commits/SessionCommitsModal.vue`, `useSessionCommits.ts`, screenshots en `tickets/HOR-046.screenshots/` | Error reproducible 3 veces consecutivas. Capturar: stacktrace + console + network request | N/A (read-only) | DET-5 | done | 4 |
| S4.T3 | Diagnostico bug modal: clasificar como `shape-related` (mismatch Commit type) o `aislado` (Vue lifecycle, async, etc.). Decision Q4 | REQ-IMPROVE-05 | architect | S4.T2 | `tickets/HOR-046.md` (session log) | Decision documentada inline con evidencia | N/A | DET-1, DET-4 | done | 4 |
| S4.GATE | Gate Session 4: re-auditoria + bug diagnostico documentados. Decision Q4 cerrada | — | reviewer | S4.T1-T3 | `tickets/HOR-046.md` | Quality review standard tier | N/A | DET-13, DET-14, DET-20, DET-23 | done | 4 |

### Session 5 — Autopilot teach flag (Frente B) [tier: T1] [tipo: auto]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Extender tabla de triggers en `request-intake.md` seccion 0: `autopilot on teach on`, `autopilot on teach off`, `teach on`, `teach off` | REQ-IMPROVE-04 | developer | S4.GATE | `deckard/prompts/steps/request-intake.md:42-64` | Diff inspeccionable. Tabla preserva triggers existentes (REQ-PRESERVE-04) | git revert | DET-3, DET-10, DET-16 | done | 5 |
| S5.T2 | Implementar persistencia `teachings_skip_reason: { intake: "dev autopilot trigger", close: "dev autopilot trigger" }` cuando trigger lo dispara | REQ-IMPROVE-04 | developer | S5.T1 | `deckard/prompts/steps/request-intake.md` | Test manual: aplicar trigger sobre ticket de prueba, verificar frontmatter resultante | git revert | DET-10 | done | 5 |
| S5.T3 | Test manual flow: abrir ticket nuevo con "autopilot on teach off", verificar que intake-explore aplica skip sin invocar teach-intake | REQ-IMPROVE-04, H9 confirmacion | researcher | S5.T2 | Ticket fixture temporal (eliminar post-test) | Flow completo sin errores. teach-intake.md NO se crea | Eliminar ticket fixture | DET-5 | done | 5 |
| S5.GATE | Gate Session 5 (T1): trigger funciona end-to-end | — | reviewer | S5.T1-T3 | `tickets/HOR-046.md` | Quality review light tier: dims 1, 7 mandatorias | N/A | DET-13, DET-14, DET-20, DET-23 | done | 5 |

### Session 6 — Migrar HC + dkc-mcp tools + fix bug modal commits [tier: T2] [tipo: ⚑ fuerte]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Migrar HC endpoint que populate SQLite: solo `dkc-reindex` escribe, demas read-only. Identificar y deprecar writes ad-hoc | REQ-IMPROVE-01, REQ-PRESERVE-02 | developer | S5.GATE | `horadric-cube/server/deckard/sqlite.ts`, endpoints en `horadric-cube/server/deckard/*.ts` | Test integracion HC: cargar ticket, modal, kanban — todo funciona sin SQLite writes ad-hoc | git revert | DET-5, DET-8, DET-10, DET-16 | done | 6 |
| S6.T2 | Migrar dkc-mcp tools a consultar SQLite proyectado (read-only). API publica inalterada | REQ-IMPROVE-01, REQ-PRESERVE-03 | developer | S6.T1 | `deckard/commands/` (tools dkc-mcp) | Test: cada tool con input/output identico pre vs post. Diff vacio | git revert | DET-5, DET-10 | done | 6 |
| S6.T3 | Fix bug modal commits segun decision Q4 (S4.T3): si shape-related, agregar Commit a SessionShapeSchema; si aislado, fix Vue lifecycle/async | REQ-IMPROVE-05 | developer | S6.T2, S4.T3 | `horadric-cube/src/components/commits/SessionCommitsModal.vue`, `CommitDiffPanel.vue`, posible `useSessionCommits.ts` | Modal abre sin error. Test E2E con commit real (puppeteer/playwright) | git revert | DET-5, DET-10 | done | 6 |
| S6.GATE | Gate Session 6 ⚑ fuerte: migracion HC + dkc-mcp + fix bug verificados. Tests regression verdes. **Dev confirma antes de avanzar** | — | reviewer | S6.T1-T3 | `tickets/HOR-046.md` | Quality review exhaustive tier: 10 dims aplicables. Regression completa T3 | git revert por task | DET-13, DET-14, DET-20, DET-23 | done | 6 |

### Session 7 — Integrar schemas al pipeline + extender GATE 2 intake-explore [tier: T2] [tipo: ⚑ fuerte]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S7.T1 | Integrar schemas Zod (S2) al pipeline (S3) via flag `validate_on_write: true`. Configuracion strict | REQ-IMPROVE-02, decision 4 strict | developer | S6.GATE | `deckard/commands/dkc-write`, `dkc-validate`, `lib/post-write-hook.ts` | Test: ticket con flag activo + intento write invalido = exit !=0 + archivo NO escrito | git revert | DET-5, DET-8, DET-10 | done | 7 |
| S7.T2 | Extender GATE 2 de `prompts/steps/intake-explore.md` con regex generalizado para anti-patron H2 | REQ-IMPROVE-07 | developer | S7.T1 | `deckard/prompts/steps/intake-explore.md:50-61` | Test: ticket con `## Esqueleto de plan tentativo` → GATE 2 reporta violacion con mensaje claro | git revert | DET-3, DET-10, DET-16 | done | 7 |
| S7.T3 | Benchmark integrado: write+validate de teach + session shape sobre 10 tickets reales | NFR validator throughput | researcher | S7.T1-T2 | `deckard/tests/perf/` | Throughput >= 50 tickets/sec. Latency p95 < 500ms | N/A | DET-13 | done | 7 |
| S7.GATE | Gate Session 7 ⚑ fuerte: pipeline integrado + gate ampliado + NFRs cumplidos | — | reviewer | S7.T1-T3 | `tickets/HOR-046.md` | Quality review exhaustive tier | git revert por task | DET-13, DET-14, DET-20, DET-23 | done | 7 |

### Session 8 — Dogfood retroactivo: validator sobre HOR-040..049 [tier: T3] [tipo: ⚑ fuerte]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S8.T1 | Rebuild SQLite horadric desde markdown via `dkc-reindex --rebuild` | REQ-IMPROVE-01 | developer | S7.GATE | `deckard/projects/horadric/.dkc/index.db` | Conteo records pre vs post = igual. Diff `dkc-validate --all` antes vs despues | git restore (backup SQLite) | DET-5, DET-13 | done | 8 |
| S8.T2 | Correr `dkc-validate --all` sobre horadric. Categorizar resultados: errors (D1 categoria 9 esperada en 6 tickets B1/B2) + warnings + ok | REQ-IMPROVE-03, REQ-IMPROVE-06 | researcher | S8.T1 | `deckard/projects/horadric/` (read-only validator) | Validator detecta D1 en 6 tickets esperados. Falsos positivos < 5% (umbral acordado) | N/A | DET-7, DET-13 | done | 8 |
| S8.T3 | Validar zero regression: HC carga todos los tickets sin error. Cargar HOR-040..049 manualmente en HC dev | REQ-PRESERVE-02 | reviewer | S8.T2 | `horadric-cube` dev server | Todos los tickets renderizan sin error de consola | git revert si emerge | DET-5, DET-7 | done | 8 |
| S8.GATE | Gate Session 8 ⚑ fuerte: dogfood pasa. Si falsos positivos del validator > 5%, regresar a S7 antes de cerrar | — | reviewer | S8.T1-T3 | `tickets/HOR-046.md` | Quality review exhaustive tier T3: regression completa + a11y donde aplique | git revert | DET-13, DET-14, DET-20, DET-23 | done | 8 |

### Session 9 — Fix 6 tickets D1 + RULE-* + close [tier: T1] [tipo: ⚑ fuerte]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S9.T1 | Implementar `commands/dkc-fix-d1` script idempotente: lee sub-patron B2/B1 del header y aplica fix correspondiente | REQ-IMPROVE-06 | developer | S8.GATE | `deckard/commands/dkc-fix-d1` (nuevo) | Test sobre HOR-048 (B2) y HOR-045 (B1) en sandbox. Idempotente: correr 2x produce mismo output | git revert + restore tickets | DET-3, DET-6, DET-8, DET-10 | done | 9 |
| S9.T2 | Correr `dkc-fix-d1` sobre 6 tickets reales: HOR-030, 043, 044, 045, 047, 048. Verificar en HC que renderizan correctamente | REQ-IMPROVE-06, REQ-PRESERVE-05 | developer | S9.T1 | Los 6 tickets + HC dev | Validator post-fix: 0 violaciones categoria 9. HC renderiza sin duplicacion (B2) o con prefijo distinto (B1) | git restore tickets | DET-5, DET-6, DET-13 | done | 9 |
| S9.T3 | Crear RULE-state-sot.md + RULE-anti-pattern-h2-plan.md en `projects/horadric/rules/workflow/` | REQ-IMPROVE-01, REQ-IMPROVE-03 | scribe | S9.T2 | `projects/horadric/rules/workflow/RULE-state-sot.md` + `RULE-anti-pattern-h2-plan.md` (nuevos) | Rules pasan validacion de RuleSchema (S2.T2) | git revert | DET-2, DET-11, DET-16 | done | 9 |
| S9.T4 | Auto-reindex post-spec (`commands/dkc-reindex horadric`) | REQ-IMPROVE-07 (auto-reindex) | scribe | S9.T3 | `deckard/projects/horadric/.dkc/index.db` | Exit 0. Rules + spec indexados | N/A | — | done | 9 |
| S9.GATE | Gate Session 9 ⚑ fuerte: 6 tickets D1 limpiados + RULES documentadas + reindex OK. Dev confirma close del ticket HOR-046 | — | reviewer | S9.T1-T4 | `tickets/HOR-046.md` | Quality review exhaustive tier. Acceptance checkpoints completos | N/A | DET-13, DET-14, DET-20, DET-23 | done | 9 |

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When |
|--------|-------------------|--------|----------------|------|
| Tickets con duplicacion H2/H3 visible en HC | 6 (HOR-030, 043, 044, 045, 047, 048, + HOR-046 fixeado) | 0 | `dkc-validate --all` resultado | Post S9.T2 |
| Cobertura pipeline write→validate (records totales) | ~80% (SpecTask + SessionBlock) | ~95% (+ Teach, Rule, Decision, SessionShape) | Inventario S1.T1 vs post-S7 | Post S7.GATE |
| Latency p95 pipeline write+validate | N/A (no implementado) | < 500ms para teach files de hasta 1000 lineas | Benchmark S2.T5 + S7.T3 | S2 + S7 |
| Validator throughput dogfood | N/A | >= 50 tickets/sec sobre horadric | Cronometrar `dkc-validate --all` en S8.T2 | Post S8.T2 |
| Trigger `teach on/off` aplicado | 0 (no existe) | >= 1 ticket nuevo usando trigger post-S5 | Frontmatter de tickets post-2026-05-20 | S5 + monitoring 1 semana |
| Falsos positivos validator | N/A | < 5% del corpus horadric | S8.T2 ratio | Post S8.T2 |

## Risks and mitigations

(Riesgos detallados ya en Executive summary. Resumen breve abajo — referencia operacional para reviewer.)

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Schema strict bloquea writes legitimos | Media | Alto | Testing exhaustivo S2 + opt-in flag |
| Audit S4.T1 repite sesgo del primero | Alta | Bajo | Validator de S6 captura por construccion |
| Frente B trivial queda afterthought | Baja | Bajo | S5 dedicado |
| Fix retro 3 closed (DET-6) | Media | Medio | Solo header H2, no discoveries |
| Coverage Rule + Decision crece scope | Media | Alto | Derive a HOR-050 si S2 detecta complejidad mayor |
| Pipeline performance >500ms | Baja | Medio | Precompile + cache + benchmark S2.T5 |
| Frente D shape vs aislado decision pospone fix | Media | Bajo | S4.T3 decide formal antes de S6.T3 |

## Open questions

Resueltas durante intake-explore (Q1-Q6) o por decisiones del Executive summary (1-10). Sin questions abiertas al inicio del execute.

Quedan **3 questions a confirmar empiricamente** (no bloquean inicio):

- **OPEN-1**: ¿Categoria 9 sub-patron B1 (legitimate plan post-activacion) merece su propia RULE separada de RULE-anti-pattern-h2-plan? Decision en S9.T3 al escribir las rules
- **OPEN-2**: ¿El validator deberia tener modo "fix automatico" para B2 (eliminar H2 duplicado) o solo reportar? Decision en S7.T1 al integrar schemas
- **OPEN-3 (nueva, post-D2 2026-05-16)**: ¿El validator/pipeline debe extenderse a **acciones esperadas post-step** (categoria 10: workflow "auto" no ejecutado) ademas de **shapes de markdown** (categoria 9 y previas)? D2 in-vivo demostro que el reindex "auto" no se ejecuto. Si si, S3.T3 (post-write hook) expande scope para tambien disparar acciones declaradas en steps. Si no, queda como follow-up. Decision en S3.T3 al implementar post-write hook

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Un spec transversal vs split por frente

- **Contexto**: scope expandido toca 5 frentes (Original + A + B + C + D). Opciones: 1 spec (este) vs 5 specs separados vs 3 (Original+A+C juntos, B y D derivados)
- **Drivers**: coherencia narrativa para LLM-local prep, dataset coherente, dev pidio "todo en un ticket / todo en un spec" (decision conversacional 2026-05-16)
- **Opcion elegida**: 1 spec transversal
- **Alternativas**: 5 specs (mas mantenible pero fragmenta), derive Frente B/D (perderia unidad de la causa raiz comun)
- **Consecuencias**: Spec grande (~800 lineas) pero coherente. Si emerge complejidad mayor en algun frente, derive en design futuro o S2 si Rule + Decision crece
- **Session**: design (post intake-explore)

### DEC-LOCAL-02: Markdown como SoT canonical (Original)

- **Contexto**: 6 capas competidoras requerian decision
- **Drivers**: markdown sobrevive sin tooling, es lo que dev y LLM tipean, todo lo demas es funcion pura del markdown
- **Opcion elegida**: markdown canonical, SQLite + frontmatter proyecciones derivadas
- **Alternativas**: SQLite canonical (rechazada — opaco, no diff-friendly), capa intermedia abstracta (rechazada — over-engineering)
- **Consecuencias**: Pipeline post-write hook obligatorio para mantener proyecciones frescas. Performance considera incremental updates (no full rebuild en cada write)
- **Session**: design

### DEC-LOCAL-03: Schemas Zod por bloque, no por archivo

- **Contexto**: granularidad del schema teach. Q2 del intake-explore
- **Drivers**: bloques `dkc:*` se reusan entre intake y close. Composicion > duplicacion
- **Opcion elegida**: schema por bloque (`HypothesisMapSchema`, `DecisionMatrixSchema`, `LearningPathSchema`) + schemas composicion (`TeachIntakeSchema = base + sub-blocks opt`)
- **Alternativas**: schema por archivo (rechazada — duplicacion entre intake y close)
- **Consecuencias**: arquitectura mas flexible. Reusable para futuros artefactos (teach de implementacion, teach de incidente, etc.)
- **Session**: design

### DEC-LOCAL-04: Enforcement strict en pipeline

- **Contexto**: Q3 del intake-explore. Strict vs warning
- **Drivers**: lenient deja drift acumulativo (caso historico HOR-040..049). Strict bloquea write si schema falla
- **Opcion elegida**: strict
- **Alternativas**: warning con log (rechazada — drift acumulativo), strict + override flag por ticket (futuro si emerge necesidad)
- **Consecuencias**: testing exhaustivo S2 obligatorio. Schema mal disenado bloqueara LLM hasta fix
- **Session**: design

### DEC-LOCAL-05: Pivot Q1 Frente C — audit retroactivo → validator proactivo

- **Contexto**: audit del agente Explore retorno 0 violaciones criticas en categorias previstas. Discovery D1 in-vivo (+1 categoria nueva) demostro limitacion del audit retrospectivo
- **Drivers**: validator es escalable + detecta lo no anticipado por el auditor
- **Opcion elegida**: pivot a guardarail proactivo. S8 dogfooding es el "audit"
- **Alternativas**: ampliar audit a HOR-020..039 (rechazada — mismo sesgo); ambos (innecesariamente costoso)
- **Consecuencias**: S4.T1 hace re-auditoria intensiva solo de HOR-049 (caso citado). El validator captura el resto en S8
- **Session**: design

### DEC-LOCAL-06: 6 tickets D1 a tasks (no fix retro inline en design)

- **Contexto**: decision conversacional del dev 2026-05-16 tras presentar sub-categorizacion B2/B1
- **Drivers**: cambios con commits + quality review > edits inline durante design
- **Opcion elegida**: defer todo a S9 (post-validator)
- **Alternativas**: fix HOR-048 inline (rechazada por consistencia), fix todos inline (rechazada por overhead)
- **Consecuencias**: 6 tickets quedan con drift hasta S9. Validator de S8 los marca pero dogfood S8 acepta esos warnings esperados (pre-fix)
- **Session**: design

### DEC-LOCAL-07: Numeracion sessions S1-S9 desde Session 0

- **Contexto**: el plan original del intake-explore tenia sub-numeraciones (S1.5, S2.5, S3.5, S3.7) que confunden DET-20
- **Drivers**: DET-20 espera numeracion continua S{N}. Sub-decimales atipicos
- **Opcion elegida**: renumerar a S1-S9 (Session 0 ya consumida = intake-explore)
- **Alternativas**: preservar sub-decimales (rechazada — confunde HC parser y dev)
- **Consecuencias**: spec mas claro. El plan del ticket markdown se actualizara para reflejar S1-S9
- **Session**: design

## Acceptance checkpoints

- [ ] **Funcional REQ-IMPROVE-01**: divergencia frontmatter↔body reportada por validator (scenario REQ-IMPROVE-01 ejecutado)
- [ ] **Funcional REQ-IMPROVE-02**: teach con bloque mal formado bloqueado pre-write (scenario REQ-IMPROVE-02 ejecutado)
- [ ] **Funcional REQ-IMPROVE-03**: categoria 9 detectada en HOR-048 (B2) y NO en HOR-045 (B1 legitimate)
- [ ] **Funcional REQ-IMPROVE-04**: trigger `autopilot on teach off` aplicado sobre ticket fixture genera frontmatter esperado
- [ ] **Funcional REQ-IMPROVE-05**: modal commits abre sin error sobre commit real
- [ ] **Funcional REQ-IMPROVE-06**: 6 tickets D1 limpiados (verificacion visual HC + validator post-S9.T2)
- [ ] **Funcional REQ-IMPROVE-07**: GATE 2 detecta variantes del anti-patron
- [ ] **Regression REQ-PRESERVE-01..05**: todos los scenarios de preservacion validados
- [ ] **Tests**: vitest unit + integration verdes. Coverage delta no degrada
- [ ] **NFRs**: pipeline < 500ms p95, validator throughput >= 50/s, falsos positivos < 5%
- [ ] **Rules nuevas**: RULE-state-sot.md + RULE-anti-pattern-h2-plan.md producidas y validadas con RuleSchema
- [ ] **Integration**: HC carga horadric completo sin error (S8.T3)
- [ ] **Docs**: spec referenciado en frontmatter del ticket. Memorias del dev (`feedback_dkc_session_format.md`, `feedback_hc_fenced_code.md`) referenciadas en RULE-anti-pattern-h2-plan
- [ ] **Quality review final**: dimension 6 (mantenibilidad) confirma ausencia de duplicacion entre schemas
