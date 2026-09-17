---
id: JOR-163-SPEC
project: jormat-evolution
ticket: JOR-163
status: approved
---

# Catálogo híbrido: generación, filtrado, vista rápida e impresión del catálogo guardado, con id numérico e imagen real en cards (frontend + backend)

## Requirements

### REQ-01 `confirmed`
> Fuente: request JOR-163 decisión 5 e H3; backend/jormat-api/src/items/dto/item.dto.ts; backend/jormat-api/src/items/items.repository.ts:1012-1036

El DTO de listado de items (`ItemDto` usado por `GET /items`) expone un campo opcional `imagenPrincipal` con la imagen marcada `principal=true` del item (null si no hay ninguna), proyectado en el bloque de select del listado del repositorio mediante un join a imágenes, sin fetch de detalle por item y sin degradar la latencia p95 del endpoint en más de ~50 ms.

### REQ-02 `confirmed`
> Fuente: request JOR-163 archivos candidatos; front/jormat-front/src/lib/schemas/items.ts

El schema de front `itemListItemSchema` incorpora `imagenPrincipal` como campo opcional y nullable, de modo que todos los consumidores actuales del DTO de listado (listado de items, buscador de Ventas/Compras, builder de catálogos) siguen parseando la respuesta sin cambios de contrato.

### REQ-03 `confirmed`
> Fuente: request JOR-163 H2 y decisión 2; front/jormat-front/src/components/items/catalogos/CrearCatalogoView.tsx:104,124-125; catalogo.ts:17

Desde un catálogo guardado se genera una vista de listado que resuelve los uuids persistidos a items reales usando el patrón `useItemsCatalog` (fetchAllPages) más filtro client-side por uuid, reutilizando el cliente HTTP del proyecto con su interceptor de workspace, sin modificar el documento persistido del catálogo.

### REQ-04 `inferred`
> Fuente: request JOR-163 decisión 1 (umbral definido en el request, sin implementación previa en código)

La resolución client-side corta en el umbral de 20 páginas (2000 items con el cap backend de 100 por página): al superarlo se detiene el fetch y se muestra un aviso visible de 'listado incompleto', nunca un spinner indefinido.

### REQ-05 `confirmed`
> Fuente: front/jormat-front/src/lib/schemas/items.ts:139-142; backend/jormat-api/src/items/dto/item.dto.ts:139-156; front/jormat-front/src/components/items/catalogos/ItemsGrid.tsx:107

Cada card del listado generado muestra el id numérico del item (`item.numero`, no el uuid), descripción, marca, categoría, aplicación e imagen real tomada de `imagenPrincipal`, con placeholder cuando `imagenPrincipal` es null o ausente, sin disparar fetch de detalle por card. Categoría y aplicación llegan del DTO de listado como arrays de ids/uuids de la maestra (`categorias`, `aplicaciones`), por lo que la card resuelve el nombre legible con los mapas de catálogo que ya usa el builder, no con el id crudo.

### REQ-06 `confirmed`
> Fuente: request JOR-163 H1 y decisión 4; front/jormat-front/src/components/items/detail/ItemDetailModal/ItemDetailModal.tsx:59; LineItemsTable.tsx:48-52

El click en una card abre la vista rápida del item reusando `ItemDetailModal` en variant readonly, pasándole solo el `itemId` (auto-fetch vía `useItem`), con descripción, aplicaciones, referencias, marca, código marca, categorías, proveedores, bloqueo de descuento y stock por bodega, y con los precios de costo gateados por `items.parts:cost-view` sin lógica propia.

### REQ-07 `inferred`
> Fuente: request JOR-163 H4 (parcial): ItemPrintOverlay es content-agnostic pero el trigger está acoplado en ItemDetailContent.tsx:172-192 y no existe control de saltos de página

El botón 'Imprimir' exporta el listado generado a PDF vía impresión del navegador replicando el patrón `ItemPrintOverlay` (portal a body más aislamiento `@media print`) con un trigger propio de `window.print()`, y agrega CSS de paginación multi-card (`break-inside: avoid` y reglas `@page`) para que ninguna card quede cortada entre hojas.

### REQ-08 `confirmed`
> Fuente: front/jormat-front/src/lib/schemas/items.ts:139-142; backend/jormat-api/src/items/dto/item.dto.ts:139-156

El listado generado ofrece filtros client-side optativos sobre los items ya resueltos (descripción, marca, oferta, aplicaciones, categorías, proveedores) usando los campos que el DTO de listado YA expone —`categorias`, `aplicaciones` y `proveedores` como arrays de ids/uuids de la maestra, y `oferta` como boolean—, sin requerir una segunda extensión backend: el filtro opera por id y la card resuelve el nombre con los mapas de catálogo que ya usa el builder. Los filtros se combinan entre sí y no mutan el catálogo persistido; sin filtro aplicado se muestra el listado completo.

### REQ-09 `confirmed`
> Fuente: request JOR-163 alcance y criterios de aceptación (vista preliminar oculta la sección de filtros tras cargar)

En la vista generada (vista preliminar) la sección de filtros queda oculta tras completar la carga del listado, y no se incluye en la salida de impresión.

### REQ-10 `confirmed`
> Fuente: Request JOR-163, decision 6 y criterios de aceptacion (RBAC) + `backend/jormat-api/src/items/items.controller.ts:65-66` (el listado exige `items.parts:view`) + `front/jormat-front/src/app/(app)/inventario/catalogos/page.tsx` (RouteGuard)

La vista de generacion e impresion del catalogo esta protegida por RouteGuard exigiendo AMBAS capabilities, `items.catalogs:view` e `items.parts:view`. 'Sin degradacion con gracia' se define asi: un usuario al que le falte cualquiera de las dos es BLOQUEADO por el RouteGuard y REDIRIGIDO a la pantalla de sin permiso del proyecto; no se le renderiza una vista parcial, ni un listado vacio, ni la superficie de impresion. Ademas, el punto de entrada 'Generar' del catalogo guardado no debe ser alcanzable (oculto o no navegable) cuando falta alguna de las dos capabilities, de modo que el bloqueo no dependa solo del guard de ruta.

### REQ-11 `confirmed`
> Fuente: request JOR-163 criterio de aceptación final; front/jormat-front/src/app/(app)/inventario/catalogos/page.tsx

El docstring de `inventario/catalogos/page.tsx` queda alineado con lo implementado: generación desde catálogo guardado, filtros client-side, vista rápida readonly, impresión por navegador y el guard de doble capability, sin mencionar el modo ad-hoc por filtros que queda fuera de alcance.

### REQ-12 `inferred`
> Fuente: revisión post-sesión-3; front/jormat-front/src/components/items/catalogos/GenerarDesdeCatalogoView/GenerarDesdeCatalogoView.tsx; front/jormat-front/src/hooks/useItems.ts

Los hooks de resolución de items de la vista de generación (useCatalogoRepuesto y useItemsCatalogCapped) quedan condicionados (opción enabled de react-query) a que el usuario tenga AMBAS capabilities items.catalogs:view e items.parts:view, de modo que GET /items NO se dispare cuando el RouteGuard bloquea la vista; con ambas capabilities el fetch se dispara normalmente.

### REQ-13 `confirmed`
> Fuente: Adenda 1 del request (inmutable); front/jormat-front/src/components/items/catalogos/ItemsPickerTable/ItemsPickerTable.tsx

La tabla selectora de items del builder de catálogo (ItemsPickerTable, usada por CrearCatalogoView) muestra en su columna Id el numero de display del item (item.numero, con fallback a guion), no el uuid interno; el filtro de esa columna opera sobre el numero; y la selección/persistencia interna del catálogo sigue usando el uuid (item.id). Alineado con RULE-api-001 y la adenda 1.

### REQ-14 `confirmed`
> Fuente: Adenda 2 del request (2026-09-05); PDF 'Módulo catálogo'; front/jormat-front/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.tsx

En la vista de crear catálogo (CrearCatalogoView) los campos del catálogo (descripción, marca, aplicaciones, categorías, proveedores, oferta) son OPCIONALES, no obligatorios: el usuario puede armar el listado e imprimirlo sin llenarlos, y guardar el catálogo es opcional, siendo su único requisito al menos un ítem seleccionado. La vista ofrece un botón 'Imprimir' que exporta el listado de repuestos seleccionados a PDF por el navegador reusando el MISMO componente de impresión centralizado que la vista Generar (CatalogPrintView + ItemPrintOverlay + usePrintTrigger), de modo que el formato de hoja sea idéntico en crear y ver.
## Tasks

#### S1.T1 — Extender el DTO de listado del backend (`ItemDto` en items/dto/item.dto.ts) con `imagenPrincipal` opcional y nullable, tipando la forma de la imagen igual que en el detalle, sin tocar los campos existentes ni volverlo requerido.
Contrato: rollback: Revertir item.dto.ts al commit previo; el campo es opcional y ningún consumidor lo exige, por lo que la reversión no rompe clientes.. Status: done

#### S1.T2 — Coordinar la extension del DTO de listado con `imagenPrincipal`: la medicion de performance y la implementacion del join viven en las subtasks, el padre no mide ni implementa por su cuenta. Subtasks: S1.T2.1 arma el dataset sintetico y corre dos veces el listado (sin join y con join) comparando el delta de p95 contra el umbral de ~50 ms; S1.T2.2 implementa el join a imagenes `principal=true` en la proyeccion del select del listado del repositorio; S1.T2.3 registra la alternativa (lateral join o columna materializada) unicamente si la medicion de S1.T2.1 supera el umbral. Sin baseline previo ni medicion post a cargo del padre.
Contrato: rollback: Revertir items.repository.ts al commit previo (la query vuelve al select sin join); el DTO opcional queda devolviendo undefined sin romper consumidores.. Status: done

#### S1.T2.1 — Medicion de latencia del listado, autocontenida (absorbe la preparacion del dataset; ya no existe una task separada de dataset y no aplica ninguna precedencia obligatoria previa): (1) prepara o asegura en el entorno de medicion un dataset sintetico de referencia del orden de miles de items (no el seed demo de 12), con items con imagen principal y items sin ninguna; (2) corre GET /items SIN el join a imagenes sobre ese dataset y registra la latencia p95; (3) corre GET /items CON el join a imagenes sobre EL MISMO dataset y registra la latencia p95; (4) calcula el delta de p95 entre ambas corridas y lo compara contra el umbral de ~50 ms, dejando el numero registrado como evidencia para S1.T2.3.
Contrato: rollback: Eliminar el dataset sintetico generado en el entorno de medicion y descartar los registros de medicion. No toca codigo de produccion, por lo que no hay revert de commits asociado.. Status: done

#### S1.T2.2 — Implementar el join lateral a imágenes con `principal=true` en el bloque de select del listado, asegurando cardinalidad 1:1 por item (sin duplicar filas ante datos inconsistentes) y respetando el filtro de tenant/workspace de la query base.
Contrato: rollback: Revertir el bloque de select al estado previo en items.repository.ts.. Status: done

#### S1.T2.3 — Registro de la alternativa de proyeccion a aplicar SOLO si el delta p95 medido en S1.T2.1 supera el umbral de ~50 ms: documentar la opcion elegida (columna materializada de la imagen principal, o lateral join en lugar del join directo) con su costo, impacto en escritura/lectura y reversibilidad, dejandola lista para ejecutar. No repite ninguna medicion: las dos corridas (sin join y con join) y la comparacion contra el umbral ya las cubre S1.T2.1. Si el delta NO supera el umbral, la task se cierra sin cambio de codigo, dejando registrado el resultado de la medicion como justificacion.
Contrato: rollback: Eliminar el documento/nota de alternativa de proyeccion; si se llego a aplicar la alternativa, revertir ese cambio de query o de esquema y volver al join directo del listado.. Status: done

#### S1.T3 — Extender `itemListItemSchema` en el front (lib/schemas/items.ts) con `imagenPrincipal` opcional y nullable, y auditar los consumidores del DTO de listado (listado de items, ItemSearchPanel de Ventas/Compras, CrearCatalogoView) confirmando que ninguno requiere ajuste.
Contrato: rollback: Revertir lib/schemas/items.ts al commit previo; al ser campo opcional, los consumidores siguen parseando igual.. Status: done

#### S1.T4 — Tests de backend y contrato: proyección de `imagenPrincipal` (con imagen, sin imagen, múltiples imágenes, cap de 100 por página, aislamiento por tenant) más regresión del DTO de listado y de sus consumidores de front (campos preexistentes, total y paginación, parseo del schema con y sin la clave nueva).
Contrato: rollback: Revertir los archivos de test agregados; no afectan código productivo.. Status: done

#### S1.T5 — Verificación de contrato de datos de filtros y card: confirmar contra código que el DTO de listado ya expone los campos necesarios y dejar la evidencia fijada con archivo:línea. Checks: (a) `front/jormat-front/src/lib/schemas/items.ts:139-142` declara `categorias`, `aplicaciones`, `proveedores` (arrays de ids de catálogo) y `oferta` (boolean) en `itemListItemSchema`; (b) `backend/jormat-api/src/items/dto/item.dto.ts:139-156` declara los mismos campos en `ItemDto`, con el comentario que confirma que `oferta` habilita el filtro server-side y que los arrays son uuids de la maestra; (c) los arrays traen ids/uuids y NO nombres, por lo que el filtro client-side opera por id y la card resuelve el nombre con los mapas de aplicaciones/categorías que ya usa el builder. Conclusión a registrar: NO se requiere una segunda extensión backend además de `imagenPrincipal`; si algún check falla, detener y escalar antes de implementar las sesiones 2 y 3.
Contrato: rollback: Task de solo lectura/verificación: no modifica código ni configuración. Rollback = descartar la nota de evidencia; no hay estado que revertir.. Status: done

#### S2.T1 — Construir la vista de generación del catálogo desde un catálogo guardado: entrada desde el catálogo, resolución de uuids a items, estados de carga/vacío/error y control del umbral de volumen. Task padre: se completa cuando terminan sus subtasks.
Contrato: rollback: Eliminar el componente de la vista de generación y su entrada desde el catálogo guardado; el CRUD de catálogos queda intacto porque no se modifica el modelo persistido.. Status: done

#### S2.T1.1 — Agregar la entrada de generación desde un catálogo guardado (acción 'Generar' que abre la vista con el id del catálogo) sin modificar el documento persistido ni el CRUD existente.
Contrato: rollback: Quitar la acción y la ruta/estado de la vista de generación.. Status: done

#### S2.T1.2 — Resolver los uuids del catálogo a items reales con el patrón `useItemsCatalog` (fetchAllPages) más filtro client-side por uuid, reutilizando el cliente HTTP con el interceptor de workspace del proyecto para preservar el aislamiento por tenant.
Contrato: rollback: Revertir el hook/servicio de resolución; la vista queda sin datos pero el builder de catálogos sigue usando su resolución actual.. Status: done

#### S2.T1.3 — Implementar el corte por umbral (20 páginas, 2000 items) con detención del fetch y aviso visible de 'listado incompleto' indicando cantidad mostrada sobre total.
Contrato: rollback: Quitar el corte y el aviso; la resolución vuelve a recorrer todas las páginas.. Status: done

#### S2.T1.4 — Cubrir estados de la vista: catálogo vacío, uuids no resueltos (item borrado) informados como faltantes, y error de red con mensaje explícito en lugar de spinner indefinido.
Contrato: rollback: Revertir los estados a un render simple del listado.. Status: done

#### S2.T2 — Actualizar `ItemsGrid` de catálogos para mostrar id numérico (`item.numero`, reemplazando `item.id` en ItemsGrid.tsx:107), descripción, marca, categoría y aplicación, más la imagen real de `imagenPrincipal` con placeholder cuando es null, ausente o falla la carga, sin fetch de detalle por card. Task padre: se completa cuando terminan sus subtasks.
Contrato: rollback: Revertir ItemsGrid al commit previo (vuelve a mostrar el uuid y sin imagen); la vista de generación sigue renderizando.. Status: done

#### S2.T2.1 — Reemplazar `item.id` (uuid) por `item.numero` como identificador visible de la card en ItemsGrid.tsx:107, ajustando el label y el tipado del prop del item para que el uuid quede solo como key interna.
Contrato: rollback: Volver a renderizar `item.id` en la línea 107 y revertir el ajuste de label.. Status: done

#### S2.T2.2 — Renderizar en la card los campos descripción, marca, categoría y aplicación tomados del DTO de listado, con manejo de valores nulos o vacíos que preserve el layout (sin colapsar ni desbordar la grilla).
Contrato: rollback: Revertir el bloque de campos de la card a su composición previa.. Status: done

#### S2.T2.3 — Renderizar la imagen real desde `imagenPrincipal` (url del DTO extendido) con placeholder cuando el campo es null o ausente y fallback a placeholder vía `onError` cuando la url responde 404, sin icono de imagen rota.
Contrato: rollback: Quitar el bloque de imagen y su placeholder; la card vuelve a ser solo texto.. Status: done

#### S2.T2.4 — Verificar que la card no dispara ninguna llamada de detalle (`GET /items/:id`) y que el uso actual de `ItemsGrid` dentro del builder de catálogos conserva render y selección; ajustar props opcionales si el nuevo contenido rompiera ese consumidor.
Contrato: rollback: Revertir los ajustes de props y dejar los consumidores como estaban.. Status: done

#### S2.T3 — Cablear la vista rapida del item desde la card del listado generado. Subtasks: S2.T3.1 estado de seleccion del item mas handler de click en la card; S2.T3.2 montaje de `ItemDetailModal` en variant readonly pasandole solo el `itemId` (auto-fetch via `useItem`); S2.T3.3 cierre del modal y manejo de error de carga, donde al cerrar se restaura unicamente la seleccion y la posicion de scroll del listado. Los filtros NO se tocan ni se restauran en este flujo: el estado de filtros es independiente del ciclo de vida del modal.
Contrato: rollback: Quitar el handler de click de la card y el montaje de `ItemDetailModal` (junto con el estado de seleccion asociado); el listado vuelve a renderizar cards no interactivas, sin otros efectos.. Status: done

#### S2.T3.1 — Agregar en la vista de generación el estado de item seleccionado y el handler de click sobre la card (incluyendo activación por teclado para no perder accesibilidad), sin alterar la selección que el builder usa hoy sobre el mismo grid.
Contrato: rollback: Quitar el estado y el handler; la card vuelve a ser no interactiva en la vista de generación.. Status: done

#### S2.T3.2 — Montar `ItemDetailModal` en variant readonly pasándole únicamente el `itemId` para que dispare su auto-fetch con `useItem`, sin duplicar en el catálogo el gating de precios de costo (queda en `items.parts:cost-view` dentro del modal).
Contrato: rollback: Desmontar el modal de la vista de catálogo; el resto de la vista sigue operativa.. Status: done

#### S2.T3.3 — Cierre y error del modal en el alcance de la sesion 2: al cerrar `ItemDetailModal` se limpia el estado de seleccion del item y se restaura la posicion de scroll del listado; si la carga del detalle falla, el modal muestra el estado de error del propio componente y el cierre sigue funcionando sin dejar el listado bloqueado. NO incluye restauracion de filtros: la UI de filtros no existe hasta la sesion 3, donde se agrega esa restauracion junto con los filtros.
Contrato: rollback: Revertir el handler de cierre (limpieza de seleccion y restauracion de scroll) y el manejo de error; el modal queda con el comportamiento por defecto del componente.. Status: done

#### S2.T4 — Proteger la vista de generacion e impresion del catalogo con el criterio unico de bloqueo de REQ-10: sin AMBAS capabilities (`items.catalogs:view` e `items.parts:view`) el RouteGuard redirige a la pantalla de sin permiso del proyecto (prohibido cualquier render parcial: ni vista degradada, ni listado vacio, ni superficie de impresion) y ademas el punto de entrada 'Generar' del catalogo guardado no es alcanzable (oculto o no navegable). Subtasks: S2.T4.1 RouteGuard con las dos capabilities y redireccion a la pantalla de sin permiso, sin render parcial; S2.T4.2 afordance 'Generar' oculto o no navegable cuando falta cualquiera de las dos capabilities, de modo que el bloqueo no dependa solo del guard de ruta. Misma redaccion del criterio en desc y subtasks.
Contrato: rollback: Revertir page.tsx al commit previo (guard simple y docstring anterior).. Status: done

#### S2.T4.1 — RouteGuard de doble capability en `inventario/catalogos`: la vista de generacion e impresion exige AMBAS, `items.catalogs:view` e `items.parts:view`. Criterio explicito de bloqueo (sin degradacion con gracia): si falta cualquiera de las dos, el RouteGuard bloquea y REDIRIGE a la pantalla de sin permiso del proyecto; queda prohibido renderizar una vista parcial, un listado vacio o la superficie de impresion. Ademas, el punto de entrada 'Generar' del catalogo guardado (S2.T1.1) no debe ser alcanzable cuando falta alguna de las dos capabilities: se oculta o se deja no navegable, de modo que el usuario no llegue a disparar la navegacion bloqueada.
Contrato: rollback: Volver al guard simple previo en page.tsx.. Status: done

#### S2.T4.2 — Verificar el alcance del guard: que no exista ruta, atajo ni acción de impresión que alcance la vista sin ambas capabilities, y que el CRUD de catálogos existente y otras rutas de inventario con `items.parts:view` no queden restringidos de más.
Contrato: rollback: Revertir los ajustes de rutas o entradas derivados de la verificación.. Status: done

#### S2.T4.3 — Actualizar el docstring de `inventario/catalogos/page.tsx` describiendo generación desde catálogo guardado, filtros client-side, vista rápida readonly, impresión por navegador y el guard de doble capability, sin mencionar el modo ad-hoc por filtros ni PDF server-side.
Contrato: rollback: Restaurar el docstring anterior; no afecta comportamiento en runtime.. Status: done

#### S2.T5 — Tests de la superficie disponible al cierre de la sesion 2 (generacion, cards, vista rapida y RBAC). Subtasks acotadas a lo que existe en esta sesion: resolucion del catalogo guardado a items reales; card con id numerico `item.numero` en lugar del uuid; card con `imagenPrincipal` renderizada y placeholder cuando es null o ausente; apertura de la vista rapida readonly al click en la card con stock por bodega; cierre del modal restaurando seleccion y scroll; gateo de precios de costo por `items.parts:cost-view`; y RBAC (S2.T5.7). NO incluye el caso de que el aviso de listado incompleto persista al aplicar un filtro ni el de que el cierre del modal restaure filtros y scroll: ambos dependen de la superficie de filtros y viven en S3.T4.
Contrato: rollback: Revertir los archivos de test agregados; no afectan código productivo.. Status: done

#### S2.T5.1 — Tests de generación desde catálogo guardado: 5 uuids resuelven exactamente 5 cards, catálogo con 0 uuids muestra estado vacío (no spinner), uuid inexistente se omite informando la cantidad no resuelta, y error 500 en la primera página muestra mensaje de error.
Contrato: rollback: Eliminar el archivo de tests de generación.. Status: done

#### S2.T5.2 — Caso de test (sesion 2, sin filtros): con un catalogo cuyo volumen supera el umbral de 20 paginas (2000 items con cap de 100 por pagina), la resolucion client-side corta el fetch y la vista muestra el aviso visible de 'listado incompleto', sin spinner indefinido. Solo aserciones sobre superficie disponible en sesion 2: no incluye ninguna asercion sobre filtros (la persistencia del aviso al aplicar un filtro se prueba en la sesion 3, S3.T4, cuando la UI de filtros ya existe).
Contrato: rollback: Eliminar el archivo de tests del umbral.. Status: done

#### S2.T5.3 — Tests de aislamiento por tenant en la resolución: verificar que cada página del fetchAllPages viaja con el header/interceptor de workspace y que no se resuelven items de otro workspace.
Contrato: rollback: Eliminar el test de aislamiento.. Status: done

#### S2.T5.4 — Tests de card: numero, descripción, marca, categoría y aplicación renderizados; `imagenPrincipal` poblada muestra la imagen; null muestra placeholder; url 404 cae al placeholder vía onError; item sin marca/categoría/aplicación no rompe el layout. Incluye el test de regresión que falla si vuelve a renderizarse el uuid.
Contrato: rollback: Eliminar el archivo de tests de ItemsGrid.. Status: done

#### S2.T5.5 — Test de ausencia de fetch de detalle: renderizar N cards y assertar en cero el conteo de requests a `GET /items/:id`.
Contrato: rollback: Eliminar el test de conteo de requests de detalle.. Status: done

#### S2.T5.6 — Caso de test (sesion 2, sin filtros): al cerrar el modal de vista rapida, el listado restaura la seleccion y la posicion de scroll previas al click. Sin aserciones sobre filtros: la restauracion de filtros al cerrar el modal vive solo en la sesion 3 (S3.T4).
Contrato: rollback: Eliminar el archivo de tests de la vista rápida.. Status: done

#### S2.T5.7 — Test de RBAC de la vista de generacion e impresion. Casos: (a) con `items.catalogs:view` e `items.parts:view` la vista renderiza; (b) faltando `items.catalogs:view` el RouteGuard redirige a la pantalla de sin permiso y no se renderiza vista parcial, listado vacio ni superficie de impresion; (c) faltando `items.parts:view` (aun teniendo `items.catalogs:view`) el RouteGuard redirige igual, sin render parcial; (d) el afordance 'Generar' del catalogo guardado no es alcanzable (oculto o no navegable) y no dispara navegacion cuando falta `items.catalogs:view` o `items.parts:view`, verificando que el bloqueo no dependa solo del guard de ruta.
Contrato: rollback: Eliminar el archivo de tests de RBAC.. Status: done

#### S2.T5.8 — Regresión de consumidores y documentación: `ItemDetailModal` desde LineItemsTable e ItemSearchPanel sin cambios de comportamiento, CRUD de catálogos verde con documento persistido intacto, uso de ItemsGrid en el builder sin cambios, y lint/build verdes tras la edición del docstring.
Contrato: rollback: Eliminar los tests de regresión agregados.. Status: done

#### S2.T6 — Capturar evidencia runtime de la vista rápida: con la app corriendo, abrir la vista generada de un catálogo, hacer click en una card y registrar (captura/grabación) el `ItemDetailModal` readonly mostrando descripción, aplicaciones, referencias, marca, código marca, categorías, proveedores, bloqueo de descuento y stock por bodega con datos reales, más el título con el id numérico. Incluir un caso con rol SIN `items.parts:cost-view` para evidenciar que costo/compra/mayor no aparecen. Simétrica a la evidencia de impresión de S3.T2.3; adjuntar la evidencia al DoD del ticket.
Contrato: rollback: Captura de evidencia manual sobre un entorno de pruebas: no modifica código ni datos. Rollback = descartar los archivos de evidencia generados.. Status: done

#### S2.T7 — En el componente de card del listado generado del catalogo (`front/jormat-front/src/components/items/catalogos/ItemsGrid.tsx` y su card), resolver el NOMBRE legible de categoria y aplicacion a partir de los uuids que trae el DTO de listado (`categorias`, `aplicaciones` son arrays de uuids de la maestra). Construir/reusar los mapas uuid->nombre con el mismo patron del builder (`CrearCatalogoView`: `aplicaciones.map(a => [a.id, a.nombre])` y `categorias.map(c => [c.id, c.nombre])`), pasandolos a la card por prop desde la vista de generacion (una sola construccion del mapa, no uno por card). Degradacion definida: si un uuid no esta en el mapa, la card omite ese chip (o renderiza un marcador neutro), sin romper el render ni mostrar el uuid crudo.
Contrato: rollback: Revertir el archivo de la card/ItemsGrid y la vista de generacion a su version previa (git checkout de los archivos tocados); la card vuelve a renderizar los ids crudos sin afectar el resto del listado ni el builder existente.. Status: done

#### S2.T8 — Test de la resolucion uuid->nombre en la card del catalogo: (a) con mapas poblados, la card muestra el nombre de la aplicacion y de la categoria y NO el uuid; (b) con un uuid ausente del mapa, la card degrada omitiendo el chip (o mostrando el marcador neutro) sin lanzar error ni mostrar el uuid crudo; (c) con arrays `categorias`/`aplicaciones` vacios o ausentes, la card renderiza sin chips y sin romper.
Contrato: rollback: Eliminar el archivo de test agregado; no afecta codigo de produccion.. Status: done

#### S3.T1 — Implementar los filtros client-side optativos sobre los items ya resueltos (descripción, marca, oferta, aplicaciones, categorías, proveedores), combinables en AND, sin nuevas requests y sin mutar el catálogo persistido. Task padre: se completa cuando terminan sus subtasks.
Contrato: rollback: Quitar el panel de filtros y el estado asociado; el listado vuelve a mostrarse completo desde los items resueltos.. Status: done

#### S3.T1.1 — Definir el estado de filtros y los predicados por campo (texto para descripción, selección simple para marca, booleano para oferta, multivalor para aplicaciones, categorías y proveedores) operando sobre el arreglo de items ya resueltos en memoria.
Contrato: rollback: Revertir el módulo de predicados y el estado de filtros.. Status: done

#### S3.T1.2 — Componer los predicados en AND, aplicar el resultado al listado y agregar el estado vacío con acción de limpiar filtros cuando la combinación no arroja coincidencias.
Contrato: rollback: Revertir la composición y volver a renderizar el listado completo.. Status: done

#### S3.T1.3 — Ocultar la sección de filtros una vez completada la carga de la vista generada (vista preliminar), manteniendo el listado resuelto si el usuario la reabre y excluyéndola de la impresión.
Contrato: rollback: Revertir la lógica de ocultamiento; los filtros quedan siempre visibles.. Status: done

#### S3.T2 — Implementar la impresión del listado: replicar el trigger de `window.print()` hoy acoplado en ItemDetailContent.tsx:172-192 hacia la vista de catálogo, montar el listado (filtrado) dentro de `ItemPrintOverlay` y agregar el CSS de paginación multi-card (`break-inside: avoid`, reglas `@page`) calibrado con print real. Antes de cerrar, verificar el estado de JOR-078 para confirmar que el patrón de navegador sigue siendo la estrategia vigente.
Contrato: rollback: Quitar el botón Imprimir y el montaje del overlay en la vista de catálogo, y revertir el CSS de impresión agregado; la impresión del detalle de ítem queda intacta.. Status: done

#### S3.T2.1 — Extraer o replicar el trigger de impresión (montaje del overlay más `window.print()` y desmontaje al cerrar el diálogo) de forma reutilizable, sin alterar el comportamiento actual de la impresión del detalle de ítem.
Contrato: rollback: Revertir la extracción y dejar el trigger original en ItemDetailContent.tsx.. Status: done

#### S3.T2.2 — Montar el listado filtrado dentro de `ItemPrintOverlay` con encabezado del catálogo y agregar el CSS de saltos de página (`break-inside: avoid` por card, márgenes y tamaño vía `@page`).
Contrato: rollback: Quitar el contenido de impresión y su hoja de estilos; el overlay vuelve a usarse solo desde el detalle.. Status: done

#### S3.T2.3 — Calibrar con impresión real (Guardar como PDF) sobre un listado largo y con filtros aplicados, capturar la evidencia runtime y corregir cortes de card o páginas en blanco detectados.
Contrato: rollback: Revertir los ajustes de CSS al valor previo de la calibración.. Status: done

#### S3.T2.4 — Verificar el estado de JOR-078 (estrategia única de impresión/export) y dejar registrada la nota de reencuadre si define otro patrón, sin bloquear la entrega.
Contrato: rollback: No aplica: solo documentación de la verificación.. Status: done

#### S3.T3 — Tests de la sesión: filtros (reducción, AND, multivalor, oferta, sin coincidencias, limpiar, sin nuevas requests), ocultamiento de filtros tras la carga y su exclusión de la impresión, e impresión (spy de window.print, listado filtrado impreso, estilos de saltos de página, cancelación sin estilos residuales); más regresión de la impresión del detalle de ítem y del catálogo persistido sin mutaciones.
Contrato: rollback: Revertir los archivos de test agregados; no afectan código productivo.. Status: done

#### S3.T4 — Tests diferidos desde la sesion 2 que dependen de la UI de filtros implementada en S3.T1 (se ubican junto a los tests de filtros de S3.T3): (a) 'el aviso de volumen persiste al aplicar un filtro' — con el catalogo por encima del umbral de 20 paginas, al aplicar cualquier filtro client-side el aviso de 'listado incompleto' sigue visible y no se pierde al recalcular el listado filtrado; (b) 'el cierre del modal restaura filtros y scroll' — abierta la vista rapida desde una card con filtros aplicados, al cerrar el modal los filtros activos siguen aplicados y la posicion de scroll del listado se restaura. Ambos casos se escriben contra la UI real de filtros, no contra stubs; su discoveryRef queda en la sesion 3 porque en la sesion 2 no existe la superficie de filtros que asertan.
Contrato: rollback: Eliminar el archivo/bloque de tests agregado en la suite de la sesion 3; no toca codigo de produccion, la suite previa queda tal cual.. Status: done

#### S4.T1 — Reescribir el docstring de `front/jormat-front/src/app/(app)/inventario/catalogos/page.tsx` para alinearlo con lo implementado: generacion desde catalogo guardado (vista GenerarDesdeCatalogoView en /inventario/catalogos/[id]/generar), filtros client-side optativos, vista rapida readonly (ItemDetailModal), impresion por navegador (ItemPrintOverlay) y el guard de doble capability (items.catalogs:view + items.parts:view). Corregir la afirmacion falsa actual de 'filtros server-side'; no mencionar el modo ad-hoc por filtros ni PDF server-side.
Contrato: rollback: git restore front/jormat-front/src/app/(app)/inventario/catalogos/page.tsx. Status: done

#### S4.T2 — En GenerarDesdeCatalogoView, condicionar los hooks de items (useCatalogoRepuesto y useItemsCatalogCapped, opcion enabled de react-query) a que el usuario tenga AMBAS capabilities (items.catalogs:view e items.parts:view), para que GET /items NO se dispare cuando el RouteGuard bloquea. Incluir un test que verifique por conteo de requests que sin items.parts:view el conteo es 0, y con ambas es > 0.
Contrato: rollback: git restore GenerarDesdeCatalogoView.tsx y su archivo de test. Status: done

#### S4.T3 — ItemsPickerTable (tabla del builder, usada por CrearCatalogoView): la columna Id muestra item.numero (fallback guion), el filtro de esa columna opera sobre numero, y la seleccion/persistencia interna sigue por uuid (item.id). Incluir tests: numero visible y uuid ausente en el DOM; filtrar por numero deja la fila esperada; filtrar por fragmento del uuid no matchea; regresion de seleccion por uuid.
Contrato: rollback: git restore ItemsPickerTable.tsx y su archivo de test. Status: done

#### S4.T4 — Tests faltantes verdes: (a) lock 'numero, no uuid' de las cards de ItemsGrid (REQ-05-6): un test que falle si la card vuelve a mostrar item.id en vez de item.numero; (b) imagen imagenPrincipal null renderiza placeholder y url 404 cae al placeholder via onError (REQ-05-2/3); (c) bordes de REQ-04: catalogo de exactamente 2000 items (sin aviso) y 2001 (con aviso), y falla de una pagina intermedia del fetch (no queda en spinner).
Contrato: rollback: git restore de los archivos de test tocados. Status: done

#### S4.T5 — Validacion final: correr la suite vitest completa del front (verde) y un smoke con Playwright sobre la vista Generar (con el bypass de auth del proyecto, sin contrasena), confirmando: filtros opcionales visibles y funcionales, numero (no uuid) en las cards y en la tabla del builder, y boton Imprimir presente y que dispara la impresion.
Contrato: rollback: No aplica (validacion, sin cambios de produccion). Status: done

#### S5.T1 — En CrearCatalogoView hacer OPCIONALES los campos del form del catálogo (descripción, marca, aplicaciones, categorías, proveedores, oferta): quitar la validación required/min(1) del schema y los marcadores '*' de los labels; el guardado sigue funcionando con defaults y su único requisito pasa a ser >=1 ítem seleccionado.
Contrato: rollback: git restore front/jormat-front/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.tsx (y el schema de validación asociado). Status: done

#### S5.T2 — Agregar a CrearCatalogoView un botón 'Imprimir' (deshabilitado sin ítems seleccionados) que imprime los ítems seleccionados reusando usePrintTrigger + ItemPrintOverlay + CatalogPrintView, el componente de impresión centralizado compartido con la vista Generar, sin duplicar markup ni CSS de hoja.
Contrato: rollback: git restore front/jormat-front/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.tsx. Status: done

#### S5.T3 — Tests verdes en CrearCatalogoView.test.tsx: campos opcionales (guarda con campos vacíos si hay ítems; no guarda sin ítems), botón 'Imprimir' deshabilitado sin selección y que dispara window.print una sola vez con ítems seleccionados.
Contrato: rollback: git restore front/jormat-front/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.test.tsx. Status: done

#### S5.T4 — Smoke Playwright de la vista crear catálogo (con bypass de auth) confirmando: labels sin marcador '*', botón 'Imprimir' presente y funcional (dispara la impresión) y número de ítem (no uuid) visible en la tabla del builder.
Contrato: rollback: no aplica (verificación, no modifica código de producción). Status: done
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T2.3
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

### Session 2 · T3 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T1.4
- [x] S2.T2
- [x] S2.T2.1
- [x] S2.T2.2
- [x] S2.T2.3
- [x] S2.T2.4
- [x] S2.T3
- [x] S2.T3.1
- [x] S2.T3.2
- [x] S2.T3.3
- [x] S2.T4
- [x] S2.T4.1
- [x] S2.T4.2
- [x] S2.T4.3
- [x] S2.T5
- [x] S2.T5.1
- [x] S2.T5.2
- [x] S2.T5.3
- [x] S2.T5.4
- [x] S2.T5.5
- [x] S2.T5.6
- [x] S2.T5.7
- [x] S2.T5.8
- [x] S2.T6
- [x] S2.T7
- [x] S2.T8

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T1.1
- [x] S3.T1.2
- [x] S3.T1.3
- [x] S3.T2
- [x] S3.T2.1
- [x] S3.T2.2
- [x] S3.T2.3
- [x] S3.T2.4
- [x] S3.T3
- [x] S3.T4

### Session Cierre de gaps (docstring REQ-11, gating del fetch REQ-12, id numérico en tabla del builder REQ-13, tests faltantes) · T2 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3
- [x] S4.T4
- [x] S4.T5

**Gate (strong)**: Cierra los gaps de la revisión post-sesión-3, con tests verdes y validación runtime por smoke Playwright (bypass de auth) de la vista Generar. Criterios: (1) REQ-11 docstring de catalogos/page.tsx alineado con lo implementado; (2) REQ-12 hooks de items condicionados por enabled a ambas capabilities, GET /items no dispara bajo bloqueo (test de conteo de requests); (3) REQ-13 columna Id de ItemsPickerTable muestra numero (no uuid), filtra por numero, selección por uuid; (4) tests faltantes verdes: lock número-no-uuid (REQ-05-6), imagen placeholder/onError (REQ-05-2/3), bordes REQ-04 (2000/2001 y falla de página intermedia); (5) smoke Playwright: filtros opcionales visibles, número en cards y tabla, botón Imprimir funcional. REQ-06-3 (gating de costo) queda como dependencia de JOR-077, fuera de esta sesión.

### Session Vista crear: filtros opcionales + impresión centralizada (REQ-14) · T2 · continue

**Tasks:**
- [x] S5.T1
- [x] S5.T2
- [x] S5.T3
- [x] S5.T4

**Gate (strong)**: La vista crear catálogo (CrearCatalogoView) cumple REQ-14: campos del catálogo opcionales (sin obligatorios/'*'; guardar solo exige ≥1 ítem) y botón 'Imprimir' que exporta el listado seleccionado reusando el componente de impresión centralizado (CatalogPrintView + ItemPrintOverlay), con tests verdes y smoke Playwright (bypass de auth) de la vista crear (campos sin '*', Imprimir funcional, número en la tabla). Fuera de alcance: el arreglo del formato de hoja del componente centralizado (follow-up).
## Enmiendas (refine_spec)

### Enmienda 1

**Tasks agregadas:**

- S4: Reescribir el docstring de `front/jormat-front/src/app/(app)/inventario/catalogos/page.tsx` para alinearlo con lo implementado: generacion desde catalogo guardado (vista GenerarDesdeCatalogoView en /inventario/catalogos/[id]/generar), filtros client-side optativos, vista rapida readonly (ItemDetailModal), impresion por navegador (ItemPrintOverlay) y el guard de doble capability (items.catalogs:view + items.parts:view). Corregir la afirmacion falsa actual de 'filtros server-side'; no mencionar el modo ad-hoc por filtros ni PDF server-side. (valida: REQ-11; rollback: git restore front/jormat-front/src/app/(app)/inventario/catalogos/page.tsx)
- S4: En GenerarDesdeCatalogoView, condicionar los hooks de items (useCatalogoRepuesto y useItemsCatalogCapped, opcion enabled de react-query) a que el usuario tenga AMBAS capabilities (items.catalogs:view e items.parts:view), para que GET /items NO se dispare cuando el RouteGuard bloquea. Incluir un test que verifique por conteo de requests que sin items.parts:view el conteo es 0, y con ambas es > 0. (valida: REQ-12; rollback: git restore GenerarDesdeCatalogoView.tsx y su archivo de test)
- S4: ItemsPickerTable (tabla del builder, usada por CrearCatalogoView): la columna Id muestra item.numero (fallback guion), el filtro de esa columna opera sobre numero, y la seleccion/persistencia interna sigue por uuid (item.id). Incluir tests: numero visible y uuid ausente en el DOM; filtrar por numero deja la fila esperada; filtrar por fragmento del uuid no matchea; regresion de seleccion por uuid. (valida: REQ-13; rollback: git restore ItemsPickerTable.tsx y su archivo de test)
- S4: Tests faltantes verdes: (a) lock 'numero, no uuid' de las cards de ItemsGrid (REQ-05-6): un test que falle si la card vuelve a mostrar item.id en vez de item.numero; (b) imagen imagenPrincipal null renderiza placeholder y url 404 cae al placeholder via onError (REQ-05-2/3); (c) bordes de REQ-04: catalogo de exactamente 2000 items (sin aviso) y 2001 (con aviso), y falla de una pagina intermedia del fetch (no queda en spinner). (valida: REQ-05, REQ-04, test; rollback: git restore de los archivos de test tocados)
- S4: Validacion final: correr la suite vitest completa del front (verde) y un smoke con Playwright sobre la vista Generar (con el bypass de auth del proyecto, sin contrasena), confirmando: filtros opcionales visibles y funcionales, numero (no uuid) en las cards y en la tabla del builder, y boton Imprimir presente y que dispara la impresion. (valida: REQ-04, REQ-05, REQ-07, REQ-08, REQ-09, REQ-11, REQ-12, REQ-13, test; rollback: No aplica (validacion, sin cambios de produccion))

### Enmienda 2
**REQs:**

- REQ-14 (add) `confirmed`: En la vista de crear catálogo (CrearCatalogoView) los campos del catálogo (descripción, marca, aplicaciones, categorías, proveedores, oferta

**Tasks agregadas:**

- S5: En CrearCatalogoView hacer OPCIONALES los campos del form del catálogo (descripción, marca, aplicaciones, categorías, proveedores, oferta): quitar la validación required/min(1) del schema y los marcadores '*' de los labels; el guardado sigue funcionando con defaults y su único requisito pasa a ser >=1 ítem seleccionado. (valida: REQ-14; rollback: git restore front/jormat-front/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.tsx (y el schema de validación asociado))
- S5: Agregar a CrearCatalogoView un botón 'Imprimir' (deshabilitado sin ítems seleccionados) que imprime los ítems seleccionados reusando usePrintTrigger + ItemPrintOverlay + CatalogPrintView, el componente de impresión centralizado compartido con la vista Generar, sin duplicar markup ni CSS de hoja. (valida: REQ-14; rollback: git restore front/jormat-front/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.tsx)
- S5: Tests verdes en CrearCatalogoView.test.tsx: campos opcionales (guarda con campos vacíos si hay ítems; no guarda sin ítems), botón 'Imprimir' deshabilitado sin selección y que dispara window.print una sola vez con ítems seleccionados. (valida: REQ-14, test; rollback: git restore front/jormat-front/src/components/items/catalogos/CrearCatalogoView/CrearCatalogoView.test.tsx)
- S5: Smoke Playwright de la vista crear catálogo (con bypass de auth) confirmando: labels sin marcador '*', botón 'Imprimir' presente y funcional (dispara la impresión) y número de ítem (no uuid) visible en la tabla del builder. (valida: REQ-14, test; rollback: no aplica (verificación, no modifica código de producción))
