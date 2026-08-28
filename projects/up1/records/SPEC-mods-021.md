---
id: SPEC-mods-021
project: up1
type: doc
module: mods
tags:
  - validacion
  - resultados
  - playwright
  - hallazgos
  - correcciones
---

# Resultados de validacion visual — 2026-04-14

Ejecucion de flujos VV contra uP1 local (localhost:3000/4000/5678).

## Entorno

- Usuario: eduardo.bacon@uplanner.com
- Roles disponibles: Consultor, Colaborador (NO Admin)
- Tenant: UPU
- Auth: RBAC_TEST_MODE=false, sesion Clerk activa
- Servicios: Object Manager (:4000), Suite (:3000), n8n (:5678)

## Resultados

| Flujo | Estado | Notas |
|-------|--------|-------|
| VV-01: Login y acceso | **PASS** | Login automatico via Clerk. Redirect a /login/UPU → /UPU. Sidebar visible |
| VV-02: RecordList | **PASS** | Ofertas: 26 elementos en cards. Busqueda, filtros, toggle lista/cards funcional |
| VV-03: View modal | **PASS** | RecordDetail se abre como modal. FK display funciona (Service → "Deportes y Recreacion") |
| VV-03: Create form | **PASS** | Formulario pagina completa. Campos: text, select FK, date, time, toggle. Labels traducidos |
| VV-03: Calendar | **PASS** | OfferingCalendar semanal. Eventos, zonas de descanso, conflictos, leyenda, navegacion temporal |
| VV-08: Traducciones | **PASS** | Sin claves i18n raw detectadas. Labels en espanol correctos |
| VV-09: RBAC | **PASS parcial** | Consultor: apps sin objetos visibles. Colaborador: acceso completo a Engagement. Cambio de rol funciona |
| VV-04: GraphQL API | **PASS con correcciones** | 57 objetos en API. Schema difiere de doc (ver hallazgos) |

## Hallazgos criticos para corregir docs

### 1. API GraphQL: nombres de argumentos y campos difieren de la documentacion

| Documentado | Real | Archivo a corregir |
|---|---|---|
| `listInstances(objectName: ...)` | `listInstances(name: ...)` | programmatic-interaction.md, recipes/programmatic.md, debugging.md |
| `{ instances, totalCount }` | `{ items { id data extended }, totalCount }` | programmatic-interaction.md, recipes/programmatic.md |
| `getInstance(objectName, id)` | `getInstance(objectType, id)` | programmatic-interaction.md |

**Impacto:** las recetas de API programatica (PROG-01..09) tienen queries que fallan directamente.

### 2. Boton cerrar modal: clase CSS diferente

| Documentado | Real |
|---|---|
| `.btn-close` | `.modal-close-button` (clase: `btn icon-button btn-link modal-close-button`) |

**Impacto:** el helper `closeModal()` en visual-validation.md y playwright-navigation.md necesita actualizarse.

### 3. Selector de rol cambia el contenido visible

- Consultor: ninguna app tiene objetos visibles ("no tiene objetos para mostrar")
- Colaborador: Engagement visible con tabs Eventos + Ofertas, Report Builder en sidebar

**Impacto:** la guia de validacion visual debe indicar que se necesita el rol correcto antes de verificar contenido.

### 4. page.goto() pierde sesion (confirmado)

Documentado correctamente en playwright-navigation.md. Al hacer `page.goto('http://localhost:3000/UPU')` la sesion se pierde momentaneamente pero se re-autentica automaticamente en ~2s.

### 5. Service token no autentica listInstances

`Authorization: Bearer up1-flow-service-token` con `RBAC_TEST_MODE=false` no bypassea auth en `listInstances`. Puede ser que:
- El OM necesita restart despues de cambiar .env
- El token bypass solo funciona para resolvers que usan `withAuth` (no el CRUD autogenerado)
- La logica de userExtractor.js evalua el token pero `checkObjectPermissions` tiene un path diferente

**Impacto:** recipes/programmatic.md PROG-09 (script headless) puede no funcionar como esta documentado.

## Screenshots capturados

| Screenshot | Que muestra |
|---|---|
| vv-01-login-page.png | Pagina de login (redirect) |
| vv-02-home-loaded.png | Home con sidebar y bienvenida |
| vv-04-app-grupo1.png | App sin objetos |
| vv-05-engagement-content.png | Engagement sin objetos (Consultor) |
| vv-06-role-selector.png | Selector de rol: Consultor/Colaborador |
| vv-07-colaborador-recordlist.png | RecordList "Mis Eventos" con Colaborador |
| vv-08-ofertas-dropdown.png | Dropdown de Ofertas con sub-items |
| vv-09-ofertas-recordlist.png | Ofertas en vista cards (26 elementos) |
| vv-10-recorddetail-view.png | RecordDetail view como modal |
| vv-11-eventos-dropdown.png | Dropdown Eventos: Mis Eventos, Crear, Calendarios |
| vv-12-crear-evento.png | Formulario de creacion de evento |
| vv-13-session-lost-reauth.png | Sesion perdida por goto() y re-auth |
| vv-14-calendar.png | OfferingCalendar semanal con evento y conflictos |
