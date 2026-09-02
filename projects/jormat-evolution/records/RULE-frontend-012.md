---
id: RULE-frontend-012
project: jormat-evolution
type: rule
module: frontend
level: must
tags:
  - frontend
  - react-hook-form
  - useFieldArray
  - forms
---

# Dos `useFieldArray` sobre el mismo `control`+`name` no sincronizan: una unica fuente en el padre

## What

Dos instancias de `useFieldArray` apuntando al mismo `control`+`name` (ej. una en `ItemSearchPanel` y otra en `LineItemsTable`, ambas hijas de un builder) NO se sincronizan entre si. El `append` de una instancia actualiza los valores del form (visibles via `useWatch`/calculos que leen el form state) pero NO re-renderiza los `fields` de la otra instancia — una fila agregada por una instancia no aparece en la tabla que usa la otra.

**Fix**: una unica instancia de `useFieldArray` en el componente padre (builder), pasando `fields`, `remove`, `move` y `onAdd` como props a los hijos que necesiten leer o mutar el array.

## Why

`useFieldArray` mantiene su propio estado local de `fields` (sincronizado con RHF via subscripcion), pero esa sincronizacion es por-instancia — dos llamadas al hook con los mismos argumentos no comparten esa sincronizacion interna, aunque ambas lean/escriban el mismo `name` del form.

## Where

- **Layers**: frontend (forms con arrays de items compuestos por multiples sub-componentes, ej. builder de facturas con panel de busqueda + tabla de lineas).
- Ejemplo origen: builder de facturas (JOR-065, Session S5).

## When

- Al dividir un form con `useFieldArray` en multiples componentes que necesitan leer/mutar el mismo array (ej. panel de busqueda que agrega + tabla que lista/reordena).

## Verification

- Solo existe una llamada a `useFieldArray(name)` por array del form; los sub-componentes reciben `fields`/`remove`/`move`/`onAdd` via props, no llaman `useFieldArray` ellos mismos sobre el mismo `name`.
- Agregar un item desde el sub-componente de busqueda lo muestra inmediatamente en la tabla de lineas (sin refresh manual).

## Source

- **Discovered in**: JOR-065, Session S5.
- **Evidence**: L2 (append de ItemSearchPanel no re-renderizaba fields de LineItemsTable; fix: fuente unica de field array en el builder padre, props hacia los hijos).
