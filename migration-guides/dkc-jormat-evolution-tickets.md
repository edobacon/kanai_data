# Plan DKC -> Kanai por ticket - jormat-evolution
 
Fuente DKC: commit e15fa24377cf1a0768cc10ad567c110b3ac2042e. Tickets canónicos: 156. Sidecars Markdown: 0.
 
Cada fila sigue: hash -> parseo -> relaciones -> schema/FK -> smoke -> resultado. Los estados provisionales requieren revisión antes de aceptar la migración.
 
| ID | Archivo | Título | Estado DKC | Estado Kanai | Work type | External | Sidecars | Disposición |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| JOR-001 | projects/jormat-evolution/tickets/JOR-001.md | JOR-001 · Commit del setup base de entorno | closed | closed | tactic | null | — | direct |
| JOR-002 | projects/jormat-evolution/tickets/JOR-002.md | JOR-002 · A0 · Tooling y configuracion base | closed | closed | implement | null | — | direct |
| JOR-003 | projects/jormat-evolution/tickets/JOR-003.md | JOR-003 · A1 · Tema claro/oscuro | closed | closed | implement | null | JOR-003.draft, JOR-003.teach | direct |
| JOR-004 | projects/jormat-evolution/tickets/JOR-004.md | JOR-004 · A1.5 · Login & landing (rediseño pre-auth) | closed | closed | implement | null | JOR-004.draft, JOR-004.teach | direct |
| JOR-005 | projects/jormat-evolution/tickets/JOR-005.md | JOR-005 · A2 · Shell / chrome transversal | closed | closed | implement | null | JOR-005.draft, JOR-005.teach | direct |
| JOR-006 | projects/jormat-evolution/tickets/JOR-006.md | JOR-006 · A3 · Librería UI: átomos + formularios | closed | closed | implement | null | JOR-006.draft, JOR-006.teach | direct |
| JOR-007 | projects/jormat-evolution/tickets/JOR-007.md | JOR-007 · A3 · Librería UI: datos + layout | closed | closed | implement | null | JOR-007.draft | direct |
| JOR-008 | projects/jormat-evolution/tickets/JOR-008.md | JOR-008 · A4 · Comportamientos transversales | closed | closed | implement | null | JOR-008.draft | direct |
| JOR-009 | projects/jormat-evolution/tickets/JOR-009.md | JOR-009 · A5 · Fundaciones backend | closed | closed | implement | null | — | direct |
| JOR-010 | projects/jormat-evolution/tickets/JOR-010.md | JOR-010 · A6 · RBAC backend | closed | closed | implement | null | JOR-010.draft | direct |
| JOR-011 | projects/jormat-evolution/tickets/JOR-011.md | JOR-011 · A6 · RBAC frontend (Usuarios + Roles/Permisos) | closed | closed | implement | null | — | direct |
| JOR-012 | projects/jormat-evolution/tickets/JOR-012.md | JOR-012 · A7 · Seguridad (complementos aditivos + reporte heredados) | closed | closed | implement | null | — | direct |
| JOR-013 | projects/jormat-evolution/tickets/JOR-013.md | JOR-013 · B1 · Items / Catálogo (front + stub) | closed | closed | implement | null | JOR-013.draft | direct |
| JOR-014 | projects/jormat-evolution/tickets/JOR-014.md | JOR-014 · B2 · Ventas (front + stub) | closed | closed | implement | null | JOR-014.draft | direct |
| JOR-015 | projects/jormat-evolution/tickets/JOR-015.md | JOR-015 · B3 · Compras (front + stub) | closed | closed | implement | null | JOR-015.draft | direct |
| JOR-016 | projects/jormat-evolution/tickets/JOR-016.md | JOR-016 · B4 · Pagos (front + stub) | closed | closed | implement | null | JOR-016.draft | direct |
| JOR-017 | projects/jormat-evolution/tickets/JOR-017.md | JOR-017 · B5 · Transversales de negocio (front + stub) | closed | closed | implement | null | JOR-017.draft | direct |
| JOR-023 | projects/jormat-evolution/tickets/JOR-023.md | Registrar convencion de organizacion de archivos de componentes (hibrido + story/test por componente) | closed | closed | tactic | null | — | direct |
| JOR-024 | projects/jormat-evolution/tickets/JOR-024.md | Migrar componentes frontend a la convencion RULE-frontend-001 (story+test por componente, composites en carpeta) | closed | closed | refactor | null | JOR-024.teach | direct |
| JOR-025 | projects/jormat-evolution/tickets/JOR-025.md | Relocar componentes a src/components/ (separacion app/components) + limpiar scaffold | closed | closed | tactic | null | — | direct |
| JOR-026 | projects/jormat-evolution/tickets/JOR-026.md | Seed dev: asignar rol internal-admin (acceso total) a los admins | closed | closed | tactic | null | — | direct |
| JOR-027 | projects/jormat-evolution/tickets/JOR-027.md | Fix seed runner: knex carga el spec colocado en seeds/ y aborta la corrida | closed | closed | tactic | null | — | direct |
| JOR-028 | projects/jormat-evolution/tickets/JOR-028.md | Fix: detalles de modo oscuro + coherencia de componentes (steppers, selects nativos, botón Guardar borrador) | closed | closed | fix | null | — | direct |
| JOR-029 | projects/jormat-evolution/tickets/JOR-029.md | Sidebar colapsado: los grupos quedan inaccesibles (solo icono no interactivo) | closed | closed | fix | null | — | direct |
| JOR-030 | projects/jormat-evolution/tickets/JOR-030.md | Detalles UX del modal de detalle de item (cierre, dismiss configurable, select custom) | closed | closed | tactic | null | — | direct |
| JOR-031 | projects/jormat-evolution/tickets/JOR-031.md | TopBar: mostrar nombre de empresa (no id) + ocultar badge de notificaciones en 0 | closed | closed | tactic | null | — | direct |
| JOR-032 | projects/jormat-evolution/tickets/JOR-032.md | Quitar el tile "Inicio" del lanzador del dashboard (es redundante) | closed | closed | tactic | null | — | direct |
| JOR-033 | projects/jormat-evolution/tickets/JOR-033.md | Quitar el permiso `*` de internal-admin y sembrarle todas las capabilities (auto-grant de permisos nuevos) | closed | closed | improvement | null | — | direct |
| JOR-034 | projects/jormat-evolution/tickets/JOR-034.md | Acceso dev durable: habilitar 02_local_admin (ENABLE_DEV_ADMIN_SEED) + documentarlo en .env.example | closed | closed | tactic | null | — | direct |
| JOR-035 | projects/jormat-evolution/tickets/JOR-035.md | Visualizar usuarios y su rol RBAC, y poder cambiarlo (un rol por usuario, de los disponibles) | closed | closed | improvement | null | — | direct |
| JOR-036 | projects/jormat-evolution/tickets/JOR-036.md | Robustez del workspace activo del internal-admin (override stale → listados vacíos sin señal) | closed | closed | fix | null | — | direct |
| JOR-037 | projects/jormat-evolution/tickets/JOR-037.md | Arreglar los breadcrumbs: sacarlos del TopBar, ubicarlos dentro de la vista (esquina superior izquierda) y agregar "Inicio" como primer item | closed | closed | fix | null | — | direct |
| JOR-038 | projects/jormat-evolution/tickets/JOR-038.md | Las peticiones de red del front no se cancelan al navegar — una nueva petición debe abortar la anterior | closed | closed | fix | null | — | direct |
| JOR-039 | projects/jormat-evolution/tickets/JOR-039.md | Modernizar convenciones de codigo: guardarrail ESLint + refactors acotados (switch / ternario) | closed | closed | refactor | null | — | direct |
| JOR-040 | projects/jormat-evolution/tickets/JOR-040.md | Sembrar 6 cuentas demo + crear 6 roles RBAC con permisos mapeados desde legacy | closed | closed | implement | null | — | direct |
| JOR-041 | projects/jormat-evolution/tickets/JOR-041.md | Tests de configuracion de roles: 1 cuenta de prueba + DB de test efimera (crear/limpiar automatico) | closed | closed | implement | null | — | direct |
| JOR-042 | projects/jormat-evolution/tickets/JOR-042.md | Corregir stories de storybook stale (Home + Sidebar) | closed | closed | tactic | null | — | direct |
| JOR-043 | projects/jormat-evolution/tickets/JOR-043.md | Admin/usuarios se enganchan por email; el OID se rellena en el login (eliminar DEV_ADMIN_OID) | closed | closed | tactic | null | — | direct |
| JOR-044 | projects/jormat-evolution/tickets/JOR-044.md | Loader animado + theme-aware en las pantallas transitorias de login (cargando/inicializando) | closed | closed | tactic | null | JOR-044.screenshots | direct |
| JOR-045 | projects/jormat-evolution/tickets/JOR-045.md | Fix animación del modal: entrada y salida centradas (no desde abajo-derecha) | closed | closed | tactic | null | — | direct |
| JOR-046 | projects/jormat-evolution/tickets/JOR-046.md | Activación/desactivación de cuentas de usuario: permiso, no auto-acción, modal de confirmación y bloqueo de login | closed | closed | improvement | null | — | direct |
| JOR-047 | projects/jormat-evolution/tickets/JOR-047.md | Storybook al día: stories de ConfirmDialog y FullScreenLoader + UsersTable con cambio de estado | closed | closed | tactic | null | — | direct |
| JOR-048 | projects/jormat-evolution/tickets/JOR-048.md | Documentación interna en el repo (estructura, patrones, guías dev/test, permisos) | closed | closed | implement | null | — | direct |
| JOR-049 | projects/jormat-evolution/tickets/JOR-049.md | Subir coverage de tests al máximo (≥90% front y back) | closed | closed | improvement | null | — | direct |
| JOR-050 | projects/jormat-evolution/tickets/JOR-050.md | Re-sincronizar config.yaml DKC con el estado real del repo | closed | closed | tactic | null | — | direct |
| JOR-051 | projects/jormat-evolution/tickets/JOR-051.md | Documentación interna exhaustiva fullstack (LLM-friendly, flujos, deploy, auth, permisos, diagramas) | closed | closed | implement | null | — | direct |
| JOR-052 | projects/jormat-evolution/tickets/JOR-052.md | Fix: Switch sin `relative` deja escapar su bubble input → espacio blanco al final de la página | closed | closed | tactic | null | — | direct |
| JOR-053 | projects/jormat-evolution/tickets/JOR-053.md | Fix: franja blanca al final de página (dark) — el body scrollea por elementos absolutos de Radix que escapan | closed | closed | fix | null | JOR-053.screenshots | direct |
| JOR-054 | projects/jormat-evolution/tickets/JOR-054.md | Sincronizar documentación (JOR-049/052/053) + regla de revisión doc+tests por ticket | closed | closed | tactic | null | — | direct |
| JOR-055 | projects/jormat-evolution/tickets/JOR-055.md | B2.1 · Sidebar canónico + cableado de navegación entre vistas | closed | closed | implement | null | — | direct |
| JOR-056 | projects/jormat-evolution/tickets/JOR-056.md | B2.2 · Reglas transversales de flujo: guard de cambios, confirmaciones y cierres | closed | closed | implement | null | — | direct |
| JOR-057 | projects/jormat-evolution/tickets/JOR-057.md | B2.3 · Servicios de catálogo demo (backend STUB) | closed | closed | implement | null | — | direct |
| JOR-058 | projects/jormat-evolution/tickets/JOR-058.md | B2.4 · Consumo de catálogos en el front + filtros dinámicos | closed | closed | implement | null | — | direct |
| JOR-059 | projects/jormat-evolution/tickets/JOR-059.md | B2.5 · Mock interno del SII + advertencias de simulación | closed | closed | implement | — | — | direct |
| JOR-060 | projects/jormat-evolution/tickets/JOR-060.md | B2.6 · Vistas destino faltantes sobre stub: listado AP, detalle DTE, edición item | closed | closed | implement | null | — | direct |
| JOR-061 | projects/jormat-evolution/tickets/JOR-061.md | B2.x · Cierre de deuda JOR-059: contrato Zod, a11y del Alert y cobertura de branches ≥90 | closed | closed | improvement | null | — | direct |
| JOR-062 | projects/jormat-evolution/tickets/JOR-062.md | Imágenes docker prod/dev con nombre propio para que convivan | closed | closed | tactic | null | — | direct |
| JOR-063 | projects/jormat-evolution/tickets/JOR-063.md | El guard de cambios sin guardar avisa "se van a perder los cambios" sin haber editado nada | closed | closed | fix | null | — | direct |
| JOR-064 | projects/jormat-evolution/tickets/JOR-064.md | Mantenedores de Categorías, Aplicaciones y Catálogos (gateados por permiso + admin) — discovery legacy + análisis front/back | closed | closed | implement | null | JOR-064.legacy-capture | direct |
| JOR-065 | projects/jormat-evolution/tickets/JOR-065.md | JOR-065 — Refinamientos del transaction-builder (ventas/compras) | closed | closed | implement | null | — | direct |
| JOR-066 | projects/jormat-evolution/tickets/JOR-066.md | JOR-066 — Spacing global + rediseño de ItemCreateForm (cards en columnas) | closed | closed | improvement | null | — | direct |
| JOR-067 | projects/jormat-evolution/tickets/JOR-067.md | Crear factura cliente — RUT unico select-suggest, poblado de datos del cliente, DatePicker y "Actualizar receptor" | closed | closed | implement | null | JOR-067.draft, JOR-067.teach | direct |
| JOR-068 | projects/jormat-evolution/tickets/JOR-068.md | Paginación server-side para todas las tablas (total/rango/páginas calculados en el backend) | closed | closed | improvement | null | — | direct |
| JOR-069 | projects/jormat-evolution/tickets/JOR-069.md | Mostrar la barra de paginación siempre (no ocultarla con una sola página) | closed | closed | tactic | null | — | direct |
| JOR-070 | projects/jormat-evolution/tickets/JOR-070.md | Selector de filas por página global + KPIs de Documentos con icono/color | closed | closed | tactic | null | — | direct |
| JOR-071 | projects/jormat-evolution/tickets/JOR-071.md | Buscador de items del builder falla (limit:1000 vs @Max(100)) — pasar a paginación server-side 10/página | closed | closed | fix | null | — | direct |
| JOR-072 | projects/jormat-evolution/tickets/JOR-072.md | KPIs de Documentos: endpoint summary server-side (dejar de traer todo el catálogo) | closed | closed | improvement | null | — | direct |
| JOR-073 | projects/jormat-evolution/tickets/JOR-073.md | Performance de carga de vistas (bundle / code-splitting) — investigación primero | closed | closed | improvement | null | — | direct |
| JOR-074 | projects/jormat-evolution/tickets/JOR-074.md | Diferir MSAL del First Load (P1a — escindido de JOR-073) | closed | closed | improvement | null | — | direct |
| JOR-075 | projects/jormat-evolution/tickets/JOR-075.md | 'Total ingresado' de Pagos Clientes: contar abonos parciales (calza con la tabla) | closed | closed | tactic | null | — | direct |
| JOR-076 | projects/jormat-evolution/tickets/JOR-076.md | T-PLAT-01 · Modelo de datos del dominio + multi-tenant | closed | closed | explore | null | JOR-076.draft | direct |
| JOR-077 | projects/jormat-evolution/tickets/JOR-077.md | T-PLAT-02 · RBAC por campo (cerrar gap de inputs sensibles) | closed | closed | improvement | null | — | direct |
| JOR-078 | projects/jormat-evolution/tickets/JOR-078.md | T-PLAT-03 · Impresion / export (estrategia unica) | open | open | implement | null | — | direct |
| JOR-079 | projects/jormat-evolution/tickets/JOR-079.md | T-PLAT-04 · Formato regional + estados de UI | closed | closed | fix | null | — | direct |
| JOR-080 | projects/jormat-evolution/tickets/JOR-080.md | T-PLAT-05 · i18n (condicional a decision de producto) | closed | closed | implement | null | — | direct |
| JOR-081 | projects/jormat-evolution/tickets/JOR-081.md | T-ITEMS-BK · Conectar servicios de items a DB (modelo ya existe) | closed | closed | implement | null | — | direct |
| JOR-082 | projects/jormat-evolution/tickets/JOR-082.md | T-CAT-BK · Dinamizar servicios de catalogos a DB (modelo ya existe) | closed | closed | implement | null | — | direct |
| JOR-083 | projects/jormat-evolution/tickets/JOR-083.md | T-ITEMS-FE-1 · Items: listado + detalle (cerrar gaps) | closed | closed | implement | null | — | direct |
| JOR-084 | projects/jormat-evolution/tickets/JOR-084.md | T-ITEMS-FE-2 · Items: crear + editar (cerrar gaps) | closed | closed | implement | null | — | direct |
| JOR-085 | projects/jormat-evolution/tickets/JOR-085.md | T-ITEMS-FE-3 · Mantenedores: categorias + aplicaciones + catalogos | closed | closed | improvement | null | — | direct |
| JOR-086 | projects/jormat-evolution/tickets/JOR-086.md | T-VENTAS-BK · Backend ventas (crear modelo + contrato) | open | open | implement | null | — | direct |
| JOR-087 | projects/jormat-evolution/tickets/JOR-087.md | T-VENTAS-FE-1 · Facturas: listado + detalle (cerrar gaps) | closed | closed | implement | null | — | direct |
| JOR-088 | projects/jormat-evolution/tickets/JOR-088.md | T-VENTAS-FE-2 · Builder de factura (crear) | closed | closed | implement | null | — | direct |
| JOR-089 | projects/jormat-evolution/tickets/JOR-089.md | T-VENTAS-FE-3 · Mantenedor de clientes | closed | closed | implement | null | — | direct |
| JOR-090 | projects/jormat-evolution/tickets/JOR-090.md | T-COMPRAS-BK · Backend compras (crear modelo + proveedores + borrador) | open | open | implement | null | — | direct |
| JOR-091 | projects/jormat-evolution/tickets/JOR-091.md | T-COMPRAS-FE-1 · Factura proveedor: listado + builder (cerrar gaps) | closed | closed | implement | null | — | direct |
| JOR-092 | projects/jormat-evolution/tickets/JOR-092.md | T-PAGOS-BK · Backend pagos (crear modelo + reglas) | open | open | implement | null | — | direct |
| JOR-093 | projects/jormat-evolution/tickets/JOR-093.md | T-PAGOS-FE-1 · Cobranza: listado + aplicar pago (cerrar gaps) | closed | closed | implement | null | — | direct |
| JOR-094 | projects/jormat-evolution/tickets/JOR-094.md | T-ADMIN-FE-1 · Roles: cablear editar + eliminar + cancelar | closed | closed | implement | null | — | direct |
| JOR-095 | projects/jormat-evolution/tickets/JOR-095.md | T-ADMIN-FE-2 · Usuarios: decisiones + wiring | closed | closed | implement | null | — | direct |
| JOR-096 | projects/jormat-evolution/tickets/JOR-096.md | T-ADMIN-FE-3 · Administracion del catalogo de capabilities | open | open | implement | null | — | direct |
| JOR-097 | projects/jormat-evolution/tickets/JOR-097.md | T-REPORTES-BK · Backend de agregacion de reportes | open | open | implement | null | — | direct |
| JOR-098 | projects/jormat-evolution/tickets/JOR-098.md | T-REPORTES-FE-1 · Reportes por familia | open | open | implement | null | — | direct |
| JOR-099 | projects/jormat-evolution/tickets/JOR-099.md | JOR-099 · Reconciliar migraciones + seed de inventario tras merge de items | closed | closed | fix | null | — | direct |
| JOR-100 | projects/jormat-evolution/tickets/JOR-100.md | JOR-100 · Multi-tenant enforcement: remover RLS inerte + aislación por workspace_id en código | closed | closed | improvement | null | — | direct |
| JOR-101 | projects/jormat-evolution/tickets/JOR-101.md | Actualizar matriz e2e de roles tras JOR-077 (cost-view) | closed | closed | fix | null | — | direct |
| JOR-102 | projects/jormat-evolution/tickets/JOR-102.md | JOR-102 · Cleanup: retirar el alias deprecado `formatCLP` | closed | closed | tactic | null | — | direct |
| JOR-103 | projects/jormat-evolution/tickets/JOR-103.md | JOR-103 · Auditoría de consistencia (plan/legacy) — hallazgos + remediación | closed | closed | fix | null | — | direct |
| JOR-104 | projects/jormat-evolution/tickets/JOR-104.md | JOR-104 · Resolver 6 decisiones de negocio bloqueantes (desbloquea cierre de JOR-103) | design-transition-to-execute | open | implement | null | — | preserve legacy status + review |
| JOR-105 | projects/jormat-evolution/tickets/JOR-105.md | JOR-105 · Bypass de login dev/test-only para E2E y Playwright | closed | closed | implement | null | — | direct |
| JOR-106 | projects/jormat-evolution/tickets/JOR-106.md | JOR-106 · Subir cobertura de tests en repositories de la API y huecos puntuales del front | closed | closed | improvement | null | — | direct |
| JOR-107 | projects/jormat-evolution/tickets/JOR-107.md | Items sin placeholders: acciones del detalle + imagenes + CSV del listado | closed | closed | improvement | null | JOR-107.screenshots | direct |
| JOR-108 | projects/jormat-evolution/tickets/JOR-108.md | Imagenes de item: galeria read-only en vista + subir solo en crear/editar + navegar a la ficha post-guardado | closed | closed | fix | null | — | direct |
| JOR-109 | projects/jormat-evolution/tickets/JOR-109.md | Items: detalles de UX del detalle/ficha/form (etiqueta junto al selector, bodegas completas, ocultar borrador, nav al editar con cambios, lightbox de imagen) | closed | closed | fix | null | — | direct |
| JOR-110 | projects/jormat-evolution/tickets/JOR-110.md | Dinamizar catálogos de repuestos a DB | closed | closed | implement | — | — | direct |
| JOR-111 | projects/jormat-evolution/tickets/JOR-111.md | JOR-111 · T-VENTAS-BK-lite · Congelar contrato + extender stub de ventas (sin BD) | closed | closed | implement | — | — | direct |
| JOR-112 | projects/jormat-evolution/tickets/JOR-112.md | JOR-112 · T-COMPRAS-BK-lite · Congelar contrato + extender stub de compras (sin BD) | closed | closed | implement | — | — | direct |
| JOR-113 | projects/jormat-evolution/tickets/JOR-113.md | JOR-113 · T-PAGOS-BK-lite · Congelar contrato + extender stub de pagos (sin BD) | closed | closed | implement | — | — | direct |
| JOR-114 | projects/jormat-evolution/tickets/JOR-114.md | JOR-114 · Cerrar el gate de 89% branches del backend (merged) | closed | closed | improvement | — | — | direct |
| JOR-115 | projects/jormat-evolution/tickets/JOR-115.md | JOR-115 · Test scripts del front deterministas (jsdom por defecto, stories aparte) | closed | closed | tactic | — | — | direct |
| JOR-116 | projects/jormat-evolution/tickets/JOR-116.md | JOR-116 · Estabilizar el proyecto storybook/browser de vitest (flaky bajo carga) | open | open | improvement | — | — | direct |
| JOR-117 | projects/jormat-evolution/tickets/JOR-117.md | JOR-117 · Componente % (stepper 0-100) para descuento + fix del "010" | closed | closed | fix | — | — | direct |
| JOR-118 | projects/jormat-evolution/tickets/JOR-118.md | JOR-118 · Ocultar boton "Guardar/Crear borrador" (no presupuestado) + alinear tests | closed | closed | tactic | — | — | direct |
| JOR-119 | projects/jormat-evolution/tickets/JOR-119.md | Alinear el warning de stock del builder de factura al legacy (por bodega + por cantidad + indicador por fila) | closed | closed | fix | null | — | direct |
| JOR-120 | projects/jormat-evolution/tickets/JOR-120.md | Descuento global como % + control en UI (Ventas + Compras) | closed | closed | fix | null | — | direct |
| JOR-121 | projects/jormat-evolution/tickets/JOR-121.md | Precio de linea editable + costo/piso (Ventas + Compras) | closed | closed | fix | null | — | direct |
| JOR-122 | projects/jormat-evolution/tickets/JOR-122.md | Reglas de negocio por item + semaforo del buscador + observacion item (Ventas + Compras) | closed | closed | fix | null | — | direct |
| JOR-123 | projects/jormat-evolution/tickets/JOR-123.md | Re-acople tipo<->moneda (IVA de compra fiel al legacy) + redondeo (Compras) | closed | closed | fix | null | — | direct |
| JOR-124 | projects/jormat-evolution/tickets/JOR-124.md | Transversales de formulario (Ventas + Compras + Pagos) | closed | closed | fix | null | — | direct |
| JOR-125 | projects/jormat-evolution/tickets/JOR-125.md | Builder ventas - pagos y despacho | closed | closed | fix | null | — | direct |
| JOR-126 | projects/jormat-evolution/tickets/JOR-126.md | Builder ventas - cliente | closed | closed | fix | null | — | direct |
| JOR-127 | projects/jormat-evolution/tickets/JOR-127.md | Ventas - crear factura desde origen | closed | closed | fix | null | — | direct |
| JOR-128 | projects/jormat-evolution/tickets/JOR-128.md | Ventas listado + detalle | closed | closed | fix | null | — | direct |
| JOR-129 | projects/jormat-evolution/tickets/JOR-129.md | Compras - acciones + origen + detalle | closed | closed | fix | null | — | direct |
| JOR-130 | projects/jormat-evolution/tickets/JOR-130.md | Compras - recepcion/ingreso a inventario + cardex | closed | closed | fix | null | — | direct |
| JOR-131 | projects/jormat-evolution/tickets/JOR-131.md | Compras - pagos AP + factura desde importacion | closed | closed | fix | null | — | direct |
| JOR-132 | projects/jormat-evolution/tickets/JOR-132.md | Pagos - pago multi-documento (office-payments) | closed | closed | fix | null | — | direct |
| JOR-133 | projects/jormat-evolution/tickets/JOR-133.md | Pagos - fuera de plazo + bloqueo 120d + auto-cancelacion | closed | closed | fix | null | — | direct |
| JOR-134 | projects/jormat-evolution/tickets/JOR-134.md | Pagos - listado/detalle: navegacion, resaltado, reporte, borrado | closed | closed | fix | null | — | direct |
| JOR-135 | projects/jormat-evolution/tickets/JOR-135.md | Cierre: coverage global >= 90% + Storybook completo | closed | closed | fix | null | — | direct |
| JOR-136 | projects/jormat-evolution/tickets/JOR-136.md | Ocultar "guardar borrador" de forma consistente (Ventas + Compras) | closed | closed | fix | null | — | direct |
| JOR-137 | projects/jormat-evolution/tickets/JOR-137.md | Modal read-only de item desde la tabla de lineas (Ventas + Compras) | closed | closed | fix | null | — | direct |
| JOR-138 | projects/jormat-evolution/tickets/JOR-138.md | Documentar el comportamiento migrado de Ventas/Compras/Pagos (olas del 2026-08-08) | closed | closed | improvement | null | — | direct |
| JOR-139 | projects/jormat-evolution/tickets/JOR-139.md | Sembrar las capabilities de office-payments (deuda de JOR-132) | closed | closed | fix | null | — | direct |
| JOR-140 | projects/jormat-evolution/tickets/JOR-140.md | Alinear "Pagos sucursal" (office-payments) al estandar del front + backend NestJS stub | closed | closed | fix | null | — | direct |
| JOR-141 | projects/jormat-evolution/tickets/JOR-141.md | Registro consolidado de deuda tecnica de la ola (docs/front/deuda-tecnica.md) | closed | closed | improvement | null | — | direct |
| JOR-142 | projects/jormat-evolution/tickets/JOR-142.md | Unificar "Documentos a pagar" y "Documentos disponibles" en un Card con pestanas (Crear pago de sucursal) | closed | closed | improvement | null | — | direct |
| JOR-143 | projects/jormat-evolution/tickets/JOR-143.md | Validar pago de sucursal (estados validada/mixta/rechazada) + permiso + contraste del modal | closed | closed | implement | null | — | direct |
| JOR-144 | projects/jormat-evolution/tickets/JOR-144.md | Catalogo consolidado de deuda tecnica con ID + limpieza de resueltos | closed | closed | improvement | null | — | direct |
| JOR-145 | projects/jormat-evolution/tickets/JOR-145.md | JOR-145 · Unificar soft-delete a is_active (dominio/datos): inventario, users, customers y tablas sin estado | closed | closed | improvement | — | — | direct |
| JOR-146 | projects/jormat-evolution/tickets/JOR-146.md | JOR-146 · Soft-delete is_active en RBAC/acceso: roles, user_roles, role_capabilities, capabilities, workspace_memberships | closed | closed | improvement | — | — | direct |
| JOR-147 | projects/jormat-evolution/tickets/JOR-147.md | Migrar vista Camiones (Ficha de Camiones) del legacy a Next + API conectada a tabla trucks | closed | closed | implement | — | — | direct |
| JOR-148 | projects/jormat-evolution/tickets/JOR-148.md | Exponer uuid publico como identificador en las vistas de inventario (dejar de exponer/direccionar por el id serial) | closed | closed | improvement | — | — | direct |
| JOR-149 | projects/jormat-evolution/tickets/JOR-149.md | Unificar identidad de inventario a serial + uuid y cerrar toda la fachada publica por uuid | closed | closed | improvement | null | — | direct |
| JOR-150 | projects/jormat-evolution/tickets/JOR-150.md | Validacion de formato uuid en la frontera de plataforma/auth (cerrar los 500 y el header admin crudo) | closed | closed | improvement | null | — | direct |
| JOR-151 | projects/jormat-evolution/tickets/JOR-151.md | Cerrar los huecos de test que dejo visible la corrida de coverage de JOR-149 | closed | closed | improvement | null | — | direct |
| JOR-152 | projects/jormat-evolution/tickets/JOR-152.md | Quick-wins backend: @MaxLength en filtro de paginacion + seed de catalogos:view | closed | closed | fix | null | — | direct |
| JOR-153 | projects/jormat-evolution/tickets/JOR-153.md | Cerrar deuda de coverage/mutation backend: update-parcial, setFailure mal etiquetado, mutantes users-admin | closed | closed | improvement | null | — | direct |
| JOR-154 | projects/jormat-evolution/tickets/JOR-154.md | Cerrar deuda de coverage/mutation frontend: useIdleTimer, sidebar nav, guardar-borrador | closed | closed | improvement | null | — | direct |
| JOR-155 | projects/jormat-evolution/tickets/JOR-155.md | Alinear fixtures MSW del front (ventas/compras) al itemId uuid | closed | closed | fix | null | — | direct |
| JOR-156 | projects/jormat-evolution/tickets/JOR-156.md | Robustez sobre tablas entregadas: fugas de is_active y validacion de uuid en plataforma/auth | closed | closed | fix | null | — | direct |
| JOR-157 | projects/jormat-evolution/tickets/JOR-157.md | Cluster items cerrable sobre tablas entregadas: costoCompra en listado, columna bloqueoDescuento, join a users | closed | closed | improvement | null | — | direct |
| JOR-158 | projects/jormat-evolution/tickets/JOR-158.md | DT-25: de-duplicar la validacion de RUT cableando shared/ al front | open | open | refactor | null | — | direct |
| JOR-159 | projects/jormat-evolution/tickets/JOR-159.md | Partes sin tabla de DT-04 y DT-03: declarar campos del DTO de factura + propagar campos de item con columna | closed | closed | improvement | null | — | direct |
| JOR-160 | projects/jormat-evolution/tickets/JOR-160.md | Revision de salud a fondo de la documentacion (docs internos + KB evergreen jormat_docs + records DKC) | closed | closed | improvement | null | — | direct |
| JOR-161 | projects/jormat-evolution/tickets/JOR-161.md | Higiene de deuda tecnica: barrer marcadores resueltos, dejar docs internos con solo deuda actual, mover historial al KB | closed | closed | improvement | null | — | direct |
 
## Sidecars fuera de matriz
- Ninguno.
 
## Aceptación
- No se descartan tickets por estados legacy.
- Todos los sidecars tienen destino explícito.
- Todos los hashes y relaciones quedan en el manifiesto.
 
