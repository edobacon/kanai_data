# Guía de implementación: Términos de uso v1 dentro de V-51 (TAO-222 / HU-03a-14)

## 0. Alcance y principios

- Esta historia **no define una interfaz propia**. La presentación de V-51 y su fondo los fija HU-01-13 (DEC-235). Esta guía fija **dónde cae cada texto**, la estructura de títulos para lector de pantalla, los marcadores provisionales y los estados de carga, error y faltante.
- Fuente única del contenido: `docs/legal/terminos-v1.0.md`, copiado a `app/assets/legal/` y `server/legal/`.
- El texto completo sale de la **copia empaquetada**: funciona sin red en el primer uso (DEC-219).
- Los textos legales son **borrador sin aprobación de la asesoría legal**. Se implementan tal cual, con sus marcadores provisionales.
- Vistas: V-51 (tarjeta de resumen en smartphone, lector del texto completo en teléfono y tablet) y sus estados.

## 1. Tokens de diseño

Respetar los tokens de la maqueta. Si el sistema de diseño de la app ya los define (HU-01-13), mapear a los equivalentes y no duplicar.

| Token | Claro | Oscuro |
|---|---|---|
| `bg` | `#f4f3ef` | `#16181a` |
| `surface` | `#ffffff` | `#212427` |
| `ink` | `#1d1f22` | `#ecebe7` |
| `muted` | `#5d636b` | `#a3a8ae` |
| `line` | `#dcdad3` | `#34383c` |
| `accent` | `#2f5d50` | `#7fb8a6` |
| `accent-ink` | `#ffffff` | `#10201b` |
| `warn-bg` / `warn-ink` | `#fff4d6` / `#6b4e00` | `#3a3014` / `#f2d58a` |
| `err-bg` / `err-ink` | `#fde8e6` / `#8a1f14` | `#3d1c19` / `#f4b3aa` |
| `info-bg` / `info-ink` | `#e6efec` / `#24483e` | `#1d2f2a` / `#b9dccf` |

- Fuentes: `sans` = system-ui (cuerpo), `mono` = ui-monospace (metadatos y marcadores).
- Soportar modo oscuro automático (`prefers-color-scheme`) y forzado claro/oscuro.
- Contraste mínimo en los pares texto/fondo de banners, botones y marcadores.

## 2. Componentes

### 2.1 Estructura base de pantalla (smartphone)
Columna a pantalla completa, tres zonas:
1. **AppBar** (fija): padding 10/16, borde inferior `line`. Flecha atrás (`←`, 1.2rem, `muted`) solo en pantallas que no son la tarjeta; título `h3` 1rem.
2. **Scroll** (flex 1, `overflow:auto`, padding 16): único elemento que se desplaza, **solo en vertical**.
3. **Footer** (fijo, borde superior `line`, fondo `surface`, padding 12/16, gap 8, columna): acciones y casilla, **siempre visibles**.

### 2.2 Botón
Bloque de ancho completo, centrado, padding 12, radio 10, peso 600, 0.95rem.
- `primary`: fondo `accent`, texto `accent-ink`.
- `secondary`: transparente, texto y borde `accent`.
- `disabled`: fondo `line`, texto `muted`. Debe ser realmente no accionable y exponer `aria-disabled`/`disabled`.

### 2.3 Casilla de aceptación
Fila con gap 10: caja 20×20, borde 2px `muted`, radio 4, alineada arriba (margin-top 1) + etiqueta 0.88rem. Toda la fila es el área táctil y activa/desactiva la casilla. Usar un control nativo de casilla con su etiqueta asociada (no un `div` decorativo).

### 2.4 Banner
Radio 8, padding 10/12, 0.82rem, margin inferior 14. Variantes `warn`, `err`, `info` (colores de §1).

### 2.5 Tarjeta (resumen)
Borde 1px `line`, radio 12, padding 14, fondo `surface`. Título `h4` 1rem, margin inferior 8. Lista con padding izquierdo 18, 0.9rem, separación 6 entre ítems.

### 2.6 Bloque de metadatos (`meta`)
Mono 0.72rem, `muted`, fondo `bg`, borde `line`, radio 8, padding 8/10, margin inferior 14, `word-break: break-all`. Claves en negrita color `ink`.

### 2.7 Texto legal (`legal`)
- `h4` (título del documento) 1.05rem, margin inferior 6.
- `h5` (apartados) 0.95rem, margin superior 18, inferior 4.
- Párrafos y `li` 0.88rem, margin inferior 8. Listas con padding izquierdo 18.
- Renderizar el Markdown con estos estilos (ver §6 sobre jerarquía semántica).

### 2.8 Marcador provisional (`ph`)
Mono 0.78rem, fondo `warn-bg`, texto `warn-ink`, padding 1/5, radio 4. Se usa **inline** dentro del texto.

### 2.9 Estado centrado (`center`)
Columna centrada, padding 24, gap 12, texto centrado. Ícono circular 48×48 (`err` con «!», `warn` con «?», `info`), `h4` 1.05rem, párrafo 0.9rem `muted`.

### 2.10 Skeleton y spinner
- Barras de 12 px de alto, radio 6, color `line`, anchos variables (60/90/80/95/40/88/76 %).
- Spinner 36 px, borde 4px `line` con `accent` arriba, rotación 1 s lineal infinita. Respetar `prefers-reduced-motion` (sin rotación continua).

### 2.11 Índice de apartados (`toc`, solo tablet)
Ancho 280, borde derecho `line`, padding 16, scroll propio. Título «Apartados» en mayúsculas 0.85rem `muted`. Lista ordenada 0.85rem. El ítem activo va en `accent`, peso 600. Se oculta por debajo de 720 px.

## 3. Pantallas y estados en smartphone

### 3.1 V-51 · tarjeta de resumen (provisional)
Offline en el ejemplo: la barra de estado muestra «sin red», y la pantalla funciona igual.

- AppBar: **«Antes de empezar»** (sin flecha atrás).
- Scroll:
  1. Banner `warn`: «Versión provisional: falta la aprobación de la asesoría legal y la fecha de vigencia.»
  2. Tarjeta **«Términos de uso en breve»** con la sección «Resumen» (apartado 10) del mismo archivo (REQ-02), seis viñetas:
     - Puedes usar la app con una cuenta de dispositivo. Para tener soporte y usar tus datos en otros equipos necesitas una cuenta completa.
     - Cuando publiquemos una versión nueva que cambie tus derechos u obligaciones, tendrás que aceptarla para seguir usando la app.
     - Los códigos de producto se usan una sola vez y se validan con conexión a internet.
     - Podemos limitar o suspender una cuenta por un uso indebido.
     - Puedes cerrar sesión, borrar tus datos del dispositivo o eliminar tu cuenta.
     - Algunas funciones exigen tener instalada la versión mínima de la app.
  3. Línea 0.78rem `muted`, margin superior 12: «Términos de uso v1.0 · vigentes desde» + `ph` **PROVISIONAL**.
- Footer (en orden):
  1. Botón `secondary` **«Leer los términos completos»** → abre 3.2.
  2. Casilla **«Leí y acepto los términos de uso v1.0»** (desmarcada por defecto).
  3. Botón **«Continuar»** (`disabled` hasta marcar la casilla; entonces pasa a `primary`).

### 3.2 V-51 · texto completo
- AppBar: flecha atrás + **«Términos de uso»**. La flecha y el botón hacen lo mismo: volver a la tarjeta.
- Scroll con clase `legal`. Al inicio:
  - Bloque `meta`: `versión` 1.0 · `vigente_desde` `ph` PROVISIONAL · `hash` `sha256:` + `ph` «se recalcula al fijar la fecha».
  - Título `h4` **«Términos de uso de la app»** y la introducción: «Estos términos explican las reglas para usar la app y su método. Léelos con calma antes de aceptarlos.»
  - Apartados 1 a 10 con el texto del Markdown (ver §7 para la lista).
  - En el apartado 1 los tres datos del titular son marcadores `ph`: «TITULAR: PROVISIONAL», «DOMICILIO: PROVISIONAL», «JURISDICCIÓN: PROVISIONAL».
- Footer: botón `primary` **«Volver al resumen»**, siempre visible.
- Al volver, se conserva el estado de la casilla y el scroll de la tarjeta.

### 3.3 Escala de texto 200 % (QA-03a-14-01)
- El texto se ajusta en líneas y se desplaza **solo en vertical**; nunca scroll horizontal ni texto cortado.
- Casilla y botones **siempre visibles** en el footer (no pueden salir de pantalla ni quedar tapados).
- Referencia de la maqueta a 200 %: cuerpo 2rem, `h4` 2.1rem, viñetas 1.75rem, botones 1.75rem con padding 16, etiqueta de casilla 1.6rem, caja 30×30. En producción usar unidades relativas para que siga la escala del sistema y no valores fijos.
- Con escala alta el footer puede ocupar mucho alto: el área de scroll debe seguir siendo usable. Evitar alturas fijas.
- La revisión de esta escala la hace una persona, **fuera del gate automático**.

### 3.4 Estado: cargando el texto empaquetado
- AppBar con flecha atrás + «Términos de uso». Sin footer.
- Scroll con `aria-busy="true"`: siete skeletons (60, 90, 80, 95 %, un hueco de 22 px, 40, 88, 76 %) y debajo spinner (`role="status"`, `aria-label="Cargando"`) con el texto **«Cargando los términos de uso…»**.
- Es lectura local; la carga es breve. No mostrar este estado como si hubiera una petición de red.

### 3.5 Estado: error, el hash no coincide
- AppBar con flecha atrás + «Términos de uso».
- Centrado: ícono `err` «!», título **«No pudimos verificar los términos»**, texto «El texto de esta versión de la app no coincide con la versión aprobada. Actualiza la app para continuar.», y línea mono 0.72rem **«versión 1.0 · hash esperado ≠ hash empaquetado»**.
- Footer: `primary` **«Buscar actualización»** y `secondary` **«Reintentar»**.
- **No mostrar el texto legal** y no permitir continuar. «Reintentar» vuelve a leer y verificar la copia empaquetada.

### 3.6 Estado: faltante, sin texto empaquetado
- AppBar con flecha atrás + «Términos de uso».
- Centrado: ícono `warn` «?», título **«Los términos no están disponibles»**, texto «Esta versión de la app no trae el texto de los términos de uso. No puedes continuar hasta tenerlo.»
- Footer: solo `primary` **«Buscar actualización»**. No hay «Reintentar» porque la copia no existe.

### 3.7 Estado: reaceptación, servicio detenido (DEC-208, DEC-225)
**Solo referencia para versiones futuras.** La v1.0 reemplaza al fixture técnico y **no lleva `exige_reaceptacion`** (REQ-06). No implementar el disparo ahora; sí dejar el layout preparado si HU-01-13 lo pide.
- AppBar: **«Términos actualizados»** (sin flecha atrás: no se puede salir).
- Scroll: banner `info` «Publicamos una versión nueva de los términos de uso que cambia tus derechos u obligaciones.»; tarjeta **«Qué cambia»** con el resumen de los cambios; texto 0.85rem `muted`: «Para seguir usando la app tienes que aceptar la versión nueva. Mientras no la aceptes, el servicio queda detenido.»
- Footer: `secondary` «Leer los términos completos», casilla **«Leí y acepto la versión nueva»**, `disabled` **«Aceptar y continuar»** (se habilita al marcar).

## 4. Tablet en horizontal

- Marco tablet; mismo AppBar («←» + «Términos de uso»). Cuerpo en dos columnas:
  - Izquierda: `toc` (280) con «Apartados».
  - Derecha: columna de lectura `legal` con **ancho máximo 640 px**, con scroll propio.
- La columna de lectura incluye banner `warn` de provisional y bloque `meta` en una sola línea (separado por « · »), seguido de los apartados.
- El índice se genera con los **títulos de segundo nivel (`##`) del Markdown**, sin el número, con estas etiquetas acortadas: Quién presta el servicio · Cuenta de dispositivo y cuenta completa · Aceptación y versiones · Códigos de producto · Limitación y suspensión · Soporte · Cierre de sesión, borrado y eliminación · Versión mínima y actualizaciones · Contenido del método · Resumen. *(La maqueta usa etiquetas más cortas que los títulos completos para el índice en 3, 5 y 7; confirmar si se acortan a mano o si se renderiza el título completo con truncado. Por defecto, seguir la maqueta.)*
- Interacción esperada del índice: tocar un ítem desplaza la lectura a ese apartado; el ítem activo sigue el scroll (en la maqueta está activo el apartado 2).
- `nav` con `aria-label="Apartados"`; el ítem activo con `aria-current="true"`.
- Por debajo de 720 px de ancho el índice se oculta y se usa el layout de teléfono.

## 5. Interacciones y flujo

1. Se abre V-51 (tarjeta). El contenido sale de la copia empaquetada, sin red.
2. «Leer los términos completos» abre el lector; «Volver al resumen» o la flecha atrás regresan.
3. La casilla habilita «Continuar». Desmarcarla lo deshabilita.
4. Antes de mostrar texto, se **verifica el hash** de la copia empaquetada contra el aprobado:
   - Ok → tarjeta/lector.
   - Archivo ausente → estado faltante (3.6).
   - Hash distinto → estado error (3.5).
5. El resultado de «Continuar» y el registro de la aceptación pertenecen a HU-01-13, no a esta historia.

## 6. Accesibilidad

- Jerarquía de títulos del lector, derivada de `terminos-v1.0.md`: un `h1` «Términos de uso de la app» y `h2` para cada apartado:
  - `#` Términos de uso de la app
  - `##` 1. Quién presta el servicio · 2. Cuenta de dispositivo y cuenta completa · 3. Aceptación y versiones de estos términos · 4. Códigos de producto · 5. Limitación y suspensión de la cuenta · 6. Soporte · 7. Cierre de sesión, borrado de datos y eliminación de la cuenta · 8. Versión mínima y actualizaciones · 9. Contenido del método · 10. Resumen
- La maqueta pinta el título como `h4` y los apartados como `h5` **solo por estilo**. En la implementación usar los niveles semánticos `h1`/`h2` (o los que correspondan dentro de V-51) y aplicar el aspecto visual con estilos, sin saltar niveles.
- Casilla: control nativo con etiqueta asociada y estado anunciado. Botón deshabilitado: anunciado como no disponible.
- Estados: carga con `aria-busy` y `role="status"`; error y faltante anuncian su título al aparecer (por ejemplo `role="alert"` o foco al título).
- Los marcadores `ph` se leen como texto normal («PROVISIONAL»); no ocultarlos a lector de pantalla.
- Tamaños táctiles mínimos: botones de 12 px de padding + texto, casilla con área de toque completa de la fila.

## 7. Contenido por apartado (texto exacto de la maqueta)

1. **Quién presta el servicio**: «El servicio lo presta [TITULAR: PROVISIONAL], con domicilio en [DOMICILIO: PROVISIONAL]. La ley aplicable es [JURISDICCIÓN: PROVISIONAL].»
2. **Cuenta de dispositivo y cuenta completa**: dos párrafos, con «cuenta de dispositivo» y «cuenta completa» en negrita.
3. **Aceptación y versiones de estos términos**: «Cada versión tiene un número y una fecha de vigencia. Si una versión nueva cambia tus derechos u obligaciones, la app se detiene hasta que la aceptes.»
4. **Códigos de producto**: «Cada código sirve una sola vez. Para canjearlo necesitas conexión a internet, porque se valida en línea en el momento del canje.»
5. **Limitación y suspensión de la cuenta**: «Podemos limitar funciones o suspender una cuenta si se usa en contra de estos términos. Te informaremos el motivo dentro de la app.»
6. **Soporte**: «El soporte se presta solo a personas con cuenta completa.»
7. **Cierre de sesión, borrado de datos y eliminación de la cuenta**: lista con **Cerrar sesión**, **Borrar datos**, **Eliminar la cuenta** (cada una en negrita y su descripción).
8. **Versión mínima y actualizaciones**: «Si tu versión es anterior a la versión mínima, tendrás que actualizar la app para seguir usándola.»
9. **Contenido del método**: «El contenido del método viene incluido en la app. Puedes usarlo solo para fines personales.»
10. **Resumen**: «Esta sección es el texto de la tarjeta de inicio y no agrega obligaciones nuevas.» Esta sección alimenta la tarjeta de resumen (el texto exacto lo define el Markdown; las seis viñetas de 3.1 vienen de aquí).

Los textos de la guía se toman del archivo fuente; si difieren de esta lista, **manda el archivo** y se corrige la guía.

## 8. Cobertura mínima (QA-03a-14-03)

Cada tema debe tener su apartado con título propio en el texto completo:

| Tema | DEC | Apartado | REQ |
|---|---|---|---|
| Cuenta de dispositivo y cuenta completa | DEC-212 | 2 | REQ-07 |
| Aceptación versionada y reaceptación que detiene el servicio | DEC-208, DEC-225 | 3 | REQ-08 |
| Códigos de producto de un solo uso validados en línea | DEC-213 | 4 | REQ-09 |
| Limitación y suspensión administrativa | DEC-020, DEC-056 | 5 | REQ-10 |
| Soporte solo con cuenta completa | DEC-216 | 6 | REQ-11 |
| Cierre de sesión, borrado de datos y eliminación de cuenta | DEC-054, DEC-128, DEC-224 | 7 | REQ-12 |
| Versión mínima y actualizaciones | DEC-086 | 8 | REQ-13 |
| Contenido del método entregado con la app | DEC-094 | 9 | REQ-14 |
| Resumen para la tarjeta de V-51 | DEC-049 | 10 | REQ-02 |

Un test automático puede verificar que existe un título por cada apartado 2 a 10.

## 9. Pendientes externos (provisional)

- `TITULAR / DOMICILIO / JURISDICCIÓN: PROVISIONAL`: ningún documento del proyecto define la identidad legal del titular. Mantener los marcadores.
- `vigente_desde: PROVISIONAL`: la fecha la fijan Producto y la asesoría legal. El **hash se recalcula** al fijarla.
- Banner «Versión provisional»: se quita cuando `docs/legal/aprobaciones-terminos-v1.0.md` registre la aprobación legal y la aceptación de Producto. Implementarlo de modo que quitarlo sea un cambio de contenido (indicador en el archivo o en su metadato), no de código de pantalla.

## 10. Checklist de verificación

- [ ] Tarjeta con banner provisional, seis viñetas, línea de versión y footer de tres elementos.
- [ ] «Continuar» deshabilitado hasta marcar la casilla.
- [ ] Lector con meta, título, apartados 1 a 10 y marcadores `ph`; botón «Volver al resumen» siempre visible.
- [ ] Funciona sin red en el primer uso (copia empaquetada).
- [ ] Hash verificado; estados error y faltante con sus botones correctos.
- [ ] Estado de carga con skeleton, spinner y `aria-busy`.
- [ ] Tablet: índice + columna de 640 px; el índice se oculta bajo 720 px.
- [ ] Escala 200 %: sin scroll horizontal, casilla y botones visibles.
- [ ] Jerarquía `h1` + `h2` x10 para lector de pantalla.
- [ ] Modo claro y oscuro con los tokens de §1.
- [ ] Estado de reaceptación solo como referencia, sin disparo en v1.0.