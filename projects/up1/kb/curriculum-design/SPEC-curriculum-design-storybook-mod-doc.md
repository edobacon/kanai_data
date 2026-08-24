---
id: SPEC-curriculum-design-storybook-mod-doc
project: up1
module: curriculum-design
status: done
ticket: TICKET-016
meta_specs: []
created: '2026-05-11'
updated: '2026-05-11'
tags:
  - storybook
  - documentation
  - tooling
  - mods
depends_on: []
---

# Documentar custom components del mod curriculum-design con Storybook propio del mod

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Changes, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: documentar los dos custom Vueform elements del mod `curriculum-design` (`CompositeSectionTree` — arbol de secciones del Programa de Asignatura; `RichTextRenderer` — renderer HTML sanitizado) con stories que vivan en el mod + un Storybook propio del mod en puerto `6010`. Una eventual consolidacion en el Storybook central de `up1/layout/` queda postergada: hoy alcanza con doc visible localmente en el mod; consolidar al central requeriria coordinacion con platform UP1 cuando se identifique conveniencia.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Stories del mod en `mods/curriculum-design/modsComponents/<Component>/<Component>.stories.ts` con patron Vueform canonico del proyecto (`<Vueform :schema>` con `type: '<kebab-case>'`, sin importar el componente directo) | Cualquier otra ubicacion rompe `mods → core` (RULE-mods-001); el patron Vueform canonico (referencia: `up1/layout/src/components/vueform/atoms-vueform/Toggle-vueform/Toggle.stories.ts`) es lo validado del proyecto |
| 2 | Storybook propio del mod en puerto `6010`. `.storybook/` + `vueform.config.ts` local + devDeps en `package.json` del mod alineados con `retention-wellbeing` | El mod queda self-contained con su tooling de doc visual; no depende de la config del Storybook central del workspace `layout/` |
| 3 | `npm install` del mod corre con `--no-workspaces` para preservar el monorepo (`up1/package-lock.json` intacto) | Memoria del proyecto: "monorepo se mantiene limpio" — `curriculum-design` itera en su repo independiente, no contamina el lock del monorepo |

**Riesgos principales y como los mitigamos**:

- **Imports rotos al levantar storybook propio** (peerDeps del mod no resolubles, o `vueform.config.ts` no encuentra los `.vue` por path) → S2.T(b) valida empiricamente con `npm run storybook`. Si falla: diagnostico + tasks adicionales antes de cerrar el gate
- **Conflicto del puerto `6010` con otro servicio local del dev** → fix simple: cambiar puerto en el script `storybook` del `package.json`. No critico
- **`npm install --no-workspaces` termina modificando el monorepo lock** → S2.T(a) verifica con `git status` del monorepo despues del install. Si modifica: revertir el lock y abortar; agregar task de aislamiento alternativo

**Que NO se hace en este ticket**:

- Cambio en `up1/layout/.storybook/main.ts` (config del Storybook central — postergado; eventualmente coordinable con platform UP1 si se identifica conveniencia)
- Migracion del Storybook propio de `retention-wellbeing` (6007) al nuevo pattern (cada mod owner decide)
- Propagacion del pattern a otros mods activos (cada mod en su propio ticket si aplica)
- Modificacion de `scripts/sync.js` (no requerido — Phase 2 ya copia carpetas-componente completas)
- Promocion de la norma "componente del mod → story obligatoria" a `RULE-mods-{seq}` formal en el KB de platform (queda hoy como norma del mod en su `.ai/PATTERNS.md`; si platform formaliza a futuro, sube)

**Tamano estimado**: 2 sessions, ~3h efectivas. **S1 (construccion)** es la mas larga (2 stories + 4 archivos de setup + package.json). **S2 (validacion + docs)** es la critica empiricamente — si el storybook propio no levanta hay que diagnosticar antes de cerrar.

**Como vas a saber que funciona**:

- Abro `localhost:6010` (Storybook del mod) y veo `Custom Components / From Mods / curriculum-design / CompositeSectionTree` + `RichTextRenderer` en el sidebar
- DevTools console sin errores rojos al navegar entre stories
- `mods/curriculum-design/.ai/PATTERNS.md` tiene la norma "componente → story obligatoria + checklist al modificar + retrocompatibilidad"
- `mods/curriculum-design/.ai/TASKS.md` tiene el how-to para crear/actualizar stories
- Los 2 guides de los componentes (`docs/guides/composite-section-tree.md`, `rich-text-renderer.md`) tienen seccion `## Storybook story`
- `git status` del monorepo no muestra cambios en `layout/`, `scripts/`, ni `package-lock.json` por causa del ticket

---

## Purpose

Habilitar documentacion visual de los custom Vueform elements del mod `curriculum-design` mediante un Storybook propio del mod en puerto `6010`. Las stories viven adyacentes a sus componentes (`modsComponents/<C>/<C>.stories.ts`), respetando `mods → core` (RULE-mods-001). La norma de mantenimiento ("componente → story obligatoria + checklist al modificar") queda documentada en el `.ai/PATTERNS.md` del mod como paralelo a `RULE-mods-036` (eslint propio del mod).

## Requirements

### REQ-IMPROVE-01: Stories adjuntas a los custom components del mod

El mod MUST contener `<Component>.stories.ts` para los dos custom Vueform elements en `mods/curriculum-design/modsComponents/<Component>/`. Cada story sigue la convencion del proyecto: `title: 'Custom Components/From Mods/curriculum-design/<Component>'`, `tags: ['autodocs']`, render con `<Vueform :schema="schema" />` y `type: '<kebab-case>'`.

**Actor**: developer (manualmente)
**Layers**: frontend (mod source)

#### Scenario: caso exitoso
- **GIVEN** componentes `CompositeSectionTreeElement.vue` y `RichTextRendererElement.vue` existen en sus folders
- **WHEN** se escriben `CompositeSectionTree.stories.ts` y `RichTextRenderer.stories.ts` adjuntos
- **THEN** cada archivo declara `default meta` con `title` siguiendo convencion + named stories representativas del uso del componente

#### Acceptance
**El usuario puede verificar que funciona**: `ls mods/curriculum-design/modsComponents/{CompositeSectionTree,RichTextRenderer}/*.stories.ts` devuelve los 2 archivos.

### REQ-IMPROVE-02: Storybook propio del mod configurado (puerto 6010)

El mod MUST tener su Storybook propio funcional aislado del workspace `layout/`. Setup compuesto por:

- `.storybook/main.ts` con `stories` apuntando a `'../modsComponents/**/*.stories.@(js|jsx|mjs|ts|tsx)'`, framework `@storybook/vue3-vite`, addons `@storybook/addon-docs` + `@storybook/addon-a11y`
- `.storybook/preview.ts` con setup de Vueform (usando `vueform.config.ts` local), Pinia, i18n (cargando `lang/es_CL*.json` del mod), styles base (bootstrap, bootstrap-icons, vueform.css)
- `vueform.config.ts` en la raiz del mod que auto-registre los custom elements via `import.meta.glob('./modsComponents/*/*.vue', { eager: true })`
- `package.json` con scripts `"storybook": "storybook dev -p 6010"` + `"build-storybook": "storybook build"` + devDeps de storybook alineadas con `retention-wellbeing` (`@storybook/vue3-vite ^9.0.6`, `@storybook/addon-docs ^9.0.6`, `@storybook/addon-a11y ^9.0.18`, `storybook ^9.0.6`, `vite ^7.1.0`, etc.)

**Actor**: developer (manualmente)
**Layers**: config

#### Acceptance
**El usuario puede verificar que funciona**: archivos creados con shape coherente, `package.json` actualizado.

### REQ-IMPROVE-03: Render empirico verificado

El sistema MUST demostrar empiricamente que `npm run storybook` desde la raiz del mod levanta el Storybook en `localhost:6010` y las 2 stories renderizan sin errores en la consola del navegador.

**Actor**: developer (manualmente)
**Layers**: frontend (runtime)

#### Scenario: caso exitoso
- **GIVEN** S1 cerrada (archivos creados) + `npm install --no-workspaces` ejecutado en el mod
- **WHEN** developer ejecuta `npm run storybook` desde `up1/mods/curriculum-design/`
- **THEN** Storybook levanta en :6010 sin errores
- **AND** ambas stories aparecen en el sidebar bajo `Custom Components / From Mods / curriculum-design`
- **AND** DevTools console sin errores rojos al navegar entre stories

#### Scenario: caso de error — imports rotos / dep faltante
- **GIVEN** stories cargadas pero el setup falla al resolver alguna dependencia
- **WHEN** se levanta storybook
- **THEN** el dev diagnostica el error en consola
- **AND** S2 escala a iterate con plan: agregar dep/ajustar config + reintentar

#### Acceptance
**El usuario puede verificar que funciona**: storybook accesible en :6010, ambas stories visibles, sin errores rojos en consola.

### REQ-IMPROVE-04: Norma documentada en `.ai/PATTERNS.md` del mod

El mod MUST documentar en `mods/curriculum-design/.ai/PATTERNS.md` una nueva seccion `## Stories de los componentes (UPONE-1038)` con:

1. **Norma**: todo custom Vueform element del mod tiene `.stories.ts` adjunta. Componente nuevo → story antes de marcar done. Componente modificado → checklist (signature, comportamiento, variantes, tipo Vueform, retrocompatibilidad).
2. **Donde renderiza**: Storybook propio del mod en :6010; consolidacion futura en :6006 postergada.
3. **Shape canonico**: titulo, tags, autodocs, render con Vueform schema.
4. **Antecedente y paralelo**: referencia a `RULE-mods-036` (eslint pattern); plan eventual de subir a `RULE-mods-{seq}` formal si platform lo formaliza.

**Actor**: developer (manualmente)
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: leer la seccion en `.ai/PATTERNS.md` — un dev nuevo entiende la norma sin chat ni contexto adicional.

### REQ-IMPROVE-05: How-to procedural en `.ai/TASKS.md` del mod

El mod MUST documentar en `mods/curriculum-design/.ai/TASKS.md` una nueva seccion `## Crear / actualizar una story de un componente del mod` con:

- Instrucciones si creas un componente nuevo (shape, casos a cubrir, comando para validar)
- Checklist explicito si modificas un componente existente (5 items + retrocompatibilidad)
- Setup de levantar Storybook aislado: `cd mods/curriculum-design && npm install --no-workspaces && npm run storybook`

**Actor**: developer (manualmente)
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: leer la seccion — un LLM o dev nuevo que ejecuta una task del mod tiene el how-to a la mano.

### REQ-IMPROVE-06: Stories documentadas en los guides de los componentes

El mod MUST extender los guides existentes (`docs/guides/composite-section-tree.md` y `rich-text-renderer.md`) con una seccion `## Storybook story` que liste los casos documentados en la story + comando para levantar el Storybook + cross-references a la guia generica `mods/docs/guides/components.md#storybook` y a la norma en `.ai/PATTERNS.md`.

**Actor**: developer (manualmente)
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: leer cada guide — la seccion existe al final, lista los stories y referencia al storybook propio.

### REQ-PRESERVE-01: `up1/layout/` y `up1/scripts/` sin cambios atribuibles al ticket

El sistema MUST NOT modificar archivos de `up1/layout/` ni `up1/scripts/` por causa del ticket. El alcance vive completamente dentro de `up1/mods/curriculum-design/`.

**Actor**: reviewer
**Layers**: config

#### Acceptance
**El usuario puede verificar que funciona**: `cd up1 && git status` no muestra cambios atribuibles al ticket en esos paths.

### REQ-PRESERVE-02: `up1/package-lock.json` sin cambios atribuibles al ticket

El `npm install` del mod MUST correr aislado del monorepo (`--no-workspaces` u equivalente). El `up1/package-lock.json` no debe modificarse por causa del ticket.

**Actor**: reviewer
**Layers**: config

#### Acceptance
**El usuario puede verificar que funciona**: `cd up1 && git status package-lock.json` sin cambios.

## Non-functional requirements

No aplica — improvement de documentacion/tooling.

## Changes

### Added

| Path | Tipo | Proposito |
|------|------|-----------|
| `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTree.stories.ts` | Story | REQ-IMPROVE-01 (3 stories: LearningOutcomes, EvaluationComponents, ReadOnly) |
| `mods/curriculum-design/modsComponents/RichTextRenderer/RichTextRenderer.stories.ts` | Story | REQ-IMPROVE-01 (4 stories: SimpleHtml, ComplexHtml, Empty, ScriptTagSanitized) |
| `mods/curriculum-design/.storybook/main.ts` | Storybook config | REQ-IMPROVE-02 |
| `mods/curriculum-design/.storybook/preview.ts` | Storybook config | REQ-IMPROVE-02 |
| `mods/curriculum-design/vueform.config.ts` | Vueform config local | REQ-IMPROVE-02 (auto-registracion de custom elements del mod) |

### Modified

| Path | Cambio | Por que |
|------|--------|---------|
| `mods/curriculum-design/package.json` | Suma devDeps de storybook + scripts `storybook` y `build-storybook` (puerto 6010); suma deps de runtime alineadas con retention-wellbeing | REQ-IMPROVE-02 |
| `mods/curriculum-design/.ai/PATTERNS.md` | Suma seccion `## Stories de los componentes (UPONE-1038)` | REQ-IMPROVE-04 |
| `mods/curriculum-design/.ai/TASKS.md` | Suma seccion `## Crear / actualizar una story de un componente del mod` | REQ-IMPROVE-05 |
| `mods/curriculum-design/docs/guides/composite-section-tree.md` | Suma seccion `## Storybook story` al final | REQ-IMPROVE-06 |
| `mods/curriculum-design/docs/guides/rich-text-renderer.md` | Idem para RichTextRenderer | REQ-IMPROVE-06 |

### NOT modified (explicit)

| Path | Razon |
|------|-------|
| `up1/layout/.storybook/main.ts` | REQ-PRESERVE-01 — config compartida del workspace layout; queda para eventual coordinacion futura con platform UP1 si se identifica conveniencia |
| `up1/scripts/sync.js` y resto del pipeline | REQ-PRESERVE-01 — sync ya funciona |
| `up1/package-lock.json` | REQ-PRESERVE-02 — `npm install --no-workspaces` mantiene aislamiento |
| Otros mods (`ai-agent`, `retention-wellbeing`, `flow-viewer`, etc.) | Out of scope — cada mod owner gestiona su tooling |

## Tasks

### Session 1 — Stories del mod + setup Storybook propio [tipo: auto] [tier: T2]

Construccion: archivos creados sin levantar nada. El render empirico se hace en S2.

| # | Task | Source ref | Agent | Status | Session |
|---|------|------------|-------|--------|---------|
| S1.T1 | Escribir `CompositeSectionTree.stories.ts` (3 stories) en el mod | REQ-IMPROVE-01 | developer | done | 1 |
| S1.T2 | Escribir `RichTextRenderer.stories.ts` (4 stories) en el mod | REQ-IMPROVE-01 | developer | done | 1 |
| S1.T3 | Crear `.storybook/main.ts` + `.storybook/preview.ts` + `vueform.config.ts` locales del mod | REQ-IMPROVE-02 | developer | done | 1 |
| S1.T4 | Actualizar `package.json` del mod con devDeps + deps de runtime alineadas con `retention-wellbeing` + scripts `storybook` (puerto 6010) + `build-storybook` | REQ-IMPROVE-02 | developer | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (validation tier: T2) | — | reviewer | done | 1 |

#### Task contracts

**S1.T1**:
- source_ref: REQ-IMPROVE-01
- agent: developer
- files: `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTree.stories.ts` (new)
- precondition: leer `up1/layout/src/components/vueform/atoms-vueform/Toggle-vueform/Toggle.stories.ts` como referencia del patron Vueform canonico
- expected_output: archivo con `title: 'Custom Components/From Mods/curriculum-design/CompositeSectionTree'`, `tags: ['autodocs']`, 3 stories representativas (LearningOutcomes, EvaluationComponents, ReadOnly) con schemas Vueform usando `type: 'composite-section-tree'`
- validation: lectura del archivo verifica shape canonico
- rollback: `git restore` o eliminar archivo
- rules: [DET-2, DET-11, RULE-mods-001]

**S1.T2**:
- source_ref: REQ-IMPROVE-01
- agent: developer
- files: `mods/curriculum-design/modsComponents/RichTextRenderer/RichTextRenderer.stories.ts` (new)
- precondition: idem S1.T1
- expected_output: archivo con 4 stories (SimpleHtml, ComplexHtml, Empty, ScriptTagSanitized) usando `type: 'rich-text-renderer'`
- validation: idem S1.T1
- rollback: `git restore`
- rules: [DET-2, DET-11, RULE-mods-001]

**S1.T3**:
- source_ref: REQ-IMPROVE-02
- agent: developer
- files:
  - `mods/curriculum-design/.storybook/main.ts` (new)
  - `mods/curriculum-design/.storybook/preview.ts` (new)
  - `mods/curriculum-design/vueform.config.ts` (new)
- precondition: leer `up1/layout/.storybook/main.ts`, `preview.ts` y `vueform.config.ts` como referencia
- expected_output:
  - `main.ts` con `stories: ['../modsComponents/**/*.stories.@(js|jsx|mjs|ts|tsx)']`, addons docs + a11y, framework `@storybook/vue3-vite`
  - `preview.ts` con Vueform setup (via `vueform.config` local), Pinia, i18n (lang del mod), styles base (bootstrap, bootstrap-icons, vueform.css)
  - `vueform.config.ts` con auto-registracion via `import.meta.glob('./modsComponents/*/*.vue', { eager: true })`
- validation: lectura de los 3 archivos verifica shape coherente con referencia del layout (ajustado a paths del mod)
- rollback: eliminar archivos
- rules: [DET-2, DET-11, RULE-mods-001, RULE-mods-036]

**S1.T4**:
- source_ref: REQ-IMPROVE-02
- agent: developer
- files: `mods/curriculum-design/package.json` (modify)
- precondition: leer `up1/mods/retention-wellbeing/package.json` para alineacion de versiones
- expected_output:
  - dependencies: agregar `@apollo/client`, `@popperjs/core`, `@vue/apollo-composable`, `@vueform/vueform`, `bootstrap`, `bootstrap-icons`, `bootstrap-vue-next`, `graphql`, `graphql-tag`, `vue` (versiones de retention-wellbeing) — mantiene `sortablejs` existente
  - devDependencies: agregar `@chromatic-com/storybook`, `@storybook/addon-a11y`, `@storybook/addon-docs`, `@storybook/addon-onboarding`, `@storybook/addon-vitest`, `@storybook/vue3-vite`, `@types/bootstrap`, `@types/node`, `@vitejs/plugin-vue`, `@vitest/browser`, `@vitest/coverage-v8`, `eslint`, `eslint-plugin-storybook`, `eslint-plugin-vue`, `jsdom`, `playwright`, `storybook`, `typescript`, `vite`, `vue-tsc` (versiones de retention-wellbeing) — mantiene `@types/sortablejs`, `@vue/test-utils`, `vitest` existentes
  - scripts: agregar `"storybook": "storybook dev -p 6010"` + `"build-storybook": "storybook build"` — mantener `test`, `test:watch`, `lint`, `lint:fix`, `typecheck` existentes (que usan `../../node_modules/.bin/` del monorepo)
  - peerDependencies: `vue: ^3.3.0`
- validation: `diff` con retention-wellbeing/package.json muestra mismas versiones de storybook deps
- rollback: `git restore package.json`
- rules: [DET-2, DET-11, RULE-mods-013, RULE-mods-033]

**S1.GATE — Gate de sync Session 1**:
- Validation tier: T2
- Tasks completadas: S1.T1..T4
- Validacion T2: archivos creados con shape coherente; package.json revisado con diff visual contra retention-wellbeing
- Decision: continue → Session 2 (validar render empirico + docs)

### Session 2 — Render verificado + docs del mod [tipo: ⚑ fuerte] [tier: T3]

Validacion empirica + documentacion. Gate fuerte porque el render empirico es el primer feedback real de que el setup funciona; sin pasar este gate no se cierra el ticket.

| # | Task | Source ref | Agent | Status | Session |
|---|------|------------|-------|--------|---------|
| S2.T1 | Instalar deps localmente: `cd up1/mods/curriculum-design && npm install --no-workspaces`. Verificar con `cd up1 && git status` que el monorepo lock no se modifico | REQ-PRESERVE-02 | developer | done | 2 |
| S2.T2 | Levantar `npm run storybook` desde el mod; verificar que las 7 stories renderizan en `localhost:6010` con datos mock + styles del proyecto sin errores | REQ-IMPROVE-03 | developer + reviewer | done | 2 |
| S2.T3 | Documentar norma `## Stories de los componentes (UPONE-1038)` en `mods/curriculum-design/.ai/PATTERNS.md` | REQ-IMPROVE-04 | developer | done | 2 |
| S2.T4 | Documentar how-to `## Crear / actualizar una story de un componente del mod` en `mods/curriculum-design/.ai/TASKS.md` | REQ-IMPROVE-05 | developer | done | 2 |
| S2.T5 | Extender `docs/guides/composite-section-tree.md` y `rich-text-renderer.md` con seccion `## Storybook story` | REQ-IMPROVE-06 | developer | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (validation tier: T3) | — | reviewer | done | 2 |

#### Task contracts

**S2.T1**:
- source_ref: REQ-PRESERVE-02
- agent: developer
- files: produce `mods/curriculum-design/node_modules/` + `mods/curriculum-design/package-lock.json` (nuevo)
- precondition: S1 cerrada (package.json del mod actualizado)
- expected_output:
  - `node_modules/` del mod poblado con las deps declaradas
  - `package-lock.json` del mod creado/actualizado
  - `cd up1 && git status` NO muestra `up1/package-lock.json` modificado
- validation: comparar `git status` del monorepo antes/despues del install
- rollback: `cd mod && rm -rf node_modules package-lock.json` (revierte install) + revertir si tocó el monorepo
- rules: [DET-2, DET-11, RULE-mods-001 (preservar `mods → core`)]

**S2.T2**:
- source_ref: REQ-IMPROVE-03
- agent: developer + reviewer
- files: ninguno modificado (solo runtime)
- precondition: S2.T1 completa
- expected_output: storybook levantado en :6010, ambas stories visibles en sidebar bajo `Custom Components / From Mods / curriculum-design`, sin errores rojos en DevTools console
- validation: validacion visual manual + revision de consola
- rollback: `Ctrl-C` para detener storybook; no modifica archivos
- rules: [DET-4, DET-5, DET-7, DET-13]

**S2.T3**:
- source_ref: REQ-IMPROVE-04
- agent: developer
- files: `mods/curriculum-design/.ai/PATTERNS.md` (modify)
- expected_output: nueva seccion `## Stories de los componentes (UPONE-1038)` con norma, aplicacion, donde renderiza, shape canonico, antecedente
- validation: lectura manual; un dev nuevo entiende la norma
- rollback: `git restore`
- rules: [DET-2, DET-11, DET-16]

**S2.T4**:
- source_ref: REQ-IMPROVE-05
- agent: developer
- files: `mods/curriculum-design/.ai/TASKS.md` (modify)
- expected_output: nueva seccion `## Crear / actualizar una story de un componente del mod` con how-to + checklist + setup
- validation: lectura manual
- rollback: `git restore`
- rules: [DET-2, DET-11, DET-16]

**S2.T5**:
- source_ref: REQ-IMPROVE-06
- agent: developer
- files:
  - `mods/curriculum-design/docs/guides/composite-section-tree.md` (modify — seccion al final)
  - `mods/curriculum-design/docs/guides/rich-text-renderer.md` (modify)
- expected_output: cada guide con seccion `## Storybook story` con tabla de cases + comando para levantar + cross-references
- validation: lectura manual
- rollback: `git restore`
- rules: [DET-2, DET-11, DET-16]

**S2.GATE — Gate de sync Session 2**:
- Validation tier: T3 (render empirico + validacion visual)
- Tasks completadas: S2.T1..T5
- Decisiones a tomar:
  - `continue` → cerrar ticket (request-close) si render OK + docs completos
  - `iterate` → si render falla por imports/deps, agregar tasks de diagnostico y volver a S2
  - `escalate` → bloqueante tecnico inesperado que requiere conocimiento externo (raro)

## Constraints

- **RULE-mods-001** (must) — `mods → core` se respeta: stories y setup viven en el mod, NO en `layout/`
- **RULE-mods-013** (should) — `vue` declarada en `peerDependencies` del mod
- **RULE-mods-033** (must) — Deps + npm-workspaces; aislamiento via `--no-workspaces` evita conflicto del lock del monorepo
- **RULE-mods-036** (must) — Antecedente directo del pattern "tooling propio del mod" (eslint). Paralelo conceptual para storybook
- **DET-19** — External id: TICKET-016 tiene `external: UPONE-1038`. Commits, branch, PR usan `UPONE-1038`. Records de DKC usan `TICKET-016`

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `@storybook/vue3-vite ^9.0.6` + ecosistema storybook 9.x | internal infra | Versiones alineadas con `retention-wellbeing`. Si en el futuro retention-wellbeing actualiza, evaluar si curriculum-design debe seguirla | Low — divergencia entre mods es aceptable |
| `vueform.config.ts` local del mod | internal infra | Auto-registracion de custom elements del mod via `import.meta.glob` | Low — patron probado en el `vueform.config.ts` del layout |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `npm install --no-workspaces` no funciona como esperado y modifica `up1/package-lock.json` | medium | high — viola REQ-PRESERVE-02 | S2.T1 verifica con `git status` del monorepo antes/despues. Si modifica: revertir y usar alternativa (instalacion manual de deps, container aislado, otra estrategia) |
| `vueform.config.ts` local no auto-registra los custom elements correctamente | medium | high — bloquea REQ-IMPROVE-03 | S2.T2 valida empiricamente. Si las stories no encuentran el elemento, comparar path del `import.meta.glob` y ajustar |
| Conflicto entre `i18n` del preview.ts del mod y locales que las stories asumen | low | medium | El preview.ts carga `lang/es_CL*.json` del mod. Si las stories esperan locale `en` u otro, ajustar el preview o la story |
| Conflicto del puerto 6010 con otro servicio local del dev | low | low | Cambiar puerto en el script del package.json |

## Open questions

Sin preguntas abiertas. El alcance esta claro post-coordinacion del dev (storybook propio del mod por ahora).

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Storybook propio del mod en lugar de consolidacion en :6006

- **Contexto**: el Storybook central de `up1/layout/` excluye `modsComponents/` en su `main.ts:22-23`. Originalmente el ticket exploraba consolidar removiendo la exclusion. Tras coordinacion, se opto por implementar Storybook propio del mod por ahora.
- **Drivers**:
  - Avance incremental sin requerir coordinacion con platform
  - El mod queda self-contained con su tooling
  - Eventual consolidacion futura sigue siendo posible si se identifica conveniencia
- **Opcion elegida**: Storybook propio del mod en puerto 6010
- **Alternativas**:
  - Consolidar en :6006 (remover exclusion en `main.ts`): postergada — requiere coordinacion con platform, hoy hay otras prioridades
  - Esperar a que platform habilite la consolidacion: no es el camino — bloquearia el mod
- **Consecuencias**: stories del mod visibles SOLO en :6010. Otros equipos que quieran consultarlas deben levantar el storybook del mod local. Si en el futuro se decide consolidar, las stories ya estan escritas y el `vueform.config.ts` local sirve de referencia para la consolidacion
- **Session**: design-improvement (pre-execute)

### DEC-LOCAL-02: `npm install --no-workspaces` para preservar el monorepo

- **Contexto**: el mod `curriculum-design` es repo externo no registrado en `uPlannerMods` (memoria del proyecto: "monorepo se mantiene limpio"). Sumar devDeps de storybook al `package.json` del mod podria contaminar el `package-lock.json` del monorepo si se corre `npm install` desde la raiz
- **Drivers**: preservar la regla del proyecto + permitir que el dev mantenga el repo del mod aislado para su PR
- **Opcion elegida**: `cd mods/curriculum-design && npm install --no-workspaces` — instala en `node_modules/` local del mod + crea `package-lock.json` del mod
- **Alternativas**:
  - `npm install` desde la raiz del monorepo: descartada — modifica `up1/package-lock.json`
  - Container aislado: descartada — sobre-engineering para este caso
- **Consecuencias**: el mod queda con su propio `node_modules/` y `package-lock.json`. `up1/package-lock.json` intacto. La instalacion duplica algunas deps en disco pero respeta la separacion mod ↔ monorepo
- **Session**: design-improvement (pre-execute)

### DEC-LOCAL-03: Symlinks `components` y `composables` del mod apuntando al layout

- **Contexto**: Los components del mod (`modsComponents/<C>/<C>Element.vue`) importan `../../components/atoms` y `@/composables/...`, asumiendo el contexto **post-sync** donde el archivo vive en `layout/src/modsComponents/<C>/`. Pre-sync (en el repo del mod), esos paths no resuelven — `mods/curriculum-design/components/` no existe nativamente
- **Drivers**: que el Storybook del mod levante PRE-sync (sin tener que correr `npm run sync` antes); evitar modificar el codigo de los components (RULE-mods-001 y otros)
- **Opcion elegida**: crear symlinks fisicos en la raiz del mod — `components → ../../layout/src/components` y `composables → ../../layout/src/composables` — para que los paths relativos resuelvan correctamente
- **Alternativas**:
  - Modificar los imports del component para usar paths absolutos via alias: descartada — afecta runtime post-sync (RULE-mods-014)
  - Custom Vite plugin que rewrita imports: descartada — sobre-engineering
  - `resolve.alias` con regex en viteFinal: Vite no soporta paths relativos como keys de alias
- **Consecuencias**: el Storybook del mod funciona en el contexto del monorepo. Si el repo del mod se clona AISLADO (sin el monorepo completo), los symlinks rompen — documentado en backlog B2. El alias `@` en viteFinal del main.ts cubre los imports `@/...` que NO se resuelven por symlink
- **Session**: S2.T2 (execute) — descubierto al levantar el primer Storybook

### DEC-LOCAL-04: `docgen: false` + plugin-vue con `comments: false` (fix parser glitch)

- **Contexto**: Al levantar el Storybook del mod, `plugin-vue` reportaba `"Element is missing end tag"` sobre `CompositeSectionTreeElement.vue` — pero el archivo es valido (compiler-sfc + compiler-dom standalone reportan 0 errors). Causa real identificada en S2 extension: el plugin de **docgen** que `@storybook/vue3-vite` v9.x activa por default (vue-component-meta o vue-docgen-api) parsea los `.vue` con su propio compiler usando `comments: true` (default) y tropieza con algo del template del CST. El docgen marca el modulo como invalid → Vite devuelve 404 al hacer fetch HTTP a la URL del archivo
- **Drivers**: hacer que las 3 stories de CompositeSectionTree rendericen sin manipular el codigo del component (template tiene 1004 lineas, bisectar el glitch hubiera tomado horas y no aplica al alcance del ticket)
- **Opcion elegida**: 2 cambios complementarios en `.storybook/main.ts`:
  - `framework.options.docgen = false` — desactiva el plugin de docgen que generaba el 404
  - En `viteFinal`, agregar plugin-vue con `{ template: { compilerOptions: { comments: false, whitespace: 'preserve' } } }` — asegura el render correcto (el `@storybook/vue3-vite` v9.x NO usa plugin-vue propio, agregarlo da control sobre el parser)
- **Alternativas**:
  - Modificar el template del component para evitar el glitch: descartada — requiere bisectar 1004 lineas
  - Mantener exclusion de CST en `vueform.config.ts` (lo que tuvimos durante S2 inicialmente): descartada — perdiamos render de las 3 stories del CST
  - Pin de versions vue/plugin-vue a las del monorepo: descartada — no resolvio (mismo bug)
- **Consecuencias**: las 3 stories del CST renderizan. Trade-off: docgen:false desactiva la auto-doc inferida de props/events/slots — la doc sigue viva via `parameters.docs.description.component` que las stories declaran inline. La causa raiz del glitch del docgen queda sin diagnosticar (el archivo es valido standalone) — backlog si platform decide consolidar al Storybook central, hay que investigar
- **Session**: S2 extension — descubierto tras testear con Playwright MCP y bisectar el setup

### DEC-LOCAL-05: Mock Apollo Client + stub del composable

- **Contexto**: las stories deben mostrar el componente FUNCIONAL (no en loading/error). El `CompositeSectionTree` consulta GraphQL via `useTenantApolloClient` (composable del layout). Sin backend `object-manager` en `localhost:4000`, el componente muestra spinner indefinido + error 500
- **Drivers**: cumplir el requisito explicito del dev "la finalidad de storybook es ver el componente en funcionamiento y entender sus partes"; no requerir backend para validar el setup; mantener las stories self-contained
- **Opcion elegida**: triada de cambios:
  - `.storybook/mock-apollo.ts` — Apollo Client con `ApolloLink` custom que intercepta `ListCompositeSections` y devuelve mock nodes por recordType (LearningOutcome con 5 RA jerarquicos y suma 100%, EvaluationComponent con NF + 4 sub-componentes)
  - `.storybook/useApolloClient.stub.ts` — reemplaza el composable real devolviendo el mock client
  - Alias en viteFinal del `main.ts`: `'@/composables/useApolloClient': './useApolloClient.stub.ts'`
- **Alternativas**:
  - `app.provide(DefaultApolloClient, mockClient)` en preview.ts: descartada — el composable real crea su propio ApolloClient internamente con HttpLink (NO usa inject)
  - Levantar object-manager para datos reales: descartada — fuera del alcance del ticket, requiere backend + seed UPU
  - `MockedProvider` de `@apollo/client/testing`: descartada — diseñado para tests de unit, no para Storybook standalone
- **Consecuencias**: las stories renderizan con datos representativos. Si la API GraphQL cambia (nombre de campos, shape), los mocks pueden quedar desincronizados y dar errores en runtime — mitigar revisando mocks al modificar el composable
- **Session**: S2 extension — pedido explicito del dev

### DEC-LOCAL-06: Imports CSS del workspace `layout/` en preview.ts

- **Contexto**: con el setup inicial, los components renderizaban pero SIN estilos del proyecto — los `var(--up1-*)` no resolvian, los componentes se veian como texto plano. El dev reporto "no carga visualmente como en la app" y "los botones se rompen"
- **Drivers**: que el Storybook muestre los componentes con la apariencia real de produccion para que sea util como doc visual
- **Opcion elegida**: replicar en `.storybook/preview.ts` del mod la misma cadena de imports CSS que tiene `up1/layout/.storybook/preview.ts` (orden critico):
  1. `layout/src/styles/main.css` (design tokens `--up1-*`)
  2. `suite/css/1-theme/theme-tokens.css` (theme tokens — light-dark overrides)
  3. `suite/css/1-theme/default.css` (default theme aliases + bootstrap overrides)
  4. `bootstrap/dist/css/bootstrap.min.css` + `bootstrap-icons/font/bootstrap-icons.css`
  5. `@vueform/vueform/dist/vueform.css`
  6. `layout/src/styles/vueform-uplanner.css` (vueform theme override)
  7. `layout/css/3-viewType/recorddetail.css` + `recordlist.css` (estilos por viewType)
  8. `suite/css/1-theme/dark.css` (dark theme)
- **Alternativas**:
  - Solo importar `vueform.css` + `bootstrap.css` (minimal): descartada — sin design tokens del proyecto
  - Bundlear los CSS necesarios en un archivo unico del mod: descartada — duplicacion, debe estar sincronizado con el layout
- **Consecuencias**: los components se ven con apariencia identica a produccion. Acopla aun mas el Storybook del mod al workspace `layout/` y `suite/` — backlog B2 lo refleja (el mod no es self-contained aislado)
- **Session**: S2 extension — feedback del dev tras render sin estilos

## Acceptance checkpoints

- [ ] **Funcional**: las 6 REQs (IMPROVE-01..06) tienen scenarios cubiertos
- [ ] **Tests**: TC-1..TC-9 ejecutados con resultados reales
- [ ] **NFRs**: no aplican
- [ ] **Rules**: RULE-mods-001 respetada (todo en el mod), RULE-mods-036 referenciada como antecedente, DET-19 aplicada (UPONE-1038 en commits/branch)
- [ ] **Integration**: storybook propio del mod levanta en :6010 con las 2 stories visibles
- [ ] **Docs**: `.ai/PATTERNS.md`, `.ai/TASKS.md` y los 2 guides actualizados
- [ ] **Out of scope respetado**: `git diff develop -- up1/layout/ up1/scripts/ up1/package-lock.json` devuelve vacio
