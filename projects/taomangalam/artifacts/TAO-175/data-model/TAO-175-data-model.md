# Modelo de datos — HU-01-04 · Moléculas del sistema de diseño

> **Veredicto previo:** esta historia **no introduce ni modifica persistencia**. No hay tablas, migraciones de base de datos ni esquemas de API. El "modelo de datos" afectado es el de **tipos del design system en Dart**: value objects de configuración de molécula, enums de estado y los contratos de los fixtures y casos de Widgetbook/golden. Todo lo que sigue se declara en ese plano; cualquier entidad de dominio real (consultas, filtros persistidos) queda fuera de alcance por el propio ticket (EP-05, épicas funcionales).

---

## 0. Resumen de impacto

| Plano | Afectado | Qué cambia |
|---|---|---|
| Base de datos (SQLite / backend) | No | Ninguna tabla, índice ni migración |
| API / DTOs de red | No | Ninguna ruta ni contrato |
| Modelo de UI (Dart, `lib/design_system/`) | **Sí — nuevo** | 5 value objects de molécula + 4 enums + 2 contratos de callback |
| Tokens generados (`tokens.g.dart`) | No (solo consumo) | Se leen; **no se editan a mano** (REQ-05) |
| Fixtures de catálogo / golden | **Sí — nuevo** | Objetos de datos de prueba, sin persistencia |

---

## 1. Entidades (value objects de UI)

Todas son `@immutable`, con `const` constructor, `copyWith`, `==`/`hashCode`. Ninguna tiene identidad persistida: **no hay `id` de base de datos**, no hay FK reales. Donde digo "FK" abajo, es una **referencia lógica a un token o a un enum**, no a una tabla.

### 1.1 `CardSpec` — NUEVO (REQ-01)

Configuración de la tarjeta base.

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `title` | `String` | Sí | — | Etiqueta accesible obligatoria; no puede ser vacía (ver invariante I-1) |
| `body` | `String?` | No | `null` | Contenido secundario |
| `action` | `CardAction?` | No | `null` | Affordance explícito; ver 1.6 |
| `onTap` | `VoidCallback?` | No | `null` | Si no es nulo, la tarjeta es navegable |
| `semanticsLabel` | `String?` | No | `null` | Si es nulo, se deriva de `title` + `body` |
| `state` | `MoleculeState` | Sí | `MoleculeState.default_` | enum, ver 2.1 |
| `padding` | `CardPadding` | Sí | `CardPadding.regular` | enum acotado a 16–20, ver 2.2 |

Valores **no modelados como campo** por decisión explícita (REQ-05): superficie (`surface`), radio 14, borde 1 px, escala 0.985 y duración 120 ms se leen de `tokens.g.dart` y de los tokens de movimiento de HU-01-07. Exponerlos como campos del value object abriría la puerta al hardcodeo que REQ-05 prohíbe.

**Invariante I-1** (cubre el AC "nunca es un botón sin etiqueta"): si `onTap != null`, entonces `semanticsLabel ?? title` debe ser no vacío. Se valida con `assert` en el constructor y con un test unitario que falla si se rompe.

### 1.2 `NavRowSpec` — NUEVO (REQ-02)

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `title` | `String` | Sí | — | No vacío |
| `meta` | `String?` | No | `null` | Metadato a la derecha del título |
| `leadingIcon` | `IconSpec?` | No | `null` | Átomo de HU-01-03 |
| `illustration` | `RowIllustration?` | No | `null` | Excluyente con `leadingIcon`; ver 1.7 |
| `showChevron` | `bool` | Sí | `true` | El chevrón debe seguir visible a escala 200 % (QA-01-04-03) |
| `onTap` | `VoidCallback?` | No | `null` | |
| `state` | `MoleculeState` | Sí | `MoleculeState.default_` | |

Alto mínimo 56 **no es campo**: es una restricción de layout fija del widget, verificada por widget test. Hacerlo configurable permitiría violar el AC desde el call site.

**Invariante I-2:** `leadingIcon` e `illustration` no pueden ser ambos no nulos (la fila tiene un único slot de apertura).
**Invariante I-3** (semántica agrupada): el widget emite un solo nodo `Semantics` con `label = "$title, $meta"` y `button: true` cuando `onTap != null`; los hijos van `excludeSemantics`.

### 1.3 `FormFieldSpec` y `FormSpec` — NUEVOS (REQ-03)

`FormFieldSpec`:

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `name` | `String` | Sí | — | Clave única dentro del `FormSpec`; actúa como **clave lógica** |
| `label` | `String` | Sí | — | |
| `validator` | `FieldValidator` | Sí | — | `ValidationError? Function(String value)`; ver 1.8 |
| `focusNode` | `FocusNode` | Sí | — | Necesario para "foco al primer error" |
| `initialValue` | `String` | Sí | `''` | |
| `trigger` | `ValidationTrigger` | Sí | `ValidationTrigger.onBlurAndSubmit` | enum, ver 2.3 |

`FormSpec`:

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `fields` | `List<FormFieldSpec>` | Sí | — | **Ordenada**: el orden define cuál es "el primer error" |
| `onSubmit` | `Future<void> Function(Map<String,String>)` | Sí | — | Solo se invoca si no hay errores |

**El orden de `fields` es parte del contrato**, no un detalle de presentación: el AC "el foco va al primer error" se resuelve como `fields.firstWhere((f) => errors.containsKey(f.name))`. Documentarlo evita que alguien reordene la lista en el render y rompa QA-01-04-01 sin darse cuenta.

**Estado derivado en runtime** (`FormController`, no persistido):

| Campo | Tipo | Notas |
|---|---|---|
| `values` | `Map<String, String>` | Clave = `FormFieldSpec.name` (referencia lógica) |
| `errors` | `Map<String, ValidationError>` | Idem; ausencia de clave = campo válido |
| `touched` | `Set<String>` | Para no mostrar error antes del primer blur |

**Invariante I-4:** `fields` no admite `name` duplicados (`assert` sobre el `Set` de nombres). Un duplicado haría colisionar `values`/`errors` y el foco iría al campo equivocado.
**Invariante I-5:** al salir de un campo inválido, el error se publica en `errors` **sin** llamar a `requestFocus` sobre ningún nodo.

### 1.4 `FilterChipSpec` — NUEVO (REQ-04)

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `id` | `String` | Sí | — | **Clave lógica** del filtro; identifica qué se retira |
| `label` | `String` | Sí | — | |
| `selected` | `bool` | Sí | `false` | Selección se señala con check **y** cambio de forma, además del color |
| `removable` | `bool` | Sí | `false` | Habilita la affordance de retiro |
| `onToggle` | `ValueChanged<bool>?` | No | `null` | |
| `onRemove` | `ValueChanged<String>?` | No | `null` | Recibe `id`, no el índice |
| `state` | `MoleculeState` | Sí | `MoleculeState.default_` | |

`onRemove` entrega el **`id`**, no la posición en la lista. Con el índice, un retiro concurrente o una lista reordenada elimina el chip equivocado, y el AC exige que se elimine **solo ese filtro**.

Alto visual 36–40 y área táctil ≥ 44 no son campos: el alto visual sale de tokens y el área táctil se garantiza con el padding del `GestureDetector`, verificado por QA-01-04-02.

**Invariante I-6:** si `removable == true`, `onRemove` debe ser no nulo.

### 1.5 `StatusLabelSpec` — NUEVO (REQ-04)

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `text` | `String` | Sí | — | **No vacío** — invariante I-7 |
| `tone` | `StatusTone` | Sí | — | enum, ver 2.4; mapea a token de color **y** a icono |
| `icon` | `IconSpec?` | No | `null` | Si es nulo, se deriva de `tone` |

**Invariante I-7** (cubre el AC "nunca es solo un punto de color"): `text` no vacío **e** icono resuelto (propio o derivado de `tone`). El tipo hace imposible construir una etiqueta que sea solo color: no existe constructor sin `text`.

### 1.6 `CardAction` — NUEVO (soporte de REQ-01)

| Campo | Tipo | Oblig. | Default |
|---|---|---|---|
| `label` | `String` | Sí | — |
| `onPressed` | `VoidCallback` | Sí | — |
| `icon` | `IconSpec?` | No | `null` |

### 1.7 `RowIllustration` — NUEVO (soporte de REQ-02, DEC-235)

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `assetKey` | `String` | Sí | — | **Clave lógica** contra el resolvedor de imágenes de HU-01-02; nunca una ruta de asset literal (REQ-05) |
| `semanticsLabel` | `String?` | No | `null` | `null` ⇒ decorativa, se marca `excludeSemantics` |
| `maxWidthFraction` | `double` | Sí | `1/3` | Tope duro; `assert(maxWidthFraction <= 1/3)` |

`fit` **no es campo**: es siempre `BoxFit.contain` por DEC-235. Igual que el marco, borde, sombra y fondo gris: su ausencia es estructural del widget, no una opción del call site. Un campo configurable aquí sería la vía más directa a romper QA-01-04-04.

### 1.8 `ValidationError` — NUEVO (soporte de REQ-03)

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `message` | `String` | Sí | — | Debe decir **cómo corregir**, no solo que está mal |
| `code` | `String?` | No | `null` | Para tests y analítica futura |

El icono del error no es campo: lo pone el widget de error siempre, por AC.

---

## 2. Enums

### 2.1 `MoleculeState` — NUEVO

Cubre exactamente los estados que REQ-06 exige en Widgetbook.

| Valor | Notas |
|---|---|
| `default_` | Default del campo `state` en todas las moléculas |
| `pressed` | |
| `focus` | |
| `disabled` | Suprime callbacks en el widget, no solo visualmente |
| `error` | Solo aplicable a formulario y, por composición, a tarjeta |
| `empty` | Sin contenido útil |
| `longText` | Caso de catálogo/golden; no es un estado de interacción real |

`empty` y `longText` son estados **de catálogo**, no de interacción. Los incluyo en el mismo enum porque REQ-06 los lista al mismo nivel y la matriz de goldens los recorre uniformemente; separarlos en dos enums duplicaría la matriz sin ganancia. Si más adelante aparecen estados de interacción nuevos, conviene revisar esa decisión.

### 2.2 `CardPadding` — NUEVO

| Valor | Mapea a |
|---|---|
| `compact` | token de espacio 16 |
| `regular` | token de espacio 20 |

Enum en lugar de `double` libre: el rango 16–20 del AC queda garantizado por el tipo. Un `double` permitiría padding 8 o 32 sin que nada falle.

### 2.3 `ValidationTrigger` — NUEVO

| Valor | Notas |
|---|---|
| `onBlur` | |
| `onSubmit` | |
| `onBlurAndSubmit` | **Default** — es el comportamiento que piden los AC |

### 2.4 `StatusTone` — NUEVO

| Valor | Token de color | Icono derivado |
|---|---|---|
| `neutral` | token neutral | `info` |
| `info` | token info | `info` |
| `success` | token success | `check` |
| `warning` | token warning | `alert` |
| `danger` | token danger | `error` |

La tabla tono → (color, icono) vive en **una sola** función de mapeo que lee `tokens.g.dart`. No se duplica en cada call site.

---

## 3. "Índices" y claves lógicas

No hay índices de base de datos. Las claves que sí importan, porque de ellas dependen criterios de aceptación:

| Clave | Entidad | Unicidad | Qué rompe si se viola |
|---|---|---|---|
| `FormFieldSpec.name` | `FormSpec.fields` | Única dentro del form | `values`/`errors` colisionan; el foco va al campo equivocado (QA-01-04-01) |
| `FilterChipSpec.id` | lista de chips | Única dentro de la lista | Se retira el filtro equivocado |
| `RowIllustration.assetKey` | resolvedor HU-01-02 | Debe existir en el catálogo de fixtures | La fila se dibuja sin ilustración o con placeholder |
| Orden de `FormSpec.fields` | `FormSpec` | Significativo | Cambia cuál es "el primer error" |

Para el catálogo de Widgetbook y los goldens, la clave compuesta de cada caso es **`(molécula, estado, dispositivo, escala de texto)`**, y debe ser única dentro de la matriz; un duplicado sobrescribe un golden en silencio y deja un estado sin cobertura real.

---

## 4. Relaciones

```
FormSpec 1 ──< N FormFieldSpec        (composición, ordenada)
FormFieldSpec 1 ──0..1 ValidationError (derivada en runtime, por `name`)
CardSpec 1 ──0..1 CardAction           (composición)
NavRowSpec 1 ──0..1 IconSpec           ─┐ excluyentes entre sí (I-2)
NavRowSpec 1 ──0..1 RowIllustration    ─┘
RowIllustration N ──1 asset del resolvedor HU-01-02 (por `assetKey`)
StatusLabelSpec N ──1 StatusTone       (enum)
StatusLabelSpec 1 ──0..1 IconSpec      (derivable de `tone`)
Toda molécula N ──1 MoleculeState      (enum)
Toda molécula N ──> tokens.g.dart      (consumo, solo lectura)
```

Dependencias hacia afuera, todas de **solo lectura**: `tokens.g.dart` (generado, HU-00-12), átomos de HU-01-03, resolvedor de imágenes de HU-01-02, tokens de movimiento y servicio de reducción de movimiento de HU-01-07.

---

## 5. Fixtures y matriz de catálogo (nuevos, sin persistencia)

`MoleculeFixture`:

| Campo | Tipo | Notas |
|---|---|---|
| `key` | `String` | Identificador del caso; parte de la clave compuesta del golden |
| `molecule` | `MoleculeKind` | enum: `card`, `navRow`, `form`, `filterChip`, `statusLabel` |
| `state` | `MoleculeState` | |
| `spec` | `Object` | El value object concreto de la molécula |

La matriz de goldens (REQ-07) es el producto:

`{5 moléculas} × {7 estados} × {teléfono, tablet} × {100 %, 200 %}`

Los pares no aplicables (por ejemplo `error` sobre `statusLabel`) se declaran explícitamente en una lista de exclusiones, no se omiten en silencio: una omisión silenciosa es indistinguible de un golden olvidado.

---

## 6. Notas de migración

1. **No hay migración de base de datos.** Nada que versionar, nada que revertir en el store.
2. **Ruptura de API en Dart:** ninguna. Las cinco moléculas son símbolos nuevos; no se modifica ninguna firma existente de HU-01-03.
3. **Dirección de dependencia:** HU-01-08 y HU-01-10 consumirán estos tipos. Mientras esta historia no cierre, no deberían fijarse a los value objects: cualquier cambio de campo antes del cierre sería ruptura directa para ellos.
4. **Rollback:** moléculas y fixtures se revierten **juntos** (así lo define el handoff). Si se revirtieran por separado, el catálogo de Widgetbook quedaría apuntando a tipos inexistentes y el build del catálogo fallaría.
5. **`tokens.g.dart` no se toca.** Si falta un token (por ejemplo, un tono de estado sin color asignado), el arreglo va al origen generador en HU-00-12, no a una constante local en la molécula. Una constante local pasa los goldens y rompe REQ-05 sin que ningún test lo detecte.
6. **Estados de catálogo dentro de `MoleculeState`:** si una iteración futura necesita distinguir estados de interacción de estados de catálogo, el cambio es renombrar/dividir el enum. Es un refactor local y mecánico, reversible; por eso no justifica anticiparlo ahora.

---

## 7. Fuera de alcance (confirmado contra el ticket)

- Entidades de **consulta con datos reales** (EP-05): no se modela ninguna.
- **Overlays y feedback** (HU-01-05): sin tipos aquí.
- **Persistencia de filtros** en vistas de tablet (épicas funcionales): `FilterChipSpec` es efímero, vive en el árbol de widgets. Si una épica funcional necesita filtros persistidos, ese modelo de datos se define allí y **consume** este value object; no lo extiende.