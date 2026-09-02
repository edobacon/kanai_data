---
id: SPEC-workspaces-admin-active-robustness
project: jormat-evolution
ticket: JOR-036
status: done
---

# Fix: robustez del workspace activo del internal-admin (override stale → listados vacíos sin señal)

# Fix: robustez del workspace activo del internal-admin (override stale → listados vacíos sin señal)

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy un internal-admin con un `admin_active_workspace` apuntando a un workspace inexistente (borrado/recreado por seed) ve TODOS los listados vacíos `[]` sin ninguna señal — el header `X-Admin-Workspace` se honra sin validar y las queries quedan scopeadas a un tenant fantasma. Este fix lo hace robusto en tres frentes aditivos, **sin tocar `auth.guard.ts` ni el contrato del header** (RULE-global-003): self-healing en el front cuando el override es inválido (B), estado visible del workspace activo en el switcher (C), y un endpoint admin-only que lista los workspaces para cablear el switcher multi-workspace real y validar el override (A).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `auth.guard.ts` NO se modifica — el "resolver override sin validar" se reporta como defecto heredado (BUG/observación), no se corrige ahí | RULE-global-003: `auth` es base entregada. El fix preventivo iría en el guard, pero la restricción manda → se cura en el borde (front) + se complementa aditivo |
| 2 | `GET /workspaces` (list) gateado por **rol `internal-admin`** (guard dedicado), no por capability `config.workspaces:view` | Enumerar TODOS los tenants es prerrogativa de plataforma, no una capability otorgable a un rol de tenant (otorgarla rompería aislación). Más honesto y simple |
| 3 | El endpoint devuelve **array plano** `WorkspaceSummary[]` (id/name/slug), no envelope paginado | El switcher necesita el set COMPLETO para poblar el dropdown y validar el override contra la lista; paginar lo rompería. Si la plataforma crece → endpoint de búsqueda (backlog) |
| 4 | Self-heal disparado por **404 de `GET /workspaces/current`** (no por listados `[]`) | El 404 es la única señal determinística de override stale (mismo workspaceId que el override). Los listados callan con `[]` → no sirven como trigger |

**Riesgos principales y como los mitigamos**:

- **Seguridad (RULE-global-002)** — `GET /workspaces` expone enumeración cross-tenant → gate `internal-admin` con test de autorización explícito (admin 200 / no-admin 403). Es el mayor riesgo; gate fuerte en S1.
- **Header stale persistente** — el interceptor (`api.ts:29`) lee `localStorage` directo; "limpiar" DEBE hacer `localStorage.removeItem(WORKSPACE_STORAGE_KEY)`, no solo resetear el store, o el header se sigue mandando. Test TC-3 lo fija.
- **Falso self-heal por red caída** — distinguir 404 (curar) de `NETWORK_ERROR` (status 0, no tocar) vía `ApiError.status`. Test TC-2 lo fija.
- **Loop de refetch** — tras limpiar el override, el refetch va sin header → resuelve al workspace propio (existe) → 200, no re-dispara. El heal se ejecuta una sola vez por override inválido (guarded por "había override").

**Que NO se hace en este ticket**:

- No se modifica `auth.guard.ts` ni el contrato `X-Admin-Workspace`.
- No se toca O-2 (PATCH `/workspaces/:id` sin authz) — vecino, fuera de alcance (se deja en backlog/observación).
- No se agrega capability nueva ni se toca el seed RBAC.
- No se pagina el listado de workspaces (set completo intencional).

**Tamano estimado**: 3 sessions (~3-4h), tier T2/T2/T3. La parte delicada: el gate de autorización del endpoint (S1) y verificar el stack dev limpio con el switcher cableado (S3).

**Como vas a saber que funciona**:

- Con un `admin_active_workspace` apuntando a un id inexistente: al cargar, el front detecta el 404, limpia el override, cae al workspace propio y los listados se pueblan; el switcher muestra el workspace activo correcto.
- `GET /workspaces` responde 200 con la lista para un internal-admin y 403 para un member/owner.
- El switcher lista los workspaces disponibles; seleccionar uno cambia el activo; si el activo no está en la lista, se marca "fuera de rango" y se limpia.

---

## Purpose

Eliminar el modo de fallo silencioso del override de workspace del internal-admin: un `admin_active_workspace` stale scopea toda query a un tenant inexistente y devuelve `[]` sin señal (observado en JOR-035). La corrección es aditiva (no toca la base entregada `auth`/contrato del header): cura el override inválido en el front ante el 404 de `/workspaces/current` (B), expone el estado del workspace activo en el `EmpresaSwitcher` (C) y agrega `GET /workspaces` admin-only para cablear el switcher multi-workspace real y validar el override contra la lista disponible (A).

## Diagnostico

- **Causa raíz**: `backend/jormat-api/src/auth/auth.guard.ts:72` — `resolvedWorkspaceId = (isAdmin && adminWorkspaceOverride) ? adminWorkspaceOverride : user.workspace_id`. Honra el override sin verificar que el workspace exista → queries scopeadas a un id fantasma → `[]`.
- **Señal**: `backend/jormat-api/src/workspaces/workspaces.service.ts:27-29` (`findById`) lanza `NotFoundException` → 404 en `GET /workspaces/current` (única ruta que resuelve el workspaceId del override contra la DB y falla ruidosamente).
- **Por qué no se detectó antes**: el switcher (`EmpresaSwitcher.tsx:49`) hoy solo ofrece el workspace propio como opción (`TODO` de multi-workspace) → el override stale llegó out-of-band (seed/db:reset recreó el ws con otro id, o set manual en dev).
- **Hipótesis** (del ticket): H1–H4 todas **✓ confirmadas** por lectura de código (ver JOR-036 § Triage).
- **Impacto**: solo internal-admin con override activo. Ningún dato corrupto; es un problema de resolución de scope + ausencia de feedback.

## Requirements

### REQ-FIX-01: self-heal del override inválido ante 404

> **Que cambia**: cuando `GET /workspaces/current` responde 404 y hay un override de workspace seteado, el front limpia el override (localStorage + store) y refetcha; el usuario cae a su workspace propio con datos, en vez de ver listados vacíos.
> **Por que**: el 404 prueba que el workspace activo no existe; sin auto-curación el admin queda atascado en un tenant fantasma sin señal.

<details><summary>Scenarios</summary>

- GIVEN un override stale en `localStorage['admin_active_workspace']` WHEN `useCurrentWorkspace` recibe 404 THEN se llama `clearActiveWorkspace()` (removeItem + reset del store) y se invalida/refetcha la query.
- GIVEN un override válido WHEN ocurre un `NETWORK_ERROR` (`ApiError.status === 0`) THEN el override NO se toca (no es señal de staleness).
- GIVEN ningún override (admin en su propio ws) WHEN `current` 404 (caso improbable: ws propio borrado) THEN no hay override que limpiar → no se entra en loop (no se re-dispara el heal).
</details>

### REQ-FIX-02: el contrato del header `X-Admin-Workspace` se preserva

> **Que cambia**: nada del contrato — el interceptor sigue leyendo `localStorage[WORKSPACE_STORAGE_KEY]` y mandando `X-Admin-Workspace` cuando hay override válido. El "limpiar" debe operar sobre esa misma key.
> **Por que**: el header es la base de la operación cross-tenant del internal-admin (restricción dura del dev).

<details><summary>Scenarios</summary>

- GIVEN un override válido WHEN se hace cualquier request THEN el header `X-Admin-Workspace` viaja con el valor del override.
- GIVEN `clearActiveWorkspace()` ejecutado WHEN se hace el siguiente request THEN NO viaja el header (la key fue removida del localStorage, no solo del estado en memoria).
</details>

### REQ-FIX-03: el override no sobrevive al logout (re-login limpio)

> **Que cambia**: `logout()` (auth.store) limpia el override (`localStorage.removeItem(WORKSPACE_STORAGE_KEY)`) **antes** del `logoutRedirect` de MSAL. Combinado con el self-heal por 404 (REQ-FIX-01), un re-login nunca arrastra un override stale.
> **Por que**: descubierto en vivo (JOR-036, L1) — el override vive en localStorage y nadie lo limpia en el ciclo de auth, así que un logout→login lo arrastra y el usuario queda roto hasta borrar localStorage a mano.

<details><summary>Scenarios</summary>

- GIVEN un admin con override seteado WHEN hace logout THEN se remueve `admin_active_workspace` antes del redirect → el próximo login arranca sin override.
- GIVEN un re-login que NO pasó por logout limpio (token expirado, tab cerrada) WHEN carga la app THEN el self-heal por 404 (REQ-FIX-01) cura el override en la primera llamada a `current`. (defensa en profundidad: logout-clear proactivo + 404-heal catch-all).
</details>

### REQ-A-01: `GET /workspaces` lista los workspaces para un internal-admin

> **Que cambia**: nuevo endpoint de lectura que devuelve `WorkspaceSummary[]` (id, name, slug) de todos los workspaces. Lo consume el switcher.
> **Por que**: hoy no existe forma de listar workspaces; el switcher no puede ofrecer multi-workspace ni validar el override contra el set real.

<details><summary>Scenarios</summary>

- GIVEN un usuario internal-admin WHEN `GET /api/workspaces` THEN 200 con array `[{id,name,slug}, ...]` (no envelope paginado).
</details>

### REQ-A-02: `GET /workspaces` rechaza a no-admins (403)

> **Que cambia**: el endpoint está gateado por rol `internal-admin`; cualquier otro rol recibe 403.
> **Por que**: enumerar todos los tenants es prerrogativa de plataforma; exponerlo a un rol de tenant rompe la aislación (RULE-global-002).

<details><summary>Scenarios</summary>

- GIVEN un usuario member/owner WHEN `GET /api/workspaces` THEN 403 Forbidden (el guard corta antes del service).
- GIVEN un internal-admin WHEN `GET /api/workspaces` THEN pasa el guard.
</details>

### REQ-C-01: el switcher muestra el workspace activo y un estado "fuera de rango"

> **Que cambia**: el `EmpresaSwitcher` lista los workspaces disponibles (de A), resalta el activo, y si el activo no está en la lista / `current` 404 muestra un estado claro "fuera de rango" en vez de un label ambiguo.
> **Por que**: cerrar el modo de fallo silencioso también del lado UX — el admin ve qué workspace está activo y cuándo está roto.

<details><summary>Scenarios</summary>

- GIVEN la lista cargada WHEN se abre el switcher THEN se ven los workspaces disponibles con el activo marcado.
- GIVEN el activo no está en la lista WHEN se renderiza THEN se muestra estado "fuera de rango" (no un UUID crudo silencioso).
</details>

### REQ-A-03: el override se valida contra la lista disponible al hidratar

> **Que cambia**: al montar el switcher con la lista de workspaces cargada, si el override activo no pertenece a la lista, se limpia (cae al propio) — defensa preventiva complementaria al self-heal por 404.
> **Por que**: cubre el caso donde el override es inválido aun antes de que algún `current` 404 (defensa en profundidad).

<details><summary>Scenarios</summary>

- GIVEN override = id no presente en la lista WHEN la lista termina de cargar THEN `clearActiveWorkspace()` y activo = workspace propio.
- GIVEN override = id presente en la lista WHEN la lista carga THEN no se toca.
</details>

### REQ-REGRESSION-01: las suites existentes siguen verdes

> **Que cambia**: nada debe romperse — jest (back) y vitest (front) verdes; `EmpresaSwitcher.test.tsx` existente sigue pasando (ajustado donde codifique el comportamiento previo).
> **Por que**: DET-7 — regresión obligatoria.

## Fix scope

### Antes (comportamiento actual)
- Override stale → `auth.guard` scopea a ws fantasma → listados `[]` sin señal; `GET /workspaces/current` 404 ignorado por la UI; switcher solo ofrece el ws propio.

### Despues (comportamiento esperado)
- 404 de `current` con override → front limpia override y refetcha (cae al propio, datos vuelven). Switcher lista workspaces (A), marca el activo y señala "fuera de rango" (C); valida el override al hidratar (A-03). Endpoint admin-only (403 a no-admins).

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `backend/jormat-api/src/workspaces/workspaces.service.ts` | + `findAllSummaries()` (select id,name,slug de todos los ws) | aditivo; no toca `findById`/`create`/`update`/`delete` |
| `backend/jormat-api/src/workspaces/workspaces.controller.ts` | + `@Get()` gateado por `InternalAdminGuard` → `findAllSummaries` | aditivo; rutas existentes intactas (orden: `@Get()` antes de `@Get('current')` no colisiona — paths distintos) |
| `backend/jormat-api/src/workspaces/internal-admin.guard.ts` (nuevo) | guard: `req.user.role === 'internal-admin'` else `ForbiddenException` | nuevo, aditivo; reusa `req.user` poblado por AuthGuard (sin tocarlo) |
| `backend/jormat-api/src/workspaces/workspaces.dto.ts` | + `WorkspaceSummaryDto` (o type) | aditivo |
| `backend/jormat-api/src/workspaces/*.spec.ts` (nuevo/extendido) | jest: 200 admin / 403 no-admin / shape | nuevo |
| `front/jormat-front/src/stores/ui.store.ts` | + `clearActiveWorkspace()` (removeItem + reset) + export `WORKSPACE_STORAGE_KEY` | aditivo; `setActiveWorkspace` intacto; interceptor sin cambios |
| `front/jormat-front/src/stores/auth.store.ts` | `logout()` limpia el override antes del `logoutRedirect` (REQ-FIX-03) | aditivo; reusa la constante exportada; sin tocar `initialize()`/capabilities |
| `front/jormat-front/src/services/api/workspaces.ts` | + `getWorkspaces(): Promise<WorkspaceSummary[]>` | aditivo |
| `front/jormat-front/src/hooks/useWorkspace.ts` | + `useWorkspaces()` (list); self-heal en `useCurrentWorkspace` (onError 404 → clear+invalidate) | aditivo; key namespaceada |
| `front/jormat-front/src/components/shell/TopBar/EmpresaSwitcher/EmpresaSwitcher.tsx` | cablear lista (A), estado activo + fuera-de-rango (C), validar override al hidratar (A-03) | reemplaza el `TODO` línea 49; reusa store/hook |
| `front/jormat-front/src/components/shell/TopBar/EmpresaSwitcher/EmpresaSwitcher.test.tsx` | extender: self-heal, multi-ws, fuera-de-rango, validate-on-hydrate | ajusta tests existentes si codifican comportamiento previo |
| `front/jormat-front/src/test/msw/` | handlers para `GET /workspaces` y 404 de `current` | aditivo |

## Necessity assessment (DET-32 — light)

| Item | Veredicto | Razón |
|------|-----------|-------|
| `GET /workspaces` endpoint | **build** | No existe forma de listar workspaces; el switcher multi-ws (A) y la validación al hidratar (A-03) lo requieren. No lo da framework ni hay reuse. |
| `InternalAdminGuard` | **build** (mínimo) | No hay guard de rol reutilizable para "solo internal-admin" (los existentes son capability-based vía `@RequireCapability`). Guard de ~10 líneas, testeable. Alternativa (check inline en controller) descartada por testabilidad/idiomática Nest. |
| `clearActiveWorkspace` en store | **build** (mínimo) | El store solo tiene `setActiveWorkspace`; falta el inverso que además remueve la key del localStorage (requisito de REQ-FIX-02). |
| `useWorkspaces` hook + `getWorkspaces` | **build** | Reusa el patrón `useApiQuery` + `services/api/workspaces.ts` existente (extiende, no duplica). |
| Estado "fuera de rango" en switcher | **reduce** | Se resuelve con render condicional sobre datos ya disponibles (lista + current) — sin componente nuevo. |

## Tasks

### Session 1 — A backend: `GET /workspaces` admin-only

```
S1.T1 — Baseline + service.findAllSummaries
- source_ref: REQ-A-01
- agent: developer
- validation: jest backend baseline capturado; `findAllSummaries` devuelve [{id,name,slug}] (test con knex mock)
- rollback: git revert
- rules: [RULE-global-001, DET-8]

S1.T2 — InternalAdminGuard + controller @Get() gateado + DTO
- source_ref: REQ-A-01, REQ-A-02
- agent: developer
- depends_on: S1.T1
- validation: ruta registrada; guard corta no-admin antes del service
- rollback: git revert
- rules: [RULE-global-002, RULE-global-003, DET-5]

S1.T3 — jest: 200 admin / 403 no-admin / shape del array
- source_ref: REQ-A-01, REQ-A-02
- agent: developer
- depends_on: S1.T2
- validation: 3 tests verdes (overrideGuard + repo mock, patrón JOR-035)
- rollback: git revert
- rules: [DET-7]

S1.GATE — Gate de sync Session 1 (tier T2, ⚑ fuerte)
- validation: jest area verde + revisión RULE-global-002 (gate de autorización real) + isolated reviewer
```

### Session 2 — B self-heal (front, no depende de A)

```
S2.T1 — clearActiveWorkspace en ui.store (removeItem + reset) + export WORKSPACE_STORAGE_KEY
- source_ref: REQ-FIX-01, REQ-FIX-02
- agent: developer
- validation: vitest: removeItem llamado + activeWorkspace=null; setActiveWorkspace intacto
- rollback: git revert
- rules: [RULE-global-001]

S2.T2 — limpiar override en logout() (antes del logoutRedirect) usando WORKSPACE_STORAGE_KEY
- source_ref: REQ-FIX-03
- agent: developer
- depends_on: S2.T1
- validation: vitest: logout() hace removeItem antes del redirect; sin magic string (usa la constante exportada)
- rollback: git revert
- rules: [RULE-global-001, DET-16]

S2.T3 — self-heal por 404 en useCurrentWorkspace (distingue 404 vs NETWORK_ERROR)
- source_ref: REQ-FIX-01
- agent: developer
- depends_on: S2.T1
- validation: useEffect: si status===404 && había override → clear + invalidate; status===0 → no-op
- rollback: git revert
- rules: [DET-5]

S2.T4 — vitest: TC-1 (404 cura), TC-2 (red no cura), TC-3 (header preservado), TC-9 (logout limpia)
- source_ref: REQ-FIX-01, REQ-FIX-02, REQ-FIX-03
- agent: developer
- depends_on: S2.T2, S2.T3
- validation: vitest verde (11 tests)
- rollback: git revert
- rules: [DET-7]

S2.GATE — Gate de sync Session 2 (tier T2, auto)
- validation: vitest area verde + cobertura no baja + contrato header intacto
```

### Session 3 — C + A-front: switcher multi-workspace + estados + validate-on-hydrate

```
S3.T1 — getWorkspaces() + useWorkspaces() (list)
- source_ref: REQ-A-01
- agent: developer
- validation: hook devuelve la lista; MSW handler
- rollback: git revert
- rules: [RULE-global-001]

S3.T2 — EmpresaSwitcher: cablear lista, activo visible, estado "fuera de rango"
- source_ref: REQ-C-01
- agent: developer
- depends_on: S3.T1
- validation: render con N workspaces; activo marcado; fuera-de-rango cuando aplica
- rollback: git revert
- rules: [RULE-frontend-001, RULE-frontend-002]

S3.T3 — validar override vs lista al hidratar (A-03)
- source_ref: REQ-A-03
- agent: developer
- depends_on: S3.T2
- validation: override no-en-lista → clear; en-lista → no-op
- rollback: git revert
- rules: [DET-5]

S3.T4 — vitest + story: TC-6, TC-7 + ajustar tests existentes
- source_ref: REQ-C-01, REQ-A-03, REQ-REGRESSION-01
- agent: developer
- depends_on: S3.T3
- validation: vitest verde + story play (jsdom-safe) + suite EmpresaSwitcher existente verde
- rollback: git revert
- rules: [DET-7, RULE-frontend-002]

S3.GATE — Gate de sync Session 3 (tier T3, ⚑ fuerte)
- validation: vitest+story verde + stack dev levanta sin errores de consola (RULE-global-004) + smoke switcher (activo/fuera-de-rango) + isolated reviewer + regresión jest+vitest verde
```

## Constraints

- NO modificar `auth.guard.ts` ni el contrato `X-Admin-Workspace` (RULE-global-003 + restricción del dev).
- El "limpiar override" DEBE remover la key del localStorage (no solo el estado del store) — el interceptor la lee directo.
- `GET /workspaces` DEBE estar gateado a `internal-admin` (RULE-global-002).
- Código en inglés, contenido/comentarios en español.

## Risks

| Riesgo | Mitigación |
|--------|-----------|
| Endpoint expone enumeración cross-tenant | Guard `internal-admin` + test 403 explícito (S1) |
| Header stale persiste si solo se resetea el store | `clearActiveWorkspace` hace removeItem; TC-3 lo verifica |
| Falso heal por red caída | Distinguir 404 vs status 0; TC-2 lo verifica |
| Loop de refetch | Heal solo si "había override"; refetch sin header resuelve al propio (200) |
| Tests existentes de EmpresaSwitcher codifican comportamiento previo | Ajustarlos en S3.T4 (regresión esperada, DET-7) |

## Open questions

Ninguna bloqueante. Decisiones de diseño (gating por rol, array plano) resueltas y documentadas en Executive summary (super autopilot: decidir + documentar).

## Acceptance

- [ ] `GET /workspaces`: 200 + `WorkspaceSummary[]` para internal-admin; 403 para no-admin (jest).
- [ ] Override stale + 404 de `current` → override limpiado + refetch + datos del workspace propio (vitest).
- [ ] `NETWORK_ERROR` no limpia el override (vitest).
- [ ] Header `X-Admin-Workspace` se sigue enviando con override válido; no se envía tras clear (vitest).
- [ ] Switcher lista workspaces, marca el activo, señala "fuera de rango"; valida override al hidratar (vitest + story).
- [ ] Regresión: jest (back) + vitest (front) verdes; stack dev levanta sin errores de consola.
</content>
