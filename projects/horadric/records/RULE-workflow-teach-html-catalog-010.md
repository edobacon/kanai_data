---
id: RULE-workflow-teach-html-catalog-010
project: horadric
type: rule
module: workflow
level: should
tags:
  - teaching
  - teach-v2
  - html
  - catalog
  - didactic
  - det-21
  - det-22
---

# El catalogo de bloques didacticos del teaching v2 vive en `teach-base.html` y se amplia forward-only

## What

El teaching v2 (formato HTML, DET-21/DET-22) se compone de **bloques didacticos** de un catalogo canonico documentado en `templates/outputs/teach-base.html`. Cada bloque se identifica con `data-dkc-block="{kind}"`.

Catalogo v1 (14 bloques, HOR-081): `tldr`, `callout`, `concept-card`, `flow`, `state-machine`, `case`, `code`, `comparison-table`, `study-qa`, `timeline`, `invariant`, `formula`, `tag`, `two-col-compare` (+ `toc` auxiliar de navegacion).

Reglas del catalogo:
- **Composicion libre**: un teach usa SOLO los bloques que su caso necesita — no todos. No hay bloques obligatorios por tipo de bloque (la obligatoriedad es de cobertura de ejes en prosa, no de bloques especificos).
- **Ampliable forward-only**: agregar un bloque nuevo al catalogo (nueva `<section data-dkc-block="...">` documentada en `teach-base.html`) NO invalida teaches v2 previos. Nunca renombrar ni quitar un `data-dkc-block` ya en uso por teaches existentes.
- **Marcador como contrato**: el atributo `data-dkc-block` es la unidad que el validador HTML-aware (`dkc-validate Teach`) cuenta para verificar cobertura. Un bloque sin el atributo es invisible a la verificacion.

## Why

HOR-081: el dev pidio "libertad de composicion" + un "modelo base con todos los bloques posibles que crece con el tiempo". Sin un hogar canonico del catalogo + regla de ampliacion forward-only, (a) cada teach reinventaria estructura, (b) renombrar/quitar bloques romperia la verificacion de teaches viejos. El `data-dkc-block` reemplaza al fence `dkc:*` del v1 markdown como unidad de cobertura (DEC-LOCAL-03 del spec).

## Where

- `templates/outputs/teach-base.html` — fuente de verdad del catalogo (doc inline por bloque + ground truth visual).
- `prompts/steps/teach-intake.md`, `prompts/steps/teach-close.md` — autoran HTML eligiendo bloques del catalogo.
- `commands/` validador `dkc-validate Teach` — cuenta `data-dkc-block` (HTML-aware).
- Layer: workflow (DKC meta) + viewer (HC renderiza el HTML en iframe).

## When

- Aplica a teaches v2 (HTML) producidos desde HOR-081 (2026-05-29) en adelante.
- NO aplica a teaches v1 (markdown con bloques `dkc:*`) — esos siguen su verificacion por fences.
- Al agregar un bloque al catalogo: documentarlo en `teach-base.html` con su `data-dkc-block` + comentario de "cuando usar". Forward-only (no migrar teaches previos).

## Verification

- `grep 'data-dkc-block' templates/outputs/teach-base.html` retorna los 14 kinds del catalogo.
- Un teach v2 valido tiene >= 1 `data-dkc-block`; `dkc-validate Teach` sobre HTML cuenta los markers.
- Quitar/renombrar un `data-dkc-block` del catalogo: revisar que ningun teach v2 existente lo use antes (forward-compat).

## Source

HOR-081 S1 — SPEC-teach-v2-html-81 (DEC-LOCAL-03, DEC-LOCAL-04, OQ4). Relacionada: [[RULE-workflow-enforcement-pattern-009]], [[RULE-viewer-assets-context-001]].
