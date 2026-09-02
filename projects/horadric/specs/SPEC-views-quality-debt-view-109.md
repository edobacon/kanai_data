---
id: SPEC-views-quality-debt-view-109
project: horadric
ticket: HOR-109
status: done
---

# QualityDebtView — parsear las 10 dims DET-23 + backlog de deuda de calidad

# QualityDebtView — parsear las 10 dims DET-23 + backlog de deuda de calidad

## Executive summary — lo que estas aprobando

**Que se quiere**: el HC viewer hoy ignora las 10 dimensiones del quality review (DET-23) que cada session escribe en el ticket — caen a `extras` sin formato y no hay forma de ver "donde tengo deuda de calidad". Este ticket hace que el viewer parsee esas dims y agrega una vista nueva (`QualityDebtView`) que lista todos los hallazgos en `warn`/`fail` del proyecto, con filtros. Es el consumidor que HOR-082 identifico como el verdadero entregable de valor.

**Decisiones criticas** (resueltas en intake, super autopilot):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Parsear markdown directo, sin JSON nuevo (DEC-01) | Cambio 100% en horadric-cube, cero toque a deckard/reviewer; markdown sigue siendo fuente unica de verdad |
| 2 | Parser tolera ambos formatos (heading `####` + bold-label) y parsea por nro de fila (DEC-02) | Tickets reales usan ambos + naming drift de dims; parsear por nombre seria fragil |
| 3 | Endpoint de agregacion dedicado, no N+1 (DEC-03) | El board no trae sessions; filtrar warn/fail en el browser exigiria N requests |

**Riesgos principales y mitigacion**:

- **Dos formatos del bloque en produccion** → parser opera sobre el body serializado completo, detecta el bloque por regex tolerante y extrae la tabla con `parseTables()` (helper existente), mapeando por columna `#` (1-10).
- **Romper el parsing de sessions existente** → el campo `qualityReview` es aditivo y opcional (`null` si no hay bloque); suite `sessions.test.ts` corre sin regresion en cada gate.
- **Cache stale tras cambiar el shape** → bump de `TICKET_DETAIL_SCHEMA_VERSION`.

**Que NO se hace**: editar/resolver hallazgos desde la vista (read-only), tendencias historicas, filtrado por reviewer/tier. No se toca el parser de deckard core ni el output del reviewer (HOR-082 no se reactiva).

**Tamano estimado**: 3 sessions (S1 parser, S2 API, S3 frontend), ~4-6h efectivas. S3 es la mas riesgosa (UI nueva + smoke).

**Como vas a saber que funciona**:
- Abro `/quality-debt` (o el tab nuevo) y veo la lista de hallazgos warn/fail agrupados por ticket.
- Filtro por dimension "Mantenibilidad" → solo quedan esos hallazgos.
- Abro el detalle de una session con quality review → veo la tabla de 10 dims con badges, ya no como texto plano.

---

## Purpose

Extender el parser de sessions del HC backend (`server/deckard/`) para extraer el bloque `Quality review (DET-23)` (reviewer, tier, resultado global, y las 10 dimensiones con su resultado `pass|warn|fail|n/a|pending`), exponerlo en `SessionSummary.qualityReview`, agregar un endpoint de agregacion `/:project/quality-debt` que devuelve los hallazgos warn/fail del proyecto, y construir `QualityDebtView` (lista + filtros) mas el render del bloque en `SessionDetailModal`. Todo confinado a horadric-cube.

## Requirements

### REQ-01: Parser de Quality review (10 dims)

> **Que cambia**: el backend pasa a entender el bloque `Quality review (DET-23)` de cada session — extrae reviewer, tier, resultado global y las 10 dimensiones con su resultado.
> **Por que**: hoy ese bloque cae a `extras` como texto sin estructura; sin parsearlo no hay forma de filtrar ni agregar deuda de calidad.

El sistema MUST extraer, desde el body de una session, un objeto `QualityReview` cuando el bloque `Quality review (DET-23)` esta presente (en formato heading `#### Quality review (DET-23)` o bold-label `**Quality review (DET-23)**:`), y MUST asignar `qualityReview: null` cuando no lo esta. El parser MUST mapear cada fila de la tabla por su columna `#` (1-10), no por el nombre de la dimension, y MUST tolerar: reviewer/resultado global ubicados antes o despues de la tabla, tablas que omiten filas `n/a`, y variaciones de nombre de dimension.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: formato bold-label completo
- **GIVEN** una session con `**Quality review (DET-23)**:` + tabla de 10 filas + `**Reviewer**`/`**Resultado global**`
- **WHEN** se parsea la session
- **THEN** `qualityReview.dimensions` tiene 10 entradas con `{index, name, result, notes}` y `result` normalizado a `pass|warn|fail|n/a|pending`

#### Scenario: formato heading con metadata al final (PEH-012)
- **GIVEN** `#### Quality review (DET-23)` con tabla y `**Reviewer**`/`**Resultado global**` despues de la tabla
- **WHEN** se parsea
- **THEN** reviewer/globalResult se extraen igual; dims mapeadas por nro de fila

#### Scenario: sin bloque
- **GIVEN** una session sin bloque Quality review
- **WHEN** se parsea
- **THEN** `qualityReview === null` y el resto del `SessionSummary` no cambia
</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `npm test sessions` y los nuevos casos de parsing pasan.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | bold-label completo | session con `**Quality review (DET-23)**:` + 10 filas | parseSessionsSection | qualityReview no null | `dimensions.length === 10`, dim#6 result `warn` |
| 2 | heading + meta al final | `#### Quality review` + meta post-tabla | parse | globalResult extraido | `globalResult === 'pass'` |
| 3 | tabla parcial (omite n/a) | tabla con 6 filas aplicables | parse | dims presentes mapeadas por # | filas presentes correctas, faltantes ausentes |
| 4 | sin bloque | session normal | parse | sin crash | `qualityReview === null` |

### REQ-02: Tipo `QualityReview` en el contrato del viewer

> **Que cambia**: `SessionSummary` gana un campo `qualityReview` (server + client + shared).
> **Por que**: el frontend necesita el tipo para renderizar y filtrar.

El sistema MUST definir `QualityReview` y `QualityDimension` en `shared/types.ts` (fuente unica), MUST referenciarlos desde `SessionSummary` en `server/deckard/sessions.ts` y en la replica de `src/api/client.ts`, y MUST bump-ear `TICKET_DETAIL_SCHEMA_VERSION` para invalidar cache.

**Actor**: system
**Layers**: backend, api

#### Acceptance
**El usuario puede verificar que funciona**: `npm run typecheck` (o build) sin errores nuevos; el detalle de ticket serializa `qualityReview`.

### REQ-03: Endpoint de agregacion `/:project/quality-debt`

> **Que cambia**: un endpoint nuevo devuelve la lista plana de hallazgos warn/fail de todas las sessions del proyecto.
> **Por que**: evita que el frontend cargue el detalle de cada ticket (N+1) solo para filtrar.

El sistema MUST exponer `GET /api/projects/:project/quality-debt` que escanea los tickets del proyecto, parsea sus sessions, y devuelve solo las dimensiones en `warn` o `fail`, cada hallazgo con `{ticketId, ticketTitle, module, session, dimensionIndex, dimensionName, result, notes }`. El endpoint MUST NO alterar el contrato de listado existente.

**Actor**: system
**Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: agregacion
- **GIVEN** un proyecto con sessions que tienen dims warn/fail
- **WHEN** GET /api/projects/horadric/quality-debt
- **THEN** responde array solo con result `warn|fail`, ordenable por ticket

#### Scenario: proyecto sin deuda
- **GIVEN** un proyecto sin dims warn/fail
- **WHEN** GET
- **THEN** `[]`
</details>

#### Acceptance
**El usuario puede verificar que funciona**: `curl /api/projects/horadric/quality-debt` devuelve solo hallazgos warn/fail.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 5 | agregacion warn/fail | fixtures con dims mixtas | GET endpoint (o handler unit) | solo warn/fail | sin filas pass/n/a; shape correcto |

### REQ-04: QualityDebtView (lista + filtros)

> **Que cambia**: vista nueva en `/quality-debt` que lista los hallazgos con filtros por dimension, resultado y modulo.
> **Por que**: materializa el "backlog de deuda de calidad" de DET-23:650 — valor visible.

El sistema MUST proveer una vista (ruta `/quality-debt`, o `/:project/quality-debt`) que consume el endpoint, lista los hallazgos agrupados por ticket, y MUST permitir filtrar por dimension, por resultado (warn/fail) y por modulo reusando el patron de filtrado existente. La vista MUST mostrar empty-state cuando no hay deuda y MUST enlazar cada hallazgo al detalle del ticket.

**Actor**: user
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: abre la vista, ve los hallazgos, aplica un filtro de dimension y la lista se reduce.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 6 | filtro por dimension | vista cargada con hallazgos | click filtro "Mantenibilidad" | lista filtrada | solo dim #6 visible |

### REQ-05: Render del Quality review en SessionDetailModal

> **Que cambia**: el detalle de una session muestra la tabla de 10 dims con badges, en vez de texto plano en extras.
> **Por que**: cierra el loop — la dim es navegable desde el ticket, no solo en la vista agregada.

El sistema MUST renderizar `session.qualityReview` (si no es null) en `SessionDetailModal` como tabla con badge de color por resultado, y MUST evitar que el bloque siga apareciendo duplicado en `extras`.

**Actor**: user
**Layers**: frontend

#### Acceptance
**El usuario puede verificar que funciona**: abre una session con quality review y ve la tabla de dims con badges.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 7 | render modal | session con qualityReview | abrir modal | tabla con badges | 10 filas, dim warn en amber, fail en rojo |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | endpoint quality-debt escanea sessions del proyecto | latencia | < 500ms para ~200 tickets (lectura fs ya usada por listado) |
| Maintainability | parser en archivo propio, funciones < 40 lineas | — | `qualityReview.ts` dedicado, SRP |
| A11y (DET-23 #8) | badges con texto + color (no solo color) | — | resultado legible sin depender de color |

## Artifacts

### Types (shared/types.ts)

```ts
export type DimensionResult = 'pass' | 'warn' | 'fail' | 'n/a' | 'pending'
export interface QualityDimension {
  index: number          // 1-10 (columna #)
  name: string           // label tal como aparece (ej. "Mantenibilidad")
  result: DimensionResult
  notes: string
}
export interface QualityReview {
  reviewer: string | null
  tier: string | null            // light | standard | exhaustive
  globalResult: string | null    // pass | iterate | escalate
  dimensions: QualityDimension[]
}
export interface QualityDebtFinding {
  ticketId: string
  ticketTitle: string
  module: string | null
  session: string                // ej. "S3" o "S2.GATE"
  dimensionIndex: number
  dimensionName: string
  result: 'warn' | 'fail'
  notes: string
}
```

### Endpoints

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | /api/projects/:project/quality-debt | none (local) | — | `QualityDebtFinding[]` | 404 (project) |

## Tasks

### Session 1 — Capa parser: parseQualityReview + tipos + integracion [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | Definir tipos `DimensionResult`/`QualityDimension`/`QualityReview`/`QualityDebtFinding` en shared/types.ts | REQ-02 | developer | — | shared/types.ts | typecheck | git revert del bloque agregado | DET-23 | pending | S1 |
| S1.T2 | Crear `parseQualityReview(body)` en server/deckard/qualityReview.ts (ambos formatos, parseTables, mapeo por #, metadata tolerante) | REQ-01 | developer | S1.T1 | server/deckard/qualityReview.ts | unit tests (TC-1..4) | borrar archivo | DET-23 | pending | S1 |
| S1.T3 | Integrar en buildExecutedSummary: campo `qualityReview` en SessionSummary + excluir el bloque de extras | REQ-01,REQ-02 | developer | S1.T2 | server/deckard/sessions.ts | npm test sessions sin regresion | revert del campo | DET-23 | pending | S1 |
| S1.T4 | Tests de qualityReview (TC-1..4) con fixtures inline (bold-label, heading, parcial, ausente) | REQ-01 | developer | S1.T2 | server/deckard/qualityReview.test.ts | tests verdes | borrar test | DET-7,DET-23 | pending | S1 |
| S1.GATE | Quality review (DET-23) + persistir + validar T2 | — | reviewer | S1.T4 | — | suite backend verde, coverage no baja | — | DET-23 | pending | S1 |

### Session 2 — Capa API: endpoint quality-debt + client + cache [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S2.T1 | Replicar tipos en src/api/client.ts (SessionSummary.qualityReview) + QualityDebtFinding | REQ-02 | developer | S1.GATE | src/api/client.ts | typecheck | revert | DET-23 | pending | S2 |
| S2.T2 | Bump TICKET_DETAIL_SCHEMA_VERSION en server/routes/tickets.ts | REQ-02 | developer | S2.T1 | server/routes/tickets.ts | build | revert string | DET-23 | pending | S2 |
| S2.T3 | Crear handler+route `GET /:project/quality-debt` (agregacion warn/fail) en server/routes/qualityDebt.ts + registrar en server/index.ts | REQ-03 | developer | S2.T1 | server/routes/qualityDebt.ts, server/index.ts | integration test (TC-5) | quitar route | DET-23 | pending | S2 |
| S2.T4 | client.ts: funcion `qualityDebt(project)` que consume el endpoint | REQ-03,REQ-04 | developer | S2.T3 | src/api/client.ts | typecheck | revert | DET-23 | pending | S2 |
| S2.GATE | Quality review (DET-23) + persistir + validar T2 | — | reviewer | S2.T4 | — | endpoint responde shape; suite verde | — | DET-23 | pending | S2 |

### Session 3 — Capa frontend: QualityDebtView + filtro + ruta + render en modal [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S3.T1 | Crear src/views/QualityDebtView.vue (lista agrupada por ticket + filtros dimension/resultado/modulo + empty state) | REQ-04 | developer | S2.GATE | src/views/QualityDebtView.vue | smoke render | borrar view | DET-23 | pending | S3 |
| S3.T2 | Registrar ruta /quality-debt en src/router.ts + entrada de navegacion | REQ-04 | developer | S3.T1 | src/router.ts | nav abre la vista | revert route | DET-23 | pending | S3 |
| S3.T3 | Render de session.qualityReview en SessionDetailModal (tabla + badges) + excluir de extras render | REQ-05 | developer | S2.GATE | src/components/sessions/, src/components/tickets/ | modal muestra tabla | revert | DET-23 | pending | S3 |
| S3.T4 | Smoke UI (Playwright/manual): abrir vista, filtrar por dimension, abrir modal con dims (TC-6, TC-7) | REQ-04,REQ-05 | developer | S3.T1,S3.T2,S3.T3 | — | screenshots evidencia | — | DET-7,DET-23 | pending | S3 |
| S3.GATE | Quality review (DET-23) exhaustive (T3) + persistir + smoke + cierre | — | reviewer | S3.T4 | — | UI verificada, a11y badges, sin regresion | — | DET-23 | pending | S3 |

## Acceptance checkpoints

- [x] AC-1: `npm test` backend verde con los nuevos casos de parsing (TC-1..5) — 207/207, 56 del feature
- [x] AC-2: `GET /api/projects/horadric/quality-debt` devuelve solo warn/fail — curl real → 17 findings warn
- [x] AC-3: QualityDebtView lista + filtra (TC-6) — smoke: 17→7 al filtrar "Testing", screenshot
- [x] AC-4: SessionDetailModal renderiza las 10 dims con badges (TC-7) — smoke HOR-108, screenshot
- [x] AC-5: sin regresion en `sessions.test.ts` ni en el build del frontend — 205/205 base + build OK
