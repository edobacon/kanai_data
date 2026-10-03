# Modelo de datos: HU-01-08 (TAO-177) - Shell de navegación, encabezado y panel lateral

> Ámbito: **cliente Flutter únicamente**. Esta historia **no agrega tablas, columnas, endpoints ni payloads**: la sección "Datos" y "API" de las referencias canónicas es `ninguno`. El modelo afectado es el **modelo en memoria del shell**: un catálogo declarativo de destinos (dato estático, versionado con el código) más el estado de navegación/composición (dato efímero de sesión de UI). Se marca `NUEVO` lo que crea esta historia y `EXISTENTE` lo que se reutiliza de HU-01-01 / 01-03 / 01-06 / 01-07.

---

## 1. Mapa de entidades

```
TaoNavCatalog (NUEVO, const)
  └─ 1..N ─> TaoNavDestination (NUEVO, value object inmutable)
                 ├─ id        : TaoNavDestinationId (NUEVO, enum)
                 ├─ group     : TaoNavGroup         (NUEVO, enum)
                 ├─ labelKey  : clave i18n          (EXISTENTE, HU-01-06)
                 ├─ icon      : token de icono      (EXISTENTE, HU-01-03)
                 └─ route     : ruta del router     (EXISTENTE, HU-01-04)

TaoShellState (NUEVO, estado efímero)
  ├─ activeDestinationId -> FK lógica a TaoNavDestination.id
  ├─ drawerStatus        : TaoDrawerStatus     (NUEVO, enum)
  ├─ layoutMode          : TaoShellLayoutMode  (NUEVO, enum, DERIVADO)
  └─ persistentDrawerVisible : bool

TaoWindowProfile (NUEVO, valor derivado del MediaQuery)
  ├─ deviceClass        : TaoDeviceClass        (NUEVO, enum, DERIVADO)
  └─ orientationPolicy  : TaoOrientationPolicy  (NUEVO, enum, DERIVADO)

TaoHeaderModel (NUEVO, view model derivado)
  <- compone TaoShellState + TaoWindowProfile + router stack
```

Ninguna de estas entidades se serializa ni se persiste en M0 (ver §7).

---

## 2. `TaoNavDestination` (NUEVO)

Value object inmutable (`@immutable`, `const`), sin lógica de presentación. Es el contrato que HU-01-11 filtrará sin tocar el shell (REQ-01, compatibilidad/migración).

| Campo | Tipo | Oblig. | Default | Enum / FK | Notas |
|---|---|:--:|---|---|---|
| `id` | `TaoNavDestinationId` | sí | - | enum §3.1 | **Clave primaria lógica.** Id estable: no cambia aunque cambien etiqueta, icono o ruta. Es lo que se persistiría a futuro, nunca el índice de la lista. |
| `group` | `TaoNavGroup` | sí | - | enum §3.2 | Define el bloque visual (principal vs pie) y la separación del AC "Ajustes, Cuenta y Ayuda al pie". |
| `order` | `int` | sí | - | - | Orden dentro del grupo. Único por `(group, order)`. Explícito y no implícito por posición en la lista, para que un filtrado (HU-01-11) que quite elementos no altere el criterio de orden. |
| `labelKey` | `String` | sí | - | FK lógica al bundle i18n de HU-01-06 | Clave, nunca cadena literal (REQ-10). Convención propuesta: `nav.<id>.label`. |
| `a11ySemanticsKey` | `String?` | no | `null` | FK lógica a i18n | Etiqueta alternativa para lector cuando el texto visible no basta. `null` = se usa `labelKey`. |
| `icon` | `TaoIconToken` | sí | - | FK al catálogo de iconos de HU-01-03 (EXISTENTE) | Token, no `IconData` literal ni `Icons.*` (REQ-09). En M0 son iconos operativos; los pictogramas ilustrados están marcados como faltante en contenido/assets. |
| `route` | `String` | sí | - | FK lógica a la tabla de rutas del router (HU-01-04, EXISTENTE) | Única en todo el catálogo. En M0 apunta a pantallas de marcador (HU-01-10). |
| `requiredCapabilityKey` | `String?` | no | `null` | reservado | **Campo reservado para HU-01-11 (M1a).** En M0 siempre `null` y el shell no lo evalúa. Se incluye ahora para que el filtrado por manifiesto de cuenta (DEC-051) no obligue a cambiar la forma del dato ni los goldens. Alternativa descartada: agregarlo recién en HU-01-11, que forzaría tocar el value object, sus tests unitarios y el catálogo semilla en la misma historia que introduce el filtrado. |

**Invariantes** (validadas por las pruebas unitarias del modelo declarativo, REQ-01):

- `id` único en todo el catálogo.
- `route` única en todo el catálogo.
- `(group, order)` único; `order` contiguo desde 0 dentro de cada grupo.
- `labelKey` existe en el bundle i18n de todos los idiomas soportados (test de integridad i18n).
- `icon` resuelve a un token existente de HU-01-03.
- Toda `route` existe en la tabla de rutas del router.

---

## 3. Enumeraciones (todas NUEVAS)

### 3.1 `TaoNavDestinationId`

Identidad estable, independiente del texto visible y de la ruta.

| Valor | Grupo | Ruta en M0 | Clave i18n |
|---|---|---|---|
| `home` | `primary` | `/home` | `nav.home.label` |
| `consultations` | `primary` | `/consultations` | `nav.consultations.label` |
| `library` | `primary` | `/library` | `nav.library.label` |
| `products` | `primary` | `/products` | `nav.products.label` |
| `settings` | `footer` | `/settings` | `nav.settings.label` |
| `account` | `footer` | `/account` | `nav.account.label` |
| `help` | `footer` | `/help` | `nav.help.label` |

Sin `default`: el valor activo lo decide `TaoShellState` (ver §4), no el enum.

### 3.2 `TaoNavGroup`

| Valor | Default | Notas |
|---|---|---|
| `primary` | - | Inicio, Consultas, Biblioteca, Productos. |
| `footer` | - | Ajustes, Cuenta, Ayuda. Se renderiza separado visualmente (AC 5). |

### 3.3 `TaoShellLayoutMode` (DERIVADO, no se almacena)

| Valor | Condición | Notas |
|---|---|---|
| `overlay` | ancho disponible `< TaoBreakpoint.expandedMin` (840) | Panel superpuesto con scrim. Cubre teléfono y tablet vertical de 768 (AC 8). |
| `persistent` | ancho disponible `>= TaoBreakpoint.expandedMin` (840) | Panel fijo junto al contenido, sin animación al cambiar de destino (DEC-230). |

Se calcula de `MediaQuery` en cada build a partir del **ancho disponible** (no del tamaño físico de pantalla): eso es lo que hace correcto el caso de pantalla dividida de QA-01-08-04.

### 3.4 `TaoDrawerStatus`

| Valor | Default | Notas |
|---|---|---|
| `closed` | **sí** | Estado inicial en `overlay`. |
| `opening` | - | Transición de 260 ms (o <=120 ms con movimiento reducido). |
| `open` | - | Foco atrapado, foco inicial en el primer destino. |
| `closing` | - | Transición de 200 ms (o <=120 ms con movimiento reducido). |

Modelar `opening`/`closing` como estados explícitos, y no solo un `bool isOpen`, es lo que permite testear el foco devuelto al botón hamburguesa al terminar el cierre (REQ-04) sin depender de temporizadores en los widget tests.

### 3.5 `TaoDeviceClass` (DERIVADO)

Basado en el lado más corto, según la retícula de doc 43 §6.

| Valor | Condición | Notas |
|---|---|---|
| `phone` | `shortestSide < TaoBreakpoint.mediumMin` (600) | Encabezado de 64. |
| `tablet` | `shortestSide >= TaoBreakpoint.mediumMin` (600) | Encabezado de 72. |

Importante: `TaoDeviceClass` usa el **lado más corto del dispositivo** y `TaoShellLayoutMode` usa el **ancho disponible**. Son dos ejes distintos y deben quedar como campos separados: una tablet (`tablet`) en pantalla dividida a 839 es `overlay`, y debe seguir permitiendo ambas orientaciones.

### 3.6 `TaoOrientationPolicy` (DERIVADO de `TaoDeviceClass`)

| Valor | Condición | Notas |
|---|---|---|
| `portraitOnly` | `deviceClass == phone` | Se aplica vía `SystemChrome.setPreferredOrientations`. |
| `all` | `deviceClass == tablet` | Ambas orientaciones, composición readaptada. |

---

## 4. `TaoShellState` (NUEVO, efímero)

Estado de sesión de UI que vive en el contenedor de estado del shell (notifier/controller, según el patrón de estado vigente del proyecto). **No se persiste en M0.**

| Campo | Tipo | Oblig. | Default | FK / Enum | Notas |
|---|---|:--:|---|---|---|
| `activeDestinationId` | `TaoNavDestinationId` | sí | `home` | FK a `TaoNavDestination.id` | Fuente del indicador activo y del anuncio "seleccionado" del lector (REQ-05). Debe **sobrevivir al cruce del límite 840** en ambos sentidos (QA-01-08-04). |
| `drawerStatus` | `TaoDrawerStatus` | sí | `closed` | enum §3.4 | Solo relevante en `layoutMode == overlay`. |
| `persistentDrawerVisible` | `bool` | sí | `true` | - | Solo aplica en `layoutMode == persistent`. `false` cuando la persona lo oculta desde el encabezado; el contenido toma el ancho liberado y el botón hamburguesa reaparece (REQ-02, AC 7). |
| `lastFocusedTriggerRef` | referencia de foco (`FocusNode`/key) | no | `null` | - | Referencia al botón que abrió el panel, para devolverle el foco al cerrar por cualquiera de los cuatro mecanismos (REQ-04). No es dato de dominio: es estado de accesibilidad y no debe serializarse nunca. |

**Derivaciones, no campos**: `layoutMode`, `deviceClass` y `orientationPolicy` **no se guardan** en `TaoShellState`; se calculan por build desde `MediaQuery`. Guardarlos duplicaría la fuente de verdad y dejaría estado rancio al rotar o al cambiar el ancho en pantalla dividida.

---

## 5. `TaoNavCatalog` (NUEVO, dato semilla constante)

Colección `const` del catálogo completo. Vive en código, no en base ni en archivo de configuración: es contenido de producto versionado junto al shell y su integridad se valida en compilación y en tests.

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|:--:|---|---|
| `destinations` | `List<TaoNavDestination>` | sí | las 7 filas de §3.1 | Orden de declaración: primero `primary` por `order`, luego `footer` por `order`. |

**Accesos derivados (los "índices" de este modelo).** No hay índices de base; los equivalentes son mapas `const`/`late final` construidos una vez:

| Índice | Forma | Para qué | Unicidad |
|---|---|---|---|
| `byId` | `Map<TaoNavDestinationId, TaoNavDestination>` | Resolver el destino activo y el ítem a marcar. | Única por `id`. |
| `byRoute` | `Map<String, TaoNavDestinationId>` | Derivar `activeDestinationId` desde la ruta actual del router, de modo que una navegación hecha fuera del menú (deep link, botón Atrás) deje el indicador correcto. | Única por `route`. |
| `byGroup` | `Map<TaoNavGroup, List<TaoNavDestination>>` | Renderizar los dos bloques con su separador. | Listas ordenadas por `order`. |

`byRoute` es el índice que no conviene omitir: sin él, el indicador activo se vuelve un segundo estado que hay que sincronizar a mano con el router y se desincroniza en el primer Atrás del sistema.

---

## 6. `TaoHeaderModel` (NUEVO, view model derivado)

Se calcula por build; no se almacena.

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|:--:|---|---|
| `height` | `double` | sí | derivado | `TaoSize.headerPhone` (64) si `phone`, `TaoSize.headerTablet` (72) si `tablet`. Token, no literal (REQ-09). |
| `showBack` | `bool` | sí | derivado | `true` cuando el router tiene historial apilable en la rama actual. |
| `titleKey` | `String?` | no | `null` | Clave i18n del título o contexto. `null` cuando la vista anfitriona aporta su propio encabezado de contexto. |
| `showMenuButton` | `bool` | sí | derivado | `false` solo cuando `layoutMode == persistent && persistentDrawerVisible`. En todos los demás casos `true` (REQ-02). |
| `menuButtonSize` | `double` | sí | `TaoSize.touchTargetMin` (48) | Área táctil de 48 x 48 en ambas clases de dispositivo. |

---

## 7. Persistencia y migración

**No hay migración de datos.** Sin tablas, sin esquema local (Drift/Isar/SQLite), sin claves nuevas en el almacenamiento de preferencias, sin cambios de contrato de API. Por lo tanto:

- Sin script de migración, sin versión de esquema, sin backfill.
- **Rollback**: restaurar el shell anterior es un revert de código puro. No queda dato huérfano porque nada se escribió a disco. Esto cumple el criterio de rollback del handoff sin trabajo extra.

Decisiones de persistencia tomadas, con su razón:

1. **`activeDestinationId` no se persiste entre ejecuciones.** El arranque siempre cae en `home` y la restauración de ruta la gobierna el router (HU-01-04), no el shell. Persistirlo crearía dos fuentes de verdad para "dónde estoy".
2. **`persistentDrawerVisible` no se persiste en M0.** Ningún criterio de aceptación pide que la preferencia sobreviva al cierre de la app. Si Producto la quiere recordar, es una historia aparte y el cambio sería aditivo: una clave booleana en el almacenamiento de preferencias (p. ej. `shell.persistentDrawerVisible`) leída al construir `TaoShellState`, con default `true` cuando está ausente. Se señala ahora porque es la única parte del modelo con candidatura real a persistir, y conviene que la decisión sea explícita y no un olvido.
3. **`lastFocusedTriggerRef` nunca se serializa.** Es una referencia viva de foco; serializarla no tiene sentido y arrastraría una fuga.

Cambios aditivos en artefactos existentes (no son migración de datos, pero sí hay que versionarlos):

| Artefacto | Tipo de cambio | Detalle |
|---|---|---|
| Bundle i18n (HU-01-06) | **aditivo** | 7 claves `nav.<id>.label` por idioma, más las claves de los controles del shell (abrir menú, cerrar menú, mostrar u ocultar panel). Ninguna clave existente se renombra ni se borra. |
| Tokens generados (HU-01-01) | **verificar antes de agregar** | `TaoSize.drawerPhoneMax` (360) y `TaoBreakpoint.expandedMin` (840) / `TaoBreakpoint.mediumMin` (600) están nombrados en los REQs como existentes. Si alguno no está en los tokens generados, se agrega en el origen de tokens y se regenera, nunca se escribe el número en el widget (REQ-09). |
| Tokens de movimiento (HU-01-07) | **aditivo o reuso** | Duraciones 260 / 180 / 200 y el techo de 120 del modo reducido. El servicio de reducción de movimiento se reutiliza tal cual, sin duplicar la consulta a `MediaQuery.disableAnimations`. |
| Tabla de rutas (HU-01-04) | **aditivo** | 7 rutas de marcador. HU-01-10 reemplaza el contenido de cada una sin tocar el catálogo. |
| Goldens | **regeneración** | 360 x 800, 390 x 844, 768 x 1024 y 1024 x 768, a escala 100 % y 200 %. Cambio esperado y revisable, no una migración. |

---

## 8. Contrato hacia HU-01-11 (filtrado por capacidades)

El punto de extensión queda cerrado en este modelo y no requiere cambios de forma más adelante:

- HU-01-11 consume `TaoNavCatalog.destinations`, evalúa `requiredCapabilityKey` contra el manifiesto de la cuenta y entrega una lista filtrada al shell.
- El shell renderiza **la lista que recibe**, sin conocer capacidades: su único supuesto es que el catálogo recibido respeta las invariantes de §2.
- `order` explícito garantiza que quitar un destino intermedio no reordene el resto.
- Pendiente de decisión para esa historia, fuera de alcance aquí: qué pasa si el destino activo deja de estar permitido tras un cambio de manifiesto. Se recomienda resolverlo en HU-01-11 como "redirigir a `home`", pero el modelo no lo impone.

---

## 9. Resumen nuevo vs existente

| Elemento | Estado |
|---|---|
| `TaoNavDestination` | NUEVO |
| `TaoNavDestinationId`, `TaoNavGroup`, `TaoDrawerStatus`, `TaoShellLayoutMode`, `TaoDeviceClass`, `TaoOrientationPolicy` | NUEVOS (enums) |
| `TaoNavCatalog` y sus índices `byId` / `byRoute` / `byGroup` | NUEVO |
| `TaoShellState` | NUEVO (efímero) |
| `TaoWindowProfile`, `TaoHeaderModel` | NUEVOS (derivados, no almacenados) |
| Claves i18n `nav.*` y controles del shell | NUEVAS, sobre bundle EXISTENTE (HU-01-06) |
| Tokens de medida, color, tipografía, movimiento | EXISTENTES (HU-01-01 / 01-07); se agregan solo los que falten, en el origen |
| Tokens de icono | EXISTENTES (HU-01-03, iconos operativos en M0) |
| Tabla de rutas | EXISTENTE (HU-01-04), se agregan 7 rutas de marcador |
| Esquema de base, API, payloads | **Sin cambios** |