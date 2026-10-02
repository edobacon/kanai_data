---
id: TAO-173-SPEC
project: taomangalam
ticket: TAO-173
status: approved
---

# Resolvedor de imágenes por familia, tamaño, orientación y tema con superficie de respaldo

## Resumen ejecutivo

Se construye un único punto de resolución de imágenes en `app/lib`: contrato por familia (`light.phonePortrait`, `light.tabletPortrait`, `light.tabletLandscape`, `dark.*` nulas en V1, `fallbackSurfaceToken`, `overlayToken`), selección de derivado por tamaño lógico/densidad con decodificación limitada, recorte `cover`/`contain` sin ampliar sobre el intrínseco, superficie de respaldo ante variante nula o falla de carga, lectura del manifiesto detrás de una interfaz propia alimentada por fixture en M0, semántica de accesibilidad, más los dos widgets de DEC-235 (capa de fondo a pantalla completa con opacidad 12-18 % e ilustración editorial sin marco). NO se hace: esquema/inventario del manifiesto (HU-02-02), derivados WebP (HU-02-03), descarga y caché (HU-02-09), fondos finales en tres composiciones (HU-02-08), ni variantes oscuras (DEC-196). Se verifica con: tests unitarios de selección y respaldo, widget tests de carga fallida y exclusión semántica, goldens de plantilla con fondo y con respaldo en teléfono y tablet, lint que falla ante `isDark` o rutas literales fuera del resolvedor, y los casos QA-01-02-01..05 incluida la aprobación visual en Widgetbook. Tamaño: 3 puntos, 2 sesiones (T2), dentro del techo de 4.

ADVERTENCIAS (fuera de alcance, no son requirements): (a) el manifiesto real `app/assets/manifest.json` tiene 64 entradas sin campo de estado y los fondos actuales son maestros 940/941 × 1672 aptos solo para maqueta, así que la fixture de M0 no puede prometer `light.tabletPortrait`/`light.tabletLandscape` reales: esas variantes se ejercitan como nulas y por eso el camino de respaldo es el observable principal en tablet; (b) el criterio de aceptación de la capa de fondo menciona "alineado al punto focal de la composición" mientras el alcance dice explícitamente que el resolvedor NO usa punto focal por familia: se implementa centrado por defecto, como dice el alcance; (c) un lint personalizado que prohíbe `isDark` y rutas literales puede marcar código preexistente de HU-01-01 fuera de este ticket.

Datos a confirmar antes de ejecutar:
- Nombre y tokens exactos de las 10 familias (el request solo nombra `familia-recorrido` en QA-01-02-01 y cita "fondos de las diez familias de doc 43 §9"); confirmar en `docs/product/tecnologia/22_tema_claro_v1_y_preparacion_oscuro.md:53-60` y en doc 43 §9.
- Nombres de los tokens concretos de respaldo y overlay por familia generados por HU-01-01 desde `tokens.v1.json`; confirmar en el spec de HU-01-01 y en el archivo de tema generado.
- Mecanismo de lint elegido para la guarda de `isDark`/rutas literales: regla `custom_lint` propia, `forbidden_imports`/`analyzer` con `exclude`, o script en CI; el request no lo fija y HU-01-06 ya dejó guardas de lint en CI que conviene reusar.
- Si Widgetbook ya está instalado en el monorepo (QA-01-02-05 lo exige); si no, el preview visual queda como escenario manual con capturas.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/22_tema_claro_v1_y_preparacion_oscuro.md:53-60

Existe un contrato de familia de imagen que declara, por familia, las variantes `light.phonePortrait`, `light.tabletPortrait` y `light.tabletLandscape`, las `dark.*` (nulas en V1), un `fallbackSurfaceToken` y un `overlayToken`, leído desde el manifiesto detrás de una interfaz propia que en M0 se alimenta con una fixture.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:296-298

El resolvedor selecciona la variante por familia según tamaño lógico, orientación y tema: en tema claro nunca devuelve una variante `dark.*` aunque exista en el manifiesto, y cuando la variante pedida falta o es nula devuelve la superficie de respaldo de la familia en lugar de estirar otra variante.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:296

El dibujo de una imagen resuelta usa las variantes de densidad empaquetadas de Flutter (1x, 2x, 3x) y limita la decodificación con `cacheWidth`/`cacheHeight` al tamaño que realmente se dibuja, sin ampliar por encima del tamaño intrínseco del derivado.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:297

Ante un archivo inexistente, corrupto o cualquier falla de carga, aparece la superficie de respaldo de la familia con la proporción reservada (sin salto de layout), sin excepción no capturada, y queda un log de desarrollo con el id del asset y la variante pedida, sin rutas del dispositivo ni datos personales.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:297

Las imágenes decorativas quedan fuera del árbol de accesibilidad y las informativas se anuncian con el `alt` del manifiesto.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:343-344

La capa de fondo a pantalla completa dibuja el fondo de la familia detrás de todo el contenido, incluidas las zonas del encabezado y de las barras del sistema, con `cover` centrado por defecto, opacidad visual de 12 a 18 % y superficie de respaldo; es la única forma de dibujar un fondo de familia y nunca se usa como franja, recuadro ni tarjeta.

### REQ-07 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:347

El componente de ilustración editorial dibuja llegadas o avance, permanencias, animales Ashura, materiales, objetos y acciones con `contain`, sin marco, borde, sombra ni fondo gris, integrado al papel (transparencia o el mismo tono `ivory100`), sin deformar.

### REQ-08 `inferred` `enforcement`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:296

El lint del proyecto falla cuando en `app/lib` aparece una condición por tema (`isDark`) o una ruta de asset literal fuera del resolvedor, de modo que el resolvedor sea el único punto que conoce rutas y variantes.

### REQ-09 `inferred` `enforcement`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:115

El resolvedor reusa el tema claro forzado generado desde `tokens.v1.json` por HU-01-01 para obtener los colores de `fallbackSurfaceToken` y `overlayToken`, sin declarar colores literales propios ni duplicar el mecanismo de tokens.
## Tasks

#### S1.T1 — Definir el contrato de familia de imagen y la interfaz de manifiesto en `app/lib`: por familia, las variantes `light.phonePortrait`, `light.tabletPortrait`, `light.tabletLandscape`, las `dark.*` (nulas en V1), `fallbackSurfaceToken` y `overlayToken`, más el `alt` y la marca decorativa/informativa por asset. El acceso al manifiesto va siempre detrás de la interfaz; en M0 la implementación de prueba es una fixture (el `app/assets/manifest.json` real tiene 64 entradas y todavía no tiene campo de estado, por eso no se consume en M0). Nombres de variantes y tokens tal como los fija `docs/product/tecnologia/22_tema_claro_v1_y_preparacion_oscuro.md:53-60`.
Contrato: rollback: Borrar los archivos nuevos del contrato y de la interfaz de manifiesto; ningún archivo preexistente se modifica, así que el árbol vuelve al estado previo con `git checkout`.. Status: done

#### S1.T2 — Implementar la selección de variante por familia, orientación y tema: tema claro nunca devuelve `dark.*` aunque exista en el manifiesto, y variante faltante o nula devuelve la superficie de respaldo de la familia en vez de estirar otra variante. La resolución lee `fallbackSurfaceToken` y `overlayToken` del tema claro generado desde `tokens.v1.json` por HU-01-01, sin colores literales propios.
Contrato: rollback: Revertir el archivo del resolvedor a su estado anterior; el contrato y la interfaz de la task previa quedan en pie y sin consumidores.. Status: done

#### S1.T3 — Implementar el dibujo: `cover` centrado para fondos y `contain` para ilustraciones, variantes de densidad empaquetadas 1x/2x/3x de Flutter (DEC-230), decodificación limitada con `cacheWidth`/`cacheHeight` al tamaño realmente dibujado (640 px en 160 dp a 3x → ≤ 480 px) y tope en el tamaño intrínseco del derivado (nunca ampliar). Sin punto focal por familia: el recorte dirigido lo aporta la composición de cada destino (`content/imagenes/12`).
Contrato: rollback: Revertir el archivo de dibujo; la selección de variante sigue siendo usable sin él.. Status: done

#### S1.T4 — Implementar el camino de falla: capturar el error de carga de imagen (archivo inexistente o corrupto), pintar la superficie de respaldo con la proporción reservada para no saltar el layout, no dejar escapar la excepción y emitir un log de desarrollo con el id del asset y la variante pedida, sin rutas del dispositivo ni datos personales.
Contrato: rollback: Revertir el manejo de error: el dibujo vuelve a propagar la excepción, estado anterior a esta task.. Status: done

#### S1.T5 — Aplicar la semántica de accesibilidad: imágenes decorativas excluidas del árbol de accesibilidad, informativas anunciadas con el `alt` del manifiesto, incluso cuando caen a la superficie de respaldo.
Contrato: rollback: Quitar el envoltorio semántico; las imágenes vuelven a dibujarse sin nodos de accesibilidad propios.. Status: done

#### S1.T6 — Agregar la guarda de lint que falla cuando en `app/lib` hay una condición por tema (`isDark`) o una ruta de asset literal fuera del directorio del resolvedor, reusando el mecanismo de guardas de lint en CI que ya dejó HU-01-06 en lugar de inventar uno nuevo. Dejar el directorio del resolvedor exceptuado por diseño y documentar la excepción en la configuración.
Contrato: rollback: Quitar la regla/entrada de configuración agregada; el lint vuelve exactamente al conjunto de reglas de HU-01-06.. Status: done

#### S1.T7 — Tests y regresión del resolvedor: unitarios de selección por familia/orientación/tema (incluido QA-01-02-01 con `familia-recorrido` solo en `light.phonePortrait` resuelto en 1024 × 768 → respaldo, y tema claro nunca `dark.*`), de densidad y decodificación (QA-01-02-03: 640 px en 160 dp a 3x → ≤ 480 px; QA-01-02-04: `3.0x` en densidad 3x, `2.0x` en 2x y el borde sin `3.0x`), de tope por tamaño intrínseco, widget tests de carga fallida (QA-01-02-02: respaldo visible y `tester.takeException()` nulo) y de contenido exacto del log, widget tests de exclusión semántica y de `alt`, y la verificación de que el resolvedor no lee `app/assets/manifest.json` directamente. Incluir un caso que compruebe que el lint nuevo falla ante un archivo con `isDark` y pasa con el código final.
Contrato: rollback: Borrar los archivos de test agregados; el código de producción queda intacto.. Status: done

#### S2.T1 — Implementar la capa de fondo a pantalla completa (DEC-235): widget que dibuja el fondo de la familia detrás de todo el contenido, incluidas las zonas del encabezado y de las barras del sistema (sin recorte por `SafeArea`), con `cover` centrado por defecto, opacidad visual entre 12 y 18 % y superficie de respaldo con el `overlayToken` de la familia cuando la variante falta. Es la única forma de dibujar un fondo de familia: nunca franja, recuadro ni tarjeta. La montan las plantillas de HU-01-10, que no se tocan en este ticket.
Contrato: rollback: Borrar el widget de capa de fondo; nada lo consume todavía (HU-01-10 es posterior), así que no hay consumidores que romper.. Status: done

#### S2.T2 — Implementar el componente de ilustración editorial sin marco (DEC-235): dibuja llegadas o avance, permanencias, animales Ashura, materiales, objetos y acciones con `contain`, sin marco, borde, sombra ni fondo gris, integrado al papel (transparencia o el mismo tono `ivory100`), sin deformar y sin ampliar sobre el intrínseco. Reusa el dibujo y el camino de respaldo de la sesión anterior.
Contrato: rollback: Borrar el componente de ilustración; el resolvedor y la capa de fondo siguen funcionando sin él.. Status: done

#### S2.T3 — Publicar el preview visual de ambos widgets para la comparación de Diseño de QA-01-02-05: casos en teléfono vertical, tablet vertical y tablet horizontal, con imagen y con superficie de respaldo, para contrastar contra `navegacion-y-acciones/maqueta-direccion-consolidada.png` y doc 43 §9. Si Widgetbook no está instalado en el monorepo, dejar en su lugar una pantalla de preview de desarrollo y las capturas correspondientes en el PR.
Contrato: rollback: Quitar las entradas de preview agregadas; no afectan el código de producción de los widgets.. Status: done

#### S2.T4 — Tests y regresión de los widgets: widget tests de la capa de fondo (cubre la pantalla completa incluido lo que queda bajo encabezado y barras del sistema, opacidad dentro de 0.12-0.18, respaldo con overlay cuando falta la variante, contenido legible por encima del fondo), widget tests de la ilustración (sin borde, sombra ni fondo distinto de transparente o `ivory100`; `contain` sin deformar; respaldo sin marco ante archivo faltante) y goldens de una plantilla con fondo y con respaldo en teléfono y tablet. Correr además la suite del resolvedor de la sesión anterior para confirmar que no se rompió.
Contrato: rollback: Borrar los tests y los archivos golden agregados; el código de producción queda intacto.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: La capa de fondo a pantalla completa dibuja el fondo de la familia detrás de todo el contenido, incluidas las zonas del encabezado y de las barras del sistema, con `cover` centrado por defecto, opacidad visual de 12 a 18 % y superficie de respaldo; es la única forma de dibujar 
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
- [x] S1.T6
- [x] S1.T7

**Gate (auto)**: La suite de tests del resolvedor pasa mostrando por nombre los casos QA-01-02-01 a QA-01-02-04 con sus valores concretos, y el lint falla ante un archivo de prueba con `isDark` o ruta literal fuera del resolvedor y pasa con el código final.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4

**Gate (auto)**: En el preview de Widgetbook (o en las capturas del PR) se ve, en teléfono y tablet, el fondo de familia a pantalla completa detrás del contenido —también bajo encabezado y barras del sistema— con opacidad 12-18 %, la misma vista con superficie de respaldo cuando falta la variante, y la ilustración editorial sin marco; los goldens de plantilla con fondo y con respaldo quedan congelados y pasan.

### Session 3 · T0 · open
