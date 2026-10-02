# Modelo de datos — TAO-174 / HU-01-03

## Resumen de impacto

Esta historia **no introduce entidades persistidas**: no hay base de datos, API ni almacenamiento local en su alcance (secciones "Datos: ninguno", "API: ninguna", "Permisos: no aplica", "Offline/sync: fuentes empaquetadas"). El modelo afectado es el **modelo de datos de presentación en memoria**: tokens generados, contratos de tema y los objetos de configuración (props/estado) de cada átomo, más los manifiestos de assets declarativos (`pubspec.yaml`).

Por eso el documento describe tres capas:

1. **Capa de tokens** (existente, ampliable solo vía generador) — REQ-08, REQ-09.
2. **Capa de assets declarados** (nueva) — REQ-01, REQ-03.
3. **Capa de objetos de átomo** (nueva: enums, modelos de props y estado) — REQ-04, REQ-05, REQ-06, REQ-07.

Convención de marcas: **[EXISTENTE]** ya vive en la rama acumuladora; **[NUEVO]** se crea en esta historia; **[EXTENDIDO]** entidad existente a la que se agregan campos.

---

## 1. Capa de tokens

### 1.1 `DesignTokens` (`tokens.g.dart`) — [EXISTENTE / EXTENDIDO]

Objeto generado por `tool/generate_design_tokens.dart`. **No se edita a mano** (REQ-09): todo token faltante se agrega en la fuente del generador y se regenera.

| Grupo | Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|---|
| color | `actionPrimary` | `Color` | sí | — | [EXISTENTE] fondo del botón Primario |
| color | `actionPrimaryText` | `Color` | sí | — | [EXISTENTE] texto sobre `actionPrimary` |
| color | `error` | `Color` | sí | — | [EXISTENTE] botón Destructivo; prohibido `brand` en esa variante |
| color | `brand` | `Color` | sí | — | [EXISTENTE] no consumible por Destructivo (regla, no esquema) |
| color | `focus` | `Color` | sí | — | [EXISTENTE] color del contorno de foco |
| color | `border` | `Color` | sí | — | [EXISTENTE] ajustado por HU-01-01 a ≥3:1 sobre `background` y `canvas` |
| color | `background` | `Color` | sí | — | [EXISTENTE] |
| color | `canvas` | `Color` | sí | — | [EXISTENTE] |
| radio | `sm` | `double` | sí | — | [EXISTENTE] radio del botón Primario |
| trazo | `stroke.focus` | `double` | sí | — | [EXISTENTE] 3 px |
| tamaño | `touchMin` | `double` | sí | — | [EXISTENTE] 44 (botón Icono) |
| tamaño | `controlMinHeight` | `double` | sí | — | [EXTENDIDO si falta] 48 para botón y campo; si hoy no existe, se agrega en el generador, no en el átomo |
| tamaño | `iconBox` | `double` | sí | — | [EXTENDIDO si falta] 24, caja del átomo de icono |
| espacio | `labelFieldGap` | `double` | sí | — | [EXTENDIDO si falta] 8, separación etiqueta-campo |
| movimiento | `scalePressed` | `double` | sí | — | [EXISTENTE] 0.985 |
| movimiento | `fast` | `Duration` | sí | — | [EXISTENTE] 120 ms |
| movimiento | `errorReveal` | `Duration` | sí | — | [EXTENDIDO si falta] 180 ms, aparición del mensaje de error |
| opacidad | `disabledOpacity` | `double` | sí | — | [EXTENDIDO si falta] 0.38 |

**Nota de migración:** antes de agregar cualquiera de los campos marcados *[EXTENDIDO si falta]*, verificar su existencia en `tokens.g.dart`. Si existe con otro nombre, se usa el nombre existente y **no** se crea un alias. Si no existe, se agrega a la fuente del generador y se regenera el archivo completo; nunca se escribe el literal en el átomo (REQ-08).

### 1.2 `AppThemeData` / `TaoAppColors` (`app_theme.dart`) — [EXISTENTE]

Contrato único de acceso a tokens desde los widgets. Los átomos leen **solo** por aquí; ninguno importa `tokens.g.dart` directo ni define su propia paleta (REQ-08, REQ-09).

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| `colors` | `TaoAppColors` | sí | [EXISTENTE] |
| `typography` | `AppTypography` | sí | [EXISTENTE] ver 1.3 |
| `spacing` / `radius` / `stroke` / `size` / `motion` | grupos de token | sí | [EXISTENTE] |

### 1.3 `AppTypography` (`typography.dart`) — [EXTENDIDO]

Expone los doce estilos de `typography.style` resueltos a las familias empaquetadas (REQ-02).

| Campo | Tipo | Oblig. | Familia | Tamaño/Interlineado | Cifras tabulares |
|---|---|---|---|---|---|
| `displayL` | `TextStyle` | sí | Zen Old Mincho | 40/44 | no |
| `displayM` … `titleS` (estilos intermedios) | `TextStyle` | sí | Zen Old Mincho / Spectral | según `typography.style` | no |
| `labelLarge` | `TextStyle` | sí | Spectral | según token | no |
| `meta` | `TextStyle` | sí | Spectral | 12/16 | no |
| `numberL` | `TextStyle` | sí | IBM Plex Mono | 40/40 | **sí** (`FontFeature.tabularFigures`) |
| resto de estilos de dato variable | `TextStyle` | sí | IBM Plex Mono | según token | **sí** |

**Regla de integridad:** los doce estilos son exactamente los definidos en `typography.style`; no se agregan ni renombran estilos en esta historia. Cada estilo debe resolver a una familia declarada en `pubspec.yaml` (ver 2.1); un estilo que apunte a una familia no declarada es un defecto de integridad referencial entre las capas 1 y 2.

**Fallback:** si falta un peso empaquetado, el estilo cae a la familia de sistema (REQ-01). Esto es comportamiento de resolución, no un campo del modelo.

---

## 2. Capa de assets declarados — [NUEVO]

No es una tabla: es un manifiesto declarativo con integridad referencial contra la capa 1 y contra el árbol de archivos.

### 2.1 Entrada `fonts` de `app/pubspec.yaml` — [NUEVO]

| Campo | Tipo | Oblig. | Valores | Notas |
|---|---|---|---|---|
| `family` | string | sí | enum cerrado: `Zen Old Mincho`, `Spectral`, `IBM Plex Mono` | clave lógica |
| `fonts[].asset` | path | sí | bajo `app/assets/fonts/<family>/` | el archivo debe existir en el repo |
| `fonts[].weight` | int | sí | Zen Old Mincho: 500/600/700 · Spectral: 400/500/600 · IBM Plex Mono: 400/500/600 | nueve declaraciones en total |

**Restricción de licencia (REQ-01, DEC-230):** cada directorio de familia contiene su archivo de licencia OFL junto a los `.ttf`/`.otf`. Es una restricción verificable sobre el árbol, no un campo.

### 2.2 Entrada de iconos de `app/pubspec.yaml` — [NUEVO]

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| familia de icono o set de assets | string / path | sí | Material Symbols empaquetados en `app/assets/icons/` o como fuente de iconos declarada |
| licencia Apache 2.0 | archivo | sí | junto a los archivos del set (REQ-03, DEC-230) |

**Invariante transversal (REQ-01, REQ-03, QA-01-03-04):** ninguna familia ni icono se resuelve por red en tiempo de ejecución. Toda referencia tipográfica o de icono debe resolver contra una entrada de 2.1/2.2.

---

## 3. Capa de objetos de átomo — [NUEVO]

### 3.1 Enum `TaoButtonVariant` — [NUEVO]

| Valor | Color de fondo | Texto | Notas |
|---|---|---|---|
| `primary` | `actionPrimary` | `actionPrimaryText` | `labelLarge`, alto mín. 48, radio `sm` |
| `secondary` | token de superficie secundaria | token correspondiente | doc 43 §8 |
| `tertiary` | sin fondo sólido | token correspondiente | doc 43 §8 |
| `destructive` | `error` | token correspondiente | **prohibido** consumir `brand` |
| `icon` | según doc 43 §8 | — | área táctil mín. `touchMin` (44×44), etiqueta semántica y tooltip obligatorios |

Sin default: la variante es obligatoria en el constructor.

### 3.2 Enum `TaoButtonState` — [NUEVO]

| Valor | Default | Aplicabilidad | Reglas |
|---|---|---|---|
| `default_` | **sí** | todas las variantes | — |
| `pressed` | no | todas | escala `scalePressed` (0.985) durante `fast` (120 ms); con movimiento reducido cambia **solo** la superficie |
| `focus` | no | todas | contorno exterior `stroke.focus` (3 px) color `focus` |
| `disabled` | no | todas | opacidad `disabledOpacity` (0.38); no ejecuta la acción; se anuncia como no disponible |
| `loading` | no | todas | conserva la etiqueta junto al indicador; no encola una segunda acción |
| `success` | no | **parcial** | solo donde corresponda según doc 43 §8 |

**Nota de integridad:** `success` no es universal. El modelo debe hacer explícita la aplicabilidad por variante en vez de dejarla implícita en el render. Recomendación: una tabla de constantes `Set<TaoButtonState>` por variante, derivada de doc 43 §8, consultada por Widgetbook para generar casos (ver 3.6). Alternativa descartada: permitir cualquier estado en cualquier variante y confiar en el diseñador; se descarta porque Widgetbook generaría casos inexistentes y el golden correspondiente no tendría referencia.

**Estado derivado vs. estado almacenado:** `pressed` y `focus` los deriva el framework de gestos/foco; `disabled`, `loading` y `success` los provee el consumidor. El objeto de props (3.3) solo almacena los tres últimos; `TaoButtonState` existe como enum para el catálogo de Widgetbook y para los goldens, no como campo persistido en el widget.

### 3.3 `TaoButton` (props) — [NUEVO]

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `variant` | `TaoButtonVariant` | sí | — | |
| `label` | `String` | sí salvo `icon` | — | obligatorio en las cuatro variantes con texto |
| `icon` | `TaoIconData?` | no | `null` | obligatorio cuando `variant == icon` |
| `onPressed` | `VoidCallback?` | no | `null` | `null` equivale a deshabilitado |
| `isLoading` | `bool` | sí | `false` | mientras es `true`, `onPressed` no se invoca (QA-01-03-02) |
| `isSuccess` | `bool` | sí | `false` | solo en variantes que admiten `success` |
| `isEnabled` | `bool` | sí | `true` | combinado con `onPressed != null` |
| `semanticLabel` | `String` | sí cuando `variant == icon` | — | etiqueta accesible |
| `tooltip` | `String?` | sí cuando `variant == icon` | — | requerido por criterio de aceptación |

**Invariantes:**
- `variant == icon` ⟹ `icon != null` ∧ `semanticLabel` no vacío ∧ `tooltip` no vacío.
- `variant != icon` ⟹ `label` no vacío.
- `isLoading == true` ⟹ la etiqueta sigue visible; el indicador se agrega, no reemplaza.
- `isEnabled == false` ∨ `onPressed == null` ⟹ el árbol de semántica marca el control como no disponible.
- Ningún campo acepta `Color`, `double` de tamaño ni `Duration` desde el consumidor: toda apariencia se deriva de `variant` + tokens (REQ-08).

### 3.4 `TaoIcon` (props) — [NUEVO]

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `icon` | `TaoIconData` | sí | — | referencia a un símbolo del set empaquetado (2.2) |
| `semanticLabel` | `String` | sí | — | **obligatorio por contrato**, no opcional (REQ-03) |
| `size` | token de tamaño | no | `iconBox` (24) | solo valores de token, no `double` libre |
| `color` | token de color | no | color de texto heredado | solo token |

**Nota:** el trazo de 1.75 a 2 es una propiedad del set de iconos elegido (peso de Material Symbols), no un campo configurable del átomo. Si el set empaquetado expone ejes variables, se fija un peso en el asset, no por parámetro.

### 3.5 `TaoTextField` (props + estado) — [NUEVO]

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `label` | `String` | sí | — | persistente, siempre visible sobre el campo; nunca se degrada a placeholder |
| `placeholder` | `String?` | no | `null` | **no** reemplaza la etiqueta |
| `helperText` | `String?` | no | `null` | |
| `errorText` | `String?` | no | `null` | no nulo ⟹ estado de error |
| `controller` | `TextEditingController?` | no | `null` | |
| `onChanged` | `ValueChanged<String>?` | no | `null` | |
| `isEnabled` | `bool` | sí | `true` | |
| `semanticLabel` | `String?` | no | deriva de `label` | |

Estado derivado (no almacenado como campo público):

| Estado | Condición | Presentación |
|---|---|---|
| `enabled` | `isEnabled ∧ errorText == null ∧ ¬focused` | borde `border`, ≥3:1 sobre `background` y `canvas` |
| `focused` | foco activo | contorno `stroke.focus` color `focus` |
| `error` | `errorText != null` | mensaje debajo con **icono + texto**, revelado en `errorReveal` (180 ms), **sin sacudida** |
| `disabled` | `¬isEnabled` | opacidad `disabledOpacity` |

**Invariantes:** alto mínimo `controlMinHeight` (48); separación etiqueta-campo `labelFieldGap` (8); la transición de error anima opacidad/altura, nunca desplazamiento horizontal.

### 3.6 Modelo del catálogo Widgetbook — [NUEVO]

Entidad de configuración, no persistida. Define el producto cartesiano que REQ-07 exige.

| Campo | Tipo | Oblig. | Valores |
|---|---|---|---|
| `atom` | enum `TaoAtom` | sí | `typography`, `icon`, `button`, `textField` |
| `variant` | string | sí | para `button`: los cinco valores de `TaoButtonVariant`; para `typography`: los doce estilos |
| `state` | `TaoButtonState` / estado del campo | sí | solo estados aplicables a la variante (ver 3.2) |
| `device` | enum `WidgetbookDevice` | sí | `phone` (360×800), `tablet` |
| `textScale` | enum `TextScaleCase` | sí | `x100`, `x200` |
| `contentCase` | enum `ContentCase` | sí | `normal`, `longText` (etiqueta de 60 caracteres, QA-01-03-03) |

**Cardinalidad esperada:** una entrada por combinación aplicable de `atom × variant × state`, cada una renderizada en `phone` y `tablet`. Los goldens se nombran de forma determinista a partir de esta tupla, para que un golden huérfano o faltante sea detectable.

---

## 4. Relaciones

```
pubspec.yaml (fonts)  ──declara──▶  familias tipográficas
        ▲                                  │
        │                           resuelve a
        │                                  ▼
tool/generate_design_tokens.dart ──genera──▶ tokens.g.dart
                                              │
                                        expone vía
                                              ▼
                                   AppThemeData / TaoAppColors / AppTypography
                                              │
                            ┌─────────────────┼─────────────────┐
                            ▼                 ▼                 ▼
                        TaoButton          TaoIcon         TaoTextField
                            │                 │                 │
                            └────────┬────────┴─────────────────┘
                                     ▼
                           Catálogo Widgetbook (atom × variant × state × device × textScale)
                                     │
                                     ▼
                              Goldens (phone/tablet, 100%/200%)

pubspec.yaml (icons) ──declara──▶ set Material Symbols ──referencia──▶ TaoIconData ──▶ TaoIcon
```

**Dependencias de integridad referencial:**

| Origen | Destino | Regla |
|---|---|---|
| `AppTypography.*` | familia en `pubspec.yaml` | toda familia referida debe estar declarada y empaquetada |
| `TaoIconData` | set de iconos empaquetado | todo símbolo referido debe existir en el asset local |
| átomos (3.3–3.5) | `AppThemeData` | única vía de acceso a apariencia; cero literales |
| `tokens.g.dart` | generador | archivo derivado; edición manual prohibida |
| catálogo Widgetbook | `TaoButtonVariant × TaoButtonState` | solo combinaciones aplicables |

---

## 5. Índices y claves

No hay base de datos ni índices físicos. Las claves lógicas relevantes:

| Entidad | Clave lógica | Unicidad |
|---|---|---|
| familia tipográfica | `family` | única en `pubspec.yaml` |
| declaración de fuente | (`family`, `weight`) | una por par; nueve pares en total |
| estilo tipográfico | nombre del estilo | doce, cerrado |
| variante de botón | valor del enum | cinco, cerrado |
| caso de Widgetbook | (`atom`, `variant`, `state`, `device`, `textScale`, `contentCase`) | una entrada por tupla |
| golden | misma tupla que el caso | un archivo por tupla |

---

## 6. Notas de migración

1. **No hay migración de datos persistidos.** Nada que respaldar ni convertir: no se toca ninguna base, ningún store local ni ningún contrato de API.
2. **Migración de assets (REQ-01, REQ-03):** las fuentes y los iconos están marcados como *faltantes en el repositorio hasta esta historia*. El paso es una incorporación nueva, no un reemplazo: se agregan nueve archivos de fuente en tres familias más sus licencias OFL, y el set de Material Symbols con su licencia Apache 2.0. Se verifica que no quede ninguna referencia a una fuente o icono remoto.
3. **Migración del generador (REQ-09):** si algún token de 1.1 marcado *[EXTENDIDO si falta]* no existe, el cambio entra en la fuente del generador y se regenera `tokens.g.dart` completo. Riesgo a vigilar: una regeneración puede alterar otros valores si la fuente del generador divergió de lo generado; conviene revisar el diff de `tokens.g.dart` entero, no solo las líneas agregadas.
4. **Compatibilidad con consumidores (HU-01-04, HU-01-05, HU-01-08):** estos átomos son nuevos y aún no tienen consumidores, así que el contrato de props se puede fijar sin romper nada. Ese margen desaparece en cuanto HU-01-04 los consuma: los campos obligatorios de 3.3–3.5 deben quedar decididos ahora.
5. **Rollback:** átomos, entradas de Widgetbook y goldens revierten como una unidad. Los assets de fuentes e iconos y los tokens agregados al generador **pueden quedarse** aunque se reviertan los átomos: son aditivos y no rompen nada preexistente. Separar el rollback así evita arrastrar la capa 2 en un revert de la capa 3.
6. **Pendiente de confirmación contra el código real:** los nombres exactos de `controlMinHeight`, `iconBox`, `labelFieldGap`, `errorReveal` y `disabledOpacity` se dan como propuesta. Antes de implementar hay que leer `tokens.g.dart` y el generador para usar los nombres existentes si ya los hay; inventar un alias nuevo sobre un token que ya existe sería duplicar la fuente de verdad, justo lo que REQ-09 prohíbe.