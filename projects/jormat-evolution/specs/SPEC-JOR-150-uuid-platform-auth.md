---
id: SPEC-JOR-150-uuid-platform-auth
project: jormat-evolution
ticket: JOR-150
status: done
---

# Validacion de formato uuid en la frontera de plataforma/auth (cerrar los 500 y el header admin sin validar)

# Validacion de formato uuid en la frontera de plataforma/auth (cerrar los 500 y el header admin sin validar)

## Executive summary — lo que estas aprobando

**Que se quiere**: endurecer la frontera de plataforma/auth a un baseline de validacion de formato uuid, cerrando el backlog B6 de [[JOR-149]]. Hoy tres superficies aceptan un valor externo sin validar su forma y lo llevan directo a una columna `uuid`: `PATCH /workspaces/:id` revienta con un 500 crudo de Postgres ante un `:id` malformado, el header `X-Admin-Workspace` se usa crudo cuando el override de admin esta activo (alimenta `tenantScoped()` en casi toda query del producto), y `workspaces.service` mantiene una tercera copia inline del patron uuid en vez de importar la fuente unica creada en [[JOR-149]]. Sin cambio de esquema — solo guards de formato.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `PATCH /api/workspaces/:id` responde 400 (`ParseUUIDPipe`), no 404 | Consistente con `delete()` del mismo servicio (ya daba 400) y con los controllers hermanos `users-admin`/`roles`. Evita un tercer estandar de error dentro de la misma frontera |
| 2 | El header `X-Admin-Workspace` solo se valida cuando efectivamente se usa (`isAdmin && adminWorkspaceOverride`) | Validar incondicionalmente rompe al no-admin, que hoy ve el header ignorado sin riesgo — validarlo sin usarlo seria una regresion de superficie sin beneficio |
| 3 | La verificacion de que el admin tenga permiso sobre el workspace override (authz, no solo formato) queda fuera de este ticket | Es una capa de authz mayor (roza O-2/O-3 de [[RULE-global-002]]); el internal-admin es hoy superadmin global, asi que no hay gate de negocio pendiente todavia. Sale a backlog `could` (D-AUTHZ) |

**Riesgos principales y como los mitigamos**:

- **Barrer solo `update()` y dejar `findById()`/lecturas asimetricas** → el P1 del request pide barrer TODOS los metodos de `workspaces.service` con un `:id` externo, no solo `update`; S1.T1 cubre `update` y `findById` (y `delete()` ya lo tenia).
- **Validar el header y usar el valor sin normalizar** (`req.headers['x-admin-workspace']` puede llegar como array) → `String(override)` se usa tanto para validar como para el valor asignado a `resolvedWorkspaceId`, cerrando la brecha teorica array-header.
- **Romper el aislamiento de tenant al tocar `AuthGuard`** → el guard solo corre bajo el predicado exacto que ya consume el override (`isAdmin && adminWorkspaceOverride`); un no-admin sigue viendo el header ignorado, sin cambio de comportamiento.

**Que NO se hace en este ticket**:

- Verificar que el internal-admin tenga permiso sobre el workspace override (D-AUTHZ) — follow-up separado, backlog `could`.
- Migrar la identidad de dos campos (serial + uuid) en tablas de plataforma/auth (B3 de [[JOR-149]]) — decision de arquitectura aparte, sin relacion con este ticket.
- Cualquier cambio de esquema — el ticket es guards de formato + un import.

**Tamano estimado**: 1 session (T3, dual-judge). Ejecutada en 2 rondas de juicio (1 iterate).

**Como vas a saber que funciona**:

- `PATCH /api/workspaces/{no-uuid}` responde 400, no un error de Postgres en el log.
- Un `X-Admin-Workspace` malformado, cuando el override esta activo, responde 400 en vez de tumbar el endpoint.
- Un no-admin sigue viendo el header ignorado sin cambio de comportamiento (regresion de tenant/DoS descartada).
- No queda una copia inline de la regex uuid en `workspaces.service.ts`.
- Unit (727), guardarrail e2e (6) y suite e2e completa (230) en verde. Sin cambio de esquema.

---

## Purpose

Cerrar las tres superficies del backlog B6 de [[JOR-149]] que aceptan un identificador o header uuid sin validar su formato en la frontera de plataforma/auth: el `:id` de `PATCH /workspaces/:id`, el header `X-Admin-Workspace` que alimenta `tenantScoped()`, y la copia inline duplicada de la regex uuid en `workspaces.service.ts`. Alcance acotado a validacion de formato — sin tocar esquema ni agregar una capa de autorizacion nueva.

## Requirements

### REQ-1: `PATCH /workspaces/:id` valida el formato uuid del `:id`, y el guard se extiende a toda la superficie de `workspaces.service`

> **Que cambia**: `PATCH /api/workspaces/:id` responde 400 ante un `:id` que no tiene forma de uuid, en vez de un 500 crudo de Postgres. `workspaces.service.update()` y `findById()` ganan el mismo guard `UUID_RE` que ya tenia `delete()`.
> **Por que**: hoy `delete()` valida y `update()` no — una asimetria interna en el mismo servicio; el request pide barrer TODOS los metodos con un `:id` externo, no solo el que motivo el hallazgo original.

El sistema MUST decorar `@Param('id')` de `PATCH /api/workspaces/:id` con `ParseUUIDPipe`, alineado con los controllers hermanos `users-admin`/`roles`. El sistema MUST guardar `workspaces.service.update()` y `findById()` con el mismo `UUID_RE` que usa `delete()`, retornando el comportamiento equivalente (400/`BadRequestException`) ante un valor no-uuid.

**Actor**: admin · **Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: id malformado en update
- **GIVEN** un workspace existente, **WHEN** `PATCH /api/workspaces/abc`, **THEN** 400, nunca un 500 de Postgres.

#### Scenario: findById con id malformado
- **GIVEN** cualquier llamado interno a `workspaces.service.findById('abc')`, **WHEN** se invoca, **THEN** falla con el guard de formato, no con una excepcion cruda de Postgres.

#### Scenario: id valido intacto
- **GIVEN** un workspace existente, **WHEN** `PATCH /api/workspaces/{uuid}` con payload valido, **THEN** 200, sin cambio de comportamiento.

</details>

#### Acceptance
Pegarle a `PATCH /workspaces/{id}` con un id inventado devuelve un 400 explicito, no un error de servidor.

### REQ-2: el header `X-Admin-Workspace` se valida en formato uuid cuando el override de admin esta activo

> **Que cambia**: si `isAdmin && adminWorkspaceOverride`, el header `X-Admin-Workspace` se valida como uuid en `auth.guard.ts` antes de usarse; si no tiene forma de uuid, la request corta con 400. Un no-admin sigue viendo el header ignorado, sin cambio.
> **Por que**: el header alimenta `resolvedWorkspaceId`, que a su vez alimenta `tenantScoped()` en casi toda query del producto — es el riesgo O-3 documentado en [[RULE-global-002]]. Un header malformado no debe poder tumbar un endpoint ajeno.

El sistema MUST validar el formato uuid del header `X-Admin-Workspace` en `auth.guard.ts`, SOLO bajo el predicado `isAdmin && adminWorkspaceOverride` (el mismo que consume el override hoy). Ante un header malformado bajo ese predicado, el sistema MUST rechazar la request con `BadRequestException` (400). El valor asignado a `resolvedWorkspaceId` MUST normalizarse con `String(override)`, igual que el valor validado, para que la validacion y el uso no diverjan ante un header array. Un usuario no-admin, o un admin sin `adminWorkspaceOverride`, MUST seguir viendo el header ignorado exactamente como hoy (sin regresion de tenant/DoS).

**Actor**: admin, system · **Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: header malformado con override activo
- **GIVEN** un internal-admin con `adminWorkspaceOverride`, **WHEN** una request trae `X-Admin-Workspace: abc`, **THEN** 400, y ningun otro tenant se ve afectado.

#### Scenario: header valido con override activo (regresion)
- **GIVEN** el mismo admin, **WHEN** la request trae `X-Admin-Workspace: {uuid valido}`, **THEN** el override funciona como hoy, sin regresion.

#### Scenario: no-admin con header malformado
- **GIVEN** un usuario no-admin, **WHEN** la request trae `X-Admin-Workspace: abc`, **THEN** el header se ignora exactamente como hoy — no se valida ni se rechaza, porque el predicado de uso no aplica.

</details>

#### Acceptance
Un `X-Admin-Workspace` malformado con el override activo corta con 400 en vez de reventar cualquier endpoint del producto; el camino no-admin queda intacto.

### REQ-3: dedupe de la copia inline de `uuidRegex` en `workspaces.service.ts`

> **Que cambia**: `workspaces.service.ts` deja de declarar su propia regex uuid local y pasa a importar `UUID_RE` de `common/uuid.util.ts`.
> **Por que**: es la tercera copia del mismo patron detectada en el dominio (las otras dos ya se unificaron en [[JOR-149]]); mantenerla diverge de la fuente unica sin necesidad.

El sistema MUST reemplazar la declaracion inline `uuidRegex` de `workspaces.service.ts` por el import de `UUID_RE` desde `common/uuid.util.ts`, sin alterar el patron ni el comportamiento de ningun consumidor existente.

**Actor**: system · **Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin copia inline
- **GIVEN** el archivo `workspaces.service.ts`, **WHEN** se inspecciona, **THEN** no queda ninguna declaracion local de la regex uuid — solo el import.

</details>

#### Acceptance
Behavior-neutral: la misma regex, una sola fuente.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | Ningun endpoint de plataforma expone un 500 crudo de Postgres ante un id/header no-uuid | superficies con 500 | 0 |
| Security | El aislamiento de tenant no se regresiona al validar el header admin | e2e no-admin + header malformado | comportamiento identico al pre-ticket (header ignorado) |
| Testing | Suite completa en verde sin bajar coverage | unit / e2e | 727 unit / 6 guardarrail / 230 full e2e |

## Artifacts

_(sin meta-specs registrados para este proyecto — sin secciones ad-hoc adicionales; el cambio es guards de formato + un import, cubierto por Requirements)_

## Tasks

### Session 1 — Guards de formato uuid en plataforma/auth (workspaces + X-Admin-Workspace) [tipo: ⚑ fuerte] [tier: T3]

> `⚑ fuerte`: S1.T2 toca `auth.guard.ts`, que corre en casi toda request del producto — riesgo de regresion de aislamiento de tenant si el predicado se amplia de mas. Dual-judge (DET-35, T3).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | `ParseUUIDPipe` en `PATCH /workspaces/:id` (controller) + dedupe de `UUID_RE` en `workspaces.service.ts` (borrar `uuidRegex` inline, importar del util); guard `UUID_RE` en `update()` | REQ-1, REQ-3 | developer | — | backend/jormat-api/src/workspaces/workspaces.controller.ts, backend/jormat-api/src/workspaces/workspaces.service.ts | unit workspaces verde; `PATCH /workspaces/{no-uuid}` -> 400; `tsc` sin error | git revert | DET-40, RULE-api-001 | done | 1 |
| S1.T2 | Validar formato uuid del header `X-Admin-Workspace` en `auth.guard.ts`, solo bajo `isAdmin && adminWorkspaceOverride`; `String(override)` tanto en la validacion como en el valor asignado a `resolvedWorkspaceId` | REQ-2 | developer | — | backend/jormat-api/src/auth/auth.guard.ts | unit auth verde; header malformado con override activo -> 400; no-admin con header malformado sigue ignorandolo | git revert | DET-40, RULE-global-002 | done | 1 |
| S1.T3 | Tests: unit del guard + caso guardarrail e2e sobre `workspaces`/`auth` que confirme que ningun endpoint de plataforma da 500 ante id/header no-uuid | REQ-1, REQ-2, REQ-3 | developer | S1.T1, S1.T2 | backend/jormat-api/src/**/*.spec.ts, backend/jormat-api/test/e2e/ | unit + e2e guardarrail verdes | git revert | DET-7, DET-13 | done | 1 |
| S1.T4 | Iterate del gate (juez B, ronda 1): guard `UUID_RE` en `findById()` de `workspaces.service.ts` (P1 completo, DET-40 — findById quedaba fuera pese a que el request pide barrer TODOS los metodos); TC2 reescrito a un solo `canActivate` (evitar doble invocacion fragil); e2e nuevo de no-admin + header malformado (confirma que el camino no-admin no se regresiona) | REQ-1, REQ-2 | developer | S1.T3 | backend/jormat-api/src/workspaces/workspaces.service.ts, backend/jormat-api/src/auth/auth.guard.spec.ts, backend/jormat-api/test/e2e/ | unit + e2e verdes; los 3 hallazgos del juez B confirmados cerrados en re-judge | git revert | DET-33, DET-35, DET-40 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir en `## Sessions`, correr unit+e2e+coverage, dual-judge (DET-35) con 1 iterate, self-report verification (DET-33), auditoria de reemplazo (DET-40) sobre `findById`/`update`, decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision documentada + reviewer approved tras 1 iterate | (no aplica — cierre de session) | DET-20, DET-23, DET-33, DET-35, DET-40 | done | 1 |

### Task contract (notas de ejecucion)

```
Task S1.T2: Validacion del header X-Admin-Workspace
- source_ref: REQ-2
- precondition: S1.T1 no bloqueante (archivos disjuntos)
- expected_output: header malformado con override activo -> 400; no-admin sin cambio
- validation: unit auth.guard + e2e no-admin + header malformado
- rollback: git revert
- rules: [DET-40, RULE-global-002]
- nota critica: el predicado de validacion debe ser EXACTAMENTE el mismo que el de uso
  (isAdmin && adminWorkspaceOverride) — validar fuera de ese predicado regresiona al no-admin

Task S1.T4: Iterate del gate (findById + TC2 + e2e no-admin)
- source_ref: REQ-1, REQ-2
- precondition: S1.T3 (gate ronda 1, juez B iterate)
- expected_output: findById guardado; TC2 single-call; e2e no-admin agregado
- validation: unit + e2e verdes, re-judge ronda 2 approved
- rollback: git revert
- rules: [DET-33, DET-35, DET-40]
```

## Constraints

- [[RULE-api-001]]: el serial nunca cruza la frontera de la API — no aplica directo (plataforma/auth no tiene identidad de dos campos), pero el estandar de guard de formato uuid es el mismo patron que RULE-api-001 exige en el dominio.
- [[RULE-global-002]]: baseline de seguridad — el riesgo O-3 (header admin sin validar alimentando `tenantScoped()`) es exactamente el que este ticket cierra.
- DET-40 (auditoria de reemplazo): barrer TODOS los metodos de `workspaces.service` que reciben un `:id` externo, no solo el que motivo el hallazgo original — el iterate de S1.T4 es la aplicacion directa de esta regla.
- D-PLATFORM (heredada de [[JOR-149]]): las tablas de plataforma/auth quedan fuera de cualquier migracion de esquema; este ticket no la toca.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| [[JOR-149]] (backlog B6) | internal | origen del hallazgo y de `common/uuid.util.ts` (`UUID_RE` fuente unica que este ticket reutiliza) | ninguno — B6 esta cerrado por este ticket |
| `auth.guard.ts` | internal | corre en casi toda request del producto; el cambio de S1.T2 debe acotarse al predicado exacto de uso del override | regresion de aislamiento de tenant si el predicado se amplia |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Validar el header fuera del predicado `isAdmin && adminWorkspaceOverride` | medium | regresion de tenant/DoS para el no-admin | predicado identico al de uso, verificado con e2e no-admin + header malformado (agregado en el iterate) |
| Barrer solo `update()` y dejar `findById()` sin guard | high (fue justo el hallazgo del juez B) | P1 incompleto, asimetria interna persiste | S1.T4 cierra `findById()`; DET-40 verificado explicitamente en el gate |
| `String(header)` inconsistente entre validacion y uso | low | brecha teorica con header array | mismo `String(override)` en ambos puntos |

## Open questions

_(ninguna — D-CODE y D-AUTHZ quedaron resueltas en decisions_log del ticket)_

## Decisions

### DEC-LOCAL-01: `PATCH /workspaces/:id` responde 400, no 404
- **Contexto**: `delete()` de `workspaces.service` ya lanzaba `BadRequestException` (400) ante id malformado; el dominio de inventario ([[JOR-149]]) usa 404 para el mismo caso.
- **Drivers**: consistencia interna del servicio de plataforma; los controllers hermanos `users-admin`/`roles` ya usan `ParseUUIDPipe` (400).
- **Opcion elegida**: 400, alineado con `delete()` y con los controllers hermanos de plataforma.
- **Alternativas**: 404 (descartada: crea un tercer estandar de error distinto al que ya usa `delete()` del mismo servicio).
- **Consecuencias**: plataforma/auth queda consistente en 400 para formato invalido; inventario sigue en 404 — son fronteras distintas, sin necesidad de unificar entre si.
- **Session**: 1

### DEC-LOCAL-02: el header `X-Admin-Workspace` se valida solo en formato, no en autorizacion (D-AUTHZ)
- **Contexto**: el request dejaba abierta la pregunta de si extender la validacion a verificar que el internal-admin tenga permiso sobre el workspace override, no solo su forma.
- **Drivers**: el internal-admin es hoy superadmin global — no hay un gate de negocio de "admin con alcance parcial" todavia; construir la capa de authz sin ese caso de uso real seria anticiparse sin necesidad (DET-32).
- **Opcion elegida**: `format-only` — cerrar el 500, no extender a authz.
- **Alternativas**: extender a verificar el permiso del admin sobre el workspace (descartada para este ticket: mayor superficie, sin caso de uso que lo motive hoy).
- **Consecuencias**: queda registrado en backlog `could` como follow-up, condicionado a que aparezca un admin de alcance parcial.
- **Session**: 1

## Technical reference

- `backend/jormat-api/src/workspaces/workspaces.service.ts`: `delete()` ya validaba con `uuidRegex` local; `update()` y `findById()` no.
- `backend/jormat-api/src/workspaces/workspaces.controller.ts`: `@Patch(':id')` sin `ParseUUIDPipe` en `@Param('id')`.
- `backend/jormat-api/src/auth/auth.guard.ts`: lee el header en `X-Admin-Workspace`; `resolvedWorkspaceId` se arma cuando `isAdmin && adminWorkspaceOverride`; se consume mas abajo como `workspaceId` para `tenantScoped()`.
- `backend/jormat-api/src/common/uuid.util.ts`: `UUID_RE`, fuente unica creada en [[JOR-149]].
- Precedente de patron: controllers hermanos `users-admin`/`roles` ya usan `ParseUUIDPipe` -> 400.

## Rules discovered

_(ninguna nueva — el patron ya vive en RULE-api-001/RULE-global-002)_

## Bugs found

_(ninguno — los 3 puntos eran gaps de validacion conocidos, no bugs nuevos)_

## Acceptance checkpoints

- [x] **Funcional**: `PATCH /workspaces/:id` malformado -> 400; header `X-Admin-Workspace` malformado con override activo -> 400; no-admin con header malformado sin cambio; sin copia inline de `uuidRegex`.
- [x] **Tests** (DET-37 dim4): unit (727) + guardarrail e2e (6) + full e2e (230) corridos y en VERDE.
- [x] **NFRs**: 0 superficies de plataforma con 500 ante id/header malformado; aislamiento de tenant intacto.
- [x] **Rules**: [[RULE-api-001]] (patron de guard uuid) y [[RULE-global-002]] (O-3) respetadas.
- [x] **Integration**: sin regresion del camino no-admin; `tsc` clean.
- [x] **Docs oficiales**: N/A — cambio de comportamiento esperado (cierre de un gap de validacion ya documentado como backlog en JOR-149), sin contrato nuevo que documentar aparte.
- [x] **KB DKC**: candidato a reforzar nota en [[RULE-global-002]] sobre O-3 (registrado como observacion, no como nueva rule — el hallazgo ya estaba documentado).
- [x] **Docs externas DKC**: N/A — el ticket no toca DKC ni convenciones transversales.
- [x] **Planning-completeness**: registrada como `mixed` en `decisions_log` del ticket.

## Archiving

Sin archivar — spec vigente, fuente de verdad del cierre de B6.
