---
id: SPEC-catalogos-maintainers-ajustes
project: jormat-evolution
ticket: JOR-085
status: done
---

# Ajustes finos de los mantenedores de catálogos (paradigma persistido)

# Ajustes finos de los mantenedores de catálogos (paradigma persistido)

## Executive summary

**Que se quiere**: cerrar los ajustes finos de los mantenedores de categorías/aplicaciones/catálogos
tras JOR-082, **manteniendo el paradigma persistido** (decisión del dev, 2026-07-23). NO se restaura
el flujo efímero filtro+impresión del legacy (queda como DEUDA, ~10-13 SP, requiere una vista de
impresión que no existe).

**Hallazgo**: los componentes ya están maduros. Categorías/aplicaciones están completos (listado
paginado, buscador, CRUD en modal con guard, borrado con `ConfirmDialog` que pone el nombre en la
descripción y refetchea). El único punto sustantivo era el catálogo: los campos del form
(aplicaciones/categorías/proveedores/marca/oferta) se guardan como metadata pero **no filtran** el
`ItemsPickerTable`, con un comentario de código que mentía ("también filtran los items").

## Requirements

### REQ-01 — El copy de borrado refleja el soft-delete real

> **Que cambia**: el texto del `ConfirmDialog` de categorías y aplicaciones.
> **Por que**: JOR-082 hizo el delete **soft** (`in_status=0`), reversible por un administrador. El
> copy decía "Esta acción no se puede deshacer", contradiciendo el comportamiento real.

MUST: el `ConfirmDialog` de categorías y aplicaciones dice "Dejará de aparecer en los listados; un
administrador puede revertirla" (o equivalente), no "no se puede deshacer".

### REQ-02 — Los campos del catálogo se comunican como metadata, no como filtro

> **Que cambia**: comentario de código + texto de ayuda visible en `CrearCatalogoView`.
> **Por que**: los campos no filtran el picker; el comentario "también filtran los items" era falso
> y el usuario podía esperar que filtraran.

MUST: `CrearCatalogoView` corrige el comentario y muestra un texto de ayuda aclarando que los campos
de "Datos del catálogo" son atributos descriptivos que no filtran la tabla de items.

### REQ-03 — Deuda registrada

MUST: DEUDA_TECNICA documentada (flujo legacy filtro+impresión no portado; campos que no filtran el
picker; regla de validación más estricta que el legacy) en `jormat_docs/frontend/catalog-maintainers.md`.

## Tasks

### Session 1 (tier T1 — área de componentes)

- S1.T1 — copy del `ConfirmDialog` en `CategoriasView` + `AplicacionesView` alineado al soft-delete.
- S1.T2 — `CrearCatalogoView`: comentario correcto + texto de ayuda (no-filtro) + assertion en el test.
- S1.T3 — DEUDA_TECNICA documentada en el doc frontend.
- S1.GATE.

## Evidencia

- Vitest de las 3 vistas: 78/78 verde (incluye la nueva assertion del texto de ayuda). Typecheck front limpio.

## No-goals

- No restaurar el flujo legacy de filtro+impresión (DEUDA, otro ticket).
- No conectar los campos del catálogo como filtro real del picker (requiere metadata de items en el listado, toca backend).
- No tocar el paradigma persistido ni el backend.
