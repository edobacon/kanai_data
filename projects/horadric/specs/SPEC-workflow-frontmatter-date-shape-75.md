---
id: SPEC-workflow-frontmatter-date-shape-75
project: horadric
ticket: HOR-075
status: done
---

# Fix shape de fechas en frontmatter (forzar string ISO con comillas en deckard-core)

# Fix shape de fechas en frontmatter (forzar string ISO con comillas en deckard-core)

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes. Si te basta con esto para aprobar, ese es el objetivo.*

**Que se quiere**: cerrar de raiz el drift de fechas en deckard-core. Hoy YAML parsea `created: 2026-05-24` (sin comillas) como objeto `Date`, lo que rompe el backend HC que exige string. Los 5 templates de artefactos (`ticket`, `spec`, `rule`, `decision`, `bug`) y los 5 validators zod permiten ambos shapes — el primero como placeholder default, el segundo como tolerancia explicita. Despues del fix, los templates nacen con comillas, los validators rechazan Date objects con mensaje claro, los steps que escriben fechas tienen guidance inline, y los 147 archivos retroactivos cross-proyecto quedan migrados. Termina la categoria completa del drift de fechas en deckard-core.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Alcance **E** (todos los artefactos) en lugar de D (solo tickets) | Trade-off: ~1.3x esfuerzo vs cerrar la categoria; sin esto el bug queda latente en specs/rules/decisions/bugs y reaparece en otro ticket |
| 2 | Schemas zod **strict-string** (`z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`) en lugar de tolerar Date object | La tolerancia legacy es exactamente lo que enmascara el bug — quitarla es el fix de la segunda defensa |
| 3 | Script retroactivo `sed` regex anclada en lugar de migracion por archivo | Cambio mecanico, idempotente, 147 archivos en 1 ejecucion. Riesgo controlado: solo agrega comillas a valores ISO ya formados — no toca lineas con comillas existentes |

**Riesgos principales y como los mitigamos**:

- **Validador post-fix rechaza inmediatamente los 147 archivos pre-migracion** → orden estricto S1 (templates + schemas) → S2 (steps + script + dry-run) → S3 (aplicar + verificar). Sin completar S3, los hooks de write fallan sobre tickets existentes.
- **Edge cases en proyectos legacy (bayley, pehuen) con formatos exoticos** → S2 incluye dry-run obligatorio con diff de muestra; el dev aprueba antes de aplicar. Si emerge un edge case, se ajusta regex o se excluye el path.
- **Sed retroactivo es commit amplio (147 archivos cross-proyecto)** → S3 separa en commits DET-27 por tipo (chore retroactive aparte de feat schemas), permite revertir parcial.

**Que NO se hace en este ticket** (limites explicitos del scope):

- **No tocar `horadric-cube/server/deckard/frontmatter.ts`**: el viewer HC ya hace lo correcto siendo strict (decision firme del dev — alineado con RULE-server-frontmatter-legacy-001 "consumer normaliza, no migra"). Defense-in-depth en viewer queda para ticket separado si emerge necesidad.
- **No migrar tickets pre-2026-05-09 con campos faltantes** (ej: `teachings`, `decisions_log`): es otro drift cubierto por RULE-server-frontmatter-legacy-001. Este ticket cubre solo el shape de fechas.
- **No agregar tipos especificos como `DateString` o branded types en TS**: zod regex es suficiente y mas localizado. Refactor a tipo dedicado queda como improvement futuro si la categoria crece.

**Tamano estimado**: 3 sessions ejecutables (S1 fuente, S2 steps + script + dry-run, S3 aplicar + verificar). Aproximadamente 2-3h efectivas en total. La mas riesgosa es S3 por el commit amplio (gate ⚑ fuerte, dev aprueba dry-run).

**Como vas a saber que funciona**:

- Abro un ticket nuevo creado post-S1 y veo `created: '2026-05-25'` (con comillas) en el frontmatter.
- Ejecuto `dkc-validate Ticket` sobre HOR-009 post-S3 y exit code es 0; sin migrar habria exit 1 con mensaje "must be string YYYY-MM-DD (quote in frontmatter)".
- Curl al backend HC (`/api/projects/{bayley|horadric|pehuen}/tickets`) retorna `created` con fecha ISO valida (no null) en sample cross-proyecto.
- `commands/dkc-fix-date-shape` re-ejecutado post-migracion reporta 0 archivos cambiados (idempotente).

---

## Purpose

Cerrar el drift de fechas en deckard-core a 3 niveles: (1) fuente (5 templates de artefacto producen string ISO con comillas), (2) defensa (5 schemas zod rechazan Date object con mensaje claro), (3) guidance (4 steps relevantes tienen nota inline). Migrar los 147 archivos cross-proyecto preexistentes (33 tickets + 114 specs/rules/decisions/bugs) via script idempotente. Sin tocar el viewer HC (mantiene su comportamiento strict actual, alineado con RULE-server-frontmatter-legacy-001).

## Requirements

### REQ-FIX-01: Templates fuerzan string ISO con comillas

> **Que cambia**: cuando creas un ticket/spec/rule/decision/bug usando el template, el placeholder de fecha viene con comillas (`created: '{date_iso}'`). El LLM al instanciar el template ya no puede generar Date objects accidentalmente.
> **Por que**: hoy 5 templates usan `created: {date}` sin comillas — el LLM al rellenar produce `created: 2026-05-25` (parseado como Date) y HC backend reporta null.

El sistema MUST garantizar que los **5 templates** de `templates/records/{ticket,spec,rule,decision,bug}.md` declaren los campos de fecha (`created`, y donde aplique `closed`/`updated`/`fixed_date`/`archived_date`) con comillas explicitas en el placeholder, mas un comentario inline que explique el contrato.

**Actor**: system (template instanciado por LLM al crear artefacto)
**Layers**: meta (templates/records/)

<details><summary>Scenarios de validacion</summary>

#### Scenario: template de ticket post-fix
- **GIVEN** un dev (o LLM) crea un ticket nuevo usando el template
- **WHEN** copia/lee `templates/records/ticket.md`
- **THEN** las lineas de `created` y `closed` muestran comillas alrededor del placeholder (`created: '{date_iso}'`, `closed: '{date_iso}' | null`)
- **AND** hay un comentario inline `# string ISO YYYY-MM-DD — comillas obligatorias` o similar

#### Scenario: los 5 templates son consistentes
- **GIVEN** los 5 templates fixeados (`ticket`, `spec`, `rule`, `decision`, `bug`)
- **WHEN** ejecuto `grep -nE "^created:|^closed:|^updated:" templates/records/{ticket,spec,rule,decision,bug}.md`
- **THEN** cada match tiene comillas alrededor del placeholder
- **AND** no hay match sin comillas

</details>

---

### REQ-FIX-02: Schemas zod rechazan Date object para campos de fecha

> **Que cambia**: si el frontmatter de un artefacto tiene `created: 2026-05-25` (sin comillas → parseado como Date), `dkc-validate` falla con mensaje claro indicando que debe estar en comillas. Hoy lo acepta silenciosamente.
> **Por que**: los 5 schemas declaran `created: z.union([z.string(), z.date()])` — la tolerancia a Date fue legacy compat, pero hoy enmascara exactamente el bug.

El sistema MUST restringir los campos de fecha en los **5 schemas zod** (`commands/lib/schemas/{ticket,spec-full,rule,decision,bug}.ts`) a `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be string YYYY-MM-DD — quote in frontmatter")`. Aplica a `created` (los 5) y a los campos de fecha auxiliares: `closed` (ticket), `updated` (spec-full, decision), `fixed_date` (bug), `archived_date` (spec-full). Los campos nullable preservan `.nullable()` con la misma regex sobre el valor no-null.

**Actor**: validador (dkc-validate)
**Layers**: meta (commands/lib/schemas/)

<details><summary>Scenarios de validacion</summary>

#### Scenario: validator rechaza Date object con mensaje claro
- **GIVEN** un fixture con `created: 2026-05-25` (sin comillas → YAML parsea como Date)
- **WHEN** ejecuto `dkc-validate Ticket fixture.md`
- **THEN** exit code es 1
- **AND** errors[] incluye mensaje `"must be string YYYY-MM-DD — quote in frontmatter"` o equivalente
- **AND** la ruta del error apunta al campo `created`

#### Scenario: validator acepta string ISO con comillas
- **GIVEN** un fixture con `created: '2026-05-25'`
- **WHEN** ejecuto `dkc-validate Ticket fixture.md`
- **THEN** exit code es 0

#### Scenario: rechazo aplica a los 5 tipos de artefacto
- **GIVEN** fixtures invalidos para ticket, spec, rule, decision, bug
- **WHEN** ejecuto el validator correspondiente sobre cada uno
- **THEN** los 5 retornan exit 1 con mensaje analogo

</details>

---

### REQ-FIX-03: Steps relevantes con guidance inline sobre formato de fechas

> **Que cambia**: los steps que escriben/editan `created`/`closed`/`updated` en frontmatter tienen una nota explicita: "string ISO con comillas". Si en el futuro alguien agrega otro step que escriba fechas, el patron es visible y replicable.
> **Por que**: hoy ningun step menciona la convencion. El LLM ejecutor decide ad-hoc, y replica el shape del template — si el template tiene drift, el step lo perpetua.

El sistema MUST agregar nota inline en los **4 steps** que escriben/editan campos de fecha del frontmatter de artefactos: `prompts/steps/request-intake.md` (crear ticket), `prompts/steps/archive-spec.md` (frontmatter de spec archivada), `prompts/steps/update-template.md` (template updates), `prompts/steps/request-close.md` (marcar `closed`). La nota es 1-2 lineas, cerca del punto donde el step instruye al LLM a escribir la fecha.

**Actor**: LLM ejecutor de los steps
**Layers**: meta (prompts/steps/)

<details><summary>Scenarios de validacion</summary>

#### Scenario: cada step contiene nota
- **GIVEN** los 4 steps editados
- **WHEN** ejecuto `grep -nE "comillas|string ISO|YYYY-MM-DD" prompts/steps/{request-intake,archive-spec,update-template,request-close}.md`
- **THEN** cada archivo retorna al menos 1 match positivo
- **AND** la nota esta en el contexto donde el step instruye sobre escribir fechas (no al final como apendice)

</details>

---

### REQ-FIX-04: Script retroactivo `dkc-fix-date-shape` idempotente

> **Que cambia**: existe un comando `commands/dkc-fix-date-shape` que agrega comillas a valores ISO desnudos en frontmatter de cualquier artefacto markdown. Es idempotente: re-ejecutar no cambia archivos que ya tienen comillas. Soporta `--dry-run` para preview.
> **Por que**: 147 archivos preexistentes tienen el drift. Fixearlos a mano es inviable y por archivo es ruidoso. Un script regex anclada es la migracion mecanica que cierra el alcance retroactivo.

El sistema MUST proveer un comando `commands/dkc-fix-date-shape` que:
- Recorra archivos markdown bajo `projects/*/` (paths objetivo: `tickets/`, `specs/`, `rules/`, `decisions/`, `bugs/`).
- Aplique regex `^(created|closed|updated|fixed_date|archived_date): (\d{4}-\d{2}-\d{2})$` → `\1: '\2'` (regex anclada a inicio de linea + 10 chars ISO, no toca lineas con comillas).
- Soporte `--dry-run` (reporte cambios sin escribir) y modo default (aplica + reporta).
- Sea idempotente: 2da ejecucion sobre archivos ya migrados reporta 0 cambios.
- Exit 0 siempre (no falla por archivos sin cambios — es operacion no-op).

**Actor**: dev (ejecuta script en S2 dry-run y S3 apply)
**Layers**: meta (commands/)

<details><summary>Scenarios de validacion</summary>

#### Scenario: dry-run reporta 147 archivos
- **GIVEN** repo en estado pre-S3 (templates+schemas fixeados, archivos pre-migracion intactos)
- **WHEN** ejecuto `./commands/dkc-fix-date-shape --dry-run`
- **THEN** stdout reporta 147 archivos identificados con cambios pendientes
- **AND** un diff de muestra muestra solo agregado de comillas alrededor de valores ISO

#### Scenario: aplicacion modifica exactamente esos 147 archivos
- **GIVEN** dry-run mostro 147 archivos
- **WHEN** ejecuto `./commands/dkc-fix-date-shape` (sin --dry-run)
- **THEN** 147 archivos modificados; `git diff --stat` confirma el count
- **AND** ningun archivo modificado mas alla del shape de fecha

#### Scenario: idempotencia
- **GIVEN** script ya ejecutado
- **WHEN** re-ejecuto `./commands/dkc-fix-date-shape`
- **THEN** 0 archivos modificados
- **AND** exit code 0

</details>

---

### REQ-REGRESSION-01: Artefactos retroactivos pasan validator + HC backend reporta fechas

> **Que cambia**: post-migracion, los 147 archivos pasan `dkc-validate` (exit 0) y el backend HC reporta `created` con fecha ISO valida (no null) cross-proyecto.
> **Por que**: el fix sin verificacion empirica es solo intencion. La regression confirma que (a) los schemas strict no rompen ningun ticket existente migrado, (b) HC viewer ya no reporta null.

El sistema MUST verificar empiricamente post-S3 que:
- `dkc-validate` retorna exit 0 sobre los 147 archivos migrados (muestra cross-proyecto si correr el set completo es costoso).
- `curl http://localhost:5180/api/projects/{proj}/tickets` retorna `created` no-null en muestra cross-proyecto (al menos HOR-009 + 1 ticket de bayley + 1 de pehuen + 1 de up1).
- Idempotencia del script confirmada post-migracion.

**Actor**: reviewer
**Layers**: meta (validator) + server (HC backend, solo verificacion)

<details><summary>Scenarios de validacion</summary>

#### Scenario: dkc-validate sobre muestra cross-proyecto
- **GIVEN** script aplicado en S3
- **WHEN** ejecuto `dkc-validate all` sobre 10 tickets + 10 otros artefactos sampleados
- **THEN** los 20 retornan exit 0
- **AND** ningun error relacionado a shape de fecha

#### Scenario: HC backend reporta fechas no-null cross-proyecto
- **GIVEN** script aplicado + reindex de 4+ proyectos
- **WHEN** ejecuto `curl http://localhost:5180/api/projects/{horadric,bayley,pehuen,up1}/tickets | jq '[.[] | select(.created == null)] | length'`
- **THEN** cada proyecto retorna 0 (sin tickets con created null)

</details>

---

## Fix scope

### Antes (comportamiento actual)

- **Templates**: 5 archivos en `templates/records/` con `created: {date}` (placeholder sin comillas). LLM al instanciar genera `created: 2026-05-25` (Date YAML).
- **Schemas zod**: 5 archivos en `commands/lib/schemas/` con `created: z.union([z.string(), z.date()])` — aceptan Date object silenciosamente.
- **Steps**: 4 archivos en `prompts/steps/` sin guidance inline sobre formato de fechas. LLM ejecutor replica el shape del template (defectuoso).
- **Artefactos**: 147 archivos cross-proyecto con `created: YYYY-MM-DD` sin comillas. HC backend reporta `created: null` al consumirlos.
- **Sintoma**: usuario abre HC viewer y no ve fechas en tickets/specs/rules/decisions/bugs.

### Despues (comportamiento esperado)

- **Templates**: las 5 lineas de placeholder de fecha tienen comillas + comentario inline `# string ISO YYYY-MM-DD — comillas obligatorias para que YAML lo parsee como string`.
- **Schemas zod**: los 5 schemas declaran `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be string YYYY-MM-DD — quote in frontmatter")` para `created` (y campos auxiliares analogos). Rechazo claro en exit y mensaje.
- **Steps**: los 4 steps tienen nota inline cerca del paso de escritura de fecha. Replicable para steps futuros.
- **Artefactos**: los 147 archivos migrados via script. Frontmatter resultante: `created: '2026-05-25'` (con comillas).
- **HC backend**: retorna `created` con fecha ISO valida (no null) para todo artefacto migrado.

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `templates/records/ticket.md:25-26` | `created: {date}` → `created: '{date_iso}'`; `closed: {date \| null}` → `closed: '{date_iso}' \| null`; comentario inline | Tickets nuevos nacen canonical |
| `templates/records/spec.md:8-9` | `created: {date}` → `created: '{date_iso}'`; idem `updated`; comentario inline | Specs nuevas nacen canonical |
| `templates/records/rule.md:10` | `created: {date}` → `created: '{date_iso}'`; comentario inline | Rules nuevas nacen canonical |
| `templates/records/decision.md:10` | idem | Decisions nuevas nacen canonical |
| `templates/records/bug.md:9` | idem | Bugs nuevos nacen canonical |
| `commands/lib/schemas/ticket.ts:169-170` | `z.union([z.string(), z.date()])` → `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, ...)` para `created`+`closed` | Rechaza Date objects en frontmatter de tickets |
| `commands/lib/schemas/spec-full.ts:47-48,53` | idem para `created`+`updated`+`archived_date` | Idem specs |
| `commands/lib/schemas/rule.ts:57` | idem para `created` | Idem rules |
| `commands/lib/schemas/decision.ts:61,71` | idem para `created`+`updated` | Idem decisions |
| `commands/lib/schemas/bug.ts:51,57` | idem para `created`+`fixed_date` | Idem bugs |
| `prompts/steps/request-intake.md` | Nota inline cerca de paso 3 "Crear ticket" sobre forzar comillas | LLM al crear ticket nuevo escribe shape correcto |
| `prompts/steps/archive-spec.md:97` | Nota inline donde escribe `created: {fecha original}` | Idem archive spec |
| `prompts/steps/update-template.md:106` | Nota inline donde escribe `created: {date}` | Idem update template |
| `prompts/steps/request-close.md` | Nota inline cerca de paso que marca `closed` | LLM al cerrar ticket escribe shape correcto |
| `commands/dkc-fix-date-shape` (nuevo) | Script bash o tsx con regex sed-style anclada. `--dry-run` + idempotente. Exit 0 always | Util para migracion retroactiva y para mantenimiento futuro |
| `projects/{bayley,horadric,pehuen,up1,etc}/*/{*.md}` × 147 | Agregado de comillas a `created`/`closed`/`updated`/`fixed_date`/`archived_date` via script | Artefactos preexistentes alineados con nuevo contrato |

## Tasks

### Session 1 — Fix de fuente: 5 templates + 5 schemas zod [tipo: auto] [tier: T2]

**Objetivo**: corregir templates y schemas para que el shape correcto sea producido por el sistema en adelante. Sin migracion retroactiva todavia — esa es S3.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Fix de los 5 templates: forzar comillas en placeholder de fecha + comentario inline | REQ-FIX-01 | developer | — | `templates/records/{ticket,spec,rule,decision,bug}.md` | grep retorna cada match de `created`/`closed`/`updated` con comillas alrededor del placeholder | `git revert` | DET-2, DET-11 | pending | 1 |
| S1.T2 | Fix de los 5 schemas zod: cambiar `z.union([z.string(), z.date()])` por `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg)` en campos de fecha (`created`+`closed`+`updated`+`fixed_date`+`archived_date` segun aplique). Preservar `.nullable()` donde corresponda | REQ-FIX-02 | developer | S1.T1 | `commands/lib/schemas/{ticket,spec-full,rule,decision,bug}.ts` | `cd commands/lib && npx tsc --noEmit` exit 0 | `git revert` | DET-2, DET-8, DET-10 | pending | 1 |
| S1.T3 | Crear fixtures de regression: 1 bad (sin comillas → Date object al parsear) + 1 good (con comillas) por cada tipo (5 bad + 5 good). Correr validator: bad debe fallar con mensaje claro; good debe pasar | REQ-FIX-02 | developer | S1.T2 | `tmp/fixtures/` (eliminar post-test); `commands/dkc-validate` | TC-3 + TC-4 (bad exit 1 con mensaje claro, good exit 0) | `rm -rf tmp/fixtures/` | DET-7, DET-13 | pending | 1 |
| S1.GATE | Gate de sync Session 1 (T2: typecheck + fixtures validator). Decision continue → S2 | — | reviewer | S1.T3 | — | typecheck pasa; fixtures bad fallan validator con mensaje correcto; fixtures good pasan | — | DET-14, DET-23 | pending | 1 |

### Session 2 — Steps guidance + script `dkc-fix-date-shape` + dry-run [tipo: ⚑ fuerte] [tier: T2]

**Objetivo**: agregar guidance inline a los 4 steps relevantes; construir el script de migracion; ejecutar dry-run sobre los 147 archivos y validar diff con el dev. NO aplicar — solo preparar.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Agregar nota inline en los 4 steps relevantes sobre forzar comillas en fechas. Posicionar cerca del paso de escritura, no al final como apendice | REQ-FIX-03 | developer | S1.GATE | `prompts/steps/{request-intake,archive-spec,update-template,request-close}.md` | TC-5 grep retorna match en cada archivo | `git revert` | DET-2, DET-16 | pending | 2 |
| S2.T2 | Construir `commands/dkc-fix-date-shape` (bash o tsx). Regex anclada a inicio de linea + 10 chars ISO. Soporte `--dry-run`. Idempotente. Exit 0 siempre | REQ-FIX-04 | developer | S2.T1 | `commands/dkc-fix-date-shape` (nuevo, chmod +x); README inline en el script (`# DESCRIPCION:` block) | Script ejecuta sobre fixture controlado: 1 archivo bad → 1 cambio + diff esperado; re-ejecutar → 0 cambios | `rm commands/dkc-fix-date-shape` | DET-2, DET-8, DET-11 | pending | 2 |
| S2.T3 | Dry-run del script sobre los 147 archivos cross-proyecto. Mostrar al dev: lista completa por proyecto (147 lineas) + diff de muestra (5-10 archivos). Capturar baseline `dkc-validate` sobre la muestra (esperado: ~147 invalid) | REQ-FIX-04, REQ-REGRESSION-01 | developer | S2.T2 | — (lectura solamente; no modifica archivos) | Output muestra 147 archivos identificados; diff es solo agregado de comillas; baseline `dkc-validate` confirma ~147 invalid | — (paso de solo lectura) | DET-4, DET-5 | pending | 2 |
| S2.GATE | Gate ⚑ fuerte: el dev aprueba el dry-run antes de S3 (commit retroactivo amplio). Decision continue → S3 | — | reviewer | S2.T3 | — | Dev confirma OK al output de dry-run (gate fuerte requiere aprobacion humana) | — | DET-12, DET-14 | pending | 2 |

### Session 3 — Aplicacion + verificacion end-to-end + commits DET-27 [tipo: ⚑ fuerte] [tier: T3]

**Objetivo**: ejecutar el script aplicando, reindexar, verificar via `dkc-validate` + curl HC, separar commits DET-27 por tipo.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Ejecutar `./commands/dkc-fix-date-shape` aplicando sobre los 147 archivos. Capturar lista de archivos modificados en log para commit posterior | REQ-FIX-04 | developer | S2.GATE | `projects/*/{tickets,specs,rules,decisions,bugs}/*.md` (147 archivos) | TC-7 first pass: 147 archivos modificados; re-ejecucion exit 0 con 0 cambios | `git checkout projects/` (revertir cambios sed) | DET-8 | pending | 3 |
| S3.T2 | Reindex 4+ proyectos: `./commands/dkc-reindex` por cada proyecto afectado (mininmo: horadric, bayley, pehuen, up1; agregar drunappgor si tiene retroactivos) | REQ-REGRESSION-01 | developer | S3.T1 | `projects/*/index.db` (regenerado) | reindex exit 0 cada uno | re-ejecutar reindex (idempotente) | DET-16 | pending | 3 |
| S3.T3 | Verificar via `dkc-validate all` sobre muestra cross-proyecto (10 tickets + 10 otros artefactos seleccionados). Esperado: todos exit 0 | REQ-REGRESSION-01 | reviewer | S3.T2 | — | TC-8: muestra de 20 archivos pasa exit 0 | — (verificacion read-only) | DET-7, DET-13 | pending | 3 |
| S3.T4 | Verificar via curl al backend HC: `created` no-null en muestra cross-proyecto (HOR-009 + 1 bayley + 1 pehuen + 1 up1) | REQ-REGRESSION-01 | reviewer | S3.T3 | — (lectura HC API) | TC-9: muestra retorna `created` con fecha ISO valida, ningun null | — | DET-13 | pending | 3 |
| S3.T5 | Commits DET-27 separados por tipo: (a) `docs(deckard-core): force ISO date shape with quotes in 5 record templates`, (b) `feat(deckard-core): strict YYYY-MM-DD validation in 5 zod schemas`, (c) `docs(prompts): inline guidance on date quoting in 4 steps`, (d) `feat(commands): add dkc-fix-date-shape migration script`, (e) `chore(retroactive): migrate frontmatter date shape across 147 artifacts`. Dev valida cada commit message + lista de archivos antes de ejecutar | REQ-FIX-01..04 | developer | S3.T4 | git log con 5 commits | Cada commit ejecutado con OK del dev; working tree limpio | `git reset HEAD~5` (ultima opcion) | DET-19, DET-27 | pending | 3 |
| S3.GATE | Gate ⚑ fuerte: validacion end-to-end completa (validator + HC + commits DET-27). Decision continue → close ticket | — | reviewer | S3.T5 | — | Acceptance checkpoints todos pasan; dev valida cada commit DET-27; working tree limpio en ambos repos (deckard + horadric-cube si toca) | — | DET-13, DET-14, DET-22, DET-23, DET-27 | pending | 3 |

## Constraints

- **DET-5** (multi-capa): el fix toca 3 capas en deckard-core (templates, schemas, steps) + 1 capa de verificacion (HC backend). Cada capa cubierta en sessions distintas para trazabilidad.
- **DET-7** (test cases ↔ discovery): cada TC traza a un REQ. TC-3/TC-4 son tests negativos/positivos sobre schemas. TC-7 valida idempotencia del script. TC-9 es regression end-to-end.
- **DET-11** (KB-first): rules consultadas durante intake-explore — RULE-server-frontmatter-legacy-001 confirma la filosofia "viewer strict + fuente canonical". Este fix NO contradice esa rule.
- **DET-19** (external id en commits): HOR-075 no tiene `external` (sin Jira). Los commits usan `HOR-075` como ticket_id segun fallback de la regla.
- **DET-27** (commits separados por tipo): S3.T5 separa en 5 commits por tipo (docs templates, feat schemas, docs prompts, feat script, chore retroactive). Dev valida cada uno.
- **RULE-server-frontmatter-legacy-001**: consumer normaliza, no migra. Esta SPEC cumple porque la fuente (templates + schemas + retroactivos) se ajusta al contrato strict del consumer (HC backend). NO modifica el consumer.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Node 22 + tsx + zod (lib `commands/lib`) | internal | dkc-validate requiere Node 22+ y deps de la lib instaladas | Bajo: ya es prerequisito del sistema; documentado en `dkc-validate` |
| `commands/dkc-reindex` | internal | Reindex sincrono post-migracion | Ninguno (helper estable) |
| HC viewer corriendo (puerto 5180) para TC-9 | internal | Verificacion empirica del fix end-to-end | Bajo: solo afecta TC-9 (verificacion). Si HC no corre, marcar TC-9 como deferred con justificacion y volver al cierre con override |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Validator strict-post-S1 rechaza los 147 archivos pre-migracion → hook bloquea otros tickets activos | medium | medium | Orden estricto S1 → S2 → S3 sin pausa larga entre ellos. Comunicar al dev: si necesita commitear otro ticket entre S1 y S3, primero correr `dkc-fix-date-shape` sobre ese ticket especifico |
| Edge case en bayley/pehuen: archivo con formato exotico no anticipado por regex sed | low | low | S2.T3 dry-run muestra diff de muestra. Si emerge edge case: ajustar regex o excluir path especifico via opcion `--exclude` del script |
| Sed regex anclada captura falso positivo (linea que parece fecha pero no es campo de frontmatter) | low | medium | Regex anclada a inicio de linea `^` + nombres especificos (`created\|closed\|updated\|fixed_date\|archived_date`) + valor ISO exacto. Lineas en body markdown no matchean (estan indentadas o tienen contexto). Diff muestra evidencia |
| Commit retroactivo amplio (147 archivos) dificulta code review futuro | medium | low | DET-27: commit separado del resto, mensaje claro `chore(retroactive): migrate frontmatter date shape across 147 artifacts`. Reviewer puede saltarlo sabiendo que es migracion mecanica |
| Schema rechaza un ticket que el dev acaba de editar manualmente sin comillas mid-execute | low | low | Mensaje de error claro indica "quote in frontmatter". Fix manual del dev es 1 caracter |

## Open questions

(Sin questions abiertas al momento del design — todas las hipotesis del Triage cerraron `✓ confirmed` durante intake-explore.)

## Decisions

### DEC-LOCAL-01: Alcance E (sistematico) en lugar de D (solo tickets)
- **Contexto**: durante intake-explore emergieron 2 cascadas de hallazgos. Inicialmente pensado para 2 tickets, escalo a 33 tickets, luego a 147 archivos cross-artifact-type.
- **Drivers**: (a) cierre completo de la categoria (no dejar bug latente), (b) cambio mecanico repetido (5 templates vs 1, 5 schemas vs 1), (c) consistencia del sistema (si la regla es strict-string, aplica a todo deckard-core).
- **Opcion elegida**: E — fix sistematico a 5 templates + 5 schemas + 4 steps + 147 archivos retroactivos.
- **Alternativas**:
  - **D**: solo tickets (1 template + 1 schema + 33 archivos). Descartado: deja drift latente en specs/rules/decisions/bugs.
  - **F**: solo tickets ahora + ticket separado para el resto. Descartado: 2 rounds de migracion retroactiva, complejidad organizacional sin ganancia.
- **Consecuencias**: ~1.3x esfuerzo vs D. Repo entero queda consistente. Bug erradicado.
- **Session**: intake-explore (HOR-075 markdown, opcion explicita del dev).

### DEC-LOCAL-02: NO modificar viewer HC (frontmatter.ts) para tolerar Date
- **Contexto**: el sintoma original era en HC viewer. Alternativa "facil" era hacer `frontmatter.ts:stringField` tolerar Date object (`if (v instanceof Date) return v.toISOString().slice(0,10)`).
- **Drivers**: (a) RULE-server-frontmatter-legacy-001 establece "consumer normaliza, no migra"; este caso es shape erroneo en fuente, no campo ausente. (b) Tolerar Date enmascara el bug en futuras categorias similares. (c) Mantener viewer strict facilita detectar drifts.
- **Opcion elegida**: NO tocar viewer. Fix vive en deckard-core.
- **Alternativas**: ver "Que NO se hace" en Executive summary.
- **Consecuencias**: alineamiento con filosofia de la rule. Defense-in-depth en viewer queda como improvement futuro si emerge necesidad.
- **Session**: intake-explore (decision firme del dev — pre-confirmada en TICKET-032).

## Acceptance checkpoints

- [ ] **Funcional**: TC-1 a TC-9 ejecutados con resultados pass (registrados en `## Test cases` del ticket post-S3.T4).
- [ ] **Tests**: fixtures bad/good de S1.T3 confirman comportamiento de schemas; idempotencia del script confirmada en S3.T1.
- [ ] **NFRs**: no aplica (fix sin requirements no-funcionales mas alla del comportamiento canonical).
- [ ] **Rules**: DET-5/DET-7/DET-11/DET-19/DET-27 respetadas + RULE-server-frontmatter-legacy-001 no contradicha.
- [ ] **Integration**: `dkc-validate` exit 0 sobre muestra cross-proyecto post-migracion (10 tickets + 10 otros). Curl HC retorna `created` no-null en muestra.
- [ ] **Docs**: comentarios inline en templates + mensaje claro en schemas + nota en 4 steps + README inline del script `dkc-fix-date-shape`.

## Technical reference

**Stack trace del sintoma original** (HC backend):
```
// horadric-cube/server/deckard/frontmatter.ts:60-63
function stringField(v: unknown): string | null {
  if (typeof v === 'string') return v
  return null  // ← Date object cae aqui → API retorna `created: null`
}
```

**YAML parsing del shape erroneo** (sangrado intencional para que `dkc-fix-date-shape` no matchee el ejemplo del bug — la regex es anclada a inicio de linea):

```yaml
  # Frontmatter actual (drift):
  created: 2026-05-24
  # YAML.parse() → Date { "2026-05-24T00:00:00.000Z" }

  # Frontmatter post-fix:
  created: '2026-05-24'
  # YAML.parse() → "2026-05-24" (string)
```

**Regex sed del script retroactivo**:
```
^(created|closed|updated|fixed_date|archived_date): (\d{4}-\d{2}-\d{2})$
```
Anclada a inicio de linea (`^`) + nombre exacto del campo + valor ISO de 10 chars + fin de linea (`$`). Lineas con comillas existentes (`created: '...'`) NO matchean — idempotente.

**Mensaje de error del schema post-fix** (zod):
```
ZodError: validation failed for "created":
  must be string YYYY-MM-DD — quote in frontmatter (e.g. created: '2026-05-25')
```
