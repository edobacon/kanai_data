---
id: TAO-179-SPEC
project: taomangalam
ticket: TAO-179
status: approved
---

# Rutas con go_router, enlaces profundos internos, retorno conservado y transiciones adelante/atras (HU-01-09)

## Resumen ejecutivo

Se monta la navegacion real de la app: tabla de rutas go_router con nombres estables y parametros tipados, una pantalla de marcador por destino principal del consultor (Inicio, Consultas, Biblioteca y Productos, Ajustes, Cuenta, Ayuda) con titulos desde el ARB, ruta desconocida redirigida a Inicio con log de desarrollo, enlaces profundos internos que reconstruyen la pila hasta el destino principal, retorno que conserva scroll/filtro/seleccion/busqueda sin animar la restauracion, y transiciones adelante (saliente 180 ms con 8-12 px, entrante 240 ms) e inversa al volver, con encabezado estable, cancelacion por Atras, guarda de doble toque y movimiento reducido (fundido <=120 ms o inmediato) reusando los tokens y el servicio de HU-01-07. NO incluye: menu, panel lateral, hamburguesa ni destino activo (HU-01-08), guardas por capacidad (HU-01-11), configuracion de dominios de enlaces universales/App Links, ni las rutas concretas de las epicas funcionales. Se verifica observando: la app arranca en Inicio y navega a cada marcador; una ruta inexistente muestra Inicio sin excepcion; un enlace profundo abierto con la app cerrada deja Atras en el destino principal; una lista desplazada 40 elementos con filtro vuelve con el mismo offset y filtro; y los tiempos de transicion salen de los tokens de movimiento, no de literales. Tamano estimado: 3 sesiones T2 (aprox. 2-3 h cada una), sin cambios de backend ni de datos.

ADVERTENCIA (fuera de alcance, no se implementa): el dominio para enlaces universales y App Links es un pendiente externo (DEC-230); esta historia deja las rutas listas pero no configura `AndroidManifest`/`Info.plist` ni archivos de asociacion de dominio. Tampoco se toca el entrypoint de development mas alla de conservar `builder` y `navigatorKey`.

Datos a confirmar antes de ejecutar:
- Version exacta de `go_router` que resuelve `fvm flutter pub add go_router` con el Flutter de `.fvmrc`: el request fija el comando y el formato (`^x.y.z` en `pubspec.yaml`, version exacta en `pubspec.lock`) pero no el numero; se confirma al correr el comando, sin probar otras versiones.
- Claves ARB de los titulos de los seis destinos principales (doc 36 seccion I): el ARB existente solo expone `appTitle` y `homeProvisionMessage` (app/lib/features/home/presentation/home_screen.dart:19-20); hay que definir las claves nuevas en `app/lib/l10n/*.arb` y confirmar su nomenclatura con las convenciones de HU-01-06.
- Nombres canonicos de las rutas (`/`, `/consultas`, etc.) y de la ruta de segundo nivel usada para el enlace profundo de prueba: no estan fijados en el request; se fijan al aprobar el spec para no romper enlaces al agregar vistas.
- Nombres exactos de los tokens de movimiento y de la API del servicio de reduccion de movimiento de HU-01-07 (spec existente del modulo): confirmar en el codigo de la rama acumuladora antes de escribir las duraciones.
- Esquema/host usado por el enlace profundo interno en el emulador para QA-01-09-01 (`adb shell am start`): depende del `applicationId` actual de `app/`.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/app/lib/features/home/presentation/home_screen.dart:5

La app declara una tabla de rutas go_router con nombres estables y parametros tipados, con una pantalla de marcador por destino principal del consultor (Inicio, Consultas, Biblioteca y Productos, Ajustes, Cuenta, Ayuda), montada en TaoApp reemplazando la pantalla provisional de inicio y conservando los parametros `builder` y `navigatorKey` que usa el entrypoint de development.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1004

Una ruta inexistente redirige a Inicio sin error visible y registra un log de desarrollo con la ruta pedida, sin parametros ni datos personales.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:927

Un enlace profundo interno a una ruta de segundo nivel abre esa ruta y reconstruye la pila hasta su destino principal, de modo que Atras lleva al destino principal y no fuera de la app.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1004

La navegacion hacia adelante anima la vista saliente con desvanecido de 180 ms y desplazamiento de 12 px en telefono (8 a 12 px en tablet) y la entrante en 240 ms; al volver el sentido se invierte, el encabezado permanece estable, y presionar Atras durante una transicion en curso la cancela y retrocede desde el valor visual actual sin duplicar la navegacion.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1004

Con movimiento reducido activo, navegar hacia adelante o hacia atras produce solo un fundido de hasta 120 ms o un cambio inmediato, sin desplazamiento.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1004

Un doble toque rapido sobre un elemento navegable abre una sola ruta.

### REQ-07 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:927

Al volver de un detalle, la vista anterior conserva posicion de scroll, filtro activo, seleccion y texto de busqueda, y la restauracion ocurre sin animacion.

### REQ-08 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1004

Al entrar a una vista el foco va al titulo de la vista entrante; al volver, el foco regresa al elemento de origen de la navegacion.

### REQ-09 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/features/home/presentation/home_screen.dart:16

Los titulos de las pantallas de marcador y todo texto visible nuevo salen del ARB via AppLocalizations, sin literales en el codigo, igual que la pantalla provisional existente, para no romper las guardas de lint de i18n de CI (HU-01-06).

### REQ-10 `confirmed` `enforcement`
> Fuente: taomangalam/docs/product/tecnologia/06_bibliotecas.md:29

go_router se agrega una sola vez con `cd app && fvm flutter pub add go_router` (Flutter de `.fvmrc`), en el formato del repo (`^x.y.z` en `pubspec.yaml`, version exacta en `pubspec.lock`), sin probar otras versiones; y las duraciones y curvas de las transiciones se toman de los tokens de movimiento y del servicio de reduccion de movimiento de HU-01-07, sin duraciones literales nuevas.
## Tasks

#### S1.T1 — Agregar go_router a la app con `cd app && fvm flutter pub add go_router` (Flutter de `.fvmrc`), dejando `go_router: ^x.y.z` en `app/pubspec.yaml` y la version exacta resuelta en `app/pubspec.lock`. No probar otras versiones ni fijar la version a mano.
Contrato: rollback: `cd app && fvm flutter pub remove go_router` y revertir `app/pubspec.yaml` y `app/pubspec.lock` con git checkout.. Status: done

#### S1.T2 — Crear la tabla de rutas en `app/lib/navigation/` (constantes de nombre de ruta estables + configuracion de GoRouter) con parametros tipados: cada ruta expone un objeto de parametros parseado, no un Map<String, String> crudo. Declarar una ruta por destino principal del consultor (Inicio, Consultas, Biblioteca y Productos, Ajustes, Cuenta, Ayuda) y una ruta de segundo nivel de detalle con parametro tipado para probar enlaces profundos.
Contrato: rollback: Borrar los archivos nuevos de `app/lib/navigation/`; la app vuelve a no tener router.. Status: done

#### S1.T3 — Crear una pantalla de marcador por destino principal bajo `app/lib/features/<destino>/presentation/`, con un encabezado PROVISIONAL simple y compartido (solo titulo, sin menu, panel lateral ni hamburguesa: eso es HU-01-08) y el titulo tomado del ARB via `AppLocalizations.of(context)` igual que `home_screen.dart:16`. Agregar al ARB las claves de titulo de los siete destinos.
Contrato: rollback: Borrar las pantallas de marcador y las claves ARB nuevas; regenerar localizaciones.. Status: done

#### S1.T4 — Montar el router en `TaoApp` (`app/lib/app.dart`) con MaterialApp.router, reemplazando la pantalla provisional `features/home/presentation/home_screen.dart` por el marcador de Inicio, y CONSERVANDO los parametros `builder` y `navigatorKey` que usa el entrypoint de development para el panel interno (el navigatorKey debe pasar al navigator raiz del router).
Contrato: rollback: git checkout de `app/lib/app.dart` y restaurar `home_screen.dart` como pantalla inicial.. Status: done

#### S1.T5 — Implementar el manejo de ruta desconocida: redireccion a Inicio sin error visible y log de desarrollo que registre solo el path pedido, sin query string ni valores de parametros (los parametros de ruta no llevan datos personales).
Contrato: rollback: Quitar el errorBuilder/redirect y el logger; el router vuelve al comportamiento por defecto de go_router.. Status: done

#### S1.T6 — Tests de la tabla de rutas y del manejo de ruta desconocida en `app/test/navigation/app_router_test.dart`: arranque en Inicio, navegacion por nombre a los siete destinos con titulo del ARB, parseo de parametros tipados, parametro invalido sin excepcion, QA-01-09-02 (ruta inexistente muestra Inicio sin excepcion), log emitido una vez con el path y sin parametros, y regresion de que `builder` y `navigatorKey` siguen aplicandose.
Contrato: rollback: Borrar `app/test/navigation/app_router_test.dart`.. Status: done

#### S2.T1 — Implementar la pagina de transicion compartida (CustomTransitionPage) en `app/lib/navigation/`: saliente con desvanecido de 180 ms y desplazamiento de 12 px en telefono (8 a 12 px en tablet, segun ancho), entrante de 240 ms, y sentido invertido al volver. Las duraciones y curvas se toman de los tokens de movimiento de HU-01-07; prohibido escribir `Duration(milliseconds: ...)` literal.
Contrato: rollback: Volver a las paginas por defecto de go_router (MaterialPage) borrando el archivo de transiciones.. Status: done

#### S2.T2 — Aplicar movimiento reducido a las transiciones consultando el servicio de reduccion de movimiento de HU-01-07 (unico origen de la decision; no leer MediaQuery directo en las paginas): fundido de hasta 120 ms o cambio inmediato, con desplazamiento 0 px en ambos sentidos, y respuesta al cambio de preferencia sin reiniciar la app.
Contrato: rollback: Quitar la rama de movimiento reducido; las transiciones vuelven a usar siempre las duraciones completas.. Status: done

#### S2.T3 — Mantener el encabezado provisional estable durante la transicion (misma key/identidad de widget, sin reconstruccion que lo haga parpadear) y hacer que Atras durante una transicion en curso la cancele y retroceda desde el valor visual actual, sin duplicar la navegacion ni dejar rutas huerfanas en la pila.
Contrato: rollback: Revertir el manejo de interrupcion y la key del encabezado; vuelve el comportamiento por defecto del navigator.. Status: done

#### S2.T4 — Agregar la guarda de navegacion idempotente: un doble toque rapido sobre un elemento navegable abre una sola ruta (dedupe por destino en vuelo mientras dura la transicion), sin bloquear una navegacion legitima posterior ni el Atras.
Contrato: rollback: Quitar la guarda; cada toque vuelve a invocar la navegacion directamente.. Status: done

#### S2.T5 — Mover el foco al titulo de la vista entrante al terminar la transicion y devolverlo al elemento navegable de origen al volver; si el elemento de origen ya no existe, el foco cae en el titulo de la vista de retorno. El cambio de foco no debe disparar navegacion ni reconstruir el encabezado.
Contrato: rollback: Quitar el manejo de FocusNode/foco automatico; el foco vuelve al comportamiento por defecto de Flutter.. Status: done

#### S2.T6 — Widget tests de transiciones y accesibilidad en `app/test/navigation/app_transitions_test.dart`: tiempos y desplazamiento de ida y vuelta medidos con pump por intervalos, desplazamiento dentro de 8-12 px en ancho de tablet, interrupcion con Atras a los 90 ms (una sola ruta y arranque desde el valor visual actual), movimiento reducido (<=120 ms y 0 px) y su regresion con movimiento normal, doble toque (una sola instancia; segundo toque a los 400 ms si navega), encabezado sin reconstruccion, y foco al titulo al entrar / al origen al volver.
Contrato: rollback: Borrar `app/test/navigation/app_transitions_test.dart`.. Status: done

#### S3.T1 — Implementar la reconstruccion de pila para enlaces profundos internos: al abrir una ruta de segundo nivel (con la app cerrada o abierta), la pila queda destino principal + detalle, de modo que Atras va al destino principal y no fuera de la app; un enlace a un destino de primer nivel no apila nada por debajo.
Contrato: rollback: Quitar la construccion de pila (volver a push plano de la ruta destino).. Status: done

#### S3.T2 — Agregar en el marcador que lo requiere (Consultas o Biblioteca y Productos) una lista de al menos 60 elementos generados en memoria con filtro de texto, campo de busqueda y seleccion, suficiente para desplazar 40 elementos. Lista acotada y en memoria: nada de datos reales ni de red (la navegacion no depende de red).
Contrato: rollback: Reemplazar la lista por el contenido de marcador simple anterior.. Status: done

#### S3.T3 — Conservar el estado de la vista anterior al volver: posicion de scroll, filtro activo, seleccion y texto de busqueda, usando restauracion de estado (PageStorage/RestorationMixin) y aplicando el offset ya en el primer frame del remontaje, sin animar la restauracion. Al REEMPLAZAR la ruta (no apilar) el estado conservado se descarta.
Contrato: rollback: Quitar el mixin/claves de restauracion; la lista vuelve a montarse en offset 0 y sin filtro.. Status: done

#### S3.T4 — Tests de enlace profundo y retorno conservado en `app/test/navigation/deep_link_restoration_test.dart` (y la prueba de integracion equivalente): QA-01-09-01 (enlace profundo con app cerrada, Atras al destino principal y luego salida), enlace profundo con app abierta sin apilar el destino anterior, enlace profundo a ruta de segundo nivel inexistente que cae en Inicio con pila de un destino, QA-01-09-03 (offset y filtro identicos al volver), busqueda y seleccion conservadas, offset final en el primer frame del regreso, caso base en offset 0 sin filtro, y descarte del estado al reemplazar la ruta.
Contrato: rollback: Borrar `app/test/navigation/deep_link_restoration_test.dart`.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: La app declara una tabla de rutas go_router con nombres estables y parametros tipados, con una pantalla de marcador por destino principal del consultor (Inicio, Consultas, Biblioteca y Productos, Ajustes, Cuenta, Ayuda), montada en TaoApp reemplazando la pantalla provisional de
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: Los titulos de las pantallas de marcador y todo texto visible nuevo salen del ARB via AppLocalizations, sin literales en el codigo, igual que la pantalla provisional existente, para no romper las guardas de lint de i18n de CI (HU-01-06).
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1

**Task ops:**

- edit S1.T3 { desc="Crear una pantalla de marcador por destino principal bajo `app/lib/features/<destino>/presentation/`, con un encabezado PROVISIONAL simple y compartido (solo titulo, sin menu, panel lateral ni hamburguesa: eso es HU-01-08) y el titulo tomado del ARB via `AppLocalizations.of(context)` igual que `home_screen.dart:16`. Agregar al ARB las claves de titulo de los siete destinos." }
- edit S1.T6 { desc="Tests de la tabla de rutas y del manejo de ruta desconocida en `app/test/navigation/app_router_test.dart`: arranque en Inicio, navegacion por nombre a los siete destinos con titulo del ARB, parseo de parametros tipados, parametro invalido sin excepcion, QA-01-09-02 (ruta inexistente muestra Inicio sin excepcion), log emitido una vez con el path y sin parametros, y regresion de que `builder` y `navigatorKey` siguen aplicandose." }

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5
- [x] S1.T6

**Gate (auto)**: En el emulador, la app arranca en el marcador de Inicio (ya no en la pantalla provisional), navega a cada uno de los seis destinos principales con su titulo del ARB, y una ruta inventada muestra Inicio con un log de desarrollo en consola y sin excepcion.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5
- [x] S2.T6

**Gate (auto)**: En el emulador se ve la transicion de ida (saliente que se va en 180 ms desplazandose 12 px, entrante en 240 ms) y la inversa al volver, con el encabezado quieto; Atras a mitad de transicion retrocede sin duplicar ruta, el doble toque rapido abre una sola vista, con movimiento reducido solo hay fundido corto, y el lector de pantalla anuncia el titulo al entrar y devuelve el foco al origen al volver.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: Con la app cerrada, el enlace profundo abierto desde la terminal del emulador muestra la vista de detalle y Atras lleva al destino principal (y recien el segundo Atras sale de la app); y en la lista de marcador con filtro activo desplazada 40 elementos, abrir un detalle y volver deja la lista exactamente en el mismo offset, filtro, seleccion y texto de busqueda, sin verla animar.

### Session 4 · T0 · open
