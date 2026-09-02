---
id: RULE-api-002
project: jormat-evolution
type: rule
module: api
level: should
tags:
  - api
  - pagination
  - kpi
  - envelope
  - contrato
  - endpoint-design
---

# Tablas con KPIs no derivan de una pagina paginada; endpoints compartidos por tabla y otros consumers no se convierten a envelope sin separarlos

## What

Dos convenciones de diseno de endpoint, ambas detectadas en JOR-068 (Items):

1. **KPIs/facets sobre el dataset completo**: cuando una tabla muestra KPIs o facets (ej. conteo por marca) que deben reflejar el **dataset completo**, no derivarlos agregando sobre la pagina actual (`data` paginada). Agregar un endpoint dedicado (`/{recurso}/summary`) que calcule los agregados contra el dataset completo, independiente de la paginacion de la tabla.
2. **Endpoints con multiples consumers**: un GET plano que alimenta tanto un dropdown/autocomplete como una tabla NO se convierte a envelope paginado in-place. Se agrega un endpoint paginado dedicado (`/{recurso}/list`) para el consumer tabla, preservando el GET plano original para los consumers que no paginan (dropdowns, selects). Convertir el endpoint dual-proposito rompe a los consumers no-tabla.

## Why

Un KPI/facet calculado sobre `data` de la pagina actual da un numero incorrecto (solo refleja lo visible, no el total) — confunde al usuario apenas cambia de pagina o filtro. Y forzar el envelope de paginacion sobre un endpoint que alimenta multiples consumers (tabla + dropdown) rompe silenciosamente a los que esperaban el array plano, porque el contrato de salida cambia de forma.

## Where

- **Layers**: backend (controllers/services de objetos con KPIs o consumidos por multiples UI).
- Ejemplo origen: `items.controller`/`items.service` (JOR-068), catalogos in-memory con GET plano + `/list` paginado nuevo.

## When

- Al agregar KPIs/facets a una tabla: verificar si se calculan sobre `data` (pagina) o sobre el dataset completo; si es el dataset completo, crear `/summary`.
- Al paginar/envelopar un endpoint existente: verificar quien mas lo consume (grep de imports/llamadas) antes de cambiar su forma de salida; si hay consumers no-tabla, agregar un endpoint nuevo en vez de mutar el existente (DET-16).

## Verification

- El KPI/facet mostrado coincide con el total real del dataset (no solo la pagina visible), verificado con mas de 1 pagina de datos.
- Los consumers no-tabla del endpoint original (dropdowns, selects) siguen funcionando sin cambios tras agregar el endpoint paginado dedicado.

## Source

- **Discovered in**: JOR-068, Sessions 2-3.
- **Evidence**: L1/L8 (KPIs+facet de marca -> `/items/summary`, patron generalizable a tablas con KPIs); L5 (catalogos stub con GET plano usado por dropdowns + tabla -> `/list` paginado dedicado, preservando el plano, DET-16).
