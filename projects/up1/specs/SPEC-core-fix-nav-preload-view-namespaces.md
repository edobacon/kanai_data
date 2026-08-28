---
id: SPEC-core-fix-nav-preload-view-namespaces
project: up1
ticket: TICKET-140
status: closed
---

# SPEC-core-fix-nav-preload-view-namespaces

## Executive summary — lo que estas aprobando

La barra de navegacion (view-picker) muestra el nombre de vista de TODOS los objetos de la app a la vez, pero el runtime i18n solo carga el namespace por-objeto del objeto de la ruta ACTIVA. Resultado: en un tenant multi-idioma, los nombres de vista de los objetos no activos salen en el idioma fuente (es) aunque tengan traduccion publicada. Este fix hace que la nav precargue los namespaces por-objeto de los objetos que renderiza, sin depender de cual vista este abierta, y garantiza el re-render tras la carga async. Cambio de core (suite); afecta el i18n de la nav de todas las apps.

## Purpose

Corregir el defecto de carga i18n descrito en UPONE-1716 (Core Extension, Bug fix, Change Type 1), escalado por Aduana desde UPONE-1616. El dato ya existe (1616 publico las traducciones en en/pt); el defecto es exclusivamente de CARGA de namespaces, no de contenido.

## Diagnostico

Verificado en `/Users/edobacon/Workspace/uplanner/up1` (rama `UPONE-1716` desde origin/develop 3d296cb):

- `suite/components/static/ObjectNavBar.vue:50` renderiza `layout.label` para todos los objetos que la nav muestra (tabs, dropdown de vistas, encabezados).
- `suite/composables/useObjectManager.ts` computa esos labels dentro del `computed` `navObjects` (518-659): por cada layout, `translateWithFallback('layout.<layoutName>.label', crudo)` (614-615). El `computed` tiene UNA sola dependencia reactiva de i18n: `void ($i18nLanguage as any)?.value` (522). No depende de eventos de carga de namespace.
- `suite/utils/i18nBridge.ts:buildLevels` (80-102) deriva los override-levels SOLO de `ctx.{objectName,layoutType,layoutName}` (contexto de ruta activo). `resolveNamespaces` (109-131) carga, por cada nivel y locale, `{workspace}/{stem}` para los workspaces del `layerOrder` + la capa tenant. El namespace por-objeto de un objeto es `{mod}/{Objeto}` (ej. `curriculum-design/Activity`), donde vive `layout.<layout>.label`.
- `suite/plugins/i18n.ts:applyContext` (163-189) resuelve el lookup chain (`defaultNS`/`fallbackNS`) desde `resolveNamespaces(ctx)`, hace `loadNamespaces(lookupOrder)` y reescribe `fallbackNS` en CADA aplicacion de contexto (187). El watcher de ruta (232-248) recompone al cambiar tenant/objeto/layout.

Cadena causal: un objeto no activo nunca aporta su stem -> su namespace `{mod}/{Objeto}` no se carga -> `translateWithFallback('layout.<X>_list.label', crudo)` cae al texto crudo (es). Los TABS si traducen porque su `labelKey` (`nav.<mod>.*`) vive en `{mod}/common`, siempre cargado (UPONE-1645 + RULE-curriculum-design-047).

## Requirements

### REQ-01 — La nav precarga los namespaces por-objeto de los objetos que renderiza

> **Que cambia:** el runtime i18n carga, ademas del namespace del objeto de ruta activo, los namespaces por-objeto de todos los objetos que la nav va a mostrar.
> **Por que:** el view-picker renderiza nombres de vista de objetos no activos; sus labels viven en el namespace por-objeto, que hoy no se carga hasta navegar.

El sistema DEBE exponer, desde el plugin i18n, un helper `ensureNavNamespaces(objectNames: string[])` que resuelva —con la MISMA logica de `resolveNamespaces`— los namespaces por-objeto de cada `objectName` recibido, cargue los que falten via `i18next.loadNamespaces`, y los agregue al `fallbackNS` del runtime. La capa que conoce el set de objetos de la nav (`useObjectManager`) DEBE invocar el helper con ese set.

<details><summary>Scenario</summary>

GIVEN un tenant en ingles con la app Curriculum Design (5 objetos con nombre de vista traducido en en)
WHEN el usuario carga la app estando en una sola vista (p.ej. Study Plans)
THEN los 5 nombres de vista del menu/dropdown se muestran en ingles sin navegar a cada objeto.
</details>

### REQ-02 — Los namespaces de la nav sobreviven a los cambios de ruta

> **Que cambia:** al navegar entre vistas del mismo app, la nav NO vuelve a mostrar los otros nombres en el idioma fuente.
> **Por que:** `applyContext` reescribe `fallbackNS` en cada cambio de ruta (187); si el fix solo apendea una vez, la navegacion lo borra.

El runtime DEBE preservar los namespaces por-objeto de la nav en el `fallbackNS` a traves de las recomposiciones de contexto (cambios de ruta dentro del mismo app), sin exigir que `ensureNavNamespaces` se vuelva a invocar en cada navegacion.

<details><summary>Scenario</summary>

GIVEN la nav ya precargo los namespaces de los 5 objetos (REQ-01)
WHEN el usuario navega de Study Plans a otra vista del mismo app
THEN los nombres de vista de los demas objetos siguen traducidos (no reaparece el idioma fuente).
</details>

### REQ-03 — Re-render tras la carga async (la trampa)

> **Que cambia:** cuando los namespaces terminan de cargar (operacion async), los labels ya renderizados se re-traducen.
> **Por que:** `translateWithFallback` corre sincrono al render; `loadNamespaces` es async. Sin una senal reactiva, los labels quedan crudos aunque el catalogo ya este cargado. i18next-vue reacciona a `changeLanguage`, no a `loadNamespaces`.

Al completar la carga de nuevos namespaces, el runtime DEBE emitir una senal reactiva que dispare el recomputo de `navObjects` (analoga a la dependencia existente de `$i18nLanguage`), de modo que los labels se re-traduzcan sin recarga de pagina ni navegacion.

<details><summary>Scenario</summary>

GIVEN la nav se renderizo antes de que el namespace de un objeto cargara (labels crudos)
WHEN `ensureNavNamespaces` termina de cargar los namespaces
THEN `navObjects` recomputa y los labels pasan a mostrarse traducidos, sin intervencion del usuario.
</details>

### REQ-04 — Sin regresion en la vista activa, los tabs ni el override por tenant

> **Que cambia:** nada, explicitamente. El fix es aditivo al lookup chain.
> **Por que:** el blast radius es el i18n de toda la nav; hay que garantizar que la prioridad de resolucion no cambie.

Los namespaces de la nav DEBEN ubicarse en el `fallbackNS` con prioridad MENOR que el contexto de ruta activo y que el override por tenant (`tenants/<t>/__db`), y MAYOR que el catalogo bundled de cold-start (`bundled/common`). La vista activa, los tabs (`labelKey` en `common`) y los overrides de tenant DEBEN resolver exactamente igual que antes.

## Fix scope

En alcance (execute_scope del ticket):
- `suite/plugins/i18n.ts` — helper `ensureNavNamespaces`, persistencia de los ns de nav en `fallbackNS`, senal reactiva, provide.
- `suite/composables/useObjectManager.ts` — derivar el set de objetos de la nav, invocar el helper, consumir la senal reactiva en `navObjects`.
- `suite/utils/i18nBridge.ts` — solo si se necesita exponer/reutilizar la resolucion por-objeto (preferir reutilizar `resolveNamespaces` sin cambios).
- `suite/components/static/ObjectNavBar.vue` — solo si el re-render lo exige (preferir NO tocar: el fix vive en el composable/plugin).

Fuera de alcance:
- Mover labels a `common` (A2, descartado por Aduana).
- Cambios en el contenido i18n de cualquier mod (1616 ya lo publico).
- Cambios en el contrato `I18nContext` (A1c, mas invasivo; descartado a favor de A1b).

## Constraints

- No cambiar el orden de prioridad del lookup chain para el contexto activo ni el tenant override (REQ-04).
- El helper debe ser idempotente y barato: no re-cargar namespaces ya residentes, no re-apendear duplicados.
- Respetar el modo debug `show-source-strings` (cimode): no forzar traduccion cuando el dev pidio ver keys.
- SSR-safe: el helper puede ejecutarse en server; degradar a best-effort si el fetch falla (igual que el backend del manifest).
- Codigo en ingles, comentarios en espanol. Sin `any` nuevos salvo el patron `($x as any)` ya usado en el archivo para i18next.

## Dependencies

- UPONE-1645 (SPEC-core-implement-nav-view-label-key, mergeado): establecio `labelKey` en `common` y la cascada de tabs. No lo bloquea; este fix es ortogonal (carga de namespace por-objeto).
- UPONE-1616 (TICKET-136): consumidor donde se descubrio; ya publico las traducciones en/pt. No se toca.

## Risks and mitigations

| Riesgo | Donde | Mitigacion |
|--------|-------|------------|
| Reescritura de `fallbackNS` en cada ruta borra los ns de nav | `applyContext:187` | REQ-02: mantener un set persistente de ns de nav y recomponer `fallbackNS` incluyendolo en cada `applyContext` |
| Labels quedan crudos por carrera sync/async | `navObjects` computed | REQ-03: senal reactiva (version ref) que el computed lee; bump post-carga |
| Sobrecarga de HTTP por precargar muchos objetos | `ensureNavNamespaces` | idempotencia: solo cargar ns nuevos; el backend cachea en localStorage por buildHash |
| Cambio de prioridad rompe override de tenant o vista activa | lookup chain | REQ-04: ns de nav por debajo del contexto activo y del tenant, por encima de bundled |
| Recomputo excesivo de `navObjects` | watch en useObjectManager | observar solo el set de objectNames (no cada layout); disparar helper solo cuando el set cambia |

## Tasks

### T1 — Helper `ensureNavNamespaces` + persistencia + senal reactiva (plugin)

- **Archivos:** `suite/plugins/i18n.ts`
- **Contrato:**
  - Agregar un set persistente `navNamespaces: Set<string>` y un `navNsVersion = ref(0)` (senal reactiva).
  - Refactorizar el final de `applyContext` para componer `fallbackNS` = `[...effectiveOrder.slice(1), ...navExtra, BUNDLED_NS]`, donde `navExtra` = los `navNamespaces` que no esten ya en `effectiveOrder`. Guardar `lastEffectiveOrder` para poder recomponer fuera de `applyContext`.
  - Implementar `ensureNavNamespaces(objectNames: string[])`: para cada objeto, `resolveNamespaces(manifest, { ...currentConfig.value, objectName, layoutType: undefined, layoutName: undefined })`, juntar los `ns` (excluyendo `BUNDLED_NS`); quedarse con los que no esten en `navNamespaces`; si hay nuevos, agregarlos al set, `await i18next.loadNamespaces(nuevos)`, recomponer `fallbackNS`, y `navNsVersion.value++`. Guard: no-op si `showSourceStrings.value` o lista vacia.
  - Proveer `ensureNavNamespaces` y `i18nNavVersion` (el ref) en el `provide`.
- **Validation:** typecheck; unit test de `resolveNamespaces` sigue verde; inspeccion de que `applyContext` preserva `navNamespaces` tras cambio de contexto.
- **Rollback:** revertir el archivo; el runtime vuelve al comportamiento por-contexto.

### T2 — Consumir el helper y la senal en `useObjectManager`

- **Archivos:** `suite/composables/useObjectManager.ts`
- **Contrato:**
  - Destructurar `$ensureNavNamespaces` y `$i18nNavVersion` de `useNuxtApp()` (junto a `$i18next`, `$i18nLanguage`).
  - Computed liviano `navNamespaceObjects` = set de `layout.objectName` de `availableLayouts.value` (raw; `resolveNamespaces` maneja rt__ via `buildLevels`).
  - `watch(navNamespaceObjects, (names) => { void $ensureNavNamespaces(names); }, { immediate: true })`.
  - En el computed `navObjects`, agregar `void ($i18nNavVersion as any)?.value;` junto a la dep de `$i18nLanguage` (REQ-03).
- **Validation:** typecheck; unit tests de suite verdes; smoke runtime (REQ-01/02/03).
- **Rollback:** revertir el archivo.

### T3 — Verificacion runtime multi-app / multi-idioma + regresion

- **Archivos:** (verificacion, sin cambios de codigo salvo hallazgo)
- **Contrato:** smoke en tenant UPU: (a) Curriculum Design en ingles, los 5 nombres de vista traducidos sin navegar; (b) navegar entre vistas -> se mantienen (REQ-02); (c) tabs y vista activa sin cambios (REQ-04); (d) repetir en pt; (e) verificar una segunda app multi-vista si esta disponible. Evidencia DOM/console.
- **Validation:** DET-36 runtime-verification con evidencia real.
- **Rollback:** n/a.

## Open questions

- Ninguna bloqueante. `ObjectNavBar.vue` queda en scope por precaucion pero se espera NO tocarlo (el re-render lo resuelve la senal reactiva en el composable).

## Decisions (cerradas durante design)

- **DEC-A1b:** enfoque A1b (helper en plugin invocado por el composable) sobre A1c (extender `I18nContext` con `navObjects`). Razon: A1b mantiene el conocimiento de la app en la app y el mecanismo de carga en el plugin, sin ampliar el contrato del contexto ni tocar el memo de `applyContext`. Reversibilidad alta (2 archivos).
- **DEC-A2-descartada:** mover los labels de vista a `{mod}/common` (workaround mod-only) descartado por Aduana: generaliza un truco, duplica claves y choca con el diseno de namespaces por-objeto.

## Acceptance checkpoints

- [x] AC-1 (REQ-01): en ingles, los 5 nombres de vista de Curriculum Design traducidos sin navegar. Evidencia: `$i18next.t` en en-CL (AcademicProgram/Activity/Curriculum/Offering/core_DataLog) + screenshots dropdown (TC1).
- [x] AC-2 (REQ-02): navegar a Study Plans mantiene los ns por-objeto en `fallbackNS` sin duplicar el activo. Evidencia: dump de `fallbackNS` (TC2).
- [x] AC-3 (REQ-03): re-render tras carga async + switch de idioma en caliente (en/pt) re-resuelve. Evidencia: `$loadAndSetLocale` + `t()` (TC3).
- [x] AC-4 (REQ-04): tabs, vista activa y prioridad del lookup sin regresion; dedup del activo correcto. Evidencia: screenshots + fallbackNS (TC4).
- [x] AC-5: unit 40/40 (i18nBridgeNav 14 + navTabs 26); suite 94/94; typecheck 0 err en archivos tocados (TC6).
