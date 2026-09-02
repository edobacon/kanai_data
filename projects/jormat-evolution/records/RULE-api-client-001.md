---
id: RULE-api-client-001
project: jormat-evolution
type: rule
module: api-client
level: should
tags:
  - api-client
  - react-query
  - axios
  - abort-signal
  - cancellation
  - convention
---

# Los servicios de dominio del front aceptan y propagan AbortSignal en sus lecturas (GET)

## What

Todo servicio de dominio del frontend (`front/jormat-front/src/services/api/**`) cuya función sea
una **lectura (GET)** MUST:

- Aceptar un último parámetro opcional `opts?: RequestOptions` (tipo compartido en `@/lib/api`,
  `{ signal?: AbortSignal }`).
- Reenviar `{ signal: opts?.signal }` en la config de `api.get(...)`.

Y todo hook React Query de query (`useApiQuery`) que consuma ese servicio MUST definir su `queryFn`
destructurando el `signal` del contexto y reenviándolo: `queryFn: ({ signal }) => fn(args, { signal })`.

Las **mutations** (POST/PUT/PATCH/DELETE / `useApiMutation`) quedan **fuera**: React Query no las
cancela por diseño y no se quiere abortar una escritura a medio camino.

Complemento: una cancelación NO es un error de red — `toApiError` mapea el `CanceledError` de axios a
`ApiError('CANCELED')` (const `CANCELED_ERROR_CODE`) y `handleApiError` no togglea toast para ese código.

## Why

React Query crea un `AbortController` por query e inyecta su `signal` en el `QueryFunctionContext`;
cuando cancela la query (una nueva petición supersede a la anterior, o `cancelQueries`) aborta ese
signal. Si el `queryFn` lo descarta y el servicio no lo pasa a axios, el abort no llega a la red y la
petición sigue viva: gasta red y puede producir respuestas fuera de orden al navegar. Fijar la
convención evita que cada servicio invente su firma y que los servicios futuros nazcan sin
cancelación (regresión silenciosa del gap original de JOR-038).

## Where

- **Files**: `front/jormat-front/src/services/api/**` (funciones GET) · `front/jormat-front/src/hooks/use*.ts` (hooks `useApiQuery`) · tipo en `front/jormat-front/src/lib/api/request-options.ts`.
- **Layers**: frontend.
- **Excepción**: funciones de mutación (no-GET) no aplican.

## When

Al **crear o modificar** un servicio de dominio con una lectura GET o su hook de query. Servicios
nuevos siguen esta convención desde el inicio.

## Verification

- Cada función GET de servicio recibe `opts?: RequestOptions` y pasa `{ signal: opts?.signal }` a `api.get`.
- Cada hook `useApiQuery` reenvía el `signal` del contexto en su `queryFn`.
- `grep -rn "api.get" services/api` sin segundo argumento `{ signal }` → drift a corregir.

## Source

- **Discovered in**: JOR-038 (fix) — las peticiones no se cancelaban al navegar porque la cadena
  RQ → hook → servicio → axios estaba cortada (queryFn descartaba el signal; servicios sin `signal`).
- **Evidence**: `grep AbortController|signal|CancelToken` en `lib/services/hooks/app/components` → 0 matches antes del fix; los 8 servicios de dominio hacían `api.get<T>(BASE)` sin config.
- **Related**: `jormat_docs/ongoing/frontend-api-layer.md` §6b (cancelación); [[RULE-global-001]] (sin magic strings — `CANCELED_ERROR_CODE`); SPEC-frontend-request-cancellation (DEC-LOCAL-01/02).
