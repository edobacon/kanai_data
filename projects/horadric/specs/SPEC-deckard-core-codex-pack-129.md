---
id: SPEC-deckard-core-codex-pack-129
project: horadric
ticket: HOR-129
status: done
---

# DKC operable en Codex sin regresion en Claude Code

# DKC operable en Codex sin regresion en Claude Code

## Executive summary — lo que estas aprobando

### 1. Que se quiere

Que trabajar con DKC en Codex se sienta como trabajar con DKC en Claude Code. Hoy Codex tiene el MCP conectado y un `AGENTS.md` que explica el contrato, pero le falta lo mecanico: no hay skills que Codex descubra solo, el hook que mantiene el indice fresco no corre, la ficha de capabilities del KB dice que Codex no tiene subagentes (y si los tiene), y el catalogo de modelos no conoce ningun modelo de Codex.

Y hay algo mas urgente que todo eso: **los comandos `./commands/dkc-*` hoy no corren dentro de Codex, y la culpa es nuestra**. El `.codex/config.toml` del repo escribe `PATH = "...:${PATH}"`, Codex no interpola variables ahi, y el token `${PATH}` queda literal. Resultado: el sandbox arranca sin `/bin` ni `/usr/bin` y todo falla con `env: bash: No such file or directory`. `AGENTS.md` documenta eso como una limitacion de Codex y prescribe un workaround; en realidad es un bug de configuracion de una linea.

### 2. Decisiones criticas

| Decision | Racional |
|----------|----------|
| Arrancar por el fix del PATH, no por las skills | Sin PATH sano ninguna skill puede invocar un comando DKC. Es la base de todo lo demas, y cuesta una linea |
| Skills en `.agents/skills/` (repo-local), no en `~/.codex/skills` | Repo-local viaja con el repo, se versiona y se revisa como codigo. Verificado que Codex la discovera |
| Las skills orquestan, no reimplementan | Todo el contrato ya vive en `AGENTS.md`, `DECKARD.md` y los prompts. Una skill que copia reglas garantiza drift |
| Preferir agregar sobre modificar en superficies compartidas | `prompts/agent-tiers.md` y el script del hook los lee tambien Claude Code. Se agrega seccion `codex`; no se toca `active` ni el host mapping |
| El healthcheck no se construye aca | Es `dkc_install_check` de HOR-017, host-agnostico. Aca solo se documenta el smoke manual (DET-32: reuse) |

### 3. Riesgos principales y como los mitigamos

| Riesgo | Mitigacion concreta |
|--------|---------------------|
| Romper el hook que hoy funciona en Claude Code | El script no se toca. Solo cambia `.codex/hooks.json`, que Claude Code no lee. TC de regresion explicito editando un record desde Claude Code |
| Cambiar sin querer como se resuelven los tiers | Solo se agrega la seccion `codex` al catalogo. TC que inspecciona el diff y falla si toca `active`, `host_mapping` o el resolution order |
| Skills que se pisan entre si o se disparan mal | Descriptions con "cuando NO usarla" y verificacion con `codex debug prompt-input`, que muestra exactamente lo que Codex inyecta |
| Que el event name de `hooks.json` no sea el que creemos | Task dedicada que lo determina empiricamente en un dir temporal antes de escribir el archivo del repo |
| Escribir doc de instalacion que no funcione | El doc se valida ejecutando sus propios smoke tests, no leyendolo |

### 4. Que NO se hace

- **Empaquetar como plugin de Codex**: las skills todavia van a cambiar y el uso es repo-local. Ademas `plugin_hooks` esta `under development` en Codex, asi que un plugin hoy no podria traer el hook.
- **`dkc_install_check` / healthcheck como tool MCP**: es de HOR-017.
- **Tocar `prompts/steps/**` ni el catalogo de DETs**: si una skill necesita cambiar un workflow, es señal de que esta duplicando DKC.
- **Soporte de Cursor, opencode u otros hosts**: HOR-017.

### 5. Tamano estimado

8 sessions (eran 7; S2 se agrego durante execute con extension de alcance aprobada por el dev). S1 (PATH) y S6 (catalogo de modelos) son de minutos. Las mas riesgosas son **S3** (las 5 skills, donde el riesgo real es escribir demasiado y duplicar DKC) y **S8** (la regresion en Claude Code, que es la que protege lo que ya funciona). S4 y S5 dependen de un smoke en sesion Codex real: ver la pregunta abierta sobre autorizar `codex exec`.

### 6. Como vas a saber que funciona

- Abris Codex en `deckard`, escribis "dkc, retomemos" y arranca el flujo correcto sin que tengas que explicarle nada.
- Un comando `./commands/dkc-*` corre tal cual, sin prefijos de PATH.
- Editas un record y el indice queda fresco: HC no muestra estado viejo.
- Volves a Claude Code y todo funciona igual que antes, con evidencia registrada de que se probo.

## Purpose

Cerrar la brecha operativa de DKC en el host Codex (discovery de skills, enforcement de indice, capability de subagentes, catalogo de modelos, documentacion) partiendo de un fix de causa raiz en la configuracion del sandbox, y hacerlo de forma aditiva para que el host Claude Code no cambie de comportamiento. Consumidores: el dev trabajando en `deckard` desde cualquiera de los dos hosts.

## Analisis de mejora

### Estado actual

| Dimension | Estado hoy | Evidencia |
|-----------|-----------|-----------|
| MCP | conectado y funcional | `.codex/config.toml` con `DECKARD_ROOT` |
| Contrato de comportamiento | existe y es completo | `AGENTS.md`, 144 lineas |
| Comandos `./commands/dkc-*` | **no corren**: `env: bash: No such file or directory` | `codex sandbox macos` devuelve `PATH=...:${PATH}` sin interpolar |
| Comandos con `npx tsx` (6 de 39) | **no corren aunque el PATH este bien**: `listen EPERM` del socket IPC de tsx | descubierto en S1.T1; ver H9 del ticket |
| Skills | ninguna | `.agents/skills/` no existe |
| Hook de reindex | configurado pero inoperante | `.codex/hooks.json` con `$CLAUDE_PROJECT_DIR`, variable que Codex no define |
| Capability de subagentes en el KB | **incorrecta** | `prompts/agent-tiers.md:245` dice "No (single-context)"; `codex features list` dice `multi_agent stable true` |
| Catalogo de modelos | sin Codex, con modelos OpenAI viejos | `prompts/agent-tiers.md:58-65,91` (`gpt-4o-mini`, `gpt-4o`, `o3`) |
| Doc de instalacion Codex | no existe | `docs/` sin `codex-pack.md` |

### Problema

Cada sesion de Codex sobre `deckard` paga el mismo impuesto: los comandos fallan y hay que aplicar un workaround manual, el LLM tiene que recordar el entry point sin ayuda del host, el indice puede quedar stale sin que nada avise, y el KB le dice que no puede delegar cuando si puede (asi que degrada a inline sin necesidad).

### Estado deseado

Los 8 renglones de la tabla en verde, con la condicion de que el host Claude Code siga comportandose exactamente igual que antes, verificado con TCs y no por inspeccion visual.

### Alcance

**Se toca**: `.codex/config.toml`, `.codex/hooks.json`, `AGENTS.md`, `.agents/skills/**` (nuevo), `prompts/agent-tiers.md` (solo aditivo + 1 fila stale), `docs/codex-pack.md` (nuevo), y `commands/lib/**` + los 6 wrappers ex-tsx (extension de alcance aprobada por el dev el 2026-07-31, S2).

**No se toca**: `commands/hooks/reindex-on-record-edit.sh`, `.claude/settings.json`, `prompts/steps/**`, `prompts/deterministic-rules.md`, `server/src/**`, `DECKARD.md` (salvo puntero al doc nuevo).

### Complejidad

Media. Muchos archivos, cada uno con cambio chico. El riesgo no esta en la dificultad tecnica sino en la disciplina de no expandirse hacia el core.

## Requirements

### REQ-IMPROVE-01: PATH del sandbox resuelto en la causa raiz

> **Que cambia**: dentro de Codex podes escribir `./commands/dkc-reindex horadric` y corre. Hoy tenes que prefijarlo con una linea de PATH que nadie recuerda.
> **Por que**: el `${PATH}` sin interpolar del `.codex/config.toml` deja el sandbox sin `/bin`, y eso se documento como limitacion de Codex cuando era un bug propio.

El sistema MUST exponer al sandbox de Codex un `PATH` que resuelva `bash`, `sed`, `grep`, `find` y el node del proyecto, sin depender de interpolacion de variables. `AGENTS.md` MUST dejar de prescribir el reintento con PATH explicito como procedimiento normal.

Source_ref: ticket HOR-129 Triage H4 (evidencia con `codex sandbox macos`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: comando DKC bare dentro del sandbox
- **GIVEN** el repo `deckard` con `.codex/config.toml` corregido
- **WHEN** se ejecuta `codex sandbox macos -c 'sandbox_mode="workspace-write"' -- ./commands/dkc-reindex horadric`
- **THEN** el comando completa e imprime el resumen de reindex, sin `env: bash: No such file or directory`

#### Scenario: PATH ya interpolado
- **GIVEN** el mismo repo
- **WHEN** se ejecuta `codex sandbox macos -- /bin/sh -c 'echo $PATH'`
- **THEN** la salida no contiene el literal `${PATH}` y si contiene `/usr/bin` y `/bin`

</details>

### REQ-IMPROVE-02: skills DKC discoverables en Codex

> **Que cambia**: Codex ve las capacidades de DKC en su lista de skills y las usa sin que le expliques el flujo. Hoy depende de que el LLM se acuerde de leer `AGENTS.md`.
> **Por que**: sin discovery el entry point es un acto de fe; con skills el host lo ofrece.

El sistema MUST proveer skills repo-locales en `.agents/skills/` que cubran entry point general, consulta al KB, ejecucion de sessions/tasks, review y cierre. Cada skill MUST declarar `name` y `description` con criterio de cuando usarla y cuando no, MUST delegar el contrato a `AGENTS.md`/`DECKARD.md`/MCP/comandos, y MUST NOT reimplementar reglas de workflow ni DETs.

Source_ref: ticket HOR-129 Triage H1 (experimento con `codex debug prompt-input`); plan anexo, artefactos propuestos.

<details><summary>Scenarios de validacion</summary>

#### Scenario: Codex inyecta las skills
- **GIVEN** las skills escritas en `.agents/skills/`
- **WHEN** se ejecuta `codex debug prompt-input "hola"` desde `deckard`
- **THEN** el bloque `<skills_instructions>` lista cada skill DKC con su description y su path absoluto

#### Scenario: sin duplicacion de reglas
- **GIVEN** las skills escritas
- **WHEN** se busca en `.agents/skills/**` texto normativo de DETs o de steps
- **THEN** no hay reglas copiadas: solo punteros a `AGENTS.md`, `DECKARD.md`, tools MCP y `./commands/dkc-*`

</details>

### REQ-IMPROVE-03: indice fresco garantizado en Codex

> **Que cambia**: si editas un record de DKC desde Codex, el indice se actualiza solo y HC no te muestra estado viejo.
> **Por que**: hoy el hook esta configurado con una variable que Codex no define, asi que nunca corre y el guardarriel de DET-29 no existe en ese host.

El sistema MUST disparar `dkc-reindex {project}` tras un `Edit`/`Write` sobre `projects/{project}/{tickets|specs|rules|decisions|bugs}/*.md` en una sesion de Codex. El hook MUST resolver la ruta de su script sin `$CLAUDE_PROJECT_DIR`, y MUST usar el nombre de evento que el deserializador de Codex acepta, determinado empiricamente antes de escribirlo.

Source_ref: ticket HOR-129 Triage H2 y H8; DET-29; HOR-094.

<details><summary>Scenarios de validacion</summary>

#### Scenario: reindex tras editar un record desde Codex
- **GIVEN** una sesion de Codex en `deckard` con el hook configurado y confiado
- **WHEN** se edita `projects/horadric/tickets/HOR-129.md`
- **THEN** `projects/horadric/index.db` refleja el cambio sin reindex manual

#### Scenario: path fuera de DKC no dispara nada
- **GIVEN** el mismo hook
- **WHEN** se edita un archivo que no esta bajo `projects/*/{tickets|specs|rules|decisions|bugs}/`
- **THEN** el hook no ejecuta reindex y termina en silencio

</details>

### REQ-IMPROVE-04: capability real de Codex reflejada en el KB

> **Que cambia**: el KB deja de decir que Codex no puede delegar a subagentes. Puede, y con eso los gates que piden reviewer aislado o dual-judge dejan de degradar a inline sin motivo.
> **Por que**: una capability mal declarada hace que el sistema se auto-limite y registre `fallback-inline` con una razon falsa.

El sistema MUST corregir la fila de Codex en la tabla de multi-provider compatibility de `prompts/agent-tiers.md` para declarar soporte de sub-agentes, citando la evidencia y su fecha. La correccion MUST NOT alterar la tabla de host mapping de roles, el bloque `active` ni el resolution order.

Source_ref: ticket HOR-129 Triage H3 (`codex features list` → `multi_agent stable true`); `prompts/agent-tiers.md:245`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: fila corregida con evidencia
- **GIVEN** `prompts/agent-tiers.md` actualizado
- **WHEN** se lee la fila de ChatGPT Codex en multi-provider compatibility
- **THEN** declara soporte de sub-agentes con la evidencia (`codex features list`, `spawn_agent`) y la fecha de verificacion

#### Scenario: el resto de la resolucion intacta
- **GIVEN** el diff del archivo
- **WHEN** se inspecciona
- **THEN** `active`, `host_mapping` y el resolution order no tienen cambios

</details>

### REQ-IMPROVE-05: catalogo de modelos con seccion Codex

> **Que cambia**: los tiers pueden mapear a modelos de Codex reales en vez de a `gpt-4o`/`o3`, que ya no son lo que hay.
> **Por que**: el catalogo es la referencia que se consulta al configurar tiers; desactualizado manda a modelos inexistentes.

El sistema MUST agregar una seccion `codex` al catalogo de modelos de `prompts/agent-tiers.md` con los slugs verificados localmente y la fecha de observacion, y MUST documentar el fallback cuando el host no puede usar un provider. El cambio MUST NOT contradecir D-024 ni D-025 ni modificar el bloque `active`.

Source_ref: ticket HOR-129 Triage H5 (`~/.codex/models_cache.json`) y H6; `ONGOING.md:126,133`.

### REQ-IMPROVE-06: documentacion de instalacion y recuperacion

> **Que cambia**: hay un doc que te dice como instalar el pack, como verificar que quedo bien y que hacer cuando algo falla.
> **Por que**: sin eso el pack solo lo sabe operar quien lo escribio.

El sistema MUST proveer `docs/codex-pack.md` con instalacion repo-local, smoke tests ejecutables y troubleshooting de los modos de falla conocidos: MCP ausente, skill no detectada, hook sin trust, PATH del sandbox, reindex fallido.

Source_ref: plan anexo S6; ticket HOR-129 alcance.

### REQ-IMPROVE-07: los comandos de validacion y registro corren dentro del sandbox

> **Que cambia**: `dkc-validate`, `dkc-record-decision`, `dkc-resolve-kb`, `dkc-write`, `dkc-get-section` y `dkc-doctor` pasan a correr dentro del sandbox de Codex, sin escalar permisos ni pedirte aprobacion en cada gate.
> **Por que**: hoy fallan con `listen EPERM` porque `npx tsx` abre un socket IPC que el seatbelt rechaza, y son justo los comandos que cada gate necesita.

El sistema MUST ejecutar esos 6 comandos con `node` sobre los fuentes TypeScript, sin paso de build ni artefacto compilado. El codigo de `commands/lib/` MUST quedar con especificadores de import relativos en `.ts` y con los named imports de tipo marcados con `type`, y MUST NOT introducir sintaxis TypeScript no borrable (`enum`, `namespace`, decoradores, parameter properties).

Source_ref: ticket HOR-129 Triage H9; extension de `execute_scope` aprobada por el dev el 2026-07-31.

<details><summary>Scenarios de validacion</summary>

#### Scenario: validate dentro del sandbox
- **GIVEN** `commands/lib/` con los dos codemods aplicados y los wrappers invocando `node`
- **WHEN** se ejecuta `codex sandbox macos -c 'sandbox_mode="workspace-write"' -- ./commands/dkc-validate Ticket projects/horadric/tickets/HOR-129.md`
- **THEN** devuelve el JSON de validacion, sin `listen EPERM`

#### Scenario: tambien en sandbox read-only
- **GIVEN** lo mismo
- **WHEN** se ejecuta el mismo comando sin `sandbox_mode="workspace-write"`
- **THEN** devuelve el JSON igual (validar es solo lectura)

</details>

### REQ-PRESERVE-05: los validadores siguen dando el mismo resultado, y tsx sigue funcionando

> **Que cambia**: nada en lo que los validadores reportan. El codemod cambia como se ejecutan, no que verifican, y `npx tsx` sigue siendo una via valida.
> **Por que**: `commands/lib/` es la maquinaria que valida todos los records; un cambio de runtime que altere una sola salida invalidaria los gates de todo DKC.

El sistema MUST producir salidas identicas de los 17 kinds de validacion sobre el mismo set de records antes y despues del codemod. `npx tsx` MUST seguir ejecutando los mismos fuentes sin error (retrocompatibilidad, sin ventana de transicion).

Source_ref: ticket HOR-129 tabla de no-regresion; DET-7.

### REQ-PRESERVE-01: el hook de Claude Code sigue funcionando

> **Que cambia**: nada de lo que ya usas en Claude Code. El hook que reindexa al editar un record sigue igual, y eso se prueba, no se asume.
> **Por que**: el script del hook es compartido entre hosts y es el candidato mas facil de romper "arreglandolo para Codex".

El sistema MUST mantener `commands/hooks/reindex-on-record-edit.sh` y `.claude/settings.json` con el comportamiento actual. Editar un record desde Claude Code MUST seguir reindexando.

Source_ref: ticket HOR-129 tabla de no-regresion; HOR-094.

<details><summary>Scenarios de validacion</summary>

#### Scenario: regresion del hook en Claude Code
- **GIVEN** el pack instalado
- **WHEN** se edita un record de `projects/horadric/` desde una sesion de Claude Code
- **THEN** `dkc-reindex` corre y el indice queda fresco, igual que antes del pack

</details>

### REQ-PRESERVE-02: la resolucion de tiers y el host mapping no cambian

> **Que cambia**: la delegacion a agentes y la eleccion de modelo siguen resolviendo exactamente igual en Claude Code. Al catalogo se le suma informacion, no se le cambia la logica.
> **Por que**: `prompts/agent-tiers.md` lo leen todos los hosts; un cambio en `active` o en el host mapping altera el comportamiento de proyectos que no tienen nada que ver con Codex.

El sistema MUST preservar sin modificaciones el bloque `active`, la tabla de host mapping DKC role → host subagent y el resolution order de `prompts/agent-tiers.md`.

Source_ref: ticket HOR-129 tabla de no-regresion; HOR-029; D-024/D-025.

### REQ-PRESERVE-03: la suite del MCP server no empeora

El sistema MUST mantener el resultado de `pytest server/tests` sin fallos nuevos respecto del baseline registrado en el ticket (91 passed / 2 failed preexistentes por el condensado de DET-30, que se resuelve fuera de este ticket).

Source_ref: ticket HOR-129 seccion Regression.

### REQ-PRESERVE-04: los workflows y las DETs quedan intactos

El sistema MUST NOT modificar `prompts/steps/**`, `prompts/deterministic-rules.md` ni el catalogo de DETs. Las skills MUST limitarse a orquestar lo existente.

Source_ref: plan anexo principio 2; ticket HOR-129 alcance ("Fuera").

## Changes

### Modified: `.codex/config.toml`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `shell_environment_policy.set.PATH` | `"/Users/.../node/v22.22.2/bin:${PATH}"` | lista absoluta completa (node + homebrew + `/usr/bin` + `/bin` + `/usr/sbin` + `/sbin`) | Codex no interpola `${PATH}`; el token literal rompe el PATH del sandbox |

### Modified: `.codex/hooks.json`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| nombre de evento | `PostToolUse` (PascalCase de Claude) | la forma que acepta el deserializador de Codex, determinada en S4.T1 | los literales de config del binario son kebab-case |
| `command` | `$CLAUDE_PROJECT_DIR/commands/hooks/...` | ruta resuelta sin variables de Claude | Codex no define `CLAUDE_PROJECT_DIR` y `external_migration` esta apagado |

### Modified: `AGENTS.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| seccion "Compatibilidad shell en Codex" | prescribe reintentar con PATH explicito como procedimiento normal | nota breve de que el PATH se resuelve en `.codex/config.toml`, con el reintento como diagnostico de ultimo recurso | el workaround dejaba de ser necesario al arreglar la causa raiz |
| seccion "Subagentes DKC en Codex" | dice "si existe la tool `multi_agent_v1.spawn_agent`" | afirma que existe, con evidencia y fecha | la condicionalidad ya se resolvio |

### Modified: `prompts/agent-tiers.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| fila Codex de multi-provider compatibility (linea ~245) | "No (single-context por defecto) → fallback-inline" | soporte de sub-agentes con evidencia | la afirmacion quedo stale |
| catalogo de modelos | solo anthropic/openai/google/local, con `gpt-4o`/`o3` | seccion `codex` con los 6 slugs verificados + fecha | el catalogo es la referencia de configuracion |

### Added: `.agents/skills/{dkc,dkc-query,dkc-execute,dkc-review,dkc-close}/SKILL.md`

| Field | Value | Purpose |
|-------|-------|---------|
| `name` | slug de la skill | identidad en el listado de Codex |
| `description` | que hace + cuando usarla + cuando NO | evita solapamiento y activacion equivocada |
| cuerpo | punteros a `AGENTS.md`/`DECKARD.md`/tools MCP/comandos + fallback de PATH | orquestacion sin duplicar contrato |

### Added: `docs/codex-pack.md`

| Field | Value | Purpose |
|-------|-------|---------|
| Instalacion | pasos repo-local | que un tercero lo instale |
| Smoke tests | `codex features list`, `codex debug prompt-input`, `codex sandbox macos` | verificacion sin abrir sesion |
| Troubleshooting | MCP ausente, skill no detectada, hook sin trust, PATH, reindex fallido | recuperacion |

## Non-functional requirements

No hay NFRs de performance ni de escala: el cambio es de integracion y documentacion. La unica magnitud a cuidar es el **costo de contexto** de la inyeccion de skills, que Codex resuelve con progressive disclosure (solo `name`, `description` y path entran al prompt). Se controla manteniendo las descriptions en 1-2 lineas.

## Tasks

### Session 1 — Fix de causa raiz del PATH del sandbox [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Reemplazar `PATH` de `.codex/config.toml` por la lista absoluta completa (node del proyecto + homebrew + `/usr/bin` + `/bin` + `/usr/sbin` + `/sbin`), sin `${PATH}` | REQ-IMPROVE-01 | developer | — | .codex/config.toml | `codex sandbox macos -- /bin/sh -c 'echo $PATH'` sin literal `${PATH}` + `codex sandbox macos -c 'sandbox_mode="workspace-write"' -- ./commands/dkc-reindex horadric` completa | git revert | DET-4, DET-5, DET-8 | done | 1 |
| S1.T2 | Reescribir la seccion "Compatibilidad shell en Codex" de `AGENTS.md`: el PATH se resuelve en config; el reintento con PATH explicito queda como diagnostico de ultimo recurso, no como procedimiento | REQ-IMPROVE-01 | developer | S1.T1 | AGENTS.md | leer la seccion: no prescribe el prefijo como paso normal; conserva el diagnostico | git revert | DET-16, DET-37 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T1)** — persistir en `## Sessions`, correr los 2 comandos de validacion reales, verificar que Claude Code sigue igual, decidir continue/iterate | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + evidencia de los comandos + decision | (no aplica) | DET-13, DET-20, DET-23, DET-33 | done | 1 |

### Session 2 — Comandos de validacion ejecutables dentro del sandbox [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Codemod 1: reescribir los especificadores de imports relativos de `.js` a `.ts` en `commands/lib/**` (66 ocurrencias, 21 archivos). Node no mapea `.js`→`.ts` como hace tsx | REQ-IMPROVE-07 | developer | — | commands/lib/**/*.ts | cero `from './x.js'` relativos; `npx tsx validate.ts` sigue verde (retrocompat) | git revert | DET-5, DET-8, DET-16 | done | 2 |
| S2.T2 | Codemod 2: marcar con `type` los named imports que son solo tipos (`ParsedSessionBlock`, `InteractiveStepId`, `ParsedDirective`; 4 ocurrencias en 3 archivos). Node borra tipos pero no adivina cuales lo son | REQ-IMPROVE-07 | developer | S2.T1 | commands/lib/validate.ts, commands/lib/round-trip-test.ts, commands/lib/schemas/directive.ts | `node validate.ts` corre sin `SyntaxError: does not provide an export named` | git revert | DET-5, DET-8 | done | 2 |
| S2.T3 | Cambiar la invocacion de los 6 wrappers de `npx tsx X.ts` a `node X.ts` | REQ-IMPROVE-07 | developer | S2.T2 | commands/dkc-validate, commands/dkc-record-decision, commands/dkc-resolve-kb, commands/dkc-write, commands/dkc-get-section, commands/dkc-doctor | los 6 corren fuera y dentro del sandbox (`codex sandbox macos`, ambos modos) | git revert | DET-5, DET-8, DET-16 | done | 2 |
| S2.T4 | Regresion de los validadores: correr los 17 kinds sobre un set de records existentes ANTES y DESPUES, y diffear las salidas JSON. Cero diferencias | REQ-PRESERVE-05 | tester | S2.T3 | (ninguno: verificacion) | diff vacio entre las salidas pre y post codemod | N/A | DET-7, DET-13, DET-33 | done | 2 |
| S2.T5 | Lints de invariantes en `dkc-doctor`: (a) sin especificadores relativos `.js`, (b) sin named imports de tipo sin marcador, (c) sin sintaxis no borrable (`enum`/`namespace`/decoradores). Los 3 con grep, milisegundos | REQ-PRESERVE-05 | developer | S2.T4 | commands/dkc-doctor | introducir a proposito cada violacion hace fallar el lint | git revert | DET-7, DET-16, DET-37 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, evidencia de los 6 comandos en el sandbox + diff vacio de la regresion, decidir | — | reviewer | S2.T4, S2.T5 | ticket | gate persistido + salidas reales; sin lo cual S3 no puede escribir skills que validen | (no aplica) | DET-13, DET-20, DET-23, DET-33 | done | 2 |

### Session 3 — Skills DKC repo-locales [tipo: auto] [tier: T2]

parallel_groups: [[S3.T2, S3.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Skill entry point `dkc`: clasificar intencion y arrancar el flujo via `dkc_status` → `dkc_get_workflow`. Define la forma comun (frontmatter, punteros, fallback de PATH) que reusan las demas | REQ-IMPROVE-02 | developer | S1.GATE | .agents/skills/dkc/SKILL.md | `codex debug prompt-input` lista la skill; el cuerpo no copia reglas | rm del directorio | DET-11, DET-32, DET-37 | done | 3 |
| S3.T2 | Skills de lectura: `dkc-query` (consulta KB-first sin ticket) y `dkc-close` (cierre con acceptance, learns y reindex; el close siempre pregunta, DET-30) | REQ-IMPROVE-02 | developer | S3.T1 | .agents/skills/dkc-query/SKILL.md, .agents/skills/dkc-close/SKILL.md | `codex debug prompt-input` las lista; descriptions sin solape con `dkc` | rm de los directorios | DET-11, DET-30, DET-32 | done | 3 |
| S3.T3 | Skills de ejecucion: `dkc-execute` (sessions/tasks via `dkc-execute-task`, DET-29) y `dkc-review` (reviewer/tester/judges aislados con `spawn_agent`, `fork_context: false`) | REQ-IMPROVE-02 | developer | S3.T1 | .agents/skills/dkc-execute/SKILL.md, .agents/skills/dkc-review/SKILL.md | `codex debug prompt-input` las lista; el handoff referencia el de `AGENTS.md`, no uno nuevo | rm de los directorios | DET-29, DET-33, DET-34, DET-35 | done | 3 |
| S3.T4 | Verificar el set completo: sin solapamiento de descriptions, cero duplicacion de reglas (grep de texto normativo), y que las 5 aparezcan inyectadas | REQ-IMPROVE-02, REQ-PRESERVE-04 | reviewer | S3.T2, S3.T3 | .agents/skills/ | `codex debug prompt-input` muestra las 5; grep sin reglas copiadas | ajustar descriptions | DET-13, DET-33 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir, evidencia de inyeccion real, decidir | — | reviewer | S3.T4 | ticket | gate persistido + salida de `prompt-input` como evidencia | (no aplica) | DET-13, DET-20, DET-23, DET-33 | done | 3 |

### Session 4 — Hook de reindex operativo en Codex [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Determinar empiricamente la forma de evento que acepta el deserializador de `hooks.json` (kebab `post-tool-use` vs Pascal `PostToolUse`) usando un hook de prueba en dir temporal, sin tocar el repo | REQ-IMPROVE-03 | researcher | — | (ninguno: experimento en dir temporal) | el hook de prueba dispara y deja rastro observable | N/A (solo lectura del repo) | DET-1, DET-4, DET-5 | done | 4 |
| S4.T2 | Corregir `.codex/hooks.json`: nombre de evento segun S4.T1 + `command` sin `$CLAUDE_PROJECT_DIR`. El script compartido NO se toca | REQ-IMPROVE-03, REQ-PRESERVE-01 | developer | S4.T1 | .codex/hooks.json | editar un record desde Codex deja el indice fresco | git revert | DET-8, DET-16, DET-29 | done | 4 |
| S4.T3 | Regresion del hook en Claude Code: editar un record y confirmar que `dkc-reindex` corre como antes | REQ-PRESERVE-01 | tester | S4.T2 | (ninguno: verificacion) | indice fresco tras Edit desde Claude Code, con evidencia | N/A | DET-7, DET-13, DET-33 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** — persistir, evidencia de ambos hosts, decidir | — | reviewer | S4.T2, S4.T3 | ticket | gate persistido + evidencia de reindex en Codex y en Claude Code | (no aplica) | DET-13, DET-20, DET-23, DET-33 | done | 4 |

### Session 5 — Puente de subagentes y capability del KB [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Probar `spawn_agent` con una tarea read-only pequeña en sesion Codex real y registrar el output `approve/iterate/escalate`. Si el dev no autoriza consumo de credito, registrar `blocked` con la evidencia estatica ya disponible | REQ-IMPROVE-04 | tester | — | (ninguno: verificacion) | output estructurado del subagente, o `blocked` auditado | N/A | DET-1, DET-13, DET-33 | done | 5 |
| S5.T2 | Corregir la fila de Codex en multi-provider compatibility de `prompts/agent-tiers.md` con evidencia y fecha. Solo esa fila | REQ-IMPROVE-04, REQ-PRESERVE-02 | developer | S5.T1 | prompts/agent-tiers.md | diff toca solo la fila; `active`/`host_mapping`/resolution order intactos | git revert | DET-4, DET-16 | done | 5 |
| S5.T3 | Evaluar `agent_roles` + `max_threads`/`max_depth`/`job_max_runtime_seconds` de Codex como punto de integracion de los roles DKC, y registrar veredicto `necessity-assessment` (reuse vs build vs drop) sin implementar | REQ-IMPROVE-04 | architect | S5.T1 | (ninguno: decision) | entry `necessity-assessment` registrada con razon | N/A | DET-32, DET-11 | done | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2)** — persistir, decision de `agent_roles` registrada, decidir | — | reviewer | S5.T2, S5.T3 | ticket | gate persistido + entries observables | (no aplica) | DET-13, DET-20, DET-23 | done | 5 |

### Session 6 — Catalogo de modelos con seccion Codex [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Agregar seccion `codex` al catalogo de modelos con los 6 slugs verificados + fecha de observacion + fallback por host. Actualizar los ejemplos que citan `gpt-4o`/`o3` como si fueran actuales | REQ-IMPROVE-05 | developer | — | prompts/agent-tiers.md | seccion presente con fecha; sin contradecir D-024/D-025 | git revert | DET-4, DET-16 | done | 6 |
| S6.T2 | Verificar por diff que `active`, `host_mapping` y el resolution order no cambiaron | REQ-PRESERVE-02 | reviewer | S6.T1 | (ninguno: verificacion) | `git diff` sin cambios en esos bloques | N/A | DET-7, DET-13 | done | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T1)** — persistir, diff verificado, decidir | — | reviewer | S6.T1, S6.T2 | ticket | gate persistido + diff como evidencia | (no aplica) | DET-13, DET-20, DET-23 | done | 6 |

### Session 7 — Documentacion del pack [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S7.T1 | Escribir `docs/codex-pack.md`: instalacion repo-local, smoke tests (`features list`, `debug prompt-input`, `sandbox macos`), troubleshooting de los 5 modos de falla | REQ-IMPROVE-06 | developer | S6.GATE | docs/codex-pack.md | ejecutar los smoke tests del doc siguiendo solo el doc | rm del archivo | DET-37 | done | 7 |
| S7.T2 | Revisar docs que el pack deja stale: `DECKARD.md` (puntero al doc nuevo), `INSTALL.md` (seccion Codex) y `AGENTS.md` (coherencia final). Solo lo que el cambio invalida | REQ-IMPROVE-06 | developer | S7.T1 | DECKARD.md, INSTALL.md | ninguna doc contradice el estado post-pack | git revert | DET-16, DET-37 | done | 7 |
| **S7.GATE** | **Gate de sync Session 7 (tier: T1)** — persistir, smoke del doc ejecutado, decidir | — | reviewer | S7.T1, S7.T2 | ticket | gate persistido + salida de los smoke tests | (no aplica) | DET-13, DET-20, DET-23 | done | 7 |

### Session 8 — Verificacion end-to-end y regresion en Claude Code [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S8.T1 | Smoke e2e en sesion Codex limpia sobre `deckard`: skills visibles, entry point que arranca el flujo correcto, comando DKC bare, edicion de record con reindex | REQ-IMPROVE-01..06 | tester | S7.GATE | (ninguno: verificacion) | TC1, TC2, TC3 del ticket en verde con evidencia runtime | N/A | DET-13, DET-33, DET-36 | done | 8 |
| S8.T2 | Regresion completa en Claude Code: hook, resolucion de tiers por diff, y `pytest server/tests` contra el baseline (sin fallos nuevos) | REQ-PRESERVE-01, REQ-PRESERVE-02, REQ-PRESERVE-03 | tester | S7.GATE | (ninguno: verificacion) | TC4, TC5, TC6 del ticket en verde con salida real | N/A | DET-7, DET-13, DET-33 | done | 8 |
| **S8.GATE** | **Gate final (tier: T2)** — persistir, acceptance checkpoints ejecutados, dejar listo para close (que siempre pregunta, DET-30) | — | reviewer | S8.T1, S8.T2 | ticket | acceptance con evidencia real, no "parece funcionar" | (no aplica) | DET-13, DET-20, DET-23, DET-30, DET-33 | done | 8 |

## Constraints

- **DET-29**: las transiciones de session/task van por `dkc-execute-task`, no por Edit libre del frontmatter.
- **DET-30**: el close del ticket siempre pregunta, incluso en `super`. Las skills que documenten el cierre deben reflejarlo.
- **DET-32**: el healthcheck de Codex es reuse de `dkc_install_check` (HOR-017), no build aca.
- **DET-34**: el handoff a subagentes inyecta `kb_refs` resueltos; la skill `dkc-review` referencia ese contrato, no lo redefine.
- **D-024 / D-025** (`ONGOING.md:133,126`): los tiers se mapean por provider de forma independiente y DKC debe seguir siendo LLM-agnostico. La seccion `codex` se agrega sin volver el catalogo Codex-first.
- **HOR-029**: la tabla de host mapping DKC role → host subagent es la fuente de la resolucion de roles; este spec no la altera.
- **Frontera con HOR-017**: manifest, `dkc_route`, contratos de agentes y otros hosts quedan alla (ver seccion de frontera en el ticket).

## Gate de necesidad/reuso (DET-32)

| Item nuevo | Veredicto | Razon |
|-----------|-----------|-------|
| 5 skills en `.agents/skills/` | **build** | No existe superficie de discovery para Codex. Se construyen como orquestadoras minimas, no como copias del contrato |
| `docs/codex-pack.md` | **build** | No hay doc de instalacion para este host; `INSTALL.md` no lo cubre |
| Healthcheck de Codex (B2 del plan) | **reuse** | Es `dkc_install_check(host_mode)` de HOR-017. Aca solo se documenta el smoke manual |
| Fix del PATH | **reduce** | No hace falta artefacto nuevo: es una linea de `.codex/config.toml`. El workaround de `AGENTS.md` se retira en vez de mantenerse |
| Puente de subagentes | **reuse** | `AGENTS.md` ya lo documenta completo. Solo se valida y se corrige la capability stale |
| Schema de handoff para subagentes | **drop** | Ya existe (`dkc:agent-invocation` + `AGENTS.md`). Uno nuevo dentro de una skill seria drift |
| Wrapper `sync-to-codex.sh` | **drop** | Con skills repo-local no hay nada que sincronizar. Queda en backlog si el mantenimiento manual duele |

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| CLI de Codex (`/Applications/Codex.app/Contents/Resources/codex`) | external | Provee `features list`, `debug prompt-input`, `sandbox macos`, que son los verificadores del pack | Si cambia de ruta o de flags, las validaciones del spec necesitan ajuste. Mitigacion: el doc registra la ruta y una alternativa |
| MCP `deckard-cain` en Codex | internal | Entry point de todo el flujo | Ya configurado y verificado |
| Sesion Codex real con credito | external | Solo para el smoke de `spawn_agent` (S5.T1) y el e2e (S8.T1) | Pregunta abierta: autorizar consumo. Si no, esas tasks quedan `blocked` auditadas |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresion silenciosa en Claude Code al tocar superficie compartida | medium | alto: se rompe lo que ya funciona | El script del hook no se toca; solo `.codex/*`. S4.T3 y S8.T2 son TCs de regresion explicitos |
| Las skills crecen y absorben reglas del core (drift) | high | medio: dos fuentes de verdad | S3.T4 hace grep de texto normativo y falla si aparece. Descriptions y cuerpos acotados a punteros |
| El event name elegido no es el que acepta Codex | medium | medio: hook silenciosamente muerto | S4.T1 lo determina empiricamente antes de escribir el repo |
| El smoke real no se puede correr (sin autorizacion de credito) | medium | bajo: quedan 2 tasks sin evidencia runtime | Registrar `blocked` con la evidencia estatica y el procedimiento exacto para que el dev lo corra en 2 minutos |
| Tocar `prompts/agent-tiers.md` altera la resolucion sin querer | low | alto: cambia la delegacion en todos los hosts | S6.T2 verifica por diff que `active`/`host_mapping`/resolution order no cambiaron |
| Los slugs de modelos de Codex cambian | medium | bajo: catalogo desactualizado otra vez | Se documentan como "observados localmente" con fecha y fuente (`~/.codex/models_cache.json`) |

## Open questions

1. **¿Se autoriza consumo de credito de Codex para los smokes?** S5.T1 y S8.T1 necesitan una sesion real (`codex exec` o interactiva). Sin eso quedan `blocked` con evidencia estatica y receta para que el dev los corra. No bloquea S1, S2, S3, S5 ni S6.
2. **¿`.agents/skills/` o `.codex/skills/`?** Ambas funcionan (verificado). `.agents/` parece el estandar cross-host emergente y `.codex/` es el especifico del host. El spec asume `.agents/skills/`; se puede revisar en S3.T1.

## Decisions

### DEC-LOCAL-01: fix de causa raiz del PATH en vez de mantener el workaround
- **Contexto**: `AGENTS.md` prescribia reintentar los comandos con PATH explicito, atribuyendo la falla al sandbox de Codex.
- **Drivers**: la medicion mostro que la falla la causa el `${PATH}` sin interpolar del propio `.codex/config.toml`; el workaround cuesta friccion en cada sesion y esconde el bug.
- **Opcion elegida**: corregir la config y degradar el workaround a diagnostico de ultimo recurso.
- **Alternativas**: (a) dejar el workaround y documentarlo mejor, descartada porque perpetua el impuesto; (b) inyectar PATH desde cada skill, descartada porque replica el parche en 5 lugares.
- **Consecuencias**: gana ergonomia y honestidad del KB; pierde nada. Reversible con `git revert`.
- **Session**: 1

### DEC-LOCAL-02: skills como orquestadoras, con el contrato en AGENTS.md
- **Contexto**: las skills podrian ser autosuficientes (copiar el flujo) o punteros al contrato existente.
- **Drivers**: DKC ya tiene el contrato canonico; duplicarlo genera drift garantizado (principio 2 del plan anexo y DET-11).
- **Opcion elegida**: skills minimas que resuelven "cuando entrar" y delegan el "como" a `AGENTS.md`/`DECKARD.md`/MCP/comandos.
- **Alternativas**: skills autosuficientes, descartadas por costo de mantenimiento y riesgo de divergencia.
- **Consecuencias**: skills mas cortas y baratas de mantener; dependen de que `AGENTS.md` siga siendo bueno.
- **Session**: 2

## Acceptance checkpoints

- [ ] **Funcional**: los scenarios de REQ-IMPROVE-01 a 06 pasan con evidencia real
- [ ] **Regresion**: REQ-PRESERVE-01 a 04 verificados (hook de Claude Code, diff de tiers, pytest sin fallos nuevos, cero cambios en `prompts/steps/**`)
- [ ] **Tests**: TC1-TC6 del ticket con Actual + Evidence llenos, no diferidos al cierre (DET-25)
- [ ] **Rules**: DET-29/DET-30/DET-32/DET-34 respetadas en lo que las skills documentan
- [ ] **Docs**: `docs/codex-pack.md` existe y sus smoke tests corren; `DECKARD.md`/`INSTALL.md`/`AGENTS.md` sin contradicciones
- [ ] **Frontera**: nada de lo entregado pisa el alcance declarado de HOR-017

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When to measure |
|--------|-------------------|--------|----------------|-----------------|
| Comandos DKC ejecutables en Codex sin prefijo | 0 (falla con `env: bash`) | 100% | `codex sandbox macos -- ./commands/dkc-<cmd>` | S1.GATE |
| Skills DKC visibles en Codex | 0 | 5 | `codex debug prompt-input` | S3.GATE |
| Records editados en Codex con indice fresco | 0% (hook inoperante) | 100% | editar record + inspeccionar `index.db` | S4.GATE |
| Afirmaciones stale sobre Codex en el KB | 2 (`agent-tiers.md:245`, catalogo de modelos) | 0 | lectura del archivo | S6.GATE |
| Fallos nuevos en `pytest server/tests` | 0 (baseline 91/2) | 0 | `pytest server/tests -q` | S8.GATE |
