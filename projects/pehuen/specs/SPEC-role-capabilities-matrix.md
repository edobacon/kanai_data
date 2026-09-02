---
id: SPEC-role-capabilities-matrix
project: pehuen
ticket: PEH-001
status: in_progress
---

# Matriz de Capabilities por Rol — contrato auditado del client legacy

# Matriz de Capabilities por Rol — contrato auditado del client legacy

## Purpose

Catálogo exhaustivo de capabilities del sistema migrado (`CAP-*`), auditado del **client legacy** (`pehuen-client`) según [RULE-AUTH-011](../rules/auth/RULE-AUTH-011-capabilities-from-client.md). Cada capability tiene:

- ID `CAP-{module}-{seq}` único.
- Lista de roles que la ejercen (paridad client legacy).
- Granularidad (vista | accion | edicion-campo | flujo).
- Evidencia legacy (archivo + linea).
- Status en nuxt: `ported-equivalent` | `ported-improved` | `pending` | `partial` | `missing` | `retired` | `drift`.
- Ubicación nuxt si existe (archivo + linea).

Es la fuente que el script `pehuen_nuxt/scripts/audit-migration-parity.ts` consume para detectar drift entre legacy, nuxt frontend y nuxt backend.

## Scope

**Incluye:**
- Capabilities visibles por rol en `pehuen-client/src/layouts/NavLayout.vue`.
- Capabilities granulares (botones, acciones, campos editables) controlados por `v-if` o `:disabled` con `user.role` en `pehuen-client/src/views/**`.
- Default route post-login por rol (`pehuen-client/src/views/Login.vue`).

**Excluye** (van en otros specs):
- Lógicas de cálculo / transformación de datos → `SPEC-business-logic-parity`.
- Mejoras intencionales (paginación, audit, cookies, zod) → `SPEC-migration-improvements`.
- Features retiradas del legacy → `SPEC-legacy-features` con `decision_ref`.

## Roles

| Rol | Legacy default | Nuxt default (post DEC-015) | Source |
|-----|----------------|-----------------------------|--------|
| ADMINISTRADOR | `stats` | `/stats` (paridad) | `views/Login.vue:30` |
| RECEPTOR | `stats` | `/stats` (paridad) | `views/Login.vue:30` |
| SUPERVISOR | `guides.list` (fallback silencioso) | `/stats` (mejora UX — IMP-015) | `views/Login.vue:29` (fallback) → DEC-015 |
| CONSULTOR | `guides.list` (fallback silencioso) | `/guides` (paridad) | `views/Login.vue:29` (fallback) → DEC-015 |
| ASESOR | `asesor.ruma.list` | `/rumas` (vista unificada — DEC-011) | `views/Login.vue:31` → DEC-015 |
| (rol desconocido) | `guides.list` (silencioso) | `throw new Error()` (defensivo — IMP-015) | DEC-015 |

> **Resuelto**: CAP-NAV-007 estaba pendiente de decisión; resuelto por [DEC-015](../decisions/DEC-015-default-route-by-role.md).

## CAP general por vista (NavLayout-driven)

| ID | Capability | Roles | Evidencia legacy | Status nuxt | Ubicación nuxt |
|----|------------|-------|------------------|-------------|----------------|
| CAP-NAV-001 | Ver "Inicio" (`stats`) | A, R, S, C, AS | `NavLayout.vue:218-221` + DEC-011 (ASESOR ya no override; usa stats compartida) | pending | — |
| CAP-NAV-002 | ~~Ver "Estadísticas asesor" (`asesor.stats`)~~ | — | DEC-011 deprecó; ASESOR usa `/stats` con feature subset | retired (DEC-011) | — |
| CAP-NAV-003 | Ver "Guías → Listado" (`guides.list`) | A, R, S, C | `NavLayout.vue:111-114` (ASESOR no ve guías por jornada operativa) | pending | — |
| CAP-NAV-004 | Ver "Guías → Crear" (`guides.create`) | A, R | **PEH-004 (validado con Playwright sobre legacy):** el v-if `NavLayout.vue:211-213` (`!== CONSULTOR && !== SUPERVISOR`) sugería AS, pero el menú real del ASESOR (rama `asesor.*`) NO muestra "Crear Guía" y el backend `POST /guia` siempre rechaza ASESOR (403, EDITOR_ROLES). Afford. engañosa del legacy → capacidad real = A, R | resolved (PEH-004) | — |
| CAP-NAV-005 | Ver "Guías → Ajustes" (`ajustes.list`) | A | `NavLayout.vue:184-189` (`role === 'ADMINISTRADOR'`) | pending | — |
| CAP-NAV-006 | Ver "Guías → Importar MII" (`mii.importer`) | A | `NavLayout.vue:184-189` | pending | — |
| CAP-NAV-007 | Ver "Rumas → Listado" (`rumas.list` unificado) | A, R, S, C, AS | `NavLayout.vue:115-118` + DEC-011 (sin variant `asesor.ruma.list`) | pending | — |
| CAP-NAV-008 | Ver "Rumas → Crear" (`rumas.create`) | A, R, AS | `NavLayout.vue:211-213` | pending | — |
| CAP-NAV-009 | Ver "Canchas" (`canchas.list`) | A | `NavLayout.vue:190-194` (`role === 'ADMINISTRADOR'`) | pending | — |
| CAP-NAV-010 | Ver "Productos" (`product.list`, `product.create`) | A | `NavLayout.vue:195-204` | pending | — |
| CAP-NAV-011 | Ver "Reportes" (`excel.reports`) | A, R, S, C | `NavLayout.vue:206` (todos; comentario sugiere RECEPTOR excluido en pasado) | pending | — |
| CAP-NAV-012 | Ver "Usuarios" (`users.list`) | A, S | `NavLayout.vue:208-210` (`'ADMINISTRADOR' \|\| 'SUPERVISOR'`) | pending | — |
| CAP-NAV-013 | Ver "Mi Contraseña" (`user.password`) | R, S, C, AS | `NavLayout.vue:215-217` (`role !== 'ADMINISTRADOR'`) | pending | — |
| CAP-NAV-014 | **Default route post-login** | exhaustivo por rol | [DEC-015](../decisions/DEC-015-default-route-by-role.md) | pending | `pehuen_nuxt/app/pages/login.vue` (a implementar) |

**Leyenda roles**: A=ADMINISTRADOR, R=RECEPTOR, S=SUPERVISOR, C=CONSULTOR, AS=ASESOR.

## CAP granular por funcionalidad

### Módulo: guides

| ID | Capability | Roles | Evidencia legacy | Status | Ubicación nuxt |
|----|------------|-------|------------------|--------|----------------|
| CAP-GUIDES-001 | Botón "Crear" en lista de guías | A, R | **PEH-004:** misma corrección que CAP-NAV-004 — capacidad real A, R (backend `POST /guia` = EDITOR_ROLES; ASESOR 403). nuxt usa `EDITOR_ROLES=[ADMINISTRADOR, RECEPTOR]` (correcto). | resolved (PEH-004) | — |
| CAP-GUIDES-002 | Acción "ESTADO" (anular/reactivar guía) — ver DEC-014 | A, R, AS | `views/guides/List.vue:125-132` | pending | — |
| CAP-GUIDES-003 | Acción "ELIMINAR" guía | A, R, AS | `views/guides/List.vue:125-138` | pending | — |
| CAP-GUIDES-004 | Editar campo "cancha origen" | solo A al editar; R bloqueado si edit | `views/guides/Create.vue:39, 60` | pending | — |
| CAP-GUIDES-005 | Editar campo "tipo movimiento" | solo A al editar | `views/guides/Create.vue:49` | pending | — |
| CAP-GUIDES-006 | Editar campo "zona" | solo A al editar | `views/guides/Create.vue:67` | pending | — |
| CAP-GUIDES-007 | Editar campo "guía proveedor" | solo A al editar | `views/guides/Create.vue:127` | pending | — |
| CAP-GUIDES-008 | Editar campo "fecha" | solo A al editar | `views/guides/Create.vue:155` | pending | — |
| CAP-GUIDES-009 | Movimiento tipo "AJUSTE" disponible al editar | solo A | `views/guides/Create.vue:213` | pending | — |
| CAP-GUIDES-010 | Editar campo "cantidad/peso" en movimiento ENTRADA | solo A | `views/guides/Create.vue:213` | pending | — |
| CAP-GUIDES-011 | Movimiento tipo "AJUSTE" en select de movimientos | solo A | `views/guides/Create.vue:575` | pending | — |
| CAP-GUIDES-012 | Sección "Acciones de guía" en formulario | A, R, AS | `views/guides/Create.vue:405` | pending | — |
| CAP-GUIDES-013 | Título "Crear/Editar Guía" visible | A, R, AS | `views/guides/Create.vue:6` | pending | — |
| CAP-GUIDES-014 | Acción default "EDITAR" → "VER" si solo lectura | C, S ven "VER" | `views/guides/List.vue:140-142` | pending | — |

### Módulo: rumas

| ID | Capability | Roles | Evidencia legacy | Status | Ubicación nuxt |
|----|------------|-------|------------------|--------|----------------|
| CAP-RUMAS-001 | Botón "Crear Ruma" en lista | A, R, AS | `views/rumas/List.vue:4` | pending | — |
| CAP-RUMAS-002 | Botón "Ver Mapa" en lista | A, R | `views/rumas/List.vue:5` | pending | — |
| CAP-RUMAS-003 | Geo-prop activado en lista (mapa de canchas) — **incluye ASESOR** post DEC-011 | A, R, AS | `views/rumas/List.vue:16` + `views/asesor/Rumas.vue:14` (consolidados) | pending | — |
| ~~CAP-RUMAS-004~~ | ~~Geo-prop activado en lista de asesor~~ | — | Consolidado en CAP-RUMAS-003 (DEC-011 + RULE-MIGRATION-003) | retired (DEC-011) | — |
| CAP-RUMAS-005 | Acciones en filas (no solo lectura) | A, R, AS | `views/rumas/List.vue:19` | pending | — |
| CAP-RUMAS-006 | Editar campo "cancha" en crear ruma | RECEPTOR bloqueado si cancha != ALL | `views/rumas/Create.vue:141, 143` | pending | — |

### Módulo: ajustes

| ID | Capability | Roles | Evidencia legacy | Status | Ubicación nuxt |
|----|------------|-------|------------------|--------|----------------|
| CAP-AJUSTES-001 | Acceder vista ajustes | A | `NavLayout.vue:184-189` (item solo a ADMIN) | pending | — |
| CAP-AJUSTES-002 | Botón "Crear masivo" (load batch) | A | `views/ajustes/index.vue:19` | pending | — |
| CAP-AJUSTES-003 | Crear ajuste individual | A — DEC-001 confirmado | `NavLayout.vue:184-189` (vista oculta a otros) | pending | — |

### Módulo: usuarios

| ID | Capability | Roles | Evidencia legacy | Status | Ubicación nuxt |
|----|------------|-------|------------------|--------|----------------|
| CAP-USERS-001 | Acceder vista usuarios | A, S | `NavLayout.vue:208-210` | pending | — |
| CAP-USERS-002 | Botón "Crear" usuario | A | `views/Users.vue:7` (`role === 'ADMINISTRADOR'`) | pending | — |
| CAP-USERS-003 | Editar campos nombre/rut/email/rol | A | `views/Users.vue:17-20` (disabled si !ADMIN) | pending | — |
| CAP-USERS-004 | Acción "CONTRASEÑA" en fila de usuario | A | `views/Users.vue:320` | pending | — |
| CAP-USERS-005 | Filtro por rol al listar (A ve todos, S ve subset) | A, S (variant) | `views/Users.vue:156-185` | pending | — |

### Módulo: canchas

| ID | Capability | Roles | Evidencia legacy | Status | Ubicación nuxt |
|----|------------|-------|------------------|--------|----------------|
| CAP-CANCHAS-001 | Acceder vista canchas | A | `NavLayout.vue:190-194` | pending | — |
| CAP-CANCHAS-002 | Botón "Crear" cancha | **A** (resuelto: simplificar a ADMIN-only) | `views/Canchas.vue:4` (legacy `!== CONSULTOR && !== SUPERVISOR` — código muerto, R/AS no llegan a la vista) | cleanup-pending | — |

> **Resuelto CAP-CANCHAS-002**: el `v-if` legacy es drift por copy-paste. Vista accesible solo a ADMIN; el `v-if` se simplifica en nuxt a `=== 'ADMINISTRADOR'` y `requireRole(['ADMINISTRADOR'])` en endpoint. No requiere DEC (cleanup alineado con paridad funcional efectiva).

### Módulo: stats

| ID | Capability | Roles | Evidencia legacy | Status | Ubicación nuxt |
|----|------------|-------|------------------|--------|----------------|
| CAP-STATS-001 | Bloque admin en Stats | A | `views/Stats.vue:13` (`<graph-3 />`) | pending | — |
| ~~CAP-STATS-002~~ | ~~Bloque admin en Stats asesor~~ | — | Código muerto: copy-paste de Stats.vue. Eliminado en nuxt junto con la vista `asesor/Stats.vue` (DEC-011 + RULE-MIGRATION-003) | retired (DEC-011) | — |

> **Resuelto CAP-STATS-002**: bloque `v-if` legacy era copy-paste de `Stats.vue:13`; nunca se renderiza porque ADMIN no llega a `asesor.stats`. Con la deprecación de `views/asesor/Stats.vue` (DEC-011), el código muerto desaparece. ASESOR accede a `/stats` consolidada con feature subset por rol.

## Migration Tests (TDD obligatorio — RULE-MIGRATION-002)

> Cada CAP listado arriba requiere **mínimo 2 TC**: uno de visibilidad frontend (valida `v-if`/`:disabled` por rol) y uno de endpoint backend (valida `requireRole` retorna 200/403 según rol). Tag default `@paridad` (PASS contra legacy y nuxt) salvo CAPs nuevas (sin equivalente legacy) que usan `@improvement`.

### Slots de TC reservados

`SPEC-migration-tdd` reserva **TC-181..TC-210** para `roles-permissions`. Cada CAP ocupa 1-N slots según número de roles a verificar (típicamente 2 TC por CAP — visibility + endpoint).

### Seed (completar al ejecutar tasks)

| TC | Layer | Tag | CAP | Source code | pass_against | Status |
|----|-------|-----|-----|-------------|--------------|--------|
| TC-181 | 5-e2e | @paridad | CAP-NAV-005 (Ajustes solo ADMIN) | `pehuen-client/src/layouts/NavLayout.vue:184-189` | both | pending |
| TC-182 | 4-contracts | @paridad | CAP-AJUSTES-001 (endpoint) | `pehuen-server/src/controllers/ajuste.controller.ts` (DEC-001) | both | pending |
| TC-183 | 5-e2e | @paridad | CAP-GUIDES-002 (anular guía visible) | `pehuen-client/src/views/guides/List.vue:125-132` | both | pending |
| TC-184 | 4-contracts | @improvement | CAP-GUIDES-002 (endpoint requireRole A/R/AS) | `pehuen-server/src/controllers/guia.controller.ts` (hueco legacy → DEC-014) | nuxt-only | pending |
| TC-185 | 5-e2e | @paridad | CAP-USERS-002 (Crear usuario solo ADMIN) | `pehuen-client/src/views/Users.vue:7` | both | pending |
| TC-186 | 4-contracts | @paridad | CAP-USERS-005 (listar users A/S) | `pehuen-server/src/controllers/user.controller.ts` | both | pending |
| TC-187..TC-210 | 5-e2e + 4-contracts | @paridad | resto de CAPs (NAV-001..013, GUIDES-001..014, RUMAS-001..006, AJUSTES-002..003, USERS-001..004, CANCHAS-001..002, STATS-001..002) | varios | both/nuxt-only | pending |

> **Tabla seed**. Task #2 expande TC-187..TC-210 a TCs individuales por CAP × rol.

## Tasks

> Orden TDD: escribir TC red → verify legacy → implementar/auditar nuxt → verify green.

| # | Task | Agent | Depends on | Files | Validation | Status |
|---|------|-------|------------|-------|------------|--------|
| 1 | Implementar audit script `pehuen_nuxt/scripts/audit-migration-parity.mjs` modo `capabilities` | developer | — | `pehuen_nuxt/scripts/audit-migration-parity.mjs` | `pnpm audit:capabilities` produce JSON+MD con gaps | completed |
| 2 | **TDD step 1**: para cada CAP, escribir TC red (visibility frontend + endpoint backend). Cada TC con `@source-doc`/`@source-code` apuntando al client legacy. | developer | #1 | `tests/e2e/migration-paridad/role-permissions/` + `tests/unit/migration-paridad/` | TC files con headers correctos; `pnpm test:run` muestra failures esperados (red) | pending |
| 3 | **TDD step 2**: ejecutar suite contra `legacy-clone` para `@paridad` TCs (deben pasar) y `@improvement` TCs (deben fallar) | developer | #2 | mismos archivos | `PEHUEN_API_BASE=http://localhost:5001 pnpm test:run` muestra resultado esperado por tag | pending |
| 4 | **TDD step 3**: ubicar/implementar paridad en `pehuen_nuxt/app/**` y `pehuen_nuxt/server/**` para cada CAP `pending`/`missing`/`partial` | architect + developer | #3 | nuxt code + este SPEC actualizado | columna "Ubicación nuxt" llena; CAPs en `ported-equivalent` | pending |
| 5 | **TDD step 4**: ejecutar suite contra nuxt; todos los TC en `green-in-nuxt` | developer | #4 | mismos archivos | `pnpm test:run` 100% PASS | pending |
| 6 | Resolver CAP-NAV-007 (default route SUPERVISOR/CONSULTOR) con stakeholders → crear DEC y TC asociado | architect | — | DEC nueva + TC | DEC accepted + TC `green-in-nuxt` | pending |
| 7 | Resolver inconsistencias (CAP-CANCHAS-002, CAP-STATS-002) → DEC y TC | architect | — | este SPEC + DECs + TC | inconsistencias resueltas con TC verde | pending |
| 8 | Generar `pehuen_nuxt/docs/05-roles/capabilities-matrix.md` desde este SPEC | content-writer | #4 | doc nuxt | doc revisada y publicada | completed |
| 9 | Hook CI: `pnpm audit:capabilities` + suite role-permissions falla el pipeline si hay drift no registrado o TC rojo | developer | #1, #5 | `.github/workflows/` o `package.json` | CI bloquea PR con drift o regresión | pending |

## Constraints

- **Source of truth**: `pehuen-client` (NO `pehuen-server`). Aplicar RULE-AUTH-011.
- **Granularidad**: cada CAP debe tener evidencia legacy (file:line) verificable. Sin evidencia → no se acepta entrada.
- **Status**: usar exactamente la enum de RULE-MIGRATION-001 (`ported-equivalent` | `ported-improved` | `pending` | `partial` | `missing` | `retired` | `drift`).
- **TDD obligatorio** (RULE-MIGRATION-002): cero implementación nuxt sin TC red previo. Cada CAP requiere TC visibility + TC endpoint en estado `green-in-nuxt` para cerrar.
- **Mejoras**: si el nuxt amplía o cambia una capability, mover entrada a `SPEC-migration-improvements` y dejar referencia aquí.

## Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| `pehuen-client/src/layouts/NavLayout.vue` | external (read) | Fuente de verdad CAPs por vista |
| `pehuen-client/src/views/**/*.vue` | external (read) | Fuente de verdad CAPs granulares |
| `pehuen-client/src/views/Login.vue` | external (read) | Default route post-login por rol |
| `pehuen_nuxt/app/**` | internal | Target de paridad frontend |
| `pehuen_nuxt/server/api/**` | internal | Target de paridad backend (requireRole) |
| RULE-AUTH-011 | internal | Principio rector |
| RULE-MIGRATION-001 | internal | Estados de paridad |

## Acceptance checkpoints

- [ ] Audit script implementado y produce reporte gap.
- [ ] 100% CAPs con evidencia legacy verificable.
- [ ] 0 CAPs en estado `pending` al cierre del SPEC.
- [ ] 0 CAPs en estado `missing` o `partial` al corte.
- [ ] CAP-NAV-007 resuelta con DEC.
- [ ] Inconsistencias CAP-CANCHAS-002 y CAP-STATS-002 resueltas.
- [ ] Doc `pehuen_nuxt/docs/02-architecture/role-capabilities.md` generada y revisada.
- [ ] CI integrado: drift no registrado bloquea merge.

## Open questions

- [x] ~~CAP-NAV-007: default route SUPERVISOR/CONSULTOR~~ → resuelto por **[DEC-015](../decisions/DEC-015-default-route-by-role.md)** (CAP-NAV-014 nueva).
- [x] ~~CAP-CANCHAS-002: botón Crear cancha~~ → resuelto: simplificar a ADMIN-only (cleanup, sin DEC).
- [x] ~~CAP-STATS-002: bloque admin en asesor/Stats.vue~~ → resuelto: código muerto, eliminado junto con la vista (DEC-011 + RULE-MIGRATION-003).
