---
id: RULE-workflow-explicit-git-add-in-scope-019
project: horadric
type: rule
module: workflow
level: must
tags:
  - det-27
  - det-30
  - execute-scope
  - git
  - commits
  - autopilot
---

# Con `execute_scope` declarado, los `git add` van por path explicito

## What

En un ticket con `execute_scope` en el frontmatter, los commits de session se arman con **paths explicitos**, nunca con `git add <directorio>` ni `git add -A`.

Y el check de paths prohibidos se corre en **cada gate**, no solo en la regresion final.

## Why

Caso real: HOR-130 declaraba `server/src/deckard_cain/dets_catalog.py` explicitamente **fuera** de alcance. En S8 un `git add server` barrio ese archivo, que estaba modificado sin commitear en el working tree por **otra sesion** (el recorte de condensados del backlog de HOR-129). El contenido era ajeno y legitimo, pero quedo commiteado bajo el subject de este ticket.

El check commit-por-commit lo detecto **5 sessions despues**, en la regresion final. En ese punto la remediacion ya no es gratis: hay que elegir entre dejarlo con una nota, sacarlo con un commit de correccion, o reescribir historia — y ninguna de las tres es decision del autopilot.

El riesgo es mayor en autopilot: nadie mira el `git status` antes de cada commit, y un working tree compartido con otra sesion es lo normal cuando se trabaja en el mismo repo desde dos lados.

## Where

- Los commits de cada `S{N}.GATE` (DET-27)
- `frontmatter.execute_scope` del ticket (DET-30 REQ-02/03)

## When

En todo ticket con `execute_scope` declarado, y especialmente con `autopilot` in `{strict, true, super}`.

## Verificacion

Antes de commitear:

```bash
git status --short                      # mirar que hay sucio que no sea mio
git add <path1> <path2>                 # explicito, no el directorio
```

Y en cada gate, no solo al final:

```bash
for c in $(git log --format=%H <base>..HEAD); do git show --name-only --format="" $c; done \
  | sort -u | grep -E "<paths prohibidos del execute_scope>"
```
