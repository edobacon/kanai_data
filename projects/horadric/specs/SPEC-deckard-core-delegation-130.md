---
id: SPEC-deckard-core-delegation-130
project: horadric
ticket: HOR-130
status: done
---

# Delegacion multi-modelo con fallback a Claude y contrato de host unico

# Delegacion multi-modelo con fallback a Claude y contrato de host unico

## Executive summary — lo que estas aprobando

### 1. Que se quiere

Hoy DKC solo sabe delegar a los sub-agentes del host donde corre. En Claude Code eso significa Anthropic para todo, con dos limitaciones concretas: `reviewer` y `tester` se mapean a `general-purpose` y sus restricciones se sostienen **por prompt** (fragil, asi lo dice el propio `agent-tiers.md`), y `developer`/`scribe` quedan inline por ese mismo motivo. Ademas, en el dual-judge de DET-35 los dos jueces son del mismo proveedor, asi que comparten puntos ciegos.

HOR-129 dejo probado que Codex puede correr roles DKC. Lo que falta es el canal: un comando que delegue un rol a Codex eligiendo modelo por tier, con contrato de salida verificable, que se active con un trigger como el super autopilot, que avise y degrade a un agente Claude cuando Codex falle o agote su cupo, y un validador que detecte cuando el mapeo de modelos se rompe.

Y hay algo urgente antes de todo eso: **el mapeo de modelos que el KB tiene hoy no funciona**. `prompts/agent-tiers.md` manda `balanced` a `gpt-5.6-terra` y `reasoning` a `gpt-5.6-sol`, y este CLI no puede usar ninguno de los dos (`400: requires a newer version of Codex`). Cualquier delegacion por tier fallaria en el primer intento.

### 2. Decisiones criticas

| Decision | Racional |
|----------|----------|
| Arrancar por el mapeo y su validador, no por el comando | Un canal que resuelve a un modelo inexistente no sirve, y el fix cuesta minutos. Ya se rompio una vez en un dia |
| El fallback va ANTES de la activacion (S4 antes de S5) | Sin fallback, la primera falla de quota deja un gate colgado. Encender el canal sin red es peor que no encenderlo |
| Fallback reactivo, no preventivo | No hay forma verificada de consultar el cupo de Codex antes de delegar. La resiliencia se construye en el manejo del fallo |
| El canal es opt-in y no crea ninguna DET | Delegar es una capacidad, no una obligacion. Sin flag, DKC se comporta exactamente como hoy |
| El handoff se reusa, no se redefine | El fence `dkc:agent-invocation` + `prompts/agents/*.md` + `dkc-resolve-kb` ya son el contrato. Un handoff propio dentro del comando seria drift garantizado |
| El manifest (fase D) arranca por paridad | Es refactor de fuente de verdad para todos los hosts: si no reproduce lo actual, rompe Claude Code y Codex a la vez |

### 3. Riesgos principales y como los mitigamos

| Riesgo | Mitigacion concreta |
|--------|---------------------|
| Costo descontrolado (cada delegacion es una sesion real de ChatGPT) | Tope por session con el `usage` que el propio stream reporta, default off, y solo tiers T2/T3. S6 no es opcional |
| El error de quota no tiene forma verificable | Matcher defensivo: cualquier fallo degrada a Claude; el patron de mensaje solo decide si reintentar |
| Romper el routing de todos los hosts en la fase D | Paridad antes de cambio: el manifest debe reproducir los 13 intents actuales con diff vacio |
| Que los slugs cambien otra vez | El validador es entregable de S1 y corre en los gates, no una tarea de cierre |
| Que el ticket se disperse (13 sessions) | Frontera de corte declarada despues de S6: A-C sirven solas |

### 4. Que NO se hace

- **`dkc_next_action` y el runtime persistente** de la fase 4 de HOR-017: backlog.
- **Otros hosts** (opencode, Cursor, Gemini): se deja el backend abstraible, pero no se abstrae con un solo consumidor real.
- **Ninguna DET nueva**: si algo pide una DET, es senal de que el canal esta imponiendose en vez de ofrecerse.
- **`scribe` delegado**: escribe el registro canonico y Codex no tiene hooks (`BUG-codex-hooks-sin-via-declaracion-001`).

### 5. Tamano estimado

13 sessions en 6 fases. S1 es de minutos. Las mas riesgosas son **S3/S4** (el canal y su red) y **S8** (el manifest, que toca el routing de todos los hosts). S3, S4, S7 y S8 necesitan corridas reales de Codex con consumo de credito, ya autorizado por el dev para los smokes de este ticket.

### 6. Como vas a saber que funciona

- Escribis "delega a codex" en un ticket y el reviewer del gate corre con un modelo de OpenAI, con veredicto valido y trazado.
- Si Codex se cae o se queda sin cupo, el mismo rol se ejecuta con Claude, te avisa, y queda registrado por que.
- `dkc-model-map-check` te dice en un segundo si el mapeo sigue siendo valido.
- Un ticket sin el flag se comporta igual que hoy, y eso esta probado, no supuesto.

## Purpose

Convertir la delegacion cross-provider en un canal de primera clase del workflow de DKC: eleccion de modelo por tier con mapeo validado, enforcement de capabilities por sandbox del host destino, contrato de salida verificable por schema, activacion opt-in por trigger/flag/config, y degradacion automatica al host local cuando el externo falla. Absorbe el alcance de portabilidad de HOR-017 (manifest como fuente unica, `dkc_route`, `dkc_capabilities`, `dkc_install_check`, contratos de rol) porque el canal de delegacion es su primer consumidor real. Consumidores: el dev trabajando en cualquier proyecto DKC desde Claude Code o Codex.

## Analisis de mejora

### Estado actual

| Dimension | Estado hoy | Evidencia |
|-----------|-----------|-----------|
| Delegacion cross-provider desde Claude Code | **no existe** como canal; solo `codex exec` a mano en corridas puntuales | HOR-129 S4/S5/S8 (autorizadas caso por caso) |
| Mapeo tier → modelo de Codex | **roto**: `balanced` y `reasoning` apuntan a slugs no usables | `agent-tiers.md:94,105-109` vs `codex debug models`; `400 requires a newer version` |
| Validacion del mapeo | ninguna | no hay comando que lo chequee |
| Enforcement de capabilities de un rol delegado | **por prompt** para reviewer/tester; inline para developer/scribe | `agent-tiers.md` host mapping, columna "Restrictions enforcement" |
| Contrato de salida de los roles | prosa en `prompts/agents/*.md`, sin schema ejecutable | ningun JSON Schema en el repo |
| Comportamiento ante quota agotada | indefinido | nada lo contempla |
| Fuente unica de intents/workflows | **no existe**; drift reproducible | `dkc_get_workflow("quick")` → `"Intencion 'quick' no reconocida"`; `INSTALL.md` lista 3 de 7 |
| Tools de portabilidad de HOR-017 | **ausentes** | 41 tools registradas, ninguna de las 4 |

### Problema

El sistema se auto-limita a un proveedor y sostiene las restricciones de rol con prompts. Eso tiene tres costos concretos: los jueces del dual-judge comparten familia de modelo (y por lo tanto puntos ciegos), los roles que escriben no se pueden delegar con garantia, y no hay forma de usar un modelo distinto cuando conviene. Encima, el unico mapeo de modelos externos que existe apunta a modelos que no se pueden invocar.

### Estado deseado

Los 8 renglones de la tabla en verde, con la condicion de que un ticket **sin** el flag de delegacion se comporte exactamente como hoy, verificado con TCs y no por inspeccion.

### Alcance

**Se toca**: `commands/dkc-delegate` y `commands/dkc-model-map-check` (nuevos), `commands/lib/**` (schemas de rol + enum de `agent-invocation`), `prompts/agent-tiers.md`, `prompts/steps/request-intake.md` (tabla de triggers), `prompts/steps/request-execute/**` (lectura del flag), `projects/{project}/config.yaml` (bloque `delegation:`), `server/src/deckard_cain/**` (manifest + tools de portabilidad), `commands/dkc.md`, `INSTALL.md`, `DECKARD.md`, `docs/`.

**No se toca**: `prompts/deterministic-rules.md`, `dets_catalog.py`, `.claude/settings.json`, `commands/hooks/**`, y las skills de HOR-129 salvo puntero.

### Complejidad

Alta, pero por amplitud y no por dificultad puntual. El riesgo real es de alcance (13 sessions con dos naturalezas distintas: canal de delegacion y refactor del routing) y de regresion en superficies compartidas.

## Requirements

### REQ-IMPROVE-01: el mapeo tier → modelo de Codex resuelve a modelos usables

> **Que cambia**: pedir `tier: balanced` en Codex invoca un modelo que existe. Hoy invoca `gpt-5.6-terra`, que este CLI rechaza.
> **Por que**: un mapeo que no resuelve convierte cada delegacion en un error de 400 antes de empezar.

El sistema MUST mapear los 3 tiers del proveedor `openai-codex` a slugs presentes en el catalogo local del CLI (`fast=gpt-5.4-mini`, `balanced=gpt-5.4`, `reasoning=gpt-5.5`), con fecha de observacion y fuente citada. El cambio MUST NOT alterar el bloque `active`, la tabla de host mapping ni el resolution order.

Source_ref: ticket HOR-130 Triage H3; `HOR-130.evidence/EVIDENCIA-delegacion-codex.md` E2/E4.

<details><summary>Scenarios de validacion</summary>

#### Scenario: los 3 tiers resuelven
- **GIVEN** el mapeo corregido
- **WHEN** se comparan sus 3 slugs con la salida de `codex debug models`
- **THEN** los 3 estan presentes con `visibility: list`

#### Scenario: el resto del catalogo intacto
- **GIVEN** el diff de `prompts/agent-tiers.md`
- **WHEN** se inspecciona
- **THEN** `active`, `host_mapping` y el resolution order no tienen cambios

</details>

### REQ-IMPROVE-02: el drift del mapeo se detecta con un comando

> **Que cambia**: hay un comando que te dice si el mapeo sigue siendo valido, en lugar de descubrirlo cuando una delegacion falla.
> **Por que**: los slugs cambian sin aviso y ya se rompio una vez en menos de un dia.

El sistema MUST proveer `commands/dkc-model-map-check` que compare el mapeo declarado del proveedor externo contra el catalogo **usable localmente** y retorne `0` sin drift, `2` con drift (warn, nombrando tier y slug), `3` ante error de entorno. MUST NOT consultar un catalogo remoto como fuente de verdad: un slug puede existir server-side y no ser invocable por el CLI instalado.

Source_ref: ticket HOR-130 Triage H3 y L2; prototipo `HOR-130.evidence/proto-model-map-check.py`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: verde tras el fix
- **GIVEN** el mapeo de REQ-IMPROVE-01
- **WHEN** se corre `./commands/dkc-model-map-check`
- **THEN** exit 0 y lista los slugs usables

#### Scenario: warn con slug roto
- **GIVEN** un tier apuntando a proposito a un slug inexistente
- **WHEN** se corre el comando
- **THEN** exit 2, y el mensaje nombra el tier y el slug

</details>

### REQ-IMPROVE-03: los roles DKC tienen contrato de salida ejecutable

> **Que cambia**: el veredicto de un rol delegado se valida por schema, no por buena fe del modelo.
> **Por que**: hoy el contrato es prosa en `prompts/agents/*.md`, y un output mal formado solo se descubre al parsearlo.

El sistema MUST proveer un JSON Schema por rol delegable **que tenga contrato de salida estructurado documentado** (`reviewer`, `tester`, `researcher`) en modo **strict** (toda property en `required`; lo opcional como union con `null`). Los schemas MUST derivar del output schema ya descrito en `prompts/agents/*.md` y MUST NOT introducir campos que el contrato de rol no tenga.

`architect` queda **fuera**: su bloque Output (`prompts/agents/architect.md:58-61`) declara que produce specs y decisions **como archivos markdown**, no un JSON. Darle un schema exigiria inventarle campos, que es justo lo que este REQ prohibe. Consecuencia operativa para el canal: un `architect` delegado a un sandbox read-only no puede escribir su entregable, asi que no es un rol delegable por ahora (queda en backlog, no en alcance).

Source_ref: ticket HOR-130 Triage H6 y F1 (fallo real `invalid_json_schema`); `prompts/agents/architect.md:58-61` (medido en S2.T2).

<details><summary>Scenarios de validacion</summary>

#### Scenario: los 3 schemas son aceptados
- **GIVEN** los 3 schemas escritos
- **WHEN** se invoca cada uno con `--output-schema` en una corrida real
- **THEN** ninguno es rechazado con `invalid_json_schema`

#### Scenario: architect no recibe schema inventado
- **GIVEN** que `prompts/agents/architect.md` no declara output JSON
- **WHEN** se busca `commands/lib/schemas/roles/architect.json`
- **THEN** no existe, y el spec documenta por que

</details>

### REQ-IMPROVE-04: delegar un rol a Codex es un comando

> **Que cambia**: `./commands/dkc-delegate --role reviewer --tier balanced --ticket HOR-130` corre el rol en Codex y devuelve su veredicto.
> **Por que**: hoy hay que armar a mano el `codex exec`, el schema, el sandbox y el registro.

El sistema MUST proveer `commands/dkc-delegate` que resuelva rol → sandbox (`read-only` para roles de lectura, `workspace-write` acotado para `developer`), tier → modelo del proveedor declarado, construya el handoff **desde el fence `dkc:agent-invocation` existente** con los `kb_refs` resueltos por `dkc-resolve-kb` (DET-34), capture el veredicto con `--output-schema` + `-o`, registre el `usage` del stream, y registre la entry `agent-invocation` con el choice nuevo `invoked-cli`. MUST NOT definir un schema de handoff paralelo.

Source_ref: ticket HOR-130 Triage H1/H2/H4/H5; DET-9, DET-34; `AGENTS.md` seccion de subagentes.

<details><summary>Scenarios de validacion</summary>

#### Scenario: reviewer delegado con veredicto valido
- **GIVEN** un ticket con `kb_refs` resolubles
- **WHEN** se delega el rol reviewer sobre un diff acotado
- **THEN** el comando devuelve JSON valido con `verdict ∈ {approve, iterate, escalate}`, exit 0, y deja la entry `agent-invocation: invoked-cli` con el `usage`

#### Scenario: sin contrato paralelo
- **GIVEN** el comando escrito
- **WHEN** se busca en su codigo texto de handoff propio
- **THEN** solo hay lectura del fence y de `prompts/agents/*.md`, sin campos nuevos inventados

</details>

### REQ-IMPROVE-05: el fallo de una delegacion degrada a un agente Claude, con aviso

> **Que cambia**: si Codex falla o se queda sin cupo, el rol se ejecuta igual con Claude y te enteras por que.
> **Por que**: un gate que depende de un proveedor externo sin red se cuelga en la primera falla.

El sistema MUST clasificar el fallo de una delegacion (`quota`, `model-unavailable`, `schema-invalid`, `transport`, `unknown`) a partir del exit code y del stream de eventos, MUST degradar al agente del host local preservando el mismo handoff, MUST avisar al dev en el chat, y MUST registrar la degradacion con razon. El matcher MUST ser defensivo: cualquier fallo no clasificado degrada igual. MUST NOT reintentar con el mismo proveedor cuando la clasificacion es `quota` o `model-unavailable`.

Source_ref: ticket HOR-130 Triage H7/H8/H9; L3.

<details><summary>Scenarios de validacion</summary>

#### Scenario: modelo no disponible
- **GIVEN** un tier apuntando a un slug no usable
- **WHEN** se delega
- **THEN** el rol se ejecuta con Claude, el dev ve el aviso, y la entry registra `model-unavailable` sin reintento

#### Scenario: schema invalido
- **GIVEN** un schema con una property opcional
- **WHEN** se delega
- **THEN** clasifica `schema-invalid`, degrada, y el mensaje distingue "error nuestro" de "limite del proveedor"

#### Scenario: fallo desconocido
- **GIVEN** un `turn.failed` con mensaje no reconocido
- **THEN** degrada igual, clasificado `unknown`, con el mensaje crudo en la razon

</details>

### REQ-IMPROVE-06: el canal se activa como el super autopilot

> **Que cambia**: escribis "delega a codex" y el ticket queda con delegacion activa, igual que "super autopilot" o "skip teach".
> **Por que**: el dev pidio explicitamente que se active al iniciar el ticket o por un accionable, no editando archivos.

El sistema MUST reconocer un trigger conversacional de delegacion en la tabla de `request-intake.md`, persistirlo como flag durable en el frontmatter del ticket con entry observable en `decisions_log`, y MUST permitir opt-in por proyecto con un bloque `delegation:` opcional en `config.yaml` (patron `smoke`/`mutation`/`trigger_rules`). La ausencia de flag y de bloque MUST significar off, con el comportamiento actual byte-identico.

Source_ref: peticion literal del dev; `request-intake.md:46-74`; HOR-106 (`teach_policy`), HOR-127 (`smoke:`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: trigger enciende el canal
- **GIVEN** un ticket sin delegacion
- **WHEN** el dev escribe el trigger
- **THEN** el frontmatter queda con el flag, hay entry en `decisions_log`, y el proximo gate delega

#### Scenario: default off
- **GIVEN** un ticket sin flag y un proyecto sin bloque `delegation:`
- **WHEN** corre un gate con reviewer aislado
- **THEN** se resuelve por el camino actual, sin intentar delegar

</details>

### REQ-IMPROVE-07: el costo de delegar tiene tope

> **Que cambia**: la delegacion se corta cuando la session supera el tope declarado, en vez de gastar sin control.
> **Por que**: cada delegacion es una sesion real de ChatGPT y en `super` con dual-judge se multiplica por gate.

El sistema MUST acumular el `usage` reportado por cada delegacion dentro de la session, MUST dejar de delegar cuando se supere el tope declarado en `config.yaml > delegation`, degradando al host local, y MUST reportarlo. Sin tope declarado, el sistema MUST aplicar un default conservador y decirlo.

Source_ref: ticket HOR-130 Triage H5 y R1.

### REQ-IMPROVE-08: `developer` delegable con contencion verificada

> **Que cambia**: un rol que escribe puede delegarse, porque el sandbox del host destino contiene la escritura.
> **Por que**: hoy `developer` es inline porque el prompt-guard no da garantia. El sandbox si la da.

El sistema MUST permitir delegar `developer` con `workspace-write` y un scope de archivos disjunto declarado, MUST verificar por corrida real que la escritura fuera del workspace es rechazada por el host, y MUST registrar la decision contra el criterio vigente de `agent-tiers.md` que hoy lo manda inline.

Source_ref: ticket HOR-130 Triage H4; decision del dev 2026-07-31; `agent-tiers.md` seccion "Roles inline: por que no se mapean".

### REQ-IMPROVE-09: intents y workflows salen de una fuente unica

> **Que cambia**: `commands/dkc.md`, `INSTALL.md` y `dkc_get_workflow` dejan de contradecirse, porque los tres leen lo mismo.
> **Por que**: hoy `quick` es work_type canonico y el server lo rechaza; `INSTALL.md` documenta 3 de 7.

El sistema MUST derivar el set de intents y sus workflows de un manifest canonico unico. La migracion MUST empezar por paridad: el manifest MUST reproducir la respuesta actual de `dkc_get_workflow` para los 13 intents vigentes antes de sumar o corregir ninguno. Recien con paridad demostrada, `quick` MUST quedar reconocido y las 3 superficies alineadas.

Source_ref: ticket HOR-130 Triage H10; HOR-017 fase 1.

<details><summary>Scenarios de validacion</summary>

#### Scenario: paridad antes del cambio
- **GIVEN** el manifest escrito
- **WHEN** se compara su resolucion con la actual para los 13 intents
- **THEN** diff vacio

#### Scenario: drift cerrado
- **GIVEN** el manifest como fuente
- **WHEN** se pide el workflow de `quick` y se comparan las 3 superficies
- **THEN** `quick` resuelve y los 3 sets son iguales

</details>

### REQ-IMPROVE-10: el host se puede interrogar y verificar

> **Que cambia**: DKC puede preguntar "¿que puede este host?" y "¿esta bien instalado?" en vez de asumirlo.
> **Por que**: hoy las capabilities viven en una tabla markdown y el healthcheck es un smoke manual documentado.

El sistema MUST exponer `dkc_capabilities()` (capabilities del host resuelto, incluyendo si puede delegar y a que backends), `dkc_install_check(host_mode)` (reporte ready/warnings accionables) y `dkc_route(request)` sobre el manifest de REQ-IMPROVE-09, y MUST expresar cada rol como contrato con `allowed_ops` y `escalation_conditions` consumibles por `dkc-delegate`. MUST NOT romper la resolucion actual de roles y tiers.

Source_ref: HOR-017 fases 2-3 (REQ-PORT-02, REQ-PORT-04, REQ-PORT-06); ticket HOR-130 seccion de absorcion.

### REQ-PRESERVE-01: sin flag, Claude Code se comporta igual

> **Que cambia**: nada de lo que usas hoy. Un ticket que no active delegacion resuelve sus roles y sus modelos exactamente como antes.
> **Por que**: el canal toca la resolucion de agentes, que es la superficie mas facil de romper "agregando una opcion". El dev puso la no-regresion como requisito de primera clase.

El sistema MUST preservar el comportamiento actual de resolucion de rol y de tier cuando el ticket no tiene delegacion activa y el proyecto no declara el bloque. `active`, la tabla de host mapping y el resolution order de `prompts/agent-tiers.md` MUST quedar sin modificaciones semanticas.

Source_ref: ticket HOR-130 tabla de no-regresion; HOR-029; D-024/D-025.

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket sin flag
- **GIVEN** el canal implementado y un ticket sin delegacion
- **WHEN** corre un gate que pide reviewer aislado
- **THEN** el camino es el actual y no hay invocacion externa

</details>

### REQ-PRESERVE-02: el enum de decisiones sigue aceptando lo que ya existe

El sistema MUST agregar `invoked-cli` al enum de `agent-invocation` sin invalidar `invoked-mcp`, `fallback-inline` ni `inline-bypass`, y MUST mantener la exigencia de `reason` para los choices que hoy la exigen.

Source_ref: `commands/lib/schemas/decisions.ts:126`; HOR-060.

### REQ-PRESERVE-03: la suite del MCP server no empeora

El sistema MUST mantener `pytest server/tests` sin fallos nuevos respecto del baseline 93 passed / 0 failed heredado de HOR-129.

Source_ref: ticket HOR-130 seccion Regression.

### REQ-PRESERVE-04: las DETs y los workflows no se reescriben

El sistema MUST NOT modificar `prompts/deterministic-rules.md` ni `dets_catalog.py`. Los cambios en `prompts/steps/**` MUST limitarse a leer el flag y a la tabla de triggers.

Source_ref: ticket HOR-130 alcance ("Fuera").

## Changes

### Modified: `prompts/agent-tiers.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| fila `openai-codex` del catalogo | `fast=gpt-5.4-mini`, `balanced=gpt-5.6-terra`, `reasoning=gpt-5.6-sol` | `fast=gpt-5.4-mini`, `balanced=gpt-5.4`, `reasoning=gpt-5.5` + fecha y fuente | los 2 ultimos no son usables por el CLI instalado |
| subseccion del proveedor | 6 slugs "observados" incluyendo 3 inexistentes localmente | 5 usables verificados + nota de que la verificacion la automatiza `dkc-model-map-check` | el catalogo se volvio a desincronizar en un dia |
| resolucion de rol | rol → subagente del host, o inline | se **suma** la rama "backend externo" condicionada al flag; sin flag, identico | no-regresion es requisito de primera clase |
| enforcement por rol | prompt-guard para reviewer/tester, inline para developer/scribe | se documenta el enforcement por sandbox cuando el backend es externo | el SO da lo que el prompt no puede |

### Modified: `commands/lib/schemas/decisions.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| enum de `agent-invocation` | `invoked-mcp \| fallback-inline \| inline-bypass` | + `invoked-cli` (reason obligatoria) | delegar por CLI externo no es ninguno de los 3 |

### Modified: `prompts/steps/request-intake.md` y `prompts/steps/request-execute/**`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| tabla de triggers (seccion 0) | autopilot + teach | + trigger de delegacion con flag durable | el dev pidio activarlo por accionable |
| gates de execute | resuelven rol por host mapping | leen el flag antes de resolver; sin flag, camino actual | activacion sin regresion |

### Added: `commands/dkc-delegate`, `commands/dkc-model-map-check`, `commands/lib/schemas/roles/*.json`

| Artefacto | Contenido | Purpose |
|-----------|-----------|---------|
| `dkc-delegate` | resolucion rol→sandbox y tier→modelo, handoff desde el fence, `--output-schema`, captura de `usage`, clasificacion de fallo y degradacion, registro de la entry | el canal |
| `dkc-model-map-check` | comparacion mapeo vs catalogo local, exit 0/2/3 | guardarrail del mapeo |
| `schemas/roles/{reviewer,tester,researcher}.json` | JSON Schema strict por rol con output estructurado documentado | contrato de salida ejecutable |

### Added: bloque `delegation:` en `projects/{project}/config.yaml`

| Field | Value | Purpose |
|-------|-------|---------|
| `enabled` | true \| false (ausente = off) | opt-in por proyecto |
| `backend` | `codex` | que backend externo usar |
| `roles` | lista de roles delegables | limitar la superficie |
| `budget` | tope de tokens por session | control de costo (REQ-IMPROVE-07) |

### Added: manifest de intents/workflows + tools de portabilidad (fases D y E)

| Artefacto | Contenido | Purpose |
|-----------|-----------|---------|
| manifest canonico | intents, workflows, steps, work_types | fuente unica (REQ-IMPROVE-09) |
| `dkc_capabilities`, `dkc_install_check`, `dkc_route` | tools MCP sobre el manifest | REQ-IMPROVE-10 |
| contratos de rol | `allowed_ops`, `escalation_conditions` | consumidos por `dkc-delegate` |

## Non-functional requirements

| Tipo | Current | Target | How to measure |
|------|---------|--------|----------------|
| Latencia de una delegacion read-only acotada | 55.7s medidos con `gpt-5.4-mini` sobre un archivo | < 120s p95 para un handoff de gate (diff + spec + kb_refs) | `time` del comando en los smokes de S3/S4 |
| Costo por delegacion | 87.6k input (58.5k cacheados) / 3.3k output en el smoke | reportado siempre, y acumulado por session contra el tope | `usage` del evento `turn.completed` |
| Overhead cuando el canal esta off | n/a | cero llamadas externas y ninguna lectura extra en el camino actual | TC11 |

## Tasks

### Session 1 — Mapeo de modelos corregido y validado [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Corregir la fila y la subseccion del proveedor `openai-codex` con los 5 slugs usables, el mapeo `fast=gpt-5.4-mini` / `balanced=gpt-5.4` / `reasoning=gpt-5.5`, fecha de observacion y fuente | REQ-IMPROVE-01 | developer | — | prompts/agent-tiers.md | los 3 slugs presentes en `codex debug models`; diff sin cambios en `active`/`host_mapping`/resolution order | git revert | DET-4, DET-16 | pending | 1 |
| S1.T2 | Escribir `commands/dkc-model-map-check`: mapeo declarado vs catalogo usable local, exit 0/2/3, salida legible y `--json` | REQ-IMPROVE-02 | developer | S1.T1 | commands/dkc-model-map-check | verde tras S1.T1; exit 2 al romper un tier a proposito; exit 3 sin CLI | rm del archivo | DET-4, DET-8, DET-37 | pending | 1 |
| S1.T3 | Documentar el comando en `docs/` y en el troubleshooting de `docs/codex-pack.md` (modo de falla "slug no usable") | REQ-IMPROVE-02 | developer | S1.T2 | docs/codex-pack.md, docs/ | seguir solo el doc reproduce el diagnostico de E4 | git revert | DET-16, DET-37 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T1)** — persistir, correr el validador en verde y en warn, verificar el diff, decidir | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + salidas reales de los 2 caminos del validador | (no aplica) | DET-13, DET-20, DET-23, DET-33 | pending | 1 |

### Session 2 — Contratos de salida por rol y enum de decisiones [tipo: auto] [tier: T2]

parallel_groups: [[S2.T1, S2.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Schemas strict de `reviewer` y `tester` derivados de su output schema documentado | REQ-IMPROVE-03 | developer | — | commands/lib/schemas/roles/reviewer.json, commands/lib/schemas/roles/tester.json | aceptados por `--output-schema` en corrida real; sin campos ajenos al contrato de rol | rm de los archivos | DET-1, DET-2, DET-8 | pending | 2 |
| S2.T2 | Schema strict de `researcher`. `architect` queda fuera: su Output son archivos markdown, no JSON (medido en S2.T2) | REQ-IMPROVE-03 | developer | — | commands/lib/schemas/roles/researcher.json | corrida real del schema; y verificar que no se creo architect.json | rm del archivo | DET-1, DET-2, DET-8 | pending | 2 |
| S2.T3 | Agregar `invoked-cli` al enum de `agent-invocation` con reason obligatoria | REQ-PRESERVE-02 | developer | — | commands/lib/schemas/decisions.ts | los 3 choices viejos siguen validando; el nuevo sin reason se rechaza; self-tests de la lib verdes | git revert | DET-7, DET-16 | pending | 2 |
| S2.T4 | Regresion de la lib: self-tests con `node` y con `npx tsx`, `dkc-lint-lib` y `dkc-doctor` verdes | REQ-PRESERVE-02, REQ-PRESERVE-03 | tester | S2.T3 | (ninguno: verificacion) | salidas identicas con ambos runtimes (paridad HOR-129 S2) | N/A | DET-7, DET-13, DET-33 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, evidencia de los 4 schemas aceptados + regresion de la lib, decidir | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + salidas reales | (no aplica) | DET-13, DET-20, DET-23, DET-33 | pending | 2 |

### Session 3 — El canal: `dkc-delegate` [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Resolucion: rol → sandbox, tier → modelo del backend, y lectura del handoff desde el fence `dkc:agent-invocation` + `kb_refs` de `dkc-resolve-kb` | REQ-IMPROVE-04 | developer | S1.GATE, S2.GATE | commands/dkc-delegate | dry-run imprime el `codex exec` resuelto sin ejecutarlo; grep sin contrato de handoff propio | rm del archivo | DET-9, DET-34, DET-32 | pending | 3 |
| S3.T2 | Ejecucion y captura: `--output-schema` del rol, `-o`, `--json`, parseo del `usage`, y silenciado de los MCP que el rol no necesita | REQ-IMPROVE-04 | developer | S3.T1 | commands/dkc-delegate | delegacion real de reviewer con veredicto valido; `usage` extraido; stderr de MCP ajeno no se trata como falla | git revert | DET-4, DET-8, DET-33 | pending | 3 |
| S3.T3 | Registro: entry `agent-invocation: invoked-cli` con host, modelo, sandbox y `usage` en la razon | REQ-IMPROVE-04 | developer | S3.T2 | commands/dkc-delegate | `dkc-validate StepDecisions` acepta la entry; la razon cita modelo y tokens | git revert | DET-13, DET-16 | pending | 3 |
| S3.T4 | Smoke real end-to-end del canal sobre un diff acotado, con verificacion independiente del veredicto (DET-33) | REQ-IMPROVE-04 | tester | S3.T3 | (ninguno: verificacion) | veredicto reproducido a mano antes de aceptarlo | N/A | DET-13, DET-33, DET-36 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir, evidencia runtime del canal, decidir | — | reviewer | S3.T4 | ticket | gate persistido + salida real del comando y de la entry | (no aplica) | DET-13, DET-20, DET-23, DET-33 | pending | 3 |

### Session 4 — La red: clasificacion de fallo y fallback a Claude [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Clasificador de fallo: `quota`, `model-unavailable`, `schema-invalid`, `transport`, `unknown`, a partir de exit code + stream, con default a `unknown` | REQ-IMPROVE-05 | developer | S3.GATE | commands/dkc-delegate | los 2 fallos forzables (slug no usable, schema con opcional) clasifican bien; un mensaje inventado cae en `unknown` | git revert | DET-1, DET-4, DET-8 | pending | 4 |
| S4.T2 | Degradacion: mismo handoff al agente del host local, aviso al dev, entry con razon, y sin reintento cuando es `quota` o `model-unavailable` | REQ-IMPROVE-05 | developer | S4.T1 | commands/dkc-delegate, prompts/agent-tiers.md | el rol se completa via Claude tras el fallo; el aviso aparece; la entry lo registra | git revert | DET-13, DET-16, DET-33 | pending | 4 |
| S4.T3 | Receta de verificacion para el caso quota real (no forzable) + TC6 documentado como `blocked` con pasos exactos | REQ-IMPROVE-05 | scribe | S4.T2 | projects/horadric/tickets/HOR-130.md | la receta permite que el dev valide en 2 minutos cuando le pase | N/A | DET-1, DET-4, DET-13 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** — persistir, evidencia de los 2 fallos forzados degradando, decidir | — | reviewer | S4.T2, S4.T3 | ticket | gate persistido + salidas reales de las degradaciones | (no aplica) | DET-13, DET-20, DET-23, DET-33 | pending | 4 |

### Session 5 — Activacion: trigger y flag [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Trigger conversacional en la tabla de seccion 0 + flag durable en frontmatter + entry observable | REQ-IMPROVE-06 | developer | S4.GATE | prompts/steps/request-intake.md | el trigger deja flag + entry; variantes reconocidas; sin trigger no cambia nada | git revert | DET-3, DET-16 | pending | 5 |
| S5.T2 | Lectura del flag en los gates de execute antes de resolver el rol | REQ-IMPROVE-06, REQ-PRESERVE-01 | developer | S5.T1 | prompts/steps/request-execute/session-gate.md, prompts/steps/request-execute/task-loop.md | ticket con flag delega; ticket sin flag toma el camino actual | git revert | DET-16, DET-23 | pending | 5 |
| S5.T3 | Regresion de activacion: ticket sin flag no dispara ninguna llamada externa | REQ-PRESERVE-01 | tester | S5.T2 | (ninguno: verificacion) | traza sin invocaciones externas + diff de `agent-tiers.md` sin cambios semanticos | N/A | DET-7, DET-13, DET-33 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2)** — persistir, evidencia de ambos caminos, decidir | — | reviewer | S5.T2, S5.T3 | ticket | gate persistido + evidencia con y sin flag | (no aplica) | DET-13, DET-20, DET-23, DET-33 | pending | 5 |

### Session 6 — Opt-in por proyecto y tope de costo [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Bloque `delegation:` opcional en `config.yaml` (template comentado + resolucion), patron `smoke`/`mutation`/`trigger_rules` | REQ-IMPROVE-06 | developer | S5.GATE | projects/horadric/config.yaml, templates/ | YAML parsea; bloque ausente = off; documentado inline como los otros 3 bloques | git revert | DET-11, DET-16, DET-37 | pending | 6 |
| S6.T2 | Tope de costo: acumular `usage` por session, cortar al superarlo degradando al host local, y reportarlo | REQ-IMPROVE-07 | developer | S6.T1 | commands/dkc-delegate | con tope en 1, la segunda delegacion de la session no sale y queda reportada | git revert | DET-8, DET-13 | pending | 6 |
| S6.T3 | Doc del canal completo: instalacion, activacion, topes, fallback y troubleshooting | REQ-IMPROVE-06, REQ-IMPROVE-07 | developer | S6.T2 | docs/ | un tercero activa el canal siguiendo solo el doc | rm del archivo | DET-16, DET-37 | pending | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T2)** — persistir, evidencia del tope cortando, decidir. **Frontera de corte del ticket**: aca el canal esta completo y activable | — | reviewer | S6.T2, S6.T3 | ticket | gate persistido + salida del corte por tope | (no aplica) | DET-13, DET-20, DET-23, DET-33 | pending | 6 |

### Session 7 — `developer` delegable acotado [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S7.T1 | Delegacion de `developer` con `workspace-write` y scope de archivos declarado y disjunto | REQ-IMPROVE-08 | developer | S6.GATE | commands/dkc-delegate | escritura dentro del scope OK; fuera del workspace rechazada por el host, con salida capturada | git revert | DET-8, DET-10, DET-33 | pending | 7 |
| S7.T2 | Actualizar el criterio de `agent-tiers.md` sobre roles inline: sigue vigente para el host local, deja de aplicar con backend externo, con evidencia y fecha | REQ-IMPROVE-08, REQ-PRESERVE-01 | developer | S7.T1 | prompts/agent-tiers.md | el texto distingue enforcement por prompt vs por sandbox; `host_mapping` intacto | git revert | DET-4, DET-16 | pending | 7 |
| S7.T3 | Verificacion adversarial del scope: intentar salirse del scope declarado desde el rol delegado | REQ-IMPROVE-08 | tester | S7.T2 | (ninguno: verificacion) | todos los intentos fuera de scope rechazados, con salida real | N/A | DET-7, DET-13, DET-33 | pending | 7 |
| **S7.GATE** | **Gate de sync Session 7 (tier: T3)** — persistir, dual-judge (DET-35) sobre el cambio de criterio, decidir | — | reviewer | S7.T2, S7.T3 | ticket | gate persistido + veredictos de los jueces + evidencia de contencion | (no aplica) | DET-13, DET-20, DET-23, DET-33, DET-35 | pending | 7 |

### Session 8 — Manifest canonico: paridad primero [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S8.T1 | Inventario de la fuente actual: los 13 intents, sus workflows y prompts, tal como los resuelve `dkc_get_workflow` hoy | REQ-IMPROVE-09 | researcher | S7.GATE | (ninguno: lectura) | los 13 intents capturados con su respuesta actual completa | N/A | DET-1, DET-2, DET-11 | pending | 8 |
| S8.T2 | Manifest canonico + lectura desde el server, sin cambiar ninguna respuesta | REQ-IMPROVE-09 | developer | S8.T1 | server/src/deckard_cain/**, manifest | diff vacio entre respuesta actual y respuesta desde manifest para los 13 | git revert | DET-5, DET-8, DET-16 | pending | 8 |
| S8.T3 | Test de paridad automatizado que falle si una respuesta cambia | REQ-IMPROVE-09, REQ-PRESERVE-03 | tester | S8.T2 | server/tests/ | el test detecta un cambio introducido a proposito; `pytest server/tests` sin fallos nuevos | git revert | DET-7, DET-13 | pending | 8 |
| **S8.GATE** | **Gate de sync Session 8 (tier: T3)** — persistir, paridad demostrada, dual-judge, decidir | — | reviewer | S8.T2, S8.T3 | ticket | gate persistido + diff vacio de los 13 intents | (no aplica) | DET-13, DET-20, DET-23, DET-33, DET-35 | pending | 8 |

### Session 9 — Drift de intents cerrado [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S9.T1 | Sumar `quick` (y lo que falte) al manifest, ahora que la paridad esta probada | REQ-IMPROVE-09 | developer | S8.GATE | manifest, server/src/deckard_cain/** | `dkc_get_workflow("quick")` responde con su workflow | git revert | DET-5, DET-8 | pending | 9 |
| S9.T2 | Alinear `commands/dkc.md` e `INSTALL.md` con el manifest y dejar el manifest como referencia citada | REQ-IMPROVE-09 | developer | S9.T1 | commands/dkc.md, INSTALL.md, DECKARD.md | los 3 sets de intents identicos, verificado por comando | git revert | DET-16, DET-37 | pending | 9 |
| S9.T3 | Test de drift: falla si una superficie se desincroniza del manifest | REQ-IMPROVE-09 | tester | S9.T2 | server/tests/ | el test detecta una desincronizacion introducida a proposito | git revert | DET-7, DET-13 | pending | 9 |
| **S9.GATE** | **Gate de sync Session 9 (tier: T2)** — persistir, drift cerrado con test que lo cuida, decidir | — | reviewer | S9.T2, S9.T3 | ticket | gate persistido + salida del test de drift | (no aplica) | DET-13, DET-20, DET-23, DET-33 | pending | 9 |

### Session 10 — Capabilities y contratos de rol [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S10.T1 | `dkc_capabilities()`: capabilities del host resuelto, incluyendo backends de delegacion disponibles | REQ-IMPROVE-10 | developer | S9.GATE | server/src/deckard_cain/** | responde para `claude-code` y `codex` con datos que coinciden con la matriz verificada | git revert | DET-4, DET-11 | pending | 10 |
| S10.T2 | Contratos de rol con `allowed_ops` y `escalation_conditions` sobre los schemas de S2 | REQ-IMPROVE-10 | architect | S10.T1 | commands/lib/schemas/roles/**, prompts/agents/ | cada rol expone su contrato completo; sin contradecir su prompt | git revert | DET-1, DET-9, DET-10 | pending | 10 |
| S10.T3 | `dkc-delegate` consume el contrato en vez de tener el mapping hardcodeado | REQ-IMPROVE-10 | developer | S10.T2 | commands/dkc-delegate | quitar una op del contrato cambia el comportamiento del comando | git revert | DET-16, DET-32 | pending | 10 |
| **S10.GATE** | **Gate de sync Session 10 (tier: T2)** — persistir, contratos consumidos de verdad, decidir | — | reviewer | S10.T2, S10.T3 | ticket | gate persistido + evidencia de consumo del contrato | (no aplica) | DET-13, DET-20, DET-23, DET-33 | pending | 10 |

### Session 11 — `dkc_route` sobre el manifest [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S11.T1 | `dkc_route(request)`: intent, confidence, workflow y next_step desde el manifest | REQ-IMPROVE-10 | developer | S10.GATE | server/src/deckard_cain/** | clasifica el set de ejemplos de la tabla de `commands/dkc.md` con paridad de resultado | git revert | DET-1, DET-4, DET-16 | pending | 11 |
| S11.T2 | Casos de prueba de routing, incluyendo los ambiguos que hoy `commands/dkc.md` manda a preguntar | REQ-IMPROVE-10 | tester | S11.T1 | server/tests/ | ambiguo devuelve baja confidence y no inventa intent | git revert | DET-7, DET-13 | pending | 11 |
| **S11.GATE** | **Gate de sync Session 11 (tier: T3)** — persistir, dual-judge sobre el routing, decidir | — | reviewer | S11.T1, S11.T2 | ticket | gate persistido + veredictos + salidas del routing | (no aplica) | DET-13, DET-20, DET-23, DET-33, DET-35 | pending | 11 |

### Session 12 — Host modes e `dkc_install_check` [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S12.T1 | Host modes derivados de `dkc_capabilities` (slash/mcp/agent/single/manual) | REQ-IMPROVE-10 | developer | S11.GATE | server/src/deckard_cain/** | cada host resuelve su modo con la evidencia que lo justifica | git revert | DET-4, DET-11 | pending | 12 |
| S12.T2 | `dkc_install_check(host_mode)`: MCP, root, proyecto activo, indice, y para `codex` tambien mapeo de modelos via `dkc-model-map-check` | REQ-IMPROVE-10 | developer | S12.T1 | server/src/deckard_cain/** | reporte ready/warnings accionables para los 2 hosts; detecta un MCP caido a proposito | git revert | DET-13, DET-32 | pending | 12 |
| S12.T3 | Doc de instalacion actualizado para los 2 hosts, reusando `docs/codex-pack.md` | REQ-IMPROVE-10 | developer | S12.T2 | docs/, INSTALL.md | seguir solo el doc deja el healthcheck en verde | git revert | DET-16, DET-37 | pending | 12 |
| **S12.GATE** | **Gate de sync Session 12 (tier: T2)** — persistir, healthcheck ejecutado en los 2 hosts, decidir | — | reviewer | S12.T2, S12.T3 | ticket | gate persistido + salidas del healthcheck | (no aplica) | DET-13, DET-20, DET-23, DET-33 | pending | 12 |

### Session 13 — Regresion completa y cierre [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S13.T1 | Regresion en Claude Code: ticket sin flag, diff de `agent-tiers.md`, `pytest server/tests` vs baseline 93/0, self-tests de la lib | REQ-PRESERVE-01..04 | tester | S12.GATE | (ninguno: verificacion) | TC11 y TC12 en verde con salida real; ningun path prohibido tocado, verificado commit por commit | N/A | DET-7, DET-13, DET-33 | pending | 13 |
| S13.T2 | Cerrar la absorcion: `HOR-017` a `superseded` con puntero, su seccion de frontera actualizada, su Request intacto | REQ-IMPROVE-09, REQ-IMPROVE-10 | scribe | S13.T1 | projects/horadric/tickets/HOR-017.md | `HOR-017` valido en el schema con `status: superseded`; Request sin cambios (diff) | git revert | DET-3, DET-16 | pending | 13 |
| S13.T3 | Learns refinados a records del KB (DET-39) y backlog revisado | — | scribe | S13.T2 | projects/horadric/rules/, projects/horadric/bugs/ | cero learns raw sin procesar o deferral auditado | N/A | DET-16, DET-39 | pending | 13 |
| **S13.GATE** | **Gate final (tier: T3)** — acceptance checkpoints ejecutados, dejar listo para close (que SIEMPRE pregunta, DET-30) | — | reviewer | S13.T1, S13.T2, S13.T3 | ticket | acceptance con evidencia real, no "parece funcionar" | (no aplica) | DET-13, DET-20, DET-23, DET-30, DET-33 | pending | 13 |

## Constraints

- **DET-29**: las transiciones de session/task van por `dkc-execute-task`, no por Edit libre del frontmatter.
- **DET-30**: el close siempre pregunta, incluso en `super`. El canal de delegacion no cambia eso.
- **DET-32**: `dkc_install_check` es reuse del alcance absorbido de HOR-017, no un healthcheck nuevo por host.
- **DET-34**: el handoff inyecta `kb_refs` resueltos; `dkc-delegate` los pasa, no los re-resuelve por invocacion.
- **DET-35**: el dual-judge puede usar un juez externo y uno local; la regla de confirmar solo con coincidencia no cambia.
- **D-024 / D-025** (`ONGOING.md:126,133`): DKC sigue siendo LLM-agnostico y cada tier resuelve su proveedor de forma independiente. El canal no vuelve a DKC Codex-first.
- **HOR-029**: la tabla de host mapping sigue siendo la fuente de la resolucion de roles; el backend externo se **suma** como rama condicionada.
- **`BUG-codex-hooks-sin-via-declaracion-001`**: sin hooks en Codex, ningun rol delegado puede ser responsable de mantener el indice fresco.

## Gate de necesidad/reuso (DET-32)

| Item nuevo | Veredicto | Razon |
|-----------|-----------|-------|
| `dkc-delegate` | **build** | No existe ningun ejecutor de delegacion externa. Se construye como orquestador delgado sobre contratos existentes |
| `dkc-model-map-check` | **build** | No hay validador de mapeo. El prototipo de la evidencia demuestra que son ~60 lineas |
| Schemas strict por rol | **reduce** | El contrato ya existe en prosa en `prompts/agents/*.md`; se **traduce** a JSON Schema, no se redisena |
| Handoff para el delegado | **reuse** | `dkc:agent-invocation` + `dkc-resolve-kb` + `AGENTS.md`. Un handoff nuevo seria drift (prohibido por alcance) |
| Choice `invoked-cli` | **reduce** | Una linea en el enum existente en vez de un mecanismo de registro nuevo |
| Bloque `delegation:` en config | **reduce** | Copia el patron de `smoke`/`mutation`/`trigger_rules`, incluido "ausente = off" |
| Trigger de activacion | **reuse** | La tabla de triggers y el patron de flag durable ya existen (HOR-106) |
| Lectura de quota previa a delegar | **drop** | No es observable (H7). Se resuelve por manejo de fallo, que ya hay que construir igual |
| Mapping de roles a `agent_roles` nativos de Codex | **drop** | Ya evaluado y descartado en HOR-129 S5.T3 (veredicto `reduce`, acoplar a un host contradice D-024) |
| `dkc_next_action` + runtime persistente | **drop** | Ninguna fase lo necesita; queda en backlog |
| Healthcheck por host separado | **reuse** | Es `dkc_install_check(host_mode)`, host-agnostico, ya en el alcance absorbido |

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| CLI de Codex (`/Applications/Codex.app/Contents/Resources/codex`, `0.131.0-alpha.9`) | external | Provee `-m`, `-s`, `--output-schema`, `--json`, `debug models` | Si cambian flags o slugs, el canal y el validador necesitan ajuste. `dkc-model-map-check` es justamente el detector |
| Sesion de Codex con credito | external | S3, S4, S7 y S8 necesitan corridas reales | Autorizado por el dev para los smokes de este ticket. Sin credito, esas tasks quedan `blocked` con receta |
| MCP `deckard-cain` | internal | Entry point y, en fases D-E, sede del manifest y las tools nuevas | Ya configurado en ambos hosts |
| Baseline `pytest server/tests` 93/0 | internal | Referencia de no-regresion | Heredado de HOR-129 y verificado ahi |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Costo descontrolado en `super` con dual-judge | high | alto | S6 (tope por session) es obligatoria, no opcional; default off; solo tiers T2/T3 |
| El clasificador de quota no acierta el caso real | medium | medio | Default a `unknown` que degrada igual; receta para validar cuando ocurra (S4.T3) |
| La fase D rompe el routing de todos los hosts | medium | alto | Paridad demostrada con diff vacio antes de tocar nada (S8), mas test de paridad permanente |
| El comando duplica el contrato de handoff | medium | medio | Grep de verificacion en S3.T1 (mismo control que HOR-129 uso con las skills) |
| `developer` delegado escribe fuera de scope | low | alto | Contencion por sandbox ya verificada + verificacion adversarial (S7.T3) + session aislada reversible |
| Los slugs cambian durante el ticket | medium | bajo | El validador existe desde S1 y corre en cada gate |
| El ticket se dispersa por tamano | high | medio | Frontera de corte en S6.GATE: fases A-C entregan valor completo sin D-E |

## Open questions

Ninguna abierta al aprobar el spec. Las tres que existian se resolvieron con el dev antes de crear el ticket: absorcion de HOR-017 (completa), roles delegables (read-only + `developer` acotado), y modelo del tier `balanced` (`gpt-5.4`).

## Decisions

### DEC-LOCAL-01: fallback reactivo en vez de enrutamiento preventivo por cupo
- **Contexto**: lo natural seria consultar el cupo de Codex y decidir a quien delegar antes de gastar.
- **Drivers**: no hay superficie que exponga el cupo (H7, verificado en `codex debug` y en el estado global del host).
- **Opcion elegida**: intentar, clasificar el fallo y degradar, con matcher defensivo.
- **Alternativas**: (a) parsear la UI interactiva, descartada por fragil y no automatizable; (b) contar tokens propios para estimar el cupo, descartada porque el cupo es del proveedor y no se deriva del uso local.
- **Consecuencias**: se paga un intento fallido antes de degradar (segundos, sin tokens de razonamiento en los 2 casos medidos). Reversible.
- **Session**: 4

### DEC-LOCAL-02: el mapeo se valida contra el catalogo local, no contra el remoto
- **Contexto**: `gpt-5.6-sol` existe server-side pero el CLI instalado lo rechaza.
- **Drivers**: lo que importa es lo invocable desde esta maquina; un catalogo remoto daria falsos verdes.
- **Opcion elegida**: `codex debug models` con `visibility: list` como fuente del validador.
- **Alternativas**: leer `models_cache.json` (puede estar stale, aunque sirve como corroboracion), o consultar la API remota (falsos verdes).
- **Consecuencias**: el validador depende del CLI instalado, que es exactamente la dependencia real. Reversible.
- **Session**: 1

## Acceptance checkpoints

Ejecutados al cerrar S13 (DET-13: con evidencia, no por inspeccion).

- [x] **Funcional**: los scenarios de REQ-IMPROVE-01 a 10 pasan con evidencia real. Runtime donde aplica: 20+ delegaciones reales a Codex (reviews, jueces, developer con escritura, corridas de canal), los 5 tipos de fallo forzados con stubs, y el corte por tope ejecutado. Ver la validacion del tier de cada session en el ticket.
- [x] **Regresion**: REQ-PRESERVE-01 a 04 verificados. Ticket sin flag toma el camino actual (probado contra HOR-129, que no tiene `delegation`); el enum acepta los 3 choices viejos y rechaza `invoked-cli` sin reason; `pytest server/tests` **146 passed / 0 failed** contra baseline 93/0; `active`, `host_mapping` y resolution order sin cambios en el diff acumulado.
- [x] **Tests**: TC1-TC15 con Actual + Evidence llenos **en el momento de ejecucion** (DET-25), no diferidos. **14 pass, 1 `blocked`** con receta (cupo real, no forzable). Correccion propia al revisar: TC3 y TC14 habian quedado en `pending` con el trabajo hecho y verificado, y este mismo checkpoint los describia como "sin ejecutar" — se marcaron `pass` con su evidencia. TC15 quedo documentado como `fail` y despues `pass tras remediacion`, no re-escrito.
- [x] **Costo**: cada delegacion registro su `usage` en la entry `agent-invocation` del `decisions_log`, y el tope se demostro **cortando** (86328 acumulados contra un techo de 1000: la tercera delegacion no salio y quedo registrada).
- [x] **Rules**: DET-29 (transiciones por `dkc-execute-task`, 39 tasks), DET-30 (el close pide OK del dev y el push tambien), DET-32 (`dkc_install_check` como reuse, no build; 11 items evaluados en el intake), DET-34 (`kb_refs` inyectados y verificados llegando al delegado en el stream), DET-35 (dual-judge con lentes distintas en los 4 gates T2/T3 que lo pedian).
- [x] **Docs**: `docs/delegation.md` (nuevo) y `docs/codex-pack.md` validados **por uso**, corriendo sus comandos; `commands/dkc.md`, `INSTALL.md` y `prompts/agent-tiers.md` alineados, con `dkc-validate-step-references` en 0 refs huerfanas.
- [x] **Absorcion**: `HOR-017` con `superseded_by: HOR-130`, la tabla de que se entrego de cada una de sus 4 fases, su Request **intacto** (DET-3) y su seccion de frontera marcada historica en vez de borrada (DET-6). **Matiz**: el `status` sigue en `intake-explore` porque el enum del schema no tiene `superseded` y cerrar otro ticket es decision del dev, que se le pidio en el cierre.

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When to measure |
|--------|-------------------|--------|----------------|-----------------|
| Tiers del proveedor externo que resuelven a un modelo usable | 1 de 3 | 3 de 3 | `dkc-model-map-check` | S1.GATE |
| Roles delegables con enforcement nativo (no por prompt) | 0 | 5 (4 read-only + developer acotado) | contrato de rol + corridas de contencion | S7.GATE |
| Delegaciones que quedan sin registro de costo | 100% (no hay canal) | 0% | entries `agent-invocation: invoked-cli` con `usage` | S3.GATE, S6.GATE |
| Fallos de delegacion que dejan un gate colgado | n/d (sin canal) | 0 | los 2 fallos forzables + el caso `unknown` | S4.GATE |
| Superficies que declaran intents de forma independiente | 3 (`commands/dkc.md`, `INSTALL.md`, server) | 1 (manifest) + 2 derivadas verificadas por test | test de drift | S9.GATE |
| Fallos nuevos en `pytest server/tests` | 0 (baseline 93/0) | 0 | `pytest server/tests -q` | S13.GATE |
