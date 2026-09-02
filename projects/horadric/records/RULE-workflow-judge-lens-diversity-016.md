---
id: RULE-workflow-judge-lens-diversity-016
project: horadric
type: rule
module: workflow
level: should
tags:
  - det-35
  - dual-judge
  - review
  - delegation
  - quality-gate
---

# En el dual-judge, dos lentes distintas rinden mas que dos jueces iguales

## What

Cuando el loop dual-judge de DET-35 corre con dos jueces, darle a cada uno una **lente declarada distinta** (correctitud / contencion-seguridad / drift-consumidores / paridad) en vez del mismo prompt duplicado. Y cuando el host lo permite, correr al menos uno en **otra familia de modelo**.

Medido en HOR-130, tres gates seguidos:

| Gate | Lente A | Lente B | Hallazgos |
|------|---------|---------|-----------|
| S7 | correctitud | contencion/seguridad | 4 reales, **disjuntos**: A vio el archivo-ya-sucio y el schema recortado, B vio los gitignoreados y el workspace sin git |
| S8 | paridad/correctitud | drift/consumidores | A aprobo, B encontro que el manifest podia faltar y no habia manejo de error |
| S11 | routing | — | 2 reales: match por substring y bypass del trigger explicito |
| S13 | registro (los records, no el codigo) | — | 3 reales: coverage map en `NOT COVERED` con los TCs en pass, un TC en pass cuya evidencia arrastraba un "Falta" ya entregado, y una suma mal hecha repetida en 3 lugares |

Ninguno de esos 6 defectos los habia visto el autor del codigo. **El peor de todos estaba escrito como feature en un comentario** ("no lo culpa de lo que ya estaba sucio"), que es el mejor lugar donde se esconde un bug: si el comentario justifica el comportamiento, nadie lo cuestiona.

## Why

Dos jueces con el mismo prompt y el mismo proveedor comparten puntos ciegos y tienden a converger en el mismo veredicto, lo que hace que la coincidencia signifique menos de lo que parece. La diversidad de lente reparte la superficie de revision; la diversidad de proveedor reparte el sesgo del modelo.

Consecuencia practica para la regla de convergencia de DET-35: si los hallazgos de A y B son **disjuntos**, exigir que ambos coincidan para confirmar deja pasar defectos reales. Con lentes distintas conviene verificar cada hallazgo **por reproduccion** en vez de por votacion.

### La lente `registro` (agregada 2026-08-01)

Una lente que no es obvia y que rindio tanto como las de codigo: **revisar los records del ticket como documentos**, no el codigo que describen. El autor no la aplica porque cree que ya escribio bien lo que escribio, y los defectos que aparecen ahi son de coherencia interna: tablas que quedaron desactualizadas respecto de las filas de abajo, textos de evidencia que arrastran un "falta X" que una session posterior ya entrego, cuentas que no suman.

Prompt que la activa: pedirle al juez que lea **solo** los records y responda por coherencia entre ellos, claims sin respaldo, huecos de traza REQ-TC, y si el ticket declara `pass` algo que su propia evidencia no sostiene. Costo medido: 146s y 445k input tokens sobre 2 tickets.

## Where

- `prompts/steps/request-execute/session-gate.md`, seccion del loop dual-judge
- `commands/dkc-delegate` (para correr un juez en otro proveedor)
- `prompts/deterministic-rules.md#det-35` (contrato del loop)

## When

En gates T2/T3 que disparan el loop dual-judge, y en cualquier review de codigo propio que uno acaba de escribir.

## Verificacion

La entry `dual-judge` del `decisions_log` registra el resultado del loop. Los hallazgos y su reproduccion quedan en el bloque de validacion del tier de la session.
