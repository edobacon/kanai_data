---
id: RULE-mods-040
project: up1
type: rule
module: mods
tags:
  - sync
  - claude-md-outdated
  - mods-components
---

# Sync target real de Vue components del mod es `layout/src/modsComponents/`, NO `layout/modsComponents/` (CLAUDE.md desactualizado)

## What

El comando `npm run sync` del root del monorepo UP1 propaga los Vue components de `mods/<mod>/modsComponents/*/` al destino `layout/src/modsComponents/<Component>/`, NO `layout/modsComponents/<Component>/` (sin `src/`) como sugiere el CLAUDE.md global.

El glob de Vueform en `suite/vueform.config.ts` confirma el path real:

```typescript
const elementModules = import.meta.glob([
  '../layout/src/modsComponents/*/*.vue',  // <- path real
  '../layout/src/elements/*.vue',
  './src/elements/*.vue'
], { eager: true })
```

`suite/modsComponents/` existe pero queda **vacio** en la practica — la configuracion de glob NO apunta ahi. Suite consume directamente desde `../layout/src/modsComponents/`.

## Why

CLAUDE.md global tiene el path desactualizado (probable: refactor anterior movio el target sin actualizar la doc). El dev que sigue CLAUDE.md busca archivos en `layout/modsComponents/` y no los encuentra → asume que sync fallo. Bug observado en TICKET-025 S2.T5.

## Where

- **Files**:
  - Sync script root: `up1/sync/` (path real del target hardcoded)
  - Config Vueform: `up1/suite/vueform.config.ts` (consumer del glob)
  - Doc desactualizada: `up1/CLAUDE.md` linea ~110-120 "components/ — Vue components → synced to `layout/modsComponents/`"
- **Layers**: config + sync pipeline

## When

Aplica cuando:

- Debuggeas si un component del mod se sincronizo correctamente — buscar en `layout/src/modsComponents/<Component>/`
- Configuras Storybook o consumers del layout/ workspace que necesitan importar mods components
- Actualizas el CLAUDE.md del root (corregir referencia)

## Verification

```bash
# Verificar synced location
find /Users/edobacon/Workspace/uplanner/up1/layout/src/modsComponents -type d | head -10

# Verificar que suite/modsComponents queda vacio
ls /Users/edobacon/Workspace/uplanner/up1/suite/modsComponents/
# Expected: vacio

# Confirmar glob en suite/vueform.config.ts
grep "modsComponents" /Users/edobacon/Workspace/uplanner/up1/suite/vueform.config.ts
# Expected: '../layout/src/modsComponents/*/*.vue'
```

## Source

- **Discovered in**: TICKET-025, Session 2 (S2.T5 sync + verify register)
- **Evidence**: Tras `npm run sync`, busque component sincronizado en `layout/modsComponents/` (path de CLAUDE.md) → 0 matches. Hallado en `layout/src/modsComponents/ActivityStatusBadge/` con los 2 archivos. Confirmado en glob de `suite/vueform.config.ts`. Aprendizaje L8 del ticket
- **Related**: RULE-mods-021 (touch `suite/vueform.config.ts` para forzar glob reload tras nuevo Vueform element)
