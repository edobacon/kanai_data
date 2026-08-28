---
id: BUG-platform-016
project: up1
type: bug
module: platform
tags:
  - ssr
  - hydration
  - nuxt4
  - vue3
  - suite
  - tenant-wrapper
---

# Hydration mismatch en wrapper `[tenant_id].vue` de suite — server emite nodo, cliente espera Fragment

## Symptom

En cualquier ruta dentro de un tenant (probado `/UPU/profile`, `/UPU` home, `/UPU/AcademicActivity/RecordList/...`), tras un hard reload (que fuerza SSR completo + hydration), aparece en la consola del browser:

```
[Vue warn]: Hydration node mismatch:
- rendered on server: JSHandle@node
- expected on client: Symbol(v-fgt)
  at <[tenantId] onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref<undefined>>
  at <RouteProvider key="/UPU()" vnode={...} route={...}>

[error] Hydration completed but contains mismatches.
```

Patron observado:
- **4 hydration mismatches por hard reload** (2 warnings de "node mismatch" + 2 errors de "Hydration completed but contains mismatches"), en cada ruta.
- Identico en rutas con y sin mods activos — el factor comun es el wrapper `[tenant_id].vue`.

## Expected behavior

Server y cliente deberian renderizar el mismo shape de VNode para `<[tenantId]>`. Sin warnings de hydration. Sin errors de "Hydration completed but contains mismatches".

Referencia: Vue 3 SSR docs — hydration mismatches indican que el render tree initial difiere entre server y cliente, lo cual rompe el contrato SSR y degrada el rendimiento (Vue tiene que re-renderizar la parte del arbol que no coincide).

## Root cause

**Pendiente de diagnostico definitivo.** Hipotesis estructural (no validada — fuera de scope del ticket curriculum-design que detecto el bug):

- **File**: [up1/suite/pages/[tenant_id].vue](../../../uplanner/up1/suite/pages/[tenant_id].vue)
- **Cause probable**: el wrapper tiene multiples `<Transition>`, `v-if` condicionales y modals (NotificationPanel, DynamicDialog, ConnectivityModal, TourOverlay, CreateViewWizard) que dependen de estado cliente-only (Pinia stores, sessionStorage, computed con APIs del browser). Si alguno se inicializa con valor distinto en server vs cliente, Vue interpreta el wrapper como Fragment de multiples roots en el cliente (`Symbol(v-fgt)`) mientras el server emitio un nodo concreto.

Pistas adicionales detectadas en mismo ticket (no son hydration mismatch pero indican uso problematico de Vue):
- `[Vue warn]: inject() can only be used inside setup() or functional components` — 2 instancias en boot.
- `[Vue warn]: Extraneous non-props attributes (class) were passed to component but could not be automatically inherited because component renders fragment or text or teleport root nodes` — afecta `<Modal>` dentro de `<FiltersColumnRecordList>` / `<LayoutRecordList>` (estos son del **layout package**, no del wrapper de tenant — gap separado).

**Diagnostico definitivo requiere**:
1. Identificar cual `v-if` / `<Transition>` del wrapper resuelve distinto en server vs cliente.
2. Verificar inicializacion de stores Pinia con `useState` o equivalente para preservar estado SSR → cliente.
3. Validar que computed/refs no leen `window`/`document`/`sessionStorage` en render path.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | Todos los usuarios de suite (cualquier tenant, cualquier ruta dentro del tenant) |
| Data affected | Ninguno — el cliente re-renderiza correctamente despues del warning, no hay perdida funcional |
| Modules affected | suite (wrapper de tenant); side effect en cualquier feature que monte dentro del wrapper |
| Frequency | **Siempre** — en cada hard reload dentro del tenant. Soft navigation (SPA links) no dispara hydration, asi que no aparece |
| Severity rationale | low — no rompe funcionalidad, solo degrada performance del primer render y polute consola. Pero **violacion del contrato SSR** que merece atencion del platform team |

## Reproduction

### Environment

| Campo | Valor |
|-------|-------|
| Environment | dev (suite Nuxt 4 con `ssr: true` en `/:tenant_id/**`) |
| Browser/Client | Chromium 1217 (PW headed). No verificado en otros browsers — Vue warnings son agnosticos |
| Data conditions | Cualquier tenant con seed core minimo. Reproducido en UPU |
| Auth | Clerk dev session activa |

### Steps

1. Levantar suite y object-manager (`npm run dev` o equivalente). Verificar suite escuchando en `:3000`.
2. Login con Clerk en `/login/UPU`.
3. Navegar a cualquier ruta dentro del tenant: `/UPU/profile`, `/UPU` (home), `/UPU/AcademicActivity/RecordList/default_AcademicActivity_list`, etc.
4. Abrir DevTools → Console.
5. Hacer **hard reload** (`Cmd+Shift+R` en Mac, `Ctrl+Shift+R` en otros) para forzar SSR completo (no client navigation).
6. Observar 4 warnings/errors en console: 2x `[Vue warn]: Hydration node mismatch` + 2x `Hydration completed but contains mismatches`.

**Reproducible 100% de las veces** en las 3 rutas probadas.

## Workaround

Ninguno necesario — el bug no rompe funcionalidad. La consola muestra los warnings pero la suite opera normalmente despues del re-render del cliente.

Ocultarlo en producccion: Vue 3 silencia hydration warnings con `NODE_ENV=production`, asi que el bug solo es visible para devs en local. El **error** "Hydration completed but contains mismatches" si se ve en production builds (es un `console.error` no condicional al env).

## Solution

**Pendiente de implementacion por platform team.**

Approach propuesto (sin implementar):

1. Auditoria de `[tenant_id].vue`:
   - Identificar cada `v-if` y `<Transition>` y su fuente de truth.
   - Verificar que stores Pinia accedidos en render path usan `useState()` o equivalente Nuxt para SSR-safe initialization.
   - Wrappear codigo cliente-only en `<ClientOnly>` cuando sea necesario (notifications panel, modals que dependen de window/document).

2. Si la causa raiz es **inestable a nivel arquitectural** (ej: muchos hooks de stores en el wrapper), considerar:
   - Mover el contenido cliente-only (`<NotificationPanel>`, `<DynamicDialog>`, `<ConnectivityModal>`, `<TourOverlay>`, `<CreateViewWizard>`) fuera del template SSR via `<ClientOnly>` wrapper.
   - O bien marcar el wrapper como client-only (`definePageMeta({ ssr: false })`) — pero pierde SSR para todas las rutas del tenant, lo cual contradice la decision de suite (`/:tenant_id/**: { ssr: true }`).

## Related

- **Detectado en**: [TICKET-023](../../tickets/ticket-023.md) (investigacion del backlog item B1 de [TICKET-014](../../tickets/ticket-014.md))
- **Tickets que NO son la causa**:
  - TICKET-014 S2.T8 (cambio `saveError: ref<string \| null>` → `ref<string \| undefined>`) — fue la hipotesis original, descartada con evidencia runtime
- **Decisions**: ninguna (curriculum-design no escala fix de bugs de core/platform)
- **Specs**: ninguna afectada directamente
- **Bugs relacionados (mismo patron de side-effects Vue en suite/layout)**:
  - 14 warnings de `Extraneous non-props attributes (class)` sobre `<Modal>` dentro de `<FiltersColumnRecordList>` / `<LayoutRecordList>` — el `<Modal>` molecule renderiza fragment, las clases pasadas no se inherit. Aparecen en cualquier RecordList. **Sin ticket asociado** — vale registrar como bug separado del layout si platform decide priorizar
  - `[Vue warn]: inject() can only be used inside setup() or functional components` — uso de `inject()` fuera de scope (probablemente en algun composable de suite o layout). **Sin ticket asociado**

## Evidence

Capturas runtime en [TICKET-023 screenshots](../../tickets/ticket-023.screenshots/):
- `ticket-023-control-profile.png` — `/UPU/profile` con mismatch
- `ticket-023-control-tenant-root.png` — `/UPU` con mismatch
- `ticket-023-test-mod-list.png` — `/UPU/AcademicActivity/RecordList/...` con mismatch
- `ticket-023-differential-dump.txt` — dump completo de console messages de las 3 rutas con conteo

Reproductores Python (one-shot, no commiteados pero metodologia documentada en TICKET-023 Sessions):
- `/tmp/pw-hydration-repro.py` — captura inicial con auth Clerk manual
- `/tmp/pw-hydration-differential.py` — test diferencial 3 rutas
