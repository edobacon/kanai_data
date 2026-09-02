---
id: RULE-global-005
project: jormat-evolution
type: rule
module: global
level: must
tags:
  - process
  - workflow
  - docs
  - testing
  - close-gate
  - governance
---

# Todo ticket revisa documentación y tests antes de cerrar

## What

Todo ticket de jormat-evolution (cualquier `work_type`, incluido `tactic`) MUST, **antes de cerrar**, revisar explícitamente DOS dimensiones y dejar registro del veredicto en el ticket (Summary o sección de cierre):

1. **Documentación**: ¿el cambio afecta la doc del repo (`docs/`) o externa (`jormat_docs/`)? Si sí → actualizarla en el mismo ciclo. Si no aplica → registrar `docs: n/a` con 1 línea de por qué.
2. **Tests**: ¿el cambio agrega/modifica comportamiento testeable? Si sí → tests nuevos/ajustados + suite verde + coverage ≥90 sin caer (RULE-testing-coverage-threshold-002). Si no aplica → registrar `tests: n/a` con razón.

No basta con "parece que no hace falta": el veredicto (actualizado | n/a + razón) debe quedar escrito.

## Why

Los últimos tickets (JOR-049 coverage+thresholds, JOR-052/053 fix de layout) cerraron sin tocar docs → la doc (`docs/testing.md`, `front/testing.md`, shell) quedó stale y hubo que sincronizarla en un ticket aparte (JOR-054). La revisión explícita por ticket evita la deriva: doc y tests se mantienen al día con el código, no "después". Es barato hacerlo en el momento y caro reconstruirlo luego.

## Where

- En el cierre de cada ticket (`request-close` para full-path; `## Summary` del `tactic-execute`). El dev/LLM lo verifica como parte del cierre.
- Reforzado en `config.yaml` → `conventions.critical_rules` (se surfacea al trabajar el proyecto).

## When

Siempre, en TODO ticket, al cerrar. Calibración por peso:

- `tactic`/`quick`: la revisión puede ser de 1 línea (`docs: n/a`, `tests: n/a`) si genuinamente no aplica, pero debe estar.
- `fix`/`improvement`/`refactor`/`implement`: revisión real — si tocaste comportamiento, hay tests; si cambiaste algo que la doc describe (config, convenciones, contratos, setup, arquitectura), hay update de doc.

Excepción: nada — incluso un fix de typo confirma `docs/tests: n/a`. La carga es mínima; el objetivo es que la pregunta nunca se omita.

## Verification

Al cerrar, el `## Summary`/cierre del ticket contiene un veredicto explícito de **Documentación** y de **Tests** (actualizado con referencia, o `n/a` + razón). Un cierre sin ese veredicto incumple esta regla.

## Source

JOR-054 (a raíz de la deriva detectada tras JOR-049/052/053). Relacionada: [[RULE-testing-coverage-threshold-002]] (el gate de coverage que la dimensión "tests" debe respetar).
