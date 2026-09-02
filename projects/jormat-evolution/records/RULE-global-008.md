---
id: RULE-global-008
project: jormat-evolution
type: rule
module: global
level: must
tags:
  - git
  - branching
  - topologia
  - workflow
---

# `develop` en jormat-evolution-mono esta casi vacio: el trabajo vive encadenado en la rama del ultimo ticket

## What

En `jormat-evolution-mono`, la rama `develop` esta casi vacia; el trabajo acumulado del proyecto vive en la rama del **ultimo ticket** trabajado (ej. JOR-036 con 185 commits). Las ramas de ticket se **encadenan** entre si (cada ticket nuevo branchea desde la rama del ticket anterior), no se mergean a `develop` en cada cierre. Branchear desde `develop` para un ticket nuevo da un arbol de trabajo **incompleto** (sin los componentes/cambios acumulados de tickets previos).

## Why

Es contraintuitivo respecto a un flujo git estandar (donde `develop` deberia ser la rama integradora). Un dev o agente que no conozca esta topologia y branchee desde `develop` "por convencion" arranca un ticket sobre una base incompleta, sin darse cuenta hasta que faltan componentes o comportamiento que otros tickets ya habian agregado.

## Where

- **Layers**: control de versiones (todo el monorepo `jormat-evolution-mono`).

## When

- Al iniciar cualquier ticket nuevo: verificar cual es la rama activa/mas reciente del trabajo acumulado (no asumir `develop`) antes de branchear.

## Verification

- `git log --oneline develop` muestra pocos commits (rama casi vacia) comparado con la rama del ultimo ticket cerrado.
- Antes de branchear para un ticket nuevo, confirmar con el dev o con el historial cual es la rama base correcta.

## Source

- **Discovered in**: JOR-037, Session #1.
- **Evidence**: L1 (branchear desde develop dio arbol sin componentes; el trabajo vive en la rama de JOR-036 con 185 commits, encadenada).
