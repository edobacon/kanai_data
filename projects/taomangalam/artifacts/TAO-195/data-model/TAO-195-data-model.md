# Modelo de datos: TAO-195 / HU-02-01 (origen de descarga de assets y presupuesto)

> **Naturaleza del cambio:** spike `explore`. **No hay cambios de base de datos** (ni en el backend de Railway ni en almacenamiento local de la app). El "modelo de datos" que toca este ticket son **dos contratos de archivo**: el manifiesto de imágenes que ya existe (`app/assets/manifest.json`, `schemaVersion: 2`) y un **manifiesto de descargables** nuevo que publica el origen. También se agrega el **registro de mediciones** del spike y un **evento de métrica agregada** que solo queda declarado. Lo que se marca como "NUEVO (propuesto)" lo fija la DEC y lo implementa HU-02-09/HU-02-02. Este spike solo lo deja especificado y lo usa en el prototipo descartable.

Leyenda: **[EXISTE]** ya está en el repo · **[NUEVO]** lo introduce la DEC de este spike · **[CAMBIA]** existe y se le agrega o restringe algo.

---

## 1. Visión general de entidades

| # | Entidad | Soporte | Estado | Dueño de la escritura | Consumidores |
|---|---------|---------|--------|----------------------|--------------|
| E1 | `ImageManifest` (raíz) | `app/assets/manifest.json` | [EXISTE] / [CAMBIA] solo en semántica de `mode` | Pipeline de assets (build) | `ImageManifest` en Dart (`lib/core/images/image_manifest.dart`), test de empaquetado, pipeline WebP |
| E2 | `AssetEntry` | elemento de `assets[]` en E1 | [EXISTE] / [CAMBIA] la regla de `mode` por familia | Pipeline de assets | E1, HU-02-02 |
| E3 | `AssetDerivative` | elemento de `derivatives[]` en E2 | [EXISTE] (`bytes`, `sha256` ya presentes) | Pipeline de assets | Prototipo (REQ-05), HU-02-09 |
| E4 | `RemoteAssetManifest` | JSON publicado en el origen, inmutable por versión | [NUEVO] | Job de publicación de assets | App (HU-02-09), prototipo |
| E5 | `RemoteAssetObject` | objeto en el bucket, direccionado por hash | [NUEVO] | Job de publicación | App vía URL de E4 |
| E6 | `FamilyDeliveryRule` | tabla en la DEC (no es runtime) | [NUEVO] | DEC | Pipeline (valida `mode`), HU-02-02 |
| E7 | `AssetSizeMeasurement` | tabla reproducible (CSV/MD) del spike | [NUEVO] | Script del spike | DEC (REQ-02), EP-17 |
| E8 | `AssetDownloadMetric` | evento agregado (solo contrato) | [NUEVO] declarado, sin implementar | App (HU-02-09) | Observabilidad (DEC-202) |
| E9 | `AssetCacheEntry` | estado local en el dispositivo | Fuera de alcance (HU-02-09/HU-02-15). Solo se referencia | - | - |

Relaciones:

```
ImageManifest (E1) 1 ──< AssetEntry (E2) 1 ──< AssetDerivative (E3)
                                   │                    │
                                   │ family ──> FamilyDeliveryRule (E6)
                                   │                    │ sha256 (clave natural)
RemoteAssetManifest (E4) 1 ──< RemoteManifestItem ──────┘──> RemoteAssetObject (E5)
        │ appAssetsVersion  ◄── fijado en el binario (E1.remote.*)
AssetSizeMeasurement (E7) ──> AssetEntry.id / AssetDerivative.path (muestra)
AssetDownloadMetric (E8): sin FK a archivo ni a persona (solo familia/bucket de tamaño)
```

---

## 2. E1 `ImageManifest` (raíz de `app/assets/manifest.json`) [EXISTE]

| Campo | Tipo | Oblig. | Default | Estado | Notas |
|-------|------|--------|---------|--------|-------|
| `schemaVersion` | int | sí | - | [EXISTE] = 2 | Pasa a **3** solo si se adopta el bloque `remote` (opción "manifiesto en el binario"). |
| `visualSystem` | string | sí | - | [EXISTE] | `tao-mangalam-ink-v1`. |
| `updatedAt` | date ISO | sí | - | [EXISTE] | |
| `nonProductive` | string[] (rutas de maestro) | sí | `[]` | [EXISTE] | Excluidos del cómputo de peso (E7) y de la publicación remota (E4). |
| `assets` | `AssetEntry[]` | sí | - | [EXISTE] | Hoy hay 104 entradas en 13 familias. |
| `remote` | objeto | no | ausente | **[NUEVO] propuesto** | Solo si la DEC elige descubrir los descargables desde el binario. Ver 2.1. |

### 2.1 `remote` [NUEVO, condicionado a la decisión de la DEC]

| Campo | Tipo | Oblig. | Default | Notas |
|-------|------|--------|---------|-------|
| `appAssetsVersion` | string (semver o `YYYYMMDD.n`) | sí | - | Versión del conjunto de descargables que este build espera. Es inmutable: un build anterior siempre apunta a la suya. |
| `manifestUrl` | string (URL https, sin query) | sí | - | `https://<origen>/assets/v/<appAssetsVersion>/manifest.json`. No lleva datos de la persona. |
| `manifestSha256` | string (hex 64) | sí | - | Ancla de confianza: el binario fija el hash de E4 y así no hace falta firmar E4 aparte. |
| `objectUrlTemplate` | string | sí | - | `https://<origen>/assets/o/{sha256}.webp` (direccionado por contenido). |
| `access` | enum `public` \| `signed` | sí | `public` | La DEC fija el valor. Recomendación de partida: `public`, porque no hay paquetes por capacidad (DEC-223) ni contenido privado. |

> **Alternativa (endpoint):** si la DEC elige un endpoint en vez de fijar el manifiesto en el binario, `remote` se reduce a `{ appAssetsVersion }` y se agrega un **cambio de contrato API**: `GET /v1/assets/manifest?version=<appAssetsVersion>` → E4. Hoy el contrato no tiene endpoints de assets, así que esto queda como **deuda de contrato declarada en la DEC** y no se implementa en el spike.

---

## 3. E2 `AssetEntry` [EXISTE / CAMBIA]

Se listan solo los campos relevantes para este ticket. El resto (`provenance`, `destinations`, `dimensions`, `theme`, `dark`, `alt`, `approvals`, `usages`, `views`, `house`, `animal`, `role`, `action`, `mineral`, `material`, `section`, `viewFamily`, `aliases`) **no cambia**.

| Campo | Tipo | Oblig. | Default | Estado | Notas |
|-------|------|--------|---------|--------|-------|
| `id` | string, único en el manifiesto | sí | - | [EXISTE] | Clave estable. La usa E7 como referencia de muestra. |
| `family` | enum (13 valores, ver 6) | sí | - | [EXISTE] | FK lógica a E6. |
| `master` | string (ruta PNG) | sí | - | [EXISTE] | **Nunca** se publica en el origen (DEC-240: solo derivados WebP). |
| `state` | enum `provisional` \| `aprobado` | sí | `provisional` | [EXISTE] | Hoy las 104 están en `provisional`. La publicación remota debería exigir `aprobado` (lo decide HU-02-09, aquí solo se anota). |
| `platform` | enum `all` \| `ios` \| `android` | sí | `all` | [EXISTE] | Entra en el presupuesto por plataforma (E7). |
| `mode` | enum `empaquetado` \| `descargable` | sí | - | **[CAMBIA]** | Hoy: 5 `empaquetado` y 99 `descargable`. Pasa a ser **derivado y validado** contra E6: el pipeline falla si el `mode` de una entrada contradice la regla de su familia, salvo que tenga `modeOverride`. |
| `modeOverride` | objeto `{ mode, reason, dec }` | no | ausente | **[NUEVO] propuesto** | Excepción explícita por asset (p.ej. la lámina base del primer uso de una familia descargable, DEC-173). `dec` referencia la DEC que la justifica. |

---

## 4. E3 `AssetDerivative` [EXISTE]

| Campo | Tipo | Oblig. | Estado | Notas |
|-------|------|--------|--------|-------|
| `path` | string (ruta WebP relativa a `assets/`) | sí | [EXISTE] | Ruta en el binario si `empaquetado`. **No** se usa como URL remota (en el origen se direcciona por hash). |
| `width`, `height` | int | sí | [EXISTE] | |
| `bytes` | int | sí | [EXISTE] | Fuente de E7 (peso real, no estimado). |
| `sha256` | string hex 64 | sí | [EXISTE] | **Clave natural** de E5. Verificación obligatoria en la descarga (REQ-05). |
| `variant` | enum `1x` \| `2.0x` \| `3.0x` | sí | [EXISTE] | Entra en el presupuesto (ver nota de deduplicación). |
| `usage` | string (ref a `usages[].name`) | sí | [EXISTE] | |
| `colorSpace` | enum `sRGB` | sí | [EXISTE] | |

**Nota de deduplicación (afecta E5 y E7):** hay usos que comparten bytes. En `ashura-casa-01`, `miniatura` y `tarjeta` tienen el mismo `sha256` en cada variante. Al direccionar por hash, el origen y la caché guardan **un solo objeto**, y el peso del conjunto descargable se calcula sobre **hashes distintos**, no sobre filas de `derivatives[]`.

---

## 5. E4 `RemoteAssetManifest` [NUEVO]

Archivo JSON publicado en `assets/v/<appAssetsVersion>/manifest.json`. Es **inmutable**: una versión publicada no se reescribe y una corrección publica una versión nueva.

| Campo | Tipo | Oblig. | Default | Notas |
|-------|------|--------|---------|-------|
| `schemaVersion` | int | sí | 1 | |
| `appAssetsVersion` | string | sí | - | Igual a E1.`remote.appAssetsVersion`. |
| `generatedAt` | datetime ISO UTC | sí | - | |
| `sourceManifestSha256` | string hex 64 | sí | - | Hash del `app/assets/manifest.json` de origen (trazabilidad del build). |
| `totalBytes` | int | sí | - | Suma de `bytes` de los ítems con hash distinto. Debe cumplir el presupuesto de E6/E7. |
| `items` | `RemoteManifestItem[]` | sí | - | Solo assets con `mode = descargable`. |

### 5.1 `RemoteManifestItem`

| Campo | Tipo | Oblig. | FK | Notas |
|-------|------|--------|----|-------|
| `assetId` | string | sí | E2.`id` | |
| `family` | string | sí | E6.`family` | Lo usa la métrica agregada (E8) sin exponer nombres de archivo. |
| `usage` | string | sí | E3.`usage` | |
| `variant` | enum | sí | E3.`variant` | La app descarga solo la variante de su densidad. |
| `sha256` | string hex 64 | sí | E5.`sha256` | La URL se resuelve con `objectUrlTemplate`. |
| `bytes` | int | sí | - | Permite verificar el tamaño antes de calcular el hash. |
| `priority` | enum `first-session` \| `on-demand` | no | `on-demand` | Insumo para HU-02-09/HU-02-15. Este spike no lo implementa. |

Índices lógicos (en memoria de la app): `bySha256` (único), `byAssetId+usage+variant` (único).

---

## 6. E5 `RemoteAssetObject` [NUEVO]

Objeto en el almacenamiento (bucket, con o sin CDN delante según la DEC).

| Atributo | Valor | Notas |
|----------|-------|-------|
| Clave | `assets/o/<sha256>.webp` | Direccionado por contenido: no hace falta invalidar y es inmutable por definición. |
| `Content-Type` | `image/webp` | |
| `Cache-Control` | `public, max-age=31536000, immutable` | Válido porque la clave cambia si cambia el contenido. |
| Metadata `x-amz-meta-sha256` (o equivalente) | hex 64 | Redundante con la clave. Sirve para auditar. |
| Lectura | pública o firmada (E1.`remote.access`) | Ninguna URL lleva identificadores de la persona. |
| Retención | sin borrado mientras exista un build soportado que lo referencie | Compatibilidad con builds anteriores (requisito transversal). |

Unicidad: `sha256` es único en todo el bucket. Un mismo objeto puede estar en varias versiones de E4.

---

## 7. E6 `FamilyDeliveryRule` [NUEVO, vive en la DEC]

Tabla normativa, no runtime. El pipeline la usa para validar E2.`mode`. Los valores de `rule` son la **propuesta de partida** según DEC-173 y la distribución actual. La DEC la confirma con las mediciones de E7.

| `family` | Entradas | `rule` propuesto | Base |
|----------|---------:|------------------|------|
| `identidad` | 6 | `empaquetado` | DEC-173 (identidad) |
| `view-background` | 4 | `empaquetado` | Láminas base del primer uso (DEC-173) |
| `view-background-family` | 6 | `empaquetado` si alguna es del primer uso, si no `descargable` | Lo decide la DEC con las mediciones |
| `section-illustration` | 2 | `empaquetado` | Primer uso sin red |
| `arcano` | 22 | `descargable` | |
| `signo` | 12 | `descargable` | |
| `ashura-animal` | 12 | `descargable` | |
| `arrival-illustration` | 12 | `descargable` | |
| `permanence-illustration` | 12 | `descargable` | |
| `mineral-illustration` | 6 | `descargable` | |
| `action-illustration` | 4 | `descargable` | |
| `role-illustration` | 3 | `descargable` | |
| `ritual-material-illustration` | 3 | `descargable` | |

| Campo | Tipo | Oblig. | Notas |
|-------|------|--------|-------|
| `family` | enum (13) | sí | PK |
| `rule` | enum `empaquetado` \| `descargable` | sí | |
| `firstUseOffline` | bool | sí | `true` ⇒ `rule = empaquetado` (invariante). |
| `rationale` | string | sí | |

Los iconos y las fuentes (`assets/icons`, `assets/fonts`) no están en `ImageManifest`: siempre son `empaquetado` y la DEC los cuenta en el presupuesto del binario.

> **Discrepancia a resolver en la DEC:** hoy hay solo 5 entradas `empaquetado`, menos que las familias que esta tabla propone empaquetar. Antes de fijar la regla hay que conciliar qué 5 son y si la tabla se ajusta a ellas o al revés.

---

## 8. E7 `AssetSizeMeasurement` [NUEVO, artefacto del spike]

Tabla reproducible (CSV + MD enlazado en la DEC) generada por un script que lee `app/assets/manifest.json` **a través de la interfaz `ImageManifest`/el loader existente** (REQ-07) o del propio pipeline, y nunca abriendo el JSON por fuera de ese contrato desde código de la app.

| Campo | Tipo | Oblig. | Notas |
|-------|------|--------|-------|
| `family` | string | sí | FK E6 |
| `sampleAssetIds` | string[] | sí | Al menos 1 por familia (FK E2.`id`). |
| `masterBytes` | int | sí | PNG maestro (insumo del total de 342 MB). |
| `derivativeBytes1x` / `2x` / `3x` | int | sí | De E3.`bytes`. |
| `distinctHashBytes` | int | sí | Tras deduplicar (ver 4). |
| `reductionPct` | decimal | sí | Contra el maestro. Referencia: 85 % a 91 % (`content/imagenes/12`). |
| `entriesInFamily` | int | sí | |
| `extrapolatedFamilyBytes` | int | sí | Si la familia no está completa: `distinctHashBytes / muestra × entriesInFamily`. Si lo está, es la suma real. |
| `rule` | enum | sí | De E6. |
| `platformScope` | enum `all` \| `ios` \| `android` | sí | |

Agregados que la DEC declara en **MB**:
- `binaryBudgetIosMb`, `binaryBudgetAndroidMb`: suma de `empaquetado` (por plataforma y, en Android, por densidad si se usan App Bundles) más fuentes, iconos y legal.
- `downloadableSetMb` por densidad (1x / 2x / 3x) y el peor caso.
- Margen contra los topes de DEC-202: `downloadableSetMb ≤ 1024 − reserva` en teléfono y `≤ 2048 − reserva` en tablet, con reserva de 1 GB.

---

## 9. E8 `AssetDownloadMetric` [NUEVO, solo contrato]

Evento agregado. Lo implementa HU-02-09 y la DEC solo lo define.

| Campo | Tipo | Oblig. | Notas |
|-------|------|--------|-------|
| `appAssetsVersion` | string | sí | |
| `family` | string | sí | Nunca la ruta, el nombre de archivo ni el hash por persona (DEC-202). |
| `outcome` | enum `ok` \| `hash_mismatch` \| `size_mismatch` \| `network_error` \| `http_error` | sí | |
| `bytesBucket` | enum (`<100KB`, `100KB-500KB`, `>500KB`) | sí | |
| `latencyBucketMs` | enum | no | |
| `platform` | enum `ios` \| `android` | sí | |

Sin identificador de persona ni de dispositivo. Se agrega en el cliente o en el colector antes de persistir.

---

## 10. Prototipo descartable (REQ-05, REQ-07): datos que usa

- **Entrada:** un `AssetDerivative` (E3) elegido del manifiesto existente, que aporta `sha256` y `bytes` esperados, y una URL de E5 (o un servidor local de prueba).
- **Verificación:** `sha256.convert(bytes)` con `package:crypto`, con el mismo patrón que `app/test/legal/empaquetado_test.dart` (`_sha256`). Compara también `bytes.length` contra E3.`bytes` antes de calcular el hash.
- **Casos:** archivo íntegro ⇒ aceptado (QA-02-01-01 como evidencia). El mismo archivo con un byte cambiado ⇒ rechazado con `hash_mismatch` (QA-02-01-02).
- **Persistencia:** ninguna. No escribe en la caché ni en la DB, y el build productivo no lo importa. Vive bajo `test/` o `tool/` y se elimina en el rollback.

---

## 11. Índices y unicidad (resumen)

| Entidad | Clave / índice | Tipo |
|---------|----------------|------|
| E2 | `id` | único [EXISTE, implícito] |
| E3 | `(assetId, usage, variant)` | único [EXISTE, implícito] |
| E3 | `sha256` | **no** único (hay usos que comparten bytes) |
| E4 | `appAssetsVersion` | único, inmutable [NUEVO] |
| E4.items | `sha256`, `(assetId, usage, variant)` | únicos por versión [NUEVO] |
| E5 | `sha256` | único global [NUEVO] |
| E6 | `family` | PK [NUEVO] |

---

## 12. Notas de migración

1. **Sin migración de DB.** No se tocan las tablas del backend ni el almacenamiento local.
2. **`schemaVersion` 2 → 3** solo si la DEC adopta el bloque `remote` en E1. Es un cambio aditivo: el loader de `ImageManifest` debe ignorar `remote` en v2 y exigirlo en v3. Lo implementa HU-02-09, no este spike.
3. **Validación de `mode` contra E6:** se agrega al pipeline o al test de empaquetado en HU-02-02. Hasta entonces la tabla E6 es normativa en la DEC y la discrepancia de las 5 entradas `empaquetado` queda anotada.
4. **Builds anteriores:** como E4 y E5 son inmutables (versión + hash), un build viejo sigue resolviendo su `appAssetsVersion`. Solo se puede borrar en el origen lo que ningún build soportado referencia.
5. **Rollback del spike:** borrar el prototipo y conservar la DEC, E7 y la evidencia. Comprobar que `pubspec.yaml` (bloque `assets:`, DEC-240) y el build no dependen del origen evaluado.
6. **Documentos a actualizar (REQ-06):** doc 47 §5 (origen y presupuestos), doc 42 §4.4 (contrato E4/E5 y la posible deuda de endpoint), HU-02-02 (E6 + `modeOverride`), HU-02-09 (E4, E5, E8 y la verificación), HU-02-15 (`downloadableSetMb` frente a los topes de DEC-202).