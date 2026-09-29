---
id: RULE-mcp-field-options-fk-cascada-UPONE-1783
project: up1
type: rule
module: mcp
level: must
tags:
  - UPONE-1783
  - sp11
  - field-options
  - fk
---

Antes, get_field_options comparaba query solo contra los primeros 50 registros del objeto relacionado, y un catalogo grande respondia "no encontrado" para registros existentes. Ahora, con query, prueba en cascada: (1) CONTAINS en el servidor sobre el campo de label del objeto relacionado; (2) el mismo filtro sin acentos, porque el CONTAINS de object-manager (ILIKE en Postgres) no distingue mayusculas pero si acentos; (3) un scan paginado del catalogo (500 filas por llamada, hasta 3000) comparado en memoria con el normalizador sin acentos. Listar sin query no cambia.

sourceRef: baa548a (CONTAINS en servidor), 4dd8224 (reintento sin acentos y scan acotado)
