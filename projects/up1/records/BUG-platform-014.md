---
id: BUG-platform-014
project: up1
type: bug
module: platform
tags:
  - platform
  - observability
  - logger
  - dx
---

# Platform no expone `useLogger()` central — mods usan `console.error` directo

## Symptom

Los mods del up1 (`mods/<mod>/`) no tienen acceso a un logger central del platform. Para reportar errores en runtime los componentes y composables usan `console.error` directo, lo que dificulta:
- Filtrar/silenciar logs por nivel en produccion
- Enriquecer logs con contexto de tenant/user/session
- Enviar errores a observability (Sentry, Datadog, etc.) sin tocar cada mod

Casos detectados durante TICKET-012 review:
- `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` — 2x `console.error` (reorder + submit handlers)
- `mods/curriculum-design/modsComponents/CompositeSectionTree/useCompositeSectionTree.ts` — 1x (fetch error)
- `mods/curriculum-design/modsComponents/CompositeSectionTree/buildTree.ts` — 1x (warning)

Total grep cross-monorepo: TBD (varios mods replicarian el patron sin un estandar).

## Expected behavior

El platform deberia exponer un composable o helper, p.ej.:

```ts
// up1/layout/src/composables/useLogger.ts
export function useLogger(scope: string) {
  return {
    error: (msg: string, err?: unknown) => { ... },
    warn: (msg: string, ctx?: object) => { ... },
    info: (msg: string, ctx?: object) => { ... }
  }
}
```

Importable desde mods: `import { useLogger } from '@layout/composables/useLogger'`.

## Root cause

Falta de feature en el platform — no se decidio aun por un standard de observability. Cada mod resuelve por su cuenta con `console.*`.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | ninguno directamente (logs solo visibles en devtools) |
| Data affected | ninguna |
| Modules affected | todos los mods que reportan errores (curriculum-design al menos) |
| Frequency | en cada flujo con error (red/Apollo/validacion) |

Bajo impacto de runtime — alto impacto en DX y diagnostico de incidentes en produccion.

## Reproduction

1. Buscar `console.error` en `up1/mods/*/`:
   ```bash
   grep -rE "console\\.(error|warn)" up1/mods/curriculum-design --include='*.ts' --include='*.vue'
   ```
2. Resultados: ~4 ocurrencias en curriculum-design solamente.
3. No hay `useLogger` o equivalente en `up1/layout/src/composables/` ni en `up1/suite/composables/`.

## Workaround

Mantener `console.error('[<ComponentName>] <action>:', err)` con prefijo del scope. Es el patron actual. Pierde estructura JSON pero conserva trazabilidad por grep.

Decision TICKET-012 item C6: NO migrar mientras no exista logger central. Cuando platform exponga el helper, los mods se actualizan en bulk.

## Solution

Pendiente de definicion del platform team. Propuesta:
1. Crear `up1/layout/src/composables/useLogger.ts` con API simple `{ error, warn, info, debug }` por scope
2. Integracion default: `console.*` con formato JSON estructurado (`{ ts, level, scope, msg, error }`)
3. Hook opcional para integrar Sentry/Datadog en SP2+

## Related

- **Rules**: —
- **Decisions**: —
- **Specs**: —
- **Tickets**: TICKET-012 item C6 (decision: postpone hasta que platform exponga logger)
