---
id: RULE-platform-003
project: up1
type: rule
module: platform
tags:
  - sfc
  - vueform
  - refactor
  - testability
  - file-size
---

# SFCs Vueform: extraer logica pura testeable a `.ts` cuando supere 15 LOC

## What

Toda funcion declarada dentro de un SFC custom Vueform (`*.vue` en `up1/mods/{mod}/components/`) que cumpla las 3 condiciones siguientes debe extraerse a un archivo `.ts` aparte y tener test unitario antes de mergear:

1. **No accede al DOM** (no usa `document`, `window.*` ni APIs del navegador)
2. **No depende de estado reactivo de Vue** (no usa `ref`, `reactive`, `computed`, `inject`, `useStore`, `useRoute`, ni recibe instancia de componente)
3. **Supera 15 LOC** efectivos (sin contar braces ni declaraciones de tipos)

Las helper functions que cumplen las 3 viven junto al SFC en `{ComponentName}/helpers/{nombre}.ts` (o `{ComponentName}.helpers.ts` si el SFC no tiene folder propio) y se importan en el SFC. El test va en `{nombre}.test.ts` adyacente al helper.

**Excepcion explicita**: render functions de sub-componentes Vueform (ej: `CompositeSectionForm`, `CompositeSectionView`) NO extraen aun por restriccion de plataforma RULE-mods-022 (1 `.vue` por folder en `modsComponents/` durante sync). Se documenta como deuda y se revisa al cerrar BUG-platform-012.

## Why

T-009 cerró con `CompositeSectionTreeElement.vue` en **1497 LOC** (CSS + helpers TS + lógica de árbol + modal ad-hoc + form render-function + sub-componentes inline). T-010 tuvo que extraer `formatViewValue`, `looksLikeHtml`, `stripHtmlToText`, `buildTree` y `sanitizeHtmlSafe` a archivos `.ts` aparte y agregar 31 tests, descubriendo en el proceso un bug del walker shallow en `sanitizeHtmlSafe` (C7) que estaba en producción sin tests que lo detectaran.

Sin extracción → no hay coverage de la lógica → bugs entran a produccion → refactor caro post-cierre (T-011 fue **un ticket completo de baseline tests** como prerequisito de T-010). Con extracción + test al momento de escribir: 0 deuda acumulada.

## Where

- **Files**:
  - SFCs candidatos: `up1/mods/*/components/**/*.vue` (especialmente custom Vueform definidos via `defineElement()`)
  - Helpers extraidos: `{ComponentName}/helpers/*.ts` o `{ComponentName}.helpers.ts`
  - Tests: `{nombre}.test.ts` adyacente al helper
- **Layers**: ui-components, mods.

## When

- Cuando se modifica un SFC y se agregan funciones nuevas que cumplen las 3 condiciones
- Cuando el reviewer detecta una funcion existente del SFC que cumple las 3 condiciones (refactorear como parte de la task actual o crear ticket de improvement)
- Cuando un SFC supera 400 LOC totales: revisar todas sus funciones contra los 3 criterios — probable que haya extracciones pendientes

NO aplica a:
- Helpers que dependen de estado Vue (`composables` con `ref`/`computed`)
- Render functions cuya extraccion bloquea la restriccion de plataforma (ver excepcion arriba)
- Closures triviales de < 15 LOC

## Verification

- **Manual en code review**: el reviewer verifica que ninguna funcion en SFCs nuevos / modificados cumple las 3 condiciones sin estar extraida.
- **Heuristica grep**:
  ```bash
  # Encontrar SFCs que probablemente tienen funciones extraibles
  for f in $(find up1/mods -name "*.vue"); do
    lines=$(wc -l < "$f")
    funcs=$(grep -cE "^\s*(function|const)\s+\w+\s*[=(]" "$f")
    [ "$lines" -gt 400 ] && echo "$f: ${lines} LOC, ${funcs} funcs (revisar)"
  done
  ```
- **Test del helper**: cada `.ts` extraido tiene su `.test.ts` con casos cubriendo happy path + edge cases. Sin test → no se merge.

## Source

- **Discovered in**: TICKET-010 ítems C1, C3 + TICKET-011 entero (baseline para refactorizar).
- **Evidence**:
  - `CompositeSectionTreeElement.vue` 1497 LOC pre-T010 → 896 LOC post-T010 (parcial; aun sobre 400 por la restriccion de sub-componentes)
  - `sanitizeHtmlSafe` walker shallow bug detectado al extraer (C7)
  - T-011 (200 tests baseline) como **ticket prerequisito** del refactor T-010
  - BUG-mods-008 (CompetencyTree con render duplicado, mismo patron)
- **Related**:
  - RULE-mods-022 (1 `.vue` por folder — restriccion de plataforma vinculada)
  - BUG-platform-012 (modalStackManager no expuesto)
  - DET-7 (test cases referencian discovery)
  - Principio general: `prompts/agents/developer.md` paso 5 "Antes de commitear codigo"
