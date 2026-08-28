---
id: RULE-core-051
project: up1
type: rule
module: core
level: must
tags:
  - i18n
  - navigation
  - view-picker
  - namespaces
  - suite
  - per-object
  - labelKey
  - UPONE-1716
  - reactivity
  - ssr
---

# La nav debe precargar los namespaces por-objeto de todos los objetos que renderiza, no solo el del contexto de ruta activo

## What

El view-picker de la nav (tabs, dropdown, encabezados) renderiza los nombres de vista de **todos** los objetos del app a la vez. El label de cada vista vive en el namespace **por-objeto** (`{mod}/{Objeto}`, key `layout.<layout>.label`). El runtime i18n de suite carga namespaces **por contexto de ruta activa**, asi que un componente que muestra labels de objetos NO activos MUST precargar los namespaces por-objeto de ese conjunto — no puede asumir que estan cargados. El helper `ensureNavNamespaces(objectNames)` (plugin i18n) es el mecanismo; la capa que conoce el set (ej. `useObjectManager`) lo invoca.

Reglas de la precarga:
- **Persistencia**: los namespaces precargados MUST reincluirse en `fallbackNS` en cada `applyContext` (que lo reescribe por ruta), via `composeFallbackNS` (activo > nav > bundled, deduplicando el activo). Si no, la navegacion los pierde.
- **Reactividad**: `translateWithFallback` corre sincrono al render y `loadNamespaces` es async; el label queda crudo salvo que una **senal reactiva** (ej. `navNsVersion`) que el computed lea dispare el re-render al terminar la carga. i18next-vue reacciona a `changeLanguage`, NO a `loadNamespaces`.
- **Switch de idioma en caliente**: el handler de `languageChanged` MUST recargar los namespaces de nav para el nuevo idioma (el watch del set no re-dispara si los objetos no cambian).
- **SSR**: la precarga es client-only (interactividad de dropdown); precargar en SSR desperdicia payload y arriesga hydration mismatch. En SSR cae al comportamiento por-contexto; el cliente upgradea tras hidratar.
- **Orden por-objeto**: `resolveNavNamespaces` devuelve orden de lookup (mas especifico primero) para que un override file-based por-tenant (`tenants/<t>/<Objeto>`) gane sobre la base, igual que cuando el objeto esta activo.

## Why

UPONE-1716 (TICKET-140): en un tenant multi-idioma, los nombres de vista de los objetos no activos salian en el idioma fuente (es) aunque tuvieran traduccion publicada, porque su namespace por-objeto no se cargaba hasta navegar. Los tabs si traducian porque su `labelKey` (`nav.<mod>.*`) vive en `{mod}/common`, siempre cargado (asimetria de [[RULE-curriculum-design-047]], UPONE-1645). El fix es de **carga**, no de contenido (1616 ya publico las traducciones).

## Where

Runtime i18n de la nav de suite: `suite/plugins/i18n.ts` (`ensureNavNamespaces`, `applyContext` -> `composeFallbackNS`, `languageChanged`), `suite/utils/i18nBridge.ts` (`resolveNavNamespaces`, `composeFallbackNS`), `suite/composables/useObjectManager.ts` (watch client-only + `navObjects` lee `i18nNavVersion`), `suite/components/static/ObjectNavBar.vue` (render de `layout.label`). Aplica a cualquier mod multi-vista (curriculum-design, curriculum-mapping, ...).

## Known limitations (aceptadas en TICKET-140, candidatas a backlog)

- **show-source-strings**: si el set de objetos de la nav cambia MIENTRAS se esta en debug mode (cimode), `ensureNavNamespaces` es no-op y esos objetos no quedan registrados; al salir de debug los nombres nuevos quedan crudos hasta el siguiente cambio de set. Solo afecta a devs con el toggle.
- **poda de `navNamespaces` entre tenants**: el set acumula sin poda entre tenants visitados en la misma sesion (acotado por # tenants). Un override file-based por-tenant por-objeto de un objeto NO activo podria no refrescarse sin recarga de app.
- **guard out-of-order** (`applyContextGuarded`): preexistente; el chequeo de generacion solo retorna, no revierte, en navegacion muy rapida. No introducido por este fix.
