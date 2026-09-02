---
id: RULE-workflow-parse-yaml-with-a-yaml-parser-022
project: horadric
type: rule
module: workflow
level: must
tags:
  - yaml
  - frontmatter
  - regex
  - parser
  - espejo
  - normalizacion
  - det-16
---

# El frontmatter se parsea con un parser de YAML, y si hay dos consumidores se comparan corriendolos

## What

Cuando una decision del workflow depende de leer YAML —frontmatter de un ticket, `config.yaml`
de un proyecto— usar un parser de YAML, no expresiones regulares. Y si esa lectura vive en mas
de un consumidor (el comando y el viewer, por ejemplo), la equivalencia se prueba **ejecutando
los dos** sobre la misma matriz, no leyendo el codigo del otro.

Si por alguna restriccion real hay que conservar un camino por regex (un host sin la libreria),
ese camino tiene que **cortar con un error** donde no pueda decidir, en vez de adivinar.

## Why

En HOR-133 el resolver de la politica de delegacion leia el frontmatter con regex. Un gate
adversarial le encontro, en rondas sucesivas y todas reproducidas:

- `delegation: false # en mantenimiento` no apagaba: la comparacion exigia el escalar exacto y
  el comentario quedaba adentro.
- `{ note: "enabled: false" }` apagaba: la busqueda no tenia limite de clave, asi que cualquier
  nota que contuviera el texto desactivaba el canal en silencio.
- El bloque multilinea se cortaba en la proxima linea en blanco, y en un frontmatter sin lineas
  en blanco —o sea, casi todos— se llevaba por delante las claves siguientes.
- Un block scalar (`|`) cuyo contenido incluia `enabled: false` producia un apagado falso, y por
  regex no hay forma de distinguir contenido de clave.

Cada parche cerraba un caso y el siguiente aparecia por otro lado. La causa era una sola: **YAML
no es un lenguaje regular**. Cambiar a `yaml.safe_load` cerro la clase entera de una vez, y de
paso resolvio un item que estaba en el backlog como pre-existente (`other_roles` matcheando como
`roles`, porque con un parser las claves son claves y no subcadenas).

La segunda mitad de la regla salio del mismo ticket, y es la que costo mas caro. Aun con el
parser, el modulo canonico y su espejo en HC seguian divergiendo en la **normalizacion** de
frontmatter mal escrito: un `roles` escalar se promovia a lista solo de un lado; un
`roles: [reviewer, 7]` sobrevivia como entero, como string `'7'` o descartado segun el
consumidor; `budget_tokens: 1.5` se truncaba a `1` de un lado (un techo de costo mil veces mas
chico, sin aviso) y se conservaba del otro; `backend: 42` se coercionaba al string `"42"`.

Cuatro rondas del gate, y en cada una el fix alineaba un lado y se olvidaba del espejo. Lo que
finalmente lo corto no fue otro juez: fue un script que **ejecuta los dos resolvers** sobre la
misma matriz y compara. No depende de que nadie se acuerde de mirar el otro lado.

## Where

- `commands/lib/delegation-policy.py` — resolucion canonica (PyYAML, con fallback que corta)
- `horadric-cube:server/deckard/delegation.ts` — su espejo
- `server/tests/test_delegation_policy.py` y `horadric-cube:server/deckard/delegation.test.ts`
- Cualquier lectura nueva de frontmatter o de `config.yaml` que decida comportamiento

## When

Al escribir o modificar codigo que decide algo leyendo YAML. Y siempre que exista un segundo
consumidor de la misma semantica: ahi la obligacion es DET-16 (propagacion) mas el cross-check
ejecutable.

## How to verify

1. Parser de YAML, no regex. Si hay fallback, que corte donde no pueda decidir.
2. Una matriz que incluya el frontmatter **mal escrito**, no solo el canonico: escalares donde
   se espera lista, tipos equivocados, valores vacios, numeros no enteros.
3. Un script que corra **todos** los consumidores sobre esa matriz y falle si difieren. Comparar
   el estado semantico, no la representacion — dos consumidores pueden expresar el mismo estado
   de formas distintas y estar bien (ver la nota de representacion en `docs/delegation.md`).
