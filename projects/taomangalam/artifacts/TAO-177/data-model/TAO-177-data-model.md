# Modelo de navegación: HU-01-08 (TAO-177)

Esta versión aplica la Adenda 2 del 2 de octubre de 2026 y sustituye el modelo anterior. Ámbito: cliente Flutter, sin base de datos, API ni persistencia nueva.

## Catálogo existente y extensión del menú

TAO-179 ya entregó `AppRouteNames`, `AppRoutePaths` y `AppRouteNames.primaryDestinations` en `app/lib/navigation/app_routes.dart`, las siete rutas y sus pantallas de marcador. La extensión del menú referencia esos nombres y agrega únicamente grupo, orden e icono del sistema de diseño. La lista existente es la fuente de destinos: se deriva de ella o se verifica su correspondencia, sin duplicar paths, pantallas ni rutas.

| Nombre de ruta existente | Path existente | Rótulo ARB existente | Grupo |
|---|---|---|---|
| home | /home | homeTitle | principal |
| consultas | /consultas | consultasTitle | principal |
| biblioteca | /biblioteca | bibliotecaTitle | principal |
| productos | /productos | productosTitle | principal |
| ajustes | /ajustes | ajustesTitle | pie |
| cuenta | /cuenta | cuentaTitle | pie |
| ayuda | /ayuda | ayudaTitle | pie |

Los nombres son identidades estables. Cada entrada debe referenciar una ruta válida, un rótulo existente y un icono operativo de HU-01-03; se verifica unicidad y orden. Solo se agregan claves de accesibilidad para los controles del menú cuando sean necesarias. La lista queda filtrable por HU-01-11; no se implementa filtrado ni campos de capacidades anticipados en M0.

## Estado del shell

El destino activo se DERIVA de la ubicación actual de go_router y no se almacena como selección independiente. Una ubicación hija como /consultas/:consultaId activa Consultas. Seleccionar un destino navega por su nombre existente; deep links y Atrás también actualizan el indicador a partir de la ruta.

El estado propio efímero contiene únicamente apertura/cierre del panel, visibilidad del panel persistente y referencias vivas de foco. No se serializa. La composición se deriva del ancho disponible: panel superpuesto por debajo de TaoBreakpoint.expandedMin (840), persistente desde ese límite. La clase de dispositivo usa el lado corto y TaoBreakpoint.mediumMin (600): teléfono vertical; tablet ambas orientaciones. El destino se conserva al cruzar el límite porque la ruta sigue siendo la fuente de verdad.

## Integración

En createAppRouter de app/lib/navigation/app_router.dart un ShellRoute envuelve las siete rutas existentes y la hija de Consultas. La ruta comodín permanece fuera. app/lib/app.dart conserva MaterialApp.router, createAppRouter(navigatorKey: navigatorKey) y builder del entrypoint development. No se agrega ningún GoRoute, marcador o paquete; go_router ^18.0.2 ya existe.

ProvisionalScreenScaffold deja de dibujar su AppBar: el encabezado definitivo del shell es el único. Se preservan AppViewFocusScope, AppNavigationOriginScope y AppViewFocusOrigin de app/lib/navigation/app_view_focus.dart, llevando el foco de título al encabezado definitivo y manteniendo retorno al origen. El botón Volver consulta el historial del router.

## Presentación y accesibilidad

Alturas TaoSize.headerPhone (64) y headerTablet (72), controles TaoSize.touchPreferred (48), ancho del panel 80 % con máximo TaoSize.drawerPhoneMax (360). Una superficie marfil opaca sin ilustraciones ni cajas por pictograma; el fondo anfitrión queda detrás del scrim. Entrada 260 ms, scrim 180 ms, salida 200 ms; reducción resuelta con resolveReducedMotionFromContext y localReducedMotionPreference existentes, con fundido hasta 120 ms o cambio inmediato.

Foco inicial en el primer destino, atrapado dentro del panel superpuesto y devuelto al control al cerrar por control, scrim, Escape o Atrás. Selección estructural además del color y semántica selected. Grupo de pie separado; iconos acompañados de rótulos localizados. Escala 200 % sin truncado ni overflow, con desplazamiento cuando sea necesario.

## Regresión, evidencia y rollback

Preservar app_router_test.dart, deep_link_restoration_test.dart y las aserciones de app_transitions_test.dart; solo se adaptan localizadores del encabezado cuando corresponda. Verificar rutas, enlaces profundos, retorno, transiciones y panel development por encima del shell. Agregar pruebas de integración del shell, foco, límites, movimiento y ocho goldens. QA humana en dispositivos y aprobación de Diseño contra maqueta-direccion-consolidada.png siguen siendo requisitos de cierre.

Rollback: revertir únicamente los cambios de TAO-177 al shell y devolver el encabezado provisional, conservando router, rutas, marcadores, dependencias y comportamiento entregados por TAO-179. No volver a home: fijo ni eliminar go_router. Sin migraciones ni recuperación de datos.

Fuentes: request HU-01-08, Adenda 2; REQ-01 a REQ-13 corregidos; código actual de app/lib/navigation, app/lib/app.dart, app/lib/l10n/app_es.arb y app/lib/design_system/motion.
