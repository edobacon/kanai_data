# Modelo de datos — HU-01-09 / TAO-179 (TAO-179 · rutas, enlaces profundos y retorno conservado)

## 0. Veredicto de alcance

**No hay modelo de datos persistente afectado.** Esta historia no agrega tablas, colecciones, migraciones de base de datos ni entidades de dominio. Lo que sí define es un **modelo de datos en memoria y de sesión** (tabla de rutas, parámetros tipados de ruta, estado de vista restaurable y payload del log de rutas desconocidas) que es contrato para HU-01-10, HU-01-11 y todas las épicas con vistas.

- Base de datos (SQLite/Drift/Isar o la que fije la épica de persistencia): **sin cambios**. No hay DDL ni migración de esquema.
- Almacenamiento local clave-valor: **sin cambios** en esta historia. El retorno conservado (REQ-07) vive en memoria del proceso vía `RestorationScope`/`PageStorage`; no se persiste a disco.
- API/red: **ninguna**. REQ transversal explícito: la navegación no depende de red.

Lo que sigue es, entonces, el modelo de **objetos y estructuras** que la historia introduce, con la misma rigurosidad de campos/tipos/obligatoriedad, para que el ejecutor no invente formas de dato.

---

## 1. Entidades/objetos

### 1.1 `AppRoute` (NUEVO) — entrada de la tabla de rutas

Enum o clase sellada que nombra cada ruta estable. Es la única fuente de nombres de ruta; nada en la app escribe un path literal.

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `name` | `String` | Sí | — | Nombre estable de `go_router` (`GoRoute.name`). Clave de compatibilidad: no se renombra al agregar vistas (requisito transversal de compatibilidad/migración). |
| `path` | `String` | Sí | — | Path declarado. Raíz con `/`, segundo nivel relativo al padre. |
| `isPrimaryDestination` | `bool` | Sí | `false` | `true` solo para los 6 destinos principales del consultor (doc 36 sección I). |
| `parent` | `AppRoute?` | No | `null` | FK lógica a otra `AppRoute`. Define la pila a reconstruir en enlace profundo (REQ-03). `null` ⇒ ruta raíz. |
| `titleKey` | `String` | Sí | — | Clave ARB resuelta vía `AppLocalizations` (REQ-09). Nunca un literal visible. |

**Dominio cerrado de `name` (NUEVO, 6 valores de primer nivel):**

`home` · `consultas` · `biblioteca` · `productos` · `ajustes` · `cuenta` · `ayuda`

> Nota de alcance a confirmar: la Adenda 2 enumera «Inicio, Consultas, Biblioteca y Productos, y Ajustes, Cuenta y Ayuda» y el REQ-01 lista «Inicio, Consultas, Biblioteca y Productos, Ajustes, Cuenta, Ayuda». La lectura literal del REQ-01 da **7** marcadores (Biblioteca y Productos separados); la lectura de la adenda admite **6** si «Biblioteca y Productos» es un único destino. Asumo **7 rutas separadas** por ser lo que el REQ-01 enumera por comas y lo más barato de fusionar después (fusionar dos rutas es menos costoso que partir una ya enlazada). Si el doc 36 sección I define «Biblioteca y Productos» como un destino único, se elimina `productos` y `biblioteca.titleKey` apunta a la clave compuesta; el resto del modelo no cambia.

**Restricciones:**

- `name` único en toda la tabla (invariante verificada por test unitario de tabla de rutas).
- `path` único por nivel bajo un mismo `parent`.
- Todo `AppRoute` con `parent != null` debe tener cadena de ancestros que termine en un `isPrimaryDestination == true`. Es la invariante que sostiene REQ-03 y el primer criterio de aceptación.

### 1.2 `AppRouteParams` (NUEVO) — parámetros tipados por ruta

No es una entidad única: es el contrato de que **cada ruta con parámetros declara un objeto tipado propio**, no `Map<String, String>` suelto. En esta historia las 7 rutas de marcador no llevan parámetros, así que el objeto concreto que existe hoy es el vacío, más el contrato para las épicas funcionales.

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `pathParams` | `Map<String, String>` | Sí | `const {}` | Solo identificadores opacos. **Prohibido**: nombre, correo, teléfono, cualquier dato personal (requisito transversal de seguridad/privacidad). |
| `queryParams` | `Map<String, String>` | Sí | `const {}` | Mismo criterio. |

**Regla de validación (frontera):** cada ruta parametrizada implementa `fromPathParams`/`toLocation` con parseo estricto; un parámetro que no castea no lanza excepción al usuario, cae por el mismo camino de REQ-02 (redirección a Inicio + log).

### 1.3 `ViewRestorationState` (NUEVO) — estado de vista conservado en el retorno

Soporta REQ-07 y el criterio «lista desplazada 40 elementos con filtro activo». Es estado **en memoria/sesión**, bajo `RestorationScope`; no se persiste a disco ni a DB.

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `restorationId` | `String` | Sí | — | Derivado de `AppRoute.name`. Estable: si cambia, se pierde la restauración. |
| `scrollOffset` | `double` | Sí | `0.0` | Restaurado **sin animación** (`jumpTo`, nunca `animateTo`). |
| `activeFilter` | `String?` | No | `null` | Identificador de filtro, no su etiqueta traducida. |
| `selection` | `Set<String>` | Sí | `const {}` | Ids de elementos seleccionados. |
| `searchText` | `String` | Sí | `''` | Texto de búsqueda en curso. **No se registra en logs.** |
| `originFocusNode` | `FocusNode?` | No | `null` | Transitorio, no restaurable por `RestorableProperty`. Soporta REQ-08: foco de vuelta al elemento de origen. Se resuelve por `restorationId` + id de elemento, no guardando la instancia. |

**Ciclo de vida:** se crea al montar la vista, se preserva mientras la ruta siga en la pila, se descarta al hacer pop definitivo del destino. Sobrevive a un push de detalle; no sobrevive a un cierre de la app (no se requiere en los criterios).

### 1.4 `UnknownRouteLogEvent` (NUEVO) — payload del log de ruta desconocida

Soporta REQ-02, el criterio de ruta inexistente y el requisito transversal de observabilidad. Es un evento de **log de desarrollo**, efímero; no se persiste ni se envía a ningún backend en esta historia.

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `requestedPath` | `String` | Sí | — | **Solo el path, sanitizado**: sin query string, sin fragment, sin path params con valor. Los segmentos dinámicos se reemplazan por `:param` o se truncan al prefijo conocido. |
| `timestamp` | `DateTime` | Sí | `DateTime.now()` | Local. |
| `redirectedTo` | `String` | Sí | `AppRoute.home.name` | Siempre Inicio en esta historia. |

**Invariante de privacidad (testeable):** `requestedPath` nunca contiene `?`, `#`, ni un valor de parámetro. Es la condición que hace cumplible «registra un log de desarrollo con la ruta pedida sin parámetros sensibles».

### 1.5 `NavigationMotionSpec` (EXISTENTE — consumido, no creado)

Viene de HU-01-07 (tokens de movimiento + servicio de reducción de movimiento). REQ-10 prohíbe duraciones literales nuevas: esta historia **lee** estos valores, no los redefine.

| Campo | Tipo | Oblig. | Origen | Valor esperado |
|---|---|---|---|---|
| `forwardOutgoingDuration` | `Duration` | Sí | tokens HU-01-07 | 180 ms |
| `forwardIncomingDuration` | `Duration` | Sí | tokens HU-01-07 | 240 ms |
| `forwardOffsetPhone` | `double` | Sí | tokens HU-01-07 | 12 px |
| `forwardOffsetTablet` | `double` | Sí | tokens HU-01-07 | 8 a 12 px |
| `reducedMotionFadeDuration` | `Duration` | Sí | tokens HU-01-07 | ≤ 120 ms |
| `reduceMotionEnabled` | `bool` | Sí | servicio HU-01-07 | runtime |

> Si alguno de estos tokens no existe todavía en HU-01-07, **no se inventa una constante local**: se reporta como dependencia faltante antes de implementar. Es el punto donde esta historia puede quedar bloqueada y conviene verificarlo primero.

### 1.6 `NavigationGuard` (FUTURO — reservado, no se implementa)

HU-01-11 agrega guardas por capacidad. El requisito transversal es explícito: **se agregan sin cambiar la declaración de rutas**. Por eso `AppRoute` no lleva campo de capacidad en esta historia; la guarda se engancha como `redirect` compuesto sobre la tabla existente. Mencionado aquí solo para que el ejecutor no agregue un campo `requiredCapability` «por las dudas».

---

## 2. Índices

**Ninguno en base de datos.** Los únicos «índices» son estructuras de lookup en memoria, construidas una vez al declarar el router:

| Índice | Estructura | Clave → Valor | Para qué |
|---|---|---|---|
| `routesByName` (NUEVO) | `Map<String, AppRoute>` | `name` → ruta | Navegación por nombre (`goNamed`/`pushNamed`). Único. |
| `routesByPath` (NUEVO) | `Map<String, AppRoute>` | `path` completo → ruta | Resolución de enlace profundo y detección de ruta desconocida (REQ-02/03). |
| `restorationBuckets` (NUEVO) | `Map<String, ViewRestorationState>` | `restorationId` → estado | Lookup del estado al volver. Lo administra el `RestorationScope` de Flutter; no se implementa a mano. |

---

## 3. Relaciones

```
AppRoute ──┬── self-FK: parent (0..1) ──────────────► AppRoute
           │   (define la pila del enlace profundo)
           │
           ├── 1 ─────────────────────────────── 0..1 AppRouteParams
           │   (solo rutas parametrizadas; las 7 de marcador no tienen)
           │
           ├── 1 ─────────────────────────────── 0..1 ViewRestorationState
           │   (vía restorationId derivado de name)
           │
           └── titleKey ──────────────────────────► clave ARB (AppLocalizations)
                                                    [relación con recurso i18n existente]

UnknownRouteLogEvent ── redirectedTo ─────────────► AppRoute.home  (siempre)

NavigationMotionSpec (HU-01-07) ──consumido por──► transiciones de AppRoute
```

**Cardinalidades y reglas:**

- `AppRoute.parent` es auto-referencial, acíclica. Un ciclo rompe la reconstrucción de pila; se verifica por test unitario.
- Profundidad máxima en esta historia: **2** (destino principal → detalle). El modelo no la limita; las épicas funcionales pueden anidar más.
- `ViewRestorationState` es 0..1 por ruta: solo las rutas con lista/filtro/búsqueda lo instancian. Las 7 pantallas de marcador de esta historia no tienen contenido real, así que la validación de REQ-07 exige **al menos una lista de marcador desplazable con filtro** para que QA-01-09-03 sea ejecutable. Eso es dato de modelo, no de UI: la pantalla de marcador de un destino principal debe exponer una lista con `restorationId`, un filtro y un detalle de segundo nivel, o el criterio no se puede probar.

---

## 4. Notas de migración

### 4.1 Migración de esquema de datos

**No aplica.** Cero scripts, cero versiones de esquema, cero backfill. Si la épica de persistencia ya tiene un `schemaVersion`, **no se incrementa** por esta historia.

### 4.2 Migración de navegación (lo que sí se reemplaza)

| Elemento | Estado | Acción |
|---|---|---|
| `features/home/presentation/home_screen.dart` | EXISTENTE | **Reemplazado** por la ruta `home` + su pantalla de marcador. Es la pantalla de inicio provisional que la Adenda 2 manda retirar. |
| `TaoApp` en `app/lib/app.dart` | EXISTENTE — modificado | Pasa de `MaterialApp` a `MaterialApp.router`. **Conserva obligatoriamente** los parámetros `builder` y `navigatorKey` que consume el entrypoint de development para el panel interno. Perderlos rompe el panel: es el riesgo concreto de este cambio. |
| `navigatorKey` | EXISTENTE | Se pasa al `GoRouter` (`GoRouter(navigatorKey: ...)`), no al `MaterialApp.router`. Es el error típico; pasarlo en el lugar equivocado deja el panel de development sin acceso al navigator. |
| `go_router` en `app/pubspec.yaml` | NUEVO | Se agrega **una sola vez** con `cd app && fvm flutter pub add go_router` (Flutter de `.fvmrc`). Formato del repo: `^x.y.z` en `pubspec.yaml`, versión exacta en `pubspec.lock`. No se prueban otras versiones (Adenda 1 + REQ-10). |
| Claves ARB de títulos | NUEVO (7 claves) | Una por destino principal. Sin literales en código, o CI falla por la guarda de lint de i18n de HU-01-06. |

### 4.3 Compatibilidad hacia adelante

- Los `AppRoute.name` son **contrato público**: HU-01-10, HU-01-11 y las épicas funcionales navegan por nombre. Renombrar uno rompe enlaces ya publicados.
- HU-01-08 montará el encabezado compacto y el panel lateral **como shell sobre estas rutas** (`ShellRoute`). Por eso la tabla de rutas debe quedar declarada de modo que un `ShellRoute` pueda envolver los 7 destinos principales sin reescribir sus `name` ni sus `path`. El encabezado provisional de esta historia es descartable; la tabla de rutas no.
- El dominio para enlaces universales y App Links está **pendiente externo** (DEC-230, acción del propietario). El modelo no lo representa: no hay campo de dominio ni de esquema de URL en `AppRoute`. Cuando llegue, se configura en plataforma (`AndroidManifest`, `Associated Domains`) y la tabla de rutas lo recibe sin cambios de forma. Esa es exactamente la razón por la que el rollback de la historia dice «retirar los enlaces profundos externos y conservar las rutas internas».

### 4.4 Rollback

Revertir el commit de la tabla de rutas devuelve `TaoApp` a `MaterialApp` + `home_screen.dart`. No hay dato que rescatar ni migración inversa: todo el estado de esta historia es en memoria. `go_router` puede quedar en `pubspec.yaml` sin efecto, o retirarse con `fvm flutter pub remove go_router`.

---

## 5. Resumen nuevo vs existente

| Elemento | Estado |
|---|---|
| `AppRoute` + dominio de 7 nombres | **NUEVO** |
| `AppRouteParams` (contrato de parámetros tipados) | **NUEVO** |
| `ViewRestorationState` | **NUEVO** |
| `UnknownRouteLogEvent` | **NUEVO** |
| `routesByName`, `routesByPath` (lookup en memoria) | **NUEVO** |
| 7 claves ARB de títulos | **NUEVO** |
| Dependencia `go_router` | **NUEVO** |
| `NavigationMotionSpec` / tokens de movimiento (HU-01-07) | **EXISTENTE — consumido** |
| `AppLocalizations` / ARB (HU-01-06) | **EXISTENTE — extendido con 7 claves** |
| `TaoApp` (`builder`, `navigatorKey`) | **EXISTENTE — modificado, firma conservada** |
| `home_screen.dart` provisional | **EXISTENTE — eliminado** |
| `NavigationGuard` por capacidad | **FUTURO (HU-01-11) — no se modela aquí** |
| Esquema de base de datos | **SIN CAMBIOS** |
| Contratos de API | **SIN CAMBIOS** |

---

## 6. Puntos que requieren decisión antes de implementar

1. **¿«Biblioteca y Productos» es un destino o dos?** Asumido dos (7 rutas). El doc 36 sección I lo resuelve. Impacto: una entrada de `AppRoute` y una clave ARB.
2. **¿Existen ya los tokens de movimiento de HU-01-07?** REQ-10 prohíbe duraciones literales nuevas. Si los tokens no existen, esta historia se bloquea en REQ-04/REQ-05 hasta que estén; verificarlo es el primer paso, no el último.
3. **¿Qué destino principal lleva la lista de marcador con filtro?** QA-01-09-03 y el segundo criterio de aceptación exigen una lista desplazable 40 elementos + filtro + detalle de segundo nivel. Sin eso, REQ-07 no es verificable. Sugerencia: `consultas`, por ser el destino que en las épicas funcionales llevará lista real.