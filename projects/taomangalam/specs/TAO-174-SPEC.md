---
id: TAO-174-SPEC
project: taomangalam
ticket: TAO-174
status: approved
---

# Átomos del sistema de diseño: tipografía empaquetada, iconos, cinco variantes de botón y campo de texto

## Resumen ejecutivo

Se construyen los átomos de EP-01 sobre el tema ya generado (tokens.g.dart + TaoAppColors): fuentes OFL e iconos Material Symbols empaquetados con su licencia, los doce estilos de typography.style resueltos a esas familias, cinco variantes de botón con todos sus estados, el campo de texto con etiqueta persistente/ayuda/error, y la entrada de Widgetbook por átomo y estado.
NO se hacen moléculas (tarjetas, filas, chips, formularios compuestos: HU-01-04), ni selector de dados (EP-07), ni pictogramas ilustrados (EP-02); tampoco se regeneran ni se redefinen tokens a mano (salen de tool/generate_design_tokens.dart) ni se cambia la paleta de HU-01-01.
Se verifica con: widget tests de estados/semántica/área táctil, goldens por variante y estado en teléfono y tablet a 100 % y 200 %, prueba de contraste ≥3:1 del borde del campo sobre background y canvas, prueba de que loading no encola una segunda acción, y catálogo Widgetbook revisable por Diseño contra doc 43 §8 y la maqueta consolidada.
Tamaño estimado: 3 sesiones (una de fundación tipográfica/iconos, una de botones, una de campo), dentro del techo de 4.
ADVERTENCIA (fuera de alcance, no se implementa): si el token `border` ajustado por HU-01-01 no alcanza 3:1 sobre `canvas`, el fix del token es de HU-01-01, no de esta historia; aquí solo se reporta la medición fallida.

Datos a confirmar antes de ejecutar:
- Archivos de fuente exactos (nombres y pesos estáticos vs variable) de Zen Old Mincho 500/600/700, Spectral 400/500/600 e IBM Plex Mono 400/500/600, y la ruta destino dentro de `app/assets/` (doc 43 / DEC-230).
- Forma de empaquetado de Material Symbols (fuente de iconos vs SVG por icono) y lista cerrada de iconos operativos del alcance M0.
- Nombres literales de los tokens de interacción en `tokens.g.dart`: `scalePressed`, `fast`, `stroke.focus`, `touchMin`, radio `sm` y la opacidad 0.38 (confirmar en el JSON fuente de HU-01-01/HU-01-07 antes de codear; si alguno no existe, se agrega en el generador, no a mano).
- Versión de `widgetbook`/`widgetbook_annotation` ya declarada en `app/pubspec.yaml` y si el catálogo existe o se crea en esta historia.
- API del servicio de reducción de movimiento de HU-01-07 que consume el estado pressed.
- Ruta de la maqueta `navegacion-y-acciones/maqueta-direccion-consolidada.png` dentro del repo para la comparación de Diseño (DEC-235).

## Requirements

### REQ-01 `inferred`
> Fuente: app/pubspec.yaml

Las fuentes Zen Old Mincho (500/600/700), Spectral (400/500/600) e IBM Plex Mono (400/500/600) viven en `app/assets/` con su licencia OFL junto a los archivos y se declaran en `app/pubspec.yaml`; la app no descarga fuentes en tiempo de ejecución y cae a la familia de sistema si falta un peso.

### REQ-02 `confirmed`
> Fuente: app/lib/design_system/typography.dart:7

`typography.dart` expone los doce estilos de `typography.style` (Display L 40/44 hasta Meta 12/16 y Number L 40/40) resueltos a las familias empaquetadas, con cifras tabulares (`FontFeature.tabularFigures`) en los estilos de dato variable.

### REQ-03 `inferred`
> Fuente: app/assets/manifest.json:42

Los iconos operativos de Material Symbols se empaquetan localmente con su licencia Apache 2.0 en el repositorio y se consumen por un átomo de icono que dibuja en caja de 24 y exige etiqueta accesible.

### REQ-04 `confirmed`
> Fuente: app/lib/design_system/app_theme.dart:45

Existen cinco variantes de botón (Primario, Secundario, Terciario, Destructivo e Icono) con forma y color derivados de tokens: Primario con fondo `actionPrimary`, texto `actionPrimaryText`, estilo `labelLarge`, alto mínimo 48 y radio `sm`; Destructivo con `error` y sin `brand`; Icono con área táctil mínima 44×44, etiqueta semántica y tooltip.

### REQ-05 `confirmed`
> Fuente: app/lib/design_system/tokens/tokens.g.dart:80

Cada botón resuelve sus estados: pressed escala a 0.985 durante 120 ms (`scalePressed`, `fast`) y con movimiento reducido cambia solo la superficie; foco de teclado o lector dibuja contorno exterior de 3 px (`stroke.focus`) con color `focus`; disabled usa opacidad 0.38, no ejecuta la acción y se anuncia como no disponible; loading conserva su etiqueta junto al indicador y no encola una segunda acción; success se muestra donde corresponda.

### REQ-06 `confirmed`
> Fuente: app/lib/design_system/app_theme.dart:39

El campo de texto dibuja etiqueta persistente sobre el campo, texto de ayuda y mensaje de error: alto mínimo 48, separación etiqueta-campo de 8, el placeholder no reemplaza la etiqueta, el error aparece debajo con icono y texto en 180 ms sin sacudida, y el borde sin foco alcanza al menos 3:1 de contraste sobre `background` y `canvas`.

### REQ-07 `inferred`
> Fuente: app/pubspec.yaml

Widgetbook tiene una entrada por átomo y estado (tipografía, iconos, cinco variantes de botón y campo) en teléfono y tablet, con caso de texto largo y escala de texto 200 %, sin truncar ni superponer etiquetas en 360×800.

### REQ-08 `confirmed` `enforcement`
> Fuente: app/lib/design_system/app_theme.dart:14

Todo átomo consume únicamente tokens generados (color, tipografía, espacio, radio, trazo, tamaño y movimiento) a través del contrato `AppThemeData`/`TaoAppColors`, sin literales de color, tamaño ni duración sueltos en su implementación.

### REQ-09 `confirmed` `enforcement`
> Fuente: app/tool/generate_design_tokens.dart:380

Los átomos reusan lo ya integrado en la rama acumuladora: `typography.dart`, `app_theme.dart` (`AppThemeData`, `TaoAppColors`), `tokens.g.dart` y el generador `tool/generate_design_tokens.dart`; no se redefine la paleta, no se edita `tokens.g.dart` a mano y cualquier token faltante se agrega en el generador y se regenera.
## Tasks

#### S1.T1 — Empaquetar las fuentes en `app/assets/` (Zen Old Mincho 500/600/700, Spectral 400/500/600, IBM Plex Mono 400/500/600), dejar el archivo de licencia OFL junto a ellas y declarar las tres familias con sus nueve pesos en `app/pubspec.yaml`, con respaldo de familia de sistema. Confirmar antes los nombres de archivo reales (ver 'Datos a confirmar').
Contrato: rollback: Revertir `app/pubspec.yaml` y borrar el directorio de fuentes agregado; la app vuelve a la familia de sistema.. Status: done

#### S1.T2 — Mapear en `app/lib/design_system/typography.dart` los doce estilos de `typography.style` (Display L 40/44 … Meta 12/16, Number L 40/40) a las familias empaquetadas, con `FontFeature.tabularFigures` en los estilos de dato variable (Number L y los de dato numérico), leyendo tamaños e interlineados de `tokens.g.dart` sin literales.
Contrato: rollback: Revertir `typography.dart` al estado de la rama acumuladora (estilos sin familia explícita).. Status: done

#### S1.T3 — Empaquetar los iconos operativos de Material Symbols localmente con su licencia Apache 2.0 y crear el átomo de icono en `app/lib/design_system/atoms/` que dibuja en caja de 24, con trazo 1.75–2 y `semanticLabel` obligatorio (assert en debug), tomando el color del contrato `AppThemeData`.
Contrato: rollback: Borrar el átomo de icono y los assets/licencia agregados; ningún consumidor existe aún.. Status: done

#### S1.T4 — Agregar al catálogo de Widgetbook la sección de átomos con los casos de tipografía (doce estilos, texto largo) e iconos, en teléfono y tablet y con escala de texto 100 % y 200 %.
Contrato: rollback: Quitar los casos de Widgetbook agregados; el catálogo vuelve a su estado previo.. Status: done

#### S1.T5 — Tests y regresión de la fundación: prueba del manifiesto de fuentes (familias y pesos declarados existen en disco, licencias presentes, sin resolución por red), prueba de los doce estilos (tamaño, interlineado, familia, cifras tabulares), prueba de semántica y caja del átomo de icono, y verificación de que `tokens.g.dart` regenerado no difiere del versionado.
Contrato: rollback: Borrar los archivos de test agregados.. Status: done

#### S2.T1 — Construir las cinco variantes de botón en `app/lib/design_system/atoms/` sobre una base común que resuelve forma y color desde tokens (doc 43 §8). Esta task no se ejecuta directamente: se completa con sus subtasks.
Contrato: rollback: Borrar el directorio de botones agregado; no hay consumidores todavía.. Status: done

#### S2.T1.1 — Base compartida del botón: API (etiqueta, icono opcional, `onPressed`, estado), alto mínimo 48, radio `sm`, estilo `labelLarge` y lectura de la paleta vía `Theme.of(context).extension<TaoAppColors>()`, sin literales.
Contrato: rollback: Borrar el archivo base; las variantes aún no existen.. Status: done

#### S2.T1.2 — Variantes Primario, Secundario y Terciario: Primario con fondo `actionPrimary` y texto `actionPrimaryText`; Secundario sobre `actionSecondary`; Terciario sin relleno con borde/texto de token, manteniendo alto 48 y radio `sm`.
Contrato: rollback: Borrar las tres variantes y conservar solo la base.. Status: done

#### S2.T1.3 — Variante Destructivo con el color `error` y verificación explícita de que no referencia el color `brand`.
Contrato: rollback: Borrar la variante Destructivo.. Status: done

#### S2.T1.4 — Variante Icono: área táctil mínima 44×44 (`touchMin`), etiqueta semántica obligatoria y tooltip, reusando el átomo de icono de la sesión anterior.
Contrato: rollback: Borrar la variante Icono; el átomo de icono queda intacto.. Status: done

#### S2.T2 — Implementar los estados de los botones: pressed escala 0.985 en 120 ms (`scalePressed`, `fast`) consumiendo el servicio de reducción de movimiento de HU-01-07 (con movimiento reducido solo cambia la superficie); foco con contorno exterior de 3 px (`stroke.focus`) y color `focus`; disabled con opacidad 0.38, sin ejecutar la acción y anunciado como no disponible; loading que conserva la etiqueta junto al indicador e ignora toques adicionales; success donde corresponda. Esta task no se ejecuta directamente: se completa con sus subtasks.
Contrato: rollback: Revertir el controlador de estados a un botón sin animación ni loading; las variantes siguen dibujándose.. Status: done

#### S2.T2.1 — Modelo de estado del botón: enumerar default, pressed, focus, disabled, loading y success en un tipo único y cablearlo a la base compartida, de modo que cada variante reciba el estado vigente sin duplicar lógica.
Contrato: rollback: Quitar el tipo de estado y dejar la base con solo enabled/disabled.. Status: done

#### S2.T2.2 — Estado pressed: escala 0.985 durante 120 ms leyendo `scalePressed` y `fast` de `tokens.g.dart`, consumiendo el servicio de reducción de movimiento de HU-01-07; con movimiento reducido no se anima la escala y cambia solo la superficie.
Contrato: rollback: Quitar la animación de escala; el botón responde al toque sin transformación.. Status: done

#### S2.T2.3 — Estado focus: contorno exterior de 3 px (`stroke.focus`) con color `focus` dibujado fuera del borde del botón, visible con foco de teclado y con lector de pantalla, sin alterar el tamaño de layout de la variante.
Contrato: rollback: Quitar el contorno de foco; el botón vuelve al indicador de foco por defecto de Flutter.. Status: done

#### S2.T2.4 — Estado disabled: opacidad 0.38 desde token, el callback no se invoca y la semántica expone `enabled: false` para que el lector lo anuncie como no disponible.
Contrato: rollback: Quitar el tratamiento de disabled; el botón usa el deshabilitado por defecto del framework.. Status: done

#### S2.T2.5 — Estado loading: indicador junto a la etiqueta (la etiqueta permanece visible) y bloqueo de la acción mientras dura, de modo que un segundo toque no encola ni ejecuta una segunda llamada al callback.
Contrato: rollback: Quitar el estado loading; el botón queda siempre accionable.. Status: done

#### S2.T2.6 — Estado success: la confirmación reemplaza al indicador sin alterar el ancho del botón, respetando la reducción de movimiento, y se aplica solo a las variantes donde el estado corresponde.
Contrato: rollback: Quitar el estado success; loading vuelve directo a default.. Status: done

#### S2.T3 — Agregar a Widgetbook una entrada por variante de botón y por estado (default, pressed, focus, disabled, loading, success donde aplique) en teléfono y tablet, incluyendo el caso de etiqueta de 60 caracteres con escala de texto 200 % en 360×800. Esta task no se ejecuta directamente: se completa con sus subtasks.
Contrato: rollback: Quitar los casos de botón del catálogo.. Status: done

#### S2.T3.1 — Casos base del catálogo: una entrada por cada una de las cinco variantes de botón en estado default, agrupadas bajo la sección de átomos ya creada en la sesión de fundación.
Contrato: rollback: Quitar las cinco entradas de botón del catálogo.. Status: done

#### S2.T3.2 — Variación por estado: cada entrada expone pressed, focus, disabled, loading y success (donde aplique) como knobs o casos separados, de modo que Diseño pueda recorrer todos los estados sin tocar código.
Contrato: rollback: Dejar solo el estado default en cada entrada.. Status: done

#### S2.T3.3 — Dispositivos y escala: teléfono y tablet con escala de texto 100 % y 200 % aplicadas a las entradas de botón, usando los mismos addons de la sección de átomos.
Contrato: rollback: Dejar las entradas con el dispositivo y la escala por defecto.. Status: done

#### S2.T3.4 — Caso de texto largo: etiqueta de 60 caracteres en 360×800 con escala 200 %, verificable a ojo en el catálogo, que no trunca ni superpone (QA-01-03-03).
Contrato: rollback: Quitar el caso de texto largo del catálogo.. Status: done

#### S2.T4 — Tests y regresión de botones: widget tests de variantes (colores desde tokens, alto 48, radio `sm`, Destructivo sin `brand`), de estados (escala y duración, contorno de foco de 3 px, disabled sin callback y `enabled:false`, doble toque en loading con un solo callback), área táctil 44×44 del botón Icono, prueba estática de ausencia de literales, y goldens por variante/estado en teléfono y tablet a 100 % y 200 %. Esta task no se ejecuta directamente: se completa con sus subtasks.
Contrato: rollback: Borrar los tests y goldens agregados.. Status: done

#### S2.T4.1 — Widget tests de variantes: Primario con fondo `actionPrimary`, texto `actionPrimaryText` y `labelLarge`; alto ≥48 y radio `sm` en las cinco; Destructivo con `error` y sin ninguna referencia a `brand`; Secundario y Terciario distinguidos por `actionSecondary` y `border`.
Contrato: rollback: Borrar `tao_button_variants_test.dart`.. Status: done

#### S2.T4.2 — Widget tests de estados: escala 0.985 en 120 ms y sin escala con movimiento reducido, contorno de foco de 3 px con color `focus`, disabled sin invocar el callback y con `enabled:false` en la semántica, y doble toque rápido en loading que ejecuta el callback una sola vez conservando la etiqueta (QA-01-03-01, QA-01-03-02).
Contrato: rollback: Borrar `tao_button_states_test.dart`.. Status: done

#### S2.T4.3 — Test del botón Icono: área táctil medida de al menos 44×44, etiqueta semántica presente en el árbol de accesibilidad y tooltip expuesto.
Contrato: rollback: Borrar `tao_icon_button_test.dart`.. Status: done

#### S2.T4.4 — Prueba estática de tokens: recorrer los archivos de los átomos de botón y fallar si aparece `Color(0x`, `Colors.` o un literal numérico de duración fuera de los tokens, reportando archivo y línea.
Contrato: rollback: Borrar el test estático de literales.. Status: done

#### S2.T4.5 — Goldens de botones: una imagen por variante y estado en teléfono y tablet a escala 100 % y 200 %, generadas y versionadas, con la corrida comparando contra la referencia.
Contrato: rollback: Borrar los goldens y el test que los compara.. Status: done

#### S2.T4.6 — Regresión del tema: confirmar que `app_theme_test.dart` y las pruebas de HU-01-07 siguen verdes y que `tokens.g.dart` regenerado no difiere del versionado tras los cambios de la sesión.
Contrato: rollback: No aplica: es una verificación, no deja artefactos.. Status: done

#### S3.T1 — Construir el campo de texto en `app/lib/design_system/atoms/`: etiqueta persistente sobre el campo (el placeholder no la reemplaza), texto de ayuda, alto mínimo 48, separación etiqueta-campo de 8 y borde desde el token `border` del contrato `AppThemeData`.
Contrato: rollback: Borrar el campo agregado; no hay consumidores aún.. Status: done

#### S3.T2 — Implementar el estado de error del campo: mensaje debajo con icono y texto, transición de 180 ms sin desplazamiento horizontal (sin sacudida) y respetando la reducción de movimiento; el estado se comunica por texto e icono además del color.
Contrato: rollback: Revertir el campo a su versión sin estado de error animado.. Status: done

#### S3.T3 — Agregar a Widgetbook los casos del campo (default, foco, ayuda, error, deshabilitado, texto largo) en teléfono y tablet con escala 100 % y 200 %, y dejar la sección de átomos completa para la revisión de Diseño contra doc 43 §8 y `maqueta-direccion-consolidada.png`.
Contrato: rollback: Quitar los casos del campo del catálogo.. Status: done

#### S3.T4 — Tests y regresión del campo: etiqueta y placeholder coexistentes, alto ≥48 y separación 8 medidos, error con icono y duración 180 ms sin variación de posición horizontal, prueba de contraste por luminancia del token `border` contra `background` y `canvas` (≥3.0:1, falla con el valor medido en el mensaje), y goldens del campo en teléfono y tablet a 100 % y 200 %.
Contrato: rollback: Borrar los tests y goldens agregados.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: Existen cinco variantes de botón (Primario, Secundario, Terciario, Destructivo e Icono) con forma y color derivados de tokens: Primario con fondo `actionPrimary`, texto `actionPrimaryText`, estilo `labelLarge`, alto mínimo 48 y radio `sm`; Destructivo con `error` y sin `brand`;
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: Cada botón resuelve sus estados: pressed escala a 0.985 durante 120 ms (`scalePressed`, `fast`) y con movimiento reducido cambia solo la superficie; foco de teclado o lector dibuja contorno exterior de 3 px (`stroke.focus`) con color `focus`; disabled usa opacidad 0.38, no ejec
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
3. **Qué:** Verificar en runtime: Widgetbook tiene una entrada por átomo y estado (tipografía, iconos, cinco variantes de botón y campo) en teléfono y tablet, con caso de texto largo y escala de texto 200 %, sin truncar ni superponer etiquetas en 360×800.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: En Widgetbook, la sección de átomos muestra los doce estilos de `typography.style` dibujados con las fuentes empaquetadas y la galería de iconos en caja de 24 con etiqueta accesible; los archivos de licencia OFL y Apache 2.0 están en `app/` junto a los assets y la app no pide red.

### Session 2 · T3 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T1.4
- [x] S2.T2
- [x] S2.T2.1
- [x] S2.T2.2
- [x] S2.T2.3
- [x] S2.T2.4
- [x] S2.T2.5
- [x] S2.T2.6
- [x] S2.T3
- [x] S2.T3.1
- [x] S2.T3.2
- [x] S2.T3.3
- [x] S2.T3.4
- [x] S2.T4
- [x] S2.T4.1
- [x] S2.T4.2
- [x] S2.T4.3
- [x] S2.T4.4
- [x] S2.T4.5
- [x] S2.T4.6

**Gate (auto)**: En Widgetbook, las cinco variantes de botón se recorren con teclado mostrando el contorno de foco de 3 px, el loading no duplica la acción al tocar dos veces, el deshabilitado se anuncia como no disponible, y los goldens de teléfono y tablet a 100 % y 200 % pasan.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: En Widgetbook, el campo de texto muestra etiqueta persistente, ayuda y error con icono en 180 ms sin sacudida, mide al menos 48 de alto con separación 8, y la prueba de contraste confirma que su borde alcanza ≥3:1 sobre `background` y `canvas`.

### Session 4 · T0 · continue
