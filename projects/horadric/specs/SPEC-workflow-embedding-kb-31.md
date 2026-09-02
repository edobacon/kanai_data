---
id: SPEC-workflow-embedding-kb-31
project: horadric
ticket: HOR-031
status: done
---

# Embedding-based KB retrieval — quick win habilitador del roadmap local-only

# Embedding-based KB retrieval — quick win habilitador del roadmap local-only

## Executive summary — lo que estas aprobando

> *Lectura de 60s. Si te basta para aprobar, ese es el objetivo.*

### Que se quiere

DKC busca rules/specs/decisions/learns por **FTS (full-text search) en SQLite** — keyword match. Es funcional para queries literales (buscar "DET-15") pero pobre para queries semanticas ("¿hay patterns para invalidar cache cuando cambia X?"). El researcher en KB-first (DET-11) suele cargar archivos enteros (3-8K tokens cada uno) porque FTS no le dice donde esta lo relevante DENTRO de cada archivo.

Solucion: **semantic search via embeddings**. Pipeline:
- `sentence-transformers/all-MiniLM-L6-v2` (modelo local ~100MB) genera vectors 384-dim
- `sqlite-vec` extension persiste vectors en SQLite (no introducir vector store standalone)
- Nuevo tool MCP `dkc_semantic_search(query, top_k, scope?)` retorna fragmentos relevantes con score
- Indexacion automatica al hacer `dkc-reindex {project}` (extension del comando existente)
- Researcher consulta semantic search PRIMERO, fallback a grep si query es regex literal

**Beneficio principal**: contexto reducido en operaciones KB-first. **Habilitador** del roadmap futuro (HOR-032..038) donde modelos locales con context window pequeño (32K efectivo) necesitan retrieval semantico inteligente.

### Decisiones criticas que necesitan tu OK

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Stack: sentence-transformers + sqlite-vec, NO chromadb/pinecone** | Mantener todo en SQLite preserva el modelo actual de DKC (markdown source of truth + SQLite index). Sin nuevos servicios. Si sqlite-vec falla en POC, fallback a faiss con persistencia custom |
| 2 | **Modelo de embedding: `all-MiniLM-L6-v2` (384-dim)** vs alternativas (mxbai-embed-large 1024-dim, BAAI/bge-large 1024-dim) | MiniLM es estandar industry, 5x mas chico, 3-5x mas rapido. Si calidad insuficiente en S2 benchmark, upgrade a mxbai-embed-large (mejor calidad, ~400MB) |
| 3 | **Chunking strategy: por seccion markdown (`##` headers) + fallback 500-char overlap 100** | Rules y decisions tienen secciones cortas auto-contenidas → chunk = seccion. Specs largos pueden necesitar chunking adicional. Estrategia hibrida documentada en S2 |
| 4 | **Researcher migration: instruccion EXPLICITA en steps** ("Usa `dkc_semantic_search` PRIMERO. Solo grep si query es literal/regex") | Sin esto, HOR-025 patron repetido: el LLM cae a grep por default. Validamos H3 en S4 pilot — si no-adopcion, agregar prompt-guard mas fuerte |
| 5 | **Indexacion en `dkc-reindex` (existente)** vs comando separado `dkc-embed` | Mantener UX simple: un solo comando reindexea TODO. Embedding ~5-15s adicionales por commit es aceptable. Si genera friction, opcion `--no-embed` |

### Riesgos principales y como los mitigamos

- **H1 refutada (sqlite-vec no carga en macOS Python)**: alternativa pre-validada faiss + pickle. S1 POC define rapido si stack viable
- **H2 performance >500ms**: HNSW index opcional en sqlite-vec. Si insuficiente, downgrade a `cosine_similarity` por brute force sobre 200-300 vectors (suficiente para horadric scale)
- **H3 no-adopcion del tool**: TC-08 pilot mide explicit. Si el LLM ignora el tool, agregar prompt-guard tipo "ANTES de Grep/Glob, intenta dkc_semantic_search"
- **H4 ahorro <30%**: aceptable como aprendizaje. Aun asi vale por habilitador de modelos locales (donde context window es bottleneck)
- **Dependencias pesadas** (PyTorch ~2GB para sentence-transformers): aislamiento en venv del MCP server. No contamina entorno del dev. Si problematico: alternativa `fastembed` (ONNX, ~50MB sin PyTorch)

### Que NO se hace en este ticket

- NO reemplazar FTS por embeddings (FTS sigue funcionando para queries literales)
- NO indexar codigo del repo del proyecto (solo el KB de DKC: rules, specs, decisions, learns, tickets cerrados). Codigo es out-of-scope — se busca con Grep/Glob como hoy
- NO migrar ALL steps a usar embedding search — solo los 4 con bloque AGENT INVOCATION researcher (request-intake, intake-explore, request-execute, _design-shared). Otros steps migran organico cuando se toquen
- NO implementar las otras 7 funciones del roadmap (HOR-032..038) — quedan como follow-up explicito en backlog
- NO fine-tune del modelo de embedding — usa modelo pre-trained tal cual

### Tamano estimado

5 sessions (4 execute + 1 close). **S1 mas exploratoria (T2)** — validar stack tecnico + calidad multilingual. **S2 mas extensa (T2, 10 tasks)** — impl del tool con hybrid + budget + chunking + 4 tools management + cross-project. **S3 mas tediosa (T2)** — 5 archivos editados. **S4 ⚑ fuerte** — pilot empirico con metricas. Total: **5-7h efectivas**. SP: **6** (medium-high). Re-scope 2026-05-16 incluye 7 mejoras local-aware que benefician HOY con Claude.

### Como vas a saber que funciona

- `dkc_semantic_search("¿que rules aplican cuando se invalida cache?", max_tokens=1500)` retorna fragmentos relevantes de rules/specs/decisions con score, hasta cubrir 1500 tokens. **NO** retorna archivos enteros, **NO** consume mas del budget
- `dkc_semantic_search("DET-15")` (query con identificador literal) tambien retorna matches relevantes gracias a hybrid retrieval (BM25 + semantic)
- `dkc-reindex horadric` muestra: `records=58 relations=330 fts=58 learns=32 embeddings=~250`
- `dkc_embeddings_status` retorna `{ model: 'multilingual-e5-base', chunks_count: 250, hybrid_enabled: true, ... }`
- Researcher en proximo ticket llama `dkc_semantic_search` ANTES de Grep cuando la query es semantica O factual
- En S4 pilot, medicion: contexto cargado por researcher en ticket HOR-024 reducido >=30% vs estimacion baseline pre-embedding
- Calidad multilingual: queries en español tienen recall@5 >= 80% (vs ~60% con MiniLM ingles-only)

---

## Purpose

Cerrar la brecha entre **keyword search y retrieval semantico** en el KB de DKC. FTS es suficiente para queries literales pero pobre para queries conceptuales — el researcher con KB-first (DET-11) compensa cargando archivos enteros, inflando el contexto del principal innecesariamente.

Para el dev: tickets de mas de 1500 lineas mantienen DET-15 friction baja (sin embedding cada KB-first call carga ~10-20K tokens innecesarios). Para el roadmap local-only: prerequisite habilitador — modelos con context window 32K efectivo no pueden navegar el KB sin retrieval semantico.

## Requirements

### REQ-IMPROVE-01 — Tool MCP `dkc_semantic_search` con hybrid retrieval + max_tokens budget

> **Que cambia**: el MCP server `deckard-cain` gana un tool nuevo. El LLM principal puede invocarlo con `dkc_semantic_search(query, max_tokens=1500, score_threshold=0.4, scope?)` y recibir fragmentos relevantes hasta cubrir el budget de tokens. Combina semantic search (embeddings) + BM25 via Reciprocal Rank Fusion (RRF).
> **Por que**: sin un tool nativo del MCP, el LLM no puede consultar embeddings. **Hybrid retrieval** mejora ~15% el recall para queries con identificadores literales (DET-15, BUG-platform-010) vs solo semantic. **max_tokens budget** evita que multiples consultas inflen el contexto del principal — beneficia HOY con Claude (reduce DET-15 friction) y prepara para consumers locales con context limitado.

El sistema MUST:
- Registrar `dkc_semantic_search` en MCP tools del servidor existente
- Aceptar parametros:
  - `query: str` (required)
  - `max_tokens: int = 1500` (budget en tokens del output total — NO top_k fijo)
  - `top_k_cap: int = 10` (safety cap para iteracion)
  - `score_threshold: float = 0.4` (filtro de irrelevancia post-RRF)
  - `scope: Optional[dict] = None` (filtros por `kind` ∈ {rule, decision, learn, spec, ticket}, `module: str`, `project: str` o `*` cross-project, `language: str`)
- Pipeline interno:
  1. Semantic search: top 20 candidates via `multilingual-e5-base` cosine similarity
  2. BM25 search via FTS5 existente: top 20 candidates
  3. Combinar rankings con Reciprocal Rank Fusion (RRF), formula `score = sum(1 / (60 + rank))` por cada source
  4. Filter por `score_threshold` post-RRF
  5. Iterar candidates ordenados, agregar al output hasta cubrir `max_tokens` budget
- Retornar JSON: `{ chunks: [{ record_id, kind, module, project, chunk_idx, chunk_text, section_title, language, score, source_path, token_count }], tokens_used: N, chunks_returned: N, query_time_ms: N }`
- **Critico para multilingual-e5**: prefixar query con `"query: "` y documentos con `"passage: "` (formato requerido por el modelo). Transparente al consumer
- Si proyecto no tiene `embeddings.sqlite`: retornar `{ chunks: [], warning: "..." }` con warning logueado (no crashear)

### REQ-IMPROVE-02 — Indexacion via `dkc-reindex` con multilingual-e5 + chunking adaptivo

> **Que cambia**: el comando `dkc-reindex {project}` (existente) ahora tambien genera/actualiza `projects/{project}/embeddings.sqlite` usando `fastembed` (ONNX, ~80MB sin PyTorch) + `multilingual-e5-large` (1024-dim, multilingual ES+EN, ~500MB). Chunking adaptivo por seccion + fallback con metadata enriquecida. Output del comando suma `embeddings=N` al log.
>
> **Sync 2026-05-21 (L1 de S1)**: modelo original del spec era `multilingual-e5-base` (768-dim, ~280MB) pero NO esta soportado por fastembed. Cambio a `multilingual-e5-large` (1024-dim, ~500MB) — calidad superior (100% recall@5 ES confirmado en S1, vs target 80%) y storage trivial (4.5 MB para 295 chunks del POC).
> **Por que**: mantener UX simple — el dev reindexea con UN comando. **fastembed (ONNX)** ahorra ~1.5GB vs PyTorch hoy + prep para coexistir con LLMs locales sin competir por RAM. **multilingual-e5** resuelve calidad de retrieval en español (DKC es ~80% ES — MiniLM ingles-only perdia ~30-40% recall en queries ES). **Chunking adaptivo** con metadata permite filtering pre-search por kind/module/project/language.

El comando MUST:
- Cargar el modelo `intfloat/multilingual-e5-base` via fastembed (lazy, una vez por invocacion)
- Iterar records del FTS index, chunkear cada uno con estrategia adaptiva:
  - Preferencia: por seccion `##` markdown, cada seccion = 1 chunk
  - Si seccion >400 tokens: split con overlap 100 tokens
  - Si seccion <100 tokens (rules cortas): consolidar adyacentes
  - Target: chunks 200-400 tokens preferentemente
- Persistir en tabla `embeddings(record_id, chunk_idx, text, vector BLOB, kind, module, project, section_title, language, token_count, updated_at, source_path)`
- Incremental: solo re-embed chunks cuyo `record.updated_at > embeddings.updated_at`
- Flag `--no-embed` para skip (util para iteracion rapida sin esperar)
- Performance target: <30s para reindex full de horadric (~55 records, ~200-300 chunks)

### REQ-IMPROVE-03 — Migracion del researcher a semantic search PRIMERO

> **Que cambia**: `prompts/agents/researcher.md` + 4 steps (request-intake, intake-explore, request-execute, _design-shared) reciben instruccion explicita: "Para queries semanticas, invoca `dkc_semantic_search` ANTES de Grep/Glob. Solo grep si la query es literal/regex MUY especifica".
> **Por que**: sin instruccion explicita, el LLM cae a grep por default (patron observado en HOR-025 con AGENT INVOCATION). La adopcion requiere documentacion explicita. Con hybrid retrieval, ahora `dkc_semantic_search` tambien maneja queries con identificadores literales — el fallback a Grep es solo para regex strict.

Cada referencia a "buscar en rules/specs/decisions" en los 4 steps gana nota:
```
> **KB-first retrieval (HOR-031)**: usa `dkc_semantic_search(query, max_tokens=1500)` para cualquier consulta del KB. Hybrid retrieval cubre queries semanticas Y con identificadores (DET-15, BUG-X). Solo `Grep` si query es regex strict (ej. patron complejo de codigo).
```

El agent doc del researcher (`prompts/agents/researcher.md`) gana subseccion "Retrieval strategy" que documenta el orden: dkc_semantic_search (hybrid) → grep (solo regex).

### REQ-IMPROVE-04 — Cross-project semantic search

> **Que cambia**: `dkc_semantic_search` acepta scope con `project: "*"` o lista. Permite buscar patterns en bayley/up1 desde horadric.
> **Por que**: el KB de DKC NO es silo. Decisions de un proyecto a menudo aplican a otros (ej. patron de feature flags en up1 puede valer para bayley). Cross-project search multiplica el valor del KB.

Implementacion: el tool detecta proyectos disponibles (lista `projects/*/embeddings.sqlite`) y agrega los resultados con `project` field. Si scope no especifica, default `[active_project]`. Si `*`, union de todos.

### REQ-IMPROVE-05 — Tools MCP de management del index

> **Que cambia**: 4 tools MCP nuevos para diagnostico y mantenimiento del embedding index sin abrir terminal: `dkc_embeddings_status`, `dkc_embeddings_rebuild`, `dkc_embeddings_prune`, `dkc_embeddings_benchmark`.
> **Por que**: setup local va a necesitar diagnostico frecuente (que modelo activo, ultimo reindex, tamaño, performance). Tener tools MCP permite que el LLM principal o el dev consulten estado rapido. Util tambien con Claude — debugging del retrieval pipeline sin scripts manuales.

Especificaciones:

- `dkc_embeddings_status(project?)` → `{ project, model, dim, chunks_count, last_indexed_at, file_size_mb, hybrid_enabled, score_threshold }`
- `dkc_embeddings_rebuild(project, force?)` → force full rebuild ignorando incremental. Util cuando se cambia modelo de embedding
- `dkc_embeddings_prune(project)` → elimina embeddings de records cuyo `record_id` ya no existe en FTS (records borrados)
- `dkc_embeddings_benchmark(project, query_set?)` → corre N queries de prueba, retorna `{ p50_ms, p95_ms, avg_recall, queries_tested }`. Si `query_set` no especificado, usa set canonical de 20 queries representativas

### REQ-IMPROVE-06 — Configuracion de embedding abstraida en `agent-tiers.md`

> **Que cambia**: la configuracion del modelo de embedding, hybrid weights, y reranker (futuro) vive en `prompts/agent-tiers.md` (no hardcoded en el MCP server).
> **Por que**: permite experimentar con modelos alternativos sin recodear (ej. probar `bge-m3` vs `multilingual-e5-base`). Prep para local-only donde puede emerger un modelo mejor. Trade-off documentado: cambiar dimension requiere reindex full.

Seccion nueva en `agent-tiers.md`:
```yaml
embeddings:
  provider: fastembed                    # fastembed | sentence-transformers (fallback)
  model: intfloat/multilingual-e5-large  # 1024-dim, multilingual ES+EN (cambio L1: e5-base no soportado por fastembed)
  dim: 1024
  prefix_query: "query: "                # requerido por e5
  prefix_passage: "passage: "            # requerido por e5
  hybrid:
    enabled: true
    semantic_weight: 0.6                 # RRF mix - tunable
    bm25_weight: 0.4
  # Diferido HOR-031.2 post-M5 Max:
  reranker:
    enabled: false                       # activar cuando consumer sea LLM local
    model: cross-encoder/ms-marco-MiniLM-L-6-v2
  cache:
    enabled: false                       # diferido HOR-032
    max_size: 100
    ttl_seconds: 300
```

### REQ-PRESERVE-01 — FTS y `dkc_search_text` siguen funcionando

> **Que cambia**: nada. Los tools FTS existentes (`dkc_search_text`, `dkc_find_records`) NO se modifican.
> **Por que**: queries literales/regex siguen siendo mas eficientes con FTS. Embedding y FTS son complementarios, no excluyentes. Si embedding falla, FTS es fallback.

Validacion: TC-09 verifica que `dkc_search_text("DET-15")` sigue retornando matches como antes del cambio.

### REQ-PRESERVE-02 — Comando `dkc-reindex` retrocompat

> **Que cambia**: el comando sin flags se comporta IGUAL que antes (reindex FTS), pero ademas hace embedding. Sin flag `--no-embed`, no rompe scripts existentes.
> **Por que**: `dkc-reindex` se usa en hooks de commit y otros scripts. Cambiar su comportamiento default romperia ese flujo.

Validacion: TC-10 verifica que `dkc-reindex horadric` (sin flags) retorna exit 0 + log con `records=N relations=M fts=N learns=K embeddings=X` (formato extendido pero compatible con parsers existentes que solo miran `records=`).

## Test cases

| # | Caso | Discovery/REQ | Affects UI | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|--------------|-----------|----------|--------|----------|--------|---------|-------------------|
| TC-01 | POC stack tecnico: instalar sentence-transformers + sqlite-vec en venv aislado, indexar 10 archivos markdown, query top-5 retorna resultados ordenados por score | REQ-IMPROVE-01, H1 | no | sqlite-vec carga OK + embedding pipeline functional | — | — | pending | S1 | — |
| TC-02 | Benchmark performance: query top-5 sobre 200-300 chunks toma <500ms (target <100ms) | REQ-IMPROVE-01, H2 | no | <500ms p95 medido empirico | — | — | pending | S2 | — |
| TC-03 | Tool MCP registrado: `dkc_semantic_search("invalidar cache", top_k=3)` retorna JSON con record_id + chunk_text + score | REQ-IMPROVE-01 | no | JSON valido, score 0-1, resultados relevantes (chequeable manual) | — | — | pending | S2 | — |
| TC-04 | Indexacion automatica: `dkc-reindex horadric` actualiza embeddings.sqlite incrementalmente. Re-correr sobre records sin cambios NO re-embebe | REQ-IMPROVE-02 | no | Log muestra "embeddings=N skipped=M" en re-runs | — | — | pending | S2 | — |
| TC-05 | Score threshold: query irrelevante no retorna resultados | REQ-IMPROVE-01 | no | `dkc_semantic_search("xyz random query")` retorna [] o solo matches con score >= 0.3 | — | — | pending | S2 | — |
| TC-06 | Edge case: proyecto sin embeddings.sqlite. Tool retorna [] con warning, NO crashea | REQ-IMPROVE-01 | no | Return [] + warning logueado | — | — | pending | S2 | — |
| TC-07 | Researcher doc actualizado: subseccion "Retrieval strategy" presente en `prompts/agents/researcher.md` | REQ-IMPROVE-03 | no | Grep retorna seccion | — | — | pending | S3 | — |
| TC-08 | 4 steps con instruccion explicita: cada `> **KB-first retrieval (HOR-031)**` presente en steps relevantes. Grep retorna >=4 matches | REQ-IMPROVE-03 | no | Grep en 4 archivos retorna >=4 matches | — | — | pending | S3 | — |
| TC-09 | FTS sigue funcionando: `dkc_search_text("DET-15")` retorna matches como antes | REQ-PRESERVE-01 | no | Resultados equivalentes a ejecucion pre-HOR-031 | — | — | pending | S2 | — |
| TC-10 | Comando dkc-reindex retrocompat: sin flags retorna exit 0 + log con records=N. Scripts existentes no se rompen | REQ-PRESERVE-02 | no | Exit 0, log parseable | — | — | pending | S2 | — |
| TC-11 | Pilot empirico S4: ticket pilot (HOR-024 o equivalente simple) ejecuta con embedding KB activo. Medicion: contexto consumido por researcher vs estimacion baseline FTS | REQ-IMPROVE-03, REQ-IMPROVE-04, H4 | no | Reduccion medible >=20% del contexto en operaciones KB-first | — | — | pending | S4 | — |
| TC-12 | Cross-project search: `dkc_semantic_search("patron de feature flags", scope={project: "*"})` retorna matches de bayley/up1/horadric agregados | REQ-IMPROVE-04, H5 | no | Resultados de >=2 proyectos en el output | — | — | pending | S2 | — |

## Tasks

### Session 1 — POC tecnica (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios gatillados |
|---|------|------|------|-------|-------|-----|----------|--------|---------|-------------------|
| S1.T0 | Decision draft skip o full: si dev OK con skip + razon documentada (schema trivial de 1 tabla SQLite), avanzar a T1. Si dev pide draft, escalate y abrir `.draft/` con preview del schema | architect | reasoning | HOR-031.md (Draft status) | — | Decision documentada inline en frontmatter `draft_approved: skipped` o `null` con escalacion | — | pending | 1 | — |
| S1.T1 | Crear venv aislado para MCP server, instalar `sentence-transformers` + `sqlite-vec`. Verificar import OK | developer | balanced | requirements.txt o pyproject.toml del MCP server | — | `python -c "import sentence_transformers; import sqlite_vec"` exit 0 | `pip uninstall` + git revert reqs | pending | 1 | — |
| S1.T2 | POC: script aislado que indexa 10 archivos markdown del KB de horadric, genera embeddings, persiste en sqlite con sqlite-vec | developer | balanced | scratch/poc-embedding.py (temporal, NO commit) | TC-01 (parcial) | Script ejecuta sin errores, embeddings persistidos verificables con sqlite3 cli | rm scratch/poc-embedding.py | pending | 1 | — |
| S1.T3 | POC: query semantica sobre los 10 archivos, top_k=5, valida cualitativo que resultados son relevantes (judgment subjetivo del dev) | developer | balanced | scratch/poc-embedding.py | TC-01 | Output con 5 matches + score. Dev confirma "los resultados tienen sentido" | — | pending | 1 | — |
| S1.GATE | Quality review (DET-23 tier light). Decision: continue (H1 confirmada) o escalate (sqlite-vec falla, propuesta alternativa faiss) | reviewer | balanced | HOR-031.md (Sessions) | TC-01 verified | Gate decision + commit DET-27 `dkc(horadric): HOR-031 S1 POC stack tecnico validado` | git revert | pending | 1 | — |

### Session 2 — Implementacion tool MCP + indexacion (T2, gate auto)

> **Sync 2026-05-21 con re-scope del ticket HOR-031.md**: tabla expandida de 6 a 10 tasks para cubrir los 4 frentes ampliados (hybrid retrieval, max_tokens budget, 4 tools mgmt, agent-tiers config). REQs 01/02/05/06 ya los contemplaban; faltaba la particion por task ejecutable.

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios gatillados |
|---|------|------|------|-------|-------|-----|----------|--------|---------|-------------------|
| S2.T1 | Implementar `dkc_semantic_search` base en MCP server (`deckard-cain`). Solo semantic (sin hybrid aun). Schema params + return type segun REQ-IMPROVE-01. Reusar pipeline POC (batches L3) | developer | balanced | server/src/deckard_cain/embeddings.py (nuevo) + server/src/deckard_cain/__init__.py (register tool) | TC-03 | Tool registrado en MCP. `dkc_semantic_search(query)` retorna chunks via semantic search puro. Reuse POC db schema | git revert | pending | 2 | — |
| S2.T2 | Hybrid retrieval (BM25 via FTS5 + RRF). Pipeline: semantic top-20 + BM25 top-20 → RRF combine → filter score_threshold. Pesos en `agent-tiers.md` (preparar para T8) | developer | balanced | server/src/deckard_cain/embeddings.py | TC unit hybrid | RRF combina ambos rankings. Test: query con `DET-15` literal retorna alto rank (BM25) + query semantica retorna alto rank (semantic) | git revert | pending | 2 | — |
| S2.T3 | `max_tokens` budget enforcement. Iterar candidates ordenados, agregar al output hasta llegar al budget (no top_k fijo). Safety cap `top_k_cap=10` | developer | balanced | server/src/deckard_cain/embeddings.py | TC unit budget | Output respeta `max_tokens=1500` default. Test con queries grandes verifica budget no se excede | git revert | pending | 2 | — |
| S2.T4 | Chunking adaptivo (REQ-IMPROVE-02). Preferencia por seccion `##`, split si >400 tokens con overlap 100, consolidar adyacentes <100 tokens. Metadata: kind/module/section_title/language por chunk | developer | balanced | server/src/deckard_cain/embeddings.py | tests/test_embedding_chunking.py | Chunks 200-400 tokens preferentemente. Tests: rules cortas (1 chunk consolidado), specs largos (multi-chunk con overlap), markdown malformado (fallback graceful) | git revert | pending | 2 | — |
| S2.T5 | 4 tools MCP management (REQ-IMPROVE-05): `dkc_embeddings_status`, `dkc_embeddings_rebuild`, `dkc_embeddings_prune`, `dkc_embeddings_benchmark` | developer | balanced | server/src/deckard_cain/embeddings.py + register | TC unit cada tool | Cada tool callable. status retorna metadata, rebuild fuerza full reindex, prune limpia records borrados, benchmark corre 20 queries canonicas | git revert | pending | 2 | — |
| S2.T6 | Extension `commands/dkc-reindex` para indexar embeddings tras FTS. Patron batches L3 + incremental (`record.updated_at > embeddings.updated_at`). Flag `--no-embed`. Output `embeddings=N` | developer | balanced | commands/dkc-reindex | TC-04, TC-10 | Comando funciona, logs extendidos. `--no-embed` skipea. Incremental no re-embed records sin cambios. Target <30s reindex full horadric | git revert | pending | 2 | — |
| S2.T7 | Cross-project scope (REQ-IMPROVE-04). Detectar `projects/*/embeddings.sqlite`, union de resultados, agregar `project` field al output. Default `[active_project]`, `*` para union | developer | balanced | server/src/deckard_cain/embeddings.py | TC-12 | TC-12 pass. Query con `scope.project="*"` retorna chunks de bayley + up1 + horadric | git revert | pending | 2 | — |
| S2.T8 | Config abstraida en `prompts/agent-tiers.md` (REQ-IMPROVE-06). Seccion `embeddings:` con provider, model, dim, prefijos, hybrid weights, reranker (disabled), cache (disabled) | developer | balanced | prompts/agent-tiers.md | TC unit config load | MCP server carga config desde agent-tiers.md (no hardcoded). Cambiar `hybrid.semantic_weight` modifica pesos sin recodear | git revert | pending | 2 | — |
| S2.T9 | Benchmark performance + integration tests. p50/p95 de query con hybrid sobre index horadric (~295 chunks). Documentar en discovery del ticket. Validar H3 (>=15% mejora con hybrid) + H7 (<100ms p95) | reviewer | balanced | HOR-031.md (Discoveries S2) + tests integration | TC-02 + integration | Discovery con tabla metricas. H3 confirmed o documented refuted. <500ms p95 target (relaxed de 100ms por overhead RRF) | — | pending | 2 | — |
| S2.T10 | Regression FTS + `dkc_search_text`. Validar que tools FTS existentes no se rompieron. Suite tests existente debe pasar 100% | reviewer | balanced | — (validacion) | TC-09 + suite existente | TC-09 pass. Existing test suite green | — | pending | 2 | — |
| S2.GATE | Quality review (DET-23 tier standard). Decision: continue si TC-02..06 + TC-09/10/12 pass + H3 confirmed. Commit DET-27 `improve(deckard): tool dkc_semantic_search hybrid + 4 tools mgmt + dkc-reindex (HOR-031 S2)` | reviewer | balanced | server changes + dkc-reindex + agent-tiers.md | TC-02..06, TC-09, TC-10, TC-12 | Gate decision + commit DET-27 | git revert commit | pending | 2 | — |

### Session 3 — Migracion del researcher (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios gatillados |
|---|------|------|------|-------|-------|-----|----------|--------|---------|-------------------|
| S3.T1 | Editar `prompts/agents/researcher.md`: agregar subseccion "Retrieval strategy" con orden semantic → FTS → grep → read full | developer | balanced | prompts/agents/researcher.md | TC-07 | Seccion presente con ejemplos | git revert | pending | 3 | — |
| S3.T2 | Editar `prompts/steps/request-intake.md`: nota `KB-first retrieval (HOR-031)` cerca del bloque AGENT INVOCATION researcher (paso 5) | developer | balanced | prompts/steps/request-intake.md | TC-08 | Grep retorna 1 match | git revert | pending | 3 | — |
| S3.T3 | Editar `prompts/steps/intake-explore.md`: idem para paso 2.b | developer | balanced | prompts/steps/intake-explore.md | TC-08 | idem | git revert | pending | 3 | — |
| S3.T4 | Editar `prompts/steps/request-execute.md`: idem para paso A | developer | balanced | prompts/steps/request-execute.md | TC-08 | idem | git revert | pending | 3 | — |
| S3.T5 | Editar `prompts/steps/_design-shared.md`: idem para paso 0a | developer | balanced | prompts/steps/_design-shared.md | TC-08 | idem | git revert | pending | 3 | — |
| S3.T6 | Verificacion: grep total de "KB-first retrieval (HOR-031)" en los 4 steps retorna >=4 matches | reviewer | balanced | — (validacion) | TC-08 | TC-08 pass | — | pending | 3 | — |
| S3.GATE | Quality review (DET-23 tier light). Commit DET-27 `improve(prompts): researcher migration a semantic search (HOR-031 S3)` | reviewer | balanced | 5 archivos editados | TC-07, TC-08 | Gate decision + commit | git revert commit | pending | 3 | — |

### Session 4 — Pilot empirico (T2, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios gatillados |
|---|------|------|------|-------|-------|-----|----------|--------|---------|-------------------|
| S4.T1 | Elegir ticket pilot del backlog (HOR-024 o equivalente simple). Documentar criterio | architect | reasoning | HOR-031.md (Discoveries S4) | — | Discovery con eleccion + criterio | — | pending | 4 | — |
| S4.T2 | Ejecutar el ticket pilot con embedding KB activo. Researcher consulta `dkc_semantic_search` en operaciones KB-first | developer | balanced | tickets/{pilot}.md + HOR-031.md (metricas) | TC-11 | Pilot ejecutado, metricas capturadas | git revert pilot si rompe | pending | 4 | — |
| S4.T3 | Comparar contexto consumido por researcher vs estimacion baseline (operaciones FTS+read full equivalentes) | reviewer | balanced | HOR-031.md (analisis) | TC-11 | Tabla con reduccion %, decision | — | pending | 4 | — |
| S4.T4 | Evaluar H3 (adopcion del tool) y H4 (ahorro >=30%). Decidir continue / iterate / escalate | reviewer | balanced | HOR-031.md | TC-11 | Hipotesis actualizadas con status final | — | pending | 4 | — |
| S4.GATE | Quality review (DET-23 tier standard). Decision: continue (embedding KB activo por default) / iterate (refinar threshold/chunking) / escalate (no aporta valor, deshabilitar). Commit DET-27 `dkc(horadric): HOR-031 S4 pilot empirico embedding KB` | reviewer | balanced | HOR-031.md | TC-11 | Gate decision con racional + commit | — | pending | 4 | — |

### Session 5 — Close (T0, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios gatillados |
|---|------|------|------|-------|-------|-----|----------|--------|---------|-------------------|
| S5.T1 | Llenar Summary en HOR-031.md: que se hizo, metricas pilot, decision S4.GATE, learns L1..L{N}, decision sobre HOR-032..038 conditional/scheduled | scribe | fast | HOR-031.md | — | Summary completo | — | pending | 5 | — |
| S5.T2 | Actualizar tabla "Plan de sessions" con tasks finales post-execute | scribe | fast | HOR-031.md | — | Tabla refleja realidad | — | pending | 5 | — |
| S5.T3 | Promover learns refinados. Si pilot exitoso: evaluar promocion del patron "semantic search first" a candidata de DET (no en este ticket — follow-up) | scribe | fast | learns/ + rules/ si aplica | — | Learns refinados | — | pending | 5 | — |
| S5.T4 | Teach-close decision (default si o skip + razon) | scribe | fast | HOR-031.md + teach-close.md si aplica | — | teachings.close: done o skipped | — | pending | 5 | — |
| S5.GATE | Cierre — DET-22 + DET-25 verificadas. Frontmatter `status: closed`. Commit DET-27 `close(horadric): HOR-031 closed — embedding KB {outcome}` + reindex | scribe | fast | HOR-031.md | TC-01..12 con Status final | Ticket cerrado, reindex OK | — | pending | 5 | — |

## Backlog

(Vacio — items que emerjan durante execute se agregaran aqui con priority must/should/could segun DET-17.)

## Open questions

- **Modelo de embedding**: ¿`all-MiniLM-L6-v2` (384-dim, 100MB) suficiente, o ir directo a `mxbai-embed-large` (1024-dim, 400MB)? Decision en S1 segun cualitativo de POC. Default actual: MiniLM.
- **Chunking strategy**: ¿por seccion `##` markdown es robusto contra rules muy cortas (1 parrafo)? Quizas mezclar rules cortas en un chunk agrupado. Evaluable en S2.T3.
- **Cross-project default**: ¿`scope.project` default es `[active_project]` o `[*]`? Default propuesto: active_project para no spamear con resultados de otros proyectos. Override explicito si dev quiere cross.
- **Frecuencia de re-embed**: ¿incremental por record es suficiente, o necesitamos invalidacion explicita cuando un rule cambia de significado pese a misma timestamp? Default actual: solo por updated_at. Si emerge problema, agregar hash del contenido.
