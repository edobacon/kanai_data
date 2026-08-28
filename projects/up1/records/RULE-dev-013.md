---
id: RULE-dev-013
project: up1
type: rule
module: dev
tags:
  - testing
  - coverage
  - acceptance-criteria
  - gate
  - det-7
  - det-25
  - det-13
  - dredd
---

# Cada criterio de aceptacion tiene test o N/A justificado en la Coverage map, verificado en el gate

## What

En todo ticket de up1 con `work_type` implementable (implement/fix/improvement/refactor) que toque codigo, la tabla **`## Testing > Coverage map`** del ticket debe listar **cada criterio de aceptacion** (AC del request / cada REQ del spec) con:

- uno o mas test cases que lo cubren (con su archivo y su resultado), o
- la marca explicita `N/A` con la razon (por que ese AC no se testea: no observable, cubierto estructuralmente por otro, latente sin fixture, etc.).

Un AC que no aparece en la Coverage map, o que aparece sin test ni `N/A + razon`, es un hueco de cobertura y **bloquea el cierre de la session** que corresponde (no se difiere al close del ticket). La Coverage map se llena **en el momento de la ejecucion** (extiende DET-25), no al final.

Refuerza DET-7 (cada test traza a un REQ/discovery) agregando la direccion inversa que faltaba: **cada REQ/AC traza a >=1 test o a un N/A auditado**. DET-7 garantizaba "no hay tests huerfanos"; esta regla garantiza "no hay ACs sin cubrir".

## Why

En TICKET-117 (UPONE-1479) el request declaro 6 criterios de aceptacion; la ejecucion cubrio 5. El AC "RT sin hijos declarados conserva el comportamiento (sin regresion)" quedo **sin ningun test** y aun asi pasaron el S1.GATE (DET-23), el dual-judge (DET-35) y el spec-judge (DET-38). La causa de fondo no fue una decision explicita de no testearlo: fue que la tabla Coverage map del ticket quedo **vacia** (igual que Test cases y Regression), asi que el artefacto que hubiera mostrado "AC-02 -> 0 tests" nunca existio y nadie lo miro. El hueco lo destapo recien una review posterior (dredd), que ademas al escribir ese test descubrio un bug de casing latente en el core (ver [[rule-core-043]] y su corolario). Un gate que no exige la Coverage map completa no distingue "5 de 6 ACs cubiertos" de "6 de 6".

## Where

- Ticket markdown: seccion `## Testing`, tablas `### Coverage map` y `### Test cases` (que ya existen en el template y hoy se dejan vacias).
- Enforcement: `dkc-verify-gate` (gate de session).
- Aplica a los tickets de up1 (core workspaces + mods). No aplica a `quick`/`query` (sin spec ni ACs formales).

## When

- Al cerrar cada `S{N}.GATE` de una session que toca codigo.
- Tier: `warn-first` en T1/T2 (reporta el AC sin cubrir pero no bloquea), **bloqueante en T3** (regression completa). Un AC marcado `N/A + razon` nunca bloquea.

## Verification

`dkc-verify-gate` parsea los ACs del request/los REQ del spec y los cruza contra la Coverage map del ticket:

- cada AC/REQ debe tener fila con test(s) o `N/A + razon`;
- un AC sin entrada o sin test ni `N/A` -> `warn` (T1/T2) o `fail` (T3).

Mientras el check automatico no exista, el reviewer del gate (DET-23) lo verifica a mano: pega la Coverage map con los 6 ACs y sus tests antes de firmar `continue`.

## Source

- TICKET-117 (UPONE-1479), review dredd 2026-08-03: AC-02 sin test, Coverage map vacia.
- Refuerza DET-7, DET-25, DET-13. Relacionado con [[rule-core-043]].
