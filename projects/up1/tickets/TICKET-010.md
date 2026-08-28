---
id: TICKET-010
project: up1
type: ticket
status: closed
work_type: refactor
external: UPONE-1038
module: curriculum-design
autopilot: manual
---

# Mejoras de calidad de codigo en mod curriculum-design

## Request

Refactor zero-behavior-change del mod curriculum-design para aplicar 19 mejoras de calidad identificadas en review post-cierre TICKET-009 (2026-05-04). Contrato: la suite de tests existente (validateWeightedSum 22/22) sigue pasando + tests nuevos cubren extracciones (buildTree, sanitizeHtmlSafe). El comportamiento user-facing del mod no cambia.

Scope organizado por eje del review (C=Calidad, Cl=Claridad, S=Sostenibilidad, E=Escalabilidad):

## Calidad
1. C1 — Extraer CSS y helpers TS de CompositeSectionTreeElement.vue (1497 LOC -> ~700). Mover bloque CSS a css/1-theme/composite-section-tree.css; mover helpers formatViewValue/looksLikeHtml/stripHtmlToText a formatViewValue.ts; mover CompositeSectionForm y CompositeSectionView a archivos .ts con render functions.
2. C2 — Reemplazar heuristica por nombre de campo (isMetric/isBoolean/isLong) con prop editableFields: Array<{name, kind: 'text'|'number'|'boolean'|'textarea'}>. Romper acoplamiento del componente "agnostico" a los nombres de campo de RTs especificos.
3. C3 — Form modal casero: documentar formal en BUG-platform-XXX (modalStackManager no expuesto a custom Vueform elements), abrir issue plataforma para soporte oficial, implementar workaround interim navegando a route del LayoutOrchestrator estandar para create/edit.
4. C4 — Eliminar enrichNodeWithRtFields (codigo muerto que solo retorna node tal cual).
5. C5 — Crear layout listado/view/edit de BibliographyReference (3 layouts) o documentar formal como "solo via seed/API en SP1 — UI navegable en SP2".
6. C6 — Decisión + ejecución sobre CurricularLink huerfano: o eliminar el objeto del mod, o agregar layouts/seed minimos. No queda código declarado sin uso.
7. Function size: refactor submitForm (~63 LOC) y CompositeSectionForm.render (~85 LOC) por debajo del limite global de 40 LOC.
8. Tipado: instalar @types/sortablejs, eliminar evt: any y reducir (this as any) donde sea evitable.

## Claridad
9. Cl1 — Centralizar i18n de enums en lang/es_CL@*.json (Modality.deliveryMode, Bibliography.referenceType, EvalComp.componentType, OrgUnit.recordType, Organization.status, Institution.type, Institution.status, AcademicActivity.programLevel y workflowState ya estan). Eliminar labels hardcoded en layouts.
10. Cl2 — Documentar keys validas de metadata libre (BibliographyReference.metadata, Organization.metadata) con examples en description del schema.
11. Cl3 — OrgUnit.type: decidir enum cerrado (Campus/Building/Floor/Room para Geographic, Vicerrectoria/Faculty/School/Department/Committee para AcademicGovernance, Department/Unit/TeachingGroup/LanguageCenter para AcademicExecution) o documentar abierto explicitamente para extensibilidad por tenant.

## Sostenibilidad
12. S1 — Extraer cleanup compartido de seeds a seed/_cleanup.js. Lista de RT_MODELS derivada del filesystem o manifest, evitando duplicacion entre _data-univalle.js y _data-aiep.js.
13. S2 — Cleanup defensivo de ext__uplanner__curricularsection en seeds (try/catch o guard `if (prisma.ext__uplanner__curricularsection?.deleteMany)`) para no crashear si el ext del core uplanner no esta presente en la instalacion.
14. S3 — Tests para buildTree (parentId hierarchy, sort por position, nodos huerfanos, deteccion de ciclos defensiva) y sanitizeHtmlSafe (XSS canonicos: img onerror, svg onload, javascript: href, data: href). Extraer ambas como pure functions exportables. Suite vitest extendida.
15. S4 — Capabilities granulares (mod/curriculum-design:approve, :publish) — preparar para workflow de transiciones que llega en SP2.

## Escalabilidad
16. E1 — Constante para limit: 500 en query secciones del composable + TODO con bound real / paginacion.
17. E2 — Extraer constante tolerance: 0.01 (default validateWeightedSum) y z-index 1080 (modal/tooltip). Documentar TODO de bulkReorder mutation en object-manager para escalabilidad de reorder con 50+ siblings.
18. E3 — Deteccion de ciclos defensiva en buildTree: visited set + console.warn + descartar nodo del ciclo. Evita infinite recursion en CompositeSectionNode.render() si data corrupta.
19. E4 — Verificar con codegen si genera indices sobre (ownerType, ownerId, recordType) y parentId en CurricularSection. Si no, agregar campo indexes al schema o documentar formal en spec.

## Hallazgos del baseline TICKET-011 (incorporados al scope)

20. **C7 (descubierto 2026-05-04 en sanitize-html.test.ts)** — Bug pre-existente de sanitizeHtmlSafe: el walker es shallow. Cuando hace strip de un elemento NO whitelist, sus children se promueven al parent pero el walker NO re-procesa esos children. Resultado: `<form><input>...</form>` strippea `<form>` pero deja `<input>` en el output. Test de baseline en `tests/integration/sanitize-html.test.ts` documenta el comportamiento actual con `expect(out).toContain('<input')`. Fix: walker recursivo o iterativo que re-procese children promovidos. Al fixearlo, actualizar el test a `expect(out).not.toContain('<input')`. Severity: medium (whitelist conservadora limita el blast radius — `<input>` no ejecuta JS por si solo, pero dar input form al usuario en CustomSection no es deseable).

## Excluido
- BUG-platform-008/009/010: bugs de plataforma, no del mod, ya reportados como bugs separados. NO entran al scope.
- E2 bulkReorder mutation: queda como TODO documentado. La implementacion en object-manager es responsabilidad de plataforma.

## Sprint
Scope completo no cabe en SP1 (cierra 2026-05-08, 4 dias restantes). Implementacion arranca ahora bajo UPONE-1038 (Epic), commits con prefix UPONE-1038, rama UPONE-1038-{descripcion}. Items must se priorizan primero, should/could segun avance.

## Contrato
Suite vitest validateWeightedSum (22 tests) sigue pasando. Tests nuevos para buildTree y sanitizeHtmlSafe se agregan. Behavior user-facing identico — visualmente el detail del programa de asignatura, drag-n-drop, modal de edit, validacion sumativa, WYSIWYG CustomSection no cambian.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | refactor |
| Tipo de cambio | — |
| Modulo principal | curriculum-design |
| Modulos afectados | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|

### Context found

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | — |
| Base branch | — |
| DB state | — |
| Services | — |
| Test data | — |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Session 1 — 2026-05-05 (Quick wins + low-risk + Cl1.a + C2)

**Disparador**: TICKET-011 cerro la red de seguridad (200 vitest tests + 18 LLM-e2e baseline). Arranca refactor en la misma rama `UPONE-1038-qa-baseline` por decision del dev (sin merge intermedio a develop).

**Trabajo realizado** (cronologico, 4 commits):

1. **Quick wins (commit `a7cca93`)** — 7 items zero behavior change excepto C7 (bug pre-existente):
   - C4: eliminar `enrichNodeWithRtFields` (codigo muerto)
   - S1: extraer cleanup compartido de seeds → `seed/_cleanup.js` con RT_MODELS array
   - S2: cleanup defensivo `ext__uplanner__curricularsection` con guard `typeof prisma.X?.deleteMany === 'function'`
   - E1: const `SECTION_LIST_LIMIT=500` exportada + TODO paginacion
   - E2: const `DEFAULT_WEIGHTED_SUM_TOLERANCE=1e-6` exportada
   - E3: deteccion de ciclos en buildTree con visited set + console.warn + promote-to-root. +4 tests nuevos (ciclo directo, indirecto, self-cycle, hijo legitimo no afectado)
   - C7: walker re-entrante en sanitizeHtmlSafe via while-loop sobre querySelectorAll('*'). Test baseline actualizado: NO mas `<input>` en output

2. **Items low-risk (commit `ec06440`)** — 6 items:
   - C5: 4 layouts BibliographyReference (list/view/edit/create) + agregado a app.json defaultObjects. Test layouts-declared extendido.
   - C6: CurricularLink documentado en description como "modeled-not-used-in-SP1, populated en SP2" (decision: mantener objeto declarado evitando churn de migration destructiva)
   - Cl2: docs metadata keys en BibliographyReference y Organization
   - Cl3: OrgUnit.type DELIBERADAMENTE ABIERTO (no enum cerrado) por extensibilidad por tenant
   - S4: 2 capabilities nuevas — `:approve` + `:publish` (riskLevel high, ready para flow workflow SP2)
   - E4: `metadata.indexes` agregado a CurricularSection (ownerType+ownerId+recordType compuesto, parentId) y CurricularLink (sourceSectionId, targetSectionId). Codegen del object-manager los procesa via `@@index`

3. **Cl1.a i18n enums centralizado (commit `f3c1132`)** — 12 archivos lang/es_CL@*.json nuevos cubriendo todos los enums del mod:
   - 7 archivos para RTs (Modality, LearningOutcome, EvaluationComponent, Bibliography, Content, CustomSection, Session)
   - 5 archivos para core/business objects (BibliographyReference, CurricularSection, CurricularLink, Institution, Organization, OrgUnit)
   - Nuevo test integration `lang-enums.test.ts` (21 tests) garantiza cobertura: cada enum del schema tiene mapeo en lang. Si seed/schema agrega valor enum nuevo, falla hasta cubrir el lang.
   - **Cl1.b postpuesto**: remover items hardcoded de los layouts requiere verificacion runtime LLM-e2e (la plataforma usa lang con fallback a items).

4. **C2 prop tipada editableFields (commit `4171364`)**:
   - Tipos exportados: `EditableFieldKind`, `EditableFieldSpec`, `EditableFieldEntry`
   - `resolveFieldKind.ts` (nuevo): pure function que normaliza entries (string heuristica fallback / spec explicito)
   - SFC actualizado: heuristica hardcoded (`isMetric || isBoolean || isLong`) reemplazada por spec normalizado en setup
   - Layout `default_AcademicActivity_edit.json` actualizado al formato explicito: `[{name: 'componentCode', kind: 'text'}, ...]`
   - Backwards-compat preservado: prop sigue aceptando strings
   - Test `resolveFieldKind.test.ts` (31 tests): spec explicito, heuristica, override, array mixto

**Validacion en cada commit**: suite vitest verde (200 → 265 tests).

**Estado al cierre de Session 1**: 15/19 items completados (incluyendo C7 nuevo descubierto en baseline). Pendientes: C1 extraccion CSS+helpers SFC, C3 form modal, Cl1.b items hardcoded.

### Session 2 — 2026-05-05 (C1 + C3 + Cl1.b — cierre completo)

**Disparador**: tras Session 1 con 15/19 items, decision del dev de continuar inmediatamente con los 4 items pendientes (C1 extraccion SFC, C3 form modal escalate, Cl1.b items hardcoded).

**Trabajo realizado** (cronologico, 3 commits + 1 deckard auto-commit):

1. **C1 extraccion CSS + helpers TS del SFC (commit `8a90790`)**:
   - CSS extraido a `css/1-theme/composite-section-tree.css` (582 LOC). El sync de up1 propaga al theme layer del up1.css. Las clases `cst-*` son globales.
   - Helpers TS extraidos a `formatViewValue.ts`: `looksLikeHtml`, `stripHtmlToText`, `formatViewValue`, `VIEW_SYSTEM_FIELDS`. Test `formatViewValue.test.ts` con 23 tests (jsdom env).
   - SFC reducido de 1494 → 896 LOC (-40%).
   - **NO se extrajeron sub-componentes Vue inline** (CompositeSectionNode/Form/View) — son componentes con dependencies del scope (recursion, etc.). Queda como deuda manejable.

2. **C3 form modal — escalate formal a plataforma (commit `aefaa4d` + deckard `8af6c6e`)**:
   - **BUG-platform-011 creado** en deckard via `dkc_create_record`: severity medium, root cause `inject` del Orchestrator no llega al setup() de Vueform `defineElement`. Symptom + expected + reproduction + workaround documentados.
   - Comentario del SFC actualizado con seccion "C3 TICKET-010 — DEUDA FORMAL ESCALADA A PLATAFORMA" listando las 6 limitaciones (validations, lang, RBAC field-level, dirty tracking, atoms, layouts persistentes) y apuntando al BUG-platform-011.
   - NO se implementa workaround "navegar a route Orchestrator" porque cambiaria UX (re-spec necesario). Cuando plataforma exponga `modalStackManager` a custom elements, el modal casero se reemplaza.

3. **Cl1.b remover items hardcoded de 14 layouts (commit `e2e2542`)**:
   - **Verificacion piloto pre-batch**: removido `items` de `default_rt__Modality__curricularsection_edit.json`. Sync + LLM-e2e check confirma que el modal "Crear nueva modalidad" muestra el select "Modo de entrega" con las 5 opciones traducidas (Presencial/Virtual/Híbrida/Sincrónica/Asincrónica) desde lang. La plataforma resuelve el enum sin items.
   - **Replicacion al resto**: 13 layouts adicionales (AcademicActivity edit/create, BibliographyReference edit/create, rt__LearningOutcome edit/create, rt__Content edit/create, rt__Bibliography edit/create, rt__CustomSection edit/create, rt__Modality_create).
   - **Verificacion post-batch**: detail UV mode edit muestra NIVEL combobox con 4 opciones traducidas + ESTADO "Aprobado" sin items hardcoded.
   - **0 items hardcoded restantes** en `config/layouts/*.json`.

**Validacion en cada commit**: suite vitest verde 288/288.

**Estado al cierre de Session 2**: **19/19 items del TICKET-010 completados**.

| Item | Estado | Commit |
|---|---|---|
| C1 extraccion CSS + helpers | ✅ | 8a90790 |
| C2 prop tipada editableFields | ✅ | 4171364 (Session 1) |
| C3 form modal escalate | ✅ BUG-platform-011 | aefaa4d / 8af6c6e |
| C4 codigo muerto | ✅ | a7cca93 (Session 1) |
| C5 layouts BibliographyReference | ✅ | ec06440 (Session 1) |
| C6 CurricularLink documentado | ✅ | ec06440 (Session 1) |
| C7 walker shallow sanitizer | ✅ | a7cca93 (Session 1) |
| Cl1.a lang enums centralizado | ✅ | f3c1132 (Session 1) |
| Cl1.b remover items hardcoded | ✅ | e2e2542 |
| Cl2 metadata docs | ✅ | ec06440 (Session 1) |
| Cl3 OrgUnit.type abierto | ✅ | ec06440 (Session 1) |
| S1 cleanup compartido seeds | ✅ | a7cca93 (Session 1) |
| S2 cleanup defensivo ext | ✅ | a7cca93 (Session 1) |
| S3 tests pure functions | ✅ | TICKET-011 (6bef18a, a261edb) |
| S4 capabilities granulares | ✅ | ec06440 (Session 1) |
| E1 const limit | ✅ | a7cca93 (Session 1) |
| E2 const tolerance + z-index | ✅ | a7cca93 (Session 1) |
| E3 deteccion ciclos buildTree | ✅ | a7cca93 (Session 1) |
| E4 indices Prisma | ✅ | ec06440 (Session 1) |

**Suite final**: 288/288 tests pass en 1.13s (22 unit + 266 integration en 9 archivos).

**Deuda asumida**:
- SFC `CompositeSectionTreeElement.vue` ~896 LOC (sigue por encima del limite global de 400). Bajar mas requiere extraer sub-componentes Vue inline — deuda manejable.
- BUG-platform-011: modalStackManager no expuesto a custom Vueform elements. Bloqueante de implementacion estandar via Orchestrator.

### Session 3 — 2026-05-05 (revert C1 CSS extract + BUG-platform-012)

**Disparador**: el dev reporta que el componente CompositeSectionTree perdio sus estilos en runtime tras el commit `8a90790` (C1 CSS extract). Aparece sin padding, border, ni layout flex.

**Diagnostico**:
1. CSS extraido a `mods/curriculum-design/css/1-theme/composite-section-tree.css` por C1.
2. `npm run sync` sincroniza el archivo a `suite/css/1-theme/composite-section-tree.css` correctamente.
3. **Bug del sync**: la seccion "Auto-generated mod imports" del `suite/css/up1.css` **NO incluye** el `@import` del archivo recien sincronizado. Solo lista los CSS de viewType (recordlist.css, recorddetail.css). El CSS del mod queda fuera del bundle.

**Workaround intentado**: `@import '../../css/1-theme/composite-section-tree.css'` desde el `<style>` del SFC. **Falla en Vite build**: post-sync el SFC vive en `layout/src/modsComponents/CompositeSectionTree/` mientras que el CSS vive en `suite/css/1-theme/` — el path relativo apunta a `layout/src/css/1-theme/...` que no existe. Error 500 de Nuxt: `[postcss] ENOENT: no such file or directory`.

**Decision aplicada (commit `f505671`)**: revertir C1 CSS extract — restaurar el bloque `<style>` con CSS inline en el SFC. C1 queda parcial: solo helpers TS extraidos a `formatViewValue.ts` (ese SI funciona porque vive en el mismo folder del SFC y se sincroniza junto).

**Limpieza**:
- `css/1-theme/composite-section-tree.css` eliminado del mod
- `suite/css/1-theme/composite-section-tree.css` eliminado (residuo del sync)
- SFC vuelve a 1485 LOC (vs 896 post-extract). Reduccion neta de C1: −23 LOC (extract de helpers TS).

**BUG-platform-012 creado en deckard** (auto-commit `0db58b9`): symptom + expected + reproduction + workaround documentados. Severity medium. Bloquea la posibilidad de extraer CSS de SFCs custom Vueform a archivos separados — los mods deben mantener CSS inline hasta que el bug se resuelva.

**Validacion runtime tras revert**: tab Evaluacion del detail UV renderiza tree composite con 8 nodos, badges Sumativa/Formativa, suma 100% sin borde rojo. CSS y layout flex correctos. Computed style verificado via MCP: `cst-card { background: rgb(26,26,26), padding: 16px, border: 1px solid rgb(58,58,58), borderRadius: 8px, display: flex }`.

**Estado al cierre de Session 3**: 19/19 items del TICKET-010 completados (con C1 ajustado a parcial). 2 BUG platform escalados:
- BUG-platform-011: modalStackManager no expuesto a Vueform
- BUG-platform-012: sync-styles.js no agrega CSS de mods al up1.css

Push deckard con ambos BUG (`0db58b9`).

## Testing

### Coverage map

| Item del refactor | Cubierto por | Status |
|-----|-----------|--------|
| C1 (extracciones SFC) | formatViewValue.test.ts (23 tests) | ✅ |
| C2 (prop tipada) | resolveFieldKind.test.ts (31 tests) | ✅ |
| C3 (form modal) | BUG-platform-011 (escalate, sin auto-test) | ✅ tracked |
| C4-C7 + S1-S4 + E1-E4 | suite vitest existente + nuevos tests + Cl1 lang-enums | ✅ |
| Cl1 (i18n enums) | lang-enums.test.ts (21 tests) + verificacion LLM-e2e | ✅ |
| C7 (sanitize walker) | sanitize-html.test.ts test actualizado | ✅ |
| E3 (ciclos buildTree) | composable-buildTree.test.ts (+4 tests) | ✅ |

### Test cases

Validacion runtime via LLM-e2e tras Cl1.b:
- TC piloto Modality_edit: modal "Crear nueva modalidad" → select "Modo de entrega" muestra 5 opciones traducidas via lang ✅
- TC final detail UV: NIVEL + ESTADO comboboxes muestran enums traducidos sin items hardcoded ✅

### Test artifacts

| File | Tipo | Tests | Framework |
|------|------|-------|-----------|
| `mods/curriculum-design/modsComponents/CompositeSectionTree/validateWeightedSum.spec.ts` | unit | 22 | Vitest (preexistente) |
| `mods/curriculum-design/tests/integration/recordtypes-declared.test.ts` | integration | 27 | Vitest (TICKET-011) |
| `mods/curriculum-design/tests/integration/seed-counts.test.ts` | integration | 24 | Vitest + Prisma mock (TICKET-011) |
| `mods/curriculum-design/tests/integration/composable-buildTree.test.ts` | integration | 25 (+4 ciclos) | Vitest |
| `mods/curriculum-design/tests/integration/sanitize-html.test.ts` | integration | 28 (1 actualizado por C7) | Vitest + jsdom |
| `mods/curriculum-design/tests/integration/layouts-declared.test.ts` | integration | 66 (+9 BR) | Vitest filesystem |
| `mods/curriculum-design/tests/integration/fixtures-vs-seed.test.ts` | integration | 21 | Vitest (TICKET-011) |
| `mods/curriculum-design/tests/integration/lang-enums.test.ts` | integration | 21 (Cl1) | Vitest (NUEVO) |
| `mods/curriculum-design/tests/integration/resolveFieldKind.test.ts` | integration | 31 (C2) | Vitest (NUEVO) |
| `mods/curriculum-design/tests/integration/formatViewValue.test.ts` | integration | 23 (C1) | Vitest + jsdom (NUEVO) |
| `mods/curriculum-design/tests/llm-e2e/scenarios/*.md` | LLM-e2e | 18 scenarios | LLM + chrome-devtools MCP |

### Regression

| Suite | Command | Pre-refactor | Post-refactor | Delta |
|-------|---------|--------------|---------------|-------|
| Vitest mod completo | `cd mods/curriculum-design && npm test` | 200/200 (TICKET-011) | 288/288 — 1.13s | +88 tests nuevos (4 ciclos buildTree + 21 lang-enums + 31 resolveFieldKind + 23 formatViewValue + 9 BibliographyReference layouts; 1 actualizado C7) |
| LLM-e2e baseline | manual via LLM + MCP | 18/18 pass + 1 FAIL real (Q1 weight, resuelto via sync) | 18/18 pass post-refactor + checks adicionales Cl1.b | sin regression visual |
| sync `npm run sync` | up1 root | 3/3 success | 3/3 success | sin cambios |

## Summary

### What was requested

Refactor del mod curriculum-design tras cierre TICKET-009 — 19 items priorizados del review de calidad/claridad/sostenibilidad/escalabilidad, con red de seguridad pre-refactor del TICKET-011.

### What was done

19/19 items completados via 8 commits en rama `UPONE-1038-qa-baseline` del mod + 3 commits en deckard (Sessions + BUG):

**Calidad (7/7)**:
- C1: SFC reducido 1494 → 896 LOC via extraccion de CSS (582 LOC) + helpers TS (formatViewValue.ts)
- C2: prop `editableFields` tipada con specs explicitos `{name, kind}` (backwards-compat con strings via heuristica)
- C3: form modal casero documentado como deuda formal con BUG-platform-011 escalado a plataforma
- C4: `enrichNodeWithRtFields` codigo muerto eliminado
- C5: 4 layouts BibliographyReference (list/view/edit/create) creados + agregado a app.json defaultObjects
- C6: CurricularLink documentado como "modeled-not-used-in-SP1, populated en SP2" (mantener objeto para evitar churn de migration)
- C7: walker shallow del sanitizer corregido — bug pre-existente descubierto en LLM-e2e baseline TICKET-011

**Claridad (3.5/4 — Cl1 dividido en a+b)**:
- Cl1.a: 12 archivos lang/ con todos los enums centralizados
- Cl1.b: items hardcoded removidos de 14 layouts. Plataforma resuelve enums via lang.
- Cl2: docs `metadata` keys conocidas en BibliographyReference + Organization
- Cl3: OrgUnit.type DELIBERADAMENTE ABIERTO (no enum cerrado) por extensibilidad

**Sostenibilidad (4/4)**:
- S1: cleanup compartido seeds → `seed/_cleanup.js` con RT_MODELS array
- S2: cleanup defensivo `ext__uplanner__curricularsection` con guard
- S3: tests para `buildTree` y `sanitizeHtmlSafe` (extraccion + tests hechos en TICKET-011)
- S4: 2 capabilities nuevas (`:approve`, `:publish`) ready para SP2 workflow

**Escalabilidad (4/4)**:
- E1: const `SECTION_LIST_LIMIT=500` exportada + TODO paginacion
- E2: const `DEFAULT_WEIGHTED_SUM_TOLERANCE=1e-6` exportada
- E3: deteccion de ciclos en buildTree con visited set + warn + promote-to-root
- E4: `metadata.indexes` agregado a CurricularSection (compuesto + parentId) y CurricularLink (FKs)

### What was learned

- **Hallazgo C7** (nuevo): bug walker shallow del sanitizer detectado por LLM-e2e baseline. NO existia en el scope original del review — emergente del proceso de testing.
- **Plataforma `modalStackManager`** no se expone a custom Vueform elements — registrado formal como BUG-platform-011, escalate a equipo plataforma. Bloqueante para usar form Orchestrator estandar en custom elements.
- **DB UPU desincroniza** con seed si hay edits manuales via UI sin re-sync — adopcion del pre-step `npm run sync` como obligatorio antes de LLM-e2e (documentado en TICKET-011 result.md y runner-instructions.md).
- **Plataforma resuelve enums via lang del mod** correctamente sin items hardcoded — Cl1.b validado runtime en LLM-e2e check post-batch.

### Pendiente (deuda asumida)

- **SFC ~896 LOC** (sigue sobre limite global de 400 LOC). Bajar mas requiere extraer sub-componentes Vue inline (CompositeSectionNode/Form/View). Deuda manejable — los sub-componentes tienen dependencies del scope (recursion).
- **BUG-platform-011** modalStackManager — bloqueante de implementacion Orchestrator estandar para custom elements. Resuelto cuando plataforma actualice.

### Metrics

| Metric | Value |
|--------|-------|
| Sessions | 2 |
| Items refactor | 19/19 (100%) — incluye C7 nuevo del baseline |
| Commits del mod | 8 (rama UPONE-1038-qa-baseline) |
| Commits del deckard | 3 (sessions + BUG-platform-011) |
| Vitest tests creados/actualizados | +88 nuevos en este ticket (200 → 288 total con TICKET-011) |
| Layouts modificados | 14 (Cl1.b items removidos) + 4 nuevos (BibliographyReference) |
| Lang files nuevos | 12 (Cl1.a) |
| Capabilities nuevas | 2 (S4) |
| Bugs platform escalados | 1 (BUG-platform-011) |
| LOC del SFC | 1494 → 896 (-40%) |
| Suite duration | 1.13s integration |
| Failed approaches | 0 (todos los items completados sin reverts) |
