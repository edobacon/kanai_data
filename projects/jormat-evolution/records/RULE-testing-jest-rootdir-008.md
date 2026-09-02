---
id: RULE-testing-jest-rootdir-008
project: jormat-evolution
type: rule
module: testing
level: must
tags:
  - testing
  - jest
  - backend
  - monorepo
  - rootdir
---

# `jest` del backend debe correrse desde `backend/jormat-api`, no desde la raiz del monorepo

## What

`jest` (config con `rootDir=src` local a `backend/jormat-api`) debe invocarse desde ese directorio. Correrlo desde la raiz del monorepo logico produce `0 total` (ningun test encontrado) — un **falso FAIL/vacio**, no un error explicito que apunte a la causa.

## Why

El resultado `0 total` desde la raiz no distingue entre "no hay tests" y "jest no encontro su config/rootDir"; sin saber esta convencion, se puede interpretar como que el backend no tiene tests, o perder tiempo diagnosticando un problema de configuracion inexistente.

## Where

- **Layers**: backend (`backend/jormat-api`, comando `jest`).

## When

- Al correr `jest` del backend manualmente o desde un script/tooling que no cambia de directorio primero.

## Verification

- `jest` se invoca con cwd en `backend/jormat-api` (o con `--rootDir`/`--config` apuntando explicitamente ahi si se corre desde otro directorio).
- Un resultado `0 total` en el backend es sospechoso por default: verificar el cwd antes de asumir ausencia de tests.

## Source

- **Discovered in**: JOR-057, Session #1.
- **Evidence**: L2 (jest desde la raiz del monorepo da `0 total`, falso FAIL; debe correrse desde `backend/jormat-api`).
