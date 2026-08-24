# Plan DKC -> Kanai por ticket - horadric
 
Fuente DKC: commit e15fa24377cf1a0768cc10ad567c110b3ac2042e. Tickets canónicos: 130. Sidecars Markdown: 1.
 
Cada fila sigue: hash -> parseo -> relaciones -> schema/FK -> smoke -> resultado. Los estados provisionales requieren revisión antes de aceptar la migración.
 
| ID | Archivo | Título | Estado DKC | Estado Kanai | Work type | External | Sidecars | Disposición |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HOR-001 | projects/horadric/tickets/HOR-001.md | Disenar Horadric Cube — panel web read-only para visualizar proyectos de Deckard | closed | closed | explore | null | HOR-001.screenshots | direct |
| HOR-002 | projects/horadric/tickets/HOR-002.md | Fixes UX + git avanzado — loading bar, badges, archivados, diff de commits, selector de rama, render de secciones anidadas | closed | closed | improvement | null | HOR-002.screenshots | direct |
| HOR-003 | projects/horadric/tickets/HOR-003.md | Tolerancia defensiva a frontmatter legacy de tickets en horadric-cube | closed | closed | improvement | null | HOR-003.snapshots | direct |
| HOR-004 | projects/horadric/tickets/HOR-004.md | Arreglar gates y encadenamiento del sistema de prompts de Deckard (opcion A) | closed | closed | improvement | null | — | direct |
| HOR-005 | projects/horadric/tickets/HOR-005.md | Visibilidad de assets del ticket en horadric-cube — reflejar el flujo de deckard | closed | closed | improvement | null | HOR-005.draft, HOR-005.screenshots | direct |
| HOR-006 | projects/horadric/tickets/HOR-006.md | Links 404 en el viewer — linkify, RECORD_ID en filenames/code, y paths a imagenes en texto plano | closed | closed | fix | null | HOR-006.screenshots | direct |
| HOR-007 | projects/horadric/tickets/HOR-007.md | Subdir `{ticketId}.screenshots/` para screenshots — convencion nueva + migracion + consumer-adapts legacy | closed | closed | improvement | null | HOR-007.screenshots | direct |
| HOR-008 | projects/horadric/tickets/HOR-008.md | PW integration — screenshots de Playwright durante ticket activo se registran en su subdir | closed | closed | improvement | null | HOR-008.screenshots | direct |
| HOR-009 | projects/horadric/tickets/HOR-009.md | Higiene de tickets: evidencia visual, testing state, backlog y UX del viewer | closed | closed | improvement | null | — | direct |
| HOR-010 | projects/horadric/tickets/HOR-010.md | Empaquetado como app macOS (Tauri launcher del `npm run dev`) | closed | closed | explore | null | HOR-010.draft | direct |
| HOR-012 | projects/horadric/tickets/HOR-012.md | Implementar shell Tauri — app macOS como launcher de `npm run dev` | archived | closed | implement | null | HOR-012.screenshots | quarantine/confirm terminal semantics |
| HOR-013 | projects/horadric/tickets/HOR-013.md | Mejora de flujos de Horadric: intake-explore + teach-intake + teach-close como pasos del ticket | closed | closed | implement | null | HOR-013.draft, HOR-013.teach | direct |
| HOR-014 | projects/horadric/tickets/HOR-014.md | Follow-up HOR-013: render de teachings + teachings a nivel codigo + regressions HC + auditoria coherencia DKC | closed | closed | improvement | null | HOR-014.draft, HOR-014.teach | direct |
| HOR-015 | projects/horadric/tickets/HOR-015.md | Auditoria logica de los flujos DKC — coherencia, redundancia, peso, gates, integracion claude | closed | closed | improvement | null | HOR-015.draft, HOR-015.teach | direct |
| HOR-016 | projects/horadric/tickets/HOR-016.md | Teach files mas didacticos: TL;DR, narrativa y bloques visuales referenciados | closed | closed | improvement | null | HOR-016.screenshots, HOR-016.teach | direct |
| HOR-017 | projects/horadric/tickets/HOR-017.md | Universalizar DKC para LLMs con agentes o comandos | closed | closed | improvement | null | — | direct |
| HOR-018 | projects/horadric/tickets/HOR-018.md | Render comodo de specs en HC: prose width, tabs en SpecDetail, DKC blocks, tablas | closed | closed | improvement | null | HOR-018.draft, HOR-018.teach | direct |
| HOR-019 | projects/horadric/tickets/HOR-019.md | REQs en spec con callout "Que cambia / Por que" + scenarios colapsables | closed | closed | improvement | null | HOR-019.teach | direct |
| HOR-020 | projects/horadric/tickets/HOR-020.md | Mejoras visuales y de navegacion en HC + teach intake/close consultable | closed | closed | improvement | null | HOR-020.teach | direct |
| HOR-021 | projects/horadric/tickets/HOR-021.md | Templates DKC project-scoped: convencion + ciclo de vida + visualizacion en HC | closed | closed | implement | — | HOR-021.draft, HOR-021.teach | direct |
| HOR-022 | projects/horadric/tickets/HOR-022.md | Valor del dev supervisor en HC: detalle de sessions en ejecucion + teach skip visible + kanban cerrados ordenado + audit liviano | closed | closed | improvement | null | — | direct |
| HOR-023 | projects/horadric/tickets/HOR-023.md | Gates verificables programaticos (guardrails inspirados en CrewAI) — DET-27 enforcement + gates G3/G4 + teach skip body verify | closed | closed | improvement | null | — | direct |
| HOR-024 | projects/horadric/tickets/HOR-024.md | Async tasks paralelas dentro de session (inspirado CrewAI async_execution) | closed | closed | improvement | null | — | direct |
| HOR-025 | projects/horadric/tickets/HOR-025.md | Enforce multi-LLM existente + agregar `tester` + validar context preservation empirico | closed | closed | improvement | null | — | direct |
| HOR-026 | projects/horadric/tickets/HOR-026.md | Output schemas tipados (Pydantic-style validated output, inspirado CrewAI structured output) | closed | closed | improvement | null | — | direct |
| HOR-027 | projects/horadric/tickets/HOR-027.md | Handoff explicit developer→reviewer (inspirado CrewAI agent delegation) | closed | closed | improvement | null | — | direct |
| HOR-028 | projects/horadric/tickets/HOR-028.md | Entity tracking cross-ticket — piloto exploratorio en up1 (inspirado CrewAI entity_memory) | closed | closed | explore | null | — | direct |
| HOR-029 | projects/horadric/tickets/HOR-029.md | Ruta B mapping pilot — delegacion real a agentes del host Claude Code | closed | closed | improvement | null | — | direct |
| HOR-030 | projects/horadric/tickets/HOR-030.md | Ruta A — MCP server custom que registre subagent_types DKC nativos en el host | closed | closed | explore | null | — | direct |
| HOR-031 | projects/horadric/tickets/HOR-031.md | Embedding-based KB retrieval (quick win) + roadmap de funciones para DKC local-only | closed | closed | improvement | null | — | direct |
| HOR-040 | projects/horadric/tickets/HOR-040.md | HC live updates de ticket activo via file watcher | closed | closed | improvement | null | — | direct |
| HOR-041 | projects/horadric/tickets/HOR-041.md | Schemas adicionales: Rule + Decision (extension HOR-026) | closed | closed | improvement | null | HOR-041.draft | direct |
| HOR-042 | projects/horadric/tickets/HOR-042.md | Pipeline write→validate→commit (DKC v2 atomic writes) | closed | closed | improvement | null | HOR-042.draft, HOR-042.teach | direct |
| HOR-043 | projects/horadric/tickets/HOR-043.md | Cross-record relations validation (DKC v2 Phase 4 — conditional) | closed | closed | explore | null | HOR-043.draft, HOR-043.teach | direct |
| HOR-044 | projects/horadric/tickets/HOR-044.md | Cycle validation: intake→design→execute→close en orden (DKC v2 Phase 4 — conditional) | closed | closed | explore | null | HOR-044.teach | direct |
| HOR-045 | projects/horadric/tickets/HOR-045.md | Discoveries/learns/bug tipados con schemas (DKC v2 Phase 4 — conditional) | closed | closed | explore | null | HOR-045.draft, HOR-045.teach | direct |
| HOR-046 | projects/horadric/tickets/HOR-046.md | State source-of-truth consolidation — markdown canonical + proyecciones derivadas | closed | closed | improvement | null | HOR-046.inventories | direct |
| HOR-047 | projects/horadric/tickets/HOR-047.md | DET architecture refactor — capas formales + lifecycle (deprecation/supersession) | closed | closed | explore | null | — | direct |
| HOR-048 | projects/horadric/tickets/HOR-048.md | paths relativos a la raiz del repo de codigo (deckard mismo — DKC self-dev) | closed | closed | improvement | null | — | direct |
| HOR-049 | projects/horadric/tickets/HOR-049.md | Closure del patron explore+conditional (meta-discoveries n=3) | closed | closed | improvement | null | — | direct |
| HOR-050 | projects/horadric/tickets/HOR-050.md | Directive enforcement — sistematizar la diferencia entre lo declarado y lo ejecutado por el LLM | closed | closed | explore | null | — | direct |
| HOR-051 | projects/horadric/tickets/HOR-051.md | Explore Frente A cross-host — directive enforcement portable a multiples LLM hosts (reclasificado de improvement a explore) | closed | closed | explore | null | HOR-051.teach | direct |
| HOR-052 | projects/horadric/tickets/HOR-052.md | Explore Frente B cross-host — AGENT INVOCATION portable a multiples LLM hosts (reclasificado de improvement a explore) | closed | closed | explore | null | HOR-052.teach | direct |
| HOR-053 | projects/horadric/tickets/HOR-053.md | Implementar Solucion C — Validator post-step para post-conditions (~30% de las directivas, ~27 estimadas) | closed | closed | improvement | null | — | direct |
| HOR-054 | projects/horadric/tickets/HOR-054.md | Multi-MCP-tool — implementar dkc_enforce_step (Frente A) + dkc_invoke_agent (Frente B) + catalogo a-hook + refactor AGENT INVOCATION | closed | closed | improvement | null | — | direct |
| HOR-055 | projects/horadric/tickets/HOR-055.md | Cobertura completa de contratos DKC — validators de artefactos + de ejecucion enforced + disponibilizados + en uso + auditados (pre-requisito HOR-054) | closed | closed | improvement | null | HOR-055.notes.md | direct |
| HOR-056 | projects/horadric/tickets/HOR-056.md | Fix: HC y request-execute no reflejan sessions/tasks en progreso (parser `[~]` + prompt) | closed | closed | fix | null | HOR-056.teach | direct |
| HOR-057 | projects/horadric/tickets/HOR-057.md | Extender validator SessionCheckboxes a detectar drift en bloque `**Gate decision:**` | closed | closed | improvement | null | — | direct |
| HOR-058 | projects/horadric/tickets/HOR-058.md | Fix enforcement de gates DKC (DET-27 + DET-25 + DET-21-0b) via convencion T2 evidencia observable + modal HC | closed | closed | fix | null | HOR-058.draft | direct |
| HOR-059 | projects/horadric/tickets/HOR-059.md | Context budget reduction — manifest DET + compresion sessions + lazy-load steps | closed | closed | improvement | null | HOR-059.teach | direct |
| HOR-060 | projects/horadric/tickets/HOR-060.md | Enforce uso de sub-agentes via convencion T2 (extension HOR-058 al fence `dkc:agent-invocation`) | closed | closed | improvement | null | — | direct |
| HOR-061 | projects/horadric/tickets/HOR-061.md | Coherencia automatica entre contenido del ticket y `status` del frontmatter | closed | closed | improvement | null | — | direct |
| HOR-062 | projects/horadric/tickets/HOR-062.md | Fix bug recurrente: HC no muestra tasks de sessions cuando se escriben como tabla (causa raiz + UI warning + validator) | closed | closed | improvement | null | — | direct |
| HOR-063 | projects/horadric/tickets/HOR-063.md | Estado `deferred` canonical para tasks movidas a backlog (StepStatus + spec.Status + marker `[D]` + render HC + validator) | closed | closed | improvement | null | — | direct |
| HOR-064 | projects/horadric/tickets/HOR-064.md | Falso positivo del format drift detector: durante la primera task de cualquier session pre-llenada | closed | closed | fix | null | — | direct |
| HOR-065 | projects/horadric/tickets/HOR-065.md | Auditoria operacional de flujos DKC — contrato estricto para que el LLM ejecutor no salte pasos ni divergencia de formato | closed | closed | explore | null | — | direct |
| HOR-066 | projects/horadric/tickets/HOR-066.md | Implementacion sistematica del contrato de enforcement DKC — fix parser + 13 validators faltantes + patron 5 capas + extensiones DET-29 | closed | closed | improvement | null | — | direct |
| HOR-067 | projects/horadric/tickets/HOR-067.md | Path corto con registro: agregar `work_type: tactic` para tickets rapidos | closed | closed | improvement | null | — | direct |
| HOR-068 | projects/horadric/tickets/HOR-068.md | DECKARD.md: agregar tactic a tablas + corregir enum statement | closed | closed | tactic | null | — | direct |
| HOR-069 | projects/horadric/tickets/HOR-069.md | HC shared/types.ts: agregar 'quick' al WorkType union | closed | closed | tactic | null | — | direct |
| HOR-070 | projects/horadric/tickets/HOR-070.md | Fix BUG-004 (silent failure append_learn) + 4 tests HC shape drift | closed | closed | tactic | null | — | direct |
| HOR-071 | projects/horadric/tickets/HOR-071.md | Enriquecer shape canonical de tactic — Tasks + Commits + Summary informativos | closed | closed | tactic | null | — | direct |
| HOR-072 | projects/horadric/tickets/HOR-072.md | Fix parser HC sessions.ts para shape A+B+C — multi-linea, commit, phase tactic | closed | closed | tactic | null | — | direct |
| HOR-073 | projects/horadric/tickets/HOR-073.md | Chip clickable de task.commit en SessionDetailModal — link al panel Commits | closed | closed | tactic | null | — | direct |
| HOR-074 | projects/horadric/tickets/HOR-074.md | Fix extractSessionNumber: commits tactic (-tactic) → Session 1 | closed | closed | tactic | null | — | direct |
| HOR-075 | projects/horadric/tickets/HOR-075.md | Fix shape de fechas en frontmatter de tickets (forzar string ISO con comillas) | closed | closed | fix | null | — | direct |
| HOR-076 | projects/horadric/tickets/HOR-076.md | Prevenir drift de Gate decision tras done-task sobre S{N}.GATE | closed | closed | improvement | null | — | direct |
| HOR-077 | projects/horadric/tickets/HOR-077.md | Fix bugs DET-29 hallados en HOR-024 (set_fm_field + stub gate decision) | closed | closed | fix | null | — | direct |
| HOR-078 | projects/horadric/tickets/HOR-078.md | Enforcement de evaluacion de paralelizacion en design (decision observable T2) | closed | closed | improvement | null | — | direct |
| HOR-079 | projects/horadric/tickets/HOR-079.md | Red de seguridad para autopilot autonomo — 2 niveles + guarda de inicio + validacion de cierre reforzada + teach reforzado | closed | closed | implement | null | HOR-079.teach | direct |
| HOR-080 | projects/horadric/tickets/HOR-080.md | teach=on (no skip) por DET-30 REQ-05 — autopilot super no permite skipear teach. Decidido por dev 2026-05-28 al resolver contradiccion 'teach off' vs REQ-05. | closed | closed | fix | null | HOR-080.teach | direct |
| HOR-081 | projects/horadric/tickets/HOR-081.md | Teaching v2 — formato HTML didactico self-contained renderizado via iframe | closed | closed | implement | null | HOR-081.draft, HOR-081.teach | direct |
| HOR-082 | projects/horadric/tickets/HOR-082.md | Explorar: alinear output schema del reviewer con las 10 dims DET-23 (dim_results) | closed | closed | explore | null | — | direct |
| HOR-083 | projects/horadric/tickets/HOR-083.md | Embeddings incremental — reindex solo de archivos nuevos/cambiados (TODO S2.T6.b) | closed | closed | improvement | null | — | direct |
| HOR-084 | projects/horadric/tickets/HOR-084.md | Hybrid retrieval degrada a semantic-only en queries NL largas (FTS5 AND implicito) | closed | closed | fix | null | — | direct |
| HOR-085 | projects/horadric/tickets/HOR-085.md | DETs point-of-use — re-surfacing condensado por step (saliencia > inyección masiva) | closed | closed | improvement | null | HOR-085.teach | direct |
| HOR-086 | projects/horadric/tickets/HOR-086.md | Context diet seguro de steps — extraer legacy + split lazy-load + consistencia scoping | closed | closed | improvement | null | HOR-086.teach | direct |
| HOR-087 | projects/horadric/tickets/HOR-087.md | Re-surfacing activo de DETs por step — cablear el `dets:` (Flujo B) | closed | closed | improvement | null | HOR-087.teach | direct |
| HOR-088 | projects/horadric/tickets/HOR-088.md | Aligerar el global `~/.claude/CLAUDE.md` — medir (C) y, si es seguro, reemplazar inyección por re-surfacing (Flujo A) | closed | closed | improvement | null | — | direct |
| HOR-089 | projects/horadric/tickets/HOR-089.md | Re-surfacing dirigido en los sub-archivos de fase de request-execute (B1 de HOR-087, acotado) | closed | closed | improvement | null | HOR-089.teach | direct |
| HOR-090 | projects/horadric/tickets/HOR-090.md | Re-theme de HC a plataforma dark-azul + acento amarillo (subir de "navegación de texto") | closed | closed | improvement | null | HOR-090.draft, HOR-090.teach | direct |
| HOR-091 | projects/horadric/tickets/HOR-091.md | Parser de frontmatter de dkc-validate ignora comentarios inline YAML | closed | closed | tactic | null | — | direct |
| HOR-092 | projects/horadric/tickets/HOR-092.md | Cablear StatusCoherence como gate de cierre en request-close | closed | closed | tactic | null | — | direct |
| HOR-093 | projects/horadric/tickets/HOR-093.md | Explore — dkc_get_ticket_section: lectura parcial de records | closed | closed | explore | null | — | direct |
| HOR-094 | projects/horadric/tickets/HOR-094.md | Implementar dkc_get_ticket_section — activacion de HOR-093 | closed | closed | implement | null | — | direct |
| HOR-095 | projects/horadric/tickets/HOR-095.md | Guardarriel runtime: reindex automatico tras editar un record (PostToolUse hook) | closed | closed | tactic | null | — | direct |
| HOR-096 | projects/horadric/tickets/HOR-096.md | Validador: header de tabla Plan de sessions debe ser `#` (drift que oculta sessions en HC) | closed | closed | tactic | null | — | direct |
| HOR-097 | projects/horadric/tickets/HOR-097.md | dkc-embed: embeddings on-demand + sacarlos del cierre de tickets | closed | closed | tactic | null | — | direct |
| HOR-098 | projects/horadric/tickets/HOR-098.md | Hardening: check current_session + test permanente del parser | closed | closed | tactic | null | — | direct |
| HOR-099 | projects/horadric/tickets/HOR-099.md | get_ticket_section: param subsection (### dentro de ## Sessions) | closed | closed | tactic | null | — | direct |
| HOR-100 | projects/horadric/tickets/HOR-100.md | Lote B: limpieza retroactiva de drift StatusCoherence (proyecto propio) | closed | closed | tactic | null | — | direct |
| HOR-101 | projects/horadric/tickets/HOR-101.md | Autopilot super: eliminar paradas en commit local + limitar push a confirmacion | closed | closed | tactic | null | — | direct |
| HOR-102 | projects/horadric/tickets/HOR-102.md | DKC local-only readiness — bloqueantes de contexto (#1) y superficie de tools (#2) | closed | closed | explore | null | — | direct |
| HOR-103 | projects/horadric/tickets/HOR-103.md | Perfil local de DKC — reducir contexto y superficie de tools sin degradar Claude Code | closed | closed | improvement | null | HOR-103.teach | direct |
| HOR-104 | projects/horadric/tickets/HOR-104.md | HU — Diferenciacion SP LLM/dev: speedup real (A+C) + visibilidad en kanban/grid HC | closed | closed | improvement | null | HOR-104.draft, HOR-104.teach | direct |
| HOR-105 | projects/horadric/tickets/HOR-105.md | Mutation testing gate para el flujo de DKC | closed | closed | implement | null | HOR-105.teach | direct |
| HOR-106 | projects/horadric/tickets/HOR-106.md | Super autopilot con opt-out de teach — variable para omitir teach-intake/teach-close | closed | closed | implement | null | — | direct |
| HOR-107 | projects/horadric/tickets/HOR-107.md | Agregar step `teach-policy` a dkc-record-decision (follow-up HOR-106) | closed | closed | tactic | null | — | direct |
| HOR-108 | projects/horadric/tickets/HOR-108.md | Vista de ramas de repositorios del proyecto (multi-repo) | closed | closed | implement | null | HOR-108.draft | direct |
| HOR-109 | projects/horadric/tickets/HOR-109.md | paths relativos a la raiz del repo de codigo (horadric-cube), repo unico (DEC-01) | closed | closed | improvement | null | HOR-109.draft | direct |
| HOR-110 | projects/horadric/tickets/HOR-110.md | Enumerador de repos respeta additional_paths sin importar el flag monorepo | closed | closed | tactic | null | — | direct |
| HOR-111 | projects/horadric/tickets/HOR-111.md | DET-32 — Gate de necesidad/reuso antes de construir (cascada YAGNI) | closed | closed | implement | null | — | direct |
| HOR-112 | projects/horadric/tickets/HOR-112.md | Verificar el self-report de workers antes de declarar exito | closed | closed | improvement | null | — | direct |
| HOR-113 | projects/horadric/tickets/HOR-113.md | Inyectar KB resuelto a sub-agentes (super sub-agent) | closed | closed | improvement | null | — | direct |
| HOR-114 | projects/horadric/tickets/HOR-114.md | Loop adversarial dual-judge en el quality gate (DET-23) | closed | closed | improvement | null | — | direct |
| HOR-115 | projects/horadric/tickets/HOR-115.md | Trigger rules con tiers de costo (capa advisory) | closed | closed | improvement | null | — | direct |
| HOR-116 | projects/horadric/tickets/HOR-116.md | Jueces dual-judge con modelo escalonado (balanced por defecto, reasoning solo en disputa) | closed | closed | improvement | null | — | direct |
| HOR-117 | projects/horadric/tickets/HOR-117.md | Telemetria de gates — medir gasto (proxy) + latencia + estructura por gate | closed | closed | implement | null | — | direct |
| HOR-118 | projects/horadric/tickets/HOR-118.md | dkc-doctor — detector de staleness de anclas al código en rules y bugs | closed | closed | implement | null | — | direct |
| HOR-119 | projects/horadric/tickets/HOR-119.md | Reconciliación de contradicción/supersesión entre decisions (corte mínimo decisions-first) | closed | closed | implement | null | — | direct |
| HOR-120 | projects/horadric/tickets/HOR-120.md | Pre-flight lint del scaffold de tickets — atrapa los 3 gotchas sintacticos upfront | closed | closed | implement | null | — | direct |
| HOR-121 | projects/horadric/tickets/HOR-121.md | Persistir relaciones cross-record ticket↔ticket/decision para reconciliación (el parser solo matchea RULE/SPEC/BUG/DEC/DET) | closed | closed | improvement | null | — | direct |
| HOR-122 | projects/horadric/tickets/HOR-122.md | HC vanishea/misrenderea un ticket si su frontmatter YAML rompe gray-matter (paridad de parser con el índice Python) | closed | closed | fix | null | — | direct |
| HOR-123 | projects/horadric/tickets/HOR-123.md | Visor de cambios tipo IDE read-only embebido en la vista de ticket | closed | closed | implement | null | HOR-123.draft, HOR-123.screenshots | direct |
| HOR-124 | projects/horadric/tickets/HOR-124.md | Hacer el navegador de cambios más amigable y con más valor que el diff crudo | closed | closed | improvement | null | HOR-124.draft | direct |
| HOR-125 | projects/horadric/tickets/HOR-125.md | Analisis de rendimiento del flujo DKC (up1 + jormat) y roadmap priorizado de mejoras | closed | closed | explore | null | — | direct |
| HOR-126 | projects/horadric/tickets/HOR-126.md | Fix: `dkc-mutate` falla en frontend vitest4 (stryker SIGSEGV) — fast-skip graceful | closed | closed | fix | null | — | direct |
| HOR-127 | projects/horadric/tickets/HOR-127.md | Gate de verificacion runtime/UI — cerrar el hueco APPROVED-que-no-funciona (HOR-125 P2) | closed | closed | improvement | null | — | direct |
| HOR-128 | projects/horadric/tickets/HOR-128.md | Intake grounding + verificacion de precondiciones (HOR-125 P3) | closed | closed | improvement | null | — | direct |
| HOR-129 | projects/horadric/tickets/HOR-129.md | DKC Codex pack: skills, hooks, puente de subagentes y tiers Codex sin romper Claude Code | closed | closed | improvement | null | — | direct |
| HOR-130 | projects/horadric/tickets/HOR-130.md | Delegacion multi-modelo a Codex con fallback a Claude y contrato de host unico (absorbe HOR-017) | closed | closed | improvement | null | HOR-130.evidence | direct |
| HOR-131 | projects/horadric/tickets/HOR-131.md | Roles DKC como agentes custom del host, con allowlist de tools en vez de prompt-guard | closed | closed | improvement | null | — | direct |
| HOR-132 | projects/horadric/tickets/HOR-132.md | Resolver el binario de codex por version y remapear los tiers a la familia 5.6 | closed | closed | fix | null | HOR-132.evidence | direct |
| HOR-133 | projects/horadric/tickets/HOR-133.md | Contrato de apagado y descubribilidad del flag de delegacion (post HOR-130) | closed | closed | fix | null | — | direct |
| HOR-134 | projects/horadric/tickets/HOR-134.md | Tres consumidores leen la razon del teach skip de dos formas distintas, y el repo ya tiene las dos | closed | closed | fix | null | — | direct |
| HOR-135 | projects/horadric/tickets/HOR-135.md | Costo de registro canonico y delegacion de los gates de juicio | design-transition-to-execute | open | improvement | null | — | preserve legacy status + review |
| HOR-136 | projects/horadric/tickets/HOR-136.md | Instrumentar la discriminacion del gate y fijar criterio de tamano de task | open | open | improvement | null | — | direct |
| HOR-137 | projects/horadric/tickets/HOR-137.md | Dependencias entre tickets: canonizar `depends_on` (A) + derivar la relacion y consultarla (B) | open | open | implement | null | — | direct |
| HOR-138 | projects/horadric/tickets/HOR-138.md | `creation_gate` opt-in por proyecto: acoplar la cascada DET-32 a la puerta de creacion propia del repo (`/up1-check`) + COMMANDMENTS por repo | closed | closed | implement | null | — | direct |
| HOR-139 | projects/horadric/tickets/HOR-139.md | Atar el super autopilot de DKC al sistema de permisos de Claude Code | closed | closed | implement | null | — | direct |
 
## Sidecars fuera de matriz
- HOR-055.notes.md: clasificar por contenido; no importar automáticamente como ticket.
 
## Aceptación
- No se descartan tickets por estados legacy.
- Todos los sidecars tienen destino explícito.
- Todos los hashes y relaciones quedan en el manifiesto.
 
