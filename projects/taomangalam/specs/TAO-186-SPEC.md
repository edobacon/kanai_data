---
id: TAO-186-SPEC
project: taomangalam
ticket: TAO-186
status: approved
---

# Menú y rutas filtrados por el manifiesto de capacidades cacheado (HU-01-11)

## Resumen ejecutivo

Se hace: filtrar la lista declarativa de destinos de HU-01-08 y las rutas declaradas en HU-01-09 contra el manifiesto cacheado que expone HU-03a-08, ocultando el destino cuando falta su capacidad de acceso o cuando la vista no existe en el build de M1a, con guarda de ruta que redirige a Inicio sin mensaje de permiso y deja log de desarrollo sin datos personales, recomposición en caliente al llegar un manifiesto nuevo y vistas obligatorias (Splash, V-51) siempre accesibles. NO se hace: obtención, caché ni validez del manifiesto (HU-03a-08), autorización en servidor (HU-03a-07) ni menús de Productor/Administrador (EP-13, EP-14a, EP-14b); el filtrado es solo de interfaz. Se sabe que funciona cuando: con un manifiesto fixture sin `vista.productos.acceder` el menú no muestra Productos ni atenuado, un enlace interno a esa ruta termina en Inicio sin excepción y con log del nombre de ruta, en modo avión con caché el menú muestra los mismos destinos que con red, y al aplicar un manifiesto que quita la vista abierta la app vuelve a Inicio y el foco pasa al primer destino visible sin reiniciar. Tamaño: 3 puntos, 2 sesiones T2, riesgo bajo, reversible retirando la guarda y volviendo al menú sin filtro como una unidad.

Advertencias (fuera de alcance, no son requirements): el ticket depende de HU-01-09 y HU-03a-08; si el proveedor de manifiesto aún no expone un stream o notificador, la recomposición en caliente queda bloqueada y debe resolverse en HU-03a-08, no aquí.

Datos a confirmar antes de ejecutar:
- Ruta real del paquete Flutter de la app en el monorepo (se asume `apps/app`): confirmar contra el `pnpm-workspace.yaml` y los `pubspec.yaml` de la rama `origin/epic/EP-01`.
- Nombres reales de los símbolos de HU-01-08 (lista declarativa de destinos) y HU-01-09 (declaración de rutas y router): confirmar en el código integrado antes de extender el modelo; el spec no los inventa.
- API exacta del proveedor del manifiesto cacheado de HU-03a-08 (`obtenerManifiesto`): forma del manifiesto, nombre del manifiesto inicial por defecto y mecanismo de notificación de manifiesto nuevo (stream, listenable o callback).
- Identificador de ruta de V-51 y de Splash en la declaración de rutas, para la lista de vistas obligatorias no filtrables (DEC-153).
- Comando de test del proyecto (se asume `flutter test` desde el paquete de la app): confirmar contra `.github/workflows/` y los scripts del `package.json` raíz.

## Requirements

#### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1415
> Necesidad: build
El menú muestra un destino solo si el manifiesto cacheado incluye su capacidad de acceso declarada (`vista.inicio.acceder`, `vista.consultas.acceder`, `vista.biblioteca.acceder`, `vista.productos.acceder`, `vista.cuenta.acceder`); si la capacidad falta, el destino no aparece de ninguna forma, ni atenuado ni con aviso (DEC-051).

#### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1416
> Necesidad: build
Un destino cuya vista no está construida en el build de M1a no se muestra aunque el manifiesto incluya su capacidad: la condición de visibilidad es capacidad presente Y vista disponible en el build.

#### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1417
> Necesidad: build
Una ruta interna hacia una vista cuya capacidad de acceso falta en el manifiesto no se abre: la guarda redirige a Inicio sin mostrar mensaje de permiso y emite un log de desarrollo que incluye el nombre de la ruta y ningún parámetro ni dato personal.

#### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1446
> Necesidad: build
Las vistas obligatorias no filtrables (Splash y V-51) son siempre accesibles cualquiera sea el manifiesto, incluso si falta `vista.privacidad.acceder` o el manifiesto está vacío (DEC-153).

#### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1440
> Necesidad: build
Al aplicarse un manifiesto nuevo el menú se recompone sin reiniciar la app: si la ruta actual deja de estar permitida se vuelve a Inicio, el foco no queda en un destino que desapareció y el panel persistente de tablet se recompone sin animación del panel conservando el destino activo si sigue permitido.

#### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:973
> Necesidad: build
Sin manifiesto en caché se evalúa con el manifiesto inicial que define HU-03a-08, y una capacidad desconocida presente en el manifiesto se ignora sin error ni log de fallo.

#### REQ-07 `inferred`
> Fuente: taomangalam/docs/product/tecnologia/14_catalogo_de_vistas_y_capacidades.md:60
> Necesidad: build
La evaluación reusa la lista declarativa de destinos de HU-01-08, la declaración de rutas de HU-01-09 y el proveedor de manifiesto cacheado de HU-03a-08; no duplica el catálogo de destinos ni de capacidades, no consulta la red y resuelve cada destino contra un conjunto de capacidades en memoria (lookup O(1) por destino, sin I/O durante el build del menú).

## Tasks

#### S1.T1 — Extender la declaración de destinos de HU-01-08 con la capacidad de acceso requerida y la disponibilidad en el build de M1a, usando los identificadores literales del catálogo: `vista.inicio.acceder`, `vista.consultas.acceder`, `vista.biblioteca.acceder`, `vista.productos.acceder`, `vista.cuenta.acceder`. No se crea un catálogo nuevo: se agregan los campos a la lista declarativa existente.
Contrato: rollback: Revertir el commit que agrega los campos a la declaración de destinos; la lista vuelve a su forma de HU-01-08 y el menú deja de tener datos de capacidad.. Status: pending

#### S1.T2 — Implementar el filtro puro de destinos: función que recibe la lista declarativa y el conjunto de capacidades del manifiesto cacheado y devuelve los destinos con capacidad presente y vista construida. Usa un Set de capacidades para lookup O(1), ignora capacidades desconocidas sin error y cae al manifiesto inicial de HU-03a-08 cuando no hay manifiesto en caché.
Contrato: rollback: Eliminar el archivo del filtro y su export; ningún consumidor queda roto si todavía no se conectó el menú.. Status: pending

#### S1.T3 — Conectar el menú y el panel de navegación al resultado del filtro, leyendo el manifiesto cacheado del proveedor de HU-03a-08, en teléfono y en tablet. Un destino filtrado no se renderiza (no se renderiza deshabilitado ni con aviso).
Contrato: rollback: Volver el menú a construirse con la lista declarativa completa de HU-01-08, quitando la lectura del proveedor de manifiesto.. Status: pending

#### S1.T4 — Tests de la etapa: unitarios del filtro (capacidad ausente, vista no construida, capacidad desconocida, manifiesto vacío, sin caché con manifiesto inicial) y widget tests del menú con el fixture del perfil Estándar y el fixture sin `vista.productos.acceder`, en layout de teléfono y de tablet (QA-01-11-01).
Contrato: rollback: Eliminar los archivos de test agregados en esta sesión.. Status: pending

#### S2.T1 — Agregar la guarda de ruta sobre la declaración de rutas de HU-01-09: si la capacidad de acceso de la ruta destino falta en el manifiesto vigente, redirigir a Inicio sin mensaje de permiso y emitir un log de desarrollo con el nombre de la ruta, sin parámetros ni datos personales. Las vistas obligatorias no filtrables (Splash y V-51, DEC-153) quedan exentas de la guarda y son siempre accesibles.
Contrato: rollback: Retirar la guarda de la declaración de rutas como una unidad; el router vuelve al comportamiento de HU-01-09 y ninguna capacidad queda expuesta por defecto porque el menú filtrado de la sesión anterior sigue ocultando los destinos.. Status: pending

#### S2.T2 — Recomponer menú, ruta activa y foco al aplicarse un manifiesto nuevo, sin reiniciar la app.
Contrato: rollback: Quitar la suscripción al manifiesto y volver a una lectura única al construir el menú.. Status: pending
Subtasks: 3 (ejecutar hojas; el padre espera a todas)

#### S2.T2.1 — Suscribir el menú al proveedor de manifiesto de HU-03a-08 para que la lista de destinos se recalcule con cada manifiesto nuevo, sin reconstruir la app ni volver a Splash.
Contrato: rollback: Revertir a lectura única del manifiesto al construir el menú.. Status: pending

#### S2.T2.2 — Al aplicarse un manifiesto que quita la capacidad de la ruta actualmente abierta, reevaluar la ruta activa y navegar a Inicio reusando la misma guarda de la task anterior, sin mensaje de permiso.
Contrato: rollback: Quitar la reevaluación de la ruta activa; la guarda sigue actuando solo al navegar.. Status: pending

#### S2.T2.3 — Manejar foco y panel de tablet: si el destino enfocado desaparece, mover el foco al primer destino visible; el panel persistente se recompone sin animación de apertura o cierre y conserva el destino activo si sigue permitido.
Contrato: rollback: Revertir el manejo de foco y el flag de recomposición sin animación del panel.. Status: pending

#### S2.T3 — Tests de la etapa y regresión: guarda de ruta (permitida, denegada sin mensaje, log con nombre de ruta y sin parámetros), V-51 y Splash accesibles con manifiesto vacío, integración de deep link con la app cerrada a una ruta sin capacidad terminando en Inicio sin excepción (QA-01-11-02), y recomposición en caliente con retorno a Inicio y foco al primer destino visible (QA-01-11-03). Incluye correr los tests de menú de la sesión anterior para verificar que el filtro no se rompió.
Contrato: rollback: Eliminar los archivos de test agregados en esta sesión.. Status: pending
