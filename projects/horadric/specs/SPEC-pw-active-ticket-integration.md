---
id: SPEC-pw-active-ticket-integration
project: horadric
ticket: HOR-008
status: done
---

# Integración PW ↔ DKC — screenshots de Playwright durante ticket activo registran al subdir

# Integración PW ↔ DKC — screenshots de Playwright durante ticket activo registran al subdir

## Purpose

Playwright es opcional en cualquier proyecto. Cuando corre **fuera** del contexto de un ticket DKC, su output sigue la convención que el proyecto defina (default `test-results/`). Cuando corre **dentro** de un ticket DKC activo, los screenshots deben aterrizar en `projects/{active_project}/tickets/{active_ticket}.screenshots/` — la convención formalizada en HOR-007 — sin acción manual del dev ni edicion post-hoc.

Ver ticket [HOR-008](../tickets/HOR-008.md) para contexto + aclaraciones del dev.

## Current state

- `.active_project` existe como fuente del proyecto activo.
- `status: in_progress` en un ticket del proyecto activo = ticket actual (convención observada: 1 solo ticket in_progress por proyecto a la vez).
- **No existe helper CLI** que imprima el ticket activo — el LLM lo descubre via `cat .active_project` + `grep -l "status: in_progress"`.
- **No existe template** de `playwright.config.ts` en `templates/outputs/`.
- CLAUDE.md global línea 39 (post-HOR-007) menciona Playwright genéricamente; no especifica cómo funciona dentro de ticket DKC.

## Desired state

- Helper `dkc-active-ticket` en `commands/` imprime JSON con `{project, ticketId, screenshotsDir}` del ticket activo, o error claro.
- Template `templates/outputs/playwright-config-dkc.ts` que cualquier proyecto puede copiar/adaptar — usa el helper para setear `outputDir` + `snapshotDir` dinámicamente.
- DKC docs (CLAUDE.md global + DECKARD.md + prompts relevantes) mencionan el patrón.
- **Dogfooding**: HOR-008 captura un screenshot simulado usando el helper para demostrar que el flow termina en `HOR-008.screenshots/`.

## Delta

- **Antes**: PW sin integración con DKC. Dev debe mover manualmente screenshots post-run. Friccion.
- **Despues**: el dev (o LLM) que corra PW teniendo `.active_project` + ticket `in_progress` recibe sus screenshots directo en el subdir del ticket activo.
- **Alcance**: deckard-core. **NO**: HC (cero código), otros proyectos (cero obligación — PW sigue opcional).

## Requirements

### REQ-IMPROVE-01: Helper `dkc-active-ticket` identifica ticket DKC activo

El sistema MUST proveer un comando CLI `dkc-active-ticket` (bash puro, POSIX-compatible) que imprime en stdout un JSON con `{project, ticketId, screenshotsDir}` del ticket activo, donde:
- `project` = contenido de `.active_project` (trimmed)
- `ticketId` = el unico ticket dentro de `projects/{project}/tickets/*.md` con `status: in_progress` en frontmatter
- `screenshotsDir` = path absoluto a `projects/{project}/tickets/{ticketId}.screenshots` (aun si no existe todavia — el caller puede crear)

**Actor**: developer, LLM
**Layers**: deckard-core (shell)

#### Scenario: ticket activo detectable
- **GIVEN** `.active_project = horadric` y HOR-008.md con `status: in_progress`
- **WHEN** ejecutar `dkc-active-ticket`
- **THEN** stdout: `{"project":"horadric","ticketId":"HOR-008","screenshotsDir":"/abs/path/projects/horadric/tickets/HOR-008.screenshots"}` y exit 0

#### Scenario: no hay ticket activo
- **GIVEN** proyecto activo sin ningun ticket `status: in_progress`
- **WHEN** ejecutar helper
- **THEN** stderr con mensaje `no active ticket in project '{project}'` y exit 1

#### Scenario: multiples tickets in_progress (higiene rota)
- **GIVEN** 2+ tickets con `status: in_progress`
- **WHEN** helper
- **THEN** stderr con mensaje `ambiguous: N tickets in_progress: HOR-A, HOR-B` y exit 2

#### Scenario: no hay `.active_project`
- **GIVEN** archivo `.active_project` ausente
- **WHEN** helper
- **THEN** stderr `no active project` y exit 3

### REQ-IMPROVE-02: Template `playwright-config-dkc.ts` usa el helper

El sistema MUST proveer `templates/outputs/playwright-config-dkc.ts` — snippet de Playwright config que ejecuta el helper via `execSync` y setea `outputDir` al `screenshotsDir` retornado (o fallback a default si helper falla). Snippet debe ser copiable tal cual o via import.

### REQ-IMPROVE-03: DKC docs reflejan el patron

El sistema MUST tener:
- `~/.claude/CLAUDE.md` — seccion actualizada sobre Playwright mencionando el helper + template.
- `DECKARD.md` — seccion corta "Ticket activo" + mencion del helper.
- `prompts/steps/request-execute.md` — nota sobre Playwright durante ejecucion (si aplica al modulo).

### REQ-IMPROVE-04: Dogfooding valida el flow end-to-end

El sistema MUST ser validado capturando un screenshot de prueba desde HOR-008 activo — con el helper + un script simulado que imita el comportamiento de PW (escribe un PNG al `outputDir` resuelto). El PNG debe aparecer en `HOR-008.screenshots/`.

### REQ-PRESERVE-01: PW sin contexto DKC no se ve afectado

El sistema MUST no romper PW cuando corre en un proyecto sin `.active_project` o sin ticket `in_progress`. El template DKC tiene fallback al default de PW (`test-results/`) en ese caso.

### REQ-PRESERVE-02: HOR-007 convencion intacta

El sistema MUST no modificar `server/deckard/assets.ts` ni `resolveAssetPath`. La convencion `{ticketId}.screenshots/` (HOR-007) permanece igual.

### REQ-PRESERVE-03: Cero codigo en horadric-cube

El sistema MUST no modificar archivos de `/Users/edobacon/Workspace/horadric-cube/**`. HOR-008 es 100% deckard-core.

## Fix scope (improvement, not-fix — mantengo titulo por claridad)

### Antes

Dev en HOR-X quiere capturar screenshots via PW → corre `npx playwright test` → outputs caen en `test-results/` del proyecto → dev copia/mueve manualmente al subdir del ticket.

### Despues

Dev en HOR-X con ticket `in_progress` → proyecto tiene `playwright.config.ts` basado en el template DKC → helper `dkc-active-ticket` resuelve el ticket + subdir → `outputDir` apunta ahi directo → screenshots quedan registrados sin intervencion.

### Archivos afectados

| File | Change | Impact |
|---|---|---|
| `commands/dkc-active-ticket` (nuevo) | Script bash + ejecutable (`chmod +x`) | Disponible como `./commands/dkc-active-ticket` desde deckard-root o via `PATH` si el dev lo linkea |
| `templates/outputs/playwright-config-dkc.ts` (nuevo) | Template snippet | Copiable/referenciable por cualquier proyecto que adopte PW |
| `~/.claude/CLAUDE.md` (modificado) | Seccion Playwright refinada | Global user-level |
| `DECKARD.md` (modificado) | Seccion "Ticket activo" (si no existe) + mencion helper | Deckard root |
| `prompts/steps/request-execute.md` (modificado) | Nota opcional sobre PW durante ejecucion | Guia del LLM |
| `tests/dkc-active-ticket.test.sh` (nuevo, opcional) | Test bash para los 4 scenarios del helper | Regression simple |

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status | Session | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --------- | --- | --- | --- |
| 1 | Baseline: confirmar que `commands/dkc-active-ticket` no existe; capturar estado CLAUDE.md linea 39 + DECKARD.md ticket-activo refs | researcher | — | — | evidencia | **done** | #2 | — | — | — |
| 2 | Implementar helper `commands/dkc-active-ticket` (bash puro + `chmod +x`) cubriendo los 4 scenarios de REQ-IMPROVE-01 | developer | #1 | `commands/dkc-active-ticket` (nuevo) | test manual: 4 scenarios pasan | **done** | #2 | — | — | — |
| 3 | Tests bash del helper (`tests/dkc-active-ticket.test.sh`) con los 4 scenarios + script que los ejecute + reporta pass/fail | developer | #2 | `tests/dkc-active-ticket.test.sh` (nuevo) | bash test script pasa 4/4 | **done** | #2 | — | — | — |
| 4 | Template `templates/outputs/playwright-config-dkc.ts` + comentario explicativo del helper + fallback | developer | #2 | `templates/outputs/playwright-config-dkc.ts` (nuevo) | grep confirma estructura + comentario; sintaxis TS valida (no se ejecuta, solo referencia) | **done** | #2 | — | — | — |
| 5 | DKC docs: actualizar CLAUDE.md global + DECKARD.md + prompts/steps/request-execute.md segun REQ-IMPROVE-03 | developer | — | `~/.claude/CLAUDE.md`, `DECKARD.md`, `prompts/steps/request-execute.md` | grep confirma texto nuevo | **done** | #2 | — | — | — |
| 6 | Dogfooding: ejecutar helper desde HOR-008 activo + script simulado que escribe PNG dummy al `screenshotsDir` retornado + verificar que aparece en `HOR-008.screenshots/` | reviewer | #2 | — | PNG presente; captura proof del flow | **done** | #2 | — | — | — |
| 7 | Close: Testing del ticket actualizado + commits (deckard solo) | scribe | #3, #4, #5, #6 | tickets + spec | ticket + spec cumplen gate de close | **done** | #2 | — | — | — |

### Task contract detalle

```
Task #1: Baseline
- source_ref: NFR-observability
- agent: researcher
- precondition: working tree limpio
- expected_output: confirmacion que el helper no existe; snapshot CLAUDE.md:39 post-HOR-007; lista de refs "ticket activo" en DECKARD.md
- validation: evidencia
- rollback: N/A

Task #2: Helper bash
- source_ref: REQ-IMPROVE-01
- agent: developer
- files: commands/dkc-active-ticket (nuevo, ejecutable)
- precondition: #1
- expected_output: script bash POSIX (#!/usr/bin/env bash), que:
  (a) lee .active_project relativo a DECKARD_ROOT (env o fallback) — si absent, stderr + exit 3
  (b) glob projects/{project}/tickets/*.md, filtra por `^status: in_progress$` via grep
  (c) 0 matches → stderr + exit 1; N>1 → stderr con lista + exit 2; N=1 → stdout JSON + exit 0
  (d) JSON minifica con printf (sin jq dependency)
- validation: manual test — 4 scenarios simulados (setear .active_project vacio, test con multiples tickets, etc.)
- rollback: borrar archivo
- rules: [1, 2, 8, 11, 16]

Task #3: Tests bash
- source_ref: REQ-IMPROVE-01
- agent: developer
- files: tests/dkc-active-ticket.test.sh (nuevo)
- precondition: #2
- expected_output: script bash que crea fixtures (directorios temporales con tickets faked), ejecuta helper, verifica stdout/stderr/exit code para 4 scenarios; reporta TESTS: 4 passed
- validation: `bash tests/dkc-active-ticket.test.sh` exit 0 con mensaje PASSED
- rollback: borrar
- rules: [1, 2, 8]

Task #4: Template Playwright config
- source_ref: REQ-IMPROVE-02, REQ-PRESERVE-01
- agent: developer
- files: templates/outputs/playwright-config-dkc.ts (nuevo)
- precondition: #2
- expected_output: TS que define PlaywrightTestConfig con `outputDir` resuelto via execSync al helper + fallback a default si helper falla o no hay ticket. Comentario explicativo arriba.
- validation: grep de lineas clave; sintaxis TypeScript plausible (no compilamos — es template)
- rollback: borrar
- rules: [1, 2, 8, 16]

Task #5: DKC docs
- source_ref: REQ-IMPROVE-03
- agent: developer
- files: ~/.claude/CLAUDE.md, DECKARD.md, prompts/steps/request-execute.md
- precondition: —
- expected_output:
  - CLAUDE.md:39 area: seccion Playwright extendida con mencion del helper + template
  - DECKARD.md: seccion corta "Ticket activo" (si no existe) + uso del helper
  - request-execute.md: nota opcional en setup (si el dev usa PW, configurar con template)
- validation: grep confirma texto nuevo en los 3 files
- rollback: git revert
- rules: [2, 8, 16]

Task #6: Dogfooding
- source_ref: REQ-IMPROVE-04
- agent: reviewer
- files: — (genera PNG dummy en HOR-008.screenshots/)
- precondition: #2
- expected_output: screenshot de prueba en HOR-008.screenshots/HOR-008-dogfooding-pw-flow.png (o similar) creado via script que imita el flow del template
- validation: `ls HOR-008.screenshots/` muestra el PNG
- rollback: borrar PNG dummy si se descarta
- rules: [4, 7, 13]

Task #7: Close
- source_ref: todos REQ-PRESERVE
- agent: scribe
- files: projects/horadric/tickets/HOR-008.md, projects/horadric/specs/SPEC-pw-active-ticket-integration.md
- precondition: #3, #4, #5, #6
- expected_output: ticket Testing actualizado con evidencia; spec status=done; commits preparados
- validation: gate de close
- rollback: N/A
- rules: [2, 13]
```

## Constraints

- **RULE-index-001** (must): consumer-adapts. El helper NO modifica `.active_project` ni tickets. Solo lee.
- **HOR-007 convencion**: `{ticketId}.screenshots/` es el destino. HOR-008 lo alcanza sin cambiarlo.

## Dependencies

- **SPEC-screenshots-subdir-convention** (HOR-007, done): define el directorio destino. HOR-008 es puramente "cómo se llega ahi desde PW".

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Helper bash no portable (macOS vs Linux shell diffs) | medium | low | Bash puro con POSIX utilities (grep, sed, awk); probar en macOS Darwin (entorno actual). Si surge issue en CI Linux, tests cubren. |
| `DECKARD_ROOT` no seteado → helper falla por falta de base path | medium | low | Fallback a `cwd` si env ausente; doc explicita en comentario del script |
| Template de PW desactualizado cuando PW saque breaking change | low | low | Template es snippet referencia; no se compila automatico. Mantenimiento manual cuando el dev lo adopte |
| `prompts/steps/request-execute.md` extendido rompe algun gate existente | low | medium | Solo agregar nota en seccion Contexto & Notas, no tocar gates. Grep de gates antes y despues — identicos |

## Open questions

Ninguna. Decisiones documentadas en DEC-LOCAL.

## Decisions

### DEC-LOCAL-01: Bash puro, no Node ni Python
- **Contexto**: ¿lenguaje para el helper?
- **Drivers**: sin dependencias externas (node en PATH no garantizado en CI minimo); parsing YAML frontmatter es trivial con grep; portabilidad POSIX
- **Opcion elegida**: bash
- **Alternativas**: node (descartada — agrega dep a `node` en PATH); python (descartada — no esta en la mayoria de proyectos)

### DEC-LOCAL-02: JSON minificado sin jq
- **Contexto**: formato output del helper
- **Drivers**: machine-readable para PW config; no depender de `jq` (puede no estar instalado)
- **Opcion elegida**: `printf` con escaping manual
- **Alternativas**: jq (dep extra); YAML (menos estandar para eval desde Node)

### DEC-LOCAL-03: Dogfooding simulado, no instalar PW en HOR-008
- **Contexto**: validar el flow end-to-end
- **Drivers**: instalar `@playwright/test` transitorio es overkill; lo que se valida es "helper retorna path correcto + PW-like script escribe ahi"
- **Opcion elegida**: script bash/node simulado que escribe un PNG dummy al path resuelto
- **Alternativas**: instalar PW temporalmente (descartada — pollution, no necesario)

## Success metrics

N/A (improvement de proceso). Implicit: post-HOR-008, un dev en ticket DKC activo que adopte el template corre PW y sus screenshots aparecen en el lugar correcto sin intervencion manual.

## Technical reference

### Helper sketch (bash)

```bash
#!/usr/bin/env bash
set -eu
ROOT="${DECKARD_ROOT:-$(pwd)}"
APF="$ROOT/.active_project"
[ -f "$APF" ] || { echo "no active project (missing $APF)" >&2; exit 3; }
PROJECT="$(tr -d '[:space:]' < "$APF")"
TDIR="$ROOT/projects/$PROJECT/tickets"
[ -d "$TDIR" ] || { echo "no tickets dir for project '$PROJECT'" >&2; exit 1; }

# Grep frontmatter `status: in_progress` en cada .md
MATCHES=""
for f in "$TDIR"/*.md; do
  [ -f "$f" ] || continue
  if awk '/^---/{c++} c==1 && /^status:[[:space:]]*in_progress[[:space:]]*$/{found=1} c==2{exit} END{exit !found}' "$f"; then
    id="$(basename "$f" .md)"
    MATCHES="$MATCHES $id"
  fi
done
MATCHES="${MATCHES# }"
COUNT=$(echo "$MATCHES" | wc -w | tr -d ' ')

[ "$COUNT" = "0" ] && { echo "no active ticket in project '$PROJECT'" >&2; exit 1; }
[ "$COUNT" -gt "1" ] && { echo "ambiguous: $COUNT tickets in_progress: $MATCHES" >&2; exit 2; }

TICKET="$MATCHES"
SSDIR="$TDIR/$TICKET.screenshots"
printf '{"project":"%s","ticketId":"%s","screenshotsDir":"%s"}\n' "$PROJECT" "$TICKET" "$SSDIR"
```

### Template Playwright config sketch

```typescript
// playwright-config-dkc.ts — template. Copiar a playwright.config.ts del proyecto.
import { defineConfig } from '@playwright/test'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const DECKARD_ROOT = process.env.DECKARD_ROOT ?? '/Users/edobacon/Workspace/deckard'

function resolveOutputDir(): string {
  try {
    const out = execSync(`${DECKARD_ROOT}/commands/dkc-active-ticket`, {
      env: { ...process.env, DECKARD_ROOT },
      timeout: 500,
    }).toString().trim()
    const { screenshotsDir } = JSON.parse(out) as { screenshotsDir: string }
    return screenshotsDir
  } catch {
    return 'test-results'
  }
}

export default defineConfig({
  outputDir: resolveOutputDir(),
  // ... tus otros settings
})
```

## Rules discovered
{en execute si aplica}

## Bugs found
{si aplica}

## Acceptance checkpoints

- [ ] Funcional: REQ-IMPROVE-01..04 + REQ-PRESERVE-01..03 con scenarios validados
- [ ] Tests: 4 scenarios del helper pasan (bash test); 79 tests HC siguen pass (sin cambios)
- [ ] Docs: CLAUDE.md global + DECKARD.md + prompts al dia
- [ ] Dogfooding: PNG dummy presente en HOR-008.screenshots/
- [ ] Rollback: si cualquier task falla, `git revert` limpio (ningun cambio commit en HC)
