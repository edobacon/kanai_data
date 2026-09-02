---
id: SPEC-role-journeys
project: pehuen
ticket: PEH-001
status: draft
---

# Role Journeys — paridad funcional por rol

# Role Journeys — paridad funcional por rol

## Purpose

Codificar la jornada operativa COMPLETA de cada uno de los 5 roles del sistema, asegurando que la migracion preserva (o documenta cambios deliberados de) cada experiencia de usuario. Es el **contrato funcional** que la migracion debe respetar — mas alla de paridad de endpoints, debe haber paridad de **lo que el usuario puede hacer un dia normal de trabajo**.

## Requirements

### REQ-01: 5 role-journeys validadas end-to-end

El sistema MUST tener una `role-journey` mapeada y validada para cada uno de los 5 roles.

**Actor**: developer + reviewer
**Layers**: tests E2E

#### Scenario: cada rol completa su jornada en nuxt
- **GIVEN** un usuario con un rol especifico y dataset realista
- **WHEN** ejecuta la secuencia tipica de su jornada (login → capabilities en orden → logout)
- **THEN** todas las acciones son ejecutables sin friction (botones visibles, redirects funcionando, datos coherentes entre vistas)

#### Scenario: jornadas legacy se replican en nuxt sin perder pasos
- **GIVEN** la jornada documentada en este spec
- **WHEN** se ejecuta paso a paso en legacy-clone y nuxt-staging
- **THEN** cada paso produce mismo outcome (modulo deltas-aceptados documentados en DEC)

#### Acceptance
**Verificable**: 5 tests E2E "full journey" en `tests/e2e/migration-paridad/role-journeys/{role}.spec.ts` con todos los pasos PASS.

### REQ-02: matriz capability x rol completa

El sistema MUST tener una matriz que indique, para cada `business-capability`, que roles la pueden ejecutar y bajo que scope.

**Actor**: reviewer
**Layers**: governance

#### Scenario: ningun rol pierde feature critica en migracion
- **GIVEN** la matriz capability x rol
- **WHEN** se cruza contra el inventario de `legacy-feature` por rol
- **THEN** ningun rol tiene capability con `risk_if_lost: critical` que este `pending` o `unknown` en nuxt

#### Acceptance
**Verificable**: tabla matriz publicada como artefacto + 0 features critical sin migracion validada.

### REQ-03: mensajes y errores literales preservados por rol

Cada rol MUST recibir los mismos mensajes literales del legacy en los puntos donde la UI reacciona.

**Actor**: developer
**Layers**: frontend, backend

#### Scenario: RECEPTOR fuera de su cancha
- **GIVEN** RECEPTOR con `cancha = X` intenta crear guia con `origen = Y`
- **WHEN** envia el form
- **THEN** ve mensaje literal del legacy (o el cambio esta documentado en DEC)

#### Acceptance
**Verificable**: tests E2E que afirman texto literal de mensajes por rol.

## Role Journey: ADMINISTRADOR

### Caracter
Acceso total al sistema. Configuracion, gestion de usuarios y canchas, supervision de operacion, intervencion sobre cualquier flujo, generacion de reportes y stats consolidadas, carga de archivos MII y batch ajustes.

### Sesion tipica
- Duracion: 1-3 horas/dia
- Dispositivo: desktop (oficina central)
- Red: estable

### Entry & navigation

- **Default route post-login**: `/stats` (verificar paridad legacy → nuxt)
- **Menu items**: Guías, Rumas, Productos, Canchas, Usuarios, Ajustes, Importer, Reportes, Estadísticas
- **Legacy routes**: 17 rutas accesibles (todo el sistema)
- **Nuxt routes**: idem + redirects 301 si los hay

### Capabilities (orden tipico de uso)

| # | CAP | Titulo | Frecuencia | Critico |
|---|-----|--------|------------|---------|
| 1 | CAP-001 | Login con RUT + password | siempre | si |
| 2 | CAP-005 | Ver dashboard con 5 graficos | varias/dia | medio |
| 3 | CAP-080 | Ver listado de usuarios | varias/dia | medio |
| 4 | CAP-081 | Crear usuario con rol asignado | semanal | si |
| 5 | CAP-082 | Editar usuario (rol, cancha, status) | semanal | si |
| 6 | CAP-083 | Activar / desactivar usuario | mensual | si |
| 7 | CAP-090 | Ver listado de canchas | mensual | medio |
| 8 | CAP-091 | Crear / editar / eliminar cancha | mensual | si |
| 9 | CAP-100 | Listar productos con filtros | mensual | medio |
| 10 | CAP-101 | Crear / editar / cambiar status producto | mensual | si |
| 11 | CAP-110 | Cargar archivo MII de un periodo | mensual | si |
| 12 | CAP-111 | Disparar enriquecimiento de guias con MII (ver progreso socket) | mensual | si |
| 13 | CAP-120 | Cargar batch de ajustes desde Excel | mensual | si |
| 14 | CAP-121 | Listar batches de ajustes | mensual | medio |
| 15 | CAP-122 | Eliminar batch completo | rara vez | si |
| 16 | CAP-130 | Crear ajuste individual ADD/REDUCE | semanal | si |
| 17 | CAP-040 | Crear guia (5 variantes movimiento) | varias/dia | si |
| 18 | CAP-050 | Editar / anular guia | diaria | si |
| 19 | CAP-060 | Crear / editar ruma | diaria | si |
| 20 | CAP-070 | Generar reporte Excel guias / rumas | semanal | si |
| 21 | CAP-002 | Cambio de cancha activa (incluye `'ALL'`) | varias veces | si |

### Restricciones

- Ninguna por scope cancha (ve todas las canchas si `cancha = 'ALL'`).
- Para crear/editar OTRO ADMINISTRADOR debe ser el mismo ADMINISTRADOR (no SUPERVISOR).
- No puede cambiar su propio status (no puede auto-desactivarse).

### Datos visibles
- Todos los datos del sistema, sin filtros de scope.

### Sockets recibe

| Evento | Room | Cuando |
|--------|------|--------|
| new-guide / guide-update-* / guide-delete | guias-ALL | otro user crea/edita/elimina guia |
| new-ruma / update-ruma / ruma-status | rumas | actividad sobre rumas |
| created-user / updated-user / updated-user-state | users-ALL | gestion de usuarios |
| saving | mii-extra-data | progreso de enriquecimiento MII |
| new-mii | files | nueva carga MII |

### Errores comunes (mensajes literales)

- "No puedes crear cuentas ADMINISTRADOR" (cuando NO es admin pero intenta — no aplica al ADMIN)
- "Permisos insuficientes" (multiple contextos)
- "Ya existe un usuario asociado a ese rut"
- "Ya existe un usuario asociado a ese email"

### Decisiones de migracion que afectan

- DEC-008-roles-paridad: 5 roles preservados sin cambios.
- DEC-001-fullstack-nuxt: arquitectura full-stack — UI puede sentirse mas rapida (SSR).
- DEC-002-httponly-cookies: re-login obligatorio al cortar.

### Tests E2E "full journey"

```ts
// tests/e2e/migration-paridad/role-journeys/admin.spec.ts
test('@paridad ADMIN full journey', async ({ page }) => {
  await login(page, TEST_USERS.admin)
  // 1. dashboard con 5 graficos
  await page.goto('/stats')
  await expect(page.locator('[data-graph-id="1"]')).toBeVisible()
  // 2. crear usuario RECEPTOR
  await page.goto('/usuarios')
  await page.click('button:has-text("Crear")')
  // ... fill form ...
  // 3. crear cancha
  // 4. crear guia mov 1
  // 5. generar reporte
  // 6. cambiar cancha activa
  // 7. logout
})
```

### Status migracion: pending

---

## Role Journey: SUPERVISOR

### Caracter
Gestion de operacion (RECEPTOREs) + acceso a reportes para auditoria + supervision de movimientos. NO opera directamente sobre guias/rumas.

### Sesion tipica
- Duracion: 1-2 horas/dia
- Dispositivo: desktop
- Red: estable

### Entry & navigation

- **Default route post-login**: `/stats`
- **Menu items**: Guías, Rumas, Usuarios, Reportes, Estadísticas
- **Legacy routes**: subset administrativo + lectura
- **Nuxt routes**: idem

### Capabilities

| # | CAP | Titulo | Frecuencia | Critico |
|---|-----|--------|------------|---------|
| 1 | CAP-001 | Login | siempre | si |
| 2 | CAP-080 | Ver listado de usuarios (FILTRADO a solo RECEPTOR) | semanal | si |
| 3 | CAP-081 | Crear usuario RECEPTOR (no puede crear ADMIN) | mensual | si |
| 4 | CAP-082 | Editar RECEPTOR (cambiar cancha asignada) | semanal | si |
| 5 | CAP-083 | Toggle status RECEPTOR | rara vez | si |
| 6 | CAP-051 | Anular guia (cambiar VIGENTE → NULA) | varias/semana | si |
| 7 | CAP-060 | Ver listado de rumas | diaria | medio |
| 8 | CAP-070 | Generar reporte de guias / rumas | semanal | si |
| 9 | CAP-005 | Ver dashboard | diaria | medio |
| 10 | CAP-002 | Cambio de cancha (puede `'ALL'`) | semanal | si |

### Restricciones

- **`GET /api/auth/users` retorna SOLO RECEPTORES** (filtro server-side preservado de legacy).
- NO puede crear / editar a otro SUPERVISOR ni ADMINISTRADOR.
- NO puede crear / editar guias ni rumas (solo cambio de status guia).
- NO puede crear / editar productos / canchas / ajustes / MII.

### Datos visibles
- Lista de usuarios: solo RECEPTORES (filtro especial legacy).
- Resto: full access lectura.

### Sockets recibe
- new-guide / guide-update-* (guias-ALL)
- new-ruma / update-ruma (rumas)
- created-user / updated-user (users-ALL — solo cambios de RECEPTOR son relevantes)

### Errores comunes
- "No puedes crear cuentas ADMINISTRADOR"
- "Permisos insuficientes"

### Decisiones de migracion que afectan
- DEC-008-roles-paridad
- DEC-013 (si aplica): SUPERVISOR podria recibir ampliacion de permisos en nuxt → revisar improvements.md

### Tests E2E "full journey"

```ts
test('@paridad SUPERVISOR full journey', async ({ page }) => {
  await login(page, TEST_USERS.supervisor)
  // 1. lista usuarios — verificar solo RECEPTOR visibles
  await page.goto('/usuarios')
  const rows = await page.locator('[data-testid="user-row"]').all()
  for (const r of rows) {
    expect(await r.textContent()).toContain('RECEPTOR')
  }
  // 2. crear nuevo RECEPTOR
  // 3. anular una guia
  // 4. generar reporte
  // 5. logout
})
```

### Status migracion: pending

---

## Role Journey: RECEPTOR

### Caracter
Operacion diaria de cancha. Es el rol con mas volumen de actividad: registra entradas y salidas de madera, crea rumas, sube fotos, edita guias propias. Scope: SU cancha asignada.

### Sesion tipica
- Duracion: 4-6 horas/dia (toda la jornada laboral)
- Dispositivo: desktop o tablet en oficina de cancha
- Red: cancha (puede ser intermitente en algunos sitios)

### Entry & navigation

- **Default route post-login**: `/guias` (o `/stats`, verificar)
- **Menu items**: Guías, Rumas, Reportes, Estadísticas
- **Legacy routes**: subset de operacion
- **Nuxt routes**: idem

### Capabilities

| # | CAP | Titulo | Frecuencia | Critico |
|---|-----|--------|------------|---------|
| 1 | CAP-001 | Login | siempre | si |
| 2 | CAP-002 | Verificar cancha activa (NO puede `'ALL'`) | siempre | si |
| 3 | CAP-030 | Listar guias FILTRADAS por su cancha (origen O destino === user.cancha) | varias/dia | si |
| 4 | CAP-040 | Crear guia movimiento 1 (compra) | varias/dia | si |
| 5 | CAP-041 | Crear guia movimiento 4 (recepcion) | varias/dia | si |
| 6 | CAP-042 | Crear guia movimiento 2/3 (despacho) | varias/dia | si |
| 7 | CAP-043 | Crear guia movimiento 5 (otro) | rara vez | medio |
| 8 | CAP-050 | Editar guia (preserva ingresoPlanta/Romana/salida) | varias/dia | si |
| 9 | CAP-051 | Anular guia (VIGENTE → NULA) | semanal | si |
| 10 | CAP-052 | Restaurar guia anulada (NULA → VIGENTE, valida no duplicado) | rara vez | si |
| 11 | CAP-053 | Eliminar guia | rara vez | medio |
| 12 | CAP-060 | Listar rumas de su cancha | varias/dia | si |
| 13 | CAP-061 | Crear ruma (nuevo numero en su cancha) | diaria | si |
| 14 | CAP-062 | Editar ruma (cambia especie/estado/cancha; numero inmutable) | diaria | si |
| 15 | CAP-063 | Toggle estado ruma | diaria | si |
| 16 | CAP-064 | Ver guias asociadas a una ruma + sumatorio de ajustes | diaria | si |
| 17 | CAP-065 | Subir imagen de ruma con extraccion GPS automatica | diaria | si |
| 18 | CAP-066 | Reset GPS de ruma | rara vez | medio |
| 19 | CAP-067 | Ver mapa de rumas activas (filtrado a su cancha) | varias/dia | si |
| 20 | CAP-070 | Generar reporte Excel guias / rumas | semanal | si |
| 21 | CAP-072 | Cambio de cancha (si esta autorizado a moverse — pero NO `'ALL'`) | rara vez | si |
| 22 | CAP-003 | Cambiar su propio password | rara vez | medio |

### Restricciones

- **NO puede tener `cancha = 'ALL'`** (server-side enforcement: `auth.controller.ts:194` legacy).
- **Scope cancha en queries**: `Guia.find({ $or: [{ origen: user.cancha }, { destino: user.cancha }] })` — solo ve guias donde su cancha es origen o destino.
- NO puede crear / editar usuarios.
- NO puede tocar productos / canchas / catalogos / MII / ajustes individuales.
- **Excepcion DELTA-CUESTIONABLE (DEC-001 AJUSTE_ROLES)**: en nuxt podria ejecutar ajustes (legacy NO permite). Decision pendiente.

### Datos visibles vs ocultos

- **Ve**: guias y rumas de su cancha (origen O destino), todos los productos, todos los catalogos.
- **NO ve**: usuarios, canchas (CRUD), MII, batches de ajustes (legacy; verificar nuxt).

### Sockets recibe

| Evento | Room | Cuando |
|--------|------|--------|
| new-guide / guide-update-single / guide-update-status / guide-delete | guias-ALL + guias-{user.cancha} | otro user toca guias de SU cancha |
| new-ruma / update-ruma / ruma-status | rumas | actividad sobre rumas |

### Errores comunes (literales preservar)

- "Esta guía ya está asociada a este tipo de movimiento" (duplicado al crear)
- "No puede tener el mismo origen y destino"
- "Debe incluir detalle de origen" / "Debe incluir detalle de destino" (OTRA CANCHA)
- "Ya existe ruma activa con ese número en esa cancha"
- "Datos Incompletos" (RumaDto missing fields)
- "Acceso Denegado" (intentando accion fuera de scope)

### Decisiones de migracion que afectan

- DEC-001 (AJUSTE_ROLES con RECEPTOR — alta prioridad)
- DEC-008-roles-paridad
- DEC-009-bug-fixes-legacy: ingresoRomana ahora es independiente — comunicar al RECEPTOR
- DEC-011-vistas-unificadas-asesor: ASESOR ahora va a `/rumas` (no afecta RECEPTOR pero compartira vista)

### Tests E2E "full journey"

```ts
test('@paridad RECEPTOR full journey — operacion diaria tipica', async ({ page }) => {
  await login(page, TEST_USERS.receptor)
  // 1. ver guias del dia (filtradas por su cancha)
  await page.goto('/guias')
  // verificar scope: ninguna guia con origen y destino fuera de su cancha
  // 2. crear guia mov 1 (compra) con datos completos
  await page.goto('/guias/crear')
  await page.selectOption('[name="movimiento"]', '1')
  await expect(page.locator('[name="comuna"]')).toBeVisible()
  // ... fill form ...
  // 3. ver mapa de rumas
  await page.goto('/rumas?map=true')
  // 4. crear nueva ruma
  // 5. subir foto a ruma con GPS conocido
  // 6. ver guias de la ruma
  // 7. generar reporte semanal
  // 8. anular guia (cambiar status)
  // 9. logout
})
```

### Status migracion: pending

---

## Role Journey: CONSULTOR

### Caracter
Lectura para auditoria. NO opera. Necesita acceso transversal a guias/rumas para revisar movimientos historicos y descargar reportes.

### Sesion tipica
- Duracion: 30 min - 1 hora/dia
- Dispositivo: desktop
- Red: estable

### Entry & navigation

- **Default route post-login**: `/guias`
- **Menu items**: Guías, Rumas
- **Legacy routes**: minimo (lectura)
- **Nuxt routes**: idem

### Capabilities

| # | CAP | Titulo | Frecuencia | Critico |
|---|-----|--------|------------|---------|
| 1 | CAP-001 | Login | siempre | si |
| 2 | CAP-030 | Listar guias (todas) | diaria | si |
| 3 | CAP-031 | Ver detalle de guia | diaria | si |
| 4 | CAP-051 | Anular / restaurar guia (preserva auditoria del legacy) | rara vez | si |
| 5 | CAP-060 | Listar rumas | diaria | si |
| 6 | CAP-064 | Ver guias asociadas a ruma | diaria | medio |
| 7 | CAP-070 | Generar reporte | semanal | si |
| 8 | CAP-003 | Cambiar su propio password | rara vez | medio |

### Restricciones

- **Solo lectura**: NO puede crear / editar / eliminar guia / ruma / nada.
- **Excepcion legacy**: `PATCH /guia-status` no tiene `requireRole` en legacy → CONSULTOR puede anular guias. Bug de seguridad. **DELTA-CUESTIONABLE (DEC-014)**: ¿restringir en nuxt o preservar?
- NO puede tocar usuarios / canchas / productos / ajustes / MII.

### Datos visibles
- Todas las guias y rumas (sin scope cancha).
- NO ve usuarios.

### Sockets recibe
- new-guide / guide-* (guias-ALL)
- new-ruma / update-ruma / ruma-status (rumas)

### Errores comunes
- "Acceso Denegado" si intenta accion fuera de su rol.

### Decisiones de migracion que afectan
- DEC-014: hueco legacy de PATCH /guia-status. Decision pendiente.

### Tests E2E "full journey"

```ts
test('@paridad CONSULTOR full journey', async ({ page }) => {
  await login(page, TEST_USERS.consultor)
  // 1. listar guias — verificar todas visibles
  // 2. ver detalle
  // 3. intentar crear → boton oculto / 403
  // 4. generar reporte
  // 5. logout
})
```

### Status migracion: pending

---

## Role Journey: ASESOR

### Caracter
Operacion en terreno. Asesor visita canchas con tablet o mobile, recorre las rumas, fotografia y georreferencia. NO crea ni edita rumas (solo ASESOREA — agrega imagen / GPS).

### Sesion tipica
- Duracion: jornada parcial / variable
- Dispositivo: **tablet o mobile** (importante)
- Red: terreno (intermitente, baja velocidad)

### Entry & navigation

- **Default route post-login**: `/asesor-stats` (legacy) → `/stats` (nuxt, redirect 301)
- **Menu items**: Estadísticas, Rumas
- **Legacy routes**:
  - `/app/asesor-stats` (vista dedicada en legacy)
  - `/app/asesor-ruma-list` (vista dedicada en legacy)
- **Nuxt routes**:
  - `/asesor-stats` → redirect 301 → `/stats` (vista unificada con feature subset)
  - `/asesor-ruma-list` → redirect 301 → `/rumas` (vista unificada con feature subset)

### Capabilities

| # | CAP | Titulo | Frecuencia | Critico |
|---|-----|--------|------------|---------|
| 1 | CAP-001 | Login (en tablet/mobile) | siempre | si |
| 2 | CAP-005 | Ver dashboard subset (graficos asesor) | varias/dia | medio |
| 3 | CAP-060 | Ver listado de rumas (subset, sin botones CRUD) | varias/dia | si |
| 4 | CAP-067 | Ver mapa de rumas activas con GPS | constante en terreno | si |
| 5 | CAP-065 | Subir imagen a ruma con GPS automatico desde EXIF | varias/dia | si |
| 6 | CAP-066 | Reset GPS si la foto fue mala | rara vez | medio |
| 7 | CAP-064 | Ver guias asociadas a una ruma | varias/dia | medio |
| 8 | CAP-003 | Cambiar password | rara vez | medio |

### Restricciones

- **NO puede crear / editar / eliminar rumas** (solo subir foto + reset GPS).
- **NO puede crear / editar guias**.
- **NO puede tocar usuarios / canchas / productos / catalogos / MII / ajustes / reportes**.
- **Vista Rumas unificada en nuxt**: el rol ve `/rumas` (no `/asesor-ruma-list`) pero con feature subset (sin botones de crear/editar/eliminar).

### Datos visibles vs ocultos

- **Ve**: rumas + sus fotos + sus guias asociadas (informacion espacial).
- **NO ve**: detalles de gestion administrativa (usuarios, canchas, productos).

### Sockets recibe
- new-ruma / update-ruma / ruma-status (rumas)

### Errores comunes
- "Acceso Denegado" si intenta accion fuera de su rol.

### Decisiones de migracion que afectan

- **DEC-011-vistas-unificadas-asesor**: ASESOR pierde vista dedicada `/asesor-ruma-list` y `/asesor-stats`. Comunicar.
- **DEC-012-redirect-301-legacy-paths**: bookmarks viejos redirigen.
- DEC-008-roles-paridad.
- (Si nuxt cambia exif-parser → sharp): paridad GPS critica.

### Cross-role interaction

- Las imagenes que sube ASESOR son visibles para RECEPTOR y ADMINISTRADOR (mismo storage Ruma.img).
- Las coordenadas GPS alimentan el mapa de RECEPTOR y ADMINISTRADOR.

### Tests E2E "full journey"

```ts
test.use({
  viewport: { width: 768, height: 1024 },   // tablet
  // simular red lenta
  // launchOptions: { args: ['--throttle-cpu=4'] },
})
test('@paridad ASESOR full journey en tablet', async ({ page }) => {
  await login(page, TEST_USERS.asesor)
  // 1. login redirige a /stats (no /asesor-stats)
  await expect(page).toHaveURL(/\/stats/)
  // 2. navegar a /asesor-ruma-list (legacy bookmark) → redirect a /rumas
  await page.goto('/asesor-ruma-list')
  await expect(page).toHaveURL(/\/rumas/)
  // 3. NO ve botones de crear/editar/eliminar
  await expect(page.locator('button:has-text("Crear ruma")')).toBeHidden()
  await expect(page.locator('button:has-text("Editar")')).toBeHidden()
  // 4. SI ve mapa
  await expect(page.locator('[data-testid="rumas-map"]')).toBeVisible()
  // 5. SI puede subir foto
  await page.click('[data-testid="ruma-row"] button:has-text("Subir imagen")')
  await page.setInputFiles('input[type="file"]', './tests/fixtures/photo-with-gps.jpg')
  await page.click('button:has-text("Subir")')
  // 6. validar GPS extraido y persistido
  // 7. logout
})
```

### Status migracion: pending

---

## Matriz consolidada capability x rol

> Resumen ejecutivo. Detalle completo en `legacy-feature.md` y en cada role-journey.

| CAP | A | S | R | C | Z | Notas |
|-----|---|---|---|---|---|-------|
| CAP-001 Login | ✓ | ✓ | ✓ | ✓ | ✓ | publico |
| CAP-002 Cambio cancha | ✓ | ✓ | ✓ (no `'ALL'`) | ✓ | ✓ | RECEPTOR restringido |
| CAP-003 Cambio password | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | dueno o ADMIN |
| CAP-005 Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ (subset) | ASESOR ve subset |
| CAP-040-043 Crear guia (5 mov) | ✓ | ✗ | ✓ (scope) | ✗ | ✗ | RECEPTOR scope cancha |
| CAP-050 Editar guia | ✓ | ✗ | ✓ (scope) | ✗ | ✗ | |
| CAP-051 Anular guia | ✓ | ✓ | ✓ | ✓ (DELTA) | ✗ | DEC-014 |
| CAP-053 Eliminar guia | ✓ | ✗ | ✓ | ✗ | ✗ | |
| CAP-061 Crear ruma | ✓ | ✗ | ✓ | ✗ | ✗ | |
| CAP-062 Editar ruma | ✓ | ✗ | ✓ | ✗ | ✗ | numero inmutable |
| CAP-063 Toggle estado ruma | ✓ | ✗ | ✓ | ✗ | ✗ | |
| CAP-065 Subir foto GPS | ✓ | ✗ | ✓ | ✗ | ✓ | FIELD_OPERATOR_ROLES |
| CAP-066 Reset GPS | ✓ | ✗ | ✓ | ✗ | ✓ | |
| CAP-067 Mapa rumas | ✓ | ✗ | ✓ | ✗ | ✓ | |
| CAP-070 Generar reporte | ✓ | ✓ | ✓ | ✓ | ✗ | REPORT_VIEWER_ROLES |
| CAP-080-083 Gestion usuarios | ✓ (full) | ✓ (RECEPTOR only) | ✗ | ✗ | ✗ | SUPERVISOR scope filtrado |
| CAP-090-091 Gestion canchas | ✓ | ✗ | ✗ | ✗ | ✗ | ADMIN-only |
| CAP-100-101 Gestion productos | ✓ | ✗ | ✗ (lectura buscar) | ✗ | ✗ | |
| CAP-110-111 MII upload + enrich | ✓ | ✗ | ✗ | ✗ | ✗ | ADMIN-only |
| CAP-120-122 Batch ajustes | ✓ | ✗ | ✓ (DELTA) | ✗ | ✗ | DEC-001 |
| CAP-130 Crear ajuste individual | ✓ | ✗ | ✓ (DELTA) | ✗ | ✗ | DEC-001 |
| CAP-150-154 Stats agregadas | ✓ | ✓ | ✓ | ✓ | ✓ (subset) | |

Leyenda: A=ADMINISTRADOR, S=SUPERVISOR, R=RECEPTOR, C=CONSULTOR, Z=ASESOR. ✓ permite, ✗ deniega, ✓ (...) permite con condicion.

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status |
|---|------|-------|------------|-------|------------|--------|
| 1 | Inventariar legacy-features por rol (5 listas) | researcher | — | specs/SPEC-legacy-features.md | 5 secciones, una por rol | pending |
| 2 | Mapear capabilities desde legacy-features (~60 CAPs estimados) | architect | #1 | specs/SPEC-legacy-features.md | tabla matriz capability x rol | pending |
| 3 | Validar que matriz capability x rol no tiene gaps criticos pending | reviewer | #2 | — | ningun rol con CAP critical pending/unknown | pending |
| 4 | Test E2E "full journey" ADMINISTRADOR | developer | #2 | tests/e2e/migration-paridad/role-journeys/admin.spec.ts | journey PASS contra nuxt | pending |
| 5 | Test E2E "full journey" SUPERVISOR | developer | #2 | tests/e2e/migration-paridad/role-journeys/supervisor.spec.ts | PASS | pending |
| 6 | Test E2E "full journey" RECEPTOR | developer | #2 | tests/e2e/migration-paridad/role-journeys/receptor.spec.ts | PASS | pending |
| 7 | Test E2E "full journey" CONSULTOR | developer | #2 | tests/e2e/migration-paridad/role-journeys/consultor.spec.ts | PASS | pending |
| 8 | Test E2E "full journey" ASESOR (tablet viewport) | developer | #2 | tests/e2e/migration-paridad/role-journeys/asesor.spec.ts | PASS en tablet, redirects 301 OK | pending |
| 9 | Tests "no-leak": cada rol NO puede ejecutar capabilities de otros (UI + API) | developer | #4-#8 | tests/e2e/migration-paridad/role-permissions.spec.ts | 30 tests (5x6) PASS | pending |
| 10 | Verificar mensajes literales por rol en UI | developer | #4-#8 | tests/e2e/migration-paridad/ui-messages-by-role.spec.ts | mensajes legacy preservados | pending |
| 11 | Generar reporte de cobertura de capabilities por rol | reviewer | #4-#10 | reports/capability-coverage-by-role.md | 100% capabilities critical PASS | pending |
| 12 | Actualizar content/docs/roles/{role}.md con descripcion del rol post-migracion | developer | #11 | content/docs/roles/*.md | 5 archivos, links validos | pending |

## Constraints

- RULE-AUTH-001 cancha-all-sentinel: User.cancha admite `'ALL'` literal.
- RULE-AUTH-002 receptor-no-all: RECEPTOR rechaza cancha `'ALL'`.
- RULE-AUTH-003 admin-only-on-admin: ADMIN-actions sobre ADMIN solo por ADMIN.
- RULE-AUTH-004 supervisor-sees-receptor: SUPERVISOR /auth/users filtrado a RECEPTOR.
- DEC-008-roles-paridad: 5 roles preservados.
- DEC-011-vistas-unificadas-asesor: ASESOR pierde vistas dedicadas.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-legacy-features | internal | inventario por rol que origina las CAPs | sin esto, las journeys son adivinanza |
| SPEC-migration-tdd | internal | infrastructure de testing (legacy-clone, nuxt-staging) | bloquea ejecucion |
| Decisiones DEC-{1..14} | internal | resoluciones de DELTAs antes del corte | bloquea cierre |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Capability legacy no inventariada (gap silencioso) | medium | high | inventario + entrevistas con usuarios reales (SUPERVISOR, RECEPTOR senior) |
| ASESOR en terreno con red intermitente: tests no replican condiciones | medium | medium | task #8 simula red lenta + viewport tablet |
| Mensajes literales del legacy parafraseados → confusion del usuario | high | medium | task #10 dedicada |
| Default route cambio sin comunicar al usuario | medium | medium | DEC-{n} explicita + entry en runbook |

## Open questions

- [x] ~~**Default route post-login por rol**~~ → resuelto por [DEC-015](../decisions/DEC-015-default-route-by-role.md): explícito por rol, ASESOR a `/rumas` (post DEC-011), throw on unknown.
- [x] ~~**CONSULTOR puede anular guia**~~ → resuelto por [DEC-014](../decisions/DEC-014-guia-status-auth.md): paridad client legacy = ADMIN/RECEPTOR/ASESOR (no CONSULTOR/SUPERVISOR).
- [x] ~~**AJUSTE_ROLES con RECEPTOR**~~ → resuelto por [DEC-001](../decisions/DEC-001-ajuste-roles-receptor.md): solo ADMINISTRADOR (paridad client legacy).
- [x] ~~**Default cancha al login**~~ → resuelto por [DEC-016](../decisions/DEC-016-default-cancha-login.md): paridad legacy = `User.cancha` se persiste en BD vía `PATCH /auth/cancha`.

## Acceptance checkpoints

- [ ] **5 role-journeys mapeadas y validadas E2E**.
- [ ] **Matriz capability x rol completa** (ningun rol con capability `unknown` o `pending` critical).
- [ ] **Mensajes literales preservados por rol** (o cambios en DEC).
- [ ] **Tests no-leak**: 30 tests rol x area PASS.
- [ ] **content/docs/roles/{role}.md actualizados** y revisados por content-writer.
