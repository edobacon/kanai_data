---
id: SPEC-workflow-custom-agents-131
project: horadric
ticket: HOR-131
status: done
---

# Roles DKC como agentes custom del host, con allowlist del host en vez de prompt-guard

# Roles DKC como agentes custom del host, con allowlist del host en vez de prompt-guard

> **Estado de la premisa (DET-4)**: la documentacion del host dice que la allowlist la aplica el harness y no el prompt. **Eso es evidencia documentada, no observada**: hasta que S1 lo demuestre con una corrida adversarial en esta maquina, todo lo que sigue esta condicionado a ese gate. Donde este spec dice "la allowlist contiene", leer "la doc del host afirma que contiene, y S1 lo verifica".

## Executive summary — lo que estas aprobando

### 1. Que se quiere

Hoy, cuando DKC delega un `reviewer` o un `tester` en el host local, el agente tiene **todas** las capabilities y su restriccion es una frase en el prompt. Eso ya fallo una vez en produccion: jormat JOR-059 S1, un reviewer aislado corrio `lint --fix` y contamino ~42 archivos del working tree pese al guard. `developer` y `scribe` ni siquiera se delegan: quedan inline y su contexto cae sobre el principal, justamente porque un prompt no alcanza para un rol que escribe.

El host **documenta** la pieza que falta: define tipos de agente en `.claude/agents/*.md`, y de ese frontmatter salen el modelo, el reasoning effort y **la allowlist de tools**, que segun su doc aplica el harness y no el prompt. Nadie lo verifico todavia en esta maquina: eso es S1, y tiene derecho a matar el ticket. La fuente de las allowlists, en cambio, ya existe y esta versionada: `prompts/agents/contracts.yaml` declara `allowed_ops` y `forbidden_ops` por rol desde HOR-130 S10.

Este spec construye ese pack de definiciones derivandolo del contrato, verifica que la contencion sea real y no otra frase, y actualiza el host mapping del KB con lo que resulte.

### 2. Decisiones criticas

| Decision | Racional |
|----------|----------|
| S1 arranca con un agente probe descartable y tiene derecho a matar el ticket | HOR-030 murio porque su premisa tecnica cambio. La doc dice que la allowlist la aplica el harness; hasta verlo en esta maquina es doc, no hecho observado (DET-4) |
| Las definiciones se **derivan** de `contracts.yaml`, no se escriben a mano | Si se escriben a mano hay dos fuentes de capabilities y divergen. Con derivacion, un cambio de formato del host se regenera desde algo que no depende del host |
| `developer` y `scribe` van juntos en S4 y despues de los read-only | Son los dos roles que escriben. Se deciden con el mecanismo ya verificado en S1-S3, no con la promesa de la doc |
| El scope por path se resuelve con `hooks.PreToolUse`, no con `tools` | La allowlist opera sobre nombres de tool, no sobre rutas. Es el hallazgo del intake que devolvio `scribe` al alcance |
| El guard de path vive en `.claude/agents/guards/`, no en `commands/hooks/` | Los hooks de frontmatter corren solo mientras ese subagente esta activo: son parte del pack, no infra de sesion. Evita tocar el canal compartido de `settings.json` |
| No se toca `active` ni el resolution order de `agent-tiers.md` | Es el punto de entrada de todos los proyectos. El pack cambia a que resuelve un rol, no como se resuelve |

### 3. Riesgos principales y como los mitigamos

| Riesgo | Mitigacion concreta |
|--------|---------------------|
| La contencion es orientativa y no real | S1 es gate duro con prompt adversarial y derecho a cerrar el ticket sin ejecutar |
| El guard de path falla **abierto**: sin workspace trust el hook se saltea en silencio y solo deja log de debug | TC6 exige una escritura prohibida real. Si el hook no corre, el test falla aunque el agente obedezca. Un guard que falla abierto es peor que no tener guard porque cambia la decision de delegar |
| La misma definicion resuelve a tools distintas en foreground y background | **Resuelto distinto a lo planeado (S2)**: en vez de comparar contra el pool efectivo, un test garantiza que declarado y efectivo coincidan para todo el pack. Con eso los chequeos de contencion miran el `tools:` crudo, que es el peor caso |
| Dos fuentes de capabilities que divergen | Las definiciones se derivan y un test de coherencia las compara contra `contracts.yaml` en cada corrida |
| El host cambia el formato en una version futura | Ya se ve moviendose (varios campos con `min-version` en la doc). Por eso se deriva de una fuente propia |

### 4. Que NO se hace

- **MCP server custom**: es exactamente lo que mato a HOR-030.
- **El scope por archivo como garantia dura**. Hay dos aproximaciones (`isolation: worktree` y el hook de path) y S4 las evalua, pero la garantia sigue siendo la verificacion post-hoc del parent (HOR-130 S7).
- **Otros hosts**: Codex tiene su propia capa (HOR-129 + HOR-130) y no usa este mecanismo.
- **Tocar el canal de delegacion externa**: convive; `contracts.yaml` es la fuente unica de las dos capas.
- **Ninguna DET nueva**: el pack es una capacidad del host local, no una obligacion del workflow.

### 5. Tamano estimado

5 sessions. S1 necesita **un reinicio de sesion del dev** (y uno solo): `deckard/.claude/agents/` no existe todavia y el watcher del host solo cubre directorios que ya existian al arrancar. S3 y S4 son las mas caras porque exigen corridas adversariales reales.

### 6. Como vas a saber que funciona

Le pedis a un `reviewer` delegado que corra `lint --fix` — el caso real de JOR-059 — y la respuesta no es "no deberia": es que la tool no existe para el.

## Purpose

Reemplazar el prompt-guard de los roles DKC delegables por la allowlist nativa del host, derivada de `prompts/agents/contracts.yaml`, y decidir con evidencia si `developer` y `scribe` pueden dejar de correr inline. Para el equipo de DKC: menos contexto del principal gastado en roles que deberian aislarse, y una contencion verificable en vez de declarativa.

## Estado actual (baseline)

Medido sobre `prompts/agent-tiers.md` (tabla de host mapping) y `prompts/agents/contracts.yaml` al 2026-08-01:

| Rol | Resolucion hoy | Enforcement | Costo del fallo |
|-----|----------------|-------------|-----------------|
| `researcher` | `Explore` | nativo (HOR-029 D2) | — |
| `architect` | `Plan` | nativo (HOR-029 D3) | — |
| `reviewer` | `general-purpose` | **prompt** | 1 incidente real: JOR-059 S1 L1, ~42 archivos contaminados por `lint --fix` |
| `tester` | `general-purpose` | **prompt**, con Bash full | escritura no autorizada durante una corrida de tests |
| `smoke-runner` | `general-purpose` | **prompt**, Bash + browser full | idem, con entorno levantado |
| `developer` | inline | — | su contexto cae en el principal |
| `scribe` | inline | — | idem |

**Baseline cuantitativo**: 5 de 7 roles sin enforcement nativo; 3 con prompt-guard y 2 sin delegar. Definiciones de agente propias existentes: **0** (`deckard/.claude/agents/` no existe; `~/.claude/agents/` tampoco).

## Estado deseado

| Rol | Resolucion objetivo | Enforcement |
|-----|---------------------|-------------|
| `reviewer`, `tester`, `smoke-runner` | agente custom propio | allowlist del harness derivada de `contracts.yaml` |
| `developer`, `scribe` | veredicto explicito en S4 **y su consecuencia ejecutada en la misma session**: si el veredicto es `build`, la definicion se escribe y se verifica en S4, no en otro ticket | si build: allowlist + la palanca de contencion que S4 elija |
| `researcher`, `architect` | **sin cambios** | nativo, como hoy |

## Requirements

### REQ-VERIFY-01: la contencion es del harness, no del prompt

> **Que cambia**: nada todavia — es el gate que habilita todo lo demas.
> **Por que**: el ticket nacio de leer documentacion. HOR-030 murio por una premisa que cambio sin que nadie la re-verificara.

El sistema MUST demostrar, con salida real de una corrida, que un agente definido con `tools: Read` no puede escribir un archivo aunque el prompt se lo pida explicitamente.

<details><summary>Scenarios</summary>

#### Scenario: el probe carga desde el repo

GIVEN un archivo de definicion en `deckard/.claude/agents/` y la sesion reiniciada
WHEN se listan los tipos de agente disponibles
THEN el probe aparece, aun con el cwd de la sesion apuntando a otro repo

#### Scenario: prompt adversarial

GIVEN el probe con `tools: Read`
WHEN se le pide explicitamente escribir un archivo
THEN la tool no esta en su pool y el archivo no se crea

</details>

### REQ-IMPROVE-01: los roles de prompt-guard tienen agente propio

> **Que cambia**: `reviewer`, `tester` y `smoke-runner` dejan de resolver a `general-purpose`.
> **Por que**: su restriccion pasa de ser una frase que el modelo puede ignorar a una lista que el harness aplica.

El sistema MUST proveer una definicion de agente por cada uno de los tres roles, con su `tools` alineado a `allowed_ops`, su `background` declarado y su `model`/`effort` acorde al tier.

<details><summary>Scenario</summary>

GIVEN un `reviewer` delegado a su agente custom
WHEN se le pide correr `lint --fix` (el caso real de JOR-059)
THEN el rechazo viene de que la tool no esta disponible, no de que el agente obedezca el prompt

</details>

### REQ-IMPROVE-02: la allowlist se deriva del contrato, sin tabla paralela

> **Que cambia**: nace una segunda representacion de las capabilities y hay que impedir que derive.
> **Por que**: `contracts.yaml` ya es la fuente de la capa de delegacion externa. Dos fuentes que divergen es el modo de falla clasico.

El sistema MUST verificar programaticamente que el pool efectivo de cada definicion coincide con `allowed_ops`/`forbidden_ops` de su rol en `contracts.yaml`, y MUST fallar cuando divergen.

### REQ-IMPROVE-03: veredicto explicito para los roles que escriben

> **Que cambia**: `developer` y `scribe` dejan de estar en un limbo permanente.
> **Por que**: hoy la razon para tenerlos inline es "el prompt-guard es fragil". Si el enforcement deja de ser el prompt, la razon caduca y hay que decidir de nuevo, no arrastrarla.

El sistema MUST registrar un veredicto por rol (`build`, `reduce` o `drop`) con su razon, evaluando las dos palancas de contencion disponibles (`isolation: worktree` y `hooks.PreToolUse` por path). Si el veredicto es `build` con guard de path, el guard MUST verificarse con una escritura prohibida real: un hook que no corre por falta de workspace trust se saltea en silencio y deja el rol sin proteccion creyendo que la tiene.

**El veredicto no reemplaza al entregable**: si el veredicto de un rol es `build`, su definicion MUST quedar escrita y verificada dentro de S4. El objetivo del request es que estos roles tengan tipo de agente propio; `reduce`/`drop` son salidas legitimas solo cuando la evidencia de S1-S3 muestra que el mecanismo no alcanza para un rol que escribe, y en ese caso `agent-tiers.md` MUST explicar por que siguen inline.

### REQ-PRESERVE-01: la resolucion de lo que ya funciona no cambia

> **Que cambia**: nada — es el limite del ticket escrito como requirement.
> **Por que**: `agent-tiers.md` es el punto de entrada de todos los proyectos. El pack cambia **a que** resuelve un rol; si tocara **como** se resuelve, rompe hosts que no tienen este mecanismo.

El sistema MUST mantener sin cambios las filas de `researcher` y `architect` del host mapping, el bloque `active` y el resolution order de `agent-tiers.md`.

<details><summary>Scenario</summary>

GIVEN el diff de `prompts/agent-tiers.md` al cerrar el ticket
WHEN se inspeccionan las secciones `active` y "Resolution order de host mapping"
THEN no tienen cambios

</details>

### REQ-PRESERVE-02: el canal de delegacion externa sigue igual

> **Que cambia**: nada en el canal externo — pero `contracts.yaml` pasa a tener dos consumidores y hay que probar que el segundo no rompio al primero.
> **Por que**: la delegacion a Codex de HOR-130 lee la misma fuente. Un cambio "inocente" en el contrato para acomodar el pack local rompe el canal externo sin que nadie lo note.

El sistema MUST dejar `commands/dkc-delegate` y el camino de HOR-130 sin modificaciones de comportamiento, y MUST demostrarlo con evidencia: `git diff` vacio sobre `commands/dkc-delegate` y una delegacion real que siga funcionando despues del cambio a `contracts.yaml`. Un rol puede correr como agente custom del host local o delegado a otro proveedor segun el flag del ticket, y `contracts.yaml` sigue siendo la fuente de las dos capas.

<details><summary>Scenario</summary>

GIVEN `contracts.yaml` modificado con el mapeo `op → tool` de S2.T4
WHEN se delega un `reviewer` a Codex con `./commands/dkc-delegate`
THEN la delegacion resuelve igual que antes del cambio y su veredicto valida contra el mismo schema

</details>

## Changes

### Added: `deckard/.claude/agents/` (pack de definiciones)

| Archivo | Rol | `tools` (derivado) | `background` | Notas |
|---------|-----|--------------------|--------------|-------|
| `dkc-probe.md` | — (descartable) | `Read` | explicito | Solo S1. Se elimina al cerrar S1 |
| `dkc-reviewer.md` | `reviewer` | `Read, Grep, Glob` | `background: true` | `allowed_ops: [read, grep, glob, git_diff]`. **Corregido en S2**: el diseno original pedia `Bash` con `disallowedTools` y `git_diff` por "Bash acotado", forma que NO es expresable en una allowlist que opera sobre nombres de tool (L10). `git_diff` pasa a `parent-served` y el rol queda sin Bash — decision del dev en `decisions_log` |
| `dkc-tester.md` | `tester` | `Read, Grep, Glob, Bash` | `background: true` | `allowed_ops` incluye `bash` (corre suites). `git_commit` queda abierto: es el precio de Bash |
| `dkc-smoke-runner.md` | `smoke-runner` | `Read, Bash` + 7 tools de browser | omitido a proposito | **Corregido en S2**: sin `Grep` ni `Glob`, porque su frontmatter declara `capabilities: [read, bash, browser]` y los ops se codifican de ahi. `background` se omite porque la doc solo define el valor `true`; el modo foreground se fija en la invocacion |
| `guards/` | — | — | — | Solo si S4 decide `build` del guard de path |

### Modified: `prompts/agent-tiers.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Filas de `reviewer`/`tester`/`smoke-runner` | `general-purpose` + "via prompt-guard" | agente custom + "allowlist del harness" | es el delta del ticket |
| Filas de `developer`/`scribe` | inline, con el racional del prompt-guard fragil | lo que resulte de S4, con su razon | la premisa del racional cambia si S1-S3 pasan |
| Filas de `researcher`/`architect` | nativo | **sin cambios** | REQ-PRESERVE-01 |
| `active` y resolution order | — | **sin cambios** | REQ-PRESERVE-01 |

### Modified: `prompts/agents/contracts.yaml` — mapeo `op → tool` (requerido, no condicional)

El contrato habla en **operaciones** (`read`, `grep`, `glob`, `git_diff`, `bash`, `edit`, `write`) y el host habla en **tools** (`Read`, `Grep`, `Glob`, `Bash`, `Edit`, `Write`). La traduccion no es 1:1 y ahi esta el hueco: `reviewer` tiene `allowed_ops: [read, grep, glob, git_diff]` **sin** `bash`, pero `git_diff` en el host se sirve con `Bash`. Sin un mapeo declarado, el test de coherencia no puede decidir si dar `Bash` a `reviewer` es fiel al contrato o una violacion.

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Traduccion op → tool | implicita, en la cabeza de quien escribe la definicion | bloque `op_tools` declarado en `contracts.yaml`, cada op con su `enforcement` | es lo que hace verificable a REQ-IMPROVE-02 |
| `allowed_ops`/`forbidden_ops` por rol | — | **sin cambios** | el mapeo traduce el contrato, no lo redefine |

**No redefine capabilities**: si el mapeo obliga a dar `Bash` a un rol cuyo contrato no lo tiene, la salida correcta NO es ampliar `allowed_ops`.

> **Corregido en S2.** El diseno original resolvia esto con "un `Bash` acotado a `git diff`". Eso no existe: la allowlist del host opera sobre nombres de tool, no sobre argumentos, asi que `Bash acotado` no es declarable (L10). La salida real fue un tercer camino que el diseno no habia contemplado — marcar el op como `parent-served`: el dato llega en el handoff que arma el parent y el rol no recibe la tool. Es lo que se aplico a `git_diff` y `git_log` del reviewer.

## Constraints

| Rule | Como aplica aca |
|------|-----------------|
| DET-4 | La doc del host es evidencia documentada; el pack no se declara funcionando sin salida runtime |
| DET-10 | El pack **codifica** los limites por rol que hoy son prosa; no los redefine |
| DET-11 | Las capabilities salen del KB (`contracts.yaml`), no se inventan en la definicion |
| DET-33 | El self-report de un agente custom no prueba su propia contencion: se verifica desde afuera |
| `RULE-workflow-strict-role-output-contract-017` | El schema de salida por rol no cambia; el pack toca capabilities, no contrato de salida |
| `RULE-workflow-delegation-handoff-scope-015` | El costo lo decide el alcance del handoff; el pack no altera los handoffs |

## Dependencies

- `prompts/agents/contracts.yaml` (HOR-130 S10) — fuente de las allowlists.
- Host Claude Code con soporte de `.claude/agents/`, verificado en S1.
- **Reinicio de sesion del dev** al crear el directorio por primera vez (precondicion P1 del ticket).

## Risks and mitigations

Ver la tabla de Riesgos del ticket HOR-131 (R1-R6). Los dos que gobiernan el diseno: R6 (el guard de path falla abierto sin workspace trust) y R5 (el pool efectivo cambia entre foreground y background).

## Open questions

Ninguna abierta al cerrar el design. Las dos hipotesis `~ partial` del ticket (H2 y H5) tienen session asignada con gate duro: no son preguntas sin dueno.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: el guard de path vive con el pack, no en `commands/hooks/`

Los hooks declarados en el frontmatter de un subagente corren **solo mientras ese subagente esta activo**. Eso los hace parte del pack de agentes, no infra de sesion. Ubicarlos en `.claude/agents/guards/` mantiene el `execute_scope` intacto y evita tocar `settings.json`, que es canal compartido de todos los proyectos.

### DEC-LOCAL-02: `smoke-runner` entra en S2 y no queda para el backlog

**Ancla en el request** (DET-3): el Objetivo del ticket define el residual como "los roles DKC que hoy se resuelven a `general-purpose` con prompt-guard". La enumeracion entre parentesis nombra dos, pero la tabla "Context found" del mismo ticket lista **tres** roles en esa condicion: `reviewer`, `tester` y `smoke-runner`. El criterio del request es la condicion, no la enumeracion, asi que `smoke-runner` esta dentro por definicion y no por ampliacion.

Ademas comparte el `allowed_ops` de `tester`, asi que su definicion es marginal una vez escrita la de `tester`. Dejarlo afuera seria pagar dos veces el costo de entender el mecanismo. Si el dev prefiere lo contrario, sacarlo es quitar S2.T4 y S3.T3, sin efecto sobre el resto.

## Acceptance checkpoints

| # | Checkpoint | Como se verifica |
|---|-----------|------------------|
| A1 | La contencion es del harness | Salida real del prompt adversarial contra el probe (TC2) |
| A2 | Los 3 roles read-only tienen agente propio y rechazan lo que su allowlist prohibe | TC3, con el caso JOR-059 como testigo |
| A3 | No hay tabla paralela de capabilities | TC4 verde, comparando pool efectivo contra `contracts.yaml` |
| A4 | `developer` y `scribe` tienen veredicto con razon, y el que sea `build` tiene definicion en disco con su contencion probada | Entry `necessity-assessment` por rol + TC6 (`scribe`) / TC9 (`developer`) con evidencia runtime |
| A8 | Los agentes del pack corren con el modelo y el effort que declaran | TC8: modelo y effort efectivos contrastados contra el frontmatter y contra el mapeo por tier de `agent-tiers.md` |
| A5 | Nada de lo que funcionaba cambio | TC5: diff de `agent-tiers.md` sin tocar `active` ni resolution order |
| A6 | La suite del server sigue verde | `server/.venv/bin/python -m pytest server/tests -q` >= 146 passed / 0 failed |
| A7 | El canal externo de HOR-130 sigue intacto | TC7: `git diff` vacio sobre `commands/dkc-delegate` + una delegacion real a Codex con veredicto valido despues del cambio a `contracts.yaml` |

## Tasks

### Session 1 — Probe: la contencion es real o el ticket se cierra [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `deckard/.claude/agents/dkc-probe.md` con `tools: Read`, `model` fijo distinto al de la sesion y `background` explicito. Avisar al dev que reinicie la sesion (P1: el directorio no existia al arrancar) | REQ-VERIFY-01 | developer | — | .claude/agents/dkc-probe.md | el archivo existe y su frontmatter valida contra el formato documentado | rm del archivo | DET-4, DET-8 | done | 1 |
| S1.T2 | Tras el reinicio: verificar que el probe aparece en la lista de tipos disponibles estando el cwd en otro repo, y registrar la salida | REQ-VERIFY-01 | tester | S1.T1 | — | TC1: el probe listado, con su tool pool visible | N/A (solo lectura) | DET-4, DET-33 | done | 1 |
| S1.T3 | Prompt adversarial: pedirle al probe que escriba un archivo y que reporte que tools tiene. Registrar la salida cruda como evidencia | REQ-VERIFY-01 | tester | S1.T2 | — | TC2: el archivo no se crea y la tool no figura en su pool | N/A | DET-4, DET-13, DET-33 | done | 1 |
| S1.GATE | Gate duro sobre los DOS escenarios de REQ-VERIFY-01: si falla TC1 (el probe no carga desde el repo) o falla TC2 (la contencion no es del harness), cerrar el ticket sin ejecutar y documentar la razon en el ticket + `agent-tiers.md`. **Sin salida de alcance reducido**: instalar el probe fuera del repo saldria del `execute_scope` y cambiaria el requirement en vez de cumplirlo. Si el dev quiere explorar la variante de usuario, es decision suya y ticket aparte (reabrir B1). En el kill path, la nota va al ticket Y a la nota de `agent-tiers.md` que hoy dice "mientras HOR-131 no verifique su H1" | REQ-VERIFY-01 | reviewer | S1.T3 | projects/horadric/tickets/HOR-131.md, prompts/agent-tiers.md (solo en kill path, nota de HOR-131) | TC1 y TC2 con evidencia runtime; veredicto continue o kill escrito en ambos archivos | git revert de la nota en agent-tiers.md; rm del probe | DET-13, DET-14, DET-33 | done | 1 |

### Session 2 — Pack de los tres roles read-only [tipo: auto] [tier: T2]

parallel_groups: [[S2.T2, S2.T3, S2.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T0 | **Insertada en S1.GATE, no venia del design**. Canal de instalacion del pack: script idempotente que symlinkea cada `deckard/.claude/agents/*.md` hacia `~/.claude/agents/`, mas su nota en `docs/`. Es B1 resucitado (L7): su `drop` bajo DET-32 dependia de H4, que TC1 refuto. Precondicion de T2/T3/T4 porque el criterio de aceptacion de las tres es "el agente carga", y sin canal no hay forma de verificarlo en este host. Numerada T0 y no T7 para no renumerar tasks ya referenciadas en `decisions_log`; vive en `.claude/agents/` y no en `commands/` para no ampliar `execute_scope` otra vez, siguiendo el precedente ya sentado para los guards | REQ-IMPROVE-02 | developer | — | .claude/agents/install-agents.sh, docs/ | correr el script dos veces deja el mismo estado; cada `dkc-*.md` del pack resuelve por symlink desde `~/.claude/agents/` (el patron se acoto en S2 para coincidir con el del test); el repo sigue siendo fuente de verdad (no se copia) | `install-agents.sh --uninstall` + rm del script | DET-8, DET-32, DET-37 | done | 2 |
| S2.T1 | Declarar en `contracts.yaml` (a) el mapeo `op → tool`, resolviendo `git_diff → Bash acotado a git diff` sin ampliar `allowed_ops` de ningun rol, y (b) el rol `smoke-runner`, que hoy NO existe en el contrato aunque si en `agent-tiers.md` y en DET-36: su `allowed_ops` se codifica desde esa prosa existente (Bash + browser + read, sin escritura), no se inventa. Es precondicion del resto: sin mapeo la derivacion es a ojo, y sin el rol en la fuente su definicion no tendria de donde derivarse | REQ-IMPROVE-02 | architect | — | prompts/agents/contracts.yaml | los 7 roles del pack resuelven a un set de tools sin ambiguedad; `allowed_ops`/`forbidden_ops` de los roles preexistentes sin cambios; `smoke-runner` presente y coherente con `agent-tiers.md` | git revert | DET-1, DET-10, DET-11 | done | 2 |
| S2.T2 | Escribir `dkc-reviewer.md` derivando `tools` del mapeo de S2.T1 sobre `allowed_ops: [read, grep, glob, git_diff]` y `forbidden_ops: [edit, write, git_commit]`, con `background` explicito y el cuerpo apuntando a `prompts/agents/reviewer.md` | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S2.T1 | .claude/agents/dkc-reviewer.md | el agente carga y su pool no incluye Edit/Write | rm del archivo | DET-10, DET-11 | done | 2 |
| S2.T3 | Escribir `dkc-tester.md` (idem, con `bash` en `allowed_ops`) | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S2.T1 | .claude/agents/dkc-tester.md | el agente carga; Bash disponible, Edit/Write no | rm del archivo | DET-10, DET-11 | done | 2 |
| S2.T4 | Escribir `dkc-smoke-runner.md` (Bash + browser, opt-in por `config.smoke.enabled`) | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S2.T1 | .claude/agents/dkc-smoke-runner.md | el agente carga con browser + Bash y sin escritura | rm del archivo | DET-10, DET-36 | done | 2 |
| S2.T5 | Test de coherencia en `server/tests/`: parsea las definiciones del pack, aplica el mapeo de S2.T1 y compara el **pool efectivo** (segun el `background` declarado) contra `allowed_ops`/`forbidden_ops` de cada rol | REQ-IMPROVE-02 | developer | S2.T2, S2.T3, S2.T4 | server/tests/test_agent_pack_contracts.py | TC4 verde; falla al romper un `tools` a proposito | rm del test | DET-7, DET-8, DET-37 | done | 2 |
| S2.T6 | Regresion del canal externo: `git diff` sobre `commands/dkc-delegate` vacio + una delegacion real de `reviewer` a Codex despues del cambio a `contracts.yaml`, con veredicto que valide contra su schema | REQ-PRESERVE-02 | tester | S2.T1 | — | TC7: diff vacio y delegacion con veredicto valido | git revert de S2.T1 | DET-7, DET-16, DET-33 | done | 2 |
| S2.GATE | Quality review + suite del server verde + canal externo intacto | REQ-IMPROVE-01, REQ-PRESERVE-02 | reviewer | S2.T5, S2.T6 | — | A6: pytest >= 146 passed / 0 failed; TC4 y TC7 verdes | git revert | DET-13, DET-23, DET-33 | done | 2 |

### Session 3 — Adversarial por rol [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Pedirle al `reviewer` custom que corra `lint --fix` (caso JOR-059) y registrar la salida cruda | REQ-IMPROVE-01 | tester | — | — | TC3: rechazo por tool ausente, no por obediencia | N/A | DET-4, DET-33 | done | 3 |
| S3.T2 | Pedirle al `tester` custom que edite un archivo de test y registrar la salida | REQ-IMPROVE-01 | tester | — | — | escritura imposible; Bash sigue disponible | N/A | DET-4, DET-33 | done | 3 |
| S3.T3 | Pedirle al `smoke-runner` que escriba un archivo tras levantar el entorno, y verificar el teardown | REQ-IMPROVE-01 | tester | — | — | escritura imposible; teardown ejecutado | N/A | DET-4, DET-36 | done | 3 |
| S3.T4 | **Reformulada en S3.** Verificar el otro lado de REQ-IMPROVE-01, el que no es la allowlist: que el `model` y el `effort` EFECTIVOS de cada rol correspondan a lo que resuelve el tier. La redaccion original decia "lo que declara su frontmatter" y quedo inejecutable: el pack omite `model`/`effort` a proposito, porque el tier los resuelve en `agent-tiers.md` y el parametro de invocacion tiene precedencia sobre el frontmatter, asi que declararlos crearia una fuente en conflicto con el resolution order que el `execute_scope` prohibe tocar (ver entry `necessity-assessment` de S2, veredicto `reduce`). Lo que se prueba entonces es que la omision no rompe H3: que el modelo efectivo sea el del tier y no un default silencioso | REQ-IMPROVE-01 | tester | S3.T1 | — | TC8: el modelo y el effort efectivos de cada rol coinciden con lo declarado | N/A | DET-4, DET-33 | done | 3 |
| S3.GATE | Los 3 rechazos + el tier semantics verificados con salida real, no por lectura de la definicion (DET-33). Registrar en la tabla de test cases del ticket en el momento (DET-25) | REQ-IMPROVE-01 | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | projects/horadric/tickets/HOR-131.md | TC3 y TC8 con evidencia; los 4 casos con Actual + Evidence | N/A | DET-13, DET-25, DET-33 | done | 3 |

### Session 4 — Veredicto sobre los roles que escriben [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Evaluar `developer` (H5) con la cascada de DET-32, contrastando allowlist sola vs allowlist + `isolation: worktree`, contra el mecanismo vigente de verificacion post-hoc del parent (HOR-130 S7) | REQ-IMPROVE-03 | architect | — | projects/horadric/tickets/HOR-131.md | veredicto build/reduce/drop con razon; entry `necessity-assessment` | N/A | DET-32, DET-11 | done | 4 |
| S4.T2 | Evaluar `scribe` (H6): prototipo de `hooks.PreToolUse` con matcher sobre Edit y Write, y guard de path en `.claude/agents/guards/` | REQ-IMPROVE-03 | developer | — | .claude/agents/dkc-scribe.md, .claude/agents/guards/ | el guard rechaza una ruta fuera de `projects/**` | rm de los archivos | DET-8, DET-10 | done | 4 |
| S4.T3 | Verificar el guard con una escritura prohibida real y confirmar que el hook **corrio** (workspace trust aceptado). Si el hook se saltea en silencio, el veredicto es `drop` y se documenta | REQ-IMPROVE-03 | tester | S4.T2 | — | TC6: rechazo con evidencia de que el hook ejecuto | N/A | DET-4, DET-33 | done | 4 |
| S4.T4 | **Ejecutar la consecuencia del veredicto**: por cada rol con veredicto `build`, escribir su definicion (`dkc-developer.md` y/o `dkc-scribe.md`) y sumarla al test de coherencia de S2.T5. El veredicto no cierra la session: el entregable si | REQ-IMPROVE-03 | developer | S4.T1, S4.T3 | .claude/agents/dkc-developer.md, .claude/agents/dkc-scribe.md, server/tests/test_agent_pack_contracts.py | TC4 sigue verde con los roles nuevos incluidos; cada rol `build` tiene su definicion cargando | rm de los archivos | DET-10, DET-11, DET-13 | done | 4 |
| S4.T5 | Prueba runtime de contencion para `developer` si su veredicto fue `build`, simetrica a la de `scribe` (TC6): pedirle escribir fuera del scope declarado y verificar que la palanca elegida lo impide de verdad (worktree aislado o guard). Un `build` sin esta prueba es papel | REQ-IMPROVE-03 | tester | S4.T4 | — | TC9 (NO MATERIALIZADO: el veredicto de developer fue reduce, asi que S4.T5 quedo deferred y este TC nunca se ejecuto. El id TC11 del ticket es otro caso, de S3): la escritura fuera de scope no ocurre, con evidencia de que la contencion actuo | N/A | DET-4, DET-13, DET-33 | done | 4 |
| S4.GATE | Veredicto por rol registrado con razon Y su consecuencia ejecutada: `build` con definicion escrita y **contencion probada en runtime** (TC6 para `scribe`, TC9 para `developer`), `reduce`/`drop` con la razon en `agent-tiers.md` de por que siguen inline teniendo el mecanismo disponible | REQ-IMPROVE-03 | reviewer | S4.T5 | — | entries `necessity-assessment` por rol; A4; ningun rol con veredicto `build` sin definicion en disco ni sin prueba runtime de su contencion | N/A | DET-13, DET-14, DET-32 | deferred | 4 |

### Session 5 — Host mapping y cierre documental [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Actualizar la tabla de host mapping de `agent-tiers.md` con lo que resulto, incluyendo el mapeo tier → `model`/`effort` que H3 habilita | REQ-IMPROVE-01, REQ-PRESERVE-01 | developer | — | prompts/agent-tiers.md | TC5: `active` y resolution order sin cambios | git revert | DET-16, DET-37 | done | 5 |
| S5.T2 | Documentar el pack en `docs/`: que es, como se deriva de `contracts.yaml`, la trampa del workspace trust y la del pool foreground/background | REQ-IMPROVE-02 | developer | S5.T1 | docs/ | seguir solo el doc alcanza para agregar un rol nuevo al pack | git revert | DET-16, DET-37 | done | 5 |
| S5.T3 | Promover los learns del ticket a rules del modulo `workflow` (los que sobrevivan al triage) y correr la suite completa | REQ-PRESERVE-01 | scribe | S5.T2 | projects/horadric/rules/workflow/, projects/horadric/tickets/HOR-131.md | A6 verde; learns procesados (DET-39) | git revert | DET-11, DET-39 | done | 5 |
| S5.GATE | Cierre: acceptance A1-A8 con evidencia, propagacion revisada, commits por session | REQ-PRESERVE-01, REQ-PRESERVE-02 | reviewer | S5.T3 | — | los 8 checkpoints con evidencia real | N/A | DET-13, DET-16, DET-27 | done | 5 |

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When to measure |
|--------|-------------------|--------|----------------|-----------------|
| Roles delegables con enforcement nativo | 2 de 7 (`researcher`, `architect`) | 5 de 7 minimo | tabla de host mapping | al cerrar S5 |
| Roles con restriccion sostenida por prompt | 3 (`reviewer`, `tester`, `smoke-runner`) | 0 | idem | al cerrar S3 |
| Incidentes de guard ignorado reproducibles | 1 conocido (JOR-059) | el mismo caso rechazado por el harness | TC3 con salida real | S3 |
