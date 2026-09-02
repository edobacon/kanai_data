---
id: SPEC-JOR-155-msw-uuid-fixtures
project: jormat-evolution
ticket: JOR-155
status: done
---

# Alinear fixtures MSW del front (ventas/compras) al itemId uuid

# Alinear fixtures MSW del front (ventas/compras) al itemId uuid

## Executive summary - lo que estas aprobando

**Que se quiere**: cerrar la deuda de consistencia de datos de test que dejo JOR-149 (backlog B2): los MSW handlers de ventas y compras, y las stories que los consumen, todavia emiten `itemId` en el molde serial viejo. El backend ya expone `itemId` como uuid; los fixtures del front de prueba tienen que reflejar ese contrato para que las stories/tests no validen contra un contrato desactualizado.

**Sin decisiones criticas**, implementacion straightforward: migrar los `itemId` de 2 archivos de handlers y 3 stories a uuid, reusando el uuid exacto del backend donde el contenido del fixture coincide 1:1 y acunando uno del mismo prefijo/forma donde diverge.

**Riesgos principales y como los mitigamos**:

- **Un fixture reusa mal un uuid del backend y rompe la trazabilidad del serial legacy** -> los uuid acunados siguen el mismo patron (`<prefijo>-0000-4000-8000-<serial legacy pad 12>`) que usa el backend, y los tests de conformidad anclan el valor exacto esperado por fixture.
- **Un test existente que hardcodea un `itemId` serial queda roto en silencio** -> regression completa (2072 unit + 346 stories) corre en el gate antes de cerrar la session.

**Que NO se hace en este ticket** (limites explicitos del scope):

- No se tocan `LineItemsTable.stories.tsx` (`ITM-001..040`) ni `ItemDetailModal.stories.tsx` (`25435`) en `shared/items`: mismo sintoma, fuera de alcance de este ticket (backlog).
- No se tocan los tests unitarios de componentes/schemas que usan `itemId` numerico (`TransactionBuilder.*.test`, `DocumentoDetalleView.test`, `lib/schemas/{ventas,purchases}.test`): el Zod del front tipa `itemId` como `z.string()` sin constraint uuid, asi que no rompen contrato (backlog).
- No se resuelve la divergencia de contenido entre los fixtures de compras del front y el backend (front 1088/2201 sin correlato; backend 1043/2050/9000): deuda de datos de test preexistente, distinta del formato (backlog).
- No se toca ningun archivo de produccion: el `item.id` real sigue viniendo del catalogo real, no de estos fixtures.

**Tamano estimado**: 1 session (T2), ejecutable en una sola pasada dado que las 4 tasks tocan archivos disjuntos.

**Como vas a saber que funciona**:

- Un grep sobre los archivos en alcance no encuentra ningun `itemId` numerico.
- Los tests de conformidad nuevos fallan si alguien vuelve a introducir un `itemId` serial en los handlers.
- La suite completa (2072 unit + 346 stories) sigue verde y el typecheck no reporta errores.

---

## Purpose

Migrar el `itemId` de los MSW handlers de ventas y compras y de las stories que los consumen al formato uuid que expone el backend desde JOR-149, cerrando el backlog B2 de [[SPEC-JOR-149-identidad-serial-uuid-inventario]]. Alcance: `test/msw/handlers/{ventas,purchases}.ts` y las stories de ventas listadas abajo. Cambio test-only, cero produccion.

## Requirements

### REQ-1: `handlers/ventas.ts` emite `itemId` uuid

> **Que cambia**: los 4 `itemId` numericos del handler MSW de ventas pasan a uuid con prefijo `5a1e0000-`.
> **Por que**: el backend ya emite `itemId` uuid desde JOR-149; el fixture desalineado hace que las stories/tests de ventas validen contra un contrato que ya no existe.

El sistema MUST migrar los 4 `itemId` de `handlers/ventas.ts` a uuid, reusando el uuid exacto que emite `sales.service` (`STUB_LINEAS`) del backend.

**Actor**: system · **Layers**: frontend (test)

<details><summary>Scenarios de validacion</summary>

#### Scenario: itemId con forma uuid
- **GIVEN** el handler de ventas migrado, **WHEN** se inspecciona cada `itemId` emitido, **THEN** tiene forma uuid con prefijo `5a1e0000-` y coincide con el uuid del backend.

</details>

#### Acceptance
Ningun `itemId` del handler de ventas matchea `/^\d+$/`.

### REQ-2: `handlers/purchases.ts` emite `itemId` uuid

> **Que cambia**: los `itemId` del handler MSW de compras pasan a uuid con prefijo `b0c00000-`.
> **Por que**: mismo motivo que REQ-1, del lado de compras.

El sistema MUST migrar los `itemId` de `handlers/purchases.ts` a uuid: reusando el uuid exacto del backend donde el contenido del fixture coincide (caso `1042`), y acunando un uuid del mismo prefijo y forma donde el contenido del front diverge del backend (casos `1088`/`2201`, sin correlato en el backend).

**Actor**: system · **Layers**: frontend (test)

<details><summary>Scenarios de validacion</summary>

#### Scenario: reuso donde coincide
- **GIVEN** el fixture `1042` (coincide con el backend), **WHEN** se migra, **THEN** usa el uuid exacto que emite el backend para ese item.

#### Scenario: acunado donde diverge
- **GIVEN** los fixtures `1088`/`2201` (sin correlato en el backend), **WHEN** se migran, **THEN** reciben un uuid nuevo con prefijo `b0c00000-` y la misma forma que el resto del dominio.

</details>

#### Acceptance
Ningun `itemId` del handler de compras matchea `/^\d+$/`.

### REQ-3: stories de ventas alineadas al itemId uuid

> **Que cambia**: las stories de `DocumentoDetalleView`, `CrearFacturaFromOrigen` y `TransactionBuilder` consumen los `itemId` uuid nuevos de REQ-1.
> **Por que**: estas stories renderizan directamente los fixtures de ventas; si no se actualizan, la story queda inconsistente con el handler del que depende.

El sistema MUST actualizar las stories de ventas que referencian `itemId` para usar los valores uuid migrados en REQ-1.

**Actor**: system · **Layers**: frontend (test)

<details><summary>Scenarios de validacion</summary>

#### Scenario: story renderiza sin discrepancia
- **GIVEN** las 3 stories migradas, **WHEN** corren en Storybook/test runner, **THEN** los `itemId` que muestran coinciden con los del handler de ventas migrado.

</details>

#### Acceptance
Las 346 stories (incluidas las 3 migradas) pasan en verde.

### REQ-4: tests de conformidad nuevos

> **Que cambia**: se agregan `ventas.test.ts` y `purchases.test.ts` que verifican que cada `itemId` de los handlers matchea un uuid anclado.
> **Por que**: sin un test que muerda, un futuro fixture puede reintroducir un `itemId` numerico sin que nada lo detecte.

El sistema MUST agregar tests de conformidad que verifiquen, por cada `itemId` de `handlers/ventas.ts` y `handlers/purchases.ts`, que matchea un uuid anclado especifico y que NO matchea `/^\d+$/`.

**Actor**: system · **Layers**: frontend (test)

<details><summary>Scenarios de validacion</summary>

#### Scenario: el test muerde
- **GIVEN** los tests de conformidad, **WHEN** se revierte a proposito un `itemId` a numerico, **THEN** el test correspondiente falla.

</details>

#### Acceptance
18 tests de conformidad nuevos, todos en verde.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Testing | Regression completa no baja | unit + stories | 2072 unit / 346 stories, ambos en verde |
| Testing | Conformidad nueva | conformance tests | 18, todos en verde |
| Calidad | Typecheck limpio | `tsc` | exit 0 |

## Tasks

### Session 1 - alinear fixtures/stories MSW al itemId uuid [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Migrar los 4 `itemId` de `handlers/ventas.ts` a uuid prefijo `5a1e0000-`, reusando el uuid exacto de `sales.service` `STUB_LINEAS` | REQ-1 | developer | - | test/msw/handlers/ventas.ts | unit + stories de ventas verdes; grep confirma 0 `itemId` numerico en el archivo | git revert | DET-7, RULE-testing-facade-e2e-004 | done | 1 |
| S1.T2 | Migrar `itemId` de `handlers/purchases.ts` a uuid prefijo `b0c00000-`: reusar el uuid del backend donde coincide (1042), acunar donde diverge (1088/2201) | REQ-2 | developer | - | test/msw/handlers/purchases.ts | unit de compras verdes; grep confirma 0 `itemId` numerico en el archivo | git revert | DET-7, RULE-testing-facade-e2e-004 | done | 1 |
| S1.T3 | Alinear stories de ventas (`DocumentoDetalleView`, `CrearFacturaFromOrigen`, `TransactionBuilder`) al `itemId` uuid migrado en S1.T1 | REQ-3 | developer | S1.T1 | stories de DocumentoDetalleView, CrearFacturaFromOrigen, TransactionBuilder (ventas) | 346 stories en verde | git revert | DET-7 | done | 1 |
| S1.T4 | Crear `ventas.test.ts`/`purchases.test.ts`: cada `itemId` matchea un uuid anclado y NO `/^\d+$/` | REQ-4 | developer | S1.T1, S1.T2 | test/msw/handlers/ventas.test.ts, test/msw/handlers/purchases.test.ts | 18 tests de conformidad en verde; bite-check revirtiendo un itemId a numerico rompe el test correspondiente | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** - persistir en `## Sessions`, correr 2072 unit + 346 stories + 18 conformance + typecheck, quality review con juez independiente unico, decidir continue/iterate/escalate | - | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision documentada + evidencia de regresion | (no aplica, cierre de session) | DET-20, DET-23 | done | 1 |

### Task contract (notas de ejecucion)

```
Task S1.T2: Migrar handlers/purchases.ts
- source_ref: REQ-2
- precondition: uuid del backend para el item 1042 verificado contra purchases.service
- expected_output: itemId 1042 = uuid exacto del backend; 1088/2201 = uuid acunado con prefijo b0c00000- y forma <prefijo>-0000-4000-8000-<serial pad 12>
- validation: unit de compras + grep 0 itemId numerico
- rollback: git revert
- rules: [DET-7, RULE-testing-facade-e2e-004]
- nota: 1088/2201 no tienen correlato en el backend (contenido diverge, no solo formato); ver DEC-LOCAL-01
```

## Constraints

- [[RULE-testing-facade-e2e-004]]: la fachada de identidad se prueba en e2e/integration, no solo en unit mockeado; aplica al espiritu de los tests de conformidad de REQ-4 (verifican el fixture real, no un mock del fixture).
- DET-7: todo test case referencia un discovery/REQ; regression obligatoria antes de cerrar.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| [[JOR-149]] (SPEC-JOR-149) | internal | define el contrato itemId uuid del backend (`sales.service` `STUB_LINEAS`, `purchases.service`) que estos fixtures deben reflejar | si el contrato del backend cambia de nuevo, estos fixtures vuelven a desalinearse |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Un fixture acunado no sigue el patron `<prefijo>-0000-4000-8000-<serial pad 12>` | low | inconsistencia cosmetica con el resto del dominio | patron verificado contra los uuid reales del backend antes de acunar |
| Un test existente hardcodea un `itemId` serial de estos handlers y queda roto en silencio | medium | regression falsa-verde | regression completa (2072 unit + 346 stories) corre en el gate antes de cerrar |

## Open questions

_(ninguna)_

## Decisions

### DEC-LOCAL-01: reusar el uuid exacto del backend donde el contenido coincide, acunar donde diverge
- **Contexto**: al migrar `handlers/purchases.ts`, el item `1042` tiene contenido identico al que expone el backend, pero `1088`/`2201` no tienen correlato (el backend usa `1043`/`2050`/`9000` para contenido distinto).
- **Drivers**: preservar trazabilidad donde hay correspondencia real evita inventar un id que despues confunda a un dev buscando el item en el backend; acunar donde diverge evita fingir una correspondencia que no existe.
- **Opcion elegida**: reuso 1:1 del uuid del backend cuando el fixture representa el mismo item; acunado con el mismo prefijo y forma cuando el contenido del front no tiene correlato.
- **Alternativas**: (a) acunar todos los uuid sin reusar ninguno (descartada: pierde la trazabilidad gratis que da el reuso donde ya coincide); (b) forzar correlato para 1088/2201 reescribiendo su contenido para que coincida con el backend (descartada: expande el alcance a resolver la divergencia de contenido, que queda en backlog como deuda separada).
- **Consecuencias**: la divergencia de contenido 1088/2201 vs backend queda registrada en Backlog como deuda propia, distinta de la deuda de formato que este ticket cierra.
- **Session**: 1

### DEC-LOCAL-02: quality gate con juez unico (no dual-judge)
- **Contexto**: DET-35 declara el modo dual-judge como reforzado de DET-23 para T2/T3. Este ticket es T2, test-only, cambio acotado a 2 handlers + 3 stories + 2 tests nuevos, sin tocar produccion.
- **Drivers**: el radio de cambio es minimo y disjunto por archivo; el riesgo de un hallazgo no detectado por un solo juez es bajo dado que el bite-check de REQ-4 verifica empiricamente que los tests muerden.
- **Opcion elegida**: juez independiente unico en el gate de S1, approve sin hallazgos bloqueantes.
- **Alternativas**: dual-judge completo (descartada para este ticket puntual por sobre-ingenieria frente al radio del cambio; queda como el modo default para T2/T3 en general).
- **Consecuencias**: el gate queda documentado como `quality-gate: single-judge` en vez de `dual-judge` en el registro de decisiones de esta spec (no en `decisions_log` del ticket, que reserva ese step para el modo dual).
- **Session**: 1

## Success metrics

_(no aplica, cambio test-only sin metrica de negocio)_

## Technical reference

- `sales.service` (`STUB_LINEAS`, backend jormat-api) es la fuente del uuid exacto reusado en `handlers/ventas.ts` y en el item `1042` de `handlers/purchases.ts`.
- Patron de uuid del dominio: `<prefijo>-0000-4000-8000-<serial legacy pad 12>`. Prefijo `5a1e0000-` para ventas, `b0c00000-` para compras.
- El Zod del front tipa `itemId` como `z.string()` sin constraint uuid: los tests de schema con id numerico (fuera de alcance) no rompen por este cambio.

## Rules discovered

_(ninguna, no se crea rule en este ticket)_

## Bugs found

_(ninguno)_

## Backlog

| # | Item | Priority | Origen | Status |
|---|------|----------|--------|--------|
| B1 | Alinear `LineItemsTable.stories.tsx` (`ITM-001..040`) e `ItemDetailModal.stories.tsx` (`25435`) en `shared/items` al `itemId` uuid | could | mismo sintoma, fuera de alcance de este ticket | open |
| B2 | `itemId` numerico en tests unitarios de componentes/schemas (`TransactionBuilder.*.test`, `DocumentoDetalleView.test`, `lib/schemas/{ventas,purchases}.test`): el Zod del front tipa `itemId` como `z.string()` sin constraint uuid, no rompen contrato; alinear por consistencia | could | hallazgo de S1 | open |
| B3 | Divergencia de contenido de fixtures de compras vs backend (front `1088`/`2201` sin correlato; backend `1043`/`2050`/`9000`): deuda de datos de test preexistente, distinta del formato | could | DEC-LOCAL-01 | open |

## Acceptance checkpoints

- [x] **Funcional**: `handlers/ventas.ts` y `handlers/purchases.ts` emiten `itemId` uuid; stories de ventas alineadas.
- [x] **Tests** (DET-37 dim4): 18 tests de conformidad nuevos + regression completa (2072 unit + 346 stories), corridos y en VERDE.
- [x] **NFRs**: typecheck limpio.
- [x] **Rules**: RULE-testing-facade-e2e-004 respetada (los tests de conformidad verifican el fixture real).
- [x] **Integration**: 0 archivos de produccion tocados; catalogo real de items no se altera.
- [x] **Docs oficiales**: N/A, cambio no observable fuera del entorno de test.
- [x] **KB DKC**: N/A, no se crea/actualiza rule/bug; backlog B1-B3 registrado.
- [x] **Docs externas DKC**: N/A, no toca DKC ni convenciones.
- [x] **Planning-completeness**: entry `planning-completeness: mixed` registrada en `decisions_log` del ticket.

## Archiving

Una spec se archiva cuando deja de ser fuente de verdad. Usar `/dkc-archive-spec SPEC-JOR-155-msw-uuid-fixtures "razon"` si aplica en el futuro. No borrar manualmente.
