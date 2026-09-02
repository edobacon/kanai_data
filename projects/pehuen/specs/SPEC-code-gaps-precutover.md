---
id: SPEC-code-gaps-precutover
project: pehuen
ticket: PEH-022
status: done
---

# Gaps de codigo pre-corte: paridad Guia + hardening nuxt (audit / health / rut / TTL)

# Gaps de codigo pre-corte: paridad Guia + hardening nuxt (audit / health / rut / TTL)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements y Tasks.*

**Que se quiere**: cerrar 6 gaps de codigo detectados en la auditoria de cobertura del 2026-07-19. Dos son de **paridad real** con el legacy y bloquean el corte (defaults numericos de Guia en 0; validacion `origen != destino` al crear). Los otros cuatro son **hardening net-new de nuxt** que el dev decidio mantener como trabajo pre-corte (borrar TTL muerto, health con ping a Mongo, indice sobre `User.rut`, y completar el rollout de `audit()` en las escrituras de dominio). El item 7 (rotacion anti-replay del refresh) queda fuera: aceptado como DELTA documentado en el backlog.

**Decisiones criticas que necesitan tu OK** (ya resueltas por el dev en intake — se ratifican aqui):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | TTL access/refresh se mantiene en 15min/7d (hardening), NO 3h/90d | El `createToken` muerto (3h/90d) se borra; el acceptance §3 se actualiza. Evita "dos verdades" de TTL en el codigo |
| 2 | `origen != destino` solo en CREATE (no en PATCH) | Paridad exacta con el legacy (`dtos/guia.dto.ts:229`, wireado solo en POST). Agregarlo al PATCH seria un delta no autorizado |
| 3 | `audit()` cubre CRUD de dominio (~19 endpoints), NO logout/refresh/reports | El enum `IAuditLog.action` no tiene LOGOUT/REFRESH; reports es Excel read-only. Meter audit ahi seria inventar semantica |
| 4 | Indice `User.rut`: unique solo si la data no tiene duplicados; si los tiene, non-unique | Un `unique` sobre data con rut duplicado revienta el arranque. Auditar duplicados ANTES es obligatorio |

**Riesgos principales y como los mitigamos**:

- **Regresion silenciosa en creacion de guias** (defaults + origen!=destino tocan el hot-path de create) → tests de regresion desde el legacy sobre cada movimiento (1-5) antes y despues del cambio.
- **`unique` sobre `rut` revienta el arranque si hay duplicados** → task de auditoria de duplicados corre ANTES de decidir el tipo de indice; si hay dups, indice non-unique + nota.
- **Borrar `createToken` rompe algun consumer** → grep confirmo cero consumers del metodo (solo `createTokens` de `utils/auth.ts` se usa); igual se corre typecheck + suite auth tras el borrado.
- **Omitir un endpoint en el rollout de audit** → el gate real es un test por-endpoint que verifica la invocacion de `audit()`, no la funcion aislada.

**Que NO se hace en este ticket**:

- Rotacion one-time-use del refresh token (item 7) → DELTA aceptado, backlog `could` (requiere store per-token, infra nueva).
- `audit()` en logout/refresh/reports/validate-batch → no son escrituras de dominio.
- Ratificacion de imagen de ruma publica vs auth y alcance de `tokenVersion` → notas, fuera de scope de execute.

**Tamano estimado**: 3 sessions, ~4-6h efectivas. La mas larga y riesgosa es S3 (rollout de audit sobre ~19 endpoints + tests por-endpoint).

**Como vas a saber que funciona**:

- Creo una guia sin enviar pesos/volumenes y quedan en 0 (no undefined).
- Intento crear una guia con el mismo origen y destino y recibo el error literal del legacy.
- `GET /api/health` devuelve `db: 'connected'`; con Mongo caido devuelve 503.
- Cada escritura de dominio (crear cancha, editar producto, etc.) deja un registro en `audit_logs`.

---

## Purpose

Corregir 6 gaps de codigo en `pehuen_nuxt/server` antes del corte de la migracion: 2 de paridad con el legacy (defaults numericos de Guia, `origen != destino` en create) y 4 de hardening (TTL muerto, health sin DB, `User.rut` sin indice, `audit()` incompleto). Cada cambio con test de regresion (RULE-MIGRATION-002) y validado contra el legacy cuando aplica (RULE-MIGRATION-004), con cero regresion (RULE-MIGRATION-001).

## Requirements

### REQ-FIX-01: Defaults numericos de Guia en 0 (paridad)

> **Que cambia**: al crear una guia sin enviar `pesoBruto*`, `pesoNeto*`, `volumen*`, `foto*` o `cantidadRollizo*`, esos campos quedan en `0` en vez de `undefined`.
> **Por que**: el legacy los defaultea siempre a 0 (`dtos/guia.dto.ts:105-114`); nuxt los deja `.optional()` sin default, generando docs con campos ausentes.

El sistema MUST aplicar `default 0` a los 10 campos numericos opcionales de `createGuiaBase` al crear una guia.

**Actor**: user (EDITOR_ROLES)
**Layers**: backend, schema

<details><summary>Scenarios de validacion</summary>

#### Scenario: create sin pesos
- **GIVEN** un payload de guia valido (movimiento 1) sin `pesoBrutoRecepcion`, `fotoEntrada`, etc.
- **WHEN** POST `/api/guias`
- **THEN** el documento persistido tiene esos 10 campos en `0` (no undefined)

#### Scenario: create con valores explicitos
- **GIVEN** un payload con `volumenDespacho: 42`
- **WHEN** POST `/api/guias`
- **THEN** el valor 42 se preserva (el default no pisa el valor enviado)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea una guia sin pesos y en el detalle ve 0, no vacio.

### REQ-FIX-02: Validacion `origen != destino` en create (paridad)

> **Que cambia**: crear una guia con el mismo `origen` y `destino` ahora falla con el mensaje literal del legacy.
> **Por que**: el legacy lo valida en POST `/guia` (`dtos/guia.dto.ts:229`); nuxt no lo valida en ningun lado.

El sistema MUST rechazar en CREATE (no en update) una guia cuyo `origen` sea igual al `destino`, con el mensaje `No puede tener el mismo origen y destino`.

**Actor**: user (EDITOR_ROLES)
**Layers**: backend, schema

<details><summary>Scenarios de validacion</summary>

#### Scenario: origen == destino en create
- **GIVEN** un payload con `origen` === `destino`
- **WHEN** POST `/api/guias`
- **THEN** 400 con mensaje `No puede tener el mismo origen y destino`

#### Scenario: update no valida (paridad)
- **GIVEN** una guia existente
- **WHEN** PATCH `/api/guias/[id]` con `origen` === `destino`
- **THEN** NO se aplica esta validacion (paridad exacta con legacy)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: al crear una guia con origen y destino iguales, recibe el error literal.

### REQ-FIX-03: Eliminar path de TTL muerto (createToken 3h/90d)

> **Que cambia**: se borra el metodo `createToken` de `user.model.ts` (y su firma en `IUser`), que definia 3h/90d y no alimentaba las cookies.
> **Por que**: coexistian dos TTL (15min/7d activo en `utils/auth.ts` vs 3h/90d muerto). El dev decidio mantener 15min/7d.

El sistema MUST tener un unico origen de TTL de tokens (`server/utils/auth.ts`, 15min/7d) y NO conservar el metodo `createToken` muerto ni su firma en la interfaz.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: login/refresh siguen funcionando
- **GIVEN** el metodo `createToken` eliminado
- **WHEN** login, refresh y change-cancha
- **THEN** siguen emitiendo tokens via `createTokens` (typecheck + suite auth verdes)

</details>

### REQ-FIX-04: /api/health consulta la DB

> **Que cambia**: `GET /api/health` incluye `db: 'connected' | 'disconnected'` y devuelve 503 si Mongo no responde.
> **Por que**: hoy retorna siempre `{status:'ok'}` aunque la DB este caida; util para health checks de infra.

El sistema MUST verificar la conexion a Mongo en `/api/health`, incluir su estado en la respuesta, y responder 503 cuando la DB no esta disponible.

**Actor**: system / public (health check)
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: DB up
- **GIVEN** Mongo conectado
- **WHEN** GET `/api/health`
- **THEN** 200 con `{ status: 'ok', db: 'connected', timestamp }`

#### Scenario: DB down
- **GIVEN** Mongo desconectado
- **WHEN** GET `/api/health`
- **THEN** 503 con `db: 'disconnected'`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: llama a `/api/health` y ve `db: connected`.

### REQ-FIX-05: Indice sobre `User.rut`

> **Que cambia**: se agrega un indice a `User.rut` (unique si la data no tiene duplicados; non-unique si los tiene).
> **Por que**: el login/consultas por rut escanean sin indice; conviene indexar. Un `unique` a ciegas puede reventar el arranque si hay dups.

El sistema MUST indexar `User.rut`. El indice SHOULD ser `unique` solo si la auditoria previa confirma cero duplicados; si hay duplicados, MUST usar indice non-unique y dejar nota.

**Actor**: system
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: auditoria de duplicados previa
- **GIVEN** la coleccion `users`
- **WHEN** se agrupa por `rut` y se cuentan duplicados
- **THEN** si 0 dups → indice unique; si >0 → non-unique + nota en el spec

</details>

### REQ-FIX-06: Completar rollout de `audit()` en escrituras de dominio

> **Que cambia**: cada escritura de dominio (crear/editar/cambiar estado/borrar en canchas, productos, guias, rumas, mii) registra en `audit_logs`.
> **Por que**: hoy solo 12/35 endpoints auditan; las escrituras de canchas/productos/guias-create/rumas/mii no dejan traza de actor.

El sistema MUST invocar `audit(event, action, entity, entityId, details)` en cada endpoint de escritura de dominio identificado (~19), con el `action` correcto del enum (`CREATE`/`UPDATE`/`DELETE`/`STATUS_CHANGE`).

**Actor**: user (roles segun endpoint)
**Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear cancha audita
- **GIVEN** un admin autenticado
- **WHEN** POST `/api/canchas`
- **THEN** se crea un `AuditLog` con `action: CREATE`, `entity: cancha`, `userId` del actor

#### Scenario: cambiar estado de producto audita
- **GIVEN** un admin
- **WHEN** PATCH `/api/productos/[id]/status`
- **THEN** `AuditLog` con `action: STATUS_CHANGE`, `entity: producto`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras crear/editar recursos, hay filas nuevas en `audit_logs` con el actor.

### REQ-REGRESSION-01: Creacion/edicion de guias preserva comportamiento

> **Que cambia**: nada visible; el hot-path de create/update de guias sigue funcionando igual salvo los deltas de REQ-FIX-01/02.
> **Por que**: los cambios de schema tocan un path critico; DET-7 exige regresion.

El sistema MUST mantener el comportamiento existente de create/update de guias (validaciones por movimiento, uppercase, limpieza de campos opuestos, conflictos de guia vigente).

**Layers**: backend, schema

### REQ-REGRESSION-02: Flujos de auth preservan comportamiento

El sistema MUST mantener login, refresh, change-cancha y logout funcionando tras eliminar `createToken` muerto y tras agregar el indice de rut.

**Layers**: backend

## Fix scope

### Antes (comportamiento actual)
- `guia.schema.ts:54-63`: 10 campos numericos `.optional()` sin default → docs con campos undefined.
- `guia.schema.ts:70-176`: superRefine sin check `origen != destino`.
- `user.model.ts:20-26,56-87`: interfaz + metodo `createToken` muerto (3h/90d) que no alimenta cookies.
- `health.get.ts:1-3`: retorna solo `{status,timestamp}`.
- `user.model.ts:102-103`: sin indice sobre `rut`.
- 23/35 escrituras sin `audit()` (de las cuales ~19 son de dominio).

### Despues (comportamiento esperado)
- 10 campos con `.default(0)` (solo en create).
- superRefine agrega `origen != destino` con mensaje literal (solo create).
- `createToken` + firma eliminados; TTL unico en `utils/auth.ts`.
- `/api/health` con ping a Mongo + 503.
- Indice sobre `User.rut`.
- ~19 escrituras de dominio con `audit()` + tests por-endpoint.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `server/schemas/guia.schema.ts` | `.default(0)` x10 + check origen!=destino en create | create guia; update permisivo sin cambios |
| `server/models/user.model.ts` | borrar `createToken` + firma; agregar `index({rut})` | auth (sin consumers del metodo); consultas por rut |
| `server/api/health.get.ts` | ping Mongo + 503 | health checks de infra |
| `server/api/canchas/**`, `productos/**`, `guias/index.post`, `guias/[id]/index.patch`, `guias/extra-data.post`, `rumas/**`, `files/mii/upload.post`, `auth/cancha.patch` | agregar `audit()` | escrituras de dominio dejan traza |
| `docs/07-migration-notes/review-plan/acceptance-checklist.md` | §3 pasa a 15min/7d | doc de corte |
| `test/**` | tests de regresion + por-endpoint | cobertura |

## Constraints

- RULE-MIGRATION-001: cero regresion — cada cambio con test de regresion.
- RULE-MIGRATION-002: test primero, derivado del legacy cuando hay referente (items paridad 5, 6).
- RULE-MIGRATION-004: legacy = fuente de verdad para el valor correcto (defaults, mensaje literal).
- DET-7: regression obligatoria.
- Config critical rule: `audit()` en cada escritura de dominio; sin `console.log` en runtime (usar Winston).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresion en create de guias | medium | alto | tests de regresion por movimiento antes/despues |
| `unique` sobre rut con duplicados revienta arranque | medium | alto | auditar duplicados ANTES; non-unique si hay dups |
| Borrar createToken rompe consumer oculto | low | medio | grep confirmo cero consumers; typecheck + suite auth |
| Omitir un endpoint en rollout audit | medium | medio | test por-endpoint que verifica la invocacion |

## Open questions

Ninguna — las 4 decisiones criticas fueron resueltas por el dev en intake (ver ticket "Re-scope resultante").

## Decisions (cerradas durante intake/design)

### DEC-LOCAL-01: TTL se mantiene en 15min/7d
- **Contexto**: dos TTL coexistentes (15min/7d activo vs 3h/90d muerto); acceptance pedia 3h/90d.
- **Opcion elegida**: mantener 15min/7d (hardening), borrar el muerto, actualizar acceptance §3.
- **Alternativas**: volver a 3h/90d (paridad legacy) — descartada: el legacy nunca invoca el modo refresh, el access "real" 3h no aporta seguridad vs 15min.
- **Session**: intake 2026-07-19.

### DEC-LOCAL-02: audit() solo en escrituras de dominio
- **Contexto**: 23 endpoints sin audit por metodo HTTP.
- **Opcion elegida**: auditar ~19 escrituras de dominio (CRUD). Excluir logout/refresh/reports/validate-batch.
- **Alternativas**: auditar los 23 — descartada: el enum no tiene LOGOUT/REFRESH y reports es read-only.
- **Session**: design 2026-07-19.

## Tasks

### Session 1 — Paridad Guia: defaults 0 + origen!=destino + tests [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar `.default(0)` a los 10 campos numericos de `createGuiaBase` (solo create) | REQ-FIX-01 | developer | — | server/schemas/guia.schema.ts | vitest schema guia; typecheck | git revert | RULE-MIGRATION-004, DET-7 | done | 1 |
| S1.T2 | Agregar check `origen !== destino` en `createGuiaSchema.superRefine` con mensaje literal legacy (solo create) | REQ-FIX-02 | developer | S1.T1 | server/schemas/guia.schema.ts | vitest schema guia | git revert | RULE-MIGRATION-004 | done | 1 |
| S1.T3 | Tests de regresion desde el legacy: defaults 0 por movimiento + origen==destino rechazado en create / no en update | REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION-01 | developer | S1.T2 | test/ | vitest run (suite guia) | git revert | RULE-MIGRATION-001, RULE-MIGRATION-002, DET-7 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions`, correr vitest+coverage suite guia, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Auth + infra: TTL muerto + health DB + rut index + acceptance [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Eliminar metodo `createToken` + firma `IUser.createToken` (path TTL muerto) | REQ-FIX-03 | developer | S1.GATE | server/models/user.model.ts | typecheck; vitest auth | git revert | DET-8 | done | 2 |
| S2.T2 | Auditar duplicados de `rut` en DB; agregar `index({rut})` (unique si 0 dups, non-unique si hay) | REQ-FIX-05 | developer | S2.T1 | server/models/user.model.ts | script conteo dups + typecheck | git revert | DET-5, DET-8 | done | 2 |
| S2.T3 | `/api/health`: ping a Mongo (`mongoose.connection.readyState`/ping) + `db` en respuesta + 503 si cae | REQ-FIX-04 | developer | — | server/api/health.get.ts, test/ | vitest health (up/down) | git revert | DET-7 | done | 2 |
| S2.T4 | Actualizar `acceptance-checklist.md` §3 a 15min/7d (deja de pedir 3h/90d) | REQ-FIX-03 | developer | S2.T1 | docs/07-migration-notes/review-plan/acceptance-checklist.md | lint markdown | git revert | — | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, correr vitest auth+health, decidir | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Audit rollout en escrituras de dominio + tests por-endpoint [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S3.T1, S3.T2, S3.T3, S3.T4, S3.T5]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | `audit()` en canchas: index.post (CREATE), [id]/index.patch (UPDATE), [id]/status.patch (STATUS_CHANGE), [id]/index.delete (DELETE) | REQ-FIX-06 | developer | S2.GATE | server/api/canchas/ | typecheck | git revert | — | done | 3 |
| S3.T2 | `audit()` en productos: index.post, [id]/index.patch, [id]/status.patch, [id]/index.delete | REQ-FIX-06 | developer | S2.GATE | server/api/productos/ | typecheck | git revert | — | done | 3 |
| S3.T3 | `audit()` en guias: index.post (CREATE), [id]/index.patch (UPDATE), extra-data.post | REQ-FIX-06 | developer | S2.GATE | server/api/guias/ | typecheck | git revert | — | done | 3 |
| S3.T4 | `audit()` en rumas: index.post, [id]/index.patch, [id]/status.patch, [id]/reset-geo.patch, [id]/image.post | REQ-FIX-06 | developer | S2.GATE | server/api/rumas/ | typecheck | git revert | — | done | 3 |
| S3.T5 | `audit()` en mii upload.post + auth/cancha.patch (change-cancha del usuario) | REQ-FIX-06 | developer | S2.GATE | server/api/files/mii/, server/api/auth/cancha.patch.ts | typecheck | git revert | — | done | 3 |
| S3.T6 | Tests por-endpoint que verifican la invocacion de `audit()` (no la funcion aislada) para las escrituras cubiertas | REQ-FIX-06, REQ-REGRESSION-02 | developer | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5 | test/ | vitest run (audit) | git revert | DET-7, DET-13 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — persistir, correr suite completa + coverage, verificar audit por-endpoint, decidir | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5, S3.T6 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-13 | done | 3 |

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-FIX-01..06 pasan
- [ ] **Tests**: regresion guia + health up/down + audit por-endpoint escritos y verdes
- [ ] **Rules**: `audit()` en escrituras de dominio; sin console.log; TTL unico
- [ ] **Integration**: suite completa sin regresion (RULE-MIGRATION-001)
- [ ] **Docs**: acceptance-checklist §3 actualizado a 15min/7d
