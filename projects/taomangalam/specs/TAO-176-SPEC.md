---
id: TAO-176-SPEC
project: taomangalam
ticket: TAO-176
status: approved
---

# Overlays y feedback del sistema visual: dialogo, hoja inferior, pantalla completa, banner, snackbar, estado vacio y skeleton (HU-01-05)

## Resumen ejecutivo

Se construye la capa de overlays y feedback de EP-01 sobre la base ya existente del modulo: dialogo centrado con cierre unificado (boton, toque exterior, Escape, Atras), foco atrapado y devuelto, slot unico de modal, hoja inferior y pantalla completa, banner persistente con Reintentar que reemplaza el estado anterior, snackbar acotado a confirmaciones no criticas, estado vacio y skeleton con umbral, todo reusando tokens (HU-01-01), tokens de movimiento y servicio de reduccion (HU-01-07), i18n ARB (HU-01-06), el resolvedor de imagenes y los atomos de boton.
NO incluye el contenido de cada dialogo o banner (epicas funcionales), las viñetas ilustradas del estado vacio (HU-02-14) ni el modal de registro de tirada (EP-07): el estado vacio debe funcionar sin viñeta.
Se sabe que funciona cuando: las cuatro vias de cierre reproducen la misma salida de 180 ms y devuelven el foco al control de origen, un reintento fallido deja un solo banner visible, una espera de 200 ms no dibuja skeleton, con movimiento reducido el skeleton es estatico y los overlays solo hacen fundido de hasta 120 ms, y los goldens de telefono y tablet muestran la vista anfitriona detras del scrim sin fondo de familia propio (DEC-235).
Tamaño: 5 puntos, 3 sesiones T2 verticales, cada una revisable en el catalogo Widgetbook.
ADVERTENCIA (fuera de alcance, no se implementa): el catalogo Widgetbook ya reparte los siete estados entre moleculas (decision REQ-06 del modulo); si ese reparto choca con los casos nuevos, se reporta, no se redisena aqui. El video corto de apertura y cierre pedido en evidencia es captura manual de QA, no automatizable en las tasks.

Datos a confirmar antes de ejecutar:
- Ruta exacta del paquete Flutter donde viven los overlays del design system y sus tests: el unico paquete Flutter confirmado en el codigo leido es `app/widgetbook` (taomangalam/app/widgetbook/lib/molecules/REVIEW.md:28). Todos los `verify` asumen ese paquete; si el design system vive en otro paquete, ajustar el `cd` y la ruta de los tests antes de ejecutar.
- Nombres reales de los tokens de duracion y del servicio de reduccion de movimiento publicados por HU-01-07 (180/240/280/1200/120 ms y el flag de movimiento reducido): confirmar contra el spec aprobado de HU-01-07 para no declarar constantes nuevas.
- Claves ARB existentes para `Reintentar` y los textos del estado vacio: confirmar en el catalogo i18n de HU-01-06 antes de crear claves nuevas.
- Breakpoints exactos de telefono y tablet usados por los goldens del modulo (definidos en HU-01-03): confirmar para que los goldens nuevos usen los mismos tamaños.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:118

El dialogo centrado se presenta con ancho maximo 560, padding 24, scrim al 65 % que entra en 180 ms y superficie que va de opacidad y escala 0.97 a 1 en 240 ms, y sale en 180 ms.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:123

El cierre del overlay es unico para boton, toque exterior, Escape y Atras: misma salida de 180 ms, foco atrapado mientras esta abierto, foco devuelto al control que lo abrio y titulo anunciado al abrir; en una confirmacion critica el dato se actualiza antes de iniciar la salida.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:131

El modal de operacion usa un slot unico: cuando el flujo requiere otra decision, el overlay abierto cambia su contenido en lugar de apilar un segundo modal encima.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:118

La hoja inferior entra desde su borde natural en 280 ms y la pantalla completa cubre lectura o formularios; ambas usan el mismo contrato de cierre, foco y anuncio que el dialogo.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:706

El banner persistente es la superficie de bloqueos, conflictos y avisos sin conexion, y el error con Reintentar sustituye el estado anterior sin acumular banners.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:131

El snackbar queda acotado a confirmaciones no criticas y reversibles, con entrada de 180 ms y permanencia de 3500 ms; los bloqueos y las acciones irreversibles usan banner o dialogo, con la regla documentada en Widgetbook.

### REQ-07 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:545

El estado vacio muestra titulo, explicacion y accion, con viñeta opcional; sin viñeta sigue siendo comprensible y con viñeta la imagen va sin marco, borde, sombra ni fondo gris, integrada al papel y con ajuste contain sin deformar.

### REQ-08 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:435

El skeleton solo aparece cuando la espera supera 300 ms, usa la geometria final del contenido y anima con ciclo de 1200 ms.

### REQ-09 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:435

Con movimiento reducido activo, el skeleton es estatico y los overlays solo hacen fundido de hasta 120 ms o cambio inmediato.

### REQ-10 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:467

Dialogo, hoja inferior y pantalla completa no traen fondo de familia propio: dejan ver el fondo de la vista anfitriona detras del scrim y el texto largo se apoya sobre la superficie opaca del overlay, en telefono y tablet (DEC-235).

### REQ-11 `inferred` `enforcement`
> Fuente: spec HU-01-07 del modulo EP-01 (tokens de movimiento y servicio de reduccion de movimiento); spec HU-01-01 (tema claro desde tokens.v1.json)

Los overlays y estados reusan lo ya publicado por el modulo: tokens visuales (HU-01-01), tokens de movimiento y servicio de reduccion de movimiento (HU-01-07), claves ARB de i18n (HU-01-06), el resolvedor de imagenes para la viñeta y los atomos de boton; no se declaran tokens, duraciones ni medidas nuevas en los widgets.

### REQ-12 `confirmed` `enforcement`
> Fuente: taomangalam/app/widgetbook/lib/molecules/REVIEW.md:28

Cada overlay y estado queda con su caso en el catalogo Widgetbook (dialogo, hoja inferior, pantalla completa, banner, snackbar, estado vacio con y sin viñeta, skeleton), respetando el reparto de estados entre moleculas ya decidido en el modulo.
## Tasks

#### S1.T1 — Crear la base de overlay del modulo (controlador de presentacion y salida comun) que aplica scrim al 65 % entrando en 180 ms, salida de 180 ms y, cuando el servicio de reduccion de movimiento de HU-01-07 esta activo, solo fundido de hasta 120 ms o cambio inmediato. Todas las duraciones salen de los tokens de movimiento del modulo, sin literales en el widget.
Contrato: rollback: Borrar los archivos nuevos de la base de overlay y su export en el barrel del paquete; ningun widget existente los consume todavia.. Status: done

#### S1.T2 — Implementar el dialogo centrado sobre esa base: ancho maximo 560, padding 24, superficie de opacidad y escala 0.97 a 1 en 240 ms, con cierre unico por boton, toque exterior, Escape y Atras; foco atrapado mientras esta abierto y devuelto al control de origen al cerrar; titulo anunciado al abrir; en confirmacion critica el callback de datos se completa antes de iniciar la salida y, si falla, el dialogo queda abierto.
Contrato: rollback: Borrar el widget de dialogo y su caso de uso; la base de overlay queda sin consumidores y no afecta vistas existentes.. Status: done

#### S1.T3 — Implementar el slot unico de modal: pedir otra decision con un modal abierto reemplaza su contenido, reubica el foco en el primer control del contenido nuevo, no vuelve a animar el scrim y no agrega una segunda superficie al arbol.
Contrato: rollback: Revertir el controlador al comportamiento de apertura simple; el dialogo sigue funcionando con una sola decision.. Status: done

#### S1.T4 — Agregar el caso del dialogo al catalogo Widgetbook sobre una vista anfitriona con fondo de familia, con interruptor de movimiento reducido, sin declarar fondo propio del dialogo (DEC-235) y respetando el reparto de estados entre moleculas ya decidido en app/widgetbook/lib/molecules/REVIEW.md:28.
Contrato: rollback: Quitar el caso del catalogo; el resto de Widgetbook sigue compilando sin cambios.. Status: done

#### S1.T5 — Tests de la etapa: widget tests de cierre por las cuatro vias midiendo 180 ms en cada una y verificando el foco devuelto al boton de origen (QA-01-05-01), del anuncio del titulo al abrir, del foco atrapado al recorrer con Tab, del commit de datos antes de la salida en confirmacion critica, del slot unico sin segundo scrim y de la variante con movimiento reducido (sin escala, maximo 120 ms).
Contrato: rollback: Borrar los archivos de test agregados en esta etapa.. Status: done

#### S2.T1 — Implementar la hoja inferior (entrada desde su borde natural en 280 ms) y la pantalla completa para lectura o formularios reusando la base de overlay y su contrato de cierre, foco y anuncio, sin declarar duraciones de salida propias ni fondo de familia propio (DEC-235).
Contrato: rollback: Borrar los dos widgets nuevos y sus exports; el dialogo de la etapa anterior sigue intacto.. Status: done

#### S2.T2 — Implementar el banner persistente para bloqueos, conflictos y avisos sin conexion, con accion Reintentar que sustituye el estado anterior: un error nuevo reemplaza al banner visible en vez de apilarse, y el exito del reintento lo retira. Textos y etiqueta Reintentar desde las claves ARB del catalogo i18n del modulo.
Contrato: rollback: Borrar el widget de banner y su controlador de estado; las vistas no lo consumen todavia.. Status: done

#### S2.T3 — Implementar el snackbar de confirmacion no critica y reversible (entrada 180 ms, permanencia 3500 ms, reemplazo de la confirmacion anterior reiniciando el tiempo) con guarda en modo debug que falla si se usa para un bloqueo o una accion irreversible, y documentar esa regla en el caso de Widgetbook.
Contrato: rollback: Borrar el widget de snackbar y su guarda; el banner sigue cubriendo los avisos.. Status: done

#### S2.T4 — Tests de la etapa: widget tests de la hoja inferior (280 ms de entrada, cierre con Atras y foco devuelto) y de la pantalla completa (foco atrapado con formulario, titulo anunciado); test del reemplazo de banner con dos fallos seguidos de Reintentar dejando un solo banner (QA-01-05-02) y del retiro al reintentar con exito; tests de tiempos del snackbar (180/3500, reemplazo) y del error en debug ante un uso de bloqueo.
Contrato: rollback: Borrar los archivos de test agregados en esta etapa.. Status: done

#### S3.T1 — Implementar el estado vacio con titulo, explicacion, accion (atomo de boton del modulo) y viñeta opcional: la viñeta se pide al resolvedor de imagenes por familia y tamaño, se dibuja con ajuste contain sin marco, borde, sombra ni fondo gris, y si el resolvedor no la encuentra el estado se dibuja completo igual sin reservar hueco.
Contrato: rollback: Borrar el widget de estado vacio y su caso de Widgetbook.. Status: done

#### S3.T2 — Implementar el skeleton con la geometria final del contenido: no se dibuja si la espera no supera 300 ms, anima con ciclo de 1200 ms cuando aparece, se vuelve estatico con movimiento reducido y cancela su temporizador de umbral al desmontarse.
Contrato: rollback: Borrar el widget de skeleton y su temporizador; las vistas vuelven a mostrar el contenido sin estado intermedio.. Status: done

#### S3.T3 — Agregar al catalogo Widgetbook los casos de hoja inferior, pantalla completa, banner, snackbar, estado vacio con y sin viñeta y skeleton, cada uno con interruptor de movimiento reducido y montados sobre la vista anfitriona con fondo, y generar los goldens de los siete casos en telefono y tablet para la comparacion de Diseño contra navegacion-y-acciones/maqueta-direccion-consolidada.png y vistas-clave/propuesta-01-inicio-tablero-tirada.png (doc 43 seccion 9, DEC-235).
Contrato: rollback: Quitar los casos nuevos del catalogo y borrar los goldens generados en esta task.. Status: done

#### S3.T4 — Tests de la etapa: unitarias del umbral del skeleton (200 ms sin skeleton segun QA-01-05-03, 300 ms sin skeleton, 301 ms con skeleton, ciclo de 1200 ms, cancelacion del timer al desmontar); widget tests del estado vacio sin viñeta, con viñeta 2:1 que no se deforma y con viñeta ausente; test de movimiento reducido con skeleton estatico entre el frame 0 y el de 1200 ms; regresion de la base de overlay (las cuatro vias de cierre siguen en 180 ms tras los cambios de la etapa).
Contrato: rollback: Borrar los archivos de test agregados en esta etapa.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: El cierre del overlay es unico para boton, toque exterior, Escape y Atras: misma salida de 180 ms, foco atrapado mientras esta abierto, foco devuelto al control que lo abrio y titulo anunciado al abrir; en una confirmacion critica el dato se actualiza antes de iniciar la salida
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: El modal de operacion usa un slot unico: cuando el flujo requiere otra decision, el overlay abierto cambia su contenido en lugar de apilar un segundo modal encima.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
3. **Qué:** Verificar en runtime: La hoja inferior entra desde su borde natural en 280 ms y la pantalla completa cubre lectura o formularios; ambas usan el mismo contrato de cierre, foco y anuncio que el dialogo.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
4. **Qué:** Verificar en runtime: Dialogo, hoja inferior y pantalla completa no traen fondo de familia propio: dejan ver el fondo de la vista anfitriona detras del scrim y el texto largo se apoya sobre la superficie opaca del overlay, en telefono y tablet (DEC-235).
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
5. **Qué:** Verificar en runtime: Los overlays y estados reusan lo ya publicado por el modulo: tokens visuales (HU-01-01), tokens de movimiento y servicio de reduccion de movimiento (HU-01-07), claves ARB de i18n (HU-01-06), el resolvedor de imagenes para la viñeta y los atomos de boton; no se declaran tokens, 
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
6. **Qué:** Verificar en runtime: Cada overlay y estado queda con su caso en el catalogo Widgetbook (dialogo, hoja inferior, pantalla completa, banner, snackbar, estado vacio con y sin viñeta, skeleton), respetando el reparto de estados entre moleculas ya decidido en el modulo.
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

**Gate (auto)**: En Widgetbook, el caso Dialogo abre sobre una vista con fondo, se cierra por boton, toque exterior, Escape y Atras con la misma salida de 180 ms, devuelve el foco al control que lo abrio, anuncia su titulo y, al pedir otra decision, cambia su contenido sin apilar un segundo modal ni un segundo scrim.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4

**Gate (auto)**: En Widgetbook: la hoja inferior entra desde el borde inferior en 280 ms y la pantalla completa abre para formulario, ambas cierran con Atras devolviendo el foco; dos errores seguidos con Reintentar dejan un solo banner visible; el snackbar de confirmacion se retira solo a los 3500 ms y el caso documenta que bloqueos e irreversibles no lo usan.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: En Widgetbook: el estado vacio sin viñeta muestra titulo, explicacion y accion y se entiende igual; con viñeta la imagen se ve sin marco ni fondo gris y sin deformarse; una carga de 200 ms no dibuja skeleton y una de 1000 ms si, con ciclo de 1200 ms; con movimiento reducido el skeleton queda quieto. Los goldens de telefono y tablet de los siete casos quedan generados para la comparacion de Diseño (QA-01-05-04).

### Session 4 · T0 · open
