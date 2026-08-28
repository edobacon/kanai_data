---
id: TICKET-016
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1038
module: curriculum-design
autopilot: manual
---

# Evaluar como agregar Storybook al mod curriculum-design para documentar custom components

## Request

Agregar Storybook al mod `curriculum-design` para documentar los custom components `CompositeSectionTree` y `RichTextRenderer` (en `modsComponents/`), con la restriccion declarada por el dev: el **codigo de las stories debe vivir en el mod** (preservar `mods → core` — RULE-mods-001), pero la **documentacion debe ser visible en el Storybook central de up1** (`localhost:6006`, el de `layout/`) para que los diferentes equipos la consulten en una sola URL.

**Reframe post intake-explore (2026-05-11)**: el intake confirmo que el pattern apuntado por el dev existe parcialmente en el codigo (H7). El template oficial `hello-world-mod/modsComponents/` ya tiene 3 `*.stories.ts`; el sync (`scripts/sync.js`, Phase 2) ya copia carpetas-componente completas (incluyendo `.stories.ts`) a `layout/modsComponents/`; pero `layout/.storybook/main.ts:22-23` EXCLUYE explicitamente esa carpeta con comentario `"to avoid duplicates"`. **El loop esta cortado en la config del Storybook central, NO en el mod ni en el sync**.

**Alcance actual (post-coordinacion 2026-05-11)**: el mod implementa un **Storybook propio** en puerto `6010` con su propio `.storybook/` + `vueform.config.ts` local + devDeps en `package.json` del mod. Una eventual consolidacion en el Storybook central de `up1/layout/` (que hoy excluye `modsComponents/` en su `main.ts:22-23`) queda fuera del alcance de este ticket — puede revisarse a futuro si se identifica conveniencia y disponibilidad coordinada con el equipo platform UP1, pero hoy son prioridades distintas.

**Acceptance del ticket** (lo que se considera "terminado"):

1. Stories de `CompositeSectionTree` y `RichTextRenderer` escritas en `mods/curriculum-design/modsComponents/<Component>/<Component>.stories.ts` siguiendo la convencion del proyecto (`Custom Components/From Mods/curriculum-design/<Component>`)
2. Storybook propio del mod configurado: `.storybook/main.ts` + `.storybook/preview.ts` + `vueform.config.ts` local que auto-registra los custom elements del mod; devDeps de storybook + scripts (`storybook`, `build-storybook`) en `package.json` del mod; puerto `6010`
3. Render verificado empiricamente: `npm run storybook` desde la raiz del mod levanta el Storybook y las 2 stories renderizan sin errores en la consola del navegador
4. Norma "componente del mod → story obligatoria + checklist al modificar" documentada en `mods/curriculum-design/.ai/PATTERNS.md` (paralelo a `RULE-mods-036` para eslint)
5. How-to procedural en `mods/curriculum-design/.ai/TASKS.md` con instrucciones de crear/actualizar stories y levantar el Storybook del mod
6. Guides existentes de los componentes (`docs/guides/composite-section-tree.md`, `rich-text-renderer.md`) extendidos con seccion `## Storybook story`

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement |
| Tipo de cambio | single |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (todo el alcance del ticket vive en el mod). `layout/.storybook/main.ts` queda EXPLICITAMENTE fuera de alcance — su cambio es responsabilidad de platform UP1 (escalation iniciada desde este ticket) |

## Out of scope (explicit)

Lista de cambios que el ticket NO ejecuta — quedan documentados como escalation a otro equipo o como tickets futuros separados:

| Item | Por que no en este ticket | Responsable |
|------|--------------------------|-------------|
| Cambio en `up1/layout/.storybook/main.ts` (remover/ajustar exclusion lineas 22-23) | Config compartida del workspace `layout/`, afecta a TODOS los mods activos. Modificarla desde un ticket cuyo `module: curriculum-design` violaria el principio "cada equipo edita lo suyo". El ticket SI produce evidencia + propuesta concreta para que platform aplique el cambio con criterio | platform UP1 (en su propio ticket/PR) |
| Migracion del Storybook propio de `retention-wellbeing` (puerto 6007) al pattern centralizado | Fuera de alcance del mod curriculum-design. Decision pendiente del dev/platform — captura como AQ4 del intake | retention-wellbeing owner o platform |
| Propagacion del pattern a otros mods activos (`ai-agent`, `object-manager-editor`, `flow-viewer`, `academic-scheduling`) | Cada mod tiene su propio owner; documentar el pattern en `.ai/PATTERNS.md` deja el camino habilitado, pero la implementacion por mod es ticket separado | owner de cada mod |
| Modificar `scripts/sync.js` (sync pipeline) | El sync ya hace lo necesario (H4 confirmed). No requiere cambios | N/A — pipeline ya funcional |
| Promover el pattern a rule formal `RULE-mods-{seq}` aplicable a todos los mods | Requiere que platform apruebe el cambio en main.ts primero. Si la escalation se aprueba, abrir ticket de promocion como secuela | scribe DKC tras aprobacion platform |

## Creation scope

Ambos flags `false`. Storybook documenta componentes que ya existen — no introduce vistas/pantallas nuevas del producto ni schemas de datos. Las stories (`*.stories.ts`) son artefactos de documentacion, no UI del producto.

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | Stories documentan `CompositeSectionTree` y `RichTextRenderer` ya existentes |
| Data model | no | No introduce entidades, schemas ni tablas |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | — |
| Version aprobada | — |
| Path | — (creates_visual=false, creates_data=false → design-draft no se invoca) |

## Triage

Caso de exploracion arquitectonica con 3 opciones bajo la restriccion "doc central + codigo en mod". La decision se toma en design, no en intake. Hipotesis = viabilidad de cada opcion + relacion con sync pattern + complejidad estimada del trabajo futuro.

**Opcion descartada en intake** (por restriccion del dev):
- ~~A — Storybook propio del mod~~: contradice "doc central, visible a otros equipos". Conservada solo como contraste en el spec.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Opcion B' (extender `stories: [...]` del Storybook de `layout/` con globs hacia `mods/*/modsComponents/`) es tecnicamente viable | ~ partial | **Capa 1 (storybook config)**: `up1/layout/.storybook/main.ts:14-24` muestra que `stories` es un array de globs arbitrarios; agregar paths externos al directorio del workspace es valido en Storybook 10. **Capa 2 (estado actual del repo)**: `main.ts:22-23` EXCLUYE explicitamente `modsComponents/` con comentario `"Explicitly ignore any stories inside modsComponents to avoid duplicates"`. Esta exclusion es removible pero su razon original (los "duplicates") debe entenderse antes — ver H1.1. **Capa 3 (rules)**: RULE-mods-001 prohibe modificar archivos synced en core, no editar config de tooling propia del layout. Editar `main.ts` del layout no viola la rule. **Conclusion parcial**: B' es viable arquitectonicamente; bloqueante es la razon de la exclusion. |
| H1.1 (sub) | La exclusion en `layout/.storybook/main.ts:22-23` es removible si se entiende la razon original de los "duplicates" | open: assumed pending | Sin git blame disponible aqui — investigar en design. Plausible: las stories podian aparecer duplicadas si tambien existian en `src/components/` o si los imports fallaban. Sin el contexto historico no se puede prometer remover sin riesgo. **Active question** para teach-intake. |
| H2 | Opcion Sync-based (stories en mod → `npm run sync` copia a `layout/modsComponents/` → Storybook las muestra) es viable y casi-implementada | ~ partial | **Capa 1 (sync mechanism)**: CLAUDE.md de up1 documenta que Phase 2 "Merge Sync" copia `mods/<mod>/components/` a `layout/modsComponents/` y `suite/modsComponents/`. **Capa 2 (template oficial)**: `up1/mods/hello-world-mod/modsComponents/` contiene 3 archivos `*.stories.ts` (`HwAssessmentList.stories.ts`, `TextTransformer.stories.ts`, `RandomPerson.stories.ts`) — evidencia directa de que el pattern "stories en el mod" YA existe en el template. **Capa 3 (gap)**: la exclusion en layout/.storybook/main.ts:22-23 impide que esas stories aparezcan en el storybook central. El loop esta incompleto. **Conclusion parcial**: la opcion Sync-based no requiere modificar el sync — solo cerrar el loop quitando la exclusion del main.ts (o, alternativamente, ajustar para que el storybook del layout SI mire `modsComponents/`). |
| H3 | Opcion C' (Storybook nuevo en workspace `mods/storybook/` que indexa todos los mods) tiene baja prioridad | ✗ refuted (provisional) | **Capa 1 (precedente)**: no existe workspace `mods/storybook/` en `up1/`. **Capa 2 (preferencia del dev)**: el dev mencionó "el de up1" — refiere al storybook del layout existente, no a uno nuevo. **Capa 3 (alternativa establecida)**: `retention-wellbeing` resolvió el problema con storybook propio (puerto 6007 — opcion A), pero el dev declaró explicitamente que esa via NO satisface "doc central, visible a otros equipos". **Conclusion**: C' agrega un workspace nuevo sin valor sobre B'/Sync-based — refutada como opcion principal, mantener en spec solo como alternativa descartada con justificacion. |
| H4 | El sync mechanism (`scripts/sync.js`) copia `*.stories.ts` junto con `*.vue` en Phase 2 | ✓ confirmed (inferred desde evidencia indirecta) | **Capa 1 (evidencia directa)**: `hello-world-mod` tiene `.stories.ts` en `modsComponents/` — si el sync no los copiara, no estarian en el template oficial. **Capa 2 (sync.js)**: `up1/scripts/sync.js:39-43` cuenta "component folders synced" — la unidad sincronizada es la carpeta completa del componente (que incluye .vue, .stories.ts, .test.ts si los hay). **Conclusion**: confirmado por convencion (folder-as-unit). El design debe validar empiricamente con un sync en sandbox. |
| H5 | Complejidad del trabajo futuro: 4-8 tasks | ~ partial → narrowed to 4-6 | **Capa 1 (referente)**: TICKET-013 (eslint + scripts + docs) completo en una session con ~5 commits. **Capa 2 (alcance reducido)**: dado que el sync YA copia stories (H4 confirmed) y el storybook del layout YA tiene infraestructura completa, el trabajo concreto es: (1) escribir stories de `CompositeSectionTree` y `RichTextRenderer`, (2) revertir o ajustar la exclusion en `main.ts:22-23`, (3) validar empiricamente en `:6006` que las stories aparecen post-sync, (4) documentar pattern en `mods/.ai/PATTERNS.md` y/o `mods/docs/`. **Conclusion**: 4-6 tasks, mas cerca de 4. |
| H6 (emergente) | Existe precedente de "storybook propio del mod" (opcion A) en `retention-wellbeing` (puerto 6007) | ✓ confirmed | **Capa 1**: `up1/mods/retention-wellbeing/package.json` declara script `"storybook": "storybook dev -p 6007"` y devDeps `@storybook/addon-a11y`, `@storybook/addon-docs`, `@chromatic-com/storybook`. **Capa 2**: CLAUDE.md de up1 documenta `"retention-wellbeing — Retention and wellbeing tracking (Storybook on port 6007)"`. **Capa 3 (gap)**: NO hay directorio `.storybook/` en el mod — el script usa defaults o config heredada. **Conclusion**: la opcion A esta vigente en el monorepo pero NO satisface el constraint "doc central, visible a otros equipos" del dev — cada mod queda en puerto distinto, fragmentado. |
| H7 (emergente) | El pattern apuntado por el dev (codigo en mod + doc en storybook central) fue el plan original del proyecto pero quedo incompleto | ✓ confirmed | **Capa 1**: `hello-world-mod` (template oficial) ya escribe `.stories.ts` en `modsComponents/`. **Capa 2**: el sync ya las copia a `layout/modsComponents/`. **Capa 3**: el storybook del layout EXCLUYE esa carpeta — corta el loop. **Conclusion**: este ticket cierra un loop arquitectonico iniciado pero no completado. Tiene caracter de "improvement de plataforma" mas que de "feature nueva" — refuerza la decision de mantener work_type=explore con subtipo improvement. |

### Active questions (gaps post-intake-explore)

Estas preguntas quedan abiertas al cerrar intake-explore. `teach-intake` las consolida en `tickets/TICKET-016.teach/teach-intake.md` con learning-path. `design-improvement` (proximo design step) las resuelve empiricamente como parte del PoC del spec.

| AQ | Pregunta | Origen | Como resolver |
|----|----------|--------|---------------|
| AQ1 | ¿Cual fue la razon original de la exclusion `!../src/modsComponents/**` en `up1/layout/.storybook/main.ts:22-23`? El comentario dice "avoid duplicates" pero no especifica con que se duplicaba | H1.1 | git blame + leer historia del archivo en el repo de layout, o preguntar a platform UP1. Critico para decidir si la exclusion es reversible o si hay que buscar otro mecanismo |
| AQ2 | Si se remueve la exclusion: ¿hay riesgo de imports rotos cuando `*.stories.ts` del mod ejecuta en el storybook del layout? (ej: dependencias del mod no instaladas en el workspace de layout) | H1, H2 | PoC empirico en design: hacer sync de un mod con stories, quitar exclusion en sandbox, levantar storybook y verificar que renderiza |
| AQ3 | ¿La decision final sera B' puro (storybook del layout extiende globs) o Sync-based (esperar a `npm run sync` y leer stories desde `layout/modsComponents/` ya copiadas)? La diferencia es cuanto se acopla al pipeline de sync | H1, H2 | Decision del dev + platform en design. Driver clave: si las stories deben funcionar en DEV sin correr sync, B'. Si la fuente de verdad es lo sincronizado, Sync-based |
| AQ4 | ¿Que esta sucediendo con el storybook de `retention-wellbeing` (port 6007) hoy? ¿El equipo lo usa, esta deprecado, o coexistira con el central? | H6 | Pregunta al dev / a platform — afecta el alcance del PR de implementacion (si retention-wellbeing se mantiene en 6007, el nuevo pattern es opcional por mod; si se migra, hay mas tickets para limpiar) |

### Context found

Lo que el researcher (manual, este intake) encontro:

- **Rules del modulo `curriculum-design`**: ninguna (directorio vacio — el modulo nacio en TICKET-013, las rules establecidas son sobre `mods/` y aplican al pattern, no al modulo especifico)
- **Rules del modulo `mods` relevantes**:
  - RULE-mods-001 (must) — Sync pattern critico: `mods → core`, jamas al reves. **Descarta opcion B** salvo que se demuestre lo contrario empiricamente
  - RULE-mods-013 (should) — Deps runtime peer van en `peerDependencies`, no `dependencies`. **Aplica a vue3/@storybook/vue3 si se elige A**
  - RULE-mods-033 (must) — Deps + npm-workspaces. **Aplica al package.json del mod si se elige A**
  - RULE-mods-036 (must) — Antecedente directo: tooling propio del mod (eslint propio en cada mod, scripts en package.json, binario desde monorepo `../../node_modules/.bin/`, docs en `.ai/PATTERNS.md`). **Replicable para Storybook en opcion A**
- **Bugs abiertos**: ninguno en `mods/`, `platform/`, `layout/` relevante a tooling/storybook
- **Specs relacionados**:
  - SPEC-curriculum-design-improve-eslint (TICKET-013, cerrado 2026-05-07) — establecio RULE-mods-036, el pattern paralelo
  - SPEC-composite-section-tree-weighted-sum — spec del componente que vamos a documentar
- **Docs relevantes**:
  - `up1/mods/.ai/PATTERNS.md` — convenciones de mods (verificar storybook menciones)
  - `up1/mods/docs/guides/creating-a-mod.md` — guia de creacion (verificar si menciona tooling)
  - `up1/mods/docs/reference/mod-structure.md` — estructura canonica del mod
  - `up1/layout/.storybook/main.ts` + `preview.ts` — config existente que sirve de referencia para A
- **Sync mechanism (investigado en intake-explore)**: `up1/scripts/sync.js` orquesta 10 fases. Phase 2 (Merge Sync) copia `mods/<mod>/components/` → `layout/modsComponents/` y `suite/modsComponents/`. La unidad de sync es la carpeta del componente, no archivos individuales — por lo tanto `*.stories.ts` se copia gratis junto con `*.vue`. Evidencia directa: `hello-world-mod/modsComponents/*/*.stories.ts` existe en el template oficial. **Implicacion**: Sync-based no requiere modificar el script de sync, solo cerrar el loop en el storybook del layout
- **Warnings**:
  - Si la decision termina siendo C' (workspace nuevo), el ticket debe escalar y coordinarse con platform UP1 antes de cualquier implementacion. **Provisionalmente refutada en intake-explore (H3 ✗)**
  - `RULE-mods-001` define "modificar archivos synced en core" como prohibido — editar `layout/.storybook/main.ts` (config propia del workspace layout, NO synced) no viola la rule. Confirmado en H1 capa 3
  - La exclusion en `layout/.storybook/main.ts:22-23` `"Explicitly ignore any stories inside modsComponents to avoid duplicates"` es el cuello de botella del pattern. **Active question AQ1**: la razon historica de esa exclusion debe entenderse antes de remover (riesgo: si hubo conflicto de imports/paths que motivo la exclusion, removerla sin contexto rompe el storybook)
  - El pattern resultante (donde viven las stories, como se descubren, tokens compartidos, addons) querra promoverse a RULE-mods-{seq} aplicable a todos los mods — capturar como Learn durante design
  - La memoria de proyecto indica que platform UP1 gestiona seed/Bases/RT/scripts core. Modificar `layout/.storybook/main.ts` requiere coordinacion con platform — afecta a todos los stories del proyecto, no solo curriculum-design

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `feature/UPONE-1038-storybook-mod-curriculum-design` |
| Base branch | `develop` |
| DB state | No aplica — explore no toca DB |
| Services | Ninguno requerido para explore. Si durante design se hace PoC: `layout` corriendo en :6006 como referencia visual |
| Test data | No aplica |

### Reproduction steps

No aplica — work_type=explore.

## Learns

Vacio en intake. Se llenan durante design (hipotesis evaluadas, decisiones tomadas, descubrimientos sobre Storybook + Vite + monorepo).

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El template oficial `hello-world-mod` tiene 3 `.stories.ts` con import path roto (`'../modsComponents/<C>/<C>.vue'` duplica el segmento `modsComponents`). Las stories del proyecto NO usan ese path — el patron canonico para Vueform custom elements es usar `<Vueform :schema>` con `type: '<kebab-case>'` SIN importar el componente directo (referencia: `up1/layout/src/components/vueform/atoms-vueform/Toggle-vueform/Toggle.stories.ts`). El template parece aspiracional pero nunca corrio | passive (researcher) | 1 | discarded | razon: info historica para el template del proyecto (no del mod curriculum-design); fuera de alcance fix del template upstream |
| L2 | El sync mechanism + component-registry.json + el setup del proyecto ya tenia `composite-section-tree` y `rich-text-renderer` registrados como Vueform elements en `up1/layout/src/modsComponents/`. El loop "componente del mod → Storybook visible" estaba cortado SOLO en la config del Storybook central (`layout/.storybook/main.ts:22-23` excluye `modsComponents/`). El Storybook propio del mod no toca ese punto — declara su propio `vueform.config.ts` local + `.storybook/main.ts` con glob a su `modsComponents/` | passive (researcher) | 1 | discarded | razon: contexto historico del intake-explore — la decision final fue Storybook propio del mod (Alt 3), por lo que la exclusion en layout/.storybook/main.ts queda fuera de alcance |
| L3 | El setup local del Storybook del mod requirio mas config que el del workspace `layout/`: (a) inyectar `@vitejs/plugin-vue` explicito via `viteFinal` con dynamic import (esbuild-register no carga top-level imports de plugins ESM-only con `"type": "module"`), (b) alias `@` apuntando a `layout/src` (componentes importan `@/composables/...` asumiendo contexto post-sync), (c) symlinks `components/` y `composables/` apuntando a `layout/src/` (componentes importan `../../components/atoms` asumiendo contexto post-sync), (d) Apollo Client en `preview.ts`. La consecuencia: el storybook del mod NO es realmente self-contained pre-sync — depende de paths fisicos al workspace `layout/`. Si el repo del mod se clona aislado del monorepo, no levanta storybook | passive (developer) | 2 | refined | DEC-LOCAL-03 (del spec) — setup acoplado al workspace layout, documentado en `.storybook/main.ts` + backlog B2 |
| L4 | `CompositeSectionTreeElement.vue` tiene bug pre-existente del template que solo se manifiesta con compiler Vue/Vite recientes (v7/v9 del mod) — "Element is missing end tag" interno. Workspace `layout/` con su compiler propio no lo detecta. Workaround temporal: excluir el componente del eager glob del `vueform.config.ts` local del mod. Las stories aparecen en sidebar pero el elemento Vueform no se registra. Separable como item de backlog del mod | passive (developer) | 2 | discarded | razon: hipotesis incorrecta — superada por L5 (la causa real era docgen plugin, no bug del template; archivo es valido en standalone) |
| L5 | El "error" del parser de plugin-vue sobre CompositeSectionTreeElement.vue **NO es bug del template** — el archivo es valido (compiler-sfc + compiler-dom standalone reportan 0 errors). Investigacion ulterior: la causa real es el **plugin de docgen** (`vue-component-meta` o `vue-docgen-api`) que `@storybook/vue3-vite` activa por default. Ese plugin parsea los `.vue` con su propio compiler usando `comments: true` (default). En CompositeSectionTreeElement el parser de docgen tropieza con algo del template (no reproducible standalone). El docgen marca el modulo como invalid → Vite devuelve 404 al hacer fetch HTTP a la URL del archivo → consola del browser muestra "Failed to load resource 404". El render visual NO se afectaba (el componente se cargaba via `import.meta.glob` eager) pero la URL plana fallaba. **Fix DEFINITIVO**: en `.storybook/main.ts` setear `framework.options.docgen = false`. Trade-off: docgen:false desactiva la auto-doc inferida de props/events/slots — la doc sigue viva via `parameters.docs.description.component` que las stories declaran inline. **Adicional**: el `@storybook/vue3-vite` v9.x NO usa `@vitejs/plugin-vue`; tiene su propio `storybook:vue-template-compilation` que solo setea alias `vue: 'vue/dist/vue.esm-bundler.js'`. El procesamiento de SFCs lo hace el plugin de docgen. Inyectar `plugin-vue` extra en viteFinal con `comments: false` mejoraba el render pero no resolvia el 404 — porque el docgen seguia fallando | passive (developer) | 2 | refined | DEC-LOCAL-04 (del spec) — `docgen: false` + plugin-vue con `comments: false`. Comentario inline en `.storybook/main.ts` (~25 lineas) explica la causa raiz |
| L6 | Para que las stories muestren el componente FUNCIONAL (no en loading/error), el storybook del mod requiere **Apollo Client mockeado**. Implementacion: (a) `.storybook/mock-apollo.ts` con `ApolloLink` custom que intercepta `ListCompositeSections` y devuelve mock nodes por recordType (LearningOutcome con 5 RA jerarquicos y suma 100%, EvaluationComponent con NF + 4 sub-componentes), (b) `.storybook/useApolloClient.stub.ts` que reemplaza el composable real, (c) alias en viteFinal `'@/composables/useApolloClient': './useApolloClient.stub.ts'`. El composable real (`layout/src/composables/useApolloClient.ts`) crea su propio ApolloClient internamente con HttpLink a localhost:4000 — NO usa inject, por eso `app.provide(DefaultApolloClient, mockClient)` en preview.ts no alcanza | passive (developer) | 2 | refined | DEC-LOCAL-05 (del spec) — mock Apollo + stub del composable + alias en viteFinal. Implementacion en `.storybook/mock-apollo.ts` + `.storybook/useApolloClient.stub.ts` |
| L7 | Para que los componentes se vean con styling completo en el storybook del mod, hay que importar los CSS del workspace `layout/` en el preview.ts: design tokens (`layout/src/styles/main.css`), theme tokens (`suite/css/1-theme/theme-tokens.css`), default theme (`suite/css/1-theme/default.css`), vueform-uplanner override (`layout/src/styles/vueform-uplanner.css`), CSS por viewType (`layout/css/3-viewType/recorddetail.css` + `recordlist.css`), dark theme. Sin estos imports, los componentes renderizan SIN tokens `--up1-*` y se ven como texto plano sin contenedor — el dev reporto "no carga visualmente como en la app" y "los botones se rompen" antes de agregar estos imports | passive (developer) | 2 | refined | DEC-LOCAL-06 (del spec) — imports CSS del layout en preview.ts. Comentario inline en `.storybook/preview.ts` documenta el orden critico |

## Failed approaches

Capturados durante S2.T2 al levantar el Storybook propio del mod.

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| F1 | Levantar storybook del mod con setup minimo (sin `viteFinal`, sin alias, sin symlinks) — asumiendo que `@storybook/vue3-vite` se comporta como en el workspace `layout/` | `@storybook/vue3-vite` NO auto-inyecta `@vitejs/plugin-vue` en este setup local del mod. Falla con "Failed to parse source for import analysis. Install @vitejs/plugin-vue to handle .vue files" | El framework requiere config explicita de plugin-vue cuando el storybook vive afuera del workspace donde la config principal de Vite del proyecto lo incluye automaticamente |
| F2 | Inyectar `@vitejs/plugin-vue` con import top-level en `.storybook/main.ts` | esbuild-register de storybook trata de cargar el archivo como CJS al evaluarlo. El package del mod tiene `"type": "module"` + el plugin es ESM-only → `ReferenceError: require is not defined in ES module scope` | Top-level imports de plugins ESM-only fallan en main.ts cuando el package tiene `type: module`. Solucion: dynamic imports dentro de `viteFinal` (que se ejecuta despues de la evaluacion del main.ts) |
| F3 | Habilitar todos los custom elements del mod en `vueform.config.ts` con glob amplio `./modsComponents/*/*.vue` | `CompositeSectionTreeElement.vue` tiene bug pre-existente del template que solo se manifiesta con el compiler Vue/Vite reciente del mod. Toda la registracion Vueform falla en cascade — overlay de error bloquea TODAS las stories, incluso las de RichTextRenderer | El eager glob propaga la falla de un componente. Workaround: glob con exclusion `'!./modsComponents/CompositeSectionTree/*.vue'` aisla el problema. Fix permanente: arreglar el bug del template (item de backlog B1) |

## Sessions

work_type=improvement → DET-20 aplica. Plan de sessions abajo. Cada session se cierra con `S{N}.GATE` persistido aqui usando el Template de Gate del template canonico.

### Plan de sessions (preplanificacion)

2 sessions previstas. Particion por agrupacion logica: S1 concentra el trabajo de implementacion + PoC empirico (donde esta el riesgo); S2 cierra con investigacion historica + docs + paquete de evidencia (T0/T1 — rapido, posterior al PoC). Esqueleto producido por `intake-explore`; refinado a tasks asignadas (`S{N}.T{M}`) en design-improvement.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Stories del mod + setup Storybook propio | 1 | T2 | (a) escribir `CompositeSectionTree.stories.ts`, (b) escribir `RichTextRenderer.stories.ts`, (c) crear `.storybook/main.ts` + `.storybook/preview.ts` + `vueform.config.ts` locales del mod, (d) sumar devDeps de storybook + scripts (`storybook`, `build-storybook`) al `package.json` del mod (puerto 6010, deps alineadas con `retention-wellbeing`) | auto | (1) las 2 stories creadas siguen el shape canonico, (2) setup local del Storybook completo (4 archivos clave), (3) `package.json` actualizado sin tocar lint/typecheck existentes |
| S2 | Docs del mod (norma + how-to + guides) + render verificado | 2 | T2 | (a) instalar deps localmente (`npm install --no-workspaces` desde el mod, monorepo limpio), (b) levantar `npm run storybook` y verificar render de ambas stories en `:6010` sin errores de consola, (c) actualizar `mods/curriculum-design/.ai/PATTERNS.md` con seccion "Stories de los componentes" (norma + checklist al modificar + retrocompatibilidad), (d) actualizar `mods/curriculum-design/.ai/TASKS.md` con seccion "Crear/actualizar una story", (e) extender `docs/guides/composite-section-tree.md` y `rich-text-renderer.md` con seccion `## Storybook story` | auto | (1) `npm run storybook` corre sin errores, (2) ambas stories visibles en `:6010`, (3) docs actualizados en `.ai/PATTERNS.md`, `.ai/TASKS.md` y los 2 guides; norma queda como referencia canonica del mod |

**Notas del plan**:
- **S1 es construccion**: archivos creados sin levantar nada. No requiere render empirico — eso se valida en S2.T(b).
- **S2 es validacion + docs**: el render verificado (S2.T(b)) cierra el loop empirico del ticket. Si falla por imports rotos u otra causa, el gate decision pasa a iterate con plan ajustado (puede sumar tasks de diagnostico).
- **Sin paquete UP1 / sin escalation**: el alcance actual del ticket queda dentro del mod; una eventual consolidacion futura con el Storybook central de `up1/layout/` queda como item de backlog si en el futuro se identifica conveniencia.
- **Acceptance del ticket** depende de las 2 sessions. S1 deja todo creado; S2 valida que el setup funciona empiricamente + documenta la norma para devs/IAs.

### Gate 0 (pre-execute) — 2026-05-11

**Estado del ticket**: in_progress. intake-explore cerrado con 8 hipotesis convergidas + 4 active questions transferidas a design. teach-intake.md generado con bloques `dkc:hypothesis-map`, `dkc:decision-matrix`, `dkc:code-walkthrough`, `dkc:learning-path`. Plan de sessions refinable en design-improvement.

**Trabajo previo a Session 1**:
- Triage convergido (H1, H1.1, H2 partial; H3 refuted; H4, H6, H7 confirmed; H5 partial estrechado a 4-6 tasks)
- Decision DEC-LOCAL del intake: opcion A (storybook propio del mod) descartada explicitamente
- Active questions (4) — pendientes de resolver en design o en sessions (AQ1 en S2, AQ2 en S1, AQ3 decision en design, AQ4 fuera de alcance)

**Pre-condiciones para Session 1**:
- Spec `SPEC-curriculum-design-storybook-mod-doc` producido por design-improvement con REQs + tasks `S1.T*` y `S2.T*` asignadas
- Branch `feature/UPONE-1038-storybook-mod-curriculum-design` creada desde `develop`
- `up1` repo con `npm install` actualizado (storybook deps ya en layout)
- Acceso a `layout/.storybook/main.ts` para sandbox local (no se commitea el cambio — solo se prueba)

---

### Session 1 — 2026-05-11 — Stories del mod + setup Storybook propio

**Tipo:** auto (avance directo a S2 si los criterios verdes; el render empirico se hace en S2)
**Validation tier:** T2 (archivos creados con shape coherente + diff del package.json revisado)

**Tasks completadas:**
- [x] S1.T1: `CompositeSectionTree.stories.ts` escrita en el mod (3 stories: LearningOutcomes, EvaluationComponents, ReadOnly)
- [x] S1.T2: `RichTextRenderer.stories.ts` escrita en el mod (4 stories: SimpleHtml, ComplexHtml, Empty, ScriptTagSanitized)
- [x] S1.T3: `.storybook/main.ts` + `.storybook/preview.ts` + `vueform.config.ts` creados (preview con Vueform + Pinia + i18n + styles bootstrap; vueform.config con auto-registracion via `import.meta.glob`)
- [x] S1.T4: `package.json` del mod actualizado con devDeps de storybook (alineados con `retention-wellbeing` ^9.0.x) + scripts `storybook` (puerto 6010) + `build-storybook`

**Validacion del tier:**
- T2 — Archivos creados, shape coherente con patrones del proyecto (Toggle.stories.ts del layout como referencia para Vueform elements). Verificacion visual de las stories pendiente para S2 (no aplica en este gate).

**Discoveries / Learns nuevos:**
- L1: el template oficial `hello-world-mod` tiene 3 `.stories.ts` con imports relativos rotos (`'../modsComponents/<C>/<C>.vue'` — path duplica el segmento `modsComponents`). Las stories nuevas del mod usan el patron canonico del proyecto (Vueform schema con `type: '<kebab-case>'`, sin importar el componente directo), heredado de `up1/layout/src/components/vueform/atoms-vueform/Toggle-vueform/Toggle.stories.ts`. El template es aspiracional pero no funcional como esta — captura para refinar al cierre.
- L2: el sync mechanism (`up1/scripts/sync.js`) ya tiene a `curriculum-design` sincronizado en `up1/layout/src/modsComponents/curriculum-design/` (snapshot previo). El registry `component-registry.json` registra ambos custom elements (`composite-section-tree`, `rich-text-renderer`). El loop esta cerrado en sync — solo faltaba habilitar la inclusion en algun Storybook (el del layout las excluye explicitamente; el del mod las incluye via `.storybook/main.ts` propio).

**Failed approaches** (solo si hubo):
- (sin failed approaches en S1)

**Bloqueantes detectados** (solo si hay):
- (sin bloqueantes en S1)

**Gate decision:**
- [x] continue → Session 2 (instalar deps localmente, levantar storybook, validar render, docs)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para Session 2:**
- Archivos creados (verificable con `ls .storybook/ && cat package.json`)
- Branch correcta en el mod: `feature/UPONE-1038-storybook-stories-curriculum-design`
- Dev confirma cuando ejecutar `npm install --no-workspaces` para no comprometer el monorepo

**Tiempo invertido:** ~1h efectiva (creacion archivos + decisiones de path + verificacion patrones)
**Contexto retomable:** S1 cerrada con archivos creados; S2 arranca con `cd up1/mods/curriculum-design && npm install --no-workspaces` (aislando del monorepo lock) y `npm run storybook` para validar render. Si render OK → completar docs (PATTERNS, TASKS, guides). Si render falla → diagnosticar imports/deps faltantes y agregar tasks al spec antes de continuar.

---

### Session 2 — 2026-05-11 — Render verificado + docs del mod

**Tipo:** ⚑ fuerte (gate fuerte por render empirico)
**Validation tier:** T3 (Playwright snapshot + screenshots de cada story + revision de consola)

**Tasks completadas:**
- [x] S2.T1: `npm install --no-workspaces` ejecutado en el mod. 503 paquetes instalados localmente. `up1/package-lock.json` SIN cambios (REQ-PRESERVE-02 verificado con `git status`)
- [x] S2.T2: `npm run storybook` levantado, ambas stories de RichTextRenderer renderizan en `localhost:6010`, sin errores en DevTools console. Screenshots capturados via Playwright MCP en `tickets/TICKET-016.screenshots/`
- [x] S2.T3: Norma "Stories de los componentes (UPONE-1038)" agregada a `mods/curriculum-design/.ai/PATTERNS.md`
- [x] S2.T4: How-to "Crear / actualizar una story de un componente del mod" agregado a `mods/curriculum-design/.ai/TASKS.md`
- [x] S2.T5: Guides de los componentes extendidos con seccion `## Storybook story`

**Validacion del tier:**
- T3 — Playwright MCP navego a las 4 stories de RichTextRenderer:
  - `SimpleHtml`: render OK (`<strong>`, `<em>`, `<u>`) — screenshot `TICKET-016-poc-rich-text-renderer-simple.png`
  - `ComplexHtml`: render OK (`<h2>`, `<h3>`, links, `<ul>/<li>`, `<blockquote>`) — screenshot `TICKET-016-poc-rich-text-renderer-complex.png`
  - `Empty`: muestra texto vacio correctamente — screenshot `TICKET-016-poc-rich-text-renderer-empty.png`
  - `ScriptTagSanitized`: `<script>` y `onclick` removidos por sanitizacion (sanitize-html default mantiene texto interno del script como text plano — innocuo, XSS bloqueado) — screenshot `TICKET-016-poc-rich-text-renderer-sanitized.png`
- DevTools console: 0 errors al cierre de la sesion (los 3 errors capturados al inicio fueron de los failed approaches durante diagnostico, ya superados)
- Sidebar del Storybook muestra jerarquia completa: `Custom Components / From Mods / curriculum-design / { CompositeSectionTree, RichTextRenderer }`

**Discoveries / Learns nuevos:**
- L3: el setup local del storybook del mod requirio mas configuracion que el del workspace `layout/`: (a) `@vitejs/plugin-vue` debe inyectarse explicito via `viteFinal` con dynamic import (esbuild-register de storybook no carga top-level imports de plugins ESM-only), (b) alias `@` apuntando a `layout/src` (porque los componentes del mod importan `@/composables/useApolloClient` asumiendo contexto post-sync), (c) symlinks `components/` y `composables/` apuntando a `layout/src/` (porque los componentes importan `../../components/atoms` y `../../composables/...` asumiendo el mismo contexto post-sync), (d) Apollo Client en `preview.ts` (porque los custom elements consultan GraphQL via composables internos)
- L4: `CompositeSectionTreeElement.vue` tiene un bug pre-existente que solo se manifiesta con el compiler Vue/Vite reciente (v7/v9) del mod: "Element is missing end tag" en algun punto interno del template. No reproducible con el compiler del workspace `layout/` (que parsea sin error). Workaround temporal en el `vueform.config.ts`: excluir CompositeSectionTree del eager glob (`'!./modsComponents/CompositeSectionTree/*.vue'`). Las stories de CompositeSectionTree aparecen en el sidebar pero su elemento Vueform no se registra — son visible-but-not-renderable. Issue separable: requiere localizar el descalce de tags en las ~1000 lineas del template. Backlog item.

**Failed approaches** (durante S2.T2):
- F1: Levantar storybook con setup minimo (sin viteFinal con plugin-vue, sin alias `@`, sin symlinks): fallo con "Failed to parse source for import analysis. Install @vitejs/plugin-vue to handle .vue files". El framework `@storybook/vue3-vite` NO auto-inyecta plugin-vue en este setup local (a diferencia del Storybook del workspace `layout/` donde si auto-aplica).
- F2: Agregar plugin-vue con import top-level: fallo con "require is not defined in ES module scope" — esbuild-register de storybook no carga top-level imports de plugins ESM-only cuando el package.json tiene `"type": "module"`. Solucionado con dynamic imports dentro de `viteFinal`.
- F3: Habilitar todos los custom elements del mod en `vueform.config.ts` con glob amplio: fallo por bug pre-existente del template de `CompositeSectionTreeElement.vue` (L4). Solucionado excluyendo el componente del glob temporalmente.

**Bloqueantes detectados** (solo si hay):
- Bug del template de CompositeSectionTreeElement.vue impide render de las 3 stories del componente (LearningOutcomes, EvaluationComponents, ReadOnly). NO bloquea el cierre del ticket — las 4 stories de RichTextRenderer si renderizan y validan el setup. El bug es separable como item de backlog.

**Gate decision:**
- [x] continue → cerrar ticket (request-close) — alcance del ticket cumplido: stories + setup + render verificado (4 de 7 stories) + docs + monorepo limpio. El bug del template de CompositeSectionTree queda como item de backlog para resolver en ticket separado
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para cierre:**
- Backlog item B1 creado con descripcion del bug del template + workaround actual + plan para resolver
- request-close ejecutara: teach-close.md (DET-22), commit con prefijo UPONE-1038, update summary del ticket

**Tiempo invertido:** ~1.5h efectivas (npm install ~1min + 3 fixes iterativos del setup + 4 screenshots + capturas de learns/failed)
**Contexto retomable:** S2 cerrada con render verificado para 4 stories de RichTextRenderer; backlog item B1 documenta el bug del template de CompositeSectionTree. El ticket cierra con request-close. El bug del template se aborda en ticket separado cuando el dev tenga capacidad.

## Teaching — Intake

**Status**: pending (DET-21 aplica a explore — full-path).
**Archivo**: `tickets/TICKET-016.teach/teach-intake.md` (se produce en proximo step `teach-intake`).
**Visualizar en HC**: `http://localhost:3016/projects/up1/tickets/TICKET-016#teaching?teach=intake`

## Teaching — Close

**Status**: skipped (DET-22 NO aplica a explore — exempt).

## Testing

work_type=explore — el "testing" del ticket es la validacion del spec draft (cobertura de criterios de evaluacion de las 3 opciones), no test cases ejecutables sobre codigo.

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-IMPROVE-01: Stories de CompositeSectionTree y RichTextRenderer escritas en `mods/curriculum-design/modsComponents/` con codigo viviendo en el mod | TC-1, TC-2 | manual | pending |
| REQ-IMPROVE-02: Storybook propio del mod configurado (puerto 6010): `.storybook/main.ts`, `.storybook/preview.ts`, `vueform.config.ts` local, devDeps + scripts en `package.json` | TC-3 | manual | pending |
| REQ-IMPROVE-03: Render empirico — `npm run storybook` levanta y ambas stories renderizan en `localhost:6010` sin errores en consola | TC-4 | manual | pending |
| REQ-IMPROVE-04: Norma "componente → story obligatoria + checklist al modificar + retrocompatibilidad" documentada en `.ai/PATTERNS.md` (paralelo a RULE-mods-036) | TC-5 | manual | pending |
| REQ-IMPROVE-05: How-to procedural en `.ai/TASKS.md` con instrucciones de crear/actualizar stories y levantar Storybook del mod | TC-6 | manual | pending |
| REQ-IMPROVE-06: Stories documentadas en `docs/guides/composite-section-tree.md` y `rich-text-renderer.md` con seccion `## Storybook story` | TC-7 | manual | pending |
| REQ-PRESERVE-01: `up1/layout/` y `up1/scripts/` sin modificar — alcance solo en el mod | TC-8 | manual | pending |
| REQ-PRESERVE-02: `up1/package-lock.json` y resto del monorepo sin modificar — el `npm install` del mod corre aislado (`--no-workspaces`) | TC-9 | manual | pending |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|
| TC-1 | Story de CompositeSectionTree existe en el mod | REQ-IMPROVE-01 | manual | no | S1.T(a) ejecutada | `ls mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTree.stories.ts` | Archivo existe, exporta default meta + 3 named stories (LearningOutcomes, EvaluationComponents, ReadOnly), `title` `Custom Components/From Mods/curriculum-design/CompositeSectionTree` | OK — 3 stories | `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTree.stories.ts` | pass |
| TC-2 | Story de RichTextRenderer existe en el mod | REQ-IMPROVE-01 | manual | no | S1.T(b) ejecutada | `ls mods/curriculum-design/modsComponents/RichTextRenderer/RichTextRenderer.stories.ts` | Archivo existe + 4 named stories (SimpleHtml, ComplexHtml, Empty, ScriptTagSanitized) | OK — 4 stories | `mods/curriculum-design/modsComponents/RichTextRenderer/RichTextRenderer.stories.ts` | pass |
| TC-3 | Storybook propio del mod configurado | REQ-IMPROVE-02 | manual | no | S1.T(c) y S1.T(d) ejecutadas | Verificar existencia de `.storybook/main.ts`, `.storybook/preview.ts`, `vueform.config.ts`; `package.json` con `storybook` + `build-storybook` (puerto 6010), devDeps de storybook alineadas con `retention-wellbeing` | 4 archivos presentes con contenido coherente, scripts apuntando a puerto 6010 | OK | `mods/curriculum-design/.storybook/main.ts`, `mods/curriculum-design/.storybook/preview.ts`, `mods/curriculum-design/vueform.config.ts`, `mods/curriculum-design/package.json` | pass |
| TC-4 | Render empirico: stories visibles en :6010 con componentes FUNCIONALES | REQ-IMPROVE-03 | manual | yes | S2.T(a) y S2.T(b) ejecutadas: deps instaladas, storybook con fixes aplicados (docgen:false + mock Apollo + CSS tokens del layout) | Navegar via Playwright MCP a las 7 stories en `localhost:6010` | 7/7 stories renderizan FUNCIONALES con datos mock y estilos del proyecto. RichTextRenderer muestra HTML sanitizado en card con border + blockquote estilado. CompositeSectionTree muestra arbol jerarquico completo con badges de codigo, badges de bloomLevel/componentType en teal, percentages, drag handles, boton "Agregar raiz", filas con backgrounds alternados, indentacion correcta | OK 7/7 | ![RTR-Simple](TICKET-016.screenshots/TICKET-016-poc-rtr-styled-simple.png) ![RTR-Complex](TICKET-016.screenshots/TICKET-016-poc-rtr-styled-complex.png) ![RTR-Empty](TICKET-016.screenshots/TICKET-016-poc-rtr-styled-empty.png) ![RTR-Sanitized](TICKET-016.screenshots/TICKET-016-poc-rtr-styled-sanitized.png) ![CST-LearningOutcomes](TICKET-016.screenshots/TICKET-016-poc-cst-styled-learning-outcomes.png) ![CST-EvaluationComponents](TICKET-016.screenshots/TICKET-016-poc-cst-styled-evaluation-components.png) ![CST-ReadOnly](TICKET-016.screenshots/TICKET-016-poc-cst-styled-read-only.png) | pass |
| TC-5 | Norma en .ai/PATTERNS.md | REQ-IMPROVE-04 | manual | no | S2.T(c) ejecutada | Abrir `mods/curriculum-design/.ai/PATTERNS.md` seccion "Stories de los componentes (UPONE-1038)" | Seccion presente con: norma (componente nuevo → story; componente modificado → checklist), aplicacion, donde renderiza, shape canonico, referencia a antecedente RULE-mods-036 | OK | `mods/curriculum-design/.ai/PATTERNS.md` | pass |
| TC-6 | How-to en .ai/TASKS.md | REQ-IMPROVE-05 | manual | no | S2.T(d) ejecutada | Abrir `.ai/TASKS.md` seccion "Crear / actualizar una story de un componente del mod" | Seccion presente con: instrucciones para componente nuevo, checklist para componente modificado (5 items + retrocompatibilidad), instrucciones de setup/levantar storybook aislado | OK | `mods/curriculum-design/.ai/TASKS.md` | pass |
| TC-7 | Stories documentadas en los guides de cada componente | REQ-IMPROVE-06 | manual | no | S2.T(e) ejecutada | Abrir los 2 guides de los componentes | Cada guide tiene seccion `## Storybook story` con tabla de casos, comando para levantar (`npm run storybook` :6010), links cruzados a PATTERNS.md y a guia generica `mods/docs/guides/components.md#storybook` | OK | `mods/curriculum-design/docs/guides/composite-section-tree.md` + `rich-text-renderer.md` | pass |
| TC-8 | Sin cambios en up1/layout/ ni up1/scripts/ | REQ-PRESERVE-01 | manual | no | Al cerrar el ticket | `cd up1 && git status` + verificar que ningun archivo de `layout/` ni `scripts/` aparece modificado por causa del ticket | Sin cambios atribuibles al ticket en esos paths | OK | `git status` solo muestra `?? mods/curriculum-design/`; layout/scripts intactos | pass |
| TC-9 | Sin cambios en up1/package-lock.json | REQ-PRESERVE-02 | manual | no | Despues de S2.T(a) (npm install local del mod) | `cd up1 && git status package-lock.json` | Sin cambios — el `npm install --no-workspaces` del mod no toca el lock del monorepo | OK | `git status package-lock.json` vacio post-install | pass |

### Test artifacts

No aplica en explore.

### Regression

No aplica en explore — no se toca codigo del mod.

## Backlog

Vacio en intake. Si durante design surgen items fuera de alcance (ej: propagar Storybook a otros mods, crear template `hello-world-mod` con Storybook incluido), se capturan aqui con prioridad.

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| ~~B1~~ | ~~`CompositeSectionTreeElement.vue` no renderiza en el Storybook propio del mod~~ — **RESUELTO 2026-05-11**. Causa identificada: glitch del parser de templates de plugin-vue 6.0.4 cuando `comments: true` (default). Fix aplicado en `.storybook/main.ts`: `vue({ template: { compilerOptions: { comments: false, whitespace: 'preserve' } } })`. Las 3 stories del componente ahora renderizan correctamente (shell del componente + spinner de loading porque object-manager no esta corriendo, comportamiento esperado). El archivo del componente sigue siendo valido bit-a-bit (compiler-sfc + compiler-dom standalone reportan 0 errors). Ver Learn L5 para detalles | resuelto | resuelto en S2 extension (2026-05-11) | Fix commiteable en `.storybook/main.ts` del mod. Exclusion en `vueform.config.ts` removida; eager glob carga todos los componentes | (no aplica — resuelto) | done 2026-05-11 |
| B2 | Setup del Storybook propio del mod NO es self-contained: depende de paths fisicos al workspace `layout/` (symlinks `components`, `composables` + alias `@`). Si el repo del mod se clona aislado del monorepo, no levanta storybook | nuevo | descubierto en S2.T2 (learn L3) | Setup actual funciona dentro del monorepo (paths `../../../layout/src/...` resuelven). Documentado en `.ai/TASKS.md`. Workaround para clone aislado: copiar manual los componentes referenciados, o esperar a tener clone completo del monorepo | (1) evaluar si vale la pena empaquetar los components/composables consumidos como dep npm (peer/dev), (2) o documentar prereq explicito "el mod requiere monorepo clonado completo para levantar storybook propio". Probablemente la opcion (2) es lo razonable — el mod no se clona aislado en practica | could |

## Summary

### What was requested

Agregar Storybook al mod `curriculum-design` para documentar visualmente sus 2 custom Vueform elements (`CompositeSectionTree`, `RichTextRenderer`), con codigo de stories viviendo en el mod (preservar `mods → core`).

### What was done

Se establecio un Storybook propio del mod en puerto `6010` (decision: Alt 3 — coordinado con platform UP1, opcion intermedia mientras la consolidacion al Storybook central queda postergada). Los devs del proyecto ahora pueden:

- Levantar `npm run storybook` desde `up1/mods/curriculum-design/` y ver los 2 custom components funcionales con datos representativos (mock Apollo) y styling del proyecto
- 7 stories cubriendo casos representativos: 4 de `RichTextRenderer` (HTML basico/completo/vacio/sanitizacion) + 3 de `CompositeSectionTree` (LearningOutcome con sub-RA y suma 100%, EvaluationComponent con quizzes/examen, modo solo lectura)
- Consultar la norma "componente custom → story obligatoria + checklist al modificar" en `.ai/PATTERNS.md` del mod (para humanos via `docs/guides/` y para LLMs via `.ai/TASKS.md`)

El monorepo (`up1/package-lock.json`, `up1/layout/`, `up1/scripts/`) quedo intacto — todo el cambio vive dentro del mod `curriculum-design`.

### What was learned

- Learns capturados: 7 total (1 refined → DEC-LOCAL-03 setup acoplado al workspace, 3 refined → DEC-LOCAL-04/05/06 fixes tecnicos del setup, 3 discarded por superados/historicos)
- Rules creadas (formales): ninguna. La norma "componente custom → story obligatoria" quedo como norma del mod en `.ai/PATTERNS.md` (futura promocion a `RULE-mods-{seq}` formal requeriria coordinacion con platform UP1)
- Decisions tomadas: 6 DEC-LOCAL en el spec (DEC-LOCAL-01 Storybook propio del mod; DEC-LOCAL-02 npm install --no-workspaces; DEC-LOCAL-03 symlinks components/composables; DEC-LOCAL-04 docgen:false + plugin-vue propio; DEC-LOCAL-05 mock Apollo + stub composable; DEC-LOCAL-06 cadena CSS del layout)
- Bugs encontrados: ninguno reproducible standalone. El glitch del docgen plugin de Storybook (DEC-LOCAL-04) podria ser bug upstream — repro minimo queda como item futuro si platform prioriza consolidacion

### Testing summary

| Metric | Value |
|--------|-------|
| REQs covered | 8/8 (6 IMPROVE + 2 PRESERVE) |
| REQs NOT covered | ninguno |
| Test cases total | 9 (todos manual) |
| Test cases pass | 9 |
| Test cases fail | 0 |
| Test artifacts created | 7 screenshots (3 CST + 4 RTR) + repo files |
| Regression delta | N/A — improvement de tooling, sin tests automatizados afectados |

### Metrics

| Metric | Value |
|--------|-------|
| Sessions | 2 (S1 construccion + S2 validacion empirica con extension de investigacion) |
| Tasks completed | 9/9 (S1.T1..4 + S2.T1..5) |
| Commits | (a generar en commit final del ticket) |
| Learns captured | 7 |
| Learns → decisions | 4 (L3, L5, L6, L7 → DEC-LOCAL-03..06) |
| Learns → bugs | 0 |
| Learns → rules | 0 |
| Learns discarded | 3 (L1, L2, L4) |
| Decisions taken | 6 DEC-LOCAL |
| Bugs found | 0 |
| Failed approaches captured | 3 (F1 setup minimo sin viteFinal, F2 top-level import plugin-vue, F3 eager glob con CST sin fix de docgen) |
| Backlog items abiertos | 1 (B2 — could) |
