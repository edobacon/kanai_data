---
id: JOR-165-SPEC
project: jormat-evolution
ticket: JOR-165
status: draft
---

# JOR-165 Paginacion server-side real y filtros server-side en los listados de items del catalogo

## Resumen ejecutivo

Se hace: fix base de 'Pagination' (type="button"), wiring aditivo de filtros en 'applyFilters' (numero, descripcion, referencias, oferta, proveedores), ORDER BY determinista con desempate por PK en la query paginada, endpoint dedicado POST /items/by-ids con ids en el body, y migracion de ItemsPickerTable, CrearCatalogoView y GenerarDesdeCatalogoView al modelo server-side. NO se hace: migraciones ni tablas nuevas, no se cablea un filtro 'ids' en el GET, no se eliminan 'useItemsCatalog'/'useItemsCatalogCapped' (solo se marcan @deprecated al final), no se tocan ItemSearchPanel ni ItemsListView (ya server-side, solo no regresion), y no se altera el payload de guardado del catalogo. Se sabe que funciona por criterios observables: paginar en el builder no dispara el toast 'Agrega al menos un item al catalogo'; GET /items con oferta=true devuelve solo items con offer_is=1 y un 'total' coherente; recorrer todas las paginas con limit=10 no repite ni omite filas; POST /items/by-ids con 100 uuids responde en 1 request y con ids vacio devuelve data [] y total 0; el builder en edicion hidrata por ids en un unico POST. Tamano estimado: 3 sesiones (backend, unidad atomica PickerTable+CrearCatalogo, cierre GenerarDesde+deprecacion), reusando el spec previo JOR-164 sin redisenarlo.

## Requirements

#### REQ-01 `inferred`
> Fuente: frontend/src/components/ui/pagination/pagination.tsx (consumidor confirmado: frontend/src/components/compras/list/FacturasProveedorTable/FacturasProveedorTable.tsx:60)
> Necesidad: build
Los 3 '<Button>' de 'Pagination' fijan type="button", de modo que un control de paginacion dentro de un '<form>' nunca dispara submit; se preserva el contrato de props y el comportamiento de sus consumidores actuales.

#### REQ-02 `inferred`
> Fuente: backend-api/src/items/dto/catalog-items-filter.dto.ts y backend-api/src/items/dto/list-items-query.dto.ts (patron confirmado en backend-api/src/catalogos/dto/list-catalogo-query.dto.ts:8)
> Necesidad: build
El DTO del listado agrega 'numero?' (substring del serial de display) y 'referencias?' (substring de 'ds_reference'), ambos string opcionales con trim; vacio tras trim se trata como ausente. 'descripcion', 'marca', 'oferta', 'categorias', 'aplicaciones' y 'proveedores' ya existen en el DTO base y no se redeclaran.

#### REQ-03 `inferred`
> Fuente: backend-api/src/items/items.repository.ts:1123 (applyFilters) y items.repository.ts:85-102 (CATEGORIA/APLICACION pivots)
> Necesidad: build
'applyFilters' cablea, en AND con lo existente: 'numero' (substring del serial de display), 'descripcion' (whereILike sobre i.ds_name), 'referencias' (whereExists sobre item_references.ds_reference), 'oferta' (i.offer_is = 1) y 'proveedores' (applyPivotFilter con un PROVEEDOR_PIVOT gemelo de CATEGORIA/APLICACION). No se cablea ningun filtro 'ids'.

#### REQ-04 `inferred`
> Fuente: backend-api/src/items/items.repository.ts:1123 (misma query paginada donde se cablean los filtros)
> Necesidad: build
La query paginada (LIMIT/OFFSET) aplica un ORDER BY determinista: el orden que ya usa el listado mas desempate por la PK 'i.id', de modo que recorrer paginas con joins de referencias o proveedores no repite ni omite filas.

#### REQ-05 `inferred`
> Fuente: backend-api/src/items/items.controller.ts, items.service.ts, items.repository.ts (patron de repositorio confirmado en backend-api/src/catalogos/catalogos.repository.ts:203)
> Necesidad: build
Existe POST /items/by-ids (controller + service + metodo de repositorio) que resuelve items por id con '{ ids: string[] }' en el body JSON, usando whereIn('i.uuid', ids) y reutilizando la proyeccion y el ORDER BY del listado; responde el conjunto completo en un unico request, sin limite de longitud de URL.

#### REQ-06 `inferred`
> Fuente: backend-api/src/items/dto/items-by-ids.dto.ts (nuevo; patron de DTO confirmado en backend-api/src/catalogos/dto/list-catalogo-query.dto.ts:4)
> Necesidad: build
El DTO del body de POST /items/by-ids normaliza el array 'ids' en un unico orden: trim de cada elemento, descarte de vacios y dedupe, y RECIEN DESPUES valida @IsUUID por elemento. Si tras normalizar queda vacio (o 'ids' esta ausente), responde coleccion vacia (data [], total 0), nunca el universo.

#### REQ-07 `inferred`
> Fuente: frontend/src/services/api/inventario/items.ts
> Necesidad: build
La capa de servicios del front extiende 'ItemsListParams'/'listItems' con 'numero', 'descripcion', 'referencias', 'oferta' y 'proveedores' (sin 'ids'), y agrega una funcion aparte de batch-get que hace POST /items/by-ids con { ids } en el body.

#### REQ-08 `inferred`
> Fuente: frontend/src/hooks/useItems.ts
> Necesidad: build
'useItemsByIds(ids)' consume POST /items/by-ids en un unico request con todos los ids en el body (sin lotear por longitud de URL), devuelve los items existentes y no dispara request cuando 'ids' esta vacio.

#### REQ-09 `inferred`
> Fuente: frontend/src/components/items/catalogos/ItemsPickerTable/ItemsPickerTable.tsx (consumidor confirmado: frontend/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.tsx:130)
> Necesidad: build
'ItemsPickerTable' pasa a ser tabla controlada server-side: recibe los items de la pagina vigente, 'total', 'page', 'pageCount', los valores de los 4 filtros por columna y sus callbacks; deja de filtrar y paginar en cliente, y preserva la seleccion acumulada entre paginas.

#### REQ-10 `confirmed`
> Fuente: frontend/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.tsx:21 y :130
> Necesidad: build
'CrearCatalogoView' reemplaza 'useItemsCatalog()' por 'useItems({ page, limit, ...filtros })'; los filtros por columna y los de 'Generar catalogo' (marca, oferta, proveedores) viajan como params al server reseteando page=1 en cada cambio; en edicion hidrata via 'useItemsByIds(existing.items)'; el payload de guardado no cambia.

#### REQ-11 `confirmed`
> Fuente: frontend/src/components/items/catalogos/GenerarDesdeCatalogoView/GenerarDesdeCatalogoView.test.tsx:557 y :650
> Necesidad: build
'GenerarDesdeCatalogoView' reemplaza 'useItemsCatalogCapped' por 'useItemsByIds(catalogo.items)' y filtra client-side sobre ese subconjunto acotado usando 'filterCatalogItems'/'catalogFilters.ts'; se elimina la logica y el aviso de truncado.

#### REQ-12 `confirmed`
> Fuente: frontend/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.tsx:21
> Necesidad: build
'useItemsCatalog' y 'useItemsCatalogCapped' se marcan @deprecated SOLO despues de migrar todos sus consumidores (CrearCatalogoView y GenerarDesdeCatalogoView); no se eliminan ni se cambia su comportamiento.

#### REQ-13 `confirmed`
> Fuente: frontend/src/components/items/list/ItemsListView/ItemsListView.tsx:36 (uso actual de fetchAllPages a evitar en las vistas migradas)
> Necesidad: build
Invariante de dimensionamiento: ninguna vista migrada carga el universo de items; toda lectura queda acotada por page/limit (limit menor o igual a 100) o por el batch-get de ids, y 'total' lo provee el server (no se deriva de la longitud del array local).

#### REQ-14 `confirmed`
> Fuente: frontend/src/components/items/list/ItemsListView/ItemsListView.tsx:36
> Necesidad: build
'ItemSearchPanel' (builder de facturas) e 'ItemsListView' (inventario) no se modifican: solo se verifica que heredan el fix de 'Pagination' y que no regresionan.

## Tasks

#### S1.T1 — DTOs backend. Archivos: backend-api/src/items/dto/list-items-query.dto.ts (agregar 'numero?' y 'referencias?' con trim, vacio tras trim = ausente) y backend-api/src/items/dto/items-by-ids.dto.ts (nuevo: array 'ids' con normalizacion trim + descarte de vacios + dedupe ANTES de @IsUUID por elemento). No se redeclaran descripcion/oferta/proveedores: ya viven en catalog-items-filter.dto.ts. Validacion: specs unitarias de ambos DTOs (validate + transform), sin migraciones.
Contrato: rollback: git revert de los 2 archivos DTO (cambio aditivo, sin migraciones ni tablas): el listado vuelve a ignorar numero/referencias y se elimina el DTO de by-ids.. Status: pending

#### S1.T2 — Wiring de filtros y orden determinista en backend-api/src/items/items.repository.ts:1123 (applyFilters): cablear 'numero' (substring del serial de display), 'descripcion' (whereILike i.ds_name), 'referencias' (whereExists sobre item_references.ds_reference), 'oferta' (i.offer_is = 1) y 'proveedores' (applyPivotFilter con PROVEEDOR_PIVOT nuevo, gemelo de los pivots de items.repository.ts:85-102), todos en AND. En la MISMA task, agregar el desempate por 'i.id' al ORDER BY de la query paginada (restriccion de secuencia: el orden determinista viaja con los joins). NO cablear filtro 'ids'. Validacion: specs de repository por cada filtro y test de recorrido de paginas sin duplicados.
Contrato: rollback: git revert de items.repository.ts (quitar el bloque de filtros nuevos, el PROVEEDOR_PIVOT y el desempate por i.id): applyFilters vuelve a cablear solo search/marca/priority/categorias/aplicaciones.. Status: pending

#### S1.T3 — Endpoint batch-get: POST /items/by-ids en backend-api/src/items/items.controller.ts (body ItemsByIdsDto), items.service.ts (delegacion + coleccion vacia si ids normalizados queda vacio) y items.repository.ts (metodo findByIds con whereIn('i.uuid', ids) reutilizando la proyeccion y el ORDER BY del listado). Documentar en Swagger. Validacion: spec de service (ids vacio no consulta la DB y devuelve { data: [], total: 0 }) y spec de repository (proyeccion identica al listado).
Contrato: rollback: git revert del handler, el metodo de service y findByIds: el modulo items queda sin POST /items/by-ids y el GET /items intacto (nunca dependio de este endpoint).. Status: pending

#### S1.T4 — Tests y regresion backend: specs de DTOs, repository y service por cada filtro nuevo y por el batch-get, mas backend-api/test/e2e/items-list.e2e-spec.ts con aserciones concretas de 'total' y 'data' (oferta=true, referencias, proveedores, combinacion AND, recorrido completo de paginas con limit=10 sin duplicados ni faltantes, POST by-ids con 100 uuids, ids vacio = data [] / total 0, elemento no-uuid = 400). Incluir los casos regression que fijan el comportamiento actual de search/marca/priority/categorias/aplicaciones y del orden de la pagina 1.
Contrato: rollback: git revert de los archivos de test agregados o modificados; no afecta codigo de produccion.. Status: pending

#### S2.T1 — Fix base de paginacion en frontend/src/components/ui/pagination/pagination.tsx: agregar type="button" a los 3 '<Button>'. Sin cambios de props ni de estilos. Task padre: se completa cuando terminan sus subtasks. Validacion global: los 3 botones exponen type="button" en el DOM y dentro de un '<form onSubmit={spy}>' ningun click dispara spy.
Contrato: rollback: git revert del unico archivo (cambio de 3 atributos); los consumidores vuelven al comportamiento previo.. Status: pending
Subtasks: 2 (ejecutar hojas; el padre espera a todas)

#### S2.T1.1 — Agregar type="button" a los 3 '<Button>' de pagination.tsx (anterior, siguiente y numero de pagina), sin tocar props, handlers ni clases de estilo. Validacion: el DOM renderizado expone type="button" en los 3 controles.
Contrato: rollback: git revert de los 3 atributos en pagination.tsx; el componente vuelve al type implicito submit.. Status: pending

#### S2.T1.2 — Auditar por busqueda los consumidores actuales de 'Pagination' (FacturasProveedorTable.tsx:60, ItemSearchPanel, ItemsListView, CrearCatalogoView) y confirmar que ninguno depende del submit implicito ni pasa un 'type' propio que el fix pudiera pisar. Validacion: lista de consumidores revisados y confirmacion de que ninguno declara type en el uso del componente.
Contrato: rollback: No aplica: la subtask no modifica codigo, solo produce el reporte de consumidores.. Status: pending

#### S2.T2 — Capa de datos del front. Archivos: frontend/src/services/api/inventario/items.ts (extender ItemsListParams/listItems con numero, descripcion, referencias, oferta, proveedores; NO agregar 'ids'; agregar funcion aparte de batch-get que hace POST /items/by-ids con { ids } en el body) y frontend/src/hooks/useItems.ts (useItemsByIds(ids): 1 unico request con todos los ids, 0 requests si ids vacio). Task padre: se completa cuando terminan sus subtasks. Validacion global: params serializados correctamente, POST con body y conteo de llamadas del hook.
Contrato: rollback: git revert de items.ts y useItems.ts: los params nuevos y useItemsByIds desaparecen; useItems y useItemsCatalog siguen intactos porque el cambio es aditivo.. Status: pending
Subtasks: 4 (ejecutar hojas; el padre espera a todas)

#### S2.T2.1 — Extender el tipo 'ItemsListParams' en frontend/src/services/api/inventario/items.ts con numero?, descripcion?, referencias?, oferta? y proveedores?, respetando los tipos del DTO backend (string, boolean, string[]). NO agregar 'ids' al tipo. Validacion: compilacion TS de los consumidores existentes sin cambios y ausencia de 'ids' en el tipo.
Contrato: rollback: git revert de la extension del tipo; ItemsListParams vuelve a sus campos previos.. Status: pending

#### S2.T2.2 — Cablear la serializacion de los 5 params nuevos en 'listItems', omitiendo undefined y string vacio, y serializando 'proveedores' con el mismo formato de array que ya usan categorias/aplicaciones. Validacion: listItems con los 7 params emite un GET cuyo query string los contiene con esos valores; con numero undefined la URL no incluye 'numero'.
Contrato: rollback: git revert del bloque de serializacion; listItems vuelve a emitir solo los params preexistentes.. Status: pending

#### S2.T2.3 — Agregar en items.ts la funcion de batch-get (POST '/items/by-ids' con method POST, content-type JSON y body { ids }), separada de listItems y sin ids en la URL, reutilizando el cliente HTTP y el tipo de respuesta { data, total } del listado. Validacion: la funcion emite 1 POST con el body exacto { ids: [...] } y tipa la respuesta igual que el listado.
Contrato: rollback: git revert de la funcion nueva; el modulo de servicios queda sin batch-get y listItems intacto.. Status: pending

#### S2.T2.4 — Agregar 'useItemsByIds(ids)' en frontend/src/hooks/useItems.ts sobre la funcion de batch-get: query key que incluye los ids (cambio de ids dispara refetch), request unico sin loteo, y guard que evita el request cuando ids esta vacio devolviendo coleccion vacia (no undefined). No tocar la firma ni el retorno de 'useItems'. Validacion: 1 llamada con 100 ids, 0 llamadas con [], data expuesta como coleccion vacia.
Contrato: rollback: git revert del hook nuevo; useItems y useItemsCatalog quedan como estaban (cambio aditivo).. Status: pending

#### S2.T3 — UNIDAD ATOMICA (no puede cruzar frontera de sesion): convertir ItemsPickerTable a tabla controlada server-side y migrar CrearCatalogoView (frontend/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.tsx:21 y :130) en el mismo cierre. Task padre: no se ejecuta directamente, se completa cuando terminan sus subtasks. Validacion global: el builder pagina, filtra y guarda contra el server sin cargar el universo.
Contrato: rollback: git revert conjunto de ItemsPickerTable.tsx y CrearCatalogoView.tsx en un unico commit (ambos vuelven al contrato client-side con useItemsCatalog); nunca revertir uno solo, deja el builder roto.. Status: pending
Subtasks: 6 (ejecutar hojas; el padre espera a todas)

#### S2.T3.1 — Definir el contrato server-side de props de ItemsPickerTable (items de la pagina vigente, total, page, pageCount, valores de los 4 filtros por columna y callbacks onPageChange/onFilterChange) y eliminar el filtrado y el paginado en cliente. Validacion: con items=[i1,i2,i3] y total=57 renderiza 3 filas y muestra 57.
Contrato: rollback: git revert de ItemsPickerTable.tsx a la version client-side (props previas de lista completa).. Status: pending

#### S2.T3.2 — Preservar la seleccion acumulada entre paginas en ItemsPickerTable manteniendo el estado por id (no por indice de fila ni por posicion en el array recibido). Validacion: seleccionar en page 1, cambiar a page 2, volver, y verificar que la seleccion previa sigue marcada y el callback emitio el set completo.
Contrato: rollback: git revert del bloque de estado de seleccion, volviendo al manejo previo basado en la lista completa.. Status: pending

#### S2.T3.3 — Conservar los 4 filtros por columna de ItemsPickerTable como controlados: reciben valor del padre y emiten onFilterChange sin filtrar localmente. Validacion: escribir en el filtro de descripcion invoca el callback con el valor y la tabla sigue mostrando los items recibidos por props.
Contrato: rollback: git revert de los controles de filtro a su version no controlada con filtrado local.. Status: pending

#### S2.T3.4 — CrearCatalogoView: reemplazar useItemsCatalog() por useItems({ page, limit, ...filtros }) y cablear onPageChange/onFilterChange del picker, reseteando page=1 en cada cambio de filtro. Validacion: escribir un filtro estando en page 3 dispara useItems con page=1 y el filtro nuevo.
Contrato: rollback: git revert de CrearCatalogoView.tsx al uso de useItemsCatalog (junto con el revert del picker, ver rollback de la task padre).. Status: pending

#### S2.T3.5 — CrearCatalogoView: mapear los criterios de 'Generar catalogo' (marca, oferta, proveedores) a params server en lugar de filtrado client. Validacion: aplicar marca=M1, oferta=true, proveedores=[p1] dispara useItems con esos 3 params y page=1.
Contrato: rollback: git revert del mapeo, restaurando el filtrado client-side de esos 3 criterios.. Status: pending

#### S2.T3.6 — CrearCatalogoView en modo edicion: hidratar la seleccion con useItemsByIds(existing.items) en un unico POST, sin alterar el payload de guardado. Validacion: con 40 ids preexistentes se emite 1 sola llamada de batch-get, las 40 filas quedan preseleccionadas y el objeto guardado es identico al previo.
Contrato: rollback: git revert del bloque de hidratacion, volviendo a resolver los items desde la carga masiva previa.. Status: pending

#### S2.T4 — Tests de la sesion: reescribir al modelo server-side las suites de ItemsPickerTable y de CrearCatalogoView (frontend/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.test.tsx:241), incluyendo los casos regression que fijan el comportamiento actual, agregar los tests de Pagination y de la capa de datos, y verificar la no regresion de ItemSearchPanel e ItemsListView sin tocar sus archivos. Task padre: se completa cuando terminan sus subtasks.
Contrato: rollback: git revert de los archivos de test tocados; no afecta codigo de produccion. No se modifican tests de otros modulos sin aprobacion.. Status: pending
Subtasks: 7 (ejecutar hojas; el padre espera a todas)

#### S2.T4.1 — Tests de 'Pagination': assert de que los 3 botones exponen type="button" en el DOM renderizado, y render dentro de '<form onSubmit={spy}>' verificando que anterior, siguiente y numero de pagina invocan onPageChange con la pagina esperada y spy queda en 0 llamadas.
Contrato: rollback: git revert del archivo de test de pagination; no afecta codigo de produccion.. Status: pending

#### S2.T4.2 — Tests de la capa de datos del front: serializacion de los 7 params de listItems (y omision de undefined/vacio), method/headers/body del POST /items/by-ids sin ids en la URL, y conteo de llamadas de useItemsByIds (1 con 100 ids, 0 con []). Incluir el regression de que 'ids' no es un param aceptado por listItems.
Contrato: rollback: git revert de los tests de items.ts y useItems.ts; no afecta codigo de produccion.. Status: pending

#### S2.T4.3 — Reescribir la suite de ItemsPickerTable al modelo controlado: 3 filas con items de props y total 57 visible, filtro por columna que invoca el callback sin filtrar localmente, total=0 con items=[] renderizando el estado vacio con pageCount 1, y el regression de que los 4 filtros conservan labels y placeholders previos.
Contrato: rollback: git revert del archivo de test de ItemsPickerTable; no afecta codigo de produccion.. Status: pending

#### S2.T4.4 — Test de seleccion acumulada del picker: marcar i1 e i2 en page 1, cambiar a page 2 con un array de items distinto, marcar i7, volver a page 1 y verificar que i1 e i2 siguen marcados y que el callback de seleccion emitio el set [i1,i2,i7].
Contrato: rollback: git revert del bloque de tests de seleccion; no afecta codigo de produccion.. Status: pending

#### S2.T4.5 — Reescribir CrearCatalogoView.test.tsx (hoy en :241) al modelo server-side: el regression del toast 'Agrega al menos un item al catalogo' al paginar (0 llamadas a handleSave y 0 toasts), reset a page=1 al escribir un filtro estando en page 3, y los params de 'Generar catalogo' (marca=M1, oferta=true, proveedores=[p1]) con page=1.
Contrato: rollback: git revert de CrearCatalogoView.test.tsx a su version client-side; no afecta codigo de produccion.. Status: pending

#### S2.T4.6 — Tests de hidratacion e invariante de dimensionamiento en CrearCatalogoView: modo edicion con 40 ids emite 1 unico POST /items/by-ids con las 40 filas preseleccionadas, payload de guardado identico al previo (mismos campos, mismos ids, mismo orden) y assert de limit menor o igual a 100 sobre los params de todas las llamadas capturadas.
Contrato: rollback: git revert del bloque de tests de hidratacion y dimensionamiento; no afecta codigo de produccion.. Status: pending

#### S2.T4.7 — Verificar la no regresion de ItemSearchPanel e ItemsListView SIN modificar sus archivos fuente ni sus tests: correr sus suites existentes, confirmar 1 request por cambio de pagina en ItemsListView y que paginar en ItemSearchPanel no dispara el submit del formulario ni pierde el termino de busqueda vigente.
Contrato: rollback: No aplica: la subtask no modifica archivos, solo ejecuta suites existentes y reporta.. Status: pending

#### S3.T1 — Migrar GenerarDesdeCatalogoView: reemplazar useItemsCatalogCapped por useItemsByIds(catalogo.items), mantener el filtrado client-side sobre ese subconjunto acotado via filterCatalogItems/catalogFilters.ts (se conservan), y eliminar la logica y el aviso de truncado. Validacion: 1 request de batch-get con los ids del catalogo, filtrado funcionando sin requests adicionales y ausencia del aviso.
Contrato: rollback: git revert de GenerarDesdeCatalogoView.tsx al uso de useItemsCatalogCapped con su logica de truncado (el hook nunca se elimina, por lo que el revert es directo).. Status: pending

#### S3.T2 — Cierre de deprecacion: verificar por busqueda que useItemsCatalog y useItemsCatalogCapped ya no tienen consumidores fuera de sus propios archivos y tests, y recien entonces agregar JSDoc @deprecated apuntando a useItems/useItemsByIds. No se eliminan ni se cambia su implementacion.
Contrato: rollback: git revert del JSDoc (cambio de comentarios, sin efecto en runtime).. Status: pending

#### S3.T3 — Tests y regresion de cierre: reescribir frontend/src/components/items/catalogos/GenerarDesdeCatalogoView/GenerarDesdeCatalogoView.test.tsx (hoy mockea useItemsCatalog y fetchAllPages en :500, :557, :633 y :931) al modelo de batch-get; agregar los casos regression de ausencia del aviso de truncado y de resultado de generacion identico. Auditoria del invariante: 0 referencias a fetchAllPages en el arbol de las vistas migradas y limit menor o igual a 100 en toda llamada. Correr la suite completa de front y backend y reportar suites, totales y clasificacion de fallos (introducido vs preexistente). Verificacion manual: Swagger GET /items con numero/descripcion/referencias/oferta=true/proveedores y POST /items/by-ids, mas el recorrido del builder en el front.
Contrato: rollback: git revert de los archivos de test tocados; la verificacion manual no deja cambios en el repo.. Status: pending

## Verificacion runtime

1. **Qué:** Verificar en runtime: Los 3 '<Button>' de 'Pagination' fijan type="button", de modo que un control de paginacion dentro de un '<form>' nunca dispara submit; se preserva el contrato de props y el comportamiento de sus consumidores actuales.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: La query paginada (LIMIT/OFFSET) aplica un ORDER BY determinista: el orden que ya usa el listado mas desempate por la PK 'i.id', de modo que recorrer paginas con joins de referencias o proveedores no repite ni omite filas.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
3. **Qué:** Verificar en runtime: 'ItemsPickerTable' pasa a ser tabla controlada server-side: recibe los items de la pagina vigente, 'total', 'page', 'pageCount', los valores de los 4 filtros por columna y sus callbacks; deja de filtrar y paginar en cliente, y preserva la seleccion acumulada entre paginas.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
4. **Qué:** Verificar en runtime: 'CrearCatalogoView' reemplaza 'useItemsCatalog()' por 'useItems({ page, limit, ...filtros })'; los filtros por columna y los de 'Generar catalogo' (marca, oferta, proveedores) viajan como params al server reseteando page=1 en cada cambio; en edicion hidrata via 'useItemsByIds(e
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
5. **Qué:** Verificar en runtime: 'GenerarDesdeCatalogoView' reemplaza 'useItemsCatalogCapped' por 'useItemsByIds(catalogo.items)' y filtra client-side sobre ese subconjunto acotado usando 'filterCatalogItems'/'catalogFilters.ts'; se elimina la logica y el aviso de truncado.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
6. **Qué:** Verificar en runtime: 'useItemsCatalog' y 'useItemsCatalogCapped' se marcan @deprecated SOLO despues de migrar todos sus consumidores (CrearCatalogoView y GenerarDesdeCatalogoView); no se eliminan ni se cambia su comportamiento.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
7. **Qué:** Verificar en runtime: Invariante de dimensionamiento: ninguna vista migrada carga el universo de items; toda lectura queda acotada por page/limit (limit menor o igual a 100) o por el batch-get de ids, y 'total' lo provee el server (no se deriva de la longitud del array local).
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
8. **Qué:** Verificar en runtime: 'ItemSearchPanel' (builder de facturas) e 'ItemsListView' (inventario) no se modifican: solo se verifica que heredan el fix de 'Pagination' y que no regresionan.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
