---
id: SPEC-JOR-152-quickwins-pagination-seed
project: jormat-evolution
ticket: JOR-152
status: in_progress
---

# Quick-wins backend: @MaxLength en filtro de paginacion + seed de catalogos:view

# Quick-wins backend: @MaxLength en filtro de paginacion + seed de catalogos:view

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: cerrar dos items de deuda tecnica backend preexistentes y self-contained, ambos registrados como backlog `should` de specs previos: `filter` de `PaginationQueryDto` sin `@MaxLength` (rbac BL-01) y la capability `catalogos:view` sin sembrar en los roles demo (catalogos-stub B1). Ningun feature nuevo, dos fixes acotados.

**Decisiones criticas**: sin decisiones criticas — implementacion straightforward de los REQs descritos abajo.

**Riesgos principales y como los mitigamos**:

- **`@MaxLength` rompe un filtro legitimo mas largo que el limite** → limite generoso (100 caracteres, muy por encima de cualquier filtro real de nombre/rut/codigo); test unit confirma que filtros normales pasan y que el exceso da 400.
- **El grant de `catalogos:view` se acopla otra vez a un dominio ajeno** (como paso con `entities.trucks:edit` en seed 14) → se otorga en `seeds/10_demo_roles_users.ts` de forma decoupled, no en `seeds/14_entities_trucks_capabilities.ts`.

**Que NO se hace en este ticket**:

- Filtros/paginacion server-side de catalogos (GF1 de JOR-149) → fuera de alcance, no relacionado.
- Persistencia real de catalogos (stub → DB) → JOR-020 (Capa C3).
- Ajustar el seed 14 (`entities.trucks:edit`) → se mantiene intacto, el grant de este ticket es independiente.

**Tamano estimado**: 1 session (S1), T2. Sin sub-sessions — 4 tasks atomicas + gate.

**Como vas a saber que funciona**:

- Un `filter` de paginacion con mas de 100 caracteres responde 400 (ValidationPipe), no ejecuta el `ILIKE` costoso.
- Los roles demo `vendedor` y `cajero` dejan de recibir 403 en `catalogos:view`.
- `roles-config.e2e-spec.ts` confirma los conteos exactos de `role_capabilities` por rol (vendedor 2→3, cajero 16→17).

## Purpose

Cerrar dos deudas backend preexistentes, chicas y self-contained: un vector de degradacion de performance en el filtro de paginacion (transversal a los 8 consumidores del DTO base) y un gap de RBAC que deja a los roles demo sin acceso a catalogos. Ninguno requiere diseño nuevo — son fixes puntuales sobre codigo y seed ya existentes.

## Requirements

### REQ-1 · `@MaxLength(100)` en `filter` de `PaginationQueryDto`

> **Que cambia**: el campo `filter` de `PaginationQueryDto` (`src/common/dto/pagination-query.dto.ts`) pasa a rechazar valores de mas de 100 caracteres con 400, en vez de dejarlos llegar al `ILIKE '%<filter>%'`.
> **Por que**: un filtro muy largo fuerza un `ILIKE` costoso sobre la tabla — vector de degradacion de performance/DoS. El DTO es base de los 8 consumidores que lo extienden, asi que el fix es transversal sin tocar cada hijo.

El sistema MUST agregar `@MaxLength(100)` al decorador de `filter` en `PaginationQueryDto`, junto a los `@IsOptional()`/`@IsString()` existentes. El limite MUST aplicar automaticamente a todo DTO que extienda `PaginationQueryDto` (herencia de decoradores class-validator), sin requerir cambios en los DTOs hijos.

**Actor**: system (ValidationPipe). **Layers**: backend (dto).

<details><summary>Scenarios de validacion</summary>

#### Scenario: filtro dentro del limite
- **GIVEN** una request de listado con `filter` de 50 caracteres
- **WHEN** pasa por `ValidationPipe`
- **THEN** la request continua normalmente (sin 400)

#### Scenario: filtro sobre el limite
- **GIVEN** una request de listado con `filter` de 150 caracteres
- **WHEN** pasa por `ValidationPipe`
- **THEN** responde 400 antes de llegar al repositorio (no se ejecuta el `ILIKE`)

#### Scenario: DTO hijo hereda el limite sin cambios propios
- **GIVEN** cualquiera de los 8 DTOs que extienden `PaginationQueryDto`
- **WHEN** se envia un `filter` sobre el limite en ese endpoint
- **THEN** responde 400 sin que el DTO hijo declare `@MaxLength` propio

</details>

#### Acceptance
**El usuario puede verificar que funciona**: enviar un filtro de mas de 100 caracteres a cualquier listado paginado y recibir 400 en vez de una respuesta lenta.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Filtro valido | filter de 50 chars | ValidationPipe | pasa | sin error |
| 2 | Filtro excedido | filter de 150 chars | ValidationPipe | 400 | `ValidationPipe` error, sin query a DB |

- **source_ref**: `src/common/dto/pagination-query.dto.ts:39-41` (confirmed, verificado 2026-08-17). **Certeza**: confirmed.

### REQ-2 · Seed de `catalogos:view` para roles demo `vendedor` y `cajero`

> **Que cambia**: `seeds/10_demo_roles_users.ts` otorga `catalogos:view` a los roles demo `vendedor` y `cajero`, de forma independiente del grant de `entities.trucks:edit` en `seeds/14`.
> **Por que**: sin este grant, ambos roles reciben 403 al consultar catalogos (categorias, aplicaciones, proveedores, bodegas, formas-pago, clientes) — la capability existe desde JOR-057 pero nunca se sembro para roles demo.

El seed `seeds/10_demo_roles_users.ts` MUST otorgar `catalogos:view` a los roles `vendedor` y `cajero`. El grant MUST quedar DECOUPLED de `entities.trucks:edit` — `seeds/14_entities_trucks_capabilities.ts` NO se modifica. El orden de seeds (04 antes de 10) MUST garantizar que la capability ya existe en el catalogo (`04_items_capabilities.ts`) al momento de asignarla.

**Actor**: system (seed). **Layers**: backend (seed), database (role_capabilities).

<details><summary>Scenarios de validacion</summary>

#### Scenario: rol vendedor gana la capability
- **GIVEN** la DB recien migrada y sembrada
- **WHEN** se consulta `role_capabilities` para el rol `vendedor`
- **THEN** incluye `catalogos:view` (conteo pasa de 2 a 3)

#### Scenario: rol cajero gana la capability
- **GIVEN** la DB recien migrada y sembrada
- **WHEN** se consulta `role_capabilities` para el rol `cajero`
- **THEN** incluye `catalogos:view` (conteo pasa de 16 a 17)

#### Scenario: seed 14 no se altera
- **GIVEN** el grant de `entities.trucks:edit` en `seeds/14_entities_trucks_capabilities.ts`
- **WHEN** se revisa el archivo tras este ticket
- **THEN** queda identico — el nuevo grant vive solo en `seeds/10`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: loguearse con un rol `vendedor` o `cajero` demo y ver que `GET /api/catalogos/*` responde 200 en vez de 403.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Conteo vendedor | seed corrido | query role_capabilities | vendedor | 3 caps (antes 2) |
| 2 | Conteo cajero | seed corrido | query role_capabilities | cajero | 17 caps (antes 16) |

- **source_ref**: `seeds/10_demo_roles_users.ts` (confirmed, verificado 2026-08-17); backlog B1 de [[SPEC-catalogos-stub-services]]; backlog BL-01 referencia el DTO relacionado en [[SPEC-backend-rbac]]. **Certeza**: confirmed.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | limite de longitud en input de busqueda libre | `@MaxLength` en filtro de paginacion | 100 chars |
| Security | RBAC coherente entre catalogo de capabilities y grants de roles demo | roles demo sin 403 en superficies documentadas | `catalogos:view` en vendedor y cajero |

## Artifacts

| Artifact | Path (repo) | REQ | Crea/Modifica |
|----------|-------------|-----|----------------|
| `PaginationQueryDto` | `backend/jormat-api/src/common/dto/pagination-query.dto.ts` | REQ-1 | modifica |
| Test unit del DTO | `backend/jormat-api/src/common/dto/pagination-query.dto.spec.ts` | REQ-1 | crea |
| Seed roles demo | `backend/jormat-api/seeds/10_demo_roles_users.ts` | REQ-2 | modifica |
| Test e2e roles-config | `backend/jormat-api/test/e2e/roles-config.e2e-spec.ts` | REQ-2 | modifica |

## Tasks

> Session unica (DET-20 no exige particion — 4 tasks caben en T2 acotado). Gate final con quality review single-judge (tier T2).

### Session 1 — quick-wins pagination + seed catalogos:view [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar `@MaxLength(100)` al campo `filter` de `PaginationQueryDto` | REQ-1 | developer | — | `src/common/dto/pagination-query.dto.ts` | unit test | git revert | DET-5, DET-8 | done | 1 |
| S1.T2 | Unit test del DTO: filtro valido pasa, filtro >100 chars da 400 | REQ-1 | developer | S1.T1 | `src/common/dto/pagination-query.dto.spec.ts` | `npm test` (unit) | git revert | DET-7, DET-8 | done | 1 |
| S1.T3 | Otorgar `catalogos:view` a roles `vendedor` y `cajero` en `seeds/10_demo_roles_users.ts` (decoupled de seed 14) | REQ-2 | developer | — | `seeds/10_demo_roles_users.ts` | `db:reset` + query manual role_capabilities | git revert + `db:reset` | DET-5, DET-8, DET-16 | done | 1 |
| S1.T4 | e2e `roles-config.e2e-spec.ts`: assert conteos exactos de `role_capabilities` (vendedor 2→3, cajero 16→17) | REQ-2 | developer | S1.T3 | `test/e2e/roles-config.e2e-spec.ts` | `npm run test:e2e` | git revert | DET-7, DET-8 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, correr validacion del tier (unit + e2e), decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23 | done | 1 |

## Constraints

- DET-16: propagacion conocida con destino fijo (JOR-152 es el destino declarado de rbac BL-01 y catalogos-stub B1) → tratado como sub-tarea de este ticket, no ticket derivado.
- RULE-global-002 (S2, seguridad): todo endpoint protegido exige `@RequireCapability` + test 403 — el grant de este ticket cierra el lado del seed, no del guard (el guard ya existia desde JOR-057).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|--------------|------|
| `PaginationQueryDto` (JOR-009) | internal | base heredada por los 8 DTOs de listado | bajo — cambio aditivo de validacion, no de shape |
| Seed RBAC (`seeds/04`, `seeds/10`) | internal | catalogo de capabilities debe existir antes del grant | bajo — orden de seeds ya garantizado (04<10) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-------------|
| `@MaxLength(100)` corta un filtro legitimo mas largo | low | UX (400 inesperado) | limite generoso vs longitud tipica de nombre/rut/codigo; test confirma casos normales pasan |
| Grant de `catalogos:view` se re-acopla a un dominio ajeno | low | deuda tecnica repetida | grant explicito en seed 10, sin tocar seed 14 |

## Open questions

Ninguna abierta — ambos fixes fueron confirmados con source_ref verificado durante el intake (2026-08-17).

## Decisions

### DEC-LOCAL-01: ubicacion del grant de `catalogos:view`
- **Contexto**: donde otorgar la capability a los roles demo sin repetir el acoplamiento de seed 14.
- **Drivers**: DET-16 (propagacion declarada, no side-effect oculto); orden de seeds (04 antes de 10).
- **Opcion elegida**: `seeds/10_demo_roles_users.ts`, decoupled de `entities.trucks:edit`.
- **Alternativas**: agregarlo dentro de `seeds/14_entities_trucks_capabilities.ts` (descartada — repite el acoplamiento capability-transversal a un dominio ajeno que origino B1).
- **Consecuencias**: el grant queda legible como decision de RBAC propia, no como efecto colateral de otro dominio.
- **Session**: S1.

## Success metrics

No aplica — fix de deuda tecnica sin metrica de negocio propia; se mide por acceptance checkpoints.

## Technical reference

- `PaginationQueryDto` es heredado por los 8 DTOs de listado del backend; `@MaxLength` en el padre alcanza a todos sin tocar los hijos (herencia de decoradores class-validator).
- `role_capabilities` es la tabla join RBAC (`roles` × `capabilities`) descrita en [[SPEC-backend-rbac]] REQ-01.

## Rules discovered

Ninguna — fix puntual, no genera rule nueva (planning-completeness: dim2 N/A).

## Bugs found

Ninguno adicional a los ya registrados como backlog (rbac BL-01, catalogos-stub B1).

## Acceptance checkpoints

- [x] **Funcional**: ambos scenarios de REQ-1 y REQ-2 pasan.
- [x] **Tests** (DET-37 dim4): S1.T2 (unit) y S1.T4 (e2e) creados/actualizados, corridos y en VERDE (722 unit, 225 e2e).
- [x] **NFRs**: limite de `@MaxLength(100)` aplicado; RBAC coherente en roles demo.
- [x] **Rules**: DET-5 (multi-capa: DTO + seed + e2e), DET-7 (test cases referencian discovery), DET-16 (propagacion declarada) respetadas.
- [x] **Integration**: regression via `roles-config.e2e-spec.ts` con conteos exactos, cero regresion en listados existentes.
- [x] **Docs oficiales del proyecto** (DET-37 dim1): N/A — cambio no observable de API salvo el 403 que se cierra (mejora, no contrato nuevo).
- [x] **KB DKC** (DET-37 dim2): N/A — no nace rule nueva de este fix puntual.
- [x] **Docs externas DKC** (DET-37 dim3): N/A — no toca DKC ni convenciones.
- [x] **Planning-completeness**: entry `planning-completeness=mixed` registrada en el ticket.
