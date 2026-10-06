---
id: taomangalam-refs-decision-no-son-ids-internos
project: taomangalam
type: rule
level: should
tags:
  - comentarios
  - decisiones
  - limpieza-comentarios
---

En este repo, los identificadores DEC-*/HU-*/REQ-* que aparecen en comentarios son referencias a documentos del propio repositorio (docs/product/decisiones/DEC-*.md, docs/backlog/*.md), NO artefactos internos de Kanai. A diferencia de DET-/KANAI-/TICKET-/RULE-<slug>, no deben borrarse en una limpieza de comentarios: hacerlo corta el vínculo código→decisión y deja el archivo inconsistente con el resto del repo, que sí conserva esas referencias.
