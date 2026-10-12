# Guía de implementación: Spike de rendimiento del tablero procedural (TAO-259 · HU-07-01)

## 0. Contexto y alcance

- **Qué se construye**: (1) un prototipo de medición (pantalla única, teléfono vertical y tablet horizontal) para el spike V-32 y (2) la vista del documento de resultados del spike.
- **Sin guía visual propia**: el tablero usa trazos neutros para medir rendimiento, no la estética de producción (HU-07-02).
- **Referencias**: HU-07-01, GH-174, EP-07 · M1a · P0, DEC-167, DEC-074, DEC-186, DEC-198. Doc 44 §14 (plan de reproducción) y §19 (estrategias de pintado).
- **Regla de textos**: todo texto visible sale de l10n (`no_hardcoded_ui_text`). Los textos de esta guía son las claves de contenido es-ES a registrar. Los números usan coma decimal (`3,1 ms`).
- **Banner permanente de provisionalidad** (Adenda 1) y pill **Provisional** en toda barra de app.

## 1. Tokens de diseño

### Entorno claro (documento y banner)
| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#f4f2ee` | fondo de página |
| `--surface` | `#ffffff` | tarjetas, tags |
| `--ink` | `#1d1b18` | texto |
| `--muted` | `#6b665e` | texto secundario |
| `--line` | `#d9d4cb` | bordes |
| `--accent` | `#3b5bdb` | acento, decisión |
| `--ok` | `#2b8a3e` | cumple |
| `--warn` | `#b7791f` | advertencia, fallback |
| `--err` | `#c92a2a` | no cumple |

### Pantalla del dispositivo (oscuro)
| Token | Valor |
|---|---|
| `--dev-bg` | `#16161a` |
| `--dev-surface` | `#202027` |
| `--dev-ink` | `#ecebf2` |
| `--dev-muted` | `#9a99a8` |
| `--dev-line` | `#34343e` |
| `--grid` | `#5a5a68` |
| `--trail` | `#e0b44c` |
| `--trail-old` | `#e0b44c55` (mismo ámbar, alfa 33 %) |
| `--yin` | `#ecebf2` |

Otros colores fijos: provisional `#e0b44c` (borde `#e0b44c88`); error texto `#ff8787`; ok texto `#8ce99a`; fases de la barra de plan: construcción `#5c7cfa`, historial `#e0b44c66`, recientes `#e0b44c`; segmento deshabilitado `#5c5b68`.

### Tipografía
- UI: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, 14 px / 1,45 en la página.
- Monoespaciada (HUD y valores de `kv`): `ui-monospace, Menlo, monospace`.
- Tamaños en dispositivo: título de app 14/600; subtítulo 10; etiqueta `lbl` 10 mayúsculas con tracking .05em; botones 13; segmento 12; alertas 11; `kv` 11; HUD 10 (line-height 1,35); toggles k 9 / v 11/600.

### Radios y espacios
Pantalla teléfono 26 px, marco 34 px (padding 10); tablet marco 26 px (padding 12), pantalla 16 px; cards 12; alertas, segmentos, toggles, plan 8; botones 10; pill y tags 999. Gap vertical del cuerpo 8; padding del cuerpo `10 12`.

## 2. Estructura de la pantalla del prototipo

Orden vertical en teléfono (300 × 620 px de marco, pantalla en columna):

1. **Barra de estado** (22 px): hora a la izquierda, `Emulador · Android 8.0` o `Simulador · iOS 15` a la derecha (11 px, `--dev-muted`). Es información de entorno real del dispositivo, no un componente decorativo.
2. **AppBar**: título `Spike tablero` + subtítulo de estado (varía por estado) a la izquierda; pill `Provisional` a la derecha. Borde inferior `--dev-line`.
3. **Cuerpo** (`flex:1`, columna, gap 8, `overflow:hidden`):
   1. Etiqueta `Pasos del rastro` + **selector segmentado** `1 | 8 | 20 | 100`.
   2. **Toggles de estrategia** (grilla 2 columnas): `Retícula` y `Rastro`.
   3. **Tablero** 236 × 236, centrado.
   4. Zona de estado (mensaje vacío, alerta o barra de plan según el estado).
   5. **Plan de reproducción** (barra o progreso o tabla `kv`).
   6. **CTA** anclada al fondo (`margin-top:auto`).

No todos los estados muestran todos los bloques; ver sección 4.

## 3. Componentes

### 3.1 `ProvisionalPill`
Pill 10 px, borde y texto `#e0b44c`. Texto: `Provisional`. Siempre visible en AppBar.

### 3.2 `StepSelector` (segmentado)
- 4 opciones fijas: `1`, `8`, `20`, `100`. Una activa (`on`: fondo `--accent`, texto blanco).
- Opciones inactivas: texto `--dev-ink`; **deshabilitadas** (durante reproducción): texto `#5c5b68`, no interactivas. La opción activa se mantiene resaltada.
- Cambiar los pasos reinicia el plan mostrado y deja el estado en Reposo.

### 3.3 `StrategyToggle` (par de tarjetas)
Tarjeta con clave (`k`, 9 px, muted) y valor (`v`, 11 px, 600). Dos tarjetas:
- `Retícula`: `Cacheada (RepaintBoundary)` | `Repintado completo`.
- `Rastro`: `Por segmentos` | `Único trazo`.

Combinaciones comparadas (doc 44 §19): cacheada+segmentos (referencia), cacheada+único trazo, completo+segmentos. Durante la reproducción el bloque se atenúa (`opacity:.55`) y no se puede cambiar.
La maqueta muestra solo el valor activo; el mecanismo para alternar (tap que cicla o selector) no está dibujado. Se debe implementar como tap sobre la tarjeta que alterna entre las dos opciones, y reportarlo al diseñador para confirmación.

### 3.4 `Board` (tablero)
- Contenedor 236 × 236 (teléfono) y 420 × 420 (tablet), centrado; el SVG ocupa 100 %.
- Capas, de abajo hacia arriba:
  1. **Retícula** (DEC-074): viewBox 300×300, centro (150,150). 12 sectores (líneas radiales cada 30°, de r=39/111 hasta r≈140), 8 anillos (r = 140, 127,4, 114,8, 102,1, 89,5, 76,9, 64,3, 51,6) a trazo 1 `--grid`, corona interior (r=39, discontinua `3 3`) y banda de la corona (r=45,3, trazo 6, opacidad .35), círculo central r=26 con relleno `--dev-bg` y borde `--yin`, símbolo yin-yang (semicírculos r=13 y puntos r=3,5 uno `--yin` en (150,137), otro `--dev-bg` en (150,163)). Zona de exclusión central: no se pinta rastro dentro de r≈39.
  2. **Rastro antiguo** (`trail-old`): pasos agrupados por fundido, trazo 3, `--trail-old`, punta redonda.
  3. **Rastro reciente** (`trail-recent`): los 8 pasos más recientes, individuales, trazo 3,5 `--trail`; opacidad creciente de .55 a 1 del más antiguo al más nuevo; punto final r=5 en la posición actual.
  4. **Reproducción parcial** (`trail-partial`): historial parcial en `--trail-old` y el segmento en curso en `--trail` con punto r=5.
- **Regla de agrupado**: con 100 pasos, 92 se agrupan por fundido y 8 quedan individuales. Segmento mínimo antes del agrupado: 60 ms.
- Estado `dim` (`opacity:.55`) en error.
- **Implementación**: la maqueta usa SVG solo como representación. En Flutter debe ser `CustomPainter` en dos capas independientes: retícula dentro de `RepaintBoundary` (estrategia cacheada) y rastro en otra capa. La geometría vive en un módulo puro, independiente del renderer (DEC-074). La geometría del rastro de la maqueta es ilustrativa; la real sale del módulo de dominio.

### 3.5 `MeasurementHud`
Caja superpuesta al tablero (`top:4, left:4`), fondo `#000a`, borde `--dev-line`, radio 6, padding `4 6`, monoespaciada 10 px. Valores en `--ok`-texto (`#8ce99a`, bueno) o `#ff8787` (malo). Variantes según contexto:
- Reproduciendo: `build p90 3,1 ms` · `raster p90 6,8 ms` · `lentos 2 · mem 142 MB`.
- Quieto con retícula cacheada: `retícula repintada 0` · `rastro repintado 0` (ambos buenos).
- Quieto con repintado completo: `retícula repintada 38` · `raster p90 12,4 ms` (ambos malos).
- En tablet el HUD no se superpone: pasa a bloque estático en la columna lateral (`.t-side .hud` en `position:static`, fondo `--dev-surface`). En la maqueta de tablet el HUD no aparece dibujado; ver sección 7.

Criterio de color: bueno si cumple el umbral (p90 < 16,7 ms; repintados = 0), malo en otro caso.

### 3.6 `PlanPanel` (plan de reproducción, doc 44 §14)
Tarjeta `--dev-surface`, borde `--dev-line`, radio 8, padding `6 8`. Tres formas:
- **Barra de plan**: etiqueta `Plan de reproducción · N pasos`; barra de 10 px con tres tramos proporcionales (construcción `#5c7cfa`, historial `#e0b44c66`, recientes `#e0b44c`); leyenda de tres textos distribuidos (9 px muted). Teléfono 20 pasos: anchos 14 / 40 / 46 %, leyenda `Construcción 600 ms`, `Historial 1600 ms`, `8 recientes`. Tablet 100 pasos: 13 / 36 / 51 %, leyenda `Construcción`, `92 agrupados por fundido`, `8 individuales`. Los anchos son proporcionales a la duración real calculada por la lógica de duración, no valores fijos.
- **Progreso**: etiqueta `Grabando traza de timeline · 1180 / 2840 ms`; barra de 4 px con relleno `--accent` (42 % en la maqueta, igual a transcurrido/total); leyenda `Fase: historial comprimido` a la izquierda y `paso 9 de 20` a la derecha.
- **Tabla `kv`**: grilla 2 columnas (etiqueta / valor), valores monoespaciados y alineados a la derecha, gap `2 10`.

Presupuestos de duración: `boardHistoryBudget` 1600 ms, `boardReplayMax` 4500 ms, segmento mínimo 60 ms.

### 3.7 `Alert`
Radio 8, padding `8 10`, 11 px. Variantes: `err` (fondo `#c92a2a22`, borde `#c92a2a88`, título `#ff8787`), `info` (`#3b5bdb22` / `#3b5bdb88`), `ok` (`#2b8a3e22` / `#2b8a3e88`, título `#8ce99a`). Título en negrita seguido del cuerpo.

### 3.8 `ActionBar` (CTA)
Fila al fondo, gap 6. Botón: flex 1, radio 10, borde `--dev-line`, fondo `--dev-surface`, 13 px, padding vertical 9. `primary`: fondo y borde `--accent`, texto blanco, 600. Deshabilitado: `opacity:.45`.

### 3.9 `BottomSheet` (panel de prueba)
Anclado abajo, radio superior 18, fondo `--dev-surface`, borde superior `--dev-line`, sombra `0 -8px 24px #0008`, padding `10 14 16`. Asa (grab) 36×4 centrada. Detrás, `scrim` a pantalla completa `#0007`. Título `Panel de prueba` (13/600).

## 4. Estados del prototipo en teléfono

### A. Reposo (vacío)
- Entorno: `Emulador · Android 8.0`. AppBar subtítulo `Prototipo V-32`.
- Selector con `20` activo (valor inicial de la maqueta); toggles `Cacheada (RepaintBoundary)` y `Por segmentos`.
- Tablero solo con retícula.
- Texto vacío centrado: `Aún no hay reproducciones. Elige los pasos y la estrategia, y pulsa Reproducir.`
- Plan: `Plan de reproducción · 20 pasos` con barra (`Construcción 600 ms`, `Historial 1600 ms`, `8 recientes`).
- CTA: `Reproducir` (primary) · `Correr ×3` (**deshabilitado** hasta que exista al menos una reproducción, ver sección 7).

### B. Reproduciendo (carga)
- AppBar subtítulo `Corrida 2 de 3 · 20 pasos`.
- Selector con todo deshabilitado salvo el activo resaltado; toggles atenuados.
- Tablero con retícula + `trail-partial`, y HUD en vivo (`build p90 3,1 ms`, `raster p90 6,8 ms`, `lentos 2 · mem 142 MB`).
- Progreso: `Grabando traza de timeline · 1180 / 2840 ms`, barra al 42 %, `Fase: historial comprimido`, `paso 9 de 20`.
- CTA: solo `Detener` (secundario).

### C. Completado (100 pasos)
- Subtítulo `Reproducción terminada`. Selector con `100` activo. Sin toggles.
- Tablero con retícula + `trail-old` + `trail-recent`, sin HUD.
- Alert `ok`: **`Dentro del presupuesto.`** `4480 ms de 4500 ms. 92 pasos agrupados por fundido, 8 individuales.` (si excede `boardReplayMax`, variante `err` con el texto equivalente: ver sección 7).
- Tabla `kv`: `build p50 / p90 / p99` = `2,4 / 3,9 / 7,2 ms`; `raster p50 / p90 / p99` = `5,1 / 8,6 / 14,9 ms`; `Frames lentos (>16,7 ms)` = `3 de 269`; `Segmento mínimo antes del agrupado` = `60 ms`; `Memoria pico` = `151 MB`.
- CTA: `Guardar artifact` · `Repetir` (primary).

### D. Error de medición
- Entorno `Simulador · iOS 15`. Subtítulo `Prototipo V-32`. Selector con `8` activo.
- Tablero atenuado (`dim`) con retícula + `trail-partial`.
- Alert `err`: **`No se pudo guardar la traza de timeline.`** salto de línea `El simulador de iOS no expone el modo profile. Los tiempos de frame de esta corrida no se registran; la duración total sí (1420 ms).`
- Alert `info`: `La corrida queda marcada como incompleta en el artifact.`
- CTA: `Ver detalle` · `Reintentar` (primary).

### E. Vuelta de segundo plano (QA-07-01-03)
- Subtítulo `Reproducción interrumpida`. Selector `20` activo.
- Tablero con retícula + `trail-partial` (el rastro se conserva).
- Alert `info`: `La app pasó a segundo plano durante la reproducción. Se detuvo y se descartó la corrida.`
- Tabla `kv`: `AnimationController activos` = `0`; `Ticker activos` = `0`; `Estado del rastro` = `conservado (paso 9)`.
- CTA: `Reproducir de nuevo` (primary).
- Comportamiento: observar el ciclo de vida de la app (`paused`/`inactive`), detener y hacer `dispose` de los controladores, descartar la corrida y mostrar este estado. Los contadores son reales (no fijos en 0).

### F. Panel abierto, tablero quieto
- AppBar subtítulo `100 pasos · quieto`. Cuerpo con selector (100 activo) y tablero con rastro completo y HUD `retícula repintada 0` / `rastro repintado 0`.
- Scrim sobre la pantalla y bottom sheet `Panel de prueba` con `kv`: `Repintados de retícula desde que se abrió` = `0`; `Repintados al desplazar la pantalla` = `0`; `Estrategia de retícula` = `cacheada`.
- Alert `ok`: **`Retícula estable.`** `La capa con RepaintBoundary no se repintó.`
- CTA: `Cerrar panel`.
- Verifica: el contador de repintados de la retícula no cambia al abrir el panel ni al desplazar.

### G. Comparación: repintado completo
- Subtítulo `100 pasos · quieto`. Toggles visibles: `Retícula: Repintado completo`, `Rastro: Único trazo`.
- Tablero con HUD en rojo: `retícula repintada 38` / `raster p90 12,4 ms`.
- Alert `err`: **`La retícula se repinta al desplazar.`** `Con esta estrategia no se cumple el criterio; queda como referencia en la tabla.`
- CTA: `Volver a cacheada` (primary).

## 5. Tablet horizontal (estado completado, 100 pasos)

- Marco 900 px máx. × 560 px, pantalla en **fila** (`flex-direction:row`).
- **Columna izquierda** (`flex 1.25`, borde derecho `--dev-line`): AppBar (`Spike tablero`, subtítulo `Emulador · tablet Android 8.0 · 1280×800`, pill `Provisional`) + tablero de 420 × 420 centrado.
- **Columna derecha** (`flex 1`, padding `14 16`, gap 10), en orden: etiqueta `Pasos del rastro` + selector (`100` activo); toggles; plan `Plan de reproducción · 100 pasos` (13 / 36 / 51 %, leyenda `Construcción`, `92 agrupados por fundido`, `8 individuales`); alert ok `Dentro del presupuesto.` `4490 ms de 4500 ms.`; tabla `kv` (`build p50 / p90 / p99` `2,9 / 4,6 / 8,8 ms`; `raster p50 / p90 / p99` `6,3 / 10,2 / 17,4 ms`; `Frames lentos (>16,7 ms)` `6 de 270`; `Memoria pico` `188 MB`; `Repintados de retícula en reposo` `0`); CTA `Guardar artifact` · `Correr ×3` · `Repetir` (primary).
- Mismos estados que en teléfono con este layout. En pantallas angostas (≤640 px) la vista de tablet de la maqueta se oculta y aparece la nota `La vista de tablet se oculta en pantallas angostas.`; esto aplica solo a la página de revisión de la maqueta, no al prototipo.

## 6. Documento de resultados del spike (artifact)

Documento en fondo claro, `card` de ancho completo (borde `--line`, radio 12, padding 16).

1. **Título** (16 px): `Spike HU-07-01 · Rendimiento del tablero procedural`.
2. **Línea de estado** (12 px, muted): `Estado: cerrado con decisión PROVISIONAL · Fuente: integration_test + trazas de timeline · Artifact: results.json, trazas/*.json`.
3. **Grilla de metadatos** (`auto-fit`, mín. 220 px, gap 10), 4 celdas con borde y clave 11 px muted:
   - `Dispositivos y versiones`: `Emulador Android 8.0 (API 26, 2 GB) · Simulador iPhone SE iOS 15 · Emulador tablet 1280×800 horizontal`.
   - `Método`: `Modo profile en Android; 3 corridas por combinación; frames lentos por encima de 16,7 ms`.
   - `Umbral (provisional)`: `p90 build + raster por debajo de 16,7 ms y menos del 2 % de frames lentos, sobre el objetivo de 60 fps del doc 44 §19`.
   - `Presupuesto de duración`: `boardHistoryBudget 1600 ms · boardReplayMax 4500 ms · segmento mínimo 60 ms`.
4. **Tabla** (scroll horizontal, 12,5 px, `white-space:nowrap`, filas separadas por borde, encabezado `#f7f5f1`/600; columnas 1 y 2 alineadas a la izquierda, el resto a la derecha). Columnas: `Estrategia`, `Dispositivo`, `Pasos`, `build p50/p90/p99`, `raster p50/p90/p99`, `Lentos`, `Duración`, `Memoria`, `Umbral`. Celda `Umbral`: `Cumple` en `--ok`/600, `No cumple` en `--err`/600, `Solo duración` sin color. Filas:

| Estrategia | Dispositivo | Pasos | build | raster | Lentos | Duración | Memoria | Umbral |
|---|---|---|---|---|---|---|---|---|
| Cacheada + segmentos | Android | 1 | 1,1 / 1,6 / 2,4 | 2,2 / 3,0 / 4,1 | 0 | 600 ms | 128 MB | Cumple |
| Cacheada + segmentos | Android | 8 | 1,6 / 2,3 / 3,9 | 3,4 / 4,9 / 7,8 | 0 | 1560 ms | 131 MB | Cumple |
| Cacheada + segmentos | Android | 20 | 2,0 / 3,1 / 5,6 | 4,2 / 6,8 / 11,3 | 2 | 2840 ms | 142 MB | Cumple |
| Cacheada + segmentos | Android | 100 | 2,4 / 3,9 / 7,2 | 5,1 / 8,6 / 14,9 | 3 | 4480 ms | 151 MB | Cumple |
| Cacheada + único trazo | Android | 100 | 2,2 / 3,5 / 6,9 | 6,0 / 11,8 / 19,6 | 9 | 4480 ms | 149 MB | No cumple |
| Completo + segmentos | Android | 100 | 3,8 / 6,1 / 11,0 | 8,9 / 12,4 / 22,7 | 14 | 4480 ms | 156 MB | No cumple |
| Cacheada + segmentos | Tablet | 100 | 2,9 / 4,6 / 8,8 | 6,3 / 10,2 / 17,4 | 6 | 4490 ms | 188 MB | Cumple |
| Cacheada + segmentos | iOS (simulador) | 100 | sin datos | sin datos | sin datos | 4480 ms | sin datos | Solo duración |

5. **Nota QA** (12 px, muted, margen superior 10): `QA-07-01-01 · 20 pasos ×3 en Android: 2840 / 2838 / 2841 ms; memoria 142 / 142 / 143 MB, sin crecimiento entre corridas.`
6. **Bloque Decisión** (borde izquierdo 4 px `--accent`, fondo `#eef2ff`, radio `0 8 8 0`, padding `10 12`): `Decisión (PROVISIONAL):` + dos párrafos: `Se confirma DEC-167 con retícula cacheada en una capa con RepaintBoundary y rastro por segmentos. Las otras dos combinaciones quedan descartadas por frames lentos y repintado de la retícula.` / `La geometría queda en un módulo puro independiente del renderer (DEC-074), así que cambiar de renderer no toca el dominio.`
7. **Bloque Fallback** (borde izquierdo 4 px `--warn`, fondo `#fff8e6`): `Si en el Android de gama baja real ninguna estrategia alcanza el umbral:` + `1. Se elimina primero el fundido de los pasos antiguos (se dibujan con tono fijo). 2. Luego el resplandor de la corona interior. El estado y la posición del rastro no cambian.`
8. **Lista de notas** (muted, sangría 18): `Pendiente: repetir la medición en un Android de gama baja, un iPhone con la versión mínima y una tablet físicos antes de cerrar el umbral.` / `Enlaces: HU-07-01 (EP-07) · DEC-167 · Consumidores: HU-07-02, HU-07-06, HU-07-10.`

### H. Documento sin datos
Tarjeta vacía (borde discontinuo `--line`, radio 10, padding 18, texto centrado muted): `Todavía no hay resultados del benchmark. Corre integration_test con el perfil de rendimiento para generar results.json y las trazas de timeline.` (`integration_test` en `code`).

## 7. Interacciones y reglas

- **Reproducir**: pasa de A a B; bloquea selector y toggles; graba traza de timeline; avanza la barra de progreso y el HUD en vivo; al terminar va a C (o a D si falla el guardado de la traza).
- **Detener**: cancela, libera controladores y vuelve a Reposo (A).
- **Correr ×3**: encadena tres corridas con la misma configuración (subtítulo `Corrida n de 3 · N pasos`) y consolida p50/p90/p99.
- **Repetir**: reinicia la reproducción con la misma configuración.
- **Guardar artifact**: escribe `results.json` y `trazas/*.json`.
- **Reintentar / Ver detalle** (D): reintenta la corrida; el detalle muestra el error completo. Corrida en iOS: la duración se registra y el resto queda `sin datos`; la corrida se marca incompleta.
- **Panel de prueba**: se abre sobre un tablero quieto; cerrarlo vuelve al estado previo. Contadores de repintado deben mantenerse en 0 con la estrategia cacheada.
- **Volver a cacheada** (G): restaura `Cacheada (RepaintBoundary)` y limpia contadores.
- **Segundo plano**: ver estado E.

### Elementos que la maqueta no define (confirmar antes de construir)
1. Cómo se alternan los toggles de estrategia (propuesta: tap que cicla).
2. Habilitación de `Correr ×3` (la maqueta lo muestra deshabilitado solo en Reposo vacío y habilitado en tablet completada).
3. Variante de error de la alerta de presupuesto cuando se supera `boardReplayMax`.
4. Si el HUD se muestra en tablet durante la reproducción.
5. Acceso al `Panel de prueba` (no hay botón que lo abra en los estados mostrados).

## 8. Accesibilidad y responsive

- Contraste: los textos `#9a99a8` sobre `#16161a` son de apoyo (10 a 11 px); no usarlos para información crítica. Estados bueno/malo no dependen solo del color: llevan texto (`Cumple`/`No cumple`, títulos de alerta).
- Botones con área táctil mínima de 44 px de alto en dispositivo real; la maqueta usa 9 px de padding a escala de maqueta.
- Teléfono: orientación vertical, una columna. Tablet: orientación horizontal, tablero a la izquierda más grande.
- Todos los textos pasan por l10n; los números y las unidades se formatean con la configuración regional (coma decimal).

## 9. Checklist de verificación contra la maqueta

- [ ] AppBar con pill `Provisional` en los 8 estados de dispositivo.
- [ ] Retícula: 12 sectores, 8 anillos, corona discontinua, yin-yang, exclusión central.
- [ ] Rastro: 92 antiguos agrupados + 8 individuales con opacidad creciente.
- [ ] Selector y toggles bloqueados mientras se reproduce.
- [ ] Textos de A a H idénticos a los de esta guía.
- [ ] Retícula en `RepaintBoundary`: contador en 0 en el estado F.
- [ ] Contadores de controladores y tickers en 0 al volver de segundo plano (E).
- [ ] Documento: tabla, bloques de decisión y fallback, estado vacío.
- [ ] Layout tablet en dos columnas (1,25 / 1).