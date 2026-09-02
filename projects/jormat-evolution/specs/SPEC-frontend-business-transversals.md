---
id: SPEC-frontend-business-transversals
project: jormat-evolution
ticket: JOR-017
status: done
---

# B5 · Transversales de negocio (front + stub) — consolidación de moneda/estado/fecha + vista Reportes

# B5 · Transversales de negocio (front + stub) — consolidación de moneda/estado/fecha + vista Reportes

## Executive summary — lo que estas aprobando

### 1. Que se quiere
El **ticket de cierre de la Fase B**: extraer y normalizar en una capa compartida (`src/lib/`) los helpers y enums que los módulos B1–B4 (items, ventas, compras, pagos) implementaron **localmente y a veces duplicados**, y entregar la **estructura** de la vista Reportes (ruta + nav + gateo) con su **stub de backend**. No es construir desde cero: ~64% es consolidar lo existente (ver inventario H1–H7 del ticket). Recorre la rampa Bn: Bn.0 capabilities (seed reportes) → Bn.1 contratos/helpers compartidos → Bn.2 componentes display + vista contra MSW → Bn.3 BE stub. Los servicios dinámicos de reportes (datos reales, filtros, export) son Fase C.

### 2. Decisiones críticas

| Decisión | Racional (1 línea) |
|----------|--------------------|
| Capa compartida en `src/lib/` (FE) y `src/common/`+`src/reportes/` (BE), **no `src/shared/`** | Convención real observada en B1–B4 (D1 del intake); DEC-002 Fase 2 de `shared/` sigue diferida — este ticket no la toca |
| **Sin paquete Zod cross-package** (DEC-LOCAL-03 / DEC-002) | BE y FE son paquetes independientes; "compartido" = intra-FE en `lib/` + sync de tipos BE→FE vía codegen `openapi-typescript`. No se crea paquete consumido por ambos |
| `Currency` unificado absorbe `MONEDA` (ventas) y `CURRENCY` (compras) | Dup conocida y **explícitamente diferida a B5** en `purchases.ts:18`; un solo enum + labels + símbolos |
| `IVA_RATE` único + `calcIva(neto, currency)` como única vía | Hoy `IVA_RATE=0.19` está duplicado (ventas.ts + purchases.ts); `calcIva` condicional por moneda subsume el caso CLP-only de ventas |
| `StatusBadge` envuelve el `<Badge>` existente, no lo reemplaza | Reuso > build (DET-32); elimina los `STOCK_BADGE_VARIANT` inline duplicados sin tocar la primitiva UI |
| `formatDate` con `date-fns` (ya instalado, sin uso) — **no** se instala i18next | El ticket lo pide; los literales es-CL viven en mapas `*_LABEL` (patrón intencional), no requieren lib i18n |
| Vista Reportes = **estructura** (ruta + nav `hasView:true` + gateo + MSW stub); datos reales = Fase C | El ticket acota Bn al stub; servicios dinámicos fuera de alcance |
| Migración de consumers B1–B4 con **tests + smoke visual** antes de borrar dups | El único riesgo real es regresión silenciosa en vistas ya entregadas |

### 3. Riesgos principales y cómo los mitigamos

| Riesgo | Mitigación |
|--------|-----------|
| Regresión silenciosa al migrar consumers de B1–B4 a los helpers consolidados | Tests unit de los helpers + correr suite completa por session + smoke visual (Playwright) en gates ⚑ de S3/S4 antes de borrar las versiones locales |
| `formatCLP` (lib/format) y `formatMoney` (purchases) tienen output ligeramente distinto (espacio tras `$`, decimales) | Definir el contrato exacto de `formatCurrency` en REQ-01 con tests de salida literal; migrar al canónico y documentar el cambio si alguna vista lo nota |
| Colisión de nombre `FORMA_PAGO` (ventas=términos crédito; payments=instrumentos) | NO unificar — son dominios distintos; quedan separados; `StatusBadge` los trata como mapas de dominio independientes |
| FE referencia `reportes.summary:view` antes de que S5 seedee la capability | MSW mockea el catálogo en S4; el seed real (S5) cierra el loop; documentado como dependencia S4→S5 |

### 4. Que NO se hace
Servicios dinámicos de reportes (datos reales, agregaciones, filtros de rango) — Fase C · exportación real de archivos (se gatea, no se implementa) · Fase 2 de DEC-002 (tipado universal de `shared/`) · integración real con SII · multi-workspace (DEC-001) · refactor de las primitivas list/builder ya extraídas · unificar `FORMA_PAGO` entre dominios · instalar i18next/next-intl.

### 5. Tamaño estimado
5 sessions · ~24 tasks · FE (3 módulos `lib/` consolidados + migración de consumers + 3 componentes display + vista Reportes estructura + Storybook + tests) + BE stub (módulo reportes + seed capability + Swagger + Supertest) + codegen. Las más riesgosas: **S3** (componentes, migración de usos) y **S4** (vista nueva) — ambas T3 ⚑ fuerte por ser user-facing.

### 6. Cómo vas a saber que funciona
- `npm run test` verde: unit de `formatCurrency` (CLP/EUR/USD, negativos, bordes), `calcIva` (19% CLP / 0% import), `formatDate` (DD/MM/YYYY, datetime, inválida), mapas de `StatusBadge`, gateo `<Can>` de la vista, supertest del stub (shape + 403 por capability).
- Sin duplicación: `grep` no encuentra `IVA_RATE` ni `formatCLP` declarados dos veces; `ItemDetailModal` ya no tiene formatter inline.
- Storybook: `CurrencyDisplay`/`StatusBadge`/`DateDisplay` y la vista Reportes renderizan; a11y sin violaciones.
- Smoke visual: las vistas de ventas/compras/pagos/items siguen renderizando montos/estados/fechas igual tras la migración (sin regresión).
- Swagger `/docs` expone `reportes`; `npm run generate:api-types` regenera `api.gen.ts` sin error.

## Purpose

Entregar la **capa transversal de negocio** de la Fase B: un único origen para formateo de moneda (multi-divisa CLP/EUR/USD + IVA condicional), estado (badges tipados por dominio: SII, comercial, pago, stock) y fecha (es-CL), más la **estructura** de la vista Reportes y su backend stub. Consolida lo que B1–B4 implementaron localmente para que la Fase C conecte servicios reales sin rediseñar ni re-duplicar. Actor: dev consumidor (los módulos de negocio) y usuario final (ve montos/estados/fechas consistentes y accede a Reportes gateado).

## Requirements

### REQ-01 · Bn.1 — `lib/currency.ts`: moneda + IVA unificados

> **Que cambia**: hay un solo lugar para formatear plata y calcular IVA. `CurrencyDisplay` y todas las vistas usan `formatCurrency(amount, currency)`; el IVA sale siempre de `calcIva(neto, currency)`. Desaparecen el `formatCLP` copiado en `ItemDetailModal` y el `IVA_RATE` declarado dos veces.
> **Por que**: hoy hay 3 formatters de moneda (uno inline divergente) y `IVA_RATE=0.19` duplicado en dos schemas — fuente de drift y bugs de redondeo.

El sistema MUST exponer en `front/jormat-front/src/lib/currency.ts`: el enum `Currency` (`'CLP'|'EUR'|'USD'`) con `CURRENCY_LABEL` y `CURRENCY_SYMBOL`, una constante única `IVA_RATE`, `formatCurrency(amount: number, currency?: Currency)` (CLP sin decimales, EUR/USD 2 decimales, locale `es-CL`, sep. miles `.`), y `calcIva(neto: number, currency: Currency)` (19% si `CLP`, 0% si importación). MUST migrar los consumers existentes y eliminar las definiciones duplicadas (`formatCLP` inline en `ItemDetailModal`, `MONEDA` de ventas, los dos `IVA_RATE`), sin cambiar la salida visible de las vistas B1–B4.

<details><summary>Scenarios de validacion</summary>

#### Scenario: formateo CLP
- **GIVEN** `amount=1234567`, `currency='CLP'`
- **WHEN** se llama `formatCurrency`
- **THEN** retorna `"$ 1.234.567"` (sin decimales, sep. miles `.`)

#### Scenario: formateo EUR/USD con decimales
- **GIVEN** `amount=1234567.5`, `currency='EUR'`
- **WHEN** se llama `formatCurrency`
- **THEN** retorna `"€ 1.234.567,50"` (2 decimales, `,` decimal)

#### Scenario: IVA condicional por moneda (caso error/borde)
- **GIVEN** `neto=100000`
- **WHEN** `calcIva(neto, 'CLP')` y `calcIva(neto, 'USD')`
- **THEN** `19000` y `0` respectivamente

#### Scenario: sin duplicación tras migración
- **GIVEN** el repo post-S1
- **WHEN** `grep -rn 'IVA_RATE *=' src/` y `grep -rn 'function formatCLP' src/`
- **THEN** una sola declaración de `IVA_RATE`; cero formatters de moneda inline

</details>

### REQ-02 · Bn.1 — `lib/status.ts` + `lib/date.ts`: estado y fecha unificados

> **Que cambia**: el tipo `BadgeVariant` y los mapas estado→{label,variant} viven en un solo módulo, y hay un `formatDate` es-CL reutilizable. El `STOCK_BADGE_VARIANT` copiado en dos componentes de items desaparece.
> **Por que**: `BadgeVariant` está declarado dos veces y `STOCK_BADGE_VARIANT` está duplicado entre `ItemsTable` y `ItemDetailModal`; las fechas se muestran como ISO crudo.

El sistema MUST exponer en `src/lib/status.ts` un único tipo `BadgeVariant` (`'success'|'warning'|'error'|'neutral'`) y los mapas `status → { label, variant }` por dominio (SII, comercial, pago, stock), y en `src/lib/date.ts` `formatDate(iso: string, variant?: 'date'|'datetime')` (es-CL, `DD/MM/YYYY`, fallback `—` para inválida/null) usando `date-fns`. MUST migrar los consumers y eliminar `STOCK_BADGE_VARIANT` inline y el `BadgeVariant`/`PaymentBadgeVariant` duplicado.

<details><summary>Scenarios de validacion</summary>

#### Scenario: formateo de fecha es-CL
- **GIVEN** `iso='2026-03-09T14:30:00Z'`
- **WHEN** `formatDate(iso)` y `formatDate(iso,'datetime')`
- **THEN** `"09/03/2026"` y `"09/03/2026 14:30"`

#### Scenario: fecha inválida (borde)
- **GIVEN** `iso=null` o string inválido
- **WHEN** `formatDate(iso)`
- **THEN** retorna `"—"` sin lanzar

#### Scenario: mapa de estado por dominio
- **GIVEN** dominio `payment`, status `'Vencida'`
- **WHEN** se resuelve el mapa
- **THEN** `{ label: 'Vencida', variant: 'error' }`

</details>

### REQ-03 · Bn.2 — Componentes display: `CurrencyDisplay`, `StatusBadge`, `DateDisplay`

> **Que cambia**: las vistas dejan de formatear inline; usan 3 componentes compartidos que consumen los helpers de REQ-01/02. `StatusBadge` envuelve el `<Badge>` existente y resuelve label+variant por dominio.
> **Por que**: cada módulo repetía el patrón `<Badge variant={map[status]}>{label}</Badge>` y llamadas a formatters; centralizarlo da consistencia y testabilidad (Storybook + a11y).

El sistema MUST exponer en `src/components/shared/` los componentes `CurrencyDisplay` (`amount`, `currency?`), `StatusBadge` (`status`, `domain`) y `DateDisplay` (`iso`, `variant?`), cada uno con stories de Storybook cubriendo sus variantes y a11y sin violaciones. SHOULD migrar los usos en las vistas de items/ventas/compras/pagos a estos componentes sin cambiar la salida visible.

<details><summary>Scenarios de validacion</summary>

#### Scenario: StatusBadge por dominio
- **GIVEN** `<StatusBadge domain="sii" status="rechazado" />`
- **WHEN** renderiza
- **THEN** `<Badge variant="error">Rechazado</Badge>`

#### Scenario: stories + a11y
- **GIVEN** las stories de los 3 componentes
- **WHEN** corre el runner de Storybook/vitest + addon-a11y
- **THEN** todas verdes, sin violaciones a11y

#### Scenario: sin regresión visual (smoke)
- **GIVEN** las vistas migradas
- **WHEN** smoke visual en navegador
- **THEN** montos/estados/fechas se ven igual que antes de la migración

</details>

### REQ-04 · Bn.2 — Vista Reportes (estructura) gateada

> **Que cambia**: `/reportes` deja de estar deshabilitado en el menú; abre una vista con estructura (KPIs stub + catálogo de reportes "Próximamente") gateada por capability. Sin permiso, muestra `<Forbidden>`.
> **Por que**: hoy `nav-data.ts` tiene Reportes con `hasView:false`; B5 entrega la estructura para que Fase C cuelgue los datos reales.

El sistema MUST crear la ruta `(app)/reportes`, poner `hasView:true` en `nav-data.ts`, y gatear la vista con `<RouteGuard cap="reportes.summary:view">` (o `<Can>`). MUST montar un handler MSW stub para el endpoint de resumen. La vista muestra la **estructura** (KPIs vacíos + catálogo de reportes como placeholders), sin datos dinámicos.

<details><summary>Scenarios de validacion</summary>

#### Scenario: acceso con capability
- **GIVEN** usuario con `reportes.summary:view`
- **WHEN** navega a `/reportes`
- **THEN** ve la estructura (KPIs stub + catálogo)

#### Scenario: acceso sin capability (error)
- **GIVEN** usuario sin la capability
- **WHEN** navega a `/reportes`
- **THEN** ve `<Forbidden>` (no la vista)

#### Scenario: nav habilitado
- **GIVEN** el sidebar
- **WHEN** renderiza con la capability
- **THEN** el item "Reportes" es un link activo (no `aria-disabled`)

</details>

### REQ-05 · Bn.0+Bn.3 — BE stub `reportes` + seed capability + Swagger + codegen

> **Que cambia**: aparece el módulo NestJS `reportes` con endpoint(s) stub (respuesta hardcodeada, sin DB), gateado por `reportes.summary:view`, documentado en Swagger; el frontend puede regenerar sus tipos.
> **Por que**: cierra la rampa Bn (FE contra contrato real) y deja el contrato estable para que Fase C conecte la persistencia.

El sistema MUST crear `backend/jormat-api/src/reportes/` (module/controller/service/dto) siguiendo el patrón stub (`const SEED`, `_workspaceId` ignorado), con guard trio `AuthGuard→CapabilitiesHydrationGuard→CapabilitiesGuard` + `@RequireCapability('reportes.summary:view')`, DTOs con `@ApiProperty` (+ `class-validator` en inputs si hay filtros), `seeds/08_reportes_capabilities.ts` idempotente, `.addTag('reportes')` en `main.ts`, y Supertest cubriendo 200 (shape) + 403 (sin capability). MUST regenerar `front/jormat-front/src/types/api.gen.ts` vía `generate:api-types`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: endpoint stub responde shape contratado
- **GIVEN** usuario con `reportes.summary:view`
- **WHEN** GET al endpoint de resumen
- **THEN** 200 con el shape del DTO (datos hardcodeados)

#### Scenario: 403 sin capability (error)
- **GIVEN** usuario sin la capability
- **WHEN** GET al endpoint
- **THEN** 403 `{ code: 'FORBIDDEN' }`

#### Scenario: seed idempotente (borde)
- **GIVEN** la seed corrida dos veces
- **WHEN** `seed:run --specific 08_reportes_capabilities`
- **THEN** count estable (sin duplicar capabilities)

</details>

## Artifacts

> Sin meta-specs en el proyecto (`meta_specs: []`). Artifacts derivados del inventario (H1–H7) y del draft v1 aprobado.

### FE — módulos `lib/` (Bn.1)

| Módulo | Exports | Reuso / origen |
|--------|---------|----------------|
| `src/lib/currency.ts` | `Currency`, `CURRENCY_LABEL`, `CURRENCY_SYMBOL`, `IVA_RATE`, `formatCurrency`, `calcIva` | absorbe `lib/format.ts:formatCLP`, `purchases/format-currency.ts`, `MONEDA`/`CURRENCY`, `calc-iva.ts` |
| `src/lib/status.ts` | `BadgeVariant`, `STATUS_BADGE` (mapas por dominio: sii/comercial/payment/stock) | absorbe `*_BADGE`/`*_LABEL` de schemas, `STOCK_BADGE_VARIANT` inline, `BadgeVariant` duplicado |
| `src/lib/date.ts` | `formatDate(iso, variant)` | nuevo; motor `date-fns` (ya instalado) |

### FE — componentes display (Bn.2)

| Componente | Path | Props | Reuso |
|------------|------|-------|-------|
| `CurrencyDisplay` | `src/components/shared/CurrencyDisplay/` | `amount`, `currency?` | `formatCurrency` |
| `StatusBadge` | `src/components/shared/StatusBadge/` | `status`, `domain` | `Badge` (ui) + `STATUS_BADGE` |
| `DateDisplay` | `src/components/shared/DateDisplay/` | `iso`, `variant?` | `formatDate` |

### FE — vista Reportes (Bn.2)

| Artefacto | Path | Gateo |
|-----------|------|-------|
| Ruta `/reportes` | `src/app/(app)/reportes/page.tsx` | `reportes.summary:view` |
| Nav update | `src/components/shell/nav/nav-data.ts` | `hasView:true` |
| MSW handler | `src/test/msw/handlers/reportes.ts` | — |

### BE — módulo stub (Bn.0+Bn.3)

| Artefacto | Path | Auth |
|-----------|------|------|
| Módulo reportes | `backend/jormat-api/src/reportes/{reportes.module,controller,service}.ts` + `dto/` | guard trio |
| Endpoint resumen | `GET /reportes/summary` (stub) | `@RequireCapability('reportes.summary:view')` |
| Seed capability | `backend/jormat-api/seeds/08_reportes_capabilities.ts` | idempotente |
| Swagger tag | `backend/jormat-api/src/main.ts` | `.addTag('reportes', ...)` |
| Supertest | `src/reportes/reportes.controller.spec.ts` | 200 + 403 |

## Tasks

### Session 1 — Bn.1a `lib/currency.ts`: moneda + IVA unificados [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | Crear `lib/currency.ts` (`Currency`, labels, símbolos, `IVA_RATE`, `formatCurrency`, `calcIva`) | REQ-01 | developer | — | `src/lib/currency.ts` | tsc | git rm archivo | DET-1, DET-2 | done | S1 |
| S1.T2 | Migrar consumers de `formatCLP`/`formatMoney`/`MONEDA`/`CURRENCY` a `lib/currency`; borrar dups (inline `ItemDetailModal`, doble `IVA_RATE`, `MONEDA`) | REQ-01 | developer | S1.T1 | `src/lib/format.ts`, `src/lib/purchases/format-currency.ts`, `src/lib/schemas/{ventas,purchases}.ts`, `src/components/items/detail/ItemDetailModal/*`, +10 consumers | tsc + `npm run test` | git checkout | DET-5, DET-11, DET-16 | done | S1 |
| S1.T3 | Migrar `calcTotals` (ventas) e `calc-iva` (compras) a `calcIva(neto,currency)` único | REQ-01 | developer | S1.T1 | `src/lib/ventas/calc-totals.ts`, `src/lib/purchases/calc-iva.ts` | `npm run test` | git checkout | DET-5, DET-16 | done | S1 |
| S1.T4 | Test unit `currency.test.ts` (CLP/EUR/USD, negativos, IVA 19/0, sin dup) | REQ-01 | developer | S1.T1 | `src/lib/currency.test.ts` | `npm run test` | git checkout | DET-7 | done | S1 |
| **S1.GATE** | Persistir + validar T2 (tsc + tests verdes + grep sin dup) + quality review light + mutation warn-first (helpers) + commits | — | reviewer | S1.T1..T4 | — | tier T2 | — | DET-20, DET-23, DET-27, DET-31 | done | S1 |

### Session 2 — Bn.1b `lib/status.ts` + `lib/date.ts`: estado + fecha [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S2.T1 | Crear `lib/status.ts` (`BadgeVariant` único + `STATUS_BADGE` mapas por dominio) | REQ-02 | developer | — | `src/lib/status.ts` | tsc | git rm | DET-1, DET-2 | done | S2 |
| S2.T2 | Crear `lib/date.ts` (`formatDate` es-CL DD/MM/YYYY + datetime + fallback) | REQ-02 | developer | — | `src/lib/date.ts` | tsc | git rm | DET-1, DET-2 | done | S2 |
| S2.T3 | Migrar consumers de badge maps + borrar `STOCK_BADGE_VARIANT` inline y `BadgeVariant`/`PaymentBadgeVariant` duplicado | REQ-02 | developer | S2.T1 | `src/lib/schemas/{ventas,payments,items}.ts`, `src/components/items/list/ItemsTable/*`, `src/components/items/detail/ItemDetailModal/*` | tsc + `npm run test` | git checkout | DET-5, DET-16 | done | S2 |
| S2.T4 | Test unit `status.test.ts` + `date.test.ts` (mapas, DD/MM/YYYY, datetime, inválida) | REQ-02 | developer | S2.T1,T2 | `src/lib/status.test.ts`, `src/lib/date.test.ts` | `npm run test` | git checkout | DET-7 | done | S2 |
| **S2.GATE** | Persistir + validar T2 (tsc + tests + grep sin dup) + quality review light + mutation warn-first + commits | — | reviewer | S2.T1..T4 | — | tier T2 | — | DET-20, DET-23, DET-27, DET-31 | done | S2 |

### Session 3 — Bn.2 componentes display + Storybook [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S3.T1, S3.T2, S3.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S3.T1 | `CurrencyDisplay` + story + a11y | REQ-03 | developer | — | `src/components/shared/CurrencyDisplay/*` | Storybook/vitest | git rm | DET-1, RULE-global-001 | done | S3 |
| S3.T2 | `StatusBadge` + story (todos los dominios) + a11y | REQ-03 | developer | — | `src/components/shared/StatusBadge/*` | Storybook/vitest | git rm | DET-1, RULE-global-001 | done | S3 |
| S3.T3 | `DateDisplay` + story + a11y | REQ-03 | developer | — | `src/components/shared/DateDisplay/*` | Storybook/vitest | git rm | DET-1, RULE-global-001 | done | S3 |
| S3.T4 | Migrar usos en vistas items/ventas/compras/pagos a los componentes; smoke visual sin regresión | REQ-03 | developer | S3.T1,T2,T3 | `src/components/{items,ventas,compras,payments}/**` | `npm run test` + smoke Playwright | git checkout | DET-5, DET-16 | done | S3 |
| **S3.GATE** | Persistir + validar T3 (tests + stories + a11y + smoke visual sin regresión) + quality review standard + commits | — | reviewer | S3.T1..T4 | — | tier T3 | — | DET-20, DET-23, DET-27 | done | S3 |

### Session 4 — Bn.2 vista Reportes (estructura) gateada [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S4.T1 | MSW handler stub `reportes` (resumen) | REQ-04 | developer | — | `src/test/msw/handlers/reportes.ts` (+ registro) | `npm run test` | git checkout | RULE-global-003 | done | S4 |
| S4.T2 | Ruta `(app)/reportes/page.tsx` (estructura: KPIs stub + catálogo) gateada `<RouteGuard cap>` | REQ-04 | developer | S4.T1 | `src/app/(app)/reportes/page.tsx` | smoke Playwright | git rm | DET-1, RULE-global-002 | done | S4 |
| S4.T3 | `nav-data.ts` → `hasView:true` para `/reportes` | REQ-04 | developer | S4.T2 | `src/components/shell/nav/nav-data.ts` | `npm run test` (Sidebar) | git checkout | DET-16 | done | S4 |
| S4.T4 | Test: ruta gateada (acceso con/ sin capability → Forbidden) + nav habilitado | REQ-04 | developer | S4.T2,T3 | `*.test.tsx` | `npm run test` | git checkout | DET-7 | done | S4 |
| **S4.GATE** | Persistir + validar T3 (tests + smoke visual nav+vista + 403) + quality review standard + commits | — | reviewer | S4.T1..T4 | — | tier T3 | — | DET-20, DET-23, DET-27 | done | S4 |

### Session 5 — Bn.0+Bn.3 BE stub reportes + seed + Swagger + codegen [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S5.T1 | Seed `08_reportes_capabilities.ts` (idempotente, guard prod) | REQ-05 | developer | — | `backend/jormat-api/seeds/08_reportes_capabilities.ts` | `seed:run --specific` x2 → count estable | git rm | DET-2 | done | S5 |
| S5.T2 | Módulo `reportes` (module/controller/service/dto) stub + guard trio + `@RequireCapability` | REQ-05 | developer | — | `backend/jormat-api/src/reportes/*` | tsc | git rm | DET-1, RULE-global-002 | done | S5 |
| S5.T3 | `.addTag('reportes')` en `main.ts` + `@ApiProperty`/`@ApiTags`/`@ApiResponse` | REQ-05 | developer | S5.T2 | `backend/jormat-api/src/main.ts`, `src/reportes/dto/*` | build + `/docs-json` | git checkout | DET-16 | done | S5 |
| S5.T4 | Supertest `reportes.controller.spec.ts` (200 shape + 403 sin capability) | REQ-05 | developer | S5.T2 | `backend/jormat-api/src/reportes/reportes.controller.spec.ts` | `npm run test` (BE) | git checkout | DET-7 | done | S5 |
| S5.T5 | Regenerar `api.gen.ts` (`generate:api-types`) | REQ-05 | developer | S5.T3 | `front/jormat-front/src/types/api.gen.ts` | tsc FE | git checkout | DET-16 | done | S5 |
| **S5.GATE** | Persistir + validar T2 (Supertest verde + Swagger expone reportes + seed idempotente + api.gen regenerado) + quality review standard + commits + cierre | — | reviewer | S5.T1..T5 | — | tier T2 | — | DET-20, DET-23, DET-27 | done | S5 |

## Constraints

- RULE-global-001: estándares de calidad de código — sin `any`, funciones puras para helpers, nombres en inglés, comentarios en español, sin código muerto (los helpers consolidados son el corazón del ticket).
- RULE-global-002: baseline de seguridad — endpoints stub gateados por capability; sin datos reales de empresa/cliente en respuestas stub.
- RULE-global-003: no modificar la base entregada — la migración de consumers preserva la salida visible de B1–B4 (zero behavior change en la UI).
- DEC-001: tenant isolation — el endpoint stub acepta `workspaceId` pero lo ignora (`_workspaceId`); filtrado real diferido a Fase C.
- DEC-002: contrato tipado front-back — sync vía codegen `openapi-typescript`, NO paquete Zod compartido; Fase 2 de `shared/` diferida.
- DEC-004: validación backend con `class-validator` en DTOs de input (si se agregan filtros).
- DEC-005: framework de testing — Vitest (FE) / Jest+Supertest (BE) según convención del repo.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| B1–B4 (items/ventas/compras/pagos) | internal | provee los enums/helpers locales a consolidar | si una vista no estaba completa, faltaría un consumer a migrar (mitigado: inventario H1–H7 ya mapeó todos) |
| `date-fns ^4.4.0` | external | motor de `formatDate` (ya instalado) | ninguno — ya en package.json |
| capability `reportes.summary:view` | internal | S4 (FE gateo) la referencia antes de que S5 la seedee | MSW mockea catálogo en S4; seed real en S5 |
| `openapi-typescript` | external | regenera `api.gen.ts` desde `/docs-json` | requiere API levantada al regenerar (paso S5.T5) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresión silenciosa al migrar consumers a helpers consolidados | medium | high | tests unit de helpers + suite completa por session + smoke visual Playwright en S3/S4 antes de borrar dups |
| Diferencia de output `formatCLP` vs `formatMoney` (espacio/decimales) | medium | medium | contrato literal en REQ-01 con tests de salida; migrar al canónico y documentar |
| Vista Reportes referencia capability no seedeada (S4 antes de S5) | low | low | MSW mockea el catálogo; seed real en S5 cierra el loop |
| Codegen `api.gen.ts` falla si la API no está levantada | low | medium | levantar API stub antes de `generate:api-types`; paso explícito en S5.T5 |

## Open questions

Ninguna bloqueante. Decisiones D1–D3 (intake) + DEC-LOCAL-01/02 cierran el diseño.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Capa compartida en `lib/`+`common/`, no `shared/`
- **Contexto**: el `execute_scope` original apuntaba a `src/shared/` (FE/BE) que no existe como convención.
- **Drivers**: convención real de B1–B4 (FE `lib/`, BE `common/`); DEC-002 Fase 2 de `shared/` diferida.
- **Opción elegida**: consolidar en `src/lib/{currency,status,date}.ts` (FE) y `src/reportes/`+`src/common/` (BE).
- **Alternativas**: crear `src/shared/` ahora — descartada (adelanta infra diferida, rompe convención).
- **Consecuencias**: alineado con el repo; `execute_scope` del ticket corregido (D1).
- **Session**: design-feature.

### DEC-LOCAL-02: Sin paquete Zod cross-package
- **Contexto**: "contratos Zod compartidos" podría leerse como paquete consumido por FE y BE.
- **Drivers**: DEC-LOCAL-03 del repo (BE/FE independientes, sin cross-import) + DEC-002.
- **Opción elegida**: consolidación intra-FE en `lib/` + sync de tipos BE→FE vía codegen.
- **Alternativas**: paquete `shared/` con Zod — descartada (acopla dos paquetes independientes).
- **Consecuencias**: cada lado mantiene sus enums; el codegen es el puente.
- **Session**: design-feature.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..05 pasan
- [ ] **Tests**: unit de currency/status/date + stories + supertest stub escritos y verdes
- [ ] **No duplicación**: grep confirma `IVA_RATE`/`formatCLP`/`STOCK_BADGE_VARIANT`/`BadgeVariant` con una sola declaración cada uno
- [ ] **Sin regresión**: smoke visual de vistas B1–B4 muestra montos/estados/fechas iguales
- [ ] **Rules**: RULE-global-001/002/003 respetadas; sin `any`; sin console.*
- [ ] **Integration**: `/reportes` gateado (403 sin capability); Swagger expone `reportes`; `api.gen.ts` regenerado sin error
- [ ] **Docs**: spec y ticket actualizados; DEC-LOCAL registradas

## Technical reference

- **FE shared layer**: `src/lib/` (no `src/shared/`). Componentes compartidos en `src/components/shared/`. Badge primitiva en `src/components/ui/badge/badge.tsx` (variants success/warning/error/neutral).
- **Formatters origen**: `formatCLP` (`lib/format.ts:14`), `formatMoney`/`makeCurrencyFormatter` (`lib/purchases/format-currency.ts:10,23`), inline dup (`ItemDetailModal.tsx:28`).
- **Enums origen**: `MONEDA` (`schemas/ventas.ts:59`), `CURRENCY`+labels+símbolos (`schemas/purchases.ts:23`), `IVA_RATE` (`ventas.ts:63` + `purchases.ts:53`), `PAYMENT_STATUS`/`FORMA_PAGO` (`schemas/payments.ts:22,43`), `ESTADO_SII`/`ESTADO_COMERCIAL` (`schemas/ventas.ts:18,29`), `ESTADO_STOCK` (`schemas/items.ts:14`).
- **RBAC**: `<Can>` (`components/auth/Can/`), `useCan` (`hooks/useCan.ts`), `RouteGuard` (`components/auth/RouteGuard/`), `can()` (`lib/can.ts`). Capability format `module.feature:action`.
- **BE module pattern**: flat `src/<module>/` (controller/service/module/dto/spec). Stub `const SEED` + `_workspaceId` ignorado (ej. `payments.service.ts`). Guard trio en controller (`payments.controller.ts:29`). Seeds `0N_*_capabilities.ts`. Swagger en `main.ts:20-38`. Supertest pattern: `payments.controller.spec.ts` (fake AuthGuard, real CapabilitiesGuard, mock PermissionsService).
- **Codegen**: `npm run generate:api-types` → `openapi-typescript /docs-json -o src/types/api.gen.ts`.
- **MSW**: handlers en `src/test/msw/handlers/<domain>.ts`, registrados en `handlers.ts`; ruta `/api/proxy/<domain>/<resource>`.
- **Storybook**: `*.stories.tsx` co-located; framework `@storybook/nextjs-vite`; addons a11y + vitest.
