---
id: TAO-177-SPEC
project: taomangalam
ticket: TAO-177
status: draft
---

# Shell de navegación HU-01-08: encabezado con hamburguesa, panel lateral superpuesto y panel persistente en tablet

## Resumen ejecutivo

Se construye el shell de navegación del consultor sobre los tokens ya generados (TaoSize.headerPhone/headerTablet/drawerPhoneMax, TaoBreakpoint.mediumMin/expandedMin en app/lib/design_system/tokens/tokens.g.dart) y los átomos/movimiento de HU-01-01/03/07: lista declarativa de destinos (Inicio, Consultas, Biblioteca, Productos + pie Ajustes, Cuenta, Ayuda), encabezado compacto con hamburguesa 48x48, panel superpuesto con scrim, foco atrapado/devuelto y cierre por control, toque exterior, Escape y Atrás, panel persistente desde 840 de ancho disponible sin animación al cambiar de destino, y bloqueo de orientación por lado corto (<600 = solo vertical). NO incluye: filtrado por capacidades (HU-01-11), contenido de los destinos (van a marcadores vacíos), franja de impersonación ni menús de Productor/Administrador. Se verifica con unit tests del modelo de destinos y del cálculo de composición, widget tests de apertura/cierre/foco/anuncio de seleccionado, y goldens en 360x800, 390x844, 768x1024 y 1024x768 con escala 100% y 200%. Tamaño: 5 puntos, 3 sesiones (T2/T2/T1); entra en el techo de 4.

Advertencias (fuera de alcance, no son requirements): el request pide pictogramas ilustrados que están marcados como faltantes, por lo que en M0 se usan los iconos operativos de HU-01-03 y la comparación visual de QA-01-08-05 solo puede aprobarse sobre esa base; el criterio de aceptación de "gesto Atrás" en iOS no tiene equivalente de sistema y se cubre con el control y el toque exterior.

Datos a confirmar antes de ejecutar:
- Nombre/ruta del servicio de reducción de movimiento y de los tokens de movimiento de HU-01-07 (el spec existe en el KB como "Tokens de movimiento y servicio de reducción de movimiento (HU-01-07)" pero no hay archivo citado en el contexto): confirmar en app/lib/design_system/ de la rama origin/epic/EP-01 antes de implementar el REQ-07.
- Nombre de los widgets de icono y botón de HU-01-03 ("Átomos del sistema de diseño") a reutilizar para la hamburguesa y los iconos de destino: confirmar en app/lib/design_system/atoms/.
- Claves ARB de i18n (HU-01-06) para los siete destinos: confirmar el archivo de ARB de la app y el prefijo de claves usado antes de crear las nuevas.
- Ruta exacta de los goldens existentes y del harness de golden tests del paquete app (si existe), para alinear nombres y tamaño de ventana.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:121

La app expone un modelo declarativo de destinos de navegación del consultor con dos grupos (principal: Inicio, Consultas, Biblioteca, Productos; pie: Ajustes, Cuenta, Ayuda), cada uno con id estable, clave de etiqueta i18n, icono y ruta, de forma que HU-01-11 pueda filtrarlo sin tocar el shell.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/lib/design_system/tokens/tokens.g.dart:212

El encabezado mide 64 de alto en teléfono y 72 en tablet, muestra volver cuando hay historial, título o contexto, y un botón hamburguesa de 48x48 que abre el panel; el botón desaparece cuando el panel persistente está visible y reaparece cuando se oculta.

### REQ-03 `confirmed`
> Fuente: HU-01-08 · Alcance (panel lateral superpuesto) y criterios de aceptación 1 y 11 (escala de texto 200 % en 360 × 800); pedido de refine dirigido opción A, punto 2

En composición compacta/media el panel es superpuesto: entra desde el borde inicial en 260 ms ocupando 80% del ancho con máximo 360 (TaoSize.drawerPhoneMax), con scrim que aparece en 180 ms, es desplazable, y al abrirse el foco pasa al primer destino; con escala de texto 200 % en 360 x 800 ninguna etiqueta del encabezado ni del menú se trunca ni se superpone: el panel crece y se desplaza para que los siete destinos sigan legibles y accionables.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:122

El panel superpuesto se cierra en 200 ms por su control, por toque fuera (scrim), por Escape y por el gesto/acción Atrás, y en los cuatro casos el foco vuelve al botón hamburguesa; mientras está abierto el foco queda atrapado dentro del panel.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:123

El destino activo se marca con barra lateral o fondo tonal más peso tipográfico además del color, y se expone a lectores de pantalla como seleccionado.

### REQ-06 `confirmed`
> Fuente: taomangalam/app/lib/design_system/tokens/tokens.g.dart:228

Desde 840 de ancho disponible (TaoBreakpoint.expandedMin) el panel es persistente junto al contenido y cambiar de destino solo mueve el indicador activo, sin animación del panel (DEC-230); por debajo de 840 el panel es superpuesto, conservando el destino activo al cruzar el límite.

### REQ-07 `confirmed`
> Fuente: HU-01-08 · criterio de aceptación 10 (movimiento reducido) y requisito transversal de accesibilidad; pedido de refine dirigido opción A, punto 3

Con movimiento reducido activo, abrir y cerrar el menú no usa los 260/200 ms: solo hay fundido de hasta 120 ms o cambio inmediato, reusando los tokens de duración y el servicio de reducción de movimiento ya entregado por HU-01-07 (no se crea uno nuevo). Datos a confirmar: el nombre exacto de ese servicio/API de HU-01-07 se lee del código al implementar; es la única incertidumbre y no afecta el comportamiento exigido.

### REQ-08 `confirmed`
> Fuente: taomangalam/app/lib/design_system/tokens/tokens.g.dart:226

La orientación se fija por tipo de dispositivo según el lado más corto: dispositivos con lado corto menor a 600 (TaoBreakpoint.mediumMin) quedan solo en vertical; desde 600 se permiten ambas orientaciones y la composición se readapta al girar.

### REQ-09 `confirmed` `enforcement`
> Fuente: taomangalam/app/test/core/images/image_family_resolver_test.dart:251

El shell no inventa superficie ni estilos: el panel es una sola superficie marfil opaca sin paisaje ni ilustración de fondo ni cajas por pictograma, el fondo de la vista anfitriona solo se ve detrás del scrim, y todas las medidas, colores, tipografías, iconos y duraciones salen de los tokens generados y de los átomos de HU-01-01/03/07 (sin literales de color, sin Colors.*, sin números mágicos).

### REQ-10 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:435

Los siete destinos llevan icono acompañado de texto, el grupo de pie (Ajustes, Cuenta, Ayuda) aparece separado visualmente del grupo principal, y las etiquetas salen de claves i18n (HU-01-06), no de cadenas literales en el widget.

### REQ-11 `confirmed`
> Fuente: Pedido de refine dirigido opción A, punto 1 (decisión del dev); archivos app/lib/app.dart y app/lib/features/home/presentation/home_screen.dart; QA-01-08-01 de HU-01-08

El shell (encabezado + panel lateral) está montado en la app: `TaoApp` (app/lib/app.dart) usa el shell como `home` en lugar de la pantalla provisional `app/lib/features/home/presentation/home_screen.dart`, y cada uno de los siete destinos (Inicio, Consultas, Biblioteca, Productos, Ajustes, Cuenta, Ayuda) muestra una pantalla de marcador simple cuyo título sale del ARB (claves i18n de HU-01-06, sin textos fijos). La navegación es PROVISIONAL: el shell guarda el destino activo en su propio estado y renderiza el marcador correspondiente; no se agrega `go_router` ni ningún otro paquete de rutas (las rutas reales y los enlaces profundos son de HU-01-09 / TAO-179, que reemplazará esta selección por rutas reusando los mismos marcadores). `TaoApp` sigue aceptando `builder` y `navigatorKey` del entrypoint de development (panel interno). Con esto QA-01-08-01 y el caso de borde de REQ-05 quedan ejecutables de punta a punta.
## Tasks

#### S1.T1 — Crear el modelo declarativo de destinos del consultor en app/lib/ (grupo principal: Inicio, Consultas, Biblioteca, Productos; grupo de pie: Ajustes, Cuenta, Ayuda), con id estable, clave i18n, icono de los átomos de HU-01-03 y ruta a pantalla de marcador; sin filtrado por capacidades (eso es HU-01-11). Agregar las claves ARB de los siete rótulos siguiendo la infraestructura de i18n de HU-01-06.
Contrato: rollback: Borrar el archivo del modelo de destinos y revertir las claves agregadas al ARB; nada más del shell lo importa todavía.. Status: pending

#### S1.T2 — Construir el encabezado compacto: alto TaoSize.headerPhone (64) en teléfono y TaoSize.headerTablet (72) en tablet (tokens.g.dart:212-213), control de volver condicionado al historial, título/contexto y botón hamburguesa de 48x48 (TaoSize.touchPreferred) reusando el botón de HU-01-03. Sin literales de medida ni de color.
Contrato: rollback: Revertir con git los archivos tocados por esta task. Si el shell queda inutilizable, volver a `HomeScreen` (`app/lib/features/home/presentation/home_screen.dart`) como `home` de `TaoApp` en `app/lib/app.dart`. No hay shell, router, menú ni barra inferior anteriores que restaurar: verificado en `origin/epic/EP-01` que no existen.. Status: pending

#### S1.T3 — Construir el panel lateral superpuesto con scrim: ancho 80% del disponible con tope TaoSize.drawerPhoneMax (tokens.g.dart:214), entrada 260 ms desde el borde inicial, scrim en 180 ms, salida 200 ms, contenido desplazable, grupo de pie separado del principal y cada destino con icono + texto. Al abrir, el foco pasa al primer destino.
Contrato: rollback: Revertir con git los archivos tocados por esta task. Si el shell queda inutilizable, volver a `HomeScreen` (`app/lib/features/home/presentation/home_screen.dart`) como `home` de `TaoApp` en `app/lib/app.dart`. No hay shell, router, menú ni barra inferior anteriores que restaurar: verificado en `origin/epic/EP-01` que no existen.. Status: pending

#### S1.T4 — Implementar cierre por los cuatro mecanismos (control propio, toque en el scrim, tecla Escape, acción Atrás del sistema sin hacer pop de la ruta anfitriona) en 200 ms, con el foco atrapado dentro del panel mientras está abierto y devuelto al botón hamburguesa al cerrar.
Contrato: rollback: Quitar el manejo de Escape/Atrás y la trampa de foco, dejando solo el cierre por control y scrim.. Status: pending

#### S1.T5 — Marcar el destino activo con indicador no dependiente del color (barra lateral o fondo tonal) más peso tipográfico, y exponerlo a lectores como seleccionado (selected:true en semántica); los demás destinos quedan selected:false.
Contrato: rollback: Quitar el indicador y la semántica de selección; los destinos vuelven a renderizarse uniformes.. Status: pending

#### S1.T6 — Escribir los tests de esta etapa y la regresión: unit del modelo de destinos (orden, ids duplicados, claves no vacías), widget de encabezado (64/72, área 48x48, volver condicional), widget del panel (ancho 80%/tope 360, 260 ms, foco al primer destino, scroll a 200% en 360x800), widget de cierre por los cuatro mecanismos con retorno de foco y ciclo de Tab contenido, y widget del destino activo con semántica selected.
Contrato: rollback: Borrar los archivos de test agregados en esta sesión.. Status: pending

#### S1.T7 — Montar el shell en la app y crear los marcadores de destino. (a) En `app/lib/app.dart`, reemplazar `HomeScreen` (`app/lib/features/home/presentation/home_screen.dart`, pantalla provisional) por el shell como `home` de `TaoApp`, conservando intactos los parámetros `builder` y `navigatorKey` que pasa el entrypoint de development (panel interno). (b) Crear una pantalla de marcador simple por cada uno de los siete destinos del modelo declarativo de REQ-01 (Inicio, Consultas, Biblioteca, Productos, Ajustes, Cuenta, Ayuda), cuyo título sale de la clave i18n del ARB (HU-01-06), sin cadenas literales. (c) Navegación PROVISIONAL: el shell mantiene el destino activo en su propio estado (sin `go_router` ni ningún otro paquete de rutas en `app/pubspec.yaml`) y renderiza el marcador correspondiente; al elegir un destino en el panel superpuesto, el panel se cierra y el indicador activo se mueve. HU-01-09 / TAO-179 reemplazará esta selección por rutas reusando estos mismos marcadores, así que el mapa destino → widget debe quedar declarativo y en un solo lugar. Dejar ejecutables de punta a punta QA-01-08-01 y el caso de borde de REQ-05 (navegar de Inicio a Biblioteca).
Contrato: rollback: Volver a `HomeScreen` (`app/lib/features/home/presentation/home_screen.dart`) como `home` de `TaoApp` en `app/lib/app.dart` y revertir los marcadores creados. No hay shell, router, menú ni barra inferior anteriores que restaurar: verificado en `origin/epic/EP-01` que no existen.. Status: pending

#### S2.T1 — Derivar la composición del shell desde el ancho disponible usando TaoBreakpoint.expandedMin (840) para persistente y TaoBreakpoint.mediumMin (600) para el tipo de dispositivo (tokens.g.dart:226-228), alineado con la derivación ya existente de imageLayoutFor (image_family_resolver_test.dart:264-285); el cálculo debe leer el ancho disponible, no el tamaño físico de pantalla, para que pantalla dividida funcione.
Contrato: rollback: Eliminar la función de derivación de composición; el shell vuelve a comportarse siempre como superpuesto.. Status: pending

#### S2.T2 — Montar el panel persistente desde 840: el panel se dibuja junto al contenido (no sobre él, sin scrim), cambiar de destino no dispara animación del panel (DEC-230) y el control del encabezado lo oculta y vuelve a mostrarlo, con el contenido ocupando el ancho liberado y el botón hamburguesa reapareciendo al ocultarlo. Al cruzar de persistente a superpuesto se conserva el destino activo.
Contrato: rollback: Quitar la rama persistente del shell y dejar siempre el panel superpuesto de la sesión anterior.. Status: pending

#### S2.T3 — Aplicar movimiento reducido al panel reusando los tokens de movimiento y el servicio de reducción de HU-01-07: con reducción activa la apertura y el cierre son fundido de hasta 120 ms o cambio inmediato, en vez de 260/200 ms. Confirmar antes el nombre real del servicio en app/lib/design_system/ (ver 'Datos a confirmar').
Contrato: rollback: Quitar la consulta al servicio de reducción; el panel vuelve a usar siempre 260/200 ms.. Status: pending

#### S2.T4 — Aplicar el bloqueo de orientación por lado corto en el arranque de la app: lado corto < TaoBreakpoint.mediumMin (600) fija solo las orientaciones verticales; desde 600 se permiten las cuatro y la composición se readapta al girar.
Contrato: rollback: Quitar la llamada de bloqueo de orientación; la app vuelve a aceptar todas las orientaciones en todos los dispositivos.. Status: pending

#### S2.T5 — Escribir los tests de esta etapa y la regresión: derivación de composición en los límites 599/600/839/840 (incluido 768 vertical como superpuesto y ancho reducido por pantalla dividida), persistencia sin animación al cambiar de destino y conservación del destino activo al cruzar 840, ocultar/mostrar desde el encabezado, movimiento reducido (<=120 ms) contra movimiento normal (260/200 ms), y bloqueo de orientación en 390 vs 600.
Contrato: rollback: Borrar los archivos de test agregados en esta sesión.. Status: pending

#### S3.T1 — Agregar el test de fidelidad estructural del panel: una sola superficie marfil opaca, sin Image/DecorationImage en el subárbol del panel y sin cajas por pictograma, con el fondo de la vista anfitriona visible solo detrás del scrim (doc 43 §7 y §9, DEC-235).
Contrato: rollback: Borrar el archivo de test de fidelidad.. Status: pending

#### S3.T2 — Test que falla si en los fuentes del shell aparecen los números 64, 72, 360, 840 o 600 usados como MEDIDA, es decir como argumento de `height`, `width`, `maxWidth`, `minWidth`, `minHeight`, `maxHeight`, `BoxConstraints`, `SizedBox`, `Size` o como umbral de breakpoint. El matcher debe acotarse a esos usos para no dar falsos positivos: ignora índices, opacidades, duraciones, números dentro de strings y nombres de archivo de goldens (p.ej. `360x800.png`, `1024x768.png`). Esas medidas deben salir de `TaoSize.drawerPhoneMax` (360), `TaoBreakpoint.expandedMin` (840), `TaoBreakpoint.mediumMin` (600) y de los tokens de altura del encabezado (64 / 72).
Contrato: rollback: Borrar el archivo de test de no-literales.. Status: pending

#### S3.T3 — Agregar los goldens del shell en 360x800, 390x844, 768x1024 y 1024x768 con escala de texto 100% y 200%, con el panel abierto en las composiciones compactas y persistente en 1024x768, y generar las imágenes de referencia para la comparación de Diseño (QA-01-08-05).
Contrato: rollback: Borrar el archivo de goldens y las imágenes generadas bajo test/navigation/goldens/.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: El encabezado mide 64 de alto en teléfono y 72 en tablet, muestra volver cuando hay historial, título o contexto, y un botón hamburguesa de 48x48 que abre el panel; el botón desaparece cuando el panel persistente está visible y reaparece cuando se oculta.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: El panel superpuesto se cierra en 200 ms por su control, por toque fuera (scrim), por Escape y por el gesto/acción Atrás, y en los cuatro casos el foco vuelve al botón hamburguesa; mientras está abierto el foco queda atrapado dentro del panel.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
3. **Qué:** Verificar en runtime: El destino activo se marca con barra lateral o fondo tonal más peso tipográfico además del color, y se expone a lectores de pantalla como seleccionado.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-03 (edit) `confirmed`: En composición compacta/media el panel es superpuesto: entra desde el borde inicial en 260 ms ocupando 80% del ancho con máximo 360 (TaoSize
- REQ-07 (edit) `confirmed`: Con movimiento reducido activo, abrir y cerrar el menú no usa los 260/200 ms: solo hay fundido de hasta 120 ms o cambio inmediato, reusando 
- REQ-11 (add) `confirmed`: El shell (encabezado + panel lateral) está montado en la app: `TaoApp` (app/lib/app.dart) usa el shell como `home` en lugar de la pantalla p

**Tasks agregadas:**

- S1: Montar el shell en la app y crear los marcadores de destino. (a) En `app/lib/app.dart`, reemplazar `HomeScreen` (`app/lib/features/home/presentation/home_screen.dart`, pantalla provisional) por el shell como `home` de `TaoApp`, conservando intactos los parámetros `builder` y `navigatorKey` que pasa el entrypoint de development (panel interno). (b) Crear una pantalla de marcador simple por cada uno de los siete destinos del modelo declarativo de REQ-01 (Inicio, Consultas, Biblioteca, Productos, Ajustes, Cuenta, Ayuda), cuyo título sale de la clave i18n del ARB (HU-01-06), sin cadenas literales. (c) Navegación PROVISIONAL: el shell mantiene el destino activo en su propio estado (sin `go_router` ni ningún otro paquete de rutas en `app/pubspec.yaml`) y renderiza el marcador correspondiente; al elegir un destino en el panel superpuesto, el panel se cierra y el indicador activo se mueve. HU-01-09 / TAO-179 reemplazará esta selección por rutas reusando estos mismos marcadores, así que el mapa destino → widget debe quedar declarativo y en un solo lugar. Dejar ejecutables de punta a punta QA-01-08-01 y el caso de borde de REQ-05 (navegar de Inicio a Biblioteca). (valida: REQ-11; rollback: Volver a `HomeScreen` (`app/lib/features/home/presentation/home_screen.dart`) como `home` de `TaoApp` en `app/lib/app.dart` y revertir los marcadores creados. No hay shell, router, menú ni barra inferior anteriores que restaurar: verificado en `origin/epic/EP-01` que no existen.)

**Task ops:**

- edit S1.T2 { rollback="Revertir con git los archivos tocados por esta task. Si el shell queda inutilizable, volver a `HomeScreen` (`app/lib/features/home/presentation/home_screen.dart`) como `home` de `TaoApp` en `app/lib/app.dart`. No hay shell, router, menú ni barra inferior anteriores que restaurar: verificado en `origin/epic/EP-01` que no existen." }
- edit S1.T3 { rollback="Revertir con git los archivos tocados por esta task. Si el shell queda inutilizable, volver a `HomeScreen` (`app/lib/features/home/presentation/home_screen.dart`) como `home` de `TaoApp` en `app/lib/app.dart`. No hay shell, router, menú ni barra inferior anteriores que restaurar: verificado en `origin/epic/EP-01` que no existen." }
- edit S3.T2 { desc="Test que falla si en los fuentes del shell aparecen los números 64, 72, 360, 840 o 600 usados como MEDIDA, es decir como argumento de `height`, `width`, `maxWidth`, `minWidth`, `minHeight`, `maxHeight`, `BoxConstraints`, `SizedBox`, `Size` o como umbral de breakpoint. El matcher debe acotarse a esos usos para no dar falsos positivos: ignora índices, opacidades, duraciones, números dentro de strings y nombres de archivo de goldens (p.ej. `360x800.png`, `1024x768.png`). Esas medidas deben salir de `TaoSize.drawerPhoneMax` (360), `TaoBreakpoint.expandedMin` (840), `TaoBreakpoint.mediumMin` (600) y de los tokens de altura del encabezado (64 / 72)." }

## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5
- [ ] S1.T6
- [ ] S1.T7

**Gate (auto)**: En un emulador de 390x844 (o en el widgetbook del shell) la hamburguesa abre el panel con los siete destinos, el foco entra al primero y queda atrapado, el destino activo se marca y anuncia como seleccionado, y el panel cierra por control, scrim, Escape y Atrás devolviendo el foco al botón.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T5

**Gate (auto)**: En 1024x768 el panel queda fijo junto al contenido, cambiar de destino solo mueve el indicador (sin animación del panel) y el control del encabezado lo oculta/muestra reflowing el contenido; reducido a 839 pasa a superpuesto conservando el destino; con movimiento reducido la apertura es un fundido de <=120 ms; un teléfono girado permanece en vertical.

### Session 3 · T1 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: La suite de goldens del shell genera las ocho imágenes (360x800, 390x844, 768x1024, 1024x768 x escala 100% y 200%) listas para comparar contra maqueta-direccion-consolidada.png, y el test de no-literales falla si alguien mete un Color(0x, un Colors.* o una medida mágica en el shell.

### Session 4 · T0 · open

