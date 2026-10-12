---
id: DOC-kb-mvp-12-tickets-h4-app-base
project: tao-v2
type: doc
tags:
  - mvp
  - tickets
  - app
  - h4
---

# MVP tao-v2: tickets H4, base de la app (X02 y A00 a A06)

Fichas de X02 y de los 7 tickets de base de la app, revisadas contra el análisis de frontend y contra el material de diseño (ver `03-referencia-de-diseno-y-muestras` y `04-revision-de-coherencia-diseno`). Formato en `01-ficha-de-ticket`. Repo `tao-v2`, carpeta `app/` (Flutter, Riverpod, Drift, Atomic Design). Cuentas externas: ninguna. Verificación por defecto: emulador (R08), no solo pruebas de widget. Todo ticket de UI incluye el bloque estándar de línea visual de `03` en su cuerpo.

## Hallazgos que estas fichas corrigen

- El motor local (`ServicioConsulta`, `OrquestadorTirada`, `ServicioPractica`, `ManejadorCierreConsulta` y otros) existe pero ningún provider lo expone: A00.
- `leerEspacioLocalId` toma el primer `espacio_datos` (`LIMIT 1`) y nadie escribe `cuenta_id`: no hay aislamiento por cuenta: A05.
- No hay interceptor de autenticación ni renovación de token: A02.
- 165 de 170 assets son descargables y `downloadUrlProvider` lanza `UnimplementedError`; los 10 fondos de familia también son descargables: A06.
- `registrarDispositivo` ya lo llama el cliente (`app/lib/features/cuenta/data/alta_dispositivo.dart`) pero el handler `/devices` del servidor no está identificado como implementado: A02 y B1-01.
- El diseño define el orden de entrada (splash, legal, Inicio sin consultas, Nueva consulta) y que aceptar los términos no exige crear cuenta: A02.
- Las imágenes de `app/assets/` eran punteros Git LFS sin contenido en `origin`: se publicaron los 3076 objetos el 2026-10-12 y el manifiesto de assets verifica (1167 de 1167 derivados con sha256 correcto tras `git lfs install --local` y `git lfs checkout`). Cada clon nuevo necesita `git lfs install --local` y `git lfs pull`.
- El diseño web (`docs/product/diseno-web/`) existe solo en el árbol de trabajo y no está registrado en `mkdocs.yml` completo ni commiteado: X02.
- La muestra de Cuenta dibuja "Cambiar correo" también para una cuenta con correo validado; V-24 y V-27 lo ofrecen solo con el correo pendiente: A04 sigue a V-24 y V-27 (decidido el 2026-10-12).

---

## X02. Incorporar el plan V3, las muestras y el diseño web al repo

- Tipo: improvement. Módulo: Docs. Cambio: N.
- Depende de: X01.
- Repo y rutas: `docs/product/v3/` y `docs/product/diseno-web/` en `tao-v2` (origen del primero: `taomangalam/docs/product/v3/`, sin commit y única copia), `docs/product/design-system/`, `mkdocs.yml`, `.cspell.json`.
- Entregable:
  - El plan V3 (documentos 00 a 13, `plan_v3.json`, CSV) y las muestras (imágenes, `manifest.json`, prompts, maquetas HTML, video, `fondos-muestras.css`) dentro de `tao-v2`, con los textos corregidos a las decisiones del MVP: recordatorios locales (D-07, hoy excluidos en README, 02, 03, 06, 09, `plan_v3.json` y `tickets_recursos.csv`), cambio de correo solo con el correo pendiente (D-05), presentación pública, portal de eliminación y backoffice (D-10 y D-12), conteo de tickets (64) y mapa de ids de `20-mapa-de-dependencias`; vistas nuevas registradas en el catálogo (presentación pública y portal de eliminación).
  - Commit de `docs/product/diseno-web/` (17 guías, variantes, maquetas, assets, manifiesto) con los cambios de `docs/README.md` y `mkdocs.yml`; el README corrige "65 fichas" a 64 y la guía 17 deja de figurar como pendiente (es W04).
  - Contrato visual propio de tao-v2 (`contrato-visual.json` en `docs/product/v3/muestras/` o `docs/product/design-system/`) que reemplaza al heredado: tabla vista a familia de la app, familias de fondo, y bloque `web` con la regla de `diseno-web` (backoffice neutro sin paisajes, público con ilustración). Las familias `productos` y `administracion` se marcan como no usadas en el MVP.
  - Chequeo de docs que comprueba que las rutas del contrato y del manifiesto web existen y que los sha256 del manifiesto coinciden.
- Aceptación local: `DOCS_DIFF_BASE=main pnpm docs:check` verde con Node 24 (markdownlint, cspell, Vale, lychee, validador de frontmatter, documentos huérfanos); `git lfs ls-files` lista las imágenes nuevas (el `.gitattributes` ya las cubre, así que el repo no crece con binarios dentro de git); las rutas de `13_linea_visual_y_fondos.md` y del contrato existen en el repo; el chequeo del manifiesto web pasa.
- Datos y fixtures: 34 MB de origen de V3 (25 imágenes de unos 1,6 MB, `activos-reales/` con 6,8 MB de copias de assets y fuentes, un video de 0,3 MB) más los assets de `diseno-web`; todos como objetos LFS.
- Recursos: R01, R05. Información por confirmar: si `activos-reales/` (duplica `app/assets/` y las maquetas HTML lo usan por ruta relativa) se trae completo o se enlaza al original; si `docs/product/v2/` (460 KB, supersedida) se trae o se archiva. Con LFS ya no es un problema el tamaño del repo, y la opción recomendada es traer todo dentro de `docs/product/v3/`. Verificación: docs. Extensión v1: el contrato visual se reutiliza en vistas futuras.

## A00. Capa de aplicación del motor local

- Tipo: implement. Módulo: App. Cambio: N.
- Depende de: X02.
- Repo y rutas: `app/lib/features/*/application/`, `app/lib/data/`.
- Entregable: providers de los servicios de escritura del motor, controladores de intención con claves de operación ULID idempotentes, mapeo de `ErrorDominio` a mensajes de interfaz, y convención de providers para que la UI nunca llame al motor directamente.
- Aceptación local: pruebas de proveedor con el motor real sobre base Drift en memoria; un reintento con la misma clave no duplica el efecto; un error de dominio se muestra con mensaje accionable, no con excepción cruda.
- Datos y fixtures: consulta en cada fase del ciclo (borrador, activa, cierre).
- Recursos: R01, R05. Información por confirmar: lista cerrada de servicios a exponer. Verificación: emulador y pruebas del app. Extensión v1: la capa permite agregar nuevos servicios sin tocar la UI existente.

## A02. Arranque, splash, legal, sesión y módulos por capacidad (V-31, V-51)

- Tipo: implement. Módulo: App. Cambio: C (fusiona A01 y A02 de V3).
- Depende de: A00, B1-03.
- Diseño: muestras 11 izquierda (splash) y 12 izquierda (legal); familia Entrada; guía `10_entrada_splash_y_cuenta.md`.
- Entregable:
  - Orden de entrada: primera apertura splash, aceptación legal, Inicio sin consultas, Nueva consulta; aperturas siguientes splash directo a Inicio con el estado local recuperado; una versión legal pendiente interpone la aceptación y devuelve al contexto previsto.
  - Splash sencillo: fondo marfil claro aun con sistema oscuro, logo oficial y nombre, sin botones, menú, paisaje ni frase; splash nativo con recursos locales estáticos; animación de hasta 1000 ms (trazo del círculo hasta 650 ms, disco entre 450 y 750 ms, nombre entre 520 y 850 ms) interrumpible apenas el arranque esté listo; con movimiento reducido imagen estática o aparición de hasta 120 ms; si algo tarda más de un segundo, el logo queda estable con un indicador discreto aparte.
  - Aceptación legal (V-51): versiones efectivas de Términos y Política de privacidad con acceso al texto completo (leer vuelve al mismo punto sin aceptar), Aceptar y continuar registra la aceptación explícita, Salir abandona el flujo sin desbloquear el servicio; el menú no existe en esta pantalla (la muestra lo dibujó, se oculta); la marca de "textos legales pendientes" es solo de la muestra; analítica desactivada y, si hay política opcional, con su consentimiento específico sin ser condición de acceso.
  - Primera apertura sin conexión: se usa la versión legal empaquetada y se guarda la aceptación local con versión y fecha; al reconectar se registra con la identidad de dispositivo antes de operaciones de negocio.
  - Sesión: interceptor de autenticación con renovación de token de una sola ejecución concurrente y cola legal; versión mínima y recomendada (avisos).
  - Registro de módulos por capacidad: Biblioteca, Productos y Ayuda quedan con `isBuilt: false`, nunca se borran; enlaces profundos administrativos no abren interfaz móvil.
- Aceptación local: en emulador: primera apertura conectada y sin conexión, reinicio, expiración y respuesta perdida conservan identidad y datos; el menú no permite saltar la aceptación; versión legal nueva vuelve a pedir aceptación; versión incompatible muestra acción local sin abrir tienda; texto grande y movimiento reducido.
- Datos y fixtures: primera apertura, sesión vencida, manifiesto incompatible, aceptación pendiente (USR-LEGAL), API interrumpida.
- Recursos: R02, R04, R05, R06, R08. Assets: logo de identidad, fondo de familia Entrada. Datos externos: textos legales aprobados (hoy provisionales). Información por confirmar: comportamiento del cliente ante 404 de `/devices`; el icono de instalación sigue pendiente de decisión (fuera de este ticket). Verificación: emulador.

## A05. Espacio de datos por cuenta

- Tipo: implement. Módulo: App. Cambio: N.
- Depende de: A00.
- Repo y rutas: `app/lib/data/espacio_local.dart`, `app/lib/data/drift/` (esquema v6, aditivo con fixture congelado de v5).
- Entregable: migración Drift v6 aditiva; vinculación de `cuenta_id` al `espacio_datos`; reglas de identidad que fija el diseño: registrar una cuenta conserva las consultas de la identidad local de ese dispositivo (el espacio local se adopta), y entrar con otra cuenta no mezcla datos ni promete recuperar consultas de otra instalación; política de cierre de sesión y caducidad (DEC-054) que no pierde ni mezcla consultas de otras cuentas; todas las lecturas y escrituras del motor filtran por el espacio activo.
- Aceptación local: la cuenta B no ve consultas de la cuenta A en el mismo dispositivo; registrar una cuenta desde una identidad local con consultas las conserva; cerrar sesión no borra datos de otras cuentas; la migración desde un fixture v5 conserva los datos.
- Datos y fixtures: USR-A y USR-B con consultas en el mismo dispositivo, USR-I (identidad local con consultas que se convierte en cuenta), fixture v5 congelado.
- Recursos: R08. Verificación: emulador y pruebas de migración Drift. Extensión v1: base para sincronización futura (columnas `device_origin_id`, `version`, `deleted_at` ya existen).

## A03a. Registro, verificación de correo y acceso (V-23, V-24, V-25)

- Tipo: implement. Módulo: App. Cambio: P.
- Depende de: A02, A05, B3-01.
- Diseño: muestras 12 derecha (acceso) y 13 (registro y validación); familia Cuenta; guía `10`.
- Entregable:
  - Registro: correo, contraseña y repetición con mostrar u ocultar accesible; crear cuenta y enviar código abre la validación pendiente; Ya tengo cuenta abre acceso; Ahora no vuelve al contexto local; no se eligen roles de administración o productor en la app.
  - Acceso: correo y contraseña, recuperación y creación de cuenta; una cuenta pendiente lleva a validar correo; una sesión previa solo conserva operaciones locales y un inicio de sesión nuevo necesita conexión; sin invitaciones administrativas ni recuperación de respaldos.
  - Validación: un único campo de código con pegado, correo parcialmente oculto, reenvío con espera, y corrección del correo pendiente (D-05; V-24 ofrece Cambiar correo regresando a la corrección de la cuenta); longitud, caducidad, espera y límites vienen del contrato y del servidor, no de la imagen; al validar se vuelve a Cuenta o al contexto que originó la acción.
  - Estados: campo vacío o inválido (botón no habilitado, error junto al campo sin borrar entradas), petición en curso (sin envíos duplicados), sin conexión, credenciales incorrectas (sin revelar si existe el correo), código incorrecto o vencido, espera de reenvío o intentos agotados, contraseñas distintas, texto grande y teclado visible; enlaces en tinta de marca (no azul); los códigos no aparecen en historial ni en registros.
- Aceptación local: en emulador contra API y Mailpit: registro, verificación y acceso completos; el teclado no tapa campos; USR-A y USR-B no mezclan datos; volver o Ahora no no borra una consulta existente.
- Datos y fixtures: cuenta nueva, correo ocupado, código inválido y vencido, cambio entre USR-A y USR-B, USR-I.
- Recursos: R02, R03, R05, R06, R08. Assets: logo, fondo de familia Cuenta. Verificación: emulador.

## A03b. Recuperar contraseña (V-26)

- Tipo: implement. Módulo: App. Cambio: P.
- Depende de: A03a, B1-02.
- Diseño: muestra 14; familia Cuenta.
- Entregable: solicitud con respuesta neutral para cualquier correo; paso intermedio de código que reutiliza el formulario de validación pero con propósito y desafío propios (un código de verificación de correo no sirve para recuperar); nueva contraseña; al terminar vuelve a acceso con el correo completado y mensaje de éxito, sin iniciar sesión automáticamente.
- Aceptación local: en emulador, solicitar, leer el código en Mailpit y fijar una contraseña nueva; el código usado, vencido o de verificación se rechaza; el código no queda en historial ni en logs.
- Datos y fixtures: cuenta existente, código vencido y usado, correo inexistente.
- Recursos: R02, R03, R05, R08. Verificación: emulador.

## A04. Cuenta, privacidad, salida y eliminación (V-27, V-51)

- Tipo: implement. Módulo: App. Cambio: =.
- Depende de: A03a, B3-03.
- Diseño: muestra 02 izquierda; familia Cuenta.
- Entregable: Mi cuenta con identidad, correo (validado o pendiente), recuperar contraseña, Términos y Política de privacidad (lectura), Cerrar sesión y Eliminar cuenta con confirmación. Correo (decidido el 2026-10-12, según V-24 y V-27 y D-05): con el estado "Correo pendiente de validar" se muestran Ingresar código y Reenviar código (hacia V-24) y la acción de corregir el correo (`cuenta.correo.cambiar`, que vuelve a exigir validación); con el correo ya validado no se muestra ninguna fila "Cambiar correo" (la muestra la dibuja, el servidor responde 409 para cuenta activa y HU-03b-05 es extensión). Eliminación: dentro de la app con la confirmación escrita y el código al correo que define el contrato, y un enlace al portal web de eliminación que se obtiene de la clave de configuración `accountDeletionPortalUrl` (DEC-129; la app nunca arma la URL y la ruta la sirve W04). Vista de legal y privacidad con el consentimiento de analítica; tabla de limpieza local compartida con B3-02; al salir o eliminar se cancelan los recordatorios (T06b).
- Aceptación local: en emulador, cancelar conserva, eliminar limpia lo acordado y revoca la sesión; salir o expirar no borra por error; el estado persiste tras reinicio; no se muestran respaldos ni dispositivos (la ficha histórica los menciona pero V3 los excluye); con el correo pendiente aparece la corrección y con el correo validado no aparece; el enlace del portal usa la URL de la configuración y no una constante de la app.
- Datos y fixtures: cuenta con consulta local y aceptaciones, cancelar y confirmar, token vencido, cuenta con correo pendiente y cuenta con correo validado.
- Recursos: R02, R04, R05, R06, R08. Información por confirmar: ninguna de diseño (el portal se prueba de punta a punta en Q02 una vez exista W04). Verificación: emulador.

## A06. Assets y fondos para uso sin conexión

- Tipo: implement. Módulo: App. Cambio: N.
- Depende de: A00.
- Diseño: contrato visual de `03` (familias de fondo) y guía `11`.
- Entregable: inventario de los ids de asset que usan las vistas del MVP y decisión por asset entre empaquetado y descarga con caché: fondos de las familias (Entrada, Inicio, Perfil y consultas, Recorrido, Retroceso, Cuenta, más las variantes por viewport del resolvedor; no se empaquetan los fondos web de Productos y Administración), logo y fuentes (Zen Old Mincho, Spectral, IBM Plex Mono con sus licencias), tarjeta de perfil, láminas de los 12 signos, ilustraciones de materiales (dados, campanilla, péndulo) y de preparar sesión, los seis pasos del ritual, fichas de Casa (llegada, permanencia y Ashura con el animal de cada Casa) y minerales; proveedor de URL de descarga para lo opcional con respaldo cuando falta (`downloadUrlProvider` ya no lanza `UnimplementedError`); un asset ausente no bloquea la vista. Revisión de la variante de fondo por viewport: se compara la captura de cada familia en emulador con la muestra de referencia.
- Aceptación local: en emulador sin conexión se ven el splash, la entrada, Inicio y las vistas que dependen de assets empaquetados; la ausencia de una imagen opcional no rompe la interfaz; con contraste aumentado la capa decorativa se oculta; el paisaje de cada familia se ve en los espacios libres con la variante elegida (sin doble lavado), contrastado contra la muestra; el tamaño del paquete queda medido y registrado; el manifiesto verifica sus sha256 contra archivos reales (no punteros LFS).
- Datos y fixtures: `app/assets/manifest.json` actualizado y verificado con `check_assets_ready.py`.
- Recursos: R05, R06, R08. Datos externos: licencias y estado provisional de los assets (los 170 son provisionales). Información por confirmar: qué pasa a empaquetado y cuánto crece el paquete (hoy 165 de 170 son descargables y no hay proveedor remoto en el MVP local). Verificación: emulador.
