---
id: DOC-kb-mvp-11-tickets-h2-h3-web-y-producto
project: tao-v2
type: doc
tags:
  - mvp
  - tickets
  - web
  - producto
  - h2
  - h3
---

# MVP tao-v2: tickets H2 y H3, web de administración y producto

Fichas de los tickets B4-01, W00, W04, W01a, W01b, W02 (H2) y B5-02, B7-01, B6-01, B6-02, W03, P01, P02 (H3): 13 tickets tras fundir cuatro pequeños (B4-02 en B4-01, B5-01 en B5-02, W01c en W01b y P03 en P02) y sumar W04 (portal público de eliminación de cuenta). Revisadas contra los análisis de backend y frontend y contra las guías de `docs/product/diseno-web/` (ver `03-referencia-de-diseno-y-muestras` y `04-revision-de-coherencia-diseno`). Formato en `01-ficha-de-ticket`. Cuentas externas: ninguna. La web se sirve desde `server/src/web/` con Pug (D-01), cookies HttpOnly y CSRF (D-02), sin CORS. Regla de capas: `web` usa `services`, nunca el ORM (regla nueva de dependency-cruiser en W01a). Todo ticket de backend cubre además los `x-errores` que el contrato declara para sus operaciones. Todo ticket de web lleva el bloque estándar de línea visual web de `03` y su lista de aceptación visual web.

Nota de ids: los ids B4-02, B5-01, W01c y P03 quedaron absorbidos (ver tabla en `20-mapa-de-dependencias`). Los documentos que aún los nombran se leen como la parte correspondiente del ticket que los absorbe.

## Estructura de la web (D-10 y D-12)

- `/` es la presentación pública del producto general (W00): sin sesión, sin cookies, sin JavaScript obligatorio.
- `/eliminar-cuenta` es el portal público de eliminación de cuenta (W04, D-12): vista del servidor, sin sesión ni cookies, con CSRF sin estado. La URL que la app abre sale de esta ruta (clave `accountDeletionPortalUrl`, B1-01).
- `/backoffice` es la parte de administración, con el login para Administrador y Productor. Rutas:
  - Acceso y legal: `/backoffice/login`, `/backoffice/legal`.
  - Administrador: `/backoffice/admin` (V-17), `/backoffice/admin/cuentas` (V-18), `/backoffice/admin/cuentas/:cuentaId` (V-19), `/editar`, `/suspender`, `/backoffice/admin/productores`.
  - Productor: `/backoffice/productor` (V-36), `/backoffice/productor/unidades`, `/unidades/nueva` (V-37), `/unidades/:unidadId/confirmar`, `/unidades/:unidadId` (V-49).
  - `/backoffice` redirige según la capacidad de la sesión, no según una bandera del formulario.
- Las páginas legales existentes (`/legal/:tipo/:version`, `server/src/routes/legal.ts`) se mantienen y la presentación pública enlaza a las versiones vigentes.
- La API sigue bajo `/v1`. No hay ruta raíz hoy: `/`, `/eliminar-cuenta` y `/backoffice` no chocan con nada existente. Las rutas públicas viven en un solo módulo de constantes (`server/src/config/rutas-publicas.ts`, creado en B1-01) que usan tanto el montaje Pug como la configuración.
- Las rutas de edición, confirmación y legal son rutas HTML de Pug, no endpoints REST nuevos. Los formularios que mutan son POST con CSRF, nunca GET.
- Aislamiento: las cookies de sesión llevan `Path=/backoffice`, así la presentación pública y el portal de eliminación nunca reciben ni emiten cookies; `/backoffice` lleva `X-Robots-Tag: noindex` y `robots.txt` lo excluye; la presentación pública puede cachearse y el backoffice responde `Cache-Control: no-store`.
- Línea visual: backoffice neutro (gris cálido `#F4F4F2`, tarjetas marfil opacas, sin paisajes); presentación pública con ilustración editorial; el portal de eliminación usa el layout público sobrio de la guía 17. Manda `diseno-web` sobre las muestras V3.

Orden real de entrega (ya no es lineal): B5-02 depende ahora de B0-03, B1-03 y B2-02 (no de la suite B3-03), así que avanza justo después de B2-02, en paralelo con B4-01, y desbloquea los tickets de la app que consumen unidades. B7-01 espera a B5-02 y B4-01. W03 depende de B7-01. W04 espera a B3-02 y a W01a. W00 espera a W04 porque enlaza al portal y corre en paralelo con W01b; no está en el camino crítico. La administración de cuentas (W02) se entrega en H2; la asignación de productores (W03) cierra después de B7-01.

## Hallazgos que estas fichas corrigen

- Tablas de B4 a B7 (`evento_auditoria`, `producto`, `producto_productor`, `unidad_producto`, `unidad_evento`, `intento_codigo_producto`) ya las crea B0-03: B5-02 no migra, solo siembra y verifica.
- La suspensión efectiva (revocar sesiones por cuenta, chequeo de estado en refresh y en capacidad) la entrega B1-04: B4-01 la usa y la prueba.
- Los filtros del listado de cuentas `nivel`, `actividadDesde/Hasta` y `cantidadConsultas` no tienen datos de respaldo: se decide y se documenta.
- Login web sin dispositivo (B1-04), IDs de perfil y producto sin resolver (D-06), aceptación legal en la web (D-03), infraestructura HTTP web inexistente (B1-03 y W01a), edición de cuentas casi vacía (W02 reducido), onboarding de cuentas Administrador y Productor sin ticket (B1-04 y W03).
- La variante `PorUnidadRegistrada` de `validarYUsarUnidad` depende de `/unidades/registro`, que está diferida: debe responder el error del contrato y no se prueba como éxito.
- La unidad "confirmada por productor" no existe hasta B6: B5-02 se prueba con fixtures de seed y el recorrido real cierra en Q01.
- El plan V3 no tenía presentación pública del producto: W00 (nuevo).
- Diseño: las guías web de `diseno-web` ya corrigen la edición de cuenta (solo `locale` y `timezoneId` con `motivo`) y establecen el backoffice neutro; el CSS de `diseno-web` repite colores que no están en `tokens.v1.json`, por eso W01a debe sumarlos antes de generar el CSS.
- El portal de eliminación de cuenta (guía 17) estaba diseñado y sin ficha: ahora es W04, y la URL de configuración que la app abre se deriva de su ruta (D-12).

---

## B4-01. Listar, ver, editar, suspender y reactivar cuentas con roles fijos

- Tipo: implement. Módulo: Backend. Cambio: C (absorbe B4-02).
- Depende de: B1-04, B3-02.
- Entregable:
  - Listado con búsqueda y paginación, detalle y edición de campos permitidos (`locale` y `timezoneId`, escritos en `cuenta` salvo que B0-03 decida `preferencia_cuenta`), con auditoría vía el helper `registrarAuditoria(tx, ...)` dentro de la misma transacción del efecto; toda acción administrativa exige `motivo` de 3 a 2000 caracteres y admite `casoId` opcional sin depender de `/admin/casos` (diferido). Filtros: se soportan los que tienen dato y los demás se documentan: `nivel` se deriva de los perfiles, `actividadDesde/Hasta` puede derivarse de `sesion_auth.emitidaAt`, `cantidadConsultas` responde null (no hay sincronización).
  - Operaciones de suspender y reactivar con `motivo`, evento auditado y revocación de sesiones online usando `revocarSesionesDeCuenta` y los chequeos de estado que entrega B1-04 (no se reimplementan aquí).
- Aceptación local: los roles no administrativos reciben 403; campos prohibidos rechazados; cambios auditados con actor, acción, objetivo, fecha y motivo; sin contraseñas ni consultas privadas en la respuesta; las respuestas null de los filtros sin dato están en el contrato; suspender invalida el acceso online (también la sesión web y el refresh); reactivar no resucita tokens revocados; "token emitido antes de suspender" con reloj controlado; no se promete bloqueo offline inmediato.
- Datos y fixtures: ADM-1, USR-A, PRD-A, cuenta ajena, páginas vacías, filtros; cuenta activa y suspendida, token emitido antes de suspender, operación repetida.
- Recursos: R02, R09. Información por confirmar: qué filtros se soportan en el MVP. Verificación: backend.

## W01a. Infraestructura web: Pug, rutas, cookies, CSRF, tokens y runner de navegador

- Tipo: implement. Módulo: Web. Cambio: P (de FE-W01).
- Depende de: B1-03, X01, X02.
- Repo y rutas: `server/src/web/` (rutas, vistas, public), `server/.dependency-cruiser.cjs`, `scripts/dev/quality.mjs`, `doctor.mjs`, `bootstrap.mjs`, `docs/product/design-system/tokens.v1.json`, generador de tokens CSS.
- Diseño: `docs/product/diseno-web/00-criterio-web.md` (identidad, dos layouts, rutas y seguridad) y guía 15 (estados). La referencia visual de composición es el CSS de `diseno-web` (`web-guia.css`), que se reescribe sobre tokens.
- Entregable:
  - Pug con dos layouts (público para `/` y `/eliminar-cuenta`, y backoffice para `/backoffice`) y mixins mínimos sin lógica; salida siempre escapada (prohibido el modo sin escape de Pug, con prueba contra XSS); archivos estáticos.
  - Montaje de las rutas públicas en `/` y de las del backoffice bajo `/backoffice` (D-10), usando las constantes de `server/src/config/rutas-publicas.ts` (B1-01).
  - Páginas de error y de estado de la guía 15 (401 que vuelve al acceso, 403 sin revelar el recurso ajeno, 404, 500 sin trazas), públicas y de backoffice, con una salida permitida y reintento cuando corresponda.
  - Política de CSP específica de las vistas sin scripts ni estilos inline (helmet y rate limit globales ya los entrega B1-03); `robots.txt` que excluye `/backoffice` y cabecera `X-Robots-Tag: noindex` en esa zona.
  - Middleware de cookie de sesión con `Path=/backoffice` y verificación de token CSRF en todo POST del backoffice.
  - Tokens: se suman a `tokens.v1.json` los valores que hoy solo tiene el CSS de `diseno-web` (gris del backoffice `#F4F4F2`, fondo de modal `#E9E9E5`, línea `#D8CBB4`, fondos y bordes de pastillas y avisos) con su par de alto contraste; el generador de tokens CSS produce la hoja de estilos de la web desde ese archivo y no se copian colores a mano.
  - Regla de capas; Playwright (Chromium y Firefox) como dependencia de desarrollo de `server/`, con pasos nuevos en `quality.mjs`, `doctor.mjs` y `bootstrap.mjs`.
- Aceptación local: Supertest valida cabeceras, CSP, rechazo de POST sin token CSRF, que ninguna respuesta bajo `/` fuera de `/backoffice` emite `Set-Cookie`, y que `/backoffice` lleva `noindex`; una entrada con HTML se muestra escapada; los errores no imprimen excepciones ni trazas; un recorrido Playwright abre una página base en Chromium y Firefox; el CSS generado no contiene colores fuera de los tokens; `pnpm run check` incluye los pasos nuevos.
- Datos y fixtures: ADM-1.
- Recursos: R01, R02, R10. Datos externos: la descarga de los navegadores de Playwright (hoy el repo solo tiene puppeteer con Chromium por mermaid). Información por confirmar: si `server/` entra al workspace pnpm de la raíz o conserva su lockfile propio (DEC-205 y DEC-230); necesidad de HTTPS local para la cookie `Secure` en desarrollo. Verificación: navegador. Extensión v1: el layout y las guardas aceptan más secciones sin cambiar la infraestructura.

## W04. Portal público de eliminación de cuenta

- Tipo: implement. Módulo: Web. Cambio: N (decidido el 2026-10-12: el portal forma parte de las vistas que implementa el servidor, D-12).
- Depende de: W01a, B3-02.
- Diseño: guía 17 de `diseno-web` y sus variantes (verificación, confirmación, comprobante), guía 15 (estados) y `00-criterio-web.md`; layout público sobrio, sin paisajes.
- Entregable:
  - Rutas Pug públicas bajo `/eliminar-cuenta`, definidas en `server/src/config/rutas-publicas.ts`: `GET` y `POST /eliminar-cuenta` (explicación y solicitud por correo), `GET` y `POST /eliminar-cuenta/:solicitudId/verificacion` (código), `GET` y `POST /eliminar-cuenta/:solicitudId/confirmacion` (advertencia irreversible y confirmación) y `GET /eliminar-cuenta/comprobante/:comprobante` (estado). Cada paso llama a los servicios de B3-02 (`solicitarEliminacionCuenta`, `verificarEliminacionCuenta`, `confirmarEliminacionCuenta`, `consultarEstadoEliminacion`), nunca al ORM ni a otra API.
  - La URL del portal que la app abre (`accountDeletionPortalUrl`, B1-01) es esta ruta: se obtiene de la configuración del servidor y de ninguna otra fuente. Es la vista de la que sale la URL de publicación.
  - Sin sesión ni cookies (D-10): el CSRF es sin estado (token firmado con HMAC ligado a la ruta y con caducidad corta, en un campo oculto), el identificador de la solicitud viaja en la ruta, y los pasos y el comprobante responden `Cache-Control: no-store`, `Referrer-Policy: no-referrer` y `X-Robots-Tag: noindex`. Los límites de frecuencia de las operaciones (B1-03) se traducen a un mensaje con reintento.
  - Flujo: solicitar por correo con un mensaje genérico idéntico para cualquier correo (existente o no), código con errores traducidos (vencido, usado, intentos agotados, límite), advertencia de irreversibilidad y alcance (qué se elimina del servicio y qué queda en dispositivos, nubes privadas o copias exportadas), confirmación textual según el contrato, cierre de sesiones, comprobante opaco sin datos personales y consulta de estado sin iniciar sesión (Solicitud confirmada, Eliminación en curso, Eliminación completada, Requiere atención, con la fecha límite que entrega el servicio, DEC-128). Cancelar no envía nada. Una cuenta de dispositivo sin correo se elimina solo desde la app y el texto lo explica, sin inventar identificación web.
  - Sin instrucciones de Google Drive ni sincronización (fuera del MVP).
- Aceptación local: Playwright en Chromium y Firefox a 375 y 1280 px contra servidor, base y Mailpit reales: solicitar, leer el código en Mailpit, verificar, confirmar y consultar el comprobante; correo desconocido y correo real muestran la misma respuesta; código incorrecto, vencido y reutilizado rechazados; 429 con reintento; un POST sin token, con token de otra ruta o caducado no muta; ninguna respuesta del portal emite `Set-Cookie`; el comprobante no contiene correo ni datos personales; tras confirmar, la sesión de la cuenta queda revocada (la app recibe 401) y la cuenta no se reactiva; la clave `accountDeletionPortalUrl` de la configuración apunta a esta ruta y responde 200; la cuenta de dispositivo no tiene flujo web; navegación completa por teclado y contraste AA.
- Datos y fixtures: USR-DEL (cuenta completa descartable con sesiones y aceptaciones), correo desconocido, código vencido y usado, solicitud en curso, comprobante vigente y vencido (90 días, reloj controlado).
- Recursos: R02, R03, R04, R05, R10. Información por confirmar: texto de alcance y conservación aprobado por Producto (DEC-127: comprobante de 90 días y trazabilidad anonimizada de productos); si el host de producción tiene que estar en la lista de hosts permitidos de DEC-129. Verificación: navegador. Extensión v1: login web y resumen personal posteriores a 1.0 (DEC-229), y la corrección o ampliación del portal con instrucciones de respaldo.

## W00. Presentación pública del producto (`/`)

- Tipo: implement. Módulo: Web. Cambio: N.
- Depende de: W01a, B2-01, W04.
- Diseño: guías 01 (portada y variante móvil) y 16 (legal público y términos) de `diseno-web`; capa pública con ilustración editorial y cierre azul noche.
- Entregable: página de inicio pública en Pug con el layout público: qué es Tao Mangalam, cómo funciona el método a nivel general, a quién sirve, enlaces a los términos y la política de privacidad vigentes (reutiliza `/legal/:tipo/:version` y el servicio legal, con aviso explícito y sin enlace inventado si no hay versión publicada), enlace al portal de eliminación de cuenta (`/eliminar-cuenta`, desde las constantes de rutas públicas), un acceso discreto al backoffice en el pie y sin formulario de contacto, compra, testimonios ni badges de tiendas. Sin cookies, sin sesión y sin JavaScript obligatorio (mejora progresiva solamente); HTML semántico, `lang="es"`, título y descripción propios, metadatos para compartir; responsive de teléfono a escritorio con los tokens del design system; cabeceras de caché que permiten servirla cacheada. El contenido es estático en el repositorio (no depende de la base salvo los enlaces legales). Páginas de lectura legal pública con texto íntegro, identificación de versión y 404 para una versión inexistente. Decidido: el MVP usa el copy provisional de la guía 01, sin datos de contacto oficiales ni enlaces a tiendas (se omiten; no se inventan) y lo marca como provisional.
- Aceptación local: Supertest: `GET /` responde 200 HTML sin `Set-Cookie`, con los enlaces legales vigentes, el enlace al portal de eliminación y el enlace al backoffice; Playwright en Chromium y Firefox a 375 y 1280 px de ancho, navegación completa por teclado, contraste AA y sin desbordes; con JavaScript desactivado se ve completa; sin imágenes el contenido y los enlaces siguen disponibles.
- Datos y fixtures: versión legal vigente (fixture de B2-01), caso sin versión publicada, versión inexistente.
- Recursos: R04, R05, R06, R10. Assets: logo de identidad y la ilustración editorial de `diseno-web/assets/` (reutilizados byte a byte, a servir como estáticos); la página debe funcionar sin imágenes. Datos externos pendientes de Producto y Contenido antes de publicar (no bloquean el desarrollo): texto definitivo de la presentación en español neutro, datos de contacto oficiales, enlaces a tiendas si llegan a existir; textos legales con una versión apropiada al alcance recortado (V1 aún menciona respaldos y sincronización). Verificación: navegador. Extensión v1: la presentación puede crecer con secciones (preguntas frecuentes, productos) sin tocar el backoffice.

## W01b. Sesión web, aceptación legal y shell del backoffice

- Tipo: implement. Módulo: Web. Cambio: P (absorbe W01c).
- Depende de: W01a, B1-04, B2-02.
- Diseño: guías 02 (acceso), 03 (aceptación legal) y 15 (estados), y la estructura de navegación de las guías 04 y 10; menú lateral y encabezado con rol.
- Entregable:
  - Sesión: páginas de login (`/backoffice/login`) y logout, refresh con cookie de ruta limitada a `/backoffice/refresh`, expiración, mensajes de error genéricos que no revelan existencia de cuentas ni si la cuenta es Estándar o está suspendida; las páginas autenticadas responden `Cache-Control: no-store`; tras iniciar sesión se redirige al panel según la capacidad de la sesión (nunca por una bandera del formulario).
  - Aceptación legal pendiente en `/backoffice/legal` (D-03), mostrada antes de cualquier otra sección: casilla sin preseleccionar, envío con versión y hash vigentes y clave idempotente, cancelar cierra la sesión, hash desactualizado recarga las versiones sin registrar éxito, un error de red no acepta automáticamente.
  - Shell bajo `/backoffice` con navegación y layout por rol (`/backoffice/admin` y `/backoffice/productor`), guardas por capacidad con denegación por defecto, páginas de error y de acceso denegado (403 sin revelar el recurso ajeno); HTML semántico, navegación por teclado y contraste AA tomado de los tokens. No hay vista de cuenta propia en la web (D-09).
- Aceptación local: Playwright: Estándar rechazada con el mismo mensaje genérico, Administrador y Productor entran, logout y expiración reales, solicitud sin CSRF rechazada, USR-LEGAL ve la pantalla de aceptación antes de operar, el botón Atrás tras logout no muestra contenido, 429 muestra reintento; cada rol ve solo su navegación y acceder por URL a la sección de otro rol devuelve 403; un recorrido completo por teclado en Chromium y Firefox; la presentación pública sigue accesible sin sesión.
- Datos y fixtures: USR-A, ADM-1, PRD-A, USR-LEGAL.
- Recursos: R02, R03, R05, R09, R10. Verificación: navegador. Extensión v1: registro de secciones por capacidad, sin cablear secciones en el layout.

## W02. Gestión web de cuentas (V-17, V-18, V-19)

- Tipo: implement. Módulo: Web. Cambio: C (fusiona W02 y W03 de V3).
- Depende de: W01b, B4-01.
- Diseño: guías 04 (inicio administrativo), 05 (listado), 06 (detalle), 07 (edición) y 08 (suspensión y reactivación); backoffice neutro sin paisajes.
- Entregable: panel administrativo bajo `/backoffice/admin` sin KPI inventados:
  - Inicio (V-17) con entradas a cuentas y asignaciones.
  - Listado (V-18) en `/cuentas` con búsqueda por correo, filtros y paginación del servidor por parámetros de consulta; se identifica por correo o referencia segura, no por nombre de consultante; los filtros sin dato aparecen como no disponibles, no como vacíos; volver conserva filtros y cursor.
  - Detalle (V-19) en `/cuentas/:cuentaId` con tipo, perfil y estado; una cuenta de dispositivo no inventa correo; acciones bloqueadas con eliminación en curso.
  - Edición en `/cuentas/:cuentaId/editar` solo de `locale` y `timezoneId`, con `motivo` obligatorio y `casoId` opcional, validación junto al campo y cancelar sin escribir.
  - Suspensión y reactivación en `/cuentas/:cuentaId/suspender`: página de confirmación con resumen de impacto y motivo; reactivar es una acción separada con título y botón propios y no restaura tokens revocados.
  Estados de carga, vacío y error.
- Aceptación local: Administrador gestiona; Productor y Estándar no; no se muestran secretos ni consultas privadas; no se edita nombre, correo, contraseña ni niveles; cancelar no muta; suspensión revoca la sesión online del afectado (comprobable abriendo su sesión en otro contexto del navegador); un POST sin CSRF o con GET no muta.
- Datos y fixtures: USR-A, USR-SUS, PRD-A, páginas vacías y completas, filtro sin resultado.
- Recursos: R02, R05, R09, R10. Verificación: navegador.

## B5-02. Seed de productos y validar, usar, renovar y reponer Kuberani y Corrector

- Tipo: implement. Módulo: Backend. Cambio: C (absorbe B5-01).
- Depende de: B0-03, B1-03, B2-02.
- Entregable:
  - Seed de los productos Kuberani y Corrector con ULID fijo (D-06), estables entre entornos; fixtures de unidades en los estados del dataset R09, con el emisor de las unidades sembradas en el productor técnico "Sistema (siembra)" (DEC-232 #8; lo crea este seed si no existe); carga interna solo como apoyo de pruebas (no sustituye el registro web operativo); verificación en PostgreSQL de las restricciones que creó B0-03 (unicidad de `codigo_lookup_hash`, propiedad, índice parcial, REVOKE de `unidad_evento`). Este ticket no migra tablas.
  - `validarYUsarUnidad` con los motivos `kuberani_inicio`, `kuberani_renovacion`, `kuberani_reposicion` y `corrector`; transaccional, con idempotencia y resultado recuperable; el ciclo de vida se escribe solo en `unidad_evento`; anti abuso con `intento_codigo_producto` sin guardar códigos desconocidos en claro; límite `x-rate-limit` de la operación; la variante `PorUnidadRegistrada` responde el error del contrato; tabla de transiciones.
- Casos de prueba obligatorios: inicio; renovación (el servidor deduce la unidad en uso de la misma cuenta y consulta); reposición tras reparación (marca la unidad `quemada`); corrector; doble consumo concurrente (solo uno gana); código de otra cuenta; producto que no corresponde; unidad anulada; respuesta perdida y reintento.
- Aceptación local: restricciones comprobadas con pruebas que violan cada una; el seed corre dos veces sin duplicar; cada caso verificado contra PostgreSQL real; el reintento devuelve el mismo efecto; un fallo no deja un consumo ambiguo sin camino de recuperación; el código crudo no aparece en logs ni en cola.
- Datos y fixtures: Kuberani y Corrector en estados candidato, confirmado, descartado, consumida y de otro productor: K-DISP, K-CAND, K-USADA, K-RENOV, C-DISP, C-USADA, U-AJENA (de seed, porque la unidad creada por un productor aún no existe).
- Recursos: R02, R09. Verificación: backend. Nota de planificación: al no depender de B3-03, este ticket corre dentro de la misma épica que la suite de cuenta, y esa suite sigue siendo requisito de A04.

## B7-01. Habilitar perfil Productor y asignar productos

- Tipo: implement. Módulo: Backend. Cambio: C.
- Depende de: B5-02, B4-01, B1-04.
- Entregable: asignación del perfil Productor (por id determinista, sin `listarPerfiles`) y de tipos existentes mediante `producto_productor` con índice parcial de un productor activo por producto; auditoría de cada asignación y revocación; revocación y su efecto sobre unidades ya emitidas, con la política decidida (DEC-061): revocar impide generar unidades a futuro y las unidades ya emitidas se conservan y siguen siendo válidas. El conjunto de perfiles que se envía conserva los demás perfiles de la cuenta.
- Aceptación local: un no administrador no asigna perfiles; un productor no eleva su rol; revocar impide generar a futuro y las unidades ya emitidas siguen válidas y consultables por su productor anterior; un segundo productor activo para el mismo producto es rechazado.
- Datos y fixtures: ADM-1, PRD-A, PRD-B, PRD-SIN, tipo asignado y no asignado, asignación revocada.
- Recursos: R02, R09. Verificación: backend.

## W03. Habilitar productores y asignar productos desde la web

- Tipo: implement. Módulo: Web. Cambio: C (antes W04).
- Depende de: W02, B7-01.
- Diseño: guía 09 (perfil Productor y asignaciones); backoffice neutro.
- Entregable: página `/backoffice/admin/productores` con búsqueda de cuenta completa y activa, cambio al perfil fijo Productor con `motivo`, y asignación y revocación de Kuberani y Corrector (tipos existentes, con `motivo` y confirmación del producto y la cuenta objetivo antes de revocar). Perfil y asignación son operaciones separadas y no atómicas: si la asignación falla, no se presenta todo como revertido. Estados: cuenta suspendida, tipo asignado a otra cuenta, conflicto concurrente, producto retirado, 403. Una cuenta Productor nace así (decidido): la persona se registra como Estándar en la app y un Administrador le asigna el perfil aquí; en entornos locales la CLI de B1-04 crea la cuenta con el perfil. La creación de cuentas administrativas con invitación está diferida.
- Aceptación local: asignar habilita la generación del tipo; revocar la impide; Estándar y Productor no acceden por URL ni por API; asignar a una cuenta suspendida se rechaza; guardar el perfil no borra otros perfiles; no se promete invalidar unidades ya emitidas (la pantalla de revocación lo dice).
- Datos y fixtures: PRD-A, PRD-SIN, tipo ajeno, revocación.
- Recursos: R02, R05, R09, R10. Verificación: navegador.

## B6-01. Productos autorizados y lecturas de unidades propias

- Tipo: implement. Módulo: Backend. Cambio: =.
- Depende de: B7-01.
- Entregable: productos autorizados, lista y detalle de unidades propias, filtros y paginación; datos mínimos expuestos (estado de emisión y estado de uso por separado, sufijo seguro del código; sin identidad del consumidor aunque el DTO histórico incluya `activadaPor`).
- Aceptación local: A no consulta unidades de B por URL ni filtros; las respuestas no exponen el código completo ni identidad o consulta privada del consumidor.
- Datos y fixtures: PRD-A, PRD-B, producto sin autorización, estados distintos.
- Recursos: R02, R09. Verificación: backend.

## B6-02. Generar, confirmar o descartar unidad y revelar código

- Tipo: implement. Módulo: Backend. Cambio: =.
- Depende de: B6-01.
- Entregable: generación de candidato, confirmación y descarte, y revelación de código con evento de auditoría (vía `registrarAuditoria`) y evento de ciclo de vida en `unidad_evento`; tabla de transiciones y reintentos con idempotencia.
- Aceptación local: el candidato no es consumible; confirmar deja exactamente una unidad disponible; la revelación solo ocurre en el estado permitido y queda auditada con actor y fecha; descartar no habilita uso; confirmar en concurrencia no duplica.
- Datos y fixtures: candidato, confirmación doble y concurrente, descarte, respuesta perdida, unidad ya no disponible.
- Recursos: R02, R09. Verificación: backend.

## P01. Área web del productor (V-36)

- Tipo: implement. Módulo: Web. Cambio: =.
- Depende de: W01b, W03, B6-01.
- Diseño: guías 10 (productos autorizados) y 11 (unidades propias, con variante móvil); backoffice neutro. Las letras K y C de las tarjetas son marcadores tipográficos, no assets nuevos.
- Entregable: entrada por rol en `/backoffice/productor` con los productos autorizados y acceso a registrar o ver unidades por producto; lista en `/backoffice/productor/unidades` con filtros por producto, emisión y uso (fechas cuando se soporten), paginación del servidor, sufijos seguros (el código completo nunca va en la tabla) y filtros que se conservan al volver desde el detalle; el producto viaja al formulario como selección validada en servidor; textos y estados vacíos básicos.
- Aceptación local: solo productos y unidades propios; sin métricas avanzadas, exportación ni datos del consumidor; no requiere fotos de producto; PRD-SIN ve "No tienes productos asignados" sin acción de generar; una autorización revocada bloquea la generación al recargar; tabla con desplazamiento horizontal a 375 px.
- Datos y fixtures: PRD-A, PRD-B, PRD-SIN.
- Recursos: R02, R05, R09, R10. Verificación: navegador.

## P02. Registrar unidades, confirmar y revelar código (V-37, V-49)

- Tipo: implement. Módulo: Web. Cambio: = (absorbe P03).
- Depende de: P01, B6-02.
- Diseño: guías 12 (seleccionar producto y generar), 13 (confirmar o descartar el candidato) y 14 (detalle y variante con el código revelado; la variante revelada es solo diseño, en Pug la acción es POST).
- Entregable:
  - Registro en `/unidades/nueva` (producto autorizado, generar candidato) y `/unidades/:unidadId/confirmar` (confirmar la unidad física o descartar); cada formulario lleva una clave de operación generada por el servidor para que el doble envío o la recarga recupere la misma operación y no cree otra unidad; recuperación tras tiempo de espera agotado y estado real si se confirmó o descartó de forma concurrente; el código candidato solo se ve desde la respuesta de generación; si se ofrece Generar otro, descarta primero y genera después como dos efectos ordenados.
  - Detalle en `/backoffice/productor/unidades/:unidadId` con emisión, uso, sufijo y eventos permitidos, y revelación explícita de código permitido mediante una acción POST con CSRF; la respuesta lleva `Cache-Control: no-store`; el código se oculta al salir o cambiar de estado; sin datos de consumidor, consulta, personalidad ni notas; el código no va en la URL ni en logs ni reportes.
- Aceptación local: el candidato no es usable, la confirmación deja una unidad disponible, el descarte no habilita; doble clic y recarga del formulario no duplican; recargar la página no vuelve a mostrar el código; no depende de imprimir etiquetas ni QR; no hay cola sin conexión; el código está oculto por defecto; el servidor revalida y audita la revelación; se deniega si la unidad deja de estar disponible (y actualiza el estado); un error temporal no deja el código visible; el código no queda en el historial ni en cachés del navegador ni en reportes.
- Datos y fixtures: producto autorizado, doble clic, respuesta perdida, unidad disponible y consumida entre lectura y revelación.
- Recursos: R02, R05, R09, R10. Verificación: navegador.
