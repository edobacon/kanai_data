---
id: RULE-workflow-sentinel-producer-consumer-contract-020
project: horadric
type: rule
module: workflow
level: must
tags:
  - flags
  - frontmatter
  - centinela
  - trigger
  - contrato
  - det-16
  - delegation
  - teach-policy
  - autopilot
---

# Un valor centinela solo existe si el productor y el consumidor coinciden, y eso se prueba con la matriz de estados

## What

Cuando un flag durable del frontmatter usa un valor centinela (`false` para apagar, `null` para
"no declarado", `skip` para saltar), el centinela **no es el valor: es el acuerdo** entre quien
lo escribe y quien lo lee. Dos obligaciones, las dos MUST:

1. **Enumerar los estados y asignarles significados disjuntos.** Como minimo hay tres —
   declarado-on, apagado-explicito, no-declarado — y confundir los dos ultimos es el error
   tipico. "Ausente" y "apagado" se sienten iguales y no lo son: si el flag se hereda de un
   nivel superior (config de proyecto, default del template), solo el apagado explicito puede
   cortar esa herencia.
2. **Verificar con la MATRIZ, no con el caso feliz.** La prueba no es "el trigger escribe algo
   y el resolver lee algo". Es: todas las formas plausibles del valor, cruzadas con todos los
   estados del nivel que se hereda. Cada celda con su resultado esperado escrito antes de mirar
   el codigo.

   Y la matriz tiene que mirar **el objeto entero, no solo el estado**. Los tests del fix
   comparan lo que el fix cambia (tipicamente el `source`); los de preservacion miran campos que
   los del fix ni tocan. En HOR-133 fue un test de defaults el que descubrio que el comando
   omitia la clave `backend` mientras el espejo la defaulteaba — un drift que la matriz de
   estados no podia ver porque solo comparaba `source`. Si dos consumidores coinciden en el
   estado y disienten en los valores, el gate cree que delegan a lo mismo y estan delegando
   distinto.

Y el corolario que hace falta decir aparte: **el default del template participa de la matriz.**
Si el template declara el flag, ese valor lo hereda cada artefacto nuevo. Elegir como centinela
de apagado el mismo valor que el template usa como default significa que todo lo nuevo nace
apagando el nivel superior.

## Why

En HOR-133 el trigger conversacional `delegacion off` escribia `delegation: null` y el resolver
no reconocia `null` como declaracion: caia al bloque del proyecto y seguia delegando. El dev
pedia apagar, el flag quedaba escrito, y el canal seguia gastando cuota de un backend externo.
El sintoma se lee como "el trigger no hizo nada", que es el peor: no hay error, no hay log, hay
una promesa incumplida en silencio.

La matriz completa mostro que el agujero era mas ancho de lo reportado: **ninguna** de las
cuatro formas plausibles de apagar (`null`, `false`, `{}`, `{ enabled: false }`) funcionaba.
Cada una fallaba por su cuenta, y ninguna prueba del caso feliz las habria encontrado, porque
el caso feliz — el bloque declarado — siempre anduvo bien.

El corolario del template salio de una colision al disenar el fix: la peticion original pedia
dos cosas (que el apagado apague, y que el flag sea descubrible desde el template). Tomadas por
separado las dos son obvias; juntas se contradicen si el centinela de apagado es `null`, porque
el template iba a declarar `delegation: null` como default y cada ticket nuevo habria matado el
bloque por proyecto. La contradiccion no aparece leyendo ninguno de los dos requerimientos: solo
aparece cruzandolos en la matriz.

Latente no es benigno. El bug de HOR-133 no habia dañado nada solo porque ningun proyecto tenia
el bloque activo todavia. El dia que alguno lo activara, sus tickets quedaban sin opt-out.

## Where

- `commands/lib/delegation-policy.py` — resolucion canonica del flag `delegation`
- `horadric-cube:server/deckard/delegation.ts` — su espejo en el viewer
- `server/tests/test_delegation_policy.py` y `horadric-cube:server/deckard/delegation.test.ts` —
  la misma matriz con los mismos nombres de caso, para que divergir rompa una de las dos
- `templates/records/ticket.md` — donde vive el default que participa de la matriz
- `prompts/steps/request-intake.md` seccion 0 — los triggers que escriben los flags durables
- Aplica igual a `teach_policy` (`auto` / `skip`), a `autopilot` (`false` / `true` / `strict` /
  `super`) y a cualquier flag durable que se agregue

## When

Al introducir o modificar un flag durable del frontmatter que un trigger conversacional escribe
y un resolver lee. Y al agregar un consumidor nuevo de un flag que ya existe: ahi la obligacion
es DET-16 (propagacion) mas esta — el consumidor nuevo tiene que resolver la matriz identica,
verificado por su propia suite, no por lectura del codigo del otro.

## How to verify

1. Escribir la matriz **antes** que el codigo: formas del valor x estados del nivel heredado,
   con el resultado esperado por celda.
2. Correrla contra el resolver **actual** y guardar el baseline. Las celdas que cambian son el
   fix; las que no, la regresion.
3. Incluir el default del template como una fila.
4. Replicarla en cada consumidor con los mismos nombres de caso.
