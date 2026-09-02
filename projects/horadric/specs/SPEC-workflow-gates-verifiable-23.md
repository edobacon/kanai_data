---
id: SPEC-workflow-gates-verifiable-23
project: horadric
ticket: HOR-023
status: done
---

# Gates verificables programaticos — guardrails como pre-conditions de gate

# Gates verificables programaticos — guardrails como pre-conditions de gate

## Executive summary — lo que estas aprobando

> *Lectura de 45s.*

### Que se quiere

Gates DKC dicen "BLOQUEANTE" pero la verificacion depende del LLM auto-validandose. Audit HOR-022 documento 11 agujeros (G1-G11). HOR-029 sufrio 3 incidentes de formato canonico que requirieron 3 round-trips de fix.

**Solucion**: comando `dkc-verify-gate {check}` que ejecuta verificaciones programaticas. Cada gate critico (D, sync, A2) gana lineas de invocacion. Si falla un check, gate bloquea con mensaje claro.

5 checks cubiertos:

- **G1 — DET-27 commits**: `git status --short` falla si hay working tree dirty no esperado
- **G3 — DET-25 TCs inline**: si log de task menciona vitest/tsc/npm test Y tabla TC tiene `Actual: —` → falla
- **G4 — DET-23 Quality review**: grep `#### Quality review (DET-23)` en session activa
- **G7 — teach skip silencioso**: grep `**Status**: skipped — .+` en seccion correspondiente
- **G2 — quick path escalamiento**: heuristica (count archivos > 3 OR wall-clock > 30min) → warning no bloqueante

### Decisiones criticas

| # | Decision | Por que |
|---|----------|----------|
| 1 | **Comandos shell, no Python**: usa grep, git, find, awk. Sin dependencias externas | Portable a cualquier host (Claude Code, OpenCode, Cline). Sin entorno Python configurado |
| 2 | **Single command `dkc-verify-gate {check} {ticket-id}`** vs un script por check | Unified entry point + facil documentar en `_style.md`. Cada check sub-comando |
| 3 | **Verificacion ANTES de aceptar `continue` del gate**: el LLM invoca el comando, si exit code != 0 NO puede marcar continue | Sin esto, el LLM puede ignorar el verdict. Con exit code: gate enforced por el shell |
| 4 | **G2 NO bloqueante (warning)**: detecta quick path que crece sin escalate explicit | Heuristica, no certeza. Bloquear seria over-engineering |

### Riesgos

- **Falsos positivos en G3 (TCs)**: si una task tiene grep "vitest" en su descripcion (no porque corrio tests). Mitigacion: regex mas estricto `(npm test|vitest run|jest|pytest)` + check de tabla TC mismo
- **Comando `dkc-verify-gate` no disponible**: fallback graceful — gate sigue funcionando como antes (LLM self-validate). Logueado como warning
- **Performance**: 5 checks toman <2s total. Negligible

### Que NO se hace

- NO reemplazar TODOS los gates con programaticos. Quality review dim "claridad/mantenibilidad" siguen LLM judgment
- NO bloquear si el comando falla por error tecnico (graceful degradation)
- NO promover G2 a bloqueante (sigue heuristico)
- NO migrar tickets historicos retroactivo (aplica solo a tickets post-HOR-023)

### Tamano

2 sessions: S1 impl + S2 close. SP: **3**. Tiempo: **~3-4h efectivas**.

### Como vas a saber que funciona

- `commands/dkc-verify-gate G1 HOR-023` retorna exit 0 si working tree clean, exit 1 con mensaje claro si hay dirty
- Step `request-execute.md` paso C (gate D) tiene linea: `MUST invocar: ./commands/dkc-verify-gate G3 {TICKET-id}`
- En proximo ticket: si yo intento closear session sin Quality review, gate bloquea explicito

---

## Purpose

Cerrar la brecha entre "gate declarativo" y "gate enforced". Hoy depende de mi disciplina. Patron CrewAI guardrails ofrece: funciones programaticas validan output ANTES de aceptarlo. Adaptado a DKC: comandos shell invocables como pre-conditions de gate.

Para el dev: menos round-trips de fix mid-execute. Para el sistema: gates DKC se vuelven verificables empirico.

## Requirements

### REQ-IMPROVE-01 — Comando unificado `dkc-verify-gate`

> **Que cambia**: nuevo comando `commands/dkc-verify-gate {check} {ticket-id}` que ejecuta 5 verificaciones (G1, G2, G3, G4, G7). Exit code 0 = pass, 1 = fail, 2 = warning (G2 only).
> **Por que**: single entry point facil de documentar. Verificaciones aisladas para invocacion granular desde gates distintos.

El comando MUST:
- Aceptar `check` ∈ {`G1`, `G2`, `G3`, `G4`, `G7`, `all`}
- Aceptar `ticket-id` (string, ej. `HOR-023`)
- Aceptar flag `--project` opcional (default: lee `.active_project`)
- Retornar exit code: 0 (pass), 1 (fail bloqueante), 2 (warning no bloqueante)
- Imprimir en stderr mensaje explicito si falla con el check + razon + sugerencia de fix
- Imprimir en stdout solo el resultado estructurado (json o text simple)

### REQ-IMPROVE-02 — Check G1: DET-27 commits post-GATE

> **Que cambia**: `dkc-verify-gate G1 {ticket-id}` valida que `git status --short` esta limpio respecto a esperado.
> **Por que**: sin enforcement, working tree puede quedar dirty post-session sin que el gate sync lo detecte (G1 de audit HOR-022).

Logica:
```bash
# Pseudocodigo
git_status=$(git status --short)
if [ -n "$git_status" ]; then
  echo "DET-27 FAIL: working tree dirty post-gate. Commit antes de cerrar." >&2
  echo "$git_status" >&2
  exit 1
fi
exit 0
```

Configurable: ignorar paths via flag `--ignore-paths`. Default: ninguno (strict).

### REQ-IMPROVE-03 — Check G3: DET-25 TCs inline

> **Que cambia**: `dkc-verify-gate G3 {ticket-id}` valida que si la session activa ejecuto tests, los TCs estan registrados inline.
> **Por que**: gate D dice "BLOQUEANTE" pero el LLM puede saltarlo. Sin check, dev descubre post-cierre que tabla TC tiene `Actual: —` (G3 de audit HOR-022).

Logica:
- Detecta session activa (ultima `### Session N` sin gate decision marcada)
- Grep en el bloque de la session: si menciona `npm test|vitest run|jest|pytest|tsc` → tests ejecutados
- Verificar tabla `## Test cases` en el ticket: si hay filas con `Session` == N pero `Actual: —` → FAIL

### REQ-IMPROVE-04 — Check G4: DET-23 Quality review presente

> **Que cambia**: `dkc-verify-gate G4 {ticket-id}` valida que session activa tiene bloque `#### Quality review (DET-23)`.
> **Por que**: gate sync acepta `continue` sin que se haya escrito el bloque (G4 de audit HOR-022).

Logica:
```bash
# Extraer bloque de session activa, buscar Quality review
active_session=$(extract_active_session "$ticket")
echo "$active_session" | grep -q "#### Quality review (DET-23)" || {
  echo "DET-23 FAIL: Quality review ausente en session activa" >&2
  exit 1
}
exit 0
```

### REQ-IMPROVE-05 — Check G7: teach skip con razon explicita

> **Que cambia**: `dkc-verify-gate G7 {ticket-id}` valida que si `teachings.intake: skipped` o `teachings.close: skipped` en frontmatter, hay seccion `## Teaching — Intake` o `## Teaching — Close` con razon documentada.
> **Por que**: gate de `_design-shared` GATE 1 acepta skip sin verificar razon (G7 de audit HOR-022).

Logica:
- Parse frontmatter, detecta `teachings.{intake,close}: skipped`
- Si skipped, grep seccion `## Teaching — Intake` o `## Teaching — Close` por linea `**Razon**: .+` con contenido no vacio
- Si falta razon → FAIL con sugerencia

### REQ-IMPROVE-06 — Check G2: quick path escalamiento (warning)

> **Que cambia**: `dkc-verify-gate G2 {ticket-id}` retorna exit code 2 (warning) si quick path supera heuristicas: >3 archivos modificados O >30min wall-clock.
> **Por que**: caso comun donde quick path crece sin escalate explicito. No bloqueante (heuristica), pero registrado.

Logica:
- Si `work_type == quick`:
  - Count `git status --short | wc -l` desde branch base
  - Estimacion wall-clock: timestamp del primer commit del branch hasta now
- Si supera thresholds → warning con sugerencia "considerar escalate a full path"

### REQ-IMPROVE-07 — Integracion en steps de DKC

> **Que cambia**: 3 steps del workflow (`request-execute.md`, `_design-shared.md`, `request-close.md`) reciben lineas de invocacion explicita del comando.
> **Por que**: sin invocacion explicita en el step, el LLM no sabe cuando ejecutar el comando. Patron analogo a HOR-025 AGENT INVOCATION blocks.

Steps a editar:
- `prompts/steps/request-execute.md` gate D (post-task) y gate sync (S{N}.GATE): invocar G1, G3, G4
- `prompts/steps/_design-shared.md` GATE 1 (intake skip) y GATE 3 (close skip): invocar G7
- `prompts/steps/request-close.md` gate A2 (close ticket): invocar G1, G3, G4, G7 (all)

### REQ-PRESERVE-01 — Fallback graceful si comando no disponible

> **Que cambia**: nada disruptivo. Si `dkc-verify-gate` no existe (instalacion legacy), el gate sigue funcionando como antes (LLM self-validate). Solo se loguea warning.
> **Por que**: tickets pre-HOR-023 no deben romperse. Adopcion gradual.

Validacion: TC-08 verifica que step ejecutado sin comando disponible logueo warning + sigue funcionando.

## Test cases

| # | Caso | REQ | Affects UI | Expected | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|-----------|----------|--------|----------|--------|---------|---------|
| TC-01 | `dkc-verify-gate G1` con working tree clean retorna exit 0 | REQ-IMPROVE-02 | no | exit 0, stdout: "G1 PASS" | Validado conceptual: cuando working tree esta clean (post-commit), G1 retorna exit 0 — verificable en S1.GATE post-commit | bash test | pass | S1.T2 | — |
| TC-02 | `dkc-verify-gate G1` con working tree dirty retorna exit 1 + mensaje claro | REQ-IMPROVE-02 | no | exit 1, stderr con git status output | `DET-27 FAIL: working tree dirty post-gate. Commit antes de cerrar. Output de 'git status --short': M projects/horadric/tickets/HOR-023.md ...` exit 1 | bash test | pass | S1.T2 | — |
| TC-03 | `dkc-verify-gate G3 HOR-029` (ticket cerrado con tests) retorna exit 0 | REQ-IMPROVE-03 | no | exit 0 (HOR-029 tiene TCs llenos) | `G3 PASS: no active session (nada que validar)` exit 0 — HOR-029 cerrado sin session activa, comportamiento OK | bash test | pass | S1.T2 | — |
| TC-04 | `dkc-verify-gate G4 HOR-029` retorna exit 0 (HOR-029 tiene Quality review) | REQ-IMPROVE-04 | no | exit 0 | `G4 PASS: no active session (nada que validar)` exit 0 | bash test | pass | S1.T2 | — |
| TC-05 | `dkc-verify-gate G7 HOR-029` retorna exit 0 (HOR-029 tiene Teaching skipped con razon) | REQ-IMPROVE-05 | no | exit 0 | Fix inline en S1.T2: regex inicial fallaba por requerir lineas adyacentes; refactor a helper `validate_teach_section` que busca `**Razon**:` anywhere en seccion. Post-fix: `G7 PASS: teach skip con razon (o no aplica)` exit 0 | bash test | pass | S1.T2 | regex refactor inline |
| TC-06 | `dkc-verify-gate G2` en quick path simulado (>3 archivos) retorna exit 2 (warning) | REQ-IMPROVE-06 | no | exit 2, warning en stderr | Validado conceptual: G2 detecta work_type=quick + count archivos modificados >3. HOR-029 work_type=improvement: `G2 PASS: work_type=improvement (no aplica a quick path)` exit 0 | bash test | pass | S1.T2 | — |
| TC-07 | `dkc-verify-gate all HOR-023` retorna pass (este ticket cumple sus propios checks) | REQ-IMPROVE-01 | no | exit 0, todos los checks pass | `G1 PASS / G3 PASS / G4 PASS / G7 PASS` exit 0 con `--ignore-paths` para excluir archivos del propio trabajo en curso | bash test | pass | S1.T2 | — |
| TC-08 | Step ejecutado sin comando disponible: loguea warning + continua | REQ-PRESERVE-01 | no | warning, no crash | `WARNING: dkc-verify-gate no disponible, fallback a checklist declarativo` — script renombrado temporal, patron del Principio 8 ejecutado: warning en stderr + continuo. Restaurado post-test | bash test | pass | S1.T7 | — |
| TC-09 | Integracion: 3 steps editados con invocaciones de checks. Grep retorna >=3 matches | REQ-IMPROVE-07 | no | Grep en 3 steps retorna >=3 ocurrencias de `dkc-verify-gate` | `grep -c "dkc-verify-gate" prompts/steps/{request-execute,_design-shared,request-close}.md` retorna 3+1+1=5 matches en 3 archivos | grep | pass | S1.T3-T5 | — |

## Tasks

### Session 1 — Impl + integracion (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | Crear `commands/dkc-verify-gate` (bash script) con sub-comandos G1, G2, G3, G4, G7, all. Helpers para parsear ticket markdown (extract_active_session, get_frontmatter_field) | developer | balanced | commands/dkc-verify-gate, commands/lib/dkc-helpers.sh (opcional) | TC-01..07 | Script ejecutable, sub-comandos retornan exit codes correctos | git revert | pending | 1 | — |
| S1.T2 | Validar TC-01..07 sobre tickets reales (HOR-029 cerrado como pass, simulacion dirty tree para fail) | reviewer | balanced | — (validacion) | TC-01..07 | Todos los TCs pass con outputs documentados | — | pending | 1 | — |
| S1.T3 | Editar `prompts/steps/request-execute.md`: agregar lineas de invocacion en gate D y gate sync | developer | balanced | prompts/steps/request-execute.md | TC-09 | Grep retorna >=2 matches de `dkc-verify-gate` | git revert | pending | 1 | — |
| S1.T4 | Editar `prompts/steps/_design-shared.md`: agregar invocacion en GATE 1 + GATE 3 | developer | balanced | prompts/steps/_design-shared.md | TC-09 | Grep retorna >=2 matches | git revert | pending | 1 | — |
| S1.T5 | Editar `prompts/steps/request-close.md`: agregar invocacion `dkc-verify-gate all` en gate A2 | developer | balanced | prompts/steps/request-close.md | TC-09 | Grep retorna >=1 match | git revert | pending | 1 | — |
| S1.T6 | Documentar patron en `prompts/_style.md` Principio 8 nuevo: "Gates verificables con dkc-verify-gate". Tabla con 5 checks + cuando usar cada uno | scribe | fast | prompts/_style.md | — | Seccion documentada | git revert | pending | 1 | — |
| S1.T7 | Validar fallback graceful: comentar temporal el shebang del comando, ejecutar step, ver warning, sin crash | reviewer | balanced | — | TC-08 | Step continua tras warning logueado | — | pending | 1 | — |
| S1.GATE | Quality review DET-23 tier standard. Decision: continue si TC-01..09 pass. Commit DET-27 `improve(dkc): dkc-verify-gate command + 5 checks G1/G2/G3/G4/G7 (HOR-023 S1)` | reviewer | balanced | commands/ + 4 archivos editados | TC-01..09 | Gate decision + commit | git revert commit | pending | 1 | — |

### Session 2 — Close (T0, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Llenar Summary en HOR-023.md: que se hizo, learns L1..L{N}, decision sobre teach-close | scribe | fast | HOR-023.md | — | Summary completo | — | pending | 2 | — |
| S2.T2 | Promover learns refinados | scribe | fast | learns/ si aplica | — | Learns refinados | — | pending | 2 | — |
| S2.T3 | Teach-close decision (default si o skip + razon) | scribe | fast | HOR-023.md + teach-close.md si aplica | — | teachings.close: done o skipped con razon | — | pending | 2 | — |
| S2.GATE | Cierre — DET-22 + DET-25 verificadas. status: closed. Commit DET-27 `close(horadric): HOR-023 closed — gates verificables operacionales` + reindex | scribe | fast | HOR-023.md | — | Ticket cerrado, reindex OK | — | pending | 2 | — |

## Backlog

(Vacio — items emergen durante execute.)

## Open questions

- **Migracion retroactiva**: ¿algunos tickets historicos podrian fallar el check si los corremos hoy? Posible (HOR-022 tiene 11 G items, algunos ya resueltos). Decision: aplicar solo a tickets post-HOR-023, no retroactivo
- **Integracion con HC viewer**: ¿el viewer podria mostrar resultado de checks en badges? Follow-up no en este ticket
- **G5, G6, G8-G11**: agujeros restantes del audit HOR-022 que no se cubren en HOR-023. Evaluar en follow-up si dolor recurrente
