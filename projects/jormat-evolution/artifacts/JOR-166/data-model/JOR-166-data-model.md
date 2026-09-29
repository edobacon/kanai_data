# Modelo de datos - JOR-166 (listado canonico de Ventas / Facturas clientes)

> Alcance: slice ejecutable de la Iteracion 1 (REQ-01 a REQ-06). Cubre el **listado**; no incluye el builder (CA-05..08, movido a JOR-167).
>
> **Conclusion previa, para no perder tiempo:** este slice **NO toca persistencia**. No hay tablas, migraciones SQL ni cambios de esquema. El modelo afectado es (a) el **contrato de consulta** del listado (una invariante nueva entre dos campos ya existentes) y (b) **objetos de vista** nuevos, en memoria del navegador (estado del rango de fechas y fila imprimible). Lo que cambia de forma visible es la **proyeccion de columnas**, no los datos.

---

## 0. Mapa de impacto por capa

| Capa | Artefacto | Estado | Que cambia |
| --- | --- | --- | --- |
| Dominio backend | `DocumentoDTEDto` (`backend/jormat-api/src/sales/dto/documento.dto.ts`) | **Existente, sin cambios** | Todos los campos que el canon pide ya existen (`folio`, `receptor.razonSocial`, `receptor.rut`, `total`, `origen`, `oc`, `fecha`, `estadoComercial`). |
| Contrato Zod front | `documentoDTESchema` (`front/.../lib/schemas/ventas.ts`) | **Existente, sin cambios** | Espejo del DTO. La separacion RUT/Total (REQ-01) es de **presentacion**, no de contrato. |
| Contrato de consulta | `ListDocumentosQueryDto` (`.../sales/dto/list-documentos-query.dto.ts`) | **Existente + invariante nueva** | `desde`/`hasta` ya existen y ya validan formato `YYYY-MM-DD`. Falta la invariante `desde <= hasta` (REQ-02). |
| Estado de vista | `DateRangeFilterState` | **NUEVO** | Separa el rango *tipeado* del rango *aplicado*, mas el error de validacion. |
| Proyeccion de impresion | `PrintableDocumentoRow` + `PrintReportHeader` | **NUEVO** | Modelo plano derivado de `DocumentoDTE`, sin controles ni Acciones (REQ-03). |
| Modelo de columnas | `columns` de `DocumentosTable` | **Modificado** | 9 columnas canonicas; RUT y Total dejan de ir embebidos. |
| Persistencia | - | **Sin cambios** | El servicio de ventas hoy resuelve el listado sobre una coleccion en memoria (`sales.service.ts`), sin repositorio ni entidad ORM. |

---

## 1. Entidad de dominio: `DocumentoDTE` (EXISTENTE, sin cambios)

Es la fila del listado. Se declara dos veces, en espejo: `DocumentoDTEDto` (backend, class-validator + Swagger) y `documentoDTESchema` (front, Zod). **Ningun campo se agrega, renombra ni elimina en este slice.**

| Campo | Tipo | Obligatorio | Enum / Formato | Default | Uso en el canon |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Si | - | - | Clave de fila y ruta de detalle `/ventas/documentos/:id`. No se imprime. |
| `folio` | `string` | Si | - | - | Columna **Factura**. |
| `tipoDTE` | `string` | Si | `TIPO_DTE` (6 valores) | - | Columna **extra** al canon (ver 6.1). Filtro existente. |
| `fecha` | `string` | Si | ISO `YYYY-MM-DD` | - | Columna **Fecha** + eje del **rango** (REQ-02). |
| `origen` | `string` | Si | codigo de bodega | - | Columna **Origen**; se resuelve a nombre via `useBodegaNombre` (JOR-119 DEC-7). |
| `oc` | `string` | **No** | - | `undefined` -> se muestra `-` | Candidata a columna **Orden** (bloqueado por JOR-166-Q1). |
| `vencimiento` | `string` | Si | ISO `YYYY-MM-DD` | - | No es columna del canon; alimenta el derivado `Vencida`. |
| `despacho` | `DespachoDto` | No | objeto anidado | `undefined` | Sin render en el listado. |
| `receptor` | `ReceptorDto` | Si | objeto anidado | - | Fuente de **Cliente** y **RUT**. |
| `estadoSII` | `string` | Si | `ESTADO_SII` (3 valores) | - | Segundo eje de estado (ver 6.1). |
| `estadoComercial` | `string` | Si | `ESTADO_COMERCIAL` (3 valores) | - | Columna **Estado**. |
| `neto` | `number` | Si | entero CLP | - | Hoy en el bloque `Neto / IVA / Total`; sale de la columna tras REQ-01. |
| `iva` | `number` | Si | entero CLP | - | Idem. |
| `total` | `number` | Si | entero CLP | - | Columna **Total** (pasa a columna propia, REQ-01). |

### 1.1 Objeto anidado `Receptor` (EXISTENTE)

| Campo | Tipo | Obligatorio | Uso |
| --- | --- | --- | --- |
| `razonSocial` | `string` | Si | Columna **Cliente**; eje de la busqueda por cliente (CA-02). |
| `rut` | `string` | Si | Columna **RUT** (pasa a columna propia, REQ-01). |
| `telefono` | `string` | No | Sin render en el listado. |
| `ciudad` | `string` | No | Sin render en el listado. |
| `direccion` | `string` | No | Sin render en el listado. |

### 1.2 Campo derivado `isVencida` (EXISTENTE, no persistido)

No es un campo del modelo: es una funcion pura en `DocumentosTable.tsx`.

```
isVencida(doc) = doc.vencimiento <= hoy && doc.estadoComercial !== 'aceptado'
```

Se calcula en el render y acompana al badge de **Estado**. **Decision pendiente de REQ-03:** si el badge `Vencida` viaja o no a la salida impresa. Recomendacion: si viaja, que lo haga como texto anexo dentro de la celda Estado (`Pendiente (vencida)`), no como columna nueva, para no exceder las 8 columnas de datos del canon.

---

## 2. Contrato de consulta: `ListDocumentosQueryDto` (EXISTENTE + una invariante NUEVA)

Extiende `PaginationQueryDto`. Es el **unico** contrato que crece en este slice, y crece en reglas, no en campos.

| Campo | Tipo | Obligatorio | Validacion actual | Default | Estado |
| --- | --- | --- | --- | --- | --- |
| `page` | `number` | No | heredado de `PaginationQueryDto` | 1 | Existente |
| `limit` | `number` | No | heredado, `@Max(100)` | 10 | Existente |
| `sort` | `string` | No | `campo:asc\|desc`, whitelist anti-inyeccion | - | Existente |
| `search` | `string` | No | `@IsString` | - | Existente (folio / razon social / RUT) |
| `tipoDTE` | `string` | No | `@IsIn(TIPO_DTE_VALUES)` | - | Existente |
| `estadoSII` | `string` | No | `@IsIn(ESTADO_SII_VALUES)` | - | Existente |
| `estadoComercial` | `string` | No | `@IsIn(ESTADO_COMERCIAL_VALUES)` | - | Existente |
| `desde` | `string` | No | `@Matches(/^\d{4}-\d{2}-\d{2}$/)` | - | Existente (**solo formato**) |
| `hasta` | `string` | No | `@Matches(/^\d{4}-\d{2}-\d{2}$/)` | - | Existente (**solo formato**) |

### 2.1 Invariante NUEVA (REQ-02 / CA-03)

```
INV-RANGO:  si desde != null y hasta != null  =>  desde <= hasta
```

La comparacion es **lexicografica** sobre `YYYY-MM-DD`, consistente con como ya filtra el servicio (`d.fecha >= desde`, `d.fecha <= hasta`), que es lo que garantiza la **inclusion de ambos dias completos** que pide CA-03, sin parsear a `Date` y sin zona horaria de por medio.

**Donde vive la invariante: hay dos opciones viables y la decision no es mia.**

| Opcion | Que implica | Pros | Contras |
| --- | --- | --- | --- |
| **A - Solo frontend** | La vista valida antes de aplicar; el rango invalido nunca sale al backend, y los resultados quedan como estaban (literal de CA-03). | Cero cambio de contrato; cero riesgo para consumidores del endpoint; alcanza para cumplir CA-03. | El endpoint sigue aceptando un rango invalido si lo llama otro cliente (devuelve 0 filas en silencio). |
| **B - Frontend + backend** | Igual que A, mas un validador de clase en el DTO que devuelve 400. | El contrato queda coherente para cualquier consumidor. | Toca el DTO: los tests de `documentos.controller.spec.ts` y `sales.service.spec.ts` deben cubrir el 400, y el frontend debe tolerar ese 400 aunque en teoria nunca lo provoque. |

**Recomendacion: A**, porque CA-03 exige explicitamente "no aplica el filtro" (o sea: la peticion no debe salir), y B agrega superficie de error sin agregar comportamiento observable para el usuario. B queda como mejora del contrato para cuando el endpoint tenga consumidores externos.

**Impacto colateral verificado de tocar el DTO (relevante solo si se elige B):** `ListDocumentosQueryDto` lo consume `documentos.controller.ts` en el listado y, por derivacion de filtros (`DocumentosSummaryParams` = mismos filtros sin paginacion), tambien el endpoint `GET /ventas/documentos/summary` (KPIs, JOR-072). Un 400 nuevo en el rango afectaria **ambos**: la tabla y las tarjetas de KPI. Por eso, si se elige B, la validacion debe agregarse en el punto compartido, no duplicada.

---

## 3. Estado de vista: `DateRangeFilterState` (NUEVO, en memoria)

Hoy la vista tiene dos strings sueltos (`desde`, `hasta`) que se aplican **al tipear** (cada tecla dispara consulta). REQ-02 pide **aplicar explicito** y **mensaje de error sin aplicar**, lo que obliga a separar lo que el usuario escribio de lo que esta aplicado.

| Campo | Tipo | Obligatorio | Default | Semantica |
| --- | --- | --- | --- | --- |
| `draftDesde` | `string` | Si | `''` | Valor tipeado en el input Fecha inicio. No dispara consulta. |
| `draftHasta` | `string` | Si | `''` | Valor tipeado en el input Fecha fin. No dispara consulta. |
| `appliedDesde` | `string` | Si | `''` | Valor vigente enviado como `desde`. `''` = sin filtro. |
| `appliedHasta` | `string` | Si | `''` | Valor vigente enviado como `hasta`. `''` = sin filtro. |
| `error` | `DateRangeError \| null` | Si | `null` | Motivo de rechazo del ultimo intento de aplicar. |

### 3.1 Enum NUEVO `DateRangeError`

| Valor | Cuando | Mensaje sugerido |
| --- | --- | --- |
| `INVERTED_RANGE` | `draftDesde > draftHasta`, ambos presentes | `La fecha de inicio no puede ser posterior a la fecha de fin.` |

Un solo valor hoy. Se modela como enum y no como booleano porque el formato ya lo cubre el `type="date"` nativo, pero un mockup con input libre agregaria `INVALID_FORMAT` sin rehacer el modelo.

### 3.2 Reglas de transicion (contrato de comportamiento del objeto)

| Accion | Efecto sobre el estado |
| --- | --- |
| Tipear | Solo `draft*`. Recomendado: limpiar `error` al tipear, para que el mensaje no quede colgado sobre un valor ya corregido. |
| **Aplicar** con rango valido | `applied* = draft*`, `error = null`, pagina -> 1. |
| **Aplicar** con rango invertido | `applied*` **no cambia** (los resultados quedan como estaban, CA-03), `error = INVERTED_RANGE`, pagina **no cambia**. |
| **Aplicar** con un solo extremo | Valido. Rango abierto: solo `desde` o solo `hasta`. El servicio ya soporta ambos filtros de forma independiente. |
| **Limpiar rango** | `draft* = ''`, `applied* = ''`, `error = null`, pagina -> 1. **No toca** `search`, `tipoDTE`, `estadoSII` ni `estadoComercial` (CA-03 explicito). |
| **Limpiar todo** (boton existente de la barra) | Limpia el rango junto con los demas filtros. Comportamiento ya presente, se mantiene. |
| Quitar el chip `Desde` / `Hasta` | Debe limpiar **draft y applied** de ese extremo. Hoy los chips solo tocan un string; con el modelo desdoblado, olvidar el `draft` deja el input mostrando un valor que no esta aplicado. **Riesgo concreto de regresion en `handleRemoveFilter`.** |

**Consecuencia sobre el resto de la vista (verificada):** `listParams` y `summaryFilters` deben pasar a leer `applied*`, no `draft*`. Si solo se cambia `listParams`, la tabla y los KPIs quedan **desincronizados** (los KPIs seguirian recalculando en cada tecla). Ambos objetos estan en `DocumentosListView.tsx` y se alimentan de las mismas variables; hay que cambiarlos juntos. Lo mismo aplica al cierre que arma el export CSV en `handleExportCsv`, que hoy repite los mismos filtros inline: son **tres** lugares, y con el "Imprimir" de REQ-03 pasan a ser **cuatro**.

**Nota de diseno derivada:** con cuatro consumidores del mismo juego de filtros, conviene extraer un unico objeto `DocumentosFilterState` -> `DocumentosListParams` (una funcion pura `buildListParams(state)`) en lugar de repetir el literal. Es el tipo de duplicacion que provoca justamente el bug de "el export no respeta el filtro nuevo".

---

## 4. Proyeccion de impresion (NUEVO, en memoria)

REQ-03 pide una salida con **todos** los registros del universo filtrado, columnas de datos, periodo en el encabezado, sin controles ni Acciones. REQ-05 fija que se reusa `fetchAllPagesCapped` y que **la impresion la resuelve el navegador** (patron JOR-107): no hay endpoint, ni servicio, ni generador server-side, ni una segunda ruta de paginacion. Por lo tanto estos objetos **no se persisten ni viajan por la red**: son estructuras efimeras en el cliente.

### 4.1 `PrintableDocumentoRow` (NUEVO)

Modelo plano de una fila imprimible. **Deliberadamente sin `id`, sin acciones y sin badges**: lo que no se imprime, no entra al modelo.

| Campo | Tipo | Obligatorio | Origen | Formato en la salida |
| --- | --- | --- | --- | --- |
| `factura` | `string` | Si | `doc.folio` | Tal cual. |
| `cliente` | `string` | Si | `doc.receptor.razonSocial` | Tal cual. |
| `rut` | `string` | Si | `doc.receptor.rut` | Tal cual. |
| `total` | `string` | Si | `doc.total` | `formatCurrency(total, 'CLP')`. **Ver 4.3.** |
| `origen` | `string` | Si | `bodegaNombre(doc.origen)` | Nombre de bodega resuelto, no el codigo. |
| `orden` | `string` | Si | `doc.oc ?? '-'` | Guion cuando no hay dato, igual que la tabla. |
| `fecha` | `string` | Si | `doc.fecha` | Formato de `DateDisplay`, para que impreso y pantalla coincidan. |
| `estado` | `string` | Si | `ESTADO_COMERCIAL_LABEL[doc.estadoComercial]` | Label legible, no el valor del enum. |

Son **8 columnas**: las 9 del canon menos **Acciones**, tal como exige CA-04.

### 4.2 `PrintReportHeader` (NUEVO)

| Campo | Tipo | Obligatorio | Semantica |
| --- | --- | --- | --- |
| `titulo` | `string` | Si | Constante, p.ej. `Ventas / Facturas clientes`. |
| `periodoDesde` | `string \| null` | Si | `appliedDesde` o `null` si no hay filtro. |
| `periodoHasta` | `string \| null` | Si | `appliedHasta` o `null`. |
| `filtrosActivos` | `ActiveFilter[]` | Si | **Reusa el tipo ya existente** `ActiveFilter { id, label }` que arma `buildActiveFilters`. Vacio = sin filtros. |
| `totalRegistros` | `number` | Si | Cantidad efectivamente impresa. |
| `truncado` | `boolean` | Si | `true` si el universo filtrado excede el tope. **Ver 4.4.** |
| `emitidoEn` | `string` | Si | Fecha/hora de generacion. |

`periodoDesde`/`periodoHasta` son `null` y no `''` a proposito: el encabezado necesita distinguir "sin filtro de fecha" de "cadena vacia", y `null` lo hace explicito en el tipo. CA-04 exige que **el periodo aplicado** figure; `filtrosActivos` cubre el resto del contexto y es informacion gratuita, porque el arreglo ya se construye para los chips.

### 4.3 Decision abierta: montos formateados vs crudos

El export CSV deja los montos **crudos** a proposito, para que la hoja de calculo los lea como numeros. La impresion es lo contrario: va dirigida a una persona, no a una planilla.

| Opcion | Pros | Contras |
| --- | --- | --- |
| **Formateado** (`$ 31.477`) | Legible, coherente con la pantalla. | La salida ya no sirve para recalcular. |
| **Crudo** (`31477`) | Consistente con el CSV. | Ilegible en papel; se aleja de lo que el usuario ve en la vista. |

**Recomendacion: formateado**, y por eso `total` se modela como `string` y no como `number`. Si mas adelante el canon pide un total de pie de pagina, ese agregado se calcula sobre los `DocumentoDTE` originales, no sobre la fila ya formateada.

### 4.4 Tope de filas: constante compartida, no duplicada

`EXPORT_MAX_ROWS = 5000` hoy se exporta desde `DocumentosListView.tsx`. Imprimir reusa `fetchAllPagesCapped` con **el mismo tope** (REQ-05).

**Riesgo concreto que hay que cerrar:** si Imprimir declara su propia constante, las dos salidas del "universo filtrado" pueden divergir en silencio y nadie lo nota hasta que un usuario compare un CSV con una impresion. La constante debe quedar en **un solo lugar** (p.ej. subirla a `lib/api/pagination.ts` o a un modulo de ventas compartido) y ser consumida por ambos. Al moverla hay que ajustar sus consumidores actuales: la propia vista y sus tests (`DocumentosListView.extra.test.tsx` la importa para ejercitar el truncado).

Cuando `truncated === true`, la salida impresa **no** debe callarlo: el encabezado lleva `truncado` justamente para declarar que se imprimieron los primeros N de M, mismo criterio que ya usa el CSV con su toast de aviso.

---

## 5. Mapeo canon -> modelo (REQ-01)

| # | Columna del canon | Campo del modelo | Estado hoy | Accion |
| --- | --- | --- | --- | --- |
| 1 | Factura | `folio` | Columna propia | Sin cambios. |
| 2 | Cliente | `receptor.razonSocial` | Columna `receptor` con RUT debajo | Quitar el RUT de la celda. |
| 3 | RUT | `receptor.rut` | **Embebido en Cliente** | **Columna propia.** |
| 4 | Total | `total` | **Embebido en `Neto / IVA / Total`** | **Columna propia.** Definir el destino de `neto`/`iva` (ver 6.2). |
| 5 | Origen | `origen` -> `bodegaNombre()` | Columna propia | Sin cambios. |
| 6 | Orden | `oc` (presunto) | Columna rotulada `OC` | **Bloqueado por JOR-166-Q1.** |
| 7 | Fecha | `fecha` | Columna propia, ordenable | Sin cambios. |
| 8 | Estado | `estadoComercial` (+ `Vencida` derivado) | Columna propia, mas columna aparte `Estado SII` | Ver 6.1. |
| 9 | Acciones | - | Ver detalle, Clonar, Descargar XML/PDF, Anular | **Bloqueado por JOR-166-Q2.** Se mantiene como andamiaje. |

---

## 6. Divergencias contra el canon que este slice NO resuelve

### 6.1 Doble eje de estado y columna `Tipo de documento`

La tabla tiene hoy **11** columnas visibles, no 9: sobran `Tipo de documento` y `Estado SII`. El canon nombra nueve. Tres lecturas posibles, y **ninguna se decide en este slice** porque la Adenda 2 deja fuera todo lo que dependa de negocio:

- **A - El canon es exhaustivo:** se quitan ambas columnas. Riesgo alto: `estadoSII` y `tipoDTE` son ejes reales del negocio (JOR-111 / DEC-009) y sus filtros seguirian existiendo sin columna que los refleje.
- **B - El canon es un minimo:** se mantienen como columnas adicionales. Riesgo: CA-01 dice "se visualizan las nueve columnas definidas", que se cumple, pero la vista no queda identica al mockup.
- **C - Se fusionan:** `Estado` muestra el estado comercial y el SII como badge secundario, igual que ya hace con `Vencida`. Cumple las nueve columnas sin perder informacion.

**El mockup pendiente y la paridad con jormat legacy (CA-09) son los que zanjan esto.** Mientras tanto, el modelo de datos **no cambia** en ninguno de los tres casos: `estadoSII` y `tipoDTE` siguen en el DTO y en el contrato Zod. Es una decision de proyeccion, reversible.

### 6.2 Destino de `neto` e `iva`

Al separar `Total` como columna propia, `neto` e `iva` se quedan sin lugar. Siguen en el modelo y en el CSV. Opciones: (A) desaparecen del listado y viven solo en el detalle y el CSV; (B) quedan como linea secundaria dentro de la celda Total. **A** es lo que sugiere el canon, que nombra solo `Total`. No hay impacto de datos en ninguna de las dos.

### 6.3 Columna `Orden` (JOR-166-Q1)

Si `Orden` **es** la O.C., es un rename de encabezado (`OC` -> `Orden`), coste cero. Si es **otra** referencia, el impacto es real y va mas alla de la UI: `DocumentoDTEDto` y `documentoDTESchema` necesitarian un campo nuevo, el stub necesitaria poblarlo y el legacy diria de donde sale. **Ese es el unico escenario de todo el ticket que tocaria el contrato de dominio.** Por eso REQ-01 lo deja explicitamente fuera.

---

## 7. Indices y rendimiento

**No hay indices que declarar en este slice.** El listado se resuelve en `sales.service.ts` sobre una coleccion en memoria: filtra con `Array.filter` y ordena con una whitelist de columnas. No hay repositorio ORM, entidad ni tabla.

Para cuando la persistencia real aterrice, este slice deja dos requisitos ya conocidos, que conviene anotar ahora y no redescubrir despues:

| Indice sugerido | Por que |
| --- | --- |
| `(workspace_id, fecha)` | El rango de fechas de CA-03 es un `BETWEEN` sobre `fecha`, y es el filtro que mas reduce el universo. Tambien sostiene el orden por defecto. |
| `(workspace_id, estado_comercial)` y `(workspace_id, tipo_dte)` | Filtros de igualdad ya expuestos, usados tanto por el listado como por el endpoint de KPIs. |
| Indice de texto sobre `folio`, `receptor.razon_social`, `receptor.rut` | La busqueda libre de CA-02 barre los tres campos. |

**Riesgo de rendimiento propio de este slice, ya presente y que Imprimir agrava:** `fetchAllPagesCapped` pide la pagina 1, calcula cuantas faltan y dispara **todas las restantes en paralelo** (`Promise.all`). Con el tope de 5000 filas y `MAX_PAGE_LIMIT = 100`, eso es hasta **50 peticiones concurrentes** contra el backend, por click. Hoy solo lo provoca el boton de export; a partir de REQ-03 tambien lo provoca Imprimir, y nada impide que un usuario dispare los dos seguidos. Agregar el segundo consumidor no introduce el problema, pero si duplica la probabilidad de encontrarlo. Es preexistente: se reporta, no se corrige aqui.

---

## 8. Relaciones

```
DocumentoDTE 1 ──── 1  Receptor          (embebido, no es FK a una tabla de clientes)
DocumentoDTE 1 ──── 0..1 Despacho        (embebido, opcional, sin render en el listado)
DocumentoDTE n ──── 1  Bodega            (por codigo en `origen`, resuelto en cliente)
DocumentoDTE 1 ──── n  LineItem          (solo en el detalle, GET /:id — fuera del listado)
DocumentoDTE n ──── 1  PrintableDocumentoRow   (NUEVO, proyeccion 1:1 en memoria)
```

Dos relaciones merecen una aclaracion porque se prestan a confusion:

- **`receptor` esta embebido, no referenciado.** No hay FK a un catalogo de clientes: la razon social y el RUT viajan copiados dentro del documento. Es correcto para un documento tributario (congela los datos al momento de emitir), pero significa que la busqueda por cliente de CA-02 opera sobre el texto copiado, no sobre una entidad Cliente. Renombrar un cliente en el catalogo **no** cambia los documentos ya emitidos.
- **`origen` es un codigo, no un nombre.** La resolucion a nombre de bodega ocurre en el cliente, via `useBodegaNombre` (JOR-119 DEC-7). Imprimir debe usar **el nombre resuelto**, no el codigo, igual que ya hacen la tabla y el CSV: imprimir el codigo crudo seria una regresion silenciosa respecto de lo que el usuario ve en pantalla.

---

## 9. Notas de migracion

**No hay migracion de base de datos.** Ni DDL, ni backfill, ni script. Detalle de por que, para que quede trazado:

1. **Sin cambios de esquema:** los nueve campos del canon ya existen en `DocumentoDTEDto` y en `documentoDTESchema`. REQ-01 redistribuye columnas de una tabla HTML, no columnas de una base.
2. **Sin cambio de contrato de red:** `desde` y `hasta` ya son parametros aceptados y ya filtran de forma inclusiva en ambos extremos. La invariante de REQ-02 es una regla, no un campo (y bajo la opcion A recomendada, ni siquiera sale del navegador).
3. **Sin persistencia nueva:** `DateRangeFilterState`, `PrintableDocumentoRow` y `PrintReportHeader` viven en memoria del componente y mueren con el desmontaje. No hay `localStorage`, ni URL state, ni sesion.
4. **Sin endpoint nuevo:** REQ-05 lo fija de forma explicita. Imprimir reusa `GET /ventas/documentos` a traves de `fetchAllPagesCapped`; la paginacion, el filtrado y el orden ya existen y no se duplican.

### Compatibilidad hacia atras

| Cambio | Rompe consumidores? | Detalle |
| --- | --- | --- |
| Separar RUT y Total en columnas | No, en produccion | Solo la proyeccion visual. **Si rompe tests:** los que asertan sobre la celda combinada `receptor` o el bloque `Neto / IVA / Total` en `DocumentosTable.test.tsx` y `DocumentosListView.test.tsx`. Son tests existentes y hay que **ajustarlos con aprobacion previa**, no reescribirlos al paso. |
| Aplicar explicito del rango | No | Cambia el momento de la consulta, no su forma. |
| `EXPORT_MAX_ROWS` compartida | Si, en imports | Si se mueve de modulo, hay que actualizar la vista y los tests que la importan. Alternativa sin riesgo: dejarla donde esta y que Imprimir la importe desde ahi. |
| Invariante `desde <= hasta` en el DTO (**solo opcion B**) | Potencialmente | Un cliente que hoy manda un rango invertido recibe `[]`; pasaria a recibir `400`. Afecta listado **y** KPIs. Es el unico cambio de este slice con potencial de romper algo fuera del frontend. |

---

## 10. Convenciones de los archivos nuevos (REQ-06)

Todo artefacto nuevo de este modelo aterriza como carpeta-por-componente bajo `frontend/src/components/ventas/list/<Componente>/`, con su `*.test.tsx` (jsdom) y su `*.stories.tsx` (RULE-frontend-001/002). Las stories que usen React Query se apoyan en el `QueryClientProvider` global de `.storybook/preview.tsx` (RULE-frontend-013), sin montar uno propio.

Los tipos puros (`DateRangeFilterState`, `DateRangeError`, `PrintableDocumentoRow`, `PrintReportHeader`) **no son componentes**: van junto al componente que los consume, o en el modulo de tipos de ventas si terminan con mas de un consumidor. No corresponde crearles carpeta propia.

---

## 11. Bloqueos declarados

| Bloqueo | Que congela | Impacto en el modelo si se resuelve "mal" |
| --- | --- | --- |
| **JOR-166-Q1** - semantica de `Orden` | Columna 6 | Si `Orden` != O.C., **hay que agregar un campo al DTO y al contrato Zod**. Es el unico escenario del ticket con impacto en el dominio. |
| **JOR-166-Q2** - set de Acciones | Columna 9 | Sin impacto en el modelo de datos: Acciones no se imprime (CA-04) y no es un campo. |
| **Mockup pendiente** | Filtros por columna (REQ-04), formato de impresion | Sin impacto en el modelo: mover los filtros de la barra a los encabezados no cambia ni un campo del contrato de consulta, solo donde se dibuja cada control. |
| **Acceso a jormat legacy** (CA-09) | Paridad de todo el listado | Podria revelar campos que el legacy muestra y este modelo no contempla. Es el riesgo abierto de mayor alcance, y la razon por la que las divergencias de la seccion 6 se documentan en vez de resolverse. |