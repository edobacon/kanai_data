---
id: SPEC-deckard-core-prompts-weight
project: horadric
ticket: HOR-004
status: done
---

# Revision del peso de instrucciones + fixes puntuales de gates en prompts de Deckard

# Revision del peso de instrucciones + fixes puntuales de gates en prompts de Deckard

## Purpose

Corregir que los gates criticos del sistema de prompts de Deckard Cain no se activan en la practica porque: (a) estan enterrados al final del archivo, (b) se expresan en 3 formatos distintos (checklist / prosa / numero de regla), (c) quedan rodeados de prosa explicativa que compite por atencion. El resultado es que el LLM prioriza lo que pesa mas visualmente, y los gates pierden esa competencia. Evidencia: HOR-001 cerro con `creates_visual: true, draft_approved: null` violando la regla 18; TICKET-001 en up1 cerro con 8 secciones vacias porque el GATE FINAL de close no se ejecuto.

Este spec escribe una guia de estilo (`prompts/_style.md`), la aplica en un pase transversal sobre los 17 archivos relevantes, y ademas arregla gaps puntuales del audit (encadenamiento del workflow, uniformidad de gates entre design-\*, instruccion explicita al developer, y referencia huerfana en scribe). Alcance acotado: solo edicion de markdown en `deckard/prompts/` y `deckard/commands/` — cero impacto en codigo TS.

## Requirements

### REQ-IMPROVE-01: Guia de estilo existe con principios aplicables

El sistema MUST contener `prompts/_style.md` con principios concretos que cualquier futuro step/agent/workflow pueda aplicar sin ambiguedad.

**Actor**: dev futuro que escriba un prompt nuevo.
**Layers**: documentation.

#### Scenario: contenido minimo
- **GIVEN** el archivo `prompts/_style.md`
- **WHEN** se lee
- **THEN** contiene 5 principios: (1) gates al inicio, (2) template uniforme de gate, (3) prosa explicativa al final en `## Contexto & Notas`, (4) referencias a reglas con numero + nombre, (5) un proposito accionable por seccion
- **AND** cada principio tiene: regla en una linea + ejemplo antes/despues + cuando aplica

#### Acceptance
**Dev puede verificar**: leer `_style.md`, confirmar que si escribe un step nuevo tiene guia suficiente para decidir donde poner un gate sin consultar.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Archivo existe | — | ls prompts/_style.md | archivo presente | exit 0 |
| 2 | Contiene 5 principios | archivo | grep "Principio" | 5 matches | 5 |
| 3 | Cada principio tiene ejemplo | archivo | buscar "**Antes**" y "**Despues**" | 10 matches (5×2) | 10 |

### REQ-IMPROVE-02: Gates bloqueantes al inicio del archivo

El sistema MUST elevar los gates criticos actuales (posicion 70-100%) a seccion `## ⚠️ GATES` al inicio del archivo (primer 30%), en los 5 archivos afectados: `request-intake.md`, `request-execute.md`, `request-close.md`, `design-feature.md`, `design-draft.md`.

**Actor**: LLM/agent que lee el step al empezar a ejecutarlo.
**Layers**: documentation.

#### Scenario: request-close.md gate elevado
- **GIVEN** estado actual: GATE FINAL en linea 255 (88%)
- **WHEN** se aplican los cambios de la task #3
- **THEN** hay seccion `## ⚠️ GATES` entre lineas 15-60 del archivo
- **AND** el cuerpo del archivo mantiene la instruccion completa del gate (no solo referencia) — la seccion inicial lista los gates con una linea + link/referencia a la seccion donde se ejecutan
- **AND** el archivo sigue siendo legible para humanos (la seccion inicial es "mapa", no reemplaza el detalle)

#### Scenario: archivo sin gates (design-fix antes de Gap 3)
- **GIVEN** `design-fix.md` actual sin gates
- **WHEN** task #5 agrega el GATE de spec completo (Gap 3)
- **THEN** tambien aparece en `## ⚠️ GATES` al inicio

#### Acceptance
**Dev puede verificar**: abrir los 5 archivos afectados, confirmar que cada uno tiene `## ⚠️ GATES` en el primer tercio y que los gates ahi referenciados existen en el cuerpo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | request-close gate en inicio | post task #3 | grep -n "GATES" request-close.md | linea < 60 | true |
| 2 | request-execute gate en inicio | post task #3 | grep -n "GATES" request-execute.md | linea < 60 | true |
| 3 | request-intake gate en inicio | post task #3 | grep -n "GATES" request-intake.md | linea < 60 | true |
| 4 | design-feature gate en inicio | post task #3 | grep -n "GATES" design-feature.md | linea < 60 | true |
| 5 | design-draft gate en inicio | post task #3 | grep -n "GATES" design-draft.md | linea < 60 | true |

### REQ-IMPROVE-03: Formato uniforme para los 28 gates

El sistema MUST expresar todos los gates con el mismo template:

```markdown
## GATE: {titulo descriptivo}

**BLOQUEANTE**: {una linea que describa la condicion general}

[ ] {criterio verificable 1}
[ ] {criterio verificable 2}
...

**Si falla**: {que hacer — detener / volver a paso X / pedir al dev}
```

**Actor**: LLM/agent leyendo el step.
**Layers**: documentation.

#### Scenario: todos los gates tienen el template
- **GIVEN** los 17 archivos con gates (28 gates totales segun audit de session #2)
- **WHEN** `grep -B2 -A5 "BLOQUEANTE" prompts/ -r`
- **THEN** cada ocurrencia sigue el template: titulo H2/H3 con `GATE:`, linea con `**BLOQUEANTE**`, uno o mas `[ ]`, linea con `**Si falla**`

#### Acceptance
**Dev puede verificar**: correr un script simple (grep + awk) sobre `prompts/` — cada gate debe tener las 4 lineas del template.

### REQ-IMPROVE-04: Prosa dilutiva en `## Contexto & Notas`

El sistema MUST mover secciones de prosa explicativa (`## Importante`, `## Por que este gate existe`, `## Fallas conocidas`) a una unica seccion `## Contexto & Notas` al final del archivo, en los 5 archivos donde hay mas de 50 lineas de prosa post-gate.

**Actor**: mismo — reducir dilucion para el LLM, preservar informacion para el humano.
**Layers**: documentation.

#### Scenario: request-execute.md limpio
- **GIVEN** estado actual: lineas 269-277 son "Importante" (prosa post-gate)
- **WHEN** se aplican cambios task #3
- **THEN** estas lineas viven en `## Contexto & Notas` al final del archivo
- **AND** el gate en linea 207 (GATE E) termina limpio sin 49 lineas de prosa inmediatamente despues
- **AND** contenido no se pierde — solo se reubica

#### Acceptance
**Dev puede verificar**: diff del archivo antes/despues — la misma cantidad de informacion total, redistribuida.

### REQ-IMPROVE-05: Fixes puntuales Gap 1 + 3 + 4 + 6

El sistema MUST corregir los 4 gaps puntuales del audit aplicando el estilo nuevo:

- **Gap 1**: `prompts/workflows/request.md` lista `design-transition-to-execute` como step explicito entre design-{tipo} y request-execute, con condicion `when: work_type NO es explore`.
- **Gap 3**: `design-fix.md`, `design-improvement.md`, `design-refactor.md` tienen el mismo GATE de spec completo que `design-feature.md`, adaptado a sus secciones propias.
- **Gap 4**: `prompts/agents/developer.md` instruye explicitamente "antes de ejecutar la task, leer las reglas listadas en `rules:` del task contract desde `prompts/deterministic-rules.md`".
- **Gap 6 (c)**: `prompts/agents/scribe.md` reemplaza la mencion huerfana a `dkc_get_rules(context, role)` con fallback explicito: "si no hay MCP server, leer `projects/{project}/rules/{module}/` con Grep".

**Actor**: dev/agent en cada caso.
**Layers**: documentation, process.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | request.md lista design-transition-to-execute | post task #2 | grep "design-transition" request.md | linea en frontmatter steps | encontrado |
| 2 | design-fix tiene GATE spec | post task #5 | grep "GATE:" design-fix.md | match | encontrado |
| 3 | design-improvement tiene GATE spec | post task #5 | grep "GATE:" design-improvement.md | match | encontrado |
| 4 | design-refactor tiene GATE spec | post task #5 | grep "GATE:" design-refactor.md | match | encontrado |
| 5 | developer.md cita task contract rules | post task #5 | grep -i "rules:" developer.md | instruccion explicita | encontrado |
| 6 | scribe.md con fallback Grep | post task #5 | grep "rules/{module}" scribe.md | fallback documentado | encontrado |
| 7 | scribe.md sin dkc_get_rules huerfano | post task #5 | grep "dkc_get_rules" scribe.md | 0 matches (o con doc completa) | 0 o doc |

### REQ-PRESERVE-01: Simulacion mental no produce falsos positivos

El sistema MUST, al recorrer HOR-001, HOR-002, HOR-003 mentalmente contra los nuevos prompts, demostrar que:
- HOR-001: el gate del draft SE HABRIA ACTIVADO al entrar a design-feature (porque `creates_visual: true, draft_approved: null`)
- HOR-002 (improvement, creates_visual: true, draft_approved: null): idem — se habria activado
- HOR-003 (improvement, creates_visual: false): NO se habria activado — correcto, no aplica

**Actor**: dev haciendo walkthrough manual.
**Layers**: process.

#### Acceptance
**Dev puede verificar**: escribir en sesion #3 (execute) una tabla de 3 filas — para cada ticket indicar que gate se activa/no activa y si es el comportamiento esperado.

### REQ-PRESERVE-02: horadric-cube npm test sin cambio

El sistema MUST mantener 7 files / 31 tests passing en horadric-cube al cerrar HOR-004. Este ticket no toca codigo TS — cualquier regresion indica efecto colateral no intencional.

**Actor**: system (CI).
**Layers**: test.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | npm test cero cambio | estado post task #6 | `cd horadric-cube && npm test` | 7 files / 31 tests passed / 0 failed | exacto |

## Non-functional requirements

No aplican. Trabajo editorial sobre markdowns.

## Artifacts

### Changes

#### Added: `prompts/_style.md`

Archivo nuevo con 5 principios. Estructura:

```markdown
# Estilo para prompts de Deckard Cain

## Principio 1: Gates al inicio
**Regla**: si un step tiene gates bloqueantes, van a `## ⚠️ GATES` en el primer 30% del archivo.
**Antes**: GATE FINAL en linea 255 de 290 (88%).
**Despues**: `## ⚠️ GATES` en lineas 15-60, cuerpo del step despues.
**Cuando aplica**: cualquier step con instruccion marcada `BLOQUEANTE` o `[ ]` checklist.

## Principio 2: Template uniforme de gate
[template con `## GATE:` + `**BLOQUEANTE**` + `[ ]` + `**Si falla**`]

## Principio 3: Prosa explicativa al final
[mover `## Importante`, `## Por que existe`, `## Fallas conocidas` a `## Contexto & Notas`]

## Principio 4: Referencias a reglas completas
**Regla**: toda referencia a una regla de `deterministic-rules.md` cita numero + nombre corto.
**Antes**: "ver regla 18"
**Despues**: "ver Regla 18 (draft aprobado antes de spec)"

## Principio 5: Un proposito accionable por seccion
[una seccion hace una cosa; si empieza a mezclar explicacion + instruccion, split]
```

#### Modified: `prompts/workflows/request.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Lista de steps en frontmatter | 6 steps (intake, draft, feature/fix/improvement/refactor, execute, close) | 7 steps con `design-transition-to-execute` explicito | Gap 1 — forzar que se ejecute, no dejar como instruccion enterrada |

#### Modified: `prompts/steps/request-intake.md`, `request-execute.md`, `request-close.md`

- Agregar `## ⚠️ GATES` al inicio (dentro del primer 30%)
- Reubicar prosa `## Importante`, `## Fallas conocidas` a `## Contexto & Notas` al final
- Aplicar template uniforme de gate (`## GATE:` + `**BLOQUEANTE**` + `[ ]` + `**Si falla**`)

#### Modified: `prompts/steps/design-feature.md`, `design-draft.md`

Mismo tratamiento: gates arriba, prosa al final, template uniforme.

#### Added (Gap 3): GATE de spec completo en `design-fix.md`, `design-improvement.md`, `design-refactor.md`

Plantilla replicando el GATE de design-feature, adaptado a las secciones propias de cada uno (ej: design-fix no requiere "Artifacts desde meta-specs" pero si "Diagnostico" y "Causa raiz identificada").

#### Modified (Gap 4): `prompts/agents/developer.md`

Agregar en seccion "Inputs" o equivalente:
> Antes de ejecutar la task: leer las reglas listadas en `rules:` del task contract desde `prompts/deterministic-rules.md`. El campo `rules` NO es decorativo — define las reglas que aplican a ESTA task especifica.

#### Modified (Gap 6c): `prompts/agents/scribe.md`

Reemplazar:
> En cada checkpoint invocar `dkc_get_rules(context, role)` [funcion sin documentacion]

Por:
> En cada checkpoint refrescar reglas del modulo. Si hay MCP server: `dkc_get_rules(context, role)`. Fallback sin MCP: leer `projects/{project}/rules/{module}/*.md` con Grep/Read.

#### Modified (todos los prompts con gates): aplicar Principio 2

28 gates identificados en el audit — cada uno pasa a template uniforme. Lista completa en Session #2 log.

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status | Session | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --------- | --- | --- | --- |
| 1 | Escribir `prompts/_style.md` con 5 principios + ejemplos antes/despues | architect | — | `prompts/_style.md` (nuevo) | grep "Principio" → 5 matches; revisar manualmente claridad | done | #3 | — | — | — |
| 2 | Gap 1: agregar `design-transition-to-execute` al frontmatter `steps:` de `prompts/workflows/request.md` como step explicito (condicion `work_type NO es explore`) | developer | #1 | `prompts/workflows/request.md` | leer archivo, confirmar step en la lista + referenciado en el cuerpo | done | #3 | — | — | — |
| 3 | Barrido alto nivel: elevar gates al inicio + mover prosa dilutiva a `## Contexto & Notas` en los 5 archivos identificados | developer | #1 | `request-intake.md`, `request-execute.md`, `request-close.md`, `design-feature.md`, `design-draft.md` | grep de los 5 archivos muestra `## ⚠️ GATES` en primer 30%; diff confirma que no se perdio contenido | done | #3 | — | — | — |
| 4 | Barrido detalle: uniformar template (`## GATE:` + `**BLOQUEANTE**` + `[ ]` + `**Si falla**`) en los 28 gates de los 17 archivos | developer | #3 | `prompts/steps/*.md`, `prompts/agents/*.md`, `commands/dkc.md`, `prompts/deterministic-rules.md` (presentacion) | grep confirma template uniforme; conteo de `BLOQUEANTE` consistente con 28 gates | done | #3 | — | — | — |
| 5 | Fixes puntuales: Gap 3 (GATE spec en design-fix/improvement/refactor), Gap 4 (developer.md lee rules del contract), Gap 6c (scribe.md fallback Grep) | developer | #4 | `design-fix.md`, `design-improvement.md`, `design-refactor.md`, `developer.md`, `scribe.md` | cada archivo cumple los scenarios de REQ-IMPROVE-05 | done | #3 | — | — | — |
| 6 | Validacion: simulacion mental HOR-001/002/003 con prompts nuevos + regression `npm test` en horadric-cube | reviewer | #5 | (lectura) | tabla de 3 filas en session log + `npm test` devuelve 7 files / 31 tests | done | #3 | — | — | — |

### Task contract

```
Task #1: Escribir prompts/_style.md
- source_ref: REQ-IMPROVE-01
- agent: architect
- files: prompts/_style.md (nuevo)
- precondition: rama HOR-004-audit-fix-guards creada desde main en deckard repo
- expected_output:
  - Archivo con 5 principios, cada uno con: regla + ejemplo antes/despues + cuando aplica
  - Cita de origen (audit de Session #2 del ticket HOR-004)
- validation: lectura manual (no automatizable porque es estilo editorial)
- rollback: git revert; no hay otros archivos afectados
- rules: [1, 2, 11, 16]  # certeza, source_ref, KB-first, propagacion
```

```
Task #2: Gap 1 — request.md lista design-transition-to-execute
- source_ref: REQ-IMPROVE-05 (Gap 1)
- agent: developer
- files: prompts/workflows/request.md
- precondition: task #1 completa (estilo disponible)
- expected_output:
  - Frontmatter `steps:` lista `design-transition-to-execute` como step con `when: "work_type NO es explore"`
  - Cuerpo del workflow menciona el step en la tabla de work_type → design step
- validation: grep, leer el archivo completo
- rollback: git revert
- rules: [5, 8, 10, 11, 16]  # multi-capa, rollback, limites, KB-first, propagacion
```

```
Task #3: Barrido alto nivel — elevacion de gates + deslizar prosa
- source_ref: REQ-IMPROVE-02, REQ-IMPROVE-04
- agent: developer
- files:
  - prompts/steps/request-intake.md
  - prompts/steps/request-execute.md
  - prompts/steps/request-close.md
  - prompts/steps/design-feature.md
  - prompts/steps/design-draft.md
- precondition: task #1 (estilo)
- expected_output:
  - Cada archivo tiene `## ⚠️ GATES` en el primer 30%
  - Cada archivo tiene `## Contexto & Notas` al final con la prosa movida
  - Diff: balance — nada de contenido se pierde
- validation:
  - grep: `## ⚠️ GATES` aparece en primer tercio en los 5 archivos
  - grep: `## Contexto & Notas` aparece como ultima seccion H2 en los 5 archivos
  - manual: diff muestra reubicacion, no perdida
- rollback: git revert del commit de esta task
- rules: [5, 8, 10, 11, 16]
```

```
Task #4: Barrido detalle — formato uniforme de 28 gates
- source_ref: REQ-IMPROVE-03
- agent: developer
- files: todos los prompts/steps/*.md, prompts/agents/*.md, prompts/deterministic-rules.md, commands/dkc.md
- precondition: task #3 (gates ya elevados, mas facil aplicar template)
- expected_output:
  - Cada gate (28 totales) sigue el template: `## GATE: {titulo}` + `**BLOQUEANTE**: linea` + `[ ]` checklist + `**Si falla**:` linea
  - Conteo de "BLOQUEANTE" en prompts/ = 28 ± 1 (el ±1 cubre casos de mencion en prosa explicativa)
- validation:
  - script bash: cuenta BLOQUEANTE y checklist `[ ]` — ratio ≈ 1:N (cada BLOQUEANTE tiene al menos 1 `[ ]`)
  - manual: spot-check de 5 gates aleatorios
- rollback: git revert; preservar el commit de task #3 que ya tiene progreso
- rules: [5, 10, 11, 16]
```

```
Task #5: Fixes puntuales Gap 3 + 4 + 6c
- source_ref: REQ-IMPROVE-05
- agent: developer
- files:
  - prompts/steps/design-fix.md (agregar GATE spec completo)
  - prompts/steps/design-improvement.md (agregar GATE spec completo)
  - prompts/steps/design-refactor.md (agregar GATE spec completo)
  - prompts/agents/developer.md (agregar instruccion sobre rules:)
  - prompts/agents/scribe.md (reemplazar dkc_get_rules huerfano por fallback Grep)
- precondition: task #4 (estilo aplicado)
- expected_output:
  - Los 3 design-{tipo} tienen GATE de spec completo al inicio, siguiendo el estilo nuevo
  - developer.md tiene una linea explicita en su procedimiento
  - scribe.md sin mencion huerfana de dkc_get_rules
- validation: scenarios de REQ-IMPROVE-05 (TC-1 a TC-7)
- rollback: git revert; cambios aislados por archivo
- rules: [5, 8, 10, 11, 16]
```

```
Task #6: Validacion — simulacion + regression
- source_ref: REQ-PRESERVE-01, REQ-PRESERVE-02
- agent: reviewer
- files: (lectura)
- precondition: task #5 completa, rama lista para cierre
- expected_output:
  - Tabla 3×4 en session log: ticket | work_type | flags | gate activa? | esperado? | OK?
  - npm test output: 7 files / 31 tests / 0 failed identico a baseline
- validation:
  - simulacion: recorrer HOR-001, HOR-002, HOR-003 paso por paso con prompts nuevos
  - regression: `cd horadric-cube && npm test`
- rollback: N/A (validacion)
- rules: [4, 7, 13]  # hechos, test cases, evidencia
```

## Constraints

- **RULE-index-001** (horadric) — NO aplica directamente (es sobre index SQLite), pero es precedente cultural: "consumer se adapta, no migra datos". Aqui el patron es: "si un gate no funciona, fixear su expresion; no eliminarlo ni reemplazarlo con algo mas pesado".
- **RULE-server-frontmatter-legacy-001** (horadric) — no aplica (es sobre frontmatter de horadric-cube). Mismo patron cultural: cambio defensivo, sin refactor mayor.

## Dependencies

Ninguna externa. Trabajo editorial self-contained en `deckard/prompts/` + `deckard/commands/`.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Guia de estilo muy rigida → LLM no cumple igual, genera friccion | medium | medium | Mantener principios concretos pero no dogmaticos; cada principio con "cuando aplica" explicito. Si un step tiene razon para desviar, documentarlo inline |
| Pase transversal descubre gaps nuevos (scope creep) | medium | low-medium | Si aparecen, agregar al backlog del ticket (no al spec). No expandir REQs. En extremo: abrir ticket de continuacion |
| Revision manual de 17 archivos cansa → inconsistencias introducidas | medium | medium | Task #4 es el pase detalle — dividir en 3 batches (workflows/steps/agents) y validar cada batch por separado |
| Gates elevados al inicio confunden al LLM porque ve instruccion desconectada del contexto | low | high | Cada gate en `## ⚠️ GATES` va con link textual a la seccion del cuerpo donde se ejecuta (`→ ver seccion X`). No es solo copia — es indice |
| Simulacion mental HOR-001 es subjetiva (no reproducible) | low | low | La simulacion se registra en session log con razonamiento paso por paso (no solo "se habria bloqueado"); el dev firma la validacion |

## Open questions

Ninguna pendiente — decisiones cerradas en intake (opcion A) y en analisis previo al spec (Gap 6 → fallback Grep).

## Decisions

### DEC-LOCAL-01: Opcion A — todo en un solo ticket, guia de estilo primero

- **Contexto**: Al agregar Gap 7 (peso de instrucciones), el alcance del ticket excede un fix puntual. Opciones: A (todo junto, guia primero), B (partir en 2 tickets), C (Gap 7 como core, 1-6 como ejemplos)
- **Drivers**:
  - Evitar re-trabajo: fixear Gap 2 con estilo viejo y re-fixearlo despues en pase transversal
  - Una pasada es mas coherente para el LLM que la va a leer
  - El dev prefiere entregas grandes con vision completa
- **Opcion elegida**: A — guia primero (task #1), luego barrido transversal, luego puntuales
- **Alternativas**:
  - B (partir en 2 tickets): menos riesgoso por lote pero obliga a revisitar archivos
  - C (Gap 7 como core): enfoque mas abstracto — el dev prefirio ejemplos concretos visibles
- **Consecuencias**:
  - Gana: coherencia interna, evita re-trabajo, una sola PR
  - Pierde: ticket mas grande, mas sesiones de execute, riesgo de scope creep
- **Session**: #2 (design)

### DEC-LOCAL-02: Gap 6 — opcion (c) fallback Grep

- **Contexto**: `scribe.md:32` menciona `dkc_get_rules(context, role)` como funcion MCP obligatoria, pero no esta documentada en la seccion de MCP tools disponibles. Tres opciones: (a) documentar si existe, (b) remover la mencion, (c) marcar como pendiente + documentar fallback
- **Drivers**:
  - En esta sesion operamos sin MCP server y la regla 11 (KB-first) se aplico igual con Grep
  - Remover la mencion oculta la intencion futura (cuando el MCP exista, se usa)
  - Documentar sin verificar es inventar una API
- **Opcion elegida**: (c) — mantener la mencion con fallback explicito ("si hay MCP: dkc_get_rules; sin MCP: Grep sobre rules/{module}/")
- **Alternativas**:
  - (a) documentar: no se puede sin verificar el MCP server, aqui no disponible
  - (b) remover: pierde la intencion, cuando el MCP se implemente alguien tiene que reintroducir
- **Consecuencias**:
  - Gana: scribe tiene path claro hoy y manana
  - Pierde: documentar dos modos de operacion en vez de uno (acepatable, refleja realidad)
- **Session**: #2 (design)

## Success metrics

No aplican. El "exito" es cualitativo: al hacer la proxima `/dkc` request, los gates se ejecutan sin que el dev los recuerde.

## Technical reference

### Audit de sesion previa — tabla de peso de gates

Del reporte del Explore haiku en Session #2:

| archivo | lines | gates | formato_dominante | posicion_avg | severidad_peso |
|---------|-------|-------|-------------------|--------------|----------------|
| request.md | 89 | 1 | prose | 70-100% | baja |
| request-intake.md | 306 | 3 | prose+checklist | 25/45/92% | alta (ultimo gate en 92%) |
| request-execute.md | 277 | 2 | prose | 53/92% | critica (GATE E en 92%) |
| request-close.md | 290 | 1 | checklist | 88% | critica (GATE FINAL en 88%) |
| design-feature.md | 288 | 1 | checklist | 87% | alta |
| design-fix.md | 207 | 0 | — | — | Gap 3 |
| design-improvement.md | 262 | 0 | — | — | Gap 3 |
| design-refactor.md | 217 | 0 | — | — | Gap 3 |
| design-draft.md | 240 | 1 | checklist | 90% | alta |
| design-transition-to-execute.md | 57 | 1 | prose | 17% | baja (archivo corto) |
| agents/scribe.md | 243 | 0 (ademas mencion huerfana) | — | — | Gap 6 |
| agents/developer.md | 112 | 0 | — | — | Gap 4 |
| deterministic-rules.md | 274 | 18 reglas | prose numerada | distribuido | media (presentacion) |
| commands/dkc.md | 124 | 0 (mencion regla 18 en bullet) | prose | — | baja |

Total: 28 gates, 6 de 10 criticos en 70-100% final, 3 formatos distintos (checklist/prose/numero), ~150 lineas de prosa dilutiva post-gate.

### Patron estructural a reproducir (template de archivo con gate)

```markdown
---
name: {step name}
type: step
...
---

# {Titulo}

{1-2 lineas de purpose}

## ⚠️ GATES

Esta seccion lista los gates bloqueantes del step. Ejecutarlos al entrar — no al final.

### GATE: {titulo del gate}
**BLOQUEANTE**: {condicion}

[ ] criterio 1
[ ] criterio 2
...

**Si falla**: {que hacer}
→ Ver instruccion completa en seccion "## {Seccion donde se ejecuta}"

## Instrucciones

### 1. {Paso concreto}
...

### X. {Seccion donde se ejecuta el gate}
{Instruccion completa del gate}

## Contexto & Notas

{Prosa explicativa ex-"## Importante", "## Por que este gate existe", "## Fallas conocidas"}
```

## Rules discovered

*(se llena durante execute si aparecen)*

## Bugs found

*(ninguno previsto)*

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01..05 cumplidos
- [ ] **Simulacion**: REQ-PRESERVE-01 tabla 3×4 con 3 OKs
- [ ] **Regression**: REQ-PRESERVE-02 `npm test` horadric-cube sin cambio
- [ ] **Rules**: N/A (este spec no crea rules — el propio _style.md es la "regla" para prompts)
- [ ] **Integration**: ejecutar `/dkc status` o algo equivalente y confirmar que los prompts son legibles
- [ ] **Docs**: _style.md sirve como documentacion del cambio
