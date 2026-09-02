---
id: RULE-codex-sandbox-safe-runtime-004
project: horadric
type: rule
module: codex
level: must
tags:
  - codex
  - sandbox
  - tsx
  - node
  - ipc
  - seatbelt
  - commands
  - host-integration
---

# Los comandos de DKC corren con `node` plano: nada que abra sockets IPC sobrevive al sandbox

## What

Los wrappers de `commands/dkc-*` que ejecutan TypeScript usan **`node` directo sobre los fuentes `.ts`**, sin `tsx`, sin paso de build y sin `dist/`.

Motivo: el seatbelt de Codex bloquea `listen()` sobre unix sockets, y `npx tsx` abre un pipe IPC en `$TMPDIR`. El sintoma es `Error: listen EPERM ... /tsx-501/*.pipe`. No es un problema de PATH ni de permisos de escritura: escribir archivos en `$TMPDIR` funciona.

Correr con `node` exige **3 invariantes** en `commands/lib/`, que `./commands/dkc-lint-lib` verifica:

1. Los imports relativos terminan en **`.ts`** (Node no mapea `.js` a `.ts` como hace tsx).
2. Los named imports que son tipos llevan el marcador **`type`** (Node borra tipos pero no adivina cuales lo son).
3. **Cero sintaxis no borrable**: `enum`, `namespace`, decoradores, parameter properties.

**Una violacion sigue funcionando con `tsx` y falla solo con `node`.** Por eso el lint no es opcional: sin el, el drift es invisible hasta que alguien corre el comando dentro de un sandbox.

Regla derivada para comandos nuevos: **evitar heredocs**. Un heredoc necesita crear un temp file y el sandbox read-only lo rechaza con `cannot create temp file for here document`. Poner el cuerpo en un archivo `.py`/`.sh` propio.

## Why

Seis comandos (`dkc-validate`, `dkc-record-decision`, `dkc-resolve-kb`, `dkc-write`, `dkc-get-section`, `dkc-doctor`) no podian ejecutarse dentro de Codex, y son justo los de validacion y registro de decisiones que cada gate necesita. Sin ellos, una skill de DKC en Codex no puede cerrar un gate.

Se eligio `node` plano sobre compilar a `dist/` porque **no deja artefacto que sincronizar**: no hay build reproducible que auditar, ni gate de drift, ni `dist/` ensuciando diffs. La paridad se verifico con 187 pares (17 kinds x 11 records) corridos con ambos runtimes: 0 divergencias. Y `tsx` sigue funcionando con los mismos fuentes, asi que el cambio es retrocompatible.

## Where

- `commands/lib/**/*.ts`
- Los 6 wrappers de `commands/dkc-*` que invocan `node`
- `commands/dkc-lint-lib` y `commands/lib/lint-lib.py`

## When

Al agregar o modificar codigo en `commands/lib/`, al crear un comando nuevo, y al diagnosticar `listen EPERM` o `cannot create temp file`.

## Verificacion

```bash
./commands/dkc-lint-lib
codex sandbox macos -- ./commands/dkc-validate Ticket projects/horadric/tickets/HOR-129.md
```
