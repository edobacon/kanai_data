---
id: SPEC-views-supervisor-flow-22
project: horadric
ticket: HOR-022
status: done
---

# Valor del dev supervisor: sessions detalladas + audit + teach skip visible + kanban closed sort + commits limpios + autopilot formal

# Valor del dev supervisor: sessions detalladas + audit + teach skip visible + kanban closed sort + commits limpios + autopilot formal

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. Si solo lees esto y te basta para decidir, ese es el objetivo. El detalle vive en Requirements, Changes y Tasks.*

### Que se quiere

Que el dev que supervisa la ejecucion del LLM via HC tenga, en todo momento, **vision real** de:

- Que tareas se estan ejecutando ahora y cuales vienen (descripcion real, no solo `S{N}.T{M}`)
- Que decisiones tomo el LLM en su propio criterio vs cuales aprobo el dev (diferenciacion visual de gates)
- Que estado tiene el material educativo (presente, pending, o skipped con razon)
- Que tickets cerraron recientemente, ordenados por fecha de cierre

Adicionalmente, formalizar dos patrones que ya existen informalmente (modo autopilot + manejo de commits sensible al contexto compartido) y cerrar leaks de coherencia del flujo DKC post-HOR-015.

### Decisiones criticas que necesitan tu OK

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Cross-spec join** para descripcion real de tasks (F1): el viewer y el parser cruzan el ticket con el spec via `ticket.spec` y mapean tasks por ID `S{N}.T{M}`. Cubre executed Y projected en un solo render path | Sin esto, projected sessions seguirian opacas y el render actual ya rompe la metafora "el spec es la fuente de verdad". Coste: 1 fetch adicional cacheable. Decision documentada en H2/H2b |
| 2 | **Audit liviano** (F2) como primera session, antes de implementar el resto: pre-finding ya identificado (drift _design-shared.md vs DET-21 post-HOR-020-F5). Decision sobre H10 (extender DET-19 vs nueva DET vs guideline) en este audit | Sin audit el resto del ticket arranca sobre supuestos. Coste: 30-90 min de revisar prompts/DETs/steps post-2026-05-10 |
| 3 | **F6 sensible a `external`** (decision del dev 2026-05-15): proyectos DKC-only → info DKC libre en commits; proyectos compartidos → commit limpio, DKC trackea en tabla `## Commits` del ticket. **H11 (tabla SQL en index.db) se analiza en S5** | Sin esta regla los commits del repo compartido ensucian git log con artifacts DKC que el resto del equipo no usa. Coste: cambio en step request-execute + tabla nueva en ticket |
| 4 | **Autopilot como estado dinamico** (F7): no es flag fijo al inicio, es estado mutable en cualquier punto del ciclo (intake, post-design, mid-execute). Default `false`. Lectura en cada gate. HC viewer diferencia `approvedBy: 'dev' \| 'autopilot'` | Sin formalizacion el patron ya existe pero queda invisible al dev supervisor — no sabe que gates aprobo el LLM por su cuenta vs cuales aprobaste tu. Coste: cambio en request-execute + frontmatter + view + sub-tabla historial |
| 5 | **Teach skip visible** (F3): server amplia `TeachingSummary` con `status: 'present' \| 'pending' \| 'skipped'` + `skipReason?`. View condicionada por status (3 placeholders distintos). El propio HOR-022 sirve de fixture real (`teachings.intake: skipped`) | Hoy un teach skipped renderea generico "aun no generado" — la razon documentada del dev se pierde visualmente. Coste: cambio en server + types + view |
| 6 | **F5 (registrar task description antes de implementar)** se cohesiona con F1 en S2: el LLM escribe la task en el ticket markdown ANTES de hacer el cambio (patron analogo a DET-25 para TCs). Sin cross-join cubre executed; con cross-join cubre projected; juntos eliminan la opacidad | Sin esto, si la session se interrumpe a mitad de una task, no hay rastro en el ticket de que estaba haciendo. Coste: paso adicional en request-execute |
| 7 | **F4 kanban closed sort por `closed` desc**: extender TicketSummary del server con campo `closed?: string \| null` desde frontmatter. Sort por columna closed usa `closed ?? updated ?? created` | HOR-020 F3 dejo el comentario "TicketSummary no expone closed_at formal; updated cubre cierre" — eso es exactamente el bug que F4 cierra. Coste: bajo |
| 8 | **F8 shape canonico de spec — 4 capas** (template + gate design-shared + viewer graceful + migracion legacy): el viewer espera 6 columnas obligatorias en la tabla de tasks. Survey: 13/17 specs de horadric con shape parcial. Causa raiz: template no documenta el shape completo. Detectado durante el propio design-improvement de HOR-022 — el spec mismo cayo en el error | Sin esto, futuros specs heredan el problema; specs legacy quedan rotos en HC para siempre. Coste: 5-8h de migracion + cambio en template + gate + viewer. Beneficio sistemico para todo el flujo DKC futuro |

### Riesgos principales y como los mitigamos

- **Cross-spec join puede romper render si el spec no tiene `## Tasks` parseable** → REQ-PRESERVE-03: degradacion limpia. Si el spec no existe o la tabla no esta, el viewer cae al render actual sin error en consola. Validado por TC-8
- **Cambio al step `request-execute` afecta TODOS los flujos DKC futuros** → S6 implementacion incremental + smoke en HOR-022 (dogfooding del propio ticket). Sin tocar tickets cerrados; aplicacion temporal post-HOR-022
- **Modo autopilot puede saltarse gates ⚑ fuertes importantes** → default optimistic incluye learn raw con racional + opcion `strict` cuando el dev sabe que el gate es critico + iteracion tardia preservada (revisar gate auto-approved despues)
- **F6 cambia commit messages — riesgo de inconsistencia mid-execucion del ticket** → aplicacion temporal post-S5. Commits previos de HOR-022 (si los hay) no se reescriben. Modo libre para horadric (sin `external`); modo limpio aplicable a futuros tickets en repos compartidos
- **DET-21 drift identificado pre-S1** (gate del `_design-shared.md` exige `=== 'done'` cuando DET-21 acepta `skipped`) → entra al scope de S1 audit como hallazgo confirmado

### Que NO se hace en este ticket

- **No rediseno completo del viewer atomico** — solo agregar descripcion real cruzada con spec. La estructura `atoms[]` se mantiene
- **No reescribir historial git** para limpiar commits previos (destructivo)
- **No remover el modo conversacional default** — autopilot es opt-in
- **No tocar acciones irreversibles en autopilot** (push, merge, close, deps, destructive) — siempre piden confirmacion
- **No migrar el flujo de close** a un patron nuevo si el audit lo descubre (sale como follow-up en backlog)
- **No promover F6 ni F7 a DETs nuevas dentro de este ticket** — registrar como follow-up si emerge consenso

### Tamano estimado

8 sessions execute + 1 cierre. **S2 es la mas pesada** (T3, F1+F5 cohesivos con cross-spec join + cambio al step request-execute, ~3-4h). **S7 es la mas larga** (F8 migracion de 13 specs legacy en 3 grupos por modulo, ~5-8h). S1 audit ⚑ y S6 autopilot ⚑ son las mas riesgosas (cambian contratos del flujo). S3 (F4 kanban) es la mas mecanica. **Total estimado: 17-26h efectivas** distribuidas.

### Como vas a saber que funciona

- Abro HOR-022 mid-S3 en HC y veo en S4-S8 (projected) las descripciones reales de cada task, no solo `S{N}.T{M}`
- Cuando el LLM corre una task en S2, el ticket markdown ya tiene la task con descripcion ANTES del Edit/Write del codigo
- Abro el kanban de horadric y los tickets cerrados aparecen ordenados por fecha de cierre, los mas recientes arriba
- Abro el tab Teaching > Intake del propio HOR-022 y veo "skipped — {razon del dev}", no error 404
- En un ticket de prueba con `autopilot: true`, los gates ⚑ fuerte se atraviesan automaticamente y en HC se ven con icon distinto a los aprobados por mi mano
- En un ticket con `external: "FOO-1"` simulado, el commit message no contiene `S{N}.T{M}` ni `REQ-IMPROVE-XX`, pero la tabla `## Commits` del ticket SI los lista
- El audit S1 produce findings priorizados y al menos resuelve H10 (DET-19 extension vs nueva DET vs guideline)
- Post-S7: abro cualquier spec legacy de horadric en HC y el expand de tasks muestra los 6 campos canonicos (Files, Depends on, Rules, Validation, Rollback, Source ref). Banner de shape incompleto desaparece. El propio spec de HOR-022 sigue cumpliendo el canonico al cierre
- Si intento generar un spec nuevo con tabla pobre post-S7, el gate de `_design-shared.md` bloquea con mensaje explicito sobre columnas faltantes

---

## Purpose

Cerrar leaks de visibilidad y coherencia que erosionan la confianza del dev supervisor en HC post HOR-015 (audit grande), HOR-018 (render comodo de specs), HOR-019 (callouts en REQ), HOR-020 (visual + teach optional), HOR-021 (templates project-scoped). Los leaks son 7:

1. Atoms de SectionSessions renderean `description = id` en lugar del texto real (executed Y projected)
2. Ausencia de audit del flujo post-2026-05-10 (DET-23/24/25 y HOR-020 F5 no auditados)
3. Tab Teaching ignora frontmatter — caso `skipped` con razon documentada se renderea como generico "aun no generado"
4. Kanban columna `closed` ordena por `updated ?? created` cuando el campo `closed` del frontmatter es la unica fuente correcta
5. Step `request-execute` no escribe la task con descripcion antes de implementar — se pierde rastro si la session se interrumpe
6. Commits llevan artifacts DKC internos (`S{N}.T{M}`, REQ, learns) tambien en proyectos compartidos donde el resto del equipo no usa DKC — ruido en git log
7. Modo autopilot existe informalmente pero no tiene contrato — el dev supervisor no distingue gates dev-approved vs auto-approved

Para el dev: gana vision real-time del trabajo en ejecucion + del trabajo proyectado, manejo coherente de teach optional, kanban util, commits limpios cuando aplica, modo autopilot opt-in con visibilidad. Para el LLM: contrato claro del modo + patron de registrar antes de ejecutar generalizado a tasks (no solo TCs).

## Analisis de mejora

### Estado actual

- **F1**: `SectionSessions.vue:422` renderea `{{ a.description }}` correctamente. `sessions.ts:374` asigna `description: id` literal — el bug esta en parsePlannedTaskIds. Para projected, `sessions.ts:184` deja `atoms: []` (cae al render legacy con plannedTasks que tienen el mismo bug)
- **F2**: muchas DETs nuevas post-HOR-015 (DET-23/24/25, HOR-020 F5) sin audit de simetria 3-capas. Drift ya identificado en `_design-shared.md` (gate exige `=== 'done'` cuando DET-21 acepta `skipped`)
- **F3**: `teaches.ts:24-29` solo verifica `existsSync`, ignora frontmatter. `SectionTeachings.vue:107-110` muestra mensaje generico cuando `!present`
- **F4**: `TicketsBoard.vue:134-138` sort `byRecencyDesc` usa `updated ?? created`. Comentario inline reconoce que `TicketSummary no expone closed_at formal`
- **F5**: `request-execute.md` orquesta task → commit → continue, pero no obliga a registrar la task con descripcion en el ticket antes del Edit/Write
- **F6**: ningun contrato sobre commits limpios cuando ticket tiene `external`. DET-19 cubre solo "que id usar"
- **F7**: HOR-020 sessions documentan informalmente "modo autonomo asume aprobacion". Sin contrato + sin visibilidad en HC

### Problema / oportunidad

El dev supervisor opera con vision parcial — se entera del detalle al cerrar sessions, no en tiempo real. El equipo no-DKC se confunde con artifacts DKC en commits compartidos. El LLM toma decisiones autonomas en gates ⚑ que el dev no puede distinguir despues. El audit del flujo post-HOR-015 acumula deuda silenciosa.

### Estado deseado

- Vision real-time de tasks en sessions executed Y projected con descripcion real
- Tab Teaching diferenciado por 3 estados con razon visible
- Kanban closed por fecha de cierre correcta
- Commits sensibles al contexto del repo (`external` o no)
- Autopilot formal con visibilidad de gates auto-approved
- Audit liviano cierra el delta post-2026-05-10 con findings priorizados

### Alcance propuesto

Visto en el ticket HOR-022 — 7 items F1-F7 en 7 sessions de execute (S1-S7) + cierre. Reusa HC viewer existente, extiende server con campos opcionales (backwards compat), modifica steps DKC para nuevos patrones, formaliza autopilot como estado.

### Complejidad estimada

Media-alta. S2 es la mas riesgosa (cross-spec join + cambio al step). S6 es la mas conceptualmente delicada (modo autopilot formal). Resto son cambios acotados.

## Requirements

### REQ-IMPROVE-01: Descripcion real de tasks en SectionSessions executed Y projected

> **Que cambia**: las tasks de cada session — tanto las que el LLM esta corriendo ahora como las planificadas para mas tarde — muestran su descripcion real cruzada con el spec del ticket. Antes mostraban solo `S{N}.T{M}` repetido. **Por que**: el dev que supervisa en HC necesita ver "que esta corriendo" y "que viene" sin abrir el spec aparte.

El sistema MUST mostrar para cada atomo de tipo `step` la descripcion real de la task, leida via cross-join entre el ticket y el spec referenciado por `ticket.spec`. Aplica a sessions con status `in_progress`, `executed` y `projected`.

<details><summary>Scenarios de validacion</summary>

- GIVEN un ticket con `spec: SPEC-X` y SPEC-X con tabla `## Tasks` valida, WHEN el viewer renderea SectionSessions, THEN los atomos `step` muestran la descripcion del spec en lugar del ID
- GIVEN un ticket sin `spec: null` o spec sin `## Tasks` parseable, WHEN el viewer renderea SectionSessions, THEN cae al comportamiento actual (description = id) sin error en consola
- GIVEN un ticket con sessions executed Y projected en el plan, WHEN el viewer renderea, THEN ambas categorias muestran descripciones reales

</details>

#### Acceptance

- Visible: TC-1, TC-1b validan executed + projected. TC-8 valida degradacion limpia
- Codigo: parser cruza spec + ticket; viewer no cambia significativamente (sigue rendereando `{{ a.description }}`)

### REQ-IMPROVE-02: request-execute escribe task description antes de implementar

> **Que cambia**: cuando el LLM arranca una task `S{N}.T{M}`, escribe en el ticket markdown la task con su descripcion ANTES de hacer el Edit/Write del codigo. **Por que**: si la session se interrumpe a mitad de task, queda rastro de que estaba haciendo; ademas alimenta la vision real-time del supervisor.

El step `request-execute` MUST registrar la task en curso (id + descripcion + timestamp opcional) en la session activa del ticket markdown ANTES de invocar el primer Edit/Write/Bash que produzca cambios.

<details><summary>Scenarios de validacion</summary>

- GIVEN una task pending del plan, WHEN el LLM la inicia, THEN escribe en el ticket markdown la fila correspondiente con descripcion (no solo el ID)
- GIVEN el LLM se interrumpe a mitad de la task, WHEN el dev abre el ticket, THEN ve la task registrada en la session activa
- GIVEN un ticket sin spec (modo intake), WHEN el LLM arranca una task quick, THEN el patron no aplica (el ticket no tiene plan de sessions formal)

</details>

#### Acceptance

- Comportamiento: TC-2 valida la escritura antes del codigo
- Patron: analogo a DET-25 para TCs, generalizado a tasks

### REQ-IMPROVE-03: Kanban cerrados ordenados por `closed` desc

> **Que cambia**: la columna `Cerrados` del kanban ordena los tickets por fecha real de cierre, no por ultima modificacion. **Por que**: tickets viejos con touch reciente (reindex, edits menores) se mezclan con cerrados recientes, perdiendo el orden cronologico de cierre.

El sistema MUST exponer el campo `closed` del frontmatter en `TicketSummary` y MUST ordenar la columna `closed` del kanban por `closed ?? updated ?? created` desc.

<details><summary>Scenarios de validacion</summary>

- GIVEN tickets cerrados en distintas fechas, WHEN el dev abre kanban, THEN aparecen ordenados por `closed` desc en la columna correspondiente
- GIVEN un ticket cerrado hace 6 meses con un touch ayer, WHEN el dev abre kanban, THEN ese ticket queda DEBAJO de uno cerrado anteayer
- GIVEN otras columnas (open, in_progress), WHEN el dev abre kanban, THEN siguen ordenadas por `updated ?? created` (sin regresion HOR-020 F3)

</details>

#### Acceptance

- TC-3 valida orden cerrados; HOR-020 F3 no regresa en otras columnas

### REQ-IMPROVE-04: Tab Teaching renderea 3 estados con razon visible

> **Que cambia**: el tab Teaching distingue entre `present` (renderea archivo), `pending` (mensaje informativo "se va a generar"), `skipped` (placeholder con razon legible). Antes solo distinguia present/no-present con mensaje generico. **Por que**: hoy un teach skipped por el dev se ve como si nunca se hubiera tocado, perdiendo la razon documentada.

El servidor MUST ampliar `TeachingSummary` con `status: 'present' | 'pending' | 'skipped'` + `skipReason?: string`. El viewer MUST condicionar banner + cuerpo por status. La razon se extrae de la seccion `## Teaching — {Intake|Close}` del ticket markdown cuando el frontmatter dice `skipped`.

<details><summary>Scenarios de validacion</summary>

- GIVEN ticket con `teachings.intake: skipped` y razon en `## Teaching — Intake`, WHEN dev abre tab, THEN ve placeholder con razon legible
- GIVEN ticket con `teachings.intake: pending`, WHEN dev abre tab, THEN ve mensaje informativo "se va a generar"
- GIVEN ticket con `teachings.intake: done` y archivo presente, WHEN dev abre tab, THEN renderea archivo (sin regresion)
- GIVEN HOR-022 mismo (teachings.intake: skipped con razon), WHEN dev abre tab, THEN sirve de fixture real validable

</details>

#### Acceptance

- TC-4 valida skipped en HOR-022 (fixture real); TC-4b valida pending; TC-7 valida regresion done

### REQ-IMPROVE-05: Audit liviano del flujo DKC produce findings priorizados

> **Que cambia**: una sesion dedicada a revisar el delta del flujo desde 2026-05-10 (DET-23/24/25, HOR-020 F5, HOR-021) identificando agujeros, drift y redundancia. **Por que**: sin esto la deuda silenciosa se acumula; el dev opera asumiendo coherencia que no esta validada.

S1 MUST producir una lista de findings priorizados (atacar en este ticket / follow-up / descartar) con racional. MUST resolver al menos H10 (extender DET-19 vs nueva DET vs guideline para F6). MUST documentar el drift identificado pre-audit (gate `_design-shared.md` exige `=== 'done'` cuando DET-21 acepta `skipped`).

<details><summary>Scenarios de validacion</summary>

- GIVEN DETs y steps post-2026-05-10, WHEN auditor revisa simetria 3-capas, THEN produce tabla de findings con priorizacion
- GIVEN F6 H10 abierta, WHEN audit decide entre 3 alternativas, THEN documenta decision con racional aplicable a S5
- GIVEN drift `_design-shared.md` vs DET-21 pre-identificado, WHEN audit lo formaliza, THEN propone fix concreto (atacar en S1 o follow-up)

</details>

#### Acceptance

- TC-5 valida output del audit con findings priorizados

### REQ-IMPROVE-06: Commits sensibles al contexto del repo + tabla DKC

> **Que cambia**: cuando el ticket tiene `external` (proyecto compartido), los commits son limpios segun normativa del equipo sin granularidad DKC visible. Cuando no tiene (proyecto DKC-only), info DKC libre. La tabla `## Commits` del ticket trackea siempre la relacion hash → task → REQ. **Por que**: equipo no-DKC se confunde con artifacts DKC en git log; pero el dev DKC necesita la trazabilidad. Separar capas resuelve ambos.

El step `request-execute` MUST leer `external` del frontmatter al armar el commit message. Si `external` populated → modo limpio (header DET-19, sin `S{N}.T{M}`, sin `REQ-IMPROVE-XX`, sin `[TICKET-id]`). Si null → modo libre. En ambos modos: capturar hash post-commit y anexar a (i) columna `commit` de la SessionTask, (ii) tabla `## Commits` del ticket.

S5 MUST analizar H11 (tabla SQL `commits` en index.db) con propuesta concreta de schema antes de decidir implementar.

<details><summary>Scenarios de validacion</summary>

- GIVEN ticket con `external: "FOO-1"`, WHEN LLM commitea, THEN header lleva "FOO-1" + descripcion limpia. NO contiene S{N}.T{M}, REQ-IMPROVE-XX, ni TICKET-id
- GIVEN ticket con `external: null` (horadric, bayley), WHEN LLM commitea, THEN puede llevar info DKC libremente (sin regresion)
- GIVEN cualquier commit post-S5, WHEN se captura el hash, THEN aparece en tabla `## Commits` con mapping a tasks/REQs; columna `commit` de la SessionTask se actualiza
- GIVEN H11 confirma SQL en S5, WHEN reindex, THEN tabla `commits` en `index.db` refleja las filas del markdown

</details>

#### Acceptance

- TC-9 (modo limpio), TC-9b (modo libre), TC-10 (tabla + opcional SQL)

### REQ-IMPROVE-07: Autopilot formal como estado dinamico

> **Que cambia**: el modo autopilot deja de ser informal (asumido en sessions ⚑ por convencion) y pasa a ser un estado del ticket — `autopilot: false | true | 'strict'` en frontmatter — que el dev puede cambiar en cualquier punto del ciclo via frase conversacional. El LLM lo lee en cada gate. HC viewer diferencia visualmente gates `dev-approved` vs `autopilot-approved`. **Por que**: hoy el dev supervisor no distingue que aprobaste tu vs que asumio el LLM por su cuenta.

El sistema MUST exponer `autopilot` en frontmatter del ticket (default ausente = false). El step `request-execute` MUST leer el estado en cada gate (no cachear) y aplicar las reglas: autopilot=true → optimistic en ⚑ fuerte (auto-approved + learn raw con racional); autopilot='strict' → pausa en ⚑ fuerte; acciones irreversibles (push, merge, close, deps, destructive) → SIEMPRE pausa con confirmacion.

El sistema MUST registrar cambios de modo en sub-tabla `### Modo (autopilot)` del ticket. El HC viewer MUST diferenciar visualmente `approvedBy: 'dev' | 'autopilot'` en AtomicGate + mostrar badge "autopilot" cuando el estado actual del ticket lo amerita.

<details><summary>Scenarios de validacion</summary>

- GIVEN ticket sin `autopilot` (default false), WHEN ejecucion corre, THEN flujo conversacional actual sin regresion (TC-14)
- GIVEN dev escribe `autopilot on` mid-execute, WHEN proximo gate, THEN LLM lee frontmatter actualizado y entra a optimistic; cambio queda en sub-tabla (TC-15)
- GIVEN autopilot=true y gate ⚑ fuerte, WHEN se llega, THEN se marca `auto-approved` + learn raw + continua (TC-11)
- GIVEN autopilot=true y push/merge/close, WHEN se llega, THEN pausa y pide confirmacion (TC-12)
- GIVEN ticket con autopilot=true, WHEN dev abre HC, THEN ve badge "autopilot" + gates auto-approved con icon distinto (TC-13)

</details>

#### Acceptance

- TC-11, TC-12, TC-13, TC-14, TC-15

### REQ-PRESERVE-01: Atoms legacy (tickets pre-HOR-015) renderean sin regresion

> **Que cambia**: tickets pre-2026-05-10 que no tienen `atoms[]` siguen rendereando via render legacy (plannedTasks + tasksCompleted). **Por que**: HOR-015 introdujo modelo atomico nuevo; tickets viejos deben seguir funcionando.

El sistema MUST mantener el render legacy de SectionSessions cuando `hasAtoms === false`.

#### Acceptance

- TC-6 valida abriendo ticket pre-HOR-015 (HOR-005 o similar)

### REQ-PRESERVE-02: Teach done renderea contenido completo sin cambio

> **Que cambia**: tickets con `teachings.intake: done` o `teachings.close: done` siguen rendereando el archivo `.teach/teach-{kind}.md` con todos los bloques dkc:*. **Por que**: F3 amplia tab Teaching con 3 estados pero el caso `done` (mayoritario hoy) no debe cambiar.

#### Acceptance

- TC-7 valida con HOR-020 (teachings.intake: done, teachings.close: done)

### REQ-PRESERVE-03: Degradacion limpia cuando ticket sin spec o spec sin tabla

> **Que cambia**: tickets en intake (sin spec aun) o tickets pre-HOR-013 (sin formato canonico de spec) no rompen el viewer atomico. **Por que**: cross-spec join podria romper si la fuente no esta.

El sistema MUST manejar el caso `ticket.spec === null` o spec sin `## Tasks` parseable cayendo al comportamiento actual (`description = id`) sin error en consola ni 404 al server.

#### Acceptance

- TC-8 valida ambos sub-casos

### REQ-PRESERVE-04: Modo conversacional default sin regresion

> **Que cambia**: sin `autopilot: true`, el flujo del LLM mantiene el comportamiento conversacional actual — preguntar antes de decisiones de design, antes de commits, en gates ⚑ fuerte. **Por que**: autopilot es opt-in; el default debe ser inalterable.

#### Acceptance

- TC-14 valida explicitamente

### REQ-IMPROVE-08: Shape canonico de tabla de tasks en spec (template + gate + viewer + migracion)

> **Que cambia**: el template del spec documenta el shape canonico (11 columnas con ejemplo), el gate de design-shared lo valida automaticamente antes de cerrar el step, el viewer muestra warning visual en specs con shape parcial, y los 13 specs legacy de horadric con shape parcial reciben las columnas faltantes pobladas. **Por que**: hoy el viewer expande tasks vacias cuando faltan las 6 columnas obligatorias (`files`, `depends_on`, `rules`, `validation`, `rollback`, `source_ref`). Causa raiz: el template no documenta el shape; los design-{tipo} generan con shape minimo heredado. SPEC-views-supervisor-flow-22 mismo cayo en este error — fixeado manual 2026-05-15.

El template `templates/records/spec.md` MUST documentar el shape canonico de la tabla de tasks con las 11 columnas (`# | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session`) y ejemplo poblado. El gate 3 de `_design-shared.md` MUST validar que toda tabla de tasks generada cumpla las 6 columnas obligatorias antes de cerrar el step (bloqueante). El viewer (`SpecSessionTree.vue`) MUST mostrar warning visual cuando una tabla no cumple el shape canonico. Los 13 specs legacy de horadric con shape parcial MUST migrarse con las columnas faltantes pobladas (valor `—` cuando no aplica, valor derivado del contexto cuando si aplica).

<details><summary>Scenarios de validacion</summary>

- GIVEN un dev arranca design-improvement nuevo, WHEN el LLM consulta el template, THEN ve el shape canonico con ejemplo poblado y lo replica
- GIVEN un spec generado con shape pobre (falta `rollback`, `rules`, `source_ref`), WHEN el gate 3 del design-shared ejecuta, THEN bloquea avance con mensaje explicito sobre columnas faltantes
- GIVEN un spec legacy con shape parcial, WHEN dev abre en HC, THEN ve banner "shape incompleto: faltan X columnas" + las columnas presentes se renderean
- GIVEN un spec legacy migrado, WHEN dev abre en HC, THEN expand de cualquier task muestra los 6 campos canonicos poblados (con `—` cuando no aplica)
- GIVEN un spec documental sin tabla `# | Task` (catalog/journey/matrix), WHEN dev abre en HC, THEN renderea como markdown plano sin warning ni error (REQ-PRESERVE-05)

</details>

#### Acceptance

- TC-16 valida gate; TC-17 valida warning visual pre-migracion; TC-18 valida specs migrados con campos completos; TC-19 valida specs documentales sin afectar (REQ-PRESERVE-05)

### REQ-PRESERVE-05: Specs documentales (sin tabla ejecutable) no se ven afectados

> **Que cambia**: specs sin tabla `# | Task` (ej. up1 SPEC-mods-curriculum-mapping, pehuen SPEC-role-journeys) siguen rendereando como markdown plano sin afectarse por el gate ni el warning del viewer. **Por que**: no todos los specs son ejecutables — algunos son catalogs, journeys, matrices referenciales. El shape canonico aplica solo a specs con tasks ejecutables.

El sistema MUST detectar la ausencia de tabla `# | Task | ...` y renderear el spec como markdown plano sin invocar SpecSessionTree ni mostrar warnings de shape. El gate de design-shared MUST aplicar solo a specs con tabla de tasks (no a specs documentales que no pasan por design-{tipo}).

#### Acceptance

- TC-19 valida con SPEC-mods-curriculum-mapping (up1) o SPEC-role-journeys (pehuen)

## Non-functional requirements

| NFR | Descripcion |
|-----|-------------|
| Cache del cross-spec join | El cross-join debe cachearse por ticket render — reusar `useMarkdown` cache pattern. Sin esto, abrir un ticket dispara N fetches |
| Backwards compat de TeachingSummary | Campos nuevos (`status`, `skipReason`) son opcionales — consumers actuales que solo leen `present`/`rawMarkdown`/`blocks` no se afectan |
| Auto-reindex post cada step DKC | Sigue funcionando bajo autopilot — sin esto el dev supervisor pierde vision real-time |
| Tabla `## Commits` no debe regenerarse en cada commit | Append-only mientras dure el ticket. Reindex parsea la tabla sin reescribirla |

## Artifacts

### Modified

| Artefacto | F | Cambio |
|-----------|---|--------|
| `server/deckard/sessions.ts` (parsePlannedTaskIds + projected reconstruction) | F1 | Cross-join con spec via `ticket.spec` para resolver description real por task ID. Construir atoms[] para projected (no dejarlos vacios cuando hay spec valido) |
| `server/deckard/teaches.ts` (parseTeaching) | F3 | Recibir/leer frontmatter ticket + body. Calcular `status: 'present' | 'pending' | 'skipped'`. Extraer `skipReason` de seccion `## Teaching — {Intake|Close}` cuando `skipped` |
| `shared/types.ts` (TeachingSummary + TicketSummary + SessionTask + AtomicGate) | F3, F4, F7 | TeachingSummary.status + skipReason. TicketSummary.closed?. AtomicGate.approvedBy?. SessionTask.commit ya existe (verificar) |
| `src/components/ticket-sections/SectionTeachings.vue` | F3 | 3 estados condicionales (banner + cuerpo). Placeholder con razon cuando skipped |
| `src/components/ticket-sections/SectionSessions.vue` | F1, F7 | AtomicGate condiciona icono/color por `approvedBy`. AtomicStep usa description cruzada (sin cambio en codigo Vue, el cambio ocurre en server) |
| `src/views/TicketsBoard.vue` | F4, F7 | byRecencyDesc usa `closed` para columna closed; badge "autopilot" si ticket activo lo amerita |
| `src/api/client.ts` | F3, F4, F7 | Reflejar tipos extendidos de TeachingSummary, TicketSummary, AtomicGate |
| `prompts/steps/request-execute.md` | F5, F6, F7 | Escribir task description antes del primer Edit; capturar hash post-commit + anexar a tabla `## Commits` y SessionTask; aplicar modo limpio commit segun `external`; leer estado autopilot en cada gate + aplicar reglas |
| `prompts/steps/request-intake.md` + `commands/dkc.md` | F7 | Reconocer triggers conversacionales (`autopilot on/off/strict`) y actualizar frontmatter del ticket activo |
| `prompts/_style.md` | F6 | Guideline de commit messages segun `external` |
| `templates/records/ticket.md` | F6, F7 | Documentar seccion `## Commits` + sub-seccion `### Modo (autopilot)` en `## Sessions` |
| `prompts/deterministic-rules.md` | F2 | Fix del drift identificado (gate de design vs DET-21 skipped); ajustes que el audit emerja |
| `prompts/steps/_design-shared.md` | F2, F8 | (F2) Aceptar `teachings.{intake|close} ∈ {'done', 'skipped'}` en el gate; (F8) agregar check en GATE 3: tabla de tasks tiene 6 columnas obligatorias |
| `templates/records/spec.md` | F8 | Documentar shape canonico de tabla de tasks (11 columnas + ejemplo poblado + nota explicita) |
| `horadric-cube/src/components/specs/SpecSessionTree.vue` | F8 | Detectar shape parcial, mostrar banner warning con columnas faltantes |
| 13 specs legacy en `horadric/specs/SPEC-*.md` | F8 | Migracion retroactiva — agregar columnas faltantes (`rollback`, `rules`, `source_ref` mayoritariamente) |

### Added (opcional, segun decision)

| Artefacto | F | Cuando | Decision |
|-----------|---|--------|----------|
| `server/deckard/commitsTable.ts` (parser de `## Commits`) | F6 | Si H11 confirma SQL | Decision en S5 |
| Tabla SQL `commits` en `index.db` | F6 | Si H11 confirma SQL | Decision en S5 |
| Endpoint `/api/specs/:id/tasks` o ampliacion del payload de spec | F1 | Si cross-join requiere endpoint dedicado | Resolver en S2 — alternativa: parsear spec inline en sessions.ts |

## Tasks

> **Numeracion**: el ticket HOR-022 no tiene `### Session N` previas. Plan empieza en S1.

### Session 1 — Audit liviano del flujo DKC post-HOR-015 [tipo: ⚑ fuerte] [tier: T2]

| # | Task | REQ | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Inventariar cambios al flujo DKC desde 2026-05-10: DET-23/24/25, HOR-020 F5 (teach skip), HOR-021 templates project-scoped, drift `_design-shared.md` ya pre-identificado | REQ-IMPROVE-05 | researcher | — | `deckard/prompts/deterministic-rules.md`, `deckard/prompts/steps/_design-shared.md`, `deckard/prompts/steps/teach-intake.md`, `deckard/prompts/steps/request-close.md`, `deckard/prompts/steps/request-execute.md`, `deckard/templates/records/ticket.md`, `deckard/templates/records/spec.md` | Lista de items revisados con notas inline sobre coherencia 3-capas | (no aplica — solo lectura) | DET-7, DET-11, DET-13 | pending | 1 |
| S1.T2 | Revisar simetria 3-capas (regla / workflow / step) por cada DET nueva post-2026-05-10. Identificar capas faltantes o no implementadas | REQ-IMPROVE-05 | researcher | S1.T1 | `deckard/prompts/deterministic-rules.md`, `deckard/prompts/workflows/request.md`, `deckard/prompts/steps/*` | Tabla de findings con DET-N → capas presentes / faltantes / drift | (no aplica) | DET-7, DET-11, RULE-workflow-det-introduction-001 | pending | 1 |
| S1.T3 | Identificar agujeros donde el LLM puede saltar gates en modo autonomo informal (cross-check con F7 reglas formales). Documentar cada agujero con archivo:linea | REQ-IMPROVE-05 | researcher | S1.T2 | `deckard/prompts/steps/request-execute.md`, sessions de HOR-015/HOR-020 como evidencia | Tabla de gates "saltables" con riesgo + propuesta de fix | (no aplica) | DET-7, DET-13 | pending | 1 |
| S1.T4 | Decision H10: extender DET-19 con clausula granularidad vs nueva DET (DET-27?) vs solo guideline en `prompts/_style.md`. Presentar al dev con pros/cons | REQ-IMPROVE-05 | architect | S1.T3 | `deckard/prompts/deterministic-rules.md`, `deckard/prompts/_style.md` | Decision documentada con racional + criterio que tomamos en este ticket vs follow-up | git revert si edicion erronea | DET-2, DET-11 | pending | 1 |
| S1.T5 | Fix del drift `_design-shared.md` vs DET-21: gate 1 acepta `teachings.{intake|close} ∈ {'done', 'skipped' (con justificacion)}` (alinear con DET-21 post-HOR-020-F5) | REQ-IMPROVE-05 | developer | S1.T4 | `deckard/prompts/steps/_design-shared.md` | grep confirma checkbox actualizado; smoke: este propio ticket con `teachings.intake: skipped` paso el gate al entrar al design (validacion conceptual ya pasada) | git revert | DET-7, DET-21, RULE-workflow-det-introduction-001 | pending | 1 |
| S1.T6 | Producir tabla de findings priorizados (atacar en este ticket / follow-up / descartar) con racional 1 linea por item. Items "atacar" se incorporan al backlog del ticket o al alcance de sessions posteriores si caben | REQ-IMPROVE-05 | scribe | S1.T5 | `tickets/HOR-022.md` (seccion `## Backlog`) | Tabla en el ticket con N findings priorizados. Decisiones H10 + drift documentadas como DEC-LOCAL-04/05 si ameritan | (no aplica) | DET-13, DET-16 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 — tier T2 + Quality review DET-23 standard. Dev aprueba findings + decisiones (H10, drift). Auto-reindex post-gate | — | reviewer | S1.T6 | — | T2 ok; DET-23 dim 7 (claridad), dim 11 (KB-first sobre DETs) pass. Findings ≥ 5 items priorizados | (no aplica) | DET-13, DET-20, DET-23 | pending | 1 |

### Session 2 — F1 + F5 cohesivos: descripcion real executed + projected + escritura pre-task [tipo: ⚑ fuerte] [tier: T3]

| # | Task | REQ | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear helper `server/deckard/specTasks.ts` que parsee `## Tasks` del spec → `Map<TaskId, {description, status, commit, req}>`. Reusar logica de `specTaskRules.ts` si aplica. Tolerante a spec sin tabla `## Tasks` (retorna Map vacio) | REQ-IMPROVE-01 | developer | S1.GATE | `horadric-cube/server/deckard/specTasks.ts` (nuevo), `horadric-cube/server/deckard/specTaskRules.ts` (referencia) | Unit test: parser carga tasks de SPEC-views-supervisor-flow-22 con descripcion correcta; spec sin `## Tasks` retorna Map vacio sin error | git revert | DET-2, DET-7, DET-11 | pending | 2 |
| S2.T2 | `sessions.ts`: integrar cross-join — para sessions executed reemplaza `description` en atoms existentes; para projected reconstruye `atoms[]` desde el spec si `atoms.length === 0` y `plannedTasks.length > 0`. Degradacion limpia si `ticket.spec === null` o helper retorna Map vacio | REQ-IMPROVE-01, REQ-PRESERVE-03 | developer | S2.T1 | `horadric-cube/server/deckard/sessions.ts` | Unit test (sessions.test.ts): ticket con spec → atoms tienen description != id; ticket sin spec → fallback al comportamiento previo (description = id) | git revert | DET-2, DET-7, RULE-server-frontmatter-legacy-001 | pending | 2 |
| S2.T3 | Smoke: levantar HC dev, abrir HOR-022 en sessions tab. Verificar visualmente que S3-S7 (projected) muestran descripcion real de tasks; S1-S2 (las executed en curso) tambien | REQ-IMPROVE-01 | reviewer | S2.T2 | `horadric-cube` running on `localhost:3016` | Captura visual en `HOR-022.screenshots/S2-cross-spec-join.png` muestra descripcion real != ID en projected | (no aplica) | DET-13 | pending | 2 |
| S2.T4 | `prompts/steps/request-execute.md`: agregar paso "registrar task con description antes de implementar" como sub-paso obligatorio. Patron: cuando el LLM va a ejecutar `S{N}.T{M}`, primero hace Edit al ticket markdown agregando la fila a la session activa con descripcion del spec | REQ-IMPROVE-02 | developer | S2.T3 | `deckard/prompts/steps/request-execute.md` | Step documenta el sub-paso con ejemplo. Lectura del propio LLM en proximas tasks confirma | git revert | DET-7, DET-15, DET-25 | pending | 2 |
| S2.T5 | Dogfooding F5: aplicar el patron a las proximas tasks del propio HOR-022 (S2.T6 en adelante). El LLM escribe en el ticket markdown la task con description antes del codigo | REQ-IMPROVE-02 | developer | S2.T4 | `tickets/HOR-022.md` (seccion sessions execute) | El ticket markdown muestra cada task con descripcion antes de su Edit/Write asociado | git revert | DET-7, DET-15, DET-25 | pending | 2 |
| S2.T6 | Regresion: validar TC-6 (ticket pre-HOR-015 sin atoms[] sigue rendereando legacy) + TC-8 (ticket sin spec degrada sin error). Smoke en HOR-005 + ticket horadric en intake | REQ-PRESERVE-01, REQ-PRESERVE-03 | reviewer | S2.T5 | `horadric-cube` running, HOR-005 + ticket intake como fixtures | TC-6 y TC-8 pass; sin error en consola del browser; sin 404 al server | (no aplica) | DET-7, DET-13 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 — tier T3 + Quality review DET-23 exhaustive. Dev aprueba visualmente F1 executed + projected + F5 escritura pre-task. ⚑ fuerte — sesion mas riesgosa del ticket | — | reviewer | S2.T6 | — | T3 ok; DET-23 dim 1-7 + dim 4 (testing con coverage delta neutro) + dim 8 (a11y screen reader anuncia descripcion). Dev confirma visual | (no aplica) | DET-13, DET-20, DET-23 | pending | 2 |

### Session 3 — F4 kanban cerrados sort por `closed` desc [tipo: auto] [tier: T1]

| # | Task | REQ | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Shared types: agregar `closed?: string \| null` a interface `TicketSummary` (campo opcional, backwards compat) | REQ-IMPROVE-03 | developer | S2.GATE | `horadric-cube/shared/types.ts` (o equivalente) | Type-check verde; tipo opcional no rompe consumers existentes | git revert | DET-2, DET-7, RULE-server-frontmatter-legacy-001 | pending | 3 |
| S3.T2 | Server: poblar `closed` en TicketSummary desde frontmatter del ticket. Tolerar ausencia (tickets open / in_progress no tienen closed) | REQ-IMPROVE-03 | developer | S3.T1 | `horadric-cube/server/deckard/` (constructor de TicketSummary) | Unit test: ticket cerrado expone `closed = "2026-05-13"`; ticket open expone `closed = null` | git revert | DET-2, DET-7 | pending | 3 |
| S3.T3 | `TicketsBoard.vue`: agregar helper `byClosedDesc(a, b) = (a.closed ?? a.updated ?? a.created) vs b` (desc). Aplicar solo a la columna `closed`; otras columnas siguen `byRecencyDesc` | REQ-IMPROVE-03, REQ-PRESERVE-01 | developer | S3.T2 | `horadric-cube/src/views/TicketsBoard.vue` | Smoke: kanban horadric — cerrados aparecen ordenados por `closed` desc; columnas open/in_progress sin regresion | git revert | DET-2, DET-7, DET-16 | pending | 3 |
| S3.T4 | Smoke visual: levantar HC, abrir kanban horadric con 22 tickets. HOR-022 (al cerrar) arriba; HOR-021, HOR-020 abajo en orden cronologico de close | REQ-IMPROVE-03 | reviewer | S3.T3 | HC dev running | Captura visual en `HOR-022.screenshots/S3-kanban-closed-sort.png` confirma orden esperado | (no aplica) | DET-13 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 — tier T1 + Quality review DET-23 light. Auto-continue si type-check pass + smoke ok | — | reviewer | S3.T4 | — | T1 ok; DET-23 dim 1, 2, 7 (claridad funcion helper) pass | (no aplica) | DET-13, DET-20, DET-23 | pending | 3 |

### Session 4 — F3 teach skip visible (3 estados con razon) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | REQ | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Shared types: ampliar `TeachingSummary` con `status: 'present' \| 'pending' \| 'skipped'` + `skipReason?: string \| null` (campos opcionales — backwards compat con consumers que solo leen `present`/`rawMarkdown`/`blocks`) | REQ-IMPROVE-04 | developer | S3.GATE | `horadric-cube/shared/types.ts` | Type-check verde; consumers actuales no rompen (campos opcionales) | git revert | DET-2, DET-7, RULE-server-frontmatter-legacy-001 | pending | 4 |
| S4.T2 | Server `teaches.ts`: `parseTeaching` ahora recibe (o lee internamente) frontmatter del ticket + body. Calcular `status` desde `frontmatter.teachings.{kind}` con prioridad: archivo presente → `present`; frontmatter `skipped` → `skipped`; frontmatter `pending` o ausente → `pending`. Extraer `skipReason` de seccion `## Teaching — {Intake\|Close}` del ticket markdown (parser de linea `**Status**: skipped — {razon}`) | REQ-IMPROVE-04 | developer | S4.T1 | `horadric-cube/server/deckard/teaches.ts` | Unit test: HOR-022 → intake `status: 'skipped'` + `skipReason` no vacio; HOR-020 → intake `status: 'present'`; ticket sin teach → `status: 'pending'` | git revert | DET-2, DET-7, RULE-server-frontmatter-legacy-001 | pending | 4 |
| S4.T3 | View `SectionTeachings.vue`: condicionar banner + cuerpo por `status`. Banner: present (verde), pending (slate), skipped (amber/neutro). Cuerpo: present (renderea markdown como hoy), pending (mensaje "Se va a generar al pasar por teach-intake/close"), skipped (placeholder con `skipReason` legible — formato "Teach omitido a peticion del dev — razon: {skipReason}") | REQ-IMPROVE-04 | developer | S4.T2 | `horadric-cube/src/components/ticket-sections/SectionTeachings.vue` | Smoke: 3 ramas validables visualmente con HOR-022 (skipped) + ticket fixture pending + HOR-020 (done) | git revert | DET-7, RULE-viewer-assets-context-001 | pending | 4 |
| S4.T4 | Smoke TC-4/4b/7: capturas visuales del tab Teaching para los 3 estados. HOR-022 fixture real para skipped, ticket en intake para pending, HOR-020 para done | REQ-IMPROVE-04, REQ-PRESERVE-02 | reviewer | S4.T3 | HC dev running, HOR-022 + HOR-020 + ticket pending | Capturas en `HOR-022.screenshots/S4-teach-{skipped,pending,done}.png` confirman los 3 estados | (no aplica) | DET-13 | pending | 4 |
| **S4.GATE** | Gate de sync Session 4 — tier T2 + Quality review DET-23 standard. ⚑ fuerte — dev aprueba visualmente los 3 estados | — | reviewer | S4.T4 | — | T2 ok; DET-23 dim 1, 2, 3, 7, 8 (a11y banner con role status) pass. Dev confirma visual | (no aplica) | DET-13, DET-20, DET-23 | pending | 4 |

### Session 5 — F6 commits sensibles a `external` + tabla DKC + analisis SQL [tipo: ⚑ fuerte] [tier: T2]

| # | Task | REQ | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Definir shape de tabla `## Commits` en el ticket markdown (columnas minimas: Hash / Fecha / Mensaje / Tasks vinculadas / REQs cubiertos). Documentar en `templates/records/ticket.md` como nueva seccion canonica del ticket | REQ-IMPROVE-06 | architect | S4.GATE | `deckard/templates/records/ticket.md` | Template actualizado con seccion + ejemplo. Decision documentada (markdown como fuente de verdad) | git revert | DET-2, DET-11, RULE-workflow-session-format-canonical-002 | pending | 5 |
| S5.T2 | `prompts/steps/request-execute.md`: leer `external` del frontmatter al armar el commit message. Si populated → modo limpio (header DET-19, sin `S{N}.T{M}`, sin `REQ-IMPROVE-XX`, sin `[TICKET-id]`); si null → modo libre. En ambos modos: captura `git log -1 --format=%H` post-commit y anexa a (i) columna `commit` de la SessionTask correspondiente en el ticket markdown, (ii) tabla `## Commits` del ticket | REQ-IMPROVE-06 | developer | S5.T1 | `deckard/prompts/steps/request-execute.md` | Step documenta ambos modos con ejemplo. Smoke conceptual: leer un commit con `external` simulado y otro sin | git revert | DET-7, DET-19 | pending | 5 |
| S5.T3 | `prompts/_style.md`: guideline de commit messages segun modo. Que limpiar (S{N}.T{M}, REQ-IDs, learns) cuando `external` populated. Que dejar (Conventional Commits header, descripcion clara) | REQ-IMPROVE-06 | architect | S5.T2 | `deckard/prompts/_style.md` | Guideline visible en file con ambos ejemplos (modo limpio + modo libre) | git revert | DET-11 | pending | 5 |
| S5.T4 | **Analizar H11**: propuesta concreta de schema SQL `commits` en `projects/{project}/index.db`. Cols sugeridas: `hash, ticket_id, session_number, task_ids JSON, req_ids JSON, date, message_short`. Estimar valor (queries cross-ticket, dashboards HC) + velocidad (1 query SQL vs grep + parse N markdowns) + costo (parser en reindex + sync). Presentar decision al dev | REQ-IMPROVE-06 | architect | S5.T3 | Propuesta como bloque markdown en sub-decision del ticket o seccion del spec | Decision documentada con racional. Tres outcomes: implementar / follow-up / descartar. Si implementar → S5.T5 ejecuta | (no aplica — solo analisis) | DET-2, DET-11 | pending | 5 |
| S5.T5 | **Si S5.T4 = implementar**: parser de `## Commits` en `commands/dkc-reindex` o equivalente. Crear tabla `commits` en `index.db` (CREATE TABLE IF NOT EXISTS). Populate desde markdown en cada reindex. **Si S5.T4 = follow-up/descartar**: marcar task `done` con nota "solo markdown como fuente de verdad por decision S5.T4" | REQ-IMPROVE-06 | developer | S5.T4 | `deckard/commands/dkc-reindex` o equivalente, `horadric-cube/server/deckard/sqlite.ts` (si necesario) | Si implementado: `SELECT * FROM commits WHERE ticket_id = 'HOR-022'` retorna filas correctas. Si no: nota documentada | git revert (esquema SQL idempotente con IF NOT EXISTS) | DET-2, DET-7, RULE-index-001 | pending | 5 |
| S5.T6 | Smoke TC-9/9b/10: en horadric (sin external) commit lleva info DKC libre (TC-9b); simulado con `external: "FOO-1"` produce header limpio (TC-9); tabla `## Commits` del ticket se popula con hash + mapping (TC-10) | REQ-IMPROVE-06 | reviewer | S5.T5 | HC dev running, ticket activo con commits aplicados | TC-9, TC-9b, TC-10 pass. Capturas en `HOR-022.screenshots/` si visible en HC | (no aplica) | DET-13, DET-25 | pending | 5 |
| **S5.GATE** | Gate de sync Session 5 — tier T2 + Quality review DET-23 standard. ⚑ fuerte — dev aprueba shape de tabla + decision H11 documentada | — | reviewer | S5.T6 | — | T2 ok; DET-23 dim 1, 2, 6 (mantenibilidad — guideline reusable), dim 7 pass. Dev confirma decision H11 | (no aplica) | DET-13, DET-20, DET-23 | pending | 5 |

### Session 6 — F7 autopilot formal: estado dinamico + reglas + visibilidad HC [tipo: ⚑ fuerte] [tier: T2]

| # | Task | REQ | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | `templates/records/ticket.md`: agregar campo `autopilot: false \| true \| 'strict'` al frontmatter como opcional (default ausente = false). Agregar sub-seccion `### Modo (autopilot)` en `## Sessions` con tabla cronologica (timestamp/cambio/razon/desde-gate) | REQ-IMPROVE-07 | scribe | S5.GATE | `deckard/templates/records/ticket.md` | Template actualizado, ejemplo visible | git revert | DET-2, RULE-workflow-session-format-canonical-002 | pending | 6 |
| S6.T2 | Shared types: ampliar `AtomicGate` con `approvedBy?: 'dev' \| 'autopilot' \| null`. Backwards compat: ausencia se interpreta como `'dev'` (default historico) | REQ-IMPROVE-07 | developer | S6.T1 | `horadric-cube/shared/types.ts` | Type-check verde; consumers actuales sin regresion | git revert | DET-2, DET-7, RULE-server-frontmatter-legacy-001 | pending | 6 |
| S6.T3 | `prompts/steps/request-intake.md` + `commands/dkc.md`: reconocer triggers conversacionales (`autopilot on/off/strict`, `modo manual`, `pausa`, `iterate`, `para`). Cuando el LLM detecta un trigger, actualiza `autopilot` del frontmatter del ticket activo + escribe linea en sub-tabla `### Modo (autopilot)` (timestamp, cambio, motivo opcional, gate desde donde aplica) | REQ-IMPROVE-07 | developer | S6.T2 | `deckard/prompts/steps/request-intake.md`, `deckard/commands/dkc.md` | Steps documentan triggers con tabla de keywords. Validacion conceptual leyendo el step | git revert | DET-7, DET-15, DET-16 | pending | 6 |
| S6.T4 | `prompts/steps/request-execute.md`: leer `autopilot` del frontmatter EN CADA GATE (no cachear en variable de sesion). Aplicar reglas — gate `auto` con autopilot=true → continue silencioso; gate ⚑ fuerte + autopilot=true (optimistic) → marcar `approvedBy: 'autopilot'` + learn raw con racional + continue; gate ⚑ fuerte + autopilot='strict' → pausa; acciones irreversibles (push/merge/close/deps/destructive) → SIEMPRE pausa con confirmacion explicita | REQ-IMPROVE-07, REQ-PRESERVE-04 | developer | S6.T3 | `deckard/prompts/steps/request-execute.md` | Step con tabla explicita de modos x acciones. Lista de irreversibles fija | git revert | DET-7, DET-13, DET-15 | pending | 6 |
| S6.T5 | Sessions parser (`server/deckard/sessions.ts`): parsear sub-seccion `### Modo (autopilot)` (opcional, ausente = []). Atomic gates exponen `approvedBy` desde la fila del gate en `## Sessions` (heuristica: si el gate tiene una nota "auto-approved" o equivalente) | REQ-IMPROVE-07 | developer | S6.T4 | `horadric-cube/server/deckard/sessions.ts` | Unit test: ticket fixture con `### Modo (autopilot)` parsea entradas; ticket sin sub-seccion retorna [] sin error | git revert | DET-2, DET-7 | pending | 6 |
| S6.T6 | HC viewer: badge "autopilot" en TicketDetail (si `frontmatter.autopilot ∈ {true, 'strict'}`) + en kanban card del ticket activo. Diferencial visual en `AtomicGate`: icono/color distinto cuando `approvedBy === 'autopilot'` (ej. amber border-l-4 vs verde para dev-approved) | REQ-IMPROVE-07 | developer | S6.T5 | `horadric-cube/src/components/ticket-sections/SectionSessions.vue`, `horadric-cube/src/views/TicketsBoard.vue`, posible nuevo componente `AutopilotBadge.vue` | Smoke: ticket simulado con `autopilot: true` muestra badge y gates auto-approved con icon distinto | git revert | DET-7, RULE-viewer-assets-context-001 | pending | 6 |
| S6.T7 | Smoke TC-11/12/13/14/15: simular ticket de prueba en autopilot, validar transiciones (frontmatter + sub-tabla + gates con approvedBy). TC-14: ticket sin autopilot mantiene flujo conversacional. TC-15: cambio mid-execute via trigger conversacional surte efecto al proximo gate | REQ-IMPROVE-07, REQ-PRESERVE-04 | reviewer | S6.T6 | HC dev running, ticket fixture autopilot | TC-11/12/13/14/15 pass. Capturas en `HOR-022.screenshots/S6-autopilot-{badge,gate-diff}.png` | (no aplica) | DET-13, DET-25 | pending | 6 |
| **S6.GATE** | Gate de sync Session 6 — tier T2 + Quality review DET-23 standard. ⚑ fuerte — dev aprueba mecanica + visualizacion del autopilot | — | reviewer | S6.T7 | — | T2 ok; DET-23 dim 1-3 + dim 6 + dim 7 + dim 10 (manejo de error si trigger ambiguo) pass. Dev confirma | (no aplica) | DET-13, DET-20, DET-23 | pending | 6 |

### Session 7 — F8 shape canonico spec: template + gate + viewer graceful + migracion legacy [tipo: ⚑ fuerte] [tier: T2]

| # | Task | REQ | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----|-------|------------|-------|------------|----------|-------|--------|---------|
| S7.T1 | `templates/records/spec.md`: documentar shape canonico de tabla de tasks con las 11 columnas + ejemplo poblado (no abreviado). Agregar nota explicita "Las 6 columnas obligatorias para HC viewer: files, depends_on, rules, validation, rollback, source_ref" | REQ-IMPROVE-08 | scribe | S6.GATE | `deckard/templates/records/spec.md` | Template visible con ejemplo de 11 columnas + nota; smoke: leer template y confirmar shape correcto | git revert | DET-2, DET-11, RULE-workflow-det-introduction-001 | pending | 7 |
| S7.T2 | `prompts/steps/_design-shared.md` GATE 3: agregar check obligatorio "la tabla de tasks tiene las 6 columnas: files, depends_on, rules, validation, rollback, source_ref (o sus variantes con espacios: Files, Depends on, Rules, Validation, Rollback, Source ref)". Bloqueante si falta alguna. Solo aplica si el spec tiene tabla `# | Task` (no aplica a specs documentales) | REQ-IMPROVE-08, REQ-PRESERVE-05 | developer | S7.T1 | `deckard/prompts/steps/_design-shared.md` | Gate documentado con check explicito; el propio HOR-022 spec ya cumple (4 specs canonicos en horadric) | git revert | DET-7, DET-11 | pending | 7 |
| S7.T3 | `SpecSessionTree.vue` (o similar): detectar tablas con shape parcial. Si faltan >= 1 de las 6 columnas obligatorias, mostrar banner amarillo/neutro "Shape de spec incompleto: faltan {N} columnas ({lista}). Migrar para experiencia completa". Render de columnas presentes funciona | REQ-IMPROVE-08 | developer | S7.T2 | `horadric-cube/src/components/specs/SpecSessionTree.vue` | Smoke: abrir SPEC-viewer-mvp (sin shape canonico) — banner visible; abrir SPEC-views-visual-nav-teach (canonico) — sin banner | git revert | DET-7, RULE-viewer-assets-context-001 | pending | 7 |
| S7.T4 | Migracion grupo 1 — modulo `workflow` (5 specs): SPEC-workflow-dkc-flow-audit-15, SPEC-workflow-dkc-followup-13, SPEC-workflow-teach-intake-close, SPEC-workflow-teach-narrative-16, SPEC-workflow-ticket-higiene. Agregar `rollback`, `source_ref` (estos 5 tienen `rules` ya). Valor del contexto donde aplique, `—` cuando no | REQ-IMPROVE-08 | developer | S7.T3 | 5 archivos `deckard/projects/horadric/specs/SPEC-workflow-*.md` | Specs migrados expanden tasks con campos completos en HC. Banner de warning desaparece | git revert por spec individual | DET-7 | pending | 7 |
| S7.T5 | Migracion grupo 2 — modulo `views/viewer/server` (5 specs): SPEC-viewer-mvp, SPEC-viewer-links-fix, SPEC-viewer-ticket-assets, SPEC-viewer-templates-dkc-project-scoped, SPEC-server-legacy-tolerance. Agregar `rollback`, `rules`, `source_ref` (3 columnas faltantes en cada uno aproximadamente) | REQ-IMPROVE-08 | developer | S7.T4 | 5 archivos `deckard/projects/horadric/specs/SPEC-{viewer,server}-*.md` | Specs migrados expanden tasks con campos completos. Banner desaparece | git revert por spec | DET-7 | pending | 7 |
| S7.T6 | Migracion grupo 3 — modulo `deckard-core` (3 specs restantes): SPEC-deckard-core-prompts-weight, SPEC-pw-active-ticket-integration, SPEC-screenshots-subdir-convention. Agregar columnas faltantes | REQ-IMPROVE-08 | developer | S7.T5 | 3 archivos `deckard/projects/horadric/specs/SPEC-{deckard-core,pw,screenshots}-*.md` | Specs migrados; total 13 specs legacy resueltos | git revert por spec | DET-7 | pending | 7 |
| S7.T7 | Smoke TC-16/17/18/19: validar gate (intentar generar spec con shape pobre — debe bloquear), warning visual pre-migracion (un spec antes de migrar), specs migrados con expand completo, specs documentales (up1 SPEC-mods-* o pehuen SPEC-role-*) renderean sin afectarse | REQ-IMPROVE-08, REQ-PRESERVE-05 | reviewer | S7.T6 | HC dev running, ticket fixture para probar gate | TC-16, TC-17, TC-18, TC-19 pass. Capturas en `HOR-022.screenshots/S7-{gate-block,warning,migrated,documental}.png` | (no aplica) | DET-13, DET-25 | pending | 7 |
| **S7.GATE** | Gate de sync Session 7 — tier T2 + Quality review DET-23 standard. ⚑ fuerte — dev aprueba migracion + gate + viewer graceful. 13 specs legacy quedan canonicos | — | reviewer | S7.T7 | — | T2 ok; DET-23 dim 1, 2, 6 (mantenibilidad — pattern reusable), dim 7 pass. Dev confirma | (no aplica) | DET-13, DET-20, DET-23 | pending | 7 |

### Session 8 — Cierre — request-close + teach-close decision [tipo: ⚑ fuerte] [tier: T2]

| # | Task | REQ | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----|-------|------------|-------|------------|----------|-------|--------|---------|
| S8.T1 | Revisar backlog del ticket post-S1 + S7: si hay items `must` resueltos durante execute → tachar con fecha. Si emergieron findings nuevos del audit (S1.T6) atacados en sessions posteriores → confirmar. Si quedan items `must` sin abordar → bloquea cierre (DET-17) | REQ-IMPROVE-05 | reviewer | S7.GATE | `tickets/HOR-022.md` (seccion `## Backlog`) | Lista de backlog `must` resueltos o documentados como follow-up con justificacion | (no aplica) | DET-13, DET-17 | pending | 8 |
| S8.T2 | DET-22 paso 0: preguntar al dev `¿generar teach-close para HOR-022?`. Si si → sintetizar `tickets/HOR-022.teach/teach-close.md` con bloques `dkc:hypothesis-map` final + decisiones tomadas + lessons learned. Si skip → frontmatter `teachings.close: skipped` + razon en `## Teaching — Close` del ticket. Actualizar frontmatter | REQ-IMPROVE-05 | scribe | S8.T1 | `tickets/HOR-022.md` (frontmatter + seccion `## Teaching — Close`), opcional `HOR-022.teach/teach-close.md` | Frontmatter `teachings.close ∈ {'done', 'skipped'}` con razon documentada si skipped | git revert | DET-13, DET-22 | pending | 8 |
| S8.T3 | Dogfooding F6 — commits del cierre limpios. Horadric no tiene `external` → commits del cierre pueden llevar info DKC libre. Validar tabla `## Commits` se popula con los hashes de los commits del cierre (al menos 1) | REQ-IMPROVE-06 | reviewer | S8.T2 | `tickets/HOR-022.md` (tabla `## Commits`) | Tabla `## Commits` con ≥ 1 entrada del cierre. Hashes corresponden a commits reales (`git log`) | (no aplica) | DET-7, DET-25 | pending | 8 |
| S8.T4 | Dogfooding F7: si HOR-022 corrio con `autopilot: true` en alguna fase, validar que gates de S2-S7 que se atravesaron tienen `approvedBy` correcto en el sessions parser. Si autopilot quedo `false` durante todo el ticket, este checkpoint no aplica (skip con nota) | REQ-IMPROVE-07 | reviewer | S8.T3 | `tickets/HOR-022.md` (sub-tabla `### Modo (autopilot)` si aplica) | Coherencia entre sub-tabla de cambios de modo y `approvedBy` de cada gate atravesado | (no aplica) | DET-7, DET-13 | pending | 8 |
| S8.T5 | Dogfooding F8: validar que el propio SPEC-views-supervisor-flow-22 sigue cumpliendo shape canonico al cierre (las 8 sessions con 11 columnas). Abrir el spec en HC y verificar que expand de cualquier task muestra los 6 campos canonicos | REQ-IMPROVE-08 | reviewer | S8.T4 | HC dev running, SPEC-views-supervisor-flow-22 | Expand de cualquier task del spec muestra Files, Depends on, Rules, Validation, Rollback, Source ref poblados. Banner de shape incompleto NO aparece | (no aplica) | DET-7, DET-13 | pending | 8 |
| S8.T6 | Acceptance checkpoints — recorrer cada REQ-IMPROVE-01..08 + REQ-PRESERVE-01..05 confirmando TC `pass` con evidence registrada (DET-25). Learns raw del ticket refinados (promover a rules/decisions o descartar). Coverage map del ticket actualizado | REQ-IMPROVE-05, REQ-PRESERVE-* | reviewer | S8.T5 | `tickets/HOR-022.md` (Coverage map + Test cases + Learns), `projects/horadric/rules/`, `projects/horadric/decisions/` | Coverage map sin NOT COVERED. Learns con `status: promoted` o `discarded`. Si rules/decisions creadas, sus archivos existen en filesystem | git revert si edicion masiva con error | DET-7, DET-13, DET-25 | pending | 8 |
| S8.T7 | Summary del ticket: llenar secciones `### What was requested / What was done / What was discovered / Testing summary / Metrics`. Status frontmatter `in_progress → closed`. Fecha `closed: 2026-05-{XX}`. Reindex final | REQ-IMPROVE-05 | scribe | S8.T6 | `tickets/HOR-022.md` (frontmatter + seccion `## Summary`) | Frontmatter cerrado correctamente. Summary sin placeholders. `dkc-reindex horadric` exit 0 | git revert si frontmatter erroneo | DET-13 | pending | 8 |
| **S8.GATE** | Gate de cierre — tier T2 + Quality review DET-23 exhaustive sobre el ticket completo. ⚑ fuerte — dev confirma close. Reindex final. Commits agrupados segun F6 modo (libre en horadric) | — | reviewer | S8.T7 | — | T2 ok; DET-23 las 10 dimensiones revisadas sobre el conjunto del ticket. Dev confirma cierre | (no aplica — irreversible una vez closed) | DET-13, DET-17, DET-20, DET-22, DET-23 | pending | 8 |

### Task contract notes

Los contracts viven directamente en las columnas de cada tabla por session (REQ / Agent / Depends on / Files / Validation / Rollback / Rules). El viewer HC expande cada fila mostrando los campos `Files`, `Depends on`, `Rules`, `Validation`, `Rollback` (orden canonico per `SpecSessionTree.vue:94`).

Defaults aplicables:

- Rollback default `git revert` salvo gates (no aplica) y cierre S7.GATE (irreversible)
- Validation default sigue el tier de la session declarado en heading + Quality review DET-23 del tier correspondiente (light/standard/exhaustive)
- Precondition default es el `Depends on` de la fila previa

## Constraints

- **RULE-viewer-polling-001**: cross-spec join no afecta polling existente; cacheable per-ticket-render
- **RULE-server-frontmatter-legacy-001**: campos nuevos (`closed`, `status`, `skipReason`, `approvedBy`, `autopilot`) son opcionales — tickets legacy sin ellos no rompen
- **RULE-workflow-session-format-canonical-002**: sub-tabla `### Modo (autopilot)` debe respetar el formato canonico de sessions del template (heading nivel 3 con sufijo, no romper parser)
- **RULE-workflow-det-introduction-001**: si emerge DET nueva en el audit, debe seguir el patron 3-capas (regla / workflow / step) — el audit valida que aplica

## Dependencies

- `SPEC-views-visual-nav-teach` (HOR-020): base de F4 (sort `byRecencyDesc`); F3 extiende el flujo de skip introducido en F5 del precedente
- `SPEC-views-spec-render-comodo` (HOR-018): introdujo SpecSessionTree y `max-w-prose` ajustado; F1 reusa modelo atomico
- `SPEC-workflow-teach-intake-close` (HOR-013): definicion original de teach-intake/close que F3 extiende
- `SPEC-workflow-dkc-flow-audit-15` (HOR-015): audit grande del flujo; este ticket es el delta liviano post-2026-05-10

## Risks and mitigations

| Riesgo | Mitigacion |
|--------|-----------|
| Cross-spec join rompe tickets sin spec o spec sin tabla | REQ-PRESERVE-03 + TC-8: degradacion limpia explicita. Validar antes de cerrar S2 |
| Cambio al step `request-execute` afecta TODOS los flujos DKC futuros | Cambio incremental + smoke en HOR-022 (dogfooding). No retroactivo para tickets cerrados |
| Autopilot saltea gates ⚑ fuerte importantes | Default optimistic + learn raw + opcion `strict` + iteracion tardia (revisar gate auto-approved despues) |
| F6 cambia commit messages mid-execucion | Aplicacion temporal post-S5. Commits previos no se reescriben. Modo libre para horadric (sin external) |
| DET-21 drift no se atacara si S1 lo deja como follow-up | S1.T5 explicito: fix obligatorio en este ticket |
| H11 (SQL) implementacion explota el scope de S5 | Decision en S5.T4 con criterios claros valor+velocidad; si emerge complejidad → solo markdown y SQL como follow-up |
| F8 migracion masiva (13 specs) introduce ruido en `## Commits` o causa regresion | Migracion por grupos (3 commits separados por modulo). Cada grupo se valida abriendo specs migrados en HC antes de seguir. Si emerge regresion → revertir grupo individual |
| F8 gate del design-shared rompe tickets ya en design | El gate es nuevo (no retroactivo). Tickets ya cerrados con spec parcial no se re-validan. Tickets `in_progress` post-S7 deben cumplir shape canonico — si tienen specs viejos parciales, migrarlos como tasks del ticket |
| F8 specs documentales son catalogados erroneamente como ejecutables | REQ-PRESERVE-05 + TC-19: ausencia de tabla `# | Task` = spec documental. Gate del shared y warning del viewer aplican solo si la tabla existe |

## Open questions

> Documentadas en HOR-022 como active questions del intake-explore. Resolucion durante este ticket en las sessions indicadas.

- **H10** (S1): F6 extiende DET-19 vs nueva DET vs solo guideline en `_style.md`. Decision en S1.T4
- **H11** (S5): tabla SQL `commits` en index.db si/no. Decision en S5.T4
- **H13** (S6 con propuesta): default optimistic vs strict en gates ⚑ fuerte del autopilot. Decision en S6.T4

## Decisions

### DEC-LOCAL-01: Skip design-draft (DET-18 excepcion) — heredada de intake

- **Contexto**: HOR-022 tiene `creates_visual: true` por F1/F3/F4/F7. DET-18 obligaria preview HTML antes del spec
- **Drivers**: F1 reusa SectionSessions existente; F3 reusa tab Teaching; F4 es sort key extra; F7 es badge + diferencial visual. Sin disenar UX nueva — solo extender lo existente. HOR-018/HOR-020 precedentes con misma justificacion
- **Decision**: skip design-draft. Aprobado por el dev en intake-explore (2026-05-15)
- **Consecuencias**: gates ⚑ fuertes en S2/S4/S6 son los puntos de validacion visual. Si emerge friction, iterate

### DEC-LOCAL-02: Skip teach-intake — ticket tactico de meta-sistema con triage ya condensado

- **Contexto**: HOR-022 tiene 17 hipotesis con evidencia + status + racional en Triage del ticket. Plan de sessions detallado. Active questions visibles
- **Drivers**: el dev considera que el material educativo relevante ya esta en el propio ticket markdown sin necesidad de archivo separado. Caso valido por DET-21 paso 0 (HOR-020 F5)
- **Decision**: `teachings.intake: skipped` con razon documentada en `## Teaching — Intake` del ticket. Aprobado por el dev (2026-05-15)
- **Consecuencias**: el propio HOR-022 se convierte en fixture real de TC-4 (caso skipped con razon)

### DEC-LOCAL-03 (pre-S1): Drift `_design-shared.md` vs DET-21 confirmado pre-audit

- **Contexto**: el gate 1 del shared exige `teachings.intake === 'done'`. DET-21 post-HOR-020-F5 acepta `skipped` con razon
- **Decision**: aplicar DET-21 (autoridad superior) en este step para no bloquear. Drift entra a scope de S1.T5 como fix obligatorio
- **Consecuencias**: cualquier `design-{tipo}` futuro post-S1.T5 podra aceptar `skipped` legitimamente. Specs ya generados no afectados

## Success metrics

| Metric | Target | Source |
|--------|--------|--------|
| Tasks projected con descripcion real (mid-S2 en HOR-022) | 100% de tasks de S3-S8 muestran texto distinto al ID | TC-1b |
| Tab Teaching con razon visible para skipped | 1 fixture real (HOR-022 mismo) renderea correctamente | TC-4 |
| Kanban closed orden correcto | Top 5 closed son los 5 mas recientes por `closed` desc | TC-3 |
| Commits limpios cuando external | 0 ocurrencias de `S{N}.T{M}`, `REQ-IMPROVE-XX`, `[TICKET-id]` en header de commits de tickets con external | TC-9 |
| Audit produce findings priorizados | Tabla con N findings + decision (atacar/follow-up/descartar) + decision H10 | TC-5 |
| Autopilot mid-flow valido | Cambio mid-execute surte efecto al proximo gate sin reset | TC-15 |
| Regresion zero | Tickets pre-HOR-015 + teach done + sin spec siguen funcionando | TC-6, TC-7, TC-8, TC-14 |
| Specs legacy migrados al shape canonico | 13/13 specs de horadric con shape parcial migrados; banner warning ausente; expand de tasks con 6 campos canonicos | TC-18 |
| Specs documentales sin afectar | up1 SPEC-mods-* y pehuen SPEC-role-* renderean sin invocar SpecSessionTree | TC-19 |
| Generacion futura segun contrato | Cualquier spec post-S7 cumple shape canonico (gate bloquea si no) | TC-16 |

## Technical reference

### Cross-spec join (F1 — patron base)

```ts
// server/deckard/sessions.ts (pseudo-codigo)
function enrichAtomsWithSpec(ticketSummary, project) {
  if (!ticketSummary.spec) return ticketSummary // degradacion limpia
  const spec = readSpec(project, ticketSummary.spec)
  if (!spec || !spec.tasks) return ticketSummary
  const taskMap = new Map(spec.tasks.map(t => [t.id, t]))
  for (const session of ticketSummary.sessions) {
    session.atoms = session.atoms.map(a => {
      if (a.type !== 'step' || !a.id) return a
      const specTask = taskMap.get(a.id)
      return specTask ? { ...a, description: specTask.description } : a
    })
    // Projected: si atoms vacio pero plan tiene tasks, construir
    if (session.status === 'projected' && session.atoms.length === 0) {
      session.atoms = session.plannedTasks
        .map(t => taskMap.get(t.id))
        .filter(Boolean)
        .map(specTask => ({ type: 'step', id: specTask.id, description: specTask.description, status: 'pending', commit: null }))
    }
  }
  return ticketSummary
}
```

### Tabla `## Commits` (F6 — shape inicial, refinable en S5)

```markdown
## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|
| a3f8b1c | 2026-05-15 | feat(views): expose closed in TicketSummary | S3.T1, S3.T2 | REQ-IMPROVE-03 |
| ... | ... | ... | ... | ... |
```

### Frontmatter autopilot (F7)

```yaml
autopilot: false           # default — modo conversacional
# autopilot: true          # optimistic en ⚑ fuerte
# autopilot: 'strict'      # pausa en ⚑ fuerte; conversacional en `auto`
```

```markdown
## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Desde gate |
|-----------|--------|-------|------------|
| 2026-05-15T10:30 | false → true | Dev pide acelerar S3 (T1 trivial) | S3.GATE |
```

## Rules discovered

_Pendiente — se llena durante execute si emergen patrones generalizables (potenciales: `RULE-workflow-autopilot-*`, `RULE-server-cross-spec-join-*`)._

## Bugs found

_Pendiente — se llenan durante execute. Hallazgos pre-execute: drift `_design-shared.md` vs DET-21 (DEC-LOCAL-03)._

## Acceptance checkpoints

Cada session cierra con su GATE (DET-20). Al close del ticket (S7), verificar:

- [ ] REQ-IMPROVE-01..07 todos cubiertos por TCs con `Status: pass`
- [ ] REQ-PRESERVE-01..04 todos validados sin regresion
- [ ] Quality review DET-23 ejecutado en cada gate de session (light/standard segun tier)
- [ ] Test cases registrados inline con `Actual` + `Evidence` + `Session` + `Cambios gatillados` (DET-25)
- [ ] Findings del audit S1 incorporados o derivados a backlog
- [ ] Drift `_design-shared.md` vs DET-21 corregido (S1.T5)
- [ ] Decisiones H10, H11, H13 documentadas con racional
- [ ] Backlog evaluado: items `must` resueltos o agregados al ticket (DET-17)
- [ ] Frontmatter actualizado: `status: closed`, `closed: YYYY-MM-DD`, `teachings.close: done | skipped`
- [ ] Tabla `## Commits` poblada con hashes del ticket

## Archiving

Esta spec se archiva via `/dkc-archive-spec` solo si:

- HOR-022 cierra exitosamente con todos los acceptance checkpoints verdes
- Las mejoras introducidas se vuelven parte del flujo estandar (no se revierten)
- Las DETs/rules eventualmente promovidas absorben el conocimiento (caso F6 H10 si se promueve a DET)

Mientras tanto, la spec vive como referencia para futuros tickets que extiendan supervisor UX (HOR-023+).
