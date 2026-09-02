---
id: RULE-workflow-merged-subticket-heuristic-006
project: horadric
type: rule
module: workflow
level: should
tags:
  - granularity
  - sub-tickets
  - code-reuse
  - sprint-planning
  - heuristic
---

# Sub-ticket merged vs N granulares: heuristica de granularidad basada en codigo compartido

## What

Cuando un spec exploratorio produce **multiples sub-tickets de implementacion derivados**, evaluar si conviene **mergear** los sub-tickets en uno solo vs mantenerlos **granulares**:

- **Merge** si los sub-tickets comparten **≥50% de codigo** o **infraestructura comun** (mismo MCP server, mismo modulo, mismas dependencias, mismo flujo de tests)
- **Granular** si los sub-tickets son **ortogonales** (modulos distintos, codigo independiente, owners potencialmente distintos, fechas de ejecucion potencialmente distintas)

## Why

Sin esta heuristica, hay dos patologias frecuentes:

1. **Granular excesivo**: 3 sub-tickets cuando uno solo bastaba → overhead de tickets (intake + teach + design × 3) sin valor agregado. SP combinado equivalente, pero tiempo de coordinacion mayor.

2. **Merged excesivo**: 1 sub-ticket gigante (15+ SP) cuando ortogonales hubiera permitido ejecucion paralela por personas distintas → bloqueo serial sin necesidad.

Caso de referencia HOR-051+052 (closed 2026-05-16): los specs exploratorios produjeron inicialmente "HOR-054 (Frente A) + HOR-057 (Frente B)" como propuesta separada. Decision del dev al cerrar: **mergear en HOR-054** porque:

- Mismo MCP server target (deckard-cain)
- Signatures similares (`dkc_enforce_step` y `dkc_invoke_agent` ambos son MCP tools)
- Mismo mapping host (HOR-029 reusable)
- Mismas decisiones fallback (estrategia H4 aplicable a ambos)
- Mismos tests de integracion

Resultado: ahorro ~3-5 SP por reutilizacion, menos overhead de tickets, coordinacion mas simple. SP combinado 12-15 vs 8-10 + 5-8 separados.

## Where

Aplica a sub-tickets derivados de:

- **Explores que producen multiple sub-tickets** (caso HOR-050 → HOR-051+052+053)
- **Improvements que se subdividen** en componentes
- **Refactors multi-modulo** donde algunos modulos comparten codigo

- **Files**: tickets de implementacion derivados, plan de sessions del spec exploratorio
- **Layers**: meta (planificacion de trabajo)

## When

Aplicar la heuristica:

1. Al cerrar un spec exploratorio que produce ≥2 sub-tickets sugeridos
2. Al evaluar la granularidad de un improvement que toca multiples componentes
3. Cuando el dev pregunta explicit "¿1 sub-ticket merged o N granulares?"

NO aplicar (granular siempre):
- Sub-tickets que tocan modulos distintos sin codigo compartido
- Sub-tickets con fechas de ejecucion distintas planificadas
- Sub-tickets que pueden tener owners distintos (multi-equipo)

## Verification

Cuando se cierra spec con sub-tickets sugeridos:
- **Grep** los sub-tickets propuestos. Si ≥2: aplicar heuristica
- **Estimar overlap de codigo**: leer Modulos afectados de cada sub-ticket. Si comparten >50% files: candidato a merge
- **Estimar overlap de SP**: si SP combinado merged > SP sumado separados (por overhead) → granular. Si menor (por reutilizacion) → merged

Heuristica numerica:
- **Merge si**: `overlap_files ≥ 50%` AND `overlap_decisions ≥ 50%` AND `SP_merged ≤ SP_suma × 1.1`
- **Granular si**: cualquiera de las condiciones falla, O hay razones de coordinacion (distintos owners, fechas, releases)

## Source

- **Discovered in**: HOR-052 (closed 2026-05-16), decision del dev al cerrar HOR-051+052
- **Evidence**: spec HOR-051 inicialmente proponia HOR-054 (A) + HOR-055 (file watcher). Spec HOR-052 inicialmente proponia HOR-057 (B). Decision del dev: mergear HOR-054 + HOR-057 en un solo HOR-054 multi-MCP-tool. Razon: mismo MCP server, signatures similares, mismo mapping HOR-029
- **Related**: RULE-workflow-catalog-executor-pattern-005 (cuando hay catalogo+ejecutor portable, el ejecutor puede compartirse entre frentes — favorece merge)
