---
id: SPEC-workflow-enforcement-t2-and-session-modal
project: horadric
ticket: HOR-058
status: done
---

# Enforcement T2 de gates DKC (DET-27 + DET-25 + DET-21-0b) via evidencia observable + modal de session en HC

# Enforcement T2 de gates DKC (DET-27 + DET-25 + DET-21-0b) via evidencia observable + modal de session en HC

## Executive summary — lo que estas aprobando

> *Si solo lees el Executive summary y te basta para aprobar, ese es el objetivo. El detalle tecnico vive en Requirements + Tasks.*

**Que se quiere**: cerrar el patron sistemico observado durante el intake — el LLM en autopilot satisface el RESULTADO de un gate (campo en frontmatter, fila en tabla) sin ejecutar el PASO interno que lo justifica. Lo aplica a 3 instancias con la misma estructura: commits diferidos como "pendiente" en lugar de hash real (DET-27), test cases con `Actual: —` diferidos al close (DET-25), y pregunta de skip teach-intake asumida por default sin invocar AskUserQuestion (DET-21 paso 0b). El fix introduce una **convencion T2 de evidencia observable** unificada (`decisions_log` array en frontmatter + validator `dkc-validate StepDecisions` + helper `dkc-record-decision`) que cierra el escape — sin entry verificable, el gate falla. Plus: rediseno del listado de sessions en HC como tabla resumida con accion explicita "Ver detalle" → modal con 3 tabs (Resumen · Commits · Decisiones), que reemplaza el expandable inline actual y absorbe el SessionCommitsModal aislado.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Convencion T2 unificada** (decisions_log + validator + helper) para los 3 patrones, en lugar de 3 fixes independientes | Un solo mecanismo enforza los 3 casos; ahorra duplicacion y queda extensible para futuros pasos interactivos. Alternativa descartada: reforzar cada prompt aislado (T1) — mismo mecanismo que ya fallo |
| 2 | **Granularidad estricta de commits**: 1 session = 1+ commits, todos cubriendo SOLO esa session (separados por tipo feat/test/docs si aplica) | Sin restriccion estricta, el escape "agrupar al final" reaparece. El compromiso entre "1 commit por feature logica" y "1 commit por session DKC" se resuelve permitiendo multiples commits por session (feat + test + docs) pero ninguno spanning sessions. Resuelve AQ1 + AQ3 |
| 3 | **A-hook que dispara G1 al detectar Edit de `**Gate decision:**`** con valor `continue\|iterate` | Sin enforcement automatico, el gate sigue dependiendo de disciplina del LLM. Trigger preciso (no spam por cualquier edit del ticket). Resuelve AQ2 |
| 4 | **SessionDetailModal nuevo separado** que absorbe SessionCommitsModal. SessionCommitsBadge + SessionCommitsModal **deprecados** | Un solo punto de entrada al detalle de session. Reduce 2 componentes a 1. Verificado: solo se usan desde SectionSessions, sin impacto externo |
| 5 | **Backwards compat**: tickets pre-2026-05-17 sin `decisions_log` no se invalidan — validator skipea via verificacion de `created` field | Sin esto, 50+ tickets cerrados marcarian todos `invalid`. Patron analogo a DET-25 backwards compat |

**Riesgos principales y como los mitigamos**:

- **Dogfooding del propio HOR-058**: este ticket DEBE cumplir DET-27/DET-25/DET-21-0b en sus sessions execute. Si HOR-058 cierra mal, el fix no funciono → mitigacion: TC-16 dogfooding incluido como acceptance checkpoint S4.GATE
- **El a-hook dispara antes de que el codigo del validator este listo** (orden de implementacion): a-hook se registra solo en S5 — DESPUES de S4 (validator base) — y solo se activa cuando S4.GATE pasa
- **Schema drift continuado** (B1 closed_reason + B2 status enum): si S4 no toca esos schemas, el ticket no puede cerrar limpio (validador del ticket falla). Mitigacion: B1 + B2 incluidos como tasks explicitas en S9 — no son backlog opcional, son tasks de cierre

**Que NO se hace en este ticket**:

- Tabla `## Decisiones del workflow` en pagina ticket de HC (descartado en draft v2 — solo modal de session muestra decisiones)
- Editor de decisions desde HC (read-only — consistente con regla `READ-ONLY` del proyecto)
- Aplicar convencion T2 a otros DETs distintos de 27/25/21-0b (futuras extensiones via HOR-XXX si emergen)
- Retroactividad: tickets cerrados pre-2026-05-17 no se migran

**Tamano estimado**: 6 sessions ejecutables (S4-S9), aproximadamente **13-18h** efectivas distribuidas. Mas riesgosa: **S8** (UI modal con tabs + integracion + deprecation de 2 componentes existentes) — gate ⚑ fuerte por cambio user-facing.

**Como vas a saber que funciona**:

- Abro un ticket dummy, ejecuto un ciclo execute (1 session con tasks de codigo) y al cerrar `S{N}.GATE` con decision `continue`, el a-hook automatico bloquea si no hay commit real (hash) en `**Commit DET-27**:`. No puedo escribir "pendiente" como satisfactor.
- Ejecuto teach-intake en un ticket nuevo: el LLM invoca AskUserQuestion sin asumir default; mi respuesta queda registrada como entry `teach-intake-0b` en `decisions_log`. Si el LLM salto la pregunta, el gate de salida del step falla.
- Abro un ticket existente en HC: el listado de sessions es una tabla resumida; click en una fila o "Ver detalle" abre modal con 3 tabs. Tab Commits muestra el commit + diff embedded (lo que antes hacia SessionCommitsModal aislado). Tab Decisiones lista entries del decisions_log filtradas por la session.
- HOR-058 cierra con tabla `## Commits` poblada con commits granulares (1+ por session ejecutada), y la columna Tasks de cada commit lista solo `S{N}.T*..S{N}.GATE` (no spans entre sessions).

---

## Purpose

Cerrar el escape verbal/diferido que el LLM en autopilot encuentra en 3 gates de DKC (DET-27 commits, DET-25 test cases, DET-21-0b skip teach) mediante una convencion T2 unificada de evidencia observable (`decisions_log` + validator + helper). Plus rediseño del listado de sessions en HC para que la informacion T2 sea consumible: tabla resumida + modal con tabs (Resumen · Commits · Decisiones).

## Requirements

### REQ-FIX-01: Convencion T2 base (decisions_log + validator + helper)

> **Que cambia**: cada step interactivo del workflow (teach-intake paso 0b, commit DET-27, registro test cases, etc.) escribe una entry estructurada en el array `decisions_log` del frontmatter del ticket. Un validator nuevo verifica que el ticket no cierre con steps interactivos faltantes.
> **Por que**: hoy el gate de salida verifica solo el RESULTADO (`teachings.intake ∈ {done, skipped}`), no que el paso interno se haya ejecutado. El LLM asume defaults o difiere y el gate pasa igual.

El sistema MUST exponer un schema zod `DecisionEntrySchema` (definido en `data-model.ts` del draft v3) que valida cada entry del array `decisions_log` con campos `timestamp` (ISO 8601), `step` (enum InteractiveStepId), `choice` (discriminated por step), `reason` (opcional), `session` (opcional, formato `S{N}` o `S{N}.T{M}`), `actor` (`dev | llm-autopilot | system`).

El sistema MUST exponer comando `./commands/dkc-validate StepDecisions {ticket}.md` que retorna `valid: true` solo si todos los entries del `decisions_log` pasan el schema. Exit code 1 en fallas con `errors[]` en JSON output.

El sistema MUST exponer comando `./commands/dkc-record-decision {ticket} --step <id> --choice <val> [--reason <txt>] [--session <id>]` que append-only escribe una entry estructurada con timestamp automatico ISO al `decisions_log` del frontmatter del ticket markdown.

**Actor**: system + scribe
**Layers**: meta (commands, schemas, templates)

<details><summary>Scenarios de validacion</summary>

#### Scenario: validator pass con cobertura completa
- **GIVEN** ticket con workflow_state que muestra teach-intake como step pasado Y `teachings.intake === 'skipped'`
- **WHEN** se ejecuta `./commands/dkc-validate StepDecisions {ticket}.md`
- **THEN** retorna exit 0 si existe entry `step: teach-intake-0b` en `decisions_log` con `choice: skip-tactico` o `skip-otra-razon` Y `reason` no vacio
- **AND** retorna exit 1 con `Missing decision for step 'teach-intake-0b'` si la entry falta

#### Scenario: helper escribe entry valida
- **GIVEN** ticket sin entry teach-intake-0b
- **WHEN** dev ejecuta `dkc-record-decision HOR-XX --step teach-intake-0b --choice skip-tactico --reason "ticket corto"`
- **THEN** frontmatter del ticket ahora tiene entry con timestamp ISO actual, actor `dev` (default), step + choice + reason segun args
- **AND** el array es append-only — entries previas no se modifican

#### Scenario: schema rechaza choice invalido
- **GIVEN** `dkc-record-decision HOR-XX --step teach-intake-0b --choice invalid-option`
- **WHEN** se valida contra el schema
- **THEN** falla con error: choice `invalid-option` no esta en enum `[generate, skip-tactico, skip-otra-razon]` para step `teach-intake-0b`

</details>

#### Acceptance
**El dev puede verificar que funciona**: ejecuto `dkc-record-decision` con args validos en un ticket dummy, abro el markdown y veo la entry en frontmatter `decisions_log`. Luego ejecuto `dkc-validate StepDecisions` y obtengo `valid: true`.

---

### REQ-FIX-02: Enforcement DET-27 (commits con hash real, no "pendiente")

> **Que cambia**: al cerrar `S{N}.GATE` con `continue|iterate`, el bloque `**Commit DET-27**:` debe contener un hash git real (formato 7 caracteres minimum). Marcar "pendiente — propuesto despues" deja de ser aceptable.
> **Por que**: HOR-056 cerro 4 de 6 sessions con escape verbal "pendiente". HOR-057 agrupo 2 sessions en 1 commit. La granularidad por session se pierde.

El sistema MUST extender `./commands/dkc-verify-gate G1 {TICKET-id}` para que ademas de `git status --short` (working tree limpio) valide el bloque `**Commit DET-27**:` del ultimo `S{N}.GATE` del ticket markdown — exigir hash valido (regex `[0-9a-f]{7,40}`). Cualquier otro string (incluyendo "pendiente", "TBD", "—") retorna FAIL.

El sistema MUST extender `prompts/steps/request-execute.md` para que al cerrar gate decision `continue|iterate`, el scribe ejecute commit ANTES de Edit del `**Gate decision:**` y registre el hash en el bloque `**Commit DET-27**:`. Diferir el commit verbalmente con frase "pendiente" se documenta como anti-pattern en el prompt con ejemplo negativo.

**Actor**: scribe + dev (commit confirmation)
**Layers**: meta (prompts, validators)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket con "pendiente" rechazado
- **GIVEN** session con `**Gate decision:** continue` marcada Y `**Commit DET-27**: pendiente — propuesto despues de S{N+1}`
- **WHEN** se ejecuta `./commands/dkc-verify-gate G1 HOR-XX`
- **THEN** exit code != 0, mensaje "DET-27 FAIL: `**Commit DET-27**:` debe contener hash real, no 'pendiente'"

#### Scenario: ticket con hash real pasa
- **GIVEN** session con commit DET-27 ejecutado Y `**Commit DET-27**: a3f9c12 chore(workflow): HOR-XX session N completada`
- **WHEN** se ejecuta validator G1
- **THEN** exit 0, mensaje "DET-27 OK: hash a3f9c12 valido, working tree limpio"

</details>

#### Acceptance
**El dev verifica**: edito un ticket de prueba dejando "pendiente" en commit DET-27, ejecuto G1 y obtengo FAIL. Reemplazo por hash real, ejecuto G1 y obtengo PASS.

---

### REQ-FIX-03: Granularidad de commits por session (estricto, AQ1+AQ3 resueltas)

> **Que cambia**: cada commit cubre tasks de UNA sola session. Multiples commits por session son OK (feat/test/docs separados) pero cada uno con tasks de la misma session.
> **Por que**: HOR-056 cubrio 6 sessions con 2 commits agrupados — pierde trazabilidad por session.

El sistema MUST documentar en DET-27 (sec "Granularidad — separacion por tipo") la siguiente regla normativa:

> "Cada commit DET-27 cubre tasks de UNA SOLA session (`Tasks: S{N}.T1..S{N}.GATE`, sin spans entre sessions). Multiples commits por session son aceptables (1 feat + 1 test + 1 docs si aplica) pero ninguno puede cubrir tasks de sessions distintas."

El sistema MUST extender `commands/dkc-verify-gate G1` para parsear la columna `Tasks` del nuevo entry en tabla `## Commits` del ticket y verificar que no haya spans cross-session. FAIL si la lista de tasks de un commit contiene `S{N}.*` y `S{M}.*` con N != M.

**Actor**: scribe + dev
**Layers**: meta (prompts + validators)

<details><summary>Scenarios de validacion</summary>

#### Scenario: 1 session, 3 commits separados por tipo — OK
- **GIVEN** session S5 que toco resolvers + tests + docs
- **WHEN** dev hace 3 commits: feat (S5.T1-T3), test (S5.T4), docs (S5.T5)
- **THEN** tabla `## Commits` muestra 3 filas, todas con `Tasks: S5.*`. G1 pasa.

#### Scenario: 1 commit cubriendo 2 sessions — RECHAZADO
- **GIVEN** LLM intenta commit con `Tasks: S5.T1..S5.GATE, S6.T1`
- **WHEN** G1 valida
- **THEN** FAIL: "DET-27 granularidad: commit cubre multiples sessions (S5, S6). Splitear en 1+ commits por session."

</details>

#### Acceptance
**El dev verifica**: en HOR-058 propio, S4 cierra con 1+ commits cuyos `Tasks` listan solo `S4.*`. No hay commit con `S4.*, S5.*` en la misma fila.

---

### REQ-FIX-04: Enforcement DET-25 (test cases registrados inline, no diferidos al close)

> **Que cambia**: gate D del request-execute.md bloquea cierre de task que ejecuto un TC con `Affects UI: yes` sin llenar `Actual` ni `Evidence` (ni override frontmatter explicito). Sin esto el TC se considera no-ejecutado.
> **Por que**: HOR-018/019/020 cerraron con 20 TCs `Actual: —` pese a que los tests se ejecutaron — el LLM difiere registro al close y termina llenando retroactivo desde memoria perdida.

El sistema MUST extender el gate D de `prompts/steps/request-execute.md` para que verifique:
- Si la task ejecuto algun TC (detectable por menciones en session log o por output del developer): los TCs deben tener `Actual` no vacio Y `Evidence` no vacio o override formal en frontmatter `overrides`.
- Si la verificacion falla: gate D bloquea con mensaje literal "DET-25: TC-X ejecutado en S{N}.T{M} requiere Actual+Evidence o override".

El sistema MUST registrar entry `step: test-case-registration` en `decisions_log` cuando dev/LLM cierra una task que ejecuto TCs, con choice `registered-inline` o `override-no-evidence` + reason si override.

**Actor**: scribe + developer
**Layers**: meta (prompts, helper integration)

<details><summary>Scenarios de validacion</summary>

#### Scenario: task con TC visual sin Actual bloquea
- **GIVEN** task S2.T3 ejecuto TC-4 (`Affects UI: yes`), tabla TCs tiene `Actual: —` y `Evidence: —`
- **WHEN** scribe cierra task
- **THEN** gate D rechaza con "DET-25: TC-4 ejecutado en S2.T3 requiere Actual+Evidence o override"

#### Scenario: override formal pasa
- **GIVEN** mismo TC pero frontmatter del ticket tiene `overrides: [{tc: "TC-4", reason: "smoke diferido a S3.T3"}]`
- **WHEN** gate D valida
- **THEN** PASS + entry `test-case-registration` con choice `override-no-evidence` y reason del override en `decisions_log`

</details>

#### Acceptance
**El dev verifica**: en HOR-058 S6 dogfooding, la task que ejecuta TC-6 (gate D bloquea sin Actual) registra Actual + Evidence al momento. Entry visible en decisions_log al cerrar la task.

---

### REQ-FIX-05: Enforcement DET-21 paso 0b (pregunta obligatoria, no asume default)

> **Que cambia**: al entrar a `teach-intake`, el LLM invoca AskUserQuestion siempre (sin asumir default por respuestas previas del dev). La eleccion del dev queda registrada como entry observable.
> **Por que**: en este intake mismo (2026-05-17), el LLM asumio default=si tras "avanza" del dev — el gate de salida de teach-intake paso porque solo verificaba `teachings.intake ∈ {done, skipped}`, no la pregunta.

El sistema MUST modificar `prompts/steps/teach-intake.md` paso 0b para que invoque AskUserQuestion explicito con 3 opciones (`generate`, `skip-tactico`, `skip-otra-razon`) — sin clausula "asumir default".

El sistema MUST escribir entry `step: teach-intake-0b` en `decisions_log` con la choice del dev y reason (si skip-*).

El sistema MUST extender el gate de salida de `teach-intake.md` para que invoque `dkc-validate StepDecisions` y verifique entry `teach-intake-0b` presente. Si falta, FAIL con "Missing decision for step 'teach-intake-0b' despite teachings.intake set".

**Actor**: scribe + dev
**Layers**: meta (prompts, validator)

<details><summary>Scenarios de validacion</summary>

#### Scenario: pregunta obligatoria invocada
- **GIVEN** ticket nuevo entrando a teach-intake post intake-explore, dev escribio "avanza" previamente
- **WHEN** step inicia
- **THEN** LLM invoca AskUserQuestion con prompt "¿Generar teach-intake?" y 3 options. NO asume default por "avanza"

#### Scenario: gate falla sin entry
- **GIVEN** ticket dummy con `teachings.intake: skipped` pero `decisions_log` sin entry `teach-intake-0b`
- **WHEN** se ejecuta validator del gate de salida
- **THEN** FAIL: "Missing decision for step 'teach-intake-0b' despite teachings.intake set"

</details>

#### Acceptance
**El dev verifica**: creo un ticket de prueba que pase por teach-intake. El LLM me pregunta explicitamente. Mi eleccion queda visible en frontmatter `decisions_log` y en el modal de session (tab Decisiones).

---

### REQ-IMPROVE-01: SessionDetailModal con tabs (absorbe SessionCommitsModal)

> **Que cambia**: el listado de sessions en HC es ahora tabla resumida con accion "Ver detalle" → modal con 3 tabs (Resumen · Commits · Decisiones). El modal aislado de commits (SessionCommitsModal) desaparece — sus commits ahora viven dentro del modal de session.
> **Por que**: el expandable inline actual ocupa varias pantallas; comparar sessions requiere expandir multiples + scroll. SessionCommitsModal aislado no tiene contexto de session.

El sistema MUST renderizar la sub-seccion `## Sessions` del ticket como **tabla resumida** (columnas: `#`, `Fecha`, `Phase`, `Tier`, `Objetivo`, `Tasks done/total`, `Gate decision`, `Commits count`, accion `Ver detalle`).

El sistema MUST exponer modal `SessionDetailModal.vue` (nuevo componente) con shell `@headlessui/vue Dialog` (focus trap, ESC, click backdrop, aria-modal). Layout: header con badges (phase/tier/gate), tab bar (Resumen · Commits · Decisiones), body con contenido del tab activo, footer con navegacion entre sessions.

El sistema MUST mostrar en **tab Commits**: lista de commits asociados a la session (panel izq) + `CommitDiffPanel` para diff embedded (panel der). Reusa `CommitDiffPanel.vue` existente. Absorbe la funcionalidad que hoy hace SessionCommitsModal.

El sistema MUST mostrar en **tab Decisiones**: tabla con entries del `decisions_log` filtradas por `session` matcheando la session activa (columnas: Step, Choice, Reason).

El sistema MUST **deprecar y eliminar** `SessionCommitsBadge.vue` y `SessionCommitsModal.vue` — usos en `SectionSessions.vue:33-34, 368, 587` se reemplazan por el nuevo modal.

**Actor**: user (dev viendo HC)
**Layers**: frontend (Vue components, composables)

<details><summary>Scenarios de validacion</summary>

#### Scenario: click en fila abre modal
- **GIVEN** dev en pagina detalle de un ticket con 6 sessions cerradas
- **WHEN** click en fila S2 o en "Ver detalle →"
- **THEN** modal abre con focus trap en X (cerrar), tab Resumen activo por defecto, header muestra badges de S2

#### Scenario: tab Commits muestra commits de la session
- **GIVEN** modal abierto en S5 que tiene 2 commits asociados
- **WHEN** dev click en tab Commits
- **THEN** panel izq lista los 2 commits con hash + mensaje + fecha; click en uno carga diff en panel der via CommitDiffPanel

#### Scenario: cerrar con ESC restaura listado
- **GIVEN** modal abierto
- **WHEN** dev presiona ESC
- **THEN** modal cierra, scroll position de la tabla preservado, focus retorna al boton "Ver detalle" de la fila origen (a11y)

#### Scenario: deprecation sin impacto externo
- **GIVEN** repo HC tras el rediseño
- **WHEN** se hace grep "SessionCommitsBadge|SessionCommitsModal" en src/
- **THEN** 0 occurrences (componentes eliminados); el unico file que los importaba (SectionSessions.vue) ahora importa SessionDetailModal

</details>

#### Acceptance
**El dev verifica**: abro HC en un ticket reciente (ej HOR-056), veo tabla resumida en lugar de cards. Click en S2 abre modal. Tabs funcionan. Cierro con ESC. Click en SessionCommitsBadge en otra parte de la UI → 404 (componente eliminado, sin usos restantes).

---

### REQ-REGRESSION-01: Quick/explore exentos de T2

> **Que cambia**: tickets `work_type: quick` o `explore` no requieren entries de `decisions_log` y no disparan validator StepDecisions con FAIL.

El sistema MUST documentar en DET-27 + DET-25 + DET-21-0b que `work_type ∈ {quick, explore}` queda exempto.

El sistema MUST extender validator `dkc-validate StepDecisions` para skipear tickets con `work_type ∈ {quick, explore}` (verificacion en frontmatter antes de la cobertura).

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket quick path no requiere entries
- **GIVEN** ticket dummy con `work_type: quick` y `decisions_log: []`
- **WHEN** ejecutar validator
- **THEN** exit 0, no se invoca verificacion de cobertura (skip explicito por work_type)

</details>

---

### REQ-REGRESSION-02: Listado de sessions HC sin expandable

> **Que cambia**: la sub-seccion `## Sessions` ya no se renderiza como cards con chevron — es tabla resumida. El click anterior en chevron desaparece; ahora click en fila o boton dispara modal.

El sistema MUST eliminar de `SectionSessions.vue`:
- `expanded` ref (linea 45)
- `toggle` function (linea 50)
- chevron rotate (linea 309)
- bloque condicional `v-if="expanded[key(s)]"` (linea 378)

El sistema MUST reemplazar el listado de cards por un componente `SessionsSummaryTable.vue` (nuevo) que renderiza la tabla con columnas declaradas en REQ-IMPROVE-01.

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin chevrons visibles
- **GIVEN** dev en HC en ticket con sessions
- **WHEN** carga la pagina
- **THEN** no hay iconos de chevron junto a los headers de session; ninguna session expandida inline

</details>

---

### REQ-REGRESSION-03: Backwards compat — tickets pre-2026-05-17

> **Que cambia**: tickets cerrados pre-2026-05-17 sin campo `decisions_log` en frontmatter no se invalidan; el validator los skipea.

El sistema MUST extender validator `dkc-validate StepDecisions` para skipear tickets con `created < 2026-05-17` (verificacion en frontmatter antes de la cobertura).

El sistema MUST permitir que el campo `decisions_log` falte en el frontmatter — el schema lo trata como `decisions_log: []` (default vacio).

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket legacy no falla
- **GIVEN** ticket HOR-016 (cerrado 2026-05-09, sin decisions_log)
- **WHEN** validator se ejecuta
- **THEN** exit 0 con mensaje "skipped (legacy: created 2026-05-09 < 2026-05-17)"

</details>

---

## Fix scope

### Antes (comportamiento actual)

- **DET-27**: gate L528 BLOQUEANTE DURO se evade via `**Commit DET-27**: pendiente — propuesto despues de SX.GATE`. Granularidad: commits agrupados spanning multiples sessions (HOR-056 = 6 sessions en 2 commits)
- **DET-25**: gate D verifica solo "fila existe en tabla TCs"; columna `Actual: —` pasa hasta el gate de close donde se llena retroactivo desde memoria perdida (HOR-018/019/020 evidencia)
- **DET-21 paso 0b**: LLM asume default por "avanza"/"ok" previo del dev; gate de salida no verifica que la pregunta se ejecutara
- **HC modal**: SessionCommitsModal aislado sin contexto de session; SectionSessions.vue:305-378 expandable inline ocupa varias pantallas

### Despues (comportamiento esperado)

- **DET-27**: commit con hash real obligatorio en `**Commit DET-27**:`. Granularidad estricta: 1+ commits por session, cada uno cubriendo SOLO esa session
- **DET-25**: gate D bloquea task que cerro TC visual sin Actual + Evidence (o override formal); registro entry `test-case-registration` en decisions_log
- **DET-21 paso 0b**: AskUserQuestion siempre invocado; entry `teach-intake-0b` en decisions_log; gate falla si entry faltante
- **HC modal**: tabla resumida de sessions + SessionDetailModal con 3 tabs absorbiendo SessionCommitsModal. Listado limpio sin expandable inline

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `commands/lib/schemas/decisions.ts` (NUEVO) | Schema zod copia de `data-model.ts` del draft | Reusable por validator + helper |
| `commands/lib/schemas/ticket.ts` | Agregar campo `decisions_log: DecisionsLogSchema.default([])`; **arreglar B1** (`closed_reason: z.string().nullable()`); **arreglar B2** (extender enum status con valores del workflow extendido) | Tickets nuevos validan; backwards compat para pre-2026-05-17 |
| `commands/dkc-validate` | Agregar subcommand `StepDecisions` que invoca schema + cobertura | Nuevo subcommand `dkc-validate StepDecisions {ticket}.md` |
| `commands/dkc-record-decision` (NUEVO) | Helper para escribir entries estructuradas append-only en decisions_log | Invocable desde steps del workflow o terminal |
| `commands/dkc-verify-gate` | Extender G1: parsear `**Commit DET-27**:` exigir hash; validar granularidad por session en tabla `## Commits` | G1 retorna FAIL en escapes verbales |
| `prompts/steps/request-execute.md` | (1) Anti-pattern documentado para "pendiente"; (2) flujo commit ANTES de Edit gate decision; (3) gate D extendido para DET-25 enforcement; (4) registro entries `test-case-registration` + `commit-det-27` + `gate-decision` | Comportamiento runtime cambia para autopilot |
| `prompts/steps/teach-intake.md` | Paso 0b: AskUserQuestion obligatorio sin asumir default; registro entry `teach-intake-0b`; gate de salida extendido | Pregunta nunca se salta |
| `prompts/steps/request-close.md` | Mismo patron para teach-close (DET-22) por simetria | Skip teach-close tambien queda observable |
| `prompts/deterministic-rules.md` | DET-27 sec "Granularidad — separacion por tipo" clarificada con regla estricta; DET-25 + DET-21 referencian convencion T2 | Reglas alineadas |
| `templates/records/ticket.md` | Frontmatter: agregar `decisions_log: []` en la lista de campos | Nuevos tickets traen el campo |
| `horadric-cube/src/components/ticket-sections/SectionSessions.vue` | Eliminar expandable; reemplazar listado por `SessionsSummaryTable` + integrar trigger del nuevo modal | Listado limpio |
| `horadric-cube/src/components/ticket-sections/SessionsSummaryTable.vue` (NUEVO) | Tabla resumida con columnas + filter/sort + accion ver detalle | Reemplazo del listado de cards |
| `horadric-cube/src/components/sessions/SessionDetailModal.vue` (NUEVO) | Modal con 3 tabs (Resumen · Commits · Decisiones). Reusa CommitDiffPanel | Modal unico para detalle de session |
| `horadric-cube/src/components/commits/SessionCommitsModal.vue` | **ELIMINADO** | Absorbido por SessionDetailModal |
| `horadric-cube/src/components/commits/SessionCommitsBadge.vue` | **ELIMINADO** | Sin usos externos (verificado grep) |
| `horadric-cube/src/composables/useSessionCommits.ts` | Sin cambios — sigue reutilizandose | Modal nuevo lo consume |
| `horadric-cube/server/deckard/decisions.ts` (NUEVO) | Parser de decisions_log del frontmatter + endpoint API | Expone decisions_log a HC frontend |
| Tests vitest del area (commands + horadric-cube) | Tests nuevos para validator + helper + modal + tabla | Cobertura del fix |

---

## Tasks

### Session 4 — convencion T2 base (validator + helper + schema) [tier: T2] [tipo: auto]

**Objetivo**: producir la base reusable de la convencion T2 — schema, validator, helper. Sin aplicar todavia a DETs especificos (S5-S7).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Producir `commands/lib/schemas/decisions.ts` con copia/adaptacion de schemas zod del draft `data-model.ts` (InteractiveStepId, DecisionChoice, DecisionEntrySchema, DecisionsLogSchema) | REQ-FIX-01 | developer | — | `commands/lib/schemas/decisions.ts` (new) | `tsc --noEmit` pass; tests unit del schema validan EXAMPLE_DECISIONS_LOG | git revert | DET-2, DET-11 | pending | 4 |
| S4.T2 | Extender `commands/lib/schemas/ticket.ts` con campo `decisions_log: DecisionsLogSchema.default([])`. Arreglar B1 (`closed_reason: z.string().nullable()`). Arreglar B2 (status enum extendido union con workflow values) | REQ-FIX-01, B1, B2 | developer | S4.T1 | `commands/lib/schemas/ticket.ts` | `./commands/dkc-validate Ticket projects/horadric/tickets/HOR-058.md` exit 0; HOR-056 y HOR-057 validan tambien | git revert | DET-2, DET-7 (regression) | pending | 4 |
| S4.T3 | Agregar subcommand `StepDecisions` a `commands/dkc-validate`: invoca schema + verifica cobertura segun whitelist InteractiveStepId vs workflow_state del ticket. Skip tickets con `created < 2026-05-17` o `work_type ∈ {quick, explore}` | REQ-FIX-01, REQ-REGRESSION-01, REQ-REGRESSION-03 | developer | S4.T2 | `commands/dkc-validate` | Tests unit: ticket dummy con cobertura completa pasa; ticket legacy pasa; ticket sin entry de un step interactivo presente en workflow_state FAILa | git revert | DET-7, DET-13 | pending | 4 |
| S4.T4 | Crear comando `commands/dkc-record-decision` ejecutable: parse args (--step, --choice, --reason opcional, --session opcional, --ticket o auto-detect via .active_project), validar contra schema, append entry al frontmatter del ticket markdown via yaml parser. Captura timestamp ISO automatico, actor=`dev` default | REQ-FIX-01 | developer | S4.T1 | `commands/dkc-record-decision` (new) | Tests integration: invocar con args validos escribe entry; invocar con choice invalido falla con error claro | git revert | DET-2, DET-8 | pending | 4 |
| S4.T5 | Tests unit + integration completos: schemas (zod), validator (StepDecisions edge cases), helper (CLI args + write idempotencia). Cobertura del area >= 80% | REQ-FIX-01 | developer | S4.T3, S4.T4 | `commands/lib/schemas/decisions.test.ts`, `commands/dkc-validate.test.ts`, `commands/dkc-record-decision.test.ts` | `vitest run commands/` retorna verdes; coverage delta >= +5% del area commands | git revert | DET-7 | pending | 4 |
| S4.GATE | Gate de session — validar tests verdes + lint + validator funciona contra ticket dummy + dogfooding: agregar entry `commit-det-27` al propio HOR-058 al cerrar este gate | REQ-FIX-01 | scribe | S4.T5 | HOR-058.md (decisions_log) | `vitest run commands/` pass; `dkc-verify-gate G1 HOR-058` PASS; `dkc-validate StepDecisions HOR-058.md` PASS | n/a (gate) | DET-27, DET-23 | pending | 4 |

**Gate criteria**: Tests verdes + lint pass + validator funciona contra ticket dummy + HOR-058 S4 cierra con commit real (dogfooding).

---

### Session 5 — DET-27 con T2 (commits granulares + a-hook) [tier: T2] [tipo: auto]

**Objetivo**: aplicar la convencion T2 a DET-27. Cerrar escape verbal + a-hook automatico + granularidad estricta.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Extender `commands/dkc-verify-gate G1`: parsear `**Commit DET-27**:` del ultimo gate del ticket, exigir hash regex `[0-9a-f]{7,40}`. Validar granularidad parseando columna `Tasks` de tabla `## Commits` — FAIL si spans cross-session | REQ-FIX-02, REQ-FIX-03 | developer | S4.GATE | `commands/dkc-verify-gate` | Tests: "pendiente" → FAIL con mensaje claro; hash real → PASS; commit con `Tasks: S5.*, S6.*` → FAIL granularidad | git revert | DET-7, DET-8 | pending | 5 |
| S5.T2 | Editar `prompts/steps/request-execute.md`: (a) reordenar flujo — commit ANTES de Edit `**Gate decision:**`, (b) documentar anti-pattern "pendiente" con ejemplo negativo, (c) instrumentar registro entries `commit-det-27` y `gate-decision` via dkc-record-decision al cerrar gate | REQ-FIX-02 | developer | S5.T1 | `prompts/steps/request-execute.md` | Lint markdown OK; verificacion manual: el flujo descrito en el prompt es coherente; sin contradicciones con DET-27 | git revert | DET-11, DET-23 | pending | 5 |
| S5.T3 | Actualizar `prompts/deterministic-rules.md` DET-27 sec "Granularidad": agregar regla normativa "cada commit cubre tasks de UNA sola session, sin spans". Documentar resolucion de AQ1+AQ3 (1 session = 1+ commits granulares por tipo) | REQ-FIX-03 | scribe | S5.T2 | `prompts/deterministic-rules.md` | Texto coherente; ejemplos positivos/negativos; referencias cruzadas con DET-25 | git revert | DET-7 | pending | 5 |
| S5.T4 | Implementar a-hook que invoque `dkc-verify-gate G1` al detectar Edit de `**Gate decision:**` con valor `continue` o `iterate` (AQ2 resolved opcion b). Registrar a-hook en `prompts/steps/request-execute.md` Enforcement section | REQ-FIX-02 | developer | S5.T1 | `prompts/steps/request-execute.md`, posiblemente `commands/dkc-hook-runner` | Tests integration: Edit del ticket que toca gate decision con continue dispara G1; Edit que toca otra parte del ticket NO dispara | git revert | DET-8 | pending | 5 |
| S5.T5 | Tests del fix: ticket dummy con escape "pendiente" → G1 FAIL; ticket dummy con hash real → G1 PASS; ticket dummy con commit cross-session → G1 FAIL granularidad. Test cases TC-4, TC-5 del ticket | REQ-FIX-02, REQ-FIX-03 | developer | S5.T4 | tests del area | TC-4 y TC-5 del ticket en estado `pass` con Actual + Evidence inline | git revert | DET-25 | pending | 5 |
| S5.GATE | Gate session: tests + dogfooding HOR-058 S5 cierra con 1+ commits granulares cubriendo solo `S5.*` + entry decisions_log + G1 PASS | REQ-FIX-02, REQ-FIX-03 | scribe | S5.T5 | HOR-058.md | Vitest pass; G1 PASS; tabla `## Commits` con `Tasks: S5.T1..S5.GATE` (no spans) | n/a | DET-27, DET-23 | pending | 5 |

---

### Session 6 — DET-25 con T2 (test cases registrados inline) [tier: T1] [tipo: auto]

**Objetivo**: aplicar la convencion T2 a DET-25. Gate D del request-execute.md bloquea TCs visuales sin Actual.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Editar `prompts/steps/request-execute.md` gate D: agregar verificacion explicita "si task ejecuto TC con `Affects UI: yes`, exigir Actual + Evidence o override". Documentar como BLOQUEANTE DURO al estilo DET-27 | REQ-FIX-04 | developer | S5.GATE | `prompts/steps/request-execute.md` | Lint markdown; verificacion manual del flujo coherente con DET-25 | git revert | DET-25, DET-11 | pending | 6 |
| S6.T2 | Instrumentar registro entry `test-case-registration` via dkc-record-decision al cerrar task que ejecuto TCs. Args: --step test-case-registration --choice (registered-inline o override-no-evidence) --reason (si override) --session S{N}.T{M} | REQ-FIX-04 | developer | S6.T1, S4.T4 | `prompts/steps/request-execute.md` | TC dogfooding: cerrar tarea de HOR-058 S6 con TC-6 ejecutado registra entry visible en decisions_log | git revert | DET-25, DET-8 | pending | 6 |
| S6.T3 | Actualizar `prompts/deterministic-rules.md` DET-25 con referencia a convencion T2 + entry `test-case-registration`. Crosslink con DET-27 (mismo patron) | REQ-FIX-04 | scribe | S6.T2 | `prompts/deterministic-rules.md` | Texto coherente; referencias actualizadas | git revert | DET-25 | pending | 6 |
| S6.T4 | Tests TC-6 + TC-7 del ticket: task con TC visual sin Actual → gate D bloquea; override en frontmatter → PASS + entry registrada | REQ-FIX-04 | developer | S6.T2 | tests del area | TC-6, TC-7 en `pass` con evidence en code | git revert | DET-7, DET-25 | pending | 6 |
| S6.GATE | Gate session: tests + dogfooding S6 cierra con commit granular + entries decisions_log (test-case-registration + commit-det-27 + gate-decision) | REQ-FIX-04 | scribe | S6.T4 | HOR-058.md | Validator PASS; entries esperadas presentes | n/a | DET-27, DET-25, DET-23 | pending | 6 |

---

### Session 7 — DET-21 paso 0b con T2 (pregunta obligatoria) [tier: T1] [tipo: auto]

**Objetivo**: cerrar escape de teach-intake paso 0b. Aplicar mismo patron a teach-close (DET-22) por simetria.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S7.T1 | Editar `prompts/steps/teach-intake.md` paso 0b: AskUserQuestion explicito con 3 options (generate, skip-tactico, skip-otra-razon). Sin clausula "asumir default". Documentar como BLOQUEANTE DURO con anti-pattern de ejemplo | REQ-FIX-05 | developer | S6.GATE | `prompts/steps/teach-intake.md` | Lint markdown; coherencia con DET-21 + memoria feedback_dkc_steps_with_explicit_question | git revert | DET-21, DET-11 | pending | 7 |
| S7.T2 | Instrumentar registro entry `teach-intake-0b` post-respuesta del dev via dkc-record-decision. Args: --step teach-intake-0b --choice (generate o skip-tactico o skip-otra-razon) --reason (si skip) | REQ-FIX-05 | developer | S7.T1, S4.T4 | `prompts/steps/teach-intake.md` | Manual test: invocar teach-intake en ticket dummy, ver entry en decisions_log post-respuesta | git revert | DET-21, DET-8 | pending | 7 |
| S7.T3 | Extender gate de salida de `teach-intake.md`: invocar `dkc-validate StepDecisions` y verificar entry `teach-intake-0b` presente. Si falta, FAIL bloqueante. Aplicar mismo patron simétrico a `prompts/steps/request-close.md` sub-paso teach-close (entry `teach-close-question`) | REQ-FIX-05 | developer | S7.T2 | `prompts/steps/teach-intake.md`, `prompts/steps/request-close.md` | Tests: gate falla si entry faltante; PASS si presente | git revert | DET-21, DET-22 | pending | 7 |
| S7.T4 | Tests TC-8 + TC-9 del ticket: paso 0b invoca AskUserQuestion siempre; gate falla sin entry | REQ-FIX-05 | developer | S7.T3 | tests del area | TC-8, TC-9 en `pass` | git revert | DET-7 | pending | 7 |
| S7.GATE | Gate session: tests + dogfooding (al cerrar HOR-058 S7, entry `commit-det-27` + entry `gate-decision` registradas; pero teach-intake-0b ya fue skip al inicio del ticket — verificar entry presente desde entonces) | REQ-FIX-05 | scribe | S7.T4 | HOR-058.md | Validator PASS; entry teach-intake-0b ya presente desde intake (HOR-058 antecedente del skip) | n/a | DET-21, DET-22, DET-23 | pending | 7 |

---

### Session 8 — UI modal + tabla resumida sessions [tier: T3] [tipo: ⚑ fuerte]

**Objetivo**: rediseno HC. Tabla resumida + SessionDetailModal con tabs. Deprecation de SessionCommitsBadge y SessionCommitsModal.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S8.T1 | Crear `horadric-cube/server/deckard/decisions.ts`: parser de `decisions_log` del frontmatter + tipos TS shared. Endpoint API `/api/tickets/{id}/decisions-log` que expone array al frontend | REQ-IMPROVE-01 | developer | S4.GATE (necesita schema) | `horadric-cube/server/deckard/decisions.ts` (new), `horadric-cube/shared/types.ts` (extend) | Tests unit del parser + integration del endpoint contra ticket fixture | git revert | DET-7 | pending | 8 |
| S8.T2 | Crear `horadric-cube/src/composables/useSessionDetail.ts`: cargar reactivo de session + commits asociados + decisions filtradas por session id. Reusa `useSessionCommits` existente + nuevo loader de decisions | REQ-IMPROVE-01 | developer | S8.T1 | `horadric-cube/src/composables/useSessionDetail.ts` (new) | Tests unit reactivo + edge cases (session sin commits, sin decisions) | git revert | DET-7 | pending | 8 |
| S8.T3 | Crear `horadric-cube/src/components/sessions/SessionDetailModal.vue`: shell @headlessui/vue Dialog, tab bar (Resumen · Commits · Decisiones), navegacion entre sessions con ← →, focus trap, ESC, click backdrop. Tab Commits reusa CommitDiffPanel | REQ-IMPROVE-01 | developer | S8.T2 | `horadric-cube/src/components/sessions/SessionDetailModal.vue` (new) | Vitest component + smoke playwright (open modal, switch tabs, close ESC) | git revert | DET-23 | pending | 8 |
| S8.T4 | Crear `horadric-cube/src/components/ticket-sections/SessionsSummaryTable.vue`: tabla con columnas declaradas en REQ-IMPROVE-01. Filter por phase/tier/gate. Sort por # / fecha. Click en fila o boton dispara emit('open-detail', sessionId) | REQ-IMPROVE-01, REQ-REGRESSION-02 | developer | S8.T2 | `horadric-cube/src/components/ticket-sections/SessionsSummaryTable.vue` (new) | Vitest component + smoke playwright | git revert | DET-23 | pending | 8 |
| S8.T5 | Refactor `horadric-cube/src/components/ticket-sections/SectionSessions.vue`: eliminar `expanded` ref/toggle/chevron/v-if expandible; integrar `SessionsSummaryTable` y `SessionDetailModal`; manejar emit/state. **Eliminar imports y eliminar archivos** `SessionCommitsBadge.vue` y `SessionCommitsModal.vue` | REQ-IMPROVE-01, REQ-REGRESSION-02 | developer | S8.T3, S8.T4 | `SectionSessions.vue`, `SessionCommitsBadge.vue` (delete), `SessionCommitsModal.vue` (delete) | Grep de SessionCommitsBadge y de SessionCommitsModal en src/ retorna 0 occurrences; smoke HC abre ticket reciente y modal funciona | git revert | DET-7, DET-23 | pending | 8 |
| S8.T6 | Tests playwright completos: TC-12, TC-13, TC-14 del ticket. Smoke en navegador real (HC dev server + ticket reciente como HOR-056) | REQ-IMPROVE-01, REQ-REGRESSION-02 | developer | S8.T5 | tests playwright del area | TC-12, TC-13, TC-14 en `pass` con screenshots en evidence | git revert | DET-7, DET-23 | pending | 8 |
| S8.GATE | ⚑ Gate fuerte — Quality review DET-23 exhaustive (dim a11y aplica) + dev valida UX en navegador real | REQ-IMPROVE-01 | scribe | S8.T6 | HOR-058.md | Validator PASS; QR DET-23 pass exhaustive; dev confirma UX en validacion humana del gate fuerte | n/a | DET-23, DET-27 | pending | 8 |

---

### Session 9 — integration + regression + close [tier: T3] [tipo: ⚑ fuerte]

**Objetivo**: end-to-end con ticket dummy + regression completa + cierre formal.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S9.T1 | Crear ticket dummy nuevo (work_type: improvement, creates_visual: false) y ejecutar ciclo completo: intake → teach-intake (verificar AskUserQuestion invocado) → design-improvement → execute 1 session con 2 tasks → close. Verificar entries decisions_log en cada step | TC-16, integration | developer | S8.GATE | proyecto horadric (ticket dummy temporal) | Ticket dummy cierra con decisions_log completo + commits granulares por session + modal HC renderiza correctamente | git revert + delete ticket dummy | DET-21, DET-25, DET-27 | pending | 9 |
| S9.T2 | Smoke modal end-to-end en HC: abrir HOR-058 propio + HOR-056 + ticket dummy de S9.T1. Validar: tabla resumida render OK; modal con tabs funciona; commits visibles en tab Commits con diff; decisiones filtradas por session | REQ-IMPROVE-01 | developer | S9.T1 | screenshots/HOR-058-modal-*.png | Screenshots como evidence en TC-12 y TC-15 del ticket | n/a | DET-23 | pending | 9 |
| S9.T3 | Regression completa: `npm run test` en horadric-cube (frontend + server); `vitest run commands/` en deckard. Baseline antes vs despues. Sin regressions netas | REQ-REGRESSION-01, REQ-REGRESSION-02, REQ-REGRESSION-03 | developer | S9.T2 | tests | Suites verdes. Delta coverage no negativo | git revert | DET-7 | pending | 9 |
| S9.T4 | Cleanup: eliminar ticket dummy de S9.T1 (`git rm projects/horadric/tickets/HOR-DUMMY.md` + reindex). Final reindex deckard | — | scribe | S9.T3 | filesystem | Reindex pass; no quedan refs al ticket dummy | git checkout | — | pending | 9 |
| S9.GATE | ⚑ Gate fuerte — regression report + smoke end-to-end aprobado + acceptance checkpoints completos validados por dev. Cierre formal del ticket HOR-058 sigue patron DET-27 con commit final | REQ-FIX-01, REQ-IMPROVE-01, REQ-REGRESSION-01 | scribe | S9.T4 | HOR-058.md | Todos los checkpoints PASS; commit final hash en `**Commit DET-27**:`; ticket cerrable; dev valida en gate fuerte | n/a | DET-27, DET-23, DET-13 | pending | 9 |

---

## Technical reference

- **request-execute.md L528**: gate BLOQUEANTE DURO actual (sin escape verbal coverage)
- **request-execute.md L626-635**: flujo de commits con ambiguedad ("grupo de tasks relacionadas")
- **deterministic-rules.md L891-1019**: DET-27 completa con evidencia historica HOR-018/019/020 + UPONE-1099
- **deterministic-rules.md L703-748**: DET-25 con evidencia historica HOR-018/019/020 (mismo patron que aplica HOR-058)
- **prompts/steps/teach-intake.md L184-208**: paso 0b actual — pregunta declarada pero sin enforcement runtime
- **horadric-cube/src/components/ticket-sections/SectionSessions.vue:33-34, 305-378**: codigo a refactor (eliminar expandable + integrar modal nuevo)
- **horadric-cube/src/components/commits/SessionCommitsModal.vue**: componente a eliminar (absorbido)
- **horadric-cube/src/components/commits/CommitDiffPanel.vue**: componente a mantener (reuso en tab Commits)
- **tickets/HOR-058.draft/data-model.ts**: schemas zod canonicos (InteractiveStepId, DecisionEntrySchema, DecisionsLogSchema, EXAMPLE_DECISIONS_LOG)
- **tickets/HOR-058.draft/preview.html**: maqueta visual del modal con tabs + tabla resumida (referencia para S8)

## Constraints

- **DET-27** (commits post-session) — fortalecido por este spec; granularidad clarificada
- **DET-25** (test cases registrados inline) — fortalecido por este spec; entry decisions_log
- **DET-21** (teach-intake obligatorio antes de design) — paso 0b reforzado por este spec
- **DET-22** (teach-close en request-close) — patron simétrico aplicado en S7.T3
- **DET-13** (cierre con evidencia) — decisions_log es evidencia adicional al cierre
- **DET-15** (contexto agotado) — commits granulares por session son recuperables
- **DET-19** (external id) — HOR-058 sin external, commits modo libre OK
- **DET-23** (quality review en gates) — S8 ⚑ fuerte exhaustive; resto auto/standard
- **DET-20** (sessions con gate) — plan particionado en S4-S9 ejecutables
- **HC `READ-ONLY`** rule del config: validator + helper escriben filesystem deckard, no HC. HC solo lee

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| zod | external | Schemas runtime validation | Bajo — ya en uso en commands |
| @headlessui/vue Dialog | external | Modal shell con focus trap, ESC, click backdrop | Bajo — ya en uso en SessionCommitsModal |
| playwright | external | Smoke E2E del modal en S8/S9 | Bajo — ya en uso en horadric-cube |
| yaml parser (node) | external | dkc-record-decision lee/escribe frontmatter | Bajo — patron similar a otros commands |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Dogfooding fail: HOR-058 propio salta DET-27/DET-25/DET-21-0b durante S4-S9 | medium | high | Cada GATE de session valida programaticamente; S4.GATE primera prueba real. Si dogfooding falla, escalar a iterate |
| Schema drift residual (B1, B2 no abordados en S4) | medium | medium | B1 + B2 son tasks explicitas en S4.T2, no backlog opcional. Sin estos, validator no funciona para HOR-058 propio |
| A-hook dispara antes de que el validator funcione (orden de implementacion) | low | medium | A-hook se registra en S5.T4 — DESPUES de S4 (validator base) y S5.T1 (G1 extendido). Orden de tasks documentado |
| Deprecation de SessionCommitsBadge impacta usos externos no detectados | low | high | Verificado con grep — solo SectionSessions.vue lo usa. Si emerge consumo en otro repo (improbable): rollback parcial S8.T5 |
| Granularidad estricta de commits genera friction de UX en sessions cortas | medium | low | Permitir 1 solo commit por session si todas las tasks son del mismo tipo (feat-only). Solo bloquear spans cross-session |
| Modal con 3 tabs sobrecarga UX en pantallas chicas (<1024px) | low | medium | Tabs apiladas verticalmente en mobile (responsive). Validar en S8.T6 smoke con resize playwright |
| Tickets pre-2026-05-17 sin decisions_log invalidados por bug en check de fecha | low | high | REQ-REGRESSION-03 + test explicito S4.T3. Skip via campo `created` antes de cobertura |

## Open questions

- **OQ1 (S3 design-fix)**: ~~OK con granularidad estricta para AQ1+AQ3?~~ → Resuelto en draft v3 + spec executive summary. **Estricto: 1 session = 1+ commits, sin spans cross-session**
- **OQ2 (S3 design-fix)**: ~~OK con trigger a-hook opcion (b) — solo Edit de `**Gate decision:**`?~~ → Resuelto. **Opcion (b)**
- **OQ3 (S3 design-fix)**: ~~Append-only o mutable?~~ → Resuelto en draft v3. **Append-only**

Sin gaps activos al cierre del design-fix.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: granularidad estricta de commits por session (AQ1+AQ3 resueltas)
- **Contexto**: AQ1 (granularidad) + AQ3 (tension DKC vs atomicidad codigo)
- **Drivers**: cerrar escape "agrupar al final" del LLM; preservar trazabilidad por session; permitir multiples tipos por session (feat/test/docs)
- **Opcion elegida**: 1 session = 1+ commits granulares por tipo. CADA commit cubre tasks de UNA sola session. Spans cross-session prohibidos
- **Alternativas**: flexibilidad permitida (descartado: re-introduce el bug)
- **Consecuencias**: granularidad enforzada por G1; UX un poco mas friction en sessions cortas pero compensada por trazabilidad
- **Session**: S3 design-fix

### DEC-LOCAL-02: a-hook trigger opcion (b) — solo Edit de Gate decision (AQ2 resuelta)
- **Contexto**: ¿Cuando dispara a-hook que invoca G1?
- **Drivers**: precision sin spam; sin depender de telemetria MCP no garantizada
- **Opcion elegida**: a-hook detecta diff del Edit cuando toca `**Gate decision:**` con valor `continue|iterate`. Otros Edits del ticket NO disparan
- **Alternativas**: (a) cada Edit del ticket (descartado: spam); (c) dkc_set_ticket_status change (descartado: requiere MCP atomic no garantizado)
- **Consecuencias**: a-hook implementable con parser de diff estandar; precision alta
- **Session**: S3 design-fix

### DEC-LOCAL-03: B1 + B2 incluidos como tasks de S4 (no backlog)
- **Contexto**: bugs schema Ticket pre-existentes detectados en intake
- **Drivers**: sin estos arreglos, HOR-058 propio no puede validar su frontmatter (status: design-fix, closed_reason: null)
- **Opcion elegida**: incorporar a S4.T2 como tasks explicitas con source_ref a B1, B2
- **Alternativas**: dejar en backlog para HOR-059 (descartado: bloquea cierre de HOR-058)
- **Consecuencias**: S4 lleva 5 tasks (vs 4 previstas); scope coherente
- **Session**: S3 design-fix

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de cada REQ pasan (10 REQs)
- [ ] **Tests**: test suite verde — TC-1 a TC-16 del ticket en `pass` con Actual + Evidence inline (DET-25)
- [ ] **NFRs**: a11y modal WCAG 2.1 AA (focus trap, ESC, aria-modal); smoke playwright responsive (320px-1920px)
- [ ] **Rules**: DET-27/DET-25/DET-21-0b/DET-23 todas cumplidas en este propio cierre del ticket (dogfooding)
- [ ] **Integration**: HC dev server arranca limpio sin errores de imports tras eliminacion de SessionCommitsBadge/Modal; commits granulares visibles en tabla `## Commits` de HOR-058 propio
- [ ] **Docs**: prompts (request-execute.md, teach-intake.md, request-close.md) actualizados con anti-patterns; DET-27 con regla granularidad; convencion T2 documentada en `prompts/_style.md` (si aplica)
- [ ] **Backwards compat**: HOR-016 (cerrado pre-2026-05-17) valida sin error en `dkc-validate StepDecisions` (skip por fecha)

## Archiving

No aplica al cierre. Si la convencion T2 evoluciona en HOR-XXX futuro (ej. aplicacion a otros DETs), considerar archivar este spec con razon.
