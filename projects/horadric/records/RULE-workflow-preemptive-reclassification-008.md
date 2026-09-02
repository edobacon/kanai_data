---
id: RULE-workflow-preemptive-reclassification-008
project: horadric
type: rule
module: workflow
level: should
tags:
  - reclassification
  - preemptive
  - cross-frente
  - drift-prevention
  - scope-coherence
---

# Reclassificacion preemptiva al cierre de ticket hermano cuando comparten causa raiz arquitectural

## What

Cuando un ticket cierra con **decision arquitectural** que afecta otros tickets relacionados (especialmente tickets hermanos derivados del mismo spec parent), aplicar **reclassificacion preemptiva**:

1. **Al cerrar el primer ticket** (el que tomo la decision), identificar tickets hermanos con causa raiz arquitectural comun
2. **Reclasificar los hermanos** antes de avanzar (no esperar a arrancarlos individualmente)
3. **Documentar las implicaciones** cruzadas en el spec del ticket que cierra + en el frontmatter de los hermanos
4. **Procesar los hermanos en paralelo** si tienen scope similar (intake + teach + spec draft compactos)

## Why

Sin reclassificacion preemptiva, hay dos patologias:

1. **Drift cross-frente**: el primer ticket cierra con direccion arquitectural A, los hermanos se arrancan despues con direccion B (porque el LLM/dev olvido la decision del primero). Resultado: inconsistencia, re-trabajo.

2. **Re-trabajo masivo posterior**: cuando el dev nota la inconsistencia, hay que reclassificar el hermano + actualizar specs + actualizar sub-tickets derivados. Costo proporcional al tiempo transcurrido.

Caso de referencia HOR-051+052 (closed 2026-05-16):
- HOR-051 (Frente A directive enforcement) cerro con decision arquitectural "cross-host MCP tool"
- HOR-052 (Frente B AGENT INVOCATION) originalmente estaba como `improvement` Claude-specific
- **Dev intuyo al cierre**: reclassificar HOR-052 preemptivo a explore cross-host (decision OPEN-3 del spec HOR-051)
- Resultado: HOR-052 explore se proceso en paralelo, spec con simetria total, sub-ticket merged HOR-054 cubre ambos
- **Costo de la reclassificacion preemptiva**: ~1.5h (intake + teach + spec compactos)
- **Costo de NO hacerla** (si se hubiera arrancado HOR-052 improvement post-HOR-051): re-trabajar HOR-052 al detectar inconsistencia, ~3-4h adicionales

Heuristica del dev capturada: *"si esto cambio, donde mas deberia reflejarse?"* (DET-16 propagacion aplicada cross-ticket).

## Where

Aplica a:

- **Tickets derivados de un mismo spec parent** (caso HOR-050 → HOR-051+052+053)
- **Tickets que comparten causa raiz arquitectural** (D2/D9/D11 fueron el origen comun)
- **Tickets en cola para implementacion** (no aplicar a tickets ya closed)

- **Files**: tickets hermanos (`projects/{project}/tickets/HOR-{seq}.md`), specs de los hermanos
- **Layers**: meta (workflow planning)

## When

Aplicar **al cerrar** un ticket que:

1. Toma decision arquitectural significativa (reclassificacion, cambio de approach, cross-host vs host-specific)
2. Tiene tickets hermanos identificables (derivados del mismo spec parent, o tags relacionados)
3. Los hermanos tienen scope que se afectaria por la decision

NO aplicar para:
- Decisiones tacticas del ticket (cambio de implementation detail dentro del scope)
- Tickets hermanos que claramente son ortogonales (modulos distintos, problemas no relacionados)
- Tickets en estado `closed` (ya completados — la decision aplica solo a futuros)

## Verification

Al cerrar ticket con decision arquitectural:
- **Grep** tickets hermanos: `find_by_reference(spec_parent)` o `grep -l "{spec_parent_id}" tickets/*.md`
- **Para cada hermano open/in_progress**: evaluar si la decision aplica
- **Si aplica**: documentar implicacion en spec del ticket que cierra (seccion "Implicaciones para HOR-X") + ofrecer al dev opcion de reclassificacion preemptiva
- **Si dev autoriza**: ejecutar reclassificacion (intake-explore v2 + teach-intake v2 + spec compacto) antes de cerrar el ticket que origino la decision

Procedimiento operativo:
1. Spec del ticket primario incluye seccion `## Implicaciones para HOR-X` (registrar siempre, aplicar/no aplicar es opcional)
2. Al cerrar el primero, AskUserQuestion: "¿reclasificar HOR-X preemptivo o esperar a arrancarlo?"
3. Si preemptivo: ejecutar reclassificacion + cerrar ambos
4. Si esperar: documentar en backlog `must` con razon

## Source

- **Discovered in**: HOR-052 (closed 2026-05-16), reclassificacion preemptiva tras decision del dev al cerrar HOR-051
- **Evidence**:
  - HOR-052 frontmatter `reclassified.date: 2026-05-16` + `reason: "Reclassificacion preemptiva decidida por el dev al cerrar HOR-051"`
  - Spec HOR-051 seccion `## Implicaciones para HOR-052/HOR-053` con OPEN-3 resuelto en `RESUELTO (2026-05-16): reclassificar AHORA preemptivo`
  - Lessons learned `teach-close.md` HOR-051 item 3 + HOR-052 item 3 (heuristica recurrente — sintetizada en esta rule)
- **Related**: RULE-workflow-archive-superseded-spec-007 (cuando la reclassificacion incluye archivar spec v1), DET-16 (propagacion — aplicado cross-ticket en lugar de solo cross-artifact)
