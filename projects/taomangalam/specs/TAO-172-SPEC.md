---
id: TAO-172-SPEC
project: taomangalam
ticket: TAO-172
status: approved
---

# Tokens de movimiento y servicio de reducción de movimiento (HU-01-07)

## Resumen ejecutivo

Se agrega la fuente única de movimiento: las duraciones, curvas, distancias y escalas de `motion` de `docs/product/design-system/tokens.v1.json` generadas a Dart sobre lo ya existente en `app/lib/design_system/tokens/tokens.g.dart:326` y `app/lib/design_system/motion.dart:7`, un servicio de reducción de movimiento que combina la preferencia del sistema operativo con la preferencia local por dispositivo, helpers de transición sobre `flutter_animate` (se agrega con `cd app && fvm flutter pub add flutter_animate`) que sustituyen traslación y escala por un fundido de 120 ms o menos, la máquina de estados común (idle, entering, settled, exiting, disposed, interrupted) con salto al estado final al volver de segundo plano, y un chequeo de lint en CI que prohíbe `Duration(milliseconds: ...)` literal en `app/lib` fuera de los tokens generados.
NO incluye: el interruptor de Ajustes que escribe la preferencia local (HU-01-17, se prueba sembrando el almacenamiento), la animación del tablero y los dados (EP-07) ni el splash (HU-01-12).
Se sabe que funciona cuando: con `disableAnimations: true` la navegación entre dos pantallas de muestra no tiene desplazamiento y dura 120 ms o menos, una transición de 240 ms sigue durando 240 ms a 120 Hz, un componente desmontado a los 100 ms no deja tickers activos, el estado final es idéntico en normal y reducido, y el chequeo de lint falla al sembrar una duración literal.
Tamaño: 3 sesiones (T1 + T2 + T2), riesgo bajo, todo dentro de `app/lib/design_system`, `app/test` y un script de CI.
ADVERTENCIA (fuera de alcance, no se implementa): si el resto de `app/lib` ya tiene `Duration(milliseconds: ...)` literales fuera de los tokens, el chequeo de lint los va a marcar; migrarlos es trabajo de los tickets dueños de esos archivos, no de este, y si aparecen hay que reportarlo antes de ampliar el alcance.

Datos a confirmar antes de ejecutar:
- Claves exactas de `motion` en `docs/product/design-system/tokens.v1.json` para duraciones, distancias y escalas (solo están verificadas las curvas en las líneas 176 a 179). Confirmar leyendo el bloque `motion` del JSON.
- API real de `preferencia_local` (tecnologia/20) y nombre exacto de la clave de movimiento por dispositivo. Confirmar en el código de almacenamiento local de `app/lib` y en la ficha tecnologia/20.
- Existencia y ruta del catálogo Widgetbook (`app/widgetbook/`, creado por HU-00-12) y el comando con el que se analiza. Confirmar en el repo antes de la tarea del catálogo.
- Versión de `flutter_animate` que resuelve `fvm flutter pub add` con el Flutter de `.fvmrc`. Queda fijada por el comando, no se eligen otras versiones.
- Nombre del chequeo de lint de `app/lib` ya declarado en `.github/workflows/ci-pr.yml` donde se engancha el guard nuevo.

## Requirements

### REQ-01 `confirmed` `enforcement`
> Fuente: app/lib/design_system/tokens/tokens.g.dart:275-330; app/lib/design_system/motion.dart:117-121; S1.T4

Las duraciones, curvas, distancias y escalas de `motion` ya estan generadas en `app/lib/design_system/tokens/tokens.g.dart` (`TaoMotion` desde la linea 275 con `instant` y `reduced`, `distanceView`, `distanceLocal`, `scalePressed`, `scaleModalStart`, y `TaoMotionCurve` con `curveLinear` en la linea 330): se consumen tal cual, sin tocar el generador de tokens ni escribir constantes de movimiento a mano en ningun otro archivo. `app/lib/design_system/motion.dart` ya cumple esta regla hoy: no declara constantes propias de movimiento, sino que arma sus `Duration` desde los tokens generados (`reduced: Duration(milliseconds: TaoMotion.reduced.toInt())` en `app/lib/design_system/motion.dart:117-121`); las lineas 7, 40 y 43 de ese archivo son comentarios de documentacion, no constantes literales. Este REQ se verifica por CONSTATACION del codigo generado mas el test existente del generador de tokens (S1.T4), no por trabajo nuevo: no hay que escribir un test propio para confirmarlo.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:120

Un servicio de reducción de movimiento expone un valor efectivo que es verdadero cuando lo pide el sistema operativo (Reducir movimiento en iOS, Quitar animaciones en Android) o cuando está activa la preferencia local por dispositivo.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:121

Los helpers de transición ordinaria sobre `flutter_animate` aplican la sustitución automáticamente: con movimiento reducido no hay traslación ni escala y el fundido dura 120 ms o menos; con movimiento normal respetan la duración y la curva del token.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:125

Una máquina de estados común de animación (idle, entering, settled, exiting, disposed, interrupted) gobierna las transiciones, salta al estado final al volver de segundo plano y no deja temporizadores ni controladores activos al desmontar.

### REQ-05 `confirmed` `enforcement`
> Fuente: app/tool/check_design_literals.dart; .github/workflows/ci-pr.yml:278; app/lib/design_system/motion.dart:117-121; pedido de enmienda punto 2

La guarda existente `app/tool/check_design_literals.dart` (ya ejecutada en CI, `.github/workflows/ci-pr.yml:278`) incorpora a su lista de `ForbiddenPattern` un patron para `Duration(milliseconds: ...)` literal en `app/lib`, con la misma exclusion del Dart generado de tokens; no se crea un script nuevo (`scripts/check-motion-durations.sh` no existe). El patron detecta SOLO duraciones con literal numerico, es decir un literal numérico, por ejemplo `Duration(milliseconds: 300)`, y NO las que leen tokens, como `Duration(milliseconds: TaoMotion.reduced.toInt())` en `app/lib/design_system/motion.dart:117-121`, que deben seguir permitidas. El chequeo falla con codigo distinto de 0 nombrando archivo y linea de cada infraccion.

### REQ-06 `confirmed` `enforcement`
> Fuente: app/lib/design_system/motion.dart, app/lib/design_system/app_theme.dart:252, app/lib/design_system/tokens/tokens.g.dart

El movimiento se apoya en los tokens ya generados (`app/lib/design_system/tokens/tokens.g.dart`) y en `TaoMotionTokens` de `app/lib/design_system/motion.dart` sin reescribirlos ni tocar el generador. El limite vigente es de ubicacion, no de cantidad: nada nuevo fuera de `app/lib/design_system/`. Dentro de ese modulo, lo nuevo (helper de curvas, servicio de reduccion, maquina de estados, transiciones) SI puede vivir en archivos propios: `app/lib/design_system/motion_curves.dart` y la carpeta `app/lib/design_system/motion/`, porque son responsabilidades distintas del contrato de tokens. Los consumidores actuales de tokens y tema (por ejemplo `app/lib/design_system/app_theme.dart:252`) siguen compilando sin cambios.

### REQ-07 `confirmed` `enforcement`
> Fuente: app/lib/design_system/tokens/tokens.g.dart:325-330 (TaoMotionCurve)

Un helper de `app/lib/design_system/` (por ejemplo `motion_curves.dart`) traduce los valores de texto de `TaoMotionCurve` (`'cubic-bezier(0.2, 0, 0, 1)'`, `'linear'`) a `Curve` de Flutter (`Cubic` o `Curves.linear`) para que los consuman los helpers de transicion de REQ-03, y falla con un error explicito cuando el texto no coincide con ninguna forma reconocida, en vez de devolver una curva por defecto.
## Tasks

#### S1.T1 — Agregar `flutter_animate` como dependencia de la app con el Flutter de `.fvmrc`, ejecutando una sola vez `cd app && fvm flutter pub add flutter_animate` (adenda 1 del request, DEC-190 y tecnologia/06). Dejar el formato del repo: rango `^x.y.z` en `app/pubspec.yaml` y versión exacta en `app/pubspec.lock`. No probar otras versiones.
Contrato: rollback: `cd app && fvm flutter pub remove flutter_animate` y `git checkout -- app/pubspec.yaml app/pubspec.lock`.. Status: done

#### S1.T4 — Tests y regresión de tokens: ampliar `app/test/tool/generate_design_tokens_test.dart` con los casos de REQ-01 (duraciones, distancias y escalas emitidas con el valor del JSON; curvas existentes sin cambio; curva lineal presente; generación idempotente; error nombrando la clave faltante) y agregar el caso de regresión de REQ-06 que verifica que `motion.dart` no declara constantes propias.
Contrato: rollback: `git checkout -- app/test/tool/generate_design_tokens_test.dart` y borrar los archivos de test nuevos de esta tarea.. Status: done

#### S1.T5 — Crear `app/lib/design_system/motion_curves.dart` con la traduccion de los valores de texto de `TaoMotionCurve` (`'cubic-bezier(x1, y1, x2, y2)'` y `'linear'`) a `Curve` de Flutter: parsear los cuatro numeros del `cubic-bezier` a `Cubic(x1, y1, x2, y2)`, mapear `'linear'` a `Curves.linear`, y lanzar un error explicito que incluya el texto recibido ante cualquier otra forma. No tocar `tokens.g.dart` ni el generador: las curvas ya estan generadas (`TaoMotionCurve`, `curveLinear` en la linea 330).
Contrato: rollback: Borrar `app/lib/design_system/motion_curves.dart` y revertir los imports que lo usen; las curvas vuelven a consumirse como texto desde `TaoMotionCurve`.. Status: done

#### S1.T6 — Agregar `app/test/design_system/motion_curves_test.dart`: para cada constante de `TaoMotionCurve` comparar la `Curve` devuelta contra los valores de `motion` de `tokens.v1.json` (los cuatro puntos de control de cada `cubic-bezier`, y `Curves.linear` para `'linear'`), y cubrir el caso de texto no reconocido verificando que lanza con el texto en el mensaje.
Contrato: rollback: Borrar `app/test/design_system/motion_curves_test.dart`.. Status: done

#### S2.T1 — Implementar el servicio de reducción de movimiento en `app/lib/design_system/motion/reduced_motion_service.dart`: valor efectivo = preferencia del sistema (`MediaQuery.disableAnimations`, que cubre Reducir movimiento de iOS y Quitar animaciones de Android) OR preferencia local por dispositivo leída de `preferencia_local` (tecnologia/20, clave de movimiento por dispositivo). Tratar el almacenamiento vacío o con valor no booleano como movimiento normal, sin lanzar. No escribir la preferencia local: el interruptor de Ajustes es HU-01-17.
Contrato: rollback: Borrar `app/lib/design_system/motion/reduced_motion_service.dart` y revertir su export en `app/lib/design_system/motion.dart`.. Status: done

#### S2.T2 — Implementar la máquina de estados común de animación en `app/lib/design_system/motion/animation_phase.dart`: estados idle, entering, settled, exiting, disposed e interrupted, con transiciones válidas explícitas, salto al estado final ante la reanudación de la app desde segundo plano (observador del ciclo de vida) y liberación de controladores y temporizadores al desmontar. Pedir una transición en disposed es un no-op, no una excepción.
Contrato: rollback: Borrar `app/lib/design_system/motion/animation_phase.dart` y revertir su export en `app/lib/design_system/motion.dart`.. Status: done

#### S2.T3 — Tests y regresión de la fundación: crear `app/test/design_system/motion/reduced_motion_service_test.dart` con la matriz de REQ-02 (sistema activo con local apagada, sistema apagado con local sembrada, ambas apagadas, almacenamiento vacío o con valor inválido, preferencia local no sobrescrita por una sincronización) y `app/test/design_system/motion/animation_phase_test.dart` con la matriz de REQ-04 (recorrido completo, interrupción a mitad, desmontaje a los 100 ms sin tickers activos, pausa y reanudación con estado final aplicado de una vez, transición en disposed sin efecto).
Contrato: rollback: Borrar los dos archivos de test creados en esta tarea.. Status: done

#### S3.T1 — Implementar los helpers de transición ordinaria en `app/lib/design_system/motion/transitions.dart` sobre `flutter_animate`, apoyados en la máquina de estados y en el servicio de reducción: con movimiento normal aplican duración, curva y distancia de los tokens generados; con movimiento reducido eliminan traslación y escala y dejan un fundido de 120 ms o menos (o cambio inmediato), con el mismo estado final. Sin duraciones ni offsets literales en la implementación.
Contrato: rollback: Borrar `app/lib/design_system/motion/transitions.dart` y revertir su export en `app/lib/design_system/motion.dart`.. Status: pending

#### S3.T2 — Crear las pantallas y el diálogo de muestra que usan los helpers, bajo `app/test/design_system/motion/support/`, para que los widget tests y la evidencia visual usen el mismo material: dos pantallas de navegación (QA-01-07-01) y un diálogo (QA-01-07-03). No agregar rutas ni entradas al árbol de la app de producción.
Contrato: rollback: Borrar el directorio `app/test/design_system/motion/support/`.. Status: pending

#### S3.T3 — Publicar el par normal/reducido en el catálogo Widgetbook del repo (app separada creada por HU-00-12, confirmar la ruta antes de tocarla) reutilizando las pantallas de muestra, para la revisión de diseño pedida en el handoff: misma transición en movimiento normal y en movimiento reducido, lado a lado.
Contrato: rollback: Revertir los archivos agregados al catálogo Widgetbook con `git checkout --` sobre su directorio.. Status: pending

#### S3.T4 — Extender `app/tool/check_design_literals.dart` (la guarda ya ejecutada en CI, `.github/workflows/ci-pr.yml:278`) agregando a su lista de `ForbiddenPattern` un patron que detecte un literal numérico, por ejemplo `Duration(milliseconds: 300)`, en `app/lib`, con la misma exclusion del Dart generado de tokens (`app/lib/design_system/tokens/tokens.g.dart`). El patron debe marcar solo literales numericos (por ejemplo `Duration(milliseconds: 300)`) y NO las duraciones que leen tokens (`Duration(milliseconds: TaoMotion.reduced.toInt())` en `app/lib/design_system/motion.dart:117-121`). El chequeo falla con codigo distinto de 0 nombrando archivo y linea de cada infraccion. No se crea un script nuevo: `scripts/check-motion-durations.sh` no existe ni debe existir. Los tests en `app/test/tool/check_design_literals_test.dart` cubren los casos de REQ-05: (1) el arbol actual de `app/lib` pasa sin infracciones, incluido `motion.dart:117-121` que lee tokens; (2) un literal numerico sembrado en un archivo temporal bajo `app/lib` hace fallar el chequeo nombrando archivo y linea; (3) `Duration(milliseconds: TaoMotion.fast.toInt())` no se marca; (4) `app/lib/design_system/tokens/tokens.g.dart` esta exento aunque contenga literales; (5) `app/test` queda fuera del alcance del chequeo.
Contrato: rollback: Quitar el `ForbiddenPattern` de `Duration(milliseconds: ...)` de `app/tool/check_design_literals.dart` y sus casos en `app/test/tool/check_design_literals_test.dart`; la guarda queda con su lista de patrones previa.. Status: pending

#### S3.T5 — Ampliar la regresion de transiciones en `app/test/design_system/motion/transitions_test.dart` con los dos criterios de aceptacion que faltan, ademas de los casos que ya cubre: (a) caso de 120 Hz: con `WidgetTester` en un binding cuyo `SchedulerBinding` avanza a 120 Hz (bombeo de frames cada ~8.33 ms), una transicion ordinaria declarada en 240 ms dura 240 ms de tiempo de animacion (no depende de la cantidad de frames ni de la tasa de refresco); (b) QA-01-07-03: un dialogo de muestra que se abre y se cierra con movimiento reducido activo usa solo un fundido de 120 ms o menos, sin traslacion ni escala (se verifica que no haya `Transform`/`SlideTransition`/`ScaleTransition` con desplazamiento y que el opacity vaya de 0 a 1 dentro de la ventana de `TaoMotion.reduced`). Citar en la descripcion de cada test el criterio que cubre.
Contrato: rollback: Revertir los casos agregados en `app/test/design_system/motion/transitions_test.dart` (120 Hz y QA-01-07-03) y en `app/test/tool/check_design_literals_test.dart`; si esta tarea creo `transitions_test.dart`, borrarlo.. Status: pending
## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por Tokens de movimiento y servicio de reducción de movimiento (HU-01-07)
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: Las duraciones, curvas, distancias y escalas de `motion` ya estan generadas en `app/lib/design_system/tokens/tokens.g.dart` (`TaoMotion` des
- REQ-05 (edit) `confirmed`: La guarda existente `app/tool/check_design_literals.dart` (ya ejecutada en CI, `.github/workflows/ci-pr.yml:278`) incorpora a su lista de `F
- REQ-07 (add) `confirmed`: Un helper de `app/lib/design_system/` (por ejemplo `motion_curves.dart`) traduce los valores de texto de `TaoMotionCurve` (`'cubic-bezier(0.

**Tasks agregadas:**

- S1: Crear `app/lib/design_system/motion_curves.dart` con la traduccion de los valores de texto de `TaoMotionCurve` (`'cubic-bezier(x1, y1, x2, y2)'` y `'linear'`) a `Curve` de Flutter: parsear los cuatro numeros del `cubic-bezier` a `Cubic(x1, y1, x2, y2)`, mapear `'linear'` a `Curves.linear`, y lanzar un error explicito que incluya el texto recibido ante cualquier otra forma. No tocar `tokens.g.dart` ni el generador: las curvas ya estan generadas (`TaoMotionCurve`, `curveLinear` en la linea 330). (valida: REQ-07, REQ-01; rollback: Borrar `app/lib/design_system/motion_curves.dart` y revertir los imports que lo usen; las curvas vuelven a consumirse como texto desde `TaoMotionCurve`.)
- S1: Agregar `app/test/design_system/motion_curves_test.dart`: para cada constante de `TaoMotionCurve` comparar la `Curve` devuelta contra los valores de `motion` de `tokens.v1.json` (los cuatro puntos de control de cada `cubic-bezier`, y `Curves.linear` para `'linear'`), y cubrir el caso de texto no reconocido verificando que lanza con el texto en el mensaje. (valida: REQ-07, test; rollback: Borrar `app/test/design_system/motion_curves_test.dart`.)

**Task ops:**

- delete S1.T2
- delete S1.T3
- edit S3.T4 { desc="Extender la guarda existente `app/tool/check_design_literals.dart` (ya corre en CI, `.github/workflows/ci-pr.yml:278`) agregando a su lista de `ForbiddenPattern` un patron para `Duration(milliseconds: ...)` literal en `app/lib`, reusando la misma exclusion del Dart generado de tokens que aplican los patrones actuales. No crear `scripts/check-motion-durations.sh` ni un job de CI nuevo. Los tests de la guarda van en `app/test/tool/check_design_literals_test.dart`.", rollback="Quitar el `ForbiddenPattern` de `Duration(milliseconds: ...)` de `app/tool/check_design_literals.dart` y sus casos en `app/test/tool/check_design_literals_test.dart`; la guarda queda con su lista de patrones previa.", validates=["REQ-05"], isTest=false, verify=["cd app && dart run tool/check_design_literals.dart","cd app && fvm flutter test test/tool/check_design_literals_test.dart"] }

### Enmienda 2

**Task ops:**

- edit S3.T5 { desc="Ajustar los tests de las transiciones ordinarias en `app/test/design_system/motion/transitions_test.dart` y de la guarda de duraciones literales en `app/test/tool/check_design_literals_test.dart` (la guarda vive como extension de `app/tool/check_design_literals.dart`, hecha en S3.T4; no existen `scripts/check-motion-durations.sh` ni `test/tool/check_motion_durations_test.dart`), cubriendo movimiento normal vs reducido, estado final identico y la deteccion de `Duration(milliseconds: ...)` literal en `app/lib` con la exclusion del Dart generado de tokens.", verify=["cd app && fvm flutter test test/design_system/motion/transitions_test.dart test/tool/check_design_literals_test.dart"] }

### Enmienda 3
**REQs:**

- REQ-06 (edit) `confirmed`: El movimiento se apoya en los tokens ya generados (`app/lib/design_system/tokens/tokens.g.dart`) y en `TaoMotionTokens` de `app/lib/design_s
- REQ-01 (edit) `confirmed`: Las duraciones, curvas, distancias y escalas de `motion` ya estan generadas en `app/lib/design_system/tokens/tokens.g.dart` (`TaoMotion` des
- REQ-05 (edit) `confirmed`: La guarda existente `app/tool/check_design_literals.dart` (ya ejecutada en CI, `.github/workflows/ci-pr.yml:278`) incorpora a su lista de `F
- REQ-07 (edit) `confirmed`: Un helper de `app/lib/design_system/` (por ejemplo `motion_curves.dart`) traduce los valores de texto de `TaoMotionCurve` (`'cubic-bezier(0.

**Task ops:**

- edit S1.T6 { validates=["REQ-01","REQ-07","REQ-06"] }
- edit S3.T5 { desc="Agregar la regresion de transiciones en `app/test/design_system/motion/transitions_test.dart`: con movimiento normal la transicion respeta la duracion y la curva del token; con movimiento reducido no hay traslacion ni escala y el fundido dura 120 ms o menos; el estado final (contenido, foco y datos) es identico en ambos modos; y un caso de regresion de consumidores que importa `app/lib/design_system/app_theme.dart`, construye el tema con los tokens de movimiento sin cambios y verifica que compila y expone los mismos valores. Ademas sumar a `app/test/tool/check_design_literals_test.dart` los casos de la guarda de `Duration(milliseconds: ...)`.", rollback="Borrar `app/test/design_system/motion/transitions_test.dart` y revertir los casos agregados en `app/test/tool/check_design_literals_test.dart`.", validates=["REQ-03","REQ-05","REQ-06"], isTest=true, verify=["cd app && fvm flutter test test/design_system/motion/transitions_test.dart test/tool/check_design_literals_test.dart"] }

### Enmienda 4
**REQs:**

- REQ-01 (edit) `confirmed`: Las duraciones, curvas, distancias y escalas de `motion` ya estan generadas en `app/lib/design_system/tokens/tokens.g.dart` (`TaoMotion` des
- REQ-05 (edit) `confirmed`: La guarda existente `app/tool/check_design_literals.dart` (ya ejecutada en CI, `.github/workflows/ci-pr.yml:278`) incorpora a su lista de `F
- REQ-06 (edit) `confirmed`: El movimiento se apoya en los tokens ya generados (`app/lib/design_system/tokens/tokens.g.dart`) y en `TaoMotionTokens` de `app/lib/design_s

### Enmienda 5
**REQs:**

- REQ-05 (edit) `confirmed`: La guarda existente `app/tool/check_design_literals.dart` (ya ejecutada en CI, `.github/workflows/ci-pr.yml:278`) incorpora a su lista de `F

**Task ops:**

- edit S3.T5 { desc="Ampliar la regresion de transiciones en `app/test/design_system/motion/transitions_test.dart` con los dos criterios de aceptacion que faltan, ademas de los casos que ya cubre: (a) caso de 120 Hz: con `WidgetTester` en un binding cuyo `SchedulerBinding` avanza a 120 Hz (bombeo de frames cada ~8.33 ms), una transicion ordinaria declarada en 240 ms dura 240 ms de tiempo de animacion (no depende de la cantidad de frames ni de la tasa de refresco); (b) QA-01-07-03: un dialogo de muestra que se abre y se cierra con movimiento reducido activo usa solo un fundido de 120 ms o menos, sin traslacion ni escala (se verifica que no haya `Transform`/`SlideTransition`/`ScaleTransition` con desplazamiento y que el opacity vaya de 0 a 1 dentro de la ventana de `TaoMotion.reduced`). Citar en la descripcion de cada test el criterio que cubre.", verify=["cd app && fvm flutter test test/design_system/motion/transitions_test.dart"] }

### Enmienda 6
**REQs:**

- REQ-01 (edit) `confirmed`: Las duraciones, curvas, distancias y escalas de `motion` ya estan generadas en `app/lib/design_system/tokens/tokens.g.dart` (`TaoMotion` des

**Task ops:**

- edit S3.T4 { desc="Extender `app/tool/check_design_literals.dart` (la guarda ya ejecutada en CI, `.github/workflows/ci-pr.yml:278`) agregando a su lista de `ForbiddenPattern` un patron que detecte `Duration(milliseconds: <numero literal>)` en `app/lib`, con la misma exclusion del Dart generado de tokens (`app/lib/design_system/tokens/tokens.g.dart`). El patron debe marcar solo literales numericos (por ejemplo `Duration(milliseconds: 300)`) y NO las duraciones que leen tokens (`Duration(milliseconds: TaoMotion.reduced.toInt())` en `app/lib/design_system/motion.dart:117-121`). El chequeo falla con codigo distinto de 0 nombrando archivo y linea de cada infraccion. No se crea un script nuevo: `scripts/check-motion-durations.sh` no existe ni debe existir. Los tests en `app/test/tool/check_design_literals_test.dart` cubren los casos de REQ-05: (1) el arbol actual de `app/lib` pasa sin infracciones, incluido `motion.dart:117-121` que lee tokens; (2) un literal numerico sembrado en un archivo temporal bajo `app/lib` hace fallar el chequeo nombrando archivo y linea; (3) `Duration(milliseconds: TaoMotion.fast.toInt())` no se marca; (4) `app/lib/design_system/tokens/tokens.g.dart` esta exento aunque contenga literales; (5) `app/test` queda fuera del alcance del chequeo.", validates=["REQ-05"] }
- edit S3.T5 { rollback="Revertir los casos agregados en `app/test/design_system/motion/transitions_test.dart` (120 Hz y QA-01-07-03) y en `app/test/tool/check_design_literals_test.dart`; si esta tarea creo `transitions_test.dart`, borrarlo." }

### Enmienda 7
**REQs:**

- REQ-05 (edit) `confirmed`: La guarda existente `app/tool/check_design_literals.dart` (ya ejecutada en CI, `.github/workflows/ci-pr.yml:278`) incorpora a su lista de `F

**Task ops:**

- edit S3.T4 { desc="Extender `app/tool/check_design_literals.dart` (la guarda ya ejecutada en CI, `.github/workflows/ci-pr.yml:278`) agregando a su lista de `ForbiddenPattern` un patron que detecte un literal numérico, por ejemplo `Duration(milliseconds: 300)`, en `app/lib`, con la misma exclusion del Dart generado de tokens (`app/lib/design_system/tokens/tokens.g.dart`). El patron debe marcar solo literales numericos (por ejemplo `Duration(milliseconds: 300)`) y NO las duraciones que leen tokens (`Duration(milliseconds: TaoMotion.reduced.toInt())` en `app/lib/design_system/motion.dart:117-121`). El chequeo falla con codigo distinto de 0 nombrando archivo y linea de cada infraccion. No se crea un script nuevo: `scripts/check-motion-durations.sh` no existe ni debe existir. Los tests en `app/test/tool/check_design_literals_test.dart` cubren los casos de REQ-05: (1) el arbol actual de `app/lib` pasa sin infracciones, incluido `motion.dart:117-121` que lee tokens; (2) un literal numerico sembrado en un archivo temporal bajo `app/lib` hace fallar el chequeo nombrando archivo y linea; (3) `Duration(milliseconds: TaoMotion.fast.toInt())` no se marca; (4) `app/lib/design_system/tokens/tokens.g.dart` esta exento aunque contenga literales; (5) `app/test` queda fuera del alcance del chequeo." }
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T4
- [x] S1.T5
- [x] S1.T6

**Gate (auto)**: `cd app && fvm flutter test test/design_system/motion_curves_test.dart test/tool/generate_design_tokens_test.dart` pasa: cada curva de TaoMotionCurve se traduce a la Curve de Flutter con los valores del tokens.v1.json (y un texto no reconocido falla con error explícito), y el test del generador verifica duraciones, distancias y escalas ya generadas; `flutter_animate` figura en app/pubspec.yaml y app/pubspec.lock.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: Los tests unitarios del servicio de reducción y de la máquina de estados pasan: la tabla de combinación de preferencias (sistema por un lado, preferencia local por dispositivo por el otro) da reducido en los tres casos esperados, y la máquina recorre idle, entering, settled, exiting, interrupted y disposed sin dejar temporizadores vivos.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4
- [ ] S3.T5

**Gate (auto)**: Con `disableAnimations: true` el widget test de navegación entre dos pantallas de muestra no registra desplazamiento y cierra en 120 ms o menos, el mismo recorrido en movimiento normal termina con el mismo contenido, foco y datos, el par normal/reducido se ve en el catálogo Widgetbook, y sembrar un `Duration(milliseconds: 300)` en `app/lib` hace fallar el chequeo de lint nombrando archivo y línea.

### Session 4 · T0 · open
