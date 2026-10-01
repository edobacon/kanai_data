---
id: TAO-172-SPEC
project: taomangalam
ticket: TAO-172
status: approved
---

# Tokens de movimiento y servicio de reduccion de movimiento (HU-01-07)

## Resumen ejecutivo

Se construye la fuente unica de duraciones, curvas, distancias y escalas de movimiento generada desde tokens.v1.json a tipos Dart, el servicio que combina la preferencia de reducir movimiento del sistema operativo con la preferencia local por dispositivo, los helpers de transicion sobre flutter_animate que sustituyen traslacion y escala por fundido de hasta 120 ms o cambio inmediato, la maquina de estados comun de animacion y el lint que prohibe duraciones literales en app/lib.
NO incluye el interruptor de Ajustes (HU-01-17: la preferencia local se prueba sembrandola en el almacenamiento), ni la animacion del tablero y los dados (EP-07), ni el splash (HU-01-12), ni un generador de tokens nuevo (se extiende el de HU-01-01) ni un addon de Widgetbook nuevo (se reusa app/widgetbook/lib/reduced_motion_addon.dart:16).
Se sabe que funciona cuando: con disableAnimations activo la transicion de muestra no traslada ni escala y dura 120 ms o menos; con preferencia local activa y sistema sin reduccion tambien se reduce; el estado final es identico con y sin reduccion; un componente desmontado a los 100 ms no deja tickers; una transicion de 240 ms dura 240 ms en 120 Hz; y el lint falla ante Duration(milliseconds: ...) fuera del archivo generado.
Tamanio estimado: 3 sesiones (T1 + T2 + T2), coherente con los 3 puntos publicados; no excede el techo de 4 sesiones.
ADVERTENCIA (fuera de alcance, no se implementa): los consumidores HU-01-03 a HU-01-05, HU-01-08, HU-01-09, HU-01-12 y EP-07 deberan migrar sus duraciones literales cuando se active el lint; si alguno ya tiene codigo en app/lib, el lint puede romperlo y esa migracion es trabajo de esos tickets, no de este.

Datos a confirmar antes de ejecutar:
- Ruta y comando exactos del generador de tokens de HU-01-01 y del archivo Dart generado (confirmar en el spec/codigo de HU-01-01 antes de extenderlo).
- Ruta real de los tests del paquete app (se asume app/test/...) y del paquete widgetbook.
- Clave exacta de movimiento por dispositivo en `preferencia_local` y mecanismo de almacenamiento (tecnologia/20, DEC-102).
- Version resuelta de flutter_animate por `fvm flutter pub add` (se fija la que resuelva, no se prueban otras) y version de Flutter en .fvmrc.
- Mecanismo de lint vigente del repo para reglas custom de Dart (custom_lint, grep en CI u otro) y como registrar la excepcion del archivo generado.

## Requirements

#### REQ-01 `confirmed`
> Fuente: docs/product/design-system/tokens.v1.json:176
> Necesidad: build
Los valores de `motion` de tokens.v1.json (duraciones, curvas curveStandard/curveEnter/curveExit/curveEmphasis y lineal, distancias y escalas) se exponen como tipos Dart generados, fuente unica para toda la app.

#### REQ-02 `confirmed`
> Fuente: docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:120
> Necesidad: build
Un servicio de reduccion de movimiento resuelve el estado efectivo combinando la preferencia del sistema operativo (Reducir movimiento en iOS, Quitar animaciones en Android) con una preferencia local por dispositivo guardada en `preferencia_local`.

#### REQ-03 `confirmed`
> Fuente: docs/product/44_guia_maestra_de_animaciones.md:52
> Necesidad: build
Los helpers de transicion ordinaria sobre flutter_animate aplican automaticamente la sustitucion: con movimiento reducido no hay traslacion ni escala y la transicion es un fundido de hasta 120 ms o un cambio inmediato, con el mismo estado final que el movimiento normal.

#### REQ-04 `confirmed`
> Fuente: docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:121
> Necesidad: build
Una maquina de estados comun de animacion (idle, entering, settled, exiting, disposed, interrupted) gobierna las transiciones, salta al estado final al volver de segundo plano y libera tickers y controladores al desmontar.

#### REQ-05 `confirmed`
> Fuente: docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:125
> Necesidad: build
El lint de app/lib falla ante duraciones literales (`Duration(milliseconds: ...)`) fuera del archivo de tokens generado.

#### REQ-06 `confirmed`
> Fuente: app/widgetbook/lib/reduced_motion_addon.dart:16
> Necesidad: build
Se reusa lo existente: el generador de tokens de HU-01-01 se extiende (no se crea otro), el addon de movimiento reducido de Widgetbook se reusa como fuente de la preferencia en el catalogo, y flutter_animate se agrega una sola vez con `cd app && fvm flutter pub add flutter_animate` dejando `^x.y.z` en pubspec.yaml y la version exacta en pubspec.lock.

## Tasks

#### S1.T1 — Agregar la dependencia flutter_animate al paquete app con `cd app && fvm flutter pub add flutter_animate` (Flutter de .fvmrc), dejando el rango `^x.y.z` en app/pubspec.yaml y la version exacta en app/pubspec.lock, en el formato del repo. No probar otras versiones ni agregarla al paquete widgetbook si ya la hereda.
Contrato: rollback: `cd app && fvm flutter pub remove flutter_animate` y restaurar app/pubspec.yaml y app/pubspec.lock desde el commit anterior.. Status: pending

#### S1.T2 — Extender el generador de tokens de HU-01-01 (mismo punto de entrada, no crear uno nuevo) para emitir el grupo `motion` de docs/product/design-system/tokens.v1.json:176-179 como tipos Dart: duraciones como Duration, curveStandard/curveEnter/curveExit/curveEmphasis y lineal como curvas, distancias y escalas como valores tipados. Si falta una clave del grupo, la generacion debe fallar nombrando la clave.
Contrato: rollback: Revertir los cambios del generador y borrar el archivo Dart de tokens de movimiento generado; regenerar para volver al output previo.. Status: pending

#### S1.T3 — Tests unitarios de los tokens de movimiento generados: igualdad de valores contra tokens.v1.json, tipado de duraciones y distancias, duracion de fundido reducido de 120 ms o menos, error ante clave faltante y no regresion del tema claro de HU-01-01.
Contrato: rollback: Eliminar el archivo de test agregado.. Status: pending

#### S2.T1 — Implementar el servicio de reduccion de movimiento: lee la preferencia del sistema (disableAnimations de MediaQuery, que cubre Reducir movimiento en iOS y Quitar animaciones en Android) y la preferencia local por dispositivo guardada en `preferencia_local` bajo la clave de movimiento por dispositivo (tecnologia/20, DEC-102: no se sobrescribe al sincronizar). Resuelve reducido si cualquiera de las dos esta activa, notifica cambios en caliente y, ante almacenamiento ilegible o valor no booleano, cae a la preferencia del sistema sin lanzar. El interruptor de Ajustes es HU-01-17: aqui la preferencia local solo se lee y se siembra en tests.
Contrato: rollback: Eliminar el servicio y su registro en el arbol de providers; ningun consumidor previo depende de el.. Status: pending

#### S2.T2 — Implementar la maquina de estados comun de animacion con los estados idle, entering, settled, exiting, disposed e interrupted: transiciones validas explicitas, rechazo con error de las invalidas, salto al estado final al volver de segundo plano (sin reanudar a mitad de frame) y liberacion de tickers y controladores en dispose.
Contrato: rollback: Eliminar el archivo de la maquina de estados y sus tests; no hay consumidores hasta la sesion siguiente.. Status: pending

#### S2.T3 — Tests unitarios del servicio de reduccion (las cuatro combinaciones sistema x preferencia local, cambio en caliente, almacenamiento ilegible) y de la maquina de estados (recorrido completo, interrupcion, vuelta de segundo plano, transicion invalida y desmonte a los 100 ms sin tickers activos, QA-01-07-02).
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S3.T1 — Implementar los helpers de transicion ordinaria sobre flutter_animate que consumen los tokens de movimiento y el servicio de reduccion: con movimiento normal aplican distancia, escala y curva de los tokens; con movimiento reducido suprimen traslacion y escala y dejan un fundido de hasta 120 ms o un cambio inmediato (duracion 0, sin frames intermedios). Las duraciones se expresan en tiempo real para que una transicion de 240 ms dure 240 ms tambien a 120 Hz. Los helpers usan la maquina de estados de la sesion anterior.
Contrato: rollback: Eliminar el archivo de helpers; las pantallas de muestra que los usan se retiran en la misma reversion.. Status: pending

#### S3.T2 — Agregar al catalogo de Widgetbook los casos de muestra del par normal/reducido (navegacion entre dos pantallas de muestra y apertura y cierre de un dialogo de muestra para QA-01-07-03) reusando el addon existente app/widgetbook/lib/reduced_motion_addon.dart:16 registrado en app/widgetbook/lib/widgetbook_addons.dart, conectandolo como fuente de la preferencia del servicio. No crear un addon nuevo.
Contrato: rollback: Quitar los casos agregados del catalogo y dejar widgetbook_addons.dart como estaba.. Status: pending

#### S3.T3 — Agregar la regla de lint que falla ante `Duration(milliseconds: ...)` en app/lib, con excepcion del archivo de tokens de movimiento generado, informando archivo y linea. Usar el mecanismo de lint ya vigente en el repo (confirmar cual antes de implementar) y dejarla enganchada al mismo comando que corre CI.
Contrato: rollback: Quitar la regla y su registro en la configuracion de analisis; el resto del codigo no cambia.. Status: pending

#### S3.T4 — Widget tests de las transiciones: QA-01-07-01 con disableAnimations=true (sin desplazamiento y duracion de 120 ms o menos), comparacion del estado final (contenido, foco y datos) entre movimiento normal y reducido, transicion de 240 ms a 120 Hz simulados, modo cambio inmediato sin frames intermedios y caso de regresion del lint (literal de prueba detectado, archivo generado exceptuado).
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por Tokens de movimiento y servicio de reduccion de movimiento (HU-01-07)
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket
