---
id: SPEC-workflow-directive-enforcement-c-validator-53
project: horadric
ticket: HOR-053
status: done
---

# Directive enforcement frente C — validator post-step para post-conditions verificables

# Directive enforcement frente C — validator post-step para post-conditions verificables

## Executive summary — lo que estas aprobando

### Que se quiere

Crear un nuevo kind `Directive` en `commands/lib/validate.ts` que verifica **post-conditions** (no comandos) sobre artefactos producidos por steps DKC. Hoy 42 directivas declarativas (BLOQUEANTE / MUST sobre el estado del artefacto, no sobre comandos ejecutables) dependen de disciplina del LLM. El frente A (HOR-054 `dkc_enforce_step`) ya cubre ~40% via comandos directos. Este spec implementa el frente C complementario.

El catalogo se materializa como **8-12 checks parametrizados** (no 27-42 checks 1-a-1) gracias a familias abstractas detectadas en el intake (ej. `validate_frontmatter_field(field, expected_values)` cubre 8 directivas con un solo check). Cada directiva en `prompts/steps/*.md` se etiqueta inline con `<!-- enforcement: c-validator check: "{check-id}" args:{json} -->`, y `dkc_enforce_step` extiende su regex para dispatch-ear esos tags al CLI `dkc-validate Directive {step} {ticket}`. Portable cross-host: la logica vive en TS (CLI standalone), no en el MCP tool.

### Decisiones criticas

| # | Decision | Por que |
|---|----------|---------|
| 1 | **Opcion 1 CLI standalone** (AQ2 resuelta) — `commands/lib/validate.ts` kind `Directive` + `dkc_enforce_step` lo invoca como sub-comando shell | Preserva priority_hint "portable cross-host". Reusa motor HOR-046 (0.27ms baseline). MCP tool solo extiende regex (cambio minimo en Python) |
| 2 | **Catalogo de 8-12 checks parametrizados** (AQ1 resuelta) — interface `{checkId, params, run(ticketPath) → CheckResult}` con archivos en `commands/lib/schemas/directive-checks/*.ts` | Refleja distribucion empirica de las 20 familias del intake. Familias top como `frontmatter-field-value` (8 directivas) se cubren con UN solo check parametrizado por `field` + `expected_values[]` |
| 3 | **Tags inline** (AQ3 resuelta) — el tag `<!-- enforcement: c-validator check:"X" args:{...} -->` vive antes de la directiva en el step file, no en catalogo central | Localidad del check con la directiva facilita debugging y mantenimiento. Patron simetrico a los 26 tags `a-hook` ya en uso |
| 4 | **Re-estimacion SP 4 → 5** (AQ4 resuelta) | Volumen real 42 directivas (no ~27) pero parametrizacion compensa el costo de implementacion. SP 5 refleja el delta empirico sin inflar excesivamente |
| 5 | **Incluir check `yaml-strict-no-duplicates` (D12)** | Bug duplicate keys (HOR-046/HOR-050 in-vivo) reincidente. Costo marginal — 1 check adicional al catalogo de 8-12. Alto valor — previene `frontmatter: {}` silencioso del HC server |
| 6 | **S3 marcada `⚑ fuerte`** con quality review exhaustive | Etiquetado masivo (15 archivos + integracion Python MCP) tiene mas surface area para regresion. Gate fuerte forza revision humana antes de declarar coverage completa |

### Riesgos principales y como los mitigamos

| Riesgo | Probabilidad | Impact | Mitigacion |
|--------|--------------|--------|------------|
| **Etiquetado de 42 directivas introduce drift silencioso** en pasos existentes (cambio mecanico × 15 archivos) | Media | Medio | Tags son additivos (HTML comments) — no modifican el flujo del step. Test post-etiquetado: `grep -c "<!-- enforcement: c-validator" prompts/steps/` retorna 42. Self-test S3 antes del gate |
| **Falsos positivos en el corpus actual** — check `frontmatter-field-value` puede flagear tickets legacy con valores stale | Alta | Bajo | C4 condition: zero FP en corpus. Si emergen FP, ajustar `expected_values[]` o agregar override por ticket-id. Skip de legacy tickets pre-2026-05-17 ya implementado en `dkc-validate StepDecisions` (precedente) |
| **Extension `enforcement.py` rompe el MCP tool** | Baja | Alto | Cambio minimo: agregar `C_VALIDATOR_RE` paralelo a `A_HOOK_RE`. No modificar dispatch existente. Test integration: dkc_enforce_step sobre un step con 0 tags c-validator debe comportarse igual que pre-cambio |
| **8-12 checks subestiman el catalogo real** — algunas familias necesitan checks especificos no parametrizables | Media | Bajo | Empezar S2 con 5 checks top-priority (cubren 45% del corpus). Refinar en S3 segun se etiquetan las directivas. Aceptable terminar en 10-15 checks si emergen casos especiales |
| **Latency total degrada cuando se invoca por step con 5+ checks** | Baja | Bajo | Patron `parse-once-validate-many` obligatorio (C1). Baseline 0.27ms × 5 = ~1.5ms total — muy debajo del target 500ms. Si emerge problema: cache de parse en mismo proceso |

### Que NO se hace

- **NO se refactorizan los 26 tags `a-hook` existentes**. Siguen como estan, sin cambios.
- **NO se cubre el frente B** (`b-protocol` fences) — HOR-052 lo cubre como explore separado.
- **NO se migran retroactivamente tickets cerrados**. El etiquetado aplica solo a ejecuciones futuras. El scan historico de duplicate keys (D12) queda como sub-task opcional en S3.
- **NO se modifica la logica de dispatch del MCP tool HOR-054** mas alla del regex extension. La lógica viva en el CLI TS.
- **NO se cambia el formato de los step files** salvo agregar HTML comments. Cero impacto en parsers existentes.

### Tamano estimado

| Session | Objetivo | Tier | Horas |
|---------|----------|------|-------|
| S1 | Diseno catalogo + interface checks + decisiones DEC-LOCAL firmadas | T1 | 1-2h |
| S2 | Implementar kind `Directive` + parser de steps + 5 checks top-priority + tests + benchmark | T2 | 2-3h |
| S3 (⚑ fuerte) | Etiquetar 42 directivas + checks restantes (hasta 8-12) + integracion HOR-054 + medicion empirica zero-FP | T2 | 2-3h |

**Total**: 5-8h efectivas. SP: **5** (subido desde 4 inicial). Sesion mas riesgosa: **S3** por scope cross-modulo (TS CLI + Python MCP + 15 step files).

### Como vas a saber que funciona

- **Baseline pre-implementacion**: 42 directivas c-validator sin enforcement programatico. Drift detectado retroactivamente solo en close del ticket (caso HOR-018/019/020: 20 TCs `pending` cerrados sin reporte). Inline ratio del LLM ~97.5% en HOR-046.
- **Post-implementacion (target medible)**:
  1. `./commands/dkc-validate Directive prompts/steps/{step}.md projects/{project}/tickets/{ticket}.md` retorna `valid: true` cuando el ticket cumple las directivas declaradas, `valid: false` con `errors[]` cuando hay drift
  2. `dkc_enforce_step` dispatch-ea los c-validator post-step y reporta drifts inline al LLM antes del siguiente tool call (cero re-trabajo en close)
  3. Coverage: **>= 80%** del corpus c-validator (34/42) etiquetado y validable
  4. Latency: **< 500ms** por check (target NFR) + **< 1s** total para los 8-12 checks corriendo en serie sobre un ticket tipico
  5. Falsos positivos: **0** en corpus actual (validable correr el suite contra 5-10 tickets recientes cerrados)

## Conditions

Pre-condiciones que el spec asume y que se validan en gates (C4 explicito en S3.GATE):

- **C1** — Baseline empirico HOR-046 (0.27ms parse / 0.13ms detect) se mantiene en validator kind `Directive`. Patron parse-once-validate-many obligatorio (REQ-IMPROVE-01 + NFR latency)
- **C2** — Etiquetado de las 42 directivas en S3 no introduce drift en steps existentes. Tags son additivos (HTML comments). REQ-PRESERVE-01 lo cubre
- **C3** — Extension del MCP tool HOR-054 (regex `C_VALIDATOR_RE` en `enforcement.py`) es minima. La mayor parte de la logica vive en TS CLI standalone (DEC-LOCAL-01)
- **C4** — Zero falsos positivos en corpus actual (15 steps + 5-10 tickets recientes) antes de declarar S3.GATE pass

## Purpose

Convertir 42 directivas declarativas en `prompts/steps/*.md` (BLOQUEANTE/MUST sobre estado del artefacto producido) en checks programaticos verificables que `dkc_enforce_step` ejecuta automatic post-step. Complemento del frente A (HOR-054 hooks-via-comando): C cubre **post-conditions verificables** (~30% segun HOR-050) — el estado del artefacto, no el comando que lo produjo. Pre-requisito de LLM-local end-to-end: sin enforcement programatico de directivas, un host con context chico (Qwen3-local 32K) fallaria mas que Claude 200K.

## Constraints

- **DET-1** (certeza): cada check del catalogo es `confirmed` con su param schema validado. Checks `inferred` (sin schema final) no entran a S2 hasta confirmar
- **DET-2** (source_ref): cada check linkea a las directivas que cubre (1-a-N mapping). Cada task linkea a REQ correspondiente
- **DET-5** (multi-capa): el validator verifica multi-capa cuando aplica (ej. `tc-inline-registration` verifica tabla Test cases + frontmatter override + decisions_log)
- **DET-8** (rollback): cada cambio tiene rollback documentado (`git revert {hash}` para etiquetado, deshabilitar kind `Directive` en switch para CLI)
- **DET-11** (KB-first): catalogo construido sobre el inventario empirico del intake (42 directivas, 20 familias). NO inventar checks sin source en el corpus
- **DET-20** (sessions con gate): 3 sessions con `S{N}.GATE` cierre + quality review tier escalado por tipo
- **DET-23** (quality review): aplicable a S2 (standard) y S3 (exhaustive)
- **DET-25** (TC inline): test cases registrados en el momento de ejecutar, no diferidos al close
- **HOR-046** baseline performance: patron `parse-once-validate-many` obligatorio (C1)
- **HOR-050** plan parent: este spec implementa la Solucion C documentada alli. Cero divergencia conceptual; refinamiento empirico OK (8-12 checks vs 5-10 originales)
- **HOR-054** API estable: cambio minimo en `enforcement.py` (regex paralelo). Cero cambio en signature publica de `dkc_enforce_step`

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-046 schemas + parsers | internal (closed) | Reusa `commands/lib/parsers/markdown.ts` (parseFrontmatterWithDuplicates, etc.) + patron canonical Zod schemas | Bajo — fundacion solida con baseline 0.27ms |
| HOR-054 `dkc_enforce_step` | internal (closed) | Extension regex `C_VALIDATOR_RE` paralelo a `A_HOOK_RE`. Sin cambio en dispatch logic | Bajo — cambio minimo aditivo |
| HOR-055 contratos validators | internal (closed) | Patron de validators completos + audit script (`dkc-audit-validators`). Heredamos el patron | Bajo — alineacion conceptual |
| HOR-050 parent spec | internal (draft) | Solucion C documentada alli. Este spec lo implementa | Nulo — el draft sigue siendo SOT conceptual |
| HOR-051 cross-host explore | internal (closed, explore) | Recomendacion firmada A.6 MCP tool + decision documentada "HOR-053 procede sin cambio" | Nulo — confirmacion explicita |

## Requirements (5 mejoras + 2 regression)

### REQ-IMPROVE-01: Kind `Directive` en `commands/lib/validate.ts`

> **Que cambia**: cuando ejecutas `dkc-validate Directive prompts/steps/teach-intake.md projects/horadric/tickets/HOR-X.md`, el comando lee los tags `<!-- enforcement: c-validator -->` del step y verifica que el ticket cumple cada directiva. Antes solo habia 17 kinds — ninguno verificaba post-conditions de steps.
> **Por que**: las 42 directivas tipo "todas las tasks marcadas con [x]" o "frontmatter teachings.intake === done" dependian de disciplina del LLM. Sin enforcement programatico, el drift se descubria retroactivamente al close (caso HOR-018/019/020).

El sistema MUST implementar `validateDirective(stepPath: string, ticketPath: string, strict: boolean): ValidationResult` siguiendo el patron canonical de los 17 kinds existentes. El handler del case 18 en `main()` debe aceptar argumentos `<step-path> <ticket-path>` y retornar el JSON canonico `{valid, schema: 'Directive', file, records_validated, errors[], warnings[]}`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: step sin tags c-validator
- **GIVEN** `prompts/steps/foo.md` sin ningun tag `<!-- enforcement: c-validator -->`
- **WHEN** `dkc-validate Directive foo.md ticket.md`
- **THEN** retorna `{valid: true, records_validated: 0, warnings: [{path: '_meta', message: 'no c-validator tags found'}]}`

#### Scenario: step con tags y ticket cumple
- **GIVEN** step con 2 tags c-validator (`frontmatter-field-value teachings.intake done` + `plan-sessions-present`)
- **AND** ticket con `teachings.intake: done` + `### Plan de sessions` no vacia
- **WHEN** `dkc-validate Directive step.md ticket.md`
- **THEN** retorna `{valid: true, records_validated: 2, errors: []}`

#### Scenario: step con tags y ticket NO cumple
- **GIVEN** mismo step que arriba
- **AND** ticket con `teachings.intake: pending`
- **WHEN** `dkc-validate Directive step.md ticket.md --strict`
- **THEN** retorna `{valid: false, errors: [{path: 'teachings.intake', message: 'expected one of [done, skipped], received pending', recordId: 'frontmatter-field-value:teachings.intake'}]}`

</details>

### REQ-IMPROVE-02: Catalogo de 8-12 checks parametrizados

> **Que cambia**: cuando agregues un nuevo check al catalogo, vas a crear UN solo archivo `commands/lib/schemas/directive-checks/{check-id}.ts` exportando una interface `Check<TParams>` que el kind `Directive` invoca con los args del tag. Hoy no existe ningun check c-validator.
> **Por que**: las 42 directivas se agrupan en 20 familias (intake D15), pero parametrizables como 8-12 checks. Un archivo por check (no por directiva individual) baja el costo de mantenimiento.

El sistema MUST exponer el catalogo bajo `commands/lib/schemas/directive-checks/` con la interface comun:

```typescript
interface DirectiveCheck<TParams = unknown> {
  checkId: string                                    // ej. "frontmatter-field-value"
  paramsSchema: z.ZodType<TParams>                  // valida args del tag
  run(ticketPath: string, params: TParams): CheckResult
}
type CheckResult = { ok: true } | { ok: false; errors: ValidationError[] }
```

El catalogo inicial **MUST incluir como minimo**:

| # | Check | Cubre familias del intake | Args (params) |
|---|-------|---------------------------|---------------|
| 1 | `frontmatter-field-value` | `frontmatter-field-value` (8 directivas) | `{field: string, expected_values: string[]}` |
| 2 | `tc-inline-registration` | `tc-inline-registration` + `tc-evidence-present` (5) | `{columns_required?: string[]}` |
| 3 | `teach-file-complete` | `teach-file-complete` (4) | `{kind: 'intake' \| 'close', blocks_required: string[]}` |
| 4 | `plan-sessions-present` | `plan-sessions-present` (3) | `{check_anti_pattern: boolean}` |
| 5 | `session-log-inline-per-task` | `session-log-inline-per-task` (3) | `{require_quality_review?: boolean}` |
| 6 | `gate-decision-marked` | `gate-decision-marked` + `mcp-calls-executed` (5) | `{session_pattern?: string}` |
| 7 | `quality-review-block-present` | `quality-review-block-present` (2) | `{dimensions_required?: number}` |
| 8 | `yaml-strict-no-duplicates` | D12 (capturado en this spec) | `{}` (target = frontmatter del ticket) |

Checks 9-12 (opcionales segun se etiquetan en S3): `triage-no-pending-hypothesis`, `spec-task-schema-valid`, `reindex-post-gate-applied`, `backlog-item-complete`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: check valido con params correctos
- **GIVEN** tag `<!-- enforcement: c-validator check:"frontmatter-field-value" args:{"field":"teachings.intake","expected_values":["done","skipped"]} -->`
- **WHEN** validator parsea el tag y busca el check en catalogo
- **THEN** invoca `run(ticketPath, {field: 'teachings.intake', expected_values: ['done', 'skipped']})` y retorna su CheckResult

#### Scenario: tag con check-id desconocido
- **GIVEN** tag con `check:"check-fantasma"` (no en catalogo)
- **WHEN** validator parsea el tag
- **THEN** retorna warning `{path: 'tag.checkId', message: 'unknown check: check-fantasma'}` y no falla (forward-compat)

#### Scenario: params invalidos al schema
- **GIVEN** tag con `args:{"field":42}` (numero en vez de string)
- **WHEN** validator parsea params via Zod schema del check
- **THEN** retorna error `{path: 'tag.params', message: 'expected string, received number', recordId: 'frontmatter-field-value'}`

</details>

### REQ-IMPROVE-03: Etiquetado de 42 directivas inline en `prompts/steps/*.md`

> **Que cambia**: vas a ver 42 nuevos HTML comments `<!-- enforcement: c-validator check:"..." args:{...} -->` antes de las directivas BLOQUEANTE/MUST en 15 archivos `prompts/steps/*.md`. La prosa de las directivas no cambia.
> **Por que**: la prosa sola no es enforced. El tag inline le permite a `dkc-validate Directive` saber que verificar y como. Patron simetrico a los 26 tags `a-hook` ya en uso.

El sistema MUST etiquetar las 42 directivas identificadas en el inventario empirico del intake (D14) con tags `<!-- enforcement: c-validator check:"{checkId}" args:{params-json} -->` antes de la prosa de cada directiva. El tag MUST quedar adyacente (linea inmediatamente anterior) a la directiva que enforces.

Cobertura minima MUST: **>= 80% (34/42 directivas)**. Las directivas no cubiertas quedan documentadas en open questions del spec o en backlog del ticket para iteracion futura.

<details><summary>Scenarios de validacion</summary>

#### Scenario: etiquetado completo en un step
- **GIVEN** `prompts/steps/teach-intake.md` con 3 directivas c-validator identificadas en intake
- **WHEN** S3 termina y se ejecuta `grep -c "<!-- enforcement: c-validator" prompts/steps/teach-intake.md`
- **THEN** retorna `3`

#### Scenario: cobertura global
- **GIVEN** S3 termina
- **WHEN** `grep -rc "<!-- enforcement: c-validator" prompts/steps/ | awk -F: '{s+=$2} END {print s}'`
- **THEN** retorna >= 34 (80% de 42)

</details>

### REQ-IMPROVE-04: Integracion con HOR-054 `dkc_enforce_step` (regex `C_VALIDATOR_RE`)

> **Que cambia**: cuando un step se cierra y el LLM (o el harness) invoca `dkc_enforce_step`, el MCP tool ahora detecta tambien los tags c-validator (no solo a-hook) y dispatch-ea cada uno al CLI `dkc-validate Directive`. Hoy solo a-hook se enforces.
> **Por que**: sin esta extension, los 42 tags c-validator serian inertes — el catalogo CLI funcionaria pero nadie lo invocaria automatic. Patron unificado: `dkc_enforce_step` es el unico punto de entrada para enforcement post-step.

El sistema MUST extender `server/src/deckard_cain/tools/enforcement.py` agregando un segundo regex `C_VALIDATOR_RE = re.compile(r'<!-- enforcement: c-validator check:"([^"]+)"(?: args:(\{[^>]*\}))? -->')` y procesando esos matches **adicionalmente** a los matches de `A_HOOK_RE`. Para cada match c-validator, el tool MUST construir el comando `./commands/dkc-validate Directive {step_path} {ticket_path}` y ejecutarlo via el mismo `subprocess.run` que ya usa para a-hook. El output del CLI (JSON) MUST agregarse al `executed[]` del return del MCP tool con `kind: 'c-validator'`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: step con mix a-hook + c-validator
- **GIVEN** step con 2 tags a-hook + 3 tags c-validator
- **WHEN** invocas `dkc_enforce_step(file_path=step, ticket_id="HOR-X")`
- **THEN** `executed[]` retorna 5 entries (2 a-hook + 3 c-validator) con `kind` distinguido

#### Scenario: regex es paralelo, no reemplazo
- **GIVEN** step pre-cambio con 5 tags a-hook
- **WHEN** invocas `dkc_enforce_step` post-cambio
- **THEN** comportamiento identico al pre-cambio (a-hook procesados igual, ningun c-validator detectado)

</details>

### REQ-IMPROVE-05: Check `yaml-strict-no-duplicates` (captura D12)

> **Que cambia**: cuando el LLM cierra un ticket y deja `closed: '2026-XX-XX'` + `closed: null` legacy (bug observado 2x en HOR-046/HOR-050), el validator detecta la duplicate key antes que el HC server falle silenciosamente devolviendo `frontmatter: {}`.
> **Por que**: `gray-matter` (parser del HC server) rechaza duplicate keys. SQLite es mas permisivo y tiene la data → listing funciona pero detail rompe. Bug ya pico 2 veces in-vivo y se fix-eo manualmente. Cero costo agregar el check al catalogo de C.

El sistema MUST agregar el check `yaml-strict-no-duplicates` al catalogo. El check usa `parseFrontmatterWithDuplicates` (ya existe en `parsers/markdown.ts`) y reporta error por cada duplicate key detectada. No requiere params (target implicito = frontmatter del ticket).

Sub-task opcional en S3: scan corpus historico de tickets cerrados con este check (~5-10 tickets afectados estimados). Resultado va a backlog del ticket, no a fix retroactivo automatico.

### REQ-PRESERVE-01: 26 tags `a-hook` existentes intactos

> **Que cambia**: nada. Los 26 tags `<!-- enforcement: a-hook command:"..." -->` siguen funcionando exactamente igual. `dkc_enforce_step` los procesa con el mismo `A_HOOK_RE` y mismo dispatch.
> **Por que**: cero breaking change. Sumar c-validator es ortogonal al a-hook existente.

El sistema MUST preservar los 26 tags `a-hook` actuales. NO modificar:
- Texto, posicion, o args de los tags `a-hook`
- Logica de `A_HOOK_RE` en `enforcement.py`
- Dispatch de los comandos a-hook (subprocess + truncado stdout/stderr a 500 chars)
- Comportamiento de `dkc_enforce_step` cuando se invoca sobre un step con 0 tags c-validator

Test de regresion: ejecutar `dkc_enforce_step` sobre `prompts/steps/request-close.md` (10 tags a-hook) pre-cambio y post-cambio. El `executed[]` retornado MUST tener identica estructura (mismos comandos, mismos exit codes esperados sobre mismo ticket).

### REQ-PRESERVE-02: Patron canonical de kinds en `validate.ts` preservado

> **Que cambia**: nada. El kind `Directive` sigue el mismo patron de los 17 kinds existentes — `validate{Kind}(file, strict) → ValidationResult` con shape canonico `{valid, schema, file, records_validated, errors[], warnings[]}`.
> **Por que**: HC viewer + dkc_enforce_step + cualquier consumer del JSON dependen del shape canonico. Romper el shape rompe todos los consumers downstream.

El sistema MUST preservar:
- Shape canonico del output `{valid, schema, file, records_validated, errors[], warnings[]}`
- Estructura `ValidationError = {path, message, expected?, received?, recordId?}`
- Dispatch en `main()` via `args.kind === '...'` (NO refactor de `main` para esta task)
- Bash wrapper `commands/dkc-validate` invocando `npx tsx validate.ts` (NO cambiar wrapper)

## NFRs

| Tipo | Current | Target | How to measure |
|------|---------|--------|----------------|
| Latency por check (`Directive` kind) | N/A (no existe) | < 500ms p95 | Inline bench en S2.T4 con `performance.now()` × 100 iteraciones por check |
| Latency total `dkc-validate Directive` (8-12 checks) | N/A | < 1s total para step con 5+ tags | Idem, sobre step real con 5+ tags etiquetados en S3 |
| Cobertura del corpus c-validator | 0/42 = 0% | >= 80% (34/42) | `grep -rc "<!-- enforcement: c-validator" prompts/steps/` post-S3 |
| Falsos positivos en corpus actual | N/A | 0 sobre 5-10 tickets recientes | Correr `dkc-validate Directive` sobre tickets reales + revisar `errors[]` |
| Inline ratio post-implementacion (medible en 2-3 tickets futuros) | ~97.5% (HOR-046 baseline) | < 30% | Medir Agent calls vs inline en 2-3 tickets nuevos post-merge |

## Changes

### Modified: `commands/lib/validate.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Kinds soportados | 17 (SpecTask, Teach, Ticket, ...) | 18 (+ `Directive`) | Habilita validacion de directivas c-validator |
| Args del CLI | `<kind> <file> [opts]` | `<kind> <file> [<extra-file>] [opts]` | `Directive` necesita 2 paths: step + ticket. Mantener compat: kinds existentes ignoran extra-file |
| Dispatch en `main()` | 17 casos | 18 casos (else-if nuevo) | Patron canonical preservado |

### Modified: `commands/lib/parsers/markdown.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Parsers exportados | 12 (parseSpecTasks, parseTicket, ...) | 13 (+ `parseStepDirectives`) | Necesario para extraer tags c-validator de step files |
| `parseStepDirectives(filePath)` | N/A | retorna `ParsedDirective[]` con `{tagPosition, checkId, paramsJson, paramsParsed, directiveSnippet}` | Patron simetrico a `parseTeachFile` que extrae bloques `dkc:*` |

### Added: `commands/lib/schemas/directive.ts`

| Field | Value | Purpose |
|-------|-------|---------|
| `DirectiveTagSchema` | Zod schema | Valida shape de un tag parseado (`checkId: string, args: unknown`) |
| `validateDirective(stepPath, ticketPath, strict)` | funcion | Entry point del kind. Parsea step, resuelve checks del catalogo, invoca `run` de cada uno, agrega errores/warnings |
| Self-test inline | `if (import.meta.url === ...)` | Patron canonical heredado (7+ casos cubriendo happy path + tag-no-cerrado + check-fantasma + params-invalidos) |

### Added: `commands/lib/schemas/directive-checks/*.ts`

Un archivo por check del catalogo (8 mandatorios + 4 opcionales):

| Archivo | checkId | Cubre | Tests inline |
|---------|---------|-------|--------------|
| `frontmatter-field-value.ts` | `frontmatter-field-value` | 8 directivas | >= 5 (happy + valor incorrecto + campo ausente + multi-value + nested key) |
| `tc-inline-registration.ts` | `tc-inline-registration` | 5 directivas | >= 5 |
| `teach-file-complete.ts` | `teach-file-complete` | 4 directivas | >= 4 |
| `plan-sessions-present.ts` | `plan-sessions-present` | 3 directivas | >= 4 (incluye anti-patron H2) |
| `session-log-inline-per-task.ts` | `session-log-inline-per-task` | 3 directivas | >= 4 |
| `gate-decision-marked.ts` | `gate-decision-marked` | 5 directivas | >= 5 |
| `quality-review-block-present.ts` | `quality-review-block-present` | 2 directivas | >= 3 |
| `yaml-strict-no-duplicates.ts` | `yaml-strict-no-duplicates` | D12 (1 check para ~5-10 tickets afectados estimados) | >= 3 |

Opcionales en S3 segun se etiquetan: `triage-no-pending-hypothesis.ts`, `spec-task-schema-valid.ts`, `reindex-post-gate-applied.ts`, `backlog-item-complete.ts`.

### Added: tags `<!-- enforcement: c-validator check:"X" args:{...} -->` en 15 archivos `prompts/steps/*.md`

42 tags totales distribuidos segun inventario empirico del intake:
- `request-execute.md` — 10
- `request-close.md` — 8
- `_design-shared.md` — 5
- `intake-explore.md` — 4
- `teach-intake.md` — 3
- `teach-close.md` — 3
- `design-refactor.md` — 3
- `transcript-extract.md`, `transcript-recall.md`, `design-transition-to-execute.md`, `request-intake.md`, otros — 1-2 cada uno

### Modified: `server/src/deckard_cain/tools/enforcement.py`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Regex parseados | `A_HOOK_RE` only | `A_HOOK_RE` + `C_VALIDATOR_RE` | Cubrir el frente C ademas del A |
| Comandos dispatch-eados | `cmd` del tag a-hook | + `./commands/dkc-validate Directive {step_path} {ticket_path}` por cada tag c-validator | Reusa CLI standalone (Opcion 1 AQ2) |
| Shape del return | `executed[]` con `{cmd, exit_code, stdout, stderr, duration_ms}` | + campo `kind: 'a-hook' \| 'c-validator'` por entry | Permite al consumer (LLM) distinguir |

## Technical reference

Refinamiento detallado del diseno producido en S1.T1 + S1.T3. Esta seccion documenta interfaces TypeScript + regex paralelos TS/Python + sample del primer check. Sirve como contrato para S2 (implementacion).

### Interface canonical `DirectiveCheck<TParams>`

Cada check del catalogo `commands/lib/schemas/directive-checks/{checkId}.ts` exporta una instancia de `DirectiveCheck<TParams>`:

```typescript
// commands/lib/schemas/directive-checks/_types.ts (compartido)
import { z } from 'zod'
import type { ValidationError } from '../../validate.ts'

export type CheckResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] }

export interface DirectiveCheck<TParams = unknown> {
  /** Id estable del check, referenciado en el tag inline `<!-- enforcement: c-validator check:"X" -->` */
  checkId: string
  /** Schema Zod para validar `args:{...}` del tag */
  paramsSchema: z.ZodType<TParams>
  /** Ejecuta el check contra el ticket. Recibe path absoluto al ticket + params ya parseados */
  run(ticketPath: string, params: TParams): CheckResult
}
```

### Sample check — `frontmatter-field-value` (S1.T1 output)

Primer check del catalogo. Cubre 8 directivas de la familia top-1 del intake (D15).

```typescript
// commands/lib/schemas/directive-checks/frontmatter-field-value.ts
import { z } from 'zod'
import { readFileSync } from 'fs'
import { parseFrontmatterWithDuplicates } from '../../parsers/markdown.ts'
import type { DirectiveCheck, CheckResult } from './_types.ts'

const ParamsSchema = z.object({
  /** Path dotted al campo del frontmatter (ej. "teachings.intake", "draft_approved") */
  field: z.string().min(1),
  /** Valores aceptables. Si el valor real no esta en la lista → error */
  expected_values: z.array(z.union([z.string(), z.boolean(), z.null()])).min(1),
})

type Params = z.infer<typeof ParamsSchema>

export const frontmatterFieldValueCheck: DirectiveCheck<Params> = {
  checkId: 'frontmatter-field-value',
  paramsSchema: ParamsSchema,
  run(ticketPath, params): CheckResult {
    const md = readFileSync(ticketPath, 'utf-8')
    const { values } = parseFrontmatterWithDuplicates(md)
    const actual = getDottedField(values, params.field)
    if (params.expected_values.includes(actual as never)) {
      return { ok: true }
    }
    return {
      ok: false,
      errors: [{
        path: `frontmatter.${params.field}`,
        message: `expected one of [${params.expected_values.join(', ')}], received ${JSON.stringify(actual)}`,
        expected: params.expected_values,
        received: actual,
        recordId: `frontmatter-field-value:${params.field}`,
      }],
    }
  },
}

function getDottedField(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (typeof cur !== 'object' || cur === null) return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

// Self-test inline (patron canonical HOR-046 — sin vitest)
if (import.meta.url === `file://${process.argv[1]}`) {
  const tmp = '/tmp/_test-fff.md'
  const { writeFileSync, unlinkSync } = await import('fs')

  const tests: Array<[string, string, () => void]> = [
    ['happy path — teachings.intake done', '---\nteachings: { intake: done }\n---\nbody', () => {
      writeFileSync(tmp, '---\nteachings: { intake: done }\n---\nbody')
      const r = frontmatterFieldValueCheck.run(tmp, { field: 'teachings.intake', expected_values: ['done', 'skipped'] })
      if (!r.ok) throw new Error('expected ok, got errors: ' + JSON.stringify(r.errors))
    }],
    ['valor incorrecto', '---\nteachings: { intake: pending }\n---\nbody', () => {
      writeFileSync(tmp, '---\nteachings: { intake: pending }\n---\nbody')
      const r = frontmatterFieldValueCheck.run(tmp, { field: 'teachings.intake', expected_values: ['done', 'skipped'] })
      if (r.ok) throw new Error('expected error, got ok')
      if (!r.errors[0].message.includes('received "pending"')) throw new Error('mensaje incorrecto')
    }],
    ['campo ausente', '---\n---\nbody', () => {
      writeFileSync(tmp, '---\n---\nbody')
      const r = frontmatterFieldValueCheck.run(tmp, { field: 'teachings.intake', expected_values: ['done'] })
      if (r.ok) throw new Error('expected error, got ok')
    }],
    // ...etc 5+ casos
  ]
  for (const [name, , fn] of tests) {
    try { fn(); console.log(`✓ ${name}`) }
    catch (e) { console.log(`✗ ${name}: ${(e as Error).message}`); process.exit(1) }
    finally { try { unlinkSync(tmp) } catch {} }
  }
}
```

### Formato del tag `<!-- enforcement: c-validator -->`

```html
<!-- enforcement: c-validator check:"{checkId}" args:{json-inline} -->
```

Componentes:
- `checkId` — string sin espacios, referencia al archivo `directive-checks/{checkId}.ts`. **Obligatorio**.
- `args:{...}` — JSON inline con params del check. **Opcional** (algunos checks no requieren params, ej. `yaml-strict-no-duplicates`).

Ejemplos reales (proyectados en S3):

```html
<!-- enforcement: c-validator check:"frontmatter-field-value" args:{"field":"teachings.intake","expected_values":["done","skipped"]} -->
**BLOQUEANTE**: `teachings.intake === 'done'` o `'skipped'` con justificacion.

<!-- enforcement: c-validator check:"yaml-strict-no-duplicates" -->
**BLOQUEANTE**: el frontmatter del ticket NO debe tener keys duplicadas (D12).

<!-- enforcement: c-validator check:"plan-sessions-present" args:{"check_anti_pattern":true} -->
[ ] Sub-seccion `### Plan de sessions` existe DENTRO de `## Sessions`
[ ] `## Plan de sessions` (H2 paralelo) NO existe (anti-patron)
```

### Regex paralelos TS/Python (S1.T3 output)

**TypeScript** (`commands/lib/parsers/markdown.ts` → nueva funcion `parseStepDirectives`):

```typescript
const C_VALIDATOR_RE = /<!--\s*enforcement:\s*c-validator\s+check:"([^"]+)"(?:\s+args:(\{[^>]*?\}))?\s*-->/g

export interface ParsedDirective {
  tagLine: number              // 1-indexed line del tag
  checkId: string
  argsJson: string | undefined
  argsParsed: unknown          // JSON.parse(argsJson), o undefined si args ausente
  directiveSnippet: string     // primera linea de la directiva siguiente (para reporting)
}

export function parseStepDirectives(filePath: string): ParsedDirective[] {
  const md = readFileSync(filePath, 'utf-8')
  const lines = md.split('\n')
  const out: ParsedDirective[] = []
  for (let i = 0; i < lines.length; i++) {
    C_VALIDATOR_RE.lastIndex = 0
    const m = C_VALIDATOR_RE.exec(lines[i])
    if (!m) continue
    const [, checkId, argsJson] = m
    out.push({
      tagLine: i + 1,
      checkId,
      argsJson,
      argsParsed: argsJson ? safeJsonParse(argsJson) : undefined,
      directiveSnippet: (lines[i + 1] ?? '').slice(0, 200),
    })
  }
  return out
}

function safeJsonParse(s: string): unknown {
  try { return JSON.parse(s) } catch { return undefined }
}
```

**Python** (`server/src/deckard_cain/tools/enforcement.py` → agregar paralelo a `A_HOOK_RE`):

```python
# Existente (no tocar)
A_HOOK_RE = re.compile(r'<!-- enforcement: a-hook command: "([^"]+)" -->')

# Nuevo (S3.T4)
C_VALIDATOR_RE = re.compile(
    r'<!--\s*enforcement:\s*c-validator\s+check:"([^"]+)"(?:\s+args:(\{[^>]*?\}))?\s*-->'
)
```

### Tests mentales del regex

| Input | TS captura | Python captura | Status |
|-------|-----------|----------------|--------|
| `<!-- enforcement: c-validator check:"X" args:{"f":"v"} -->` | `checkId=X, argsJson={"f":"v"}` | match `('X', '{"f":"v"}')` | ✓ happy |
| `<!-- enforcement: c-validator check:"X" -->` (sin args) | `checkId=X, argsJson=undefined` | match `('X', None)` | ✓ sin args |
| `<!-- enforcement: c-validator   check:"X"   args:{} -->` (multi-space) | match | match | ✓ tolerante a espacios |
| `<!-- enforcement: a-hook command:"./foo" -->` (otro tipo) | no match | no match `C_VALIDATOR_RE` | ✓ paralelo (no overlap) |
| `<!--enforcement:c-validator check:"X"-->` (sin espacios alrededor del comment) | no match (requiere `\s+` post `enforcement:`) | idem | ⚠ rigid — by design (formato canonical) |
| `<!-- enforcement: c-validator check:"X" args:{"a":"b","c":">"} -->` (`>` en args) | match `args:{"a":"b","c":">"` — args trunca en `>` del comment | idem | ⚠ edge case — usar `&gt;` o evitar `>` en string args |

**Por que `[^>]*?` lazy en argsJson**: evitar over-matching cuando el JSON tiene caracteres especiales. Trade-off: si el args legitimamente contiene `>` (ej. `expected: ">=5"`), el regex trunca. Mitigacion: dev usa `&gt;` o cuota el valor.

### Patron `parse-once-validate-many` (C1 conditional)

El kind `Directive` MUST parsear el step file una sola vez por invocacion del CLI. La iteracion sobre `parsedDirectives[]` invoca `check.run(ticketPath, params)` por cada uno SIN re-parsear. Cada `check.run` parsea el ticket file por su cuenta (los checks son independientes y pueden parsear distinto target — frontmatter, body, tablas, etc.). El parser del ticket usa caching interno si emerge bottleneck en S2.T5 benchmark.

Baseline esperado:
- `parseStepDirectives` × 1 invocacion ≈ 0.5ms (similar a `parseTeachFile`)
- `check.run` por check ≈ 0.5-2ms (segun complejidad)
- Total para step con 5 tags + 5 checks: ~5-10ms — muy por debajo del NFR < 500ms

## Tasks

### Session 1 — Diseno catalogo + decisiones DEC-LOCAL firmadas [tier: T1] [tipo: auto]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Diseno detallado de interface `DirectiveCheck<TParams>` + sample TypeScript code del primer check (`frontmatter-field-value`) como referencia para los demas | REQ-IMPROVE-02 | architect | — | spec markdown (esta seccion) | Interface documentada en spec con tipos Zod completos. Code sample compilable mentalmente (no requiere ejecucion en S1) | git revert | DET-1, DET-2 | done | 1 |
| S1.T2 | Catalogo definitivo de 8 checks mandatorios + 4 opcionales con params schema + familias cubiertas (extension de la tabla en REQ-IMPROVE-02) | REQ-IMPROVE-02 | architect | S1.T1 | spec markdown | Tabla en spec con 12 filas (8+4). Cada fila linkea a las directivas concretas del inventario D14/D15 | git revert | DET-1, DET-2, DET-11 | done | 1 |
| S1.T3 | Diseno del formato del tag c-validator: `<!-- enforcement: c-validator check:"X" args:{JSON} -->` + regex de captura en TS + paralelo en Python (C_VALIDATOR_RE) | REQ-IMPROVE-04 | architect | S1.T2 | spec markdown | Regex documentado con tests inline mentales (3+ casos: tag valido, tag sin args, tag mal formado). Compatible con A_HOOK_RE (no overlap) | git revert | DET-1, DET-2 | done | 1 |
| S1.T4 | Firma DEC-LOCAL-01 (Opcion 1 CLI standalone) + DEC-LOCAL-02 (catalogo 8-12 parametrizado) + DEC-LOCAL-03 (tags inline) + DEC-LOCAL-04 (SP 4→5) + DEC-LOCAL-05 (incluir yaml-strict-no-duplicates) | AQ1-AQ4 + D12 | architect | S1.T3 | spec markdown (seccion Decisions) | 5 DEC-LOCAL escritas con contexto + drivers + opcion elegida + alternativas + consecuencias + session | git revert | DET-1 | done | 1 |
| S1.GATE | Gate Session 1 (auto, T1): catalogo + decisiones firmadas. Quality review DET-23 light: dim 1 (calidad) + dim 7 (claridad) | — | reviewer | S1.T1-T4 | spec markdown | Spec sigue valid via `dkc-validate SpecFull`. Catalogo completo con 8 checks mandatorios. Decisiones documentadas sin TBD. Decision continue/iterate | git revert | DET-13, DET-14, DET-20, DET-23 | done | 1 |

### Session 2 — Implementar kind `Directive` + parser + 5 checks top-priority + tests + benchmark [tier: T2] [tipo: auto]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Implementar `parseStepDirectives(filePath)` en `commands/lib/parsers/markdown.ts` + self-tests inline (5+ casos: happy, tag-sin-args, tag-mal-formado, multi-tags, sin-tags) | REQ-IMPROVE-01, REQ-IMPROVE-04 | developer | S1.GATE | `commands/lib/parsers/markdown.ts` | Self-test pasa con `tsx commands/lib/parsers/markdown.ts`. Coverage: 5 casos pass | git revert | DET-5, DET-10 | done | 2 |
| S2.T2 | Implementar `commands/lib/schemas/directive.ts` con `DirectiveTagSchema` + `validateDirective(stepPath, ticketPath, strict)` + self-tests inline (7+ casos del REQ-IMPROVE-01 scenarios) | REQ-IMPROVE-01 | developer | S2.T1 | `commands/lib/schemas/directive.ts` | Self-test pasa con `tsx commands/lib/schemas/directive.ts`. JSON output matches shape canonical. Patron canonical respetado | git revert | DET-5, DET-8, DET-10, DET-11 | done | 2 |
| S2.T3 | Implementar 5 checks top-priority: `frontmatter-field-value.ts`, `tc-inline-registration.ts`, `teach-file-complete.ts`, `plan-sessions-present.ts`, `gate-decision-marked.ts` con self-tests inline (>= 4 casos cada uno) | REQ-IMPROVE-02 | developer | S2.T2 | `commands/lib/schemas/directive-checks/*.ts` (5 archivos) | Cada check pasa self-test. Coverage acumulado: 22 directivas (top-5 familias = 45% del corpus) | git revert por archivo | DET-5, DET-8, DET-10, DET-11 | done | 2 |
| S2.T4 | Registrar case `Directive` en `validate.ts main()`. Agregar argv parsing para `<extra-file>` (compat con kinds existentes). Self-test integration: `tsx validate.ts Directive {step} {ticket}` invocacion end-to-end | REQ-IMPROVE-01, REQ-PRESERVE-02 | developer | S2.T3 | `commands/lib/validate.ts` | Help text actualizado. Integration test: `dkc-validate Directive {sample-step} {sample-ticket}` retorna shape canonical | git revert | DET-5, DET-8, DET-10 | done | 2 |
| S2.T5 | Benchmark inline: cronometrar `parseStepDirectives` + cada uno de los 5 checks × 100 iter. Reportar p50/p95 por check. Validar < 500ms p95 por check | REQ-IMPROVE-01 NFR | researcher | S2.T4 | inline bench script | Reporte numerico en TC table. p95 < 500ms confirmado. Patron parse-once-validate-many demostrable | N/A (solo medicion) | DET-13 | done | 2 |
| S2.T6 | TC inline registration (DET-25) de TC-1 a TC-10 cubriendo REQ-IMPROVE-01 + REQ-IMPROVE-02 con scenarios concretos | DET-25 | scribe | S2.T5 | ticket markdown (## Test cases) | 10 filas en tabla TC con Actual/Evidence/Status/Session/Cambios rellenos | git revert | DET-7, DET-25 | done | 2 |
| S2.GATE | Gate Session 2 (auto, T2): kind funcional + 5 checks + tests + benchmark + TCs registrados. Quality review DET-23 standard: dim 1+2+3+4+6+7+10 | — | reviewer | S2.T1-T6 | spec + ticket | `dkc-validate Directive` retorna valid JSON. 5 checks pasan tests. Benchmark < 500ms p95. Coverage delta `commands/lib/` no degrada. Quality review pass. Decision continue/iterate | git revert por task | DET-13, DET-14, DET-20, DET-23, DET-25 | done | 2 |

### Session 3 — Etiquetar 42 directivas + checks restantes + integracion HOR-054 + medicion empirica [tier: T2] [tipo: ⚑ fuerte]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Implementar 3 checks restantes mandatorios: `session-log-inline-per-task.ts`, `quality-review-block-present.ts`, `yaml-strict-no-duplicates.ts` con self-tests inline | REQ-IMPROVE-02, REQ-IMPROVE-05 | developer | S2.GATE | `commands/lib/schemas/directive-checks/*.ts` (3 archivos) | Cada check pasa self-test. Coverage acumulado: 8 checks mandatorios cubren 30+ directivas (~75% del corpus) | git revert por archivo | DET-5, DET-8, DET-10, DET-11 | done | 3 |
| S3.T2 | Etiquetar 42 directivas en 15 archivos `prompts/steps/*.md` con tags `<!-- enforcement: c-validator check:"X" args:{...} -->`. Distribucion: request-execute (10), request-close (8), _design-shared (5), intake-explore (4), teach-{intake,close} (3+3), design-refactor (3), otros (6) | REQ-IMPROVE-03 | architect | S3.T1 | 15 archivos prompts/steps/*.md | `grep -rc "<!-- enforcement: c-validator" prompts/steps/` retorna >= 34 (80% cover). Cada tag inmediatamente antes de su directiva (verificable inspeccion) | git revert por archivo | DET-2, DET-11, DET-16 | done | 3 |
| S3.T3 | Implementar checks opcionales segun emergan en etiquetado: `triage-no-pending-hypothesis.ts`, `spec-task-schema-valid.ts`, `reindex-post-gate-applied.ts`, `backlog-item-complete.ts` (0-4 archivos segun necesidad) | REQ-IMPROVE-02 | developer | S3.T2 | `commands/lib/schemas/directive-checks/*.ts` (0-4 archivos) | Self-tests pasan. Coverage final: 80%+ verificable | git revert por archivo | DET-5, DET-8, DET-10 | done | 3 |
| S3.T4 | Extender `server/src/deckard_cain/tools/enforcement.py` con `C_VALIDATOR_RE` paralelo a `A_HOOK_RE`. Para cada match construir cmd `./commands/dkc-validate Directive {step} {ticket}` y dispatch via subprocess. Agregar campo `kind` al return. Test regresion: dkc_enforce_step sobre step solo-a-hook funciona identico | REQ-IMPROVE-04, REQ-PRESERVE-01 | developer | S3.T3 | `server/src/deckard_cain/tools/enforcement.py` + pytest local | Test pytest pass (incluyendo regresion a-hook intacto). Manual smoke: dkc_enforce_step via MCP sobre step con mix tags retorna executed[] con `kind` distinguido | git revert | DET-5, DET-8, DET-10, DET-11, DET-16 | done | 3 |
| S3.T5 | Medicion empirica zero-FP: correr `dkc-validate Directive` sobre 5-10 tickets recientes (HOR-052..HOR-061) × steps relevantes. Reportar drifts detectados + clasificacion legacy vs real. Target: zero FP (C4 condition) | NFR falsos positivos | researcher | S3.T4 | scratchpad o session log | Reporte numerico de drifts por ticket × step. Si FP detectado: clasificar legacy (override) vs bug del check (fix antes de gate) | N/A (medicion) | DET-13 | done | 3 |
| S3.T6 | TC inline registration (DET-25) de TC-11 a TC-18 cubriendo REQ-IMPROVE-03 (cobertura), REQ-IMPROVE-04 (integracion), REQ-IMPROVE-05 (D12), REQ-PRESERVE-01 (regresion a-hook), REQ-PRESERVE-02 (shape canonical) | DET-25 | scribe | S3.T5 | ticket markdown (## Test cases) | 8 filas en tabla TC con todos los campos rellenos | git revert | DET-7, DET-25 | done | 3 |
| S3.GATE | Gate Session 3 ⚑ fuerte (T2): 80% cover + integracion HOR-054 + zero FP + TCs registrados. Quality review DET-23 exhaustive (10 dimensiones). Decision continue/iterate/escalate. Si continue → cierre del ticket | — | reviewer | S3.T1-T6 | spec + ticket | Quality review pass exhaustive. Coverage >= 34/42. Latency < 1s total. Zero FP en corpus. `dkc-validate SpecFull` + `dkc-validate SpecTask` retornan valid. Decision firmada por el dev | git revert por task | DET-13, DET-14, DET-20, DET-23, DET-25 | done | 3 |

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When to measure |
|--------|-------------------|--------|----------------|-----------------|
| Coverage c-validator | 0/42 = 0% | >= 80% (34/42) | `grep -rc "<!-- enforcement: c-validator" prompts/steps/` | Post-S3.T2 |
| Latency por check p95 | N/A | < 500ms | Bench inline en S2.T5 | S2.T5 |
| Latency total (8-12 checks) | N/A | < 1s | Idem sobre step con 5+ tags | S3.T5 |
| Falsos positivos en corpus actual | N/A | 0 | Correr `dkc-validate Directive` sobre 5-10 tickets recientes | S3.T5 |
| Inline ratio del LLM post-implementacion | ~97.5% (HOR-046) | < 30% en 2-3 tickets nuevos | Medir Agent calls vs inline | Post-merge en 2-3 tickets futuros (out of scope de este ticket — observable solo en uso real) |
| Drift detectado en close de tickets | Reactivo (descubierto en close) | Proactivo (capturado post-step) | Comparar # drifts reportados por `dkc_enforce_step` vs encontrados en close | Post-merge, en 2-3 tickets siguientes |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Etiquetado de 42 directivas introduce drift silencioso en steps | medium | medium | Tags son additivos (HTML comments). Test post-etiquetado: grep retorna 42. Verificar visualmente en commit que cada tag esta adyacente a su directiva. Quality review S3.GATE incluye review humano del commit |
| Falsos positivos en corpus actual (legacy tickets) | high | low | C4 condition. Pre-S3.GATE: correr suite y revisar errors. Si FP: ajustar `expected_values[]` o agregar override del check via ticket-id. Precedente: `StepDecisions` ya skipea legacy pre-2026-05-17 |
| Extension `enforcement.py` rompe MCP tool existente | low | high | Cambio puramente aditivo. Test regresion S3.T4: dkc_enforce_step sobre step solo-a-hook debe comportarse identico (binary diff del executed[] aceptable) |
| 8-12 checks subestiman el catalogo real | medium | low | Empezar con 5 checks (S2). Refinar en S3 segun se etiquetan. Aceptable terminar en 10-15 si emergen casos especiales — el NFR es coverage >= 80%, no numero de checks |
| Latency degrada con muchos checks por step | low | low | Patron parse-once-validate-many obligatorio (C1). Si baseline HOR-046 se mantiene (0.27ms), 10 checks × 0.5ms = 5ms total — muy debajo de 500ms |
| HC viewer no renderiza output `kind: 'c-validator'` del MCP tool | low | low | Out of scope HOR-053. HC viewer puede iterarse aparte. El JSON return del MCP es consumido por LLM, no por UI |
| Re-trabajo si AQ tentativas resultan incorrectas durante S2/S3 | low | medium | Decisiones AQ1-AQ4 firmadas en S1 con DEC-LOCAL. Si emerge contra-evidencia: re-abrir decision (no avanzar en silencio). S1 es tier T1 (rapido) — costo de re-firmar bajo |

## Open questions

Ninguna activa al cerrar design. Las 4 AQ del intake (AQ1-AQ4) se resuelven via DEC-LOCAL abajo. Si emergen nuevas preguntas durante execute, se documentan en session log + se promueven a backlog del ticket.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Opcion 1 — CLI standalone (resuelve AQ2)

- **Contexto**: 3 opciones para integrar el frente C con HOR-054 `dkc_enforce_step`:
  - Opcion 1: CLI standalone TS (`dkc-validate Directive`) invocado por `dkc_enforce_step` como sub-comando
  - Opcion 2: Checks embebidos en Python dentro de `dkc_enforce_step` directamente
  - Opcion 3: Hibrido — kind TS como engine + `dkc_enforce_step` como dispatcher remoto
- **Drivers**: portabilidad cross-host (priority_hint del ticket), reuso del motor HOR-046, simplicidad del cambio en Python
- **Opcion elegida**: Opcion 1 (CLI standalone)
- **Alternativas**:
  - Opcion 2 descartada — rompe priority_hint (no portable como CLI). Concentra la logica en MCP server (single point of failure)
  - Opcion 3 descartada — over-engineering. Doble integration sin beneficio claro vs Opcion 1
- **Consecuencias**: 
  - Cambio Python minimo (regex paralelo + dispatch shell)
  - Logica completa en TS (testeable con self-tests inline patron HOR-046)
  - Portable a otros LLM hosts sin MCP (Ollama, Qwen) — basta correr `dkc-validate Directive` desde shell
  - Confirma decision del teach-close HOR-051 ("HOR-053 procede sin cambio — Frente C ya portable por diseno")
- **Session**: design-improvement (2026-05-21)

### DEC-LOCAL-02: Catalogo de 8-12 checks parametrizados (resuelve AQ1)

- **Contexto**: el intake (D15) detecto 20 familias unicas para 42 directivas. Top-5 cubren 45%. Hipotesis H2 (5-10 checks) refutada en absoluto, pero refinable via parametrizacion
- **Drivers**: minimizar surface area de codigo, maximizar reuso, mantener un archivo por check para localidad de debugging
- **Opcion elegida**: 8 checks mandatorios + 4 opcionales (segun emergan en etiquetado S3) con interface `DirectiveCheck<TParams>` parametrizable
- **Alternativas**:
  - 42 checks 1-a-1 descartado — over-fitting, redundante, dificil mantenimiento
  - 5 checks abstractos descartado — fuerza generalizacion artificial (refuted por intake H2)
- **Consecuencias**:
  - Cada check vive en `commands/lib/schemas/directive-checks/{checkId}.ts`
  - Familias top-7 son parametrizables → bajo costo de implementacion
  - Familias `quality-review-block-present`, `yaml-strict-no-duplicates` son singletons (no requieren params)
  - Forward-compat: nuevos checks se agregan sin tocar `validate.ts` (solo registro en catalogo)
- **Session**: design-improvement (2026-05-21)

### DEC-LOCAL-03: Tags inline en step files (resuelve AQ3)

- **Contexto**: dos opciones para localizar la declaracion de directivas c-validator:
  - Inline en `prompts/steps/*.md` con tags HTML comment (patron simetrico a a-hook)
  - Catalogo central en `commands/lib/schemas/directive-catalog.ts` con mapping `{stepPath: directives[]}`
- **Drivers**: localidad para debugging, simetria con patron existente, evitar dispersion del estado
- **Opcion elegida**: inline (patron a-hook)
- **Alternativas**:
  - Catalogo central descartado — separa la directiva de su check declarado. Cuando se modifica un step, hay que ir a 2 archivos. Anti-DRY contextual
- **Consecuencias**:
  - 42 tags `<!-- enforcement: c-validator check:"..." args:{...} -->` en 15 archivos
  - `parseStepDirectives` extrae los tags al runtime
  - Simetrico al patron a-hook ya en uso (26 tags actuales)
  - `dkc_enforce_step` parsea ambos tipos en el mismo step en una sola pasada
- **Session**: design-improvement (2026-05-21)

### DEC-LOCAL-04: Re-estimacion SP 4 → 5 (resuelve AQ4)

- **Contexto**: el intake refuto/refino H1 (42 directivas vs ~27) y H2 (20 familias vs 5-10). SP estimado inicial 4 puede quedar corto
- **Drivers**: reflejar volumen empirico real, evitar inflate cosmetic
- **Opcion elegida**: SP 5 (subir 1 punto)
- **Alternativas**:
  - SP 4 descartado — subestima 42 directivas
  - SP 6+ descartado — sobreestima (parametrizacion compensa el volumen)
  - SP 4 + reclasificar a explore descartado — el caso es implementable; HOR-051 teach-close confirma que C procede como improvement
- **Consecuencias**:
  - Frontmatter `story_points.estimated: 5`
  - Total 5-8h efectivas estimadas (vs 4-5h del SP 4)
  - Sub-tickets follow-up si emergen durante execute (ej. fix retroactivo de duplicate keys en tickets historicos)
- **Session**: design-improvement (2026-05-21)

### DEC-LOCAL-05: Incluir check `yaml-strict-no-duplicates` (captura D12)

- **Contexto**: D12 del backlog del ticket — bug observado 2x in-vivo (HOR-046, HOR-050) donde `closed: '2026-05-16'` + `closed: null` legacy rompe `gray-matter` del HC server (frontmatter: {} silencioso)
- **Drivers**: bajo costo agregar al catalogo, alto valor preventivo, parser ya existe en `parseFrontmatterWithDuplicates` (HOR-046)
- **Opcion elegida**: incluir como check 8 mandatorio del catalogo
- **Alternativas**:
  - No incluir descartado — el bug reincidente justifica el check
  - Spec separado (ticket nuevo) descartado — el costo marginal aqui es minimo (1 archivo + tests, parser ya hecho)
- **Consecuencias**:
  - Catalogo crece de 7 a 8 mandatorios
  - Sub-task opcional en S3: scan corpus historico (~5-10 tickets afectados estimados)
  - Captura D12 sin abrir ticket adicional
- **Session**: design-improvement (2026-05-21)

## Acceptance checkpoints

- [ ] **Funcional**: `dkc-validate Directive {step} {ticket}` retorna shape canonical valid + 8 checks mandatorios implementados con tests pasando
- [ ] **Tests**: self-tests inline en `directive.ts` + cada check (`directive-checks/*.ts`) pasan via `tsx`
- [ ] **NFRs**: latency p95 < 500ms por check; total < 1s para step con 5+ tags; coverage >= 80% (34/42)
- [ ] **Zero falsos positivos**: S3.T5 medicion sobre 5-10 tickets recientes retorna 0 FP (o todos clasificados como legacy con override)
- [ ] **Rules**: DET-1, DET-2, DET-5, DET-8, DET-10, DET-11, DET-13, DET-16, DET-20, DET-23, DET-25 respetadas
- [ ] **Integration**: `dkc_enforce_step` extendido funciona end-to-end (test pytest pass + smoke manual MCP)
- [ ] **Regresion**: 26 tags a-hook existentes intactos (test S3.T4) + shape canonical de kinds preservado
- [ ] **Docs**: este spec + DEC-LOCAL-01..05 documentados. Tags c-validator visibles inline en steps (autodocumentantes)
- [ ] **C1-C4 conditions**: parse-once-validate-many implementado (C1) + etiquetado zero-breaking (C2) + Python cambio minimo (C3) + zero FP (C4)

## Archiving

Cuando el spec deje de ser fuente de verdad (despues de que las 42 directivas esten etiquetadas, los 8-12 checks implementados, y el sistema este en uso 2-3 tickets sin incidentes): `/dkc-archive-spec SPEC-workflow-directive-enforcement-c-validator-53 "implemented and stable post 2-3 ticket usage"`.
