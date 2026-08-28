---
id: RULE-curriculum-design-041
project: up1
type: rule
module: curriculum-design
tags:
  - position
  - convention
  - curriculummesh
  - compositesectiontree
  - 0-based
  - 1-based
  - cross-module
---

# La convención de `position` está bifurcada entre componentes: normalizar explícito al cruzar módulos

## What

La convención de `position` NO es uniforme entre componentes de curriculum-design:
- `computePositionUpdates` (`CompositeSectionTree`) es **1-based**.
- `nextPosition` / `groupByPeriod` (`CurriculumMesh`) son **0-based** (`recalcPeriodPosition` sigue esta convención local).

Cualquier código que consuma o cruce ambos módulos MUST normalizar la base de `position` explícitamente; NO asumir una convención compartida.

## Why

Detectado en S4.T1 de TICKET-088. La divergencia es silenciosa (ambos "funcionan" en su módulo) y solo se rompe cuando un consumidor cruza los dos, con off-by-one difícil de rastrear.

## Where

`CompositeSectionTree` (`computePositionUpdates`), `CurriculumMesh` (`nextPosition`, `groupByPeriod`, `recalcPeriodPosition`), y cualquier composable/consumidor que combine posiciones de ambos.

## When

Al escribir o revisar código que ordene/reordene entidades cruzando estos dos componentes.
