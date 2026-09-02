---
id: BUG-workflow-comandos-raiz-desde-pwd-004
project: horadric
type: bug
module: workflow
status: detected
severity: low
tags:
  - commands
  - deckard-root
  - cwd
  - bash-source
  - convencion
  - backlog-b6
---

# 4 comandos resuelven la raiz desde `pwd` y fallan si no se invocan desde la raiz del repo

## Symptom

```
$ cd commands && ./dkc-lint-lib
ERROR: no existe /Users/edobacon/Workspace/deckard/commands/commands/lib
```

Exit 3. El mismo comando desde la raiz del repo funciona.

## Root cause

`DECKARD_ROOT="${DECKARD_ROOT:-$(pwd)}"`. Si el dev no exporta `DECKARD_ROOT`, la raiz se toma del cwd, asi que cualquier invocacion desde un subdirectorio construye paths mal.

Afectados: **`dkc-validate`, `dkc-execute-task`, `dkc-set-status`, `dkc-reindex`**.

Los que resuelven bien, derivando del path del script: `dkc-lint-scaffold`, `dkc-det-validate`, `dkc-mutate`, `dkc-telemetry`, `dkc-compress-session`, y `dkc-lint-lib` desde HOR-129 S5.

```bash
DECKARD_ROOT="${DECKARD_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
```

## Expected behavior

Un comando `dkc-*` deberia funcionar desde cualquier cwd, resolviendo la raiz del repo desde el path del propio script, con `DECKARD_ROOT` del entorno como override.

## Reproduction

`cd commands && ./dkc-validate Ticket ../projects/horadric/tickets/HOR-129.md`

## Impact

Bajo. Friccion al invocar comandos a mano desde un subdirectorio; el flujo normal de DKC siempre corre desde la raiz del repo, asi que no rompe ninguna automatizacion existente.

## Workaround

Invocar siempre desde la raiz del repo (que es la convencion de facto y lo que hace todo el flujo de DKC), o exportar `DECKARD_ROOT`.

## Notas

Detectado por un **subagente reviewer de Codex** durante el smoke de HOR-129 S5.T1: tenia como scope un solo archivo y encontro el supuesto que el autor del comando no vio, con evidencia de las dos corridas. Se corrigio solo en `dkc-lint-lib` porque era codigo nuevo; los otros 4 quedaron fuera del `execute_scope` de ese ticket (backlog B6).

Prioridad baja: el impacto real es friccion al invocar a mano, no una falla del flujo.
