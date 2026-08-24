---
id: SPEC-006-hu4-followup-rename-cleanup-badge-status
project: up1
module: curriculum-design
status: in_progress
ticket: TICKET-025
meta_specs: []
created: '2026-05-18'
updated: '2026-05-18'
tags:
  - hu4
  - followup
  - rename-cleanup
  - status-badge
  - vueform-element
  - a11y
depends_on:
  - SPEC-004-rename-activity-workflow
---

# HU4 followup — completar rename activity (Path B) + visualizacion read-only del estado en UI

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Tasks, Fix scope). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: cerrar dos cabos sueltos de [TICKET-019](../../tickets/ticket-019.md) (HU4). Primero, terminar el rename `academicActivity → activity` que en codigo quedo perfecto pero en infraestructura dejo 4 layouts en BD UPU con name legacy + verificaciones empiricas pendientes de capabilities. Segundo, dar visibilidad UI al `currentStatusId` introducido en HU4 — hoy las 6 transiciones del smoke S16 son invisibles para el usuario final. Solucion: rename completo (id+name+embeds) en S1 y wrapper Vueform `ActivityStatusBadge` que reusa el atom Badge existente, integrado read-only en los 3 layouts default. Sin boton de transicion — eso queda para HU5.

**Decisiones criticas cerradas durante design**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **DEC-LOCAL-01 (W1) — Path B (rename completo)**: renombrar id + name + actualizar todas las `associatedLayoutConfigs.layoutId` que apuntan a los 4 layouts | Invierte SPEC-004 REQ-RENAME-4 explicito. Path A (cosmetico) dejaba deuda residual permanente; Path B cierra el rename de TICKET-019 de verdad pero amplia S1 ~30% por el grep cross-mod + smoke |
| 2 | **DEC-LOCAL-02 (W5) — empirico**: no mitigar preventivo el riesgo de contraste de `secondary`. S3 corre axe-core; si confirma fail, el gate iterate gatilla S3.T7 con opcion (a) `--up1-gray-700` ya pre-validada visualmente en el draft v2 | El calculo manual sugiere fail (~2.76:1) pero sin evidencia empirica. Pre-mitigar puede generar deuda innecesaria si axe-core hubiera pasado |
| 3 | **DEC-LOCAL-03 — list con texto plano (badge solo en view/edit)**: investigacion empirica pre-execute detecto que RecordList no soporta Vueform elements como cell renderers (TableCell.vue render type-based, no consume Vueform). El badge visual queda solo en RecordDetail (view + edit). En list, columna Estado muestra `status.name` traducido como texto plano | El draft v2 aprobado mostraba badge en list — la implementacion no es ejecutable como esta. Alternativas evaluadas: A (slot override en consumer), B (extender TableCell shared con type=badge, alto blast radius), C (scope reducido). Dev eligio C: scope minimo, cero blast radius en `layout/`, el wrapper Vueform de S2 sigue 100% util para view+edit. Filter por categoria/code (AC4 UPONE-1100) sigue funcionando via UI standard de RecordList. axe-core en S3 cubre solo 2 layouts |

**Riesgos principales y como los mitigamos**:

- **Regresion silenciosa en embeds cross-mod si Path B olvida 1 referencia a `layoutId: "default_AcademicActivity_*"`** → S1.T1 dedicada al grep cross-mod exhaustivo (todos los `.json` con `associatedLayoutConfigs`) ANTES de tocar los JSONs target. Sin esto: viewer reporta "Layout not found" silencioso post-deploy
- **Filas zombie en `up1_layen_layout` BD UPU post-rename** (BUG-platform-002: `npm run sync` NO elimina layouts viejos automaticamente) → S1.T3 ejecuta script SQL idempotente de cleanup explicito con verificacion antes/despues
- **axe-core falla sobre `secondary` (variant gris #9b9b9b + texto blanco ~2.76:1)** → S3.T6 lo detecta empiricamente; si fail, S3.GATE iterate gatilla S3.T7 con override en wrapper a `--up1-gray-700` (#525252, contraste ~7.5:1 PASS)
- **El nuevo Vueform type `activity-status-badge` colisiona con types existentes en `suite/vueform.config.ts`** → S2.T5 corre `grep + dev server arranque sin warnings` ANTES de cerrar S2.GATE. Intake confirmo 0 matches preexistentes (H8 ✓), pero la verificacion empirica final ocurre en sync

**Que NO se hace en este ticket** (limites explicitos del scope):

- **Boton "Cambiar estado" / row action de transition**: delegado a futuro ticket HU5 (UI de transiciones) — el ticket original UPONE-1100 solo excluyo "mutation transitionActivity desde UI", no la lectura del estado
- **Tab "Historial de transiciones" en activity**: solapado con HU2 que entrega changeLog tab Historial generico — no duplicar
- **SET NOT NULL en `workflowId` + `currentStatusId`**: deferred — requiere mas analisis de impacto en imports y creates desde UI
- **Renombre de layouts en tenants distintos a UPU**: si aparecen, queda para un ticket separado de auditoria cross-tenant
- **Pre-mitigar el variant `secondary`**: DEC-LOCAL-02 decidio empirico (esperar axe-core en S3)

**Tamano estimado**: 3 sessions ejecutables (S1, S2, S3), aproximadamente 5.5-6h efectivas distribuidas. **S3 es la mas riesgosa** (T3 exhaustive, gate ⚑ fuerte, contingencia DEC-LOCAL-02 + smoke UPU live).

**Como vas a saber que funciona** (criterios de validacion observables):

- Abro UPU `/activity/aa-uv-1124` y veo el badge `Publicado` en verde arriba del titulo (RecordDetail tab General — view + edit con badge identico)
- Voy a `/activity` y la columna **Estado** muestra el nombre del status traducido como **texto plano** (Publicado, En ejecucion, etc.) — sortable por `status.code`. **Sin badge visual en list** (DEC-LOCAL-03)
- Query `SELECT name FROM up1_layen_layout WHERE name LIKE 'default_AcademicActivity_%'` retorna 0 filas
- Query `SELECT DISTINCT entityType FROM workflowTransitionHistory` no retorna `'academicActivity'`
- Storybook `ActivityStatusBadge` muestra los 5 estados visuales sin warnings (consumido por view + edit)
- axe-core sobre los 2 layouts con badge (view + edit) en UPU: 0 violations WCAG 2.1 AA (o mitigacion W5 aplicada y documentada). List queda fuera del scope a11y (texto plano sin riesgo)

---

## Purpose

Cerrar dos gaps de HU4 que el ticket original UPONE-1100 dejo abiertos:

1. **Gap 1 — rename incompleto en infraestructura**: completar el rename `academicActivity → activity` en BD `up1_layen_layout` de UPU (4 layouts) + verificaciones empiricas de capabilities migradas + FK polimorfica limpia en `workflowTransitionHistory`.
2. **Gap 2 — visibilidad UI del estado**: agregar wrapper Vueform read-only `ActivityStatusBadge` que reusa el atom Badge existente, integrado en `default_activity_list` (columna Estado sortable) y en tab General de `default_activity_view`/`_edit` (badge inline arriba del titulo).

Sin botones de transicion ni edicion del campo `currentStatusId` — solo lectura. La mutation sigue siendo exclusiva de `transitionActivityValidated` (RULE-curriculum-design-004).

## Requirements

### REQ-FIX-01: Rename completo de los 4 layouts JSON (Path B)

> **Que cambia**: los 4 layouts `default_AcademicActivity_{create,view,edit,list}` se renombran a `default_activity_*` en `id` y `name` tanto en los JSON files como en BD UPU. Las `associatedLayoutConfigs.layoutId` que apuntan a estos layouts en otros mods se actualizan en consecuencia.
> **Por que**: TICKET-019 dejo el codigo perfecto pero los layouts en BD UPU + sus referencias siguen con name legacy. Sin cerrar esto, el rename queda a medias y crea inconsistencia (objectName="activity" pero id="default_AcademicActivity_*").

El sistema MUST renombrar los 4 layouts JSON files cambiando `id` y `name` de `default_AcademicActivity_{mode}` a `default_activity_{mode}`, actualizar todas las referencias `associatedLayoutConfigs.layoutId` cross-monorepo que apuntan a estos layouts, y aplicar script SQL idempotente que elimine filas legacy en `up1_layen_layout` BD UPU.

**Actor**: developer
**Layers**: frontend (JSON layouts), database (BD UPU), config (tests/fixtures)

<details><summary>Scenarios de validacion</summary>

#### Scenario: rename aplicado sin filas zombie
- **GIVEN** UPU post-HU4 con 4 layouts BD `default_AcademicActivity_*` y 4 JSON files con id/name legacy
- **WHEN** se ejecuta `npm run sync` + script SQL de cleanup
- **THEN** query `SELECT id, name FROM up1_layen_layout WHERE name LIKE 'default_activity_%'` retorna 4 filas
- **AND** query `SELECT * FROM up1_layen_layout WHERE name LIKE 'default_AcademicActivity_%'` retorna 0 filas

#### Scenario: embeds cross-mod siguen resolviendo
- **GIVEN** otros JSON layouts en mods con `associatedLayoutConfigs.layoutId: "default_AcademicActivity_view"` (descubiertos en S1.T1)
- **WHEN** se actualiza el `layoutId` a `default_activity_view` en cada JSON afectado + se sincroniza
- **THEN** abrir UPU en un flow que embebe `activity view` no reporta "Layout not found"
- **AND** el RecordDetail embebido renderiza correctamente

</details>

#### Acceptance
**El usuario puede verificar que funciona**: query SQL directa retorna 4 layouts con name correcto + 0 con name legacy; smoke en UPU sobre un flow con embed de activity no reporta warnings.

### REQ-FIX-02: Verificacion empirica de capabilities y FK polimorfica post-rename

> **Que cambia**: queries SQL verifican que las assignments de `activity:*` en `core_RoleCapability`/`core_RoleAssignment` se mantuvieron post-HU4 (no quedaron huerfanas con `academicActivity:*`) y que `workflowTransitionHistory.entityType` no tiene referencias residuales a `"academicActivity"`.
> **Por que**: TICKET-019 AC6 pidio "preservar asignaciones" pero no se verifico empiricamente. Sin esta verificacion, usuarios podrian quedar sin capabilities efectivas tras la migracion silenciosa.

El sistema MUST presentar evidencia documental (output de queries SQL ejecutadas) de que: (a) las assignments de capabilities `activity:*` en BD UPU coinciden en count con las que tenian `academicActivity:*` pre-rename, (b) `SELECT DISTINCT entityType FROM workflowTransitionHistory` no retorna `'academicActivity'`. Si encuentra huerfanos: fix targeted en S1.T3.

**Actor**: developer / reviewer
**Layers**: database (verificacion BD UPU)

<details><summary>Scenarios de validacion</summary>

#### Scenario: assignments capabilities preservadas
- **GIVEN** BD UPU post-HU4
- **WHEN** se ejecuta `SELECT COUNT(*) FROM core_RoleCapability WHERE capability LIKE 'activity:%'`
- **THEN** retorna count > 0 consistente con las 5 capabilities definidas en `capabilities.json` (`view`, `create`, `modify`, `delete`, `audit`)
- **AND** `SELECT COUNT(*) FROM core_RoleCapability WHERE capability LIKE 'academicActivity:%'` retorna 0

#### Scenario: FK polimorfica limpia
- **GIVEN** BD UPU post-HU4 con `workflowTransitionHistory` poblada (6+ filas del smoke S16)
- **WHEN** se ejecuta `SELECT DISTINCT entityType FROM workflowTransitionHistory`
- **THEN** retorna solo `'activity'`, `'curriculumPlan'`, `'changeRequest'` (las 3 entidades polimorficas validas)
- **AND** NO incluye `'academicActivity'`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: outputs SQL pegados como Evidence en TC-2 / TC-3 muestran 0 referencias a `academicActivity` y count consistente de capabilities.

### REQ-FIX-03: Wrapper Vueform `ActivityStatusBadge` reusando atom Badge

> **Que cambia**: nuevo Vueform element `ActivityStatusBadgeElement` en `mods/curriculum-design/modsComponents/ActivityStatusBadge/` que recibe un `currentStatusId` (FK), resuelve el status via composable con cache memoria, mapea categoria a variant Badge y renderiza `<Badge pill size="sm" :variant :label />`.
> **Por que**: el atom Badge ya tiene 8 variants, 3 sizes y stories — no hace falta crear nada visual. El trabajo es solo plumbing Vueform + i18n del label.

El sistema MUST exponer un Vueform element type `activity-status-badge` (auto-derivado del SFC `ActivityStatusBadgeElement.vue` con stripping del sufijo `Element`, validado en H8 del intake) que cumpla:

- Recibe `currentStatusId: string` del schema del layout
- Usa composable `useActivityStatusBadge` (Apollo + Map cache de 9 statuses para evitar N queries en una lista de N rows)
- Mapea `WorkflowStatusCategory` → `Badge.variant`: `ToDo→secondary`, `InExecution→primary`, `InReview→warning`, `Published→success`, `Closed→danger`
- Renderiza el atom Badge con `pill size="sm"` y `:label="$t('workflowStatus.name.' + status.code)"` desde nuevo `lang/es_CL@workflowStatus.json` con 9 keys (`BOR`, `EDIT`, `REV-DEC`, `PUB`, `DIS`, `PROP`, `EVAL`, `APR`, `REJ`)
- Storybook story con 5 estados visuales para review PM

**Actor**: developer
**Layers**: frontend (Vueform element + composable), config (i18n + vueform.config.ts auto-registro)

<details><summary>Scenarios de validacion</summary>

#### Scenario: type registrado sin colision
- **GIVEN** `mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue` creado con `defineElement({ name: 'ActivityStatusBadgeElement', ... })`
- **WHEN** se ejecuta `touch suite/vueform.config.ts && npm run sync && npm run dev --workspace=@uplanner/suite`
- **THEN** dev server arranca sin warnings de duplicate type
- **AND** `grep -r "activity-status-badge" suite/vueform.config.ts` retorna 1+ matches del tipo auto-registrado

#### Scenario: composable cachea correctamente
- **GIVEN** RecordList de 50 activities con currentStatusId variado
- **WHEN** el composable se invoca 50 veces (1 por row) con currentStatusId distintos
- **THEN** se ejecuta exactamente 1 query GraphQL inicial que retorna los 9 statuses
- **AND** las 50 invocaciones siguientes resuelven desde Map cache en memoria

#### Scenario: Storybook 5 estados visuales
- **GIVEN** Storybook UP1 corriendo (`npm run storybook --workspace=@uplanner/layout-engine`)
- **WHEN** se navega a la story `ActivityStatusBadge / 5 estados`
- **THEN** se ven 5 badges visualmente: gris (Borrador), azul teal (En ejecucion), amarillo (En revision), verde (Publicado), rojo (Cerrado)
- **AND** los labels son las traducciones es_CL del workflowStatus

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abrir Storybook → ver los 5 estados; abrir UPU → ver el badge en RecordDetail; verificar en DevTools Network que la query de statuses se ejecuta una sola vez por sesion.

### REQ-FIX-04: Integracion del badge en view/edit + columna Estado texto-plano en list

> **Que cambia**: badge Vueform visible en `view` + `edit` (RecordDetail) inline arriba del titulo. En `list` (RecordList), columna `Estado` con el nombre del status traducido como **texto plano** — sin badge visual.
> **Por que**: hoy el `currentStatusId` introducido en HU4 es invisible al usuario final. RecordList no soporta Vueform elements como cell renderers (TableCell render type-based) — DEC-LOCAL-03 reduce scope y limita el badge a RecordDetail.

El sistema MUST modificar los 3 layouts JSON post-rename con las siguientes propiedades:

- `default_activity_list.json`: nueva columna `Estado` que muestre `status.name` (o equivalente) como texto plano, no editable, sortable por `status.code`. **NO usar Vueform renderer**. La implementacion concreta del campo (FK con join, virtual computed, o enum-type via TableCell) queda como detalle de S3.T1 — el contrato es: texto plano sortable, no badge
- `default_activity_view.json`: badge inline (Vueform element `activity-status-badge` consumiendo wrapper de S2) arriba de `name` en tab General. Read-only por contrato del wrapper
- `default_activity_edit.json`: badge identico al de view, con `readOnly: true` en el schema. SIN indicador visual al usuario (iteracion draft v2 — el comportamiento read-only se preserva en el contrato JSON pero no se informa via UI)

`workflowId` y `currentStatusId` quedan en el schema con `readOnly: true` consistente con RULE-curriculum-design-004 (la mutation update generica del object-manager NO permite mutarlos; solo `transitionActivityValidated`).

**Actor**: user (visualiza), system (renderiza)
**Layers**: frontend (3 JSONs)

<details><summary>Scenarios de validacion</summary>

#### Scenario: list muestra status como texto plano sortable
- **GIVEN** UPU `/activity` con al menos 2 activities (aa-uv-1124, TIR101)
- **WHEN** se abre el RecordList
- **THEN** se ve la columna **Estado** con el nombre del status traducido como texto plano (ej. "Publicado", "En ejecucion") — sin badge ni color de fondo
- **AND** clickear el header de la columna ordena las filas por `status.code`
- **AND** el filtro por categoria del UI standard de RecordList sigue funcionando (cumple AC4 UPONE-1100)

#### Scenario: badge inline en view
- **GIVEN** UPU `/activity/aa-uv-1124` con `currentStatusId` apuntando a status PUB (Publicado)
- **WHEN** se abre el RecordDetail tab General
- **THEN** arriba del titulo "Programa de Pedagogia Basica 2026" se ve el badge verde "Publicado" (Vueform element renderizando atom Badge)

#### Scenario: badge en edit sin permitir mutacion
- **GIVEN** UPU `/activity/aa-uv-1124/edit` tab General
- **WHEN** se inspecciona el campo del badge
- **THEN** el badge se renderiza visualmente igual que en view
- **AND** NO se muestra dropdown, input editable, ni indicador visual de read-only
- **AND** intentar mutar `currentStatusId` via mutation update generica falla (RULE-curriculum-design-004)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre UPU `/activity` (texto plano en columna Estado), `/activity/aa-uv-1124` (badge verde Publicado arriba del titulo), `/activity/aa-uv-1124/edit` (badge identico sin permitir editar).

### REQ-PRESERVE-01: `associatedLayoutConfigs` sigue resolviendo post-rename

> **Que cambia**: nada deseado visualmente — esto es regresion. Los embeds que referencian a los 4 layouts via `associatedLayoutConfigs.layoutId` deben seguir resolviendo despues del rename.
> **Por que**: Path B renombra `id`, no solo `name`. Si algun embed en otro mod referencia el id legacy y no se actualiza, el viewer reporta "Layout not found" silencioso.

El sistema MUST mantener funcional cualquier embed que use `associatedLayoutConfigs.layoutId` apuntando a `default_activity_*` post-rename. Los embeds que apuntaban a `default_AcademicActivity_*` deben actualizarse al nuevo id en S1.T1 + S1.T2 (sin esto, el sistema queda con references rotas).

**Actor**: system (resolucion)
**Layers**: frontend (LayoutOrchestrator resolution chain), database (BD UPU)

<details><summary>Scenarios de validacion</summary>

#### Scenario: embeds existentes siguen funcionando
- **GIVEN** UPU post-rename con embeds en otros mods que referencian a `activity view/list/edit`
- **WHEN** se navega a flows que embeben activity (a descubrir en S1.T1)
- **THEN** los embeds renderizan correctamente sin "Layout not found"
- **AND** browser console no muestra warnings de resolucion fallida

</details>

#### Acceptance
**El usuario puede verificar que funciona**: smoke navegacional cubriendo todos los flows con embeds de activity descubiertos en S1.T1; screenshots como Evidence.

### REQ-PRESERVE-02: a11y WCAG 2.1 AA en los 2 layouts con badge (view + edit)

> **Que cambia**: axe-core sobre `default_activity_view` y `default_activity_edit` (los 2 layouts con badge Vueform) reporta 0 violations WCAG 2.1 AA — o, si reporta fail del variant `secondary` (gris #9b9b9b + texto blanco ~2.76:1), se aplica la mitigacion (a) `--up1-gray-700` via override en el wrapper.
> **Por que**: RULE-curriculum-design-001 obliga a cumplir APG/WCAG. El intake detecto riesgo en variant `secondary` (calculo manual ~2.76:1 vs threshold 4.5:1) — DEC-LOCAL-02 decidio validar empiricamente en S3. `default_activity_list` queda fuera del scope a11y (texto plano sin riesgo de contraste).

El sistema MUST validar con axe-core los 2 layouts `default_activity_{view,edit}` post-integracion del badge en UPU. Resultado esperado: 0 violations WCAG 2.1 AA. Si axe-core reporta fail por contraste del variant `secondary`: S3.GATE marca `iterate` y dispara S3.T7 (no listado por default — contingente) con override `bg: var(--up1-gray-700)` en el wrapper SFC cuando `variant === 'secondary'` (NO modificar el atom Badge — blast radius alto).

**Actor**: reviewer
**Layers**: frontend (axe-core + wrapper SFC si mitigacion)

<details><summary>Scenarios de validacion</summary>

#### Scenario: axe-core pasa sobre 3 layouts
- **GIVEN** UPU con los 3 layouts post-integracion del badge
- **WHEN** se corre axe-core sobre cada layout
- **THEN** retorna 0 violations WCAG 2.1 AA

#### Scenario: fail empirico de secondary disparado
- **GIVEN** axe-core retorna violation `color-contrast` sobre el badge variant `secondary`
- **WHEN** se aplica DEC-LOCAL-02 mitigacion (a) — override `bg: var(--up1-gray-700)` en el wrapper para variant=secondary
- **THEN** axe-core re-ejecutado retorna 0 violations
- **AND** screenshot comparativo (antes/despues) en Evidence de TC-8

</details>

#### Acceptance
**El usuario puede verificar que funciona**: output JSON de axe-core con `violations: []` pegado como Evidence en TC-8.

## Fix scope

### Antes (comportamiento actual)

- **Gap 1**:
  - 4 layouts en BD UPU `up1_layen_layout` con `name="default_AcademicActivity_*"` aunque su `objectName` interno ya es `activity` (mezcla cosmetica residual de HU4)
  - 4 JSON files en `mods/curriculum-design/config/layouts/` con id+name legacy `default_AcademicActivity_*`
  - `tests/integration/layouts-declared.test.ts` linea 39, 62-63: assertions sobre los names legacy
  - `tests/llm-e2e/fixtures/expected-tabs.json`: source comment con name legacy
  - Indeterminado numero de embeds en otros mods/JSONs que pueden referenciar `associatedLayoutConfigs.layoutId: "default_AcademicActivity_*"` (a descubrir en S1.T1)
  - Assignments capabilities `activity:*` en `core_RoleCapability`/`core_RoleAssignment` NO verificadas empiricamente post-rename — posibles huerfanos
  - `workflowTransitionHistory.entityType` NO verificado — posibles referencias residuales `"academicActivity"`
- **Gap 2**:
  - Los 3 layouts `default_activity_{list,view,edit}` NO incluyen el campo `currentStatusId` en su schema
  - Usuario abre RecordDetail de activity → no ve en que estado esta
  - Usuario filtra por estado via GraphQL → no puede visualizar el resultado
  - 6 transiciones del smoke S16 del HU4 son invisibles al usuario final
  - No existe wrapper Vueform `ActivityStatusBadge`
  - No existe `lang/es_CL@workflowStatus.json` con keys de los 9 statuses

### Despues (comportamiento esperado)

- **Gap 1**:
  - 4 JSONs renombrados a `default_activity_{create,view,edit,list}.json` con `id` y `name` consistentes
  - Filename = id = name = `default_activity_{mode}` (mantiene la invariante `id === name` validada en `tests/integration/layouts-declared.test.ts:186`)
  - BD UPU `up1_layen_layout` con 4 filas `default_activity_*` y 0 filas legacy (post script SQL cleanup en S1.T3)
  - Todas las `associatedLayoutConfigs.layoutId` cross-monorepo actualizadas al nuevo id
  - Test integration + fixtures actualizadas
  - Capabilities verificadas: count consistente, 0 huerfanos `academicActivity:*`
  - FK polimorfica limpia: 0 referencias a `entityType="academicActivity"`
- **Gap 2** (DEC-LOCAL-03 aplicada — badge solo en view/edit):
  - Vueform element `activity-status-badge` registrado en suite + curriculum-design (consumido solo por view+edit)
  - Composable `useActivityStatusBadge.ts` con cache en memoria de los 9 statuses
  - i18n keys es_CL para los 9 statuses (consumidas por el wrapper Vueform; en list por el campo plain-text)
  - Storybook story con 5 estados visuales (referencia visual del wrapper)
  - `default_activity_view` y `default_activity_edit`: badge Vueform inline arriba del titulo (read-only, sin indicador visual)
  - `default_activity_list`: columna `Estado` con texto plano del nombre del status (sortable por status.code, sin badge)
  - axe-core sobre view+edit: 0 violations WCAG 2.1 AA (o mitigacion (a) gray-700 aplicada si fail). List queda fuera del scope a11y

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `mods/curriculum-design/config/layouts/default_AcademicActivity_create.json` | Renombrar a `default_activity_create.json` + update id + name | Sin embeds detectados (verificar S1.T1) |
| `mods/curriculum-design/config/layouts/default_AcademicActivity_view.json` | Renombrar + update id + name + agregar badge field (renderer `activity-status-badge`) arriba de `name` | Embeds en otros mods que referencien `default_AcademicActivity_view` deben actualizarse |
| `mods/curriculum-design/config/layouts/default_AcademicActivity_edit.json` | Renombrar + update id + name + agregar badge field (renderer `activity-status-badge`, readOnly: true sin indicador visual al usuario) | Idem view |
| `mods/curriculum-design/config/layouts/default_AcademicActivity_list.json` | Renombrar + update id + name + agregar columna Estado **texto plano** (sin renderer Vueform — TableCell no lo soporta), sortable por `status.code`. Implementacion concreta del campo (FK con join, virtual computed, o enum-type via TableCell) decidida en S3.T1 | Embeds que referencien `default_AcademicActivity_list` |
| `mods/curriculum-design/tests/integration/layouts-declared.test.ts` | Update lineas 39, 62-63: replace `default_AcademicActivity_*` → `default_activity_*` | Test integration debe pasar post-rename |
| `mods/curriculum-design/tests/llm-e2e/fixtures/expected-tabs.json` | Update source comments con name legacy | Fixture llm-e2e |
| `mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue` | **CREAR** — Vueform element con `defineElement` | Consumer: los 3 layouts JSON via renderer `activity-status-badge` |
| `mods/curriculum-design/modsComponents/ActivityStatusBadge/useActivityStatusBadge.ts` | **CREAR** — composable Apollo + Map cache memoria | Consumer: ActivityStatusBadgeElement |
| `mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadge.stories.ts` | **CREAR** — Storybook con 5 estados | Consumer: PM review |
| `mods/curriculum-design/lang/es_CL@workflowStatus.json` | **CREAR** — 9 keys `workflowStatus.name.{BOR,EDIT,REV-DEC,PUB,DIS,PROP,EVAL,APR,REJ}` | Consumer: el wrapper para el label del badge |
| `up1_layen_layout` (BD UPU) | DELETE filas legacy `name LIKE 'default_AcademicActivity_%'` via script SQL idempotente | Mitiga BUG-platform-002 (sync NO elimina automaticamente) |
| Embeds cross-mod descubiertos en S1.T1 | UPDATE `associatedLayoutConfigs.layoutId` legacy → nuevo id | Depende del scope encontrado |

## Tasks

### Session 1 — Gap 1: Rename completo (Path B) + cleanup BD + verificaciones [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Grep cross-monorepo exhaustivo de `associatedLayoutConfigs.layoutId` con valor `default_AcademicActivity_*` para descubrir TODOS los consumers a actualizar en S1.T2. Output: lista de paths con linea + valor del layoutId | REQ-FIX-01 | researcher | — | (lectura cross-monorepo) | `grep -r "default_AcademicActivity_" mods/ suite/ layout/ --include="*.json"` retorna lista exhaustiva | (no aplica — lectura) | DET-5, DET-11, DET-16 | done | 1 |
| S1.T2 | Rename id+name de los 4 JSONs (`default_AcademicActivity_{create,view,edit,list}.json` → `default_activity_*.json`) + update referencias `layoutId` en consumers encontrados en S1.T1 + update tests/fixtures (`layouts-declared.test.ts:39,62-63`, `expected-tabs.json`) | REQ-FIX-01 | developer | S1.T1 | 4 JSONs en `mods/curriculum-design/config/layouts/` + consumers de S1.T1 + 2 archivos de tests | `npm test --workspace=@uplanner/curriculum-design -- layouts-declared` pasa | git revert (cambios atomicos en files) | DET-5, DET-8, DET-11, RULE-mods-001, RULE-layout-010, RULE-layout-025 | done | 1 |
| S1.T3 | Script SQL idempotente cleanup BD UPU (`DELETE FROM up1_layen_layout WHERE name LIKE 'default_AcademicActivity_%'`) + ejecutar `npm run sync` para que sync inserte las nuevas filas con name correcto. Documentar antes/despues en TC-1 | REQ-FIX-01 | developer | S1.T2 | Script SQL nuevo (a guardar en `mods/curriculum-design/scripts/migrations/` o equivalente) | Query verificacion antes/despues: 4 filas con name nuevo + 0 con legacy | Script reverso: `INSERT ... ON CONFLICT DO NOTHING` solo si se documenta backup pre-DELETE | DET-5, DET-8, DET-11, BUG-platform-002 | done | 1 |
| S1.T4 | Queries verificacion empirica: (a) `SELECT COUNT(*) FROM core_RoleCapability WHERE capability LIKE 'activity:%'` vs count pre-rename del log de HU4; (b) `SELECT DISTINCT entityType FROM workflowTransitionHistory` debe retornar solo `activity/curriculumPlan/changeRequest`. Si fail: fix targeted con assignments huerfanas | REQ-FIX-02 | developer | S1.T3 | (queries SQL, sin code edit a menos que fail) | TC-2 + TC-3 con `Actual` poblado con outputs SQL reales | (no aplica si solo verificacion; si fix de huerfanos: documentar UPDATE/INSERT reverso) | DET-4, DET-7, DET-13, RULE-mods-037 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 ⚑ fuerte (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, quality review DET-23 dimensiones {1,2,3,4,6,10} aplicables, validar TC-1/TC-2/TC-3 con `Actual` poblado, decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + quality review pass + decision documentada | (no aplica — cierre de session) | DET-20, DET-23, DET-25 | done | 1 |

### Session 2 — Gap 2a: Wrapper Vueform `ActivityStatusBadge` + composable + i18n + Storybook [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear scaffold `mods/curriculum-design/modsComponents/ActivityStatusBadge/` + `useActivityStatusBadge.ts` (composable Apollo + Map cache memoria de 9 statuses; query GraphQL `workflowStatuses` una sola vez al primer use). Patron de referencia: `CompositeSectionTreeElement.vue` composable | REQ-FIX-03 | developer | S1.GATE | `mods/curriculum-design/modsComponents/ActivityStatusBadge/useActivityStatusBadge.ts` (nuevo) | `npm test --workspace=@uplanner/curriculum-design -- useActivityStatusBadge` (test unit del composable: 1 query primera invocacion, 0 queries en N siguientes) | git revert (folder nuevo) | DET-5, DET-8, DET-11, RULE-mods-005 | done | 2 |
| S2.T2 | Crear `ActivityStatusBadgeElement.vue` con `defineElement({ name: 'ActivityStatusBadgeElement' })` + mapeo `WorkflowStatusCategory → Badge.variant` (5 valores: ToDo→secondary, InExecution→primary, InReview→warning, Published→success, Closed→danger) + render `<Badge :variant pill size="sm" :label />` consumiendo el composable. Patron: `RichTextRendererElement.vue` | REQ-FIX-03 | developer | S2.T1 | `mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue` (nuevo) | dev server arranca sin warnings de type duplicate (RULE-mods-021: touch + sync) | git revert | DET-5, DET-8, RULE-mods-011, RULE-mods-012, RULE-mods-022 | done | 2 |
| S2.T3 | Crear `mods/curriculum-design/lang/es_CL@workflowStatus.json` con 9 keys `workflowStatus.name.{BOR,EDIT,REV-DEC,PUB,DIS,PROP,EVAL,APR,REJ}` con traducciones es_CL (consultar con PM si las traducciones literales del seed son las correctas) | REQ-FIX-03 | developer | S2.T1 | `mods/curriculum-design/lang/es_CL@workflowStatus.json` (nuevo) | sync inserta keys correctamente en suite/lang/ + `$t('workflowStatus.name.BOR')` resuelve | git revert | DET-2, DET-8, RULE-mods-011, RULE-suite-002 | done | 2 |
| S2.T4 | Crear `ActivityStatusBadge.stories.ts` con 5 estados visuales (Borrador, En ejecucion, En revision, Publicado, Cerrado) usando mocks de los 9 statuses (5 representativos). Patron: `Badge.stories.ts` del atom layout | REQ-FIX-03 | developer | S2.T2 | `mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadge.stories.ts` (nuevo) | `npm run storybook --workspace=@uplanner/layout-engine` muestra story con 5 estados visualmente correctos | git revert | DET-2, DET-7, DET-8 | done | 2 |
| S2.T5 | `touch suite/vueform.config.ts && npm run sync` para forzar reload del glob + verificar empiricamente: (a) `grep -r "activity-status-badge" suite/vueform.config.ts` retorna 1+ matches; (b) `npm run dev --workspace=@uplanner/suite` arranca sin warnings de duplicate type. Documentar TC-4 con `Actual` poblado | REQ-FIX-03 | developer | S2.T2, S2.T3 | `suite/vueform.config.ts` (solo touch) | grep + dev server sin warnings = TC-4 PASS | (no aplica — operacion idempotente) | DET-5, RULE-mods-021, RULE-suite-003 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 auto (tier: T2)** — persistir resultados en `## Sessions` del ticket, quality review DET-23 dimensiones {1,2,3,4,6,7,10} aplicables, validar TC-4/TC-5 con `Actual` poblado, decidir continue/iterate (continue por default si tests verdes + 0 warnings) | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4, S2.T5 | ticket | gate persistido + quality review pass | (no aplica) | DET-20, DET-23, DET-25 | done | 2 |

### Session 3 — Gap 2b: Integracion badge en 3 layouts + a11y axe-core + smoke UPU [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Editar `default_activity_list.json` (post-rename de S1.T2) agregando columna `Estado` con texto plano del nombre del status (DEC-LOCAL-03 — sin Vueform renderer, sin badge). Implementacion concreta del campo a decidir en runtime: (a) FK `currentStatusId` con TableCell render FK link, (b) path-based `currentStatus.name` si RecordList soporta nested FK paths, (c) virtual computed via custom resolver. Sortable por `status.code`. Ubicar entre `Nombre` y `Codigo` | REQ-FIX-04 | developer | S2.GATE | `mods/curriculum-design/config/layouts/default_activity_list.json` | `npm run sync` + smoke RecordList en UPU muestra columna nueva con nombre del status como texto plano sortable | git revert | DET-5, DET-8, RULE-mods-001, RULE-layout-016, RULE-curriculum-design-004 | done | 3 |
| S3.T2 | Editar `default_activity_view.json` agregando campo del badge inline ARRIBA de `name` en tab General (default del draft v2). `readOnly: true` + renderer `activity-status-badge` | REQ-FIX-04 | developer | S2.GATE | `mods/curriculum-design/config/layouts/default_activity_view.json` | `npm run sync` + smoke RecordDetail tab General en UPU muestra badge arriba del titulo | git revert | DET-5, DET-8, RULE-mods-001, RULE-curriculum-design-004 | done | 3 |
| S3.T3 | Editar `default_activity_edit.json` agregando badge en la misma posicion que view, con `readOnly: true` en el schema PERO **sin indicador visual al usuario** (iteracion draft v2: comportamiento read-only se preserva en JSON pero no se informa via UI tipo chip o icono lock) | REQ-FIX-04 | developer | S2.GATE | `mods/curriculum-design/config/layouts/default_activity_edit.json` | `npm run sync` + smoke RecordDetail edit muestra badge sin permitir mutacion (DevTools confirma `transitionActivityValidated` es la unica ruta de mutacion) | git revert | DET-5, DET-8, RULE-mods-001, RULE-curriculum-design-004 | done | 3 |
| S3.T4 | Smoke UPU live: navegar `/activity` (list — verificar columna Estado con **texto plano**, sortable), `/activity/aa-uv-1124` (view + edit — verificar **badge Vueform**), `/activity/TIR101` (view + edit — verificar badge con categoria distinta). Screenshots para Evidence de TC-6. Validar visualmente los 5 estados visuales del badge en view/edit (al menos 4 distintos cubiertos por aa-uv-1124 + TIR101 + 2 records adicionales si existen) | REQ-FIX-04 | reviewer | S3.T1, S3.T2, S3.T3 | (smoke UPU live + screenshots → `tickets/TICKET-025.screenshots/`) | TC-6 con `Actual` poblado + Evidence screenshots | (no aplica) | DET-4, DET-7, DET-13 | done | 3 |
| S3.T5 | TC-7 — Smoke navegacional cross-mod sobre flows con embeds de activity descubiertos en S1.T1 (si la lista no estaba vacia). Validar empiricamente REQ-PRESERVE-01: 0 "Layout not found" warnings en console | REQ-PRESERVE-01 | reviewer | S3.T4 | (smoke UPU + console DevTools) | TC-7 con `Actual` poblado + nota explicita si la lista de S1.T1 estaba vacia | (no aplica) | DET-4, DET-7, DET-13, DET-16 | done | 3 |
| S3.T6 | axe-core sobre los 2 layouts con badge `default_activity_{view,edit}` en UPU (DEC-LOCAL-03 — list queda fuera por texto plano sin contraste). Output JSON pegado en TC-8 Evidence. **Si reporta violation `color-contrast` sobre badge variant secondary**: marcar S3.GATE como iterate y disparar S3.T7 con override `bg: var(--up1-gray-700)` en `ActivityStatusBadgeElement.vue` cuando `variant === 'secondary'` (NO modificar el atom Badge) | REQ-PRESERVE-02 | reviewer | S3.T4 | (axe-core run + posiblemente `ActivityStatusBadgeElement.vue` si fail) | TC-8 con `Actual` poblado: `violations: []` o lista de violations + accion documentada | git revert override si se aplica | DET-4, DET-7, DET-13, RULE-curriculum-design-001 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 ⚑ fuerte (tier: T3 exhaustive)** — persistir resultados en `## Sessions` del ticket, quality review DET-23 las 10 dimensiones (T3 exhaustive incluye a11y + claridad + escalabilidad), validar todos los TCs con `Actual`+`Evidence` poblados, decidir continue (todos PASS) o iterate (si S3.T6 disparo S3.T7 condicional, re-validar post-fix) | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5, S3.T6 | ticket | gate persistido + quality review exhaustive pass + decision documentada | (no aplica) | DET-20, DET-23, DET-25 | done | 3 |

### Task contract

Detalles complementarios cuando el task contract requiere mas de lo que cabe en la tabla canonica:

```
Task S1.T1: Grep cross-monorepo
- expected_output: lista de paths:linea con valor del layoutId legacy. Ejemplo:
    mods/some-mod/config/layouts/some_layout.json:42 → "default_AcademicActivity_view"
    mods/another/config/layouts/x.json:88 → "default_AcademicActivity_list"
- precondition: ninguna (researcher, lectura)
- nota: si la lista es vacia, documentar explicito en el output (no es error — significa que los layouts target NO tienen consumers cross-mod)

Task S1.T3: Script SQL cleanup
- expected_output: script idempotente con BEGIN; DELETE ... WHERE ...; COMMIT; + queries antes/despues
- precondition: backup BD UPU o snapshot pre-deploy
- nota: idempotencia: re-ejecutar el script en BD ya limpia debe retornar 0 filas afectadas sin error

Task S3.T6: axe-core
- expected_output: JSON output completo de axe-core por cada layout (3 outputs). Si violations: lista con rule, impact, target, message
- precondition: S3.T4 cerrado (layouts integrados visibles en UPU)
- nota: usar @axe-core/playwright si hay setup, sino axe-core CLI manual sobre puppeteer/playwright con login UPU
- contingencia: si fail confirmado, S3.GATE iterate disparado, S3.T7 implicito (no listado por default) override gray-700

Task S3.T7 (CONTINGENTE — solo si S3.T6 fail): Aplicar mitigacion DEC-LOCAL-02 (a)
- source_ref: REQ-PRESERVE-02
- agent: developer
- depends_on: S3.T6 (con resultado fail)
- files: mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue
- precondition: axe-core confirma violation color-contrast en variant secondary
- expected_output: override `:style="variant === 'secondary' ? { backgroundColor: 'var(--up1-gray-700)' } : {}"` en el render del Badge
- validation: re-ejecutar axe-core → 0 violations
- rollback: git revert
- rules: [DET-5, DET-8, RULE-curriculum-design-001]
- nota: NO modificar el atom Badge en layout/ — el override vive en el wrapper del mod para limitar blast radius
```

## Constraints

- **DET-5** (multi-capa): rename verificado en frontend (JSONs), database (queries SQL), config (tests/fixtures), meta (rules existentes)
- **DET-8** (rollback documentado): cada task tiene `git revert` salvo scripts SQL con backup explicito
- **DET-11** (KB-first): consultar RULE-layout-010/016/025, RULE-mods-001/005/011/012/021/022/037, RULE-curriculum-design-001/004 antes de implementar
- **DET-20** (sessions con gate): 3 sessions con `S{N}.GATE` como ultima task
- **DET-23** (quality review): cada gate aplica las dimensiones aplicables al tier (T2 standard, T3 exhaustive)
- **DET-25** (TCs registrados en sesion): cada gate valida `Actual`+`Evidence` poblados antes de continue
- **RULE-layout-010** — Layouts JSON requieren `id`, `name`, `tenants[]`: aplica a los 4 JSONs renombrados
- **RULE-layout-016** — Default sort en RecordList usa `order: { field, direction }`, no `defaultSort`: aplica a la nueva columna Estado de S3.T1
- **RULE-layout-025** — `associatedLayoutConfigs` resuelve por nombre `default_{objectName}_{mode}`: validado en intake H3 (resolucion por id con fallback a name). Path B requiere update de los layoutId
- **RULE-mods-005** — Composables shared vs component-level: `useActivityStatusBadge.ts` va en `modsComponents/ActivityStatusBadge/` por tener Apollo + cache
- **RULE-mods-011** — Sync: exactamente 1 `.vue` por carpeta + i18n keys planas: aplica a estructura del nuevo modsComponent
- **RULE-mods-012** — Custom Vueform elements usan `defineElement()`: aplica a `ActivityStatusBadgeElement.vue`
- **RULE-mods-021** — Primer sync con Vueform element nuevo: `touch suite/vueform.config.ts` para forzar reload glob (S2.T5)
- **RULE-mods-022** — Sub-componentes Vueform inline en mismo SFC: sync rechaza multiples `.vue` por folder
- **RULE-suite-002** — i18n: BD almacena keys + jerarquia override multi-tenant: badge usa `$t('workflowStatus.name.XXX')`
- **RULE-suite-003** — Nuevos modsComponents requieren restart dev server: aplica a S2.T5
- **RULE-curriculum-design-001** — Custom Vueform elements deben cumplir WAI-ARIA APG: aplica a a11y de S3.T6
- **RULE-curriculum-design-004** — `currentStatusId` es `readOnly` en update: aplica a S3.T3 (edit layout)
- **SPEC-004 REQ-RENAME-4 — supersession**: este spec INVIERTE explicitamente la decision de SPEC-004 REQ-RENAME-4 de "mantener name original para evitar huerfanos". Justificacion en DEC-LOCAL-01 abajo. SPEC-004 queda con nota inline pendiente de actualizar al cierre de TICKET-025

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| TICKET-024 (cerrado 2026-05-18) | internal | Seed `activity-standard` correcto en UPU. Sin esto, el badge no resuelve los 9 statuses canonicos | LOW — TICKET-024 ya cerrado |
| BD UPU acceso de escritura | external (DBA) | Script SQL cleanup S1.T3 requiere permisos DELETE en `up1_layen_layout` | MEDIUM — coordinar con DBA si no se tiene acceso directo |
| Atom Badge `layout/src/components/atoms/Badge/Badge.vue` | internal | Se consume del wrapper. NO se modifica. Si cambian sus props en otro PR, validar compatibilidad | LOW — atom estable post-WCAG implementation |
| Workflows del seed `activity-standard` (9 statuses) | internal | Composable los cachea. Si cambia el seed, hay que actualizar i18n keys | LOW — seed estable post-HU3 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| S1.T1 encuentra muchos embeds cross-mod (>10) | low | medium — amplia scope S1.T2 ~50% | S1.GATE iterate si lista crece — escalar al dev para decision pre-S1.T2 |
| Script SQL cleanup falla por permisos | medium | high — bloquea S1.GATE | Pre-validar con DBA antes de S1.T3; tener fallback `DELETE` manual coordinado |
| axe-core falla sobre secondary (esperado calculo manual) | high | low — DEC-LOCAL-02 ya tiene mitigacion pre-validada | S3.T7 contingente con override gray-700 |
| Vueform glob no auto-registra el nuevo type (cache del bundler) | medium | medium — requiere debugging | RULE-mods-021 mitiga via `touch + sync`. Si persiste: `rm -rf node_modules/.vite` + reinstall |
| Composable cache memoria pierde entries entre route changes en Nuxt | low | low | Patron de CompositeSectionTreeElement valida que funciona; si no, fallback a Apollo cache normal (sin Map) |

## Open questions

- [ ] **Posicion del badge en view/edit** — el draft v2 lo coloca arriba del `name`. Si el dev prefiere abajo o a la derecha del titulo, iterar a v3 antes de S3.T2/T3. **Default asumido**: arriba.
- [ ] **Sort orden de columna Estado en list** — el draft v2 dice "sortable por `status.code` (alfabetico)". Alternativas: `category` (semantico ToDo→Closed) o `displayOrder` (custom del seed). **Default asumido**: `status.code`.

Las 2 questions son menores — un cambio de 1 linea en JSON. Si el dev no responde antes de S3.T1/T2, se aplica el default y se documenta como decision local al cierre de S3.

## Decisions

### DEC-LOCAL-01: Rename strategy Path B (completo)

- **Contexto**: TICKET-025 detecto que TICKET-019 (HU4) dejo el rename `academicActivity → activity` perfecto en codigo pero incompleto en infraestructura — 4 layouts BD UPU con name legacy y 4 JSONs con id+name legacy. SPEC-004 REQ-RENAME-4 explicito decidio "mantener name original para evitar huerfanos". Este spec INVIERTE esa decision.
- **Drivers**:
  - Consistencia del KB: hay valor en cerrar el rename de TICKET-019 de verdad (sin deuda residual `objectName="activity"` + `id="default_AcademicActivity_*"`)
  - Riesgo de regresion silenciosa si Path B omite 1 embed cross-mod
  - Scope de S1: Path B amplia ~30% el trabajo
- **Opcion elegida**: **Path B — rename completo**: renombrar `id` + `name` de los 4 JSONs + actualizar todas las `associatedLayoutConfigs.layoutId` cross-monorepo + update tests/fixtures + script SQL cleanup BD
- **Alternativas descartadas**:
  - **Path A — rename cosmetico (solo `name`)**: scope minimo, sin riesgo de romper embeds, pero deja deuda residual permanente. **Descartado** porque el dev decidio priorizar consistencia long-term sobre minimizacion de scope
- **Consecuencias**: gana consistencia + cierre real del rename de TICKET-019; pierde scope adicional en S1 (~30%, mitigado con S1.T1 grep exhaustivo); requiere actualizar SPEC-004 REQ-RENAME-4 (al cierre de TICKET-025, con nota de supersession)
- **Session**: design-fix (pre-execute, 2026-05-18)

### DEC-LOCAL-02: A11y del variant secondary — validacion empirica (no preventivo)

- **Contexto**: intake-explore H9 partial detecto riesgo de fail WCAG 2.1 AA del variant `secondary` (gris `--up1-gray-600` #9b9b9b + texto blanco). Calculo manual: contraste ~2.76:1, debajo del threshold 4.5:1.
- **Drivers**:
  - Evidencia vs asumpcion: calculo manual sin axe-core es aproximado; podria estar mal
  - Deuda preventiva: si pre-mitigamos y axe-core hubiera pasado, agregamos override innecesario
  - Blast radius: la opcion estructural (modificar token Badge global) impacta todo el monorepo
- **Opcion elegida**: **Empirico — esperar axe-core en S3.T6**. Si confirma fail: gate iterate dispara S3.T7 con opcion (a) override `bg: var(--up1-gray-700)` en el wrapper SFC SOLO cuando `variant === 'secondary'` (sin modificar el atom Badge)
- **Alternativas descartadas**:
  - **Preventivo (aplicar gray-700 ya en S2)**: descartado por riesgo de deuda innecesaria
  - **Estructural (modificar token global)**: descartado por blast radius alto — requiere coordinacion cross-mod
- **Consecuencias**: gana decision basada en evidencia + override contenido al wrapper si se aplica; pierde 1 ciclo iterate del gate S3 si axe-core falla (esperado)
- **Session**: design-fix (pre-execute, 2026-05-18)

### DEC-LOCAL-04: Override perceptual de variant `secondary` en dark mode via prop `customColor`

- **Contexto**: detectado empiricamente por el dev durante S3 smoke UPU live (2026-05-18). El variant `secondary` (categoria ToDo, ej. Borrador) en dark mode pasa WCAG AA numericamente (~11:1) pero perceptualmente queda "lavado" sobre fondo oscuro del RecordDetail. Root cause: `--up1-color-secondary-500` = `--up1-gray-600` se invierte via `light-dark()` CSS de `#9b9b9b` (light) a `#d4d4d4` (dark). Gris claro sobre fondo oscuro perdia diferenciacion visual aunque tecnicamente legible.
- **Drivers**:
  - Scope contenido del fix (analogo a DEC-LOCAL-02/03 — sin tocar atom Badge shared)
  - Blast radius del cambio en `layout/` (modificar el atom Badge afecta multiples consumers cross-mod)
  - Reactividad al toggle de tema sin reload (UP1 permite cambiar entre light/dark dinamicamente)
- **Intento descartado durante execute**: CSS scoped `:global(.theme-dark) .asb-wrapper :deep(.bg-secondary) { background-color: #525252 !important }` — fallo en runtime: modificaba el fondo de la vista completa, no solo el badge. Probable causa: `.bg-secondary` es clase Bootstrap reutilizada en containers cross-suite y el selector compilado no encapsulo el override al scope esperado. Aprendizaje guardado como rule: NO usar `:deep(.bg-*)` con clases Bootstrap genericas
- **Opcion elegida**: **prop `customColor` del atom Badge**. El element wrapper detecta dark mode runtime con `MutationObserver` sobre `document.documentElement.classList`, y cuando `dark + secondary` pasa `customColor='#525252'` (gray-700 literal, no token invertible). El atom Badge reemplaza el variant class por `.badge-custom` con bg inline + texto blanco forzado
- **Alternativas descartadas**:
  - **CSS scoped `:deep()`**: descartado por root cause arriba — anti-patron con clases Bootstrap
  - **Modificar el atom Badge**: descartado por alto blast radius (analogo a opciones B de DEC-LOCAL-02 y DEC-LOCAL-03)
  - **Crear wrapper visual propio sin reusar Badge**: descartado por overhead innecesario para un solo override
- **Consecuencias**:
  - Gana: scope contenido al wrapper, reactivo al toggle de tema sin reload, sin afectar otros consumers del atom
  - Pierde: cobertura del fix solo a este wrapper (si otros badges en otros mods tienen el mismo issue, hay que duplicar). Documentado como deuda potencial en backlog del design system si crece
- **Implementacion**: `ActivityStatusBadgeElement.vue` — data adds `_isDarkMode` + `_themeObserver`. `mounted()` invoca `updateDarkMode()` + crea `MutationObserver`. `beforeUnmount()` limpia observer. Computed `badgeCustomColor` retorna `'#525252'` solo cuando dark + secondary, `''` en otros casos. Commit `3c31b50` curriculum-design
- **Session**: execute S3 (post-smoke dev feedback, 2026-05-18)

### DEC-LOCAL-03: List con texto plano (badge solo en view/edit) — RecordList no soporta Vueform renderers

- **Contexto**: investigacion empirica pre-execute (researcher Explore haiku, 2026-05-18) detecto que RecordList NO soporta Vueform elements como cell renderers. Mecanismo real: slots dinamicos `#[cell(${field})]` → `TableCell.vue` con rendering type-based (boolean/date/datetime/FK/URL/name/plaintext). NO hay campo `renderer` en columnas de `_list.json`. Vueform integration vive solo en RecordDetail. Cita: `RecordList.vue:357-396`, `TableCell.vue`. La S3.T1 original del spec asumia `renderer: "activity-status-badge"` en list — no ejecutable como diseñada.
- **Drivers**:
  - Blast radius del cambio en `layout/` (modificar TableCell shared afecta consumers cross-mod)
  - Scope SP3 (este ticket es un followup, no ampliar a refactor estructural)
  - Valor del badge en list vs filter standard (filter por categoria/code de AC4 UPONE-1100 sigue funcionando sin badge visual)
  - El draft v2 aprobado mostraba badge en list — la implementacion no es ejecutable
- **Opcion elegida**: **C — scope reducido**. Badge Vueform solo en `default_activity_view` y `default_activity_edit` (RecordDetail). En `default_activity_list`, columna `Estado` con texto plano del nombre del status (sortable por `status.code`). Filter standard de RecordList sigue funcionando. Draft iterado a v3
- **Alternativas descartadas**:
  - **A — Componente molecule + slot override en consumer**: bajo blast radius pero rompe patron declarativo del layout JSON; requiere wiring extra en suite/orchestrator
  - **B — Extender TableCell con `type: "badge"` + metadata declarativa**: alineado arquitectonicamente y reusable cross-mod, pero alto blast radius en `layout/` (modifica molecule shared) — requiere coordinacion + tests/storybook
- **Consecuencias**:
  - Gana: scope minimo, cero blast radius en `layout/`, el wrapper Vueform de S2 sigue 100% util para view+edit
  - Pierde: badge visual en list (texto plano en su lugar); axe-core en S3 cubre solo 2 layouts en vez de 3
  - Deuda potencial: si en el futuro se decide tener badge en list, hay que volver con opcion B (extender TableCell). Documentar como "lesson learned" en teach-close para evaluar si justifica spec separado
- **Session**: design-fix (pre-execute, 2026-05-18) tras hallazgo empirico previo a aprobacion del spec

## Technical reference

### Tokens del atom Badge (snapshot de `layout/src/styles/design-tokens/components/atoms.css`)

```css
/* Variants */
--up1-badge-bg-primary: var(--up1-color-primary);       /* #0a808c */
--up1-badge-color-primary: white;

--up1-badge-bg-secondary: var(--up1-color-secondary-500);  /* var(--up1-gray-600) = #9b9b9b */
--up1-badge-color-secondary: white;                         /* RIESGO H9 — ~2.76:1 */

--up1-badge-bg-success: var(--up1-color-success-500);   /* #22946e */
--up1-badge-color-success: white;

--up1-badge-bg-danger: var(--up1-color-danger-500);     /* #9c2121 */
--up1-badge-color-danger: white;

--up1-badge-bg-warning: var(--up1-color-warning-500);   /* #f59e0b */
--up1-badge-color-warning: var(--up1-gray-900);         /* #262626 — usa texto oscuro, PASS */
```

### Resolucion de layouts (snapshot de `layout/src/layouts/LayoutOrchestrator.vue`)

```
// Linea 353-356: primero intenta por id
const result = await getInstance(layoutIdToFetch);

// Linea 398: fallback por name
filters: [{ field: 'name', operator: 'EQUALS', value: layoutIdToFetch }]
```

### Backend resolver convencion (snapshot de `object-manager/src/graphql/resolvers/up1/layout/layout.resolver.js:433-435`)

```
const defaultId = mode
  ? `default_${objectName}_${mode}`
  : `default_${objectName}`;
```

### Mapeo categoria → variant (verbatim del ticket)

```
ToDo         → secondary  (gris — RIESGO a11y)
InExecution  → primary    (teal #0a808c)
InReview     → warning    (amarillo + texto oscuro)
Published    → success    (verde)
Closed       → danger     (rojo)
```

## Rules discovered

Se llena durante ejecucion. Posibles rules a derivar:

- ¿Convencion sobre cuando aplicar Path A vs Path B en renames de layouts BD? (revisitar SPEC-004 REQ-RENAME-4 con DEC-LOCAL-01 como caso de inversion documentada)
- ¿Patron de override de tokens en wrappers Vueform (vs modificar el atom)? (si S3.T7 se dispara con la mitigacion W5)

## Bugs found

- [BUG-platform-002](../../bugs/platform/bug-platform-002.md) — `deactivateOrphanedAppsLayouts` codigo muerto. Confirmado empiricamente en S1.T3 (BD UPU tenia 8 filas pre-script: 4 legacy + 4 nuevas). Mitigado en este ticket via script SQL idempotente
- [BUG-platform-017](../../bugs/platform/bug-platform-017.md) — **NUEVO durante S3** — axe-core no ejecutado sobre los 2 layouts con badge en UPU. H9 light-mode secondary queda sin verificacion empirica formal. Plan de ejecucion completo documentado en el bug (Playwright + @axe-core/playwright + storageState + cobertura light+dark + 5 categorias). Severity medium

## Acceptance checkpoints

- [ ] **Funcional**: los 6 scenarios de los REQs (FIX-01 a FIX-04 + PRESERVE-01/02) pasan
- [ ] **Tests**: 8 TCs documentados con `Actual` + `Evidence` poblados; suite `npm test --workspace=@uplanner/curriculum-design -- layouts-declared` pasa post-rename
- [ ] **NFRs**: WCAG 2.1 AA cumplido en los 3 layouts (S3.T6 axe-core) — o mitigacion DEC-LOCAL-02 aplicada y revalidada
- [ ] **Rules**: las 15 rules listadas en Constraints respetadas en las tasks que las aplican
- [ ] **Integration**: smoke en UPU con embeds de activity post-rename (TC-7) — 0 "Layout not found"
- [ ] **Docs**: SPEC-004 REQ-RENAME-4 con nota inline de supersession por DEC-LOCAL-01 de este spec; teach-close del ticket cubre las 2 DEC-LOCAL como lessons learned

## Archiving

NO aplica. Este spec genera fix activo. Archivado solo si: (a) decision de negocio descarta el rename completo y revierte a Path A — escenario improbable, requeriria revertir TICKET-025; (b) refactor estructural mueve toda la logica del badge a otro lado — escenario futuro.
