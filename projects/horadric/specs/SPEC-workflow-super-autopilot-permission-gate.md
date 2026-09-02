---
id: SPEC-workflow-super-autopilot-permission-gate
project: horadric
ticket: HOR-139
status: draft
---

# Super autopilot como apertura de permisos del harness (marker-gated)

# Super autopilot como apertura de permisos del harness (marker-gated)

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy `autopilot: super` solo cambia el comportamiento del LLM (auto-commit local, no pausar entre sessions), pero cada accion mecanica (leer, editar, ejecutar) sigue pidiendo autorizacion al harness de Claude Code. Este spec hace que mientras un ticket corre en `autopilot: super`, esas acciones mecanicas se auto-aprueben a nivel del harness, dentro de la frontera declarada del ticket (`execute_scope`), mientras que un conjunto de frenos duros sigue pidiendo confirmacion siempre. Al cerrar o pausar el ticket, todo vuelve a la normalidad. Es **per-ticket** (no cambia el modo global de la sesion) y **reversible** (sin marcador, comportamiento identico a hoy).

**Decisiones criticas que apruebas**:

| Decision | Eleccion | Alternativa descartada |
|----------|----------|------------------------|
| Mecanismo de activacion per-ticket | Marker-gated PreToolUse hook (patron `dredd-guard.py` invertido) | `defaultMode: auto` global (descartado: es de sesion, no per-ticket) |
| Frontera de auto-aprobacion de edits | Scope-bound a `execute_scope` del ticket | Cualquier path en additionalDirectories (descartado: no alineado con DET-30 REQ-03) |
| Freno de close a nivel harness | Harness-level (carve de `auto-allow-safe.py` + no auto-allow en el gate hook) — A1 | Dejarlo solo LLM-level (descartado: mantiene asimetria CLI/MCP) |
| Enforcement de frenos duros | Dentro del hook (caen a `{}` → prompt) + `permissions.ask` de respaldo | Depender de precedencia ask-vs-hook (descartado: ambigua) |

## Purpose

Atar el estado `autopilot: super` de un ticket DKC a la capa de permisos de Claude Code, de modo que la ejecucion autonoma deje de generar prompts mecanicos sin renunciar a los frenos irreversibles. Es aditivo a DET-30 (red de seguridad autopilot): DET-30 ya exige rama de ticket + `execute_scope` + close que siempre pregunta; este spec agrega la contraparte de apertura controlada de permisos.

## Requirements

### REQ-01: El hook abre acciones mecanicas bajo marcador activo (REQ-GATE)

> **Que cambia**: con un marcador de super autopilot activo, el hook `dkc-autopilot-gate.py` auto-aprueba lecturas, ediciones dentro de `execute_scope` y comandos Bash seguros.
> **Por que**: eliminar los prompts mecanicos durante ejecucion autonoma.

El hook PreToolUse `~/.claude/hooks/dkc-autopilot-gate.py` (matcher `Read|Edit|Write|MultiEdit|Bash`) MUST, cuando el marcador este activo, emitir `permissionDecision: allow` para: (a) toda `Read`; (b) `Edit`/`Write`/`MultiEdit` cuyo `file_path` resuelva dentro de un path de `execute_scope`; (c) `Bash` que pase la denylist (seccion REQ-03).

#### Acceptance
- Con marcador activo: un `Edit` dentro de scope y un `Bash` seguro devuelven `permissionDecision: allow`.

#### Test scenarios
- TC1: payload `Edit` in-scope + marcador activo → allow.
- TC1b: payload `Bash` seguro (`grep`, `npx vitest`) + marcador activo → allow.

### REQ-02: Edits solo dentro de execute_scope (REQ-SCOPE)

> **Que cambia**: un edit a un path fuera de `execute_scope` NO se auto-aprueba aunque el marcador este activo.
> **Por que**: la apertura no debe exceder la frontera declarada del ticket (DET-30 REQ-03).

Con marcador activo, si el `file_path` de un `Edit`/`Write` NO resuelve dentro de ningun path de `execute_scope`, el hook MUST devolver `{}` (flujo normal → prompt). La resolucion MUST manejar paths multi-repo (`repo:path`) y home (`~`).

#### Acceptance
- Un `Edit` a un path fuera de `execute_scope` cae a prompt.

#### Test scenarios
- TC2: payload `Edit` a `/tmp/otro.txt` + marcador con scope `deckard:commands/` → `{}`.

### REQ-03: Frenos duros preguntan siempre (REQ-STOPS)

> **Que cambia**: aun bajo marcador activo, un conjunto de acciones irreversibles/consecuentes cae a prompt.
> **Por que**: la autonomia no cubre lo irreversible.

Bajo marcador activo, el hook MUST NO auto-aprobar (devolver `{}`) cuando el comando Bash matchee cualquier freno: `git push`/`git merge`/`git rebase`/`git reset --hard`; destructivos de BD (`prisma migrate`, `prisma db push`, `tenant:reset`, `DROP`/`TRUNCATE`); `rm`/`mv`/`chmod`/`chown`/`kill`/`pkill`; y el close del ticket (`dkc-set-status ... closed`). Los frenos MUST estar codificados dentro del hook (no depender de precedencia) y respaldados por reglas `permissions.ask` en `settings.json`. Escrituras externas (Jira/Confluence/PR) via MCP quedan cubiertas por el `permissions.ask` de respaldo (el hook no ve tools MCP).

**Frenos de seguridad heredados de `dredd-guard.py` (hallazgo del spec-judge, DEC-LOCAL-03)**: aunque el modelo invierte dredd (abre en vez de restringir), la apertura NO alcanza a dos categorias sensibles. El hook MUST NO auto-aprobar (devolver `{}`): (d) lecturas (`Read`) o comandos Bash cuyo path matchee `SECRET_PATTERNS` (`.ssh/`, `id_rsa`, `.env`, `.bitbucket_token`, credenciales) — reusar el set de `dredd-guard.py`; (e) egress de red (`curl`/`wget`/`nc`/`ssh`/`scp`/`rsync`/... — `NET_BINARIES`). Caen a `{}` (flujo normal: el allowlist existente puede permitir un `curl localhost` conocido, pero el gate no lo abre en blanco). No se auto-aprueba lo sensible ni la salida de red, aun bajo super.

**Freno de la config de permisos misma (hallazgo del dev en dogfooding, DEC-LOCAL-05)**: (f) escrituras a `~/.claude/settings.json`, `~/.claude/settings.local.json` y `~/.claude/hooks/**` NUNCA se auto-aprueban, **aun estando dentro de `execute_scope`**. Estos archivos DEFINEN la frontera de seguridad (el propio gate + el allowlist); un run autonomo no debe reescribir sus guardrails sin OK del dev. Coincide con el guard "sensitive file" built-in del harness sobre `~/.claude/**` (que es independiente de los PreToolUse hooks y del allowlist). Aplica a los tools de escritura (`Edit`/`Write`/...) y a comandos Bash con operador de escritura (`>`, `tee`, `sed -i`, `cp`, `install`) sobre esos paths. Nota operativa: como el harness ya trata `~/.claude/**` como sensible, un ticket que edite su propia config seguira preguntando aunque el gate este vivo — es el comportamiento deseado, no un bug.

#### Acceptance
- `git push`, `rm -rf x`, `dkc-set-status horadric HOR-x closed` bajo marcador activo → `{}` (prompt).
- `Read` de `~/.ssh/id_rsa` y `curl https://exfil` bajo marcador activo → `{}` (no auto-aprobados).

#### Test scenarios
- TC3: payloads Bash de cada categoria de freno + marcador activo → `{}`.
- TC3b: `dkc-set-status ... closed` NO es auto-aprobado por `auto-allow-safe.py` tras el carve (A1); y el close por MCP (`dkc_set_ticket_status(...,'closed')`) sigue preguntando (no esta en `allow` + cubierto por self-validation de REQ-04).
- TC3c: `Read` de path de secreto y `curl` a host remoto bajo marcador activo → `{}`.

### REQ-04: Ciclo de vida del marcador (REQ-LIFECYCLE)

> **Que cambia**: el marcador `~/.dkc/autopilot-super.json` se escribe al iniciar/abrir session de un ticket `autopilot: super` y se borra al pausar o cerrar.
> **Por que**: el marcador es el interruptor per-ticket; su lifecycle debe atarse a las transiciones canonicas (DET-29).

`dkc-execute-task ... init-ticket` y `open-session` MUST escribir el marcador (con `ticket`, path del ticket, `execute_scope` resuelto del frontmatter, `started_at`) cuando el ticket tenga `autopilot: super` y `execute_scope` no vacio. La logica vive en un helper compartido `commands/lib/`.

**Validez del marcador es path-independent (hallazgo del spec-judge, DEC-LOCAL-04)**: el close canonico de un ticket es el tool MCP `dkc_set_ticket_status(...,'closed')` (`request-close/checkpoints-and-close.md:23`), NO el CLI — el hook no ve tools MCP y `dkc-set-status` es solo el fallback. Por eso la limpieza NO puede depender de un unico path de close. `marker_active()` MUST auto-validar contra el estado VIVO del ticket: activo solo si (a) `started_at` dentro del TTL (3h) Y (b) el frontmatter del ticket referenciado sigue `autopilot: super` Y (c) su `status` NO es `closed`/`archived`/`obsolete`. Asi el gate se vuelve inerte en la proxima tool call apenas el ticket cierra por CUALQUIER path (CLI o MCP) o cambia de modo — self-healing. Los clears explicitos (en `close-gate --decision standby` y `dkc-set-status ... closed`) son optimizacion (borran el archivo de inmediato), no la garantia de correccion. El re-read es un archivo pequeno, aceptable por tool call (dredd-guard ya lee un marcador por call).

#### Acceptance
- init-ticket sobre ticket super escribe marcador con el `execute_scope` correcto; marcador > TTL = inactivo; ticket con `status: closed` (por CLI o MCP) → `marker_active` retorna None aunque el archivo siga presente; `close-gate standby` y `dkc-set-status closed` borran el archivo.

#### Test scenarios
- TC5: init-ticket (super) → marcador existe con scope; marcador con `started_at` viejo → `marker_active` None; ticket con `status: closed` en frontmatter → `marker_active` None (self-validation, ambos paths de close); close-gate standby → archivo borrado.

### REQ-05: Sin marcador, comportamiento identico a hoy (REQ-INERT)

> **Que cambia**: nada, cuando no hay marcador.
> **Por que**: no-regresion — tickets normales (no super) deben comportarse exactamente como antes.

Sin marcador (o con marcador expirado), el hook MUST devolver `{}` para toda invocacion, dejando intacto el flujo de permisos actual (allowlist + hooks existentes).

#### Acceptance
- Sin marcador, el hook devuelve `{}` para Read/Edit/Bash; el comportamiento observado es identico al actual.

#### Test scenarios
- TC4: sin marcador, payloads de Read/Edit/Bash → todos `{}` (regression).

## Non-functional requirements

- **Fail-open**: un error inesperado del hook NO debe brickear la sesion (devolver `{}`), replicando `dredd-guard.py`. Fail-closed solo en las categorias de freno reconocidas.
- **Latencia**: el hook corre en cada tool call; sin escaneo multi-archivo. El marcador guarda el path exacto del ticket, asi que la self-validation es una lectura del marcador (JSON pequeno) + una lectura del frontmatter del ticket referenciado — aceptable por call (dredd-guard ya lee un marcador por call).

## Tasks

### Session 1 — Pieza 1: hook dkc-autopilot-gate.py [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Implementar el hook marker-gated: inerte sin marcador; con marcador Read→allow (salvo secretos), Edit/Write→allow si in-scope, Bash denylist-first + frenos duros (incl. secretos + egress, reusar `SECRET_PATTERNS`/`NET_BINARIES` de dredd). `marker_active()` con self-validation (TTL + autopilot super + status no-terminal del ticket vivo). Reusar `dredd-guard.py` (`marker_active`+TTL, `decide`, `segments`/`first_word`) y DANGER de `auto-allow-safe.py` | REQ-01, REQ-02, REQ-03, REQ-04, REQ-05 | developer | — | `~/.claude/hooks/dkc-autopilot-gate.py` | pipe-test manual con payloads sinteticos | git revert / rm archivo nuevo | DET-1, DET-30 | done | 1 |
| S1.T2 | Pipe-tests: script de test con payloads JSON sinteticos para inerte/activo/scope/cada-freno; assertions concretas sobre `permissionDecision` | REQ-01, REQ-02, REQ-03, REQ-05 | developer | S1.T1 | `~/.claude/hooks/tests/test_dkc_autopilot_gate.py` (o script bash) | correr el test, todos verde | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions`, quality review (DET-23), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Pieza 2: ciclo de vida del marcador [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Helper `commands/lib/autopilot-marker.sh` (o .py): funciones write/clear que resuelven `autopilot` + `execute_scope` del frontmatter del ticket; TTL 3h; idempotente | REQ-04 | developer | S1.GATE | `deckard:commands/lib/autopilot-marker.sh` | test unit del helper | git revert | DET-8, DET-29 | done | 2 |
| S2.T2 | Wiring: `dkc-execute-task` (write en init-ticket/open-session si super; clear en close-gate --decision standby) + `dkc-set-status` (clear en `closed`) invocando el helper | REQ-04 | developer | S2.T1 | `deckard:commands/dkc-execute-task`, `deckard:commands/dkc-set-status` | correr las transiciones sobre ticket de prueba super | git revert | DET-29 | done | 2 |
| S2.T3 | Tests de lifecycle: init-ticket super escribe marcador con scope; standby y closed borran; `started_at` viejo → inactivo | REQ-04 | developer | S2.T2 | `deckard:server/tests/` o script | correr, verde | git revert | DET-7 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, quality review, decidir | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Pieza 3: settings + carve close + doc + e2e [tipo: ⚑ fuerte] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Registrar el hook en `settings.json` (PreToolUse matcher Read/Edit/Write/MultiEdit/Bash) + agregar `permissions.ask` de respaldo (frenos duros: push/merge, BD destructiva, rm/mv/chmod/kill, MCP escrituras externas, close) | REQ-03 | developer | S1.GATE | `~/.claude/settings.json` | `jq -e` valida schema; hook aparece | git revert del settings | DET-30 | done | 3 |
| S3.T2 | Carve A1: `dkc-set-status ... closed` fuera de `auto-allow-safe.py` (no auto-allow del close por CLI) | REQ-03 | developer | S1.GATE | `~/.claude/hooks/auto-allow-safe.py` | pipe-test: `dkc-set-status ... closed` → `{}` | git revert | DET-30 | done | 3 |
| S3.T3 | Doc DET-30 aditiva: nota en `dets_catalog.py` + `prompts/deterministic-rules.md` sobre la apertura de permisos marker-gated; nota en `docs/` | REQ-01 | developer | S2.GATE | `deckard:prompts/deterministic-rules.md`, `deckard:docs/` | `dkc-export-rules --global` regenera sin drift | git revert | DET-30, DET-16 | done | 3 |
| S3.T4 | Verificacion end-to-end: ticket de prueba super → init-ticket escribe marcador → edit in-scope auto-aprueba, out-scope pregunta, freno pregunta → standby borra marcador | REQ-01, REQ-02, REQ-03, REQ-04 | developer | S3.T1, S3.T2, S3.T3 | (verificacion) | corrida e2e con evidencia | (no aplica) | DET-13, DET-33 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T1)** — persistir, quality review, decidir close | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 3 |

## Constraints

- **DET-30**: aditiva a la red de seguridad autopilot. El close SIEMPRE pregunta (incluso super) — se preserva y refuerza (A1).
- **DET-29**: el lifecycle del marcador vive en las transiciones canonicas (`dkc-execute-task`, `dkc-set-status`), no en Edits crudos.
- **RULE-workflow-enforcement-pattern-009**, **RULE-workflow-agent-pack-enforcement-020**: el enforcement a nivel harness (allowlist/hook) es el patron correcto para contencion real, no el prompt.

## Dependencies

- Claude Code CLI >= 2.1.210 (PreToolUse `permissionDecision`, `permissions.ask` mode-independent) — verificado.
- `dredd-guard.py` como patron de referencia (no dependencia de runtime, solo molde).

## Risks and mitigations

- **Marcador colgado deja permisos abiertos** → TTL 3h (`marker_active` retorna None si expira) + limpieza en standby/closed.
- **Precedencia entre hooks Bash** (ya hay 4) → los frenos nunca emiten allow (caen a `{}`), no compiten con un `deny` de dredd-guard.
- **Cobertura de BD destructiva por patron es parcial** (`psql DROP` crudo) → enforcement in-hook por regex DANGER + `permissions.ask` de respaldo; documentado como limitacion conocida.
- **Resolucion de scope multi-repo/home** → el helper y el hook resuelven `repo:path` y `~` a paths absolutos antes de comparar.

## Open questions

- **A1 — RESUELTA** (dev, 2026-08-12): freno de close a nivel harness (carve de `auto-allow-safe.py` + no auto-allow en gate hook). Ver DEC-LOCAL-02.

## Decisions

### DEC-LOCAL-01: Marker-gated hook en vez de defaultMode auto
El modo `auto` de Claude Code es de sesion, no per-ticket. Para condicionar la apertura al estado `autopilot: super` de un ticket especifico, el unico mecanismo per-ticket es un PreToolUse hook gated por un marcador que el lifecycle del ticket escribe/borra. Es el patron probado de `dredd-guard.py`, invertido (abre en vez de restringir).

### DEC-LOCAL-02: Freno de close a nivel harness (A1)
El close por CLI (`dkc-set-status ... closed`) hoy se auto-aprueba en `auto-allow-safe.py` (auto-allow de todo `dkc-*`), mientras el close por MCP ya pregunta. Se elige alinear ambos a nivel harness: carve del close por CLI + el gate hook nunca lo auto-aprueba. Defensa en profundidad coherente con DET-30 (close siempre pregunta).

### DEC-LOCAL-03: Secretos y egress de red NO se auto-aprueban bajo super (hallazgo spec-judge H2)
El modelo invierte `dredd-guard.py` (abre en vez de restringir), pero conserva DOS de sus protecciones: lecturas de paths de secretos (`SECRET_PATTERNS`) y egress de red (`NET_BINARIES`) NO se auto-aprueban aun bajo marcador activo — caen a `{}` (flujo normal). Razon: en un mecanismo tagueado `security` que abre el harness, auto-aprobar la lectura de `~/.ssh/id_rsa` o un `curl` de exfiltracion (con marcador activo o colgado) es un vector inaceptable. No se DENIEGA (para no romper lecturas legitimas de `.env` en dev ni `curl localhost` conocidos del allowlist): simplemente no se abre en blanco. Alternativa descartada: replicar el `deny` duro de dredd (descartado: demasiado restrictivo para ejecucion general de un ticket propio).

### DEC-LOCAL-05: La config de permisos nunca se auto-aprueba (hallazgo dev en dogfooding)
Durante la ejecucion de HOR-139, editar `~/.claude/hooks/dkc-autopilot-gate.py` disparo el guard "sensitive file" del harness. El dev decidio: `~/.claude/settings.json` + `~/.claude/hooks/**` son un freno duro — nunca auto-aprobados aun en `execute_scope`, porque son la frontera de seguridad misma (auto-aprobar ediciones a los propios guardrails bajo un run autonomo es lo que NO se quiere). Ventaja adicional: coincide con el guard built-in del harness sobre `~/.claude/**`, asi que no hay que averiguar si un hook `allow` puede sobreescribir ese guard (no se necesita). Alternativa descartada: auto-aprobar in-scope (descartada por el riesgo de auto-modificacion de guardrails + incertidumbre de si el guard del harness es sobreescribible).

### DEC-LOCAL-04: Validez del marcador path-independent (hallazgo spec-judge H1)
La limpieza del marcador no puede depender de un unico path de close porque el close canonico es el tool MCP `dkc_set_ticket_status` (que el hook no ve) y el CLI es fallback. `marker_active()` auto-valida contra el estado vivo del ticket (autopilot super + status no-terminal + TTL), volviendo el gate self-healing ante cualquier path de cierre. Alternativa descartada: agregar un hook sobre el tool MCP de close (descartado: mas superficie + `execute_scope` no cubre el server MCP; la self-validation es mas simple y robusta).

## Success metrics

- Durante un ticket real en super, los prompts mecanicos (Read/Edit in-scope/Bash seguro) caen a ~0, mientras los frenos duros (push/close/destructivo) siguen preguntando el 100% de las veces.
- Cero regresion en tickets no-super (comportamiento identico, verificado por TC4).

## Technical reference

- `dredd-guard.py`: `marker_active()` (`~/.dredd/active.json` + TTL), `decide(decision, reason)` emite `hookSpecificOutput.permissionDecision`, `segments()`/`first_word()` parsean comandos compuestos.
- `auto-allow-safe.py`: `DANGER` regex list (reusable para frenos), `emit_allow()`, allow por subcomando robusto a `cd &&` y variables.
- Marcador propuesto: `~/.dkc/autopilot-super.json` = `{ticket, project, execute_scope: [...], started_at: <epoch>}`.

## Acceptance checkpoints

Ejecutar al cierre (DET-13 — evidencia real, no "parece OK"):

- [ ] **AC1 (REQ-01/02/05)**: pipe-tests del hook verdes — inerte→`{}`, activo+in-scope→allow, out-scope→`{}`. Evidencia: salida del test.
- [ ] **AC2 (REQ-03)**: cada categoria de freno (push/merge, BD destructiva, rm/mv/chmod/kill, close, secretos, egress) bajo marcador activo → `{}`. Evidencia: salida del test + pipe-test del carve de close por CLI en `auto-allow-safe.py` + evidencia de que el close por MCP sigue preguntando (no esta en `allow`).
- [ ] **AC3 (REQ-04)**: init-ticket super escribe marcador con `execute_scope`; marcador > TTL → inactivo; ticket con `status: closed` en frontmatter → `marker_active` None (self-validation, cubre close por CLI y MCP); close-gate standby y set-status closed borran el archivo. Evidencia: corrida de las transiciones + inspeccion del marcador + caso status:closed.
- [ ] **AC4 (no-regresion, REQ-05)**: sin marcador, un ticket normal se comporta identico a hoy (todos `{}`). Evidencia: TC4.
- [ ] **AC5 (e2e)**: corrida end-to-end sobre ticket de prueba super con evidencia runtime (edit in-scope auto-aprueba, out-scope pregunta, freno pregunta, standby borra marcador).
- [ ] **AC6**: `settings.json` valida (`jq -e`), hook registrado, `permissions.ask` de respaldo presente; `dkc-export-rules --global` regenera sin drift tras la nota DET-30.

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

{Se llena si se descubren problemas.}
