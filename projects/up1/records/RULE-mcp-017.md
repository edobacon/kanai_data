---
id: RULE-mcp-017
project: up1
type: rule
module: mcp
tags:
  - mcp
  - state-machine
  - recordtype
  - guard
  - mutation
---

# Cambios de estado con guard server-side van por la mutation tipada del RecordType, nunca por el update genérico

## What

Cuando un cambio de estado tiene un guard que debe correr en el servidor (ej. `assertNoActiveDependentsOnRevert`), la tool MUST rutear por la mutation TIPADA del RecordType (`update<Objeto>WithRecordType`) y NO por el update genérico. El campo de estado (`status`) pasa a ser readonly en la tool de update genérico del objeto.

## Why

`cd_transition_curriculum` invoca `updateCurriculumWithRecordType`, no el update genérico, para que el guard `assertNoActiveDependentsOnRevert` corra server-side (el pre-chequeo client-side es solo un aviso semántico; el server es la autoridad final). Replica el patrón ya usado para Program (UPONE-1381). Sin decision registrada aún para este replicado; si se crea, enlazar desde aquí.

## Where

- `src/mods/curriculum-design/curriculum-write.ts` (comentario línea 37, mutation `updateCurriculumWithRecordType` línea 42 y 324; `cd_transition_curriculum`/`cd_list_curriculum_transitions`)

## When

Al implementar o revisar cualquier tool que transicione el estado de un objeto con máquina de estados server-side (Curriculum, Program, y futuros).
