Reviso el lado de la app (hash y filtro de archivos) para cerrar el modelo.# Modelo de datos: TAO-222 · HU-03a-14 · Términos de uso v1

## 1. Resumen

Esta historia **no crea ni modifica esquema de base de datos**. Su entregable es contenido versionado (Markdown) que entra al modelo existente por dos caminos que ya existen:

1. **Archivo fuente versionado**: `docs/legal/terminos-v1.0.md` y sus copias en la app y en el servidor. Es un "objeto de datos" en archivo: su encabezado YAML se mapea campo a campo a `documento_legal`.
2. **Fila en `documento_legal`**: la inserta el pipeline (`legal:registrar`, HU-03a-10, DEC-222). Esta historia no la ejecuta (REQ-06).

Elementos nuevos: el contenido del archivo de términos (se reemplaza) y el archivo de registro de aprobación `aprobaciones-terminos-v1.0.md`. Ambos son archivos, no tablas.

Leyenda: **[EXISTENTE]** no cambia · **[MODIFICADO]** cambia su contenido sin cambiar su estructura · **[NUEVO]** artefacto nuevo.

## 2. Entidades persistidas (PostgreSQL, Prisma)

### 2.1 `documento_legal` (modelo `DocumentoLegal`) [EXISTENTE, sin cambios de esquema]

Origen: `server/prisma/schema.prisma:458`, migración `20261006020001_documento_legal`.

| Campo (Prisma / SQL) | Tipo | Obligatorio | Default | Notas para esta historia |
| --- | --- | --- | --- | --- |
| `id` | TEXT (cuid) | sí | `cuid()` | PK |
| `tipo` | enum `TipoDocumentoLegal` | sí | | `terminos` |
| `version` | TEXT | sí | | `"1.0"` (se mantiene, REQ-06) |
| `vigenteDesde` | TIMESTAMPTZ(3) | sí | | Sale de `vigente_desde` del YAML. **Hoy no admite valor provisional** (ver 5.1) |
| `vigenteHasta` | TIMESTAMPTZ(3) | no | null | No lo toca esta historia |
| `urlPublicada` | TEXT | no | null | `${base}/legal/terminos/1.0`, lo arma el pipeline |
| `textoSnapshot` | TEXT | no | null | El registro lo deja nulo: el texto viaja empaquetado |
| `hashContenido` | TEXT | sí | | SHA-256 hex del **archivo completo, con frontmatter incluido** (`calcularHashContenido(contenido)` sobre el Markdown entero) |
| `exigeReaceptacion` | BOOLEAN | sí | | Sale de `exige_reaceptacion` del YAML (ver 5.3) |
| `publicadoPor` | TEXT | sí | | Autor del pipeline |
| `createdAt` | TIMESTAMPTZ(3) | sí | `now()` | |

Índices y restricciones existentes:

- PK `documento_legal_pkey (id)`.
- UNIQUE `documento_legal_tipo_version_key (tipo, version)`: impide dos filas `terminos 1.0`. El registro es idempotente con el mismo hash y **rechaza** con `VersionLegalInmutableError` si `terminos 1.0` ya existe con otro hash.

Permisos existentes: `taomangalam_app` solo SELECT; escribe solo `taomangalam_migrator` (pipeline).

### 2.2 `aceptacion_documento_legal` (modelo `AceptacionDocumentoLegal`) [EXISTENTE, sin cambios]

| Campo | Tipo | Obligatorio | FK / Enum | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT (cuid) | sí | | PK |
| `cuentaId` | TEXT | sí | FK `cuenta.id` ON DELETE RESTRICT | |
| `documentoLegalId` | TEXT | sí | FK `documento_legal.id` ON DELETE RESTRICT | |
| `tipo` | enum `TipoDocumentoLegal` | sí | | |
| `version` | TEXT | sí | | |
| `aceptadaAt` | TIMESTAMPTZ(3) | sí | | Puede ser pasada (aceptación diferida, DEC-219) |
| `registradaAt` | TIMESTAMPTZ(3) | sí | `now()` | |
| `origen` | enum `OrigenAceptacionLegal` (`app`, `portal`) | sí | | |
| `dispositivoId` | TEXT | no | | |
| `appVersion` | TEXT | no | | |

Índice: `aceptacion_documento_legal_cuentaId_aceptadaAt_idx (cuentaId, aceptadaAt DESC)`. Tabla append-only (sin UPDATE ni DELETE para la app).

Relevancia: se usa solo como **lectura de verificación humana** en staging (REQ-06): si existe alguna fila con `tipo = terminos` y `version = '1.0'`, el supuesto "nadie aceptó la 1.0" es falso y el dev decide la contingencia 1.1.

### 2.3 Enums [EXISTENTES]

- `TipoDocumentoLegal`: `terminos`, `privacidad`.
- `OrigenAceptacionLegal`: `app`, `portal`.

### 2.4 Relaciones

- `DocumentoLegal 1 ─ N AceptacionDocumentoLegal` (por `documentoLegalId`, RESTRICT).
- `Cuenta 1 ─ N AceptacionDocumentoLegal` (por `cuentaId`, RESTRICT).

Consecuencia: si la 1.0 ya tiene aceptaciones en un entorno, su fila **no se puede borrar ni reescribir**. El reemplazo de contenido bajo la misma versión solo es viable si `terminos 1.0` no está registrada en ese entorno.

## 3. Objetos de datos en archivo

### 3.1 `docs/legal/terminos-v1.0.md` [MODIFICADO: se reemplaza el contenido]

Encabezado YAML (lo parsea `leerEncabezado`, `server/src/legal/registro-version.ts`):

| Clave YAML | Campo destino | Tipo | Obligatorio | Valor actual (fixture) | Valor objetivo |
| --- | --- | --- | --- | --- | --- |
| `tipo` | `documento_legal.tipo` | enum | sí | `terminos` | `terminos` |
| `version` | `documento_legal.version` | string `X.Y`, igual al nombre | sí | `"1.0"` | `"1.0"` |
| `vigente_desde` | `documento_legal.vigenteDesde` | fecha ISO | sí, fecha válida | `2026-10-01` | Marcador provisional hasta que Producto y la asesoría la fijen (ver 5.1) |
| `exige_reaceptacion` | `documento_legal.exigeReaceptacion` | `true` / `false` literal | sí | `true` | A confirmar (ver 5.3) |
| `id`, `title`, `type`, `status`, `date` | (no se mapean) | string | no | `status: draft` | `status` refleja provisional o aprobado |

Cuerpo (no persistido en columnas, pero **entra en el hash** porque el hash cubre el archivo completo):

- Sección de resumen breve para la tarjeta V-51 (REQ-02).
- Un apartado con título Markdown propio por cada tema de la cobertura mínima (REQ-07 a REQ-14).
- Marcadores explícitos de provisional para la identidad legal del titular (REQ-03).

Nombre del archivo: debe cumplir `^(terminos|privacidad)-v(\d+\.\d+)\.md$`.

### 3.2 Copias empaquetadas [MODIFICADAS, idénticas byte a byte a la fuente]

| Copia | Consumidor | Cómo calcula el hash |
| --- | --- | --- |
| `app/assets/legal/terminos-v1.0.md` | `FuenteTextosLegalesAsset.rutaTerminos` (`textos_legales_empaquetados.dart`) | `sha256(utf8(texto completo))` |
| `server/legal/terminos-v1.0.md` | Lectura pública (`DIRECTORIO_LEGAL_POR_DEFECTO`) | `calcularHashContenido` (SHA-256 hex, archivo completo) |

Invariante (REQ-04): `hash(docs) = hash(app) = hash(server) = documento_legal.hashContenido` (staging). Al aceptar, la app envía el hash del texto mostrado; si difiere del registrado, el servidor responde `documento_legal_modificado`.

Constantes de código que **no cambian** con el reemplazo de la 1.0: `versionTerminosEmpaquetada = '1.0'`, `rutaTerminos = 'assets/legal/terminos-v1.0.md'`.

### 3.3 Registro de aprobación `aprobaciones-terminos-v1.0.md` [NUEVO]

| Campo | Tipo | Obligatorio | Valores / notas |
| --- | --- | --- | --- |
| `documento` | string | sí | `terminos` |
| `version_revisada` | string | sí | `"1.0"` |
| `hash_revisado` | string (SHA-256 hex) | sí | Igual al hash del archivo de términos en el momento del registro; S2.T1 lo actualiza al hash final |
| `estado` | enum | sí | `pendiente` (default) · `aprobado_legal` · `aceptado_producto` · `aprobado` |
| `aprobacion_legal.fecha` | fecha | no hasta aprobar | |
| `aprobacion_legal.responsable` | rol (sin datos personales) | no hasta aprobar | Pendiente externo: designar asesoría |
| `aprobacion_legal.observaciones[]` | lista `{observacion, resolucion}` | no | |
| `aceptacion_producto.fecha` | fecha | no hasta aceptar | |
| `aceptacion_producto.confirmacion` | texto | no hasta aceptar | Confirmación escrita |

No se persiste en BD. **Ubicación: hay que cambiarla respecto de lo que dice REQ-05** (ver 5.2).

## 4. API afectada (lectura, sin cambios de contrato)

| Operación | Ruta | Cambio |
| --- | --- | --- |
| `obtenerDocumentosLegalesVigentes` | `GET /legal/documentos` | Ninguno; servirá la fila `terminos 1.0` cuando el pipeline la registre |
| `obtenerDocumentoLegal` | detalle por tipo y versión | Ninguno; devuelve `hashContenido` y `urlPublicada`, texto nulo |

Esquemas OpenAPI existentes: `DocumentoLegal`, `DocumentoLegalRef`, `TipoDocumentoLegal`, `AceptacionLegal*`. Sin cambios.

## 5. Hallazgos verificados en el código que bloquean o condicionan REQs

### 5.1 `vigente_desde` provisional rompe el registro y la sincronización (afecta REQ-01, REQ-03)

`leerEncabezado` hace `new Date(vigente_desde)` y lanza `ArchivoLegalInvalidoError("falta vigente_desde con una fecha valida")` si da `NaN`. Un marcador como `PROVISIONAL` **falla** en `legal:registrar` y en cualquier flujo que llame a `leerEncabezado`. La columna `vigenteDesde` es NOT NULL.

Opciones (decide el dev):

- **A. Fecha centinela válida y marcador aparte**: `vigente_desde` con una fecha válida y explícitamente provisional, más una clave adicional `vigente_desde_provisional: true` o `status: draft` que el parser ignora. Pro: no toca código; el registro no falla. Contra: la fecha sí es un valor, aunque esté marcado; hay riesgo de registrarlo por error si nadie revisa la marca.
- **B. Marcador textual (`PROVISIONAL`)**: Pro: imposible de confundir con una fecha real. Contra: rompe `leerEncabezado` (y por lo tanto `sincronizar-legal` y `legal:registrar`). Bloquea el pipeline hasta fijar la fecha, lo que funciona como un candado deliberado contra publicar. Hay que verificar si `flutter test test/legal/` también parsea la fecha.
- **C. Hacer que el parser acepte un provisional y se niegue a registrarlo**: Pro: es explícito y seguro. Contra: toca código de HU-03a-10, que está fuera de alcance (requiere aprobación).

### 5.2 `aprobaciones-terminos-v1.0.md` en `docs/legal/` NO se ignora: hace fallar el pipeline (contradice el supuesto de REQ-05)

`archivosDeVersion` (`registro-version.ts:292`) lista los `.md` del directorio y **lanza** `ArchivoLegalInvalidoError("Archivos sin nombre de version legal: …")` ante cualquier `.md` que no sea `README.md` ni cumpla el patrón. Lo usan `sincronizar-legal.ts` (copia `docs/legal` hacia la app y el servidor) y el registro. Dejar el registro de aprobación en `docs/legal/` **rompe ambos**.

Opciones:

- **A. Subcarpeta `docs/legal/aprobaciones/terminos-v1.0.md`**: `readdirSync` no es recursivo y el nombre de la carpeta no termina en `.md`. Pro: no toca código y queda junto a la fuente. Contra: hay que verificar que `sincronizar-legal` no copie subcarpetas (con la lectura actual no lo hace).
- **B. Fuera de `docs/legal/`** (por ejemplo `docs/product/legal/aprobaciones/`): Pro: aislamiento total. Contra: se aleja de la fuente versionada.
- **C. Ampliar la allowlist del parser**: Contra: toca código de HU-03a-10, fuera de alcance.

### 5.3 `exige_reaceptacion` del fixture vale `true` (afecta REQ-06)

La adenda dice "sin exige_reaceptacion" pero el fixture actual trae `exige_reaceptacion: true`. Como primera versión, el efecto práctico es igual (nadie tiene una aceptación previa), pero el valor es parte del archivo y del hash. Hay que decidir explícitamente si queda en `true` (se conserva como en el fixture) o en `false` (es primera publicación y no hay "re"aceptación). Cualquiera de los dos cambia el hash respecto del fixture.

### 5.4 El hash incluye el frontmatter

El hash se calcula sobre el archivo completo, tanto en el servidor como en la app. Cambiar `vigente_desde`, `status` o `exige_reaceptacion` **cambia el hash**. Por eso se recalcula al fijar la fecha y `hash_revisado` del registro de aprobación debe actualizarse en S2.T1. El "hash autorreferente" no existe: el hash no se escribe dentro del propio archivo (si se escribiera, sería imposible que coincidiera). El hash vive en `documento_legal` y en el registro de aprobación, no en el encabezado. Esto corrige lo que dice REQ-01 sobre que el encabezado lleva el hash.

## 6. Notas de migración

- **Migración de esquema: ninguna.** No hay `ALTER`, columnas, índices ni enums nuevos.
- **Datos**: no se insertan, actualizan ni borran filas desde esta historia. El pipeline registra la fila en un despliegue posterior (HU-03a-10).
- **Verificación previa (humana, solo lectura, staging, sesión 5)**: que no existan filas en `documento_legal` con `tipo = terminos` y `version = '1.0'`, ni en `aceptacion_documento_legal` para esa versión. Si la fila existe con el hash del fixture, el registro del texto nuevo fallará por `VersionLegalInmutableError` y la UNIQUE `(tipo, version)`. En ese caso se activa la contingencia.
- **Contingencia 1.1 (requiere aprobación explícita del dev)**: nuevo archivo `terminos-v1.1.md` en las tres ubicaciones, `versionTerminosEmpaquetada = '1.1'`, `rutaTerminos` a la 1.1 y `exige_reaceptacion: true`. Nueva fila `documento_legal` sin tocar la 1.0. Sin borrados.
- **Rollback**: retirar la publicación sin borrar la fila ni el hash. La fila es inmutable y las FK RESTRICT impiden borrarla si tiene aceptaciones. Queda vigente solo una versión aprobada previamente (`vigenteHasta` lo gestiona el pipeline, no esta historia).
- **Regla de inmutabilidad**: después de que la versión se registre, cualquier cambio de un byte exige una versión nueva (QA-03a-14-02). El pipeline lo hace cumplir.