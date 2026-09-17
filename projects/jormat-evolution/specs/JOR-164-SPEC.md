---
id: JOR-164-SPEC
project: jormat-evolution
ticket: JOR-164
status: draft
---

# JOR-164 Paginacion server-side y filtros server-side en los listados de items del catalogo

## Resumen ejecutivo

Se lleva el picker de items del builder de catalogo a paginacion y filtrado server-side reales: se cablean en el backend los filtros numero, descripcion, referencias, oferta, proveedores e ids (CSV de uuids) sobre el listado existente de items, se fija un ORDER BY determinista para que LIMIT/OFFSET con joins no repita ni omita filas, y en el front se migran ItemsPickerTable, CrearCatalogoView y GenerarDesdeCatalogoView a ese modelo, mas el fix base de type="button" en Pagination que hoy provoca el submit accidental. NO se crean migraciones, tablas, endpoints ni controllers nuevos; NO se toca ItemsListView ni ItemSearchPanel (ya server-side, solo se verifican); NO se borra filterCatalogItems/catalogFilters.ts; NO se tocan tests ajenos a los 3 componentes migrados. Se sabe que funciona por criterios observables: paginar dentro del form no dispara el toast "Agrega al menos un item al catalogo", GET /items con cada filtro nuevo devuelve total/data filtrados (verificable en Swagger :4001/docs), recorrer todas las paginas con filtros activos devuelve uuids unicos sin faltantes, editar un catalogo de 150 ids hidrata los 150 en 2 requests, y abrir el builder con 13.575 items sembrados dispara 1 sola request con limit<=100 en vez de fetchAllPages. Tamano estimado: 3 sesiones (backend de wiring+tests, front base de service/hook/Generar, y una sesion atomica T3 para picker+builder), sin riesgo de datos porque todo el backend es aditivo y reversible por revert de archivo.

## Requirements

### REQ-01 `confirmed`
> Fuente: front/jormat-front/src/components/ui/pagination/pagination.tsx

Los tres <Button> de Pagination deben declarar type="button" para que un control de paginacion nunca dispare el submit del <form> que lo contiene, preservando su API publica (page/pageCount/onPageChange).

### REQ-02 `confirmed`
> Fuente: backend/jormat-api/src/items/dto/catalog-items-filter.dto.ts

El DTO base de filtros de items debe aceptar numero? (substring del serial de display) y referencias? (substring de ds_reference) como strings opcionales, junto a los ya declarados descripcion, marca, oferta, categorias, aplicaciones y proveedores.

### REQ-04 `confirmed`
> Fuente: backend/jormat-api/src/items/items.repository.ts:1123

applyFilters debe cablear numero (substring del serial de display), descripcion (whereILike sobre i.ds_name), referencias (whereExists sobre item_references.ds_reference) y oferta (i.offer_is=1), combinandose en AND con los filtros ya existentes.

### REQ-05 `confirmed`
> Fuente: backend/jormat-api/src/items/items.repository.ts:85-102

applyFilters debe soportar el filtro proveedores mediante un PROVEEDOR_PIVOT nuevo, gemelo de los pivotes CATEGORIA y APLICACION, reutilizando applyPivotFilter sin cambiar su firma.

### REQ-07 `inferred`
> Fuente: backend/jormat-api/src/items/items.repository.ts:1123

La query paginada (LIMIT/OFFSET) con los joins/whereExists de referencias y proveedores debe usar un ORDER BY determinista con desempate por la PK (i.id), reutilizando el orden ya aplicado hoy por el listado, para no repetir ni omitir filas entre paginas.

### REQ-08 `confirmed`
> Fuente: front/jormat-front/src/services/api/inventario/items.ts (adenda 2, punto 3)

ItemsListParams/listItems del front deben aceptar y serializar numero, descripcion, referencias, oferta y proveedores, sin alterar la serializacion de los params existentes; ids NO forma parte de los params del listado. La resolucion por IDs se expone como una funcion aparte del cliente de API que hace POST /items/by-ids enviando { ids } en el body.

### REQ-09 `inferred`
> Fuente: front/jormat-front/src/components/items/catalogos/ItemsPickerTable/ItemsPickerTable.tsx

ItemsPickerTable debe convertirse en tabla controlada server-side: recibe los items de la pagina vigente, total, page, pageCount, filtros y callbacks; deja de filtrar y paginar en cliente; preserva la seleccion acumulada fuera de la pagina vigente y conserva la UX de 4 filtros por columna (numero/descripcion/referencias/marca).

### REQ-10 `confirmed`
> Fuente: front/jormat-front/src/hooks/useItems.ts (adenda 2, punto 3)

useItemsByIds(ids) debe resolver los items consumiendo POST /items/by-ids con los ids en el body, en un unico request para todo el conjunto (sin lotear por longitud de URL y sin la restriccion de limit >= 100), devolviendo todos los items existentes correspondientes a esos ids.

### REQ-11 `confirmed`
> Fuente: front/jormat-front/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.tsx

CrearCatalogoView debe reemplazar useItemsCatalog() por useItems({page, limit, ...filtros}) con filtros por columna y "Generar catalogo" (marca/oferta/proveedores) enviados como params al server, e hidratar la edicion con useItemsByIds(existing.items), sin cambiar el payload de guardado ni el contrato con sus rutas.

### REQ-12 `confirmed`
> Fuente: front/jormat-front/src/components/items/catalogos/GenerarDesdeCatalogoView/GenerarDesdeCatalogoView.tsx

GenerarDesdeCatalogoView debe reemplazar useItemsCatalogCapped por useItemsByIds(catalogo.items), filtrar client-side solo sobre ese subconjunto acotado reutilizando filterCatalogItems/catalogFilters.ts, y eliminar la logica y el aviso de truncado.

### REQ-13 `confirmed`
> Fuente: front/jormat-front/src/hooks/useItems.ts

useItemsCatalog y useItemsCatalogCapped se marcan @deprecated solo despues de migrados TODOS sus consumidores productivos (CrearCatalogoView y GenerarDesdeCatalogoView); se marcan, no se eliminan.

### REQ-14 `inferred`
> Fuente: front/jormat-front/src/hooks/useItems.ts

Requisito no funcional de dimensionamiento: ninguna vista migrada debe cargar el universo de items; toda lectura es acotada por page/limit (limit <= 100) o por lotes de 100 ids, con total provisto por el server.

### REQ-15 `confirmed`
> Fuente: backend/jormat-api/src/items/items.controller.ts + backend/jormat-api/src/items/items.service.ts (adenda 2, punto 1)

Debe existir un endpoint POST /items/by-ids que reciba los ids en el body JSON ({ ids: string[] }) y devuelva los items correspondientes con el mismo shape/proyeccion que el listado GET /items, ignorando silenciosamente los uuids inexistentes (sin 404 ni error parcial). La resolucion por ID deja de exponerse como filtro del GET del listado.

### REQ-16 `confirmed`
> Fuente: backend/jormat-api/src/items/dto/items-by-ids.dto.ts (adenda 2, punto 2; regla heredada de adenda 1, punto 3)

El DTO del body de POST /items/by-ids debe aplicar una unica regla de normalizacion sobre el array ids: primero trim de cada elemento, descarte de elementos vacios y dedupe, y RECIEN DESPUES @IsUUID sobre cada elemento restante; cualquier elemento restante que no sea uuid produce 400.

### REQ-17 `inferred`
> Fuente: backend/jormat-api/src/items/items.service.ts (adenda 2, punto 2, contrastado con REQ-14: ninguna lectura carga el universo)

Si tras normalizar el array ids del body queda vacio (o ids viene ausente/vacio), POST /items/by-ids debe responder una coleccion vacia (data [] y total 0) y nunca el universo de items: la ausencia de ids no se comporta como 'sin filtro'.

### REQ-18 `confirmed`
> Fuente: backend/jormat-api/src/items/items.repository.ts:1123 (adenda 2, punto 1)

El repositorio de items debe exponer un metodo de resolucion por uuids (whereIn i.uuid) que reutilice la proyeccion y el ORDER BY determinista del listado (desempate por i.id), consumido solo por el flujo POST /items/by-ids; applyFilters no debe cablear un filtro ids.
## Tasks

#### S1.T1 — DTO: agregar numero? y referencias? (string opcional, mismo estilo de validacion/transform que los campos ya declarados) en backend/jormat-api/src/items/dto/catalog-items-filter.dto.ts, y agregar ids? (CSV de uuids) en backend/jormat-api/src/items/dto/list-items-query.dto.ts con la regla unica: transform que hace split por coma + trim + descarte de vacios, y RECIEN DESPUES @IsUUID por elemento (ids='' o solo vacios => undefined).
Contrato: rollback: git checkout de los dos archivos DTO. Cambio puramente aditivo de campos opcionales: sin migraciones ni cambio de contrato, revertir deja GET /items exactamente como hoy.. Status: pending

#### S1.T2 — applyFilters (backend/jormat-api/src/items/items.repository.ts:1123): cablear numero (substring del serial de display), descripcion (whereILike i.ds_name), referencias (whereExists sobre item_references.ds_reference), oferta (i.offer_is=1) e ids (whereIn i.uuid), todos combinados en AND con search/marca/priority/categorias/aplicaciones ya existentes.
Contrato: rollback: git checkout de items.repository.ts. Los filtros nuevos solo se aplican cuando el param llega definido, asi que revertir restaura el comportamiento previo sin efecto sobre datos.. Status: pending

#### S1.T3 — Agregar PROVEEDOR_PIVOT en items.repository.ts:85-102 como gemelo de CATEGORIA/APLICACION y cablear el filtro proveedores via applyPivotFilter, sin modificar la firma ni el cuerpo de applyPivotFilter.
Contrato: rollback: git checkout de items.repository.ts (revierte la constante del pivote y su uso). applyPivotFilter no se toca, por lo que categorias/aplicaciones no corren riesgo.. Status: pending

#### S1.T4 — Fijar ORDER BY determinista en la query paginada de items: reutilizar el orden que ya aplica hoy el listado y agregar desempate por la PK (i.id), verificando que el whereExists de referencias y el pivote de proveedores no dupliquen filas ni inflen total.
Contrato: rollback: git checkout de items.repository.ts. El cambio es solo un criterio de desempate agregado al ORDER BY existente; revertir vuelve al orden actual sin afectar filtros.. Status: pending

#### S1.T5 — Tests backend: list-items-query.dto.spec.ts (normalizacion de ids), specs de repository/service para cada filtro nuevo, y test/e2e/items-list.e2e-spec.ts con aserciones concretas de total/data por filtro, recorrido completo de paginas con filtros activos (uuids unicos, sin faltantes) y regresion de search/marca/priority/categorias/aplicaciones. Verificar ademas en Swagger (:4001/docs) GET /items con numero, descripcion, referencias, oferta=true, proveedores e ids.
Contrato: rollback: git checkout de los archivos de test agregados/modificados; no altera codigo productivo.. Status: pending

#### S2.T1 — Fix base de paginacion: poner type="button" en los 3 <Button> de front/jormat-front/src/components/ui/pagination/pagination.tsx, sin cambiar su API publica. Verificar de paso que ItemSearchPanel (builder de facturas, ya server-side) queda correcto con el fix.
Contrato: rollback: git checkout de pagination.tsx. Cambio de un solo atributo por boton; revertir restaura el comportamiento previo (incluido el bug).. Status: pending

#### S2.T2 — services/api/inventario/items.ts: extender ItemsListParams y listItems con numero, descripcion, referencias, oferta, proveedores e ids (CSV), respetando el formato de serializacion ya usado por categorias/aplicaciones y omitiendo params undefined o vacios.
Contrato: rollback: git checkout de items.ts. Params nuevos opcionales: los consumidores existentes (ItemsListView, ItemSearchPanel) no cambian de comportamiento al revertir.. Status: pending

#### S2.T3 — hooks/useItems.ts: implementar useItemsByIds(ids) que dedupe, lotea de a 100 y envia limit>=100 por request (nunca menos que el tamano del lote), concatena resultados y expone loading/error. No tocar useItems ni marcar nada como deprecated todavia.
Contrato: rollback: git checkout de useItems.ts (elimina solo el hook nuevo). Ningun consumidor previo depende de el en este punto.. Status: pending

#### S2.T4 — Migrar GenerarDesdeCatalogoView a useItemsByIds(catalogo.items): reemplazar useItemsCatalogCapped, conservar el filtrado client-side sobre el subconjunto acotado via filterCatalogItems/catalogFilters.ts y eliminar la logica y el aviso de truncado.
Contrato: rollback: git checkout de GenerarDesdeCatalogoView.tsx (vuelve a useItemsCatalogCapped, que sigue existiendo intacto). filterCatalogItems no se toca.. Status: pending

#### S2.T5 — Tests front de esta sesion: (a) Pagination dentro de un <form> con spy de submit + presencia de type="button" en los 3 botones + regresion de FacturasProveedorTable; (b) serializacion de listItems para params nuevos y regresion de los existentes; (c) useItemsByIds con 100/101/250 ids, ids vacios, duplicados y fallo de lote; (d) reescritura del test de GenerarDesdeCatalogoView al modelo por IDs (150 ids => 2 requests, sin aviso de truncado, fetchAllPages 0 veces).
Contrato: rollback: git checkout de los archivos de test tocados; sin impacto en codigo productivo.. Status: pending

#### S2.T6 — Crear el DTO del body de POST /items/by-ids (backend/jormat-api/src/items/dto/items-by-ids.dto.ts): array ids con transform que hace trim, descarta vacios y dedupea, y RECIEN DESPUES valida @IsUUID por elemento; ids vacio tras normalizar queda como array vacio (no como 'sin filtro').
Contrato: rollback: Eliminar el archivo del DTO nuevo; ningun modulo previo lo importa, el resto del items module queda intacto.. Status: pending

#### S2.T7 — Agregar en items.repository.ts el metodo de resolucion por uuids (whereIn i.uuid) reutilizando la proyeccion y el ORDER BY determinista con desempate por i.id del listado, y retirar de applyFilters el cableado del filtro ids (los demas filtros numero/descripcion/referencias/oferta/proveedores se mantienen).
Contrato: rollback: git checkout backend/jormat-api/src/items/items.repository.ts para volver al estado previo del repositorio.. Status: pending

#### S2.T8 — Agregar el endpoint POST /items/by-ids en items.controller.ts + metodo en items.service.ts: consume el DTO del body, delega en el metodo de repositorio por uuids, devuelve el mismo shape/proyeccion que el listado, ignora uuids inexistentes y responde coleccion vacia cuando ids queda vacio. Retirar ids del DTO del listado (list-items-query.dto).
Contrato: rollback: Quitar el handler del controller, el metodo del service y restaurar list-items-query.dto.ts desde git; el GET /items sigue operativo sin cambios.. Status: pending

#### S2.T9 — Tests backend del batch-get por IDs: items-by-ids.dto.spec.ts (trim/vacios/dedupe antes de @IsUUID, 400 con 'no-es-uuid'), spec de repository/service (whereIn i.uuid, inexistentes ignorados, ids vacio -> data vacia y total 0, applyFilters sin clausula ids) y test/e2e/items-by-ids.e2e-spec.ts (POST con 150 uuids en un request, shape identico al del listado). Ajustar el e2e del listado para asertar que GET /items ya no filtra por ids.
Contrato: rollback: Eliminar los archivos de spec nuevos y revertir el ajuste puntual en test/e2e/items-list.e2e-spec.ts.. Status: pending

#### S3.T1 — UNIDAD ATOMICA (no ejecutable directamente): convertir ItemsPickerTable a tabla controlada server-side y migrar en la MISMA sesion a su unico consumidor CrearCatalogoView, de modo que ninguna frontera de sesion quede con el contrato nuevo del picker y el builder aun sobre useItemsCatalog(). Se completa solo cuando todas las subtasks cierran.
Contrato: rollback: git checkout conjunto de ItemsPickerTable.tsx y CrearCatalogoView.tsx (revertir SIEMPRE ambos juntos: revertir uno solo deja el builder roto). Los hooks legacy siguen existiendo, por lo que el revert restaura el builder funcional actual.. Status: pending

#### S3.T1.1 — Definir el contrato de props controladas de ItemsPickerTable (items de la pagina vigente, total, page, pageCount, filters, onPageChange, onFilterChange, selectedIds, onSelectionChange) y tipar la interfaz, sin cambiar todavia el comportamiento interno.
Contrato: rollback: git checkout de ItemsPickerTable.tsx; el componente vuelve a su interfaz actual.. Status: pending

#### S3.T1.2 — Eliminar el filtrado y el paginado internos de ItemsPickerTable: renderizar exactamente las filas recibidas y delegar page/pageCount/total a las props, conservando los 4 inputs de filtro por columna que ahora solo emiten onFilterChange.
Contrato: rollback: git checkout de ItemsPickerTable.tsx (restaura filtrado/paginado client-side).. Status: pending

#### S3.T1.3 — Preservar la seleccion acumulada fuera de la pagina vigente: la seleccion se mantiene por id y sobrevive a cambios de pagina y de filtro, acumulando ids de paginas distintas.
Contrato: rollback: git checkout de ItemsPickerTable.tsx.. Status: pending

#### S3.T1.4 — CrearCatalogoView: reemplazar useItemsCatalog() por useItems({page, limit, ...filtros}) y cablear los callbacks del picker (onPageChange, onFilterChange, seleccion), conservando el payload de guardado como lista de IDs.
Contrato: rollback: git checkout de CrearCatalogoView.tsx junto con ItemsPickerTable.tsx (revert conjunto obligatorio).. Status: pending

#### S3.T1.5 — CrearCatalogoView: mapear los 4 filtros por columna (numero, descripcion, referencias, marca) a params server, reseteando page=1 en cada cambio de filtro.
Contrato: rollback: git checkout de CrearCatalogoView.tsx (revert conjunto con el picker).. Status: pending

#### S3.T1.6 — CrearCatalogoView: enviar marca, oferta y proveedores como params server en el flujo "Generar catalogo" y consumir el resultado del server sin filtrado adicional en cliente.
Contrato: rollback: git checkout de CrearCatalogoView.tsx (revert conjunto con el picker).. Status: pending

#### S3.T1.7 — CrearCatalogoView: hidratar la seleccion en edicion con useItemsByIds(existing.items), garantizando que ids fuera de la pagina 1 y catalogos de mas de 100 ids se muestren completos como seleccionados.
Contrato: rollback: git checkout de CrearCatalogoView.tsx (revert conjunto con el picker).. Status: pending

#### S3.T1.8 — Verificacion manual en el navegador (http://localhost:3001, builder de catalogo): paginar sin que aparezca el toast, filtrar por cada columna, "Generar catalogo" con marca/oferta/proveedores, y editar un catalogo existente comprobando la hidratacion por IDs y que solo se disparan requests acotadas.
Contrato: rollback: No aplica: es verificacion, no modifica archivos. Si detecta fallas, se revierte la unidad atomica completa (picker + builder).. Status: pending

#### S3.T2 — Tras confirmar 0 consumidores productivos de useItemsCatalog y useItemsCatalogCapped (CrearCatalogoView y GenerarDesdeCatalogoView ya migrados), marcar ambos hooks con @deprecated en su JSDoc en front/jormat-front/src/hooks/useItems.ts, sin eliminarlos.
Contrato: rollback: git checkout de useItems.ts (quita solo las anotaciones). Cambio documental: no altera comportamiento en runtime.. Status: pending

#### S3.T2.1 — Verificar con busqueda (grep de useItemsCatalog y useItemsCatalogCapped en front/jormat-front/src) que no quedan imports productivos de ninguno de los dos hooks fuera de useItems.ts y de sus propios tests; si aparece alguno, detener y reportar antes de marcar.
Contrato: rollback: No aplica: es verificacion, no modifica archivos.. Status: pending

#### S3.T2.2 — Agregar la anotacion @deprecated en el JSDoc de useItemsCatalog en front/jormat-front/src/hooks/useItems.ts, indicando useItems({page, limit, ...filtros}) como reemplazo, sin eliminar ni alterar su implementacion.
Contrato: rollback: git checkout de useItems.ts (quita la anotacion). Cambio documental: no altera runtime.. Status: pending

#### S3.T2.3 — Agregar la anotacion @deprecated en el JSDoc de useItemsCatalogCapped en front/jormat-front/src/hooks/useItems.ts, indicando useItemsByIds(ids) como reemplazo, sin eliminar ni alterar su implementacion.
Contrato: rollback: git checkout de useItems.ts (quita la anotacion). Cambio documental: no altera runtime.. Status: pending

#### S3.T2.4 — Correr typecheck y lint del front para confirmar que las anotaciones @deprecated no introducen errores nuevos ni warnings que rompan el build (los avisos de uso deprecado en los propios tests de esos hooks son esperados y no se corrigen).
Contrato: rollback: No aplica: es verificacion. Si el lint falla por la anotacion, se revierte useItems.ts.. Status: pending

#### S3.T3 — Tests de esta sesion: reescribir los tests de ItemsPickerTable y CrearCatalogoView para el modelo server-side (paginacion controlada, filtros como callbacks, seleccion acumulada entre paginas, hidratacion por IDs, estado vacio con total=0), incluyendo la regresion del bug original (paginar dentro del form no dispara el toast "Agrega al menos un item al catalogo" ni handleSave) y la regresion de que guardar con seleccion vacia SI sigue mostrando el toast; verificar 0 imports productivos de los hooks legacy y correr la suite completa del front sin tocar otros tests.
Contrato: rollback: git checkout de los archivos de test tocados; el codigo productivo de la sesion queda intacto.. Status: pending

#### S3.T3.1 — Reescribir el spec de ItemsPickerTable al modelo controlado: render con items de la pagina vigente + total/page/pageCount del server, aserciones de que renderiza exactamente las filas recibidas, que no filtra internamente (filtro con valor 'zzz' no recorta las filas) y que se renderizan los 4 inputs de filtro por columna.
Contrato: rollback: git checkout del spec de ItemsPickerTable; no toca codigo productivo.. Status: pending

#### S3.T3.2 — Agregar al spec de ItemsPickerTable los casos de interaccion: click en "siguiente" invoca onPageChange una sola vez, escribir en el filtro 'referencias' invoca onFilterChange con {referencias:'REF-1'}, y total=0 con items=[] renderiza el estado vacio con los controles de paginacion deshabilitados.
Contrato: rollback: git checkout del spec de ItemsPickerTable.. Status: pending

#### S3.T3.3 — Agregar al spec de ItemsPickerTable los casos de seleccion acumulada entre paginas: seleccionar en page=1, navegar a page=2 y volver deja el item marcado; seleccionar en page=1 y en page=2 reporta 2 ids.
Contrato: rollback: git checkout del spec de ItemsPickerTable.. Status: pending

#### S3.T3.4 — Reescribir el spec de CrearCatalogoView para el modelo server-side: al montar dispara 1 sola request con page=1 y limit<=100 (mock de fetchAllPages invocado 0 veces), cambiar un filtro de columna dispara request con el param correspondiente y page=1, y "Generar catalogo" envia marca/oferta/proveedores como params al server.
Contrato: rollback: git checkout del spec de CrearCatalogoView.. Status: pending

#### S3.T3.5 — Agregar al spec de CrearCatalogoView las regresiones del bug original y de la validacion: click en "siguiente" dentro del form NO muestra el toast "Agrega al menos un item al catalogo" ni invoca handleSave, y guardar con seleccion vacia SI sigue mostrando ese toast.
Contrato: rollback: git checkout del spec de CrearCatalogoView.. Status: pending

#### S3.T3.6 — Agregar al spec de CrearCatalogoView los casos de hidratacion en edicion (ids fuera de la pagina 1 aparecen seleccionados; catalogo de 101 ids hidrata los 101 sin truncado), el shape del payload de guardado y el estado de error cuando la request de items falla dejando el form usable.
Contrato: rollback: git checkout del spec de CrearCatalogoView.. Status: pending

#### S3.T3.7 — Agregar el caso que verifica 0 imports productivos de useItemsCatalog y useItemsCatalogCapped en front/jormat-front/src (fuera de useItems.ts y de sus propios tests), de modo que falle si quedara un consumidor sin migrar.
Contrato: rollback: git checkout del archivo de test agregado.. Status: pending

#### S3.T3.8 — Correr la suite completa del front y reportar suites/totales, clasificando cualquier fallo como introducido o preexistente, sin modificar tests ajenos a ItemsPickerTable, CrearCatalogoView, GenerarDesdeCatalogoView, Pagination, items.ts y useItems.ts.
Contrato: rollback: No aplica: es ejecucion de tests, no modifica archivos.. Status: pending

#### S3.T4 — En front/jormat-front/src/services/api/inventario/items.ts: quitar ids de ItemsListParams/listItems y agregar la funcion de batch-get que hace POST /items/by-ids con body { ids }, tipando la respuesta con el mismo shape del listado.
Contrato: rollback: git checkout front/jormat-front/src/services/api/inventario/items.ts; los consumidores del listado no cambian de firma.. Status: pending

#### S3.T5 — Reimplementar useItemsByIds(ids) en front/jormat-front/src/hooks/useItems.ts sobre el POST /items/by-ids: un unico request con todos los ids en el body, sin loteo de 100 ni limit>=100; array vacio no dispara request.
Contrato: rollback: git checkout front/jormat-front/src/hooks/useItems.ts; useItemsCatalog/useItemsCatalogCapped permanecen disponibles como fallback hasta la migracion de sus consumidores.. Status: pending

#### S3.T6 — Tests front de useItemsByIds y del cliente de API: 1 solo POST con 250 ids en el body, ausencia de query string con ids, array vacio sin request, y serializacion del listado sin el param ids.
Contrato: rollback: Eliminar/revertir los archivos de test tocados de useItems y del cliente de items.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: Los tres <Button> de Pagination deben declarar type="button" para que un control de paginacion nunca dispare el submit del <form> que lo contiene, preservando su API publica (page/pageCount/onPageChange).
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: La query paginada (LIMIT/OFFSET) con los joins/whereExists de referencias y proveedores debe usar un ORDER BY determinista con desempate por la PK (i.id), reutilizando el orden ya aplicado hoy por el listado, para no repetir ni omitir filas entre paginas.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
3. **Qué:** Verificar en runtime: ItemsPickerTable debe convertirse en tabla controlada server-side: recibe los items de la pagina vigente, total, page, pageCount, filtros y callbacks; deja de filtrar y paginar en cliente; preserva la seleccion acumulada fuera de la pagina vigente y conserva la UX de 4 filtros 
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
4. **Qué:** Verificar en runtime: CrearCatalogoView debe reemplazar useItemsCatalog() por useItems({page, limit, ...filtros}) con filtros por columna y "Generar catalogo" (marca/oferta/proveedores) enviados como params al server, e hidratar la edicion con useItemsByIds(existing.items), sin cambiar el payload de
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
5. **Qué:** Verificar en runtime: GenerarDesdeCatalogoView debe reemplazar useItemsCatalogCapped por useItemsByIds(catalogo.items), filtrar client-side solo sobre ese subconjunto acotado reutilizando filterCatalogItems/catalogFilters.ts, y eliminar la logica y el aviso de truncado.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
6. **Qué:** Verificar en runtime: useItemsCatalog y useItemsCatalogCapped se marcan @deprecated solo despues de migrados TODOS sus consumidores productivos (CrearCatalogoView y GenerarDesdeCatalogoView); se marcan, no se eliminan.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
7. **Qué:** Verificar en runtime: Requisito no funcional de dimensionamiento: ninguna vista migrada debe cargar el universo de items; toda lectura es acotada por page/limit (limit <= 100) o por lotes de 100 ids, con total provisto por el server.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-15 (add) `confirmed`: Debe existir un endpoint POST /items/by-ids que reciba los ids en el body JSON ({ ids: string[] }) y devuelva los items correspondientes con
- REQ-16 (add) `confirmed`: El DTO del body de POST /items/by-ids debe aplicar una unica regla de normalizacion sobre el array ids: primero trim de cada elemento, desca
- REQ-17 (add) `inferred`: Si tras normalizar el array ids del body queda vacio (o ids viene ausente/vacio), POST /items/by-ids debe responder una coleccion vacia (dat
- REQ-18 (add) `confirmed`: El repositorio de items debe exponer un metodo de resolucion por uuids (whereIn i.uuid) que reutilice la proyeccion y el ORDER BY determinis
- REQ-08 (edit) `confirmed`: ItemsListParams/listItems del front deben aceptar y serializar numero, descripcion, referencias, oferta y proveedores, sin alterar la serial
- REQ-10 (edit) `confirmed`: useItemsByIds(ids) debe resolver los items consumiendo POST /items/by-ids con los ids en el body, en un unico request para todo el conjunto 

**Tasks agregadas:**

- S2: Crear el DTO del body de POST /items/by-ids (backend/jormat-api/src/items/dto/items-by-ids.dto.ts): array ids con transform que hace trim, descarta vacios y dedupea, y RECIEN DESPUES valida @IsUUID por elemento; ids vacio tras normalizar queda como array vacio (no como 'sin filtro'). (valida: REQ-16, REQ-17; rollback: Eliminar el archivo del DTO nuevo; ningun modulo previo lo importa, el resto del items module queda intacto.)
- S2: Agregar en items.repository.ts el metodo de resolucion por uuids (whereIn i.uuid) reutilizando la proyeccion y el ORDER BY determinista con desempate por i.id del listado, y retirar de applyFilters el cableado del filtro ids (los demas filtros numero/descripcion/referencias/oferta/proveedores se mantienen). (valida: REQ-18; rollback: git checkout backend/jormat-api/src/items/items.repository.ts para volver al estado previo del repositorio.)
- S2: Agregar el endpoint POST /items/by-ids en items.controller.ts + metodo en items.service.ts: consume el DTO del body, delega en el metodo de repositorio por uuids, devuelve el mismo shape/proyeccion que el listado, ignora uuids inexistentes y responde coleccion vacia cuando ids queda vacio. Retirar ids del DTO del listado (list-items-query.dto). (valida: REQ-15, REQ-17, REQ-18; rollback: Quitar el handler del controller, el metodo del service y restaurar list-items-query.dto.ts desde git; el GET /items sigue operativo sin cambios.)
- S2: Tests backend del batch-get por IDs: items-by-ids.dto.spec.ts (trim/vacios/dedupe antes de @IsUUID, 400 con 'no-es-uuid'), spec de repository/service (whereIn i.uuid, inexistentes ignorados, ids vacio -> data vacia y total 0, applyFilters sin clausula ids) y test/e2e/items-by-ids.e2e-spec.ts (POST con 150 uuids en un request, shape identico al del listado). Ajustar el e2e del listado para asertar que GET /items ya no filtra por ids. (valida: REQ-15, REQ-16, REQ-17, REQ-18, test; rollback: Eliminar los archivos de spec nuevos y revertir el ajuste puntual en test/e2e/items-list.e2e-spec.ts.)
- S3: En front/jormat-front/src/services/api/inventario/items.ts: quitar ids de ItemsListParams/listItems y agregar la funcion de batch-get que hace POST /items/by-ids con body { ids }, tipando la respuesta con el mismo shape del listado. (valida: REQ-08, REQ-10; rollback: git checkout front/jormat-front/src/services/api/inventario/items.ts; los consumidores del listado no cambian de firma.)
- S3: Reimplementar useItemsByIds(ids) en front/jormat-front/src/hooks/useItems.ts sobre el POST /items/by-ids: un unico request con todos los ids en el body, sin loteo de 100 ni limit>=100; array vacio no dispara request. (valida: REQ-10; rollback: git checkout front/jormat-front/src/hooks/useItems.ts; useItemsCatalog/useItemsCatalogCapped permanecen disponibles como fallback hasta la migracion de sus consumidores.)
- S3: Tests front de useItemsByIds y del cliente de API: 1 solo POST con 250 ids en el body, ausencia de query string con ids, array vacio sin request, y serializacion del listado sin el param ids. (valida: REQ-08, REQ-10, test; rollback: Eliminar/revertir los archivos de test tocados de useItems y del cliente de items.)

**REQ ops:**

- remove REQ-03
- remove REQ-06

## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T5
- [ ] S2.T6
- [ ] S2.T7
- [ ] S2.T8
- [ ] S2.T9

### Session 3 · T3 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T1.1
- [ ] S3.T1.2
- [ ] S3.T1.3
- [ ] S3.T1.4
- [ ] S3.T1.5
- [ ] S3.T1.6
- [ ] S3.T1.7
- [ ] S3.T1.8
- [ ] S3.T2
- [ ] S3.T2.1
- [ ] S3.T2.2
- [ ] S3.T2.3
- [ ] S3.T2.4
- [ ] S3.T3
- [ ] S3.T3.1
- [ ] S3.T3.2
- [ ] S3.T3.3
- [ ] S3.T3.4
- [ ] S3.T3.5
- [ ] S3.T3.6
- [ ] S3.T3.7
- [ ] S3.T3.8
- [ ] S3.T4
- [ ] S3.T5
- [ ] S3.T6

### Session 4 · T0 · open

