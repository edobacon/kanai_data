---
id: SPEC-workflow-registry-cost-judge-delegation-135
project: horadric
ticket: HOR-135
status: approved
---

# Costo de registro canonico y delegacion de los gates de juicio

# Costo de registro canonico y delegacion de los gates de juicio

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Changes, Tasks).*

**Que se quiere**: medir el flujo de ejecucion de DKC mostro que el mayor consumidor de contexto del orquestador no es razonar ni explorar, sino **escribir a mano los comandos de registro canonico**: 74.030 tokens en 128 llamadas (578 promedio) en HOR-130, el 63% de todo el Bash que el modelo escribio. Ese texto queda residente y se re-lee en cada turno. No se puede delegar (DET-29 exige que las transiciones salgan del orquestador), pero si abaratar. En paralelo, el canal de delegacion tiene un defecto que lo hace mentir: los jueces (`judge-spec`, dual-judge, `judge-reconcile`) son prompts montados sobre el vehiculo `role: reviewer`, y `dkc-delegate` les inyecta `reviewer.md` como "contrato de comportamiento COMPLETO" — el archivo exacto que los steps les dicen que **no** usen. Este spec arregla las dos cosas y escribe el criterio que hoy se toma a ojo para decidir que se delega.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El endurecimiento cronologico del `decisions_log` entra **warn-first**, no como error duro | El barrido del intake (L5) encontro **9 tickets que fallarian hoy** y 10 mas con timestamps duplicados, repartidos en 4 proyectos. Error duro convierte una mejora del canal en una migracion del KB. Warn-first es ademas el patron vigente (DET-31/32/33/36/37) y deja la puerta abierta a subirlo en T3 |
| 2 | Los schemas de los jueces se **transcriben**, no se disenan | El shape ya existe como bloque JSON en `judge-spec.md:83+` y `judge-reconcile.md:66+`. Inventar uno nuevo crearia dos fuentes de verdad para el mismo contrato |
| 3 | El criterio de delegabilidad se escribe con **dos ejes** (compresion y contencion), no uno | Un solo eje (compresion) contradice REQ-IMPROVE-08 de `SPEC-deckard-core-delegation-130`, que delego `developer` por contencion pese a que comprime 1:1 |
| 4 | Los tres gates de juicio del design se delegan **con handoff acotado y medicion**, y si no se pagan solos no se delegan | El researcher del propio intake de este ticket costo 762k tokens contra los 28k de los de HOR-130, por handoff amplio. Delegar un gate sin acotarlo puede salir mas caro que resolverlo inline |

## Purpose

Reducir el costo de contexto del registro canonico de DKC y corregir el canal de delegacion para
que los jueces reciban su propio contrato y su propio schema, dejando escrito el criterio con el
que se decide que rol se delega. Para el dev: sessions mas largas antes de saturar contexto, y
gates de juicio con independencia real en vez de auto-evaluacion del que escribio el spec.

## Estado actual

Medido sobre el transcript de HOR-130 (`5356dbcf`, 581 mensajes de asistente) y sobre el codigo
en `sp7-jul-21`:

| Dimension | Estado hoy |
|-----------|-----------|
| Comandos de registro | `--reason` inline unicamente. 74.030 tokens en 128 llamadas, 578 promedio |
| Entries por invocacion | 1. `record-decision.ts:242-250` genera **un timestamp por corrida** y construye una sola entry |
| Cronologia del `decisions_log` | **No enforced**. `decisions.ts:322-331` declara el orden no-decreciente en un comentario que el schema no implementa; `validate.ts:341-373` no compara timestamps ni verifica unicidad |
| Contrato del delegado | Fijo por rol: `dkc-delegate:159` arma `CONTRACT=prompts/agents/$ROLE.md`, y `:130-140` resuelve el schema por rol desde `contracts.yaml` |
| Jueces delegados | Reciben `reviewer.md` como contrato y `reviewer.json` como schema. Verificado en runtime con `--dry-run` |
| Gates de juicio del design | DET-32, DET-37 y `parallelization-assessment` se resuelven inline, sin fence. 14 fences en 7 steps y ninguno los cubre |
| Default de roles delegables | `[reviewer, tester]` en `request-intake.md:61` y en el ejemplo de `config.yaml:113`, de 4 roles marcados `delegable: true` |
| Criterio de delegabilidad | No escrito. Se decide caso por caso en cada ticket |

## Problema / oportunidad

1. **El registro se paga en cada turno.** Un `--reason` de 578 tokens promedio no se paga una vez: queda en el contexto y se re-lee mientras dure la session. En HOR-130 el cache read total fue de 315M.
2. **El juez delegado recibe instrucciones contradictorias.** La linea con forma de contrato le manda leer `reviewer.md`; el objetivo le dice que no lo use. Se resuelve por prosa, que es justo lo que el sistema evita en todos lados.
3. **Los tres gates de juicio del design los resuelve quien escribio el spec.** Es el mismo sesgo de confirmacion que motivo DET-38 para el spec completo, sin la contramedida.
4. **`researcher` esta delegable y sin usar por default**, siendo el rol mas barato del canal.

## Estado deseado

| Dimension | Target |
|-----------|--------|
| Comandos de registro | `--reason-file` y plantillas por `--step` disponibles; el reason largo deja de viajar por argv |
| Entries por invocacion | N, con timestamp propio por entry |
| Cronologia | Verificada como **warning** por `StepDecisions`, listando los tickets afectados sin romper gates |
| Contrato del delegado | Elegible: `--contract` y `--schema` sobrescriben lo que el rol resuelve por default |
| Jueces delegados | Reciben su propio `.md` y su propio JSON Schema strict |
| Gates de juicio del design | Delegables por fence, con handoff acotado y costo medido |
| Default de roles | `[reviewer, tester, researcher]` |
| Criterio | Escrito en `agent-tiers.md` con dos ejes y las exclusiones por razon propia |

## Delta

**Que se toca**: la superficie de argumentos de `dkc-record-decision` y `dkc-execute-task`, el
schema y el validador del `decisions_log`, dos flags nuevos en `dkc-delegate`, cinco schemas de
veredicto nuevos, tres fences en `_design-shared.md`, dos strings de default y una seccion de doc.

**Que NO se toca** (limites del delta, alineados con `execute_scope` del ticket):

- La maquina de transiciones de DET-29 en `dkc-execute-task`: solo cambia como llega el texto del reason, no como se persiste el estado
- El clasificador de fallos, el fallback al host local y el ledger de budget de `dkc-delegate`
- El paralelismo real del dual-judge (fuera de alcance, se simula secuencial)
- La delegacion de `teach`, `architect` y `scribe` (fuera de alcance, razones ya registradas)
- Los `decisions_log` ya escritos: no se migran ni se reescriben (DET-6, inmutabilidad)

**Complejidad estimada**: media. 9 archivos en 1 repo, sin cambios de runtime ni de UI, pero con
dos superficies publicas de comando y un validador que corre sobre todo el KB.

## Requirements

### REQ-IMPROVE-01: reason desde archivo

> **Que cambia**: los comandos de registro aceptan el texto del `reason` desde un archivo en vez de por argumento.
> **Por que**: un reason de 578 tokens promedio escrito en la linea de comando queda residente en el contexto del orquestador y se re-lee en cada turno posterior.

El sistema MUST aceptar `--reason-file <path>` en `dkc-record-decision` y `dkc-execute-task` como
alternativa a `--reason`, MUST persistir el contenido del archivo integro en el `decisions_log`
del markdown con el mismo tratamiento que hoy recibe `--reason` (escape de comillas simples al
serializar YAML, sin trim ni truncado), y MUST rechazar con exit 2 la invocacion que reciba ambos
o ninguno. El path MUST resolverse contra el cwd de la invocacion de forma explicita y
documentada, sin heredar la ambiguedad de `BUG-workflow-comandos-raiz-desde-pwd-004`.

<details><summary>Scenarios</summary>

- GIVEN un reason de 600 tokens en `/tmp/r.txt` WHEN se invoca con `--reason-file /tmp/r.txt` THEN el `decisions_log` contiene el texto integro, identico al que produciria `--reason` con el mismo contenido
- GIVEN `--reason` y `--reason-file` juntos WHEN se invoca THEN exit 2 con mensaje que nombra el conflicto
- GIVEN un `--reason-file` que apunta a un archivo inexistente WHEN se invoca THEN exit 2 con el path que intento resolver, sin escribir nada en el ticket
- GIVEN un reason con saltos de linea y comillas simples WHEN se pasa por archivo THEN el YAML resultante parsea y el texto vuelve intacto

</details>

### REQ-IMPROVE-02: plantillas de reason por step

> **Que cambia**: los `--step` de uso repetido tienen una plantilla de reason en un catalogo de datos.
> **Por que**: la mayor parte de los 128 reasons de HOR-130 son variaciones del mismo texto por tipo de step. Escribirlos de cero cada vez es el costo evitable.

El sistema MUST proveer un catalogo de plantillas de reason indexado por `--step`, MUST permitir
invocarlo (`--reason-template <id>` con sustitucion de placeholders con sintaxis `{nombre}`,
pasados como `--var nombre=valor`; un placeholder de la plantilla sin valor MUST fallar con exit 2
nombrandolo, y un `--var` que la plantilla no declara MUST fallar igual — silencioso no, porque un
reason a medias es peor que ninguno) y MUST seguir el patron
catalogo/ejecutor de `RULE-workflow-catalog-executor-pattern-005`: el catalogo es un archivo de
datos bajo `templates/outputs/`, no strings hardcodeados en el comando. Un `--step` sin plantilla
MUST seguir funcionando con `--reason` o `--reason-file` sin degradacion.

### REQ-IMPROVE-03: batching de entries

> **Que cambia**: una invocacion puede registrar varias entries.
> **Por que**: cada invocacion repite el preambulo completo del comando; N entries hoy cuestan N preambulos.

El sistema MUST permitir registrar N entries en una sola invocacion, MUST generar un timestamp
**por entry** y no por corrida, MUST preservar el orden de declaracion en el `decisions_log`, y
MUST ser atomico: si una entry del lote es invalida, ninguna se escribe.

<details><summary>Scenarios</summary>

- GIVEN 3 entries en un lote WHEN se registran THEN aparecen en el `decisions_log` en el orden declarado, con timestamps estrictamente crecientes
- GIVEN un lote donde la segunda entry tiene un `choice` invalido WHEN se registra THEN exit != 0 y el `decisions_log` queda sin modificar

</details>

### REQ-IMPROVE-04: cronologia verificada (warn-first)

> **Que cambia**: `StepDecisions` empieza a reportar entries desordenadas, sin timestamp o duplicadas.
> **Por que**: DET-6 exige discoveries cronologicos e inmutables, pero hoy no hay nada que lo verifique. Con batching, la garantia deja de salir gratis del uso.

El sistema MUST verificar en `dkc-validate StepDecisions` que las entries del `decisions_log`
tengan timestamp, esten en orden no-decreciente y no repitan timestamp, MUST reportar cada
incumplimiento como **warning** con el ticket y la posicion de la entry, y MUST NOT hacer fallar
la validacion por este motivo. El comportamiento MUST ser graduable a error mediante un flag
explicito (`--strict-chronology`, off por default), y el flag MUST estar cubierto por test: sin
implementacion ni prueba, "graduable a T3" seria una promesa no verificada (DET-4).

<details><summary>Scenarios</summary>

- GIVEN `HOR-122` (9 entries desordenadas) WHEN se valida THEN `valid: true` con warning que nombra las posiciones fuera de orden
- GIVEN `HOR-126` (entry sin timestamp) WHEN se valida THEN `valid: true` con warning que nombra la entry
- GIVEN un ticket con `decisions_log` correcto WHEN se valida THEN sin warnings nuevos

</details>

### REQ-IMPROVE-05: contrato y schema elegibles al delegar

> **Que cambia**: `dkc-delegate` acepta que la persona del delegado no sea la del vehiculo.
> **Por que**: los jueces se montan sobre `role: reviewer` porque es el unico vehiculo con host-mapping validado, y hoy eso les impone el contrato del reviewer.

El sistema MUST aceptar `--contract <path.md>` y `--schema <path.json>` en `dkc-delegate`, que
sobrescriben el contrato y el schema que el rol resuelve desde `contracts.yaml`. Cuando se pasan,
el handoff MUST citar el contrato provisto como contrato de comportamiento, y la validacion del
veredicto MUST correr contra el schema provisto. Ambos MUST validarse como existentes antes de
invocar al backend (exit 3 si falta alguno), sin gastar cuota. El sandbox y las `allowed_ops`
MUST seguir saliendo del rol, no del contrato: la persona cambia, la contencion no.

<details><summary>Scenarios</summary>

- GIVEN `--role reviewer --contract prompts/agents/judge-spec.md --schema .../judge-spec.json --dry-run` WHEN se invoca THEN el handoff cita `judge-spec.md` y el schema resuelto es el del juez
- GIVEN `--contract` apuntando a un archivo inexistente WHEN se invoca THEN exit 3 antes de invocar al backend
- GIVEN `--role reviewer --contract judge-spec.md` sin `--schema` WHEN se invoca THEN el sandbox sigue siendo `read-only` y las `allowed_ops` las del reviewer

</details>

### REQ-IMPROVE-06: schemas de veredicto de los jueces y gates

El sistema MUST proveer JSON Schemas strict para `judge-spec`, `judge-reconcile`,
`necessity-assessment`, `planning-completeness` y `parallelization-assessment`. Los dos primeros
MUST derivarse del bloque JSON ya escrito en su `.md` (`judge-spec.md:83+`,
`judge-reconcile.md:66+`) sin introducir campos nuevos; los tres ultimos MUST reusar literalmente
los enums de choice ya definidos en `_design-shared.md:284/322/90`. Todos MUST cumplir el modo
strict de `--output-schema` (`RULE-workflow-strict-role-output-contract-017`): toda property en
`required` y lo opcional como `["tipo","null"]`. Los cinco MUST exigir un `summary` de tipo
string con `minLength: 1` y un campo de veredicto de enum cerrado, para que el schema sostenga
tambien la obligacion semantica de `RULE-workflow-delegated-verdict-must-conclude-021` y no solo
la forma: un veredicto sin conclusion debe ser invalido a nivel schema, no solo a nivel prosa.

### REQ-IMPROVE-07: gates de juicio del design delegables

> **Que cambia**: DET-32, DET-37 y `parallelization-assessment` pueden resolverse con un juez delegado en vez de inline.
> **Por que**: hoy los resuelve el mismo agente que escribio el spec que evalua.

El sistema MUST proveer un fence `dkc:agent-invocation` para cada uno de los tres gates en
`_design-shared.md`, con handoff **acotado** (el spec y el request, no el KB entero) y su schema
de REQ-IMPROVE-06, y MUST mantener el camino inline como fallback cuando el rol no esta en
`roles` o el backend falla. El veredicto delegado MUST registrarse en el `decisions_log` con el
mismo `--step` que hoy usa el camino inline: el consumidor del registro no distingue el origen.

### REQ-IMPROVE-11: la clausula de conclusion viaja en el handoff, no en cada step

> **Que cambia**: `dkc-delegate` inyecta la clausula de `RULE-021` en todo handoff, y clasifica como fallo el veredicto cuyo `summary` no concluye.
> **Por que**: hallazgo del spec-judge en la iteracion 2. `RULE-workflow-delegated-verdict-must-conclude-021` pide dos cosas y un `minLength: 1` no cumple ninguna: la clausula explicita en el handoff y no contar como voto un summary que no concluye. Hoy eso depende de que cada step lo escriba a mano, que es como se perdio en HOR-133.

El sistema MUST inyectar en todo handoff de `dkc-delegate` la clausula de formato de
`RULE-021`: el `summary` es la **conclusion** (que se verifico y que se decidio), y el plan en
futuro esta prohibido. La clausula MUST salir del comando, no de cada call site.

El sistema MUST detectar el veredicto cuyo `summary` no concluye (heuristica minima: apertura en
primera persona en futuro del tipo "voy a" / "revisare" / "analizare"), MUST clasificarlo como
`verdict-not-conclusive` con exit != 0 en vez de aceptarlo como veredicto valido, y MUST NOT
contarlo como voto en un dual-judge. La corrida MUST poder re-lanzarse con el mismo handoff.

<details><summary>Scenarios</summary>

- GIVEN cualquier invocacion de `dkc-delegate` WHEN se arma el handoff THEN contiene la clausula de conclusion sin que el call site la haya escrito
- GIVEN un veredicto con `summary` que abre en futuro WHEN se procesa THEN se clasifica `verdict-not-conclusive`, exit != 0, y el reporte lo dice; el caso real de HOR-133 sirve de fixture
- GIVEN un veredicto con `summary` conclusivo WHEN se procesa THEN pasa sin friccion nueva

</details>

### REQ-IMPROVE-10: los tres jueces existentes usan el contrato propio

> **Que cambia**: los call sites que hoy montan un juez sobre `role: reviewer` pasan `--contract` y `--schema`.
> **Por que**: sin esto el ticket construye el mecanismo y no lo aplica al defecto que lo motivo. Hallazgo R1 del spec-judge.

El sistema MUST actualizar los tres call sites existentes para que pasen el contrato y el schema
del juez que invocan: `judge-spec` en el paso 0f de `_design-shared.md:442`, el dual-judge de
`request-execute/session-gate.md`, y `judge-reconcile` en `reconcile-decision.md`. Cada uno MUST
verificarse con `--dry-run` mostrando que el handoff cita el `.md` del juez y resuelve su schema.
El dual-judge MUST seguir usando el schema del reviewer si su contrato es el modo dual de
`reviewer.md` (no es un juez con `.md` propio): la regla es que el contrato citado y el schema
resuelto coincidan con el prompt que el step declara, no que todos usen archivos nuevos.

### REQ-IMPROVE-08: researcher en el default de roles delegables

El sistema MUST incluir `researcher` en el conjunto de roles que el trigger `delega a codex`
produce (`request-intake.md:61`) y en el ejemplo del bloque `delegation` de la config de
proyecto. El cambio MUST NOT alterar la resolucion de `delegation-policy.py` ni el contrato de
tres estados de HOR-133.

### REQ-IMPROVE-09: criterio de delegabilidad escrito

El sistema MUST documentar en `prompts/agent-tiers.md` el criterio con el que se decide si un rol
se delega, con **dos ejes** — compresion (razonamiento alto, veredicto chico y estructurado) y
contencion (el sandbox del SO garantiza lo que el prompt-guard no puede) — mas las exclusiones
por razon propia. El texto MUST ser consistente con las decisiones ya tomadas: `developer`
delegable por contencion pese a comprimir 1:1 (REQ-IMPROVE-08 de `SPEC-deckard-core-delegation-130`),
`scribe` excluido por `BUG-codex-hooks-sin-via-declaracion-001`, `smoke-runner` por necesitar
entorno real y browser, `architect` por no producir veredicto estructurado.

### REQ-PRESERVE-01: el reason integro sigue llegando al markdown

El sistema MUST producir, por `--reason-file` y por `--reason-template`, un `decisions_log`
indistinguible del que produce `--reason` con el mismo texto. `--reason` MUST seguir funcionando
sin cambios: no se deprecia en este ticket.

### REQ-PRESERVE-02: el canal de delegacion no se toca fuera de los dos flags

El sistema MUST mantener sin cambios el clasificador de fallos, el fallback al host local, el
ledger de budget por session, la resolucion de modelo por tier y la inyeccion de `kb_refs` de
`dkc-delegate`. Una invocacion sin `--contract`/`--schema` MUST comportarse exactamente como hoy.

### REQ-PRESERVE-03: ningun `decisions_log` existente empieza a fallar

El sistema MUST mantener `valid: true` en `dkc-validate StepDecisions` para los 186 tickets del KB
que hoy tienen `decisions_log`, incluidos los 9 con problemas cronologicos y los 10 con
timestamps duplicados detectados en el intake.

### REQ-PRESERVE-04: DET-29 intacto

El sistema MUST mantener que toda transicion de estado de execute salga del orquestador via
comando. Este spec cambia **como llega el texto del reason**, no quien ejecuta la transicion ni
como se persiste el estado.

## Changes

### Modified: `commands/dkc-record-decision` + `commands/lib/record-decision.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Fuente del reason | solo `--reason <txt>` | `--reason`, `--reason-file <path>` o `--reason-template <id>` | REQ-IMPROVE-01/02 |
| Entries por corrida | 1 | N, con timestamp por entry | REQ-IMPROVE-03 |
| Timestamp | uno por invocacion (`:242-250`) | uno por entry | REQ-IMPROVE-03 |

### Modified: `commands/dkc-execute-task`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Superficie del reason | inline | acepta `--reason-file` | REQ-IMPROVE-01 |
| Maquina de transiciones | — | **sin cambios** | REQ-PRESERVE-04 |

### Modified: `commands/lib/schemas/decisions.ts` + `commands/lib/validate.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Orden de entries | comentario declarativo sin implementacion (`:322-331`) | verificado, reportado como warning | REQ-IMPROVE-04 |
| Timestamp faltante | aceptado en silencio | warning con la posicion | REQ-IMPROVE-04 |
| Efecto sobre `valid` | — | ninguno (warn-first) | REQ-PRESERVE-03 |

### Modified: `commands/dkc-delegate`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `CONTRACT` (`:159`) | `prompts/agents/$ROLE.md` fijo | override por `--contract` | REQ-IMPROVE-05 |
| `SCHEMA` (`:130-140`) | del rol via `contracts.yaml` | override por `--schema` | REQ-IMPROVE-05 |
| Sandbox y `allowed_ops` | del rol | **del rol** (sin cambio) | REQ-IMPROVE-05 |

### Added

| Artefacto | Contenido | Origen |
|-----------|-----------|--------|
| `commands/lib/schemas/roles/judge-spec.json` | transcripcion strict del bloque de `judge-spec.md:83+` | REQ-IMPROVE-06 |
| `commands/lib/schemas/roles/judge-reconcile.json` | transcripcion strict de `judge-reconcile.md:66+` | REQ-IMPROVE-06 |
| `commands/lib/schemas/roles/necessity-assessment.json` | enum de `_design-shared.md:284` | REQ-IMPROVE-06 |
| `commands/lib/schemas/roles/planning-completeness.json` | enum de `_design-shared.md:322` | REQ-IMPROVE-06 |
| `commands/lib/schemas/roles/parallelization-assessment.json` | enum de `_design-shared.md:90` | REQ-IMPROVE-06 |
| `templates/outputs/reason-templates.yaml` | catalogo de plantillas por `--step` | REQ-IMPROVE-02 |
| 3 fences en `prompts/steps/_design-shared.md` | delegacion de los gates de juicio | REQ-IMPROVE-07 |
| Seccion en `prompts/agent-tiers.md` | criterio de dos ejes | REQ-IMPROVE-09 |

## Non-functional requirements

| Tipo | Current | Target | How to measure |
|------|---------|--------|----------------|
| Tokens de comando de registro por session | 578 promedio por invocacion (74.030 en 128, HOR-130) | reduccion medible, medida sobre una session real de este mismo ticket | script de S1.T1 sobre el transcript |
| Costo de un gate de juicio delegado | no medido (hoy es inline) | no mayor que el costo inline equivalente, o no se delega | S4.T3 |
| Latencia agregada por delegar los 3 gates | 0 (inline) | reportada, no capeada | S4.T3 |

## Tasks

### Session 1 — Frente 1a+1c: reason desde archivo y plantillas [tipo: auto] [tier: T1]

parallel_groups: [[S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | Instrumentar la medicion del baseline como script reproducible | REQ-IMPROVE-01 | researcher | — | `commands/lib/measure-registry-cost.py` | el script reproduce los 74.030 tokens / 128 llamadas de HOR-130 sobre su transcript | borrar el script | DET-1, DET-2, DET-13 | pending | S1 |
| S1.T2 | `--reason-file` en `dkc-record-decision` y `dkc-execute-task`, con resolucion de path explicita | REQ-IMPROVE-01, REQ-PRESERVE-04 | developer | S1.T1 | `commands/dkc-record-decision`, `commands/lib/record-decision.ts`, `commands/dkc-execute-task` | TC1 pass; `--reason` sigue igual; TC10: las 4 transiciones de `dkc-execute-task` (open-session/start-task/done-task/close-gate) producen el mismo shape canonico que antes del cambio | git revert | DET-8, DET-10, DET-29, RULE-workflow-catalog-executor-pattern-005 | pending | S1 |
| S1.T3 | Catalogo de plantillas de reason por `--step` + flag `--reason-template` | REQ-IMPROVE-02 | developer | S1.T1 | `templates/outputs/reason-templates.yaml`, `commands/lib/record-decision.ts` | una plantilla renderiza con placeholders; `--step` sin plantilla no degrada; **las dos rutas de error MUST del REQ devuelven exit 2 nombrando el placeholder o la `--var` culpable** | git revert | RULE-workflow-catalog-executor-pattern-005 | pending | S1 |
| S1.T4 | Tests de S1 | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01 | tester | S1.T2, S1.T3 | `server/tests/test_record_decision_reason_sources.py`, `server/tests/test_reason_templates.py` | TC1 y TC12 pass; equivalencia byte a byte entre las tres vias; conflicto, archivo faltante, placeholder sin valor y `--var` no declarada cubiertos | git revert | DET-7, DET-13 | pending | S1 |
| S1.T5 | Documentar la superficie nueva | REQ-IMPROVE-01, REQ-IMPROVE-02 | scribe | S1.T4 | `docs/commands.md` (o el doc de comandos vigente), header de uso de `dkc-record-decision` | el doc describe las tres vias y cuando usar cada una | git revert | DET-37 dim1 | pending | S1 |
| S1.GATE | Gate de session | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01, REQ-PRESERVE-04 | reviewer | S1.T5 | — | `pytest server/tests` verde; quality review DET-23 tier standard; commits granulares DET-27 | — | DET-13, DET-23, DET-27, DET-33 | pending | S1 |

### Session 2 — Frente 1b: batching y cronologia warn-first [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S2.T1 | Timestamp por entry + batching atomico de N entries | REQ-IMPROVE-03 | developer | S1.GATE | `commands/lib/record-decision.ts`, `commands/dkc-record-decision` | TC2 pass; lote invalido no escribe nada | git revert | DET-6, DET-8, DET-29 | pending | S2 |
| S2.T2 | Verificacion cronologica warn-first en el schema y el validador, con `--strict-chronology` opt-in | REQ-IMPROVE-04, REQ-PRESERVE-03 | developer | S2.T1 | `commands/lib/schemas/decisions.ts`, `commands/lib/validate.ts`, `commands/dkc-validate` | los 9 tickets de L5 dan `valid: true` con warning nombrando entry y posicion; con `--strict-chronology` los mismos 9 dan `valid: false` | git revert | DET-6, DET-8 | pending | S2 |
| S2.T3 | Tests de S2, con los tickets rotos del KB como fixture | REQ-IMPROVE-03, REQ-IMPROVE-04, REQ-PRESERVE-03 | tester | S2.T2 | `server/tests/test_decisions_log_chronology.py` | TC2 pass; barrido sobre los 186 `decisions_log` del KB sin un solo `valid: false` nuevo; el flag strict cubierto en ambos sentidos | git revert | DET-7, DET-13 | pending | S2 |
| S2.T4 | Registrar el gap historico como bug del KB | REQ-IMPROVE-04 | scribe | S2.T3 | `projects/horadric/bugs/workflow/` | bug creado con los 19 tickets afectados y su estado | borrar el record | DET-37 dim2, DET-16 | pending | S2 |
| S2.GATE | Gate de session | REQ-IMPROVE-03, REQ-IMPROVE-04, REQ-PRESERVE-03 | reviewer | S2.T4 | — | `pytest server/tests` verde; dual-judge DET-35 por ser T2; DET-27 | — | DET-13, DET-23, DET-27, DET-33, DET-35 | pending | S2 |

### Session 3 — Frente 2a+2b: contrato elegible y schemas [tipo: auto] [tier: T2]

parallel_groups: [[S3.T2, S3.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S3.T1 | `--contract` y `--schema` en `dkc-delegate`, con validacion de existencia previa a la invocacion | REQ-IMPROVE-05, REQ-PRESERVE-02 | developer | — | `commands/dkc-delegate` | TC3 pass con `--dry-run`; sin flags el comportamiento es identico al actual | git revert | DET-8, DET-10, RULE-codex-sandbox-enforcement-006 | pending | S3 |
| S3.T2 | Transcribir los schemas de `judge-spec` y `judge-reconcile` desde su contrato en prosa | REQ-IMPROVE-06 | developer | S3.T1 | `commands/lib/schemas/roles/judge-spec.json`, `judge-reconcile.json` | campos identicos al bloque JSON del `.md`, sin agregados | git revert | RULE-workflow-strict-role-output-contract-017 | pending | S3 |
| S3.T3 | Schemas de los tres gates de juicio, reusando los enums de choice existentes | REQ-IMPROVE-06 | developer | S3.T1 | `commands/lib/schemas/roles/necessity-assessment.json`, `planning-completeness.json`, `parallelization-assessment.json` | enums identicos a los de `_design-shared.md` | git revert | RULE-workflow-strict-role-output-contract-017 | pending | S3 |
| S3.T4 | Clausula de conclusion en el handoff + clasificacion `verdict-not-conclusive` | REQ-IMPROVE-11 | developer | S3.T1 | `commands/dkc-delegate` | la clausula aparece en el handoff sin que el call site la escriba; el summary no conclusivo de HOR-133 se clasifica y no cuenta como voto | git revert | RULE-workflow-delegated-verdict-must-conclude-021, DET-33 | pending | S3 |
| S3.T5 | Tests de S3 + validacion strict real contra el backend | REQ-IMPROVE-06, REQ-IMPROVE-11, REQ-PRESERVE-02 | tester | S3.T2, S3.T3, S3.T4 | `server/tests/test_delegate_contract_override.py`, `server/tests/test_verdict_conclusive.py` | TC3, TC4 y TC11 pass; ningun schema rechazado con `invalid_json_schema` | git revert | DET-7, DET-13 | pending | S3 |
| S3.GATE | Gate de session | REQ-IMPROVE-05, REQ-IMPROVE-06, REQ-IMPROVE-11, REQ-PRESERVE-02 | reviewer | S3.T5 | — | `pytest server/tests` verde; dual-judge DET-35; verificar que fallback y ledger siguen intactos (REQ-PRESERVE-02) | — | DET-13, DET-23, DET-27, DET-33, DET-35 | pending | S3 |

### Session 4 — Frente 2c+2d: gates delegables y default de roles [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S4.T1 | Fences de delegacion en los tres gates de juicio NUEVOS, con handoff acotado | REQ-IMPROVE-07 | developer | S3.GATE | `prompts/steps/_design-shared.md` | TC5 pass; el camino inline sigue disponible como fallback | git revert | DET-9, DET-34, RULE-workflow-delegation-handoff-scope-015 | pending | S4 |
| S4.T2 | Actualizar los tres call sites EXISTENTES de jueces para que pasen `--contract` y `--schema` | REQ-IMPROVE-10 | developer | S3.GATE | `prompts/steps/_design-shared.md` (paso 0f), `prompts/steps/request-execute/session-gate.md`, `prompts/steps/reconcile-decision.md` | TC9 pass: `--dry-run` por cada call site muestra el `.md` del juez citado como contrato y su schema resuelto | git revert | DET-16, RULE-codex-sandbox-enforcement-006 | pending | S4 |
| S4.T3 | `researcher` en el default de roles delegables | REQ-IMPROVE-08 | developer | — | `prompts/steps/request-intake.md`, `projects/horadric/config.yaml`, `docs/delegation.md` | TC6 pass; `delegation-policy.py` resuelve sin cambios | git revert | DET-16, DET-37 dim1 | pending | S4 |
| S4.T4 | Medir el costo de los tres gates delegados contra el inline y aplicar el criterio de Q3 | REQ-IMPROVE-07 | researcher | S4.T1 | — | numero real de tokens y segundos por gate; se aplica el umbral de DEC-LOCAL-03 y el veredicto por gate queda registrado | N/A (solo lectura) | DET-4, DET-13, RULE-workflow-delegation-handoff-scope-015 | pending | S4 |
| S4.T5 | Tests de S4 | REQ-IMPROVE-07, REQ-IMPROVE-08, REQ-IMPROVE-10 | tester | S4.T2, S4.T3, S4.T4 | `server/tests/test_delegation_defaults.py`, `server/tests/test_judge_call_sites.py` | TC5, TC6 y TC9 pass | git revert | DET-7, DET-13 | pending | S4 |
| S4.GATE | Gate de session | REQ-IMPROVE-07, REQ-IMPROVE-08, REQ-IMPROVE-10 | reviewer | S4.T5 | — | `pytest server/tests` verde; dual-judge DET-35; veredicto por gate de S4.T4 registrado con su numero | — | DET-13, DET-23, DET-27, DET-33, DET-35 | pending | S4 |

### Session 5 — Frente 3 y medicion del delta [tipo: ⚑ fuerte] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S5.T1 | Escribir el criterio de dos ejes en `agent-tiers.md` | REQ-IMPROVE-09 | developer | S4.GATE | `prompts/agent-tiers.md` | el texto no contradice REQ-IMPROVE-08 del spec 130; cita las exclusiones con su razon propia | git revert | DET-4, DET-16, DET-37 dim3 | pending | S5 |
| S5.T2 | Promover el criterio a RULE del KB | REQ-IMPROVE-09 | scribe | S5.T1 | `projects/horadric/rules/workflow/` | RULE creada con what/why/where/when | borrar el record | DET-37 dim2, DET-11 | pending | S5 |
| S5.T3 | Medir el delta contra el baseline y reportarlo con el numero exacto | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-IMPROVE-03 | researcher | S5.T2 | — | TC8 pass; si no hay reduccion medible, se declara y no se redondea | N/A (solo lectura) | DET-4, DET-13 | pending | S5 |
| S5.GATE | Gate de cierre | REQ-IMPROVE-09, REQ-IMPROVE-01 | reviewer | S5.T3 | — | acceptance checkpoints ejecutados; delta reportado; learns procesados (DET-39) | — | DET-13, DET-23, DET-27, DET-33, DET-39 | pending | S5 |

## Constraints

| Rule | Como aplica |
|------|-------------|
| `DET-29` | La maquina de transiciones no se toca: solo cambia como llega el texto del reason |
| `DET-6` | Los `decisions_log` existentes no se migran ni se reescriben. El batching genera timestamp por entry |
| `RULE-workflow-strict-role-output-contract-017` | Los 5 schemas nacen strict o Codex los rechaza con `invalid_json_schema` |
| `RULE-workflow-delegation-handoff-scope-015` | Los handoffs de los gates de juicio se acotan al spec y al request. Medido en S4.T3 |
| `RULE-workflow-catalog-executor-pattern-005` | El catalogo de plantillas es datos, no strings en el comando |
| `RULE-codex-sandbox-enforcement-006` | `--contract` cambia la persona, nunca el sandbox ni las `allowed_ops` |
| `RULE-workflow-delegated-verdict-must-conclude-021` | Los schemas de los gates no admiten veredicto abierto |

## Dependencies

| Dependencia | Tipo | Estado |
|-------------|------|--------|
| `SPEC-deckard-core-delegation-130` | canal de delegacion base | done |
| `SPEC-deckard-core-delegation-off-contract-133` | contrato de tres estados del flag | done |
| HOR-132 (`in_progress`) | resolucion del binario de Codex, que S3 y S4 invocan | **verificar antes de abrir S3** |
| App de Codex instalada y logueada | runtime del canal | disponible (verificado en el intake) |

## Risks and mitigations

| # | Riesgo | Impacto | Mitigacion |
|---|--------|---------|-----------|
| R1 | Endurecer la cronologia rompe la validacion de tickets de otros proyectos | alto (el KB entero) | Warn-first (D2). REQ-PRESERVE-03 + barrido completo como test en S2.T3 |
| R2 | El path de `--reason-file` hereda `BUG-workflow-comandos-raiz-desde-pwd-004` | medio | REQ-IMPROVE-01 exige resolucion explicita y documentada; caso de archivo inexistente en TC1 |
| R3 | Los gates de juicio delegados salen mas caros que el inline | medio | S4.T3 lo mide antes de dar por buena la delegacion; Q3 se decide con el numero |
| R4 | Tocar `dkc-delegate` rompe el fallback o el ledger | alto | REQ-PRESERVE-02 + `execute_scope` prohibe esas zonas + verificacion explicita en S3.GATE |
| R5 | El batching rompe la atomicidad y deja el `decisions_log` a medias | alto | REQ-IMPROVE-03 exige atomicidad; caso de lote invalido en TC2 |
| R6 | HOR-132 cambia la invocacion del binario mientras S3 lo toca | medio | Dependencia declarada: verificar su estado antes de abrir S3 |

## Open questions

Ninguna bloqueante. Las dos que quedaron abiertas del intake se resolvieron en este design tras
el hallazgo R4 del spec-judge (un plan no debe arrancar con decisiones de diseno pendientes):

| # | Pregunta del intake | Resolucion |
|---|---------------------|-----------|
| Q1 | Semantica de placeholders de `--reason-template` | Resuelta en REQ-IMPROVE-02: sintaxis `{nombre}`, valores por `--var nombre=valor`, y fallo con exit 2 tanto por placeholder sin valor como por `--var` no declarada |
| Q3 | ¿Se delega un gate de juicio que cuesta mas que el inline? | Resuelta como criterio pre-acordado en DEC-LOCAL-03, aplicado por S4.T4. Deja de ser una pregunta abierta al dev y pasa a ser un umbral que la task evalua |

## Decisions

### DEC-LOCAL-01: warn-first para la cronologia del `decisions_log`

**Contexto**: DET-6 exige discoveries cronologicos, pero el `decisions_log` nunca tuvo un
validador que lo verificara. El barrido del intake encontro 9 tickets que fallarian y 10 con
timestamps duplicados, en 4 proyectos.

**Alternativas**: (a) error duro + migracion previa de los 19 tickets; (b) warn-first, graduable
a error en T3; (c) no verificar.

**Eleccion**: (b). (a) convierte una mejora del canal en una migracion del KB, fuera de lo que el
dev pidio, y tocar `decisions_log` historicos roza DET-6. (c) deja el batching construyendo sobre
una garantia que hoy existe por accidente del uso. (b) es ademas el patron vigente de DKC para
gates nuevos.

**Reversibilidad**: alta. Subir el warning a error es un cambio de una linea mas la migracion,
que queda registrada como bug del KB en S2.T4.

### DEC-LOCAL-02: los schemas de los jueces se transcriben, no se disenan

**Contexto**: `judge-spec.md` y `judge-reconcile.md` ya contienen su schema como bloque JSON.

**Eleccion**: derivar el `.json` de ese bloque sin agregar campos. La alternativa (disenar un
schema nuevo "mejor") crearia dos fuentes de verdad para el mismo contrato y obligaria a
mantenerlas sincronizadas.

### DEC-LOCAL-03: criterio de corte para delegar un gate de juicio

**Contexto**: el researcher del intake de este ticket costo 762k tokens y 133s por un handoff
amplio, contra los 28k y 9s de los de HOR-130. Delegar un gate de juicio puede salir mas caro que
resolverlo inline, y dejarlo como pregunta abierta al dev congelaria S4.

**Criterio (lo aplica S4.T4, por gate, no en bloque)**:

1. Si el gate delegado cuesta **menos** input que el inline equivalente → se delega. Gana en las dos dimensiones.
2. Si cuesta **mas pero comprime** (el veredicto que vuelve al padre es menor al 5% de lo que el gate consumiria inline) → se delega igual: el costo se paga una vez y el contexto del orquestador queda limpio, que es el objetivo del ticket.
3. Si cuesta mas **y no comprime** (el veredicto vuelve grande) → **no se delega**. Se deja el fence escrito pero fuera del default, documentado con el numero que lo justifica.

**Por que un criterio y no una pregunta**: el dev ya fijo la direccion (delegar donde comprime).
Lo que faltaba era el umbral, y el umbral es una decision tecnica con los datos a la vista, no
una preferencia. Si S4.T4 arroja un caso que el criterio no cubre, ahi si escala al dev.

## Success metrics

| Metric | Baseline | Target | How to measure | When |
|--------|----------|--------|----------------|------|
| Tokens de comando de registro por invocacion | 578 promedio (HOR-130) | reduccion medible | script de S1.T1 sobre una session de HOR-135 | S5.T3 |
| Gates de juicio delegables | 0 de 3 | 3 de 3 con fence y schema | inspeccion de `_design-shared.md` | S4.GATE |
| Jueces con contrato propio al delegarse | 0 de 3 | judge-spec y judge-reconcile con `.md` y `.json` propios | TC3 | S3.GATE |
| Roles en el default de delegacion | 2 de 4 delegables | 3 de 4 | TC6 | S4.GATE |
| `decisions_log` del KB que empiezan a fallar | — | 0 | TC7 + barrido de S2.T3 | S2.GATE |

## Acceptance checkpoints

| # | Checkpoint | Como se verifica | Session |
|---|-----------|------------------|---------|
| A1 | El reason llega integro por las tres vias | TC1 + equivalencia byte a byte | S1.GATE |
| A14 | Las dos rutas de error de plantillas fallan con exit 2 y nombran la causa | TC12 | S1.GATE |
| A2 | El batching es atomico y cronologico | TC2 | S2.GATE |
| A3 | Ningun `decisions_log` del KB empieza a fallar | TC7 + barrido de los 186 | S2.GATE |
| A4 | El juez delegado recibe su contrato y su schema | TC3 con `--dry-run` | S3.GATE |
| A5 | Los 5 schemas son strict-validos para el backend | TC4 | S3.GATE |
| A6 | Los tres gates de juicio corren delegados y registran igual que inline | TC5 | S4.GATE |
| A7 | El default de roles incluye researcher sin romper la resolucion | TC6 | S4.GATE |
| A8 | El delta esta medido con numero exacto, o declarado ausente | TC8 | S5.GATE |
| A9 | El criterio escrito no contradice el spec 130 | lectura cruzada de `agent-tiers.md` contra REQ-IMPROVE-08 del spec 130 | S5.GATE |
| A10 | Los tres jueces existentes reciben su contrato y schema propios | TC9: `--dry-run` por call site | S4.GATE |
| A11 | `dkc-execute-task` conserva la maquina de transiciones de DET-29 | TC10: las 4 transiciones producen el shape canonico de siempre | S1.GATE |
| A12 | La graduacion a error es real, no una promesa | test del flag `--strict-chronology` en ambos sentidos | S2.GATE |
| A13 | Un veredicto que no concluye no cuenta como voto | las dos obligaciones de RULE-021 verificadas: la clausula aparece en el handoff generado por el comando, y el `summary` no conclusivo de HOR-133 se clasifica `verdict-not-conclusive` con exit != 0 (TC11). El `minLength: 1` de los schemas cubre solo la forma | S3.GATE |
