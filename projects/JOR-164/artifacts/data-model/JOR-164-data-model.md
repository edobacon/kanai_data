# Modelo de datos afectado - JOR-164 (Paginación server-side + filtros en listados de items)

## 0. Resumen ejecutivo

**No hay cambios de esquema.** No se crean tablas, columnas, enums ni FKs; no hay migraciones. Todo el impacto de "modelo" ocurre en tres capas por encima de la base:

| Capa | Cambio | Nuevo / Existente |
|---|---|---|
| Tablas relacionales (`items`, `item_references`, pivote de proveedores) | Ninguno. Solo se **leen** columnas que ya existen | Existente, intacto |
| Objetos de configuración en código (`PivotFilterConfig`) | Se agrega una instancia `PROVEEDOR_PIVOT` | Nueva instancia, tipo existente |
| DTOs de entrada (`CatalogItemsFilterDto`, `ListItemsQueryDto`) | Se agregan campos `numero`, `referencias`, `ids` | Campos nuevos, DTOs existentes |
| Contratos de front (`ItemsListParams`, props de `ItemsPickerTable`, retorno de `useItemsByIds`) | Se extienden / se redefinen | Mixto (ver secciones 4.x) |

El único "modelo" que cambia de forma estructural es el **contrato de props de `ItemsPickerTable`** (pasa de no controlado a controlado), que es un breaking change interno de tipos, no de datos.

---

## 1. Capa de persistencia (existente, sin cambios)

### 1.1 `items` (alias `i` en el repositorio)

Solo se listan las columnas que participan de filtros, orden o proyección de este ticket.

| Campo | Tipo | Obligatorio | Clave / FK | Default | Uso en JOR-164 | Estado |
|---|---|---|---|---|---|---|
| `id` | integer (PK autoincremental) | Sí | PK | secuencia | **Desempate del ORDER BY** (REQ-07) | Existente |
| `uuid` | uuid / char(36) | Sí | Único | generado | Filtro `ids` (`whereIn i.uuid`) e identidad expuesta al front (REQ-06) | Existente |
| serial de display (columna de número de item) | varchar | Sí | Índice único probable | - | Filtro `numero` (substring, `whereILike`) (REQ-04) | Existente. **Nombre exacto de columna a confirmar en `items.repository.ts`** |
| `ds_name` | varchar / text | Sí | - | - | Filtro `descripcion` (`whereILike i.ds_name`) (REQ-04) | Existente |
| `offer_is` | tinyint / boolean (0-1) | Sí | - | `0` | Filtro `oferta` (`i.offer_is = 1`) (REQ-04) | Existente |
| marca (columna de marca) | varchar / FK a catálogo de marcas | Depende del esquema | Posible FK | - | Filtro `marca` (substring), **ya cableado hoy** | Existente, sin cambios |
| `priority` | integer / enum numérico | No | - | - | Filtro `priority`, **ya cableado hoy** | Existente, sin cambios |

Notas:
- `oferta` es un booleano de dominio representado como `0/1`. El DTO lo recibe como boolean (query string `true`/`false`) y la query lo traduce a `offer_is = 1`. No se agrega columna ni enum.
- Ningún filtro nuevo escribe: todos son de lectura.

### 1.2 `item_references`

| Campo | Tipo | Obligatorio | Clave / FK | Default | Uso en JOR-164 | Estado |
|---|---|---|---|---|---|---|
| `id` | integer (PK) | Sí | PK | secuencia | - | Existente |
| `item_id` (o equivalente) | integer | Sí | **FK -> `items.id`** | - | Correlación del `whereExists` | Existente |
| `ds_reference` | varchar | Sí | - | - | Filtro `referencias` (substring, dentro del `whereExists`) (REQ-04) | Existente |

Relación: `items 1 --- N item_references`.

**Decisión de modelo de query:** el filtro por referencias se resuelve con `whereExists` (subconsulta correlacionada), **no con `join`**. Razón: un item con N referencias que matchean produciría N filas duplicadas bajo `join`, lo que rompe `total` y el `LIMIT/OFFSET`. `whereExists` conserva la cardinalidad 1 fila = 1 item, que es el invariante del que depende la paginación server-side (REQ-14).

### 1.3 Pivote de proveedores (tabla existente, gemela de categorías y aplicaciones)

| Campo | Tipo | Obligatorio | Clave / FK | Uso en JOR-164 | Estado |
|---|---|---|---|---|---|
| `item_id` (o equivalente) | integer | Sí | **FK -> `items.id`** | Correlación del pivote | Existente |
| id de proveedor | integer / uuid | Sí | **FK -> tabla de proveedores** | Valor comparado contra el arreglo `proveedores` del DTO | Existente |

Relación: `items N --- N proveedores` vía la tabla pivote.

**Estado:** la tabla existe; lo nuevo es únicamente su **descriptor en código** (sección 2.2). **A confirmar en el repositorio:** nombre real de la tabla pivote y de sus dos columnas, leyendo `items.repository.ts:85-102` donde están declarados `CATEGORIA_PIVOT` y `APLICACION_PIVOT`.

### 1.4 Mapa de relaciones involucradas

```
items (i)
  |-- 1:N --> item_references        (ds_reference)   [whereExists, filtro `referencias`]
  |-- N:M --> categorias   via pivote CATEGORIA       [ya cableado]
  |-- N:M --> aplicaciones via pivote APLICACION      [ya cableado]
  `-- N:M --> proveedores  via pivote PROVEEDOR       [NUEVO cableado, tabla existente]
```

### 1.5 Índices

No se crean índices en este ticket (sin migraciones). Estado esperado y riesgo:

| Índice | Sobre | Estado | Comentario |
|---|---|---|---|
| PK | `items.id` | Existente | Soporta el desempate del ORDER BY sin costo |
| Único | `items.uuid` | Existente (esperado) | Hace que `whereIn i.uuid` con hasta 100 valores sea barato: es el camino de `useItemsByIds` (REQ-06, REQ-10) |
| FK | `item_references.item_id` | Existente (esperado) | Necesario para que el `whereExists` sea eficiente |
| FK | pivote proveedores `.item_id` | Existente (esperado) | Idem para `applyPivotFilter` |
| (sin índice) | `items.ds_name`, serial de display, `item_references.ds_reference` | **No indexable útilmente** | Los filtros son `LIKE '%valor%'` (substring), que **no usan índice B-tree**. Con 13.575 items esto es un full scan acotado y aceptable; deja de serlo en otro orden de magnitud |

**Riesgo dimensionado, sin acción en este ticket:** los tres filtros por columna son substring no anclado. Si la tabla crece un orden de magnitud, la mitigación es índice full-text / trigram o anclar el match al prefijo, y eso requiere migración y ticket propio. Se documenta, no se implementa.

---

## 2. Objetos de configuración en código (backend)

### 2.1 `PivotFilterConfig` (tipo existente, sin cambios de forma)

Estructura que consume `applyPivotFilter`. Su **firma no cambia** (REQ-05): el soporte de proveedores se logra agregando una instancia, no modificando el mecanismo.

| Campo (según la forma actual de CATEGORIA/APLICACION) | Tipo | Obligatorio | Comentario |
|---|---|---|---|
| tabla pivote | string | Sí | Nombre de la tabla puente |
| columna de item | string | Sí | FK hacia `items` |
| columna de valor | string | Sí | FK hacia la entidad filtrada |

**A confirmar:** los nombres reales de las propiedades en `items.repository.ts:85-102`. `PROVEEDOR_PIVOT` debe copiar esa forma exactamente, sin inventar campos.

### 2.2 `PROVEEDOR_PIVOT` **[NUEVO]**

Constante nueva, gemela de `CATEGORIA_PIVOT` y `APLICACION_PIVOT`, ubicada junto a ellas. Es el único artefacto nuevo del backend fuera de los DTOs.

---

## 3. DTOs de entrada (backend)

### 3.1 `CatalogItemsFilterDto` (existente, se extiende)

`backend/jormat-api/src/items/dto/catalog-items-filter.dto.ts`

| Campo | Tipo | Obligatorio | Default | Validación | Estado |
|---|---|---|---|---|---|
| `search` | string | No | - | `@IsOptional @IsString` | Existente, cableado |
| `marca` | string | No | - | `@IsOptional @IsString` | Existente, cableado |
| `priority` | number / enum | No | - | Existente | Existente, cableado |
| `categorias` | string[] (CSV o repetido) | No | - | Existente | Existente, cableado |
| `aplicaciones` | string[] | No | - | Existente | Existente, cableado |
| `descripcion` | string | No | - | `@IsOptional @IsString` | **Declarado, hoy NO cableado** -> se cablea (REQ-04) |
| `oferta` | boolean | No | `undefined` (= sin filtro) | `@IsOptional @IsBoolean` + transform de query string | **Declarado, hoy NO cableado** -> se cablea (REQ-04) |
| `proveedores` | string[] / number[] | No | - | Existente en el base | **Declarado, hoy NO cableado** -> se cablea (REQ-05) |
| `numero` | string | No | - | `@IsOptional @IsString` | **NUEVO** (REQ-02) |
| `referencias` | string | No | - | `@IsOptional @IsString` | **NUEVO** (REQ-02) |

Semántica de combinación: **todos los filtros se combinan en AND** (REQ-04, REQ-06). Un campo `undefined` no aporta cláusula. Un `oferta = false` explícito: definir si significa "no oferta" o "sin filtro"; la lectura del alcance es que solo `true` aporta `offer_is = 1`, y `false`/ausente no filtran. **Punto a decidir explícitamente en el spec de la task de backend**, porque cambia una aserción de test.

### 3.2 `ListItemsQueryDto extends CatalogItemsFilterDto` (existente, se extiende)

| Campo | Tipo | Obligatorio | Default | Validación | Estado |
|---|---|---|---|---|---|
| `page` | number | No | según implementación actual | Existente | Existente |
| `limit` | number | No | default actual del backend (< 100 según el hallazgo del ticket) | Existente | Existente. **No se cambia el default**; el front envía `limit` explícito (REQ-10) |
| `ids` | string (CSV en la wire) -> `string[]` (tras transform) | No | `undefined` | Ver 3.3 | **NUEVO** (REQ-03) |

### 3.3 Regla única de normalización de `ids` **[NUEVA, normativa]**

Orden obligatorio: **normalizar primero, validar después** (Adenda 1, punto 3; REQ-03).

1. `split(',')`
2. `trim()` de cada segmento
3. **descartar** segmentos vacíos
4. **recién entonces** `@IsUUID` sobre cada elemento restante

Tabla de verdad que los tests deben respetar (evita specs contradictorios):

| Entrada | Resultado | Efecto en la query |
|---|---|---|
| `ids=uuidA,uuidB` | `['uuidA','uuidB']`, total 2 | `whereIn i.uuid` con 2 |
| `ids=uuidA,,uuidB` | `['uuidA','uuidB']`, total 2, **sin 400** | `whereIn i.uuid` con 2 |
| `ids= uuidA , uuidB ` | `['uuidA','uuidB']`, total 2 | idem |
| `ids=no-es-uuid` | **400 Bad Request** | - |
| `ids=uuidA,no-es-uuid` | **400 Bad Request** | - |
| `ids=` | `undefined` | Sin filtro por ids |
| `ids=,,` | `undefined` | Sin filtro por ids |
| campo ausente | `undefined` | Sin filtro por ids |

### 3.4 Invariante de orden de la query paginada **[NUEVO como requisito, orden preexistente]**

No es un campo, es una propiedad del modelo de lectura (REQ-07):

- La clave de orden efectiva pasa a ser: **`<orden actual del listado>`, luego `i.id`** como desempate.
- Se **reutiliza** el orden que el listado ya aplica hoy; no se introduce un criterio nuevo.
- Motivo: con `LIMIT/OFFSET` y filtros que tocan tablas relacionadas, un orden no total permite que una misma fila aparezca en dos páginas o en ninguna.
- El fix de determinismo y su test de recorrido de páginas van en la **misma sesión** que introduce los filtros de referencias/proveedores.

### 3.5 Forma de la respuesta (existente, sin cambios)

El contrato de salida del listado (`data` + `total`, más los metadatos de paginación que ya expone) **no cambia**. Es condición de REQ-14 que `total` venga del server, y ya lo hace.

---

## 4. Contratos de front

### 4.1 `ItemsListParams` (existente, se extiende)

`front/jormat-front/src/services/api/inventario/items.ts`

| Campo | Tipo | Obligatorio | Serialización | Estado |
|---|---|---|---|---|
| `page`, `limit`, `search`, `marca`, `priority`, `categorias`, `aplicaciones` | según definición actual | No | **Sin cambios** (REQ-08) | Existente |
| `numero` | `string` | No | query param string | **NUEVO** |
| `descripcion` | `string` | No | query param string | **NUEVO** |
| `referencias` | `string` | No | query param string | **NUEVO** |
| `oferta` | `boolean` | No | `true`/`false`; omitir si `undefined` | **NUEVO** |
| `proveedores` | `string[]` | No | mismo formato que `categorias`/`aplicaciones` (consistencia obligatoria) | **NUEVO** |
| `ids` | `string[]` | No | **CSV** en un solo param `ids` | **NUEVO** |

Restricción: la serialización de los params existentes no se altera (REQ-08). `proveedores` copia el formato de los pivotes ya soportados en vez de inventar uno.

### 4.2 `useItemsByIds(ids)` **[NUEVO hook]**

Modelo de datos del hook:

| Elemento | Tipo | Comentario |
|---|---|---|
| Entrada `ids` | `string[]` (uuids) | Los IDs que el catálogo persiste |
| Loteo | lotes de **100** | Un request por lote |
| `limit` por request | **>= 100**, explícito | Nunca depender del default del backend (Adenda 1, punto 2; REQ-10) |
| Salida | items agregados de todos los lotes | Sin truncamiento silencioso |
| Estado | `isLoading` / `error` agregados de los lotes | Un lote fallido no debe reportarse como éxito parcial silencioso |

Nota de orden: la unión de lotes no garantiza el orden original de `ids`. Si alguna vista depende de ese orden, debe reordenarse en el hook contra el arreglo de entrada. **Decisión a fijar en la task del hook.**

### 4.3 `ItemsPickerTable` - contrato de props **[REDEFINIDO, breaking interno]**

Pasa de componente no controlado (recibe el universo, filtra y pagina adentro) a **controlado server-side** (REQ-09).

| Prop | Tipo | Obligatorio | Estado |
|---|---|---|---|
| items de la página vigente | `Item[]` | Sí | Redefinido (antes: universo completo) |
| `total` | `number` | Sí | **NUEVO** |
| `page` | `number` | Sí | **NUEVO** (antes: estado interno) |
| `pageCount` | `number` | Sí | **NUEVO** (antes: derivado interno) |
| valores de los 4 filtros por columna (`numero`, `descripcion`, `referencias`, `marca`) | `string` c/u | Sí | **NUEVO** como prop (antes: estado interno) |
| callbacks de cambio de página y de cada filtro | funciones | Sí | **NUEVO** |
| selección acumulada | `string[]` de uuids | Sí | Redefinido: debe **preservar items seleccionados que no están en la página vigente** |

**Invariante crítico del nuevo modelo:** la selección vive **fuera** de la página vigente. Antes, "seleccionado" podía derivarse del conjunto en memoria; ahora el conjunto en memoria es solo una página, así que la selección es estado propio, acumulativo, y no puede limpiarse al cambiar de página ni al cambiar un filtro.

**Restricción de atomicidad (Adenda 1, punto 1):** este contrato nuevo y la migración de su único consumidor `CrearCatalogoView` se ejecutan y cierran en la **misma sesión**. Ninguna frontera de sesión puede dejar el contrato nuevo con el consumidor viejo.

### 4.4 `CrearCatalogoView` - estado de filtros **[REDEFINIDO]**

| Elemento | Antes | Después |
|---|---|---|
| Fuente de items | `useItemsCatalog()` (universo, `fetchAllPages`) | `useItems({ page, limit, ...filtros })` |
| Filtros por columna | estado del hijo, aplicados en cliente | estado de la vista, enviados como params al server |
| "Generar catálogo" (marca / oferta / proveedores) | cliente | params server-side |
| Hidratación en edición | del universo cargado | `useItemsByIds(existing.items)` |
| Payload de guardado | IDs | **Sin cambios** (REQ-11) |

El catálogo persistido **sigue guardando solo IDs**. No cambia su forma de almacenamiento; lo que cambia es cómo se resuelven esos IDs a items.

### 4.5 `GenerarDesdeCatalogoView` **[REDEFINIDO]**

| Elemento | Antes | Después |
|---|---|---|
| Fuente | `useItemsCatalogCapped` (universo con tope) | `useItemsByIds(catalogo.items)` |
| Filtrado | cliente sobre universo topeado | cliente sobre el **subconjunto acotado**, reutilizando `filterCatalogItems` / `catalogFilters.ts` |
| Estado de truncado (flag + aviso al usuario) | Existía | **Se elimina del modelo de estado de la vista** (REQ-12) |

`filterCatalogItems` / `catalogFilters.ts` se conservan sin cambios de contrato: siguen operando sobre un arreglo en memoria, solo que ahora ese arreglo está acotado por construcción.

### 4.6 `useItemsCatalog` / `useItemsCatalogCapped`

Sin cambios de tipo. Se marcan `@deprecated` (**se marcan, no se eliminan**) **solo al final**, una vez migrados los dos consumidores productivos (REQ-13, Adenda 1 punto 5).

---

## 5. Notas de migración

1. **No hay migraciones de base de datos.** Ni DDL, ni backfill, ni cambio de enums, ni índices nuevos. Si alguna task propone una migración, es señal de que se salió del alcance.
2. **Compatibilidad de API:** todos los campos nuevos de DTO son opcionales. Un cliente que no los envía obtiene exactamente el comportamiento actual. No hay versionado de endpoint ni controller nuevo (REQ-06).
3. **Cambio observable de comportamiento sin cambio de contrato:** el ORDER BY gana un desempate por `i.id`. Para un consumidor que ya recibía un orden total esto es invisible; para uno que dependía del orden ambiguo actual, el orden entre empatados puede cambiar. Es la corrección buscada, no una regresión.
4. **Único breaking change:** el contrato de props de `ItemsPickerTable`. Es interno y tiene un solo consumidor productivo (`CrearCatalogoView`), migrado en la misma sesión. Los tests del componente se reescriben para el modelo controlado.
5. **Datos existentes:** ningún registro se modifica. Todo el ticket es lectura, salvo el guardado de catálogos, cuyo payload no cambia.
6. **Rutas canónicas** en cualquier `source_ref`: `backend/jormat-api/src/items/...` y `front/jormat-front/src/...` (Adenda 1, punto 6).

---

## 6. Puntos a verificar contra el código antes de implementar

Estos son los datos del modelo que el ticket describe funcionalmente pero no nombra con precisión. Verificar leyendo el repositorio, no asumir:

| Dato | Dónde verificarlo |
|---|---|
| Nombre exacto de la columna del **serial de display** en `items` | `items.repository.ts`, proyección del listado y filtro `search` actual |
| Forma exacta de `PivotFilterConfig` y nombres de tabla/columnas del pivote de **proveedores** | `items.repository.ts:85-102` (`CATEGORIA_PIVOT`, `APLICACION_PIVOT`) |
| Nombre de la FK de `item_references` hacia `items` | Entidad / migración de `item_references` |
| Orden actual del listado (a reutilizar, no reemplazar) | `items.repository.ts`, construcción de la query paginada |
| Default real de `limit` en `ListItemsQueryDto` | DTO del listado, para confirmar el riesgo que motiva REQ-10 |
| Semántica esperada de `oferta = false` | Consumidores actuales del DTO base y expectativa de producto |
| Formato de serialización de `categorias`/`aplicaciones` en el front | `services/api/inventario/items.ts`, para que `proveedores` lo copie |

---

## 7. Trazabilidad REQ -> elemento del modelo

| REQ | Elemento del modelo | Nuevo / Existente |
|---|---|---|
| REQ-01 | Ninguno (fix de UI, sin datos) | - |
| REQ-02 | `CatalogItemsFilterDto.numero`, `.referencias` | Campos nuevos en DTO existente |
| REQ-03 | `ListItemsQueryDto.ids` + regla de normalización (3.3) | Campo nuevo + regla nueva |
| REQ-04 | Lectura de serial de display, `i.ds_name`, `i.offer_is`, `item_references.ds_reference` | Columnas existentes, cableado nuevo |
| REQ-05 | `PROVEEDOR_PIVOT` sobre pivote existente | Constante nueva, tabla existente |
| REQ-06 | `whereIn i.uuid` | Columna existente, filtro nuevo |
| REQ-07 | Clave de orden con desempate por `i.id` | Invariante nuevo sobre PK existente |
| REQ-08 | `ItemsListParams` + 6 campos | Campos nuevos en tipo existente |
| REQ-09 | Props de `ItemsPickerTable` + selección acumulada | Contrato redefinido |
| REQ-10 | Loteo de 100 con `limit >= 100` en `useItemsByIds` | Hook nuevo |
| REQ-11 | Estado de filtros de `CrearCatalogoView`; payload de guardado intacto | Estado redefinido, payload existente |
| REQ-12 | Eliminación del estado de truncado; `filterCatalogItems` intacto | Estado eliminado, util existente |
| REQ-13 | Marca `@deprecated` en los dos hooks legacy | Anotación, sin cambio de tipo |
| REQ-14 | `total` del server + `limit <= 100` + lotes de 100 | Invariante transversal sobre contratos existentes y nuevos |