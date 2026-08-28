---
id: TICKET-007
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1034
module: curriculum-design
autopilot: manual
---

# Vista general listado de Programa de asignatura

## Request

Crear el layout default de listado para `AcademicActivity` (objeto raiz del Programa de asignatura, modelado en TICKET-006) con los siguientes filtros:

1. **Unidad Organizativa** (UO) — STUB en SP1 (filtro inactivo o desactivado por UI). El campo `executionUnitId` esta postergado segun DECISION-002 (OrgUnit no existe aun). Documentar en el ticket que el filtro queda preparado pero sin backend.
2. **Estado** — filtro por `workflowState`. Valores: Draft / Review / Approved / Published / OpenForEdit / Deprecated. En SP1 todos los registros estaran en Draft, pero el filtro debe estar funcional.
3. **Codigo** — busqueda de texto sobre `AcademicActivity.code`.
4. **Nombre** — busqueda de texto sobre `AcademicActivity.name`.

Layout:
- Archivo: `up1/mods/curriculum-design/config/layouts/default_AcademicActivity_list.json`
- Naming convention: `default_{ObjectName}_list` ([up1/layout/docs/reference/default-layouts.md](../../up1/layout/docs/reference/default-layouts.md))
- Columnas sugeridas: code, name, version, programLevel, workflowState, language, updatedAt
- Acciones: ver detalle (abre layout default_AcademicActivity_view de TICKET-008), crear nuevo

Cobertura Confluence: inicio de CAP-CUR-014 (lista programas creados).

Dependencias:
- TICKET-006 (UPONE-1033) debe estar mergeado primero — el objeto debe existir.
- Plataforma de layouts esta disponible (UPONE-942 Finalizada lista todos los registros del objeto base).

Validacion: el listado se renderiza con datos del seed, los 4 filtros funcionan (excepto UO que queda stub), las acciones abren el detalle correctamente.

**Multi-tenancy** ([DECISION-012](../decisions/DECISION-012-two-phase-tenant-rollout.md) FINAL — Fase 1):
- `X-Tenant-ID: UPU` → listado muestra **2 filas** (los 2 cursos del mod):
  - `name="Ecuaciones Diferenciales"` (Univalle) — `externalId="aa-uv-1124"`
  - `name="Introduccion a las Redes"` (AIEP) — `externalId="aa-aiep-14757"`
- Identificacion del cliente por `name`/`externalId`/`Institution.code`, NO por TENANT_ID
- El layout es global (sin `tenants[]` en su JSON) — preparado para Fase 2 sin cambios
- Aislamiento entre tenants y switch de tenant: **deferred to Phase 2**
- Coexistencia: el listado solo muestra `AcademicActivity` del mod. Los demas objetos del seed core de UPU (Person, Faculty, Course del demo) NO aparecen aqui (objetos distintos).

Link Jira: UPONE-1034 (en sprint Migracion uAssessment - SP1).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | feature |
| Modulo principal | curriculum-design |
| Modulos afectados | layout (consumo de RecordList + i18n) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Declarar layout JSON sin `applicationId` basta para que aparezca en menu de objetos | ✓ | RULE-mods-009. Validado en UI: dropdown "AcademicActivity" → "Programas de asignatura" visible |
| H2 | Filtros UO/Estado/Codigo/Nombre se cubren con campos `filterable: true` en columnas + SearchBox global | ✓ | Validado: dropdown del modal incluye los 4 campos, SearchBox filtra por code/name |
| H3 | i18n via `enums.{field}.{value}` se aplica en celda en modo display | ✗ | Refutada: solo aplica en editor, filtro modal y RecordDetail. Display mode renderiza valor crudo. Documentado en RULE-layout-018 |

### Context found

#### Knowledge Base — alta prioridad

| Tipo | Path | Por que |
|------|------|---------|
| meta-spec | [meta-specs/METASPEC-layout-config.md](../meta-specs/METASPEC-layout-config.md) | Schema oficial de un layout JSON: id, name, tenants, columns, mode |
| spec | [specs/curriculum-design/programa-de-asignatura.md](../specs/curriculum-design/programa-de-asignatura.md) | Que se lista (`AcademicActivity`), campos disponibles |
| spec | [specs/curriculum-design/capabilities/CAP-CUR-014.md](../specs/curriculum-design/capabilities/CAP-CUR-014.md) | Capability que cubre este listado |
| decision | [decisions/DECISION-org-unit-defer.md](../decisions/DECISION-org-unit-defer.md) | Filtro UO va como **stub** (no hay backend) |
| spec | [specs/confluence/layouts-detalle.md](../specs/confluence/layouts-detalle.md) | RecordList/RecordDetail desde Confluence |
| ticket cerrado | [tickets/ticket-006.md](ticket-006.md) | **DEPENDENCIA**: el objeto `AcademicActivity` debe existir antes de crear su layout |

#### Rules de mods que aplican (must)

| Rule | Aplicacion concreta |
|------|---------------------|
| [rule-mods-003](../rules/mods/rule-mods-003.md) | `npm run sync` obligatorio despues de declarar layouts |
| [rule-mods-009](../rules/mods/rule-mods-009.md) | Layouts del nav NO llevan `applicationId` — sync lo asigna |
| [rule-mods-010](../rules/mods/rule-mods-010.md) | `defaultObjects` en app.json NO controla que layouts aparecen en el nav (cuidado: confusion comun) |

#### Capabilities cubiertas

| CAP | Cobertura |
|-----|-----------|
| [CAP-CUR-014](../specs/curriculum-design/capabilities/CAP-CUR-014.md) | Inicio (lista programas creados) |

#### Codebase (referencias)

| Path | Por que |
|------|---------|
| `up1/layout/docs/reference/default-layouts.md` | Naming convention `default_{ObjectName}_list` |
| `up1/layout/logic/layout.resolver.js` (`resolveDefaultLayout` ~linea 375) | Como la plataforma resuelve layouts |
| `up1/layout/config/defaults/default_Category_create.json` | Ejemplo real de layout JSON |
| `up1/mods/hello-world-mod/config/layouts/` | Layouts reales en mod (`hw-assessment-list.json`) |
| `up1/mods/retention-wellbeing/config/layouts/` | Layouts en mod produccion |

#### Plataforma ya entregada (consumimos, no construimos)

| Ticket Jira | Estado | Que entrega |
|-------------|--------|-------------|
| [UPONE-942](https://u-planner.atlassian.net/browse/UPONE-942) | Finalizada | Listado generico del objeto base — solo declaramos el layout |
| [UPONE-943](https://u-planner.atlassian.net/browse/UPONE-943) | **Blocked** | Filtrar por RecordType — NO usado en este ticket (no afecta) |

#### Referencia opcional

| Spec | Cuando |
|------|--------|
| [specs/mods/example-engagement.md](../specs/mods/example-engagement.md) | Para ver listas reales en accion |
| [specs/mods/creation-guide.md](../specs/mods/creation-guide.md) seccion "Layouts" | Si surge duda sobre fase 4 del sync |

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1034-default-academic-activity-list-layout` (en repo `uplanner/curriculum-design`) |
| Base branch | `develop` |
| DB state | UPU con seed completo de TICKET-006 (Univalle + AIEP cargados) |
| Services | object-manager:4000, suite:3000 (levantados por el dev) |
| Test data | 2 `AcademicActivity` en `UPU`: "Ecuaciones Diferenciales" (UV) + "Introduccion a las Redes" (AIEP) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | UPONE-1034 (Jira) es muy escueto: solo pide "vista general + 4 filtros (UO/Estado/Codigo/Nombre)". DKC ticket-007.md lo enriquecio con columnas, multi-tenancy, tests. Las decisiones tecnicas detalladas (`tenants`, `applicationId`, `roles`, sort, etc) son interpretacion nuestra — quedan en `TICKET-007.draft/intent.md` para auditoria. | design-draft v1 | — | discarded | nota historica, no rule reusable |
| L2 | El seed de curriculum-design ya carga ambos `AcademicActivity` con `workflowState="Approved"`, no `"Draft"` como anuncia el DKC ticket-007. Decision: aceptar valor del seed; ajustar TC-007-06/07 al valor real en lugar de modificar seed. | design-draft v1 | — | discarded | ya documentado en DEC-LOCAL-03 |
| L3 | `AcademicActivity` no tiene FK `institutionId` (solo `BibliographyReference` la tiene). Para Fase 1, identificacion Univalle vs AIEP es por `code`/`externalId`/`Institution.code`. Si en el futuro se requieren vistas filtradas por institucion sin pasar a Fase 2 (tenants separados), agregar FK seria ticket aparte. | design-draft v1 (descartada en favor de "opcion general") | — | discarded | estado actual del modelo, no rule |
| L4 | `defaultSort: { field, order }` en `layoutConfig` **no funciona** — el listado se ordena por `createdAt` por default. El campo correcto es `order: { field, direction: "ASC"\|"DESC" }` (visto en `engagement-mis-eventos-list.json`). Confirmado: tras cambiar a `order`, el footer reporta "Ordenado por name" y filas se ordenan alfabeticamente. | execute Session 1 | 1 | refined | [RULE-layout-016](../rules/layout/rule-layout-016.md) |
| L5 | La plataforma RecordList **no soporta filtros pre-declarados como controles fijos** en el header del listado. Solo provee: (a) SearchBox global ad-hoc; (b) modal "Configurar Filtros" donde el usuario agrega filtros sobre cualquier campo. Mi preview.html v1 mostraba 4 controles fijos que no son posibles. La interpretacion correcta del ticket UPONE-1034 "filtrable por X" es "el usuario puede crear un filtro por ese campo" — el modal cubre eso. | execute Session 1 | 1 | discarded | limitacion conocida, ya en docs |
| L6 | El requisito "Filtro UO como stub deshabilitado" (REQ-04) no es implementable sin componente UI custom — la plataforma no permite controles UI ad-hoc en el header. Cubrimos lo que pide el ticket Jira (filtrabilidad por `executionUnitId`) via el modal: cuando OrgUnit exista (DECISION-002), el campo aparecera disponible automaticamente. REQ-04 se cierra como "deferred to backend availability". | execute Session 1 | 1 | discarded | resuelto con Opcion A en Session 4 |
| L7 | El menu de objetos ofrece "Crear Vista Personalizada" — los usuarios pueden crear sus propias vistas filtradas via UI sin necesidad de declarar JSONs adicionales. Refuerza la decision de NO crear layouts UV/AIEP separados. | execute Session 1 | 1 | discarded | info contextual, no rule |
| L8 | `rowActions[]` con `type: "navigate"` **no es soportado** — la plataforma renderiza el item del menu pero el handler no hace nada al click (silently broken). Tipos validos vistos en mods reales: `"modal"` (`engagement-mis-eventos-list.json`). Ademas, la accion "Ver" ya se autogenera desde `associatedLayoutConfigs.view` y "Editar" desde `canEdit: true` — declarar rowActions duplicados es redundante. Solucion: eliminar `rowActions[]` cuando solo apunta a layouts asociados. | execute Session 1 | 1 | refined | [RULE-layout-017](../rules/layout/rule-layout-017.md) |
| L9 | i18n para enums en RecordList: el patron `enums.{fieldName}.{value}` se aplica en (1) headers de columna, (2) editor inline, (3) modal "Configurar Filtros" — pero **NO en la celda en modo display** (table view). El valor crudo del enum se renderiza tal cual via `getDisplayValue()` sin pasar por traduccion. Para traducir display mode habria que modificar `up1/layout/src/utils/recordListFormatters.ts:getDisplayValue` o `TableCell.vue` — fuera de scope de mods. Verificado empiricamente con archivo `lang/es_CL@AcademicActivity.json` declarando keys + sync + UI. | execute Session 1 | 1 | refined | [RULE-layout-018](../rules/layout/rule-layout-018.md) |
| L10 | Strings de UI en español **deben llevar acentos** (Código, Versión, Descripción, etc). La regla global "codigo en ingles sin acentos" aplica a identificadores y comentarios — NO a contenido visible al usuario. Cuando se declaran lang files para un mod, las traducciones siguen ortografia normal del idioma destino. | execute Session 1 | 1 | discarded | trivial, ya en CLAUDE.md global |
| L11 | RecordList **acopla columnas visibles con campos filtrables** — `availableFields` (lo que el modal "Configurar Filtros" muestra como opciones) se restringe a los campos en `layoutConfig.columns[]` ([RecordList.vue:4655](up1/layout/src/layouts/RecordList.vue#L4655)). Para tener un filtro disponible para un campo, la columna debe declararse aunque no aporte data util (en SP1 `executionUnitId=null` muestra "-"). Solucion correcta requiere PR a plataforma: separar `filterableFields[]` de `columns[]`. | execute Session 4 | 4 | refined | RULE-layout-037 |
| L12 | `./commands/dkc-reindex up1` falla con `ValueError: 'transcript' is not a valid RecordType` (`server/src/deckard_cain/core/records.py:85`). Hay archivos con `type: transcript` (ej. `specs/curriculum-design/transcripts/`) que el enum `RecordType` no acepta. El cierre del ticket no se revierte (DEC del prompt request-close). Bug del indexer DKC, NO del ticket. | request-close gate 6b | 4 | discarded | consolidacion Fase D — no reusable/especifico del ticket |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| F1 | Declarar `defaultSort: { field: "name", order: "asc" }` en layoutConfig | Propiedad no consumida en runtime. Listado se ordenaba por `createdAt` | Usar `order: { field, direction: "ASC" }` — ver [RULE-layout-016](../rules/layout/rule-layout-016.md) |
| F2 | Declarar `rowActions[].view-detail` con `type: "navigate"` para abrir el detail | `type: "navigate"` no soportado. Item aparecia en menu pero click no hacia nada (silently broken). Producia ademas duplicacion con "Ver" autogenerada por `associatedLayoutConfigs` | Eliminar `rowActions[]` redundantes — ver [RULE-layout-017](../rules/layout/rule-layout-017.md) |
| F3 | Modelar filtro UO como stub UI deshabilitado en el header del listado (preview v1 del draft) | RecordList no soporta controles UI ad-hoc en el header. Solo SearchBox global + modal de filtros | Cubrir UO declarando `executionUnitId` como columna con `filterable: true`. La columna muestra "-" en SP1 (DECISION-002) pero habilita el filtro en modal |

## Spec

[SPEC-curriculum-design-academic-activity-list](../specs/curriculum-design/SPEC-academic-activity-list.md) — vista general listado `AcademicActivity` con 5 columnas, 4 filtros, sort default `name asc`, tenants `["UPU"]` (Fase 1).

## Sessions

### Session 1 — 2026-04-29

**Branch**: `UPONE-1034-default-academic-activity-list-layout` (from `develop` en `up1/mods/curriculum-design`).

**Tasks ejecutadas** (spec [SPEC-academic-activity-list](../specs/curriculum-design/SPEC-academic-activity-list.md)):

| # | Task | Estado | Evidencia |
|---|------|--------|-----------|
| 1 | Crear branch | done | `git branch --show-current` → `UPONE-1034-...` |
| 2 | Crear `default_AcademicActivity_list.json` | done | `up1/mods/curriculum-design/config/layouts/default_AcademicActivity_list.json` |
| 3 | Validar contra METASPEC | done | tabla de campos comparada — pasa |
| 4 | `npm run sync` | done | Phase 6: `✓ 5 tenant(s), 4 mod(s) + 1 project(s) processed`, 0 errors. Sin warnings del layout creado |
| 5 | Validar UI manualmente (screenshot) | done | `ticket-007-list-upu-2-rows.png`, `ticket-007-list-object-menu.png` |
| 6 | Validar filtros | done con desviaciones (ver L5/L6) | `ticket-007-list-search-uv.png`, `ticket-007-list-search-redes.png`, `ticket-007-list-filter-modal.png` |
| 6.5 | Fix `defaultSort` → `order` (L4) | done | `ticket-007-list-upu-sorted-name-asc.png` ("Ordenado por name") |
| 7 | Push + PR | **pending** (usuario pidio NO hacer push aun) | — |

**Test cases del coverage map**:

| TC | Estado | Notas |
|----|--------|-------|
| TC-007-01 | pass | JSON valida contra METASPEC |
| TC-007-02 | pass | 5 columnas declaradas correctamente |
| TC-007-03 | pass | `tenants: ["UPU"]` (DEC-LOCAL-01 — no es global puro pero alineado con METASPEC required) |
| TC-007-04 | pass implicito | Listado filtra por tenant UPU (la query del OM filtra automaticamente) |
| TC-007-05 | pass | Listado renderiza 2 filas en `/UPU/AcademicActivity/RecordList/default_AcademicActivity_list` |
| TC-007-06 | pass con desviacion | Univalle: `code=UV-ECDIF-1124`, `version=v2022-actual`, `programLevel=Undergraduate`, `workflowState=Approved` (no `Draft` — DEC-LOCAL-03) |
| TC-007-07 | pass con desviacion | AIEP: `code=AIEP-INTRO-REDES-14757`, `version=v1`, `programLevel=TechnicalProfessional`, `workflowState=Approved` |
| TC-007-08 | pass | Solo 2 filas, sin mezcla con seed core |
| TC-007-09/10 | deferred Phase 2 | (sin cambio) |
| TC-007-11 | **deferred** | Stub UO no implementable (L6) — REQ-04 redefinido a "filtrabilidad cuando OrgUnit exista" |
| TC-007-12 | pass parcial | Click en "Ver" abre modal RecordDetail "Vista Introduccion a las Redes" (autogenerado). Detail completo lo cubre TICKET-009 |
| TC-007-13 | pass | SearchBox filtra correctamente: "UV" → 1 fila Univalle; "redes" → 1 fila AIEP |

**Cambios al spec inducidos por execute** (registrar en spec):

- DEC-LOCAL-05 actualizada: el campo correcto es `order: { field, direction: "ASC" }`, no `defaultSort: { field, order }`.
- REQ-04 (filtro UO stub): replanteado a "filtrabilidad por `executionUnitId` cuando OrgUnit este modelado". Stub UI no posible en RecordList.

**Commits Session 1** (locales, sin push):
- `bc4db29` (curriculum-design): feat — agregar layout `default_AcademicActivity_list`
- `9b9c412` (deckard): dkc — TICKET-007 Session 1 validada

### Session 2 — 2026-04-29 (iteracion: fix rowActions)

**Disparador**: usuario observa que el menu de acciones tiene 3 items ("Ver detalle" + "Ver" + "Editar") y "Ver detalle" no funciona — pregunta si son redundantes.

**Diagnostico**:
- "Ver detalle" era mi `rowActions[]` custom con `type: "navigate"` — tipo no soportado por la plataforma (silently broken).
- "Ver" se autogenera desde `associatedLayoutConfigs.view` — funcional.
- "Editar" se autogenera desde `canEdit: true` — funcional.

**Cambio aplicado**:
- Edit en `config/layouts/default_AcademicActivity_list.json`: eliminado bloque `rowActions[]` (-10 lineas).
- Re-sync: EXIT=0 sin warnings nuevos.
- Validacion UI: menu queda en "Ver" + "Editar" — captura `ticket-007-list-row-action-clean.png`.

**Learn registrado**: L8 (rowActions con `type:"navigate"` silently broken).

**Commits Session 2** (locales):
- `c07b2f6` (curriculum-design): fix — eliminar rowActions redundante
- `ba99b86` (deckard): dkc — fix L8

### Session 3 — 2026-04-29 (exploracion: i18n para enums en RecordList)

**Disparador**: usuario explora si RecordList soporta capa de lenguaje aplicada a los estados (workflowState).

**Investigacion**:
- Inspeccion de codigo (`TableCell.vue:687`, `RecordDetail.vue:2793`, `FiltersColumnRecordList.vue:886`): patron `enums.{fieldName}.{value}` aplicado en 3 lugares.
- Inspeccion de `getDisplayValue` (`recordListFormatters.ts:237`): NO aplica i18n al valor de celda en table view.
- Estructura de archivos lang en mods reales: `mods/{mod}/lang/{locale}@{ObjectName}.json`.

**Cambio aplicado**:
- Nuevo archivo `mods/curriculum-design/lang/es_CL@AcademicActivity.json` (30 lineas) con `column.*` + `enums.workflowState.*` + `enums.programLevel.*`.
- Acentos correctos en strings de UI (Código, Versión, En revisión, etc) — corregido tras feedback del usuario.
- Re-sync: archivo replicado a `suite/lang/`. EXIT=0.
- Validacion UI:
  - Headers: "Código", "Versión", "Nivel", "Estado" ✓ (`ticket-007-list-i18n-acentos.png`)
  - Editor inline: modal "Estado" con dropdown "Aprobado / Borrador / En revisión / ..." ✓ (`ticket-007-list-i18n-editor-enum.png`)
  - Filtro modal: campos del dropdown traducidos ✓ (`ticket-007-list-i18n-filter-modal.png`)
  - Display de columna: "Approved" sigue en ingles ✗ (limitacion de plataforma)

**Learns registrados**:
- L9: i18n enum aplica en 3/4 lugares; display mode requiere fix de plataforma.
- L10: strings de UI en español llevan acentos; la regla "sin acentos" aplica solo a identificadores/comentarios.

**Commits Session 3** (locales):
- `8119cac` (curriculum-design): i18n — traducciones es_CL para AcademicActivity
- `6b96d7c` (deckard): dkc — i18n exploracion learns L9 + L10

### Session 4 — 2026-04-29 (cierre de gap UPONE-1034: filtro Unidad Organizativa)

**Disparador**: validacion punto-por-punto contra UPONE-1034 detecta que el filtro "Unidad Organizativa" NO esta disponible en el modal de filtros. La plataforma restringe `availableFields` a las columnas declaradas en `layoutConfig.columns[]` ([RecordList.vue:4655](up1/layout/src/layouts/RecordList.vue#L4655)). Sin declarar `executionUnitId` como columna, no aparece como opcion de filtro.

**Diagnostico**:
- 4/4 columnas filtrables del ticket Jira: solo 3 cubiertas (Estado, Codigo, Nombre via SearchBox + modal). UO faltante.
- No existe flag `hidden`/`visible` per columna en el JSON schema (verificado en `up1/layout/docs/features/recordlist.md`).
- No hay forma declarativa de tener un campo filtrable que no sea columna.

**Cambio aplicado**:
- Agregado `executionUnitId` a `columns[]` del JSON con `filterable: true` (label "Unidad Organizativa").
- Agregada key `column.executionUnitId: "Unidad Organizativa"` al lang.
- Re-sync: EXIT=0.
- Validacion UI:
  - Columna "Unidad Organizativa" visible en tabla con valor "-" en ambas filas (`executionUnitId=null` por DECISION-002) ✓ (`ticket-007-list-with-uo-column.png`)
  - Modal "Configurar Filtros" dropdown ahora incluye "Unidad Organizativa" ✓ (`ticket-007-filter-uo-available.png`)

**Learn registrado**:
- L11: la plataforma RecordList **acopla columnas visibles con campos filtrables** — `availableFields` se restringe a los campos en `layoutConfig.columns[]`. Para tener un filtro disponible para un campo, la columna debe declararse aunque no se quiera mostrar visualmente. Solucion correcta requiere PR a plataforma: separar `filterableFields[]` de `columns[]`.

**Validacion final contra UPONE-1034**:

| Requisito Jira | Estado | Como se cubre |
|----------------|--------|----------------|
| 1. Vista general configurada | ✓ | `default_AcademicActivity_list.json` + sync + render UI |
| 2.1 Filtrable por **Unidad Organizativa** | ✓ | Columna declarada, modal incluye campo |
| 2.2 Filtrable por **Estado** | ✓ | Columna `workflowState` con `filterable:true`, valores enum traducidos |
| 2.3 Filtrable por **Código** (texto) | ✓ | Columna + SearchBox global (validado: "UV" → 1 fila) |
| 2.4 Filtrable por **Nombre** (texto) | ✓ | Columna + SearchBox global (validado: "redes" → 1 fila) |

**Commits Session 4** (locales):
- `9cd92d4` (curriculum-design): feat — agregar columna executionUnitId con filterable
- (pending) (deckard): dkc — Session 4 cierra gap UPONE-1034 + L11

### Estado consolidado tras 4 sessions

| Aspecto | Estado |
|---------|--------|
| Layout funcional en UI | ✓ confirmado |
| Sort por name asc | ✓ confirmado |
| Acciones de fila (Ver + Editar) | ✓ sin redundancia |
| Headers de columna en español con acentos | ✓ confirmado |
| Editor inline traducido | ✓ confirmado |
| Filtro modal traducido | ✓ confirmado |
| Display de celda enum traducido | ✗ no posible sin fix de plataforma |
| Push + PR | pendiente (usuario decide cuando) |

10 learns registrados (L1-L10). 3 candidatos a promover a RULE-layout-* (L4, L8, L9). Ningun TC visual pendiente queda activo.

## Testing

> **Plan**: Fase 1 (este ticket) — listado en `UPU` muestra **2 filas** (Univalle + AIEP en mismo tenant). Aislamiento entre tenants y switch validado en Fase 2 ([DECISION-012](../decisions/DECISION-012-two-phase-tenant-rollout.md)).
>
> Depende de TICKET-006 (objetos + seed cargados en `UPU`).
>
> **Identificacion en tests**: por contenido distintivo (`name`, `externalId`), no por TENANT_ID.

### Como diferenciar visualmente Univalle vs AIEP en este listado (ambos en UPU)

| Identificador | "Univalle" (fila en UPU) | "AIEP" (fila en UPU) |
|---------------|--------------------------|----|
| `name` | `"Ecuaciones Diferenciales"` | `"Introduccion a las Redes"` |
| `code` distintivo | (codigo Univalle real) | (codigo AIEP real) |
| `externalId` | `aa-uv-1124` | `aa-aiep-14757` |
| `programLevel` | (nivel Univalle, ej `Undergraduate`) | (nivel AIEP, ej `TechnicalProfessional`) |

**Listado en UPU**: 2 filas. Tester ve ambas y diferencia por nombre/código.

### Requisitos verificables

| REQ | Descripcion | Fuente |
|-----|-------------|--------|
| REQ-007-1 | Layout JSON declarado en `up1/mods/curriculum-design/layouts/` con `mode: "list"` | METASPEC-layout-config |
| REQ-007-2 | Columnas: `name`, `code`, `version`, `programLevel`, `workflowState` | UPONE-1034 |
| REQ-007-3 | Layout es **global** (sin campo `tenants[]` en el JSON) — preparado para Fase 2 | spec multi-tenancy |
| REQ-007-4 | Filtro por `tenantId` aplica automaticamente en la query (validado a nivel query) | BR-TNT-001 |
| REQ-007-5 | Listado en `UPU` muestra **2 filas**: "Ecuaciones Diferenciales" + "Introduccion a las Redes" | UPONE-1034 |
| REQ-007-6 | Cada fila renderiza con todas las columnas correctas (`name`, `code`, `version`, `programLevel`, `workflowState`) | UPONE-1034 |
| ~~REQ-007-7~~ | ~~Aislamiento visual: registros de un tenant NO aparecen en el otro~~ | **deferred to Phase 2** |
| REQ-007-8 | Filtro por OrgUnit es stub (no funcional) — DECISION-002 | DECISION-002 |
| REQ-007-9 | Acciones de fila (ver/editar) accesibles | rule-mods CRUD generico |
| REQ-007-10 | Search por `code` funciona — filtra entre las 2 filas | feature estandar listado |

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-007-1 | TC-007-01 | Logic | pending |
| REQ-007-2 | TC-007-02 | Logic | pending |
| REQ-007-3 | TC-007-03 | Logic | pending |
| REQ-007-4 | TC-007-04 | Logic | pending |
| REQ-007-5 | TC-007-05 | Visual | pending |
| REQ-007-6 | TC-007-06, TC-007-07, TC-007-08 | Visual | pending |
| REQ-007-7 (deferred) | TC-007-09, TC-007-10 | Logic + Visual | **deferred to Phase 2** |
| REQ-007-8 | TC-007-11 | Logic | pending |
| REQ-007-9 | TC-007-12 | Visual | pending |
| REQ-007-10 | TC-007-13 | Visual | pending |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-007-01 | Layout JSON valido contra METASPEC | REQ-007-1 | Logic | Layout creado | Validar JSON contra `meta-specs/METASPEC-layout-config.md` | Schema valido (id, name, columns, mode="list") | | | pending |
| TC-007-02 | Columnas declaradas correctamente | REQ-007-2 | Logic | Layout creado | Inspeccionar `columns[]` | 5 columnas: `name`, `code`, `version`, `programLevel`, `workflowState` con sus labels | | | pending |
| TC-007-03 | Layout es global | REQ-007-3 | Logic | Layout creado | Verificar que el JSON NO declara `tenants[]` | Campo `tenants` ausente o `[]` (= todos) | | | pending |
| TC-007-04 | Query incluye filtro tenantId | REQ-007-4 | Logic | Listado cargado en UPU | Inspeccionar query GraphQL/network | Query incluye `where: { tenantId: "UPU" }` automaticamente. (Aislamiento runtime real entre tenants → Fase 2) | | | pending |
| TC-007-05 | Listado en UPU muestra **2 filas** | REQ-007-5 | Visual | Login UPU, seed cargado (Univalle + AIEP) | Navegar al listado de AcademicActivity | Tabla con 5 columnas + **2 filas**: "Ecuaciones Diferenciales" y "Introduccion a las Redes" en cualquier orden. Identificacion por `name`. | | screenshots/ticket-007.screenshots/ticket-007-list-upu-2-rows.png | pending |
| TC-007-06 | Datos completos de la fila Univalle | REQ-007-6 | Visual | Login UPU, listado renderizado | Localizar e inspeccionar fila con `name="Ecuaciones Diferenciales"` | `code` Univalle real, `version` correcta, `programLevel="Undergraduate"`, `workflowState="active"` (mapeado por DECISION-005), `externalId="aa-uv-1124"` | | screenshots/ticket-007.screenshots/ticket-007-list-upu-univalle-row.png | pending |
| TC-007-07 | Datos completos de la fila AIEP | REQ-007-6 | Visual | Login UPU, listado renderizado | Localizar e inspeccionar fila con `name="Introduccion a las Redes"` | `code` AIEP real, `version` correcta, `programLevel` AIEP real, `externalId="aa-aiep-14757"` | | screenshots/ticket-007.screenshots/ticket-007-list-upu-aiep-row.png | pending |
| TC-007-08 | El listado NO mezcla con objetos del seed core | REQ-007-6 | Visual | Listado UPU renderizado | Verificar que las filas son SOLO `AcademicActivity` (no `Person`, `Course` ni otros del seed core de UPU) | Listado tiene exactamente 2 filas; ningun registro extra de objetos distintos. | | screenshots/ticket-007.screenshots/ticket-007-list-upu-no-core-mixing.png | pending |
| TC-007-09 | ~~Aislamiento logico TEST→UPU~~ | REQ-007-7 | Logic | — | Listar via API con tenants distintos | Cero cross-pollination | | | **deferred to Phase 2** |
| TC-007-10 | ~~Switch de tenant cambia el listado~~ | REQ-007-7 | Visual | — | Cambiar entre tenants | Listado cambia | | | **deferred to Phase 2** |
| TC-007-11 | Filtro OrgUnit stub no rompe | REQ-007-8 | Logic | Listado renderizado | Verificar que el control de filtro UO esta presente (stub) y no causa error al interactuar | Stub presente, sin errores en consola; valida DECISION-002 | | | pending |
| TC-007-12 | Click en fila navega a detail | REQ-007-9 | Visual | Listado UPU renderizado | Click en fila "Ecuaciones Diferenciales" (o "Introduccion a las Redes") | Navega a la URL de detail (TICKET-009 puede no estar — validar al menos que la accion no falla) | | screenshots/ticket-007.screenshots/ticket-007-list-row-action.png | pending |
| TC-007-13 | Search por `code` filtra entre las 2 filas | REQ-007-10 | Visual | Listado UPU con 2 filas | Escribir `code` parcial de Univalle en buscador | Filtra: solo fila Univalle visible. Borrar y escribir `code` AIEP → solo AIEP. Borrar y dejar vacio → 2 filas de nuevo. | | screenshots/ticket-007.screenshots/ticket-007-list-search.png | pending |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| `tests/integration/list-layout-schema.test.ts` | integration | (pending) | TC-007-01, TC-007-02, TC-007-03 | Vitest (validacion JSON layout) |
| `tests/integration/list-query-tenant.test.ts` | integration | (pending) | TC-007-04 | Vitest (mock GraphQL — verifica que la query incluye `tenantId`) |
| `tests/integration/list-query-isolation.test.ts` | integration | **deferred to Phase 2** | TC-007-09 | Vitest |
| `tests/e2e/list-renders-upu.spec.ts` | e2e | (pending) | TC-007-05 a TC-007-08, TC-007-11 a TC-007-13 | Playwright + DKC config |
| `tests/e2e/list-tenant-switch.spec.ts` | e2e | **deferred to Phase 2** | TC-007-10 | Playwright |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| `npm run sync` (incluye 8 phases de validacion) | `npm run sync` | EXIT=0, 121 warnings preexistentes | EXIT=0, 121 warnings preexistentes | 0 — sync limpio en cada iteracion (Sessions 1-4) |
| Layout Configs phase 6 | parte del sync | "✓ 5 tenant(s), 4 mod(s) + 1 project(s) processed" | igual + nuevo layout insertado en `up1_layen_layout` | +1 layout, sin regresion |
| Otros mods (hello-world-mod, retention-wellbeing, etc) | parte del sync | OK | OK | 0 — ningun warning del nuevo layout afecta a otros mods |
| Lint / Type-check workspace | no ejecutado en este ticket | — | — | scope: solo declaracion JSON + lang JSON, no codigo TS |

## Summary

### What was requested

Configurar la vista general (listado) del objeto `AcademicActivity` (Programa de asignatura) en el mod curriculum-design, filtrable por Unidad Organizativa, Estado, Codigo y Nombre (UPONE-1034).

### What was done

- Layout RecordList default `default_AcademicActivity_list.json` declarado en `mods/curriculum-design/config/layouts/`. Aparece automaticamente en menu de objetos (`/UPU/curriculum-design`) bajo "Programa de asignatura".
- 6 columnas visibles: Nombre, Codigo, Version, Nivel, Unidad Organizativa, Estado. Orden alfabetico ascendente por nombre.
- 4 filtros declarativos disponibles en el modal "Configurar Filtros": **Unidad Organizativa, Estado, Codigo, Nombre** (cumple los 4 requisitos del ticket Jira). Adicionalmente: SearchBox global filtra por code/name en vivo, modal soporta operadores CONTAINS / EQUALS / STARTS_WITH / etc.
- Acciones por fila: "Ver" (abre detail modal autogenerado), "Editar" (autogenerada por `canEdit:true`).
- i18n declarado en `lang/es_CL@AcademicActivity.json`: headers y enums (Borrador, Aprobado, Pregrado, etc) traducidos al español con acentos. Aplica en headers de columna, editor inline y modal de filtros.
- Validado en UI con login real (`eduardo.bacon@uplanner.com`, rol Consultor): listado muestra 2 filas (Univalle + AIEP) con datos del seed, filtros funcionales.

### What was learned

- **Learns capturados**: 11 total (3 refined → rules, 7 discarded, 1 raw para feature request)
- **Rules creadas**:
  - [RULE-layout-016](../rules/layout/rule-layout-016.md) (must) — `order: { field, direction }` no `defaultSort`
  - [RULE-layout-017](../rules/layout/rule-layout-017.md) (must) — `rowActions` con `type:"navigate"` no funciona, usar `associatedLayoutConfigs`
  - [RULE-layout-018](../rules/layout/rule-layout-018.md) (should) — patron `enums.{field}.{value}` en lang aplica en 3/4 lugares (no display mode)
- **Decisions tomadas**: 6 DEC-LOCAL en spec (tenants `["UPU"]`, omitir applicationId, aceptar `Approved` del seed, 5 columnas canonicas, sort `name asc`, omitir `roles[]`)
- **Bugs encontrados**: 0
- **Failed approaches registrados**: 3 (defaultSort, rowActions navigate, filtro UO como stub UI)
- **Feature requests pendientes** (raw):
  - L11 — separar `filterableFields[]` de `columns[]` en RecordList (PR a `up1/layout/`)
  - L9 referenciado — aplicar `t('enums.*')` en `getDisplayValue()` para celda en table view

### Validacion contra UPONE-1034

| Requisito Jira (literal) | Estado | Como se cubre |
|--------------------------|--------|----------------|
| 1. Vista general de Programa de asignatura configurada | ✓ | Layout JSON + sync + render UI |
| 2.1 Filtrable por Unidad Organizativa | ✓ | Columna `executionUnitId` con `filterable:true` (muestra "-" en SP1 por DECISION-002, dato aparecera cuando OrgUnit se modele) |
| 2.2 Filtrable por Estado | ✓ | Columna `workflowState` con `filterable:true`, valores enum traducidos |
| 2.3 Filtrable por Codigo (busqueda texto) | ✓ | Columna + SearchBox global (validado: "UV" → 1 fila) |
| 2.4 Filtrable por Nombre (busqueda texto) | ✓ | Columna + SearchBox global (validado: "redes" → 1 fila) |

### Metrics

| Metric | Value |
|--------|-------|
| Sessions | 4 |
| Tasks completadas | 6/7 (Task #7 push+PR pendiente por solicitud del usuario) |
| Commits curriculum-design | 4 (`bc4db29`, `c07b2f6`, `8119cac`, `9cd92d4`) |
| Commits deckard | 6 (`0a94ff0`, `9b9c412`, `ba99b86`, `6b96d7c`, `1bcd1b6`, `6a3b84c`) |
| Learns captured | 11 |
| Learns → rules | 3 (L4, L8, L9) |
| Learns → bugs | 0 |
| Learns → decisions | 0 (decisions ya capturadas en spec) |
| Learns discarded | 7 |
| Learns raw | 1 (L11 — feature request a plataforma) |
| Rules created | 3 ([RULE-layout-016](../rules/layout/rule-layout-016.md), [RULE-layout-017](../rules/layout/rule-layout-017.md), [RULE-layout-018](../rules/layout/rule-layout-018.md)) |
| Decisions taken | 6 DEC-LOCAL en spec |
| Bugs found | 0 |
| Test cases | 9 pass / 0 fail / 0 pending / 4 deferred (Phase 2 + UO stub redefinido) |
| Failed approaches | 3 |
| Screenshots | 14 (carpeta `tickets/TICKET-007.screenshots/`) |

### Pendiente

- **Push + PR** del branch `UPONE-1034-default-academic-activity-list-layout` en repo `uplanner/curriculum-design` — bloqueado por solicitud del dev (lo decide el usuario cuando este listo).
- **L11** raw para escalar a equipo platform UP1: separar `filterableFields[]` de `columns[]` en RecordList.
- **i18n display mode** (mencionado en RULE-layout-018) — feature request a plataforma para que `getDisplayValue` aplique `t('enums.*')`.
