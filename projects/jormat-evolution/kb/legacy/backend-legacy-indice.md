---
id: DOC-kb-legacy-backend-legacy-indice
project: jormat-evolution
type: doc
module: backend
tags:
  - legacy
  - backend
  - backend-legacy
  - migration
  - reglas-de-negocio
  - inventario
  - pagos
  - permisos
---

# Backend legacy de Jormat: índice para migración

Fuente: `jormat_back_legacy/`, carpeta hermana de `jormat-evolution-mono/` dentro de `jormat_monorepo`. Nombre en Kanai: **backend-legacy**. Consulta del código en solo lectura; la copia no tiene historial Git. Revisión estática del índice: 2026-10-03.

Este documento permite localizar código que debe revisarse para migrar reglas de negocio al monorepo. **Es un mapa de fuentes, no una validación de todas las reglas ni de paridad funcional.** Cada regla migrada debe contrastarse con servicios/modelos, documentación y vistas del frontend legacy, y cubrirse con una prueba en la implementación nueva.

## Fuentes complementarias

- [Índice del frontend legacy](frontend-legacy-indice.md).
- Documentación local: `jormat_docs/legacy/front/migracion/README.md` (comparaciones y plan de migración).
- Documentación local: `jormat_docs/legacy/api.md`.
- Código actual: `jormat-evolution-mono/backend/jormat-api/`, `jormat-evolution-mono/front/jormat-front/`, `jormat-evolution-mono/shared/`.

## Puntos de entrada

- `package.json`: nombre Jormat_Sandbox, entrada `server/app.js`, dependencias Express 4 y Sequelize 3. Las versiones son las declaradas en esta copia; no se ejecutó el servidor.
- `server/app.js`: arranque.
- `server/routes.js`: montaje de rutas `/api/...`.
- `server/api/<módulo>/index.js`: endpoints y función invocada.
- `server/api/<módulo>/services.js`: handlers y validaciones. Excepciones: `purchases/service.js`, `up-image/service.js`; login en `users/serviceLogin.js`.
- `server/api/<módulo>/model.js`: acceso a datos; revisar consultas, cálculos y cambios de estado además de los servicios.
- `server/sqldb/index.js`: conexión y acceso a base de datos.
- `server/auth/auth.service.js`, `server/auth/local/passport.js`, `server/api/users/`: fuentes para revisar autenticación, permisos y roles. La existencia de estos archivos no demuestra que todos los endpoints estén protegidos.

## Módulos montados

Las líneas remiten a `server/routes.js`; las funciones son ejemplos leídos de cada `index.js`, no una enumeración completa de reglas.

| Módulo | Ruta base y montaje | Archivos de implementación | Funciones para iniciar la revisión |
|---|---|---|---|
| `ballots` | `/api/ballots` · línea 13 | `server/api/ballots/index.js`, `server/api/ballots/services.js`, `server/api/ballots/model.js` | `getBallots`, `getBallotsDetails`, `getBallotsItems`, `createBallot` |
| `billing` | `/api/billing` · línea 14 | `server/api/billing/index.js`, `server/api/billing/services.js`, `server/api/billing/model.js` | `getFoliosList`, `getCertificates`, `getCompanyData`, `getEconomicActivities` |
| `categories` | `/api/categories` · línea 15 | `server/api/categories/index.js`, `server/api/categories/services.js`, `server/api/categories/model.js` | `getCategories`, `createCategories`, `viewCategorieDetails`, `updateCategories` |
| `clients` | `/api/clients` · línea 16 | `server/api/clients/index.js`, `server/api/clients/services.js`, `server/api/clients/model.js` | `getClients`, `getClientsByName`, `getClientsByDsName`, `getClientsByNameCategory` |
| `demo` | `/api/demo` · línea 17 | `server/api/demo/index.js` | `serviceGet` |
| `documents` | `/api/documents` · línea 18 | `server/api/documents/index.js`, `server/api/documents/services.js`, `server/api/documents/model.js` | `getDocuments`, `getDocumentsDetails`, `createDocument`, `updateDocument` |
| `finance` | `/api/finance` · línea 19 | `server/api/finance/index.js`, `server/api/finance/services.js`, `server/api/finance/model.js` | `getExpenseControl`, `getExpenseControlDetails`, `expenseControlCreate`, `expenseControlUpdate` |
| `guides` | `/api/guides` · línea 20 | `server/api/guides/index.js`, `server/api/guides/services.js`, `server/api/guides/model.js` | `getGuides`, `getGuidesDetails`, `createGuide`, `updateGuide` |
| `invoices` | `/api/invoices` · línea 21 | `server/api/invoices/index.js`, `server/api/invoices/services.js`, `server/api/invoices/model.js` | `getInvoices`, `getInvoicesPages`, `getInvoicesDetails`, `createInvoice` |
| `items` | `/api/items` · línea 22 | `server/api/items/index.js`, `server/api/items/services.js`, `server/api/items/model.js` | `getitemDetails`, `getListItemsRelations`, `relatedItems`, `relatedItemsDelete` |
| `locations` | `/api/locations` · línea 23 | `server/api/locations/index.js`, `server/api/locations/services.js`, `server/api/locations/model.js` | `getLocations`, `getLocationsDetails`, `createLocations`, `updateLocations` |
| `notes` | `/api/notes` · línea 24 | `server/api/notes/index.js`, `server/api/notes/services.js`, `server/api/notes/model.js` | `getCreditNotes`, `getCreditNotesDetails`, `createCreditNote`, `createCreditNoteFailure` |
| `orders` | `/api/orders` · línea 25 | `server/api/orders/index.js`, `server/api/orders/services.js`, `server/api/orders/model.js` | `getOrders`, `getOrderDetails`, `getOrderItems`, `createOrder` |
| `payments` | `/api/payments` · línea 26 | `server/api/payments/index.js`, `server/api/payments/services.js`, `server/api/payments/model.js` | `getBanks`, `getBanksDetails`, `createBank`, `updateBank` |
| `pbi` | `/api/pbi` · línea 27 | `server/api/pbi/index.js`, `server/api/pbi/services.js` | `getInvoicesList`, `getBallotsList`, `getDocumentsList`, `getWarehousesList` |
| `providers` | `/api/providers` · línea 28 | `server/api/providers/index.js`, `server/api/providers/services.js`, `server/api/providers/model.js` | `getProvidersDetails`, `createProvider`, `updateProvider`, `disabledProvider` |
| `purchases` | `/api/purchases` · línea 29 | `server/api/purchases/index.js`, `server/api/purchases/service.js` | `getFileUrl`, `deleteFile`, `getFile`, `uploadFiles` |
| `quotations` | `/api/quotations` · línea 30 | `server/api/quotations/index.js`, `server/api/quotations/services.js`, `server/api/quotations/model.js` | `getQuotations`, `getQuotationsDetails`, `getQuotationsItems`, `createQuotation` |
| `reports` | `/api/reports` · línea 31 | `server/api/reports/index.js`, `server/api/reports/services.js`, `server/api/reports/model.js` | `getItemsSold`, `getItemsSoldPaginated`, `getItemsSoldHistoric`, `getItemsOutputs` |
| `up-image` | `/api/image` · línea 32 | `server/api/up-image/index.js`, `server/api/up-image/service.js` | `uploadImage`, `getImage` |
| `users` | `/api/users` · línea 33 | `server/api/users/index.js`, `server/api/users/services.js`, `server/api/users/serviceLogin.js`, `server/api/users/model.js` | `getUserDetailById`, `getUsers`, `getRole`, `getGroups` |
| `warehouseDeliveries` | `/api/warehouseDeliveries` · línea 34 | `server/api/warehouseDeliveries/index.js`, `server/api/warehouseDeliveries/services.js`, `server/api/warehouseDeliveries/model.js` | `getWarehouseDeliveries`, `getWarehouseDeliveriesPaginated`, `setWarehouseDeliveries` |
| `warehouses` | `/api/warehouses` · línea 35 | `server/api/warehouses/index.js`, `server/api/warehouses/services.js`, `server/api/warehouses/model.js` | `getWarehouses`, `getTransportation`, `transportationCreate`, `transportationUpdate` |

Se identificaron **23 módulos montados**. `server/api/mercadolibre/` existe y `items/services.js` importa sus servicios, pero no aparece montado directamente en `server/routes.js`; revisarlo como dependencia de ítems. `server/api/helpers/` contiene utilidades compartidas.

## Dónde empezar para encontrar reglas

| Tema | Fuentes y términos de búsqueda |
|---|---|
| Inventario, stock, kardex e histórico | `items/`, `warehouses/`, `locations/`, `warehouseDeliveries/`; `getStockItem`, `getHistoric`, `updateStockItemGeneral`, `itemWarehouseUpdate` |
| Facturas, boletas, notas y documentos | `invoices/`, `ballots/`, `notes/`, `documents/`, `billing/`; contrastar rutas, servicios y modelos antes de decidir equivalencias |
| Pagos de clientes y proveedores, bancos, cheques | `payments/`; `createPayment`, `updateStatusInvoice`, `createProviderPayment`, `updateProviderInvoiceStatus`, `checkUpdate` |
| Finanzas y comprobantes | `finance/`, `payments/`, `reports/`; revisar cálculos, validaciones y transiciones en servicios y modelos |
| Usuarios, roles y permisos | `users/`, `auth/`; `getAllPermissionsByrole`, `insertRolePermission`, `statusUserUpdate`, `loginUsers` |
| Cotizaciones, órdenes, compras y guías | `quotations/`, `orders/`, `purchases/`, `guides/`; comparar qué endpoint dispara cada movimiento |
| Clientes, proveedores y categorías | `clients/`, `providers/`, `categories/`; validación y desactivación |
| Reportes e integraciones | `reports/`, `pbi/`, `mercadolibre/`, `up-image/`; separar reglas internas de efectos externos |

Ejemplos comprobados para navegar: `server/api/items/index.js:23` vincula `/stock` con `getStockItem`; `:61` vincula `/historic` con `getHistoric`. En `server/api/items/services.js`, `uploadImports` usa CSV separado por `;` y reporta archivo omitido o vacío. Estas observaciones iniciales deben ampliarse antes de afirmar paridad con la implementación nueva.

## Método de revisión para cada migración

1. Localizar la vista y acción en el [frontend legacy](frontend-legacy-indice.md).
2. Identificar la URL y el método HTTP; seguir `server/routes.js` → `index.js` → servicio → modelo.
3. Extraer condiciones de entrada, permisos, estados admitidos, cálculos, redondeos, efectos en stock/documentos y errores. Citar `archivo:línea` y función.
4. Comparar con el código actual y clasificar cada regla como conservada, parcial, ausente o pendiente de decisión. Un nombre de función coincidente no prueba paridad.
5. Confirmar con negocio qué reglas se mantienen; registrar ejemplos y pruebas en la implementación nueva.

Este índice no ejecuta el legacy, no copia credenciales y no presenta su comportamiento histórico como una decisión aprobada de migración.
