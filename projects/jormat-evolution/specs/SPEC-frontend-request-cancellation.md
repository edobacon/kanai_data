---
id: SPEC-frontend-request-cancellation
project: jormat-evolution
ticket: JOR-038
status: done
---

# Fix: propagar el AbortSignal de React Query a axios para cancelar peticiones en vuelo

# Fix: propagar el AbortSignal de React Query a axios para cancelar peticiones en vuelo

## Executive summary — lo que estas aprobando

**Que se quiere**: al navegar entre vínculos, las peticiones GET en vuelo no se cancelan — siguen
vivas aunque la vista que las pidió se desmontó. React Query (v5) ya crea un `AbortController` por
query y aborta su `signal` al quedar sin observers (navegación → desmonta), pero ese `signal` nunca
llega a axios: los `queryFn` lo descartan y los servicios no lo aceptan. Este fix reconecta la
cadena RQ → hook → servicio → axios en los 8 dominios de query, y fija la convención (tipo
`RequestOptions` compartido + rule) para que los servicios futuros nazcan cancelables.

**Decisiones criticas**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Opción A: propagar el `signal` de RQ a axios (no registry propio de controllers) | Idiomático con el stack; RQ orquesta todo el ciclo (abort en unmount/refetch/cambio de key). B/C trabajan contra RQ |
| 2 | Tipo `RequestOptions { signal?: AbortSignal }` en `lib/api`, param opcional al final de cada servicio | Firma backward-compatible (no rompe callers actuales); convención uniforme y testeable |
| 3 | Mutations fuera de alcance | RQ no cancela mutations por diseño; no se quiere abortar un POST a medio camino |
| 4 | Mapear `CanceledError` de axios a `ApiError('CANCELED')` + `handleApiError` no togglea toast | Sin esto, una cancelación caería en el branch status 0 → toast "No se pudo conectar" engañoso |

**Riesgos principales y como los mitigamos**:

- **El interceptor `request` async (acquireTokenSilent) podría no propagar `signal`** → axios v1 soporta `signal` en config de forma nativa; el interceptor solo agrega headers y devuelve `cfg` (que ya trae `signal`). Verificado por test que afirma que el servicio pasa `{ signal }` a `api.get`.
- **`useWorkspace` self-heal (404/network, JOR-036) se rompe** → su `queryFn` solo gana el reenvío de `signal`; la lógica de error (`query.error?.status`) no cambia. Cubierto por regresión (tests JOR-036).
- **Una cancelación dispara un toast de error** → mapeo `CANCELED` + guard en `handleApiError`.
- **jsdom timing flaky al testear abort real con MSW** → el test afirma el contrato del wiring (el servicio recibe un `AbortSignal` y queda `aborted` al desmontar), no depende de timing de red.

**Que NO se hace en este ticket**:

- No se cancelan mutations (POST/PUT/PATCH/DELETE).
- No se introduce un registry global de controllers ni cancelación por ruta (opciones B/C, descartadas).
- No se cambian `queryKey`, contratos de datos ni firmas de los hooks de mutation.

**Tamano estimado**: 1 session (~1-1.5h), tier T2. Cambio mecánico homogéneo en 8 servicios + 8 hooks.

**Como vas a saber que funciona**:

- En el Network del browser: disparo un GET (ej. `/inventario`), navego antes de que responda → la petición aparece **canceled**.
- La suite unit queda verde (incl. el test nuevo de cancelación y el self-heal de workspace).

---

## Purpose

Reconectar la cancelación de React Query con axios. RQ v5 inyecta un `AbortSignal` en el
`QueryFunctionContext` de cada `queryFn` y lo aborta cuando la query queda sin observers (la vista
se desmonta al navegar). Hoy ese signal se descarta en dos puntos: (1) los `queryFn` no lo
destructuran (`queryFn: listItems`, `() => getItem(id)`); (2) los servicios axios no aceptan ni
pasan `signal` a `api.get(...)`. El fix introduce un tipo compartido `RequestOptions` y propaga el
signal en los 15 GET de los 8 servicios de dominio y en los 8 hooks de query, más el manejo de
`CanceledError` en la capa de error.

## Requirements

### REQ-FIX-01: el signal de React Query se propaga hasta axios y cancela la petición

> **Que cambia**: cuando una query queda sin observers (navegación → desmonta) o cambia de key, la petición HTTP en vuelo se aborta de verdad — el `AbortSignal` de RQ llega hasta `axios.get`.
> **Por que**: hoy el abort de RQ no llega a axios (queryFn descarta el signal; el servicio no lo acepta), así que la request completa igual: gasta red y puede producir respuestas fuera de orden.

El sistema MUST exponer en `lib/api` un tipo `RequestOptions { signal?: AbortSignal }` y cada
función GET de servicio de dominio MUST aceptar un `opts?: RequestOptions` (último parámetro) y
reenviar `{ signal: opts?.signal }` en la config de `api.get`.

Cada hook `useApiQuery` de query MUST definir su `queryFn` destructurando el `signal` del contexto
y reenviándolo al servicio: `queryFn: ({ signal }) => fn(args, { signal })`.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: abort al desmontar
- **GIVEN** un hook de query montado con una petición en vuelo
- **WHEN** el componente se desmonta (navegación) antes de que responda
- **THEN** el `AbortSignal` recibido por el servicio queda `aborted` (axios cancela la request)

#### Scenario: el servicio reenvía el signal
- **GIVEN** una llamada `listItems({ signal })`
- **WHEN** se ejecuta
- **THEN** `api.get` recibe `{ signal }` en su config

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el Network, dispara un listado, navega antes de que responda y ve la petición como `canceled`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Abort en unmount | hook montado, servicio espía | unmount antes de resolver | el servicio fue llamado con un `AbortSignal` que queda `aborted` | `signal.aborted === true` |
| 2 | Servicio reenvía signal | cliente axios mockeado | `listItems({ signal })` / `getItem(id, { signal })` | `api.get` recibe `{ signal }` | spy llamado con `(url, { signal })` |

### REQ-FIX-02: una cancelación no se reporta como error de red

> **Que cambia**: una petición cancelada deja de mapearse al genérico de red; `handleApiError` no muestra toast para cancelaciones.
> **Por que**: `CanceledError` de axios no trae `response` → hoy caería en el branch status 0 → `NETWORK_ERROR` ("No se pudo conectar"), un toast engañoso al navegar.

El sistema MUST detectar `CanceledError` (axios) en `toApiError` y mapearlo a un `ApiError` con
código `CANCELED`. `handleApiError` MUST NOT mostrar toast cuando el código es `CANCELED`.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: cancelación no togglea toast
- **GIVEN** un error de axios de tipo `CanceledError`
- **WHEN** pasa por `handleApiError`
- **THEN** retorna un `ApiError('CANCELED', ...)` y NO se llama a `toast.error`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: navegar rápido entre vistas no dispara toasts de "No se pudo conectar".

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | toApiError(CanceledError) | `new CanceledError()` | `toApiError(err)` | code = `CANCELED` | igualdad exacta |
| 2 | handleApiError no togglea | error `CANCELED` | `handleApiError(err)` | `toast.error` no llamado | spy 0 llamadas |

### REQ-REGRESSION-01: queries, mutations y self-heal de workspace intactos

> **Que cambia**: nada de comportamiento — las queries siguen devolviendo datos, las mutations no cambian firma y el self-heal de workspace (JOR-036) sigue curando.
> **Por que**: el fix toca solo el reenvío de signal en GETs; el resto no debe alterarse (DET-7).

El sistema MUST mantener: (a) las queries devuelven datos como antes; (b) las firmas y el
comportamiento de los hooks `useApiMutation` no cambian; (c) `useCurrentWorkspace` sigue limpiando
el override stale ante 404 y `useWorkspaces` no reintenta ante 403.

**Actor**: user
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: la suite unit del front queda verde sin nuevas fallas.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Queries OK | suite existente | `vitest run` | hooks de query verdes | sin nuevas fallas |
| 2 | Self-heal workspace | tests JOR-036 | `vitest run` useWorkspace | curan 404 / no-retry 403 | verdes |

## Tasks

### Session 1 — Convención + propagación de signal (8 servicios + 8 hooks) + error CANCELED + tests [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `lib/api/request-options.ts` (`RequestOptions { signal?: AbortSignal }`) + exportar en barrel `lib/api/index.ts` | REQ-FIX-01 | developer | — | `front/jormat-front/src/lib/api/request-options.ts`, `front/jormat-front/src/lib/api/index.ts` | tsc | git revert | DET-5, RULE-global-001 | done | 1 |
| S1.T2 | Mapear `CanceledError` → `ApiError('CANCELED')` en `toApiError` (const `CANCELED_ERROR_CODE`); `handleApiError` no togglea toast si code = CANCELED | REQ-FIX-02 | developer | S1.T1 | `front/jormat-front/src/lib/api/api-error.ts`, `front/jormat-front/src/lib/api/handle-error.ts` | tsc + unit | git revert | DET-5, RULE-global-001 | done | 1 |
| S1.T3 | Añadir `opts?: RequestOptions` a las 15 funciones GET de los 8 servicios y reenviar `{ signal }` a `api.get` (capabilities, roles, users, items, payments/customers, reportes, ventas/documentos, workspaces) | REQ-FIX-01 | developer | S1.T1 | `front/jormat-front/src/services/api/config/{capabilities,roles,users}.ts`, `.../inventario/items.ts`, `.../payments/customers.ts`, `.../reportes.ts`, `.../ventas/documentos.ts`, `.../workspaces.ts` | tsc | git revert | DET-5, DET-16 | done | 1 |
| S1.T4 | Reenviar el `signal` del contexto en los 8 hooks de query (`queryFn: ({ signal }) => fn(args, { signal })`): useItems, useVentas, usePayments, useReportes, useRoles, useUsers, useCapabilities, useWorkspace | REQ-FIX-01 | developer | S1.T3 | `front/jormat-front/src/hooks/{useItems,useVentas,usePayments,useReportes,useRoles,useUsers,useCapabilities,useWorkspace}.ts` | tsc | git revert | DET-5, DET-16 | done | 1 |
| S1.T5 | Tests: cancelación (servicio recibe AbortSignal + aborta en unmount), servicio reenvía signal, `toApiError(CanceledError)=CANCELED`, `handleApiError` no togglea toast | REQ-FIX-01, REQ-FIX-02 | developer | S1.T4 | `front/jormat-front/src/lib/api/request-cancellation.test.tsx`, `front/jormat-front/src/lib/api/api-error.test.ts`, `front/jormat-front/src/lib/api/handle-error.test.ts` | `vitest run --project '!storybook'` | git revert | DET-7, RULE-frontend-002 | done | 1 |
| S1.T6 | Regression: suite unit jsdom completa + typecheck/build; actualizar doc `jormat_docs/ongoing/frontend-api-layer.md` (sección cancelación) | REQ-REGRESSION-01 | reviewer | S1.T5 | — | `vitest run --project '!storybook'` + `tsc --noEmit` | (no aplica) | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados, correr T2, quality review 10-dim, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5, S1.T6 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | done | 1 |

### Task contract

```
Task S1.T1: Tipo RequestOptions compartido
- source_ref: REQ-FIX-01
- files: lib/api/request-options.ts, lib/api/index.ts
- expected_output: RequestOptions { signal?: AbortSignal } exportado desde el barrel lib/api
- validation: tsc
- rollback: git revert

Task S1.T2: Error CANCELED
- source_ref: REQ-FIX-02
- files: lib/api/api-error.ts, lib/api/handle-error.ts
- expected_output: toApiError detecta CanceledError → ApiError('CANCELED'); handleApiError no togglea toast en CANCELED
- validation: tsc + unit
- rollback: git revert

Task S1.T3: Servicios GET aceptan/propagan signal
- source_ref: REQ-FIX-01
- files: 8 servicios (15 GET)
- expected_output: cada GET con opts?: RequestOptions reenviando { signal } a api.get; firmas backward-compatible
- validation: tsc
- rollback: git revert

Task S1.T4: Hooks reenvían signal
- source_ref: REQ-FIX-01
- files: 8 hooks de query
- expected_output: queryFn destructura signal del contexto y lo reenvía al servicio
- validation: tsc
- rollback: git revert

Task S1.T5: Tests de cancelación + error
- source_ref: REQ-FIX-01, REQ-FIX-02
- files: request-cancellation.test.tsx, api-error.test.ts, handle-error.test.ts
- expected_output: cobertura del wiring (signal recibido + aborta en unmount), servicio reenvía signal, CANCELED mapping, sin toast
- validation: vitest run --project '!storybook'
- rollback: git revert

Task S1.T6: Regression + doc
- source_ref: REQ-REGRESSION-01
- expected_output: suite unit del front sin nuevas fallas + tsc verde; doc frontend-api-layer.md actualizado
- validation: vitest run --project '!storybook' + tsc --noEmit
- rollback: (no aplica)
```

## Constraints

- RULE-global-001: sin magic strings — el código `CANCELED` se extrae a constante (`CANCELED_ERROR_CODE`).
- RULE-frontend-002: todo cambio de comportamiento se cubre con test.
- Mutations fuera de alcance (RQ no las cancela).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El interceptor async no propaga `signal` | low | alto | axios v1 soporta `signal` nativo; test afirma que el servicio pasa `{ signal }` a `api.get` |
| Cancelación dispara toast engañoso | medium | medio | REQ-FIX-02: mapeo CANCELED + guard en handleApiError |
| Romper self-heal de workspace (JOR-036) | low | medio | solo se agrega reenvío de signal; lógica de error intacta; cubierto por regresión |
| jsdom flaky al testear abort real | medium | bajo | test afirma el contrato del wiring, no timing de red |

## Open questions

{Ninguna — causa raíz confirmada por inspección; solución acordada con el dev (Opción A + convención D).}

## Decisions

### DEC-LOCAL-01: Opción A (propagar signal de RQ) sobre B/C
- **Contexto**: cómo cancelar peticiones en vuelo al navegar
- **Drivers**: idiomático con React Query (ya gestiona el ciclo del AbortController), mínimo blast radius, sin estado manual
- **Opcion elegida**: propagar el `signal` del `QueryFunctionContext` hasta axios en servicios + hooks
- **Alternativas**: (B) registry de controllers en el cliente axios — frágil, descoordinado con RQ; (C) cancelar por ruta en el router — App Router no expone routeChangeStart, reimplementa B. Ambas descartadas
- **Consecuencias**: cambio mecánico en 8 servicios + 8 hooks; convención uniforme; mutations fuera (RQ no las cancela)
- **Session**: design-fix

### DEC-LOCAL-02: tipo `RequestOptions` compartido en `lib/api` + rule de convención
- **Contexto**: evitar que cada servicio invente su firma y que los servicios futuros nazcan sin cancelación
- **Drivers**: DRY, descubribilidad, enforcement futuro
- **Opcion elegida**: `RequestOptions { signal?: AbortSignal }` en `lib/api` + `RULE-api-client-001` que fija "todo servicio de dominio acepta y propaga signal"
- **Alternativas**: firma ad-hoc por servicio (drift), no documentar convención (regresión futura)
- **Consecuencias**: un punto de import; nueva rule del módulo api-client
- **Session**: design-fix

## Acceptance checkpoints

- [x] **Funcional**: REQ-FIX-01 (signal llega a axios y aborta — `request-cancellation.test.tsx` 2/2), REQ-FIX-02 (sin toast en cancelación — `handle-error.test.ts`)
- [x] **Tests**: test de cancelación + error CANCELED verdes; suite del front sin nuevas fallas (700/700)
- [x] **Rules**: RULE-global-001 respetada; RULE-frontend-002 (test por cambio); RULE-api-client-001 creada
- [x] **Integration**: queries y mutations intactas; self-heal de workspace (JOR-036) verde
- [x] **Docs**: `jormat_docs/ongoing/frontend-api-layer.md` §6b actualizado
