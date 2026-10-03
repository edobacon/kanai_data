# Modelo de datos afectado — TAO-178 / HU-01-10
# Modelo de datos afectado — TAO-178 / HU-01-10

## 1. Alcance y clasificación

La historia afecta **configuración de presentación y estado transitorio de interfaz**. No introduce entidades de negocio, tablas, API ni persistencia offline.

Este documento propone contratos lógicos a partir del ticket y REQ-01 a REQ-07. Los nombres propuestos deben adaptarse a los contratos existentes de la aplicación; no representan clases o campos verificados en código.

| Marca | Significado |
|---|---|
| **Existente** | Capacidad o configuración indicada por la historia que se reutiliza. |
| **Nuevo** | Dato o contrato requerido por esta historia. |
| **Extendido** | Contrato existente que incorpora un campo o consumidor. |
| **Derivado** | Valor calculado; no se almacena por separado. |

Las referencias entre objetos son **referencias lógicas**, no claves foráneas de base de datos.

## 2. Tokens y decisión de composición

### 2.1. Grupo `size` de `tokens.v1.json` — Extendido

| Campo lógico | Marca | Tipo | Obligatorio | FK / referencia | Default / restricción |
|---|---|---|---|---|---|
| `contentMax` | Existente | Token dimensional | Sí | — | 1200, según el contrato existente. |
| `editorialMax` | Nuevo; nombre propuesto | Token dimensional | Sí | — | 720, en la misma unidad y representación que `contentMax`. |

`editorialMax` debe regenerarse mediante el generador de HU-01-01. Las plantillas consumen el token generado; no duplican el literal 720.

### 2.2. Retícula por ancho — Existente, reutilizada

| Ancho disponible | Columnas | Margen lateral | Máximo de contenido |
|---|---:|---:|---|
| `<600` | 4 | 16 | Limitado por el espacio disponible |
| `600–839` | 8 | 24 | Limitado por el espacio disponible |
| `840–1199` | 12 | 32 | Limitado por el espacio disponible |
| `≥1200` | 12 | 40 | 1200, centrado |

Los intervalos son contiguos y excluyentes. El ancho corresponde al espacio disponible para la plantilla, no al modelo de dispositivo.

### 2.3. `CompositionLayout` — Nuevo objeto derivado

| Campo | Tipo / enum | Obligatorio | FK / referencia | Default / regla |
|---|---|---|---|---|
| `availableWidth` | Número finito ≥0 | Sí | Restricciones del contenedor | Sin default; medido en ejecución. |
| `columns` | `4 \| 8 \| 12` | Sí | Retícula existente | Derivado del ancho. |
| `horizontalMargin` | Dimensión | Sí | Tokens de retícula existentes | Derivado del ancho. |
| `contentWidth` | Dimensión | Sí | `size.contentMax` | Espacio interior disponible, limitado a 1200 desde ancho 1200. |
| `editorialWidth` | Dimensión | Sí | `size.editorialMax` | Menor entre el espacio interior del bloque y 720. |
| `listDetailMode` | `route \| split` | Sí | — | `route` bajo 840; `split` desde 840. |
| `formMode` | `steps \| formWithSummary` | Sí | — | Propuesta: `steps` bajo 600; resumen desde 600. |
| `boardMode` | `stacked \| sideBySide` | Sí | — | Propuesta: apilado bajo 840; lateral desde 840. |

**Precisiones:** 840 es el umbral explícito de lista/detalle. Los umbrales de formulario y tablero son propuestas: el ticket confirma el tablero apilado a 390 y lateral a 1024, pero no fija su punto exacto de cambio. Estos valores deben quedar en la política de composición compartida, sin crear otra fuente de breakpoints.

## 3. Configuración de las plantillas

### 3.1. `ResponsiveTemplateConfig` — Nuevo contrato de composición

| Campo | Tipo / enum | Obligatorio | FK / referencia | Default / regla |
|---|---|---|---|---|
| `kind` | `listDetail \| stagedForm \| boardPanel` | Sí | — | Sin default. |
| `familyRef` | Identificador de familia existente | Sí | Catálogo del resolvedor HU-01-02 | Sin default; declarado por la vista anfitriona. |
| `content` | Contenido o slots tipados por plantilla | Sí | Componentes y consumidores existentes | Sin default; esta historia utiliza fixtures. |
| `editorialContent` | Bloque de contenido opcional | No | `size.editorialMax` | Ausente; si existe, ancho limitado y superficie opaca. |

Cada variante exige sus slots: lista y detalle; formulario y resumen; tablero y resultado/panel. La composición reorganiza esos mismos contenidos.

### 3.2. Fondo de familia — Existente, consumido desde la base

Se reutiliza el contrato de HU-01-02 para resolver imagen, variante, punto focal y superficie de respaldo.

| Dato / propiedad | Marca | Tipo | Obligatorio | Referencia / regla |
|---|---|---|---|---|
| Familia declarada | Extendido | Identificador de familia | Sí | `familyRef` de la vista anfitriona. |
| Fondo resuelto | Existente | Resultado del resolvedor | Sí | Incluye respaldo cuando falta la variante. |
| Punto focal | Existente | Tipo definido por el resolvedor | Según contrato existente | Se utiliza para `cover`. |
| Cobertura | Derivado | Pantalla completa | Sí | Capa de fondo de la plantilla base. |
| Opacidad visual | Restricción de presentación | Rango 12–18 % | Sí | Reutilizar configuración compartida. |
| Zona tranquila | Restricción del asset | Proporción ≥65 % | Sí | Validación visual; no porcentaje calculado por la plantilla. |

Diálogos, hojas y pasos reciben el contexto del anfitrión. No incorporan `familyRef` independiente ni assets de fondo propios.

## 4. Estado transitorio

Estos objetos viven por encima de las ramas que cambian de composición. No se reinicializan al girar la pantalla o cruzar un breakpoint.

### 4.1. `ListDetailState` — Nuevo contrato; reutiliza navegación y selección existentes

| Campo | Tipo | Obligatorio | FK / referencia | Default / regla |
|---|---|---|---|---|
| `selectedItemId` | Identificador opaco nullable | Sí | Elemento del consumidor | `null`; no presupone una entidad de dominio. |
| `listScroll` | Estado de restauración de scroll | Sí | Controlador existente | Posición inicial. |
| `detailScrollByItem` | Mapa identificador → estado de scroll | No | Identificadores de elementos | Vacío. |
| `detailRoute` | Destino de navegación derivado | Condicional | Router existente | Requerido al abrir un detalle en modo `route`. |

En modo `split`, cambiar la selección conserva la lista y su scroll. En modo `route`, el router transporta la referencia del elemento. Ambas composiciones representan la misma selección.

### 4.2. `StagedFormState` — Nuevo contrato; reutiliza formulario y diálogo existentes

| Campo | Tipo / enum | Obligatorio | FK / referencia | Default / regla |
|---|---|---|---|---|
| `steps` | Lista ordenada de definiciones de etapa | Sí | Etapas del consumidor | Sin default; al menos una etapa. |
| `currentStepIndex` | Entero ≥0 | Sí | Posición en `steps` | 0; menor que la cantidad de etapas. |
| `draft` | Objeto tipado por el consumidor | Sí | Modelo funcional del formulario | Valores iniciales del consumidor. |
| `baseline` | Snapshot o referencia de comparación | Sí | Estado inicial o confirmado | Inicializado junto con `draft`. |
| `isDirty` | Booleano derivado | Sí | `draft` y mecanismo existente de cambios | Inicialmente `false`. |
| `exitState` | `idle \| awaitingDecision` | Sí | Diálogo existente | `idle`. |
| `pendingExit` | Intención de navegación nullable | Sí | Router existente | `null`; se conserva mientras se decide. |
| `stepLabel` | Texto localizado derivado | Sí | Clave de textos existente | `Paso {currentStepIndex + 1} de {steps.length}`. |

Cancelar el descarte limpia `pendingExit` y conserva borrador, etapa y estado de campos. Confirmarlo aplica la salida pendiente. El índice y su etiqueta se actualizan inmediatamente; la animación no es la fuente de verdad de la etapa.

Los campos, validaciones y datos de negocio pertenecen a las épicas consumidoras.

### 4.3. `BoardPanelState` — Nuevo contrato de presentación

| Campo | Tipo | Obligatorio | FK / referencia | Default / regla |
|---|---|---|---|---|
| `boardContent` | Modelo opaco o fixture | Sí | Consumidor / fixture | Sin default. |
| `resultContent` | Modelo opaco o fixture | Sí | Consumidor / fixture | Sin default. |
| `boardScroll` | Estado de scroll | Condicional | Controlador existente | Inicial; solo si la zona es desplazable. |
| `panelScroll` | Estado de scroll | Condicional | Controlador existente | Inicial; solo si la zona es desplazable. |

El resultado se presenta debajo o al lado del tablero según la composición. No se agrega un modelo procedural de tablero de EP-07.

## 5. Movimiento y accesibilidad

Son políticas compartidas de presentación; no entidades persistentes.

| Política | Valor requerido | Relación |
|---|---|---|
| Cambio de detalle | Fundido y desplazamiento de 8 px en 200 ms | Mantiene el estado de la lista. |
| Cambio de etapa | Salida 180 ms; entrada 240 ms | Consume la etapa seleccionada. |
| Movimiento reducido | Política existente | Prevalece sobre las transiciones ordinarias. |
| Escala de texto | Valor recibido del entorno; soportar 200 % | No modifica tokens ni datos del formulario. |
| Orden de foco | Derivado del orden visual | Recalculado con cada composición. |

Los textos utilizan claves de localización existentes. No se almacenan cadenas de interfaz dentro del estado de negocio.

## 6. Relaciones e índices

| Relación | Cardinalidad |
|---|---|
| Vista anfitriona → configuración de plantilla | 1:1 |
| Configuración de plantilla → familia existente | N:1 |
| Plantilla → composición calculada vigente | 1:1 |
| Lista/detalle → elemento seleccionado | 1:0..1 |
| Formulario → definiciones de etapa | 1:N, ordenadas |
| Formulario → borrador | 1:1 |
| Anfitrión → diálogos, hojas y pasos | 1:N; contexto de fondo heredado |

**Índices de base de datos:** ninguno nuevo.

**Claves en memoria:** identificadores estables para elementos y etapas. `detailScrollByItem`, si se utiliza, se consulta por identificador y elimina entradas de elementos que dejan de existir.

## 7. Migración y compatibilidad

1. Agregar el token editorial al grupo `size` y regenerar sus salidas con HU-01-01.
2. Incorporar las plantillas reutilizando retícula, resolvedor, navegación, overlays y componentes existentes.
3. Mantener selección, scroll y borrador fuera de las ramas de composición que puedan desmontarse.
4. Migrar consumidores progresivamente y conservar las plantillas anteriores hasta completar su adopción.
5. Revertir conjuntamente composición, referencias a tokens y goldens ante una regresión.
6. No requiere migración SQL, backfill, cambios de API ni modificación del store de Kanai.

La aprobación visual del fondo y la composición sigue siendo evidencia de Diseño; el modelo de datos no sustituye esa validación.