---
id: RULE-workflow-draft-scope-fidelity-025
project: horadric
type: rule
module: workflow
level: must
tags:
  - design-draft
  - preview
  - alcance
  - scope
  - det-18
  - det-32
  - confusion-dev
---

# El preview del draft representa SOLO lo que el ticket va a construir

## What

En `design-draft` (DET-18), el `preview.html` (y cualquier artefacto visual del draft) representa **solo el entregable en alcance**. Cada elemento visible — columna, badge, tooltip, texto por item, control, indicador, leyenda — debe cumplir UNA de estas tres:

1. corresponder a un **artifact/REQ del alcance** del ticket, o
2. estar **marcado explicitamente** como fuera de alcance / ilustrativo (rotulo `(ejemplo, no se construye)` o leyenda de contexto), o
3. **no aparecer** en el preview.

**Prohibido dibujar una capacidad que el spec NO incluye como si fuera parte del entregable.** Antes de presentar el draft al dev, barrer el preview: por cada cosa que se ve, ¿existe como REQ/artifact, o esta marcada como ilustrativa? Lo que se ve pero no esta en alcance se resuelve con (a) marcarlo ilustrativo, (b) agregarlo al alcance como REQ, o (c) quitarlo. Nunca dejarlo ambiguo. Todo elemento cuya pertenencia al alcance quede a decision del dev se registra en `intent.md > Open questions`.

## Why

El preview es (a menudo) el unico lugar donde el dev revisa para aprobar el draft (DET-18) y forma su modelo mental de "que voy a recibir". Si el preview dibuja algo que el spec no construye, el dev aprueba entendiendo que esa capacidad viene incluida — y despues no llega. Es una fuente de confusion directa y erosiona la confianza en el draft como contrato.

**Origen (up1 TICKET-120 / UPONE-1539, 2026-08-05):** el preview de la malla modular mostraba, por tarjeta, "requiere: {curso}" (la lista de prerrequisitos por bloque). Esa visualizacion por-tarjeta NO era un REQ del ticket (el alcance era la derivacion de nivel: columnas = niveles). El dev lo detecto al preguntar "¿los bloques muestran sus prereq/coreq dentro de la malla?" y señalo que mostrar en la maqueta cosas fuera de alcance confunde. La ambiguedad se resuelve marcando o reconciliando, nunca dejando el elemento suelto.

## Where

- `prompts/steps/design-draft.md` — seccion "Reglas del markup" del paso 4 (Generar preview HTML). Punto de enforcement.
- Aplica a todo `design-draft` de cualquier proyecto (`scope: global`).

## When

Al generar o iterar el `preview.html` y ANTES de presentar el draft al dev para aprobacion (DET-18). El barrido preview↔alcance es parte del gate de presentacion del draft.

## How to apply

Barrido explicito antes de presentar: listar los elementos visibles del preview y mapearlos 1:1 a REQ/artifact del intent. Los que no mapean: marcar ilustrativo, promover a REQ, o quitar. Dejar constancia de los dudosos en `intent.md > Open questions`.
