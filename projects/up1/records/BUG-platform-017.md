---
id: BUG-platform-017
project: up1
type: bug
module: platform
tags:
  - a11y
  - wcag
  - badge
  - axe-core
  - deferred
---

# axe-core no ejecutado sobre layouts default_activity_{view,edit} en UPU — H9 secondary light-mode pending verificacion empirica

## Symptom

Durante S3 de TICKET-025/SPEC-006 (cierre HU4 followup) se preveio TC-8: axe-core sobre los 2 layouts con badge para validar WCAG 2.1 AA empiricamente. El smoke visual del dev (light + dark mode) confirmo que los badges se renderizan correctamente y son legibles a vista humana. **La validacion empirica con axe-core NO se ejecuto** — quedan dos riesgos sin cierre formal:

1. **H9 light-mode del variant `secondary`** (calculo manual del intake: ~2.76:1 sobre fondo blanco — FAIL WCAG AA threshold 4.5:1). Dev aprobo el draft v2 con esa apariencia, pero NO hay verificacion empirica que confirme/refute el calculo
2. **Otros variants en cualquier modo** — primary/success/danger/warning + secondary en dark (mitigado por DEC-LOCAL-04) NO tienen run de axe-core que documente 0 violations

## Expected behavior

Per SPEC-006 REQ-PRESERVE-02: axe-core sobre `default_activity_view` y `default_activity_edit` en UPU live retorna **0 violations WCAG 2.1 AA** (o si fail por contraste secondary light-mode, dispara DEC-LOCAL-02 mitigacion (a) gray-700 override en wrapper).

## Root cause

Bloqueo operativo, no de codigo:

- **File**: n/a (no es bug de codigo, sino de cobertura de testing)
- **Cause**: axe-core empirico requiere browser session autenticada Clerk + storageState; durante el run del autopilot del 2026-05-18 no se logro automatizar el run sin credenciales test, y el dev priorizo cerrar SP2 sobre setup del axe-core run. Decision: defer a ticket separado para ejecutar cuando haya capacidad

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | usuarios con discapacidad visual / preferencias de contraste alto (UPU usuarios docentes/coordinadores) — potencialmente bajo numero pero alto impacto individual |
| Data affected | n/a — es bug de UI a11y, no de datos |
| Modules affected | curriculum-design (los 2 layouts con badge) — solo cuando un activity esta en status ToDo (codes BOR, PROP) en light mode |
| Frequency | siempre que se vea un activity en estado ToDo en light mode + dispositivo del usuario sin override OS para contraste alto |

## Reproduction

### Environment
| Campo | Valor |
|-------|-------|
| Environment | UPU local-dev y/o production cuando se deploy SPEC-006 |
| Browser/Client | cualquier browser moderno con devtools + extension axe DevTools, O CI con `@axe-core/playwright` |
| Data conditions | activity con `currentStatusId` apuntando a status PUB/BOR/EDIT/EVAL/REJ (al menos 1 de cada categoria para cubrir los 5 variants) |

### Steps

1. Login a UPU con cualquier rol que tenga `activity:view`
2. Navegar a `/UPU/activity/aa-uv-1124/edit` o cualquier activity con currentStatusId
3. Abrir DevTools → extension axe DevTools → escanear pagina
4. (Alternativa CI) Setup Playwright spec con `@axe-core/playwright`:
   ```ts
   import { test } from '@playwright/test'
   import AxeBuilder from '@axe-core/playwright'

   test('default_activity_view a11y', async ({ page }) => {
     await page.goto('/UPU/activity/aa-uv-1124')
     const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()
     expect(results.violations).toEqual([])
   })
   ```
5. Repetir para `/edit` + para activities en otras categorias (especialmente BOR para cubrir secondary)
6. Repetir para light + dark mode

## Workaround

**Visual smoke por el dev** ya valida que los badges son legibles a vista humana (commits `b168df7` + `3c31b50`). El gris secondary en light mode (`#9b9b9b` + white) puede ser borderline pero no impide el uso. **Workaround para usuarios con discapacidad visual**: el OS-level contraste alto setting suele forzar overrides que mejoran la lectura.

## Solution

Plan cuando se priorice:

1. Setup minimalmente: agregar `@axe-core/playwright` como devDep a `suite/` y crear un Playwright spec config con storageState pre-autenticado (puede usar la mecanica de `@uplanner/auth-fixtures` si existe)
2. Crear test `tests/a11y/activity-status-badge.spec.ts` que cubra:
   - `default_activity_view` con activities en cada categoria
   - `default_activity_edit` idem
   - Light + dark mode (toggle via `localStorage.setItem('up1-theme', 'dark')` antes de navegar)
3. Ejecutar y capturar output JSON. Si fail en secondary light-mode:
   - **Trigger DEC-LOCAL-02** del SPEC-006 — mitigacion (a) gray-700 via `customColor='#525252'` en LIGHT mode tambien (analogo al fix de DEC-LOCAL-04 para dark)
   - O alternativa: cambiar el `--up1-badge-bg-secondary` literal (estructural — blast radius alto)
4. Si pass: cerrar BUG con `status: verified`, agregar el spec del test a la suite de regresion CI

Esfuerzo estimado: ~1.5-2h (setup playwright + axe + 1 spec + ejecucion)

## Related

- **Rules**: RULE-curriculum-design-001 (Custom Vueform elements deben cumplir WAI-ARIA APG)
- **Decisions**:
  - DEC-LOCAL-02 (SPEC-006) — validacion empirica de H9 secondary, contingencia activa solo si axe-core confirma fail
  - DEC-LOCAL-04 (SPEC-006) — fix preventivo para dark mode via `customColor`, DEC-LOCAL-02 fix queda pending para light mode
- **Specs**: SPEC-006-hu4-followup-rename-cleanup-badge-status (REQ-PRESERVE-02 a11y)
- **Tickets**: TICKET-025 (origen), TICKET-019 (HU4 padre)
