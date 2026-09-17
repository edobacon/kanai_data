# Modelo de Datos — JOR-165: Paginación server-side + filtros en listados de items del catálogo

## Resumen ejecutivo

**No hay cambios de esquema de base de datos.** El ticket es wiring aditivo: se cablean filtros sobre tablas y columnas que **ya existen**, se agregan campos a DTOs (contratos de transporte, no persistencia) y se introduce un endpoint de batch-get. **No hay migraciones, tablas nuevas, columnas nuevas ni cambios de constraints.**

El "modelo de datos afectado" de este ticket vive en tres capas:

1. **Persistencia (SQL)** — todo EXISTENTE; se documenta lo que los nuevos filtros tocan y qué índices convendría verificar.
2. **Contratos de transporte (DTOs backend)** — campos NUEVOS aditivos, todos opcionales.
3. **Modelos de cliente (tipos de front)** — params NUEVOS y el contrato de props de `ItemsPickerTable`.

Leyenda: **[EXISTENTE]** = ya está en el codebase, no se toca · **[NUEVO]** = se agrega en este ticket · **[MODIFICADO]** = existe y cambia su forma o comportamiento.

---

## 1. Capa de persistencia (SQL) — sin cambios de esquema

### 1.1 Entidad `items` (alias `i`) — **[EXISTENTE]**

Tabla raíz del listado. Ningún campo se agrega ni se altera. Los campos relevantes para este ticket:

| Campo | Tipo | Obligatorio | FK / Índice | Notas para JOR-165 |
|---|---|---|---|---|
| `id` | integer (PK, autoincrement) | Sí | PK | **[EXISTENTE]** Clave de desempate del ORDER BY determinista (REQ-04). Es la PK física, monotónica y única: garantiza orden total. |
| `uuid` | uuid / string | Sí | UNIQUE | **[EXISTENTE]** Identificador público. Es la clave del batch-get: `whereIn('i.uuid', ids)` (REQ-05). Los `ids` que llegan del front son estos uuid. |
| `ds_name` | string | Sí | — | **[EXISTENTE]** Descripción del item. Target del filtro `descripcion` (`whereILike i.ds_name`, REQ-03). |
| `offer_is` | boolean / tinyint(1) | Sí | default `0` | **[EXISTENTE]** Flag de oferta. Target del filtro `oferta` (`i.offer_is = 1`, REQ-03). Ojo: el filtro solo se aplica cuando `oferta === true`; `oferta === false` **no** debe traducirse a `offer_is = 0` salvo que el contrato actual del DTO base ya lo defina así (ver Riesgo R-3). |
| campos del serial de display | según composición actual | — | — | **[EXISTENTE]** Target del filtro `numero` (substring del serial de display, REQ-03). Ver nota crítica 1.5. |

> **No se agrega ninguna columna a `items`.**

### 1.2 Entidad `item_references` — **[EXISTENTE]**

| Campo | Tipo | Obligatorio | FK / Índice | Notas para JOR-165 |
|---|---|---|---|---|
| `id` | integer (PK) | Sí | PK | **[EXISTENTE]** |
| `item_id` | integer | Sí | **FK → `items.id`** | **[EXISTENTE]** Clave de correlación del `whereExists`. |
| `ds_reference` | string | Sí | — | **[EXISTENTE]** Target del filtro `referencias` (substring, REQ-03). |

**Cardinalidad:** `items` 1 ─── N `item_references`.

**Acceso en JOR-165:** vía `whereExists` correlacionado, **no** vía `join`. Esto es una decisión de modelo relevante: un `join` a una tabla N produciría filas duplicadas del item padre, lo que rompe `total` (cuenta inflada) y rompe la paginación (un item aparece dos veces en una página). El `whereExists` es semi-join: filtra sin multiplicar cardinalidad. **Esta es la razón por la que el ticket especifica `whereExists` y no `join`.**

### 1.3 Pivotes N:M — **[EXISTENTE]** (patrón), **[NUEVO]** (constante `PROVEEDOR_PIVOT`)

El repositorio ya tiene dos descriptores de pivote (`items.repository.ts:85-102`) consumidos por `applyPivotFilter`. Se agrega un tercero, gemelo, para proveedores. **La tabla pivote de proveedores ya existe en la DB**; lo nuevo es únicamente la constante en código que la describe.

| Descriptor | Tabla pivote | FK a item | FK a dimensión | Estado |
|---|---|---|---|---|
| `CATEGORIA_PIVOT` | pivote item↔categoría | `item_id` → `items.id` | `categoria_id` → tabla de categorías | **[EXISTENTE]** |
| `APLICACION_PIVOT` | pivote item↔aplicación | `item_id` → `items.id` | `aplicacion_id` → tabla de aplicaciones | **[EXISTENTE]** |
| `PROVEEDOR_PIVOT` | pivote item↔proveedor | `item_id` → `items.id` | `proveedor_id` → tabla de proveedores | **[NUEVO — solo la constante en código; la tabla y sus FK ya existen]** |

**Requisito de implementación:** `PROVEEDOR_PIVOT` debe declararse con **exactamente la misma forma** que sus dos gemelos (mismos nombres de propiedad, mismo shape), porque `applyPivotFilter` es genérico y consume ese contrato. Cualquier divergencia de shape es un bug silencioso: el filtro compila y no filtra, o filtra por la columna equivocada.

**Verificación previa obligatoria antes de escribir la constante:** leer el DDL/migración real de la tabla pivote de proveedores y confirmar los nombres exactos de tabla y de ambas columnas FK. No inferirlos por simetría con categorías/aplicaciones — la nomenclatura de pivotes suele ser inconsistente entre dimensiones agregadas en momentos distintos.

**Cardinalidad:** `items` N ─── M `proveedores` (a través del pivote).

**Acceso en JOR-165:** `applyPivotFilter` — igual que las otras dos dimensiones. Si su implementación actual usa `whereExists`/subconsulta, hereda la propiedad de no multiplicar cardinalidad. **Si usa `join`, el filtro de proveedores inflará `total` y romperá la paginación** cuando un item tenga más de un proveedor. Esto debe verificarse leyendo `applyPivotFilter` antes de implementar; ver Riesgo R-1, que es el riesgo principal de todo el ticket.

### 1.4 Diagrama de relaciones (todo existente)

```
                        ┌─────────────────┐
                        │     items       │
                        │  id (PK)        │
                        │  uuid (UNIQUE)  │
                        │  ds_name        │
                        │  offer_is       │
                        │  …serial        │
                        └────────┬────────┘
                                 │ 1
              ┌──────────────────┼──────────────────┐
              │ N                │ N                │ N
   ┌──────────┴────────┐  ┌──────┴───────┐  ┌───────┴────────┐
   │ item_references   │  │ pivote       │  │ pivote         │
   │  item_id (FK)     │  │ categorías   │  │ aplicaciones   │
   │  ds_reference     │  │ item_id (FK) │  │ item_id (FK)   │
   └───────────────────┘  └──────┬───────┘  └───────┬────────┘
                                 │ M                │ M
                          ┌──────┴───────┐  ┌───────┴────────┐
                          │ categorías   │  │ aplicaciones   │
                          └──────────────┘  └────────────────┘
              │ N
   ┌──────────┴────────┐
   │ pivote proveedores│  ← tabla EXISTENTE; NUEVO solo el
   │  item_id (FK)     │     descriptor PROVEEDOR_PIVOT en código
   │  proveedor_id (FK)│
   └──────────┬────────┘
              │ M
   ┌──────────┴────────┐
   │   proveedores     │
   └───────────────────┘
```

### 1.5 Nota crítica: el filtro `numero` y el "serial de display"

El ticket define `numero` como *"substring del serial de display"*. Esto es la única pieza del modelo con ambigüedad real y **debe resolverse leyendo la proyección del listado antes de implementar**, porque determina si el filtro es viable en SQL:

- **Caso A — el serial de display es una columna física de `items`.** El filtro es un `whereILike` directo sobre esa columna. Trivial, indexable con prefijo.
- **Caso B — el serial de display se compone en SQL** (concatenación de columnas, `CONCAT`/`||`, padding, prefijo). El filtro debe replicar **la misma expresión** de la proyección dentro del `WHERE`. Duplicar la expresión es frágil: si la proyección cambia, el filtro se desincroniza silenciosamente (el usuario ve un serial y busca por él sin resultados). Mitigación: extraer la expresión a un único helper/constante reutilizado por proyección y filtro.
- **Caso C — el serial de display se compone en la capa de servicio/front** (fuera de SQL). Entonces **no es filtrable server-side sin cambio de modelo**, y el ticket tendría un supuesto roto. Salida: filtrar sobre las columnas base que componen el serial, aceptando que la semántica del substring no es idéntica a la del serial renderizado — y decirlo explícitamente al usuario.

**Supuesto bajo el que se produce este documento:** Caso A o B (el ticket afirma que es wiring aditivo sin migraciones, lo que implica que el dato es alcanzable en SQL). **Si al implementar resulta ser el Caso C, hay que detenerse y reportar**, no improvisar una aproximación silenciosa.

### 1.6 Índices — **[EXISTENTES]**, con verificación recomendada

**No se crea ningún índice en este ticket** (no hay migraciones en alcance). Pero el ticket cambia el perfil de carga: pasa de "traer todo una vez y filtrar en memoria" a "filtrar en SQL en cada tecla/página" sobre 13.575 items. Vale documentar el impacto para una decisión informada:

| Índice / acceso | Estado | Impacto del cambio |
|---|---|---|
| `items.id` (PK) | **[EXISTENTE]** | El desempate del ORDER BY (REQ-04) lo usa. Sin costo adicional. |
| `items.uuid` (UNIQUE) | **[EXISTENTE]** | El `whereIn` del batch-get lo aprovecha. ~100 uuid contra un índice único: barato. |
| `item_references.item_id` | **[EXISTENTE si la FK generó índice]** | Lo usa la correlación del `whereExists`. **Verificar que existe**: en MySQL, una FK crea índice automáticamente; en PostgreSQL **no**. Sin él, el `whereExists` degrada a scan por cada item candidato. |
| Pivote proveedores `item_id` | **[EXISTENTE si la FK generó índice]** | Misma consideración. |
| `items.ds_name` | **[EXISTENTE / probablemente sin índice útil]** | `whereILike '%texto%'` con comodín inicial **no usa índice B-tree**. Es scan sobre 13.575 filas. A este volumen es aceptable (decenas de ms); no justifica un índice de texto completo hoy. **Se documenta como deuda consciente, no se resuelve aquí.** |
| Serial de display (`numero`) | **[EXISTENTE / depende del Caso A-B-C]** | Si es Caso B (expresión compuesta), el filtro es **no indexable por definición**: scan garantizado. Mismo veredicto: aceptable a 13.575 filas, se documenta. |

**Recomendación (fuera de alcance, para decisión del usuario):** no agregar índices en este ticket. A 13.575 filas el scan es barato y agregar índices ahora es optimización prematura sin medición. Reevaluar si el volumen crece un orden de magnitud (>100k) o si el listado se instrumenta y muestra latencia real. Lo que **sí** conviene verificar en este ticket, porque es corrección y no optimización, es que los `item_id` de `item_references` y del pivote de proveedores estén indexados: sin eso, los filtros nuevos degradan de forma no lineal.

---

## 2. Contratos de transporte (DTOs backend)

### 2.1 `CatalogItemsFilterDto` (base) — **[EXISTENTE, sin cambios]**

`backend/jormat-api/src/items/dto/catalog-items-filter.dto.ts`

| Campo | Tipo | Obligatorio | Estado en DTO | Estado en `applyFilters` |
|---|---|---|---|---|
| `search` | string | No | **[EXISTENTE]** | **[EXISTENTE]** ya cableado |
| `descripcion` | string | No | **[EXISTENTE]** | **[NUEVO cableado]** REQ-03 |
| `marca` | string | No | **[EXISTENTE]** | **[EXISTENTE]** ya cableado |
| `oferta` | boolean | No | **[EXISTENTE]** | **[NUEVO cableado]** REQ-03 |
| `categorias` | string[] | No | **[EXISTENTE]** | **[EXISTENTE]** ya cableado |
| `aplicaciones` | string[] | No | **[EXISTENTE]** | **[EXISTENTE]** ya cableado |
| `proveedores` | string[] | No | **[EXISTENTE]** | **[NUEVO cableado]** REQ-03 |

**Punto clave del hallazgo del ticket:** estos campos **ya se declaran y ya se validan**; la API ya los acepta y hoy los **ignora en silencio**. El cliente que hoy manda `?oferta=true` recibe 200 con el universo sin filtrar. Eso es lo que se corrige. **No se redeclaran** (REQ-02): redeclararlos en la subclase duplicaría decoradores de validación y transformación con riesgo de divergencia.

### 2.2 `ListItemsQueryDto` — **[MODIFICADO: 2 campos nuevos]**

`extends CatalogItemsFilterDto`. Se agregan únicamente:

| Campo | Tipo | Obligatorio | Default | Validación / transformación | Estado |
|---|---|---|---|---|---|
| `numero` | string | No | — | trim; **vacío tras trim ⇒ ausente** (`undefined`) | **[NUEVO]** REQ-02 |
| `referencias` | string | No | — | trim; **vacío tras trim ⇒ ausente** (`undefined`) | **[NUEVO]** REQ-02 |

**Regla de normalización (REQ-02, invariante de ambos campos):** `"  "` (solo espacios) debe llegar a `applyFilters` como `undefined`, **no** como `""`. Si llegara como `""`, un `whereILike '%%'` es un no-op inofensivo, pero un futuro `whereILike` sobre igualdad, o una condición `if (numero)` mal escrita en otro punto, cambia semántica. Normalizar en el DTO (una vez, en el borde) y no en cada consumidor.

**Convivencia con `search` — decisión que el ticket no resuelve explícitamente:** ahora hay dos caminos hacia campos posiblemente solapados (`search` global vs `descripcion`/`numero`/`referencias` por columna). El ticket especifica que todos los filtros nuevos van **en AND** con lo existente (REQ-03), lo que implica que `search` y los filtros por columna **se acumulan restrictivamente**. Es la interpretación correcta y la que se asume aquí; conviene que los tests la fijen explícitamente (un caso con `search` + `descripcion` simultáneos y aserción sobre `total`), porque es exactamente el tipo de comportamiento que un refactor futuro rompe sin darse cuenta.

**Paginación — [EXISTENTE]:** `page` / `limit` ya existen en el contrato del listado. REQ-13 fija el invariante `limit <= 100`. **Verificar que ese tope esté efectivamente validado en el DTO** (`@Max(100)` o equivalente): si hoy el tope no existe y solo se respeta por convención del cliente, un `?limit=99999` reabre exactamente el problema de "cargar el universo" que este ticket viene a cerrar, ahora desde el borde HTTP. Es una línea de defensa barata y pertenece a este ticket por REQ-13.

### 2.3 `ItemsByIdsBodyDto` — **[NUEVO]**

DTO del body de `POST /items/by-ids` (REQ-06).

| Campo | Tipo | Obligatorio | Default efectivo | Estado |
|---|---|---|---|---|
| `ids` | string[] (uuid) | No | ausente ⇒ colección vacía | **[NUEVO]** |

**Pipeline de normalización — el orden es normativo y es la sustancia del REQ-06:**

```
1. trim de cada elemento
2. descarte de vacíos
3. dedupe
4. RECIÉN DESPUÉS: @IsUUID por elemento (each: true)
```

**Por qué el orden importa y no es un detalle de estilo:** si `@IsUUID` corre antes del trim, `" 550e8400-… "` (con espacio, trivialmente producible por un copiar/pegar o por serialización del cliente) es un uuid válido que la validación rechaza con 400. El usuario ve un error inexplicable en una operación que debería funcionar. Con el orden correcto, ese elemento se normaliza y pasa. Simétricamente, el dedupe antes de validar evita reportar el mismo elemento inválido N veces.

**Contrato de resultado (REQ-06) — invariante de seguridad, no de conveniencia:**

| Entrada | Resultado |
|---|---|
| `ids` ausente | `{ data: [], total: 0 }` — **nunca el universo** |
| `ids: []` | `{ data: [], total: 0 }` |
| `ids: ["  ", ""]` (todo vacío tras normalizar) | `{ data: [], total: 0 }` |
| `ids: ["no-es-uuid"]` (sobrevive a normalizar, no es uuid) | **400** |
| `ids` con uuid válidos, algunos inexistentes en DB | `data` con los existentes; `total` = cantidad **encontrada**, no la pedida |

El renglón "nunca el universo" merece énfasis: es el modo de fallo peligroso. Un `whereIn('i.uuid', [])` mal manejado (o un `if (ids?.length)` que envuelve el `whereIn` y lo omite cuando está vacío) devuelve **13.575 items** en lugar de cero. Ese caso debe tener test explícito, no confianza en la implementación. Es la diferencia entre un endpoint de batch-get y un endpoint de volcado completo accesible por un body vacío.

**Divergencia deliberada `total` pedido vs encontrado:** si el front pide 100 ids y 3 fueron borrados, `total` es 97. El front (REQ-08, "devuelve los items existentes") debe tolerarlo. Esto importa en `CrearCatalogoView` en edición: un catálogo guardado puede referenciar items eliminados, y la vista debe hidratar con lo que existe sin romper. **Vale un test de front sobre este caso**, porque es un escenario real (borrado de items) y silencioso.

### 2.4 `applyFilters` — matriz de cableado

`backend/jormat-api/src/items/items.repository.ts:1123`. Todos los filtros nuevos se componen **en AND**.

| Filtro | Predicado SQL | Tabla tocada | Multiplica cardinalidad | Estado |
|---|---|---|---|---|
| `search` | (existente) | `items` | No | **[EXISTENTE]** |
| `marca` | (existente) | `items` | No | **[EXISTENTE]** |
| `priority` | (existente) | `items` | No | **[EXISTENTE]** |
| `categorias` | `applyPivotFilter(CATEGORIA_PIVOT)` | pivote | según `applyPivotFilter` | **[EXISTENTE]** |
| `aplicaciones` | `applyPivotFilter(APLICACION_PIVOT)` | pivote | según `applyPivotFilter` | **[EXISTENTE]** |
| `descripcion` | `whereILike i.ds_name` | `items` | No | **[NUEVO]** |
| `numero` | substring sobre serial de display | `items` | No | **[NUEVO]** |
| `referencias` | `whereExists` sobre `item_references.ds_reference` | `item_references` | **No** (semi-join) | **[NUEVO]** |
| `oferta` | `i.offer_is = 1` | `items` | No | **[NUEVO]** |
| `proveedores` | `applyPivotFilter(PROVEEDOR_PIVOT)` | pivote | **según `applyPivotFilter` — verificar** | **[NUEVO]** |
| `ids` | — | — | — | **NO se cablea** (REQ-03/REQ-05) |

**`ids` fuera de `applyFilters` — no es arbitrario.** Mantener el batch-get fuera del pipeline de filtros evita que `ids` se combine accidentalmente con filtros de columna (un `by-ids` que además filtrara por `oferta` devolvería menos items de los pedidos y rompería la hidratación del catálogo en edición: el usuario abriría su catálogo y vería items faltantes). El batch-get es una operación de **resolución de identidad**, no de búsqueda: `whereIn` + proyección + ORDER BY, sin filtros.

### 2.5 ORDER BY determinista — **[MODIFICADO]** (REQ-04)

**Modelo del orden:** `<orden actual del listado>` + `i.id ASC` como último criterio.

**Por qué es requisito de corrección y no cosmético.** `LIMIT/OFFSET` sin orden total es **no determinista**: el motor puede devolver filas en orden distinto entre dos ejecuciones de la misma consulta. Con un orden por un campo no único (por ejemplo `ds_name`), dos items con el mismo nombre pueden intercambiarse entre la consulta de la página 1 y la de la página 2 — el usuario ve un item repetido en la página 2 y **nunca ve otro**. Al paginar para armar un catálogo, eso significa un item que el usuario no puede seleccionar porque no aparece en ninguna página. Es un bug de pérdida de datos desde la perspectiva del usuario, no un detalle de presentación.

`i.id` es la elección correcta como desempate: PK, único, no nulo, estable. Cualquier otro campo reintroduce el problema.

**Alcance del ORDER BY (importante):** aplica a **ambas** consultas — el listado paginado y el batch-get (REQ-05 exige que `by-ids` reutilice el mismo ORDER BY). En el batch-get no hay riesgo de paginación, pero el orden estable evita que la hidratación del catálogo en edición reordene la selección entre cargas, lo que el usuario percibiría como que "la lista se mueve sola".

**Restricción de secuencia (del ticket, y es correcta):** el ORDER BY y su test de recorrido de páginas van en la **misma sesión** que introduce los joins/filtros. Separarlos deja una ventana donde los filtros nuevos existen sin orden total: exactamente la combinación que produce el bug. El test de regresión debe ser *recorrer todas las páginas con un filtro de referencias o proveedores activo y verificar que la unión de páginas no tiene duplicados y su tamaño es igual a `total`* — no basta con verificar que la página 1 se ve bien.

---

## 3. Modelos de cliente (front)

### 3.1 `ItemsListParams` — **[MODIFICADO: 5 campos nuevos]**

`front/jormat-front/src/services/api/inventario/items.ts` (REQ-07)

| Campo | Tipo | Obligatorio | Transporte | Estado |
|---|---|---|---|---|
| `page` | number | No | query string | **[EXISTENTE]** |
| `limit` | number | No | query string | **[EXISTENTE]** — `<= 100` (REQ-13) |
| `search` | string | No | query string | **[EXISTENTE]** |
| `marca` | string | No | query string | **[EXISTENTE]** |
| `categorias` | string[] | No | query string | **[EXISTENTE]** |
| `aplicaciones` | string[] | No | query string | **[EXISTENTE]** |
| `numero` | string | No | query string | **[NUEVO]** |
| `descripcion` | string | No | query string | **[NUEVO]** |
| `referencias` | string | No | query string | **[NUEVO]** |
| `oferta` | boolean | No | query string | **[NUEVO]** |
| `proveedores` | string[] | No | query string | **[NUEVO]** |
| `ids` | — | — | — | **NO se agrega** (REQ-07) — va por el batch-get |

### 3.2 Función de batch-get — **[NUEVA]**

Función **aparte** de `listItems` (REQ-07). Firma conceptual: `(ids: string[]) => Promise<{ data: Item[]; total: number }>`, `POST /items/by-ids`, `{ ids }` en body JSON.

**Por qué función aparte y no un parámetro de `listItems`.** Son dos operaciones con verbo HTTP distinto (POST vs GET), semántica distinta (resolución de identidad vs búsqueda paginada) y contrato de resultado distinto (conjunto completo vs página). Fusionarlas produciría una función con parámetros mutuamente excluyentes y un `if` que elige el verbo — el tipo de firma que invita a llamarla mal (`listItems({ ids, page: 2 })` no tiene significado).

**Por qué POST con body y no GET con query string.** ~100 uuid ≈ 3,8 KB de query string. No es un límite del estándar HTTP sino de la infraestructura: WAF, ingress y proxies del edge de producción cortan query strings largos, típicamente entre 2 y 8 KB según el componente. El modo de fallo es el peor posible: **funciona en desarrollo y falla en producción**, con un 414/400 del edge que ni siquiera llega a la aplicación (sin log en el backend, sin traza). Un POST con body elimina el límite y resuelve el conjunto en un request. La objeción de purismo REST (un POST que lee) es real pero menor frente a un fallo dependiente del entorno.

### 3.3 `useItemsByIds(ids)` — **[NUEVO]** (REQ-08)

| Aspecto | Contrato |
|---|---|
| Entrada | `ids: string[]` |
| Request | **Uno solo**, POST con todos los ids en body. **Sin loteo.** |
| `ids` vacío | **Ningún request.** Devuelve colección vacía. |
| Salida | Items **existentes** (puede ser menos que `ids.length`; ver 2.3) |

**"Sin lotear" es requisito, no preferencia.** El loteo existía únicamente para esquivar el límite de URL del GET; con body, su única razón desaparece. Mantenerlo agregaría N requests, N estados de carga parciales y la necesidad de reensamblar y reordenar resultados en el cliente — complejidad sin beneficio.

**Punto de implementación con riesgo real:** la clave de caché/dependencia del hook depende de un **array**. Si `ids` se pasa como literal recreado en cada render, la identidad referencial cambia siempre y el hook dispara un request por render — un loop de requests contra un endpoint POST que resuelve 100 items. Debe estabilizarse (memo sobre el contenido, o serialización ordenada como clave). **Es el error más probable de esta parte del ticket y conviene cubrirlo con test.** Nota adicional: si se usa el contenido ordenado como clave, hacerlo de forma determinista — el mismo conjunto de ids en distinto orden debe producir la misma clave, o se pierde el hit de caché.

### 3.4 `ItemsPickerTable` — contrato de props **[MODIFICADO: cambio de contrato, breaking]**

De tabla no controlada (recibe universo, filtra y pagina en cliente) a **tabla controlada server-side** (REQ-09).

| Prop | Tipo | Dirección | Estado |
|---|---|---|---|
| items de la página vigente | `Item[]` | entrada | **[MODIFICADO]** antes: universo completo |
| `total` | number | entrada | **[NUEVO]** provisto por el server (REQ-13), **no** derivado de `items.length` |
| `page` | number | entrada | **[NUEVO]** controlado |
| `pageCount` | number | entrada | **[NUEVO]** controlado |
| valores de los 4 filtros por columna | string / boolean | entrada | **[MODIFICADO]** antes: estado interno |
| callbacks de cambio de filtro | función | salida | **[NUEVO]** |
| callback de cambio de página | función | salida | **[NUEVO]** |
| selección acumulada | `Set<string>` / equivalente | estado | **[MODIFICADO]** debe **sobrevivir** al cambio de página |

**Invariante crítico de este componente — la selección.** Con el universo en cliente, la selección "sobrevivía" gratis: los items nunca desaparecían del array. Server-side, los items de la página 1 **ya no están en memoria** al ver la página 2. Si la selección se modela como "items seleccionados del array actual" (por ejemplo, filtrando `items` por un flag), **se pierde en silencio al paginar**: el usuario selecciona 20 items en la página 1, va a la página 2, vuelve, y su selección desapareció — sin error, sin aviso.

**Consecuencia de modelado, y es la decisión central del componente:** la selección debe modelarse como un **conjunto de ids desacoplado de los items cargados** (`Set<string>` de uuid), no como una propiedad derivada de la página vigente. El renderizado de checkboxes consulta `seleccion.has(item.uuid)`; agregar y quitar operan sobre el Set. Ese Set es también el que alimenta el payload de guardado (que no cambia, REQ-10) y la hidratación por `useItemsByIds` en edición.

Corolario del mismo desacople: el contador de "N items seleccionados" sale de `seleccion.size`, y **`total` es el del server** — nunca `items.length`, que ahora vale como mucho `limit` (REQ-13). Confundirlos haría que la UI muestre "100 items" sobre una base de 13.575.

**Riesgo de contrato (por eso la restricción de sesión atómica del ticket):** este cambio de props es **breaking**. `ItemsPickerTable` con el contrato nuevo y `CrearCatalogoView` con el viejo = builder roto. Por eso ambos van en la misma sesión, cerrada. Antes de implementar corresponde verificar por Grep si `ItemsPickerTable` tiene **otros consumidores** además de `CrearCatalogoView`: el ticket asume que no, y si aparece un tercero, el alcance de la sesión atómica crece y hay que reportarlo antes de empezar.

### 3.5 Hooks deprecados — **[MODIFICADO: solo anotación]** (REQ-12)

| Hook | Cambio | Momento |
|---|---|---|
| `useItemsCatalog` | `@deprecated` (anotación) | **Solo al final**, tras migrar `CrearCatalogoView` y `GenerarDesdeCatalogoView` |
| `useItemsCatalogCapped` | `@deprecated` (anotación) | Ídem |

**Su comportamiento no cambia y no se eliminan.** Marcar antes de migrar produciría warnings de deprecación en código que aún los usa legítimamente — ruido que entrena al equipo a ignorar los avisos de deprecación, que es peor que no tenerlos.

---

## 4. Notas de migración

### 4.1 Migraciones de base de datos

**Ninguna.** Sin `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX` ni backfill. Sin ventana de despliegue especial, sin plan de rollback de datos.

### 4.2 Compatibilidad del contrato de API

| Cambio | Tipo | Rompe clientes existentes |
|---|---|---|
| `numero` / `referencias` en el DTO del listado | aditivo, opcional | No |
| Cableado de `descripcion` / `oferta` / `proveedores` | **cambio de comportamiento** | Ver abajo |
| `POST /items/by-ids` | endpoint nuevo | No |
| ORDER BY determinista | cambio de orden observable | Ver abajo |

**Los dos renglones no triviales:**

1. **Cableado de filtros que ya se aceptaban y se ignoraban.** Un cliente que hoy envía `?oferta=true` recibe el universo; tras el cambio recibe solo ofertas. Eso es **el fix**, pero es un cambio de comportamiento observable, no puramente aditivo. Corresponde verificar con Grep si algún consumidor actual manda `descripcion`, `oferta` o `proveedores` a `GET /items` **apoyándose (aun sin saberlo) en que se ignoran**. El ticket declara que `ItemSearchPanel` e `ItemsListView` no se modifican y solo se verifica no-regresión (REQ-14) — **esta es precisamente la verificación que corresponde hacer sobre ellos**: no basta con confirmar que heredan el fix de `Pagination`; hay que confirmar qué params envían hoy. Si alguno envía uno de los tres campos recién cableados, su resultado cambiará sin que se haya tocado una línea de su código. Es el riesgo de regresión menos visible del ticket, porque no hay diff donde buscarlo.

2. **ORDER BY determinista.** Puede alterar el orden observado de filas empatadas respecto de hoy. Es el comportamiento correcto (hoy el orden es no determinista, así que "el orden actual" no es una garantía que alguien pueda tener legítimamente), pero si algún test existente asume un orden concreto de items empatados, fallará. Ese fallo es **preexistente latente** (el test dependía de suerte del motor), no introducido — clasificarlo así al reportarlo, y corregir el test, no el ORDER BY.

### 4.3 Riesgos de modelo, ordenados por probabilidad × impacto

| Id | Riesgo | Dónde | Impacto | Mitigación |
|---|---|---|---|---|
| **R-1** | `applyPivotFilter` usa `join` en vez de subconsulta ⇒ filtrar por `proveedores` duplica items multi-proveedor: `total` inflado, filas repetidas entre páginas | `items.repository.ts:85-102` + `applyPivotFilter` | **Alto** — corrompe paginación y `total`; ya afectaría hoy a `categorias`/`aplicaciones`, este ticket solo lo haría más visible | **Leer `applyPivotFilter` antes de escribir `PROVEEDOR_PIVOT`.** Test explícito: item con 2+ proveedores, filtrar, aseverar que aparece **una** vez y que `total` es exacto. Si usa `join`, el arreglo excede el alcance declarado ⇒ reportar antes de tocar |
| **R-2** | El serial de display no es alcanzable en SQL (Caso C de 1.5) | `applyFilters`, filtro `numero` | **Alto** — invalida un supuesto del ticket | Resolver leyendo la proyección **antes de estimar**. Si es Caso C, detenerse y reportar |
| **R-3** | `oferta: false` interpretado como `offer_is = 0` en vez de "sin filtro" | `applyFilters`, filtro `oferta` | Medio — oculta items sin marcar | Definir la semántica de tri-estado (`true` / `false` / ausente) **en el test** antes de implementar; alinear con lo que el DTO base ya hace con el booleano |
| **R-4** | `whereIn('i.uuid', [])` degenerado ⇒ devuelve el universo | repositorio, batch-get | **Alto** — fuga de datos masiva por body vacío | Guard explícito + test dedicado por cada entrada vacía de la tabla en 2.3 |
| **R-5** | `ids` como array inestable ⇒ loop de requests | `useItemsByIds` | Medio — martillea el endpoint | Estabilizar la clave de dependencia (memo o serialización ordenada determinista) + test |
| **R-6** | Selección derivada de la página vigente ⇒ se pierde al paginar | `ItemsPickerTable` | **Alto** — pérdida silenciosa de trabajo del usuario | Modelar como `Set<string>` desacoplado (3.4) + test de recorrido de páginas preservando selección |
| **R-7** | `limit` sin tope validado en el DTO ⇒ `?limit=99999` reabre la carga del universo | DTO del listado | Medio | Verificar/agregar el tope `<= 100` (REQ-13) |
| **R-8** | Un consumidor no migrado enviaba `descripcion`/`oferta`/`proveedores` confiando en que se ignoraban | `ItemSearchPanel`, `ItemsListView`, otros | Medio — regresión sin diff donde buscarla | Grep de los tres nombres en el front antes de cerrar el backend (4.2, punto 1) |
| **R-9** | `ItemsPickerTable` tiene un consumidor además de `CrearCatalogoView` | front | Medio — la sesión atómica queda incompleta | Grep de consumidores **antes** de abrir la sesión atómica |

### 4.4 Orden de ejecución impuesto por el modelo

Derivado de las dependencias reales entre las piezas, no de preferencia:

1. **Verificaciones previas** (R-1, R-2, R-8, R-9): leer `applyPivotFilter`, la proyección del serial, los consumidores de los tres filtros recién cableados y los de `ItemsPickerTable`. **Bloqueante:** R-1 y R-2 pueden invalidar supuestos del ticket, y descubrirlos a mitad de la implementación cuesta mucho más que un Grep.
2. **Backend — filtros + ORDER BY + tests**, en una sola sesión (restricción del ticket; los joins sin orden total producen el bug de paginación).
3. **Backend — `POST /items/by-ids`**: DTO + controller + service + repositorio + tests de las cinco entradas de la tabla 2.3.
4. **Front — capa de servicios**: `ItemsListParams` + función de batch-get. Sin consumidores todavía; no rompe nada.
5. **Front — `useItemsByIds`.**
6. **Front — `ItemsPickerTable` + `CrearCatalogoView`**, en una sola sesión (**unidad atómica**, restricción del ticket: contratos acoplados y breaking).
7. **Front — `GenerarDesdeCatalogoView`.**
8. **Front — `@deprecated`** en ambos hooks, **solo ahora** (REQ-12).
9. **Fix de `Pagination`** (REQ-01): independiente de todo lo anterior y de una línea. Puede ir primero — de hecho **conviene**, porque es el fix del bug reportado y entrega valor al usuario sin depender de las 8 fases restantes.

---

## 5. Tabla resumen: qué es nuevo

| Elemento | Capa | Estado | REQ |
|---|---|---|---|
| Tablas, columnas, FK, constraints | SQL | **Todo EXISTENTE — cero cambios** | — |
| Índices | SQL | **Ninguno nuevo** — verificar `item_id` en `item_references` y pivote proveedores | — |
| `PROVEEDOR_PIVOT` (constante descriptora) | código | **NUEVO** (la tabla ya existe) | REQ-03 |
| `numero`, `referencias` en `ListItemsQueryDto` | DTO | **NUEVO** | REQ-02 |
| Cableado de `descripcion`, `oferta`, `proveedores` | repositorio | **NUEVO** (campos ya existían en DTO) | REQ-03 |
| Cableado de `numero`, `referencias` | repositorio | **NUEVO** | REQ-03 |
| Desempate `i.id` en ORDER BY | repositorio | **MODIFICADO** | REQ-04 |
| `POST /items/by-ids` (controller + service + repo) | API | **NUEVO** | REQ-05 |
| `ItemsByIdsBodyDto` | DTO | **NUEVO** | REQ-06 |
| `numero`/`descripcion`/`referencias`/`oferta`/`proveedores` en `ItemsListParams` | front | **NUEVO** | REQ-07 |
| Función de batch-get (servicios) | front | **NUEVO** | REQ-07 |
| `useItemsByIds` | front | **NUEVO** | REQ-08 |
| Contrato de props de `ItemsPickerTable` | front | **MODIFICADO — breaking** | REQ-09 |
| Selección como `Set<string>` desacoplado | front | **MODIFICADO** | REQ-09 |
| `type="button"` en `Pagination` | front | **MODIFICADO** | REQ-01 |
| `@deprecated` en los 2 hooks | front | **MODIFICADO — solo anotación** | REQ-12 |