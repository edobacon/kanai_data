---
id: RULE-workflow-det-introduction-001
project: horadric
type: rule
module: workflow
level: must
tags:
  - det
  - gate
  - prompt-coherence
  - h7-1
---

# Cuando se introduce una DET nueva, los 3 capas (rule + workflow + step ejecutor) deben actualizarse simetricamente

## What

Cuando una nueva regla deterministica (DET-N) se introduce al sistema, deben actualizarse las **3 capas** que dan vida al contrato:

1. **Capa 1 (regla)**: declaracion textual en `prompts/deterministic-rules.md` — define el contrato.
2. **Capa 2 (workflow)**: declaracion en `prompts/workflows/request.md` (o subworkflow) — orquesta cuando se invoca.
3. **Capa 3 (step ejecutor)**: implementacion del gate en el(los) step(s) `prompts/steps/*.md` que materializan el contrato — es lo que el LLM efectivamente ejecuta.

Sin las 3 capas alineadas, la DET es un contrato declarado que NO se cumple automaticamente — solo se cumple si hay atencion humana en cada invocacion del flujo.

## Why

Descubierto en HOR-014 auditoria DKC: **DET-21 (teach-intake)** y **DET-22 (teach-close)** introducidas en HOR-013 estaban completas en capas 1 + 2 pero AUSENTES en capa 3 — ningun `design-{tipo}.md` verificaba teach-intake (DET-21), ningun `request-close.md` invocaba teach-close (DET-22). HOR-013 cumplio el dogfooding solo porque hubo atencion humana explicita en cada cierre.

Sintoma del bug: invisible. El ticket queda en estado "valido por contrato" (declarado) pero no por implementacion. Se manifiesta cuando un cierre desatendido salta silenciosamente el sub-step.

El patron sistemico (H7.1 confirmado en HOR-014) de introducir DETs a medias es una deuda de proceso, no incidental.

## Where

- `prompts/deterministic-rules.md` — capa 1 (declaracion textual)
- `prompts/workflows/*.md` (especialmente `request.md`) — capa 2 (orquestacion)
- `prompts/steps/*.md` — capa 3 (implementacion del gate). Buscar steps que invocan el contrato y agregarles `## ⚠️ GATES` con checklist explicito.

## When

Aplica al introducir cualquier DET nueva al sistema (DET-{N+1} en adelante).

Tambien aplica retroactivamente: cualquier DET ya declarada DEBE tener implementacion en capa 3 — si falta, el patron sistemico se repite.

## Verification

Despues de introducir una DET nueva, verificar empiricamente:

```bash
# Capa 1: la regla esta declarada
grep -n "## N\. " prompts/deterministic-rules.md

# Capa 2: el workflow la orquesta
grep -rn "DET-N\|regla N" prompts/workflows/

# Capa 3: el(los) step(s) ejecutor(es) la implementa(n)
grep -rn "DET-N\|regla N" prompts/steps/

# Sin matches en capa 3 = patron sistemico — DET incompleta
```

Auditoria periodica recomendada (cada 5-10 DETs nuevas) ejecutando un agent-based audit que cruce las 3 capas por cada DET.

## Source

- HOR-014 auditoria DKC (S1) — F-1 (DET-22 ausente en `request-close.md`) + F-2 ext (DET-21 ausente en los 4 `design-{tipo}.md`)
- L-S1-1 (raw learn) → confirmado simetricamente al fixar los 5 archivos en S2 → promovido a rule en S6
- Spec: SPEC-workflow-dkc-followup-13
