---
id: TICKET-097
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1345
module: curriculum-design
autopilot: autonomous
---

# Fix hidratación de pickers al abrir edición + render visual read-only del color/ícono en el view

## Request

Follow-up de TICKET-096 (UPONE-1345). Tras el fix de reactividad, el CLICK ya resalta la selección, pero quedan 2 comportamientos: (1) BUG hidratación — al abrir el modal de EDICIÓN de una línea de formación, los pickers NO marcan el color/ícono que YA estaba configurado en el objeto; solo se resalta lo que el usuario selecciona en la sesión. La causa probable: el modal carga el valor del registro DESPUÉS del setup() del element, y el `readLoadedValue` inicial + `watch(() => element.value)` no capturan ese valor en ese timing. El patrón de referencia ValidationTextEditorElement además tiene un `onMounted` que re-lee el valor tras montar (lo que mis pickers no tienen) — ese es el fix más probable: re-leer element.value en onMounted (cuando la carga async ya completó) + asegurar el watch. Requiere iteración con smoke del dev (el modal no es reproducible en vitest). (2) IMPROVEMENT view — en el modal de VER, los campos color/ícono se muestran como input de texto (en TICKET-094 el layout view quedó como type:text, DEC-LOCAL-03); deben mostrarse VISUALMENTE: el color como swatch/chip y el ícono como glifo, read-only. Decisión del dev: componente display dedicado (read-only, chip color + ícono, patrón ActivityStatusBadge) cableado solo en el layout view (revierte DEC-LOCAL-03). Layer: mod, solo mods/curriculum-design/.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix (con sub-alcance improvement: componente display read-only para view) |
| Tipo de cambio | single (solo mods/curriculum-design/, layer:mod) |
| Modulo principal | curriculum-design |
| Modulos afectados | — (mod auto-contenido; sync propaga a layout/suite) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | La hidratación falla porque el modal carga el valor DESPUÉS del setup() y falta re-leer en `onMounted`; el `readLoadedValue` inicial agarra vacío | inferred (validación empírica en smoke) | TICKET-096: init + watch idénticos a VTE, pero VTE además re-lee en `onMounted` (L647) — mis pickers no. El click funciona (ref local) → el wiring isSelected/aria es correcto; falla solo el camino de carga |
| H2 | El `watch(() => element.value)` solo no basta para el timing del modal; `onMounted` re-read es lo que VTE usa para edit/view load | inferred | VTE comment L631: "External value changes (form load for edit/view) should populate the editor" — usa watch + onMounted; replicar ambos |
| H3 | El view muestra texto porque el layout quedó `type:text` (DEC-LOCAL-03 de TICKET-094); revertir → display read-only | confirmed | `default_requirementCategory_view.json`: color/icon `type:text`. DEC-LOCAL-03 documentada en TICKET-094 |
| H4 | (CORREGIDA por el dev) El render read-only del view se resuelve DENTRO del mismo picker vía modo `isReadonly` (desde `element.isDisabled`), NO con un componente dedicado | confirmed | VTE L287-292: `element.isDisabled` es el flag reactivo canónico, true en layouts `mode:"view"`; VTE renderiza read-only cuando `isReadonly`. El picker en readonly muestra solo el swatch+label (color) / glifo+nombre (icono) |

### Context found

**Rules/KB:**
- **RULE-curriculum-design-019** (reforzada en TICKET-096): estado de display = ref local; para hidratación, init + `watch` + (faltante) `onMounted` re-read. Este ticket cierra el matiz del timing del modal.
- **RULE-curriculum-design-002** (must): el display read-only del view también debe ser accesible (aria-label del color/ícono).
- **RULE-curriculum-design-012**: layouts por convención de nombre — el view usará el nuevo type.
- Patrón hidratación: `ValidationTextEditorElement` `onMounted` (re-lee `element.value`). Patrón display read-only: `ActivityStatusBadgeElement` (`submits:false`, badge desde valor).

**Decisión del dev (scope, CORREGIDA):** el modo display NO es un componente dedicado — es un **modo read-only dentro del MISMO picker** (ColorPicker/IconPicker), con dos modos: ver (read-only) y editar. El view reusa los types `color-picker`/`icon-picker` (revierte DEC-LOCAL-03; el `mode:"view"` del layout activa `isReadonly`). Cobertura de test completa de ambos modos.

**Archivos a tocar:** `ColorPickerElement.vue` + `IconPickerElement.vue` (onMounted re-read + modo `isReadonly` con render read-only) + `useColorPicker.ts`/`useIconPicker.ts` (helper `resolveDisabled` testeable), `default_requirementCategory_view.json` (color/icon `type:text` → `color-picker`/`icon-picker`), tests (hidratación + isReadonly + render read-only a11y, ambos modos), guías.

### Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | UPONE-1267-sp5 (épica SP5; commits prefijo UPONE-1345 por DET-19) |
| Base branch | develop |
| DB state | Sin cambios. **Smoke DB-gated es central** (la hidratación solo se valida en el modal real): `npm run sync` + reinicio + abrir edit/view de una línea con valores |
| Services | suite (3000) + storybook (6006/6010) |
| Test data | línea de formación con color/icon guardados |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El aria-label del IconPicker en modo read-only usa el nombre técnico en inglés del ícono (ej. 'mortarboard') en UI español. Dual-judge: Juez B lo marcó warning, Juez A info → suspect, no confirmado. En mérito: es convención PRE-EXISTENTE (el modo edición ya usa el mismo nombre como aria-label desde TICKET-094/096, a11y aprobada), bootstrap-icons no tiene i18n para sus 2078 íconos, y el aria-label coincide con el label visible (buena práctica WCAG). No es regresión ni defecto de TICKET-097. Si a futuro se quiere localizar, sería un mapa i18n parcial (solo CURATED_EDUCATIONAL) en ticket aparte. | dual-judge (DET-35) S1.GATE | 1 | discarded | — |
| L2 | Custom Vueform elements (defineElement, v1.13.9): `context.element` (2º arg de setup) = retorno de `GenericElement.setup` = objeto de Refs/computed SIN unwrap. Leer `element.value` da el Ref, no el valor; `watch(() => element.value)` watchea identidad del Ref (nunca dispara). El acceso correcto al valor/disabled/update es vía el PROXY: `context.element.el$.value` (ComputedRef → proxy del componente; equivale a Options-API `this`), cuyo `.value`/`.isDisabled` están unwrapped y son reactivos a la carga async del form (probado por ActivityStatusBadgeElement). OJO: `inject('el$')` en el setup del usuario NO sirve (devuelve el el$ del element ANCESTRO, no el propio). Además: el `isDisabled` del element NO deriva de `mode:"view"` (core.mjs:7732 solo mira el `disabled` del schema/validación) → para render read-only en view hay que poner `disabled:true` explícito en el layout. Candidato a RULE del módulo (patrón obligatorio para custom elements) — supersede el matiz de RULE-curriculum-design-019. | smoke dev + lectura de @vueform/vueform/dist (defineElement/GenericElement/base$Y) | 2 | discarded | — |
| L3 | CORRECCIÓN de L2 (el proxy era un red herring). El valor cargado del registro llega a un custom Vueform element por `props.default`, NO por element.value ni element.el$.value. Fix real validado en smoke: declarar prop `default: { type: String, default: '' }` y leerlo (`props.default`) como fuente primaria del valor; patrón EnumValuesEditorElement (que inicializa con `initEntries(props.default)`). `context.element.value` y el proxy `element.el$.value` NO hidrataban fiable en setup (ni con watch ni con onMounted). Secuencia de hipótesis descartadas en TICKET-097: onMounted re-read (S1, falló) → proxy element.el$.value (S2 r1, falló) → unwrap del ref de element.value (S2 r2, falló) → props.default (S2 r3, FUNCIONÓ). Para read-only en view: `disabled:true` en el layout view (Vueform no deriva isDisabled del mode) + isReadonly desde element.isDisabled (resolveDisabled tolera bool/ref) — esto SÍ funcionó desde S2 r1. Lección meta: el wiring value/disabled de un custom Vueform element NO lo atrapa el unit test (helpers puros con objetos planos); solo el smoke runtime → TC de hidratación/render deben ser smoke/Affects-UI. | smoke dev (S2, iteración final) + lectura EnumValuesEditorElement | 2 | promoted | RULE-curriculum-design-019 (refinada: hidratación=props.default) + RULE-curriculum-design-021 (nueva: read-only/view dual-mode) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| 160 | S1: leer el valor cargado y el estado disabled desde `context.element` directo (`element.value`, `watch(() => element.value)`, `resolveDisabled(element)`), asumiendo que `element.value` es el valor unwrapped y que `element.isDisabled` es true en layouts `mode:"view"` (hipótesis H4, copiada del comentario de ValidationTextEditorElement). | Smoke del dev: (1) edición NO hidrata — `context.element` es el retorno de `GenericElement.setup` (objeto de Refs/computed SIN unwrap), así que `element.value` es el objeto Ref (identidad estable) y `watch(() => element.value)` nunca dispara ni lee el string. (2) view NO es read-only y deja seleccionar — Vueform deriva `isDisabled` solo del `disabled` del schema/validación (core.mjs:7732), NO de `mode:"view"`, así que `element.isDisabled` queda false. El click funcionaba porque muta el ref local, sin depender de la reactividad del element. | El acceso correcto y reactivo al valor/disabled de un custom Vueform element es vía el PROXY del element (`context.element.el\$.value`, equivalente a Options-API `this`), cuyo `.value`/`.isDisabled` SÍ están unwrapped (probado por ActivityStatusBadgeElement con `this.value`). Para read-only en view hay que setear `disabled:true` explícito en el layout (Vueform no lo deriva del mode). Los tests unit del mod no atrapan esto porque llaman a los helpers puros con objetos planos, nunca al element real — solo el smoke runtime lo detecta (por eso TC-01/TC-03 son smoke/Affects-UI). |
| 183 | S2 r1: leer value/disabled vía el PROXY del element (`element.el$.value`, equivale a Options-API `this`) + watch sobre `proxy.value`, asumiendo que el proxy expone el value unwrapped y reactivo (como ActivityStatusBadgeElement con `this.value`). S2 r2: helper `unwrapMaybeRef` para desenvolver `element.value` tratándolo como Ref, + watch `() => readLoadedValue(proxy())`. | Smoke del dev: en r1 el view SÍ pasó a read-only (isDisabled se resolvía), pero el VALOR seguía sin hidratar ("sin color/ícono", edit sin selección). En r2 tampoco hidrató. El proxy `element.el$.value` y el unwrap de `element.value` no entregan el valor cargado del registro en setup. La asimetría (isDisabled funcionaba, value no) confirmó que el valor llega por otra vía. | El valor cargado de un custom Vueform element NO llega por `element.value` ni por el proxy `element.el$.value`, sino por `props.default` (ver L3). El proxy fue un red herring para el VALUE (sí sirve conceptualmente para isDisabled, pero `element.isDisabled` crudo + resolveDisabled ya bastaba). La lección general: para hidratar, declarar y leer la prop `default`; el read-only se resuelve aparte (disabled en layout + isReadonly). |

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-25 | (nuevo) → super | dev: sesión en super autopilot (follow-up de TICKET-096) | intake |

### Plan de sessions (preplanificacion)

1 session prevista. Detalle en `design-fix`.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Hidratación (onMounted re-read) + modo read-only `isReadonly` DENTRO de cada picker + cablear view a los types + tests de ambos modos | 1 | T2 | onMounted+isReadonly ColorPicker, idem IconPicker, cablear view + tests | ⚑ fuerte | dual-judge APPROVED; hidratación (smoke dev); view muestra chip/glifo read-only; ambos modos testeados; vitest sin regresión |
| S2 | CORRECCIÓN (smoke S1 falló): leer value/disabled vía el PROXY del element (`element.el$.value`, no `context.element` crudo) en ambos pickers + `disabled:true` en el layout view para que Vueform marque isDisabled | execute | T2 | proxy-read ColorPicker, idem IconPicker, layout view disabled:true + ajustar tests | ⚑ fuerte | smoke dev OK (hidrata edit + read-only view); vitest sin regresión |

**Notas del esqueleto**:
- A (hidratación) requiere **iteración con smoke del dev** (el modal no se monta en vitest) — la lógica `onMounted` re-read se implementa pero su validación final es el smoke.
- B (read-only) es un MODO del mismo picker (no componente nuevo): `isReadonly` desde `element.isDisabled` → render swatch+label / glifo+nombre. El view reusa `color-picker`/`icon-picker` (revierte DEC-LOCAL-03).

### Session 1 — 2026-06-25 — Hidratación (onMounted) + modo read-only en los pickers + cablear view [phase: execute]

**Tipo:** ⚑ fuerte (dual-judge)
**Validation tier:** T2

**Tasks completadas**:
- [x] S1.T1 — ColorPicker: `onMounted` re-read + `resolveDisabled`/`isReadonly` + render read-only (chip color + label, aria-label) cuando isReadonly
- [x] S1.T2 — IconPicker: `onMounted` re-read + `isReadonly` + render read-only (glifo + nombre, aria-label) cuando isReadonly
- [x] S1.T3 — Cablear `view` a los types (revierte DEC-LOCAL-03) + tests (resolveDisabled bool/ref, render read-only a11y, ambos modos) + guías
- [x] S1.GATE — Gate de sync Session 1 (tier T2, dual-judge DET-35)

**Gate decision:** (approvedBy: autopilot)

- [ ] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → S1 código completo y validado: hidratación onMounted (REQ-FIX-01) + modo read-only en pickers (REQ-FIX-02) + view cableado (revierte DEC-LOCAL-03). Dual-judge DET-35 APPROVED (ambos jueces); vitest 862/862 (baseline 844, +18); ESLint exit 0; TS 75==baseline (0 nuevos). Commits locales mod: c1460c6 fix / 7bca203 test / b23f939 docs. PENDIENTE smoke DB-gated (dev, TC-01/TC-03 Affects UI, no reproducible en vitest): npm run sync + reinicio OM/suite + abrir edit de una línea con color/icono (debe hidratar) + abrir view (chip de color + glifo, no texto). Tras smoke OK: push (pregunta) + request-close (teach-close).

### Session 2 — 2026-06-26 — CORRECCIÓN tras smoke S1 (proxy del element + disabled en view) [phase: execute]

**Tipo:** ⚑ fuerte (dual-judge)
**Validation tier:** T2

**Motivo:** el smoke del dev sobre S1 falló (ver Failed approaches): (1) edición no hidrataba — `context.element.value` es un Ref sin unwrap; (2) view no era read-only — Vueform no deriva `isDisabled` del `mode:"view"`. Causa raíz + fix en learn L2.

**Tasks completadas**:
- [x] S2.T1 — ColorPicker: leer value/disabled/update vía el PROXY (`element.el$.value`) + watch `() => el$.value.value` (immediate) para hidratar
- [x] S2.T2 — IconPicker: idem proxy-read
- [x] S2.T3 — Layout view `disabled:true` en color/icon (Vueform marca isDisabled → isReadonly) + ajustar/añadir tests del wiring
- [x] S2.GATE — Gate de sync Session 2 (tier T2, dual-judge DET-35) + smoke dev

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Smoke dev OK (hidratación edit + read-only view + modal + sin-eliminar confirmados visualmente). Fix real: props.default. Dual-judge DET-35: A APPROVED, B WARNING por doc-staleness (resuelto: guías Valor/Props corregidas). 875/875 vitest, TS 75==baseline, ESLint 0. Learns procesados: L2 superseded, L3 promoted → RULE-019 refinada + RULE-021 nueva.
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-FIX-01 | TC-02 (auto), TC-01 (smoke) | auto + smoke | TC-02 COVERED; TC-01 smoke DB-gated pendiente |
| REQ-FIX-02 | TC-04 (auto+axe), TC-03 (smoke) | auto + smoke | TC-04 COVERED; TC-03 smoke DB-gated pendiente |
| REQ-REGRESSION | suite mod | auto | COVERED (862/862) |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status | Affects UI |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|-----------|
| TC-01 | Edit hidrata color/ícono guardado al abrir el modal | REQ-FIX-01 | smoke | línea con valores | abrir edit | swatch+ícono guardados marcados al abrir | swatch/ícono guardado resaltado al abrir edición (vía `props.default`) | smoke dev S2 (captura) | pass | yes |
| TC-02 | Lógica de hidratación lee el valor cargado (readValue = props.default ∥ readLoadedValue) | REQ-FIX-01 | auto | element con value/default | mount | selected = valor cargado | readLoadedValue desenvuelve Ref + fallback form$; resolveElementProxy; props.default primario (en componente) | vitest 875/875 (color/icon-picker.test.ts) | pass | no |
| TC-03 | En modo view el picker rinde read-only (chip color / glifo ícono), no la grilla ni texto | REQ-FIX-02 | smoke | línea con valores, layout view | abrir view | chip de color + glifo; sin grilla editable | chip "Secundario" + glifo "book-half" read-only, alineado, sin grilla; modal + sin eliminar | smoke dev S2 (captura) | pass | yes |
| TC-04 | `resolveDisabled`/`isReadonly` resuelve el modo desde `element.isDisabled` (bool y ref-wrapped) + render read-only accesible | REQ-FIX-02 | auto (+axe) | element disabled | resolveDisabled + axe sobre DOM read-only | resolveDisabled true/false (bool y {value:bool}); render read-only role=img+aria-label, 0 axe, sin grilla/listbox | color/icon-picker-a11y.test.ts (12+12) + resolveDisabled en *.test.ts | pass | yes |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| (se definen en execute) | — | — | — | vitest3 + axe-core |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| mod curriculum-design | `npm run test` (en mods/curriculum-design) | 844/844 (post TICKET-096) | 875/875 | +31 (resolveDisabled, findSwatch, resolveElementProxy, unwrapMaybeRef, render read-only a11y, ícono fuera de curados) |

## Summary

**Cerrado 2026-06-26.** Dos comportamientos resueltos en los pickers (ColorPicker/IconPicker) de `requirementCategory`, layer:mod, solo `mods/curriculum-design/`.

**Qué se entregó:**
- **Hidratación al editar (REQ-FIX-01)**: el valor guardado del registro ahora resalta al abrir edición. Fix real = leer **`props.default`** (Vueform inyecta ahí el valor cargado; patrón `EnumValuesEditorElement`). `readValue = props.default ∥ readLoadedValue(proxy())` en init + `watch` immediate.
- **Read-only en view (REQ-FIX-02)**: el color se muestra como chip + label y el ícono como glifo + nombre, read-only, accesible (`role=img`/`aria-label`), alineado con los inputs hermanos. Activado por **`disabled:true`** en `default_requirementCategory_view.json` → `isReadonly` (Vueform no deriva isDisabled del `mode:"view"`). Revierte DEC-LOCAL-03 de TICKET-094.
- **UX extra (pedido del dev en S2)**: líneas de formación abren en **modal** (`openMode:"modal"`) y **sin eliminar** (`canDelete:false`) en los embeds `requirementCategoriesList` de Curriculum view+edit. Ícono fuera del set curado se prepone como primero y queda seleccionado.

**El camino (failed approaches):** intake propuso `onMounted` re-read (S1) → S2 probó proxy `element.el$.value` y unwrap del Ref de `element.value`; ninguno hidrataba. La asimetría (read-only OK / valor vacío) llevó a `props.default`. El wiring no lo atrapa el unit test (helpers puros) — lo detectó el smoke del dev.

**Conocimiento capturado:** RULE-019 refinada (hidratación=`props.default`), RULE-021 nueva (read-only/view dual-mode), learns L1-L3, failed approaches, guías color/icon corregidas, teach-close.html.

**Validación:** 875/875 vitest (baseline 844), TS 75==baseline (0 nuevos), ESLint 0, axe 0; smoke del dev confirmado visualmente (captura). Commits mod: S1 `c1460c6`/`7bca203`/`b23f939`, S2 `0632042`/`8345b47`/`7c4e1f1`/`f1407ee`.

**Pendiente fuera de alcance:** push de la rama `UPONE-1267-sp5` a remoto (gated, lo decide el dev) + merge a develop tras revisión del team up1 (RULE-dev-004). Follow-up opcional: i18n de nombres de ícono (L1); simplificar la maquinaria proxy/unwrap si se confirma que `props.default` es universal.
