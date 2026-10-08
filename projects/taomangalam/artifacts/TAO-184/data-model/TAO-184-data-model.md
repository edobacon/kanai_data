Revisaré el contrato y los modelos existentes para distinguir los cambios necesarios de los datos que esta historia reutiliza.# Modelo de datos afectado — TAO-184 · HU-01-18

## Alcance y convenciones

El cambio añade la persistencia local del último bloqueo obligatorio y el estado de presentación del aviso. Reutiliza `app_release`, `obtenerVersionApp`, el error 426 y `PreferenceStore`.

**Existente** identifica contratos indicados en la historia; **nuevo** identifica incorporaciones propuestas. Los nombres físicos de columnas, claves e índices existentes deben conservarse: este documento define el modelo lógico, sin asumir un esquema físico verificado.

## 1. `app_release` — existente, servidor

Fuente de la política de compatibilidad y del contenido servido por HU-03a-09. Su administración corresponde a EP-17; esta historia no requiere nuevas columnas.

| Campo lógico | Tipo | Obligatorio | FK / enum | Default | Condición |
|---|---|---|---|---|---|
| `plataforma` | Enum | Sí | Valores del contrato existente | Sin default nuevo | Selecciona la política y tienda de la plataforma |
| `versionMinima` | Entero positivo | Sí | Sin FK | Sin default nuevo | Número de compilación mínimo admitido |
| `versionDisponible` | String | Sí en respuesta completa | Sin FK | Sin default nuevo | Etiqueta para mostrar; no se usa para comparar |
| `mensaje` | String | Según contrato existente | Sin FK | Sin default nuevo | Contenido suministrado por servidor |
| `notas` | Contenido textual breve | No | Sin FK | Ausente | Conservar el formato definido por HU-03a-09 |
| `urlTienda` | String URL nullable | No | Sin FK | `null` permitido | URL de la plataforma suministrada por servidor |

No se introduce una relación con personas usuarias: la lectura es pública.

## 2. Contratos de entrada — existentes, sin persistencia propia

### Respuesta de `obtenerVersionApp`

| Campo lógico | Tipo | Obligatorio | FK / enum | Default |
|---|---|---|---|---|
| `estado` | Enum | Sí | `actualizacion_obligatoria`, `actualizacion_recomendada`, `al_dia` | Ninguno |
| `versionMinima` | Entero positivo | Sí para estado obligatorio | Sin FK | Ninguno |
| `versionDisponible` | String | Según contrato de respuesta | Sin FK | Ninguno |
| `mensaje`, `notas`, `urlTienda` | Según `app_release` | Según contrato de respuesta | Sin FK | Según contrato existente |

La consulta posterior al 426 utiliza este mismo contrato y queda exenta del gate.

### Error 426 `version_minima`

| Campo lógico | Tipo | Obligatorio | FK / enum | Default |
|---|---|---|---|---|
| `codigo` | Enum / literal | Sí | `version_minima` | Ninguno |
| `versionMinima` | Entero positivo | Sí | Sin FK | Ninguno |

El interceptor existente entrega esta información al estado global del aviso. El 426 basta para establecer y guardar el bloqueo, aunque falle la consulta de contenido.

## 3. `preferencia_local` — existente; nueva entrada versionada

Se propone una entrada lógica `actualizacion_obligatoria.v1`, implementada mediante las convenciones del `PreferenceStore` existente. Su ámbito es la instalación y la plataforma, independiente de la cuenta o sesión.

### Valor `UltimoEstadoObligatorio` — nuevo

| Campo | Tipo | Obligatorio | FK / enum | Default |
|---|---|---|---|---|
| `schemaVersion` | Entero | Sí | Literal `1` | `1` |
| `plataforma` | Enum | Sí | Contrato existente de plataforma | Plataforma instalada |
| `versionMinima` | Entero positivo | Sí | Sin FK | Ninguno |
| `versionDisponible` | String nullable | No | Sin FK | `null` |
| `mensaje` | String nullable | No | Sin FK | `null` |
| `notas` | Tipo textual del contrato, nullable | No | Sin FK | `null` |
| `urlTienda` | String URL nullable | No | Sin FK | `null` |

La presencia de la entrada representa un estado obligatorio conocido; no se añade un booleano que pueda contradecir `versionMinima`.

Los campos opcionales conservan el último contenido recibido para presentar el aviso offline y mantener disponible el acceso a la tienda. No constituyen otra política de compatibilidad.

### Invariantes

- La condición de bloqueo es `compilacionInstalada < versionMinima`, comparando enteros.
- Una entrada ausente no equivale a actualización obligatoria.
- Si la compilación instalada cumple la mínima guardada, la entrada se descarta y no activa el aviso.
- La entrada solo se crea a partir de una respuesta obligatoria o un 426 válido; una falla de conectividad no la crea.
- Ante un 426 se persiste primero la mínima recibida. Completar el contenido es una operación posterior; su fallo no elimina el bloqueo.
- Solo se reutiliza contenido compatible con la misma plataforma y mínima conocida. Si no existe, se usan textos genéricos por i18n.
- `urlTienda` solo procede del servidor. Sin URL conocida, permanece `null`; no se construye una URL alternativa.
- La escritura del objeto es atómica para evitar combinar una mínima nueva con contenido parcialmente actualizado.
- Varias señales pendientes no pueden reducir accidentalmente la mínima que ya sostiene el bloqueo.

## 4. `EstadoAvisoObligatorio` — nuevo, memoria de aplicación

Estado global compartido por el arranque, el interceptor y el overlay existente. No es una tabla ni un segundo store persistente.

| Campo | Tipo | Obligatorio | FK / enum | Default |
|---|---|---|---|---|
| `activo` | Boolean | Sí | Sin FK | `false`, hasta reevaluar datos conocidos |
| `versionMinima` | Entero nullable | Sí cuando está activo | Sin FK | `null` |
| `versionDisponible` | String nullable | No | Sin FK | `null` |
| `mensaje`, `notas` | Contenido nullable | No | Sin FK | `null` |
| `urlTienda` | String URL nullable | No | Sin FK | `null` |
| `disparador` | Enum nullable | Sí cuando está activo | `apertura`, `426` | `null` |
| `origenContenido` | Enum nullable | Sí cuando está activo | `servidor`, `cache_local`, `generico` | `null` |

**Valores derivados, sin persistencia:**

| Valor | Regla |
|---|---|
| `actualizarHabilitado` | Existe `urlTienda` válida conforme al contrato |
| `motivoActualizacionDeshabilitada` | Clave de i18n cuando falta `urlTienda` |
| `mensajeVisible` | Mensaje recibido o clave genérica de i18n |
| `bloqueoInteraccion` | Igual a `activo`; incluye navegación y trabajo local |

En el fallback de 426 se muestra `versionMinima`; no se inventa una `versionDisponible`.

El título, la etiqueta `Actualizar` y los textos de fallback pertenecen al catálogo i18n existente. Las claves concretas son nuevas entradas de contenido, con fixtures provisionales hasta su aprobación.

## 5. Movimiento reducido — existente, sin modificación del modelo

Se reutiliza `PreferenceStoreReducedMotionStore` y su clave versionada actual, tanto en runtime como después de reiniciar.

No se añade una preferencia específica del modal ni un store paralelo. No se lee la clave heredada `movimiento_reducido`. El movimiento reducido afecta la presentación, no la condición de bloqueo.

## 6. Observabilidad — nuevos eventos en el mecanismo existente

| Evento propuesto | Campo | Tipo | Obligatorio | Enum / default |
|---|---|---|---|---|
| `aviso_actualizacion_obligatoria_mostrado` | `plataforma` | Enum existente | Sí | Sin default |
| ↳ | `compilacion` | Entero positivo | Sí | Sin default |
| ↳ | `disparador` | Enum | Sí | `apertura`, `426` |
| `actualizacion_obligatoria_error_configuracion` | `codigo` | Literal | Sí | `url_tienda_nula` |
| ↳ | `plataforma` | Enum existente | Sí | Sin default |
| ↳ | `compilacion` | Entero positivo | Sí | Sin default |
| ↳ | `disparador` | Enum | Sí | `apertura`, `426` |

Se reutilizan el timestamp y demás metadatos técnicos del sistema de eventos. No se incluyen identificadores de persona, mensajes, notas ni URL. La aparición se registra al presentar el modal, sin duplicarla por cada reconstrucción visual.

## 7. Índices y relaciones

| Elemento | Diseño |
|---|---|
| `app_release` | Reutilizar los índices de selección por plataforma definidos por HU-03a-09/EP-17; esta historia no añade índices |
| `preferencia_local` | Reutilizar la unicidad por ámbito y clave de `PreferenceStore`; una entrada por instalación/plataforma |
| Estado en memoria | Sin índices |
| Eventos | Reutilizar almacenamiento e índices de observabilidad |

Relaciones lógicas:

- `app_release` → `obtenerVersionApp`: política y contenido de la plataforma.
- Respuesta obligatoria / error 426 → `UltimoEstadoObligatorio`: snapshot local del conocimiento recibido.
- Snapshot + compilación instalada → `EstadoAvisoObligatorio`: decisión de bloquear.
- Estado activo → overlay existente: contenido y acción.
- Preferencia existente de movimiento reducido → animación del overlay.

El snapshot no tiene FK al servidor: debe funcionar offline y sobrevivir a cambios en el registro de releases.

## 8. Migración y compatibilidad

1. Incorporar la entrada versionada al `PreferenceStore` existente, sin crear otra tabla si admite valores estructurados.
2. No realizar backfill: las instalaciones anteriores comienzan sin estado obligatorio conocido.
3. Validar esquema, plataforma y mínima al leer. Un registro inválido no permite inferir un bloqueo; registrar el fallo técnico y recuperar información cuando haya conexión.
4. Reevaluar la entrada en cada apertura contra la compilación instalada y eliminarla cuando esta alcance la mínima.
5. Conservar el bloqueo conocido si falla la consulta de contenido. Una respuesta recomendada o al día no crea un bloqueo nuevo.
6. Mantener intacta la clave versionada de movimiento reducido.
7. No modificar `app_release`, el contrato del 426 ni el pipeline de releases dentro de esta historia.
8. Este documento no ejecuta migraciones ni escribe datos en `kanai-app`.