---
id: RULE-dredd-doc-normative-levels-003
project: horadric
type: rule
module: dredd
level: must
tags:
  - dredd
  - pr-review
  - documentation
  - kb
  - veredicto
  - nivel-normativo
  - fase-2.5
  - fase-4.5
---

# Doc de producto/mod es exigible y pesa en el veredicto; el KB del dev es propuesto y no condiciona

## What

Dredd distingue dos cuerpos documentales con **nivel normativo distinto**:

- **Doc del producto up1 (core) y del mod** — `docs/` de cada workspace, `.ai/`, `CLAUDE.md` de
  workspace/mod, README del mod, schema de layout. Describe el producto para el equipo y otros
  tenants: es de **mantenimiento obligatorio**. Doc faltante o contradicha en una **superficie de
  contrato** (API GraphQL, capability/permiso, env var, objeto/campo, comando de setup) se reclama
  si o si y **pesa en el veredicto**: impide un "aprobable limpio", baja al menos a
  aprobable-con-observaciones, y a iterar si el contrato es critico y quedo sin doc.
- **KB de Deckard** (rules/decisions/bugs/specs) — es **responsabilidad del dev**. Dredd lo consume
  (Fase 4) y **propone** mantenerlo (Fase 4.5), pero NO condiciona el veredicto ni bloquea el PR.

Matiz de "solo como hallazgo": dredd **reclama y pondera** la deuda de doc de producto, pero **no
edita la doc ni crea archivos/follow-ups automaticos** (eso lo hace el autor). "Solo como hallazgo"
acota el side-effect, no rebaja la obligatoriedad de levantarla.

## Why

El dev fijo el criterio: la doc del producto debe mantenerse viva si o si porque la consume todo el
equipo y otros tenants; el KB propio de DKC es del dev y su frescura no puede bloquear el trabajo de
otro. Sin separar el nivel normativo, dredd trataria ambas igual: o presionaria de mas por el KB
(que es del dev), o de menos por la doc de producto (que es exigible). La regla ancla que producto =
obligatorio (con peso en veredicto) y KB = propuesto (sin peso).

## Where

- **Files**: `deckard/commands/dkc-dredd.md` (Fase 2.5 encabezado de alcance + notas "Pesa en el
  veredicto" y de aclaracion; Fase 4.5 nota "Nivel normativo"); `~/.claude/skills/dredd/SKILL.md`
  (Fase 2.5 equivalente, contraste con el KB opcional de la Fase 4).
- **Layers**: capa de veredicto de la review.

## When

Al ponderar hallazgos de documentacion en el veredicto. Doc de producto/mod de contrato faltante o
stale condiciona el veredicto; deuda de KB del dev, nunca.

## Verification

- Un PR con doc de producto de contrato faltante no cierra como "aprobable limpio".
- Un PR con KB de DKC desactualizado puede seguir siendo aprobable; el mantenimiento del KB aparece
  solo como propuesta (Fase 4.5), no como condicion del veredicto.

## Source

- **Discovered in**: sesion de refuerzo a dredd (2026-07-15). Cita del dev: "debe ser la
  documentacion propia de up1 y del mod, el dev es responsable de mantener viva su KB propia, pero
  la del producto debe mantenerse actualizada si o si".
- **Evidence**: la Fase 2.5 no distinguia el nivel normativo entre doc de producto y KB de DKC.
- **Related**: [[RULE-dredd-proactive-missing-doc-002]] (deteccion de la doc faltante que esta regla
  pondera); [[RULE-dredd-multi-ticket-commit-attribution-001]].
