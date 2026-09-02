---
id: RULE-filtering-001
project: bayley
type: rule
module: filtering
level: must
tags:
  - export
  - filter
  - stats
  - sub-model
  - anti-pattern
---

# Al filtrar un modelo para export/serializar, los `stats` deben recalcularse desde cero — no hacer spread `...model.stats`

## What

Cuando una funcion construye un sub-modelo a partir de un subset visible (p.ej. `filterDataModel`, `filterPermissionsModel`, `filterI18nModel`, y cualquier `onExportFiltered` en las vistas), **todos los campos de `stats` deben calcularse desde el subset**. Hacer `stats: { ...model.stats, totalX: subset.length }` es anti-patron: preserva contadores globales (byMod, byType, bySource, coveragePerLocale, etc.) y produce un JSON donde los totales son del subset pero los desgloses son del modelo completo.

## Why

El usuario que recibe el JSON esperaria que un modelo "filtrado" sea internamente consistente: si `totalNodes = 6`, entonces `byType` debe sumar 6, y `bySource` debe sumar 6. Si se arrastra el desglose global, `totalNodes = 6` pero `byType = {...suma 123}`. Es confuso y corrompe cualquier analisis/dashboard descendiente.

Discovered en BLY-001 (BUG-5): el export filtrado de LayoutsView daba `totalNodes: 6` pero `byType: {RecordList: 45, RecordDetail: 68, ...}` (contadores del modelo completo). Mismo patron encontrado en `filterPermissionsModel` y `filterI18nModel` — todos se reescribieron.

## Where

- **Files**:
  - `src/utils/filterExport.ts` (las 3 funciones exportadas)
  - Cualquier `onExportFiltered` en `src/views/*.vue` que construya un sub-modelo inline
- **Signo del bug**: patron `stats: { ...model.stats, ... }` donde solo se sobreescriben algunos campos
- **Layers**: frontend (export utilities + view handlers)

## When

Siempre que se cree un nuevo tipo de export filtrado o una nueva utilidad en `filterExport.ts`. Tambien al agregar un nuevo campo a `XStats` — verificar que todas las funciones filter recalculen ese campo, no que solo se arrastre del modelo.

## Verification

### Convencion de estructura

Cada funcion filterX debe:

1. Calcular primero los arrays visibles (filtrados)
2. Construir `stats` desde cero via funcion helper `computeXStats(visibles...)` — **sin spread del modelo padre**
3. Retornar un modelo completo armado pieza por pieza — **sin `...model`** en el nivel raiz

Ejemplo correcto (de `filterExport.ts` tras BUG-5):

```typescript
export function filterPermissionsModel(model, visibleCapabilities) {
  // ... filtrar usages, anomalies, roles ...
  return {
    capabilities: visibleCapabilities,
    roles,
    usages,
    anomalies,
    stats: computePermissionStats(visibleCapabilities, roles), // ← desde cero
    generatedAt: new Date().toISOString(),
  };
}
```

### Grep preventivo

Buscar el anti-patron:

```bash
grep -rn "stats:\s*{\s*\.\.\.\(model\|this\)\.stats" src/utils src/views src/stores
```

Cualquier match es sospechoso — revisar si todos los campos se sobreescriben abajo. Si no, es probable BUG de stats.

### Test

Si la vista tiene export filtrado, agregar test unit:

```typescript
it('stats del export filtrado suman igual que length de los arrays visibles', () => {
  const filtered = filterXModel(fullModel, subset);
  expect(sum(filtered.stats.byFoo)).toBe(filtered.stats.total);
  expect(filtered.stats.total).toBe(subset.length);
});
```

## Source

- **Discovered in**: BLY-001, Session #2 (2026-04-17)
- **Evidence**: User exporto layouts filtrados a 6 nodos. JSON mostraba `totalNodes: 6` pero `byType: {RecordList: 45, RecordDetail: 68, OfferingCalendar: 10}` (totales del proyecto completo). Al revisar `onExportFiltered` se encontro spread `...model.stats`. Revision de `filterExport.ts` revelo el mismo patron en `filterPermissionsModel` y `filterI18nModel` (BUG-7 y BUG-8).
- **Related**:
  - BUG-5 (LayoutsView.onExportFiltered) — BLY-001
  - BUG-7 (filterPermissionsModel) — BLY-001
  - BUG-8 (filterI18nModel) — BLY-001
  - L7 en ticket BLY-001
