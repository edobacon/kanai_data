---
id: SPEC-deckard-core-delegation-off-contract-133
project: horadric
ticket: HOR-133
status: done
---

# Contrato de apagado y descubribilidad del flag de delegacion

# Contrato de apagado y descubribilidad del flag de delegacion

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Fix scope, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: hoy un ticket no tiene forma de apagar la delegacion que hereda de su proyecto. El trigger `delegacion off` escribe `delegation: null`, y el resolver de `dkc-delegate` no reconoce ese valor: cae al bloque del proyecto y sigue gastando cuota del backend externo. Reproducido en intake: las cuatro formas plausibles de opt-out (`null`, `false`, `{}`, `{ enabled: false }`) resuelven todas `source: project-config`. El sintoma se lee como "el trigger no hizo nada". Ademas el campo no existe en el template del ticket, asi que la capacidad no es descubrible. Este fix fija el contrato de los tres estados, lo hace verificable con una regresion del caso latente, y lo propaga a los cuatro consumidores que hoy declaran la semantica por separado.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `delegation: false` es el off explicito; `null`/ausente sigue significando "no declarado" (hereda del proyecto) | Ya decidida por el dev en intake (D1 del ticket). Sin la distincion, el template no puede declarar `delegation: null` como default sin apagar el proyecto en cada ticket nuevo (H6) |
| 2 | `{ enabled: false }` a nivel ticket tambien resuelve off, aunque la forma canonica sea `false` | Es la unica forma restante que quedaria fallando en silencio (H2). Es tolerancia defensiva, no una segunda forma documentada: docs y template ensenan solo `false` |
| 3 | El bloque de resolucion sale del heredoc de `dkc-delegate` a `commands/lib/delegation-policy.py` | Hoy la semantica no es testeable sin extraer el heredoc con `awk`. Mover el bloque la hace importable por la regresion y cumple el "una sola fuente de verdad" que pide el ticket. Es extraccion sin cambio de comportamiento, verificada por paridad antes de tocar la logica |

**Riesgos principales y como los mitigamos**:

- **Tocar por accidente el clasificador de fallos o el fallback de `dkc-delegate`** (HOR-130 S4, explicitamente prohibido por `execute_scope`) → S1.T4 es una verificacion de diff acotada: el unico cambio permitido en el comando es la linea que invoca al modulo extraido. Un reviewer aislado la contrasta contra el `execute_scope`.
- **Que la extraccion cambie comportamiento sin que nadie lo note** → S1.T2 escribe la matriz de regresion ANTES del fix y S1.T1 exige paridad del JSON de salida contra el baseline capturado en intake (las 6 formas x proyecto activo/inactivo).
- **Que HC y el comando queden desincronizados otra vez** → S2.T2 replica en `vitest` la MISMA matriz de 12 casos que corre pytest sobre el comando. Divergir obliga a que falle uno de los dos.
- **Que el nuevo default del template apague la delegacion por proyecto** → precisamente lo que evita la decision 1; TC-06 lo fija como test.

**Que NO se hace en este ticket** (limites explicitos del scope):

- El clasificador de fallos y el fallback del comando (HOR-130 S4) — fuera de `execute_scope`.
- La resolucion del binario de codex (HOR-132).
- Backends nuevos: `codex` sigue siendo el unico.
- El badge de HC: un off explicito resuelve `null`, o sea "sin delegacion", que es lo que el badge ya sabe representar. No se toca `DelegationBadge.vue` ni `shared/types.ts`.

**Tamano estimado**: 2 sessions ejecutables (S1-S2), aproximadamente 3-4h efectivas. La mas riesgosa es S1, porque toca un comando compartido con logica que el ticket prohibe modificar.

**Como vas a saber que funciona**:

- Corro `pytest server/tests/test_delegation_policy.py` y pasa todo: las 12 combinaciones de la matriz (incluida la que hoy falla: proyecto activo + ticket apagado → off), los defaults del bloque declarado, y los cuatro tickets reales de horadric resolviendo igual que antes del fix.
- Abro un ticket nuevo generado desde el template y veo el campo `delegation` con los tres estados documentados.
- Le escribo `delegacion off` al LLM y el frontmatter queda en `delegation: false`, no en `null`.
- Corro `npm test` en horadric-cube y el espejo pasa la misma matriz.

---

## Purpose

Fijar el contrato de tres estados del campo `frontmatter.delegation` (`{...}` = on, `false` = off explicito, `null`/ausente = no declarado) en el resolver canonico de `commands/dkc-delegate`, hacerlo verificable con una regresion del caso latente, y propagarlo (DET-16) a los tres consumidores que hoy repiten la semantica por su cuenta: el espejo de HC, el template del ticket y el trigger conversacional del intake.

## Requirements

### REQ-FIX-01: Off explicito por ticket

> **Que cambia**: un ticket puede apagar la delegacion que hereda de su proyecto escribiendo `delegation: false`. Hoy no puede: ninguna forma de opt-out corta el fallback.
> **Por que**: sin esto, un proyecto que active el bloque `delegation:` deja a todos sus tickets sin salida y gastando cuota del backend externo.

El resolver MUST tratar `frontmatter.delegation: false` como **off explicito**: no consulta el bloque `delegation:` del `config.yaml` del proyecto y resuelve `source: off` con la lista de roles vacia.

El resolver MUST seguir tratando `delegation: null` y la **ausencia** del campo como "no declarado": consulta el bloque del proyecto y, si no hay o no declara `enabled: true`, resuelve `source: off`.

<details><summary>Scenarios de validacion</summary>

**Scenario: apagado explicito con proyecto activo**
GIVEN un `projects/{p}/config.yaml` con `delegation.enabled: true`
AND un ticket de ese proyecto con `delegation: false`
WHEN se resuelve la politica del rol `reviewer`
THEN el resultado es `source: off` y `roles: []`

**Scenario: no declarado con proyecto activo (hereda)**
GIVEN el mismo `config.yaml` activo
AND un ticket con `delegation: null` (o sin el campo)
WHEN se resuelve la politica
THEN el resultado es `source: project-config` con los roles del proyecto

**Scenario: apagado explicito sin proyecto activo**
GIVEN un `config.yaml` sin bloque `delegation:` (o comentado)
AND un ticket con `delegation: false`
WHEN se resuelve la politica
THEN el resultado es `source: off` — identico al caso "no declarado", sin error

</details>

### REQ-FIX-02: Tolerancia a `{ enabled: false }` en el ticket

> **Que cambia**: un bloque de ticket que declara `enabled: false` tambien apaga, en vez de contar como "no declarado" y caer al proyecto.
> **Por que**: es la unica forma de opt-out que quedaria fallando en silencio despues del REQ-FIX-01, y es la que un dev escribe por simetria con el bloque del proyecto (H2 del ticket).

El resolver MUST tratar un bloque de ticket que declare `enabled: false` como off explicito, con el mismo resultado que `delegation: false`.

El resolver MUST seguir tratando un bloque **vacio** (`{}`) o sin ninguna clave reconocida como "no declarado" (cae al proyecto): la ausencia de informacion no es una declaracion de apagado.

La forma **canonica y documentada** del off sigue siendo `false`. `{ enabled: false }` es tolerancia defensiva: el template, el trigger y `docs/delegation.md` ensenan `false`, y la doc la menciona en una linea como forma aceptada.

<details><summary>Scenarios de validacion</summary>

**Scenario: enabled false a nivel ticket**
GIVEN un `config.yaml` con `delegation.enabled: true`
AND un ticket con `delegation: { enabled: false }`
WHEN se resuelve la politica
THEN el resultado es `source: off`

**Scenario: bloque vacio no es apagado**
GIVEN el mismo `config.yaml` activo
AND un ticket con `delegation: {}`
WHEN se resuelve la politica
THEN el resultado es `source: project-config` — un bloque vacio no declara nada

</details>

### REQ-FIX-03: Descubribilidad del flag desde el template

> **Que cambia**: un ticket recien scaffoldeado muestra el campo `delegation` con sus tres estados y a donde ir por el detalle.
> **Por que**: hoy la capacidad solo se descubre leyendo `docs/delegation.md` o el frontmatter de otro ticket (H3).

`templates/records/ticket.md` MUST declarar el campo `delegation` en el frontmatter canonico con su default `null`, un comentario que enumere los tres estados y el puntero a `docs/delegation.md`, siguiendo el mismo patron de comentario que ya usan `autopilot` y `execute_scope`.

El default del template MUST ser `null` (no declarado), NO `false`: un ticket nuevo hereda del proyecto, no lo apaga.

### REQ-FIX-04: El trigger escribe el valor que el resolver reconoce

> **Que cambia**: `delegacion off` pasa a escribir `delegation: false` en vez de `delegation: null`.
> **Por que**: es lo que cierra el circuito — el trigger prometia un apagado que el resolver no leia.

La fila del trigger de apagado en `prompts/steps/request-intake.md` MUST indicar `delegation: false`, y MUST dejar de sugerir "o quitar el bloque" como equivalente (quitar el bloque es "no declarado", no "off").

La fila del trigger de encendido MUST quedar sin cambios: sigue escribiendo el bloque inline.

### REQ-FIX-05: Una sola semantica, espejada por consumidor

> **Que cambia**: la resolucion vive en un modulo importable (`commands/lib/delegation-policy.py`) y HC la espeja explicitamente contra el; la matriz de comportamiento se documenta una vez.
> **Por que**: el ticket pide "una sola fuente de verdad de la resolucion que HC y dkc-delegate compartan en semantica, sin una tercera copia".

`commands/dkc-delegate` MUST resolver la politica invocando `commands/lib/delegation-policy.py`, sin conservar una copia de la logica.

`horadric-cube:server/deckard/delegation.ts` MUST espejar los tres estados y MUST mantener el comentario de cabecera apuntando al modulo canonico como fuente de verdad.

`docs/delegation.md` MUST publicar la matriz de comportamiento (valor → significado → resolucion) una sola vez, y las secciones Activar/Apagar MUST referirla en vez de repetirla.

### REQ-REGRESSION-01: Lo que ya funcionaba sigue funcionando

> **Que cambia**: nada. Este REQ existe para fijarlo con tests.
> **Por que**: la extraccion del bloque y el cambio de semantica tocan el camino que HOR-130/HOR-131 ya usan en produccion.

El sistema MUST preservar:

1. **Precedencia del bloque declarado**: un ticket con `delegation: { backend, roles, tier }` resuelve `source: ticket` con sus valores, por encima del proyecto.
2. **Defaults**: `backend` default `codex` y `budget_tokens` default `2000000` cuando el bloque no los declara.
3. **Bloque comentado del proyecto no activa nada**: el template comentado de `config.yaml` sigue sin encender la delegacion.
4. **`enabled: true` sigue siendo obligatorio a nivel proyecto** para que el bloque del `config.yaml` cuente.
5. **El clasificador de fallos y el fallback de `dkc-delegate` (HOR-130 S4) quedan intactos** — verificable por diff.
6. **Los tickets existentes no cambian de resolucion**: HOR-130/HOR-131 (bloque declarado) siguen en `source: ticket`; HOR-132 (`delegation: null`) sigue resolviendo off porque ningun proyecto tiene el bloque activo.

<details><summary>Scenarios de validacion</summary>

**Scenario: paridad de la extraccion**
GIVEN la matriz de 12 combinaciones (6 formas de ticket x proyecto activo/inactivo)
WHEN se corre el modulo extraido ANTES de aplicar el cambio de semantica
THEN el JSON de salida es identico al baseline capturado en intake para las 12

**Scenario: el comando no cambio fuera del bloque de politica**
GIVEN el diff de `commands/dkc-delegate` de esta rama
WHEN se inspeccionan las lineas cambiadas
THEN todas caen dentro del bloque de resolucion de la politica; el clasificador de fallos y el fallback no aparecen en el diff

**Scenario: defaults del bloque declarado (preservacion 2)**
GIVEN un ticket con `delegation: { roles: [tester] }` — sin `backend` ni `budget_tokens`
WHEN se resuelve la politica
THEN `source: ticket`, `backend: codex` y `budget_tokens: 2000000`

**Scenario: precedencia y defaults del bloque de proyecto (preservaciones 3 y 4)**
GIVEN un `config.yaml` cuyo bloque `delegation:` esta comentado
WHEN se resuelve la politica de un ticket sin campo
THEN `source: off` — el template comentado no activa nada
AND con el bloque descomentado pero SIN `enabled: true`, el resultado sigue siendo `source: off`

**Scenario: los tickets reales no cambian de resolucion (preservacion 6)**
GIVEN los cuatro tickets de horadric que hoy declaran el campo (HOR-130, HOR-131 con bloque inline; HOR-132 con `null`; HOR-133 con bloque inline)
WHEN se resuelve la politica de cada uno contra el `config.yaml` real del proyecto
THEN el resultado es identico al capturado en el baseline pre-fix: `source: ticket` para los tres con bloque, `source: off` para HOR-132

</details>

## Fix scope

### Antes (comportamiento actual, reproducido en intake)

Con un proyecto que declara `delegation.enabled: true`, **las seis formas** de frontmatter resuelven asi:

| `frontmatter.delegation` | Resolucion actual |
|--------------------------|-------------------|
| `{ backend, roles, tier }` | `source: ticket` ✅ |
| `null` | `source: project-config` ❌ (deberia apagar) |
| `false` | `source: project-config` ❌ |
| `{ enabled: false }` | `source: project-config` ❌ |
| `{}` | `source: project-config` (correcto por accidente) |
| ausente | `source: project-config` ✅ |

### Despues (comportamiento esperado)

| `frontmatter.delegation` | Significado | Resolucion |
|--------------------------|-------------|------------|
| `{ backend, roles, tier, ... }` | on declarado por el ticket | `source: ticket` |
| `false` | **off explicito** (canonico) | `source: off`, `roles: []` |
| `{ enabled: false }` | off explicito (tolerado) | `source: off`, `roles: []` |
| `null` | no declarado | bloque del proyecto, o off |
| ausente | no declarado | bloque del proyecto, o off |
| `{}` | no declarado (no informa nada) | bloque del proyecto, o off |

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `deckard:commands/lib/delegation-policy.py` | **Nuevo**: el bloque de resolucion extraido del heredoc + los dos estados de off | Fuente de verdad de la semantica; lo consumen el comando y la regresion |
| `deckard:commands/dkc-delegate` | El heredoc `PYPOLICY` se reemplaza por la invocacion del modulo. Nada mas | Unico consumidor del bloque. El clasificador de fallos y el fallback no se tocan |
| `deckard:server/tests/test_delegation_policy.py` | **Nuevo**: matriz de 12 casos + paridad de la extraccion | Fija el contrato; corre en la suite pytest existente |
| `deckard:templates/records/ticket.md` | Campo `delegation: null` documentado en el frontmatter | Todo ticket scaffoldeado desde ahora |
| `deckard:prompts/steps/request-intake.md` | Fila del trigger de apagado: `null` → `false` | El LLM escribe el valor que el resolver lee |
| `deckard:docs/delegation.md` | Matriz canonica + Activar/Apagar referida a ella | Doc de la capacidad |
| `horadric-cube:server/deckard/delegation.ts` | `resolveTicketDelegation` reconoce los dos estados de off | `server/routes/tickets.ts` (board + detalle). Off explicito resuelve `null`, que los consumidores ya manejan |
| `horadric-cube:server/deckard/delegation.test.ts` | Misma matriz de 12 casos en vitest | Espejo verificable del comando |

**Consumidores verificados (analisis de impacto colateral)**: `resolveTicketDelegation` y `readProjectDelegation` se consumen solo desde `server/routes/tickets.ts:60,172,290`. El valor viaja como `TicketDelegation | null` a `shared/types.ts:114` (`delegation?: TicketDelegation | null`) y de ahi a `DelegationBadge.vue` / `TicketCard.vue` / `TicketDetail.vue`, que **ya manejan el caso `null`** (no renderizan badge). Un off explicito produce `null`, o sea el camino que esos componentes ya recorren cuando no hay delegacion. Por eso no requieren cambio y quedan fuera de `execute_scope`.

## Tasks

### Session 1 — Semantica canonica del apagado en el resolver [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Capturar el baseline de la matriz (12 combinaciones) corriendo el resolver ACTUAL, y extraer el bloque `PYPOLICY` a `commands/lib/delegation-policy.py` invocado desde el comando, con paridad byte a byte del JSON contra el baseline | REQ-FIX-05, REQ-REGRESSION-01 | developer | — | `commands/dkc-delegate`, `commands/lib/delegation-policy.py` | TC-02: el JSON de las 12 combinaciones es identico antes y despues de la extraccion | `git revert` (la extraccion es un commit propio, separado del cambio de semantica) | DET-8, DET-16, RULE-workflow-verify-the-record-018 | done | 1 |
| S1.T2 | Escribir la suite de regresion en pytest con la semantica ESPERADA (post-fix). Tres bloques: (a) matriz de 6 formas de ticket x proyecto activo/inactivo = 12 casos; (b) defaults del bloque declarado — `backend: codex` y `budget_tokens: 2000000` cuando el ticket no los declara, y `enabled: true` obligatorio + bloque comentado inerte a nivel proyecto; (c) los 4 tickets reales de horadric (HOR-130/131/132/133) contra el `config.yaml` real. Correrla y confirmar que falla exactamente en los casos de off | REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION-01 | developer | S1.T1 | `server/tests/test_delegation_policy.py` | Rojo pre-fix EXACTAMENTE en TC-01 (`false`) y TC-04 (`{ enabled: false }`) con proyecto activo — son los dos unicos casos cuyo resultado esperado cambia. TC-03 (`null`) y TC-05 (`{}`) verdes desde el inicio: siguen heredando, la matriz no los mueve. TC-11 y TC-12 tambien verdes desde el inicio (preservacion, no fix) | `git revert` | DET-7, DET-8 | done | 1 |
| S1.T3 | Implementar D1 en `delegation-policy.py`: `false` → off explicito; bloque con `enabled: false` → off explicito; `null`/ausente/`{}` → no declarado. Correr la suite hasta verde | REQ-FIX-01, REQ-FIX-02 | developer | S1.T2 | `commands/lib/delegation-policy.py` | TC-01..TC-05 en verde; TC-11 y TC-12 siguen verdes (el fix no rompe preservacion); `pytest server/tests/test_delegation_policy.py` sin fallos | `git revert` | DET-8, DET-16 | done | 1 |
| S1.T4 | Verificar por diff que `commands/dkc-delegate` solo cambio en el bloque de politica: el clasificador de fallos y el fallback de HOR-130 S4 no aparecen en el diff | REQ-REGRESSION-01 | reviewer | S1.T3 | `commands/dkc-delegate` | TC-07: el diff del comando esta contenido en el bloque de resolucion; ninguna linea del clasificador ni del fallback | n/a (verificacion) | DET-10, DET-13, DET-33 | done | 1 |
| S1.GATE | Gate de session: persistir, verificar tier T2 (pytest verde + diff acotado), verificar el self-report del reviewer (DET-33), quality review (DET-23) y commits granulares (DET-27) | — | reviewer | S1.T4 | — | Suite pytest de deckard verde; `dkc-verify-gate` sin errores | n/a | DET-13, DET-23, DET-27, DET-33 | done | 1 |

### Session 2 — Propagacion a los consumidores de la semantica (DET-16) [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S2.T1, S2.T3, S2.T4, S2.T5]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Espejar los dos estados de off en `resolveTicketDelegation` de HC y actualizar el comentario de cabecera para que apunte al modulo canonico (hoy documenta el comportamiento viejo como intencional) | REQ-FIX-01, REQ-FIX-02, REQ-FIX-05 | developer | S1.GATE | `horadric-cube:server/deckard/delegation.ts` | TC-08: la matriz de 12 casos resuelve igual que el comando | `git revert` | DET-16 | done | 2 |
| S2.T2 | Replicar la matriz de 12 casos en vitest con los mismos nombres de caso que la suite pytest (para que la divergencia sea legible), conservando los casos de defaults que el archivo ya tiene | REQ-FIX-05, REQ-REGRESSION-01 | developer | S2.T1 | `horadric-cube:server/deckard/delegation.test.ts` | TC-08: `npx vitest run server/deckard/delegation.test.ts` verde, 12 casos de la matriz + los de defaults preexistentes | `git revert` | DET-7 | done | 2 |
| S2.T3 | Declarar `delegation: null` en el frontmatter del template con comentario de los tres estados + puntero a `docs/delegation.md`, siguiendo el patron de `autopilot`/`execute_scope` | REQ-FIX-03 | developer | S1.GATE | `templates/records/ticket.md` | TC-06: un ticket scaffoldeado trae el campo con default `null` y sigue resolviendo por el proyecto | `git revert` | DET-16 | done | 2 |
| S2.T4 | Cambiar la fila del trigger de apagado a `delegation: false` y sacar el "o quitar el bloque" (que es no-declarado, no off). La fila de encendido queda igual | REQ-FIX-04 | developer | S1.GATE | `prompts/steps/request-intake.md` | TC-09: la fila indica `false`; `dkc-validate-step-references` sin errores | `git revert` | DET-3, DET-16 | done | 2 |
| S2.T5 | Publicar la matriz canonica de comportamiento en `docs/delegation.md` y reescribir Activar/Apagar para referirla; mencionar `{ enabled: false }` como forma tolerada | REQ-FIX-05 | developer | S1.GATE | `docs/delegation.md` | TC-10: la doc declara los tres estados y no contradice al resolver | `git revert` | DET-37 (dim 1) | done | 2 |
| S2.T6 | Capturar la leccion transversal como RULE del KB: un valor centinela solo sirve si el productor (trigger/template) y el consumidor (resolver) coinciden, y la forma de verificarlo es la matriz de estados, no el caso feliz | REQ-FIX-05 | scribe | S2.T2 | `projects/horadric/rules/workflow/` | La rule existe, valida con `dkc-validate Rule` y queda referida desde el ticket | `git revert` | DET-11, DET-37 (dim 2) | done | 2 |
| S2.GATE | Gate de session: persistir, verificar tier T2 (pytest + vitest verdes), dual-judge (DET-35, T2), verificar self-report (DET-33), commits granulares por repo (DET-27) | — | reviewer | S2.T6 | — | Ambas suites verdes; `dkc-verify-gate` sin errores; ningun cambio fuera de `execute_scope` | n/a | DET-13, DET-23, DET-27, DET-33, DET-35 | done | 2 |

## Constraints

- **DET-16 (propagacion)**: el eje del ticket. Cambiar el resolver sin propagar a template/trigger/doc/HC reproduce el mismo desfase productor-consumidor que se esta arreglando.
- **DET-8 (rollback)**: la extraccion (S1.T1) va en un commit separado del cambio de semantica (S1.T3) para que revertir uno no arrastre al otro.
- **DET-4 (hechos vs inferencias)**: H1 y H2 se confirmaron reproduciendo, no leyendo. Los tests de S1.T2 se escriben en rojo antes del fix por la misma razon.
- **RULE-workflow-verify-the-record-018** (`must`): un comando que registra algo se verifica leyendo el registro, no su stdout. Aplica a S1.T1: la paridad de la extraccion se verifica comparando el JSON emitido, no que el comando "haya corrido bien".
- **RULE-workflow-delegation-handoff-scope-015** (`should`): al delegar el reviewer de S1.T4 y los jueces de S2.GATE, acotar el handoff a los archivos del diff. Un juez sin acotar explora todo el KB (3.4x el costo, con peor senal).
- **`execute_scope` del ticket**: `commands/dkc-delegate` esta abierto SOLO en el bloque de resolucion. El clasificador de fallos y el fallback (HOR-130 S4) estan prohibidos. El scope se amplio tres veces durante el design, cada una declarada en el frontmatter del ticket: `commands/lib/delegation-policy.py` y `server/tests/test_delegation_policy.py` (DEC-LOCAL-02 y la regresion que el request exige), y `projects/horadric/rules/workflow/` para S2.T6 (aprobada por el dev tras el hallazgo de los jueces del gate DET-38).

## Dependencies

- `SPEC-deckard-core-delegation-130` — este spec modifica el resolver que aquel introdujo. No lo reemplaza: acota su semantica de apagado.
- El badge de delegacion de HC (commit `00ec6dd`) ya existe y consume el resultado; no requiere cambio porque el off explicito resuelve `null`.

## Risks and mitigations

| Riesgo | Impacto | Mitigacion |
|--------|---------|------------|
| La extraccion del heredoc cambia comportamiento en silencio | Alto — el canal delegaria distinto sin que nadie lo note | Baseline capturado antes (S1.T1) + paridad exigida sobre las 12 combinaciones; commit separado del cambio de semantica |
| Tocar el clasificador de fallos o el fallback por proximidad en el archivo | Alto — es logica que HOR-130 S4 estabilizo y el ticket prohibe | S1.T4: verificacion de diff por reviewer aislado contra el `execute_scope` |
| HC y el comando vuelven a divergir en el futuro | Medio — es exactamente el bug que se esta arreglando | Misma matriz de 12 casos, con los mismos nombres, en pytest y en vitest: divergir rompe uno de los dos |
| `{ enabled: false }` como forma tolerada se vuelve una segunda forma "oficial" de facto | Bajo | Template, trigger y las secciones Activar/Apagar ensenan solo `false`; la tolerancia se menciona en una linea de la matriz |

## Open questions

Sin preguntas abiertas. La unica decision de diseno (representacion del off) la cerro el dev en intake — ver D1 en `## Triage > Decisiones` del ticket HOR-133.

## Decisions

### DEC-LOCAL-01: `false` como centinela de off, no `null`

**Contexto**: el ticket proponia dos formas (centinela reconocido vs `{ enabled: false }` a nivel ticket) y dejaba la eleccion al design.

**Decision** (dev, intake-explore 2026-08-02): `delegation: false` es el off explicito; `null`/ausente sigue significando "no declarado".

**Driver decisivo**: la colision H6. Si `null` fuera el off y el template lo declarara como default (REQ-FIX-03), todo ticket nuevo apagaria el bloque del proyecto y el `config.yaml` por-proyecto quedaria muerto. Con `false` los tres estados son distinguibles y el template puede traer `null` sin efecto.

**Descartadas**: `null` como off (colisiona con el template y pierde la distincion "nunca se declaro" vs "se apago a proposito"); `{ enabled: false }` como forma canonica (mas verboso que el on, y exige igual reescribir el trigger, sin comprar nada sobre `false`).

### DEC-LOCAL-02: extraer el bloque de politica en vez de testearlo por `awk`

**Contexto**: la validacion de H1 en intake requirio extraer el heredoc del comando con `awk` para poder ejecutarlo. Esa tecnica sirve para un diagnostico puntual, no como regresion permanente: se rompe al mover una linea del script.

**Decision**: mover el bloque a `commands/lib/delegation-policy.py` e invocarlo desde el comando. Precedente en el repo: `commands/lib/lint-lib.py`.

**Alternativa descartada**: dejar el heredoc y que el test lo extraiga con los marcadores. Mas barato hoy, pero deja la regresion acoplada al formato del script y no cumple el "una sola fuente de verdad" que pide el request.

## Technical reference

Reproduccion del estado actual (intake-explore, 2026-08-02), resolver extraido verbatim y corrido contra un fixture con `delegation.enabled: true` a nivel proyecto:

```
T-NULL             -> {"source": "project-config", "roles": ["reviewer", "tester"], ...}
T-FALSE            -> {"source": "project-config", ...}
T-ENABLED-FALSE    -> {"source": "project-config", ...}
T-EMPTY            -> {"source": "project-config", ...}
T-ON               -> {"source": "ticket", "roles": ["reviewer"], ...}
T-ABSENT           -> {"source": "project-config", ...}
```

Bloque canonico actual: `commands/dkc-delegate:147-199` (heredoc `PYPOLICY`). Espejo: `horadric-cube:server/deckard/delegation.ts:55-91`.

## Acceptance checkpoints

| # | Checkpoint | Como se verifica | Session |
|---|-----------|------------------|---------|
| A1 | Un ticket con `delegation: false` no delega aunque su proyecto tenga el bloque activo | `pytest server/tests/test_delegation_policy.py -k off_explicito` verde | S1 |
| A2 | Un ticket con `delegation: null` sigue heredando del proyecto | `pytest ... -k no_declarado` verde | S1 |
| A3 | La extraccion no cambio comportamiento | JSON de las 12 combinaciones identico al baseline pre-extraccion | S1 |
| A4 | El clasificador de fallos y el fallback no se tocaron | `git diff` de `commands/dkc-delegate` contenido en el bloque de politica | S1 |
| A5 | HC resuelve identico al comando en las 12 combinaciones | `npx vitest run server/deckard/delegation.test.ts` verde | S2 |
| A6 | Un ticket nuevo desde el template muestra el campo con default `null` | Scaffold de prueba + lectura del frontmatter | S2 |
| A7 | El trigger de apagado escribe el valor que el resolver reconoce | Fila de `request-intake.md` indica `false`; contrastada contra el resolver | S2 |
| A8 | La doc no contradice al resolver | Matriz de `docs/delegation.md` == matriz de los tests | S2 |
| A9 | Los defaults y la precedencia del bloque de proyecto siguen intactos | `pytest ... -k defaults` verde: `backend: codex` + `budget_tokens: 2000000` cuando el ticket no los declara; bloque comentado y bloque sin `enabled: true` resuelven off | S1 |
| A10 | Ningun ticket existente cambia de resolucion | `pytest ... -k tickets_reales` verde: HOR-130/131/133 en `source: ticket`, HOR-132 en off — identico al baseline pre-fix | S1 |

## Archiving

Este spec se archiva cuando el contrato de tres estados quede absorbido por una spec mayor del canal de delegacion (p. ej. si HOR-130 S7 incorpora `developer` y reescribe la politica completa).
