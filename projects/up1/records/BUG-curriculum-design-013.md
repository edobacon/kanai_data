---
id: BUG-curriculum-design-013
project: up1
type: bug
module: curriculum-design
tags:
  - ux
  - prereqs
  - missingprereqitem
  - malla
  - k-de-n
  - mensaje
  - or-container
  - UPONE-1378
---

# El modal "Prerrequisitos faltantes" resume a nivel del contenedor OR y no itemiza el detalle

## Symptom

Al bloquear un movimiento en la malla por prereqs faltantes, el modal muestra el resumen a nivel del contenedor OR (ej. "Cualquiera de las vías — 0 de N vías") y NO itemiza el detalle interno: cuántos cursos de K-de-N (X de K), cuántos créditos (X de N), ni qué cursos concretos faltan. Detectado en el smoke E2E S19 (pool Electivo K=2 + MetricThreshold Créditos>=60 en QUI104).

## Expected behavior

El mensaje debería descender al nodo con la falla (K-de-N, créditos, curso concreto) para que el usuario sepa qué requisito específico le falta, en vez de resumir a nivel de la vía.

## Root cause

El editor envuelve todo requisito en un `Group(OR)` de vía única, así que el `MissingPrereqItem` se reporta en el OR más superficial. La **evaluación** es correcta (el evaluador SÍ considera K-de-N y créditos, confirmado en el smoke); es solo el **detalle del mensaje** el que se pierde.

## Impact

UX: el usuario no sabe qué requisito específico le falta. No afecta la corrección del bloqueo. Mejora posible: descender el `MissingPrereqItem` al nodo con la falla, o no envolver en OR cuando hay una sola vía. Documentado en `uplanner/specs/up1/sp7/UPONE-1378-smoke-test-replication.md` (Caso 5 + Pendiente).
