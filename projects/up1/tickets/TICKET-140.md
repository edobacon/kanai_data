---
id: TICKET-140
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1716
module: core
autopilot: manual
---

# Core · Nav · view-picker no traduce nombres de vista de objetos no activos (i18n por contexto)

## Request

> Core Extension (Bug fix, Change Type 1) escalada por Aduana durante UPONE-1616. Jira: UPONE-1716.

En un tenant multi-idioma, la barra de navegación de una app traduce el nombre de la vista **activa**, pero los nombres de las **demás** vistas del menú (items del selector de vistas / dropdown) salen en el idioma fuente (español), aunque tengan traducción declarada y publicada. Afecta a cualquier app/mod con más de una vista, en cualquier idioma distinto del fuente (no es específico de curriculum-design). Esperado: todos los nombres de vista que la nav muestra (tabs, dropdown y encabezados) se muestran traducidos al idioma activo, sin depender de cuál vista esté abierta.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | Core Extension — Bug fix (Change Type 1) |
| Modulo principal | core (suite) |
| Modulos afectados | todos los mods multi-vista (curriculum-design, curriculum-mapping, ...) |

## Triage

### Causa raiz (verificada en codigo, `/Users/edobacon/Workspace/uplanner/up1`)

- `suite/components/static/ObjectNavBar.vue:50` renderiza `layout.label` para TODOS los objetos que la nav muestra (menu + dropdown de vistas).
- El label se traduce en `suite/composables/useObjectManager.ts:614-615` via `translateWithFallback('layout.<layoutName>.label', <crudo>)`.
- El runtime i18n carga namespaces POR CONTEXTO de la ruta activa: `suite/plugins/i18n.ts` (`applyContext` -> `loadNamespaces`) + `suite/utils/i18nBridge.ts:resolveNamespaces` (109-131) + `buildLevels` (80-102) cargan `{workspace}/common` (siempre) + `{workspace}/{stem}` del objeto/layout activo. Los namespaces por-objeto de los otros objetos no se cargan hasta navegar.
- Resultado: `layout.<X>_list.label` de un objeto no-activo no esta en el catalogo cargado -> `translateWithFallback` cae al texto crudo (es). Los TABS si traducen porque su `labelKey` (`nav.<mod>.*`) vive en `{mod}/common`, siempre cargado (UPONE-1645 + RULE-curriculum-design-047).

### Fix recomendado (no vinculante — lo decide el core team en design)

- **A1 (recomendado):** que la nav precargue, en `applyContext`/`resolveNamespaces`, los namespaces por-objeto de los objetos que la nav **renderiza** (el set del menu del app), no solo el del contexto de ruta activo.
- **A2 (descartado por Aduana):** servir los nombres de vista desde `{mod}/common` — generaliza un workaround, duplica claves y choca con el diseno de namespaces por-objeto.

### Reproduccion

1. Tenant UPU, app Curriculum Design, idioma ingles.
2. UPONE-1616 ya publico los labels de vista traducidos en en/pt (`suite/locales-dist/en|pt/curriculum-design/*.json`).
3. Estar en una vista (p.ej. Study Plans) y abrir el dropdown de otra -> nombre en espanol; navegar a esa vista -> recien ahi traduce.

### Context found

- Origen: UPONE-1616 (TICKET-136), consumidor donde se descubrio. Aduana lo juzgo core-worthy (afecta cualquier mod multi-vista).
- KB relacionado: RULE-curriculum-design-047 (asimetria labelKey en `common` vs layout label en namespace por-objeto).
- Dependencia inversa: UPONE-1645 (labelKey por app, mergeado) — no lo bloquea; este es un defecto de carga i18n independiente.
- El dev decidio NO aplicar el workaround mod-only en 1616; se espera este fix de core.

### Intake-explore (2026-08-24, base origin/develop 3d296cb)

Diagnostico reconfirmado en la base fresca (rama UPONE-1716 desde develop al dia):
- `i18nBridge.ts:buildLevels` (80-102) deriva los override-levels SOLO de `ctx.{objectName,layoutType,layoutName}` (contexto de ruta activo). `resolveNamespaces` (109-131) carga `{workspace}/{stem}` de esos niveles + `common` + embeddables. Los objetos NO activos nunca aportan su stem -> su namespace por-objeto no se carga.
- `plugins/i18n.ts:applyContext` (163-189) arma el lookup chain (defaultNS/fallbackNS) desde `resolveNamespaces(ctx)`; el watcher de ruta (232-248) solo recompone al cambiar objectName/layoutType/layoutName.
- Confirmado: 1616 ya publico los labels de las 5 vistas en en/pt (verificado en locales-dist); el defecto es solo de carga.

Opciones de enganche para A1 (a decidir en design-fix):
- **A1b (recomendada):** exponer desde el plugin i18n un helper `ensureNavNamespaces(objectNames)` que cargue `{workspace}/{obj}` de cada objeto que la nav renderiza y los agregue al `fallbackNS`; lo llama la capa que conoce el set de la nav (`useObjectManager`, que arma los objectGroups). Mantiene el conocimiento de app en la app y el mecanismo en el plugin. Cuidar reactividad: tras `loadNamespaces`, forzar re-render del label (i18next-vue reacciona a changeLanguage, no siempre a loadNamespaces).
- **A1c:** extender `I18nContext`/`applyContext` con `navObjects: string[]` (derivado de la app activa) e incluir sus stems en la resolucion. Mas invasivo al contrato del contexto.
- (A2 descartada por Aduana: mover labels a common.)

Blast radius: core i18n de toda la nav (todas las apps). Requiere smoke multi-app + multi-idioma y cuidado con la reactividad del re-render.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | — |
| Base branch | develop |
| DB state | — |
| Services | — |
| Test data | UPU, app Curriculum Design multi-vista, idioma en/pt |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| 1 | El label de vista vive en el namespace por-objeto (`{mod}/{Objeto}`) y solo se carga en el contexto de ruta activo; los tabs traducen porque su `labelKey` vive en `common` (siempre cargado). La nav debe precargar los ns por-objeto de todos los objetos que renderiza. | design-fix | S1 | refined | RULE-core-051 |
| 2 | Trampa de reactividad: `translateWithFallback` es sincrono y `loadNamespaces` async; sin senal reactiva (`navNsVersion`) que el computed lea, el label queda crudo aunque el catalogo ya cargue. i18next-vue reacciona a `changeLanguage`, no a `loadNamespaces`. | design-fix | S1 | refined | RULE-core-051 |
| 3 | `applyContext` reescribe `fallbackNS` por ruta; los ns de nav deben reincluirse en cada recomposicion (set persistente + `composeFallbackNS`) o la navegacion los pierde. El switch de idioma en caliente exige recargar en `languageChanged`. | design-fix / smoke | S1/S2 | refined | RULE-core-051 |
| 4 | `resolveNavNamespaces` debe devolver orden de lookup (mas especifico primero) para que un override file-based por-tenant gane sobre la base, consistente con el objeto activo. | quality-gate (reviewer A#1) | S2 | refined | RULE-core-051 |
| 5 | Limitaciones aceptadas (dev-only / preexistentes): borde de show-source-strings al cambiar el set en debug mode; poda de `navNamespaces` entre tenants; guard out-of-order de `applyContextGuarded` (preexistente). | quality-gate (reviewers) | S2 | refined | RULE-core-051 (Known limitations) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

### Plan de sessions

- **S1** (design + execute): spec-judge dual (DET-38) -> implementar T1 (plugin: helper `ensureNavNamespaces` + persistencia en fallbackNS + senal reactiva) + T2 (useObjectManager: watch del set de objetos + consumo de senal). Tests + typecheck.
- **S2** (verify + gate): T3 runtime smoke multi-app/multi-idioma (DET-36) + reviewer aislado / dual-judge quality gate (DET-23/35). Commit por session. Checkpoint push/close (DET-30, siempre pregunta).

## Sessions

### S1 — design-fix + execute A1b (2026-08-24)

Spec `SPEC-core-fix-nav-preload-view-namespaces` (REQ-01..04). Enfoque A1b (DEC-A1b). Spec-judge dual DET-38 APPROVED (2 jueces ciegos), findings minor incorporados.

**Tasks completadas:**
- [x] S1.T1 — Helper `ensureNavNamespaces` + persistencia en `fallbackNS` + senal reactiva (plugin) — typecheck 0 err (en archivos tocados), unit verde
- [x] S1.T2 — Consumir helper + senal en `useObjectManager` (watch del set + dep reactiva en `navObjects`) — typecheck 0 err, unit verde
- [x] S1.T3 — Verificacion runtime multi-app/multi-idioma + regresion (DET-36) — smoke-executed en UPU, evidencia runtime i18next (ver Testing)

**Ajuste durante smoke (client-only):** la precarga se guardo a client-only (`typeof window === 'undefined'` return, patron de `plugins/i18n.ts`) para no desperdiciar payload SSR ni arriesgar divergencia de hidratacion. El fix es no-op en SSR (`navNamespaces` vacio -> `composeFallbackNS` devuelve la cadena original; `navObjects` lee version 0 igual que el server), por lo que el hydration-mismatch observado en consola es PREEXISTENTE (persiste identico con la precarga desactivada en SSR), no introducido. Los 404 de consola no son de i18n (todos los `/locales/*` responden 200).

**Implementacion (codigo escrito, pendiente validacion):**
- `suite/utils/i18nBridge.ts`: helpers puros `resolveNavNamespaces(manifest, ctx, objectNames)` y `composeFallbackNS(effectiveOrder, navNamespaces, bundledNs)`.
- `suite/plugins/i18n.ts`: set persistente `navNamespaces` + `navNsVersion` (ref senal) + `lastEffectiveOrder`; `applyContext` recompone `fallbackNS` via `composeFallbackNS`; `ensureNavNamespaces` (idempotente, carga + recompone + bump); recarga de `navNamespaces` en `languageChanged` (switch de idioma en caliente); provee `ensureNavNamespaces` + `i18nNavVersion`.
- `suite/composables/useObjectManager.ts`: `navNamespaceObjectsKey` (clave estable ordenada) + `watch` immediate que invoca `$ensureNavNamespaces`; `navObjects` lee `void ($i18nNavVersion)?.value`.
- `suite/tests/unit/i18nBridgeNav.test.ts`: 14 casos (resolveNavNamespaces + composeFallbackNS: orden, dedup, prioridad activo>nav>bundled, orden tenant-sobre-base, dedup de defaultNS, bordes).

### S2 — gate de calidad + smoke runtime + refinamiento (2026-08-24)

- Spec-judge dual APPROVED (S1). Tester PASS: unit 94/94 (helpers nuevos + navTabs sin regresion), typecheck 0 err en archivos tocados.
- Smoke runtime DET-36 en UPU (suite UPONE-1716 + mod UPONE-1616): TC1-5 PASS con evidencia i18next dura (5 vistas de objetos no activos traducen; persistencia; hot switch en/pt; fallbackNS correcto). Ver Testing.
- Quality gate dual (DET-35) APPROVED; findings A#1 (orden tenant-sobre-base) + A#2/A#3 (try/catch rollback) + A#4/B#4 (tests) incorporados. Unit final 40/40 (i18nBridgeNav 14 + navTabs 26).
- Pendiente: commits locales por session, luego checkpoint push/close (DET-30, ambos siempre preguntan).

## Testing

Smoke runtime en tenant UPU, app Curriculum Design, idioma en-CL (y pt-BR), rama suite `UPONE-1716` + mod `UPONE-1616`. Evidencia via runtime i18next (`$i18next.t`) + inspeccion de `fallbackNS`/namespaces cargados + screenshots del view-picker.

| TC | Escenario (REQ) | Esperado | Actual | Evidence | Status | Affects UI | Session |
|----|------------------|----------|--------|----------|--------|------------|---------|
| TC1 | REQ-01: en el landing de AcademicProgram, nombres de vista de objetos NO activos | 5 vistas traducidas sin navegar | AcademicProgram="Academic Programs", Activity="Course Programs", Curriculum="Study Plans", Offering="Syllabi", core_DataLog="Change history" | `$i18next.t('layout.*.label')` en en-CL; screenshots dropdown Course Program="Course Programs" y Study Plans="Study Plans" | PASS | yes | S2 |
| TC2 | REQ-02: persistencia tras navegar (activo=Curriculum) | ns por-objeto de los otros 4 siguen en el chain | `fallbackNS` contiene curriculum-design/{AcademicProgram,Activity,Offering,core_DataLog} bajo el activo, sobre bundled; Curriculum (activo) NO duplicado | dump de `i18next.options.fallbackNS` | PASS | yes | S2 |
| TC3 | REQ-03: switch de idioma en caliente (finding A#7) | labels no activos re-resuelven sin recarga | en->pt: Activity="Programas de disciplina", Offering="Ementas", AcademicProgram="Programas acadêmicos"; pt->en: vuelven a EN | `$loadAndSetLocale('pt')`/`('en')` + `t()` | PASS | yes | S2 |
| TC4 | REQ-04: sin regresion (activo, tabs, dedup) | vista activa + tabs igual que antes; sin duplicar ns activo | vista activa (Academic Programs/Study Plans) OK; 5 tabs en EN (labelKey); dedup correcto | screenshots + fallbackNS | PASS | yes | S2 |
| TC5 | REQ-01/T3: namespaces por-objeto cargados client-side | los 6 ns de curriculum-design cargados aunque solo 1 activo | loadedCD = [common, Curriculum, AcademicProgram, Activity, Offering, core_DataLog]; `/locales/*` 200 | dump `i18next.store.data` + network | PASS | yes | S2 |
| TC6 | Unit: helpers puros (regresion DET-7) | resolveNavNamespaces + composeFallbackNS: orden/dedup/prioridad/bordes | 10/10 verde; navTabs 26/26 sin regresion; 94/94 suite | vitest tests/unit | PASS | no | S1 |

**Hallazgos NO-bug / preexistentes (no se corrigen en este ticket):**
- Hydration mismatch en consola: PREEXISTENTE (el fix es no-op en SSR; el mismatch persiste con la precarga desactivada en SSR). Reportado, no corregido (regla errores: preexistente).
- 404 de recurso en consola: no relacionado con i18n (todos los `/locales/*` responden 200).

## Summary

**CERRADO 2026-08-24.** Fix de core (suite) del defecto i18n de la nav: el view-picker no traducia los nombres de vista de objetos no activos porque el runtime cargaba namespaces solo por contexto de ruta activa. Enfoque A1b: la nav precarga los namespaces por-objeto de todos los objetos que renderiza (`ensureNavNamespaces`), los persiste en `fallbackNS` (`composeFallbackNS`, activo > nav > bundled), re-renderiza via senal reactiva (`navNsVersion`) tras la carga async y en el switch de idioma en caliente. Client-only (no-op en SSR). Gates: spec-judge dual + quality gate dual APPROVED; unit 40/40 + suite 94/94; smoke runtime UPU en/pt con evidencia i18next (5 vistas de objetos no activos traducen sin navegar, persistencia, hot switch). KB: RULE-core-051. Codigo: suite rama `UPONE-1716` (commits `32f9ecc` fix, `5f31a4a` test), pusheada. PR hacia develop pendiente de crear/mergear (externo). DKC commit del cierre en deckard.
