---
id: SPEC-JOR-159-dto-list-partial
project: jormat-evolution
ticket: JOR-159
status: in_progress
---

# SPEC-JOR-159-dto-list-partial — DTO de factura (declarar 3 campos) + propagar 4 campos al listado de items

# SPEC-JOR-159-dto-list-partial — DTO de factura (declarar 3 campos) + propagar 4 campos al listado de items

## Executive summary — lo que estas aprobando

**Que se quiere**: cerrar la parte NO dependiente de tablas nuevas de dos items del catalogo de deuda tecnica (`docs/deuda-tecnica.md`): DT-04 (campos del DTO de factura) y DT-03 (propagacion de campos al listado de items), dejando lo table-dependiente para despues.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | DT-03 se cierra completo en los 4 campos del listado (`oil`, `maxDiscount`, `generalStock`, `criticalStock`) | `maxDiscount` (`ds_max_discount`) YA tenia columna y estaba en el SELECT; no estaba bloqueado por DT-18 como se creia. Solo `bloqueoDescuento` (campo de detalle, JOR-157) dependia de columna |
| 2 | DT-04 se cierra como declare+validate, sin persistir | el front ya viaja `medioPago`/`vencimiento`/`transporte` y hoy se pierden sin validar; persistir espera el modelo real de facturas, y `transporte` ademas depende de DT-01 |
| 3 | Marcadores DT-03/DT-04 se re-apuntan (no se borran) | cierre parcial: el remanente (persistencia de DT-04, consumo frontend de DT-03) sigue abierto |

**Riesgos principales y como los mitigamos**:

- **Cleanup de marcadores incompleto (detectado en Ronda 1 del gate)** → 3 de 4 ubicaciones de DT-03 quedaron sin re-apuntar tras el fix inicial; corregido en la iteracion, verificado 4/4 en Ronda 2.
- **Confundir "declarado" con "persistido" en DT-04** → REQ-1 es explicito: `@IsOptional`, no hay escritura a DB; documentado como limitacion en el mismo REQ.

**Que NO se hace en este ticket**:

- Persistencia de `medioPago`/`vencimiento`/`transporte` en `FacturaInputDto` — espera el modelo real de facturas (backlog B1).
- Consumo frontend de `generalStock`/`criticalStock` en `TransactionBuilder`/`ItemSearchPanel`/`PurchaseInvoiceBuilder` — falta el wiring de consumo (backlog B2).
- `bloqueoDescuento` (columna de detalle) — dominio de JOR-157, sin colision.

**Tamano estimado**: 1 session (S1, con 1 iterate), tier T2.

**Como vas a saber que funciona**:

- `FacturaInputDto` acepta `medioPago`/`vencimiento`/`transporte` validos y rechaza `medioPago` invalido (400).
- El listado de items (`items-list`) propaga `oil`/`maxDiscount`/`generalStock`/`criticalStock` con los valores exactos sembrados.
- `grep DEUDA_TECNICA` en las 7 ubicaciones (4 DT-03 + 3 DT-04) apunta al remanente, no a este ticket.

## Purpose

Cerrar la parte de DT-04 y DT-03 que NO depende de tablas nuevas, dejando lo table-dependiente para despues (`docs/deuda-tecnica.md`).

## Requirements

### REQ-1 (DT-04): Declarar y validar medioPago, vencimiento, transporte en FacturaInputDto

> **Que cambia**: `FacturaInputDto` declara `medioPago` (enum de 10 valores espejo de `MEDIO_PAGO` del front), `vencimiento` (string) y `transporte` (string), todos `@IsOptional`.
> **Por que**: el front ya viaja estos campos y hoy se pierden sin validar; validar sin persistir es la parte cerrable ahora.

El sistema MUST declarar `medioPago?: MedioPago` con `@IsOptional()` `@IsIn(MEDIO_PAGO_VALUES)` (10 valores espejo del front), `vencimiento?: string` con `@IsOptional()` `@IsString()`, y `transporte?: string` con `@IsOptional()` `@IsString()` en `FacturaInputDto`.

**LIMITACION honesta**: ninguno de los 3 campos se persiste en este ticket. Persistencia espera el modelo real de facturas (backlog B1); `transporte` ademas depende de DT-01 (endpoint transportistas).

**Actor**: system
**Layers**: backend (DTO)

<details><summary>Scenarios de validacion</summary>

#### Scenario: medioPago valido es aceptado
- **GIVEN** un POST de factura draft con `medioPago` en la lista de 10 valores validos
- **WHEN** se valida el DTO
- **THEN** la request es aceptada (sin 400 por ese campo)

#### Scenario: medioPago invalido es rechazado
- **GIVEN** un POST de factura draft con `medioPago` fuera de la lista de valores validos
- **WHEN** se valida el DTO
- **THEN** la request es rechazada con 400

#### Scenario: campos opcionales ausentes no rompen la validacion
- **GIVEN** un POST de factura draft sin `medioPago`/`vencimiento`/`transporte`
- **WHEN** se valida el DTO
- **THEN** la request es aceptada (los 3 son `@IsOptional`)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: POST con los 3 campos validos es aceptado; POST con `medioPago` invalido devuelve 400.

### REQ-2 (DT-03): Propagar oil/maxDiscount/generalStock/criticalStock al listado de items

> **Que cambia**: el listado de items propaga `oil`, `maxDiscount`, `generalStock`, `criticalStock` via `mapRowToDto`, usando columnas YA seleccionadas por `buildDataQuery` (sin tocar el SELECT).
> **Por que**: los 4 campos tienen columna real y ya viajan en la query, pero se perdian al mapear la fila al DTO del listado.

El sistema MUST propagar `oil`, `maxDiscount`, `generalStock` y `criticalStock` en `mapRowToDto` (listado de items) desde las columnas ya seleccionadas por `buildDataQuery`, sin modificar el `SELECT`; MUST declarar los 4 campos en `ItemDto`.

**DECISION**: se cierran los 4 campos del listado ahora. `maxDiscount` (`ds_max_discount`) NO estaba bloqueado tecnicamente — ya tenia columna y ya estaba en el SELECT desde `9b9e90d3`. Solo `bloqueoDescuento` (campo de **detalle**, distinto de `maxDiscount`) dependia de DT-18/JOR-157.

**Actor**: system
**Layers**: backend (DTO, mapper)

<details><summary>Scenarios de validacion</summary>

#### Scenario: listado propaga los 4 campos con valores sembrados
- **GIVEN** items sembrados con valores conocidos de `oil`/`maxDiscount`/`generalStock`/`criticalStock`
- **WHEN** se pide el listado (`items-list`)
- **THEN** el DTO de cada fila expone los 4 campos con los valores exactos sembrados

#### Scenario: el SELECT del listado no cambia
- **GIVEN** el `buildDataQuery` existente que ya selecciona las 4 columnas
- **WHEN** se implementa la propagacion
- **THEN** el diff no toca el `SELECT`, solo `mapRowToDto` y `ItemDto`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: GET listado de items expone `oil`/`maxDiscount`/`generalStock`/`criticalStock` con los valores exactos sembrados.

### REQ-3: Cleanup de marcadores DT-03/DT-04 (RULE-global-006, cierre parcial)

> **Que cambia**: los marcadores `DEUDA_TECNICA` de DT-03 (4 ubicaciones: `TransactionBuilder.tsx`, `ItemSearchPanel.stories.tsx`, `PurchaseInvoiceBuilder.tsx`, `items.ts`) y DT-04 (3 ubicaciones en `ventas.ts`) se **re-apuntan** al remanente, no se borran.
> **Por que**: el cierre es parcial (declara/propaga, no persiste/consume); borrar el marcador ocultaria el trabajo pendiente.

El sistema MUST re-apuntar los 4 marcadores `DEUDA_TECNICA[items]` de DT-03 y los 3 marcadores `DEUDA_TECNICA[sales]` de DT-04 al remanente correspondiente (persistencia para DT-04, consumo frontend para DT-03), siguiendo la convencion `DEUDA_TECNICA[dominio]: ... (JOR-XXX)`.

**Nota de proceso**: la Ronda 1 del gate detecto que solo 1 de las 4 ubicaciones de DT-03 habia sido re-apuntada tras el fix inicial (MAYOR, RULE-global-006/DET-4); corregido en la iteracion (commit `3dbb6a9`), verificado 4/4 en Ronda 2.

**Actor**: system
**Layers**: frontend (comentarios/marcadores), docs

#### Acceptance
**El usuario puede verificar que funciona**: `grep DEUDA_TECNICA` en las 7 ubicaciones (4 DT-03 + 3 DT-04) apunta al remanente documentado en `## Backlog` del ticket, no a JOR-159 como si estuviera resuelto.

## Artifacts (necessity + reuse — DET-32)

| Artifact | Veredicto | Racional |
|----------|-----------|----------|
| Enum `MEDIO_PAGO_VALUES` en `FacturaInputDto` | **build** | no existe en el DTO; confirmed por catalogo DT-04 + `lib/schemas/ventas.ts:349,354,358` (front) |
| Propagacion en `mapRowToDto` | **build** | columnas ya seleccionadas por `buildDataQuery`, falta el mapeo a DTO |
| Re-point de marcadores | **build** | marcadores existentes citando este ticket como si el cierre fuera total; se corrige el apuntado |

## Constraints

- RULE-global-006: marcadores `DEUDA_TECNICA` stale/parciales se re-apuntan al remanente real, no quedan citando un ticket que solo resolvio una parte.
- DET-5: multi-capa — DT-03 se verifica en `buildDataQuery` (sin cambio) + `mapRowToDto` + `ItemDto` + test, no solo en una capa.
- DET-7: cada test case (TC1-TC3) traza a un REQ de este spec.
- DET-4: antes de calificar `maxDiscount` como bloqueado, se reconstruyo el timeline — la columna existe desde `9b9e90d3`, el bloqueo real era solo `bloqueoDescuento` (detalle).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Cleanup de marcadores parcial (solo algunas ubicaciones re-apuntadas) | media (materializado en Ronda 1) | medio | detectado por el juez, corregido con fix quirurgico + re-judge (commit `3dbb6a9`) |
| Confundir "declarado" con "persistido" en DT-04 | baja | bajo | REQ-1 explicito con `@IsOptional`, sin escritura a DB, documentado en el mismo REQ y en backlog B1 |

## Tasks

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Declarar+validar `medioPago`/`vencimiento`/`transporte` en `FacturaInputDto` | REQ-1 | developer | — | backend/jormat-api/src/sales/dto/factura-input.dto.ts | unit: acepta validos, 400 en invalidos | git revert | DET-2, DET-5 | done | 1 |
| S1.T2 | Propagar `oil`/`maxDiscount`/`generalStock`/`criticalStock` al listado via `mapRowToDto` (sin tocar el SELECT) | REQ-2 | developer | — | backend/jormat-api/src/items/items.repository.ts, backend/jormat-api/src/items/dto/item.dto.ts | e2e: listado expone los 4 campos con valores sembrados | git revert | DET-2, DET-5 | done | 1 |
| S1.T3 | Tests unit (DTO factura) + e2e (listado items, facturas draft) | REQ-1, REQ-2 | developer | S1.T1, S1.T2 | backend/jormat-api/src/sales/dto/factura-input.dto.spec.ts, backend/jormat-api/test/items.e2e-spec.ts, backend/jormat-api/test/sales.e2e-spec.ts | 730 unit pass; 229 e2e pass | git revert | DET-7 | done | 1 |
| S1.T4 | Re-apuntar marcadores DT-03 (4 ubicaciones)/DT-04 (3 ubicaciones) al remanente | REQ-3 | developer | S1.T3 | TransactionBuilder.tsx, ItemSearchPanel.stories.tsx, PurchaseInvoiceBuilder.tsx, items.ts, ventas.ts | grep marcadores apunta al remanente | git revert | DET-16, RULE-global-006 | done | 1 |
| S1.T5 | Iterate: completar re-point de 3 marcadores restantes + alinear convencion `DEUDA_TECNICA[dominio]` | REQ-3 | developer | S1.T4 | TransactionBuilder.tsx, ItemSearchPanel.stories.tsx, PurchaseInvoiceBuilder.tsx, docs/deuda-tecnica.md | grep 4/4 DT-03 apuntan al remanente; convencion alineada | git revert | RULE-global-006, DET-4 | done | 1 |
| S1.GATE | Gate de sync Session 1 (tier T2): quality review single independent judge, 1 iterate, persistir gate, commits | REQ-1, REQ-2, REQ-3 | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | done | 1 |

## Acceptance checkpoints

- [x] **Funcional**: los 2 scenarios cerrables (DT-04 declare+validate, DT-03 propagacion) resuelven segun REQ.
- [x] **Tests** (DET-37 dim4): 730 unit pass, 229 e2e pass.
- [x] **Rules**: RULE-global-006 (marcadores re-apuntados 4/4 DT-03, verificado en Ronda 2), DET-4 (timeline de `maxDiscount` reconstruido, no era deuda como se pensaba).
- [x] **Integration**: `buildDataQuery`/`mainQuery` del listado NO tocado — la propagacion es solo en `mapRowToDto`.
- [x] **Docs oficiales del proyecto** (DET-37 dim1): `docs/deuda-tecnica.md` re-apuntado para DT-03/DT-04.
- [x] **KB DKC** (DET-37 dim2): 3 learns capturados (raw, pendiente triage al cierre del ticket).
- [ ] **Docs externas DKC** (DET-37 dim3): N/A — no se toca DKC/convenciones.
- [x] **Planning-completeness**: registrada como `mixed` en decisions_log del ticket.
