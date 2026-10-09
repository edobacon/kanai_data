# Modelo de datos: TAO-187 (HU-01-19) Aviso de actualización recomendada que se puede posponer

## 1. Resumen

| Aspecto | Resultado |
|---|---|
| Tablas nuevas en el servidor | Ninguna |
| Tablas locales nuevas (DB del dispositivo) | Ninguna |
| Cambios de esquema o migraciones | Ninguno |
| Contrato de API | Se reutiliza `obtenerVersionApp` / `VersionApp` sin cambios (REQ-09) |
| Estado nuevo | Solo en memoria, con alcance de sesión (REQ-02, REQ-04) |
| Persistencia local nueva | Ninguna. El aviso pospuesto **no** se guarda entre aperturas (DEC-086) |
| Eventos de observabilidad | 2 eventos nuevos y se reutiliza 1 evento de error (REQ-05, REQ-08) |
| Claves i18n | Claves ARB nuevas dentro del catálogo existente de HU-01-06 (REQ-09) |

Leyenda: **[EXISTENTE]** se reutiliza tal cual · **[NUEVO]** lo introduce esta historia · **[A VERIFICAR]** depende de lo que definió otra historia y hay que confirmarlo contra su código antes de implementar.

## 2. Entidades del servidor

### 2.1 `app_release` [EXISTENTE] (HU-03a-09, registrado por EP-17 / DEC-222)

Solo se lee, a través de `obtenerVersionApp`. Esta historia no escribe en ella ni la modifica.

| Campo | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| `id` | identificador | Sí | generado | PK |
| `plataforma` | enum `Plataforma` (`ios`, `android`) | Sí | | Discrimina la `urlTienda` y las versiones |
| `compilacion_minima` | entero | Sí | | Build mínima soportada. Si el build instalado es menor, el estado es `actualizacion_obligatoria` (HU-01-18) [A VERIFICAR nombre] |
| `compilacion_recomendada` | entero | Sí | | Build recomendada. Si el build instalado es menor y es mayor o igual que la mínima, el estado es `actualizacion_recomendada` [A VERIFICAR nombre] |
| `version_recomendada` | texto | Sí | | Etiqueta visible (por ejemplo `20` o `1.4.0`) que se muestra en el modal [A VERIFICAR si coincide con la build] |
| `url_tienda` | texto (URL) | No | `null` | Si es nula, `Actualizar` queda deshabilitado y se registra un error de configuración (REQ-05) |
| `notas` | texto | No | `null` | Notas breves; se muestran solo cuando existen (REQ-01) |
| `publicada_en` | timestamp | Sí | `now()` | Auditoría del pipeline |

**Índices [EXISTENTE / A VERIFICAR]:** índice o unicidad por `plataforma` sobre el registro vigente, para que la lectura sea por plataforma. Esta historia no agrega índices.

**Regla de comparación (DEC-086):** siempre por número de compilación entero, nunca por la cadena semántica.

### 2.2 Datos de prueba (fixture y staging) [NUEVO, solo datos de prueba]

No es esquema, pero lo exigen los criterios de aceptación:

| Escenario | `compilacion_minima` | `compilacion_recomendada` | Build instalada | Estado esperado |
|---|---|---|---|---|
| CA-01 / QA-01-19-01 | 15 | 20 | 18 | `actualizacion_recomendada` |
| CA-05 | 19 | 20 | 18 | `actualizacion_obligatoria` |
| CA-08 | 15 | 20 | 18, con `url_tienda = null` | recomendada, con `Actualizar` deshabilitado |
| QA-01-19-03 | n/a | n/a | n/a | El servicio responde 500, así que no aparece ningún aviso |

Estos datos van en el fixture de integración o en el `app_release` de staging, **nunca** como migración de producción.

## 3. Contrato de API (cliente)

### 3.1 Petición de `obtenerVersionApp` [EXISTENTE]

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `plataforma` | enum `Plataforma` | Sí | Único dato junto con la compilación (requisito de privacidad) |
| `compilacion` | entero | Sí | Build instalada |

### 3.2 `VersionApp` [EXISTENTE, modelo generado; no se redefine (REQ-09)]

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `estado` | enum `EstadoVersionApp` | Sí | Ver 3.3 |
| `versionRecomendada` | texto | Sí si el estado es `actualizacion_recomendada` | Valor que se muestra en el modal |
| `versionMinima` | texto / entero | [A VERIFICAR] | No lo usa esta historia |
| `urlTienda` | texto (URL), nullable | No | Viene solo del servidor (requisito de seguridad) |
| `notas` | texto, nullable | No | Se muestran solo si no son nulas ni vacías |

El contrato **no** trae título ni mensaje: ambos se resuelven por clave i18n (DEC-166).

### 3.3 Enum `EstadoVersionApp` [EXISTENTE]

| Valor | Comportamiento en esta historia |
|---|---|
| `al_dia` | No se muestra nada (el resultado manual lo resuelve HU-10-12) |
| `actualizacion_recomendada` | **Dispara este aviso** |
| `actualizacion_obligatoria` | Rige HU-01-18; este aviso se suprime |

Los casos sin conexión, timeout o error HTTP no son un estado del enum: se modelan como resultado fallido del cliente y nunca producen el aviso (REQ-03).

## 4. Estado en memoria de la app (sin persistencia)

### 4.1 `RecommendedUpdateSessionState` [NUEVO]

Es estado de proceso, con alcance de sesión. Se pierde al cerrar la app, que es justamente lo que pide DEC-086 (se vuelve a comprobar en cada apertura normal con conexión).

| Campo | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| `postponed` | bool | Sí | `false` | `true` tras `Más tarde`, Atrás, Escape o toque exterior. Bloquea nuevas apariciones por el disparador `apertura` en la misma sesión (REQ-02, QA-01-19-02) |
| `pending` | `VersionApp?` | No | `null` | Respuesta recomendada recibida mientras había otro modal visible; se presenta cuando ese modal se cierra (REQ-04) |
| `pendingTrigger` | enum `UpdatePromptTrigger?` | No | `null` | Disparador asociado al pendiente |
| `isShowing` | bool | Sí | `false` | Evita la doble presentación |

**Pregunta abierta [A VERIFICAR con Producto]:** si `postponed = true` y la persona toca `Buscar actualizaciones` (disparador `manual`, HU-10-12), lo esperable es que el modal **sí** aparezca, porque es una acción explícita. La propuesta de este modelo es que `postponed` solo aplique al disparador `apertura`.

### 4.2 Entrada de la decisión de mostrar: `RecommendedUpdateDecisionInput` [NUEVO, valor puro]

Pensado para las pruebas unitarias ("decisión de mostrar el aviso según estado, sesión y modales visibles").

| Campo | Tipo | Notas |
|---|---|---|
| `result` | `VersionApp?` o fallo | `null` o fallo significa que no se muestra |
| `trigger` | `UpdatePromptTrigger` | |
| `postponed` | bool | Del estado de sesión |
| `blockingModalVisible` | bool | Hay V-51 o el modal introductorio visibles |
| `mandatoryActive` | bool | Hay un modal de HU-01-18 activo |

**Salida:** enum `RecommendedUpdateDecision` [NUEVO] = `show` | `defer` | `skip`.

### 4.3 Enum `UpdatePromptTrigger` [NUEVO]

| Valor | Origen |
|---|---|
| `apertura` | Apertura normal con conexión, tras la splash |
| `manual` | `Buscar actualizaciones` de Acerca de (HU-10-12) mediante el punto de entrada reutilizable (REQ-06) |

### 4.4 Enum `RecommendedUpdateChoice` [NUEVO]

| Valor | Origen |
|---|---|
| `actualizar` | Botón `Actualizar` (abre `urlTienda` con el lanzador de HU-01-18) |
| `mas_tarde` | Botón `Más tarde` |
| `descartar` | Atrás, Escape o toque exterior (mismo efecto que `mas_tarde`, pero se distingue en la telemetría) |

**Decisión menor:** se separan `mas_tarde` y `descartar` solo para la observabilidad. El efecto funcional es idéntico. Si se prefiere un solo valor, se colapsan sin impacto en el modelo.

## 5. Preferencias locales

### 5.1 Movimiento reducido [EXISTENTE] (HU-07 vía `PreferenceStoreReducedMotionStore`)

| Elemento | Tipo | Notas |
|---|---|---|
| Clave versionada única del store de HU-01-07 | bool | Solo lectura a través del servicio. Prohibido leer `movimiento_reducido` directamente o crear un store paralelo (REQ-10) |

### 5.2 Persistencia del aviso pospuesto: **ninguna** [DECISIÓN]

No se crea clave en el preference store ni tabla local. Persistirlo contradiría DEC-086 y el CA-03 (el modal reaparece en la siguiente apertura).

## 6. Observabilidad

Ningún evento lleva datos personales (sin id de usuario, dispositivo ni sesión identificable).

### 6.1 `update_prompt_recommended_shown` [NUEVO]

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `plataforma` | enum `Plataforma` | Sí | |
| `compilacion` | entero | Sí | Build instalada |
| `version_recomendada` | texto | Sí | |
| `disparador` | enum `UpdatePromptTrigger` | Sí | |
| `con_notas` | bool | Sí | |
| `url_tienda_disponible` | bool | Sí | |

### 6.2 `update_prompt_recommended_choice` [NUEVO]

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `plataforma` | enum `Plataforma` | Sí | |
| `compilacion` | entero | Sí | |
| `disparador` | enum `UpdatePromptTrigger` | Sí | |
| `eleccion` | enum `RecommendedUpdateChoice` | Sí | |

### 6.3 Error de configuración por `urlTienda` nula [EXISTENTE] (HU-01-18)

Se reutiliza el mismo evento y el mismo registrador de HU-01-18. [A VERIFICAR] si admite un campo de contexto que distinga el modal obligatorio del recomendado. Si no lo admite, agregar un campo opcional `origen` (`obligatoria` | `recomendada`, default `obligatoria`) es un cambio retrocompatible; cualquier ajuste del contrato del evento debe acordarse con HU-01-18.

## 7. Contenido i18n (ARB de HU-01-06)

Claves nuevas [NUEVO], con lint de ARB existente [EXISTENTE]. Los textos quedan provisionales (fixture) hasta su aprobación.

| Clave propuesta | Placeholder | Uso |
|---|---|---|
| `updateRecommendedTitle` | | Título del modal |
| `updateRecommendedVersion` | `{version}` | Línea de versión disponible |
| `updateRecommendedMessage` | | Mensaje genérico |
| `updateRecommendedNotesLabel` | | Encabezado de las notas (solo si existen) |
| `updateRecommendedActionUpdate` | | Botón `Actualizar` |
| `updateRecommendedActionLater` | | Botón `Más tarde` |
| `updateStoreUrlMissingReason` | | Motivo de `Actualizar` deshabilitado. [A VERIFICAR] si ya existe en HU-01-18; en ese caso se reutiliza |

## 8. Relaciones

```
app_release (servidor, 1 vigente por plataforma)
   └─ leída por ─> obtenerVersionApp(plataforma, compilacion)
                       └─ devuelve ─> VersionApp {estado, versionRecomendada, urlTienda?, notas?}
                                          │
                 ┌────────────────────────┼─────────────────────────────┐
     estado = obligatoria          estado = recomendada           fallo / al_dia
     → HU-01-18                    → RecommendedUpdateDecision    → nada
                                     (input: postponed, modales visibles, trigger)
                                          │
                       show ─> Modal (diálogo HU-01-05) ─> evento shown
                       defer ─> RecommendedUpdateSessionState.pending
                       skip  ─> nada
                                          │
                       elección ─> evento choice; postponed = true (salvo actualizar)
```

## 9. Notas de migración y despliegue

1. **Sin migraciones** en el servidor ni en la DB local. No hay cambios de esquema que revertir.
2. **Compatibilidad:** se usa el modelo `VersionApp` ya generado. Si el generador del contrato cambia más adelante, esta historia no requiere tocar tipos.
3. **Rollback:** apagar la presentación del aviso recomendado (flag o retorno temprano en la decisión con `skip`) conservando la llamada a `obtenerVersionApp`, el flujo obligatorio de HU-01-18 y el acceso manual a actualizar. No hay datos que limpiar porque nada se persiste.
4. **Dependencias de datos:** requiere que HU-03a-09 exponga `versionRecomendada`, `urlTienda` y `notas` por plataforma, y que HU-01-18 esté integrada (cliente de versión, lanzador de tienda, registro de `urlTienda` nula).
5. **Staging:** cargar en `app_release` de staging los escenarios de la sección 2.2 antes de la QA humana (QA-01-19-01 a 03).

## 10. Puntos a confirmar antes de implementar

| # | Punto | Dónde |
|---|---|---|
| 1 | Nombres reales de las columnas de `app_release` y si `versionRecomendada` es etiqueta o build | HU-03a-09 |
| 2 | Si `postponed` debe ignorarse con el disparador `manual` | Producto / HU-10-12 |
| 3 | Si el evento de error por `urlTienda` nula admite un contexto de origen | HU-01-18 |
| 4 | Si la clave del motivo de `Actualizar` deshabilitado ya existe en el ARB | HU-01-18 / HU-01-06 |
| 5 | Si se distingue `mas_tarde` de `descartar` en la telemetría o se colapsan | Producto / Analítica |