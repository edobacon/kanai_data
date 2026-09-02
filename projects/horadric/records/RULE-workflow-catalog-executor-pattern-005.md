---
id: RULE-workflow-catalog-executor-pattern-005
project: horadric
type: rule
module: workflow
level: should
tags:
  - architecture
  - cross-host
  - portability
  - catalog
  - executor
  - separation-of-concerns
  - llm-only-prep
---

# Catalogo machine-readable + ejecutor portable: patron para features que apuntan a cross-host

## What

Para cualquier feature que tenga **ejecucion variable segun host** (LLM host, runtime, plataforma), separar el diseno en **dos capas**:

1. **Catalogo machine-readable**: declaracion universal de "que debe ejecutarse cuando" en formato portable (markdown, JSON, YAML embed). Sin acoplamiento a host especifico.
2. **Ejecutor portable**: implementacion del consumidor del catalogo. Puede tener multiples adapters (uno por host), pero la INTERFACE del ejecutor es identica para todos.

Aplicar este patron cuando un trade-off arquitectural cobra forma con un host especifico antes de evaluar portabilidad.

## Why

Sin esta separacion, las decisiones host-specific se mezclan con las decisiones universales:

- Trabajo desechable cuando cambia el host (caso real: HOR-051 v1 spec Claude-Code-specific, archivado tras feedback cross-host)
- Imposibilidad de implementar adapter para nuevo host sin reescribir todo
- Confusion del lector que no distingue "que debe pasar" de "como pasa en X host"

Caso de referencia HOR-051 (closed 2026-05-16): Frente A de directive enforcement nacio como "Claude Code hooks" (acoplado al harness). Tras feedback "expandir cross-host", se separaron las capas:
- Catalogo: comment HTML `<!-- enforcement: a-hook command: "..." -->` (universal a TODOS los hosts)
- Ejecutor: MCP tool dedicado `dkc_enforce_step` (portable via estandar MCP). Adapter Claude Code hooks queda como opcion futura, no primario.

Esta separacion permitio:
- 6 approaches evaluados al mismo nivel (decision matrix)
- HOR-051 + HOR-052 cubren A+B con simetria
- Spec v1 archivado preserva valor como "evaluacion del adapter Claude Code"

Aplicable mas alla de directive enforcement: cualquier feature que requiera multi-LLM-host, multi-IDE, multi-runtime, etc.

## Where

Aplica a:

- **Features de workflow** que el LLM ejecuta directamente (auto-reindex, validators, agent invocation, post-step hooks)
- **Features de UI** que consumen artefactos LLM-producidos (HC viewer, integraciones futuras)
- **Configuracion declarativa** que cambia segun ambiente (tier resolution, model selection)

NO aplica a:
- Features unitarias acopladas inherentes a un host (ej: extension VSCode UI especifica)
- Algorithms / business logic puramente computacionales

- **Files**: cualquier `prompts/steps/*.md`, `commands/*`, `server/src/deckard_cain/tools/`
- **Layers**: meta (workflow), application (commands), MCP server

## When

Aplicar la separacion **proactivamente** cuando:

1. Una feature emerge como "implementacion en Claude Code" / "feature de IDE X" → evaluar si la capa "que debe pasar" es universal
2. Un trade-off de portabilidad aparece en el spec parent (riesgo "no portable a host Y")
3. El proyecto tiene direccion estrategica LLM-local (HOR-029 Ruta B) o multi-IDE

Aplicar **reactivamente** cuando:

- Feedback del dev pide expandir cross-host (caso real HOR-051)
- Emerge segundo adapter como necesidad → la capa "que" debe ser explicit

## Verification

- **Grep**: buscar features con catalogo declarativo (`<!-- enforcement: ... -->`, fence `dkc:*`, frontmatter machine-readable) → confirmar que el ejecutor es portable o tiene adapters declarados
- **Spec review**: cuando se aprueba spec de feature cross-host, verificar que tenga seccion "Approaches evaluados" con multiple options + recomendacion del ejecutor primario
- **Code review**: nuevo MCP tool / nuevo hook / nuevo validator → verificar que NO codifica logica host-specific en el catalogo (mantener catalogo agnostico)

Heuristica: si el dev/LLM pregunta "¿como hago esto en host Y?" y la respuesta requiere reescribir el catalogo, la separacion fallo. Si solo requiere agregar adapter del ejecutor, la separacion esta correcta.

## Source

- **Discovered in**: HOR-051, intake-explore v2 cross-host (2026-05-16)
- **Evidence**: spec v1 Claude-Code-specific archivado en `_archive/SPEC-workflow-hooks-claude-code-51.md`. Spec v2 cross-host con 6 approaches separa catalogo (universal) de ejecutor (multiple options). Decision matrix confirma A.6 MCP tool primario con 59% — separacion explicit
- **Related**: HOR-052 (mismo patron en Frente B, recomendacion B.2 MCP tool por simetria), HOR-050 spec parent (DEC-LOCAL-02 elige formato comment HTML), HOR-029 (mapping host como precedente de portabilidad ligera)
