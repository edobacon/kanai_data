---
id: RULE-frontend-009
project: jormat-evolution
type: rule
module: frontend
level: must
tags:
  - frontend
  - css
  - postcss
  - tailwind
  - build
---

# Nunca incluir la secuencia literal `*/` dentro del cuerpo de un comentario CSS

## What

Un comentario CSS (`/* ... */`) que contenga la secuencia `*/` en su texto (ej. al listar clases como `.btn-*/.card`) cierra el comentario prematuramente. El resto del texto que se queria comentar se parsea como CSS real, y PostCSS/Tailwind falla el build con un error de selector parser ("Unexpected /. Escaping special characters with \ may help").

## Why

El error resultante (fallo de build de PostCSS) no apunta obviamente a un comentario mal formado; el mensaje de selector parser hace pensar en un problema de sintaxis CSS real, no en un comentario cerrado antes de tiempo. Sin conocer este gotcha, el diagnostico toma iteraciones.

## Where

- **Layers**: frontend (`globals.css`, cualquier archivo CSS con comentarios que enumeren clases o patrones).

## When

- Al escribir un comentario CSS que enumere clases, patrones glob o cualquier texto que pueda contener `*/` (ej. `.btn-*`, seguido de otra clase con `/`).

## Verification

- Ningun comentario CSS contiene la secuencia literal `*/` en su cuerpo; reescribir la enumeracion sin esa secuencia (ej. separar con comas o texto en vez de `/`).
- El build (`npm run build`/PostCSS) compila sin el error "Unexpected /" tras el cambio.

## Source

- **Discovered in**: JOR-003, Session #1.
- **Evidence**: L2 (comentario con `.btn-*/.card/.badge` cerraba el comentario en `*/`, build rompia; confirmado error introducido via stash scoped).
