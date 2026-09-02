---
id: RULE-workflow-delegated-verdict-must-conclude-021
project: horadric
type: rule
module: workflow
level: must
tags:
  - delegation
  - det-33
  - det-35
  - det-38
  - veredicto
  - schema
  - jueces
  - codex
---

# Un veredicto delegado que pasa el schema todavia no dice nada: el `summary` tiene que concluir

## What

Al delegar un rol con contrato de salida (`reviewer`, `tester`, y los jueces de DET-35/DET-38
que viajan sobre `reviewer`), el schema valida **forma**: campos presentes, enums correctos,
tipos. No valida que el campo narrativo cierre un razonamiento. Dos obligaciones:

1. **Pedir la forma del `summary` en el handoff.** Una clausula explicita: el `summary` es la
   CONCLUSION — que se verifico y que se decidio — y esta prohibido el plan en futuro.
2. **No contar como voto un veredicto cuyo `summary` no concluye.** Un resumen en futuro
   ("voy a revisar…") es la senal de que el modelo emitio la tool call antes de razonar. En un
   dual-judge eso no es un empate: es un juez que no juzgo, y hay que re-correrlo.

## Why

En el gate DET-38 de HOR-133 un juez devolvio `recommendation: approve` con `findings: []` y
este `summary`: *"Voy a revisar el contrato del juez y exclusivamente los archivos contenidos en
el handoff, en modo de solo lectura."* Su frase de apertura. El schema lo acepto sin objetar,
porque `approve` es un enum valido y `findings: []` es una lista valida.

Contado como voto, ese veredicto habria aprobado el spec. Re-corrido con la clausula de formato
—mismo modelo, mismo handoff, mismo tier— el juez encontro un hueco real de trazabilidad
(`REQ-REGRESSION-01` prometia seis preservaciones sin task ni acceptance que las ejecutara). La
diferencia entre "aprueba en vacio" y "encuentra un defecto" no fue el modelo ni el alcance: fue
exigirle que el campo narrativo cerrara el razonamiento.

Es DET-33 un escalon mas adentro. `RULE-workflow-verify-the-record-018` dice que un comando que
registra algo se verifica leyendo el registro y no su stdout; esta dice que el registro tampoco
alcanza si su contenido no concluye. El schema es una condicion necesaria, no suficiente.

## Where

- `commands/dkc-delegate` — el handoff que arma para cualquier rol delegado
- `commands/lib/schemas/roles/*.json` — los schemas que validan forma, no contenido
- `prompts/steps/_design-shared.md` Paso 0f (DET-38) y `prompts/steps/request-execute/session-gate.md` (DET-35) — los gates que consumen esos veredictos
- `prompts/agents/judge-spec.md`, `judge-reconcile.md`

## When

Al armar el handoff de cualquier rol delegado con schema de salida, y al sintetizar el veredicto
de un dual-judge antes de declarar `approved`.

## How to verify

Leer el `summary` antes de contar el voto. Si esta en futuro, si describe el plan de trabajo, o
si no nombra nada concreto que se haya verificado, re-correr con la clausula de formato. Un
`approve` con `findings: []` y un summary generico merece esa sospecha aunque el schema valide.
