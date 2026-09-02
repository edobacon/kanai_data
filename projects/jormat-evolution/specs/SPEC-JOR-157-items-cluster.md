---
id: SPEC-JOR-157-items-cluster
project: jormat-evolution
ticket: JOR-157
status: in_progress
---

# SPEC-JOR-157-items-cluster — Cluster items cerrable: costoCompra doc, bloqueoDescuento, join users

# SPEC-JOR-157-items-cluster — Cluster items cerrable: costoCompra doc, bloqueoDescuento, join users

## Executive summary — lo que estas aprobando

**Que se quiere**: cerrar 3 items del catalogo de deuda tecnica que operan sobre tablas ya entregadas (`items`/`users`), sin crear tablas ni endpoints nuevos. DT-19 (`canales.catalogo`) queda fuera de alcance por ser Duda-PO.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | DT-10 se cierra como doc-update, no como codigo (`net_price` ya viaja en el detalle desde JOR-107 S6) | evita reimplementar algo que ya existe; el gap real (compras builder no consume `costoCompra`) queda como follow-up frontend |
| 2 | Nombre de columna `bloqueo_descuento` es ASSUMED (DET-1) | el nombre legacy MariaDB no fue confirmable en el workspace; queda marcado para renombrar si aparece el nombre real |
| 3 | DT-20 se resuelve con join defensivo (Option A: cast `::text=::text`), no con columna puente | decidido por el dev; resuelve siempre a `N/A` hoy (dominios de identidad desconectados); el nombre real es Option B, follow-up |

**Riesgos principales y como los mitigamos**:

- **Migracion aditiva sobre tabla `items` entregada** → columna `bloqueo_descuento` nullable=false con default 0, reversible por `down()`.
- **Join defensivo entre tipos distintos (integer legacy vs uuid) puede 500** → cast simetrico `u.id::text = i.us_modifier_id::text`, nunca compara tipos incompatibles.
- **Marcadores stale citando tickets cerrados** → se borran los 2 de DT-18/DT-20; se preserva el de DT-19.

**Que NO se hace en este ticket**:

- DT-19 (`canales.catalogo`, `item.dto.ts:38`) — Duda-PO, marcador preservado.
- DT-20 Option B (columna puente para resolver el nombre real del modificador) — follow-up, cambio de esquema en `users`.
- DT-10 frontend (`PurchaseInvoiceBuilder` consumiendo `costoCompra`) — ticket frontend aparte.
- El listado de items (`buildDataQuery`/`mainQuery`/`mapRowToDto`) — JOR-159 opera ahi, sin colision.

**Tamano estimado**: 1 session (S1), tier T2. La migracion aditiva es el paso de mayor sensibilidad aunque de esfuerzo menor.

**Como vas a saber que funciona**:

- PATCH `bloqueoDescuento: true` y el GET del detalle lo refleja (ya no `false` fijo).
- El detalle de un item con `us_modifier_id` resuelve `usuarioNombre` a `N/A` sin exponer el id crudo, sin 500.
- `grep DEUDA_TECNICA` en `items.repository.ts` ya no encuentra los marcadores de DT-18/DT-20.

## Purpose

Cerrar 3 items del catalogo de deuda tecnica sobre las tablas `items`/`users` ya entregadas, sin tocar el listado (dominio de JOR-159) ni esquema nuevo en `users`. DT-10 se resuelve documentando un estado ya resuelto por JOR-107 S6; DT-18 agrega una columna aditiva + su lectura/escritura real; DT-20 agrega un join defensivo de auditoria.

## Requirements

### REQ-1 (DT-10): Documentar que costoCompra ya esta resuelto en el detalle

> **Que cambia**: no hay cambio de codigo — se actualiza `docs/deuda-tecnica.md` para reflejar que `net_price`/`costoCompra` ya viaja en el detalle de items (gateado por `items.parts:cost-view`) desde JOR-107 S6.
> **Por que**: el catalogo de deuda tecnica quedaba desactualizado y sugeria un bloqueo backend que ya no existe; el gap remanente es frontend.

El sistema MUST reflejar en `docs/deuda-tecnica.md` que DT-10 esta resuelto a nivel backend (detalle), con nota de que el gap remanente (`PurchaseInvoiceBuilder` cayendo a retail) es un ticket frontend fuera de este alcance.

**Actor**: system
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: abre `docs/deuda-tecnica.md` y ve DT-10 marcado como resuelto (backend) con la nota del gap frontend.

### REQ-2 (DT-18): Columna `bloqueo_descuento` real (lectura + escritura)

> **Que cambia**: `bloqueoDescuento` deja de devolver `false` fijo en el detalle y de descartarse en el PATCH; ahora persiste en una columna real de `items`.
> **Por que**: es la raiz de DT-03 — la regla de descuento maximo en ventas queda inactiva mientras el dato no persiste.

El sistema MUST agregar una columna `bloqueo_descuento` (smallint, `notNullable`, default `0`) a `items` via migracion aditiva y reversible; `mapDetailRow` MUST leerla (`row.bloqueo_descuento === 1`) en vez de retornar `false` fijo; `buildItemColumns` MUST escribirla (0/1) tanto en create como en update.

**Nombre ASSUMED (DET-1)**: el nombre de columna legacy en MariaDB no fue confirmable en el workspace disponible. Se usa `bloqueo_descuento` (snake_case del campo DTO `bloqueoDescuento`), marcado como assumed en el codigo (comentario) y en `docs/deuda-tecnica.md`. Si aparece el nombre real del legacy antes de sincronizar contra el, renombrar.

**Actor**: system
**Layers**: database, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: PATCH persiste y el detalle lo refleja
- **GIVEN** un item existente con `bloqueo_descuento = 0`
- **WHEN** se hace PATCH con `bloqueoDescuento: true`
- **THEN** el GET del detalle devuelve `bloqueoDescuento: true` (no `false` fijo)

#### Scenario: Create persiste el valor inicial
- **GIVEN** un create de item con `bloqueoDescuento: true`
- **WHEN** se lee el detalle recien creado
- **THEN** `bloqueoDescuento` es `true`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: PATCH `bloqueoDescuento: true` → GET detalle refleja `true`.

### REQ-3 (DT-20): Join defensivo a `users` para el modificador de la auditoria

> **Que cambia**: la auditoria del detalle deja de exponer `us_modifier_id` crudo; resuelve un `usuarioNombre` (o `N/A` si no se puede resolver), nunca leaking el id.
> **Por que**: exponer el id numerico crudo no es legible ni seguro; falta el join, no la tabla.

El sistema MUST agregar un `leftJoin` defensivo a `users` con cast simetrico `u.id::text = i.us_modifier_id::text` (nunca comparar tipos incompatibles directamente, evita 500 por uuid-vs-integer), scoped por `workspace_id`; `mapDetailRow` MUST caer a `'N/A'` cuando `usuario_nombre` es null, sin exponer el id crudo.

**LIMITACION honesta**: con el modelo de datos actual (`us_modifier_id` entero legacy en `items`, `users.id` uuid, sin columna puente) el join resuelve **siempre** a `N/A`. El nombre real del modificador requiere Option B (columna puente en `users`) — follow-up, cambio de esquema fuera de este alcance.

**Actor**: system
**Layers**: database, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: Auditoria sin exposicion de id crudo
- **GIVEN** un item con `us_modifier_id` poblado
- **WHEN** se pide el detalle
- **THEN** `auditoria.usuarioNombre` es `'N/A'` (no el id crudo), sin error 500

#### Scenario: Join no rompe por tipos incompatibles
- **GIVEN** `us_modifier_id` es un entero legacy y `users.id` es uuid
- **WHEN** el leftJoin ejecuta con cast `::text=::text`
- **THEN** no lanza error de tipo, la query resuelve normalmente

</details>

#### Acceptance
**El usuario puede verificar que funciona**: GET detalle de un item con `us_modifier_id` muestra `usuarioNombre: 'N/A'`, sin id crudo y sin 500.

### REQ-PRESERVE-01: Cleanup de marcadores stale (RULE-global-006)

MUST: borrar los 2 marcadores `DEUDA_TECNICA[items]` de `items.repository.ts` que citan DT-18 (JOR-099, cerrado con otro alcance) y DT-20 (JOR-084, cerrado con otro alcance); preservar el marcador de DT-19 (`canales.catalogo`, Duda-PO, sigue abierto).

#### Acceptance
**El usuario puede verificar que funciona**: `grep DEUDA_TECNICA items.repository.ts` ya no encuentra los marcadores de DT-18/DT-20; el de DT-19 sigue presente.

## Artifacts (necessity + reuse — DET-32)

| Artifact | Veredicto | Racional |
|----------|-----------|----------|
| Doc-update DT-10 | **drop** (codigo) / doc-only | `net_price` ya resuelto en detalle desde JOR-107 S6; solo falta reflejarlo en el catalogo |
| Columna `bloqueo_descuento` | **build** | no existe; confirmed por catalogo + `items.repository.ts:521-527`/`:712-716` |
| Join defensivo a `users` | **build** | no existe; confirmed por catalogo + `items.repository.ts:545-549` |

## Constraints

- RULE-global-006: marcadores `DEUDA_TECNICA` stale se borran al resolver el item que referencian, sin dejar referencias a tickets cerrados con otro alcance.
- RULE-database-001: convencion de flags booleanos en `items` es `integer`/`smallint` 1/0 (no `t.boolean`); `bloqueo_descuento` sigue el patron de `is_active` (smallint 1/0), consistente con `offer_is`/`is_kit` (integer, no smallint).
- DET-5: multi-capa — DT-18 se verifica en migracion + repository (read+write) + test, no solo en una capa.
- DET-7: cada test case (TC1-TC4) traza a un REQ o discovery de este spec.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Nombre de columna `bloqueo_descuento` no coincide con el legacy real | media | bajo | marcado ASSUMED en codigo+docs; renombrar si aparece el nombre real antes de sincronizar |
| Join defensivo resuelve siempre a `N/A` (falta columna puente) | alta (conocido) | bajo | documentado como limitacion honesta + follow-up Option B en backlog |
| Migracion aditiva sobre tabla entregada `items` | baja | medio | `notNullable` con default `0`, reversible por `down()`, no afecta filas existentes |

## Tasks

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Migracion aditiva: columna `bloqueo_descuento` (smallint, notNullable, default 0) en `items` | REQ-2 | developer | — | backend/jormat-api/migrations/* | migrate + rollback OK | knex migrate:rollback | DET-2, DET-8, RULE-database-001 | done | 1 |
| S1.T2 | Read/write `bloqueoDescuento`: `mapDetailRow` lee `row.bloqueo_descuento===1` (ya no false fijo); `buildItemColumns` persiste 0/1 en create+update | REQ-2 | developer | S1.T1 | backend/jormat-api/src/items/items.repository.ts | integration: PATCH true → GET detalle refleja true | git revert | DET-2, DET-5 | done | 1 |
| S1.T3 | Join defensivo a `users`: leftJoin `u.id::text = i.us_modifier_id::text` scoped por workspace; `mapDetailRow` cae a `'N/A'` si `usuario_nombre` es null | REQ-3, REQ-PRESERVE-01 | developer | — | backend/jormat-api/src/items/items.repository.ts | integration: detalle con modifier no expone id crudo, sin 500 | git revert | DET-2, DET-5 | done | 1 |
| S1.T4 | Unit tests de mappers (`mapDetailRow`, `buildItemColumns`) para DT-18/DT-20 | REQ-2, REQ-3 | developer | S1.T2, S1.T3 | backend/jormat-api/src/items/items.repository.spec.ts | 728 unit pass | git revert | DET-7 | done | 1 |
| S1.T5 | E2E round-trip (PATCH/GET bloqueoDescuento) + audit fallback (usuarioNombre N/A) + TC4 mecanizado (grep de marcadores = 0) | REQ-2, REQ-3, REQ-PRESERVE-01 | developer | S1.T4 | backend/jormat-api/test/items.e2e-spec.ts | 228 e2e pass; migracion aplicada limpia (19 migraciones en global-setup) | git revert | DET-7 | done | 1 |
| S1.T6 | Docs: `docs/deuda-tecnica.md` DT-10 (resuelto, doc-only) / DT-18 (resuelto, nombre assumed) / DT-20 (resuelto, limitacion N/A) | REQ-1, REQ-2, REQ-3 | developer | S1.T5 | docs/deuda-tecnica.md | docs reflejan estado real de los 3 items | — | DET-16, DET-37 | done | 1 |
| S1.GATE | Gate de sync Session 1 (tier T2): quality review single independent judge, persistir gate, commits | REQ-1, REQ-2, REQ-3, REQ-PRESERVE-01 | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5, S1.T6 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | done | 1 |

## Acceptance checkpoints

- [x] **Funcional**: los 3 scenarios (DT-10 doc, DT-18 read/write, DT-20 join) resuelven segun REQ.
- [x] **Tests** (DET-37 dim4): 728 unit pass, 228 e2e pass.
- [x] **Rules**: RULE-global-006 (marcadores stale borrados), RULE-database-001 (smallint 1/0) respetadas.
- [x] **Integration**: listado de items (`buildDataQuery`/`mainQuery`/`mapRowToDto`) NO tocado — sin colision con JOR-159.
- [x] **Docs oficiales del proyecto** (DET-37 dim1): `docs/deuda-tecnica.md` actualizado para DT-10/18/20.
- [x] **KB DKC** (DET-37 dim2): 2 learns capturados (raw, pendiente triage al cierre del ticket).
- [ ] **Docs externas DKC** (DET-37 dim3): N/A — no se toca DKC/convenciones.
- [x] **Planning-completeness**: registrada como `mixed` en decisions_log del ticket.
