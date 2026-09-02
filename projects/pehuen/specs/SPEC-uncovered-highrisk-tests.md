---
id: SPEC-uncovered-highrisk-tests
project: pehuen
ticket: PEH-023
status: done
---

# Cobertura de tests para 5 areas de alto riesgo sin ninguna capa de test

# Cobertura de tests para 5 areas de alto riesgo sin ninguna capa de test

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle esta en Requirements y Tasks.*

**Que se quiere**: 5 areas del backend de `pehuen_nuxt` funcionan hoy pero no tienen NINGUN test que las respalde antes del corte de migracion. Este ticket agrega esa cobertura: storage in-system, anonimizacion de usuario (compliance PII), descarga de reportes con ownership, dos guards de RBAC de estado de usuario, y sockets realtime end-to-end. Todo es codigo de test nuevo; no se toca codigo productivo.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Sockets realtime (area 5) se testea con un servidor socket.io **in-process** (Server + Client reales, JWT minteado con `createTokens`), NO contra el dev server ni docker/mongo | El handshake usa `verifyAccessTokenFull` que es JWT puro (sin DB), asi que un test in-process cubre el round-trip real emit→receive + rechazo de handshake sin cookie, sin dependencia de infra. Cubre lo que exige la Decision #1 del intake (criterio de corte) |
| 2 | `isAllowedRoom`/`STATIC_ROOMS` son closures NO exportados del plugin → su exactitud se cubre **por contrato** contra `shared/constants/socket-rooms.ts`, no por test directo del closure | Testear el closure exacto requeriria exportarlo (cambio de codigo productivo, fuera de scope). Queda backlog `could` #2. El test igual valida emit/receive real y handshake real |
| 3 | Area 4 (RBAC): el self-toggle responde **400**, no 403 (el intake decia 403 — discrepancia verificada en `status.patch.ts:9-11`) | El test asserta el codigo real (400). Evita consagrar un valor incorrecto |

**Riesgos principales y como los mitigamos**:

- **Test de sockets flaky por timing async** → usar `await once(client, 'event')` con timeout explicito del test (30s config integration) y cierre determinista de server/client en `afterEach`; nada de `setTimeout` arbitrario.
- **Singleton memoizado de storage (`_storage` en `index.ts:7`)** contamina entre tests del factory → resetear modulos (`vi.resetModules()`) o `useRuntimeConfig` stub por caso antes de re-importar el factory.
- **Mock de modelos Mongoose incompleto** (anonymizeUser, status.patch) → assertions con los argumentos exactos de `updateOne`/`updateMany`/`findOne` (valores concretos, no solo "fue llamado").

**Que NO se hace en este ticket** (limites de scope):

- Cero codigo productivo. No se exporta `isAllowedRoom`, no se elimina `r2.ts` (ambos → backlog).
- No se testea `r2.ts` (fuera de roadmap — Decision #2 del intake).
- No se levanta docker/mongo ni dev server: todo corre con `pnpm test` + `pnpm test:integration`.

**Tamano estimado**: 3 sessions ejecutables (S1-S3), aproximadamente 4-6h efectivas. La mas riesgosa es S3 (sockets realtime, timing async + wiring del server in-process).

**Como vas a saber que funciona**:

- `pnpm test` corre verde con los nuevos archivos unit (storage factory, anonymizeUser, reports download, status.patch).
- `pnpm test:integration` corre verde con el test de sockets realtime (cliente real recibe el emit del server; handshake sin cookie rechazado).
- La suite existente sigue verde (cero regresion).

---

## Purpose

Cerrar los 5 huecos de cobertura de alto riesgo detectados en la re-auditoria 2026-07-19, para que el corte de migracion tenga una red de seguridad sobre storage, compliance PII, ownership de reportes, guards RBAC y notificaciones realtime. Audiencia: dev de migracion (red de regresion) y ops (compliance Ley 21.719 verificable).

## Requirements

### REQ-IMPROVE-01: Cobertura del storage in-system (factory + railway)

> **Que cambia**: se agrega un test unit que ejercita el selector de provider (`useAppStorage`) y el adapter `RailwayVolumeStorage`, hoy sin cobertura (solo `LocalStorage` esta testeado).
> **Por que**: el provider real en prod es `local`/`railway` (filesystem); un bug en el switch o en la resolucion de `storagePath` de railway no lo detecta nada hoy.

El sistema de tests MUST cubrir: (a) `useAppStorage()` retorna `LocalStorage` con provider `local`/default y respeta `storagePath`; (b) retorna `RailwayVolumeStorage` con provider `railway` y default `/data/uploads`; (c) el round-trip upload/download/delete/exists del adapter railway sobre un dir temporal.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: factory selecciona local por default
- **GIVEN** `storageProvider` no seteado (o `'local'`) y `storagePath` = tmp dir
- **WHEN** se invoca `useAppStorage()`
- **THEN** retorna instancia con `name === 'local'` y opera sobre el tmp dir

#### Scenario: factory selecciona railway
- **GIVEN** `storageProvider = 'railway'` y `storagePath` = tmp dir
- **WHEN** se invoca `useAppStorage()`
- **THEN** retorna instancia con `name === 'railway-volume'`

#### Scenario: railway round-trip
- **GIVEN** un `RailwayVolumeStorage` sobre tmp dir
- **WHEN** upload(buffer, {domain:'rumas'}) → download(key) → delete(key) → exists(key)
- **THEN** la key matchea el patron `rumas/...`, download devuelve el mismo buffer + contentType, exists post-delete es false

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `pnpm test` y ve el archivo de storage-factory verde con los 3 escenarios.

### REQ-IMPROVE-02: Cobertura de anonymizeUser (compliance PII)

> **Que cambia**: unit test nuevo para `anonymizeUser(userId)`.
> **Por que**: limpia PII (Ley 21.719) y debe preservar referencias (`createdBy`); cero tests hoy.

El sistema de tests MUST verificar que `anonymizeUser` (a) actualiza el `User` con `nombre='Usuario eliminado'`, `email='deleted-{id}@anonimo.local'`, `password='DELETED'`, `active=false`, `$inc tokenVersion=1`; (b) anonimiza los `AuditLog` del usuario (`userEmail='anonimo'`, `$unset ip`) SIN borrar el `userId` (la referencia sobrevive).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: anonimiza User
- **GIVEN** `User.updateOne` mockeado
- **WHEN** `anonymizeUser('abc')`
- **THEN** se llama con filtro por id y el set exacto de campos PII + `$inc tokenVersion`

#### Scenario: preserva referencia en AuditLog
- **GIVEN** `AuditLog.updateMany` mockeado
- **WHEN** `anonymizeUser('abc')`
- **THEN** se llama con `{ userId: 'abc' }` + `{ userEmail:'anonimo', $unset:{ip:''} }` (el `userId` NO se toca)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `pnpm test` muestra el test de anonymizeUser verde asertando los argumentos exactos.

### REQ-IMPROVE-03: Cobertura de descarga de reportes (ownership)

> **Que cambia**: unit test handler-invocation para `reports/file.get.ts`.
> **Por que**: valida ownership contra la coleccion `Reporte`; cero cobertura del handler.

El sistema de tests MUST verificar que el handler: (a) sin `name` → 400; (b) `name` que no pertenece al usuario (o inexistente) → 404 antes de tocar storage; (c) owner valido → llama `useAppStorage().download` con la key y setea headers `Content-Type` + `Content-Disposition attachment`.

**Actor**: user
**Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin name → 400
- **GIVEN** `getQuery` retorna `{}`
- **WHEN** se invoca el handler
- **THEN** lanza error `statusCode: 400`

#### Scenario: name ajeno → 404
- **GIVEN** `Reporte.findOne` retorna null
- **WHEN** se invoca con `name='reports/x'`
- **THEN** lanza error `statusCode: 404` y NO invoca storage.download

#### Scenario: owner descarga
- **GIVEN** `Reporte.findOne` retorna `{archivo:'reports/x'}` y storage.download retorna buffer+contentType
- **WHEN** se invoca el handler
- **THEN** setea Content-Type y Content-Disposition attachment, retorna el buffer

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `pnpm test` muestra el test de reports download verde con los 3 casos.

### REQ-IMPROVE-04: Cobertura de RBAC status.patch (guards, paridad legacy)

> **Que cambia**: unit test handler-invocation para `auth/users/[id]/status.patch.ts`.
> **Por que**: dos guards heredados del legacy (self-toggle, ADMIN-over-ADMIN) sin ningun test. RULE-MIGRATION-004 aplica (paridad pura).

El sistema de tests MUST verificar: (a) un usuario cambiando su propio status → **400** (`currentUser._id === id`); (b) un no-ADMIN (ej. SUPERVISOR) intentando togglear a un ADMIN → **403**; (c) un ADMIN toggleando a otro usuario → OK (toggle `active`, audit, `emitToRoom('users-ALL', ...)`).

**Actor**: admin
**Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: self-toggle → 400
- **GIVEN** `requireRole` retorna `{_id:'u1', role:'ADMINISTRADOR'}`, router param id = `'u1'`
- **WHEN** se invoca el handler
- **THEN** lanza error `statusCode: 400` ("No puede cambiar su propio estado")

#### Scenario: no-ADMIN sobre ADMIN → 403
- **GIVEN** `requireRole` retorna `{_id:'sup', role:'SUPERVISOR'}`, target `User.findOne` retorna `{role:'ADMINISTRADOR'}`
- **WHEN** se invoca el handler
- **THEN** lanza error `statusCode: 403`

#### Scenario: ADMIN sobre otro OK
- **GIVEN** `requireRole` retorna ADMIN, target retorna user con `.save()`/`.toPublicData()`, distinto id
- **WHEN** se invoca el handler
- **THEN** togglea `active`, invoca `audit` con `STATUS_CHANGE` y `emitToRoom('users-ALL', 'updated-user-state', ...)`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `pnpm test` muestra el test de status.patch verde con los 3 guards (incluyendo 400 en self-toggle).

### REQ-IMPROVE-05: Cobertura de sockets realtime end-to-end (criterio de corte)

> **Que cambia**: test de integracion in-process con socket.io Server + Client reales.
> **Por que**: hoy toda la cobertura de sockets es mock/replica; no existe un test que confirme que un cliente real recibe un emit real del server. Decision #1 del intake: criterio de corte OBLIGATORIO.

El sistema de tests MUST verificar, con un socket.io Server real (wireado con el handshake real `verifyAccessTokenFull` y `_setSocketIO`/`emitToRoom` reales) y un `socket.io-client` real: (a) cliente con cookie `pehuen_at` valida conecta, se une a una room, el server llama `emitToRoom(room, event, payload)` y el cliente RECIBE el payload; (b) handshake sin cookie es rechazado (`connect_error`); (c) handshake con token invalido es rechazado. La exactitud de `isAllowedRoom` se cubre por contrato contra `shared/constants/socket-rooms.ts` (los nombres de room del emit son los del contrato).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: emit del server → cliente real recibe
- **GIVEN** Server real con handshake real + cliente conectado con cookie `pehuen_at=<JWT valido minteado>` unido a room `rumas`
- **WHEN** el server invoca `emitToRoom('rumas', 'nueva-ruma', {id:'r1'})`
- **THEN** el cliente recibe el evento `nueva-ruma` con `{id:'r1'}` dentro del timeout

#### Scenario: handshake sin cookie → rechazado
- **GIVEN** cliente sin cookie
- **WHEN** intenta conectar
- **THEN** emite `connect_error` con mensaje "No autenticado"

#### Scenario: handshake token invalido → rechazado
- **GIVEN** cliente con cookie `pehuen_at=basura`
- **WHEN** intenta conectar
- **THEN** emite `connect_error` ("Token inválido")

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `pnpm test:integration` muestra el test de sockets realtime verde: cliente recibe el emit, y los dos handshakes invalidos son rechazados.

### REQ-PRESERVE-01: Cero regresion + cero codigo productivo

> **Que cambia**: nada de codigo productivo.
> **Por que**: el ticket es test-only; la suite existente debe seguir verde.

El trabajo MUST no modificar ningun archivo fuera de `pehuen_nuxt/tests/` (salvo, si fuera imprescindible, un helper de test bajo `tests/helpers/`). La suite existente MUST seguir verde tras agregar los nuevos tests.

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin cambios productivos
- **GIVEN** el diff del ticket
- **WHEN** se revisa `git diff --stat`
- **THEN** solo hay archivos bajo `tests/` (y opcional `tests/helpers/`)

#### Scenario: suite verde
- **GIVEN** la suite unit + integration previa
- **WHEN** se corre `pnpm test` y `pnpm test:integration`
- **THEN** todo verde, sin tests previos rotos

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `git diff --stat` muestra solo `tests/`; la suite completa corre verde.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | RBAC guards derivados 1:1 del legacy (RULE-MIGRATION-004) | area 4 | self→400, no-ADMIN sobre ADMIN→403 |
| Compliance | PII anonimizada verificable (Ley 21.719) | area 2 | campos PII + refs preservadas asertados |

## Baseline (estado actual — DET-7)

Verificado 2026-07-19 contra `pehuen_nuxt`:

| Area | Cobertura actual | Evidencia |
|------|-----------------|-----------|
| 1 storage | Solo `LocalStorage` (`local.test.ts`, 6 tests). `index.ts` factory + `railway.ts` = 0 | grounding intake-explore |
| 2 anonymizeUser | 0 tests | `tests/unit/server/services/` no lo referencia |
| 3 reports download | 0 (el `reports-routes.test.ts` solo testea schema, no invoca el handler) | grounding |
| 4 status.patch | 0 (migration-paridad cubrio otras rutas de `/api/auth/*`) | grounding |
| 5 sockets realtime | Solo mock/replica (`socket.test.ts`, `useDomainSocket.test.ts`); 0 round-trip real | grounding |

Estado deseado: +5 archivos de test (4 unit + 1 integration) cubriendo los escenarios de arriba. Delta = solo tests; cero codigo productivo.

## Tasks

### Session 1 — Storage in-system + anonymizeUser (unit foundations)

Objetivo: cubrir area 1 (factory + railway) y area 2 (anonymizeUser). Tier T1. Tipo: auto.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | Test unit del factory `useAppStorage` (local/railway/default) + round-trip de `RailwayVolumeStorage` sobre tmp dir | REQ-IMPROVE-01 | developer | — | `tests/unit/server/utils/storage/index.test.ts` (nuevo), `tests/unit/server/utils/storage/railway.test.ts` (nuevo) | `pnpm test` verde; 3 escenarios de REQ-01 asertados con valores concretos (name, key pattern, buffer roundtrip) | git revert de los archivos nuevos | [DET-1, DET-2, DET-7, DET-11] | pending | — |
| S1.T2 | Test unit de `anonymizeUser` con `vi.mock` de User+AuditLog; asertar set PII exacto + preservacion de `userId` en AuditLog | REQ-IMPROVE-02 | developer | — | `tests/unit/server/services/user-anonymize.test.ts` (nuevo) | `pnpm test` verde; args exactos de `updateOne`/`updateMany` asertados | git revert del archivo nuevo | [DET-1, DET-2, DET-7, DET-11] | pending | — |
| S1.GATE | Gate S1: lint+typecheck+test del workspace pehuen-nuxt; quality review light (T1); commit local DET-27 | — | reviewer | S1.T1, S1.T2 | — | `pnpm test` + `pnpm lint` + `pnpm typecheck` verdes; sin console.*; commit local `PEH-023 [pehuen-nuxt] test: ...` | N/A (gate) | [DET-13, DET-23, DET-27, DET-33] | pending | — |

### Session 2 — Reports download + RBAC status.patch (handler-invocation)

Objetivo: cubrir area 3 (ownership/404/400) y area 4 (guards RBAC). Tier T1. Tipo: auto.

parallel_groups: [[S2.T1, S2.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S2.T1 | Test handler-invocation de `reports/file.get.ts`: sin name→400, ajeno→404 (sin tocar storage), owner→download+headers | REQ-IMPROVE-03 | developer | — | `tests/unit/server/api/reports-file-get.test.ts` (nuevo) | `pnpm test` verde; 3 escenarios REQ-03; verifica que 404 NO invoca `download` | git revert del archivo nuevo | [DET-1, DET-2, DET-7, DET-11] | pending | — |
| S2.T2 | Test handler-invocation de `status.patch.ts`: self→400, no-ADMIN sobre ADMIN→403, ADMIN sobre otro→toggle+audit+emit | REQ-IMPROVE-04 | developer | — | `tests/unit/server/api/users-status-patch.test.ts` (nuevo) | `pnpm test` verde; 3 guards; asserta 400 en self (no 403) y el `emitToRoom('users-ALL',...)` | git revert del archivo nuevo | [DET-1, DET-2, DET-7, RULE-MIGRATION-002] | pending | — |
| S2.GATE | Gate S2: lint+typecheck+test; quality review light (T1); commit local DET-27 | — | reviewer | S2.T1, S2.T2 | — | suite verde; sin console.*; commit local | N/A (gate) | [DET-13, DET-23, DET-27, DET-33] | pending | — |

### Session 3 — Sockets realtime end-to-end (integration, criterio de corte)

Objetivo: cubrir area 5 con Server+Client reales in-process. Tier T2. Tipo: ⚑ fuerte (criterio de corte + validacion empirica de round-trip async).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S3.T1 | Test integration: socket.io Server real con handshake `verifyAccessTokenFull` real + `_setSocketIO`/`emitToRoom` reales; cliente real con cookie recibe emit; handshake sin cookie y con token invalido rechazados | REQ-IMPROVE-05 | developer | — | `tests/integration/socket-realtime.test.ts` (nuevo) | `pnpm test:integration` verde; cliente recibe payload dentro de timeout; 2 handshakes invalidos → connect_error; cierre determinista de server/client | git revert del archivo nuevo | [DET-1, DET-5, DET-7, DET-13] | pending | — |
| S3.GATE | Gate S3: `pnpm test` + `pnpm test:integration` + lint + typecheck; quality review standard (T2); evidencia runtime del receive; commit local DET-27 | — | reviewer | S3.T1 | — | suite completa verde; evidencia runtime (log/assert con marca de corrida) del receive; sin console.*; commit local | N/A (gate) | [DET-13, DET-23, DET-27, DET-33, DET-36] | pending | — |

## Constraints

- **REQ-PRESERVE-01** (cero codigo productivo): solo `tests/`. No exportar `isAllowedRoom`, no borrar `r2.ts` (backlog).
- **RULE-MIGRATION-002** / RULE-MIGRATION-004: area 4 deriva los guards 1:1 del legacy (paridad pura).
- **DET-7**: cada test traza a un REQ; regression cubierta por REQ-PRESERVE-01.
- Sin `console.*` en tests (usar assertions); timeouts explicitos en el test async de sockets.

## Dependencies

- Ninguna externa. `socket.io`, `socket.io-client`, `jsonwebtoken`, `cookie` ya son deps del proyecto.
- No requiere docker/mongo/dev-server.

## Risks

- **Flakiness del test de sockets** (timing async) → `once()` + timeout del test + teardown determinista.
- **Singleton de storage memoizado** → `vi.resetModules()` / stub de `useRuntimeConfig` por caso.

## Open questions

- Ninguna bloqueante. Backlog: exportar `isAllowedRoom` para test directo (#2), eliminar `r2.ts` (#1) — ambos `could`.

## Acceptance

- `pnpm test` verde con los 4 archivos unit nuevos (storage factory+railway, anonymizeUser, reports download, status.patch).
- `pnpm test:integration` verde con el test de sockets realtime.
- `git diff --stat` solo toca `tests/`.
- Suite previa sin regresion.
