# Modelo de datos — TAO-171 (HU-01-06)

## 1. Resumen y alcance del modelo

Esta historia **no modifica el esquema de base de datos** (Prisma) ni introduce migraciones: no hay nuevas tablas, columnas, índices ni relaciones en PostgreSQL. La preferencia de locale de cuenta no se persiste en esta historia (llega con EP-03b, ver §7).

El "modelo de datos" afectado son **catálogos de recursos estáticos versionados en el repositorio** (clave → texto), su configuración de generación, el artefacto generado, la lista de términos no traducibles y la configuración de las dos guardas de lint. Todo se modela abajo como entidades con campos, claves y relaciones.

La única entidad de dominio reutilizada como fuente de claves es el enum **`CodigoError`** (existente), y la lógica existente **`clasificarError` / `buildProblem` / `AppError`** (existente, modificada): no se crea un mapeo de mensajes paralelo (REQ-06).

### 1.1 Mapa de entidades (nuevo vs. existente)

| Entidad / objeto | Estado | Naturaleza | Archivo (propuesto o canónico) |
|---|---|---|---|
| `app_es.arb` (catálogo ARB de la app) | NUEVO | Recurso estático JSON | `app/lib/l10n/app_es.arb` (fijado por REQ-01) |
| Configuración de generación `l10n.yaml` | NUEVO | Configuración | `app/l10n.yaml` |
| `AppLocalizations` (+ delegados) | NUEVO / GENERADO | Código Dart generado | `app/lib/l10n/` (excluido de lint y cobertura) |
| Catálogo de errores i18next `es` | NUEVO | Recurso estático JSON | `server/src/i18n/locales/es/errors.json` |
| Módulo `i18n` del servidor (`resolverLocale`, `t`) | NUEVO | Módulo | `server/src/i18n/index.ts` |
| Unidad de resolución de locale | NUEVO | Estructura en memoria | dentro del módulo `i18n` |
| Lista de términos no traducibles (DEC-049) | NUEVO | Recurso estático YAML/JSON | `i18n/terminos-no-traducibles.yaml` (ubicación compartida, a confirmar) |
| Convención de nombres de claves | NUEVO | Documento + validación | junto al ARB / doc de i18n |
| Regla de lint de la app (`custom_lint`) | NUEVO | Paquete plugin + config | `app/tool/l10n_lint/` (o paquete dedicado) |
| Regla de ESLint del servidor (error-text) | NUEVA | Configuración de lint | `server/eslint.config.mjs` |
| `CodigoError` | EXISTENTE | Enum (union type del contrato) | `server/src/dtos/error.ts` |
| `AppError` / `clasificarError` / `buildProblem` | EXISTENTE (modificado) | Código | `server/src/errors.ts`, `server/src/middleware/error-handler.ts` |

---

## 2. Catálogo ARB de la app (`app_es.arb`) — NUEVO

Recurso JSON plano. Cada entrada es un par clave→valor y, opcionalmente, metadatos `@clave`. La clave de idioma se declara con `@@locale`.

| Campo (JSON) | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `@@locale` | string | sí | — | Idioma del catálogo. Valor único admitido hoy: `es`. |
| `@@last_modified` | string (ISO-8601) | no | — | Marca de última modificación del catálogo. |
| `<clave>` | string | sí (por entrada) | — | Texto ICU en español. Puede contener marcadores (`{nombre}`) y plurales (`{count, plural, ...}`). Único en el archivo. |
| `@<clave>.description` | string | sí (recomendado) | — | Contexto para quien traduce. No se renderiza. |
| `@<clave>.placeholders` | object | condicional | — | Obligatorio si el valor tiene marcadores. Mapa `nombre → { type, example }`. |
| `@<clave>.placeholders.<nombre>.type` | string (enum) | sí dentro de placeholders | — | `String` \| `int` \| `double` \| `num` \| `DateTime`. |
| `@<clave>.placeholders.<nombre>.example` | string/num | no | — | Ejemplo para revisión de traducción. |

Notas:
- Un solo ARB publicado (`es`); agregar un idioma es agregar un `app_<lang>.arb` completo (REQ-01, DEC-049).
- Los plurales y marcadores usan ICU (criterio de aceptación de plurales con 0, 1 y 5).
- Los términos de la lista de §5 deben aparecer **literales** dentro del valor ARB (criterio de aceptación de DEC-049).

### 2.1 Configuración de generación `l10n.yaml` — NUEVO

| Campo | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `arb-dir` | string (ruta) | sí | — | `lib/l10n`. |
| `template-arb-file` | string | sí | — | `app_es.arb` (plantilla canónica). |
| `output-localization-file` | string | sí | — | `app_localizations.dart`. |
| `output-class` | string | no | `AppLocalizations` | Nombre de la clase generada. |
| `nullable-getter` | bool | no | `false` | `AppLocalizations.of(context)` no nulo. |
| `synthetic-package` | bool | no | `false` | Generar dentro de `lib/` (versionable y excluible del lint). |
| `output-dir` | string | condicional | — | Requerido si `synthetic-package: false`. |

### 2.2 Artefacto generado `AppLocalizations` — NUEVO / GENERADO

- Clases y delegados emitidos por `flutter gen-l10n` / `generate: true`.
- Expone: `localizationsDelegates` (GlobalMaterial/Widgets/Cupertino + el propio), `supportedLocales` = `[Locale('es')]` (solo `es`, REQ-01), y un getter por clave.
- Es **derivado**: no se edita a mano, se versiona, y queda excluido del lint de textos fijos y de la cobertura (junto a `build/**`, `widgetbook/**`, `src/generated/**`, `contract/generated/**`, REQ-07).

---

## 3. Catálogo de errores del servidor (i18next `es`) — NUEVO

Recurso de traducción del backend. La clave de cada mensaje se **deriva del enum `CodigoError`** (REQ-06); no hay mapeo de mensajes paralelo.

### 3.1 Estructura del recurso

| Campo lógico | Tipo | Obligatorio | FK / enum | Descripción |
|---|---|---|---|---|
| `namespace` | string fijo | sí | — | `errors`. |
| `<CodigoError>` (segmento de clave) | string | sí | FK lógica a `CodigoError` | Un nodo por cada valor del enum. Clave = nombre del codigo. |
| `errors.<codigo>.title` | string | sí | — | Título del `title` del `problem+json`. |
| `errors.<codigo>.detail` | string | no | — | Plantilla de `detail`; admite interpolación i18next `{{param}}`. |
| `<locale>` (directorio) | string | sí | enum `IdiomaSoportado` | Hoy solo `es`. |

Ejemplo de jerarquía (conceptual):

`errors.validacion_fallida.title` = "Solicitud inválida"; `errors.error_interno.title` = "Error interno"; `errors.recurso_no_encontrado.title` = "Recurso no encontrado"; etc., cubriendo los ~48 valores del enum.

### 3.2 Módulo `i18n` del servidor — NUEVO

| Elemento | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `i18next` (dependencia) | paquete | sí | — | Nueva dependencia del servidor. |
| `supportedLngs` | string[] | sí | `['es']` | Único idioma publicado (DEC-049/DEC-166). |
| `fallbackLng` | string | sí | `'es'` | Todo locale no soportado cae a `es`. |
| `resolverLocale(fuentes)` | función | sí | — | Devuelve el locale efectivo. |
| `t(clave, params)` | función | sí | — | Resuelve texto con interpolación; lanza/registra si falta la clave. |

### 3.3 Unidad de resolución de locale — NUEVO

| Campo | Tipo | Obligatorio | Default | Origen / nota |
|---|---|---|---|---|
| `preferencia` | string \| null | no | `null` | Preferencia de la persona. **Hoy siempre `null`**: su fuente persistida (perfil de cuenta) llega con EP-03b; el campo existe en el orden de resolución, no en la BD todavía. |
| `acceptLanguage` | string \| null | no | `null` | Cabecera `Accept-Language` de la petición; se parsea a un locale preferido. |
| `resuelto` | string | sí | `'es'` | Resultado: primera coincidencia soportada entre `preferencia` → `acceptLanguage` → default. |

Orden de resolución (REQ-02 y criterio de aceptación QA-01-06-02): **preferencia de la persona → `Accept-Language` → `es`**. Como `es` es el único publicado, cualquier locale no soportado (p. ej. `fr`, `en-US`) devuelve texto en español.

### 3.4 Relación con `Problem` (EXISTENTE, sin cambio de forma)

- `Problem.type` sigue siendo `PROBLEM_TYPE_BASE + codigo` (sin cambio).
- `Problem.title` y `Problem.detail` pasan a resolverse **desde el catálogo**, no desde literales (REQ-02, REQ-04).
- `Problem.codigo` sigue siendo el enum; es la clave de correlación con logs (REQ-08: se registra el código, no el texto traducido).

---

## 4. Lista de términos no traducibles (DEC-049) — NUEVO

Recurso versionado junto al ARB y al catálogo, como referencia de traducción y para la guarda de conservación literal (REQ-05, criterio de aceptación de Kuberani/Rhibu).

| Campo | Tipo | Obligatorio | Enum / FK | Descripción |
|---|---|---|---|---|
| `categoria` | string | sí | `CategoriaTermino` (§6) | Categoría fijada por DEC-049. |
| `termino` | string | sí | — | Forma literal que no se traduce (p. ej. `Tao Mangalam`, `Kuberani`, `Rhibu`, `Thot`). Único dentro de su categoría. |
| `nota` | string | no | — | Aclaración (p. ej. regla de compuestos: se conserva el nombre propio y se traduce el común). |

Uso:
- El valor del ARB del servidor y de la app debe conservar estos términos **literalmente**.
- La ubicación (compartida en la raíz del monorepo, o copia junto a cada catálogo) **está a confirmar**; el requisito es que sea una fuente única versionada y validada por prueba.

---

## 5. Convención de nombres de claves — NUEVO

Documento normativo (no datos) que fija el formato de `<clave>` para ARB y para el catálogo del servidor.

| Aspecto | Regla | Nota |
|---|---|---|
| Formato ARB | `<feature>_<componente>_<elemento>` en `snake_case` | Se documenta y valida por prueba; no inventa runtime. |
| Formato servidor | `<namespace>.<CodigoError>.<campo>` | El segmento de código proviene del enum (REQ-06). |
| Prohibido | claves con texto embebido, ids de proceso, rutas | Estable para traducción. |
| Idempotencia | renombrar una clave es un cambio de contrato | Requiere actualizar usos y catálogos en el mismo PR. |

---

## 6. Enumeraciones

| Enum | Estado | Valores | Origen |
|---|---|---|---|
| `CodigoError` | EXISTENTE (reutilizada como clave) | ~48 valores (`validacion_fallida`, `no_autenticado`, `error_interno`, `recurso_no_encontrado`, `servicio_no_disponible`, …) | `server/src/dtos/error.ts` |
| `IdiomaSoportado` | NUEVO | `es` | supportedLngs |
| `CategoriaTermino` | NUEVO | `nombre_metodo`, `entidades`, `elementos_metodo`, `practicas_formulas`, `codigos`, `nombres_propios`, `arte` | DEC-049 §"Qué no se traduce nunca" |

---

## 7. Relaciones e integridad referencial

| Relación | Cardinalidad | Integridad | Cómo se verifica |
|---|---|---|---|
| `<clave>` usada en `app/lib` ↔ `<clave>` declarada en `app_es.arb` | 1..N → 1 | Toda clave usada debe existir en el ARB; si no, la generación/compilación falla | Criterio de aceptación "clave inexistente → compilación falla" + `flutter analyze`/generación |
| clave del catálogo servidor ↔ valor de `CodigoError` | 1 → 1 (por código) | Todo código del enum debe tener entrada `title` (y `detail` si aplica) | Prueba que falla nombrando la clave faltante (criterio de aceptación) |
| `problem+json.title`/`detail` ↔ entrada del catálogo | 1 → 1 | `title`/`detail` **no** pueden ser literales (REQ-04) | Regla ESLint en `backend-static` |
| término de §4 ↔ valor del ARB | 1 → N | El término se conserva literal en el ARB y figura en la lista | Prueba de conservación + revisión de traducción |
| `Problem.codigo` ↔ línea de log | 1 → 1 | El log registra el código, nunca el texto traducido (REQ-08) | Prueba de observabilidad |

**Invariantes de paridad:** al existir más de un idioma, los catálogos deben tener el mismo conjunto de claves (mismo árbol `errors`, mismo set de claves ARB). Se documenta como invariante futura; hoy es trivial con un solo idioma.

---

## 8. Índices, restricciones y claves de exclusión

Con recursos estáticos, los "índices" son claves de búsqueda y conjuntos de exclusión:

| Objeto | Restricción | Tipo |
|---|---|---|
| `app_es.arb` | `<clave>` única en el archivo; un solo `@@locale` | Unicidad |
| `errors.json` (`es`) | una entrada por valor de `CodigoError`; sin claves huérfanas | Cobertura total |
| Términos no traducibles | `(categoria, termino)` único | Unicidad compuesta |
| Guarda ARB (custom_lint) | aplica a `app/lib`; **excluye** `build/**`, `widgetbook/**`, código generado y `test/**` | Filtro |
| Guarda ESLint (servidor) | aplica a respuestas de error; **excluye** `dist/**`, `contract/generated/**`, `src/generated/**`, `node_modules/**` | Filtro (REQ-07) |
| Integración en jobs | dentro de `flutter-static` (`dart run custom_lint` + guarda) y `backend-static` (`pnpm run static`, que ya corre `eslint`); **sin jobs nuevos** | Config |

---

## 9. Notas de migración

1. **Base de datos:** no hay migración. No se crean tablas ni columnas; la preferencia de locale de cuenta no se persiste en esta historia (EP-03b la aporta). No aplica `prisma migrate`.
2. **Servidor — de literales a catálogo (modificación de código existente):**
   - `TITULO_POR_CODIGO` y `tituloPorDefecto(status)` de `server/src/middleware/error-handler.ts` dejan de contener texto legible; pasan a resolverse por clave del catálogo.
   - `AppError.title` / `AppError.detail` (hoy texto libre) dejan de aceptar literales: el error declara `codigo` (+ `status`) y, si necesita dinámica, parámetros de interpolación; el manejador resuelve `title`/`detail` desde el catálogo. Todo `new AppError({ title: '...' })` existente migra a clave.
   - `clasificarError` y `buildProblem` conservan su forma de salida (`Problem`), cambiando solo el origen de `title`/`detail`.
3. **App — extracción de textos fijos:** los literales visibles/semánticos actuales de `app/lib` se mueven al ARB como claves. La guarda se activa sobre `app/lib` excluyendo generados y pruebas (efecto trinquete: a partir de la activación, un texto fijo nuevo rompe CI).
4. **Compatibilidad de arranque:** no dejar claves nuevas consumidas por código con un catálogo anterior ni viceversa; el PR que introduce un uso debe introducir la clave en el mismo cambio.
5. **Agregar un idioma (futuro):** solo sumar `app_<lang>.arb` completo y un directorio `<locale>` del catálogo del servidor; no requiere cambios de código (DEC-049/DEC-166). El backend debe resolverlo por la cadena de §3.3.
6. **Rollback (según handoff):** revertir catálogos, generados y configuración de i18n a la misma versión, sin dejar claves nuevas consumidas por código con un catálogo anterior.
7. **Seguridad/observabilidad (sin impacto de esquema):** las entradas del catálogo no incluyen datos personales ni stack traces; el log del servidor emite `codigo`, no el texto traducido (REQ-08).