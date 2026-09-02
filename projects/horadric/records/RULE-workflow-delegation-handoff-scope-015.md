---
id: RULE-workflow-delegation-handoff-scope-015
project: horadric
type: rule
module: workflow
level: should
tags:
  - delegation
  - cost
  - handoff
  - tiers
  - budget
  - det-35
---

# El costo de una delegacion lo decide el alcance del handoff, no el tier

## What

Al delegar un rol a un backend externo, **acotar el handoff** (que archivos mirar, que pregunta responder) antes de pensar en bajar el tier. Un handoff sin limites hace que el delegado explore todo el KB del proyecto.

Medido en HOR-130 S3 con la **misma tarea** de review:

| Alcance del handoff | Input tokens | Tiempo |
|---------------------|--------------|--------|
| sin acotar | 903k | 214s |
| acotado a un archivo y 3 preguntas concretas | 262k | 51s |
| sin lectura de archivos | 28k | 9s |

Un factor de 3.4x entre acotar y no acotar, con el mismo modelo. El tier no explica esa diferencia.

Corolario para el tope de costo: capear tokens sin acotar el handoff trata el sintoma. El techo (`budget_tokens` del bloque `delegation`) existe como red, no como estrategia.

## Why

El `usage` que el stream reporta se puede acumular, asi que el gasto es medible. Lo que no es obvio es de que depende: la intuicion dice "modelo mas grande, mas caro", y la medicion dice que el driver es cuanto contexto se le deja juntar al delegado.

Ademas hay un efecto de calidad, no solo de costo: un juez con alcance acotado a un archivo y preguntas concretas devolvio hallazgos reproducibles; el mismo rol sin acotar devolvio un `approve` generico despues de leer 50 archivos.

## Where

- `commands/dkc-delegate` (el flag `--prompt` y el bloque de scope del handoff)
- `projects/{project}/config.yaml`, bloque `delegation.budget_tokens`
- `docs/delegation.md`, seccion de costo

## When

Al escribir el prompt de una delegacion, al configurar el techo de un proyecto, y al ver una delegacion que tardo mas de un minuto.

## Verificacion

El `usage` de cada delegacion queda en la entry `agent-invocation` del `decisions_log`. Comparar dos corridas del mismo rol con distinto alcance de handoff.
