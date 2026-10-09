# Modelo de datos: TAO-198 (HU-02-04). Pipeline de catálogos versionados, empezando por resultados

> Alcance según la Adenda 1: solo el diferencial (esquema en pruebas y CI, patrón común, copia a la app y cargador Dart).
> No hay base de datos ni tablas: el modelo afectado son **documentos JSON versionados** (fuente de verdad en `docs/content/catalogos/`), su **copia empaquetada** en `app/assets/catalogos/` y los **modelos Dart inmutables** en memoria. La persistencia Drift queda fuera (EP-06).

Leyenda: **[EXISTENTE]** ya está en `main` y no se modifica · **[NUEVO]** lo crea este ticket · **[MODIFICADO]** existe y este ticket lo cambia.

---

## 1. Mapa de entidades y relaciones

```
docs/content/fuentes/*.md  (intacto, REQ-07)
        │ sha256 en sources[]
        ▼
correcciones_editoriales_resultados.v1.json ──(resolutions[].id = ER-NNN)──┐
        │                                                                  │
        ▼   scripts/build_result_catalog.py  (usa scripts/lib/catalog_pipeline.py [NUEVO])
resultados.v1.json [EXISTENTE] ──valida contra──► resultados.v1.schema.json [EXISTENTE]
        │                                          (ahora en tests y CI [NUEVO])
        ▼   scripts/sync_app_catalogs.py [NUEVO]  (copia byte a byte + --check)
app/assets/catalogos/resultados.v1.json [NUEVO]
        │   declarado en app/pubspec.yaml [MODIFICADO]
        ▼   ResultCatalogLoader [NUEVO]  (rootBundle, sin red)
ResultCatalog ─┬─ 12 × HouseResult (content_key = id, content_version = catalogVersion)
               └─  8 × RingResult  (content_key = id, content_version = catalogVersion)
```

| Relación | Cardinalidad | Clave | Notas |
|---|---|---|---|
| Catálogo → casas | 1 : 12 | `houses[].id` (`house-01`..`house-12`) | Único dentro del catálogo |
| Catálogo → anillos | 1 : 8 | `rings[].id` (`ring-01`..`ring-08`) | Único dentro del catálogo |
| Nodo de contenido → fuente | N : 1..n | `sourceRefs[]` → `sources` (`tm-src-tablero`, `tm-src-anillos`) + `#pNNNN` | FK lógica por prefijo |
| Nodo de contenido → resolución editorial | N : 0..1 | `editorialResolutionId` → `editorialResolutions[].id` | Obligatoria si `text != sourceText` |
| Resolución editorial → nodo | 1 : 1 | `target` (ruta tipo `house-02.arrival.fields.dharaniDeva`) | FK lógica por ruta |
| Copia en app → catálogo fuente | 1 : 1 | ruta relativa + SHA-256 | Igualdad byte a byte (DEC-230) |
| Registro de la persona (EP-06) → nodo | N : 1 | (`content_key`, `content_version`) | Fuera de alcance; este ticket solo expone el par (DEC-178) |

---

## 2. Entidades del lado fuente (JSON)

### 2.1 `ResultCatalog` (raíz de `resultados.v1.json`) [EXISTENTE, sin cambios de forma]

| Campo | Tipo | Oblig. | Restricción / enum | Notas |
|---|---|---|---|---|
| `schemaVersion` | int | sí | `const 1` | El cargador lo compara con `supportedSchemaVersion = 1` (REQ-05) |
| `catalogVersion` | string | sí | `^\d+\.\d+\.\d+$` (hoy `1.0.0`) | Se expone como `content_version` de cada nodo |
| `locale` | string | sí | `const "es"` | El cargador lo exige |
| `generatedBy` | string | sí | `const "scripts/build_result_catalog.py"` | Se mantiene aunque el generador use el módulo común |
| `sources` | map<string, Source> | sí | `minProperties 2` | Claves `tm-src-tablero`, `tm-src-anillos` |
| `rules` | object | sí | libre | `houseOrder`, `ringOrder`, `retrogressionCombinationCount = 88`, `missingFields = "omit"` |
| `templates` | object | sí | libre | `advance`, `retrogression`, `closure` |
| `editorialResolutions` | EditorialResolution[] | sí | | 6 resoluciones vigentes |
| `houses` | HouseResult[] | sí | 12 elementos | |
| `rings` | RingResult[] | sí | 8 elementos | |

**Source** [EXISTENTE]: `path` (string, oblig.), `sha256` (string, `^[0-9a-f]{64}$`, oblig.), `additionalProperties: false`.

### 2.2 `ContentText` (`$defs/content`) [EXISTENTE]

Unidad mínima de fidelidad. Toda hoja de texto del catálogo es un `ContentText` o una lista de ellos.

| Campo | Tipo | Oblig. | Restricción | Notas |
|---|---|---|---|---|
| `text` | string | sí | `minLength 1` | Texto de aplicación |
| `sourceText` | string | sí | `minLength 1` | Transcripción literal |
| `sourceRefs` | string[] | sí | `minItems 1`, `^tm-src-(tablero\|anillos)#p\d{4}$` | |
| `editorialResolutionId` | string | no | `^ER-\d{3}$` | Obligatorio por **regla de fidelidad** (no por esquema) cuando `text != sourceText` |

Regla de omisión: un campo que la fuente no declara **no existe** en el JSON (nunca `null` ni texto inferido). `rules.missingFields = "omit"`.

### 2.3 `HouseResult` (`$defs/house`) [EXISTENTE]

| Campo | Tipo | Oblig. | Enum / restricción | Notas |
|---|---|---|---|---|
| `id` | string | sí | `house-01`..`house-12`, único | = `content_key` |
| `number` | int | sí | 1..12 | |
| `name` | string | sí | | |
| `zone` | string | sí | p. ej. `Este` | |
| `arcana` | int[] | sí | | Casa 12 = `[0]` |
| `template` | string | sí | `journey` \| `closure` | `closure` solo en número 12 |
| `arrival` | Arrival | sí | | `fields`, `taoSentence`, `rhibu`, `asset` |
| `regression` | Regression | condicional | presente si `template = journey`; **ausente** en Casa 12 | |
| `closure` | Closure | condicional | presente solo si `template = closure` | `hasKipotRepair = false`, `animal`, `sourceRefs` |

- **Arrival.fields**: mapa de claves opcionales a `ContentText` (`quantumField`, `dictum`, `direction`, `dharaniDeva`, `color`, `message`, `rhemaMantra`, `action`, `logoShamkya`, ...). Claves ausentes = no declaradas en la fuente.
- **Regression.fields**: mapa análogo (`prakritiDeva`, `foundation`, `message`, `rhemaMantra`, `request`, `logoShamkya`, ...), más animal y ashura según `templates.retrogression.composition`.
- **Animal** (en `regression` y `closure`): `id` (string), `name` (string), `asset` (ruta string), `phrase` (ContentText), `description` (ContentText[]).

### 2.4 `RingResult` (`$defs/ring`) [EXISTENTE]

| Campo | Tipo | Oblig. | Enum / restricción | Notas |
|---|---|---|---|---|
| `id` | string | sí | `ring-01`..`ring-08`, único | = `content_key` |
| `number` | int | sí | 1..8 | 1 = exterior |
| `radialPosition` | string | sí | p. ej. `outermost` ... `innermost` | |
| `rhibu` | ContentText | sí | | |
| `pattern` | ContentText[] | sí | `minItems 1` | |
| `action` | ContentText | sí | | |

### 2.5 `EditorialResolution` [EXISTENTE]

Vive en `correcciones_editoriales_resultados.v1.json` (`schemaVersion 1`, `policy`, `resolutions[]`) y se replica en `editorialResolutions[]` del catálogo.

| Campo | Tipo | Oblig. | Enum / restricción |
|---|---|---|---|
| `id` | string | sí | `^ER-\d{3}$`, único |
| `status` | string | sí | `corrected` (otros según esquema) |
| `kind` | string | sí | `placeholder_removal`, `internal_consistency`, ... |
| `target` | string | sí | ruta a un nodo existente |
| `sourceRefs` | string[] | sí | igual que `ContentText` |
| `original` | string | sí | debe coincidir con `sourceText` del target |
| `display` | string | sí | debe coincidir con `text` del target |
| `rationale` | string | sí | |

### 2.6 `resultados.v1.schema.json` [EXISTENTE, sin cambios de forma; MODIFICADO su uso]

- `$schema`: draft 2020-12; `$id`: `https://taomangalam.app/schemas/resultados.v1.schema.json`; `$defs`: `content`, `fields`, `animal`, `arrival`, `regression`, `closure`, `house`, `ring`.
- **Nuevo uso (REQ-01)**: validación en `tests/` y en los jobs `docs` de `ci-pr.yml` y `nightly.yml`.
- Decisión abierta para la implementación: si el esquema no impone hoy "Casa 12 sin `regression`" ni "`closure` solo con `template = closure`" (`if/then`), se mantiene como **regla de fidelidad en Python** (ya cubierta por `test_result_catalog.py`) y como **invariante del cargador Dart**. No se cambia el esquema salvo que la validación revele un hueco; si se cambia, no sube `schemaVersion` porque el JSON existente ya lo cumple.

---

## 3. Entidades del pipeline (Python, `scripts/`)

### 3.1 `CatalogSpec` (módulo común) [NUEVO] · `scripts/lib/catalog_pipeline.py`

Descriptor que cada generador de catálogo (resultados hoy; HU-02-05/06/10/11 después) entrega al núcleo común. Solo lo que esos catálogos necesitan (REQ-02).

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `name` | str | sí | | p. ej. `resultados` |
| `version_tag` | str | sí | | `v1` |
| `output_path` | Path | sí | | `docs/content/catalogos/resultados.v1.json` |
| `schema_path` | Path | sí | | `.../resultados.v1.schema.json` |
| `corrections_path` | Path \| None | no | `None` | registro de correcciones editoriales |
| `sources` | dict[str, Path] | sí | | clave `tm-src-*` → transcripción |
| `build` | Callable[[], dict] | sí | | lógica propia del catálogo (queda en `build_result_catalog.py`) |

Funciones comunes que expone (sin estado persistente):

| Función | Responsabilidad | Falla nombrando |
|---|---|---|
| `write_deterministic(data, path)` | JSON con orden estable, `ensure_ascii=False`, indentación y salto final fijos | |
| `check_up_to_date(spec)` | modo `--check`: compara lo generado con lo escrito | archivo |
| `load_corrections(path)` | carga `resolutions[]` indexado por `id` | `id` duplicado |
| `iter_content_nodes(data)` | recorre todas las hojas `ContentText` con su ruta | |
| `check_fidelity(data, corrections)` | `text != sourceText` exige `editorialResolutionId` válido con `original/display` coincidentes | ruta del nodo |
| `check_no_nulls(data)` | ningún `null` ni campo vacío inferido | ruta del nodo |
| `validate_schema(data, schema_path)` | `jsonschema.Draft202012Validator` | ruta JSON del error |

`build_result_catalog.py` [MODIFICADO]: delega en el módulo común sin cambiar su salida (el `--check` sobre el JSON actual debe seguir sin diferencias, REQ-07).

### 3.2 `AppCatalogCopy` [NUEVO] · `scripts/sync_app_catalogs.py`

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `source_dir` | Path | sí | `docs/content/catalogos/` | |
| `target_dir` | Path | sí | `app/assets/catalogos/` | |
| `include` | glob | sí | `*.v[0-9]*.json` excluyendo `*.schema.json` y `correcciones_*` | Solo catálogos consumibles |
| `mode` | enum | sí | `write` | `write` \| `check` |

Salida de `--check`: un mensaje por archivo `faltante`, `desactualizado` (SHA-256 distinto) o `sobrante` en destino; código de salida distinto de cero. Copia **byte a byte** (sin reformatear), igual que el patrón de `assets/legal/`.

### 3.3 Dependencia y entorno [MODIFICADO]

| Elemento | Antes | Después |
|---|---|---|
| Dependencia de validación | no existe | `jsonschema` fijada por versión (archivo de requisitos del job docs, p. ej. `scripts/requirements-docs.txt` [NUEVO]) |
| Python en `ci-pr.yml` / `nightly.yml` (job docs) | `3.12` | una sola versión, consistente con los casos QA |
| Casos QA-02-04-01 | piden `python3.14` | alineados con la versión elegida |

Decisión pendiente para la implementación (REQ-01): mantener **3.12** (DEC-230, ajustar el texto del QA) o subir a **3.14** (ajustar ambos workflows). Recomendación: 3.12, porque DEC-230 la fija y no hay nada del pipeline que requiera 3.14. Se documenta en `catalogos/README.md` (REQ-06).

---

## 4. Entidades del lado app (Dart) [NUEVO todo]

Ubicación sugerida, coherente con `app/lib/data/`: `app/lib/data/catalogos/`. Inmutables (`final`, constructores `const`, colecciones no modificables; `built_collection` ya está en `pubspec` si se prefiere sobre `List.unmodifiable`). Sin red: lectura vía `rootBundle` (DEC-094).

### 4.1 `ContentRef` (mixin o interfaz)

| Campo | Tipo Dart | Oblig. | Origen |
|---|---|---|---|
| `contentKey` | `String` | sí | `id` del nodo |
| `contentVersion` | `String` | sí | `catalogVersion` del catálogo |

Lo implementan `HouseResult` y `RingResult`. Es el par que EP-06/EP-07 persistirán (DEC-178); el cargador no lo guarda.

### 4.2 `ResultCatalog`

| Campo | Tipo Dart | Oblig. | Notas |
|---|---|---|---|
| `schemaVersion` | `int` | sí | siempre `1` si se construyó |
| `catalogVersion` | `String` | sí | |
| `locale` | `Locale` / `String` | sí | `es` |
| `houses` | `List<HouseResult>` inmutable | sí | longitud 12, ordenada por `number` |
| `rings` | `List<RingResult>` inmutable | sí | longitud 8, ordenada por `number` |
| `houseByKey(String)` / `ringByKey(String)` | accesor | | búsqueda por `content_key` |

`sources`, `rules`, `templates` y `editorialResolutions` **no se modelan** en esta HU (no hay consumidor en la app); se ignoran al parsear sin romper. `templates` podrá incorporarse cuando EP-07 lo necesite.

### 4.3 `HouseResult` implements `ContentRef`

| Campo | Tipo Dart | Oblig. | Notas |
|---|---|---|---|
| `contentKey` | `String` | sí | `house-NN` |
| `contentVersion` | `String` | sí | |
| `number` | `int` | sí | |
| `name` | `String` | sí | |
| `zone` | `String` | sí | |
| `arcana` | `List<int>` | sí | |
| `template` | `HouseTemplate` | sí | enum `journey`, `closure` |
| `arrival` | `HouseArrival` | sí | |
| `regression` | `HouseRegression?` | condicional | `null` en Casa 12 |
| `closure` | `HouseClosure?` | condicional | solo en Casa 12 |

Invariante validada en el parseo: `template == closure` ⇔ `number == 12` ⇔ `regression == null && closure != null`.

### 4.4 `RingResult` implements `ContentRef`

| Campo | Tipo Dart | Oblig. |
|---|---|---|
| `contentKey` | `String` (`ring-NN`) | sí |
| `contentVersion` | `String` | sí |
| `number` | `int` | sí |
| `radialPosition` | `String` | sí |
| `rhibu` | `ContentText` | sí |
| `pattern` | `List<ContentText>` | sí |
| `action` | `ContentText` | sí |

### 4.5 Tipos de apoyo

| Tipo | Campos | Notas |
|---|---|---|
| `ContentText` | `text: String`, `sourceRefs: List<String>`, `editorialResolutionId: String?` | `sourceText` no se expone a la UI (decisión de implementación; si se requiere trazabilidad en QA, se agrega) |
| `HouseArrival` | `fields: Map<String, ContentText>` inmutable, `taoSentence: List<ContentText>`, `rhibu: ContentText?`, `asset: String?` | campos ausentes = clave ausente, nunca string vacío |
| `HouseRegression` | `fields: Map<String, ContentText>`, `animal: ResultAnimal`, demás piezas según `$defs/regression` | |
| `HouseClosure` | `hasKipotRepair: bool`, `sourceRefs: List<String>`, `animal: ResultAnimal` | |
| `ResultAnimal` | `id`, `name`, `asset`, `phrase: ContentText`, `description: List<ContentText>` | |
| `HouseTemplate` | enum `journey`, `closure` | valor desconocido → error tipado |

### 4.6 `ResultCatalogLoader` y errores tipados

| Elemento | Definición |
|---|---|
| `supportedSchemaVersion` | constante `1` |
| `catalogAssetPath` | constante `assets/catalogos/resultados.v1.json` |
| `Future<ResultCatalog> load({AssetBundle? bundle})` | lee el asset; `bundle` inyectable para tests (QA-02-04-03) |
| `ResultCatalog parse(Map<String, Object?> json)` | puro, sin IO |
| `CatalogLoadException` (sealed) | base del cargador |
| `UnsupportedSchemaVersionException` | `found: int`, `supported: int`; se lanza **antes** de parsear nodos |
| `CatalogFormatException` | `path: String` (ruta JSON), `reason: String`; tipo inválido, `locale != es`, conteos distintos de 12/8, invariante de Casa 12 rota, `id` duplicado |

Garantía de atomicidad (REQ-05): el parseo construye todo en locales y retorna solo al final; cualquier excepción impide devolver un `ResultCatalog` parcial.

---

## 5. Índices y unicidad

No hay índices de base de datos. Las garantías equivalentes son:

| Garantía | Dónde se verifica |
|---|---|
| `houses[].id` único y con forma `house-\d{2}` | esquema + prueba Python [EXISTENTE] + `CatalogFormatException` en Dart [NUEVO] |
| `rings[].id` único y con forma `ring-\d{2}` | idem |
| `editorialResolutions[].id` único | `load_corrections` [NUEVO en módulo común] |
| `editorialResolutionId` referencia una resolución existente | `check_fidelity` [EXISTENTE, se extrae al módulo común] |
| Lookup por `content_key` O(1) | mapas internos de `ResultCatalog` [NUEVO] |

---

## 6. Archivos y declaraciones afectadas

| Archivo | Estado | Cambio |
|---|---|---|
| `docs/content/catalogos/resultados.v1.json` | EXISTENTE | sin cambios (el `--check` debe quedar limpio) |
| `docs/content/catalogos/resultados.v1.schema.json` | EXISTENTE | sin cambios salvo hueco detectado (ver 2.6) |
| `docs/content/catalogos/correcciones_editoriales_resultados.v1.json` | EXISTENTE | sin cambios |
| `docs/content/fuentes/**` | EXISTENTE | intacto (REQ-07) |
| `docs/content/catalogos/README.md` | MODIFICADO | patrón común, script de copia, versión de Python; pasa el linter de docs (REQ-06) |
| `scripts/lib/catalog_pipeline.py` | NUEVO | núcleo común |
| `scripts/build_result_catalog.py` | MODIFICADO | delega en el núcleo; salida idéntica |
| `scripts/sync_app_catalogs.py` | NUEVO | copia y `--check` |
| `tests/test_result_catalog.py` | MODIFICADO | agrega validación de esquema (sin tocar pruebas de fidelidad existentes, salvo aprobación) |
| `tests/test_catalog_pipeline.py`, `tests/test_sync_app_catalogs.py` | NUEVO | módulo común y copia |
| `app/assets/catalogos/resultados.v1.json` | NUEVO | copia byte a byte |
| `app/pubspec.yaml` | MODIFICADO | `- assets/catalogos/` bajo `flutter.assets`, con comentario DEC-230/DEC-094 al estilo de `assets/legal/` |
| `app/lib/data/catalogos/**` | NUEVO | modelos y cargador |
| `app/test/data/catalogos/**` (+ fixture `schemaVersion: 99`) | NUEVO | conteos, Casa 12, QA-02-04-03, QA-02-04-04 |
| `.github/workflows/ci-pr.yml`, `nightly.yml` (job docs) | MODIFICADO | instalar `jsonschema`, versión única de Python, paso `python3 scripts/sync_app_catalogs.py --check`; acciones fijadas por SHA (REQ-07) |

---

## 7. Notas de migración y versionado

1. **Sin migración de datos**: no hay registros de personas en este ticket. El catálogo `1.0.0` se empaqueta tal cual.
2. **Dos ejes de versión, no mezclar**:
   - `schemaVersion` (int): forma del documento. Un cambio incompatible sube a `2`, crea `resultados.v2.schema.json`/`.v2.json` y exige un binario nuevo; el cargador actual lanza `UnsupportedSchemaVersionException`.
   - `catalogVersion` (semver): contenido. Todo cambio de `text` sube la versión (DEC-178) y, por lo tanto, el `content_version` que verán los registros futuros. Los registros ya guardados conservan la versión con que se vieron.
3. **Orden de cambio obligatorio**: fuente → regenerar (`build_result_catalog.py`) → validar esquema y fidelidad → `sync_app_catalogs.py` → commit conjunto. CI rechaza cualquier eslabón desalineado nombrando el archivo o el nodo.
4. **Rollback**: revertir juntos módulo común, generador, copia, declaración en `pubspec.yaml` y cargador; restaurar el último `resultados.v1.json` validado; `docs/content/fuentes/` no se toca. Comprobación: `--check` de ambos scripts sin diferencias y la app carga `1.0.0`.
5. **Dependencia de HU-00-02**: el cargador Dart y sus pruebas requieren la base de la app; el pipeline Python (REQ-01, 02, 03) puede entregarse antes sin bloqueo.
6. **Riesgo identificado**: `closure.animal.asset` y `regression.animal.asset` apuntan a rutas `app/assets/animales-ashura/*.png` (maestros PNG). DEC-240 prohíbe declarar PNG en `pubspec.yaml`; el cargador debe tratar `asset` como **referencia lógica** y no resolverla a un asset empaquetado en esta HU. La resolución a derivados WebP queda para EP-07.