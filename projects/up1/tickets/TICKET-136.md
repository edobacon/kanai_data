---
id: TICKET-136
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1616
module: curriculum-design
autopilot: manual
---

# Curriculum Design · Ajustar orden de los menús

## Request

Reordenar las cinco vistas de Curriculum Design según el orden de trabajo del usuario (carrera, plan, asignatura) y alinear sus nombres, usando capacidades existentes de la plataforma. Alcance completo: orden de las cinco vistas según la tabla del PO (programas académicos, planes de estudios, programa de asignatura, silabos, historial de cambios); renombre de las tres vistas cuyo objeto no comparte otra app (programas académicos, planes de estudios, historial de cambios) con coherencia entre menú, ruta de navegación y encabezado; actualización del test que fija el array de vistas (layouts-declared.test.ts); documentación de por qué Activity y Offering conservan su nombre actual; cobertura de tres idiomas (es/en/pt) con paridad de claves. El renombre de las vistas de Activity y Offering queda fuera por bloqueo: depende de la precondición de core UPONE-1645 (nombre de vista declarable por aplicación). Coordinar con UPONE-1615 (define la visibilidad por rol de las apps curriculares; avisar antes de crear vínculos).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement |
| Tipo de cambio | — |
| Modulo principal | curriculum-design |
| Modulos afectados | — |

## Triage

### Hipotesis

> Codigo verificado el 2026-08-18 contra el working tree real en
> `/Users/edobacon/Workspace/uplanner/up1` (NO `Workspace/up1`, que esta vacio/sin checkout).
> Todas las claves i18n son **anidadas** (`"object": { "Activity": ... }`), no planas.

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El texto actual de las dos vistas en conflicto (Activity, Offering) proviene de la capa de traducciones de Engagement / override, no de curriculum-design | ✓ confirmed | `object.Activity`="Actividad" sale de `mods/uengagement-up1/lang/es/common.i18n.json:3` (curriculum-design NO declara `object.Activity` en ninguna capa: su `lang/es/common.i18n.json` no tiene bloque `object`). `object.Offering`="Ofertas" lo declaran **dos** capas: engagement `lang/es/common.i18n.json:7` y el override por tenant `suite/lang/tenants/upu/es/common.i18n.json:17`; gana el override (ultima capa). El menu resuelve el texto por `object.${objectName}` sin calificador de app: `suite/composables/useObjectManager.ts:626-633`. |
| H2 | Declarar la clave en curriculum-design no aisla el cambio (o directamente pierde) para Activity/Offering | ✓ confirmed (estructural) | Orden de capas: core, luego mods **ordenados alfabeticamente**, luego override por tenant; gana la ultima. `suite/scripts/lib/i18n-source-map.mjs:92` (`.filter(isMod)...sort()`) + comentarios `:31,:200-201` ("core first, mods last, mods override core"). `curriculum-design` < `uengagement-up1` alfabeticamente ⇒ para `object.Activity`/`object.Offering` la declaracion del mod **pierde** frente a engagement. La unica capa que gana sobre todos los mods es el override por tenant, que aplica a **ambas** apps. Contexto i18n sin dimension de app: `suite/utils/i18nBridge.ts:70-131`. **Manifestacion runtime (que capa se ve en pantalla) queda como smoke pendiente en DoD.** |
| H3 | Reordenar el array de vistas no requiere ningun cambio en el core | ✓ confirmed | El orden lo da la posicion en `defaultObjects`: `mods/curriculum-design/config/app.json:9` (`["Activity","AcademicProgram","Offering","Curriculum","core_DataLog"]`). El core lo consume tal cual via `navOrderedGroupKeys(navTabs, defaultObjects)` con sort estable: `suite/composables/useObjectManager.ts:643-671`; construccion en `suite/composables/navTabs.ts:99-113`. Cero codigo core a tocar. |
| H4 | La ruta de navegacion refleja automaticamente el nombre y el orden nuevos | ✓ confirmed | El nivel de seccion del breadcrumb reutiliza literalmente `group.label` (el mismo label ya calculado para el menu): `suite/composables/breadcrumbTrail.ts:219`. Sin trabajo propio. |
| H5 | El encabezado de cada vista se alinea editando solo la etiqueta de layout y su traduccion en el mod | ✓ confirmed | El encabezado sale del label del layout, distinto de la clave del menu. `mods/curriculum-design/config/layouts/default_Curriculum_list.json:4` dice `"label": "Currículos"`, desalineado con el menu ("Planes de estudios"). Es archivo del mod ⇒ editable ahi. |
| H6 | Ningun otro consumidor depende del orden actual del array mas alla del test | ✓ confirmed | Unicos consumidores de `defaultObjects`: `suite/composables/navTabs.ts` (construccion de tabs) y el test `mods/curriculum-design/tests/integration/layouts-declared.test.ts:234-236` que asierta el array exacto con `toEqual(['Activity','AcademicProgram','Offering','Curriculum','core_DataLog'])`. Se rompe con cualquier reorden ⇒ se actualiza en el mismo cambio. |
| H7 | **(nueva, del intake)** En UPU la capa ganadora para los objetos "libres" (AcademicProgram, Curriculum, Offering, core_DataLog) es el override por tenant (suite/core), que ensombrece la declaracion del mod | ✓ confirmed | `suite/lang/tenants/upu/es/common.i18n.json:10-19` declara `object`: Curriculum="Planes de Estudio", AcademicProgram="Programas académicos", Offering="Ofertas", core_DataLog="Historial de cambios". Como el override es la ultima capa, **declarar esas mismas claves en el mod NO cambia el menu en UPU**. Consecuencia sobre la decision del pre-intake (2026-08-18, "alinear los 3 nombres libres via el mod"): para AcademicProgram y core_DataLog el nombre objetivo **ya se ve correcto via el override**; para Curriculum el override dice "Planes de Estudio" (casing/plural distinto del objetivo "Planes de estudios") y la declaracion del mod no ganaria. Ver gap G1. |

**Decisiones (Story Points):** el ticket Jira UPONE-1616 no tiene SP publicado (sin asignar). Estimacion del
equipo en el detalle: **3 SP** para el alcance ejecutable (orden + 3 nombres libres + i18n + test +
verificacion de dos apps), **2 SP** si se acota a solo orden + test. `story_points.executed_method: skip`
(no hay SP en Jira al intake).

### Context found

**KB inyectado (analisis previo verificado, semilla de hipotesis):**
- `kb/sp9/UPONE-1616-detalle.md` — contrato del ticket (historia, alcance, AC, DoD, dependencias).
- `kb/sp9/UPONE-1616-pre-intake.md` — mapa de enfoques, hipotesis H1-H6, limitacion conocida, precondicion.
- `kb/sp9/UPONE-1616-aduana.md` — frontera core/mod, veredicto `hay-core-worthy`.
- `kb/sp9/UPONE-1616-explicativo.html` — material explicativo del ticket.

**Correccion de encuadre (re-plan 2026-08-18, verificada contra `specs/core/SPEC-core-implement-nav-view-label-key.md`, UPONE-1645/TICKET-132):**
La conclusion de H7 y de la seccion "Limitacion conocida" del pre-intake — que en UPU el override por tenant
ensombrece al mod y por eso el nombre del menu de las vistas libres "no se puede cambiar mod-only" — **queda
superada** una vez que existe UPONE-1645. Ese ticket introduce `labelKey` por entrada de nav con cascada
`labelKey → object.<Objeto> → tecnico` (REQ-03), aplicable a `defaultObjects` y `navByRole` (REQ-01), donde
`labelKey` es una clave i18n **propia del mod** (ej. `nav.curriculumDesign.curriculum`), **no** `object.<Objeto>`.
Consecuencias: (a) el override por tenant (que solo declara claves `object.*`) **no ensombrece** esa clave; (b)
`labelKey` se resuelve **antes** de `object.<Objeto>`, asi que el mod gana el nombre del menu; (c) es per-app
(1645 REQ-04), asi que nombrar Activity/Offering desde Curriculum Design **no afecta** a Engagement. Por lo
tanto **las cinco vistas** (las tres libres y Activity/Offering) se renombran con el **mismo mecanismo** desde
el mod, sin tocar core y sin decision de PO. Los gaps **G1** (casing de Curriculum via override) y **G2** (claves
`object.*` del mod para portabilidad) quedan **disueltos**: la labelKey del mod fija el texto exacto en cualquier
tenant, con o sin override. **G4** (Activity/Offering) pasa de "bloqueado por falta de capacidad" a "en alcance,
via labelKey" con **dependencia dura de secuenciacion** sobre UPONE-1645 (el mecanismo debe existir para
consumirlo). Ver `SPEC-curriculum-design-improve-menu-order.md` DEC-LOCAL-01.

**Reglas / patrones up1 relevantes:** i18n cascada (core → mods alfabetico → override por tenant, gana la
ultima capa); orden de vistas por posicion en `defaultObjects` (PLAT-15 / UPONE-1513); no editar archivos
sincronizados a mano (editar fuente en el mod + `npm run sync`); en repo/commits/PR usar solo el id Jira
(DET-19).

**Divergencia detectada KB vs codigo actual (DET-16 propagacion):** el KB describe la i18n del mod como
`common.i18n.json` con bloque `object`. El codigo real hoy usa **archivos por objeto** (`lang/es/Activity.i18n.json`,
`AcademicProgram.i18n.json`, etc.) que llevan claves `layout.*.label` y `column.*`, mas un `common.i18n.json`
por idioma. El bloque `object` del mod solo existe en **en/pt** con una unica clave `object.core_DataLog`
(`lang/en/common.i18n.json:196-198`, `lang/pt/common.i18n.json:196-198`); **es no tiene bloque `object`**. Esto
no invalida el hallazgo core (colision Activity/Offering), pero refina donde se declararian los nombres libres.

**Dependencias (no se resuelven aqui):**
- **Bloqueado por UPONE-1645** (TICKET-132): capacidad de core "nombre de vista declarable por aplicacion".
  Sin ella, el renombre de Activity y Offering no es ejecutable (H2). Si aterriza antes del cierre, se completan aqui.
- **Coordinar con UPONE-1615** (hermano SP9): al asignar roles a las apps curriculares estas dejan de ser
  publicas; define con que rol se toma la evidencia runtime. Hoy el resolver trata una app sin roles como publica.
- **Coordinar con el equipo de Engagement:** comparte los objetos `Activity` y `Offering` (regresion critica).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `feature/UPONE-1616-order-curriculum-menus` (sugerida; DET-19 usa id Jira) |
| Base branch | `develop` |
| DB state | Sin migraciones. Cambio de config/i18n; requiere `npm run sync` para propagar al tenant UPU |
| Services | suite (localhost:3000), object-manager (localhost:4000), tenant UPU (BD uplanner_upu). Login Clerk test mode |
| Test data | Tenant UPU con apps Curriculum Design y Engagement activas (ambas declaran Activity/Offering) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

2 sessions (plan final de `design-improvement`, re-planificado y desacoplado tras el `iterate` de spec-judge).
El desacople parte la entrega por su acoplamiento a UPONE-1645: S1 no depende de 1645, S2 si.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | **Mod-only, capacidades existentes, SIN 1645**: reordenar `defaultObjects` al orden del PO en **forma string** + alinear encabezado de Curriculum (`Currículos` → `Planes de estudios`) + actualizar el test (forma string) + sync limpio + smoke del orden/encabezado | 1 | T2 | Editar `config/app.json:9` (string reordenada); `default_Curriculum_list.json:4` + `lang/es/Curriculum.i18n.json:4`; assert `layouts-declared.test.ts:234-236` (string); sync; smoke | auto | Test verde (array string reordenado); sync limpio; evidencia runtime del orden y el encabezado |
| S2 | **Dependencia dura de 1645**: convertir `defaultObjects` a **forma objeto** `{object, labelKey}` para las 5 vistas + declarar `nav.curriculumDesign.*` es/en/pt + actualizar el test (forma objeto) + sync + verificacion runtime dos apps (regresion Engagement) + doc del patron | 2 | T3 | `config/app.json` forma objeto; claves i18n del mod; test forma objeto; sync; smoke CD + Engagement; doc/RULE | ⚑ fuerte | Los 5 nombres objetivo en runtime; Engagement intacto; test verde (forma objeto); i18n paridad 3 idiomas; doc/RULE |

**Notas del plan:**
- **Desacople (DEC-LOCAL-02):** S1 entrega valor de UX (orden + encabezado) aunque 1645 se demore; solo S2 gatea sobre 1645.
- **Numeracion:** el ticket no tiene Session N previa registrada ⇒ el plan arranca en S1.
- **Cada cambio de forma del array va con su test** o el build queda rojo (H6): S1 reordena y actualiza el test en forma string; S2 pasa a forma objeto y vuelve a actualizar el test.
- **La verificacion de S2 pesa mas que el cambio:** el criterio de aceptacion es literalmente lo que el
  usuario ve, y hay que comprobar **dos apps** en el mismo tenant. La regresion silenciosa en Engagement
  es el riesgo tecnico principal. En S1 no hay riesgo de regresion (no se cambia ningun nombre).
- **Dependencia de rol (S2):** coordinar con UPONE-1615 antes de tomar la evidencia; si asigna roles a las
  apps curriculares, define con que usuario se verifica (hoy son publicas).
- **Gaps G1/G2 disueltos** por el mecanismo labelKey de 1645 (la clave del mod fija el texto exacto en cualquier tenant, con o sin override). Ver DEC-LOCAL-01 del spec.

### Active questions (gaps)

- **G1 — casing/plural de Curriculum en UPU.** El override dice "Planes de Estudio"; el objetivo del PO es
  "Planes de estudios". Como el override gana en UPU, declararlo en el mod no cambia el menu. Decidir:
  aceptar el texto del override, o editar el override (suite/core, requiere acuerdo, fuera del mod).
- **G2 — alcance de las claves object.* del mod.** Hoy el mod solo declara `object.core_DataLog` (en/pt, no
  es). Decidir si el mod debe llevar las claves de los objetos libres para portabilidad a tenants **sin**
  override (donde no hay capa ganadora), aunque en UPU queden ensombrecidas. Afecta paridad i18n.
- **G3 — que significa "pestana" en el 2do criterio del PO** (pestana del menu vs pestana del navegador).
  La lectura probable es la del menu; la del navegador hoy solo refleja el nombre de la app
  (`suite/pages/[tenant_id].vue:254-268`) y seria cambio de core no contemplado. Requiere confirmacion del PO.
- **G4 — renombre de Activity/Offering: bloqueado por UPONE-1645 (TICKET-132).** No ejecutable en este
  ticket salvo que 1645 aterrice antes del cierre. No se resuelve aqui, es dependencia.
- **G5 — evidencia runtime pendiente (DoD).** El mecanismo esta verificado en codigo; falta el smoke visual
  de ambas apps en UPU. Coordinar rol con UPONE-1615.

### Session 1 — 2026-08-24 10:10 — Reorden (forma mixta, preserva labelKey) + encabezado + test [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Reordenar las 5 vistas al orden PO preservando la forma objeto+labelKey de Activity/Offering (DEC-LOCAL-03), alinear el encabezado de Curriculum ("Currículos"→"Planes de estudios"), actualizar el test al array mixto, sync limpio y smoke del orden/encabezado. Mod-only.

**Tasks completadas**:
- [x] S1.T1 — Reordenar `defaultObjects` al orden PO en forma mixta preservando labelKey de Activity/Offering (DET-40)
- [x] S1.T2 — Encabezado Curriculum "Currículos"→"Planes de estudios" (layout `label` + `lang/es/Curriculum.i18n.json`)
- [x] S1.T3 — Actualizar el assert del test al array mixto (orden PO)
- [x] S1.T4 — `npm run sync` limpio (sin commitear artefactos)
- [x] S1.T5 — Smoke runtime UPU: menu en orden PO + encabezado "Planes de estudios" (evidencia)
- [x] S1.GATE — Gate T2: test verde + sync limpio + evidencia runtime; decidir continue/iterate

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1 approved (super autopilot). Reviewer aislado: sin defectos de codigo (spec pass, DET-40 labelKey preservada, Engagement intacto por construccion); su iterate fue por no tener Bash para correr el test — verificacion independiente completada por el orquestador (DET-33): vitest 158/158 verde, JSON validos, smoke runtime (orden PO + encabezado + labelKey preservada). Diff S1: 4 archivos, +16/-4. Session 2 (completar labelKey de las 3 vistas libres + i18n + smoke 2 apps + doc).
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-08-24 11:45 — Completar labelKey de las 5 vistas + i18n + smoke 2 apps + doc [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regresion completa + smoke)

**Objetivo**: Completar la forma objeto con `labelKey` para las 3 vistas libres (AcademicProgram, Curriculum, core_DataLog), declarar sus 3 claves i18n es/en/pt, actualizar el test a forma objeto, propagar, verificar en runtime los 5 nombres objetivo + regresion Engagement intacta, y documentar el patron. 1645 ya mergeado.

**Tasks completadas**:
- [x] S2.T1 — `defaultObjects` completo a forma objeto (5 vistas con labelKey), orden PO
- [x] S2.T2 — 3 claves nuevas `nav.curriculumDesign.{academicProgram,curriculum,dataLog}` es/en/pt
- [x] S2.T3 — test assert a forma objeto (5 entradas)
- [x] S2.T4 — propagacion limpia (schema acepta forma objeto; sin conflicto i18n)
- [x] S2.T5 — smoke runtime CD: los 5 nombres objetivo + breadcrumb/encabezado coherentes
- [x] S2.T6 — smoke runtime Engagement: nombres intactos (Actividad/Ofertas) — regresion critica
- [x] S2.T7 — doc del patron labelKey por app + condicion de secuenciacion; RULE en KB
- [x] S2.GATE — Gate T3 (dual-judge): 5 nombres + Engagement intacto + test verde + i18n 3 idiomas + doc

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 approved (super autopilot, dual-judge DET-35 T3: ambos jueces approve tras cerrar el gap de evidencia). Codigo/i18n/test/RULE verificados por lectura; runtime smoke-executed (DET-36) con evidencia DOM: 5 nombres objetivo en CD ('Planes de estudios' gano sobre override), Engagement intacto. vitest 158/158, paridad i18n 3/3. Listo para request-close.
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-08-24 12:15 — Paridad en/pt de los encabezados de las 5 vistas (ampliacion DEC-LOCAL-04) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + smoke)

**Objetivo**: Dar paridad en/pt al ENCABEZADO/titulo de las 5 vistas del menu (label del layout, sistema distinto del labelKey). Hoy solo estan en es y caen al fallback espanol en ingles. Textos = los del menu (labelKey) por coherencia.

**Tasks completadas**:
- [x] S3.T1 — Crear/extender lang/en/ y lang/pt/ de los layouts de lista faltantes (AcademicProgram en+pt, Curriculum en+pt, Activity en, Offering en+pt agregar layout.label) con layout.default_<X>_list.label traducido; core_DataLog ya OK; pt/Activity ya OK
- [x] S3.T2 — Publicar i18n + verificar JSON validos; test del mod sin regresion
- [x] S3.T3 — Smoke runtime en INGLES: encabezado + view-picker de las 5 vistas traducidos (evidencia DOM)
- [x] S3.GATE — Gate T2: encabezados traducidos en en/pt, sin regresion; decidir continue

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S3 approved (super autopilot, ampliacion DEC-LOCAL-04). Reviewer aislado: paridad i18n 3/3 completa en AcademicProgram(16)/Activity(43)/Curriculum(37)/Offering(26); core_DataLog ya OK. Fixes del iterate: Offering completado (tabs+activityId+lifecycleStatus), en Activity header plural consistente, pt Bachelor->Bacharelado. publish-i18n gate paridad PASS, test mod 158/158. Restantes informativos no bloqueantes (header/menu singular-plural preexistente fuera de REQ-IMPROVE-03; object.core_DataLog es legacy). Encabezados + columnas ahora traducen en en/pt (fixea 'Grado'->'Degree'/'Grau', etc.).
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Session | Status |
|-----|-----------|------|---------|--------|
| REQ-IMPROVE-01 (orden de vistas) | TC1, TC2 | integration + runtime | 1 | ✅ done |
| REQ-IMPROVE-03 (encabezado Curriculum) | TC3 | runtime | 1 | ✅ done |
| REQ-IMPROVE-02 (renombre 5 vistas via labelKey) | TC4 | runtime | 2 | ✅ done |
| REQ-PRESERVE-01 (Engagement intacto) | TC5 | runtime | 2 | ✅ done |
| REQ-PRESERVE-02 (test del array verde) | TC1, TC6 | integration | 1 (mixta) + 2 (objeto) | ✅ done |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC1 | El array queda en orden PO (forma mixta, S1) y el test lo fija | REQ-IMPROVE-01, REQ-PRESERVE-02 | integration | Mod curriculum-design | Editar `defaultObjects` (mixta) + correr `layouts-declared.test.ts` | Orden PO, Activity/Offering objeto+labelKey preservados; test verde | idem (vitest 158/158) | vitest S1 | ✅ |
| TC2 | Render del menu CD en UPU en orden PO (S1) | REQ-IMPROVE-01 | runtime | Tenant UPU | Abrir menu CD | 5 entradas en orden PO | orden PO confirmado (Programas académicos, Planes de Estudio, Programa de asignatura, Sílabos, Historial de cambios) | smoke S1.T5 | ✅ |
| TC3 | Encabezado de Planes de estudios alineado (S1) | REQ-IMPROVE-03 | runtime | — | Abrir la vista Curriculum | Encabezado/label = "Planes de estudios", no "Currículos" | label del layout paso de "Currículos" a "Planes de estudios" | smoke S1.T5 | ✅ |
| TC4 | Menu CD con los 5 nombres objetivo via labelKey (S2) | REQ-IMPROVE-02 | runtime | Tenant UPU, 1645 mergeado | Abrir menu CD | 5 nombres objetivo; labelKey gana sobre override | Programas académicos, **Planes de estudios** (labelKey gano sobre override "Planes de Estudio"), Programa de asignatura, Sílabos, Historial de cambios | smoke S2.T5 | ✅ |
| TC5 | Menu de Engagement sin cambios (regresion critica, S2) | REQ-PRESERVE-01 | runtime | Tenant UPU, S2 aplicada | Abrir menu Engagement | Activity="Actividad", Offering="Ofertas" intactos | intactos (Actividad, Ofertas) | smoke S2.T6 | ✅ |
| TC6 | El array en forma objeto con labelKey y el test lo fija (S2) | REQ-PRESERVE-02 | integration | 1645 mergeado | Editar `defaultObjects` (forma objeto) + correr test | 5 entradas forma objeto (orden PO); test verde | idem (vitest 158/158) | vitest S2 | ✅ |
| TC7 | Paridad en/pt de encabezados + columnas de las vistas (S3, DEC-LOCAL-04) | REQ-IMPROVE-02/03 (ampliado) | unit + parity gate | i18n del mod | Completar lang/{en,pt}/<Objeto>.i18n.json + publish-i18n | paridad 3/3; encabezado/columnas traducen en en/pt (no fallback a es) | AcademicProgram 16/16/16, Activity 43/43/43, Curriculum 37/37/37, Offering 26/26/26; publish-i18n gate PASS | parity check + publish-i18n S3 | ✅ |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| tests/integration/layouts-declared.test.ts (assert defaultObjects) | integration | S1.T3 / S2.T3 | REQ-IMPROVE-01, REQ-PRESERVE-02 | vitest |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| curriculum-design integration (S1) | `npx vitest run tests/integration/layouts-declared.test.ts` | 158/158 (array develop) | 158/158 (array mixto reordenado) | = sin regresion |
| curriculum-design integration (S2) | idem | 158/158 (mixto) | 158/158 (forma objeto 5 labelKey) | = sin regresion |

## Summary

**CERRADO 2026-08-25.** Reorden del menu de Curriculum Design al orden PO + nombrar las 5 vistas via labelKey por app (nav.curriculumDesign.*, consume UPONE-1645) + paridad i18n es/en/pt. 3 commits (S1/S2/S3). dkc-dredd Modo B: aprobable-con-observaciones; S2 (encabezados desalineados del menu) y S3 (ids internos DKC en repo) corregidos: tildes/mayuscula en encabezados, Activity a plural en los 3 locales (Opcion A del dev), doc sin ids internos, commit reescrito. DoD verificado runtime UPU (es/en/pt): orden PO, 5 encabezados = menu, Engagement aislado (Actividad/Ofertas). suite 1581/1581. PR #52 (UPONE-1616->develop) MERGEADO; rama movida a develop y borrada. teach-close done, 0 raw learns.

**design-improvement (2026-08-18):** spec producido → `specs/curriculum-design/SPEC-curriculum-design-improve-menu-order.md`.
Alcance confirmado a tasks (mod-only, sin riesgo): reorden de `defaultObjects` al orden PO (H3), alineacion del
encabezado de Curriculum "Currículos" → "Planes de estudios" (H5), actualizacion del test del array, y verificacion
runtime de las dos apps en UPU (regresion critica de Engagement). El **renombre de las entradas del menu** NO pasa a
tasks: en UPU el override por tenant gobierna los nombres y ensombrece al mod (H7), asi que declarar en el mod no toma
efecto — queda como **OQ-01 (decision de PO/negocio)** con opciones A/B/C en el spec. **Activity/Offering** siguen
bloqueados por **UPONE-1645** (OQ-03). 4 REQs (2 IMPROVE + 2 PRESERVE), 8 tasks + 2 gates en 2 sessions. Pendiente
central: spec-judge (DET-38) + spec-approval del dev antes de execute.

**design-replan (2026-08-18):** spec re-escrito con el encuadre correcto. El spec-judge previo dio `escalate`
sobre una premisa equivocada (H7 → OQ-01, renombre del menu como decision de PO). Verificado contra el contrato de
UPONE-1645 (TICKET-132), el nombre del menu de las **cinco** vistas se resuelve MOD-ONLY via `labelKey` (clave i18n
propia del mod `nav.curriculumDesign.*`, no `object.*`): el override por tenant no la ensombrece y gana antes de
`object.<Objeto>` (1645 REQ-03), con aislamiento per-app (REQ-04) que deja a Engagement intacto. **OQ-01 y OQ-02
disueltas** (renombre mod-only, portabilidad inherente); **Activity/Offering ahora en alcance** con el mismo
mecanismo. Se agrega **dependencia dura de secuenciacion** sobre UPONE-1645 (el mecanismo debe existir para
consumirlo; el diseno de 136 esta completo). Spec resultante: 5 REQs (3 IMPROVE + 2 PRESERVE), 8 tasks + 2 gates en
2 sessions, todas mod-only. 2 OQ residuales (rol runtime via UPONE-1615, lectura de "pestana"). El escalate de
spec-judge queda disuelto. Pendiente: re-spec-judge (DET-38) + spec-approval del dev antes de execute.

**design-fix-iterate (2026-08-18):** el re-juicio dual DET-38 dio `iterate` (ambos jueces) con hallazgos de
ALINEACION contra el request inmutable. El dev tomo la decision de alcance; se aplico + reconcilio en el spec
(DET-3: el `## Request` no se reescribe). Cambios: (1) **Desacople** en dos sessions con acoplamiento distinto a
UPONE-1645 — **S1** (reorden en forma string + encabezado + test) usa capacidades existentes y NO depende de 1645
(entrega valor aunque 1645 se demore); **S2** (renombre de las 5 vistas via labelKey + verificacion runtime + doc)
es lo unico con dependencia dura de 1645. (2) **Ampliacion de alcance sancionada por el dev** registrada como
DEC-LOCAL-02: el request dejaba Activity/Offering fuera por bloqueo; se incorporan las 5 vistas ahora que 1645
provee la capacidad. (3) **Item del request superado**: "documentar por que Activity/Offering conservan su nombre"
ya no aplica (se las renombra); el deliverable se reorienta a documentar el patron labelKey + condicion de
secuenciacion (S2.T7), marcado explicito en Executive summary / Open questions / DEC-LOCAL-02. Spec resultante:
5 REQs (3 IMPROVE + 2 PRESERVE), 12 tasks + 2 gates en 2 sessions (S1: 5 tasks + gate; S2: 7 tasks + gate). REQ-PRESERVE
(Engagement intacto, test verde) y rollback por task preservados; acceptance con verificacion runtime real (DET-36)
en ambas sessions. Validaciones DKC (SpecTask/SpecFull/Ticket) en verde. Pendiente: re-spec-judge (DET-38) +
spec-approval del dev antes de execute.
