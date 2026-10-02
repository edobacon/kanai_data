# Modelo de datos — HU-01-02 · Resolvedor de imágenes por familia, tamaño, orientación y tema

> Alcance del modelo: este resolvedor no persiste en base de datos. El modelo de datos es (a) el **esquema del manifiesto de assets** que se lee desde disco (`app/assets/manifest.json`, hoy existente y parcial) y (b) los **objetos de dominio en memoria** que el resolvedor expone a sus consumidores. Las "migraciones" son migraciones de **formato del manifiesto** y de la **fixture de M0**, no de SQL.
>
> Convención de marcas: **[NUEVO]** se crea en esta historia · **[EXISTENTE]** ya está en el repo o lo aporta otra historia · **[EXTENDIDO]** existe pero esta historia le agrega campos · **[DIFERIDO]** se declara ahora, se puebla en otra historia.

---

## 1. Mapa de entidades

| Entidad | Naturaleza | Estado | Dueño |
|---|---|---|---|
| `AssetManifest` | documento JSON raíz, leído en arranque | **[EXTENDIDO]** | HU-01-02 lee; HU-02-02 fija el esquema final |
| `AssetEntry` | entrada de asset individual (ilustración u otro) | **[EXTENDIDO]** | HU-02-02 |
| `ImageFamilyContract` | contrato por familia de fondo | **[NUEVO]** | HU-01-02 |
| `ThemeVariantSet` | juego de variantes de un tema (`light` / `dark`) | **[NUEVO]** | HU-01-02 |
| `ImageVariant` | derivado concreto apuntado por una variante | **[NUEVO]** | HU-01-02 |
| `ImageRequest` | pedido de resolución (entrada del resolvedor) | **[NUEVO]** | HU-01-02 |
| `ResolvedImage` | resultado de la resolución (unión etiquetada) | **[NUEVO]** | HU-01-02 |
| `FallbackSurfaceSpec` | superficie de respaldo materializada | **[NUEVO]** | HU-01-02 |
| `AssetLoadFailureLog` | registro de desarrollo por falla de carga | **[NUEVO]** | HU-01-02 |
| `ImageManifestSource` | interfaz de lectura del manifiesto | **[NUEVO]** | HU-01-02 (fixture en M0) |
| `ThemeTokenRef` | referencia a un token del tema claro forzado | **[EXISTENTE]** | HU-01-01 (`tokens.v1.json`) |

---

## 2. Enumeraciones

### 2.1 `AppThemeMode` **[NUEVO]**

| Valor | Nota |
|---|---|
| `light` | único valor seleccionable en V1 |
| `dark` | declarado para compatibilidad futura (DEC-196); el resolvedor **nunca** lo elige en V1 |

Default: `light`. Regla invariante: con `theme = light`, la rama `dark` del `ImageFamilyContract` jamás se lee, aunque esté poblada (REQ-02, criterio 2).

### 2.2 `LayoutTarget` **[NUEVO]**

| Valor | Condición de selección |
|---|---|
| `phonePortrait` | ancho lógico menor al corte de tablet, orientación vertical |
| `tabletPortrait` | ancho lógico mayor o igual al corte de tablet, orientación vertical |
| `tabletLandscape` | ancho lógico mayor o igual al corte de tablet, orientación horizontal |

Sin valor `phoneLandscape` en V1: cae a `phonePortrait` por composición. El corte de tablet es una constante del resolvedor, no un campo del manifiesto.

### 2.3 `DensityBucket` **[NUEVO]**

| Valor | Nota |
|---|---|
| `x1` / `x2` / `x3` | buckets de Flutter (DEC-230). Derivado de `MediaQuery.devicePixelRatio`, no persistido en el manifiesto |

La elección del archivo por bucket la hace el `AssetBundle` de Flutter mediante el convenio de carpetas `2.0x/`, `3.0x/`; el modelo solo guarda la **ruta base**.

### 2.4 `ImageFit` **[NUEVO]**

| Valor | Uso |
|---|---|
| `cover` | capa de fondo a pantalla completa (DEC-235) |
| `contain` | ilustración editorial sin marco |

Default por entidad: `cover` en `ImageFamilyContract`, `contain` en `AssetEntry` de tipo ilustración.

### 2.5 `SemanticRole` **[NUEVO]**

| Valor | Efecto |
|---|---|
| `decorative` | fuera del árbol de accesibilidad (`ExcludeSemantics`); `alt` debe ser nulo |
| `informative` | se anuncia con `alt`; `alt` es obligatorio |

Default: `decorative`. Los fondos de familia son siempre `decorative`.

### 2.6 `AssetAvailability` **[NUEVO, DIFERIDO]**

| Valor | Nota |
|---|---|
| `bundled` | empaquetado en el binario (único valor usado en M0) |
| `downloadable` | descarga bajo demanda, HU-02-09 (M1a) |
| `missing` | declarado en el manifiesto sin derivado disponible; fuerza respaldo |

Default: `bundled`. El manifiesto actual **no tiene este campo** (ver §7, migración M-02).

### 2.7 `FallbackReason` **[NUEVO]**

`variantAbsent` · `variantNull` · `fileNotFound` · `decodeFailed` · `themeExcluded` · `availabilityNotReady`

No se persiste; viaja en `ResolvedImage` y en el log de desarrollo.

---

## 3. Entidades del manifiesto (datos en disco)

### 3.1 `AssetManifest` **[EXTENDIDO]**

Raíz de `app/assets/manifest.json`. Hoy existen 64 entradas planas de assets; esta historia agrega el bloque de familias y la versión de esquema.

| Campo | Tipo | Obligatorio | Default | Estado | Nota |
|---|---|---|---|---|---|
| `schemaVersion` | `int` | sí | `1` | **[NUEVO]** | permite coexistencia con el formato previo durante M0 (§7, M-01) |
| `assets` | `Map<String, AssetEntry>` | sí | `{}` | **[EXISTENTE]** | clave = `AssetEntry.id`; las 64 entradas actuales |
| `families` | `Map<String, ImageFamilyContract>` | sí | `{}` | **[NUEVO]** | clave = `ImageFamilyContract.familyId` |
| `generatedAt` | `DateTime (ISO-8601)` | no | `null` | **[DIFERIDO]** | lo escribe el generador de HU-02-02 |

Invariante de carga: un manifiesto que no parsea o que falla validación **no tumba la app**; el resolvedor queda en estado degradado y toda resolución devuelve respaldo (REQ-04).

### 3.2 `AssetEntry` **[EXTENDIDO]**

| Campo | Tipo | Obligatorio | Default | Estado | Nota |
|---|---|---|---|---|---|
| `id` | `String` (slug `kebab-case`) | sí | — | **[EXISTENTE]** | PK lógica dentro de `assets`; es el id que aparece en el log de fallas |
| `basePath` | `String` | sí | — | **[EXISTENTE]** | ruta base sin sufijo de densidad; único lugar del código con rutas literales (REQ-08) |
| `intrinsicWidthPx` | `int` | sí | — | **[NUEVO]** | tope de ampliación (REQ-03, criterio 5) |
| `intrinsicHeightPx` | `int` | sí | — | **[NUEVO]** | con el anterior da `aspectRatio` para reservar proporción |
| `semanticRole` | `SemanticRole` | sí | `decorative` | **[NUEVO]** | REQ-05 |
| `alt` | `String` | condicional | `null` | **[EXTENDIDO]** | obligatorio si `semanticRole = informative`; debe ser nulo si `decorative` |
| `fit` | `ImageFit` | no | `contain` | **[NUEVO]** | ilustración editorial |
| `availability` | `AssetAvailability` | no | `bundled` | **[NUEVO, DIFERIDO]** | campo de estado que hoy falta en las 64 entradas |
| `downloadWidths` | `List<int>` | no | `[]` | **[DIFERIDO]** | anchos descargables (`content/imagenes/12`, regla 3); se puebla en HU-02-09 |

Restricción de integridad `CK_alt_by_role`: `(semanticRole = informative AND alt != null AND alt.trim().isNotEmpty) OR (semanticRole = decorative AND alt == null)`. Se valida en carga; la entrada inválida se degrada a `decorative` y queda un log de desarrollo.

### 3.3 `ImageFamilyContract` **[NUEVO]**

Contrato por familia de fondo (diez familias de doc 43 §9; en M0 la fixture cubre `tecnologia/22` y `familia-recorrido`).

| Campo | Tipo | Obligatorio | Default | Nota |
|---|---|---|---|---|
| `familyId` | `String` (slug) | sí | — | PK lógica dentro de `families` |
| `light` | `ThemeVariantSet` | sí | — | las tres variantes requeridas en V1 |
| `dark` | `ThemeVariantSet` | no | set con las tres en `null` | DEC-196; nunca se lee con tema claro |
| `fallbackSurfaceToken` | `ThemeTokenRef` | sí | — | **FK lógica** al tema claro forzado de HU-01-01 (REQ-09) |
| `overlayToken` | `ThemeTokenRef` | sí | — | **FK lógica** al mismo tema; aporta el velo del fondo |
| `backgroundOpacity` | `double` | no | `0.15` | rango válido `[0.12, 0.18]` (DEC-235); fuera de rango se recorta al extremo más cercano y se loguea |
| `fit` | `ImageFit` | no | `cover` | fijo en V1 para fondos |
| `reservedAspectRatio` | `double` | no | `null` | si es nulo se deriva del primer `ImageVariant` no nulo; evita salto de layout en respaldo (REQ-04) |

Sin campo de punto focal: el recorte dirigido lo aporta la composición de cada derivado (`content/imagenes/12`), por decisión explícita del alcance.

Restricción `CK_light_required`: en V1, `light.phonePortrait` debe ser no nulo. Una familia sin esa variante se carga igual, pero toda resolución de esa familia devuelve respaldo y queda un log de validación.

### 3.4 `ThemeVariantSet` **[NUEVO]**

| Campo | Tipo | Obligatorio | Default | Nota |
|---|---|---|---|---|
| `phonePortrait` | `ImageVariant?` | no | `null` | |
| `tabletPortrait` | `ImageVariant?` | no | `null` | faltante hasta HU-02-08; hoy resuelve a respaldo |
| `tabletLandscape` | `ImageVariant?` | no | `null` | ídem |

Es un objeto cerrado de tres claves, no un mapa abierto: las claves son exactamente los valores de `LayoutTarget`, de modo que agregar un target futuro sea un cambio de tipo visible y no un dato suelto.

### 3.5 `ImageVariant` **[NUEVO]**

| Campo | Tipo | Obligatorio | Default | Nota |
|---|---|---|---|---|
| `assetId` | `String` | sí | — | **FK lógica** a `AssetManifest.assets[assetId]` |
| `intrinsicWidthPx` | `int` | no | el del `AssetEntry` | permite override por variante |
| `intrinsicHeightPx` | `int` | no | el del `AssetEntry` | ídem |

Modelar la variante como referencia por `assetId` (y no como ruta embebida) deja una sola tabla de rutas, que es lo que el lint de REQ-08 necesita vigilar.

Restricción `FK_variant_asset`: un `assetId` inexistente no es error fatal; la variante se trata como ausente (`FallbackReason.variantAbsent`) y se loguea en carga.

---

## 4. Objetos de dominio en memoria

### 4.1 `ImageRequest` **[NUEVO]**

| Campo | Tipo | Obligatorio | Default | Nota |
|---|---|---|---|---|
| `familyId` | `String?` | condicional | `null` | excluyente con `assetId` |
| `assetId` | `String?` | condicional | `null` | excluyente con `familyId` |
| `layoutTarget` | `LayoutTarget` | sí | — | derivado de `MediaQuery` por el llamador |
| `theme` | `AppThemeMode` | sí | `light` | en V1 siempre `light` |
| `density` | `DensityBucket` | sí | — | derivado de `devicePixelRatio` |
| `logicalSize` | `Size` (dp) | sí | — | espacio real de dibujo; alimenta `cacheWidth`/`cacheHeight` |

Restricción `CK_target_xor`: exactamente uno de `familyId` / `assetId` es no nulo.

### 4.2 `ResolvedImage` **[NUEVO]**

Unión etiquetada de dos casos; el consumidor no puede ignorar el caso de respaldo.

Caso `ResolvedImageAsset`:

| Campo | Tipo | Obligatorio | Nota |
|---|---|---|---|
| `assetId` | `String` | sí | para el log si falla la decodificación |
| `basePath` | `String` | sí | lo consume el `AssetImage` de Flutter |
| `fit` | `ImageFit` | sí | |
| `cacheWidthPx` | `int` | sí | `min(ceil(logicalSize.width × densityFactor), intrinsicWidthPx)` |
| `cacheHeightPx` | `int` | sí | análogo por alto |
| `semanticRole` | `SemanticRole` | sí | |
| `alt` | `String?` | condicional | no nulo solo si `informative` |
| `aspectRatio` | `double` | sí | reserva de layout |

Caso `ResolvedImageFallback`: lleva un `FallbackSurfaceSpec` y el `FallbackReason`.

La regla de `cacheWidthPx` es la que cubre el criterio del derivado de 640 px en 160 dp a 3x: `160 × 3 = 480`, acotado además por `intrinsicWidthPx = 640`, da 480.

### 4.3 `FallbackSurfaceSpec` **[NUEVO]**

| Campo | Tipo | Obligatorio | Default | Nota |
|---|---|---|---|---|
| `surfaceToken` | `ThemeTokenRef` | sí | — | del `ImageFamilyContract`; sin color literal propio (REQ-09) |
| `overlayToken` | `ThemeTokenRef` | sí | — | ídem |
| `opacity` | `double` | sí | `0.15` | el de la familia, ya recortado al rango |
| `aspectRatio` | `double` | sí | — | mantiene la proporción reservada, sin salto de layout |
| `reason` | `FallbackReason` | sí | — | para el log y para los widget tests |

Para un pedido por `assetId` sin familia, los tokens caen a un contrato de respaldo neutro del resolvedor (constante única, también resuelta por token, no por color literal).

### 4.4 `AssetLoadFailureLog` **[NUEVO]**

Registro de desarrollo, no persistido ni enviado a telemetría en M0.

| Campo | Tipo | Obligatorio | Nota |
|---|---|---|---|
| `assetId` | `String?` | sí | nulo solo si la falla es de familia sin variante |
| `familyId` | `String?` | no | |
| `requestedVariant` | `String` | sí | `"{theme}.{layoutTarget}"` |
| `reason` | `FallbackReason` | sí | |
| `timestamp` | `DateTime` | sí | |

Restricción de privacidad `CK_no_device_paths`: el registro no incluye rutas absolutas del dispositivo ni datos personales; `basePath` se omite deliberadamente y el `assetId` alcanza para diagnosticar.

### 4.5 `ImageManifestSource` **[NUEVO]**

Interfaz de lectura, no entidad de datos. Dos implementaciones: `FixtureImageManifestSource` (M0, lee una fixture de test) y `BundleImageManifestSource` (lee `app/assets/manifest.json`). El resolvedor depende de la interfaz, por lo que HU-02-02 puede cambiar el origen sin tocar consumidores.

---

## 5. Índices y claves de acceso

No hay índices de base de datos. Las estructuras de acceso son mapas construidos una vez en carga, en memoria:

| Índice | Clave | Valor | Uso |
|---|---|---|---|
| `IX_assets_by_id` | `assetId` | `AssetEntry` | resolución por asset y validación de `FK_variant_asset` |
| `IX_families_by_id` | `familyId` | `ImageFamilyContract` | resolución por familia |
| `IX_variant_by_family_theme_target` | `(familyId, theme, layoutTarget)` | `ImageVariant?` | camino caliente del resolvedor; evita recorrer el contrato en cada frame |
| `IX_resolution_cache` | `(familyId or assetId, theme, layoutTarget, density, logicalSize redondeado)` | `ResolvedImage` | caché opcional de resolución; se invalida al recargar el manifiesto |

El tercer índice se construye excluyendo de entrada la rama `dark` cuando el tema es claro, de modo que la regla "nunca una variante `dark.*`" sea estructural y no una condición repartida por el código.

---

## 6. Relaciones

- `AssetManifest` **1 — N** `AssetEntry` (composición, clave `assetId`).
- `AssetManifest` **1 — N** `ImageFamilyContract` (composición, clave `familyId`).
- `ImageFamilyContract` **1 — 2** `ThemeVariantSet` (`light` obligatorio, `dark` opcional).
- `ThemeVariantSet` **1 — 0..3** `ImageVariant` (una por `LayoutTarget`).
- `ImageVariant` **N — 1** `AssetEntry` (FK lógica `assetId`; varias familias pueden compartir un derivado).
- `ImageFamilyContract` **N — 2** `ThemeTokenRef` (FK lógica al tema claro forzado de HU-01-01; no se duplica el mecanismo de tokens).
- `ImageRequest` **1 — 1** `ResolvedImage` (función total: todo pedido devuelve asset o respaldo, nunca excepción).
- `ResolvedImageFallback` **1 — 1** `FallbackSurfaceSpec`, y **1 — 0..1** `AssetLoadFailureLog`.

---

## 7. Notas de migración

El manifiesto actual (`app/assets/manifest.json`, 64 entradas, sin campo de estado) y los maestros de `app/assets/fondos-vistas/` (6 familias, 4 fondos de vista, 940/941 × 1672, aptos solo para maqueta) son el punto de partida. Las migraciones son de formato de archivo, aditivas y reversibles.

| Id | Cambio | Alcance | Reversibilidad |
|---|---|---|---|
| M-01 | Agregar `schemaVersion: 1` en la raíz | HU-01-02 | quitar el campo; el lector trata su ausencia como versión 1 |
| M-02 | Agregar a cada `AssetEntry`: `intrinsicWidthPx`, `intrinsicHeightPx`, `semanticRole`, `alt` normalizado, `fit`, `availability` | HU-01-02 define el shape; HU-02-02 lo puebla para las 64 entradas | campos opcionales con default en el lector; sin ellos, la entrada resuelve a respaldo en vez de romper |
| M-03 | Agregar el bloque `families` con las familias de M0 | HU-01-02 (fixture) y HU-02-08 (fondos finales) | bloque ausente equivale a `families: {}`: todo fondo cae a respaldo |
| M-04 | Poblar `tabletPortrait` y `tabletLandscape` | HU-02-08 (M1a) | hasta entonces quedan en `null`, que es un valor válido del modelo |
| M-05 | Poblar `downloadWidths` y `availability: downloadable` | HU-02-09 (M1a) | el resolvedor ignora `downloadable` en M0 y lo trata como `availabilityNotReady` → respaldo |
| M-06 | Poblar la rama `dark` | posterior a 1.0 (DEC-196) | el modelo ya la acepta; mientras el tema sea `light`, poblarla no cambia ninguna resolución |

Compatibilidad hacia adelante (REQ de compatibilidad): un tema futuro se agrega poblando `ThemeVariantSet.dark` y cambiando `ImageRequest.theme`; ningún widget consumidor cambia, porque consumen `ResolvedImage` y no el manifiesto.

Rollback de la historia: retirar el resolvedor y volver al acceso anterior de fixtures **sin borrar ni revertir el manifiesto** (M-01 y M-02 son aditivas y toleradas por el lector previo, que ignora campos desconocidos). La superficie de respaldo se conserva hasta verificar el reemplazo.

Riesgo de datos a vigilar: las 64 entradas actuales no declaran `semanticRole` ni `alt`, por lo que al adoptar el default `decorative` toda imagen hoy existente queda fuera del árbol de accesibilidad hasta que HU-02-02 marque las informativas. Es el default seguro (nunca se anuncia un `alt` vacío o inventado), pero debe quedar registrado como deuda explícita de contenido, no como comportamiento final.