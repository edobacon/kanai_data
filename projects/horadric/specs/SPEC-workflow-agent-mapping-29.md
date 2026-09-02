---
id: SPEC-workflow-agent-mapping-29
project: horadric
ticket: HOR-029
status: done
---

# Ruta B mapping pilot — resolucion runtime de roles DKC a agentes del host Claude Code

# Ruta B mapping pilot — resolucion runtime de roles DKC a agentes del host Claude Code

## Executive summary — lo que estas aprobando

> *Lectura de 60s. Si te basta para aprobar, ese es el objetivo. El detalle vive en Requirements y Tasks.*

### Que se quiere

HOR-025 dejo la sintaxis canonica `> AGENT INVOCATION: subagent_type=X, tier=Y, prompt="..."` declarada en 4 steps pero **inoperante**: el host Claude Code no registra los `subagent_type` de DKC (researcher/scribe/developer/reviewer/architect/tester). Ruta B resuelve el gap **sin nueva infra**: mapea los roles DKC a agentes que el host SI conoce (`Explore`, `Plan`, `general-purpose`). Resolucion en runtime via tabla en `agent-tiers.md` — la sintaxis canonica en los steps queda intacta como **contrato logico**.

Este ticket NO implementa MCP custom (eso seria Ruta A, HOR-030 conditional). Hace 4 cosas:

1. **Verifica empirico** que los agentes del host aislan contexto real (no solo capacidad declarada)
2. **Define tabla de mapping** `DKC role → host subagent_type` en `agent-tiers.md`, con fallback explicito para developer + scribe (sin equivalente del host → inline + razon)
3. **Actualiza los 4 steps de HOR-025** para indicar resolucion runtime (sintaxis canonica preservada)
4. **Mide empirico** en 1-2 tickets pilot si el aislamiento real entrega ahorro de contexto o solo overhead

### Decisiones criticas que necesitan tu OK

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Resolucion en runtime, no edicion permanente** — los 4 steps mantienen `subagent_type=researcher` como contrato DKC. El LLM resuelve a `Explore` via tabla en momento de invocacion | Preserva semantica DKC + permite future-proofing: si Ruta A se activa en HOR-030, la resolucion solo cambia de tabla, no de prompts |
| 2 | **Cobertura parcial: 4/6 roles ganan aislamiento** — researcher→Explore, architect→Plan, reviewer/tester→general-purpose. developer + scribe siguen **inline explicito** (sin equivalente del host) | Sincero sobre limitacion. Documentar como decision intencional, no como bug. Si pilot empirico muestra que developer/scribe son cuello de botella, justifica HOR-030 Ruta A |
| 3 | **S1 prueba adversarial primero** — verificar antes de mapear que `Explore` realmente aisla contexto y respeta read-only, NO solo lo declara | H1+H2 son hipotesis criticas. Si refutadas, Ruta B no aporta y escalamos a Ruta A. Sin verificacion previa, S2-S4 serian inversion ciega |
| 4 | **S4 pilot empirico T3 ⚑ fuerte** — ejecutar 1-2 tickets reales (HOR-024 o HOR-026, los mas simples del backlog post-HOR-025) con Ruta B activa, medir tokens + activaciones DET-15. Decision: continuar / escalate Ruta A / abortar | Es el valor real del ticket. Sin medicion, replicamos el mismo problema de HOR-025 (proyecciones no validadas) |

### Riesgos principales y como los mitigamos

- **H1 refutada (host no aisla contexto real)** → S1.GATE escalate. HOR-029 cierra como "aprendizaje: Ruta B no viable, abrir HOR-030 Ruta A o vivir con inline". Aceptable: 1 session de costo
- **H4 muy lejos del proyectado (<10% ahorro real)** → S4.GATE decide. Cerrar HOR-029 con mapping basico (S2 + S3) pero sin compromiso de extension. Documentar racional
- **Restrictions del host no enforced (Explore acepta Edit)** → S1 prueba adversarial detecta. Mitigacion: agregar prompt-guards explicitos en S3 ("`Explore` invocado con read-only ENFORCED via prompt: `MUST NOT use Edit/Write tools`")
- **Roles inline (developer + scribe) consumen 40%+ del contexto** → segun inventario retroactiva HOR-022. Asumido: ahorro real estara entre 25-30%, no 43% proyectado en HOR-025 S4

### Que NO se hace en este ticket

- NO se implementa MCP server custom (eso es HOR-030 Ruta A, condicional)
- NO se reescriben los 4 steps de HOR-025 (sintaxis canonica queda intacta — solo nota apuntando a `agent-tiers.md` para resolucion runtime)
- NO se mapean developer + scribe a algun agente del host por la fuerza (riesgo: prompt-guards no enforced, downside > upside)
- NO se promueve la tabla de mapping a DET nueva en este ticket (puede emerger como rule de proyecto al cierre si pilot la valida)
- NO se mide rendimiento ni latencia — solo tokens y activaciones DET-15

### Tamano estimado

4 sessions execute + 1 cierre. **S4 mas pesada (T3 ⚑ fuerte)** — pilot empirico requiere ejecutar tickets reales con metrica. **S1 critica** (sin verificacion, no avanzamos). **S2 + S3 son operacionales rapidas** (T1/T2 con cambios acotados). Total: **3-4h efectivas**.

### Como vas a saber que funciona

- `prompts/agent-tiers.md` tiene seccion "Host mapping (Ruta B)" con tabla `DKC role → host subagent_type` + fallback inline para 2 roles
- Invoco `Agent(subagent_type=Explore, ...)` desde un step de research y veo que el subagente abre con contexto fresco (no hereda mi history)
- `Explore` intentando Edit retorna error (restriction enforced nativamente o via prompt-guard)
- En S4 ejecuto 1-2 tickets pilot, mido tokens del principal pre/post, reporto ahorro real
- Activaciones DET-15 en proximos 3-5 tickets queda en sub-seccion `## Backlog` de HOR-029 para retomar

---

## Purpose

Cerrar el gap operacional dejado por HOR-025: convertir la sintaxis canonica de invocacion declarada (pero no enforced por limitacion del host) en delegacion REAL a subagentes con contexto aislado. Ruta B es el camino de bajo costo y reversible para validar empirico si delegar entrega valor antes de comprometer infraestructura mayor (HOR-030 Ruta A).

Para el dev: tickets largos (>1500 lineas) ganan margen real de DET-15 (no proyectado). Para el sistema: si Ruta B funciona, queda baseline para Ruta A. Si no, descarta HOR-030 sin haber invertido en MCP custom.

## Requirements

### REQ-IMPROVE-01 — Verificacion empirica de capabilities del host

> **Que cambia**: antes de mapear roles, S1 verifica con pruebas adversariales que `Explore`/`Plan`/`general-purpose` realmente aislan contexto (subagente abre con history fresco) y respetan restrictions declaradas (`Explore` read-only, `Plan` no-Edit/Write).
> **Por que**: sin verificacion, S2-S4 serian inversion ciega sobre H1+H2 no validadas. Si refutadas, el ticket cierra honesto con "Ruta B no viable" en 1 session de costo.

El sistema MUST ejecutar 3 pruebas adversariales en S1:
1. **Aislamiento de contexto**: invocar `Agent(subagent_type=Explore, prompt="¿que ticket estabas trabajando antes?")` — respuesta esperada: no sabe (contexto aislado). Si responde con info del principal: H1 refutada
2. **Restriction read-only de Explore**: invocar con prompt que pide Edit explicito — esperado: error o respuesta evasiva. Si ejecuta Edit: H2 refutada
3. **Restriction de Plan**: invocar con prompt que pide Write — esperado: error. Si ejecuta Write: H2 refutada para Plan

Resultado documentado en discovery de S1 con outputs literales. Si H1 refutada: `S1.GATE = escalate`, ticket cierra con racional.

### REQ-IMPROVE-02 — Tabla de mapping en agent-tiers.md

> **Que cambia**: `prompts/agent-tiers.md` gana seccion "Host mapping (Ruta B)" con tabla `DKC role → host subagent_type` resoluble en runtime. 4 roles mapean a agentes del host, 2 quedan inline explicito.
> **Por que**: tabla centraliza la resolucion en un solo archivo (vs duplicarla en cada step). Si Ruta A se activa en HOR-030, solo cambia la tabla, no los prompts.

Tabla minima:

| DKC role | Host subagent_type | Aislamiento contexto | Notas |
|----------|---------------------|----------------------|-------|
| researcher | Explore | si | Read-only nativo + KB-first via prompt |
| architect | Plan | si | No-Edit/Write nativo + design alternatives via prompt |
| reviewer | general-purpose | si | Restrictions via prompt: read-only, no commits |
| tester | general-purpose | si | Restrictions via prompt: bash + read, no Edit/Write |
| developer | — (inline) | NO | Sin equivalente del host con capabilities [edit, write, git_commit] — inline justificado |
| scribe | — (inline) | NO | Sin equivalente del host con capabilities [edit_dkc_artifacts] — inline justificado |

Seccion MUST documentar resolution order: `subagent_type=DKC_role → tabla host mapping → fallback inline si "—"`.

### REQ-IMPROVE-03 — Resolucion runtime en los 4 steps de HOR-025

> **Que cambia**: los 4 steps de HOR-025 (`request-intake`, `intake-explore`, `request-execute`, `_design-shared`) ganan nota inline cerca de cada bloque AGENT INVOCATION: "resuelve via `prompts/agent-tiers.md` seccion Host mapping". Sintaxis canonica queda intacta.
> **Por que**: preserva semantica DKC + permite future-proofing. La invocacion sigue siendo `subagent_type=researcher` en el contrato del step; el LLM resuelve a `Explore` al momento de hacer Agent tool call.

Cada bloque AGENT INVOCATION en los 4 steps recibe linea adicional:
```
> **AGENT INVOCATION (HOR-XXX)**: subagent_type=researcher, tier=fast, prompt="..."
> Resuelve via `prompts/agent-tiers.md` seccion Host mapping. Si role mapea a "—" (inline), ejecuta directo sin Agent tool.
```

### REQ-IMPROVE-04 — Pilot empirico con metricas reales

> **Que cambia**: S4 ejecuta 1-2 tickets reales del backlog (HOR-024 o HOR-026, los mas simples post-HOR-025) usando Ruta B activa. Mide tokens consumidos por principal + subagentes y compara con baseline retroactiva HOR-022.
> **Por que**: HOR-025 S4 proyecto 43% conceptual sin observacion. Ruta B debe entregar medicion REAL para justificar mantenerla — o aceptar honesto que no aporta valor neto.

Metricas a capturar en S4:
- **Tokens principal pre-task vs post-task** (via metadata de respuesta del host, si disponible; si no: estimacion por tamano de input/output)
- **Numero de invocaciones Agent tool exitosas** vs fallback inline (developer/scribe)
- **Activaciones DET-15** en el pilot (deberian ser 0 si Ruta B funciona)
- **Calidad output**: muestreo del output de cada subagente — ¿el reviewer agente entrega review razonable o solo executa el prompt sin contexto?

Decision criteria S4.GATE:
- Ahorro tokens >25% AND DET-15 = 0 AND calidad >= principal → `continue` (mantener Ruta B)
- Ahorro 10-25% → `iterate` (refinar mapping, evaluar S5 con plan refinado)
- Ahorro <10% OR calidad output degradada → `escalate` (decidir abortar o pasar a Ruta A)

### REQ-PRESERVE-01 — Sintaxis canonica HOR-025 intacta

> **Que cambia**: nada. El contrato `> **AGENT INVOCATION (TICKET-id)**: subagent_type=X, tier=Y, prompt="..."` definido en `_style.md` Principle 7 NO se modifica.
> **Por que**: HOR-025 valido la sintaxis. Cambiarla romperia tickets futuros y haria invisible la decision de mapping en los prompts. Resolucion vive aparte.

Validacion: TC-06 verifica que diff de los 4 steps NO modifica el bloque markdown canonico — solo agrega la linea "Resuelve via agent-tiers.md...".

### REQ-PRESERVE-02 — Inline fallback para developer + scribe preserva flujo actual

> **Que cambia**: nada para developer + scribe. Siguen ejecutando inline como hoy. La tabla solo formaliza la decision.
> **Por que**: sin equivalente del host con capabilities `[edit, write, git_commit]`, mapearlos a `general-purpose` con prompt-guards seria fragil (la garantia de no romper algo depende de que el host respete el prompt — riesgo no aceptable para roles que modifican repo).

Validacion: TC-07 verifica que un step ejecutado con role `developer` sigue funcionando como antes del mapping (sin Agent tool call, ejecucion directa).

## Test cases

| # | Caso | Discovery/REQ | Affects UI | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|--------------|-----------|----------|--------|----------|--------|---------|-------------------|
| TC-01 | Aislamiento de contexto: `Agent(subagent_type=Explore, prompt="¿que ticket trabajabas antes?")` retorna que no sabe | REQ-IMPROVE-01 | no | Respuesta indica contexto fresco | Explore respondio "Contexto aislado: no tengo memoria de trabajo previo del LLM principal. (...) Cada sesion de Claude Code comienza con estado limpio." | D1 en HOR-029.md S1 | pass | S1.T1 | — |
| TC-02 | Restriction Explore read-only: invocacion con prompt que pide Edit explicito retorna error o evita Edit | REQ-IMPROVE-01 | no | Explore NO ejecuta Edit | Explore NO escribio. Error literal: "No such tool available: Write. Write exists but is not enabled in this context." Bash tambien read-only | D2 en HOR-029.md S1 | pass | S1.T2 | — |
| TC-03 | Restriction Plan no-Edit/Write: invocacion con prompt que pide Write retorna error o evita Write | REQ-IMPROVE-01 | no | Plan NO ejecuta Write | Plan NO escribio. System prompt literal: "STRICTLY PROHIBITED from creating new files (no Write, touch, or file creation of any kind)" | D3 en HOR-029.md S1 | pass | S1.T3 | — |
| TC-04 | Tabla de mapping en agent-tiers.md: seccion "Host mapping (Ruta B)" existe con 6 roles documentados (4 mapeados, 2 inline) | REQ-IMPROVE-02 | no | Grep retorna seccion + tabla 6 filas | Seccion "Host mapping (Ruta B — HOR-029)" presente. Tabla 6 filas: researcher/architect/reviewer/tester mapeados + developer/scribe inline. Resolution order completo (A subagent_type + B tier) | prompts/agent-tiers.md L82-L155 | pass | S2.T1 | — |
| TC-05 | Resolucion runtime en 4 steps: cada bloque AGENT INVOCATION en intake/design-shared/execute tiene linea "Resuelve via agent-tiers.md" | REQ-IMPROVE-03 | no | Grep en los 4 steps retorna >=N matches (N = bloques AGENT INVOCATION presentes) | Grep retorna 6 matches (request-intake: 1, intake-explore: 1, _design-shared: 1, request-execute: 3) — coincide exacto con los 6 bloques AGENT INVOCATION existentes | grep "Resuelve via" en 4 steps | pass | S3.T1-T4 | — |
| TC-06 | Sintaxis canonica preservada: diff de 4 steps muestra solo lineas agregadas (nota de resolucion), NO modifica el bloque canonico existente | REQ-PRESERVE-01 | no | git diff retorna solo additions de "Resuelve via..." | git diff --stat: 6 insertions, 0 deletions despues de restauracion de "Si fallback inline:" eliminada por accidente en edicion del reviewer block (fix inline en la misma session) | git diff prompts/steps/ | pass | S3.T1-T4 | restauracion inline de "Si fallback inline:" en reviewer block tras detectar deletion accidental |
| TC-07 | Developer/scribe fallback inline: ticket pilot ejecuta task con role developer y resulta en ejecucion directa (no Agent tool call) | REQ-PRESERVE-02 | no | Trace de ejecucion no contiene Agent call para developer/scribe | — | — | pending | — | — |
| TC-08 | Pilot empirico S4: ticket HOR-024 (o HOR-026) ejecuta con Ruta B activa, captura metricas | REQ-IMPROVE-04 | no | Discovery de S4 contiene tabla con tokens pre/post + activaciones DET-15 + decision | **Re-scope dev (opcion B)**: pilot LIGERO con 1 ciclo execute (no ticket completo). researcher (Explore) + reviewer (general-purpose con prompt-guard) sobre task autocontenida (validar `prompts/agent-tiers.md`). Reviewer: 126,542 tokens 21.6s. Researcher estimado ~80-100K tokens (metadata no expuesto). DET-15: no activado en ciclo unico. Insight: cross-validation entre roles detecta error de conteo H2 del researcher | D9-D12 en HOR-029.md S4 | pass-partial | S4.T1-T4 | re-scope T3→T2 por opcion B del dev, evaluacion H4 reframing |
| TC-07 (refresh) | Developer/scribe fallback inline: no aplico en pilot porque researcher reporto sin issues. Validable en ticket pilot full (futuro) | REQ-PRESERVE-02 | no | Trace muestra fallback inline funcional | NO se activo developer en S4.T2 — researcher no encontro issues. Caveat: el patron de fallback NO se ejercito empirico. Validable en proximo ticket que use Ruta B | D10 en HOR-029.md S4 | partial | S4.T2 | NO se ejecuto developer inline porque no hubo fix necesario |

## Tasks

> Shape canonical 11-column (F8 HOR-022). Numero inicial S1 (ticket nuevo sin sessions previas — Session 0 sera el intake/design actual; el primer session execute es S1).

### Session 1 — Verificacion empirica de capabilities del host (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios gatillados |
|---|------|------|------|-------|-------|-----|----------|--------|---------|-------------------|
| S1.T1 | Probar aislamiento de contexto via `Agent(subagent_type=Explore, prompt="¿que ticket trabajabas?")`. Documentar output literal en discovery | researcher | fast | — (discovery en HOR-029.md) | TC-01 | Discovery contiene output literal del subagente + clasificacion: aislamiento real / falso / parcial | git revert discovery | pending | 1 | — |
| S1.T2 | Probar restriction read-only de Explore con prompt adversarial que pide Edit. Documentar resultado | researcher | fast | — | TC-02 | Discovery contiene resultado + clasificacion: enforced / via prompt / no enforced | git revert | pending | 1 | — |
| S1.T3 | Probar restriction de Plan con prompt que pide Write. Documentar | researcher | fast | — | TC-03 | Discovery contiene resultado + clasificacion | git revert | pending | 1 | — |
| S1.GATE | Gate de sync S1 — DET-23 quality review (tier light). Decision: continue si H1+H2 confirmadas; iterate si restrictions necesitan prompt-guards adicionales en S3; escalate si H1 refutada (Ruta B no viable) | reviewer | balanced | HOR-029.md (sesion + gate decision) | TC-01..03 verified | Gate decision documentada + DET-27 commit `verify(horadric): HOR-029 S1 capabilities host validadas` o equivalente segun outcome | git revert commit | pending | 1 | — |

### Session 2 — Tabla de mapping en agent-tiers.md (T1, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios gatillados |
|---|------|------|------|-------|-------|-----|----------|--------|---------|-------------------|
| S2.T1 | Agregar seccion "Host mapping (Ruta B)" en `prompts/agent-tiers.md` con tabla de 6 roles (4 mapeados al host, 2 inline explicito) + nota de resolution order extendida | developer | balanced | prompts/agent-tiers.md | TC-04 | Grep retorna seccion + tabla 6 filas + resolution order menciona host mapping | git revert | pending | 2 | — |
| S2.T2 | Verificar render en HC viewer (`localhost:3016`) — la tabla se renderiza con todas las columnas, no rompe parsing de otros bloques del archivo | reviewer | balanced | — (validacion visual) | — | Screenshot del render OK | git revert si rompe parsing | pending | 2 | — |
| S2.GATE | Gate de sync S2 — DET-23 quality review (tier light: dim 1, 7 evaluadas). Decision: continue si tabla OK + render OK. Commit DET-27 `improve(prompts): agent-tiers Host mapping Ruta B (HOR-029 S2)` | reviewer | balanced | prompts/agent-tiers.md | TC-04 verified | Gate decision + commit | git revert commit | pending | 2 | — |

### Session 3 — Resolucion runtime en 4 steps de HOR-025 (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios gatillados |
|---|------|------|------|-------|-------|-----|----------|--------|---------|-------------------|
| S3.T1 | Editar `prompts/steps/request-intake.md` — agregar linea "Resuelve via agent-tiers.md..." despues del bloque AGENT INVOCATION del paso 5 | developer | balanced | prompts/steps/request-intake.md | TC-05, TC-06 | Diff muestra solo additions, no modifica bloque canonico | git revert | pending | 3 | — |
| S3.T2 | Editar `prompts/steps/intake-explore.md` — misma logica para bloque del paso 2.b | developer | balanced | prompts/steps/intake-explore.md | TC-05, TC-06 | idem | git revert | pending | 3 | — |
| S3.T3 | Editar `prompts/steps/request-execute.md` — pasos A, C, C2 (3 bloques AGENT INVOCATION) | developer | balanced | prompts/steps/request-execute.md | TC-05, TC-06 | idem | git revert | pending | 3 | — |
| S3.T4 | Editar `prompts/steps/_design-shared.md` — bloque del paso 0a | developer | balanced | prompts/steps/_design-shared.md | TC-05, TC-06 | idem | git revert | pending | 3 | — |
| S3.GATE | Gate de sync S3 — DET-23 quality review (tier light: dim 1, 6, 7 evaluadas, dim 2/3 n/a por archivos .md). Decision: continue si TC-05+TC-06 pass. Commit DET-27 `improve(prompts): resolucion runtime via agent-tiers en 4 steps (HOR-029 S3)` | reviewer | balanced | 4 archivos editados | TC-05, TC-06 verified | Gate decision + commit | git revert commit | pending | 3 | — |

### Session 4 — Pilot empirico (T3, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios gatillados |
|---|------|------|------|-------|-------|-----|----------|--------|---------|-------------------|
| S4.T1 | Elegir ticket pilot del backlog (HOR-024 o HOR-026 — preferir el de menor scope para minimizar variables). Documentar criterio en discovery | architect | reasoning | — (discovery en HOR-029.md) | — | Discovery contiene eleccion + criterio | — | pending | 4 | — |
| S4.T2 | Ejecutar el ticket pilot completo con Ruta B activa (los 4 steps usan resolucion runtime). Capturar metricas en cada Agent tool call exitoso (tokens si disponible via metadata, sino estimacion) | developer | balanced | tickets/HOR-024 o HOR-026 (pilot real) + HOR-029.md (metricas) | TC-07 (developer/scribe inline OK) | Pilot ejecutado completo, metricas registradas, ticket pilot avanza segun su flujo normal | git revert pilot si rompe | pending | 4 | — |
| S4.T3 | Comparar metricas con baseline retroactiva HOR-022 (~225K tokens, 5h). Calcular ahorro real de tokens del principal + numero de activaciones DET-15 en el pilot | reviewer | balanced | HOR-029.md (analisis) | TC-08 | Tabla comparativa publicada con ahorro %, calidad output muestreada, decision | — | pending | 4 | — |
| S4.T4 | Evaluar H4 (ahorro real <43% proyectado?) y H5 (DET-15 reduccion?). Documentar findings empiricos | reviewer | balanced | HOR-029.md | — | Hipotesis H1-H5 actualizadas con status final + evidencia | — | pending | 4 | — |
| S4.GATE | Gate de sync S4 — DET-23 quality review (tier standard: dim 1, 7, 10 evaluadas + dim 4 si tester se uso). Decision: continue (Ruta B mantiene) / escalate (Ruta A justificada → HOR-030) / abort (Ruta B no aporta, no Ruta A tampoco). Commit DET-27 `dkc(horadric): HOR-029 S4 pilot empirico Ruta B (T3)` | reviewer | balanced | HOR-029.md | TC-08 verified | Gate decision con racional explicito + commit | — | pending | 4 | — |

### Session 5 — Close (T0, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios gatillados |
|---|------|------|------|-------|-------|-----|----------|--------|---------|-------------------|
| S5.T1 | Llenar Summary en HOR-029.md: que se hizo (4 sessions), discoveries S1, decision S4.GATE, metricas reales, learns L1..L{N}, decision sobre HOR-030 conditional | scribe | fast | HOR-029.md | — | Summary completo con racional + decision documentada | — | pending | 5 | — |
| S5.T2 | Actualizar tabla "Plan de sessions" del ticket con tasks finales (post-design). Refrescar status de cada session | scribe | fast | HOR-029.md | — | Tabla refleja realidad ejecutada | — | pending | 5 | — |
| S5.T3 | Promover learns refinados a rules/decisions/bugs segun corresponda. Si pilot exitoso: evaluar promocion de "tabla host mapping" a DET candidata (no en este ticket — follow-up) | scribe | fast | learns/ + rules/ si aplica | — | Learns refinados, candidatas a rule documentadas | — | pending | 5 | — |
| S5.T4 | Decidir teach-close (default si / skip + razon). Si si: producir `tickets/HOR-029.teach/teach-close.md`. Si skip: documentar en `## Teaching — Close` con razon | scribe | fast | HOR-029.md + teach-close.md si aplica | — | teachings.close: done o skipped con razon | — | pending | 5 | — |
| S5.GATE | Gate de cierre — DET-22 + DET-25 verificadas. Frontmatter `status: closed`, `closed: 2026-05-{N}`. Commit DET-27 `close(horadric): HOR-029 closed — pilot Ruta B {outcome}` + reindex | scribe | fast | HOR-029.md | TC-01..TC-08 todas con Status final | Ticket cerrado, reindex OK | — | pending | 5 | — |

## Backlog

(Vacio — items que emerjan durante execute se agregaran aqui con priority must/should/could segun DET-17.)

## Open questions

- **HOR-030 (Ruta A)**: ¿se abre como conditional follow-up al cierre? Decision sale de S4.GATE — sin metricas previas no se puede pre-comprometer.
- **Promocion del mapping a DET**: si pilot valida Ruta B, evaluar en cierre si la tabla "Host mapping" merece ser DET nueva (ej. "DET-28: agentes DKC resuelven via tabla en agent-tiers.md, fallback inline para roles sin host equivalente"). Decision: NO en este ticket — emergeria como follow-up si patron se confirma en 2-3 tickets adicionales.
- **Como medir tokens reales en el host**: ¿Claude Code expone metadata de response con tokens consumidos por Agent call? S1 puede verificarlo de paso (no critico para H1/H2 pero relevante para S4).
