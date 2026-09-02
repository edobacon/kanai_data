---
id: SPEC-workflow-autopilot-safety-net
project: horadric
ticket: HOR-079
status: done
---

# Red de seguridad para autopilot autonomo (DET-30)

# Red de seguridad para autopilot autonomo (DET-30)

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle vive en Requirements / Tasks. Si te basta esto para aprobar, ese es el objetivo.*

**Que se quiere**: hacer que un ticket pueda ejecutarse en autopilot de forma autonoma sin que pierdas control ni quedes a ciegas. Hoy el autopilot baja tu supervision pero no agrega proteccion. Esta feature agrega **dos niveles** de autonomia (uno que pregunta al cierre de cada sesion, otro que corre el ticket entero sin parar), una **red de seguridad al inicio** (rama de trabajo + limite de repos, para que todo sea revertible), una **validacion reforzada al final** (verifica que lo hecho coincide con lo pedido y no se salio del alcance), **streaming de avances al chat** (para que puedas frenar a fuerza bruta), y **teach obligatorio y mas didactico** (tu ventana a lo que el sistema hace y que aprendas el producto en el camino). Todo se formaliza como **DET-30 global** (sirve a todos los proyectos) + un **git hook** que bloquea commits a develop/master.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Se AGREGA `super` (4o valor) para ejecucion por-ticket; los 3 modos existentes (`false`/`strict`/`true`) quedan intactos | `true`/optimistic ya era por-sesion (se detiene al commit, DET-27); faltaba el por-ticket sin paradas (descubierto al implementar — L2) |
| 2 | DET-30 es **global** (regenera el bloque de CLAUDE.md de todos los proyectos) | Impacta todos los proyectos DKC de inmediato — asumido como deseable |
| 3 | Git hook **permanente + escape humano** (`--no-verify`), no condicional a autopilot | Mas robusto (sin flag fragil); el LLM no saltea hooks → bloqueo efectivo igual |
| 4 | Teach pasa a **MUST** en autopilot (no-skip), condicionando DET-21/22 | Es tu unica ventana cuando no supervisas paso a paso |
| 5 | La revision (cada gate + cierre) la hace un **sub-agente aislado** del contexto de ejecucion | QA independiente: un revisor fresco valida contra el spec sin el sesgo del que ejecuto |
| 6 | HC muestra **badge de super autopilot** en tickets ejecutados por-ticket (`super`) | Sabes de un vistazo que tickets corrieron sin supervision y merecen auditoria |

**Riesgos principales y como los mitigamos**:

- **Tocar `deterministic-rules.md` (DET-30) regenera el bloque global de CLAUDE.md → impacta todos los proyectos** → S7 corre `dkc-export-rules --global` + regresion de validators antes de cerrar; DET-30 es aditiva (no modifica DETs existentes, las referencia).
- **El modelo de 2 niveles podria romper triggers existentes** → S1 es gate `⚑ fuerte`: apruebas el modelo antes de tocar nada; los triggers actuales se preservan (REQ regression).
- **Flag de autopilot huerfano** (descartado): por eso el git hook NO es condicional — sin estado que se corrompa.
- **Gates del design saltados sin humano que los note** (caso real: la evaluacion de paralelizacion se salto hasta que el dev la recordo — learn L1) → REQ-11: verificacion automatica por comando (`dkc-validate StepDecisions`) en la transicion a execute, no-saltable en autopilot.

**Que NO se hace en este ticket**:

- Cambiar el permission mode del harness automaticamente — el LLM no puede auto-elevar permisos; el dev lo activa al lanzar (fuera de DKC).
- UI nueva en HC — a lo sumo se reusa el render de teach/sessions existente.
- Versionamiento o rollback automatico de cambios — la revertibilidad se logra via rama de ticket (descartable), no via mecanismo nuevo.

**Tamano estimado**: 8 sessions ejecutables (S1-S8), ~12-16h efectivas distribuidas. Las mas riesgosas: S7 (DET-30 global + git hook + export — tier T3) y S8 (badge en el viewer horadric-cube).

**Como vas a saber que funciona**:

- Lanzas un ticket en autopilot nivel por-ticket y corre las sesiones sin pedirte confirmacion, mostrando avances en el chat; lo interrumpes y se detiene.
- Si intentas arrancar autopilot en `develop`/`master`, la guarda bloquea y exige rama de ticket.
- Al cerrar, ves la validacion reforzada (cambios vs spec + scope) y el teach-close en prosa didactica.
- Un commit a `develop` directo (sin `--no-verify`) es rechazado por el hook.

---

## Purpose

Extender el motor DKC con una capa de seguridad y observabilidad para la ejecucion autonoma (autopilot): modelar 2 niveles de autonomia, instalar guardas pre/post ejecucion (rama + scope + validacion reforzada), reportar progreso al chat, y elevar el teach a obligatorio. Se formaliza como DET-30 global + git hook. Construido sobre DET-13/16/23 (cierre), DET-20 (sessions), DET-21/22 (teach), DET-29 (G-init), y el precedente RULE-dev-004.

## Requirements

### REQ-01: Dos niveles de autopilot autonomo

> **Que cambia**: el autopilot pasa a 4 niveles. Los 3 actuales quedan intactos; se AGREGA `super` (por-ticket) que corre el ticket completo sin detenerse ni para commitear. `true` (optimistic) ya era el "por-sesion" (se detiene en cada cierre de sesion al commit, por DET-27).
> **Por que**: hoy NO existe un modo que ejecute el ticket de punta a punta sin paradas — los 3 modos actuales siempre se detienen al commit (DET-27). Descubierto al implementar (learn L2): el modelo de modos ya existia en `transversal.md`; REQ-01 lo extiende, no lo redefine.

El sistema MUST modelar **4 niveles** de autonomia extendiendo el enum existente, **preservando la semantica de los 3 actuales**:
- `false` (conversacional) — supervisado: decide en ⚑ fuerte, confirma commits.
- `'strict'` — conservador: pausa siempre en ⚑ fuerte.
- `true` (optimistic) — **por-sesion**: auto-aprueba gates ⚑ fuerte pero se detiene en cada cierre de sesion al commit (DET-27 exige OK).
- `'super'` (NUEVO) — **por-ticket**: auto-commitea local sin OK y corre el ticket completo sin parar; push/merge/destructivo SIEMPRE preguntan. Excepcion acotada a DET-27 (releva OK del commit local, no del push), viable por la guarda de inicio (rama descartable) + git hook.

Los triggers conversacionales existentes (`autopilot on/strict/off`, `pausa`) MUST seguir funcionando + nuevo trigger para `super`.

**Actor**: dev (configura) / system (ejecuta)
**Layers**: meta (prompts, deterministic-rules, frontmatter)

<details><summary>Scenarios de validacion</summary>

#### Scenario: nivel por-sesion (`true` optimistic)
- **GIVEN** `autopilot: true`
- **WHEN** el LLM cierra `S{N}.GATE` con decision continue
- **THEN** se detiene en el commit de cierre (DET-27) y espera el OK del dev antes de abrir S{N+1}

#### Scenario: nivel por-ticket (`super`)
- **GIVEN** `autopilot: super`
- **WHEN** el LLM cierra `S{N}.GATE` con decision continue
- **THEN** auto-commitea local sin OK y abre S{N+1} sin preguntar, hasta el ultimo gate del ticket

#### Scenario: trigger preservado
- **GIVEN** un ticket en `strict`
- **WHEN** el dev escribe "pausa"
- **THEN** transiciona a `false` desde el proximo gate (regresion de triggers HOR-022)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: activa `super`, corre un ticket de 2+ sessions, y observa que no se le pregunta entre sessions; activa `true` y observa que sí se detiene (al commit de cada sesion).

### REQ-02: Guarda de inicio (rama + scope), bloqueante

> **Que cambia**: antes de ejecutar la primera task en autopilot, el sistema verifica que estas en una rama de ticket (no `develop`/`master`) y registra de que repos/paths NO debe salir.
> **Por que**: si algo sale mal en ejecucion autonoma, descartar la rama revierte todo a nivel codigo — la red de seguridad.

El sistema MUST, al iniciar execute con autopilot activo (`strict`/`true`/`super`), verificar que la rama actual NO es `develop`/`master` (crear/cambiar a rama de ticket si aplica, per RULE-dev-004) y leer el campo `execute_scope` declarado del ticket. MUST bloquear la primera task si esta en rama protegida o no hay `execute_scope` declarado.

**Actor**: system
**Layers**: meta (request-execute/start), config (frontmatter `execute_scope`)

<details><summary>Scenarios de validacion</summary>

#### Scenario: rama protegida bloquea
- **GIVEN** rama actual `develop`, `autopilot: strict`
- **WHEN** se inicia execute
- **THEN** la guarda bloquea con instruccion de crear rama de ticket

#### Scenario: scope ausente bloquea
- **GIVEN** ticket sin campo `execute_scope`
- **WHEN** se inicia execute en autopilot
- **THEN** bloquea pidiendo declarar el scope de repos/paths

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intenta arrancar autopilot parado en `develop` → bloquea; con rama de ticket + scope declarado → arranca.

### REQ-03: Validacion de cierre reforzada (obligatoria en autopilot)

> **Que cambia**: al cerrar un ticket que corrio en autopilot, una sesion de validacion obligatoria contrasta cada cambio contra el spec, verifica propagacion y que no se salio del scope ni se toco `develop`/`master`.
> **Por que**: como no supervisaste paso a paso, esta es la verificacion que confirma que lo hecho es lo pedido.

El sistema MUST, al cerrar un ticket con autopilot activo, ejecutar una validacion que consolida DET-13 (cambios vs spec) + DET-16 (propagacion) + DET-23 (calidad) y ADEMAS verifica: (a) los cambios no excedieron el `execute_scope` declarado, (b) la rama sigue siendo de ticket. **Esta validacion la ejecuta el reviewer aislado de REQ-10** (no el LLM que ejecuto). MUST bloquear el cierre si alguna falla.

**Actor**: system (reviewer)
**Layers**: meta (request-close)

<details><summary>Scenarios de validacion</summary>

#### Scenario: cambio fuera de scope bloquea cierre
- **GIVEN** scope = `mods/curriculum-design/`, pero hubo edits en `object-manager/src/`
- **WHEN** se cierra el ticket
- **THEN** la validacion bloquea y reporta el archivo fuera de scope

#### Scenario: cierre limpio
- **GIVEN** todos los cambios dentro de scope + rama de ticket
- **WHEN** se cierra
- **THEN** la validacion pasa y permite teach-close + closed

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre un ticket autopilot que toca un archivo fuera del scope declarado → el cierre se bloquea con el detalle.

### REQ-04: Streaming de avances al chat + punto de interrupcion

> **Que cambia**: durante la ejecucion autonoma, el sistema te va mostrando en el chat que sesion/task ejecuta y que cambia, para que puedas frenar a fuerza bruta.
> **Por que**: sin esto, el autopilot por-ticket seria una caja negra hasta el final.

El sistema MUST, en autopilot, emitir al chat un reporte de progreso por task (inicio + resultado) y por gate de sesion, en forma concisa, de modo que el dev pueda interrumpir la ejecucion en cualquier momento (la interrupcion del harness detiene el turno). El reporte de cada gate MUST incluir el **veredicto del reviewer aislado** (REQ-10): `approve/iterate/escalate` + los hallazgos que gatillan `iterate/escalate` (conciso). Como el sub-agente reviewer retorna su veredicto al orquestador (su proceso interno NO es visible al chat por diseno del harness), **el orquestador MUST relayear** ese veredicto al chat. El detalle completo de la revision persiste en el ticket (DET-23 / validacion de cierre), no en el chat.

**Actor**: system
**Layers**: meta (request-execute/task-loop)

<details><summary>Scenarios de validacion</summary>

#### Scenario: progreso visible
- **GIVEN** `autopilot: super`, ticket de 3 sessions
- **WHEN** ejecuta
- **THEN** el chat muestra avance por task/gate sin esperar al final

</details>

#### Acceptance
**El usuario puede verificar que funciona**: lanza autopilot `super` y ve el avance fluir en el chat; lo interrumpe y se detiene.

### REQ-05: Teach reforzado — MUST en autopilot

> **Que cambia**: en autopilot, los teach (intake y close) son obligatorios (no se pueden saltar) y siguen un formato didactico fijo: intake = "que hay / que se hara / por que"; close = "que se hizo / por que / que cambio y por que / variaciones del plan".
> **Por que**: el teach es tu principal ventana al trabajo cuando no supervisas; debe educarte sobre el producto, en prosa legible.

El sistema MUST, cuando `autopilot` ∈ {`strict`, `true`, `super`}, tratar `teachings.intake` y `teachings.close` como obligatorios (`skipped` NO permitido — condiciona DET-21/DET-22). El teach-intake MUST cubrir "que hay / que se hara / por que"; el teach-close MUST cubrir "que se hizo / por que / que cambio y por que / variaciones del plan original y su motivo". Ambos en prosa didactica.

**Actor**: system
**Layers**: meta (teach-intake, teach-close, deterministic-rules DET-21/22)

<details><summary>Scenarios de validacion</summary>

#### Scenario: skip bloqueado en autopilot
- **GIVEN** `autopilot: strict`, dev intenta `teach off`
- **WHEN** se evalua el gate de teach
- **THEN** el skip se rechaza (teach obligatorio en autopilot)

#### Scenario: teach-close con variaciones
- **GIVEN** un ticket donde el plan cambio mid-execute
- **WHEN** se genera teach-close
- **THEN** incluye que vario del plan original y por que

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en autopilot, intenta `teach off` → rechazado; lee el teach-close y entiende que se hizo y por que sin abrir el chat.

### REQ-06: Intake exhaustivo (gate de cobertura)

> **Que cambia**: antes de habilitar la ejecucion autonoma, el intake verifica que cubrio todo lo necesario, para que la ejecucion no tenga que parar a preguntar.
> **Por que**: un ticket autonomo no puede consultar dudas mid-execute; las dudas deben cerrarse en intake.

El sistema MUST, para tickets que correran en autopilot, reforzar el gate de `intake-explore` con un checklist de cobertura (hipotesis convergidas, scope declarado, decisiones resueltas, sin `assumed` sin resolver). MUST advertir/bloquear el arranque autonomo si la cobertura es insuficiente.

**Actor**: system
**Layers**: meta (intake-explore)

<details><summary>Scenarios de validacion</summary>

#### Scenario: cobertura insuficiente
- **GIVEN** un ticket con hipotesis `assumed` sin resolver, `autopilot: strict`
- **WHEN** se intenta arrancar execute
- **THEN** advierte que el intake no esta completo para modo autonomo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: marca un ticket strict con una hipotesis abierta → el arranque autonomo advierte/bloquea.

### REQ-07: Git hook permanente + escape humano

> **Que cambia**: se instala un git hook que rechaza commits/push directos a `develop`/`master` siempre; tu puedes saltarlo conscientemente con `--no-verify` cuando lo necesites.
> **Por que**: red dura independiente del LLM — el LLM no saltea hooks, asi que en autopilot el bloqueo es efectivo, sin depender de un flag fragil.

El sistema MUST proveer un git hook (`pre-commit` y/o `pre-push`) que rechace commits/push directos a `develop`/`master`. El hook MUST ser permanente (no condicional a autopilot). El dev MAY saltarlo con `--no-verify` (escape consciente humano). El LLM MUST NOT usar `--no-verify` (regla global: no saltear hooks salvo pedido explicito).

**Actor**: system / dev
**Layers**: config (git hooks del repo)

#### Acceptance
**El usuario puede verificar que funciona**: `git commit` directo en `develop` → rechazado; `git commit --no-verify` → permitido.

### REQ-08: Formalizacion como DET-30 global

> **Que cambia**: todo lo anterior se documenta como una nueva regla determinista DET-30 en el motor DKC, disponible para todos los proyectos.
> **Por que**: el autopilot es motor global; la red de seguridad debe servir a cualquier proyecto, no solo horadric.

El sistema MUST formalizar REQ-01..07 como **DET-30** en `prompts/deterministic-rules.md` (aditiva, referenciando DET-13/16/20/21/22/23/29 sin modificarlas) y regenerar el bloque global de CLAUDE.md via `dkc-export-rules --global`.

**Actor**: system
**Layers**: meta (deterministic-rules, export)

#### Acceptance
**El usuario puede verificar que funciona**: `grep DET-30 prompts/deterministic-rules.md` retorna la regla; el bloque global de CLAUDE.md la incluye.

### REQ-09: HC muestra ejecucion en super autopilot

> **Que cambia**: en el tablero y el detalle de HC, un ticket que se ejecuto en el nivel por-ticket (`super`) muestra un indicador distintivo de "super autopilot", distinto del autopilot por-sesion (`true`).
> **Por que**: para saber de un vistazo que tickets corrieron sin supervision humana y merecen auditoria mas cuidadosa.

El viewer HC MUST mostrar un badge/indicador cuando un ticket se ejecuto en autopilot nivel por-ticket (`super`), derivado del frontmatter `autopilot` + la sub-tabla `### Modo (autopilot)`. MUST distinguirlo visualmente del autopilot por-sesion (`true`) y del modo conversacional.

**Actor**: dev (lo ve)
**Layers**: frontend (horadric-cube: views/components)

#### Acceptance
**El usuario puede verificar que funciona**: abre el tablero HC y los tickets que corrieron en `super` muestran el badge de super autopilot, diferenciados de los `true`.

### REQ-10: Revision por sub-agente aislado del contexto de ejecucion

> **Que cambia**: la revision (en cada gate de sesion y en el cierre) la hace un sub-agente reviewer en contexto limpio, al que el orquestador le pasa los puntos de contencion (spec/REQs + scope + acceptance + diff). No valida su propio trabajo.
> **Por que**: el LLM que ejecuta tiene sesgo de confirmacion; un revisor fresco valida contra el spec literal — es la independencia que en modo manual aporta el humano.

El sistema MUST, en autopilot, ejecutar la revision de cada `S{N}.GATE` (quality review DET-23) y la validacion de cierre (REQ-03) mediante un sub-agente `reviewer` invocado en **contexto limpio** (sin la conversacion de ejecucion), via `dkc:agent-invocation` / `dkc_invoke_agent`. El orquestador MUST pasarle como handoff (DET-9): spec + REQs + `execute_scope` declarado + acceptance checkpoints + el diff de cambios. El reviewer MUST emitir `approve/iterate/escalate` (DET-14) basandose solo en ese handoff. El orquestador MUST **relayear el veredicto del reviewer al chat** (REQ-04) — el dev ve el resultado del QA aunque el sub-agente no escriba directo al chat. Si el host no soporta sub-agentes, MUST degradar a revision inline documentando la limitacion (fallback del fence).

**Actor**: system (reviewer aislado)
**Layers**: meta (request-execute/gates, request-close, agent-invocation)

<details><summary>Scenarios de validacion</summary>

#### Scenario: reviewer detecta desvio que el ejecutor no vio
- **GIVEN** un cambio que cumple la intencion del ejecutor pero no el REQ literal
- **WHEN** el reviewer aislado valida contra spec/REQs
- **THEN** marca `iterate` con el desvio puntual

#### Scenario: handoff incompleto
- **GIVEN** el orquestador no pasa el scope al reviewer
- **WHEN** se invoca la revision
- **THEN** el reviewer reporta que falta input de contencion (no aprueba a ciegas)

#### Scenario: host sin sub-agentes
- **GIVEN** un host LLM sin soporte de sub-agentes
- **WHEN** se invoca el reviewer
- **THEN** degrada a revision inline + documenta la limitacion

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en un gate/cierre autopilot, la revision la firma un reviewer en contexto limpio (no el ejecutor), con los puntos de contencion en su handoff.

### REQ-11: Verificacion automatica de los gates de design antes de execute

> **Que cambia**: antes de arrancar execute (sobre todo en autopilot), el sistema verifica por comando que el design cumplio sus gates obligatorios — incluida la evaluacion de paralelizacion — y bloquea si falta alguno, sin depender de que alguien lo recuerde.
> **Por que**: en autopilot no hay humano que note un gate saltado. Caso real: este mismo spec se genero sin evaluar paralelizacion hasta que el dev lo recordo (learn L1 del ticket).

El sistema MUST, en la transicion a execute (`design-transition-to-execute` / `request-execute` paso 0), correr `dkc-validate StepDecisions` y verificar que existen las entries observables obligatorias del design (`parallelization-assessment`, `spec-approval`, y las que apliquen al work_type). MUST **bloquear** el inicio de execute si falta alguna. En autopilot la verificacion es automatica y no-saltable (no depende de supervision humana). El alcance MAY extenderse a los gates verificables de `_design-shared` (teach-intake, shape de tasks F8).

**Actor**: system
**Layers**: meta (design-transition-to-execute, request-execute/start, dkc-validate)

<details><summary>Scenarios de validacion</summary>

#### Scenario: gate de design faltante bloquea execute
- **GIVEN** un spec sin entry `parallelization-assessment` en `decisions_log`
- **WHEN** se intenta pasar a execute en autopilot
- **THEN** la transicion bloquea y exige completar la evaluacion antes de arrancar

#### Scenario: gates completos
- **GIVEN** todas las entries observables del design presentes
- **WHEN** se transiciona a execute
- **THEN** arranca normal

</details>

#### Acceptance
**El usuario puede verificar que funciona**: omite la entry de paralelizacion e intenta arrancar execute en autopilot → bloquea reportando el gate faltante.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Compatibilidad | Triggers autopilot existentes no se rompen | regresion HOR-022 | 100% triggers funcionan |
| Robustez | Sin estado mutable que se corrompa (no flag de autopilot para el hook) | — | 0 flags persistentes |
| Multi-provider | La guarda/validacion funciona aunque el host no soporte subagentes (fallback inline) | — | degradacion sin perdida |

## Artifacts

### Archivos del motor afectados

| Archivo | Cambio |
|---------|--------|
| `prompts/deterministic-rules.md` | + DET-30 (aditiva) — S7 |
| `prompts/steps/request-execute/transversal.md` | mapa de 4 niveles (agrega `super`) + auto-aprobacion `super` — S1 |
| `prompts/steps/request-intake.md` | sec 0: 4 niveles + trigger `super` (sin romper triggers) — S1 |
| `commands/lib/schemas/ticket.ts` | `'super'` en `TicketAutopilotEnum` + doc + test — S1.T3 (propagacion DET-16) |
| `prompts/steps/request-execute/session-gate.md` | commit-gate: `true` se detiene esperando OK / `super` auto-commitea — S1.T3 |
| `prompts/steps/request-execute/start.md` | guarda de inicio (rama + scope) bloqueante en autopilot — S2 |
| `prompts/steps/request-execute/task-loop.md` | streaming de avances + niveles de gate — S4 |
| `prompts/steps/request-close.md` | validacion de cierre reforzada en autopilot — S3 |
| `prompts/steps/intake-explore.md` | gate de cobertura para autopilot — S6 |
| `prompts/steps/teach-intake.md` / `teach-close.md` | formato reforzado + no-skip en autopilot — S5 |
| `templates/records/ticket.md` | doc 4 niveles del frontmatter `autopilot` (S1.T2) + campo `execute_scope` (S2) |
| `.git/hooks/pre-commit` (o `pre-push`) | bloqueo develop/master (script versionado en repo + instalador) — S7 |

## Tasks

### Session 1 — Modelo de los 2 niveles de autopilot [tipo: ⚑ fuerte] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Modelo de 4 niveles: AGREGAR `super` (por-ticket) preservando false/strict/true; documentar mapa en `transversal.md` + trigger en `request-intake.md` sin romper triggers | REQ-01 | developer | — | `prompts/steps/request-execute/transversal.md`, `prompts/steps/request-intake.md` | manual (revisar tabla triggers intacta) | git revert | DET-1, DET-16 | done | 1 |
| S1.T2 | Actualizar doc del frontmatter `autopilot` (template ticket) con la semantica de niveles | REQ-01 | developer | S1.T1 | `templates/records/ticket.md` | lint frontmatter | git revert | DET-16 | done | 1 |
| S1.T3 | Propagacion DET-16 del modelo de 4 niveles (descubierta al retomar — S1.T1 commiteo el nucleo sin propagar): (a) agregar `'super'` al validator `TicketAutopilotEnum` + doc + test; (b) corregir commit-gate en `session-gate.md` (`true` se detiene esperando OK / `super` auto-commitea); (c) marcar `super` en la auto-aprobacion de `transversal.md:78`; (d) coherencia de scenarios del spec (REQ-01/02/04/05/06: `strict`→`super` donde describe por-ticket; sumar `super` a los sets de autopilot) | REQ-01 | developer | S1.T1 | `commands/lib/schemas/ticket.ts`, `prompts/steps/request-execute/session-gate.md`, `prompts/steps/request-execute/transversal.md`, `specs/SPEC-workflow-autopilot-safety-net.md` | vitest schema (ticket.ts self-test) + manual (scenarios) | git revert | DET-16 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T1) — dev aprueba el modelo de niveles (⚑ fuerte) | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Guarda de inicio + campo scope [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Agregar campo `execute_scope` (repos/paths permitidos) al frontmatter del template de ticket + doc. Renombrado de `scope`→`execute_scope` por colision con clave reservada de rules (DEC-LOCAL-06) | REQ-02 | developer | S1.GATE | `templates/records/ticket.md`, `commands/lib/schemas/ticket.ts` | lint frontmatter + schema self-test | git revert | DET-2, DET-16 | done | 2 |
| S2.T2 | Guarda en request-execute/start (gate 0b): verificar rama ≠ develop/master/main + `execute_scope` declarado, bloqueante en autopilot | REQ-02 | developer | S2.T1 | `prompts/steps/request-execute/start.md` | manual (simular develop) | git revert | DET-29, RULE-dev-004 | done | 2 |
| S2.T3 | Verificacion automatica de gates de design (gate 0c en start.md + checklist en design-transition): correr `dkc-validate StepDecisions` + chequeo directo de `decisions_log` (parallelization-assessment, spec-approval); no-saltable en autopilot. Amplia `validate.ts` con cobertura `spec-approval` | REQ-11 | developer | S1.GATE | `prompts/steps/design-transition-to-execute.md`, `prompts/steps/request-execute/start.md`, `commands/lib/validate.ts` | manual (omitir entry → bloquea) | git revert | DET-11, DET-29 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T2) — dev aprueba la guarda (⚑ fuerte) | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Reviewer aislado + validacion de cierre reforzada [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Mecanismo de reviewer aislado: modo aislado en `reviewer.md` (contexto limpio + handoff DET-9 spec/REQs/execute_scope/acceptance/diff + no aprueba a ciegas + relay REQ-04) + invocacion en `session-gate.md` para el quality review del gate (fence `dkc:agent-invocation`); fallback inline si host sin sub-agentes | REQ-10 | developer | S2.GATE | `prompts/agents/reviewer.md`, `prompts/steps/request-execute/session-gate.md` | manual (dogfooded en S3.GATE) | git revert | DET-9, DET-10, DET-14, DET-23 | done | 3 |
| S3.T2 | Validacion de cierre reforzada en request-close (sec 1d, consolida DET-13+16+23 + chequeo execute_scope/rama) ejecutada por el reviewer aislado de S3.T1; precondicion de `status: closed` en sec 6 | REQ-03 | developer | S3.T1 | `prompts/steps/request-close/checkpoints-and-close.md` | manual (simular fuera de scope) | git revert | DET-13, DET-16, DET-23 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T2) — quality review por reviewer aislado (dogfooding REQ-10): approve (⚑ fuerte) | — | reviewer | S3.T1, S3.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Streaming de avances al chat [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Convencion de reporte de progreso por task/gate en task-loop + punto de interrupcion documentado. Tambien: clausula de proporcionalidad del reviewer aislado en session-gate.md (L7 — T1 auto trivial puede ir inline light) | REQ-04 | developer | S3.GATE | `prompts/steps/request-execute/task-loop.md`, `prompts/steps/request-execute/session-gate.md` | manual | git revert | DET-29 | done | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier T1) — inline light (proporcionalidad L7) | — | reviewer | S4.T1 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 4 |

### Session 5 — Teach reforzado (MUST en autopilot) [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S5.T1, S5.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Condicionar DET-21/22: en autopilot `teachings` no admite `skipped` (no-skip gate) | REQ-05 | developer | S4.GATE | `prompts/steps/teach-intake.md`, `prompts/steps/teach-close.md` | reviewer aislado (T2) | git revert | DET-21, DET-22 | done | 5 |
| S5.T2 | Reforzar formato didactico: intake (que-hay/que-se-hara/por-que), close (que-se-hizo/por-que/variaciones); prosa legible | REQ-05 | developer | S4.GATE | `templates/outputs/teach-intake.md`, `templates/outputs/teach-close.md` | reviewer aislado (T2) | git revert | DET-21, DET-22 | done | 5 |
| **S5.GATE** | Gate de sync Session 5 (tier T2, ⚑ fuerte) — reviewer aislado approve | — | reviewer | S5.T1, S5.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 5 |

### Session 6 — Intake exhaustivo (gate de cobertura) [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | GATE 3 en `intake-explore.md`: cobertura adicional en autopilot — hipotesis convergidas, `execute_scope` declarado, sin `assumed` sin razon, decisiones pendientes resueltas, nota REQ-11 | REQ-06 | developer | S5.GATE | `prompts/steps/intake-explore.md` | inline light (T1) | git revert | DET-1, DET-11 | done | 6 |
| **S6.GATE** | Gate de sync Session 6 (tier T1, auto) — inline light (proporcionalidad) | — | reviewer | S6.T1 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 6 |

### Session 7 — DET-30 + git hook + export global [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S7.T1, S7.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S7.T1 | Escribir DET-30 (aditiva) consolidando REQ-01..08 + REQ-10/11, referenciando DET-13/16/20/21/22/23/27/29 | REQ-08 | developer | S6.GATE | `prompts/deterministic-rules.md` | manual (lint DET) | git revert | DET-16 | done | 7 |
| S7.T2 | Git hook pre-commit/pre-push (bloqueo develop/master/main) + instalador idempotente `commands/install-git-hooks` (escape humano --no-verify, LLM nunca) | REQ-07 | developer | S6.GATE | `commands/install-git-hooks`, `.git/hooks/pre-commit`, `.git/hooks/pre-push` | logico (rama protegida → block, HOR-079 → pass) + --check | rm hook + uninstall | DET-8 | done | 7 |
| S7.T3 | Regenerar export global (`dkc-export-rules --global`) + regresion de validators (schema, Ticket, StepDecisions, SessionCheckboxes) | REQ-08 | developer | S7.T1 | `~/.claude/CLAUDE.md` (auto-gen, fuera de repo) | regresion validators (verde) | regenerar desde estado previo | DET-16 | done | 7 |
| **S7.GATE** | Gate de sync Session 7 (tier T3, ⚑ fuerte) — DET-30 escrita, hook funcional, export regenerado, regresion verde; reviewer aislado approve | — | reviewer | S7.T1, S7.T2, S7.T3 | ticket | gate persistido + regresion T3 | (no aplica) | DET-20, DET-23 | done | 7 |

### Session 8 — Badge de super autopilot en HC viewer [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S8.T1 | MVP: helper tipado `autopilotMode()` + `isAutopilotActive()` en `frontmatter.ts` (4 valores false/strict/true/super), 6 vitest. Parseo de la sub-tabla `### Modo (autopilot)` queda como mejora futura (B4) | REQ-09 | developer | S7.GATE | `horadric-cube/server/deckard/frontmatter.ts`, `frontmatter.test.ts` | vitest 13/13 | git revert | DET-16 | done | 8 |
| S8.T2 | Badge visual diferenciado en `TicketDetail.vue` (header del ticket): super → red 500/15, true → amber 500/10, strict → sky 500/10, false → sin badge; tooltip explicativo por modo | REQ-09 | developer | S8.T1 | `horadric-cube/src/views/TicketDetail.vue` | vue-tsc -b exit 0 + reviewer aislado | git revert | DET-23 | done | 8 |
| **S8.GATE** | Gate de sync Session 8 (tier T2, auto) — reviewer aislado approve | — | reviewer | S8.T1, S8.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 8 |

## Constraints

- DET-30 aditiva: NO modificar DETs existentes, solo referenciarlas.
- Preservar 100% de los triggers autopilot de HOR-022 (regresion).
- El git hook se versiona como script en el repo + instalador (los hooks de `.git/` no se commitean directo).

## Dependencies

- Internas: DET-13, DET-16, DET-20, DET-21, DET-22, DET-23, DET-29, RULE-dev-004.
- Externas: el permission mode del harness (el dev lo activa al lanzar — fuera de DKC).

## Risks and mitigations

| Riesgo | Mitigacion |
|--------|-----------|
| DET-30 global impacta todos los proyectos al regenerar CLAUDE.md | S7 con regresion de validators + DET aditiva; aprobado como deseable |
| Romper triggers existentes | S1 gate ⚑ fuerte + regresion HOR-022 |
| Streaming verboso satura el chat | Reporte conciso por task/gate, no por accion |

## Open questions

- Resueltas en intake (DET global, git hook permanente, 2 niveles via enum). Las de diseño fino (mecanismo exacto de no-skip, formato del reporte de streaming) se cierran en sus sessions (S5, S4).

## Decisions

### DEC-LOCAL-01: Git hook permanente, no condicional a autopilot
Drivers: robustez (sin flag huerfano) + red dura independiente del LLM. Alternativas: condicional via flag (descartada — fragil), follow-up (descartada — deja la red para despues). Consecuencia: el humano usa `--no-verify` para casos excepcionales; el LLM nunca.

### DEC-LOCAL-02: Alcance DET-30 global
Drivers: el autopilot es motor global. Alternativa: rule acotada a horadric (descartada — habria que promover despues). Consecuencia: regenera el bloque global de CLAUDE.md.

### DEC-LOCAL-03: 2 niveles via enum existente
Drivers: preservar los 3 modos existentes + no romper triggers. Hallazgo (L2): el modelo de modos ya existia en `transversal.md`; `true` (optimistic) ya era por-sesion porque DET-27 detiene el commit de cada sesion. Decision: **AGREGAR `super`** (4o valor, por-ticket) en vez de redefinir. Consecuencia: `false`/`strict`/`true` intactos; `super` auto-commitea local y no para. (Revierte la decision original "no 4o estado", que se tomo sin conocer la semantica existente.)

### DEC-LOCAL-04: Reviewer aislado en cierre + cada gate
Drivers: independencia del revisor (sin sesgo de confirmacion), critico en autopilot sin supervision humana. Alternativas: revisar inline con el mismo LLM (descartada — mismo sesgo); reviewer solo en cierre (descartada — el dev eligio cierre + gates para robustez). Consecuencia: un sub-agente reviewer por gate + cierre, con handoff DET-9 de puntos de contencion; fallback inline si el host no soporta sub-agentes.

### DEC-LOCAL-05: Badge HC dentro de HOR-079 (no ticket aparte)
Drivers: entrega unica con el indicador visual. Alternativa: ticket aparte de module views (descartada — el dev eligio incluirlo). Consecuencia: S8 toca horadric-cube (viewer), mezclando motor (workflow) + viewer (views) en el mismo ticket.

### DEC-LOCAL-06: campo `execute_scope` (no `scope`) por colision de clave reservada (S2.T1)
Drivers: REQ-02 pedia un campo `scope` en el frontmatter del ticket, pero `scope` YA es una clave reservada en DKC — las rules la usan para `module`/`global` y el indexer Python (`records.py:71 fm.get("scope","module")`) + el parser de HC (`server/deckard/templates.ts:89`, `sqlite.ts`, `api/client.ts`) la leen como **string** para TODOS los records. Un `scope` lista en un ticket crasheaba el reindex (pydantic: "Input should be a valid string"). Alternativas: (a) coercionar a string en cada consumer (descartada — fragil, parche por-consumer en Python + TS); (b) renombrar a `execute_scope` (elegida). Consecuencia: el campo del ticket se llama `execute_scope`; resuelve la colision en todos los consumers sin tocar el indexer ni el parser (no leen esa clave). Aprendizaje L4: un campo nuevo de frontmatter debe verificar TODOS los consumers (validator TS + indexer Python + parser HC), no solo el schema TS — extension de la leccion L3 (S1.T3).

## Success metrics

| Metric | Target |
|--------|--------|
| Triggers HOR-022 preservados | 100% |
| REQs cubiertos | 8/8 |
| Guarda bloquea en develop/master | si |
| Cierre bloquea fuera de scope | si |

## Technical reference

- Autopilot actual: `prompts/steps/request-intake.md` sec 0.
- Arranque execute: `prompts/steps/request-execute/start.md` (G-init DET-29).
- Cierre: `prompts/steps/request-close.md` + DET-13/16/23.
- Precedente rama-de-ticket: `RULE-dev-004` (up1).

## Rules discovered

{Se llena durante execute.}

## Bugs found

{Se llena durante execute.}

## Acceptance checkpoints

- [ ] REQ-01..08 verificados con sus acceptance.
- [ ] Triggers HOR-022 sin regresion.
- [ ] Guarda de inicio bloquea en develop/master + scope ausente.
- [ ] Validacion de cierre bloquea fuera de scope.
- [ ] Git hook rechaza develop/master directo; `--no-verify` pasa.
- [ ] DET-30 en deterministic-rules.md + export global regenerado.
- [ ] Revision de gates + cierre ejecutada por reviewer aislado (handoff de puntos de contencion); degrada inline sin sub-agentes.
- [ ] HC muestra badge de super autopilot en tickets super, diferenciado de true.
- [ ] La transicion a execute corre `dkc-validate StepDecisions` y bloquea si falta una entry observable de design (no-saltable en autopilot).
