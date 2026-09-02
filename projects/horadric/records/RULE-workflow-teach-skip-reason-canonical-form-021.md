---
id: RULE-workflow-teach-skip-reason-canonical-form-021
project: horadric
type: rule
module: workflow
level: must
tags:
  - teach
  - gate
  - g7
  - contrato
  - productor-consumidor
  - det-21
  - det-22
  - forma-canonica
---

# La razon del teach skip va en linea propia, y el campo que la lleva no admite cumplimiento parcial

## What

Cuando un ticket declara `teachings.{intake|close}: skipped`, su seccion
`## Teaching — {Intake|Close}` MUST escribir la razon asi:

```markdown
**Status**: skipped
**Razon**: {razon}
```

Un campo por linea. La forma inline (`**Status**: skipped — {razon}`) esta **retirada** y ningun
productor la emite. Tampoco valen las variantes historicas `**Status**: skipped (justificacion: ...)`
ni `**Razon del skip**:`.

Y el corolario, que es lo que hace la regla util mas alla de este campo: **cuando un valor
obligatorio comparte linea con otro campo, su ausencia deja de ser detectable.** `**Status**:
skipped` a secas es sintacticamente impecable y no tiene razon. Un campo por linea convierte la
ausencia en una linea ausente, que si se puede grepear, validar y contar.

## Why

En HOR-134 la razon del skip tenia cuatro superficies y dos formas incompatibles. El gate G7
exigia `**Razon**:`; los prompts productores emitian la inline; el viewer de HC leia la inline.
Un ticket escrito siguiendo los prompts al pie fallaba el gate, y uno corregido para pasar el
gate quedaba ilegible en el viewer. Ninguno avisaba del otro: el gate solo miraba su forma, el
viewer degradaba a `null` en silencio.

El costo real no fue el formato. De 461 secciones, **317 no exponian su razon a ningun
consumidor** — el 69% del corpus. DET-21 y DET-22 exigen la razon justamente para que el skip no
sea silencioso, y la mitad del KB la tenia invisible.

El corolario del cumplimiento parcial salio de contar: de esas 317, **33 tenian la seccion escrita
pero sin razon**. Nadie las escribio mal a proposito; escribieron `**Status**: skipped` y se
olvidaron de la parte que iba pegada en la misma linea. Con la forma separada ese olvido lo agarra
un grep.

## Where

- `prompts/steps/teach-intake/instructions.md` — bloque template + opt-out HOR-106
- `prompts/steps/_design-shared.md` — GATE 1 Ruta B y su fallback manual
- `prompts/steps/request-close/checkpoints-and-close.md` — el skip del close
- `commands/dkc-verify-gate` — gate G7, el enforcer
- `horadric-cube:server/deckard/teaches.ts` — `extractSkipReason`, el viewer
- `commands/lib/teach_skip_forms.py` — fuente unica del reconocimiento de formas para el tooling
- Contrato completo, matriz y herramientas: `docs/teach-skip-reason-contract.md`

## When

Al escribir un skip de teach, y al tocar cualquiera de las superficies de arriba. Tambien al
agregar un consumidor nuevo de la razon: ahi la obligacion es DET-16 (propagacion) mas
[[RULE-workflow-sentinel-producer-consumer-contract-020]] — el consumidor nuevo replica la matriz
con los mismos nombres de caso, verificado por su propia suite.

El corolario del cumplimiento parcial aplica mas ancho: al diseñar CUALQUIER campo obligatorio de
un artefacto markdown, preguntarse si su ausencia va a ser detectable. Si el campo comparte linea
con otro, no lo es.

## How to verify

1. `./commands/dkc-verify-gate G7 {TICKET} --project {project}` pasa.
2. `commands/lib/measure-teach-skip-forms.py` reporta 0 en las formas legacy y 0 sin razon.
3. Las dos suites de la matriz verdes, y **fallando al revertir el fix de su lado**:
   `server/tests/test_teach_skip_reason_contract.py` y
   `horadric-cube:server/deckard/teachSkipContract.test.ts`.
4. Una razon backfilleada se distingue de una real por el literal `backfill retroactivo (HOR-134)`.
