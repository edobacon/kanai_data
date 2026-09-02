---
id: RULE-workflow-enforcement-pattern-009
project: horadric
type: rule
module: workflow
level: must
tags:
  - det
  - enforcement
  - t2-convention
  - a-hook
  - validator
  - audit-followup
  - hor-058-followup
  - hor-065-followup
---

# Toda DET nueva debe materializarse en las 5 capas del patron de enforcement DKC

## What

Cuando se introduce una nueva regla deterministica (DET-N) al sistema, debe materializarse en las **5 capas** que convierten el contrato declarativo en un contrato verificable y bloqueante:

1. **Capa 1 (regla)** — declaracion textual en `prompts/deterministic-rules.md`. Define el contrato: que dice, por que aplica, donde aplica, cuando aplica.
2. **Capa 2 (step ref)** — referencia desde los steps relevantes en `prompts/steps/*.md`. Indica cuando el LLM ejecutor debe consultar/aplicar la regla.
3. **Capa 3 (comando ejecutable)** — comando en `commands/dkc-*` cuando la regla requiere accion mutativa sobre el ticket/spec (ej: persistencia in-flight de DET-29 via `dkc-execute-task`). Opcional si la regla es solo verificable, no mutativa.
4. **Capa 4 (validator)** — schema zod en `commands/lib/schemas/*.ts` + dispatch en `commands/lib/validate.ts` + alias en el wrapper bash `commands/dkc-validate`. Materializa la verificacion programatica del cumplimiento.
5. **Capa 5 (a-hook)** — directive HTML comment (`<!-- enforcement: a-hook command: "./commands/..." -->`) en el step o template que dispara automaticamente el validator al modificar el archivo objetivo. Convierte verificacion manual en gate automatico.
6. **Capa 5b (entry T2 observable)** — entry en `decisions_log` del frontmatter del ticket via `dkc-record-decision --step <step-name>`. Convencion HOR-058 T2: registro observable de que el step se ejecuto, no solo de que el resultado quedo. Hace el cumplimiento auditable post-mortem.

Las capas 1+2 son el contrato declarativo (lo que el LLM debe leer y respetar). Las capas 3-5 son la implementacion ejecutable (lo que el sistema fuerza independiente del LLM). Sin las capas 3-5, el contrato es advisory-only — el LLM puede cumplirlo lexicamente sin cumplirlo operativamente.

## Why

Descubierto via doble audit (HOR-015 estructural + HOR-065/066 operacional):

- **HOR-015 (2026-05-10)** identifico el patron de 3 capas para introducir DETs (RULE-001). Extension al patron actual con capas 4+5+5b basada en HOR-058 (T2 enforcement) + HOR-046 (state SoT + tipado contratos).
- **HOR-065 (2026-05-23)** detecto que 13 de 17 validators referenciados en a-hooks parecian no existir → diagnostico inicial: "gap masivo de implementacion". HOR-066 S0 verifico empiricamente que 16/17 SI existen en `commands/lib/`, pero el wrapper bash hardcodeaba Usage con solo 4 — el gap era de WIRING, no de implementacion.
- **HOR-058 (2026-05-17)** confirmo que sin entry T2 observable en `decisions_log`, el LLM en autopilot tiende a "satisfacer el resultado sin ejecutar el paso interno". El gate de salida verifica el campo (frontmatter, fila tabla) pero no la accion. La capa 5b cierra ese gap.
- **HOR-066 S2 batch (2026-05-23)** verifico empiricamente que el patron de 5 capas FUNCIONA cuando esta completo (caso DET-29 + dkc-execute-task + dkc-verify-gate G1 + a-hook + entries `step:`). El problema no es de diseño — es de COMPLETITUD: introducir DET nueva sin las 5 capas la deja como rule declarativa sin fuerza.

Sintoma sistemico observado: 5 tickets cerrados con drift estructural (HOR-015, HOR-058, HOR-060, HOR-061, HOR-064) — sus specs quedaron `in_progress` mientras el ticket cerro. Sin `StatusCoherence` validator (capa 4) + a-hook (capa 5) ejecutado automatico al `status: closed`, el patron se repite cada vez.

## Where

- **Capa 1**: `prompts/deterministic-rules.md` — agregar la nueva DET con texto normativo RFC 2119 + tabla "Aplica a `work_type`" + "Verification" + "Aplicacion temporal" + "Interaccion con otras DETs"
- **Capa 2**: `prompts/steps/*.md` — buscar steps que invocan o validan el contrato. Agregar referencia explicita en la seccion `## ⚠️ GATES` del step. Si el step tiene un a-hook nuevo (capa 5), declararlo aqui
- **Capa 3**: `commands/dkc-*` — solo si la regla requiere mutacion. Ej: DET-29 -> `dkc-execute-task`, DET-27 -> `dkc-verify-gate G1`. Si la regla es solo verificable (ej: DET-25 cobertura de TCs), saltar esta capa
- **Capa 4**: `commands/lib/schemas/{kind}.ts` (nuevo schema o detector) + dispatch en `commands/lib/validate.ts` + alias en `commands/dkc-validate` Usage. Replicar patron de schemas existentes (zod + funcion `detect{Kind}Violations` si es deteccion cross-file)
- **Capa 5**: HTML comment `<!-- enforcement: a-hook command: "./commands/dkc-validate KIND projects/{project}/.../{file}" trigger: <evento> -->` en el step o template donde aplica
- **Capa 5b**: convencion T2 en el step — invocar `./commands/dkc-record-decision --ticket {TICKET-id} --step <step-name> --choice <valor> --reason "..."` ANTES de avanzar al proximo paso. El validator `StepDecisions` (capa 4 de DET-58) verifica las entries

## When

Aplica a partir de **2026-05-23** (introduccion de esta rule via HOR-066 S3).

**No retroactivo automatico**: DETs existentes (DET-1 a DET-29 al momento de creacion de esta rule) NO requieren completarse las 5 capas como accion correctiva del audit — pero CUALQUIER ticket que las extienda o referencie en su Verification debe verificar empiricamente que las capas estan presentes.

**Si retroactivo opcional**: tickets futuros que descubran que una DET existente tiene capa 4 vacia (validator faltante) PUEDEN agregarlo como follow-up — la decision de hacerlo retroactivo es editorial del dev, no obligacion del audit.

**Aplica obligatoriamente** al introducir DET-30 en adelante. El step `request-close.md` SHOULD bloquear el cierre de tickets que introducen DETs sin verificar las 5 capas.

## Verification

Despues de introducir una DET nueva, verificar empiricamente que las 5 capas estan presentes:

```bash
# Capa 1: declaracion textual existe
grep -c "DET-{N}" prompts/deterministic-rules.md  # >= 1

# Capa 2: referenciada en al menos 1 step
grep -lE "DET-{N}\b" prompts/steps/*.md | wc -l  # >= 1 (excepto DETs cross-cutting)

# Capa 3: comando ejecutable (solo si la regla requiere mutacion)
# Si aplica, verificar que el comando existe:
test -x commands/dkc-{nombre-comando}

# Capa 4: validator existe en lib + alias en wrapper
test -f commands/lib/schemas/{kind}.ts
grep -q "args.kind === '{Kind}'" commands/lib/validate.ts
./commands/dkc-validate 2>&1 | grep -q "{Kind}"

# Capa 5: a-hook declarado en al menos 1 step/template
grep -l "enforcement: a-hook.*{kind}" prompts/steps/*.md templates/records/*.md | wc -l  # >= 1

# Capa 5b: convencion T2 al menos cuando aplica
# Verificar que algun step invoca dkc-record-decision con --step apuntando a esta DET
grep -l "dkc-record-decision.*--step" prompts/steps/*.md | wc -l  # >= 1 (si la DET requiere observabilidad)
```

Si alguna capa esta vacia y la DET la requiere segun su naturaleza (mutativa, verificable, observable), agregar al backlog del ticket que introdujo la DET o crear ticket follow-up explicito.

## Interaction con otras rules y DETs

- **RULE-workflow-det-introduction-001** (HOR-014): version anterior con 3 capas (rule + workflow + step). RULE-009 la **extiende** explicitamente con capas 4 (validator) + 5 (a-hook) + 5b (T2 entry). RULE-001 sigue siendo valida para DETs simples sin enforcement programatico necesario; RULE-009 aplica cuando la DET requiere validacion automatica.
- **DET-27 (HOR-058)**: convencion T2 — toda transicion de estado escribe entry en `decisions_log`. Es la materializacion concreta de la capa 5b
- **DET-29 (HOR-064)**: persistencia in-flight via `dkc-execute-task`. Es el ejemplo canonico de las 5 capas completas — referencia obligatoria al introducir DETs nuevas con enforcement programatico

## Excepciones

DETs que **NO requieren** las 5 capas completas (capas 3-5 opcionales):

- DETs **meramente declarativas** sobre comportamiento del LLM en conversacion (ej: DET-9 handoffs entre agentes — no se valida programaticamente, solo se respeta)
- DETs **cross-cutting universales** que aplican implicitamente a todo el flujo (ej: DET-4 hechos vs inferencias — no hay validator porque no es estructural)
- DETs **transitorias o experimentales** explicitamente marcadas como tales en su "Aplicacion temporal"

En todo otro caso, las 5 capas son obligatorias.
