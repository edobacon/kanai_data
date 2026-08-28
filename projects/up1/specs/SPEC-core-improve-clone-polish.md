---
id: SPEC-core-improve-clone-polish
project: up1
ticket: TICKET-051
status: done
---

# Polish de plataforma de clonación/versionamiento (B6 + B5 + B2)

# Polish de plataforma de clonación/versionamiento (B6 + B5 + B2)

## Executive summary — lo que estas aprobando

**Que se quiere**: pulir tres asperezas de plataforma que dejó HU-10 (clonación/versionamiento), sin cambiar el comportamiento funcional de fondo. El usuario verá títulos de modal legibles para objetos Record-Type (B6) y un toast que indica qué versión creó (B2); el equipo de plataforma gana un enforcement de unicidad config-driven (B5) que no obliga a tocar el resolver por cada objeto nuevo, más el unit test que faltaba.

**Decisiones criticas**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | B5 config-driven vía **opción (a)**: sync persiste `uniqueScopedBy` a `core_FieldDefinition.properties`; el resolver lo lee (DEC-LOCAL-01) | El resolver ya consulta esa tabla y lee `properties` ahí mismo — cero mecanismo nuevo y fuente única en DB; alternativa (b) metía I/O de filesystem en el hot path |
| 2 | B6 humaniza el `objectName` en el choke point del modal en vez de fetchear el label i18n del RT | Cubre todos los call sites sin latencia async; trade-off: muestra el discriminador técnico, no el label de BD |

**Riesgos principales y como los mitigamos**:

- **B5 generaliza y rompe el enforcement actual de CurricularSection** → unit test que fija el comportamiento exacto (name/code, scope [ownerId, recordType]) como regression + correr suite vitest existente.
- **El patch del sync afecta todos los tenants** → cambio aditivo y merge-based sobre `properties`; verificar con un sync dry/observado que solo agrega la key.
- **B6 toca un util usado por RecordList** → extraer preservando la lógica existente + las ramas previas (up1/ext); agregar solo la rama `rt__`.

**Que NO se hace en este ticket**:

- Generalizar el enforcement de unicidad a `updateInstance` (hoy solo corre en create) — out-of-scope, se anota como gap.
- Mostrar el label i18n exacto del RT en el modal (B6) — el fallback humanizado es suficiente; el label de BD es mejora futura.
- Mostrar "desde versión N-1" con una query extra al registro fuente — se infiere `N-1 = version - 1` (garantía del helper).

**Tamano estimado**: 2 sessions. S1 (layout, B6+B2, ~1.5h, bajo riesgo). S2 (object-manager, B5 + test, ~2h, la más riesgosa por tocar resolver + sync).

**Como vas a saber que funciona**:

- Abro "Crear registro" sobre una Modalidad → el modal NO dice `rt__Modality__curricularsection`.
- Creo una versión → el toast dice "Versión 2 creada desde versión 1".
- Corro la suite vitest de object-manager → el nuevo test de unicidad scoped pasa y nada existente se rompe.

---

## Purpose

Saldar deuda técnica de la plataforma core de clonación (épica UPONE-1206) acumulada en el cierre de HU-10: legibilidad de modales RT (layout), generalización config-driven del enforcement de unicidad scoped + su test (object-manager), y parametrización del toast de versión (layout). Cambios incrementales sobre código funcional, con regression obligatoria.

## Requirements

### REQ-IMPROVE-B6: Título legible para modales de objetos Record-Type

> **Que cambia**: los modales que abren sobre una proyección RT (`rt__<Mod>__<base>`) muestran un título humanizado en vez del nombre técnico crudo.
> **Por que**: hoy "Crear registro" sobre una Modalidad titula `Crear Nuevo rt__Modality__curricularsection`.

El sistema MUST mostrar un título de modal legible cuando el `objectName` es una proyección RT y no se pasó un `objectLabel` explícito. El fallback MUST humanizar `rt__<Mod>__<base>` a un label legible (segmento del modificador) en el punto único donde el modal construye su título.

<details><summary>Scenarios de validacion</summary>

- **GIVEN** un layout de Modality (RT) **WHEN** el usuario abre "Crear registro" (path no-clone) **THEN** el título NO contiene `rt__` ni el nombre técnico crudo.
- **GIVEN** un call site que pasa `objectLabel` explícito **WHEN** abre el modal **THEN** se respeta ese label (no se humaniza).
- **GIVEN** un `objectName` no-RT (ej. `up1__foo`, camelCase) **WHEN** abre el modal **THEN** la humanización previa se preserva (sin regresión).
</details>

#### Acceptance
- [ ] Título legible verificado en modal create RT (manual/storybook).
- [ ] Util `humanizeObjectName` compartido, usado por ModalStackManager y RecordList (sin duplicar lógica).

### REQ-IMPROVE-B5: Enforcement de unicidad scoped config-driven

> **Que cambia**: la regla de unicidad scoped deja de estar hardcodeada a CurricularSection; se aplica a cualquier campo que declare `uniqueScopedBy`.
> **Por que**: el próximo objeto que necesite unicidad scoped no debería requerir tocar el resolver.

El sistema MUST aplicar el enforcement de unicidad scoped leyendo `uniqueScopedBy` de la configuración de cada campo (persistida en `core_FieldDefinition.properties`), no de un literal de objectName. El pipeline de sync MUST persistir `uniqueScopedBy` a `core_FieldDefinition.properties`. El resolver MUST construir `scopeWhere` a partir de los campos declarados en `uniqueScopedBy` y rechazar la creación si existe un registro con el mismo valor dentro del scope.

<details><summary>Scenarios de validacion</summary>

- **GIVEN** CurricularSection con `name.uniqueScopedBy = [ownerId, recordType]` **WHEN** se crea un name duplicado en el mismo scope **THEN** lanza `Unique constraint failed on the fields: (name)`.
- **GIVEN** el RT con `code.uniqueScopedBy` **WHEN** se crea un code duplicado en scope **THEN** lanza `Unique constraint failed on the fields: (code)`.
- **GIVEN** un objeto SIN ningún campo con `uniqueScopedBy` **WHEN** se crea **THEN** no se aplica enforcement (no lanza).
</details>

#### Acceptance
- [ ] El `if (baseModelName === 'CurricularSection')` literal eliminado; lógica config-driven.
- [ ] `npm run sync` persiste `uniqueScopedBy` a `core_FieldDefinition.properties` (verificado).

### REQ-IMPROVE-B5-TEST: Unit test del enforcement de unicidad scoped

> **Que cambia**: se agrega cobertura unitaria de la lógica `scopeWhere` + `findFirst`.
> **Por que**: el reviewer de 044 advirtió que el enforcement no tenía test.

El sistema MUST tener un unit test (Prisma mockeado) que cubra: (1) duplicado de name en scope lanza, (2) duplicado de code RT en scope lanza, (3) sin duplicado procede, (4) objeto sin `uniqueScopedBy` no aplica enforcement, y (5) el `where` de `findFirst` incluye los campos del scope.

#### Acceptance
- [ ] Test en `tests/unit/resolvers/instance.resolver.test.js` (o archivo dedicado), suite verde.

### REQ-IMPROVE-B2: Toast de versión parametrizado

> **Que cambia**: al crear una versión, el toast indica el número ("Versión N creada desde versión N-1").
> **Por que**: DEC-LOCAL-03 de 044; el genérico "Nueva versión creada" no informa.

El sistema MUST mostrar en el toast de éxito de creación de versión el número de versión creado y el origen. El front MUST obtener `version` del resultado de `createInstance` (pidiendo `data` en el selection set, sin cambio de backend) e interpolarlo en la key i18n `recordList.actions.versionCreated` (es/en/pt). Si `version` es null, MUST caer al mensaje genérico actual.

<details><summary>Scenarios de validacion</summary>

- **GIVEN** un create con `asNewVersion: true` que produce version 2 **WHEN** termina **THEN** el toast dice "Versión 2 creada desde versión 1".
- **GIVEN** un create normal (sin `asNewVersion`) **THEN** el comportamiento del toast no cambia.
- **GIVEN** `data.version` null **THEN** toast genérico (fallback).
</details>

#### Acceptance
- [ ] Selection set pide `data`; `version` leído en `useCreateRowAction`.
- [ ] 3 idiomas (es/en/pt) actualizados con interpolación.

### REQ-PRESERVE-01: Comportamiento existente intacto

> **Que cambia**: nada de lo existente — este REQ fija la regression que ningún cambio debe romper.
> **Por que**: B5 generaliza lógica viva y B6 toca un util compartido; sin regression explícita, una mejora podría romper otra (DET-7).

El sistema MUST preservar: el enforcement de unicidad de CurricularSection idéntico tras generalizar; la humanización previa de nombres no-RT en el modal; el toast de create normal; y todos los tests existentes de object-manager y layout en verde.

<details><summary>Scenarios de regression (DET-7)</summary>

- **GIVEN** la suite vitest de object-manager **WHEN** corre tras B5 **THEN** pasa igual o mejor (más tests).
- **GIVEN** modales no-RT **WHEN** abren **THEN** títulos sin cambio.
</details>

## Artifacts

### Modified

| Artefacto | Antes | Despues | Por que |
|-----------|-------|---------|---------|
| `layout/src/components/.../ModalStackManager.vue` | `objectLabel \|\| objectName` | `objectLabel \|\| humanizeObjectName(objectName)` | B6 — choke point del título |
| `layout/src/utils/humanizeObjectName.ts` (nuevo) | lógica local en RecordList sin rama `rt__` | util compartido con rama `rt__<Mod>__<base>` | B6 — DRY + cobertura RT |
| `layout/src/layouts/RecordList.vue` | `humanizeObjectName` local | importa el util compartido | B6 — single source |
| `object-manager/src/services/codegen/generatePrismaSchema.js` | no persiste `uniqueScopedBy` | persiste `properties.uniqueScopedBy` (base + RT) | B5 — config-driven |
| `object-manager/src/graphql/resolvers/instance.resolver.js` | `if (=== 'CurricularSection')` + name/code literal | lee `uniqueScopedBy` de field defs, construye scope dinámico | B5 |
| `object-manager/tests/unit/resolvers/instance.resolver.test.js` | sin test de unicidad scoped | +5 casos | B5-TEST |
| `layout/src/composables/useCreateRowAction.ts` | selection set `{ id }` | `{ id, data }` + lee `version` + i18n param | B2 |
| `layout/lang/{es,en,pt}_CL@RecordList.json` | `versionCreated` genérico | con `{version}`/`{sourceVersion}` | B2 |

## Tasks

### Session 1 — B6 + B2 (layout) [tipo: auto] [tier: T1]

#### Task contract — S1.T1 (B6)
- source_ref: REQ-IMPROVE-B6
- agent: developer
- files: `layout/src/utils/humanizeObjectName.ts` (nuevo), `ModalStackManager.vue`, `RecordList.vue`
- expected_output: título legible en modales RT; util compartido
- validation: storybook/manual del modal create RT + grep de consumers de la función local
- rollback: git revert del commit
- rules: [DET-5, DET-8, DET-16, RULE-dev-004]

#### Task contract — S1.T2 (B2)
- source_ref: REQ-IMPROVE-B2
- agent: developer
- files: `useCreateRowAction.ts`, `lang/{es,en,pt}_CL@RecordList.json`
- expected_output: toast "Versión N creada desde versión N-1"
- validation: leer `version` del response; revisar 3 idiomas; manual
- rollback: git revert
- rules: [DET-5, DET-8, RULE-dev-004]

#### S1.GATE
- Persistir tasks al ticket + quality review (DET-23, reviewer aislado DET-30) + commits granulares (DET-27) en `UPONE-1206`.

### Session 2 — B5 (object-manager + sync) [tipo: auto] [tier: T2]

#### Task contract — S2.T1 (B5 sync persiste uniqueScopedBy)
- source_ref: REQ-IMPROVE-B5
- agent: developer
- files: `object-manager/src/services/codegen/generatePrismaSchema.js`
- expected_output: `npm run sync` escribe `properties.uniqueScopedBy` en `core_FieldDefinition` (base + RT)
- validation: correr sync; verificar la columna en DB / log de sync
- rollback: git revert
- rules: [DET-5, DET-8, DET-16, RULE-dev-004]

#### Task contract — S2.T2 (B5 resolver config-driven)
- source_ref: REQ-IMPROVE-B5
- agent: developer
- depends_on: S2.T1
- files: `object-manager/src/graphql/resolvers/instance.resolver.js`
- expected_output: enforcement lee `uniqueScopedBy` de field defs; sin literal CurricularSection
- validation: unit test (S2.T3) + paridad de comportamiento con el hardcode
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, RULE-dev-004]

#### Task contract — S2.T3 (B5 unit test)
- source_ref: REQ-IMPROVE-B5-TEST
- agent: developer
- depends_on: S2.T2
- files: `object-manager/tests/unit/resolvers/instance.resolver.test.js`
- expected_output: 5 casos (name dup, code dup, sin dup, sin uniqueScopedBy, scope en where)
- validation: vitest verde; suite completa sin regresión (REQ-PRESERVE-01)
- rollback: git revert
- rules: [DET-4, DET-7, DET-13, DET-14]

#### S2.GATE
- Persistir + quality review (reviewer aislado) + commits granulares en `UPONE-1206` + verificar suite vitest.

## Acceptance checkpoints

- [x] AC-1 (B6): título legible en modales RT vía `humanizeObjectName` (rama `rt__`) — `humanizeObjectName.spec.ts` 8/8. Commit a3f51d8.
- [x] AC-2 (B5): `if (=== 'CurricularSection')` eliminado; enforcement config-driven lee `uniqueScopedBy` de `core_FieldDefinition.properties`; sync lo persiste (`npm run sync` 3/3). Valor en DB por-tenant runtime-verifiable (sin DB en este entorno). Commit b800a1c.
- [x] AC-3 (B5-TEST): 8 casos de unicidad scoped en vitest (`scoped-uniqueness.test.js`), verde. Commit 8431443/2acfa1c.
- [x] AC-4 (B2): toast parametrizado "Versión N creada desde versión N-1" + fallback genérico; 3 idiomas. Commit be2dadf/c99f268.
- [x] AC-5 (REGRESSION): **520/520** resolvers + 23/23 layout sin regresión; enforcement de CurricularSection idéntico (paridad verificada por reviewer).

## Constraints

- RULE-dev-004 / core_work_policy: trabajo core en rama `UPONE-1206`; merge a develop gated por team up1; cierre DKC NO mergea.
- DEC-LOCAL-01 (ticket): B5 vía opción (a) sync-persist.

## Dependencies

- TICKET-044 (cerrado) — origen de B2/B5/B6.
- `npm run sync` (up1 root) para B5.

## Risks and mitigations

- Generalización B5 cambia comportamiento → unit test de paridad + suite vitest.
- Patch de sync transversal a tenants → cambio aditivo merge-based.

## Open questions

- [ ] ¿Extender enforcement a `updateInstance`? — out-of-scope ahora; gap anotado.
