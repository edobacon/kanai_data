---
id: BUG-workflow-auto-commit-sin-pathspec-006
project: horadric
type: bug
module: workflow
status: fixed
severity: medium
tags:
  - git
  - auto-commit
  - concurrencia
  - sesiones-paralelas
  - atribucion
  - backlog-b6
---

# `auto_commit` se llevaba todo el indice, no solo los archivos que le pasaban

## Symptom

Un commit generado por una tool de DKC incluye archivos que no tienen nada que ver con el ticket que dice el mensaje.

Caso real, HOR-131:

```
$ git show --stat 0a319cf
0a319cf dkc: learn L12 in HOR-131

 projects/horadric/tickets/HOR-132.md | 10 ++++++++++
```

El commit dice "learn L12 in HOR-131" y lo unico que contiene son diez lineas de **HOR-132**, un ticket de otra sesion que estaba corriendo en paralelo sobre el mismo repo.

Nada se pierde ni se corrompe: el contenido ajeno queda commiteado, no borrado. Lo que se rompe es la **atribucion**, y con ella cualquier cosa que dependa de ella — el diff de cierre de HOR-131 salio contaminado y lo detecto el reviewer de cierre, no el dev.

## Expected behavior

`auto_commit(root, files, message)` commitea **exactamente** `files` y nada mas. Lo que otra sesion, u otro flujo de la misma, tenga en el indice queda como estaba: staged y sin commitear, para que su dueno lo commitee cuando corresponda.

Es la promesa que el docstring del modulo ya hacia — *"Commitea archivos especificos al repo de Deckard"* — y que el codigo no cumplia.

## Root cause

`server/src/deckard_cain/core/git.py`. La funcion hacia dos llamadas:

```python
subprocess.run(["git", "add", *relative], ...)          # correcto: solo lo pedido
subprocess.run(["git", "commit", "-m", f"dkc: {message}"], ...)   # <- sin pathspec
```

El `git add` esta bien: stagea exactamente los archivos que recibio. El problema es el `commit`: **un `git commit` sin pathspec commitea todo lo que este en el indice**, no solo lo que la llamada anterior stageo.

Con una sola sesion trabajando el repo el bug es invisible, porque el indice suele estar limpio entre operaciones. Aparece cuando hay dos: basta con que la otra sesion tenga algo en `git add` — cosa que su propio flujo hace todo el tiempo — para que la primera tool de DKC que commitee se lo lleve puesto.

## Reproduction

```bash
git init /tmp/r && cd /tmp/r && git commit -q --allow-empty -m init
echo "de otra sesion" > ajeno.md && git add ajeno.md    # la otra sesion stagea lo suyo
echo "mi learn" > mio.md
# invocar auto_commit(root, [mio.md], "learn L1")
git show --name-only --pretty=format: HEAD
# antes del fix: ajeno.md + mio.md
# despues:       solo mio.md
```

## Fix

Pathspec explicito en el commit:

```python
subprocess.run(["git", "commit", "-m", f"dkc: {message}", "--", *relative], ...)
```

El `git add` se mantiene porque sigue haciendo falta para archivos **untracked**: `git commit -- <path>` sobre un archivo que git no conoce falla con "pathspec did not match".

Cubierto por `server/tests/test_auto_commit_scope.py`, seis casos sobre un repo git real y temporal:

- no arrastra un archivo ajeno que otra sesion dejo staged,
- no arrastra modificaciones staged de un archivo **ya trackeado** (que es la forma exacta del incidente),
- sigue commiteando lo que si le piden, uno o varios archivos,
- sigue commiteando modificaciones de archivos trackeados,
- descarta paths fuera del root,
- devuelve `False` sin romper cuando no hay nada que commitear, que es el contrato "git es nice-to-have" del modulo.

Los dos primeros fallan si se revierte el fix. Verificado.

## Impacto

Afecta a **todas** las tools que llaman `auto_commit`: `dkc_append_learn_to_ticket`, `dkc_promote_learn`, `dkc_discard_learn`, `dkc_create_record`, `dkc_mark_superseded`, `dkc_append_session_log` y `dkc_update_status`. O sea, cualquier operacion de registro de DKC podia arrastrar trabajo ajeno mientras hubiera otra sesion activa.

## Workaround (ya no hace falta)

Antes del fix: no correr dos sesiones de DKC sobre el mismo repo, o mantener el indice limpio en la sesion que no esta commiteando. Ninguna de las dos es realista — la concurrencia es justamente el escenario donde DKC quiere ser util.

## Related

- Nacio como item B6 del backlog de HOR-131, detectado al armar el diff de cierre.
- [[RULE-workflow-harness-evidence-vs-self-report-022]] — el bug lo encontro un reviewer aislado revisando el handoff, no el ejecutor.
