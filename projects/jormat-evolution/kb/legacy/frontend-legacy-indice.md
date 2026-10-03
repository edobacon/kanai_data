---
id: DOC-kb-legacy-frontend-legacy-indice
project: jormat-evolution
type: doc
module: frontend
tags:
  - legacy
  - frontend
  - frontend-legacy
  - migration
  - reglas-de-negocio
  - inventario
  - pagos
  - permisos
---

# Frontend legacy de Jormat: índice para migración

Fuente: `jormat-front-legacy/`, carpeta hermana de `jormat-evolution-mono/` en `jormat_monorepo`. Nombre en Kanai: **frontend-legacy**. Copia de referencia sin historial Git. Índice revisado el 2026-10-03.

Mapa para localizar las vistas y reglas de interfaz que deben contrastarse con el backend legacy y la implementación nueva. No es una validación completa de paridad ni una decisión de mantener cada comportamiento histórico.

## Fuentes complementarias

- [Índice del backend legacy](backend-legacy-indice.md): rutas, servicios y modelos.
- Documentación extensa ya existente en `jormat_docs/legacy/front/README.md` y `jormat_docs/legacy/front/*.md`.
- Comparaciones por vista y brechas conocidas en `jormat_docs/legacy/front/migracion/README.md` y archivos de esa carpeta. Estas rutas pertenecen a la documentación local; este índice no afirma que esos documentos estén importados al KB interno.

## Puntos de entrada

- `src/app.js`: aplicación AngularJS.
- `src/app/<módulo>/*.route.js`: estados, URLs, controllers y templates.
- `src/app/<módulo>/**/*Controller.js`: comportamiento de vistas, formularios, acciones y llamadas a servicios.
- `src/app/<módulo>/**/*Services.js`: endpoints y operaciones; seguir la URL hasta el backend legacy.
- `src/app/<módulo>/**/*.html`: condiciones de mostrar/habilitar, campos obligatorios y acciones de filas.
- `src/services/permissionIndex.js`: directivas de permisos. Buscar `has-permission` y `has-disabled` en templates y cruzar las claves con usuarios/roles del backend.
- `src/services/userAuth.directive.js`, `src/services/app-helper.js`: fuentes transversales a revisar.

## Módulos presentes en el código

| Módulo | Ruta fuente | Documentación local existente |
|---|---|---|
| `admin-panel` | `src/app/admin-panel/` | `jormat_docs/legacy/front/admin.md` |
| `billing` | `src/app/billing/` | Sin documento por módulo verificado en este índice |
| `finance` | `src/app/finance/` | `jormat_docs/legacy/front/finance.md` |
| `human-resources` | `src/app/human-resources/` | Sin documento por módulo verificado en este índice |
| `items` | `src/app/items/` | `jormat_docs/legacy/front/items.md` |
| `main-start` | `src/app/main-start/` | Sin documento por módulo verificado en este índice |
| `purchases` | `src/app/purchases/` | `jormat_docs/legacy/front/compras.md` |
| `reports` | `src/app/reports/` | `jormat_docs/legacy/front/reportes.md` |
| `sales` | `src/app/sales/` | `jormat_docs/legacy/front/ventas.md` |
| `warehouse` | `src/app/warehouse/` | `jormat_docs/legacy/front/warehouse.md` |

## Reglas de interfaz que revisar

- Visibilidad y habilitación: `ng-if`, `ng-show`, `ng-hide`, `ng-disabled`, `has-permission`, `has-disabled`.
- Validación de formularios: `ng-required`, validaciones del controller, valores predeterminados y mensajes de error.
- Estados y acciones: cómo cambian las opciones según el estado del registro; qué acciones abren un modal y cuáles una página.
- Cálculos y presentación: subtotales, impuestos, descuentos, redondeos, fechas y filtros. Confirmar cuáles se recalculan también en el backend.
- Tablas: `columnDefs`, `cellTemplate`, paginación, exportaciones y acciones de fila.
- Integración: URL y método HTTP, payload, respuesta y manejo de errores.

## Recorrido para migrar una vista

1. Ubicar la ruta, controller y template de la vista legacy.
2. Extraer las condiciones de visualización, edición y validación; citar archivo y línea.
3. Seguir la llamada de servicio al [backend legacy](backend-legacy-indice.md), donde pueden vivir reglas adicionales.
4. Comparar con `jormat-evolution-mono/front/jormat-front/` y `backend/jormat-api/`; registrar reglas conservadas, parciales, ausentes o pendientes de decisión.
5. Confirmar con negocio los cambios de comportamiento y cubrir los escenarios aceptados con pruebas.

Para ítems, fuentes verificadas: `src/app/items/items/history/itemsHistoryViewController.js`, `src/app/items/items/cardex/itemsCardexController.js` y `src/app/items/categories/list/categoriesListController.js`. La documentación extensa local contiene mapeos y observaciones; revisarla junto con el código, sin asumir que todos sus diagnósticos siguen vigentes.
