# Modelo de datos afectado · TAO-186 (HU-01-11)

> Alcance del modelo: **estado en memoria del shell de la app** (destinos, capacidades, guardas). Esta historia **no agrega tablas ni esquema persistido**: la persistencia del manifiesto es de HU-03a-08 y la autorización real es del servidor (HU-03a-07). Todo lo marcado `NUEVO` vive en la capa de presentación/navegación y se reconstruye en cada arranque.

## 1. Mapa de entidades

| Entidad / objeto | Estado | Origen | Persiste |
|---|---|---|---|
| `AppDestination` | EXISTENTE, **se extiende** | HU-01-08 (lista declarativa de destinos) | No (constante de build) |
| `AppRouteDeclaration` | EXISTENTE, **se extiende** | HU-01-09 (declaración de rutas) | No (constante de build) |
| `CapabilityManifest` | EXISTENTE, **solo lectura** | HU-03a-08 (manifiesto cacheado) | Sí, pero fuera de alcance |
| `AccessCapability` | NUEVO | Esta historia | No (enum de build) |
| `CapabilitySet` | NUEVO | Esta historia | No (derivado del manifiesto) |
| `DestinationVisibility` | NUEVO (derivado) | Esta historia | No |
| `RouteGuardDecision` | NUEVO (valor efímero) | Esta historia | No |
| `DeniedRouteLogEvent` | NUEVO (evento) | Esta historia | No (log de desarrollo, volátil) |
| `ShellMenuState` | NUEVO (estado derivado) | Esta historia | No |

---

## 2. Entidades existentes que se extienden

### 2.1 `AppDestination` (EXISTENTE, HU-01-08)

Campos nuevos marcados `NUEVO`. No se duplica el catálogo de destinos (REQ-07): se le agregan dos atributos declarativos.

| Campo | Tipo | Obligatorio | FK / referencia | Enum | Default | Estado |
|---|---|---|---|---|---|---|
| `id` | `String` | Sí | PK lógica del catálogo | no | sin default | EXISTENTE |
| `labelKey` | `String` | Sí | clave i18n | no | sin default | EXISTENTE |
| `icon` | `IconData` | Sí | no | no | sin default | EXISTENTE |
| `routeName` | `String` | Sí | FK lógica, `AppRouteDeclaration.name` | no | sin default | EXISTENTE |
| `order` | `int` | Sí | no | no | sin default | EXISTENTE |
| `requiredCapability` | `AccessCapability` | Sí | FK lógica al enum cerrado | sí | sin default | **NUEVO** |
| `isBuiltInThisRelease` | `bool` | Sí | no | no | `false` | **NUEVO** |

Notas:
- `requiredCapability` es **obligatorio y sin default**: un destino sin capacidad declarada no compila. Evita el "visible por omisión" que el rollback del ticket pide verificar.
- `isBuiltInThisRelease` default `false` (fail closed, REQ-02): un destino declarado para hitos posteriores no se muestra aunque el manifiesto traiga su capacidad.
- Invariante de catálogo (test unitario): `requiredCapability` es único por destino y `routeName` existe en la declaración de rutas.

### 2.2 `AppRouteDeclaration` (EXISTENTE, HU-01-09)

| Campo | Tipo | Obligatorio | FK / referencia | Enum | Default | Estado |
|---|---|---|---|---|---|---|
| `name` | `String` | Sí | PK lógica de rutas | no | sin default | EXISTENTE |
| `path` | `String` | Sí | no | no | sin default | EXISTENTE |
| `builder` | `WidgetBuilder` | Sí | no | no | sin default | EXISTENTE |
| `requiredCapability` | `AccessCapability?` | No | FK lógica al enum cerrado | sí | `null` | **NUEVO** |
| `accessPolicy` | `RouteAccessPolicy` | Sí | no | sí | `RouteAccessPolicy.capabilityGated` | **NUEVO** |

Notas:
- `requiredCapability` es nullable **solo** cuando `accessPolicy == alwaysAllowed` (Splash y V-51, DEC-153). Invariante verificada en test: `accessPolicy == capabilityGated` implica `requiredCapability != null`.
- `accessPolicy` default `capabilityGated`: una ruta nueva que el dev olvide clasificar queda cerrada, no abierta (requisito de rollback: "ninguna capacidad queda expuesta por defecto").

### 2.3 `CapabilityManifest` (EXISTENTE, HU-03a-08, consumo de solo lectura)

Esta historia **no define ni modifica** su esquema ni su caché. Solo depende de este contrato mínimo:

| Campo | Tipo | Obligatorio | Notas de consumo |
|---|---|---|---|
| `capabilities` | `List<String>` | Sí | Lista cruda de identificadores, **abierta**: puede traer cadenas desconocidas para este build |
| `version` / `etag` | `String` | Sí | Se usa solo como disparador de recomposición, no se interpreta |

Punto de diseño: el manifiesto se consume como **cadenas abiertas**, nunca se deserializa a `AccessCapability`. Esa asimetría (catálogo cerrado del lado del build, conjunto abierto del lado del manifiesto) es lo que hace que una capacidad desconocida se ignore sin excepción ni log de fallo (REQ-06, requisito de compatibilidad).

---

## 3. Entidades nuevas

### 3.1 `AccessCapability` (NUEVO, enum cerrado)

| Valor | `wireId` (valor serializado) | Notas |
|---|---|---|
| `vistaInicioAcceder` | `vista.inicio.acceder` | Destino Inicio, también destino de redirección |
| `vistaConsultasAcceder` | `vista.consultas.acceder` | |
| `vistaBibliotecaAcceder` | `vista.biblioteca.acceder` | |
| `vistaProductosAcceder` | `vista.productos.acceder` | |
| `vistaCuentaAcceder` | `vista.cuenta.acceder` | |
| `vistaPrivacidadAcceder` | `vista.privacidad.acceder` | Declarada en el catálogo, **no se evalúa** para V-51: esa ruta es `alwaysAllowed` por DEC-153 |

Campos del enum:

| Campo | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| `wireId` | `String` | Sí | sin default | Único; es el literal del manifiesto. Un test valida unicidad y formato `vista.<slug>.acceder` |

### 3.2 `RouteAccessPolicy` (NUEVO, enum cerrado)

| Valor | Semántica |
|---|---|
| `capabilityGated` | Requiere `requiredCapability` presente en el `CapabilitySet` (default) |
| `alwaysAllowed` | Vista obligatoria no filtrable: Splash y V-51 (DEC-153). La guarda la deja pasar incluso con manifiesto vacío |

### 3.3 `CapabilitySet` (NUEVO, objeto de valor derivado)

Proyección del manifiesto optimizada para resolución O(1) por destino (REQ-07).

| Campo | Tipo | Obligatorio | FK / referencia | Enum | Default | Notas |
|---|---|---|---|---|---|---|
| `_granted` | `Set<String>` (interno, inmodificable) | Sí | derivado de `CapabilityManifest.capabilities` | no | `const {}` | Índice hash en memoria; conserva las cadenas desconocidas sin interpretarlas |
| `sourceVersion` | `String` | Sí | `CapabilityManifest.version` | no | sin default | Identidad del manifiesto aplicado, usada para decidir recomposición |
| `isFallback` | `bool` | Sí | no | no | `false` | `true` cuando proviene del manifiesto inicial de HU-03a-08 por ausencia de caché (REQ-06) |

Operación única: `bool allows(AccessCapability c) => _granted.contains(c.wireId)`.

Nota de diseño (decisión mediana): se eligió `Set<String>` sobre `Set<AccessCapability>` porque el parseo a enum obligaría a decidir qué hacer con los valores desconocidos en el borde de deserialización. Con `Set<String>` la ignorancia es estructural, sin rama de error. Alternativa descartada: `Map<AccessCapability, bool>` con parseo tolerante, que agrega un paso de traducción y un modo de fallo sin ganar nada en lectura.

### 3.4 `DestinationVisibility` (NUEVO, valor derivado por destino)

No se persiste; se recalcula en cada construcción del menú.

| Campo | Tipo | Obligatorio | FK / referencia | Enum | Default | Notas |
|---|---|---|---|---|---|---|
| `destinationId` | `String` | Sí | FK lógica, `AppDestination.id` | no | sin default | |
| `isVisible` | `bool` | Sí | no | no | `false` | `isBuiltInThisRelease && capabilities.allows(requiredCapability)` (REQ-01, REQ-02) |
| `hiddenReason` | `HiddenReason?` | No | no | sí | `null` | **Solo para tests y log de desarrollo.** Nunca llega a la interfaz: no hay estado atenuado ni aviso (DEC-051) |

`HiddenReason` (NUEVO, enum): `missingCapability`, `notBuilt`.

### 3.5 `RouteGuardDecision` (NUEVO, valor efímero)

| Campo | Tipo | Obligatorio | FK / referencia | Enum | Default | Notas |
|---|---|---|---|---|---|---|
| `outcome` | `GuardOutcome` | Sí | no | sí | sin default | |
| `redirectRouteName` | `String?` | No | FK lógica, `AppRouteDeclaration.name` | no | `null` | Obligatorio cuando `outcome == redirectToHome`; apunta siempre a Inicio |
| `deniedRouteName` | `String?` | No | FK lógica, `AppRouteDeclaration.name` | no | `null` | Solo el nombre declarado. **Nunca** path con parámetros, query ni argumentos |

`GuardOutcome` (NUEVO, enum): `allow`, `redirectToHome`.

Invariante: la decisión **no transporta mensaje de usuario**. No existe campo de texto ni de código de error visible, por construcción, para que sea imposible mostrar un aviso de permiso (REQ-03).

### 3.6 `DeniedRouteLogEvent` (NUEVO, evento de observabilidad, solo debug)

| Campo | Tipo | Obligatorio | Enum | Default | Notas |
|---|---|---|---|---|---|
| `deniedRouteName` | `String` | Sí | no | sin default | Nombre declarado de la ruta, valor del catálogo cerrado |
| `missingCapability` | `AccessCapability` | Sí | sí | sin default | Valor del enum, no cadena libre del manifiesto |
| `manifestVersion` | `String` | Sí | no | sin default | Identificador opaco del manifiesto |
| `timestamp` | `DateTime` | Sí | no | `DateTime.now()` | |

Notas de privacidad (requisito transversal):
- Todos los campos provienen de **catálogos cerrados de build** o de un identificador opaco. No hay ningún campo capaz de contener un valor provisto por la persona usuaria, por lo que no puede filtrar datos personales ni parámetros.
- Emisión condicionada a build de desarrollo (`kDebugMode` o equivalente del proyecto). En release no se emite.

### 3.7 `ShellMenuState` (NUEVO, estado derivado del shell)

| Campo | Tipo | Obligatorio | FK / referencia | Enum | Default | Notas |
|---|---|---|---|---|---|---|
| `visibleDestinationIds` | `List<String>` | Sí | FK lógica, `AppDestination.id` | no | `const []` | Ordenada por `AppDestination.order`. Lista, no set: el orden es parte del contrato de interfaz |
| `activeDestinationId` | `String?` | No | FK lógica, `AppDestination.id` | no | `null` | Se conserva entre recomposiciones si sigue en `visibleDestinationIds` (REQ-05) |
| `focusedDestinationId` | `String?` | No | FK lógica, `AppDestination.id` | no | `null` | Si el destino enfocado desaparece, pasa al primero de `visibleDestinationIds` (QA-01-11-03) |
| `capabilitiesVersion` | `String` | Sí | `CapabilitySet.sourceVersion` | no | sin default | Disparador de recomposición sin reinicio |

Invariantes:
- `activeDestinationId == null || visibleDestinationIds.contains(activeDestinationId)`. Si al aplicar un manifiesto nuevo deja de cumplirse, se navega a Inicio y se reasigna.
- `focusedDestinationId == null || visibleDestinationIds.contains(focusedDestinationId)`.
- La recomposición por cambio de `capabilitiesVersion` reemplaza la lista sin recrear el widget del panel persistente, de modo que no dispare animación de apertura en tablet.

---

## 4. Índices y estructuras de acceso

Todo es en memoria, sin I/O durante el build del menú (REQ-07).

| Estructura | Tipo | Construcción | Costo | Propósito |
|---|---|---|---|---|
| `CapabilitySet._granted` | `Set<String>` (hash) | Una vez por manifiesto aplicado | O(n) al construir, O(1) por consulta | Resolver `allows()` por destino |
| `destinationsByCapability` | `Map<AccessCapability, AppDestination>` | `const` o inicialización única del catálogo | O(1) | Trazar capacidad a destino en tests y en el log |
| `routesByName` | `Map<String, AppRouteDeclaration>` | EXISTENTE (HU-01-09) | O(1) | Resolver la declaración desde la guarda |

Costo total del armado del menú: O(d) con d = cantidad de destinos declarados (orden de 5 en M1a).

---

## 5. Relaciones

```
AppDestination  1 ──── 1  AccessCapability        (requiredCapability, obligatorio)
AppDestination  1 ──── 1  AppRouteDeclaration     (routeName, FK logica)
AppRouteDeclaration 1 ─ 0..1 AccessCapability     (null solo si accessPolicy = alwaysAllowed)
CapabilityManifest 1 ── 1 CapabilitySet           (proyeccion derivada, no persistida)
CapabilitySet   1 ──── N  DestinationVisibility   (una evaluacion por destino declarado)
CapabilitySet   1 ──── N  RouteGuardDecision      (una por intento de navegacion)
RouteGuardDecision 1 ── 0..1 DeniedRouteLogEvent  (solo si outcome = redirectToHome y build debug)
ShellMenuState  1 ──── N  DestinationVisibility   (se queda con las visibles, ordenadas)
```

---

## 6. Reglas de integridad verificables

| # | Invariante | Verificación |
|---|---|---|
| I1 | Todo `AppDestination` tiene `requiredCapability` no nulo | Test unitario sobre el catálogo |
| I2 | `accessPolicy == capabilityGated` implica `requiredCapability != null` | Test unitario sobre la declaración de rutas |
| I3 | Toda ruta de un destino visible existe en `routesByName` | Test unitario cruzado catálogo contra rutas |
| I4 | Splash y V-51 tienen `accessPolicy == alwaysAllowed` | Test unitario, cubre REQ-04 y el criterio de V-51 |
| I5 | `CapabilitySet` vacío produce `visibleDestinationIds` vacío y V-51 accesible | Test con manifiesto vacío |
| I6 | Una cadena desconocida en el manifiesto no altera la visibilidad ni emite log de fallo | Test con manifiesto con capacidad ficticia |
| I7 | `DeniedRouteLogEvent` no tiene campos de texto libre | Garantizado por el tipo, reforzado con test de forma del evento |

---

## 7. Persistencia y notas de migración

- **No hay cambios de esquema persistido.** Ninguna tabla, ninguna colección, ninguna clave nueva en almacenamiento local. El único dato persistido involucrado es el manifiesto cacheado, cuyo esquema y versionado pertenecen a HU-03a-08.
- **No hay migración de datos de usuario.** Al actualizar la app, el manifiesto en caché existente se lee tal cual; si no hay caché, se usa el manifiesto inicial de HU-03a-08 (`isFallback = true`).
- **Compatibilidad hacia adelante:** agregar capacidades en el servidor no requiere cambio de cliente. Las desconocidas quedan en `_granted` y nunca se consultan.
- **Compatibilidad hacia atrás:** agregar un valor a `AccessCapability` en el cliente sin que el servidor lo emita oculta el destino asociado, que es el comportamiento deseado (fail closed).
- **Migración de código, no de datos:** los dos campos nuevos de `AppDestination` y los dos de `AppRouteDeclaration` son obligatorios y sin default seguro en el caso de `requiredCapability`, así que el compilador fuerza a clasificar cada destino y cada ruta existente. Esa ruptura intencional de compilación es la red que impide dejar un destino sin capacidad declarada.
- **Rollback:** revertir es retirar los cuatro campos nuevos, el enum `AccessCapability`, `RouteAccessPolicy`, la guarda y el filtro, como una unidad. Al no haber estado persistido nuevo, el rollback no deja datos huérfanos. Chequeo obligatorio al revertir: ningún destino debe quedar visible por un default permisivo.

---

## 8. Trazabilidad REQ a modelo

| REQ | Elementos del modelo |
|---|---|
| REQ-01 | `AppDestination.requiredCapability`, `CapabilitySet.allows`, `DestinationVisibility.isVisible`, ausencia de estado atenuado en `ShellMenuState` |
| REQ-02 | `AppDestination.isBuiltInThisRelease` (default `false`), `HiddenReason.notBuilt` |
| REQ-03 | `RouteGuardDecision` sin campo de mensaje, `DeniedRouteLogEvent` con catálogos cerrados |
| REQ-04 | `RouteAccessPolicy.alwaysAllowed`, invariantes I4 e I5 |
| REQ-05 | `ShellMenuState.capabilitiesVersion`, `activeDestinationId`, `focusedDestinationId` y sus invariantes |
| REQ-06 | `CapabilitySet.isFallback`, `_granted` como `Set<String>` abierto, invariante I6 |
| REQ-07 | Reuso de `AppDestination` y `AppRouteDeclaration` sin catálogo paralelo, índices hash O(1), `CapabilitySet` sin acceso a red |

---

## 9. Supuestos que conviene confirmar antes de implementar

1. **Nombre y forma del contrato de HU-03a-08.** Este modelo asume que expone la lista de capacidades como cadenas y un identificador de versión. Si expone un tipo ya parseado, `CapabilitySet` debe adaptarse y hay que verificar dónde queda la tolerancia a capacidades desconocidas, que es un requisito de esta historia y no de aquella.
2. **`vista.privacidad.acceder` frente a V-51.** La capacidad está en el catálogo pero V-51 es no filtrable. El modelo la declara y no la evalúa para esa ruta. Si existe además una entrada de menú hacia privacidad, hay que decidir si esa **entrada** sí se filtra por la capacidad aunque la **ruta** siga siempre accesible. Son dos cosas separables y el ticket no lo precisa.
3. **Inicio sin su capacidad.** Si el manifiesto no incluye `vista.inicio.acceder`, el destino de redirección de la guarda desaparece. Hay dos lecturas posibles y conviene elegir explícitamente: (A) tratar Inicio como `alwaysAllowed` de hecho, igual que Splash y V-51, o (B) permitir que desaparezca y definir un destino de último recurso. La opción A es más simple y evita un estado sin salida, pero contradice la literalidad de DEC-051. La opción B es más fiel pero obliga a diseñar una pantalla de "sin accesos". Decisión del equipo de producto, no del modelo.