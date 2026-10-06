Revisaré las fuentes y el esquema existente para distinguir los cambios propuestos de los campos actuales, sin ejecutar tareas de TAO-190.
# Modelo de datos — TAO-190

## Alcance y estado

**Modelo propuesto para preparación; no constituye implementación, entrega ni aprobación.** Cubre HU-02-01 → HU-02-02 → HU-02-03 → HU-02-07 y el suministro a HU-01-12/TAO-183.

La rama autorizada es `epic/EP-01a`. Durante este intake no se ejecutan tareas, pruebas ni cambios de rama o archivos. `SkipTeach` omite teach; conserva QA, controles canónicos y aprobaciones externas.

No se requieren tablas nuevas en la DB de producto ni endpoints productivos. Los objetos descritos corresponden al manifiesto, configuración del pipeline, decisiones y evidencias. Los registros operativos de Kanai permanecen en su repositorio de datos separado.

**Convenciones:**

- **Existente:** observado en el manifiesto o interfaz actual.
- **Modificado:** evolución de un elemento existente.
- **Nuevo:** campo u objeto propuesto; su nombre definitivo debe verificarse durante la preparación canónica.
- **FK lógica:** referencia validada entre objetos o a un registro canónico; no implica una FK SQL.
- **Sin default:** el dato debe declararse o medirse. JSON Schema no debe completar silenciosamente datos ausentes.

## 1. Manifiesto de assets

**Existente, modificado.** Fuente única: `app/assets/manifest.json`.

| Campo | Cambio | Tipo | Obligatorio | FK / enum / default |
|---|---|---|---|---|
| `schemaVersion` | Modificado | integer | Sí | Constante `2`; actualmente `1` |
| `visualSystem` | Existente | string | Sí | Conservar `tao-mangalam-ink-v1` |
| `updatedAt` | Existente | string, fecha ISO | Sí | Fecha real de actualización; sin default |
| `assets` | Existente | Asset[] | Sí | IDs únicos |
| `policyRef` | Nuevo | string | Sí | FK lógica a la DEC publicada de HU-02-01 |
| `nonProductiveFiles` | Nuevo | ArchivoNoProductivo[] | Sí | Puede ser `[]` tras comprobar cobertura |

El esquema debe rechazar campos desconocidos en los objetos definidos. La unicidad por campo, las referencias y la coherencia con archivos requieren validación adicional al JSON Schema.

## 2. Asset productivo

**Existente, ampliado.** Un registro representa una pieza con identidad estable; sus usos y derivados son objetos hijos.

| Campo | Cambio | Tipo | Obligatorio | FK / enum / default |
|---|---|---|---|---|
| `id` | Existente | string no vacío | Sí | PK lógica; inmutable |
| `kind` | Existente | string | Sí | Catálogo cerrado de tipos, ampliado para identidad, arcanos y zodiaco |
| `family` | Modificado | string | Condicional | Conservar significado actual de familia visual; no sobrescribirlo con familia de exportación |
| `exportFamily` | Nuevo | string | Sí | FK lógica a PolíticaFamilia |
| `src` | Existente | string, ruta relativa | Salvo `faltante` | Ruta del maestro PNG; sin traversal |
| `alt` | Existente | string | Sí | No vacío para piezas informativas; conservar los 64 valores existentes |
| `decorative` | Nuevo | boolean | Sí | Default propuesto `false`; no inferirlo para vaciar `alt` |
| `state` | Nuevo | string | Sí | `aprobado`, `provisional`, `por-corregir`, `por-optimizar`, `faltante`; sin default |
| `provenance` | Nuevo | Procedencia | Sí | Puede declarar pendientes explícitos |
| `master` | Nuevo | MetadatosMaestro o null | Salvo `faltante` | Datos medidos del archivo `src` |
| `uses` | Nuevo | UsoAsset[] | Sí | Al menos un destino y tamaño objetivo |
| `theme` | Nuevo | string | Sí | Constante `light` en V1 |
| `platforms` | Nuevo | string[] | Sí | Conjunto no vacío de `ios`, `android` |
| `mode` | Nuevo | string | Sí | `empaquetado`, `descargable`; derivado de la política real |
| `approvals` | Nuevo | Aprobación[] | Sí | `[]` si no hay registros reales |
| `derivatives` | Nuevo | DerivadoWebP[] | Sí | `[]` permitido según estado |
| `house` | Existente | integer | Según tipo | Rango 1–12; conservar asociación |
| `views` | Existente | string[] | Según destino | Referencias a vistas canónicas |
| `animal`, `role`, `section`, `action`, `mineral`, `material` | Existentes | string | Según tipo | Conservar valores y significado |
| `aliases` | Existente | string[] | No | Conservar alias existentes |
| `number` | Nuevo | integer | Para piezas numeradas sin `house` | Número canónico; sin renumeración |
| `slug` | Nuevo | string | Para nombres de exportación que lo requieran | Nombre canónico; sin default |

`kind` y `exportFamily` no sustituyen las claves históricas del consumidor. La clasificación del inventario tampoco modifica por sí sola el contrato de familias visuales.

### MetadatosMaestro — nuevo

| Campo | Tipo | Obligatorio | Restricción / default |
|---|---|---|---|
| `widthPx`, `heightPx` | integer | Sí | Mayores que cero; coinciden con PNG real |
| `bytes` | integer | Sí | Mayor que cero; medido |
| `sha256` | string | Sí | 64 caracteres hexadecimales |
| `hasAlpha` | boolean | Sí | Detectado en el maestro |
| `colorProfile` | string o null | Sí | Perfil detectado; `null` si no existe |

Los hashes permiten verificar que la exportación no modifica maestros. La ausencia de perfil en un PNG no autoriza registrar ficticiamente sRGB.

### Procedencia — nueva

| Campo | Tipo | Obligatorio | FK / enum / default |
|---|---|---|---|
| `status` | string | Sí | `pendiente`, `documentada`; sin default |
| `sourceRef` | string o null | Sí | Referencia real de procedencia |
| `authorRef` | string o null | Sí | Autoría real; FK lógica cuando exista registro |
| `creationRecordRef` | string o null | Sí | FK lógica al registro de creación |
| `pendingItems` | string[] | Sí | Pendientes explícitos; `[]` si están resueltos |

No se inventa un catálogo de licencias ni una versión legal. La indefinición externa de autoría/licencia puede mantenerse documentada durante el inventario, pero bloquea la promoción final conforme a las fuentes.

## 3. Usos y destinos

**Nuevo.** Define lo que debe exportarse por pieza y composición.

| Campo | Tipo | Obligatorio | FK / enum / default |
|---|---|---|---|
| `id` | string | Sí | Único dentro del asset |
| `destinations` | string[] | Sí | Referencias no vacías a vistas/componentes |
| `purpose` | string | Sí | Uso canónico de `content/imagenes/12` |
| `logicalWidth`, `logicalHeight` | number | Sí | Mayores que cero; medidas objetivo |
| `layout` | string o null | Sí | `phonePortrait`, `tabletPortrait`, `tabletLandscape`; null si no aplica |
| `densities` | integer[] | Sí | Exactamente `[1, 2, 3]` para usos WebP de estas historias |
| `outputBase` | string | Sí | Ruta base estable; evita colisiones entre usos |
| `sizingRef` | string | Sí | Referencia al tamaño canónico utilizado |
| `fit` | string | Condicional | `contain` para las ilustraciones de HU-02-07 |
| `background` | string | Condicional | `transparent` o `ivory100` para esas ilustraciones |

Para `faltante`, estos datos describen el destino y tamaño solicitado, no medidas de un archivo inexistente.

Cada uso conserva la proporción del maestro. Si una composición exige otro encuadre, debe existir su maestro correspondiente; el pipeline no crea composiciones nuevas de fondos.

## 4. Aprobaciones externas

**Nuevo en el manifiesto; referencias a registros reales conservados.**

| Campo | Tipo | Obligatorio | FK / enum / default |
|---|---|---|---|
| `recordRef` | string | Sí | FK lógica a evidencia externa real |
| `authority` | string | Sí | `diseno`, `contenido` |
| `reviewerRef` | string | Sí | Persona o responsable registrado |
| `decision` | string | Sí | `aprobado`, `rechazado`; sin default |
| `reviewedAt` | string, datetime ISO | Sí | Fecha real |
| `scope` | string | Sí | `maestro`, `derivados`, `familia`, `icono` |
| `assetIds` | string[] | Sí | FK lógica a Asset |
| `masterSha256` | string | Sí | Versión revisada del maestro |
| `derivativeSha256s` | string[] | Para revisión de derivados | Hashes del conjunto revisado |
| `evidenceRefs` | string[] | Sí | Hojas, capturas, comentarios o actas reales |

Una aprobación del maestro no acredita automáticamente la fidelidad de sus derivados. Una modificación del contenido revisado invalida su aplicabilidad a la nueva versión; conserva el registro histórico.

### Reglas de estado

| Estado | Condición de integridad |
|---|---|
| `faltante` | Puede carecer de archivo; exige destino y medidas objetivo. No tiene derivados finales. |
| `provisional` | Pieza pendiente de aprobación final. Permanencia sin aprobación estética permanece aquí y no genera derivados finales. |
| `por-corregir` | Requiere corrección documentada; no se presenta como pieza final aprobada. |
| `por-optimizar` | Maestro aprobado realmente por Diseño y Contenido, sin completar los derivados exigidos. |
| `aprobado` | Procedencia/autoría resueltas, aprobaciones reales aplicables y derivados completos, válidos y registrados. |

Las transiciones conservan DEC-230. No existe promoción automática por migración, generación de archivos, ejecución de CI o `SkipTeach`. Si una entrada declara `aprobado` sin derivados, el validador falla e indica `por-optimizar`; no corrige silenciosamente el dato.

## 5. Política de origen, presupuesto y exportación

**Nueva.** La DEC es la autoridad; su configuración ejecutable debe referenciarla y coincidir con ella. No se eligen proveedor, cifras ni calidad durante este modelo.

| Campo | Tipo | Obligatorio | FK / enum / default |
|---|---|---|---|
| `decisionRef` | string | Sí | FK lógica a DEC de HU-02-01 |
| `revision` | string | Sí | Revisión inmutable de política |
| `alternatives` | AlternativaOrigen[] | Sí | Al menos dos |
| `selectedOriginRef` | string | Sí | FK lógica a alternativa evaluada |
| `binaryBudgetMb.ios`, `.android` | number | Sí | Positivos; mediciones justificadas |
| `downloadableEstimateMb` | number | Sí | Estimación reproducible |
| `measurementRef` | string | Sí | Tabla, muestras y método |
| `mbDefinition` | string | Sí | Definición explícita de unidades |
| `cacheLimitsRef` | string | Sí | DEC-202: 1 GB teléfono, 2 GB tablet, reserva de 1 GB |
| `urlVersioning` | string | Sí | Regla inmutable por versión o hash |
| `hashPublication` | string | Sí | Ubicación/contrato de publicación de SHA-256 |
| `access` | string | Sí | `publico`, `credencial`; sin default |
| `downloadListDelivery` | string | Sí | `manifiesto-binario`, `endpoint`; elección documentada |
| `families` | PolíticaFamilia[] | Sí | Cobertura de todas las familias inventariadas |

**AlternativaOrigen** registra `id`, descripción, costos y unidades de almacenamiento/egress, latencia medida, disponibilidad, invalidación, operación desde Railway, fecha y evidencia de evaluación, y motivo de selección o descarte. No almacena secretos.

### PolíticaFamilia — nueva

| Campo | Tipo | Obligatorio | FK / enum / default |
|---|---|---|---|
| `id` | string | Sí | PK lógica de familia de exportación |
| `mode` | string | Sí | `empaquetado`, `descargable` |
| `essentialRule` | string | Sí | Regla que garantiza primer uso offline |
| `quality` | number | Sí | Valor compatible con el conversor elegido |
| `maxBytesPerDerivative` | integer | Sí | Positivo; respaldado por mediciones |
| `measurementRef` | string | Sí | Evidencia de presupuesto |

La política no implementa caché/LRU ni descarga productiva. Si se elige un endpoint, su contrato debe definirse expresamente antes de implementarlo.

## 6. Derivados y reproducibilidad

### DerivadoWebP — nuevo

| Campo | Tipo | Obligatorio | FK / enum / default |
|---|---|---|---|
| `useId` | string | Sí | FK lógica a UsoAsset del mismo asset |
| `density` | integer | Sí | `1`, `2`, `3` |
| `path` | string | Sí | Ruta relativa única, extensión `.webp` |
| `widthPx`, `heightPx` | integer | Sí | Medidas reales positivas |
| `bytes` | integer | Sí | Medido; dentro del límite de familia |
| `sha256` | string | Sí | Hash del archivo real |
| `colorSpace` | string | Sí | Constante `sRGB`, verificada |
| `hasAlpha` | boolean | Sí | Conserva alfa cuando el maestro lo tiene |
| `masterSha256` | string | Sí | FK lógica a versión del maestro |
| `recipeHash` | string | Sí | Hash de configuración determinista |
| `policyRevision` | string | Sí | FK lógica a política utilizada |

La clave de variante es `(asset.id, useId, density)`. Para 2x y 3x se utilizan `2.0x/` y `3.0x/`. Los nombres numerados conservan `arcano-08-la-fuerza`, `signo-01-aries` y las rutas numéricas de Casa 5.

**RecetaExportación**, nueva, registra versión del conversor, parámetros de calidad, transformación sRGB, conservación de alfa, cálculo de tamaños, regla de nombres y revisión de política. Su hash excluye timestamps y rutas temporales.

**EjecuciónPipeline**, nueva como evidencia, registra commit fuente, hash del manifiesto, receta, comando/modo, familias procesadas, concurrencia máxima positiva, hashes de maestros antes/después, resultados por asset y resumen de pesos. El límite de concurrencia se define al preparar la ejecución.

`--check` verifica archivos, metadatos, maestro y receta. Rechaza ampliación, sobrepeso, salidas obsoletas y diferencias entre ejecuciones idénticas, con diagnóstico por asset y variante.

## 7. Archivos no productivos e iconos B3

### ArchivoNoProductivo — nuevo

| Campo | Tipo | Obligatorio | FK / default |
|---|---|---|---|
| `path` | string | Sí | Único; archivo explícito |
| `reason` | string | Sí | Motivo documentado |
| `sourceRef` | string | Sí | Registro que justifica exclusión |
| `replacedByAssetId` | string o null | Sí | FK lógica a reemplazo, si existe |

No se admiten exclusiones globales para ocultar PNG sin inventariar. Una ruta no puede ser simultáneamente maestro productivo y archivo no productivo.

### RecursoLauncher — nuevo

Objeto separado del derivado WebP editorial; sus formatos y medidas siguen los contratos nativos.

| Campo | Tipo | Obligatorio | FK / enum / default |
|---|---|---|---|
| `id` | string | Sí | Único |
| `sourceAssetId` | string | Sí | FK lógica a identidad |
| `masterSha256` | string | Sí | Versión fuente |
| `platform` | string | Sí | `ios`, `android` |
| `role` | string | Sí | `ios-full-bleed`, `android-foreground`, `android-background`, `android-monochrome` |
| `framing` | string | Sí | Constante `B3` |
| `path`, `format` | string | Sí | Archivo nativo real |
| `widthPx`, `heightPx` | integer | Para recursos raster | Medidas reales |
| `bytes`, `sha256` | integer, string | Sí | Metadatos reales |
| `backgroundColor` | string | Para fondo Android | Constante `#FAF7F0` |
| `evidenceRefs` | string[] | Sí | Revisión de zona segura, máscaras e instalación |

No incorpora iconos de tienda. La presencia de capas no acredita QA visual del sol y anillo.

## 8. Compatibilidad con el resolvedor existente

**Existente; se conserva.**

| Objeto | Campos existentes | Contrato |
|---|---|---|
| `ImageManifest` | `families`, `familyById()` | Punto de acceso del consumidor |
| `ImageFamilyDeclaration` | `id`, variantes light/dark, `fallbackSurfaceToken`, `overlayToken` | Variantes dark nulas en V1 |
| `ImageFamilyContract` | `id`, `variants`, tokens de respaldo y overlay | Clave `(theme, layout)` |
| `ImageAssetVariant` | `path`, `alt`, `decorative` | `path` obligatorio; `decorative=false` |
| `ImageVariantKey` | `theme`, `layout` | Temas y composiciones ya definidos |

El suministro productivo adapta el inventario validado a esta interfaz; no introduce lecturas directas de `app/assets/manifest.json` en el código de imágenes ni reemplaza fixtures o respaldos existentes.

La proyección publica rutas de derivados válidos. Para permanencia Casa 5 sin aprobación conserva la ausencia explícita y superficie de respaldo. El criterio de resolución final permanece pendiente hasta disponer de aprobación y derivados reales.

`app/pubspec.yaml` sigue siendo **existente, modificado**: su selección debe corresponder únicamente a derivados manifestados de modo `empaquetado`, con sus variantes Flutter. CI rechaza maestros PNG, el directorio completo `app/assets/`, derivados desconocidos y descargables incluidos en el binario.

## 9. Trazabilidad y gate de consumo

**Nuevos objetos lógicos de evidencia; reutilizan registros canónicos existentes, sin migrar la DB de Kanai.**

| Objeto | Campos obligatorios | Reglas |
|---|---|---|
| PreparaciónArranque | ticket, workflow, rama, SkipTeach, referencias a controles pendientes | `implement`, `epic/EP-01a`; preparación no habilita ejecución |
| EvidenciaArranque | trabajo concurrente terminado, commits integrados, antecedentes EP-00, árbol limpio, comando/resultado de base de pruebas, fecha | Datos comprobados antes del primer arranque |
| CasoTrazado | ID QA, fuente/criterio, requisitos, tipo de verificación, referencia a test o revisión humana | Todos los casos de las cuatro fuentes, sin sustitución de QA humana |
| ResultadoCaso | caso, SHA evaluado, resultado, evidencia, entorno/dispositivo cuando aplique | `pendiente`, `aprobado`, `fallido`, `bloqueado`; sin aprobado por default |
| EntregaProveedor | historia, predecessorRef, commits integrados, manifiesto/receta/política, evidencias | Consume la entrega real anterior |
| EjecuciónGate | nombre, SHA integrado, ejecución CI, resultados, artifacts, aprobaciones aplicables | Nombre `ep01-assets-provider`; resultado real |
| GateDocumental | archivos modificados, base del diff, comandos, SHA y resultados | `docs:check:changed` y lint sobre todos los documentos tocados |

La matriz incluye QA-02-01-01/02, QA-02-02-01 a 04, QA-02-03-01 a 03 y QA-02-07-01 a 04, además de los criterios sin caso QA independiente.

Un resultado local no sustituye CI real sobre commits integrados. Un check técnico exitoso no sustituye aprobación humana. Las entregas y el gate tampoco cierran anticipadamente las historias proveedoras.

## 10. Índices y relaciones

No se crean índices SQL. El validador y la proyección usan mapas e índices lógicos.

| Índice | Unicidad / finalidad |
|---|---|
| `Asset.id` | Único global; conserva identidad |
| `(Asset.id, UsoAsset.id)` | Uso único por pieza |
| `(Asset.id, useId, density)` | Derivado único por variante |
| `DerivadoWebP.path` | Único; evita sobrescrituras |
| `ArchivoNoProductivo.path` | Único y disjunto de maestros productivos |
| `(kind, house)` | Único para cada familia de piezas por Casa |
| `exportFamily`, `state`, `mode` | Agrupación y validación por familia/estado/entrega |
| `(ImageFamilyContract.id, theme, layout)` | Índice existente del consumidor |
| `(CasoTrazado.id, SHA, ejecución)` | Identifica cada resultado sin sobrescribir históricos |

Relaciones:

- Manifiesto **1:N** Asset y ArchivoNoProductivo.
- Política **1:N** PolíticaFamilia; PolíticaFamilia **1:N** Asset.
- Asset **1:N** UsoAsset y DerivadoWebP.
- UsoAsset **1:3** derivados para cada conjunto final requerido.
- Asset **N:M** Aprobación, con alcance y hashes explícitos.
- Asset de identidad **1:N** RecursoLauncher.
- CasoTrazado **1:N** ResultadoCaso.
- EntregaProveedor referencia su predecesora y evidencias; EjecuciónGate referencia el conjunto integrado.

## 11. Migración y rollback

1. **Antes de ejecutar:** completar controles canónicos pendientes. Las herramientas de entrada de Kanai no estuvieron disponibles en esta revisión; la lectura de fuentes no sustituye esos controles.
2. **Verificar base efectiva:** trabajo concurrente terminado, `epic/EP-01a`, commits integrados, árbol limpio y base de pruebas registrada. Comprobar antecedentes EP-00 sin reejecutarlos.
3. **Capturar referencia:** conservar los 64 IDs y `alt`, demás campos históricos y hashes de maestros. Verificar cantidades actuales; los 123 PNG y 59 no inventariados son antecedentes, no mediciones nuevas.
4. **Evolucionar a versión 2:** migrar esquema, manifiesto, validador y suministro compatible como unidad. Incorporar productivos no inventariados y exclusiones justificadas; no crear un inventario alternativo.
5. **Clasificar con evidencia:** permanencia provisional; fondos de 940/941 × 1672 fuera de aprobado final. Ninguna aprobación se infiere de existencia, antigüedad o uso previo.
6. **Consumir la política real:** completar modos, presupuestos y receta después de HU-02-01. Exportar tras validar HU-02-02; entregar las 45 piezas de HU-02-07 como subconjunto del inventario, sin duplicarlas.
7. **Validar entrega:** comprobar cobertura, hashes, derivados, empaquetado, interfaz y documentos modificados, incluso los previamente incluidos en `.docs-baseline.txt`.
8. **Habilitar consumo:** exigir CI real sobre commits integrados y aprobaciones correspondientes. Mantener pendientes visibles cuando falte evidencia externa.

El rollback restaura conjuntamente versiones compatibles de esquema, manifiesto, validador, derivados, suministro, `pubspec` e iconos. Conserva maestros, DEC, mediciones, registros existentes, aprobaciones y resultados históricos, respetando los rollback específicos de cada fuente. No altera consentimientos ni crea versiones legales.