---
id: RULE-core-010
project: up1
type: rule
module: core
tags:
  - workflow
  - gates
  - intake
  - execute
  - degradation
  - process
---

# Releer el prompt del step correspondiente al iniciar cada ticket, no solo el primero

## What

Al iniciar un nuevo ticket (intake, design, execute, close), el LLM DEBE releer el archivo de prompts del step antes de ejecutarlo. No basta con "ya saber" el proceso de un ticket anterior. Aplica incluso si el ticket anterior se completó hace minutos en la misma sesión.

Pasos obligatorios por ticket:
1. Leer `prompts/steps/request-intake.md` antes de crear el ticket
2. Leer `prompts/steps/design-feature.md` (o design-fix, etc.) antes de diseñar
3. Leer `prompts/steps/request-execute.md` antes de ejecutar tasks
4. Leer `prompts/steps/request-close.md` antes de cerrar

## Why

En la práctica, el LLM degrada progresivamente la calidad del registro entre tickets de una misma sesión. TICKET-002 siguió el flujo completo. TICKET-003 fue más ligero. TICKET-004 saltó intake, design y session log — el ticket quedó con secciones vacías (Triage, Context found, Setup, Sessions). La causa fue asumir que "ya sabía el proceso" sin releer los prompts, lo que eliminó los gates bloqueantes diseñados para prevenir exactamente este problema.

## Where

- **Files**: `prompts/steps/request-intake.md`, `prompts/steps/design-*.md`, `prompts/steps/request-execute.md`, `prompts/steps/request-close.md`
- **Layers**: workflow (proceso Deckard Cain)

## When

Al iniciar cada fase de cada ticket nuevo. Sin excepciones, incluso para tickets "simples" o "similares al anterior". La simplificación del proceso es una decisión que se toma DESPUÉS de leer el prompt, no antes.

## Verification

- Verificar que la conversación tiene una lectura (Read tool) del prompt del step ANTES de cada fase del ticket
- Si un ticket se crea sin haber leído `request-intake.md`, es una violación

## Source

- **Discovered in**: TICKET-004, Session 1 (post-mortem)
- **Evidence**: TICKET-004 se creó sin leer request-intake.md. Resultado: ticket con Triage, Context found, Setup y Sessions vacíos. El usuario detectó la omisión
- **Related**: Gate 15 (contexto agotado), gates D+E de request-execute.md
