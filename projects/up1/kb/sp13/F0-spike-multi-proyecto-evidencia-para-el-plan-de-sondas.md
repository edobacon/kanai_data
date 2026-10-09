---
id: DOC-kb-sp13-F0-spike-multi-proyecto-evidencia-para-el-plan-de-sondas
project: up1
type: doc
tags:
  - sp13
  - f0
  - spike
  - sondas
---

# F0 spike multi-proyecto: evidencia para el plan de sondas

Evidencia de la fase F0 del plan `plan-verificador-sondas-y-barrido` (2026-10-09). Solo lectura. Revisiones leídas: taomangalam en el working copy local de `/Users/edobacon/Workspace/taomangalam` (rama de trabajo), up1 por `run_probes` sobre origin.

## Taomangalam (validación primero)

**Resultado: `entry-guards` es viable con fuente `openapi` más rutas de Express. `field-keys`, `list-relations` y `org-scope` no aplican.**

- Servidor: Express 5 con `express-openapi-validator`, pero **`validateSecurity: false`** (`server/src/middleware/validacion-contrato.ts:27`). El contrato declara `security` por operación (`security: []` en las públicas, 17 ocurrencias; bearer global por defecto en `openapi.yaml:125`), y también `x-capacidad` y `x-requiere-cuenta`. El validador NO aplica la seguridad: la aplican los middlewares que cada ruta recibe.
- Aplicación real de la guarda: por ruta, con middlewares inyectados (`router.post('/auth/logout', autenticacion, capacidad, handler)` en `server/src/routes/auth.ts:106`, `router.get('/privacidad/consentimientos', autenticacion, capacidad, ...)` en `routes/privacidad.ts:84`, `opciones.autenticacion` en `routes/cuenta.ts`). Hay rutas que registran la guarda solo si la dependencia existe (`if (autenticacion !== undefined && capacidad !== undefined)`).
- Lo que ya cubre la CI de taomangalam: `server/src/capacidades/ci-checks.ts` compara el catálogo de capacidades con el seed y las `x-capacidad` del contrato con las claves conocidas (`operacionesSinCapacidad`, `operacionesConCapacidadDesconocida`). **No verifica** que cada ruta que el contrato declara protegida registre de verdad el middleware de autenticación. Ese hueco es el que cubre `entry-guards` (contrato frente a registro de la ruta).
- Límite conocido de la fuente: una guarda aplicada con `app.use(prefijo, middleware)` no se ve en el archivo de la ruta; la sonda lo documenta y se configura con vocabulario de guardas y glob de rutas en el `probes.yaml`.
- App Flutter: un solo archivo `app/lib/l10n/app_es.arb` y un lint propio `no_hardcoded_ui_text`. No hay claves por campo de objeto (`column.<campo>`), así que `field-keys` no aplica.
- Aislamiento por organización: no existe. Solo hay un campo `tenant` de analítica en el esquema Prisma (`schema.prisma:526`). `org-scope` no aplica.
- Catálogo OpenAPI: 54 objetos que salen de `x-entidades-escritas`; solo trae operaciones de escritura, por eso `entry-guards` lee el contrato y las rutas directamente y no por objeto.

## Up1 (spike del catálogo con el core, D4)

`run_probes` sobre `Section` con el campo `orgUnitId` (FK al core) corrió sin error en 3,9 s y levantó solo las tarjetas esperadas (ciclo de vida del padre y consumidores cruzados). `reference-coherence` no se queja de las FK a objetos fuera del catálogo: confirma que ignora los objetos del core y que ampliar el catálogo global es innecesario para esta fase. D4 se mantiene (leer el core solo dentro de `org-scope`).

## Jormat

Pendiente a F9: el backend (NestJS) usa `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)` por controlador (visto en catalogos, customers y guides); la fuente `decorators` se valida allí.

## Decisión de diseño que sale del spike

`entry-guards` es un tipo **a nivel pedido** (corre una vez por repo, como `role-grants` y `code-pattern`), no por objeto: los puntos de entrada de lectura no cuelgan de un objeto del catálogo en ninguno de los tres proyectos. Se acota a los objetos que nombra el pedido cuando la fuente lo permite, y en el barrido (F2) se corre por repo completo. Solo levanta señal cuando hay puntos de entrada sin guarda visible, para no abrir tarjetas de puro recordatorio.
