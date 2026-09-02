---
id: RULE-workflow-heading-anchored-markdown-edits-024
project: horadric
type: rule
module: workflow
level: must
tags:
  - markdown
  - edicion
  - parser
  - anclaje
  - heading
  - corrupcion
  - tooling
---

# Un heading se ancla a principio de linea; buscarlo como texto encuentra su mencion, no su seccion

## What

Al delimitar una seccion de markdown para reemplazarla programaticamente, la busqueda del heading
MUST anclarse a principio de linea:

```python
re.search(r'^## Heading\s*$', texto, re.MULTILINE)   # si
texto.index('## Heading')                             # no
```

Lo mismo para el cierre de la seccion (`^## `), para el frontmatter (`\A---\n(.*?)\n---$` con
`MULTILINE`, no `split('---', 2)`) y para cualquier delimitador estructural.

El principio detras: **un delimitador estructural y su mencion en prosa son la misma cadena.** Solo
el anclaje los distingue. Un patron que no ancla no busca la estructura, busca el texto — y en un
corpus donde los documentos hablan de su propia estructura, la mencion casi siempre aparece antes.

## Why

En HOR-134 dos ediciones distintas se rompieron por esto, las dos en el mismo dia:

1. `t.index('## Teaching — Intake')` para delimitar una seccion. El Request del propio ticket cita
   `` `## Teaching — Intake` `` entre backticks dentro de una frase, cientos de lineas mas arriba.
   El splice tomo esa posicion y **duplico el cuerpo entero del ticket**: 875 lineas donde habia
   582. No fallo nada — el archivo seguia siendo markdown valido y el validador de schema pasaba.
2. `text.split('---', 2)` para separar el frontmatter. HOR-120 y JOR-051 tienen `---` dentro del
   texto de un `reason:` del `decisions_log`, asi que el split truncaba el frontmatter a la mitad
   y el YAML quedaba invalido. El sintoma fue que **4 secciones desaparecian del corpus medido**,
   sin error ni warning: el `except yaml.YAMLError` devolvia `{}` y el ticket simplemente no
   contaba.

Los dos son el mismo error y el mismo modo de falla: **corrupcion silenciosa**. Ninguno tira
excepcion, ninguno deja el archivo obviamente roto, y los dos se detectan recien cuando alguien
cuenta algo y el numero no cierra.

Y el detalle que lo vuelve traicionero en DKC: los tickets, specs y prompts de este sistema
**hablan de la estructura de los tickets, specs y prompts**. Un ticket sobre la seccion Teaching
nombra la seccion Teaching. Un prompt que enseña a escribir `## Sessions` escribe `## Sessions`.
La densidad de menciones es alta por diseño, asi que la probabilidad de que un patron sin anclar
encuentre la mencion primero no es marginal: es lo esperable.

## Where

- Cualquier script que edite `projects/**/*.md` — steps, migradores, `commands/lib/**`
- `commands/lib/teach_skip_forms.py` — `split_frontmatter` y `section_bounds` son la version correcta
- Aplica igual a las ediciones que hace el LLM con Edit/Write cuando construye el `old_string`
  desde una busqueda de texto en vez de un bloque literal unico

## When

Al escribir cualquier codigo que localice una seccion, un heading, un delimitador de frontmatter o
un marcador estructural dentro de un markdown. Y al revisar codigo ajeno que lo haga: es un bug
latente aunque hoy funcione, porque depende de que ningun documento del corpus mencione la
estructura antes de tenerla.

## How to verify

1. Grep del tooling por `.index('#`, `.split('---'`, `.find('##` — cada hit es sospechoso.
2. Test con un fixture cuyo cuerpo **mencione** el delimitador antes de usarlo: un ticket cuyo
   Request cite `` `## Teaching — Intake` `` y ademas tenga la seccion real. Un patron sin anclar
   falla; uno anclado pasa.
3. Despues de una edicion masiva, contar: lineas, headings unicos, y registros medidos antes y
   despues. La corrupcion silenciosa se ve en los conteos, no en los errores.
