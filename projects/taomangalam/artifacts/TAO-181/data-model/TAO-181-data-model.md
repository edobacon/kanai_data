# Modelo de datos afectado — TAO-181 (HU-01-17)

> Rol: diseñador de modelo de datos de Kanai. Alcance: preferencias locales por dispositivo de Ajustes (movimiento, contraste, legibilidad) y el juego de tokens semánticos de contraste aumentado que las materializa. Todo el modelo es **local por dispositivo**: no hay tablas de servidor, ni sincronización, ni migración de contenido de usuario.

## Leyenda

| Marca | Significa |
|---|---|
| `[EXISTENTE]` | Ya definido o implementado; esta historia no cambia su forma, solo lo consume. |
| `[AMPLIADO]` | Existe y esta historia le agrega campos, claves o grupos nuevos. |
| `[NUEVO]` | No existe todavía; lo introduce esta historia. |
| `[DERIVADO]` | Artefacto generado/calculado a partir de una fuente; no es fuente canónica. |

---

## 1. Estado actual (lo que ya existe)

| Elemento | Dónde | Naturaleza |
|---|---|---|
| `preferencia_local` | `docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md` §10 | Tabla Drift local documentada, "clave/valor por dispositivo: motion, accesibilidad, hora elegida de los recordatorios y opciones no sincronizadas". **No está implementada aún** (no existe símbolo en código). |
| Preferencia de tema | `app/lib/core/theme/theme_preference.dart`, `theme_preference_store.dart` | Implementada sobre `flutter_secure_storage`, clave plana `tema`, valor `light`. `[EXISTENTE]` |
| Preferencia de movimiento | `app/lib/design_system/motion/reduced_motion_service.dart`, `reduced_motion_preference.dart` | Implementada sobre `flutter_secure_storage`, clave plana `movimiento_reducido`, valores `'true'`/`'false'`. Servicio de HU-01-07. `[EXISTENTE]` |
| `tokens.v1.json` | `docs/product/design-system/tokens.v1.json` | Fuente de tokens; contiene `color.semantic.light`, `color.semantic.dark`, `typography.style`, `motion`, `size`, `board`, `opacity`. `[EXISTENTE]` |
| `TaoAppColors` / `AppThemeData` | `app/lib/design_system/app_theme.dart` | `ThemeExtension` de la paleta semántica, "preparado para una segunda paleta con los mismos nombres". `[EXISTENTE]` |
| Dart de tokens | `app/lib/design_system/tokens/tokens.g.dart` | Generado desde `tokens.v1.json`; CI verifica frescura. `[DERIVADO]` |
| `PreferenciaCuenta` | `server/contract/generated/dart/.../preferencia_cuenta.dart` | Preferencia de **cuenta, sincronizada**. Otro concepto; **no se toca ni se confunde** con `preferencia_local`. |

Nota de diseño clave: la **previsualización** de Ajustes no es una entidad persistida. Vive en memoria (estado de UI) y solo al tocar `Aplicar` se proyecta sobre `preferencia_local`. No requiere tabla, cola ni borrador durable.

---

## 2. Entidad `preferencia_local` `[AMPLIADO]`

Almacén clave/valor por dispositivo. Esta historia **no cambia** la forma física del almacén actual (`flutter_secure_storage`, clave → valor crudo); agrega **claves nuevas** y fija el contrato de versionado y de valor por defecto.

### 2.1 Campos (representación conceptual, tabla Drift `preferencia_local`)

| Campo | Tipo | Obligatorio | PK/FK | Default | Descripción |
|---|---|---|---|---|---|
| `clave` | `TEXT` | Sí | PK | — | Nombre de la preferencia por dispositivo. Único dentro del dispositivo. |
| `valor` | `TEXT` | Sí | — | — | Valor serializado (booleano como `'true'`/`'false'`; texto para claves de texto). |
| `version` | `INTEGER` | Sí | — | `1` | Versión de esquema del valor de esa clave. `[NUEVO]` como atributo explícito del modelo; hoy se resuelve en el normalizador de cada clave. |
| `updated_at` | timestamp | No | — | ahora | Marca de última escritura. Solo diagnóstico local. |

Sin FK a `cuenta`: la preferencia es por dispositivo y no se sincroniza (DEC-102). Las claves `cuenta_id` y `cuenta.tipo` viven aquí según `20_modelo_de_datos_v2 §10`, pero las gobierna EP-03a, no esta historia.

### 2.2 Claves gobernadas por esta historia

| Clave | Tipo de valor | Dominio (enum) | Default / valor ausente | Obligatorio | Estado |
|---|---|---|---|---|---|
| `tema` | `string` | `light` | `light` | Sí (normalizado a claro) | `[EXISTENTE]` |
| `movimiento_reducido` | `string` booleano | `'true'` \| `'false'` | ausente/corrupto → `null` → movimiento normal (`false`) | No | `[EXISTENTE]` — la escribe y la lee HU-01-07; **el nombre no cambia**. |
| `contraste_aumentado` | `string` booleano | `'true'` \| `'false'` | ausente/corrupto → `false` (paleta clara base) | No | `[NUEVO]` |
| `lectura_ampliada` | `string` booleano | `'true'` \| `'false'` | ausente/corrupto → `false` (tipografía normal) | No | `[NUEVO]` |

Reglas de valor que fija esta historia:

- **Compatibilidad de escritura (REQ-03):** `Reducir movimiento` escribe exactamente `movimiento_reducido` con los mismos valores crudos que ya lee `ReducedMotionService`. No se renombra ni se re-serializa.
- **Combinación (REQ-03):** el valor **efectivo** de movimiento no es solo la clave local; es `resolveReducedMotion(systemPrefersReduced, localPreference)` (sistema OR local). El sistema operativo sigue siendo fuente y no se persiste.
- **Lectura tolerante (REQ-06):** clave ausente, valor vacío o valor desconocido devuelven el default sin lanzar. Misma semántica que `parseReducedMotionPreference` y `normalizeStoredThemePreference`.
- **Versionado (REQ-06):** cada clave lleva su `version` (hoy `1`). Un cambio de forma incompatible se resuelve introduciendo una **clave nueva** y tratando la anterior como desconocida (→ default); así una app que actualiza no arrastra valores de forma vieja y una app que retrocede simplemente ignora la clave nueva.

---

## 3. `tokens.v1.json` — grupo semántico de contraste aumentado `[AMPLIADO]`

Entregable de Diseño de esta historia (DEC-232, punto 13). Se agrega un **juego de tokens semánticos de mayor contraste** con **los mismos veinte nombres** que `color.semantic.light`, para que sea intercambiable por la segunda paleta de `TaoAppColors` sin tocar consumidores.

### 3.1 Objeto nuevo `color.semantic.highContrast` `[NUEVO]`

| Campo (token) | Tipo | Obligatorio | Default (fallback a `color.semantic.light`) | Descripción |
|---|---|---|---|---|
| `canvas` | color (hex) | Sí | `#EDE8DB` | Fondo de app. |
| `background` | color | Sí | `#FAF7F0` | Fondo base de pantalla. |
| `surface` | color | Sí | `#FFFDF8` | Superficie principal. |
| `surfaceMuted` | color | Sí | `#F3EFE4` | Superficie atenuada. |
| `surfaceOverlay` | color | Sí | `#FFFDF8` | Superficie de superposición. |
| `textPrimary` | color | Sí | `#141A37` | Texto principal. |
| `textSecondary` | color | Sí | `#6B665B` | Texto secundario. |
| `textInverse` | color | Sí | `#FFFDF8` | Texto sobre acción. |
| `border` | color | Sí | `#857C6E` | Borde de componentes. |
| `divider` | color | Sí | `#E4DDD1` | Línea divisoria. |
| `actionPrimary` | color | Sí | `#071A33` | Fondo de acción principal. |
| `actionPrimaryText` | color | Sí | `#FFFDF8` | Texto de acción principal. |
| `actionSecondary` | color | Sí | `#785D33` | Fondo de acción secundaria. |
| `focus` | color | Sí | `#946E2F` | Anillo de foco. |
| `brand` | color | Sí | `#7F0E06` | Color de marca. |
| `success` | color | Sí | `#3F6B4A` | Estado exitoso. |
| `warning` | color | Sí | `#895E1A` | Estado de advertencia. |
| `error` | color | Sí | `#A23A32` | Estado de error. |
| `info` | color | Sí | `#2C5E78` | Estado informativo. |
| `scrim` | color | Sí | `#07101B` (sólido) | Velo modal. **Restricción: sin transparencia tenue** (doc 44 §18); a diferencia del `light` (`#07101BA6`), aquí debe ser opaco o de opacidad suficiente para no perder contraste. |

Restricciones del grupo:

- Los veinte tokens son obligatorios; el grupo debe pasar la misma utilidad de contraste de HU-01-15 sobre las plantillas (QA-01-17-03).
- No puede haber tokens con transparencias tenues (`surface*`, `scrim`, textos sobre imagen).
- El juego se **expone** desde el tema de HU-01-01 (`TaoAppColors` como segunda instancia con los mismos nombres); no se crean colores propios en widgets (DEC-174).

### 3.2 Grupo `board.highContrast` `[NUEVO]` (escala estrecha + patrones del rastro)

Deriva de DEC-188 ("en alto contraste se sustituyen los tonos por una escala más estrecha y patrones"). Se **define** aquí como entregable de diseño; **su consumo es de EP-07** ("EP-07 la consume cuando exista la paleta"), por lo que esta historia no lo cablea en el tablero.

| Campo | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `trailToneLevels` | entero | Sí | `4` | Niveles tonales de la escala estrecha (menor que `board.trailToneLevels = 8`). |
| `advancePatterns` | lista de enum | Sí | — | Patrones de trazo para avance (patrón ≠ color). Enum propuesto: `solid`, `dash`, `dot`, `dash-dot`. |
| `regressPatterns` | lista de enum | Sí | — | Patrones de trazo para retroceso. Mismo enum. |
| `outlineStroke` | número | Sí | `board.gridMinStroke` (1.5) | Trazo de la línea exterior que mantiene contraste aun en el nivel más claro (DEC-188). |

Nota: el color sigue sin reemplazar la etiqueta `Avance`/`Retroceso` ni la posición; los patrones son la señal de respaldo.

### 3.3 Tipografía y movimiento (sin cambios de modelo)

- `typography.style` `[EXISTENTE]`: la **lectura ampliada** (REQ-05) no introduce tokens nuevos por este ticket. Se resuelve aplicando un `textScaler` mayor y un espaciado de lectura más amplio **solo en las fichas del método**; el resto de superficies sigue el tamaño de texto del dispositivo. Si Diseño decide fijar tamaños exactos, serían tokens nuevos de `typography` (pendiente de Diseño, fuera del entregable de contraste).
- `motion` `[EXISTENTE]`: `Reducir movimiento` reutiliza `motion.reduced` (120) e `motion.instant` (0); no agrega tokens. La cota "fundidos de hasta 120 ms o cambios inmediatos" ya está en los tokens.

---

## 4. Artefactos derivados `[DERIVADO]`

| Artefacto | Fuente | Cambio |
|---|---|---|
| `app/lib/design_system/tokens/tokens.g.dart` | `tokens.v1.json` | Se regenera para incluir la clase del grupo `color.semantic.highContrast` y `board.highContrast`. Debe quedar en sync (CI `check_design_tokens_freshness`). |
| Segunda instancia de `TaoAppColors` | Dart generado | Se construye la paleta de contraste aumentado con los mismos veinte getters; se selecciona según `contraste_aumentado`. |

Regla de consistencia: `tokens.v1.json` es la única fuente; el Dart generado no se edita a mano (falla CI si no coincide).

---

## 5. Fuera de alcance (no modelar aquí)

| Elemento | Motivo |
|---|---|
| `PreferenciaCuenta` (servidor, sincronizada) | Preferencia de cuenta; esta historia es local por dispositivo y no la toca. |
| `recordatorio_local` y clave `recordatorio.hora_elegida` | Los agrega HU-08-05 (EP-08) sobre esta pantalla. |
| Cola de sync (`sync_outbox`, `sync_cursor`, `evento_metrica_pendiente`, …) | La preferencia local no se sincroniza; no genera filas de outbox. |
| Selector de tema/idioma, respaldo, seguridad, tutorial, versión | DEC-102 los excluye de Ajustes V1. |
| Consumo del rastro del tablero en contraste aumentado | EP-07; aquí solo se definen los tokens. |

---

## 6. Índices y restricciones

| Restricción | Objeto | Motivo |
|---|---|---|
| `PRIMARY KEY (clave)` | `preferencia_local` | Una sola fila por clave dentro del dispositivo. |
| Sin FK | `preferencia_local` | Ámbito dispositivo; no depende de cuenta ni de espacio. |
| Dominio cerrado por clave | `preferencia_local.valor` | Cada clave define su enum/booleano; valor fuera de dominio → default. |
| Unicidad de nombres dentro de `color.semantic.*` | `tokens.v1.json` | `highContrast` debe repetir exactamente los veinte nombres de `light` (intercambiabilidad de paleta). |
| Cobertura de contraste | `color.semantic.highContrast` | Todos los pares deben pasar `check_contrast`; `scrim` sin opacidad tenue. |

---

## 7. Relaciones

- `preferencia_local.movimiento_reducido` → la lee `ReducedMotionService` (HU-01-07) → `resolveReducedMotion(sistema, local)` → transiciones de router, menú y tablero (REQ-03).
- `preferencia_local.contraste_aumentado` → selecciona el juego `color.semantic.highContrast` → segunda paleta `TaoAppColors` → `ThemeExtension` en todas las vistas/paneles/modales/fondos/controles (REQ-01, REQ-04).
- `preferencia_local.lectura_ampliada` → escala de texto y espaciado ampliados en fichas del método (REQ-05).
- Previsualización (estado en memoria) → `Aplicar` escribe `preferencia_local` y propaga en caliente; salir sin aplicar no escribe ni revierte nada persistido (REQ-02).
- `tokens.v1.json` → `tokens.g.dart` → `TaoAppColors` → tema → splash siguiente lee lo guardado (REQ-07).

---

## 8. Migración y compatibilidad

- **Sin migración de datos de usuario.** Todo es local por dispositivo y el almacén ya existe.
- **Claves previas intactas:** `tema` y `movimiento_reducido` conservan nombre y formato. HU-01-07 sigue funcionando sin cambios. Una versión previa de la app que ignore `contraste_aumentado` y `lectura_ampliada` simplemente no las lee.
- **Claves nuevas aditivas:** al no existir, devuelven su default (`false`), equivalente a la paleta clara base y a tipografía normal. La actualización es retrocompatible en ambos sentidos.
- **Versionado — opciones:**
  - **A (recomendada):** mantener claves planas y estables, con un atributo `version` por clave documentado y resuelto por el normalizador. Un cambio de forma incompatible crea una clave nueva; la vieja queda desconocida → default. No rompe `movimiento_reducido`.
  - **B:** prefijar todas las claves con la versión de esquema (`v1.`). Da versionado explícito en el nombre, pero obliga a renombrar `movimiento_reducido` y a tocar HU-01-07; se descarta por acoplamiento y por contradecir "escribir la preferencia que lee HU-01-07".
- **Rollback:** desactivar/eliminar las claves nuevas y revertir el juego de tokens **junto con su Dart generado** (no dejar una paleta parcialmente aplicada), según el rollback declarado del ticket. No se pierden `tema` ni `movimiento_reducido`.
- **Sincronización:** ninguna clave de esta historia viaja por el canal de sync; iniciar sesión o sincronizar una consulta no las sobrescribe (REQ-06).

---

## 9. Trazabilidad REQ → elementos del modelo

| REQ | Elemento de datos |
|---|---|
| REQ-01 | `preferencia_local` (claves) + `color.semantic.highContrast` (selección por tema). |
| REQ-02 | Previsualización como estado en memoria; sin entidad persistida. |
| REQ-03 | Clave `movimiento_reducido`; combinación con `MediaQuery.disableAnimations`. |
| REQ-04 | Grupo `color.semantic.highContrast`; segunda paleta `TaoAppColors`. |
| REQ-05 | Clave `lectura_ampliada`; reutiliza `typography.style` con escala/espaciado ampliados. |
| REQ-06 | Campos `clave`/`valor`/`version`; default ante clave desconocida; sin sync. |
| REQ-07 | `preferencia_local` persistida; lectura en splash. |
| REQ-08 | Propagación en caliente de las claves; sin nueva entidad. |
| REQ-09 | Reutiliza tema de HU-01-01, servicio de HU-01-07 y resolvedor de imágenes; no crea equivalentes. |
| REQ-10 | Fondo de familia Cuenta: asset `v-27-cuenta.png` vía resolvedor de imágenes (no es entidad de datos nueva). |
| REQ-11 | Estado anunciado de los controles; escala 200 % sobre `typography.style`. |
| — | `board.highContrast` (escala estrecha + patrones, DEC-188): definido aquí, consumido por EP-07. |