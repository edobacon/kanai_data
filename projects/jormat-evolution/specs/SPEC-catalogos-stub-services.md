---
id: SPEC-catalogos-stub-services
project: jormat-evolution
ticket: JOR-057
status: done
---

# B2.3 · Servicios de catálogo demo (backend STUB)

# B2.3 · Servicios de catálogo demo (backend STUB)

## Executive summary — lo que estas aprobando

### 1. Que se quiere
Un módulo NestJS `catalogos` en `jormat-api` con **6 endpoints de SOLO LECTURA** que devuelven datos demo hardcodeados (STUB), para poblar los desplegables/búsquedas del front (alta de item, factura, filtros) **sin tocar el modelo de datos**. Endpoints: `categorias`, `aplicaciones`, `proveedores`, `bodegas`, `formas-pago`, `clientes?q=`. Sigue el molde `items.service.ts` 1:1 (sin DB, `workspaceId` en la firma para scope futuro, trío de guards, `@RequireCapability`, Swagger, specs co-locados). Los shapes de DTO espejan el legacy para ser **drop-in en Capa C** (JOR-020), donde solo cambia el interior del service (stub → DB) sin tocar el front.

### 2. Decisiones críticas
| Decisión | Racional (1 línea) |
|----------|--------------------|
| **DEC-LOCAL-1** · capability única `catalogos:view` (no gateada por contexto consumidor) | Los catálogos son selects read-only transversales (alta item, factura, filtros); gatear cada uno por la capability del consumidor acoplaría el módulo a todos sus consumidores. Resuelve la decisión abierta de `catalog-services.md §5`. |
| **DEC-LOCAL-2** · un solo `CatalogosController` + `CatalogosService` con 6 rutas | Menos boilerplate que 6 controllers; mismo prefijo (`/api/catalogos`) y misma capability. El ejemplo per-catálogo del flow doc era ilustrativo. |
| Array plano de DTO (no envelope `{data,status}`) | Convención del backend nuevo (molde items); el envelope es del legacy. |
| `workspaceId` en la firma del service, ignorado en STUB | Scope multi-tenant futuro sin re-firmar en Capa C (DEC-001). |
| Datos demo coherentes con `items.service.ts` (bodegas MAT/BOD-*, dominio repuestos de camión) | El front cableado en JOR-058 ve datos verosímiles; cero re-trabajo al pasar a DB. |

### 3. Riesgos y mitigación
- **Capability `catalogos:view` no existe en el seed RBAC demo** → el endpoint igual la exige (`@RequireCapability`); que un rol la tenga es responsabilidad del seed (JOR-021/seed RBAC), fuera de scope. Riesgo: en dev, un rol sin la capability ve 403. Mitigación: documentar la capability nueva en la nota de backend para que el seed la incluya.
- **Drift de shape con el front (JOR-058)** → los DTO se definen exactamente como `catalog-services.md`; JOR-058 consume estos shapes. Red de seguridad: specs co-locados afirman el shape.
- **Coverage < 90** (RULE-testing-coverage-threshold-002, gate del build) → specs co-locados cubren cada endpoint (200 shape + 403 sin cap); DTOs excluidos de coverage (RULE-testing-coverage-config-001).

### 4. Que NO se hace
- **Modelo de datos / tablas / persistencia** → diferido a JOR-020 (Capa C3).
- **WRITE de catálogos** (crear/editar categoría, proveedor, cliente) → mantenedores diferidos.
- **Seed de la capability `catalogos:view`** en roles demo → JOR-021 / seed RBAC (solo se documenta aquí).
- **Camiones** (`/catalogos/camiones`) → diferible, no en este ticket.
- Tocar la base entregada / `AuthGuard` / MSAL / migraciones (RULE-global-003).

### 5. Tamaño estimado
**1 session** (T1). Módulo aditivo, una capa, sin DB, reversible.

### 6. Cómo vas a saber que funciona
- Swagger en `/docs` lista la sección `catalogos` con los 6 GET.
- Cada `GET /api/catalogos/*` con `catalogos:view` responde 200 + array con el shape esperado.
- Sin la capability → 403 `{code:'FORBIDDEN'}`.
- `GET /api/catalogos/clientes?q=<texto>` devuelve solo los clientes que matchean (razón social o RUT).
- Suite Jest verde, coverage global ≥90 sin caer.

## Purpose

Proveer el contrato HTTP estable de catálogos (READ) que los flujos del front (JOR-058 y consumidores B2) necesitan para poblar selects y búsquedas, recorriendo la rampa solo hasta el **stub** (endpoint tipado con datos demo). El valor: el front se cablea **una vez** contra un contrato que no cambia cuando llegue el modelo de datos real (Capa C solo reemplaza el interior del service). Reusa el patrón Bn establecido por SPEC-items-catalog.

## Requirements

### REQ-01 · GET /api/catalogos/categorias

> **Qué cambia**: nuevo endpoint read-only que devuelve las categorías demo.
> **Por qué**: la vista 06 (alta de item) y los filtros de la 04 necesitan el catálogo de categorías.

El endpoint **DEBE** responder `200` con `CategoriaDto[]` (`{id, nombre, codigo}`) para un usuario con `catalogos:view`. Datos demo del dominio repuestos.

### REQ-02 · GET /api/catalogos/aplicaciones

> **Qué cambia**: endpoint read-only de aplicaciones.
> **Por qué**: multiselect de aplicaciones en alta de item + filtro de listado.

**DEBE** responder `200` con `AplicacionDto[]` (`{id, nombre, codigo}`).

### REQ-03 · GET /api/catalogos/proveedores

> **Qué cambia**: endpoint read-only de proveedores.
> **Por qué**: multiselect de proveedores en alta de item; selección en compras.

**DEBE** responder `200` con `ProveedorDto[]` (`{id, nombre, rut, telefono, email, tipo}`).

### REQ-04 · GET /api/catalogos/bodegas

> **Qué cambia**: endpoint read-only de bodegas.
> **Por qué**: factura cliente y stock por bodega referencian bodegas.

**DEBE** responder `200` con `BodegaDto[]` (`{codigo, nombre}`). Códigos coherentes con `items.service.ts` (MAT, BOD-*).

### REQ-05 · GET /api/catalogos/formas-pago

> **Qué cambia**: endpoint read-only del catálogo fijo de formas de pago.
> **Por qué**: factura cliente / cobranzas seleccionan forma de pago.

**DEBE** responder `200` con `FormaPagoDto[]` (`{id, descripcion}`). Catálogo fijo de las 22 formas reales del legacy.

### REQ-06 · GET /api/catalogos/clientes?q=

> **Qué cambia**: endpoint read-only de clientes con búsqueda en memoria.
> **Por qué**: la factura cliente busca clientes por texto.

**DEBE** responder `200` con `ClienteDto[]` (`{id, razonSocial, rut, telefono, ciudad, direccion}`). Si `q` viene, **DEBE** filtrar en memoria por `razonSocial` o `rut` (case-insensitive); sin `q` devuelve todos.

### REQ-07 · Gate de capability `catalogos:view` (RULE-global-002 S2, must)

> **Qué cambia**: los 6 endpoints quedan tras el trío de guards y exigen `catalogos:view`.
> **Por qué**: la línea base de seguridad obliga `@RequireCapability` + test 403; el front oculta, el backend revalida.

El controller **DEBE** usar `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)` y cada ruta **DEBE** declarar `@RequireCapability('catalogos:view')`. Sin la capability, la respuesta **DEBE** ser `403 {code:'FORBIDDEN'}`. La capability nueva se documenta para que el seed RBAC la incorpore (JOR-021).

### REQ-08 · NFR — molde, aislamiento y calidad

> **Qué cambia**: el módulo respeta el molde items y las rules del proyecto.
> **Por qué**: consistencia + drop-in en Capa C + gate de build.

- **DEBE** seguir el molde `items`: service `@Injectable()` con datasets demo en constantes, `workspaceId` en la firma (ignorado en stub), respuesta array plano, DTOs con `@ApiProperty`, `@ApiTags('catalogos')` + `@ApiBearerAuth('JWT')`.
- **NO DEBE** tocar DB, base entregada, `AuthGuard`, MSAL ni migraciones (RULE-global-003).
- **DEBE** mantener coverage global ≥90 (RULE-testing-coverage-threshold-002); DTOs excluidos de coverage (RULE-testing-coverage-config-001).
- `CatalogosModule` **DEBE** registrarse en `AppModule.imports[]` e importar `PermissionsModule` para los guards.

## Gate de necesidad/reuso (DET-32)

Cascada barato-primero por artifact nuevo (WARN-first, full en implement):

| Artifact | ¿Necesita existir? | ¿Ya existe en KB/código? | ¿Lo da framework/dep? | ¿Config/reduce? | Veredicto |
|----------|--------------------|--------------------------|-----------------------|-----------------|-----------|
| `CatalogosModule/Controller/Service` | Sí — el front (JOR-058) requiere los endpoints; no hay otra fuente | No existe módulo catálogos | NestJS da el scaffolding, no los datos | — | **build** |
| 6 DTOs (`CategoriaDto`...) | Sí — contrato tipado + Swagger | No existen; `items/dto` es de otro dominio | class-validator/swagger dan decoradores, no shapes | — | **build** |
| Capability `catalogos:view` | Sí — RULE-global-002 exige gate | `can()` ya soporta el string con wildcards | El sistema RBAC ya existe; solo se usa un string nuevo | Reduce: es solo un string, no código RBAC nuevo | **reduce** (reusa RBAC existente) |
| Trío de guards | No construir — ya existen | `AuthGuard`, `CapabilitiesHydrationGuard`, `CapabilitiesGuard` | — | — | **reuse** |
| Datos demo | Sí — son el STUB | `items.service` tiene datos de items, no catálogos | — | — | **build** (coherentes con items) |

Veredicto global: **build** del módulo, **reuse** de guards/RBAC. Sin sobre-construcción.

## Artifacts

| Artifact | Path (repo jormat) | Tipo |
|----------|--------------------|------|
| `catalogos.module.ts` | `backend/jormat-api/src/catalogos/` | module |
| `catalogos.controller.ts` | `backend/jormat-api/src/catalogos/` | controller |
| `catalogos.service.ts` | `backend/jormat-api/src/catalogos/` | service (STUB) |
| `dto/*.dto.ts` (6 DTOs) | `backend/jormat-api/src/catalogos/dto/` | DTOs |
| `catalogos.controller.spec.ts` | `backend/jormat-api/src/catalogos/` | test (Supertest) |
| Registro en `AppModule` | `backend/jormat-api/src/app.module.ts` | edit (aditivo) |
| Doc API | `jormat_docs/api/README.md` (sección Catálogos) | docs |
| Nota backend | `jormat_docs/backend/` | docs |

## Tasks

### S1.T1 · DTOs demo
- **Objetivo**: crear los 6 DTOs en `catalogos/dto/` con `@ApiProperty`, shapes exactos de `catalog-services.md`.
- **Archivos**: `dto/categoria.dto.ts`, `aplicacion.dto.ts`, `proveedor.dto.ts`, `bodega.dto.ts`, `forma-pago.dto.ts`, `cliente.dto.ts` (y/o barrel `dto/index.ts`).
- **Rollback**: borrar `catalogos/dto/`.

### S1.T2 · CatalogosService (STUB)
- **Objetivo**: `@Injectable()` con datasets demo en constantes y métodos `getCategorias(ws)`, `getAplicaciones(ws)`, `getProveedores(ws)`, `getBodegas(ws)`, `getFormasPago(ws)`, `getClientes(ws, q?)` (filtro en memoria).
- **Archivos**: `catalogos.service.ts`.
- **Rollback**: borrar `catalogos.service.ts`.

### S1.T3 · CatalogosController + guards + Swagger
- **Objetivo**: `@Controller('catalogos')`, trío de guards, 6 `@Get(...)` con `@RequireCapability('catalogos:view')` + `@ApiOperation/@ApiResponse(200,403)`. `clientes` con `@Query('q')`.
- **Archivos**: `catalogos.controller.ts`.
- **Rollback**: borrar `catalogos.controller.ts`.

### S1.T4 · CatalogosModule + registro AppModule
- **Objetivo**: `@Module({ imports:[PermissionsModule], controllers:[CatalogosController], providers:[CatalogosService] })`; importar en `AppModule`.
- **Archivos**: `catalogos.module.ts`, `app.module.ts` (edit aditivo).
- **Rollback**: borrar `catalogos.module.ts`; revertir la línea de `app.module.ts`.

### S1.T5 · Specs co-locados
- **Objetivo**: `catalogos.controller.spec.ts` (Supertest, molde `items.controller.spec.ts`): por endpoint → 200 + shape; 403 sin `catalogos:view`; `clientes?q=` filtra. Cubre TC1–TC4.
- **Archivos**: `catalogos.controller.spec.ts`.
- **Rollback**: borrar el spec.

### S1.T6 · Docs (RULE-global-005)
- **Objetivo**: subsección "Catálogos (Endpoints demo)" en `jormat_docs/api/README.md` (tabla maestra) + nota en `jormat_docs/backend/` (módulo + capability nueva `catalogos:view` pendiente de seed).
- **Archivos**: `jormat_docs/api/README.md`, `jormat_docs/backend/` (archivo a definir).
- **Rollback**: revertir los edits de docs.

### S1.GATE · Validación (T1)
- Quality review light (DET-23, 10 dimensiones). Suite Jest verde. Coverage global ≥90 (no cae). Mutation DET-31 async warn-first sobre el diff. Verificación independiente del self-report (DET-33): `npm test` real + grep de archivos. Commits granulares (DET-27). Decisión continue/iterate.

## Backlog

| # | Item | Priority | Status | Razón |
|---|------|----------|--------|-------|
| B1 | Seed de la capability `catalogos:view` en roles demo | should | resuelto por JOR-152 (2026-08-18) | Fuera de scope (JOR-021/seed RBAC); sin esto los roles dev ven 403 en catálogos. Documentado en nota backend. Grant movido al seed de roles para `vendedor`/`cajero`, desacoplado de `entities.trucks:edit`; origino RULE-permissions-001. |
| B2 | Endpoint `/catalogos/camiones` | could | open | Diferible; no requerido por los flujos B2 actuales |
| B3 | Persistencia real (stub → DB) | must (otro ticket) | deferred | JOR-020 (Capa C3) — no bloquea este ticket |

## Discoveries

- 2026-06-29 (S1): molde `items` replicable 1:1; `@WorkspaceId()` decorator en `../auth/decorators`, trío de guards en `../permissions` + `../common/auth`. Confirmado en código real.
- 2026-06-29 (S1): `jest.config` NO excluye `dto/` de coverage → los DTOs se cuentan; al referenciarlos como valor en `@ApiResponse({ type: [Dto] })` se cargan y sus decoradores ejecutan (100%). El controller mockea el service → el service necesita su propio `*.service.spec.ts` para coverage real.
- 2026-06-29 (S1): `dkc-mutate` backend del monorepo lógico no emitió score (ver ticket L1); requiere commitear primero (untracked no entra al diff). WARN-first, T1 — no bloqueó.
- 2026-06-29 (S1): correr `jest` desde `backend/jormat-api`, no desde la raíz del monorepo (rootDir=src + config local).

**Resultado:** entregado en 1 session. 327/327 tests, módulo 100% cov, global ≥90. Endpoints documentados. DEC-LOCAL-1/2 confirmadas.
