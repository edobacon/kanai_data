---
id: SPEC-business-logic-parity
project: pehuen
ticket: PEH-001
status: in_progress
---

# Paridad de Lógicas de Negocio — inventario y validación

# Paridad de Lógicas de Negocio — inventario y validación

## Purpose

Inventario de **lógicas pesadas de cálculo, transformación y agregación** del legacy que alimentan vistas, reportes o decisiones operativas. Por cada lógica:

- ID `LOGIC-{module}-{seq}`.
- Ubicación legacy (file:line) — frontend (`pehuen-client`) o backend (`pehuen-server`).
- Inputs / outputs / variantes (qué cambia según `cancha`, `espacio`, `usuario.role`, `usuario.cancha`, etc.).
- Riesgo (`critical` | `medium` | `low`) según impacto en datos visibles a usuarios.
- Status en nuxt: `ported-equivalent` | `ported-improved` | `pending` | `partial` | `missing` | `retired` | `drift`.
- Ubicación nuxt esperada (server / composable / store / component).
- Ubicación nuxt actual si existe (file:line).
- Tests de paridad (suite que valida outputs idénticos legacy↔nuxt para mismos inputs).

Aplicación de [RULE-MIGRATION-001](../rules/migration/RULE-MIGRATION-001-no-functional-regression.md): ningún `LOGIC-*` puede quedar en estado `partial` o `missing` al corte.

## Strategy — incremental por riesgo

> Sin esta estrategia el inventario es inviable. Hay miles de líneas en `views/rumas/List.vue` (1100), `views/asesor/Rumas.vue` (881), `views/guides/Create.vue` (1221) que mezclan UI con cálculo. Catalogar todo a mano es perder semanas.

**Fases:**

1. **Fase 1 — Inventario crítico** (sprint actual):
   - Solo lógicas que producen **valores visibles al usuario** (totales, balances de stock, agregaciones de canchas, conversiones de unidades).
   - Identificar con grep dirigido + lectura de archivos de mayor tamaño.
   - Marcar todas como `risk: critical` por default y refinar.

2. **Fase 2 — Inventario operativo**:
   - Filtros, sort, paginado, transforms para dropdowns/selects.
   - `risk: medium` por default.
   - Correr después de Fase 1, en paralelo a la implementación de paridad de las críticas.

3. **Fase 3 — Inventario cosmético**:
   - Format de fechas, capitalize, etc.
   - `risk: low`.
   - Solo si Fase 1 y 2 están completas y queda budget.

## Indicadores para detectar lógica pesada

El audit script greppea estos patterns en `pehuen-client/src` y `pehuen-server/src`:

- `computed(\(\) => {[\s\S]*?(reduce|map|filter|forEach).*}` — computeds con iteración.
- `function .*\([\w,\s:]*\)[\s\S]*?(reduce|forEach|for \(|while)` — funciones con loops.
- `cancha === ['"]ALL['"]` o variantes con cancha — variantes por scope cancha.
- `user\.role === ` o `user\.cancha === ` dentro de bodies de funciones — variantes por rol/scope.
- `Math\.(round|ceil|floor|abs)` con operaciones encadenadas — conversiones numéricas.
- `Object\.entries`, `Object\.fromEntries`, `groupBy` o equivalentes manuales — agregaciones.

## Catálogo Fase 1 — críticas (inicial, completar al implementar audit)

> Esta tabla es **seed**. El audit script (task #1) la pobla automáticamente.

| ID | Lógica | Variantes | Riesgo | Evidencia legacy | Status nuxt | Ubicación nuxt esperada |
|----|--------|-----------|--------|------------------|-------------|--------------------------|
| LOGIC-RUMAS-001 | Cálculo de totales/balances en lista de rumas | cancha (ALL vs específica), rol | critical | `views/rumas/List.vue` (1100 líneas, computeds + transforms) | pending | `server/api/rumas/index.get.ts` o composable `app/composables/useRumasStats.ts` |
| LOGIC-RUMAS-002 | Geo/mapa: agrupar rumas por cancha + lat/lng | role A/R | critical | `views/rumas/List.vue:16` (geo) + métodos relacionados | pending | composable `useRumasMap` |
| LOGIC-GUIDES-001 | Cálculo de movimientos (entrada/salida/ajuste) | tipo movimiento, rol al editar (ADMIN bypassa restricciones) | critical | `views/guides/Create.vue:213` y métodos relacionados | pending | `server/services/guide.service.ts` |
| LOGIC-GUIDES-002 | Validaciones de guía (cantidad, peso, conversiones) | tipo movimiento | critical | `views/guides/Create.vue` (form validations) | pending | `shared/schemas/guide.schema.ts` (zod) |
| LOGIC-AJUSTES-001 | Cálculo de ajustes individuales | cancha del usuario | critical | `views/ajustes/index.vue` + handlers | pending | `server/services/ajuste.service.ts` |
| LOGIC-AJUSTES-002 | Cálculo de ajustes batch (load) | cancha, validación de archivo | critical | `views/ajustes/load.vue` | pending | `server/services/ajuste.batch.service.ts` |
| LOGIC-STATS-001 | Estadísticas globales (Stats.vue) | rol ADMIN | critical | `views/Stats.vue:13` | pending | `server/api/stats/admin.get.ts` |
| LOGIC-STATS-002 | Estadísticas asesor | rol ASESOR + scope cancha | critical | `views/asesor/Stats.vue` | pending | `server/api/stats/asesor.get.ts` |
| LOGIC-USERS-001 | Filtro de usuarios por rol del observador | A ve todos; S ve subset | medium → critical (si afecta scope visible) | `views/Users.vue:156-185` | pending | `server/api/users/index.get.ts` (con `scopeByRole`) |
| LOGIC-MII-001 | Importación MII (Material/Inventory Import) | parsing + validación | critical | `views/guides/Importer.vue` + endpoints relacionados | pending | `server/services/mii.import.service.ts` |
| LOGIC-REPORTS-001 | Generación de reportes Excel | rol, cancha, rango fechas | critical | `views/Reports.vue` | pending | `server/api/reports/excel.post.ts` |

**Fase 2 (medium)** y **Fase 3 (low)**: poblar después de Fase 1.

## Variantes — qué hace que una lógica tenga múltiples paths

Estas variables aparecen recurrentemente y deben validarse en cada lógica donde participan:

| Variable | Origen | Comportamiento típico |
|----------|--------|------------------------|
| `user.cancha === 'ALL'` | sentinel literal (RULE-AUTH-001) | sin scope; ve todas las canchas |
| `user.cancha !== 'ALL'` | cancha específica | scope de lectura/escritura limitado a esa cancha |
| `user.role === 'ADMINISTRADOR'` | rol global | bypass de restricciones de edición/scope |
| `user.role === 'RECEPTOR'` | rol cancha | scope automático por cancha |
| `user.role === 'ASESOR'` | rol especial | UI dedicada (asesor.*); geo activado |
| `user.role === 'CONSULTOR'` / `'SUPERVISOR'` | solo lectura | acciones reducidas a VER |
| `cancha` query param | filtro UI | refina lo que el rol ya permite |
| `espacio` (si aplica) | sub-scope dentro de cancha | refina aún más; presente en algunos cálculos |

**Por cada `LOGIC-*` el spec debe enumerar qué subconjunto de estas variables lo afecta**. El audit detecta una lógica como `partial` si la versión nuxt no maneja todas las variantes que la legacy maneja.

## Migration Tests (TDD obligatorio — RULE-MIGRATION-002)

> Cada `LOGIC-*` requiere **mínimo 1 TC** por **variante distintiva** (combinación de `cancha`, `rol`, `espacio`, `usuario.cancha === 'ALL'`, etc. que cambia el output). Tag default `@paridad` con `pass_against: both`. Si el nuxt mejora la lógica → tag `@improvement` con `pass_against: nuxt-only` y entrada en SPEC-migration-improvements.

### Slots de TC reservados

`SPEC-migration-tdd` reserva **TC-136..TC-150** para `stats` (5 algoritmos) y los TCs de `validations`/`paridad-rumas`/`paridad-guias`/`paridad-ajustes` cubren parcialmente otras LOGIC-*. Ver SPEC-migration-tdd Tasks #14-#16, #24-#25.

### Seed (completar al ejecutar tasks)

| TC | Layer | Tag | LOGIC | Variantes | Source code | pass_against | Status |
|----|-------|-----|-------|-----------|-------------|--------------|--------|
| TC-136..TC-140 | 5-e2e | @paridad | LOGIC-STATS-001/002 (5 algoritmos) | rol ADMIN vs ASESOR, scope cancha | `pehuen-server/src/services/stats.service.ts` | both (tolerancia 0.001) | pending |
| TC-RUMAS-vol | 4-contracts | @paridad | LOGIC-RUMAS-001 (volumenes calculados) | cancha ALL vs específica | `pehuen-server/src/services/ruma.service.ts` (volCalculado, volMR, volM3) | both (tolerancia 0.001) | pending |
| TC-RUMAS-map | 5-e2e | @paridad | LOGIC-RUMAS-002 (geo agrupado) | rol A/R | `pehuen-client/src/views/rumas/List.vue` | both | pending |
| TC-GUIDES-mov | 4-contracts | @paridad | LOGIC-GUIDES-001 (movimientos) | tipo movimiento × rol | `pehuen-client/src/views/guides/Create.vue:213` | both | pending |
| TC-AJUSTES-batch | 5-e2e | @paridad | LOGIC-AJUSTES-002 (batch load) | parsing CSV + cancha | `pehuen-client/src/views/ajustes/load.vue` | both | pending |
| TC-MII-import | 5-e2e | @paridad | LOGIC-MII-001 (importer) | parsing variantes | `pehuen-server/src/services/mii.service.ts` | both | pending |
| TC-USERS-scope | 4-contracts | @paridad | LOGIC-USERS-001 (filtro por rol observador) | A vs S | `pehuen-server/src/controllers/user.controller.ts` | both | pending |

> El script `validate-migration.mjs` ya existente cubre parte de estos contratos numéricos (rumas-volumenes, stats); la suite TDD lo extiende con assertions más finas y casos por variante.

## Tasks

> Orden TDD: escribir TC red → verify legacy → implementar nuxt → verify green.

| # | Task | Agent | Depends on | Files | Validation | Status |
|---|------|-------|------------|-------|------------|--------|
| 1 | Implementar audit script modo `business-logic` | developer | — | `pehuen_nuxt/scripts/audit-migration-parity.mjs` | `pnpm audit:business-logic` lista LOGIC-* candidatos | completed |
| 2 | **Inventario Fase 1**: completar tabla críticas con evidencia file:line exacta + variantes (cancha/rol/espacio) | researcher | #1 | este SPEC | tabla Fase 1 sin entradas placeholder | pending |
| 3 | **TDD step 1**: por cada LOGIC-* crítica, escribir TC red por variante. Cada TC con `@source-code` apuntando al legacy. | developer | #2 | `tests/{unit,e2e}/migration-paridad/` | TC files con headers correctos; failures esperados (red) | pending |
| 4 | **TDD step 2**: ejecutar suite contra `legacy-clone` para confirmar paridad (`@paridad` PASS, `@improvement` FAIL) | developer | #3 | mismos archivos | `PEHUEN_API_BASE=http://localhost:5001 pnpm test:run` resultado esperado | pending |
| 5 | **TDD step 3**: por cada LOGIC-* crítica: ubicar/implementar en `pehuen_nuxt/server/services/**` o `pehuen_nuxt/app/composables/**` | architect + developer | #4 | nuxt code + este SPEC actualizado | columna "Ubicación nuxt actual" llena para todas las críticas | pending |
| 6 | **TDD step 4**: ejecutar suite contra nuxt; todos los TC críticos en `green-in-nuxt` | developer | #5 | mismos archivos | `pnpm test:run --grep '@paridad'` 100% PASS | pending |
| 7 | Para cada LOGIC-* en `partial`/`missing` después de #5: crear sub-ticket de implementación con TC red asociado | developer | #6 | tickets/, tests/ | 0 críticas en `partial`/`missing` | pending |
| 8 | **Inventario Fase 2** (operativas, riesgo medio) | researcher | #6 | este SPEC | tabla Fase 2 poblada | pending |
| 9 | **TDD Fase 2**: TCs + implementación + verde | developer | #8 | tests/ + nuxt code | medias en green-in-nuxt | pending |
| 10 | **Inventario Fase 3** (cosméticas, riesgo bajo) — opcional según budget | researcher | #9 | este SPEC | tabla Fase 3 poblada al menos 80% | pending |

## Constraints

- **Sources**: `pehuen-client` y `pehuen-server`. Frontend o backend según donde viva la lógica original.
- **No mover lógica sin spec**: si una lógica del frontend legacy se mueve al backend en nuxt, registrar como `ported-improved` con justificación (típicamente: "la lógica de cálculo no debe ejecutarse en cliente por seguridad/auditabilidad" — entonces va en SPEC-migration-improvements y referencia desde acá).
- **Variantes obligatorias**: por cada LOGIC-* explicitar qué variables afectan el comportamiento. Sin esto, el audit no puede detectar `partial`.
- **Riesgo es decisión de architect**, no del autor del legacy. Si una lógica afecta totales visibles → `critical`.
- **TDD obligatorio** (RULE-MIGRATION-002): cero implementación nuxt sin TC red previo. Mínimo 1 TC por variante distintiva.

## Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| `pehuen-client/src/views/**` | external (read) | Lógicas frontend legacy |
| `pehuen-client/src/store/**` | external (read) | Stores con transforms |
| `pehuen-server/src/controllers/**` | external (read) | Lógicas backend legacy |
| `pehuen-server/src/services/**` | external (read) | Servicios backend legacy |
| `pehuen_nuxt/server/**` | internal | Target backend |
| `pehuen_nuxt/app/composables/**` | internal | Target composables |
| `pehuen_nuxt/app/stores/**` | internal | Target stores |
| RULE-MIGRATION-001 | internal | Estados de paridad |

## Acceptance checkpoints

- [ ] Audit script modo `business-logic` implementado.
- [ ] Fase 1 (críticas) inventario completo con evidencia file:line.
- [ ] 0 LOGIC-* críticas en estado `pending` al cierre del SPEC.
- [ ] 0 LOGIC-* críticas en estado `partial` o `missing` al corte.
- [ ] Tests de paridad PASS para todas las críticas.
- [ ] Fase 2 inventario completo (puede tener críticas pendientes implementación, no inventariado).
- [ ] Fase 3 inventario al menos 80% completo (low risk admite gaps documentados).

## Open questions

- [x] ~~¿Hay snapshots de outputs legacy?~~ → **NO hay snapshots** disponibles. Implicancia: tests de paridad ejecutan requests reales contra legacy local (no contra snapshots) y comparan con nuxt en runtime. El script existente [`validate-migration.mjs`](../../../pehuen_nuxt/scripts/README.md) ya implementa este patrón para volúmenes y stats; los tests TDD lo extienden.
- [x] ~~¿`pehuen-server` legacy en staging?~~ → **legacy se corre en local del dev**: puerto 5001 (legacy) + puerto 4000 (nuxt) apuntando a la misma BD MongoDB de prueba. Setup documentado en `pehuen_nuxt/scripts/README.md`. Tests de paridad usan `PEHUEN_API_BASE=http://localhost:5001/api pnpm test:run` para validar contra legacy y `pnpm test:run` para validar contra nuxt.
- [x] ~~Tag `legacy-feature-retired`~~ → agregado al meta-spec [migration-decision](../meta-specs/migration-decision.md). Lógicas retiradas usan DEC con `chosen: legacy-feature-retired` y tag correspondiente.
