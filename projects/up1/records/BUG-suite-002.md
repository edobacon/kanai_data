---
id: BUG-suite-002
project: up1
type: bug
module: suite
tags:
  - vueform
  - i18n
  - forms
---

# Mensajes de validación de Vueform en inglés pese a locale `es`

## Symptom

Los mensajes de validación de formularios (Vueform) se mostraban en inglés aunque el locale activo de la app fuera `es` (por ejemplo, validaciones de aforo negativo).

## Root cause

- **File**: `vueform.config.ts` (raíz de `suite`).
- **Cause**: `suite` mantiene su propio `vueform.config.ts`, separado del de `layout/`. El de `suite` solo registraba el locale `en`; el locale `es` había sido agregado en el config de `layout/` pero no se propaga entre workspaces porque cada uno carga su propio config de Vueform de forma independiente.

## Fix

`vueform.config.ts` de suite ahora importa y registra ambos locales (`import es from '@vueform/vueform/locales/es'`, línea 4) y fija `es` como default estático (`locale: 'es'`, línea 24, dentro de `locales: { en, es }`, línea 23). El fix es un default fijo, no un valor que siga `$i18nLanguage` en runtime: si el locale de la app cambia a `en`, los mensajes de Vueform seguirían en `es`. Commit: `7f58d36` ("fix: register Spanish locale for Vueform validation messages [UPONE-1264]", 2026-07-30).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | todos los usuarios con locale `es` que interactúan con formularios Vueform en suite |
| Data affected | ninguno (solo texto de validación) |
| Modules affected | suite (`vueform.config.ts`); riesgo latente en `layout/` por config duplicado |
| Frequency | siempre, antes del fix |

## Related

- **Rules**: ninguna nueva (riesgo de duplicación entre `suite/vueform.config.ts` y `layout/vueform.config.ts` documentado como nota, no como constraint nuevo).
- **Source**: recon suite (delta 2026-07-13 → 2026-08-03), verificado contra `vueform.config.ts` actual de suite.
