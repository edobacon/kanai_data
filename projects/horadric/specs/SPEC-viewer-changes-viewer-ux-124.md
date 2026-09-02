---
id: SPEC-viewer-changes-viewer-ux-124
project: horadric
ticket: HOR-124
status: done
---

# Navegador de cambios más amigable y con más valor que el diff crudo

# Navegador de cambios más amigable y con más valor que el diff crudo

## Executive summary — lo que estas aprobando

**Que se quiere**: El navegador de cambios de HOR-123 muestra diffs pero deja al dev sin contexto ("¿qué abarcan todos estos cambios?") y con scroll manual costoso en archivos largos. HOR-124 lo vuelve un visor con valor semántico: un header que dice qué cambia el ticket, navegación entre cambios con flechas (con salto entre archivos), atribución de cada bloque a la sesión DKC que lo introdujo, stats del diff y controles de visualización. Más dos fixes de UX que molestan hoy: el popup de sesión queda tapado por el topbar en fullscreen, y el verde de añadidos compite con el texto.

**Decisiones críticas que necesitan tu OK** (auto-aprobadas en super, con racional):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Tema Monaco propio `dkc-diff-soft` (override de `diffEditor.inserted*`/`removed*`) en vez de tocar el `vs-dark` global | Aísla el cambio de contraste al diff; reversible y sin afectar otros editores |
| 2 | Navegación y stats salen de `getLineChanges()` de Monaco (una sola fuente), no de un parser propio del diff | Menos código, consistente con lo que Monaco renderiza; el salto entre archivos se resuelve con un evento hijo→padre |
| 3 | Atribución de sesión inline se construye sobre el blame existente (`applyBlameDecorations` + `SessionSummary.objective`), sin endpoint nuevo | Reuso máximo; no toca backend ni datos |
| 4 | Topbar del comparador se extrae a un componente compartido entre `ChangesNavigator` y `TicketChangesPanel` | Hoy está duplicado; las mejoras deben aplicarse una sola vez (DET-32 reuso) |

**Riesgos principales y como los mitigamos**:

- **El salto entre archivos rompe el race-guard de polling (RULE-viewer-polling-001)** → la selección del archivo vecino pasa por el mismo path de selección existente (no fetch ad-hoc); verificar en browser real que no hay doble fetch.
- **El override del tema degrada legibilidad en algún lenguaje** → verificar contraste en TS/Vue/CSS/MD en server+browser real, no solo vitest.
- **Atajos de teclado chocan con inputs (search, filtros)** → escuchar solo cuando el foco está en el panel de diff; respetar `input`/`textarea`.

**Que NO se hace en este ticket**:

- Backlog heredado de HOR-123 (BL-3 reconnect SSE, BL-4 test path/tooltip, BL-5 grep anclado, BL-6 scan "Otros") — no se solapan; siguen en su backlog.
- Persistencia server-side de preferencias de visualización — los toggles viven en UI state (localStorage a lo sumo), sin endpoint.
- Edición de archivos: el visor sigue read-only (REQ-PRESERVE-01).

**Tamano estimado**: 4 sessions ejecutables (S1-S4), ~6-9h efectivas. La más riesgosa es S3 (navegación con salto entre archivos: coordinación hijo→padre + Monaco runtime).

**Como vas a saber que funciona**:
- Abro el tab de cambios de un ticket y veo arriba qué abarca el ticket; el verde de añadidos deja leer el texto.
- Con las flechas recorro cambio por cambio; al llegar al último de un archivo, salto al siguiente; al inicio, al anterior.
- Sobre cada bloque veo qué sesión lo introdujo; veo el contador "cambio N/M" y las líneas +/−.
- En fullscreen, abro el popup de sesión y queda por encima del topbar.

---

## Purpose

Extender el navegador de cambios (SPEC-viewer-ide-changes-navigator-123) con affordances de UX y contexto semántico sobre la misma arquitectura (Monaco DiffEditor read-only, blame por sesión, payload `/changes`). Todo frontend; sin cambios de backend, API ni datos. Dos fixes (z-index, contraste de diff) + cuatro mejoras de valor + navegación entre cambios.

## Requirements

### REQ-IMPROVE-01: Header semántico de contexto del ticket

> **Que cambia**: Sobre el diff aparece una banda con el título del ticket y su request/objetivo, para que el dev entienda qué abarcan todos los cambios antes de leer paths.
> **Por que**: Hoy el topbar solo muestra `{repo}/{path}`; el dev no tiene contexto de por qué existe el conjunto de cambios.

El sistema MUST renderizar, sobre el panel de diff (en navegador standalone y panel scoped a ticket), un header con el `id` del ticket, su título y un resumen del request/objetivo. El header SHOULD ser colapsable para no robar altura en archivos largos.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: header con contexto real
- **GIVEN** un ticket con request poblado seleccionado en el navegador
- **WHEN** se monta el panel de cambios
- **THEN** el header muestra `{id} — {título}` y el resumen del request del ticket

#### Scenario: colapso
- **GIVEN** el header expandido
- **WHEN** el usuario lo colapsa
- **THEN** el diff gana la altura del header y el estado persiste mientras dure la sesión de UI
</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el tab de cambios de un ticket y lee arriba qué abarca el ticket sin salir de la vista.

### REQ-FIX-02: Popup de sesión por encima del topbar en fullscreen

> **Que cambia**: En vista fullscreen, el popup que muestra el objetivo de la sesión (tooltip de `SessionFilterChips` al hacer hover sobre un chip de sesión) deja de quedar tapado por el topbar del comparador.
> **Por que**: Los chips de sesión viven pegados arriba del panel; el tooltip se abría hacia arriba (`bottom-full`) y caía en la franja del topbar opaco del overlay (dentro de un `overflow-hidden`), quedando tapado/clippeado.

El sistema MUST renderizar el tooltip de objetivo de sesión completo y por encima del topbar del overlay en vista fullscreen. Solución: el tooltip cae hacia abajo (`top-full`) — donde siempre hay espacio (lista de archivos) — con z-index por encima de los chips vecinos y del topbar.

> **Corrección de S1** (verificado en browser): el "popup sobre la sesión" del request es el tooltip de `SessionFilterChips`, NO el `SessionDetailModal` (que no se abre desde el panel de cambios — lo abren las tablas de la pestaña Sessions). El target inicial inferido en design era incorrecto; corregido en execute (DET-33). Ver learn L1.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: modal sobre overlay
- **GIVEN** el navegador de cambios en fullscreen
- **WHEN** el usuario abre el detalle de una sesión
- **THEN** el modal y su backdrop cubren el topbar del overlay (no quedan parcialmente tapados)
</details>

#### Acceptance
**El usuario puede verificar que funciona**: en fullscreen, abre el popup de sesión y lo ve completo sobre el topbar.

### REQ-IMPROVE-03: Colores de diff suavizados (contraste de texto)

> **Que cambia**: El fondo verde de líneas añadidas (y rojo de eliminadas) se atenúa para que el texto del código destaque.
> **Por que**: Con el `vs-dark` default, el fondo de añadido y el texto tienen tonos similares y cuesta leer.

El sistema MUST aplicar al DiffEditor un tema con `diffEditor.insertedLineBackground`/`insertedTextBackground` (y los `removed*`) atenuados, preservando legibilidad del texto en los lenguajes usados (ts, vue, css, md, json).

**Actor**: user
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: abre un diff con líneas añadidas y lee el código con claridad; el verde se percibe como realce suave, no como bloque.

### REQ-IMPROVE-04: Navegación entre cambios con salto entre archivos

> **Que cambia**: En el topbar aparecen flechas ▲/▼ que llevan al cambio anterior/siguiente, con un contador "cambio N/M". En el último cambio, ▼ salta al primer cambio del siguiente archivo; en el primero, ▲ va al último cambio del archivo anterior.
> **Por que**: Con mucho código entre cambios, el scroll manual es costoso; navegar por cambios es lo natural en un visor de diffs.

El sistema MUST proveer controles de navegación que usen `IDiffEditor.goToDiff('next'|'previous')` y `getLineChanges()` para moverse entre cambios y mostrar índice/total. Al estar en el primer/último cambio del archivo, el sistema MUST delegar al navegador la selección del archivo vecino (según el orden de la lista) y posicionar el cursor en el primer/último cambio respectivamente. Si no hay archivo vecino, el control SHOULD quedar deshabilitado.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: navegación dentro del archivo
- **GIVEN** un archivo con varios cambios
- **WHEN** el usuario pulsa ▼
- **THEN** el editor revela el siguiente cambio y el contador avanza

#### Scenario: salto al siguiente archivo
- **GIVEN** el cursor en el último cambio del archivo y hay archivo siguiente
- **WHEN** el usuario pulsa ▼
- **THEN** se selecciona el siguiente archivo y el cursor queda en su primer cambio

#### Scenario: límite sin vecino
- **GIVEN** el último cambio del último archivo
- **WHEN** el usuario pulsa ▼
- **THEN** el control queda sin efecto (deshabilitado), sin error
</details>

#### Acceptance
**El usuario puede verificar que funciona**: recorre todos los cambios de un ticket con las flechas, cruzando de archivo a archivo sin scrollear a mano.

### REQ-IMPROVE-05: Atribución de sesión inline por bloque de cambio

> **Que cambia**: Sobre cada bloque de cambio se muestra, de forma discreta, qué sesión DKC lo introdujo y su objetivo.
> **Por que**: Conecta el "qué cambió" con el "por qué" — el dev entiende la intención sin abrir el detalle de la sesión.

El sistema MUST mostrar, asociada a los bloques de cambio del lado modificado, la sesión DKC atribuida (reusando el blame por sesión existente) y su `objective` (de `SessionSummary`). La presentación MUST reusar el color por sesión del blame para coherencia. Cuando una línea no tiene sesión atribuida, NO MUST mostrar etiqueta.

**Actor**: user
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: en un diff de un ticket con varias sesiones, ve sobre los bloques el objetivo de la sesión que los produjo.

### REQ-IMPROVE-06: Resumen y estadísticas del diff

> **Que cambia**: Aparecen líneas añadidas/eliminadas por archivo y totales del ticket, un badge de estado por archivo (A/M/D) y un contador del cambio actual.
> **Por que**: Da panorama del tamaño y tipo de los cambios antes y durante la lectura.

El sistema MUST mostrar, por archivo, el conteo de líneas añadidas/eliminadas y un badge de estado (Added/Modified/Deleted); y los totales agregados del ticket en la columna de archivos. El conteo del archivo abierto MUST derivarse de `getLineChanges()`; los totales y el estado MAY derivarse del payload `/changes` existente.

**Actor**: user
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: ve `+N −M` por archivo, el total del ticket y el badge A/M/D, y el contador "cambio N/M" del archivo abierto.

### REQ-IMPROVE-07: Controles de visualización del diff

> **Que cambia**: Toggles para alternar inline ↔ side-by-side, ocultar regiones sin cambios y activar word-wrap.
> **Por que**: Distintos diffs se leen mejor con distinta presentación; hoy es fijo side-by-side sin wrap.

El sistema MUST proveer controles que ajusten el DiffEditor: `renderSideBySide`, `hideUnchangedRegions.enabled` y `wordWrap`. El estado de los toggles SHOULD persistir durante la sesión de UI (p.ej. localStorage). Los cambios MUST aplicarse sin remmontar el editor de forma que rompa blame/decoraciones.

**Actor**: user
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: alterna inline/side-by-side, oculta regiones sin cambios y activa wrap, y el diff responde sin perder el blame.

### REQ-IMPROVE-08: Atajos de teclado y búsqueda en el diff

> **Que cambia**: Teclas para ir al cambio anterior/siguiente (n/p o j/k) sincronizadas con las flechas, y el find widget de Monaco para buscar dentro del archivo.
> **Por que**: Navegación y búsqueda sin mouse aceleran la revisión.

El sistema MUST mapear atajos de teclado para la navegación de cambios (equivalentes a las flechas de REQ-IMPROVE-04) y MUST habilitar el find widget de Monaco en el editor modificado. Los atajos MUST activarse solo cuando el foco está en el panel de diff y NO MUST dispararse mientras el foco está en inputs de texto (search, filtros).

**Actor**: user
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: navega cambios con teclado y busca texto dentro del diff sin tocar el mouse.

### REQ-PRESERVE-01: No romper el navegador de HOR-123

> **Que cambia**: Nada — es una garantía de regresión.
> **Por que**: HOR-124 es aditivo sobre una vista entregada y verificada.

El sistema MUST preservar el tab `#changes`, la vista fullscreen, el blame por sesión, el working-tree SSE y la navegación repo→ticket→archivo de HOR-123, y mantenerse read-only. La suite vitest del viewer MUST seguir verde y el type-check/build en 0.

**Actor**: system
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: el flujo de HOR-123 sigue funcionando idéntico; vitest/tsc/build verdes.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | La navegación entre cambios no introduce lag perceptible | tiempo a revelar cambio | < 100ms (operación in-editor, sin fetch) |
| Maintainability | Topbar y stats no duplican lógica entre navegador y panel scoped | componentes compartidos | 1 fuente para topbar + 1 para stats |

## Artifacts

Sin meta-specs. Componentes y composables ad-hoc (frontend Vue):

### Componentes / composables

| Elemento | Tipo | Acción | Propósito |
|----------|------|--------|-----------|
| `ChangeContextHeader.vue` | componente | crear | Header semántico del ticket sobre el diff (REQ-01) |
| `DiffToolbar.vue` | componente | crear | Topbar compartido: path + navegación + contador + toggles (REQ-04/06/07/08); reemplaza el topbar duplicado |
| `dkc-diff-soft` (theme) | tema Monaco | crear | Tema con colores de diff atenuados (REQ-03) |
| `useDiffNavigation.ts` | composable | crear | Envuelve `goToDiff`/`getLineChanges`, índice/total, detección de límite + evento cross-file (REQ-04/08) |
| `MonacoDiffPanel.vue` | componente | extender | Tema custom, navegación, stats, toggles, atribución inline |
| `ChangesNavigator.vue` | componente | extender | Montar header + DiffToolbar; manejar cross-file y totales |
| `TicketChangesPanel.vue` | componente | extender | Idem para el panel scoped a ticket |
| `SessionDetailModal.vue` / `ChangesFullscreenOverlay.vue` | componente | ajustar | z-index del modal por encima del overlay (REQ-02) |

## Tasks

### Session 1 — Fixes de base: z-index + tema Monaco suavizado [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Que el popup de objetivo de sesión (tooltip de `SessionFilterChips`) no quede tapado por el topbar en fullscreen: cae hacia abajo (`top-full`) + z por encima del topbar y chips vecinos. (Target corregido en execute: era el tooltip de chips, no `SessionDetailModal` — DET-33) | REQ-FIX-02 | developer | — | src/components/changes/SessionFilterChips.vue | manual (browser: hover chip en fullscreen) + vitest | git revert | DET-5, RULE-viewer-001 | done | 1 |
| S1.T2 | Definir tema Monaco `dkc-diff-soft` (`monaco.editor.defineTheme`) con `diffEditor.inserted*`/`removed*` atenuados y aplicarlo en `createDiffEditor`; verificar contraste en ts/vue/css/md | REQ-IMPROVE-03 | developer | — | src/monaco-diff-theme.ts (nuevo), src/components/changes/MonacoDiffPanel.vue | manual (browser: leer diff) + vitest + type-check | git revert | DET-5, RULE-viewer-001 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions`, correr vitest+type-check, verificar en server+browser real, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decisión documentada | (no aplica) | DET-20, DET-23, DET-33 | pending | 1 |

### Session 2 — Valor semántico: header de contexto + stats del diff [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `ChangeContextHeader.vue` (id+título+request del ticket, colapsable) y montarlo sobre el diff en navegador y panel scoped | REQ-IMPROVE-01 | developer | S1.GATE | src/components/changes/ChangeContextHeader.vue (nuevo), src/components/changes/ChangesNavigator.vue, src/components/changes/TicketChangesPanel.vue | vitest (render con props) + manual browser | git revert | DET-5, DET-32, RULE-viewer-001 | done | 2 |
| S2.T2 | Stats del diff: +/− del archivo abierto vía `getLineChanges()`, totales del ticket + badge A/M/D desde payload `/changes`, contador "cambio N/M" | REQ-IMPROVE-06 | developer | S1.T2 | src/components/changes/MonacoDiffPanel.vue, src/components/changes/ChangesNavigator.vue, src/components/changes/TicketChangesPanel.vue, src/composables/useTicketChanges.ts | vitest (cálculo de stats) + manual browser | git revert | DET-5, DET-32, RULE-viewer-polling-001 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, vitest+type-check, verificar browser real, decidir | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-23, DET-33 | pending | 2 |

### Session 3 — Navegación entre cambios + atajos + find [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | `useDiffNavigation.ts`: envolver `goToDiff`/`getLineChanges`, exponer índice/total y prev/next; cablear flechas en `DiffToolbar` | REQ-IMPROVE-04 | developer | S2.GATE | src/composables/useDiffNavigation.ts (nuevo), src/components/changes/DiffToolbar.vue (nuevo), src/components/changes/MonacoDiffPanel.vue | vitest (lógica índice/límite) + manual browser | git revert | DET-5, DET-32 | done | 3 |
| S3.T2 | Salto entre archivos en los límites: emitir evento cross-file al estar en primer/último cambio; el parent selecciona el archivo vecino y posiciona el cursor; deshabilitar si no hay vecino | REQ-IMPROVE-04 | developer | S3.T1 | src/components/changes/MonacoDiffPanel.vue, src/components/changes/ChangesNavigator.vue, src/components/changes/TicketChangesPanel.vue | manual browser (cruce en ambos sentidos) + vitest | git revert | DET-5, RULE-viewer-polling-001 | done | 3 |
| S3.T3 | Atajos de teclado (n/p, j/k) sincronizados con las flechas, gateados al foco del panel (no en inputs); habilitar find widget de Monaco | REQ-IMPROVE-08 | developer | S3.T1 | src/components/changes/MonacoDiffPanel.vue, src/composables/useDiffNavigation.ts | vitest + manual browser | git revert | DET-5 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir, vitest+type-check+build, verificar browser real (cruce de archivos + race-guard), decidir | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-23, DET-33, RULE-viewer-polling-001 | pending | 3 |

### Session 4 — Controles de visualización + atribución de sesión inline [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Controles de visualización en `DiffToolbar`: toggle inline/side-by-side, ocultar regiones sin cambios, word-wrap; aplicar al editor sin romper blame; persistir en localStorage | REQ-IMPROVE-07 | developer | S3.GATE | src/components/changes/DiffToolbar.vue, src/components/changes/MonacoDiffPanel.vue, src/composables/useDiffNavigation.ts | vitest + manual browser | git revert | DET-5, DET-32 | done | 4 |
| S4.T2 | Atribución de sesión inline por bloque (objetivo de la sesión vía blame + `SessionSummary.objective`), reusando color por sesión; sin etiqueta si no hay sesión | REQ-IMPROVE-05 | developer | S4.T1 | src/components/changes/MonacoDiffPanel.vue | vitest + manual browser | git revert | DET-5, DET-32, RULE-viewer-001 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — persistir, vitest+type-check+build, regresión completa + smoke UI (REQ-PRESERVE-01), verificar browser real, decidir cierre | — | reviewer | S4.T1, S4.T2 | ticket | gate persistido + decisión + regresión verde | (no aplica) | DET-20, DET-23, DET-33, DET-7 | pending | 4 |

### Task contract (resumen)

Cada task del developer aplica: leer el código existente antes de modificar (análisis de impacto), respetar `RULE-viewer-polling-001` (invalidar antes de fetch + race-guard) en cualquier path que re-seleccione archivo, y `RULE-viewer-001` (código cross-layer en `shared/`). Verificación independiente del self-report (DET-33) por el orquestador en cada GATE: vitest re-corrido, type-check exit 0, server real + browser para lo que vitest no atrapa (runtime Monaco).

## Constraints

- RULE-viewer-polling-001: invalidar data antes de fetch + race-guard — aplica al salto entre archivos (no debe disparar doble fetch ni condición de carrera).
- RULE-viewer-001: código cross-layer va en `shared/` — aplica si la lógica de stats/navegación necesita compartirse con el server (no se anticipa, pero si surge regex/util compartida va a `shared/`).
- DEC-004 (HOR-123): Monaco usa workers vía Vite — el tema y los toggles no deben alterar el setup de workers.

## Gate de necesidad/reuso (DET-32)

Cascada barato-primero por artifact/REQ. Veredicto registrado vía `dkc-record-decision --step necessity-assessment`.

| Artifact / REQ | ¿Necesita existir? | ¿Ya existe en KB/código? | ¿Lo da framework/dep? | ¿Config/cambio mínimo? | Veredicto |
|----------------|--------------------|--------------------------|------------------------|------------------------|-----------|
| REQ-FIX-02 z-index | sí (bug visible) | — | — | sí (subir z-index del modal) | **reduce** (cambio mínimo de clase) |
| REQ-IMPROVE-03 tema | sí | no hay tema custom | Monaco `defineTheme` | — | **build** (tema sobre API nativa) |
| REQ-IMPROVE-04 navegación | sí | no | Monaco `goToDiff`/`getLineChanges` | — | **reuse+build** (API nativa + composable de límites) |
| REQ-IMPROVE-06 stats | sí | payload `/changes` ya trae files | Monaco `getLineChanges` para +/− abierto | — | **reuse** (datos existentes + API nativa) |
| REQ-IMPROVE-05 atribución | sí | blame por sesión ya existe (`applyBlameDecorations`, `SessionSummary.objective`) | — | — | **reuse** (sobre blame existente, sin endpoint) |
| REQ-IMPROVE-07 controles | sí | no | opciones nativas del DiffEditor (`renderSideBySide`, `hideUnchangedRegions`, `wordWrap`) | sí (setOptions) | **reuse** (opciones nativas) |
| REQ-IMPROVE-08 atajos+find | sí | no | find widget nativo de Monaco | — | **reuse+build** (find nativo + listener de atajos) |
| REQ-IMPROVE-01 header | sí | datos del ticket ya en payload detail | — | — | **build** (componente nuevo sobre datos existentes) |
| `DiffToolbar.vue` (topbar compartido) | sí | topbar duplicado en 2 componentes | — | — | **build** (extrae duplicación — DET-32 anti-duplicación) |

Resumen: 3 build / 4 reuse / 1 reduce / 0 drop. Reuso fuerte de Monaco nativo (goToDiff, getLineChanges, hideUnchangedRegions, find, defineTheme), del blame por sesión y del payload `/changes`.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| monaco-editor 0.55.1 | external | `goToDiff`, `getLineChanges`, `defineTheme`, `hideUnchangedRegions`, find widget | API estable confirmada en monaco.d.ts; bajo |
| Payload `/changes` + `SessionSummary` | internal | files, blame por sesión, objective | ya entregado en HOR-123; bajo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Salto entre archivos dispara doble fetch / race | medium | medium | Reusar el path de selección existente (no fetch ad-hoc); verificar network en browser real |
| Override de tema reduce legibilidad en algún lenguaje | low | medium | Verificar contraste en ts/vue/css/md en browser; ajustar opacidades |
| Atajos chocan con inputs de la app | medium | low | Gatear por foco del panel; ignorar input/textarea |
| Toggle de opciones remonta el editor y pierde blame | medium | medium | Usar `updateOptions`/`setModel` sin recrear; re-aplicar decoraciones de blame tras el cambio |

## Open questions

(ninguna — H4/H5 resueltas en intake-explore; approach de atribución inline: view zone vs decoración, se decide en S4.T2 con el código a la vista)

## Decisions

### DEC-LOCAL-01: Tema Monaco propio en vez de tocar vs-dark global
- **Contexto**: REQ-IMPROVE-03 pide suavizar el verde sin afectar otros editores.
- **Drivers**: aislamiento, reversibilidad, no romper otros usos de Monaco.
- **Opcion elegida**: `defineTheme('dkc-diff-soft', ...)` con override de `diffEditor.*`.
- **Alternativas**: editar reglas CSS globales del diff (frágil, afecta todo); cambiar `vs-dark` (global, riesgoso).
- **Consecuencias**: cambio acotado y reversible; se aplica solo al DiffEditor del navegador.
- **Session**: design (pre-S1).

### DEC-LOCAL-02: Topbar extraído a DiffToolbar compartido
- **Contexto**: el topbar está duplicado en `ChangesNavigator` y `TicketChangesPanel`.
- **Drivers**: DET-32 anti-duplicación; las mejoras (nav/stats/toggles) deben aplicarse una vez.
- **Opcion elegida**: crear `DiffToolbar.vue` consumido por ambos.
- **Alternativas**: duplicar las mejoras en ambos topbars (deuda).
- **Consecuencias**: un punto de cambio; ligero refactor inicial en S2/S3.
- **Session**: design (pre-S1).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..08 + REQ-FIX-02 pasan
- [ ] **Tests**: vitest del viewer verde; tests nuevos para navegación/stats
- [ ] **NFRs**: navegación in-editor < 100ms; topbar/stats sin duplicación
- [ ] **Rules**: RULE-viewer-polling-001 y RULE-viewer-001 respetadas
- [ ] **Integration**: REQ-PRESERVE-01 — tab #changes, fullscreen, blame, SSE intactos; build 0
- [ ] **Docs**: n/a (sin docs externos)

## Technical reference

- Monaco 0.55.1: `IDiffEditor.goToDiff('next'|'previous')` (`monaco.d.ts:6466`), `getLineChanges(): ILineChange[]` (`:6458`), `defineTheme`, `updateOptions({ renderSideBySide, hideUnchangedRegions: { enabled }, wordWrap })`, find widget (`actions.find` / `accessibleDiffViewer`).
- Blame existente: `MonacoDiffPanel.vue:98-137` (`applyBlameDecorations`, `sessionClass()`), estilos `:285-345`.
- Config actual del editor: `MonacoDiffPanel.vue:160-180`.
- Topbar actual: `ChangesNavigator.vue:536-540`, `TicketChangesPanel.vue:407-411`.
- Fullscreen/modal: `ChangesFullscreenOverlay.vue:54-90` (z-50), `SessionDetailModal.vue:240-261` (z-50).
- `SessionSummary.objective`: `src/api/client.ts:404`.

## Rules discovered

(se llena durante execute)

## Bugs found

(se llena durante execute)
