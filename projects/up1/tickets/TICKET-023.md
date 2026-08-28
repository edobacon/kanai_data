---
id: TICKET-023
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1038
module: curriculum-design
autopilot: manual
---

# Investigar hydration mismatch SSR en CompositeSectionTreeElement

## Request

Investigar y resolver el "Hydration mismatch" reportado en la consola del browser (Nuxt SSR) durante el smoke test de [TICKET-014](./ticket-014.md). Origen: backlog item B1 del TICKET-014, dejado como `should` y nunca investigado.

**Contexto historico (TICKET-014 sessions log, 2026-05-07):**

> "Reportado 'Hydration mismatch' en console del browser (Nuxt SSR). Sospechoso: el cambio `saveError: ref<string | null>` → `ref<string | undefined>` en CompositeSectionTreeElement.vue. SSR puede serializar `null` y cliente render `undefined`, generando mismatch. NO investigado a fondo por priorizar coexistencia. Capturado como B1."

**Estado al momento de abrir este ticket (2026-05-12):**
- El cambio `saveError: ref<string | undefined>(undefined)` sigue en codigo ([CompositeSectionTreeElement.vue:380](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue)).
- Suite Nuxt 4 corre con `ssr: true` en `/:tenant_id/**` (verificado en `suite/nuxt.config.ts`).
- No hay reportes posteriores que confirmen ni descarten que el mismatch persiste.
- El reporte original NO incluyo el mensaje exacto del navegador (nodo DOM, atributo, valor expected vs actual).

**Objetivo del ticket:**
1. Reproducir el hydration mismatch en local con la rama develop actual.
2. Capturar mensaje exacto del browser (DOM node, atributo afectado, expected vs actual).
3. Diagnosticar causa raiz con verificacion multi-capa (DET-5): el sospechoso (saveError) o causas alternativas.
4. Disenar el fix con la opcion correcta segun causa raiz.
5. Si NO se reproduce, cerrar como `not-reproducible` con racional documentado.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (curriculum-design) |
| Modulo principal | curriculum-design |
| Modulos afectados | suite (consumer SSR), platform/Vueform (potencialmente) |
| creates_visual | false |
| creates_data | false |

## Creation scope

No aplica — fix sin creacion visual ni de datos. `design-draft` no se invoca.

## Triage

Investigacion preliminar ejecutada al abrir el ticket (lectura estatica del codigo). Las hipotesis estan ordenadas por prioridad de descarte/confirmacion.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El cambio `saveError: null → undefined` rompe SSR hydration porque server serializa `null` (omitido en JSON) y cliente inicia con `undefined`, generando render distinto | ✗ probablemente descartada | El consumer ([CompositeSectionForm.ts:32](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionForm.ts)) declara `saveError: { type: String, default: null }` — cuando padre envia `undefined`, Vue 3 resuelve a `null` por la regla de defaults. Render condicional `saveError ? h(Alert, ...) : <fallback>` evalua igual con null/undefined (ambos falsy). Server y cliente deberian renderizar identico. Requiere confirmacion empirica reproduciendo el mismatch |
| H2 | El mismatch viene del flujo async de Apollo (tree, loading, error) renderizando estado distinto en server vs cliente | ? propuesta | `useTenantApolloClient()` se invoca en setup ([CompositeSectionTreeElement.vue:355](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue)). Si las queries no usan `useAsyncData` / `useLazyQuery` o equivalentes que persistan el estado SSR → cliente, el render inicial diverge. Necesita verificar como se ejecutan las queries (cliente-only? SSR-aware?) |
| H3 | El mismatch viene del wrapper `defineElement` de Vueform — renderiza markup distinto en SSR vs cliente por su sistema de slots/composition interno | ? propuesta | Vueform es heavy y custom Vueform elements son un area no probada en SSR. BUG-platform-011 (modal stack manager no expuesto) sugiere que la integracion SSR con custom Vueform NO es priority de plataforma. El mod tiene 2 SFCs con `defineElement` — solo CompositeSectionTreeElement.vue tiene Apollo + estado complejo |
| H4 | El mismatch reportado no corresponde a CompositeSectionTreeElement.vue — el dev lo asocio por temporalidad pero la causa real esta en otro componente del flujo (Modal molecule, otro atom, theme tokens) | ? propuesta | El reporte original NO incluyo el nodo DOM exacto del mismatch. La asociacion con saveError fue heuristica. Hay multiples componentes nuevos en el flujo (Modal, Alert, IconButton, Heading, CompositeSectionNode, etc.) — cualquiera podria ser la fuente |
| H5 | El cambio del default del prop hijo de `null` a algun otro valor (no actualizado en este ticket) genera el mismatch | ? propuesta | Validar que `saveError: { type: String, default: null }` no haya cambiado. Comparar contra el estado pre-TICKET-014 con git blame |

### Context found

**Branch actual**: `develop` (verificado con `git branch --show-current` en `up1/mods/curriculum-design`).
**Ultimo commit**: `09e4e02 Merge UPONE-1038-a11y-wcag-aa-curriculum-design into develop` (post-TICKET-022).
**Estado del codigo**: `saveError` ref con tipo `string | undefined` y setters `undefined` se mantienen tal como los dejo TICKET-014.

**Codigo investigado (lectura estatica):**

- [CompositeSectionTreeElement.vue:380](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue) — `const saveError = ref<string | undefined>(undefined)`. Modificado por TICKET-014 S2.T8.
- [CompositeSectionTreeElement.vue:150](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue) — `:save-error="saveError"` pasado al `<CompositeSectionForm>`.
- [CompositeSectionForm.ts:32](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionForm.ts) — `saveError: { type: String, default: null }`. **NO actualizado en TICKET-014** (sigue declarando default `null`).
- [CompositeSectionForm.ts:179-180](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionForm.ts) — `const errorAlert = saveError ? h(Alert, ...) : <fallback>`. Render condicional truthy/falsy.
- **Accesos a `window`** detectados en lineas 338-342 y 471-474 — protegidos con `typeof window === 'undefined'` (codigo de runtime de animaciones, NO render reactivo). NO sospechoso para mismatch.

**Refs declarados en setup (potenciales fuentes de divergencia SSR/cliente):**
- `reorderAnnouncement: ref('')` — vacio, OK
- `lastKeyboardMovedId: ref<string | null>(null)` — null, OK
- `rootListEl: ref<HTMLElement | null>(null)` — DOM ref, null en server (OK si solo se asigna)
- `saving: ref(false)` — boolean, OK
- `saveError: ref<string | undefined>(undefined)` — **sospechoso H1**
- `modalState: reactive<{...}>` — `open: false`, mode/node/parentNode null (linea 360, asumiendo defaults)
- `viewState: reactive<{...}>` — similar (linea 374)
- `tree: ?` — viene de Apollo, **sospechoso H2**

**Rules del modulo**: ninguna rule de SSR/hydration en `rules/curriculum-design/`. Las rules de platform mencionan tokens y SFCs Vueform pero no SSR.

**Bugs abiertos relacionados**:
- [BUG-platform-011](../bugs/platform/bug-platform-011.md) — modalStackManager no expuesto a custom Vueform elements. Causa raiz del modal casero (lineas 130-152). Posible conexion con H3.

**Specs relacionados**:
- [SPEC-curriculum-design-fix-typescript](../specs/curriculum-design/SPEC-curriculum-design-fix-typescript.md) — spec del TICKET-014. NO menciono SSR. F1-F5 son sobre tipos, no runtime.

**Tickets predecesores**:
- [TICKET-014](./ticket-014.md) — origen del cambio + del backlog item B1. **Pre-DET-22**.
- [TICKET-022](./ticket-022.md) — WCAG implementation, cambio `<template #element>` y atributos ARIA en mismo componente. Posiblemente introdujo otros side effects SSR no detectados.

**Warnings**:
- Sin reproduccion confirmada al momento de abrir el ticket, todo el diagnostico es preliminar. **DET-3 (inmutabilidad del request)** y **DET-4 (hecho vs inferencia)** aplican: el sospechoso (saveError) es **inferencia** del dev en TICKET-014, NO hecho confirmado. Hay que reproducir antes de implementar fix.
- El reporte de "Hydration mismatch" en consola del browser NO incluyo mensaje exacto — sin nodo DOM ni atributo divergente. **Bloqueante DET-9 (handoffs)**: no se puede pasar a developer sin evidencia minima.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | (a definir tras reproduccion) |
| Base branch | `develop` |
| DB state | UPU con seeds del mod curriculum-design cargados (estado normal del entorno dev) |
| Services | suite (Nuxt 4 SSR), object-manager (GraphQL :4000), redis, postgres |
| Test data | AcademicActivity con CurricularSection (Programa de asignatura completo). El tree debe tener al menos 1 LearningOutcome o EvaluationComponent para que el componente renderice algo |

### Reproduction steps

Pendiente de validacion con el dev. Pasos propuestos:

1. `cd up1 && npm run dev` (o equivalente que levante suite + object-manager).
2. Login con tenant UPU.
3. Navegar a una vista de Programa de asignatura que monte CompositeSectionTreeElement (ej: detail de AcademicActivity).
4. Abrir DevTools → Console del browser.
5. Hacer **hard reload** (Ctrl+Shift+R) para forzar render SSR completo (no client-only navigation).
6. Observar si aparece warning `[Vue warn]: Hydration node mismatch:` o `Hydration mismatch on element ...`.
7. Capturar mensaje completo: nodo DOM, atributo, expected vs actual, stack trace si Vue lo provee.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Session 1 — 2026-05-12 — Intake exploratoria

**Tipo:** ⚑ fuerte (requiere decision humana antes de avanzar a design-fix)
**Validation tier:** T0 (doc-only — solo lectura estatica)

**Acciones realizadas:**
- Lectura estatica de [CompositeSectionTreeElement.vue](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue) y [CompositeSectionForm.ts](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionForm.ts).
- Identificacion de 5 refs en setup + 1 prop con `default: null` en el hijo.
- Verificacion de SSR config en suite (`ssr: true` en `/:tenant_id/**`).
- Cross-ref con TICKET-014 y BUG-platform-011.
- 5 hipotesis planteadas (H1 sospecha original, H2-H5 alternativas).

**Hallazgo principal:**
- La hipotesis original del dev (H1 = saveError null→undefined) **probablemente esta equivocada**: el prop hijo tiene `default: null`, y Vue 3 resuelve `undefined` del padre a ese default → server y cliente deberian renderizar identico para esa rama.

---

### Session 2 — 2026-05-12 — Reproduccion empirica con PW Python

**Tipo:** ⚑ fuerte (requiere decision humana sobre escalation tras hallazgo)
**Validation tier:** T1 (runtime real, captura via Chromium headed)

**Setup:**
- Script Python standalone en `/tmp/pw-hydration-repro.py` con `playwright.sync_api` (Homebrew global, Chromium 1217).
- Auth Clerk dev manual: dev ingreso `eduardo.bacon@uplanner.com` + codigo OTP en la ventana.
- Console listener + pageerror listener capturando todo desde el boot.

**Hallazgos:**

**1. Hydration mismatch CONFIRMADO** (capturado en stage "boot" durante navegacion al listado `/UPU/AcademicActivity/RecordList/default_AcademicActivity_list`):

```
[Vue warn]: Hydration node mismatch:
- rendered on server: JSHandle@node
- expected on client: Symbol(v-fgt)
  at <[tenantId] onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref<undefined>>
  at <RouteProvider key="/UPU()" vnode={...} route={fullPath: /UPU/AcademicActivity/RecordList/default_AcademicActivity_list, ...}>

[error] Hydration completed but contains mismatches.
  (location: @vue/runtime-core/dist/runtime-core.esm-bundler.js, line 1871)
```

**2. Causa raiz NO es CompositeSectionTreeElement** — el mismatch ocurre en el listado, ANTES de llegar al detail que monta el tree. Componente afectado:
- **Pagina Nuxt**: `<[tenantId]>` (probablemente [pages/[tenant_id].vue](../../uplanner/up1/suite/pages/[tenant_id].vue) que es el wrapper de tenant)
- **Parent**: `<RouteProvider>` (de Nuxt)
- **Tipo de mismatch**: `JSHandle@node` (server emitio un nodo DOM concreto) vs `Symbol(v-fgt)` (cliente espera Fragment de multiples roots)

**3. Warnings secundarios** (NO son hydration mismatches, son side-effects):
- `[Vue warn]: Extraneous non-props attributes (class) were passed to component but could not be automatically inherited because component renders fragment or text or teleport root nodes` — afecta `<Modal>` y `<FiltersColumnRecordList>` dentro de `<LayoutRecordList>`. **3 instancias capturadas**.
- `[Vue warn]: inject() can only be used inside setup() or functional components.` — 2 instancias, durante boot y stage 2.

**4. Stage 2 nunca completo** — el script timeout (30s default) navegando a `RecordList/default_AcademicActivity_list` con `wait_until=networkidle`. La aplicacion tiene network activo continuo (Apollo polling? otras suscripciones?). El mismatch ya estaba capturado antes del timeout, asi que el diagnostico no se pierde.

**Hipotesis actualizadas:**

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `saveError: null → undefined` rompe SSR hydration | ✗ **descartada con evidencia runtime** | El mismatch ocurre en el listado, ANTES de montar `CompositeSectionTreeElement`. El componente del mod no esta en la pila de hydration warnings |
| H2 | Apollo async desincroniza SSR vs cliente | ~ parcialmente plausible | `<LayoutRecordList apollo-client=ApolloClient>` aparece en el stack de los warnings de Modal-fragment, pero NO en el stack del hydration mismatch raiz. Apollo puede ser fuente de los side-effects pero no del mismatch principal |
| H3 | Vueform/defineElement rompe SSR | ✗ descartada | El mismatch ocurre fuera del mod, en suite Nuxt. Vueform no esta en la pila |
| H4 | El mismatch reportado en TICKET-014 no era del tree | ✓ **confirmada** | El mismatch real esta en `<[tenantId]>` (pagina wrapper de tenant) — atribucion errada del dev al saveError en TICKET-014 |
| H5 | Default del prop cambio | ✗ descartada | No relevante — el mismatch no esta en el tree |
| H6 (nueva) | Causa raiz: la pagina `[tenant_id].vue` o un hijo via `<NuxtPage v-if="!objectError" :key="selectedLayoutId" />` renderiza shape distinto en SSR vs cliente — server emite nodo, cliente espera fragment | ? propuesta | Stack apunta a `<[tenantId]>` con `RouteProvider` parent. El template de `[tenant_id].vue` tiene multiples `<Transition>`, `v-if` condicionales (notifications panel, modals, dynamic dialog, etc) que dependen de stores (pinia) y estado cliente-only. Si alguno de esos no esta hydration-safe, genera mismatch |

**Decision matrix (que hacer con TICKET-023):**

| Opcion | Pros | Contras |
|--------|------|---------|
| **A** Cerrar TICKET-023 como `not-applicable-to-module` + escalar a nuevo ticket en modulo suite | Mantiene el scope del ticket (era investigar B1 = saveError). Hipotesis B1 queda descartada con evidencia. Causa real se investiga en su modulo correcto | El backlog item B1 ya quedo migrado a 023 — habria que migrar otra vez a un ticket suite |
| **B** Cambiar el module del TICKET-023 de `curriculum-design` a `suite` y continuar la investigacion en este mismo ticket | Continuidad de contexto, una sola unidad de trabajo | Rompe la trazabilidad: tags `predecessor:TICKET-014` y la cadena del mod curriculum-design dejan de tener sentido |
| **C** Profundizar AHORA en `pages/[tenant_id].vue` para identificar el componente exacto que genera el fragment-vs-node mismatch — sin cambiar el ticket | Rapido, ya estamos en flow | Si la causa raiz es en suite/platform, igual hay que escalar — no podemos fixearlo desde curriculum-design |

**Recomendacion (architect):** **A** — cierre 023 con conclusion "B1 descartado, causa real esta en suite/Nuxt page wrapper, escalado a TICKET-NN nuevo en modulo `suite`". Limpia el alcance y registra el aprendizaje (DET-22 no aplica por explore-like nature, pero un teach-close minimo seria valioso).

---

### Session 3 — 2026-05-12 — Test diferencial mod vs core

**Tipo:** ⚑ fuerte (decision de cierre del dev: si es de core, sin seguimiento)
**Validation tier:** T1 (runtime real, captura via Chromium headed)

**Hipotesis a validar:** ¿el hydration mismatch ocurre en rutas que NO involucran el mod curriculum-design?

**Setup:**
- Script Python: `/tmp/pw-hydration-differential.py`.
- Mismo entorno PW Homebrew + Chromium 1217 + auth Clerk manual.
- 3 navegaciones con hard reload (forzando SSR completo) en cada una.

**Resultados:**

| Ruta | Tipo | Hydration mismatches `<[tenantId]>` | Warnings relevantes totales |
|------|------|-------------------------------------|----------------------------|
| `/UPU/profile` | CONTROL (sin mod) | **4** | 6 |
| `/UPU` (home) | CONTROL (sin mod) | **4** | 6 |
| `/UPU/AcademicActivity/RecordList/...` | TEST (con mod) | **4** (mismos) | 20 |

**Stack identico en las 3 rutas:**
```
[Vue warn]: Hydration node mismatch:
- rendered on server: JSHandle@node
- expected on client: Symbol(v-fgt)
  at <[tenantId] onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref<undefined>>
  at <RouteProvider key="/UPU()" ...>

[error] Hydration completed but contains mismatches.
```

**Veredicto:**

**El hydration mismatch es de CORE (suite Nuxt wrapper [pages/[tenant_id].vue](../../uplanner/up1/suite/pages/[tenant_id].vue)), NO del mod curriculum-design.** Aparece identico en cualquier ruta dentro del tenant — incluso `/UPU/profile`, que solo monta el [profile/index.vue](../../uplanner/up1/suite/pages/[tenant_id]/profile/index.vue) sin el mod.

**Diferencia secundaria en la ruta del mod** (20 warnings vs 6 en control):
- 14 warnings extra son **`Extraneous non-props attributes (class)`** sobre `<Modal>` dentro de `<FiltersColumnRecordList>` / `<LayoutRecordList>`. **NO son hydration mismatches**, son warnings de calidad de props inheritance.
- Estos warnings vienen del **layout package del platform** (`@uplanner/layout-engine`), NO del mod curriculum-design. El `<FiltersColumnRecordList>` y `<LayoutRecordList>` son componentes del layout consumidos por cualquier RecordList, no especificos del mod.

**Decision del dev (2026-05-12):**
> "Si es de los productos core, no le haremos seguimiento."

Aplicado: TICKET-023 se cierra como **not-our-scope**.

## Resolution

**Status final**: `closed`
**Closed date**: 2026-05-12
**Resolution type**: `not-applicable-to-module` (originalmente reportado como bug del mod en TICKET-014 B1, validado empiricamente que es de core/platform)

**Conclusiones:**

1. **Hipotesis original (B1 = saveError null→undefined rompe SSR hydration) DESCARTADA con evidencia runtime.** El mismatch ocurre en rutas que NO montan `CompositeSectionTreeElement`, demostrando que el cambio de TICKET-014 no es la causa.

2. **Causa raiz real**: la pagina suite [pages/[tenant_id].vue](../../uplanner/up1/suite/pages/[tenant_id].vue) (wrapper de tenant) renderiza shape distinto en SSR vs cliente. Server emite un nodo DOM, cliente espera `Symbol(v-fgt)` (Fragment de multiples roots). Hipotesis estructural (no validada porque queda fuera de scope): algun `v-if` o `<Transition>` del wrapper depende de estado cliente-only (Pinia stores, sessionStorage, etc.) sin hydration-safe initialization.

3. **Sin seguimiento desde el mod curriculum-design** — la decision del dev es no perseguir bugs de core/platform desde tickets del mod. Si platform UP1 lo prioriza en su backlog, se atendera ahi.

4. **El cambio `saveError: ref<string | undefined>(undefined)` de TICKET-014 puede mantenerse tal como esta** — no es causa de regresion runtime.

**Decision documentada como local (no se promueve a rule):**
- DEC-LOCAL-01: bugs de SSR/hydration cuyo stack apunta a componentes core (suite/, layout/) o Nuxt internals NO son seguimiento del mod curriculum-design. Validacion via test diferencial PW (control: rutas sin mod, test: rutas con mod) antes de descartar.

**Artefactos del ticket:**
- Scripts: `/tmp/pw-hydration-repro.py`, `/tmp/pw-hydration-differential.py` (one-shot, no commiteados — el ticket preserva la metodologia para reproduccion futura)
- Screenshots: [ticket-023.screenshots/](./ticket-023.screenshots/) con baselines pre/post de cada ruta
- Dump completo: [ticket-023.screenshots/ticket-023-differential-dump.txt](./ticket-023.screenshots/ticket-023-differential-dump.txt)

**Backlog efecto sobre TICKET-014:**
- Item B1 queda **resuelto (descartado con evidencia)** — actualizar TICKET-014 reflejando el cierre.

## Testing

(Pendiente — se llena post-reproduccion y post-design-fix.)

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

Investigacion del backlog item B1 de TICKET-014 (hydration mismatch SSR en CompositeSectionTreeElement). Reproducido empiricamente con PW Python + Chromium headed. Capturado el mensaje exacto del browser y ejecutado test diferencial.

**Resultado**: el mismatch ocurre en el wrapper de tenant de suite ([pages/[tenant_id].vue](../../uplanner/up1/suite/pages/[tenant_id].vue)), no en el mod. Aparece identico en `/UPU/profile`, `/UPU` y `/UPU/AcademicActivity/RecordList/...` — el factor comun es el wrapper Nuxt, no el componente del mod.

**Hipotesis original (saveError null→undefined del TICKET-014)** queda descartada con evidencia runtime: el cambio del mod no es la causa.

**Sin seguimiento desde curriculum-design** por decision del dev — bugs de core/platform se atienden en su modulo. Bug registrado en [BUG-platform-016](../bugs/platform/bug-platform-016.md) para que platform UP1 lo priorice en su backlog.

**Valor preservado del ticket**:
- Metodologia documentada para reproducir hydration mismatches en suite (PW Python + auth Clerk manual + test diferencial).
- B1 cerrado con evidencia (no como deuda asumida sin investigar).
- DEC-LOCAL-01 establece el patron: bugs SSR cuyo stack apunta a core → validar con test diferencial antes de perseguir.
