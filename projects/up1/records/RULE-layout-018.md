---
id: RULE-layout-018
project: up1
type: rule
module: layout
tags:
  - recordlist
  - i18n
  - enums
  - lang
---

# i18n para enums en RecordList: declarar `enums.{fieldName}.{value}` en lang del mod

## What

Para traducir valores de campos enum (ej. `workflowState`, `programLevel`) en RecordList, declarar las keys con el patron `enums.{fieldName}.{value}` en el archivo `mods/{mod}/lang/{locale}@{ObjectName}.json`:

```json
{
  "_source_module": "{mod}",
  "column": {
    "workflowState": "Estado",
    "programLevel": "Nivel"
  },
  "enums": {
    "workflowState": {
      "Draft": "Borrador",
      "Approved": "Aprobado"
    },
    "programLevel": {
      "Undergraduate": "Pregrado"
    }
  }
}
```

## Why

La plataforma aplica el patron `enums.{field}.{value}` en **3 lugares**:
- Editor inline al editar la celda enum (`TableCell.vue:687`)
- Dropdown de valor en el modal "Configurar Filtros" (`FiltersColumnRecordList.vue:886`)
- Vista detalle de campo enum (`RecordDetail.vue:2793`)

**Limitacion conocida**: en el modo display de la celda en table view, la plataforma renderiza el valor crudo del enum (`Approved`, `Draft`) — `getDisplayValue()` (`recordListFormatters.ts:237`) no aplica `t('enums.*')`. Resolver esto requiere PR a la plataforma.

Strings de UI siguen ortografia normal del idioma destino — usar acentos (Código, Versión, Descripción) en lang files. La regla "sin acentos" del CLAUDE.md global aplica solo a identificadores y comentarios.

## Where

- **Files**: `mods/{mod}/lang/{locale}@{ObjectName}.json`
- **Layers**: i18n config

## When

- Al declarar un layout RecordList sobre un objeto con campos enum.
- Headers de columna se traducen via `column.{fieldName}` (mismo archivo).

## Verification

- Editor inline al hacer click en "Edit field" sobre la celda enum: el dropdown muestra labels traducidos.
- Modal "Configurar Filtros" → seleccionar campo enum → el dropdown de valor muestra labels traducidos.
- Texto crudo del enum (sin traducir) seguira visible en la celda de la tabla en modo display — limitacion conocida hasta que `getDisplayValue` integre i18n.

## Source

- **Discovered in**: TICKET-007, Session 3
- **Evidence**: Inspeccion del codigo identifico el patron `enums.{field}.{value}` aplicado en 3 lugares (editor inline, filtro modal, RecordDetail) pero no en el getDisplayValue de la celda. Verificado empiricamente con `mods/curriculum-design/lang/es_CL@AcademicActivity.json`: headers + editor + filtro mostraron traducciones ("Aprobado" en lugar de "Approved"); celda en table view siguio mostrando "Approved".
- **Related**: RULE-layout-011 (label texto directo, no key i18n para `label` de columna)
