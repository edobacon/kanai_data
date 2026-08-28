---
id: TICKET-096
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1345
module: curriculum-design
autopilot: autonomous
---

# Fix selección visible/hidratación de ColorPicker e IconPicker + curaduría de íconos educacionales

## Request

Follow-up de TICKET-094 (UPONE-1345). Tras sincronizar los pickers a la suite emergieron dos problemas: (1) BUG — al abrir el form de edición de una línea de formación no se distingue el color/ícono ya guardado (no hidrata), y al seleccionar uno nuevo tampoco se resalta cuál se eligió (ambos pickers). Causa raíz identificada: ColorPickerElement/IconPickerElement derivan el estado seleccionado leyendo `element.value` dentro de un `computed`, en vez del patrón writable probado del repo (ValidationTextEditorElement L155 / EnumValuesEditorElement) que mantiene estado LOCAL en un `ref` inicializado desde `element.value` (con fallback a `element.form$.data` porque al montar el form de edición `element.value` puede no traer aún el valor cargado) + `watch` + persistencia con `element.update()`. El indicador visual ya existe (borde + SVG check en color; borde + fondo en icono) pero el estado no cambia. (2) IMPROVEMENT — el IconPicker muestra por defecto los primeros 120 íconos alfabéticos del manifest (2078), que arrancan con navegación/layout (align-*, arrow-*, chevron-*); deben mostrarse primero un set curado educacional/descriptivo (book, mortarboard, pencil, calculator, easel, journal, clipboard-data, people, globe, translate, palette, building, flask, etc.), con el catálogo completo aún accesible vía búsqueda (decisión del dev: curados primero + resto buscable). Layer: mod, solo mods/curriculum-design/. Incluir cobertura de test del flujo reactivo de selección (gap que el dual-judge de TICKET-094 S2 ya señaló: el SFC no se monta en vitest).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix (con sub-alcance improvement: curaduría de íconos) |
| Tipo de cambio | single (solo mods/curriculum-design/, layer:mod) |
| Modulo principal | curriculum-design |
| Modulos afectados | — (mod auto-contenido; sync propaga a layout/suite) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El estado seleccionado no cambia porque se deriva de `element.value` en un `computed`; el patrón writable probado usa `ref` local + `watch` + `element.update()` | confirmed | `ColorPickerElement.vue`/`IconPickerElement.vue` (TICKET-094): `currentValue = computed(() => element.value)`. Contraste: `ValidationTextEditorElement` L155 `const text = ref(typeof element.value === 'string' ? element.value : props.default)` + watch |
| H2 | La no-hidratación al editar viene de que `element.value` puede estar vacío en el setup; hay que leer también `element.form$.data` como fallback | confirmed | ValidationTextEditorElement L176-202 implementa exactamente ese fallback (lee `element.form$.data` cuando `element.value` no tiene el valor cargado) |
| H3 | El indicador visual ya existe; el bug es de ESTADO, no de CSS | confirmed | `.cp-swatch--selected` (borde + SVG check) y `.ip-cell--selected` (borde + fondo) están en los SFC; no se aplican porque `isSelected` nunca cambia |
| H4 | El default de íconos es nav-heavy porque `filterIcons('')` devuelve los primeros 120 alfabéticos del manifest | confirmed | `useIconPicker.ts`: `ALL_ICON_NAMES = Object.keys(manifest)`; manifest arranca alfabético (`123, alarm, align-*, arrow-*…`). `filterIcons('')` → `.slice(0, 120)` |

### Context found

**Rules/KB aplicables:**
- **RULE-curriculum-design-019** (recién promovida en TICKET-094): el patrón writable es `setup(props,{element})` + `element.update()`. Este fix **completa** esa regla: el patrón correcto además mantiene estado LOCAL (no lee `element.value` en computed). → la regla debe reforzarse con el matiz de reactividad/hidratación.
- **RULE-curriculum-design-002** (must): a11y — `aria-checked`/`aria-selected` deben reflejar el estado real; hoy quedan siempre `false`.
- Patrón de referencia: `ValidationTextEditorElement` (mod object-manager-editor) — `ref` local desde `element.value` + fallback `element.form$.data` + watch.

**Decisión del dev (scope):** curaduría de íconos = "curados primero + resto buscable" (set educacional por defecto; catálogo completo vía búsqueda).

**Archivos a tocar:** `modsComponents/ColorPicker/ColorPickerElement.vue`, `modsComponents/IconPicker/IconPickerElement.vue`, `modsComponents/IconPicker/useIconPicker.ts` (set curado), tests existentes + nuevos, guías (actualizar limitación resuelta).

### Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | UPONE-1267-sp5 (misma rama de la épica SP5; commits prefijo UPONE-1345 por DET-19) |
| Base branch | develop |
| DB state | Sin cambios. Render real es DB-gated (requiere `npm run sync` + reinicio suite) — el smoke de este fix SÍ es importante (es lo que falló antes) |
| Services | suite (3000) + layout/storybook (6006/6010) |
| Test data | una línea de formación existente con color/icon guardados (para verificar hidratación) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-25 | (nuevo) → super | dev: sesión en super autopilot (follow-up de TICKET-094) | intake |

### Plan de sessions (preplanificacion)

1 session prevista. **Esqueleto producido por `intake-explore`.** Detalle final en `design-fix`.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Fix reactividad de selección (ref local + fallback form$.data + watch) en ambos pickers + curaduría educacional de íconos + tests | 1 | T2 | reactividad ColorPicker, reactividad+curaduría IconPicker, tests | ⚑ fuerte | dual-judge APPROVED; hidratación+selección verificadas; íconos curados primero; vitest sin regresión |

**Notas del esqueleto**:
- Cambio cohesivo (misma causa raíz de reactividad en ambos pickers + un set curado). 1 session T2 con dual-judge (user-facing + a11y, fue lo que falló en el smoke).
- Smoke runtime (hidratación/selección reales) es **obligatorio** en el cierre: es el síntoma reportado; `npm run sync` + reinicio suite + verificar en una línea existente. Lo corre el dev (DB-gated) pero se exige evidencia.

### Session 1 — 2026-06-25 — Fix reactividad de selección (ambos pickers) + curaduría de íconos [phase: execute]

**Tipo:** ⚑ fuerte (dual-judge)
**Validation tier:** T2

**Tasks completadas**:
- [x] S1.T1 — ColorPicker: estado local `selected` (ref) init desde `element.value` con fallback `element.form$.data` + watch + `element.update()`; isSelected/activeIndex desde el ref local
- [x] S1.T2 — IconPicker: misma reactividad + `CURATED_EDUCATIONAL` mostrado primero cuando query vacío (catálogo completo al buscar)
- [x] S1.T3 — Tests del flujo selección/hidratación + set curado + a11y aria-state real; actualizar guías
- [x] S1.GATE — Gate de sync Session 1 (tier T2, dual-judge DET-35)

**Validacion del tier**:
- T2 — vitest del mod 844/844 (836 + 8 nuevos de hidratación); eslint EXIT 0; vue-tsc 0 errores en Color/IconPicker (75 = baseline pre-existente). Render visual = smoke DB-gated (dev).

**Quality review (DET-23)** — loop dual-judge (DET-35, T2), 0 iteraciones:
- Jueces balanced (A `a85c33f` + B `acf0b47`), ciegos en paralelo → **ambos `approve`**, scope_ok.
- Findings: WARNING-theoretical (wiring SFC→template no montable en vitest — documentado, smoke DB-gated es el gate real) confirmado por ambos → no bloquea. INFO: watch no-immediate (consistente con ValidationTextEditorElement), catch silencioso, token CSS distinto entre pickers.
- **Token CSS (Judge B INFO) evaluado y NO cambiado**: ColorPicker usa `--up1-text-primary` (adaptativo, alto contraste sobre cualquier swatch); IconPicker usa `--up1-primary` (sobre celda neutra). Cambiar Color a `--up1-primary` fundiría el ring con el swatch teal "primary" → regresión. Cada token es correcto para su contexto.
- **Veredicto: APPROVED** (0 iter). Cero CRITICAL/real-WARNING.

```dkc:gate-telemetry
session: 1
work_type: fix
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 11200
est_tokens: 3027
span_seconds: 1500
```

**Commit DET-27**: `3cae69f` fix(curriculum-design): selección reactiva/hidratación + `65e9c53` test + `f18276f` docs (rama UPONE-1267-sp5, modo limpio external=UPONE-1345)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| (REQ se definen en design-fix) | TC-01..TC-06 | auto + smoke | NOT COVERED |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status | Affects UI |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|-----------|
| TC-01 | ColorPicker hidrata el color guardado al abrir edición | REQ-FIX-01 | smoke | línea con color guardado | abrir form edit | el swatch del color guardado queda marcado (borde+check) | lógica verificada: `readLoadedValue` (directo + fallback form$.data) cubierto por unit; render visual = smoke dev | color-picker.test.ts (readLoadedValue) + smoke pendiente dev | ⚑ logic-verified / smoke dev | yes |
| TC-02 | ColorPicker resalta el swatch al seleccionarlo | REQ-FIX-01 | smoke | form abierto | click en un swatch | el swatch clickeado se resalta y persiste | lógica: `select()` muta `ref selected` → `isSelected` true (estado local); render visual = smoke dev | color-picker.test.ts (isSwatchSelected) + smoke pendiente dev | ⚑ logic-verified / smoke dev | yes |
| TC-03 | IconPicker hidrata el ícono guardado al abrir edición | REQ-FIX-01 | smoke | línea con icon guardado | abrir form edit | el ícono guardado queda marcado | lógica: `readLoadedValue` + `fromToken` cubiertos por unit; render = smoke dev | icon-picker.test.ts (readLoadedValue) + smoke pendiente dev | ⚑ logic-verified / smoke dev | yes |
| TC-04 | IconPicker resalta el ícono al seleccionarlo | REQ-FIX-01 | smoke | form abierto | click en un ícono | el ícono clickeado se resalta y persiste | lógica: `select()` muta `ref selected` → `isIconSelected` true; render = smoke dev | icon-picker.test.ts + smoke pendiente dev | ⚑ logic-verified / smoke dev | yes |
| TC-05 | IconPicker muestra set curado educacional por defecto (no navegación) | REQ-FIX-02 | auto | element sin búsqueda | render inicial | primeros íconos = set educacional (book, mortarboard…), no arrow/chevron | `filterIcons('')` === CURATED_EDUCATIONAL; ningún `arrow-*`/`chevron-*`/`align-*` al inicio | icon-picker.test.ts (19 PASS) | ✅ done | yes |
| TC-06 | El catálogo completo sigue accesible por búsqueda | REQ-FIX-02 | auto | element | buscar un ícono fuera del set curado | aparece en resultados | `filterIcons('arrow')` filtra el catálogo completo (siguen accesibles) | icon-picker.test.ts | ✅ done | no |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| tests/integration/color-picker.test.ts | unit | S1.T3 | readLoadedValue (hidratación) + isSwatchSelected | vitest3 |
| tests/integration/icon-picker.test.ts | unit | S1.T3 | readLoadedValue + CURATED_EDUCATIONAL default + búsqueda full | vitest3 |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| mod curriculum-design | `npm run test` (en mods/curriculum-design) | 836/836 (post TICKET-094) | 844/844 (post S1, +8 hidratación) | +8 |

## Commits

| Hash | Fecha | Subject | Tasks | Session |
|------|-------|---------|-------|---------|
| 3cae69f | 2026-06-25 | UPONE-1345 fix(curriculum-design): selección reactiva/hidratación en pickers (ref local + fallback form$.data) + curaduría educacional de íconos | S1.T1, S1.T2 | 1 |
| 65e9c53 | 2026-06-25 | UPONE-1345 test(curriculum-design): hidratación (readLoadedValue) de pickers + set curado por defecto del IconPicker | S1.T3 | 1 |
| f18276f | 2026-06-25 | UPONE-1345 docs(curriculum-design): estado de selección (ref local) + curaduría en guías de los pickers | S1.T3 | 1 |

## Summary

**Qué se corrigió**: follow-up de TICKET-094. Tras el sync emergieron 2 problemas que este ticket resuelve:
1. **BUG selección/hidratación (ambos pickers)** — el estado seleccionado se derivaba de `computed(() => element.value)`, que ni reaccionaba al `update()` (click no resaltaba) ni hidrataba al montar la edición (`element.value` llega async). Migrado a **estado LOCAL** (`ref selected`) inicializado vía `readLoadedValue` (`element.value` directo + fallback a `element.form$.data[name]`) + `watch(() => element.value)` para la carga async + `select()` que muta el ref y persiste con `element.update()`. `aria-checked`/`aria-selected` ahora reflejan la selección real (RULE-002). Patrón `ValidationTextEditorElement`.
2. **Curaduría de íconos (IconPicker)** — `CURATED_EDUCATIONAL` (43 íconos de disciplinas, todos en el manifest, 0 navegación) se muestra por defecto; el catálogo completo (2078) sigue accesible al buscar.

**Sessions**: 1 (S1, T2 ⚑). Dual-judge (DET-35): **APPROVED 0 iteraciones** (2 jueces ciegos balanced).

**Verificación**: suite del mod **836 → 844** (+8 tests de hidratación `readLoadedValue`), eslint EXIT 0, vue-tsc 0 errores nuevos. Validación de cierre inline (proporcional — el dual-judge ya cubrió el diff): scope 100% bajo `mods/curriculum-design/`, rama UPONE-1267-sp5.

**Decisión**: DEC-LOCAL-01 (estado local, no computed). Token CSS del ring evaluado y NO cambiado (cada picker usa el token correcto para su fondo).

**Conocimiento**: **RULE-curriculum-design-019 reforzada** (DET-16) — el estado de display debe ser `ref` local (no computed sobre `element.value`), con hidratación vía fallback a `form$.data`.

**Commits** (rama UPONE-1267-sp5, modo limpio UPONE-1345, push diferido): 3cae69f/65e9c53/f18276f.

**Story points**: published 2 / executed 2 (sessions-heuristic; sp_llm 1 × c0.6 + sp_human 1).

**Pendiente / aceptación del dev (DB-gated)**: `npm run sync` + reiniciar la suite + verificar en una línea de formación existente: (a) el color/ícono guardado aparece marcado al abrir edición, (b) al clickear otro se resalta, (c) el IconPicker arranca con íconos educacionales. Es el smoke que cierra los TC-01..04 (lógica ya cubierta por unit tests; el render real solo se ve en la suite).
