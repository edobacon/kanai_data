# Modelo de datos — TAO-167 (HU-00-19)

> Dev Container opcional y panel interno de desarrollo compilado solo en `development`.

## Veredicto

**Sin modelo de datos persistido afectado.** La historia no crea, modifica ni migra entidades, tablas, colecciones, índices ni relaciones. Las referencias canónicas lo confirman: `Datos: ninguno` y `Compatibilidad/migración: no aplica`.

Lo que sigue documenta (a) los **constructos existentes** que la historia **reutiliza sin modificar** y (b) el **estado efímero en memoria** que introduce el panel en el sabor `development`, que no es modelo de datos persistido pero se enumera para cerrar el contrato de campos, tipos y enums que el panel consume y produce.

---

## 1. Entidades persistidas

| Entidad | Estado | Nota |
|---|---|---|
| — | **No aplica** | No se introduce ninguna entidad persistida (DB, store local, archivo, caché en disco). |

- **Nuevas:** 0
- **Modificadas:** 0
- **Eliminadas:** 0
- **Índices:** ninguno nuevo, ninguno alterado
- **Claves foráneas:** ninguna
- **Migraciones:** ninguna (ver §5)

---

## 2. Objetos existentes reutilizados (no se modifican)

Estos artefactos ya existen en el proyecto y la historia los **consume como fuente de verdad**, sin cambio de shape. Marcados como **[EXISTENTE]**.

### 2.1 `AppConfig` / `appConfigProvider` [EXISTENTE]

Configuración tipada de la app y su provider de exposición. El panel **lee** de aquí `flavor`, `endpoint` y `appVersion`; no agrega campos ni cambia defaults.

| Campo leído | Tipo | Obligatorio | FK | Enum | Default | Origen |
|---|---|---|---|---|---|---|
| `flavor` | enum de sabor | Sí | — | `development` \| `staging` \| `production` | por sabor de build | [EXISTENTE] `AppConfig` |
| `endpoint` | string (URL base) | Sí | — | — | por sabor de build | [EXISTENTE] `AppConfig` |
| `appVersion` | string | Sí | — | — | del build | [EXISTENTE] `AppConfig` |

> REQ-07: el panel **no** introduce literales de endpoint, ni un cliente HTTP paralelo; toma estos valores de `AppConfig`/`appConfigProvider`.

### 2.2 Cliente del contrato — `PlataformaApi` [EXISTENTE]

Cliente Dart generado a partir del contrato. El panel **invoca** las operaciones de salud; no se regenera ni se extiende el contrato.

| Operación | Método HTTP / ruta | Estado | Respuesta |
|---|---|---|---|
| `saludVivo` | liveness (`/health/live`) | [EXISTENTE] del contrato | payload de salud (schema definido por el contrato) |
| `saludListo` | readiness (`/health/ready`) | [EXISTENTE] del contrato | payload de salud (schema definido por el contrato) |

- **Cambios al contrato:** ninguno.
- **Campos del payload de salud:** definidos por el contrato generado; el panel los **lee y muestra**, no los persiste ni los reinterpreta. No se enumeran aquí para no duplicar una fuente que el propio contrato ya define como canónica.

---

## 3. Estado efímero del panel (nuevo, en memoria, no persistido)

Marcado como **[NUEVO]**. Vive solo dentro del sabor `development`, en el runtime del widget; **no se serializa, no se guarda, no sobrevive al cierre de la app**. Se documenta para fijar tipos, obligatoriedad y enums de lo que el panel muestra.

### 3.1 `PanelEstado` [NUEVO] — estado de vista del panel

| Campo | Tipo | Obligatorio | FK | Enum | Default | Notas |
|---|---|---|---|---|---|---|
| `flavor` | enum | Sí | — | `development` \| `staging` \| `production` | — | provisto por `AppConfig`; en la práctica siempre `development` por exclusión de build |
| `endpoint` | string | Sí | — | — | — | provisto por `AppConfig` |
| `appVersion` | string | Sí | — | — | — | provisto por build |
| `conectividad` | enum | Sí | — | `desconocido` \| `enLinea` \| `sinConexion` \| `simuladaSinConexion` | `desconocido` | refleja el estado de red observado o simulado |
| `saludListo` | resultado de salud | No | — | — | `null` (aún no consultado) | resultado de `saludListo` (`GET /health/ready`) |
| `saludListoEstado` | enum | Sí | — | `noConsultado` \| `ok` \| `noDisponible` \| `error` | `noConsultado` | QA-00-19-03: backend detenido → `noDisponible` |
| `ultimoRequestId` | string | No | — | — | `null` | `requestId` de la **última petición fallida** (Observabilidad) |
| `simulacionSinConexion` | bool | Sí | — | — | `false` | adaptador de desarrollo (REQ-04) |
| `simulacionErrorRed` | bool | Sí | — | — | `false` | adaptador de desarrollo (REQ-04) |

**Campos reservados (placeholders, sin datos aún):** el panel muestra **espacios vacíos** para los siguientes bloques; no son entidades y no tienen campos hasta que las épicas que los introducen los definan.

| Bloque reservado | Épica origen | Estado |
|---|---|---|
| Sync | EP-06 | [RESERVADO] sin campos |
| Outbox | EP-06 / EP-09 | [RESERVADO] sin campos |
| Reloj | EP-06 | [RESERVADO] sin campos |
| Versión del contenido | EP-02 | [RESERVADO] sin campos |

> REQ-03: los espacios se reservan en el layout; **no** se modelan datos para ellos en esta historia (fuera de alcance explícito).

### 3.2 Adaptadores de desarrollo [NUEVO]

| Adaptador | Rol | Estado | Persistencia |
|---|---|---|---|
| Simulación sin conexión | Fuerza error de red local sin llamar al servidor | [NUEVO], solo `development` | ninguna |
| Simulación de error de red | Fuerza error de transporte/local | [NUEVO], solo `development` | ninguna |

- **REQ-04:** con la simulación activa, la petición al backend devuelve el error simulado **sin llamar al servidor**. El adaptador intercepta antes de la capa de transporte; no altera el contrato ni el cliente generado.
- **Exclusión por sabor (REQ-06 / DEC-192):** en `staging` y `production` el código de estos adaptadores y del panel **no está compilado**; no hay flag de runtime que los active.

### 3.3 Redacción de valores sensibles [NUEVO]

No es una entidad; es una función de transformación aplicada a todo texto/estructura que el panel muestra.

| Aspecto | Definición |
|---|---|
| Entrada | cualquier valor mostrado por el panel (string, objeto, mapa/lista anidada) |
| Salida | valor con tokens, OTP y rutas privadas reemplazados por un **marcador** |
| Cobertura | objetos y claves **anidadas** (REQ-05) |
| Persistencia | ninguna |
| Enforcement | aplicada en el borde de presentación del panel |

> DEC-197: el panel nunca muestra tokens, OTP ni rutas privadas; el marcador sustituye el valor crudo.

---

## 4. Relaciones

- **Persistidas:** ninguna (no hay entidades que relacionar).
- **De composición en vista:** `PanelEstado` **compone** valores de `AppConfig` [EXISTENTE] y el resultado de `saludListo` [EXISTENTE]; es lectura, no una nueva FK ni una relación de datos.
- **Cruzadas con otras historias:** ninguna relación de datos. Las dependencias del plan (HU-00-02, HU-00-13) son de **build/infraestructura**, no de modelo de datos.

---

## 5. Notas de migración

- **Migración de datos: ninguna.** No hay cambio de esquema, no hay backfill, no hay transformación de datos existentes.
- **Exclusión por sabor (DEC-192):** la separación `development` vs `staging`/`production` es de **compilación**, no de datos. No requiere migración ni script de limpieza.
- **Rollback:** retirar `.devcontainer/` y el panel compilado solo para `development`, restaurando el bootstrap nativo. **No** hay estado persistido creado por esta historia, por lo que el rollback no migra ni restaura datos; ningún código ni ruta del panel debe quedar en builds de producción.
- **Dev Container:** no introduce estado persistido del proyecto; los datos de PostgreSQL viven en `compose.yaml` (volumen de entorno de desarrollo), ajeno al modelo de datos de la app.

---

## 6. Resumen de marca nuevo vs existente

| Artefacto | Tipo | Marca |
|---|---|---|
| Entidad persistida | — | **No aplica** (0 nuevas) |
| `AppConfig` / `appConfigProvider` | config tipada | [EXISTENTE] reutilizado, sin cambio |
| `PlataformaApi` (`saludVivo`, `saludListo`) | cliente del contrato | [EXISTENTE] reutilizado, sin cambio |
| Payload de salud | schema del contrato | [EXISTENTE] solo lectura |
| `PanelEstado` | estado de vista en memoria | **[NUEVO]**, no persistido |
| Adaptadores de simulación | lógica de dev | **[NUEVO]**, solo `development` |
| Redacción de sensibles | transformación de presentación | **[NUEVO]**, no persistido |
| Bloques sync / outbox / reloj / versión de contenido | reservados | [RESERVADO] sin datos (EP-02, EP-06, EP-09) |
| Índices / FK / migraciones | — | **Ninguno** |